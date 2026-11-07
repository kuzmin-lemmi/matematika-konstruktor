// Тема «Сложение, вычитание, умножение многочленов» (7 класс, Макарычев, уроки 29–34).
// Только содержание — каркас даёт ядро (core/). Ответы — выбор верного результата (input pick)
// и «да/нет» (input choice). Ключи pick зависят от задания (иначе домино не соберётся).

// ================= Параметры: учитель может поменять их за минуту =================
const CONFIG = {
  board: {
    a: 2, b: 3,            // первый пример на доске: прямоугольник (x + 2)(x + 3)
    previewDelay: 1700,   // превью на сайте: пауза между шагами, мс
  },
  print: {
    variants: 25,         // сколько вариантов печатать по умолчанию
    traps: 2,             // сколько ответов-ловушек на задание в таблице букв
    space: true,          // сетка для решения под каждым заданием
  },
  home: {
    round: 10,            // заданий в тренировке
    points: [10, 15, 10], // очки за задание по разделам (столько чисел, сколько разделов)
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
// сумма ненулевых одночленов со знаками (нулевые пропускаем)
const tpoly = xs => {
  const nz = xs.filter(z => z.k !== 0);
  if (!nz.length) return '0';
  return nz.map((x, i) => {
    const s = tm0(x);
    return i ? (x.k < 0 ? ` ${MINUS} ` : ' + ') + s : (x.k < 0 ? MINUS : '') + s;
  }).join('');
};
const tkey = z => `${z.k}x${z.m}`;

// ================= Типы заданий =================
const bad = (cat, msg) => ({ cat, msg });
// трёхчлен с ненулевыми коэффициентами при x², x и свободным членом
const tri = rnd => ({ c2: int(rnd, 1, 6) * (rnd() < 0.3 ? -1 : 1), c1: int(rnd, 1, 6) * (rnd() < 0.3 ? -1 : 1), c0: int(rnd, 1, 6) * (rnd() < 0.3 ? -1 : 1) });
const triTerms = T => [{ k: T.c2, v: 'x', m: 2 }, { k: T.c1, v: 'x', m: 1 }, { k: T.c0, v: '', m: 0 }];
const triText = T => tpoly(triTerms(T));

const TYPES = {
  add: {   // (2x² + 3x + 1) + (x² − x + 4)
    input: 'pick', title: 'Сложение многочленов',
    statement: (t, html) => `${TYPES.add.text(t)} = ${html}`,
    gen: rnd => ({ P: tri(rnd), Q: tri(rnd), o: int(rnd, 1, 1000000) }),
    sum: t => ({ c2: t.P.c2 + t.Q.c2, c1: t.P.c1 + t.Q.c1, c0: t.P.c0 + t.Q.c0 }),
    bad: t => {
      const s = TYPES.add.sum(t);
      if (s.c2 === 0 || s.c1 === 0 || s.c0 === 0) return true;
      return [t.P.c2, t.P.c1, t.P.c0, t.Q.c2, t.Q.c1, t.Q.c0].every(k => k > 0);   // иначе ловушка «сумма модулей» совпадёт с ответом
    },
    text: t => `(${triText(t.P)}) + (${triText(t.Q)})`,
    right(t) { const s = TYPES.add.sum(t); return tpoly([{ k: s.c2, v: 'x', m: 2 }, { k: s.c1, v: 'x', m: 1 }, { k: s.c0, v: '', m: 0 }]); },
    ask: t => `Выполните сложение:<br>${TYPES.add.text(t)}`,
    sheet: t => `Выполните сложение: ${TYPES.add.text(t)}`,
    answer: t => `${TYPES.add.text(t)} = ${TYPES.add.right(t)}`,
    wrongs(t) {
      const s = TYPES.add.sum(t);
      const abs = { c2: Math.abs(t.P.c2) + Math.abs(t.Q.c2), c1: Math.abs(t.P.c1) + Math.abs(t.Q.c1), c0: Math.abs(t.P.c0) + Math.abs(t.Q.c0) };
      const drop = { c2: s.c2, c1: s.c1, c0: 0 };
      return [
        { key: 'add:t1', html: tpoly([{ k: abs.c2, v: 'x', m: 2 }, { k: abs.c1, v: 'x', m: 1 }, { k: abs.c0, v: '', m: 0 }]), cat: 'sign',
          why: `Ты сложил модули без учёта знаков. Складывай со знаками: ${TYPES.add.right(t)}.` },
        { key: 'add:t2', html: tpoly([{ k: drop.c2, v: 'x', m: 2 }, { k: drop.c1, v: 'x', m: 1 }]), cat: 'drop',
          why: `Ты потерял свободный член: ${t.P.c0} + ${t.Q.c0} = ${s.c0}. Правильно: ${TYPES.add.right(t)}.` }];
    },
    opts: t => [{ key: 'add:ok', html: TYPES.add.right(t) }, ...TYPES.add.wrongs(t).map(({ key, html }) => ({ key, html }))],
    ans: () => 'add:ok',
    same: (t, v) => v === 'add:ok',
    ok: t => `Складываем подобное с подобным: ${TYPES.add.text(t)} = ${TYPES.add.right(t)}.`,
    wrong(t, v) {
      const T = TYPES.add, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'sign', `${w ? w.why : 'Сравни с правилом.'} ${T.ok(t)}`);
    },
    key: t => `add:${t.P.c2},${t.P.c1},${t.P.c0}+${t.Q.c2},${t.Q.c1},${t.Q.c0}`,
    keyHTML: t => TYPES.add.right(t),
    traps: t => TYPES.add.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints: () => [`Складывай подобное с подобным: x² с x², x с x, числа с числами.`, `Знаки учитывай: плюс на минус даёт минус.`],
    correct: () => 'add:ok',
    wrongInput: t => TYPES.add.wrongs(t)[0].key,
  },
  sub: {   // (5x² + 2x + 1) − (3x² − x + 4)
    input: 'pick', title: 'Вычитание многочленов',
    statement: (t, html) => `${TYPES.sub.text(t)} = ${html}`,
    gen: rnd => ({ P: tri(rnd), Q: tri(rnd), o: int(rnd, 1, 1000000) }),
    dif: t => ({ c2: t.P.c2 - t.Q.c2, c1: t.P.c1 - t.Q.c1, c0: t.P.c0 - t.Q.c0 }),
    bad: t => { const s = TYPES.sub.dif(t); return s.c2 === 0 || s.c1 === 0 || s.c0 === 0; },
    text: t => `(${triText(t.P)}) ${MINUS} (${triText(t.Q)})`,
    right(t) { const s = TYPES.sub.dif(t); return tpoly([{ k: s.c2, v: 'x', m: 2 }, { k: s.c1, v: 'x', m: 1 }, { k: s.c0, v: '', m: 0 }]); },
    ask: t => `Выполните вычитание:<br>${TYPES.sub.text(t)}`,
    sheet: t => `Выполните вычитание: ${TYPES.sub.text(t)}`,
    answer: t => `${TYPES.sub.text(t)} = ${TYPES.sub.right(t)}`,
    wrongs(t) {
      const s = TYPES.sub.dif(t);
      const nosub = { c2: t.P.c2 + t.Q.c2, c1: t.P.c1 + t.Q.c1, c0: t.P.c0 + t.Q.c0 };
      const half = { c2: s.c2, c1: t.P.c1 + t.Q.c1, c0: s.c0 };
      return [
        { key: 'sub:t1', html: tpoly([{ k: nosub.c2, v: 'x', m: 2 }, { k: nosub.c1, v: 'x', m: 1 }, { k: nosub.c0, v: '', m: 0 }]), cat: 'sign',
          why: `Ты прибавил вторую скобку, а её надо ВЫЧЕСТЬ: минус меняет все знаки. Правильно: ${TYPES.sub.right(t)}.` },
        { key: 'sub:t2', html: tpoly([{ k: half.c2, v: 'x', m: 2 }, { k: half.c1, v: 'x', m: 1 }, { k: half.c0, v: '', m: 0 }]), cat: 'sign',
          why: `Минус относится к КАЖДОМУ члену вычитаемого, а не только к первому: ${t.P.c1} ${MINUS} (${t.Q.c1}) = ${s.c1}. Правильно: ${TYPES.sub.right(t)}.` }];
    },
    opts: t => [{ key: 'sub:ok', html: TYPES.sub.right(t) }, ...TYPES.sub.wrongs(t).map(({ key, html }) => ({ key, html }))],
    ans: () => 'sub:ok',
    same: (t, v) => v === 'sub:ok',
    ok: t => `Раскрываем минус (все знаки меняются) и складываем подобное: ${TYPES.sub.text(t)} = ${TYPES.sub.right(t)}.`,
    wrong(t, v) {
      const T = TYPES.sub, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'sign', `${w ? w.why : 'Сравни с правилом.'} ${T.ok(t)}`);
    },
    key: t => `sub:${t.P.c2},${t.P.c1},${t.P.c0}-${t.Q.c2},${t.Q.c1},${t.Q.c0}`,
    keyHTML: t => TYPES.sub.right(t),
    traps: t => TYPES.sub.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints: () => [`Минус перед скобкой меняет все знаки внутри неё.`, `Дальше — как сложение: подобное с подобным.`],
    correct: () => 'sub:ok',
    wrongInput: t => TYPES.sub.wrongs(t)[0].key,
  },
  mul2: {   // (x + a)(x + b)
    input: 'pick', title: 'Произведение двучленов',
    statement: (t, html) => `${TYPES.mul2.text(t)} = ${html}`,
    gen: rnd => ({ a: int(rnd, 2, 6) * (rnd() < 0.4 ? -1 : 1), b: int(rnd, 2, 6) * (rnd() < 0.4 ? -1 : 1), o: int(rnd, 1, 1000000) }),
    bad: t => t.a + t.b === 0 || (t.a === 2 && t.b === 2),   // 2·2 = 2 + 2: ловушка «средний — произведение» совпала бы с ответом
    text: t => `(${X} ${t.a < 0 ? MINUS : '+'} ${Math.abs(t.a)})(${X} ${t.b < 0 ? MINUS : '+'} ${Math.abs(t.b)})`,
    terms: t => [{ k: 1, v: 'x', m: 2 }, { k: t.a + t.b, v: 'x', m: 1 }, { k: t.a * t.b, v: '', m: 0 }],
    right: t => tpoly(TYPES.mul2.terms(t)),
    ask: t => `Выполните умножение:<br>${TYPES.mul2.text(t)}`,
    sheet: t => `Выполните умножение: ${TYPES.mul2.text(t)}`,
    answer: t => `${TYPES.mul2.text(t)} = ${TYPES.mul2.right(t)}`,
    wrongs(t) {
      return [
        { key: 'mul2:t1', html: tpoly([{ k: 1, v: 'x', m: 2 }, { k: t.a * t.b, v: '', m: 0 }]), cat: 'middle',
          why: `Ты потерял средний член: ${X} · ${t.b < 0 ? `(${t.b})` : t.b} + ${t.a < 0 ? `(${t.a})` : t.a} · ${X} = ${t.a + t.b}${X}. Правильно: ${TYPES.mul2.right(t)}.` },
        { key: 'mul2:t2', html: tpoly([{ k: 1, v: 'x', m: 2 }, { k: t.a * t.b, v: 'x', m: 1 }, { k: t.a * t.b, v: '', m: 0 }]), cat: 'midcoef',
          why: `Средний член — СУММА, а не произведение: ${X} · ${t.b} + ${t.a} · ${X} = ${t.a + t.b}${X}, а не ${t.a * t.b}${X}. Правильно: ${TYPES.mul2.right(t)}.` }];
    },
    opts: t => [{ key: 'mul2:ok', html: TYPES.mul2.right(t) }, ...TYPES.mul2.wrongs(t).map(({ key, html }) => ({ key, html }))],
    ans: () => 'mul2:ok',
    same: (t, v) => v === 'mul2:ok',
    ok: t => `Каждый на каждый: ${X} · ${X} = ${X}${PW(2)}, ${X} · ${t.b} + ${t.a} · ${X} = ${t.a + t.b}${X}, ${t.a} · ${t.b} = ${t.a * t.b}. Получаем ${TYPES.mul2.right(t)}.`,
    wrong(t, v) {
      const T = TYPES.mul2, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'middle', `${w ? w.why : 'Сравни с правилом.'} ${T.ok(t)}`);
    },
    key: t => `mul2:${t.a},${t.b}`,
    keyHTML: t => TYPES.mul2.right(t),
    traps: t => TYPES.mul2.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints(t) { const T = TYPES.mul2; return [`Каждый член первой скобки умножь на каждый член второй — получится 4 произведения.`, `Средний член: ${X} · ${t.b} + ${t.a} · ${X}.`]; },
    correct: () => 'mul2:ok',
    wrongInput: t => TYPES.mul2.wrongs(t)[0].key,
  },
  prod: {   // (ax + b)(cx + d)
    input: 'pick', title: 'Умножение многочленов',
    statement: (t, html) => `${TYPES.prod.text(t)} = ${html}`,
    gen: rnd => ({ a: int(rnd, 2, 4), b: int(rnd, 1, 5), c: int(rnd, 2, 4), d: int(rnd, 1, 5), o: int(rnd, 1, 1000000) }),
    bad: t => t.a === 2 && t.c === 2,   // 2 + 2 = 2 · 2: ловушка «коэффициенты сложить» совпала бы с ответом
    terms: t => [{ k: t.a * t.c, v: 'x', m: 2 }, { k: t.a * t.d + t.b * t.c, v: 'x', m: 1 }, { k: t.b * t.d, v: '', m: 0 }],
    right: t => tpoly(TYPES.prod.terms(t)),
    ask: t => `Выполните умножение:<br>${TYPES.prod.text(t)}`,
    sheet: t => `Выполните умножение: ${TYPES.prod.text(t)}`,
    answer: t => `${TYPES.prod.text(t)} = ${TYPES.prod.right(t)}`,
    text: t => `(${t.a}${X} + ${t.b})(${t.c}${X} + ${t.d})`,
    wrongs(t) {
      return [
        { key: 'prod:t1', html: tpoly([{ k: t.a * t.c, v: 'x', m: 2 }, { k: t.b * t.d, v: '', m: 0 }]), cat: 'middle',
          why: `Ты потерял средний член: ${t.a}${X} · ${t.d} + ${t.b} · ${t.c}${X} = ${t.a * t.d + t.b * t.c}${X}. Правильно: ${TYPES.prod.right(t)}.` },
        { key: 'prod:t2', html: tpoly([{ k: t.a + t.c, v: 'x', m: 2 }, { k: t.a * t.d + t.b * t.c, v: 'x', m: 1 }, { k: t.b * t.d, v: '', m: 0 }]), cat: 'firstcoef',
          why: `Коэффициенты при ${X}${PW(2)} умножаются, а не складываются: ${t.a}${X} · ${t.c}${X} = ${t.a * t.c}${X}${PW(2)}. Правильно: ${TYPES.prod.right(t)}.` }];
    },
    opts: t => [{ key: 'prod:ok', html: TYPES.prod.right(t) }, ...TYPES.prod.wrongs(t).map(({ key, html }) => ({ key, html }))],
    ans: () => 'prod:ok',
    same: (t, v) => v === 'prod:ok',
    ok: t => `Каждый на каждый: ${t.a}${X} · ${t.c}${X} = ${t.a * t.c}${X}${PW(2)}, средний ${t.a * t.d + t.b * t.c}${X}, свободный ${t.b * t.d}. Получаем ${TYPES.prod.right(t)}.`,
    wrong(t, v) {
      const T = TYPES.prod, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'middle', `${w ? w.why : 'Сравни с правилом.'} ${T.ok(t)}`);
    },
    key: t => `prod:${t.a},${t.b},${t.c},${t.d}`,
    keyHTML: t => TYPES.prod.right(t),
    traps: t => TYPES.prod.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints(t) { const T = TYPES.prod; return [`Каждый на каждый — 4 произведения, потом подобные.`, `Старший коэффициент: ${t.a} · ${t.c}.`]; },
    correct: () => 'prod:ok',
    wrongInput: t => TYPES.prod.wrongs(t)[0].key,
  },
  check: {   // верно ли равенство
    input: 'choice', title: 'Верно ли равенство', options: [['да', 'Да'], ['нет', 'Нет']], oral: true,
    statement: (t, html) => `${TYPES.check.text(t)} — ${html}`,
    gen: rnd => ({ a: int(rnd, 1, 6), b: int(rnd, 1, 6), c: int(rnd, 1, 6), d: int(rnd, 1, 6), v: pick(rnd, ['add', 'sub', 'mul']) }),
    pair(t) {
      if (t.v === 'sub') return { q: `(${t.a}${X} + ${t.b}) ${MINUS} (${t.c}${X} + ${t.d}) = ${t.a - t.c}${X} + ${t.b + t.d}`, good: false,
        why: `минус меняет все знаки: ${t.b} ${MINUS} ${t.d} = ${t.b - t.d}, а не ${t.b + t.d}` };
      if (t.v === 'mul') return { q: `(${X} + ${t.a})(${X} + ${t.b}) = ${X}${PW(2)} + ${t.a * t.b}`, good: false,
        why: `потерян средний член: ${X} · ${t.b} + ${t.a} · ${X} = ${t.a + t.b}${X}` };
      return { q: `(${t.a}${X} + ${t.b}) + (${t.c}${X} + ${t.d}) = ${t.a + t.c}${X} + ${t.b + t.d}`, good: true, why: '' };
    },
    text: t => TYPES.check.pair(t).q,
    ask: t => `Верно ли равенство?<br>${TYPES.check.text(t)}`,
    sheet: t => `Верно ли равенство: ${TYPES.check.text(t)}?`,
    answer(t) { const p = TYPES.check.pair(t); return `${p.q} — ${p.good ? 'верно' : 'неверно'}`; },
    ans: t => TYPES.check.pair(t).good ? 'да' : 'нет',
    ok(t) { const p = TYPES.check.pair(t); return p.good ? `Да: подобное с подобным — всё сошлось.` : `Нет: ${p.why}.`; },
    wrong(t) { const p = TYPES.check.pair(t); return bad('trust', p.good
      ? `Не торопись отвечать «нет»: сложи подобное с подобным — ${t.a} + ${t.c} = ${t.a + t.c}, ${t.b} + ${t.d} = ${t.b + t.d}, всё сходится.`
      : `Не верь записи на слово: ${p.why}.`); },
    key: t => TYPES.check.ans(t),
    keyHTML: t => esc(TYPES.check.ans(t)),
    traps(t) { const o = TYPES.check.ans(t) === 'да' ? 'нет' : 'да'; return [{ key: o, html: esc(o) }]; },
    hints: () => [`Проверь каждое действие: сложение, знаки, средний член.`, `Раскрой скобки сам и сравни.`],
  },
};

