// Тема «Многочлены» (7 класс, Макарычев, уроки 27–28). Только содержание — каркас даёт ядро (core/).
// Понятийная тема: стандартный вид, степень, члены и свободный член, проверка утверждений.
// Подмножество форматов (так и задумано, не всё подряд): печать — слово, билет, самостоятельная
// (CONFIG.print.formats); показы — разминка, диктант, «верно — неверно» (флаги oral и statement,
// «найди ошибку» нет — нет T.mistake).

// ================= Параметры: учитель может поменять их за минуту =================
const CONFIG = {
  board: {
    previewDelay: 1700,   // превью на сайте: пауза между шагами, мс
  },
  print: {
    variants: 25,         // сколько вариантов печатать по умолчанию
    traps: 2,             // сколько ответов-ловушек на задание в таблице букв
    space: true,          // сетка для решения под каждым заданием
    formats: ['word', 'exit', 'test'],   // только подходящие теме виды листа (остальные ядро всё равно умеет)
    defaultKind: 'word',
  },
  home: {
    round: 10,            // заданий в тренировке
    points: [10, 10, 15], // очки за задание по разделам (столько чисел, сколько разделов)
    hintPenalty: 3,       // штраф за подсказку
    maxMultiplier: 3,     // множитель за серию: +1 за каждые 3 задания подряд без ошибок
  },
};
// Версия генератора — первая часть номера варианта «1-4817». Изменил генератор или состав
// заданий раздатки — увеличь версию и оставь старую ветку, пока на неё есть напечатанные листы.
const GEN_VERSION = 1;

// ================= Запись =================
const VI = v => `<i>${v}</i>`;                    // переменная курсивом
const PW = s => `<sup>${s}</sup>`;               // степень верхним регистром
const sgn = s => (s > 0 ? '+' : MINUS);
const tm = z => (z.k === 1 && z.m > 0 ? '' : z.k === -1 && z.m > 0 ? MINUS : String(z.k)) +
  (z.m > 0 ? X : '') + (z.m > 1 ? PW(z.m) : '');
const tm0 = z => z.m === 0 ? String(Math.abs(z.k)) : tm({ k: Math.abs(z.k), v: 'x', m: z.m });
const tpoly = xs => xs.map((x, i) => {
  const s = tm0(x);
  return i ? (x.k < 0 ? ` ${MINUS} ` : ' + ') + s : (x.k < 0 ? MINUS : '') + s;
}).join('');
const tkey = z => `${z.k}x${z.m}`;

// ================= Типы заданий =================
// pick — выбор из кнопок (opts), num — число, choice — «да/нет». Ключи pick зависят от задания.
const bad = (cat, msg) => ({ cat, msg });

