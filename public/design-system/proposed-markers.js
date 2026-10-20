/* The Markers family (proposed): a Planner marker in three forms by its job (line chip, day row, day tag), its legend, and how it sits in a day card and in the
   Calendar. Loaded by proposed.html through proposed-families.json, after proposed.js (the page engine); it registers one family through
   window.DS_PROPOSED.families.push and draws it with the rules in proposed-markers.css. Nothing here is a style of the product: markup, words and tables only.
   How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules, from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // Layout of the example pages only (not a style of the product).
  const MK_CSS = `
.pm-mk-three { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; align-items: start; }
.pm-mk-cap { display: block; margin: 0 0 6px; color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-mk-cap.pm-top { margin-top: 14px; }
.pm-mk-note { margin: 6px 0 0; color: var(--text-dim); font-size: 12px; }
.pm-mk-stack { display: flex; flex-direction: column; gap: 8px; align-items: flex-start; min-width: 0; }
.pm-mk-wrap { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; }
.pm-mk-leg { width: 100%; border-collapse: collapse; font-size: 13px; }
.pm-mk-leg th { padding: 4px 10px 6px 0; color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-align: left; text-transform: uppercase; vertical-align: bottom; }
.pm-mk-leg td { padding: 8px 10px 8px 0; border-top: 1px solid var(--border); vertical-align: middle; }
.pm-mk-leg td:first-child { font-weight: 600; white-space: nowrap; }
.pm-mk-ct { border-collapse: collapse; width: 100%; font-size: 12px; }
.pm-mk-ct th, .pm-mk-ct td { padding: 4px 8px 4px 0; text-align: left; border-bottom: 1px solid var(--border); }
.pm-mk-ct th { color: var(--text-dim); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.pm-mk-pass { color: var(--ok); font-weight: 600; }
.pm-mk-fail { color: var(--danger); font-weight: 600; }
.pm-mk-page { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
`;

  // The seven types of the Planner's default list, in demonstration colours (the person's own colour is set at run time through --marker).
  const TYPES = [
    { id: 'free-time', label: 'Free time', icon: 'face-smile', c: 'var(--tint-teal)' },
    { id: 'rest', label: 'Rest', icon: 'moon', c: 'var(--tint-purple)' },
    { id: 'buffer', label: 'Buffer', icon: 'hourglass-half', c: 'var(--text-dim)' },
    { id: 'meet-up', label: 'Meet-up', icon: 'users', c: 'var(--tint-pink)' },
    { id: 'leave-by', label: 'Leave by', icon: 'clock', c: 'var(--tint-gold)' },
    { id: 'travel-day', label: 'Travel day', icon: 'suitcase-rolling', c: 'var(--tint-blue)' },
    { id: 'free-day', label: 'Free day', icon: 'sun', c: 'var(--tint-orange)' },
  ];
  const T = (id) => TYPES.find((t) => t.id === id);
  const MORE = `<button type="button" class="sdk-icon-btn btn-small btn-quiet" aria-label="More" title="More">${fa('ellipsis-vertical')}</button>`;
  const FORCE = { hover: ' ds-force-hover', focus: ' ds-force-focus' };

  // The three forms. t: a type. o: when, note, state, dis, time, len, sub.
  const line = (t, o = {}) => `<button type="button" class="sdk-mk-line${FORCE[o.state] || ''}" style="--marker:${t.c}" title="${h(t.label)}"><span class="sdk-mk-ic">${fa(t.icon)}</span><span class="sdk-mk-label">${t.label}</span>${o.when ? `<span class="sdk-mk-when">${o.when}</span>` : ''}${o.note ? `<span class="sdk-mk-note">${o.note}</span>` : ''}</button>`;
  const row = (t, o = {}) => `<div class="sdk-row sdk-mk-row" style="--marker:${t.c}"><span class="sdk-mk-time">${o.time || '12:30'}</span><span class="sdk-card-icon">${fa(t.icon)}</span><span class="sdk-row-main"><span class="sdk-row-title">${o.title || t.label}</span>${o.sub ? `<span class="sdk-row-sub">${o.sub}</span>` : ''}</span>${o.len ? `<span class="sdk-row-meta sdk-mk-len">${o.len}</span>` : ''}${MORE}</div>`;
  const tag = (t, o = {}) => `<button type="button" class="sdk-mk-tag${FORCE[o.state] || ''}" style="--marker:${t.c}"${o.dis ? ' disabled' : ''}>${fa(t.icon)}<span class="sdk-mk-label">${o.title || t.label}</span></button>`;

  const wrap = (inner) => `<div class="ds-proposed">${inner}</div>`;
  const CAP = (s, top) => `<span class="pm-mk-cap${top ? ' pm-top' : ''}">${s}</span>`;

  // ---- frame bodies ----
  const formsBody = () => wrap(`<div class="sdk-panel"><div class="pm-mk-three">
    <div>${CAP('Line chip: a moment between days')}<div class="sdk-mk-spine">${line(T('meet-up'), { when: 'Oct 12' })}${line(T('leave-by'), { when: '7:30', note: 'Taxi' })}${line(T('buffer'))}</div>
      ${CAP('Hover, focus', true)}<div class="pm-mk-stack">${line(T('meet-up'), { state: 'hover' })}${line(T('meet-up'), { state: 'focus' })}</div></div>
    <div>${CAP('Day row: a block of time in a day')}<div class="sdk-card"><div class="sdk-card-list">${row(T('free-time'), { time: '14:00', len: '2 h' })}${row(T('rest'), { time: '16:00', len: '1 h', sub: 'Back at the hotel' })}${row(T('buffer'), { time: '18:30', len: '30 min' })}</div></div>
      <p class="pm-mk-note">The Cards row inside a card: no edge, the marker's icon in a tint chip, the time, the words.</p></div>
    <div>${CAP('Day tag: a whole day')}<div class="pm-mk-wrap">${tag(T('travel-day'))}${tag(T('free-day'))}${tag(T('rest'))}</div>
      ${CAP('Hover, focus, read only', true)}<div class="pm-mk-wrap">${tag(T('travel-day'), { state: 'hover' })}${tag(T('travel-day'), { state: 'focus' })}${tag(T('travel-day'), { dis: true })}</div></div>
  </div></div>`);

  const legendBody = () => wrap(`<div class="sdk-panel"><table class="pm-mk-leg"><thead><tr><th>Marker type</th><th>Line chip</th><th>Day row</th><th>Day tag</th></tr></thead><tbody>${TYPES.map((t) => `<tr><td>${t.label}</td><td>${line(t)}</td><td style="min-width:240px"><div class="sdk-card" style="padding:4px">${row(t, { time: '12:30' })}</div></td><td>${tag(t)}</td></tr>`).join('')}</tbody></table>
    <p class="pm-mk-note">Where a marker sits is how it was added, not what type it is: any type can be a line chip, a row or a tag. Its words are in every form. The colour is the person's own, shown on the icon chip and the tint fill.</p></div>`);

  const dayCard = (o) => `<article class="sdk-card sdk-day${o.current ? ' is-current' : ''}"${o.current ? ' aria-current="true"' : ''}>
    <div class="sdk-day-head"><div class="sdk-day-date"><b>${o.d}</b><span>${o.wd}</span></div><div class="sdk-day-main"><h3 class="sdk-card-title">${o.title}</h3><p class="sdk-card-sub">${o.sub}</p>
      <div class="sdk-day-labels"><span class="sdk-status" data-tint="${o.ph[1]}">${fa(o.ph[2])}<span class="sdk-chip-label">${o.ph[0]}</span></span>${o.tags || ''}</div></div>
      <span class="sdk-badge" aria-label="${o.count} planned">${o.count}</span><div class="sdk-day-actions"><button type="button" class="btn btn-small sdk-day-add" aria-label="Add to this day">${fa('plus')}<span class="sdk-day-add-word">Add</span></button>${MORE}</div></div>
    <div class="sdk-card-list">${o.rows}</div></article>`;
  const plannerBody = () => wrap(`<div class="sdk-panel pm-mk-page">
    <div class="sdk-mk-spine" aria-label="On the line, before the day">${line(T('leave-by'), { when: 'Oct 19', note: 'Leave for the airport' })}</div>
    ${dayCard({ d: 20, wd: 'Tue', title: 'Day 3 of 6', sub: 'Train to Lyon, rest, dinner', ph: ['Trip', 'orange', 'plane'], count: 3, tags: tag(T('travel-day')), current: true,
      rows: `<div class="sdk-row"><span class="sdk-row-main"><span class="sdk-row-title">Train to Lyon</span><span class="sdk-row-sub">Platform 4</span></span><span class="sdk-row-meta">9:12</span>${MORE}</div>${row(T('rest'), { time: '14:00', len: '1 h' })}<div class="sdk-row"><span class="sdk-row-main"><span class="sdk-row-title">Dinner at Café Marly</span></span><span class="sdk-row-meta">20:00</span>${MORE}</div>` })}
    <div class="sdk-mk-spine">${line(T('meet-up'), { when: 'Oct 21', note: 'Ana at the station' })}</div>
    ${dayCard({ d: 21, wd: 'Wed', title: 'Day 4 of 6', sub: 'Free day', ph: ['Trip', 'orange', 'plane'], count: 1, tags: tag(T('free-day')) + tag(T('rest')), rows: `${row(T('free-time'), { time: '10:00', len: '3 h', sub: 'Markets' })}` })}
    <p class="pm-mk-note">The phase label is the phase's (orange here); a marker keeps its own colour and never takes it.</p></div>`);

  const calBody = () => wrap(`<div class="sdk-panel"><span class="pm-mk-cap">In the Calendar: a marker is another module's object with a date (a task due, a poll closing)</span>
    <div class="sdk-cal-grid" style="grid-template-columns:repeat(3,minmax(0,1fr))" data-exception="calendar-markers">
      <div class="sdk-cal-cell" style="min-height:0"><span class="sdk-cal-n">8</span><span class="sdk-cal-chips"><span class="sdk-cal-event sdk-bar-kept is-marker" data-tint="purple">Visa deadline</span></span></div>
      <div class="sdk-cal-cell is-today" style="min-height:0"><span class="sdk-cal-n">20</span><span class="sdk-cal-chips"><span class="sdk-cal-event sdk-bar-kept is-marker" data-tint="blue">Task due</span><span class="sdk-cal-event sdk-bar-kept is-marker is-past" data-tint="green">Poll closed</span></span></div>
      <div class="sdk-cal-cell" style="min-height:0"><span class="sdk-cal-n">22</span><span class="sdk-cal-chips"><span class="sdk-cal-event" data-tint="teal">Train to Lyon</span></span></div></div>
    <div class="sdk-list" style="margin-top:8px" data-exception="calendar-markers-row"><div class="sdk-row sdk-bar-kept" data-tint="purple"><span class="sdk-card-icon" style="--tint:var(--tint-purple)">${fa('flag')}</span><span class="sdk-row-main"><span class="sdk-row-title">Visa deadline</span><span class="sdk-row-sub">Agenda row (.item.marker): the icon in its tint chip, the bar kept</span></span><span class="sdk-row-meta">All day</span></div></div>
    <p class="pm-mk-note"><span class="sdk-cal-flag">Exception, kept</span> The Calendar's markers (<code>.chip.marker</code>, <code>.item.marker</code>) keep their 3px bar (Thomas, 2026-10-18). The Planner's markers above do not.</p></div>`);

  const phoneBody = () => wrap(`<div class="sdk-panel pm-mk-page">
    <div class="sdk-mk-spine">${line(T('leave-by'), { when: 'Oct 19', note: 'Leave for the airport' })}</div>
    ${dayCard({ d: 20, wd: 'Tue', title: 'Day 3 of 6', sub: 'Train to Lyon, rest', ph: ['Trip', 'orange', 'plane'], count: 2, tags: tag(T('travel-day')) + tag(T('free-day')), current: true,
      rows: `<div class="sdk-row"><span class="sdk-row-main"><span class="sdk-row-title">Train to Lyon</span></span><span class="sdk-row-meta">9:12</span>${MORE}</div>${row(T('rest'), { time: '14:00', len: '1 h', title: 'Rest at the hotel after the long morning' })}` })}
    <div class="sdk-mk-spine">${line(T('meet-up'), { when: 'Oct 21', note: 'Ana at the station' })}</div></div>`);

  const tone = (t) => t.c.startsWith('var(--text-dim)') ? 'var(--text-dim)' : t.c;
  const CT_ROWS = [];
  for (const t of TYPES) {
    const c = tone(t);
    CT_ROWS.push([`${t.label}: words on the line chip`, '--text', ['--bg-section', `color-mix(in srgb, ${c} 22%, var(--bg-section))`], 4.5]);
    CT_ROWS.push([`${t.label}: icon on its chip, in the line chip (non-text)`, `color-mix(in srgb, ${c} 45%, var(--text))`, ['--bg-section', `color-mix(in srgb, ${c} 22%, var(--bg-section))`, `color-mix(in srgb, ${c} 38%, var(--bg-section))`], 3]);
    CT_ROWS.push([`${t.label}: words on the day tag`, '--text', ['--bg-card', `color-mix(in srgb, ${c} 22%, var(--bg-card))`], 4.5]);
    CT_ROWS.push([`${t.label}: icon on the day row's chip (non-text)`, `color-mix(in srgb, ${c} 62%, var(--text))`, ['--bg-input', `color-mix(in srgb, ${c} 18%, var(--bg-input))`], 3]);
  }
  const contrastBody = () => wrap(`<table class="pm-mk-ct"><thead><tr><th>Pair</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${CT_ROWS.map((r) => `<tr data-fg="${h(r[1])}" data-bgs="${h(JSON.stringify(r[2]))}" data-min="${r[3]}"><td>${r[0]}</td><td data-out="r"></td><td>${r[3]}:1</td><td data-out="p"></td></tr>`).join('')}</tbody></table>`);
  const measureContrast = (doc) => {
    const host = doc.querySelector('.ds-proposed');
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const col = (expr) => { const p = doc.createElement('span'); p.style.color = expr.startsWith('--') ? `var(${expr})` : expr; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (d) => 0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]);
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-mk-ct tbody tr')) {
        g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillRect(0, 0, 1, 1); g.clearRect(0, 0, 1, 1);
        for (const l of JSON.parse(tr.dataset.bgs)) { g.fillStyle = col(l); g.fillRect(0, 0, 1, 1); }
        const base = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        g.fillStyle = col(tr.dataset.fg); g.fillRect(0, 0, 1, 1);
        const top = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        const a = lum(top); const b = lum(base);
        const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const min = Number(tr.dataset.min); const p = tr.querySelector('[data-out="p"]');
        p.textContent = r >= min ? 'Passes' : 'Fails'; p.className = r >= min ? 'pm-mk-pass' : 'pm-mk-fail';
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  function renderMarkers(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="markers-h"><a href="#markers">Markers</a></h3><span class="ds-status-chip ds-st-proposed">Proposed</span><span class="ds-count">the Planner's marker in three forms: line chip, day row, day tag</span></header>
<p class="ds-desc"><b>Proposed 2026-10-20, from the research recommendations Thomas approved as a batch the same day.</b> The three forms come from the itinerary plan's decision 2 (a moment on the line, a block in a day, a tag on a day), and the look from the approved Chips and Cards families. (1) <b>Line chip</b>: the Chips tag, 24px, with the marker's tint fill, its icon in a small icon chip, and its words; it replaces the pill with the 1.5px coloured border and the hatch. (2) <b>Day row</b>: the Cards row with the marker's icon in a tint chip, lighter than a booking. (3) <b>Day tag</b>: the Chips tag with the tint fill and 12px words; it loses its 1px coloured border and its capitals. The marker's colour carries meaning on the icon chip and the tint fill, and every form has its words. No form has a coloured border, a hatch, a stripe or a shadow, and none takes a phase colour. The colour is the person's own (the marker type's setting, set as <code>--marker</code>).</p>
<nav class="ds-toc" aria-label="In this family"><a href="#markers-forms">The three forms</a><a href="#markers-legend">Legend</a><a href="#markers-planner">In the Planner</a><a href="#markers-calendar">In the Calendar</a><a href="#markers-phone">On a phone</a><a href="#markers-contrast">Contrast</a><a href="#markers-map">Today to proposed</a><a href="#markers-alias">Aliases</a><a href="#markers-tokens">Tokens</a><a href="#markers-contract">Markup</a><a href="#markers-decide">What Thomas chooses</a></nav>

<h4 class="ds-h4" id="markers-forms">The three forms</h4>
${dim([
    ['1 Line chip', '24px, <code>--radius-small</code>, 12px words. The marker at 22% over the panel; a 20px icon chip at 38%. It hangs on the neutral 2px line. An optional date or time and a note. Pressing it opens its menu (move, edit, delete).'],
    ['2 Day row', 'The Cards row: 38px (44px on a phone), no edge inside a card, <code>--bg-input</code>, <code>--radius-small</code>. A 28px icon chip with the marker\'s tint, the time, the label and the length. A long label wraps on a phone.'],
    ['3 Day tag', '24px, 12px words, no capitals. The marker at 22% over the card. Lives in the day card\'s label row with the phase label and the "Today" label.'],
    ['4 Colour', 'Words are always the text colour. The icon is the marker mixed 45% into the text (on its chip), so it stays readable on any chosen colour. The fill is the marker at 22%.'],
    ['5 States', 'A line chip and a day tag: hover is the marker at 34%, focus is the 2px outline inside, a read-only tag does nothing. A phone keeps the look and gets a 44px hit area.'],
  ])}
<div data-slot="forms"></div>

<h4 class="ds-h4" id="markers-legend">Legend</h4>
<div data-slot="legend"></div>

<h4 class="ds-h4" id="markers-planner">In the Planner</h4>
<p class="ds-desc">Line chips hang on the line between days, a row sits in a day, tags sit in the day card's head beside the phase label.</p>
<div data-slot="planner"></div>

<h4 class="ds-h4" id="markers-calendar">In the Calendar</h4>
<div data-slot="calendar"></div>

<h4 class="ds-h4" id="markers-phone">On a phone (390 wide)</h4>
<div data-slot="phone"></div>

<h4 class="ds-h4" id="markers-contrast">Contrast</h4>
<p class="ds-desc">Worked out in the page from the computed colours, in the current mode (WCAG 2), with the seven default types in demonstration colours. Words need 4.5 to 1, an icon 3 to 1. The real colour is the person's own, so a very pale choice is the one thing this cannot promise; the words stay the text colour.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="markers-map">Today to proposed</h4>
${tbl(['Today', 'Proposed'], [
    ['<code>.markerpill</code>: a 1.5px coloured border, a 38px pill with a hatched fill (a repeating gradient), radius large', 'The line chip (24px tag) or the day row (a Cards row). No border, no hatch.'],
    ['<code>.mk-icon</code>: a solid 46px block in the marker colour, a coloured right border, a white glyph', 'A 20px icon chip (28px in a row) in the marker\'s tint with the glyph in the marker mixed into the text.'],
    ['<code>.mk-label b</code>: 13px, weight 700, capitals', 'The label in 12px (13px in a row), weight 500, normal case.'],
    ['<code>.mk-len</code>: a round 11px pill at 30%', 'The Cards row\'s meta text.'],
    ['<code>.row.marker.lane.dragging .markerpill</code>: a 2px accent ring and a 10px shadow', 'The Cards dragging rule: a small shadow only (<code>.is-dragging</code>).'],
    ['<code>.row.marker.phase .markerpill</code>: a pill at 32% of the phase tint', 'The phase caps (the phase rail step); not this family.'],
    ['<code>.daytag</code>: a 1px border in the marker colour, 11px weight 600 capitals, round', 'The day tag: no border, 12px weight 500, normal case, <code>--radius-small</code>.'],
    ['<code>.daytag:hover</code>: marker at 30%', 'Marker at 34%.'],
    ['<code>.daychip.in-trip</code>: a coloured border', 'A 7px dot (Days family).'],
    ['The marker colour is a hue turned from the accent (<code>--turn</code>), for the four built-ins', 'The person\'s colour from the marker setting, as <code>--marker</code>. The four built-in turns go with the built-ins.'],
  ])}

<h4 class="ds-h4" id="markers-alias">Aliases</h4>
<p class="ds-desc">The three forms are three different elements, and today one name (<code>.markerpill</code>) serves two of them, so the Planner adds the new class beside the old one where it builds the element.</p>
${tbl(['Form', 'New name', 'Where it is built today'], [
    ['Line chip', '<code>.sdk-mk-line</code> (with <code>.sdk-mk-ic</code>, <code>.sdk-mk-label</code>, <code>.sdk-mk-when</code>)', '<code>.row.marker.lane .markerpill</code> (tpl-row-lane)'],
    ['Day row', '<code>.sdk-mk-row</code> with <code>.sdk-row</code> and <code>.sdk-card-icon</code>', '<code>.card.block.markerpill</code> (tpl-card-block)'],
    ['Day tag', '<code>.sdk-mk-tag</code>', '<code>.daytag</code>: it takes the look as it is (its <code>.ic</code> is the icon)'],
  ])}

<h4 class="ds-h4" id="markers-tokens">Tokens</h4>
${tbl(['Token', 'Value', 'Used for'], [
    ['<code>--marker</code>', 'the person\'s colour (default <code>--text-dim</code>)', 'The one colour of a marker. Set on the element from the marker type\'s setting.'],
    ['<code>--mk-tint</code> <code>--mk-icon-tint</code>', '22%, 38%', 'The fill and the icon chip. Proposed tokens.'],
    ['<code>--mk-h</code>', '24px', 'The line chip and the tag. The Chips tag height.'],
    ['<code>--mk-line</code>', 'the text colour at 18%', 'The neutral line the chips hang on (it is today\'s value).'],
  ])}

<h4 class="ds-h4" id="markers-contract">Markup</h4>
${code(`<div class="sdk-mk-spine">
  <button class="sdk-mk-line" style="--marker: #14b8a6"><span class="sdk-mk-ic"><i class="fa-solid fa-users"></i></span><span class="sdk-mk-label">Meet-up</span><span class="sdk-mk-when">7:30</span></button>
</div>
<div class="sdk-row sdk-mk-row" style="--marker: #14b8a6">
  <span class="sdk-mk-time">14:00</span><span class="sdk-card-icon"><i class="fa-solid fa-moon"></i></span>
  <span class="sdk-row-main"><span class="sdk-row-title">Rest</span></span><span class="sdk-row-meta">1 h</span> <button class="sdk-icon-btn btn-small btn-quiet" aria-label="More">...</button>
</div>
<button class="sdk-mk-tag" style="--marker: #14b8a6"><i class="fa-solid fa-suitcase-rolling"></i><span class="sdk-mk-label">Travel day</span></button>`)}

<h4 class="ds-h4" id="markers-decide">What Thomas chooses</h4>
${tbl(['Chosen here', 'Why', 'Other way'], [
    ['The words of a tag and a chip are always <code>--text</code>; only the icon takes the marker\'s colour', 'The colour is the person\'s own and may be pale; the words must stay readable.', 'Mix the colour into the words, as the Chips tag does (4.5 to 1 is then not promised).'],
    ['A line chip is the Chips tag with a small icon chip; a day tag has the plain glyph', 'Two 24px tags would look the same. The chip on the line reads as a bookmark.', 'The same tag for both.'],
    ['The line chip is pressed to open its menu (no "..." button)', 'Chips are small; the day tag does the same today.', 'A "..." after the chip.'],
    ['The icon chip is 20px in the chip and 28px in a row', 'A row is 38px high.', 'One size.'],
    ['The demo colours are the theme tints', 'The page uses tokens only; the real colour is a setting.', 'Show the default hex values.'],
    ['The Calendar\'s markers are not changed', 'They are the kept exception (Thomas, 2026-10-18) and are not the Planner\'s markers.', 'Bring them to the same look.'],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + MK_CSS }, o || {}));
    slot('forms').appendChild(F(formsBody(), 'Markers, the three forms'));
    slot('legend').appendChild(F(legendBody(), 'Markers, legend'));
    slot('planner').appendChild(F(plannerBody(), 'Markers, in the Planner'));
    slot('calendar').appendChild(F(calBody(), 'Markers, in the Calendar'));
    slot('phone').appendChild(F(phoneBody(), 'Markers, on a phone', { pinWidth: 390 }));
    slot('contrast').appendChild(F(contrastBody(), 'Markers, contrast', { onload: measureContrast }));
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'markers', covers: ['marker', 'markerpill', 'daytag', 'line-chip', 'day-row', 'day-tag'], group: 'Content', name: 'Markers', status: 'proposed',
    words: 'markers marker planner line chip day row day tag legend markerpill daytag bookmark free time rest buffer meet leave travel day free day colour tint icon label calendar exception', render: renderMarkers,
  });
})();
