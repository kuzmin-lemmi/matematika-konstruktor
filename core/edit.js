// ================= ✎ Правка урока учителем =================
// Учитель на доске правит любые тексты шага (вопрос, ответ, запись в тетради, подсказку) и надписи чертежа.
// Правка — { o: исходный текст темы, t: текст учителя } и применяется, только пока поле показывает тот же
// исходный текст: другие числа, движение модели или обновление темы не дадут правке встать не на своё место.
// Правки лежат в комплекте урока (store 'kit'), сайт и тема не меняются. Раздатку и тренажёр редактор не трогает.
// Тема для редактора ничего не объявляет. План — ПЛАН-РЕДАКТОР-УЧИТЕЛЯ.md.
const ED_ON = !PREVIEW && !STUDENT;   // превью на сайте и ученики видят исходный материал
const ED = { on: false, kit: null, cur: {}, svg: [], pick: null, edit: null, sureAll: 0 };
const ED_FIELDS = { q: 'bQ', a: 'bA', rec: 'bRec', note: 'bNoteT' };
const ED_NAMES = { q: 'Вопрос', a: 'Ответ', rec: 'Запись в тетради', note: 'Подсказка учителю' };

const edEsc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const edAttr = s => edEsc(s).replace(/"/g, '&quot;');
const edHash = s => { let h = 5381; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 33) ^ s.charCodeAt(i)) >>> 0; return h.toString(36); };
const edText = html => { const t = document.createElement('template'); t.innerHTML = html; return t.content.textContent.replace(/\s+/g, ' ').trim(); };
// числа примера можно сохранить, если это простые данные (без классов и функций)
const edPlain = x => {
  if (x === null || typeof x === 'string' || typeof x === 'boolean') return true;
  if (typeof x === 'number') return Number.isFinite(x);
  if (Array.isArray(x)) return x.every(edPlain);
  return typeof x === 'object' && Object.getPrototypeOf(x) === Object.prototype && Object.values(x).every(edPlain);
};

// ---------- очистка текста учителя: только текст и простое оформление ----------
// html — поля доски (формулы ядра span.frac, span.rt сохраняются), svg — надпись чертежа (только tspan)
const ED_TAGS = new Set(['b', 'strong', 'i', 'em', 'sup', 'sub', 'br', 'span', 'tspan', 'ul', 'ol', 'li']);
const ED_DROP = new Set(['script', 'style', 'template', 'iframe', 'object', 'embed', 'svg', 'math', 'img', 'picture', 'video', 'audio',
  'canvas', 'textarea', 'select', 'button', 'input', 'noscript', 'link', 'meta', 'head', 'title']);
const ED_STYLE = /^(fill|color)\s*:\s*var\(--[\w-]+\)$/;
function edClean(html, mode = 'html') {
  const svg = mode === 'svg', t = document.createElement('template');
  t.innerHTML = String(html ?? '');
  const attrs = el => {
    let s = '';
    const cls = el.getAttribute('class');
    if (cls && /^[\w -]{1,60}$/.test(cls)) s += ` class="${edAttr(cls)}"`;
    const st = (el.getAttribute('style') || '').split(';').map(x => x.trim()).filter(x => ED_STYLE.test(x));
    if (st.length) s += ` style="${edAttr(st.join(';'))}"`;
    const fs = el.getAttribute('font-style'), fw = el.getAttribute('font-weight');
    if (fs === 'italic' || fs === 'normal') s += ` font-style="${fs}"`;
    if (fw && /^(bold|normal|[1-9]00)$/.test(fw)) s += ` font-weight="${fw}"`;
    if (svg) {
      const bs = el.getAttribute('baseline-shift'), sz = el.getAttribute('font-size');
      if (bs === 'super' || bs === 'sub') s += ` baseline-shift="${bs}"`;
      if (sz && /^\d{1,3}%$/.test(sz)) s += ` font-size="${sz}"`;
    }
    return s;
  };
  const walk = n => {
    let s = '';
    for (const c of n.childNodes) {
      if (c.nodeType === 3) { s += edEsc(c.data); continue; }
      if (c.nodeType !== 1) continue;
      const tag = c.localName;
      if (ED_DROP.has(tag)) continue;
      if (tag === 'div' || tag === 'p') {   // новая строка в поле правки
        const inner = walk(c);
        s += (s && !s.endsWith('<br>') ? (svg ? ' ' : '<br>') : '') + inner;
        continue;
      }
      if (tag === 'br') { s += svg ? ' ' : '<br>'; continue; }
      if (!ED_TAGS.has(tag)) { s += walk(c); continue; }
      const inner = walk(c);
      if (svg) {
        if (['ul', 'ol', 'li'].includes(tag)) { s += inner + ' '; continue; }
        const extra = { b: ' font-weight="bold"', strong: ' font-weight="bold"', i: ' font-style="italic"', em: ' font-style="italic"',
          sup: ' baseline-shift="super" font-size="70%"', sub: ' baseline-shift="sub" font-size="70%"' }[tag] || '';
        s += `<tspan${extra}${attrs(c)}>${inner}</tspan>`;
      } else s += `<${tag}${attrs(c)}>${inner}</${tag}>`;
    }
    return s;
  };
  return walk(t.content).replace(/(<br>)+$/, '').trim();
}
const edLines = html => edClean(html).split('<br>').map(s => s.trim()).filter(Boolean);