const TYPES = {
  std: {   // какой многочлен в стандартном виде
    input: 'pick', title: 'Стандартный вид',
    statement: (t, html) => `В стандартном виде записан многочлен ${html}`,
    gen: rnd => {
      const degs = shuffle(rnd, [0, 1, 2, 3]).slice(0, 3);
      const terms = degs.map(m => ({ k: int(rnd, 1, 9) * (rnd() < 0.3 ? -1 : 1), v: 'x', m }));
      return { terms, o: int(rnd, 1, 1000000) };
    },
    ordered: t => [...t.terms].sort((u, v) => v.m - u.m),
    right: t => tpoly(TYPES.std.ordered(t)),
    ask(t) {
      const opts = [TYPES.std.right(t), ...TYPES.std.wrongs(t).map(w => w.html)];
      return `Какой многочлен записан в стандартном виде?<br>` + opts.map((h, i) => `${'АБВ'[i]}) ${h}`).join('<br>');
    },
    sheet(t) {
      const opts = [TYPES.std.right(t), ...TYPES.std.wrongs(t).map(w => w.html)];
      return `Какой многочлен записан в стандартном виде?<br>` + opts.map((h, i) => `${'АБВ'[i]}) ${h}`).join('<br>');
    },
    answer: t => `В стандартном виде: ${TYPES.std.right(t)}`,
    wrongs(t) {
      const ok = TYPES.std.ordered(t);
      const rot = [...ok.slice(1), ok[0]];   // те же члены, но не по порядку
      const t0 = ok[0], half = Math.floor(t0.k / 2);
      const split = [{ k: half || 1, v: 'x', m: t0.m }, { k: t0.k - (half || 1), v: 'x', m: t0.m }, ...ok.slice(1)];   // подобные не приведены
      return [
        { key: 'std:t1', html: tpoly(rot), cat: 'order',
          why: `Члены идут не по убыванию степеней: стандартный вид — сначала старшая степень. Правильно: ${TYPES.std.right(t)}.` },
        { key: 'std:t2', html: tpoly(split), cat: 'std',
          why: `Здесь подобные не приведены: ${tm(t0)} разбито на два слагаемых. Сначала приведи подобные: ${TYPES.std.right(t)}.` }];
    },
    opts: t => [{ key: 'std:ok', html: TYPES.std.right(t) }, ...TYPES.std.wrongs(t).map(({ key, html }) => ({ key, html }))],
    text: t => TYPES.std.right(t),
    ans: () => 'std:ok',
    same: (t, v) => v === 'std:ok',
    ok: t => `Подобных нет, члены идут по убыванию степеней: ${TYPES.std.right(t)} — стандартный вид.`,
    wrong(t, v) {
      const T = TYPES.std, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'std', `${w ? w.why : 'Сравни с правилом.'} ${T.ok(t)}`);
    },
    key: t => `std:${t.terms.map(tkey).join('.')}`,
    keyHTML: t => TYPES.std.right(t),
    traps: t => TYPES.std.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints: () => [`Стандартный вид: подобные приведены, члены — по убыванию степеней.`, `Проверь оба условия по очереди.`],
    correct: () => 'std:ok',
    wrongInput: t => TYPES.std.wrongs(t)[0].key,
  },
  degree: {   // степень многочлена
    input: 'num', title: 'Степень многочлена', oral: true,
    statement: (t, html) => `Степень многочлена ${TYPES.degree.text(t)} равна ${html}`,
    gen: rnd => {
      const degs = shuffle(rnd, [0, 1, 2, 3, 4]).slice(0, int(rnd, 2, 3));
      return { terms: degs.map(m => ({ k: int(rnd, 1, 9) * (rnd() < 0.3 ? -1 : 1), v: 'x', m })) };
    },
    deg: t => Math.max(...t.terms.map(z => z.m)),
    text: t => tpoly([...t.terms].sort((u, v) => v.m - u.m)),
    ask: t => `Найдите степень многочлена:<br>${TYPES.degree.text(t)}`,
    sheet: t => `Найдите степень многочлена: ${TYPES.degree.text(t)}`,
    answer: t => `степень — ${TYPES.degree.deg(t)}`,
    ans: t => Q(TYPES.degree.deg(t)),
    key: t => `deg:${TYPES.degree.deg(t)}`,
    ok: t => `Степень многочлена — наибольшая из степеней его членов: ${t.terms.map(z => z.m).join(', ')} — наибольшая ${TYPES.degree.deg(t)}.`,
    wrong(t, v) {
      const E = TYPES.degree, d = E.deg(t), ok = E.ok(t);
      const sum = t.terms.reduce((s, z) => s + z.m, 0);
      if (qeq(v, Q(sum))) return bad('degsum', `Степени не складываются: степень многочлена — НАИБОЛЬШАЯ из степеней членов, а не их сумма. ${ok}`);
      const rest = t.terms.map(z => z.m).filter(m => m !== d);
      if (rest.length && qeq(v, Q(Math.max(...rest)))) return bad('degree', `Ты взял не наибольшую степень. Сравни все: ${t.terms.map(z => z.m).join(', ')}. ${ok}`);
      return bad('calc', `Найди степени всех членов и выбери наибольшую. ${ok}`);
    },
    traps(t) {
      const d = TYPES.degree.deg(t);
      const sum = t.terms.reduce((s, z) => s + z.m, 0);
      return [d - 1, sum].filter(n => n >= 0 && n !== d).map(n => ({ key: keyQ(Q(n)), html: htmlQ(Q(n)) })).slice(0, CONFIG.print.traps);
    },
    hints: () => [`Степень многочлена — наибольшая из степеней его членов.`, `Степени не складываются.`],
  },
  free: {   // свободный член
    input: 'num', title: 'Свободный член', oral: true,
    statement: (t, html) => `Свободный член многочлена ${TYPES.free.text(t)} равен ${html}`,
    gen: rnd => {
      const c = int(rnd, 1, 9) * (rnd() < 0.5 ? -1 : 1);
      return { terms: [{ k: int(rnd, 1, 9), v: 'x', m: int(rnd, 1, 3) }, { k: c, v: '', m: 0 }] };
    },
    text: t => tpoly(t.terms),
    ask: t => `Назовите свободный член многочлена:<br>${TYPES.free.text(t)}`,
    sheet: t => `Назовите свободный член многочлена: ${TYPES.free.text(t)}`,
    answer: t => `свободный член — ${t.terms[1].k}`,
    ans: t => Q(t.terms[1].k),
    key: t => `free:${t.terms[1].k}`,
    ok: t => `Свободный член — член без буквы: ${t.terms[1].k}.`,
    wrong(t, v) {
      const ok = TYPES.free.ok(t);
      if (qeq(v, Q(t.terms[0].k))) return bad('free', `Ты назвал коэффициент при ${X}, а свободный член — без буквы: ${t.terms[1].k}. ${ok}`);
      if (qeq(v, Q(-t.terms[1].k))) return bad('sign', `Знак терять нельзя: свободный член равен ${t.terms[1].k}. ${ok}`);
      return bad('calc', `Найди слагаемое без буквы. ${ok}`);
    },
    traps(t) {
      return [t.terms[0].k, -t.terms[1].k].filter(n => n !== t.terms[1].k).map(n => ({ key: keyQ(Q(n)), html: htmlQ(Q(n)) })).slice(0, CONFIG.print.traps);
    },
    hints: () => [`Свободный член — слагаемое без буквы.`, `Не теряй знак.`],
  },
  terms: {   // сколько членов
    input: 'pick', title: 'Члены многочлена',
    statement: (t, html) => `В многочлене ${TYPES.terms.text(t)} — ${html}`,
    gen: rnd => {
      const n = int(rnd, 2, 4);
      const degs = shuffle(rnd, [0, 1, 2, 3, 4]).slice(0, n);
      return { terms: degs.map(m => ({ k: int(rnd, 1, 9) * (rnd() < 0.3 ? -1 : 1), v: 'x', m })), o: int(rnd, 1, 1000000) };
    },
    text: t => tpoly([...t.terms].sort((u, v) => v.m - u.m)),
    ask: t => `Сколько членов в многочлене:<br>${TYPES.terms.text(t)}?`,
    sheet: t => `Сколько членов в многочлене: ${TYPES.terms.text(t)}?`,
    answer: t => `${t.terms.length} члена`,
    wrongs(t) {
      const n = t.terms.length;
      return [
        { key: 'terms:t1', html: String(n - 1), cat: 'terms', why: `Посчитай ещё раз: слагаемые разделяются знаками «+» и «${MINUS}». Их ${n}.` },
        { key: 'terms:t2', html: String(n + 1), cat: 'terms', why: `Лишний насчитал: разбей запись по знакам «+» и «${MINUS}» — получится ${n}.` }];
    },
    opts: t => [{ key: 'terms:ok', html: String(t.terms.length) }, ...TYPES.terms.wrongs(t).map(({ key, html }) => ({ key, html }))],
    ans: () => 'terms:ok',
    same: (t, v) => v === 'terms:ok',
    ok: t => `Члены разделяются знаками «+» и «${MINUS}»: ${TYPES.terms.text(t)} — их ${t.terms.length}.`,
    wrong(t, v) {
      const T = TYPES.terms, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'terms', `${w ? w.why : 'Сравни с правилом.'} ${T.ok(t)}`);
    },
    key: t => `terms:${t.terms.length}-${t.terms.map(tkey).join('.')}`,
    keyHTML: t => String(t.terms.length),
    traps: t => TYPES.terms.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints: () => [`Члены разделяются знаками «+» и «−».`, `Посчитай слагаемые по очереди.`],
    correct: () => 'terms:ok',
    wrongInput: t => TYPES.terms.wrongs(t)[0].key,
  },
  check: {   // верно ли утверждение
    input: 'choice', title: 'Верно ли утверждение', options: [['да', 'Да'], ['нет', 'Нет']], oral: true,
    statement: (t, html) => `${TYPES.check.text(t)} — ${html}`,
    gen: rnd => ({ a: int(rnd, 2, 9), b: int(rnd, 2, 9), v: pick(rnd, ['mono', 'like', 'zero', 'power']) }),
    bad: t => (t.v === 'like' || t.v === 'power') && t.a === t.b,
    pair(t) {
      if (t.v === 'like') return { q: `${t.a}${X} и ${t.b}${X}${PW(2)} — подобные`, good: false,
        why: `степени разные: ${X} и ${X}${PW(2)} — неподобные` };
      if (t.v === 'zero') return { q: `Число ${t.a} — многочлен нулевой степени`, good: true, why: '' };
      if (t.v === 'power') return { q: `${t.a}${X}${PW(2)} + ${t.b}${X}${PW(2)} = ${t.a + t.b}${X}${PW(4)}`, good: false,
        why: `степень не меняется: ${t.a}${X}${PW(2)} + ${t.b}${X}${PW(2)} = ${t.a + t.b}${X}${PW(2)}` };
      return { q: `Одночлен ${t.a}${X} — это многочлен`, good: true, why: '' };
    },
    text: t => TYPES.check.pair(t).q,
    ask: t => `Верно ли утверждение?<br>${TYPES.check.text(t)}`,
    sheet: t => `Верно ли утверждение: ${TYPES.check.text(t)}?`,
    answer(t) { const p = TYPES.check.pair(t); return `${p.q} — ${p.good ? 'верно' : 'неверно'}`; },
    ans: t => TYPES.check.pair(t).good ? 'да' : 'нет',
    ok(t) { const p = TYPES.check.pair(t); return p.good ? `Да, верно.` : `Нет: ${p.why}.`; },
    wrong(t) {
      const p = TYPES.check.pair(t);
      if (p.good) return bad('trust', t.v === 'mono'
        ? `Не торопись отвечать «нет»: одночлен ${t.a}${X} состоит из 1 члена, а многочлен — это сумма из 1 и более одночленов.`
        : `Не торопись отвечать «нет»: число ${t.a} — это ${t.a}${X}${PW(0)}, многочлен нулевой степени.`);
      return bad('trust', `Не верь записи на слово: ${p.why}.`);
    },
    key: t => TYPES.check.ans(t),
    keyHTML: t => esc(TYPES.check.ans(t)),
    traps(t) { const o = TYPES.check.ans(t) === 'да' ? 'нет' : 'да'; return [{ key: o, html: esc(o) }]; },
    hints: () => [`Вспомни определения: многочлен, подобные, степень.`, `Проверь каждое слово утверждения.`],
  },
};

