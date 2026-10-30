// ================= Раздатка: вариант восстанавливается по номеру =================
// Тема задаёт состав варианта (KINDS_V1), слова (WORDS_V1) и тексты листа (PRINT).
// Бланк ОГЭ есть, если тема задала OGE_V1 и ogeTask(kind, rnd).
const ABC = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ';
const HAS_OGE = typeof OGE_V1 !== 'undefined';
const lowerTitle = () => META.title[0].toLowerCase() + META.title.slice(1);
function wordVariantV1(num) {
  const version = 1;
  if (version !== 1) throw new Error('Неизвестная версия генератора: ' + version);
  const tasks = [];
  KINDS_V1.forEach(([type, forms], i) => {
    const rnd = taskRnd(num, i, 1);
    let t, guard = 0;
    do t = generate(type, rnd, Array.isArray(forms) ? pick(rnd, forms) : forms);
    while (tasks.some(u => TYPES[u.type].key(u) === TYPES[type].key(t)) && ++guard < 200);
    tasks.push(t);
  });
  const rnd = taskRnd(num, 99, 1);
  const word = pick(rnd, WORDS_V1);
  const answers = tasks.map(t => TYPES[t.type].key(t));
  const bank = new Map();   // ответ → { html, letter }
  tasks.forEach((t, i) => bank.set(answers[i], { key: answers[i], html: TYPES[t.type].keyHTML(t), letter: word[i] }));
  const decoys = shuffle(rnd, [...ABC].filter(ch => !word.includes(ch)));
  tasks.forEach(t => (TYPES[t.type].traps?.(t) || []).slice(0, CONFIG.print.traps).forEach(x => {
    if (!bank.has(x.key)) bank.set(x.key, { ...x, letter: decoys.shift() });
  }));
  return { num, version, label: version + '-' + num, tasks, answers, word, bank: shuffle(rnd, [...bank.values()]) };
}

// Бланк ОГЭ: задания свои (зерна 200+), поэтому один номер даёт разные листы для слова и для бланка
function ogeVariantV1(num) {
  const version = 1;
  if (version !== 1) throw new Error('Неизвестная версия генератора: ' + version);
  const tasks = OGE_V1.map((kind, i) => ogeTask(kind, taskRnd(num, 200 + i, 1)));
  return { num, version, label: version + '-' + num, oge: true, tasks, answers: tasks.map(x => x.ans) };
}

