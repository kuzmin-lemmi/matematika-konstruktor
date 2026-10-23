// Загрузка собранного материала в jsdom — для тестов и снимков.
// Внешние ресурсы (шрифты) не загружаются: проверяем только код материала.
import { readFileSync } from 'node:fs';
import { JSDOM, VirtualConsole } from 'jsdom';

export function loadHtml(html, { query = '', beforeParse, slug = 'test' } = {}) {
  const errors = [];
  const virtualConsole = new VirtualConsole();
  virtualConsole.on('jsdomError', error => errors.push(error));
  virtualConsole.on('error', (...args) => errors.push(new Error(args.map(String).join(' '))));
  const dom = new JSDOM(html, {
    url: `https://example.test/materials/${slug}.html${query}`,
    runScripts: 'dangerously',
    pretendToBeVisual: true,
    virtualConsole,
    beforeParse,
  });
  return { window: dom.window, errors, close: () => dom.window.close() };
}

export const loadFile = (file, options = {}) => loadHtml(readFileSync(file, 'utf8'), options);
