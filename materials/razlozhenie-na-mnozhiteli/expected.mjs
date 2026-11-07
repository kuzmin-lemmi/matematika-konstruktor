// Независимое решение каждого типа. Не используй вычислитель темы.
export function expected(task) {
  if (task.type === 'common') return { value: 'common:ok', key: `common:${task.C.k}x${task.C.m}` };
  if (task.type === 'group') return { value: 'group:ok', key: `group:${task.a}+${task.b}` };
  if (task.type === 'diffsq') return { value: 'diffsq:ok', key: `diffsq:${task.A.k}x${task.A.m}-${task.B.k}x${task.B.m}` };
  if (task.type === 'square') return { value: 'square:ok', key: `square:${task.A.k}x${task.A.m}${task.sign > 0 ? '+' : '-'}${task.B.k}x${task.B.m}` };
  if (task.type === 'combo') return { value: 'combo:ok', key: `combo:${task.c}-${task.b}` };
  if (task.type === 'check') {
    const value = task.v === 'ok' ? 'да' : 'нет';
    return { value, key: value };
  }
  throw new Error('Нет независимого решения для типа ' + task.type);
}
