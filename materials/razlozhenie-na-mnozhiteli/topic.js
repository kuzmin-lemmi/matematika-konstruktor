// Тема «Разложение многочленов на множители» (7 класс, Макарычев). Только содержание — каркас даёт ядро (core/).
// Три способа: вынесение общего множителя, группировка, формулы наоборот (разность квадратов,
// полный квадрат, два шага подряд). Ответы — выбор верного разложения (input pick) и «да/нет» (input choice).

// ================= Параметры: учитель может поменять их за минуту =================
const CONFIG = {
  board: {
    k: 3, p: 4, q: 5,        // первый пример на доске: 3·4 + 3·5 = 3·(4 + 5)
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
const mono = x => (x.k === 1 ? '' : x.k) + X + (x.m === 1 ? '' : PW(x.m));   // {k,m} → 3x² (x¹ — просто x)
const mono0 = x => x.m === 0 ? String(x.k) : mono(x);                        // число без x, если степень 0
// сумма одночленов со знаками: [{k: 6, m: 2}, {k: −9, m: 1}] → 6x² − 9x
const poly = xs => xs.map((x, i) => {
  const s = mono0({ k: Math.abs(x.k), m: x.m });
  return i ? (x.k < 0 ? ` ${MINUS} ` : ' + ') + s : (x.k < 0 ? MINUS : '') + s;
}).join('');
const monoKey = x => `${x.k}x${x.m}`;            // ключ для таблицы букв и ответа
const binom = (A, s, B) => `(${mono0(A)} ${sgn(s)} ${mono0(B)})`;
const LCsym = () => VI('c');
const eqm = (u, v) => !!u && !!v && u.k === v.k && u.m === v.m;

// Пара одночленов A, B с разными показателями; sign — знак в скобке
function genAB(rnd, kmax, mmax) {
  const A = { k: int(rnd, 1, kmax), m: int(rnd, 1, mmax) };
  let B;
  do B = { k: int(rnd, 1, kmax), m: int(rnd, 1, mmax) }; while (B.m === A.m);
  return { A, B, sign: 1 };
}

// ================= Типы заданий =================
// pick — выбор верного разложения из кнопок (opts), choice — «да/нет».
// ans — ключ-кнопка, same — сравнение с ней, key/keyHTML — запись в ключе,
// traps — ловушки [{key, html}] на типичных ошибках, correct/wrongInput — ответы для тест-контракта.
const bad = (cat, msg) => ({ cat, msg });

const TYPES = {
  common: {   // вынести общий множитель: 6x² + 9x = 3x(2x + 3)
    input: 'pick', title: 'Общий множитель',
    statement: (t, html) => `${TYPES.common.text(t)} = ${html}`,
    gen: rnd => ({ C: { k: int(rnd, 2, 5), m: 1 }, P: { k: int(rnd, 2, 6), m: int(rnd, 1, 2) }, Q: { k: int(rnd, 2, 9), m: 0 }, o: int(rnd, 1, 1000000) }),
    terms: t => [{ k: t.C.k * t.P.k, m: t.C.m + t.P.m }, { k: t.C.k * t.Q.k, m: t.C.m }],
    text: t => poly(TYPES.common.terms(t)),
    right: t => `${mono(t.C)}(${mono(t.P)} + ${mono0(t.Q)})`,
    ask: t => `Вынесите общий множитель за скобки:<br>${TYPES.common.text(t)}`,
    sheet: t => `Вынесите общий множитель за скобки: ${TYPES.common.text(t)}`,
    answer: t => `${TYPES.common.text(t)} = ${TYPES.common.right(t)}`,
    wrongs(t) {
      const Cn = { k: t.C.k, m: 0 };   // вынес только число
      const Cx = { k: 1, m: t.C.m };   // вынес только x
      return [
        { key: 'common:t1', html: `${mono0(Cn)}(${mono({ k: t.P.k, m: t.P.m + t.C.m })} + ${mono({ k: t.Q.k, m: t.C.m })})`, cat: 'part',
          why: `Ты вынес только число ${t.C.k}, а ${mono({ k: 1, m: t.C.m })} остался в скобке. Общий множитель — целиком ${mono(t.C)}: и число, и буква.` },
        { key: 'common:t2', html: `${mono(Cx)}(${mono({ k: t.C.k * t.P.k, m: t.P.m })} + ${mono0({ k: t.C.k * t.Q.k, m: 0 })})`, cat: 'part',
          why: `Ты вынес только ${mono({ k: 1, m: t.C.m })}, а число ${t.C.k} осталось в скобке. Общий множитель — целиком ${mono(t.C)}.` }];
    },
    opts: t => [{ key: 'common:ok', html: TYPES.common.right(t) }, ...TYPES.common.wrongs(t).map(({ key, html }) => ({ key, html }))],
    ans: () => 'common:ok',
    same: (t, v) => v === 'common:ok',
    ok: t => `Общее у слагаемых — ${mono(t.C)} (НОД коэффициентов ${t.C.k * t.P.k} и ${t.C.k * t.Q.k} равен ${t.C.k}, общая буква ${mono({ k: 1, m: t.C.m })}). Делим: ${poly(TYPES.common.terms(t))} = ${TYPES.common.right(t)}. Проверка умножением: ${mono(t.C)} · ${mono(t.P)} = ${mono(TYPES.common.terms(t)[0])}, ${mono(t.C)} · ${t.Q.k} = ${mono(TYPES.common.terms(t)[1])}.`,
    wrong(t, v) {
      const T = TYPES.common, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'part', `${w ? w.why : 'Сравни с правилом.'} ${T.ok(t)}`);
    },
    key: t => `common:${t.C.k}x${t.C.m}`,
    keyHTML: t => TYPES.common.right(t),
    traps: t => TYPES.common.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints: t => [`Ищи общее у слагаемых: НОД коэффициентов и общую букву в наименьшей степени.`,
      `Коэффициенты ${t.C.k * t.P.k} и ${t.C.k * t.Q.k} делятся на ${t.C.k}; буква — ${mono({ k: 1, m: t.C.m })}. Общий множитель ${mono(t.C)}.`],
    correct: () => 'common:ok',
    wrongInput: t => TYPES.common.wrongs(t)[0].key,
  },
  group: {   // группировка: ax + ax² + bx + bx² = (x + x²)(a + b)
    input: 'pick', title: 'Группировка',
    statement: (t, html) => `${TYPES.group.text(t)} = ${html}`,
    gen: rnd => {
      let a, b;
      a = int(rnd, 2, 6);
      do b = int(rnd, 2, 6); while (b === a);
      return { a, b, o: int(rnd, 1, 1000000) };
    },
    terms: t => [{ k: t.a, m: 1 }, { k: t.a, m: 2 }, { k: t.b, m: 1 }, { k: t.b, m: 2 }],
    text: t => poly(TYPES.group.terms(t)),
    right: t => `(${X} + ${X}${PW(2)})(${t.a} + ${t.b})`,
    ask: t => `Разложите на множители способом группировки:<br>${TYPES.group.text(t)}`,
    sheet: t => `Разложите на множители способом группировки: ${TYPES.group.text(t)}`,
    answer: t => `${TYPES.group.text(t)} = ${TYPES.group.right(t)}`,
    wrongs(t) {
      return [
        { key: 'group:t1', html: `(${X} + ${X}${PW(2)})${t.a}`, cat: 'group',
          why: `Ты разложил только первую группу, а слагаемые с ${t.b} бросил. Группы две: сначала ${t.a}(${X} + ${X}${PW(2)}) + ${t.b}(${X} + ${X}${PW(2)}), потом общая скобка.` },
        { key: 'group:t2', html: `(${t.a} + ${X})(${t.b} + ${X}${PW(2)})`, cat: 'group',
          why: `Ты сложил слагаемые из разных групп. Группируй рядом стоящие с общим множителем: (${poly(TYPES.group.terms(t).slice(0, 2))}) + (${poly(TYPES.group.terms(t).slice(2))}).` }];
    },
    opts: t => [{ key: 'group:ok', html: TYPES.group.right(t) }, ...TYPES.group.wrongs(t).map(({ key, html }) => ({ key, html }))],
    ans: () => 'group:ok',
    same: (t, v) => v === 'group:ok',
    ok: t => `Группируем: ${t.a}${X} + ${t.a}${X}${PW(2)} = ${t.a}(${X} + ${X}${PW(2)}), ${t.b}${X} + ${t.b}${X}${PW(2)} = ${t.b}(${X} + ${X}${PW(2)}). Общая скобка (${X} + ${X}${PW(2)}): ${TYPES.group.right(t)}.`,
    wrong(t, v) {
      const T = TYPES.group, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'group', `${w ? w.why : 'Сравни с правилом.'} ${T.ok(t)}`);
    },
    key: t => `group:${t.a}+${t.b}`,
    keyHTML: t => TYPES.group.right(t),
    traps: t => TYPES.group.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints: () => [`Разбей четыре слагаемых на две пары с общим множителем и вынеси его в каждой паре.`, `После этого появится одинаковая скобка — вынеси её.`],
    correct: () => 'group:ok',
    wrongInput: t => TYPES.group.wrongs(t)[0].key,
  },
  diffsq: {   // разность квадратов наоборот: A² − B² = (A − B)(A + B)
    input: 'pick', title: 'Разность квадратов',
    statement: (t, html) => `${TYPES.diffsq.text(t)} = ${html}`,
    gen: (rnd, form) => ({ ...genAB(rnd, 4, 2), o: int(rnd, 1, 1000000) }),
    sq: t => ({ sa: { k: t.A.k * t.A.k, m: 2 * t.A.m }, sb: { k: t.B.k * t.B.k, m: 2 * t.B.m } }),
    text(t) { const { sa, sb } = TYPES.diffsq.sq(t); return `${mono(sa)} ${MINUS} ${mono(sb)}`; },
    right: t => `(${mono0(t.A)} ${MINUS} ${mono0(t.B)})(${mono0(t.A)} + ${mono0(t.B)})`,
    ask: t => `Разложите на множители:<br>${TYPES.diffsq.text(t)}`,
    sheet: t => `Разложите на множители: ${TYPES.diffsq.text(t)}`,
    answer: t => `${TYPES.diffsq.text(t)} = ${TYPES.diffsq.right(t)}`,
    wrongs(t) {
      return [
        { key: 'diffsq:t1', html: `${binom(t.A, -1, t.B)}${PW(2)}`, cat: 'sq',
          why: `Это квадрат разности: ${binom(t.A, -1, t.B)}${PW(2)} — три слагаемых. У нас разность двух квадратов: два слагаемых и «${MINUS}» между ними.` },
        { key: 'diffsq:t2', html: `${binom(t.A, 1, t.B)}${PW(2)}`, cat: 'sq',
          why: `Это квадрат суммы — тоже три слагаемых. Проверь умножением: ${TYPES.diffsq.right(t)} = ${TYPES.diffsq.text(t)}.` }];
    },
    opts: t => [{ key: 'diffsq:ok', html: TYPES.diffsq.right(t) }, ...TYPES.diffsq.wrongs(t).map(({ key, html }) => ({ key, html }))],
    ans: () => 'diffsq:ok',
    same: (t, v) => v === 'diffsq:ok',
    ok: t => `Два квадрата и «${MINUS}»: ${LA}${PW(2)} ${MINUS} ${LB}${PW(2)} = (${LA} ${MINUS} ${LB})(${LA} + ${LB}). Из первого члена получается ${mono0(t.A)}, из второго — ${mono0(t.B)}: ${TYPES.diffsq.right(t)}.`,
    wrong(t, v) {
      const T = TYPES.diffsq, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'sq', `${w ? w.why : 'Сравни с формулой.'} ${T.ok(t)}`);
    },
    key: t => `diffsq:${t.A.k}x${t.A.m}-${t.B.k}x${t.B.m}`,
    keyHTML: t => TYPES.diffsq.right(t),
    traps: t => TYPES.diffsq.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints: t => [`Два квадрата и «${MINUS}» между ними: ${LA}${PW(2)} ${MINUS} ${LB}${PW(2)} = (${LA} ${MINUS} ${LB})(${LA} + ${LB}).`,
      `Из первого члена получается ${mono0(t.A)}, из второго — ${mono0(t.B)}.`],
    correct: () => 'diffsq:ok',
    wrongInput: t => TYPES.diffsq.wrongs(t)[0].key,
  },
  square: {   // полный квадрат наоборот: A² ± 2AB + B² = (A ± B)²
    input: 'pick', title: 'Полный квадрат',
    statement: (t, html) => `${TYPES.square.text(t)} = ${html}`,
    gen: (rnd, form) => { const t = genAB(rnd, 3, 2); t.sign = rnd() < 0.5 ? 1 : -1; t.o = int(rnd, 1, 1000000); return t; },
    parts(t) { return { sa: { k: t.A.k * t.A.k, m: 2 * t.A.m }, cr: { k: 2 * t.A.k * t.B.k, m: t.A.m + t.B.m }, sb: { k: t.B.k * t.B.k, m: 2 * t.B.m } }; },
    text(t) { const { sa, cr, sb } = TYPES.square.parts(t); return `${mono(sa)} ${sgn(t.sign)} ${mono(cr)} + ${mono(sb)}`; },
    right: t => `${binom(t.A, t.sign, t.B)}${PW(2)}`,
    ask: t => `Разложите на множители:<br>${TYPES.square.text(t)}`,
    sheet: t => `Разложите на множители: ${TYPES.square.text(t)}`,
    answer: t => `${TYPES.square.text(t)} = ${TYPES.square.right(t)}`,
    wrongs(t) {
      return [
        { key: 'square:t1', html: `${binom(t.A, -t.sign, t.B)}${PW(2)}`, cat: 'sign',
          why: `Знак в скобке должен совпадать со знаком перед средним членом «${sgn(t.sign)}».` },
        { key: 'square:t2', html: `(${mono0(t.A)} ${MINUS} ${mono0(t.B)})(${mono0(t.A)} + ${mono0(t.B)})`, cat: 'sq',
          why: `Это разность квадратов: два слагаемых. У нас три слагаемых и средний член ${mono(TYPES.square.parts(t).cr)} — это полный квадрат.` }];
    },
    opts: t => [{ key: 'square:ok', html: TYPES.square.right(t) }, ...TYPES.square.wrongs(t).map(({ key, html }) => ({ key, html }))],
    ans: () => 'square:ok',
    same: (t, v) => v === 'square:ok',
    ok: t => `Три слагаемых, крайние — квадраты, среднее — удвоенное произведение: это (${LA} ${sgn(t.sign)} ${LB})${PW(2)}. Проверка: ${TYPES.square.right(t)} = ${TYPES.square.text(t)}.`,
    wrong(t, v) {
      const T = TYPES.square, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'sq', `${w ? w.why : 'Сравни с формулой.'} ${T.ok(t)}`);
    },
    key: t => `square:${t.A.k}x${t.A.m}${t.sign > 0 ? '+' : '-'}${t.B.k}x${t.B.m}`,
    keyHTML: t => TYPES.square.right(t),
    traps: t => TYPES.square.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints: () => [`Три слагаемых, крайние — квадраты, среднее — 2ab: это полный квадрат (${LA} ± ${LB})${PW(2)}.`,
      `Знак в скобке — как перед средним членом.`],
    correct: () => 'square:ok',
    wrongInput: t => TYPES.square.wrongs(t)[0].key,
  },
  combo: {   // два шага: сначала вынести, потом формула: 2x² − 8 = 2(x − 2)(x + 2)
    input: 'pick', title: 'В два шага',
    statement: (t, html) => `${TYPES.combo.text(t)} = ${html}`,
    gen: rnd => ({ c: int(rnd, 2, 4), b: int(rnd, 2, 5), o: int(rnd, 1, 1000000) }),
    text: t => `${t.c}${X}${PW(2)} ${MINUS} ${t.c * t.b * t.b}`,
    right: t => `${t.c}(${X} ${MINUS} ${t.b})(${X} + ${t.b})`,
    ask: t => `Разложите на множители:<br>${TYPES.combo.text(t)}`,
    sheet: t => `Разложите на множители: ${TYPES.combo.text(t)}`,
    answer: t => `${TYPES.combo.text(t)} = ${TYPES.combo.right(t)}`,
    wrongs(t) {
      return [
        { key: 'combo:t1', html: `(${t.c}${X} ${MINUS} ${t.c * t.b})(${t.c}${X} + ${t.c * t.b})`, cat: 'combo',
          why: `Ты внёс ${t.c} внутрь скобок, а надо наоборот — вынести наружу: сначала ${TYPES.combo.text(t)} = ${t.c}(${X}${PW(2)} ${MINUS} ${t.b * t.b}), и только потом формула.` },
        { key: 'combo:t2', html: `${t.c}(${X} ${MINUS} ${t.b})${PW(2)}`, cat: 'combo',
          why: `Это квадрат разности: ${t.c}(${X} ${MINUS} ${t.b})${PW(2)} = ${t.c}${X}${PW(2)} ${MINUS} ${2 * t.c * t.b}${X} + ${t.c * t.b * t.b} — три слагаемых. У нас разность квадратов.` }];
    },
    opts: t => [{ key: 'combo:ok', html: TYPES.combo.right(t) }, ...TYPES.combo.wrongs(t).map(({ key, html }) => ({ key, html }))],
    ans: () => 'combo:ok',
    same: (t, v) => v === 'combo:ok',
    ok: t => `Сначала выносим ${t.c}: ${TYPES.combo.text(t)} = ${t.c}(${X}${PW(2)} ${MINUS} ${t.b * t.b}), потом разность квадратов: ${TYPES.combo.right(t)}. Проверка умножением даёт исходное выражение.`,
    wrong(t, v) {
      const T = TYPES.combo, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'combo', `${w ? w.why : 'Сравни с правилом.'} ${T.ok(t)}`);
    },
    key: t => `combo:${t.c}-${t.b}`,
    keyHTML: t => TYPES.combo.right(t),
    traps: t => TYPES.combo.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints: () => [`Здесь два шага: сначала вынеси общий числовой множитель, потом смотри на скобку — там формула.`,
      `После вынесения в скобке останется разность квадратов.`],
    correct: () => 'combo:ok',
    wrongInput: t => TYPES.combo.wrongs(t)[0].key,
  },
  check: {   // верно ли равенство: проверка умножением
    input: 'choice', title: 'Верно ли разложили', options: [['да', 'Да'], ['нет', 'Нет']], oral: true,
    statement: (t, html) => `${TYPES.check.text(t)} — ${html}`,
    gen: rnd => ({ a: int(rnd, 2, 9), v: pick(rnd, ['ok', 'sign', 'sq']) }),
    pair(t) {
      if (t.v === 'sign') return { q: `(${X} ${MINUS} ${t.a})(${X} + ${t.a})`, r: `${X}${PW(2)} + ${t.a * t.a}`, good: false,
        why: `в разности квадратов между квадратами стоит «${MINUS}»: (${X} ${MINUS} ${t.a})(${X} + ${t.a}) = ${X}${PW(2)} ${MINUS} ${t.a * t.a}` };
      if (t.v === 'sq') return { q: `(${X} ${MINUS} ${t.a})${PW(2)}`, r: `${X}${PW(2)} ${MINUS} ${t.a * t.a}`, good: false,
        why: `квадрат разности — это три слагаемых: (${X} ${MINUS} ${t.a})${PW(2)} = ${X}${PW(2)} ${MINUS} ${2 * t.a}${X} + ${t.a * t.a}` };
      return { q: `(${X} ${MINUS} ${t.a})(${X} + ${t.a})`, r: `${X}${PW(2)} ${MINUS} ${t.a * t.a}`, good: true, why: '' };
    },
    text: t => `${TYPES.check.pair(t).q} = ${TYPES.check.pair(t).r}`,
    ask: t => `Верно ли равенство?<br>${TYPES.check.text(t)}`,
    sheet: t => `Верно ли равенство: ${TYPES.check.text(t)}?`,
    answer(t) { const p = TYPES.check.pair(t); return `${p.q} = ${p.r} — ${p.good ? 'верно' : 'неверно'}`; },
    ans: t => TYPES.check.pair(t).good ? 'да' : 'нет',
    ok(t) { const p = TYPES.check.pair(t); return p.good ? `Умножаем обратно: ${p.q} = ${p.r} — верно.` : `Умножаем обратно: ${p.why} — равенство неверно.`; },
    wrong(t) { const p = TYPES.check.pair(t); return bad('trust', p.good
      ? `Не торопись отвечать «нет»: умножь обратно — ${p.q} = ${p.r}. ${TYPES.check.ok(t)}`
      : `Не верь записи на слово: ${p.why}. ${TYPES.check.ok(t)}`); },
    key: t => TYPES.check.ans(t),
    keyHTML: t => esc(TYPES.check.ans(t)),
    traps(t) { const o = TYPES.check.ans(t) === 'да' ? 'нет' : 'да'; return [{ key: o, html: esc(o) }]; },
    hints: () => [`Разложил — умножь обратно: должно получиться исходное выражение.`, `Проверь знаки и число слагаемых.`],
  },
};

