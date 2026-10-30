// Локальная проверка без записи HTML, постеров и изменений сайта.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { ROOT, isSlug, materialDir } from './paths.mjs';
import { buildMaterial } from './build.mjs';
import { loadHtml } from './load.mjs';
import { checkIndependent } from './independent.mjs';

try {
  const slug = process.argv[2];
  if (!isSlug(slug) || process.argv.length !== 3) throw new Error('Запуск: npm run check:fast -- <slug>');
  const html = buildMaterial(slug);
  const result = spawnSync(process.execPath, ['--test', 'tests/contract.test.mjs'], {
    cwd: ROOT, env: { ...process.env, MATSHAG_CHECK_SLUG: slug }, stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Контракт темы ${slug} не пройден`);
  const file = join(materialDir(slug), 'expected.mjs');
  if (existsSync(file)) {
    const { expected } = await import(pathToFileURL(file).href);
    if (typeof expected !== 'function') throw new Error(`${file}: нужен export function expected(task)`);
    const material = loadHtml(html, { slug });
    try {
      if (material.errors.length) throw material.errors[0];
      checkIndependent(material.window.APP, expected);
    } finally { material.close(); }
    console.log('✓ Независимые ответы: 200 зёрен на тип, 30 вариантов');
  } else {
    console.log(`· Нет ${file}: независимая математика этим запуском НЕ проверена. Существующие независимые тесты сайта запускает полный check.`);
  }
  console.log('✓ Быстрая проверка завершена. Перед показом автору обязателен полный npm run check -- ' + slug);
} catch (error) {
  console.error('✗ ' + error.message);
  process.exitCode = 1;
}
