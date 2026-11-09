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

// ---------- этап 2: скачанный урок, файл правок, ссылка ----------
const pilotHTML = buildMaterial(PILOT);
const openPilot = (t, html = pilotHTML, { query = '?mode=board', storage = {}, url } = {}) => {
  const m = loadHtml(html, { query, slug: PILOT, beforeParse: w => { for (const [k, v] of Object.entries(storage)) w.localStorage.setItem(k, v); } });
  t.after(m.close);
  return m;
};
const qText = w => w.document.getElementById('bQ').innerHTML;
const kits = (w, html) => [...new w.DOMParser().parseFromString(html, 'text/html').querySelectorAll('#teacher-kit')];

test(`${PILOT}: «Скачать мой урок» — копия со вшитыми правками открывается сразу с ними, правится и скачивается снова`, t => {
  const { window: w } = openPilot(t);
  w.APP.edit.set('q', 'Вопрос учителя </script><img src=x onerror=alert(1)>');
  w.APP.edit.title('7Б, 12 ноября');
  const copy = w.APP.edit.lessonHTML();
  assert.equal((copy.match(/id="teacher-kit"/g) || []).length, 1, 'один вшитый комплект');
  assert.doesNotMatch(copy.match(/<script type="application\/json" id="teacher-kit">([\s\S]*?)<\/script>/)[1], /</, 'в комплекте нет «<»');
  assert.match(copy, /<title>7Б, 12 ноября — /);
  assert.equal(w.APP.edit.unsaved, false, 'после скачивания правки сохранены');

  const c = openPilot(t, copy), A = c.window.APP;
  assert.deepEqual(c.errors.map(e => e.message), [], 'копия открывается без ошибок');
  assert.equal(qText(c.window), 'Вопрос учителя', 'правка видна сразу, без вопроса; опасное вырезано');
  assert.ok(A.edit.file?.id, 'у копии свой комплект');
  assert.equal(A.edit.storeKey, 'kit:' + A.edit.file.id);
  assert.match(c.window.document.querySelector('#board .ttl').textContent, /7Б, 12 ноября/);
  // правим копию: изменение в её хранилище, файл напоминает скачать новую версию
  A.board.next(); A.board.next();
  A.edit.set('q', 'Вторая правка');
  assert.equal(A.edit.unsaved, true);
  const copy2 = A.edit.lessonHTML();
  assert.equal(kits(w, copy2).length, 1, 'при повторном скачивании комплект один');
  const c2 = openPilot(t, copy2);
  assert.notEqual(c2.window.APP.edit.file.id, A.edit.file.id, 'новая копия — новый комплект');
  assert.equal(Object.keys(c2.window.APP.edit.kit.edits).length, 2, 'в новой копии обе правки');

  // две копии одной темы в одном хранилище (файлы с диска в Chrome) не смешиваются
  const shared = { [`matshag:${PILOT}:${A.edit.storeKey}`]: JSON.stringify(A.edit.kit) };
  const other = openPilot(t, copy2, { storage: shared });
  assert.equal(Object.keys(other.window.APP.edit.kit.edits).length, 2);
  assert.equal(qText(other.window), 'Вопрос учителя');
  // а сам сайт своё хранилище не видит у копий и наоборот
  const site = openPilot(t, pilotHTML, { storage: shared });
  assert.equal(JSON.stringify(site.window.APP.edit.kit.edits), '{}');
});

