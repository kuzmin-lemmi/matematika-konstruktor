// Показать материал автору: npm run show -- <slug>
// Собирает тему в сайт и открывает файл в браузере по умолчанию. Режимы — кнопками на стартовом экране.
import { execSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { readConfig, outFile, isSlug } from './paths.mjs';
import { buildMaterial } from './build.mjs';

const slug = process.argv.slice(2).find(a => !a.startsWith('--') && isSlug(a));
if (!slug) { console.error('Как запустить: npm run show -- <slug>'); process.exit(1); }
const file = outFile(readConfig(), slug);
writeFileSync(file, buildMaterial(slug));
const url = pathToFileURL(file).href;
console.log(`Материал собран: ${file}\nОткрываю в браузере: ${url}\n` +
  'Посмотри все режимы: «На доске» (пройди шаги), «Раздатка» (оба вида листа, предпросмотр печати Ctrl+P), «Тренировка» (реши и ошибись).');
if (!process.argv.includes('--no-open')) {
  try {
    if (process.platform === 'win32') execSync(`start "" "${file}"`, { shell: 'cmd.exe', stdio: 'ignore' });
    else execSync(`${process.platform === 'darwin' ? 'open' : 'xdg-open'} "${file}"`, { stdio: 'ignore' });
  } catch { console.log('Не получилось открыть браузер — открой файл сам по адресу выше.'); }
}
