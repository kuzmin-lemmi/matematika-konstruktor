// Тема «{{title}}». Только содержание — каркас (экраны, раздатка, бланк, тренажёр, доска) даёт ядро core/.
// Заготовка рабочая: пример — сложение чисел с разными знаками. Замени всё, что помечено «ЗАМЕНИ».
// Что тема обязана задать и как — ИНСТРУКЦИЯ.md, раздел «Из чего состоит тема».
// Готовые функции ядра: int, pick, shuffle, mulberry32; дроби Q, qadd, qsub, qmul, qeq, qneg, gcd, isqrt, qsqrt,
// floorSqrt, toMixed, decStr; запись F (дробь этажом), M (смешанное число), RT (корень), X (курсивный x), htmlQ,
// keyQ, D, esc, plural, MINUS; чертежи tx, grid, under, svgFrac, numLine, sr, ds (core/board.js).

// ================= Параметры: учитель может поменять их за минуту =================
const CONFIG = {
  maxN: 20,                 // ЗАМЕНИ: свои параметры заданий
  board: {
    a: -7, b: 3,            // первый пример на доске
    previewDelay: 1700,     // превью на сайте: пауза между шагами, мс
  },
  print: {
    variants: 25,           // сколько вариантов печатать по умолчанию
    traps: 2,               // сколько ответов-ловушек на задание в таблице букв
    space: true,            // сетка для решения под каждым заданием
  },
  home: {
    round: 10,              // заданий в тренировке
    points: [10, 10],       // очки за задание по разделам (столько чисел, сколько разделов)
    hintPenalty: 3,         // штраф за подсказку
    maxMultiplier: 3,       // множитель за серию: +1 за каждые 3 задания подряд без ошибок
  },
};
// Версия генератора — первая часть номера варианта «1-4817». Изменил генератор или состав
// заданий раздатки — увеличь версию и оставь старую ветку, пока на неё есть напечатанные листы.
const GEN_VERSION = 1;

// ================= Типы заданий =================
// input: num — число, frac — дробь, choice — выбор (options), eq — корни уравнения, est — два соседних целых.
// gen(rnd, form) — задание из зерна (никакого Math.random), bad(t) — вырожденные случаи, text(t) — запись,
// ans(t) — ответ, ok(t) — короткое объяснение верного, wrong(t, x) — {cat, msg} с вычислением,
// hints(t) — две подсказки; key/keyHTML — ответ для ключа (у num/frac по умолчанию из ans), traps(t) — ловушки
// [{key, html}] на типичных ошибках; ask/sheet/answer — свои формулировки в тренажёре, на листе и в разборе.
const bad = (cat, msg) => ({ cat, msg });
const num = n => n < 0 ? `(${MINUS}${-n})` : String(n);      // отрицательное в скобках: (−7)
const sgn = n => (n < 0 ? MINUS : '') + Math.abs(n);           // со знаком «−»

