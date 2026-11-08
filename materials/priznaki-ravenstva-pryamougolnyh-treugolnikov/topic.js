// Тема «Признаки равенства прямоугольных треугольников» (7 класс, геометрия, уроки 22–23). Только содержание —
// каркас даёт ядро (core/). Три признака: по двум катетам, по катету и прилежащему острому углу, по гипотенузе
// и катету. Сумма углов треугольника по плану идёт позже — признаки, которые доказывают через неё
// (по гипотенузе и острому углу, по катету и противолежащему углу), в тему не входят и в ловушки не берутся.
// Схемы — ИНСТРУКЦИЯ.md, разделы 3 и 9.

// ================= Параметры: учитель может поменять их за минуту =================
const CONFIG = {
  board: {
    // разминка — какой признак по чертежу и где гипотенуза; «верно — неверно» — готовые ответы задач с чертежом
    shows: ['warmup', 'truefalse'],
    a: 7, c: 10,          // опыт «гипотенуза и катет»: катет AC = 7, гипотенуза AB = 10 (клеток)
    previewDelay: 2100,   // превью на сайте: пауза между шагами, мс
  },
  print: {
    // кодовое слово — урок, билет — проверка в конце урока, самостоятельная — после второго урока
    formats: ['word', 'exit', 'test'],
    variants: 25,         // сколько вариантов печатать по умолчанию
    traps: 2,             // сколько ответов-ловушек на задание в таблице букв
    space: false,         // задание — чертёж и короткий ответ: сетка для решения не нужна
  },
  home: {
    round: 10,            // заданий в тренировке
    points: [10, 15],     // очки за задание по разделам
    hintPenalty: 3,       // штраф за подсказку
    maxMultiplier: 3,     // множитель за серию: +1 за каждые 3 задания подряд без ошибок
  },
};
// Версия генератора — первая часть номера варианта «1-4817». Изменил генератор или состав
// заданий раздатки — увеличь версию и оставь старую ветку, пока на неё есть напечатанные листы.
const GEN_VERSION = 1;

// ================= Запись =================
const hname = s => String(s).replace(/\d/g, d => `<sub>${d}</sub>`);    // 'A1B1' → A₁B₁ в HTML
const TRI1 = '△ABC', TRI2 = hname('△A1B1C1');
const GIVEN = `∠C = ${hname('∠C1')} = 90°`;
// стороны: противолежащая вершине; гипотенуза — против прямого угла
const OPP = { A: 'BC', B: 'AC', C: 'AB' };
const prime = s => s.replace(/[ABC]/g, ch => ch + '1');

// ================= Малые чертежи заданий (тренажёр и лист) =================
// GEO ядра с классами темы (topic.css): side — стороны, tick — штрихи, arc — дужки, vl — вершины, num — числа
const taskSVG = (w, h, inner) => `<svg class="tdraw" viewBox="0 0 ${w} ${h}" role="img" aria-label="Чертёж к заданию">${inner}</svg>`;
const XY = GEO.pt;
// пара прямоугольных треугольников, viewBox 660 × 260. Второй — зеркальный, поэтому соответственные стороны
// стоят на чертеже по-разному. shape: same — равные, small — меньше (ловушка «только угол»),
// otherLeg — другой второй катет, otherHyp — та же гипотенуза, другие катеты
function pairTris(shape = 'same') {
  const T1 = { C: XY(70, 225), A: XY(70, 55), B: XY(290, 225) };
  let T2 = { C: XY(590, 225), A: XY(590, 55), B: XY(370, 225) };
  if (shape === 'small') T2 = { C: XY(590, 225), A: XY(590, 115), B: XY(447, 225) };
  if (shape === 'otherLeg') T2 = { C: XY(590, 225), A: XY(590, 55), B: XY(440, 225) };
  if (shape === 'otherHyp') T2 = { C: XY(590, 225), A: XY(590, 125), B: XY(331, 225) };
  return [T1, T2];
}
const END = { AB: ['A', 'B'], BC: ['B', 'C'], AC: ['A', 'C'] };
const RAYS = { A: ['B', 'C'], B: ['A', 'C'] };
// marks: { ticks: [[сторона, n]], arcs: [[вершина, n]] }; nums — подписи сторон [[треугольник 0|1, сторона, текст]]
function pairSVG(marks, shape = 'same', nums = []) {
  const Ts = pairTris(shape);
  let s = '';
  Ts.forEach((T, i) => {
    const g = GEO.centroid([T.A, T.B, T.C]), n = i ? '1' : '';
    s += GEO.poly([T.A, T.B, T.C], 'side') + GEO.right(T.C, T.A, T.B, 16, 'arc');
    for (const k of ['A', 'B', 'C']) s += GEO.vertex(T[k], k + n, g, 22, 'vl');
    for (const [sd, c] of marks.ticks || []) s += GEO.ticks(T[END[sd][0]], T[END[sd][1]], c, 'tick');
    for (const [v, c] of marks.arcs || []) s += GEO.arcs(T[v], T[RAYS[v][0]], T[RAYS[v][1]], c, 22, 'arc');
    for (const [j, sd, text] of nums) if (j === i) s += GEO.side(T[END[sd][0]], T[END[sd][1]], text, g, 34, 'num');
  });
  return taskSVG(660, 290, s);   // ниже — место для подписи нижнего катета
}
// одиночный прямоугольный треугольник с прямым углом при вершине v (задание «где гипотенуза»), 330 × 230
function oneSVG(v) {
  const pos = { C: [XY(60, 200), XY(60, 40), XY(280, 200)], A: [XY(60, 40), XY(60, 200), XY(280, 40)], B: [XY(280, 200), XY(60, 200), XY(280, 40)] }[v];
  const T = { [v]: pos[0] }, others = ['A', 'B', 'C'].filter(k => k !== v);
  T[others[0]] = pos[1]; T[others[1]] = pos[2];
  const g = GEO.centroid([T.A, T.B, T.C]);
  let s = GEO.poly([T.A, T.B, T.C], 'side') + GEO.right(T[v], T[others[0]], T[others[1]], 16, 'arc');
  for (const k of ['A', 'B', 'C']) s += GEO.vertex(T[k], k, g, 22, 'vl');
  return taskSVG(330, 230, s);
}
// треугольник ABC с высотой BD (задачи «высота»), 560 × 250; marks — что отмечено, nums — числа на сторонах
function heightSVG(t) {
  const B = XY(280, 30), A = XY(60, 210), C = XY(500, 210), D = XY(280, 210), g = XY(280, 140);
  let s = GEO.poly([A, B, C], 'side') + GEO.seg(B, D, 'side') + GEO.right(D, B, C, 15, 'arc');
  s += GEO.vertex(A, 'A', g, 22, 'vl') + GEO.vertex(B, 'B', XY(280, 120), 22, 'vl') + GEO.vertex(C, 'C', g, 22, 'vl') +
    GEO.text(XY(280, 236), 'D', 'vl');
  if (t.form === 'mid') s += GEO.ticks(A, D, 1, 'tick') + GEO.ticks(D, C, 1, 'tick') +
    GEO.side(A, B, String(t.m), g, 34, 'num') + GEO.text(XY(170, 236), String(t.d), 'num');
  if (t.form === 'iso') s += GEO.ticks(A, B, 1, 'tick') + GEO.ticks(B, C, 1, 'tick') +
    GEO.side(A, B, String(t.m), g, 34, 'num') + GEO.text(XY(390, 236), `AC = ${2 * t.d}`, 'num');
  if (t.form === 'ang') s += GEO.arcs(B, A, D, 1, 30, 'arc') + GEO.arcs(B, D, C, 1, 30, 'arc') +
    GEO.text(XY(170, 236), String(t.d), 'num') + GEO.text(XY(300, 130), String(t.h), 'num', 'start');
  return taskSVG(560, 250, s);
}

