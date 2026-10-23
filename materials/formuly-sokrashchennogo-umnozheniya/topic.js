// Тема «Формулы сокращённого умножения» (7 класс, Макарычев). Только содержание — каркас даёт ядро (core/).
// Что тема обязана задать и как — ИНСТРУКЦИЯ.md, раздел «Из чего состоит тема».
// Базовые формулы: (a ± b)² = a² ± 2ab + b², a² − b² = (a − b)(a + b), (a ± b)³.
// Одночлен в задачах — объект {k, m}: k·x^m (одна буква x, m ≥ 1). У выражений A = k₁x^m₁ и B = k₂x^m₂
// показатели разные (m₁ ≠ m₂): иначе a², 2ab и b² оказались бы подобными слагаемыми и слились бы в одно.

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
const VI = v => `<i>${v}</i>`;                    // переменная курсивом
const PW = s => `<sup>${s}</sup>`;               // степень верхним регистром
const LA = VI('a'), LB = VI('b');
const sgn = s => (s > 0 ? '+' : MINUS);
const mono = x => (x.k === 1 ? '' : x.k) + X + (x.m === 1 ? '' : PW(x.m));
// сумма одночленов со знаками: [{k: 4, m: 2}, {k: −12, m: 3}] → 4x² − 12x³
const poly = xs => xs.map((x, i) => {
  const s = mono({ k: Math.abs(x.k), m: x.m });
  return i ? (x.k < 0 ? ` ${MINUS} ` : ' + ') + s : (x.k < 0 ? MINUS : '') + s;
}).join('');
const monoKey = x => `${x.k}x${x.m}`;            // ключ для таблицы букв и ответа
const polyKey = xs => xs.map(monoKey).join(',');
const sqOf = x => ({ k: x.k * x.k, m: 2 * x.m });
const crOf = (A, B) => ({ k: 2 * A.k * B.k, m: A.m + B.m });
const neg = x => ({ k: -x.k, m: x.m });
const eqm = (u, v) => !!u && !!v && u.k === v.k && u.m === v.m;
const binom = (A, s, B) => `(${mono(A)} ${sgn(s)} ${mono(B)})`;
const prodDiff = (A, B) => `(${mono(A)} ${MINUS} ${mono(B)})(${mono(A)} + ${mono(B)})`;
// формулы в тексте объяснений
const FSQ = s => `(${LA} ${sgn(s)} ${LB})${PW(2)} = ${LA}${PW(2)} ${sgn(s)} 2${LA}${LB} + ${LB}${PW(2)}`;
const FDIF = `${LA}${PW(2)} ${MINUS} ${LB}${PW(2)} = (${LA} ${MINUS} ${LB})(${LA} + ${LB})`;
const FCUBE = s => `(${LA} ${sgn(s)} ${LB})${PW(3)} = ${LA}${PW(3)} ${sgn(s)} 3${LA}${PW(2)}${LB} + 3${LA}${LB}${PW(2)} ${sgn(s)} ${LB}${PW(3)}`;

// Пара одночленов A, B с разными показателями; sign — знак в скобке
function genAB(rnd, form, kmax, mmax) {
  const A = { k: int(rnd, 1, kmax), m: int(rnd, 1, mmax) };
  let B;
  do B = { k: int(rnd, 1, kmax), m: int(rnd, 1, mmax) }; while (B.m === A.m);
  return { form, sign: form === 'sqdif' ? -1 : 1, A, B };
}

// ================= Типы заданий =================
// gen(rnd, form) — задание из зерна (никакого Math.random), text(t) — запись, ans(t) — ответ,
// ok(t) — объяснение верного, wrong(t, x) — {cat, msg} с вычислением, hints(t) — две подсказки,
// key/keyHTML — ответ для ключа, traps(t) — ловушки [{key, html}], correct/wrongInput — ответы для теста-контракта.
const bad = (cat, msg) => ({ cat, msg });

