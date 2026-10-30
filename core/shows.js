// ================= Виды показа на доске: разминка, диктант, «верно — неверно», «найди ошибку» =================
// Основной показ темы (buildSteps) — вид 'main'. Остальные собираются из TYPES: тема ничего не пишет, только
// подсказывает типам флаги и методы:
//   T.oral = true                  тип годится для устного счёта (разминка);
//   T.statement(t, html)           утверждение «задание = ответ» для «верно — неверно» (по умолчанию для num, frac —
//                                  «запись = ответ»; у задания с чертежом или условием словами — задание целиком и «Ответ: …»);
//   T.mistake(t, rnd)              { lines, at, fix, why } — решение с одной ошибкой (core/formats.js, «найди ошибку»).
// Шаги — те же {q, a, note, draw, rec}, что и в основном показе, поэтому доска, клавиши и «Другие числа» работают как обычно.
// Зерно показа — число (B.e.seed): «Другие числа» берёт новое, первый показ — зерно 1 (повторяемо).

const showOk = T => typeof T.traps === 'function' && typeof T.keyHTML === 'function';
const showOral = () => Object.keys(TYPES).filter(k => TYPES[k].oral);
const showTf = () => Object.keys(TYPES).filter(k => showOk(TYPES[k]) && (TYPES[k].statement || ['num', 'frac'].includes(TYPES[k].input)));
const showTypesOf = list => [...new Set(list.map(([ty]) => ty))];
// «AB = 5» без чертежа ничего не значит: задание с чертежом или словами показываем целиком
function tfDefault(t, html) {
  const q = askHTML(t), plain = String(TYPES[t.type].text(t)).replace(/<[^>]+>/g, '');
  return /<svg/.test(q) || /[а-яё]{4,}/i.test(plain) ? `${q}<p class="tf">Ответ: ${html}</p>` : `${TYPES[t.type].text(t)} = ${html}`;
}
const showStep = (q, a, note, rec = () => []) => ({ q, a, note, draw: () => '', rec });

const SHOWS = {
  warmup: {
    label: 'Разминка', timer: () => CONFIG.board.warmupSeconds || 20,
    about: 'Устный счёт: задание крупно, ответ — по кнопке. Ответы копятся в записи — для самопроверки.',
    available: () => showOral().length > 0,
    steps(seed) {
      const rnd = mulberry32(seed), types = showOral(), n = CONFIG.board.warmupCount || 8, done = [];
      return Array.from({ length: n }, (_, i) => {
        const type = types[i % types.length];
        let t, guard = 0;
        do t = generate(type, rnd); while (done.some(u => JSON.stringify(u) === JSON.stringify(t)) && ++guard < 50);
        done.push(t);
        const line = `${i + 1}) ${TYPES[type].keyHTML(t)}`;
        return showStep(`<b>${i + 1}.</b> ${askHTML(t)}`, answerHTML(t),
          'Разминка: ученики считают в уме и пишут только ответ. Таймер — по кнопке «⏱» вверху; листать и показывать ответ — когда вы решите.',
          ph => [...done.slice(0, i).map((u, j) => `${j + 1}) ${TYPES[u.type].keyHTML(u)}`), ...(ph ? [line] : [])]);
      });
    },
  },
  dictation: {
    label: 'Диктант', timer: () => CONFIG.board.dictationSeconds || 40,
    about: 'Математический диктант: задания по одному, ученики пишут ответ в тетрадь. Все ответы — на последнем шаге.',
    available: () => KINDS_V1.length > 0,
    steps(seed) {
      const rnd = mulberry32(seed), n = CONFIG.board.dictationCount || 6, types = showTypesOf(KINDS_V1);
      const tasks = Array.from({ length: n }, (_, i) => generate(types[i % types.length], rnd));
      const list = tasks.map((t, i) => `<li>${answerHTML(t)}</li>`).join('');
      return [...tasks.map((t, i) => showStep(`<b>Задание ${i + 1} из ${n}.</b> ${askHTML(t)}`, 'Записали ответ — переходим к следующему.',
        'Не показывайте ответы по ходу: пусть ученики пишут в тетрадь, а проверяют в конце. Таймер — по кнопке «⏱» вверху.')),
        showStep('Проверь себя: все ответы', `<ol class="dict-ans">${list}</ol>`, 'Ученики сверяют ответы и отмечают ошибки. Тема ошибок — в «Над чем поработать» тренажёра.',
          () => tasks.map((t, i) => `${i + 1}) ${TYPES[t.type].keyHTML(t)}`))];
    },
  },
  truefalse: {
    label: 'Верно — неверно',
    about: 'Утверждение на экране; класс поднимает карточку: верно или неверно. Объяснение — по кнопке.',
    available: () => showTf().length > 0,
    steps(seed) {
      const rnd = mulberry32(seed), types = showTf(), n = CONFIG.board.truefalseCount || 8, marks = [];
      return Array.from({ length: n }, (_, i) => {
        const type = types[i % types.length], T = TYPES[type], t = generate(type, rnd);
        const traps = T.traps(t), isTrue = !traps.length || rnd() < .5;
        const html = isTrue ? T.keyHTML(t) : pick(rnd, traps).html;
        const text = T.statement ? T.statement(t, html) : tfDefault(t, html);
        marks.push(isTrue);
        return showStep(`<b>${i + 1}.</b> Верно ли: ${text}`,
          isTrue ? `<b>Верно.</b> ${T.ok(t)}` : `<b>Неверно.</b> Правильно: ${answerHTML(t)}.`,
          'Класс поднимает сигнальные карточки (бумага: зелёная — верно, красная — неверно). Сначала голосуют, потом «Показать ответ».',
          ph => marks.slice(0, i + (ph ? 1 : 0)).map((v, j) => `${j + 1}) ${v ? 'верно' : 'неверно'}`));
      });
    },
  },
  errors: {
    label: 'Найди ошибку',
    about: 'Готовое решение с одной ошибкой: класс ищет строку. Ответ и верная строка — по кнопке.',
    available: () => mistakeTypes().length > 0,
    steps(seed) {
      const rnd = mulberry32(seed), n = CONFIG.board.errorsCount || 5, cases = [], types = mistakeTypes();
      for (let i = 0; i < n; i++) {
        const type = types[i % types.length], t = generate(type, rnd);
        cases.push({ t, m: TYPES[type].mistake(t, rnd) });
      }
      return cases.map(({ t, m }, i) => ({
        q: (_m, ph) => `<b>${i + 1}.</b> ${askHTML(t)}<ol class="elines">${m.lines.map((l, k) => `<li${ph && k === m.at ? ' class="wrong"' : ''}>${l}</li>`).join('')}</ol>`,
        a: `Строка ${m.at + 1}. ${m.why} Верно: ${m.fix}`,
        note: 'Пусть класс сначала найдёт строку, потом объяснит, в чём ошибка. Ответ — по кнопке.',
        draw: () => '',
        rec: ph => ph ? [`Строка ${m.at + 1}: ${m.fix}`] : [],
      }));
    },
  },
};
const showsAvailable = () => Object.entries(SHOWS).filter(([, s]) => s.available());

