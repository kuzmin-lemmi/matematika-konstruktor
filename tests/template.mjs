// Сборка заготовки templates/new-material как темы «zagotovka» — для тест-контракта и тестов ядра.
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildMaterial } from '../tools/build.mjs';
import { ROOT } from '../tools/paths.mjs';

export const TEMPLATE = 'zagotovka';
export function buildTemplate() {
  const dir = mkdtempSync(join(tmpdir(), 'matshag-zagotovka-')), from = join(ROOT, 'templates', 'new-material');
  const fill = s => s.split('{{slug}}').join(TEMPLATE).split('{{titleLower}}').join('заготовка').split('{{title}}').join('Заготовка');
  try {
    for (const f of ['material.json', 'topic.js', 'help.html']) writeFileSync(join(dir, f), fill(readFileSync(join(from, f), 'utf8')));
    return buildMaterial(TEMPLATE, dir);
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