// ================= Решения с одной ошибкой: «найди ошибку» =================
// mistake(t, rnd) → { lines: строки решения, at: номер неверной строки (с 0), fix: верная строка, why: в чём ошибка }
const errLines = (lines, at, badLine, why) => ({ lines: lines.map((l, i) => (i === at ? badLine : l)), at, fix: lines[at], why });
TYPES.common.mistake = (t, rnd) => {
  const T = TYPES.common, w = T.wrongs(t);
  const L = [`${T.text(t)} = ${T.right(t)}`, `проверка: ${mono(t.C)} · ${mono(t.P)} + ${mono(t.C)} · ${t.Q.k} = ${T.text(t)}`];
  return pick(rnd, [
    () => errLines(L, 0, `${T.text(t)} = ${w[0].html}`, 'Вынес только число, а букву оставил в скобке: общий множитель — целиком ' + mono(t.C) + '.'),
    () => errLines(L, 0, `${T.text(t)} = ${w[1].html}`, 'Вынес только букву, а число оставил в скобке: общий множитель — целиком ' + mono(t.C) + '.'),
  ])();
};
TYPES.diffsq.mistake = (t, rnd) => {
  const T = TYPES.diffsq, w = T.wrongs(t);
  const L = [`${T.text(t)} = ${T.right(t)}`, `проверка: ${T.right(t)} = ${T.text(t)}`];
  return pick(rnd, [
    () => errLines(L, 0, `${T.text(t)} = ${w[0].html}`, 'Это квадрат разности — три слагаемых. Разность квадратов раскладывается в произведение двух скобок.'),
    () => errLines(L, 0, `${T.text(t)} = ${w[1].html}`, 'Это квадрат суммы — тоже три слагаемых. Нужна разность квадратов: две скобки.'),
  ])();
};

