// Тема «Свойства квадратного корня» (8 класс, Макарычев) — продолжение «Арифметического квадратного корня».
// Содержание: корень из произведения и частного, вынесение и внесение множителя. Каркас — core/.
// Первый материал по корню (materials/arifmeticheskii-kvadratnyi-koren/) — определение, повторяем;
// здесь — свойства. Виды ввода: num, frac, choice, under (число под корнем), rad (число√число) — свои.

// ================= Параметры: учитель может поменять их за минуту =================
const CONFIG = {
  board: {
    rects: { a: 9, b: 4 },  // √(9·4): квадраты площадей 9 и 4 и большой 36 со стороной 6
    sq: [49, 16],           // √(49·16) — оба множителя квадраты
    irr: [8, 2],            // √8 · √2 = √16 = 4 — множители не квадраты
    quot: [18, 2],          // √18/√2 = √9 = 3
    fracq: [8, 50],         // √(8/50) = √(4/25) = 2/5
    neg: [4, 9],            // ловушка √(−4)·√(−9) — свойство требует a ≥ 0, b ≥ 0
    out: 72,                // √72 = √(36·2) = 6√2
    ins: [3, 8],            // 3√8 = √(9·8) = √72 — то же число, что в шаге о вынесении
    cmp: [2, 7, 30],        // 2√7 = √28 < √30
    previewDelay: 1700,     // превью на сайте: пауза между шагами, мс
  },
  print: {
    variants: 25,           // сколько вариантов печатать по умолчанию
    traps: 2,               // сколько ответов-ловушек на задание в таблице букв
    space: true,            // сетка для решения под каждым заданием
  },
  home: {
    round: 10,              // заданий в тренировке
    points: [10, 15, 15],   // очки за задание по разделам
    hintPenalty: 3,         // штраф за подсказку
    maxMultiplier: 3,       // множитель за серию: +1 за каждые 3 задания подряд без ошибок
  },
};
// Версия генератора — первая часть номера варианта «1-4817». Изменил генератор или состав
// заданий раздатки — увеличь версию и оставь старую ветку, пока на неё есть напечатанные листы.
const GEN_VERSION = 1;

// Ответ-ловушка: категория ошибки (CATS) + разбор
const bad = (cat, msg) => ({ cat, msg });

// ================= Наборы чисел =================
// Простые подкоренные числа (не квадрат, на квадрат не делится): для вынесения и внесения
const SFM = [2, 3, 5, 6, 7, 10, 11, 13, 14, 15];
// [n, k, m]: n = k²·m, k — наибольший квадратный множитель (полное вынесение)
const OUTQ = [[72, 6, 2], [48, 4, 3], [50, 5, 2], [32, 4, 2], [63, 3, 7], [75, 5, 3], [45, 3, 5], [98, 7, 2],
  [80, 4, 5], [99, 3, 11], [108, 6, 3], [128, 8, 2], [147, 7, 3], [175, 5, 7], [200, 10, 2]];
// Пары неквадратов, произведение которых — квадрат: √a · √b = √(a·b) — целое
const FOLDS = [[2, 8], [2, 18], [2, 50], [3, 12], [3, 27], [5, 20], [5, 45], [6, 24], [6, 54], [8, 18], [8, 32], [12, 27], [7, 28]];
// Частные, равные квадрату целого: √a / √b = √(a/b) — целое
const QUOTS = [[18, 2], [45, 5], [32, 2], [27, 3], [50, 2], [75, 3], [98, 2], [24, 6], [80, 5], [200, 8]];
// Дроби под корнем, сокращающиеся до квадрата: [a, b, p, q]: a/b = p²/q²
const REDU = [[8, 50, 2, 5], [18, 50, 3, 5], [2, 50, 1, 5], [12, 48, 1, 2], [50, 8, 5, 2], [128, 32, 2, 1]];
// Пары без квадратов: √a · √b = √(a·b), произведение — не квадрат
const IRRM = [[2, 3], [2, 5], [2, 7], [3, 5], [3, 7], [5, 6], [3, 10], [5, 7], [5, 14], [6, 7]];

