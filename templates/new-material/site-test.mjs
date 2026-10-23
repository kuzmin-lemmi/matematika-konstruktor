// Автотест темы «{{title}}» на сайте. Общие проверки (режимы, 30 вариантов, доска, тренажёр) делает
// тест-контракт конструктора; здесь — НЕЗАВИСИМОЕ решение: ответ считает сам тест, а не код материала,
// иначе тест повторит ошибку материала. ЗАМЕНИ expected() под свои типы заданий.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadMaterial } from './helpers.mjs';

const SLUG = '{{slug}}';
const MINUS = '−';
const sgn = n => (n < 0 ? MINUS : '') + Math.abs(n);

// Ответ задания: value — что ввести в тренажёр, key — запись в ключе раздатки
function expected(t) {
  switch (t.type) {
    case 'sum': return { value: { n: t.a + t.b, d: 1 }, key: sgn(t.a + t.b) };
    case 'cmp': { const s = t.a < t.b ? '<' : '>'; return { value: s, key: s }; }
  }
  throw new Error('Нет независимого решения для типа ' + t.type);
}

function open(t, query = '') {
  const m = loadMaterial(SLUG, { query });
  t.after(m.close);
  return m;
}

test('генератор: независимое решение совпадает с ответом материала', t => {
  const { APP } = open(t).window;
  for (const type of Object.keys(APP.TYPES)) {
    const rnd = APP.mulberry32(type.length * 977);
    for (let i = 0; i < 200; i++) {
      const task = APP.generate(type, rnd), e = expected(task);
      assert.ok(APP.TYPES[type].same(task, e.value), `${type}: ${JSON.stringify(task)}`);
      assert.equal(APP.TYPES[type].key(task), e.key, `${type}: запись ответа`);
    }
  }
});

test('раздатка: ключ 30 вариантов совпадает с независимым решением', t => {
  const { APP } = open(t, '?mode=print').window;
  for (let i = 0; i < 30; i++) {
    const v = APP.makeVariant(1000 + i * 293);
    assert.deepEqual([...v.answers], [...v.tasks].map(x => expected(x).key));
  }
});

test('тренажёр: независимый ответ принимается в каждом разделе', t => {
  const { window: w, errors } = open(t, '?mode=home');
  const h = w.APP.home;
  for (let level = 0; level < w.APP.SECTIONS.length; level++) {
    h.start({ level, seed: 7 + level });
    for (let k = 0; k < 10; k++) {
      const r = h.check(expected(h.state.task).value);
      assert.ok(r.ok, `раздел ${level + 1}: ${r.msg}`);
      h.next();
    }
  }
  assert.deepEqual(errors, []);
});

// ЗАМЕНИ/ДОБАВЬ: типичные ошибки темы называются по имени, например:
test('тренажёр: типичная ошибка называется', t => {
  const { window: w } = open(t, '?mode=home');
  const h = w.APP.home;
  h.start({ level: 0, seed: 1 });
  Object.assign(h.state, { task: { type: 'sum', a: -7, b: 3 }, wait: false, taskDone: false });
  const r = h.check({ n: 4, d: 1 });
  assert.equal(r.cat, 'sign');
});
