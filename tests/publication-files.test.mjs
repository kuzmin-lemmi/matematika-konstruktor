import { test } from 'node:test';
import assert from 'node:assert/strict';
import { publicationFiles, foreignFiles } from '../tools/publication-files.mjs';
test('публикация: соседняя тема, общий документ и файл с похожим именем не входят в коммит', () => {
 const allowed=publicationFiles('test');
 const foreign=['public/materials/other.html','tests/helpers.mjs','docs/ROADMAP.md','public/materials/test.html.bak'];
 assert.deepEqual(foreignFiles([...allowed,...foreign],'test'),foreign);
 assert.throws(()=>publicationFiles('../test'));
});
