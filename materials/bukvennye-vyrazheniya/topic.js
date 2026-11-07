// Тема «Буквенные выражения и подобные слагаемые» (7 класс, Макарычев, уроки 25–26).
// Только содержание — каркас даёт ядро (core/). Подобные слагаемые, раскрытие скобок,
// значение выражения при данных буквах. Ответы — выбор упрощения (input pick),
// число (input num) и «да/нет» (input choice).

// ================= Параметры: учитель может поменять их за минуту =================
const CONFIG = {
  board: {
    a: 3, n: 2,            // первый пример на доске: 3 тетради по a рублей и ещё 2
    previewDelay: 1700,   // превью на сайте: пауза между шагами, мс
  },
  print: {
    variants: 25,         // сколько вариантов печатать по умолчанию
    traps: 2,             // сколько ответов-ловушек на задание в таблице букв
    space: true,          // сетка для решения под каждым заданием
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
const VY = VI('y');
const sgn = s => (s > 0 ? '+' : MINUS);
// одночлен {k, v, m}: коэффициент, буква, степень — 3x², −x, 5
const tm = z => (z.k === 1 && z.m > 0 ? '' : z.k === -1 && z.m > 0 ? MINUS : String(z.k)) +
  (z.m > 0 ? (z.v || 'x') === 'x' ? X : VY : '') + (z.m > 1 ? PW(z.m) : '');
const tm0 = z => z.m === 0 ? String(Math.abs(z.k)) : tm({ k: Math.abs(z.k), v: z.v, m: z.m });
// сумма одночленов со знаками
const tpoly = xs => xs.map((x, i) => {
  const s = tm0(x);
  return i ? (x.k < 0 ? ` ${MINUS} ` : ' + ') + s : (x.k < 0 ? MINUS : '') + s;
}).join('');
const tkey = z => `${z.k}${z.v || ''}${z.m}`;    // ключ одночлена для таблицы букв

// ================= Типы заданий =================
// pick — выбор верного упрощения из кнопок (opts), num — число, choice — «да/нет».
// Ключи pick зависят от задания (иначе домино из 12 костяшек не соберётся из 6 типов).
const bad = (cat, msg) => ({ cat, msg });

const TYPES = {
  like: {   // подобные с одной буквой: 3x + 7x − 4x = 6x
    input: 'pick', title: 'Подобные слагаемые',
    statement: (t, html) => `${TYPES.like.text(t)} = ${html}`,
    gen: rnd => {
      const m = pick(rnd, [1, 1, 2]);
      const n = int(rnd, 3, 4), terms = [];
      for (let i = 0; i < n; i++) terms.push({ k: int(rnd, 2, 9) * (rnd() < 0.4 ? -1 : 1), v: 'x', m });
      return { terms, o: int(rnd, 1, 1000000) };
    },
    bad: t => { const s = TYPES.like.ansM(t).k; return s === 0 || t.terms.every(z => z.k > 0) || t.terms.every(z => z.k < 0); },
    ansM: t => ({ k: t.terms.reduce((s, z) => s + z.k, 0), v: 'x', m: t.terms[0].m }),
    text: t => tpoly(t.terms),
    right: t => tm(TYPES.like.ansM(t)),
    ask: t => `Приведите подобные слагаемые:<br>${TYPES.like.text(t)}`,
    sheet: t => `Приведите подобные слагаемые: ${TYPES.like.text(t)}`,
    answer: t => `${TYPES.like.text(t)} = ${TYPES.like.right(t)}`,
    wrongs(t) {
      const a = TYPES.like.ansM(t);
      return [
        { key: 'like:t1', html: tm({ k: t.terms.reduce((s, z) => s + Math.abs(z.k), 0), v: 'x', m: a.m }), cat: 'sign',
          why: `Ты сложил модули, а знаки разные бывают: складывай с учётом знаков, получится ${TYPES.like.right(t)}.` },
        { key: 'like:t2', html: tm({ k: a.k, v: 'x', m: a.m + 1 }), cat: 'power',
          why: `Степень не меняется: ${X}${a.m > 1 ? PW(a.m) : ''} + ${X}${a.m > 1 ? PW(a.m) : ''} — это снова ${X}${a.m > 1 ? PW(a.m) : ''}, а не ${X}${PW(a.m + 1)}. Складываются только коэффициенты.` }];
    },
    opts: t => [{ key: 'like:ok', html: TYPES.like.right(t) }, ...TYPES.like.wrongs(t).map(({ key, html }) => ({ key, html }))],
    ans: () => 'like:ok',
    same: (t, v) => v === 'like:ok',
    ok: t => `Буквенная часть у всех одинаковая — складываем коэффициенты: ${t.terms.map(z => z.k).join(' + ').replace(/\+ -/g, `${MINUS} `)} = ${TYPES.like.ansM(t).k}. Получаем ${TYPES.like.right(t)}.`,
    wrong(t, v) {
      const T = TYPES.like, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'like', `${w ? w.why : 'Сравни с правилом.'} ${T.ok(t)}`);
    },
    key: t => `like:${t.terms.map(tkey).join('.')}`,
    keyHTML: t => TYPES.like.right(t),
    traps: t => TYPES.like.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints: () => [`Подобные — с одинаковой буквенной частью: складывай коэффициенты, буквы не трогай.`, `Степень при букве не меняется.`],
    correct: () => 'like:ok',
    wrongInput: t => TYPES.like.wrongs(t)[0].key,
  },
  poly2: {   // две группы: 2x + 5 − x + 3 = x + 8
    input: 'pick', title: 'Две группы подобных',
    statement: (t, html) => `${TYPES.poly2.text(t)} = ${html}`,
    gen: rnd => {
      const letter = rnd() < 0.5 ? 'x' : 'y';
      const a = int(rnd, 2, 9), b = int(rnd, 2, 9), c = int(rnd, 1, 9), d = int(rnd, 1, 9);
      return { terms: [{ k: a, v: letter, m: 1 }, { k: c, v: '', m: 0 }, { k: -b, v: letter, m: 1 }, { k: d, v: '', m: 0 }], o: int(rnd, 1, 1000000) };
    },
    bad: t => t.terms[0].k + t.terms[2].k === 0,   // коэффициент при букве не ноль, иначе ответ «0x + …» совпадёт с ловушкой
    parts(t) {
      const L = t.terms.filter(z => z.m > 0).reduce((s, z) => s + z.k, 0);
      const N = t.terms.filter(z => z.m === 0).reduce((s, z) => s + z.k, 0);
      return { L: { k: L, v: t.terms[0].v, m: 1 }, N: { k: N, v: '', m: 0 } };
    },
    text: t => tpoly(t.terms),
    right(t) { const { L, N } = TYPES.poly2.parts(t); return N.k === 0 ? tm(L) : tpoly([L, N]); },
    ask: t => `Упростите выражение:<br>${TYPES.poly2.text(t)}`,
    sheet: t => `Упростите выражение: ${TYPES.poly2.text(t)}`,
    answer: t => `${TYPES.poly2.text(t)} = ${TYPES.poly2.right(t)}`,
    wrongs(t) {
      const { L, N } = TYPES.poly2.parts(t);
      return [
        { key: 'poly2:t1', html: tpoly([{ k: L.k + N.k, v: L.v, m: 1 }]), cat: 'merge',
          why: `Ты сложил букву с числом: ${tm(L)} и ${Math.abs(N.k)} — неподобные, их складывать нельзя. Правильно: ${TYPES.poly2.right(t)}.` },
        { key: 'poly2:t2', html: tpoly([{ k: -L.k, v: L.v, m: 1 }, N]), cat: 'sign',
          why: `Потерян знак при букве: посчитай коэффициенты при ${tm({ k: 1, v: L.v, m: 1 })} ещё раз — получится ${TYPES.poly2.right(t)}.` }];
    },
    opts: t => [{ key: 'poly2:ok', html: TYPES.poly2.right(t) }, ...TYPES.poly2.wrongs(t).map(({ key, html }) => ({ key, html }))],
    ans: () => 'poly2:ok',
    same: (t, v) => v === 'poly2:ok',
    ok(t) { const { L, N } = TYPES.poly2.parts(t); return `Группируем: буквы отдельно, числа отдельно. ${TYPES.poly2.text(t)} = ${TYPES.poly2.right(t)}.`; },
    wrong(t, v) {
      const T = TYPES.poly2, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'merge', `${w ? w.why : 'Сравни с правилом.'} ${T.ok(t)}`);
    },
    key: t => `poly2:${t.terms.map(tkey).join('.')}`,
    keyHTML: t => TYPES.poly2.right(t),
    traps: t => TYPES.poly2.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints: () => [`Разложи на две кучки: слагаемые с буквой и числа. Складывай внутри кучек.`, `Букву с числом складывать нельзя.`],
    correct: () => 'poly2:ok',
    wrongInput: t => TYPES.poly2.wrongs(t)[0].key,
  },
  bracket: {   // раскрыть скобки: 3(x + 4), −(a − 2)
    input: 'pick', title: 'Раскрыть скобки',
    statement: (t, html) => `${TYPES.bracket.text(t)} = ${html}`,
    gen: rnd => {
      if (rnd() < 0.45) return { form: 'num', a: int(rnd, 2, 6), s: rnd() < 0.5 ? 1 : -1, b: int(rnd, 2, 9), o: int(rnd, 1, 1000000) };
      return { form: 'sign', o: int(rnd, 1, 1000000) };
    },
    inner: t => t.form === 'num' ? [{ k: 1, v: 'x', m: 1 }, { k: t.s * t.b, v: '', m: 0 }] : [{ k: 1, v: 'x', m: 1 }, { k: -2, v: '', m: 0 }],
    coef: t => t.form === 'num' ? t.a : -1,
    text(t) {
      const c = TYPES.bracket.coef(t), inn = tpoly(TYPES.bracket.inner(t));
      return `${c === 1 ? '' : c === -1 ? MINUS : c}(${inn})`;
    },
    terms(t) {
      const c = TYPES.bracket.coef(t);
      return TYPES.bracket.inner(t).map(z => ({ k: c * z.k, v: z.v, m: z.m }));
    },
    right: t => tpoly(TYPES.bracket.terms(t)),
    ask: t => `Раскройте скобки:<br>${TYPES.bracket.text(t)}`,
    sheet: t => `Раскройте скобки: ${TYPES.bracket.text(t)}`,
    answer: t => `${TYPES.bracket.text(t)} = ${TYPES.bracket.right(t)}`,
    wrongs(t) {
      const ts = TYPES.bracket.terms(t), inn = TYPES.bracket.inner(t);
      return [
        { key: 'bracket:t1', html: tpoly([ts[0], { k: -ts[1].k, v: ts[1].v, m: ts[1].m }]), cat: 'sign',
          why: `Множитель умножается на КАЖДОЕ слагаемое в скобке, со знаком: получится ${TYPES.bracket.right(t)}.` },
        { key: 'bracket:t2', html: tpoly([inn[0], ts[1]]), cat: 'sign',
          why: `Ты раскрыл только второе слагаемое, а первое оставил как было. Умножай всё: ${TYPES.bracket.right(t)}.` }];
    },
    opts: t => [{ key: 'bracket:ok', html: TYPES.bracket.right(t) }, ...TYPES.bracket.wrongs(t).map(({ key, html }) => ({ key, html }))],
    ans: () => 'bracket:ok',
    same: (t, v) => v === 'bracket:ok',
    ok(t) {
      const c = TYPES.bracket.coef(t);
      return c === -1
        ? `Минус перед скобкой меняет все знаки: ${TYPES.bracket.text(t)} = ${TYPES.bracket.right(t)}.`
        : `Умножаем ${c} на каждое слагаемое: ${TYPES.bracket.text(t)} = ${TYPES.bracket.right(t)}.`;
    },
    wrong(t, v) {
      const T = TYPES.bracket, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'sign', `${w ? w.why : 'Сравни с правилом.'} ${T.ok(t)}`);
    },
    key(t) { const c = TYPES.bracket.coef(t); return `bracket:${c}-${t.form}`; },
    keyHTML: t => TYPES.bracket.right(t),
    traps: t => TYPES.bracket.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints: () => [`Умножь множитель на каждое слагаемое в скобке.`, `Минус перед скобкой меняет все знаки внутри.`],
    correct: () => 'bracket:ok',
    wrongInput: t => TYPES.bracket.wrongs(t)[0].key,
  },
  expand: {   // раскрыть и привести: 2(x + 3) + 3(x − 1) = 5x + 3
    input: 'pick', title: 'Скобки и подобные',
    statement: (t, html) => `${TYPES.expand.text(t)} = ${html}`,
    gen: rnd => ({ a: int(rnd, 2, 5), p: int(rnd, 1, 6), b: int(rnd, 2, 5), q: int(rnd, 1, 6) * (rnd() < 0.5 ? 1 : -1), o: int(rnd, 1, 1000000) }),
    bad: t => t.a * t.p + t.b * t.q === 0,
    text: t => `${t.a}(${X} + ${t.p}) + ${t.b}(${X} ${t.q < 0 ? MINUS : '+'} ${Math.abs(t.q)})`,
    terms(t) { return [{ k: t.a + t.b, v: 'x', m: 1 }, { k: t.a * t.p + t.b * t.q, v: '', m: 0 }]; },
    right(t) { const [L, N] = TYPES.expand.terms(t); return N.k === 0 ? tm(L) : tpoly([L, N]); },
    ask: t => `Раскройте скобки и приведите подобные:<br>${TYPES.expand.text(t)}`,
    sheet: t => `Раскройте скобки и приведите подобные: ${TYPES.expand.text(t)}`,
    answer: t => `${TYPES.expand.text(t)} = ${TYPES.expand.right(t)}`,
    wrongs(t) {
      const [L, N] = TYPES.expand.terms(t);
      return [
        { key: 'expand:t1', html: tpoly([{ k: t.a + t.b, v: 'x', m: 1 }, { k: t.a * t.p - t.b * t.q, v: '', m: 0 }]), cat: 'sign',
          why: `Знак второго свободного члена: ${t.b} · (${t.q}) = ${t.b * t.q}. Правильно: ${TYPES.expand.right(t)}.` },
        { key: 'expand:t2', html: tpoly([{ k: L.k + N.k, v: 'x', m: 1 }]), cat: 'merge',
          why: `Букву с числом складывать нельзя: ${tm(L)} и ${Math.abs(N.k)} — неподобные. Правильно: ${TYPES.expand.right(t)}.` }];
    },
    opts: t => [{ key: 'expand:ok', html: TYPES.expand.right(t) }, ...TYPES.expand.wrongs(t).map(({ key, html }) => ({ key, html }))],
    ans: () => 'expand:ok',
    same: (t, v) => v === 'expand:ok',
    ok(t) { const [L, N] = TYPES.expand.terms(t); return `Сначала скобки: ${t.a}${X} + ${t.a * t.p} + ${t.b}${X} ${t.b * t.q < 0 ? MINUS : '+'} ${Math.abs(t.b * t.q)}, потом подобные: ${TYPES.expand.right(t)}.`; },
    wrong(t, v) {
      const T = TYPES.expand, w = T.wrongs(t).find(x => x.key === v);
      return bad(w ? w.cat : 'sign', `${w ? w.why : 'Сравни с правилом.'} ${T.ok(t)}`);
    },
    key: t => `expand:${t.a}-${t.p}-${t.b}-${t.q}`,
    keyHTML: t => TYPES.expand.right(t),
    traps: t => TYPES.expand.wrongs(t).slice(0, CONFIG.print.traps).map(({ key, html }) => ({ key, html })),
    hints: () => [`Два шага: сначала раскрой обе скобки, потом приведи подобные.`, `Следи за знаком при умножении.`],
    correct: () => 'expand:ok',
    wrongInput: t => TYPES.expand.wrongs(t)[0].key,
  },
  value: {   // значение выражения: 3a + 2 при a = 5
    input: 'num', title: 'Значение выражения', oral: true,
    gen: rnd => ({ a: int(rnd, 2, 9), b: int(rnd, 1, 9), at: int(rnd, 2, 9) }),
    text: t => `${t.a}${X} + ${t.b}`,
    ask: t => `Найдите значение выражения ${TYPES.value.text(t)}<br>при ${X} = ${t.at}.`,
    sheet: t => `Найдите значение выражения ${TYPES.value.text(t)} при ${X} = ${t.at}.`,
    answer: t => `${TYPES.value.text(t)} = ${t.a * t.at + t.b} при ${X} = ${t.at}`,
    ans: t => Q(t.a * t.at + t.b),
    ok: t => `Подставляем ${X} = ${t.at}: ${t.a} · ${t.at} + ${t.b} = ${t.a * t.at} + ${t.b} = ${t.a * t.at + t.b}. Сначала умножение, потом сложение.`,
    wrong(t, v) {
      const ok = TYPES.value.ok(t), r = t.a * t.at + t.b;
      if (qeq(v, Q((t.a + t.b) * t.at))) return bad('value', `Ты сначала сложил, а умножение — первым: ${t.a} · ${t.at} = ${t.a * t.at}, и только потом + ${t.b}. ${ok}`);
      if (qeq(v, Q(t.a * (t.at + t.b)))) return bad('value', `Подставляй вместо буквы только её значение: ${X} = ${t.at}, а ${t.b} уже стоит отдельно. ${ok}`);
      return bad('calc', `Подставь ${X} = ${t.at} и посчитай заново. ${ok}`);
    },
    traps(t) {
      const r = t.a * t.at + t.b;
      return [Q((t.a + t.b) * t.at), Q(t.a + t.b + t.at)].filter(z => !qeq(z, Q(r))).map(z => ({ key: keyQ(z), html: htmlQ(z) })).slice(0, CONFIG.print.traps);
    },
    hints: () => [`Подставь число вместо буквы и посчитай.`, `Сначала умножение, потом сложение.`],
  },
  check: {   // верно ли упростили: 2x + 3y = 5xy — нет
    input: 'choice', title: 'Верно ли упростили', options: [['да', 'Да'], ['нет', 'Нет']], oral: true,
    statement: (t, html) => `${TYPES.check.text(t)} — ${html}`,
    gen: rnd => ({ a: int(rnd, 2, 9), b: int(rnd, 2, 9), v: pick(rnd, ['ok', 'merge', 'sign']) }),
    bad: t => t.v === 'sign' && t.a === t.b,
    pair(t) {
      if (t.v === 'merge') return { q: `${t.a}${X} + ${t.b}${VY} = ${t.a + t.b}${X}${VY}`, good: false,
        why: `${X} и ${VY} — неподобные: складывать их нельзя, ${t.a}${X} + ${t.b}${VY} так и остаётся` };
      if (t.v === 'sign') return { q: `${t.a}${X} ${MINUS} ${t.b}${X} = ${t.b - t.a}${X}`, good: false,
        why: `${t.a} ${MINUS} ${t.b} = ${t.a - t.b}, а не ${t.b - t.a}: ${t.a}${X} ${MINUS} ${t.b}${X} = ${t.a - t.b}${X}` };
      return { q: `${t.a}${X} + ${X} = ${t.a + 1}${X}`, good: true, why: '' };
    },
    text: t => TYPES.check.pair(t).q,
    ask: t => `Верно ли упростили?<br>${TYPES.check.text(t)}`,
    sheet: t => `Верно ли упростили: ${TYPES.check.text(t)}?`,
    answer(t) { const p = TYPES.check.pair(t); return `${p.q} — ${p.good ? 'верно' : 'неверно'}`; },
    ans: t => TYPES.check.pair(t).good ? 'да' : 'нет',
    ok(t) { const p = TYPES.check.pair(t); return p.good ? `Да: ${t.a} + 1 = ${t.a + 1}, буква та же.` : `Нет: ${p.why}.`; },
    wrong(t) { const p = TYPES.check.pair(t); return bad('trust', p.good
      ? `Не торопись отвечать «нет»: 4${X} + ${X} = 5${X} — здесь всё верно.`
      : `Не верь записи на слово: ${p.why}.`); },
    key: t => TYPES.check.ans(t),
    keyHTML: t => esc(TYPES.check.ans(t)),
    traps(t) { const o = TYPES.check.ans(t) === 'да' ? 'нет' : 'да'; return [{ key: o, html: esc(o) }]; },
    hints: () => [`Проверь: подобные ли слагаемые и верен ли знак.`, `Букву с другой буквой складывать нельзя.`],
  },
};