// ---------- комплект урока ----------
// Комплект: { matshag: 1, slug, edits: { ключ: { o, t } }, e — числа примера, title — «Мой урок»,
//   id — у скачанного урока, changedAt / savedAt — когда правили и когда последний раз сохранили файлом или ссылкой }.
// Всё, что приходит из файла, ссылки или хранилища, проходит edValid: чужая тема и битые данные отклоняются.
const ED_KEY = /^[\w-]{1,30}:\d{1,3}:(q|a|note|rec:[01]|svg:[0-9a-z]{1,8}:\d{1,3})$/;
function edValid(k) {
  if (!k || typeof k !== 'object' || k.matshag !== 1) throw new Error('Это не файл правок «Матшага».');
  if (k.slug !== SLUG) throw new Error(`Это правки к другому материалу (${String(k.slug).slice(0, 80)}), а открыт «${META.title}».`);
  if (!k.edits || typeof k.edits !== 'object' || Array.isArray(k.edits)) throw new Error('В файле нет правок урока.');
  const edits = {};
  for (const [key, v] of Object.entries(k.edits)) {
    if (!ED_KEY.test(key) || !v || typeof v.o !== 'string' || typeof v.t !== 'string' || v.o.length > 20000 || v.t.length > 20000) continue;
    edits[key] = { o: v.o, t: key.includes(':svg:') ? edClean(v.t, 'svg') : key.includes(':rec:') ? v.t.split('\n').map(l => edClean(l)).filter(Boolean).join('\n') : edClean(v.t) };
  }
  const out = { matshag: 1, slug: SLUG, edits };
  if (k.e !== undefined && edPlain(k.e)) out.e = k.e;
  if (typeof k.title === 'string' && k.title.trim()) out.title = k.title.trim().slice(0, 60);
  if (typeof k.id === 'string' && /^[\w-]{1,40}$/.test(k.id)) out.id = k.id;
  for (const f of ['changedAt', 'savedAt']) if (Number.isFinite(k[f])) out[f] = k[f];
  return out;
}
// урок, скачанный «Скачать мой урок»: правки вшиты в файл, а хранилище у каждой скачанной копии своё —
// у файлов с диска в Chrome одно хранилище на все файлы, и две копии одной темы не должны смешиваться
const ED_FILE = (() => {
  const el = document.getElementById('teacher-kit');
  if (!el) return null;
  try { return edValid(JSON.parse(el.textContent)); } catch { return null; }
})();
const ED_STORE = ED_FILE?.id ? 'kit:' + ED_FILE.id : 'kit';
function edKit() {
  if (ED.kit) return ED.kit;
  let k = null;
  try { k = edValid(JSON.parse(store.get(ED_STORE) || 'null')); } catch {}
  return ED.kit = k || (ED_FILE ? JSON.parse(JSON.stringify(ED_FILE)) : { matshag: 1, slug: SLUG, edits: {} });
}
function edSave(changed = true) {
  const k = edKit();
  if (!Object.keys(k.edits).length) delete k.e;
  if (changed) k.changedAt = Date.now();
  store.set(ED_STORE, JSON.stringify(k));
}
// есть правки, которых нет ни в файле, ни в ссылке
const edUnsaved = () => (edKit().changedAt || 0) > (edKit().savedAt || 0);
// числа примера, при которых учитель правил урок (boardNumbers берёт их при открытии)
function edExample() {
  if (!ED_ON || B.show !== 'main') return null;
  const e = edKit().e;
  return e ? JSON.parse(JSON.stringify(e)) : null;
}
const edMineDiffers = () => B.show === 'main' && edKit().e && JSON.stringify(edKit().e) !== JSON.stringify(B.e);
// одна правка: t = null или тот же текст, что в теме, — правка снимается
function edSet(key, o, t) {
  const k = edKit(), svgKey = key.includes(':svg:'), recKey = key.includes(':rec:');
  const norm = s => svgKey ? edClean(s, 'svg') : recKey ? s.split('\n').map(l => edClean(l)).filter(Boolean).join('\n') : edClean(s);
  if (t === null || norm(t) === norm(o)) delete k.edits[key];
  else {
    k.edits[key] = { o, t: norm(t) };
    if (k.e === undefined && B.show === 'main' && edPlain(B.e)) k.e = JSON.parse(JSON.stringify(B.e));
  }
  edSave();
}

