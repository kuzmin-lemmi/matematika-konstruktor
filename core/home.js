const H = { level: 0, rnd: null, n: 0, score: 0, streak: 0, clean: 0, cats: {}, task: null, hints: 0, hintLevel: 0,
  wait: false, taskDone: false, repeat: null, finished: false, gain: 0, eqCount: null, history: [] };

function homeSetup() {
  $('hSetup').hidden = false; $('hPlay').hidden = true; $('hEnd').hidden = true;
  $('hLevels').innerHTML = SECTIONS.map((S, i) => {
    const best = +store.get('best' + i) || 0;
    return `<button type="button" class="level" data-level="${i}"><b>${S.title} →</b><span>${S.text}</span><span class="lex">${S.ex()}</span><small>Рекорд: ${best}</small></button>`;
  }).join('');
  $('home').classList.remove('playing');
  // учителю: ссылка сразу на раздел, чтобы отправить её в чат класса
  $('hLinks').innerHTML = 'Учителю — ссылка сразу на раздел: ' + SECTIONS.map((S, i) =>
    `<button type="button" class="linkbtn" data-copy="${i + 1}">раздел ${i + 1}</button>`).join(' ') + ' <span id="hCopied"></span>';
}
function levelLink(n) {
  let loc = location;
  try { if (window.top !== window && window.top.location.origin === location.origin) loc = window.top.location; } catch {}
  return `${loc.origin}${loc.pathname}?mode=home&level=${n}&student=1`;
}
async function copyLevelLink(n) {
  const url = levelLink(n);
  let ok = false;
  try { await navigator.clipboard.writeText(url); ok = true; } catch {}
  $('hCopied').innerHTML = ok ? `Скопировано: ${url}` : `Скопируйте ссылку: <b>${url}</b>`;
}
function homeStart({ level = H.level, seed } = {}) {
  Object.assign(H, { level, n: 0, score: 0, streak: 0, clean: 0, cats: {}, repeat: null, finished: false, history: [], last: null,
    rnd: mulberry32(seed ?? ((Math.random() * 4294967296) >>> 0)) });
  $('hSetup').hidden = true; $('hEnd').hidden = true; $('hPlay').hidden = false;
  $('home').classList.add('playing');
  homeNewTask();
}
function homeNewTask() {
  const types = SECTIONS[H.level].types;
  // после ошибки — задание того же типа с другими числами; иначе — другой тип, чем в прошлый раз
  let type = H.repeat;
  if (!type) { const rest = types.filter(x => x !== H.task?.type); type = pick(H.rnd, rest.length ? rest : types); }
  const prev = H.task;
  let t, guard = 0;
  do t = generate(type, H.rnd);
  while (prev && JSON.stringify(t) === JSON.stringify(prev) && ++guard < 50);
  H.task = t;
  H.n++; H.hints = 0; H.hintLevel = 0; H.wait = false; H.taskDone = false; H.repeat = null; H.eqCount = null; H.last = null;
  homeRender();
}
// Проверка. x: num/frac — {n, d}; choice — строка; eq — {roots: [...]}; est — {lo, hi}
function homeCheck(x) {
  if (H.wait || H.finished) return null;
  if (x == null || x.empty) return { ok: false, empty: true, msg: x?.msg || 'Впиши ответ.' };
  const t = H.task, T = TYPES[t.type];
  let r;
  if (T.same(t, x)) {
    H.streak++; H.clean++;
    const mult = Math.min(CONFIG.home.maxMultiplier, 1 + Math.floor((H.streak - 1) / 3));
    H.gain = Math.max(0, CONFIG.home.points[H.level] - H.hints * CONFIG.home.hintPenalty) * mult;
    H.score += H.gain;
    r = { ok: true, msg: T.ok(t) };
  } else {
    H.streak = 0; H.gain = 0;
    r = { ok: false, ...T.wrong(t, x) };
    H.cats[r.cat] = (H.cats[r.cat] || 0) + 1;
    H.repeat = t.type;
  }
  H.history.push({ n: H.n, type: t.type, ok: r.ok, cat: r.cat });
  H.wait = true; H.taskDone = true; H.last = r;
  homeRender(r);
  return r;
}
function homeContinue() {
  if (!H.wait) return;
  if (H.n >= CONFIG.home.round) return homeEnd();
  homeNewTask();
}
function homeHint() {
  if (H.wait || H.finished) return null;
  const hints = TYPES[H.task.type].hints(H.task);
  const text = hints[Math.min(H.hintLevel, hints.length - 1)];
  if (H.hintLevel < hints.length) { H.hints++; H.hintLevel++; }
  H.lastHint = text;
  homeRender({ hint: text });
  return text;
}
function homeEnd() {
  H.finished = true;
  const key = 'best' + H.level, best = +store.get(key) || 0, record = H.score > best;
  if (record) store.set(key, H.score);
  const cats = Object.entries(H.cats).sort((x, y) => y[1] - x[1]);
  $('hPlay').hidden = true; $('hEnd').hidden = false;
  $('hEnd').innerHTML = `<div class="card">
    <h2 style="margin-top:0">Итоги: ${SECTIONS[H.level].title.toLowerCase()}</h2>
    <p style="font-size:22px">Очки: <b>${H.score}</b>${record ? ' — новый рекорд!' : ` (рекорд: ${Math.max(best, H.score)})`}<br>
    Без ошибок: <b>${H.clean} из ${CONFIG.home.round}</b></p>
    <h3>Над чем поработать</h3>
    ${cats.length ? `<ul class="work">${cats.map(([c, k]) => `<li><b>${CATS[c][0]}</b> — ошибок: ${k}<br>${esc(CATS[c][1])}</li>`).join('')}</ul>`
      : `<p>Ошибок нет. ${H.level < SECTIONS.length - 1 ? 'Попробуй следующий раздел.' : 'Отличная работа!'}</p>`}
    <div class="hbtns"><button type="button" class="main" data-act="again">Ещё раз</button>
    ${H.level < SECTIONS.length - 1 && !cats.length ? `<button type="button" data-act="nextlevel">Следующий раздел</button>` : ''}
    <button type="button" data-act="setup">Выбрать раздел</button></div></div>`;
}