test(`${PILOT}: файл правок — сохраняется и открывается; чужой и битый файл отклоняются понятно`, t => {
  const { window: w } = openPilot(t);
  w.APP.edit.set('q', 'Из файла');
  const json = w.APP.edit.kitJSON();
  const b = openPilot(t).window;
  b.APP.edit.toggle(true);
  b.APP.edit.offer(b.APP.edit.parseFile(json));
  assert.equal(qText(b), 'Из файла', 'своих правок нет — применяется сразу');
  // свои правки есть — спрашивает
  b.APP.board.next(); b.APP.board.next();
  b.APP.edit.set('q', 'Моя');
  b.APP.edit.offer(b.APP.edit.parseFile(json));
  assert.match(b.document.getElementById('edMsg').textContent, /Заменить ими ваши 2 правки/);
  b.document.querySelector('[data-eact="load-yes"]').click();
  assert.equal(Object.keys(b.APP.edit.kit.edits).length, 1);
  // из скачанного урока тоже можно взять правки
  assert.equal(Object.keys(b.APP.edit.parseFile(w.APP.edit.lessonHTML()).edits).length, 1);
  const bad = [
    ['{"matshag":1,"slug":"teorema-pifagora","edits":{}}', /к другому материалу/],
    ['{oops', /повреждён/],
    ['<html><body>нет</body></html>', /нет правок/],
    ['{"hello":1}', /не файл правок/],
  ];
  for (const [text, re] of bad) assert.throws(() => b.APP.edit.parseFile(text), re);
  // мусорные ключи и опасный текст из файла не проходят
  const k = b.APP.edit.parseFile(JSON.stringify({ matshag: 1, slug: PILOT, edits: { 'x': { o: 'a', t: 'b' }, 'main:0:q': { o: 'a', t: '<script>x()</script>ok' } } }));
  assert.equal(JSON.stringify(k.edits), JSON.stringify({ 'main:0:q': { o: 'a', t: 'ok' } }));
});

