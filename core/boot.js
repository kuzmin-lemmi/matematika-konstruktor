// ================= Управление =================
let lastInput = null;
document.addEventListener('click', e => {
  const el = e.target.closest('[data-go],[data-act],[data-level],[data-copy],[data-choice],[data-count],[data-kind-set]');
  if (!el) return;
  if (el.dataset.go) { if (el.dataset.kind) pendingKind = el.dataset.kind; return show(el.dataset.go); }
  if (el.dataset.kindSet) { $('pKind').value = el.dataset.kindSet; return drawSheets(); }
  if (el.dataset.level) { H.level = +el.dataset.level; return homeStart(); }
  if (el.dataset.copy) return copyLevelLink(+el.dataset.copy);
  if (el.dataset.choice) return homeCheckClick(el.dataset.choice);
  if (el.dataset.count) { H.eqCount = +el.dataset.count; return homeRender(); }
  const act = el.dataset.act;
  if (act === 'menu') { if (document.fullscreenElement) toggleFull(); show('start'); }
  if (act === 'next') boardNext();
  if (act === 'prev') boardPrev();
  if (act === 'restart') boardRestart();
  if (act === 'numbers') { boardNumbers(true); renderBoard(); }
  if (act === 'theme') toggleTheme();
  if (act === 'full') toggleFull();
  if (act === 'notes') boardNotes();
  if (act === 'check') homeCheckClick();
  if (act === 'sqrt') {
    const i = lastInput && $('hStep').contains(lastInput) ? lastInput : $('hStep').querySelector('input');
    if (i) { const p = i.selectionStart ?? i.value.length; i.value = i.value.slice(0, p) + '√' + i.value.slice(p); i.focus(); i.setSelectionRange?.(p + 1, p + 1); }
  }
  if (act === 'help') $('help').hidden = false;
  if (act === 'help-close') $('help').hidden = true;
  if (act === 'again') homeStart();
  if (act === 'nextlevel') { H.level++; homeStart(); }
  if (act === 'setup') homeSetup();
});
$('hStep').addEventListener('focusin', e => { if (e.target.matches('input')) lastInput = e.target; });
$('help').addEventListener('click', e => { if (e.target === $('help')) $('help').hidden = true; });
$('themeBtn').addEventListener('click', toggleTheme);
$('hHint').addEventListener('click', homeHint);
$('hNext').addEventListener('click', homeContinue);
// открылась клавиатура телефона — подтягиваем «Проверить» в видимую часть экрана
window.visualViewport?.addEventListener('resize', () => {
  if (screen === 'home' && !PREVIEW) $('hStep').querySelector('.check')?.scrollIntoView({ block: 'nearest' });
});
$('hStep').addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('input')) { e.preventDefault(); homeCheckClick(); } });
$('pNew').addEventListener('click', () => { $('pMsg').textContent = ''; printNums = newNumbers(Math.max(1, Math.min(40, +$('pCount').value || CONFIG.print.variants))); renderPrint(); });
$('pCount').addEventListener('change', () => $('pNew').click());
$('pSpace').addEventListener('change', drawSheets);
$('pTwo').addEventListener('change', drawSheets);
$('pNums').addEventListener('change', () => {
  const { nums, bad } = parseNums($('pNums').value);
  $('pMsg').innerHTML = bad.length ? `<span class="err">Не понял номера: ${esc(bad.join(', '))}. Номер — как на листе, например ${GEN_VERSION}-4817.</span>` : '';
  if (nums.length) { printNums = nums.slice(0, 40); $('pCount').value = printNums.length; drawSheets(); }
});
$('pPrint').addEventListener('click', () => printNow('sheets'));
$('pPrintKey').addEventListener('click', () => printNow('key'));
addEventListener('afterprint', () => document.body.classList.remove('print-key', 'print-sheets'));

document.addEventListener('keydown', e => {
  if (e.target.matches?.('input') && e.key !== 'Escape') return;
  if (e.key === 'Escape') {
    if (!$('help').hidden) { $('help').hidden = true; return; }
    if (screen !== 'start' && !STUDENT) show('start');
    return;
  }
  if (screen === 'home' && e.key === 'Enter' && H.wait) { e.preventDefault(); homeContinue(); return; }
  if (screen !== 'board' || liveKeydown(e)) return;
  if (['ArrowRight', 'PageDown', ' '].includes(e.key)) { e.preventDefault(); boardNext(); }
  else if (['ArrowLeft', 'PageUp'].includes(e.key)) { e.preventDefault(); boardPrev(); }
  else if (e.key === 'f' || e.key === 'F' || e.key === 'а' || e.key === 'А') toggleFull();
});

// ================= Запуск =================
(() => {
  const th = store.get('theme');
  if (th === 'dark' || th === 'light') document.documentElement.dataset.theme = th;
  B.notes = store.get('notes') === '1';
  const back = siteHref();
  if (back) { $('toSite').href = back; $('toSite').hidden = false; }
  initPrintFormats();
  if (typeof helpInit === 'function') helpInit();   // тема дорисовывает формулы в справке
  const lvl = +P.get('level');
  if (STUDENT) document.body.classList.add('student');
  if (PREVIEW) { show('board'); boardStartPreview(); }
  else if ((MODE === 'home' || STUDENT) && lvl >= 1 && lvl <= SECTIONS.length) {
    H.level = lvl - 1;
    show('home'); homeStart();
  } else show(STUDENT ? 'home' : MODE || 'start');
})();

// Для автотестов и снимка превью
window.APP = {
  SHEETS, PRINT_GENERATORS, printVariant, SLUG, META, CONFIG, GEN_VERSION, TYPES, SECTIONS, KINDS_V1, WORDS_V1,
  OGE_V1: HAS_OGE ? OGE_V1 : undefined, makeVariantOGE: HAS_OGE ? makeVariantOGE : undefined,
  Q, qeq, decStr, keyQ, parseQ, parseVal, eqRoots, generate, makeVariant, taskRnd, mulberry32, parseNums,
  STUDENT, show, get screen() { return screen; },
  board: { get steps() { return B.steps; }, get i() { return B.i; }, get phase() { return B.phase; }, get e() { return B.e; },
    next: boardNext, prev: boardPrev, go: boardGo, numbers: random => { boardNumbers(random); renderBoard(); }, poster: boardPoster,
    restart: boardRestart,
    // живая доска: модель, ручки и панель текущего шага; drag(id, {x, y}) и key(id, dx, dy) — как учитель рукой и стрелками
    get model() { return B.m; }, get snap() { return LV.snap; }, get animating() { return !!LV.anim; },
    get handles() { return LV.handles.map(h => ({ id: h.id, label: h.label, at: { ...h.at } })); },
    get controls() { return LV.controls.map(c => ({ id: c.id, type: c.type, label: c.label, min: c.min, max: c.max, options: c.options })); },
    drag: liveDrag, key: liveKey, set: liveSet, reset: liveReset, again: liveAgain },
  GEO, HAS_LIVE: typeof LIVE !== 'undefined',
  print: { draw: drawSheets, set nums(v) { printNums = v; } },
  home: { state: H, start: homeStart, check: homeCheck, hint: homeHint, next: homeContinue, collect: homeCollect,
    setCount: n => { H.eqCount = n; homeRender(); } },
};