const inp = (k, label, cls = '', mode = 'decimal') => `<input data-k="${k}" class="${cls}" inputmode="${mode}" autocomplete="off" aria-label="${label}">`;
const checkBtn = '<button type="button" class="main check" data-act="check">Проверить</button>';
// вопрос в тренажёре: TYPES[type].ask, по умолчанию «запись = ?»
const askHTML = t => TYPES[t.type].ask ? TYPES[t.type].ask(t) : `${TYPES[t.type].text(t)} = ?`;
// Виды ввода ответа. html(t) — поля, collect(get) — ответ для T.same/T.wrong или { empty, msg }.
// Тема может добавить свой вид: const TOPIC_INPUTS = { имя: { html, collect } }.
const readInt = s => { const v = String(s).replace(/\s+/g, ''); return /^\d+$/.test(v) ? +v : null; };
const INPUTS = {
  num: {   // число: целое, десятичная или обыкновенная дробь → {n, d}
    html: t => `<div class="inrow">${TYPES[t.type].text(t)} = ${inp('v', 'ответ', 'wide')} ${checkBtn}</div>`,
    collect: get => parseQ(get('v')) || { empty: true, msg: get('v').trim() ? 'Не понял число. Пиши, например, 0,3 или 12.' : 'Впиши ответ.' },
  },
  frac: {  // дробь этажом, целая часть необязательна → {n, d}
    html: t => `<div class="inrow">${TYPES[t.type].text(t)} = ${inp('w', 'целая часть', '', 'numeric')} <span class="frac fin">${inp('n', 'числитель', '', 'numeric')}${inp('d', 'знаменатель', '', 'numeric')}</span> ${checkBtn}</div>` +
      '<p class="hnote">Целую часть можно не писать — подойдёт и неправильная дробь.</p>',
    collect: get => {
      const w = get('w').trim() ? readInt(get('w')) : 0, n = readInt(get('n')), d = readInt(get('d'));
      if (w == null || n == null || !d) return { empty: true, msg: 'Заполни числитель и знаменатель (целую часть — если есть).' };
      return Q(w * d + n, d);
    },
  },
  choice: {   // кнопки TYPES[type].options = [[значение, подпись]]; ответ — строка, проверка сразу по нажатию
    html: t => `<div class="inrow">${TYPES[t.type].options.map(([v, l]) => `<button type="button" class="choice" data-choice="${v}">${l}</button>`).join('')}</div>`,
    collect: () => null,
  },
  est: {   // два соседних целых: lo < запись < hi → {lo, hi}
    html: t => `<div class="inrow">${inp('lo', 'меньшее число', '', 'numeric')} &lt; ${TYPES[t.type].text(t)} &lt; ${inp('hi', 'большее число', '', 'numeric')} ${checkBtn}</div>`,
    collect: get => { const lo = readInt(get('lo')), hi = readInt(get('hi')); return lo == null || hi == null ? { empty: true, msg: 'Впиши оба числа.' } : { lo, hi }; },
  },
  eq: {   // корни уравнения: сначала число корней, потом сами корни (числа или √m) → {roots}
    html: () => {
      const c = H.eqCount, b = (n, l) => `<button type="button" data-count="${n}" aria-pressed="${c === n}">${l}</button>`;
      let html = `<div class="cnts">${b(0, 'Корней нет')}${b(1, 'Один корень')}${b(2, 'Два корня')}</div>`;
      const sqrtBtn = '<button type="button" class="sqrtbtn" data-act="sqrt" title="Вставить знак корня" aria-label="Вставить знак корня">√</button>';
      if (c === 0) html += `<div class="inrow">${checkBtn}</div>`;
      if (c === 1) html += `<div class="inrow"><span class="nw">${X} =</span> ${inp('r1', 'корень', 'wide', 'text')} ${sqrtBtn} ${checkBtn}</div>`;
      if (c === 2) html += `<div class="inrow"><span class="nw">${X}<sub>1</sub> =</span> ${inp('r1', 'первый корень', 'wide', 'text')} <span class="nw">${X}<sub>2</sub> =</span> ${inp('r2', 'второй корень', 'wide', 'text')} ${sqrtBtn} ${checkBtn}</div>`;
      if (c) html += '<p class="hnote">Корень можно записать числом (−0,9; 2/3) или со знаком корня: √7, −√7.</p>';
      return html;
    },
    collect: get => {
      if (H.eqCount == null) return { empty: true, msg: 'Сначала выбери, сколько корней у уравнения.' };
      const roots = [];
      for (let i = 1; i <= H.eqCount; i++) {
        const s = get('r' + i), v = parseVal(s);
        if (!v) return { empty: true, msg: s.trim() ? `Не понял корень «${esc(s)}». Пиши число (−0,9; 2/3) или корень (√7, −√7).` : 'Впиши корни.' };
        roots.push(v);
      }
      return { roots };
    },
  },
};
const inputKind = t => (typeof TOPIC_INPUTS !== 'undefined' && TOPIC_INPUTS[TYPES[t.type].input]) || INPUTS[TYPES[t.type].input];
const inputHTML = t => inputKind(t).html(t);
function homeRender(fb) {
  const t = H.task, T = TYPES[t.type];
  const mult = Math.min(CONFIG.home.maxMultiplier, 1 + Math.floor(H.streak / 3));
  $('hStats').innerHTML = `<span>Задание <b>${H.n}</b> из ${CONFIG.home.round}</span><span>Очки: <b>${H.score}</b></span>` +
    `<span>Серия: <b>${H.streak}</b>${mult > 1 ? ` (×${mult})` : ''}</span><span>${SECTIONS[H.level].title}</span>`;
  $('hTask').innerHTML = askHTML(t);
  $('hPen').textContent = CONFIG.home.hintPenalty;
  $('hStep').innerHTML = H.wait ? '' : inputHTML(t);
  let html = '';
  if (fb && fb.hint) html = `<div class="fb info"><span class="tag">Подсказка</span>${fb.hint}</div>`;
  else if (fb && fb.empty) html = `<div class="fb info">${fb.msg}</div>`;
  else if (fb) html = `<div class="fb ${fb.ok ? 'ok' : 'bad'}"><span class="tag">${fb.ok ? `Верно! +${H.gain}` : 'Ошибка'}</span>${fb.msg}</div>`;
  if (H.taskDone && !fb?.ok) html += `<div class="fb info"><span class="tag">Ответ</span>${answerHTML(t)}. Дальше — такое же задание с другими числами.</div>`;
  $('hFb').innerHTML = html;
  $('hHint').hidden = H.wait; $('hNext').hidden = !H.wait;
  $('hNext').textContent = H.n >= CONFIG.home.round ? 'Итоги →' : 'Следующее задание →';
  if (!PREVIEW) {
    const first = $('hStep').querySelector('input');
    if (first) first.focus(); else if (H.wait) $('hNext').focus();
  }
}
// верный ответ после ошибки: TYPES[type].answer, по умолчанию «запись = ответ»
const answerHTML = t => TYPES[t.type].answer ? TYPES[t.type].answer(t) : `${TYPES[t.type].text(t)} = ${TYPES[t.type].keyHTML(t)}`;
function homeCollect() {
  const get = k => $('hStep').querySelector(`[data-k="${k}"]`)?.value ?? '';
  return inputKind(H.task).collect(get);
}
function homeCheckClick(x = homeCollect()) { const r = homeCheck(x); if (r && r.empty) homeRender(r); }

