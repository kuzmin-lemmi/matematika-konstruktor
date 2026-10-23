// Тема «Формулы сокращённого умножения» (7 класс, Макарычев). Только содержание — каркас даёт ядро (core/).
// Что тема обязана задать и как — ИНСТРУКЦИЯ.md, раздел «Из чего состоит тема».
// Базовые формулы: (a ± b)² = a² ± 2ab + b², a² − b² = (a − b)(a + b), (a ± b)³.
// Одночлен в теме — объект {k, m}: коэффициент k при (ab)^m, где m — сумма показателей у a и b.

// ================= Параметры: учитель может поменять их за минуту =================
const CONFIG = {
  board: {
    a: 20, b: 3,            // первый пример на доске: квадрат со стороной (20 + 3)
    previewDelay: 1700,     // превью на сайте: пауза между шагами, мс
  },
  print: {
    variants: 25,           // сколько вариантов печатать по умолчанию
    traps: 2,               // сколько ответов-ловушек на задание в таблице букв
    space: true,            // сетка для решения под каждым заданием
  },
  home: {
    round: 10,              // заданий в тренировке
    points: [10, 10, 15],   // очки за задание по разделам (столько чисел, сколько разделов)
    hintPenalty: 3,         // штраф за подсказку
    maxMultiplier: 3,       // множитель за серию: +1 за каждые 3 задания подряд без ошибок
  },
};
// Версия генератора — первая часть номера варианта «1-4817». Изменил генератор или состав
// заданий раздатки — увеличь версию и оставь старую ветку, пока на неё есть напечатанные листы.
const GEN_VERSION = 1;

// ================= Запись формул =================
const V = v => `<i>${v}</i>`;                    // переменная курсивом
const PW = s => `<sup>${s}</sup>`;               // степень верхним регистром
const MNU = n => (n < 0 ? MINUS : '') + Math.abs(n);
const SG = n => (n < 0 ? ` ${MINUS} ` : ' + ');  // знак между слагаемыми
const mono = x => (x.k === 1 ? '' : String(x.k)) + V('ab') + (x.m === 1 ? '' : PW(x.m));
const monoK = x => `${x.k}ab^${x.m}`;            // ключ для таблицы букв и ответа
const sumHTML = xs => xs.map(mono).reduce((acc, s, i) => acc + (i ? SG(xs[i].k) + s.replace(MINUS, '') : s), '');
const sumKey = xs => xs.map(monoK).join('+');
const binom = (A, sgn, B) => `(${mono({ k: A.k, m: A.m })} ${sgn > 0 ? '+' : MINUS} ${mono({ k: B.k, m: B.m })})`;
const sqOf = x => ({ k: x.k * x.k, m: 2 * x.m });
const crOf = (A, B) => ({ k: 2 * A.k * B.k, m: A.m + B.m });

// ================= Типы заданий =================
// gen(rnd, form) — задание из зерна (никакого Math.random), bad(t) — вырожденные случаи, text(t) — запись,
// ans(t) — ответ, ok(t) — объяснение верного, wrong(t, x) — {cat, msg} с вычислением, hints(t) — две подсказки,
// key/keyHTML — ответ для ключа, traps(t) — ловушки [{key, html}], correct/wrongInput — ответы для теста-контракта.
const bad = (cat, msg) => ({ cat, msg });

