// The workbench (workbench.html): every part of a module window on one page, in the product's own stylesheets, drawn by the
// product's own code where it exists: the toolbar row and its view switch, search and filter chips (createToolbar), the status
// line (createStatusSlot) and the menu (openHostMenu). The rest is built from the shared classes of public/sdk/system.css.
// Each part has three looks: Today, Original (workbench.css, the look before the design system build) and Free (the
// controls on the left, written as CSS custom properties onto the parts set to Free only). The chat message and two module
// objects are taken from the Prototype page's captured screens (prototype/screens), so they are the product's real markup.
import { createToolbar, createStatusSlot } from '/module-host.js';
import { openHostMenu, closeHostMenu } from '/host-menu.js';

const D = document;
const $ = (s, r = D) => r.querySelector(s);
const STORE = 'design-workbench';
const THEMES = [
  { id: 'strong-coffee', name: 'Strong Coffee' },
  { id: 'calming-teal', name: 'Calming Teal' },
  { id: 'burnt-orange', name: 'Burnt Orange' },
];
const WIDTHS = [390, 700, 1280];
const LOOKS = [
  { id: 'today', label: 'Today', icon: 'check' },
  { id: 'original', label: 'Original', icon: 'clock-rotate-left' },
  { id: 'free', label: 'Free', icon: 'sliders' },
];

// The live controls. Each writes one or more custom properties (`props`) or a rule (`rule`) onto every part set to Free.
// `def` is today's value: a control at its default writes nothing, so Free at its defaults is Today.
const px = (v) => `${v}px`;
const CONTROLS = [
  { group: 'Bands' },
  { id: 'titleH', label: 'Title bar height', min: 24, max: 56, def: 34, props: (v) => ({ '--module-header-h': px(v) }) },
  { id: 'toolbarH', label: 'Toolbar height', min: 24, max: 56, def: 34, props: (v) => ({ '--toolbar-h': px(v) }) },
  { id: 'statusH', label: 'Status line height', min: 16, max: 40, def: 24, props: (v) => ({ '--status-bar-h': px(v) }) },
  { id: 'bandH', label: 'Object head band', min: 20, max: 48, def: 30, props: (v) => ({ '--card-head-h': px(v) }) },
  { group: 'Controls' },
  { id: 'ctrlS', label: 'Small control height', min: 20, max: 44, def: 30, props: (v) => ({ '--btn-h-small': px(v), '--tab-h-small': px(v), '--chip-h': px(v) }) },
  { id: 'ctrlL', label: 'Control height', min: 28, max: 52, def: 38, props: (v) => ({ '--btn-h': px(v), '--tab-h-default': px(v) }) },
  { group: 'Padding and gap' },
  { id: 'tbPadX', label: 'Toolbar padding, sides', min: 0, max: 24, def: 8, props: (v) => ({ '--pad-toolbar-x': px(v) }) },
  { id: 'tbPadY', label: 'Toolbar padding, top', min: 0, max: 8, def: 1, props: (v) => ({ '--band-room': px(v) }) },
  { id: 'bandX', label: 'Title and status start', min: 0, max: 24, def: 12, props: (v) => ({ '--pad-band-x': px(v) }) },
  { id: 'contentPad', label: 'Content padding', min: 0, max: 32, def: 12, props: (v) => ({ '--pad-window': px(v) }) },
  { id: 'gap', label: 'Gap', min: 0, max: 24, def: 8, props: (v) => ({ '--gap-in': px(v), '--wb-gap': px(v) }) },
  { group: 'Corners' },
  { id: 'rMin', label: 'Radius, min', min: 0, max: 12, def: 3, props: (v) => ({ '--radius-min': px(v) }) },
  { id: 'rSmall', label: 'Radius, small', min: 0, max: 16, def: 5, props: (v) => ({ '--radius-small': px(v) }) },
  { id: 'rMedium', label: 'Radius, medium', min: 0, max: 20, def: 7, props: (v) => ({ '--radius-medium': px(v) }) },
  { id: 'rLarge', label: 'Radius, large', min: 0, max: 28, def: 11, props: (v) => ({ '--radius-large': px(v) }) },
  { group: 'Shadows and edges' },
  { id: 'shadowWin', label: 'Window shadow', min: 0, max: 40, def: 8, props: (v) => ({ '--wb-shadow-window': `0 ${Math.round(v / 4)}px ${v}px var(--wb-shadow-ink)` }) },
  { id: 'shadowObj', label: 'Object shadow', min: 0, max: 24, def: 0, props: (v) => ({ '--wb-shadow-object': `0 ${Math.round(v / 4)}px ${v}px var(--wb-shadow-ink)` }) },
  { id: 'shadowInk', label: 'Shadow strength', unit: '%', min: 0, max: 100, def: 100, props: (v) => ({ '--wb-shadow-ink': `color-mix(in srgb, var(--shadow-color) ${v}%, transparent)` }) },
  { id: 'edge', label: 'Edge strength', unit: '%', min: 0, max: 40, def: 12, props: (v) => ({ '--edge-hairline': `color-mix(in srgb, var(--text-primary) ${v}%, var(--surface-panel))` }) },
  { group: 'States and icons' },
  { id: 'selFill', label: 'Selected fill', unit: '%', min: 0, max: 80, def: 28, props: (v) => ({ '--fill-selected': `color-mix(in srgb, var(--accent-fill) ${v}%, transparent)` }) },
  { id: 'iconSize', label: 'Icon square size', min: 16, max: 40, def: 24, props: (v) => ({ '--wb-icon': px(v) }) },
  { id: 'iconOn', label: 'Icon square', kind: 'switch', def: 1, props: (v) => ({ '--wb-icon-show': v ? 'inline-flex' : 'none' }) },
];

