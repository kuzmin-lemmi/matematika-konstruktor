// ================= Печатные форматы ядра: билет на выход, самостоятельная, домино, «найди ошибку» =================
// Тема ничего не пишет: форматы собираются из KINDS_V1 и TYPES. Тема может уточнить состав
// (EXIT_V1, TEST_V1, DOMINO_V1) и подсказать типам (T.mistake — для «найди ошибку»).
// Зерна форматов — в своих диапазонах taskRnd(num, …): билет 300+, самостоятельная 400+, домино 500+,
// «найди ошибку» 700+; раздатка (0…99) и бланк ОГЭ (200+) не затронуты, их варианты не меняются.
// Состав и разметка каждого формата — версия 1; изменил — заведи новую версию, пока на листы есть печать.

const fmtKey = t => TYPES[t.type].key(t);
// части состава: [тип], [тип, форма] или [тип, [формы]] — как в KINDS_V1
function fmtTasks(parts, num, seedBase, version, distinct = true) {
  const tasks = [];
  parts.forEach(([type, forms], i) => {
    const rnd = taskRnd(num, seedBase + i, version);
    let t, guard = 0;
    do t = generate(type, rnd, Array.isArray(forms) ? pick(rnd, forms) : forms);
    while (distinct && tasks.some(u => fmtKey(u) === fmtKey(t)) && ++guard < 200);
    tasks.push(t);
  });
  return tasks;
}
const fmtHead = (v, what = 'Вариант') => `<div class="shead"><span>Фамилия, имя</span><span>Класс</span><span>Дата</span><span class="vn">${what} ${v.label}</span></div>`;
function fmtKeyPage(title, vs, foot, cell = (t, v, i) => TYPES[t.type].keyHTML(t), extra = '') {
  const head = vs[0].tasks.map((_, i) => `<th>${i + 1}</th>`).join('');
  return `<div class="page key"><h2>${title} · ${lowerTitle()}</h2>
    <table class="key"><thead><tr><th>Вариант</th>${head}</tr></thead>
    ${vs.map(v => `<tr><td>${v.label}</td>${v.tasks.map((t, i) => `<td>${cell(t, v, i)}</td>`).join('')}</tr>`).join('')}
    </table><p style="font-size:10pt">${foot}</p>${extra}</div>`;
}
const fmtAbc = (n, a = 1) => Array.from({ length: n }, (_, i) => i + a);

// ---------- Билет на выход ----------
const EXIT_PARTS = () => typeof EXIT_V1 !== 'undefined' ? EXIT_V1 : KINDS_V1.slice(0, 3);
const EXIT_SHEET = {
  label: 'Билет на выход', two: false, perPage: 4, pageClass: 'exit-tickets',
  about: 'Билет на выход: 2–3 задания на четверть листа, четыре билета на A4 — разрежьте. Раздаётся за 5 минут до звонка: за минуту видно, кто понял тему. Решают в тетради или на обороте.',
  generate(num, version = GEN_VERSION) {
    const tasks = fmtTasks(EXIT_PARTS(), num, 300, version);
    return { num, version, label: version + '-' + num, tasks, answers: tasks.map(fmtKey) };
  },
  sheet: v => `<div class="exit-ticket">
    <div class="shead"><span>Фамилия, имя</span><span class="vn">Билет ${v.label}</span></div>
    <p class="tt">${META.title}</p>
    <ol class="tasks">${v.tasks.map((t, i) => `<li class="task"><span class="no">${i + 1})</span>${sheetTask(t)}<div class="otv">Ответ: ______________</div></li>`).join('')}</ol>
  </div>`,
  key: vs => fmtKeyPage('Ключ учителя · билеты на выход', vs, 'Билет верен, если все ответы совпали с ключом. Номер билета — на листе: ключ можно восстановить по номеру в режиме «Раздатка».'),
};