const TYPES = {
  prod: {
    input: 'num', title: 'Корень из произведения',
    gen: (rnd, form) => {
      form = form || pick(rnd, ['sq', 'fold']);
      if (form === 'sq') { const a = int(rnd, 3, 12), b = int(rnd, 3, 12); return { form, a, b }; }
      const [a, b] = pick(rnd, FOLDS);
      return { form, a, b };
    },
    bad: t => t.form === 'sq' && t.a === t.b,
    text: t => t.form === 'sq' ? RT(`${t.a * t.a} · ${t.b * t.b}`) : RT(`${t.a} · ${t.b}`),
    ans: t => t.form === 'sq' ? Q(t.a * t.b) : Q(isqrt(t.a * t.b)),
    ok(t) {
      const T = TYPES.prod;
      if (t.form === 'sq') return `${T.text(t)} = ${RT(t.a * t.a)} · ${RT(t.b * t.b)} = ${t.a} · ${t.b} = ${t.a * t.b}.`;
      return `${T.text(t)} = ${t.a * t.b}, потому что ${t.a} · ${t.b} = ${t.a * t.b} — квадрат числа, ${RT(t.a * t.b)} = ${htmlQ(TYPES.prod.ans(t))}.`;
    },
    wrong(t, v) {
      const ok = TYPES.prod.ok(t), under = t.form === 'sq' ? t.a * t.a * t.b * t.b : t.a * t.b;
      if (qeq(v, Q(t.a + t.b)))
        return bad('sum', `Корень из произведения не равен сумме корней: ${TYPES.prod.text(t)} ≠ ${t.a + t.b}. Извлекай корень из каждого множителя и перемножай: ${ok}`);
      if (qeq(v, Q(under)))
        return bad('noRoot', `Это число под корнем, а нужен корень из него: сначала перемножь, потом извлеки корень. ${ok}`);
      return bad('calc', `Проверим возведением в квадрат: ${htmlQ(v)}² = ${sq2(v)}, а под корнем ${under}. ${ok}`);
    },
    traps(t) {
      const under = t.form === 'sq' ? t.a * t.a * t.b * t.b : t.a * t.b;
      return [t.a + t.b, under].map(n => ({ key: keyQ(Q(n)), html: htmlQ(Q(n)) }));
    },
    hints(t) {
      if (t.form === 'sq') return ['Оба множителя — квадраты: корень из каждого извлекается по таблице квадратов.',
        `${t.a * t.a} = ${t.a}², ${t.b * t.b} = ${t.b}², значит ${TYPES.prod.text(t)} = ${t.a} · ${t.b} = ${t.a * t.b}.`];
      return ['Произведение под корнем — квадрат целого числа. Найди его.', `${t.a} · ${t.b} = ${t.a * t.b}, ${RT(t.a * t.b)} = ${isqrt(t.a * t.b)}.`];
    },
  },
  quot: {
    input: 'frac', title: 'Корень из частного',
    gen: (rnd, form) => {
      form = form || pick(rnd, ['divide', 'divide', 'reduce']);
      if (form === 'divide') { const [a, b] = pick(rnd, QUOTS); return { form, a, b }; }
      const [a, b, p, q] = pick(rnd, REDU);
      return { form, a, b, p, q };
    },
    text(t) {
      if (t.form === 'divide') return `<span class="nw">${F({ n: RT(t.a), d: RT(t.b) })}</span>`;
      return `<span class="nw">${RT(F({ n: t.a, d: t.b }), true)}</span>`;
    },
    ans: t => t.form === 'divide' ? Q(isqrt(t.a / t.b)) : Q(t.p, t.q),
    ok(t) {
      const T = TYPES.quot;
      if (t.form === 'divide')
        return `Корень из частного: ${RT(t.a)}/${RT(t.b)} = ${RT(`${t.a} : ${t.b}`)}: ${t.a} : ${t.b} = ${t.a / t.b}, ${RT(t.a / t.b)} = ${isqrt(t.a / t.b)}.`;
      return `Сначала сократи дробь: ${t.a}/${t.b} = ${t.p * t.p}/${t.q * t.q}. Тогда ${T.text(t)} = ${RT(t.q > 1 ? F({ n: t.p * t.p, d: t.q * t.q }) : `${t.p * t.p}`, t.q > 1)} = ${TYPES.quot.keyHTML(t)}.`;
    },
    wrong(t, v) {
      const ok = TYPES.quot.ok(t);
      if (t.form === 'divide') {
        if (qeq(v, Q(t.a / t.b))) return bad('noRoot', `Это только ${t.a} : ${t.b} = ${t.a / t.b} — число под корнем. Извлеки корень: ${RT(t.a / t.b)} = ${isqrt(t.a / t.b)}. Проверка: ${isqrt(t.a / t.b)}² = ${t.a / t.b}.`);
        if (qeq(v, Q(t.a + t.b)) || qeq(v, Q(t.a - t.b)))
          return bad('sum', `Корень из частного — не сложение и не вычитание: дели подкоренные числа. ${ok}`);
        return bad('calc', `Проверим возведением в квадрат: ${htmlQ(v)}² = ${sq2(v)}, а под корнем ${t.a} : ${t.b} = ${t.a / t.b}. ${ok}`);
      }
      if (qeq(v, Q(t.p * t.p, t.q * t.q)))
        return bad('quotFrac', `Это сокращённая дробь, а нужен корень из неё: ${RT(F({ n: t.p * t.p, d: t.q * t.q }), true)} = ${F({ n: t.p, d: t.q })}. Проверка: (${htmlQ(Q(t.p, t.q), 'frac')})² = ${t.p * t.p}/${t.q * t.q}.`);
      if (qeq(v, Q(t.a, t.b)))
        return bad('quotFrac', `Нужно сначала сократить подкоренную дробь: ${t.a}/${t.b} = ${t.p * t.p}/${t.q * t.q}. ${ok}`);
      if (qeq(v, Q(t.a + t.b)) || qeq(v, Q(t.a - t.b)))
        return bad('sum', `Дробь под корнем нельзя упростить сложением. Сократи её и извлеки корень: ${ok}`);
      if (qeq(v, Q(t.q, t.p)))
        return bad('flip', `Дробь перевёрнута: корень из числителя делим на корень из знаменателя, поэтому ${RT(F({ n: t.p * t.p, d: t.q * t.q }), true)} = ${F({ n: t.p, d: t.q })}, а не ${F({ n: t.q, d: t.p })}.`);
      return bad('quotFrac', `Сократи подкоренную дробь, потом извлеки корень из числителя и из знаменателя. ${ok}`);
    },
    key: t => keyQ(TYPES.quot.ans(t)),
    keyHTML: t => htmlQ(TYPES.quot.ans(t), 'frac'),
    traps(t) {
      const out = t.form === 'divide' ? [Q(t.a / t.b)] : [Q(t.p * t.p, t.q * t.q), Q(t.q, t.p), Q(t.a, t.b)];
      const seen = [];
      return out.filter(x => { const k = keyQ(x); if (k === keyQ(TYPES.quot.ans(t)) || seen.includes(k)) return false; seen.push(k); return true; })
        .map(x => ({ key: keyQ(x), html: htmlQ(x, 'frac') }));
    },
    hints(t) {
      return t.form === 'divide'
        ? ['Корень из частного: √a/√b = √(a/b) — раздели подкоренные числа.', `${t.a} : ${t.b} = ${t.a / t.b}, ${RT(t.a / t.b)} = ${isqrt(t.a / t.b)}.`]
        : ['Сократи подкоренную дробь, потом извлеки корень из числителя и из знаменателя.', `${t.a}/${t.b} = ${t.p * t.p}/${t.q * t.q}, ответ — ${TYPES.quot.keyHTML(t)}.`];
    },
  },
  out: {
    input: 'rad', title: 'Вынесение множителя',
    gen: rnd => { const [n, k, m] = pick(rnd, OUTQ); return { n, k, m }; },
    text: t => RT(t.n),
    ans: t => ({ k: t.k, m: t.m }), correct: t => ({ k: t.k, m: t.m }),
    wrongInput: t => ({ k: 1, m: t.n }),
    same: (t, x) => x.k === t.k && x.m === t.m,
    ok: t => `${t.n} = ${t.k * t.k} · ${t.m}, значит ${TYPES.out.text(t)} = ${RT(`${t.k * t.k} · ${t.m}`)} = ${t.k}${RT(t.m)}.`,
    wrong(t, x) {
      if (x.k === 1)
        return bad('out', `Множитель не вынесен: разложи ${t.n} на множители и найди квадрат. ${TYPES.out.ok(t)}`);
      if (x.k * x.k * x.m === t.n && !(x.k === t.k && x.m === t.m))
        return bad('part', `(${x.k}${RT(x.m)})² = ${x.k * x.k} · ${x.m} = ${t.n} — значение то же, но под корнем ${x.m} остался квадрат. Ищи наибольший квадратный множитель: ${TYPES.out.ok(t)}`);
      return bad('calc', `Проверим возведением в квадрат: (${x.k}${RT(x.m)})² = ${x.k * x.k} · ${x.m} = ${x.k * x.k * x.m}, а под корнем ${t.n}. ${TYPES.out.ok(t)}`);
    },
    key: t => `${t.k}√${t.m}`,
    keyHTML: t => `${t.k}${RT(t.m)}`,
    traps(t) {
      const out = [{ k: 1, m: t.n }, { k: t.k, m: t.n / t.k }];
      if (t.n % 4 === 0) out.push({ k: 2, m: t.n / 4 });
      return out.filter(x => !(x.k === t.k && x.m === t.m)).map(x => ({ key: `${x.k}√${x.m}`, html: `${x.k}${RT(x.m)}` }));
    },
    hints: t => [`Разложи ${t.n} на множители и найди среди них квадрат: ${t.n} = ? · ?.`,
      `${t.n} = ${t.k * t.k} · ${t.m}; квадрат ${t.k}² выносится наружу: ${TYPES.out.keyHTML(t)}.`],
  },
  in: {
    input: 'under', title: 'Внесение под корень',   // ответ — число под корнем (TOPIC_INPUTS.under)
    gen: (rnd, form) => {
      form = form || pick(rnd, ['fold', 'fold', 'irr']);
      if (form === 'fold') { const k = int(rnd, 2, 9), m = pick(rnd, SFM.slice(0, 6)); return { form, k, m }; }
      const [a, b] = pick(rnd, IRRM);
      return { form, a, b };
    },
    bad: t => t.form === 'fold' && t.k * t.k * t.m > 600,
    text: t => t.form === 'fold' ? `<span class="nw">${t.k}${RT(t.m)}</span>` : `<span class="nw">${RT(t.a)} · ${RT(t.b)}</span>`,
    ask: t => `Внеси ${t.form === 'fold' ? 'множитель' : 'множители'} под знак корня: ${TYPES.in.text(t)} = ?`,
    sheet: t => `Внеси ${t.form === 'fold' ? 'множитель' : 'множители'}: ${TYPES.in.text(t)} = √?`,
    ans: t => t.form === 'fold' ? Q(t.k * t.k * t.m) : Q(t.a * t.b),
    key: t => keyQ(TYPES.in.ans(t)),
    keyHTML: t => htmlQ(TYPES.in.ans(t)),
    same: (t, v) => qeq(v, TYPES.in.ans(t)),
    ok(t) {
      const T = TYPES.in;
      if (t.form === 'fold') return `${t.k}² = ${t.k * t.k}, значит ${T.text(t)} = ${RT(`${t.k * t.k} · ${t.m}`)} = ${RT(t.k * t.k * t.m)}.`;
      return `${T.text(t)} = ${RT(`${t.a} · ${t.b}`)}: произведение корней — корень из произведения, ${t.a} · ${t.b} = ${t.a * t.b}.`;
    },
    wrong(t, v) {
      const ok = TYPES.in.ok(t);
      if (t.form === 'fold') {
        if (qeq(v, Q(t.m))) return bad('in', `Коэффициент не должен «просто сдвинуться» под корень — вносится его квадрат: ${t.k}² = ${t.k * t.k}. ${ok}`);
        if (qeq(v, Q(t.k))) return bad('in', `В корень вносится квадрат коэффициента, а не сам коэффициент: ${t.k}² = ${t.k * t.k}. ${ok}`);
        if (qeq(v, Q(t.k * t.m))) return bad('in', `Внеси ${t.k} в квадрате: ${t.k}² · ${t.m} = ${t.k * t.k} · ${t.m} = ${t.k * t.k * t.m}. ${ok}`);
      } else if (qeq(v, Q(t.a + t.b)))
        return bad('sum', `Под один корень вносится произведение, а не сумма: ${t.a} · ${t.b} = ${t.a * t.b}. ${ok}`);
      return bad('calc', `Проверим возведением в квадрат: ${htmlQ(v)}² = ${sq2(v)}, а это не равно ${TYPES.in.text(t)} = ${htmlQ(TYPES.in.ans(t))}. ${ok}`);
    },
    traps(t) {
      const vals = t.form === 'fold' ? [t.m, t.k, t.k * t.m] : [t.a + t.b];
      const A = t.k * t.k * t.m;
      return vals.filter(x => x !== A).map(x => ({ key: keyQ(Q(x)), html: htmlQ(Q(x)) }));
    },
    hints(t) {
      if (t.form === 'fold') return [`Коэффициент вносится в квадрате: k√m = √(k²·m).`, `${t.k}² = ${t.k * t.k}, значит ${t.k}${RT(t.m)} = ${RT(t.k * t.k * t.m)}.`];
      return ['Произведение корней — корень из произведения: √a·√b = √(a·b).', `${t.a} · ${t.b} = ${t.a * t.b}.`];
    },
  },
  simpl: {
    input: 'rad', title: 'Упрощение суммы корней',
    gen: rnd => { const m = pick(rnd, SFM), k1 = int(rnd, 1, 5), k2 = int(rnd, 2, 6); return { m, k1, k2 }; },
    bad: t => t.k1 === t.k2,
    text: t => `${RT(t.k1 * t.k1 * t.m)} + ${RT(t.k2 * t.k2 * t.m)}`,
    ans: t => ({ k: t.k1 + t.k2, m: t.m }), correct: t => ({ k: t.k1 + t.k2, m: t.m }),
    wrongInput: t => ({ k: 1, m: t.k1 * t.k1 * t.m + t.k2 * t.k2 * t.m }),
    same: (t, x) => x.k === t.k1 + t.k2 && x.m === t.m,
    ok: t => `${RT(t.k1 * t.k1 * t.m)} = ${t.k1}${RT(t.m)}, ${RT(t.k2 * t.k2 * t.m)} = ${t.k2}${RT(t.m)}: ${t.k1}${RT(t.m)} + ${t.k2}${RT(t.m)} = ${t.k1 + t.k2}${RT(t.m)}.`,
    wrong(t, x) {
      const ok = TYPES.simpl.ok(t), lr = t.k1 * t.k1 * t.m, kr = t.k2 * t.k2 * t.m;
      if (x.k === 1 && x.m === lr + kr)
        return bad('sumUnder', `Ты сложил числа под корнем: ${TYPES.simpl.text(t)} ≠ ${RT(lr + kr)}. Сначала вынеси множители из каждого корня, потом сложи коэффициенты. ${ok}`);
      if (x.m === t.m && x.k !== t.k1 + t.k2)
        return bad('calc', `Вынесение верное (${t.k1}${RT(t.m)} и ${t.k2}${RT(t.m)}), а коэффициенты сложены неверно: ${t.k1} + ${t.k2} = ${t.k1 + t.k2}. ${ok}`);
      return bad('calc', `Вынесем множители: ${lr} = ${t.k1}² · ${t.m}, ${kr} = ${t.k2}² · ${t.m}. ${ok}`);
    },
    key: t => `${t.k1 + t.k2}√${t.m}`,
    keyHTML: t => `${t.k1 + t.k2}${RT(t.m)}`,
    traps(t) {
      const lr = t.k1 * t.k1 * t.m, kr = t.k2 * t.k2 * t.m;
      return [{ k: 1, m: lr + kr }, { k: t.k1 * t.k2, m: t.m }]
        .filter(x => !(x.k === t.k1 + t.k2)).map(x => ({ key: `${x.k}√${x.m}`, html: `${x.k}${RT(x.m)}` }));
    },
    hints: t => ['Вынеси множители из каждого корня, потом сложи числовые коэффициенты.',
      `${RT(t.k1 * t.k1 * t.m)} = ${t.k1}${RT(t.m)}, ${RT(t.k2 * t.k2 * t.m)} = ${t.k2}${RT(t.m)}.`],
  },
  cmp: {
    input: 'choice', title: 'Сравнение чисел с корнем', options: [['<', '&lt;'], ['>', '&gt;']],
    gen: (rnd, form) => {
      form = form || pick(rnd, ['A', 'A', 'B']);
      if (form === 'B') {
        const k = int(rnd, 2, 9), m = pick(rnd, SFM), j = int(rnd, 2, 9), p = pick(rnd, SFM);
        return { form, L: { v: `${k}${RT(m)}`, sq: k * k * m, line: `${k}${RT(m)} = ${RT(k * k * m)}` },
          R: { v: `${j}${RT(p)}`, sq: j * j * p, line: `${j}${RT(p)} = ${RT(j * j * p)}` } };
      }
      const k = int(rnd, 2, 9), m = pick(rnd, SFM), n = int(rnd, 2, 80);
      return { form, L: { v: `${k}${RT(m)}`, sq: k * k * m, line: `${k}${RT(m)} = ${RT(k * k * m)}` },
        R: { v: `${RT(n)}`, sq: n, line: `${RT(n)}` } };
    },
    bad: t => t.R.sq === t.L.sq,
    text: t => `<span class="nw">${t.L.v}</span> <span class="cmpbox">?</span> <span class="nw">${t.R.v}</span>`,
    ask: t => `Сравни: ${TYPES.cmp.text(t)}`,
    sheet: t => `Сравни: <span class="nw">${t.L.v}</span> и <span class="nw">${t.R.v}</span>`,
    ans: t => t.L.sq > t.R.sq ? '>' : '<',
    answer: t => `<span class="nw">${t.L.v} ${esc(TYPES.cmp.ans(t))} ${t.R.v}</span>`,
    ok: t => `Внесём коэффициенты и сравним подкоренные числа: ${t.L.line}, ${t.R.line}. Под корнем ${t.L.sq < t.R.sq ? t.L.sq : t.R.sq} &lt; ${t.L.sq < t.R.sq ? t.R.sq : t.L.sq}, значит ${t.L.v} ${esc(TYPES.cmp.ans(t))} ${t.R.v}.`,
    wrong: t => bad('cmp', `Внеси коэффициенты под корень и сравни подкоренные числа: ${t.L.line}, ${t.R.line}. ${t.L.sq} ${t.L.sq < t.R.sq ? '&lt;' : '&gt;'} ${t.R.sq}, значит ${t.L.v} ${esc(TYPES.cmp.ans(t))} ${t.R.v}.`),
    key: t => TYPES.cmp.ans(t),
    keyHTML: t => esc(TYPES.cmp.ans(t)),
    traps: t => { const s = TYPES.cmp.ans(t), o = s === '<' ? '>' : '<'; return [{ key: o, html: esc(o) }]; },
    hints: t => ['Внеси коэффициент под корень: k√m = √(k²·m), и сравни подкоренные числа.', `${t.L.line}, ${t.R.line}.`],
  },
};

