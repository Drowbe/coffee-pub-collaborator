// A destination's page (/calendar; /map once Map is built; plan-calendar-destination.md and plan-map-destination.md):
// a host page made of modules' parts. GET /api/destinations/<id> names the parts (a `main`, and panels in their order);
// this page draws the header's second row (the page bar: a view switch and a filter of whose things show), mounts each
// part with mountModule() at environment scope, and keeps the one shared state every part draws from
// (createDestination() in module-host.js; the parts read it with host.destination.onState). The page names
// destinations, never modules: a module takes part by declaring a part (surfaces.destination).
//
// Remembered in this browser (decision 18): the view, the filter and the panel's tab, under app.destination.<id>. On a
// phone (640 px or less) the main part and each panel are tabs along the bottom, the view switch shows only on the
// main part's tab, and the first view is the phone's own (Day for the calendar) until one is picked.
import { loadBranding, api, wireOverlayBack, renderTopbar, renderPageBar, word, withinSpacePage } from '/brand.js';
import { nav } from '/nav-bar.js';
import { mountModule, createDestination } from '/module-host.js';
import { switchListHtml, wireSwitchList } from '/switch-list.js';
import { hashPanel } from '/primary-nav.js';

const $ = (id) => document.getElementById(id);
const destId = decodeURIComponent(location.pathname.split('/')[1] || '').toLowerCase(); // /CALENDAR is /calendar
const phoneQuery = window.matchMedia('(max-width: 640px)');
const onPhone = () => phoneQuery.matches;

// What each destination's page bar holds. `views`: the view switch (none: no switch). `phoneView`: the first view on a
// phone. `firstView(values)`: the first view on a wider screen, from the main part's own settings (the calendar's
// "Open on": Week for Week, Month otherwise). `mine`: the filter has the person's own first (Mine). `external`: the
// filter lists the person's own other calendars after the spaces (plan-google-calendar.md, Part 2), each with its tint. `search`: a search
// field on the right of the page bar, its words by whether the panel's place search is set up (`searchSetUp(values)`,
// the panel's settings). `initial`: the rest of the state the parts read. `needsWebgl`: the main part draws with WebGL,
// and without it the panel takes the page's width (the main part shows its own notice above it).
const KINDS = {
  calendar: {
    views: [{ id: 'month', label: 'Month', icon: 'calendar-days' }, { id: 'week', label: 'Week', icon: 'calendar-week' }, { id: 'day', label: 'Day', icon: 'calendar-day' }],
    phoneView: 'day',
    // Month, Week or Day as "Open on" says; the Agenda (`list`) and an old stored Month + list (`both`) open on Month here.
    firstView: (values) => (values && ['month', 'week', 'day'].includes(values.defaultView) ? values.defaultView : 'month'),
    external: true,
  },
  map: {
    views: [],
    mine: true,
    search: {
      label: 'Find a place',
      placeholder: 'Find a place, or paste coordinates or a map link',
      filterOnly: 'Filter places, or paste coordinates or a map link',
    },
    searchSetUp: (values) => Boolean(values && values.searchProvider && values.searchProvider !== 'none'),
    initial: { q: '', find: 0, selected: null },
    needsWebgl: true,
  },
};
const kind = KINDS[destId] || { views: [] };

// --- remembered in this browser ------------------------------------------------------------------
const KEY = `app.destination.${destId}`;
function remembered() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || '{}');
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}
function remember(patch) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...remembered(), ...patch }));
  } catch {
    // no storage: nothing is remembered
  }
}

// The environment's own list in the filter, beside the spaces (whose ids never start with a colon).
const OWN = ':own';
const MINE = ':mine'; // the person's own (the map's Mine)
const EXTERNAL = ':external:'; // one of the person's other calendars, by its id after this
// Each other calendar's tint, by its place in the person's list: the same order the Calendar draws them in.
const EXTERNAL_TINTS = ['blue', 'teal', 'purple', 'green', 'orange'];