// ================= Признаки: сценарии чертежей =================
const SIGN = {
  legs:   { opt: 'По двум катетам', key: 'катеты', short: 'два катета' },
  legang: { opt: 'По катету и острому углу', key: 'катет и угол', short: 'катет и прилежащий к нему острый угол' },
  hypleg: { opt: 'По гипотенузе и катету', key: 'гипотенуза и катет', short: 'гипотенуза и катет' },
  none:   { opt: 'Не доказано', key: 'не доказано', short: '' },
};
const SIGN_OPTS = Object.entries(SIGN).map(([k, s]) => [k, s.opt]);
// что отмечено на чертеже и почему признак работает (или нет)
function scen(kind, v) {
  if (kind === 'legs') return { marks: { ticks: [['AC', 1], ['BC', 2]] }, shape: 'same',
    elems: [`AC = ${hname('A1C1')}`, `BC = ${hname('B1C1')}`],
    why: `Равны оба катета: AC = ${hname('A1C1')}, BC = ${hname('B1C1')}, а прямые углы между ними равны. Это признак по двум катетам (первый признак: две стороны и угол между ними).` };
  if (kind === 'legang') {
    const leg = v === 'A' ? 'AC' : 'BC';
    return { marks: { ticks: [[leg, 1]], arcs: [[v, 1]] }, shape: 'same',
      elems: [`${leg} = ${hname(prime(leg))}`, `∠${v} = ${hname('∠' + v + '1')}`],
      why: `Равны катет ${leg} и прилежащий к нему острый угол ${v}. Второй угол при этом катете — прямой. Это признак по катету и прилежащему острому углу (второй признак: сторона и два прилежащих угла).` };
  }
  if (kind === 'hypleg') {
    const leg = v === 'A' ? 'AC' : 'BC';
    return { marks: { ticks: [['AB', 1], [leg, 2]] }, shape: 'same',
      elems: [`AB = ${hname('A1B1')} — гипотенузы`, `${leg} = ${hname(prime(leg))}`],
      why: `Равны гипотенузы AB = ${hname('A1B1')} и катеты ${leg} = ${hname(prime(leg))}. Это признак по гипотенузе и катету — отдельный признак прямоугольных треугольников.` };
  }
  if (kind === 'ang') return { marks: { arcs: [['A', 1]] }, shape: 'small', elems: [`∠A = ${hname('∠A1')}`],
    why: `Равны только острые углы (и прямые). Ни одной пары равных сторон нет: форма та же, а размер разный — на чертеже второй треугольник меньше. Равенство не доказано.` };
  if (kind === 'leg') return { marks: { ticks: [['AC', 1]] }, shape: 'otherLeg', elems: [`AC = ${hname('A1C1')}`],
    why: `Равен только один катет. Второй катет может быть любым — на чертеже он разный. Нужен ещё катет, прилежащий острый угол или гипотенуза. Равенство не доказано.` };
  return { marks: { ticks: [['AB', 1]] }, shape: 'otherHyp', elems: [`AB = ${hname('A1B1')}`],
    why: `Равны только гипотенузы. Катеты при той же гипотенузе бывают разными — на чертеже второй треугольник «приплюснут». Нужен ещё катет. Равенство не доказано.` };
}

// ================= Типы заданий =================
// input: choice — выбор (options), num — число. Чертёж — в ask (тренажёр) и sheet (лист).
const bad = (cat, msg) => ({ cat, msg });
const numTraps = (t, right, xs) => xs.filter((x, i, a) => x > 0 && x !== right && a.indexOf(x) === i).map(x => ({ key: keyQ(Q(x)), html: htmlQ(Q(x)) }));
// стороны треугольников — пифагоровы тройки (катет, катет, гипотенуза): чертёж и числа не противоречат друг другу
const TRIPLES = [[3, 4, 5], [6, 8, 10], [5, 12, 13], [9, 12, 15], [8, 15, 17], [12, 16, 20], [7, 24, 25], [20, 21, 29], [15, 20, 25], [10, 24, 26]];
const SIDE_WORD = { AB: 'гипотенуза', AC: 'катет', BC: 'катет' };

