// Снимок поведения материала: node tools/snapshot.mjs <slug> [файл.html] [--force] [--ui]
//   frozen — варианты раздатки и ключи генератора одной версии. На них уже могут быть напечатанные
//            листы, поэтому собранный материал обязан давать ровно то же (проверяет tests/snapshot.test.mjs).
//            Снимок каждой версии — свой файл <slug>.v<N>.frozen.json и он не перезаписывается:
//            старые номера должны давать прежние задания, подписи и ключи. --force — только если
//            версия ещё никому не выдавалась (до публикации).
//   --ui   — ещё и разметка доски, листов, стартового экрана и справки: нужна, когда материал
//            переносят на ядро, чтобы убедиться, что ничего не поменялось. В тестах не участвует.
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { loadFile } from './load.mjs';
import { readConfig, outFile } from './paths.mjs';

// version — номер версии генератора; без него снимается текущая (GEN_VERSION собранного материала).
// Прямая генерация типов (gen) записывается только для текущей версии: типы тренажёра от версии
// к версии меняются свободно, печать — нет.
export function frozen(file, slug, version) {
  const m = loadFile(file, { query: '?mode=print', slug });
  const A = m.window.APP;
  const v = version ?? A.GEN_VERSION;
  const gens = A.PRINT_GENERATORS[v];
  if (!gens) { m.close(); throw new Error('Нет генераторов версии ' + v + ' — опиши их в TOPIC_PRINT_VERSIONS[' + v + '] темы ' + slug); }
  const nums = Array.from({ length: 30 }, (_, i) => 1000 + i * 293);
  const plain = x => JSON.parse(JSON.stringify(x));
  const word = nums.map(n => { const x = A.makeVariant(n, v); return { label: x.label, tasks: x.tasks, answers: x.answers, word: x.word, bank: x.bank.map(b => [b.key, b.letter]) }; });
  const oge = gens.oge ? nums.map(n => { const x = A.makeVariantOGE(n, v); return { label: x.label, tasks: x.tasks.map(y => ({ kind: y.kind, t: y.t, big: y.big })), answers: x.answers }; }) : null;
  const gen = v === A.GEN_VERSION ? Object.fromEntries(Object.keys(A.TYPES).map(type => {
    const rnd = A.mulberry32(type.length * 7919 + 13);
    return [type, Array.from({ length: 40 }, () => A.generate(type, rnd))];
  })) : null;
  const formats = Object.fromEntries(Object.keys(gens).filter(k => !['word', 'oge'].includes(k)).map(k => {
    if (!A.SHEETS[k]) { m.close(); throw new Error(`Формат «${k}» версии ${v} есть в генераторах, но не зарегистрирован в SHEETS — ядро не сможет напечатать его лист и ключ`); }
    return [k, nums.map(n => { const x = A.printVariant(n, k, v); return { variant: x, key: A.SHEETS[k].key([x]) }; })];
  }));
  m.close();
  return plain({ version: v, word, oge, gen, formats });
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

if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const [slug, fileArg] = process.argv.slice(2).filter(a => !a.startsWith('--'));
  if (!slug) { console.error('Укажи slug: npm run snapshot -- <slug> [файл.html] [--force] [--ui]'); process.exit(1); }
  const file = fileArg ? resolve(fileArg) : outFile(readConfig(), slug);
  const dir = join(import.meta.dirname, '..', 'tests', 'snapshots');
  mkdirSync(dir, { recursive: true });
  const snap = frozen(file, slug);
  const name = `${slug}.v${snap.version}.frozen.json`;
  if (existsSync(join(dir, name)) && !process.argv.includes('--force')) {
    console.error(`✗ tests/snapshots/${name} уже существует — на варианты этой версии могли напечатать листы.\n` +
      `  Снимок не перезаписывают: старые номера обязаны давать прежние задания, подписи и ключи.\n` +
      `  Если версия ${snap.version} ещё никому не выдавалась и снимок нужно переснять: добавь --force.`);
    process.exit(1);
  }
  writeFileSync(join(dir, name), JSON.stringify(snap));
  console.log(`✓ tests/snapshots/${name}`);
  if (process.argv.includes('--ui')) {
    writeFileSync(join(dir, `${slug}.ui.json`), JSON.stringify(ui(file, slug)));
    console.log('✓ tests/snapshots/' + slug + '.ui.json');
  }
}
