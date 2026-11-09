// Правка урока учителем (core/edit.js): на каждой теме правка сохраняется, переживает перезагрузку,
// не встаёт на чужие числа, снимается «Как было»; превью на сайте и ученики видят исходный материал.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildMaterial } from '../tools/build.mjs';
import { loadHtml } from '../tools/load.mjs';
import { ROOT, isSlug } from '../tools/paths.mjs';
import { TEMPLATE, buildTemplate } from './template.mjs';

const SLUGS = readdirSync(join(ROOT, 'materials')).filter(isSlug).filter(s => !process.env.MATSHAG_CHECK_SLUG || s === process.env.MATSHAG_CHECK_SLUG);
const PILOT = 'bukvennye-vyrazheniya';

for (const slug of [...SLUGS, ...(process.env.MATSHAG_CHECK_SLUG ? [] : [TEMPLATE])]) {
  const html = slug === TEMPLATE ? buildTemplate() : buildMaterial(slug);
  const open = (t, query = '?mode=board', kit = null) => {
    const m = loadHtml(html, { query, slug, beforeParse: kit ? w => w.localStorage.setItem(`matshag:${slug}:kit`, kit) : undefined });
    t.after(m.close);
    return m;
  };
  const kitOf = w => w.localStorage.getItem(`matshag:${slug}:kit`);

  test(`${slug}: правка учителя — сохраняется, переживает перезагрузку, «Как было» возвращает тему`, t => {
    const { window: w, errors } = open(t);
    const A = w.APP, d = w.document, q = () => d.getElementById('bQ').innerHTML;
    A.edit.toggle(true);
    assert.equal(d.getElementById('bQ').getAttribute('contenteditable'), 'true', 'в режиме правки поле редактируется');
    const orig = q();
    A.edit.set('q', 'Мой вопрос: <b>сколько</b> будет 2 + 2?');
    assert.equal(q(), 'Мой вопрос: <b>сколько</b> будет 2 + 2?');
    A.board.next();
    A.edit.set('rec', 'первая строка<br>вторая строка');
    assert.deepEqual([...d.querySelectorAll('#bRec .ln')].map(x => x.innerHTML), ['первая строка', 'вторая строка']);
    A.edit.toggle(false);
    assert.equal(d.getElementById('bQ').hasAttribute('contenteditable'), false);
    const kit = kitOf(w);
    assert.ok(kit, 'комплект сохранён в браузере');
    assert.deepEqual(errors.map(e => e.message), []);

    // перезагрузка: те же числа примера и та же правка
    const { window: w2 } = open(t, '?mode=board', kit);
    const q2 = () => w2.document.getElementById('bQ').innerHTML;
    assert.equal(q2(), 'Мой вопрос: <b>сколько</b> будет 2 + 2?', 'правка видна после перезагрузки');
    assert.deepEqual(JSON.parse(JSON.stringify(w2.APP.board.e)), JSON.parse(kit).e ?? JSON.parse(JSON.stringify(w2.APP.board.e)), 'числа урока учителя');
    // другие числа: правка стоит, только если исходный текст поля тот же
    for (let k = 0; k < 4; k++) {
      w2.APP.board.numbers(true);
      const now = w2.APP.board.steps[0].q, base = typeof now === 'function' ? now(w2.APP.board.model, 0) : now;
      assert.equal(q2(), base === orig ? 'Мой вопрос: <b>сколько</b> будет 2 + 2?' : base, 'правка не встаёт на другие числа');
    }
    w2.APP.edit.mine();
    assert.equal(q2(), 'Мой вопрос: <b>сколько</b> будет 2 + 2?', '«Числа моего урока» возвращает правку');
    w2.APP.edit.toggle(true);
    w2.APP.edit.revertStep();
    assert.equal(q2(), orig, '«Вернуть шаг как было»');
    w2.APP.edit.revertAll();
    assert.deepEqual(JSON.parse(kitOf(w2)).edits, {});
  });

  test(`${slug}: превью на сайте и ученики правок не видят`, t => {
    const { window: w } = open(t);
    w.APP.edit.set('q', 'Правка учителя');
    const kit = kitOf(w);
    const p = open(t, '?mode=board&preview=1', kit).window;
    assert.notEqual(p.document.getElementById('bQ').innerHTML, 'Правка учителя', 'превью показывает исходный материал');
    assert.equal(p.document.getElementById('bEditBtn').hidden, true);
    const s = open(t, '?mode=home&student=1', kit).window;
    assert.equal(s.document.getElementById('bEditBtn').hidden, true);
  });
}

