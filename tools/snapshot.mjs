// Снимок поведения материала: node tools/snapshot.mjs <slug> [файл.html] [--ui] [--force]
//   frozen — варианты раздатки и задания генератора. На них уже могут быть напечатанные листы,
//            поэтому собранный материал обязан давать ровно то же (проверяет tests/snapshot.test.mjs).
//   Версии: снимок пишется в tests/snapshots/<slug>.v<N>.frozen.json (N — GEN_VERSION темы)
//            и дублируется в legacy tests/snapshots/<slug>.frozen.json (текущая версия, для совместимости).
//            Существующий версионный файл НЕ перезаписывается без --force: изменение вариантов
//            опубликованной версии — это либо возврат генератора, либо новая GEN_VERSION +
//            изоляция старого генератора в TOPIC_PRINT_VERSIONS (ИНСТРУКЦИЯ.md, раздел 9).
//   --ui   — ещё и разметка доски, листов, стартового экрана и справки: нужна, когда материал
//            переносят на ядро, чтобы убедиться, что ничего не поменялось. В тестах не участвует.
//   --force — разрешить перезапись существующего снимка той же версии (только осознанно).
import { writeFileSync, existsSync, readFileSync, mkdirSync } from 'node:fs';
import { isDeepStrictEqual } from 'node:util';
import { join, resolve } from 'node:path';
import { loadFile } from './load.mjs';
import { readConfig, outFile } from './paths.mjs';

export const snapVersioned = (slug, version) => join(import.meta.dirname, '..', 'tests', 'snapshots', `${slug}.v${version}.frozen.json`);
export const snapLegacy = slug => join(import.meta.dirname, '..', 'tests', 'snapshots', `${slug}.frozen.json`);

export function frozen(file, slug, version) {
  const m = loadFile(file, { query: '?mode=print', slug });
  const A = m.window.APP;
  const ver = version ?? A.GEN_VERSION;
  if (!A.PRINT_GENERATORS) { m.close(); throw new Error(`${slug}: собранный файл устарел (нет PRINT_GENERATORS) — пересобери: npm run build -- ${slug}`); }
  if (!A.PRINT_GENERATORS[ver]) { m.close(); throw new Error(`${slug}: нет генераторов версии ${ver} (GEN_VERSION=${A.GEN_VERSION})`); }
  const nums = Array.from({ length: 30 }, (_, i) => 1000 + i * 293);
  const plain = x => JSON.parse(JSON.stringify(x));
  const word = nums.map(n => { const v = A.printVariant(n, 'word', ver); return { label: v.label, tasks: v.tasks, answers: v.answers, word: v.word, bank: v.bank.map(b => [b.key, b.letter]) }; });
  const oge = A.PRINT_GENERATORS[ver]?.oge ? nums.map(n => { const v = A.printVariant(n, 'oge', ver); return { label: v.label, tasks: v.tasks.map(x => ({ kind: x.kind, t: x.t, big: x.big })), answers: v.answers }; }) : null;
  // gen (образцы TYPES) имеет смысл только для текущей версии: старые TYPES в сборке не сохраняются,
  // старые печатные варианты защищены через TOPIC_PRINT_VERSIONS и проверяются ниже (word/oge/formats/core)
  let gen = null;
  if (ver === A.GEN_VERSION) {
    gen = {};
    for (const type of Object.keys(A.TYPES)) {
      const rnd = A.mulberry32(type.length * 7919 + 13);
      gen[type] = Array.from({ length: 40 }, () => A.generate(type, rnd));
    }
  }
  // форматы темы (TOPIC_SHEETS) замораживаются всегда; форматы ядра (билет, самостоятельная, домино, «найди ошибку») —
  // в ключе core: тест сравнивает его, только если он есть в снимке (старые темы сняты до появления этих форматов)
  const fmts = keys => Object.fromEntries(keys.map(k => [k, nums.map(n => {
    const v = A.printVariant(n, k, ver);
    return { variant: v, key: A.SHEETS[k].key([v]) };
  })]));
  const hasGen = k => !!A.PRINT_GENERATORS[ver]?.[k];
  const isCore = k => A.CORE_SHEETS[k] && A.SHEETS[k] === A.CORE_SHEETS[k];
  const keys = Object.keys(A.SHEETS).filter(k => !['word', 'oge'].includes(k) && hasGen(k));
  const formats = fmts(keys.filter(k => !isCore(k)));
  const core = fmts(keys.filter(isCore));
  m.close();
  const out = plain({ version: ver, word, oge, formats, core });
  if (gen) out.gen = plain(gen);
  return out;
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

const cliArg = process.argv[1] || '';
if (import.meta.url === `file:///${cliArg.replace(/\\/g, '/')}` || cliArg.endsWith('snapshot.mjs')) {
  const raw = process.argv.slice(2);
  const skipVals = new Set();
  ['--site'].forEach(f => { const i = raw.indexOf(f); if (i >= 0 && raw[i + 1]) skipVals.add(raw[i + 1]); });
  const [slug, fileArg] = raw.filter(a => !a.startsWith('--') && !skipVals.has(a));
  if (!slug) { console.error('Укажи slug: npm run snapshot -- <slug> [файл.html] [--ui] [--force]'); process.exit(1); }
  const force = process.argv.includes('--force');
  const file = fileArg ? resolve(fileArg) : outFile(readConfig(), slug);
  const dir = join(import.meta.dirname, '..', 'tests', 'snapshots');
  mkdirSync(dir, { recursive: true });
  const snap = frozen(file, slug);
  const ver = snap.version;
  const body = JSON.stringify(snap);
  const strip = o => { const { version, ...rest } = o; return rest; };
  const sameIgnoringVersion = target => {
    try {
      return isDeepStrictEqual(strip(JSON.parse(readFileSync(target, 'utf8'))), strip(snap));
    } catch { return false; }
  };
  const targets = [snapVersioned(slug, ver), snapLegacy(slug)];
  for (const target of targets) {
    if (existsSync(target) && readFileSync(target, 'utf8') !== body && !sameIgnoringVersion(target) && !force) {
      console.error(`✗ ${target} уже существует и отличается. Не перезаписываю без --force.\n` +
        `  Варианты версии ${ver} уже могли уйти в печать: либо верни генератор, либо подними GEN_VERSION\n` +
        `  и сохрани старый генератор в TOPIC_PRINT_VERSIONS, затем сними НОВУЮ версию (ИНСТРУКЦИЯ.md, раздел 9).`);
      process.exit(1);
    }
    writeFileSync(target, body);
    console.log('✓ ' + target.split(/[\\/]/).slice(-2).join('/'));
  }
  if (process.argv.includes('--ui')) {
    writeFileSync(join(dir, `${slug}.ui.json`), JSON.stringify(ui(file, slug)));
    console.log('✓ tests/snapshots/' + slug + '.ui.json');
  }
}
