/* The Journey bar family (proposed): the status strip (the phase chip, the journey bar, the countdown, the facts and the attention pill), the Set up phase band and
   the Planner's phase caps and rail. Loaded by proposed.html through proposed-families.json; it registers one family through window.DS_PROPOSED.families.push and
   draws it with the rules in proposed-journey.css. Nothing here is a style of the product: markup, words and tables only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules, from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // Layout of the example pages only (not a style of the product).
  const JR_CSS = `
.pm-jr-cap { display: block; margin: 12px 0 5px; color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-jr-cap:first-child { margin-top: 0; }
.pm-jr-head { box-sizing: border-box; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--header-bg); color: var(--header-text); }
.pm-jr-row { display: flex; flex-wrap: wrap; gap: 8px 12px; align-items: center; }
.pm-jr-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px 16px; align-items: start; }
.pm-jr-panel { box-sizing: border-box; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-large); background: var(--bg-section); }
.pm-jr-note { margin: 8px 0 0; color: var(--text-dim); font-size: 12px; }
.pm-jr-plan { width: 460px; max-width: 100%; }
.pm-jr-ct { border-collapse: collapse; width: 100%; font-size: 12px; }
.pm-jr-ct th, .pm-jr-ct td { padding: 4px 8px 4px 0; text-align: left; border-bottom: 1px solid var(--border); }
.pm-jr-ct th { color: var(--text-dim); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.pm-jr-pass { color: var(--ok); font-weight: 600; }
.pm-jr-fail { color: var(--danger); font-weight: 600; }
.pm-jr-list { display: flex; flex-direction: column; gap: 8px; }
.pm-jr-name { display: flex; align-items: center; gap: 8px; min-width: 0; }
`;

  const wrap = (inner) => `<div class="ds-proposed">${inner}</div>`;
  const CAP = (s) => `<span class="pm-jr-cap">${s}</span>`;
  const TINTS = ['gold', 'blue', 'green', 'teal', 'purple', 'red', 'orange', 'pink'];

  // The six Travel phases (the template's own order, tints and icons).
  const PHASES = [
    { n: 'Planning', i: 'clipboard-list', t: 'blue', d: 30, s: 'past' },
    { n: 'Booking', i: 'ticket', t: 'purple', d: 21, s: 'current' },
    { n: 'Pre-trip', i: 'suitcase-rolling', t: 'teal', d: 14, s: 'ahead' },
    { n: 'Trip', i: 'plane', t: 'green', d: 9, s: 'ahead', main: true },
    { n: 'Post-trip', i: 'images', t: 'orange', d: 7, s: 'ahead' },
  ];

  const band = (p, o = {}) => `<span class="sdk-band" data-state="${p.s}" data-tint="${p.t}" style="flex:${p.d}${o.lit ? '' : ''}"${o.lit ? ' data-lit="1"' : ''}><span class="sdk-band-box${p.s === 'current' ? ' end' : ''}">${p.i ? `<i class="sdk-band-icon fa-solid fa-${p.i}" aria-hidden="true"></i>` : ''}<span class="sdk-band-name">${p.n}</span>${p.s === 'current' ? '<span class="sdk-band-now">Now</span>' : ''}</span></span>`;
  const OFF = { n: 'Buffer', s: 'off', t: 'pink', d: 0 };
  const pin = (left, day) => `<span class="sdk-today" role="img" aria-label="Today, ${day} October" title="Today" style="left:${left}">${day}</span>`;
  // o: phases, pinAt (css left), day, cls (lead | trail).
  const journey = (o = {}) => `<div class="sdk-journey${o.cls ? ' ' + o.cls : ''}" role="img" aria-label="${o.label || 'Journey: Planning, Booking now, Pre-trip, Trip, Post-trip'}">${(o.phases || PHASES).map((p) => band(p)).join('')}${pin(o.pinAt || '47%', o.day || 14)}</div>`;
  const phaseChip = (o = {}) => `<button type="button" class="sdk-strip-chip sdk-strip-phase${o.state ? ' ds-force-' + o.state : ''}" data-tint="${o.t || 'purple'}" aria-expanded="${o.open ? 'true' : 'false'}"${o.dis ? ' disabled' : ''}><span class="sdk-strip-dot" aria-hidden="true"></span><span class="sdk-strip-sentence">${o.text || 'Booking · day 8 of 21 · Trip in 12 days'}</span></button>`;
  const count = (n, words, o = {}) => `<button type="button" class="sdk-strip-chip sdk-strip-count${o.state ? ' ds-force-' + o.state : ''}"><span class="sdk-strip-count-n">${n}</span><span class="sdk-strip-count-words">${words}</span></button>`;
  const fact = (icon, text, p, o = {}) => `<button type="button" class="sdk-strip-chip sdk-strip-fact${o.state ? ' ds-force-' + o.state : ''}"${p != null ? ` style="--p:${p}%"` : ''}>${p != null ? '<span class="sdk-strip-fact-fill" aria-hidden="true"></span>' : ''}${fa(icon)}<span class="sdk-strip-fact-text">${text}</span></button>`;
  const attn = (n, words, o = {}) => `<button type="button" class="sdk-strip-chip sdk-strip-attn${o.state ? ' ds-force-' + o.state : ''}" data-tone="warn" aria-expanded="${o.open ? 'true' : 'false'}"><span class="sdk-badge">${n}</span><span>${words || 'need action'}</span></button>`;
  const FACTS = `<div class="sdk-strip-facts">${fact('wallet', '62% of budget', 62)}${fact('plane', '2 flights booked')}${fact('bed', 'Hotel: 3 nights')}</div>`;
  const strip = (o = {}) => `<div class="sdk-strip" role="region" aria-label="Where we are in the journey">${o.chip === false ? '' : `<div class="sdk-strip-said">${phaseChip()}</div>`}${journey(o)}${o.nocount ? '' : count(12, 'days to Trip')}${o.nofacts ? '' : FACTS}${o.noattn ? '' : attn(3)}</div>`;

  // ---- frame bodies ----
  const stripAt = (w) => wrap(`<div style="display:flex;flex-direction:column;gap:12px">${strip({})}<p class="pm-jr-note" style="margin:0">${w >= 760 ? 'Names in the bands, up to three facts (they give way one by one from the end as the line fills), the countdown, the attention pill.' : w > 640 ? 'Below 760 the names in the bands and the facts are gone; the bands, the pin, the countdown and the pill stay.' : 'A slim 28px line: the phase sentence and the pill, with the journey as a 2px line along the foot and a small dot at today. No names, no countdown, no facts.'}</p></div>`);

  const statesBody = () => wrap(`<div class="pm-jr-list">
    ${CAP('Past 12%, current = the neutral selected fill with "Now", ahead 22%, off = a dashed neutral hairline')}<div class="pm-jr-head">${journey({ phases: PHASES.slice(0, 3).concat([{ n: 'Buffer', s: 'off', t: 'pink', d: 0 }]).concat(PHASES.slice(3)) })}</div>
    ${CAP('Today before the first phase (lead): the pin at that end, the bands kept clear of it')}<div class="pm-jr-head">${journey({ cls: 'lead', pinAt: '14px', day: 2, phases: PHASES.map((p) => Object.assign({}, p, { s: 'ahead' })) })}</div>
    ${CAP('Today after the last phase (trail)')}<div class="pm-jr-head">${journey({ cls: 'trail', pinAt: 'calc(100% - 14px)', day: 28, phases: PHASES.map((p) => Object.assign({}, p, { s: 'past' })) })}</div>
    ${CAP('A band under the pointer or lit by its row in Set up: a stronger fill')}<div class="pm-jr-head"><div class="sdk-journey">${band(PHASES[0])}<span class="sdk-band lit" data-state="ahead" data-tint="purple" style="flex:21"><span class="sdk-band-box"><i class="sdk-band-icon fa-solid fa-ticket" aria-hidden="true"></i><span class="sdk-band-name">Booking</span></span></span>${band(PHASES[2])}${band(PHASES[3])}</div></div>
    ${CAP('The eight tints, past (12%), ahead (22%) and current')}<div class="pm-jr-head" style="display:flex;flex-direction:column;gap:6px">${TINTS.map((t) => `<div class="sdk-journey">${['past', 'ahead', 'ahead', 'current'].map((s, i) => band({ n: t[0].toUpperCase() + t.slice(1), i: 'location-dot', t, d: 10, s })).join('')}</div>`).join('')}</div>
  </div>`);

  const chipsBody = () => wrap(`<div class="pm-jr-list">
    ${CAP('The phase chip: the phase dot and the sentence. Rest, hover, open, focus, pressed, disabled')}<div class="pm-jr-head"><div class="pm-jr-row">${phaseChip()}${phaseChip({ state: 'hover' })}${phaseChip({ open: true })}${phaseChip({ state: 'focus' })}${phaseChip({ state: 'active' })}${phaseChip({ dis: true })}</div></div>
    ${CAP('The countdown: a 22% accent fill; the number 16px weight 600')}<div class="pm-jr-head"><div class="pm-jr-row">${count(12, 'days to Trip')}${count(1, 'day to Trip')}<button type="button" class="sdk-strip-chip sdk-strip-count"><span class="sdk-strip-count-words">Trip starts today</span></button>${count(12, 'days to Trip', { state: 'hover' })}${count(12, 'days to Trip', { state: 'focus' })}</div></div>
    ${CAP('Facts: an icon and words; one with progress fills from the left')}<div class="pm-jr-head"><div class="pm-jr-row">${fact('wallet', '0% of budget', 0)}${fact('wallet', '62% of budget', 62)}${fact('wallet', 'Budget used', 100)}${fact('plane', '2 flights booked')}${fact('bed', 'Hotel: 3 nights', null, { state: 'hover' })}${fact('bed', 'Hotel: 3 nights', null, { state: 'focus' })}</div></div>
    ${CAP('The attention pill: a tone fill, the count a count badge (99+ at most)')}<div class="pm-jr-head"><div class="pm-jr-row">${attn(1, 'needs action')}${attn(3)}${attn(12)}${attn('99+')}${attn(3, 'need action', { open: true })}${attn(3, 'need action', { state: 'hover' })}${attn(3, 'need action', { state: 'focus' })}</div></div>
    <p class="pm-jr-note">Every chip in the header is 28px high. They are Chips looks: a neutral fill (the header text at 8%), the countdown\'s accent fill, the pill\'s tone fill; the small corner; no edge. Pressed or open is the neutral selected fill with the accent-mix words; focus is a 2px outline inside the chip.</p>
  </div>`);

  const phaseBand = (p, o = {}) => `<li class="sdk-phase-band${o.lit ? ' lit' : ''}" data-state="${p.s}" data-tint="${p.t}"${p.main ? ' data-main="1"' : ''} style="flex:${p.d}" tabindex="0"><span class="sdk-phase-band-label">${p.n}</span><span class="sdk-phase-band-span">${p.span || ''}</span>${p.s === 'current' ? '<span class="sdk-phase-band-now">Now</span>' : ''}</li>`;
  const SPANS = ['Sep 1 to 30', 'Oct 1 to 21', 'Oct 22 to Nov 4', 'Nov 5 to 13', 'Nov 14 to 20'];
  const setupBody = () => wrap(`<div class="pm-jr-panel">
    ${CAP('The Set up phase band, 58px: the same fills, a text "Now", a dashed today line')}
    <div class="sdk-phase-strip"><ol class="sdk-phase-bands" style="margin:0;padding:0">${PHASES.map((p, i) => phaseBand(Object.assign({ span: SPANS[i] }, p), { lit: i === 2 })).join('')}<li class="sdk-phase-band" data-state="off" data-tint="pink" aria-label="Buffer, no dates" tabindex="0"></li><li class="sdk-phase-today" role="presentation" aria-hidden="true" style="--at:32%"><span class="sdk-phase-today-word">Today</span></li></ol></div>
    ${CAP('A row of Set up, with the phase tag (a Chips tag) and "Now" (a Chips status label)')}
    <div class="pm-jr-list">${PHASES.map((p, i) => `<div class="sdk-row"><span class="sdk-card-icon" data-tint="${p.t}">${fa(p.i)}</span><span class="sdk-row-main"><span class="sdk-row-title pm-jr-name">${p.n}${p.main ? ' <span class="sdk-chip-tag" data-tone="info">Main</span>' : ''}${p.s === 'current' ? ' <span class="sdk-status" data-tone="info">Now</span>' : ''}</span><span class="sdk-row-sub">${SPANS[i]}</span></span><span class="sdk-chip-tag" data-tint="${p.t}">${p.n}</span></div>`).join('')}</div>
  </div>`);

  const dayCard = (title, sub, rows, tint) => `<div class="sdk-card"${tint ? ` data-tint="${tint}"` : ''}><div class="sdk-card-head"><div class="sdk-card-main"><h5 class="sdk-card-title">${title}</h5><p class="sdk-card-sub">${sub}</p></div></div>${rows ? `<div class="sdk-card-list">${rows.map((r) => `<div class="sdk-row"><span class="sdk-row-main"><span class="sdk-row-title">${r[0]}</span></span><span class="sdk-row-meta">${r[1]}</span></div>`).join('')}</div>` : ''}</div>`;
  const cap = (p, text, meta, end) => `<h4 class="sdk-cap${end ? ' sdk-cap-end' : ''}"><i class="sdk-cap-icon fa-solid fa-${p.i || 'flag'}" aria-hidden="true"></i><span>${text}</span>${meta ? `<span class="sdk-cap-meta">${meta}</span>` : ''}</h4>`;
  const planBody = () => wrap(`<div class="pm-jr-plan"><div class="pm-jr-panel" style="padding:12px">
    <section class="sdk-phase" data-tint="purple" aria-label="Booking">${cap({ i: 'ticket' }, 'Booking begins', 'Oct 12 · 3 days')}
      <div class="sdk-phase-days"><span class="sdk-rail" aria-hidden="true"></span>${dayCard('Sat 12 Oct', 'Home', [['Book the flights', '9:00'], ['Reserve the hotel', '14:00']])}${dayCard('Sun 13 Oct', 'Home', [['Buy the museum passes', '10:00']])}${dayCard('Mon 14 Oct', 'Home', [['Confirm the train', '11:30']])}</div>
      ${cap({ i: 'ticket' }, 'Booking ends', '', true)}</section>
    <section class="sdk-phase" data-tint="teal" aria-label="Pre-trip">${cap({ i: 'suitcase-rolling' }, 'Pre-trip begins', 'Oct 15 · 2 days')}
      <div class="sdk-phase-days"><span class="sdk-rail" aria-hidden="true"></span>${dayCard('Tue 15 Oct', 'Home', [['Pack', '18:00']])}${dayCard('Wed 16 Oct', 'Home', [['Print the tickets', '9:00']])}</div>
      ${cap({ i: 'suitcase-rolling' }, 'Pre-trip ends', '', true)}</section>
    <div class="sdk-phase-gap">${dayCard('Thu 17 Oct', 'No phase: a day no phase covers has no rail', [['Rest', 'All day']])}</div>
    <section class="sdk-phase" data-tint="green" aria-label="Trip">${cap({ i: 'plane' }, 'Trip begins', 'Oct 18')}
      <div class="sdk-phase-days"><span class="sdk-rail" aria-hidden="true"></span>${dayCard('Fri 18 Oct', 'Paris', [['Flight to Paris', '7:40'], ['Check in', '15:00']])}${dayCard('Sat 19 Oct', 'Paris', [['Louvre', '9:30']])}</div></section>
  </div>
  <p class="pm-jr-note">A proposal for the Planner timeline (plan-itinerary-phases-markers.md): a labelled cap with the phase's own icon at the top and the bottom of each phase, and a 6px rail between them, both fills of the phase's tint. Where one phase ends and the next begins on the same joint the caps stack, the ending one first. A day no phase covers has no rail and no cap. The Trip has no end date, so it has no end cap and its rail runs to the last day. The rail is decorative; a cap is a heading and wraps, never clipped.</p></div>`);

  const tagsBody = () => wrap(`<div class="pm-jr-list"><div class="pm-jr-row">${PHASES.map((p) => `<span class="sdk-chip-tag" data-tint="${p.t}">${p.n}</span>`).join('')}<span class="sdk-status" data-tone="info">Now</span><span class="sdk-chip-tag" data-tone="info">Main</span></div>
    <p class="pm-jr-note">The phase tag is the Chips tag (24px, 12px, a tint fill); "Now" is the Chips status label. The two different phase-tag looks and the 10px upper-case type are retired.</p></div>`);

  const aliasBody = () => wrap(`<div class="pm-jr-list">${CAP('Today\'s strip markup, no edit')}<div class="status-strip" role="region" aria-label="Journey"><div class="status-said"><button type="button" class="phase-chip" data-tint="purple" aria-expanded="false"><span class="phase-dot"></span><span class="phase-chip-label">Booking · day 8 of 21</span></button></div>
      <div class="status-track"><span class="status-band past" style="flex:30" data-tint="blue"><span class="status-band-box"><i class="status-band-icon fa-solid fa-clipboard-list"></i><span class="status-band-name">Planning</span></span></span><span class="status-band current" style="flex:21" data-tint="purple"><span class="status-band-box end"><span class="status-band-name">Booking</span></span></span><span class="status-band" style="flex:14" data-tint="teal"><span class="status-band-box"><span class="status-band-name">Pre-trip</span></span></span><span class="status-band off" data-tint="pink"></span><span class="status-today" style="left:36%"><span class="status-today-day">14</span></span></div>
      <button type="button" class="status-togo"><span class="status-togo-days">12</span><span class="status-togo-words">days to Trip</span></button>
      <div class="status-facts"><button type="button" class="status-fact" style="--p:62%"><span class="status-fact-fill"></span>${fa('wallet')}<span class="status-fact-text">62% of budget</span></button></div>
      <div class="status-attention"><button type="button" class="attention-count" aria-expanded="false">3 need action</button></div></div>
    ${CAP('Today\'s Set up band markup')}<div class="phase-strip"><ol class="phase-bands" style="margin:0;padding:0"><li class="phase-band" data-tint="blue" style="flex:30"><span class="phase-band-label">Planning</span><span class="phase-band-span">Sep 1 to 30</span></li><li class="phase-band current" data-tint="purple" style="flex:21"><span class="phase-band-label">Booking</span><span class="phase-band-span">Oct 1 to 21</span><span class="phase-band-now">Now</span></li><li class="phase-band main" data-tint="green" style="flex:14"><span class="phase-band-label">Trip</span><span class="phase-band-span">Oct 22 to 29</span></li><li class="phase-band off" data-tint="pink"></li></ol></div>
    ${CAP('Today\'s phase tags')}<div class="pm-jr-row"><span class="phase-tag" data-tint="blue">Planning</span><span class="phase-tag phase-tag-now">Now</span><span class="phase-tag phase-tag-main">Main</span></div></div>`);

  const CT_ROWS = [
    ['Strip words on the header', '--header-text', ['--header-bg'], 4.5],
    ['Phase chip words on its neutral fill', '--header-text', ['--header-bg', 'color-mix(in srgb, var(--header-text) 8%, transparent)'], 4.5],
    ['Countdown words on the 22% accent fill', '--header-text', ['--header-bg', 'color-mix(in srgb, var(--accent) 22%, transparent)'], 4.5],
    ['Fact words on its fill with progress', '--header-text', ['--header-bg', 'color-mix(in srgb, var(--header-text) 8%, transparent)', 'color-mix(in srgb, var(--accent) 22%, transparent)'], 4.5],
    ['Attention words on the warn tone fill', 'color-mix(in srgb, var(--warn, var(--tint-gold)) 45%, var(--header-text))', ['--header-bg', 'color-mix(in srgb, var(--warn, var(--tint-gold)) 18%, var(--header-bg))'], 4.5],
    ['A chip that is open: the accent mix on the selected fill', 'color-mix(in srgb, var(--accent) 55%, var(--header-text))', ['--header-bg', '--selected-bg'], 4.5],
    ['Current band name and "Now": the accent mix on the selected fill', 'color-mix(in srgb, var(--accent) 55%, var(--header-text))', ['--header-bg', '--selected-bg'], 4.5],
    ['Today pin number on the micro fill', '--on-accent', ['color-mix(in srgb, var(--accent) 88%, var(--text))'], 4.5],
    ['Set up: label on the current band', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg-card', '--selected-bg'], 4.5],
    ['Set up: the dates (11px) on the current band', 'color-mix(in srgb, var(--text) 78%, var(--text-dim))', ['--bg-card', '--selected-bg'], 4.5],
    ['Focus outline (accent) on the strip', '--accent', ['--header-bg'], 3],
  ].concat(...TINTS.map((t) => [
    [`Band name, ${t}, ahead (22%)`, '--header-text', ['--header-bg', `color-mix(in srgb, var(--tint-${t}) 22%, transparent)`], 4.5],
    [`Band name, ${t}, past (12%)`, '--header-text', ['--header-bg', `color-mix(in srgb, var(--tint-${t}) 12%, transparent)`], 4.5],
    [`Set up label, ${t}, ahead`, '--text', ['--bg-card', `color-mix(in srgb, var(--tint-${t}) 22%, var(--bg-card))`], 4.5],
    [`Set up dates (11px), ${t}, ahead`, 'color-mix(in srgb, var(--text) 78%, var(--text-dim))', ['--bg-card', `color-mix(in srgb, var(--tint-${t}) 22%, var(--bg-card))`], 4.5],
    [`Set up dates (11px), ${t}, lit (32%)`, 'color-mix(in srgb, var(--text) 78%, var(--text-dim))', ['--bg-card', `color-mix(in srgb, var(--tint-${t}) 32%, var(--bg-card))`], 4.5],
    [`Cap words, ${t}, on its fill`, `color-mix(in srgb, var(--tint-${t}) 45%, var(--text))`, ['--bg-section', `color-mix(in srgb, var(--tint-${t}) 18%, var(--bg-section))`], 4.5],
    [`Cap meta, ${t}, on its fill`, `color-mix(in srgb, var(--tint-${t}) 38%, var(--text))`, ['--bg-section', `color-mix(in srgb, var(--tint-${t}) 18%, var(--bg-section))`], 4.5],
  ]));
  const contrastBody = () => wrap(`<table class="pm-jr-ct"><thead><tr><th>Pair</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${CT_ROWS.map((r) => `<tr data-fg="${h(r[1])}" data-bgs="${h(JSON.stringify(r[2]))}" data-min="${r[3]}"><td>${r[0]}</td><td data-out="r"></td><td>${r[3] === 1 ? 'info' : r[3] + ':1'}</td><td data-out="p"></td></tr>`).join('')}</tbody></table>`);
  const measureContrast = (doc) => {
    const host = doc.querySelector('.ds-proposed');
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const col = (expr) => { const p = doc.createElement('span'); p.style.color = expr.startsWith('--') ? `var(${expr})` : expr; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (d) => 0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]);
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-jr-ct tbody tr')) {
        g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillRect(0, 0, 1, 1); g.clearRect(0, 0, 1, 1);
        for (const l of JSON.parse(tr.dataset.bgs)) { g.fillStyle = col(l); g.fillRect(0, 0, 1, 1); }
        const base = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        g.fillStyle = col(tr.dataset.fg); g.fillRect(0, 0, 1, 1);
        const top = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        const a = lum(top); const b = lum(base);
        const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const min = Number(tr.dataset.min); const p = tr.querySelector('[data-out="p"]');
        p.textContent = min === 1 ? 'Info' : r >= min ? 'Passes' : 'Fails'; p.className = min === 1 ? '' : r >= min ? 'pm-jr-pass' : 'pm-jr-fail';
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  // What the product's script does (space.js fitFacts): the facts give way one by one from the end while the journey bar has less than 400px; all are gone at 760px.
  const fitStrip = (doc) => {
    // The current band keeps its name on the side the pin is not on (the product does it with .end).
    const side = (s) => { const pin = s.querySelector('.sdk-today'); const cur = s.querySelector('.sdk-band[data-state="current"]'); if (!pin || !cur) return; const p = pin.getBoundingClientRect(); const c = cur.getBoundingClientRect(); const box = cur.querySelector('.sdk-band-box'); if (box) box.classList.toggle('end', p.left + p.width / 2 < c.left + c.width / 2); };
    const run = () => { for (const s of doc.querySelectorAll('.sdk-strip')) { const facts = [...s.querySelectorAll('.sdk-strip-fact')]; for (const f of facts) f.hidden = false; const tr = s.querySelector('.sdk-journey'); if (!tr) continue; if (doc.defaultView.innerWidth > 760) for (let i = facts.length - 1; i >= 0 && tr.getBoundingClientRect().width < 400; i -= 1) facts[i].hidden = true; side(s); } };
    run(); if (doc.fonts) doc.fonts.ready.then(run); doc.defaultView.addEventListener('resize', run);
  };

  function renderJourney(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="journey-h"><a href="#journey">Journey bar: status strip, phases and countdown</a></h3><span class="ds-status-chip ds-st-proposed">Proposed</span><span class="ds-count">the strip, its chips, the journey bar, the Set up band, the Planner's caps and rail</span></header>
<p class="ds-desc"><b>Proposed 2026-10-20, from the research recommendations Thomas approved as a batch; he also approved replacing the phase band's 4px coloured top edge and the current band's coloured ring with fills.</b> (1) The strip is 44px (a slim 28px line on a phone) with the journey as a 2px line along the foot on a phone. (2) Every chip in the header is 28px high and a Chips look: the phase chip, the countdown (a 22% accent fill, the number 16px weight 600, not 800), the facts and the attention pill (the count is a count badge). (3) The journey bar's bands are 24px with a hairline and the medium corner, a tint fill by state: past 12%, ahead 22%, current the neutral selected fill with its name in the accent mix and the text "Now"; off is a dashed neutral hairline. (4) The today pin is a 28px round pin in the micro count's fill, with its label as its name. (5) The phase tag is the Chips tag and "Now" the Chips status label. (6) The Set up band keeps its content with fills only. (7) The Planner's caps and rail are drawn as a proposal.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#journey-strips">The strip at 1280, 700 and 390</a><a href="#journey-states">Band states</a><a href="#journey-chips">Header chips</a><a href="#journey-setup">Set up band</a><a href="#journey-plan">Caps and rail</a><a href="#journey-tags">Phase tags</a><a href="#journey-contrast">Contrast</a><a href="#journey-map">Today to proposed</a><a href="#journey-alias">Aliases</a><a href="#journey-tokens">Tokens</a><a href="#journey-contract">Markup</a><a href="#journey-chosen">Chosen while drawing</a></nav>

<h4 class="ds-h4" id="journey-strips">The strip at 1280, 700 and 390</h4>
<p class="ds-desc">Things give way in the existing order as the line narrows: the facts (one by one, all gone at 760px), the names in the bands (below 760px), the days to go, then the end of the sentence. On a phone it is the slim line.</p>
<div data-slot="strips"></div>
${dim([
    ['1 Strip', '44px (<code>--status-strip-h</code>) on the header surface (<code>--header-bg</code>, words <code>--header-text</code>), 12px of padding, 12px between its parts, a 1px hairline on top. A phone: 28px (<code>--status-strip-slim-h</code>).'],
    ['2 Header chip', '28px, 13px words weight 500, <code>--radius-small</code>, a transparent 1px edge, 10px of padding, 6px between icon and words. Neutral fill: the header text at 8%; hover 14%; pressed 20%.'],
    ['3 Phase chip', 'A 10px dot in the phase\'s tint (8px on a phone), then the sentence. It opens the phase sheet. The words stay its name; the dot never stands alone for meaning.'],
    ['4 Countdown', '<code>--accent</code> at 22%; the number 16px weight 600, the words 13px, on one baseline. Gone on a phone.'],
    ['5 Facts', 'Up to three; an icon and words; the budget fills from the left (accent at 22%) as wide as its share. Gone below 760px.'],
    ['6 Attention pill', 'A warn-tone fill (the gold tint at 18% over the header) with readable words, and the count as a Chips count badge. At the right end; it has its own polite status.'],
    ['7 Journey bar', 'Bands 24px, 4px apart, widths in proportion to their days. Each has a 1px <code>--border</code> hairline and <code>--radius-medium</code>. Past 12%, ahead 22%, current <code>--selected-bg</code> with the accent mix and "Now". Off: a 14px dashed hairline.'],
    ['8 Today pin', '28px, round, the micro count\'s fill with the <code>--on-accent</code> day of the month and a 2px ring of the header colour to part it from the band. Its name is "Today, 14 October". On a phone: an 8px dot.'],
  ])}

<h4 class="ds-h4" id="journey-states">Band states</h4>
<div data-slot="states"></div>

<h4 class="ds-h4" id="journey-chips">Header chips</h4>
<div data-slot="chips"></div>

<h4 class="ds-h4" id="journey-setup">The Set up phase band</h4>
<p class="ds-desc">58px, with the same content: the name, the dates, "Now" on the current phase, a dashed line and the word "Today" for today. It is a fill by state like the strip's bands. The 4px coloured top edge and the inset ring on the current band are gone.</p>
<div data-slot="setup"></div>

<h4 class="ds-h4" id="journey-plan">The Planner's caps and rail (a proposal)</h4>
<div data-slot="plan"></div>

<h4 class="ds-h4" id="journey-tags">Phase tags</h4>
<div data-slot="tags"></div>

<h4 class="ds-h4" id="journey-contrast">Contrast</h4>
<p class="ds-desc">Worked out in the page from the computed colours, in the current mode (WCAG 2). Text needs 4.5 to 1, an icon or an outline 3 to 1. The fills are translucent, so each pair is worked out over the surface under it.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="journey-map">Today to proposed</h4>
${tbl(['Today', 'Proposed'], [
    ['<code>.phase-chip</code> (30px, in the strip)', '<code>.sdk-strip-phase</code>: 28px, a Chips look.'],
    ['<code>.status-band</code> fills 12%, 22% and 50% (current), a hairline', 'Past 12%, ahead 22%, current the neutral selected fill (<code>--selected-bg</code>) with the accent-mix name and "Now". The 50% fill goes.'],
    ['<code>.phase-band</code> (Set up, 58px): a 4px coloured top edge and an inset 2px accent ring on the current band', 'The same fills as the strip; no edge, no ring. The current band is the selected fill with "Now".'],
    ['<code>.phase-tag</code> in two looks (the 10px upper-case <code>.phase-band-now</code> and a 12px tag)', 'The Chips tag, and "Now" as the Chips status label. The 10px upper-case type is retired.'],
    ['<code>.status-togo</code>: 28px, an accent 22% fill, the number at 1.25 times the nav size in weight 800', 'The same fill; the number 16px weight 600 (the type scale and weights).'],
    ['<code>.status-fact</code>: 28px, an 8% fill, a neutral edge', 'The same size and fill; the edge is transparent (a Chips look).'],
    ['<code>.attention-count</code>: 24px, round, solid accent, weight 700', 'A 28px tone chip with a count badge in it (99+ at most). Not solid, not round.'],
    ['<code>.status-today</code>: 28px, the tint fill, the header colour as the number', '28px, the micro count\'s fill and <code>--on-accent</code>, with its label as its name.'],
    ['<code>.phase-today</code>: a 2px dashed <code>border-left</code>', 'A 2px dashed neutral line drawn as a block (not an edge).'],
    ['The phone\'s slim line with a 2px bar along its foot', 'Kept: 28px with the 2px journey line and a dot at today.'],
  ])}

<h4 class="ds-h4" id="journey-alias">Aliases</h4>
${tbl(['Component', 'New name', 'Older names that take the same rules'], [
    ['Strip', '<code>.sdk-strip</code> (<code>-said</code>, <code>-facts</code>)', '<code>.status-strip</code> <code>.status-said</code> <code>.status-facts</code>'],
    ['Header chip', '<code>.sdk-strip-chip</code> with <code>-phase</code> (<code>-dot</code>, <code>-sentence</code>), <code>-count</code> (<code>-n</code>, <code>-words</code>), <code>-fact</code>, <code>-attn</code>', '<code>.phase-chip</code> (<code>.phase-dot</code>, <code>.phase-chip-label</code>), <code>.status-togo</code> (<code>-days</code>, <code>-words</code>), <code>.status-fact</code>, <code>.attention-count</code>'],
    ['Journey bar', '<code>.sdk-journey</code>, <code>.sdk-band</code> (<code>data-state</code> past, current, ahead, off; <code>-box</code>, <code>-name</code>, <code>-icon</code>, <code>-now</code>), <code>.sdk-today</code>', '<code>.status-track</code>, <code>.status-band</code> with <code>.past</code>, <code>.current</code>, <code>.off</code>, <code>.status-band-box</code>, <code>-name</code>, <code>-icon</code>, <code>.status-today</code>'],
    ['Set up band', '<code>.sdk-phase-strip</code>, <code>.sdk-phase-bands</code>, <code>.sdk-phase-band</code> (<code>-label</code>, <code>-span</code>, <code>-now</code>), <code>.sdk-phase-today</code>', '<code>.phase-strip</code>, <code>.phase-bands</code>, <code>.phase-band</code>, <code>.phase-band-label</code>, <code>-span</code>, <code>-now</code>, <code>.phase-today</code>'],
    ['Phase tag', '<code>.sdk-chip-tag</code> (Chips)', '<code>.phase-tag</code> <code>.phase-tag-now</code> <code>.phase-tag-main</code>'],
  ])}
<div data-slot="alias"></div>

<h4 class="ds-h4" id="journey-tokens">Tokens</h4>
${tbl(['Token', 'Value', 'Used for'], [
    ['<code>--status-strip-h</code> <code>--status-strip-slim-h</code>', '44px, 28px', 'The strip. Same as today.'],
    ['<code>--jr-chip-h</code>', '28px', 'Every chip in the header. Proposed token.'],
    ['<code>--jr-band-h</code> <code>--jr-pin</code> <code>--jr-line</code> <code>--jr-phase-h</code> <code>--jr-rail</code>', '24px, 28px, 2px, 58px, 6px', 'The journey bar band, the pin, the phone line, the Set up band and the rail. Proposed tokens.'],
    ['<code>--jr-past</code> <code>--jr-ahead</code> <code>--jr-count</code> <code>--jr-fact</code>', '12%, 22%, 22%, 8%', 'The band fills, the countdown fill, the fact fill. Proposed tokens (the values are today\'s).'],
    ['<code>--header-bg</code> <code>--header-text</code> <code>--selected-bg</code> <code>--micro-fill</code> <code>--warn</code> <code>--tint-*</code> <code>--border</code>', 'the theme\'s, and the Chips family\'s', 'The strip, the current band, the pin, the attention tone, the tints, the hairlines.'],
  ])}

<h4 class="ds-h4" id="journey-contract">Markup</h4>
${code(`<div class="sdk-strip" role="region" aria-label="Where we are in the journey">
  <div class="sdk-strip-said">
    <button class="sdk-strip-chip sdk-strip-phase" data-tint="purple" aria-expanded="false">
      <span class="sdk-strip-dot" aria-hidden="true"></span><span class="sdk-strip-sentence">Booking · day 8 of 21</span></button>
  </div>
  <div class="sdk-journey" role="img" aria-label="Journey: ...">
    <span class="sdk-band" data-state="past" data-tint="blue" style="flex: 30">
      <span class="sdk-band-box"><i class="sdk-band-icon fa-solid fa-clipboard-list"></i><span class="sdk-band-name">Planning</span></span></span>
    <span class="sdk-band" data-state="current" data-tint="purple" style="flex: 21">
      <span class="sdk-band-box end"><span class="sdk-band-name">Booking</span><span class="sdk-band-now">Now</span></span></span>
    <span class="sdk-band" data-state="off"></span>
    <span class="sdk-today" role="img" aria-label="Today, 14 October" style="left: 36%">14</span>
  </div>
  <button class="sdk-strip-chip sdk-strip-count"><span class="sdk-strip-count-n">12</span><span class="sdk-strip-count-words">days to Trip</span></button>
  <div class="sdk-strip-facts"><button class="sdk-strip-chip sdk-strip-fact" style="--p: 62%">...</button></div>
  <button class="sdk-strip-chip sdk-strip-attn" data-tone="warn"><span class="sdk-badge">3</span><span>need action</span></button>
</div>

<section class="sdk-phase" data-tint="purple">                 <!-- the Planner -->
  <h4 class="sdk-cap"><i class="sdk-cap-icon fa-solid fa-ticket"></i><span>Booking begins</span><span class="sdk-cap-meta">Oct 12 · 3 days</span></h4>
  <div class="sdk-phase-days"><span class="sdk-rail" aria-hidden="true"></span> ...day cards... </div>
  <h4 class="sdk-cap sdk-cap-end">...<span>Booking ends</span></h4>
</section>`)}
${dim([
    ['State', '<code>data-state="past"</code>, <code>"current"</code>, <code>"ahead"</code> (the default) or <code>"off"</code> on a band; <code>.lit</code> while the band\'s row is under the pointer. The tint is <code>data-tint</code>.'],
    ['Narrow', '640px and below: the slim 28px line (the CSS does it; the markup is the same). Below 760px the names and the facts are hidden by the CSS; the script still drops facts one by one from the end as the line fills.'],
  ])}

<h4 class="ds-h4" id="journey-chosen">Chosen while drawing</h4>
<p class="ds-desc">Thomas decides each of these; each has another way.</p>
${tbl(['Chosen', 'Why', 'Other way'], [
    ['The header chip is 28px, not the Chips 24px or 30px', 'The brief gave 28px; it is not on the Chips scale (tag 24, choice 30).', '30px, the choice chip height.'],
    ['The attention pill is a warn (gold) tone, not accent or neutral', 'It means something needs action. The countdown is already the accent.', 'Neutral, or the accent fill.'],
    ['On a phone the journey is a 2px line made of the bands; on a desktop it is the 24px bands, with no separate line', 'A 24px band does not fit a 28px line. It is how the slim line works today.', 'A 2px progress line on the desktop too.'],
    ['The journey line\'s bands keep their tints at 28% and 55%', 'A 2px line needs a stronger fill than a 24px band to be seen.', 'The same 12% and 22%.'],
    ['The current band name is weight 600 with "Now"', 'The selected fill alone is quiet; the word makes it certain.', 'The fill only.'],
    ['The Set up band names are weight 500, the main phase 600', 'The 700 weight folds into 600 (Typography); the main phase stays heavier.', 'A "Main" tag on it.'],
    ['The caps are 32px high at least and wrap; the end cap is paler', 'The plan says a cap wraps and is never clipped; the end is the lesser of the pair.', 'The same fill for both.'],
    ['The rail is 6px, one block down the days, in the tint at 38%', 'The plan says 6px at most, one fill so no seam can show.', 'The tint at 22%, like a band.'],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + JR_CSS, onload: fitStrip }, o || {}));
    const ws = mk('div', '');
    for (const w of [1280, 700, 390]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(stripAt(w), `Journey at ${w}`, { pinWidth: w }));
    }
    slot('strips').appendChild(ws);
    slot('states').appendChild(F(statesBody(), 'Journey, band states'));
    slot('chips').appendChild(F(chipsBody(), 'Journey, header chips'));
    slot('setup').appendChild(F(setupBody(), 'Journey, set up band'));
    slot('plan').appendChild(F(planBody(), 'Journey, caps and rail'));
    slot('tags').appendChild(F(tagsBody(), 'Journey, phase tags'));
    slot('contrast').appendChild(F(contrastBody(), 'Journey, contrast', { onload: (d) => { fitStrip(d); measureContrast(d); } }));
    slot('alias').appendChild(F(aliasBody(), 'Journey, aliases'));
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'journey', covers: ['status-strip', 'phase-chip', 'status-band', 'phase-band', 'phase-tag', 'status-togo', 'status-fact', 'attention-count', 'status-today'], group: 'Containers', name: 'Journey bar: status strip, phases and countdown', status: 'proposed',
    words: 'journey bar status strip phases phase chip countdown days to go facts attention pill band now today pin set up caps rail planner timeline slim line phone tag fill past ahead current off', render: renderJourney,
  });
})();
