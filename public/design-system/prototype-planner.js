// The Prototype's Planner: the Planner's own day view, drawn from the Planner's own pieces (Thomas, 2026-10-30; nothing here ships).
//  - The markup is modules/travel/src/travel.html's templates, copied character for character (TEMPLATES below, each under its id there
//    without the "tpl-" and the "card-": day is tpl-day2, flight is tpl-card-flight ...), and filled the way modules/travel/src/travel.js fills them
//    (buildDay, buildEntry, buildCard, moreInto): the same slots, the same hide rules.
//  - The styles are the module's own: its stylesheets, read from window.DS_SOURCES (sources.js, written by
//    `node tools/design-system-snapshot.mjs --sources`; run it again after a change to modules/travel/src/*.css), then the shared
//    host.css and system.css. Like the product, the day lives in a shadow root, so the page's classes (.row, .slot ...) cannot reach it.
//  - What is new here is only the Head and Icon switches and their rules, in prototype.css under [data-pp-head] and [data-pp-icon].
// The icons are the SVGs the product draws (DS_SOURCES.svgs). The words are made up (a day in Porto).
const D = document;
const TEMPLATES = {
  'day': `<section class="sdk-card sdk-day"><ol class="timeline"></ol><div class="suggestions" hidden><div class="suggestions-title">Other <span data-word="module" data-word-form="many"></span> have</div><div class="suggestions-list"></div></div></section>`,
  'day-head': `<div class="sdk-day-head"><div class="sdk-day-date"><b data-slot="daynum"></b><span data-slot="daymonth"></span></div><div class="sdk-day-main"><h2 class="sdk-card-title" data-slot="position"></h2><p class="sdk-card-sub" data-slot="summary"></p><div class="sdk-day-labels" hidden></div></div><div class="sdk-day-actions"><button class="btn btn-small day-add sdk-day-add" type="button" data-action="day-menu" aria-haspopup="menu" aria-label="Add to this day" title="Add to this day"><span class="ic" data-icon="plus"></span> <span class="sdk-day-add-word">Add</span></button><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="day-more" aria-haspopup="menu" aria-label="More for this day" data-tip="More for this day"><span class="ic" data-icon="ellipsis-vertical"></span></button></div></div>`,
  'row': `<li class="row entry"><div class="when"><b data-slot="time"></b><small data-slot="sub"></small></div><div class="rail"><span class="dot"></span></div><div class="slot"></div></li>`,
  'owner': `<span class="owner"></span>`,
  'more': `<details class="card-more"><summary><span class="more-open">More</span><span class="more-close">Less</span></summary><dl></dl></details>`,
  'suggestion': `<div class="suggestion"><span class="ic" data-icon=""></span><span class="suggestion-main"><b data-slot="title"></b> · <span data-slot="module"></span></span><button class="btn btn-small" type="button" data-action="add-suggestion">Add</button></div>`,
  'flight': `<article class="sdk-card-banded card pass"><header class="sdk-card-head"><div class="sdk-card-main"><span class="sdk-card-icon badge"><span class="ic" data-icon="plane"></span></span><h3 class="sdk-card-title" data-slot="title"></h3><span class="sdk-card-sub sdk-tint-text kicker">Flight</span></div><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="move-menu" aria-label="Menu"><span class="ic" data-icon="ellipsis-vertical"></span></button></header><div class="sdk-card-body"><div class="pass-main"><div class="pass-route"><div class="end"><span class="side">Departs</span><b class="iata" data-slot="fromCode"></b><span class="city" data-slot="from"></span><span class="t" data-slot="time"></span></div><div class="path"><span class="line"></span><span class="ic" data-icon="plane"></span><span class="dur" data-slot="duration"></span></div><div class="end to"><span class="side">Arrives</span><b class="iata" data-slot="toCode"></b><span class="city" data-slot="to"></span><span class="t" data-slot="arrival"></span></div></div></div><div class="stub"><div data-slot="seat-wrap"><small>Seat</small><b data-slot="seat"></b></div><div data-slot="gate-wrap"><small>Gate</small><b data-slot="gate"></b></div><div data-slot="class-wrap"><small>Class</small><b data-slot="travelClass"></b></div><span class="bars"></span></div></div></article>`,
  'transit': `<article class="sdk-card-banded card transit"><header class="sdk-card-head"><div class="sdk-card-main"><span class="sdk-card-icon badge"><span class="ic" data-icon=""></span></span><h3 class="sdk-card-title" data-slot="title"></h3><span class="sdk-card-sub sdk-tint-text kicker" data-slot="kicker"></span></div><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="move-menu" aria-label="Menu"><span class="ic" data-icon="ellipsis-vertical"></span></button></header><div class="sdk-card-body"><div class="go"><span class="tm" data-slot="time"></span><span class="ic" data-icon="arrow-right"></span><span data-slot="to"></span><span class="sdk-chip-tag mono" data-tone="custom" data-slot="confirm"></span></div></div></article>`,
  'activity': `<article class="sdk-card-banded card act"><header class="sdk-card-head"><div class="sdk-card-main"><span class="sdk-card-icon badge"><span class="ic" data-icon=""></span></span><h3 class="sdk-card-title" data-slot="title"></h3><span class="sdk-card-sub sdk-tint-text kicker" data-slot="kicker"></span></div><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="move-menu" aria-label="Menu"><span class="ic" data-icon="ellipsis-vertical"></span></button></header><div class="sdk-card-body"><p data-slot="address"></p><div class="chips2"><span class="sdk-chip-tag" data-tone="custom" data-slot="minutes"></span><span class="sdk-chip-tag" data-tone="custom" data-slot="admissionCount"></span><span class="sdk-chip-tag mono" data-tone="custom" data-slot="confirm"></span><span class="owners" data-slot="owners"></span></div></div></article>`,
  'meal': `<article class="sdk-card-banded card meal"><header class="sdk-card-head"><div class="sdk-card-main"><span class="sdk-card-icon badge"><span class="ic" data-icon=""></span></span><h3 class="sdk-card-title" data-slot="title"></h3><span class="sdk-card-sub sdk-tint-text kicker" data-slot="kicker"></span></div><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="move-menu" aria-label="Menu"><span class="ic" data-icon="ellipsis-vertical"></span></button></header><div class="sdk-card-body"><div class="main"><p data-slot="address"></p><div class="chips2"><span class="sdk-chip-tag" data-tone="custom" data-slot="partySize"></span><span class="sdk-chip-tag" data-tone="custom" data-slot="reservationName"></span><span class="owners" data-slot="owners"></span></div></div><div class="side"><b data-slot="time"></b><small data-slot="minutes"></small></div></div></article>`,
};

