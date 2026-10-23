// ================= Точная арифметика: числа — несократимые дроби {n, d} =================
const gcd = (a, b) => { a = Math.abs(a); b = Math.abs(b); while (b) [a, b] = [b, a % b]; return a; };
const Q = (n, d = 1) => { if (d < 0) { n = -n; d = -d; } const g = gcd(n, d) || 1; return { n: n / g, d: d / g }; };
const qadd = (x, y) => Q(x.n * y.d + y.n * x.d, x.d * y.d);
const qsub = (x, y) => Q(x.n * y.d - y.n * x.d, x.d * y.d);
const qmul = (x, y) => Q(x.n * y.n, x.d * y.d);
const qeq = (x, y) => !!x && !!y && x.n === y.n && x.d === y.d;
const qneg = x => Q(-x.n, x.d);
const isqrt = n => { if (n < 0) return null; const r = Math.round(Math.sqrt(n)); return r * r === n ? r : null; };
const qsqrt = x => { const a = isqrt(x.n), b = isqrt(x.d); return a == null || b == null ? null : Q(a, b); };
const floorSqrt = n => { let r = Math.floor(Math.sqrt(n)); while (r * r > n) r--; while ((r + 1) * (r + 1) <= n) r++; return r; };
const toMixed = f => { const w = Math.floor(f.n / f.d); return { w, n: f.n - w * f.d, d: f.d }; };
// конечная десятичная запись с запятой или null
function decStr(x) {
  for (let k = 0; k <= 8; k++) {
    const m = x.n * 10 ** k;
    if (m % x.d !== 0) continue;
    const v = Math.abs(m / x.d), s = String(v).padStart(k + 1, '0');
    return (x.n < 0 ? MINUS : '') + (k ? s.slice(0, -k) + ',' + s.slice(-k) : s);
  }
  return null;
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const int = (rnd, a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (rnd, arr) => arr[Math.floor(rnd() * arr.length)];
function shuffle(rnd, arr) {
  const r = arr.slice();
  for (let i = r.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [r[i], r[j]] = [r[j], r[i]]; }
  return r;
}
const taskRnd = (n, i) => mulberry32(GEN_VERSION * 1000003 + n * 7919 + i * 104729 + 1);
const plural = (n, one, few, many) => {
  const m10 = n % 10, m100 = n % 100;
  return m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
};

// ================= Запись =================
const F = f => `<span class="frac"><span>${f.n}</span><span>${f.d}</span></span>`;
const M = m => m.w ? `<span class="mixed"><span class="w">${m.w}</span>${m.n ? F(m) : ''}</span>` : F(m);
// корень: √ и черта над подкоренным выражением; tall — под корнем дробь
const RT = (inner, tall) => `<span class="rt${tall ? ' tall' : ''}"><span class="rs">√</span><span class="rad">${inner}</span></span>`;
const X = '<i>x</i>';
const esc = s => String(s).replace(/</g, '&lt;').replace(/>/g, '&gt;');
// число: style 'dec' — десятичной дробью, если она конечная; 'frac' — обыкновенной (смешанной)
function htmlQ(x, style = 'dec') {
  if (x.d === 1) return (x.n < 0 ? MINUS : '') + Math.abs(x.n);
  const s = style === 'dec' && decStr(x);
  if (s) return s;
  const a = { n: Math.abs(x.n), d: x.d };
  return (x.n < 0 ? MINUS : '') + (a.n > a.d ? M(toMixed(a)) : F(a));
}
function keyQ(x, style = 'dec') {
  if (x.d === 1) return (x.n < 0 ? MINUS : '') + Math.abs(x.n);
  const s = style === 'dec' && decStr(x);
  if (s) return s;
  const a = { n: Math.abs(x.n), d: x.d }, m = toMixed(a);
  return (x.n < 0 ? MINUS : '') + (m.w ? m.w + ' ' : '') + m.n + '/' + m.d;
}
const sq2 = x => htmlQ(qmul(x, x));   // квадрат числа для проверки в объяснениях
// десятичная дробь с одной-двумя цифрами после запятой — для подкоренных выражений
const D = x => decStr(x) || htmlQ(x, 'frac');

// Значение корня уравнения: {q} — рациональное число, {m, s} — s·√m, m не квадрат
const V = {
  q: q => ({ q }),
  html: (v, style) => v.q ? htmlQ(v.q, style) : (v.s < 0 ? MINUS : '') + RT(v.m),
  key: (v, style) => v.q ? keyQ(v.q, style) : (v.s < 0 ? MINUS : '') + '√' + v.m,
  eq: (a, b) => a.q && b.q ? qeq(a.q, b.q) : !a.q && !b.q && a.m === b.m && a.s === b.s,
};
function eqRoots(a) {
  if (a.n < 0) return [];
  if (a.n === 0) return [V.q(Q(0))];
  const s = qsqrt(a);
  if (s) return [V.q(s), V.q(qneg(s))];
  return [{ m: a.n, s: 1 }, { m: a.n, s: -1 }];   // a — целое, не квадрат
}
const eqKey = (R, style) => !R.length ? 'нет корней' : R.length === 1 ? V.key(R[0], style) : '±' + V.key(R[0], style);
const eqHTML = (R, style) => `<span class="nw">${!R.length ? 'корней нет' : R.length === 1 ? `${X} = ${V.html(R[0], style)}` : `${X} = ±${V.html(R[0], style)}`}</span>`;

// Ввод: «0,3», «12», «−5», «5/3», «1 2/3»
function parseQ(s) {
  const t = String(s).trim().replace(/[−–]/g, '-').replace(/\s+/g, ' ');
  let m = t.match(/^(-)?(\d+) (\d+)\/(\d+)$/);
  if (m) return +m[4] ? Q((m[1] ? -1 : 1) * (+m[2] * +m[4] + +m[3]), +m[4]) : null;
  m = t.match(/^(-)?(\d+)\/(\d+)$/);
  if (m) return +m[3] ? Q((m[1] ? -1 : 1) * +m[2], +m[3]) : null;
  m = t.replace(/ /g, '').replace('.', ',').match(/^(-)?(\d*)(?:,(\d+))?$/);
  if (!m || (!m[2] && !m[3])) return null;
  const fr = m[3] || '', k = fr.length;
  return Q((m[1] ? -1 : 1) * (+(m[2] || 0) * 10 ** k + +(fr || 0)), 10 ** k);
}
// корень уравнения: число или «√7», «−√7», «2√3»
function parseVal(s) {
  const t = String(s).trim().replace(/[−–]/g, '-').replace(/\s+/g, '');
  const m = t.match(/^([+-])?(\d+)?√(\d+)$/);
  if (!m) { const q = parseQ(s); return q ? V.q(q) : null; }
  const k = +(m[2] || 1), sign = m[1] === '-' ? -1 : 1, under = k * k * +m[3];
  const r = isqrt(under);
  return r != null ? V.q(Q(sign * r)) : { m: under, s: sign };
}
