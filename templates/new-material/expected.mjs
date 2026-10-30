// ЗАМЕНИ: независимое решение каждого типа. Не используй вычислитель темы.
export function expected(task) {
  if (task.type === 'sum') {
    const n = task.a + task.b;
    return { value: { n, d: 1 }, key: String(n).replace('-', '−') };
  }
  if (task.type === 'cmp') {
    const value = task.a < task.b ? '<' : '>';
    return { value, key: value };
  }
  throw new Error('Нет независимого решения для типа ' + task.type);
}