// ================= Решения с одной ошибкой: «найди ошибку» =================
const errLines = (lines, at, badLine, why) => ({ lines: lines.map((l, i) => (i === at ? badLine : l)), at, fix: lines[at], why });
TYPES.sub.mistake = (t, rnd) => {
  const T = TYPES.sub, w = T.wrongs(t);
  const L = [`${T.text(t)} = ${T.right(t)}`, `проверка: подставь ${X} = 1`];
  return pick(rnd, [
    () => errLines(L, 0, `${T.text(t)} = ${w[0].html}`, 'Вторую скобку надо вычесть: минус меняет все её знаки.'),
    () => errLines(L, 0, `${T.text(t)} = ${w[1].html}`, 'Минус относится к каждому члену вычитаемого, а не только к первому.'),
  ])();
};
TYPES.mul2.mistake = (t, rnd) => {
  const T = TYPES.mul2, w = T.wrongs(t);
  const L = [`${T.text(t)} = ${T.right(t)}`, `проверка: подставь ${X} = 1: (${1 + t.a}) · (${1 + t.b}) = ${(1 + t.a) * (1 + t.b)}`];
  return pick(rnd, [
    () => errLines(L, 0, `${T.text(t)} = ${w[0].html}`, 'Потерян средний член: каждый член первой скобки умножается на каждый член второй.'),
    () => errLines(L, 0, `${T.text(t)} = ${w[1].html}`, 'Средний член — сумма двух произведений, а не их произведение.'),
  ])();
};