// ---- state, kept in this browser ----
const state = { theme: 'strong-coffee', mode: 'dark', w: 700, looks: {}, free: {} };
try { Object.assign(state, JSON.parse(localStorage.getItem(STORE) || '{}')); } catch { /* storage off or spoilt: the defaults */ }
const q = new URLSearchParams(location.search);
if (THEMES.some((t) => t.id === q.get('theme'))) state.theme = q.get('theme');
if (['dark', 'light'].includes(q.get('mode'))) state.mode = q.get('mode');
if (WIDTHS.includes(Number(q.get('w')))) state.w = Number(q.get('w'));
const lookAll = LOOKS.some((l) => l.id === q.get('look')) ? q.get('look') : '';
const save = () => { try { localStorage.setItem(STORE, JSON.stringify(state)); } catch { /* not kept */ } };
const value = (c) => (Object.prototype.hasOwnProperty.call(state.free, c.id) ? Number(state.free[c.id]) : c.def);

// ---- small builders ----
function el(tag, attrs = {}, ...kids) {
  const e = D.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'text') e.textContent = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2), v);
    else e.setAttribute(k, v === true ? '' : v);
  }
  for (const k of kids.flat()) if (k !== null && k !== undefined && k !== false) e.append(k);
  return e;
}
const fa = (name, extra = '') => el('i', { class: `fa-solid fa-${name} fa-fw${extra ? ` ${extra}` : ''}`, 'aria-hidden': 'true' });
const iconBtn = (icon, label, cls = 'btn-quiet btn-small', more = {}) => el('button', { type: 'button', class: `sdk-icon-btn ${cls}`, 'aria-label': label, 'data-tip': label, ...more }, fa(icon));
const stateRow = (label, ...body) => el('div', { class: 'wb-state' }, el('span', { class: 'wb-state-label', text: label }), el('div', { class: 'wb-state-body' }, ...body));

// A view switch built with the product's own fill (public/sdk/host.js hostSwitch), outside a toolbar.
function viewSwitch(options, current, { label, onPick, disabled = [] } = {}) {
  const g = el('div', { class: 'tb-tabs', role: 'group', 'aria-label': label || 'View' });
  for (const o of options) {
    const b = el('button', { type: 'button' });
    window.hostSwitch.fill(b, o);
    const on = o.id === current;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
    if (disabled.includes(o.id)) b.disabled = true;
    if (onPick) b.addEventListener('click', () => onPick(o.id));
    g.append(b);
  }
  return g;
}

// A toolbar row drawn by createToolbar (public/module-host.js), redrawn as its controls are used, as a module's would be.
function liveToolbar(row, items) {
  const bar = createToolbar(row, {
    send: (data) => {
      const it = items.find((i) => i.id === data.id);
      if (!it) return;
      if (it.type === 'tabs') it.value = data.value;
      else if (it.type === 'search') it.value = data.value;
      else if (it.type === 'chips') { const o = it.options.find((x) => x.id === data.value); if (o) o.on = data.on; }
      else if (typeof it.on === 'boolean') it.on = !it.on;
      bar.set(items);
    },
  });
  bar.set(items);
  return bar;
}

// A module window: title bar, toolbar (createToolbar), content, status line (createStatusSlot).
function moduleWindow({ title, icon, tint, toolbar, status, wide = true }) {
  const head = el('header', { class: 'mod-header', ...(tint ? { 'data-tint': tint } : {}) },
    el('span', { class: 'mod-title' }, fa(icon), el('span', { text: title })),
    el('span', { class: 'mod-header-tools' }, iconBtn('plus', 'Add'), iconBtn('ellipsis-vertical', 'More', 'btn-quiet btn-small', { 'aria-haspopup': 'menu' }), iconBtn('xmark', 'Close')));
  const row = el('div', { class: 'mod-toolbar', role: 'toolbar', 'aria-label': `${title} tools` });
  const content = el('div', { class: 'sdk-window-content' });
  const line = el('div', { class: 'mod-status', role: 'region', 'aria-label': `${title} status` });
  const win = el('div', { class: `sdk-window sdk-window-floating wb-window${wide ? '' : ' wb-window-fixed'}` }, head, row, content, line);
  if (toolbar) liveToolbar(row, toolbar); else row.hidden = true;
  if (status) createStatusSlot(line).set(status); else line.hidden = true;
  return { win, content, row, head };
}

// ---- the parts ----
const VIEW_OPTIONS = [
  { id: 'days', label: 'Days', icon: 'calendar-days' },
  { id: 'decisions', label: 'Decisions', icon: 'scale-balanced' },
  { id: 'bookings', label: 'Bookings', icon: 'ticket' },
];
const NARROW_ROW = (items) => { const r = el('div', { class: 'mod-toolbar wb-mini-row' }); liveToolbar(r, items); return r; };

