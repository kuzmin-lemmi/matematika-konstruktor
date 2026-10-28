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
function fmtKeyPage(title, vs, foot, cell = (t, v, i) => TYPES[t.type].keyHTML(t)) {
  const head = vs[0].tasks.map((_, i) => `<th>${i + 1}</th>`).join('');
  return `<div class="page key"><h2>${title} · ${lowerTitle()}</h2>
    <table class="key"><thead><tr><th>Вариант</th>${head}</tr></thead>
    ${vs.map(v => `<tr><td>${v.label}</td>${v.tasks.map((t, i) => `<td>${cell(t, v, i)}</td>`).join('')}</tr>`).join('')}
    </table><p style="font-size:10pt">${foot}</p></div>`;
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
  label: 'Самостоятельная', pageClass: 'test-work',
  about: 'Самостоятельная работа: задания по порядку, место для решения, баллы за каждое. Шкала оценок — внизу ключа. Соседние номера дают разные варианты: соседям по парте раздавайте разные.',
  generate(num, version = GEN_VERSION) {
    const plan = testPlan(), tasks = fmtTasks(plan.parts, num, 400, version, false);
    return { num, version, label: version + '-' + num, tasks, answers: tasks.map(fmtKey), points: plan.points };
  },
  sheet: (v, space) => `<div class="sheet">
    ${fmtHead(v)}
    <h2>${META.title} · самостоятельная работа</h2>
    <ol class="tasks one">${v.tasks.map((t, i) => `<li class="task"><span class="no">${i + 1})</span>${sheetTask(t)} <span class="pts">(${v.points[i]} ${plural(v.points[i], 'балл', 'балла', 'баллов')})</span>${space ? '<div class="cells"></div>' : '<div class="otv">Ответ: ______________</div>'}</li>`).join('')}</ol>
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
  label: 'Домино', two: false, pageClass: 'domino',
  about: 'Домино для групповой работы: вырежьте 12 костяшек. Ответ задания стоит на соседней костяшке; правильная цепочка замыкается в кольцо. Ключ — собранная цепочка.',
  generate(num, version = GEN_VERSION) {
    const src = typeof DOMINO_V1 !== 'undefined' ? DOMINO_V1 : KINDS_V1;
    const parts = Array.from({ length: DOMINO_N }, (_, i) => src[i % src.length]);
    const tasks = fmtTasks(parts, num, 500, version);
    const tiles = tasks.map((t, i) => ({ left: TYPES[tasks[(i + DOMINO_N - 1) % DOMINO_N].type].keyHTML(tasks[(i + DOMINO_N - 1) % DOMINO_N]), right: TYPES[t.type].text(t) }));
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
  label: 'Найди ошибку', two: false, pageClass: 'errors',
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

// форматы ядра, доступные теме: билет и самостоятельная — всегда, домино — если хватает разных ответов,
// «найди ошибку» — если у какого-то типа есть T.mistake
const CORE_SHEETS = {
  exit: EXIT_SHEET,
  test: TEST_SHEET,
  ...(KINDS_V1.length >= 4 || typeof DOMINO_V1 !== 'undefined' ? { domino: DOMINO_SHEET } : {}),
  ...(mistakeTypes().length ? { errors: ERRORS_SHEET } : {}),
};