// ================= Решения с одной ошибкой: «найди ошибку» =================
const errLines = (lines, at, badLine, why) => ({ lines: lines.map((l, i) => (i === at ? badLine : l)), at, fix: lines[at], why });
TYPES.like.mistake = (t, rnd) => {
  const T = TYPES.like, w = T.wrongs(t);
  const L = [`${T.text(t)} = ${T.right(t)}`, `проверка: подставь ${X} = 1: ${t.terms.map(z => z.k).join(' + ').replace(/\+ -/g, `${MINUS} `)} = ${T.ansM(t).k}`];
  return pick(rnd, [
    () => errLines(L, 0, `${T.text(t)} = ${w[0].html}`, 'Сложили модули без учёта знаков: складывай коэффициенты со знаками.'),
    () => errLines(L, 0, `${T.text(t)} = ${w[1].html}`, 'Степень при букве не меняется: складываются только коэффициенты.'),
  ])();
};
TYPES.bracket.mistake = (t, rnd) => {
  const T = TYPES.bracket, w = T.wrongs(t);
  const L = [`${T.text(t)} = ${T.right(t)}`, `проверка: ${T.right(t)} — умножь обратно`];
  return pick(rnd, [
    () => errLines(L, 0, `${T.text(t)} = ${w[0].html}`, 'Множитель умножается на каждое слагаемое в скобке, со знаком.'),
    () => errLines(L, 0, `${T.text(t)} = ${w[1].html}`, 'Первое слагаемое тоже умножается, а не переписывается.'),
  ])();
};