const TYPES = {
  // по отметкам на чертеже — какой признак
  which: {
    input: 'choice', title: 'Какой признак?', oral: true, options: SIGN_OPTS.slice(0, 3),
    gen: rnd => ({ kind: pick(rnd, ['legs', 'legang', 'hypleg']), v: pick(rnd, ['A', 'B']) }),
    bad: t => t.kind === 'legs' && t.v === 'B',   // у признака по двум катетам один чертёж
    text: t => `По какому признаку равны прямоугольные ${TRI1} и ${TRI2}?`,
    ask: t => { const S = scen(t.kind, t.v); return pairSVG(S.marks, S.shape) + `<p class="tq">${GIVEN}. По какому признаку равны ${TRI1} и ${TRI2}?</p>`; },
    sheet: t => { const S = scen(t.kind, t.v); return pairSVG(S.marks, S.shape) + `<p class="tq">${GIVEN}. Назови признак равенства.</p>`; },
    answer: t => SIGN[t.kind].opt,
    ans: t => t.kind,
    ok: t => scen(t.kind, t.v).why,
    wrong(t, x) {
      const S = scen(t.kind, t.v);
      const fix = {
        legs: 'Признак по двум катетам — отмечены обе стороны при прямом угле. ',
        legang: 'Признак по катету и углу — отмечены одна сторона и угол при ней. ',
        hypleg: 'Признак по гипотенузе и катету — отмечена сторона против прямого угла и ещё один катет. ',
      };
      return bad(x === 'hypleg' || t.kind === 'hypleg' ? 'hyp' : 'which', `${fix[x] || ''}На этом чертеже ${GIVEN} и отмечено: ${S.elems.join('; ')}. ${S.why}`);
    },
    key: t => SIGN[t.kind].key,
    keyHTML: t => SIGN[t.kind].key,
    traps: t => ['legs', 'legang', 'hypleg', 'none'].filter(k => k !== t.kind).map(k => ({ key: SIGN[k].key, html: SIGN[k].key })),
    hints: t => ['Найди, какие стороны отмечены штрихами: катеты лежат при прямом угле, гипотенуза — против него.',
      `Отмечено: ${scen(t.kind, t.v).elems.join('; ')}.`],
  },
  // ловушка: данных не хватает
  trap: {
    input: 'choice', title: 'Ловушка: хватит ли данных', options: SIGN_OPTS,
    gen: rnd => ({ kind: pick(rnd, ['ang', 'leg', 'hyp']) }),
    text: t => `Равны ли прямоугольные ${TRI1} и ${TRI2}?`,
    ask: t => { const S = scen(t.kind); return pairSVG(S.marks, S.shape) + `<p class="tq">${GIVEN}. По какому признаку равны ${TRI1} и ${TRI2}?</p>`; },
    sheet: t => { const S = scen(t.kind); return pairSVG(S.marks, S.shape) + `<p class="tq">${GIVEN}. Признак — или «не доказано»?</p>`; },
    answer: () => 'Равенство не доказано',
    ans: () => 'none',
    ok: t => `Верно. ${scen(t.kind).why}`,
    wrong: t => bad('none', `${GIVEN} — это одна пара. Для признака нужны ещё две пары элементов, и хотя бы одна из них — стороны. ${scen(t.kind).why}`),
    key: () => SIGN.none.key,
    keyHTML: () => SIGN.none.key,
    traps: t => (t.kind === 'hyp' ? ['hypleg', 'legs'] : t.kind === 'leg' ? ['legs', 'legang'] : ['legang', 'legs']).map(k => ({ key: SIGN[k].key, html: SIGN[k].key })),
    hints: () => ['Посчитай отмеченные пары. Прямые углы равны всегда — сколько ещё пар отмечено?',
      'Для любого признака нужна вторая пара — и хотя бы одна сторона. Здесь её хватает?'],
  },
  // где гипотенуза
  hyp: {
    input: 'choice', title: 'Где гипотенуза', oral: true, options: [['AB', 'AB'], ['BC', 'BC'], ['AC', 'AC']],
    gen: rnd => ({ v: pick(rnd, ['A', 'B', 'C']) }),
    text: t => `В △ABC ∠${t.v} = 90°. Какая сторона — гипотенуза?`,
    ask: t => oneSVG(t.v) + `<p class="tq">В △ABC ∠${t.v} = 90°. Какая сторона — гипотенуза?</p>`,
    sheet: t => oneSVG(t.v) + `<p class="tq">∠${t.v} = 90°. Гипотенуза — ?</p>`,
    answer: t => `Гипотенуза — ${OPP[t.v]}`,
    ans: t => OPP[t.v],
    ok: t => `Гипотенуза лежит против прямого угла: против ∠${t.v} — сторона ${OPP[t.v]}. Две другие стороны — катеты, они образуют прямой угол.`,
    wrong: t => bad('hyp', `Эта сторона выходит из вершины прямого угла — это катет. Гипотенуза лежит против прямого угла: ∠${t.v} = 90°, против него — ${OPP[t.v]}.`),
    key: t => OPP[t.v],
    keyHTML: t => OPP[t.v],
    traps: t => ['AB', 'BC', 'AC'].filter(s => s !== OPP[t.v]).map(s => ({ key: s, html: s })),
    hints: t => ['Катеты — стороны прямого угла, гипотенуза — против него.', `Какая сторона не проходит через вершину ${t.v}?`],
  },
  // треугольники равны по признаку — найти соответственную сторону второго
  corr: {
    input: 'num', title: 'Соответственная сторона',
    gen: rnd => {
      const [ac, bc, ab] = pick(rnd, TRIPLES);
      const kind = pick(rnd, ['legs', 'legang', 'hypleg']);
      // спрашиваем сторону, которая не отмечена: по ней равенство и даёт новый факт
      const ask = kind === 'legs' ? 'AB' : kind === 'legang' ? pick(rnd, ['AB', 'BC']) : 'BC';
      return { kind, ac, bc, ab, ask };
    },
    text: t => `<span class="nw">${hname(prime(t.ask))}</span>`,   // у поля ввода: «A₁B₁ =»; вопрос целиком — в ask
    marks: t => scen(t.kind, 'A').marks,
    ask: t => pairSVG(TYPES.corr.marks(t), 'same', [[0, 'AC', String(t.ac)], [0, 'BC', String(t.bc)], [0, 'AB', String(t.ab)], [1, t.ask, '?']]) +
      `<p class="tq">${GIVEN}. Найдите ${hname(prime(t.ask))}.</p>`,
    sheet: t => pairSVG(TYPES.corr.marks(t), 'same', [[0, 'AC', String(t.ac)], [0, 'BC', String(t.bc)], [0, 'AB', String(t.ab)], [1, t.ask, '?']]) +
      `<p class="tq">${GIVEN}. ${hname(prime(t.ask))} = ?</p>`,
    answer: t => `${hname(prime(t.ask))} = ${t[t.ask.toLowerCase()]}`,
    ans: t => Q(t[t.ask.toLowerCase()]),
    ok: t => `${TRI1} = ${TRI2} ${SIGN[t.kind].opt.toLowerCase()}. В равных треугольниках соответственные стороны равны: ${hname(prime(t.ask))} = ${t.ask} = ${t[t.ask.toLowerCase()]} (${SIDE_WORD[t.ask]}).`,
    wrong(t, x) {
      const ok = TYPES.corr.ok(t);
      if ([t.ac, t.bc, t.ab].some(n => qeq(x, Q(n)))) return bad('pair', `Это другая сторона: сторона ${hname(prime(t.ask))} соответствует стороне ${t.ask} — у них одинаковые буквы. ${ok}`);
      return bad('pair', ok);
    },
    traps: t => numTraps(t, t[t.ask.toLowerCase()], [t.ac, t.bc, t.ab]),
    hints: t => [`Сначала назови признак, по которому равны треугольники: отмечено ${scen(t.kind, 'A').elems.join('; ')}.`,
      `${hname(prime(t.ask))} соответствует стороне с теми же буквами без индекса — ${t.ask}.`],
  },
  // периметр второго треугольника: третья сторона — из равенства треугольников
  perim: {
    input: 'num', title: 'Периметр равного треугольника',
    gen: rnd => { const [ac, bc, ab] = pick(rnd, TRIPLES); return { ac, bc, ab }; },
    bad: t => t.ac + t.bc + t.ab > 70,
    text: () => `<span class="nw">P(${TRI2})</span>`,
    svg: t => pairSVG({ ticks: [['AB', 1], ['AC', 2]] }, 'same', [[0, 'AC', String(t.ac)], [0, 'BC', String(t.bc)], [0, 'AB', String(t.ab)]]),
    ask: t => TYPES.perim.svg(t) + `<p class="tq">${GIVEN}, AB = ${hname('A1B1')}, AC = ${hname('A1C1')}. Найдите периметр ${TRI2}.</p>`,
    sheet: t => TYPES.perim.svg(t) + `<p class="tq">${GIVEN}. P(${TRI2}) = ?</p>`,
    answer: t => `P = ${t.ac + t.bc + t.ab}`,
    ans: t => Q(t.ac + t.bc + t.ab),
    ok: t => `${TRI1} = ${TRI2} по гипотенузе и катету, поэтому и ${hname('B1C1')} = BC = ${t.bc}. P = ${t.ac} + ${t.bc} + ${t.ab} = ${t.ac + t.bc + t.ab}.`,
    wrong(t, x) {
      const ok = TYPES.perim.ok(t);
      if (qeq(x, Q(t.ac + t.ab))) return bad('per', `Ты сложил только отмеченные стороны. Третья сторона ${hname('B1C1')} тоже известна: треугольники равны, значит ${hname('B1C1')} = BC. ${ok}`);
      return bad('per', `Периметр — сумма трёх сторон ${TRI2}. ${ok}`);
    },
    traps: t => numTraps(t, t.ac + t.bc + t.ab, [t.ac + t.ab, t.bc + t.ab]),
    hints: () => ['Сначала докажи, что треугольники равны: что отмечено штрихами?', 'Из равенства треугольников равны и третьи стороны — найди все три стороны второго.'],
  },
  // высота делит треугольник на два прямоугольных: какой признак и что из него следует
  height: {
    input: 'num', title: 'Высота и два прямоугольных треугольника',
    gen: rnd => {
      const d = int(rnd, 3, 12);
      return { form: pick(rnd, ['mid', 'iso', 'ang']), d, m: d + int(rnd, 2, 9), h: d + int(rnd, 1, 8) };
    },
    bad: t => t.h === t.m,
    q: { mid: 'BC', iso: 'AD', ang: 'DC' },
    text: t => TYPES.height.q[t.form],
    ask: t => heightSVG(t) + `<p class="tq">BD — высота △ABC. Найдите ${TYPES.height.q[t.form]}.</p>`,
    sheet: t => heightSVG(t) + `<p class="tq">BD — высота. ${TYPES.height.q[t.form]} = ?</p>`,
    right: t => t.form === 'mid' ? t.m : t.d,
    answer: t => `${TYPES.height.q[t.form]} = ${TYPES.height.right(t)}`,
    ans: t => Q(TYPES.height.right(t)),
    ok: t => {
      if (t.form === 'mid') return `△ABD и △CBD прямоугольные (BD — высота): AD = DC, BD — общий катет. Они равны по двум катетам, поэтому BC = AB = ${t.m}.`;
      if (t.form === 'iso') return `△ABD и △CBD прямоугольные: гипотенузы AB = CB, катет BD — общий. Они равны по гипотенузе и катету, поэтому AD = DC = ${2 * t.d} : 2 = ${t.d}.`;
      return `△ABD и △CBD прямоугольные: катет BD — общий, прилежащие к нему острые углы ∠ABD = ∠CBD. Они равны по катету и острому углу, поэтому DC = AD = ${t.d}.`;
    },
    wrong(t, x) {
      const ok = TYPES.height.ok(t);
      if (t.form === 'iso' && qeq(x, Q(2 * t.d))) return bad('pair', `${2 * t.d} — это вся сторона AC, а D делит её на две равные части. ${ok}`);
      if (qeq(x, Q(t.h))) return bad('pair', `${t.h} — это высота BD, общий катет. Искомая сторона равна другой стороне. ${ok}`);
      return bad('pair', ok);
    },
    traps: t => numTraps(t, TYPES.height.right(t), t.form === 'iso' ? [2 * t.d, t.m] : t.form === 'mid' ? [t.d, 2 * t.d] : [2 * t.d, t.h]),
    hints: t => ['Высота BD делит △ABC на два прямоугольных треугольника с общим катетом BD.',
      t.form === 'mid' ? 'Отмечены равные отрезки AD и DC — это катеты.' : t.form === 'iso' ? 'Отмечены равные AB и CB — это гипотенузы.' : 'Отмечены равные углы при B — они прилежат к общему катету BD.'],
  },
};