// ================= Свои виды ввода =================
// under: ученик пишет число, которое должно оказаться под корнем
// rad: ответ вида «множитель √ подкоренное число», например 6√2
const TOPIC_INPUTS = {
  under: {
    html: t => `<div class="inrow">${TYPES[t.type].text(t)} = <span class="rt"><span class="rs">√</span><span class="rad">${inp('v', 'число под корнем', '', 'numeric')}</span></span> ${checkBtn}</div>` +
      '<p class="hnote">Впиши число, которое должно стоять под корнем.</p>',
    collect: get => { const v = readInt(get('v')); return v == null ? { empty: true, msg: 'Впиши число.' } : Q(v); },
  },
  rad: {
    html: t => `<div class="inrow">${TYPES[t.type].text(t)} = ${inp('k', 'коэффициент', '', 'numeric')} <span class="rt"><span class="rs">√</span><span class="rad">${inp('m', 'под корнем', '', 'numeric')}</span></span> ${checkBtn}</div>` +
      '<p class="hnote">Запиши ответ в виде: множитель √ подкоренное число, например 6√2. Если множителя нет — оставь поле пустым.</p>',
    collect: get => {
      const kRaw = get('k').trim(), m = readInt(get('m'));
      if (!m) return { empty: true, msg: 'Впиши подкоренное число.' };
      if (!kRaw) return { k: 1, m };
      const k = readInt(kRaw);
      if (k == null) return { empty: true, msg: 'Коэффициент — целое число.' };
      return { k, m };
    },
  },
};

