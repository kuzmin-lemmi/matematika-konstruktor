// Тема «Вписанные и центральные углы»: живой чертёж — точки A, B, C двигаются по окружности,
// вписанный угол измеряется на чертеже и сравнивается с центральным и с дугой.
// Задачи — на готовых чертежах (как в ОГЭ): углы в градусах, ответ — целое число.

// ================= Параметры =================
const CONFIG = {
  board: {
    a: 220, b: 320, c: 125,  // первый пример: дуга AB = 100°, вписанный угол 50°
    previewDelay: 2200,
  },
  print: { variants: 25, traps: 1, space: false },
  home: { round: 10, points: [10, 15, 20], hintPenalty: 3, maxMultiplier: 3 },
};
const GEN_VERSION = 1;

// ================= Задачи на готовых чертежах =================
const bad = (cat, msg) => ({ cat, msg });
const vaR = (d, k = 28, lo = 46, hi = 85) => GEO.clamp(k / Math.sin(GEO.rad(Math.max(d, 8) / 2)), lo, hi);   // радиус подписи угла
// Чертёж задачи: точки на окружности по направлениям (градусы, повёрнуты на rot), отрезки, отмеченные углы.
// spec: { rot, pts: { A: 200, … }, inner: { K: [направление, доля радиуса] }, segs: ['AB', …],
//   angles: [['C', 'A', 'B', '40°'], …], arc: ['A', 'B', 'подпись'] (дуга от A к B против часовой), tan: ['A', 'K', 'B'] }
function vaTaskSVG(spec, label) {
  const O = GEO.pt(200, 150), R = 105, rot = spec.rot || 0, P = { O };
  for (const [k, d] of Object.entries(spec.pts)) P[k] = GEO.polar(O, d + rot, R);
  for (const [k, [d, f]] of Object.entries(spec.inner || {})) P[k] = GEO.polar(O, d + rot, R * f);
  let back = GEO.circle(O, R, 'va-c'), lines = '', marks = '', labs = '';
  if (spec.arc) {
    const [p, q, s] = spec.arc, a0 = GEO.dirDeg(O, P[p]), a1 = a0 + (GEO.dirDeg(O, P[q]) - a0 + 360) % 360;
    back += GEO.arc(O, a0, a1, R, 'va-arc-t');
    labs += GEO.text(GEO.polar(O, (a0 + a1) / 2, R + 30), s, 'va-n');
  }
  if (spec.tan) {   // касательная в точке tan[0], точка tan[1] на ней — со стороны точки tan[2]
    const [a, k, b] = spec.tan, A = P[a];
    let t = GEO.perp(GEO.unit(O, A));
    if ((P[b].x - A.x) * t.x + (P[b].y - A.y) * t.y < 0) t = GEO.scale(t, -1);
    P[k] = GEO.add(A, GEO.scale(t, 110));
    lines += GEO.seg(GEO.sub(A, GEO.scale(t, 120)), GEO.add(A, GEO.scale(t, 120)), 'va-l');
  }
  for (const s of spec.segs) lines += GEO.seg(P[s[0]], P[s[1]], 'va-l');
  const near = [];   // подписи углов рядом с центром — подпись O их обходит
  for (const [v, a, b, s, n = 1] of spec.angles || []) {
    const d = GEO.angleAt(P[v], P[a], P[b]), [s0, s1] = GEO.span(P[v], P[a], P[b]);
    const at = GEO.polar(P[v], (s0 + s1) / 2, v === 'O' ? 48 : vaR(d, 30, 44, 60));
    marks += Math.abs(d - 90) < 1e-6 ? GEO.right(P[v], P[a], P[b], 14, 'va-m') : GEO.arcs(P[v], P[a], P[b], n, 18, 'va-m');
    if (s) labs += GEO.text(at, s, s === '?' ? 'va-n q' : 'va-n');
    if (s && GEO.dist(O, at) < 90) near.push(GEO.dirDeg(O, at));
  }
  let dots = '';
  for (const k of Object.keys(P)) {
    if (k === 'O' && !spec.center) continue;
    dots += GEO.dot(P[k], 'va-p', 4);
    if (k === 'O') {   // подпись центра — в сторону, свободную от отрезков
      const busy = Object.keys(P).filter(x => x !== 'O').flatMap(x => [GEO.dirDeg(O, P[x]), GEO.dirDeg(O, P[x]) + 180]).concat(near, near);
      let best = 0, far = -1;
      for (let d = 0; d < 360; d += 15) { const f = Math.min(...busy.map(b => Math.min((d - b + 720) % 360, (b - d + 720) % 360))); if (f > far) { far = f; best = d; } }
      labs += GEO.text(GEO.polar(O, best, 26), 'O', 'va-v');
    } else labs += GEO.vertex(P[k], k, spec.inner?.[k] ? GEO.mid(P.A, P.B) : O, 26, 'va-v');
  }
  return `<svg class="va-task" viewBox="-5 -15 410 330" role="img" aria-label="${label}">${back}${lines}${marks}${dots}${labs}</svg>`;
}
const vaTraps = (ns, answer) => [...new Set(ns)].filter(n => n !== answer && n > 0 && n < 360).map(n => ({ key: String(n), html: String(n) }));
const vaQ = s => `<p class="va-q">${s}</p>`;
// ошибка в числовой задаче: известные неверные ответы → категория и объяснение
function vaWrong(T, t, x, cases) {
  for (const [v, cat, msg] of cases) if (qeq(x, Q(v))) return bad(cat, `${msg} ${T.ok(t)}`);
  return bad('calc', T.ok(t));
}
const vaRot = rnd => int(rnd, 0, 23) * 15;