// Типы ошибок для блока «Над чем поработать»: [название, совет]
const CATS = {
  which: ['Признак не тот', 'Катеты — стороны при прямом угле, гипотенуза — против него. Два катета; катет и угол при нём; гипотенуза и катет.'],
  hyp:   ['Гипотенуза и катет', 'Гипотенуза лежит против прямого угла, катеты образуют прямой угол.'],
  none:  ['Данных не хватает', 'Прямые углы равны всегда. Нужны ещё две пары элементов, и хотя бы одна — стороны.'],
  pair:  ['Не та сторона', 'Соответственные стороны — с одинаковыми буквами: AB ↔ A₁B₁, BC ↔ B₁C₁, AC ↔ A₁C₁.'],
  per:   ['Периметр', 'Периметр — сумма всех трёх сторон. Третью сторону даёт равенство треугольников.'],
};

// Разделы тренажёра: ссылка ?mode=home&level=N сразу открывает раздел N
const SECTIONS = [
  { title: 'Раздел 1', text: 'Какой признак', types: ['which', 'trap', 'hyp'], ex: () => 'катеты, катет и угол, гипотенуза и катет' },
  { title: 'Раздел 2', text: 'Задачи на готовых чертежах', types: ['corr', 'perim', 'height'], ex: () => 'BD — высота, AB = BC. AD = ?' },
];

