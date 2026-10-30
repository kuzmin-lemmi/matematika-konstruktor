// Тема «Три признака равенства треугольников» (7 класс, Мерзляк и др.). Только содержание — каркас даёт ядро (core/).
// Что тема обязана задать — ИНСТРУКЦИЯ.md, раздел «Из чего состоит тема».

// ================= Параметры: учитель может поменять их за минуту =================
const CONFIG = {
  board: {
    a: 6, c: 9, p: 22,   // задача на доске: A₁B₁ = 6 см, B₁C₁ = 9 см, P(△A₁B₁C₁) = 22 см → A₁C₁ = 7 см
    previewDelay: 1900,  // превью на сайте: пауза между шагами, мс
  },
  print: {
    variants: 25,        // сколько вариантов печатать по умолчанию
    traps: 1,            // одна типичная ошибка на задание: таблица помещается и на половине A4
    space: false,        // задание — чертёж и короткая запись: сетка для решения по умолчанию не нужна
  },
  home: {
    round: 10,           // заданий в тренировке
    points: [10, 15, 20, 20],   // очки за задание по разделам
    hintPenalty: 3,      // штраф за подсказку
    maxMultiplier: 3,    // множитель за серию: +1 за каждые 3 задания подряд без ошибок
  },
};
// Версия генератора — первая часть номера варианта «1-4817». Изменил генератор или состав
// заданий раздатки — увеличь версию и оставь старую ветку, пока на неё есть напечатанные листы.
const GEN_VERSION = 1;

// ================= Чертёжные помощники =================
// Модель отдельно от рисунка: точки фигуры — в экранных координатах SVG, все числа — в задании.
const rad = d => d * Math.PI / 180;
const f1 = n => Math.round(n * 10) / 10;
const pt = (x, y) => ({ x, y });
const dist = (p, q) => Math.hypot(q.x - p.x, q.y - p.y);
const midP = (p, q) => pt((p.x + q.x) / 2, (p.y + q.y) / 2);
const udir = (p, q) => { const d = dist(p, q) || 1; return pt((q.x - p.x) / d, (q.y - p.y) / d); };
const centroid = T => pt((T.A.x + T.B.x + T.C.x) / 3, (T.A.y + T.B.y + T.C.y) / 3);
// отражение точки относительно прямой AB (наложение «переворотом»)
function refl(P, A, B) {
  const dx = B.x - A.x, dy = B.y - A.y, k = dx * dx + dy * dy || 1;
  const t = ((P.x - A.x) * dx + (P.y - A.y) * dy) / k;
  const fx = A.x + t * dx, fy = A.y + t * dy;
  return pt(2 * fx - P.x, 2 * fy - P.y);
}
// пересечение прямых p1q1 и p2q2
function crossPt(p1, q1, p2, q2) {
  const d1 = { x: q1.x - p1.x, y: q1.y - p1.y }, d2 = { x: q2.x - p2.x, y: q2.y - p2.y };
  const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / (d1.x * d2.y - d1.y * d2.x);
  return pt(p1.x + t * d1.x, p1.y + t * d1.y);
}
// точки пересечения луча V + t·u (t > 0) с окружностью (C, R)
function rayCircle(V, u, C, R) {
  const w = { x: C.x - V.x, y: C.y - V.y };
  const b = w.x * u.x + w.y * u.y, c = w.x * w.x + w.y * w.y - R * R;
  const disc = b * b - c;
  if (disc < 0) return [];
  const sq = Math.sqrt(disc);
  return [b - sq, b + sq].filter(t => t > 0).map(t => pt(V.x + t * u.x, V.y + t * u.y));
}
// имя вершины в SVG: 'A1' → A с подстрочной 1
function vname(s) {
  let out = '', down = false;
  for (const ch of s) {
    if (ch >= '0' && ch <= '9') { out += `<tspan${down ? '' : ' dy="7"'} class="sub">${ch}</tspan>`; down = true; }
    else { out += down ? `<tspan dy="-7">${ch}</tspan>` : ch; down = false; }
  }
  return out;
}
// имя в HTML: 'A1B1' → A<sub>1</sub>B<sub>1</sub>
const hname = s => String(s).replace(/\d/g, d => `<sub>${d}</sub>`);
const triPath = T => `M${f1(T.A.x)} ${f1(T.A.y)}L${f1(T.B.x)} ${f1(T.B.y)}L${f1(T.C.x)} ${f1(T.C.y)}Z`;
const segln = (p, q, cls = 'side') => `<line class="${cls}" x1="${f1(p.x)}" y1="${f1(p.y)}" x2="${f1(q.x)}" y2="${f1(q.y)}"/>`;
const taskSVG = (w, h, inner) => `<svg class="tdraw" viewBox="0 0 ${w} ${h}" role="img" aria-label="Чертёж к заданию">${inner}</svg>`;
// штрихи равенства на отрезке: n черточек перпендикулярно середине
function ticksMark(p, q, n, cls = 'tick') {
  const d = udir(p, q), m = midP(p, q), px = pt(-d.y, d.x), gap = 12, len = 8;
  let s = '';
  for (let i = 0; i < n; i++) {
    const o = (i - (n - 1) / 2) * gap, c = pt(m.x + d.x * o, m.y + d.y * o);
    s += `<line class="${cls}" x1="${f1(c.x - px.x * len)}" y1="${f1(c.y - px.y * len)}" x2="${f1(c.x + px.x * len)}" y2="${f1(c.y + px.y * len)}"/>`;
  }
  return s;
}
// дужки равенства угла при вершине V (между лучами на A и на B): n дужек по меньшему углу
function arcsMark(V, A, B, n, r0 = 17, cls = 'arc') {
  const a1 = Math.atan2(A.y - V.y, A.x - V.x), a2 = Math.atan2(B.y - V.y, B.x - V.x);
  let d = a2 - a1;
  while (d < 0) d += 2 * Math.PI;
  while (d >= 2 * Math.PI) d -= 2 * Math.PI;
  const [s, e] = d <= Math.PI ? [a1, a1 + d] : [a2, a2 + 2 * Math.PI - d];
  let out = '';
  for (let i = 0; i < n; i++) {
    const r = r0 + i * 8;
    const p1 = pt(V.x + r * Math.cos(s), V.y + r * Math.sin(s));
    const p2 = pt(V.x + r * Math.cos(e), V.y + r * Math.sin(e));
    out += `<path class="${cls}" d="M${f1(p1.x)} ${f1(p1.y)}A${r} ${r} 0 0 1 ${f1(p2.x)} ${f1(p2.y)}"/>`;
  }
  return out;
}
// подпись вершины со смещением
const vlab = (p, dx, dy, name, cls = 'vl') =>
  `<text class="${cls}" x="${f1(p.x + dx)}" y="${f1(p.y + dy)}" text-anchor="middle">${vname(name)}</text>`;
// подпись у середины стороны, снаружи от вершины opp
function segLab(p, q, opp, s, r = 19, cls = 'num') {
  const d = udir(p, q), m = midP(p, q), px = pt(-d.y, d.x);
  const out = ((m.x - opp.x) * px.x + (m.y - opp.y) * px.y) > 0 ? 1 : -1;
  const c = pt(m.x + px.x * r * out, m.y + px.y * r * out);
  return `<text class="${cls}" x="${f1(c.x)}" y="${f1(c.y + 8)}" text-anchor="middle">${s}</text>`;
}
// дуга окружности с центром C от направления на P1 до направления на P2 (по меньшему сектору)
function arcSeg(C, P1, P2, R, cls) {
  const a1 = Math.atan2(P1.y - C.y, P1.x - C.x), a2 = Math.atan2(P2.y - C.y, P2.x - C.x);
  let d = a2 - a1;
  while (d < 0) d += 2 * Math.PI;
  while (d >= 2 * Math.PI) d -= 2 * Math.PI;
  const [s, e] = d <= Math.PI ? [a1, a1 + d] : [a2, a2 + 2 * Math.PI - d];
  const p1 = pt(C.x + R * Math.cos(s), C.y + R * Math.sin(s));
  const p2 = pt(C.x + R * Math.cos(e), C.y + R * Math.sin(e));
  return `<path class="${cls}" d="M${f1(p1.x)} ${f1(p1.y)}A${f1(R)} ${f1(R)} 0 0 1 ${f1(p2.x)} ${f1(p2.y)}"/>`;
}

// ================= Сценарии признаков =================
// Равные пары: стороны — одинаковое число штрихов, углы — одинаковое число дужек.
const SIDE_N = { AB: ['AB', 'A1B1'], BC: ['BC', 'B1C1'], CA: ['CA', 'C1A1'], AC: ['AC', 'A1C1'] };
const ANG_N = { A: ['∠A', '∠A1'], B: ['∠B', '∠B1'], C: ['∠C', '∠C1'] };
const pairH = (x, y) => `${hname(x)} = ${hname(y)}`;
const sidePair = sd => pairH(...SIDE_N[sd]);
const angPair = vx => pairH(...ANG_N[vx]);
const SIGN_WORD = { 1: 'первый', 2: 'второй', 3: 'третий' };
const SIGN_DAT = { 1: 'первому', 2: 'второму', 3: 'третьему' };
const SIGN_GEN = { 1: 'первого', 2: 'второго', 3: 'третьего' };
const SIGN_SHORT = {
  1: 'две стороны и угол между ними',
  2: 'сторона и два прилежащих к ней угла',
  3: 'три стороны',
};
// kind: s1 — стороны при вершине v + угол v (первый признак); s2 — сторона v + два прилежащих угла (второй);
// s3 — три стороны (третий); ssa — стороны при A и угол v, который не лежит между ними; aaa — все три угла.
// Возвращает { ticks: [[сторона, n]], arcs: [[вершина, n]], elems: [строки-пары], why: объяснение }
function scen(kind, v) {
  const S = { ticks: [], arcs: [], elems: [], why: '' };
  if (kind === 's1') {
    const sides = v === 'A' ? ['AB', 'AC'] : v === 'B' ? ['AB', 'BC'] : ['AC', 'BC'];
    sides.forEach((sd, i) => { S.ticks.push([sd, i + 1]); S.elems.push(sidePair(sd)); });
    S.arcs.push([v, 1]);
    S.elems.push(`${angPair(v)} — угол между ними`);
    S.why = `Отмечены две пары сторон и угол между ними: ${S.elems.join('; ')} — это первый признак, треугольники равны.`;
  } else if (kind === 's2') {
    const [x, y] = { AB: ['A', 'B'], BC: ['B', 'C'], CA: ['C', 'A'] }[v];
    S.ticks.push([v, 1]);
    S.elems.push(sidePair(v));
    S.arcs.push([x, 1], [y, 2]);
    S.elems.push(`${angPair(x)} и ${angPair(y)} — оба прилежат к стороне`);
    S.why = `Отмечены сторона и два прилежащих к ней угла: ${S.elems.join('; ')} — это второй признак, треугольники равны.`;
  } else if (kind === 's3') {
    [['AB', 1], ['BC', 2], ['CA', 3]].forEach(([sd, n]) => { S.ticks.push([sd, n]); S.elems.push(sidePair(sd)); });
    S.why = `Отмечены все три пары сторон: ${S.elems.join('; ')} — это третий признак, треугольники равны.`;
  } else if (kind === 'ssa') {
    S.ticks.push(['AB', 1], ['AC', 2]);
    S.elems.push(sidePair('AB'), sidePair('AC'), angPair(v));
    const near = v === 'B' ? 'AB' : 'AC';
    S.why = `Отмечены ${sidePair('AB')}, ${sidePair('AC')} и ${angPair(v)}. Но ∠${v} прилежит только к стороне ${near} — он не лежит между данными сторонами. Признака «две стороны и угол не между ними» нет: по такому условию можно построить два разных треугольника.`;
  } else {
    S.arcs.push(['A', 1], ['B', 2], ['C', 3]);
    S.elems.push(angPair('A'), angPair('B'), angPair('C'));
    S.why = `Отмечены только углы: ${S.elems.join('; ')}. По трём углам равенство не доказано: форма одна, а размер может быть разным — на чертеже треугольники даже разного размера.`;
  }
  return S;
}
const SIGN_OF = { s1: 1, s2: 2, s3: 3, ssa: 0, aaa: 0 };