const cssUrl = (name) => new URL(name, import.meta.url);
// travel.js's scope rule for a module in the page: :root blocks dropped, html and body mean the container.
const scopeCss = (text) => text.replace(/:root\s*\{[^}]*\}/g, '').replace(/(^|[\s,}])(html|body)(?=[\s,{.:[])/g, '$1:host');
const sheets = (async () => {
  const get = async (u) => { const r = await fetch(u); if (!r.ok) throw new Error(`${u} ${r.status}`); return r.text(); };
  const [host, system, own] = await Promise.all([get('/sdk/host.css'), get('/sdk/system.css'), get(cssUrl('prototype.css'))]);
  const files = (((window.DS_SOURCES || {}).modules || {}).travel || {}).files || [];
  const module = files.filter((f) => f.page).map((f) => f.text).join('\n'); // the lib's, then the page's, as server/module-build.js joins them
  return `${scopeCss(host)}\n${scopeCss(system)}\n${scopeCss(module)}\n${own}`;
})();

const clone = (id) => {
  const t = D.createElement('template');
  t.innerHTML = TEMPLATES[id];
  const el = t.content.firstElementChild;
  for (const w of el.querySelectorAll('[data-word="module"]')) w.textContent = 'modules'; // host.util.fillWords
  return el;
};
const slot = (el, name) => el.querySelector(`[data-slot="${name}"]`);
const hide = (node, yes) => { if (node) node.hidden = Boolean(yes); };
function fill(el, values) {
  for (const [name, v] of Object.entries(values)) {
    const node = slot(el, name);
    if (!node) continue;
    if (v === null || v === undefined || v === '') { node.hidden = true; continue; }
    node.hidden = false;
    node.textContent = String(v);
  }
}
function put(el, values) {
  fill(el, values);
  for (const w of el.querySelectorAll('[data-slot$="-wrap"]')) {
    const inner = slot(el, w.dataset.slot.replace(/-wrap$/, '') === 'class' ? 'travelClass' : w.dataset.slot.replace(/-wrap$/, ''));
    w.hidden = !inner || inner.hidden;
  }
}
const svgs = () => (window.DS_SOURCES || {}).svgs || {};
const hydrate = (scope) => { for (const el of scope.querySelectorAll('[data-icon]')) if (el.dataset.icon && svgs()[el.dataset.icon]) el.innerHTML = svgs()[el.dataset.icon]; };

// What the day holds (a day in Porto: the second morning of a trip).
const ENTRIES = [
  { id: 'a1', type: 'flight', kind: 'journey', icon: 'plane', time: '7:10 AM', after: '→ 8:05 AM', shape: 'flight',
    values: { title: 'TAP Air Portugal TP 1932', fromCode: 'LIS', toCode: 'OPO', from: 'Lisbon', to: 'Porto', time: '7:10 AM', arrival: '8:05 AM', duration: '55 min', seat: '14A', gate: 'B22', travelClass: 'Economy' },
    more: [['Booking', 'TP7K2Q'], ['Terminal', '1'], ['Cost', '€84.00 · paid by Mia Alvarez']] },
  { id: 'a2', type: 'car', kind: 'journey', icon: 'car', time: '8:45 AM', after: '', shape: 'transit',
    values: { kicker: 'Rental car · Europcar', title: 'Pick up the rental car', time: '8:45 AM', to: 'Porto airport, desk 3', confirm: 'EC-55812' },
    more: [['Cost', '€61.00 · paid by Sam Okafor']] },
  { id: 'a3', type: 'sight', kind: 'stop', icon: 'monument', time: '10:00 AM', after: '1 h\n– 11:00 AM', shape: 'activity', open: true,
    values: { kicker: 'Sight', title: 'Livraria Lello', address: 'R. das Carmelitas 144, Porto', minutes: '1 h', admissionCount: '2 tickets', confirm: 'LL-2041' },
    owners: ['M', 'S'],
    more: [['Note', '<p>Tickets are on Mia’s phone. Arrive 15 minutes early.</p><p>Ask for the audio guide at the door.</p>', true], ['Cost', '€10.00 · paid by Mia Alvarez']] },
  { id: 'a4', type: 'restaurant', kind: 'stop', icon: 'utensils', time: '1:00 PM', after: '1 h 30 min\n– 2:30 PM', shape: 'meal',
    values: { kicker: 'Restaurant', title: 'Lunch at Cantina 32', address: 'R. das Aldas 32, Porto', partySize: 'For 4 people', reservationName: 'under Alvarez', time: '1:00 PM – 2:30 PM', minutes: '1 h 30 min' },
    owners: ['M', 'S'],
    more: [['Booking', 'C32-0881']] },
];
const SUGGESTIONS = [
  { icon: 'calendar', title: 'Fado night at Casa da Música', module: 'Calendar' },
  { icon: 'list-check', title: 'Charge the camera batteries', module: 'To-do' },
];

function buildCard(e) {
  const el = clone(e.shape);
  const badge = el.querySelector('.badge [data-icon]');
  if (badge && !badge.dataset.icon) badge.dataset.icon = e.icon;
  put(el, e.values);
  const owners = slot(el, 'owners');
  if (owners) { owners.textContent = ''; hide(owners, !e.owners); for (const k of e.owners || []) { const o = clone('owner'); o.textContent = k; owners.append(o); } }
  if (e.more && e.more.length) {
    const more = clone('more');
    more.open = Boolean(e.open);
    const dl = more.querySelector('dl');
    for (const [label, value, markup] of e.more) {
      const dt = D.createElement('dt'); dt.textContent = label;
      const dd = D.createElement('dd');
      if (markup) { dd.className = 'note-text'; dd.innerHTML = value; } else dd.textContent = value;
      dl.append(dt, dd);
    }
    el.append(more);
  }
  for (const box of [...el.querySelectorAll('.chips2'), ...el.querySelectorAll('.sdk-card-body > .main'), el.querySelector(':scope > .sdk-card-body')]) if (box) hide(box, ![...box.children].some((k) => !k.hidden));
  return el;
}
function buildRow(e) {
  const row = clone('row');
  row.dataset.id = e.id;
  row.dataset.kind = e.kind;
  row.dataset.type = e.type;
  fill(row, { time: e.time, sub: e.after });
  row.querySelector('.slot').append(buildCard(e));
  return row;
}
function buildDay() {
  const el = clone('day');
  el.id = 'day-2026-11-02';
  el.classList.add('in-phase', 'ph-orange');
  const head = clone('day-head');
  fill(head, { daynum: '2', daymonth: 'Mon · Nov', position: 'Day 3 of 4', summary: '7:10 AM – 1:00 PM · 4 stops' });
  const labels = head.querySelector('.sdk-day-labels');
  const tag = D.createElement('span');
  tag.className = 'sdk-chip-tag';
  tag.dataset.tone = 'custom';
  tag.textContent = 'Trip';
  labels.prepend(tag);
  hide(labels, false);
  el.prepend(head);
  const list = el.querySelector('.timeline');
  for (const e of ENTRIES) list.append(buildRow(e));
  const box = el.querySelector('.suggestions');
  hide(box, false);
  for (const c of SUGGESTIONS) {
    const s = clone('suggestion');
    s.querySelector('[data-icon]').dataset.icon = c.icon;
    fill(s, { title: c.title, module: c.module });
    box.querySelector('.suggestions-list').append(s);
  }
  return el;
}

// ---- the contrast of the icon on the circle (Icon: Circle) ----
// The circle is the kind's colour, solid; its icon is whichever of the theme's two ends reads better on it: the page colour or
// the text colour (the lightest and darkest the theme has, in either mode). Measured with the WCAG ratio on the colours the browser resolved.
const probe = D.createElement('canvas').getContext('2d', { willReadFrequently: true });
const rgbOf = (css) => { probe.clearRect(0, 0, 1, 1); probe.fillStyle = '#000'; probe.fillStyle = css; probe.fillRect(0, 0, 1, 1); return [...probe.getImageData(0, 0, 1, 1).data].slice(0, 3); };
const lum = ([r, g, b]) => { const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

// The Planner, drawn into `host` (a div): the shadow root, the Planner's page inside it. `set` takes the page's state; `measure` the
// circle's ink (call it again when the theme's stylesheet arrives). `readings` is what was measured, one per kind.
export function createPlanner(host) {
  const root = host.attachShadow({ mode: 'open' });
  const style = D.createElement('style');
  const app = D.createElement('div');
  app.id = 'app';
  app.className = 'app sdk-slot';
  const body = D.createElement('main');
  body.id = 'body';
  body.className = 'body';
  const days = D.createElement('div');
  days.className = 'days';
  days.append(buildDay());
  body.append(days);
  app.append(body);
  root.append(style, app);
  hydrate(root);
  const api = { readings: [], el: app, root };
  // The pane's width, as travel.js does: .narrow under 720 and .tiny under 480.
  const fit = () => { const w = host.clientWidth; if (w) { app.classList.toggle('narrow', w < 720); app.classList.toggle('tiny', w < 480); } };
  new ResizeObserver(fit).observe(host);
  sheets.then((text) => { style.textContent = text; fit(); api.measure(); }, (err) => { app.textContent = `The Planner's styles did not load: ${err.message}`; });

  // The head's text column: stacked puts the kind above the title (the kind first); today leaves the head as the Planner draws it.
  function head(stacked) {
    for (const main of root.querySelectorAll('.card > .sdk-card-head > .sdk-card-main')) {
      const text = main.querySelector(':scope > .pp-pcard-text');
      if (stacked && !text) {
        const t = D.createElement('span');
        t.className = 'pp-pcard-text';
        t.append(main.querySelector(':scope > .kicker'), main.querySelector(':scope > .sdk-card-title'));
        main.append(t);
      } else if (!stacked && text) {
        main.append(text.querySelector('.sdk-card-title'), text.querySelector('.kicker'));
        text.remove();
      }
    }
  }
  api.set = (s) => {
    app.dataset.ppHead = s.head;
    app.dataset.ppIcon = s.icon;
    app.dataset.ppMode = s.mode;
    head(s.head === 'stacked');
    api.measure();
  };
  api.measure = () => {
    api.readings = [];
    const circle = app.dataset.ppIcon === 'circle';
    const ink = (name) => { const p = D.createElement('i'); p.style.color = `var(${name})`; app.append(p); const c = getComputedStyle(p).color; p.remove(); return rgbOf(c); };
    const page = ink('--surface-page');
    const text = ink('--text-primary');
    for (const row of root.querySelectorAll('.row.entry')) {
      const card = row.querySelector('.card');
      const icon = card && card.querySelector('.sdk-card-icon');
      if (!icon) continue;
      if (!circle) { delete card.dataset.ink; continue; }
      const fillRgb = rgbOf(getComputedStyle(icon).backgroundColor);
      const a = ratio(fillRgb, page);
      const b = ratio(fillRgb, text);
      card.dataset.ink = a >= b ? 'page' : 'text';
      api.readings.push({ kind: row.dataset.type, fill: `rgb(${fillRgb.join(' ')})`, page: Math.round(a * 100) / 100, text: Math.round(b * 100) / 100, ink: card.dataset.ink });
    }
    window.ppInk = api.readings;
  };
  return api;
}