// ---------- показ: renderBoard пропускает каждое поле через edField, чертёж — через edSvg ----------
const edKey = f => `${B.show}:${B.i}:${f}` + (f === 'rec' ? ':' + B.phase : '');
function edField(f, el, o, view = s => s) {
  const key = edKey(f), ed = ED_ON ? edKit().edits[key] : null, hit = !!ed && ed.o === o;
  ED.cur[f] = { key, o };
  el.classList.toggle('ed-mod', hit);
  if (ED.on && ED.edit?.f === f) {   // учитель печатает в этом поле — не перебиваем
    if (el.contains(document.activeElement)) return;
    ED.edit = null;
  }
  setHTML(el, view(hit ? ed.t : o));
}
function edSvg() {
  ED.svg = [];
  const seen = {};
  for (const t of $('bStage').querySelectorAll('svg text')) {
    if (t.closest('[data-handle]')) continue;
    const o = t.innerHTML, h = edHash(o), n = seen[h] = (seen[h] || 0) + 1;
    const key = `${B.show}:${B.i}:svg:${h}:${n}`, ed = ED_ON ? edKit().edits[key] : null;
    t.setAttribute('data-ed', key);
    ED.svg.push({ key, o });
    if (ed && ed.o === o) { t.innerHTML = ed.t; t.classList.add('ed-mod'); }
    if (ED.pick?.key === key) t.classList.add('ed-sel');
  }
  if (ED.on) edPanel();
}

// ---------- режим правки ----------
function edToggle(on = !ED.on) {
  if (!ED_ON) return;
  if (!on) document.activeElement?.blur?.();
  ED.on = on; ED.pick = null; ED.sureAll = 0;
  $('board').classList.toggle('editing', on);
  $('bEditBtn').setAttribute('aria-pressed', String(on));
  for (const id of Object.values(ED_FIELDS)) {
    if (on) { $(id).setAttribute('contenteditable', 'true'); $(id).setAttribute('spellcheck', 'true'); }
    else $(id).removeAttribute('contenteditable');
  }
  $('bEdit').hidden = !on;
  if (on) $('edSvg').innerHTML = '';
  renderBoard();
}
function edCommit(f) {
  const e = ED.edit, el = $(ED_FIELDS[f]);
  ED.edit = null;
  if (!e || e.f !== f || el.innerHTML === e.before) { if (e?.typed) renderBoard(); return; }
  edSet(e.key, e.o, f === 'rec' ? edLines(el.innerHTML).join('\n') : el.innerHTML);
  renderBoard();
}
for (const [f, id] of Object.entries(ED_FIELDS)) {
  $(id).addEventListener('focusin', () => { if (ED.on && ED.cur[f]) ED.edit = { f, key: ED.cur[f].key, o: ED.cur[f].o, before: $(id).innerHTML }; });
  $(id).addEventListener('focusout', () => edCommit(f));
  // сохраняем на каждом вводе: правка не потеряется, даже если вкладку закроют, не выйдя из поля
  $(id).addEventListener('input', () => {
    if (!ED.on || !ED.cur[f]) return;
    if (ED.edit?.f !== f) ED.edit = { f, key: ED.cur[f].key, o: ED.cur[f].o, before: null };
    const el = $(id);
    edSet(ED.edit.key, ED.edit.o, f === 'rec' ? edLines(el.innerHTML).join('\n') : el.innerHTML);
    ED.edit.before = el.innerHTML; ED.edit.typed = true;
    el.classList.toggle('ed-mod', !!edKit().edits[ED.edit.key]);
    edPanel();
  });
}
// вставка — простым текстом (оформление и скрипты из буфера обмена не попадают)
$('board').addEventListener('paste', e => {
  if (!e.target.closest?.('[contenteditable="true"]')) return;
  e.preventDefault();
  document.execCommand('insertText', false, e.clipboardData?.getData('text/plain') || '');
});