// два треугольника с отметками (задания в тренажёре и на листе), viewBox 660 × 260
function pairSVG(S, scale2 = 1) {
  const T1 = { A: pt(130, 62), B: pt(48, 225), C: pt(267, 225) };
  const B2 = { A: pt(530, 62), B: pt(612, 225), C: pt(393, 225) };
  let T2 = B2;
  if (scale2 !== 1) {
    const g = centroid(B2);
    T2 = {};
    for (const k of ['A', 'B', 'C']) T2[k] = pt(g.x + (B2[k].x - g.x) * scale2, g.y + (B2[k].y - g.y) * scale2);
  }
  const rays = { A: ['B', 'C'], B: ['A', 'C'], C: ['A', 'B'] };
  let s = `<path class="side" d="${triPath(T1)}"/><path class="side" d="${triPath(T2)}"/>`;
  s += vlab(T1.A, -2, -26, 'A') + vlab(T1.B, -24, 10, 'B') + vlab(T1.C, 22, 10, 'C');
  s += vlab(T2.A, 2, -26, 'A1') + vlab(T2.B, 24, 20, 'B1') + vlab(T2.C, -24, 20, 'C1');
  const ENDS = { AB: ['A', 'B'], BC: ['B', 'C'], CA: ['C', 'A'], AC: ['A', 'C'] };
  for (const [sd, n] of S.ticks) {
    const [p, q] = ENDS[sd];
    s += ticksMark(T1[p], T1[q], n) + ticksMark(T2[p], T2[q], n);
  }
  for (const [vx, n] of S.arcs) {
    const [p, q] = rays[vx];
    s += arcsMark(T1[vx], T1[p], T1[q], n) + arcsMark(T2[vx], T2[p], T2[q], n);
  }
  return taskSVG(660, 260, s);
}

// ================= Типы заданий =================
// input: choice — выбор (options), num — число. Чертёж — в ask (тренажёр) и sheet (лист).
const bad = (cat, msg) => ({ cat, msg });
const SIGN_OPTS = [['1', 'Первый'], ['2', 'Второй'], ['3', 'Третий'], ['none', 'Не доказано']];

// сколько-условие-добавить: сценарии { p, sides, angs } + ловушки с объяснениями
const ENOUGH_SC = [
  { p: 1, sides: ['AB'], angs: ['A'], wrongs: {
    'BC = B1C1': ['ssa', 'Сторона BC не прилежит к углу A: вместе с AB она даст угол не между сторонами — так равенство не доказать. Нужна вторая сторона при ∠A.'],
    '∠B = ∠B1': ['which', '∠B прилежит к стороне AB — вместе получится сторона и два угла, это путь второго признака. Для первого нужна вторая сторона при ∠A.'] } },
  { p: 1, sides: ['AB', 'BC'], angs: [], wrongs: {
    'AC = A1C1': ['which', 'С тремя парами сторон получится третий признак. Для первого нужен угол между AB и BC.'],
    '∠A = ∠A1': ['ssa', '∠A прилежит только к стороне AB, между AB и BC он не лежит. Для первого признака нужен угол при общей вершине B.'] } },
  { p: 2, sides: ['AC'], angs: ['A'], wrongs: {
    '∠B = ∠B1': ['inc', '∠B не прилежит к стороне AC. Во втором признаке оба угла лежат при стороне: нужен ∠C.'],
    'AB = A1B1': ['which', 'Вторая сторона при ∠A — это путь к первому признаку. Для второго нужен второй угол при стороне AC.'] } },
  { p: 3, sides: ['AB', 'AC'], angs: [], wrongs: {
    '∠A = ∠A1': ['which', 'С ∠A получится первый признак: угол между AB и AC уже есть. Для третьего нужна третья пара сторон.'],
    '∠B = ∠B1': ['which', 'Углы третьему признаку не нужны: он требует только стороны — не хватает третьей пары.'] } },
  { p: 3, sides: ['AB', 'BC'], angs: [], wrongs: {
    '∠B = ∠B1': ['which', '∠B лежит между AB и BC: с ним получится первый признак. Для третьего нужна третья пара сторон.'],
    '∠C = ∠C1': ['which', 'Углы третьему признаку не нужны: не хватает третьей пары сторон.'] } },
];
// какого условия не хватает — вычисляется по данным сценария (эта же логика, независимо, — в тесте сайта)
function enoughRight(sc) {
  const prime = s => s.replace(/[ABC]/g, ch => ch + '1');
  if (sc.p === 1) {
    if (sc.sides.length === 2) {
      const v = ['A', 'B', 'C'].find(ch => sc.sides.every(sd => sd.includes(ch)));
      return `∠${v} = ∠${v}1`;
    }
    const vx = sc.angs[0], sd = sc.sides[0];
    const other = { A: sd === 'AB' ? 'AC' : 'AB', B: sd === 'AB' ? 'BC' : 'AB', C: sd === 'AC' ? 'BC' : 'AC' }[vx];
    return `${other} = ${prime(other)}`;
  }
  if (sc.p === 2) {
    const sd = sc.sides[0], vx = sc.angs[0];
    const other = sd.replace(vx, '');
    return `∠${other} = ∠${other}1`;
  }
  const missing = ['AB', 'BC', 'AC'].find(s => !sc.sides.includes(s));
  return `${missing} = ${prime(missing)}`;
}
// данные — строкой с парами
function enoughGiven(t) {
  return t.sides.map(sd => sidePair(sd)).concat(t.angs.map(vx => angPair(vx))).join(', ');
}
function enoughSVG(t) {
  return pairSVG({ ticks: t.sides.map((sd, i) => [sd, i + 1]), arcs: t.angs.map((vx, i) => [vx, i + 1]) });
}