// ================= Типы ошибок для блока «Над чем поработать» =================
const CATS = {
  sum:      ['Корень из суммы', 'Свойство корня — только для произведения и частного: √(a·b) = √a·√b, но √(a + b) ≠ √a + √b.'],
  noRoot:   ['Забыл извлечь корень', 'Сначала вычисли подкоренное выражение, потом извлеки корень: √(49·16) = √784 = 28, а не 784.'],
  quotFrac: ['Корень из дроби', 'Сократи дробь под корнем, потом извлеки корень из числителя и из знаменателя: √(8/50) = √(4/25) = 2/5.'],
  flip:     ['Дробь перевёрнута', 'Корень из числителя делим на корень из знаменателя: √(4/25) = 2/5, а не 5/2.'],
  out:      ['Вынесение множителя', 'Разложи подкоренное число на квадрат и второй множитель: √72 = √(36·2) = 6√2.'],
  part:     ['Корень вынесен не до конца', 'После вынесения поищи квадрат во втором множителе: √32 = 2√8 = 2√(4·2) = 4√2.'],
  in:       ['Внесение множителя', 'Коэффициент вносится в квадрате: 3√5 = √(9·5) = √45.'],
  sumUnder: ['Подкоренные сложены', '√12 + √75 ≠ √87: сначала вынеси множители (√12 = 2√3, √75 = 5√3), потом сложи коэффициенты: 7√3.'],
  cmp:      ['Сравнение чисел с корнем', 'Внеси коэффициенты под корень и сравни подкоренные числа: 2√5 = √20 &gt; √18.'],
  calc:     ['Вычисления', 'Проверяй ответ возведением в квадрат.'],
};

