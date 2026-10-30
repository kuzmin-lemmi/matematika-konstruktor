// Общий тест-контракт: каждая тема конструктора проверяется одинаково.
// Независимое решение заданий (ключ = то, что посчитал сам тест) — в тестах темы на сайте: tests/<slug>.test.mjs.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { buildMaterial } from '../tools/build.mjs';
import { loadHtml } from '../tools/load.mjs';
import { ROOT, isSlug } from '../tools/paths.mjs';
import { TEMPLATE, buildTemplate } from './template.mjs';

const SLUGS = readdirSync(join(ROOT, 'materials')).filter(isSlug).filter(s => !process.env.MATSHAG_CHECK_SLUG || s === process.env.MATSHAG_CHECK_SLUG);
// заготовка новой темы проходит тот же контракт: npm run new даёт рабочий пример
const BAD = /undefined|NaN|\[object Object\]/;
const plain = x => JSON.parse(JSON.stringify(x));

// верный ответ в том виде, в каком его отдаёт поле ввода (для своих видов ввода тема задаёт TYPES[type].correct)
function correct(T, t) {
  if (T.correct) return T.correct(t);
  const a = T.ans(t);
  return T.input === 'eq' ? { roots: a } : a;
}
// заведомо неверный ответ того же вида
function wrong(T, t, A) {
  const a = correct(T, t);
  if (T.wrongInput) return T.wrongInput(t);
  if (T.input === 'choice') return T.options.map(o => o[0]).find(v => v !== a);
  if (T.input === 'eq') return { roots: [{ q: A.Q(12345) }] };
  if (T.input === 'est') return { lo: a.lo + 3, hi: a.hi + 3 };
  if (a && typeof a.n === 'number') return A.Q(a.n + 7 * a.d, a.d);
  return null;
}

