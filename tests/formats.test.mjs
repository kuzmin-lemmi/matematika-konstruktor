// Форматы ядра для каждой темы: печатные (билет на выход, самостоятельная, тест с выбором, взаимопроверка,
// лесенка подсказок, домино, «найди ошибку»), расшифровка ловушек в ключе кодового слова
// и виды показа на доске (разминка, диктант, «верно — неверно», «найди ошибку»).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildMaterial } from '../tools/build.mjs';
import { loadHtml } from '../tools/load.mjs';
import { ROOT, isSlug } from '../tools/paths.mjs';

const SLUGS = readdirSync(join(ROOT, 'materials')).filter(isSlug);
const BAD = /undefined|NaN|\[object Object\]/;
const plain = x => JSON.parse(JSON.stringify(x));

for (const slug of SLUGS) {
  const html = buildMaterial(slug);
  const open = (t, query = '') => { const m = loadHtml(html, { query, slug }); t.after(m.close); return m; };

  test(`${slug}: печатные форматы ядра — один номер, один лист; ключ и разметка без ошибок`, t => {
    const { window: w, errors } = open(t, '?mode=print');
    const A = w.APP, kinds = Object.keys(A.CORE_SHEETS).filter(k => A.SHEETS[k] === A.CORE_SHEETS[k]);
    for (const k of ['test', 'choice', 'pair', 'ladder']) assert.ok(kinds.includes(k), `${k} есть у каждой темы`);
    assert.ok(Object.values(A.SHEETS).filter(f => f.label === 'Билет на выход').length === 1, 'ровно один билет на выход: свой у темы или ядра');
    for (const kind of kinds) {
      for (let i = 0; i < 30; i++) {
        const n = 1000 + i * 293, v = A.printVariant(n, kind);
        assert.equal(JSON.stringify(v), JSON.stringify(A.printVariant(n, kind)), `${kind}: один номер — один лист`);
        assert.equal(v.label, `${A.GEN_VERSION}-${n}`, `${kind}: подпись`);
        assert.doesNotMatch(A.SHEETS[kind].sheet(v, true) + A.SHEETS[kind].sheet(v, false), BAD, `${kind}: лист`);
        assert.doesNotMatch(A.SHEETS[kind].key([v]), BAD, `${kind}: ключ`);
      }
      // лист открывается на экране: печать, ссылка ?kind=, два номера
      const m = open(t, `?mode=print&kind=${kind}`);
      m.window.APP.print.nums = [4817, 1234, 5555, 6001, 7002];
      m.window.APP.print.draw();
      const sheets = m.window.document.getElementById('pSheets');
      assert.ok(sheets.querySelectorAll('.page.key').length === 1, `${kind}: ключ`);
      assert.ok(sheets.querySelectorAll('.page:not(.key)').length >= 1, `${kind}: листы`);
      assert.doesNotMatch(sheets.innerHTML, BAD, `${kind}: разметка`);
      assert.deepEqual(m.errors, [], `${kind}: ошибки страницы`);
    }
    assert.deepEqual(errors, []);
  });

  test(`${slug}: билет — четыре на лист; самостоятельная — баллы и шкала; домино — кольцо`, t => {
    const { window: w } = open(t, '?mode=print&kind=exit');
    const A = w.APP, d = w.document;
    if (A.SHEETS.exit === A.CORE_SHEETS.exit) {
      A.print.nums = [1111, 2222, 3333, 4444, 5555]; A.print.draw();
      assert.equal(d.querySelectorAll('.page.exit-tickets').length, 2, '5 билетов — 2 листа по 4');
      assert.equal(d.querySelectorAll('.exit-ticket').length, 5);
    }
    const test_ = A.printVariant(1234, 'test');
    assert.equal(test_.points.length, test_.tasks.length, 'баллы за каждое задание');
    assert.match(A.SHEETS.test.key([test_]), /Оценка «5» — от \d+ баллов/);
    if (A.SHEETS.domino) for (let i = 0; i < 30; i++) {
      const v = A.printVariant(1000 + i * 293, 'domino'), n = v.tiles.length;
      assert.equal(new Set(v.answers).size, v.answers.length, 'ответы костяшек различны');
      assert.deepEqual([...v.order].sort((a, b) => a - b), [...Array(n).keys()], 'все костяшки на листе');
      v.tasks.forEach((task, k) => assert.equal(v.tiles[(k + 1) % n].left, A.TYPES[task.type].keyHTML(task), 'ответ задания — на соседней костяшке (кольцо)'));
    }
  });

  test(`${slug}: «найди ошибку» — в решении ровно одна неверная строка и верная запись`, t => {
    const { window: w } = open(t, '?mode=print');
    const A = w.APP, types = Object.keys(A.TYPES).filter(k => typeof A.TYPES[k].mistake === 'function');
    if (!types.length) return t.skip('у темы нет T.mistake');
    for (const type of types) {
      const rnd = A.mulberry32(type.length * 4421);
      for (let i = 0; i < 120; i++) {
        const task = A.generate(type, rnd), m = plain(A.TYPES[type].mistake(task, rnd));
        assert.ok(m.lines.length >= 2, `${type}: решение из нескольких строк`);
        assert.ok(Number.isInteger(m.at) && m.at >= 0 && m.at < m.lines.length, `${type}: номер строки`);
        assert.notEqual(m.lines[m.at], m.fix, `${type}: ошибочная строка отличается от верной`);
        assert.ok(m.why && m.why.length > 15 && /\d|[a-zа-я]/i.test(m.why), `${type}: объяснение`);
        assert.doesNotMatch(m.lines.join() + m.fix + m.why, BAD, `${type}: текст`);
      }
    }
    assert.ok(A.SHEETS.errors, 'печатный формат «найди ошибку» подключён');
  });

  test(`${slug}: виды показа на доске — шаги листаются, ответы и подсказки на месте`, t => {
    const { window: w } = open(t, '?mode=board');
    const A = w.APP, shows = Object.entries(A.SHOWS).filter(([, s]) => s.available());
    assert.equal(A.board.show, 'main');
    for (const [name, S] of shows) {
      const m = open(t, `?mode=board&show=${name}`), B = m.window.APP.board, d = m.window.document;
      assert.equal(B.show, name, `${name}: открыт по адресу`);
      for (let round = 0; round < 8; round++) {
        if (round) B.numbers(true);
        const n = B.steps.length;
        assert.ok(n >= 3, `${name}: не меньше трёх шагов`);
        for (const st of B.steps) assert.ok(st.q && st.a && st.note, `${name}: у шага есть вопрос, ответ и подсказка`);
        let guard = 0;
        while (!(B.i === n - 1 && B.phase === 1) && guard++ < 200) B.next();
        assert.equal(B.i, n - 1);
        while (!(B.i === 0 && B.phase === 0) && guard++ < 400) B.prev();
        assert.doesNotMatch(d.getElementById('board').innerHTML, BAD, `${name}: разметка`);
      }
      assert.equal(d.getElementById('bTimer').hidden, !S.timer, `${name}: таймер только у разминки и диктанта`);
      assert.deepEqual(m.errors, [], name);
    }
    // переключатель видов показа
    if (shows.length) {
      const B = A.board; B.useShow(shows[0][0]);
      assert.equal(B.show, shows[0][0]); B.useShow('main'); assert.equal(B.show, 'main');
      assert.ok(w.document.getElementById('bShow'), 'список видов показа в панели доски');
    }
  });

  test(`${slug}: показ темы не изменился после переключения видов`, t => {
    const { window: w } = open(t, '?mode=board');
    const B = w.APP.board, before = JSON.stringify(B.steps.map(s => [typeof s.q === 'function' ? 'f' : s.q, typeof s.a === 'function' ? 'f' : s.a]));
    for (const [name, S] of Object.entries(w.APP.SHOWS)) if (S.available()) B.useShow(name);
    B.useShow('main');
    assert.equal(JSON.stringify(B.steps.map(s => [typeof s.q === 'function' ? 'f' : s.q, typeof s.a === 'function' ? 'f' : s.a])), before);
  });

  test(`${slug}: ключ кодового слова — буквы-ловушки с расшифровкой ошибок`, t => {
    const { window: w } = open(t, '?mode=print');
    const A = w.APP;
    for (let i = 0; i < 30; i++) {
      const v = A.makeVariant(1000 + i * 293), html = A.SHEETS.word.key([v]), box = w.document.createElement('div');
      box.innerHTML = html;
      const legend = [...box.querySelectorAll('.diag li')].map(li => li.textContent);
      const names = Object.values(A.CATS || w.eval('CATS')).map(c => c[0]);
      for (const name of legend) assert.ok(names.includes(name), `расшифровка — название ошибки из CATS: ${name}`);
      const cells = [...box.querySelectorAll('tbody tr, tr')].pop().querySelectorAll('td');
      for (const sup of box.querySelectorAll('.trp sup')) assert.ok(+sup.textContent >= 1 && +sup.textContent <= legend.length, 'номер ошибки есть в расшифровке');
      for (const trp of box.querySelectorAll('.trp')) for (const ch of trp.textContent.replace(/[0-9\s]/g, '')) assert.ok(v.bank.some(b => b.letter === ch), `буква ${ch} есть в таблице букв`);
      assert.ok(cells.length >= v.tasks.length);
    }
  });

  test(`${slug}: тест с выбором — один верный ответ из 2–4 различных, трафарет совпадает с ключом`, t => {
    const { window: w } = open(t, '?mode=print');
    const A = w.APP;
    for (let i = 0; i < 30; i++) {
      const v = A.printVariant(1000 + i * 293, 'choice');
      v.options.forEach((o, k) => {
        assert.ok(o.length >= 2 && o.length <= 4, 'от двух до четырёх вариантов ответа');
        assert.equal(o.filter(x => x.ok).length, 1, 'ровно один верный');
        assert.equal(new Set(o.map(x => x.html)).size, o.length, 'варианты ответа различны');
        assert.equal('АБВГ'[o.findIndex(x => x.ok)], v.answers[k]);
        const T = A.TYPES[v.tasks[k].type];
        if (T.input !== 'choice') assert.equal(o.find(x => x.ok).html, T.keyHTML(v.tasks[k]), 'верный вариант — ответ задания');
      });
      const box = w.document.createElement('div'); box.innerHTML = A.SHEETS.choice.key([v]);
      const rows = [...box.querySelectorAll('table.stencil tr')].slice(1);
      rows.forEach((r, k) => assert.equal('АБВГ'[[...r.querySelectorAll('td')].findIndex(td => td.classList.contains('on'))], v.answers[k], 'трафарет'));
    }
  });

  test(`${slug}: взаимопроверка — листы А и Б разные, у каждого внизу ответы соседа`, t => {
    const { window: w } = open(t, '?mode=print');
    const A = w.APP;
    for (let i = 0; i < 30; i++) {
      const v = A.printVariant(1000 + i * 293, 'pair');
      assert.notEqual(JSON.stringify(v['А']), JSON.stringify(v['Б']), 'листы А и Б различны');
      const box = w.document.createElement('div'); box.innerHTML = A.SHEETS.pair.sheet(v);
      const [a, b] = box.querySelectorAll('.sheet');
      assert.ok(a && b, 'на странице два листа');
      const keys = s => v[s].map(t => A.TYPES[t.type].keyHTML(t));
      const peer = el => el.querySelector('.peer').innerHTML;
      keys('Б').forEach((k, j) => assert.ok(peer(a).includes(`${j + 1}) ${k}`), 'на листе А — ответы Б'));
      keys('А').forEach((k, j) => assert.ok(peer(b).includes(`${j + 1}) ${k}`), 'на листе Б — ответы А'));
    }
  });

  test(`${slug}: лесенка — у каждого задания две подсказки из тренажёра`, t => {
    const { window: w } = open(t, '?mode=print');
    const A = w.APP;
    for (let i = 0; i < 30; i++) {
      const v = A.printVariant(1000 + i * 293, 'ladder');
      v.tasks.forEach((task, k) => assert.deepEqual([...v.hints[k]], [...A.TYPES[task.type].hints(task)].slice(0, 2)));
      const box = w.document.createElement('div'); box.innerHTML = A.SHEETS.ladder.sheet(v);
      assert.equal(box.querySelectorAll('.lrow').length, v.tasks.length);
      assert.equal(box.querySelectorAll('.lrow .hint').length, v.tasks.length * 2);
    }
  });
}