// ================= Ошибки: блок «Над чем поработать» =================
const CATS = {
  like: ['Подобные слагаемые', 'Складывай коэффициенты при одинаковой буквенной части; степень не меняется.'],
  merge: ['Неподобные слагаемые', 'Букву с числом и разные буквы складывать нельзя: 2x + 3 так и остаётся.'],
  sign: ['Знаки', 'Минус перед скобкой меняет все знаки; при вычитании считай 5 − 8 = −3. Умножай каждое слагаемое со знаком.'],
  power: ['Степени', 'Степень при букве не меняется при сложении: x² + x² = 2x², а не x⁴.'],
  value: ['Порядок действий', 'Подставил число — сначала умножение, потом сложение.'],
  trust: ['Проверяй запись', 'Подобные ли слагаемые? Верен ли знак? Букву с другой буквой не складывай.'],
  calc: ['Вычисления', 'Проверь арифметику коэффициентов.'],
};

// ================= Разделы тренажёра =================
const SECTIONS = [
  { title: 'Раздел 1', text: 'Подобные слагаемые', types: ['like', 'poly2'], ex: () => `3${X} + 7${X} = ?` },
  { title: 'Раздел 2', text: 'Скобки', types: ['bracket', 'expand'], ex: () => `3(${X} + 4) = ?` },
  { title: 'Раздел 3', text: 'Считаем и проверяем', types: ['value', 'check'], ex: () => `2${X} + 1 при ${X} = 5` },
];