// ================= 🖨 Раздатка =================
let printNums = [];
// вид листа из адреса (?mode=print&kind=oge) или с кнопки стартового экрана — важнее сохранённого
let pendingKind = P.get('kind');
function newNumbers(count) {
  const set = new Set();
  while (set.size < count) set.add(1000 + Math.floor(Math.random() * 9000));
  return [...set];
}
function parseNums(text) {
  const nums = [], bad = [];
  for (const part of text.split(/[\s,;]+/).filter(Boolean)) {
    const m = part.match(/^(?:(\d+)[-–])?(\d{4})$/);
    const version = m ? +(m[1] || GEN_VERSION) : 0;
    const value = version === GEN_VERSION ? +m?.[2] : version + '-' + m?.[2];
    if (!m || !PRINT_GENERATORS[version]) bad.push(part);
    else if (!nums.includes(value)) nums.push(value);
  }
  return { nums, bad };
}
// как задание записано на листе: TYPES[type].sheet, по умолчанию «запись =»
const sheetTask = t => TYPES[t.type].sheet ? TYPES[t.type].sheet(t) : `${TYPES[t.type].text(t)} =`;
function sheetHTML(v) {
  const bank = v.bank.map(x => `<div class="bk"><div>${x.html}</div><div>${x.letter}</div></div>`).join('');
  const cols = v.tasks.map((_, i) => `<th>${i + 1}</th>`).join('');
  const empty = v.tasks.map(() => '<td></td>').join('');
  return `<div class="sheet">
    <div class="shead"><span>Фамилия, имя</span><span>Класс</span><span>Дата</span><span class="vn">Вариант ${v.label}</span></div>
    <h2>${META.title}</h2>
    <p class="instr">${PRINT.instr}</p>
    <ol class="tasks">${v.tasks.map((t, i) => `<li class="task"><span class="no">${i + 1})</span>${sheetTask(t)}<div class="cells"></div></li>`).join('')}</ol>
    <p class="sub-h">Таблица букв</p><div class="bank">${bank}</div>
    <table class="ans"><tr><th>Задание</th>${cols}</tr><tr class="tall"><th>Ответ</th>${empty}</tr><tr><th>Буква</th>${empty}</tr></table>
    <div class="word">Слово: ______________________</div>
  </div>`;
}
// бланк: строка «номер задания — клеточки», по символу в клеточку, как в бланке ответов ОГЭ
const OGE_CELLS = 10;
const cellsRow = (no, text = '') => `<div class="brow"><b>${no}</b>${[...text.padEnd(OGE_CELLS)].map(ch => `<i>${ch.trim()}</i>`).join('')}</div>`;
function ogeSheetHTML(v) {
  return `<div class="sheet oge">
    <div class="shead"><span>Фамилия, имя</span><span>Класс</span><span>Дата</span><span class="vn">Вариант ${v.label}</span></div>
    <h2>${META.title} · бланк ответов</h2>
    <p class="instr">Ответом к каждому заданию является число. Запиши его в бланк ответов справа от номера задания,
    начиная с первой клеточки. Каждый символ — в отдельной клеточке, минус и запятая тоже.</p>
    <ol class="tasks">${v.tasks.map((x, i) => `<li class="task"><span class="no">${i + 1}.</span>${x.ask}<div class="cells"></div><div class="otv">Ответ: ______________</div></li>`).join('')}</ol>
    <div class="bhead"><p class="sub-h">Бланк ответов</p><div class="sample">Образец: ${cellsRow('', '−0,5')}</div></div>
    <div class="blank">${v.tasks.map((_, i) => cellsRow(i + 1)).join('')}</div>
  </div>`;
}
function ogeKeyHTML(vs) {
  const head = vs[0].tasks.map((_, i) => `<th>${i + 1}</th>`).join('');
  return `<div class="page key"><h2>Ключ учителя · бланк ответов · ${lowerTitle()}</h2>
    <table class="key"><thead><tr><th>Вариант</th>${head}</tr></thead>
    ${vs.map(v => `<tr><td>${v.label}</td>${v.answers.map(a => `<td>${a}</td>`).join('')}</tr>`).join('')}
    </table><p style="font-size:10pt">Ответ верен, если совпадает с ключом (запятая или точка — одинаково). Ключ всегда можно восстановить
    по номеру варианта: режим «Раздатка», вид листа «Бланк ответов».</p></div>`;
}
// Диагностика ловушек: какую ошибку означает буква-ловушка. Тема ничего не пишет: категорию даёт T.wrong
// по значению ловушки (или trap.cat, если тема его задала). Варианты не меняются — меняется только ключ.
function trapCat(t, trap) {
  if (trap.cat) return trap.cat;
  const T = TYPES[t.type];
  // число — разбираем ловушку как ответ; выбор и кнопки (T.opts) — ключ ловушки и есть ответ;
  // остальные виды ввода (многочлен, одночлен) — только trap.cat от темы
  const num = ['num', 'frac'].includes(T.input), pickLike = T.input === 'choice' || typeof T.opts === 'function';
  if (!num && !pickLike) return null;
  try {
    const x = num ? parseQ(trap.key) : trap.key;
    if (!x) return null;
    const r = T.wrong(t, x);
    return r && r.cat !== 'calc' ? r.cat : null;   // «вычисления» — не типичная ошибка, в расшифровку не идёт
  } catch { return null; }
}
const catName = c => (CATS[c] || [c])[0];
// для каждого задания варианта: [{ letter, cat }] — буквы ловушек из таблицы букв этого варианта
function trapLetters(v) {
  const letter = new Map(v.bank.map(b => [b.key, b.letter]));
  return v.tasks.map((t, i) => (TYPES[t.type].traps?.(t) || []).slice(0, CONFIG.print.traps)
    .filter(x => x.key !== v.answers[i] && letter.has(x.key))
    .map(x => ({ letter: letter.get(x.key), cat: trapCat(t, x) })).filter(x => x.cat));
}
function keyHTML(vs) {
  const head = vs[0].tasks.map((_, i) => `<th>${i + 1}</th>`).join('');
  const traps = vs.map(trapLetters), cats = [...new Set(traps.flat(2).map(x => x.cat))], no = c => cats.indexOf(c) + 1;
  const cell = (t, x) => TYPES[t.type].keyHTML(t) + (x.length ? `<span class="trp">${x.map(y => `${y.letter}<sup>${no(y.cat)}</sup>`).join(' ')}</span>` : '');
  return `<div class="page key"><h2>Ключ учителя · ${lowerTitle()}</h2>
    <table class="key"><thead><tr><th>Вариант</th>${head}<th>Слово</th></tr></thead>
    ${vs.map((v, k) => `<tr><td>${v.label}</td>${v.tasks.map((t, i) => `<td>${cell(t, traps[k][i])}</td>`).join('')}<td><b>${v.word}</b></td></tr>`).join('')}
    </table><p style="font-size:10pt">Слово сложилось — все ответы верны. Ключ всегда можно восстановить по номеру варианта в режиме «Раздатка».</p>
    ${cats.length ? `<div class="diag"><b>Буквы-ловушки.</b> Под ответом — буквы, которые получаются при типичной ошибке, с номером ошибки:
      <ol>${cats.map(c => `<li>${catName(c)}</li>`).join('')}</ol></div>` : ''}</div>`;
}
// Номера и настройки запоминаются в браузере: напечатал листы, закрыл вкладку — ключ потом
// печатается по тем же номерам. Без localStorage номера просто будут новыми.
function renderPrint() {
  if (!printNums.length) {
    const saved = parseNums(store.get('printNums') || '').nums;
    printNums = saved.length ? saved : newNumbers(CONFIG.print.variants);
    $('pCount').value = printNums.length;
    $('pSpace').checked = store.get('printSpace') ? store.get('printSpace') === '1' : CONFIG.print.space;
    $('pTwo').checked = store.get('printTwo') === '1';
    $('pKind').value = SHEETS[store.get('printKind')] ? store.get('printKind') : 'word';
    if (saved.length) $('pMsg').textContent = 'Открыты номера, с которыми вы работали в прошлый раз. Для другого класса нажмите «Новые номера».';
  }
  if (pendingKind) { $('pKind').value = SHEETS[pendingKind] ? pendingKind : 'word'; pendingKind = null; }
  $('pNums').value = printNums.map(n => typeof n === 'string' ? n : GEN_VERSION + '-' + n).join(', ');
  drawSheets();
}
function drawSheets() {
  const kind = SHEETS[$('pKind').value] ? $('pKind').value : 'word';
  const format = SHEETS[kind];
  document.querySelectorAll('[data-kind-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kindSet === $('pKind').value)));
  const vs = printNums.map(n => printVariant(n, kind));
  const sheet = v => format.sheet(v, $('pSpace').checked), key = format.key;
  const space = $('pSpace').checked, two = $('pTwo').checked && !space && format.two !== false;
  store.set('printNums', printNums.map(n => typeof n === 'string' ? n : GEN_VERSION + '-' + n).join(','));
  store.set('printSpace', space ? 1 : 0);
  store.set('printTwo', $('pTwo').checked ? 1 : 0);
  store.set('printKind', kind);
  $('pTwo').disabled = space || format.two === false;
  $('pAbout').textContent = format.about;
  $('pExtraKey').hidden = !format.previewKey;
  if (!format.previewKey) { $('print').dataset.extraKey = 'false'; $('pExtraKey').textContent = 'Показать ключ'; $('pExtraKey').setAttribute('aria-expanded', 'false'); }
  let html = '';
  if (two) for (let i = 0; i < vs.length; i += 2)
    html += `<div class="page half compact ${format.pageClass || ''}">${sheet(vs[i])}${vs[i + 1] ? sheet(vs[i + 1]) : ''}</div>`;
  else if (format.perPage) for (let i = 0; i < vs.length; i += format.perPage)
    html += `<div class="page ${format.pageClass || ''}">${vs.slice(i, i + format.perPage).map(v => sheet(v)).join('')}</div>`;
  // flow — лист может занять больше страницы (сетка для решения, длинные задания): при печати он переносится,
  // а не обрезается по высоте A4; задание не разрывается (.task — break-inside: avoid)
  else html = vs.map(v => `<div class="page ${format.pageClass || ''}${space ? '' : ' compact'}${space || format.flow ? ' flow' : ''}">${sheet(v)}</div>`).join('');
  $('pSheets').innerHTML = (vs.length ? key(vs) : '') + html;
  fitKeys();
  return vs;
}
// Ключ с длинными ответами (многочлены, 9 заданий) шире книжного листа: печатаем его на альбомном A4;
// не хватило и его — уменьшаем шрифт до 8pt, затем разрешаем перенос внутри ячеек.
// Размеры в мм, поэтому подгонка на экране верна и для печати.
function fitKeys() {
  for (const t of document.querySelectorAll('#pSheets .page.key table')) {
    const page = t.closest('.page');
    const avail = () => { const cs = getComputedStyle(page); return page.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight); };
    if (!(avail() > 0)) continue;                        // лист не на экране (или jsdom без вёрстки)
    page.classList.remove('land'); t.classList.remove('wrap'); t.style.fontSize = '';
    if (t.offsetWidth > avail() + 1) page.classList.add('land');
    for (let pt = 10; t.offsetWidth > avail() + 1 && pt >= 8; pt -= .5) t.style.fontSize = pt + 'pt';
    if (t.offsetWidth > avail() + 1) t.classList.add('wrap');
  }
}
// шрифт подгрузился позже первой отрисовки — ширина ответов изменилась
document.fonts?.ready?.then(fitKeys);
addEventListener('beforeprint', fitKeys);
function printNow(what) {
  document.body.classList.remove('print-key', 'print-sheets');
  document.body.classList.add(what === 'key' ? 'print-key' : 'print-sheets');
  try { window.print(); } catch {}
}