const TYPES = {
  // по чертежу определить, по какому признаку равны треугольники
  which: {
    input: 'choice', title: 'Какой признак?', oral: true, options: SIGN_OPTS,
    gen: rnd => {
      const kind = pick(rnd, ['s1', 's2', 's3']);
      const v = kind === 's1' ? pick(rnd, ['A', 'B', 'C']) : kind === 's2' ? pick(rnd, ['AB', 'BC', 'CA']) : '';
      return { kind, v };
    },
    text: t => `По какому признаку равны △ABC и ${hname('△A1B1C1')}?`,
    ask: t => pairSVG(scen(t.kind, t.v)) + `<p class="tq">По какому признаку равны △ABC и ${hname('△A1B1C1')}?</p>`,
    sheet: t => pairSVG(scen(t.kind, t.v)) + '<p class="tq">Назови признак: первый, второй или третий.</p>',
    answer: t => `По ${SIGN_DAT[SIGN_OF[t.kind]]} признаку`,
    ans: t => String(SIGN_OF[t.kind]),
    ok: t => scen(t.kind, t.v).why,
    wrong(t, x) {
      const S = scen(t.kind, t.v), sign = SIGN_OF[t.kind];
      const fix = {
        s1: { 2: 'Второй признак — сторона и два прилежащих угла, а здесь углов только один. ', 3: 'Третий признак — три пары сторон, а на чертеже их две. ', none: 'Равенство здесь доказано: ' },
        s2: { 1: 'Первый признак — две стороны и угол между ними, а на чертеже сторона одна и два угла. ', 3: 'Третий признак — три пары сторон, а на чертеже одна. ', none: 'Равенство здесь доказано: ' },
        s3: { 1: 'Первый признак требует угол между сторонами, а на чертеже углов нет. ', 2: 'Второй признак — сторона и два угла, а на чертеже только стороны. ', none: 'Равенство здесь доказано: ' },
      };
      return bad('which', `${fix[t.kind][x] || 'Сверь отмеченные элементы с формулировкой признака. '}${S.why}`);
    },
    key: t => SIGN_WORD[SIGN_OF[t.kind]],
    keyHTML: t => SIGN_WORD[SIGN_OF[t.kind]],
    traps: t => Object.values(SIGN_WORD).concat(['не доказано'])
      .filter(w => w !== SIGN_WORD[SIGN_OF[t.kind]]).map(w => ({ key: w, html: w })),
    hints: t => {
      const S = scen(t.kind, t.v);
      return ['Штрихи — равные пары сторон, дужки — равные пары углов. Посчитай, что отмечено на чертеже.',
        `Отмечены: ${S.elems.join('; ')}. Две стороны и угол между ними — первый, сторона и два прилежащих угла — второй, три стороны — третий.`];
    },
  },
  // ловушки: признак не работает (угол не между сторонами; только углы)
  trap: {
    input: 'choice', title: 'Ловушка: признак не работает', options: SIGN_OPTS,
    gen: rnd => {
      const kind = pick(rnd, ['ssa', 'aaa']);
      return { kind, v: kind === 'ssa' ? pick(rnd, ['B', 'C']) : '' };
    },
    text: t => `Равны ли △ABC и ${hname('△A1B1C1')}?`,
    ask: t => pairSVG(scen(t.kind, t.v), t.kind === 'aaa' ? 0.7 : 1) +
      `<p class="tq">По какому признаку равны △ABC и ${hname('△A1B1C1')}?</p>`,
    sheet: t => pairSVG(scen(t.kind, t.v), t.kind === 'aaa' ? 0.7 : 1) +
      '<p class="tq">По какому признаку равны эти треугольники? (первый / второй / третий / не доказано)</p>',
    answer: t => 'Равенство не доказано',
    ans: () => 'none',
    ok: t => `Верно: ${scen(t.kind, t.v).why}`,
    wrong(t, x) {
      const S = scen(t.kind, t.v);
      if (t.kind === 'ssa' && x === '1')
        return bad('ssa', `Ты применил первый признак, но для него угол должен лежать между данными сторонами. ${S.why}`);
      if (t.kind === 'ssa' && x === '2')
        return bad('which', `Второй признак — сторона и два прилежащих угла: на чертеже сторон две, а угол один. ${S.why}`);
      if (t.kind === 'ssa')
        return bad('which', `Третий признак — три пары сторон: на чертеже их две. ${S.why}`);
      return bad('aaa', `Признака «по трём углам» нет: ${S.why}`);
    },
    key: () => 'не доказано',
    keyHTML: () => 'не доказано',
    traps: () => Object.values(SIGN_WORD).map(v => ({ key: v, html: v })),
    hints: t => ['Посмотри, ГДЕ лежит отмеченный угол: между данными сторонами или рядом с одной из них?',
      t.kind === 'ssa' ? 'Угол не лежит между отмеченными сторонами — хватит ли этого для признака?' : 'Стороны не отмечены вовсе. Может ли размер треугольников отличаться?'],
  },
  // какое условие добавить, чтобы работал N-й признак (только тренажёр)
  enough: {
    input: 'enoughIn', title: 'Какого условия не хватает',
    gen: rnd => {
      const sc = pick(rnd, ENOUGH_SC);
      const right = enoughRight(sc);
      const opts = shuffle(rnd, [right, ...Object.keys(sc.wrongs)]).map(k => [k, hname(k)]);
      return { p: sc.p, sides: sc.sides, angs: sc.angs, right, opts, wrongs: sc.wrongs };
    },
    text: t => `Какое условие добавить для ${SIGN_GEN[t.p]} признака?`,
    ask: t => enoughSVG(t) +
      `<p class="tq">Дано: ${enoughGiven(t)}. Какое условие добавить, чтобы непосредственно применить ${SIGN_WORD[t.p]} признак по его формулировке?</p>`,
    answer: t => `Добавить: ${hname(t.right)}`,
    ans: t => t.right,
    same: (t, x) => x === t.right,
    wrongInput: t => Object.keys(t.wrongs)[0],
    ok: t => `${SIGN_WORD[t.p][0].toUpperCase()}${SIGN_WORD[t.p].slice(1)} признак: ${SIGN_SHORT[t.p]}. Дано: ${enoughGiven(t)}. Не хватает: ${hname(t.right)}.`,
    wrong(t, x) {
      const w = t.wrongs[x];
      if (w) return bad(w[0], `${w[1]} ${TYPES.enough.ok(t)}`);
      return bad('which', TYPES.enough.ok(t));
    },
    key: t => t.right,
    keyHTML: t => hname(t.right),
    traps: t => Object.keys(t.wrongs).map(k => ({ key: k, html: hname(k) })),
    hints: t => [`Вспомни ${SIGN_WORD[t.p]} признак: ${SIGN_SHORT[t.p]}. Что из этого уже есть на чертеже?`,
      `Есть: ${enoughGiven(t)}. Признак требует ${SIGN_SHORT[t.p]} — посмотри, какой пары не хватает.`],
  },
  // задача на готовом чертеже: найти сторону через признак и периметр
  xside: {
    input: 'num', title: 'Найти сторону',
    gen: (rnd, form) => {
      const f = form === 'commonProof' ? 'common' : form || pick(rnd, ['common', 'cross', 'twins']);
      const a1 = int(rnd, 4, 12), a2 = int(rnd, 4, 12);
      let d; do d = int(rnd, 5, 15); while (d === a1 || d === a2);
      return { form: f, a1, a2, d, p: a1 + a2 + d, explain: form === 'commonProof' };
    },
    bad: t => t.a1 === t.a2 || t.d === t.a1 || t.d === t.a2 || t.p > 40 ||
      2 * Math.max(t.a1, t.a2, t.d) >= t.p,
    quest: { common: 'Найдите CD', cross: 'Найдите CD', twins: 'Найдите BC' },
    text: t => `${TYPES.xside.quest[t.form]} (в см)`,
    ask: t => xsideSVG(t) + `<p class="tq">${TYPES.xside.quest[t.form]} (в см). Ответ — число.</p>`,
    sheet: t => xsideSVG(t) + `<p class="tq">${t.form === 'twins' ? 'BC' : 'CD'} = ? см.${t.explain ? ' Запиши в тетради 3 равенства и признак.' : ''}</p>`,
    answer: t => `${t.form === 'twins' ? 'BC' : 'CD'} = ${t.p - t.a1 - t.a2} см`,
    ans: t => Q(t.p - t.a1 - t.a2),
    ok: t => {
      const { a1, a2, d, p } = t;
      if (t.form === 'common')
        return `AD = P − AB − BD = ${p} − ${a1} − ${a2} = ${d} см. △ABD = △CBD по первому признаку: AB = CB, ∠ABD = ∠CBD, BD — общая. Соответственные стороны равны: CD = AD = ${d} см.`;
      if (t.form === 'cross')
        return `AB = P − AO − BO = ${p} − ${a1} − ${a2} = ${d} см. △AOB = △COD по первому признаку: AO = OC, BO = OD, ∠AOB = ∠COD — вертикальные. Соответственные стороны равны: CD = AB = ${d} см.`;
      return `${hname('B1C1')} = P − ${hname('A1B1')} − ${hname('A1C1')} = ${p} − ${a1} − ${a2} = ${d} см. △ABC = ${hname('△A1B1C1')} по первому признаку: AB = ${hname('A1B1')}, AC = ${hname('A1C1')}, ∠A = ${hname('∠A1')} — угол между ними. Соответственные стороны равны: BC = ${hname('B1C1')} = ${d} см.`;
    },
    wrong(t, x) {
      const ok = TYPES.xside.ok(t);
      if (qeq(x, Q(t.a1)) || qeq(x, Q(t.a2)))
        return bad('pair', `Искомая сторона равна не данной, а соответственной стороне равного треугольника — сначала найди третью сторону из периметра. ${ok}`);
      if (qeq(x, Q(t.p - t.a1)) || qeq(x, Q(t.p - t.a2)))
        return bad('per', `Периметр — сумма трёх сторон: из ${t.p} вычитаем обе данные стороны, ${t.a1} и ${t.a2}. ${ok}`);
      return bad('calc', `Проверь вычитание: ${t.p} − ${t.a1} − ${t.a2} = ${t.p - t.a1 - t.a2}. ${ok}`);
    },
    traps: t => {
      const d = t.p - t.a1 - t.a2;
      return [t.a1, t.a2, t.p - t.a1, t.p - t.a2].filter((x, i, arr) => x !== d && x > 0 && arr.indexOf(x) === i)
        .map(x => ({ key: keyQ(Q(x)), html: htmlQ(Q(x)) }));
    },
    hints: t => ['Найди сначала третью сторону того треугольника, у которого известен периметр: из P вычти обе данные стороны.',
      `Получилось ${t.p} − ${t.a1} − ${t.a2} = ${t.p - t.a1 - t.a2} — это сторона равного треугольника, а искомая равна ей по признаку.`],
  },
  // периметр равного треугольника (треугольники на общем чертеже)
  perv: {
    input: 'num', title: 'Периметр равного треугольника',
    gen: rnd => {
      const a1 = int(rnd, 3, 11), a2 = int(rnd, 4, 12);
      let d; do d = int(rnd, 5, 13); while (d === a1 || d === a2);
      return { a1, a2, d };
    },
    bad: t => t.a1 === t.a2 || t.d === t.a1 || t.d === t.a2 || t.a1 + t.a2 + t.d > 35 ||
      2 * Math.max(t.a1, t.a2, t.d) >= t.a1 + t.a2 + t.d,
    text: t => 'Найдите P(△CBD) (в см)',
    ask: t => pervSVG(t) + '<p class="tq">Найдите периметр △CBD (в см). Ответ — число.</p>',
    sheet: t => pervSVG(t) + '<p class="tq">P(△CBD) = ? см.</p>',
    answer: t => `P(△CBD) = ${t.a1 + t.a2 + t.d} см`,
    ans: t => Q(t.a1 + t.a2 + t.d),
    ok: t => `△ABD = △CBD по первому признаку: AB = CB, ∠ABD = ∠CBD, BD — общая. Соответственные стороны равны: CB = AB = ${t.a1} см, CD = AD = ${t.d} см, BD — общая = ${t.a2} см. P(△CBD) = ${t.a1} + ${t.d} + ${t.a2} = ${t.a1 + t.a2 + t.d} см.`,
    wrong(t, x) {
      const ok = TYPES.perv.ok(t), S = t.a1 + t.a2 + t.d;
      if (qeq(x, Q(S - t.a1)) || qeq(x, Q(S - t.a2)) || qeq(x, Q(S - t.d)))
        return bad('per', `Периметр — сумма всех трёх сторон: ты сложил только две. ${ok}`);
      return bad('calc', `Проверь сложение: ${t.a1} + ${t.d} + ${t.a2} = ${S}. ${ok}`);
    },
    traps: t => {
      const S = t.a1 + t.a2 + t.d;
      return [t.a1 + t.a2, t.a1 + t.d, t.a2 + t.d].filter(x => x !== S)
        .map(x => ({ key: keyQ(Q(x)), html: htmlQ(Q(x)) }));
    },
    hints: t => ['Треугольники равны: у второго все стороны такие же, как у первого. Сложи три стороны △ABD.',
      `Стороны △CBD: ${t.a1}, ${t.d} и ${t.a2} см. Сложи их.`],
  },
  proof: {
    input: 'enoughIn', title: 'Дополнить доказательство',
    gen: rnd => {
      const form = pick(rnd, ['common', 'cross', 'second', 'third']);
      const data = PROOFS[form];
      return { form, right: data.right, opts: shuffle(rnd, data.opts) };
    },
    text: () => 'Выбери пропущенное обоснование в доказательстве.',
    ask: t => proofSVG(t.form) + `<p class="tq">${PROOFS[t.form].given}</p><p class="tq">${PROOFS[t.form].gap}</p>`,
    ans: t => PROOFS[t.form].right,
    same: (t, x) => x === PROOFS[t.form].right,
    wrongInput: t => t.opts.find(([v]) => v !== t.right)[0],
    key: t => PROOFS[t.form].right,
    keyHTML: t => PROOFS[t.form].opts.find(([v]) => v === PROOFS[t.form].right)[1],
    answer: t => PROOFS[t.form].solution,
    ok: t => PROOFS[t.form].solution,
    wrong: t => bad('proof', `Обоснование должно следовать из условия или свойства фигуры. ${PROOFS[t.form].solution}`),
    hints: t => ['Сначала выпиши данные равенства. Ищи общую сторону или вертикальные углы, затем назови признак.', PROOFS[t.form].solution],
    traps: t => t.opts.filter(([v]) => v !== t.right).map(([key, html]) => ({ key, html })),
  },
  correspond: {
    input: 'enoughIn', title: 'Порядок соответственных вершин',
    gen: rnd => {
      const names = shuffle(rnd, ['M', 'K', 'N']);
      const right = names.join('');
      const orders = permutations(names).filter(s => s !== right);
      const opts = shuffle(rnd, [right, ...shuffle(rnd, orders).slice(0, 2)])
        .map(s => [s, `△ABC = △${s}`]);
      return { names, opts };
    },
    text: () => 'Запиши равенство треугольников в верном порядке.',
    ask: t => correspondSVG(t) + '<p class="tq">Треугольники равны. Выбери запись с правильным порядком соответственных вершин.</p>',
    ans: t => t.names.join(''),
    same: (t, x) => x === t.names.join(''),
    wrongInput: t => t.opts.find(([v]) => v !== t.names.join(''))[0],
    key: t => t.names.join(''),
    keyHTML: t => `△ABC = △${t.names.join('')}`,
    answer: t => `△ABC = △${t.names.join('')}`,
    ok: t => correspondenceReason(t),
    wrong: t => bad('pair', `Ты сопоставил вершины по положению на рисунке. Смотри на штрихи сторон. ${correspondenceReason(t)}`),
    hints: t => ['Вершина A соединяет стороны с одним и тремя штрихами. Найди такую же вершину справа.', correspondenceReason(t)],
    traps: t => t.opts.filter(([v]) => v !== t.names.join('')).map(([key, html]) => ({ key, html })),
  },
  certainty: {
    input: 'choice', title: 'Какой вывод доказан?',
    options: [['yes', 'Треугольники равны'], ['no', 'Треугольники не равны'], ['unknown', 'Данных недостаточно']],
    gen: rnd => ({ kind: pick(rnd, ['s1', 'ssa', 'aaa', 'different']), v: pick(rnd, ['B', 'C']) }),
    text: () => 'Какой вывод следует из данных?',
    ask: t => pairSVG(scen(t.kind === 'different' ? 'aaa' : t.kind, t.kind === 's1' ? 'A' : t.v), t.kind === 'different' ? 0.75 : t.kind === 'aaa' ? 0.7 : 1) +
      `<p class="tq">${t.kind === 'different' ? `P(△ABC) = 24 см, P(${hname('△A1B1C1')}) = 18 см. ` : ''}Какой вывод следует из данных?</p>`,
    ans: t => t.kind === 's1' ? 'yes' : t.kind === 'different' ? 'no' : 'unknown',
    key: t => t.kind === 's1' ? 'yes' : t.kind === 'different' ? 'no' : 'unknown',
    keyHTML: t => t.kind === 's1' ? 'равны' : t.kind === 'different' ? 'не равны' : 'данных недостаточно',
    answer: t => TYPES.certainty.keyHTML(t),
    ok: t => certaintyReason(t),
    wrong: (t, x) => bad('certainty', `${x === 'no' && !['s1', 'different'].includes(t.kind) ? '«Не доказано» не означает «не равны». ' : ''}${certaintyReason(t)}`),
    hints: t => ['Чтобы сказать «равны», нужен признак; чтобы сказать «не равны», нужно противоречие равенству. Иначе данных недостаточно.', certaintyReason(t)],
    traps: t => TYPES.certainty.options.filter(([v]) => v !== TYPES.certainty.ans(t)).map(([key, html]) => ({ key, html })),
  },
  reasoning: {
    input: 'proofBuild', title: 'Собрать доказательство',
    gen: rnd => {
      const form = pick(rnd, ['common', 'cross', 'second', 'third']);
      return { form, facts: shuffle(rnd, BUILD_PROOF[form].facts) };
    },
    text: () => 'Заверши доказательство: равенство, причина, признак и вывод.',
    ask: t => proofSVG(t.form) + `<p class="tq">${PROOFS[t.form].given}</p><p class="tq">${BUILD_PROOF[t.form].start} Допиши третью строку и вывод.</p>`,
    ans: t => buildProofAnswer(t),
    same: (t, x) => !!x && Object.entries(buildProofAnswer(t)).every(([k, v]) => x[k] === v),
    wrongInput: t => ({ ...buildProofAnswer(t), reason: 'picture' }),
    key: t => JSON.stringify(buildProofAnswer(t)),
    keyHTML: t => PROOFS[t.form].solution,
    answer: t => PROOFS[t.form].solution,
    ok: t => PROOFS[t.form].solution,
    wrong(t, x) {
      const right = buildProofAnswer(t);
      const prefix = x.fact !== right.fact ? 'Это равенство не обосновано данными задачи.'
        : x.reason !== right.reason ? 'У равенства должна быть причина: условие или свойство. Внешний вид рисунка не является доказательством.'
        : x.sign !== right.sign ? 'Выбранный признак не соответствует трём записанным равенствам.'
        : 'В выводе нарушен порядок соответственных вершин.';
      return bad(x.sign !== right.sign ? 'which' : x.conclusion !== right.conclusion ? 'pair' : 'proof', `${prefix} ${PROOFS[t.form].solution}`);
    },
    hints: t => ['В каждой строке нужны равенство и причина. Затем проверь расположение угла и порядок вершин в выводе.', PROOFS[t.form].solution],
    traps: () => [],
  },
};

