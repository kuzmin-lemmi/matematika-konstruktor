// Ядро живой доски (core/live.js) и чертёжные помощники GEO (core/geom.js) — на заготовке темы.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadHtml } from '../tools/load.mjs';
import { TEMPLATE, buildTemplate } from './template.mjs';

const html = buildTemplate();
const plain = x => JSON.parse(JSON.stringify(x));
const open = (t, query = '?mode=board', options = {}) => { const m = loadHtml(html, { slug: TEMPLATE, query, ...options }); t.after(m.close); return m; };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) < eps;

test('GEO: углы, повороты, пересечения, отражение', t => {
  const G = open(t).window.APP.GEO, P = (x, y) => G.pt(x, y);
  assert.ok(near(G.angleAt(P(0, 0), P(10, 0), P(0, -10)), 90));
  assert.ok(near(G.angleAt(P(0, 0), P(10, 0), P(-10, -0.0000001)), 180, 1e-4));
  assert.ok(near(G.dirDeg(P(0, 0), P(0, -5)), 90), '90° — вверх на экране');
  const q = G.polar(P(100, 100), 30, 50);
  assert.ok(near(G.dist(P(100, 100), q), 50) && near(G.dirDeg(P(100, 100), q), 30));
  const r = G.turn(P(10, 0), P(0, 0), 90);
  assert.ok(near(r.x, 0) && near(r.y, -10), 'поворот против часовой стрелки');
  assert.equal(G.cross(P(0, 0), P(10, 0), P(0, 5), P(10, 5)), null, 'параллельные прямые не пересекаются');
  const c = G.cross(P(0, 0), P(10, 10), P(0, 10), P(10, 0));
  assert.ok(near(c.x, 5) && near(c.y, 5));
  const f = G.reflect(P(3, 4), P(0, 0), P(10, 0));
  assert.ok(near(f.x, 3) && near(f.y, -4));
  const two = G.circles(P(0, 0), 5, P(8, 0), 5);
  assert.equal(two.length, 2);
  for (const X of two) assert.ok(near(G.dist(X, P(0, 0)), 5) && near(G.dist(X, P(8, 0)), 5));
  assert.equal(G.circles(P(0, 0), 1, P(8, 0), 1).length, 0, 'далёкие окружности');
  assert.equal(G.lineCircle(P(-10, 0), P(10, 0), P(0, 0), 3).length, 2);
  assert.ok(near(G.area([P(0, 0), P(4, 0), P(0, 3)]), 6));
});

test('GEO: вырожденные фигуры, рамка чертежа, вписывание', t => {
  const G = open(t).window.APP.GEO, P = (x, y) => G.pt(x, y);
  assert.ok(G.fine([P(100, 300), P(400, 300), P(250, 100)]));
  assert.ok(!G.fine([P(100, 300), P(400, 300), P(250, 295)]), 'почти развёрнутый угол — вырожденный треугольник');
  assert.ok(!G.fine([P(100, 300), P(110, 300), P(250, 100)]), 'слишком короткая сторона');
  const [a, b] = G.clip(P(100, 100), P(200, 150), 20);
  for (const p of [a, b]) assert.ok(G.inBox(p, 19.9), `конец прямой в рамке: ${JSON.stringify(plain(p))}`);
  const { map } = G.fit([P(0, 0), P(3, 0), P(0, 4)], G.BOX, { pad: 40, flipY: true });
  for (const p of [P(0, 0), P(3, 0), P(0, 4)]) assert.ok(G.inBox(map(p), 39.9));
  assert.ok(map(P(0, 4)).y < map(P(0, 0)).y, 'flipY: ось y модели вверх');
  for (const s of [G.vertex(P(10, 10), 'A1', P(50, 50)), G.sector(P(100, 100), P(200, 100), P(100, 0)), G.arrow(P(0, 0), P(0, 0)), G.ticks(P(0, 0), P(100, 0), 3), G.right(P(0, 0), P(10, 0), P(0, 10))]) {
    assert.doesNotMatch(s, /NaN|undefined/);
  }
  assert.match(G.vertex(P(10, 10), 'A1', P(50, 50)), /A<tspan[^>]*class="g-sub">1</);
});

