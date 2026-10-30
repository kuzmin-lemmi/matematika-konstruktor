// Углы между хордами и секущими. Числа дуг согласованы с координатами точек.
const CONFIG = {
  board: { a: 140, b: 60, gap: 80, previewDelay: 2600 },
  print: { variants: 25, traps: 1, space: true, formats: ['test'], defaultKind: 'test', label: 'Самостоятельная', answerTable: true },
  home: { round: 10, points: [10, 15, 20], hintPenalty: 3, maxMultiplier: 3 },
};
const GEN_VERSION = 1;
const bad = (cat, msg) => ({ cat, msg });
const hsNorm = x => (x % 360 + 360) % 360;
const hsNum = x => decStr(Q(Math.round(x * 10), 10));
const hsDeg = x => hsNum(x) + '°';
const hsAlpha = t => (t.mode === 'outside' ? t.a - t.b : t.a + t.b) / 2;
const hsLast = t => 360 - t.a - t.b - t.gap;

// Внутри: A,B,C,D идут по окружности. Снаружи: на лучах точки идут P,A,C и P,B,D.
function hsGeometry(t) {
  const O = GEO.pt(0, 0), at = d => GEO.polar(O, d + t.rot, 1);
  const angles = t.mode === 'outside'
    ? { A: 180 - t.b / 2, B: 180 + t.b / 2, C: t.a / 2, D: 360 - t.a / 2 }
    : { A: 0, B: t.a, C: t.a + t.gap, D: t.a + t.gap + t.b };
  const ps = Object.fromEntries(Object.entries(angles).map(([k, v]) => [k, at(v)]));
  ps.P = GEO.cross(ps.A, ps.C, ps.B, ps.D);
  return { O, ...ps, angles: Object.fromEntries(Object.entries(angles).map(([k, v]) => [k, v + t.rot])) };
}
function hsMapped(t, board = false) {
  const raw = hsGeometry(t);
  let map, r;
  if (board) {
    r = t.mode === 'outside' ? 116 : 134;
    const O = GEO.pt(t.mode === 'outside' ? 416 : 310, 200);
    map = p => GEO.add(O, GEO.scale(p, r));
  } else {
    const fit = GEO.fit([raw.P, ...[0, 90, 180, 270].map(d => GEO.polar(raw.O, d, 1))],
      { x: 5, y: 5, w: 410, h: 290 }, { pad: t.mode === 'outside' ? 52 : 37 });
    r = fit.k; map = fit.map;
  }
  return { ...Object.fromEntries(['O', 'A', 'B', 'C', 'D', 'P'].map(k => [k, map(raw[k])])), r, raw };
}
function hsArcSpecs(t, adj = false) {
  if (t.mode === 'outside') return [['D', 'C', t.a, 'far'], ['A', 'B', t.b, 'near']];
  return adj ? [['B', 'C', t.gap, 'first'], ['D', 'A', hsLast(t), 'second']]
    : [['A', 'B', t.a, 'first'], ['C', 'D', t.b, 'second']];
}
// Один рисунок для доски и задач. Неизвестная дуга не получает числовой подписи.
function hsDrawing(t, { board = false, arcs = true, numbers = true, unknown = '', angle = '?', adj = false,
  targetAdj = adj, aux = false, proof = false, vertical = false } = {}) {
  const g = hsMapped(t, board), [U, V] = targetAdj ? ['B', 'C'] : ['A', 'B'];
  let s = GEO.circle(g.O, g.r, 'hs-circle');
  if (arcs) for (const [u, v, value, tag] of hsArcSpecs(t, adj)) {
    const start = g.raw.angles[u], end = start + hsNorm(g.raw.angles[v] - start);
    s += GEO.arc(g.O, start, end, g.r, `hs-arc ${tag}`);
    if (numbers) s += GEO.text(GEO.polar(g.O, (start + end) / 2, g.r + (board ? 32 : 25)),
      unknown === tag ? '?' : hsDeg(value), 'hs-value');
  }
  if (unknown === 'three') {
    s = GEO.circle(g.O, g.r, 'hs-circle');
    for (const [u, v, val] of [['A', 'B', t.a], ['B', 'C', t.gap], ['D', 'A', hsLast(t)]]) {
      const st = g.raw.angles[u], en = st + hsNorm(g.raw.angles[v] - st);
      s += GEO.arc(g.O, st, en, g.r, 'hs-arc first') + GEO.text(GEO.polar(g.O, (st + en) / 2, g.r + 25), hsDeg(val), 'hs-value');
    }
  }
  s += GEO.seg(t.mode === 'outside' ? g.P : g.A, g.C, 'hs-line') + GEO.seg(t.mode === 'outside' ? g.P : g.B, g.D, 'hs-line');
  if (aux) s += GEO.seg(t.mode === 'outside' ? g.A : g.B, t.mode === 'outside' ? g.D : g.C, 'hs-aux');
  s += GEO.sector(g.P, g[U], g[V], board ? 44 : 24, 'hs-sector') + GEO.arcs(g.P, g[U], g[V], 1, board ? 44 : 24, 'hs-mark');
  if (vertical && t.mode === 'inside') s += GEO.sector(g.P, g.C, g.D, 40, 'hs-sector');
  if (angle) s += t.mode === 'outside'
    ? GEO.vertex(g.P, angle, g.O, board ? 56 : 24, 'hs-value hs-angle')
    : GEO.angleText(g.P, g[U], g[V], angle, board ? 76 : 38, 'hs-value hs-angle');
  if (proof) {
    if (t.mode === 'inside') {
      s += GEO.arcs(g.C, g.A, g.B, 1, 32, 'hs-mark first') + GEO.angleText(g.C, g.A, g.B, hsDeg(t.a / 2), 65, 'hs-proof');
      s += GEO.arcs(g.B, g.D, g.C, 2, 28, 'hs-mark second') + GEO.angleText(g.B, g.D, g.C, hsDeg(t.b / 2), 62, 'hs-proof');
    } else {
      s += GEO.arcs(g.A, g.C, g.D, 1, 30, 'hs-mark far') + GEO.angleText(g.A, g.C, g.D, hsDeg(t.a / 2), 65, 'hs-proof');
      s += GEO.arcs(g.D, g.B, g.A, 2, 28, 'hs-mark near') + GEO.angleText(g.D, g.B, g.A, hsDeg(t.b / 2), 64, 'hs-proof');
    }
  }
  for (const k of ['A', 'B', 'C', 'D', 'P']) {
    s += `<circle class="hs-dot" data-point="${k}" cx="${GEO.f1(g[k].x)}" cy="${GEO.f1(g[k].y)}" r="${board ? 5 : 3}"/>`;
    s += k === 'P' && t.mode === 'outside'
      ? GEO.text(GEO.add(g.P, GEO.scale(GEO.perp(GEO.unit(g.O, g.P)), board ? 34 : 23)), 'P', 'hs-letter')
      : GEO.vertex(g[k], k, k === 'P' ? GEO.mid(g[U], g[V]) : g.O, board ? (k === 'P' ? 26 : 43) : 22, 'hs-letter');
  }
  return board ? `<g class="hs-b">${s}</g>` : `<svg class="hs-task" viewBox="0 0 420 300" role="img" aria-label="Окружность; ${t.mode === 'inside' ? 'хорды AC и BD пересекаются внутри в P' : 'секущие PAC и PBD выходят из внешней точки P'}">${s}</svg>`;
}
const hsQ = s => `<p class="hs-question">${s}</p>`;
function hsTaskFigure(t) {
  const inverse = t.type === 'insideArc' || t.type === 'outsideArc';
  return hsDrawing(t, { arcs: t.type !== 'arcs', numbers: t.type !== 'arcs', adj: t.type === 'arcs' && t.adj,
    targetAdj: t.type === 'adjacent' || (t.type === 'arcs' && t.adj),
    unknown: t.type === 'threeArcs' ? 'three' : t.type === 'insideArc' ? 'second' : t.type === 'outsideArc' ? (t.form === 'near' ? 'near' : 'far') : '',
    angle: inverse ? hsDeg(hsAlpha(t)) : '?' });
}
function hsGen(rnd, mode) {
  if (mode === 'outside') return { mode, a: int(rnd, 65, 100) * 2, b: int(rnd, 25, 40) * 2, gap: 0, rot: int(rnd, 0, 23) * 15 };
  const a = int(rnd, 24, 75) * 2, b = int(rnd, 18, 65) * 2;
  const rest = 360 - a - b, gap = int(rnd, 16, Math.floor((rest - 32) / 2)) * 2;
  return { mode: 'inside', a, b, gap, rot: int(rnd, 0, 23) * 15 };
}
function hsBad(t) {
  const g = hsGeometry(t);
  return !g.P || hsAlpha(t) < 25 || hsAlpha(t) > 145 || (t.mode === 'outside' && (GEO.len(g.P) < 1.18 || GEO.len(g.P) > 2.6))
    || (t.mode === 'inside' && (t.gap < 30 || hsLast(t) < 30 || GEO.len(g.P) > .72));
}
function hsAnswer(t) {
  if (t.type === 'insideArc') return t.b;
  if (t.type === 'outsideArc') return t.form === 'near' ? t.b : t.a;
  if (t.type === 'adjacent') return 180 - hsAlpha(t);
  return hsAlpha(t);
}
function hsPrompt(t) {
  const a = hsDeg(t.a), b = hsDeg(t.b), x = hsDeg(hsAlpha(t));
  if (t.type === 'insideArc') return `Хорды AC и BD пересекаются в P. ∠APB = ${x}, дуга AB = ${a}. Найди дугу CD.`;
  if (t.type === 'outsideArc') return `P — снаружи; P–A–C, P–B–D. ∠APB = ${x}. ` +
    (t.form === 'near' ? `Дуга CD = ${a}. Найди дугу AB.` : `Дуга AB = ${b}. Найди дугу CD.`);
  if (t.type === 'threeArcs') return `Хорды AC и BD пересекаются в P. Дуги AB, BC и DA равны ${a}, ${hsDeg(t.gap)} и ${hsDeg(hsLast(t))}. Найди ∠APB.`;
  if (t.mode === 'outside') return `P — снаружи; P–A–C, P–B–D. Дуги CD = ${a}, AB = ${b}. Найди ∠APB.`;
  return `Хорды AC и BD пересекаются в P. Дуги AB = ${a}, CD = ${b}. Найди ∠${t.type === 'adjacent' ? 'BPC' : 'APB'}.`;
}
function hsSolution(t) {
  const a = hsDeg(t.a), b = hsDeg(t.b), x = hsDeg(hsAlpha(t));
  if (t.type === 'insideArc') return `Вершина внутри: сумма дуг равна удвоенному углу. Дуга CD = 2 · ${x} ${MINUS} ${a} = ${b}.`;
  if (t.type === 'outsideArc') return t.form === 'near'
    ? `Вершина снаружи: CD ${MINUS} AB = 2∠APB. Дуга AB = ${a} ${MINUS} 2 · ${x} = ${b}.`
    : `Вершина снаружи: CD ${MINUS} AB = 2∠APB. Дуга CD = 2 · ${x} + ${b} = ${a}.`;
  if (t.type === 'threeArcs') return `Все дуги дают 360°. Дуга CD = 360° ${MINUS} ${a} ${MINUS} ${hsDeg(t.gap)} ${MINUS} ${hsDeg(hsLast(t))} = ${b}. ∠APB = (${a} + ${b}) : 2 = ${x}.`;
  if (t.type === 'adjacent') return `Сначала ∠APB = (${a} + ${b}) : 2 = ${x}. Углы APB и BPC смежные: ∠BPC = 180° ${MINUS} ${x} = ${hsDeg(180 - hsAlpha(t))}.`;
  return t.mode === 'inside' ? `Вершина внутри. Берём дуги AB и CD: ∠APB = (${a} + ${b}) : 2 = ${x}.`
    : `Вершина снаружи. Из дальней дуги вычитаем ближнюю: ∠APB = (${a} ${MINUS} ${b}) : 2 = ${x}.`;
}
function hsMistakes(t) {
  const alpha = hsAlpha(t), answer = hsAnswer(t), cases = [];
  if (t.type === 'insideArc') cases.push([alpha - t.a, 'inverse', 'Ты вычел известную дугу из угла, забыв удвоить угол.'], [2 * alpha + t.a, 'sumdiff', 'Ты применил разность дуг к вершине внутри окружности.']);
  else if (t.type === 'outsideArc') cases.push([t.form === 'near' ? t.a - alpha : alpha + t.b, 'inverse', 'При поиске дуги угол нужно удвоить.'], [t.form === 'near' ? 2 * alpha - t.a : 2 * alpha - t.b, 'sumdiff', 'Ты использовал сумму дуг для внешней вершины.']);
  else if (t.type === 'adjacent') cases.push([alpha, 'adjacent', 'Ты нашёл угол APB, а требуется смежный с ним угол BPC.'], [180 - t.a - t.b, 'half', 'Перед вычитанием из 180° сумму дуг нужно разделить на 2.']);
  else if (t.type === 'threeArcs') cases.push([(t.a + t.gap) / 2, 'arcs', 'Ты взял соседние дуги AB и BC. Нужны дуги AB и CD.'], [360 - t.a - t.gap - hsLast(t), 'arcs', 'Ты нашёл дугу CD, а требуется угол APB.']);
  else cases.push([t.mode === 'inside' ? Math.abs(t.a - t.b) / 2 : (t.a + t.b) / 2, 'sumdiff', t.mode === 'inside' ? 'Ты вычел дуги, хотя вершина находится внутри окружности.' : 'Ты сложил дуги, хотя вершина находится снаружи окружности.'], [2 * answer, 'half', 'Ты забыл разделить результат на 2.']);
  return cases.filter(([n]) => n > 0 && n !== answer);
}
function hsSheetPrompt(t) {
  return hsPrompt(t).replace('Хорды AC и BD пересекаются в P. ', '').replace('P — снаружи; P–A–C, P–B–D. ', '');
}
const hsInputLabel = t => `<span class="nw">${t.type === 'insideArc' ? 'Дуга CD' : t.type === 'outsideArc' ? (t.form === 'near' ? 'Дуга AB' : 'Дуга CD') : t.type === 'adjacent' ? '∠BPC' : '∠APB'}</span>`;
function hsNumeric(title, mode, extra = {}) {
  return {
    input: 'num', title,
    gen: (rnd, form) => ({ ...hsGen(rnd, mode), ...(extra.inverse ? { form: form || pick(rnd, ['far', 'near']) } : {}) }),
    bad: t => hsBad(t) || (t.mode === 'outside' && GEO.len(hsGeometry(t).P) < 1.65) || (title === 'Смежный угол' && hsAlpha(t) === 90),
    text: hsInputLabel, ask: t => hsTaskFigure(t) + hsQ(hsPrompt(t)), sheet: t => hsTaskFigure(t) + hsQ(hsSheetPrompt(t)),
    ans: t => Q(hsAnswer(t)), ok: hsSolution,
    wrong(t, x) {
      for (const [n, cat, msg] of hsMistakes(t)) if (qeq(x, Q(n))) return bad(cat, `${msg} ${hsSolution(t)}`);
      return bad('calc', hsSolution(t));
    },
    hints: t => [t.mode === 'inside' ? 'Вершина внутри: угол равен половине суммы двух нужных дуг.' : 'Вершина снаружи: угол равен половине разности дальней и ближней дуг.',
      t.type === 'insideArc' ? 'Удвой угол APB, затем вычти дугу AB.' : t.type === 'outsideArc' ? (t.form === 'near' ? 'Из дальней дуги вычти удвоенный угол.' : 'К удвоенному углу прибавь ближнюю дугу.') : t.type === 'adjacent' ? 'Найди угол APB, затем вычти его из 180°.' : t.type === 'threeArcs' ? 'Сначала найди дугу CD: вычти три известные дуги из 360°.' : 'Подставь в правило именно дуги AB и CD.'],
    traps: t => hsMistakes(t).map(([n, cat]) => ({ key: String(n), html: hsNum(n), cat })),
  };
}
const TYPES = {
  arcs: {
    input: 'choice', title: 'Выбери дуги', options: [['abcd', 'AB и CD'], ['bcda', 'BC и DA'], ['acbd', 'AC и BD']],
    gen: rnd => { const mode = pick(rnd, ['inside', 'outside']); return { ...hsGen(rnd, mode), adj: mode === 'inside' && rnd() < .5 }; },
    bad: t => hsBad(t) || (t.mode === 'outside' && GEO.len(hsGeometry(t).P) < 1.65),
    text: t => `Какие две дуги нужны для нахождения выделенного угла ${t.adj ? 'BPC' : 'APB'}?`,
    ask: t => hsTaskFigure(t) + hsQ(TYPES.arcs.text(t)), sheet: t => TYPES.arcs.ask(t), ans: t => t.adj ? 'bcda' : 'abcd',
    key: t => t.adj ? 'BC и DA' : 'AB и CD', keyHTML: t => TYPES.arcs.key(t),
    ok: t => t.mode === 'outside' ? 'Стороны угла пересекают ближнюю дугу AB и дальнюю дугу CD. ∠APB = (дуга CD − дуга AB) : 2.' :
      `Нужны дуги между сторонами выделенного угла и вертикального ему: ${t.adj ? 'BC и DA' : 'AB и CD'}. ∠${t.adj ? 'BPC' : 'APB'} = (${t.adj ? 'дуга BC + дуга DA' : 'дуга AB + дуга CD'}) : 2.`,
    wrong: t => bad('arcs', `Ты выбрал дуги, не соответствующие сторонам выделенного угла. ${TYPES.arcs.ok(t)}`),
    hints: t => ['Начни с вершины P и проследи оба луча выделенного угла.', t.mode === 'inside' ? 'Найди ещё вертикальный угол: вторая дуга находится между его сторонами.' : 'На каждом луче отметь сначала ближнюю, затем дальнюю точку.'],
    traps: t => TYPES.arcs.options.filter(([k]) => k !== TYPES.arcs.ans(t)).map(([key, html]) => ({ key, html, cat: 'arcs' })),
  },
  inside: hsNumeric('Угол между хордами', 'inside'),
  outside: hsNumeric('Угол между секущими', 'outside'),
  insideArc: hsNumeric('Дуга по внутреннему углу', 'inside'),
  outsideArc: hsNumeric('Дуга по внешнему углу', 'outside', { inverse: true }),
  adjacent: hsNumeric('Смежный угол', 'inside'),
  threeArcs: hsNumeric('Три дуги окружности', 'inside'),
};
const CATS = {
  arcs: ['Выбор дуг', 'Проследи лучи угла до окружности; внутри найди также вертикальный угол.'],
  sumdiff: ['Сумма или разность', 'Внутри — полусумма; снаружи — полуразность дальней и ближней дуг.'],
  half: ['Половина суммы или разности', 'Градусные меры дуг сначала сложи или вычти, затем раздели на 2.'],
  adjacent: ['Смежный угол', 'Проверь буквы искомого угла. Сумма смежных углов равна 180°.'],
  inverse: ['Поиск неизвестной дуги', 'Чтобы перейти от угла к сумме или разности дуг, удвой угол.'],
  calc: ['Вычисления', 'Запиши формулу, подставь данные, выполни действия по порядку.'],
};
const SECTIONS = [
  { title: 'Выбери дуги', text: 'Найди две нужные дуги по сторонам угла', types: ['arcs'], ex: () => 'вершина внутри или снаружи; какие дуги нужны?', exText: true },
  { title: 'Найди угол', text: 'Хорды, секущие и смежный угол', types: ['inside', 'outside', 'adjacent'], ex: () => 'сначала положение вершины, затем правило', exText: true },
  { title: 'Найди дугу', text: 'Обратные задачи и сумма дуг 360°', types: ['insideArc', 'outsideArc', 'threeArcs'], ex: () => 'запиши связь между углом и дугами', exText: true },
];
// Совместимый состав ядра; в меню этой темы оставлена только самостоятельная.
const KINDS_V1 = [['inside'], ['outside'], ['insideArc'], ['outsideArc'], ['adjacent'], ['threeArcs']];
const WORDS_V1 = ['СЕКТОР', 'РАДИУС', 'ВЕКТОР'];
const TEST_V1 = { parts: KINDS_V1, points: [1, 1, 2, 2, 2, 2], grades: { 5: 9, 4: 7, 3: 5 } };
const PRINT = { instr: 'Найди угол или дугу. Запиши правило и вычисление. Все ответы — в градусах.',
  testInstr: 'P — пересечение AC и BD. Снаружи точки идут P–A–C и P–B–D. Запиши правило и вычисление; ответы в градусах — в таблицу. Всего 10 баллов.',
  about: 'Самостоятельная: 6 задач на готовых чертежах, 10 баллов. Запиши правило и вычисление. Ключ и шкала оценок восстанавливаются по номеру варианта.' };

