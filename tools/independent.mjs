// Общий прогон; expected получает только данные задания, без API материала.
import assert from 'node:assert/strict';

export function checkIndependent(APP, expected, { samples = 200, variants = 30 } = {}) {
  function check(task, context) {
    try {
      const answer = expected(JSON.parse(JSON.stringify(task)));
      assert.ok(answer && 'value' in answer && 'key' in answer, 'expected должен вернуть { value, key }');
      assert.ok(APP.TYPES[task.type].same(task, answer.value), 'независимый ответ не принят');
      assert.equal(APP.TYPES[task.type].key(task), answer.key, 'не совпадает ключ');
      return answer;
    } catch (error) {
      throw new Error(`${context}; тип=${task.type}; задание=${JSON.stringify(task)}: ${error.message}`, { cause: error });
    }
  }
  for (const type of Object.keys(APP.TYPES)) {
    for (let seed = 1; seed <= samples; seed++) {
      try {
        check(APP.generate(type, APP.mulberry32(seed)), `зерно=${seed}`);
      } catch (error) {
        throw new Error(`тип=${type}; зерно=${seed}: ${error.message}`, { cause: error });
      }
    }
  }
  for (let i = 0; i < variants; i++) {
    const number = 1000 + i * 293;
    const variant = APP.makeVariant(number);
    variant.tasks.forEach((task, index) => {
      const context = `вариант=${number}; задание №${index + 1}`;
      const answer = check(task, context);
      assert.equal(variant.answers[index], answer.key, context);
    });
  }
}
