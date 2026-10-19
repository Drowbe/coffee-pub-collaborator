/* The Fields and forms family (approved): every field, the tick box, radio and switch, the label, hint and error lines. Loaded by proposed.html through proposed-families.json, after proposed.js (the page engine); it registers one family
   through window.DS_PROPOSED.families.push and draws it with the rules in proposed-fields.css. Nothing here is a style of the product:
   markup, words and tables only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules (.pm-row, .pm-role ...), from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // ---- Fields and forms (approved 2026-10-18): Thomas's decisions of 2026-10-17, drawn from proposed.css ----
  const FM_CSS = `
.pm-fw { flex: 0 0 176px; width: 176px; }
.pm-fwn { flex: 0 0 150px; width: 150px; }
.pm-na { display: block; height: var(--field-h); color: var(--text-dim); line-height: var(--field-h); }
.pm-ed { box-sizing: border-box; max-width: 560px; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-ed + .pm-ed { margin-top: 14px; }
.pm-ed-t { margin: 0 0 14px; font-size: 16px; font-weight: 700; }
.pm-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 10px; padding-top: 14px; border-top: 1px solid var(--border); }
.pm-actions .pm-first { margin-right: auto; }
.pm-stack { display: grid; gap: 14px; max-width: 360px; }
.pm-inline { display: flex; flex-wrap: wrap; gap: 8px 20px; }
.pm-ct { width: 100%; border-collapse: collapse; font-size: 13px; }
.pm-ct th, .pm-ct td { padding: 6px 12px 6px 0; border-bottom: 1px solid var(--border); text-align: left; vertical-align: middle; }
.pm-ct th { color: var(--text-dim); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.pm-ct td.pm-n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.pm-ct .pm-sw { display: inline-block; width: 14px; height: 14px; margin-right: 6px; vertical-align: -2px; border-radius: var(--radius-min); }
.pm-pass { color: var(--ok); font-weight: 700; }
.pm-fail { color: var(--f-error); font-weight: 700; }
@media (max-width: 640px) { .pm-fw { flex-basis: 150px; width: 150px; } }`;

  const FM_STATES = ['Rest', 'Hover', 'Focus', 'Filled', 'Placeholder', 'Disabled', 'Error', 'Read-only'];
  const forceCls = (s) => (s === 'Hover' ? ' ds-force-hover' : s === 'Focus' ? ' ds-force-focus' : '');
  // Each kind: label, the control for a state (null = not applicable), the error line, and what the state shows.
  const FM_KINDS = [
    { n: 'Text', err: 'Add a name', v: 'Louvre museum', ph: 'Name of the place', ctl: (a) => `<input type="text" aria-label="Name"${a}>` },
    { n: 'Text area', err: 'Keep it to 250 letters', v: 'Meet at the gate at nine.', ph: 'Notes', ctl: (a) => `<textarea aria-label="Notes" rows="3"${a}></textarea>`, area: true },
    { n: 'List', err: 'Choose one', v: 'Hotel', ph: 'Choose one', ro: false, ctl: (a, s, val) => `<select aria-label="Kind"${a}>${s === 'Placeholder' || s === 'Rest' || s === 'Error' ? '<option value="" selected>Choose one</option>' : '<option value="">Choose one</option>'}<option${val ? ' selected' : ''}>Hotel</option><option>Food</option></select>` },
    { n: 'Number', err: 'Use 0 or more', v: '12', ph: '0', ctl: (a) => `<input type="number" aria-label="People"${a}>` },
    { n: 'Date', err: 'Pick a day', v: '2026-10-17', ph: null, ctl: (a, s, val, dis) => `<div class="sdk-group"><input type="date" aria-label="Day"${a}><button type="button" class="sdk-field-btn" aria-label="Open the calendar" title="Open the calendar"${dis}>${fa('calendar')}</button></div>` },
    { n: 'Time', err: 'Add a time', v: '14:30', ph: null, ctl: (a) => `<input type="time" aria-label="Time"${a}>` },
    { n: 'Search', err: null, v: 'louvre', ph: 'Search places', ctl: (a) => `<div class="sdk-search">${fa('magnifying-glass')}<input type="search" aria-label="Search places"${a}></div>` },
    { n: 'File', err: null, v: null, ph: null, only: ['Rest', 'Hover', 'Focus', 'Disabled'], ctl: (a) => `<input type="file" aria-label="Photo"${a}>` },
    { n: 'Colour', err: null, v: '#c8873a', ph: null, only: ['Rest', 'Hover', 'Focus', 'Disabled'], ctl: (a, s, val, dis) => `<div class="sdk-group"><input type="color" value="#c8873a" aria-label="Colour"${a}><input type="text" value="#c8873a" aria-label="Colour, as letters and numbers"${dis}></div>` },
    { n: 'Slider', err: null, v: '40', ph: null, only: ['Rest', 'Hover', 'Focus', 'Disabled'], ctl: (a) => `<input type="range" min="0" max="100" value="40" aria-label="Volume"${a}>` },
  ];
  function fmCell(k, s, id) {
    if (k.only && !k.only.includes(s)) return `<div class="dsf-state pm-fw"><small>${s}</small><div class="dsf-ex"><span class="pm-na" aria-hidden="true">-</span></div></div>`;
    if (s === 'Read-only' && (k.n === 'List' || k.n === 'Date' || k.n === 'Search')) return `<div class="dsf-state pm-fw"><small>${s}</small><div class="dsf-ex"><span class="pm-na" aria-hidden="true">-</span></div></div>`;
    if (s === 'Placeholder' && k.ph === null) return `<div class="dsf-state pm-fw"><small>${s}</small><div class="dsf-ex"><span class="pm-na" aria-hidden="true">-</span></div></div>`;
    if (s === 'Error' && !k.err) return `<div class="dsf-state pm-fw"><small>${s}</small><div class="dsf-ex"><span class="pm-na" aria-hidden="true">-</span></div></div>`;
    const dis = s === 'Disabled' ? ' disabled' : '';
    const val = !['Rest', 'Placeholder'].includes(s) && !(s === 'Error' && (k.n !== 'Number')) && k.v;
    let a = forceCls(s) ? ` class="${forceCls(s).trim()}"` : '';
    if (s === 'Placeholder' && k.ph) a += ` placeholder="${k.ph}"`;
    if (s === 'Rest' && k.ph && k.n === 'Search') a += '';
    if (val && k.n !== 'List') a += ` value="${s === 'Error' ? '-3' : k.v}"`;
    if (s === 'Disabled') a += ' disabled';
    if (s === 'Read-only') a += ' readonly';
    if (s === 'Error') a += ` aria-invalid="true" aria-describedby="fe-${id}"`;
    let c = k.ctl(a, s, val, dis);
    if (k.area && val) c = c.replace('></textarea>', `>${k.v}</textarea>`);
    if (k.n === 'Colour' && s === 'Disabled') c = c.replace('type="color"', 'type="color" disabled');
    const err = s === 'Error' ? `<span class="sdk-error" id="fe-${id}">${k.err}</span>` : '';
    return `<div class="dsf-state pm-fw"><small>${s}</small><div class="dsf-ex">${c}${err}</div></div>`;
  }
  function fmMatrix(h44) {
    return `<div class="ds-proposed"${h44 ? ' data-field-h="44"' : ''}>${FM_KINDS.map((k, i) => `<div class="pm-row"><div class="pm-role">${k.n}</div><div class="dsf-states">${FM_STATES.map((s, j) => fmCell(k, s, `${i}-${j}`)).join('')}</div></div>`).join('')}</div>`;
  }

  // Tick box, radio, switch: eight states each.
  const CH_STATES = [
    { n: 'Off' }, { n: 'Hover', c: ' ds-force-hover' }, { n: 'Focus', c: ' ds-force-focus' }, { n: 'On', on: true }, { n: 'On, hover', c: ' ds-force-hover', on: true },
    { n: 'Disabled', dis: true }, { n: 'Disabled, on', dis: true, on: true }, { n: 'Error', inv: true },
  ];
  const CH_KINDS = [
    { n: 'Tick box', type: 'checkbox', word: 'Remind me', cls: '' },
    { n: 'Radio', type: 'radio', word: 'Day 2', cls: '' },
    { n: 'Switch', type: 'checkbox', word: 'Tell the others', cls: 'sdk-switch', role: ' role="switch"' },
  ];
  function choiceMatrix() {
    return `<div class="ds-proposed">${CH_KINDS.map((k, i) => `<div class="pm-row"><div class="pm-role">${k.n}</div><div class="dsf-states">${CH_STATES.map((s, j) => {
      const cls = ((k.cls || '') + (s.c || '')).trim();
      return `<div class="dsf-state pm-fwn"><small>${s.n}</small><div class="dsf-ex"><label class="sdk-check"><input type="${k.type}" name="ck-${i}-${j}"${cls ? ` class="${cls}"` : ''}${k.role || ''}${s.on ? ' checked' : ''}${s.dis ? ' disabled' : ''}${s.inv ? ' aria-invalid="true"' : ''}><span>${k.word}</span></label></div></div>`;
    }).join('')}</div></div>`).join('')}</div>`;
  }
  const choiceUse = () => `<div class="ds-proposed"><form class="sdk-form" style="max-width:420px" onsubmit="return false">
    <fieldset class="sdk-section"><legend class="sdk-section-title">Tick boxes: choose any</legend><div class="sdk-checks"><label class="sdk-check"><input type="checkbox" checked><span>Flights</span></label><label class="sdk-check"><input type="checkbox"><span>Trains</span></label><label class="sdk-check"><input type="checkbox" checked><span>Hotels</span></label></div></fieldset>
    <fieldset class="sdk-section"><legend class="sdk-section-title">Radio: choose one</legend><div class="sdk-checks"><label class="sdk-check"><input type="radio" name="u-r" checked><span>Per person</span></label><label class="sdk-check"><input type="radio" name="u-r"><span>For the group</span></label></div></fieldset>
    <fieldset class="sdk-section"><legend class="sdk-section-title">Switches: on or off</legend>
      <label class="sdk-check"><input type="checkbox" class="sdk-switch" role="switch" checked><span>Allow guests</span></label>
      <label class="sdk-check"><input type="checkbox" class="sdk-switch" role="switch"><span>Turn AI off in this space</span></label>
      <label class="sdk-check"><input type="checkbox" class="sdk-switch" role="switch" checked disabled><span>Calendar is always on</span></label></fieldset>
  </form></div>`;

  // Label, hint, error, optional.
  const labelBody = () => `<div class="ds-proposed"><form class="sdk-form pm-stack" onsubmit="return false">
    <label class="sdk-field"><span class="sdk-label">Name</span><input type="text" value="Louvre museum"><span class="sdk-hint"></span></label>
    <label class="sdk-field"><span class="sdk-label">Web address <span class="sdk-optional">(optional)</span></span><input type="url" placeholder="https://"><span class="sdk-hint">Where to book or read more.</span></label>
    <label class="sdk-field"><span class="sdk-label">Cost</span><input type="number" value="-3" aria-invalid="true" aria-describedby="lb-e"><span class="sdk-error" id="lb-e">Use 0 or more</span></label>
    <div class="sdk-field" role="group" aria-labelledby="lb-g"><span class="sdk-label" id="lb-g">Length</span><div class="sdk-group"><input type="number" value="90" aria-label="Minutes"><span class="sdk-unit">min</span></div><span class="sdk-hint">Ends at 16:00.</span></div>
  </form></div>`;

  // The form, as a module's editor looks: labels, a two-column row, a hint, an error, and the buttons of the approved Buttons family.
  const formCard = (title, uid) => `<div class="pm-ed"><h5 class="pm-ed-t">${title}</h5><form class="sdk-form" onsubmit="return false">
    <label class="sdk-field"><span class="sdk-label">Name</span><input type="text" value="Louvre museum"><span class="sdk-hint"></span></label>
    <div class="sdk-row">
      <div class="sdk-field sdk-m" role="group" aria-labelledby="${uid}-d"><span class="sdk-label" id="${uid}-d">Day</span><div class="sdk-group"><input type="date" value="2026-10-17" aria-label="Day"><button type="button" class="sdk-field-btn" aria-label="Open the calendar" title="Open the calendar">${fa('calendar')}</button></div><span class="sdk-hint">Saturday</span></div>
      <label class="sdk-field sdk-s"><span class="sdk-label">From</span><input type="time" value="09:30"><span class="sdk-hint"></span></label>
      <label class="sdk-field sdk-s"><span class="sdk-label">To</span><input type="time" value="12:00"><span class="sdk-hint"></span></label>
    </div>
    <div class="sdk-row">
      <label class="sdk-field sdk-m"><span class="sdk-label">Kind</span><select><option>Sight</option><option>Food</option></select><span class="sdk-hint"></span></label>
      <div class="sdk-field sdk-m" role="group" aria-labelledby="${uid}-c"><span class="sdk-label" id="${uid}-c">Cost <span class="sdk-optional">(optional)</span></span><div class="sdk-group"><input type="number" placeholder="0" aria-label="Cost"><span class="sdk-unit">EUR</span></div><span class="sdk-hint"></span></div>
    </div>
    <label class="sdk-field"><span class="sdk-label">Web address</span><input type="url" value="louvre" aria-invalid="true" aria-describedby="${uid}-e"><span class="sdk-error" id="${uid}-e">Start with https://</span></label>
    <label class="sdk-field"><span class="sdk-label">Notes <span class="sdk-optional">(optional)</span></span><textarea rows="3" placeholder="Anything the others should know"></textarea><span class="sdk-hint">Everyone in the space can read this.</span></label>
    <div class="sdk-checks"><label class="sdk-check"><input type="checkbox" checked><span>Add to the calendar</span></label><label class="sdk-check"><input type="checkbox" class="sdk-switch" role="switch"><span>Tell the others</span></label></div>
    <div class="pm-actions"><button type="button" class="btn btn-danger pm-first">Delete</button><button type="button" class="btn btn-quiet">Cancel</button><button type="button" class="btn btn-primary">Save</button></div>
  </form></div>`;
  const formBody = (uid) => `<div class="ds-proposed">${formCard('Edit a place', uid)}</div>`;
  const formWide = (uid) => `<div class="ds-proposed">${formCard('Edit a place', uid)}<div class="pm-ed">
    <h5 class="pm-ed-t">Search and groups</h5><form class="sdk-form" onsubmit="return false">
    <div class="sdk-field"><span class="sdk-label" id="${uid}-s">Find a place</span><div class="sdk-group"><div class="sdk-search" style="flex:1 1 0;min-width:0">${fa('magnifying-glass')}<input type="search" placeholder="Search places" aria-labelledby="${uid}-s"></div><button type="button" class="sdk-btn primary">Find</button></div><span class="sdk-hint"></span></div>
    <div class="sdk-field" role="group" aria-labelledby="${uid}-k"><span class="sdk-label" id="${uid}-k">Colour</span><div class="sdk-group"><input type="color" value="#c8873a" aria-label="Colour"><input type="text" value="#c8873a" aria-label="Colour, as letters and numbers"></div><span class="sdk-hint"></span></div>
    <div class="sdk-field"><span class="sdk-label" id="${uid}-v">Volume</span><input type="range" min="0" max="100" value="40" aria-labelledby="${uid}-v"><span class="sdk-hint"></span></div>
  </form></div></div>`;

  const ZOOM_F = `<div class="ds-proposed"><div class="pm-zoom" style="zoom:2;display:block;max-width:240px"><form class="sdk-form" onsubmit="return false"><label class="sdk-field"><span class="sdk-label">Name</span><input type="text" value="Louvre museum"><span class="sdk-hint">Shown on the plan.</span></label></form></div></div>`;

  // Contrast, worked out live in the mode on show (see measureContrast).
  const CT_ROWS = [
    ['Typed text on a field', '--text', '--bg-input', 4.5],
    ['Placeholder on a field', '--text-dim', '--bg-input', 4.5],
    ['Label and hint on the page', '--text-dim', '--bg', 4.5],
    ['Label and hint on a panel', '--text-dim', '--bg-section', 4.5],
    ['Error line (--danger mixed into --text)', '--f-error', '--bg', 4.5],
    ['Error line, on a panel', '--f-error', '--bg-section', 4.5],
    ["Error line, today (--danger-text)", '--danger-text', '--bg', 4.5],
    ["Error line, today, on a panel", '--danger-text', '--bg-section', 4.5],
    ['Field edge (--border) on the page', '--border', '--bg', 3],
    ['Tick box and radio edge (--text-dim)', '--text-dim', '--bg-input', 3],
    ['Tick box edge if it were --border', '--border', '--bg-input', 3],
    ['Switch, off track (--text-dim)', '--text-dim', '--bg', 3],
    ['Focus and checked (--accent) on a field', '--accent', '--bg-input', 3],
    ['Error edge (--danger) on a field', '--danger', '--bg-input', 3],
  ];
  const contrastBody = () => `<div class="ds-proposed"><table class="pm-ct"><thead><tr><th>Pair</th><th>Colours</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${CT_ROWS.map((r) => `<tr data-fg="${r[1]}" data-bg="${r[2]}" data-min="${r[3]}"><td>${r[0]}</td><td><code>${r[1]}</code> on <code>${r[2]}</code></td><td class="pm-n" data-out="r"></td><td class="pm-n">${r[3]}:1</td><td data-out="p"></td></tr>`).join('')}</tbody></table></div>`;
  const measureContrast = (doc) => {
    const host = doc.querySelector('.ds-proposed');
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const tok = (name) => { const p = doc.createElement('span'); p.style.color = `var(${name})`; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const px = (c) => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = c; g.fillRect(0, 0, 1, 1); return g.getImageData(0, 0, 1, 1).data; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (d) => 0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]);
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-ct tbody tr')) {
        const bg = tok(tr.dataset.bg); const fg = tok(tr.dataset.fg);
        g.clearRect(0, 0, 1, 1); g.fillStyle = bg; g.fillRect(0, 0, 1, 1); g.fillStyle = fg; g.fillRect(0, 0, 1, 1);
        const top = g.getImageData(0, 0, 1, 1).data; const base = px(bg);
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

  function renderFields(api) {
    const { mk, h } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="fields-h"><a href="#fields">Fields and forms</a></h3><span class="ds-status-chip ds-st-approved">Approved</span><span class="ds-count">fields, tick boxes, radios, switches, labels and the form that holds them</span></header>
<p class="ds-desc">Thomas's decisions of 2026-10-17, approved 2026-10-18, drawn from <code>proposed.css</code> (every rule under <code>.ds-proposed</code>). One field look, one tick box, radio and switch, one label, hint and error line. The class names are the ones the product already uses (<code>.sdk-form</code>, <code>.sdk-field</code>, <code>.sdk-label</code>, <code>.sdk-hint</code>, <code>.sdk-error</code>, <code>.sdk-group</code>, <code>.sdk-check</code>); the new ones start with <code>sdk-</code>. The Dark and Light switch, the Font and Headline groups and the width control change every example. <b>Decided 2026-10-18:</b> the error line uses the darker mix (<code>--f-error</code>); <code>(optional)</code> marks only optional fields; the edge stays the neutral hairline; one 38px search; no stepper on a number; the browser's own date and time picker icon is hidden; the tick box is drawn.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#fields-anatomy">Anatomy</a><a href="#fields-kinds">Fields</a><a href="#fields-states">States</a><a href="#fields-choices">Tick box, radio, switch</a><a href="#fields-labels">Label, hint, error</a><a href="#fields-form">A form</a><a href="#fields-widths">Widths</a><a href="#fields-rules">Usage rules</a><a href="#fields-map">Today to proposed</a><a href="#fields-contrast">Contrast</a><a href="#fields-tokens">Tokens</a><a href="#fields-markup">Markup</a></nav>

<h4 class="ds-h4" id="fields-anatomy">Anatomy</h4>
<div data-slot="zoom"></div>
${dim([
    ['1 Label', 'Above the field. 12px, <code>--text-dim</code>, weight 500, 4px gap (<code>--label-gap</code>). A noun, sentence case. No colon.'],
    ['2 Box', 'Height <code>--field-h</code>: 38px, 44px on a phone (640px and narrower, the same as a button). <code>--radius-small</code> corners. A text area is as tall as three lines.'],
    ['3 Edge', '1px <code>--border</code>, the neutral hairline. It is drawn in colour only in two states: focus (accent) and error (danger), as a 2px line over the hairline, the same on all four sides. Hover never changes it.'],
    ['4 Fill', '<code>--bg-input</code>. Hover is a slightly lighter fill. Read-only has no fill.'],
    ['5 Text', '14px (16px on a phone, so iOS does not zoom), <code>--text</code>, centred in the box, padding <code>--field-pad-x</code> (10px). In the UI font.'],
    ['6 Placeholder', '<code>--text-dim</code>, the same in light and dark. It is an example of what to type, never the label.'],
    ['7 Focus', 'A 2px accent edge drawn over the hairline (an inside outline, so the box keeps its size) and a soft 2px ring (<code>--accent</code> at 30%) outside it, on every field, by mouse or keyboard. A 2px edge keeps a whole pixel of colour on all four sides at any display scale (Windows 125% and 150%) and scroll position; a 1px border colour did not.'],
    ['8 Hint or error', 'Under the field: 12px, 4px gap. The hint is <code>--text-dim</code>. The error is the same size in a readable red, and replaces the hint.'],
  ])}

<h4 class="ds-h4" id="fields-kinds">Fields</h4>
${tbl(['Field', 'Markup', 'Notes'], [
    ['Text', '<code>input type="text"</code> (also email, url, tel, password)', 'The base look. One line, 38px.'],
    ['Text area', '<code>textarea</code>', 'The same edge, three lines at least, grows with <code>resize: vertical</code>.'],
    ['List', '<code>select</code>', 'The same box; the arrow is drawn from <code>--text-dim</code>. A first option with <code>value=""</code> reads as a placeholder.'],
    ['Number', '<code>input type="number"</code>', 'No stepper buttons. A unit goes after it in a group: <code>.sdk-unit</code>.'],
    ['Date and time', '<code>input type="date"</code> and a <code>.sdk-field-btn</code> in one <code>.sdk-group</code> (<code>host.ui.datePicker</code> writes it as <code>.sdk-datefield.sdk-group</code>); <code>type="time"</code> has no button', 'One field: the calendar is a small Quiet icon button (30px) inside the trailing edge, with the same inset above, below and at the right. One border, one fill, one focus edge around all of it; the text never runs under the icon. On a phone the button keeps its look and has a 44px target. The browser\'s own picker icon is hidden.'],
    ['Search', '<code>.sdk-search</code> around an icon and <code>input type="search"</code>', 'One search field: the magnifier inside at the left, the same box and height as every field. Replaces three looks (see Today to proposed).'],
    ['File', '<code>input type="file"</code>', 'The field is the box; the chooser is a small Secondary button inside it. The words next to it are the browser\'s.'],
    ['Colour', '<code>input type="color"</code>', 'A swatch 1.5 times the field height, the same edge. Beside it, usually the hex in a text field.'],
    ['Slider', '<code>input type="range"</code>', 'A 4px track in a quiet tone and a 16px accent thumb, one look. The hover and focus change the thumb.'],
  ])}

<h4 class="ds-h4" id="fields-states">States</h4>
<p class="ds-desc">Every field in every state, forced from the proposed rules: <b>Rest</b> (empty), <b>Hover</b> (a lighter fill), <b>Focus</b> (the 2px accent edge and ring), <b>Filled</b>, <b>Placeholder</b> (<code>--text-dim</code>), <b>Disabled</b> (half strength, a not-allowed cursor), <b>Error</b> (<code>aria-invalid="true"</code>, the 2px danger edge and the error line) and <b>Read-only</b> (no fill, the same edge, full-strength text). A dash means the state does not apply (a file cannot show a value; a list has no read-only). The same grid is drawn twice, at the two heights.</p>
<p class="ds-desc"><b>38px</b> (the default; 44px when the frame is 640px or narrower)</p>
<div data-slot="matrix38"></div>
<p class="ds-desc"><b>44px</b> (the phone height, forced here so it can be compared at any width)</p>
<div data-slot="matrix44"></div>

<h4 class="ds-h4" id="fields-choices">Tick box, radio and switch</h4>
<p class="ds-desc"><b>One 16px tick box</b> for choosing things, <b>one 16px radio</b> in the same family, and <b>one switch</b> for on or off settings. The whole row, the box and its words, is the target (32px high; 44px on a phone). Unchecked: the field fill and a <code>--text-dim</code> edge; checked: the accent fill and the mark in <code>--on-accent</code>; no coloured edge. The keyboard ring is the buttons' ring (2px accent, 2px off the box). The switch is 36 by 20 with a 14px thumb (off: a <code>--text-dim</code> track and a field-coloured thumb; on: the accent track and an <code>--on-accent</code> thumb): a tick box with <code>role="switch"</code>, drawn as a switch. It replaces <code>input.switch</code> (22 by 12), the Planner's round-trip tick box with a switch role (now a real switch), and the To-do tick (18px, now 16px).</p>
<div data-slot="choices"></div>
<p class="ds-desc">In use: a wrapping list of tick boxes, radios, and a list of switches.</p>
<div data-slot="choiceuse"></div>

<h4 class="ds-h4" id="fields-labels">Label, hint, error, and optional or required</h4>
<p class="ds-desc">The label is above the field, never inside it. A hint says what to type or what it is for. An error says what to do ("Add a name", not "Invalid"). The error replaces the hint in the same slot, so nothing moves; the field carries <code>aria-invalid="true"</code> and <code>aria-describedby</code> pointing at the error line.</p>
<div data-slot="labels"></div>
<p class="ds-desc"><b>Optional and required (decided 2026-10-18).</b> No asterisks. A field is required unless its label says <b>(optional)</b>. Write <code>(optional)</code> in the label, in regular weight, only where a field may be left empty. Most fields in a form are required, so the words are rare and the form stays quiet; the error line says what is missing after a try to save.</p>
<p class="ds-desc"><b>Error colour.</b> The shared error line uses <code>--danger-text</code> today. That token is the pale red of dark mode and has no light value, so on a light page it is too faint (see Contrast). The error line is <code>--danger</code> mixed 70% into <code>--text</code>, the same colour the Danger button already uses for its words: <code>--f-error</code> in this file (decided 2026-10-18).</p>

<h4 class="ds-h4" id="fields-form">A form</h4>
<p class="ds-desc">A module's editor, composed from the pieces: labels, a row of fields in columns, hints, an error, tick box and switch, and the approved buttons (Delete is Danger and sits apart; Cancel is Quiet; Save is Primary). The width of the form, not the page, sets the columns.</p>
<div data-slot="form"></div>

<h4 class="ds-h4" id="fields-widths">Widths</h4>
<p class="ds-desc">The same form at 390 (a phone, 44px), 700 and 1280, with a search field, a colour and a slider under it.</p>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="fields-rules">Usage rules</h4>
<ul class="ds-desc">
  <li>A form is a <code>.sdk-form</code>. Fields are <code>.sdk-field</code>; fields side by side are a <code>.sdk-row</code>. A form writes no field CSS of its own.</li>
  <li>The label is above the field and is a real label (<code>&lt;label&gt;</code>, or <code>aria-labelledby</code> for a group). A placeholder is never the only label.</li>
  <li>Every field is 38px high (44px on a phone), beside a button too. Nothing is shorter.</li>
  <li>An error is the danger edge and the error line, never colour alone.</li>
  <li>A tick box chooses things; a radio chooses one of a few; a switch is an on or off setting that takes effect as it is saved with the form. Not a tick box with a switch role.</li>
  <li>Optional is written in the label, <code>(optional)</code>, only where a field may be empty. No asterisks.</li>
  <li>The edge is the neutral hairline. Only focus and error colour it; hover and selected are fills.</li>
</ul>

<h4 class="ds-h4" id="fields-map">Today to proposed</h4>
<p class="ds-desc">The rules are written on the bare elements, so these today's selectors could be aliased to the proposed look (or their own rules deleted) with no markup change. Not loaded here: Today's page shows them as they are.</p>
${tbl(['Today', 'Where', 'Proposed'], [
    ['<code>input, textarea, select</code> (6px 8px, no height, a bare outline-less ring)', '<code>host.css</code>, <code>style.css</code>', 'The field, with its height and the placeholder.'],
    ['<code>.sdk-form</code> fields (38px, <code>--bg-input</code>, 30% ring)', 'both stylesheets, the form block', 'The field. Same box; adds the placeholder colour, read-only, the error and a not-allowed cursor.'],
    ['<code>.editor-card input</code> and its restyles', 'seven modules', 'The field (the module drops its copy).'],
    ['<code>.fields input, select</code> (35px, labels in capitals)', 'Manage, the profile, the host console', 'The field and <code>.sdk-label</code>; the capitals go.'],
    ['<code>.setup-field input</code> (8px 10px, a 2px outline on focus)', 'Set up', 'The field; the ring replaces the outline.'],
    ['<code>.layout-field input[type="search"]</code> (13px, 5px 8px)', 'the layout sheet', 'Search.'],
    ['<code>.map-search</code> (32px, icon inside, a shadow)', 'Maps', 'Search. The module keeps its place on the map; the shadow and the panel fill go.'],
    ['<code>.sdk-datefield</code> with a 30px button beside the input', 'the date picker', 'The date field with the Quiet icon button (30px) inside its trailing edge; one border and one focus edge. <code>.sdk-datefield.sdk-group</code> wraps the input and the <code>.sdk-field-btn</code> (a second one, the list, sits beside it).'],
    ['<code>input.switch</code>, <code>label.switch-row</code> (22 by 12)', 'Set up, the layout sheet', 'The switch (<code>.sdk-switch</code>); <code>.switch</code> stays as an alias.'],
    ['Tick box with <code>role="switch"</code>', 'the Planner (round trip)', 'The switch.'],
    ['<code>.task .tick</code> (18px, <code>accent-color</code>)', 'To-do', 'The tick box, 16px.'],
    ['<code>.sdk-form input[type="checkbox"]</code> (16px, <code>accent-color</code>)', 'forms', 'The tick box, drawn from tokens.'],
    ['<code>.sdk-error</code> in <code>--danger-text</code>', 'forms', 'The error line in <code>--f-error</code>.'],
  ])}

<h4 class="ds-h4" id="fields-contrast">Contrast</h4>
<p class="ds-desc">Worked out by this page, in the mode on show: flip the Dark and Light switch and the table follows. The text pairs need 4.5 to 1; the edges and marks need 3 to 1.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="fields-tokens">Tokens</h4>
${tbl(['Token', 'Use here', ''], [
    ['<code>--field-h</code>', 'The height of every one-line field. 38px; 44px at 640px and narrower, page wide (today only a <code>.sdk-form</code> does that). The same as <code>--btn-h</code>.', 'exists'],
    ['<code>--field-pad-x</code>, <code>--field-font</code>', 'The side padding (10px) and the text size (14px; 16px on a phone).', 'exists'],
    ['<code>--label-size</code>, <code>--label-gap</code>', 'The label and its gap: 12px and 4px.', 'exists'],
    ['<code>--border</code>, <code>--bg-input</code>', 'The edge and the fill.', 'exists'],
    ['<code>--accent</code>, <code>--danger</code>', 'The focus and the error edge, the checked fill, the thumb.', 'exists'],
    ['<code>--text</code>, <code>--text-dim</code>', 'Typed text; the placeholder, label, hint, tick box edge and list arrow.', 'exists'],
    ['<code>--on-accent</code>', 'The mark in a checked box, and the switch thumb when on.', 'exists'],
    ['<code>--radius-small</code>, <code>--radius-min</code>, <code>--radius-round</code>', 'Fields, the tick box, the switch and the radio.', 'exists'],
    ['<code>--f-error</code> (new)', 'The error line: <code>--danger</code> 70% into <code>--text</code>. Replaces <code>--danger-text</code> for the error line.', 'new'],
    ['<code>--f-ring</code>, <code>--f-bg-h</code>, <code>--f-mark</code> (new)', 'The focus ring (accent 30%), the hover fill (text 7%), the quiet track of a slider (text 24%).', 'new'],
    ['<code>--check-h</code> (new)', 'The height of a tick box row: 32px; 44px on a phone.', 'new'],
  ])}

<h4 class="ds-h4" id="fields-markup">Markup contract</h4>
${code(`<form class="sdk-form">
  <label class="sdk-field">
    <span class="sdk-label">Name</span>
    <input type="text" placeholder="Name of the place">
    <span class="sdk-hint">Shown on the plan.</span>
  </label>

  <!-- optional: written in the label -->
  <label class="sdk-field"><span class="sdk-label">Notes <span class="sdk-optional">(optional)</span></span><textarea></textarea></label>

  <!-- error: aria-invalid, and the error line takes the hint's place -->
  <label class="sdk-field"><span class="sdk-label">Web address</span>
    <input type="url" aria-invalid="true" aria-describedby="url-err">
    <span class="sdk-error" id="url-err">Start with https://</span></label>

  <!-- fields side by side -->
  <div class="sdk-row">
    <label class="sdk-field sdk-m"><span class="sdk-label">Kind</span><select>...</select><span class="sdk-hint"></span></label>
    <label class="sdk-field sdk-s"><span class="sdk-label">From</span><input type="time"><span class="sdk-hint"></span></label>
  </div>

  <!-- search -->
  <div class="sdk-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i><input type="search" aria-label="Search places"></div>

  <!-- a date: the .sdk-group wraps the input and the calendar button; the button sits inside the field's trailing edge -->
  <div class="sdk-field"><span class="sdk-label">Day</span>
    <div class="sdk-group"><input type="date" aria-label="Day"><button type="button" class="sdk-field-btn" aria-label="Open the calendar" title="Open the calendar"><i class="fa-solid fa-calendar" aria-hidden="true"></i></button></div>
    <span class="sdk-hint"></span></div>

  <!-- tick box, radio, switch: the row is the target -->
  <label class="sdk-check"><input type="checkbox"><span>Remind me</span></label>
  <label class="sdk-check"><input type="radio" name="how"><span>Per person</span></label>
  <label class="sdk-check"><input type="checkbox" class="sdk-switch" role="switch"><span>Allow guests</span></label>
</form>`)}
<p class="ds-desc"><b>Names kept so no consumer has to change.</b> <code>.sdk-form</code>, <code>.sdk-field</code>, <code>.sdk-label</code>, <code>.sdk-hint</code>, <code>.sdk-error</code>, <code>.sdk-row</code>, <code>.sdk-group</code>, <code>.sdk-unit</code>, <code>.sdk-check</code> and <code>.sdk-checks</code> keep their names and meaning. New: <code>.sdk-search</code> (with <code>.map-search</code> as an alias), <code>.sdk-switch</code> (with <code>.switch</code> as an alias), <code>.sdk-optional</code>. The look sits on the bare elements, so a field in a module's own markup (<code>.editor-card input</code>, <code>.fields input</code>, <code>.setup-field input</code>) gets it without a class.</p>
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + FM_CSS }, o || {}));
    slot('zoom').appendChild(F(ZOOM_F, 'Fields anatomy sample', { height: 260 }));
    slot('matrix38').appendChild(F(fmMatrix(false), 'Fields, all states'));
    slot('matrix44').appendChild(F(fmMatrix(true), 'Fields, all states, 44px'));
    slot('choices').appendChild(F(choiceMatrix(), 'Tick box, radio and switch, all states'));
    slot('choiceuse').appendChild(F(choiceUse(), 'Choices in use'));
    slot('labels').appendChild(F(labelBody(), 'Label, hint and error'));
    slot('form').appendChild(F(formBody('f1'), 'A form'));
    slot('contrast').appendChild(F(contrastBody(), 'Fields, contrast', { onload: measureContrast }));
    const ws = mk('div', '');
    for (const w of [390, 700, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(formWide('w' + w), `Fields at ${w}`, { pinWidth: w }));
    }
    slot('widths').appendChild(ws);
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'fields', covers: ['fields', 'forms', 'form-standard', 'switch'], group: 'Controls', name: 'Fields and forms', status: 'approved',
    words: 'fields forms form input text area textarea select list number date time search file colour color slider range checkbox tick box radio switch toggle label hint error optional required placeholder focus disabled read-only aria-invalid sdk-form sdk-field', render: renderFields,
  });
})();
