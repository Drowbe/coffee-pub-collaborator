/* The Chips, badges and counts family (proposed): choice chips, people chips, tags, removable chips, status labels, counts and dots, and the aliases. Loaded by proposed.html through proposed-families.json,
   after proposed.js (the page engine); it registers one family through window.DS_PROPOSED.families.push and draws it with the rules in proposed-chips.css. Nothing here is a style of the product:
   markup, words and tables only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules (.pm-row, .pm-role ...), from the page engine
  const fa = (n) => `<i class="fa-solid fa-${n}" aria-hidden="true"></i>`;

  // The example-page rules of this family's frames (the contrast table, the labelled groups). They style no chip.
  const CH_CSS = `
.pm-ct { width: 100%; border-collapse: collapse; font-size: 13px; }
.pm-ct th, .pm-ct td { padding: 5px 12px 5px 0; border-bottom: 1px solid var(--border); text-align: left; vertical-align: middle; }
.pm-ct th { color: var(--text-dim); font-size: 11px; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.pm-ct td.pm-n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.pm-pass { color: var(--ok); font-weight: 700; }
.pm-fail { color: var(--danger-text); font-weight: 700; }
.pm-cap { margin: 0 0 4px; color: var(--text-dim); font-size: 12px; }
.pm-stage { padding-top: 6px; }
.pm-stage + .pm-stage { margin-top: 14px; }
.pm-line { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 24px; padding: 6px 0; }
.pm-box { box-sizing: border-box; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-box + .pm-box { margin-top: 10px; }
.pm-on-card { --chip-surface: var(--bg-card); background: var(--bg-card); }
.pm-tbar { display: flex; align-items: center; gap: 8px; box-sizing: border-box; min-width: 0; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-sizes { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 14px 28px; }
.pm-size { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.pm-size > small { color: var(--text-dim); font-size: 11px; font-weight: 700; }
.pm-ruler { position: relative; width: 6px; border-left: 1px solid var(--text-dim); border-right: 1px solid var(--text-dim); }
.pm-mock { display: flex; align-items: center; gap: 8px; }
.pm-mock-t { color: var(--text-dim); font-size: 12px; }`;

  const TONES = ['gold', 'blue', 'green', 'teal', 'purple', 'red', 'orange', 'pink'];
  const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const NAMES = { gold: 'Dining', blue: 'Transport', green: 'Nature', teal: 'Culture', purple: 'Nightlife', red: 'Urgent', orange: 'Markets', pink: 'Shopping' };

  // ---- markup builders ----
  // A choice chip. o: label, icon, count, tone, sel, cls (forced state), dis.
  const chip = (o) => `<button type="button" class="sdk-chip${o.cls ? ' ' + o.cls : ''}" aria-pressed="${Boolean(o.sel)}"${o.tone ? ` data-tint="${o.tone}"` : ''}${o.dis ? ' disabled' : ''}>${o.icon ? fa(o.icon) : ''}${o.tone && !o.icon ? '<span class="sdk-chip-dot" aria-hidden="true"></span>' : ''}<span class="sdk-chip-label">${o.label}</span>${o.count != null ? `<span class="sdk-badge">${o.count}</span>` : ''}</button>`;
  // A person. o: name, tone, sel, cls, dis.
  const person = (o) => `<button type="button" class="sdk-chip-people${o.cls ? ' ' + o.cls : ''}" aria-pressed="${Boolean(o.sel)}"${o.dis ? ' disabled' : ''}><span class="sdk-chip-avatar" data-tint="${o.tone || 'blue'}" aria-hidden="true">${o.name.charAt(0)}</span><span class="sdk-chip-label">${o.name}</span></button>`;
  // A tag. o: label, tone, icon, dot, press (a button), cls, dis.
  const tag = (o) => { const t = o.press ? 'button' : 'span'; return `<${t}${o.press ? ' type="button"' : ''} class="sdk-chip-tag${o.cls ? ' ' + o.cls : ''}"${o.tone ? ` data-tint="${o.tone}"` : ''}${o.dis ? ' disabled' : ''}>${o.icon ? fa(o.icon) : ''}${o.dot ? '<span class="sdk-chip-dot" aria-hidden="true"></span>' : ''}<span class="sdk-chip-label">${o.label}</span></${t}>`; };
  // A removable chip. o: label, tone, cls (on the chip), xcls (on the x).
  const removable = (o) => `<span class="sdk-chip-removable${o.cls ? ' ' + o.cls : ''}"${o.tone ? ` data-tint="${o.tone}"` : ''}>${o.dot ? '<span class="sdk-chip-dot" aria-hidden="true"></span>' : ''}<span class="sdk-chip-label">${o.label}</span><button type="button" class="sdk-chip-x${o.xcls ? ' ' + o.xcls : ''}" aria-label="Remove ${o.label}" title="Remove ${o.label}">${fa('xmark')}</button></span>`;
  // A status label. o: label, tone, icon, dot.
  const status = (o) => `<span class="sdk-status"${o.tone ? ` data-tone="${o.tone}"` : ''}>${o.icon ? fa(o.icon) : ''}${o.dot ? '<span class="sdk-chip-dot" aria-hidden="true"></span>' : ''}<span class="sdk-chip-label">${o.label}</span></span>`;
  const sections = (rows) => rows.map(([cap_, html]) => `<div class="pm-stage"><p class="pm-cap">${cap_}</p>${html}</div>`).join('');

  // ---- the frames ----
  const STATES = [
    { n: 'Rest' }, { n: 'Hover', c: 'ds-force-hover' }, { n: 'Focus', c: 'ds-force-focus' },
    { n: 'Selected', sel: true }, { n: 'Selected, hover', sel: true, c: 'ds-force-hover' }, { n: 'Selected, focus', sel: true, c: 'ds-force-focus' },
    { n: 'Disabled', dis: true },
  ];
  const CHOICE_ROWS = [
    { n: 'Label only', o: { label: 'Museums' } },
    { n: 'Icon and label', o: { label: 'Museums', icon: 'landmark' } },
    { n: 'With a count', o: { label: 'Museums', count: 12 } },
    { n: 'With a category dot', o: { label: 'Museums', tone: 'purple' } },
  ];
  const grid = (rows, build) => `<div class="ds-proposed">${rows.map((r) => `<div class="pm-row" style="--pm-h:30px"><div class="pm-role">${r.n}</div><div class="dsf-states">${STATES.map((s) => `<div class="dsf-state"><small>${s.n}</small><div class="dsf-ex">${build(r, s)}</div></div>`).join('')}</div></div>`).join('')}</div>`;
  const choiceGrid = () => grid(CHOICE_ROWS, (r, s) => chip(Object.assign({}, r.o, { sel: s.sel, dis: s.dis, cls: s.c })));
  const peopleGrid = () => grid([{ n: 'Avatar and name', o: { name: 'Maria', tone: 'teal' } }, { n: 'A long name', o: { name: 'Bartholomew Wojciechowski-Smith', tone: 'pink' } }], (r, s) => person(Object.assign({}, r.o, { sel: s.sel, dis: s.dis, cls: s.c })));

  const otherStates = () => `<div class="ds-proposed">
    <div class="pm-row" style="--pm-h:24px"><div class="pm-role">Tag, not pressed</div><div class="dsf-states">${[['Neutral', {}], ['Tint', { tone: 'blue' }], ['With an icon', { tone: 'green', icon: 'leaf' }], ['With a dot', { tone: 'orange', dot: true }]].map(([n, o]) => `<div class="dsf-state"><small>${n}</small><div class="dsf-ex">${tag(Object.assign({ label: 'Day trip' }, o))}</div></div>`).join('')}</div></div>
    <div class="pm-row" style="--pm-h:24px"><div class="pm-role">Tag that is a link</div><div class="dsf-states">${[['Rest', ''], ['Hover', 'ds-force-hover'], ['Focus', 'ds-force-focus'], ['Disabled', 'dis']].map(([n, c]) => `<div class="dsf-state"><small>${n}</small><div class="dsf-ex">${tag({ label: 'Option 2', tone: 'blue', press: true, cls: c === 'dis' ? '' : c, dis: c === 'dis' })}</div></div>`).join('')}</div></div>
    <div class="pm-row" style="--pm-h:24px"><div class="pm-role">Removable chip</div><div class="dsf-states">${[['Rest', {}], ['Chip hover', { cls: 'ds-force-hover' }], ['x hover', { xcls: 'ds-force-hover' }], ['x focus', { xcls: 'ds-force-focus' }], ['x pressed', { xcls: 'ds-force-active' }]].map(([n, o]) => `<div class="dsf-state"><small>${n}</small><div class="dsf-ex">${removable(Object.assign({ label: 'Museums', tone: 'purple', dot: true }, o))}</div></div>`).join('')}</div></div>
    <div class="pm-row" style="--pm-h:24px"><div class="pm-role">Removable, neutral</div><div class="dsf-states">${[['Rest', {}], ['x hover', { xcls: 'ds-force-hover' }], ['x focus', { xcls: 'ds-force-focus' }]].map(([n, o]) => `<div class="dsf-state"><small>${n}</small><div class="dsf-ex">${removable(Object.assign({ label: 'Under 20 euro' }, o))}</div></div>`).join('')}</div></div>
    <div class="pm-row" style="--pm-h:24px"><div class="pm-role">Status label</div><div class="dsf-states">${[['Neutral', { label: 'Draft' }], ['Ok', { label: 'Booked', tone: 'ok', icon: 'check' }], ['Warning', { label: 'Past due', tone: 'warn', icon: 'triangle-exclamation' }], ['Danger', { label: 'Suspended', tone: 'danger' }], ['Info', { label: 'Now', tone: 'info', dot: true }]].map(([n, o]) => `<div class="dsf-state"><small>${n}</small><div class="dsf-ex">${status(o)}</div></div>`).join('')}</div></div>
  </div>`;

  const rolesBody = () => `<div class="ds-proposed">
    <div class="pm-sizes">
      <div class="pm-size"><small>Choice chip, 30px, 13px</small><div class="sdk-chips">${chip({ label: 'Museums', icon: 'landmark', count: 12, sel: true })}${chip({ label: 'Parks' })}</div></div>
      <div class="pm-size"><small>People chip, 30px, 13px</small><div class="sdk-chips">${person({ name: 'Maria', tone: 'teal', sel: true })}${person({ name: 'Jon', tone: 'orange' })}</div></div>
      <div class="pm-size"><small>Tag, 24px, 12px</small><div class="sdk-chips">${tag({ label: 'Nature', tone: 'green' })}${tag({ label: 'Day trip' })}</div></div>
      <div class="pm-size"><small>Removable chip, 24px, 12px</small><div class="sdk-chips">${removable({ label: 'Nightlife', tone: 'purple', dot: true })}</div></div>
      <div class="pm-size"><small>Status label, 24px, 12px</small><div class="sdk-chips">${status({ label: 'Booked', tone: 'ok' })}${status({ label: 'Past due', tone: 'warn' })}</div></div>
      <div class="pm-size"><small>Count, 18px, 11px</small><div class="sdk-chips"><span class="sdk-badge">3</span><span class="sdk-badge">99+</span></div></div>
      <div class="pm-size"><small>Corner count, 16px, 11px</small><div class="sdk-chips"><span class="pm-mock"><span class="sdk-badge sdk-badge-corner" style="position:static">3</span></span></div></div>
      <div class="pm-size"><small>Dot, 7px</small><div class="sdk-chips"><span class="sdk-dot"></span></div></div>
    </div></div>`;

  const guideBody = () => `<div class="ds-proposed">${sections([
    ['The same word three ways. A choice chip changes what you see: press it. A tag says what a thing is: read it. A status label says how a thing stands: words, one tone, never pressed.', `<div class="pm-box"><div class="pm-mock"><span class="pm-mock-t">Choice</span><div class="sdk-chips">${chip({ label: 'Dining', tone: 'gold', sel: true })}${chip({ label: 'Culture', tone: 'teal' })}${chip({ label: 'Markets', tone: 'orange' })}</div></div>
      <div class="pm-mock" style="margin-top:10px"><span class="pm-mock-t">Tag</span><div class="sdk-chips">${tag({ label: 'Dining', tone: 'gold' })}${tag({ label: 'Day trip' })}</div></div>
      <div class="pm-mock" style="margin-top:10px"><span class="pm-mock-t">Status</span><div class="sdk-chips">${status({ label: 'Booked', tone: 'ok', icon: 'check' })}${status({ label: 'Past due', tone: 'warn', icon: 'triangle-exclamation' })}</div></div></div>`],
  ])}</div>`;

  const tintBody = () => `<div class="ds-proposed">${[['On a panel (the --bg-section surface)', 'pm-box'], ['On a card (the --bg-card surface)', 'pm-box pm-on-card']].map(([t, c]) => `<div class="pm-stage"><p class="pm-cap">${t}</p><div class="${c}"><div class="sdk-chips">${TONES.map((k) => tag({ label: NAMES[k], tone: k, dot: true })).join('')}</div><div class="sdk-chips" style="margin-top:8px">${TONES.map((k) => tag({ label: NAMES[k], tone: k })).join('')}</div><div class="sdk-chips" style="margin-top:8px">${TONES.map((k) => removable({ label: NAMES[k], tone: k })).join('')}</div></div></div>`).join('')}
    <div class="pm-stage"><p class="pm-cap">A choice chip does not take the tint as its fill (the selected fill must stay the one clear signal): its category shows on its dot or icon.</p><div class="pm-box"><div class="sdk-chips">${TONES.slice(0, 4).map((k, i) => chip({ label: NAMES[k], tone: k, sel: i === 1 })).join('')}</div></div></div></div>`;

  const countBody = () => `<div class="ds-proposed">${sections([
    ['The count after a tab label and inside a chip: 18px, neutral, 11px bold. Capped at 99+.', `<div class="pm-line"><div class="sdk-tabs sdk-tabs-small" role="group" aria-label="Sections"><button type="button" class="sdk-tab" aria-pressed="true"><span class="sdk-tab-word">Modules</span><span class="sdk-badge">3</span></button><button type="button" class="sdk-tab"><span class="sdk-tab-word">Chat</span><span class="sdk-badge">99+</span></button><button type="button" class="sdk-tab"><span class="sdk-tab-word">People</span></button></div>
      <div class="sdk-chips">${chip({ label: 'Museums', count: 12, sel: true })}${chip({ label: 'Parks', count: 7 })}${chip({ label: 'Cafes', count: '99+' })}</div></div>`],
    ['The count in the corner of an icon-only tab or an icon button: 16px, accent, 11px bold, 3px from the outer top and right edge. One digit is a circle; two digits and 99+ widen.', `<div class="pm-line"><div class="sdk-tabs" role="group" aria-label="Icon tabs"><button type="button" class="sdk-tab sdk-tab-icon" aria-label="Chat, 3 unread" title="Chat"><i class="sdk-tab-glyph fa-solid fa-comments" aria-hidden="true"></i><span class="sdk-badge sdk-badge-corner">3</span></button><button type="button" class="sdk-tab sdk-tab-icon" aria-pressed="true" aria-label="Chat, 24 unread" title="Chat"><i class="sdk-tab-glyph fa-solid fa-comments" aria-hidden="true"></i><span class="sdk-badge sdk-badge-corner">24</span></button><button type="button" class="sdk-tab sdk-tab-icon" aria-label="Chat, more than 99 unread" title="Chat"><i class="sdk-tab-glyph fa-solid fa-comments" aria-hidden="true"></i><span class="sdk-badge sdk-badge-corner">99+</span></button></div>
      <div class="sdk-tabs sdk-tabs-small" role="group" aria-label="Small icon tabs"><button type="button" class="sdk-tab sdk-tab-icon" aria-label="Chat, 3 unread" title="Chat"><i class="sdk-tab-glyph fa-solid fa-comments" aria-hidden="true"></i><span class="sdk-badge sdk-badge-corner">3</span></button><button type="button" class="sdk-tab sdk-tab-icon" aria-label="Chat, more than 99 unread" title="Chat"><i class="sdk-tab-glyph fa-solid fa-comments" aria-hidden="true"></i><span class="sdk-badge sdk-badge-corner">99+</span></button></div>
      <button type="button" class="sdk-icon-btn" aria-label="Notifications, 5 new" title="Notifications">${fa('bell')}<span class="sdk-badge sdk-badge-corner">5</span></button>
      <button type="button" class="sdk-icon-btn btn-small" aria-label="Notifications, 5 new" title="Notifications">${fa('bell')}<span class="sdk-badge sdk-badge-corner">5</span></button></div>`],
    ['The dot: 7px, where a number is not useful (something is new, a change is not saved). It is said in words to a screen reader.', `<div class="pm-line"><div class="sdk-tabs" role="group" aria-label="With a dot"><button type="button" class="sdk-tab"><span class="sdk-tab-word">People</span><span class="sdk-dot" aria-hidden="true"></span><span class="visually-hidden">Unsaved changes</span></button><button type="button" class="sdk-tab sdk-tab-icon" aria-label="Chat, new messages" title="Chat"><i class="sdk-tab-glyph fa-solid fa-comments" aria-hidden="true"></i><span class="sdk-dot sdk-dot-corner" aria-hidden="true"></span></button></div>
      <button type="button" class="sdk-icon-btn" aria-label="Notifications, new" title="Notifications">${fa('bell')}<span class="sdk-dot sdk-dot-corner" aria-hidden="true"></span></button></div>`],
    ['Unread dots on a tab or in the nav stay the 7px dot. The number is for a count you act on; the dot is for "there is something".', `<div class="pm-box"><div class="pm-mock"><span class="pm-mock-t">Rule</span><div class="sdk-chips">${status({ label: '1 to 99: the number', tone: 'neutral' })}${status({ label: 'More than 99: 99+', tone: 'neutral' })}${status({ label: 'Not useful: the dot', tone: 'neutral' })}</div></div></div>`],
  ])}</div>`;

  const peopleBody = () => `<div class="ds-proposed">${sections([
    ['People to pick from: an avatar or the first letter, then the name. Selected is the neutral fill. A long name is cut with an ellipsis.', `<div class="pm-box"><div class="sdk-chips">${person({ name: 'Maria', tone: 'teal', sel: true })}${person({ name: 'Jon', tone: 'orange' })}${person({ name: 'Priya', tone: 'purple', sel: true })}${person({ name: 'Bartholomew Wojciechowski-Smith', tone: 'pink' })}${person({ name: 'Sam', tone: 'blue', dis: true })}</div></div>`],
    ['As today\'s markup: a label around a tick box (<code>.sdk-people > label</code>). The box is hidden; the label is the chip and shows the focus.', `<div class="sdk-people" role="group" aria-label="Who is coming" style="display:flex;flex-wrap:wrap;gap:8px 6px"><label><input type="checkbox" checked><span class="sdk-chip-avatar" data-tint="teal" aria-hidden="true">M</span><span class="sdk-chip-label">Maria</span></label><label><input type="checkbox"><span class="sdk-chip-avatar" data-tint="orange" aria-hidden="true">J</span><span class="sdk-chip-label">Jon</span></label><label><input type="checkbox" checked><span class="sdk-chip-avatar" data-tint="purple" aria-hidden="true">P</span><span class="sdk-chip-label">Priya</span></label></div>`],
  ])}</div>`;

  const statusBody = () => `<div class="ds-proposed">${sections([
    ['Words first. The tint is the tone, never the only signal. An icon or a dot is optional.', `<div class="pm-box"><div class="sdk-chips">${status({ label: 'Booked', tone: 'ok', icon: 'check' })}${status({ label: 'Now', tone: 'info', dot: true })}${status({ label: 'Main', tone: 'info' })}${status({ label: 'Past due', tone: 'warn', icon: 'triangle-exclamation' })}${status({ label: 'Suspended', tone: 'danger', icon: 'ban' })}${status({ label: 'Past' })}${status({ label: 'Draft' })}${status({ label: 'Active', tone: 'ok', dot: true })}</div></div>`],
    ['The old 9 to 10px caps tags (<code>.stream-badge</code>, <code>.phase-tag-now</code>) become tags at 12px. Normal case; small caps are one token (<code>--chip-caps</code>).', `<div class="pm-box"><div class="sdk-chips">${tag({ label: 'Aside', tone: 'purple' })}${tag({ label: 'Now', tone: 'blue' })}<span class="sdk-chip-tag" data-tint="purple" style="--chip-caps: small-caps">Aside, small caps</span></div></div>`],
  ])}</div>`;

  // The aliases: today's class names and markup, drawn as they are in the product.
  const aliasBody = () => `<div class="ds-proposed">${sections([
    ['Choice chip: <code>.filter-chip.on</code> with <code>.count</code>, <code>.bgpick-chip</code>, Places\' <code>.chip</code>, Budget\'s <code>.chip-btn.on</code>, Research\'s <code>.rs-chip</code>', `<div class="sdk-chips"><button type="button" class="filter-chip on">All <span class="count">24</span></button><button type="button" class="filter-chip">Booked <span class="count">6</span></button><button type="button" class="bgpick-chip">Sunset</button><button type="button" class="bgpick-chip on">Night</button><button type="button" class="chip" data-tint="teal">${fa('landmark')}Museums</button><button type="button" class="chip-btn on">Groceries</button><button type="button" class="rs-chip on">Notes</button><button type="button" class="rs-chip">Links</button></div>`],
    ['Tag: <code>.tag</code> (Polls, Calendar), <code>.host-menu-tag</code>, <code>.pill</code> and <code>.pill.warn</code> (Planner), <code>.phase-tag</code>, <code>.stream-badge</code>, <code>.phase-tag-now</code>', `<div class="sdk-chips"><span class="tag">Option 2</span><span class="tag ref">Option 3</span><span class="host-menu-tag">New</span><span class="pill">Flight</span><span class="pill warn">Check in</span><span class="phase-tag">Arrival</span><span class="stream-badge">Aside</span><span class="phase-tag-now">Now</span></div>`],
    ['Removable: Research\'s <code>.rs-chip.tag</code> with its <code>.x</code>', `<div class="sdk-chips"><span class="rs-chip tag" data-tint="blue">Museums<button type="button" class="x" aria-label="Remove Museums">${fa('xmark')}</button></span></div>`],
    ['Status: <code>.badge-ok</code>, <code>.phase-chip</code>', `<div class="sdk-chips"><span class="badge-ok">Active</span><span class="phase-chip">Day 2 of 5</span></div>`],
    ['Count: <code>.count</code>, <code>.whos-around-count</code>, <code>.badge</code> (and <code>.nav-badge</code> on an icon)', `<div class="pm-line"><span class="whos-around-count">4</span><span class="badge">12</span><span class="pm-mock"><span class="sdk-tabs"><button type="button" class="sdk-tab sdk-tab-icon" aria-label="Chat" title="Chat"><i class="sdk-tab-glyph fa-solid fa-comments" aria-hidden="true"></i><span class="nav-badge">3</span></button></span></span></div>`],
    ['People: <code>.sdk-people > label</code>, and a day: <code>.daychip</code>', `<div class="sdk-people" role="group" aria-label="Who is coming" style="display:flex;flex-wrap:wrap;gap:8px 6px;margin-bottom:8px"><label><input type="checkbox" checked><span class="sdk-chip-avatar" data-tint="teal" aria-hidden="true">M</span><span class="sdk-chip-label">Maria</span></label><label><input type="checkbox"><span class="sdk-chip-avatar" data-tint="orange" aria-hidden="true">J</span><span class="sdk-chip-label">Jon</span></label></div><div class="sdk-chips"><button type="button" class="daychip"><span>Mon</span><b>12</b></button><button type="button" class="daychip on"><span>Tue</span><b>13</b></button></div>`],
  ])}</div>`;

  const widthBody = () => `<div class="ds-proposed" data-fit>
    <div class="sdk-chips">${chip({ label: 'All', count: 24, sel: true })}${chip({ label: 'Museums', icon: 'landmark', count: 12 })}${chip({ label: 'Parks', tone: 'green' })}${chip({ label: 'Cafes and bakeries', tone: 'gold' })}${chip({ label: 'Markets', tone: 'orange' })}</div>
    <div class="sdk-chips" style="margin-top:12px">${person({ name: 'Maria', tone: 'teal', sel: true })}${person({ name: 'Jon', tone: 'orange' })}${person({ name: 'Bartholomew Wojciechowski-Smith', tone: 'pink' })}</div>
    <div class="sdk-chips" style="margin-top:12px">${tag({ label: 'Dining', tone: 'gold' })}${removable({ label: 'Nightlife', tone: 'purple', dot: true })}${removable({ label: 'Under 20 euro' })}${status({ label: 'Booked', tone: 'ok' })}${status({ label: 'Past due', tone: 'warn' })}</div>
    <div class="pm-tbar" style="margin-top:12px"><div class="sdk-tabs sdk-tabs-small"><button type="button" class="sdk-tab sdk-tab-icon" aria-label="Chat" title="Chat"><i class="sdk-tab-glyph fa-solid fa-comments" aria-hidden="true"></i><span class="sdk-badge sdk-badge-corner">9</span></button></div><button type="button" class="sdk-icon-btn" aria-label="Notifications" title="Notifications">${fa('bell')}<span class="sdk-dot sdk-dot-corner" aria-hidden="true"></span></button></div>
  </div>`;

  const phoneBody = () => `<div class="ds-proposed">
    <p class="pm-cap">Choice and people chips keep their 30px look and have a 44px hit area (rows of chips are 14px apart so two hit areas do not overlap). The x of a removable chip is 20px with a 44px hit area.</p>
    <div class="sdk-chips">${chip({ label: 'All', count: 24, sel: true })}${chip({ label: 'Museums', icon: 'landmark' })}${chip({ label: 'Parks', tone: 'green' })}${person({ name: 'Maria', tone: 'teal' })}${person({ name: 'Jon', tone: 'orange', sel: true })}</div>
    <div class="sdk-chips" style="margin-top:14px">${removable({ label: 'Nightlife', tone: 'purple', dot: true })}${removable({ label: 'Under 20 euro' })}</div></div>`;

  // ---- contrast ----
  // Each row: what, text (a colour expression), the fills under it in order (tokens start with --), the least ratio.
  const ROWS = [];
  for (const [sn, sv] of [['panel', '--bg-section'], ['card', '--bg-card']]) {
    for (const k of TONES) ROWS.push([`Tag text, ${k} tint, on a ${sn}`, `color-mix(in srgb, var(--tint-${k}) 45%, var(--text))`, [sv, `color-mix(in srgb, var(--tint-${k}) 18%, transparent)`], 4.5]);
  }
  for (const [nm, tone] of [['Ok', '--ok'], ['Warn', '--warn'], ['Danger', '--danger'], ['Info (accent)', '--accent']]) for (const [sn, sv] of [['panel', '--bg-section'], ['card', '--bg-card']]) ROWS.push([`Status text, ${nm}, on a ${sn}`, `color-mix(in srgb, var(${tone}) 45%, var(--text))`, [sv, `color-mix(in srgb, var(${tone}) 18%, transparent)`], 4.5]);
  ROWS.push(['Neutral tag and status text (--text) on its fill (text 8%), on a panel', 'var(--text)', ['--bg-section', 'color-mix(in srgb, var(--text) 8%, transparent)'], 4.5]);
  ROWS.push(['Neutral tag and status text on its fill, on a card', 'var(--text)', ['--bg-card', 'color-mix(in srgb, var(--text) 8%, transparent)'], 4.5]);
  ROWS.push(['Choice chip rest text (--text) on its fill (text 8%), on the page', 'var(--text)', ['--bg', 'color-mix(in srgb, var(--text) 8%, transparent)'], 4.5]);
  ROWS.push(['Choice chip hover text on its hover fill (text 14%), on a panel', 'var(--text)', ['--bg-section', 'color-mix(in srgb, var(--text) 14%, transparent)'], 4.5]);
  ROWS.push(['Selected text (accent 55% into text) on the selected fill, on a panel', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg-section', '--selected-bg'], 4.5]);
  ROWS.push(['The same, on the page', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg', '--selected-bg'], 4.5]);
  ROWS.push(['Selected and hovered, as drawn here (text: accent 35% into text; fill: accent 36%), on a panel', 'color-mix(in srgb, var(--accent) 35%, var(--text))', ['--bg-section', 'color-mix(in srgb, var(--accent) 36%, transparent)'], 4.5]);
  ROWS.push(['Selected and hovered, the Tabs pair (text: accent 55% into text; fill: accent 38%), on a panel. Not used here: shown to compare', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg-section', 'color-mix(in srgb, var(--accent) 38%, transparent)'], 4.5]);
  ROWS.push(['Count text (--text) on its pill (text 14%), on a panel', 'var(--text)', ['--bg-section', 'color-mix(in srgb, var(--text) 14%, transparent)'], 4.5]);
  ROWS.push(['Count text on its pill, in a selected chip', 'var(--text)', ['--bg-section', '--selected-bg', 'color-mix(in srgb, var(--text) 14%, transparent)'], 4.5]);
  ROWS.push(['Corner count, as drawn (--on-accent on --accent 88% into --text)', 'var(--on-accent)', ['color-mix(in srgb, var(--accent) 88%, var(--text))'], 4.5]);
  ROWS.push(['Corner count with the plain --accent (the Tabs count). Not used here: shown to compare', 'var(--on-accent)', ['--accent'], 4.5]);
  ROWS.push(['Dot (--accent) on the page', 'var(--accent)', ['--bg'], 3]);
  ROWS.push(['Focus outline (--accent) on the page', 'var(--accent)', ['--bg'], 3]);
  ROWS.push(['Focus outline on the selected fill, as drawn (the accent mix)', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg-section', '--selected-bg'], 3]);
  for (const k of TONES) ROWS.push([`Category dot, ${k}, on its tint fill, on a panel`, `var(--tint-${k})`, ['--bg-section', `color-mix(in srgb, var(--tint-${k}) 18%, transparent)`], 3]);
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const tcBody = () => `<div class="ds-proposed"><table class="pm-ct"><thead><tr><th>Pair</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${ROWS.map((r) => `<tr data-fg="${esc(r[1])}" data-bgs="${esc(JSON.stringify(r[2]))}" data-min="${r[3]}"><td>${r[0]}</td><td class="pm-n" data-out="r"></td><td class="pm-n">${r[3]}:1</td><td data-out="p"></td></tr>`).join('')}</tbody></table></div>`;
  const measureContrast = (doc) => {
    const host = doc.querySelector('.ds-proposed');
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const col = (expr) => { const p = doc.createElement('span'); p.style.color = expr.startsWith('--') ? `var(${expr})` : expr; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (d) => 0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]);
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-ct tbody tr')) {
        g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillRect(0, 0, 1, 1); g.clearRect(0, 0, 1, 1);
        for (const l of JSON.parse(tr.dataset.bgs)) { g.fillStyle = col(l); g.fillRect(0, 0, 1, 1); }
        const base = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        g.fillStyle = col(tr.dataset.fg); g.fillRect(0, 0, 1, 1);
        const top = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        const a = lum(top); const b = lum(base);
        const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const ok = r >= Number(tr.dataset.min);
        const p = tr.querySelector('[data-out="p"]'); p.textContent = ok ? 'Passes' : 'Fails'; p.className = ok ? 'pm-pass' : 'pm-fail';
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  // The behaviour a chip needs, drawn in each example frame: a press toggles a choice chip, a person (button or tick box), and the x removes a
  // removable chip. In the product this is the page's or module's own script; the component's CSS does none of it.
  function chipsDemo(doc) {
    doc.addEventListener('click', (e) => {
      const x = e.target.closest && e.target.closest('.sdk-chip-x, .x');
      if (x) { const c = x.parentElement; c.hidden = true; return; }
      const c = e.target.closest && e.target.closest('button.sdk-chip, button.sdk-chip-people, button.filter-chip, button.bgpick-chip, button.chip, button.chip-btn, button.rs-chip, button.daychip');
      if (c && !c.disabled && c.hasAttribute('aria-pressed')) c.setAttribute('aria-pressed', String(c.getAttribute('aria-pressed') !== 'true'));
      else if (c && !c.disabled) c.classList.toggle('on');
    });
  }

  function renderChips(api) {
    const { mk, h } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="chips-h"><a href="#chips">Chips, badges and counts</a></h3><span class="ds-status-chip ds-st-proposed">Proposed</span><span class="ds-count">choice chips, people chips, tags, removable chips, status labels, counts and dots: one family with roles</span></header>
<p class="ds-desc"><b>Decided 2026-10-18 (the rules); drawn here for review (the details marked "Thomas decides").</b> (1) One family with roles: the choice chip and the people chip are 30px high, the tag, the removable chip and the status label are 24px. (2) One corner everywhere: <code>--radius-small</code>, never fully round. (3) Selected is the quiet neutral fill (<code>--selected-bg</code>) with the accent mix for the text, the same as Buttons and Tabs. (4) No text under 11px: tags 12px, choice chips 13px. (5) A category colour is a tint fill with readable text, never a coloured border or bar, and a text label is always there. (6) Counts: an 18px neutral count after a label, a 16px accent count on an icon-only tab or icon button, capped at 99+, and a 7px dot where a number is not useful. (7) On a phone every pressable chip keeps its look and has a 44px hit area. Hover, selected and focus work as in Buttons and Tabs: a fill, never an edge; focus is the 2px outline over the hairline.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#chips-anatomy">Anatomy</a><a href="#chips-roles">Roles and sizes</a><a href="#chips-guide">Which one</a><a href="#chips-states">States</a><a href="#chips-tint">Category tints</a><a href="#chips-people">People chips</a><a href="#chips-status">Status labels</a><a href="#chips-count">Counts and dots</a><a href="#chips-phone">On a phone</a><a href="#chips-alias">Aliases</a><a href="#chips-map">Today to proposed</a><a href="#chips-contrast">Contrast</a><a href="#chips-tokens">Tokens</a><a href="#chips-markup">Markup</a><a href="#chips-widths">Widths</a></nav>

<h4 class="ds-h4" id="chips-anatomy">Anatomy</h4>
<div data-slot="zoom"></div>
${dim([
    ['1 Shape', 'Height by role (30px or 24px). Corners <code>--radius-small</code>. A 1px edge that is transparent in every state, so a selected chip is the same box as one at rest. Never wraps its label; a long label is cut with an ellipsis (the label is <code>.sdk-chip-label</code>).'],
    ['2 Fill', 'Choice chip rest: <code>--text</code> at 8%. Hover 14%, pressed 20%. Selected: <code>--selected-bg</code>. Selected and hovered: <code>--accent</code> at 36%, with a slightly darker text mix (see Contrast). Tag and status label: neutral, or the tone (see 4). A state is a fill, never an edge.'],
    ['3 Icon or dot', 'Optional. An icon is 14px (12px in a tag), a dot is 7px. Either is only a help: the word is always there.'],
    ['4 Tone', 'A category colour is the tone at 18% mixed into the surface the chip sits on (<code>--chip-surface</code>), with the text the tone mixed 45% toward <code>--text</code>. No coloured border, no bar. The tone comes from <code>data-tint="blue"</code> (the eight <code>--tint-*</code>) or <code>data-tone="ok | warn | danger | info"</code>.'],
    ['5 Label', '13px (choice and people) or 12px (tag, removable, status), weight 500 (600 when selected, and on a status label). Sentence case. <code>--chip-caps</code> may make a tag small caps; no tag is upper case.'],
    ['6 Count', 'Optional, after the label: the neutral 18px count. Its fill is <code>--text</code> at 14% so it reads on a selected chip too.'],
    ['7 The x', 'Removable only: a 20px Quiet button at the end, <code>--radius-min</code>, with its own hover and focus. 44px hit area on a phone.'],
    ['8 Focus', 'A 2px <code>--accent</code> outline drawn over the 1px edge, inside the box (offset -2px): the Fields and Tabs mechanism, equal on all four sides at any display scale. On a selected chip the outline is the accent mix.'],
  ])}

<h4 class="ds-h4" id="chips-roles">Roles and sizes</h4>
<p class="ds-desc">All the roles side by side, at their sizes.</p>
<div data-slot="roles"></div>
${tbl(['Role', 'Class', 'Height', 'Text', 'Use it for'], [
    ['Choice chip', '<code>.sdk-chip</code>', '30px (hit area 44px on a phone)', '13px', 'A filter, a pick, a choice of a few. Pressed, selected is <code>aria-pressed="true"</code>.'],
    ['People chip', '<code>.sdk-chip-people</code>', '30px (44px hit area)', '13px', 'Picking people. Avatar 22px, round (a person, not a chip).'],
    ['Tag', '<code>.sdk-chip-tag</code>', '24px', '12px', 'What a thing is. Not pressed (a link or button tag gets a hover and a focus).'],
    ['Removable chip', '<code>.sdk-chip-removable</code>', '24px (x hit area 44px on a phone)', '12px', 'A filter or a choice already applied, which you can take off.'],
    ['Status label', '<code>.sdk-status</code>', '24px', '12px, weight 600', 'The condition of a thing, in words: Booked, Now, Main, Past due, Suspended. Never pressed.'],
    ['Count', '<code>.sdk-badge</code>', '18px', '11px bold', 'A number after a label or in a chip. Capped at 99+.'],
    ['Corner count', '<code>.sdk-badge.sdk-badge-corner</code>', '16px', '11px bold', 'A number on an icon-only tab or an icon button, in the corner. Accent.'],
    ['Dot', '<code>.sdk-dot</code>', '7px', 'none', 'Something is new or not saved, where a number is not useful.'],
  ])}

<h4 class="ds-h4" id="chips-guide">Tag, choice chip or status label</h4>
${tbl(['If it...', 'Use', 'Because'], [
    ['changes what you see or what is chosen when you press it', 'Choice chip', 'It has a selected state. It is 30px and sits in a row of equals.'],
    ['says what a thing is (a category, a topic, a kind)', 'Tag (tinted if the category has a colour)', 'It is read, not pressed. If it must be pressed (a link), it is still a tag: only the hover and focus are added.'],
    ['says how a thing stands (Booked, Past due, Suspended)', 'Status label', 'It always has words, and a tone that means something: ok, warn, danger or info. Neutral for Draft and Past.'],
    ['is already applied and can be taken off', 'Removable chip', 'A tag with an x. The x is a button with its own name ("Remove Museums").'],
    ['is a number', 'Count', 'After a label, or in a corner for an icon alone.'],
    ['is "something is new"', 'Dot', 'No number to give. Say it in hidden words too.'],
  ])}
<div data-slot="guide"></div>

<h4 class="ds-h4" id="chips-states">States</h4>
<p class="ds-desc">Every kind in every state, forced from the proposed rules: Rest, Hover, Focus, Selected, Selected and hovered, Selected and focused, Disabled (half strength, no pointer). The Dark and Light switch changes every example, and so does the width control.</p>
<p class="ds-desc"><b>Choice chip (30px)</b></p>
<div data-slot="choice"></div>
<p class="ds-desc"><b>Tags, removable chips and status labels (24px)</b></p>
<div data-slot="others"></div>
<p class="ds-desc"><b>People chip (30px)</b></p>
<div data-slot="peoplegrid"></div>

<h4 class="ds-h4" id="chips-tint">Category tints</h4>
<p class="ds-desc">The eight <code>--tint-*</code> tones as a tint fill with readable text, on a panel and on a card. The fill is the tone 18% into the surface; the text is the tone 45% toward <code>--text</code>. Flip the Dark and Light switch: the contrast table below follows. A coloured edge or bar is never used. (Calendar keeps the left bar on <code>.chip.ext</code> and <code>.chip.marker</code>, Thomas's approved exception; those are event blocks, not chips, and are in the Calendar events family.)</p>
<div data-slot="tint"></div>

<h4 class="ds-h4" id="chips-people">People chips</h4>
<div data-slot="people"></div>

<h4 class="ds-h4" id="chips-status">Status labels</h4>
<div data-slot="status"></div>

<h4 class="ds-h4" id="chips-count">Counts and dots</h4>
<p class="ds-desc"><b>Reconciled with Tabs.</b> The approved Tabs family draws the icon-only tab count as 14px with 9px text, 3px in from the top and right. That text is under 11px, so this family makes it 16px with 11px text, at the same inset (3px from the outer top and right edge; the dot 5px). The count grows 2px; its position does not change. It is drawn here on the Tabs and the icon buttons with <code>.sdk-badge.sdk-badge-corner</code>; <code>proposed-tabs.css</code> was not edited, so Tabs still shows the older 14px count until Thomas approves the swap (Thomas decides). The 18px count after a label and the 7px dot are the same as Tabs.</p>
<div data-slot="count"></div>

<h4 class="ds-h4" id="chips-phone">On a phone</h4>
<p class="ds-desc">390px wide: chips keep their look; the hit area is 44px (<code>::before</code>, 7px more above and below a 30px chip).</p>
<div data-slot="phone"></div>

<h4 class="ds-h4" id="chips-alias">Aliases: today's markup, unchanged</h4>
<p class="ds-desc">These use only today's class names and take the proposed look with no markup edit. Three notes. (1) <b><code>.chip</code> means three things today</b>: Places' filter chip (an alias here), Calendar's event block (not a chip: it belongs to the Calendar events family and keeps its own rules, with Thomas's left-bar exception on <code>.chip.ext</code> and <code>.chip.marker</code>), and the chip of the status strip, <code>.phase-chip</code> (a status label here). The stylesheet of a module is its own, so the Places alias does not reach Calendar. New markup uses <code>.sdk-chip</code>. (2) <b><code>.tag</code> means two things</b> in the modules (Polls and Calendar draw the same outlined tag; Research's <code>.rcard .tag</code> and the Assistant's <code>.aicard .tag</code> are tinted variants); all become <code>.sdk-chip-tag</code>. (3) <b><code>.badge</code></b> is a count here; in the Planner it is also a 34px square number tile, which is not a count and is left to the Day cards family.</p>
<div data-slot="alias"></div>

<h4 class="ds-h4" id="chips-map">Today to proposed</h4>
<p class="ds-desc">Written from the brief; not loaded here (Today's page shows these as they are). Every one takes the new look through its alias, with no markup change, unless noted.</p>
${tbl(['Today', 'Where', 'Proposed', 'What changes visually'], [
    ['<code>.filter-chip</code>: 30px, round, solid accent when on', 'The filter rows of modules', 'Choice chip', 'Round ends to the small corner. Solid accent selected becomes the neutral fill with darker accent text. Its <code>.count</code> becomes the 18px neutral count. Rest gets a quiet fill instead of an accent-tinted edge.'],
    ['<code>.bgpick-chip</code>: 28px, round, solid accent when on', 'The background picker', 'Choice chip', '28 to 30px. Round to the small corner. Selected is the neutral fill.'],
    ['Places <code>.chip</code>: 26px, round, solid accent or solid tone when on; the tone on its icon', 'Places', 'Choice chip with <code>data-tint</code>', '26 to 30px. The tone stays on the dot or icon; selected is the neutral fill, not the solid tone.'],
    ['Research <code>.rs-chip</code>: 22px, small corner, solid accent when on', 'Research', 'Choice chip', '22 to 30px. Selected is the neutral fill.'],
    ['Budget <code>.chip-btn</code>: 28px, selected-bg when on', 'Budget', 'Choice chip', '28 to 30px. Same selected fill, now with the accent-mix text.'],
    ['<code>.sdk-people > label</code>: 32px, round', 'The people pickers', 'People chip', '32 to 30px. Round to the small corner. Selected is the neutral fill.'],
    ['<code>.daychip</code>: stacked weekday and number, solid accent when current', 'The Planner\'s day row', 'Choice chip layout kept (stacked)', 'Fills and corner follow the chip. The day card itself is for the Day cards family.'],
    ['Polls and Calendar <code>.tag</code>: 10px text, round, outlined', 'Polls, Calendar', 'Tag', '10 to 12px text. Round outline to a neutral fill with the small corner. 24px high.'],
    ['<code>.host-menu-tag</code>', 'The host menu', 'Tag', 'Same tag; 12px.'],
    ['Research <code>.rcard .tag</code>: dot and a tinted border', 'Research cards', 'Tag with a dot, tinted', 'The tinted border goes; the fill is the tint. The dot stays.'],
    ['Removable <code>.rs-chip.tag</code> with <code>.x</code>', 'Research', 'Removable chip', 'Tag height (24px) with a 20px x button that has its own hover and focus. Tinted border to tint fill.'],
    ['Planner <code>.pill</code>: 20px, tint fill and tint border; <code>.pill.warn</code> in a hard-coded gold', 'The Planner\'s cards', 'Tag; warn is the <code>--warn</code> tone', '20 to 24px. The tint border goes. The gold becomes a token that has a dark value for the light mode.'],
    ['<code>.phase-tag</code>', 'The Planner\'s phases', 'Tag', 'Tint fill, no edge.'],
    ['<code>.stream-badge</code> (9px caps) and <code>.phase-tag-now</code> (9 to 10px caps)', 'Call streams, the phases', 'Tag at 12px, normal case', 'Retired as caps. 12px, sentence case. Small caps are one token (<code>--chip-caps</code>).'],
    ['Count badges in 8 sizes, 14 to 20px (<code>.count</code>, <code>.badge</code>, <code>.nav-badge</code>, tab counts)', 'Tabs, nav, filters', 'Count 18px, corner count 16px, dot 7px', 'Eight sizes become three. 99+ cap everywhere.'],
    ['<code>.badge-ok</code>: green', 'Filters and lists', 'Status label, ok', 'Words on a green tint fill.'],
    ['<code>.whos-around-count</code>: tint', 'The status strip', 'Count', 'Neutral 18px pill.'],
    ['<code>.phase-chip</code> in the status strip', 'The status strip', 'Status label', 'A tint fill with the label; 24px.'],
    ['Calendar event blocks <code>.chip</code>, <code>.chip.ext</code>, <code>.chip.marker</code>', 'Calendar', 'Not part of this family', 'The Calendar events family. The left bar on <code>.chip.ext</code> and <code>.chip.marker</code> is Thomas\'s approved exception and stays.'],
  ])}

<h4 class="ds-h4" id="chips-contrast">Contrast</h4>
<p class="ds-desc">Worked out by this page, in the mode on show: flip the Dark and Light switch and the table follows. Text needs 4.5 to 1; a dot and the focus outline need 3 to 1.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="chips-tokens">Tokens</h4>
${tbl(['Token', 'Use here', ''], [
    ['<code>--chip-h</code>, <code>--chip-h-tag</code>', 'The two heights: 30px and 24px.', 'new'],
    ['<code>--chip-font</code>, <code>--chip-font-tag</code>', '13px and 12px.', 'new'],
    ['<code>--chip-pad-x</code>, <code>--chip-pad-x-tag</code>, <code>--chip-gap</code>', '10px and 8px side padding; 6px between icon and label.', 'new'],
    ['<code>--chip-avatar</code>, <code>--chip-x</code>', '22px avatar; 20px x button.', 'new'],
    ['<code>--chip-fill</code>, <code>--chip-fill-hover</code>, <code>--chip-fill-active</code>', '<code>--text</code> at 8%, 14% and 20%.', 'new'],
    ['<code>--chip-tint</code>, <code>--chip-surface</code>, <code>--chip-tone</code>', 'The tint strength (18%), the surface the chip sits on (<code>--bg-section</code>; <code>--bg-card</code> in a card), the tone of this chip.', 'new'],
    ['<code>--chip-caps</code>', '<code>none</code> or <code>small-caps</code> for tags.', 'new'],
    ['<code>--warn</code>', 'The warning tone: replaces the hard-coded <code>#e0b25a</code>. Here it is <code>--tint-gold</code>, so it has a dark value for the light mode (Thomas decides the name).', 'new'],
    ['<code>--selected-bg</code>', 'The selected fill.', 'exists'],
    ['<code>--accent</code>, <code>--on-accent</code>', 'The selected text (mixed 55% into text), the dot, the focus outline, the corner count.', 'exists'],
    ['<code>--tint-gold</code> ... <code>--tint-pink</code>, <code>--ok</code>, <code>--danger</code>', 'The tones.', 'exists'],
    ['<code>--radius-small</code>, <code>--radius-min</code>, <code>--radius-round</code>', 'The chip; the x button; the counts, the dot and the avatar.', 'exists'],
  ])}

<h4 class="ds-h4" id="chips-markup">Markup contract</h4>
${code(`<!-- a row of choice chips. Selected is aria-pressed="true" -->
<div class="sdk-chips" role="group" aria-label="Show">
  <button type="button" class="sdk-chip" aria-pressed="true"><span class="sdk-chip-label">All</span><span class="sdk-badge">24</span></button>
  <button type="button" class="sdk-chip" aria-pressed="false" data-tint="purple"><span class="sdk-chip-dot" aria-hidden="true"></span><span class="sdk-chip-label">Museums</span></button>
</div>

<!-- a person -->
<button type="button" class="sdk-chip-people" aria-pressed="false"><span class="sdk-chip-avatar" data-tint="teal" aria-hidden="true">M</span><span class="sdk-chip-label">Maria</span></button>

<!-- a tag (tinted if it has a category), a status label -->
<span class="sdk-chip-tag" data-tint="green"><span class="sdk-chip-label">Nature</span></span>
<span class="sdk-status" data-tone="warn"><span class="sdk-chip-label">Past due</span></span>

<!-- a removable chip: the x is a button with its own name -->
<span class="sdk-chip-removable"><span class="sdk-chip-label">Museums</span><button type="button" class="sdk-chip-x" aria-label="Remove Museums"><i class="fa-solid fa-xmark" aria-hidden="true"></i></button></span>

<!-- counts and dots: the parent of a corner count is positioned (a tab and an icon button already are) -->
<span class="sdk-badge">3</span>
<button type="button" class="sdk-icon-btn" aria-label="Notifications, 5 new">...<span class="sdk-badge sdk-badge-corner">5</span></button>
<span class="sdk-dot" aria-hidden="true"></span><span class="visually-hidden">Unsaved changes</span>`)}
<p class="ds-desc"><b>Names kept so no consumer has to change.</b> Choice: <code>.filter-chip</code>, <code>.bgpick-chip</code>, <code>.chip</code> (Places), <code>.chip-btn</code>, <code>.rs-chip</code>, <code>.daychip</code>, with <code>.on</code>. People: <code>.sdk-people &gt; label</code>. Tags: <code>.tag</code>, <code>.host-menu-tag</code>, <code>.pill</code> (and <code>.pill.warn</code>), <code>.phase-tag</code>, <code>.stream-badge</code>, <code>.phase-tag-now</code>, <code>.phase-tag-main</code>. Removable: <code>.rs-chip.tag</code>, <code>.x</code>. Status: <code>.badge-ok</code>, <code>.phase-chip</code>. Counts: <code>.count</code>, <code>.whos-around-count</code>, <code>.badge</code>, <code>.chat-view-count</code>, <code>.nav-badge</code> (the corner count). New names use the <code>sdk-</code> prefix; a module defines no class with it.</p>

<h4 class="ds-h4" id="chips-widths">Widths</h4>
<p class="ds-desc">Chip rows, people, tags and a corner count at 390 (a phone, 44px hit areas), 700 and 1280.</p>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="chips-rules">Usage rules</h4>
<ul class="ds-desc">
  <li>Selected is the fill and the text colour. Never a solid accent fill, a coloured edge or a bar. The solid accent is the Primary button's.</li>
  <li>A category colour is a tint fill with the word on it. Colour alone never says anything: a status label always has its word.</li>
  <li>No text under 11px. Tags and status labels 12px, choice chips 13px, counts 11px.</li>
  <li>A choice chip keeps its category on a dot or icon, not on its fill.</li>
  <li>A count is capped at 99+ and says its meaning in its name ("Chat, 3 unread"). A dot is said in hidden words.</li>
  <li>The x of a removable chip is a button with a name ("Remove Museums"); Delete or Backspace on a focused chip may also remove it.</li>
  <li>On a phone, 44px hit area on every pressable chip and on the x; the look does not grow.</li>
</ul>
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + CH_CSS, onload: chipsDemo }, o || {}));
    slot('zoom').appendChild(F(`<div class="ds-proposed"><div class="pm-zoom" style="zoom:2.5">${chip({ label: 'Museums', icon: 'landmark', count: 12, sel: true })}${tag({ label: 'Nature', tone: 'green', dot: true })}${removable({ label: 'Cafes', tone: 'gold' })}</div></div>`, 'Chips, anatomy sample', { height: 160 }));
    slot('roles').appendChild(F(rolesBody(), 'Chips, roles'));
    slot('guide').appendChild(F(guideBody(), 'Chips, which one'));
    slot('choice').appendChild(F(choiceGrid(), 'Chips, all states'));
    slot('others').appendChild(F(otherStates(), 'Chips, states of the other roles'));
    slot('peoplegrid').appendChild(F(peopleGrid(), 'Chips, people states'));
    slot('tint').appendChild(F(tintBody(), 'Chips, category tints'));
    slot('people').appendChild(F(peopleBody(), 'Chips, people'));
    slot('status').appendChild(F(statusBody(), 'Chips, status labels'));
    slot('count').appendChild(F(countBody(), 'Chips, counts and dots'));
    slot('phone').appendChild(F(phoneBody(), 'Chips, on a phone', { pinWidth: 390 }));
    slot('alias').appendChild(F(aliasBody(), 'Chips, aliases'));
    slot('contrast').appendChild(F(tcBody(), 'Chips, contrast', { onload: measureContrast }));
    const ws = mk('div', '');
    for (const w of [390, 700, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(widthBody(), `Chips at ${w}`, { pinWidth: w }));
    }
    slot('widths').appendChild(ws);
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'chips', covers: ['chips', 'badges', 'counts', 'pills', 'tags'], group: 'Content', name: 'Chips, badges and counts', status: 'proposed',
    words: 'chip chips badge badges count counts pill pills tag tags filter status label people chip removable dot unread category tint choice 99+ warn', render: renderChips,
  });
})();
