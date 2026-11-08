// Независимое решение каждого типа. Не используй вычислитель темы.
export function expected(task) {
  if (task.type === 'like') return { value: 'like:ok', key: `like:${task.terms.map(z => `${z.k}${z.v || ''}${z.m}`).join('.')}` };
  if (task.type === 'poly2') return { value: 'poly2:ok', key: `poly2:${task.terms.map(z => `${z.k}${z.v || ''}${z.m}`).join('.')}` };
  if (task.type === 'bracket') {
    const c = task.form === 'num' ? task.a : -1;
    return { value: 'bracket:ok', key: `bracket:${c}-${task.form}` };
  }
  if (task.type === 'expand') return { value: 'expand:ok', key: `expand:${task.a}-${task.p}-${task.b}-${task.q}` };
  if (task.type === 'value') {
    const n = task.a * task.at + task.b;
    return { value: { n, d: 1 }, key: String(n).replace('-', '−') };
  }
  if (task.type === 'check') {
    const value = task.v === 'ok' ? 'да' : 'нет';
    return { value, key: value };
  }
  throw new Error('Нет независимого решения для типа ' + task.type);
}