const TYPES = {
  expand: {   // раскрыть скобки: квадрат суммы, квадрат разности, разность квадратов — три одночлена
    input: 'poly', title: 'Раскрытие скобок',
    forms: ['sqsum', 'sqdif', 'diff'],
    gen: (rnd, form) => {
      form = form || pick(rnd, TYPES.expand.forms);
      const sign = rnd() < 0.5 ? 1 : -1;
      let t, guard = 0;
      do {
        const A = { k: int(rnd, 1, 4), m: int(rnd, 1, 6) }, B = { k: int(rnd, 1, 4), m: int(rnd, 1, 6) };
        t = { form, sign, A, B };
      } while (++guard < 100 && TYPES.expand.bad(t));
      return t;
    },
    bad: t => sqOf(t.A).k === sqOf(t.B).k && sqOf(t.A).m === sqOf(t.B).m,
    terms: t => t.form === 'diff' ? [sqOf(t.A), { k: -sqOf(t.B).k, m: sqOf(t.B).m }]
      : [sqOf(t.A), { ...(t.form === 'sqdif' ? { k: -crOf(t.A, t.B).k } : crOf(t.A, t.B)), m: crOf(t.A, t.B).m }, sqOf(t.B)],
    text: t => t.form === 'diff' ? `${mono(sqOf(t.A))} ${MINUS} ${mono(sqOf(t.B))}` : `${binom(t.A, t.sign, t.B)}${PW(2)}`,
    ask: t => `Раскройте скобки:  ${TYPES.expand.text(t)}`,
    sheet: t => `Раскройте скобки: ${TYPES.expand.text(t)}`,
    answer: t => `${TYPES.expand.text(t)} = ${sumHTML(TYPES.expand.pos(t))}`,
    pos: t => TYPES.expand.terms(t).map(x => ({ k: Math.abs(x.k), m: x.m })),
    ans: t => TYPES.expand.terms(t),
    same: (t, x) => x.length === TYPES.expand.terms(t).length &&
      x.every((v, i) => v.k === TYPES.expand.terms(t)[i].k && v.m === TYPES.expand.terms(t)[i].m),
    ok(t) {
      const T = TYPES.expand, tm = T.terms(t);
      if (t.form === 'diff') return `a² − b² остаётся разностью двух квадратов, среднего члена нет: ${T.text(t)} = ${T.answer(t).split(' = ')[1]}.`;
      return `(a ${t.sign > 0 ? '+' : MINUS} b)² = a² ${t.sign > 0 ? '+' : MINUS} 2ab + b²: 2 · ${mono(t.A)} · ${mono(t.B)} = ${mono(crOf(t.A, t.B))}, поэтому ${T.answer(t).split(' = ')[1]}.`;
    },
    wrong(t, x) {
      const T = TYPES.expand, tm = T.terms(t), cr = crOf(t.A, t.B), ok = T.ok(t);
      const eq = (u, v) => u.k === v.k && u.m === v.m;
      if (x.length === 2 && eq(x[0], sqOf(t.A)) && eq(x[1], sqOf(t.B)))
        return bad('middle', `Ты сложил квадраты, а нужно ТРИ слагаемых: удвоенное произведение 2 · ${mono(t.A)} · ${mono(t.B)} = ${mono(cr)} потерялось. ${ok}`);
      if (x.length === 2 && eq(x[0], sqOf(t.A)) && eq(x[1], { k: -sqOf(t.B).k, m: sqOf(t.B).m }))
        return bad('sign', `(a ${t.sign > 0 ? '+' : MINUS} b)² никогда не даёт a² − b²: последний член — ПЛЮС квадрат второго одночлена. ${ok}`);
      if (x.length === 3 && eq(x[0], sqOf(t.A)) && eq(x[1], cr) && eq(x[2], sqOf(t.B)) && t.form === 'sqdif')
        return bad('sign', `В квадрате РАЗНОСТИ средний член со знаком «${MINUS}»: (a − b)² = a² − 2ab + b². ${ok}`);
      if (x.length === 3 && eq(x[0], sqOf(t.A)) && eq(x[1], { k: -cr.k, m: cr.m }) && eq(x[2], sqOf(t.B)) && t.form === 'sqsum')
        return bad('sign', `Внутри скобки «+», значит и средний член 2ab со знаком «+»: (a + b)² = a² + 2ab + b². ${ok}`);
      if (t.form === 'diff' && x.length === 3)
        return bad('diff', `Разность квадратов раскладывается в ДВА множителя (a − b)(a + b) — никакого среднего члена 2ab здесь нет. ${ok}`);
      return bad('calc', ok);
    },
    key: t => sumKey(TYPES.expand.terms(t)),
    keyHTML: t => sumHTML(TYPES.expand.pos(t)),
    traps(t) {
      const T = TYPES.expand, out = [];
      if (t.form !== 'diff') {
        out.push([sqOf(t.A), sqOf(t.B)]);                                        // забыли 2ab
        if (t.form === 'sqdif') out.push([sqOf(t.A), { k: -sqOf(t.B).k, m: sqOf(t.B).m }]);   // a² − b²
        else out.push([sqOf(t.A), { k: -crOf(t.A, t.B).k, m: crOf(t.A, t.B).m }, sqOf(t.B)]); // перепутали знак середины
      } else out.push([sqOf(t.A), crOf(t.A, t.B), sqOf(t.B)]);                   // лишнее 2ab
      return out.slice(0, CONFIG.print.traps).map(xs => ({ key: sumKey(xs), html: sumHTML(xs.map(x => ({ k: Math.abs(x.k), m: x.m }))) }));
    },
    hints(t) {
      const T = TYPES.expand;
      if (t.form === 'diff') return ['a² − b² = (a − b)(a + b) — наоборот: сворачиваем разность квадратов, здесь два слагаемых.', `Первое слагаемое — ${mono(sqOf(t.A))}, второе — ${mono(sqOf(t.B))} со знаком «−».`];
      return [`(a ${t.sign > 0 ? '+' : MINUS} b)² = a² ${t.sign > 0 ? '+' : MINUS} 2ab + b² — три слагаемых, крайние — всегда «+».`, `Начни так: ${mono(sqOf(t.A))} ${t.sign > 0 ? '+' : MINUS} ${mono(crOf(t.A, t.B))} + …`];
    },
    correct: t => TYPES.expand.ans(t),
    wrongInput: t => [{ k: sqOf(t.A).k + 2, m: sqOf(t.A).m }, ...TYPES.expand.ans(t).slice(1)],
  },
  fill: {   // восстановить пропущенный член: 2ab или 3a²b
    input: 'mono', title: 'Пропущенный член',
    forms: ['sqsum', 'sqdif', 'cube'],
    gen: (rnd, form) => {
      form = form || pick(rnd, TYPES.fill.forms);
      const sign = rnd() < 0.5 ? 1 : -1;
      let t, guard = 0;
      do {
        const A = { k: int(rnd, 1, 3), m: int(rnd, 1, 4) }, B = { k: int(rnd, 1, 3), m: int(rnd, 1, 4) };
        t = { form, sign, A, B };
      } while (++guard < 100 && TYPES.fill.bad(t));
      return t;
    },
    bad: t => sqOf(t.A).k === sqOf(t.B).k && sqOf(t.A).m === sqOf(t.B).m,
    want: t => t.form === 'cube' ? { k: 3 * t.A.k * t.A.k * t.B.k, m: 2 * t.A.m + t.B.m } : crOf(t.A, t.B),
    text(t) {
      const T = TYPES.fill;
      if (t.form === 'cube') return `(${mono(t.A)} ${t.sign > 0 ? '+' : MINUS} ${mono(t.B)})${PW(3)} = ${mono(sqOf(t.A).k ? { k: t.A.k ** 3, m: 3 * t.A.m } : 0)} + <span class="fmuq">?</span> + ${mono({ k: 3 * t.A.k * t.B.k * t.B.k, m: t.A.m + 2 * t.B.m })} ${t.sign > 0 ? '+' : MINUS} ${mono({ k: t.B.k ** 3, m: 3 * t.B.m })}`;
      return `(${mono(t.A)} ${t.sign > 0 ? '+' : MINUS} ${mono(t.B)})${PW(2)} = ${mono(sqOf(t.A))} ${t.sign > 0 ? '+' : MINUS} <span class="fmuq">?</span> + ${mono(sqOf(t.B))}`;
    },
    ask: t => `Какой одночлен пропущен?  ${TYPES.fill.text(t)}`,
    sheet: t => `Запишите пропущенный одночлен: ${TYPES.fill.text(t)}`,
    answer: t => `${mono(TYPES.fill.want(t))}`,
    ans: t => TYPES.fill.want(t),
    same: (t, x) => x.k === TYPES.fill.want(t).k && x.m === TYPES.fill.want(t).m,
    ok(t) {
      const T = TYPES.fill;
      if (t.form === 'cube') return `Во кубе коэффициенты 1, 3, 3, 1: 3a²b = 3 · (${mono(t.A)})² · ${mono(t.B)} = ${mono(T.want(t))}.`;
      return `Между квадратами стоит удвоенное произведение: 2 · ${mono(t.A)} · ${mono(t.B)} = ${mono(T.want(t))}. В квадрате ${t.sign > 0 ? 'суммы' : 'разности'} оно идёт со знаком «${t.sign > 0 ? '+' : MINUS}».`;
    },
    wrong(t, x) {
      const T = TYPES.fill, w = T.want(t), ok = T.ok(t);
      if (x.m === w.m && x.k * 2 === w.k) return bad('coef', `Забыл коэффициент ${w.k}: пропущенный член — это ${w.k === 2 ? 'удвоенное' : 'утроенное'} произведение, а не просто произведение. ${ok}`);
      if (x.m !== w.m) return bad('power', `Показатели складываются: ${t.form === 'cube' ? `у a степень ${2 * t.A.m}, у b — ${t.B.m}` : `${t.A.m} + ${t.B.m} = ${w.m}`}. ${ok}`);
      return bad('calc', ok);
    },
    key: t => monoKey(TYPES.fill.want(t)),
    keyHTML: t => mono(TYPES.fill.want(t)),
    traps(t) {
      const w = TYPES.fill.want(t);
      return [{ k: Math.max(1, Math.round(w.k / 2)), m: w.m }].map(x => ({ key: monoKey(x), html: mono(x) })).slice(0, CONFIG.print.traps);
    },
    hints(t) {
      if (t.form === 'cube') return ['(a ± b)³ = a³ ± 3a²b + 3ab² ± b³ — коэффициенты 1, 3, 3, 1.', `Пропущен член 3a²b: коэффициент 3, показатели ${2 * t.A.m} и ${t.B.m}.`];
      return ['Между двумя квадратами спрятано удвоенное произведение 2ab.', `Коэффициент 2, суммарный показатель ${t.A.m} + ${t.B.m} = ${t.A.m + t.B.m}.`];
    },
    correct: t => TYPES.fill.ans(t),
    wrongInput: t => ({ k: TYPES.fill.want(t).k + 3, m: TYPES.fill.want(t).m }),
  },
  smart: {   // вычисление удобным способом: a² − b² = (a − b)(a + b)
    input: 'num', title: 'Удобным способом',
    gen: rnd => {
      const form = pick(rnd, ['int', 'dec']);
      if (form === 'dec') { const k = int(rnd, 11, 99); return { form, k }; }
      return { form: 'int', a: int(rnd, 16, 49), d: int(rnd, 6, 15) };
    },
    bad: t => t.form === 'int' && (t.a <= 0 || t.a + t.d >= 100),
    pair: t => t.form === 'dec' ? [Q(t.k, 10), Q(5, 10)] : [Q(t.a + t.d), Q(t.a - t.d)],
    dec: q => decStr(q) || htmlQ(q, 'frac'),
    text: t => { const E = TYPES.smart, [x, y] = E.pair(t); return `${E.dec(x)}${PW(2)} ${MINUS} ${E.dec(y)}${PW(2)}`; },
    ask: t => `Вычислите удобным способом:  ${TYPES.smart.text(t)}`,
    sheet: t => `Вычислите удобным способом: ${TYPES.smart.text(t)}`,
    ans: t => { const E = TYPES.smart, [x, y] = E.pair(t); return qsub(qmul(x, x), qmul(y, y)); },
    ok(t) {
      const E = TYPES.smart, [x, y] = E.pair(t), lo = qsub(x, y), hi = qadd(x, y);
      return `a² − b² = (a − b)(a + b): (${E.dec(x)} ${MINUS} ${E.dec(y)}) · (${E.dec(x)} + ${E.dec(y)}) = ${E.dec(lo)} · ${E.dec(hi)} = ${htmlQ(E.ans(t))}.`;
    },
    wrong(t, v) {
      const E = TYPES.smart, [x, y] = E.pair(t), ok = E.ok(t);
      const xs = qmul(x, x), ys = qmul(y, y), sum = qadd(x, y), dif = qsub(x, y);
      if (qeq(v, qadd(xs, ys))) return bad('smart', `Здесь разность квадратов, а ты сложил квадраты: ${E.dec(x)}² + ${E.dec(y)}² = ${htmlQ(qadd(xs, ys))}. Нужно (a − b)(a + b). ${ok}`);
      if (qeq(v, qmul(dif, dif)) || qeq(v, qmul(sum, sum))) return bad('smart', `Ты возвёл в квадрат разность (или сумму): это (a ∓ b)² — три слагаемых, а нужно a² − b² = (a − b)(a + b). ${ok}`);
      if (qeq(v, sum) || qeq(v, dif)) return bad('smart', `Скобки нужно ПЕРЕМНОЖИТЬ: ${E.dec(sum)} · ${E.dec(dif)}, а не оставить только сумму или только разность. ${ok}`);
      return bad('calc', `Разложим по формуле и посчитаем заново. ${ok}`);
    },
    traps(t) {
      const E = TYPES.smart, [x, y] = E.pair(t);
      return [qmul(x, x), qmul(y, y)].filter(z => z.n > 0 && !qeq(z, E.ans(t))).map(z => ({ key: keyQ(z), html: htmlQ(z) })).slice(0, CONFIG.print.traps);
    },
    hints(t) {
      const E = TYPES.smart, [x, y] = E.pair(t);
      return ['Видишь разность двух квадратов — сворачивай в произведение: (a − b)(a + b).', `a = ${E.dec(x)}, b = ${E.dec(y)}: a − b = ${E.dec(qsub(x, y))}, a + b = ${E.dec(qadd(x, y))}.`];
    },
  },
  value: {   // значение выражения a² − b² при данных значениях букв
    input: 'num', title: 'Значение выражения',
    gen: rnd => {
      const r = Q(int(rnd, 12, 40), 10), s = Q(int(rnd, 1, 11), 10);
      return { r, s };
    },
    bad: t => t.r.n <= t.s.n,
    text: t => `${V('a')}${PW(2)} ${MINUS} ${V('b')}${PW(2)}`,
    ask: t => `Найдите значение выражения ${TYPES.value.text(t)}<br>при ${V('a')} = ${decStr(t.r)}, ${V('b')} = ${decStr(t.s)}.`,
    sheet: t => `Найдите значение выражения ${TYPES.value.text(t)} при ${V('a')} = ${decStr(t.r)}, ${V('b')} = ${decStr(t.s)}.`,
    answer: t => `${TYPES.value.text(t)} = ${decStr(TYPES.value.ans(t))} при ${V('a')} = ${decStr(t.r)}, ${V('b')} = ${decStr(t.s)}`,
    ans: t => qsub(qmul(t.r, t.r), qmul(t.s, t.s)),
    ok(t) {
      const E = TYPES.value, lo = qsub(t.r, t.s), hi = qadd(t.r, t.s);
      return `a² − b² = (a − b)(a + b) = (${decStr(t.r)} − ${decStr(t.s)}) · (${decStr(t.r)} + ${decStr(t.s)}) = ${decStr(lo)} · ${decStr(hi)} = ${decStr(E.ans(t))}.`;
    },
    wrong(t, v) {
      const E = TYPES.value, ok = E.ok(t);
      const lo = qsub(t.r, t.s), hi = qadd(t.r, t.s);
      if (qeq(v, qmul(lo, lo))) return bad('value', `Ты возвёл в квадрат РАЗНОСТЬ: (a − b)² = ${decStr(qmul(lo, lo))} — это три слагаемых. Здесь разность квадратов: a² − b² = (a − b)(a + b). ${ok}`);
      if (qeq(v, qmul(hi, hi))) return bad('value', `Это квадрат СУММЫ (a + b)², а нужна разность квадратов: a² − b² = (a − b)(a + b). ${ok}`);
      if (qeq(v, qadd(qmul(t.r, t.r), qmul(t.s, t.s)))) return bad('calc', `В выражении стоит «${MINUS}»: квадрат ${decStr(t.s)} вычитаем, а не прибавляем. ${ok}`);
      if (qeq(v, lo) || qeq(v, hi)) return bad('calc', `Это только один множитель. Второй — ${qeq(v, lo) ? `сумма: ${decStr(hi)}` : `разность: ${decStr(lo)}`}. ${ok}`);
      return bad('calc', ok);
    },
    traps(t) {
      const E = TYPES.value, lo = qsub(t.r, t.s);
      return [qmul(lo, lo), qadd(qmul(t.r, t.r), qmul(t.s, t.s))]
        .filter(z => z.n > 0 && decStr(z) && !qeq(z, E.ans(t))).map(z => ({ key: keyQ(z), html: htmlQ(z) })).slice(0, CONFIG.print.traps);
    },
    hints(t) {
      const E = TYPES.value;
      return ['Не возводи в квадрат столбиком: подставь числа в a² − b² = (a − b)(a + b).', `a − b = ${decStr(qsub(t.r, t.s))}, a + b = ${decStr(qadd(t.r, t.s))}.`];
    },
  },
  fact: {   // разложение на множители: выбрать верное
    input: 'choice', title: 'Разложение на множители', options: [],
    forms: ['diff', 'sqsum', 'sqdif'],
    gen: (rnd, form) => {
      form = form || pick(rnd, TYPES.fact.forms);
      let t, guard = 0;
      do {
        const A = { k: int(rnd, 1, 3), m: int(rnd, 1, 4) }, B = { k: int(rnd, 1, 3), m: int(rnd, 1, 4) };
        t = { form, A, B, sign: rnd() < 0.5 ? 1 : -1 };
      } while (++guard < 100 && TYPES.fact.bad(t));
      return t;
    },
    bad: t => sqOf(t.A).k === sqOf(t.B).k && sqOf(t.A).m === sqOf(t.B).m,
    text: t => t.form === 'diff' ? `${mono(sqOf(t.A))} ${MINUS} ${mono(sqOf(t.B))}`
      : `${mono(sqOf(t.A))} ${SG(t.termsSign ? t.sign : t.sign)}${mono(crOf(t.A, t.B))} ${SG(t.sign)} ${mono(sqOf(t.B))}`,
    right: t => t.form === 'diff' ? `${binom(t.A, 1, t.B)} · ${binom(t.A, -1, t.B)}` : binom(t.A, t.sign, t.B) + PW(2),
    ask: t => `Разложите на множители:  ${TYPES.fact.text(t)}`,
    sheet: t => `Разложите на множители: ${TYPES.fact.text(t)}`,
    answer: t => `${TYPES.fact.text(t)} = ${TYPES.fact.right(t)}`,
    ans: t => TYPES.fact.right(t),
    same: (t, v) => v === TYPES.fact.right(t),
    ok: t => `Проверим обратным умножением: ${TYPES.fact.right(t)} = ${TYPES.fact.text(t)}.`,
    wrong(t, v) {
      const T = TYPES.fact;
      if (t.form === 'diff' && v === binom(t.A, -1, t.B) + PW(2))
        return bad('fact', `Это квадрат разности: (a − b)² = a² − 2ab + b² — три слагаемых. Разность квадратов раскладывается в ДВА множителя: ${T.right(t)}.`);
      if (t.form !== 'diff' && v === `${binom(t.A, 1, t.B)} · ${binom(t.A, -1, t.B)}`)
        return bad('fact', `Произведение (a + b)(a − b) даёт разность квадратов a² − b², а у тебя полный квадрат: три слагаемых и средний член 2ab. Ответ: ${T.right(t)}.`);
      if (t.form !== 'diff' && v === binom(t.A, -t.sign, t.B) + PW(2))
        return bad('sign', `Знак в скобке должен совпадать со знаком перед 2ab: при «${t.sign > 0 ? '+' : MINUS}» в середине это ${T.right(t)}.`);
      return bad('fact', `Сравни с формулой: a² − b² = (a − b)(a + b); a² ± 2ab + b² = (a ± b)². Верный ответ: ${T.right(t)}.`);
    },
    key: t => TYPES.fact.keyOf(t),
    keyOf: t => (t.form === 'diff' ? 'd' : t.sign > 0 ? 'p' : 'm'),
    keyHTML: t => TYPES.fact.right(t),
    traps(t) {
      const T = TYPES.fact;
      if (t.form === 'diff') return [{ key: 's', html: binom(t.A, 1, t.B) + PW(2) }, { key: 'm', html: binom(t.A, -1, t.B) + PW(2) }].slice(0, CONFIG.print.traps);
      return [{ key: 'd', html: `${binom(t.A, 1, t.B)} · ${binom(t.A, -1, t.B)}` }, { key: t.sign > 0 ? 'm' : 'p', html: binom(t.A, -t.sign, t.B) + PW(2) }].slice(0, CONFIG.print.traps);
    },
    opts: t => [{ key: TYPES.fact.keyOf(t), html: TYPES.fact.right(t) }, ...TYPES.fact.traps(t)],
    hints(t) {
      if (t.form === 'diff') return ['Два квадрата и «−» между ними: a² − b² = (a − b)(a + b).', `Из первого члена корень ${mono(t.A)}, из второго ${mono(t.B)}.`];
      return ['Три слагаемых, крайние — квадраты, среднее — 2ab: это полный квадрат (a ± b)².', `Скобка: ${binom(t.A, t.sign, t.B)}${PW(2)}.`];
    },
  },
  cube: {   // куб суммы и разности: выбрать верное раскрытие
    input: 'choice', title: 'Куб суммы и разности', options: [],
    gen: rnd => {
      let t, guard = 0;
      do {
        const A = { k: int(rnd, 1, 3), m: int(rnd, 1, 3) }, B = { k: int(rnd, 1, 3), m: int(rnd, 1, 3) };
        t = { A, B, sign: rnd() < 0.5 ? 1 : -1 };
      } while (++guard < 100 && TYPES.cube.bad(t));
      return t;
    },
    bad: t => t.A.k === t.B.k && t.A.m === t.B.m,
    parts: t => ({ cu: { k: t.A.k ** 3, m: 3 * t.A.m }, c1: { k: 3 * t.A.k ** 2 * t.B.k, m: 2 * t.A.m + t.B.m },
      c2: { k: 3 * t.A.k * t.B.k ** 2, m: t.A.m + 2 * t.B.m }, cb: { k: t.B.k ** 3, m: 3 * t.B.m } }),
    line: t => {
      const P = TYPES.cube.parts(t), sgn = t.sign > 0 ? '+' : MINUS;
      return `${mono(P.cu)} + ${mono(P.c1)} ${sgn} ${mono(P.c2)} ${sgn} ${mono(P.cb)}`;
    },
    text: t => `${binom(t.A, t.sign, t.B)}${PW(3)}`,
    ask: t => `Раскройте скобки:  ${TYPES.cube.text(t)}`,
    sheet: t => `Раскройте скобки: ${TYPES.cube.text(t)}`,
    answer: t => `${TYPES.cube.text(t)} = ${TYPES.cube.line(t)}`,
    ans: t => TYPES.cube.line(t),
    same: (t, v) => v === TYPES.cube.line(t),
    ok: t => `Коэффициенты 1, 3, 3, 1; степени у первой буквы убывают, у второй растут. Знаки чередуются через «${t.sign > 0 ? '+' : MINUS}»: ${TYPES.cube.line(t)}.`,
    wrong(t, v) {
      const T = TYPES.cube, flip = { ...t, sign: -t.sign };
      if (v === T.line(flip)) return bad('sign', `Знаки: в (${mono(t.A)} ${t.sign > 0 ? '+' : MINUS} ${mono(t.B)})³ члены 3a²b и b³ берутся со знаком «${t.sign > 0 ? '+' : MINUS}». ${T.ok(t)}`);
      const P = T.parts(t);
      if (v === `${mono(P.cu)} + ${mono(P.cb)}` || v === `${mono(P.cu)} ${MINUS} ${mono(P.cb)}`)
        return bad('cube', `У куба ЧЕТЫРЕ слагаемых: пропали 3a²b = ${mono(P.c1)} и 3ab² = ${mono(P.c2)}. ${T.ok(t)}`);
      if (v === `${binom(t.A, t.sign, t.B)}${PW(2)} · ${mono({ k: 1, m: 1 })}`) return bad('cube', T.ok(t));
      return bad('cube', T.ok(t));
    },
    key: t => TYPES.cube.keyOf(t),
    keyOf: t => (t.sign > 0 ? 'p' : 'm'),
    keyHTML: t => TYPES.cube.line(t),
    traps(t) { const T = TYPES.cube; return [{ key: T.keyOf({ ...t, sign: -t.sign }), html: T.line({ ...t, sign: -t.sign }) }].slice(0, CONFIG.print.traps); },
    opts: t => [{ key: TYPES.cube.keyOf(t), html: TYPES.cube.line(t) }, ...TYPES.cube.traps(t)],
    hints(t) {
      const P = TYPES.cube.parts(t);
      return ['(a ± b)³ = a³ ± 3a²b + 3ab² ± b³ — четыре слагаемых, коэффициенты 1, 3, 3, 1.', `Первые два члена: ${mono(P.cu)} + ${mono(P.c1)} …`];
    },
  },
};
const monoKey = x => `${x.k}ab^${x.m}`;

