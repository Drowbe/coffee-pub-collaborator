/* The Day cards and day chips family (proposed): the Planner's day card, its date block and head, the phase and Today labels, the day chip and the days-between count.
   Loaded by proposed.html through proposed-families.json, after proposed.js (the page engine); it registers one family through window.DS_PROPOSED.families.push
   and draws it with the rules in proposed-days.css. Nothing here is a style of the product: markup, words and tables only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules, from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // Layout of the example pages only (not a style of the product).
  const DY_CSS = `
.pm-dy-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; align-items: start; }
.pm-dy-cap { display: block; margin: 0 0 5px; color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-dy-cap.pm-top { margin-top: 14px; }
.pm-dy-note { margin: 6px 0 0; color: var(--text-dim); font-size: 12px; }
.pm-dy-states { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 14px 16px; }
.pm-dy-states > div { display: flex; flex-direction: column; gap: 5px; align-items: flex-start; }
.pm-dy-states > div > small { color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-dy-ct { border-collapse: collapse; width: 100%; font-size: 12px; }
.pm-dy-ct th, .pm-dy-ct td { padding: 4px 8px 4px 0; text-align: left; border-bottom: 1px solid var(--border); }
.pm-dy-ct th { color: var(--text-dim); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.pm-dy-pass { color: var(--ok); font-weight: 600; }
.pm-dy-fail { color: var(--danger); font-weight: 600; }
`;

  const PHASES = [['Planning', 'blue', 'clipboard-list'], ['Booking', 'teal', 'ticket'], ['Pre-trip', 'purple', 'suitcase'], ['Trip', 'orange', 'plane'], ['Post-trip', 'green', 'camera']];
  const phaseLabel = (p) => `<span class="sdk-status" data-tint="${p[1]}">${fa(p[2])}<span class="sdk-chip-label">${p[0]}</span></span>`;
  const todayLabel = () => `<span class="sdk-status" data-tone="info"><span class="sdk-chip-label">Today</span></span>`;
  const MORE = `<button type="button" class="sdk-icon-btn btn-small btn-quiet" aria-label="More" title="More">${fa('ellipsis-vertical')}</button>`;
  const row = (title, meta, o = {}) => `<div class="sdk-row"><span class="sdk-row-main"><span class="sdk-row-title">${title}</span>${o.sub ? `<span class="sdk-row-sub">${o.sub}</span>` : ''}</span><span class="sdk-row-meta">${meta}</span>${MORE}</div>`;

  // One day card. o: d (number), wd (weekday), title, sub, phase (an entry of PHASES), today, current, drop, count, rows (html), empty, extra (html after the labels).
  const dayCard = (o = {}) => {
    const cls = ['sdk-card', 'sdk-day', o.current ? 'is-current' : '', o.drop ? 'is-drop' : ''].filter(Boolean).join(' ');
    const labels = `${o.phase ? phaseLabel(o.phase) : ''}${o.today ? todayLabel() : ''}${o.extra || ''}`;
    return `<article class="${cls}"${o.current ? ' aria-current="true"' : ''} aria-label="${h(o.title)}, ${o.wd} ${o.d}">
      <div class="sdk-day-head">
        <div class="sdk-day-date"><b>${o.d}</b><span>${o.wd}</span></div>
        <div class="sdk-day-main"><h3 class="sdk-card-title">${o.title}</h3>${o.sub ? `<p class="sdk-card-sub">${o.sub}</p>` : ''}${labels ? `<div class="sdk-day-labels">${labels}</div>` : ''}</div>
        ${o.count != null ? `<span class="sdk-badge" aria-label="${o.count} planned" title="${o.count} planned">${o.count}</span>` : ''}
        <div class="sdk-day-actions"><button type="button" class="btn btn-small sdk-day-add" aria-label="Add to this day" title="Add to this day">${fa('plus')}<span class="sdk-day-add-word">Add</span></button>${MORE}</div>
      </div>
      ${o.empty ? `<button type="button" class="sdk-day-empty">Nothing planned yet. Click to add.</button>` : o.rows ? `<div class="sdk-card-list">${o.rows}</div>` : ''}
    </article>`;
  };
  const rows3 = () => row('Train to Lyon', '9:12', { sub: 'Platform 4' }) + row('Lunch at Café Marly', '12:30') + row('Louvre', '15:00');

  // One day chip. o: wd, d, cur, today, trip, empty, state, label.
  const chip = (o = {}) => {
    const cls = ['sdk-daychip', o.cur ? 'is-current' : '', o.today ? 'is-today' : '', o.empty ? 'is-empty' : '', o.state === 'hover' ? 'ds-force-hover' : '', o.state === 'focus' ? 'ds-force-focus' : '', o.state === 'active' ? 'ds-force-active' : ''].filter(Boolean).join(' ');
    return `<button type="button" class="${cls}"${o.cur ? ' aria-current="true"' : ''} aria-label="${o.wd} ${o.d}${o.trip ? ', in the trip' : ''}${o.today ? ', today' : ''}"><span>${o.wd}</span><b>${o.d}</b>${o.trip ? '<span class="sdk-daychip-dot" aria-hidden="true"></span>' : ''}</button>`;
  };
  const STRIP = [['Fri', 16, {}], ['Sat', 17, { empty: true }], ['Sun', 18, { trip: true }], ['Mon', 19, { trip: true }], ['Tue', 20, { trip: true, today: true, cur: true }], ['Wed', 21, { trip: true }], ['Thu', 22, { trip: true }], ['Fri', 23, { empty: true }], ['Sat', 24, {}], ['Sun', 25, {}]];
  const strip = () => `<div class="sdk-daystrip" role="group" aria-label="Days">${STRIP.map(([wd, d, o]) => chip(Object.assign({ wd, d }, o))).join('')}</div>`;

  const wrap = (inner) => `<div class="ds-proposed">${inner}</div>`;
  const CAP = (s, top) => `<span class="pm-dy-cap${top ? ' pm-top' : ''}">${s}</span>`;

  // ---- frame bodies ----
  const anatomyBody = () => wrap(`<div class="sdk-panel"><div class="pm-dy-two">
    <div>${CAP('The day card')}${dayCard({ d: 20, wd: 'Tue', title: 'Day 3 of 6', sub: 'Train to Lyon, lunch, the Louvre', phase: PHASES[3], count: 3, rows: rows3() })}</div>
    <div>${CAP('Its date block, labels and count')}<div class="sdk-card"><div class="sdk-day-head"><div class="sdk-day-date"><b>20</b><span>Tue</span></div><div class="sdk-day-main"><h3 class="sdk-card-title">Title</h3><p class="sdk-card-sub">Summary, 12px muted</p><div class="sdk-day-labels">${phaseLabel(PHASES[3])}${todayLabel()}</div></div><span class="sdk-badge">3</span></div></div>
    <p class="pm-dy-note">Date block: a neutral fill, Figtree 600 at 22px, the weekday at 11px in capitals. Labels: Chips status labels (24px, a tint fill, words always). Count: the neutral Chips count.</p></div></div></div>`);

  const statesBody = () => wrap(`<div class="sdk-panel"><div class="pm-dy-two">
    <div>${CAP('Rest, in a phase')}${dayCard({ d: 19, wd: 'Mon', title: 'Day 2 of 6', sub: 'Hotel check-in', phase: PHASES[1], count: 1, rows: row('Hotel check-in', '15:00') })}</div>
    <div>${CAP('Current: the selected fill')}${dayCard({ d: 21, wd: 'Wed', title: 'Day 4 of 6', sub: 'Lunch with Ana', phase: PHASES[3], current: true, count: 1, rows: row('Lunch with Ana', '12:30') })}</div>
    <div>${CAP('Today, not in view: the word only')}${dayCard({ d: 20, wd: 'Tue', title: 'Day 3 of 6', sub: 'Train to Lyon', phase: PHASES[3], today: true, count: 1, rows: row('Train to Lyon', '9:12') })}</div>
    <div>${CAP('Current and today')}${dayCard({ d: 20, wd: 'Tue', title: 'Day 3 of 6', sub: 'Train to Lyon', phase: PHASES[3], today: true, current: true, count: 1, rows: row('Train to Lyon', '9:12') })}</div>
    <div>${CAP('Empty day')}${dayCard({ d: 22, wd: 'Thu', title: 'Day 5 of 6', phase: PHASES[3], empty: true })}</div>
    <div>${CAP('Drop target while a row is dragged')}${dayCard({ d: 23, wd: 'Fri', title: 'Day 6 of 6', phase: PHASES[3], drop: true, empty: true })}</div>
    <div>${CAP('Not in a phase, no count')}${dayCard({ d: 26, wd: 'Mon', title: 'Between trips', sub: 'Nothing is planned.', empty: true })}</div>
  </div><p class="pm-dy-note">No accent border, no glow, no gradient, no solid block. Current is the Cards family's selected fill; "Today" is a word, so it does not depend on colour.</p></div>`);

  const phasesBody = () => wrap(`<div class="sdk-panel"><div class="pm-dy-states">${PHASES.map((p) => `<div><small>${p[0]}</small><div class="sdk-card sdk-day" style="min-width:230px">${`<div class="sdk-day-head"><div class="sdk-day-date"><b>12</b><span>Mon</span></div><div class="sdk-day-main"><h3 class="sdk-card-title">Day 1</h3><div class="sdk-day-labels">${phaseLabel(p)}</div></div></div>`}</div></div>`).join('')}</div>
    <p class="pm-dy-note">The phase is a status label in its tint with the phase's own icon. The head has no wash.</p></div>`);

  const chipStates = [
    ['Rest', { wd: 'Wed', d: 21 }], ['Hover', { wd: 'Wed', d: 21, state: 'hover' }], ['Pressed', { wd: 'Wed', d: 21, state: 'active' }], ['Focus', { wd: 'Wed', d: 21, state: 'focus' }],
    ['Current', { wd: 'Wed', d: 21, cur: true }], ['Today', { wd: 'Tue', d: 20, today: true }], ['Current and today', { wd: 'Tue', d: 20, cur: true, today: true }],
    ['In the trip: a dot', { wd: 'Thu', d: 22, trip: true }], ['In the trip, current', { wd: 'Thu', d: 22, trip: true, cur: true }], ['Out of the trip', { wd: 'Sat', d: 24 }], ['Empty day', { wd: 'Sat', d: 24, empty: true }],
  ];
  const chipBody = () => wrap(`<div class="sdk-panel"><div class="pm-dy-states">${chipStates.map(([n, o]) => `<div><small>${n}</small>${chip(o)}</div>`).join('')}</div>
    <p class="pm-dy-note">A small neutral chip, 46px wide and 40px high (44px on a phone). Current is the selected fill; in the trip is a 7px dot (was a coloured border); today is a 4px dot under the number (the micro dot). No lift, no shadow. Every chip is the same height.</p></div>`);

  const stripBody = () => wrap(`<div class="sdk-panel">${CAP('The day strip')}${strip()}
    <div class="pm-dy-cap pm-top">The days between two days</div>
    <div class="sdk-gap"><span class="sdk-gapcount" aria-hidden="true">3</span><span>days between</span></div>
    <div class="sdk-gap" style="margin-top:8px"><span class="gapcount" aria-hidden="true">12</span><span>days between (the old name)</span></div>
    <p class="pm-dy-note">The days-between count was a 34px circle with a 2px border. It is a neutral round count with its word.</p></div>`);

  const contextBody = () => wrap(`<div class="sdk-panel sdk-day-page">${strip()}
    ${dayCard({ d: 19, wd: 'Mon', title: 'Day 2 of 6', sub: 'Hotel check-in', phase: PHASES[1], count: 1, rows: row('Hotel check-in', '15:00') })}
    <div class="sdk-gap"><span class="sdk-gapcount" aria-hidden="true">1</span><span>day between</span></div>
    ${dayCard({ d: 21, wd: 'Wed', title: 'Day 3 of 6', sub: 'Train to Lyon, lunch, the Louvre', phase: PHASES[3], today: true, current: true, count: 3, rows: rows3() })}
    ${dayCard({ d: 22, wd: 'Thu', title: 'Day 4 of 6', phase: PHASES[3], empty: true })}</div>`);

  const phoneBody = () => wrap(`<div class="sdk-panel sdk-day-page">${strip()}
    ${dayCard({ d: 21, wd: 'Wed', title: 'Day 3 of 6', sub: 'Train to Lyon, lunch, the Louvre', phase: PHASES[3], today: true, current: true, count: 3, rows: rows3() })}
    ${dayCard({ d: 22, wd: 'Thu', title: 'Day 4 of 6', phase: PHASES[3], empty: true })}</div>`);

  const aliasBody = () => wrap(`<div class="sdk-panel"><div class="pm-dy-cap">Old names, no change to the markup beyond sdk-card beside .day2</div>
    <div class="sdk-card day2"><header class="day-head2"><div class="dnum"><b>7</b><span>Wed</span></div><div class="dmeta"><h2>Day 3</h2><p>Summary</p></div><div class="day-actions">${MORE}</div></header></div>
    <div style="margin-top:8px;display:flex;gap:6px"><button type="button" class="daychip"><span>Wed</span><b>21</b></button><button type="button" class="daychip current today"><span>Thu</span><b>22</b></button></div></div>`);

  // ---- contrast ----
  const CUR = ['--bg-card', '--selected-bg'];
  const TONE = (t) => `color-mix(in srgb, var(--tint-${t}) 45%, var(--text))`;
  const TFILL = (t) => `color-mix(in srgb, var(--tint-${t}) 18%, var(--bg-card))`;
  const CT_ROWS = [
    ['Title on a card', '--text', ['--bg-card'], 4.5],
    ['Title on the current card', '--text', CUR, 4.5],
    ['Summary (dim) on a card', '--text-dim', ['--bg-card'], 4.5],
    ['Summary on the current card (the stronger mix Cards uses)', 'color-mix(in srgb, var(--text) 78%, var(--text-dim))', CUR, 4.5],
    ['The day number on the date block', '--text', ['--bg-card', 'color-mix(in srgb, var(--text) 8%, var(--bg-card))'], 4.5],
    ['The weekday (muted, stronger mix) on the date block', 'color-mix(in srgb, var(--text-dim) 55%, var(--text))', ['--bg-card', 'color-mix(in srgb, var(--text) 8%, var(--bg-card))'], 4.5],
    ['"Today" status label (accent tone)', 'color-mix(in srgb, var(--accent) 45%, var(--text))', CUR.concat(['color-mix(in srgb, var(--accent) 18%, var(--bg-card))']), 4.5],
    ['Day chip, weekday (muted, stronger mix) on the chip fill', 'color-mix(in srgb, var(--text-dim) 55%, var(--text))', ['--bg-section', 'color-mix(in srgb, var(--text) 8%, transparent)'], 4.5],
    ['Day chip, current: the accent-mix number on the selected fill', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg-section', '--selected-bg'], 4.5],
    ['The in-trip dot on the chip (non-text)', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg-section', 'color-mix(in srgb, var(--text) 8%, transparent)'], 3],
    ['The count on its fill', '--text', ['--bg-card', 'color-mix(in srgb, var(--text) 14%, transparent)'], 4.5],
    ['Focus outline (accent) on a day chip', '--accent', ['--bg-section'], 3],
  ].concat(PHASES.map((p) => [`Phase label, ${p[0]} (${p[1]}), on its tint`, TONE(p[1]), ['--bg-card', TFILL(p[1])], 4.5]));
  const contrastBody = () => wrap(`<table class="pm-dy-ct"><thead><tr><th>Pair</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${CT_ROWS.map((r) => `<tr data-fg="${h(r[1])}" data-bgs="${h(JSON.stringify(r[2]))}" data-min="${r[3]}"><td>${r[0]}</td><td data-out="r"></td><td>${r[3] + ':1'}</td><td data-out="p"></td></tr>`).join('')}</tbody></table>`);
  const measureContrast = (doc) => {
    const host = doc.querySelector('.ds-proposed');
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const col = (expr) => { const p = doc.createElement('span'); p.style.color = expr.startsWith('--') ? `var(${expr})` : expr; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (d) => 0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]);
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-dy-ct tbody tr')) {
        g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillRect(0, 0, 1, 1); g.clearRect(0, 0, 1, 1);
        for (const l of JSON.parse(tr.dataset.bgs)) { g.fillStyle = col(l.startsWith('--') ? l : l); g.fillRect(0, 0, 1, 1); }
        const base = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        g.fillStyle = col(tr.dataset.fg); g.fillRect(0, 0, 1, 1);
        const top = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        const a = lum(top); const b = lum(base);
        const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const min = Number(tr.dataset.min); const p = tr.querySelector('[data-out="p"]');
        p.textContent = r >= min ? 'Passes' : 'Fails'; p.className = r >= min ? 'pm-dy-pass' : 'pm-dy-fail';
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  function renderDays(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="days-h"><a href="#days">Day cards and day chips</a></h3><span class="ds-status-chip ds-st-approved">Approved</span><span class="ds-count">the Planner's day card, its date block and labels, the day chip, the days-between count</span></header>
<p class="ds-desc"><b>Decided 2026-10-21: approved as drawn.</b> (1) The day card is a Card from the approved Cards family: a hairline, no shadow, the card step on the panel step, the large corner, 12px of padding. (2) Its head is one row: a date block, the title and summary, the labels, a count and the "..." menu. (3) The date block is a neutral inner fill with the day number in Figtree 600 at 22px and the weekday at 11px in capitals; it is not a solid accent block. (4) The phase wash on the head is dropped: the phase shows as a Chips status label in its tint. (5) The current day is the neutral selected fill with a "Today" status label when it is today: no accent border, no glow. (6) The day chip is a small neutral chip: current is the selected fill, in the trip is a dot (not a coloured border), today is a small dot, hover is a quiet fill, and it no longer lifts. The date picker's today and chosen day are in the Calendar cells family.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#days-anatomy">Anatomy</a><a href="#days-states">Day card states</a><a href="#days-phases">Phase labels</a><a href="#days-chips">Day chip</a><a href="#days-strip">Strip and gap</a><a href="#days-context">In context</a><a href="#days-phone">On a phone</a><a href="#days-contrast">Contrast</a><a href="#days-map">Today to proposed</a><a href="#days-alias">Aliases</a><a href="#days-tokens">Tokens</a><a href="#days-contract">Markup</a><a href="#days-decided">What Thomas chooses</a></nav>

<h4 class="ds-h4" id="days-anatomy">Anatomy</h4>
<div data-slot="anatomy"></div>
${dim([
    ['1 Card', 'The Cards family\'s card: <code>--bg-card</code>, 1px <code>--border</code>, <code>--radius-large</code>, 12px padding, no shadow, no gradient. Rows inside take <code>--bg-input</code> and <code>--radius-small</code>.'],
    ['2 Date block', 'At least 48px by 48px, <code>--radius-small</code>, the text colour at 8% over the card (a neutral fill; the card and field steps are the same colour in today\'s theme, so a step token would not show). The day is 22px, weight 600, tabular; the weekday 11px, weight 600, capitals, <code>--text-dim</code>.'],
    ['3 Title and summary', 'Title 14px, weight 600 ("Day 3 of 6"). Summary 12px <code>--text-dim</code>, as the Cards sub line.'],
    ['4 Labels', 'Status labels from Chips (24px, 12px, a tint fill): the phase in its tint with its own icon, and "Today". Marker day tags (Markers family) join this row.'],
    ['5 Count and menu', 'The neutral Chips count (18px) and the actions: a small Add button and the Quiet "..." (30px). On a phone the Add word is hidden and the plus stays (a 44px hit area, Buttons).'],
    ['6 Empty day', 'One quiet button with a dashed neutral hairline, 44px high.'],
    ['7 Head', 'The head still sticks to the top while the day scrolls, as today; it draws on the card\'s own fill.'],
  ])}

<h4 class="ds-h4" id="days-states">Day card states</h4>
<div data-slot="states"></div>

<h4 class="ds-h4" id="days-phases">Phase labels</h4>
<div data-slot="phases"></div>

<h4 class="ds-h4" id="days-chips">Day chip</h4>
<div data-slot="chips"></div>

<h4 class="ds-h4" id="days-strip">Strip and gap</h4>
<div data-slot="strip"></div>

<h4 class="ds-h4" id="days-context">In context</h4>
<p class="ds-desc">The Planner's list: the strip, then day cards with the days-between count between them.</p>
<div data-slot="context"></div>

<h4 class="ds-h4" id="days-phone">On a phone (390 wide)</h4>
<div data-slot="phone"></div>

<h4 class="ds-h4" id="days-contrast">Contrast</h4>
<p class="ds-desc">Worked out in the page from the computed colours, in the current mode (WCAG 2). Text needs 4.5 to 1, a dot or an outline 3 to 1.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="days-map">Today to proposed</h4>
${tbl(['Today', 'Proposed'], [
    ['<code>.day2</code>: <code>--bg-section</code>, a hairline, <code>--radius-large</code>', 'A Card: <code>.sdk-card.sdk-day</code> on a panel. The same hairline and corner; the card step.'],
    ['<code>.day-head2</code>: a gradient from accent 10% to the section, 14px by 16px padding, sticky', 'A row with no fill and no gradient; 12px of padding comes from the card. Still sticky.'],
    ['<code>.day2.in-phase .day-head2</code>: a gradient of the phase tint at 34% to 18%', 'No wash. The phase is a status label in its tint with the phase\'s icon.'],
    ['<code>.dnum</code>: a solid accent block, 26px weight 700, 10px weekday', 'A neutral inner fill; the day in Figtree 600 at 22px, the weekday 11px in capitals.'],
    ['<code>.day2.current</code>: an accent border, a 1px accent ring and an accent glow shadow; its <code>.dnum</code> gets a 35% ring', 'The selected fill (<code>--selected-bg</code>). No border change, no ring, no glow.'],
    ['<code>.day2.today</code>: "· today" appended to the title in accent', 'A "Today" status label in the label row.'],
    ['<code>.day2.in-trip</code>: the <code>.dnum</code> in a hue turned from the accent; a ring when current', 'No colour change on the block. The trip is a phase and has its label.'],
    ['<code>.day2.drop-target</code>: a 2px dashed accent outline', 'A 2px solid accent outline, inside (the focus mechanism).'],
    ['<code>.daychip</code>: 1px hairline, <code>--bg-card</code>, hover an accent border', 'A neutral chip fill (<code>--text</code> at 8%), hover the quiet fill, no border.'],
    ['<code>.daychip.current</code>: a solid accent fill with <code>--on-accent</code> text, lifted 2px with an accent shadow', 'The selected fill with the accent-mix number. No lift, no shadow.'],
    ['<code>.daychip.in-trip</code>: a coloured border (a turned hue at 60%) and a coloured number', 'A 7px dot in the corner. The number keeps the text colour.'],
    ['<code>.daychip.in-phase</code>: a wash of the phase tint at 20%', 'No wash on the chip. The phase is named on the day card.'],
    ['<code>.daychip.today::after</code>: a 5px accent dot', 'A 4px dot under the number (accent mixed into the text), the same on every chip so heights match.'],
    ['<code>.gapcount</code>: a 34px circle with a 2px dim border', 'A 24px neutral round count with its word "days between".'],
  ])}

<h4 class="ds-h4" id="days-alias">Aliases</h4>
${tbl(['Component', 'New name', 'Older names that take the same rules'], [
    ['Day card', '<code>.sdk-day</code> (with <code>.sdk-card</code>)', '<code>.day2</code> takes the card by adding <code>sdk-card</code> beside it'],
    ['Head, date block, text, actions', '<code>.sdk-day-head</code> <code>.sdk-day-date</code> <code>.sdk-day-main</code> <code>.sdk-day-actions</code>', '<code>.day-head2</code> <code>.dnum</code> <code>.dmeta</code> <code>.day-actions</code>'],
    ['Empty day', '<code>.sdk-day-empty</code>', '<code>.day-empty-add</code>'],
    ['Day chip', '<code>.sdk-daychip</code>', '<code>.daychip</code> (<code>.current</code>, <code>.today</code>). Today the Chips family lists <code>.daychip</code> among its choice-chip aliases; it moves here.'],
    ['Days between', '<code>.sdk-gapcount</code>', '<code>.gapcount</code>'],
  ])}
<div data-slot="alias"></div>

<h4 class="ds-h4" id="days-tokens">Tokens</h4>
${tbl(['Token', 'Value', 'Used for'], [
    ['<code>--day-date-w</code>', '48px', 'The date block\'s minimum width. Proposed token.'],
    ['<code>--day-block-fill</code>', 'the text colour at 8% over the card', 'The date block. Proposed token.'],
    ['<code>--chip-h-day</code>', '40px (44px on a phone)', 'The day chip height. Proposed token.'],
    ['<code>--bg-card</code> <code>--border</code> <code>--selected-bg</code> <code>--accent</code> <code>--tint-*</code>', 'the theme\'s', 'The card, the current fill, the dots and the phase labels.'],
  ])}

<h4 class="ds-h4" id="days-contract">Markup</h4>
${code(`<article class="sdk-card sdk-day is-current" aria-current="true">
  <div class="sdk-day-head">
    <div class="sdk-day-date"><b>20</b><span>Tue</span></div>
    <div class="sdk-day-main">
      <h3 class="sdk-card-title">Day 3 of 6</h3>
      <p class="sdk-card-sub">Train to Lyon, lunch</p>
      <div class="sdk-day-labels">
        <span class="sdk-status" data-tint="orange"><i class="fa-solid fa-plane"></i><span class="sdk-chip-label">Trip</span></span>
        <span class="sdk-status" data-tone="info"><span class="sdk-chip-label">Today</span></span>
      </div>
    </div>
    <span class="sdk-badge">3</span>
    <div class="sdk-day-actions"><button class="btn btn-small sdk-day-add">+ <span class="sdk-day-add-word">Add</span></button> <button class="sdk-icon-btn btn-small btn-quiet" aria-label="More">...</button></div>
  </div>
  <div class="sdk-card-list"><div class="sdk-row">...</div></div>
</article>
<div class="sdk-daystrip"><button class="sdk-daychip is-current is-today" aria-current="true"><span>Tue</span><b>20</b><span class="sdk-daychip-dot"></span></button></div>`)}
${dim([
    ['Current', '<code>.is-current</code> with <code>aria-current="true"</code> on the card (the Cards family styles the attribute) or on the chip.'],
    ['Today', 'A "Today" status label on the card; <code>.is-today</code> on the chip.'],
    ['In the trip', '<code>.sdk-daychip-dot</code> in the chip, with the words in its <code>aria-label</code>.'],
  ])}

<h4 class="ds-h4" id="days-decided">Decided 2026-10-21</h4>
<p class="ds-desc">Thomas approved every choice below, as drawn, on 2026-10-21.</p>
${tbl(["Decided as drawn","Why"], [
    ["\"Current\" gets the selected fill; \"today\" gets only the word","In the Planner the day in view and today are different things; the brief gives the fill to the current day and the word to today."],
    ["The date block is the text at 8% over the card, not a surface step","In today's theme the card and the field are the same colour, so a step would not show."],
    ["The day number is Figtree 600 at 22px (the 22 step, but not Fraunces)","Digits stay in the interface font; 22px is the headline step."],
    ["The date block corner is <code>--radius-small</code>","A row inside a card is small."],
    ["The phase label has the phase's own icon","The itinerary plan decided phases carry their icon on the caps."],
    ["The in-trip dot is 7px (the Chips dot); the today dot is 4px","Two dots, two places: corner and under the number."],
    ["The day chip is 40px high (44px on a phone), not the Chips choice chip's 30px","It stacks a weekday over a number."],
    ["The <code>.gapcount</code> is drawn here, not in the Calendar family","It lives in the Planner, between day cards."],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + DY_CSS }, o || {}));
    slot('anatomy').appendChild(F(anatomyBody(), 'Days, anatomy'));
    slot('states').appendChild(F(statesBody(), 'Days, day card states'));
    slot('phases').appendChild(F(phasesBody(), 'Days, phase labels'));
    slot('chips').appendChild(F(chipBody(), 'Days, day chip'));
    slot('strip').appendChild(F(stripBody(), 'Days, strip and gap'));
    slot('context').appendChild(F(contextBody(), 'Days, in context'));
    slot('phone').appendChild(F(phoneBody(), 'Days, on a phone', { pinWidth: 390 }));
    slot('contrast').appendChild(F(contrastBody(), 'Days, contrast', { onload: measureContrast }));
    slot('alias').appendChild(F(aliasBody(), 'Days, aliases'));
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'days', covers: ['day-card', 'day-chip', 'day2', 'daychip', 'gapcount'], group: 'Content', name: 'Day cards and day chips', status: 'approved',
    words: 'day days card chip planner date block head phase label current today in trip dot strip gap count between empty drop target itinerary dnum day2 daychip gapcount', render: renderDays,
  });
})();
