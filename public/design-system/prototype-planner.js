// The Prototype's Planner: the Planner's own page, every part of it, drawn from the Planner's own pieces (Thomas, 2026-10-30; nothing here ships).
//  - The markup is modules/travel/src/travel.html's templates, copied character for character (TEMPLATES below, each under its id there
//    without the "tpl-" and the "card-": day is tpl-day2, flight is tpl-card-flight ...), and filled the way modules/travel/src/travel.js
//    fills them (buildDay, buildEntry, buildCard, buildPhaseMarker, renderStrip, renderDecisions, renderBookings, buildUndated): the same
//    slots, the same hide rules, the same order down the page (the strip, the unscheduled, then each day with its joint and its phase markers).
//    Confirm the copy with a script that reads travel.html and this block and compares them.
//  - The styles are the module's own: its stylesheets, read from window.DS_SOURCES (sources.js, written by
//    `node tools/design-system-snapshot.mjs --sources`; run it again after a change to modules/travel/src/*.css), then the shared
//    host.css and system.css. Like the product, the page lives in a shadow root, so the page's classes (.row, .slot ...) cannot reach it.
//  - What is new here is only the sample (a week in Lisbon, with phases), the views' switch, the jump list and its flash (prototype.css, .pp-flash).
// The icons are the SVGs the product draws (DS_SOURCES.svgs). The words are made up. Colours of the markers are theme tokens here (the
// product sets them from the Planner's marker settings).
const D = document;
const TEMPLATES = {
  'daychip': `<button class="sdk-daychip" type="button" data-action="goto-day"><span data-slot="weekday"></span><b data-slot="day"></b></button>`,
  'day-empty-add': `<li class="day-empty-slot"><button class="sdk-day-empty" type="button" data-action="day-menu" aria-haspopup="menu"></button></li>`,
  'owner': `<span class="owner"></span>`,
  'suggestion': `<div class="suggestion"><span class="ic" data-icon=""></span><span class="suggestion-main"><b data-slot="title"></b> · <span data-slot="module"></span></span><button class="btn btn-small" type="button" data-action="add-suggestion">Add</button></div>`,
  'decisions': `
  <div class="sdk-group-head" data-slot="polls-title">Polls to vote on</div><ul class="decisions" data-slot="polls"></ul>
  <div class="sdk-group-head" data-slot="tasks-title">Tasks due before the trip</div><ul class="decisions" data-slot="tasks"></ul>
`,
  'decision': `<li class="sdk-row decision"><span class="ic" data-icon=""></span><div class="decision-main"><div class="decision-title" data-slot="title"></div><div class="decision-sub" data-slot="sub"></div><span class="code" data-slot="code"></span></div><button class="btn btn-small" type="button" data-action="open"></button></li>`,
  'undated': `<section class="undated" id="undated"><h2>Unscheduled</h2></section>`,
  'undated-group': `<div class="undated-group"><h3 data-slot="label"></h3><ul class="decisions"></ul></div>`,
  'day': `<section class="sdk-card sdk-day"><ol class="timeline"></ol><div class="suggestions" hidden><div class="suggestions-title">Other <span data-word="module" data-word-form="many"></span> have</div><div class="suggestions-list"></div></div></section>`,
  'day-head': `<div class="sdk-day-head"><div class="sdk-day-date"><b data-slot="daynum"></b><span data-slot="daymonth"></span></div><div class="sdk-day-main"><h2 class="sdk-card-title" data-slot="position"></h2><p class="sdk-card-sub" data-slot="summary"></p><div class="sdk-day-labels" hidden></div></div><div class="sdk-day-actions"><button class="btn btn-small day-add sdk-day-add" type="button" data-action="day-menu" aria-haspopup="menu" aria-label="Add to this day" title="Add to this day"><span class="ic" data-icon="plus"></span> <span class="sdk-day-add-word">Add</span></button><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="day-more" aria-haspopup="menu" aria-label="More for this day" data-tip="More for this day"><span class="ic" data-icon="ellipsis-vertical"></span></button></div></div>`,
  'block': `<article class="sdk-row sdk-mk-row block"><span class="sdk-card-icon"><span class="ic" data-icon=""></span></span><span class="sdk-row-main"><span class="sdk-row-title" data-slot="title"></span><span class="sdk-row-sub" data-slot="body"></span></span><span class="sdk-row-meta sdk-mk-len" data-slot="minutes"></span><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="move-menu" aria-label="Menu"><span class="ic" data-icon="ellipsis-vertical"></span></button></article>`,
  'day-tag': `<button class="sdk-mk-tag" type="button" data-action="move-menu" aria-haspopup="menu"><span class="ic" data-icon=""></span><span class="sdk-mk-label" data-slot="title"></span></button>`,
  'more': `<details class="card-more"><summary><span class="more-open">More</span><span class="more-close">Less</span></summary><dl></dl></details>`,
  'row-marker': `<li class="row marker"><div class="when"><b data-slot="time"></b></div><div class="rail"><span class="dot"></span></div><div class="slot"><div class="sdk-mk-line"><span class="sdk-mk-ic"><span class="ic" data-icon=""></span></span><span class="sdk-mk-when mk-date" data-slot="mdate"></span><span class="sdk-mk-label" data-slot="title"></span><span class="sdk-mk-note" data-slot="sub"></span></div></div></li>`,
  'row-lane': `<li class="row entry marker lane" data-kind="lane"><div class="when"><b data-slot="time"></b></div><div class="rail"><span class="dot"></span></div><div class="slot"><div class="sdk-mk-line"><span class="sdk-mk-ic"><span class="ic" data-icon=""></span></span><span class="sdk-mk-label" data-slot="title"></span><span class="sdk-mk-note" data-slot="body"></span></div><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="move-menu" aria-label="Menu"><span class="ic" data-icon="ellipsis-vertical"></span></button></div></li>`,
  'joint': `<div class="joint"><button class="jointadd" type="button" data-action="gap-add" aria-haspopup="menu" aria-label="Add a marker here" data-tip="Add a marker here"><span class="ic" data-icon="plus"></span></button></div>`,
  'gap': `<div class="gap sdk-daygap"><span class="sdk-gapcount" data-slot="count"></span><span data-slot="word"></span><button class="gapadd" type="button" data-action="gap-add" aria-haspopup="menu" aria-label="Add something between these days"><span class="ic" data-icon="plus"></span></button></div>`,
  'dayedge': `<div class="dayedge"><button class="btn" type="button" data-action="edge-open"><span class="ic" data-icon="plus"></span> <span data-slot="label"></span></button><form class="edge-form" hidden><label>Add <input type="number" name="count" min="1" max="30" value="1" inputmode="numeric" aria-label="How many days"> <span data-slot="unit">days</span></label><button class="btn btn-primary" type="submit">Add</button><button class="btn" type="button" data-action="edge-cancel">Cancel</button></form></div>`,
  'row': `<li class="row entry"><div class="when"><b data-slot="time"></b><small data-slot="sub"></small></div><div class="rail"><span class="dot"></span></div><div class="slot"></div></li>`,
  'leg-row': `<li class="row leg-row"><div class="when"></div><div class="rail"></div><div class="slot"><button class="leg" type="button" data-action="edit-leg"><span class="ic" data-icon=""></span><span data-slot="minutes"></span><span class="dist" data-slot="dist"></span></button></div></li>`,
  'flight': `<article class="sdk-card-banded card pass"><header class="sdk-card-head"><div class="sdk-card-main"><span class="sdk-card-icon badge"><span class="ic" data-icon="plane"></span></span><h3 class="sdk-card-title" data-slot="title"></h3><span class="sdk-card-sub sdk-tint-text kicker">Flight</span></div><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="move-menu" aria-label="Menu"><span class="ic" data-icon="ellipsis-vertical"></span></button></header><div class="sdk-card-body"><div class="pass-main"><div class="pass-route"><div class="end"><span class="side">Departs</span><b class="iata" data-slot="fromCode"></b><span class="city" data-slot="from"></span><span class="t" data-slot="time"></span></div><div class="path"><span class="line"></span><span class="ic" data-icon="plane"></span><span class="dur" data-slot="duration"></span></div><div class="end to"><span class="side">Arrives</span><b class="iata" data-slot="toCode"></b><span class="city" data-slot="to"></span><span class="t" data-slot="arrival"></span></div></div></div><div class="stub"><div data-slot="seat-wrap"><small>Seat</small><b data-slot="seat"></b></div><div data-slot="gate-wrap"><small>Gate</small><b data-slot="gate"></b></div><div data-slot="class-wrap"><small>Class</small><b data-slot="travelClass"></b></div><span class="bars"></span></div></div></article>`,
  'transit': `<article class="sdk-card-banded card transit"><header class="sdk-card-head"><div class="sdk-card-main"><span class="sdk-card-icon badge"><span class="ic" data-icon=""></span></span><h3 class="sdk-card-title" data-slot="title"></h3><span class="sdk-card-sub sdk-tint-text kicker" data-slot="kicker"></span></div><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="move-menu" aria-label="Menu"><span class="ic" data-icon="ellipsis-vertical"></span></button></header><div class="sdk-card-body"><div class="go"><span class="tm" data-slot="time"></span><span class="ic" data-icon="arrow-right"></span><span data-slot="to"></span><span class="sdk-chip-tag mono" data-tone="custom" data-slot="confirm"></span></div></div></article>`,
  'hotel': `<article class="sdk-card-banded card stay"><header class="sdk-card-head"><div class="sdk-card-main"><span class="sdk-card-icon badge"><span class="ic" data-icon="bed"></span></span><h3 class="sdk-card-title" data-slot="title"></h3><span class="sdk-card-sub sdk-tint-text kicker" data-slot="kicker">Hotel</span></div><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="move-menu" aria-label="Menu"><span class="ic" data-icon="ellipsis-vertical"></span></button></header><div class="sdk-card-body"><p data-slot="address"></p><div class="ins"><div><small>Check in</small><b data-slot="checkin"></b></div><span class="sep"><span class="nights" data-slot="nights"></span></span><div><small>Check out</small><b data-slot="checkout"></b></div></div><div class="chips2"><span class="sdk-chip-tag" data-tone="custom" data-slot="roomType"></span><span class="sdk-chip-tag" data-tone="custom" data-slot="guests"></span><span class="sdk-chip-tag mono" data-tone="custom" data-slot="confirm"></span><span class="owners" data-slot="owners"></span></div></div></article>`,
  'hotel-out': `<article class="sdk-card-banded card stay out"><header class="sdk-card-head"><div class="sdk-card-main"><span class="sdk-card-icon badge"><span class="ic" data-icon="door-open"></span></span><h3 class="sdk-card-title" data-slot="title"></h3><span class="sdk-card-sub sdk-tint-text kicker">Check out</span></div><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="move-menu" aria-label="Menu"><span class="ic" data-icon="ellipsis-vertical"></span></button></header><div class="sdk-card-body"><p data-slot="address"></p><div class="side"><b data-slot="time"></b><small data-slot="nights"></small></div></div></article>`,
  'hotel-mid': `<article class="sdk-row card stay mid"><span class="sdk-card-icon badge"><span class="ic" data-icon="bed"></span></span><div class="sdk-row-main"><h3 class="sdk-row-title" data-slot="title"></h3></div><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="move-menu" aria-label="Menu"><span class="ic" data-icon="ellipsis-vertical"></span></button></article>`,
  'meal': `<article class="sdk-card-banded card meal"><header class="sdk-card-head"><div class="sdk-card-main"><span class="sdk-card-icon badge"><span class="ic" data-icon=""></span></span><h3 class="sdk-card-title" data-slot="title"></h3><span class="sdk-card-sub sdk-tint-text kicker" data-slot="kicker"></span></div><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="move-menu" aria-label="Menu"><span class="ic" data-icon="ellipsis-vertical"></span></button></header><div class="sdk-card-body"><div class="main"><p data-slot="address"></p><div class="chips2"><span class="sdk-chip-tag" data-tone="custom" data-slot="partySize"></span><span class="sdk-chip-tag" data-tone="custom" data-slot="reservationName"></span><span class="owners" data-slot="owners"></span></div></div><div class="side"><b data-slot="time"></b><small data-slot="minutes"></small></div></div></article>`,
  'activity': `<article class="sdk-card-banded card act"><header class="sdk-card-head"><div class="sdk-card-main"><span class="sdk-card-icon badge"><span class="ic" data-icon=""></span></span><h3 class="sdk-card-title" data-slot="title"></h3><span class="sdk-card-sub sdk-tint-text kicker" data-slot="kicker"></span></div><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="move-menu" aria-label="Menu"><span class="ic" data-icon="ellipsis-vertical"></span></button></header><div class="sdk-card-body"><p data-slot="address"></p><div class="chips2"><span class="sdk-chip-tag" data-tone="custom" data-slot="minutes"></span><span class="sdk-chip-tag" data-tone="custom" data-slot="admissionCount"></span><span class="sdk-chip-tag mono" data-tone="custom" data-slot="confirm"></span><span class="owners" data-slot="owners"></span></div></div></article>`,
  'note': `<article class="sdk-card-banded card note"><header class="sdk-card-head"><div class="sdk-card-main"><span class="sdk-card-icon badge"><span class="ic" data-icon="note-sticky"></span></span><h3 class="sdk-card-title" data-slot="title"></h3><span class="sdk-card-sub sdk-tint-text kicker">Note</span></div><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="move-menu" aria-label="Menu"><span class="ic" data-icon="ellipsis-vertical"></span></button></header><div class="sdk-card-body"><div class="note-body" data-slot="body"></div></div></article>`,
  'link': `<article class="sdk-card-banded card linkcard"><header class="sdk-card-head"><div class="sdk-card-main"><span class="sdk-card-icon src"><span class="ic" data-icon=""></span></span><h3 class="sdk-card-title" data-slot="title"></h3><span class="sdk-card-sub">from <span data-slot="module"></span></span></div><button class="open-link sdk-icon-btn btn-quiet btn-small" type="button" data-action="open" data-tip="Open it where it lives" aria-label="Open it where it lives"><span class="ic" data-icon="arrow-up-right-from-square"></span></button><button class="menu-btn sdk-icon-btn btn-quiet btn-small" type="button" data-action="move-menu" aria-label="Menu"><span class="ic" data-icon="ellipsis-vertical"></span></button></header><div class="sdk-card-body"><p data-slot="sub"></p><p class="linkstate" data-slot="state" hidden></p><button class="btn btn-small" type="button" data-action="remove-link" hidden><span class="ic" data-icon="trash"></span> Remove from plan</button></div></article>`,
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
// A template of more than one top-level part (tpl-decisions: a group head, its list, another group head, its list), as travel.js's parts().
const parts = (id) => { const t = D.createElement('template'); t.innerHTML = TEMPLATES[id]; return [...t.content.children]; };
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
const setIcon = (node, name) => { if (node) { node.dataset.icon = name || ''; node.textContent = ''; } };

// ---- dates ----
const parseYmd = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const dayShort = (d) => parseYmd(d).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
const TODAY = '2026-10-26'; // a fixed day, so the sample reads the same whenever it is opened

// ---- the sample: a week in Lisbon, with phases (Planning, Booking, Buffer, Pre-trip, Trip, Post-trip) ----
const BANDS = [
  { id: 'planning', label: 'Planning', tint: 'blue', start: '2026-08-01', end: '2026-08-31', dated: true },
  { id: 'booking', label: 'Booking', tint: 'green', start: '2026-09-01', end: '2026-10-20', dated: true },
  { id: 'buffer', label: 'Buffer', tint: 'teal', start: '2026-10-21', end: '2026-10-22', dated: true },
  { id: 'pre-trip', label: 'Pre-trip', tint: 'purple', start: '2026-10-23', end: '2026-10-24', dated: true },
  { id: 'trip', label: 'Trip', tint: 'orange', start: '2026-10-25', end: '2026-10-29', dated: true, main: true },
  { id: 'post-trip', label: 'Post-trip', tint: 'pink', start: '2026-10-30', end: '2026-11-02', dated: true },
];
const DAYS = ['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27', '2026-10-28', '2026-10-29', '2026-10-30'];
const MARKERS = {
  'buffer': { label: 'Buffer', icon: 'hourglass-half', color: 'var(--text-muted)' },
  'meet-up': { label: 'Meet-up', icon: 'users', color: 'var(--tint-pink)' },
  'travel-day': { label: 'Travel day', icon: 'suitcase-rolling', color: 'var(--tint-blue)' },
  'free-day': { label: 'Free day', icon: 'sun', color: 'var(--tint-gold)' },
};
const STAY_MORE = [['Cost', '€640.00 · paid by Mia Alvarez']];
const HOTEL = { id: 'h1', type: 'hotel', kind: 'stay', icon: 'bed', shape: 'hotel' };
const entry = {
  hotelIn: { ...HOTEL, time: '3:00 PM', after: 'check in',
    values: { kicker: 'Hotel', title: 'Hotel Avenida Palace', address: 'Praça dos Restauradores', nights: '4 nights', checkin: 'Sun, Oct 25 · 3:00 PM', checkout: 'Thu, Oct 29 · 11:00 AM', roomType: 'Double', guests: '2 people', confirm: 'HAP-4471' },
    owners: ['M', 'S'], more: STAY_MORE },
  hotelMid: { ...HOTEL, shape: 'hotel-mid', time: '', after: '', values: { title: 'Staying at Hotel Avenida Palace' } },
  hotelOut: { ...HOTEL, shape: 'hotel-out', icon: 'door-open', time: '11:00 AM', after: 'check out', values: { title: 'Hotel Avenida Palace', address: 'Praça dos Restauradores', time: '11:00 AM', nights: '4 nights' } },
};
const SIGHT = { kind: 'stop', type: 'sight', icon: 'monument', shape: 'activity' };
const MEAL = { kind: 'stop', type: 'restaurant', icon: 'utensils', shape: 'meal' };
// What each day holds, in the order the Planner draws it (stays that cover the day first, then the day's own things by time).
const SAMPLE = {
  '2026-10-21': { summary: '', entries: [] },
  '2026-10-22': { summary: '1 stop', entries: [
    { id: 'b1', kind: 'block', type: 'buffer', icon: 'hourglass-half', shape: 'block', time: '10:00 AM', after: '→ 11:00 AM\n(1 h)', values: { title: 'Buffer', minutes: '1 h', body: 'Slack before the airport run' } },
    { id: 'n1', kind: 'note', type: 'note', shape: 'note', time: '', after: '', values: { title: 'Packing' }, noteBody: '<p>Passports, chargers, two jackets.</p>' },
  ] },
  '2026-10-23': { summary: '5:00 PM · 1 stop', entries: [
    { id: 'l1', kind: 'link', type: 'link', icon: 'list-check', shape: 'link', time: '5:00 PM', after: '', values: { module: 'To-do', title: 'Print the museum tickets', sub: 'Due today · Mia' } },
  ] },
  '2026-10-24': { summary: '9:40 PM · 1 stop', entries: [
    { id: 'a1', type: 'flight', kind: 'journey', icon: 'plane', time: '9:40 PM', after: '→ 9:35 AM\nthe next day', shape: 'flight',
      values: { title: 'TAP Air Portugal TP 205', fromCode: 'JFK', toCode: 'LIS', from: 'New York', to: 'Lisbon', time: '9:40 PM', arrival: '9:35 AM the next day', duration: '6 h 55 min', seat: '14A', gate: 'B22', travelClass: 'Economy' },
      more: [['Booking', 'TP7K2Q'], ['Terminal', '1'], ['Cost', '€412.00 · paid by Mia Alvarez']] },
  ] },
  '2026-10-25': { summary: '11:30 AM – 8:00 PM · 3 stops', entries: [
    { ...SIGHT, id: 's1', time: '11:30 AM', after: '→ 1:00 PM\n(1 h 30 min)',
      values: { kicker: 'Sight', title: 'Mosteiro dos Jerónimos', address: 'Praça do Império, Lisbon', minutes: '1 h 30 min', admissionCount: '2 tickets', confirm: 'MJ-7731' }, owners: ['M', 'S'],
      more: [['Cost', '€20.00 · paid by Sam Okafor']] },
    entry.hotelIn,
    { ...MEAL, id: 'm1', time: '8:00 PM', after: '→ 9:30 PM\n(1 h 30 min)',
      values: { kicker: 'Restaurant', title: 'Dinner at Taberna da Rua', address: 'Rua da Rosa 24, Lisbon', partySize: 'For 3 people', reservationName: 'under Alvarez', time: '8:00 PM – 9:30 PM', minutes: '1 h 30 min' }, owners: ['M', 'S'] },
  ] },
  '2026-10-26': { summary: '9:30 AM – 9:00 PM · 4 stops', suggestions: [{ icon: 'list-check', title: 'Charge the camera batteries', module: 'To-do' }, { icon: 'calendar', title: 'Sintra day pass', module: 'Calendar' }], entries: [
    entry.hotelMid,
    { ...SIGHT, id: 's2', time: '9:30 AM', after: '→ 11:00 AM\n(1 h 30 min)', open: true,
      values: { kicker: 'Sight', title: 'Castelo de São Jorge', address: 'R. de Santa Cruz do Castelo, Lisbon', minutes: '1 h 30 min', admissionCount: '2 tickets', confirm: 'CSJ-2041' }, owners: ['M', 'S'],
      more: [['Note', '<p>Tickets are on Mia’s phone. Arrive 15 minutes early.</p><p>Take tram 28 up the hill.</p>', true], ['Cost', '€30.00 · paid by Mia Alvarez']] },
    { ...MEAL, id: 'm2', time: '12:30 PM', after: '→ 2:00 PM\n(1 h 30 min)', leg: { mode: 'walk', minutes: '12 min' },
      values: { kicker: 'Restaurant', title: 'Lunch at Time Out Market', address: 'Av. 24 de Julho 49, Lisbon', partySize: 'For 4 people', reservationName: 'under Alvarez', time: '12:30 PM – 2:00 PM', minutes: '1 h 30 min' }, owners: ['M', 'S'], more: [['Booking', 'TOM-0881']] },
    { id: 'b2', kind: 'block', type: 'meet-up', icon: 'users', shape: 'block', time: '6:30 PM', after: '', values: { title: 'Meet-up', body: 'In the hotel lobby' } },
    { id: 'l2', kind: 'link', type: 'link', icon: 'calendar', shape: 'link', time: '9:00 PM', after: '', values: { module: 'Calendar', title: 'Fado night at Casa da Música', sub: 'Mon, Oct 26 · 9:00 PM · Rua da Rosa 24' } },
  ] },
  '2026-10-27': { summary: '8:45 AM – 11:00 AM · 2 stops', suggestions: [{ icon: 'calendar', title: 'Pena Palace guided tour', module: 'Calendar' }], entries: [
    entry.hotelMid,
    { id: 'c1', type: 'car', kind: 'journey', icon: 'car', time: '8:45 AM', after: '', shape: 'transit',
      values: { kicker: 'Rental car · Europcar', title: 'Pick up the rental car', time: '8:45 AM', to: 'Lisbon airport, desk 3', confirm: 'EC-55812' }, more: [['Cost', '€61.00 · paid by Sam Okafor']] },
    { ...SIGHT, id: 's3', time: '11:00 AM', after: '→ 1:00 PM\n(2 h)', values: { kicker: 'Sight', title: 'Palácio da Pena, Sintra', address: 'Estrada da Pena, Sintra', minutes: '2 h', admissionCount: '3 tickets', confirm: 'PP-3350' }, owners: ['M'] },
  ] },
  '2026-10-28': { summary: '', tags: ['free-day'], entries: [entry.hotelMid] },
  '2026-10-29': { summary: '6:15 PM · 1 stop', entries: [
    entry.hotelOut,
    { id: 'a2', type: 'flight', kind: 'journey', icon: 'plane', time: '6:15 PM', after: '→ 9:20 PM', shape: 'flight',
      values: { title: 'TAP Air Portugal TP 206', fromCode: 'LIS', toCode: 'JFK', from: 'Lisbon', to: 'New York', time: '6:15 PM', arrival: '9:20 PM', duration: '8 h 5 min', seat: '15C', gate: 'A9', travelClass: 'Economy' },
      more: [['Booking', 'TP7K2Q'], ['Cost', 'Paid with the outbound']] },
  ] },
  '2026-10-30': { summary: '1 stop', entries: [
    { id: 'n2', kind: 'note', type: 'note', shape: 'note', time: '', after: '', values: { title: 'Share the photos' }, noteBody: '<p>Put them in the shared folder by Sunday.</p>' },
  ] },
};
// A marker between two days (the Planner's own "lane"): after which day, and which marker.
const LANES = { '2026-10-23': [{ id: 'k1', type: 'travel-day', body: 'Overnight flight' }] };
const UNDATED = { booking: [{ icon: 'train', title: 'Book the Sintra train' }], 'pre-trip': [{ icon: 'coins', title: 'Exchange some euros' }], trip: [{ icon: 'location-dot', title: 'Find a pharmacy near the hotel' }] };
const DECISIONS = [
  { group: 'Polls', icon: 'square-poll-vertical', title: 'Which day for the Sintra trip?', sub: 'Oct 27 · 3 of 4 have voted' },
  { group: 'Polls', icon: 'square-poll-vertical', title: 'Dinner on the last night', sub: 'Oct 28 · 1 of 4 has voted' },
  { group: 'Tasks', icon: 'list-check', title: 'Print the museum tickets', sub: 'Oct 23 5:00 PM · Mia' },
];
const BOOKINGS = [
  { group: 'Stays', icon: 'bed', title: 'Hotel Avenida Palace', sub: 'Sun, Oct 25 – Thu, Oct 29 · 4 nights · Praça dos Restauradores', code: 'HAP-4471' },
  { group: 'Journeys', icon: 'plane', title: 'TAP Air Portugal TP 205', sub: 'Sat, Oct 24 9:40 PM · Sun, Oct 25 · JFK ⇄ LIS', code: 'TP7K2Q' },
  { group: 'Journeys', icon: 'car', title: 'Pick up the rental car', sub: 'Tue, Oct 27 8:45 AM · Lisbon airport, desk 3', code: 'EC-55812' },
];
const OPEN_COUNT = DECISIONS.length;
const TRIP_DAYS = DAYS.filter((d) => d >= '2026-10-25' && d <= '2026-10-29');
const phaseOnDay = (day) => { const b = BANDS.find((x) => x.start <= day && (!x.end || x.end >= day)); return b ? { label: b.label, tint: b.tint, first: b.start === day } : null; };
const inTrip = (day) => TRIP_DAYS.includes(day);

// ---- the cards: buildEntry / buildCard (travel.js) ----
function buildCard(e) {
  const el = clone(e.shape);
  const badge = el.querySelector('.badge [data-icon]');
  if (badge && !badge.dataset.icon) setIcon(badge, e.icon);
  if (e.shape === 'block') {
    const type = MARKERS[e.type];
    el.dataset.type = e.type;
    setIcon(el.querySelector('.sdk-card-icon [data-icon]'), type.icon);
    el.style.setProperty('--marker', type.color);
  }
  if (e.shape === 'link') setIcon(el.querySelector('.src [data-icon]'), e.icon);
  put(el, e.values);
  if (e.shape === 'note') { const body = slot(el, 'body'); body.hidden = false; body.innerHTML = e.noteBody; }
  if (e.shape === 'link') hide(el.querySelector('[data-action="remove-link"]'), true);
  const owners = slot(el, 'owners');
  if (owners) { owners.textContent = ''; hide(owners, !e.owners); for (const k of e.owners || []) { const o = clone('owner'); o.textContent = k; owners.append(o); } }
  if (e.more && e.more.length && el.matches('.sdk-card-banded')) {
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
  row.dataset.type = e.kind === 'block' ? 'block' : e.type;
  fill(row, { time: e.time, sub: e.after });
  row.querySelector('.slot').append(buildCard(e));
  return row;
}
function buildLeg(e) {
  const row = clone('leg-row');
  row.dataset.id = e.id;
  const button = row.querySelector('.leg');
  button.dataset.mode = e.leg.mode;
  setIcon(button.querySelector('[data-icon]'), 'person-walking');
  fill(row, { minutes: e.leg.minutes, dist: '' });
  return row;
}

// ---- a day: buildDay ----
function buildDay(day, index) {
  const data = SAMPLE[day];
  const el = clone('day');
  el.id = `day-${day}`;
  el.dataset.day = day;
  el.dataset.index = String(index + 1);
  const entries = data.entries;
  const head = clone('day-head');
  const d = parseYmd(day);
  const n = TRIP_DAYS.indexOf(day) + 1;
  fill(head, { daynum: String(d.getDate()), daymonth: `${d.toLocaleDateString([], { weekday: 'short' })} · ${d.toLocaleDateString([], { month: 'short' })}`, position: n ? `Day ${n} of ${TRIP_DAYS.length}` : '', summary: data.summary });
  const tagBox = head.querySelector('.sdk-day-labels');
  for (const id of data.tags || []) {
    const type = MARKERS[id];
    const tag = clone('day-tag');
    tag.dataset.type = id;
    tag.style.setProperty('--marker', type.color);
    setIcon(tag.querySelector('[data-icon]'), type.icon);
    fill(tag, { title: type.label });
    tagBox.append(tag);
  }
  const ph = phaseOnDay(day);
  if (ph && ph.tint) {
    el.classList.add('in-phase', `ph-${ph.tint}`);
    const tag = D.createElement('span');
    tag.className = 'sdk-chip-tag';
    tag.dataset.tone = 'custom';
    tag.textContent = ph.label;
    tag.title = `${ph.label}${ph.first ? ' starts' : ''}`;
    tagBox.prepend(tag);
  }
  if (day === TODAY) {
    const now = D.createElement('span');
    now.className = 'sdk-chip-tag';
    now.dataset.tone = 'info';
    now.textContent = 'Today';
    tagBox.insertBefore(now, tagBox.querySelector('.sdk-mk-tag'));
  }
  hide(tagBox, !tagBox.children.length);
  el.prepend(head);
  const list = el.querySelector('.timeline');
  if (!entries.length) {
    const empty = clone('day-empty-add');
    const b = empty.querySelector('.sdk-day-empty');
    b.textContent = 'Nothing planned yet. Click to add.';
    b.title = `Add to ${dayShort(day)}`;
    list.append(empty);
  }
  entries.forEach((e, i) => {
    if (i && e.leg) list.append(buildLeg(e));
    list.append(buildRow(e));
  });
  if (!entries.length) el.classList.add('is-empty');
  const box = el.querySelector('.suggestions');
  const mine = data.suggestions || [];
  hide(box, !mine.length);
  for (const c of mine) {
    const s = clone('suggestion');
    setIcon(s.querySelector('[data-icon]'), c.icon);
    fill(s, { title: c.title, module: c.module });
    box.querySelector('.suggestions-list').append(s);
  }
  return el;
}

// ---- the line between the days: markers, phase bars, the joint, the badge for hidden days ----
function buildLane(item) {
  const type = MARKERS[item.type];
  const row = clone('row-lane');
  row.dataset.id = item.id;
  row.dataset.type = item.type;
  setIcon(row.querySelector('.sdk-mk-ic [data-icon]'), type.icon);
  fill(row, { title: type.label, body: item.body });
  row.querySelector('.sdk-mk-line').style.setProperty('--marker', type.color);
  return row;
}
// phaseJoints (travel.js): the phase boundaries, grouped by the joint they sit at; every start and end a marker of its own.
function phaseJoints(days, bands) {
  const out = new Map();
  const first = days[0];
  const last = days[days.length - 1];
  const back = (d) => { const t = parseYmd(d); return ymd(new Date(t.getFullYear(), t.getMonth(), t.getDate() - 1)); };
  const events = [];
  for (const b of bands) {
    events.push({ day: back(b.start), ends: [], starts: [b] });
    if (b.end) events.push({ day: b.end, ends: [b], starts: [] });
  }
  events.sort((x, y) => x.day.localeCompare(y.day) || y.ends.length - x.ends.length);
  for (const g of events) {
    const key = g.day < first ? '' : g.day >= last ? last : g.day;
    if (!out.has(key)) out.set(key, []);
    out.get(key).push(g);
  }
  return out;
}
function buildPhaseMarker(g) {
  const row = clone('row-marker');
  const names = [...g.ends.map((b) => `${b.label} ends`), ...g.starts.map((b) => `${b.label} starts`)];
  row.dataset.marker = 'phase';
  row.classList.add('phase');
  const lead = g.ends[0] || g.starts[0];
  row.classList.add(`ph-${lead.tint}`);
  const when = g.starts.length ? g.starts[0].start : g.day;
  const text = parseYmd(when).toLocaleDateString([], { weekday: 'short', day: 'numeric', month: 'short' });
  setIcon(row.querySelector('.sdk-mk-ic [data-icon]'), g.starts.length ? 'flag' : 'flag-checkered');
  fill(row, { time: text, mdate: text, title: names.join(' · '), sub: '' });
  return row;
}
function phaseList(groups, position) {
  if (!groups) return null;
  const list = D.createElement('ol');
  list.className = 'timeline ends';
  list.dataset.ends = position;
  list.append(...groups.map(buildPhaseMarker));
  return list;
}
function buildBetween(after) {
  const out = [];
  const mine = LANES[after] || [];
  if (mine.length) {
    const list = D.createElement('ol');
    list.className = 'timeline between';
    list.dataset.after = after;
    list.append(...mine.map(buildLane));
    out.push(list);
  }
  const joint = clone('joint');
  joint.dataset.after = after;
  out.push(joint);
  return out;
}
function buildGap(run) {
  const el = clone('gap');
  el.dataset.from = run[0];
  el.dataset.to = run[run.length - 1];
  fill(el, { count: String(run.length), word: run.length === 1 ? 'day between' : 'days between' });
  const count = slot(el, 'count');
  if (count) count.title = `${run.length} day${run.length === 1 ? '' : 's'} between`;
  return el;
}
function buildEdge() {
  const el = clone('dayedge');
  el.dataset.edge = 'after';
  fill(el, { label: 'Add days after' });
  return el;
}
const isEmpty = (day) => !SAMPLE[day].entries.length;
function renderDays(hiding) {
  const wrap = D.createElement('div');
  wrap.id = 'days';
  wrap.className = 'days';
  const joints = phaseJoints(DAYS, BANDS);
  const runs = new Map();
  if (hiding) {
    let run = null;
    for (const d of DAYS) { if (isEmpty(d)) { if (!run) { run = []; runs.set(d, run); } run.push(d); } else run = null; }
  }
  DAYS.forEach((day, i) => {
    const above = i === 0 ? phaseList(joints.get(''), 'before') : null;
    if (above) wrap.append(above);
    if (runs.has(day)) wrap.append(buildGap(runs.get(day)));
    if (i === 0) wrap.append(...buildBetween(''));
    wrap.append(buildDay(day, i));
    wrap.append(...buildBetween(day));
    const below = phaseList(joints.get(day), 'after');
    if (below) wrap.append(below);
  });
  wrap.append(buildEdge());
  return wrap;
}

// ---- the other parts of the Days view and the other views ----
function buildUndated() {
  const box = clone('undated');
  for (const p of BANDS) {
    const mine = UNDATED[p.id];
    if (!mine) continue;
    const group = clone('undated-group');
    fill(group, { label: p.label });
    const ul = group.querySelector('ul');
    for (const item of mine) listRow(ul, { icon: item.icon, title: item.title, button: 'Edit' });
    box.append(group);
  }
  return box;
}
// A row in the style of the Decisions rows (travel.js row()).
function listRow(list, { icon, title, sub, code, button }) {
  const r = clone('decision');
  setIcon(r.querySelector('[data-icon]'), icon);
  fill(r, { title, sub, code });
  const btn = r.querySelector('[data-action="open"]');
  if (button) { btn.textContent = button; btn.dataset.action = 'edit-item'; } else btn.remove();
  list.append(r);
}
function groups(items) {
  const out = [];
  const body = D.createDocumentFragment();
  for (const name of [...new Set(items.map((i) => i.group))]) {
    const [title, list] = parts('decisions').map((n) => { n.removeAttribute('data-slot'); return n; });
    title.textContent = name;
    list.replaceChildren();
    for (const i of items.filter((x) => x.group === name)) listRow(list, { icon: i.icon, title: i.title, sub: i.sub, code: i.code, button: 'Open' });
    body.append(title, list);
  }
  out.push(body);
  return out;
}

// ---- the whole page ----
export const PLANNER_VIEWS = [
  { id: 'days', label: 'Days', icon: 'calendar-days' },
  { id: 'decisions', label: `Decisions (${OPEN_COUNT} open)`, icon: 'scale-balanced' },
  { id: 'bookings', label: 'Bookings', icon: 'ticket' },
];
export const PLANNER_TITLE = 'Lisbon in autumn · Wed 21 – Fri 30 Oct 2026';
export const plannerStatus = (view) => ({
  days: 'Trip · day 2 of 5 · Day 2 of 5 · Mon, Oct 26 · 4 stops · 2 travellers',
  decisions: `Trip · day 2 of 5 · ${OPEN_COUNT} open`,
  bookings: 'Trip · day 2 of 5 · 3 of 3 booked',
})[view];
// The parts a person can jump to: a name, the view it is in, and what to scroll to.
export const PLANNER_PARTS = [
  { id: 'strip', label: 'Date strip', view: 'days', find: '#stripbar' },
  { id: 'phases', label: 'Phase markers', view: 'days', find: '.timeline.ends[data-ends="before"]' },
  { id: 'buffer', label: 'Buffer', view: 'days', find: '#day-2026-10-22' },
  { id: 'day', label: 'A day (today)', view: 'days', find: '#day-2026-10-26' },
  { id: 'hotel', label: 'Hotel stay', view: 'days', find: '#day-2026-10-25 .card.stay' },
  { id: 'travel', label: 'Travel day', view: 'days', find: '.row.marker.lane' },
  { id: 'empty', label: 'Empty day', view: 'days', find: '#day-2026-10-21' },
  { id: 'joint', label: 'Add between', view: 'days', find: '.joint[data-after="2026-10-26"]' },
  { id: 'linked', label: 'From Calendar', view: 'days', find: '.card.linkcard' },
  { id: 'undated', label: 'Unscheduled', view: 'days', find: '#undated' },
  { id: 'decisions', label: 'Decisions', view: 'decisions', find: '#body' },
  { id: 'bookings', label: 'Bookings', view: 'bookings', find: '#body' },
];

// The Planner, drawn into `host` (a div): the shadow root, the Planner's page inside it.
export function createPlanner(host) {
  const root = host.attachShadow({ mode: 'open' });
  const style = D.createElement('style');
  const app = D.createElement('div');
  app.id = 'app';
  app.className = 'app sdk-slot';
  app.innerHTML = '<div id="stripbar" class="stripbar"><button class="strip-arrow" type="button" data-action="strip-prev" data-tip="Earlier days" aria-label="Earlier days"><span class="ic" data-icon="chevron-left"></span></button><nav id="daystrip" class="daystrip" aria-label="Jump to a day"></nav><button class="strip-arrow" type="button" data-action="strip-next" data-tip="Later days" aria-label="Later days"><span class="ic" data-icon="chevron-right"></span></button></div><main id="body" class="body"></main>';
  root.append(style, app);
  const $ = (id) => root.getElementById(id);
  const api = { el: app, root, view: 'days', hideEmpty: false, current: DAYS[0] };

  function renderStrip() {
    const strip = $('daystrip');
    strip.replaceChildren();
    for (const day of DAYS) {
      const chip = clone('daychip');
      chip.dataset.day = day;
      chip.classList.toggle('is-empty', isEmpty(day));
      chip.classList.toggle('is-today', day === TODAY);
      const ph = phaseOnDay(day);
      if (ph && ph.tint) chip.title = ph.label;
      fill(chip, { weekday: parseYmd(day).toLocaleDateString([], { weekday: 'short' }), day: parseYmd(day).getDate() });
      const words = [parseYmd(day).toLocaleDateString([], { weekday: 'long', day: 'numeric', month: 'long' }), day === TODAY ? 'today' : '', inTrip(day) ? 'in the trip' : '', ph && ph.label ? ph.label : ''].filter(Boolean);
      chip.setAttribute('aria-label', words.join(', '));
      if (inTrip(day)) { const dot = D.createElement('span'); dot.className = 'sdk-daychip-dot'; dot.setAttribute('aria-hidden', 'true'); chip.append(dot); }
      strip.append(chip);
    }
  }
  function markCurrent(day) {
    if (day) api.current = day;
    for (const c of root.querySelectorAll('.sdk-daychip')) { if (c.dataset.day === day) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current'); }
    for (const d of root.querySelectorAll('.sdk-day[data-day]')) d.classList.toggle('is-current', Boolean(day) && d.dataset.day === day);
    const strip = $('daystrip');
    const chip = strip.querySelector('.sdk-daychip[aria-current="true"]');
    if (chip) {
      const left = chip.offsetLeft - strip.offsetLeft;
      if (left < strip.scrollLeft || left + chip.offsetWidth > strip.scrollLeft + strip.clientWidth) strip.scrollTo({ left: left - (strip.clientWidth - chip.offsetWidth) / 2 });
    }
  }
  function stripArrows() {
    const strip = $('daystrip');
    const prev = root.querySelector('[data-action="strip-prev"]');
    const next = root.querySelector('[data-action="strip-next"]');
    prev.disabled = strip.scrollLeft <= 1;
    next.disabled = strip.scrollLeft + strip.clientWidth >= strip.scrollWidth - 1;
  }
  function render() {
    const body = $('body');
    const top = body.scrollTop;
    $('stripbar').hidden = api.view !== 'days';
    if (api.view === 'days') {
      renderStrip();
      const hiding = api.hideEmpty && DAYS.some(isEmpty);
      app.classList.toggle('hide-empty', hiding);
      body.replaceChildren(buildUndated(), renderDays(hiding));
    } else if (api.view === 'decisions') {
      app.classList.remove('hide-empty');
      body.replaceChildren(...groups(DECISIONS));
    } else {
      app.classList.remove('hide-empty');
      body.replaceChildren(...groups(BOOKINGS));
    }
    hydrate(root);
    body.scrollTop = api.view === 'days' ? top : 0;
    if (api.view === 'days') { markCurrent(api.current); stripArrows(); }
  }
  api.setView = (id) => { if (PLANNER_VIEWS.some((v) => v.id === id) && id !== api.view) { api.view = id; render(); if (api.onView) api.onView(id); } };
  api.setHideEmpty = (on) => { api.hideEmpty = Boolean(on); if (api.view === 'days') render(); };
  api.jump = (id) => {
    const part = PLANNER_PARTS.find((p) => p.id === id);
    if (!part) return;
    api.setView(part.view);
    const target = root.querySelector(part.find);
    if (!target) return;
    const body = $('body');
    const at = target.closest('.sdk-day') || target; // a part inside a day scrolls to the day's top, under its sticky head
    if (part.find !== '#stripbar' && part.find !== '#body') body.scrollTo({ top: Math.max(0, at.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 8) });
    else body.scrollTo({ top: 0 });
    target.classList.add('pp-flash');
    setTimeout(() => target.classList.remove('pp-flash'), 1600);
  };

  app.addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-action]');
    if (!b) return;
    const strip = $('daystrip');
    if (b.dataset.action === 'strip-prev' || b.dataset.action === 'strip-next') strip.scrollBy({ left: (b.dataset.action === 'strip-next' ? 1 : -1) * Math.max(120, strip.clientWidth * 0.7) });
    else if (b.dataset.action === 'goto-day') {
      const target = $(`day-${b.dataset.day}`);
      if (target) { const body = $('body'); body.scrollTo({ top: target.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop }); markCurrent(b.dataset.day); }
    }
  });
  $('daystrip').addEventListener('scroll', stripArrows, { passive: true });
  new ResizeObserver(stripArrows).observe($('daystrip'));
  $('body').addEventListener('scroll', () => {
    if (api.view !== 'days') return;
    const days = [...root.querySelectorAll('.sdk-day[data-day]')].filter((d) => d.getClientRects().length);
    const top = $('body').getBoundingClientRect().top;
    const first = days.find((d) => d.getBoundingClientRect().bottom > top + 24);
    if (first) markCurrent(first.dataset.day);
  }, { passive: true });

  // The pane's width, as travel.js does: .narrow under 720 and .tiny under 480.
  const fit = () => { const w = host.clientWidth; if (w) { app.classList.toggle('narrow', w < 720); app.classList.toggle('tiny', w < 480); } };
  new ResizeObserver(fit).observe(host);
  render();
  sheets.then((text) => { style.textContent = text; fit(); stripArrows(); }, (err) => { app.textContent = `The Planner's styles did not load: ${err.message}`; });
  api.set = (s) => { app.dataset.ppMode = s.mode; };
  return api;
}

// The jump list: one button per part, under the section's note. It scrolls the Planner to that part (and changes the view if the part
// is in another one) and outlines it for a moment.
export function jumpList(planner) {
  const nav = D.createElement('nav');
  nav.className = 'pp-jump';
  nav.setAttribute('aria-label', 'Jump to a part of the Planner');
  const label = D.createElement('span');
  label.className = 'pp-jump-label';
  label.textContent = 'Jump to';
  nav.append(label);
  for (const p of PLANNER_PARTS) {
    const b = D.createElement('button');
    b.type = 'button';
    b.className = 'btn btn-small';
    b.textContent = p.label;
    b.addEventListener('click', () => planner.jump(p.id));
    nav.append(b);
  }
  return nav;
}
