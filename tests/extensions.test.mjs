import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildMaterial } from '../tools/build.mjs';
import { loadHtml } from '../tools/load.mjs';
const slug = 'priznaki-ravenstva-treugolnikov';
test('форматы: переключение, сохранение, раскладка и ключ без подмены ядра', t => {
 const m=loadHtml(buildMaterial(slug),{slug,query:'?mode=print&kind=proofs'}); t.after(m.close);
 const w=m.window,A=w.APP,d=w.document;
 A.print.nums=[4817,1234]; A.print.draw();
 assert.equal(d.querySelectorAll('.lesson-sheet').length,2);
 assert.equal(d.getElementById('pTwo').disabled,true);
 d.querySelector('[data-kind-set="ticket"]').click();
 d.getElementById('pSpace').checked=false; d.getElementById('pTwo').checked=true;
 d.getElementById('pTwo').dispatchEvent(new w.Event('change'));
 assert.equal(d.querySelectorAll('.page.half').length,1);
 assert.equal(d.querySelectorAll('.ticket-sheet').length,2);
 d.getElementById('pExtraKey').click(); assert.equal(d.getElementById('print').dataset.extraKey,'true');
 d.querySelector('[data-kind-set="word"]').click(); assert.equal(d.getElementById('pExtraKey').hidden,true);
 assert.deepEqual(m.errors,[]);
});
test('версии: старый номер сохраняется и выбирает прежний генератор при GEN_VERSION=2',t=>{
 let html=buildMaterial(slug).replace('const GEN_VERSION = 1','const GEN_VERSION = 2');
 // Вторую версию в испытательной теме регистрируем до запуска интерфейса.
 html=html.replace('// ================= Запуск =================',`PRINT_GENERATORS[2] = { ...PRINT_GENERATORS[1], word: n => ({...wordVariantV1(n), label: '2-' + n}) };\n// ================= Запуск =================`);
 const m=loadHtml(html,{slug,query:'?mode=print'});t.after(m.close); const A=m.window.APP;
 assert.equal(A.GEN_VERSION,2);
 assert.equal(A.makeVariant(4817,1).label,'1-4817'); assert.equal(A.makeVariant(4817).label,'2-4817');
 assert.deepEqual(JSON.parse(JSON.stringify(A.parseNums('1-4817, 2-1234, 99-5555'))),{nums:['1-4817',1234],bad:['99-5555']});
 A.print.nums=['1-4817',1234]; A.print.draw();
 assert.match(m.window.document.getElementById('pSheets').textContent,/1-4817/);
 assert.match(m.window.document.getElementById('pSheets').textContent,/2-1234/);
 assert.throws(()=>A.makeVariant(4817,99),/Нет генератора/);
 assert.deepEqual(m.errors,[]);
});
