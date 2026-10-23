// Где лежит сайт и куда класть собранные материалы.
// Путь к сайту — в constructor.config.json; переопределить на один запуск: --site <папка> или MATSHAG_SITE.
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

export const ROOT = resolve(import.meta.dirname, '..');

export function readConfig() {
  const cfg = JSON.parse(readFileSync(join(ROOT, 'constructor.config.json'), 'utf8'));
  const i = process.argv.indexOf('--site');
  const site = i > 0 ? process.argv[i + 1] : process.env.MATSHAG_SITE || cfg.site;
  if (!site || !existsSync(join(site, 'src', 'content.config.ts'))) {
    throw new Error(`Не нашёл сайт «Матшага» в папке «${site}». Проверь constructor.config.json или передай --site <папка сайта>.`);
  }
  return { ...cfg, site: resolve(site) };
}

export const outFile = (cfg, slug) => join(cfg.site, 'public', 'materials', `${slug}.html`);
export const materialDir = slug => join(ROOT, 'materials', slug);
export const isSlug = s => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s || '');
