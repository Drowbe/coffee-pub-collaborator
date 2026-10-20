/* The Pickers family (PROPOSED): the one trigger, the flyouts, the icon grid, the colour grid and the background tiles. Loaded by proposed.html through
   proposed-families.json, after proposed.js (the page engine); it registers one family through window.DS_PROPOSED.families.push and draws it with the
   rules in proposed-pickers.css (and, for the flyouts, the Menus family's). Nothing here is a style of the product: markup, words and tables only.
   How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules (.pm-row, .pm-role ...), from the page engine
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  const PK_CSS = `
.pm-pw { flex: 0 0 150px; width: 150px; min-width: 0; }
.pm-pw .dsf-ex { display: block; }
.pm-na { display: block; height: var(--field-h); color: var(--text-dim); line-height: var(--field-h); }
.pm-grid { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 14px 24px; }
.pm-cell { display: flex; flex-direction: column; gap: 5px; min-width: 0; max-width: 100%; }
.pm-cell > small { color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-phone-screen { position: relative; overflow: hidden; height: 560px; border-radius: var(--radius-medium); background: var(--bg); }
.pm-phone-screen .pm-behind { padding: 14px; }
.pm-phone-screen .pm-behind p { margin: 0 0 10px; padding: 12px; border-radius: var(--radius-medium); background: var(--bg-section); color: var(--text-dim); }
.pm-phone-screen .sdk-menu-scrim { position: absolute; inset: 0; }
.pm-phone-screen .sdk-menu-sheet { position: absolute; left: 0; bottom: -1px; }
.pm-dlg { max-width: 880px; border: 1px solid var(--border); border-radius: var(--radius-large); background: var(--bg-section); }
.pm-dlg-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px 8px; }
.pm-dlg-head b { font-size: 18px; font-weight: 600; }
.pm-dlg-head small { margin-left: auto; color: var(--text-dim); font-size: 12px; }
.pm-dlg-body { display: grid; gap: 10px; padding: 4px 16px 12px; }
.pm-dlg-foot { display: flex; justify-content: flex-end; gap: 8px; padding: 10px 16px 14px; border-top: 1px solid var(--border); }
.pm-ed { box-sizing: border-box; max-width: 560px; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-ed-t { margin: 0 0 14px; font-size: 16px; font-weight: 600; }
.pm-actions { display: flex; flex-wrap: wrap; justify-content: flex-end; gap: 8px; margin-top: 10px; padding-top: 14px; border-top: 1px solid var(--border); }
@media (max-width: 640px) { .pm-pw { flex-basis: 140px; width: 140px; } }
@media (max-width: 480px) { .pm-ed .sdk-row { flex-direction: column; gap: 12px; } .pm-ed .sdk-row > .sdk-field { width: 100%; max-width: none; flex: none; } }`;

  // ---- data: the examples ----
  const KINDS = [
    ['Travel', [['Flight', 'plane', 'blue'], ['Train', 'train', 'teal'], ['Stay', 'bed', 'purple']]],
    ['Food', [['Meal', 'utensils', 'orange']]],
    ['Things to do', [['Museum', 'landmark', 'pink'], ['Walk', 'person-walking', 'green']]],
  ];
  const CUR = [['EUR', 'Euro'], ['USD', 'US dollar'], ['GBP', 'Pound sterling'], ['JPY', 'Yen'], ['CHF', 'Swiss franc'], ['CAD', 'Canadian dollar'], ['AUD', 'Australian dollar'], ['SEK', 'Swedish krona'], ['NOK', 'Norwegian krone'], ['DKK', 'Danish krone'], ['PLN', 'Zloty'], ['CZK', 'Czech koruna']];
  const ICONS = ['plane', 'train', 'bed', 'car', 'utensils', 'mug-hot', 'landmark', 'person-walking', 'ticket', 'bag-shopping', 'note-sticky', 'star', 'heart', 'camera', 'music', 'umbrella-beach',
    'mountain', 'tree', 'sun', 'moon', 'cloud', 'bicycle', 'ship', 'bus', 'gift', 'flag', 'location-dot', 'compass', 'book', 'wine-glass', 'cake-candles', 'bell'];
  // The palette is data (colours a person may store), not theme colours.
  const SWATCHES = [['Amber', '#c8873a'], ['Orange', '#e45628'], ['Red', '#b8503f'], ['Gold', '#d9a93c'], ['Green', '#6fae6b'], ['Teal', '#2f9e8f'], ['Cyan', '#0dc9ca'], ['Sky', '#6aa6e8'],
    ['Blue', '#3b6fb6'], ['Purple', '#7a5bb5'], ['Magenta', '#b05fa0'], ['Pink', '#e07aa0'], ['Stone', '#8a7a6a'], ['Brown', '#5a4a3c'], ['Sand', '#cfc6bb'], ['Ink', '#2b2119']];
  const BGS = [['Paris at night', '#1f2a44', '#c8873a'], ['Lisbon tiles', '#2f6f9e', '#e8d9b0'], ['Alps', '#6aa6e8', '#e9f1f7'], ['Forest', '#2f5d3a', '#8fbf7a'], ['Sand', '#cfc6bb', '#f1e9df'], ['Plain dark', '#1a1410', '#241c16']];
  const grad = (a, b) => `linear-gradient(135deg, ${a}, ${b})`;

  // ---- the triggers ----
  const PK_STATES = ['Placeholder', 'Filled', 'Hover', 'Focus', 'Open', 'Disabled', 'Error'];
  const fcls = (s) => (s === 'Hover' ? ' ds-force-hover' : s === 'Focus' ? ' ds-force-focus' : '');
  const val = (html, ph) => `<span class="sdk-picker-value${ph ? ' sdk-picker-ph' : ''}">${html}</span>`;
  const PK_KINDS = [
    { n: 'Kind', id: 'kind', ph: 'Choose one', lead: () => `<span class="sdk-picker-lead" style="--tone: var(--tint-teal)">${fa('train')}</span>`, v: 'Train' },
    { n: 'Currency', id: 'cur', ph: 'Choose one', v: '<b>EUR</b> Euro' },
    { n: 'Icon', id: 'icon', ph: 'Choose one', lead: () => `<span class="sdk-picker-lead">${fa('camera')}</span>`, v: 'Camera' },
    { n: 'Colour', id: 'col', ph: 'Choose one', lead: () => '<span class="sdk-picker-sw" style="--sw: #c8873a"></span>', v: '<span class="sdk-hex">#c8873a</span>' },
    { n: 'Background', id: 'bg', ph: 'Choose one', lead: () => `<span class="sdk-picker-thumb" style="--img: ${grad('#1f2a44', '#c8873a')}"></span>`, v: 'Paris at night' },
  ];
  function pkTrigger(k, s) {
    const ph = s === 'Placeholder'; const dis = s === 'Disabled' ? ' disabled' : ''; const err = s === 'Error' ? ' aria-invalid="true"' : '';
    return `<button type="button" class="sdk-picker${fcls(s)}" aria-haspopup="${k.id === 'icon' || k.id === 'col' ? 'dialog' : 'listbox'}" aria-expanded="${s === 'Open'}" aria-label="${k.n}"${dis}${err}>${ph ? '' : (k.lead ? k.lead() : '')}${val(ph ? k.ph : k.v, ph)}${fa('chevron-down', 'sdk-picker-icon')}</button>`;
  }
  function pkDate(s) {
    if (s === 'Placeholder' || s === 'Open') return '<span class="pm-na" aria-hidden="true">-</span>';
    const a = (s === 'Hover' ? ' class="ds-force-hover"' : s === 'Focus' ? ' class="ds-force-focus"' : '') + (s === 'Disabled' ? ' disabled' : '') + (s === 'Error' ? ' aria-invalid="true"' : '');
    return `<div class="sdk-group"><input type="date" aria-label="Day" value="2026-10-17"${a}><button type="button" class="sdk-field-btn" aria-label="Open the calendar" title="Open the calendar"${s === 'Disabled' ? ' disabled' : ''}>${fa('calendar')}</button></div>`;
  }
  const pkMatrix = (h44) => `<div class="ds-proposed"${h44 ? ' data-field-h="44"' : ''}>${(h44 ? PK_KINDS.filter((k) => k.id === "kind" || k.id === "col") : PK_KINDS).map((k) => `<div class="pm-row"><div class="pm-role">${k.n}</div><div class="dsf-states">${PK_STATES.map((s) => `<div class="dsf-state pm-pw"><small>${s}</small><div class="dsf-ex">${pkTrigger(k, s)}</div></div>`).join('')}</div></div>`).join('')}
    <div class="pm-row"><div class="pm-role">Date (Fields)</div><div class="dsf-states">${PK_STATES.map((s) => `<div class="dsf-state pm-pw"><small>${s}</small><div class="dsf-ex">${pkDate(s)}</div></div>`).join('')}</div></div></div>`;

  // ---- the flyouts ----
  const kindOpt = ([n, ic, c], o = {}) => `<div class="sdk-kind-option${o.active ? ' active' : ''}" role="option" aria-selected="${o.sel ? 'true' : 'false'}" style="--kind-color: var(--tint-${c})"><span class="sdk-kind-icon">${fa(ic)}</span><span class="sdk-kind-name">${n}</span></div>`;
  const kindGroups = () => KINDS.map(([t, ks]) => `<div class="sdk-kind-group" role="group" aria-label="${t}"><div class="sdk-kind-group-title" role="presentation">${t}</div>${ks.map((k) => kindOpt(k, { sel: k[0] === 'Train', active: k[0] === 'Stay' })).join('')}</div>`).join('');
  const curRow = ([c, n], sel, cur) => `<div class="sdk-menu-item${sel ? ' current' : ''}${cur ? ' active' : ''}" role="option" aria-selected="${sel || cur ? 'true' : 'false'}"><span class="sdk-menu-label"><span class="sdk-pk-code">${c}</span> ${n}</span></div>`;
  const iconGrid = () => `<div class="sdk-iconpick-grid" role="radiogroup" aria-label="Icons">${ICONS.map((n) => `<button type="button" class="sdk-iconpick-btn${n === 'camera' ? ' ds-force-hover' : n === 'heart' ? ' ds-force-focus' : ''}" role="radio" aria-checked="${n === 'train'}" aria-label="${n.replace(/-/g, ' ')}">${fa(n)}${fa('check', 'sdk-tile-check')}</button>`).join('')}</div>`;
  const swatchGrid = () => `<div class="sdk-swatch-grid" role="radiogroup" aria-label="Colours">${SWATCHES.map(([n, hx]) => `<button type="button" class="sdk-swatch${n === 'Red' ? ' ds-force-hover' : n === 'Sky' ? ' ds-force-focus' : ''}" role="radio" aria-checked="${hx === '#c8873a'}" aria-label="${n}" style="--sw: ${hx}">${fa('check')}</button>`).join('')}</div>`;
  const custom = () => '<label class="sdk-swatch-custom"><span>Custom</span><input type="color" value="#c8873a" aria-label="Custom colour"></label>';
  const cell = (cap, w, body) => `<div class="pm-cell" style="width:${w}px"><small>${cap}</small>${body}</div>`;
  const flyBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${cell('Kind: Train chosen, Stay is the cursor', 260, `<button type="button" class="sdk-picker" aria-haspopup="listbox" aria-expanded="true" aria-label="Kind">${`<span class="sdk-picker-lead" style="--tone: var(--tint-teal)">${fa('train')}</span>`}${val('Train')}${fa('chevron-down', 'sdk-picker-icon')}</button><div class="sdk-kind-list sdk-picker-flyout" role="listbox" aria-label="Kinds">${kindGroups()}</div>`)}
    ${cell('Currency: a styled list, EUR chosen, GBP the cursor', 260, `<button type="button" class="sdk-picker" aria-haspopup="listbox" aria-expanded="true" aria-label="Currency">${val('<b>EUR</b> Euro')}${fa('chevron-down', 'sdk-picker-icon')}</button><div class="sdk-menu sdk-picker-flyout" role="listbox" aria-label="Currencies">${CUR.slice(0, 7).map((c) => curRow(c, c[0] === 'EUR', c[0] === 'GBP')).join('')}</div>`)}
    ${cell('Icon: 8 columns of 32px, Train chosen', 308, `<button type="button" class="sdk-picker" aria-haspopup="dialog" aria-expanded="true" aria-label="Icon">${`<span class="sdk-picker-lead">${fa('train')}</span>`}${val('Train')}${fa('chevron-down', 'sdk-picker-icon')}</button><div class="sdk-popover sdk-popover-dense sdk-picker-pop sdk-picker-flyout" role="dialog" aria-label="Choose an icon">${iconGrid()}</div>`)}
    ${cell('Colour: 24px swatches, the native input is Custom', 260, `<button type="button" class="sdk-picker" aria-haspopup="dialog" aria-expanded="true" aria-label="Colour"><span class="sdk-picker-sw" style="--sw: #c8873a"></span>${val('<span class="sdk-hex">#c8873a</span>')}${fa('chevron-down', 'sdk-picker-icon')}</button><div class="sdk-popover sdk-popover-dense sdk-picker-pop sdk-picker-flyout" role="dialog" aria-label="Choose a colour">${swatchGrid()}${custom()}</div>`)}
  </div></div>`;

  const sheetBody = () => `<div class="ds-proposed"><div class="pm-phone-screen">
    <div class="pm-behind"><p>Add a cost</p><p>Name</p><p>Currency: EUR Euro</p><p>Amount</p></div>
    <div class="sdk-menu-scrim" aria-hidden="true"></div>
    <div class="sdk-menu-sheet" role="dialog" aria-modal="true" aria-label="Choose a currency">
      <span class="sdk-menu-grip" aria-hidden="true"></span>
      <div class="sdk-search">${fa('magnifying-glass')}<input type="search" aria-label="Search currencies" placeholder="Search currencies"></div>
      <div class="sdk-menu-list" role="listbox" aria-label="Currencies">${CUR.map((c) => curRow(c, c[0] === 'EUR', c[0] === 'GBP')).join('')}</div>
    </div></div></div>`;

  const bgBody = () => `<div class="ds-proposed"><div class="pm-dlg" role="dialog" aria-label="Choose a background">
    <div class="pm-dlg-head"><b>Choose a background</b><small>the Dialog, 880 wide (Dialogs family); only its content is drawn here</small></div>
    <div class="pm-dlg-body">
      <div class="sdk-chips" role="group" aria-label="Filter"><button type="button" class="sdk-chip" aria-pressed="false">All</button><button type="button" class="sdk-chip" aria-pressed="true">Cities</button><button type="button" class="sdk-chip" aria-pressed="false">Nature</button><button type="button" class="sdk-chip" aria-pressed="false">Plain</button><button type="button" class="sdk-chip" aria-pressed="false">Mine</button></div>
      <div class="sdk-tile-grid" role="group" aria-label="Backgrounds">${BGS.map(([n, a, b], i) => `<button type="button" class="sdk-tile${i === 2 ? ' ds-force-hover' : ''}" aria-pressed="${i === 0}"><span class="sdk-tile-img" style="--img: ${grad(a, b)}"></span><span>${n}</span>${fa('check', 'sdk-tile-check')}</button>`).join('')}</div>
    </div>
    <div class="pm-dlg-foot"><button type="button" class="btn btn-quiet">Cancel</button><button type="button" class="btn btn-primary">Use this background</button></div></div></div>`;

  const formBody = (uid) => `<div class="ds-proposed"><div class="pm-ed"><h5 class="pm-ed-t">Add a cost</h5><form class="sdk-form" onsubmit="return false">
    <div class="sdk-row">
      <div class="sdk-field sdk-m"><span class="sdk-label" id="${uid}-k">Kind</span><button type="button" class="sdk-picker" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${uid}-k"><span class="sdk-picker-lead" style="--tone: var(--tint-teal)">${fa('train')}</span>${val('Train')}${fa('chevron-down', 'sdk-picker-icon')}</button><span class="sdk-hint"></span></div>
      <div class="sdk-field sdk-m"><span class="sdk-label" id="${uid}-c">Currency</span><button type="button" class="sdk-picker" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="${uid}-c">${val('<b>EUR</b> Euro')}${fa('chevron-down', 'sdk-picker-icon')}</button><span class="sdk-hint"></span></div>
    </div>
    <div class="sdk-row">
      <div class="sdk-field sdk-m" role="group" aria-labelledby="${uid}-d"><span class="sdk-label" id="${uid}-d">Day</span><div class="sdk-group"><input type="date" value="2026-10-17" aria-label="Day"><button type="button" class="sdk-field-btn" aria-label="Open the calendar" title="Open the calendar">${fa('calendar')}</button></div><span class="sdk-hint"></span></div>
      <div class="sdk-field sdk-m"><span class="sdk-label" id="${uid}-o">Colour</span><button type="button" class="sdk-picker" aria-haspopup="dialog" aria-expanded="false" aria-labelledby="${uid}-o"><span class="sdk-picker-sw" style="--sw: #c8873a"></span>${val('<span class="sdk-hex">#c8873a</span>')}${fa('chevron-down', 'sdk-picker-icon')}</button><span class="sdk-hint"></span></div>
    </div>
    <div class="sdk-row">
      <div class="sdk-field sdk-m"><span class="sdk-label" id="${uid}-i">Icon</span><button type="button" class="sdk-picker" aria-haspopup="dialog" aria-expanded="false" aria-labelledby="${uid}-i"><span class="sdk-picker-lead">${fa('camera')}</span>${val('Camera')}${fa('chevron-down', 'sdk-picker-icon')}</button><span class="sdk-hint"></span></div>
      <div class="sdk-field sdk-m"><span class="sdk-label" id="${uid}-b">Background <span class="sdk-optional">(optional)</span></span><button type="button" class="sdk-picker" aria-haspopup="dialog" aria-expanded="false" aria-labelledby="${uid}-b">${val('Choose one', true)}${fa('chevron-down', 'sdk-picker-icon')}</button><span class="sdk-hint"></span></div>
    </div>
    <div class="pm-actions"><button type="button" class="btn btn-quiet">Cancel</button><button type="button" class="btn btn-primary">Save</button></div>
  </form></div></div>`;

  function renderPickers(api) {
    const { mk, h } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="pickers-h"><a href="#pickers">Pickers</a></h3><span class="ds-status-chip ds-st-approved">Approved</span><span class="ds-count">kind, currency, icon, colour and background pickers: one trigger, one flyout</span></header>
<p class="ds-desc"><b>Decided 2026-10-21: approved as drawn.</b> <b>One trigger</b> for every picker: the approved field look, with the picker's trailing icon inside. <b>One flyout</b>: the approved Menus surface (a list or a popover), and on a phone the Menus bottom sheet for a long list. <b>One colour picker</b> where there are three looks today. The date picker's grid belongs to the Menus family (drawn there); only its trigger, the date field, is in the table below. The background picker is a Dialog (880 wide, from the Dialogs family, drawn by another builder); its content is drawn here. Stylesheet: <code>proposed-pickers.css</code>, every rule under <code>.ds-proposed</code>; the flyouts use <code>proposed-menus.css</code>.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#pickers-anatomy">Anatomy</a><a href="#pickers-triggers">Triggers</a><a href="#pickers-flyouts">Flyouts</a><a href="#pickers-sheet">On a phone</a><a href="#pickers-bg">Background</a><a href="#pickers-form">In a form</a><a href="#pickers-widths">Widths</a><a href="#pickers-rules">Usage rules</a><a href="#pickers-map">Today to proposed</a><a href="#pickers-tokens">Tokens</a><a href="#pickers-markup">Markup contract</a><a href="#pickers-decided">Decided 2026-10-21</a></nav>

<h4 class="ds-h4" id="pickers-anatomy">Anatomy</h4>
${dim([
    ['1 Trigger', 'A <code>&lt;button type="button" class="sdk-picker"&gt;</code> that is the Fields box: <code>--field-h</code> high (38px, 44px on a phone), <code>--bg-input</code>, the 1px <code>--border</code> hairline, <code>--radius-small</code>, 14px text (16px on a phone). Hover is a fill, never an edge. Focus is the Fields mechanism: a 2px accent outline over the hairline (offset -2px) and the soft ring. Disabled is half strength. Error is the 2px danger edge with an error line below.'],
    ['2 Value and lead', 'The chosen value on the left, ellipsised. In front of it, if it helps: the kind\'s icon on its tinted tile, a 22px colour swatch, a background thumbnail. Nothing chosen: "Choose one" in <code>--text-dim</code>, as a placeholder.'],
    ['3 Trailing icon', 'Inside the box at the right: a 12px chevron in <code>--text-dim</code>, turned over while the flyout is open (<code>aria-expanded="true"</code>, which also holds the hover fill). The date field keeps its calendar button (Fields).'],
    ['4 Flyout', 'The Menus surface: <code>--radius-medium</code>, <code>--shadow-2</code>, the hairline, 4px padding (8px for a grid). Options are Menus rows (32px, 44px on a phone), hover is the quiet fill, the chosen row is <code>--selected-bg</code> with the accent-mix text (the Menus rule: no mark on a row). Placed under the trigger by its host.'],
    ['5 Bottom sheet', 'A long list on a phone (640px and narrower) is the Menus bottom sheet: grip, search, 44px rows. A grid (icon, colour) is a popover on any width.'],
    ['6 Icon grid', '8 columns of 32px icon buttons, 2px apart (6 columns of 44px on a phone). Hover is the quiet fill. Selected is the neutral selected fill, a check in the corner and the accent-mix colour on the icon: not an accent fill, not an accent border.'],
    ['7 Colour picker (one look)', 'A trigger with a 22px swatch and the hex in text; the flyout is a grid of 24px swatches (a 44px target on a phone), with the browser\'s own colour input as the last option, "Custom". Selected is a check on a neutral disc on the swatch: never an accent border, never a ring. A swatch\'s colour is data, passed as <code>--sw</code>.'],
    ['8 Background picker', 'A Dialog 880 wide (Dialogs family). Its content: the approved choice chips as the filter row, then a grid of tiles. A tile is a 16:9 image with its name; selected is the neutral selected fill with a check on the image, not a 2px accent border.'],
  ])}

<h4 class="ds-h4" id="pickers-triggers">Triggers, all states</h4>
<p class="ds-desc">Every trigger in every state, forced from the proposed rules. The date field (the Fields family's) is the last row, to show that it sits with the others.</p>
<p class="ds-desc"><b>38px</b> (the default; 44px when the frame is 640px or narrower)</p>
<div data-slot="m38"></div>
<p class="ds-desc"><b>44px</b> (the phone height, forced here so it can be compared at any width; a few rows only. The width switch at the top, 390, shows every row at 44px)</p>
<div data-slot="m44"></div>

<h4 class="ds-h4" id="pickers-flyouts">Flyouts</h4>
<p class="ds-desc">Kind and currency are lists on the Menus rows. Icon and colour are grids in a popover. In each, the trigger is open (<code>aria-expanded="true"</code>); the flyout is drawn in place under it. Forced in the grids: one hovered and one focused (the keyboard) cell.</p>
<div data-slot="fly"></div>

<h4 class="ds-h4" id="pickers-sheet">On a phone: the long list is a sheet</h4>
<p class="ds-desc">The currency list at 390 wide, as the Menus bottom sheet: grip, search, 44px rows, EUR chosen, GBP the keyboard cursor.</p>
<div data-slot="sheet"></div>

<h4 class="ds-h4" id="pickers-bg">Background picker</h4>
<p class="ds-desc">The content of the Dialog. The title bar and footer here are a stand-in for the Dialogs family's.</p>
<div data-slot="bg"></div>

<h4 class="ds-h4" id="pickers-form">In a form</h4>
<p class="ds-desc">The pickers beside the other fields, in the Fields family's form: the same height, label, hint and column.</p>
<div data-slot="form"></div>

<h4 class="ds-h4" id="pickers-widths">Widths</h4>
<p class="ds-desc">The same form at 390 (a phone, 44px) and 1280.</p>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="pickers-rules">Usage rules</h4>
<ul class="ds-desc">
  <li>A picker's trigger is a <code>button</code> with <code>aria-haspopup</code> and <code>aria-expanded</code>, and a label like any field. The chosen value is always shown in words (a colour as its hex), never as a colour alone.</li>
  <li>A list of 15 or fewer needs no search; longer ones start with a search field. On a phone a long list is the bottom sheet.</li>
  <li>Selected is neutral: a row is the selected fill; a tile is the selected fill with a check; a swatch is a check on a disc. No accent border, no accent fill.</li>
  <li>The keyboard: Down, Up, Home, End move the cursor, Enter or Space chooses and returns focus to the trigger, Escape closes. A grid also moves with the arrow keys sideways.</li>
  <li>The currency and kind list keep a real <code>select</code> or hidden input behind them as the form's value, so a form still submits without the script.</li>
  <li>The date picker is not drawn here: its grid is Menus; its trigger is the Fields date field.</li>
</ul>

<h4 class="ds-h4" id="pickers-map">Today to proposed</h4>
${tbl(['Today', 'Where', 'Proposed'], [
    ['<code>.sdk-kind-field</code> (38px, <code>padding 0 8px 0 5px</code>, chip then input then chevron)', '<code>host.ui.kindPicker</code>', 'The trigger (<code>.sdk-picker</code>); <code>.sdk-kind-field</code> is an alias. Padding 10px, the value is text on a button.'],
    ['A plain <code>select</code> filled by <code>host.ui.currencySelect</code> (the browser\'s own list)', 'Manage, Budget, forms', 'The trigger and a styled option list (Menus rows, code and name). The <code>select</code> stays behind it as the value.'],
    ['<code>.icon-pick summary</code> (34 by 30px, an accent icon) and its <code>.icon-grid</code> (38px buttons, accent edge on hover, an accent fill when selected)', 'list rows, the module display settings', 'The icon trigger and the 8-column grid of 32px buttons; hover quiet, selected neutral with a check.'],
    ['<code>.module-display .icon-pick .icon-grid button.selected</code> (accent fill)', 'module display settings', 'The selected button: neutral fill and a check.'],
    ['<code>input[type="color"]</code> (32 by 24px)', 'forms (global rule)', 'The colour trigger (swatch and hex), with the native input as "Custom" in the flyout.'],
    ['<code>.list-row input[type="color"]</code> (34 by 30px)', 'list rows', 'The colour trigger.'],
    ['<code>.look-dot</code> (an 18px round dot) and <code>.pick-pop</code> (260px, a fixed popup, <code>--radius-large</code>, no border)', 'Places', 'The colour trigger; the popover with the 24px swatch grid (a sheet on a phone).'],
    ['<code>.bgpick</code> (a fixed overlay, 880px card, <code>--radius-large</code>)', 'the background picker', 'A Dialog 880 (Dialogs family); content as drawn here.'],
    ['<code>.bgpick-tile</code> (2px transparent border, an accent-mix border on hover, lifts 1px)', 'the background picker', 'The tile: hover is the quiet fill; selected is the selected fill and a check. The lift and the border go.'],
    ['<code>.bgpick-chip</code> (28px, round, an accent fill when on)', 'the background picker', 'The approved choice chip (30px, small corner, selected fill). Aliased in Chips.'],
    ['<code>.sdk-datefield</code> (Fields)', 'the date picker', 'Unchanged: the Fields date field is the trigger; the grid is the Menus date picker.'],
  ])}

<h4 class="ds-h4" id="pickers-tokens">Tokens</h4>
${tbl(['Token', 'Use here', ''], [
    ['<code>--field-h</code>, <code>--field-pad-x</code>, <code>--field-font</code>', 'The trigger\'s height, padding and text size (Fields).', 'exists'],
    ['<code>--f-bg-h</code>, <code>--f-ring</code>', 'The hover fill and the focus ring of the trigger (Fields).', 'exists'],
    ['<code>--bg-card</code>, <code>--shadow-2</code>, <code>--radius-medium</code>', 'The flyout surface (Menus).', 'exists'],
    ['<code>--menu-hover</code>, <code>--menu-press</code>, <code>--menu-current-fg</code>, <code>--selected-bg</code>', 'Hover, pressed and selected in rows, icon buttons, swatches and tiles (Menus).', 'exists'],
    ['<code>--pk-icon</code>, <code>--pk-cols</code>', 'The icon button (32px; 44px on a phone) and the columns (8; 6).', 'new'],
    ['<code>--pk-sw</code>, <code>--pk-sw-cell</code>', 'The swatch (24px) and its cell (28px; 44px on a phone).', 'new'],
    ['<code>--pk-lead</code>', 'The tile, swatch or thumbnail in front of a value: 22px.', 'new'],
    ['<code>--tone</code>, <code>--sw</code>, <code>--img</code> (data)', 'Passed by the consumer: a kind\'s tint, a swatch\'s colour, a tile\'s picture.', 'data'],
  ])}

<h4 class="ds-h4" id="pickers-markup">Markup contract</h4>
${code(`<!-- the trigger -->
<span class="sdk-label" id="k-l">Kind</span>
<button type="button" class="sdk-picker" aria-haspopup="listbox" aria-expanded="false" aria-labelledby="k-l">
  <span class="sdk-picker-lead" style="--tone: var(--tint-teal)"><i class="fa-solid fa-train" aria-hidden="true"></i></span>
  <span class="sdk-picker-value">Train</span>
  <i class="fa-solid fa-chevron-down sdk-picker-icon" aria-hidden="true"></i>
</button>

<!-- a list flyout (Menus rows); the chosen row is .current with aria-selected -->
<div class="sdk-menu" role="listbox" aria-label="Currencies">
  <div class="sdk-menu-item current" role="option" aria-selected="true"><span class="sdk-menu-label"><span class="sdk-pk-code">EUR</span> Euro</span></div>
</div>

<!-- an icon grid in a popover -->
<div class="sdk-popover sdk-popover-dense sdk-picker-pop" role="dialog" aria-label="Choose an icon">
  <div class="sdk-iconpick-grid" role="radiogroup" aria-label="Icons">
    <button type="button" class="sdk-iconpick-btn" role="radio" aria-checked="true" aria-label="train"><i class="fa-solid fa-train" aria-hidden="true"></i><i class="fa-solid fa-check sdk-tile-check" aria-hidden="true"></i></button>
  </div>
</div>

<!-- a colour grid, with the native input as Custom -->
<div class="sdk-popover sdk-popover-dense sdk-picker-pop" role="dialog" aria-label="Choose a colour">
  <div class="sdk-swatch-grid" role="radiogroup" aria-label="Colours">
    <button type="button" class="sdk-swatch" role="radio" aria-checked="true" aria-label="Amber" style="--sw: #c8873a"><i class="fa-solid fa-check" aria-hidden="true"></i></button>
  </div>
  <label class="sdk-swatch-custom"><span>Custom</span><input type="color" value="#c8873a" aria-label="Custom colour"></label>
</div>

<!-- a background tile, in the Dialog -->
<button type="button" class="sdk-tile" aria-pressed="true"><span class="sdk-tile-img" style="--img: linear-gradient(135deg, #1f2a44, #c8873a)"></span><span>Paris at night</span><i class="fa-solid fa-check sdk-tile-check" aria-hidden="true"></i></button>`)}
<p class="ds-desc"><b>Names kept.</b> <code>.sdk-kind-field</code> is an alias of the trigger; <code>.sdk-kind-list</code>, <code>.sdk-kind-option</code> and <code>.sdk-menu-sheet</code> are the Menus family's. <code>.icon-grid</code>, <code>.bgpick-tile</code> and <code>.look-dot</code> have no alias: their markup changes.</p>

<h4 class="ds-h4" id="pickers-decided">Decided 2026-10-21</h4>
<p class="ds-desc">Thomas approved every choice below, as drawn, on 2026-10-21.</p>
${tbl(["Decided as drawn","What"], [
    ["Swatches","Rounded squares with a check on a neutral disc."],
    ["The 16-colour palette","Is data, not design."],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + PK_CSS }, o || {}));
    slot('m38').appendChild(F(pkMatrix(false), 'Pickers, triggers, all states'));
    slot('m44').appendChild(F(pkMatrix(true), 'Pickers, triggers, all states, 44px'));
    slot("fly").appendChild(F(flyBody(), "Pickers, flyouts"));
    slot('sheet').appendChild(F(sheetBody(), 'Pickers, bottom sheet', { pinWidth: 390, height: 580 }));
    slot('bg').appendChild(F(bgBody(), 'Pickers, background dialog content'));
    slot('form').appendChild(F(formBody('pf'), 'Pickers, a form'));
    const ws = mk('div', '');
    for (const w of [390, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(formBody('w' + w), `Pickers at ${w}`, { pinWidth: w }));
    }
    slot('widths').appendChild(ws);
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'pickers', covers: ['picker', 'kind-picker', 'currency-select', 'icon-picker', 'colour-picker', 'color-picker', 'background-picker'], group: 'Controls', name: 'Pickers: kind, currency, icon, colour, background', status: 'approved',
    words: 'pickers picker kind currency icon colour color swatch background tile select flyout sheet trigger combobox listbox sdk-picker sdk-kind-field icon-grid bgpick look-dot', render: renderPickers,
  });
})();