// надпись чертежа: щелчок в режиме правки открывает её в панели
$('bStage').addEventListener('click', e => {
  if (!ED.on) return;
  const t = e.target.closest?.('text[data-ed]');
  if (!t) return;
  const s = ED.svg.find(x => x.key === t.getAttribute('data-ed'));
  if (s) edPick(s.key);
});
function edPick(key) {
  const s = ED.svg.find(x => x.key === key);
  if (!s) return;
  const ed = edKit().edits[key];
  ED.pick = { key, o: s.o };
  $('edSvg').innerHTML = `<span class="ed-h">Надпись на чертеже:</span>
    <div class="ed-box" id="edBox" contenteditable="true" spellcheck="true">${ed && ed.o === s.o ? ed.t : s.o}</div>
    <button type="button" class="main" data-eact="svg-save">Сохранить</button>
    <button type="button" data-eact="svg-cancel">Отмена</button>`;
  renderBoard();
  $('edBox').focus?.();
}
function edPickSave() {
  if (!ED.pick) return;
  edSet(ED.pick.key, ED.pick.o, edClean($('edBox').innerHTML, 'svg'));
  edPickClose();
}
function edPickClose() { ED.pick = null; $('edSvg').innerHTML = ''; renderBoard(); }
$('bEdit').addEventListener('keydown', e => {
  if (!e.target.closest?.('#edBox')) return;
  if (e.key === 'Enter') { e.preventDefault(); edPickSave(); }
  if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); edPickClose(); }
});