const TYPES = {
  kind: {
    input: 'choice', title: 'Вид угла', options: [['cen', 'Центральный'], ['ins', 'Вписанный'], ['no', 'Ни тот, ни другой']],
    gen: rnd => ({ form: pick(rnd, ['cen', 'ins', 'no']), x: int(rnd, 3, 7) * 10, rot: vaRot(rnd), j: int(rnd, -25, 25) }),
    fig(t) {
      const V = { cen: 'O', ins: 'C', no: 'K' }[t.form], pts = { A: 270 - t.x, B: 270 + t.x };
      const spec = { rot: t.rot, pts, segs: [V + 'A', V + 'B'], angles: [[V, 'A', 'B', '']], center: true };
      if (t.form === 'ins') pts.C = 90 + t.j;
      if (t.form === 'no') spec.inner = { K: [90 + t.j, .5] };
      return vaTaskSVG(spec, 'Угол с вершиной ' + V);
    },
    vertex: t => ({ cen: 'O', ins: 'C', no: 'K' })[t.form],
    text: t => `∠A${TYPES.kind.vertex(t)}B`,
    ask: t => TYPES.kind.fig(t) + vaQ(`O — центр окружности. Каким является угол A${TYPES.kind.vertex(t)}B?`),
    sheet: t => TYPES.kind.fig(t) + `<p>O — центр. Каким является ∠A${TYPES.kind.vertex(t)}B?</p>`,
    ans: t => t.form,
    key: t => ({ cen: 'центральный', ins: 'вписанный', no: 'ни тот, ни другой' })[t.form],
    keyHTML: t => TYPES.kind.key(t),
    ok: t => ({
      cen: 'Вершина угла — в центре окружности O, поэтому угол AOB центральный.',
      ins: 'Вершина C лежит на окружности, а стороны пересекают окружность в точках A и B — угол ACB вписанный.',
      no: 'Вершина K лежит внутри круга, но не в центре и не на окружности: угол AKB ни центральный, ни вписанный.',
    })[t.form],
    wrong: t => bad('kind', `${TYPES.kind.ok(t)} Центральный угол — вершина в центре; вписанный — вершина на окружности, стороны пересекают окружность. Здесь дуга AB = ${2 * t.x}°: центральный угол на неё равен ${2 * t.x}°, вписанный — ${t.x}°.`),
    traps: t => ['центральный', 'вписанный', 'ни тот, ни другой'].filter(s => s !== TYPES.kind.key(t)).map(key => ({ key, html: key })),
    hints: () => ['Посмотри, где вершина угла: в центре, на окружности или в другом месте.', 'Центральный — вершина в точке O. Вписанный — вершина на самой окружности.'],
  },
  ins: {
    input: 'num', title: 'Вписанный по центральному', oral: true,
    gen: rnd => ({ x: int(rnd, 15, 80), rot: vaRot(rnd), j: pick(rnd, [-1, 1]) * int(rnd, 12, 32) }),
    fig: t => vaTaskSVG({ rot: t.rot, pts: { A: 270 - t.x, B: 270 + t.x, C: 90 + t.j }, segs: ['OA', 'OB', 'CA', 'CB'], center: true,
      angles: [['O', 'A', 'B', 2 * t.x + '°'], ['C', 'A', 'B', '?']] }, 'Окружность с центром O, углы AOB и ACB'),
    text: () => '∠ACB',
    ask: t => TYPES.ins.fig(t) + vaQ(`O — центр окружности, ∠AOB = ${2 * t.x}°. Найди ∠ACB.`),
    sheet: t => TYPES.ins.fig(t) + `<p>O — центр, ∠AOB = ${2 * t.x}°. ∠ACB = ?</p>`,
    ans: t => Q(t.x),
    ok: t => `∠ACB — вписанный, ∠AOB — центральный, оба опираются на дугу AB. Вписанный угол равен половине центрального: ${2 * t.x}° : 2 = ${t.x}°.`,
    wrong(t, x) {
      return vaWrong(TYPES.ins, t, x, [[2 * t.x, 'equal', 'Ты приравнял вписанный угол к центральному.'], [4 * t.x, 'double', 'Ты удвоил угол, а вписанный — половина центрального.'],
        [180 - t.x, 'arc', 'Это вписанный угол на другую дугу AB, а вершина C лежит на большей дуге.']]);
    },
    traps: t => vaTraps([2 * t.x, 180 - t.x, 4 * t.x], t.x),
    hints: t => ['Какой из углов центральный, а какой вписанный? Опираются ли они на одну дугу?', `Вписанный угол равен половине центрального: ${2 * t.x}° : 2.`],
  },
  cen: {
    input: 'num', title: 'Центральный по вписанному', oral: true,
    gen: rnd => ({ x: int(rnd, 15, 85), rot: vaRot(rnd), j: pick(rnd, [-1, 1]) * int(rnd, 12, 32) }),
    fig: t => vaTaskSVG({ rot: t.rot, pts: { A: 270 - t.x, B: 270 + t.x, C: 90 + t.j }, segs: ['OA', 'OB', 'CA', 'CB'], center: true,
      angles: [['O', 'A', 'B', '?'], ['C', 'A', 'B', t.x + '°']] }, 'Окружность с центром O, углы ACB и AOB'),
    text: () => '∠AOB',
    ask: t => TYPES.cen.fig(t) + vaQ(`O — центр окружности, ∠ACB = ${t.x}°. Найди ∠AOB.`),
    sheet: t => TYPES.cen.fig(t) + `<p>O — центр, ∠ACB = ${t.x}°. ∠AOB = ?</p>`,
    ans: t => Q(2 * t.x),
    ok: t => `∠AOB — центральный, ∠ACB — вписанный, оба опираются на дугу AB. Центральный угол вдвое больше: 2 · ${t.x}° = ${2 * t.x}°.`,
    wrong(t, x) {
      return vaWrong(TYPES.cen, t, x, [[t.x, 'equal', 'Ты приравнял центральный угол к вписанному.'], [t.x / 2, 'double', 'Ты разделил на 2, а центральный угол вдвое больше вписанного.'],
        [360 - 2 * t.x, 'arc', 'Это бо́льшая дуга AB, а угол AOB опирается на меньшую.']]);
    },
    traps: t => vaTraps([t.x, t.x / 2, 180 - t.x].filter(Number.isInteger), 2 * t.x),
    hints: () => ['Оба угла опираются на дугу AB. Какой из них больше?', 'Центральный угол в 2 раза больше вписанного.'],
  },
  arc: {
    input: 'num', title: 'Угол и дуга', oral: true,
    // дуга AB (против часовой от A к B), на которую опирается ∠ACB; C — на другой дуге. Дуга может быть больше 180°
    gen: (rnd, form) => ({ form: form || pick(rnd, ['toIns', 'toArc']), arc: int(rnd, 4, 26) * 10, rot: vaRot(rnd), j: int(rnd, -15, 15) }),
    bad: t => t.arc === 180,
    fig(t) {
      const a = 270 - t.arc / 2, b = 270 + t.arc / 2;
      return vaTaskSVG({ rot: t.rot, pts: { A: a, B: b, C: b + (360 - t.arc) / 2 + t.j * (360 - t.arc) / 90 }, segs: ['CA', 'CB'],
        arc: ['A', 'B', t.form === 'toIns' ? t.arc + '°' : '?'], angles: [['C', 'A', 'B', t.form === 'toIns' ? '?' : t.arc / 2 + '°']] }, 'Вписанный угол ACB и дуга AB');
    },
    text: t => t.form === 'toIns' ? '∠ACB' : 'дуга AB',
    ask: t => TYPES.arc.fig(t) + vaQ(t.form === 'toIns' ? `Градусная мера дуги AB, отмеченной на чертеже, равна ${t.arc}°. Найди ∠ACB.` : `∠ACB = ${t.arc / 2}°. Найди градусную меру отмеченной дуги AB.`),
    sheet: t => TYPES.arc.fig(t) + (t.form === 'toIns' ? `<p>Дуга AB = ${t.arc}°. ∠ACB = ?</p>` : `<p>∠ACB = ${t.arc / 2}°. Отмеченная дуга AB = ?</p>`),
    ans: t => Q(t.form === 'toIns' ? t.arc / 2 : t.arc),
    ok: t => `Вписанный угол равен половине дуги, на которую он опирается: ` + (t.form === 'toIns' ? `${t.arc}° : 2 = ${t.arc / 2}°.` : `дуга AB = 2 · ${t.arc / 2}° = ${t.arc}°.`),
    wrong(t, x) {
      const o = 360 - t.arc;
      return vaWrong(TYPES.arc, t, x, t.form === 'toIns'
        ? [[t.arc, 'equal', 'Ты приравнял вписанный угол к дуге. Дуге равен центральный угол, а вписанный — её половина.'], [o / 2, 'arc', `Ты взял другую дугу (${o}°). Угол ACB опирается на дугу, которая лежит внутри него.`]]
        : [[t.arc / 2, 'equal', 'Ты приравнял дугу к вписанному углу.'], [t.arc / 4, 'double', 'Ты разделил на 2, а дуга вдвое больше вписанного угла.'], [o, 'arc', 'Это другая дуга AB — та, на которой лежит C.']]);
    },
    traps: t => t.form === 'toIns' ? vaTraps([t.arc, (360 - t.arc) / 2], t.arc / 2) : vaTraps([t.arc / 2, 360 - t.arc], t.arc),
    hints: t => ['Найди дугу, которая лежит внутри угла ACB, — на неё он опирается.', t.form === 'toIns' ? `Вписанный угол — половина дуги: ${t.arc}° : 2.` : `Дуга вдвое больше вписанного угла: 2 · ${t.arc / 2}°.`],
  },
  same: {
    input: 'num', title: 'Углы на одну дугу', oral: true,
    gen: rnd => ({ x: int(rnd, 20, 80), rot: vaRot(rnd), j: int(rnd, 25, 45) }),
    fig: t => vaTaskSVG({ rot: t.rot, pts: { A: 270 - t.x, B: 270 + t.x, C: 90 + t.j, D: 90 - t.j }, segs: ['CA', 'CB', 'DA', 'DB'],
      angles: [['C', 'A', 'B', t.x + '°'], ['D', 'A', 'B', '?', 2]] }, 'Вписанные углы ACB и ADB'),
    text: () => '∠ADB',
    ask: t => TYPES.same.fig(t) + vaQ(`Точки A, B, C, D лежат на окружности, ∠ACB = ${t.x}°. Найди ∠ADB.`),
    sheet: t => TYPES.same.fig(t) + `<p>∠ACB = ${t.x}°. ∠ADB = ?</p>`,
    ans: t => Q(t.x),
    ok: t => `∠ACB и ∠ADB — вписанные, C и D лежат по одну сторону от хорды AB, углы опираются на одну дугу AB. Такие углы равны: ∠ADB = ${t.x}°.`,
    wrong(t, x) {
      return vaWrong(TYPES.same, t, x, [[2 * t.x, 'double', 'Ты удвоил угол — так находят центральный угол, а здесь оба угла вписанные.'], [180 - t.x, 'arc', 'Сумма 180° — у вписанных углов по разные стороны от хорды AB, а C и D лежат по одну сторону.']]);
    },
    traps: t => vaTraps([2 * t.x, 180 - t.x], t.x),
    hints: () => ['Оба угла вписанные. На какие дуги они опираются?', 'Вписанные углы, опирающиеся на одну дугу, равны.'],
  },
  opp: {
    input: 'num', title: 'Вершины по разные стороны хорды', oral: true,
    gen: rnd => ({ x: int(rnd, 25, 80), rot: vaRot(rnd), j: int(rnd, -25, 25), k: int(rnd, -6, 6) }),
    fig: t => vaTaskSVG({ rot: t.rot, pts: { A: 270 - t.x, B: 270 + t.x, C: 90 + t.j, D: 270 + t.k * t.x / 20 }, segs: ['CA', 'CB', 'DA', 'DB'],
      angles: [['C', 'A', 'B', t.x + '°'], ['D', 'A', 'B', '?', 2]] }, 'Вписанные углы ACB и ADB по разные стороны от AB'),
    text: () => '∠ADB',
    ask: t => TYPES.opp.fig(t) + vaQ(`Точки A, B, C, D лежат на окружности, C и D — по разные стороны от хорды AB. ∠ACB = ${t.x}°. Найди ∠ADB.`),
    sheet: t => TYPES.opp.fig(t) + `<p>∠ACB = ${t.x}°. ∠ADB = ?</p>`,
    ans: t => Q(180 - t.x),
    ok: t => `∠ACB опирается на дугу AB, равную 2 · ${t.x}° = ${2 * t.x}°. ∠ADB опирается на другую дугу: 360° − ${2 * t.x}° = ${360 - 2 * t.x}°, поэтому ∠ADB = ${360 - 2 * t.x}° : 2 = ${180 - t.x}°. Короче: ∠ACB + ∠ADB = 180°.`,
    wrong(t, x) {
      return vaWrong(TYPES.opp, t, x, [[t.x, 'arc', 'Углы равны, только если вершины по одну сторону от хорды. Здесь C и D по разные стороны.'], [2 * t.x, 'double', 'Ты нашёл дугу, на которую опирается ∠ACB.']]);
    },
    traps: t => vaTraps([t.x, 2 * t.x], 180 - t.x),
    hints: () => ['C и D по разные стороны от AB: углы опираются на разные дуги, вместе дуги дают 360°.', 'Сумма таких вписанных углов равна 360° : 2 = 180°.'],
  },
  diam: {
    input: 'num', title: 'Угол, опирающийся на диаметр',
    gen: rnd => ({ x: int(rnd, 15, 75), rot: vaRot(rnd), j: int(rnd, 30, 150) }),
    bad: t => t.x === 45 || t.x === 30 || t.x === 60,
    // AB — диаметр, C на окружности так, что ∠ABC = x: дуга AC = 2x
    fig: t => vaTaskSVG({ rot: t.rot, pts: { A: 180, B: 0, C: 180 - 2 * t.x }, segs: ['AB', 'CA', 'CB'], center: true,
      angles: [['B', 'A', 'C', t.x + '°'], ['A', 'B', 'C', '?', 2]] }, 'AB — диаметр, треугольник ABC'),
    text: () => '∠BAC',
    ask: t => TYPES.diam.fig(t) + vaQ(`AB — диаметр окружности, C — точка окружности, ∠ABC = ${t.x}°. Найди ∠BAC.`),
    sheet: t => TYPES.diam.fig(t) + `<p>AB — диаметр, ∠ABC = ${t.x}°. ∠BAC = ?</p>`,
    ans: t => Q(90 - t.x),
    ok: t => `∠ACB опирается на диаметр AB, поэтому ∠ACB = 90°. В треугольнике ABC: ∠BAC = 180° − 90° − ${t.x}° = ${90 - t.x}°.`,
    wrong(t, x) {
      return vaWrong(TYPES.diam, t, x, [[180 - t.x, 'diam', 'Ты не учёл угол C. Он опирается на диаметр и равен 90°.'], [t.x, 'diam', 'Треугольник ABC не равнобедренный: углы A и B не обязаны быть равны.'],
        [90 + t.x, 'calc', 'Сумма углов треугольника 180°, а не 90° + ∠B.']]);
    },
    traps: t => vaTraps([180 - t.x, t.x, 2 * t.x], 90 - t.x),
    hints: () => ['Чему равен угол ACB, если он опирается на диаметр?', '∠ACB = 90°. Дальше — сумма углов треугольника ABC.'],
  },
  iso: {
    input: 'num', title: 'Угол при основании треугольника AOB',
    gen: rnd => ({ x: int(rnd, 20, 80), rot: vaRot(rnd), j: pick(rnd, [-1, 1]) * int(rnd, 12, 32) }),
    bad: t => t.x === 30 || t.x === 45 || t.x === 60,
    fig: t => vaTaskSVG({ rot: t.rot, pts: { A: 270 - t.x, B: 270 + t.x, C: 90 + t.j }, segs: ['CA', 'CB', 'OA', 'OB', 'AB'], center: true,
      angles: [['C', 'A', 'B', t.x + '°'], ['A', 'O', 'B', '?', 2]] }, 'Вписанный угол ACB и треугольник AOB'),
    text: () => '∠OAB',
    ask: t => TYPES.iso.fig(t) + vaQ(`O — центр окружности, ∠ACB = ${t.x}°. Найди ∠OAB.`),
    sheet: t => TYPES.iso.fig(t) + `<p>O — центр, ∠ACB = ${t.x}°. ∠OAB = ?</p>`,
    ans: t => Q(90 - t.x),
    ok: t => `Центральный ∠AOB = 2 · ${t.x}° = ${2 * t.x}°. OA = OB как радиусы, треугольник AOB равнобедренный: ∠OAB = (180° − ${2 * t.x}°) : 2 = ${90 - t.x}°.`,
    wrong(t, x) {
      return vaWrong(TYPES.iso, t, x, [[2 * t.x, 'iso', 'Ты нашёл ∠AOB, а нужен угол OAB при основании.'], [180 - 2 * t.x, 'iso', 'Ты нашёл сумму двух углов при основании; раздели её пополам.'],
        [t.x, 'equal', 'Угол OAB не равен вписанному углу.'], [90 - t.x / 2, 'equal', 'Ты взял ∠AOB = ∠ACB, а центральный угол вдвое больше вписанного.']].filter(([v]) => Number.isInteger(v)));
    },
    traps: t => vaTraps([2 * t.x, 180 - 2 * t.x, t.x], 90 - t.x),
    hints: t => ['Сначала найди центральный угол AOB.', `∠AOB = ${2 * t.x}°. Треугольник AOB равнобедренный: OA = OB.`],
  },
  diam2: {
    input: 'num', title: 'Два диаметра',
    gen: rnd => ({ x: int(rnd, 10, 80), rot: vaRot(rnd) }),
    bad: t => t.x === 45 || t.x === 60,
    // AC и BD — диаметры; ∠ACB вписанный, опирается на дугу AB = 2x
    fig: t => vaTaskSVG({ rot: t.rot, pts: { A: 270 - t.x, B: 270 + t.x, C: 90 - t.x, D: 90 + t.x }, segs: ['AC', 'BD', 'CB'], center: true,
      angles: [['C', 'A', 'B', t.x + '°'], ['O', 'A', 'D', '?', 2]] }, 'Диаметры AC и BD'),
    text: () => '∠AOD',
    ask: t => TYPES.diam2.fig(t) + vaQ(`AC и BD — диаметры окружности с центром O, ∠ACB = ${t.x}°. Найди ∠AOD.`),
    sheet: t => TYPES.diam2.fig(t) + `<p>AC и BD — диаметры, ∠ACB = ${t.x}°. ∠AOD = ?</p>`,
    ans: t => Q(180 - 2 * t.x),
    ok: t => `∠ACB — вписанный, опирается на дугу AB, поэтому центральный ∠AOB = 2 · ${t.x}° = ${2 * t.x}°. BD — диаметр, углы AOB и AOD смежные: ∠AOD = 180° − ${2 * t.x}° = ${180 - 2 * t.x}°.`,
    wrong(t, x) {
      return vaWrong(TYPES.diam2, t, x, [[2 * t.x, 'adj', 'Ты нашёл ∠AOB, а нужен смежный с ним угол AOD.'], [180 - t.x, 'equal', 'Ты взял ∠AOB = ∠ACB, а центральный угол вдвое больше вписанного.']]);
    },
    traps: t => vaTraps([2 * t.x, 180 - t.x], 180 - 2 * t.x),
    hints: () => ['Найди центральный угол, опирающийся на ту же дугу, что и ∠ACB.', 'Углы AOB и AOD смежные: в сумме 180°.'],
  },
  tan: {
    input: 'num', title: 'Касательная и хорда',
    gen: rnd => ({ x: int(rnd, 28, 80), rot: vaRot(rnd) }),
    bad: t => t.x === 45,
    fig: t => vaTaskSVG({ rot: t.rot, pts: { A: 270 - t.x, B: 270 + t.x }, tan: ['A', 'K', 'B'], segs: ['OA', 'OB', 'AB'], center: true,
      angles: [['O', 'A', 'B', 2 * t.x + '°'], ['A', 'K', 'B', '?', 2]] }, 'Касательная AK и хорда AB'),
    text: () => '∠KAB',
    ask: t => TYPES.tan.fig(t) + vaQ(`AK — касательная к окружности с центром O, ∠AOB = ${2 * t.x}°. Найди угол KAB между касательной и хордой.`),
    sheet: t => TYPES.tan.fig(t) + `<p>AK — касательная, ∠AOB = ${2 * t.x}°. ∠KAB = ?</p>`,
    ans: t => Q(t.x),
    ok: t => `Угол между касательной и хордой равен половине дуги, заключённой внутри него: дуга AB = ∠AOB = ${2 * t.x}°, ∠KAB = ${t.x}°. Проверка: ∠OAK = 90°, ∠OAB = (180° − ${2 * t.x}°) : 2 = ${90 - t.x}°, ∠KAB = 90° − ${90 - t.x}° = ${t.x}°.`,
    wrong(t, x) {
      return vaWrong(TYPES.tan, t, x, [[2 * t.x, 'tan', 'Ты приравнял угол к дуге, а он равен её половине.'], [90 - t.x, 'tan', 'Ты нашёл ∠OAB, а не угол между касательной и хордой.'], [90 + t.x, 'tan', 'Касательная перпендикулярна радиусу OA: ∠KAB = 90° − ∠OAB.']]);
    },
    traps: t => vaTraps([2 * t.x, 90 - t.x], t.x),
    hints: () => ['Угол между касательной и хордой — как вписанный: половина дуги внутри него.', 'Дуга AB равна центральному углу AOB. Возьми её половину.'],
  },
};

