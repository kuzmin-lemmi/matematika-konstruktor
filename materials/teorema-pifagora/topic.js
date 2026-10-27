// Теорема Пифагора: бумажные детали движутся как жёсткие фигуры.
const CONFIG = { board: { a: 3, b: 4, previewDelay: 2400, min: 2, max: 12 }, print: { variants: 25, traps: 1, space: false }, home: { round: 10, points: [10, 15, 15, 20], hintPenalty: 3, maxMultiplier: 3 } };
const GEN_VERSION = 1;
const bad = (cat, msg) => ({ cat, msg });
const pyPoint = (x, y) => ({ x, y });
const pyRound = n => Math.round(n * 1000) / 1000;
const pyPoly = ps => ps.map(p => `${pyRound(p.x)},${pyRound(p.y)}`).join(' ');
const pyText = (x, y, text, cls = 'p-label', anchor = 'middle') => `<text x="${pyRound(x)}" y="${pyRound(y)}" class="${cls}" text-anchor="${anchor}">${text}</text>`;
const rootValue = n => isqrt(n) == null ? { m: n, s: 1 } : { q: Q(isqrt(n)) };
const rootHTML = n => V.html(rootValue(n));
const rootKey = n => V.key(rootValue(n));

// Каноническая деталь: (0,0), (a,0), (0,b). Повороты — только на кратные 90°.
function paperModel(a, b) {
  const L = a + b, start = [[0, 0, 0], [L, 0, 90], [L, L, 180], [0, L, 270]], finish = [[0, a, 0], [L, 0, 90], [a, L, 180], [a, a, 270]];
  const vertices = ([x, y, angle]) => {
    const [cs, sn] = { 0: [1, 0], 90: [0, 1], 180: [-1, 0], 270: [0, -1] }[angle];
    return [[0, 0], [a, 0], [0, b]].map(([u, v]) => pyPoint(x + cs * u - sn * v, y + sn * u + cs * v));
  };
  return { a, b, L, start, finish, trianglesC: start.map(vertices), trianglesAB: finish.map(vertices), holeC: [pyPoint(a, 0), pyPoint(L, a), pyPoint(b, L), pyPoint(0, b)], holeA: [pyPoint(0, 0), pyPoint(a, 0), pyPoint(a, a), pyPoint(0, a)], holeB: [pyPoint(a, a), pyPoint(L, a), pyPoint(L, L), pyPoint(a, L)] };
}
function triple(rnd, small = false) {
  if (small) { const t = pick(rnd, [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17]]); return rnd() < .5 ? { a: t[0], b: t[1], c: t[2] } : { a: t[1], b: t[0], c: t[2] }; }
  const m = int(rnd, 2, 7), n = int(rnd, 1, m - 1), k = int(rnd, 1, 3);
  const t = { a: k * (m * m - n * n), b: 2 * k * m * n, c: k * (m * m + n * n) };
  if (rnd() < .5) [t.a, t.b] = [t.b, t.a];
  return t;
}
const invalidTriple = t => t.c > 85 || Math.min(t.a, t.b) / Math.max(t.a, t.b) < .22;

