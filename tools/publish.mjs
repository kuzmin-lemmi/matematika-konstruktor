// Проверка и публикация материала на matshag.ru (GitHub Pages).
//   npm run check   -- <slug>              всё проверить, ничего не публикуя (перед показом автору)
//   npm run publish -- <slug> --approved   опубликовать — ТОЛЬКО после явного одобрения автора в чате
// Работает с папкой сайта из constructor.config.json (или --site). Нужны git и gh (вход в GitHub уже выполнен).
//
// Публикация: свежий main → сборка всех тем → постер (если нет) → проверка карточки → тесты конструктора
// и сайта (npm run validate) → ветка, коммит, PR → слияние → запуск GitHub Pages → проверка живого сайта →
// заморозка вариантов темы в конструкторе.
import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { ROOT, readConfig, outFile, materialDir, isSlug } from './paths.mjs';
import { buildMaterial } from './build.mjs';
import { frozen } from './snapshot.mjs';

const MODE = process.argv[2];   // check | publish
const args = process.argv.slice(3);
const skip = new Set();
['--site'].forEach(f => { const i = args.indexOf(f); if (i >= 0) skip.add(args[i + 1]); });
const slug = args.find(a => !a.startsWith('--') && !skip.has(a));
const APPROVED = args.includes('--approved');
const SITE_URL = 'https://matshag.ru';
// что публикация может закоммитить на сайте — всё остальное (код сайта, правила) идёт обычным PR
const MATERIAL_PATHS = ['public/materials/', 'public/posts/', 'src/content/items/', 'tests/', 'docs/ROADMAP.md', 'docs/STRATEGY.md'];

const log = s => console.log(s);
const step = s => console.log(`\n▶ ${s}`);
function fail(msg) { console.error(`\n✗ ${msg}`); process.exit(1); }
function sh(cmd, cwd, { quiet = false, allowFail = false } = {}) {
  try {
    const out = execSync(cmd, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024 });
    if (!quiet && out.trim()) log(out.trimEnd().split('\n').slice(-15).join('\n'));
    return out;
  } catch (e) {
    if (allowFail) return null;
    const out = `${e.stdout || ''}${e.stderr || ''}`.trimEnd().split('\n').slice(-40).join('\n');
    fail(`Команда не прошла: ${cmd}\n${out}`);
  }
}
const hash = s => createHash('sha256').update(s.replace(/\r\n/g, '\n')).digest('hex').slice(0, 16);

if (!['check', 'publish'].includes(MODE) || !isSlug(slug)) {
  fail('Как запустить:\n  npm run check   -- <slug>\n  npm run publish -- <slug> --approved   (только после одобрения автора)');
}
if (MODE === 'publish' && !APPROVED) {
  fail('Публикация без флага --approved не запускается. Сначала покажи материал автору (npm run show -- ' + slug +
    ') и дождись явного «одобряю / публикуй» в чате, потом: npm run publish -- ' + slug + ' --approved');
}
if (!existsSync(materialDir(slug))) fail(`Нет темы materials/${slug}/ в конструкторе.`);
const cfg = readConfig();
const SITE = cfg.site;
const title = JSON.parse(readFileSync(join(materialDir(slug), 'material.json'), 'utf8')).title;

// ---------- 1. Сайт: свежий main ----------
step('Сайт: проверяю папку и подтягиваю свежий main');
sh('git --version', SITE, { quiet: true });
if (MODE === 'publish') sh('gh auth status', SITE, { quiet: true });
const branch = sh('git branch --show-current', SITE, { quiet: true }).trim();
if (MODE === 'publish' && branch !== 'main') fail(`В папке сайта ${SITE} сейчас ветка «${branch}», нужна main. Переключи: git switch main`);
const dirty = sh('git status --porcelain', SITE, { quiet: true }).split('\n').filter(Boolean).map(l => l.slice(3).replace(/^"|"$/g, ''));
const foreign = dirty.filter(p => !MATERIAL_PATHS.some(m => p.replace(/\\/g, '/').startsWith(m)));
if (foreign.length) fail(`В папке сайта есть незакоммиченные изменения не про материалы — публикация их не тронет и не может продолжить:\n  ${foreign.join('\n  ')}\nЗакоммить их отдельно (обычным PR) или убери.`);
if (branch === 'main') {   // только перемотка вперёд: свои правки материала остаются в рабочей папке
  sh('git fetch origin', SITE, { quiet: true });
  sh('git merge --ff-only origin/main', SITE, { quiet: true });
  log('✓ main обновлён до origin/main');
} else log(`· ветка «${branch}» — main не подтягиваю (проверка в рабочей ветке)`);
const lockNow = hash(readFileSync(join(SITE, 'package-lock.json'), 'utf8'));
const lockFile = join(SITE, 'node_modules', '.matshag-lock');
if (!existsSync(join(SITE, 'node_modules')) || (existsSync(lockFile) ? readFileSync(lockFile, 'utf8') !== lockNow : MODE === 'publish')) {
  step('Сайт: ставлю зависимости (npm ci)');
  sh('npm ci', SITE, { quiet: true });
  writeFileSync(lockFile, lockNow);
}