// ================= Раздатка =================
// Состав варианта: шесть заданий, верные ответы складываются в слово из 6 разных букв
const KINDS_V1 = [['like'], ['poly2'], ['bracket'], ['expand'], ['value'], ['check']];
// Слова для самопроверки: столько букв, сколько заданий, буквы не повторяются
const WORDS_V1 = ['СЧИТАЙ', 'ЗНАЧОК', 'ВЫРАЗИ'];

// Билет на выход и самостоятельная (форматы ядра): состав можно менять, пока на них нет напечатанных листов
const EXIT_V1 = [['like'], ['bracket'], ['value']];
const TEST_V1 = {
  parts: [['like'], ['poly2'], ['bracket'], ['expand'], ['value'], ['check']],
  points: [1, 1, 1, 2, 1, 1],
  grades: { 5: 6, 4: 5, 3: 3 },
};

const PRINT = {
  instr: 'Выбери верное упрощение и найди его букву в таблице. Впиши буквы в клеточки под номерами заданий — получится слово. '
    + 'Если слово не сложилось, поищи ошибку.',
  about: 'В каждом варианте шесть заданий: подобные слагаемые, две группы, раскрытие скобок, скобки с приведением, '
    + 'значение выражения и проверка «верно ли упростили». Шесть верных ответов складываются в слово.',
  ogeAbout: '',
};