const PARTS = [
  {
    id: 'view-switch', name: 'View switch', note: 'The joined switch a module puts in its toolbar (host.ui.viewSwitch). Drawn by createToolbar; icons only when the row is too narrow.',
    build() {
      const w = moduleWindow({ title: 'Planner', icon: 'suitcase-rolling', tint: 'teal', toolbar: [{ type: 'tabs', id: 'view', value: 'days', options: VIEW_OPTIONS.map((o) => ({ ...o })) }], status: [{ text: '9 days' }, { text: '14 bookings' }] });
      w.content.append(
        stateRow('Idle and active', viewSwitch(VIEW_OPTIONS, 'days', { label: 'View' })),
        stateRow('Disabled choice', viewSwitch(VIEW_OPTIONS, 'days', { label: 'View', disabled: ['bookings'] })),
        stateRow('Narrow row, 200px', NARROW_ROW([{ type: 'tabs', id: 'view', value: 'decisions', options: VIEW_OPTIONS.map((o) => ({ ...o })) }])),
        stateRow('Chat, today', el('div', { class: 'wb-chat-views', 'data-wb-capture': 'chatviews' }, el('p', { class: 'wb-note', text: 'Loading the captured chat' }))),
        stateRow('Chat, proposed', chatVariant()),
      );
      return w.win;
    },
  },
  {
    id: 'tab-strip', name: 'Tab strip', note: 'Tabs that change what a page shows (.sdk-tabs). Built from the shared classes: no shared function draws it yet.',
    build() {
      const strip = (small, sel, extra = {}) => el('div', { class: `sdk-tabs${small ? ' sdk-tabs-small' : ''}`, role: 'tablist', 'aria-label': 'Sections', ...extra },
        [['General', 'gear', ''], ['People', 'user-group', '4'], ['Modules', 'puzzle-piece', ''], ['Theme', 'palette', ''], ['Access', 'key', '']].map(([word, icon, n], i) => el('button', { type: 'button', role: 'tab', class: 'sdk-tab', 'aria-selected': String(i === sel), ...(word === 'Access' ? { 'aria-disabled': 'true' } : {}) },
          el('i', { class: `sdk-tab-glyph fa-solid fa-${icon} fa-fw`, 'aria-hidden': 'true' }), el('span', { class: 'sdk-tab-word', text: word }), n ? el('span', { class: 'sdk-tab-badge', text: n }) : null)));
      const w = moduleWindow({ title: 'Set up', icon: 'sliders', status: [{ text: 'Saved', icon: 'check' }] });
      w.content.append(
        stateRow('Default, 38px', strip(false, 0)),
        stateRow('Small, 30px', strip(true, 1)),
        stateRow('Narrow, scrolls', el('div', { class: 'wb-narrow' }, strip(true, 2))),
      );
      return w.win;
    },
  },
  {
    id: 'buttons', name: 'Buttons', note: 'Four roles, two sizes and the icon button (.btn, .sdk-icon-btn). The toolbar\'s buttons are drawn by createToolbar.',
    build() {
      const roles = [['Primary', 'btn-primary', 'plus'], ['Secondary', '', 'share-nodes'], ['Danger', 'btn-danger', 'trash'], ['Quiet', 'btn-quiet', 'pen']];
      const grid = el('div', { class: 'wb-grid', role: 'group', 'aria-label': 'Buttons by role' },
        el('span', { class: 'wb-grid-head', text: '' }), ...['Default', 'Small', 'Icon', 'Small icon', 'Selected', 'Disabled'].map((t) => el('span', { class: 'wb-grid-head', text: t })),
        roles.flatMap(([name, cls, icon]) => [
          el('span', { class: 'wb-grid-label', text: name }),
          el('span', {}, el('button', { type: 'button', class: `btn ${cls}` }, fa(icon), ` ${name}`)),
          el('span', {}, el('button', { type: 'button', class: `btn btn-small ${cls}` }, fa(icon), ` ${name}`)),
          el('span', {}, iconBtn(icon, name, cls)),
          el('span', {}, iconBtn(icon, name, `btn-small ${cls}`)),
          el('span', {}, el('button', { type: 'button', class: `btn btn-small ${cls} on`, 'aria-pressed': 'true' }, fa(icon), ` ${name}`)),
          el('span', {}, el('button', { type: 'button', class: `btn btn-small ${cls}`, disabled: true }, fa(icon), ` ${name}`)),
        ]));
      const w = moduleWindow({
        title: 'Notes', icon: 'note-sticky', tint: 'gold',
        toolbar: [{ id: 'add', label: 'New note', icon: 'plus', primary: true }, { id: 'share', label: 'Share', icon: 'share-nodes' }, { id: 'pin', icon: 'thumbtack', title: 'Pinned first', on: true }, { id: 'del', label: 'Delete', icon: 'trash', disabled: true }],
        status: [{ text: '12 notes' }],
      });
      w.content.append(el('div', { class: 'wb-scroll-x' }, grid));
      return w.win;
    },
  },
  {
    id: 'search', name: 'Search field', note: 'The toolbar search (createToolbar) with a filter button on its left and filter chips on its right; then the field alone.',
    build() {
      const w = moduleWindow({
        title: 'Research', icon: 'magnifying-glass', tint: 'blue',
        toolbar: [{ id: 'filters', icon: 'filter', title: 'Filters' }, { type: 'search', id: 'q', placeholder: 'Search notes and links', value: '' }, { type: 'chips', id: 'kinds', label: 'Kinds', options: [{ id: 'notes', label: 'Notes', icon: 'note-sticky', on: true }, { id: 'links', label: 'Links', icon: 'link', on: false }, { id: 'files', label: 'Files', icon: 'file', on: true }] }],
        status: [{ text: '31 found' }],
      });
      const field = (v, more = {}) => el('form', { class: 'sdk-search', role: 'search', onsubmit: (e) => e.preventDefault() }, fa('magnifying-glass'), el('input', { type: 'search', placeholder: 'Search', 'aria-label': 'Search', value: v, ...more }));
      w.content.append(
        stateRow('Empty', field('')),
        stateRow('With words', field('Lisbon')),
        stateRow('Disabled', field('', { disabled: true })),
        stateRow('Filter left and right', el('div', { class: 'sdk-cluster wb-nowrap' }, iconBtn('filter', 'Filters', 'btn-small'), field(''), el('button', { type: 'button', class: 'btn btn-small btn-quiet' }, fa('arrow-down-wide-short'), ' Newest'))),
      );
      return w.win;
    },
  },
  {
    id: 'chips', name: 'Chips and filters', note: 'Choice chips, tags and status labels (.sdk-chip and family). The toolbar\'s chips fold into one button when the row is narrow.',
    build() {
      const choice = (word, on, more = {}) => el('button', { type: 'button', class: `sdk-chip${on ? ' on' : ''}`, 'aria-pressed': String(on), ...more }, fa(more.icon || 'tag'), el('span', { class: 'sdk-chip-label', text: word }));
      const w = moduleWindow({
        title: 'Places', icon: 'location-dot', tint: 'pink',
        toolbar: [{ type: 'chips', id: 'cat', label: 'Kinds', options: [{ id: 'food', label: 'Food', icon: 'utensils', tint: 'orange', on: true }, { id: 'sights', label: 'Sights', icon: 'landmark', tint: 'blue', on: true }, { id: 'stay', label: 'Stays', icon: 'bed', tint: 'purple', on: false }, { id: 'shops', label: 'Shops', icon: 'bag-shopping', tint: 'green', on: true }] }],
        status: [{ text: '24 places' }, { text: '3 kinds shown' }],
      });
      w.content.append(
        stateRow('Choice: off, on, disabled', el('div', { class: 'sdk-chips', role: 'group', 'aria-label': 'Choice chips' }, choice('Food', false, { icon: 'utensils' }), choice('Sights', true, { icon: 'landmark' }), choice('Stays', false, { icon: 'bed', disabled: true }), el('button', { type: 'button', class: 'sdk-chip' }, el('span', { class: 'sdk-chip-label', text: 'Shops' }), el('span', { class: 'sdk-badge', text: '7' })))),
        stateRow('Tags', el('div', { class: 'sdk-cluster' }, ...['neutral', 'ok', 'warn', 'danger', 'info'].map((t) => el('span', { class: 'sdk-chip-tag', 'data-tone': t, text: t === 'neutral' ? 'Idea' : t === 'ok' ? 'Booked' : t === 'warn' ? 'Pending' : t === 'danger' ? 'Cancelled' : 'Note' })))),
        stateRow('Status labels', el('div', { class: 'sdk-cluster' }, el('span', { class: 'sdk-status', 'data-tone': 'ok', text: 'Paid' }), el('span', { class: 'sdk-status', 'data-tone': 'warn', text: 'Due Friday' }), el('span', { class: 'sdk-status', 'data-tone': 'danger', text: 'Overdue' }))),
        stateRow('Narrow row, 200px', NARROW_ROW([{ type: 'chips', id: 'cat', label: 'Kinds', options: [{ id: 'food', label: 'Food', icon: 'utensils', on: true }, { id: 'sights', label: 'Sights', icon: 'landmark', on: false }, { id: 'shops', label: 'Shops', icon: 'bag-shopping', on: true }] }])),
      );
      return w.win;
    },
  },
  {
    id: 'toolbar', name: 'Toolbar row and content', note: 'A full toolbar over its content. The lines mark where the title, the toolbar, the content and the status line start; the numbers are measured.',
    build() {
      const w = moduleWindow({
        title: 'Calendar', icon: 'calendar-days', tint: 'red',
        toolbar: [{ type: 'title', text: 'October 2026' }, { type: 'tabs', id: 'view', value: 'month', options: [{ id: 'month', label: 'Month', icon: 'calendar' }, { id: 'week', label: 'Week', icon: 'calendar-week' }, { id: 'agenda', label: 'Agenda', icon: 'list' }] }, { type: 'search', id: 'q', placeholder: 'Search events', value: '' }, { id: 'today', label: 'Today', icon: 'calendar-day' }],
        status: [{ text: 'Oct 2026' }, { text: '18 events' }, { text: 'Synced', icon: 'check', end: true }],
      });
      w.content.append(...rows(3));
      w.win.classList.add('wb-guided');
      w.win.append(el('div', { class: 'wb-guides', 'aria-hidden': 'true' }));
      const note = el('p', { class: 'wb-measure', role: 'status' });
      return el('div', { class: 'wb-stack' }, w.win, note);
    },
  },
  {
    id: 'titlebar', name: 'Title bar', note: 'The band at the top of every module window (.mod-header): plain, with the module\'s tint, and narrow with a long name.',
    build() {
      const bar = (title, icon, tint) => el('header', { class: 'mod-header', ...(tint ? { 'data-tint': tint } : {}) },
        el('span', { class: 'mod-title' }, fa(icon), el('span', { text: title })),
        el('span', { class: 'mod-header-tools' }, iconBtn('plus', 'Add'), iconBtn('ellipsis-vertical', 'More'), iconBtn('xmark', 'Close')));
      const w = moduleWindow({ title: 'Budget', icon: 'wallet', tint: 'green', status: [{ text: '$2,140 of $3,000' }] });
      w.content.append(
        stateRow('Plain', el('div', { class: 'wb-band-box' }, bar('Assistant', 'robot'))),
        stateRow('With tint', el('div', { class: 'wb-band-box' }, bar('Maps', 'map-location-dot', 'pink'))),
        stateRow('Narrow, long name', el('div', { class: 'wb-band-box wb-narrow' }, bar('Restaurants to try in Lisbon and Porto', 'utensils', 'orange'))),
      );
      return w.win;
    },
  },
  {
    id: 'status', name: 'Status line', note: 'The line at the foot of a module window, drawn by createStatusSlot: words, a status label and an end part; cut when narrow.',
    build() {
      const line = (items, narrow) => { const s = el('div', { class: 'mod-status', role: 'region', 'aria-label': 'Status' }); createStatusSlot(s).set(items); return el('div', { class: `wb-band-box${narrow ? ' wb-narrow' : ''}` }, s); };
      const w = moduleWindow({ title: 'To-do', icon: 'list-check', tint: 'purple', status: [{ text: '8 open' }, { text: '3 due today', chip: true }, { text: 'Saved', icon: 'check', end: true }] });
      w.content.append(
        stateRow('Words', line([{ text: 'Oct 2026' }, { text: '18 events' }])),
        stateRow('With a label and an end', line([{ text: '8 open' }, { text: '3 due today', chip: true }, { text: 'Saved', icon: 'check', end: true }])),
        stateRow('Narrow, cut', line([{ text: 'Lisbon in autumn, the long version' }, { text: '18 events this month' }, { text: 'Synced', icon: 'check', end: true }], true)),
      );
      return w.win;
    },
  },
  {
    id: 'object', name: 'Object with a banded head', note: 'The banded box (.sdk-card-banded): the Chat\'s message uses it. Beside it, objects as the Planner and Research draw them today, for comparison.',
    build() {
      const banded = (title, sub, icon, tint, { on = false, disabled = false, body = true } = {}) => el('article', { class: `sdk-card-banded wb-object${on ? ' on' : ''}`, ...(disabled ? { 'aria-disabled': 'true' } : {}), ...(on ? { 'aria-selected': 'true' } : {}) },
        el('div', { class: 'sdk-card-head' },
          el('div', { class: 'sdk-card-main' }, el('span', { class: 'sdk-card-icon', ...(tint ? { 'data-tint': tint } : {}) }, fa(icon)), el('span', { class: 'sdk-card-title', text: title }), el('span', { class: 'sdk-card-sub', text: sub })),
          iconBtn('ellipsis-vertical', 'More')),
        body ? el('div', { class: 'sdk-card-body', text: 'Near the river, with a view of the bridge. Breakfast is included; ask for the quiet side.' }) : null);
      const w = moduleWindow({ title: 'Research', icon: 'magnifying-glass', tint: 'blue', status: [{ text: '4 notes' }] });
      const ref = el('div', { class: 'wb-compare' },
        el('figure', { class: 'wb-figure' }, el('figcaption', { text: 'Chat message (reference)' }), el('div', { class: 'wb-chat', 'data-wb-capture': 'chat' }, el('p', { class: 'wb-note', text: 'Loading the captured chat' }))),
        el('figure', { class: 'wb-figure' }, el('figcaption', { text: 'Research note, today' }), el('div', { class: 'wb-capture', 'data-wb-capture': 'research' }, el('p', { class: 'wb-note', text: 'Loading' }))),
        el('figure', { class: 'wb-figure wb-wide' }, el('figcaption', { text: 'Planner day, today' }), el('div', { class: 'wb-capture', 'data-wb-capture': 'planner' }, el('p', { class: 'wb-note', text: 'Loading' }))));
      w.content.append(
        stateRow('Idle', banded('Hotel Avenida Palace', 'Oct 25', 'bed', 'purple')),
        stateRow('Selected', banded('Time Out Market', 'Oct 26', 'utensils', 'orange', { on: true })),
        stateRow('Disabled', banded('Tram 28', 'Oct 27', 'train-tram', 'blue', { disabled: true })),
        stateRow('Head only', banded('Pack the adapters', 'To-do', 'list-check', '', { body: false })),
        ref,
      );
      return w.win;
    },
  },
  {
    id: 'row', name: 'Row', note: 'One line of a list (.sdk-row): a tick, words, a meta and the "..."; on the window and inside a box.',
    build() {
      const w = moduleWindow({ title: 'To-do', icon: 'list-check', tint: 'purple', status: [{ text: '3 open' }] });
      const inBox = el('div', { class: 'sdk-card' }, el('h3', { class: 'sdk-card-title', text: 'Before we leave' }), el('div', { class: 'sdk-card-list' }, ...rows(2, true)));
      w.content.append(
        stateRow('Idle, selected, disabled', el('div', { class: 'sdk-list' }, ...rows(3))),
        stateRow('Inside a box', inBox),
      );
      return w.win;
    },
  },
  {
    id: 'menu', name: 'Menu', note: 'The host\'s menu (openHostMenu). The one shown here is a copy of what it draws; the button opens the real one.',
    build() {
      const w = moduleWindow({ title: 'Notes', icon: 'note-sticky', tint: 'gold', status: [{ text: '12 notes' }] });
      const open = el('button', { type: 'button', class: 'btn btn-small', 'aria-haspopup': 'menu' }, fa('ellipsis-vertical'), ' Open the menu');
      open.addEventListener('click', () => openHostMenu(open, MENU()));
      const copy = el('div', { class: 'wb-menu-copy', 'data-wb-menu': '' });
      w.content.append(stateRow('Drawn by the product', copy), stateRow('Live', open));
      return w.win;
    },
  },
];