// ================= Ошибки: блок «Над чем поработать» =================
const CATS = {
  middle: ['Забыт средний член', '(a ± b)² — это три слагаемых: a² ± 2ab + b². Средний член 2ab теряется чаще всего.'],
  sign: ['Знак в формуле', 'В (a − b)² средний член со знаком «−», а последний член всегда «+». В кубе знаки чередуются.'],
  diff: ['Разность квадратов', 'a² − b² = (a − b)(a + b): два множителя, среднего члена 2ab в ней нет.'],
  coef: ['Коэффициент', 'У квадрата средний член 2ab, у куба — 3a²b и 3ab²: коэффициенты 1, 3, 3, 1.'],
  power: ['Степени', 'При умножении одночленов показатели складываются: a² · a³ = a⁵, (a²)³ = a⁶.'],
  calc: ['Вычисления', 'Проверь арифметику: сначала скобки (разность и сумма), потом умножение.'],
  smart: ['Выбор формулы', 'a² − b² = (a − b)(a + b), а (a − b)² = a² − 2ab + b². Это разные формулы.'],
  value: ['Подстановка', 'Подставляй числа в (a − b)(a + b): действий меньше, чем при возведении в квадрат.'],
  fact: ['Разложение', 'Два квадрата и «−» — разность квадратов; три слагаемых и 2ab — полный квадрат.'],
  cube: ['Число слагаемых куба', '(a ± b)³ = a³ ± 3a²b + 3ab² ± b³ — четыре слагаемых, а не два.'],
};

