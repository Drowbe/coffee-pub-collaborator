// The panel page (panel.html): the one module panel, createModuleFrame (public/module-frame.js), in four states, with a
// theme, light or dark, and the panels' width chosen at the top (also from the address: ?theme=&mode=&w=).
import { createModuleFrame } from '/module-frame.js';

const D = document;
const THEMES = [
  { id: 'strong-coffee', label: 'Strong Coffee' },
  { id: 'calming-teal', label: 'Calming Teal' },
  { id: 'burnt-orange', label: 'Burnt Orange' },
];
const MODES = [{ id: 'dark', label: 'Dark', icon: 'moon' }, { id: 'light', label: 'Light', icon: 'sun' }];
const WIDTHS = [390, 500, 700, 1280].map((w) => ({ id: String(w), label: `${w}` }));

const q = new URLSearchParams(location.search);
const state = {
  theme: THEMES.some((t) => t.id === q.get('theme')) ? q.get('theme') : 'strong-coffee',
  mode: q.get('mode') === 'light' ? 'light' : 'dark',
  w: WIDTHS.some((w) => w.id === q.get('w')) ? q.get('w') : '700',
};

function apply() {
  D.getElementById('pp-theme-css').href = `prototype/themes/${state.theme}.css`;
  D.documentElement.dataset.themeMode = state.mode;
  D.documentElement.style.setProperty('--pp-w', `${state.w}px`);
  const u = new URL(location.href);
  u.searchParams.set('theme', state.theme);
  u.searchParams.set('mode', state.mode);
  u.searchParams.set('w', state.w);
  history.replaceState(null, '', u);
}

// The page's own switches, in the panel's switch look.
function pageSwitch(id, key, options) {
  const box = D.getElementById(id);
  const draw = () => {
    box.textContent = '';
    for (const o of options) {
      const b = D.createElement('button');
      b.type = 'button';
      b.className = 'mf-switch-btn';
      b.setAttribute('aria-pressed', String(state[key] === o.id));
      if (o.icon) { const i = D.createElement('i'); i.className = `fa-solid fa-${o.icon} fa-fw`; i.setAttribute('aria-hidden', 'true'); b.append(i); }
      const w = D.createElement('span');
      w.textContent = o.label;
      b.append(w);
      b.addEventListener('click', () => { state[key] = o.id; apply(); draw(); box.querySelector('[aria-pressed="true"]').focus(); });
      box.append(b);
    }
  };
  draw();
}

// ---- the sample panels ----
const rows = (n, words) => {
  const ul = D.createElement('ul');
  ul.className = 'pp-rows';
  for (let i = 0; i < n; i += 1) {
    const li = D.createElement('li');
    li.className = 'pp-row';
    const a = D.createElement('span');
    a.className = 'pp-row-words';
    a.textContent = words[i % words.length];
    const b = D.createElement('span');
    b.className = 'pp-row-note';
    b.textContent = `${(i % 5) + 1} May`;
    li.append(a, b);
    ul.append(li);
  }
  return ul;
};
const WORDS = ['Passports and visas', 'Chargers and adaptors', 'Rain jackets', 'First aid kit', 'Snacks for the drive', 'Maps printed', 'Camera and spare batteries', 'Sunscreen'];
const titlebar = () => ({
  add: { label: 'Add', entries: [{ id: 'list', label: 'A list', icon: 'list' }, { id: 'note', label: 'A note', icon: 'note-sticky' }] },
  icons: [{ id: 'pin', icon: 'thumbtack', label: 'Pin', on: false }, { id: 'alerts', icon: 'bell', label: 'Alerts' }, { id: 'pop', icon: 'up-right-from-square', label: 'Pop out' }],
  close: true,
});
const viewSwitch = () => ({ type: 'switch', id: 'view', label: 'View', value: 'list', options: [{ id: 'list', label: 'List', icon: 'list' }, { id: 'board', label: 'Board', icon: 'table-columns' }, { id: 'calendar', label: 'Calendar', icon: 'calendar' }] });
const manyTools = () => [
  viewSwitch(),
  { type: 'tabs', id: 'whose', label: 'Whose', value: 'all', options: [{ id: 'all', label: 'All', count: 24 }, { id: 'mine', label: 'Mine', count: 8 }, { id: 'shared', label: 'Shared', count: 5 }, { id: 'done', label: 'Done' }] },
  { type: 'search', id: 'find', label: 'Search the list', placeholder: 'Search' },
  { type: 'chips', id: 'when', label: 'Filters', options: [{ id: 'today', label: 'Today', on: true }, { id: 'week', label: 'This week' }, { id: 'flagged', label: 'Flagged' }] },
  { type: 'title', text: 'Week of 3 May' },
  { type: 'spacer' },
  { type: 'button', id: 'export', label: 'Export', icon: 'file-export', kind: 'secondary' },
  { type: 'button', id: 'share', label: 'Share', icon: 'share-nodes', kind: 'secondary' },
  { type: 'button', id: 'print', label: 'Print', icon: 'print', kind: 'icon' },
  { type: 'button', id: 'settings', label: 'Settings', icon: 'gear', kind: 'icon' },
  { type: 'button', id: 'new', label: 'New', icon: 'plus', kind: 'primary' },
];