// ================= Ошибки: блок «Над чем поработать» =================
const CATS = {
  part: ['Вынес не всё', 'Общий множитель — целиком: и число (НОД коэффициентов), и буква в наименьшей степени. Проверяй умножением.'],
  group: ['Группировка', 'Сначала вынеси общее в каждой паре, потом вынеси одинаковую скобку. Не смешивай слагаемые из разных групп.'],
  sq: ['Формулы наоборот', 'Два квадрата и «−» — разность квадратов (две скобки); три слагаемых и 2ab — полный квадрат.'],
  sign: ['Знак в формуле', 'Знак в скобке полного квадрата — как перед средним членом 2ab.'],
  combo: ['Два шага', 'Сначала вынеси общий множитель, потом смотри на скобку: там формула. Проверяй умножением.'],
  trust: ['Проверяй умножением', 'Разложил — умножь обратно: должно получиться исходное выражение.'],
  calc: ['Вычисления', 'Проверь НОД коэффициентов и степени при умножении одночленов.'],
};

// ================= Разделы тренажёра =================
const SECTIONS = [
  { title: 'Раздел 1', text: 'Общий множитель', types: ['common'], ex: () => `6${X}${PW(2)} + 9${X} = ?` },
  { title: 'Раздел 2', text: 'Группировка', types: ['group'], ex: () => `2${X} + 2${X}${PW(2)} + 3${X} + 3${X}${PW(2)}` },
  { title: 'Раздел 3', text: 'Формулы наоборот', types: ['diffsq', 'square', 'combo', 'check'], ex: () => `${X}${PW(2)} ${MINUS} 16 = ?` },
];

