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
function edKit() {
  if (ED.kit) return ED.kit;
  let k = null;
  try { k = JSON.parse(store.get('kit') || 'null'); } catch {}
  if (!k || k.matshag !== 1 || k.slug !== SLUG || !k.edits || typeof k.edits !== 'object') k = { matshag: 1, slug: SLUG, edits: {} };
  for (const [key, v] of Object.entries(k.edits)) {
    if (!v || typeof v.o !== 'string' || typeof v.t !== 'string') { delete k.edits[key]; continue; }
    v.t = key.includes(':svg:') ? edClean(v.t, 'svg') : key.includes(':rec:') ? v.t.split('\n').map(l => edClean(l)).join('\n') : edClean(v.t);
  }
  if (k.e !== undefined && !edPlain(k.e)) delete k.e;
  return ED.kit = k;
}
function edSave() {
  const k = edKit();
  if (!Object.keys(k.edits).length) delete k.e;
  store.set('kit', JSON.stringify(k));
}
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
  setHTML($('edList'), s);
  $('edAll').textContent = ED.sureAll ? 'Точно вернуть весь урок?' : 'Вернуть весь урок';
  $('edAll').disabled = !all;
  $('edStep').disabled = !(seen.length + hidden.length);
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
});
if (!ED_ON) $('bEditBtn').hidden = true;