// ---------- Самостоятельная работа ----------
// TEST_V1 = { parts: [[тип, форма?], …], points: [баллы за задание], grades: { 5: от скольки баллов, 4: …, 3: … } }
const testPlan = () => {
  const plan = typeof TEST_V1 !== 'undefined' ? TEST_V1 : { parts: KINDS_V1, points: KINDS_V1.map(() => 1) };
  const total = plan.points.reduce((s, p) => s + p, 0);
  const grades = plan.grades || { 5: Math.ceil(total * .85), 4: Math.ceil(total * .65), 3: Math.ceil(total * .45) };
  return { parts: plan.parts, points: plan.points, grades, total };
};
const TEST_SHEET = {
  label: 'Самостоятельная', pageClass: 'test-work', flow: true,
  about: 'Самостоятельная работа: задания по порядку, место для решения, баллы за каждое. Шкала оценок — внизу ключа. Соседние номера дают разные варианты: соседям по парте раздавайте разные.',
  generate(num, version = GEN_VERSION) {
    const plan = testPlan(), tasks = fmtTasks(plan.parts, num, 400, version, false);
    return { num, version, label: version + '-' + num, tasks, answers: tasks.map(fmtKey), points: plan.points };
  },
  sheet: (v, space) => `<div class="sheet">
    ${fmtHead(v)}
    <h2>${META.title} · самостоятельная работа</h2>
    ${PRINT.testInstr ? `<p class="instr">${PRINT.testInstr}</p>` : ''}
    <ol class="tasks one">${v.tasks.map((t, i) => `<li class="task"><span class="no">${i + 1})</span>${sheetTask(t)} <span class="pts">(${v.points[i]} ${plural(v.points[i], 'балл', 'балла', 'баллов')})</span>${space ? '<div class="cells"></div>' : '<div class="otv">Ответ: ______________</div>'}</li>`).join('')}</ol>
    ${CONFIG.print.answerTable ? `<table class="ans"><tr><th>Задание</th>${v.tasks.map((_, i) => `<th>${i + 1}</th>`).join('')}</tr><tr class="tall"><th>Ответ</th>${v.tasks.map(() => '<td></td>').join('')}</tr></table>` : ''}
  </div>`,
  key: vs => {
    const plan = testPlan(), g = plan.grades;
    return fmtKeyPage('Ключ учителя · самостоятельная', vs,
      `Баллы за задания: ${plan.points.join(', ')}. Всего ${plan.total}. Оценка «5» — от ${g[5]} баллов, «4» — от ${g[4]}, «3» — от ${g[3]}.`);
  },
};

// ---------- Домино ----------
// 12 костяшек «ответ | задание»: справа от задания — костяшка с его ответом, цепочка замыкается в кольцо.
const DOMINO_N = 12;
const DOMINO_SHEET = {
  label: 'Домино', two: false, pageClass: 'domino', flow: true,
  about: 'Домино для групповой работы: вырежьте 12 костяшек. Ответ задания стоит на соседней костяшке; правильная цепочка замыкается в кольцо. Ключ — собранная цепочка.',
  generate(num, version = GEN_VERSION) {
    const src = typeof DOMINO_V1 !== 'undefined' ? DOMINO_V1 : KINDS_V1;
    const parts = Array.from({ length: DOMINO_N }, (_, i) => src[i % src.length]);
    const tasks = fmtTasks(parts, num, 500, version);
    const tiles = tasks.map((t, i) => ({ left: TYPES[tasks[(i + DOMINO_N - 1) % DOMINO_N].type].keyHTML(tasks[(i + DOMINO_N - 1) % DOMINO_N]), right: sheetTask(t) }));   // формулировка как на листе: у геометрии — с чертежом
    const order = shuffle(taskRnd(num, 599, version), fmtAbc(DOMINO_N, 0));
    return { num, version, label: version + '-' + num, tasks, answers: tasks.map(fmtKey), tiles, order };
  },
  sheet: v => `<div class="sheet dom">
    ${fmtHead(v, 'Набор')}
    <h2>${META.title} · домино</h2>
    <p class="instr">Вырежи костяшки. Справа от задания положи костяшку с его ответом слева. Верная цепочка замкнётся в кольцо.</p>
    <div class="tiles">${v.order.map(i => `<div class="tile"><div class="l">${v.tiles[i].left}</div><div class="r">${v.tiles[i].right}</div></div>`).join('')}</div>
  </div>`,
  key: vs => `<div class="page key"><h2>Ключ учителя · домино · ${lowerTitle()}</h2>
    ${vs.map(v => `<p class="sub-h">Набор ${v.label}: цепочка по кругу</p><div class="chain">${v.tiles.map(x => `<span class="tile mini"><span class="l">${x.left}</span><span class="r">${x.right}</span></span>`).join('')}</div>`).join('')}
    </div>`,
};

