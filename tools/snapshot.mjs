// Снимок поведения материала: node tools/snapshot.mjs <slug> [файл.html] [--ui]
//   frozen — варианты раздатки и задания генератора. На них уже могут быть напечатанные листы,
//            поэтому собранный материал обязан давать ровно то же (проверяет tests/snapshot.test.mjs).
//   --ui   — ещё и разметка доски, листов, стартового экрана и справки: нужна, когда материал
//            переносят на ядро, чтобы убедиться, что ничего не поменялось. В тестах не участвует.
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadFile } from './load.mjs';
import { readConfig, outFile } from './paths.mjs';

export function frozen(file, slug) {
  const m = loadFile(file, { query: '?mode=print', slug });
  const A = m.window.APP;
  const nums = Array.from({ length: 30 }, (_, i) => 1000 + i * 293);
  const plain = x => JSON.parse(JSON.stringify(x));
  const word = nums.map(n => { const v = A.makeVariant(n); return { label: v.label, tasks: v.tasks, answers: v.answers, word: v.word, bank: v.bank.map(b => [b.key, b.letter]) }; });
  const oge = A.makeVariantOGE ? nums.map(n => { const v = A.makeVariantOGE(n); return { label: v.label, tasks: v.tasks.map(x => ({ kind: x.kind, t: x.t, big: x.big })), answers: v.answers }; }) : null;
  const gen = {};
  for (const type of Object.keys(A.TYPES)) {
    const rnd = A.mulberry32(type.length * 7919 + 13);
    gen[type] = Array.from({ length: 40 }, () => A.generate(type, rnd));
  }
  // форматы темы (TOPIC_SHEETS) замораживаются всегда; форматы ядра (билет, самостоятельная, домино, «найди ошибку») —
  // в ключе core: тест сравнивает его, только если он есть в снимке (старые темы сняты до появления этих форматов)
  const fmts = keys => Object.fromEntries(keys.map(k => [k, nums.map(n => ({ variant: A.printVariant(n, k), key: A.SHEETS[k].key([A.printVariant(n, k)]) }))]));
  const isCore = k => A.CORE_SHEETS[k] && A.SHEETS[k] === A.CORE_SHEETS[k];
  const formats = fmts(Object.keys(A.SHEETS).filter(k => !['word', 'oge'].includes(k) && !isCore(k)));
  const core = fmts(Object.keys(A.SHEETS).filter(isCore));
  m.close();
  return plain({ word, oge, gen, formats, core });
}

export function ui(file, slug) {
  const out = {};
  const b = loadFile(file, { query: '?mode=board', slug });
  const B = b.window.APP.board;
  out.board = [];
  for (let i = 0; i < B.steps.length; i++) for (const ph of [0, 1]) {
    B.go(i, ph);
    out.board.push(b.window.document.getElementById('board').innerHTML);
  }
  b.close();
  for (const kind of ['word', 'oge']) {
    const p = loadFile(file, { query: `?mode=print&kind=${kind}`, slug });
    p.window.APP.print.nums = [4817, 1234];
    p.window.APP.print.draw();
    out['sheets-' + kind] = p.window.document.getElementById('pSheets').innerHTML;
    p.close();
  }
  const s = loadFile(file, { query: '', slug });
  out.start = s.window.document.getElementById('start').innerHTML;
  out.help = s.window.document.getElementById('help').innerHTML;
  s.close();
  const h = loadFile(file, { query: '?mode=home', slug });
  const H = h.window.APP.home;
  out.home = [];
  for (let level = 0; level < h.window.APP.SECTIONS.length; level++) for (let seed = 1; seed <= 15; seed++) {
    H.start({ level, seed });
    out.home.push(JSON.stringify(H.state.task) + ' | ' + h.window.document.getElementById('hPlay').innerHTML);
  }
  h.close();
  return out;
}

if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('snapshot.mjs')) {
  const [slug, fileArg] = process.argv.slice(2).filter(a => !a.startsWith('--'));
  if (!slug) { console.error('Укажи slug: npm run snapshot -- <slug> [файл.html] [--ui]'); process.exit(1); }
  const file = fileArg ? resolve(fileArg) : outFile(readConfig(), slug);
  const dir = join(import.meta.dirname, '..', 'tests', 'snapshots');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, `${slug}.frozen.json`), JSON.stringify(frozen(file, slug)));
  console.log('✓ tests/snapshots/' + slug + '.frozen.json');
  if (process.argv.includes('--ui')) {
    writeFileSync(join(dir, `${slug}.ui.json`), JSON.stringify(ui(file, slug)));
    console.log('✓ tests/snapshots/' + slug + '.ui.json');
  }
}