const TYPES = {
  expand: {   // раскрыть скобки: квадрат суммы, квадрат разности, произведение разности и суммы
    input: 'poly', title: 'Раскрытие скобок',
    forms: ['sqsum', 'sqdif', 'diff'],
    gen: (rnd, form) => genAB(rnd, form || pick(rnd, TYPES.expand.forms), 4, 3),
    terms: t => {
      const sa = sqOf(t.A), sb = sqOf(t.B), cr = crOf(t.A, t.B);
      return t.form === 'diff' ? [sa, neg(sb)] : [sa, t.form === 'sqdif' ? neg(cr) : cr, sb];
    },
    text: t => t.form === 'diff' ? prodDiff(t.A, t.B) : `${binom(t.A, t.sign, t.B)}${PW(2)}`,
    ask: t => `Раскройте скобки:  ${TYPES.expand.text(t)}`,
    sheet: t => `Раскройте скобки: ${TYPES.expand.text(t)}`,
    answer: t => `${TYPES.expand.text(t)} = ${poly(TYPES.expand.terms(t))}`,
    ans: t => TYPES.expand.terms(t),
    same: (t, x) => { const a = TYPES.expand.terms(t); return x.length === a.length && x.every((v, i) => eqm(v, a[i])); },
    ok(t) {
      const T = TYPES.expand, sa = sqOf(t.A), sb = sqOf(t.B), cr = crOf(t.A, t.B);
      if (t.form === 'diff') return `${FDIF}: (${mono(t.A)})${PW(2)} = ${mono(sa)}, (${mono(t.B)})${PW(2)} = ${mono(sb)}. Получаем ${poly(T.terms(t))}.`;
      return `${FSQ(t.sign)}: 2 · ${mono(t.A)} · ${mono(t.B)} = ${mono(cr)}, квадраты — ${mono(sa)} и ${mono(sb)}. Получаем ${poly(T.terms(t))}.`;
    },
    wrong(t, x) {
      const T = TYPES.expand, sa = sqOf(t.A), sb = sqOf(t.B), cr = crOf(t.A, t.B), at = T.terms(t), ok = T.ok(t);
      const ab = { k: t.A.k * t.B.k, m: t.A.m + t.B.m };
      if (t.form === 'diff') {
        if (x.length === 2 && eqm(x[0], sa) && eqm(x[1], sb))
          return bad('sign', `Между квадратами должен стоять «${MINUS}»: ${mono(sa)} ${MINUS} ${mono(sb)}, а не «+». ${ok}`);
        if (x.length === 3)
          return bad('diff', `Это не квадрат разности. В произведении суммы и разности всего ДВА слагаемых: средние члены ${mono(ab)} и ${MINUS}${mono(ab)} взаимно уничтожаются. ${ok}`);
      } else {
        if (x.length === 2 && eqm(x[0], sa) && eqm(x[1], sb))
          return bad('middle', `Ты сложил квадраты, а нужно ТРИ слагаемых: потерялось удвоенное произведение 2 · ${mono(t.A)} · ${mono(t.B)} = ${mono(cr)}. ${ok}`);
        if (x.length === 2 && eqm(x[0], sa) && eqm(x[1], neg(sb)))
          return bad('sign', `(${LA} ${sgn(t.sign)} ${LB})${PW(2)} никогда не даёт ${LA}${PW(2)} ${MINUS} ${LB}${PW(2)}: последний член — ПЛЮС квадрат второго одночлена, а в середине стоит 2${LA}${LB}. ${ok}`);
        if (x.length === 3 && eqm(x[0], sa) && eqm(x[2], sb)) {
          if (eqm(x[1], neg(at[1])))
            return bad('sign', t.sign > 0
              ? `Внутри скобки «+», значит и средний член 2${LA}${LB} со знаком «+»: 2 · ${mono(t.A)} · ${mono(t.B)} = +${mono(cr)}. ${ok}`
              : `В квадрате РАЗНОСТИ средний член со знаком «${MINUS}»: ${MINUS}2 · ${mono(t.A)} · ${mono(t.B)} = ${MINUS}${mono(cr)}. ${ok}`);
          if (x[1].m === cr.m && Math.abs(x[1].k) * 2 === cr.k)
            return bad('coef', `Средний член — УДВОЕННОЕ произведение: 2 · ${mono(t.A)} · ${mono(t.B)} = ${mono(cr)}, а ты записал одно произведение. ${ok}`);
        }
      }
      if (!eqm(x[0], sa) || !eqm(x[x.length - 1], at[at.length - 1]))
        return bad('power', `Проверь возведение в квадрат: (${mono(t.A)})${PW(2)} = ${mono(sa)} и (${mono(t.B)})${PW(2)} = ${mono(sb)} — в квадрат возводятся и коэффициент, и степень. ${ok}`);
      return bad('calc', `Проверь вычисление среднего члена. ${ok}`);
    },
    key: t => polyKey(TYPES.expand.terms(t)),
    keyHTML: t => poly(TYPES.expand.terms(t)),
    traps(t) {
      const sa = sqOf(t.A), sb = sqOf(t.B), cr = crOf(t.A, t.B);
      const out = [[sa, sb], t.form === 'sqdif' ? [sa, neg(sb)] : [sa, neg(cr), sb]];   // забыли 2ab; перепутали знак
      return out.slice(0, CONFIG.print.traps).map(xs => ({ key: polyKey(xs), html: poly(xs) }));
    },
    hints(t) {
      const sa = sqOf(t.A), sb = sqOf(t.B), cr = crOf(t.A, t.B);
      if (t.form === 'diff') return [`Произведение разности и суммы: ${FDIF.split(' = ').reverse().join(' = ')} — два слагаемых, среднего члена нет.`,
        `Квадраты: (${mono(t.A)})${PW(2)} = ${mono(sa)} и (${mono(t.B)})${PW(2)} = ${mono(sb)}, между ними «${MINUS}».`];
      return [`${FSQ(t.sign)} — три слагаемых, крайние всегда «+».`, `Начни так: ${mono(sa)} ${sgn(t.sign)} ${mono(cr)} + …`];
    },
    correct: t => TYPES.expand.ans(t),
    wrongInput: t => [{ k: sqOf(t.A).k + 2, m: sqOf(t.A).m }, ...TYPES.expand.ans(t).slice(1)],
  },
  fill: {   // восстановить пропущенный член: 2ab или 3a²b
    input: 'mono', title: 'Пропущенный член',
    forms: ['sqsum', 'sqdif', 'cube'],
    gen: (rnd, form) => {
      form = form || pick(rnd, TYPES.fill.forms);
      const t = genAB(rnd, form, form === 'cube' ? 3 : 4, form === 'cube' ? 2 : 3);
      if (form === 'cube') t.sign = rnd() < 0.5 ? 1 : -1;
      return t;
    },
    factor: t => (t.form === 'cube' ? 3 : 2),
    want: t => t.form === 'cube' ? { k: 3 * t.A.k * t.A.k * t.B.k, m: 2 * t.A.m + t.B.m } : crOf(t.A, t.B),
    text(t) {
      const q = '<span class="fmuq">?</span>';
      if (t.form === 'cube') {
        const cuA = { k: t.A.k ** 3, m: 3 * t.A.m }, cuB = { k: t.B.k ** 3, m: 3 * t.B.m }, c2 = { k: 3 * t.A.k * t.B.k * t.B.k, m: t.A.m + 2 * t.B.m };
        return `<span class="nw">${binom(t.A, t.sign, t.B)}${PW(3)} =</span> <span class="nw">${mono(cuA)} ${sgn(t.sign)} ${q} + ${mono(c2)} ${sgn(t.sign)} ${mono(cuB)}</span>`;
      }
      return `<span class="nw">${binom(t.A, t.sign, t.B)}${PW(2)} =</span> <span class="nw">${mono(sqOf(t.A))} ${sgn(t.sign)} ${q} + ${mono(sqOf(t.B))}</span>`;
    },
    ask: t => `Какой одночлен пропущен?<br>${TYPES.fill.text(t)}`,
    sheet: t => `Запишите пропущенный одночлен: ${TYPES.fill.text(t)}`,
    answer: t => `пропущен одночлен ${mono(TYPES.fill.want(t))}`,
    ans: t => TYPES.fill.want(t),
    same: (t, x) => eqm(x, TYPES.fill.want(t)),
    ok(t) {
      const T = TYPES.fill, w = T.want(t);
      if (t.form === 'cube') return `${FCUBE(t.sign)}: пропущен член 3${LA}${PW(2)}${LB} = 3 · (${mono(t.A)})${PW(2)} · ${mono(t.B)} = ${mono(w)}.`;
      return `${FSQ(t.sign)}: между квадратами стоит удвоенное произведение 2 · ${mono(t.A)} · ${mono(t.B)} = ${mono(w)}. Знак «${sgn(t.sign)}» уже записан перед пропуском.`;
    },
    wrong(t, x) {
      const T = TYPES.fill, w = T.want(t), f = T.factor(t), ok = T.ok(t);
      if (x.m === w.m && x.k * f === w.k)
        return bad('coef', `Ты забыл множитель ${f}: пропущенный член — ${f === 2 ? 'удвоенное' : 'утроенное'} произведение, а не просто произведение. ${ok}`);
      if (x.m !== w.m)
        return bad('power', `При умножении одночленов показатели складываются: ${t.form === 'cube' ? `${2 * t.A.m} + ${t.B.m}` : `${t.A.m} + ${t.B.m}`} = ${w.m}, поэтому степень равна ${w.m}. ${ok}`);
      return bad('calc', `Проверь коэффициент: ${t.form === 'cube' ? `3 · ${t.A.k}${PW(2)} · ${t.B.k}` : `2 · ${t.A.k} · ${t.B.k}`} = ${w.k}. ${ok}`);
    },
    key: t => monoKey(TYPES.fill.want(t)),
    keyHTML: t => mono(TYPES.fill.want(t)),
    traps(t) {
      const w = TYPES.fill.want(t), f = TYPES.fill.factor(t);
      return [{ k: w.k / f, m: w.m }, { k: w.k, m: w.m + 1 }].slice(0, CONFIG.print.traps).map(x => ({ key: monoKey(x), html: mono(x) }));
    },
    hints(t) {
      if (t.form === 'cube') return [FCUBE(t.sign), `Пропущен член 3${LA}${PW(2)}${LB}: коэффициент 3 · ${t.A.k}${PW(2)} · ${t.B.k}, степень ${2 * t.A.m} + ${t.B.m}.`];
      return ['Между двумя квадратами спрятано удвоенное произведение 2ab.', `Коэффициент: 2 · ${t.A.k} · ${t.B.k}; степень: ${t.A.m} + ${t.B.m}.`];
    },
    correct: t => TYPES.fill.ans(t),
    wrongInput: t => ({ k: TYPES.fill.want(t).k + 3, m: TYPES.fill.want(t).m }),
  },
  smart: {   // вычисление удобным способом: a² − b² = (a − b)(a + b)
    input: 'num', title: 'Удобным способом',
    gen: (rnd, form) => {
      form = form || pick(rnd, ['int', 'dec']);
      if (form === 'dec') return { form, k: int(rnd, 11, 99), j: int(rnd, 1, 9) };
      return { form: 'int', a: int(rnd, 16, 49), d: int(rnd, 6, 15) };
    },
    pair: t => t.form === 'dec' ? [Q(t.k, 10), Q(t.j, 10)] : [Q(t.a + t.d), Q(t.a - t.d)],
    dec: q => decStr(q) || htmlQ(q, 'frac'),
    text: t => { const E = TYPES.smart, [x, y] = E.pair(t); return `${E.dec(x)}${PW(2)} ${MINUS} ${E.dec(y)}${PW(2)}`; },
    ask: t => `Вычислите удобным способом:  ${TYPES.smart.text(t)}`,
    sheet: t => `Вычислите удобным способом: ${TYPES.smart.text(t)}`,
    ans: t => { const E = TYPES.smart, [x, y] = E.pair(t); return qsub(qmul(x, x), qmul(y, y)); },
    ok(t) {
      const E = TYPES.smart, [x, y] = E.pair(t), lo = qsub(x, y), hi = qadd(x, y);
      return `${FDIF}: (${E.dec(x)} ${MINUS} ${E.dec(y)}) · (${E.dec(x)} + ${E.dec(y)}) = ${E.dec(lo)} · ${E.dec(hi)} = ${htmlQ(E.ans(t))}.`;
    },
    wrong(t, v) {
      const E = TYPES.smart, [x, y] = E.pair(t), ok = E.ok(t);
      const xs = qmul(x, x), ys = qmul(y, y), sum = qadd(x, y), dif = qsub(x, y);
      if (qeq(v, qadd(xs, ys))) return bad('smart', `Здесь разность квадратов, а ты сложил квадраты: ${E.dec(x)}${PW(2)} + ${E.dec(y)}${PW(2)} = ${htmlQ(qadd(xs, ys))}. Нужно (${LA} ${MINUS} ${LB})(${LA} + ${LB}). ${ok}`);
      if (qeq(v, qmul(dif, dif)) || qeq(v, qmul(sum, sum))) return bad('smart', `Ты возвёл в квадрат разность (или сумму): это (${LA} ∓ ${LB})${PW(2)} — три слагаемых, а нужно ${LA}${PW(2)} ${MINUS} ${LB}${PW(2)} = (${LA} ${MINUS} ${LB})(${LA} + ${LB}). ${ok}`);
      if (qeq(v, sum) || qeq(v, dif)) return bad('smart', `Скобки нужно ПЕРЕМНОЖИТЬ: ${E.dec(dif)} · ${E.dec(sum)}, а не оставить только сумму или только разность. ${ok}`);
      return bad('calc', `Разложим по формуле и посчитаем заново. ${ok}`);
    },
    traps(t) {
      const E = TYPES.smart, [x, y] = E.pair(t);
      return [qmul(x, x), qmul(y, y)].filter(z => z.n > 0 && !qeq(z, E.ans(t))).map(z => ({ key: keyQ(z), html: htmlQ(z) })).slice(0, CONFIG.print.traps);
    },
    hints(t) {
      const E = TYPES.smart, [x, y] = E.pair(t);
      return [`Видишь разность двух квадратов — сворачивай в произведение: (${LA} ${MINUS} ${LB})(${LA} + ${LB}).`, `${LA} = ${E.dec(x)}, ${LB} = ${E.dec(y)}: ${LA} ${MINUS} ${LB} = ${E.dec(qsub(x, y))}, ${LA} + ${LB} = ${E.dec(qadd(x, y))}.`];
    },
  },
  value: {   // значение выражения a² − b² при данных значениях букв
    input: 'num', title: 'Значение выражения',
    gen: rnd => ({ r: Q(int(rnd, 12, 40), 10), s: Q(int(rnd, 1, 11), 10) }),
    text: () => `${LA}${PW(2)} ${MINUS} ${LB}${PW(2)}`,
    ask: t => `Найдите значение выражения ${TYPES.value.text(t)}<br>при ${LA} = ${decStr(t.r)}, ${LB} = ${decStr(t.s)}.`,
    sheet: t => `Найдите значение выражения ${TYPES.value.text(t)} при ${LA} = ${decStr(t.r)}, ${LB} = ${decStr(t.s)}.`,
    answer: t => `${TYPES.value.text(t)} = ${decStr(TYPES.value.ans(t))} при ${LA} = ${decStr(t.r)}, ${LB} = ${decStr(t.s)}`,
    ans: t => qsub(qmul(t.r, t.r), qmul(t.s, t.s)),
    ok(t) {
      const E = TYPES.value, lo = qsub(t.r, t.s), hi = qadd(t.r, t.s);
      return `${FDIF} = (${decStr(t.r)} ${MINUS} ${decStr(t.s)}) · (${decStr(t.r)} + ${decStr(t.s)}) = ${decStr(lo)} · ${decStr(hi)} = ${decStr(E.ans(t))}.`;
    },
    wrong(t, v) {
      const E = TYPES.value, ok = E.ok(t);
      const lo = qsub(t.r, t.s), hi = qadd(t.r, t.s);
      if (qeq(v, qmul(lo, lo))) return bad('value', `Ты возвёл в квадрат РАЗНОСТЬ: (${LA} ${MINUS} ${LB})${PW(2)} = ${decStr(qmul(lo, lo))} — это три слагаемых. Здесь разность квадратов: ${LA}${PW(2)} ${MINUS} ${LB}${PW(2)} = (${LA} ${MINUS} ${LB})(${LA} + ${LB}). ${ok}`);
      if (qeq(v, qmul(hi, hi))) return bad('value', `Это квадрат СУММЫ (${LA} + ${LB})${PW(2)} = ${decStr(qmul(hi, hi))}, а нужна разность квадратов: ${LA}${PW(2)} ${MINUS} ${LB}${PW(2)} = (${LA} ${MINUS} ${LB})(${LA} + ${LB}). ${ok}`);
      if (qeq(v, qadd(qmul(t.r, t.r), qmul(t.s, t.s)))) return bad('calc', `В выражении стоит «${MINUS}»: квадрат ${decStr(t.s)} вычитаем, а не прибавляем. ${ok}`);
      if (qeq(v, lo) || qeq(v, hi)) return bad('calc', `Это только один множитель. Второй — ${qeq(v, lo) ? `сумма: ${decStr(hi)}` : `разность: ${decStr(lo)}`}. ${ok}`);
      return bad('calc', `Подставим числа в формулу и пересчитаем. ${ok}`);
    },
    traps(t) {
      const E = TYPES.value, lo = qsub(t.r, t.s);
      return [qmul(lo, lo), qadd(qmul(t.r, t.r), qmul(t.s, t.s))]
        .filter(z => z.n > 0 && decStr(z) && !qeq(z, E.ans(t))).map(z => ({ key: keyQ(z), html: htmlQ(z) })).slice(0, CONFIG.print.traps);
    },
    hints(t) {
      return [`Не возводи в квадрат столбиком: подставь числа в ${LA}${PW(2)} ${MINUS} ${LB}${PW(2)} = (${LA} ${MINUS} ${LB})(${LA} + ${LB}).`, `${LA} ${MINUS} ${LB} = ${decStr(qsub(t.r, t.s))}, ${LA} + ${LB} = ${decStr(qadd(t.r, t.s))}.`];
    },
  },
  fact: {   // разложение на множители: выбрать верный вариант
    input: 'pick', title: 'Разложение на множители',
    forms: ['diff', 'sqsum', 'sqdif'],
    gen: (rnd, form) => {
      const t = genAB(rnd, form || pick(rnd, TYPES.fact.forms), 3, 3);
      t.o = int(rnd, 1, 1000000);   // порядок кнопок
      return t;
    },
    text(t) {
      const sa = sqOf(t.A), sb = sqOf(t.B), cr = crOf(t.A, t.B);
      return t.form === 'diff' ? `${mono(sa)} ${MINUS} ${mono(sb)}` : `${mono(sa)} ${sgn(t.sign)} ${mono(cr)} + ${mono(sb)}`;
    },
    right: t => t.form === 'diff' ? prodDiff(t.A, t.B) : `${binom(t.A, t.sign, t.B)}${PW(2)}`,
    // неверные варианты: на них же строятся кнопки, ловушки раздатки и объяснения
    wrongs(t) {
      const sa = sqOf(t.A), sb = sqOf(t.B), cr = crOf(t.A, t.B);
      if (t.form === 'diff') return [
        { key: 'fact:t1', html: `${binom(t.A, -1, t.B)}${PW(2)}`, cat: 'fact',
          why: `Это квадрат разности: (${mono(t.A)} ${MINUS} ${mono(t.B)})${PW(2)} = ${poly([sa, neg(cr), sb])} — три слагаемых, а у нас разность двух квадратов.` },
        { key: 'fact:t2', html: `${binom(t.A, 1, t.B)}${PW(2)}`, cat: 'fact',
          why: `Это квадрат суммы: (${mono(t.A)} + ${mono(t.B)})${PW(2)} = ${poly([sa, cr, sb])} — тоже три слагаемых, а у нас два.` }];
      const other = t.form === 'sqsum' ? 'sqdif' : 'sqsum', ot = { A: t.A, B: t.B, form: other, sign: -t.sign };
      return [
        { key: 'fact:t1', html: `${binom(t.A, -t.sign, t.B)}${PW(2)}`, cat: 'sign',
          why: `Знак в скобке должен совпадать со знаком перед средним членом «${sgn(t.sign)}». Скобка (${mono(t.A)} ${sgn(-t.sign)} ${mono(t.B)})${PW(2)} даёт ${poly(TYPES.expand.terms(ot))}.` },
        { key: 'fact:t2', html: prodDiff(t.A, t.B), cat: 'fact',
          why: `${prodDiff(t.A, t.B)} = ${poly([sa, neg(sb)])} — два слагаемых. У нас три, средний член ${mono(cr)}: это полный квадрат.` }];
    },
    opts: t => [{ key: 'fact:ok', html: TYPES.fact.right(t) }, ...TYPES.fact.wrongs(t).map(({ key, html }) => ({ key, html }))],
    ask: t => `Разложите на множители:<br>${TYPES.fact.text(t)}`,
    sheet: t => `Разложите на множители: ${TYPES.fact.text(t)}`,
    answer: t => `${TYPES.fact.text(t)} = ${TYPES.fact.right(t)}`,
    ans: () => 'fact:ok',
    same: (t, v) => v === 'fact:ok',
    ok: t => `Проверим обратным умножением: ${TYPES.fact.right(t)} = ${TYPES.fact.text(t)} (${t.form === 'diff' ? FDIF : FSQ(t.sign)}).`,
    wrong(t, v) {
      const T = TYPES.fact, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'fact', `${w ? w.why : 'Сравни с формулами.'} ${T.ok(t)}`);
    },
    key: () => 'fact:ok',
    keyHTML: t => TYPES.fact.right(t),
    traps: t => TYPES.fact.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints(t) {
      if (t.form === 'diff') return [`Два квадрата и «${MINUS}» между ними: ${FDIF}.`, `Из первого члена получается ${mono(t.A)}, из второго — ${mono(t.B)}.`];
      return [`Три слагаемых, крайние — квадраты, среднее — 2ab: это полный квадрат ${LA} ± ${LB} в квадрате.`, `Скобка: ${binom(t.A, t.sign, t.B)}${PW(2)}.`];
    },
    correct: () => 'fact:ok',
    wrongInput: t => TYPES.fact.wrongs(t)[0].key,
  },
  cube: {   // куб суммы и разности: выбрать верное раскрытие
    input: 'pick', title: 'Куб суммы и разности',
    gen: rnd => {
      const t = genAB(rnd, 'cube', 3, 2);
      t.sign = rnd() < 0.5 ? 1 : -1;
      t.o = int(rnd, 1, 1000000);
      return t;
    },
    parts: t => ({ cu: { k: t.A.k ** 3, m: 3 * t.A.m }, c1: { k: 3 * t.A.k ** 2 * t.B.k, m: 2 * t.A.m + t.B.m },
      c2: { k: 3 * t.A.k * t.B.k ** 2, m: t.A.m + 2 * t.B.m }, cb: { k: t.B.k ** 3, m: 3 * t.B.m } }),
    line: (t, s = t.sign) => {
      const P = TYPES.cube.parts(t);
      return `${mono(P.cu)} ${sgn(s)} ${mono(P.c1)} + ${mono(P.c2)} ${sgn(s)} ${mono(P.cb)}`;
    },
    text: t => `${binom(t.A, t.sign, t.B)}${PW(3)}`,
    ask: t => `Раскройте скобки:<br>${TYPES.cube.text(t)}`,
    sheet: t => `Раскройте скобки: ${TYPES.cube.text(t)}`,
    answer: t => `${TYPES.cube.text(t)} = ${TYPES.cube.line(t)}`,
    wrongs(t) {
      const T = TYPES.cube, P = T.parts(t), mine = t.sign > 0 ? 'все «+»' : `чередуются: «${MINUS}», «+», «${MINUS}»`;
      return [
        { key: 'cube:t1', html: T.line(t, -t.sign), cat: 'sign',
          why: `У ${t.sign > 0 ? 'суммы' : 'разности'} знаки ${mine}, а в этом ответе они как у ${t.sign > 0 ? 'разности' : 'суммы'}: ${T.line(t, -t.sign)}.` },
        { key: 'cube:t2', html: `${mono(P.cu)} ${sgn(t.sign)} ${mono(P.cb)}`, cat: 'cube',
          why: `У куба ЧЕТЫРЕ слагаемых: пропали ${mono(P.c1)} и ${mono(P.c2)} — это 3${LA}${PW(2)}${LB} и 3${LA}${LB}${PW(2)}.` }];
    },
    opts: t => [{ key: 'cube:ok', html: TYPES.cube.line(t) }, ...TYPES.cube.wrongs(t).map(({ key, html }) => ({ key, html }))],
    ans: () => 'cube:ok',
    same: (t, v) => v === 'cube:ok',
    ok: t => `Коэффициенты 1, 3, 3, 1; знаки ${t.sign > 0 ? 'все «+»' : `чередуются: «${MINUS}», «+», «${MINUS}»`}. Получаем ${TYPES.cube.line(t)}.`,
    wrong(t, v) {
      const T = TYPES.cube, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'cube', `${w ? w.why : ''} ${T.ok(t)}`);
    },
    key: () => 'cube:ok',
    keyHTML: t => TYPES.cube.line(t),
    traps: t => TYPES.cube.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints(t) {
      const P = TYPES.cube.parts(t);
      return [`${FCUBE(t.sign)} — четыре слагаемых, коэффициенты 1, 3, 3, 1.`, `Первые два члена: ${mono(P.cu)} ${sgn(t.sign)} ${mono(P.c1)} …`];
    },
    correct: () => 'cube:ok',
    wrongInput: t => TYPES.cube.wrongs(t)[0].key,
  },
};