// ---------- «Найди ошибку» ----------
// Тип задания даёт T.mistake(t, rnd) → { lines: [строки решения], at: номер неверной строки (с 0), fix: верная строка, why: в чём ошибка }.
const mistakeTypes = () => Object.keys(TYPES).filter(k => typeof TYPES[k].mistake === 'function');
function errorCases(n, num, seedBase, version, distinct = true) {
  const types = mistakeTypes(), out = [];
  for (let i = 0; i < n; i++) {
    const rnd = taskRnd(num, seedBase + i, version), type = types[i % types.length];
    let t, m, guard = 0;
    do { t = generate(type, rnd); m = TYPES[type].mistake(t, rnd); }
    while (distinct && out.some(c => c.m.lines.join() === m.lines.join()) && ++guard < 100);
    out.push({ t, m });
  }
  return out;
}
const ERRORS_SHEET = {
  label: 'Найди ошибку', two: false, pageClass: 'errors', flow: true,
  about: 'Четыре готовых решения, в каждом одна ошибка. Ученик находит строку, объясняет ошибку и записывает верную строку. Ключ — номер строки и верная запись.',
  generate(num, version = GEN_VERSION) {
    const cases = errorCases(4, num, 700, version);
    return { num, version, label: version + '-' + num, tasks: cases.map(c => c.t), cases: cases.map(c => c.m), answers: cases.map(c => String(c.m.at + 1)) };
  },
  sheet: v => `<div class="sheet">
    ${fmtHead(v)}
    <h2>${META.title} · найди ошибку</h2>
    <p class="instr">В каждом решении одна ошибка. Найди строку с ошибкой, объясни её и запиши верную строку.</p>
    <ol class="cases">${v.tasks.map((t, i) => `<li class="case"><div class="ask">${TYPES[t.type].ask ? TYPES[t.type].ask(t) : TYPES[t.type].text(t)}</div>
      <ol class="elines">${v.cases[i].lines.map(l => `<li>${l}</li>`).join('')}</ol>
      <div class="otv">Ошибка в строке № ____ . Верно: ______________________________</div></li>`).join('')}</ol>
  </div>`,
  key: vs => `<div class="page key"><h2>Ключ учителя · найди ошибку · ${lowerTitle()}</h2>
    <table class="key"><thead><tr><th>Вариант</th><th>1</th><th>2</th><th>3</th><th>4</th></tr></thead>
    ${vs.map(v => `<tr><td>${v.label}</td>${v.cases.map(m => `<td>строка ${m.at + 1}: ${m.fix}</td>`).join('')}</tr>`).join('')}
    </table></div>`,
};

