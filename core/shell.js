// Общие константы, адрес материала, хранилище настроек. SLUG и META вставляет сборка.
const MINUS = '−';

const P = new URLSearchParams(location.search);
const MODE = ['board', 'print', 'home'].includes(P.get('mode')) ? P.get('mode') : null;
const PREVIEW = P.get('preview') === '1';
// Ссылка для учеников (?mode=home&student=1): только тренажёр — без меню, доски и раздатки
const STUDENT = P.get('student') === '1';
const $ = id => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem('matshag:' + SLUG + ':' + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('matshag:' + SLUG + ':' + k, String(v)); } catch {} },
};

// Ссылка «← Назад на сайт» на стартовом экране: материал открыт с сайта (/zapusk/<slug>/ или /materials/<slug>.html)
// ведёт на страницу материала /item/<slug>/. Скачанный файл и ссылка для учеников её не показывают.
function siteHref() {
  if (STUDENT || location.protocol === 'file:') return '';
  let top = location;
  try { if (window.top !== window && window.top.location.origin === location.origin) top = window.top.location; } catch {}
  const z = top.pathname.match(/^(.*\/)zapusk\/([a-z0-9-]+)\/?$/);
  if (z) return `${top.origin}${z[1]}item/${z[2]}/`;
  const m = location.pathname.match(/^(.*\/)materials\/([a-z0-9-]+)\.html$/);
  return m ? `${location.origin}${m[1]}item/${m[2]}/` : '';
}

// ================= Экраны =================
let screen = null;
function show(name) {
  if (STUDENT && name !== 'home') return;
  boardStopPreview();
  screen = name;
  ['start', 'board', 'print', 'home'].forEach(s => { $(s).hidden = s !== name; });
  $('help').hidden = true;
  if (name === 'board') renderBoard();
  if (name === 'print') renderPrint();
  if (name === 'home') homeSetup();
}
function toggleTheme() {
  const dark = document.documentElement.dataset.theme
    ? document.documentElement.dataset.theme === 'dark'
    : matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.dataset.theme = dark ? 'light' : 'dark';
  store.set('theme', document.documentElement.dataset.theme);
}
async function toggleFull() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen();
    else await document.documentElement.requestFullscreen();
  } catch {}
}