// ================= Ошибки: блок «Над чем поработать» =================
const CATS = {
  sign: ['Знаки при сложении и вычитании', 'Минус перед скобкой меняет все знаки. Складывай со знаками, а не модули.'],
  drop: ['Потерянное слагаемое', 'Проверяй: в ответе столько слагаемых, сколько было (после приведения).'],
  middle: ['Средний член произведения', 'Каждый на каждый: средний член никуда не девается. Удобно проверять площадью.'],
  midcoef: ['Средний член — сумма', 'Средний член — сумма двух произведений, а не их произведение.'],
  firstcoef: ['Старший коэффициент', 'Коэффициенты при x² умножаются: 2x · 3x = 6x².'],
  trust: ['Проверяй равенство', 'Раскрой скобки сам и сравни с записью.'],
  calc: ['Вычисления', 'Проверь арифметику коэффициентов.'],
};

// ================= Разделы тренажёра =================
const SECTIONS = [
  { title: 'Раздел 1', text: 'Сложение и вычитание', types: ['add', 'sub'], ex: () => `(2${X} + 3) + (${X} + 1) = ?` },
  { title: 'Раздел 2', text: 'Умножение', types: ['mul2', 'prod'], ex: () => `(${X} + 2)(${X} + 3) = ?` },
  { title: 'Раздел 3', text: 'Верно ли равенство', types: ['check'], ex: () => `(${X} + 2)(${X} + 3) = ${X}${PW(2)} + 6?` },
];