// ================= Ошибки: блок «Над чем поработать» =================
const CATS = {
  std: ['Стандартный вид', 'Подобные приведены, члены идут по убыванию степеней. Проверяй оба условия.'],
  order: ['Порядок членов', 'В стандартном виде сначала старшая степень.'],
  degree: ['Степень многочлена', 'Это наибольшая из степеней его членов.'],
  degsum: ['Степени не складываются', 'Степень многочлена — наибольшая, а не сумма. Складываются только коэффициенты подобных.'],
  free: ['Свободный член', 'Слагаемое без буквы. Не путай с коэффициентом при x и не теряй знак.'],
  terms: ['Члены многочлена', 'Считай слагаемые между знаками «+» и «−».'],
  sign: ['Знаки', 'Не теряй минус свободного члена.'],
  trust: ['Проверяй утверждение', 'Каждое слово сверяй с определением.'],
  calc: ['Вычисления', 'Проверь арифметику.'],
};

// ================= Разделы тренажёра =================
const SECTIONS = [
  { title: 'Раздел 1', text: 'Что такое многочлен', types: ['std', 'terms'], ex: () => `2${X}${PW(3)} ${MINUS} ${X} + 5` },
  { title: 'Раздел 2', text: 'Степень и свободный член', types: ['degree', 'free'], ex: () => `степень: 2${X}${PW(3)} + 5` },
  { title: 'Раздел 3', text: 'Верно ли', types: ['check'], ex: () => `${X} и ${X}${PW(2)} — подобные?` },
];