// ---------- 2. Сборка всех тем ----------
step('Собираю темы конструктора в сайт');
const slugs = readdirSync(join(ROOT, 'materials')).filter(isSlug);
for (const s of slugs) { writeFileSync(outFile(cfg, s), buildMaterial(s)); log(`✓ ${s}`); }

// ---------- 3. Карточка и постер ----------
step('Проверяю карточку и постер');
const cardFile = join(SITE, 'src', 'content', 'items', `${slug}.md`);
if (!existsSync(cardFile)) fail(`Нет карточки ${cardFile}. Создай её (образец — templates/new-material/card.md).`);
const card = readFileSync(cardFile, 'utf8');
const field = name => (card.match(new RegExp(`^${name}:\\s*(.+)$`, 'm')) || [])[1]?.replace(/\s+#.*$/, '').trim();
const problems = [];
if (field('access') === 'soon') problems.push('access: soon — для публикации поставь access: free');
if (!field('added')) problems.push('нет added: <дата публикации ГГГГ-ММ-ДД>');
if (/ЗАМЕНИ/.test(card)) problems.push('в карточке остались пометки «ЗАМЕНИ»');
if (field('url') !== `materials/${slug}.html`) problems.push(`url должен быть materials/${slug}.html`);
const posterJpg = join(SITE, 'public', 'posts', `${slug}.jpg`);
if (!existsSync(posterJpg)) {
  log('Постера нет — снимаю (npm run posters)…');
  sh(`npm run posters ${slug}`, SITE);
}
if (field('poster') !== `posts/${slug}.jpg`) problems.push(`нет poster: posts/${slug}.jpg`);
if (/^\s*-\s*\{\s*kind:\s*oge/m.test(card) === false && /^const\s+OGE_V1\b/m.test(readFileSync(join(materialDir(slug), 'topic.js'), 'utf8')))
  problems.push('у темы есть бланк ОГЭ — добавь в карточку: sheets: - { kind: oge, label: "Бланк ОГЭ" }');
for (const f of readdirSync(join(ROOT, 'materials', slug))) if (/ЗАМЕНИ/.test(readFileSync(join(materialDir(slug), f), 'utf8'))) problems.push(`materials/${slug}/${f}: остались пометки «ЗАМЕНИ»`);
const siteTest = join(SITE, 'tests', `${slug}.test.mjs`);
if (!existsSync(siteTest)) problems.push(`нет теста темы на сайте tests/${slug}.test.mjs (независимое решение)`);
if (problems.length) fail('Материал не готов к публикации:\n  ' + problems.join('\n  '));
log('✓ карточка, постер и тест на месте');

// ---------- 4. Проверки ----------
step('Тест-контракт конструктора (npm test)');
sh('npm test', ROOT, { quiet: true });
log('✓ пройден');
step('Сайт: проверки, все тесты и сборка (npm run validate)');
const v = sh('npm run validate', SITE, { quiet: true });
const pass = (v.match(/ℹ pass (\d+)/) || [])[1];
log(`✓ пройдено (тестов: ${pass ?? '?'})`);

if (MODE === 'check') {
  log(`\n✓ Материал «${title}» готов к показу автору.\n  Посмотреть: npm run show -- ${slug}\n  После одобрения: npm run publish -- ${slug} --approved`);
  process.exit(0);
}

// ---------- 5. Коммит, PR, слияние ----------
step('Сайт: ветка, коммит, PR, слияние');
// git status может показать файл изменённым только из-за переводов строк (LF/CRLF) — что реально меняется,
// видно после git add: смотрим индекс
sh(`git add -- ${MATERIAL_PATHS.map(p => `"${p}"`).join(' ')}`, SITE, { quiet: true });
const changed = sh('git diff --cached --name-only', SITE, { quiet: true }).split('\n').filter(Boolean);
if (!changed.length) log('Изменений на сайте нет — материал уже опубликован в этом виде. Перехожу к публикации и проверке сайта.');
else {
  const isNew = !sh(`git ls-tree -r --name-only origin/main -- public/materials/${slug}.html`, SITE, { quiet: true }).trim();
  const msg = isNew ? `Добавь материал «${title}» и его карточку` : `Обнови материал «${title}»`;
  const stamp = new Date().toISOString().slice(0, 16).replace(/[-:T]/g, '');
  const br = `material/${slug}-${stamp}`;
  sh(`git switch -c ${br}`, SITE, { quiet: true });   // индекс с изменениями переходит в новую ветку
  log(changed.map(p => '  ' + p).join('\n'));
  writeFileSync(join(SITE, '.git', 'MATSHAG_MSG'), `${msg}\n\nОпубликовано конструктором материалов (npm run publish).\n`);
  sh('git commit -q -F .git/MATSHAG_MSG', SITE, { quiet: true });
  sh(`git push -q -u origin ${br}`, SITE, { quiet: true });
  writeFileSync(join(SITE, '.git', 'MATSHAG_PR'), `Материал «${title}» (\`${slug}\`) собран конструктором и одобрен автором.\n\nПроверки перед публикацией: тест-контракт конструктора, \`npm run validate\` сайта (тестов: ${pass ?? '?'}).\n\n🤖 Опубликовано командой \`npm run publish\` конструктора «Матшага».\n`);
  const pr = sh(`gh pr create --base main --head ${br} --title "${msg.replace(/"/g, '\\"')}" --body-file .git/MATSHAG_PR`, SITE, { quiet: true }).trim().split('\n').pop();
  log(`✓ PR: ${pr}`);
  sh(`gh pr merge ${pr} --merge --delete-branch`, SITE, { quiet: true });
  log('✓ PR влит в main');
  sh('git switch main', SITE, { quiet: true, allowFail: true });
  sh('git fetch origin', SITE, { quiet: true });
  sh('git merge --ff-only origin/main', SITE, { quiet: true });
  sh(`git branch -D ${br}`, SITE, { quiet: true, allowFail: true });
}

// ---------- 6. GitHub Pages ----------
step('Запускаю публикацию на GitHub Pages');
const before = sh('gh run list --workflow deploy.yml --limit 1 --json databaseId -q ".[0].databaseId"', SITE, { quiet: true }).trim();
sh('gh workflow run deploy.yml --ref main', SITE, { quiet: true });
let runId = before;
for (let i = 0; i < 30 && runId === before; i++) {
  execSync(process.platform === 'win32' ? 'ping -n 3 127.0.0.1 > nul' : 'sleep 2');
  runId = sh('gh run list --workflow deploy.yml --limit 1 --json databaseId -q ".[0].databaseId"', SITE, { quiet: true }).trim();
}
if (runId === before) fail('Публикация не запустилась — проверь Actions на GitHub.');
log(`… жду завершения (run ${runId}, обычно около минуты)`);
sh(`gh run watch ${runId} --exit-status --interval 10`, SITE, { quiet: true });
log('✓ GitHub Pages обновлён');

// ---------- 7. Живой сайт ----------
step('Проверяю matshag.ru');
const built = readFileSync(outFile(cfg, slug), 'utf8');
let ok = false;
for (let i = 0; i < 10 && !ok; i++) {
  try {
    const live = await (await fetch(`${SITE_URL}/materials/${slug}.html?v=${Date.now()}`)).text();
    const page = await fetch(`${SITE_URL}/item/${slug}/?v=${Date.now()}`);
    ok = hash(live) === hash(built) && page.ok;
  } catch {}
  if (!ok) await new Promise(r => setTimeout(r, 15000));
}
if (!ok) fail(`Сайт пока отдаёт старую версию ${SITE_URL}/item/${slug}/ — подожди пару минут и открой страницу заново.`);
log(`✓ ${SITE_URL}/item/${slug}/`);

// ---------- 8. Заморозка вариантов ----------
step('Замораживаю варианты темы в конструкторе');
const snap = join(ROOT, 'tests', 'snapshots', `${slug}.frozen.json`);
if (!existsSync(snap)) {
  writeFileSync(snap, JSON.stringify(frozen(outFile(cfg, slug), slug)));
  log(`✓ tests/snapshots/${slug}.frozen.json`);
} else log('· снимок уже есть — тест следит, чтобы варианты не менялись');
if (existsSync(join(ROOT, '.git'))) {
  sh('git add -A', ROOT, { quiet: true });
  if (sh('git status --porcelain', ROOT, { quiet: true }).trim()) {
    writeFileSync(join(ROOT, '.git', 'MATSHAG_MSG'), `Опубликуй тему «${title}»\n`);
    sh('git commit -q -F .git/MATSHAG_MSG', ROOT, { quiet: true });
    log('✓ конструктор закоммичен');
  }
}

log(`\n✓ Материал «${title}» опубликован:\n  ${SITE_URL}/item/${slug}/\n  ${SITE_URL}/zapusk/${slug}/\n  Если браузер показывает старую версию — обнови страницу (кэш до 10 минут).`);
