// Тема «Арифметический квадратный корень» (8 класс, Макарычев). Только содержание — каркас даёт ядро (core/).
// Что тема обязана задать — ИНСТРУКЦИЯ.md, раздел «Из чего состоит тема».
// ================= Параметры: учитель может поменять их за минуту =================
const CONFIG = {
  maxRoot: 20,              // таблица квадратов в заданиях: до 20²
  board: {
    side: 5,                // первый пример: квадрат площадью 25
    trap: 4,                // ловушка «√16 = ±4» и график x² = 16
    neg: 9,                 // «существует ли √(−9)»
    dec: 6,                 // площадь 0,36 — сторона 0,6 (в десятых)
    frac: [5, 3],           // √(2 7/9) = 5/3: сторона 5 клеток, единица — 3 клетки
    approx: 2,              // оценка √2 между целыми, десятыми и сотыми
    triple: [3, 4, 5],      // ловушка √(9 + 16) ≠ 3 + 4
    previewDelay: 1700,     // превью на сайте: пауза между шагами, мс
  },
  print: {
    variants: 25,           // сколько вариантов печатать по умолчанию
    traps: 2,               // сколько ответов-ловушек на задание в таблице букв
    space: true,            // сетка для решения под каждым заданием
  },
  home: {
    round: 10,              // заданий в тренировке
    points: [10, 15, 15, 15],   // очки за задание по разделам
    hintPenalty: 3,         // штраф за подсказку
    maxMultiplier: 3,       // множитель за серию: +1 за каждые 3 задания подряд без ошибок
  },
};
// Версия генератора — первая часть номера варианта «1-4817». Изменил генератор или состав
// заданий раздатки — увеличь версию и оставь старую ветку, пока на неё есть напечатанные листы.
const GEN_VERSION = 1;

// ================= Типы заданий =================
// input: num — число, frac — дробь, choice — выбор, eq — корни уравнения, est — два числа.
// text — запись задания, ask — вопрос в тренажёре, ans — ответ, same — верен ли ответ,
// wrong — объяснение ошибки {cat, msg}, ok — короткое объяснение верного ответа,
// key/keyHTML — ответ для ключа и таблицы букв, traps — ответы-ловушки, hints — две подсказки.
const bad = (cat, msg) => ({ cat, msg });
const yesNo = [['yes', 'Имеет смысл'], ['no', 'Не имеет смысла']];