// ================= Раздатка =================
// Состав варианта: шесть заданий, верные ответы складываются в слово из 6 разных букв
const KINDS_V1 = [['common'], ['group'], ['diffsq'], ['square'], ['combo'], ['check']];
// Слова для самопроверки: столько букв, сколько заданий, буквы не повторяются
const WORDS_V1 = ['ВЫНЕСИ', 'ТРИНОМ', 'СВЕРКА'];

// Билет на выход и самостоятельная (форматы ядра): состав можно менять, пока на них нет напечатанных листов
const EXIT_V1 = [['common'], ['diffsq'], ['check']];
const TEST_V1 = {
  parts: [['common'], ['group'], ['diffsq'], ['square'], ['combo'], ['check']],
  points: [1, 1, 1, 1, 2, 1],
  grades: { 5: 6, 4: 5, 3: 3 },
};

const PRINT = {
  instr: 'Выбери верное разложение и найди его букву в таблице. Впиши буквы в клеточки под номерами заданий — получится слово. '
    + 'Если слово не сложилось, поищи ошибку.',
  about: 'В каждом варианте шесть заданий: общий множитель, группировка, разность квадратов и полный квадрат наоборот, '
    + 'разложение в два шага и проверка «верно ли разложили». Шесть верных ответов складываются в слово.',
  ogeAbout: '',
};

