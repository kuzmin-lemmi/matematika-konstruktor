// Замороженные варианты: собранный материал обязан давать те же варианты раздатки и задания генератора,
// что и при снимке (на них уже могут быть напечатанные листы).
// Снимки версионные: tests/snapshots/<slug>.v<N>.frozen.json (N — версия генератора).
// Legacy tests/snapshots/<slug>.frozen.json — снимок текущей версии (для совместимости).
// Новый снимок: npm run snapshot -- <slug>. Перезапись существующей версии без --force запрещена.
// Смена вариантов опубликованной версии: либо верни генератор, либо подними GEN_VERSION,
// сохрани старый генератор в TOPIC_PRINT_VERSIONS и сними новую версию (ИНСТРУКЦИЯ.md, раздел 9).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join, basename } from 'node:path';
import { tmpdir } from 'node:os';
import { buildMaterial } from '../tools/build.mjs';
import { frozen } from '../tools/snapshot.mjs';
import { ROOT, isSlug } from '../tools/paths.mjs';

const snapDir = join(ROOT, 'tests', 'snapshots');
const versionedOf = slug => readdirSync(snapDir)
  .filter(f => f.startsWith(`${slug}.v`) && f.endsWith('.frozen.json'))
  .map(f => ({ file: join(snapDir, f), version: +((f.match(/\.v(\d+)\.frozen\.json$/) || [])[1] || 0) }))
  .filter(x => x.version > 0)
  .sort((a, b) => a.version - b.version);

for (const slug of readdirSync(join(ROOT, 'materials')).filter(isSlug)) {
  const legacy = join(snapDir, `${slug}.frozen.json`);
  const versions = existsSync(snapDir) ? versionedOf(slug) : [];

  test(`${slug}: варианты совпадают со снимком`, t => {
    if (!existsSync(legacy) && !versions.length) return t.skip('снимка нет — сделай: npm run snapshot -- ' + slug);
    const dir = mkdtempSync(join(tmpdir(), 'matshag-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const file = join(dir, `${slug}.html`);
    writeFileSync(file, buildMaterial(slug));
    if (existsSync(legacy)) {
      const now = frozen(file, slug), was = JSON.parse(readFileSync(legacy, 'utf8'));
      assert.deepEqual(Object.keys(now.formats || {}).sort(), Object.keys(was.formats || {}).sort(), 'Новый формат требует исходного снимка');
      for (const k of Object.keys(was)) {
        if (k === 'version') continue;
        assert.deepEqual(now[k], was[k], `${k}: варианты изменились — листы со старыми номерами дадут другие ответы. ` +
          `Не обновляй снимок: верни генератор либо подними GEN_VERSION с изоляцией старого в TOPIC_PRINT_VERSIONS`);
      }
    }
  });

  for (const { file: snap, version } of versions) {
    test(`${slug}: версия ${version} даёт прежние печатные варианты`, () => {
      const dir = mkdtempSync(join(tmpdir(), 'matshag-'));
      try {
        const file = join(dir, `${slug}.html`);
        writeFileSync(file, buildMaterial(slug));
        const was = JSON.parse(readFileSync(snap, 'utf8'));
        let now;
        try {
          now = frozen(file, slug, version);
        } catch (e) {
          assert.fail(`нет генераторов версии ${version}: старый генератор удалён — ` +
            `верни его в TOPIC_PRINT_VERSIONS (ИНСТРУКЦИЯ.md, раздел 9). Причина: ${e.message}`);
        }
        assert.deepEqual(Object.keys(now.formats || {}).sort(), Object.keys(was.formats || {}).sort(),
          `v${version}: новый формат требует исходного снимка`);
        for (const k of ['word', 'oge', 'formats', 'core']) {
          if (!(k in was)) continue;
          assert.deepEqual(now[k], was[k], `v${version} ${k}: старые номера дают другие задания. ` +
            `Не перезаписывай снимок (даже с --force) без новой GEN_VERSION: верни генератор либо подними версию`);
        }
      } finally { rmSync(dir, { recursive: true, force: true }); }
    });
  }
}
