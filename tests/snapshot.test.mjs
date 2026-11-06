// Замороженные варианты всех версий генератора: собранный материал обязан давать те же варианты
// раздатки, бланки и ключи, что и при снимке (на них уже могут быть напечатанные листы).
// Снимок каждой версии — файл tests/snapshots/<slug>.v<N>.frozen.json, делается командой
// npm run snapshot -- <slug> при выпуске версии и не перезаписывается. Старые версии проверяются
// через printVariant(n, kind, version), поэтому генераторы прошлых версий тема обязана сохранить.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildMaterial } from '../tools/build.mjs';
import { frozen } from '../tools/snapshot.mjs';
import { ROOT, isSlug } from '../tools/paths.mjs';

const SNAP_DIR = join(ROOT, 'tests', 'snapshots');
for (const slug of readdirSync(join(ROOT, 'materials')).filter(isSlug)) {
  const snaps = readdirSync(SNAP_DIR)
    .map(f => f.match(new RegExp(`^${slug}\\.v(\\d+)\\.frozen\\.json$`)))
    .filter(Boolean).map(m => ({ version: +m[1], file: m[0] })).sort((a, b) => a.version - b.version);
  test(`${slug}: варианты всех версий совпадают со снимками`, t => {
    if (!snaps.length) return t.skip('снимка нет — сделай: npm run snapshot -- ' + slug);
    const dir = mkdtempSync(join(tmpdir(), 'matshag-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const file = join(dir, `${slug}.html`);
    writeFileSync(file, buildMaterial(slug));
    const current = frozen(file, slug);
    assert.ok(snaps.some(s => s.version === current.version),
      `нет снимка текущей версии ${current.version} — сделай: npm run snapshot -- ${slug}` +
      (snaps.length > 1 ? ` (снимки версий: ${snaps.map(s => s.version).join(', ')})` : ''));
    for (const s of snaps) {
      let now;
      try { now = s.version === current.version ? current : frozen(file, slug, s.version); }
      catch (e) { assert.fail(`версия ${s.version}: ${e.message}`); }
      const was = JSON.parse(readFileSync(join(SNAP_DIR, s.file), 'utf8'));
      assert.deepEqual(Object.keys(now.formats || {}).sort(), Object.keys(was.formats || {}).sort(),
        `версия ${s.version}: новый формат требует исходного снимка`);
      // для прошлых версий проверяем только печать; gen (задания тренажёра) относится к текущей.
      // раздела может не быть в снимках, снятых до его появления (formats у тем без доп. листов)
      const parts = ['word', ...(was.oge ? ['oge'] : []), ...(was.formats ? ['formats'] : []), ...(s.version === current.version ? ['gen'] : [])];
      for (const k of parts) {
        assert.ok(now[k], `версия ${s.version}, ${k}: текущий материал больше не может дать этот раздел`);
        assert.deepEqual(now[k], was[k], `версия ${s.version}, ${k}: варианты изменились — листы со старыми номерами дадут другие ответы`);
      }
    }
  });
}