// ответ в разборе — с градусами: «∠ACB = 40°»
for (const T of Object.values(TYPES)) if (T.input === 'num') T.answer = t => `${T.text(t)} = ${T.ans(t).n}°`;

// Типы ошибок для «Над чем поработать»
const CATS = {
  equal: ['Вписанный угол приравняли к центральному', 'Центральный угол равен дуге, вписанный — половине дуги, на которую опирается.'],
  double: ['Половина или удвоение', 'Центральный угол вдвое больше вписанного; вписанные углы на одну дугу равны.'],
  arc: ['Не та дуга', 'Угол опирается на дугу внутри него. Вершины по разные стороны хорды — углы в сумме дают 180°.'],
  diam: ['Угол, опирающийся на диаметр', 'Вписанный угол, опирающийся на диаметр, равен 90°.'],
  iso: ['Равнобедренный треугольник с радиусами', 'OA = OB как радиусы: углы при основании равны (180° − ∠AOB) : 2.'],
  adj: ['Смежные углы', 'Если BD — диаметр, углы AOB и AOD смежные: в сумме 180°.'],
  tan: ['Касательная и хорда', 'Угол между касательной и хордой равен половине дуги внутри него; касательная ⟂ радиусу.'],
  kind: ['Вид угла', 'Центральный — вершина в центре; вписанный — вершина на окружности, стороны пересекают окружность.'],
  calc: ['Вычисления', 'Проверь, какую дугу ты взял, и пересчитай.'],
};