// Доказательства: каждое содержит три равенства и вывод с порядком соответственных вершин.
const PROOFS = {
  common: {
    given: 'Дано: AB = CB, ∠ABD = ∠CBD. Докажи: △ABD = △CBD.',
    gap: 'В доказательстве уже записаны два равенства из условия. Почему BD = BD?',
    right: 'common', opts: [['common', 'BD — общая сторона'], ['vertical', 'Это вертикальные углы'], ['picture', 'Треугольники выглядят одинаково']],
    solution: '1) AB = CB — по условию; 2) ∠ABD = ∠CBD — по условию; 3) BD = BD — общая сторона. Угол лежит между сторонами AB и BD. Поэтому △ABD = △CBD по первому признаку. Соответствие: A ↔ C, B ↔ B, D ↔ D.',
  },
  cross: {
    given: 'Отрезки AC и BD пересекаются в O. Дано: AO = CO, BO = DO. Докажи: △AOB = △COD.',
    gap: 'Две пары сторон равны по условию. Почему ∠AOB = ∠COD?',
    right: 'vertical', opts: [['vertical', 'Это вертикальные углы'], ['adjacent', 'Это смежные углы'], ['common', 'У треугольников общая сторона']],
    solution: '1) AO = CO — по условию; 2) BO = DO — по условию; 3) ∠AOB = ∠COD — вертикальные углы. Они лежат между данными сторонами. Поэтому △AOB = △COD по первому признаку. Соответствие: A ↔ C, O ↔ O, B ↔ D.',
  },
  second: {
    given: 'Дано: AB = CB, ∠ABD = ∠CBD, ∠BAD = ∠BCD. Докажи: △ABD = △CBD.',
    gap: 'Выписаны три равенства. Какой признак завершает доказательство?',
    right: 'second', opts: [['second', 'Второй: сторона и два прилежащих угла'], ['first', 'Первый: две стороны и угол между ними'], ['third', 'Третий: три стороны']],
    solution: '1) AB = CB; 2) ∠ABD = ∠CBD; 3) ∠BAD = ∠BCD — всё по условию. К стороне AB прилежат углы ABD и BAD, к CB — CBD и BCD. Поэтому △ABD = △CBD по второму признаку.',
  },
  third: {
    given: 'Дано: AB = CB, AD = CD. Докажи: △ABD = △CBD.',
    gap: 'AB = CB и AD = CD — по условию; BD = BD — общая сторона. Какой признак применим?',
    right: 'third', opts: [['third', 'Третий: три стороны'], ['first', 'Первый: две стороны и угол между ними'], ['second', 'Второй: сторона и два прилежащих угла']],
    solution: '1) AB = CB — по условию; 2) AD = CD — по условию; 3) BD = BD — общая сторона. Равны три пары сторон, значит △ABD = △CBD по третьему признаку.',
  },
};