// ================= На доске =================
// Прямоугольник k × (p + q): площадь двумя способами — откуда берётся вынесение за скобки
function boardExample(random, old) {
  if (!random) return { k: CONFIG.board.k, p: CONFIG.board.p, q: CONFIG.board.q };
  const rnd = mulberry32(((Math.random() * 4294967296) >>> 0));
  let k, p, q, guard = 0;
  do { k = int(rnd, 2, 5); p = int(rnd, 2, 7); q = int(rnd, 2, 7); }
  while (++guard < 50 && old.k === k && old.p === p && old.q === q);
  return { k, p, q };
}
// Подписи на чертеже — SVG-текст: курсив через tspan, степень — «²» (теги <i> и <sup> в SVG не работают)
const si = v => `<tspan font-style="italic">${v}</tspan>`;
const BX = 90, BY = 80;   // левый верхний угол чертежа
const blines = (lines, y0 = 100) => lines.map((l, i) =>
  `<g class="${l.cls || ''}">${tx(560, y0 + i * 56, l.t, 'lab s' + (l.lc ? ' ' + l.lc : ''), 'start')}</g>`).join('');
// Прямоугольник k × p (слева) и k × q (справа): unit пикселей на клетку
function rectScene(k, p, q, lines = [], opt = {}) {
  const unit = Math.max(8, Math.floor(Math.min(400 / (p + q), 210 / k)));
  const x = BX, y = BY, h = k * unit, wp = p * unit, wq = q * unit;
  let s = `<rect class="gs" x="${x}" y="${y}" width="${wp}" height="${h}"/>`;
  s += `<rect class="gw" x="${x + wp}" y="${y}" width="${wq}" height="${h}"/>`;
  s += grid(x, y, p + q, k, unit, 'gn', 4);
  if (opt.split) s += `<line class="gf" x1="${x + wp}" x2="${x + wp}" y1="${y}" y2="${y + h}"/>`;
  s += under(x, y + h, wp, opt.hideNums ? '?' : `${k} · ${p} = ${k * p}`, 'warm');
  s += under(x + wp, y + h, wq, opt.hideNums ? '?' : `${k} · ${q} = ${k * q}`, 'warm');
  s += tx(x - 14, y + h / 2, opt.hideNums ? '?' : String(k), 'lab s warm', 'end');
  return s + blines(lines);
}
function buildSteps(e) {
  const { k, p, q } = e, S = p + q, all = k * S;
  const xa = `6${si('x')}² + 9${si('x')}`, xb = `3${si('x')}(2${si('x')} + 3)`;
  return [
    { q: `Сколько будет ${k} · ${p} + ${k} · ${q}? Посчитай удобным способом, без столбика.`,
      a: `${k} · (${p} + ${q}) = ${k} · ${S} = ${all}. Общее число ${k} вынесли за скобки.`,
      note: 'Начало урока: пусть класс сначала посчитает в лоб и удобным способом и сравнит. Ответы запишите на доске.',
      draw: ph => rectScene(k, p, q, ph ? [{ t: `${k} · ${p} + ${k} · ${q} = ${all}`, cls: 'new', lc: 'acc' }] : [], { split: true, hideNums: !ph }),
      rec: ph => ph ? [`${k} · ${p} + ${k} · ${q} = ${k} · (${p} + ${q}) = ${all}`] : [] },
    { q: m => `Части ${m.k} × ${m.p} и ${m.k} × ${m.q}. Двигай границу между ними и ширину: что не меняется?`,
      a: m => `Площадь всего: ${m.k} · ${m.p} + ${m.k} · ${m.q} = ${m.k} · (${m.p} + ${m.q}) = ${m.k * (m.p + m.q)}. Граница двигается, а ширина ${m.k} и сумма ${m.p} + ${m.q} = ${m.p + m.q} — общие.`,
      note: 'Тяните границу мышью или стрелками, двигайте ползунки. Вывод: общий множитель k стоит за скобкой, в скобке — сумма.',
      live: {
        enter(m) { m.k = k; m.p = p; m.q = q; m.go = 0; },
        reveal(m) { liveTo({ go: 1 }, 900); },
        handles: m => {
          const unit = Math.max(8, Math.floor(Math.min(400 / (m.p + m.q), 210 / m.k)));
          return [{ id: 'split', at: { x: BX + m.p * unit, y: BY + m.k * unit / 2 }, label: 'Граница частей',
            move(m, pnt) { const tot = m.p + m.q, v = Math.max(1, Math.min(tot - 1, Math.round((pnt.x - BX) / unit))); m.p = v; m.q = tot - v; },
            key(m, dx) { const tot = m.p + m.q; m.p = Math.max(1, Math.min(tot - 1, m.p + dx)); m.q = tot - m.p; } }];
        },
        controls: () => [
          { id: 'k', type: 'range', label: 'Общая ширина', min: 2, max: 5, get: m => m.k, set(m, v) { m.k = v; } },
          { id: 'p', type: 'range', label: 'Левая часть', min: 1, max: 9, get: m => m.p, set(m, v) { m.p = v; if (m.q < 1) m.q = 1; } },
        ],
      },
      draw: (ph, m) => rectScene(m.k, m.p, m.q, (ph || m.go > 0.5)
        ? [{ t: `${m.k} · ${m.p} + ${m.k} · ${m.q} = ${m.k * (m.p + m.q)}`, cls: 'new', lc: 'acc' }] : [], { split: true }),
      rec: (ph, m) => ph ? [`${m.k} · ${m.p} + ${m.k} · ${m.q} = ${m.k} · (${m.p} + ${m.q})`] : [] },
    { q: 'Как записать это одним равенством для любых чисел?',
      a: `${LA} · ${LB} + ${LA} · ${LCsym()} = ${LA} · (${LB} + ${LCsym()}). Это распределительное свойство — читаем справа налево: выносим общее за скобки.`,
      note: 'Вывод урока: вынесение за скобки — это распределительный закон наоборот. Запишите формулу в тетрадь.',
      draw: () => '',
      rec: () => [`${LA} · ${LB} + ${LA} · ${LCsym()} = ${LA} · (${LB} + ${LCsym()})`] },
    { q: `А с буквами? Разложи ${xa}. Что здесь общее?`,
      a: `Общее — 3${si('x')}: ${xa} = ${xb}. Проверка умножением: 3${si('x')} · 2${si('x')} = 6${si('x')}², 3${si('x')} · 3 = 9${si('x')}.`,
      note: 'Спросите: НОД коэффициентов 6 и 9? Общая буква в наименьшей степени? Потом проверка умножением — обязательно.',
      draw: () => '',
      rec: ph => ph ? [`6${si('x')}² + 9${si('x')} = 3${si('x')}(2${si('x')} + 3)`] : [] },
    { q: `Четыре слагаемых: 2${si('x')} + 2${si('y')} + 3${si('x')} + 3${si('y')}. Общего у всех нет — что делать?`,
      a: `Группируем: 2(${si('x')} + ${si('y')}) + 3(${si('x')} + ${si('y')}) = (${si('x')} + ${si('y')})(2 + 3).`,
      note: 'Подкрасьте пары разными цветами. Главное: после первого вынесения появляется одинаковая скобка — её выносим второй раз.',
      draw: () => '',
      rec: ph => ph ? [`2${si('x')} + 2${si('y')} + 3${si('x')} + 3${si('y')} = (${si('x')} + ${si('y')})(2 + 3)`] : [] },
    { q: `Формулы наоборот: ${si('x')}² ${MINUS} 16 — это разность квадратов. Как разложить?`,
      a: `(${si('x')} ${MINUS} 4)(${si('x')} + 4): два квадрата и «${MINUS}» — две скобки.`,
      note: 'Напомните формулу из прошлой темы и прочитайте её справа налево. Проверка умножением.',
      draw: () => '',
      rec: ph => ph ? [`${si('x')}² ${MINUS} 16 = (${si('x')} ${MINUS} 4)(${si('x')} + 4)`] : [] },
    { q: m => `В два шага: 2${si('x')}² ${MINUS} 18. С чего начнём — с формулы или с вынесения? Двигай ползунок шагов.`,
      a: `Сначала выносим 2: 2(${si('x')}² ${MINUS} 9), потом формула: 2(${si('x')} ${MINUS} 3)(${si('x')} + 3).`,
      note: 'Ползунок «Шаг» показывает стадии. Типичная ошибка — сразу писать (2x − 6)(2x + 6): проверьте умножением, получится 4x² − 36.',
      live: {
        enter(m) { m.stage = 0; },
        reveal(m) { liveTo({ stage: 2 }, 1200); },
        controls: () => [
          { id: 'stage', type: 'choice', label: 'Шаг', options: [[0, 'Выражение'], [1, 'Вынесли'], [2, 'Формула']],
            get: m => m.stage, set(m, v) { m.stage = v; } },
        ],
      },
      draw: (ph, m) => {
        const st = ph ? 2 : m.stage;
        const rows = [`2${si('x')}² ${MINUS} 18`];
        if (st >= 1) rows.push(`= 2(${si('x')}² ${MINUS} 9)`);
        if (st >= 2) rows.push(`= 2(${si('x')} ${MINUS} 3)(${si('x')} + 3)`);
        return blines(rows.map((t, i) => ({ t, cls: i === rows.length - 1 && st === 2 ? 'new' : '', lc: i === rows.length - 1 ? 'acc' : '' })));
      },
      rec: (ph, m) => (ph || m.stage >= 2) ? [`2${si('x')}² ${MINUS} 18 = 2(${si('x')} ${MINUS} 3)(${si('x')} + 3)`] : [] },
    { q: `Ловушка: ${si('x')}² + 4 — это (${si('x')} + 2)²?`,
      a: `Нет! (${si('x')} + 2)² = ${si('x')}² + 4${si('x')} + 4 — три слагаемых. Сумма квадратов в 7 классе не раскладывается.`,
      note: 'Шаг-ловушка на самой частой ошибке. Пусть класс сам умножит (x + 2)² и сравнит.',
      draw: ph => blines(ph
        ? [{ t: `(${si('x')} + 2)² = ${si('x')}² + 4${si('x')} + 4`, cls: 'new', lc: 'warm' },
           { t: `${si('x')}² + 4 — не раскладывается`, cls: 'new', lc: 'acc' }]
        : [{ t: `(${si('x')} + 2)² = ?`, lc: 'warm' }]),
      rec: ph => ph ? [`(${si('x')} + 2)² = ${si('x')}² + 4${si('x')} + 4 ≠ ${si('x')}² + 4`] : [] },
    { q: `А если вынести не всё: 6${si('x')}² + 9${si('x')} = 3(2${si('x')}² + 3${si('x')}). Готово?`,
      a: `Нет, можно дальше: = 3${si('x')}(2${si('x')} + 3). Выноси сразу всё общее, а в конце проверь умножением.`,
      note: 'Покажите: неполное вынесение — не ошибка, но и не ответ. Полный ответ — когда в скобке больше нет общего.',
      draw: () => '',
      rec: ph => ph ? [`3(2${si('x')}² + 3${si('x')}) = 3${si('x')}(2${si('x')} + 3)`] : [] },
    { q: 'Итог: как разложить многочлен на множители?',
      a: 'Три способа: вынести общее за скобки; сгруппировать; применить формулу наоборот. Разложил — умножь обратно.',
      note: 'Попросите класс перечислить способы своими словами и сказать, как проверить ответ.',
      draw: () => '',
      rec: () => ['1. Вынеси общее за скобки.', '2. Сгруппируй.', '3. Примени формулу наоборот.', 'Проверка: умножь обратно.'] },
  ];
}
// Живая модель доски (core/live.js): ширина k, части p и q, go — раскрытие ответа,
// stage — стадия разложения в два шага. Ядро даёт мышь, касание, клавиатуру,
// сброс, повтор опыта и плавное движение; тема пишет только математику.
const LIVE = {
  model: e => ({ k: e.k ?? 3, p: e.p ?? 4, q: e.q ?? 5, go: 0, stage: 0 }),
  fix(m) {
    m.k = Math.max(1, Math.min(9, Math.round(m.k)));
    m.p = Math.max(1, Math.min(12, Math.round(m.p)));
    m.q = Math.max(1, Math.min(12, Math.round(m.q)));
    m.stage = Math.max(0, Math.min(2, Math.round(m.stage)));
    if (!Number.isFinite(m.go)) m.go = 0;
  },
  ok: m => m.p >= 1 && m.q >= 1 && m.k >= 1 && m.stage >= 0 && m.stage <= 2,
};
const BOARD = { previewUntil: 2, poster: 2 };