// ================= Раздатка =================
// Состав варианта: пять заданий, верные ответы складываются в слово из 5 разных букв.
// Печатаем только подходящие теме виды (остальные ядро всё равно умеет — они доступны старым номерам и тестам).
const KINDS_V1 = [['std'], ['degree'], ['free'], ['terms'], ['check']];
// Слова для самопроверки: столько букв, сколько заданий, буквы не повторяются
const WORDS_V1 = ['ЧЛЕНЫ', 'ЗНАКИ', 'ФОРМА'];

// Билет на выход и самостоятельная (форматы ядра): состав можно менять, пока на них нет напечатанных листов
const EXIT_V1 = [['std'], ['degree'], ['free']];
const TEST_V1 = {
  parts: [['std'], ['degree'], ['free'], ['terms'], ['check']],
  points: [1, 1, 1, 1, 1],
  grades: { 5: 5, 4: 4, 3: 3 },
};

const PRINT = {
  instr: 'Выбери верный ответ и найди его букву в таблице. Впиши буквы в клеточки под номерами заданий — получится слово. '
    + 'Если слово не сложилось, поищи ошибку.',
  about: 'В каждом варианте пять заданий: стандартный вид, степень, свободный член, число членов и проверка утверждений. '
    + 'Пять верных ответов складываются в слово.',
  ogeAbout: '',
  testInstr: 'Ответы — короткие: номер, слово «да»/«нет» или выбор. Шкала оценок — внизу ключа.',
};