// ================= Ошибки: блок «Над чем поработать» =================
const CATS = {
  middle: ['Забыт средний член', '(a ± b)² — это три слагаемых: a² ± 2ab + b². Средний член 2ab теряется чаще всего.'],
  sign: ['Знак в формуле', 'В (a − b)² средний член со знаком «−», а последний член всегда «+». В кубе разности знаки чередуются.'],
  diff: ['Разность квадратов', 'a² − b² = (a − b)(a + b): два множителя, среднего члена 2ab в ней нет.'],
  coef: ['Коэффициент', 'У квадрата средний член 2ab, у куба — 3a²b и 3ab²: коэффициенты 1, 3, 3, 1.'],
  power: ['Степени', 'В квадрат возводятся и коэффициент, и степень: (3x²)² = 9x⁴. При умножении показатели складываются: x² · x³ = x⁵.'],
  calc: ['Вычисления', 'Проверь арифметику: сначала скобки (разность и сумма), потом умножение.'],
  smart: ['Выбор формулы', 'a² − b² = (a − b)(a + b), а (a − b)² = a² − 2ab + b². Это разные формулы.'],
  value: ['Подстановка', 'Подставляй числа в (a − b)(a + b): действий меньше, чем при возведении в квадрат.'],
  fact: ['Разложение', 'Два квадрата и «−» — разность квадратов; три слагаемых и 2ab — полный квадрат.'],
  cube: ['Число слагаемых куба', '(a ± b)³ = a³ ± 3a²b + 3ab² ± b³ — четыре слагаемых, а не два.'],
};