// ================= На доске =================
// Три тетради по a рублей и ещё две: сколько стоят все?
function boardExample(random, old) {
  if (!random) return { a: CONFIG.board.a, n: CONFIG.board.n };
  const rnd = mulberry32(((Math.random() * 4294967296) >>> 0));
  let a, n, guard = 0;
  do { a = int(rnd, 2, 4); n = int(rnd, 1, 3); } while (++guard < 50 && old.a === a && old.n === n);
  return { a, n };
}
// Подписи на чертеже — SVG-текст: курсив через tspan (тег <i> в SVG не работает)
const si = v => `<tspan font-style="italic">${v}</tspan>`;
const BX = 90, BY = 90;
const blines = (lines, y0 = 90) => lines.map((l, i) =>
  `<g class="${l.cls || ''}">${tx(500, y0 + i * 54, l.t, 'lab s' + (l.lc ? ' ' + l.lc : ''), 'start')}</g>`).join('');
// Полка с тетрадями: a одинаковых стопок слева и n справа
function shelfScene(a, n, lines = [], opt = {}) {
  const w = 44, h = 120, x = BX, y = BY;
  let s = '';
  for (let i = 0; i < a; i++) s += `<rect class="gs" x="${x + i * (w + 8)}" y="${y}" width="${w}" height="${h}"/>`;
  const x2 = x + a * (w + 8) + 40;
  for (let i = 0; i < n; i++) s += `<rect class="gw" x="${x2 + i * (w + 8)}" y="${y}" width="${w}" height="${h}"/>`;
  s += under(x, y + h, a * (w + 8) - 8, opt.hideNums ? '?' : `${a} по ${si('a')} р.`, 'warm');
  s += under(x2, y + h, n * (w + 8) - 8, opt.hideNums ? '?' : `${n} по ${si('a')} р.`, 'warm');
  if (!opt.hideNums) s += tx(x, y - 16, `${a}${si('a')} + ${n}${si('a')} = ${a + n}${si('a')}`, 'lab s acc', 'start');
  return s + blines(lines);
}
// Живая модель доски: фишки-слагаемые (подобные к подобному) и стадии раскрытия скобок
const LIVE = {
  model: e => ({
    chips: [{ x: 150, y: 150, g: 'x' }, { x: 300, y: 150, g: 'y' }, { x: 450, y: 150, g: 'x' }, { x: 600, y: 150, g: 'y' }],
    stage: 0, go: 0,
  }),
  fix(m) {
    if (!Array.isArray(m.chips)) return;   // в видах показа модели нет — только текст шагов
    for (const c of m.chips) {
      c.x = Math.max(60, Math.min(920, Math.round(c.x)));
      c.y = Math.max(60, Math.min(340, Math.round(c.y)));
    }
    m.stage = Math.max(0, Math.min(2, Math.round(m.stage)));
    if (!Number.isFinite(m.go)) m.go = 0;
  },
  ok: m => !Array.isArray(m.chips) || (m.chips.every(c => Number.isFinite(c.x) && Number.isFinite(c.y)) && m.stage >= 0 && m.stage <= 2),
};
// две кучки: левая для x, правая для y
const pile = (cx, label, color) => `<rect class="${color}" x="${cx - 130}" y="60" width="260" height="280" rx="14"/>` +
  tx(cx, 320, label, 'lab s', 'middle');