const TYPES = {
  sum: {   // ЗАМЕНИ: пример — сумма чисел с разными знаками
    input: 'num', title: 'Сложение чисел с разными знаками',
    gen: rnd => ({ a: int(rnd, -CONFIG.maxN, CONFIG.maxN), b: int(rnd, -CONFIG.maxN, CONFIG.maxN) }),
    bad: t => t.a === 0 || t.b === 0 || Math.sign(t.a) === Math.sign(t.b) || Math.abs(t.a) === Math.abs(t.b),
    text: t => `${num(t.a)} + ${num(t.b)}`,
    ans: t => Q(t.a + t.b),
    why: t => {
      const [big, small] = Math.abs(t.a) > Math.abs(t.b) ? [t.a, t.b] : [t.b, t.a];
      return `Модули ${Math.abs(big)} и ${Math.abs(small)}: ${Math.abs(big)} ${MINUS} ${Math.abs(small)} = ${Math.abs(big) - Math.abs(small)}, знак — как у ${sgn(big)}. ${TYPES.sum.text(t)} = ${sgn(t.a + t.b)}.`;
    },
    ok: t => TYPES.sum.why(t),
    wrong(t, v) {
      const r = t.a + t.b, all = Math.abs(t.a) + Math.abs(t.b);
      if (qeq(v, Q(-r))) return bad('sign', `Знак не тот: у суммы знак числа с большим модулем. ${TYPES.sum.why(t)}`);
      if (qeq(v, Q(all)) || qeq(v, Q(-all))) return bad('add', `Ты сложил модули: ${Math.abs(t.a)} + ${Math.abs(t.b)} = ${all}. Но знаки разные — модули вычитают. ${TYPES.sum.why(t)}`);
      return bad('calc', TYPES.sum.why(t));
    },
    traps: t => [-(t.a + t.b), Math.sign(t.a + t.b) * (Math.abs(t.a) + Math.abs(t.b))].map(n => ({ key: keyQ(Q(n)), html: htmlQ(Q(n)) })),
    hints: t => ['Знаки разные: из большего модуля вычти меньший.', `Модули ${Math.abs(t.a)} и ${Math.abs(t.b)}.`],
  },
  cmp: {   // ЗАМЕНИ: пример — сравнение отрицательных чисел
    input: 'choice', title: 'Сравнение отрицательных чисел', options: [['<', '&lt;'], ['>', '&gt;']],
    gen: rnd => ({ a: -int(rnd, 1, CONFIG.maxN), b: -int(rnd, 1, CONFIG.maxN) }),
    bad: t => t.a === t.b,
    text: t => `${sgn(t.a)} <span class="cmpbox">?</span> ${sgn(t.b)}`,
    ask: t => `Сравни: ${TYPES.cmp.text(t)}`,
    sheet: t => `Сравни: ${sgn(t.a)} и ${sgn(t.b)}`,
    ans: t => t.a < t.b ? '<' : '>',
    answer: t => `${sgn(t.a)} ${esc(TYPES.cmp.ans(t))} ${sgn(t.b)}`,
    ok: t => `Из двух отрицательных чисел больше то, у которого модуль меньше: ${sgn(t.a)} ${esc(TYPES.cmp.ans(t))} ${sgn(t.b)}.`,
    wrong: t => bad('cmp', `На координатной прямой левее — меньше. Модули ${Math.abs(t.a)} и ${Math.abs(t.b)}: больше то отрицательное число, у которого модуль меньше, поэтому ${sgn(t.a)} ${esc(TYPES.cmp.ans(t))} ${sgn(t.b)}.`),
    key: t => TYPES.cmp.ans(t),
    keyHTML: t => esc(TYPES.cmp.ans(t)),
    traps: t => { const o = TYPES.cmp.ans(t) === '<' ? '>' : '<'; return [{ key: o, html: esc(o) }]; },
    hints: t => ['Представь координатную прямую: что левее, то меньше.', `Модули ${Math.abs(t.a)} и ${Math.abs(t.b)}.`],
  },
};

// Типы ошибок для блока «Над чем поработать»: [название, совет]
const CATS = {
  sign: ['Знак суммы', 'У суммы чисел с разными знаками знак того числа, у которого модуль больше.'],
  add:  ['Модули складываются или вычитаются', 'Знаки одинаковые — модули складывают, разные — вычитают.'],
  cmp:  ['Сравнение отрицательных', 'Из двух отрицательных чисел больше то, у которого модуль меньше.'],
  calc: ['Вычисления', 'Проверь вычитание модулей.'],
};

// Разделы тренажёра: ссылка ?mode=home&level=N сразу открывает раздел N
const SECTIONS = [
  { title: 'Раздел 1', text: 'Сложение', types: ['sum'], ex: () => `(${MINUS}7) + 3 = ?` },
  { title: 'Раздел 2', text: 'Сравнение', types: ['cmp'], ex: () => `${MINUS}7 <span class="cmpbox">?</span> ${MINUS}3` },
];

