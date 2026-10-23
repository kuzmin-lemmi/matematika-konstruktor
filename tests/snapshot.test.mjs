// Замороженные варианты: собранный материал обязан давать те же варианты раздатки и задания генератора,
// что и при снимке (на них уже могут быть напечатанные листы). Снимок делается командой
// npm run snapshot -- <slug> и обновляется только вместе с версией генератора (GEN_VERSION).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { buildMaterial } from '../tools/build.mjs';
import { frozen } from '../tools/snapshot.mjs';
import { ROOT, isSlug } from '../tools/paths.mjs';

for (const slug of readdirSync(join(ROOT, 'materials')).filter(isSlug)) {
  const snap = join(ROOT, 'tests', 'snapshots', `${slug}.frozen.json`);
  test(`${slug}: варианты совпадают со снимком`, t => {
    if (!existsSync(snap)) return t.skip('снимка нет — сделай: npm run snapshot -- ' + slug);
    const dir = mkdtempSync(join(tmpdir(), 'matshag-'));
    t.after(() => rmSync(dir, { recursive: true, force: true }));
    const file = join(dir, `${slug}.html`);
    writeFileSync(file, buildMaterial(slug));
    const now = frozen(file, slug), was = JSON.parse(readFileSync(snap, 'utf8'));
    for (const k of Object.keys(was)) assert.deepEqual(now[k], was[k], `${k}: варианты изменились — листы со старыми номерами дадут другие ответы`);
  });
}
