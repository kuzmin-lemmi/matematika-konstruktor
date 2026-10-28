// Только файлы выбранной темы; общие изменения публикуются отдельно.
export function publicationFiles(slug) {
 if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '')) throw new Error('Некорректный slug');
 return [`public/materials/${slug}.html`, `public/posts/${slug}.jpg`, `public/posts/${slug}-dark.jpg`, `public/posts/${slug}.source.json`, `src/content/items/${slug}.md`, `tests/${slug}.test.mjs`];
}
export const foreignFiles = (paths, slug) => paths.filter(p => !publicationFiles(slug).includes(p.replaceAll('\\', '/')));
