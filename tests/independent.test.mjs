import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkIndependent } from '../tools/independent.mjs';
import { loadHtml } from '../tools/load.mjs';
import { buildTemplate } from './template.mjs';
import { readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { ROOT, isSlug } from '../tools/paths.mjs';
import { buildMaterial } from '../tools/build.mjs';

for (const slug of readdirSync(join(ROOT, 'materials')).filter(isSlug)) {
  const file = join(ROOT, 'materials', slug, 'expected.mjs');
  if (!existsSync(file)) continue;
  test(`${slug}: независимые ответы темы`, async () => {
    const { expected } = await import(pathToFileURL(file).href);
    const m = loadHtml(buildMaterial(slug), { slug });
    try { checkIndependent(m.window.APP, expected); } finally { m.close(); }
  });
}

const expected = t => {
  if (t.type === 'sum') {
    const n = t.a + t.b;
    return { value: { n, d: 1 }, key: String(n).replace('-', '−') };
  }
  const value = t.a < t.b ? '<' : '>';
  return { value, key: value };
};
test('Независимый механизм проверяет рабочий шаблон и обнаруживает неверное решение', () => {
  const m = loadHtml(buildTemplate());
  try {
    checkIndependent(m.window.APP, expected);
    assert.throws(() => checkIndependent(m.window.APP, () => ({ value: { n: 99999, d: 1 }, key: '99999' })), /тип=sum; зерно=1.*задание=/);
  } finally { m.close(); }
});