// ================= Разделы тренажёра =================
const SECTIONS = [
  { title: 'Раздел 1', text: 'Корень из произведения и частного', types: ['prod', 'quot'], ex: () => `√(8 · 2) = ?` },
  { title: 'Раздел 2', text: 'Вынесение и внесение множителя', types: ['out', 'in'], ex: () => `${RT(72)} = ?` },
  { title: 'Раздел 3', text: 'Упрощение и сравнение', types: ['simpl', 'cmp'], ex: () => `2√7 <span class="cmpbox">?</span> √30` },
];

// ================= Раздатка =================
// Состав варианта: верные ответы складываются в слово из 8 разных букв
const KINDS_V1 = [
  ['prod', 'sq'], ['prod', 'fold'], ['quot', 'divide'], ['quot', 'reduce'],
  ['out'], ['in', ['fold', 'irr']], ['simpl'], ['cmp'],
];
const WORDS_V1 = ['ГВОЗДИКА', 'МАГНОЛИЯ', 'КОСТЮМЕР', 'ЖИВОТНЫЙ', 'ЛАМПОВЫЙ'];
const PRINT = {
  instr: `Используй свойства: √(a·b) = √a·√b и √a/√b = √(a/b). В заданиях 5 и 7 запиши ответ в виде:
    множитель перед корнем и подкоренное число, например 6√2. В задании 8 поставь знак &lt; или &gt;.
    Найди ответ в таблице букв и впиши букву — получится слово. Нет ответа в таблице или слово не сложилось — ищи ошибку.`,
  about: 'В каждом варианте 8 заданий: корень из произведения (два вида), корень из частного (два вида), вынесение множителя, внесение под корень, упрощение суммы корней и сравнение. Верные ответы складываются в слово.',
  ogeAbout: 'В бланке 8 заданий с кратким ответом, как в ОГЭ: корень из произведения и частного, произведение корня и числа, выражение с десятичной дробью под корнем, выбор наибольшего и наименьшего из чисел с корнями. Ответ — число, оно вписывается в клеточки бланка.',
};
// Бланк ОГЭ: задания с ответом-числом (зерна 200+), поэтому один номер даёт разные листы
const OGE_V1 = ['prodF', 'prodS', 'quotD', 'quotR', 'coef', 'maxBig', 'maxSmall', 'prodDec'];
function ogeTask(kind, rnd) {
  const value = s => `Найдите значение выражения <span class="nw">${s}.</span>`;
  if (kind === 'prodF' || kind === 'prodS' || kind === 'quotD') {
    const T = kind === 'quotD' ? 'quot' : 'prod';
    const t = generate(T, rnd, kind === 'prodF' ? 'fold' : kind === 'prodS' ? 'sq' : 'divide');
    return { kind, t, ask: value(TYPES[T].text(t)), ans: TYPES[T].key(t) };
  }
  if (kind === 'quotR') {   // дробь под корнем: ответ — конечная десятичная дробь
    const t = generate('quot', rnd, 'reduce');
    return { kind, t, ask: value(TYPES.quot.text(t)), ans: decStr(Q(t.p, t.q)) };
  }
  if (kind === 'coef') {    // k√m · √m = k·m — целое число
    const t = { k: int(rnd, 2, 9), m: pick(rnd, SFM) };
    return { kind, t, ask: value(`${t.k}${RT(t.m)} · ${RT(t.m)}`), ans: String(t.k * t.m) };
  }
  if (kind === 'maxBig' || kind === 'maxSmall') {
    for (;;) {
      const k = int(rnd, 4, 12);
      const sqs = shuffle(rnd, [k * k, k * k + int(rnd, 1, 2 * k), k * k - int(rnd, 1, 2 * k - 2), (k - 1) ** 2 + int(rnd, 1, 2 * k - 2)]);
      if (new Set(sqs).size < 4) continue;
      const show = s => { for (let j = 6; j >= 2; j--) if (s % (j * j) === 0 && s !== j * j) return `${j}${RT(s / (j * j))}`; return isqrt(s) != null ? String(isqrt(s)) : RT(s); };
      const i = kind === 'maxBig' ? sqs.indexOf(Math.max(...sqs)) : sqs.indexOf(Math.min(...sqs));
      return { kind, t: { sqs }, ans: String(i + 1),
        ask: `Какое из чисел ${kind === 'maxBig' ? 'наибольшее' : 'наименьшее'}? ${sqs.map((s, j) => `<span class="nw">${j + 1}) ${show(s)}</span>`).join('; ')}. В ответ запишите номер этого числа.` };
    }
  }
  if (kind === 'prodDec') { // √(j²/100 · m²) = (j/10)·m — конечная десятичная дробь
    const j = int(rnd, 2, 9), m = int(rnd, 2, 9);
    return { kind, t: { j, m }, ask: value(RT(`${D(Q(j * j, 100))} · ${m * m}`)), ans: decStr(Q(j * m, 10)) };
  }
}