// ================= Раздатка =================
// Состав варианта: шесть заданий, верные ответы складываются в слово из 6 разных букв
const KINDS_V1 = [['hyp'], ['which'], ['corr'], ['perim'], ['height'], ['trap']];
const WORDS_V1 = ['ПРЯМОЙ', 'КОМПАС', 'МОДУЛЬ', 'ГРАФИК'];
// Билет на выход и самостоятельная (форматы ядра)
const EXIT_V1 = [['which'], ['trap'], ['height']];
const TEST_V1 = {
  parts: [['hyp'], ['which'], ['trap'], ['corr'], ['perim'], ['height']],
  points: [1, 1, 1, 2, 2, 2],
  grades: { 5: 8, 4: 6, 3: 4 },
};
// Домино (в меню темы нет, генератор доступен ядру): 12 костяшек — только задачи с числом, у выбора всего 3–4 ответа
const DOMINO_V1 = [['corr'], ['perim'], ['height']];
const PRINT = {
  instr: 'Реши задание по чертежу и найди ответ в таблице букв. Впиши букву в клеточку под номером задания — получится слово. '
    + 'Нет ответа в таблице или слово не сложилось — ищи ошибку.',
  about: 'В каждом варианте шесть заданий на готовых чертежах: где гипотенуза, какой признак, соответственная сторона, '
    + 'периметр, высота и ловушка «данных не хватает». Верные ответы складываются в слово.',
  ogeAbout: '',
  testInstr: 'Ответ — число или название признака. Шкала оценок — внизу ключа.',
};

// ================= На доске =================
// Пример для показа: катет и гипотенуза опыта «гипотенуза и катет» (в клетках чертежа)
function boardExample(random, old) {
  if (!random) return { a: CONFIG.board.a, c: CONFIG.board.c };
  const rnd = mulberry32((Math.random() * 4294967296) >>> 0);
  let a, c, guard = 0;
  do { a = int(rnd, 5, 8); c = int(rnd, a + 2, Math.min(12, a + 5)); } while (++guard < 50 && a === old.a && c === old.c);
  return { a, c };
}
// Подписи на чертеже — SVG-текст: курсив через tspan, индекс — GEO.name
const BC0 = XY(150, 318), U = 32, HMAX = 288;           // вершина прямого угла C, клетка чертежа, высота над CA
// Живая модель: катет a = CA (вдоль низа), b = CB, угол α при A, гипотенуза c, угол γ при C (контрпример)
const LIVE = {
  model: e => ({ a: e.a, b: 6, alpha: 45, c: e.c, gamma: 90 }),
  fix(m) {
    m.a = Math.round(GEO.clamp(m.a, 4, 9));
    m.b = Math.round(GEO.clamp(m.b, 3, 11));
    m.alpha = GEO.snap(GEO.clamp(m.alpha, 20, 60), 5);
    while (m.alpha > 20 && m.a * U * Math.tan(GEO.rad(m.alpha)) > HMAX) m.alpha -= 5;   // вершина B остаётся на чертеже
    // гипотенуза не выводит B за верх чертежа: катет CB не выше HMAX
    m.c = Math.floor(GEO.clamp(m.c, 3, Math.sqrt(m.a * m.a + (HMAX / U) ** 2)) * 2) / 2;
    m.gamma = GEO.snap(GEO.clamp(m.gamma, 30, 90), 5);
  },
  ok: m => [m.a, m.b, m.alpha, m.c, m.gamma].every(Number.isFinite),
};
const Apt = m => XY(BC0.x + m.a * U, BC0.y);
// точки луча из C под углом γ к CA, лежащие на окружности (A, c): 0, 1 или 2 точки — по возрастанию расстояния от C
function onRay(m) {
  const A = Apt(m), d = GEO.polar(BC0, m.gamma, 100);
  return GEO.lineCircle(BC0, d, A, m.c * U)
    .filter(p => GEO.dist(BC0, p) > 1 && (p.x - BC0.x) * (d.x - BC0.x) + (p.y - BC0.y) * (d.y - BC0.y) > 0);
}
const blines = (lines, y0 = 80, x0 = 560) => lines.map((l, i) =>
  `<g class="${l.cls || ''}">${tx(x0, y0 + i * 52, l.t, 'lab s' + (l.lc ? ' ' + l.lc : ''), 'start')}</g>`).join('');