const TYPES = {
  table: {
    input: 'num', title: 'Корень из числа',
    gen: rnd => ({ k: int(rnd, 2, CONFIG.maxRoot) }),
    text: t => RT(t.k * t.k),
    ans: t => Q(t.k),
    ok: t => `${RT(t.k * t.k)} = ${t.k}, так как ${t.k} ≥ 0 и ${t.k}² = ${t.k * t.k}.`,
    wrong(t, v) {
      const a = t.k * t.k;
      if (qeq(v, Q(-t.k))) return bad('sign', `Арифметический корень не бывает отрицательным: ${RT(a)} = ${t.k}. Число ${MINUS}${t.k} в квадрате тоже даёт ${a}, но это второй корень уравнения ${X}² = ${a}, а не значение ${RT(a)}.`);
      if (qeq(v, Q(a, 2))) return bad('calc', `Корень — это не половина числа: ${htmlQ(v)}² = ${sq2(v)}. Ищем число, квадрат которого равен ${a}: ${t.k}² = ${a}, значит ${RT(a)} = ${t.k}.`);
      return bad('calc', `Проверим возведением в квадрат: ${htmlQ(v)}² = ${sq2(v)}, а под корнем ${a}. ${t.k}² = ${a}, значит ${RT(a)} = ${t.k}.`);
    },
    hints: t => [`Какое неотрицательное число в квадрате даёт ${t.k * t.k}? Вспомни таблицу квадратов.`,
      `${t.k - 1}² = ${(t.k - 1) ** 2}, ${t.k + 1}² = ${(t.k + 1) ** 2}. Ответ — между ${t.k - 1} и ${t.k + 1}.`],
  },
  dec: {
    input: 'num', title: 'Корень из десятичной дроби',
    // root = k / 10^m, под корнем root²: 0,09, 1,44, 0,0049
    gen: rnd => ({ k: int(rnd, 1, 19), m: rnd() < 0.55 ? 1 : 2 }),
    bad: t => t.k % 10 === 0,
    root: t => Q(t.k, 10 ** t.m),
    text: t => RT(D(qmul(TYPES.dec.root(t), TYPES.dec.root(t)))),
    ans: t => TYPES.dec.root(t),
    ok: t => { const r = TYPES.dec.root(t); return `${TYPES.dec.text(t)} = ${D(r)}, так как ${D(r)}² = ${sq2(r)}.`; },
    wrong(t, v) {
      const r = TYPES.dec.root(t), a = qmul(r, r), s = qmul(v, v);
      if (qeq(v, qneg(r))) return bad('sign', `Арифметический корень не бывает отрицательным: ${RT(D(a))} = ${D(r)}.`);
      if (qeq(s, qmul(a, Q(100))) || qeq(s, qmul(a, Q(1, 100))))
        return bad('decimal', `Запятая не на месте: ${htmlQ(v)}² = ${sq2(v)}, а не ${D(a)}. В квадрате десятичной дроби знаков после запятой вдвое больше: ${D(r)}² = ${D(a)}, значит ${RT(D(a))} = ${D(r)}.`);
      return bad('calc', `Проверим возведением в квадрат: ${htmlQ(v)}² = ${sq2(v)}, а под корнем ${D(a)}. ${D(r)}² = ${D(a)}, значит ${RT(D(a))} = ${D(r)}.`);
    },
    key: t => keyQ(TYPES.dec.root(t)),
    traps: t => { const r = TYPES.dec.root(t); return [qmul(r, Q(1, 10)), qmul(r, Q(10))].map(x => ({ key: keyQ(x), html: htmlQ(x) })); },
    hints: t => {
      const a = qmul(TYPES.dec.root(t), TYPES.dec.root(t)), digits = 2 * t.m;
      return [`Сколько знаков после запятой у ${D(a)}? У корня их вдвое меньше: ${t.m}.`,
        `Без запятой под корнем ${t.k * t.k}, а ${RT(t.k * t.k)} = ${t.k}. Теперь отдели запятой ${t.m} ${plural(t.m, 'знак', 'знака', 'знаков')} (под корнем их ${digits}).`];
    },
  },
  fraction: {
    input: 'frac', title: 'Корень из дроби',
    // simple: √(p²/q²); mixed: √ из смешанного числа r²/q²
    gen: (rnd, form) => {
      const mixed = form ? form === 'mixed' : rnd() < 0.5;
      if (mixed) { const q = int(rnd, 2, 6); return { mixed, q, p: int(rnd, q + 1, 3 * q) }; }
      return { mixed, q: int(rnd, 2, 12), p: int(rnd, 1, 15) };
    },
    bad: t => gcd(t.p, t.q) !== 1 || (!t.mixed && t.p >= t.q && t.p > 2 * t.q),
    under: t => Q(t.p * t.p, t.q * t.q),
    text: t => { const a = TYPES.fraction.under(t); return RT(t.mixed ? M(toMixed(a)) : F(a), true); },
    ans: t => Q(t.p, t.q),
    ok: t => { const a = TYPES.fraction.under(t), r = Q(t.p, t.q);
      return `${t.mixed ? `${M(toMixed(a))} = ${F(a)}, ` : ''}${RT(F(a), true)} = ${htmlQ(r, 'frac')}, так как ${F(r)}² = ${F(a)}.`; },
    wrong(t, v) {
      const a = TYPES.fraction.under(t), r = Q(t.p, t.q);
      const conv = t.mixed ? `Сначала переведём в неправильную дробь: ${M(toMixed(a))} = ${F(a)}. ` : '';
      const tail = `${F(r)}² = ${F(a)}, значит ${RT(F(a), true)} = ${htmlQ(r, 'frac')}.`;
      if (qeq(v, qneg(r))) return bad('sign', `Арифметический корень не бывает отрицательным. ${tail}`);
      const sep = TYPES.fraction.sep(t);
      if (sep && qeq(v, sep)) {
        const m = toMixed(a);
        return bad('frac', `Ты извлёк корень отдельно из целой части и из дроби. Но ${M(m)} = ${m.w} + ${F({ n: m.n, d: m.d })}, а корень из суммы не равен сумме корней. ${conv}${tail}`);
      }
      if (qeq(v, Q(t.p, t.q * t.q)) || qeq(v, Q(t.p * t.p, t.q)))
        return bad('frac', `Корень нужно извлечь и из числителя, и из знаменателя: ${conv}${F(r)}² = ${F({ n: t.p * t.p, d: t.q * t.q })}, значит ${RT(F(a), true)} = ${htmlQ(r, 'frac')}.`);
      return bad('calc', `Проверим возведением в квадрат: (${htmlQ(v, 'frac')})² = ${htmlQ(qmul(v, v), 'frac')}, а под корнем ${htmlQ(a, 'frac')}. ${conv}${tail}`);
    },
    // ошибка «корень отдельно из целой части и из дроби» — когда оба корня извлекаются
    sep: t => {
      if (!t.mixed) return null;
      const m = toMixed(TYPES.fraction.under(t)), w = isqrt(m.w), n = isqrt(m.n), d = isqrt(m.d);
      return w != null && n != null && d != null ? qadd(Q(w), Q(n, d)) : null;
    },
    key: t => keyQ(Q(t.p, t.q), 'frac'),
    keyHTML: t => htmlQ(Q(t.p, t.q), 'frac'),
    traps: t => [TYPES.fraction.sep(t), Q(t.p, t.q * t.q), Q(t.p * t.p, t.q)].filter(Boolean)
      .map(x => ({ key: keyQ(x, 'frac'), html: htmlQ(x, 'frac') })),
    hints: t => { const a = TYPES.fraction.under(t);
      return [t.mixed ? `Переведи смешанное число в неправильную дробь: ${M(toMixed(a))} = ${F({ n: '?', d: a.d })}.` : `Найди корень из числителя и корень из знаменателя.`,
        `${RT(F(a), true)}: ${RT(a.n)} = ${t.p}, ${RT(a.d)} = ${t.q}.`]; },
  },
  meaning: {
    input: 'choice', title: 'Имеет ли смысл выражение', options: yesNo,
    ask: t => `Имеет ли смысл выражение ${TYPES.meaning.text(t)}?`,
    answer: t => TYPES.meaning.ans(t) === 'yes' ? 'имеет смысл' : 'не имеет смысла',
    gen: rnd => {
      const form = pick(rnd, ['neg', 'out', 'sqneg', 'negsq', 'diff']);
      const m = int(rnd, 2, 25), p = int(rnd, 2, 40), q = int(rnd, 2, 40);
      return { form, m, p, q };
    },
    bad: t => t.form === 'diff' && t.p === t.q,
    text: t => ({
      neg: RT(`${MINUS}${t.m}`), out: `${MINUS}${RT(t.m)}`, sqneg: RT(`(${MINUS}${t.m})²`),
      negsq: RT(`${MINUS}${t.m}²`), diff: RT(`${t.p} ${MINUS} ${t.q}`),
    })[t.form],
    under: t => ({ neg: -t.m, out: t.m, sqneg: t.m * t.m, negsq: -t.m * t.m, diff: t.p - t.q })[t.form],
    ans: t => TYPES.meaning.under(t) >= 0 ? 'yes' : 'no',
    why(t) {
      const u = TYPES.meaning.under(t), us = (u < 0 ? MINUS : '') + Math.abs(u);
      const calc = { neg: '', out: `Под корнем ${t.m} ≥ 0, а минус стоит перед корнем: ${MINUS}${RT(t.m)} — это число, противоположное ${RT(t.m)}. `,
        sqneg: `(${MINUS}${t.m})² = ${t.m * t.m}: квадрат отрицательного числа положителен. `,
        negsq: `${MINUS}${t.m}² = ${MINUS}(${t.m}²) = ${us}: в квадрат возводится только ${t.m}, минус остаётся. `,
        diff: `${t.p} ${MINUS} ${t.q} = ${us}. ` }[t.form];
      return calc + (u >= 0 ? `Под корнем ${us} ≥ 0 — выражение имеет смысл.` : `Под корнем ${us} &lt; 0, а квадрат любого числа неотрицателен — выражение не имеет смысла.`);
    },
    ok: t => TYPES.meaning.why(t),
    wrong: t => bad('meaning', TYPES.meaning.why(t)),
    hints: t => [`Вычисли, какое число стоит под знаком корня. Корень из отрицательного числа не существует.`,
      `Под корнем ${(TYPES.meaning.under(t) < 0 ? MINUS : '') + Math.abs(TYPES.meaning.under(t))}.`],
  },
  square: {
    input: 'num', title: 'Квадрат корня',
    gen: rnd => ({ form: pick(rnd, ['A', 'B', 'C', 'D']), a: int(rnd, 2, 99), k: int(rnd, 2, 6), b: int(rnd, 2, 11), m: int(rnd, 2, 20) }),
    bad: t => isqrt(t.a) != null || isqrt(t.b) != null,
    text: t => ({ A: `(${RT(t.a)})²`, B: `(${MINUS}${RT(t.a)})²`, C: `(${t.k}${RT(t.b)})²`, D: RT(`(${MINUS}${t.m})²`) })[t.form],
    ans: t => Q({ A: t.a, B: t.a, C: t.k * t.k * t.b, D: t.m }[t.form]),
    ok: t => ({
      A: `По определению (${RT('<i>a</i>')})² = <i>a</i>: ${TYPES.square.text(t)} = ${t.a}.`,
      B: `Квадрат отрицательного числа положителен: (${MINUS}${RT(t.a)})² = (${RT(t.a)})² = ${t.a}.`,
      C: `В квадрат возводится каждый множитель: (${t.k}${RT(t.b)})² = ${t.k}² · (${RT(t.b)})² = ${t.k * t.k} · ${t.b} = ${t.k * t.k * t.b}.`,
      D: `(${MINUS}${t.m})² = ${t.m * t.m}, ${RT(t.m * t.m)} = ${t.m}.`,
    })[t.form],
    wrong(t, v) {
      const ok = TYPES.square.ok(t), f = t.form;
      if (f === 'A' && qeq(v, Q(t.a * t.a))) return bad('square', `${RT(t.a)} — это число, квадрат которого равен ${t.a}. Поэтому (${RT(t.a)})² = ${t.a}, а не ${t.a}².`);
      if (f === 'B' && qeq(v, Q(-t.a))) return bad('square', ok);
      if (f === 'C' && qeq(v, Q(t.k * t.b))) return bad('square', `Множитель ${t.k} тоже нужно возвести в квадрат. ${ok}`);
      if (f === 'D' && qeq(v, Q(-t.m))) return bad('sign', `Арифметический корень не бывает отрицательным. ${ok}`);
      if (f === 'D' && qeq(v, Q(t.m * t.m))) return bad('square', `Это значение подкоренного выражения, а нужен корень из него. ${ok}`);
      return bad('square', ok);
    },
    key: t => keyQ(TYPES.square.ans(t)),
    traps: t => ({ A: [t.a * t.a], B: [-t.a], C: [t.k * t.b, 2 * t.k * t.b], D: [-t.m, t.m * t.m] })[t.form]
      .map(n => ({ key: keyQ(Q(n)), html: htmlQ(Q(n)) })),
    hints: t => [`Вспомни: (${RT('<i>a</i>')})² = <i>a</i> — по определению корня.`,
      ({ A: `Квадрат корня из ${t.a} равен ${t.a}.`, B: `(${MINUS}${RT(t.a)})² = (${RT(t.a)})².`, C: `(${t.k}${RT(t.b)})² = ${t.k}² · (${RT(t.b)})².`, D: `Сначала вычисли (${MINUS}${t.m})².` })[t.form]],
  },
  expr: {
    input: 'num', title: 'Значение выражения',
    // c₁√A ± c₂√B: коэффициенты — целые, десятичные или дроби вида 1/n, корни — целые или десятые
    gen: rnd => {
      const coef = () => pick(rnd, [Q(1), Q(2), Q(3), Q(4), Q(5), Q(10), Q(1, 10), Q(1, 5), Q(1, 2), Q(1, 3), Q(1, 4), Q(1, 6)]);
      const root = () => rnd() < 0.5 ? Q(int(rnd, 2, 12)) : Q(int(rnd, 1, 9), 10);
      return { c1: coef(), s1: root(), c2: coef(), s2: root(), op: rnd() < 0.6 ? '+' : MINUS };
    },
    bad: t => {
      const p1 = qmul(t.c1, t.s1), p2 = qmul(t.c2, t.s2), r = TYPES.expr.ans(t);
      const hundredths = x => 100 % x.d === 0;   // не больше двух знаков после запятой
      return r.n <= 0 || !hundredths(p1) || !hundredths(p2) || !hundredths(r) || (t.s1.d === 1 && t.s2.d === 1) || qeq(t.s1, t.s2);
    },
    coef: c => qeq(c, Q(1)) ? '' : htmlQ(c, c.d === 3 || c.d === 4 || c.d === 6 ? 'frac' : 'dec'),
    text: t => { const E = TYPES.expr; return `${E.coef(t.c1)}${RT(D(qmul(t.s1, t.s1)))} ${t.op} ${E.coef(t.c2)}${RT(D(qmul(t.s2, t.s2)))}`; },
    ans: t => (t.op === '+' ? qadd : qsub)(qmul(t.c1, t.s1), qmul(t.c2, t.s2)),
    calc(t, s1 = t.s1, s2 = t.s2) {
      const E = TYPES.expr, part = (c, s) => `${RT(D(qmul(s, s)))} = ${D(s)}` + (qeq(c, Q(1)) ? '' : `, ${E.coef(c)} · ${D(s)} = ${D(qmul(c, s))}`);
      return `${part(t.c1, s1)}; ${part(t.c2, s2)}; ${D(qmul(t.c1, s1))} ${t.op} ${D(qmul(t.c2, s2))} = ${D(TYPES.expr.ans(t))}.`;
    },
    ok: t => TYPES.expr.calc(t),
    // ошибка в запятой у одного из корней: √0,04 = 0,02 вместо 0,2
    slips(t) {
      const out = [], val = (a, b) => (t.op === '+' ? qadd : qsub)(qmul(t.c1, a), qmul(t.c2, b));
      if (t.s1.d > 1) out.push(val(qmul(t.s1, Q(1, 10)), t.s2), val(qmul(t.s1, Q(10)), t.s2));
      if (t.s2.d > 1) out.push(val(t.s1, qmul(t.s2, Q(1, 10))), val(t.s1, qmul(t.s2, Q(10))));
      return out;
    },
    wrong(t, v) {
      const E = TYPES.expr;
      if (E.slips(t).some(x => qeq(x, v))) return bad('decimal', `Ошибка в запятой при извлечении корня: в квадрате десятичной дроби знаков после запятой вдвое больше, например 0,2² = 0,04. ${E.calc(t)}`);
      const other = (t.op === '+' ? qsub : qadd)(qmul(t.c1, t.s1), qmul(t.c2, t.s2));
      if (qeq(v, other)) return bad('calc', `Проверь знак действия: в выражении «${t.op}». ${E.calc(t)}`);
      return bad('calc', `Вычислим по шагам: сначала корни, потом умножение, потом ${t.op === '+' ? 'сложение' : 'вычитание'}. ${E.calc(t)}`);
    },
    key: t => keyQ(TYPES.expr.ans(t)),
    traps: t => [TYPES.expr.slips(t)[0], (t.op === '+' ? qsub : qadd)(qmul(t.c1, t.s1), qmul(t.c2, t.s2))]
      .filter(x => x && x.n > 0 && decStr(x)).map(x => ({ key: keyQ(x), html: htmlQ(x) })),
    hints: t => [`Сначала извлеки корни, потом умножь на коэффициенты, потом ${t.op === '+' ? 'сложи' : 'вычти'}.`,
      `${RT(D(qmul(t.s1, t.s1)))} = ${D(t.s1)}, ${RT(D(qmul(t.s2, t.s2)))} = ${D(t.s2)}.`],
  },
  sum: {
    input: 'num', title: 'Корень из суммы',
    gen: rnd => {
      const [a, b, c] = pick(rnd, [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20], [7, 24, 25], [15, 20, 25], [10, 24, 26], [20, 21, 29]]);
      return rnd() < 0.5 ? { minus: false, a, b, c } : { minus: true, a: rnd() < 0.5 ? a : b, b: rnd() < 0.5 ? b : a, c };
    },
    bad: t => t.a === t.b,
    text: t => t.minus ? RT(`${t.c * t.c} ${MINUS} ${t.a * t.a}`) : RT(`${t.a * t.a} + ${t.b * t.b}`),
    ans: t => Q(t.minus ? isqrt(t.c * t.c - t.a * t.a) : t.c),
    ok: t => t.minus ? `${t.c * t.c} ${MINUS} ${t.a * t.a} = ${t.c * t.c - t.a * t.a}, ${RT(t.c * t.c - t.a * t.a)} = ${isqrt(t.c * t.c - t.a * t.a)}.`
      : `${t.a * t.a} + ${t.b * t.b} = ${t.c * t.c}, ${RT(t.c * t.c)} = ${t.c}.`,
    wrong(t, v) {
      const ok = TYPES.sum.ok(t);
      if (qeq(v, Q(t.minus ? t.c - t.a : t.a + t.b)))
        return bad('sumRoot', `Корень из ${t.minus ? 'разности' : 'суммы'} не равен ${t.minus ? 'разности' : 'сумме'} корней: ${t.minus ? `${t.c} ${MINUS} ${t.a} = ${t.c - t.a}` : `${t.a} + ${t.b} = ${t.a + t.b}`}, а ${htmlQ(v)}² = ${sq2(v)}. Сначала вычисли выражение под корнем: ${ok}`);
      return bad('calc', `Сначала вычисли выражение под корнем, потом извлеки корень: ${ok}`);
    },
    hints: t => [`Сначала вычисли то, что стоит под корнем.`, `Под корнем ${t.minus ? t.c * t.c - t.a * t.a : t.c * t.c}.`],
  },
  eq: {
    input: 'eq', title: 'Уравнение x² = a',
    ask: t => `Реши уравнение ${TYPES.eq.text(t)}`,
    sheet: t => `Реши уравнение ${TYPES.eq.text(t)}`,
    answer: t => eqHTML(TYPES.eq.ans(t), TYPES.eq.style(t)),
    // a — чему равен x² после переноса; text — запись уравнения; alt — x² при ошибке в переносе
    gen: (rnd, form) => {
      form = form || pick(rnd, ['sq', 'sq', 'dec', 'frac', 'zero', 'neg', 'irr', 'shift', 'shift']);
      const t = { form };
      if (form === 'sq') t.a = Q(int(rnd, 2, 15) ** 2);
      if (form === 'dec') { const j = int(rnd, 1, 19); t.bad = j % 10 === 0; t.a = qmul(Q(j, 10), Q(j, 10)); }
      if (form === 'frac') { const p = int(rnd, 1, 9), q = int(rnd, 2, 9); t.bad = gcd(p, q) !== 1 || p > q; t.a = Q(p * p, q * q); }
      if (form === 'zero') t.a = Q(0);
      if (form === 'neg') t.a = Q(-int(rnd, 1, 100));
      if (form === 'irr') { const m = int(rnd, 2, 60); t.bad = isqrt(m) != null; t.a = Q(m); }
      if (form === 'shift') {
        const pos = rnd() < 0.65, c = int(rnd, 1, 30);
        if (pos) {
          const k = int(rnd, 2, 12), a = k * k;
          t.a = Q(a);
          if (rnd() < 0.4) { t.lhs = `${X}² ${MINUS} ${a} = 0`; t.alt = []; }
          else { t.lhs = `${X}² + ${c} = ${a + c}`; t.alt = [Q(a + 2 * c), Q(a + c)]; t.move = `${X}² = ${a + c} ${MINUS} ${c} = ${a}`; }
        } else {
          const m = int(rnd, 1, 20) ** (rnd() < 0.5 ? 2 : 1);
          t.a = Q(-m);
          if (rnd() < 0.5) { t.lhs = `${X}² + ${m} = 0`; t.alt = [Q(m)]; t.move = `${X}² = ${MINUS}${m}`; }
          else { t.lhs = `${X}² + ${m + c} = ${c}`; t.alt = [Q(m + 2 * c), Q(c)]; t.move = `${X}² = ${c} ${MINUS} ${m + c} = ${MINUS}${m}`; }
        }
      }
      return t;
    },
    bad: t => !!t.bad,
    style: t => t.form === 'frac' ? 'frac' : 'dec',
    text: t => t.lhs || `${X}² = ${htmlQ(t.a, TYPES.eq.style(t))}`,
    ans: t => eqRoots(t.a),
    same: (t, x) => {
      const R = eqRoots(t.a);
      if (x.roots.length !== R.length) return false;
      const left = R.slice();
      return x.roots.every(v => { const i = left.findIndex(r => V.eq(r, v)); if (i < 0) return false; left.splice(i, 1); return true; });
    },
    ok(t) {
      const R = eqRoots(t.a), st = TYPES.eq.style(t), a = htmlQ(t.a, st), pre = t.move ? `${t.move}. ` : '';
      if (!R.length) return `${pre}Квадрат числа не бывает отрицательным — корней нет.`;
      if (R.length === 1) return `${pre}${X}² = 0 только при ${X} = 0 — один корень.`;
      return `${pre}${X} = ${V.html(R[0], st)} и ${X} = ${V.html(R[1], st)}: (±${V.html(R[0], st)})² = ${a}.`;
    },
    wrong(t, x) {
      const R = eqRoots(t.a), n = x.roots.length, st = TYPES.eq.style(t), a = htmlQ(t.a, st), ok = TYPES.eq.ok(t);
      const pre = t.move ? `Сначала найдём ${X}²: ${t.move}. ` : '';
      if (t.alt && t.alt.some(alt => TYPES.eq.same({ a: alt }, x)))
        return bad('eqShift', `Ошибка при переносе: слагаемое переносят в другую часть уравнения с противоположным знаком. ${ok}`);
      if (t.a.n < 0) return bad('eqNone', `${pre}${X}² = ${a}: квадрат любого числа неотрицателен, а ${a} &lt; 0. Уравнение корней не имеет.`);
      if (t.a.n === 0) return bad('eqCount', n === 0 ? `${X} = 0 — корень: 0² = 0. ${ok}` : `${X}² = 0 только при ${X} = 0 — корень один.`);
      if (n === 0) return bad('eqCount', `${pre}${a} &gt; 0 — корни есть: ${eqHTML(R, st)}.`);
      if (n === 1 && R.some(r => V.eq(r, x.roots[0])))
        return bad('eqTwo', `Это только один корень. ${pre}(${V.html(R[0], st)})² = ${a} и (${V.html(R[1], st)})² = ${a}, поэтому у уравнения два корня: ${eqHTML(R, st)}.`);
      if (t.form === 'irr' && x.roots.every(v => v.q && v.q.d > 1))
        return bad('calc', `${a} — не квадрат целого числа, и ${RT(a)} не записывается конечной десятичной дробью. Корни записывают со знаком корня: ${eqHTML(R, st)}.`);
      if (n === 2 && V.eq(x.roots[0], x.roots[1]) && R.some(r => V.eq(r, x.roots[0])))
        return bad('eqTwo', `Ты записал один и тот же корень дважды. ${ok}`);
      const tall = a.includes('frac');
      return bad('calc', `${pre}${X}² = ${a}, значит ${X} = ${RT(a, tall)} или ${X} = ${MINUS}${RT(a, tall)}. ${ok}`);
    },
    key: t => eqKey(eqRoots(t.a), TYPES.eq.style(t)),
    keyHTML: t => { const R = eqRoots(t.a), st = TYPES.eq.style(t); return !R.length ? 'нет корней' : R.length === 1 ? V.html(R[0], st) : '±' + V.html(R[0], st); },
    traps(t) {
      const R = eqRoots(t.a), st = TYPES.eq.style(t), out = [];
      const add = roots => out.push({ key: eqKey(roots, st), html: !roots.length ? 'нет корней' : (roots.length === 2 ? '±' : '') + V.html(roots[0], st) });
      if (R.length === 2) add([R[0]]);
      if (t.alt) t.alt.forEach(alt => add(eqRoots(alt)));
      if (t.a.n < 0) add(eqRoots(qneg(t.a)));
      if (t.a.n === 0) add([]);
      return out;
    },
    hints: t => [t.move ? 'Сначала перенеси число в правую часть с противоположным знаком.' : `Сколько корней: если ${X}² равен положительному числу — два, нулю — один, отрицательному — ни одного.`,
      `${X}² = ${htmlQ(t.a, TYPES.eq.style(t))}.` + (t.a.n > 0 ? ` Подумай, какие два числа в квадрате дают это число.` : '')],
  },
  est: {
    input: 'est', title: 'Оценка корня',
    ask: t => `Между какими соседними целыми числами лежит ${TYPES.est.text(t)}?`,
    sheet: t => `Между какими соседними целыми числами лежит ${TYPES.est.text(t)}?`,
    answer: t => { const { lo, hi } = TYPES.est.ans(t); return `${lo} &lt; ${TYPES.est.text(t)} &lt; ${hi}`; },
    gen: rnd => ({ a: int(rnd, 2, 150) }),
    bad: t => isqrt(t.a) != null,
    text: t => RT(t.a),
    ans: t => { const lo = floorSqrt(t.a); return { lo, hi: lo + 1 }; },
    same: (t, x) => { const r = TYPES.est.ans(t); return x.lo === r.lo && x.hi === r.hi; },
    ok: t => { const { lo, hi } = TYPES.est.ans(t); return `${lo}² = ${lo * lo} &lt; ${t.a} &lt; ${hi * hi} = ${hi}², значит ${lo} &lt; ${RT(t.a)} &lt; ${hi}.`; },
    wrong(t, x) {
      const ok = TYPES.est.ok(t);
      if (x.hi !== x.lo + 1) return bad('est', `Нужны соседние целые числа — они отличаются на 1. ${ok}`);
      return bad('est', `Проверим: ${x.lo}² = ${x.lo * x.lo}, ${x.hi}² = ${x.hi * x.hi} — число ${t.a} не лежит между ними. Ищем соседние квадраты: ${ok}`);
    },
    key: t => { const { lo, hi } = TYPES.est.ans(t); return `${lo} и ${hi}`; },
    keyHTML: t => TYPES.est.key(t),
    traps: t => { const { lo, hi } = TYPES.est.ans(t); return [[lo - 1, lo], [hi, hi + 1]].filter(([p]) => p >= 1).map(([p, q]) => ({ key: `${p} и ${q}`, html: `${p} и ${q}` })); },
    hints: t => [`Найди два соседних квадрата целых чисел: один меньше ${t.a}, другой больше.`, `${floorSqrt(t.a)}² = ${floorSqrt(t.a) ** 2}.`],
  },
  cmp: {
    input: 'choice', title: 'Сравнение', options: [['<', '&lt;'], ['=', '='], ['>', '&gt;']],
    ask: t => `Сравни: ${TYPES.cmp.text(t)}`,
    sheet: t => `Сравни: ${t.L.html} и ${t.R.html}`,
    answer: t => `${t.L.html} ${esc(TYPES.cmp.ans(t))} ${t.R.html}`,
    // L и R: html — запись, sq — квадрат (оба числа положительны, сравниваем квадраты)
    gen: rnd => {
      const form = pick(rnd, ['A', 'A', 'B', 'C']);
      let L, R;
      if (form === 'A') { const k = int(rnd, 2, 12), a = k * k + (rnd() < 0.5 ? -1 : 1) * int(rnd, 1, 9);
        L = { html: RT(a), sq: Q(a), line: `(${RT(a)})² = ${a}` }; R = { html: String(k), sq: Q(k * k), line: `${k}² = ${k * k}`, bad: a < 2 || isqrt(a) != null }; }
      if (form === 'B') { const k = int(rnd, 2, 5), m = int(rnd, 2, 7), j = int(rnd, 2, 5), n = int(rnd, 2, 7);
        L = { html: `${k}${RT(m)}`, sq: Q(k * k * m), line: `(${k}${RT(m)})² = ${k * k} · ${m} = ${k * k * m}` };
        R = { html: `${j}${RT(n)}`, sq: Q(j * j * n), line: `(${j}${RT(n)})² = ${j * j} · ${n} = ${j * j * n}`, bad: isqrt(m) != null || isqrt(n) != null || k === j || m === n || k * k * m === j * j * n }; }
      if (form === 'C') { const k = int(rnd, 1, 9), j = int(rnd, 1, 9), tq = Q(k, 10), dq = Q(j, 10);
        L = { html: D(tq), sq: qmul(tq, tq), line: `${D(tq)}² = ${D(qmul(tq, tq))}` };
        R = { html: RT(D(dq)), sq: dq, line: `(${RT(D(dq))})² = ${D(dq)}`, bad: qeq(qmul(tq, tq), dq) }; }
      const swap = rnd() < 0.5;
      return { form, L: swap ? R : L, R: swap ? L : R, bad: L.bad || R.bad };
    },
    bad: t => !!t.bad,
    text: t => `${t.L.html} <span class="cmpbox">?</span> ${t.R.html}`,
    ans: t => { const c = qsub(t.L.sq, t.R.sq).n; return c < 0 ? '<' : c > 0 ? '>' : '='; },
    ok(t) {
      const s = TYPES.cmp.ans(t), e = esc(s);
      return `Сравним квадраты: ${t.L.line}, ${t.R.line}. ${htmlQ(t.L.sq)} ${e} ${htmlQ(t.R.sq)}, значит ${t.L.html} ${e} ${t.R.html}.` +
        (t.form === 'C' ? ' Квадрат десятичной дроби, меньшей 1, меньше самой дроби.' : '');
    },
    wrong: t => bad('cmp', `Положительные числа сравнивают по их квадратам: чем больше квадрат, тем больше число. ${TYPES.cmp.ok(t)}`),
    key: t => TYPES.cmp.ans(t),
    keyHTML: t => esc(TYPES.cmp.ans(t)),
    traps: t => { const s = TYPES.cmp.ans(t), o = s === '<' ? '>' : '<'; return [{ key: o, html: esc(o) }]; },
    hints: t => ['Возведи оба числа в квадрат и сравни квадраты.', `${t.L.line}.`],
  },
};