const SECTIONS = [
  { title: 'Виды углов и дуги', text: 'Центральный, вписанный, дуга', types: ['kind', 'ins', 'cen', 'arc'], ex: () => 'найди угол по центральному углу или по дуге', exText: true },
  { title: 'Одна дуга — разные углы', text: 'Равные углы, сумма 180°, диаметр', types: ['same', 'opp', 'diam'], ex: () => 'углы на одну дугу и на диаметр', exText: true },
  { title: 'Задачи ОГЭ', text: 'Радиусы, диаметры, касательная', types: ['iso', 'diam2', 'tan'], ex: () => 'два шага: центральный угол, затем треугольник', exText: true },
];

// ================= Раздатка и бланк =================
const KINDS_V1 = [['ins'], ['cen'], ['arc'], ['same'], ['diam'], ['iso'], ['diam2'], ['kind']];
const WORDS_V1 = ['ТРАПЕЦИЯ', 'ДОКУМЕНТ', 'ГРУЗОВИК', 'КОНДИТЕР'];
const PRINT = {
  instr: 'В № 1–7 ответ — величина угла или дуги в градусах, в № 8 — «центральный», «вписанный» или «ни тот, ни другой». O — центр окружности. Найди ответ в таблице букв и впиши букву — получится слово. Чертежи схематические.',
  about: 'Восемь задач на готовых чертежах: вписанный и центральный угол, дуга, углы на одну дугу и на диаметр, треугольник AOB, два диаметра, вид угла. Ключ восстанавливается по номеру.',
  ogeAbout: 'Восемь задач на готовых чертежах в духе ОГЭ, ответ — число градусов. Каждая цифра вписывается в отдельную клеточку.',
};
const OGE_V1 = ['ins', 'cen', 'arc', 'opp', 'diam', 'iso', 'diam2', 'tan'];
function ogeTask(kind, rnd) {
  const t = generate(kind, rnd), T = TYPES[kind];
  return { kind, t, ask: T.sheet(t), ans: String(T.ans(t).n) };
}