function boardExample(random, old) {
  if (!random) return { a: CONFIG.board.a, b: CONFIG.board.b, gap: CONFIG.board.gap };
  const rnd = mulberry32((Math.random() * 4294967296) >>> 0);
  let e; do e = { a: int(rnd, 14, 18) * 10, b: int(rnd, 4, 6) * 10, gap: 70 }; while (e.a === old.a && e.b === old.b);
  return e;
}
const LIVE = {
  model: e => ({ mode: 'inside', a: e.a, b: e.b, gap: e.gap, rot: -20, adj: false }),
  fix(m) { for (const k of ['a', 'b', 'gap']) m[k] = Math.round(m[k] / 2) * 2; m.rot = GEO.clamp(m.rot, -20, 20); },
  ok: m => m.a >= 30 && m.b >= 24 && m.a <= 220 && m.b <= 170 && !hsBad(m),
};
function hsInsideHandle(k) {
  return m => ({ id: k, at: hsMapped(m, true)[k], label: `Точка ${k} на окружности`,
    move(m, p) {
      const g = hsMapped(m, true), old = hsGeometry(m).angles[k];
      let value = GEO.dirDeg(g.O, p); value = old + ((value - old + 540) % 360 - 180);
      value = Math.round(value / 2) * 2;
      if (k === 'B') { const a = value - m.rot; m.gap += m.a - a; m.a = a; }
      if (k === 'C') { const gap = value - m.rot - m.a; m.b += m.gap - gap; m.gap = gap; }
      if (k === 'D') m.b = value - m.rot - m.a - m.gap;
    },
    key(m, dx, dy) { const g = hsMapped(m, true), d = hsGeometry(m).angles[k] + 2 * (dx - dy); this.move(m, GEO.polar(g.O, d, g.r)); },
  });
}
const hsInsideHandles = m => ['B', 'C', 'D'].map(k => hsInsideHandle(k)(m));
const hsOutsideP = m => ({ id: 'P', at: hsMapped(m, true).P, label: 'Внешняя вершина P: ближе или дальше от окружности',
  move(m, p) {
    const g = hsMapped(m, true), q = GEO.turn(p, g.O, -m.rot), d = GEO.clamp((g.O.x - q.x) / g.r, 1.2, 2.6);
    m.b = GEO.clamp(4 * GEO.deg(Math.atan((d - 1) / (d + 1) * Math.tan(GEO.rad(m.a / 4)))), 24, m.a - 50);
  }, key(m, dx, dy) { m.b -= 2 * (dx - dy); },
});
const hsRange = (id, label, min, max, set = (m, v) => { m[id] = v; }) => ({ id, type: 'range', label, min, max, step: 2, get: m => m[id], set, text: m => hsDeg(m[id]) });
const hsTurn = hsRange('rot', 'Поворот чертежа', -20, 20);
function hsPanel(m, lines, adj = false) {
  const alpha = adj ? 180 - hsAlpha(m) : hsAlpha(m);
  return `<g class="hs-panel">${GEO.text(GEO.pt(650, 76), m.mode === 'inside' ? 'ВЕРШИНА ВНУТРИ' : 'ВЕРШИНА СНАРУЖИ', 'hs-caption', 'start')}` +
    lines.map((line, i) => GEO.text(GEO.pt(650, 135 + i * 49), line, 'hs-board-text', 'start')).join('') +
    GEO.text(GEO.pt(650, 346), `∠${adj ? 'BPC' : 'APB'} = ${hsDeg(alpha)}`, 'hs-result', 'start') + '</g>';
}
function buildSteps(e) {
  const inside = m => { Object.assign(m, { mode: 'inside', a: e.a, b: e.b, gap: e.gap, rot: -20, adj: false }); };
  const outside = m => { Object.assign(m, { mode: 'outside', a: e.a, b: e.b, gap: 0, rot: 0, adj: false }); };
  const insLive = { enter: inside, handles: hsInsideHandles, controls: () => [hsTurn] };
  const outLive = { enter: outside, handles: m => [hsOutsideP(m)], controls: () => [hsRange('a', 'Дальняя дуга CD', 130, 200), hsTurn] };
  const rule = m => m.mode === 'inside' ? [`AB + CD = ${hsDeg(m.a + m.b)}`, 'Половина суммы', `(${hsNum(m.a)} + ${hsNum(m.b)}) : 2`] :
    [`CD − AB = ${hsDeg(m.a - m.b)}`, 'Половина разности', `(${hsNum(m.a)} − ${hsNum(m.b)}) : 2`];
  return [
    { q: 'Можно ли назвать угол APB вписанным?', a: 'Нет: вершина P находится внутри окружности, а не на ней.',
      note: 'Повторите условие теоремы о вписанном угле. Двигайте B, C, D: P остаётся точкой пересечения хорд.', live: insLive,
      draw: (ph, m) => hsDrawing(m, { board: true, arcs: false, angle: ph ? hsDeg(hsAlpha(m)) : '?' }), rec: ph => ph ? ['Вершина вписанного угла лежит на окружности. Здесь P — внутри.'] : [] },
    { q: 'Какие две дуги связаны с углом APB?', a: 'Дуги AB и CD: одна между его сторонами, другая — между сторонами вертикального угла.',
      note: 'До показа ученик называет дуги. После показа проследите пары лучей PA, PB и PC, PD. Подвигайте концы хорд.', live: insLive,
      draw: (ph, m) => hsDrawing(m, { board: true, arcs: !!ph, angle: '?', vertical: !!ph }), rec: ph => ph ? ['Для ∠APB нужны дуги AB и CD.'] : [] },
    { q: 'Сложить дуги или вычесть? А нужно ли делить на 2?', a: m => hsSolution({ ...m, type: 'inside' }),
      note: 'Сначала прогноз. На ответе меняйте точки: угол на рисунке совпадает с половиной суммы дуг.', live: insLive,
      draw: (ph, m) => hsDrawing(m, { board: true, angle: ph ? hsDeg(hsAlpha(m)) : '?' }) + (ph ? hsPanel(m, rule(m)) : ''),
      rec: (ph, m) => ph ? [`∠APB = (дуга AB + дуга CD) : 2 = ${hsDeg(hsAlpha(m))}.`] : [] },
    { q: 'Одна дуга растёт, другая уменьшается на столько же. Что будет с углом?', a: 'Угол сохраняется: сумма двух дуг не меняется.',
      note: 'Назовите прогноз. «Показать ответ» меняет дуги с сохранением суммы; ползунок продолжает опыт вручную.',
      live: { enter: inside, reveal() { liveTo([{ a: e.a - 20, b: e.b + 20 }, { a: e.a + 10, b: e.b - 10 }], 1300); },
        controls: () => [hsRange('a', 'Дуга AB (сумма постоянна)', e.a - 30, e.a + 10, (m, v) => { m.a = v; m.b = e.a + e.b - v; })] },
      draw: (ph, m) => hsDrawing(m, { board: true, angle: ph ? hsDeg(hsAlpha(m)) : '?' }) + (ph ? hsPanel(m, rule(m)) : ''),
      rec: (ph, m) => ph ? [`AB + CD = ${hsDeg(e.a + e.b)} — постоянно; ∠APB = ${hsDeg(hsAlpha(m))}.`] : [] },
    { q: 'Почему получается именно полусумма дуг?', a: 'Проведём BC. Угол APB — внешний угол треугольника PBC: он равен сумме двух вписанных углов.',
      note: '∠PCB = ∠ACB — половина дуги AB; ∠PBC = ∠DBC — половина дуги CD. Выведите правило вместе с классом.', live: insLive,
      draw: (ph, m) => hsDrawing(m, { board: true, angle: ph ? hsDeg(hsAlpha(m)) : '?', aux: !!ph, proof: !!ph }) +
        (ph ? hsPanel(m, [`∠PCB = ${hsDeg(m.a / 2)}`, `∠PBC = ${hsDeg(m.b / 2)}`, 'Внешний угол: сумма']) : ''),
      rec: (ph, m) => ph ? [`∠APB = ∠PCB + ∠PBC = ${hsDeg(m.a / 2)} + ${hsDeg(m.b / 2)} = ${hsDeg(hsAlpha(m))}.`] : [] },
    { q: 'Угол BPC равен углу APB? Какие дуги нужны для него?', a: 'Это смежные углы. Для BPC нужны дуги BC и DA; сумма двух углов равна 180°.',
      note: 'Переключайте выделенный угол. Проследите смену дуг и проверьте, что сумма четырёх дуг — 360°.',
      live: { ...insLive, controls: () => [{ id: 'adj', type: 'toggle', label: 'Выделить смежный угол BPC', get: m => m.adj, set(m, v) { m.adj = v; } }] },
      draw: (ph, m) => hsDrawing(m, { board: true, adj: m.adj, angle: ph ? hsDeg(m.adj ? 180 - hsAlpha(m) : hsAlpha(m)) : '?' }) +
        (ph ? hsPanel(m, [`∠APB = ${hsDeg(hsAlpha(m))}`, `∠BPC = ${hsDeg(180 - hsAlpha(m))}`, 'Вместе — 180°'], m.adj) : ''),
      rec: (ph, m) => ph ? [`∠BPC = 180° − ∠APB = ${hsDeg(180 - hsAlpha(m))}.`] : [] },
    { q: 'Вершина теперь снаружи. Можно ли применить прежнее правило?', a: 'Условие изменилось. Для внешней вершины полусумма дуг не подходит.',
      note: 'Не переносите правило механически. Тяните P к окружности и от неё. A и B — ближние точки, C и D — дальние.', live: outLive,
      draw: (ph, m) => hsDrawing(m, { board: true, angle: ph ? hsDeg(hsAlpha(m)) : '?' }),
      rec: ph => ph ? ['P — снаружи. На лучах точки идут в порядке P–A–C и P–B–D.'] : [] },
    { q: 'Как получить угол из дальней и ближней дуг?', a: m => hsSolution({ ...m, type: 'outside' }),
      note: 'Сначала выберите дальнюю дугу CD и ближнюю AB. Вычитают градусные меры выделенных дуг, затем делят на 2.', live: outLive,
      draw: (ph, m) => hsDrawing(m, { board: true, angle: ph ? hsDeg(hsAlpha(m)) : '?' }) + (ph ? hsPanel(m, rule(m)) : ''),
      rec: (ph, m) => ph ? [`∠APB = (дуга CD − дуга AB) : 2 = ${hsDeg(hsAlpha(m))}.`] : [] },
    { q: 'Обе дуги увеличились на столько же. Что будет с внешним углом?', a: 'Угол сохраняется: разность дальней и ближней дуг не меняется.',
      note: 'Сравните с опытом внутри окружности. Здесь постоянна разность, а не сумма. Ползунок связан с обеими дугами.',
      live: { enter: outside, reveal() { liveTo([{ a: e.a + 20, b: e.b + 20 }, { a: e.a - 10, b: e.b - 10 }], 1300); },
        controls: () => [hsRange('a', 'Дальняя дуга CD (разность постоянна)', e.a - 10, e.a + 20, (m, v) => { m.a = v; m.b = v - e.a + e.b; })] },
      draw: (ph, m) => hsDrawing(m, { board: true, angle: ph ? hsDeg(hsAlpha(m)) : '?' }) + (ph ? hsPanel(m, rule(m)) : ''),
      rec: (ph, m) => ph ? [`CD − AB = ${hsDeg(e.a - e.b)} — постоянно; ∠APB = ${hsDeg(hsAlpha(m))}.`] : [] },
    { q: 'Почему снаружи появляется разность?', a: 'Проведём AD. Угол CAD — внешний угол треугольника PAD: ∠CAD = ∠APD + ∠PDA.',
      note: '∠CAD — половина дальней дуги CD; ∠PDA = ∠BDA — половина ближней дуги AB. Вычтите второй угол из первого.', live: outLive,
      draw: (ph, m) => hsDrawing(m, { board: true, angle: ph ? hsDeg(hsAlpha(m)) : '?', aux: !!ph, proof: !!ph }) +
        (ph ? hsPanel(m, [`∠CAD = ${hsDeg(m.a / 2)}`, `∠PDA = ${hsDeg(m.b / 2)}`, '∠APD = ∠CAD − ∠PDA']) : ''),
      rec: (ph, m) => ph ? [`∠APB = ${hsDeg(m.a / 2)} − ${hsDeg(m.b / 2)} = ${hsDeg(hsAlpha(m))}.`] : [] },
    { q: 'Одни и те же две дуги. Одинаковый ли ответ внутри и снаружи?', a: m => `Нет. Внутри: ${hsDeg((m.a + m.b) / 2)}. Снаружи: ${hsDeg((m.a - m.b) / 2)}. Сначала определи положение вершины.`,
      note: 'Переключайте положение вершины. Числа дуг сохраняются. Это контрпример к применению одного правила ко всем углам.',
      live: { enter: inside, controls: () => [{ id: 'mode', type: 'choice', label: 'Положение вершины P', options: [['inside', 'Внутри'], ['outside', 'Снаружи']], get: m => m.mode,
        set(m, v) { m.mode = v; m.rot = v === 'outside' ? 0 : -20; } }] },
      draw: (ph, m) => hsDrawing(m, { board: true, angle: ph ? hsDeg(hsAlpha(m)) : '?' }) + (ph ? hsPanel(m, rule(m)) : ''),
      rec: (ph, m) => ph ? [`Внутри: (${m.a} + ${m.b}) : 2 = ${hsDeg((m.a + m.b) / 2)}.`, `Снаружи: (${m.a} − ${m.b}) : 2 = ${hsDeg((m.a - m.b) / 2)}.`] : [] },
    { q: 'Сформулируй порядок решения задачи.', a: '1. Где вершина? 2. Какие дуги? 3. Полусумма или полуразность? 4. Проверь, какой угол требуется.',
      note: 'Класс формулирует правило без подсказки. Затем самостоятельная из шести задач; тренажёр — для закрепления.', live: insLive,
      draw: (ph, m) => hsDrawing(m, { board: true, angle: ph ? hsDeg(hsAlpha(m)) : '?' }) + (ph ? hsPanel(m, ['Внутри: (AB + CD) : 2', 'Снаружи: (CD − AB) : 2', 'Дуги — в градусах']) : ''),
      rec: ph => ph ? ['Внутри окружности — половина суммы нужных дуг.', 'Снаружи окружности — половина разности дальней и ближней дуг.'] : [] },
  ];
}
const BOARD = { previewUntil: 3, poster: 2 };