test('очистка правки: скрипты, картинки и обработчики не проходят, оформление и формулы остаются', t => {
  const m = loadHtml(buildMaterial(PILOT), { query: '?mode=board', slug: PILOT });
  t.after(m.close);
  const c = m.window.APP.edit.clean;
  assert.equal(c('<img src=x onerror="alert(1)">Привет<script>alert(2)</script>'), 'Привет');
  assert.equal(c('<b onclick="x()">жирно</b> <a href="javascript:x()">ссылка</a>'), '<b>жирно</b> ссылка');
  assert.equal(c('<span class="frac"><span>1</span><span>2</span></span>'), '<span class="frac"><span>1</span><span>2</span></span>');
  assert.equal(c('<span style="color:red;fill:var(--b)">x</span>'), '<span style="fill:var(--b)">x</span>');
  assert.equal(c('строка<div>вторая</div>'), 'строка<br>вторая');
  assert.equal(c('1 &lt; 2 &amp; 3'), '1 &lt; 2 &amp; 3');
  assert.equal(c('<i>x</i><sup>2</sup> <b>и</b><br>ещё', 'svg'), '<tspan font-style="italic">x</tspan><tspan baseline-shift="super" font-size="70%">2</tspan> <tspan font-weight="bold">и</tspan> ещё');
  assert.equal(c('<tspan font-style="italic" onload="x()">a</tspan>', 'svg'), '<tspan font-style="italic">a</tspan>');
});

test(`${PILOT}: ввод в поле сохраняется сразу, клавиши не листают шаги`, t => {
  const m = loadHtml(buildMaterial(PILOT), { query: '?mode=board', slug: PILOT });
  t.after(m.close);
  const { APP: A, document: d, localStorage: ls, KeyboardEvent, InputEvent } = m.window;
  A.board.go(1, 0);
  A.edit.toggle(true);
  const q = d.getElementById('bQ');
  for (const key of ['ArrowRight', ' ', 'PageDown']) q.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
  assert.deepEqual([A.board.i, A.board.phase], [1, 0], 'печатаем в поле — шаг не меняется');
  q.innerHTML = 'Мой <b>вопрос</b><script>x()</script>';
  q.dispatchEvent(new InputEvent('input', { bubbles: true }));
  assert.equal(JSON.parse(ls.getItem(`matshag:${PILOT}:kit`)).edits['main:1:q'].t, 'Мой <b>вопрос</b>');
  assert.deepEqual(m.errors.map(e => e.message), []);
});

test(`${PILOT}: надпись на чертеже правится и переживает движение фишек`, t => {
  const m = loadHtml(buildMaterial(PILOT), { query: '?mode=board', slug: PILOT });
  t.after(m.close);
  const { APP: A, document: d } = m.window;
  A.board.go(1, 0);   // шаг с фишками: две группы «слагаемые с x», «слагаемые с y»
  A.edit.toggle(true);
  const first = [...d.querySelectorAll('#bStage text')].find(x => x.textContent.includes('слагаемые с'));
  const was = first.textContent, key = first.getAttribute('data-ed');
  const label = () => [...d.querySelectorAll('#bStage text')].find(x => x.textContent === was);
  A.edit.svg(key, 'сюда — <b>иксы</b>');
  assert.equal(label(), undefined, 'исходной надписи нет');
  const mine = () => [...d.querySelectorAll('#bStage text')].find(x => x.textContent === 'сюда — иксы');
  assert.ok(mine(), 'надпись учителя на чертеже');
  assert.match(mine().innerHTML, /<tspan font-weight="bold">иксы<\/tspan>/);
  const h = A.board.handles[0];
  A.board.drag(h.id, { x: h.at.x + 40, y: h.at.y + 10 });
  assert.ok(mine(), 'фишку подвинули — правка надписи на месте');
  assert.ok(d.getElementById('edList').textContent.includes('Надпись'), 'правка в списке шага');
  A.edit.revert(key);
  assert.ok(label(), '«Как было» вернуло надпись');
});
