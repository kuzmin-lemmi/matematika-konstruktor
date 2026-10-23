// Заготовка нового материала: npm run new -- <slug> --title "Название темы"
// Создаёт тему в materials/<slug>/ (рабочий пример, который сразу собирается и проходит тест-контракт),
// а на сайте — карточку src/content/items/<slug>.md (access: soon) и черновик теста tests/<slug>.test.mjs.
// Существующие файлы не перезаписывает.
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, readConfig, materialDir, isSlug, outFile } from './paths.mjs';
import { buildMaterial } from './build.mjs';

const args = process.argv.slice(2);
const ti = args.indexOf('--title');
const title = ti >= 0 ? args[ti + 1] : null;
const slug = args.find((a, i) => !a.startsWith('--') && args[i - 1] !== '--title' && args[i - 1] !== '--site');
if (!isSlug(slug) || !title) {
  console.error('Как запустить: npm run new -- <slug> --title "Название темы"\n' +
    'slug — транслит названия латиницей через дефис, например slozhenie-drobei. После публикации slug не меняется.');
  process.exit(1);
}
const dir = materialDir(slug);
if (existsSync(dir)) { console.error(`Тема materials/${slug}/ уже есть — заготовка не нужна.`); process.exit(1); }

const T = join(ROOT, 'templates', 'new-material');
const fill = s => s.split('{{slug}}').join(slug).split('{{titleLower}}').join(title[0].toLowerCase() + title.slice(1)).split('{{title}}').join(title);
const copy = (from, to) => {
  if (existsSync(to)) { console.log(`· уже есть, не трогаю: ${to}`); return; }
  writeFileSync(to, fill(readFileSync(join(T, from), 'utf8')));
  console.log(`✓ ${to}`);
};

mkdirSync(dir, { recursive: true });
copy('material.json', join(dir, 'material.json'));
copy('topic.js', join(dir, 'topic.js'));
copy('help.html', join(dir, 'help.html'));

const cfg = readConfig();
copy('card.md', join(cfg.site, 'src', 'content', 'items', `${slug}.md`));
copy('site-test.mjs', join(cfg.site, 'tests', `${slug}.test.mjs`));
writeFileSync(outFile(cfg, slug), buildMaterial(slug));
console.log(`✓ ${outFile(cfg, slug)} — собрана заготовка

Дальше:
  1. Заполни materials/${slug}/material.json, topic.js, help.html — всё с пометкой «ЗАМЕНИ».
  2. npm run build -- ${slug}      собрать в сайт
  3. npm test                       тест-контракт конструктора
  4. в папке сайта: npm test, npm run posters ${slug}, карточка, npm run build
  Подробно — ИНСТРУКЦИЯ.md.`);
