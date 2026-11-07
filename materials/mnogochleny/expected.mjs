// Независимое решение каждого типа. Не используй вычислитель темы.
export function expected(task) {
  if (task.type === 'std') return { value: 'std:ok', key: `std:${task.terms.map(z => `${z.k}x${z.m}`).join('.')}` };
  if (task.type === 'degree') {
    const d = Math.max(...task.terms.map(z => z.m));
    return { value: { n: d, d: 1 }, key: `deg:${d}` };
  }
  if (task.type === 'free') {
    const f = task.terms[task.terms.length - 1].k;
    return { value: { n: f, d: 1 }, key: `free:${f}` };
  }
  if (task.type === 'terms') return { value: 'terms:ok', key: `terms:${task.terms.length}-${task.terms.map(z => `${z.k}x${z.m}`).join('.')}` };
  if (task.type === 'check') {
    const value = task.v === 'mono' || task.v === 'zero' ? 'да' : 'нет';
    return { value, key: value };
  }
  throw new Error('Нет независимого решения для типа ' + task.type);
}