// ================= Разделы тренажёра =================
const SECTIONS = [
  { title: 'Раздел 1', text: 'Раскрытие скобок', types: ['expand', 'fill'], ex: () => `(${V('a')} + ${V('b')})${PW(2)} = ?` },
  { title: 'Раздел 2', text: 'Вычисления удобно', types: ['smart', 'value'], ex: () => `47² ${MINUS} 23²` },
  { title: 'Раздел 3', text: 'Обратные формулы', types: ['fact', 'cube'], ex: () => `9${V('ab')}${PW(2)} ${MINUS} 16${V('ab')}${PW(2)}` },
];

// ================= Раздатка =================
// Состав варианта: девять заданий, верные ответы складываются в слово из 9 разных букв
const KINDS_V1 = [['expand', 'sqsum'], ['expand', 'sqdif'], ['expand', 'diff'], ['fill', 'sqsum'], ['fill', 'sqdif'],
  ['smart', 'int'], ['smart', 'dec'], ['value', null], ['fact', 'diff']];
const WORDS_V1 = ['ВЕКТОРНАЯ', 'СТЕПЕНЬКА', 'ПОЛИНОМИК', 'БИНОМИАЛ', 'ТЕОРЕМКА', 'КОРРЕКТОР', 'ДЕЛИМОСТЬ', 'ПРОЦЕНТЫ', 'РАЦИОНАЛ'];