// The Chat's view row as a proposal: the two views as one joined switch, and Start call as a button of its own at the end
// of the row (Primary or Secondary, picked beside it), so two views and one action no longer look alike.
function chatVariant() {
  const views = [{ id: 'discussion', label: 'Discussion', icon: 'comments' }, { id: 'assistant', label: 'Assistant', icon: 'wand-magic-sparkles' }];
  const row = el('div', { class: 'mod-toolbar wb-chat-row' });
  const call = el('button', { type: 'button', class: 'btn btn-small btn-primary wb-push-end' }, fa('phone'), ' Start call');
  let current = 'discussion';
  const draw = () => {
    const sw = viewSwitch(views, current, { label: 'Chat views', onPick: (id) => { current = id; draw(); } });
    sw.classList.add('wb-segmented');
    row.replaceChildren(sw, call);
    window.hostSwitch.fit(row);
  };
  draw();
  const role = viewSwitch([{ id: 'primary', label: 'Primary' }, { id: 'secondary', label: 'Secondary' }], 'primary', {
    label: 'Start call button',
    onPick: (id) => {
      call.classList.toggle('btn-primary', id === 'primary');
      for (const b of role.querySelectorAll('.tb-tab')) { const on = b.getAttribute('aria-label') === (id === 'primary' ? 'Primary' : 'Secondary'); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
    },
  });
  return el('div', { class: 'wb-stack' }, el('div', { class: 'wb-band-box' }, el('header', { class: 'chat-head' }, el('span', { text: 'Chat' }), el('span', { class: 'chat-tools' }, iconBtn('ellipsis-vertical', 'More'), iconBtn('xmark', 'Close chat'))), row),
    el('div', { class: 'wb-inline' }, el('span', { class: 'wb-note', text: 'Start call as' }), role));
}

const MENU = () => [
  { heading: 'This note' },
  { label: 'Open', icon: 'up-right-from-square', onPick() {} },
  { label: 'Pinned first', icon: 'thumbtack', checked: true, toggle: true, onPick() {} },
  { label: 'Rename', icon: 'pen', hint: 'Change the name everyone sees', onPick() {} },
  { label: 'Move to a space', icon: 'arrow-right', disabled: true },
  { divider: true },
  { label: 'Delete', icon: 'trash', danger: true, onPick() {} },
];

function rows(n, inBox = false) {
  const data = [
    ['Book the train to Porto', 'Sam', 'Fri', {}],
    ['Pick a restaurant for Saturday', 'Mia', 'Sat', { selected: true }],
    ['Renew passports', 'Both', 'Done', { disabled: true }],
  ];
  return data.slice(0, n).map(([title, sub, meta, s]) => el('div', { class: `sdk-row${s.selected ? ' on' : ''}`, ...(s.selected ? { 'aria-selected': 'true' } : {}), ...(s.disabled ? { 'aria-disabled': 'true' } : {}) },
    el('label', { class: 'sdk-row-tick' }, el('input', { type: 'checkbox', 'aria-label': `Done: ${title}`, ...(s.disabled ? { checked: true } : {}) })),
    el('span', { class: 'sdk-row-main' }, el('span', { class: 'sdk-row-title', text: title }), inBox ? null : el('span', { class: 'sdk-row-sub', text: sub })),
    el('span', { class: 'sdk-row-meta', text: meta }),
    iconBtn('ellipsis-vertical', 'More')));
}

// ---- the page ----
function drawTop() {
  const theme = $('#wb-theme');
  theme.replaceChildren(...THEMES.map((t) => { const b = el('button', { type: 'button', 'data-theme': t.id }); window.hostSwitch.fill(b, { id: t.id, label: t.name }); return b; }));
  $('#wb-width').replaceChildren(...WIDTHS.map((w) => { const b = el('button', { type: 'button', 'data-w': String(w) }); window.hostSwitch.fill(b, { id: String(w), label: `${w}`, icon: w === 390 ? 'mobile-screen' : w === 700 ? 'window-maximize' : 'desktop' }); return b; }));
  $('#wb-look-all').replaceChildren(...LOOKS.map((l) => { const b = el('button', { type: 'button', 'data-look': l.id }); window.hostSwitch.fill(b, { id: l.id, label: `All ${l.label}` }); return b; }));
  theme.addEventListener('click', (e) => { const b = e.target.closest('[data-theme]'); if (b) { state.theme = b.dataset.theme; apply(); } });
  $('#wb-mode').addEventListener('click', (e) => { const b = e.target.closest('[data-mode]'); if (b) { state.mode = b.dataset.mode; apply(); } });
  $('#wb-width').addEventListener('click', (e) => { const b = e.target.closest('[data-w]'); if (b) { state.w = Number(b.dataset.w); apply(); } });
  $('#wb-look-all').addEventListener('click', (e) => { const b = e.target.closest('[data-look]'); if (!b) return; for (const p of PARTS) state.looks[p.id] = b.dataset.look; apply(); });
}
const pressed = (group, attr, v) => { for (const b of $(group).querySelectorAll(`[${attr}]`)) { const on = b.getAttribute(attr) === String(v); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); } };