// ================= Раздатка =================
// Состав варианта: пять заданий, верные ответы складываются в слово из 5 разных букв
const KINDS_V1 = [['add'], ['sub'], ['mul2'], ['prod'], ['check']];
// Слова для самопроверки: столько букв, сколько заданий, буквы не повторяются
const WORDS_V1 = ['СЛОЖИ', 'ВЫЧТИ', 'ВЕРНО'];

// Билет на выход и самостоятельная (форматы ядра): состав можно менять, пока на них нет напечатанных листов
const EXIT_V1 = [['add'], ['sub'], ['mul2']];
const TEST_V1 = {
  parts: [['add'], ['sub'], ['mul2'], ['prod'], ['check']],
  points: [1, 1, 1, 2, 1],
  grades: { 5: 6, 4: 4, 3: 3 },
};

const PRINT = {
  instr: 'Выбери верный результат и найди его букву в таблице. Впиши буквы в клеточки под номерами заданий — получится слово. '
    + 'Если слово не сложилось, поищи ошибку.',
  about: 'В каждом варианте пять заданий: сложение и вычитание многочленов, умножение двучленов и общий случай, '
    + 'проверка «верно ли равенство». Пять верных ответов складываются в слово.',
  ogeAbout: '',
};

// ================= На доске =================
// Прямоугольник (x + a)(x + b): площадь частями — откуда берётся средний член
function boardExample(random, old) {
  if (!random) return { a: CONFIG.board.a, b: CONFIG.board.b };
  const rnd = mulberry32(((Math.random() * 4294967296) >>> 0));
  let a, b, guard = 0;
  do { a = int(rnd, 1, 6); b = int(rnd, 1, 6); } while (++guard < 50 && old.a === a && old.b === b);
  return { a, b };
}
// Подписи на чертеже — SVG-текст: курсив через tspan (тег <i> в SVG не работает)
const si = v => `<tspan font-style="italic">${v}</tspan>`;
const BX = 80, BY = 70, XU = 100, UU = 22;   // x — квадрат 100, единица — 22 пикселя
const blines = (lines, y0 = 80) => lines.map((l, i) =>
  `<g class="${l.cls || ''}">${tx(560, y0 + i * 54, l.t, 'lab s' + (l.lc ? ' ' + l.lc : ''), 'start')}</g>`).join('');