const BUILD_PROOF = {
  common: { start: '1) AB = CB — по условию; 2) ∠ABD = ∠CBD — по условию.', facts: ['BD = BD', 'AD = BD', 'AB = AD'], fact: 'BD = BD', reason: 'common', sign: '1' },
  cross: { start: '1) AO = CO — по условию; 2) BO = DO — по условию.', facts: ['∠AOB = ∠COD', '∠AOB = ∠BOC', 'AO = BO'], fact: '∠AOB = ∠COD', reason: 'vertical', sign: '1' },
  second: { start: '1) AB = CB — по условию; 2) ∠ABD = ∠CBD — по условию.', facts: ['∠BAD = ∠BCD', 'AD = BD', '∠ADB = ∠ABD'], fact: '∠BAD = ∠BCD', reason: 'given', sign: '2' },
  third: { start: '1) AB = CB — по условию; 2) AD = CD — по условию.', facts: ['BD = BD', 'AD = BD', 'AB = AD'], fact: 'BD = BD', reason: 'common', sign: '3' },
};
function buildProofAnswer(t) {
  const b = BUILD_PROOF[t.form];
  return { fact: b.fact, reason: b.reason, sign: b.sign, conclusion: t.form === 'cross' ? 'AOB=COD' : 'ABD=CBD' };
}
function permutations([a, b, c]) { return [a + b + c, a + c + b, b + a + c, b + c + a, c + a + b, c + b + a]; }
function correspondenceReason(t) {
  const [a, b, c] = t.names;
  return `1) AB = ${a}${b} — один штрих; 2) BC = ${b}${c} — два; 3) AC = ${a}${c} — три. Значит A ↔ ${a}, B ↔ ${b}, C ↔ ${c}; △ABC = △${a}${b}${c}. Поворот рисунка не меняет соответствие.`;
}
function certaintyReason(t) {
  if (t.kind === 'different') return 'У равных треугольников периметры равны. Здесь 18 ≠ 24, поэтому треугольники не равны. Это доказанное различие, а не недостаток данных.';
  if (t.kind === 's1') return scen('s1', 'A').why;
  return `${scen(t.kind, t.v).why} По этим данным равенство не доказано. Это не утверждение о неравенстве: данных недостаточно для выбора между равенством и неравенством.`;
}
function correspondSVG(t) {
  const left = { A: pt(130, 45), B: pt(50, 220), C: pt(278, 205) };
  const right = { A: pt(530, 215), B: pt(610, 40), C: pt(382, 55) };
  let s = `<path class="side" d="${triPath(left)}"/><path class="side" d="${triPath(right)}"/>`;
  const edges = [['A', 'B'], ['B', 'C'], ['A', 'C']];
  edges.forEach(([a, b], i) => { s += ticksMark(left[a], left[b], i + 1) + ticksMark(right[a], right[b], i + 1); });
  s += vlab(left.A, 0, -20, 'A') + vlab(left.B, -22, 12, 'B') + vlab(left.C, 22, 12, 'C');
  s += vlab(right.A, 0, 30, t.names[0]) + vlab(right.B, 20, -15, t.names[1]) + vlab(right.C, -20, -15, t.names[2]);
  return taskSVG(660, 270, s);
}

// свой вид ввода для enough: варианты — кнопки, свои у каждого задания
const TOPIC_INPUTS = {
  enoughIn: {
    html: t => `<div class="inrow">${t.opts.map(([v, l]) => `<button type="button" class="choice" data-choice="${v}">${l}</button>`).join('')}</div>`,
    collect: () => null,
  },
  proofBuild: {
    html: t => {
      const draft = H.proofRenderTask === t ? Object.fromEntries([...$('hStep').querySelectorAll('select[data-k]')].map(e => [e.dataset.k, e.value])) : {};
      H.proofRenderTask = t;
      const select = (key, label, opts) => `<label>${label}<select data-k="${key}" aria-label="${label}"><option value="">Выбери…</option>${opts.map(([v, text]) => `<option value="${esc(v)}"${draft[key] === v ? ' selected' : ''}>${esc(text)}</option>`).join('')}</select></label>`;
      const cross = t.form === 'cross';
      return '<div class="proof-inputs">' + select('fact', '3. Равенство', t.facts.map(f => [f, f])) +
        select('reason', 'Обоснование', [['given', 'По условию'], ['common', 'Общая сторона'], ['vertical', 'Вертикальные углы'], ['picture', 'Так выглядит рисунок']]) +
        select('sign', 'Признак', [['1', 'Первый'], ['2', 'Второй'], ['3', 'Третий']]) +
        select('conclusion', 'Вывод', cross ? [['AOB=COD', '△AOB = △COD'], ['AOB=CDO', '△AOB = △CDO']] : [['ABD=CBD', '△ABD = △CBD'], ['ABD=BCD', '△ABD = △BCD']]) +
        `<button type="button" class="main check" data-act="check">Проверить доказательство</button></div>`;
    },
    collect: get => {
      const x = Object.fromEntries(['fact', 'reason', 'sign', 'conclusion'].map(k => [k, get(k)]));
      return Object.values(x).every(Boolean) ? x : { empty: true, msg: 'Заполни все четыре части доказательства.' };
    },
  },
};

// ---- фигуры для числовых задач ----
// общий чертёж «общая сторона»: △ABD сверху, △CBD снизу, BD общая; mode: 'p' — известен периметр, 's' — все стороны
function commonSVG(t, mode) {
  const B = pt(62, 144), D = pt(305, 144), A = pt(168, 75), C = pt(168, 213);
  let s = `<path class="side" d="${triPath({ A, B, C: D })}"/><path class="side" d="${triPath({ A: C, B, C: D })}"/>`;
  s += vlab(A, 0, -24, 'A') + vlab(B, -26, 8, 'B') + vlab(D, 26, 8, 'D') + vlab(C, 0, 30, 'C');
  s += ticksMark(A, B, 1) + ticksMark(C, B, 1);
  s += arcsMark(B, A, D, 1) + arcsMark(B, C, D, 1);
  if (mode === 'p') {
    s += segLab(A, B, D, String(t.a1)) + segLab(B, D, A, String(t.a2));
    s += `<text class="ann" x="185" y="22" text-anchor="middle">P△ABD = ${t.p} см</text>`;
  } else {
    s += segLab(A, B, D, String(t.a1)) + segLab(B, D, A, String(t.a2)) + segLab(A, D, B, String(t.d));
  }
  return taskSVG(370, 286, s);
}
// пересекающиеся в точке O отрезки: вертикальные углы + две пары равных сторон
function crossSVG(t) {
  const A = pt(60, 52), B = pt(310, 52), C = pt(310, 238), D = pt(60, 238);
  const O = crossPt(A, C, B, D);
  let s = segln(A, C) + segln(B, D) + segln(A, B) + segln(C, D);
  s += `<circle class="ndot" cx="${f1(O.x)}" cy="${f1(O.y)}" r="5"/>` + vlab(O, 0, -18, 'O');
  s += vlab(A, -12, -22, 'A') + vlab(B, 12, -22, 'B') + vlab(C, 14, 26, 'C') + vlab(D, -14, 26, 'D');
  s += ticksMark(A, O, 1) + ticksMark(C, O, 1) + ticksMark(B, O, 2) + ticksMark(D, O, 2);
  s += arcsMark(O, A, B, 1) + arcsMark(O, C, D, 1);
  s += segLab(A, O, B, String(t.a1)) + segLab(B, O, A, String(t.a2));
  s += `<text class="ann" x="185" y="283" text-anchor="middle">P△AOB = ${t.p} см</text>`;
  return taskSVG(370, 286, s);
}
// два раздельных равных треугольника с числами (первый признак отмечен)
function twinsSVG(t) {
  const T1 = { A: pt(150, 82), B: pt(68, 245), C: pt(287, 245) };
  const T2 = { A: pt(480, 82), B: pt(398, 245), C: pt(617, 245) };
  let s = `<path class="side" d="${triPath(T1)}"/><path class="side" d="${triPath(T2)}"/>`;
  s += vlab(T1.A, -2, -26, 'A') + vlab(T1.B, -24, 10, 'B') + vlab(T1.C, 22, 10, 'C');
  s += vlab(T2.A, 2, -26, 'A1') + vlab(T2.B, -24, 10, 'B1') + vlab(T2.C, 22, 10, 'C1');
  s += ticksMark(T1.A, T1.B, 1) + ticksMark(T2.A, T2.B, 1);
  s += ticksMark(T1.A, T1.C, 2) + ticksMark(T2.A, T2.C, 2);
  s += arcsMark(T1.A, T1.B, T1.C, 1) + arcsMark(T2.A, T2.B, T2.C, 1);
  s += segLab(T2.A, T2.B, T2.C, String(t.a1)) + segLab(T2.A, T2.C, T2.B, String(t.a2));
  s += `<text class="ann" x="650" y="26" text-anchor="end">P△${vname('A1B1C1')} = ${t.p} см</text>`;
  return taskSVG(660, 280, s);
}
function xsideSVG(t) {
  return t.form === 'common' ? commonSVG(t, 'p') : t.form === 'cross' ? crossSVG(t) : twinsSVG(t);
}
function pervSVG(t) { return commonSVG(t, 's'); }

function proofSVG(form) {
  if (form === 'cross') {
    // Числа и периметр здесь не нужны: отмечены только данные отрезки.
    const A = pt(60, 52), B = pt(310, 52), C = pt(310, 238), D = pt(60, 238), O = pt(185, 145);
    return taskSVG(370, 286, segln(A, C) + segln(B, D) + segln(A, B) + segln(C, D) +
      ticksMark(A, O, 1) + ticksMark(C, O, 1) + ticksMark(B, O, 2) + ticksMark(D, O, 2) +
      vlab(A, -12, -22, 'A') + vlab(B, 12, -22, 'B') + vlab(C, 14, 26, 'C') + vlab(D, -14, 26, 'D') + vlab(O, 0, -22, 'O'));
  }
  const B = pt(62, 144), D = pt(305, 144), A = pt(168, 50), C = pt(168, 238);
  let s = segln(A, B) + segln(A, D) + segln(C, B) + segln(C, D) + segln(B, D) +
    ticksMark(A, B, 1) + ticksMark(C, B, 1) +
    vlab(A, 0, -24, 'A') + vlab(B, -26, 8, 'B') + vlab(D, 26, 8, 'D') + vlab(C, 0, 30, 'C');
  if (form === 'third') s += ticksMark(A, D, 2) + ticksMark(C, D, 2);
  else s += arcsMark(B, A, D, 1) + arcsMark(B, C, D, 1);
  if (form === 'second') s += arcsMark(A, B, D, 2) + arcsMark(C, B, D, 2);
  return taskSVG(370, 286, s);
}

// ================= Типы ошибок для «Над чем поработать» =================
const CATS = {
  which: ['Признак не тот', 'Посчитай отмеченные пары: две стороны и угол между ними — первый признак, сторона и два прилежащих угла — второй, три стороны — третий.'],
  ssa: ['Угол не между сторонами', 'Для первого признака угол должен лежать между данными сторонами. Угол, прилежащий только к одной из них, равенство не доказывает: треугольник может «качнуться».'],
  aaa: ['Только углы', 'По трём углам равенство не доказано: форма одинаковая, а размер может быть разным.'],
  inc: ['Углы не прилежат к стороне', 'Во втором признаке оба угла прилежат к стороне. Проверь по чертежу, какие углы отмечены.'],
  pair: ['Не та пара элементов', 'В равных треугольниках равны соответственные элементы: A ↔ A₁, B ↔ B₁, C ↔ C₁. Найди искомую через соответственную сторону.'],
  per: ['Периметр', 'Периметр — сумма всех трёх сторон: вычитай из него обе данные стороны, складывай все три.'],
  calc: ['Вычисления', 'Проверь сложение и вычитание и приложи ответ к данным чертежа.'],
  proof: ['Обоснование доказательства', 'Запиши три равенства с причинами, проверь расположение угла и назови признак. Общая сторона равна самой себе, вертикальные углы равны.'],
  certainty: ['Вывод не следует из данных', '«Не доказано» не означает «не равны». Для равенства нужен признак, для неравенства — доказанное различие, иначе данных недостаточно.'],
};