// переключение вида показа: 'main' — основной показ темы
function boardUseShow(name) {
  B.show = name === 'main' || SHOWS[name]?.available() ? name : 'main';
  boardNumbers(false);
  const sel = $('bShow'); if (sel) sel.value = B.show;
}
// меню видов показа: кнопки на стартовом экране и список в панели доски
function initBoardShows() {
  const list = showsAvailable();
  if (!list.length) return;
  const sel = document.createElement('select');
  sel.id = 'bShow'; sel.setAttribute('aria-label', 'Вид показа');
  sel.innerHTML = '<option value="main">Показ</option>' + list.map(([k, s]) => `<option value="${k}">${esc(s.label)}</option>`).join('');
  $('bNotesBtn').before(sel);
  sel.addEventListener('change', () => { boardUseShow(sel.value); renderBoard(); });
  const start = document.querySelector('#start [data-go="board"]');
  if (start) {
    const box = document.createElement('div'); box.className = 'mode split';
    box.innerHTML = `<b>🖥 На доске</b><span>${esc(META.modeBoard)}</span><div class="kinds"><button type="button" data-go="board" data-show="main">Показ темы<small>шаги «вопрос → ответ»</small></button>` +
      list.map(([k, s]) => `<button type="button" data-go="board" data-show="${k}">${esc(s.label)}<small>${esc(s.about.split(':')[0])}</small></button>`).join('') + '</div>';
    start.replaceWith(box);
  }
}

// ---------- таймер задания (разминка, диктант) ----------
const TM = { t: 0, left: 0, key: '' };
function boardTimerStop() { clearInterval(TM.t); TM.t = 0; }
function boardTimerSync() {
  const btn = $('bTimer'), sec = SHOWS[B.show]?.timer?.();
  if (!btn) return;
  btn.hidden = !sec;
  if (!sec) { boardTimerStop(); return; }
  const key = B.show + ':' + B.i;
  if (TM.key !== key) { boardTimerStop(); TM.key = key; TM.left = sec; }
  btn.textContent = TM.left ? `⏱ ${TM.left} с` : '⏱ время!';
  btn.setAttribute('aria-pressed', String(!!TM.t));
}
function boardTimer() {
  if (TM.t) return boardTimerStop(), boardTimerSync();
  const sec = SHOWS[B.show]?.timer?.();
  if (!sec) return;
  if (!TM.left) TM.left = sec;
  TM.t = setInterval(() => { TM.left--; if (TM.left <= 0) { TM.left = 0; boardTimerStop(); } boardTimerSync(); }, 1000);
  boardTimerSync();
}