const num = (p, q, s, from) => GEO.side(p, q, s, from, 34, 'g-num');
// прямоугольный треугольник с вершинами и отметкой прямого угла
function rtri(A, B, C, names = ['A', 'B', 'C'], cls = 'g-fig') {
  const g = GEO.centroid([A, B, C]);
  return GEO.poly([A, B, C], cls) + GEO.right(C, A, B, 24) + GEO.vertex(A, names[0], g) + GEO.vertex(B, names[1], g) + GEO.vertex(C, names[2], g);
}
// пара равных прямоугольных треугольников на доске: ticks [[сторона, n]], arcs [[вершина, n]]; second — 'same' | 'small'
function boardPair(marks = {}, second = 'same', opt = {}) {
  const T1 = { C: XY(110, 340), A: XY(110, 90), B: XY(400, 340) };
  const T2 = second === 'small' ? { C: XY(870, 340), A: XY(870, 190), B: XY(696, 340) } : { C: XY(870, 340), A: XY(870, 90), B: XY(580, 340) };
  let s = '';
  [T1, T2].forEach((T, i) => {
    const n = i ? '1' : '';
    s += rtri(T.A, T.B, T.C, ['A' + n, 'B' + n, 'C' + n]);
    if (opt.sector) s += GEO.sector(T.C, T.A, T.B, 50, 'g-sec');
    for (const [sd, c] of marks.ticks || []) s += GEO.ticks(T[END[sd][0]], T[END[sd][1]], c);
    for (const [v, c] of marks.arcs || []) s += GEO.arcs(T[v], T[RAYS[v][0]], T[RAYS[v][1]], c, 36);
  });
  return s;
}
function buildSteps(e) {
  const nm = s => hname(s);
  // ---- опыт 1: катет и прилежащий острый угол: луч из A пересекает перпендикуляр к CA в одной точке
  const legAngle = (ph, m) => {
    const A = Apt(m), top = XY(BC0.x, 20), B = XY(BC0.x, BC0.y - m.a * U * Math.tan(GEO.rad(m.alpha)));
    let s = GEO.seg(BC0, top, 'g-dash') + GEO.ray(A, B, 'g-hl') + GEO.right(BC0, A, top, 24) + GEO.arcs(A, BC0, B, 1, 44);
    s += GEO.poly([A, B, BC0], 'g-fig') + GEO.vertex(A, 'A', XY(A.x - 60, A.y - 60)) + GEO.vertex(BC0, 'C', XY(BC0.x + 60, BC0.y - 60)) +
      GEO.text(XY(B.x - 40, B.y), 'B', 'g-vl') + num(BC0, A, `катет ${m.a}`, B) + GEO.angleText(A, BC0, B, `${m.alpha}°`, 90);
    return s + blines(ph ? [{ t: 'луч из A и перпендикуляр', cls: 'new' }, { t: 'пересекаются в одной точке B', cls: 'new' },
      { t: 'треугольник — один', cls: 'new', lc: 'acc' }] : [{ t: 'где окажется B?', lc: 'soft' }]);
  };
  // ---- опыт 2: гипотенуза и катет: окружность (A, c) и перпендикуляр к CA
  const hypB = m => m.c > m.a ? XY(BC0.x, BC0.y - Math.sqrt(m.c * m.c - m.a * m.a) * U) : null;
  const hypLeg = (ph, m) => {
    const A = Apt(m), top = XY(BC0.x, 20), B = hypB(m);
    let s = GEO.seg(BC0, top, 'g-dash') + GEO.circle(A, m.c * U, 'g-dash') + GEO.right(BC0, A, top, 24);
    if (B && ph) s += GEO.poly([A, B, BC0], 'g-fig') + GEO.seg(A, B, 'g-hl') + GEO.dot(B, 'g-pt', 9) + GEO.text(XY(B.x - 40, B.y), 'B', 'g-vl');
    s += GEO.dot(A) + GEO.vertex(A, 'A', XY(A.x - 60, A.y - 60)) + GEO.vertex(BC0, 'C', XY(BC0.x + 60, BC0.y - 60)) + num(BC0, A, `катет ${m.a}`, XY(BC0.x, 0));
    const lines = B
      ? [{ t: `гипотенуза AB = ${String(m.c).replace('.', ',')}` }, { t: 'окружность и перпендикуляр:', cls: ph ? 'new' : '' },
         { t: ph ? 'одна точка B — один треугольник' : 'сколько точек?', cls: ph ? 'new' : '', lc: ph ? 'acc' : 'soft' }]
      : [{ t: `AB = ${String(m.c).replace('.', ',')} — не длиннее катета`, lc: 'warm' }, { t: 'окружность не достаёт', lc: 'warm' }, { t: 'до перпендикуляра: треугольника нет', lc: 'warm' }];
    return s + blines(lines, 236);   // ниже ручки циркуля
  };
  const compass = m => {
    const A = Apt(m);
    return { id: 'c', at: GEO.polar(A, 45, m.c * U), label: 'Раствор циркуля: длина гипотенузы',
      move(m, p) { m.c = GEO.dist(Apt(m), p) / U; }, key(m, dx, dy) { m.c += (dx - dy) * 0.5; } };
  };
  // ---- опыт 3: угол C не прямой — луч из C может пересечь окружность (A, c) в двух точках
  const counter = (ph, m) => {
    const A = Apt(m), end = GEO.clip(BC0, GEO.polar(BC0, m.gamma, 100), 20, GEO.BOX, true)[1], Bs = onRay(m);
    let s = GEO.seg(BC0, end, 'g-dash') + GEO.circle(A, m.c * U, 'g-dash') + GEO.seg(BC0, A) + GEO.arcs(BC0, A, end, 1, 40);
    Bs.forEach((B, i) => { s += GEO.poly([A, B, BC0], i ? 'g-fig b' : 'g-fig') + GEO.dot(B, 'g-pt', 9) + GEO.text(GEO.add(B, XY(-30, -30)), GEO.name(Bs.length > 1 ? 'B' + (i + 1) : 'B'), 'g-vl'); });
    s += GEO.dot(A) + GEO.vertex(A, 'A', XY(A.x - 60, A.y - 60)) + GEO.vertex(BC0, 'C', XY(BC0.x + 60, BC0.y - 60)) + num(BC0, A, String(m.a), XY(BC0.x, 0)) +
      GEO.angleText(BC0, A, end, `${m.gamma}°`, 70);
    const n = Bs.length;
    return s + blines([{ t: `CA = ${m.a}, AB = ${String(m.c).replace('.', ',')}, ∠C = ${m.gamma}°` },
      { t: n === 2 ? 'две точки — два разных' : n === 1 ? 'одна точка — один' : 'точек нет —', lc: n === 2 ? 'warm' : n === 1 ? 'acc' : 'soft' },
      { t: n === 2 ? 'треугольника!' : n === 1 ? 'треугольник' : 'треугольника нет', lc: n === 2 ? 'warm' : n === 1 ? 'acc' : 'soft' }]);
  };
  const rngA = { id: 'a', type: 'range', label: 'Катет CA', min: 4, max: 9, get: m => m.a, set(m, v) { m.a = v; } };
  const rngC = { id: 'c', type: 'range', label: 'Гипотенуза AB', min: 3, max: 12, step: 0.5, get: m => m.c, set(m, v) { m.c = v; }, text: m => String(m.c).replace('.', ',') };
  // ---- задача: высота в треугольнике с равными боковыми сторонами
  const iso = ph => {
    const B = XY(260, 80), A = XY(70, 350), C = XY(450, 350), D = XY(260, 350);
    let s = GEO.poly([A, B, C], 'g-fig') + GEO.seg(B, D) + GEO.right(D, B, C, 22) + GEO.ticks(A, B, 1) + GEO.ticks(B, C, 1);
    s += GEO.vertex(A, 'A', XY(260, 250)) + GEO.vertex(B, 'B', XY(260, 250)) + GEO.vertex(C, 'C', XY(260, 250)) + GEO.text(XY(260, 385), 'D', 'g-vl');
    if (ph) s += `<g class="new">${GEO.ticks(A, D, 2)}${GEO.ticks(D, C, 2)}</g>`;
    return s + blines(ph ? [{ t: `△ABD и △CBD: ∠D = 90°`, cls: 'new' }, { t: 'AB = CB — гипотенузы', cls: 'new' }, { t: 'BD — общий катет', cls: 'new' },
      { t: 'равны по гипотенузе и катету', cls: 'new', lc: 'acc' }, { t: '⇒ AD = DC', cls: 'new', lc: 'acc' }] : [{ t: 'AD = DC?', lc: 'soft' }], 70, 520);
  };
  return [
    { q: 'Какой треугольник называют прямоугольным? Как называются его стороны?',
      a: 'Один из углов прямой. Стороны прямого угла — катеты, сторона против прямого угла — гипотенуза.',
      note: 'Начало урока: пусть класс сам покажет на чертеже катеты и гипотенузу. Спросите, сколько прямых углов может быть в треугольнике.',
      draw: ph => {
        const C = XY(170, 350), A = XY(170, 70), B = XY(600, 350);
        let s = rtri(A, B, C);
        // длинные слова — с выравниванием от стороны наружу: у наклонной гипотенузы отступа по нормали мало
        if (ph) s += `<g class="new">${GEO.text(XY(150, 210), 'катет', 'g-num', 'end')}${GEO.text(XY(385, 378), 'катет', 'g-num')}` +
          `${GEO.text(XY(420, 180), 'гипотенуза', 'g-num', 'start')}</g>`;
        return s;
      },
      rec: ph => ph ? ['катеты — стороны прямого угла, гипотенуза — против него'] : [] },
    { q: `Прямоугольные ${TRI1} и ${TRI2}: AC = ${nm('A1C1')}, BC = ${nm('B1C1')}. Равны ли треугольники?`,
      a: `Да. Катеты — две стороны, прямой угол — угол между ними, а прямые углы равны. Первый признак — значит, равны по двум катетам.`,
      note: 'Пусть класс сам назовёт обычный признак, на который опирается рассуждение. Закрашенный угол — тот самый «угол между сторонами».',
      draw: ph => boardPair({ ticks: [['AC', 1], ['BC', 2]] }, 'same', { sector: ph }),
      rec: ph => ph ? ['1) по двум катетам'] : [] },
    { q: `А если равны катет и прилежащий к нему острый угол: AC = ${nm('A1C1')}, ∠A = ${nm('∠A1')}?`,
      a: `Тоже равны. У катета AC два прилежащих угла: острый ∠A и прямой ∠C. Сторона и два прилежащих угла — второй признак.`,
      note: 'Подчеркните: угол должен прилежать к данному катету. Противолежащий угол в этой теме не берём.',
      draw: ph => boardPair({ ticks: [['AC', 1]], arcs: [['A', 1]] }, 'same', { sector: ph }),
      rec: ph => ph ? ['2) по катету и прилежащему острому углу'] : [] },
    { q: m => `Катет CA = ${m.a} и угол A = ${m.alpha}° заданы. Где окажется вершина B? Можно ли получить другой треугольник?`,
      a: 'B — на перпендикуляре к CA в точке C и на луче из A. Прямая и луч пересекаются в одной точке — другого треугольника нет.',
      note: 'Сначала спросите, где может быть B. Потом двигайте ручку B или ползунки: меняются данные — меняется треугольник; данные те же — треугольник тот же.',
      live: {
        enter(m) { m.a = e.a; m.alpha = 45; },
        handles: m => [{ id: 'b', at: XY(BC0.x, BC0.y - m.a * U * Math.tan(GEO.rad(m.alpha))), label: 'Вершина B: меняет угол A',
          move(m, p) { m.alpha = GEO.deg(Math.atan2(BC0.y - p.y, m.a * U)); }, key(m, dx, dy) { m.alpha -= dy * 5; } }],
        controls: () => [rngA, { id: 'alpha', type: 'range', label: 'Угол A', min: 20, max: 60, step: 5, get: m => m.alpha, set(m, v) { m.alpha = v; }, text: m => m.alpha + '°' }],
      },
      draw: legAngle,
      rec: ph => ph ? ['катет и угол при нём задают треугольник однозначно'] : [] },
    { q: `Равны гипотенузы и катеты: AB = ${nm('A1B1')}, AC = ${nm('A1C1')}. Но это «две стороны и угол не между ними» — такого признака нет. Значит, не равны?`,
      a: 'Для прямоугольных треугольников равны! Прямой угол меняет дело. Это третий признак — по гипотенузе и катету. Проверим построением.',
      note: 'Шаг-предсказание: пусть класс проголосует «равны / не равны / не знаем», ответ не говорите до опыта.',
      draw: () => boardPair({ ticks: [['AB', 1], ['AC', 2]] }),
      rec: ph => ph ? ['3) по гипотенузе и катету'] : [] },
    { q: m => `Катет CA = ${m.a}. Циркулем откладываем гипотенузу из A. Где окажется вершина B?`,
      a: m => hypB(m) ? 'Окружность пересекает перпендикуляр к CA в одной точке — B определена однозначно: треугольник один.'
        : 'При такой гипотенузе окружность не достаёт до перпендикуляра — прямоугольного треугольника нет: гипотенуза должна быть длиннее катета.',
      note: 'Тяните ручку на окружности (раствор циркуля) или ползунки. Сделайте гипотенузу короче катета — треугольника не будет. Ниже CA есть вторая точка — она даёт тот же треугольник, отражённый.',
      live: {
        enter(m) { m.a = e.a; m.c = e.c; },
        handles: m => [compass(m)],
        controls: () => [rngA, rngC],
      },
      draw: hypLeg,
      rec: (ph, m) => ph && hypB(m) ? ['гипотенуза и катет задают треугольник однозначно'] : [] },
    { q: 'А если угол C не прямой? Те же «две стороны и угол не между ними» — сколько будет треугольников?',
      a: 'При остром угле C луч может пересечь окружность в двух точках: два разных треугольника с одинаковыми данными. Поэтому для обычных треугольников такого признака нет, а прямой угол его спасает.',
      note: 'Контрпример. Начните с ∠C = 40°, AB = 6: две точки. Тяните луч из C или ползунки. Ведите угол к 90° — вторая точка исчезает. Наблюдение, не доказательство: признак доказывается по учебнику.',
      live: {
        enter(m) { m.a = 8; m.c = 6; m.gamma = 40; },
        // ручка — на конце луча, дальше точек B: не путается с ними
        handles: m => [{ id: 'g', at: GEO.polar(BC0, m.gamma, Math.min(380, (BC0.y - 20) / Math.sin(GEO.rad(m.gamma)))), label: 'Луч из C: угол C',
          move(m, p) { m.gamma = GEO.dirDeg(BC0, p); }, key(m, dx, dy) { m.gamma += (dy < 0 || dx < 0 ? 5 : -5); } }],
        controls: () => [{ id: 'gamma', type: 'range', label: 'Угол C', min: 30, max: 90, step: 5, get: m => m.gamma, set(m, v) { m.gamma = v; }, text: m => m.gamma + '°' }, rngC],
      },
      draw: counter,
      rec: ph => ph ? ['не прямой угол: «две стороны и угол не между ними» не хватает'] : [] },
    { q: `Ловушка: прямоугольные треугольники, ∠A = ${nm('∠A1')}. Равны?`,
      a: 'Нет. Равны только углы, ни одной пары сторон: форма та же, а размер разный. Нужна хотя бы одна пара равных сторон.',
      note: 'Самая частая ошибка — «углы равны, значит, треугольники равны». Покажите на чертеже: второй треугольник меньше.',
      draw: () => boardPair({ arcs: [['A', 1]] }, 'small'),
      rec: ph => ph ? ['только углы — равенство не доказано'] : [] },
    { q: 'Задача. В △ABC проведена высота BD, AB = CB. Докажите, что AD = DC.',
      a: '△ABD и △CBD прямоугольные, гипотенузы AB = CB, катет BD — общий. Они равны по гипотенузе и катету, поэтому AD = DC.',
      note: 'Пусть класс сначала найдёт два прямоугольных треугольника и общий элемент. Запись в тетради — по строкам справа.',
      draw: iso,
      rec: ph => ph ? ['△ABD = △CBD по гипотенузе и катету ⇒ AD = DC'] : [] },
    { q: 'Итог: по каким признакам равны прямоугольные треугольники?',
      a: 'По двум катетам; по катету и прилежащему острому углу; по гипотенузе и катету.',
      note: 'Пусть класс назовёт для каждого признака, на какой общий признак он опирается (первые два) и чем особенный третий.',
      draw: () => '',
      rec: () => ['1. По двум катетам.', '2. По катету и прилежащему острому углу.', '3. По гипотенузе и катету.'] },
  ];
}
// превью на сайте крутит шаги до previewUntil (счёт с 0); картинка-превью — шаг poster с показанным ответом
const BOARD = { previewUntil: 3, poster: 5 };

// Формулы в справке (help.html): ядро вызывает helpInit() при запуске
function helpInit() {}