// ================= Разделы тренажёра =================
const SECTIONS = [
  { title: 'Раздел 1', text: 'Признак и соответственные вершины', types: ['which', 'correspond'],
    exText: true, ex: () => 'найти признак и правильно записать равенство треугольников' },
  { title: 'Раздел 2', text: 'Ловушки и достаточность данных', types: ['trap', 'enough', 'certainty'],
    exText: true, ex: () => 'угол не между сторонами; какого условия не хватает' },
  { title: 'Раздел 3', text: 'Задачи на готовых чертежах', types: ['xside', 'perv'],
    exText: true, ex: () => 'найти сторону или периметр в равных треугольниках' },
  { title: 'Раздел 4', text: 'Собрать доказательство', types: ['proof', 'reasoning'],
    exText: true, ex: () => 'три равенства → признак → вывод' },
];

// ================= Раздатка: вариант восстанавливается по номеру =================
// Состав варианта: [тип] или [тип, форма] или [тип, [формы на выбор]]. Ответы заданий в варианте должны
// различаться: у выбора всего четыре ответа, поэтому такое задание — одно на вариант.
const KINDS_V1 = [
  ['which'],
  ['xside', 'commonProof'],
  ['perv'],
  ['xside', ['common', 'cross']],
  ['xside', ['common', 'cross']],
  ['perv'],
  ['xside', ['common', 'cross']],
];
// Слова для самопроверки: столько букв, сколько заданий, буквы не повторяются
const WORDS_V1 = ['ПРИЗНАК', 'ВЕРШИНА', 'ФИГУРКА', 'СТРЕЛОК', 'ПЛАВНИК'];
const PRINT = {
  instr: `В № 1 ответ — слово, в № 2–7 — число (см). Найди ответы в таблице букв и собери слово. В № 2 обоснуй равенство треугольников в тетради.`,
  about: 'В варианте 7 заданий с чертежами: определить признак, найти сторону или периметр. В № 2 — записать в тетради три равенства и признак. Ключ восстанавливается по номеру. Разбор № 2: AB = CB и ∠ABD = ∠CBD по условию, BD — общая сторона; △ABD = △CBD по первому признаку.',
  ogeAbout: '',
};

// ================= На доске =================
// Пример для показа: random = false — числа из CONFIG.board, true — «Другие числа» (old — прошлый пример)
function boardExample(random, old) {
  const C = CONFIG.board;
  if (!random) return { a: C.a, c: C.c, p: C.p, names: ['K', 'N', 'M'], ticketSeed: 4817 };
  const rnd = mulberry32((Math.random() * 4294967296) >>> 0);
  let a, c, d;
  do { a = int(rnd, 4, 9); c = int(rnd, 5, 12); d = int(rnd, 4, 14); }
  while (a === c || c === d || a === d || 2 * Math.max(a, c, d) >= a + c + d || (a === old.a && c === old.c));
  return { a, c, p: a + c + d, names: shuffle(rnd, ['K', 'N', 'M']), ticketSeed: int(rnd, 1000, 9999) };
}

// треугольники показа: AB вертикальна, Δ₂ справа (та же форма — треугольники равны)
const BT = { A: pt(280, 70), B: pt(280, 330), C: pt(520, 212) };
const BT2 = { A: pt(620, 70), B: pt(620, 330), C: pt(860, 212) };
const triLabels = (T, sub) =>
  vlab(T.A, 0, -30, 'A' + sub, 'lab s') + vlab(T.B, 0, 44, 'B' + sub, 'lab s') + vlab(T.C, 34, 10, 'C' + sub, 'lab s');
const tri1 = () => `<path class="gf" d="${triPath(BT)}"/>` + triLabels(BT, '');
const tri2 = () => `<path class="gf" d="${triPath(BT2)}"/>` + triLabels(BT2, '1');
const bPair = () => tri1() + tri2() +
  tx(400, 378, '△ABC', 'lab s soft') + tx(740, 378, `△${vname('A1B1C1')}`, 'lab s soft');