// Чертёж: C — прямой угол, AB — гипотенуза. Поворот не меняет данные.
function taskTriangle(t, mode = 'hyp') {
  // В задачах чертёж схематический: подписи читаемы и при сильно разных длинах.
  const ga = 4, gb = 3, scale = t.turn === 1 ? Math.min(130 / ga, 205 / gb) : Math.min(205 / ga, 130 / gb), pts = { C: pyPoint(0, 0), A: pyPoint(ga * scale, 0), B: pyPoint(0, -gb * scale) };
  for (const p of Object.values(pts)) { const [x, y] = [p.x, p.y]; if (t.turn === 1) { p.x = -y; p.y = x; } if (t.turn === 2) { p.x = -x; p.y = -y; } }
  const xs = Object.values(pts).map(p => p.x), ys = Object.values(pts).map(p => p.y), dx = (320 - Math.max(...xs) - Math.min(...xs)) / 2, dy = (220 - Math.max(...ys) - Math.min(...ys)) / 2;
  for (const p of Object.values(pts)) { p.x += dx; p.y += dy; }
  const center = pyPoint((pts.A.x + pts.B.x + pts.C.x) / 3, (pts.A.y + pts.B.y + pts.C.y) / 3);
  const label = (p, q, text) => {
    const m = pyPoint((p.x + q.x) / 2, (p.y + q.y) / 2), d = Math.hypot(q.x - p.x, q.y - p.y); let nx = -(q.y - p.y) / d, ny = (q.x - p.x) / d;
    if ((m.x - center.x) * nx + (m.y - center.y) * ny < 0) { nx *= -1; ny *= -1; }
    return pyText(m.x + nx * 21, m.y + ny * 21 + 7, text, 'p-number');
  };
  const norm = (p, q) => { const d = Math.hypot(q.x - p.x, q.y - p.y); return pyPoint((q.x - p.x) / d, (q.y - p.y) / d); };
  const u = norm(pts.C, pts.A), v = norm(pts.C, pts.B), r = 13;
  const mark = [pyPoint(pts.C.x + u.x * r, pts.C.y + u.y * r), pyPoint(pts.C.x + (u.x + v.x) * r, pts.C.y + (u.y + v.y) * r), pyPoint(pts.C.x + v.x * r, pts.C.y + v.y * r)];
  let s = `<polygon class="p-triangle" points="${pyPoly([pts.C, pts.A, pts.B])}"/><polyline class="p-right" points="${pyPoly(mark)}"/>` + label(pts.C, pts.A, String(t.a)) + label(pts.C, pts.B, mode === 'leg' ? '?' : String(t.b)) + label(pts.A, pts.B, mode === 'hyp' ? '?' : String(t.c));
  for (const [name, p] of Object.entries(pts)) { const d = Math.hypot(p.x - center.x, p.y - center.y) || 1; s += pyText(p.x + (p.x - center.x) / d * 22, p.y + (p.y - center.y) / d * 22 + 7, name); }
  return `<svg class="p-task-svg" viewBox="0 0 320 220" role="img" aria-label="Треугольник ABC, угол C прямой">${s}</svg>`;
}
function rectangleSVG(t) { return `<svg class="p-task-svg" viewBox="0 0 320 220" role="img" aria-label="Прямоугольник с диагональю"><path class="p-triangle" d="M45 45H270V170H45Z"/><path class="p-dash" d="M45 170L270 45"/>${pyText(157, 202, t.a, 'p-number')}${pyText(20, 115, t.b, 'p-number')}${pyText(170, 100, '?', 'p-number')}</svg>`; }
const hypExplain = t => `AB — гипотенуза против прямого угла C. AB² = ${t.a}² + ${t.b}² = ${t.a * t.a} + ${t.b * t.b} = ${t.c * t.c}; AB = ${t.c}.`;
const legExplain = t => `AB = ${t.c} — гипотенуза. BC² = AB² − AC² = ${t.c}² − ${t.a}² = ${t.c * t.c} − ${t.a * t.a} = ${t.b * t.b}; BC = ${t.b}.`;
function numericWrong(t, x, kind) {
  const text = TYPES[kind].ok(t), answer = TYPES[kind].ans(t).n;
  if (x?.n < 0) return bad('negative', `Длина положительна: нужен положительный корень. ${text}`);
  if (qeq(x, Q(answer * answer))) return bad('root', `Ты нашёл квадрат длины, но не извлёк корень. ${text}`);
  if (kind === 'hyp' && qeq(x, Q(t.a + t.b))) return bad('sum', `Ты сложил длины ${t.a} + ${t.b} = ${t.a + t.b}. Складывают квадраты катетов. ${text}`);
  if (['leg', 'ladder'].includes(kind) && qeq(x, Q(t.c * t.c + t.a * t.a))) return bad('legSum', `Для катета квадраты вычитают, а не складывают. ${text}`);
  return bad('calc', text);
}
const numTraps = (ns, answer) => [...new Set(ns)].filter(n => n !== answer && n >= 0).map(n => ({ key: String(n), html: String(n) }));
const TYPES = {
  hyp: {
    input: 'num', title: 'Найти гипотенузу', gen: rnd => ({ ...triple(rnd), turn: int(rnd, 0, 2) }), bad: invalidTriple,
    text: () => 'AB', ask: t => taskTriangle(t) + '<p class="p-question">Найди AB (в см).</p>', sheet: t => taskTriangle(t) + '<p>AB = ? см.</p>', ans: t => Q(t.c), ok: hypExplain, wrong: (t, x) => numericWrong(t, x, 'hyp'),
    hints: t => ['Гипотенуза лежит против прямого угла. Её квадрат равен сумме квадратов катетов.', `AB² = ${t.a}² + ${t.b}² = ${t.c * t.c}. Извлеки положительный корень.`], traps: t => numTraps([t.a + t.b, t.c * t.c], t.c),
  },
  leg: {
    input: 'num', title: 'Найти катет', gen: rnd => ({ ...triple(rnd), turn: int(rnd, 0, 2) }), bad: invalidTriple,
    text: () => 'BC', ask: t => taskTriangle(t, 'leg') + '<p class="p-question">Найди BC (в см).</p>', sheet: t => taskTriangle(t, 'leg') + '<p>BC = ? см.</p>', ans: t => Q(t.b), ok: legExplain, wrong: (t, x) => numericWrong(t, x, 'leg'),
    hints: t => ['Из квадрата гипотенузы вычти квадрат известного катета.', `BC² = ${t.c}² − ${t.a}² = ${t.b * t.b}. Извлеки корень.`], traps: t => numTraps([t.c - t.a, t.c * t.c + t.a * t.a, t.b * t.b], t.b),
  },
  diag: {
    input: 'num', title: 'Диагональ прямоугольника', gen: rnd => triple(rnd), bad: invalidTriple,
    text: () => 'Диагональ', ask: t => rectangleSVG(t) + '<p class="p-question">Найди диагональ прямоугольника (в см).</p>', sheet: t => rectangleSVG(t) + '<p>Диагональ = ? см.</p>', ans: t => Q(t.c),
    ok: t => `Диагональ — гипотенуза при катетах ${t.a} и ${t.b}. d² = ${t.a}² + ${t.b}² = ${t.c * t.c}; d = ${t.c} см.`, wrong: (t, x) => numericWrong(t, x, 'diag'),
    hints: t => ['Диагональ делит прямоугольник на прямоугольные треугольники.', `d² = ${t.a}² + ${t.b}² = ${t.c * t.c}.`], traps: t => numTraps([t.a + t.b, 2 * (t.a + t.b)], t.c),
  },
  ladder: {
    input: 'num', title: 'Лестница у стены', gen: rnd => triple(rnd, true), text: () => 'Высота',
    ask: t => taskTriangle(t, 'leg') + `<p class="p-question">Лестница длиной ${t.c} м стоит у вертикальной стены. Её основание в ${t.a} м от стены. На какой высоте верхний конец?</p>`, sheet: t => `<p>Лестница ${t.c} м, основание в ${t.a} м от вертикальной стены. Найди высоту (м).</p>`, ans: t => Q(t.b),
    ok: t => `Стена и земля перпендикулярны, лестница — гипотенуза. h² = ${t.c}² − ${t.a}² = ${t.b * t.b}; h = ${t.b} м.`, wrong: (t, x) => numericWrong(t, x, 'ladder'),
    hints: t => ['Лестница — наклонная сторона; высота — катет.', `h² = ${t.c}² − ${t.a}² = ${t.b * t.b}.`], traps: t => numTraps([t.c - t.a, t.a], t.b),
  },
  path: {
    input: 'num', title: 'Сократить путь', gen: rnd => triple(rnd), bad: invalidTriple, text: () => 'Сокращение пути',
    ask: t => taskTriangle(t) + `<p class="p-question">Из A идут через C в B: ${t.a} м и ${t.b} м под прямым углом. На сколько метров прямой путь AB короче?</p>`, sheet: t => `<p>Путь через прямой угол: ${t.a} м и ${t.b} м. На сколько метров прямой путь короче?</p>`, ans: t => Q(t.a + t.b - t.c),
    ok: t => `AB² = ${t.a}² + ${t.b}² = ${t.c * t.c}; AB = ${t.c} м. Через C: ${t.a} + ${t.b} = ${t.a + t.b} м. Сокращение: ${t.a + t.b} − ${t.c} = ${t.a + t.b - t.c} м.`,
    wrong: (t, x) => qeq(x, Q(t.c)) ? bad('question', `Ты нашёл прямой путь, а нужно его сокращение. ${TYPES.path.ok(t)}`) : numericWrong(t, x, 'path'),
    hints: t => ['Сначала найди прямой путь, затем вычти его из пути через угол.', `Прямой путь ${t.c} м; прежний путь ${t.a} + ${t.b} м.`], traps: t => numTraps([t.c, t.a + t.b], t.a + t.b - t.c),
  },
  apply: {
    input: 'choice', title: 'Условие применения', options: [['yes', 'Да'], ['no', 'Нет'], ['unknown', 'Недостаточно данных']],
    gen: rnd => ({ form: pick(rnd, ['right', 'oblique', 'unknown']), a: int(rnd, 2, 10), b: int(rnd, 2, 10) }), text: () => 'Верно ли AB² = AC² + BC²?',
    ask: t => `<p class="p-question">${TYPES.apply.given(t)} AC = ${t.a}, BC = ${t.b}. Можно ли утверждать AB² = AC² + BC²?</p>`, sheet: t => `<p>${TYPES.apply.given(t)} Верно ли AB² = AC² + BC²? Да / нет / недостаточно.</p>`,
    given: t => ({ right: '∠C = 90°.', oblique: '∠C = 60°.', unknown: 'Угол C не указан.' })[t.form], ans: t => ({ right: 'yes', oblique: 'no', unknown: 'unknown' })[t.form],
    ok: t => t.form === 'right' ? `Угол C = 90°, AB — гипотенуза. Поэтому AB² = ${t.a}² + ${t.b}² = ${t.a * t.a + t.b * t.b}.` : t.form === 'oblique' ? 'Угол C = 60°, а данная формула требует угла C = 90°. Запись AB² = AC² + BC² для этого треугольника неверна.' : `Даны AC = ${t.a}, BC = ${t.b}, но нет условия ∠C = 90°. Внешний вид чертежа не заменяет условие: данных недостаточно.`,
    wrong: t => bad('condition', TYPES.apply.ok(t)), key: t => ({ right: 'да', oblique: 'нет', unknown: 'недостаточно' })[t.form], keyHTML: t => TYPES.apply.key(t),
    hints: () => ['В формуле AB² = AC² + BC² прямой угол должен быть при C.', '90° — да; 60° — нет; угол не указан — данных недостаточно.'], traps: t => ['да', 'нет', 'недостаточно'].filter(s => s !== TYPES.apply.key(t)).map(key => ({ key, html: key })),
  },
  radical: {
    input: 'pyRoot', title: 'Ответ с корнем', gen: rnd => { const form = pick(rnd, ['hyp', 'leg']), x = int(rnd, 2, 12), y = form === 'leg' ? int(rnd, x + 1, 17) : int(rnd, 2, 12); return { form, x, y, n: form === 'hyp' ? x * x + y * y : y * y - x * x }; }, bad: t => isqrt(t.n) != null, text: () => 'Искомая сторона',
    ask: t => `<p class="p-question">${t.form === 'hyp' ? `Катеты ${t.x} и ${t.y} см. Найди гипотенузу.` : `Гипотенуза ${t.y} см, катет ${t.x} см. Найди другой катет.`} Ответ запиши точно, с корнем.</p>`,
    ans: t => rootValue(t.n), same: (t, v) => !!v && (v.q ? v.q.n > 0 && v.q.n * v.q.n === t.n * v.q.d * v.q.d : v.s === 1 && v.m === t.n), wrongInput: t => ({ q: Q(t.n) }), key: t => rootKey(t.n), keyHTML: t => rootHTML(t.n), answer: t => rootHTML(t.n) + ' см',
    ok: t => `Искомая сторона² = ${t.form === 'hyp' ? `${t.x}² + ${t.y}²` : `${t.y}² − ${t.x}²`} = ${t.n}. Длина положительна, поэтому ответ ${rootHTML(t.n)} см.`, wrong: t => bad('root', `Нужна длина, а не её квадрат. ${TYPES.radical.ok(t)}`),
    hints: t => [t.form === 'hyp' ? 'Сложи квадраты катетов.' : 'Из квадрата гипотенузы вычти квадрат известного катета.', `Длина² = ${t.n}. Запиши положительный корень.`], traps: t => [{ key: String(t.n), html: String(t.n) }],
  },
  mistake: {
    input: 'choice', title: 'Найти ошибку', options: [['1', 'Шаг 1'], ['2', 'Шаг 2'], ['3', 'Шаг 3']], gen: rnd => ({ ...triple(rnd, true), form: pick(rnd, ['sum', 'noRoot', 'legAdd', 'calc']) }), text: () => 'Укажи первый неверный шаг.',
    ask: t => `<p class="p-question">${t.form === 'legAdd' ? `Гипотенуза ${t.c}, катет ${t.a}. Ищут катет b.` : `Катеты ${t.a} и ${t.b}. Ищут гипотенузу c.`} Где первая ошибка?</p><ol class="p-solution">${mistakeLines(t).map(s => `<li>${s}</li>`).join('')}</ol>`, ans: t => t.form === 'noRoot' ? '3' : t.form === 'calc' ? '2' : '1',
    ok: t => `Первая ошибка в шаге ${TYPES.mistake.ans(t)}. ${t.form === 'sum' ? 'Складывают квадраты, а не длины.' : t.form === 'noRoot' ? 'Нужно извлечь корень.' : t.form === 'legAdd' ? 'Для катета квадраты вычитают.' : 'Сумма квадратов посчитана неверно.'} ${t.form === 'legAdd' ? legExplain(t) : hypExplain(t)}`, wrong: t => bad(t.form === 'sum' ? 'sum' : t.form === 'legAdd' ? 'legSum' : 'root', TYPES.mistake.ok(t)), key: t => TYPES.mistake.ans(t), keyHTML: t => TYPES.mistake.ans(t),
    hints: t => ['Проверь формулу, затем вычисления, затем извлечение корня.', TYPES.mistake.ok(t)], traps: t => ['1', '2', '3'].filter(s => s !== TYPES.mistake.ans(t)).map(key => ({ key, html: key })),
  },
};
function mistakeLines(t) {
  if (t.form === 'sum') return ['c = a + b', `c = ${t.a} + ${t.b}`, `c = ${t.a + t.b}`];
  if (t.form === 'legAdd') return ['b² = c² + a²', `b² = ${t.c * t.c} + ${t.a * t.a}`, `b² = ${t.c * t.c + t.a * t.a}`];
  return ['c² = a² + b²', `c² = ${t.a * t.a} + ${t.b * t.b} = ${t.c * t.c + (t.form === 'calc' ? 1 : 0)}`, `c = ${t.form === 'noRoot' ? t.c * t.c : t.c}`];
}
const TOPIC_INPUTS = { pyRoot: { html: () => '<div class="inrow"><input data-k="v" class="wide" inputmode="text" aria-label="Длина: число или корень" autocomplete="off"><button type="button" class="main check" data-act="check">Проверить</button></div><p class="hnote">Например, √13 или 2√3. <button type="button" data-act="sqrt" class="sqrtbtn" aria-label="Вставить знак корня">√</button></p>', collect: get => parseVal(get('v')) || { empty: true, msg: 'Впиши число или корень, например √13.' } } };
const CATS = {
  sum: ['Сложены длины вместо квадратов', 'Складываются квадраты катетов: c² = a² + b².'], legSum: ['Сумма вместо разности', 'Квадрат катета равен разности квадрата гипотенузы и квадрата другого катета.'], root: ['Квадрат длины и длина', 'После вычисления квадрата извлеки положительный корень.'], negative: ['Знак длины', 'Длина стороны положительна.'], condition: ['Условие о прямом угле', 'Теорема применяется к прямоугольному треугольнику; гипотенуза лежит против прямого угла.'], question: ['Что требуется найти', 'Отличай прямой путь от величины, на которую он короче прежнего.'], calc: ['Вычисления', 'Проверь квадраты, сложение или вычитание, затем извлечение корня.'],
};
const SECTIONS = [
  { title: 'Гипотенуза', text: 'Сумма квадратов катетов', types: ['hyp', 'diag'], ex: () => 'треугольник и диагональ прямоугольника' },
  { title: 'Катет', text: 'Разность квадратов', types: ['leg', 'ladder'], ex: () => 'неизвестная сторона и лестница у стены' },
  { title: 'Проверка рассуждений', text: 'Условия и ошибки', types: ['apply', 'mistake'], ex: () => 'прямой угол, формула и вычисления' },
  { title: 'Применение', text: 'Путь и точный ответ', types: ['path', 'radical'], ex: () => 'задачи и длины со знаком корня' },
];
const KINDS_V1 = [['hyp'], ['leg'], ['diag'], ['ladder'], ['path'], ['leg'], ['apply']];
const WORDS_V1 = ['ЛИНЕЙКА', 'ПРИЗНАК', 'ВЕРШИНА', 'ПЛАВНИК'];
const PRINT = { instr: 'В № 1–6 ответ — число, в № 7 — слово. Найди ответы в таблице букв и собери слово. Чертежи схематические; единицы указаны в задачах.', about: 'Семь задач: гипотенуза, катет, диагональ, лестница, сокращение пути и условие теоремы. Чертежи схематические. Ключ восстанавливается по номеру.', ogeAbout: 'Семь самостоятельных заданий с числовым ответом. Чертежи схематические. Каждый символ вписывается в отдельную клеточку бланка.' };
const OGE_V1 = ['hyp', 'leg', 'diag', 'ladder', 'path', 'hyp', 'leg'];
function ogeTask(kind, rnd) { const t = generate(kind, rnd); return { kind, t, ask: TYPES[kind].sheet(t), ans: String(TYPES[kind].ans(t).n) }; }