let hub = null;
let parts = []; // { part, key, holder, wrap, mounted }
let tab = 'main'; // on a phone: 'main', or a panel's key
let panel = ''; // on a wider screen: the panel shown
let view = '';
let spaces = []; // [{ id, name, icon }] in the space list's order
const off = new Set(); // spaces the filter has off
let ownOn = true;
let mineOn = true;
let externals = []; // the person's other calendars: [{ id, name }], in their order
const externalOff = new Set(); // other calendars the filter has off
let find = 0;
let filterLabel = '';

function missing(text) {
  const note = $('dest-missing');
  note.textContent = text;
  note.hidden = false;
}

async function start() {
  renderTopbar({ location: '' });
  await loadBranding();
  wireOverlayBack();
  let me;
  try {
    me = (await api('GET', '/api/me')).user;
  } catch {
    location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
    return;
  }
  $('whoami').textContent = me.displayName;
  $('whoami-img').src = `/img/${encodeURIComponent(me.key)}/profile`;
  $('whoami-img').hidden = false;

  let d;
  try {
    d = await api('GET', `/api/destinations/${encodeURIComponent(destId)}`);
  } catch (err) {
    missing(err.status === 404 ? 'This page is not in your top bar.' : `This page could not open: ${err.message}`);
    return;
  }
  document.title = `${document.title.split(' - ')[0]} - ${d.name}`;

  // Where it starts: what this browser remembers, else the phone's own first view or the main part's choice.
  const saved = remembered();
  spaces = (d.spaces || []).map((r) => ({ id: r.id, name: r.name, icon: r.icon }));
  for (const id of Array.isArray(saved.off) ? saved.off : []) if (typeof id === 'string') off.add(id);
  ownOn = saved.ownOff !== true;
  mineOn = saved.mineOff !== true;
  for (const id of Array.isArray(saved.externalOff) ? saved.externalOff : []) if (typeof id === 'string') externalOff.add(id);
  // Never shown over a call (?from=space in the space page's frame), where others may see the screen.
  if (kind.external && !withinSpacePage()) await loadExternals();
  if (kind.views.some((v) => v.id === saved.view)) view = saved.view;
  else if (kind.views.length && onPhone()) view = kind.phoneView;
  else if (kind.views.length) {
    let values = {};
    try {
      values = (await api('GET', `/api/modules/${encodeURIComponent(d.main.module.id)}/settings/values?scope=environment`)).values || {};
    } catch {
      // the default view, then
    }
    view = kind.firstView(values);
  }
  const keyOf = (p) => (p.part === 'main' ? 'main' : `panel:${p.module.id}`);
  const panelKeys = (d.panels || []).map(keyOf);
  panel = panelKeys.includes(saved.panel) ? saved.panel : panelKeys[0] || '';
  tab = saved.tab === 'main' || panelKeys.includes(saved.tab) ? saved.tab : 'main';

  hub = createDestination(destId, { ...(kind.initial || {}), ...(view ? { view } : {}), ...filterState(), phone: onPhone() });
  // On a phone the parts are tabs: a part's `reveal` shows that part, and a place chosen in the list (a panel's tab)
  // shows the map with it selected (plan-map-destination, "Phones").
  let lastSelected = JSON.stringify(hub.state.selected ?? null);
  hub.onChange((st) => {
    if (st.reveal === 'main' || st.reveal === 'panel') {
      const key = st.reveal === 'main' ? 'main' : parts.find((p) => p.key !== 'main')?.key;
      hub.update({ reveal: null });
      if (key) show(key);
      return;
    }
    const sel = JSON.stringify(st.selected ?? null);
    if (sel === lastSelected) return;
    lastSelected = sel;
    if (onPhone() && st.selected && tab !== 'main' && 'selected' in (kind.initial || {})) show('main');
  });
  // Without WebGL a map part shows only its notice: the panel takes the page's width (plan-map-destination, "States").
  if (kind.needsWebgl && !webglWorks()) document.body.classList.add('dest-no-webgl');
  drawPageBar(d); // also names the page in the anchor on a phone (no segment wider: the top bar's entry is current)
  if (kind.search) drawSearch(d);
  drawPanelSwitch(d);
  drawTabs(d);

  // The parts: the main one fills the page; each panel in the panel, one shown at a time.
  $('dest-main').setAttribute('aria-label', d.main.label || d.name);
  parts.push(mountPart(d.main, $('dest-main'), 'main'));
  for (const p of d.panels || []) {
    const wrap = document.createElement('div');
    wrap.className = 'dest-panel-part';
    wrap.id = `dest-${keyOf(p).replace(':', '-')}`;
    wrap.setAttribute('role', 'region');
    wrap.setAttribute('aria-label', p.label);
    $('dest-panel-body').appendChild(wrap);
    parts.push(mountPart(p, wrap, keyOf(p)));
  }
  layout();
  phoneQuery.addEventListener('change', () => {
    layout();
    hub.update({ phone: onPhone() });
  });

  // Opened at a place: a day (#day=, from home's tile) for the main part, or an object (#ref=).
  takeHash();
  window.addEventListener('hashchange', takeHash);
}