function drawParts() {
  const host = $('#wb-parts');
  for (const p of PARTS) {
    const look = el('div', { class: 'wb-look' });
    const sec = el('section', { class: 'wb-part', id: `part-${p.id}`, 'data-look': 'today', 'aria-labelledby': `part-${p.id}-name` },
      el('header', { class: 'wb-part-head' },
        el('div', { class: 'wb-part-words' }, el('h2', { class: 'wb-part-name', id: `part-${p.id}-name`, text: p.name }), el('p', { class: 'wb-note', text: p.note })),
        look),
      el('div', { class: 'wb-frame' }, p.build()));
    look.append(viewSwitch(LOOKS, 'today', { label: `${p.name} look`, onPick: (id) => { state.looks[p.id] = id; apply(); } }));
    host.append(sec);
  }
}

function drawControls() {
  const box = $('#wb-controls');
  let group = null;
  for (const c of CONTROLS) {
    if (c.group) { group = el('fieldset', { class: 'wb-group' }, el('legend', { class: 'wb-group-name', text: c.group })); box.append(group); continue; }
    const id = `wb-c-${c.id}`;
    const out = el('output', { class: 'wb-value', for: id });
    let input;
    if (c.kind === 'switch') input = el('input', { type: 'checkbox', id, class: 'wb-check' });
    else input = el('input', { type: 'range', id, min: String(c.min), max: String(c.max), step: '1' });
    const reset = el('button', { type: 'button', class: 'sdk-icon-btn btn-quiet btn-small wb-one-reset', 'aria-label': `Reset ${c.label}`, 'data-tip': `Back to ${c.def}${c.kind === 'switch' ? '' : c.unit || 'px'}` }, fa('rotate-left'));
    const line = el('div', { class: 'wb-control', 'data-control': c.id }, el('label', { class: 'wb-control-name', for: id, text: c.label }), out, reset, input);
    const read = () => (c.kind === 'switch' ? (input.checked ? 1 : 0) : Number(input.value));
    input.addEventListener('input', () => { setControl(c, read()); });
    reset.addEventListener('click', () => { delete state.free[c.id]; apply(); });
    group.append(line);
  }
  $('#wb-reset').addEventListener('click', () => { state.free = {}; apply(); });
  $('#wb-copy').addEventListener('click', copyTokens);
}