// ================= Раздатка =================
// Состав варианта: [тип] или [тип, форма] или [тип, [формы на выбор]]. Ответы заданий в варианте должны
// различаться: у выбора всего два-три ответа, поэтому такое задание — одно на вариант.
const KINDS_V1 = [['sum'], ['sum'], ['sum'], ['sum'], ['sum'], ['cmp']];
// Слова для самопроверки: столько букв, сколько заданий, буквы не повторяются
const WORDS_V1 = ['КОМПАС', 'ГЛОБУС', 'ПОДВИГ', 'КАРТОН', 'БАРСУК', 'ЛИСТОК'];
const PRINT = {
  instr: 'ЗАМЕНИ: как записывать ответы. Найди ответ в таблице букв и впиши букву — получится слово. Нет ответа в таблице или слово не сложилось — ищи ошибку.',
  about: 'ЗАМЕНИ: в каждом варианте 6 заданий — какие. Верные ответы складываются в слово.',
  ogeAbout: '',
};
// Бланк ОГЭ (необязательно, для 8–9 классов): раскомментируй и задай свои задания с ответом-числом.
// const OGE_V1 = ['sum', 'sum', 'sum'];
// function ogeTask(kind, rnd) {
//   const t = generate('sum', rnd);
//   return { kind, t, ask: `Найдите значение выражения ${TYPES.sum.text(t)}.`, ans: keyQ(TYPES.sum.ans(t)) };
// }

// ================= На доске =================
// Пример для показа: random = false — из CONFIG.board, true — «Другие числа» (old — прошлый пример)
function boardExample(random, old) {
  if (!random) return { a: CONFIG.board.a, b: CONFIG.board.b };
  const rnd = mulberry32((Math.random() * 4294967296) >>> 0);
  let t; do t = generate('sum', rnd); while (t.a === old.a && t.b === old.b);
  return { a: t.a, b: t.b };
}
// Шаги: q — вопрос классу (до показа), a — ответ, note — что сказать (подсказка учителю),
// draw(phase) — SVG внутри viewBox 980 × 400 или '' (без чертежа), rec(phase) — строки «Запись в тетради»
function buildSteps(e) {
  const lo = -20, hi = 20, Xs = v => 90 + (v - lo) * 800 / (hi - lo), s = e.a + e.b;
  const line = () => numLine(200, lo, hi, 1, 5, null);
  const dot = (v, cls = 'dot') => `<circle class="${cls}" cx="${Xs(v)}" cy="200" r="12"/>` + tx(Xs(v), 160, sgn(v), 'lab s warm');
  const arrow = () => `<g class="new"><path class="br warm" d="M${Xs(e.a)} 240 Q${(Xs(e.a) + Xs(s)) / 2} 300 ${Xs(s)} 240"/>${tx((Xs(e.a) + Xs(s)) / 2, 330, (e.b > 0 ? '+' : MINUS) + Math.abs(e.b), 'lab warm')}</g>`;
  return [
    { q: `Сколько будет ${TYPES.sum.text(e)}?`, a: `Отметим ${sgn(e.a)} на координатной прямой.`,
      note: 'Попросите записать ответ в тетрадь, не обсуждая.',
      draw: ph => line() + (ph ? dot(e.a) : ''), rec: () => [] },
    { q: `Куда и на сколько сдвинуться?`, a: `На ${Math.abs(e.b)} ${e.b > 0 ? 'вправо' : 'влево'}: ${TYPES.sum.text(e)} = ${sgn(s)}.`,
      note: 'Прибавить положительное — сдвиг вправо, отрицательное — влево.',
      draw: ph => line() + dot(e.a) + (ph ? arrow() + dot(s) : ''), rec: ph => ph ? [`${TYPES.sum.text(e)} = ${sgn(s)}`] : [] },
    { q: 'Как сложить без прямой?', a: 'Из большего модуля вычесть меньший, знак — как у числа с большим модулем.',
      note: 'Пусть класс сам сформулирует правило по записи в тетради.',
      draw: () => '', rec: () => [TYPES.sum.why(e)] },
  ];
}
// превью на сайте крутит шаги до previewUntil (счёт с 0); картинка-превью — шаг poster с показанным ответом
const BOARD = { previewUntil: 1, poster: 1 };

// Формулы в справке (help.html), если они нужны: ядро вызывает helpInit() при запуске
function helpInit() {
  $('helpEx1').innerHTML = `${F({ n: 1, d: 2 })} + ${F({ n: 1, d: 3 })}`;   // ЗАМЕНИ или удали
}
