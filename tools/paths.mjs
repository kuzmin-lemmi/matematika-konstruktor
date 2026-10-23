// Где лежит сайт и куда класть собранные материалы.
// Папка сайта ищется по порядку — берётся первая, где действительно лежит сайт «Матшага»:
//   1) флаг --site <папка> или переменная MATSHAG_SITE — на один запуск;
//   2) constructor.config.local.json — путь на этом компьютере (файл не попадает в git);
//   3) constructor.config.json — путь по умолчанию (компьютер автора);
//   4) папка matematika рядом с конструктором (../matematika) — если оба репозитория склонированы в одну папку.
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..');
const readJson = f => existsSync(f) ? JSON.parse(readFileSync(f, 'utf8')) : {};
const isSite = p => !!p && existsSync(join(p, 'src', 'content.config.ts')) && existsSync(join(p, 'public'));

export function readConfig() {
  const cfg = readJson(join(ROOT, 'constructor.config.json'));
  const local = readJson(join(ROOT, 'constructor.config.local.json'));
  const i = process.argv.indexOf('--site');
  const candidates = [i > 0 ? process.argv[i + 1] : null, process.env.MATSHAG_SITE, local.site, cfg.site, join(ROOT, '..', 'matematika')];
  const forced = candidates[0] || candidates[1];
  if (forced && !isSite(forced)) throw new Error(`Не нашёл сайт «Матшага» в папке «${forced}».`);
  const site = candidates.find(isSite);
  if (!site) {
    throw new Error('Не нашёл папку сайта «Матшага».\n' +
      '  Склонируй сайт рядом с конструктором:  git clone https://github.com/kuzmin-lemmi/matematika\n' +
      '  или укажи путь в constructor.config.local.json:  { "site": "C:/путь/к/matematika" }');
  }
  return { ...cfg, ...local, site: resolve(site) };
}

export const outFile = (cfg, slug) => join(cfg.site, 'public', 'materials', `${slug}.html`);
export const materialDir = slug => join(ROOT, 'materials', slug);
export const isSlug = s => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s || '');
