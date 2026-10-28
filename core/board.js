// ================= 🖥 На доске =================
// На экране — то, что видит класс: короткий вопрос, ответ, чертёж и запись в тетради.
// Что сказать словами — в подсказке учителю (кнопка «💬 Учителю»).
const BW = 980, BH = 400;
const B = { e: null, m: {}, steps: [], i: 0, phase: 0, timer: 0, notes: false, show: 'main' };
// q, a, note и rec шага могут быть строкой или функцией (m — модель живой доски, phase — 0 вопрос, 1 ответ)
const stepVal = (x, ...args) => typeof x === 'function' ? x(...args) : x;
const setHTML = (el, s) => { if (el.innerHTML !== s) el.innerHTML = s; };
const svg = (inner, label) => `<svg viewBox="0 0 ${BW} ${BH}" role="img" aria-label="${label}" preserveAspectRatio="xMidYMid meet">${inner}</svg>`;
const tx = (x, y, s, cls = 'lab', anchor = 'middle') => `<text class="${cls}" x="${x}" y="${y}" text-anchor="${anchor}">${s}</text>`;
const sr = s => `√<tspan class="ov">${s}</tspan>`;   // корень в подписи чертежа
const ds = x => decStr(x) || `${x.n}/${x.d}`;
// клетчатый квадрат cols × rows клеток размера c; fill — заливка, every — жирная линия через every клеток
function grid(x, y, cols, rows, c, fill = 'ge', every = 0) {
  let s = `<rect class="${fill}" x="${x}" y="${y}" width="${cols * c}" height="${rows * c}"/>`;
  for (let i = 1; i < cols; i++) s += `<line class="gl${every && i % every === 0 ? ' gk' : ''}" x1="${x + i * c}" x2="${x + i * c}" y1="${y}" y2="${y + rows * c}"/>`;
  for (let j = 1; j < rows; j++) s += `<line class="gl${every && j % every === 0 ? ' gk' : ''}" x1="${x}" x2="${x + cols * c}" y1="${y + j * c}" y2="${y + j * c}"/>`;
  return s + `<rect class="gf" x="${x}" y="${y}" width="${cols * c}" height="${rows * c}"/>`;
}
// скобка под отрезком и подпись
const under = (x, y, w, s, cls = '') => `<path class="br ${cls}" d="M${x} ${y + 10}v12H${x + w}v-12"/>` + tx(x + w / 2, y + 62, s, 'lab' + (cls ? ' ' + cls : ''));
function svgFrac(cx, cy, n, d, cls = '') {
  const w = Math.max(String(n).length, String(d).length) * 10 + 10;
  return `<g class="lbl ${cls}"><text x="${cx}" y="${cy - 8}" text-anchor="middle">${n}</text><line x1="${cx - w}" x2="${cx + w}" y1="${cy}" y2="${cy}"/><text x="${cx}" y="${cy + 31}" text-anchor="middle">${d}</text></g>`;
}
// числовая прямая от a до b (в десятых), подсветка [h, h + step]
function numLine(y, a, b, step, labelEvery, hl, cls = '') {
  const x0 = 90, x1 = 890, k = (x1 - x0) / (b - a);
  let s = `<line class="axis" x1="${x0 - 20}" x2="${x1 + 20}" y1="${y}" y2="${y}"/>`;
  const n = Math.round((b - a) / step);
  for (let i = 0; i <= n; i++) {
    const v = a + i * step, x = x0 + i * step * k;
    s += `<line class="tick" x1="${x}" x2="${x}" y1="${y - 12}" y2="${y + 12}"/>`;
    if (i % labelEvery === 0) s += tx(x, y + 48, String(Math.round(v * 1000) / 1000).replace('.', ',').replace('-', MINUS), 'lab s');
  }
  if (hl != null) s += `<line class="seg ${cls}" x1="${x0 + (hl - a) * k}" x2="${x0 + (hl + step - a) * k}" y1="${y}" y2="${y}"/>`;
  return s;
}