// Формулы в справке (help.html): ядро вызывает helpInit() при запуске
function helpInit() {
  const put = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  put('helpCommon', `${LA} · ${LB} + ${LA} · ${LCsym()} = ${LA} · (${LB} + ${LCsym()})`);
  put('helpGroup', `${LA}${X} + ${LA}${X}${PW(2)} + ${LB}${X} + ${LB}${X}${PW(2)} = (${X} + ${X}${PW(2)})(${LA} + ${LB})`);
  put('helpDiff', `${LA}${PW(2)} ${MINUS} ${LB}${PW(2)} = (${LA} ${MINUS} ${LB})(${LA} + ${LB})`);
  put('helpSq', `(${LA} ± ${LB})${PW(2)} = ${LA}${PW(2)} ± 2${LA}${LB} + ${LB}${PW(2)}`);
  put('helpEx1', `6${X}${PW(2)} + 9${X} = 3${X}(2${X} + 3)`);
  put('helpEx2', `3${X}(2${X} + 3) = 6${X}${PW(2)} + 9${X}`);
}

// ================= Свои виды ввода =================
// pick: выбор верного разложения из кнопок (порядок перемешан зерном t.o)
const TOPIC_INPUTS = {
  pick: {
    html: t => `<div class="inrow picks">${shuffle(mulberry32(t.o), TYPES[t.type].opts(t))
      .map(o => `<button type="button" class="choice" data-choice="${o.key}"><span class="nw">${o.html}</span></button>`).join('')}</div>` +
      '<p class="hnote">Выбери верное разложение.</p>',
    collect: () => null,
  },
};