// ================= На доске =================
// Опорный конспект: многочлен, стандартный вид, степень. Живая сортировка членов по степеням.
function boardExample(random, old) {
  if (!random) return { d: [2, 0, 3, 1] };
  const rnd = mulberry32(((Math.random() * 4294967296) >>> 0));
  let d, guard = 0;
  do d = shuffle(rnd, [0, 1, 2, 3]); while (++guard < 50 && d.join() === old.d.join());
  return { d };
}
// Подписи на чертеже — SVG-текст: курсив через tspan, степень — «² ³ ⁴» (теги <i> и <sup> в SVG не работают)
const si = v => `<tspan font-style="italic">${v}</tspan>`;
const SUPD = ['', '', '²', '³', '⁴'];
const chipLabel = d => d === 0 ? '7' : `${d + 2}${si('x')}${SUPD[d] || `<tspan dy="-14" font-size="20">${d}</tspan>`}`;
const BX = 90, BY = 110;
const blines = (lines, y0 = 80) => lines.map((l, i) =>
  `<g class="${l.cls || ''}">${tx(560, y0 + i * 54, l.t, 'lab s' + (l.lc ? ' ' + l.lc : ''), 'start')}</g>`).join('');
// Живая модель: фишки-члены (степень d), порядок — перетаскиванием
const LIVE = {
  model: e => ({ chips: e.d.map((d, i) => ({ x: 150 + i * 190, y: 150, d })) }),
  fix(m) {
    if (!Array.isArray(m.chips)) return;   // в видах показа модели нет — только текст шагов
    for (const c of m.chips) {
      c.x = Math.max(60, Math.min(920, Math.round(c.x)));
      c.y = Math.max(60, Math.min(340, Math.round(c.y)));
    }
  },
  ok: m => !Array.isArray(m.chips) || m.chips.every(c => Number.isFinite(c.x) && Number.isFinite(c.y)),
};
function chipsScene(m, show) {
  if (!Array.isArray(m.chips)) return '';   // в видах показа модели нет — только текст шагов
  let s = '';
  for (let i = 0; i < 4; i++) {
    const x = 150 + i * 190;
    s += `<circle class="gn" cx="${x}" cy="150" r="44"/>` + tx(x, 210, `место ${i + 1}`, 'lab s soft', 'middle');
  }
  m.chips.forEach(c => {
    s += `<circle class="gf" cx="${c.x}" cy="${c.y}" r="40"/>` + tx(c.x, c.y + 11, chipLabel(c.d), 'lab s', 'middle');
  });
  if (show) s += tx(490, 300, `по убыванию: ${[...m.chips].sort((u, v) => v.d - u.d).map(c => chipLabel(c.d)).join(', ')}`, 'lab s acc', 'middle');
  return s;
}
function buildSteps(e) {
  return [
    { q: `Что такое многочлен? Вот пример: 2${si('x')}³ ${MINUS} ${si('x')} + 5. Из чего он состоит?`,
      a: `Из трёх одночленов-слагаемых: 2${si('x')}³, ${si('x')} и 5. Многочлен — это сумма одночленов, слагаемые называются членами.`,
      note: 'Начало урока: пусть класс сам выделит слагаемые. Подчеркните каждое.',
      draw: () => '',
      rec: ph => ph ? [`многочлен — сумма одночленов (члены)`] : [] },
    { q: 'Расставь фишки по убыванию степеней: слева — старшая. Тяни мышью, пальцем или стрелками.',
      a: 'По убыванию: сначала x³, потом x², x и число. В стандартном виде члены так и идут.',
      note: '«Показать ответ» расставит сам; «Сбросить» вернёт. Спросите: где должна стоять фишка «7»?',
      live: {
        enter() {},
        reveal(m) { liveTo({ chips: [...m.chips].sort((u, v) => v.d - u.d).map((c, i) => ({ ...c, x: 150 + i * 190, y: 150 })) }, 1200); },
        handles: m => (Array.isArray(m.chips) ? m.chips : []).map((c, i) => ({ id: 'c' + i, at: { x: c.x, y: c.y }, label: 'Член ' + (i + 1),
          move(mm, p) { mm.chips[i].x = p.x; mm.chips[i].y = p.y; },
          key(mm, dx, dy) { mm.chips[i].x += dx; mm.chips[i].y += dy; } })),
      },
      draw: (ph, m) => chipsScene(m, ph),
      rec: (ph, m) => ph ? [`стандартный вид: члены по убыванию степеней`] : [] },
    { q: 'Когда многочлен записан в стандартном виде? Два условия.',
      a: `Первое: подобные приведены. Второе: члены идут по убыванию степеней: 2${si('x')}³ + 4${si('x')}² ${MINUS} ${si('x')} + 7.`,
      note: 'Запишите оба условия в тетрадь. Проверяйте их по очереди в каждом задании.',
      draw: () => '',
      rec: () => ['стандартный вид: 1) подобные приведены; 2) степени убывают'] },
    { q: `Какая степень у многочлена 2${si('x')}³ ${MINUS} ${si('x')} + 5?`,
      a: `Третья: степени членов 3, 1 и 0 — наибольшая 3.`,
      note: 'Степень числа — нулевая: 5 = 5x⁰. Это часто забывают.',
      draw: () => '',
      rec: ph => ph ? [`степень — наибольшая из степеней членов`] : [] },
    { q: `Ловушка: степень ${si('x')}³ + ${si('x')}² — это 3 + 2 = 5?`,
      a: `Нет! Степени не складываются: члены со степенями 3 и 2, наибольшая — 3.`,
      note: 'Шаг-ловушка: складываются только коэффициенты подобных, а степени — никогда.',
      draw: ph => blines(ph
        ? [{ t: `${si('x')}³ + ${si('x')}² — степень 3, а не 5`, cls: 'new', lc: 'acc' }]
        : [{ t: `${si('x')}³ + ${si('x')}² = ?`, lc: 'warm' }]),
      rec: ph => ph ? [`степени не складываются`] : [] },
    { q: `Что такое свободный член? Найди его: 2${si('x')}³ ${MINUS} ${si('x')} + 5.`,
      a: `5 — слагаемое без буквы. Знак не теряем.`,
      note: 'Типичная ошибка: называют коэффициент при x.',
      draw: () => '',
      rec: ph => ph ? [`свободный член — без буквы`] : [] },
    { q: `А если условие нарушить: ${si('x')}² + ${si('x')}² — это уже стандартный вид?`,
      a: `Нет: подобные не приведены. Сначала ${si('x')}² + ${si('x')}² = 2${si('x')}² — и только потом порядок.`,
      note: 'Порядок шагов: сначала привести подобные, потом упорядочить.',
      draw: () => '',
      rec: ph => ph ? [`сначала привести подобные, потом упорядочить`] : [] },
    { q: 'Итог-опорник: что проверяем у многочлена?',
      a: 'Члены, стандартный вид (два условия), степень, свободный член.',
      note: 'Пусть класс повторит опорник своими словами.',
      draw: () => '',
      rec: () => ['1. Члены.', '2. Стандартный вид.', '3. Степень.', '4. Свободный член.'] },
  ];
}
// превью на сайте крутит шаги до previewUntil (счёт с 0); картинка-превью — шаг poster с показанным ответом
const BOARD = { previewUntil: 2, poster: 1 };

// Формулы в справке (help.html): ядро вызывает helpInit() при запуске
function helpInit() {
  const put = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  put('helpPoly', `2${X}${PW(3)} ${MINUS} ${X} + 5`);
  put('helpStd', `2${X}${PW(3)} + 4${X}${PW(2)} ${MINUS} ${X} + 7`);
  put('helpEx1', `2${X}${PW(3)} ${MINUS} ${X} + 5 — степень 3`);
}

// ================= Свои виды ввода =================
// pick: выбор из кнопок (порядок перемешан зерном t.o; у std перемешивание внутри opts)
const TOPIC_INPUTS = {
  pick: {
    html: t => `<div class="inrow picks">${shuffle(mulberry32(t.o), TYPES[t.type].opts(t))
      .map(o => `<button type="button" class="choice" data-choice="${o.key}"><span class="nw">${o.html}</span></button>`).join('')}</div>` +
      '<p class="hnote">Выбери верный ответ.</p>',
    collect: () => null,
  },
};
