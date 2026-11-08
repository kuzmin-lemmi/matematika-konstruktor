// Независимое решение каждого типа. Не используй вычислитель темы.
// Признаки: отмечены два катета — по двум катетам; катет и угол при нём — по катету и острому углу;
// гипотенуза и катет — по гипотенузе и катету. Гипотенуза лежит против прямого угла.
const WORD = { legs: 'катеты', legang: 'катет и угол', hypleg: 'гипотенуза и катет' };
const OPPOSITE = { A: 'BC', B: 'AC', C: 'AB' };
const n = x => ({ value: { n: x, d: 1 }, key: String(x) });

export function expected(task) {
  if (task.type === 'which') return { value: task.kind, key: WORD[task.kind] };
  if (task.type === 'trap') return { value: 'none', key: 'не доказано' };
  if (task.type === 'hyp') return { value: OPPOSITE[task.v], key: OPPOSITE[task.v] };
  // равные треугольники: искомая сторона второго равна стороне первого с теми же буквами
  if (task.type === 'corr') return n({ AB: task.ab, BC: task.bc, AC: task.ac }[task.ask]);
  if (task.type === 'perim') return n(task.ac + task.bc + task.ab);
  if (task.type === 'height') {
    // mid: △ABD = △CBD по двум катетам → BC = AB; iso: по гипотенузе и катету → AD = AC / 2; ang: по катету и углу → DC = AD
    if (task.form === 'mid') return n(task.m);
    return n(task.d);
  }
  throw new Error('Нет независимого решения для типа ' + task.type);
}