const SECTIONS = [
  { title: 'Раздел 1', text: 'Вычисли корень', types: ['table', 'dec', 'fraction'], ex: () => `${RT('0,09')} = ?` },
  { title: 'Раздел 2', text: 'Определение и выражения', types: ['meaning', 'square', 'expr', 'sum'], ex: () => `(${RT(7)})² = ?` },
  { title: 'Раздел 3', text: `Уравнение ${X}² = <i>a</i>`, types: ['eq'], ex: () => `${X}² = 49` },
  { title: 'Раздел 4', text: 'Оценка и сравнение', types: ['est', 'cmp'], ex: () => `${RT(50)} <span class="cmpbox">?</span> 7` },
];

// ================= Раздатка: вариант восстанавливается по номеру =================
// Версия 1: восемь заданий, верные ответы складываются в слово из 8 разных букв
const KINDS_V1 = [['dec'], ['fraction', 'mixed'], ['expr'], ['square'], ['eq', ['sq', 'dec', 'frac']],
  ['eq', ['neg', 'irr', 'shift', 'shift']], ['est'], ['cmp']];
const WORDS_V1 = ['ПАРУСНИК', 'ЛИСТОПАД', 'ЖУРАВЛИК', 'ГРУЗОВИК', 'СНЕГОВИК', 'ГОЛУБИКА', 'ПЕРЧАТКИ', 'ПОЛЯРНИК', 'ХРУСТАЛЬ'];