// правки этого шага: видимые сейчас и те, что не видны (другие числа, другое положение модели, тема изменилась)
function edStepEdits() {
  const pre = `${B.show}:${B.i}:`, k = edKit(), seen = [], hidden = [];
  for (const [key, v] of Object.entries(k.edits)) {
    if (!key.startsWith(pre)) continue;
    const f = key.slice(pre.length).split(':')[0];
    const vis = f === 'svg' ? ED.svg.some(s => s.key === key && s.o === v.o) : ED.cur[f]?.key === key && ED.cur[f].o === v.o;
    const name = f === 'svg' ? `Надпись «${edText(v.o).slice(0, 40)}»` : ED_NAMES[f] + (f === 'rec' ? (key.endsWith(':0') ? ' (до ответа)' : '') : '');
    (vis ? seen : hidden).push({ key, name, v });
  }
  return { seen, hidden };
}
function edPanel() {
  const { seen, hidden } = edStepEdits(), all = Object.keys(edKit().edits).length;
  const item = x => `<span class="ed-i">${edEsc(x.name)}<button type="button" class="ed-x" data-eact="revert" data-key="${edAttr(x.key)}" title="Вернуть как было" aria-label="Вернуть как было: ${edAttr(x.name)}">↺</button></span>`;
  let s = '';
  if (seen.length) s += `<span class="ed-h">Изменено на шаге:</span>${seen.map(item).join('')}`;
  if (hidden.length) s += `<span class="ed-h" title="Правка сделана при других числах или другом положении чертежа">Сейчас не видно:</span>${hidden.map(item).join('')}`;
  if (edMineDiffers()) s += `<button type="button" data-eact="mine" title="Вернуть числа, при которых вы правили урок">↩ Числа моего урока</button>`;
  s += `<span class="ed-n">Всего правок: <b>${all}</b></span>`;
  if (edUnsaved() && (ED_FILE || all >= 3)) s += `<span class="ed-warn">${ED_FILE
    ? 'Есть правки, которых нет в файле урока: нажмите «Скачать мой урок», чтобы сохранить новую версию.'
    : 'Правки хранятся только в этом браузере: скачайте урок или сохраните правки в файл, чтобы не потерять.'}</span>`;
  setHTML($('edList'), s);
  $('edAll').textContent = ED.sureAll ? 'Точно вернуть весь урок?' : 'Вернуть весь урок';
  $('edAll').disabled = !all;
  $('edStep').disabled = !(seen.length + hidden.length);
  $('edHint').hidden = all > 0;
  if (document.activeElement !== $('edTitle')) $('edTitle').value = edKit().title || '';
}
function edRevertStep() {
  const pre = `${B.show}:${B.i}:`, k = edKit();
  for (const key of Object.keys(k.edits)) if (key.startsWith(pre)) delete k.edits[key];
  edSave(); renderBoard();
}
function edRevertAll() {
  if (!ED.sureAll) { ED.sureAll = setTimeout(() => { ED.sureAll = 0; if (ED.on) edPanel(); }, 4000); edPanel(); return; }
  clearTimeout(ED.sureAll); ED.sureAll = 0;
  edKit().edits = {}; edSave(); renderBoard();
}
function edMine() {
  if (!edKit().e) return;
  const i = B.i;
  B.e = null;   // boardNumbers(false) без прошлого примера берёт числа урока (edExample)
  boardNumbers(false);
  boardGo(i, 0);
}
$('bEdit').addEventListener('click', e => {
  const b = e.target.closest('[data-eact]');
  if (!b) return;
  const a = b.dataset.eact;
  if (a === 'done') edToggle(false);
  if (a === 'revert') { const k = edKit(); delete k.edits[b.dataset.key]; edSave(); renderBoard(); }
  if (a === 'step') edRevertStep();
  if (a === 'all') edRevertAll();
  if (a === 'mine') edMine();
  if (a === 'svg-save') edPickSave();
  if (a === 'svg-cancel') edPickClose();
  if (a === 'lesson') edDownload(edFileName('html'), edLessonHTML(), 'text/html');
  if (a === 'save') { edDownload(edFileName('json'), edKitJSON(), 'application/json'); edMsg('Правки сохранены в файл. Открыть их: «📂 Открыть правки» в этом материале.', 'ok'); }
  if (a === 'open') $('edFile').click();
  if (a === 'link') edLinkShow();
  if (a === 'load-yes') edApply(ED.pending);
  if (a === 'load-no') { ED.pending = null; edMsg(''); }
});
$('edTitle').addEventListener('change', () => {
  const t = $('edTitle').value.trim().slice(0, 60), k = edKit();
  if (t) k.title = t; else delete k.title;
  edSave(); edTitleShow();
});

