/* The design system page, Proposed system view: the families Thomas has been shown a proposal for. Each entry draws a clean spec of
   the proposed component from proposed.css (every rule under .ds-proposed) and a mapping from today's looks. A family with no entry
   here is listed in the view as "Not yet decided". Nothing here is a style of the product: markup, words and tables only.
   Statuses: 'proposed' (drawn, waiting for a decision), 'approved' (decided). Thomas decides; a status changes only when he says so. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = `
.pm-row { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 4px 14px; align-items: center; padding: 8px 0; }
.pm-row + .pm-row { border-top: 1px solid var(--border); }
.pm-role { color: var(--text-dim); font-size: 12px; font-weight: 700; }
.pm-h { margin: 16px 0 2px; font-size: 13px; font-weight: 700; }
.pm-h:first-child { margin-top: 4px; }
.pm-sub { margin: 0 0 4px; color: var(--text-dim); font-size: 12px; }
.pm-map { display: grid; grid-template-columns: minmax(140px, 1fr) minmax(140px, 1fr) minmax(180px, 1.4fr); gap: 8px 18px; padding: 12px 0; align-items: start; }
.pm-map + .pm-map { border-top: 1px solid var(--border); }
.pm-map > div > small { display: block; margin-bottom: 4px; color: var(--text-dim); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.pm-name { margin: 0 0 6px; font-size: 13px; font-weight: 700; }
.pm-to { margin: 0 0 4px; font-size: 13px; }
.pm-why { margin: 0 0 4px; color: var(--text-dim); font-size: 12px; }
.pm-where { margin: 0; color: var(--text-dim); font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; overflow-wrap: anywhere; }
.pm-zoom { zoom: 2.5; display: flex; gap: 14px; align-items: center; padding: 6px 4px; }
.pm-wide { display: grid; gap: 12px; padding-top: 6px; }
.pm-card { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px; border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-card > .pm-grow { flex: 1 1 140px; min-width: 0; }
.pm-card > .pm-grow b { display: block; font-size: 14px; }
.pm-card > .pm-grow span { color: var(--text-dim); font-size: 12px; }
.pm-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
@media (max-width: 640px) {
  .pm-row { grid-template-columns: minmax(0, 1fr); }
  .pm-map { grid-template-columns: minmax(0, 1fr); }
}`;

  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;
  const P = (inner) => `<div class="ds-proposed">${inner}</div>`;

  // ---- the matrix: role x size x state, forced ----
  const TEXT_ROLES = [
    { n: 'Primary', cls: 'btn-primary', label: 'Save' },
    { n: 'Secondary', cls: '', label: 'Edit' },
    { n: 'Danger', cls: 'btn-danger', label: 'Delete' },
    { n: 'Danger, solid (a final confirm)', cls: 'btn-danger solid', label: 'Delete for good' },
    { n: 'Quiet', cls: 'btn-quiet', label: 'Cancel' },
    { n: 'Selected', cls: 'on', attrs: ' aria-pressed="true"', label: 'Muted' },
  ];
  const ICON_ROLES = [
    { n: 'Primary', cls: 'btn-primary', icon: 'paper-plane', label: 'Send' },
    { n: 'Secondary', cls: '', icon: 'plus', label: 'Add' },
    { n: 'Danger', cls: 'btn-danger', icon: 'trash', label: 'Delete' },
    { n: 'Quiet', cls: 'btn-quiet', icon: 'ellipsis-vertical', label: 'More' },
    { n: 'Selected', cls: 'on', attrs: ' aria-pressed="true"', icon: 'bookmark', label: 'Keep' },
  ];
  const STATES = [
    { n: 'Rest' }, { n: 'Hover', cls: 'ds-force-hover' }, { n: 'Focus', cls: 'ds-force-focus' }, { n: 'Pressed', cls: 'ds-force-active' },
    { n: 'Disabled', attrs: ' disabled' }, { n: 'Loading', attrs: ' aria-busy="true"', busy: true },
  ];
  const textBtn = (r, s, size) => `<button type="button" class="btn${r.cls ? ' ' + r.cls : ''}${size ? ' btn-small' : ''}${s.cls ? ' ' + s.cls : ''}"${r.attrs || ''}${s.attrs || ''}>${s.busy ? fa('spinner', 'fa-spin') : ''}${r.label}</button>`;
  const iconBtn = (r, s, size) => `<button type="button" class="sdk-icon-btn${r.cls ? ' ' + r.cls : ''}${size ? ' btn-small' : ''}${s.cls ? ' ' + s.cls : ''}"${r.attrs || ''}${s.attrs || ''} aria-label="${r.label}" title="${r.label}">${fa(s.busy ? 'spinner' : r.icon, s.busy ? 'fa-spin' : '')}</button>`;
  function matrix(kind, size) {
    const roles = kind === 'text' ? TEXT_ROLES : ICON_ROLES;
    const make = kind === 'text' ? textBtn : iconBtn;
    return roles.map((r) => `<div class="pm-row"><div class="pm-role">${r.n}</div><div class="dsf-states">${STATES.map((s) => `<div class="dsf-state"><small>${s.n}</small><div class="dsf-ex">${make(r, s, size)}</div></div>`).join('')}</div></div>`).join('');
  }
  const matrixBody = () => P(
    `<p class="pm-h">Text buttons, default size</p><p class="pm-sub">38px; 44px when the frame is 640px or narrower.</p>${matrix('text', false)}`
    + `<p class="pm-h">Text buttons, small</p><p class="pm-sub">30px, for dense rows and toolbars.</p>${matrix('text', true)}`
    + `<p class="pm-h">Icon-only buttons, default size</p><p class="pm-sub">A square, the same height.</p>${matrix('icon', false)}`
    + `<p class="pm-h">Icon-only buttons, small</p>${matrix('icon', true)}`);

  // ---- widths: the same screens at 390, 700 and 1280 ----
  const widthBody = () => P(`<div class="pm-wide">
    <div class="pm-card"><div class="pm-grow"><b>Delete this note?</b><span>It goes for good.</span></div><div class="pm-bar"><button type="button" class="btn btn-quiet">Cancel</button><button type="button" class="btn btn-danger">Delete</button><button type="button" class="btn btn-primary">Keep it</button></div></div>
    <div class="pm-card"><div class="pm-bar"><button type="button" class="btn btn-small">${fa('plus')} Add</button><button type="button" class="btn btn-small on" aria-pressed="true">${fa('filter')} Filter</button><button type="button" class="btn btn-small btn-quiet">Clear</button><button type="button" class="sdk-icon-btn btn-small" aria-label="Sort" title="Sort">${fa('arrow-down-short-wide')}</button><button type="button" class="sdk-more" aria-label="More" title="More">${fa('ellipsis-vertical')}</button></div></div>
    <div class="pm-card"><form class="sdk-form" style="flex:1 1 260px" onsubmit="return false"><div class="sdk-field sdk-full"><span class="sdk-label">Name</span><div class="sdk-group"><input type="text" value="Louvre" aria-label="Name"><button type="button" class="sdk-field-btn" aria-label="Open the calendar" title="Open the calendar">${fa('calendar')}</button><button type="button" class="sdk-btn primary">Find</button></div></div></form></div>
  </div>`);

  // ---- the mapping: today's looks -> the new role and size ----
  const smallize = (html) => html.replace(/(class=)"btn( [^"]*)?"/g, (m, k, rest) => `${k}"btn${rest || ''} btn-small"`);
  const MAP = [
    // text buttons
    { fam: 'buttons', n: 'Button', ctx: 'app', to: 'Secondary, default', why: 'The hairline stays (it is there today); hover is a fill, not an accent edge.' },
    { fam: 'buttons', n: 'Primary', ctx: 'app', to: 'Primary, default', why: 'The one main action of a view. The hover glow goes.' },
    { fam: 'buttons', n: 'Accent (the pop-out join on a space card)', ctx: 'app', to: 'Secondary, small', prop: '<button type="button" class="btn btn-small">Join</button>', change: '.btn-accent becomes .btn.btn-small', why: 'Secondary, because it sits beside a Primary and a view has one. Small, because it is the compact join on a card. If it is ever the only action on a card, make it Primary.' },
    { fam: 'buttons', n: 'Danger (an outline in --danger)', ctx: 'app', to: 'Danger, soft red fill', why: 'The red outline becomes a soft red fill with red text. No outline.' },
    { fam: 'buttons', n: 'On (a toggled button)', ctx: 'app', to: 'Selected fill', why: 'Already a fill (--selected-bg); it now also shows on .sdk-btn and icon buttons.' },
    { fam: 'buttons', n: 'Off (a danger outline)', ctx: 'app', to: 'Danger, soft red fill', why: 'Off was a red outline cue. Use Danger when the off state is a warning (away, muted). If it is only the other state of a toggle, use plain Secondary.' },
    { fam: 'buttons', n: 'Small (the action bar, the nav bar\'s labelled look)', ctx: 'app', to: 'Any role, small (30px)', why: 'Was 5px 10px, about 29px; now one fixed 30px.' },
    { fam: 'buttons', n: 'Nav text button (.btn.nav-text in the top bar)', ctx: 'app', to: 'Secondary, small', why: 'Keeps the nav type (.nav-text outweighs the button type). Open: the top bar\'s coloured areas may want their own role fills.' },
    { fam: 'buttons', n: 'Button', ctx: 'host', to: 'Secondary, default', why: 'One rule set for the app and the module page; the 6px and 7px paddings go.' },
    { fam: 'buttons', n: 'Primary', ctx: 'host', to: 'Primary, default' },
    { fam: 'buttons', n: 'Danger', ctx: 'host', to: 'Danger, soft red fill', why: 'Today a module\'s Danger uses --danger for text; it now matches the app\'s.' },
    { fam: 'buttons', n: 'Small, where a module uses it (Polls, Stream)', ctx: 'host', to: 'Small (30px)', why: 'Today the module base has no rule, so it looks like .btn. In the one system it is really small.' },
    { fam: 'buttons', n: 'Form button .sdk-btn (38px)', ctx: 'host', to: 'Secondary / Primary, default', why: '.sdk-btn and .sdk-btn.primary stay as names (aliases of .btn and .btn-primary). Same 38px, same fills.' },
    // modules that resize .btn
    { fam: 'buttons', n: 'Budget: target header and empty state', ctx: 'mod:budget', to: 'Secondary, small', small: true, change: 'add btn-small; the module\'s .target-head .btn rule goes', why: 'Was 28px, 12px text.' },
    { fam: 'buttons', n: 'Maps: banner and callout', ctx: 'mod:maps', to: 'Secondary + Primary, default', change: 'the module\'s .callout-actions .btn rule goes', why: 'The banner\'s 2px 10px resize goes too.' },
    { fam: 'buttons', n: 'Places: found row, part head', ctx: 'mod:places', to: 'Secondary, small', small: true, change: 'add btn-small; the .found-row .btn rule goes', why: 'Was min-height 30px.' },
    { fam: 'buttons', n: 'Research: with a button', ctx: 'mod:research', to: 'Secondary, default', change: 'the .with-button .btn rule keeps only flex: none', why: 'It sits in a line with a field, so it takes the field height.' },
    { fam: 'buttons', n: 'Planner: add row, suggestion, dashed edge button', ctx: 'mod:travel', to: 'Secondary, default (the suggestion: small)', change: 'the .add-row, .suggestion and .decision resizes go', why: 'The add row sits beside a field, so default.' },
    { fam: 'buttons', n: 'To-do: quick add (full width)', ctx: 'mod:todo', to: 'Secondary, default, full width', change: 'keeps width: 100% (layout)', why: 'Width is layout, not look; it stays in the module.' },
    // icon buttons
    { fam: 'icon-buttons', n: 'Action button .action-btn (38px)', ctx: 'app', to: 'Icon-only, Secondary / Primary, default', why: '.action-btn stays as a name and becomes an alias of .sdk-icon-btn. Same 38px; hover is a fill.' },
    { fam: 'icon-buttons', n: 'Action button, other sizes (--action-btn-h)', ctx: 'app', to: 'Two sizes only', prop: '<div style="display:flex;gap:8px;align-items:center"><button type="button" class="sdk-icon-btn btn-small" aria-label="Small">' + fa('plus') + '</button><button type="button" class="sdk-icon-btn" aria-label="Default">' + fa('plus') + '</button><button type="button" class="sdk-icon-btn" aria-label="Default on a phone: 44px">' + fa('plus') + '</button></div>', change: '--action-btn-h goes; use .btn-small', why: '30 and 44 become small and the default (44 on a phone). The third shows the default; a phone makes it 44px.' },
    { fam: 'icon-buttons', n: 'Action button, in a module', ctx: 'host', to: 'Icon-only, Secondary / Primary, default', why: 'The module copy of the rules goes; one rule set.' },
    { fam: 'icon-buttons', n: 'Call button .fbtn (round, on the call toolbar)', ctx: 'app', to: 'Not changed: stays a circle', why: 'The call controls keep --radius-round and the toolbar\'s own sizes. Drawn here with the product\'s own rules.' },
    { fam: 'icon-buttons', n: 'Call button, leave', ctx: 'app', to: 'Not changed: the solid red stays', why: 'The one place a solid red is kept: a final confirm.' },
    { fam: 'icon-buttons', n: 'More button .sdk-more (28px)', ctx: 'host', to: 'Icon-only, Quiet, small (30px)', why: 'Was 28px. The name stays as an alias.' },
    { fam: 'icon-buttons', n: 'Icon button .icon-btn (30px), Maps and Research', ctx: 'mod:maps', to: 'Icon-only, Quiet, small', why: 'The module\'s restated rule goes.' },
    { fam: 'icon-buttons', n: 'Icon button .icon-btn, Research', ctx: 'mod:research', to: 'Icon-only, Quiet, small' },
    { fam: 'icon-buttons', n: 'Field button .sdk-field-btn (--field-h square)', ctx: 'host', to: 'Icon-only, Secondary, default', why: 'Same size (--field-h); it already was the default.' },
    { fam: 'icon-buttons', n: 'Editor close .sdk-editor-close', ctx: 'host', to: 'Icon-only, Quiet, small', why: 'Was 32px. It keeps its corner position; its page-coloured fill becomes clear, so the corner strip keeps its own fill.' },
    { fam: 'icon-buttons', n: 'Message button .msg-btn (chat)', ctx: 'app', to: 'Icon-only, Quiet, small; Keep = Selected', why: 'Was a 13px glyph with 4px padding, too small to press. The kept state is the selected fill, not only a colour.' },
    { fam: 'icon-buttons', n: 'Module toolbar button .tb-btn (round, 26px)', ctx: 'app', to: 'Secondary, small; on = Selected', prop: '<div style="display:flex;gap:8px"><button type="button" class="btn btn-small">' + fa('tag') + ' Tags</button><button type="button" class="btn btn-small on" aria-pressed="true">' + fa('filter') + ' Filter</button></div>', change: '.tb-btn becomes .btn.btn-small', why: 'It has a word, so it is a text button; the pill goes (corners are --radius-small), and on is the selected fill, not a solid accent.' },
    { fam: 'icon-buttons', n: 'Icon link .icon-link (the top bar)', ctx: 'app', to: 'Not part of this component', why: 'Top-bar navigation chrome (the nav registry). Unchanged.' },
  ];

  const ZOOM = P(`<div class="pm-zoom"><button type="button" class="btn">${fa('pen')} Edit</button><button type="button" class="sdk-icon-btn" aria-label="Add">${fa('plus')}</button></div>`);

  function render(api) {
    const { mk, h } = api;
    const block = mk('section', 'ds-block ds-spec');
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="buttons-p-h"><a href="#proposed/buttons">Buttons</a></h3><span class="ds-status-chip ds-st-proposed">Proposed</span><span class="ds-count">text buttons and icon-only buttons, one component</span></header>
<p class="ds-desc">Thomas's decisions of 2026-10-15, drawn from <code>proposed.css</code> (every rule under <code>.ds-proposed</code>). Four roles, two sizes, one icon-only button, every state. Today's looks: <a href="#today/buttons">Buttons</a> and <a href="#today/icon-buttons">Icon buttons</a> in Today.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#proposed/buttons-anatomy">Anatomy</a><a href="#proposed/buttons-roles">Roles</a><a href="#proposed/buttons-sizes">Sizes</a><a href="#proposed/buttons-states">States</a><a href="#proposed/buttons-widths">Widths</a><a href="#proposed/buttons-rules">Usage rules</a><a href="#proposed/buttons-tokens">Tokens</a><a href="#proposed/buttons-markup">Markup</a><a href="#proposed/buttons-mapping">Mapping from today</a></nav>

<h4 class="ds-h4" id="p-buttons-anatomy">Anatomy</h4>
<div data-slot="zoom"></div>
${dim([
    ['1 Box', 'Height = size (38px, 44px on a phone; small 30px). Corners <code>--radius-small</code>. Never wraps its label.'],
    ['2 Edge', '1px. <code>--border</code> on Secondary only (the neutral hairline it has today); transparent on every other role, in every state, so all buttons are one box size.'],
    ['3 Fill', 'The role\'s fill. Hover, pressed and selected change the fill, never the edge.'],
    ['4 Label', '14px (small 13px), weight 500. A verb. Sentence case.'],
    ['5 Icon', '16px (small 14px), 6px before the label, <code>aria-hidden</code>. Icon-only: a square the same height, the icon centred.'],
    ['6 Focus ring', '2px <code>--accent</code> outline, 2px off the box, on keyboard focus only (the ring the top bar and the call already use).'],
  ])}

<h4 class="ds-h4" id="p-buttons-roles">Roles</h4>
${tbl(['Role', 'Class', 'Use it for', 'Fill and text'], [
    ['Primary', '<code>.btn-primary</code>', 'The one main action of a view: Save, Send, Join.', '<code>--accent</code> fill, <code>--on-accent</code> text; hover <code>--primary-hover</code>'],
    ['Secondary', '<code>.btn</code>', 'Everything else. The default.', '<code>--secondary</code> fill and <code>--border</code> hairline, <code>--secondary-text</code>; hover <code>--secondary-hover</code>'],
    ['Danger', '<code>.btn-danger</code>', 'Delete or leave, only. A soft red fill with red text, no outline.', '<code>--danger</code> 16% fill, text <code>--danger</code> mixed 70% into <code>--text</code> (<code>--danger-text</code> is pale in light mode); hover 26%, pressed 34%'],
    ['Danger, solid', '<code>.btn-danger.solid</code>', 'A final confirm only (Delete for good, End call). Rare.', '<code>--danger</code> fill, <code>--on-danger</code>'],
    ['Quiet', '<code>.btn-quiet</code>', 'Low-key actions: Cancel, Keep, dismiss, Clear. Text only.', 'No fill, <code>--text</code> (icon-only: <code>--text-dim</code>); hover a 10% <code>--text</code> fill'],
    ['Selected', '<code>.on</code> or <code>aria-pressed="true"</code>', 'A toggle that is on. Replaces today\'s on and off variants.', '<code>--selected-bg</code> fill, text <code>--accent</code> mixed 55% into <code>--text</code> (the plain accent is under 3:1 on that fill in light mode)'],
  ])}

<h4 class="ds-h4" id="p-buttons-sizes">Sizes</h4>
${tbl(['Size', 'Class', 'Height', 'Use it for'], [
    ['Default', '(none)', '<code>--btn-h</code> = <code>--field-h</code>: 38px; 44px on a phone (640px and narrower)', 'Forms, dialogs, rows beside a field, every touch use.'],
    ['Small', '<code>.btn-small</code>', '<code>--btn-h-small</code>: 30px', 'Dense rows and toolbars. On a phone its look stays 30px and its hit area grows to 44px.'],
  ])}
<p class="ds-desc">Replaces <code>.btn-small</code> (about 29px), the 28px more button, the 30px icon button, the 32px editor close and the 26px toolbar button. Icon-only buttons are square at both heights.</p>

<h4 class="ds-h4" id="p-buttons-states">States</h4>
<p class="ds-desc">Every role, in every state, forced from the proposed rules: Rest, Hover, Focus, Pressed, Disabled (half strength, no pointer), Loading (<code>aria-busy="true"</code> with a spinning icon). Selected is a role, so it has all of them too. Light and dark are drawn side by side; the width control above also applies.</p>
<div data-slot="matrix"></div>

<h4 class="ds-h4" id="p-buttons-widths">Widths</h4>
<p class="ds-desc">The same three rows at 390 (a phone, 44px), 700 and 1280.</p>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="p-buttons-rules">Usage rules</h4>
<ul class="ds-desc">
  <li>One Primary per view. Two equal actions: neither is Primary, both are Secondary.</li>
  <li>Danger only for delete and leave. Use the solid red only for the final confirm after a Danger button.</li>
  <li>Quiet for Cancel and dismiss, beside a Primary; never the only action in a row.</li>
  <li>Icon-only needs an <code>aria-label</code> and a <code>title</code> (the tooltip). If a word fits, use a text button.</li>
  <li>Minimum target 44px on a phone: the default size, or a small button with its grown hit area. Keep 8px between buttons.</li>
  <li>The label is a verb in sentence case (Save, Add a day), and the names in CLAUDE.md.</li>
  <li>State and kind are shown by fill and text colour. Never a coloured border, outline or stripe.</li>
  <li>The call's controls (<code>.fbtn</code>) are not this component: they stay circles.</li>
</ul>

<h4 class="ds-h4" id="p-buttons-tokens">Tokens</h4>
${tbl(['Token', 'Use here', ''], [
    ['<code>--btn-h</code> (new)', 'Default height. Equals <code>--field-h</code>; 44px at 640px and narrower, page wide (today only <code>.sdk-form</code> does that).', 'new'],
    ['<code>--btn-h-small</code> (new)', 'Small height, 30px.', 'new'],
    ['<code>--radius-small</code>', 'The corners of every button.', 'exists'],
    ['<code>--secondary</code>, <code>--secondary-hover</code>, <code>--secondary-text</code>, <code>--border</code>', 'Secondary: fill, hover, text, the hairline.', 'exists'],
    ['<code>--accent</code>, <code>--primary-hover</code>, <code>--on-accent</code>', 'Primary; also the focus ring and the selected text.', 'exists'],
    ['<code>--danger</code>, <code>--on-danger</code>', 'Danger fill and text (both mixed), and the solid fill and its text. <code>--danger-text</code> is not used: it has no light value.', 'exists'],
    ['<code>--text</code>, <code>--text-dim</code>', 'Quiet text and icon, hover and pressed fills (mixed with transparent).', 'exists'],
    ['<code>--selected-bg</code>', 'The Selected fill.', 'exists'],
  ])}

<h4 class="ds-h4" id="p-buttons-markup">Markup contract</h4>
${code(`<!-- text button: Secondary is the default; add one role class, and .btn-small for small -->
<button type="button" class="btn">Edit</button>
<button type="button" class="btn btn-primary">Save</button>
<button type="button" class="btn btn-danger">Delete</button>
<button type="button" class="btn btn-danger solid">Delete for good</button>
<button type="button" class="btn btn-quiet">Cancel</button>
<button type="button" class="btn btn-small">Add</button>
<button type="button" class="btn on" aria-pressed="true">Muted</button>
<button type="button" class="btn" aria-busy="true"><i class="fa-solid fa-spinner fa-spin" aria-hidden="true"></i>Saving</button>

<!-- icon-only: the same role and size classes; aria-label and title are required -->
<button type="button" class="sdk-icon-btn" aria-label="Add" title="Add"><i class="fa-solid fa-plus" aria-hidden="true"></i></button>
<button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="More" title="More">...</button>

<!-- a link that looks like a button -->
<a class="btn" href="...">Open in Maps</a>`)}
<p class="ds-desc"><b>Names kept so no consumer has to change.</b> The new names are <code>.btn-quiet</code>, <code>.btn-danger.solid</code> and <code>.sdk-icon-btn</code>. <code>.sdk-icon-btn</code> is the one icon-only name because it is what the SDK draws (like <code>.sdk-btn</code>, <code>.sdk-more</code>); the older names stay as aliases so no markup is edited: <code>.action-btn</code> and <code>.sdk-field-btn</code> (Secondary), <code>.sdk-more</code>, <code>.icon-btn</code>, <code>.sdk-editor-close</code> and <code>.msg-btn</code> (Quiet, small). <code>.btn</code>, <code>.btn-primary</code>, <code>.btn-danger</code>, <code>.btn-small</code>, <code>.sdk-btn</code> and <code>.btn.on</code> keep their names; <code>.btn-accent</code> and <code>.btn.off</code> fold into the roles (see the mapping).</p>

<h4 class="ds-h4" id="p-buttons-mapping">Mapping from today</h4>
<p class="ds-desc"><b>In short.</b> The red outline becomes a soft red fill. The accent button becomes Secondary (small) because a view has one Primary. On and off fold into the selected fill and Danger. Seven icon-button looks become one: Quiet for more, close, message and the module's icon button; Secondary for the action and field buttons; the call's controls stay circles. Sizes 26, 28, 30 and 32 become 30; 38 stays (44 on a phone). Each row is drawn twice: today's look with the product's rules, and the proposed look with the same markup unless the row says the markup changes. Module resizes (Budget, Maps, Places, Research, Planner, To-do) are drawn in the module's own stylesheet with the proposal over it, so you see the standard size, not the module's.</p>
<div data-slot="mapping"></div>`;

    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const zoom = api.makeFrame('app', ZOOM, { height: 150, proposed: true, title: 'Anatomy sample', css: PM_CSS });
    slot('zoom').appendChild(zoom);
    const mats = mk('div', '');
    for (const m of ['light', 'dark']) {
      mats.appendChild(mk('p', 'ds-ctx', `${m === 'light' ? 'Light' : 'Dark'} (fixed)`));
      mats.appendChild(api.makeFrame('app', matrixBody(), { pin: m, proposed: true, title: `Buttons, all states, ${m}`, css: PM_CSS }));
    }
    slot('matrix').appendChild(mats);
    const ws = mk('div', '');
    for (const w of [390, 700, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(api.makeFrame('app', widthBody(), { pinWidth: w, proposed: true, title: `Buttons at ${w}`, css: PM_CSS }));
    }
    slot('widths').appendChild(ws);

    // mapping, one frame per stylesheet context
    const groups = [];
    for (const row of MAP) {
      const fam = api.fam(row.fam);
      const v = fam && (fam.variants || []).find((x) => x.n === row.n && (x.ctx || 'app') === row.ctx);
      if (!v) { slot('mapping').appendChild(mk('p', 'ds-desc', `Mapping row not drawn: ${h(row.n)} is no longer in Today.`)); continue; }
      let g = groups.find((x) => x.ctx === row.ctx);
      if (!g) groups.push(g = { ctx: row.ctx, rows: [] });
      g.rows.push({ row, v });
    }
    const mapEl = slot('mapping');
    for (const g of groups) {
      mapEl.appendChild(mk('p', 'ds-ctx', `Drawn with: ${h(api.ctxLabel(g.ctx))}`));
      const body = g.rows.map(({ row, v }) => {
        const where = v.where || api.locate(g.ctx, v.sel);
        const prop = row.prop || (row.small ? smallize(v.html) : v.html);
        return `<div class="pm-map"><div><small>Today</small><div class="dsf-ex">${v.html}</div></div><div><small>Proposed</small><div class="dsf-ex">${P(prop)}</div></div><div><p class="pm-name">${h(v.n)}</p><p class="pm-to"><b>Becomes:</b> ${h(row.to)}</p>${row.change ? `<p class="pm-why"><b>Markup:</b> ${h(row.change)}</p>` : '<p class="pm-why"><b>Markup:</b> no change</p>'}${row.why ? `<p class="pm-why">${h(row.why)}</p>` : ''}<p class="pm-where">${v.note ? h(v.note.replace(/<[^>]+>/g, '')) + '<br>' : ''}${where ? h(where) : ''}</p></div></div>`;
      }).join('');
      mapEl.appendChild(api.makeFrame(g.ctx, body, { proposed: true, title: `Mapping, ${api.ctxLabel(g.ctx)}`, css: PM_CSS }));
    }
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'buttons', covers: ['buttons', 'icon-buttons'], group: 'Controls', name: 'Buttons', status: 'proposed',
    words: 'button icon-only icon buttons primary secondary danger quiet small', render,
  });
})();