const PRINT = {
  instr: 'Выполни задание и найди свой ответ в таблице букв. Впиши букву в клеточку под номером задания — в слове '
    'пошла ошибка? Ищи её в решении. Если ответа нет в таблице, значит, ты допустил типичную ошибку.',
  about: 'В каждом варианте девять заданий: три на раскрытие скобок, два на пропущенный одночлен, два на вычисление '
    'удобным способом, одно на значение выражения и одно на разложение на множители. Девять верных ответов '
    'складываются в слово.',
  ogeAbout: 'Бланк как в ОГЭ: восемь заданий, ответ — число (целое или десятичная дробь). Записывай его в клеточки '
    'справа от номера: каждый символ, включая минус и запятую, — в отдельную клеточку. Задания бланка отличаются от '
    'заданий листа «кодовое слово», поэтому один и тот же номер варианта можно использовать дважды.',
};

// ================= Бланк ОГЭ =================
// Ответ — число, которое помещается в клеточки (не длиннее 10 символов). Задания свои: зерна 200+,
// поэтому лист бланка отличается от листа с кодовым словом при том же номере.
const OGE_V1 = ['prod', 'lin', 'square', 'value', 'smartInt', 'smartDec', 'coef', 'cubeVal'];
function ogeTask(kind, rnd) {
  if (kind === 'prod') {          // (a − b)(a + b) — произведение скобок доround
    const a = int(rnd, 21, 49), b = int(rnd, 1, 20);
    return { kind, ans: String((a - b) * (a + b)),
      ask: `Найдите значение выражения (${a} − ${b}) · (${a} + ${b}), применив формулу сокращённого умножения.` };
  }
  if (kind === 'lin') {           // (x + c)² − x² = m → линейное уравнение, корень целый
    const c = int(rnd, 2, 9), x = int(rnd, 2, 12), m = 2 * c * x + c * c;
    return { kind, ans: String(x),
      ask: `Решите уравнение (${X} + ${c})${PW(2)} ${MINUS} ${X}${PW(2)} = ${m}. В ответ запишите корень.` };
  }
  if (kind === 'square') {        // (a + b)² − b² при b, кратном 10
    const a = int(rnd, 2, 15), b = 10 * int(rnd, 1, 6);
    return { kind, ans: String(a * a + 2 * a * b),
      ask: `Найдите значение выражения (${V('a')} + ${V('b')})${PW(2)} ${MINUS} ${V('b')}${PW(2)} при ${V('a')} = ${a}, ${V('b')} = ${b}.` };
  }
  if (kind === 'value') {         // (a + b)² − (a − b)² = 4ab
    const a = int(rnd, 2, 15), b = int(rnd, 1, 9);
    return { kind, ans: String(4 * a * b),
      ask: `Найдите значение выражения (${V('a')} + ${V('b')})${PW(2)} ${MINUS} (${V('a')} ${MINUS} ${V('b')})${PW(2)} при ${V('a')} = ${a}, ${V('b')} = ${b}.` };
  }
  if (kind === 'smartInt') {      // a² − b² удобными числами
    const a = int(rnd, 21, 69), b = int(rnd, 1, 20);
    return { kind, ans: String(a * a - b * b),
      ask: `Найдите значение выражения ${a}${PW(2)} ${MINUS} ${b}${PW(2)}.` };
  }
  if (kind === 'smartDec') {      // разность квадратов десятичных дробей
    const x = Q(int(rnd, 3, 19), 10), y = Q(int(rnd, 1, 2), 10), r = qsub(qmul(x, x), qmul(y, y));
    return { kind, ans: decStr(r),
      ask: `Найдите значение выражения ${decStr(x)}${PW(2)} ${MINUS} ${decStr(y)}${PW(2)}.` };
  }
  if (kind === 'coef') {          // какой одночлен стоит вместо □ — в ответ номер
    const A = { k: int(rnd, 1, 3), m: int(rnd, 1, 4) }, B = { k: int(rnd, 1, 3), m: int(rnd, 1, 4) };
    const want = crOf(A, B);
    const list = shuffle(rnd, [want, sqOf(A), sqOf(B), { k: want.k * 2, m: want.m }]);
    if (!list.some(z => z.k === want.k && z.m === want.m)) list[0] = want;
    const no = list.findIndex(z => z.k === want.k && z.m === want.m) + 1;
    return { kind, ans: String(no),
      ask: `Какой из одночленов нужно записать вместо ${V('□')}, чтобы получилось тождество<br>` +
        `(${mono(A)} + ${mono(B)})${PW(2)} = ${mono(sqOf(A))} + ${V('□')} + ${mono(sqOf(B))}?<br>` +
        list.map((z, i) => `<span class="nw">${i + 1}) ${mono(z)}</span>`).join('; ') + `. В ответ запишите номер.` };
  }
  // куб разности при целых значениях
  const a = int(rnd, 6, 14), b = int(rnd, 1, 5);
  return { kind: 'cubeVal', ans: String((a - b) ** 3),
    ask: `Найдите значение выражения (${V('a')} ${MINUS} ${V('b')})${PW(3)} при ${V('a')} = ${a}, ${V('b')} = ${b}.` };
}