// Бланк ответов в стиле ОГЭ, версия 1: ответ — целое число, конечная десятичная дробь или номер.
// Задания свои (зерна 200+), поэтому один номер даёт разные листы для слова и для бланка.
const OGE_V1 = ['dec', 'fraction', 'expr', 'square', 'eq', 'eqShift', 'est', 'max'];
function ogeTask(kind, rnd) {
  const value = s => `Найдите значение выражения <span class="nw">${s}.</span>`;
  if (kind === 'dec' || kind === 'expr' || kind === 'square') {
    const t = generate(kind, rnd);
    return { kind, t, ask: value(TYPES[kind].text(t)), ans: TYPES[kind].key(t) };
  }
  if (kind === 'fraction') {   // корень — конечная десятичная дробь: знаменатель 2, 4 или 5
    let t; do t = generate('fraction', rnd, 'mixed'); while (![2, 4, 5].includes(t.q));
    return { kind, t, ask: value(TYPES.fraction.text(t)), ans: decStr(Q(t.p, t.q)) };
  }
  if (kind === 'eq' || kind === 'eqShift') {
    let t; do t = generate('eq', rnd, kind === 'eq' ? pick(rnd, ['sq', 'dec']) : 'shift'); while (t.a.n <= 0);
    const big = rnd() < 0.5, r = qsqrt(t.a);
    return { kind, t, big, ans: keyQ(big ? r : qneg(r)),
      ask: `Решите уравнение ${TYPES.eq.text(t)}. Если уравнение имеет более одного корня, в ответ запишите ${big ? 'больший' : 'меньший'} из корней.` };
  }
  if (kind === 'est') {
    const t = generate('est', rnd);
    return { kind, t, ans: String(floorSqrt(t.a)), ask: `Между какими двумя соседними целыми числами заключено число ${RT(t.a)}? В ответ запишите меньшее из этих чисел.` };
  }
  // какое из чисел наибольшее: среди чисел есть целое k, но больше него — корень из k² + d
  for (;;) {
    const k = int(rnd, 4, 12);
    const sqs = shuffle(rnd, [k * k, k * k + int(rnd, 1, 2 * k), k * k - int(rnd, 1, 2 * k - 2), (k - 1) ** 2 + int(rnd, 1, 2 * k - 2)]);
    if (new Set(sqs).size < 4) continue;
    const show = s => isqrt(s) != null ? String(isqrt(s)) : RT(s);
    return { kind, t: { sqs }, ans: String(sqs.indexOf(Math.max(...sqs)) + 1),
      ask: `Какое из чисел наибольшее? ${sqs.map((s, i) => `<span class="nw">${i + 1}) ${show(s)}</span>`).join('; ')}. В ответ запишите номер этого числа.` };
  }
}