// ---------- комплект: скачанный урок, файл правок, ссылка ----------
function edMsg(text, kind = '') {
  $('edMsg').className = 'ed-msg' + (kind ? ' ' + kind : '');
  $('edMsg').textContent = text;
}
const edFileName = ext => {
  const t = (edKit().title || '').replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-+|-+$/g, '').slice(0, 40);
  return `${SLUG}-${t || (ext === 'html' ? 'moi-urok' : 'pravki')}.${ext}`;
};
function edDownload(name, text, type) {
  try {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([text], { type: type + ';charset=utf-8' }));
    a.download = name;
    document.body.append(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 10000);
    if (type === 'text/html') edMsg(`Скачан «${name}». Откройте его двойным щелчком — урок с вашими правками работает и без интернета.`, 'ok');
  } catch { edMsg('Браузер не дал скачать файл.', 'err'); }
}
// то, что уходит в файл и ссылку: только данные урока
const edExport = () => {
  const k = edKit(), out = { matshag: 1, slug: SLUG, edits: k.edits };
  if (k.e !== undefined) out.e = k.e;
  if (k.title) out.title = k.title;
  return out;
};
const edMarkSaved = () => { edKit().savedAt = Date.now(); edSave(false); if (ED.on) edPanel(); };
function edKitJSON() { const s = JSON.stringify(edExport(), null, 1); edMarkSaved(); return s; }
// копия этого материала со вшитым комплектом: скрипт application/json с id teacher-kit в начале body,
// чтобы он был прочитан раньше кода материала. У каждой скачанной копии свой id — своё хранилище.
// Пометка о копии — комментарием перед html; его начало собрано из частей: в коде страницы нельзя
// писать начало HTML-комментария и тег скрипта (сборка это проверяет).
const ED_NOTE = '<' + '!-- Урок учителя на основе материала с matshag.ru. Правки вшиты в этот файл (teacher-kit). --' + '>';
function edLessonHTML() {
  const now = Date.now(), kit = { ...edExport(), id: now.toString(36) + Math.random().toString(36).slice(2, 8), savedAt: now, changedAt: now };
  const c = PAGE_SRC.cloneNode(true);
  c.querySelector('#teacher-kit')?.remove();
  const s = document.createElement('script');
  s.type = 'application/json'; s.id = 'teacher-kit';
  s.textContent = JSON.stringify(kit).replace(/</g, '\\u003c');   // закрывающий тег скрипта в тексте правки не закроет этот тег
  const body = c.querySelector('body');
  body.insertBefore(s, body.firstChild);
  if (kit.title) c.querySelector('title').textContent = `${kit.title} — ${META.title} — Матшаг`;
  edMarkSaved();
  return '<!doctype html>\n' + ED_NOTE + '\n' + c.outerHTML;
}
// открыть: файл правок (.json) или скачанный урок (.html) — его вшитый комплект
$('edFile').addEventListener('change', async () => {
  const f = $('edFile').files?.[0];
  $('edFile').value = '';
  if (!f) return;
  try { edOffer(edParseFile(await f.text())); } catch (e) { edMsg(e.message, 'err'); }
});
function edParseFile(text) {
  let data;
  if (/^\s*[{[]/.test(text)) {
    try { data = JSON.parse(text); } catch { throw new Error('Файл повреждён: это не файл правок «Матшага».'); }
  } else {
    const el = new DOMParser().parseFromString(text, 'text/html').getElementById('teacher-kit');
    if (!el) throw new Error('В этом файле нет правок учителя.');
    try { data = JSON.parse(el.textContent); } catch { throw new Error('Правки в файле повреждены.'); }
  }
  return edValid(data);
}
const edPl = n => n % 10 === 1 && n % 100 !== 11 ? 'правка' : [2, 3, 4].includes(n % 10) && ![12, 13, 14].includes(n % 100) ? 'правки' : 'правок';
function edOffer(kit) {
  const n = Object.keys(kit.edits).length, mine = Object.keys(edKit().edits).length;
  if (!mine) return edApply(kit);
  ED.pending = kit;
  $('edMsg').className = 'ed-msg';
  $('edMsg').innerHTML = `В файле ${n} ${edPl(n)}${kit.title ? ` («${edEsc(kit.title)}»)` : ''}. Заменить ими ваши ${mine} ${edPl(mine)}?
    <button type="button" class="main" data-eact="load-yes">Заменить</button> <button type="button" data-eact="load-no">Отмена</button>`;
}
function edApply(kit) {
  if (!kit) return;
  ED.pending = null;
  const k = edKit();
  ED.kit = { ...kit, ...(k.id ? { id: k.id } : {}), ...(k.savedAt ? { savedAt: k.savedAt } : {}) };
  edSave();
  B.e = null;
  boardNumbers(false);
  boardGo(0, 0);
  edTitleShow();
  const n = Object.keys(kit.edits).length;
  if (ED.on) edMsg(`Открыто: ${n} ${edPl(n)}.`, 'ok');
}
// название урока — в верхней строке доски: учитель видит, какой урок открыт
function edTitleShow() {
  const t = ED_ON && edKit().title;
  document.querySelector('#board .ttl').textContent = META.title + (t ? ' · ' + t : '');
}

// ссылка: комплект сжат (deflate-raw) и лежит после # — эта часть адреса не уходит на сервер
const ED_LINK_MAX = 8000;
const edB64 = bytes => {
  let s = '';
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const edUnB64 = s => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), c => c.charCodeAt(0));
const edStream = async (bytes, T) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(new T('deflate-raw'))).arrayBuffer());
async function edPack(text) {
  const bytes = new TextEncoder().encode(text);
  if (typeof CompressionStream === 'function') { try { return 'z.' + edB64(await edStream(bytes, CompressionStream)); } catch {} }
  return 'j.' + edB64(bytes);
}
async function edUnpack(s) {
  const kind = s.slice(0, 2), data = s.slice(2);
  if (kind === 'j.') return new TextDecoder().decode(edUnB64(data));
  if (kind === 'z.' && typeof DecompressionStream === 'function') return new TextDecoder().decode(await edStream(edUnB64(data), DecompressionStream));
  throw new Error('Ссылка повреждена или открыта в слишком старом браузере.');
}
async function edLink() {
  const site = /^https?:$/.test(location.protocol) && /\/materials\/[a-z0-9-]+\.html$/.test(location.pathname);
  const base = site ? location.origin + location.pathname : `https://matshag.ru/materials/${SLUG}.html`;
  const url = `${base}?mode=board#kit=${await edPack(JSON.stringify(edExport()))}`;
  edMarkSaved();
  return url;
}
async function edLinkShow() {
  const url = await edLink();
  $('edMsg').className = 'ed-msg';
  $('edMsg').innerHTML = `<input type="text" class="ed-url" id="edUrl" readonly value="${edAttr(url)}"> <span id="edUrlNote"></span>`;
  $('edUrl').select?.();
  let copied = false;
  try { await navigator.clipboard.writeText(url); copied = true; } catch {}
  $('edUrlNote').textContent = (copied ? 'Ссылка скопирована. ' : 'Скопируйте ссылку. ') +
    (url.length > ED_LINK_MAX ? `Она длинная (${url.length} знаков) — почта или мессенджер могут её обрезать; надёжнее «Скачать мой урок».`
      : 'Откройте её на другом компьютере — урок будет с вашими правками.');
}
// открыт материал по ссылке с правками: спрашиваем, свои правки молча не заменяем
async function edFromLink() {
  const m = location.hash.match(/^#kit=([\w.-]+)$/);
  if (!m) return null;
  try { history.replaceState(null, '', location.pathname + location.search); } catch {}
  let kit = null, err = '';
  try { kit = edValid(JSON.parse(await edUnpack(m[1]))); }
  catch (e) { err = e instanceof SyntaxError || e instanceof DOMException || e instanceof TypeError ? 'Ссылка повреждена: правки не читаются.' : e.message; }
  const n = kit ? Object.keys(kit.edits).length : 0, mine = Object.keys(edKit().edits).length;
  $('edAskP').textContent = err || `В ссылке ${n} ${edPl(n)} учителя${kit.title ? ` — «${kit.title}»` : ''}.` +
    (mine ? ` Ваши ${mine} ${edPl(mine)} в этом браузере будут заменены.` : '');
  $('edAskYes').hidden = !!err;
  $('edAskNo').textContent = err ? 'Понятно' : 'Не применять';
  ED.pending = kit;
  $('edAsk').hidden = false;
  return kit;
}
$('edAsk').addEventListener('click', e => {
  const a = e.target.closest('[data-eact]')?.dataset.eact;
  if (a === 'ask-yes') { $('edAsk').hidden = true; edApply(ED.pending); }
  if (a === 'ask-no') { $('edAsk').hidden = true; ED.pending = null; }
});

if (!ED_ON) $('bEditBtn').hidden = true;
else {
  edTitleShow();
  ED.link = edFromLink();
  // ссылку вставили во вкладку, где материал уже открыт: браузер меняет только # — страница не перезагружается
  addEventListener('hashchange', () => { ED.link = edFromLink(); });
}