// ================= Живая доска =================
// Окружность с центром VA_O; точки A, B, C, D задаются направлениями из центра (градусы, против часовой).
const VA_O = GEO.pt(285, 200), VA_R = 130;
const vaNorm = d => ((d % 360) + 360) % 360;
const vaCcw = (from, to) => vaNorm(to - from);                          // дуга от from до to против часовой
const vaSep = (x, y) => Math.min(vaCcw(x, y), vaCcw(y, x));
const vaAt = d => GEO.polar(VA_O, d, VA_R);
const vaDeg = x => String(Math.round(x * 10) / 10).replace('.', ',') + '°';
// меньшая дуга AB — пока вершины C нет на чертеже
function vaMinor(m) { const L = vaCcw(m.a, m.b); return L <= 180 ? { s: m.a, len: L } : { s: m.b, len: 360 - L }; }
// дуга AB, на которую опирается вписанный угол ACB (не содержит C): начало s и длина len против часовой
function vaArc(m) {
  if (!m.showC) return vaMinor(m);
  const L = vaCcw(m.a, m.b);
  return vaCcw(m.a, m.c) < L ? { s: m.b, len: 360 - L } : { s: m.a, len: L };
}
const vaSide = (m, x) => vaCcw(m.a, x) < vaCcw(m.a, m.b);               // точка на дуге от A к B против часовой
const vaIns = m => GEO.angleAt(vaAt(m.c), vaAt(m.a), vaAt(m.b));        // измеренный вписанный угол
const vaCen = m => GEO.angleAt(VA_O, vaAt(m.a), vaAt(m.b));             // измеренный центральный угол (до 180°)
// где центр O относительно угла ACB: на стороне, внутри, вне
function vaCase(m) {
  const r = vaArc(m), t = vaCcw(r.s, m.c + 180);
  if (Math.min(t, 360 - t) < .5 || Math.abs(t - r.len) < .5) return 'side';
  return t < r.len ? 'in' : 'out';
}
function vaCasePos(m, v) {
  const r = vaArc(m);
  if (v === 'side') return vaNorm(m.b + 180);
  if (v === 'in') return vaNorm(r.s + r.len * .3 + 180);
  const d = Math.min(40, (180 - r.len) / 2);
  return d < 10 ? m.c : vaNorm(r.s - d);
}

const LIVE = {
  model: e => ({ a: e.a, b: e.b, c: e.c, arc0: vaCcw(e.a, e.b), showC: true, lock: true, ghosts: false, pair: false, d: 0, tan: 0 }),
  fix(m) {
    m.a = vaNorm(Math.round(m.a / 5) * 5);
    m.b = vaNorm(Math.round(m.b / 5) * 5);
    m.c = vaNorm(Math.round(m.c));
    for (const t of [m.a + 180, m.b + 180]) if (vaSep(m.c, t) <= 1.5) m.c = vaNorm(t);   // прилипание: сторона угла — диаметр
    m.d = vaNorm(Math.round(m.d));
  },
  ok(m) {
    if (vaSep(m.a, m.b) < 20) return false;
    if (!m.showC) return true;
    if (vaSep(m.c, m.a) < 8 || vaSep(m.c, m.b) < 8) return false;
    if (m.lock && vaArc(m).len > 180) return false;            // C — на большей дуге: угол не тупой
    if (m.pair && (vaSide(m, m.d) === vaSide(m, m.c) || vaSep(m.d, m.a) < 8 || vaSep(m.d, m.b) < 8)) return false;
    return true;
  },
};
// поставить C на допустимое место (после шагов, где C не было или угол был другим)
function vaPlaceC(m) {
  m.showC = true; m.lock = true; m.pair = false; m.tan = 0; m.ghosts = false;
  if (vaMinor(m).len > 160) m.b = vaNorm(m.a + (m.arc0 <= 180 ? m.arc0 : 120));
  if (!LIVE.ok(m)) { const r = vaMinor(m); m.c = vaNorm(r.s + 180 + r.len / 2); }
  LIVE.fix(m);
}
// ручки: точка движется по окружности; стрелки — вдоль окружности в сторону нажатой стрелки
function vaHandle(id, label, step) {
  return m => ({
    id, at: vaAt(m[id]), label,
    move(m, p) { if (GEO.dist(p, VA_O) > 1) m[id] = GEO.dirDeg(VA_O, p); },
    key(m, dx, dy, fine) {
      const th = GEO.rad(m[id]), t = -dx * Math.sin(th) - dy * Math.cos(th);
      m[id] += (Math.abs(t) < .35 ? (dx || -dy) : Math.sign(t)) * (fine ? 1 : step);
    },
  });
}
const vaHA = vaHandle('a', 'Точка A', 5), vaHB = vaHandle('b', 'Точка B', 5), vaHC = vaHandle('c', 'Вершина C', 5), vaHD = vaHandle('d', 'Вершина D', 5);

