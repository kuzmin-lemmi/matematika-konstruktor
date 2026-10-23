// ================= Раздатка: вариант восстанавливается по номеру =================
// Тема задаёт состав варианта (KINDS_V1), слова (WORDS_V1) и тексты листа (PRINT).
// Бланк ОГЭ есть, если тема задала OGE_V1 и ogeTask(kind, rnd).
const ABC = 'АБВГДЕЖЗИКЛМНОПРСТУФХЦЧШЭЮЯ';
const HAS_OGE = typeof OGE_V1 !== 'undefined';
const lowerTitle = () => META.title[0].toLowerCase() + META.title.slice(1);
function makeVariant(num, version = GEN_VERSION) {
  if (version !== 1) throw new Error('Неизвестная версия генератора: ' + version);
  const tasks = [];
  KINDS_V1.forEach(([type, forms], i) => {
    const rnd = taskRnd(num, i);
    let t, guard = 0;
    do t = generate(type, rnd, Array.isArray(forms) ? pick(rnd, forms) : forms);
    while (tasks.some(u => TYPES[u.type].key(u) === TYPES[type].key(t)) && ++guard < 200);
    tasks.push(t);
  });
  const rnd = taskRnd(num, 99);
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
function makeVariantOGE(num, version = GEN_VERSION) {
  if (version !== 1) throw new Error('Неизвестная версия генератора: ' + version);
  const tasks = OGE_V1.map((kind, i) => ogeTask(kind, taskRnd(num, 200 + i)));
  return { num, version, label: version + '-' + num, oge: true, tasks, answers: tasks.map(x => x.ans) };
}

// ================= 🖨 Раздатка =================
let printNums = [];
// вид листа из адреса (?mode=print&kind=oge) или с кнопки стартового экрана — важнее сохранённого
let pendingKind = (HAS_OGE ? ['word', 'oge'] : ['word']).includes(P.get('kind')) ? P.get('kind') : null;
function newNumbers(count) {
  const set = new Set();
  while (set.size < count) set.add(1000 + Math.floor(Math.random() * 9000));
  return [...set];
}
function parseNums(text) {
  const nums = [], bad = [];
  for (const part of text.split(/[\s,;]+/).filter(Boolean)) {
    const m = part.match(/^(?:(\d+)[-–])?(\d{4})$/);
    if (!m || (m[1] && +m[1] !== GEN_VERSION)) bad.push(part);
    else if (!nums.includes(+m[2])) nums.push(+m[2]);
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
    <table class="key"><tr><th>Вариант</th>${head}</tr>
    ${vs.map(v => `<tr><td>${v.label}</td>${v.answers.map(a => `<td>${a}</td>`).join('')}</tr>`).join('')}
    </table><p style="font-size:10pt">Ответ верен, если совпадает с ключом (запятая или точка — одинаково). Ключ всегда можно восстановить
    по номеру варианта: режим «Раздатка», вид листа «Бланк ответов».</p></div>`;
}
function keyHTML(vs) {
  const head = vs[0].tasks.map((_, i) => `<th>${i + 1}</th>`).join('');
  return `<div class="page key"><h2>Ключ учителя · ${lowerTitle()}</h2>
    <table class="key"><tr><th>Вариант</th>${head}<th>Слово</th></tr>
    ${vs.map(v => `<tr><td>${v.label}</td>${v.tasks.map(t => `<td>${TYPES[t.type].keyHTML(t)}</td>`).join('')}<td><b>${v.word}</b></td></tr>`).join('')}
    </table><p style="font-size:10pt">Слово сложилось — все ответы верны. Ключ всегда можно восстановить по номеру варианта в режиме «Раздатка».</p></div>`;
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
    $('pKind').value = HAS_OGE && store.get('printKind') === 'oge' ? 'oge' : 'word';
    if (saved.length) $('pMsg').textContent = 'Открыты номера, с которыми вы работали в прошлый раз. Для другого класса нажмите «Новые номера».';
  }
  if (pendingKind) { $('pKind').value = pendingKind; pendingKind = null; }
  $('pNums').value = printNums.map(n => GEN_VERSION + '-' + n).join(', ');
  drawSheets();
}
function drawSheets() {
  const oge = HAS_OGE && $('pKind').value === 'oge';
  document.querySelectorAll('[data-kind-set]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.kindSet === $('pKind').value)));
  const vs = printNums.map(n => oge ? makeVariantOGE(n) : makeVariant(n));
  const sheet = oge ? ogeSheetHTML : sheetHTML, key = oge ? ogeKeyHTML : keyHTML;
  const space = $('pSpace').checked, two = $('pTwo').checked && !space;
  store.set('printNums', printNums.join(','));
  store.set('printSpace', space ? 1 : 0);
  store.set('printTwo', $('pTwo').checked ? 1 : 0);
  store.set('printKind', oge ? 'oge' : 'word');
  $('pTwo').disabled = space;
  $('pAbout').textContent = oge ? PRINT.ogeAbout : PRINT.about;
  let html = '';
  if (two) for (let i = 0; i < vs.length; i += 2)
    html += `<div class="page half compact">${sheet(vs[i])}${vs[i + 1] ? sheet(vs[i + 1]) : ''}</div>`;
  else html = vs.map(v => `<div class="page${space ? '' : ' compact'}">${sheet(v)}</div>`).join('');
  $('pSheets').innerHTML = (vs.length ? key(vs) : '') + html;
  return vs;
}
function printNow(what) {
  document.body.classList.remove('print-key', 'print-sheets');
  document.body.classList.add(what === 'key' ? 'print-key' : 'print-sheets');
  try { window.print(); } catch {}
}