// The filter's choice as the shared state has it: the spaces on, and whether the environment's own are.
function filterState() {
  return { ...(kind.mine ? { mine: mineOn } : {}), spaces: spaces.filter((r) => !off.has(r.id)).map((r) => r.id), environment: ownOn, ...(kind.external ? { externalOff: [...externalOff] } : {}) };
}

// The person's own other calendars, for the filter: none while the environment does not allow them.
async function loadExternals() {
  try {
    const got = await api('GET', '/api/me/external-calendars');
    externals = got && got.allowed ? (got.calendars || []).map((c) => ({ id: String(c.id), name: String(c.name || '') })) : [];
  } catch {
    externals = [];
  }
}

// Whether this browser can draw with WebGL, as a map part asks it.
function webglWorks() {
  try {
    const c = document.createElement('canvas');
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

// The page bar's search (the map): typing filters what the parts show (`q`); Enter asks the place search (`find`, raised
// each time); Escape clears it. A pasted position or map link is the parts' to read from `q`.
async function drawSearch(d) {
  const form = document.createElement('form');
  form.className = 'dest-search';
  form.setAttribute('role', 'search');
  form.innerHTML = '<i class="fa-solid fa-magnifying-glass fa-fw" aria-hidden="true"></i><input type="search" id="dest-search" maxlength="200" autocomplete="off" enterkeyhint="search">';
  const input = form.querySelector('input');
  const say = (text) => {
    input.placeholder = text;
    input.setAttribute('aria-label', text);
  };
  say(kind.search.filterOnly);
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    find += 1;
    hub.update({ q: input.value, find });
  });
  input.addEventListener('input', () => hub.update({ q: input.value }));
  input.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || !input.value) return;
    event.preventDefault();
    input.value = '';
    hub.update({ q: '' });
  });
  nav.register({ id: 'dest-search', bar: 'secondary', zone: 'right', group: 'dest-search', groupOrder: 1, order: 1, icon: 'magnifying-glass', label: kind.search.label, element: form, fold: false });
  document.getElementById('dest-bar').classList.add('has-search');
  // With a place search set up (the panel's own settings), Enter finds new places too, and the words say so.
  const panel = (d.panels || [])[0];
  if (!panel) return;
  try {
    const values = (await api('GET', `/api/modules/${encodeURIComponent(panel.module.id)}/settings/values?scope=environment`)).values || {};
    if (kind.searchSetUp(values)) say(kind.search.placeholder);
  } catch {
    // the filter's words, then
  }
}

function mountPart(part, container, key) {
  const inPage = part.runMode === 'page';
  let holder;
  if (inPage) {
    holder = document.createElement('div');
    holder.className = 'module-root dest-part-root';
  } else {
    holder = document.createElement('iframe');
    holder.className = 'dest-part-frame';
    holder.title = part.label || part.module.name;
  }
  container.appendChild(holder);
  const m = { part, key, holder, wrap: container, mounted: null };
  m.mounted = mountModule({
    module: { id: part.module.id, version: part.module.version, scope: part.module.scope },
    ...(inPage ? { container: holder } : { frame: holder }),
    scope: 'environment',
    entry: part.entry,
    destination: { hub, part: part.part },
    onOpenRef: openRef,
    // A part asking to be shown at a place in itself (host.page.open): it already is its own page.
    onOpenPage: (hash) => {
      m.mounted.deliver('pagehash', { hash });
      return true;
    },
  });
  return m;
}