test(`${PILOT}: ссылка на урок — спрашивает «Применить?», переносит правки и числа`, async t => {
  const { window: w } = openPilot(t);
  w.APP.board.numbers(true);
  w.APP.edit.set('q', 'По ссылке');
  w.APP.edit.title('7А');
  const url = await w.APP.edit.link();
  assert.match(url, /^https:\/\/example\.test\/materials\/bukvennye-vyrazheniya\.html\?mode=board#kit=[jz]\./);
  const hash = url.slice(url.indexOf('#'));
  const e = JSON.parse(JSON.stringify(w.APP.board.e));

  const b = loadHtml(pilotHTML, { query: '?mode=board' + hash, slug: PILOT });
  t.after(b.close);
  await b.window.APP.edit.fromLink;
  const ask = b.window.document.getElementById('edAsk');
  assert.equal(ask.hidden, false, 'спрашивает');
  assert.match(b.window.document.getElementById('edAskP').textContent, /1 правка учителя — «7А»/);
  assert.equal(b.window.location.hash, '', 'адрес очищен');
  b.window.document.getElementById('edAskYes').click();
  assert.equal(qText(b.window), 'По ссылке');
  assert.deepEqual(JSON.parse(JSON.stringify(b.window.APP.board.e)), e, 'числа урока перенесены');

  const no = loadHtml(pilotHTML, { query: '?mode=board' + hash, slug: PILOT });
  t.after(no.close);
  await no.window.APP.edit.fromLink;
  no.window.document.getElementById('edAskNo').click();
  assert.notEqual(qText(no.window), 'По ссылке', '«Не применять» — исходный урок');

  const broken = loadHtml(pilotHTML, { query: '?mode=board#kit=j.bm90LWpzb24', slug: PILOT });
  t.after(broken.close);
  await broken.window.APP.edit.fromLink;
  assert.match(broken.window.document.getElementById('edAskP').textContent, /повреждена/);
  assert.equal(broken.window.document.getElementById('edAskYes').hidden, true);
  assert.deepEqual(broken.errors.map(x => x.message), []);
});

// ---------- этап 3: свои слайды ----------
const PNG = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

test(`${PILOT}: запись формул учителя`, t => {
  const M = openPilot(t).window.APP.edit.math;
  assert.equal(M('x^2 + 1'), '<i>x</i><sup>2</sup> + 1');
  assert.equal(M('a_1'), '<i>a</i><sub>1</sub>');
  assert.equal(M('sqrt(25) = 5'), '<span class="rt"><span class="rs">√</span><span class="rad">25</span></span> = 5');
  assert.equal(M('(a+1)/(b)'), '<span class="frac"><span><i>a</i>+1</span><span><i>b</i></span></span>');
  assert.equal(M('1/2'), '<span class="frac"><span>1</span><span>2</span></span>');
  assert.equal(M('3*a - 5'), '3·<i>a</i> − 5');
  assert.equal(M('из-за'), 'из-за', 'дефис в русском слове остаётся');
  assert.equal(M('x <= 3, y != 0'), '<i>x</i>  ≤  3, <i>y</i>  ≠  0');
  assert.equal(M('2^(n+1)'), '2<sup><i>n</i>+1</sup>');
  assert.equal(M('<b onclick=x>&'), '&lt;<i>b</i> <i>onclick</i>=<i>x</i>&gt;&amp;', 'разметка из текста не проходит');
  assert.equal(M('строка 1\nстрока 2'), 'строка 1<br>строка 2');
  assert.equal(M('a/'), '<i>a</i>/');
  assert.equal(M('(1'), '(1');
});

test(`${PILOT}: свой слайд — встаёт после шага, переживает перезагрузку и другие числа, правки шагов темы не сдвигаются`, t => {
  const { window: w, errors } = openPilot(t), A = w.APP, d = w.document;
  const n0 = A.board.steps.length;
  A.edit.toggle(true);
  A.board.go(0, 0);
  const id = A.edit.slide({ q: 'Сколько будет 3a + 2a?', a: '5a', rec: ['3a + 2a = 5a'], note: 'спросить у доски' });
  assert.equal(A.board.steps.length, n0 + 1);
  assert.equal(A.board.i, 1, 'слайд сразу после текущего шага');
  assert.equal(A.edit.mineSlide, id);
  assert.match(d.getElementById('bCnt').textContent, /Шаг 2 из \d+ · мой слайд/);
  assert.equal(qText(w), 'Сколько будет 3<i>a</i> + 2<i>a</i>?');
  assert.equal(d.querySelectorAll('#bRec .ln').length, 0, 'запись — после ответа');
  A.board.next();
  assert.equal(d.getElementById('bA').innerHTML, '5<i>a</i>');
  assert.equal(d.querySelector('#bRec .ln').innerHTML, '3<i>a</i> + 2<i>a</i> = 5<i>a</i>');
  assert.equal(d.getElementById('bQ').hasAttribute('contenteditable'), false, 'слайд правится в своём окне');
  // правка шага темы после слайда: ключ — номер шага темы
  A.board.go(2, 0);
  A.edit.set('q', 'Правка второго шага темы');
  assert.ok(A.edit.kit.edits['main:1:q'], 'ключ правки — шаг темы 2 (номер 1)');
  assert.deepEqual(errors.map(e => e.message), []);

  const kit = w.localStorage.getItem(`matshag:${PILOT}:kit`);
  const b = openPilot(t, pilotHTML, { storage: { [`matshag:${PILOT}:kit`]: kit } }).window;
  assert.equal(b.APP.board.steps[1]._mine, id, 'после перезагрузки слайд на месте');
  b.APP.board.go(2, 0);
  assert.equal(qText(b), 'Правка второго шага темы');
  for (let k = 0; k < 3; k++) {
    b.APP.board.numbers(true);
    assert.equal(b.APP.board.steps[1]._mine, id, 'другие числа — слайд после того же шага');
  }
  b.APP.board.go(0, 0);
  for (let k = 0; k < 2 * b.APP.board.steps.length; k++) b.APP.board.next();
  for (let k = 0; k < 2 * b.APP.board.steps.length; k++) b.APP.board.prev();
  assert.equal(b.APP.board.i, 0);
});

test(`${PILOT}: чертёж слайда — шаг урока или картинка; опасная картинка не проходит`, t => {
  const { window: w } = openPilot(t), A = w.APP, d = w.document;
  A.edit.toggle(true);
  A.board.go(1, 0);
  A.edit.slide({ q: 'Картинка', pic: { kind: 'img', src: PNG } });
  assert.equal(d.querySelector('#bStage image').getAttribute('href'), PNG);
  A.edit.slide({ q: 'Чертёж шага 2', pic: { kind: 'step', i: 1 } });
  assert.ok(d.querySelectorAll('#bStage svg text').length > 0, 'чертёж шага урока на слайде');
  const id = A.edit.slide({ q: 'Плохая', pic: { kind: 'img', src: 'javascript:alert(1)' } });
  assert.equal(A.edit.kit.slides.find(s => s.id === id).pic.kind, 'none');
  assert.equal(d.querySelector('#bStage image'), null);
  assert.equal(A.edit.slide({ q: '  ', a: '' }), null, 'пустой слайд не добавляется');
});

test(`${PILOT}: слайды переставляются, убираются; «Вернуть весь урок» убирает и их`, t => {
  const { window: w } = openPilot(t), A = w.APP;
  A.edit.toggle(true);
  A.board.go(0, 0);
  const s1 = A.edit.slide({ q: 'Первый' });
  const s2 = A.edit.slide({ q: 'Второй' });
  const order = () => A.board.steps.map(s => s._mine || 'T' + s._ti).slice(0, 5).join(' ');
  assert.equal(order(), `T0 ${s1} ${s2} T1 T2`);
  A.edit.slideMove(s2, -1);
  assert.equal(order(), `T0 ${s2} ${s1} T1 T2`);
  A.edit.slideMove(s1, 1);
  assert.equal(order(), `T0 ${s2} T1 ${s1} T2`, 'через шаг темы вниз');
  A.edit.slideMove(s2, -1);
  assert.equal(order(), `${s2} T0 T1 ${s1} T2`, 'в начало урока');
  A.edit.slideMove(s2, -1);
  assert.equal(order(), `${s2} T0 T1 ${s1} T2`, 'выше начала некуда');
  A.edit.slideDel(s1);
  assert.equal(order(), `${s2} T0 T1 T2 T3`);
  A.edit.revertAll();
  assert.equal(A.edit.kit.slides.length, 0);
  assert.ok(A.board.steps.every(s => !s._mine));
});

test(`${PILOT}: слайды в скачанном уроке, файле и ссылке; потерянный шаг — слайд в конце`, async t => {
  const { window: w } = openPilot(t), A = w.APP;
  A.board.go(0, 0);
  const id = A.edit.slide({ q: 'Со скачанной картинкой', pic: { kind: 'img', src: PNG } });
  const copy = openPilot(t, A.edit.lessonHTML()).window;
  assert.equal(copy.APP.board.steps[1]._mine, id);
  copy.APP.board.go(1, 0);
  assert.equal(copy.document.querySelector('#bStage image').getAttribute('href'), PNG, 'картинка в скачанном уроке');
  assert.equal(A.edit.parseFile(A.edit.kitJSON()).slides[0].pic.kind, 'img', 'картинка в файле правок');
  const url = await A.edit.link();
  const b = loadHtml(pilotHTML, { query: '?mode=board' + url.slice(url.indexOf('#')), slug: PILOT });
  t.after(b.close);
  await b.window.APP.edit.fromLink;
  b.window.document.getElementById('edAskYes').click();
  const sl = b.window.APP.edit.kit.slides[0];
  assert.equal(sl.id, id);
  assert.equal(sl.pic.kind, 'none', 'картинки в ссылку не кладём');

  const lost = JSON.stringify({ matshag: 1, slug: PILOT, edits: {}, slides: [{ id: 'old1', after: { i: 3, fp: 'zzzz' }, q: 'Шаг темы изменился', a: '', rec: [], pic: { kind: 'none' } }] });
  const L = openPilot(t, pilotHTML, { storage: { [`matshag:${PILOT}:kit`]: lost } }).window;
  const last = L.APP.board.steps.at(-1);
  assert.equal(last._mine, 'old1');
  assert.equal(last._lost, true);
});

test(`${PILOT}: повреждённый вшитый комплект — урок открывается, учитель видит причину`, t => {
  const broken = pilotHTML.replace('<body>', '<body><script type="application/json" id="teacher-kit">{"matshag":1,oops</' + 'script>');
  const m = openPilot(t, broken);
  assert.deepEqual(m.errors.map(e => e.message), []);
  m.window.APP.edit.toggle(true);
  assert.match(m.window.document.getElementById('edMsg').textContent, /не прочитались: файл повреждён/);
});

for (const slug of [...SLUGS, ...(process.env.MATSHAG_CHECK_SLUG ? [] : [TEMPLATE])]) {
  test(`${slug}: свой слайд посреди урока — доска проходит все шаги без ошибок`, t => {
    const html = slug === TEMPLATE ? buildTemplate() : buildMaterial(slug);
    const m = loadHtml(html, { query: '?mode=board', slug });
    t.after(m.close);
    const A = m.window.APP;
    A.board.go(Math.floor(A.board.steps.length / 2), 0);
    A.edit.slide({ q: 'x^2 = 4', a: 'x = 2 или x = -2', rec: ['x_1 = 2', 'x_2 = -2'], pic: { kind: 'step', i: 0 } });
    A.board.go(0, 0);
    for (let k = 0; k < 2 * A.board.steps.length; k++) A.board.next();
    for (let k = 0; k < 2 * A.board.steps.length; k++) A.board.prev();
    A.board.numbers(true);
    assert.ok(A.board.steps.some(s => s._mine));
    assert.deepEqual(m.errors.map(e => e.message), []);
  });
}