// квадрат k × k клеток слева, справа — строки подписей
function squareScene(k, side, lines = [], opt = {}) {
  const c = Math.min(46, 300 / k), size = k * c, x = 120, y = (BH - size) / 2 - 24;
  let s = grid(x, y, k, k, c, opt.fill || 'gs') + under(x, y + size, size, side, opt.sideCls || 'warm');
  s += tx(x + size + 60, y + size / 2 + 12, `S = ${k * k}`, 'lab', 'start');
  lines.forEach((l, i) => { s += `<g class="${l.cls || ''}">${tx(560, 90 + i * 64, l.t, 'lab' + (l.lc ? ' ' + l.lc : ''), 'start')}</g>`; });
  return s;
}
// парабола y = x² и горизонтальные прямые y = c
const PX = x => 490 + x * 46, PY = y => 306 - y * 7;   // y от −11 до 40 помещается в чертёж
function parabola(lines) {
  let path = '';
  for (let x = -6.2; x <= 6.21; x += 0.1) path += (path ? 'L' : 'M') + PX(x).toFixed(1) + ' ' + PY(x * x).toFixed(1);
  let s = `<line class="axis" x1="${PX(-7)}" x2="${PX(7)}" y1="${PY(0)}" y2="${PY(0)}"/><line class="axis" x1="${PX(0)}" x2="${PX(0)}" y1="${PY(-12)}" y2="${PY(41)}"/>`;
  s += `<path class="curve" d="${path}"/>` + tx(PX(4.4), PY(36), `y = ${X.replace(/<\/?i>/g, '')}²`, 'lab s acc', 'start');
  lines.forEach(c => {
    s += `<g class="new"><line class="hline" x1="${PX(-6.8)}" x2="${PX(6.8)}" y1="${PY(c)}" y2="${PY(c)}"/>` + tx(PX(-6.9), PY(c) + 10, `y = ${c < 0 ? MINUS + -c : c}`, 'lab s warm', 'end');
    const r = Math.sqrt(Math.max(c, 0));
    if (c > 0) s += `<circle class="dot" cx="${PX(-r)}" cy="${PY(c)}" r="11"/><circle class="dot" cx="${PX(r)}" cy="${PY(c)}" r="11"/>` +
      tx(PX(-r), PY(c) - 22, `${MINUS}${r}`, 'lab s warm') + tx(PX(r), PY(c) - 22, `${r}`, 'lab s warm');
    if (c === 0) s += `<circle class="dot" cx="${PX(0)}" cy="${PY(0)}" r="11"/>`;
    s += '</g>';
  });
  return s;
}