// ================= На доске =================
// Квадрат со стороной (a + b): площадь раскладывается на a² + 2ab + b² — почему (a + b)² ≠ a² + b²
function boardExample(random, old) {
  if (!random) return { a: CONFIG.board.a, b: CONFIG.board.b };
  const rnd = mulberry32(((Math.random() * 4294967296) >>> 0));
  let a, b, guard = 0;
  do { a = int(rnd, 12, 28); b = int(rnd, 2, 9); } while (++guard < 50 && old.a === a && old.b === b);
  return { a, b };
}
// Клетчатый квадрат со стороной (a + b) слева, подписи шагов справа
function squareScene(a, b, lines = [], opt = {}) {
  const unit = Math.min(14, Math.floor(320 / (a + b))), size = (a + b) * unit, x = 70, y = Math.max(30, (BH - size) / 2);
  const ca = a * unit, cb = b * unit;
  let s = grid(x, y, a + b, a + b, unit, 'ge', 5);
  if (opt.colorAA) s += `<rect class="gs" x="${x}" y="${y}" width="${ca}" height="${ca}"/>`;
  if (opt.colorAB) s += `<rect class="gw" x="${x + ca}" y="${y}" width="${cb}" height="${ca}"/><rect class="gw" x="${x}" y="${y + ca}" width="${ca}" height="${cb}"/>`;
  if (opt.colorBB) s += `<rect class="gs" x="${x + ca}" y="${y + ca}" width="${cb}" height="${cb}"/>`;
  if (opt.showSplit) s += `<line class="gf" x1="${x + ca}" x2="${x + ca}" y1="${y}" y2="${y + size}" style="stroke-width:3"/><line class="gf" x1="${x}" x2="${x + size}" y1="${y + ca}" y2="${y + ca}" style="stroke-width:3"/>`;
  s += under(x, y + size, size, opt.sideLabel || `сторона ${a + b}`, 'warm');
  if (opt.markAB) s += tx(x + ca / 2, y - 16, String(a), 'lab acc') + tx(x + ca + cb / 2, y - 16, String(b), 'lab warm');
  lines.forEach((l, i) => { s += `<g class="${l.cls || ''}">${tx(600, 70 + i * 66, l.t, 'lab' + (l.lc ? ' ' + l.lc : ''), 'start')}</g>`; });
  return s;
}
function buildSteps(e) {
  const { a, b } = e, S = a + b, sq = S * S, trap = a * a + b * b;
  return [
    { q: `Клетчатый квадрат со стороной ${S}. Как записать его площадь и чему она равна?`,
      a: `S = (${S})${PW(2)} = ${sq} клетках. Но мы хотим увидеть, из чего складывается этот квадрат.`,
      note: 'Начало урока: крупный квадрат (23 × 23 клетки) — пересчитывать долго. Спросите класс: как узнать площадь, не считая клетки по одной?',
      draw: ph => squareScene(a, b, ph ? [{ t: `(${a} + ${b})${PW(2)} = ${sq}`, cls: 'new', lc: 'acc' }] : [], { sideLabel: `сторона ${S}` }),
      rec: ph => ph ? [`S = (${a} + ${b})${PW(2)} = ${sq}`] : [] },
    { q: `Разбили сторону ${S} на ${a} и ${b}. На какие фигуры распался квадрат?`,
      a: `Два квадрата: ${a} × ${a} и ${b} × ${b}, и два одинаковых прямоугольника ${a} × ${b}.`,
      note: 'Покажите линии разреза. Пусть класс сам назовёт размеры каждой из четырёх фигур.',
      draw: ph => squareScene(a, b, [], { showSplit: true, markAB: !!ph, sideLabel: `${a} + ${b}` }),
      rec: () => [] },
    { q: `Сложим площади частей. Сколько получится?`,
      a: `<ul><li>${a} · ${a} = ${a * a} — большой квадрат</li><li>${b} · ${b} = ${b * b} — маленький квадрат</li><li>${a} · ${b} = ${a * b} — каждый прямоугольник, их ДВА</li></ul>Вместе: ${a * a} + 2 · ${a * b} + ${b * b} = ${sq}.`,
      note: 'Подкрасьте части по очереди. Главный акцент: прямоугольников два, их площадь складываем дважды — отсюда «2ab» в формуле.',
      draw: ph => squareScene(a, b, ph ? [{ t: `${a * a} + 2 · ${a * b} + ${b * b} = ${sq}`, cls: 'new', lc: 'acc' }] : [],
        { showSplit: true, colorAA: true, colorAB: true, colorBB: true, sideLabel: `${a} + ${b}` }),
      rec: ph => ph ? [`${a * a} + 2 · ${a * b} + ${b * b} = ${sq}`] : [] },
    { q: `Значит, чему равен (${V('a')} + ${V('b')})${PW(2)}? Почему нельзя записать просто ${V('a')}${PW(2)} + ${V('b')}${PW(2)}?`,
      a: `(${V('a')} + ${V('b')})${PW(2)} = ${V('ab')}${PW(2)}… точнее: ${V('a')}${PW(2)} + 2${V('ab')} + ${V('b')}${PW(2)}. Без прямоугольников получилось бы ${trap} вместо ${sq} — не хватает ровно 2ab = ${2 * a * b}.`,
      note: 'Вывод урока: квадрат суммы — ТРИ слагаемых, средний 2ab — это два прямоугольника. Ловушка (a + b)² = a² + b² рождается прямо на чертеже.',
      draw: ph => squareScene(a, b, [{ t: `(${V('a')} + ${V('b')})${PW(2)} = ${V('a')}${PW(2)} + 2${V('ab')} + ${V('b')}${PW(2)}`, lc: 'acc' },
        { t: `${a * a} + ${b * b} = ${trap} — не хватает ${2 * a * b}`, cls: ph ? 'new' : 'hide', lc: 'warm' }],
        { showSplit: true, colorAA: true, colorAB: true, colorBB: true, sideLabel: `${a} + ${b}` }),
      rec: ph => [`(${V('a')} + ${V('b')})${PW(2)} = ${V('a')}${PW(2)} + 2${V('ab')} + ${V('b')}${PW(2)}`,
        ...(ph ? [`(${a} + ${b})${PW(2)} = ${a * a} + ${2 * a * b} + ${b * b} = ${sq}`] : [])] },
    { q: `А если внутри скобки «${MINUS}»? Сравним площади: (${a} ${MINUS} ${b})${PW(2)} — это квадрат со стороной ${a - b}.`,
      a: `(${V('a')} ${MINUS} ${V('b')})${PW(2)} = ${V('a')}${PW(2)} ${MINUS} 2${V('ab')} + ${V('b')}${PW(2)}. Проверка числами: (${a} ${MINUS} ${b})${PW(2)} = ${a * a} ${MINUS} ${2 * a * b} + ${b * b} = ${(a - b) ** 2}.`,
      note: 'Из большого квадрата a² вырезали две полосы a·b — но уголок b² вырезали дважды, его возвращают. Поэтому последний член всегда «+». Спросите: почему (a − b)² = (b − a)²?',
      draw: ph => squareScene(a, b, [{ t: `(${a} ${MINUS} ${b})${PW(2)} = ${a * a} ${MINUS} ${2 * a * b} + ${b * b} = ${(a - b) ** 2}`, cls: 'new', lc: 'acc' }],
        { showSplit: true, colorAA: false, colorAB: false, colorBB: false, sideLabel: `${a} ${MINUS} ${b} = ${a - b}` }),
      rec: ph => ph ? [`${V('a')}${PW(2)} ${MINUS} 2${V('ab')} + ${V('b')}${PW(2)} = (${V('a')} ${MINUS} ${V('b')})${PW(2)}`] : [] },
  ];
}
// превью на сайте крутит шаги до previewUntil (счёт с 0); картинка-превью — шаг poster с показанным ответом
const BOARD = { previewUntil: 2, poster: 3 };