// отметки на обоих треугольниках: ticks [[сторона, n]], arcs [[вершина, n]]
function bMarks(ticks, arcs, pair = true) {
  const ENDS = { AB: ['A', 'B'], BC: ['B', 'C'], CA: ['C', 'A'] };
  const rays = { A: ['B', 'C'], B: ['A', 'C'], C: ['A', 'B'] };
  let s = '';
  for (const [sd, n] of ticks) {
    const [p, q] = ENDS[sd];
    s += ticksMark(BT[p], BT[q], n, 'btick') + (pair ? ticksMark(BT2[p], BT2[q], n, 'btick') : '');
  }
  for (const [vx, n] of arcs) {
    const [p, q] = rays[vx];
    s += arcsMark(BT[vx], BT[p], BT[q], n, 22, 'bmark') + (pair ? arcsMark(BT2[vx], BT2[p], BT2[q], n, 22, 'bmark') : '');
  }
  return s;
}
// Шаги: q — вопрос классу (до показа), a — ответ, note — что сказать (подсказка учителю),
// draw(phase) — SVG внутри viewBox 980 × 400 или '' (без чертежа), rec(phase) — строки «Запись в тетради»
function buildSteps(e) {
  const d = e.p - e.a - e.c;   // искомая сторона задачи
  const Cm = refl(BT.C, BT.A, BT.B);   // наложение AB на AB «переворотом»: C₁ по другую сторону
  const steps = [];
  steps.push({
    q: `Что значит: треугольники ABC и ${hname('A1B1C1')} равны?`,
    a: 'Они совпадают при наложении: все три стороны и все три угла.',
    note: 'Класс уже встречал равные фигуры. Спросите: что нужно проверить, чтобы заявить равенство? Дальше увидим: проверять всё — не нужно.',
    draw: ph => ph
      ? tri1() + `<g class="superpose"><path class="fill2" d="${triPath(BT)}"/><path class="gf" d="${triPath(BT)}"/></g>` +
        tx(560, 46, 'наложили — совпали', 'lab s warm')
      : bPair(),
    rec: ph => ph ? [`△ABC = ${hname('△A1B1C1')} — совпадают при наложении`] : [],
  });
  steps.push({
    q: `Даны только AB = ${hname('A1B1')}, AC = ${hname('A1C1')} и ∠A = ${hname('∠A1')}. Равны ли треугольники?`,
    a: `Да! Две стороны и угол между ними — первый признак равенства.`,
    note: 'Проговорите формулировку вслух, потом покажите ответ. Обратите внимание класса: угол — именно между данными сторонами.',
    draw: () => bPair() + bMarks([['AB', 1], ['CA', 2]], [['A', 1]]),
    rec: ph => ph ? [`1-й признак: AB = ${hname('A1B1')}, AC = ${hname('A1C1')}, ∠A = ${hname('∠A1')} — равны`] : [],
  });
  steps.push({
    q: 'Как доказать наложением? С чего начать?',
    a: `Совместим вершины A и ${hname('A1')} и наложим сторону ${hname('A1B1')} на сторону AB: они равны, точки B и ${hname('B1')} совпадут. Треугольник лёг по другую сторону от AB — наложение позволяет и перевернуть.`,
    note: 'Пунктирный треугольник — это A₁B₁C₁ после наложения: он перевёрнут относительно AB. Спросите класс: что теперь мешает совпадению?',
    draw: ph => ph
      ? tri1() + bMarks([['AB', 1], ['CA', 2]], [['A', 1]], false) +
        `<g class="new"><path class="gx" d="${triPath({ A: BT.A, B: BT.B, C: Cm })}"/>` +
        tx(490, 378, `${vname('A1')} → A, ${vname('B1')} → B (перевернули)`, 'lab s warm') + '</g>'
      : bPair() + bMarks([['AB', 1], ['CA', 2]], [['A', 1]]),
    rec: ph => ph ? [`наложение: ${hname('A1')} → A, ${hname('B1')} → B (перевернули)`] : [],
  });
  steps.push({
    q: 'Что теперь произойдёт с вершиной C?',
    a: `∠A = ${hname('∠A1')} — луч ${hname('A1C1')} ляжет на луч AC, а раз AC = ${hname('A1C1')}, точка ${hname('C1')} совпадёт с C. Треугольники совпали: и сторона BC, и углы B и C совпали сами.`,
    note: 'Главный вывод признака: третий элемент проверять не нужно — он совпал сам, «бесплатно». BC и углы B, C не были даны, а совпали.',
    draw: ph => ph
      ? tri1() + bMarks([['AB', 1], ['CA', 2]], [['A', 1]], false) +
        `<g class="new"><path class="fill2" d="${triPath(BT)}"/><path class="gf" d="${triPath(BT)}"/>` +
        tx(BT.C.x + 66, BT.C.y + 8, `${vname('C1')} → C: совпали`, 'lab s warm', 'start') + '</g>'
      : tri1() + bMarks([['AB', 1], ['CA', 2]], [['A', 1]], false) + `<path class="gx" d="${triPath({ A: BT.A, B: BT.B, C: Cm })}"/>`,
    rec: ph => ph ? [`∠A = ${hname('∠A1')} → лучи совпали; AC = ${hname('A1C1')} → ${hname('C1')} → C`,
      `BC = ${hname('B1C1')}, ∠B = ${hname('∠B1')}, ∠C = ${hname('∠C1')} — совпали сами`] : [],
  });
  steps.push({
    q: `А если известна только одна сторона и два угла при ней: AC = ${hname('A1C1')}, ∠A = ${hname('∠A1')}, ∠C = ${hname('∠C1')}?`,
    a: `Треугольники всё равно равны — по второму признаку. Наложим ${hname('A1C1')} на AC: точки A и C совпадут. Лучи AB и ${hname('A1B1')} совместятся (∠A), лучи CB и ${hname('C1B1')} — тоже (∠C). Лучи пересекаются в одной точке: B совпадёт с ${hname('B1')}.`,
    note: 'Сторона — «петля», два угла задают направления лучей. Пересечение двух лучей из точек A и C — единственное.',
    draw: ph => {
      const base = () => bPair() + bMarks([['CA', 1]], [['A', 1], ['C', 2]]);
      if (!ph) return base();
      const rayAB = udir(BT.A, BT.B), rayCB = udir(BT.C, BT.B);
      return tri1() + bMarks([['CA', 1]], [['A', 1], ['C', 2]], false) +
        `<g class="new"><path class="fill2" d="${triPath(BT)}"/>` +
        segln(pt(BT.A.x - rayAB.x * 40, BT.A.y - rayAB.y * 40), pt(BT.B.x + rayAB.x * 60, BT.B.y + rayAB.y * 60), 'link') +
        segln(pt(BT.C.x - rayCB.x * 40, BT.C.y - rayCB.y * 40), pt(BT.B.x + rayCB.x * 60, BT.B.y + rayCB.y * 60), 'link') +
        tx(BT.B.x - 20, 150, `B = ${vname('B1')}`, 'lab s warm', 'end') + '</g>';
    },
    rec: ph => ph ? [`2-й признак: AC = ${hname('A1C1')}, ∠A = ${hname('∠A1')}, ∠C = ${hname('∠C1')} — равны`] : [],
  });
  steps.push({
    q: `Даны все три стороны: AB = ${hname('A1B1')}, BC = ${hname('B1C1')}, CA = ${hname('C1A1')}. Как совместятся вершины?`,
    a: `Совместим ${hname('A1B1')} с AB. Точка ${hname('C1')} должна лежать на расстояниях AC от A и BC от B. Окружности дают две зеркальные позиции; переворот совмещает их. Это третий признак.`,
    note: 'Дуги — окружности с центрами A и B. У них две точки пересечения: C и «перевёрнутая» C₁ слева. Вторая отвечает за наложение с переворотом — треугольник при ней равен, она не мешает.',
    draw: ph => {
      const base = () => bPair() + bMarks([['AB', 1], ['BC', 2], ['CA', 3]], []);
      if (!ph) return base();
      return tri1() + bMarks([['AB', 1], ['BC', 2], ['CA', 3]], [], false) +
        `<g class="new"><path class="gx" d="${triPath({ A: BT.A, B: BT.B, C: Cm })}"/>` +
        arcSeg(BT.A, BT.C, Cm, dist(BT.A, BT.C), 'link') +
        arcSeg(BT.B, BT.C, Cm, dist(BT.B, BT.C), 'link') +
        `<circle class="dot" cx="${f1(BT.C.x)}" cy="${f1(BT.C.y)}" r="11"/>` +
        `<circle class="dot" cx="${f1(Cm.x)}" cy="${f1(Cm.y)}" r="11"/>` +
        tx(560, 330, `${vname('C1')}: зеркальная позиция`, 'lab s warm', 'start') + '</g>';
    },
    rec: ph => ph ? [`3-й признак: AB = ${hname('A1B1')}, BC = ${hname('B1C1')}, CA = ${hname('C1A1')} — равны`] : [],
  });
  steps.push({
    q: `Даны AB = ${hname('A1B1')}, AC = ${hname('A1C1')} и ∠B = ${hname('∠B1')} — угол не между данными сторонами. Можно ли утверждать, что треугольники равны?`,
    a: 'Нет! Угол при B разрешает целый луч, а на нём две точки на расстоянии AC от A: получатся два разных треугольника — ABC и ABD. Признака «две стороны и угол не между ними» нет.',
    note: '«Уха»: сторона AC задана длиной, но может качаться вокруг A. Обведите оба треугольника — оба удовлетворяют условию, а разные.',
    draw: ph => {
      const A = pt(280, 344), B = pt(742, 344);
      const u = { x: -Math.cos(rad(35)), y: -Math.sin(rad(35)) };
      const R = 302;
      const [C, D] = rayCircle(B, u, A, R);
      let s = segln(A, B) + `<circle class="ndot" cx="${f1(B.x)}" cy="${f1(B.y)}" r="6"/>` +
        segln(B, pt(B.x + u.x * 545, B.y + u.y * 545), 'hline');
      s += arcSeg(A, C, D, R, 'link');
      s += `<path class="gf" d="${triPath({ A, B, C })}"/><path class="gx" d="${triPath({ A, B, C: D })}"/>`;
      s += ticksMark(A, C, 1, 'btick') + ticksMark(A, D, 1, 'btick');
      s += arcsMark(B, A, C, 1, 24, 'bmark');
      s += vlab(A, -28, 10, 'A', 'lab s') + vlab(B, 28, 10, 'B', 'lab s') +
        vlab(C, 28, -10, 'C', 'lab s') + vlab(D, 26, -10, 'D', 'lab s');
      if (ph) s += `<g class="new">${tx(490, 390, '△ABC и △ABD — оба подходят под условие!', 'lab s warm')}</g>`;
      return s;
    },
    rec: ph => ph ? ['Две стороны и угол НЕ между ними — не признак'] : [],
  });
  steps.push({
    q: 'Задача. По какому признаку равны эти треугольники?',
    a: `По второму: BC = ${hname('B1C1')}, ∠B = ${hname('∠B1')}, ∠C = ${hname('∠C1')} — оба угла прилежат к стороне BC.`,
    note: 'Попросите класс назвать пары вслух: что отмечено штрихами, что дужками, и прилежат ли оба угла к отмеченной стороне.',
    draw: () => bPair() + bMarks([['BC', 1]], [['B', 1], ['C', 2]]),
    rec: ph => ph ? [`△ABC = ${hname('△A1B1C1')} — по 2-му признаку (BC, ∠B, ∠C)`] : [],
  });
  steps.push({
    q: `Те же треугольники. ${hname('A1B1')} = ${e.a} см, ${hname('B1C1')} = ${e.c} см, P(△${hname('A1B1C1')}) = ${e.p} см. Найдите AC.`,
    a: `${hname('A1C1')} = ${e.p} − ${e.a} − ${e.c} = ${d} см. Треугольники равны, значит AC = ${hname('A1C1')} = ${d} см.`,
    note: 'Связка с предыдущим шагом: равенство уже доказано — теперь работаем с соответственными элементами. Спросите: почему AC равна именно A₁C₁, а не другой стороне?',
    draw: ph => {
      let s = bPair() + bMarks([['BC', 1]], [['B', 1], ['C', 2]]);
      s += segLab(BT2.A, BT2.B, BT2.C, String(e.a), 26, 'num') + segLab(BT2.B, BT2.C, BT2.A, String(e.c), 26, 'num');
      s += tx(930, 44, `P△${vname('A1B1C1')} = ${e.p} см`, 'lab s', 'end');
      if (ph) s += `<g class="new">${segln(BT.A, BT.C, 'hline')}${segln(BT2.A, BT2.C, 'hline')}</g>`;
      return s;
    },
    rec: ph => ph ? [`${hname('A1C1')} = ${e.p} − ${e.a} − ${e.c} = ${d}; AC = ${hname('A1C1')} = ${d} см`] : [],
  });
  steps.push({
    q: 'На чертеже AB = CB и ∠ABD = ∠CBD. Как доказать равенство треугольников?',
    a: 'AB = CB и ∠ABD = ∠CBD — по условию; BD = BD — общая сторона. Поэтому △ABD = △CBD по первому признаку.',
    note: 'Не просите измерять чертёж. В тетради: 1) равные стороны; 2) общая сторона; 3) угол между ними; затем признак и вывод. Проверьте порядок вершин: A ↔ C, B ↔ B, D ↔ D.',
    draw: ph => `<g transform="translate(305 50) scale(1.05)">${proofSVG('common').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>` +
      (ph ? tx(490, 46, 'BD — общая: это третье равенство', 'lab s acc') : ''),
    rec: ph => ph ? ['AB = CB; BD = BD; ∠ABD = ∠CBD', '△ABD = △CBD — по 1-му признаку'] : [],
  });
  steps.push({
    q: 'Отрезки AC и BD пересекаются в O; AO = CO, BO = DO. Чего не хватает в доказательстве?',
    a: '∠AOB = ∠COD — вертикальные углы. Вместе с AO = CO и BO = DO они дают △AOB = △COD по первому признаку.',
    note: 'Третье равенство здесь следует из свойства вертикальных углов. У этих треугольников общая вершина O, но общей стороны нет. Спросите, какая сторона соответствует AB: CD.',
    draw: ph => `<g transform="translate(305 50) scale(1.05)">${proofSVG('cross').replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g>` +
      (ph ? tx(490, 46, 'углы при O — вертикальные', 'lab s acc') : ''),
    rec: ph => ph ? ['AO = CO; BO = DO; ∠AOB = ∠COD — вертикальные', '△AOB = △COD — по 1-му признаку'] : [],
  });
  steps.push({
    q: 'Что нужно запомнить?',
    a: '<ul><li>1-й признак: две стороны и угол между ними.</li><li>2-й признак: сторона и два прилежащих к ней угла.</li><li>3-й признак: три стороны.</li><li>Угол не между сторонами — не признак: получатся два разных треугольника.</li></ul>',
    note: 'Пусть класс сам сформулирует все три признака по записям в тетради, потом откройте ответ.',
    draw: () => '',
    rec: () => ['1-й: две стороны и угол между ними',
      '2-й: сторона и два прилежащих угла',
      '3-й: три стороны; угол не между сторонами — не признак'],
  });
  // Дополнительные обсуждения стоят после ловушки, а самостоятельная работа — перед итогом.
  steps.splice(7, 0, {
    id: 'not-proved',
    q: 'Равенство не доказано. Значит ли это, что треугольники не равны?',
    a: 'Нет. Возможно, они равны, а возможно — нет. Данных недостаточно. Для вывода «не равны» нужно доказать различие.',
    note: 'Попросите сформулировать три разных вывода: «равны», «не равны», «данных недостаточно». Не путайте отсутствие доказательства с доказательством обратного.',
    draw: () => bPair() + bMarks([['AB', 1], ['CA', 2]], [['B', 1]]),
    rec: ph => ph ? ['Нет признака → пока недостаточно данных', '«Не равны» требует доказанного различия'] : [],
  }, {
    id: 'three-angles',
    q: 'Все три пары углов равны. Обязательно ли равны треугольники?',
    a: 'Нет. Их форма одинакова, а размеры могут различаться. Три равных угла не дают признака равенства.',
    note: 'Сравните большой и уменьшенный треугольник. Не вводите ещё признаки подобия: сейчас достаточно увидеть, что совпадение углов не задаёт размер.',
    draw: ph => `<g transform="translate(65 25) scale(1.28)">${svgInside(pairSVG(scen('aaa', ''), 0.7))}</g>` +
      (ph ? tx(490, 390, 'Одинаковые углы — размер не задан', 'lab s warm') : ''),
    rec: ph => ph ? ['Три угла — не признак равенства треугольников'] : [],
  }, {
    id: 'correspondence',
    q: `Ученик написал △ABC = △${e.names[0]}${e.names[2]}${e.names[1]}. Верен ли порядок вершин?`,
    a: `Исправление: △ABC = △${e.names.join('')}. Сопоставляем вершины по штрихам, а не по положению на экране.`,
    note: correspondenceReason({ names: e.names }),
    draw: ph => `<g transform="translate(65 25) scale(1.28)">${svgInside(correspondSVG({ names: e.names }))}</g>`,
    rec: ph => ph ? [`A ↔ ${e.names[0]}; B ↔ ${e.names[1]}; C ↔ ${e.names[2]}`, `△ABC = △${e.names.join('')}`] : [],
  });
  steps.splice(steps.length - 1, 0, ...['second', 'third'].map(form => ({
    id: 'independent-' + form,
    q: PROOFS[form].given,
    a: PROOFS[form].solution,
    note: form === 'second' ? 'Сначала две минуты самостоятельной записи. Попросите назвать сторону и проверить, что оба угла прилежат именно к ней. Затем откройте доказательство.'
      : 'Попросите записать доказательство полностью: назвать треугольники, перечислить три равенства с причинами, назвать признак и сделать вывод. Общая сторона не отмечена штрихами.',
    draw: () => `<g transform="translate(305 50) scale(1.05)">${svgInside(proofSVG(form))}</g>`,
    rec: ph => ph ? [form === 'second' ? 'AB = CB; ∠ABD = ∠CBD; ∠BAD = ∠BCD' : 'AB = CB; AD = CD; BD = BD — общая', `△ABD = △CBD — по ${form === 'second' ? '2' : '3'}-му признаку`] : [],
  })), {
    id: 'exit-ticket',
    q: 'Билет на выход: 3 задания за 3 минуты. Ответь самостоятельно.',
    a: ticketBoardAnswer(makeLessonSheet(e.ticketSeed, 'ticket')),
    note: `Тот же билет можно напечатать: «Раздатка» → «Билет на выход», номер 1-${e.ticketSeed}. По одному баллу за ответ с верным обоснованием. Если ошиблись в признаке — повторите формулировку, в причине — способ доказательства.`,
    draw: () => ticketBoardDraw(makeLessonSheet(e.ticketSeed, 'ticket')),
    rec: () => ['1. Признак; 2. Ошибка в рассуждении; 3. Обоснование'],
  });
  return steps;
}
// Превью показывает первые 11 шагов; постер — формулировка первого признака на чертеже.
const BOARD = { previewUntil: 10, poster: 1 };