// --- the page bar: the header's second row --------------------------------------------------------
// The shared page bar (renderPageBar() in brand.js, plan-two-zone-nav.md decision 10), without the page's name: the
// top bar's entry is marked current; on a phone the anchor names the page. The view switch (the look of
// host.ui.viewSwitch's tabs) and the filter are registered as the secondary bar's tools, as the space bar's are.
function drawPageBar(d) {
  const bar = renderPageBar({ name: d.name, icon: d.icon, showName: false, id: 'dest-bar', className: 'dest-bar' }).el;

  if (kind.views.length) {
    const views = document.createElement('span');
    views.className = 'tb-tabs dest-views';
    views.id = 'dest-views';
    views.setAttribute('role', 'group');
    views.setAttribute('aria-label', 'View');
    // The shared view switch (hostSwitch, public/sdk/host.js): icon and word, icons only while the bar is too narrow.
    for (const v of kind.views) {
      const b = document.createElement('button');
      b.type = 'button';
      b.dataset.view = v.id;
      window.hostSwitch.fill(b, v);
      views.appendChild(b);
    }
    views.addEventListener('click', (event) => {
      const b = event.target.closest('[data-view]');
      if (!b || b.dataset.view === view) return;
      view = b.dataset.view;
      remember({ view });
      paintViews();
      hub.update({ view });
    });
    nav.register({ id: 'dest-views', bar: 'secondary', zone: 'left', group: 'dest-view', groupOrder: 1, order: 1, icon: 'calendar', label: 'View', element: views, visible: () => !onPhone() || tab === 'main' });
    paintViews();
    window.hostSwitch.watch(bar.querySelector('.nav-left'));
  }

  const filter = document.createElement('span');
  filter.className = 'dest-filter';
  filter.innerHTML = `
    <button type="button" class="btn btn-small dest-filter-toggle" id="dest-filter-toggle" aria-expanded="false" aria-controls="dest-filter-list"><i class="fa-solid fa-filter fa-fw" aria-hidden="true"></i><span class="dest-filter-label" id="dest-filter-label"></span><i class="fa-solid fa-caret-down fa-fw" aria-hidden="true"></i></button>
    <div class="module-chooser-list dest-filter-list" id="dest-filter-list" role="group" hidden></div>`;
  const toggle = filter.querySelector('#dest-filter-toggle');
  const list = filter.querySelector('#dest-filter-list');
  list.setAttribute('aria-label', word('space', { many: true, cap: true }));
  const environmentName = document.querySelector('[data-brand="environmentName"]')?.textContent || word('environment', { cap: true });
  const fill = () => {
    list.innerHTML = switchListHtml([
      ...(kind.mine ? [{ id: MINE, icon: 'user', name: 'Mine', on: mineOn }] : []),
      { id: OWN, icon: 'globe', name: environmentName, on: ownOn },
      ...spaces.map((r) => ({ id: r.id, icon: r.icon, name: r.name, on: !off.has(r.id) })),
      ...externals.map((c, i) => ({ id: `${EXTERNAL}${c.id}`, icon: 'calendar', name: c.name, note: 'only you', tint: EXTERNAL_TINTS[i % EXTERNAL_TINTS.length], on: !externalOff.has(c.id) })),
    ], 'dest-filter');
  };
  const open = (yes) => {
    list.hidden = !yes;
    toggle.setAttribute('aria-expanded', String(yes));
    if (yes) {
      fill();
      list.querySelector('input.switch')?.focus();
      // Calendars added or removed on Profile since the page opened: the list again, keeping the focus where it is.
      if (kind.external && !withinSpacePage()) {
        loadExternals().then(() => {
          if (list.hidden) return;
          const at = document.activeElement?.dataset?.destFilter;
          fill();
          paintFilter();
          if (at) [...list.querySelectorAll('input[data-dest-filter]')].find((i) => i.dataset.destFilter === at)?.focus();
        });
      }
    }
  };
  toggle.addEventListener('click', () => open(list.hidden));
  wireSwitchList(list);
  list.addEventListener('change', (event) => {
    const input = event.target.closest('input[data-dest-filter]');
    if (!input) return;
    const id = input.dataset.destFilter;
    if (id === OWN) ownOn = input.checked;
    else if (id === MINE) mineOn = input.checked;
    else if (id.startsWith(EXTERNAL)) {
      if (input.checked) externalOff.delete(id.slice(EXTERNAL.length));
      else externalOff.add(id.slice(EXTERNAL.length));
    } else if (input.checked) off.delete(id);
    else off.add(id);
    remember({ off: [...off], ownOff: !ownOn, mineOff: !mineOn, ...(kind.external ? { externalOff: [...externalOff] } : {}) });
    paintFilter();
    hub.update(filterState());
  });
  filter.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || list.hidden) return;
    event.preventDefault();
    open(false);
    toggle.focus();
  });
  document.addEventListener('pointerdown', (event) => {
    if (!list.hidden && !event.composedPath().includes(filter)) open(false);
  });
  filter.addEventListener('focusout', (event) => {
    if (!list.hidden && event.relatedTarget && !filter.contains(event.relatedTarget)) open(false);
  });
  nav.register({ id: 'dest-filter', bar: 'secondary', zone: 'left', group: 'dest-filter', groupOrder: 2, order: 2, icon: 'filter', label: word('space', { many: true, cap: true }), element: filter });
  paintFilter();
}

