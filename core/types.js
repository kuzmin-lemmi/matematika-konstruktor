// число — ответ: same по умолчанию, ключ и ловушки по умолчанию
for (const T of Object.values(TYPES)) {
  if (T.input === 'num' || T.input === 'frac') {
    T.same = T.same || ((t, v) => qeq(v, T.ans(t)));
    T.key = T.key || (t => keyQ(T.ans(t)));
    T.keyHTML = T.keyHTML || (t => htmlQ(T.ans(t)));
  }
  if (T.input === 'choice') T.same = T.same || ((t, v) => v === T.ans(t));
}
function generate(type, rnd, form, tries = 2000) {
  for (let k = 0; k < tries; k++) {
    const t = TYPES[type].gen(rnd, form);
    if (!TYPES[type].bad?.(t)) return { type, ...t };
  }
  throw new Error('Генератор не нашёл задание: ' + type);
}