// Тема регистрирует форматы и старые генераторы без подмены функций ядра.
const SHEETS = {
  word: { label: 'Кодовое слово', about: PRINT.about, generate: wordVariantV1, sheet: sheetHTML, key: keyHTML },
  ...(HAS_OGE ? { oge: { label: 'Бланк ОГЭ', about: PRINT.ogeAbout, generate: ogeVariantV1, sheet: ogeSheetHTML, key: ogeKeyHTML } } : {}),
  // форматы ядра (core/formats.js); если у темы есть свой лист с тем же названием (билет на выход), остаётся её лист
  ...Object.fromEntries(Object.entries(CORE_SHEETS).filter(([, f]) => typeof TOPIC_SHEETS === 'undefined' || !Object.values(TOPIC_SHEETS).some(x => x.label === f.label))),
  ...(typeof TOPIC_SHEETS === 'undefined' ? {} : TOPIC_SHEETS),
};
const PRINT_GENERATORS = { 1: Object.fromEntries(Object.entries(SHEETS).map(([k, f]) => [k, f.generate])),
  ...(typeof TOPIC_PRINT_VERSIONS === 'undefined' ? {} : TOPIC_PRINT_VERSIONS) };
// форматы ядра зависят только от версии, а не от темы: дополняем ими и версии, которые тема описала сама
for (const gens of Object.values(PRINT_GENERATORS)) for (const [k, f] of Object.entries(CORE_SHEETS)) gens[k] = gens[k] || f.generate;
function printVariant(num, kind = 'word', version = GEN_VERSION) {
  if (typeof num === 'string' && num.includes('-')) { const parts = num.split('-'); version = +parts[0]; num = +parts[1]; }
  const gen = PRINT_GENERATORS[version]?.[kind];
  if (!gen) throw new Error('Нет генератора формата ' + kind + ' версии ' + version);
  return gen(num, version);
}
function makeVariant(num, version = GEN_VERSION) { return printVariant(num, 'word', version); }
function makeVariantOGE(num, version = GEN_VERSION) { return printVariant(num, 'oge', version); }
function initPrintFormats() {
  const choices = Object.entries(SHEETS);
  const input = $('pKind');
  const old = input.closest('.row');
  if (old) { old.before(input); old.remove(); }
  input.insertAdjacentHTML('beforebegin', '<div class="row"><b>Вид листа:</b><div class="seg" role="group" aria-label="Вид листа">' + choices.map(([k, f]) => '<button type="button" data-kind-set="' + k + '" aria-pressed="' + (k === 'word') + '">' + esc(f.label) + '</button>').join('') + '</div></div>');
  const start = document.querySelector('#start [data-go="print"]')?.closest('.mode');
  if (start) {
    const box = document.createElement('div'); box.className = 'mode split';
    box.innerHTML = '<b>🖨 Раздатка</b><span>' + esc(META.modePrint) + '</span><div class="kinds">' + choices.map(([k, f]) => '<button type="button" data-go="print" data-kind="' + k + '">' + esc(f.label) + '</button>').join('') + '</div>';
    start.replaceWith(box);
  }
  $('pPrintKey').insertAdjacentHTML('afterend', '<button type="button" id="pExtraKey" aria-expanded="false" hidden>Показать ключ</button>');
  $('pExtraKey').addEventListener('click', () => {
    const visible = $('print').dataset.extraKey !== 'true';
    $('print').dataset.extraKey = String(visible);
    $('pExtraKey').textContent = visible ? 'Скрыть ключ' : 'Показать ключ';
    $('pExtraKey').setAttribute('aria-expanded', String(visible));
  });
}