// ================= Разделы тренажёра =================
const SECTIONS = [
  { title: 'Раздел 1', text: 'Раскрытие скобок', types: ['expand', 'fill'], ex: () => `(${LA} + ${LB})${PW(2)} = ?` },
  { title: 'Раздел 2', text: 'Вычисления удобно', types: ['smart', 'value'], ex: () => `47${PW(2)} ${MINUS} 23${PW(2)}` },
  { title: 'Раздел 3', text: 'Обратные формулы', types: ['fact', 'cube'], ex: () => `9${X}${PW(2)} ${MINUS} 16` },
];

// ================= Раздатка =================
// Состав варианта: девять заданий, верные ответы складываются в слово из 9 разных букв
const KINDS_V1 = [['expand', 'sqsum'], ['expand', 'sqdif'], ['expand', 'diff'], ['fill', 'sqsum'], ['fill', 'sqdif'],
  ['smart', 'int'], ['smart', 'dec'], ['value', null], ['fact', 'diff']];
const WORDS_V1 = ['ДЕЛИМОСТЬ', 'МНОЖИТЕЛЬ', 'ПРОДУКТИВ'];

const PRINT = {
  instr: 'Выполни задание и найди свой ответ в таблице букв. Впиши букву в клеточку под номером задания, и получится слово. '
    + 'Если ответа нет в таблице, поищи ошибку в решении.',
  about: 'В каждом варианте девять заданий: три на раскрытие скобок, два на пропущенный одночлен, два на вычисление '
    + 'удобным способом, одно на значение выражения и одно на разложение на множители. Девять верных ответов '
    + 'складываются в слово.',
  ogeAbout: 'Бланк как в ОГЭ: восемь заданий, ответ — число (целое или десятичная дробь). Записывай его в клеточки '
    + 'справа от номера: каждый символ, включая минус и запятую, — в отдельную клеточку. Задания бланка отличаются от '
    + 'заданий листа «кодовое слово», поэтому один и тот же номер варианта можно использовать дважды.',
};