function chipsScene(m, show) {
  if (!Array.isArray(m.chips)) return '';   // в видах показа модели нет — только текст шагов
  let s = pile(220, `с ${si('x')}`, 'gs') + pile(700, `с ${si('y')}`, 'gw');
  const name = (c, i) => c.g === 'x' ? `2${si('x')}` : `3${si('y')}`;
  m.chips.forEach((c, i) => {
    s += `<circle class="gf" cx="${c.x}" cy="${c.y}" r="34"/>` + tx(c.x, c.y + 10, show ? name(c, i) : `${si('?')}`, 'lab s', 'middle');
  });
  return s;
}
function buildSteps(e) {
  const { a, n } = e, S = a + n;
  return [
    { q: `Три тетради по ${si('a')} рублей и ещё две по ${si('a')} рублей. Сколько стоят все?`,
      a: `${a}${si('a')} + ${n}${si('a')} = ${S}${si('a')}. Одинаковые буквы складываем: 3 + 2 = 5.`,
      note: 'Начало урока: цена выражена буквой. Спросите: что общего у слагаемых и что получится?',
      draw: ph => shelfScene(a, n, ph ? [{ t: `${a}a + ${n}a = ${S}a`, cls: 'new', lc: 'acc' }] : [], { hideNums: !ph }),
      rec: ph => ph ? [`${a}a + ${n}a = ${S}a`] : [] },
    { q: 'Здесь четыре фишки: 2x, 3y, x, 5y. Разложи их на две кучки — подобное к подобному.',
      a: 'Слева всё с x, справа всё с y. Внутри кучек слагаемые подобные — их можно складывать.',
      note: 'Тяните фишки мышью, пальцем или стрелками. «Показать ответ» соберёт кучки сам; «Сбросить» вернёт.',
      live: {
        enter(m) { m.go = 0; },
        reveal() { liveTo([{ chips: [{ x: 150, y: 150 }, { x: 700, y: 150 }, { x: 290, y: 150 }, { x: 560, y: 150 }] }, { go: 1 }], 1200); },
        handles: m => m.chips.map((c, i) => ({ id: 'c' + i, at: { x: c.x, y: c.y }, label: 'Фишка ' + (i + 1),
          move(mm, p) { mm.chips[i].x = p.x; mm.chips[i].y = p.y; },
          key(mm, dx, dy) { mm.chips[i].x += dx; mm.chips[i].y += dy; } })),
      },
      draw: (ph, m) => chipsScene(m, ph || m.go > 0.5) + blines((ph || m.go > 0.5)
        ? [{ t: `слева: 2${si('x')} + ${si('x')}`, cls: 'new', lc: 'acc' }, { t: `справа: 3${si('y')} + 5${si('y')}`, cls: 'new', lc: 'acc' }] : []),
      rec: (ph, m) => ph ? [`подобные: 2${si('x')}, ${si('x')} и 3${si('y')}, 5${si('y')}`] : [] },
    { q: 'Какие слагаемые называются подобными?',
      a: `Подобные — с одинаковой буквенной частью: 2${si('x')} и ${si('x')} — подобные, а ${si('x')} и ${si('y')} — нет.`,
      note: 'Вывод: смотрим на буквы, а не на числа. Коэффициенты могут быть любыми.',
      draw: () => '',
      rec: () => [`подобные: одинаковая буквенная часть`] },
    { q: `Сложи кучки: 2${si('x')} + ${si('x')} и 3${si('y')} + 5${si('y')}.`,
      a: `3${si('x')} и 8${si('y')}. Складываем коэффициенты, буквы не трогаем.`,
      note: 'Степень тоже не меняется: x + x = 2x, а не x².',
      draw: () => '',
      rec: ph => ph ? [`2${si('x')} + ${si('x')} = 3${si('x')}`, `3${si('y')} + 5${si('y')} = 8${si('y')}`] : [] },
    { q: `Ловушка: 2${si('x')} + 3${si('y')} = 5${si('xy')}?`,
      a: `Нет! ${si('x')} и ${si('y')} — неподобные, складывать нельзя: 2${si('x')} + 3${si('y')} так и остаётся.`,
      note: 'Шаг-ловушка на самую частую ошибку. Пусть класс объяснит, почему «5xy» неверно.',
      draw: ph => blines(ph
        ? [{ t: `2${si('x')} + 3${si('y')} ≠ 5${si('xy')}`, cls: 'new', lc: 'warm' },
           { t: `разные буквы — не складываем`, cls: 'new', lc: 'acc' }]
        : [{ t: `2${si('x')} + 3${si('y')} = ?`, lc: 'warm' }]),
      rec: ph => ph ? [`2${si('x')} + 3${si('y')} — не упрощается`] : [] },
    { q: `Плюс перед скобкой: ${si('x')} + (2${si('x')} ${MINUS} 5). Что получится?`,
      a: `${si('x')} + 2${si('x')} ${MINUS} 5 = 3${si('x')} ${MINUS} 5. Плюс ничего не меняет.`,
      note: 'Скобку с плюсом просто убираем.',
      draw: () => '',
      rec: ph => ph ? [`${si('x')} + (2${si('x')} ${MINUS} 5) = 3${si('x')} ${MINUS} 5`] : [] },
    { q: `А минус? 5${si('x')} ${MINUS} (2${si('x')} + 1).`,
      a: `5${si('x')} ${MINUS} 2${si('x')} ${MINUS} 1 = 3${si('x')} ${MINUS} 1. Минус меняет все знаки в скобке.`,
      note: 'Главная ловушка скобок: минус относится к каждому слагаемому, а не только к первому.',
      draw: () => '',
      rec: ph => ph ? [`5${si('x')} ${MINUS} (2${si('x')} + 1) = 3${si('x')} ${MINUS} 1`] : [] },
    { q: m => `В два шага: 2(${si('x')} + 3) + 3(${si('x')} ${MINUS} 1). Двигай ползунок стадий.`,
      a: `Сначала скобки: 2${si('x')} + 6 + 3${si('x')} ${MINUS} 3, потом подобные: 5${si('x')} + 3.`,
      note: 'Ползунок «Шаг» показывает стадии. Ошибка «букву с числом сложить» видна сразу.',
      live: {
        enter(m) { m.stage = 0; },
        reveal(m) { liveTo({ stage: 2 }, 1200); },
        controls: () => [
          { id: 'stage', type: 'choice', label: 'Шаг', options: [[0, 'Выражение'], [1, 'Скобки'], [2, 'Подобные']],
            get: m => m.stage, set(m, v) { m.stage = v; } },
        ],
      },
      draw: (ph, m) => {
        const st = ph ? 2 : m.stage;
        const rows = [`2(${si('x')} + 3) + 3(${si('x')} ${MINUS} 1)`];
        if (st >= 1) rows.push(`= 2${si('x')} + 6 + 3${si('x')} ${MINUS} 3`);
        if (st >= 2) rows.push(`= 5${si('x')} + 3`);
        return blines(rows.map((t, i) => ({ t, cls: i === rows.length - 1 && st === 2 ? 'new' : '', lc: i === rows.length - 1 ? 'acc' : '' })));
      },
      rec: (ph, m) => (ph || m.stage >= 2) ? [`2(${si('x')} + 3) + 3(${si('x')} ${MINUS} 1) = 5${si('x')} + 3`] : [] },
    { q: `Сколько будет 3${si('a')} + 2 при ${si('a')} = 5?`,
      a: `3 · 5 + 2 = 17. Подставили число вместо буквы: сначала умножение, потом сложение.`,
      note: 'Буква — это место для числа. Порядок действий обычный.',
      draw: () => '',
      rec: ph => ph ? [`3 · 5 + 2 = 17`] : [] },
    { q: 'Итог: что делаем с буквенным выражением?',
      a: 'Убираем скобки (минус меняет знаки), складываем подобное с подобным, для значения — подставляем число.',
      note: 'Попросите класс перечислить шаги своими словами.',
      draw: () => '',
      rec: () => ['1. Раскрой скобки.', '2. Приведи подобные.', '3. Для значения — подставь число.'] },
  ];
}
// превью на сайте крутит шаги до previewUntil (счёт с 0); картинка-превью — шаг poster с показанным ответом
const BOARD = { previewUntil: 2, poster: 1 };

// Формулы в справке (help.html): ядро вызывает helpInit() при запуске
function helpInit() {
  const put = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
  put('helpLike', `3${X} + 7${X} — подобные, а 3${X} + 7 — нет`);
  put('helpEx1', `3${X} + 7${X} = 10${X}`);
  put('helpBr', `+(${X} ${MINUS} 2) = ${X} ${MINUS} 2; ${MINUS}(${X} ${MINUS} 2) = ${MINUS}${X} + 2`);
  put('helpEx2', `3${X} + 2 = 17 при ${X} = 5`);
}

// ================= Свои виды ввода =================
// pick: выбор верного упрощения из кнопок (порядок перемешан зерном t.o)
const TOPIC_INPUTS = {
  pick: {
    html: t => `<div class="inrow picks">${shuffle(mulberry32(t.o), TYPES[t.type].opts(t))
      .map(o => `<button type="button" class="choice" data-choice="${o.key}"><span class="nw">${o.html}</span></button>`).join('')}</div>` +
      '<p class="hnote">Выбери верное упрощение.</p>',
    collect: () => null,
  },
};