function svgInside(s) { return s.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''); }

// Дополнительные листы именно этой темы; генератор кодового слова остаётся прежним.
const LESSON_KINDS = { word: 'Кодовое слово', proofs: 'Практикум доказательств', ticket: 'Билет на выход' };
const renameGeometry = (s, names) => s.replace(/[ABCD]/g, c => names['ABCD'.indexOf(c)]);
function makeLessonSheet(num, kind) {
  const rnd = taskRnd(num, kind === 'proofs' ? 701 : 702);
  const label = GEN_VERSION + '-' + num;
  if (kind === 'proofs') {
    const names = pick(rnd, [['A', 'B', 'C', 'D'], ['K', 'L', 'M', 'N'], ['P', 'Q', 'R', 'S']]);
    const proofs = ['common', 'second', 'third'].map((form, i) => ({ form, sign: String(i + 1),
      given: renameGeometry(PROOFS[form].given, names), solution: renameGeometry(PROOFS[form].solution, names) }));
    return { num, label, kind, names, proofs, correspondence: generate('correspond', rnd) };
  }
  if (kind === 'ticket') {
    const sign = generate('which', rnd), error = generate('trap', rnd);
    let reason;
    do reason = generate('proof', rnd); while (!['common', 'cross'].includes(reason.form));
    return { num, label, kind, sign, error, reason };
  }
  throw new Error('Неизвестный дополнительный лист: ' + kind);
}
function proofPicture(form, names) {
  // Меняем только подписи текста, не буквы в атрибутах SVG и координатах.
  return proofSVG(form).replace(/>([ABCD])<\/text>/g, (_, c) => `>${names['ABCD'.indexOf(c)]}</text>`);
}
function extraSheetHead(v, title) {
  return `<div class="shead"><span>Фамилия, имя</span><span>Класс</span><span>Дата</span><span class="vn">${v.label}</span></div><h2>${title}</h2>`;
}
function proofPracticeHTML(v, grid) {
  return `<div class="sheet lesson-sheet${grid ? ' with-grid' : ''}">${extraSheetHead(v, 'Практикум: доказываем равенство треугольников')}
    <p class="instr">В каждой задаче запиши три равенства с причинами, признак и вывод. Порядок вершин имеет значение.</p>
    ${v.proofs.map((p, i) => `<section class="practice-task"><h3>${i + 1}. ${['Дополни доказательство', 'Заверши доказательство', 'Докажи самостоятельно'][i]}</h3>
      <div class="practice-row">${proofPicture(p.form, v.names)}<div><p>${p.given}</p>
      ${i < 2 ? `<p>${renameGeometry(BUILD_PROOF[p.form].start, v.names)}</p>` : ''}
      ${i === 0 ? `<p>3) __________ — __________.</p><p>${renameGeometry('△ABD = △____ по ____ признаку.', v.names)}</p>` : '<div class="proof-space"></div>'}</div></div></section>`).join('')}
    <section class="practice-task match-practice"><h3>4. Исправь порядок вершин</h3><div class="practice-row">${correspondSVG(v.correspondence)}
    <div><p>Треугольники равны. Ученик написал △ABC = △${v.correspondence.names[0]}${v.correspondence.names[2]}${v.correspondence.names[1]}.</p>
    <p>Исправь запись и назови сторону, равную BC.</p><div class="proof-space short"></div></div></div></section>
    <p class="lesson-end">Проверка: у каждого равенства есть причина; признак подходит к данным; вершины записаны в верном порядке.</p></div>`;
}
function ticketHTML(v) {
  const reason = v.reason;
  return `<div class="sheet ticket-sheet">${extraSheetHead(v, 'Билет на выход · 3 минуты')}
    <section class="ticket-task"><b>1. Назови признак.</b><div class="ticket-row">${pairSVG(scen(v.sign.kind, v.sign.v))}<div><p>Признак: __________</p><p>Равные пары: __________________<br>____________________________<br>____________________________</p></div></div></section>
    <section class="ticket-task"><b>2. Найди ошибку в рассуждении.</b><p>${v.error.kind === 'aaa' ? '«Три пары углов равны, значит треугольники равны».' : '«Две стороны и угол не между ними равны, значит треугольники равны».'}</p><p>Исправление: __________________________________________</p></section>
    <section class="ticket-task"><b>3. Допиши обоснование.</b><p>${PROOFS[reason.form].given.split(' Докажи:')[0]}</p><p>${reason.form === 'common' ? 'BD = BD, потому что' : '∠AOB = ∠COD, потому что'} _____________________</p></section>
    <p class="lesson-end">Каждый ответ обоснуй. Фамилия и номер варианта помогут учителю проверить работу.</p></div>`;
}
function ticketReasonForm(v) { return v.reason.form; }
function ticketBoardAnswer(v) {
  return `1) ${SIGN_WORD[SIGN_OF[v.sign.kind]]} признак. 2) Равенство не доказано: данных недостаточно. 3) ${ticketReasonForm(v) === 'common' ? 'BD — общая сторона.' : 'Углы вертикальные.'}`;
}
function ticketBoardDraw(v) {
  const elems = scen(v.sign.kind, v.sign.v).elems.map(s => s.replace(/<sub>1<\/sub>/g, '₁').replace(/<[^>]+>/g, ''));
  return tx(40, 42, '1. Назови признак по данным:', 'lab s', 'start') +
    elems.map((s, i) => tx(65, 82 + i * 36, s, 'lab s', 'start')).join('') +
    tx(40, 215, v.error.kind === 'aaa' ? '2. «Три угла равны — значит треугольники равны».' : '2. «Две стороны и угол НЕ между ними — признак».', 'lab s', 'start') +
    tx(65, 255, 'В чём ошибка? Какой вывод можно сделать?', 'lab s', 'start') +
    tx(40, 325, ticketReasonForm(v) === 'common' ? '3. BD = BD. Почему? Сторона принадлежит обоим треугольникам.' : '3. AC и BD пересекаются в O. Почему ∠AOB = ∠COD?', 'lab s', 'start');
}
function extraKeyHTML(vs, kind) {
  return `<div id="lessonKey" class="page key lesson-key"><h2>Ключ учителя · ${LESSON_KINDS[kind]}</h2>${vs.map(v => `<section class="lesson-key-row"><h3>Вариант ${v.label}</h3>${kind === 'proofs'
    ? v.proofs.map((p, i) => `<p><b>${i + 1}.</b> ${p.solution}</p>`).join('') + `<p><b>4.</b> ${correspondenceReason(v.correspondence)} Сторона BC равна ${v.correspondence.names[1]}${v.correspondence.names[2]}.</p>`
    : `<p><b>1.</b> ${TYPES.which.ok(v.sign)}</p><p><b>2.</b> Ошибка: ${v.error.kind === 'aaa' ? 'равные углы не задают размер треугольника, поэтому признака по трём углам нет.' : 'для первого признака угол должен лежать между данными сторонами; без этого условия признака нет.'} Вывод: данных недостаточно. Это не доказательство неравенства.</p><p><b>3.</b> ${ticketReasonForm(v) === 'common' ? 'BD = BD — общая сторона.' : '∠AOB = ∠COD — вертикальные углы.'}</p><p>По 1 баллу за каждый обоснованный ответ. Ошибка в № 1 — повторить признаки; в № 2 — достаточность данных; в № 3 — причины равенств.</p>`}</section>`).join('')}</div>`;
}

const TOPIC_SHEETS = {
  proofs: { label: LESSON_KINDS.proofs, generate: n => makeLessonSheet(n, 'proofs'), sheet: proofPracticeHTML,
    key: vs => extraKeyHTML(vs, 'proofs'), two: false, previewKey: true, pageClass: 'lesson-page',
    about: 'Три доказательства и задача на порядок вершин. Один вариант на A4; ключ содержит полные доказательства.' },
  ticket: { label: LESSON_KINDS.ticket, generate: n => makeLessonSheet(n, 'ticket'), sheet: ticketHTML,
    key: vs => extraKeyHTML(vs, 'ticket'), previewKey: true, pageClass: 'lesson-page',
    about: 'Билет на 3 минуты. Можно печатать два варианта на A4. Ключ — по номеру.' },
};