function buildSteps(e) {
  const k = e.side, k2 = e.trap, a = k * k, a2 = k2 * k2;
  const dq = Q(e.dec, 10), dA = qmul(dq, dq);
  const [r, q] = e.frac, fA = Q(r * r, q * q), fm = toMixed(fA), fr = Q(r, q);
  const n = floorSqrt(e.approx), t10 = floorSqrt(e.approx * 100), t100 = floorSqrt(e.approx * 10000);
  const [ta, tb, tc] = e.triple;
  const steps = [];
  steps.push({
    q: `Площадь квадрата ${a}. Чему равна его сторона?`,
    a: `${k}, потому что ${k}² = ${a}.`,
    note: 'Пусть класс вспомнит: площадь квадрата — сторона в квадрате. Ищем обратное: по площади — сторону.',
    draw: ph => squareScene(k, ph ? String(k) : '?'), rec: ph => ph ? [`${k}² = ${a}`] : [],
  });
  steps.push({
    q: `Какие числа в квадрате дают ${a}?`,
    a: `${k} и ${MINUS}${k}: ${k}² = ${a} и (${MINUS}${k})² = ${a}.`,
    note: 'Обычно называют только положительное число — спросите, а подойдёт ли отрицательное.',
    draw: ph => squareScene(k, String(k), ph ? [{ t: `${k}² = ${a}`, cls: 'new' }, { t: `(${MINUS}${k})² = ${a}`, cls: 'new' }] : []),
    rec: ph => ph ? [`${k}² = ${a}, (${MINUS}${k})² = ${a}`] : [`${k}² = ${a}`],
  });
  steps.push({
    q: `Какое из них может быть длиной стороны?`,
    a: `Только ${k}: длина не бывает отрицательной. Это ${RT(a)} = ${k}.`,
    note: `Определение: арифметическим квадратным корнем из числа <i>a</i> называется неотрицательное число, квадрат которого равен <i>a</i>. Знак √ — знак арифметического корня, число под ним — подкоренное выражение.`,
    draw: ph => squareScene(k, ph ? `${sr(a)} = ${k}` : String(k), ph ? [{ t: `${sr(a)} = ${k}`, cls: 'new', lc: 'acc' }, { t: `${k} ≥ 0, ${k}² = ${a}`, cls: 'new' }] : []),
    rec: ph => ph ? [`${RT(a)} = ${k}, так как ${k} ≥ 0 и ${k}² = ${a}`] : [`${k}² = ${a}, (${MINUS}${k})² = ${a}`],
  });
  steps.push({
    q: `В тетради написано: ${RT(a2)} = ±${k2}. Верно?`,
    a: `Нет: ${RT(a2)} = ${k2}. Два числа ±${k2} — корни уравнения ${X}² = ${a2}.`,
    note: `Корень — одно неотрицательное число. Уравнение ${X}² = ${a2} — это вопрос «какие числа в квадрате дают ${a2}», у него два ответа. На графике — две точки пересечения.`,
    draw: ph => {
      const c = 34, size = k2 * c, x = 90, y = 70;
      let s = grid(x, y, k2, k2, c, 'gs') + under(x, y + size, size, ph ? `${sr(a2)} = ${k2}` : `${sr(a2)} = ?`, 'warm');
      if (ph) s += `<g transform="translate(220 0)">${parabola([a2])}</g>`;
      return s;
    },
    rec: ph => ph ? [`${RT(a2)} = ${k2};  ${X}² = ${a2}: ${X} = ${k2} или ${X} = ${MINUS}${k2}`] : [],
  });
  steps.push({
    q: `Можно ли найти ${RT(`${MINUS}${e.neg}`)}?`,
    a: `Нет: квадрат любого числа неотрицателен. ${RT('<i>a</i>')} имеет смысл только при <i>a</i> ≥ 0.`,
    note: `На графике y = x² нет точек ниже оси: прямая y = ${MINUS}${e.neg} его не пересекает. Поэтому выражение ${RT(`${MINUS}${e.neg}`)} не имеет смысла, а у уравнения ${X}² = ${MINUS}${e.neg} нет корней.`,
    draw: ph => parabola(ph ? [-e.neg] : []),
    rec: ph => ph ? [`${RT(`${MINUS}${e.neg}`)} не имеет смысла: ${X}² ≥ 0 при любом ${X}`] : [],
  });
  steps.push({
    q: `Площадь закрашенного квадрата ${ds(dA)}. Сторона ${ds(qmul(dq, Q(1, 10)))} или ${ds(dq)}?`,
    a: `${ds(dq)}: ${ds(dq)}² = ${ds(dA)}, а ${ds(qmul(dq, Q(1, 10)))}² = ${ds(qmul(dA, Q(1, 100)))}.`,
    note: `Большой квадрат — единица, клетка — 0,1 × 0,1 = 0,01. Закрашено ${e.dec * e.dec} клеток — это ${ds(dA)}, сторона — ${e.dec} клеток, то есть ${ds(dq)}. В квадрате десятичной дроби знаков после запятой вдвое больше.`,
    draw: ph => {
      const c = 30, x = 120, y = 40, w = e.dec * c;
      let s = grid(x, y, 10, 10, c, 'ge') + `<rect class="gs" x="${x}" y="${y}" width="${w}" height="${w}"/>`;
      for (let i = 1; i < 10; i++) s += `<line class="gl" x1="${x + i * c}" x2="${x + i * c}" y1="${y}" y2="${y + 300}"/><line class="gl" x1="${x}" x2="${x + 300}" y1="${y + i * c}" y2="${y + i * c}"/>`;
      s += `<rect class="gf" x="${x}" y="${y}" width="${w}" height="${w}" style="stroke:var(--a)"/><rect class="gf" x="${x}" y="${y}" width="300" height="300"/>`;
      s += tx(x + 334, y + 162, '1', 'lab soft', 'start') + `<path class="br" d="M${x + 312} ${y}h12V${y + 300}h-12"/>`;
      s += tx(x + 380, y + 120, `S = ${ds(dA)}`, 'lab', 'start');
      s += tx(x + 380, y + 190, ph ? `сторона ${ds(dq)}` : 'сторона ?', 'lab warm', 'start');
      if (ph) s += `<g class="new">${tx(x + 380, y + 260, 'клетка: 0,1 · 0,1 = 0,01', 'lab s soft', 'start')}</g>`;
      return s;
    },
    rec: ph => ph ? [`${RT(ds(dA))} = ${ds(dq)}, так как ${ds(dq)}² = ${ds(dA)}`] : [],
  });
  steps.push({
    q: `Чему равен ${RT(M(fm), true)}?`,
    a: `${M(fm)} = ${F(fA)}, ${RT(F(fA), true)} = ${F(fr)} = ${M(toMixed(fr))}.`,
    note: `Смешанное число сначала переводим в неправильную дробь. Проверка: (${r}/${q})² = ${r * r}/${q * q}. Частая ошибка — извлекать корень отдельно из целой части и из дроби. На чертеже единица — ${q} × ${q} клеток (жирные линии), клетка — 1/${q * q}.`,
    draw: ph => {
      const c = Math.min(42, 300 / r), x = 120, y = (BH - r * c) / 2 - 24;
      let s = grid(x, y, r, r, c, 'gs', q) + `<path class="br" d="M${x} ${y - 10}v-12H${x + q * c}v12"/>` + tx(x + q * c / 2, y - 32, '1', 'lab soft');
      s += tx(x + r * c + 60, y + r * c / 2 - 10, `S = ${fm.w}`, 'lab', 'start') + svgFrac(x + r * c + 60 + 104 + String(fm.w).length * 20, y + r * c / 2 - 18, fm.n, fm.d);
      s += `<path class="br warm" d="M${x} ${y + r * c + 10}v12H${x + r * c}v-12"/>`;
      s += ph ? svgFrac(x + r * c / 2, y + r * c + 60, r, q, 'warm') : tx(x + r * c / 2, y + r * c + 62, '?', 'lab warm');
      return s;
    },
    rec: ph => ph ? [`${RT(M(fm), true)} = ${RT(F(fA), true)} = ${F(fr)} = ${M(toMixed(fr))}`] : [],
  });
  steps.push({
    q: `Площадь квадрата ${e.approx}. Между какими целыми числами его сторона?`,
    a: `${n}² = ${n * n} &lt; ${e.approx} &lt; ${(n + 1) ** 2} = ${n + 1}², значит ${n} &lt; ${RT(e.approx)} &lt; ${n + 1}.`,
    note: `Квадрат площадью ${e.approx} больше квадрата ${n} × ${n}, но меньше квадрата ${n + 1} × ${n + 1}. Значит, его сторона ${RT(e.approx)} — между ${n} и ${n + 1}.`,
    draw: ph => {
      const c = 300 / (n + 1), x = 120, y = 30, side = Math.sqrt(e.approx) * c;
      let s = grid(x, y, n + 1, n + 1, c, 'ge') + `<rect class="gs" x="${x}" y="${y}" width="${n * c}" height="${n * c}"/>`;
      for (let i = 1; i <= n; i++) s += `<line class="gl" x1="${x + i * c}" x2="${x + i * c}" y1="${y}" y2="${y + n * c}"/><line class="gl" x1="${x}" x2="${x + n * c}" y1="${y + i * c}" y2="${y + i * c}"/>`;
      s += `<rect class="gx" x="${x}" y="${y}" width="${side}" height="${side}"/><rect class="gf" x="${x}" y="${y}" width="${(n + 1) * c}" height="${(n + 1) * c}"/>`;
      s += tx(x + 360, y + 70, `${n}² = ${n * n}`, 'lab acc', 'start') + tx(x + 360, y + 150, `S = ${e.approx}`, 'lab warm', 'start') + tx(x + 360, y + 230, `${n + 1}² = ${(n + 1) ** 2}`, 'lab', 'start');
      if (ph) s += `<g class="new">${tx(x + 360, y + 310, `${n} &lt; ${sr(e.approx)} &lt; ${n + 1}`, 'lab warm', 'start')}</g>`;
      return s;
    },
    rec: ph => ph ? [`${n}² = ${n * n} &lt; ${e.approx} &lt; ${(n + 1) ** 2} = ${n + 1}²,  ${n} &lt; ${RT(e.approx)} &lt; ${n + 1}`] : [],
  });
  const d10 = x => ds(Q(x, 10)), d100 = x => ds(Q(x, 100));
  steps.push({
    q: `А точнее? Между какими десятыми лежит ${RT(e.approx)}?`,
    a: `${d10(t10)}² = ${ds(Q(t10 * t10, 100))} &lt; ${e.approx} &lt; ${ds(Q((t10 + 1) ** 2, 100))} = ${d10(t10 + 1)}², значит ${d10(t10)} &lt; ${RT(e.approx)} &lt; ${d10(t10 + 1)}.`,
    note: `Перебираем десятые: ${d10(t10)}² = ${ds(Q(t10 * t10, 100))}, ${d10(t10 + 1)}² = ${ds(Q((t10 + 1) ** 2, 100))}. Так же уточняем до сотых: ${d100(t100)} &lt; ${RT(e.approx)} &lt; ${d100(t100 + 1)}. Сколько ни уточняй, ${RT(e.approx)} не записывается конечной десятичной дробью — к этому вернёмся в теме об иррациональных числах.`,
    draw: ph => {
      let s = numLine(110, n, n + 1, 0.1, 1, ph ? t10 / 10 : null);
      if (ph) {
        const x0 = 90, k = 800, xa = x0 + (t10 / 10 - n) * k, xb = xa + 0.1 * k;
        s += `<g class="new"><line class="link" x1="${xa}" y1="${122}" x2="90" y2="268"/><line class="link" x1="${xb}" y1="${122}" x2="890" y2="268"/>` +
          numLine(280, t10 / 10, (t10 + 1) / 10, 0.01, 5, t100 / 100) + tx(490, 230, `${d100(t100)} &lt; ${sr(e.approx)} &lt; ${d100(t100 + 1)}`, 'lab s warm') + '</g>';
      }
      return s;
    },
    rec: ph => ph ? [`${d10(t10)} &lt; ${RT(e.approx)} &lt; ${d10(t10 + 1)},  ${d100(t100)} &lt; ${RT(e.approx)} &lt; ${d100(t100 + 1)}`] : [`${n} &lt; ${RT(e.approx)} &lt; ${n + 1}`],
  });
  steps.push({
    q: `${RT(`${ta * ta} + ${tb * tb}`)} = ${ta} + ${tb} = ${ta + tb}?`,
    a: `Нет: ${RT(`${ta * ta} + ${tb * tb}`)} = ${RT(tc * tc)} = ${tc}.`,
    note: `Квадраты площадью ${ta * ta} и ${tb * tb} вместе дают площадь ${tc * tc} — это квадрат со стороной ${tc}, а не ${ta + tb}. Сначала вычисляем выражение под корнем. Корень из суммы не равен сумме корней.`,
    draw: ph => {
      const c = Math.min(34, 760 / (ta + tb + tc), 290 / tc), y0 = 40 + tc * c;
      const xa = 50, xb = xa + ta * c + 50, xc = xb + tb * c + 70;
      let s = grid(xa, y0 - ta * c, ta, ta, c, 'gs') + grid(xb, y0 - tb * c, tb, tb, c, 'gw');
      s += tx(xa + ta * c / 2, y0 + 50, `S = ${ta * ta}`, 'lab s') + tx(xb + tb * c / 2, y0 + 50, `S = ${tb * tb}`, 'lab s');
      if (ph) s += `<g class="new">${grid(xc, y0 - tc * c, tc, tc, c, 'ge')}${tx(xc + tc * c / 2, y0 + 50, `S = ${tc * tc}, сторона ${tc}`, 'lab s warm')}</g>`;
      return s;
    },
    rec: ph => ph ? [`${RT(`${ta * ta} + ${tb * tb}`)} = ${RT(tc * tc)} = ${tc},  ${tc} ≠ ${ta} + ${tb}`] : [],
  });
  steps.push({
    q: `Сколько корней у уравнения ${X}² = <i>a</i>?`,
    a: `<i>a</i> &gt; 0 — два: ${X} = ±${RT('<i>a</i>')}; <i>a</i> = 0 — один: ${X} = 0; <i>a</i> &lt; 0 — корней нет.`,
    note: `На графике: прямая y = ${a2} пересекает параболу в двух точках (${X} = ±${k2}), y = 0 касается в одной, y = ${MINUS}${e.neg} не пересекает. Попросите привести свои примеры уравнений каждого вида.`,
    draw: ph => parabola(ph ? [a2, 0, -e.neg] : []),
    rec: ph => ph ? [`${X}² = ${a2}: ${X} = ±${k2};  ${X}² = 0: ${X} = 0;  ${X}² = ${MINUS}${e.neg}: корней нет`] : [],
  });
  steps.push({
    q: 'Что нужно запомнить?',
    a: `<ul><li>${RT('<i>a</i>')} — неотрицательное число, квадрат которого равен <i>a</i>.</li><li>${RT('<i>a</i>')} имеет смысл при <i>a</i> ≥ 0, и (${RT('<i>a</i>')})² = <i>a</i>.</li><li>${X}² = <i>a</i>, <i>a</i> &gt; 0: ${X} = ±${RT('<i>a</i>')}.</li></ul>`,
    note: 'Пусть класс сам сформулирует по записям в тетради, потом откройте ответ.',
    draw: () => '', rec: () => [`${RT('<i>a</i>')} ≥ 0,  (${RT('<i>a</i>')})² = <i>a</i>,  <i>a</i> ≥ 0`],
  });
  return steps;
}