// пример для показа: тема даёт boardExample(random, прошлый пример) и buildSteps(пример) → шаги
// {q — вопрос классу, a — ответ, note — подсказка учителю, draw(phase, m) — SVG или '', rec(phase, m) — строки тетради,
//  live — что можно двигать и менять на этом шаге (core/live.js)}
function boardNumbers(random) {
  liveStop();
  if (B.show !== 'main') {   // разминка, диктант и другие виды показа — core/shows.js
    B.e = { seed: random ? (Math.random() * 4294967296) >>> 0 : 1 };
    B.steps = SHOWS[B.show].steps(B.e.seed);
    B.m = {}; B.i = 0; B.phase = 0; LV.entered = false;
    liveEnter();
    return;
  }
  B.e = boardExample(random, B.e || {});
  B.steps = buildSteps(B.e);
  B.m = liveModel(B.e);
  B.i = 0; B.phase = 0;
  liveEnter();
}
function renderBoard() {
  if (!B.steps.length) boardNumbers(false);
  const st = B.steps[B.i], m = B.m, ph = B.phase;
  $('bCnt').textContent = `Шаг ${B.i + 1} из ${B.steps.length}`;
  setHTML($('bQ'), stepVal(st.q, m, ph));
  setHTML($('bA'), stepVal(st.a, m, ph));
  $('bA').classList.toggle('hide', ph === 0);
  const pic = st.draw(ph, m), handles = liveHandlesSVG(st);
  const focused = document.activeElement?.closest?.('[data-handle]')?.dataset.handle;
  $('bStage').innerHTML = pic || handles ? svg(pic + handles, 'Чертёж к шагу').replace('<svg ', handles ? '<svg class="live" ' : '<svg ') : '';
  if (focused) $('bStage').querySelector(`[data-handle="${focused}"]`)?.focus({ preventScroll: true });
  setHTML($('bRec'), stepVal(st.rec, ph, m).map(l => `<div class="ln">${l}</div>`).join(''));
  setHTML($('bNote'), `<b>Учителю</b>${stepVal(st.note, m, ph)}`);
  $('bNote').hidden = !B.notes;
  $('bNotesBtn').setAttribute('aria-pressed', String(B.notes));
  $('bNext').textContent = ph === 0 ? 'Показать ответ' : 'Далее →';
  $('bNext').disabled = B.i === B.steps.length - 1 && ph === 1;
  liveRenderControls(st);
  boardTimerSync();
}
function boardNext() {
  if (B.phase === 0) { liveStop(); B.phase = 1; renderBoard(); liveReveal(); }
  else if (B.i < B.steps.length - 1) boardGo(B.i + 1, 0);
}
function boardPrev() {
  if (B.phase === 1) { liveStop(); B.phase = 0; liveBack(); renderBoard(); }
  else if (B.i > 0) boardGo(B.i - 1, 1);
}
// переход к шагу: модель ставится, как задумано шагом (live.enter); с phase = 1 — сразу итог опыта
function boardGo(i, phase = 0) {
  liveStop();
  const was = B.i;
  B.i = Math.max(0, Math.min(i, B.steps.length - 1)); B.phase = phase ? 1 : 0;
  if (B.i !== was || B.phase === 1 || !LV.entered) liveEnter(B.phase === 1);
  renderBoard();
}
// «Заново»: исходная модель примера и первый шаг
function boardRestart() { liveStop(); B.m = liveModel(B.e); LV.entered = false; boardGo(0, 0); }
function boardNotes() { B.notes = !B.notes; store.set('notes', B.notes ? 1 : 0); renderBoard(); }
// превью на сайте: доска сама идёт по шагам до BOARD.previewUntil и начинает сначала
function boardStartPreview() {
  $('board').classList.add('preview');
  B.timer = setInterval(() => {
    if (B.i >= BOARD.previewUntil && B.phase === 1) boardGo(0, 0);
    else boardNext();
  }, CONFIG.board.previewDelay);
}
function boardStopPreview() { clearInterval(B.timer); B.timer = 0; }
// кадр для картинки-превью (npm run posters на сайте): шаг BOARD.poster с показанным ответом
function boardPoster() { boardStopPreview(); boardGo(BOARD.poster, 1); }

