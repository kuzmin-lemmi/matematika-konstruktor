// ================= 🖐 Живая доска =================
// Тема описывает только математику: модель (const LIVE) и на шагах — что можно двигать и менять (step.live).
// Ядро берёт на себя мышь, касание и перо (Pointer Events), клавиатуру, сброс, повтор опыта,
// плавное движение и prefers-reduced-motion. Схема — ИНСТРУКЦИЯ.md, раздел «Живая доска».
//
// const LIVE = {
//   model: e => ({ ... }),      // исходное состояние модели для примера e (простые данные: числа, строки, {x, y}, массивы)
//   fix(m) { ... },             // необязательно: привести модель к допустимому виду — прилипание, границы
//   ok: m => true,              // необязательно: false — положение вырождено, движение отменяется
// };
// step.live = {
//   enter(m) { ... },           // как поставить модель при входе в шаг (можно liveTo — плавно)
//   reveal(m) { ... },          // опыт по кнопке «Показать ответ» (обычно liveTo); «▶ Повторить опыт» запускает его снова
//   handles: (m, phase) => [{ id, at: {x, y}, label, move(m, p) {...}, key?(m, dx, dy, fine), keyStep?, r? }],
//   controls: (m, phase) => [
//     { id, type: 'range', label, min, max, step, get: m => …, set(m, v) {...}, text?: m => '…' },
//     { id, type: 'toggle', label, get: m => true|false, set(m, v) {...} },
//     { id, type: 'choice', label, options: [[значение, 'подпись'], …], get, set },
//     { id, type: 'button', label, run(m) {...} },
//   ],
// };
// draw(phase, m), rec(phase, m), q(m, phase), a(m, phase), note(m, phase) читают модель m.
const LV = { entered: false, snap: null, anim: null, drag: null, instant: false, handles: [], controls: [], ctlKey: '' };
const liveCopy = m => JSON.parse(JSON.stringify(m ?? {}));
const liveOf = () => B.steps[B.i]?.live || null;
const liveModel = e => typeof LIVE !== 'undefined' ? LIVE.model(e) : {};
function liveFix(m) { if (typeof LIVE !== 'undefined' && LIVE.fix) LIVE.fix(m); }
// изменение модели учителем: после fix проверяем ok, вырожденное положение откатываем
function liveChange(fn) {
  const before = liveCopy(B.m);
  fn(B.m);
  liveFix(B.m);
  const ok = typeof LIVE === 'undefined' || !LIVE.ok || LIVE.ok(B.m);
  if (!ok) B.m = before;
  renderBoard();
  return ok;
}

// ---------- шаги ----------
function liveEnter(revealed = false) {
  LV.entered = true;
  const lv = liveOf();
  if (lv?.enter) { lv.enter(B.m); liveFix(B.m); }
  LV.snap = liveCopy(LV.anim ? LV.anim.end : B.m);   // исходное положение шага — куда ведёт движение входа
  if (revealed) { liveStop(); liveRevealNow(); }
}
function liveReveal() { const lv = liveOf(); if (lv?.reveal) { lv.reveal(B.m); if (!LV.anim) { liveFix(B.m); renderBoard(); } } }
function liveRevealNow() { LV.instant = true; try { liveOf()?.reveal?.(B.m); liveFix(B.m); } finally { LV.instant = false; } }
// «← Назад» с ответа на вопрос — модель снова как до опыта
function liveBack() { if (liveOf() && LV.snap) B.m = liveCopy(LV.snap); }
// «⟲ Сбросить»: положение начала шага (на ответе — итог опыта)
function liveReset() { liveStop(); if (LV.snap) B.m = liveCopy(LV.snap); if (B.phase === 1) liveRevealNow(); renderBoard(); }
// «▶ Повторить опыт»: вернуть модель к началу шага и снова провести опыт
function liveAgain() { liveStop(); if (LV.snap) B.m = liveCopy(LV.snap); renderBoard(); liveReveal(); }