// ================= Бланк ОГЭ =================
// Ответ — число, которое помещается в клеточки (не длиннее 10 символов). Задания свои: зерна 200+,
// поэтому лист бланка отличается от листа с кодовым словом при том же номере.
const OGE_V1 = ['dsq', 'sdec', 'sq', 'cross', 'lin', 'coef', 'cube', 'cancel'];
function ogeTask(kind, rnd) {
  if (kind === 'dsq') {           // a² − b² удобным способом
    const a = int(rnd, 31, 69), b = int(rnd, 11, 29);
    return { kind, t: [a, b], ans: String(a * a - b * b),
      ask: `Найдите значение выражения ${a}${PW(2)} ${MINUS} ${b}${PW(2)}, применив формулу сокращённого умножения.` };
  }
  if (kind === 'sdec') {          // разность квадратов десятичных дробей
    const p = int(rnd, 13, 39), q = int(rnd, 1, 9), r = qsub(qmul(Q(p, 10), Q(p, 10)), qmul(Q(q, 10), Q(q, 10)));
    return { kind, t: [p, q], ans: decStr(r),
      ask: `Найдите значение выражения ${decStr(Q(p, 10))}${PW(2)} ${MINUS} ${decStr(Q(q, 10))}${PW(2)}.` };
  }
  if (kind === 'sq') {            // (a + b)² − b² при b, кратном 10
    const a = int(rnd, 2, 15), b = 10 * int(rnd, 1, 6);
    return { kind, t: [a, b], ans: String(a * a + 2 * a * b),
      ask: `Найдите значение выражения (${LA} + ${LB})${PW(2)} ${MINUS} ${LB}${PW(2)} при ${LA} = ${a}, ${LB} = ${b}.` };
  }
  if (kind === 'cross') {         // (a + b)² − (a − b)² = 4ab
    const a = int(rnd, 2, 15), b = int(rnd, 1, 9);
    return { kind, t: [a, b], ans: String(4 * a * b),
      ask: `Найдите значение выражения (${LA} + ${LB})${PW(2)} ${MINUS} (${LA} ${MINUS} ${LB})${PW(2)} при ${LA} = ${a}, ${LB} = ${b}.` };
  }
  if (kind === 'lin') {           // (x + c)² − x² = m → линейное уравнение, корень целый
    const c = int(rnd, 2, 9), x = int(rnd, 2, 12), m = 2 * c * x + c * c;
    return { kind, t: [c, x], ans: String(x),
      ask: `Решите уравнение (${X} + ${c})${PW(2)} ${MINUS} ${X}${PW(2)} = ${m}. В ответ запишите корень.` };
  }
  if (kind === 'coef') {          // какой одночлен стоит вместо □ — в ответ номер
    const g = genAB(rnd, 'sqsum', 3, 3), w = crOf(g.A, g.B);
    const list = shuffle(rnd, [w, { k: w.k / 2, m: w.m }, { k: w.k * 2, m: w.m }, { k: w.k, m: w.m + 1 }]);
    const no = list.findIndex(z => eqm(z, w)) + 1;
    return { kind, t: [g.A.k, g.A.m, g.B.k, g.B.m, no], ans: String(no),
      ask: `Какой из одночленов нужно записать вместо ${VI('□')}, чтобы получилось тождество<br>` +
        `<span class="nw">(${mono(g.A)} + ${mono(g.B)})${PW(2)} = ${mono(sqOf(g.A))} + ${VI('□')} + ${mono(sqOf(g.B))}?</span><br>` +
        list.map((z, i) => `<span class="nw">${i + 1}) ${mono(z)}</span>`).join('; ') + '. В ответ запишите номер.' };
  }
  if (kind === 'cube') {          // собрать куб разности по формуле и подставить
    const a = int(rnd, 8, 15), b = int(rnd, 1, 7);
    return { kind, t: [a, b], ans: String((a - b) ** 3),
      ask: `Найдите значение выражения ${LA}${PW(3)} ${MINUS} 3${LA}${PW(2)}${LB} + 3${LA}${LB}${PW(2)} ${MINUS} ${LB}${PW(3)} при ${LA} = ${a}, ${LB} = ${b}.` };
  }
  // упрощение, после которого буква исчезает: (a − c)² − a(a − 2c) = c²
  const c = int(rnd, 2, 12), a = int(rnd, 11, 99);
  return { kind: 'cancel', t: [c, a], ans: String(c * c),
    ask: `Найдите значение выражения (${LA} ${MINUS} ${c})${PW(2)} ${MINUS} ${LA}(${LA} ${MINUS} ${2 * c}) при ${LA} = ${a}.` };
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
// Подписи на чертеже — SVG-текст: курсив и степень через tspan и «²» (теги <i> и <sup> в SVG не работают)
const si = v => `<tspan font-style="italic">${v}</tspan>`;
const SAB = `${si('a')}${si('b')}`;
// Размеры чертежа: клетчатый квадрат слева (не выше 250 по оси y), под ним скобка и подпись, подписи шагов справа
const BOARD_SIDE = 250, BOARD_X = 90, BOARD_Y = 52, BOARD_TEXT_X = 540;
const boardLines = (lines, y0 = 110) => lines.map((l, i) =>
  `<g class="${l.cls || ''}">${tx(BOARD_TEXT_X, y0 + i * 58, l.t, 'lab s' + (l.lc ? ' ' + l.lc : ''), 'start')}</g>`).join('');
// сетка клеток поверх цветных частей: заливка — отдельно, линии — через grid с прозрачной заливкой
const cellLines = (x, y, n, unit) => grid(x, y, n, n, unit, 'gn', 5);
// Квадрат со стороной (a + b), разрезанный на a², b² и два прямоугольника ab
function squareScene(a, b, lines = [], opt = {}) {
  const n = a + b, unit = Math.max(4, Math.floor(BOARD_SIDE / n)), size = n * unit, x = BOARD_X, y = BOARD_Y;
  const ca = a * unit, cb = b * unit;
  let s = `<rect class="ge" x="${x}" y="${y}" width="${size}" height="${size}"/>`;
  if (opt.colorAA) s += `<rect class="gs" x="${x}" y="${y}" width="${ca}" height="${ca}"/>`;
  if (opt.colorAB) s += `<rect class="gw" x="${x + ca}" y="${y}" width="${cb}" height="${ca}"/><rect class="gw" x="${x}" y="${y + ca}" width="${ca}" height="${cb}"/>`;
  if (opt.colorBB) s += `<rect class="gs" x="${x + ca}" y="${y + ca}" width="${cb}" height="${cb}"/>`;
  s += cellLines(x, y, n, unit);
  if (opt.showSplit) s += `<line class="gf" x1="${x + ca}" x2="${x + ca}" y1="${y}" y2="${y + size}"/><line class="gf" x1="${x}" x2="${x + size}" y1="${y + ca}" y2="${y + ca}"/>`;
  s += under(x, y + size, size, opt.sideLabel, 'warm');
  if (opt.markAB) s += tx(x + ca / 2, y - 14, String(a), 'lab acc') + tx(x + ca + cb / 2, y - 14, String(b), 'lab warm');
  return s + boardLines(lines);
}
// Квадрат со стороной a, из которого вырезаны две полосы шириной b: остаётся квадрат (a − b)²
function diffScene(a, b, lines = []) {
  const unit = Math.max(4, Math.floor(BOARD_SIDE / a)), size = a * unit, x = BOARD_X, y = BOARD_Y;
  const ci = (a - b) * unit, cb = b * unit;
  let s = `<rect class="ge" x="${x}" y="${y}" width="${size}" height="${size}"/>`;
  s += `<rect class="gs" x="${x}" y="${y}" width="${ci}" height="${ci}"/>`;
  s += `<rect class="gw" x="${x + ci}" y="${y}" width="${cb}" height="${size}"/><rect class="gw" x="${x}" y="${y + ci}" width="${size}" height="${cb}"/>`;
  s += cellLines(x, y, a, unit);
  s += `<rect class="gx" x="${x + ci}" y="${y + ci}" width="${cb}" height="${cb}"/>`;
  s += under(x, y + size, size, String(a), 'warm');
  s += tx(x + ci / 2, y - 14, String(a - b), 'lab acc') + tx(x + ci + cb / 2, y - 14, String(b), 'lab warm');
  return s + boardLines(lines);
}
function buildSteps(e) {
  const { a, b } = e, S = a + b, sq = S * S, trap = a * a + b * b, mid = 2 * a * b, dif = (a - b) * (a - b);
  const formula = `(${si('a')} + ${si('b')})² = ${si('a')}² + 2${SAB} + ${si('b')}²`;
  return [
    { q: `Клетчатый квадрат со стороной ${S}. Как найти его площадь, не считая клетки по одной?`,
      a: `S = ${S}${PW(2)} = ${sq} клеток. А из чего складывается эта площадь, если сторону разбить на ${a} и ${b}?`,
      note: `Начало урока: крупный квадрат (${S} × ${S} клеток) — пересчитывать долго. Спросите класс: как узнать площадь, не считая клетки по одной?`,
      draw: ph => squareScene(a, b, ph ? [{ t: `(${a} + ${b})² = ${sq}`, cls: 'new', lc: 'acc' }] : [], { sideLabel: `сторона ${S}` }),
      rec: ph => ph ? [`S = (${a} + ${b})${PW(2)} = ${sq}`] : [] },
    { q: `Разбили сторону ${S} на ${a} и ${b}. На какие фигуры распался квадрат?`,
      a: `Два квадрата: ${a} × ${a} и ${b} × ${b}, и два одинаковых прямоугольника ${a} × ${b}.`,
      note: 'Покажите линии разреза. Пусть класс сам назовёт размеры каждой из четырёх фигур.',
      draw: ph => squareScene(a, b, [], { showSplit: true, markAB: !!ph, sideLabel: `${a} + ${b}` }),
      rec: () => [] },
    { q: 'Сложим площади частей. Сколько получится?',
      a: `<ul><li>${a} · ${a} = ${a * a} — большой квадрат</li><li>${b} · ${b} = ${b * b} — маленький квадрат</li><li>${a} · ${b} = ${a * b} — каждый прямоугольник, их ДВА</li></ul>Вместе: ${a * a} + 2 · ${a * b} + ${b * b} = ${sq}.`,
      note: 'Подкрасьте части по очереди. Главный акцент: прямоугольников два, их площадь складываем дважды — отсюда «2ab» в формуле.',
      draw: ph => squareScene(a, b, ph ? [
        { t: `${a} · ${a} = ${a * a}`, cls: 'new', lc: 'acc' },
        { t: `2 · ${a} · ${b} = ${mid}`, cls: 'new', lc: 'warm' },
        { t: `${b} · ${b} = ${b * b}`, cls: 'new', lc: 'acc' },
        { t: `${a * a} + ${mid} + ${b * b} = ${sq}`, cls: 'new' }] : [],
      { showSplit: true, colorAA: true, colorAB: true, colorBB: true, markAB: true, sideLabel: `${a} + ${b}` }),
      rec: ph => ph ? [`${a * a} + 2 · ${a * b} + ${b * b} = ${sq}`] : [] },
    { q: `Значит, чему равен (${LA} + ${LB})${PW(2)}? Почему нельзя записать просто ${LA}${PW(2)} + ${LB}${PW(2)}?`,
      a: `(${LA} + ${LB})${PW(2)} = ${LA}${PW(2)} + 2${LA}${LB} + ${LB}${PW(2)}. Если взять только ${LA}${PW(2)} + ${LB}${PW(2)}, получится ${trap} вместо ${sq}: не хватает ровно 2${LA}${LB} = ${mid}.`,
      note: 'Вывод урока: квадрат суммы — ТРИ слагаемых, средний 2ab — это два прямоугольника. Ловушка (a + b)² = a² + b² рождается прямо на чертеже.',
      draw: ph => squareScene(a, b, [{ t: formula, lc: 'acc' }].concat(ph ? [
        { t: `${a}² + ${b}² = ${trap}`, cls: 'new', lc: 'warm' },
        { t: `${sq} − ${trap} = ${mid} — это 2${SAB}`, cls: 'new', lc: 'warm' }] : []),
      { showSplit: true, colorAA: true, colorAB: true, colorBB: true, sideLabel: `${a} + ${b}` }),
      rec: ph => [`(${LA} + ${LB})${PW(2)} = ${LA}${PW(2)} + 2${LA}${LB} + ${LB}${PW(2)}`,
        ...(ph ? [`(${a} + ${b})${PW(2)} = ${a * a} + ${mid} + ${b * b} = ${sq}`] : [])] },
    { q: `А если внутри скобки «${MINUS}»? Возьмём квадрат со стороной ${a} и «срежем» с двух сторон полосы шириной ${b}.`,
      a: `(${LA} ${MINUS} ${LB})${PW(2)} = ${LA}${PW(2)} ${MINUS} 2${LA}${LB} + ${LB}${PW(2)}. Проверка числами: (${a} ${MINUS} ${b})${PW(2)} = ${a * a} ${MINUS} ${mid} + ${b * b} = ${dif}.`,
      note: 'Из большого квадрата a² вырезали две полосы a·b, но угловой квадратик b² попал в обе полосы — его вычли дважды. Его возвращают: поэтому последний член всегда «+». Спросите: почему (a − b)² = (b − a)²?',
      draw: ph => diffScene(a, b, [{ t: `(${a} ${MINUS} ${b})² = ${a - b}² = ${dif}`, cls: 'new', lc: 'acc' }].concat(ph ? [
        { t: `${a}² ${MINUS} 2 · ${a * b} + ${b}²`, cls: 'new', lc: 'warm' },
        { t: `${a * a} ${MINUS} ${mid} + ${b * b} = ${dif}`, cls: 'new', lc: 'warm' }] : [])),
      rec: ph => ph ? [`${LA}${PW(2)} ${MINUS} 2${LA}${LB} + ${LB}${PW(2)} = (${LA} ${MINUS} ${LB})${PW(2)}`] : [] },
  ];
}
// превью на сайте крутит шаги до previewUntil (счёт с 0); картинка-превью — шаг poster с показанным ответом
const BOARD = { previewUntil: 2, poster: 3 };

// Формулы в справке (help.html): ядро вызывает helpInit() при запуске
function helpInit() {
  const put = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  put('helpSqSum', FSQ(1));
  put('helpSqDif', FSQ(-1));
  put('helpDiff', FDIF);
  put('helpCubeSum', FCUBE(1));
  put('helpCubeDif', FCUBE(-1));
  put('helpEx1', `(2${X} + 3)${PW(2)} = 4${X}${PW(2)} + 12${X} + 9`);
  put('helpEx2', `47${PW(2)} ${MINUS} 23${PW(2)} = (47 ${MINUS} 23)(47 + 23) = 24 · 70 = 1680`);
  put('helpEx3', `(${X} + 5)${PW(2)} ${MINUS} ${X}${PW(2)} = 10${X} + 25`);
}

// ================= Свои виды ввода =================
// poly: ответ — несколько одночленов со знаками, mono: ответ — один одночлен, pick: выбор одной из кнопок.
// Каждое слагаемое: поле коэффициента и поле степени при x (пустое поле = 1); знак — в списке перед слагаемым.
const monoRow = i => `<span class="mono"><input data-k="k${i}" class="mk" inputmode="numeric" autocomplete="off" aria-label="коэффициент ${i + 1}-го слагаемого">${X}<sup><input data-k="m${i}" class="mp" inputmode="numeric" autocomplete="off" aria-label="степень ${i + 1}-го слагаемого"></sup></span>`;
const signSelect = i => `<select data-k="s${i}" class="sg" aria-label="знак перед ${i + 1}-м слагаемым"><option value="+">+</option><option value="${MINUS}">${MINUS}</option></select>`;
const TOPIC_INPUTS = {
  poly: {
    html: t => {
      const n = TYPES[t.type].ans(t).length;
      return `<div class="inrow polyn"><span class="nw">${TYPES[t.type].text(t)} =</span> ${Array.from({ length: n }, (_, i) => (i ? signSelect(i) : '') + monoRow(i)).join(' ')} ${checkBtn}</div>` +
        `<p class="hnote">Каждое слагаемое: коэффициент и степень при <i>x</i>. Например, 12<i>x</i>³ — поля «12» и «3»; пустое поле — 1. Знак перед слагаемым выбери в списке.</p>`;
    },
    collect: get => collectMonos(get, TYPES[H.task.type].ans(H.task).length, true),
  },
  mono: {
    html: t => `<div class="inrow polyn"><span class="nw">${TYPES[t.type].text(t)}</span></div><div class="inrow polyn">пропущенный одночлен: ${monoRow(0)} ${checkBtn}</div>` +
      '<p class="hnote">Коэффициент и степень при <i>x</i>; пустое поле — 1.</p>',
    collect: get => {
      const r = collectMonos(get, 1, false);
      return Array.isArray(r) ? r[0] : r;
    },
  },
  pick: {
    html: t => `<div class="inrow picks">${shuffle(mulberry32(t.o), TYPES[t.type].opts(t))
      .map(o => `<button type="button" class="choice" data-choice="${o.key}"><span class="nw">${o.html}</span></button>`).join('')}</div>` +
      '<p class="hnote">Выбери верный ответ.</p>',
    collect: () => null,
  },
};
function collectMonos(get, n, signs) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const ks = get('k' + i).trim(), ms = get('m' + i).trim();
    if (!ks && !ms) return { empty: true, msg: `Заполни ${n > 1 ? `${i + 1}-е слагаемое` : 'одночлен'}: коэффициент и степень (пустое поле — 1).` };
    if (!/^\d+$/.test(ks || '1') || !/^\d+$/.test(ms || '1')) return { empty: true, msg: 'В полях только натуральные числа (пустое поле — 1). Знак выбирается в списке.' };
    out.push({ k: (signs && i && get('s' + i) === MINUS ? -1 : 1) * +(ks || 1), m: +(ms || 1) });
  }
  return out;
}