// Чертёж. o: { cen — центральный угол, ins — вписанный, arc — дуга, vals — величины на чертеже,
//   ghosts — ещё вершины на той же дуге, diam — диаметр CD, tri — треугольник AOC для доказательства,
//   pair — вершина D на другой дуге, tan — касательная в точке A, panel — строки справа [текст, класс] }
function vaDraw(m, o = {}) {
  const A = vaAt(m.a), Bp = vaAt(m.b), C = vaAt(m.c), r = vaArc(m), ins = vaIns(m);
  let back = GEO.circle(VA_O, VA_R), lines = '', marks = '', dots = '', labs = '';
  const pts = [['A', A], ['B', Bp]];
  if (o.arc) back += GEO.arc(VA_O, r.s, r.s + r.len, VA_R, 'va-arc');
  if (o.cen) {
    back += GEO.sector(VA_O, A, Bp, 44, 'g-sec a');
    lines += GEO.seg(VA_O, A, 'g-thin') + GEO.seg(VA_O, Bp, 'g-thin');
    if (o.vals && !(o.ins && r.len > 180)) labs += GEO.angleText(VA_O, A, Bp, vaDeg(vaCen(m)), 74, 'g-num a');   // C на другой дуге — величина ∠AOB только в панели
  }
  if (o.tri) {
    const E = vaSep(m.c, m.b + 180) < .5 ? A : Bp;   // треугольник с вершиной, сторона к которой — не диаметр
    back += GEO.poly([E, VA_O, C], 'g-fig');
    marks += GEO.ticks(VA_O, E, 1) + GEO.ticks(VA_O, C, 1) + GEO.arcs(E, VA_O, C, 1, 34) + GEO.arcs(C, VA_O, E, 1, 34);
  }
  if (o.ghosts) {   // ещё две вершины на той же дуге: углы такие же
    const e = r.s + r.len, L = 360 - r.len;
    [[.2, 'C1'], [.8, 'C2']].forEach(([k, n]) => {
      const g = e + L * k;
      if (vaSep(g, m.c) < 18) return;
      const G = vaAt(g);
      back += GEO.sector(G, A, Bp, 40, 'g-sec');
      lines += GEO.seg(G, A, 'g-thin') + GEO.seg(G, Bp, 'g-thin');
      labs += GEO.angleText(G, A, Bp, vaDeg(GEO.angleAt(G, A, Bp)), vaR(ins, 30, 62, 100), 'g-num b');
      pts.push([n, G]);
    });
  }
  if (o.pair) {
    const Dp = vaAt(m.d);
    back += GEO.sector(Dp, A, Bp, 44, 'g-sec a');
    lines += GEO.seg(Dp, A, 'g-thin') + GEO.seg(Dp, Bp, 'g-thin');
    labs += GEO.angleText(Dp, A, Bp, vaDeg(GEO.angleAt(Dp, A, Bp)), vaR(GEO.angleAt(Dp, A, Bp), 30, 62, 100), 'g-num a');
    pts.push(['D', Dp]);
  }
  if (o.diam) {
    const Dp = vaAt(m.c + 180);
    lines += GEO.seg(C, Dp, 'g-dash');
    pts.push(['D', Dp]);
  }
  if (o.tan && m.tan > 0) {
    const M = vaAt(r.s + r.len / 2);
    let t = GEO.perp(GEO.unit(VA_O, A));
    if ((M.x - A.x) * t.x + (M.y - A.y) * t.y < 0) t = GEO.scale(t, -1);
    const T = GEO.add(A, GEO.scale(t, 100));
    lines += `<g opacity="${GEO.f1(m.tan)}">${GEO.line(GEO.sub(A, t), T, 'g-ln')}${GEO.seg(A, Bp, 'g-thin')}${GEO.sector(A, T, Bp, 54, 'g-sec')}${GEO.angleText(A, T, Bp, vaDeg(GEO.angleAt(A, T, Bp)), vaR(GEO.angleAt(A, T, Bp), 30, 70, 110), 'g-num b')}</g>`;
  }
  if (o.ins) {
    if (Math.abs(ins - 90) < 1e-6) marks += GEO.right(C, A, Bp, 26);
    else if (!(o.tan && m.tan > .5)) back += GEO.sector(C, A, Bp, 50, 'g-sec');
    lines += GEO.seg(C, A) + GEO.seg(C, Bp);
    if (o.vals && !(o.tan && m.tan > .5)) labs += GEO.angleText(C, A, Bp, vaDeg(ins), vaR(ins, 30, 62, 92), 'g-num b');
    if (!(o.tan && m.tan > .5)) pts.push(['C', C]);   // у касательной C почти совпала с A: подпись C не нужна
    else dots += GEO.dot(C);
  }
  for (const [n, p] of pts) { dots += GEO.dot(p); labs += GEO.vertex(p, n, VA_O); }
  if (o.cen || o.tri || o.diam) {
    dots += GEO.dot(VA_O);
    // подпись O — в направлении, дальше всего от отрезков из центра и от сторон угла C
    const busy = [m.a, m.b].concat(o.ins || o.tri || o.diam ? [m.c, m.c + 180] : []);
    let best = 0, far = -1;
    for (let d = 15; d < 360; d += 30) { const f = Math.min(...busy.map(b => vaSep(d, b))); if (f > far) { far = f; best = d; } }
    labs += GEO.text(GEO.polar(VA_O, best, 36), 'O', 'g-vl');
  }
  const panel = (o.panel || []).filter(Boolean).map(([s, cls], i) => GEO.text(GEO.pt(530, 80 + i * 62), s, cls || 'g-lab', 'start')).join('');
  return back + lines + marks + dots + labs + panel;
}
// строки панели справа: величины, измеренные на чертеже
const vaRowArc = m => [`дуга AB = ${vaArc(m).len}°`, 'g-lab a'];
const vaRowCen = m => [`∠AOB = ${vaDeg(vaCen(m))}`, 'g-lab a'];
const vaRowIns = m => [`∠ACB = ${vaDeg(vaIns(m))}`, 'g-lab b'];

// Пример для доски: дуга AB внизу, вершина C наверху
function boardExample(random, old) {
  if (!random) return { a: CONFIG.board.a, b: CONFIG.board.b, c: CONFIG.board.c };
  const rnd = mulberry32((Math.random() * 4294967296) >>> 0);
  let arc; do arc = pick(rnd, [60, 70, 80, 100, 110, 120, 140]); while (arc === vaCcw(old.a, old.b));
  return { a: 270 - arc / 2, b: 270 + arc / 2, c: 90 + pick(rnd, [-1, 1]) * int(rnd, 25, 40) };
}

