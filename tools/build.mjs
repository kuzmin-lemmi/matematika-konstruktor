// Сборка материалов: ядро (core/) + тема (materials/<slug>/) → один самодостаточный HTML на сайте.
//   npm run build -- <slug> [<slug> ...]   собрать выбранные
//   npm run build -- --all                 собрать все темы
//   --site <папка сайта>                   куда класть (по умолчанию — из constructor.config.json)
//   --out <файл.html>                      собрать в отдельный файл (для проверок), только для одной темы
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ROOT, readConfig, outFile, materialDir, isSlug } from './paths.mjs';

const CORE = join(ROOT, 'core');
// порядок важен только для кода, который выполняется сразу при загрузке: тема — после общих функций,
// types.js (значения по умолчанию для TYPES) — после темы, запуск (boot.js) — последним; GEO нужен теме при загрузке
const SCRIPT_ORDER = ['shell.js', 'math.js', 'geom.js', '@topic', 'types.js', 'print.js', 'board.js', 'live.js', 'home.js', 'boot.js'];
const REQUIRED_META = ['title', 'description', 'kicker', 'lead', 'modeBoard', 'modePrint', 'modeHome', 'printTitle', 'homeTitle', 'homeIntro'];
// что тема обязана объявить (проверка по тексту — до запуска в браузере)
const REQUIRED_TOPIC = ['const CONFIG', 'const GEN_VERSION', 'const TYPES', 'const CATS', 'const SECTIONS', 'const KINDS_V1',
  'const WORDS_V1', 'const PRINT', 'const BOARD', 'function boardExample', 'function buildSteps'];

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const read = f => readFileSync(f, 'utf8');
// подстановка без спецсимволов String.replace ($&, $1 в коде не должны срабатывать)
const put = (s, mark, value) => s.split(mark).join(value);

// dir — другая папка темы (тест-контракт так проверяет заготовку templates/new-material)
export function buildMaterial(slug, dir = materialDir(slug)) {
  if (!existsSync(dir)) throw new Error(`Нет темы materials/${slug}/. Создай её: npm run new -- ${slug}`);
  const meta = JSON.parse(read(join(dir, 'material.json')));
  const missing = REQUIRED_META.filter(k => !meta[k]);
  if (missing.length) throw new Error(`${slug}/material.json: не заполнено ${missing.join(', ')}`);
  const topic = read(join(dir, 'topic.js'));
  const lacks = REQUIRED_TOPIC.filter(d => !new RegExp('^' + d.replace(' ', '\\s+') + '\\b', 'm').test(topic));
  if (lacks.length) throw new Error(`${slug}/topic.js: не объявлено ${lacks.join(', ')}`);
  const hasOge = /^const\s+OGE_V1\b/m.test(topic);
  if (hasOge && !/^function\s+ogeTask\b/m.test(topic)) throw new Error(`${slug}/topic.js: есть OGE_V1, но нет function ogeTask(kind, rnd)`);
  const help = existsSync(join(dir, 'help.html')) ? read(join(dir, 'help.html')).trimEnd() : '    <h3 id="helpT">Справка</h3>';
  const css = read(join(CORE, 'base.css')) + (existsSync(join(dir, 'topic.css')) ? '\n/* тема */\n' + read(join(dir, 'topic.css')) : '');

  const printCard = hasOge
    ? `      <div class="mode split"><b>🖨 Раздатка</b><span>${esc(meta.modePrint)}</span>
        <div class="kinds">
          <button type="button" data-go="print" data-kind="word">🔤 Кодовое слово<small>верные ответы складываются в слово</small></button>
          <button type="button" data-go="print" data-kind="oge">🧾 Бланк как в ОГЭ<small>ответ-число в клеточки бланка</small></button>
        </div>
      </div>`
    : `      <button class="mode" type="button" data-go="print"><b>🖨 Раздатка</b><span>${esc(meta.modePrint)}</span></button>`;
  const printKinds = hasOge
    ? `      <div class="row">
        <b>Вид листа:</b>
        <div class="seg" role="group" aria-label="Вид листа">
          <button type="button" data-kind-set="word" aria-pressed="true">🔤 Кодовое слово</button>
          <button type="button" data-kind-set="oge" aria-pressed="false">🧾 Бланк ответов, как в ОГЭ</button>
        </div>
        <input type="hidden" id="pKind" value="word">
      </div>`
    : '      <input type="hidden" id="pKind" value="word">';

  const script = [
    "'use strict';",
    `// Материал «${meta.title}». Собран конструктором «Матшага» из materials/${slug}/ и core/.`,
    `const SLUG = ${JSON.stringify(slug)};`,
    `const META = ${JSON.stringify(meta)};`,
    ...SCRIPT_ORDER.map(f => f === '@topic' ? `// ---------- тема: materials/${slug}/topic.js ----------\n${topic}` : `// ---------- ядро: core/${f} ----------\n${read(join(CORE, f))}`),
  ].join('\n');

  let html = read(join(CORE, 'page.html'));
  html = put(html, '<!--{{BANNER}}-->', `<!-- Собрано конструктором «Матшага» (D:\\Конструктор математика) из materials/${slug}/. Не правь этот файл руками:
     правь тему или ядро и пересобери — npm run build -- ${slug}. -->`);
  html = put(html, '/*{{CSS}}*/', css);
  html = put(html, '{{PRINT_CARD}}', printCard);
  html = put(html, '{{PRINT_KINDS}}', printKinds);
  html = put(html, '<!--{{HELP}}-->', help);
  for (const k of REQUIRED_META) html = put(html, `{{${k}}}`, esc(meta[k]));
  html = put(html, '//{{SCRIPT}}', script);
  const left = html.match(/\{\{[A-Za-z_]+\}\}/);
  if (left) throw new Error(`${slug}: в странице осталась подстановка ${left[0]}`);
  return html;
}

const arg = (name) => { const i = process.argv.indexOf(name); return i > 0 ? process.argv[i + 1] : null; };
if (process.argv[1] && resolve(process.argv[1]) === resolve(import.meta.filename)) {
  const skip = new Set([arg('--site'), arg('--out')]);
  let slugs = process.argv.slice(2).filter(a => !a.startsWith('--') && !skip.has(a));
  if (process.argv.includes('--all')) slugs = readdirSync(join(ROOT, 'materials')).filter(isSlug);
  if (!slugs.length) { console.error('Укажи тему: npm run build -- <slug>   или   npm run build -- --all'); process.exit(1); }
  const out = arg('--out');
  if (out && slugs.length > 1) { console.error('--out — только для одной темы'); process.exit(1); }
  const cfg = out ? null : readConfig();
  for (const slug of slugs) {
    if (!isSlug(slug)) { console.error(`«${slug}» — не slug: латиница, цифры и дефисы`); process.exit(1); }
    const html = buildMaterial(slug);
    const file = out ? resolve(out) : outFile(cfg, slug);
    writeFileSync(file, html);
    console.log(`✓ ${slug} → ${file} (${html.split('\n').length} строк, ${Math.round(html.length / 1024)} КБ)`);
  }
}