// Формулы в справке (help.html): ядро вызывает helpInit() при запуске
function helpInit() {
  const put = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  put('helpSqSum', `(${V('a')} + ${V('b')})${PW(2)} = ${V('a')}${PW(2)} + 2${V('ab')} + ${V('b')}${PW(2)}`);
  put('helpSqDif', `(${V('a')} ${MINUS} ${V('b')})${PW(2)} = ${V('a')}${PW(2)} ${MINUS} 2${V('ab')} + ${V('b')}${PW(2)}`);
  put('helpDiff', `${V('a')}${PW(2)} ${MINUS} ${V('b')}${PW(2)} = (${V('a')} ${MINUS} ${V('b')}) · (${V('a')} + ${V('b')})`);
  put('helpCubeSum', `(${V('a')} + ${V('b')})${PW(3)} = ${V('a')}${PW(3)} + 3${V('a')}${PW(2)}${V('b')} + 3${V('a')}${V('b')}${PW(2)} + ${V('b')}${PW(3)}`);
  put('helpCubeDif', `(${V('a')} ${MINUS} ${V('b')})${PW(3)} = ${V('a')}${PW(3)} ${MINUS} 3${V('a')}${PW(2)}${V('b')} + 3${V('a')}${V('b')}${PW(2)} ${MINUS} ${V('b')}${PW(3)}`);
  put('helpEx1', `(2${V('a')} + 3${V('b')})${PW(2)} = 4${V('a')}${PW(2)} + 12${V('ab')} + 9${V('b')}${PW(2)}`);
  put('helpEx2', `47² − 23² = (47 − 23) · (47 + 23) = 24 · 70 = 1680`);
  put('helpEx3', `(x + 5)${PW(2)} ${MINUS} x${PW(2)} = 10${X} + 25`);
}