// ---------- плавное движение ----------
// liveTo({ theta: 90 }) или liveTo([{ theta: 40 }, { theta: 120 }], 700) — через точки, ms на каждый отрезок.
// Числа (и числа внутри {x, y} и массивов) меняются плавно, остальное — в конце. Учитель листает или берёт
// ручку — движение сразу заканчивается в конечном положении. prefers-reduced-motion — сразу конечное положение.
const liveCalm = () => typeof requestAnimationFrame !== 'function' || !window.matchMedia || matchMedia('(prefers-reduced-motion: reduce)').matches;
const liveEase = u => u < .5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
function liveMix(p, q, w) {
  if (typeof p === 'number' && typeof q === 'number') return p + (q - p) * w;
  if (p && q && typeof p === 'object' && typeof q === 'object') {
    const o = Array.isArray(q) ? [] : {};
    for (const k of Object.keys(q)) o[k] = k in p ? liveMix(p[k], q[k], w) : q[k];
    return o;
  }
  return w < 1 ? p : q;
}
function liveTo(to, ms = 800) {
  liveStop();
  const list = Array.isArray(to) ? to : [to], pts = [liveCopy(B.m)];
  list.forEach(q => pts.push({ ...pts[pts.length - 1], ...liveCopy(q) }));
  const end = pts[pts.length - 1], n = list.length;
  if (LV.instant || liveCalm()) { Object.assign(B.m, end); return; }
  const t0 = performance.now(), a = { end, raf: 0 };
  const tick = now => {
    const u = Math.min(1, (now - t0) / (ms * n));
    if (u >= 1) { LV.anim = null; Object.assign(B.m, end); liveFix(B.m); renderBoard(); return; }
    const k = Math.min(n - 1, Math.floor(u * n));
    Object.assign(B.m, liveMix(pts[k], pts[k + 1], liveEase(u * n - k)));
    renderBoard();
    a.raf = requestAnimationFrame(tick);
  };
  LV.anim = a; a.raf = requestAnimationFrame(tick);
}
function liveStop() {
  if (!LV.anim) return;
  const a = LV.anim; LV.anim = null;
  cancelAnimationFrame(a.raf);
  Object.assign(B.m, a.end); liveFix(B.m);
}