function setControl(c, v) {
  if (v === c.def) delete state.free[c.id]; else state.free[c.id] = v;
  writeFree();
  showControls();
  save();
}

// The changed controls as one rule on the Free parts' frames, plus the rules that read the workbench's own properties.
function changed() {
  const props = {};
  for (const c of CONTROLS) if (c.id && Object.prototype.hasOwnProperty.call(state.free, c.id)) Object.assign(props, c.props(value(c)));
  // The shadow's ink is read by the two shadows; when only they changed it is still written, at today's strength.
  if ((props['--wb-shadow-window'] || props['--wb-shadow-object']) && !props['--wb-shadow-ink']) Object.assign(props, CONTROLS.find((c) => c.id === 'shadowInk').props(100));
  return props;
}
function writeFree() {
  const props = changed();
  const body = Object.entries(props).map(([k, v]) => `  ${k}: ${v};`).join('\n');
  $('#wb-free-rule').textContent = body ? `.wb-part[data-look="free"] > .wb-frame {\n${body}\n}\n` : '';
  const ink = props['--wb-shadow-ink'];
  const tokens = Object.fromEntries(Object.entries(props).filter(([k]) => k !== '--wb-shadow-ink').map(([k, v]) => [k, ink ? v.replace('var(--wb-shadow-ink)', ink) : v]));
  $('#wb-out').value = Object.keys(tokens).length ? JSON.stringify(tokens, null, 2) : '';
  requestAnimationFrame(measureAll);
}
function showControls() {
  for (const c of CONTROLS) {
    if (!c.id) continue;
    const line = $(`[data-control="${c.id}"]`);
    const input = $('input', line);
    const v = value(c);
    if (c.kind === 'switch') input.checked = Boolean(v); else input.value = String(v);
    $('output', line).textContent = c.kind === 'switch' ? (v ? 'On' : 'Off') : `${v}${c.unit || 'px'}`;
    line.classList.toggle('is-changed', Object.prototype.hasOwnProperty.call(state.free, c.id));
  }
}