let PY_LARGE = false;
function boardExample(random, old) {
  if (!random) return { a: CONFIG.board.a, b: CONFIG.board.b, angle: 90 };
  const rnd = mulberry32((Math.random() * 4294967296) >>> 0);
  let p; do p = pick(rnd, [[3, 4], [6, 8], [5, 12], [9, 12], [4, 3], [8, 6]]); while (p[0] === old.a && p[1] === old.b);
  return { a: p[0], b: p[1], angle: 90 };
}
function bookPaper() {
  return `<g class="paper-book" filter="url(#pyShadow)"><path class="p-cover" d="M29 32Q260 3 490 30Q730 3 950 32L964 365Q720 345 490 374Q250 345 16 365Z"/><path class="p-page" d="M33 23Q265 4 490 24V365Q260 343 25 355Z"/><path class="p-page" d="M490 24Q715 4 947 23L955 355Q720 343 490 365Z"/><path class="p-gutter" d="M484 25V363M496 25V363"/></g>`;
}
function workshop(lines, render) {
  const defs = `<defs><filter id="pyShadow" x="-15%" y="-20%" width="140%" height="150%"><feDropShadow dx="0" dy="6" stdDeviation="5" flood-opacity=".18"/></filter><pattern id="pyHatchA" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 12L12 0" class="p-hatch"/></pattern><pattern id="pyHatchB" width="12" height="12" patternUnits="userSpaceOnUse"><path d="M0 6H12" class="p-hatch"/></pattern></defs>`;
  const frame = PY_LARGE ? { x: 155, y: 25, w: 670, h: 320 } : { x: 540, y: 40, w: 370, h: 300 };
  return defs + (PY_LARGE ? '' : bookPaper() + pyText(65, 67, 'БУМАЖНАЯ МАСТЕРСКАЯ', 'p-book-kicker', 'start') + lines.map((s, i) => pyText(65, 133 + i * 58, s, i === lines.length - 1 ? 'p-book-formula' : 'p-book-line', 'start')).join('')) + render(frame);
}
function renderDissection(e, split, animate = false) {
  const m = paperModel(e.a, e.b), n = e.a * e.a + e.b * e.b;
  return workshop(split ? ['Те же 4 детали.', 'Та же рамка.', `a² + b² = ${n}`] : ['Четыре треугольника.', 'В центре — квадрат.', `c² = ${n}`], f => {
    const size = Math.min(f.w - 50, f.h - 25), k = size / m.L, x = f.x + (f.w - size) / 2, y = f.y + 7;
    const map = p => pyPoint(x + p.x * k, y + p.y * k), center = ps => pyPoint(ps.reduce((s, p) => s + p.x, 0) / ps.length, ps.reduce((s, p) => s + p.y, 0) / ps.length);
    let s = `<rect class="p-frame" x="${x}" y="${y}" width="${size}" height="${size}"/>`;
    for (const [ps, id] of (split ? [[m.holeA, 'a'], [m.holeB, 'b']] : [[m.holeC, 'c']])) {
      const cc = map(center(ps)); s += `<polygon class="p-area p-area-${id}" points="${pyPoly(ps.map(map))}"/>`;
      if (id !== 'c') s += `<polygon fill="url(#pyHatch${id.toUpperCase()})" points="${pyPoly(ps.map(map))}"/>`;
      s += pyText(cc.x, cc.y + 11, `${id}²`, 'p-area-label');
    }
    const target = split ? m.finish : m.start, from = split ? m.start : m.finish;
    const transform = (v, css) => `translate(${pyRound(x + v[0] * k)}${css ? 'px,' : ' '}${pyRound(y + v[1] * k)}${css ? 'px' : ''}) rotate(${v[2]}${css ? 'deg' : ''})`;
    target.forEach((v, i) => { s += `<g class="p-tile${animate ? ' p-tile-motion' : ''}" data-tile="${i}" transform="${transform(v, false)}" style="--tile-from:${transform(from[i], true)};--tile-to:${transform(v, true)};--tile-delay:${i * 100}ms"><path class="p-piece p-piece-${i}" d="M0 0H${e.a * k}L0 ${e.b * k}Z"/><text class="p-piece-number" x="${e.a * k / 3}" y="${e.b * k / 3 + 7}" text-anchor="middle" transform="rotate(${-v[2]} ${e.a * k / 3} ${e.b * k / 3})">${i + 1}</text></g>`; });
    return s + pyText(x + size / 2, y + size + 32, `Сторона: ${e.a} + ${e.b} = ${m.L}`, 'p-caption');
  });
}
function squareModel(a, b, angle = 90) {
  const cos = angle === 90 ? 0 : angle === 60 ? .5 : -.5;
  const C = pyPoint(0, 0), A = pyPoint(a, 0), Bp = pyPoint(b * cos, -b * Math.sin(angle * Math.PI / 180));
  const square = (p, q) => { const v = pyPoint(-(q.y - p.y), q.x - p.x); return [p, q, pyPoint(q.x + v.x, q.y + v.y), pyPoint(p.x + v.x, p.y + v.y)]; };
  return { C, A, B: Bp, c2: a * a + b * b - 2 * a * b * cos, squares: [square(C, A), square(A, Bp), square(Bp, C)] };
}
function renderSquares(e, angle = 90, answer = true) {
  const m = squareModel(e.a, e.b, angle), all = m.squares.flat();
  return workshop([angle === 90 ? 'Угол C — прямой.' : `Угол C = ${angle}°.`, `a² + b² = ${e.a * e.a + e.b * e.b}`, answer ? `c² = ${m.c2}` : 'Чему равно c²?'], f => {
    const minX = Math.min(...all.map(p => p.x)), maxX = Math.max(...all.map(p => p.x)), minY = Math.min(...all.map(p => p.y)), maxY = Math.max(...all.map(p => p.y));
    const k = Math.min((f.w - 45) / (maxX - minX), (f.h - 25) / (maxY - minY));
    const map = p => pyPoint(f.x + f.w / 2 + (p.x - (minX + maxX) / 2) * k, f.y + f.h / 2 + (p.y - (minY + maxY) / 2) * k);
    let s = '';
    m.squares.forEach((ps, i) => {
      const id = ['a', 'c', 'b'][i], cc = map(pyPoint(ps.reduce((sum, p) => sum + p.x, 0) / 4, ps.reduce((sum, p) => sum + p.y, 0) / 4));
      const side = Math.hypot(ps[0].x - ps[1].x, ps[0].y - ps[1].y) * k;
      s += `<polygon class="p-area p-area-${id}" points="${pyPoly(ps.map(map))}"/>` + pyText(cc.x, cc.y + 8, side < 85 ? `${id}²` : id === 'c' && !answer ? 'c² = ?' : `${id}² = ${[e.a * e.a, m.c2, e.b * e.b][i]}`, 'p-square-label');
    });
    s += `<polygon class="p-triangle" points="${pyPoly([m.C, m.A, m.B].map(map))}"/>`;
    const vertexC = map(m.C);
    s += `<circle cx="${vertexC.x}" cy="${vertexC.y}" r="3" fill="var(--ink)"/>` + pyText(vertexC.x + 18, vertexC.y - 16, 'C', 'p-angle-vertex', 'start');
    if (angle === 90) { const cc = map(m.C); s += `<path class="p-right" d="M${cc.x} ${cc.y - 12}h12v12"/>`; }
    return s;
  });
}
function renderHero(e, answer = false) {
  const n = e.a * e.a + e.b * e.b, c = isqrt(n) == null ? sr(n) : String(isqrt(n));
  return workshop(['Сначала найди', 'прямой угол.', `a = ${e.a}, b = ${e.b}`], f => {
    const k = Math.min((f.w - 140) / e.a, (f.h - 70) / e.b), x = f.x + 80, y = f.y + f.h - 35;
    return `<polygon class="p-triangle" points="${pyPoly([pyPoint(x, y), pyPoint(x + e.a * k, y), pyPoint(x, y - e.b * k)])}"/><path class="p-right" d="M${x} ${y - 18}h18v18"/>` + pyText(x - 23, y + 20, 'C') + pyText(x + e.a * k + 20, y + 20, 'A') + pyText(x - 20, y - e.b * k - 12, 'B') + pyText(x + e.a * k / 2, y + 32, `a = ${e.a}`, 'p-caption') + pyText(x - 25, y - e.b * k / 2, `b = ${e.b}`, 'p-caption', 'end') + pyText(x + e.a * k / 2 + 25, y - e.b * k / 2 - 10, answer ? `c = ${c}` : 'c = ?', 'p-hyp-label');
  });
}
function svgAction(x, y, text, action, value = '') { return `<g class="p-svg-button" role="button" tabindex="0" aria-label="${text}" data-py-act="${action}" data-value="${value}" transform="translate(${x} ${y})"><rect rx="10" width="${action === 'angle' ? 105 : 200}" height="42"/>${pyText(action === 'angle' ? 52 : 100, 29, text, 'p-button-label')}</g>`; }
function taskOnPage(e, f, c, mode = 'hyp') {
  const k = Math.min((f.w - 30) / 320, (f.h - 20) / 220), x = f.x + (f.w - 320 * k) / 2, y = f.y + (f.h - 220 * k) / 2;
  return `<g transform="translate(${x} ${y}) scale(${k})">${taskTriangle({ a: e.a, b: e.b, c }, mode).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>`;
}
function buildSteps(e) {
  const n = e.a * e.a + e.b * e.b, c = rootHTML(n), cSvg = isqrt(n) == null ? sr(n) : String(isqrt(n)), theta = e.angle || 90, actual = squareModel(e.a, e.b, theta).c2;
  const step = (id, q, a, note, draw, rec) => ({ id, q, a, note, draw, rec: ph => ph ? rec : [] });
  return [
    step('hypotenuse', 'Какая сторона — гипотенуза?', 'AB: она лежит против прямого угла C.', 'Начните с названий сторон. Самая длинная сторона всегда против прямого угла.', () => renderHero(e), ['AB — гипотенуза; AC и BC — катеты']),
    step('squares', `Катеты ${e.a} и ${e.b}. Как найти третью сторону?`, 'Попробуем сравнить площади квадратов на сторонах.', 'Пусть класс предложит способ до показа. Складывать длины катетов нельзя.', ph => renderSquares(e, 90, !!ph), [`a² = ${e.a * e.a}; b² = ${e.b * e.b}`]),
    step('four-pieces', 'Из каких деталей собрана рамка?', 'Четыре одинаковых прямоугольных треугольника и квадрат в центре.', 'Каждая деталь имеет катеты a и b. Внешний квадрат имеет сторону a + b.', () => renderDissection(e, false), ['Сторона рамки a + b; четыре одинаковые детали']),
    step('central-square', 'Почему центральная фигура — квадрат?', 'Её стороны — одинаковые гипотенузы, а углы прямые.', 'Два острых угла прямоугольного треугольника дают 90°. Поэтому угол центра: 180° − 90° = 90°.', () => renderDissection(e, false), ['Центр — квадрат со стороной c; его площадь c²']),
    step('rearrange', 'Что останется, если переложить четыре детали?', 'Два квадрата: площади a² и b². Рамка и детали сохранились.', 'Нажмите «Показать ответ»: три детали сдвинутся, четвёртая останется на месте. Кнопка «Переложить» повторяет движение в обе стороны.', ph => renderDissection(e, ph ? e.proofSplit !== false : false, !!ph) + svgAction(PY_LARGE ? 700 : 150, PY_LARGE ? 355 : 305, 'Переложить ↔', 'arrange'), ['Та же рамка и те же детали → та же свободная площадь']),
    step('equal-areas', 'Почему свободные площади равны?', 'Из одной рамки убрали четыре одинаковых треугольника.', 'Детали не растягиваются; рамка не меняется. Разные свободные фигуры имеют одинаковую площадь.', () => renderDissection(e, true), ['c² = (a + b)² − 4 · ab/2 = a² + b²']),
    step('theorem', 'Сформулируй теорему Пифагора.', 'Квадрат гипотенузы равен сумме квадратов катетов.', 'Обязательно назовите условие: треугольник прямоугольный. c обозначает гипотенузу.', () => renderSquares(e), ['Прямоугольный треугольник: c² = a² + b²']),
    step('find-hyp', `Найди гипотенузу при катетах ${e.a} и ${e.b}.`, `c² = ${e.a * e.a} + ${e.b * e.b} = ${n}; c = ${c}.`, 'Длина положительна. Если корень не целый, оставляем точный ответ со знаком корня.', ph => renderHero(e, !!ph), [`c² = ${n}; c = ${c}`]),
    step('angle-experiment', 'А если угол C перестанет быть прямым?', theta === 90 ? `При 90°: c² = ${n} = a² + b².` : `При ${theta}°: c² = ${actual}, а a² + b² = ${n}. Равенства нет.`, 'Выберите 60°, 90° или 120°. Длины a и b сохраняются. Сейчас исследуем отдельный чертёж; перестановка относится к прямоугольному случаю.', () => renderSquares(e, theta) + [60, 90, 120].map((a, i) => svgAction((PY_LARGE ? 320 : 70) + i * 120, PY_LARGE ? 355 : 310, `${a}°`, 'angle', a)).join(''), ['Условие: угол между катетами равен 90°']),
    step('find-leg', 'Как найти катет, если гипотенуза известна?', `b² = c² − a² = ${n} − ${e.a * e.a} = ${e.b * e.b}; b = ${e.b}.`, 'Из квадрата гипотенузы вычитаем квадрат известного катета.', () => workshop(['Ищем катет b.', `c² = ${n}, a = ${e.a}`, 'b² = c² − a²'], f => taskOnPage(e, f, cSvg, 'leg')), [`b² = ${n} − ${e.a * e.a}; b = ${e.b}`]),
    step('trap', 'Ученик написал c = a + b. В чём ошибка?', `Он сложил длины. Верно: c² = ${e.a}² + ${e.b}² = ${n}; c = ${c}.`, 'Проверьте также, что никто не остановился на c² и не забыл извлечь корень.', () => renderSquares(e), ['c ≠ a + b; сначала квадраты, затем корень']),
    step('summary', 'Что нужно проверить перед решением?', 'Прямой угол → гипотенуза → формула → положительный корень.', 'Попросите назвать формулу для гипотенузы и отдельно для катета.', () => workshop(['c² = a² + b²', 'a² = c² − b²', 'b² = c² − a²'], f => taskOnPage(e, f, cSvg)), ['Гипотенуза: сумма квадратов; катет: разность']),
  ];
}
const BOARD = { previewUntil: 7, poster: 5 };
function helpInit() {
  $('pyHelpRoot').innerHTML = RT(13);
  const button = document.createElement('button'); button.type = 'button'; button.id = 'pyControlsBtn'; button.textContent = '🎛'; button.setAttribute('aria-label', 'Параметры бумажной модели'); button.setAttribute('aria-expanded', 'false'); $('board').querySelector('.bbar').append(button);
  const panel = document.createElement('div'); panel.id = 'pyControls'; panel.hidden = true; panel.className = 'no-print'; panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-label', 'Параметры модели');
  panel.innerHTML = '<button type="button" id="pyClose" aria-label="Закрыть параметры">×</button><h3>Бумажная модель</h3><label>Катет a <input id="pyA" type="number" min="2" max="12" step="1"></label><label>Катет b <input id="pyB" type="number" min="2" max="12" step="1"></label><label><input id="pyLarge" type="checkbox"> Крупный чертёж</label><p>Катеты меняются целыми числами. Угол исследуем на шаге 9.</p>'; document.body.append(panel);
  const sync = () => { if (B.e) { $('pyA').value = B.e.a; $('pyB').value = B.e.b; } };
  const toggle = () => { panel.hidden = !panel.hidden; button.setAttribute('aria-expanded', String(!panel.hidden)); sync(); };
  button.addEventListener('click', toggle); $('pyClose').addEventListener('click', toggle);
  for (const [id, key] of [['pyA', 'a'], ['pyB', 'b']]) $(id).addEventListener('change', () => { if (!B.e) return; B.e[key] = Math.max(CONFIG.board.min, Math.min(CONFIG.board.max, Math.round(+$(id).value || CONFIG.board.min))); B.steps = buildSteps(B.e); renderBoard(); sync(); });
  $('pyLarge').addEventListener('change', () => { PY_LARGE = $('pyLarge').checked; renderBoard(); });
  const act = target => { const el = target.closest?.('[data-py-act]'); if (!el || !B.e) return; if (el.dataset.pyAct === 'arrange') { B.e.proofSplit = !(B.phase ? B.e.proofSplit !== false : false); B.phase = 1; } if (el.dataset.pyAct === 'angle') B.e.angle = +el.dataset.value; B.steps = buildSteps(B.e); renderBoard(); };
  document.addEventListener('click', e => { if (screen !== 'board') { panel.hidden = true; button.setAttribute('aria-expanded', 'false'); } else act(e.target); });
  document.addEventListener('keydown', e => { if (e.target.closest?.('[data-py-act]') && ['Enter', ' '].includes(e.key)) { e.preventDefault(); e.stopImmediatePropagation(); act(e.target); } if (e.key === 'Escape' && !panel.hidden) { e.preventDefault(); e.stopImmediatePropagation(); panel.hidden = true; button.setAttribute('aria-expanded', 'false'); } }, true);
}