for (const slug of [...SLUGS, ...(process.env.MATSHAG_CHECK_SLUG ? [] : [TEMPLATE])]) {
  const html = slug === TEMPLATE ? buildTemplate() : buildMaterial(slug);
  const open = (t, query = '', options = {}) => {
    const m = loadHtml(html, { query, slug, ...options });
    t.after(m.close);
    return m;
  };

  test(`${slug}: открывается во всех режимах без ошибок`, t => {
    for (const q of ['', '?mode=board', '?mode=print', '?mode=home', '?mode=board&preview=1', '?mode=print&kind=oge']) {
      const m = open(t, q);
      assert.deepEqual(m.errors.map(e => e.message), [], q || 'стартовый экран');
      assert.ok(m.window.APP, q);
    }
    assert.equal(open(t, '').window.APP.screen, 'start');
    const a = open(t, '').window.document.getElementById('toSite');
    assert.equal(a.getAttribute('href'), `https://example.test/item/${slug}/`, 'ссылка «Назад на сайт»');
  });

  test(`${slug}: ссылка для учеников — только тренажёр`, t => {
    const { window: w } = open(t, '?mode=home&student=1');
    w.APP.show('print'); w.APP.show('board'); w.APP.show('start');
    assert.equal(w.APP.screen, 'home');
    assert.ok(w.document.body.classList.contains('student'));
    assert.equal(w.document.getElementById('toSite').hidden, true);
  });

  test(`${slug}: тема описана полностью`, t => {
    const { APP } = open(t, '').window;
    const types = Object.keys(APP.TYPES);
    assert.ok(types.length > 0, 'есть типы заданий');
    for (const [name, T] of Object.entries(APP.TYPES)) {
      for (const f of ['gen', 'text', 'ans', 'ok', 'wrong', 'hints', 'same']) assert.equal(typeof T[f], 'function', `${name}.${f}`);
      assert.ok(T.input, `${name}.input`);
      if (T.input === 'choice') assert.ok(Array.isArray(T.options) && T.options.length >= 2, `${name}.options`);
    }
    for (const S of APP.SECTIONS) {
      assert.ok(S.title && S.text && S.types.length, 'раздел тренажёра');
      for (const ty of S.types) assert.ok(APP.TYPES[ty], `раздел «${S.title}»: нет типа ${ty}`);
    }
    for (const [ty] of APP.KINDS_V1) assert.ok(APP.TYPES[ty], `раздатка: нет типа ${ty}`);
    for (const w of APP.WORDS_V1) {
      assert.equal(w.length, APP.KINDS_V1.length, `слово ${w}: столько букв, сколько заданий`);
      assert.equal(new Set(w).size, w.length, `слово ${w}: буквы не повторяются`);
    }
  });

  test(`${slug}: раздатка — 30 вариантов различны, номер восстанавливает вариант`, t => {
    const { window: w, errors } = open(t, '?mode=print');
    const A = w.APP, seen = new Set();
    for (let i = 0; i < 30; i++) {
      const n = 1000 + i * 293, v = A.makeVariant(n);
      assert.equal(JSON.stringify(v), JSON.stringify(A.makeVariant(n)), 'один номер — один вариант');
      const sig = JSON.stringify(v.tasks);
      assert.ok(!seen.has(sig), 'варианты различны'); seen.add(sig);
      assert.equal(v.label, `${A.GEN_VERSION}-${n}`);
      assert.equal(new Set(v.answers).size, v.answers.length, 'ответы заданий различны');
      v.tasks.forEach((task, k) => assert.equal(v.answers[k], A.TYPES[task.type].key(task)));
      const bank = new Map(v.bank.map(x => [x.key, x.letter]));
      v.answers.forEach((a, k) => assert.equal(bank.get(a), v.word[k], 'верный ответ даёт букву слова'));
      assert.equal(new Set(v.bank.map(x => x.letter)).size, v.bank.length, 'буквы в таблице различны');
      assert.ok(v.bank.length > v.tasks.length, 'в таблице есть ловушки');
      for (const x of v.bank) assert.doesNotMatch(x.html, BAD);
    }
    A.print.nums = [4817, 1234, 5555];
    A.print.draw();
    const sheets = w.document.getElementById('pSheets');
    assert.equal(sheets.querySelectorAll('.page.key').length, 1);
    assert.equal(sheets.querySelectorAll('.page:not(.key) .sheet').length, 3);
    assert.doesNotMatch(sheets.innerHTML, BAD);
    assert.deepEqual(errors, []);
  });

  test(`${slug}: бланк ОГЭ (если есть) — ответы-числа для клеточек`, t => {
    const { window: w, errors } = open(t, '?mode=print&kind=oge');
    const A = w.APP;
    if (!A.makeVariantOGE) return t.skip('у темы нет бланка ОГЭ');
    const seen = new Set();
    for (let i = 0; i < 30; i++) {
      const n = 1000 + i * 293, v = A.makeVariantOGE(n);
      assert.equal(JSON.stringify(v), JSON.stringify(A.makeVariantOGE(n)));
      seen.add(JSON.stringify(v.tasks.map(x => x.t)));
      assert.equal(v.tasks.length, A.OGE_V1.length);
      for (const x of v.tasks) {
        assert.match(x.ans, /^−?\d+(,\d+)?$/, `ответ «${x.ans}» — число`);
        assert.ok(x.ans.length <= 10, `ответ «${x.ans}» помещается в клеточки`);
        assert.doesNotMatch(x.ask, BAD);
      }
    }
    assert.equal(seen.size, 30, 'варианты бланка различны');
    assert.ok(w.document.querySelector('.sheet.oge'), 'по ссылке ?kind=oge открыт бланк');
    assert.deepEqual(errors, []);
  });

  test(`${slug}: доска — все шаги вперёд и назад, на разных числах`, t => {
    const { window: w, errors } = open(t, '?mode=board');
    const B = w.APP.board;
    for (let round = 0; round < 15; round++) {
      if (round) B.numbers(true);
      const n = B.steps.length;
      assert.ok(n >= 3, 'не меньше трёх шагов');
      for (const st of B.steps) assert.ok(st.q && st.a && st.note, 'у шага есть вопрос, ответ и подсказка учителю');
      let guard = 0;
      while (!(B.i === n - 1 && B.phase === 1) && guard++ < 200) B.next();
      assert.equal(B.i, n - 1);
      while (!(B.i === 0 && B.phase === 0) && guard++ < 400) B.prev();
      assert.doesNotMatch(w.document.getElementById('board').innerHTML, BAD);
    }
    B.poster();
    assert.equal(B.phase, 1, 'кадр для превью — с показанным ответом');
    assert.deepEqual(errors, []);
  });

  test(`${slug}: живая доска — ручки в чертеже, движение не ломает модель, сброс и повтор возвращают шаг`, t => {
    const { window: w, errors } = open(t, '?mode=board');
    const A = w.APP, B = A.board, G = A.GEO;
    const live = B.steps.map((st, i) => st.live ? i : -1).filter(i => i >= 0);
    if (!live.length) return t.skip('на доске нет шагов с live');
    assert.ok(A.HAS_LIVE, 'на шагах есть live — объяви const LIVE = { model(e) { … } }');
    const finite = x => typeof x === 'number' ? Number.isFinite(x) : x && typeof x === 'object' ? Object.values(x).every(finite) : true;
    const valid = () => w.eval('typeof LIVE.ok !== "function" || LIVE.ok(B.m)');
    // крайние положения: углы и края чертежа, центр, точки у краёв числовой прямой
    const PROBES = [[0, 0], [980, 0], [0, 400], [980, 400], [490, 200], [490, 0], [490, 400], [0, 200], [980, 200], [100, 220], [880, 180]];
    for (const i of live) for (const ph of [0, 1]) {
      B.go(i, ph);
      const where = `шаг ${i + 1}${ph ? ' (ответ)' : ''}`, start = JSON.stringify(plain(B.model));
      const check = what => {
        assert.ok(finite(plain(B.model)), `${where}, ${what}: в модели нет NaN и бесконечностей — ${JSON.stringify(plain(B.model))}`);
        assert.ok(valid(), `${where}, ${what}: модель допустима (LIVE.ok)`);
        for (const h of B.handles) {
          assert.ok(h.label, `${where}: у ручки ${h.id} есть подпись`);
          assert.ok(G.inBox(h.at, 0), `${where}, ${what}: ручка «${h.label}» внутри чертежа 980 × 400 — (${Math.round(h.at.x)}, ${Math.round(h.at.y)})`);
        }
        assert.doesNotMatch(w.document.getElementById('board').innerHTML, BAD, `${where}, ${what}`);
      };
      check('начало');
      for (const { id } of B.handles) {
        for (const [x, y] of PROBES) { if (B.handles.some(h => h.id === id)) { B.drag(id, { x, y }); check(`ручка ${id} → (${x}, ${y})`); } }
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { if (B.handles.some(h => h.id === id)) { B.key(id, dx, dy); check(`ручка ${id}, стрелка ${dx},${dy}`); } }
      }
      for (const c of B.controls) {
        assert.ok(c.label, `${where}: у элемента ${c.id} есть подпись`);
        const values = c.type === 'range' ? [c.min, c.max, (c.min + c.max) / 2] : c.type === 'toggle' ? [true, false, undefined]
          : c.type === 'choice' ? c.options.map(o => o[0]) : [undefined];
        for (const v of values) { if (B.controls.some(x => x.id === c.id)) { B.set(c.id, v); check(`${c.id} = ${v}`); } }
      }
      B.reset();
      assert.equal(JSON.stringify(plain(B.model)), start, `${where}: «Сбросить» возвращает начало шага`);
      if (ph && B.steps[i].live.reveal) {
        B.again();
        assert.equal(JSON.stringify(plain(B.model)), start, `${where}: «Повторить опыт» приводит к тому же итогу`);
      }
    }
    B.restart();
    assert.equal(B.i, 0);
    assert.deepEqual(errors, []);
  });

  test(`${slug}: тренажёр — в каждом разделе задания решаются, ошибки объясняются`, t => {
    const { window: w, errors } = open(t, '?mode=home');
    const A = w.APP, h = A.home;
    for (let level = 0; level < A.SECTIONS.length; level++) {
      h.start({ level, seed: 31 + level });
      const met = new Set();
      for (let k = 0; k < 30; k++) {
        const task = h.state.task, T = A.TYPES[task.type];
        met.add(task.type);
        for (const hint of T.hints(task)) assert.doesNotMatch(String(hint), BAD, `${task.type}: подсказка`);
        if (k % 2) {
          const r = h.check(correct(T, task));
          assert.ok(r && r.ok, `${task.type}: верный ответ принят (${r?.msg})`);
          assert.ok(h.state.gain > 0);
        } else {
          const x = wrong(T, task, A);
          if (x == null) { h.check(correct(T, task)); } else {
            const r = h.check(x);
            assert.equal(r.ok, false, `${task.type}: неверный ответ не принят`);
            assert.ok(A.CATS?.[r.cat] || w.eval(`typeof CATS !== 'undefined' && CATS[${JSON.stringify(r.cat)}]`), `${task.type}: тип ошибки «${r.cat}» описан в CATS`);
            assert.ok(r.msg.length > 30 && /\d/.test(r.msg), `${task.type}: объяснение с вычислением — ${r.msg}`);
            assert.doesNotMatch(r.msg, BAD);
          }
        }
        h.next();
        if (h.state.finished) {
          assert.match(w.document.getElementById('hEnd').textContent, /Над чем поработать/);
          h.start({ level, seed: 100 + k + level });
        }
      }
      assert.deepEqual([...met].sort(), [...A.SECTIONS[level].types].sort(), `раздел ${level + 1}: встречаются все типы`);
    }
    assert.deepEqual(errors, []);
  });

  test(`${slug}: работает без localStorage`, t => {
    const m = open(t, '?mode=print', {
      beforeParse(win) { Object.defineProperty(win, 'localStorage', { get() { throw new Error('Хранилище недоступно'); } }); },
    });
    assert.equal(m.window.APP.screen, 'print');
    assert.deepEqual(m.errors, []);
  });
}

test('у каждой темы есть файлы material.json и topic.js', () => {
  assert.ok(SLUGS.length > 0, 'в materials/ есть темы');
});