async function copyTokens() {
  const text = $('#wb-out').value || '{}';
  const note = $('#wb-copy-note');
  try { await navigator.clipboard.writeText(text); note.textContent = 'Copied.'; } catch {
    $('#wb-out').select();
    note.textContent = 'Select the box below and copy it.';
  }
}

function apply() {
  D.documentElement.dataset.themeMode = state.mode;
  $('#wb-theme-css').href = `prototype/themes/${state.theme}.css`;
  pressed('#wb-theme', 'data-theme', state.theme);
  pressed('#wb-mode', 'data-mode', state.mode);
  pressed('#wb-width', 'data-w', state.w);
  const looks = new Set(PARTS.map((p) => state.looks[p.id] || 'today'));
  pressed('#wb-look-all', 'data-look', looks.size === 1 ? [...looks][0] : '');
  D.documentElement.style.setProperty('--wb-w', `${state.w}px`);
  for (const p of PARTS) {
    const look = state.looks[p.id] || 'today';
    const sec = $(`#part-${p.id}`);
    sec.dataset.look = look;
    for (const b of $('.wb-look', sec).querySelectorAll('.tb-tab')) { const on = b.getAttribute('aria-label') === LOOKS.find((l) => l.id === look).label; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
  }
  writeFree();
  showControls();
  save();
  closeHostMenu();
}

// ---- measuring the padding relation (Toolbar part) ----
function measureAll() {
  for (const win of D.querySelectorAll('.wb-guided')) {
    const box = win.getBoundingClientRect();
    const first = (parent) => { const c = [...parent.children].find((x) => !x.hidden && x.getClientRects().length && getComputedStyle(x).display !== 'none'); return c ? c.getBoundingClientRect().left - box.left : null; };
    const title = $('.mod-title > i', win).getBoundingClientRect().left - box.left;
    const tool = first($('.mod-toolbar', win));
    const content = first($('.sdk-window-content', win));
    const status = first($('.mod-status-items', win));
    const marks = [['Title', title], ['Toolbar', tool], ['Content', content], ['Status', status]].filter(([, x]) => x !== null).map(([n, x]) => [n, Math.round(x)]);
    $('.wb-guides', win).replaceChildren(...marks.map(([n, x]) => el('span', { class: 'wb-guide', 'data-name': n, style: `left:${x}px` })));
    const note = win.parentElement.querySelector('.wb-measure');
    if (note) {
      const xs = new Set(marks.map(([, x]) => x));
      note.textContent = `${marks.map(([n, x]) => `${n} starts ${x}px in`).join(' · ')}. ${xs.size === 1 ? 'All four line up.' : 'They do not line up.'}`;
    }
  }
}

// ---- the captured references: the chat message and two module objects, from the Prototype page's screens ----
const scopeCss = (text) => text.replace(/:root\s*\{[^}]*\}/g, '').replace(/(^|[\s,}])(html|body)(?=[\s,{.:[])/g, '$1:host');
const fetchText = (u) => fetch(u).then((r) => (r.ok ? r.text() : '')).catch(() => '');
function fixAssets(node) {
  for (const img of node.querySelectorAll('img[src^="../assets/"]')) img.setAttribute('src', img.getAttribute('src').replace('../assets/', 'prototype/assets/'));
  for (const x of node.querySelectorAll('[style]')) x.removeAttribute('style');
  for (const x of node.querySelectorAll('[id]')) x.removeAttribute('id');
  for (const x of node.querySelectorAll('[data-proto-scroll]')) x.removeAttribute('data-proto-scroll');
}
async function drawCaptures() {
  const [ws, sdkHost, sdkSystem, researchCss, plannerCss] = await Promise.all([
    fetchText('prototype/screens/workspace-1280.htm'), fetchText('../sdk/host.css'), fetchText('../sdk/system.css'),
    fetchText('prototype/styles/67bd893f5df2.txt'), fetchText('prototype/styles/868c1af4b4f8.txt'),
  ]);
  const doc = new DOMParser().parseFromString(ws, 'text/html');
  const deep = (root, sel) => { const hit = root.querySelector(sel); if (hit) return hit; for (const t of root.querySelectorAll('template')) { const h = deep(t.content, sel); if (h) return h; } return null; };
  // The chat: two messages (another person's and your own with a link box), in the chat column's own list.
  const chatBox = $('[data-wb-capture="chat"]');
  const list = deep(doc, '#messages');
  if (chatBox && list) {
    const msgs = [...list.querySelectorAll(':scope > .message')];
    const pick = [msgs.find((m) => !m.classList.contains('own')), msgs.find((m) => m.classList.contains('own') && m.querySelector('.chat-link, .chat-object')) || msgs.find((m) => m.classList.contains('own'))].filter(Boolean);
    const holder = el('div', { class: 'messages wb-messages' });
    for (const m of pick) { const c = D.importNode(m, true); fixAssets(c); holder.append(c); }
    chatBox.replaceChildren(el('div', { class: 'chat-column wb-chat-column' }, holder));
  }
  // The Chat's view row as drawn today (its title bar and #chat-views, which style.css reads by id), in the chat's own box.
  const viewsBox = $('[data-wb-capture="chatviews"]');
  const head = deep(doc, '#chat .chat-head');
  const views = deep(doc, '#chat-views');
  if (viewsBox && head && views) {
    const h = D.importNode(head, true);
    const v = D.importNode(views, true);
    fixAssets(h);
    for (const x of v.querySelectorAll('[id]')) x.removeAttribute('id');
    viewsBox.replaceChildren(el('aside', { class: 'chat module module-chat wb-band-box', 'data-view': 'discussion' }, el('div', { class: 'mod-content' }, h, v)));
    window.hostSwitch.fit(v);
  }
  // A module object: put in a shadow root with the module's captured stylesheet, as the product runs an in-page module.
  const sdk = `${scopeCss(sdkHost)}\n${scopeCss(sdkSystem)}\n`;
  const inShadow = (slot, node, css, trim = null) => {
    if (!slot || !node) { if (slot) slot.replaceChildren(el('p', { class: 'wb-note', text: 'Not found in the captured screen.' })); return; }
    const c = D.importNode(node, true);
    fixAssets(c);
    if (trim) trim(c);
    const hostEl = el('div', { class: 'module-root wb-shadow-host' });
    const root = hostEl.attachShadow({ mode: 'open' });
    const st = D.createElement('style');
    st.textContent = `${sdk}${css}\n:host { display: block; height: auto !important; overflow: visible !important; } .app { height: auto !important; padding: 0 !important; }`;
    root.append(st, el('div', { class: 'app' }, c));
    slot.replaceChildren(hostEl);
  };
  inShadow($('[data-wb-capture="research"]'), deep(doc, 'article.rcard[data-kind="note"]') || deep(doc, 'article.rcard'), researchCss);
  inShadow($('[data-wb-capture="planner"]'), (deep(doc, 'section.sdk-day:not(.is-empty):not(.is-current)') || deep(doc, 'section.sdk-day:not(.is-empty)')), plannerCss, (day) => {
    // The day's head and its first two entries (a flight and a stay); its suggestions and add row left out.
    for (const x of day.querySelectorAll(':scope > :not(.sdk-day-head, .timeline)')) x.remove();
    for (const x of [...day.querySelectorAll('.timeline > li')].slice(2)) x.remove();
  });
}

// The menu as the product draws it: opened on a hidden button, copied, closed.
function drawMenuCopy() {
  const slot = $('[data-wb-menu]');
  if (!slot) return;
  const trigger = el('button', { type: 'button', class: 'wb-hidden-trigger', tabindex: '-1', 'aria-hidden': 'true' });
  D.body.append(trigger);
  openHostMenu(trigger, MENU());
  const menu = [...D.querySelectorAll('.host-menu')].pop();
  if (menu) {
    const c = menu.cloneNode(true);
    c.removeAttribute('style');
    c.classList.add('wb-static-menu');
    c.setAttribute('role', 'presentation');
    for (const b of c.querySelectorAll('button')) b.tabIndex = -1;
    slot.replaceChildren(c);
  }
  closeHostMenu();
  trigger.remove();
}

drawTop();
drawControls();
// On a phone or a narrow window the controls start folded, so the parts come first.
if (window.matchMedia('(max-width: 900px)').matches) $('#wb-free').open = false;
drawParts();
if (lookAll) for (const p of PARTS) state.looks[p.id] = lookAll;
apply();
drawMenuCopy();
drawCaptures().then(() => requestAnimationFrame(measureAll));
if (typeof ResizeObserver === 'function') new ResizeObserver(() => requestAnimationFrame(measureAll)).observe($('#wb-parts'));
window.addEventListener('load', () => requestAnimationFrame(measureAll));
D.documentElement.setAttribute('data-wb-ready', '');