// Пример для доски: random = false — числа из CONFIG.board, true — «Другие числа» (old — прошлый пример)
function boardExample(random, old) {
  const C = CONFIG.board;
  if (!random) return { side: C.side, trap: C.trap, neg: C.neg, dec: C.dec, frac: C.frac, approx: C.approx, triple: C.triple };
  {
    const rnd = mulberry32((Math.random() * 4294967296) >>> 0);
    const other = (lo, hi, prev) => { let v; do v = int(rnd, lo, hi); while (v === prev); return v; };
    const side = other(4, 9, old.side);
    let trap; do trap = int(rnd, 3, 6); while (trap === side);
    let approx; do approx = int(rnd, 2, 47); while (isqrt(approx) != null || approx === old.approx);
    return { side, trap, neg: pick(rnd, [4, 9]), dec: other(2, 9, old.dec),
      frac: pick(rnd, [[5, 3], [7, 4], [5, 2], [7, 3], [8, 3], [9, 4], [7, 2]]), approx,
      triple: pick(rnd, [[3, 4, 5], [6, 8, 10], [5, 12, 13]]) };
  }
}
// превью на сайте крутит шаги 1–10 (шаги с 0); картинка-превью — шаг 8 «площадь 2» с ответом
const BOARD = { previewUntil: 9, poster: 7 };