// ================= На доске =================
// Пример для показа: random = false — числа из CONFIG.board, true — «Другие числа» (old — прошлый пример)
function boardExample(random, old) {
  const C = CONFIG.board;
  if (!random) return { rects: C.rects, sq: C.sq, irr: C.irr, quot: C.quot, fracq: C.fracq, neg: C.neg, out: C.out, ins: C.ins, cmp: C.cmp };
  const rnd = mulberry32((Math.random() * 4294967296) >>> 0);
  const other = (prev, arr) => { let v; do v = pick(rnd, arr); while (JSON.stringify(v) === JSON.stringify(prev)); return v; };
  return {
    rects: other(old.rects, [{ a: 9, b: 4 }, { a: 16, b: 25 }, { a: 9, b: 16 }, { a: 25, b: 4 }, { a: 36, b: 25 }, { a: 16, b: 9 }, { a: 25, b: 16 }, { a: 49, b: 4 }]),
    sq: other(old.sq, [[49, 16], [36, 25], [16, 9], [25, 49], [64, 16], [36, 49], [16, 64], [81, 16], [25, 36]]),
    irr: other(old.irr, [[8, 2], [12, 3], [5, 20], [6, 24], [3, 27], [2, 18], [7, 28], [8, 32], [2, 50]]),
    quot: other(old.quot, [[18, 2], [45, 5], [32, 2], [27, 3], [50, 2], [75, 3], [98, 2], [24, 6], [200, 8]]),
    fracq: other(old.fracq, [[8, 50], [18, 50], [2, 50], [12, 48], [50, 8], [128, 32]]),
    neg: other(old.neg, [[4, 9], [9, 4], [5, 8], [7, 2]]),
    out: other(old.out, OUTQ.map(([n]) => n)),
    ins: other(old.ins, [[3, 8], [2, 5], [4, 3], [5, 2], [3, 11], [2, 6], [6, 2], [4, 5]]),
    cmp: other(old.cmp, [[2, 7, 30], [3, 5, 50], [2, 11, 46], [4, 3, 50], [3, 6, 56], [2, 5, 21]]),
  };
}
function buildSteps(e) {
  const { a, b } = e.rects;                 // √(a·b): a и b — квадраты
  const ka = isqrt(a), kb = isqrt(b), kw = ka * kb;
  const [A, B] = e.sq;                      // оба множителя — квадраты
  const kA = isqrt(A), kB = isqrt(B);
  const [ia, ib] = e.irr;                   // √ia·√ib = √(ia·ib) — целое
  const [qa, qb] = e.quot;                  // √qa/√qb = √(qa/qb)
  const [fa, fb, fp, fq] = REDU.find(l => l[0] === e.fracq[0] && l[1] === e.fracq[1]) || [8, 50, 2, 5];
  const [na, nb] = e.neg;                   // ловушка отрицательных множителей
  const [n, ok, om] = OUTQ.find(l => l[0] === e.out) || [72, 6, 2];
  const [ik, im] = e.ins;                   // внесение: ik√im = √(ik²·im)
  const [ck, cm, cn] = e.cmp;               // сравнение: ck√cm vs √cn
  const steps = [];
  // 1. Повторение: корень — сторона квадрата
  steps.push({
    q: `Какая сторона у квадрата площадью ${a * b}?`,
    a: `${kw}: ${kw}² = ${kw * kw} = ${a * b}.`,
    note: 'Повторение первого материала: корень — это сторона квадрата с данной площадью. Сторону пусть назовёт класс.',
    draw: ph => {
      const c = Math.min(26, Math.floor(240 / kw)), size = kw * c, x = 170, y = 70;
      let s = grid(x, y, kw, kw, c, 'gs');
      s += under(x, y + size, size, `S = ${a * b}`, 'warm');
      s += ph ? `<g class="new">${tx(x + size / 2, y - 24, `сторона ${sr(String(kw))} = ${kw}`, 'lab acc')}</g>` : tx(x + size / 2, y - 24, 'сторона ?', 'lab warm');
      if (ph) s += `<g class="new">${tx(x + size + 130, y + size / 2 + 40, `${sr(String(a * b))} = ${kw}`, 'lab acc')}</g>`;
      return s;
    },
    rec: ph => ph ? [`${RT(a * b)} = ${kw}`] : [],
  });
  // 2. Свойство на примере: √(a·b) = √a·√b
  steps.push({
    q: `${a * b} — это ещё и ${a} · ${b}. Чему равен ${sr(`${a}·${b}`)} по-другому?`,
    a: `${sr(`${a}·${b}`)} = ${sr(String(a))} · ${sr(String(b))} = ${ka} · ${kb} — тот же ответ!`,
    note: `Стороны малых квадратов: ${RT(a)} = ${ka} и ${RT(b)} = ${kb}. Сторона большого — их произведение: ${ka}·${kb} = ${kw}. Проверка: ${kw}² = ${kw * kw} = ${a}·${b}.`,
    draw: ph => {
      const c = Math.min(24, Math.floor(200 / kw)), xA = 130, yA = 168, sA = ka * c, xB = xA + sA + 70, yB = yA + sA - kb * c, sB = kb * c;
      const xC = xB + sB + 90, yC = 88, sC = kw * c;
      let s = grid(xA, yA, ka, ka, c, 'gs') + under(xA, yA + sA, sA, ph ? `${sr(String(a))} = ${ka}` : 'сторона ?', 'warm');
      s += grid(xB, yB, kb, kb, c, 'gw') + under(xB, yB + sB, sB, ph ? `${sr(String(b))} = ${kb}` : 'сторона ?', 'warm');
      s += grid(xC, yC, kw, kw, c, 'ge') + tx(xC + sC / 2, yC - 24, sr(`${a} · ${b}`), 'lab acc') +
        under(xC, yC + sC, sC, ph ? `сторона ${kw}` : 'сторона ?', 'warm');
      if (ph) s += `<g class="new">${tx(xC + sC + 120, yC + 60, `${sr(`${a}·${b}`)} = ${sr(String(a))} · ${sr(String(b))}`, 'lab s acc', 'start')}` +
        `${tx(xC + sC + 120, yC + 130, `${ka} · ${kb} = ${kw}`, 'lab s acc', 'start')}</g>`;
      return s;
    },
    rec: ph => ph ? [`${RT(`${a}·${b}`)} = ${RT(a)} · ${RT(b)} = ${ka} · ${kb} = ${kw}`] : [],
  });
  // 3. Формулировка свойства
  steps.push({
    q: 'Сформулируй правило для корня из произведения.',
    a: `При <i>a</i> ≥ 0 и <i>b</i> ≥ 0: ${RT('<i>a</i>·<i>b</i>')} = ${RT('<i>a</i>')} · ${RT('<i>b</i>')}.`,
    note: 'Свойство корня из произведения. Условие важно: под каждым корнем — неотрицательное число. Обратное тоже верно: √a·√b = √(a·b).',
    draw: () => '',
    rec: ph => ph ? [`${RT('<i>a</i>·<i>b</i>')} = ${RT('<i>a</i>')} · ${RT('<i>b</i>')} при <i>a</i>, <i>b</i> ≥ 0`] : [],
  });
  // 4. Проверка на других числах: оба множителя — квадраты
  steps.push({
    q: `Проверь по правилу: ${RT(`${A} · ${B}`)} = ?`,
    a: `${RT(A)} · ${RT(B)} = ${kA} · ${kB} = ${kA * kB}. Проверка возведением в квадрат: (${kA} · ${kB})² = ${kA * kB}² = ${(kA * kB) ** 2} = ${A} · ${B}.`,
    note: `Пусть класс решит сам. Проверка возведением: ${kA * kB}² = ${(kA * kB) ** 2} = ${A}·${B}.`,
    draw: () => '',
    rec: ph => ph ? [`${RT(`${A}·${B}`)} = ${kA} · ${kB} = ${kA * kB}`] : [],
  });
  // 5. Множители — не квадраты: произведение корней в один корень
  steps.push({
    q: `А тут корни не извлекаются: ${RT(ia)} · ${RT(ib)}?`,
    a: `${RT(ia)} · ${RT(ib)} = ${RT(`${ia}·${ib}`)} = ${isqrt(ia * ib)}.`,
    note: 'Свойство и в обратную сторону: произведение корней — корень из произведения. Отдельно корни не извлекаются, а произведение под корнем — квадрат.',
    draw: () => '',
    rec: ph => ph ? [`${RT(ia)} · ${RT(ib)} = ${RT(ia * ib)} = ${isqrt(ia * ib)}`] : [],
  });
  // 6. Частное: корень из дроби
  steps.push({
    q: `А как быть с делением: ${F({ n: RT(qa), d: RT(qb) })} = ?`,
    a: `${qa} : ${qb} = ${qa / qb}, ${RT(qa / qb)} = ${isqrt(qa / qb)}.`,
    note: `Свойство корня из частного: корень из числителя делить на корень из знаменателя — корень из всей дроби: ${RT(qa)} / ${RT(qb)} = ${RT(`${qa} : ${qb}`)}.`,
    draw: () => '',
    rec: ph => ph ? [`${RT(qa)} / ${RT(qb)} = ${RT(`${qa} : ${qb}`)} = ${isqrt(qa / qb)}`] : [],
  });
  // 7. Дробь под корнем: сначала сократить
  steps.push({
    q: `Как вычислить ${RT(F({ n: fa, d: fb }), true)}?`,
    a: `Сократим: ${fa}/${fb} = ${fp * fp}/${fq * fq}, значит ${RT(F({ n: fa, d: fb }), true)} = ${F({ n: fp, d: fq })}.`,
    note: `Подкоренную дробь часто быстрее сократить: ${fa}/${fb} = ${fp * fp}/${fq * fq}, потом извлечь корень из числителя и из знаменателя.`,
    draw: () => '',
    rec: ph => ph ? [`${RT(F({ n: fa, d: fb }), true)} = ${RT(F({ n: fp * fp, d: fq * fq }), true)} = ${F({ n: fp, d: fq })}`] : [],
  });
  // 8. Ловушка: отрицательные множители
  steps.push({
    q: `${RT(`${MINUS}${na}`)} · ${RT(`${MINUS}${nb}`)} = ${na * nb}?`,
    a: `Нет: под каждым корнем — отрицательное число, оба выражения не имеют смысла. Свойство — только при <i>a</i>, <i>b</i> ≥ 0.`,
    note: `Главная ловушка темы. Произведение ${na * nb} положительное, но каждый корень не существует. Свойство применять нельзя: a ≥ 0 и b ≥ 0 — обязательное условие.`,
    draw: () => '',
    rec: ph => ph ? [`${RT(`${MINUS}${na}`)} и ${RT(`${MINUS}${nb}`)} — не имеют смысла`, `условие: <i>a</i> ≥ 0, <i>b</i> ≥ 0`] : [],
  });
  // 9. Вынесение множителя
  steps.push({
    q: `Как упростить ${RT(n)}?`,
    a: `${n} = ${ok * ok} · ${om}, значит ${RT(n)} = ${ok}${RT(om)}.`,
    note: `Вынесение множителя: найди наибольший квадратный множитель. Проверка: (${ok}${RT(om)})² = ${ok * ok} · ${om} = ${n}.`,
    draw: () => '',
    rec: ph => ph ? [`${RT(n)} = ${RT(`${ok * ok}·${om}`)} = ${ok}${RT(om)}`] : [],
  });
  // 10. Внесение множителя
  steps.push({
    q: `А если наоборот: ${ik}${RT(im)} = √${ik * ik * im}?`,
    a: `${ik}${RT(im)} = ${RT(`${ik * ik}·${im}`)} = ${RT(ik * ik * im)}.`,
    note: `Внесение множителя — наоборот: коэффициент вносится в квадрате. ${ik * ik * im === n ? `И это то же число, что и в прошлом шаге: ${ik}${RT(im)} = ${RT(n)} = ${ok}${RT(om)}!` : ''}`,
    draw: () => '',
    rec: ph => ph ? [`${ik}${RT(im)} = ${RT(ik * ik * im)}`] : [],
  });
  // 11. Сравнение: внесли — и сравнили подкоренные
  steps.push({
    q: `Что больше: ${ck}${RT(cm)} или ${RT(cn)}?`,
    a: `${ck}${RT(cm)} = ${RT(ck * ck * cm)}, а ${RT(cn)} = ${RT(cn)}. Подкоренные числа: ${ck * ck * cm} ${ck * ck * cm < cn ? '&lt;' : '&gt;'} ${cn}, значит ${ck}${RT(cm)} ${ck * ck * cm < cn ? 'меньше' : 'больше'}.`,
    note: `Внесение помогает сравнивать: ${ck}${RT(cm)} = ${RT(ck * ck * cm)}. Сравниваем подкоренные числа: ${ck * ck * cm} ${ck * ck * cm < cn ? '<' : '>'} ${cn}.`,
    draw: () => '',
    rec: ph => ph ? [`${ck}${RT(cm)} = ${RT(ck * ck * cm)}`, `${ck * ck * cm} ${ck * ck * cm < cn ? '&lt;' : '&gt;'} ${cn}`] : [],
  });
  // 12. Итог
  steps.push({
    q: 'Что нужно запомнить?',
    a: `<ul><li>${RT('<i>a</i>·<i>b</i>')} = ${RT('<i>a</i>')} · ${RT('<i>b</i>')}, ${F({ n: RT('<i>a</i>'), d: RT('<i>b</i>') })} = ${RT('<i>a</i>/<i>b</i>')} — при <i>a</i>, <i>b</i> ≥ 0.</li><li>Вынесение: ${RT(n)} = ${ok}${RT(om)}. Внесение: ${ik}${RT(im)} = ${RT(ik * ik * im)}.</li></ul>`,
    note: 'Пусть класс сам сформулирует правило по записи в тетради, потом откройте ответ.',
    draw: () => '',
    rec: () => [`${RT('<i>a</i>·<i>b</i>')} = ${RT('<i>a</i>')} · ${RT('<i>b</i>')}`, `вынесение: ${RT(n)} = ${ok}${RT(om)}`],
  });
  return steps;
}
// превью на сайте крутит шаги 0–8; картинка-превью — шаг 2 «свойство» с показанным ответом
const BOARD = { previewUntil: 8, poster: 1 };