// ---------- Тест с выбором ответа и трафарет ----------
// Варианты ответа — верный и ловушки на типичных ошибках (T.traps); не хватило — ответы и ловушки
// других заданий того же варианта. У задания с выбором (input: 'choice') — его собственные варианты.
const ABCD = 'АБВГ';
const isNumType = t => ['num', 'frac'].includes(TYPES[t.type].input);
function choiceOptions(t, others, rnd) {
  const T = TYPES[t.type];
  if (T.input === 'choice' && T.options) return shuffle(rnd, T.options.map(([val, lab]) => ({ html: lab, ok: val === T.ans(t) })));
  const right = fmtKey(t), seen = new Set([right]), opts = [{ html: T.keyHTML(t), ok: true }];
  const add = x => { if (opts.length < 4 && x && !seen.has(x.key)) { seen.add(x.key); opts.push({ html: x.html, ok: false }); } };
  (T.traps?.(t) || []).forEach(add);
  // запас: ответы и ловушки других заданий — только числа к числу, чтобы вариант не выдавал себя видом
  for (const u of others) if (isNumType(u) === isNumType(t)) { add({ key: fmtKey(u), html: TYPES[u.type].keyHTML(u) }); (TYPES[u.type].traps?.(u) || []).forEach(add); }
  return shuffle(rnd, opts);
}
const CHOICE_SHEET = {
  label: 'Тест с выбором', two: false, pageClass: 'choice-test', flow: true,
  about: 'Тест: у каждого задания четыре ответа, неверные — ответы при типичных ошибках. Ученик отмечает букву в бланке внизу листа. Ключ — строка букв и трафарет: положите его рядом с бланком или наложите на просвет.',
  generate(num, version = GEN_VERSION) {
    const parts = typeof CHOICE_V1 !== 'undefined' ? CHOICE_V1 : KINDS_V1;
    const tasks = fmtTasks(parts, num, 800, version), rnd = taskRnd(num, 899, version);
    const options = tasks.map(t => choiceOptions(t, tasks.filter(u => u !== t), rnd));
    return { num, version, label: version + '-' + num, tasks, options, answers: options.map(o => ABCD[o.findIndex(x => x.ok)]) };
  },
  sheet: (v, space) => `<div class="sheet">
    ${fmtHead(v)}
    <h2>${META.title} · тест</h2>
    <p class="instr">Реши задание и выбери ответ. Букву отметь крестиком в бланке внизу листа: в каждой строке — один крестик.</p>
    <ol class="tasks">${v.tasks.map((t, i) => `<li class="task"><span class="no">${i + 1})</span>${sheetTask(t)}
      <div class="opts">${v.options[i].map((o, k) => `<span><b>${ABCD[k]})</b> ${o.html}</span>`).join('')}</div>${space ? '<div class="cells"></div>' : ''}</li>`).join('')}</ol>
    ${choiceGrid(v)}
  </div>`,
  key: vs => fmtKeyPage('Ключ учителя · тест с выбором', vs, 'Наложите трафарет на бланк: крестики ученика должны попасть в чёрные клетки.', (t, v, i) => v.answers[i],
    `<p class="sub-h">Трафареты бланков</p><div class="stencils">${vs.map(v => choiceGrid(v, true)).join('')}</div>`),
};
// бланк ответов: строки — задания, столбцы — буквы; key — трафарет с закрашенными верными клетками
function choiceGrid(v, key = false) {
  return `<table class="bubbles${key ? ' stencil' : ''}"><tr><th>${key ? v.label : 'Бланк'}</th>${[...ABCD].map(c => `<th>${c}</th>`).join('')}</tr>
    ${v.tasks.map((_, i) => `<tr><th>${i + 1}</th>${[...ABCD].map((c, k) => k < v.options[i].length ? `<td${key && v.answers[i] === c ? ' class="on"' : ''}></td>` : '<td class="off"></td>').join('')}</tr>`).join('')}</table>`;
}

// ---------- Взаимопроверка в парах ----------
// Один номер — пара листов А и Б на одной странице. Внизу листа А — ответы к листу Б и наоборот:
// каждый решает свой лист, затем проверяет лист соседа по ответам внизу своего — без учителя.
const PAIR_PARTS = () => typeof PAIR_V1 !== 'undefined' ? PAIR_V1 : KINDS_V1.slice(0, 6);
const pairHalf = (v, me, other) => `<div class="sheet">
    <div class="shead"><span>Фамилия, имя</span><span>Класс</span><span>Дата</span><span class="vn">Лист ${me} · ${v.label}</span></div>
    <p class="instr">Сначала загни нижнюю полосу с ответами. Реши задания листа ${me}. Потом положите листы рядом: проверь решения соседа (лист ${other}) по ответам внизу своего листа и поставь «+» в его клетке «проверка». Не совпало — найдите ошибку вместе.</p>
    <ol class="tasks">${v[me].map((t, i) => `<li class="task"><span class="no">${i + 1})</span>${sheetTask(t)}<div class="otv">Ответ: __________ <span class="chk">проверка: ☐</span></div></li>`).join('')}</ol>
    <div class="peer"><b>✂ Загни до конца работы. Ответы к листу ${other}</b> (для проверки соседа): ${v[other].map((t, i) => `<span>${i + 1}) ${TYPES[t.type].keyHTML(t)}</span>`).join(' ')}</div>
  </div>`;