// ---------- ручки на чертеже ----------
function liveHandlesSVG(st) {
  LV.handles = st.live?.handles ? st.live.handles(B.m, B.phase).filter(Boolean) : [];
  return LV.handles.map(h => `<g class="lv-h${h.cls ? ' ' + h.cls : ''}" data-handle="${h.id}" tabindex="0" role="button" ` +
    `aria-label="${esc(h.label)}: тяните или двигайте стрелками" transform="translate(${GEO.f1(h.at.x)} ${GEO.f1(h.at.y)})">` +
    `<title>${esc(h.label)}</title><circle class="lv-hit" r="44"/><circle class="lv-dot" r="${h.r || 18}"/></g>`).join('');
}
const liveBox = { x: 0, y: 0, w: BW, h: BH };
// перетащить ручку id в точку p (координаты чертежа); false — положение вырождено и не принято
function liveDrag(id, p) {
  const h = LV.handles.find(x => x.id === id);
  if (!h) return false;
  liveStop();
  return liveChange(m => h.move(m, GEO.keepIn(p, 8, liveBox), h));
}
// сдвинуть ручку с клавиатуры: стрелки — шаг keyStep (20), с Shift — мельче; у ручки может быть свой key()
function liveKey(id, dx, dy, fine = false) {
  const h = LV.handles.find(x => x.id === id);
  if (!h) return false;
  liveStop();
  if (h.key) return liveChange(m => h.key(m, dx, dy, fine));
  const s = (h.keyStep || 20) / (fine ? 4 : 1);
  return liveChange(m => h.move(m, GEO.keepIn({ x: h.at.x + dx * s, y: h.at.y + dy * s }, 8, liveBox), h));
}
function livePoint(e) {
  const M = $('bStage').querySelector('svg')?.getScreenCTM?.();
  if (!M) return null;
  const p = new DOMPoint(e.clientX, e.clientY).matrixTransform(M.inverse());
  return { x: p.x, y: p.y };
}
$('bStage').addEventListener('pointerdown', e => {
  const g = e.target.closest?.('[data-handle]'), h = g && LV.handles.find(x => x.id === g.dataset.handle), p = h && livePoint(e);
  if (!p) return;
  liveStop();
  LV.drag = { id: h.id, dx: h.at.x - p.x, dy: h.at.y - p.y };
  $('bStage').setPointerCapture?.(e.pointerId);
  g.focus?.({ preventScroll: true });
  $('board').classList.add('dragging');
  e.preventDefault();
});
$('bStage').addEventListener('pointermove', e => {
  if (!LV.drag) return;
  const p = livePoint(e);
  if (p) liveDrag(LV.drag.id, { x: p.x + LV.drag.dx, y: p.y + LV.drag.dy });
});
const liveDragEnd = () => { LV.drag = null; $('board').classList.remove('dragging'); };
$('bStage').addEventListener('pointerup', liveDragEnd);
$('bStage').addEventListener('pointercancel', liveDragEnd);
// клавиатура: true — клавишу обработала живая доска, листать шаги не нужно
function liveKeydown(e) {
  if (e.target.closest?.('#bLive') && [' ', 'Enter'].includes(e.key)) return true;   // кнопки панели нажимаются сами
  const g = e.target.closest?.('[data-handle]');
  const d = g && { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
  if (!d) return false;
  e.preventDefault();
  liveKey(g.dataset.handle, d[0], d[1], e.shiftKey);
  return true;
}

// ---------- панель управления под чертежом ----------
function liveCtlHTML(c) {
  const id = `data-ctl="${c.id}"`;
  if (c.type === 'range') return `<label class="lv-c"><span>${c.label}</span><input type="range" ${id} min="${c.min}" max="${c.max}" step="${c.step || 1}"><output data-out="${c.id}"></output></label>`;
  if (c.type === 'toggle') return `<button type="button" class="lv-t" ${id} aria-pressed="false">${c.label}</button>`;
  if (c.type === 'choice') return `<span class="lv-c" role="group" aria-label="${esc(String(c.label).replace(/<[^>]+>/g, ''))}"><span>${c.label}</span><span class="seg">` +
    c.options.map(([, t], i) => `<button type="button" ${id} data-v="${i}" aria-pressed="false">${t}</button>`).join('') + '</span></span>';
  return `<button type="button" ${id}>${c.label}</button>`;
}
function liveRenderControls(st) {
  const box = $('bLive'), lv = st.live;
  if (!lv) { box.hidden = true; box.innerHTML = ''; LV.ctlKey = ''; LV.controls = []; return; }
  const cs = LV.controls = lv.controls ? lv.controls(B.m, B.phase).filter(Boolean) : [];
  const again = lv.reveal && B.phase === 1;
  const key = `${B.i}:${B.phase}:${cs.map(c => c.id + c.type + (c.options || []).length).join(',')}`;
  if (key !== LV.ctlKey) {
    LV.ctlKey = key;
    box.innerHTML = cs.map(liveCtlHTML).join('') + '<span class="lv-tools">' +
      (again ? '<button type="button" data-live="again" title="Вернуть чертёж и провести опыт ещё раз">▶ Повторить опыт</button>' : '') +
      '<button type="button" data-live="reset" title="Вернуть чертёж к началу шага">⟲ Сбросить</button></span>';
  }
  box.hidden = false;
  for (const c of cs) {
    const els = box.querySelectorAll(`[data-ctl="${c.id}"]`), v = c.get ? c.get(B.m) : null, off = !!c.disabled?.(B.m);
    els.forEach(el => { el.disabled = off; });
    if (c.type === 'range') {
      if (+els[0].value !== v) els[0].value = v;
      box.querySelector(`[data-out="${c.id}"]`).innerHTML = c.text ? c.text(B.m) : String(v).replace('-', MINUS).replace('.', ',');
    }
    if (c.type === 'toggle') els[0].setAttribute('aria-pressed', String(!!v));
    if (c.type === 'choice') els.forEach(el => el.setAttribute('aria-pressed', String(c.options[+el.dataset.v][0] === v)));
  }
}
// значение элемента управления: range — число, toggle — true/false (по умолчанию — переключить), choice — значение варианта
function liveSet(id, value) {
  const c = LV.controls.find(x => x.id === id);
  if (!c) return false;
  liveStop();
  if (c.type === 'button') { c.run(B.m); if (!LV.anim) { liveFix(B.m); renderBoard(); } return true; }
  if (c.type === 'toggle') return liveChange(m => c.set(m, value === undefined ? !c.get(m) : !!value));
  return liveChange(m => c.set(m, value));
}
$('bLive').addEventListener('input', e => {
  const el = e.target.closest('input[data-ctl]');
  if (el) liveSet(el.dataset.ctl, +el.value);
});
$('bLive').addEventListener('click', e => {
  const el = e.target.closest('button');
  if (!el) return;
  if (el.dataset.live === 'reset') return liveReset();
  if (el.dataset.live === 'again') return liveAgain();
  const c = LV.controls.find(x => x.id === el.dataset.ctl);
  if (c) liveSet(c.id, c.type === 'choice' ? c.options[+el.dataset.v][0] : undefined);
});