function paintViews() {
  for (const b of document.querySelectorAll('#dest-views [data-view]')) {
    const on = b.dataset.view === view;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
}

// "Trips", or "Trips (3 of 5)" while some are off.
function paintFilter() {
  const total = spaces.length + 1 + (kind.mine ? 1 : 0);
  const shown = spaces.filter((r) => !off.has(r.id)).length + (ownOn ? 1 : 0) + (kind.mine && mineOn ? 1 : 0);
  const plural = word('space', { many: true, cap: true });
  filterLabel = shown === total ? plural : `${plural} (${shown} of ${total})`;
  // The person's other calendars are counted apart, never as spaces: "Trips (2 of 3) · Other calendars (1 of 2)".
  const calendarsOn = externals.filter((c) => !externalOff.has(c.id)).length;
  if (calendarsOn < externals.length) filterLabel += ` · Other calendars (${calendarsOn} of ${externals.length})`;
  $('dest-filter-label').textContent = filterLabel;
  $('dest-filter-toggle').title = filterLabel;
  $('dest-filter-toggle').setAttribute('aria-label', filterLabel);
}

// --- the panel's switch, and the phone's tabs -----------------------------------------------------
function drawPanelSwitch(d) {
  const panels = d.panels || [];
  if (panels.length < 2) return;
  $('dest-panel-head').hidden = false;
  const tabs = $('dest-panel-tabs');
  // The shared view switch, each panel with its module's icon (as the phone's tabs have): icons only while the panel is too narrow.
  for (const p of panels) {
    const b = document.createElement('button');
    b.type = 'button';
    b.dataset.panel = `panel:${p.module.id}`;
    window.hostSwitch.fill(b, { id: p.module.id, label: p.label, icon: /^[a-z0-9-]{1,40}$/.test(p.module.icon || '') ? p.module.icon : 'puzzle-piece' });
    tabs.appendChild(b);
  }
  window.hostSwitch.watch($('dest-panel-head'));
  tabs.addEventListener('click', (event) => {
    const b = event.target.closest('[data-panel]');
    if (!b || b.dataset.panel === panel) return;
    panel = b.dataset.panel;
    remember({ panel });
    layout();
  });
}

function drawTabs(d) {
  const all = [d.main, ...(d.panels || [])];
  if (all.length < 2) return;
  $('dest-tabs').innerHTML = all.map((p) => {
    const key = p.part === 'main' ? 'main' : `panel:${p.module.id}`;
    const icon = /^[a-z0-9-]{1,40}$/.test(p.module.icon || '') ? p.module.icon : 'puzzle-piece';
    return `<button type="button" class="dest-tab" data-tab="${key}"><i class="fa-solid fa-${icon} fa-fw" aria-hidden="true"></i><span>${escape(p.label)}</span></button>`;
  }).join('');
  $('dest-tabs').addEventListener('click', (event) => {
    const b = event.target.closest('[data-tab]');
    if (!b || b.dataset.tab === tab) return;
    tab = b.dataset.tab;
    remember({ tab });
    layout();
  });
}

const escape = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// What shows: on a wider screen the main part and the chosen panel; on a phone the one tab.
function layout() {
  const phone = onPhone();
  const panels = parts.filter((p) => p.key !== 'main');
  const hasTabs = parts.length > 1;
  $('dest-tabs').hidden = !(phone && hasTabs);
  document.body.classList.toggle('dest-has-tabs', phone && hasTabs);
  const showing = phone ? tab : null;
  $('dest-main').hidden = phone && showing !== 'main';
  $('dest-panel').hidden = !panels.length || (phone && showing === 'main');
  for (const p of panels) p.wrap.hidden = phone ? p.key !== showing : p.key !== panel;
  $('dest-panel-head').hidden = phone || panels.length < 2;
  for (const b of document.querySelectorAll('#dest-panel-tabs [data-panel]')) {
    const on = b.dataset.panel === panel;
    b.classList.toggle('on', on);
    b.setAttribute('aria-pressed', String(on));
  }
  for (const b of document.querySelectorAll('#dest-tabs [data-tab]')) {
    if (b.dataset.tab === tab) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
  nav.draw('secondary'); // the view switch shows on the main part's tab only, on a phone
}

// Bring a part into view (its tab on a phone, its panel on a wider screen).
function show(key) {
  if (key !== 'main') panel = key;
  tab = key;
  layout();
}

// An object to show. One of a part's own: that part shows it. Another module's: its page, keeping the way back to a
// call this page is open over.
function openRef(ref) {
  const target = parts.find((p) => p.part.module.id === ref.module && p.key === 'main') || parts.find((p) => p.part.module.id === ref.module);
  if (target) {
    show(target.key);
    target.mounted.deliver('objectopen', { ref });
    return true;
  }
  const q = new URLSearchParams(location.search);
  q.delete('space');
  if (ref.scope === 'space') q.set('space', ref.space);
  location.href = `/modules/${encodeURIComponent(ref.module)}${q.toString() ? `?${q}` : ''}#ref=${encodeURIComponent(JSON.stringify(ref))}`;
  return true;
}

function takeHash() {
  let h = location.hash.slice(1);
  if (!h) return;
  // A panel to show (#panel=<module id>, a panel tile's heading on home): it wins over the remembered tab this once and is
  // then remembered as a pick in the switch would be (the bottom tab on a phone). It leaves the address, so a reload
  // keeps the person's later picks. An unknown or unreadable one is ignored.
  const asked = hashPanel(h, parts.filter((p) => p.key !== 'main').map((p) => p.key));
  if (asked.found) {
    h = asked.rest;
    history.replaceState(history.state, '', `${location.pathname}${location.search}${h ? `#${h}` : ''}`);
    if (asked.key) {
      panel = asked.key;
      if (onPhone()) {
        tab = asked.key;
        remember({ panel, tab });
      } else remember({ panel });
      layout();
    }
    if (!h) return;
  }
  if (h.startsWith('ref=')) {
    try {
      const ref = JSON.parse(decodeURIComponent(h.slice(4)));
      if (ref && typeof ref.module === 'string') openRef(ref);
    } catch {
      // not a pointer
    }
    return;
  }
  if (/^[A-Za-z0-9=&_.:,-]{1,80}$/.test(h)) {
    const main = parts.find((p) => p.key === 'main');
    if (main) {
      show('main');
      main.mounted.deliver('pagehash', { hash: h });
    }
  }
}

start().catch((err) => missing(`This page could not start: ${err.message}`));