// Прямоугольник (X0 + a)(X0 + b): четыре части — x², ax, bx, ab
function areaScene(a, b, lines = [], opt = {}) {
  const x = BX, y = BY, wA = a * UU, wB = b * UU, W = XU, H = XU;
  let s = `<rect class="gs" x="${x}" y="${y}" width="${W}" height="${H}"/>` +
    `<rect class="gw" x="${x + W}" y="${y}" width="${wA}" height="${H}"/>` +
    `<rect class="gw" x="${x}" y="${y + H}" width="${W}" height="${wB}"/>` +
    `<rect class="ge" x="${x + W}" y="${y + H}" width="${wA}" height="${wB}"/>` +
    `<line class="gf" x1="${x + W}" x2="${x + W}" y1="${y}" y2="${y + H + wB}"/>` +
    `<line class="gf" x1="${x}" x2="${x + W + wA}" y1="${y + H}" y2="${y + H}"/>`;
  s += under(x, y + H + wB, W, `${si('x')}²`, 'warm');
  s += under(x + W, y + H + wB, wA, opt.show ? `${a}${si('x')}` : '?', 'warm');
  s += tx(x - 12, y + H / 2, si('x'), 'lab s warm', 'end');
  s += tx(x - 12, y + H + wB / 2, opt.show ? String(b) : '?', 'lab s warm', 'end');
  if (opt.show) s += tx(x + W + wA / 2, y + H + wB / 2, `${a * b}`, 'lab s acc', 'middle');
  return s + blines(lines);
}
// Живая модель: стороны a и b двигаются, go — раскрытие ответа
const LIVE = {
  model: e => ({ a: e.a, b: e.b, go: 0 }),
  fix(m) {
    m.a = Math.max(1, Math.min(6, Math.round(m.a)));
    m.b = Math.max(1, Math.min(6, Math.round(m.b)));
    if (!Number.isFinite(m.go)) m.go = 0;
  },
  ok: m => m.a >= 1 && m.b >= 1,
};
function buildSteps(e) {
  const { a, b } = e;
  return [
    { q: `(3${si('x')} + 2) + (2${si('x')} + 5). Сколько получится?`,
      a: `5${si('x')} + 7: складываем подобное с подобным.`,
      note: 'Начало урока: складываем x с x, числа с числами. Спросите, почему 3x и 2 нельзя сложить.',
      draw: () => '',
      rec: ph => ph ? [`(3${si('x')} + 2) + (2${si('x')} + 5) = 5${si('x')} + 7`] : [] },
    { q: `А вычесть: (5${si('x')} + 4) ${MINUS} (2${si('x')} + 1)?`,
      a: `3${si('x')} + 3: минус меняет оба знака вычитаемого: 5${si('x')} + 4 ${MINUS} 2${si('x')} ${MINUS} 1.`,
      note: 'Главная ловушка: минус относится к каждому члену, а не только к первому.',
      draw: () => '',
      rec: ph => ph ? [`(5${si('x')} + 4) ${MINUS} (2${si('x')} + 1) = 3${si('x')} + 3`] : [] },
    { q: `Ловушка: (5${si('x')} + 4) ${MINUS} (2${si('x')} + 1) = 3${si('x')} + 5?`,
      a: `Нет: +1 тоже вычитается: 4 ${MINUS} 1 = 3, а не 5.`,
      note: 'Шаг-ловушка: забыли поменять знак у последнего члена.',
      draw: ph => blines(ph
        ? [{ t: `4 ${MINUS} 1 = 3, а не 5`, cls: 'new', lc: 'acc' }]
        : [{ t: `(5${si('x')} + 4) ${MINUS} (2${si('x')} + 1) = ?`, lc: 'warm' }]),
      rec: ph => ph ? [`минус меняет ВСЕ знаки`] : [] },
    { q: `Умножим: (${si('x')} + ${a})(${si('x')} + ${b}). Чему равна площадь такого прямоугольника?`,
      a: `Четыре части: ${si('x')}² + ${a}${si('x')} + ${b}${si('x')} + ${a * b} = ${si('x')}² + ${a + b}${si('x')} + ${a * b}.`,
      note: 'Покажите четыре части. Средний член — это два прямоугольника сразу.',
      draw: ph => areaScene(a, b, ph ? [{ t: `${si('x')}² + ${a + b}${si('x')} + ${a * b}`, cls: 'new', lc: 'acc' }] : [], { show: !!ph }),
      rec: ph => ph ? [`(${si('x')} + ${a})(${si('x')} + ${b}) = ${si('x')}² + ${a + b}${si('x')} + ${a * b}`] : [] },
    { q: m => `Двигай стороны: ширина ${si('x')} + ${m.a}, высота ${si('x')} + ${m.b}. Что не меняется в ответе?`,
      a: m => `Старший член всегда ${si('x')}², свободный — произведение чисел ${m.a} · ${m.b} = ${m.a * m.b}. А средний — сумма: (${m.a} + ${m.b})${si('x')}.`,
      note: 'Тяните ручки сторон и двигайте ползунки. Вывод: средний член — сумма, свободный — произведение.',
      live: {
        enter(m) { m.a = a; m.b = b; m.go = 0; },
        reveal(m) { liveTo({ go: 1 }, 900); },
        handles: m => {
          const x = BX, y = BY;
          return [
            { id: 'a', at: { x: x + XU + m.a * UU, y: y + XU / 2 }, label: 'Ширина: число при x',
              move(m, p) { m.a = Math.max(1, Math.min(6, Math.round((p.x - x - XU) / UU))); },
              key(m, dx) { m.a += dx; } },
            { id: 'b', at: { x: x + XU / 2, y: y + XU + m.b * UU }, label: 'Высота: число при x',
              move(m, p) { m.b = Math.max(1, Math.min(6, Math.round((p.y - y - XU) / UU))); },
              key(m, dx, dy) { m.b += dy; } },
          ];
        },
        controls: () => [
          { id: 'a', type: 'range', label: 'Первое число', min: 1, max: 6, get: m => m.a, set(m, v) { m.a = v; } },
          { id: 'b', type: 'range', label: 'Второе число', min: 1, max: 6, get: m => m.b, set(m, v) { m.b = v; } },
        ],
      },
      draw: (ph, m) => areaScene(m.a, m.b, (ph || m.go > 0.5)
        ? [{ t: `${si('x')}² + ${m.a + m.b}${si('x')} + ${m.a * m.b}`, cls: 'new', lc: 'acc' }] : [], { show: ph || m.go > 0.5 }),
      rec: (ph, m) => ph ? [`(${si('x')} + ${m.a})(${si('x')} + ${m.b}) = ${si('x')}² + ${m.a + m.b}${si('x')} + ${m.a * m.b}`] : [] },
    { q: `Ловушка: (${si('x')} + ${a})(${si('x')} + ${b}) = ${si('x')}² + ${a * b}?`,
      a: `Нет: потерян средний член ${a + b}${si('x')}. Проверка площадью: два прямоугольника никуда не делись.`,
      note: 'Шаг-ловушка: самая частая ошибка умножения. Голосуйте, потом проверяйте.',
      draw: ph => blines(ph
        ? [{ t: `средний член ${a + b}${si('x')} потерян`, cls: 'new', lc: 'warm' },
           { t: `${si('x')}² + ${a + b}${si('x')} + ${a * b}`, cls: 'new', lc: 'acc' }]
        : [{ t: `(${si('x')} + ${a})(${si('x')} + ${b}) = ?`, lc: 'warm' }]),
      rec: ph => ph ? [`средний член терять нельзя`] : [] },
    { q: `Общий случай: (2${si('x')} + 1)(3${si('x')} + 4).`,
      a: `6${si('x')}² + 11${si('x')} + 4: каждый на каждый, потом подобные.`,
      note: 'Те же четыре произведения, только коэффициенты больше.',
      draw: () => '',
      rec: ph => ph ? [`(2${si('x')} + 1)(3${si('x')} + 4) = 6${si('x')}² + 11${si('x')} + 4`] : [] },
    { q: `А если минус: (${si('x')} ${MINUS} 2)(${si('x')} + 3)?`,
      a: `${si('x')}² + ${si('x')} ${MINUS} 6: средний ${MINUS}2${si('x')} + 3${si('x')} = +${si('x')}, свободный ${MINUS}6.`,
      note: 'Знаки умножаются как числа: минус на плюс — минус.',
      draw: () => '',
      rec: ph => ph ? [`(${si('x')} ${MINUS} 2)(${si('x')} + 3) = ${si('x')}² + ${si('x')} ${MINUS} 6`] : [] },
    { q: 'Итог: как складывать, вычитать и умножать многочлены?',
      a: 'Складывать и вычитать — подобное с подобным (минус меняет знаки). Умножать — каждый на каждый.',
      note: 'Пусть класс повторит правила своими словами.',
      draw: () => '',
      rec: () => ['1. Сложение: подобное с подобным.', '2. Вычитание: минус меняет все знаки.', '3. Умножение: каждый на каждый.'] },
  ];
}
// превью на сайте крутит шаги до previewUntil (счёт с 0); картинка-превью — шаг poster с показанным ответом
const BOARD = { previewUntil: 3, poster: 3 };

// Формулы в справке (help.html): ядро вызывает helpInit() при запуске
function helpInit() {
  const put = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  put('helpSub', `(5${X} + 4) ${MINUS} (2${X} + 1) = 3${X} + 3`);
  put('helpMul', `(${X} + 2)(${X} + 3) = ${X}${PW(2)} + 5${X} + 6`);
  put('helpEx1', `(${X} + 2)(${X} + 3): части ${X}${PW(2)}, 2${X}, 3${X} и 6`);
  put('helpEx2', `при ${X} = 10: (10 + 2)(10 + 3) = 12 · 13 = 156`);
}

// ================= Свои виды ввода =================
// pick: выбор верного результата из кнопок (порядок перемешан зерном t.o)
const TOPIC_INPUTS = {
  pick: {
    html: t => `<div class="inrow picks">${shuffle(mulberry32(t.o), TYPES[t.type].opts(t))
      .map(o => `<button type="button" class="choice" data-choice="${o.key}"><span class="nw">${o.html}</span></button>`).join('')}</div>` +
      '<p class="hnote">Выбери верный результат.</p>',
    collect: () => null,
  },
};