const STATES = [
  {
    name: 'Idle', note: 'A typical panel: a view switch, a search and one primary button.',
    frame: () => ({
      title: 'Packing list', icon: 'suitcase', titlebar: titlebar(),
      toolbar: [viewSwitch(), { type: 'spacer' }, { type: 'search', id: 'find', label: 'Search the list', placeholder: 'Search' }, { type: 'button', id: 'new', label: 'New', icon: 'plus', kind: 'primary' }],
      content: rows(12, WORDS),
      status: { text: '12 things, 3 packed', items: [{ text: 'Saved', icon: 'check', tone: 'ok' }] },
    }),
  },
  {
    name: 'Many controls', note: 'Every kind of control at once. Narrow the width: they fold in order, then go into More; nothing is cut.',
    frame: () => ({
      title: 'Packing list for the long weekend in the mountains', icon: 'suitcase', titlebar: titlebar(), toolbar: manyTools(),
      content: rows(6, WORDS),
      status: { text: 'Showing 24 of 31, filtered by Today, sorted by date', items: [{ text: '2 late', icon: 'triangle-exclamation', tone: 'warn' }, { text: 'Saved', icon: 'check', tone: 'ok' }] },
    }),
  },
  {
    name: 'Empty', note: 'No content yet: the empty state in the content area.',
    frame: () => ({
      title: 'Packing list', icon: 'suitcase', titlebar: titlebar(),
      toolbar: [viewSwitch(), { type: 'spacer' }, { type: 'button', id: 'new', label: 'New', icon: 'plus', kind: 'primary' }],
      empty: { icon: 'inbox', title: 'Nothing here yet', text: 'Add the first one with New.' },
      status: { text: 'Nothing yet' },
    }),
  },
  {
    name: 'Narrow', note: 'Always 300 pixels wide, every kind of control: most of them in More.', narrow: true,
    frame: () => ({
      title: 'Packing list', icon: 'suitcase', titlebar: titlebar(), toolbar: manyTools(),
      content: rows(6, WORDS),
      status: { text: '24 things', items: [{ text: 'Saved', icon: 'check', tone: 'ok' }] },
    }),
  },
];

const main = D.getElementById('pp-main');
for (const s of STATES) {
  const sec = D.createElement('section');
  sec.className = 'pp-state';
  const h = D.createElement('h2');
  h.className = 'pp-state-name';
  h.textContent = s.name;
  const p = D.createElement('p');
  p.className = 'pp-state-note';
  p.textContent = s.note;
  const box = D.createElement('div');
  box.className = `pp-frame${s.narrow ? ' pp-narrow' : ''}`;
  const log = D.createElement('p');
  log.className = 'pp-log';
  log.setAttribute('aria-live', 'polite');
  const frame = createModuleFrame({
    ...s.frame(),
    onAction: (e) => { log.textContent = `Last: ${e.area} ${e.id}${e.value !== undefined ? ` = ${e.value}` : ''}${e.on !== undefined ? (e.on ? ' (on)' : ' (off)') : ''}`; },
  });
  box.append(frame.el);
  sec.append(h, p, box, log);
  main.append(sec);
}

pageSwitch('pp-theme', 'theme', THEMES);
pageSwitch('pp-mode', 'mode', MODES);
pageSwitch('pp-width', 'w', WIDTHS);
apply();
