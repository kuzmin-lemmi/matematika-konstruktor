import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTemplate, TEMPLATE } from './template.mjs';
import { loadHtml } from '../tools/load.mjs';

const html = buildTemplate().replace('print: {', 'print: { formats: ["test"], defaultKind: "test", label: "Самостоятельная", answerTable: true,')
  .replace('const PRINT = {', 'const PRINT = { testInstr: "Запиши вычисление.",');
test('печать: выбранный формат открывается со старта и без параметров; лишних кнопок нет', t => {
  const m = loadHtml(html, { slug: TEMPLATE }); t.after(m.close);
  const d = m.window.document, A = m.window.APP;
  const buttons = [...d.querySelectorAll('#start [data-go="print"]')];
  assert.deepEqual(buttons.map(b => b.dataset.kind), ['test']);
  buttons[0].click();
  assert.equal(d.getElementById('pKind').value, 'test');
  assert.equal(d.querySelectorAll('[data-kind-set]').length, 0);
  assert.match(d.getElementById('pSheets').textContent, /Запиши вычисление/);
  assert.ok(d.querySelector('.test-work table.ans'));
  assert.ok(A.makeVariant(4817).word, 'старый генератор кодового слова доступен');
  assert.deepEqual(m.errors, []);
});
test('печать: сохранённый скрытый формат заменяется выбранным, явная старая ссылка работает', t => {
  for (const query of ['?mode=print', '?mode=print&kind=word', '?mode=print&kind=unknown']) {
    const m = loadHtml(html, { slug: TEMPLATE, query, beforeParse(w) { w.localStorage.setItem(`matshag:${TEMPLATE}:printKind`, 'word'); } });
    t.after(m.close);
    assert.equal(m.window.document.getElementById('pKind').value, query.includes('kind=word') ? 'word' : 'test');
    assert.deepEqual(m.errors, []);
  }
});
