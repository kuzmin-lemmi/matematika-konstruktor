// ================= 📐 Чертёжные помощники (GEO) =================
// Всё в одном объекте GEO, чтобы не пересекаться с именами темы: const { pt, seg, vertex } = GEO.
// Координаты — экранные координаты SVG (y вниз), по умолчанию рамка доски 980 × 400.
// Углы — в градусах, «математические»: 0° — вправо, 90° — вверх, положительный поворот — против часовой стрелки.
// Рисующие функции возвращают строку SVG; классы g-* описаны в base.css и читаются на проекторе.
const GEO = (() => {
  const BOX = { x: 0, y: 0, w: 980, h: 400 };
  const f1 = n => Math.round(n * 10) / 10;
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const snap = (v, step) => Math.round(v / step) * step;
  const pt = (x, y) => ({ x, y });
  const add = (p, q) => pt(p.x + q.x, p.y + q.y);
  const sub = (p, q) => pt(p.x - q.x, p.y - q.y);
  const scale = (v, k) => pt(v.x * k, v.y * k);
  const len = v => Math.hypot(v.x, v.y);
  const dist = (p, q) => Math.hypot(q.x - p.x, q.y - p.y);
  const mid = (p, q) => pt((p.x + q.x) / 2, (p.y + q.y) / 2);
  const lerp = (p, q, t) => pt(p.x + (q.x - p.x) * t, p.y + (q.y - p.y) * t);
  const unit = (p, q) => { const d = dist(p, q) || 1; return pt((q.x - p.x) / d, (q.y - p.y) / d); };
  const perp = v => pt(v.y, -v.x);                                   // поворот на 90° против часовой стрелки
  const polar = (V, a, r) => pt(V.x + r * Math.cos(rad(a)), V.y - r * Math.sin(rad(a)));
  // направление луча VP: 0…360°
  const dirDeg = (V, P) => { const a = deg(Math.atan2(V.y - P.y, P.x - V.x)); return a < 0 ? a + 360 : a; };
  // величина угла AVB: 0…180°
  const angleAt = (V, A, B) => { let d = Math.abs(dirDeg(V, A) - dirDeg(V, B)); if (d > 180) d = 360 - d; return d; };
  // поворот точки P вокруг C на a градусов
  const turn = (P, C, a) => { const c = Math.cos(rad(a)), s = Math.sin(rad(a)), dx = P.x - C.x, dy = P.y - C.y; return pt(C.x + dx * c + dy * s, C.y - dx * s + dy * c); };
  // проекция точки на прямую AB и отражение относительно неё
  const project = (P, A, B) => { const d = sub(B, A), k = d.x * d.x + d.y * d.y || 1, t = ((P.x - A.x) * d.x + (P.y - A.y) * d.y) / k; return lerp(A, B, t); };
  const reflect = (P, A, B) => { const F = project(P, A, B); return pt(2 * F.x - P.x, 2 * F.y - P.y); };
  // точка пересечения прямых p1q1 и p2q2; null — прямые параллельны
  function cross(p1, q1, p2, q2) {
    const d1 = sub(q1, p1), d2 = sub(q2, p2), den = d1.x * d2.y - d1.y * d2.x;
    if (Math.abs(den) < 1e-9) return null;
    const t = ((p2.x - p1.x) * d2.y - (p2.y - p1.y) * d2.x) / den;
    return pt(p1.x + t * d1.x, p1.y + t * d1.y);
  }
  // пересечение прямой PQ с окружностью (C, R): 0, 1 или 2 точки — по направлению от P к Q
  function lineCircle(P, Q, C, R) {
    const u = unit(P, Q), w = sub(C, P), b = w.x * u.x + w.y * u.y, disc = b * b - (w.x * w.x + w.y * w.y - R * R);
    if (disc < -1e-9) return [];
    const s = Math.sqrt(Math.max(0, disc));
    return (s < 1e-9 ? [b] : [b - s, b + s]).map(t => add(P, scale(u, t)));
  }
  // пересечение окружностей (построения циркулем): 0, 1 или 2 точки
  function circles(C1, R1, C2, R2) {
    const d = dist(C1, C2);
    if (d < 1e-9 || d > R1 + R2 + 1e-9 || d < Math.abs(R1 - R2) - 1e-9) return [];
    const a = (R1 * R1 - R2 * R2 + d * d) / (2 * d), h = Math.sqrt(Math.max(0, R1 * R1 - a * a));
    const M = lerp(C1, C2, a / d), n = perp(unit(C1, C2));
    return h < 1e-9 ? [M] : [add(M, scale(n, h)), sub(M, scale(n, h))];
  }
  const area = ps => Math.abs(ps.reduce((s, p, i) => { const q = ps[(i + 1) % ps.length]; return s + p.x * q.y - q.x * p.y; }, 0)) / 2;
  const centroid = ps => pt(ps.reduce((s, p) => s + p.x, 0) / ps.length, ps.reduce((s, p) => s + p.y, 0) / ps.length);
  // ориентация тройки на экране: > 0 — A → B → C против часовой стрелки
  const orient = (A, B, C) => -((B.x - A.x) * (C.y - A.y) - (B.y - A.y) * (C.x - A.x));
  // многоугольник «нормальный» для показа: стороны не короче side, углы не меньше angle — контроль вырожденных случаев
  function fine(ps, { side = 40, angle = 12 } = {}) {
    return ps.every((p, i) => {
      const prev = ps[(i + ps.length - 1) % ps.length], next = ps[(i + 1) % ps.length], a = angleAt(p, prev, next);
      return dist(p, next) >= side && a >= angle && a <= 180 - angle;
    });
  }
  const bbox = ps => { const xs = ps.map(p => p.x), ys = ps.map(p => p.y); return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }; };
  const inBox = (p, pad = 0, box = BOX) => p.x >= box.x + pad && p.x <= box.x + box.w - pad && p.y >= box.y + pad && p.y <= box.y + box.h - pad;
  const keepIn = (p, pad = 0, box = BOX) => pt(clamp(p.x, box.x + pad, box.x + box.w - pad), clamp(p.y, box.y + pad, box.y + box.h - pad));
  // вписать точки модели (в своих единицах, y вверх или вниз) в рамку: map(p) → точка SVG, k — масштаб
  function fit(ps, box = BOX, { pad = 30, flipY = false } = {}) {
    const b = bbox(ps), k = Math.min((box.w - 2 * pad) / (b.w || 1), (box.h - 2 * pad) / (b.h || 1));
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2, X = box.x + box.w / 2, Y = box.y + box.h / 2;
    return { k, map: p => pt(X + (p.x - cx) * k, Y + (flipY ? -1 : 1) * (p.y - cy) * k) };
  }
  // прямая через P и Q, обрезанная рамкой (отступ pad); луч — от P через Q до края
  function clip(P, Q, pad = 20, box = BOX, ray = false) {
    const d = sub(Q, P), ts = [];
    if (Math.abs(d.x) > 1e-9) ts.push((box.x + pad - P.x) / d.x, (box.x + box.w - pad - P.x) / d.x);
    if (Math.abs(d.y) > 1e-9) ts.push((box.y + pad - P.y) / d.y, (box.y + box.h - pad - P.y) / d.y);
    const ok = ts.filter(t => inBox(add(P, scale(d, t)), pad - 0.01, box));
    if (!ok.length) return [P, Q];
    const t1 = Math.max(...ok), t0 = ray ? 0 : Math.min(...ok);
    return [add(P, scale(d, t0)), add(P, scale(d, t1))];
  }

  // ---------- рисунок ----------
  // имя точки с индексом: 'A1' → A₁ (подстрочная цифра)
  function name(s) {
    let out = '', down = false;
    for (const ch of String(s)) {
      if (ch >= '0' && ch <= '9') { out += `<tspan${down ? '' : ' dy="9"'} class="g-sub">${ch}</tspan>`; down = true; }
      else { out += down ? `<tspan dy="-9">${ch}</tspan>` : ch; down = false; }
    }
    return out;
  }
  const seg = (p, q, cls = 'g-ln') => `<line class="${cls}" x1="${f1(p.x)}" y1="${f1(p.y)}" x2="${f1(q.x)}" y2="${f1(q.y)}"/>`;
  const line = (p, q, cls = 'g-ln', pad = 20) => { const [a, b] = clip(p, q, pad); return seg(a, b, cls); };
  const ray = (p, q, cls = 'g-ln', pad = 20) => { const [a, b] = clip(p, q, pad, BOX, true); return seg(a, b, cls); };
  const pts = ps => ps.map(p => `${f1(p.x)},${f1(p.y)}`).join(' ');
  const poly = (ps, cls = 'g-fig') => `<polygon class="${cls}" points="${pts(ps)}"/>`;
  const path = (ps, cls = 'g-ln') => `<polyline class="${cls}" points="${pts(ps)}"/>`;
  const circle = (C, r, cls = 'g-circ') => `<circle class="${cls}" cx="${f1(C.x)}" cy="${f1(C.y)}" r="${f1(r)}"/>`;
  const dot = (p, cls = 'g-pt', r = 7) => circle(p, r, cls);
  const text = (p, s, cls = 'g-lab', anchor = 'middle') => `<text class="${cls}" x="${f1(p.x)}" y="${f1(p.y)}" text-anchor="${anchor}" dominant-baseline="central">${s}</text>`;
  // подпись вершины P на расстоянии r — в сторону от точки from (обычно центр фигуры): подписи не налезают на стороны
  // и на ручку живой доски в вершине
  const vertex = (P, s, from, r = 46, cls = 'g-vl') => text(add(P, scale(unit(from, P), r)), name(s), cls);
  // подпись стороны pq у её середины — снаружи от точки opp
  function side(p, q, s, opp, r = 30, cls = 'g-num') {
    const m = mid(p, q), n = perp(unit(p, q)), out = ((m.x - opp.x) * n.x + (m.y - opp.y) * n.y) >= 0 ? 1 : -1;
    return text(add(m, scale(n, r * out)), s, cls);
  }
  // меньший угол AVB: [начало, конец] в градусах, конец > начала
  function span(V, A, B) {
    const a = dirDeg(V, A), b = dirDeg(V, B), d = (b - a + 360) % 360;
    return d <= 180 ? [a, a + d] : [b, b + 360 - d];
  }
  const arcD = (V, s, e, r) => { const p = polar(V, s, r), q = polar(V, e, r); return `M${f1(p.x)} ${f1(p.y)}A${f1(r)} ${f1(r)} 0 ${e - s > 180 ? 1 : 0} 0 ${f1(q.x)} ${f1(q.y)}`; };
  // дуга окружности с центром V от направления s до e (градусы, против часовой стрелки)
  const arc = (V, s, e, r, cls = 'g-mark') => `<path class="${cls}" d="${arcD(V, s, e, r)}"/>`;
  // закрашенный угол AVB (меньший), радиус r
  const sector = (V, A, B, r = 60, cls = 'g-sec') => { const [s, e] = span(V, A, B); return `<path class="${cls}" d="M${f1(V.x)} ${f1(V.y)}L${arcD(V, s, e, r).slice(1)}Z"/>`; };
  // n дужек равенства угла AVB
  const arcs = (V, A, B, n = 1, r = 26, cls = 'g-mark') => { const [s, e] = span(V, A, B); let o = ''; for (let i = 0; i < n; i++) o += arc(V, s, e, r + i * 9, cls); return o; };
  // знак прямого угла AVB
  const right = (V, A, B, size = 22, cls = 'g-mark') => { const u = scale(unit(V, A), size), w = scale(unit(V, B), size); return path([add(V, u), add(add(V, u), w), add(V, w)], cls); };
  // n штрихов равенства на отрезке pq
  function ticks(p, q, n = 1, cls = 'g-tick') {
    const d = unit(p, q), m = mid(p, q), k = perp(d);
    let o = '';
    for (let i = 0; i < n; i++) { const c = add(m, scale(d, (i - (n - 1) / 2) * 11)); o += seg(add(c, scale(k, 11)), sub(c, scale(k, 11)), cls); }
    return o;
  }
  // подпись угла AVB на биссектрисе; у острого угла — дальше от вершины, чтобы число поместилось
  function angleText(V, A, B, s, r = 0, cls = 'g-num') {
    const [a, e] = span(V, A, B), rr = r || clamp(34 / Math.sin(rad(Math.max(e - a, 8) / 2)), 58, 130);
    return text(polar(V, (a + e) / 2, rr), s, cls);
  }
  // стрелка от p к q (наконечник — треугольник)
  function arrow(p, q, cls = 'g-arrow', head = 18) {
    const d = unit(p, q), n = perp(d), b = sub(q, scale(d, head));
    return `<g class="${cls}">${seg(p, b, '')}${poly([q, add(b, scale(n, head * .55)), sub(b, scale(n, head * .55))], '')}</g>`;
  }
  // знак параллельности: n уголков-стрелок посередине прямой pq
  function parallel(p, q, n = 1, cls = 'g-mark') {
    const d = unit(p, q), k = perp(d), m = mid(p, q);
    let o = '';
    for (let i = 0; i < n; i++) { const c = add(m, scale(d, (i - (n - 1) / 2) * 13 + 6)); o += path([add(sub(c, scale(d, 12)), scale(k, 10)), c, sub(sub(c, scale(d, 12)), scale(k, 10))], cls); }
    return o;
  }

  return {
    BOX, f1, rad, deg, clamp, snap, pt, add, sub, scale, len, dist, mid, lerp, unit, perp, polar, dirDeg, angleAt, turn,
    project, reflect, cross, lineCircle, circles, area, centroid, orient, fine, bbox, inBox, keepIn, fit, clip,
    name, seg, line, ray, poly, path, circle, dot, text, vertex, side, span, arc, sector, arcs, right, ticks, angleText, arrow, parallel,
  };
})();