// ================= Свои виды ввода =================
// poly: ответ — несколько одночленов (по числу слагаемых), mono: ответ — один одночлен.
// Каждое слагаемое: поле коэффициента и поле суммарной степени при ab (пустое = 1).
const TOPIC_INPUTS = {
  poly: {
    html: t => {
      const n = TYPES[t.type].ans(t).length;
      const row = i => `<span class="mono"><input data-k="k${i}" class="mk" inputmode="numeric" autocomplete="off" aria-label="коэффициент ${i + 1}-го слагаемого">${V('ab')}<sup><input data-k="m${i}" class="mp" inputmode="numeric" autocomplete="off" aria-label="степень ${i + 1}-го слагаемого"></sup></span>`;
      return `<div class="inrow polyn">${TYPES[t.type].text(t)} = ${Array.from({ length: n }, (_, i) => row(i)).join('<span class="plus">+</span>')} ${checkBtn}</div>` +
        '<p class="hnote">Каждое слагаемое: коэффициент и степень при <i>ab</i>. Например, 12<i>ab</i>³ — поля «12» и «3»; пустое поле — 1.</p>';
    },
    collect: get => collectMonos(get, TYPES[H.task.type].ans(H.task).length),
  },
  mono: {
    html: t => `<div class="inrow polyn">${TYPES[t.type].text(t)}<br>пропущенный одночлен: <span class="mono"><input data-k="k0" class="mk" inputmode="numeric" autocomplete="off" aria-label="коэффициент">${V('ab')}<sup><input data-k="m0" class="mp" inputmode="numeric" autocomplete="off" aria-label="степень"></sup></span> ${checkBtn}</div>` +
      '<p class="hnote">Коэффициент и степень при <i>ab</i>; пустое поле — 1.</p>',
    collect: get => {
      const r = collectMonos(get, 1);
      return Array.isArray(r) ? r[0] : r;
    },
  },
};
function collectMonos(get, n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const ks = get('k' + i).trim(), ms = get('m' + i).trim();
    if (!ks && !ms) return { empty: true, msg: `Заполни ${n > 1 ? `${i + 1}-е слагаемое` : 'одночлен'}: коэффициент и степень (пустое поле — 1).` };
    if (!/^\d+$/.test(ks || '1') || !/^\d+$/.test(ms || '1')) return { empty: true, msg: 'В полях только натуральные числа (пустое поле — 1).' };
    out.push({ k: +(ks || 1), m: +(ms || 1) });
  }
  return out;
}
