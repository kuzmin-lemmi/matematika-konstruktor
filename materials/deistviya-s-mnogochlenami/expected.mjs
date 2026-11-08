// Независимое решение каждого типа. Не используй вычислитель темы.
export function expected(task) {
  if (task.type === 'add') return { value: 'add:ok', key: `add:${task.P.c2},${task.P.c1},${task.P.c0}+${task.Q.c2},${task.Q.c1},${task.Q.c0}` };
  if (task.type === 'sub') return { value: 'sub:ok', key: `sub:${task.P.c2},${task.P.c1},${task.P.c0}-${task.Q.c2},${task.Q.c1},${task.Q.c0}` };
  if (task.type === 'mul2') return { value: 'mul2:ok', key: `mul2:${task.a},${task.b}` };
  if (task.type === 'prod') return { value: 'prod:ok', key: `prod:${task.a},${task.b},${task.c},${task.d}` };
  if (task.type === 'check') {
    const value = task.v === 'add' ? 'да' : 'нет';
    return { value, key: value };
  }
  throw new Error('Нет независимого решения для типа ' + task.type);
}
