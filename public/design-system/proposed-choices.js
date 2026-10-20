/* The Choice rows family (PROPOSED): the whole-row tick box and radio, the boxed row, the switch row, the poll option and the segmented choice (which is the Tabs
   family's joined switch). Loaded by proposed.html through proposed-families.json, after proposed.js (the page engine); it registers one family through
   window.DS_PROPOSED.families.push and draws it with the rules in proposed-choices.css (the box, radio and switch are the Fields family's). Nothing here is a style of
   the product: markup, words and tables only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules (.pm-row, .pm-role ...), from the page engine
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  const CR_CSS = `
.pm-cw { flex: 0 0 200px; width: 200px; min-width: 0; }
.pm-cw .dsf-ex { display: block; }
.pm-panel { box-sizing: border-box; max-width: 460px; padding: 12px; border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-panel h5 { margin: 0 0 6px; font-size: 14px; font-weight: 600; }
.pm-gap { margin-top: 12px; }
.pm-line { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 24px; padding: 6px 0; }
.pm-cap { margin: 0 0 6px; color: var(--text-dim); font-size: 12px; }
.pm-ct { width: 100%; border-collapse: collapse; font-size: 13px; }
.pm-ct th, .pm-ct td { padding: 6px 12px 6px 0; border-bottom: 1px solid var(--border); text-align: left; vertical-align: middle; }
.pm-ct th { color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.pm-ct td.pm-n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.pm-pass { color: var(--ok); font-weight: 600; }
.pm-fail { color: var(--f-error, var(--danger)); font-weight: 600; }
@media (max-width: 640px) { .pm-cw { flex-basis: 100%; width: 100%; } }`;

  const ST = [
    { n: 'Rest' }, { n: 'Hover', c: ' ds-force-hover' }, { n: 'Focus', c: ' ds-force-focus' }, { n: 'Checked', on: true }, { n: 'Checked, hover', c: ' ds-force-hover', on: true },
    { n: 'Disabled', dis: true }, { n: 'Disabled, checked', dis: true, on: true },
  ];
  // One row. o: type, label, desc, cls (extra classes of the row), sw (a switch), poll (a percent), name, on, dis, force.
  const text = (o) => `<span class="sdk-choice-text"><span class="sdk-choice-label">${o.label}</span>${o.desc ? `<span class="sdk-choice-desc">${o.desc}</span>` : ''}</span>`;
  const row = (o) => {
    const fin = (o.force || '').includes('focus') ? ' ds-force-focus' : '';
    const input = `<input type="${o.type}"${o.sw ? ` class="sdk-switch${fin}" role="switch"` : fin ? ` class="${fin.trim()}"` : ''}${o.name ? ` name="${o.name}"` : ''}${o.on ? ' checked' : ''}${o.dis ? ' disabled' : ''}>`;
    const fill = o.poll != null ? `<span class="sdk-progress-behind" role="progressbar" aria-label="${o.label}: ${o.poll} percent of votes" aria-valuenow="${o.poll}" aria-valuemin="0" aria-valuemax="100" style="--pct: ${o.poll}%"></span>` : '';
    const val = o.poll != null ? `<span class="sdk-meter-value">${o.poll}%</span>` : '';
    const body = o.sw ? `${text(o)}${input}` : `${fill}${input}${text(o)}${val}`;
    return `<label class="sdk-choice-row${o.cls ? ' ' + o.cls : ''}${(o.force || '').includes('hover') ? o.force : ''}">${body}</label>`;
  };
  const KINDS = [
    { n: 'Tick box row', o: { type: 'checkbox', label: 'Remind me' } },
    { n: 'Radio row', o: { type: 'radio', label: 'Per person' } },
    { n: 'With a description', o: { type: 'checkbox', label: 'Add to the calendar', desc: 'Shows on the day for everyone.' } },
    { n: 'Switch row', o: { type: 'checkbox', sw: true, label: 'Allow guests' } },
    { n: 'Switch with a description', o: { type: 'checkbox', sw: true, label: 'Tell the others', desc: 'Everyone gets a message when you save.' } },
    { n: 'Boxed, with a description', o: { type: 'radio', cls: 'sdk-choice-boxed', label: 'Trip planner', desc: 'Days, places, a map and a budget.' } },
    { n: 'Poll option', o: { type: 'radio', cls: 'sdk-choice-poll', label: 'Trattoria', poll: 62 } },
  ];
  const matrix = (h44) => `<div class="ds-proposed"${h44 ? ' data-field-h="44"' : ''}>${KINDS.map((k, i) => `<div class="pm-row"><div class="pm-role">${k.n}</div><div class="dsf-states">${ST.map((s, j) => `<div class="dsf-state pm-cw"><small>${s.n}</small><div class="dsf-ex">${row(Object.assign({}, k.o, { name: `r-${h44 ? 'b' : 'a'}-${i}-${j}`, on: s.on, dis: s.dis, force: s.c }))}</div></div>`).join('')}</div></div>`).join('')}</div>`;

  const seg = (opts, at, o = {}) => `<div class="sdk-tabs sdk-tabs-joined sdk-choice${o.small ? ' sdk-tabs-small' : ''}" role="group" aria-label="${o.label}">${opts.map((w, k) => `<button type="button" class="sdk-tab" aria-pressed="${k === at}"><span class="sdk-tab-word">${w}</span></button>`).join('')}</div>`;
  const segBody = () => `<div class="ds-proposed">
    <p class="pm-cap">Two options, default (38px) and small (30px)</p><div class="pm-line">${seg(['Per person', 'For the group'], 0, { label: 'Split the cost' })}${seg(['Per person', 'For the group'], 1, { label: 'Split the cost, small', small: true })}</div>
    <p class="pm-cap">Three options</p><div class="pm-line">${seg(['Day', 'Week', 'Month'], 1, { label: 'Show' })}${seg(['Day', 'Week', 'Month'], 2, { label: 'Show, small', small: true })}</div>
    <p class="pm-cap">Four options: the most</p><div class="pm-line">${seg(['Hotel', 'Hostel', 'Rental', 'Camp'], 2, { label: 'Kind of stay' })}${seg(['Hotel', 'Hostel', 'Rental', 'Camp'], 0, { label: 'Kind of stay, small', small: true })}</div></div>`;

  const useBody = () => `<div class="ds-proposed">
    <div class="pm-panel"><h5>Settings</h5><div class="sdk-choice-list">
      ${row({ type: 'checkbox', sw: true, label: 'Allow guests', on: true })}${row({ type: 'checkbox', sw: true, label: 'Turn the assistant off in this space', desc: 'Nobody can start an AI chat here.' })}${row({ type: 'checkbox', sw: true, label: 'Calendar is always on', on: true, dis: true })}</div></div>
    <div class="pm-panel pm-gap"><h5>Show on the day</h5><div class="sdk-choice-list" role="group" aria-label="Show on the day">
      ${row({ type: 'checkbox', label: 'Flights', on: true })}${row({ type: 'checkbox', label: 'Trains' })}${row({ type: 'checkbox', label: 'Stays', on: true })}${row({ type: 'checkbox', label: 'Meals' })}</div></div>
    <div class="pm-panel pm-gap"><h5>Split the cost</h5><div class="sdk-choice-list" role="radiogroup" aria-label="Split the cost">
      ${row({ type: 'radio', name: 'u-split', label: 'Per person', on: true })}${row({ type: 'radio', name: 'u-split', label: 'For the group' })}${row({ type: 'radio', name: 'u-split', label: 'Only what I add', desc: 'Nothing is shared unless you add it.' })}</div></div>
    <div class="pm-panel pm-gap"><h5>Start from a template</h5><div class="sdk-choice-list" role="radiogroup" aria-label="Template">
      ${row({ type: 'radio', name: 'u-tpl', cls: 'sdk-choice-boxed', label: 'Trip planner', desc: 'Days, places, a map and a budget.', on: true })}${row({ type: 'radio', name: 'u-tpl', cls: 'sdk-choice-boxed', label: 'Game night', desc: 'A poll, a to-do list and a chat.' })}${row({ type: 'radio', name: 'u-tpl', cls: 'sdk-choice-boxed', label: 'Blank', desc: 'Nothing yet. Add what you need.' })}</div></div>
    <div class="pm-panel pm-gap"><h5>Where do we eat on Friday?</h5><div class="sdk-choice-list" role="radiogroup" aria-label="Vote">
      ${row({ type: 'radio', name: 'u-poll', cls: 'sdk-choice-poll', label: 'Trattoria', poll: 62, on: true })}${row({ type: 'radio', name: 'u-poll', cls: 'sdk-choice-poll', label: 'Sushi bar', poll: 25 })}${row({ type: 'radio', name: 'u-poll', cls: 'sdk-choice-poll', label: 'Picnic', poll: 13 })}</div></div>
    <div class="pm-panel pm-gap"><h5>A few short options</h5>${seg(['Per person', 'For the group'], 0, { label: 'Split the cost' })}</div></div>`;

  // Each row: label, foreground token, background token, the least ratio, and the surface the background is drawn over (the --selected-bg is a soft fill).
  const CT_ROWS = [
    ['Label (--text) on the page', '--text', '--bg', 4.5, ''],
    ['Label on the selected fill, on the page', '--text', '--selected-bg', 4.5, '--bg'],
    ['Label on the selected fill, on a panel', '--text', '--selected-bg', 4.5, '--bg-section'],
    ['Description (--text-dim) on a panel', '--text-dim', '--bg-section', 4.5, ''],
    ['Description on a checked or hovered row (--menu-hint-strong)', '--menu-hint-strong', '--selected-bg', 4.5, '--bg-section'],
    ['Tick box edge (--text-dim) on the field fill', '--text-dim', '--bg-input', 3, ''],
    ['Selected fill (--selected-bg) on the page', '--selected-bg', '--bg', 1.1, ''],
  ];
  const contrastBody = () => `<div class="ds-proposed"><table class="pm-ct"><thead><tr><th>Pair</th><th>Colours</th><th>Ratio</th><th>Looked for</th><th></th></tr></thead><tbody>${CT_ROWS.map((r) => `<tr data-fg="${r[1]}" data-bg="${r[2]}" data-min="${r[3]}" data-over="${r[4]}"><td>${r[0]}</td><td><code>${r[1]}</code> on <code>${r[2]}</code></td><td class="pm-n" data-out="r"></td><td class="pm-n">${r[3]}:1</td><td data-out="p"></td></tr>`).join('')}</tbody></table></div>`;
  const measure = (doc) => {
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true });
    const host = doc.querySelector('.ds-proposed');
    const tok = (n) => { const p = doc.createElement('span'); p.style.color = `var(${n})`; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const px = () => { const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const css = (a) => `rgb(${a[0]},${a[1]},${a[2]})`;
    const over = (c, under) => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillRect(0, 0, 1, 1); g.fillStyle = under; g.fillRect(0, 0, 1, 1); g.fillStyle = c; g.fillRect(0, 0, 1, 1); return px(); };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-ct tbody tr')) {
        const bg = over(tok(tr.dataset.bg), tr.dataset.over ? tok(tr.dataset.over) : '#000'); const fg = over(tok(tr.dataset.fg), css(bg));
        const a = lum(fg); const b = lum(bg); const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const ok = r >= Number(tr.dataset.min); const p = tr.querySelector('[data-out="p"]'); p.textContent = ok ? 'Passes' : 'Below'; p.className = ok ? 'pm-pass' : 'pm-fail';
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  function renderChoices(api) {
    const { mk, h } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="choices-h"><a href="#choices">Choice rows</a></h3><span class="ds-status-chip ds-st-proposed">Proposed</span><span class="ds-count">the tick box and radio row, the boxed row, the switch row, the poll option, the segmented choice</span></header>
<p class="ds-desc">Drawn from the research recommendations Thomas approved as a batch on 2026-10-20. <b>One whole-row choice row</b>: the approved 16px tick box or radio on the left, the label, an optional description. 32px high (44px on a phone), hover a quiet fill, <b>checked is the neutral selected fill</b>, focus the 2px outline inside the row. A <b>boxed</b> row only where every option has a description. The <b>switch row</b> for on and off settings. The <b>segmented choice</b> for two to four short options is the Tabs family's joined switch. People chips are in the Chips family. Stylesheet: <code>proposed-choices.css</code>, every rule under <code>.ds-proposed</code>.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#choices-anatomy">Anatomy</a><a href="#choices-states">States</a><a href="#choices-segmented">Segmented</a><a href="#choices-use">In use</a><a href="#choices-widths">Widths</a><a href="#choices-rules">Usage rules</a><a href="#choices-map">Today to proposed</a><a href="#choices-contrast">Contrast</a><a href="#choices-tokens">Tokens</a><a href="#choices-markup">Markup contract</a></nav>

<h4 class="ds-h4" id="choices-anatomy">Anatomy</h4>
${dim([
    ['1 The row', 'A <code>&lt;label class="sdk-choice-row"&gt;</code> around the input and its words: the whole row is the target. <code>--check-h</code> high (32px; 44px on a phone), 8px side padding, <code>--radius-small</code>, 14px text (16px on a phone). Rows in a group are 2px apart (<code>.sdk-choice-list</code>).'],
    ['2 The box', 'The approved Fields tick box or radio: 16px, drawn from tokens, the <code>--text-dim</code> edge, the accent fill and the mark when checked. The native <code>accent-color</code> boxes are gone. On a row with a description the box sits level with the first line.'],
    ['3 Words', 'The label, and under it the description: 12px, <code>--text-dim</code>, one step darker (<code>--menu-hint-strong</code>) on a hovered or checked row, as the Menus hints are.'],
    ['4 Hover and checked', 'Hover is the quiet neutral fill (<code>--menu-hover</code>). <b>Checked is <code>--selected-bg</code></b>, the same neutral fill every other selected thing has; no accent edge and no accent fill on the row (the box carries the accent). A checked row that is hovered takes the Menus current-row hover.'],
    ['5 Focus', 'A 2px accent outline inside the row (offset -2px), the mechanism of Fields, Tabs, Chips and Menus: equal on all four sides at 125% and 150%. The box\'s own ring is then not drawn.'],
    ['6 Disabled', 'The whole row at half strength with a not-allowed cursor.'],
    ['7 Boxed row', 'A card row with a 1px hairline, <code>--radius-medium</code>, 12px padding, a bold label and a description. <b>Only where each option has a description</b> (the template options). Checked is the selected fill, and the hairline stays neutral.'],
    ['8 Switch row', 'The words on the left, the approved 36 by 20 switch at the right. On and off is the switch itself, so the row takes no selected fill. It replaces <code>input.switch</code> (22 by 12) and the Manage switch rows.'],
    ['9 Poll option', 'A choice row with a progress fill behind it: the Progress family\'s <code>.sdk-progress-behind</code> (the accent at 24%), the label and the percent in text on top, a hairline around the row.'],
    ['10 Segmented', 'For two to four short options (a split, a day range, a kind of stay). It is the <b>Tabs family\'s joined switch</b> (<code>.sdk-tabs.sdk-tabs-joined</code>, pills 2px apart, 38px, 30px small), not a second control: identical, so folded. <code>.sdk-choice</code> stays as the name on the wrapper. Choose a segmented control over a radio list only when the labels are one or two words each.'],
  ])}

<h4 class="ds-h4" id="choices-states">States</h4>
<p class="ds-desc">Every row in every state, forced from the proposed rules. A switch row's "Checked" is on.</p>
<p class="ds-desc"><b>32px</b> (the default; 44px when the frame is 640px or narrower)</p>
<div data-slot="m32"></div>
<p class="ds-desc"><b>44px</b> (the phone height, forced here so it can be compared at any width)</p>
<div data-slot="m44"></div>

<h4 class="ds-h4" id="choices-segmented">Segmented choice</h4>
<p class="ds-desc">The Tabs joined switch, used as a form choice: two, three and four options, default and small.</p>
<div data-slot="seg"></div>

<h4 class="ds-h4" id="choices-use">In use</h4>
<p class="ds-desc">Settings (switch rows), a tick list, a radio list (the last with a description), the template options (boxed), a poll, and a segmented choice.</p>
<div data-slot="use"></div>

<h4 class="ds-h4" id="choices-widths">Widths</h4>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="choices-rules">Usage rules</h4>
<ul class="ds-desc">
  <li>A tick box row chooses any; a radio row chooses one of a few; a switch row turns a setting on or off; a segmented choice picks one of two to four short words. Not a tick box with a switch role.</li>
  <li>The label wraps the input: the whole row is the target. The row is never a bare box with words beside it.</li>
  <li>Checked is the neutral fill. A selected thing is never an accent edge or an accent fill, except the box and the switch, which are the control itself.</li>
  <li>Boxed rows only where every option has a description. A list of plain options is plain rows.</li>
  <li>A description says what happens, in one short line (12px). It is not the label again.</li>
  <li>Group rows in a <code>role="group"</code> or <code>role="radiogroup"</code> with a name. A group's title is a <code>.sdk-section-title</code> (Fields).</li>
</ul>

<h4 class="ds-h4" id="choices-map">Today to proposed</h4>
${tbl(['Today', 'Where', 'Proposed'], [
    ['Native boxes with <code>accent-color</code> (the browser\'s box, an accent check)', 'Set up, the layout sheet, forms', 'The Fields 16px box with the <code>--text-dim</code> edge, drawn from tokens.'],
    ['<code>input.switch</code> and <code>label.switch-row</code> (22 by 12)', 'Set up, the layout sheet', 'The switch row with the 36 by 20 switch. <code>.switch</code> stays as an alias of the switch.'],
    ['Manage\'s switch rows (a label and a native box)', 'Manage', 'The switch row.'],
    ['<code>.check</code> and its copies: 13px, 14px, a 28px, 32px and 44px high (<code>.fields .check</code>, <code>.panel label.check</code>, <code>.login label.check</code>, <code>.popover label.check</code>, <code>.template-offer label.check</code>)', 'Manage, the profile, the login, popovers', 'One row (<code>.sdk-choice-row</code>; <code>.check</code> is an alias): 32px, 44px on a phone.'],
    ['<code>.sdk-check</code> (Fields: the row of 32px with no hover or fill)', 'forms', 'The same row, with hover and the checked fill; at adoption <code>.sdk-check</code> takes the choice row rules (not done here, so the approved Fields frames stay as they are).'],
    ['<code>.task .tick</code> (To-do, 18px)', 'To-do', 'The Fields tick box, 16px (already decided); it is inside a card row, not a choice row.'],
    ['<code>.template-option</code> (a card row, an accent border when chosen)', 'the template picker', 'The boxed row (aliased): a hairline card, the selected fill when chosen, no accent border.'],
    ['<code>.opt</code> (Polls: a row with the fill behind)', 'Polls', 'The poll option row (<code>.sdk-choice-poll</code>).'],
    ['<code>.sdk-choice</code> (a bordered joined box, 38px, hover <code>--secondary-hover</code>)', 'the SDK form block', 'Folded into the Tabs joined switch (<code>.sdk-tabs-joined</code>), default 38px, small 30px. Its <code>label:has(input:checked)</code> markup becomes the switch\'s buttons with <code>aria-pressed</code>.'],
    ['<code>.sdk-people</code> (pill labels)', 'forms', 'The people chip (Chips family).'],
  ])}

<h4 class="ds-h4" id="choices-contrast">Contrast</h4>
<p class="ds-desc">Worked out by this page, in the mode on show. Text pairs need 4.5 to 1; the tick box edge needs 3 to 1. The selected fill is a soft tone, so it is only looked at against the page.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="choices-tokens">Tokens</h4>
${tbl(['Token', 'Use here', ''], [
    ['<code>--check-h</code>', 'The height of a row: 32px; 44px on a phone (Fields).', 'exists'],
    ['<code>--selected-bg</code>', 'A checked row, a boxed row, a selected segment.', 'exists'],
    ['<code>--menu-hover</code>, <code>--menu-current-hover</code>, <code>--menu-hint-strong</code>', 'Hover, the hover of a checked row, the description on a filled row (Menus).', 'exists'],
    ['<code>--text-dim</code>, <code>--accent</code>, <code>--on-accent</code>', 'The box edge; the checked box and the focus; the mark (Fields).', 'exists'],
    ['<code>--cr-pad-x</code>, <code>--cr-gap</code>', 'The row\'s side padding (8px) and the gap after the box (8px).', 'new'],
    ['<code>--radius-small</code>, <code>--radius-medium</code>', 'The row; the boxed row.', 'exists'],
  ])}

<h4 class="ds-h4" id="choices-markup">Markup contract</h4>
${code(`<!-- a choice row: the label wraps the input and the words -->
<div class="sdk-choice-list" role="group" aria-label="Show on the day">
  <label class="sdk-choice-row"><input type="checkbox" checked><span class="sdk-choice-text"><span class="sdk-choice-label">Flights</span></span></label>
  <label class="sdk-choice-row"><input type="checkbox"><span class="sdk-choice-text"><span class="sdk-choice-label">Trains</span><span class="sdk-choice-desc">Includes the metro.</span></span></label>
</div>

<!-- a radio row; a boxed row (only when every option has a description) -->
<label class="sdk-choice-row"><input type="radio" name="split" checked><span class="sdk-choice-text"><span class="sdk-choice-label">Per person</span></span></label>
<label class="sdk-choice-row sdk-choice-boxed"><input type="radio" name="tpl"><span class="sdk-choice-text"><span class="sdk-choice-label">Trip planner</span><span class="sdk-choice-desc">Days, places, a map and a budget.</span></span></label>

<!-- a switch row: the words, then the switch -->
<label class="sdk-choice-row"><span class="sdk-choice-text"><span class="sdk-choice-label">Allow guests</span></span><input type="checkbox" class="sdk-switch" role="switch"></label>

<!-- a poll option: the fill is Progress's -->
<label class="sdk-choice-row sdk-choice-poll"><span class="sdk-progress-behind" role="progressbar" aria-label="Trattoria: 62 percent of votes" aria-valuenow="62" aria-valuemin="0" aria-valuemax="100" style="--pct: 62%"></span>
  <input type="radio" name="vote"><span class="sdk-choice-text"><span class="sdk-choice-label">Trattoria</span></span><span class="sdk-meter-value">62%</span></label>

<!-- two to four short options: the Tabs joined switch -->
<div class="sdk-tabs sdk-tabs-joined sdk-choice" role="group" aria-label="Split the cost">
  <button type="button" class="sdk-tab" aria-pressed="true"><span class="sdk-tab-word">Per person</span></button>
  <button type="button" class="sdk-tab" aria-pressed="false"><span class="sdk-tab-word">For the group</span></button></div>`)}
<p class="ds-desc"><b>Names kept.</b> <code>.check</code> and <code>.template-option</code> take the look (aliases); <code>.sdk-check</code> is the Fields family's row and keeps its approved look until adoption; <code>.sdk-choice</code> is the wrapper of the Tabs joined switch.</p>
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + CR_CSS }, o || {}));
    slot('m32').appendChild(F(matrix(false), 'Choice rows, all states'));
    slot('m44').appendChild(F(matrix(true), 'Choice rows, all states, 44px'));
    slot('seg').appendChild(F(segBody(), 'Choice rows, segmented'));
    slot('use').appendChild(F(useBody(), 'Choice rows, in use'));
    slot('contrast').appendChild(F(contrastBody(), 'Choice rows, contrast', { onload: measure }));
    const ws = mk('div', '');
    for (const w of [390, 700, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(useBody(), `Choice rows at ${w}`, { pinWidth: w }));
    }
    slot('widths').appendChild(ws);
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'choices', covers: ['choice-row', 'check', 'switch-row', 'segmented', 'poll-option', 'template-option'], group: 'Controls', name: 'Choice rows', status: 'proposed',
    words: 'choice rows choice row tick box checkbox radio switch toggle segmented boxed template option description poll option check label sdk-choice-row sdk-choice sdk-check template-option', render: renderChoices,
  });
})();