test('живая доска: ручка и стрелки клавиатуры двигают модель, вырожденное положение не принимается', t => {
  const { window: w, errors } = open(t);
  const B = w.APP.board, d = w.document;
  B.go(1, 1);
  assert.deepEqual([...B.handles.map(h => h.id)], ['a', 's']);
  const a0 = B.model.a, b0 = B.model.b;
  B.drag('a', { x: 90 + (5 - -20) * 20, y: 200 });
  assert.equal(B.model.a, 5);
  assert.equal(B.model.b, b0, 'второе слагаемое не меняется, когда двигаем первое');
  // сумма на месте первого слагаемого: b = 0 — LIVE.ok отклоняет, модель прежняя
  assert.equal(B.drag('s', { x: 90 + 25 * 20, y: 200 }), false);
  assert.equal(B.model.b, b0);
  // стрелка вправо на сфокусированной ручке сдвигает на 1 и не листает шаг
  const h = d.querySelector('[data-handle="a"]');
  h.focus();
  h.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(B.model.a, 6);
  assert.equal(B.i, 1, 'шаг не сменился');
  assert.equal(d.activeElement?.dataset.handle, 'a', 'после перерисовки фокус остаётся на ручке');
  // стрелка вне ручки — по-прежнему листает
  d.body.dispatchEvent(new w.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
  assert.equal(B.i, 2);
  assert.ok(a0 !== undefined);
  assert.deepEqual(errors, []);
});

test('живая доска: панель — ползунок, переключатель, сброс', t => {
  const { window: w, errors } = open(t);
  const B = w.APP.board, d = w.document;
  B.go(2, 0);
  const panel = d.getElementById('bLive');
  assert.equal(panel.hidden, false);
  const range = panel.querySelector('input[type=range][data-ctl="b"]');
  range.value = '-4'; range.dispatchEvent(new w.Event('input', { bubbles: true }));
  assert.equal(B.model.b, -4);
  assert.match(panel.querySelector('[data-out="b"]').textContent, /−4/);
  assert.equal(d.querySelector('input[type=range][data-ctl="b"]'), range, 'ползунок не пересоздаётся, пока его двигают');
  const mods = panel.querySelector('[data-ctl="mods"]');
  mods.click();
  assert.equal(B.model.mods, true);
  assert.equal(d.querySelector('[data-ctl="mods"]').getAttribute('aria-pressed'), 'true');
  panel.querySelector('[data-live="reset"]').click();
  assert.equal(B.model.mods, false);
  assert.equal(B.model.b, w.APP.board.snap.b);
  B.go(3, 0);
  assert.equal(panel.hidden, true, 'на шаге без live панели нет');
  assert.deepEqual(errors, []);
});

test('живая доска: опыт идёт плавно, учитель задаёт темп — «Далее» сразу завершает движение', t => {
  const frames = [];
  const { window: w, errors } = open(t, '?mode=board', {
    beforeParse(win) {
      win.matchMedia = () => ({ matches: false, addEventListener() {}, removeEventListener() {} });
      win.requestAnimationFrame = f => frames.push(f);
      win.cancelAnimationFrame = () => {};
    },
  });
  const B = w.APP.board;
  B.go(1, 0);
  assert.equal(B.model.go, 0);
  B.next();                                      // «Показать ответ» — точка поехала
  assert.equal(B.animating, true);
  frames.shift()(w.performance.now() + 700);     // середина пути
  assert.ok(B.model.go > 0 && B.model.go < 1, `промежуточное положение: ${B.model.go}`);
  B.next();                                      // учитель листает дальше — движение заканчивается сразу
  assert.equal(B.animating, false);
  assert.equal(B.i, 2);
  assert.equal(B.model.go, 1);
  assert.deepEqual(errors, []);
});

test('живая доска: prefers-reduced-motion — сразу конечное положение', t => {
  const { window: w } = open(t, '?mode=board', {
    beforeParse(win) {
      win.matchMedia = q => ({ matches: q.includes('reduce'), addEventListener() {}, removeEventListener() {} });
      win.requestAnimationFrame = () => { throw new Error('анимация при reduced-motion'); };
    },
  });
  const B = w.APP.board;
  B.go(1, 0); B.next();
  assert.equal(B.animating, false);
  assert.equal(B.model.go, 1);
});