// Тексты листа раздатки: инструкция ученику и описание состава для учителя (под кнопками печати)
const PRINT = {
  instr: `Дробь в ответе — несократимая, у неправильной выдели целую часть. Ответ к уравнению: ±0,9; 0 или «нет корней».
    В задании 7 запиши два числа, в задании 8 — знак &lt; или &gt;. Найди ответ в таблице букв и впиши букву — получится слово.
    Нет ответа в таблице или слово не сложилось — ищи ошибку.`,
  about: 'В каждом варианте 8 заданий: корень из десятичной дроби, из смешанного числа, значение выражения, квадрат корня, два уравнения x² = a, оценка корня целыми числами и сравнение. Верные ответы складываются в слово.',
  ogeAbout: 'В бланке 8 заданий с кратким ответом, как в ОГЭ: корень из десятичной дроби и из смешанного числа, значение выражения, квадрат корня, два уравнения (в ответ — больший или меньший корень), оценка корня и выбор наибольшего числа. Ответ — число, оно вписывается в клеточки бланка.',
};

const CATS = {
  sign:    ['Знак корня', 'Арифметический корень — неотрицательное число: √25 = 5, а не ±5 и не −5.'],
  decimal: ['Запятая в корне из десятичной дроби', 'В квадрате десятичной дроби знаков после запятой вдвое больше: √0,09 = 0,3, потому что 0,3² = 0,09.'],
  frac:    ['Корень из дроби', 'Смешанное число переведи в неправильную дробь, потом извлеки корень из числителя и из знаменателя.'],
  meaning: ['Когда корень имеет смысл', 'Под знаком корня должно быть неотрицательное число. Сначала вычисли подкоренное выражение.'],
  square:  ['Квадрат корня', '(√a)² = a по определению; в выражении (k√a)² в квадрат возводятся оба множителя.'],
  sumRoot: ['Корень из суммы', '√(a + b) ≠ √a + √b: сначала вычисли выражение под корнем.'],
  eqTwo:   ['Второй корень уравнения', 'При a > 0 у уравнения x² = a два корня: √a и −√a.'],
  eqNone:  ['Уравнение без корней', 'Квадрат числа не бывает отрицательным: при a < 0 у x² = a корней нет.'],
  eqCount: ['Число корней', 'x² = a: при a > 0 — два корня, при a = 0 — один, при a < 0 — ни одного.'],
  eqShift: ['Перенос слагаемого', 'Число переносят в другую часть уравнения с противоположным знаком.'],
  est:     ['Оценка корня', 'Найди соседние квадраты: 8² = 64 < 73 < 81 = 9², значит 8 < √73 < 9.'],
  cmp:     ['Сравнение', 'Положительные числа сравнивай по квадратам: 7² = 49 < 50, значит 7 < √50.'],
  calc:    ['Вычисления', 'Проверяй ответ возведением в квадрат.'],
};

// Формулы в справке (help.html): ядро вызывает helpInit() при запуске
function helpInit() {
  const ra = RT('<i>a</i>');
  ['helpRa', 'helpRa2', 'helpRa3', 'helpRa4'].forEach(id => { $(id).innerHTML = ra; });
  $('helpSq').innerHTML = `(${ra})² = <i>a</i>`;
  $('helpEx1').innerHTML = `Например, ${RT(49)} = 7, потому что 7 ≥ 0 и 7² = 49. Число ${MINUS}7 тоже даёт 49 в квадрате, но ${RT(49)} ≠ ${MINUS}7.`;
  $('helpEx2').innerHTML = `${RT('0,09')} = 0,3`;
  $('helpEx3').innerHTML = `${RT(M({ w: 2, n: 7, d: 9 }), true)} = ${RT(F({ n: 25, d: 9 }), true)} = ${F({ n: 5, d: 3 })} = ${M({ w: 1, n: 2, d: 3 })}`;
  $('helpEx4').innerHTML = RT(73);
}