const PAIR_SHEET = {
  label: 'Взаимопроверка', two: false, pageClass: 'half pairs',
  about: 'Взаимопроверка в парах: на странице два листа — А и Б, разрежьте и раздайте соседям по парте. Внизу каждого листа — ответы к листу соседа, полосу загибают до конца работы. Решили — положили листы рядом и проверили друг друга.',
  generate(num, version = GEN_VERSION) {
    const A = fmtTasks(PAIR_PARTS(), num, 900, version), B = fmtTasks(PAIR_PARTS(), num, 950, version);
    return { num, version, label: version + '-' + num, А: A, Б: B, tasks: A, answers: A.map(fmtKey), answersB: B.map(fmtKey) };
  },
  sheet: v => pairHalf(v, 'А', 'Б') + pairHalf(v, 'Б', 'А'),
  key: vs => `<div class="page key"><h2>Ключ учителя · взаимопроверка · ${lowerTitle()}</h2>
    <table class="key"><thead><tr><th>Номер</th><th>Лист</th>${vs[0].tasks.map((_, i) => `<th>${i + 1}</th>`).join('')}</tr></thead>
    ${vs.map(v => ['А', 'Б'].map(s => `<tr><td>${v.label}</td><td>${s}</td>${v[s].map(t => `<td>${TYPES[t.type].keyHTML(t)}</td>`).join('')}</tr>`).join('')).join('')}
    </table><p style="font-size:10pt">Ответы к каждому листу напечатаны на листе соседа; ключ нужен, если пара не договорилась.</p></div>`,
};

// ---------- Лесенка подсказок ----------
// Задание и две подсказки из тренажёра (T.hints) в полосах справа. Полосы загибают назад до начала работы;
// застрял — отгибаешь первую, затем вторую. Баллы: без подсказок — 2, с одной — 1, с двумя — 0.
const LADDER_PARTS = () => typeof LADDER_V1 !== 'undefined' ? LADDER_V1 : KINDS_V1.slice(0, 5);
const LADDER_SHEET = {
  label: 'Лесенка подсказок', two: false, pageClass: 'ladder', flow: true,
  about: 'Разноуровневый лист: справа от каждого задания две подсказки в полосах. До начала работы полосы загибают назад по пунктиру; застрял — отгибаешь первую подсказку, потом вторую и отмечаешь это галочкой. Сильный решает без подсказок, слабый не остаётся без помощи.',
  generate(num, version = GEN_VERSION) {
    const tasks = fmtTasks(LADDER_PARTS(), num, 1100, version);
    return { num, version, label: version + '-' + num, tasks, hints: tasks.map(t => TYPES[t.type].hints(t).slice(0, 2)), answers: tasks.map(fmtKey) };
  },
  sheet: v => `<div class="sheet">
    ${fmtHead(v)}
    <h2>${META.title} · лесенка подсказок</h2>
    <p class="instr">Загни обе полосы с подсказками назад по пунктиру. Реши сам. Застрял — отогни подсказку 1, потом подсказку 2 и отметь, какие открыл. Без подсказок — 2 балла, с одной — 1.</p>
    <div class="lrows"><div class="lhead"><span>Задание</span><span>✂ Подсказка 1</span><span>✂ Подсказка 2</span></div>
    ${v.tasks.map((t, i) => `<div class="lrow"><div class="task"><span class="no">${i + 1})</span>${sheetTask(t)}<div class="otv">Ответ: ______________</div></div>
      ${v.hints[i].map(h => `<div class="hint">${h}<span class="chk">☐ открыл</span></div>`).join('')}</div>`).join('')}</div>
  </div>`,
  key: vs => fmtKeyPage('Ключ учителя · лесенка подсказок', vs, 'Баллы: без подсказок — 2, с одной подсказкой — 1, с двумя — 0. Галочки на полосах показывают, где ученику нужна помощь.'),
};

// форматы ядра, доступные теме: билет, самостоятельная, тест с выбором, взаимопроверка, лесенка — всегда;
// домино — если хватает разных ответов; «найди ошибку» — если у какого-то типа есть T.mistake
const CORE_SHEETS = {
  exit: EXIT_SHEET,
  test: TEST_SHEET,
  choice: CHOICE_SHEET,
  pair: PAIR_SHEET,
  ladder: LADDER_SHEET,
  ...(KINDS_V1.length >= 4 || typeof DOMINO_V1 !== 'undefined' ? { domino: DOMINO_SHEET } : {}),
  ...(mistakeTypes().length ? { errors: ERRORS_SHEET } : {}),
};