function buildSteps(e) {
  const x = vaCcw(e.a, e.b) / 2;   // вписанный угол примера (для задачи и ловушки)
  const ex = { ...LIVE.model(e) };
  const enterC = m => vaPlaceC(m);
  const caseText = m => {
    const k = vaCase(m), C = vaAt(m.c), Dp = vaAt(m.c + 180), A = vaAt(m.a), Bp = vaAt(m.b);
    const ad = GEO.angleAt(C, A, Dp), bd = GEO.angleAt(C, Bp, Dp);
    if (k === 'side') { const T = vaSep(m.c, m.b + 180) < .5 ? 'AOC' : 'BOC'; return `Центр на стороне угла: △${T} равнобедренный, внешний угол при O равен сумме двух равных углов: ∠AOB = 2∠ACB = ${vaDeg(vaCen(m))}.`; }
    if (k === 'in') return `Центр внутри угла: ∠ACB = ∠ACD + ∠DCB = ½∠AOD + ½∠DOB = ½∠AOB. Здесь ${vaDeg(ad)} + ${vaDeg(bd)} = ${vaDeg(vaIns(m))}.`;
    const [p, q, P, Q2] = ad > bd ? ['A', 'B', ad, bd] : ['B', 'A', bd, ad];
    return `Центр вне угла: ∠ACB = ∠${p}CD − ∠${q}CD = ½∠${p}OD − ½∠${q}OD = ½∠AOB. Здесь ${vaDeg(P)} − ${vaDeg(Q2)} = ${vaDeg(vaIns(m))}.`;
  };
  return [
    { id: 'central',
      q: 'Вершина угла AOB — в центре окружности. Как называется такой угол? Как он связан с дугой AB?',
      a: m => `Это центральный угол. Градусная мера дуги AB равна центральному углу: ${vaArc(m).len}°.`,
      note: 'Двигайте точки A и B мышью, пальцем или стрелками: угол и дуга меняются вместе. Спросите, какой угол у полуокружности (180°).',
      live: { enter(m) { m.showC = false; m.ghosts = false; m.pair = false; m.tan = 0; }, handles: m => [vaHA(m), vaHB(m)] },
      draw: (ph, m) => vaDraw(m, { cen: true, arc: true, vals: true, panel: [vaRowCen(m), ph && vaRowArc(m)] }),
      rec: (ph, m) => ph ? ['Центральный угол: вершина в центре окружности.', `∠AOB = дуга AB = ${vaArc(m).len}°`] : [] },
    { id: 'inscribed',
      q: 'Вершина C лежит на окружности, стороны угла пересекают окружность. Это вписанный угол ACB. На какую дугу он опирается?',
      a: 'На дугу AB, которая лежит внутри угла: точка C на ней не лежит.',
      note: 'Пусть ученик покажет дугу рукой. Подвигайте C: дуга внутри угла остаётся той же, пока C не перейдёт через A или B.',
      live: { enter: enterC, handles: m => [vaHC(m), vaHA(m), vaHB(m)] },
      draw: (ph, m) => vaDraw(m, { ins: true, arc: !!ph, panel: [ph && vaRowArc(m)] }),
      rec: (ph, m) => ph ? ['Вписанный угол: вершина на окружности,', 'стороны пересекают окружность.', `∠ACB опирается на дугу AB = ${vaArc(m).len}°`] : [] },
    { id: 'predict',
      q: m => `Сейчас ∠ACB = ${vaDeg(vaIns(m))}. Будем двигать вершину C по окружности. Как изменится угол? Запишите прогноз.`,
      a: m => `Не изменится: ∠ACB = ${vaDeg(vaIns(m))} при любом положении C на этой дуге.`,
      note: 'Сначала прогноз в тетради. «Показать ответ» прокатит C по дуге; «Ещё вершины» покажет сразу три угла. Пусть ученик сам потащит C.',
      live: {
        enter(m) { vaPlaceC(m); },
        reveal(m) {   // C едет по своей дуге, не переходя через A и B
          const r = vaArc(m), e0 = r.s + r.len, L = 360 - r.len;
          m.c = e0 + vaCcw(e0, m.c);
          liveTo([{ c: e0 + L * .15 }, { c: e0 + L * .85 }, { c: e0 + L * .65 }], 1100);
        },
        handles: m => [vaHC(m), vaHA(m), vaHB(m)],
        controls: () => [{ id: 'ghosts', type: 'toggle', label: 'Ещё вершины', get: m => m.ghosts, set(m, v) { m.ghosts = v; } }],
      },
      draw: (ph, m) => vaDraw(m, { ins: true, arc: true, vals: true, ghosts: m.ghosts, panel: [vaRowIns(m), vaRowArc(m)] }),
      rec: (ph, m) => ph ? ['Вписанные углы, опирающиеся на одну дугу, равны.'] : [] },
    { id: 'half',
      q: 'Сравните вписанный угол ACB и центральный угол AOB — они опираются на одну дугу. Подвигайте точки A и B.',
      a: m => `Вписанный угол равен половине центрального: ${vaDeg(vaIns(m))} = ${vaDeg(vaCen(m))} : 2.`,
      note: 'Пусть ученик у доски сделает дугу маленькой, затем почти полуокружностью. Отношение 1 : 2 сохраняется.',
      live: { enter: enterC, handles: m => [vaHA(m), vaHB(m), vaHC(m)] },
      draw: (ph, m) => vaDraw(m, { ins: true, cen: true, arc: true, vals: true, panel: [vaRowArc(m), vaRowCen(m), vaRowIns(m), ph && [`${vaDeg(vaIns(m))} = ${vaDeg(vaCen(m))} : 2`, 'g-lab']] }),
      rec: (ph, m) => ph ? ['Вписанный угол — половина центрального на ту же дугу:', `∠ACB = ½∠AOB = ½ дуги AB = ${vaDeg(vaIns(m))}`] : [] },
    { id: 'trap',
      q: `Ученик решил: «∠AOB = ${2 * x}°, а ∠ACB опирается на ту же дугу, значит, ∠ACB = ${2 * x}°». Где ошибка?`,
      a: `Вписанный угол не равен центральному, он равен его половине: ∠ACB = ${2 * x}° : 2 = ${x}°. Равны между собой вписанные углы на одну дугу.`,
      note: 'Самая частая ошибка темы. Попросите сформулировать, какие углы равны, а какие — вдвое отличаются.',
      draw: ph => vaDraw(ex, { ins: true, cen: true, arc: true, vals: !!ph, panel: [[`∠AOB = ${2 * x}°`, 'g-lab a'], [ph ? `∠ACB = ${x}°` : '∠ACB = ?', 'g-lab b']] }),
      rec: ph => ph ? [`∠ACB = ½∠AOB = ${x}°, а не ${2 * x}°`] : [] },
    { id: 'proof-side',
      q: 'Докажем теорему. Сначала случай, когда сторона CB проходит через центр O. Что можно сказать о треугольнике AOC?',
      a: 'OA = OC как радиусы, △AOC равнобедренный: ∠OAC = ∠OCA. Угол AOB — внешний угол треугольника: ∠AOB = ∠OAC + ∠OCA = 2∠ACB.',
      note: 'Внешний угол треугольника равен сумме двух углов, не смежных с ним. Дужки отмечают равные углы при основании.',
      live: { enter(m) { vaPlaceC(m); m.c = vaCasePos(m, 'side'); LIVE.fix(m); } },
      draw: (ph, m) => vaDraw(m, { ins: true, cen: true, tri: true, arc: true, vals: !!ph, panel: [['OA = OC — радиусы', 'g-lab'], ph && ['∠A = ∠C', 'g-lab b'], ph && ['∠AOB = ∠A + ∠C', 'g-lab a'], ph && ['∠AOB = 2∠ACB', 'g-lab a']] }),
      rec: ph => ph ? ['△AOC равнобедренный: ∠A = ∠C', '∠AOB — внешний: ∠AOB = ∠A + ∠C = 2∠ACB'] : [] },
    { id: 'proof-cases',
      q: 'А если центр O лежит внутри угла ACB или вне его? Проведём диаметр CD — каждый кусок сведётся к первому случаю.',
      a: m => caseText(m),
      note: 'Переключайте «Центр O»: внутри, на стороне, вне угла. Можно тащить C. Диаметр CD делит задачу на два угла из первого случая.',
      live: {
        enter(m) { vaPlaceC(m); m.c = vaCasePos(m, 'in'); LIVE.fix(m); },
        handles: m => [vaHC(m)],
        controls: () => [{ id: 'case', type: 'choice', label: 'Центр O', options: [['in', 'внутри угла'], ['side', 'на стороне'], ['out', 'вне угла']], get: vaCase, set(m, v) { m.c = vaCasePos(m, v); } }],
      },
      draw: (ph, m) => vaDraw(m, { ins: true, cen: true, diam: vaCase(m) !== 'side', tri: vaCase(m) === 'side', arc: true, vals: true,
        panel: [vaRowCen(m), vaRowIns(m), ['центр O ' + { in: 'внутри угла', side: 'на стороне', out: 'вне угла' }[vaCase(m)], 'g-lab']] }),
      rec: (ph, m) => ph ? [{ side: '∠AOB = ∠A + ∠C = 2∠ACB (△ с радиусами)', in: '∠ACB = ∠ACD + ∠DCB = ½∠AOD + ½∠DOB = ½∠AOB', out: '∠ACB = разность двух углов первого случая = ½∠AOB' }[vaCase(m)]] : [] },
    { id: 'diameter',
      q: 'Растянем дугу AB до полуокружности: AB станет диаметром. Каким станет угол ACB?',
      a: 'Прямым: ∠ACB = ½ · 180° = 90°. Вписанный угол, опирающийся на диаметр, — прямой.',
      note: '«Показать ответ» растянет дугу. Потом подвигайте C: угол остаётся прямым. Это пригодится в задачах ОГЭ.',
      live: {
        enter: enterC,
        reveal(m) {   // дуга AB растягивается до 180°, C уходит на середину другой полуокружности
          const r = vaArc(m), s = r.s, toB = s === m.a;
          m.c = s + vaCcw(s, m.c);
          if (toB) { m.b = m.a + r.len; liveTo({ b: m.a + 180, c: m.a + 270 }, 1300); }
          else { m.a = m.b + r.len; liveTo({ a: m.b + 180, c: m.b + 270 }, 1300); }
        },
        handles: (m, ph) => ph ? [vaHC(m)] : [vaHC(m), vaHA(m), vaHB(m)],
      },
      draw: (ph, m) => vaDraw(m, { ins: true, arc: true, vals: true, cen: !ph, panel: [vaRowArc(m), vaRowIns(m)] }),
      rec: ph => ph ? ['Вписанный угол, опирающийся на диаметр, равен 90°.'] : [] },
    { id: 'other-arc',
      q: 'Переведём вершину C на другую дугу. Останется ли ∠ACB равным половине ∠AOB?',
      a: m => `Нет: теперь угол опирается на другую дугу AB, она равна ${vaArc(m).len}°. ∠ACB = ½ · ${vaArc(m).len}° = ${vaDeg(vaIns(m))}, а ∠AOB = ${vaDeg(vaCen(m))}.`,
      note: 'Включите «Обе вершины»: вершины C и D по разные стороны от хорды AB, ∠ACB + ∠ADB = 180°. Это ключ к вписанному четырёхугольнику.',
      live: {
        enter(m) { vaPlaceC(m); },
        reveal(m) {   // C переходит через конец дуги на середину дуги AB
          const r = vaArc(m);
          m.lock = false;
          m.c = r.s + vaCcw(r.s, m.c);
          liveTo({ c: r.s + r.len * .3 }, 1400);
        },
        handles: (m, ph) => [vaHC(m)].concat(m.pair ? [vaHD(m)] : []),
        controls: (m, ph) => ph ? [{ id: 'pair', type: 'toggle', label: 'Обе вершины', get: m => m.pair, set(m, v) { m.pair = v; if (v) { const r = vaArc(m); m.d = vaNorm(r.s + r.len / 2); } } }] : [],
      },
      draw: (ph, m) => vaDraw(m, { ins: true, cen: true, arc: true, vals: true, pair: m.pair,
        panel: [vaRowArc(m), vaRowCen(m), vaRowIns(m), m.pair && [`∠ACB + ∠ADB = ${vaDeg(vaIns(m) + GEO.angleAt(vaAt(m.d), vaAt(m.a), vaAt(m.b)))}`, 'g-lab']] }),
      rec: (ph, m) => ph ? ['Угол опирается на дугу, которая лежит внутри него.', m.pair ? 'C и D по разные стороны от AB: ∠ACB + ∠ADB = 180°' : ''].filter(Boolean) : [] },
    { id: 'tangent',
      q: 'Приблизим вершину C к точке A. Во что превратится прямая CA?',
      a: m => `В касательную к окружности в точке A. Угол между касательной и хордой AB тоже равен половине дуги внутри него: ${vaArc(m).len}° : 2 = ${vaDeg(vaArc(m).len / 2)}.`,
      note: '«Показать ответ» подведёт C к A и проведёт касательную. Переключатель «Касательная» убирает и возвращает её; C можно тащить.',
      live: {
        enter(m) { vaPlaceC(m); },
        reveal(m) {   // C едет к A по своей дуге
          const r = vaArc(m), e0 = r.s + r.len, toEnd = r.s === m.a;
          m.c = e0 + vaCcw(e0, m.c);
          liveTo([{ c: toEnd ? r.s + 344 : e0 + 16 }, { tan: 1 }], 900);
        },
        handles: m => [vaHC(m)],
        controls: (m, ph) => ph ? [{ id: 'tan', type: 'toggle', label: 'Касательная', get: m => m.tan > .5, set(m, v) { m.tan = v ? 1 : 0; } }] : [],
      },
      draw: (ph, m) => vaDraw(m, { ins: true, arc: true, vals: true, tan: true,
        panel: [vaRowArc(m), vaRowIns(m), m.tan > .5 && [`касательная и AB: ${vaDeg(vaArc(m).len / 2)}`, 'g-lab b']] }),
      rec: ph => ph ? ['Угол между касательной и хордой — половина дуги внутри него.'] : [] },
    { id: 'solve',
      q: `Задача. O — центр окружности, ∠ACB = ${x}°. Найдите ∠AOB и ∠OAB.`,
      a: `∠AOB = 2 · ${x}° = ${2 * x}°. OA = OB, △AOB равнобедренный: ∠OAB = (180° − ${2 * x}°) : 2 = ${90 - x}°.`,
      note: 'Типичная задача ОГЭ: сначала центральный угол, затем равнобедренный треугольник с радиусами. «Другие числа» меняет условие.',
      draw: ph => vaDraw(ex, { ins: true, cen: true, vals: false, panel: [[`∠ACB = ${x}°`, 'g-lab b'], [ph ? `∠AOB = ${2 * x}°` : '∠AOB = ?', 'g-lab a'], [ph ? `∠OAB = ${90 - x}°` : '∠OAB = ?', 'g-lab']] })
        + GEO.seg(vaAt(ex.a), vaAt(ex.b), 'g-thin') + GEO.ticks(VA_O, vaAt(ex.a), 1) + GEO.ticks(VA_O, vaAt(ex.b), 1),
      rec: ph => ph ? [`∠AOB = 2∠ACB = ${2 * x}°`, `∠OAB = (180° − ${2 * x}°) : 2 = ${90 - x}°`] : [] },
    { id: 'rule',
      q: 'Что мы узнали? Сформулируйте правила.',
      a: 'Центральный угол равен дуге. Вписанный — половине дуги, на которую он опирается. Вписанные углы на одну дугу равны, на диаметр — прямые.',
      note: 'Пусть класс сам продиктует правила по записям в тетради.',
      draw: () => '',
      rec: () => ['∠AOB = дуга AB', '∠ACB = ½ дуги AB = ½∠AOB', 'На одну дугу — равны; на диаметр — 90°', 'По разные стороны хорды — в сумме 180°', 'Касательная и хорда — ½ дуги внутри угла'] },
  ];
}
const BOARD = { previewUntil: 3, poster: 3 };