// Формулы в справке (help.html): ядро вызывает helpInit() при запуске
function helpInit() {
  $('helpMul').innerHTML = `${RT('<i>a</i>·<i>b</i>')} = ${RT('<i>a</i>')} · ${RT('<i>b</i>')}`;
  $('helpDiv').innerHTML = `${F({ n: RT('<i>a</i>'), d: RT('<i>b</i>') })} = ${RT('<i>a</i>/<i>b</i>')}`;
  $('helpCond').innerHTML = `при <i>a</i>, <i>b</i> ≥ 0`;
  $('helpCond2').innerHTML = `при <i>a</i> ≥ 0, <i>b</i> &gt; 0`;
  $('helpEx1').innerHTML = `${RT(49)} · ${RT(16)} = 7 · 4 = 28`;
  $('helpEx2').innerHTML = `${RT(8)} · ${RT(18)} = ${RT(8 * 18)} = ${RT(144)} = 12`;
  $('helpEx3').innerHTML = `${RT(F({ n: 8, d: 50 }), true)} = ${RT(F({ n: 4, d: 25 }), true)} = ${F({ n: 2, d: 5 })}`;
  $('helpEx4').innerHTML = `${RT(MINUS + '4')} и ${RT(MINUS + '9')}`;
  $('helpOut').innerHTML = `${RT(72)} = ${RT('36 · 2')} = 6${RT(2)}`;
  $('helpIn').innerHTML = `3${RT(8)} = ${RT('9 · 8')} = ${RT(72)}`;
  $('helpSimpl').innerHTML = `${RT(12)} + ${RT(75)} = 2${RT(3)} + 5${RT(3)} = 7${RT(3)}`;
  $('helpCmp').innerHTML = `2${RT(7)} = ${RT(28)} &gt; ${RT(18)}`;
}
