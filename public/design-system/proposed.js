/* Proposed system view: the families Thomas has been shown a proposal for. Each entry draws a clean spec of
   the proposed component from proposed.css (every rule under .ds-proposed). Families still to decide are named in UNDECIDED, nothing more. Nothing here is a style of the product: markup, words and tables only.
   Statuses: 'approved' (decided) or 'proposed' (drawn, waiting for a decision). Thomas decides; a status changes only when he says so. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = `
.pm-row { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 4px 14px; align-items: start; padding: 8px 0; }
.pm-row.pm-small { --pm-h: var(--btn-h-small, 30px); }
.pm-row + .pm-row { border-top: 1px solid var(--border); }
/* The label sits level with the buttons: it starts below the caption (12px line + 5px gap) and is as tall as the button, centred. */
.pm-role { display: flex; align-items: center; min-height: var(--pm-h, var(--btn-h)); margin-top: 17px; color: var(--text-dim); font-size: 12px; font-weight: 700; line-height: 1.2; }
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
  .pm-role { min-height: 0; margin-top: 0; }
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
    return roles.map((r) => `<div class="pm-row${size ? ' pm-small' : ''}"><div class="pm-role">${r.n}</div><div class="dsf-states">${STATES.map((s) => `<div class="dsf-state"><small>${s.n}</small><div class="dsf-ex">${make(r, s, size)}</div></div>`).join('')}</div></div>`).join('');
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

  // ---- the round buttons: a general component, kept as circles, drawn with the product's own .fbtn rules ----
  const RB_STATES = [
    { n: 'Rest' }, { n: 'Hover', cls: 'ds-force-hover' }, { n: 'Focus', cls: 'ds-force-focus' }, { n: 'Pressed', cls: 'ds-force-active' },
    { n: 'On', cls: 'on' }, { n: 'Off', cls: 'off' }, { n: 'Loading', cls: 'loading' }, { n: 'Disabled', attrs: ' disabled' },
  ];
  // icon is shown when on or at rest; off is the icon shown in the Off state (a toggle has one, a plain action does not).
  const rbBtn = (s, label, icon, off, extra) => `<button type="button" class="fbtn action-btn${extra ? ' ' + extra : ''}${s.cls ? ' ' + s.cls : ''}" aria-label="${label}" title="${label}"${s.attrs || ''}><span class="glyph">${fa(icon, 'fa-fw icon-on')}${fa(off || icon, 'fa-fw icon-off')}${fa('spinner', 'fa-fw fa-spin icon-loading')}</span></button>`;
  const RB_SIZES = [
    { n: 'Default, 38px (40px on a phone)', v: '' },
    { n: 'Compact, 34px', v: '34px' },
    { n: 'Tiny, 30px', v: '30px' },
  ];
  const row = (cells) => `<div class="dsf-states">${cells.map((c) => `<div class="dsf-state"><small>${c.n}</small><div class="dsf-ex">${c.html}</div></div>`).join('')}</div>`;
  const rbBody = () => P(
    RB_SIZES.map((z) => `<p class="pm-h">${z.n}</p><div class="dsf-states"${z.v ? ` style="--action-btn-h:${z.v}"` : ''}>${RB_STATES.map((s) => `<div class="dsf-state"><small>${s.n}</small><div class="dsf-ex">${rbBtn(s, 'Notifications', 'bell', 'bell-slash')}</div></div>`).join('')}</div>`).join('')
    + `<p class="pm-h">Any icon: toggles and actions</p>` + row([
      { n: 'Play, rest', html: rbBtn({}, 'Play', 'play', 'pause') },
      { n: 'Play, on', html: rbBtn({ cls: 'on' }, 'Pause', 'play', 'pause') },
      { n: 'Bookmark', html: rbBtn({}, 'Bookmark', 'bookmark') },
      { n: 'Star, on', html: rbBtn({ cls: 'on' }, 'Star', 'star') },
      { n: 'Add', html: rbBtn({}, 'Add', 'plus') },
      { n: 'Delete, danger', html: rbBtn({}, 'Delete', 'trash', '', 'danger') },
      { n: 'Confirm, ok', html: rbBtn({}, 'Done', 'check', '', 'dial') },
      { n: 'With a caret', html: `<div class="fbtn-wrap">${rbBtn({}, 'Volume', 'volume-high', 'volume-xmark')}<button class="fbtn-caret" type="button" aria-label="Volume settings">${fa('chevron-down')}</button></div>` },
    ])
    + `<p class="pm-h">In a call: mic, camera, end call</p>` + row([
      { n: 'Microphone, on', html: rbBtn({ cls: 'on' }, 'Microphone', 'microphone', 'microphone-slash') },
      { n: 'Microphone, off', html: rbBtn({ cls: 'off' }, 'Microphone', 'microphone', 'microphone-slash') },
      { n: 'Camera, on', html: rbBtn({ cls: 'on' }, 'Camera', 'video', 'video-slash') },
      { n: 'Camera, off', html: rbBtn({ cls: 'off' }, 'Camera', 'video', 'video-slash') },
      { n: 'End call', html: rbBtn({}, 'Leave the call', 'phone', '', 'danger') },
      { n: 'Dial back in', html: rbBtn({}, 'Join the call', 'phone', '', 'dial') },
    ]));

  const ZOOM = P(`<div class="pm-zoom"><button type="button" class="btn">${fa('pen')} Edit</button><button type="button" class="sdk-icon-btn" aria-label="Add">${fa('plus')}</button></div>`);

  function render(api) {
    const { mk, h } = api;
    const block = mk('section', 'ds-block ds-spec');
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="buttons-h"><a href="#buttons">Buttons</a></h3><span class="ds-status-chip ds-st-approved">Approved</span><span class="ds-count">text buttons, icon-only buttons and round icon buttons, one component</span></header>
<p class="ds-desc">Thomas's decisions of 2026-10-15, drawn from <code>proposed.css</code> (every rule under <code>.ds-proposed</code>). Four roles, two sizes, one icon-only button, every state. What exists today is on its own page, <a href="index.html#buttons">Today's inventory</a>.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#buttons-anatomy">Anatomy</a><a href="#buttons-roles">Roles</a><a href="#buttons-sizes">Sizes</a><a href="#buttons-states">States</a><a href="#buttons-call">Round buttons</a><a href="#buttons-widths">Widths</a><a href="#buttons-rules">Usage rules</a><a href="#buttons-tokens">Tokens</a><a href="#buttons-markup">Markup</a></nav>

<h4 class="ds-h4" id="buttons-anatomy">Anatomy</h4>
<div data-slot="zoom"></div>
${dim([
    ['1 Box', 'Height = size (38px, 44px on a phone; small 30px). Corners <code>--radius-small</code>. Never wraps its label.'],
    ['2 Edge', '1px. <code>--border</code> on Secondary only (the neutral hairline it has today); transparent on every other role, in every state, so all buttons are one box size.'],
    ['3 Fill', 'The role\'s fill. Hover, pressed and selected change the fill, never the edge.'],
    ['4 Label', '14px (small 13px), weight 500. A verb. Sentence case.'],
    ['5 Icon', '16px (small 14px), 6px before the label, <code>aria-hidden</code>. Icon-only: a square the same height, the icon centred.'],
    ['6 Focus ring', '2px <code>--accent</code> outline, 2px off the box, on keyboard focus only (the ring the top bar and the call already use).'],
  ])}

<h4 class="ds-h4" id="buttons-roles">Roles</h4>
${tbl(['Role', 'Class', 'Use it for', 'Fill and text'], [
    ['Primary', '<code>.btn-primary</code>', 'The one main action of a view: Save, Send, Join.', '<code>--accent</code> fill, <code>--on-accent</code> text; hover <code>--primary-hover</code>'],
    ['Secondary', '<code>.btn</code>', 'Everything else. The default.', '<code>--secondary</code> fill and <code>--border</code> hairline, <code>--secondary-text</code>; hover <code>--secondary-hover</code>'],
    ['Danger', '<code>.btn-danger</code>', 'Delete or leave, only. A soft red fill with red text, no outline.', '<code>--danger</code> 16% fill, text <code>--danger</code> mixed 70% into <code>--text</code> (<code>--danger-text</code> is pale in light mode); hover 26%, pressed 34%'],
    ['Danger, solid', '<code>.btn-danger.solid</code>', 'A final confirm only (Delete for good, End call). Rare.', '<code>--danger</code> fill, <code>--on-danger</code>'],
    ['Quiet', '<code>.btn-quiet</code>', 'Low-key actions: Cancel, Keep, dismiss, Clear. Text only.', 'No fill, <code>--text</code> (icon-only: <code>--text-dim</code>); hover a 10% <code>--text</code> fill'],
    ['Selected', '<code>.on</code> or <code>aria-pressed="true"</code>', 'A toggle that is on. Replaces today\'s on and off variants.', '<code>--selected-bg</code> fill, text <code>--accent</code> mixed 55% into <code>--text</code> (the plain accent is under 3:1 on that fill in light mode)'],
  ])}

<h4 class="ds-h4" id="buttons-sizes">Sizes</h4>
${tbl(['Size', 'Class', 'Height', 'Use it for'], [
    ['Default', '(none)', '<code>--btn-h</code> = <code>--field-h</code>: 38px; 44px on a phone (640px and narrower)', 'Forms, dialogs, rows beside a field, every touch use.'],
    ['Small', '<code>.btn-small</code>', '<code>--btn-h-small</code>: 30px', 'Dense rows and toolbars. On a phone its look stays 30px and its hit area grows to 44px.'],
  ])}
<p class="ds-desc">Replaces <code>.btn-small</code> (about 29px), the 28px more button, the 30px icon button, the 32px editor close and the 26px toolbar button. Icon-only buttons are square at both heights.</p>

<h4 class="ds-h4" id="buttons-states">States</h4>
<p class="ds-desc">Every role, in every state, forced from the proposed rules: Rest, Hover, Focus, Pressed, Disabled (half strength, no pointer), Loading (<code>aria-busy="true"</code> with a spinning icon). Selected is a role, so it has all of them too. The Dark and Light switch above changes every example, and so does the width control.</p>
<div data-slot="matrix"></div>

<h4 class="ds-h4" id="buttons-call">Round buttons</h4>
<p class="ds-desc">The round icon button, for any toggle or action: play, bookmark, star, add, mute, camera. <b>A circle, <code>.fbtn</code>, restyled only through tokens.</b> It keeps <code>--radius-round</code> and its own sizes: 38px (40px on a phone), 34px compact and 30px tiny. Roles: On is the accent fill, Off is calm and shows the toggle's other icon, Danger is the one solid red (<code>--danger</code>, <code>--on-danger</code>) and Ok is <code>--ok</code>. Rest, hover, focus, pressed, loading (a spinner) and disabled are shown below. Wherever round buttons sit side by side, use the same gap as any other button row (8px). Icon-only: it needs an <code>aria-label</code> and a <code>title</code>. The call bar is one use of it, shown last. They are drawn here with the product's own rules; their colours are theme tokens, and the proposed button rules do not reach them.</p>
<div data-slot="call"></div>

<h4 class="ds-h4" id="buttons-widths">Widths</h4>
<p class="ds-desc">The same three rows at 390 (a phone, 44px), 700 and 1280.</p>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="buttons-rules">Usage rules</h4>
<ul class="ds-desc">
  <li>One Primary per view. Two equal actions: neither is Primary, both are Secondary.</li>
  <li>Danger only for delete and leave. Use the solid red only for the final confirm after a Danger button.</li>
  <li>Quiet for Cancel and dismiss, beside a Primary; never the only action in a row.</li>
  <li>Icon-only needs an <code>aria-label</code> and a <code>title</code> (the tooltip). If a word fits, use a text button.</li>
  <li>Minimum target 44px on a phone: the default size, or a small button with its grown hit area. Keep 8px between buttons.</li>
  <li>The label is a verb in sentence case (Save, Add a day), and the names in CLAUDE.md.</li>
  <li>State and kind are shown by fill and text colour. Never a coloured border, outline or stripe.</li>
  <li>Round buttons (<code>.fbtn</code>) are part of this component and stay circles; only their colours come from tokens.</li>
</ul>

<h4 class="ds-h4" id="buttons-tokens">Tokens</h4>
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

<h4 class="ds-h4" id="buttons-markup">Markup contract</h4>
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
<p class="ds-desc"><b>Names kept so no consumer has to change.</b> The new names are <code>.btn-quiet</code>, <code>.btn-danger.solid</code> and <code>.sdk-icon-btn</code>. <code>.sdk-icon-btn</code> is the one icon-only name because it is what the SDK draws (like <code>.sdk-btn</code>, <code>.sdk-more</code>); the older names stay as aliases so no markup is edited: <code>.action-btn</code> and <code>.sdk-field-btn</code> (Secondary), <code>.sdk-more</code>, <code>.icon-btn</code>, <code>.sdk-editor-close</code> and <code>.msg-btn</code> (Quiet, small). <code>.btn</code>, <code>.btn-primary</code>, <code>.btn-danger</code>, <code>.btn-small</code>, <code>.sdk-btn</code> and <code>.btn.on</code> keep their names; <code>.btn-accent</code> and <code>.btn.off</code> fold into the roles.</p>
`;

    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const zoom = api.makeFrame('app', ZOOM, { height: 150, proposed: true, title: 'Anatomy sample', css: PM_CSS });
    slot('zoom').appendChild(zoom);
    slot('call').appendChild(api.makeFrame('app', rbBody(), { proposed: true, title: 'Round buttons', css: PM_CSS }));
    slot('matrix').appendChild(api.makeFrame('app', matrixBody(), { proposed: true, title: 'Buttons, all states', css: PM_CSS }));
    const ws = mk('div', '');
    for (const w of [390, 700, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(api.makeFrame('app', widthBody(), { pinWidth: w, proposed: true, title: `Buttons at ${w}`, css: PM_CSS }));
    }
    slot('widths').appendChild(ws);

    return block;
  }


  // Where the letters sit in a button, measured by ink on 2026-10-16 in headless Chromium 141 on Linux (tools in the report, same method as
  // tools/check-design-system.mjs: a 4x screenshot of a 1px-bordered button, 12 labels with no descenders, weight 500, line-height 1).
  // Each cell is the mean offset in px of the letters' middle from the button's middle (+ low, - high), then the worst label in brackets.
  const CENTRE = [
    ["Today: the system stack (here Liberation Sans, which stands in for Arial)", ["+0.06 (0.25)","+0.44 (0.63)","-1.57 (1.63)","-0.20 (0.25)"], ["-0.38 (0.50)","+0.50 (0.50)","-1.00 (1.00)","-0.50 (0.50)"]],
    ["Other system font on this machine: DejaVu Sans", ["-1.20 (1.25)","-0.82 (0.88)","-0.95 (1.00)","-0.45 (0.50)"], ["-0.38 (0.50)","+0.13 (0.50)","-1.00 (1.00)","-0.88 (1.00)"]],
    ["Other system font on this machine: FreeSans", ["-1.03 (1.13)","-0.66 (0.75)","-1.66 (1.75)","-1.28 (1.38)"], ["-1.42 (1.50)","-1.00 (1.00)","-1.00 (1.00)","-0.67 (1.00)"]],
    ["Figtree, the font's own metrics", ["-0.94 (1.00)","+0.44 (0.50)","-0.59 (0.75)","-0.19 (0.25)"], ["-1.00 (1.00)","+0.00 (0.00)","-0.50 (0.50)","-0.04 (0.50)"]],
    ["Figtree, with the fix", ["+0.06 (0.13)","+0.44 (0.50)","-0.59 (0.75)","-0.19 (0.25)"], ["+0.00 (0.00)","+0.00 (0.00)","-0.50 (0.50)","+0.00 (0.00)"]],
    ["Figtree, fallback face, with the fix", ["+0.18 (0.38)","+0.43 (0.63)","-0.70 (0.75)","-0.32 (0.38)"], ["-0.38 (0.50)","+0.50 (0.50)","-1.00 (1.00)","-0.50 (0.50)"]],
    ["Nunito Sans, the font's own metrics", ["-0.89 (1.00)","-0.63 (0.63)","-0.53 (0.63)","-0.25 (0.25)"], ["-1.00 (1.00)","-1.00 (1.00)","-0.50 (0.50)","-0.50 (0.50)"]],
    ["Nunito Sans, with the fix", ["+0.11 (0.13)","+0.38 (0.38)","+0.47 (0.50)","-0.25 (0.25)"], ["+0.00 (0.00)","+0.00 (0.00)","+0.50 (0.50)","-0.50 (0.50)"]],
    ["Nunito Sans, fallback face, with the fix", ["-0.07 (0.13)","+0.43 (0.63)","+0.30 (0.50)","-0.32 (0.38)"], ["-0.38 (0.50)","+0.50 (0.50)","+0.00 (0.00)","-0.50 (0.50)"]],
    ["Source Sans 3, the font's own metrics", ["-0.70 (0.75)","-0.42 (0.50)","-0.42 (0.50)","-1.04 (1.13)"], ["-0.88 (1.00)","-0.88 (1.00)","-0.38 (0.50)","-1.00 (1.00)"]],
    ["Source Sans 3, with the fix", ["+0.30 (0.50)","+0.58 (0.88)","+0.58 (0.88)","-0.04 (0.25)"], ["+0.13 (0.50)","+0.13 (0.50)","+0.63 (1.00)","+0.00 (0.00)"]],
    ["Source Sans 3, fallback face, with the fix", ["+0.43 (0.63)","+0.68 (0.88)","+0.80 (1.00)","+0.03 (0.13)"], ["+0.50 (0.50)","+0.50 (0.50)","+0.63 (1.00)","+0.00 (0.00)"]],

  ];
  const CENTRE_HEAD = ['Text', '14px in 38px (default button)', '13px in 30px (small button)', '16px in 44px (phone field)', '12px in 30px'];
  const FIX_ROWS = [
    ['Figtree', '0.700', '0.950 / 0.250 (0.700)', '0.95 / 0.24 (0.710)', '100.59% / 95.67%', '94.44% / 23.86%'],
    ['Nunito Sans', '0.705', '1.011 / 0.353 (0.658)', '1.04 / 0.32 (0.720)', '100.93% / 96.50%', '103.04% / 31.71%'],
    ['Source Sans 3', '0.660', '1.024 / 0.400 (0.624)', '1.08 / 0.34 (0.740)', '93.32% / 90.20%', '115.73% / 36.43%'],
  ];
  const FIX_CODE = `/* The bundled font: the box and the baseline no longer depend on the font's own tables */
@font-face { font-family: "Figtree"; font-style: normal; font-weight: 300 900; font-display: swap;
  ascent-override: 95%; descent-override: 24%; line-gap-override: 0%;
  src: url(fonts/figtree/latin.woff2) format("woff2"); unicode-range: U+0000-00FF, ...; }
/* The fallback: Arial, as wide as Figtree, with Figtree's ascent and descent (override / size-adjust) */
@font-face { font-family: "Figtree Fallback"; font-weight: 100 599;
  src: local("Arial"), local("Helvetica"), local("Liberation Sans");
  size-adjust: 100.59%; ascent-override: 94.44%; descent-override: 23.86%; line-gap-override: 0%; }
@font-face { font-family: "Figtree Fallback"; font-weight: 600 900;
  src: local("Arial Bold"), local("Arial-BoldMT"), local("Helvetica Bold"), local("Liberation Sans Bold");
  size-adjust: 95.67%; ascent-override: 99.3%; descent-override: 25.09%; line-gap-override: 0%; }
:root { --font-ui: "Figtree", "Figtree Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }`;
  const CENTRE_HTML = (tbl, h) => `<p class="ds-desc"><b>Yes, within 1px, in all three, with a normal button: 1px border, 14px side padding, <code>line-height: 1</code>, as the approved Buttons are.</b> Measured by ink, the way <code>tools/check-design-system.mjs</code> does it: a 4x screenshot of the button, the middle of the letters against the middle of the box. 12 labels with no descenders (Save, Edit, Delete, Cancel, Muted, Add, Filter, Clear, Done, Back, Invite, Rename), weight 500. Each cell is the mean in px (<b>+ is low, - is high</b>) and, in brackets, the worst label. Headless Chromium 141 on Linux; this machine has no Segoe UI, San Francisco or Roboto, so Today's row is Liberation Sans, which stands in for Arial.</p>
<p class="pm-meas-h">Ink on a 4x screenshot (the check's method)</p>
${tbl(CENTRE_HEAD, CENTRE.map((r) => [r[0]].concat(r[1])))}
<p class="pm-meas-h">The same on a screen at 1x, where the baseline snaps to a whole pixel</p>
${tbl(CENTRE_HEAD, CENTRE.map((r) => [r[0]].concat(r[2])))}
<p class="ds-desc"><b>What it shows.</b> With the fix, every candidate sits within 0.7px of centre at the default and the small button (worst label 0.9px), bundled or in its fallback face, at 4x and at 1x. With each font's own tables the label is 0.7 to 1.0px <i>high</i> at the default size, so the same button would be on the edge of the 1px limit; and it moves with the font and the size. Today's stack, as it resolves here, is fine at 14px but 1.6px high at 16px (the phone's field size), and the two other system fonts on this machine are 1.0 to 1.7px off: that spread, a different one on every device, is the buttons that look off. I could not measure Segoe UI, San Francisco or Roboto here.</p>
<h4 class="ds-h4" id="typography-code">The fix: font-metric overrides</h4>
<p class="ds-desc"><b>Why a label looks off.</b> With <code>line-height: 1</code> the browser puts the line in the middle of the button and the baseline at (ascent - descent) / 2 below that middle, using the ascent and descent in the font's own tables, rounded to whole pixels. Letters are centred when ascent - descent equals the cap height. Fonts differ in ascent, descent and in how they round at 14px, so the same CSS gives a different result in each font. <b>The fix:</b> set <code>ascent-override</code>, <code>descent-override</code> and <code>line-gap-override</code> in the <code>@font-face</code> so the numbers are ours, in every browser, and give the fallback face the same ones.</p>
${tbl(['Font', 'Cap height (em)', 'Own ascent / descent (difference)', 'Override ascent / descent (difference)', 'Fallback size-adjust: regular / bold', 'Fallback ascent / descent (regular)'], FIX_ROWS)}
<p class="ds-desc"><b>How the numbers were found.</b> (1) The difference, ascent minus descent, is set a little above the cap height (the tall letters l, d, t rise above it), and the sum is kept near the font's own so <code>line-height: normal</code> hardly changes. (2) Because the browser rounds, each pair was then swept: ascent in 1% steps within 10% of the font's own, descent within 12%, six labels at 14px in 38px and 13px in 30px, at 1x and 4x, and the pair nearest the font's own sum that keeps every label within 0.5px (0.75px for Source Sans 3, whose cap height is a fraction of a pixel off at both sizes) was taken. Figtree's own numbers already have ascent - descent = cap height, yet it sits 0.9px high at 14px: its descent, 25% of 14px, is 3.5px, a tie. The sweep moved it to 24%. (3) The fallback's size-adjust makes the same sample of UI text (three sentences and a row of labels, weights 400 to 500; 600 to 700 for the bold face) as wide as in the bundled font, measured in the browser; its ascent and descent are the bundled ones divided by size-adjust.</p>
<p class="ds-desc"><b>Checked.</b> The ascent and descent the browser reports at 100px, bundled and fallback: Figtree 95 / 24 and 95 / 24, Nunito Sans 104 / 32 and 104 / 32, Source Sans 3 108 / 34 and 108 / 34 (unadjusted Arial: 91 / 21). So the line box is the same height in both. The widths are in the table above. Only measured in Chromium; Firefox and Safari honour the same descriptors but were not run here.</p>
<pre class="ds-pre">${h(FIX_CODE)}</pre>`;

  // ---- Typography (PROPOSED): three candidate fonts, bundled and self-hosted. The faces are in proposed.css; the files in fonts/. ----
  const TY_CSS = `
.pm-ty { display: grid; gap: 18px; }
.pm-ty-h { margin: 0 0 6px; color: var(--text-dim); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.pm-ty-row { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 2px 14px; align-items: baseline; padding: 5px 0; }
.pm-ty-row + .pm-ty-row { border-top: 1px solid var(--border); }
.pm-ty-meta { color: var(--text-dim); font-family: var(--font-system); font-size: 11px; line-height: 1.3; }
.pm-ty-meta b { display: block; color: var(--text); font-size: 11px; font-weight: 600; }
.pm-t28 { font-size: 28px; font-weight: 700; line-height: 1.2; }
.pm-t22 { font-size: 22px; font-weight: 700; line-height: 1.2; }
.pm-t18 { font-size: 18px; font-weight: 600; line-height: 1.2; }
.pm-t16 { font-size: 16px; font-weight: 400; line-height: 1.5; }
.pm-t14 { font-size: 14px; font-weight: 400; line-height: 1.4; }
.pm-t14s { font-size: 14px; font-weight: 600; line-height: 1.4; }
.pm-t13 { font-size: 13px; font-weight: 600; line-height: 1.4; }
.pm-t12 { font-size: 12px; font-weight: 400; line-height: 1.4; color: var(--text-dim); }
.pm-t11 { font-size: 11px; font-weight: 700; line-height: 1.3; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-dim); }
.pm-t10 { font-size: 10px; font-weight: 700; line-height: 1.3; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-dim); }
.pm-body { max-width: 62ch; margin: 0 0 8px; font-size: 14px; line-height: 1.4; }
.pm-cover { margin: 0; font-size: 14px; line-height: 1.5; overflow-wrap: anywhere; }
.pm-bar + .pm-bar { margin-top: 10px; }
.pm-bar + .pm-ty-h { margin-top: 14px; }
.pm-ty-note { margin: 0 0 8px; color: var(--text-dim); font-size: 12px; }
.pm-meas-t { width: 100%; border-collapse: collapse; font-family: var(--font-system); font-size: 12px; }
.pm-meas-t th, .pm-meas-t td { padding: 5px 8px 5px 0; border-bottom: 1px solid var(--border); text-align: left; vertical-align: baseline; }
.pm-meas-t th { color: var(--text-dim); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.pm-meas-t .pm-s { display: inline-block; white-space: nowrap; font-size: 14px; font-weight: 400; background: color-mix(in srgb, var(--accent) 16%, transparent); }
.pm-meas-t .pm-n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.pm-meas-h { margin: 14px 0 4px; font-family: var(--font-system); font-size: 13px; font-weight: 700; }
.pm-meas-h:first-child { margin-top: 0; }
.pm-f-figtree { font-family: "Figtree", sans-serif; }
.pm-f-nunito-sans { font-family: "Nunito Sans", sans-serif; }
.pm-f-source-sans-3 { font-family: "Source Sans 3", sans-serif; }
.pm-fb-figtree { font-family: "Figtree Fallback", sans-serif; }
.pm-fb-nunito-sans { font-family: "Nunito Sans Fallback", sans-serif; }
.pm-fb-source-sans-3 { font-family: "Source Sans 3 Fallback", sans-serif; }
.pm-f-arial { font-family: Arial, sans-serif; }
.pm-f-today { font-family: var(--font-system); }
@media (max-width: 640px) {
  .pm-ty-row { grid-template-columns: minmax(0, 1fr); }
}
.pm-h-row { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 2px 14px; align-items: baseline; padding: 5px 0; }
.pm-h-row + .pm-h-row { border-top: 1px solid var(--border); }
.pm-h40 { font-size: 40px; font-weight: 800; line-height: 1.1; }
.pm-h28 { font-size: 28px; font-weight: 700; line-height: 1.2; }
.pm-h22 { font-size: 22px; font-weight: 700; line-height: 1.2; }
.pm-h18 { font-size: 18px; font-weight: 700; line-height: 1.2; }
.pm-h17 { font-size: 17px; font-weight: 700; line-height: 1.2; }
.pm-tb { box-sizing: border-box; display: flex; align-items: center; width: 320px; max-width: 100%; padding: 0 10px; border: 1px solid var(--border); border-radius: var(--radius-small); background: var(--bg-section); line-height: 1; font-weight: 700; white-space: nowrap; overflow: hidden; }
.pm-tb + .pm-tb { margin-top: 8px; }
.pm-mock { padding: 14px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg); }
.pm-mock + .pm-mock { margin-top: 14px; }
.pm-mock .topbar { position: relative; top: auto; width: auto; margin: 6px 0 0; border-radius: var(--radius-small); }
.pm-note { margin: 6px 0 0; color: var(--text-dim); font-family: var(--font-system); font-size: 12px; }
.pm-stay { margin-top: 10px; }
.pm-hf-figtree { font-family: "Figtree", sans-serif; }
.pm-hf-archivo { font-family: "Archivo", sans-serif; }
.pm-hf-fraunces { font-family: "Fraunces", serif; }
.pm-hf-bricolage-grotesque { font-family: "Bricolage Grotesque", sans-serif; }
.pm-hb-archivo { font-family: "Archivo Fallback", sans-serif; }
.pm-hb-fraunces { font-family: "Fraunces Fallback", serif; }
.pm-hb-bricolage-grotesque { font-family: "Bricolage Grotesque Fallback", sans-serif; }
.pm-h-arial { font-family: Arial, sans-serif; }
.pm-h-times { font-family: "Times New Roman", serif; }
@media (max-width: 640px) {
  .pm-h-row { grid-template-columns: minmax(0, 1fr); }
}`;


  // Measured on 2026-10-16 (see the Typography family): sizes in bytes, metrics in em as the font's own tables give them.
  const CANDS = [
    { key: 'figtree', name: 'Figtree', css: 'Figtree',
      files: [['latin', 20156], ['latin-ext', 10280]], weights: '300 to 900', alphabets: 'Latin, Latin extended',
      lic: 'SIL Open Font License 1.1, The Figtree Project Authors (2022)',
      nat: [95, 25], fix: [95, 24], cap: 70, xh: 50, regular: 100.59, bold: 95.67, upm: 1000 },
    { key: 'nunito-sans', name: 'Nunito Sans', css: 'Nunito Sans',
      files: [['latin', 31076], ['latin-ext', 27908], ['cyrillic', 16388]], weights: '200 to 1000', alphabets: 'Latin, Latin extended, Cyrillic',
      lic: 'SIL Open Font License 1.1, The Nunito Sans Project Authors (2016)',
      nat: [101.1, 35.3], fix: [104, 32], cap: 70.5, xh: 48.6, regular: 100.93, bold: 96.5, upm: 1000 },
    { key: 'source-sans-3', name: 'Source Sans 3', css: 'Source Sans 3',
      files: [['latin', 28872], ['latin-ext', 60088], ['cyrillic', 18496], ['greek', 14528]], weights: '200 to 900', alphabets: 'Latin, Latin extended, Cyrillic, Greek',
      lic: 'SIL Open Font License 1.1, Adobe (2010-2020), Reserved Font Name "Source"',
      nat: [102.4, 40], fix: [108, 34], cap: 66, xh: 48.6, regular: 93.32, bold: 90.2, upm: 1000 },
  ];

  // The headline candidates (sizes in bytes of the one latin file each; the bundled files are the fontsource variable woff2, unmodified).
  const HEADS = [
    { key: 'archivo', name: 'Archivo', file: 34928, ext: 32608, weights: '100 to 900 (one weight axis)', alphabets: 'Latin, Latin extended, Vietnamese; no Cyrillic or Greek',
      lic: 'SIL Open Font License 1.1, The Archivo Project Authors (2020), no Reserved Font Name', sa: 98.55, own: '87.8 / 21', set: '90 / 19', fbName: 'Arial Bold', fbCls: 'pm-h-arial',
      why: 'The one Thomas named. A grotesque with a sturdy, slightly condensed body: confident and plain, close to Figtree in spirit but heavier, so a title stands apart without feeling like another brand. The neutral choice.',
      centre: ['+0.11 (0.50)', '+0.25 (0.63)', '-0.28 (0.38)'], own_c: ['-0.89 (1.00)', '-0.75 (0.88)', '-0.28 (0.38)'] },
    { key: 'fraunces', name: 'Fraunces', file: 36620, ext: 33584, weights: '100 to 900 (one weight axis; the optical-size and the soft and wonky axes are not in this file)', alphabets: 'Latin, Latin extended, Vietnamese; no Cyrillic or Greek',
      lic: 'SIL Open Font License 1.1, The Fraunces Project Authors (2020), no Reserved Font Name', sa: 115.04, own: '97.8 / 25.5', set: '98.3 / 25', fbName: 'Times New Roman Bold', fbCls: 'pm-h-times',
      why: 'The warmest and the most different: a soft "old-style" serif with round, inky shapes, like a printed travel guide or a game box. It sits well against Figtree and the brown and amber of the default theme. A bigger change of character than Archivo; best for a few big words, not for long titles.',
      centre: ['-0.09 (0.38)', '+0.06 (0.50)', '-0.40 (0.50)'], own_c: ['-0.09 (0.38)', '+0.06 (0.50)', '-0.40 (0.50)'] },
    { key: 'bricolage-grotesque', name: 'Bricolage Grotesque', file: 41344, ext: 18668, weights: '200 to 800 (one weight axis; the width and optical-size axes are not in this file)', alphabets: 'Latin, Latin extended, Vietnamese; no Cyrillic or Greek',
      lic: 'SIL Open Font License 1.1, The Bricolage Grotesque Project Authors (2022), no Reserved Font Name', sa: 102.15, own: '93 / 27', set: '96 / 24', fbName: 'Arial Bold', fbCls: 'pm-h-arial',
      why: 'A friendly grotesque with a little quirk: ink-trap notches and uneven curves that read as hand-made, so it is playful without turning into a rounded display face. Warmer than Archivo, calmer than Fraunces, and still a sans, so it pairs with Figtree and the buttons without a clash.',
      centre: ['+0.24 (0.88)', '+0.23 (0.75)', '-0.30 (0.63)'], own_c: ['-0.76 (1.25)', '-0.77 (1.13)', '-0.30 (0.63)'] },
  ];
  const headRows = (stack) => `
        <div class="pm-h-row"><div class="pm-ty-meta"><b>40 / 800</b>Hero: landing page, countdown</div><div class="${stack} pm-h40">Plan the trip together</div></div>
        <div class="pm-h-row"><div class="pm-ty-meta"><b>28 / 700</b>Display: page title</div><div class="${stack} pm-h28">Evening in Kraków</div></div>
        <div class="pm-h-row"><div class="pm-ty-meta"><b>22 / 700</b>Title: away, section</div><div class="${stack} pm-h22">Day 3: Louvre and the river</div></div>
        <div class="pm-h-row"><div class="pm-ty-meta"><b>18 / 700</b>Heading: sheets, setup, cards (17)</div><div class="${stack} pm-h18">Dinner is booked for seven</div></div>`;
  const headSample = (c) => `<div class="ds-proposed" data-font-fixed="1"${c ? ` data-headline="${c.key}" data-headline-fixed="1"` : ' data-headline-fixed="1"'}>
      <div class="pm-ty">
        <div><p class="pm-ty-h">Headline sizes the product uses today (the body below is the UI font)</p>${headRows('head')}</div>
        <div><p class="pm-ty-h">Headline with body text</p>
          <h3 class="head pm-h22" style="margin:0 0 6px">Tomorrow at the Louvre</h3>
          <p class="pm-body">Meet at the museum gate at 9:30. Bring your tickets and a charged phone. The call starts when the first person joins, and everyone in the trip can see the plan and add to it.</p>
          <h3 class="head pm-h18" style="margin:10px 0 4px">Where we eat</h3>
          <p class="pm-body">Dinner is booked for seven, near the river. Il y a 12 places, 3 days, 1 budget: €2,450.50.</p>
          <p class="pm-cover">Letters outside the headline file: <span class="head pm-h22">Łódź, Dvořák, Zürich</span> take those letters from Figtree.</p>
        </div>
      </div></div>`;
  const BAR_WORDS = [['Welcome back', 28, 56], ['Rome at the Louvre', 22, 48], ['Meet at nine', 18, 40]];
  const barsBody = () => `<div class="ds-proposed"><p class="pm-ty-h">Title bars, line-height 1, bold: 28px in 56, 22px in 48, 18px in 40</p>${BAR_WORDS.map(([w, z, h]) => `<div class="pm-tb head" style="font-size:${z}px;height:${h}px">${w}</div>`).join('')}</div>`;
  const mockBody = () => `<div class="ds-proposed">
    <div class="pm-mock"><p class="pm-ty-h">Top bar: the name of the environment (the wordmark), 17px, bold</p>
      <header class="topbar"><div class="nav-left"><a class="brand-home" href="#"><span class="brand-logo"><i class="fa-solid fa-mug-hot" aria-hidden="true"></i></span><span class="brand-name">Coffee Pub</span></a><div class="space-switcher"><button type="button" class="space-switcher-button nav-text"><span class="crumb-label">Kraków in spring</span> <i class="fa-solid fa-caret-down" aria-hidden="true"></i></button></div></div></header>
      <p class="pm-note">The space name beside it is nav text (13px, 600) and stays in the UI font, with the other top-bar words.</p></div>
    <div class="pm-mock"><p class="pm-ty-h">Home: the heading is a small capital label (stays UI); the space cards name each space, 17px, bold</p>
      <div class="space-list-head"><h2 class="space-list-title"><i class="fa-solid fa-suitcase fa-fw" aria-hidden="true"></i> Trips</h2></div>
      <div class="space-list" style="margin-top:12px">
        <article class="space-choice"><div class="space-choice-head"><strong class="space-choice-name">Kraków in spring</strong><span class="hint space-choice-count">3 here now</span></div><p class="hint space-choice-desc">Flights are booked. The hotel is still open.</p><div class="members"></div><div class="space-choice-actions"><button class="btn btn-primary" type="button"><i class="fa-solid fa-door-open fa-fw" aria-hidden="true"></i> Enter</button></div></article>
        <article class="space-choice"><div class="space-choice-head"><strong class="space-choice-name">Friday night game</strong><span class="hint space-choice-count">Empty</span></div><p class="hint space-choice-desc">Dragons, dice and snacks.</p><div class="members"></div><div class="space-choice-actions"><button class="btn btn-primary" type="button"><i class="fa-solid fa-door-open fa-fw" aria-hidden="true"></i> Enter</button></div></article>
      </div>
      <p class="pm-note">A sketch, not in the product today: a page title above the label, in the headline font, 28px.</p>
      <h1 class="head pm-h28" style="margin:8px 0 0">Our trips</h1></div>
    <div class="pm-mock"><p class="pm-ty-h">Module title: on Manage and the module's settings page, 20px; docked in a call, 14px</p>
      <section class="panel module-config" style="margin:0"><div class="module-head"><i class="module-icon fa-solid fa-calendar-days fa-fw" aria-hidden="true"></i><div class="grow"><h1>Calendar</h1><div class="hint">Version 1.4.0</div></div><span class="pill">On</span></div></section>
      <div class="mod-header pm-stay"><span class="mod-title"><i class="fa-solid fa-calendar-days fa-fw" aria-hidden="true"></i> Calendar</span></div><p class="pm-note">The docked title bar stays in the UI font: 14px, 600, in a 34px bar.</p></div>
    </div>`;
  const kb = (n) => (n / 1024).toFixed(1) + ' KB';
  const tySample = (c, fixed) => {
    const wrap = (inner) => `<div class="ds-proposed"${c ? ` data-font="${c.key}"` : ''} data-font-fixed="1">${inner}</div>`;
    const row = (cls, meta, sample) => `<div class="pm-ty-row"><div class="pm-ty-meta"><b>${meta[0]}</b>${meta[1]}</div><div class="${cls}">${sample}</div></div>`;
    const bar = (small) => `<div class="pm-bar">${TEXT_ROLES.map((r) => `<button type="button" class="btn${r.cls ? ' ' + r.cls : ''}${small ? ' btn-small' : ''}"${r.attrs || ''}>${r.label}</button>`).join('')}<button type="button" class="sdk-icon-btn${small ? ' btn-small' : ''}" aria-label="Add" title="Add">${fa('plus')}</button></div>`;
    return wrap(`<div class="pm-ty">
      <div><p class="pm-ty-h">Type scale: the sizes and weights the product uses today</p>
        ${row('pm-t28', ['28 / 700', 'Display'], 'Plan the trip together')}
        ${row('pm-t22', ['22 / 700', 'Title'], 'Evening in Kraków')}
        ${row('pm-t18', ['18 / 600', 'Heading'], 'Day 3: Louvre and the river')}
        ${row('pm-t16', ['16 / 400', 'Large, phone fields'], 'Everyone is in. The call is open.')}
        ${row('pm-t14', ['14 / 400', 'Body'], 'Meet at the museum gate at nine thirty. Bring your tickets.')}
        ${row('pm-t14s', ['14 / 600', 'Body, strong'], 'Dinner is booked for seven')}
        ${row('pm-t13', ['13 / 600', 'Nav and small buttons'], 'Workspace &nbsp; Calendar &nbsp; Places &nbsp; Budget')}
        ${row('pm-t12', ['12 / 400', 'Caption'], 'Added by Mira, 14:30 yesterday')}
        ${row('pm-t11', ['11 / 700', 'Label, capitals'], 'Not started')}
        ${row('pm-t10', ['10 / 700', 'Micro, capitals'], 'New')}
      </div>
      <div><p class="pm-ty-h">Body text</p>
        <p class="pm-body">Tomorrow we meet at the Louvre at 9:30. Bring your tickets and a charged phone. The call starts when the first person joins, and everyone in the trip can see the plan and add to it. Il y a 12 places, 3 days, 1 budget: €2,450.50.</p>
        <p class="pm-cover">Kraków, Dvořák, Zürich, Reykjavík, Łódź. Москва, Київ. Αθήνα, Θεσσαλονίκη. 0123456789 &nbsp; 14:30 &nbsp; €12.50 &nbsp; 50%</p>
      </div>
      <div><p class="pm-ty-h">Buttons, default size</p>${bar(false)}<p class="pm-ty-h">Buttons, small</p>${bar(true)}</div>
    </div>`);
  };
  function renderTypography(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const total = (c) => c.files.reduce((a, f) => a + f[1], 0);
    block.innerHTML = `<header><h3 id="typography-h"><a href="#typography">Typography</a></h3><span class="ds-status-chip ds-st-proposed">Proposed</span><span class="ds-count">one bundled font, the same for everyone</span></header>
<p class="ds-desc">Thomas's decision: the product ships its own font, self-hosted woff2 files served by our own server, with no font host and nothing fetched from outside, instead of the system stack. Three candidates, each set in the product's own sizes and weights, with the Buttons in it. <b>Use the Font group at the top of the page to flip every example frame between Today's system stack and each candidate.</b> The page's own bars keep the system stack. This page only proposes: nothing in the product loads these fonts yet.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#typography-pick">Candidates</a><a href="#typography-today">Used today</a><a href="#typography-scale">Type scale</a><a href="#typography-headline">Headline font</a><a href="#typography-fail">If the font fails</a><a href="#typography-centre">Centring</a><a href="#typography-code">The fix</a></nav>

<h4 class="ds-h4" id="typography-pick">The three candidates</h4>
${tbl(['Font', 'Why', 'Licence', 'Weights', 'Alphabets', 'woff2 files', 'English page loads'], CANDS.map((c, i) => [
    c.name,
    ['The smallest of the three and the friendliest: open geometric shapes, a generous x-height, warm at 14px. Latin only, so Cyrillic and Greek fall to the fallback.',
      'The warmest: soft curves and a calm rhythm, close to the brown and amber of the default theme. Adds Cyrillic; no Greek.',
      'The plainest and the most complete: a humanist sans that looks closest to the system fonts people know today, narrow so dense modules fit more, with Latin, Cyrillic and Greek. The largest files.'][i],
    c.lic, `${c.weights}, one variable file per alphabet (400, 500, 600 and 700 all inside)`, c.alphabets,
    `${c.files.map((f) => `${f[0]} ${kb(f[1])}`).join(', ')}; total ${kb(total(c))}`, `latin only: ${kb(c.files[0][1])}`])) }
<p class="ds-desc">Each file is split by alphabet and loads only when a letter from it is drawn (<code>unicode-range</code>), so a page in English fetches the Latin file alone. All three are free to bundle and self-host under the SIL Open Font License; each folder under <code>fonts/</code> carries its <code>OFL.txt</code>. Source Sans 3 keeps Adobe's Reserved Font Name "Source": the files are the unmodified Google Fonts release, converted and split by alphabet by Google; Thomas should confirm that is acceptable before it ships. No italic is bundled: the product has three italic rules, and the browser slants the upright. Considered and left out: Atkinson Hyperlegible Next (Latin only, 34 KB plus 19 KB), Inter (48 KB plus 85 KB for Latin extended), DM Sans (37 KB plus 18 KB), Plus Jakarta Sans.</p>

<h4 class="ds-h4" id="typography-today">What the product uses today</h4>
<p class="ds-desc">Counted in <code>public/style.css</code> (comments removed). One family: <code>-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif</code>, plus a monospace for code. Italic appears in 3 rules.</p>
${tbl(['', 'What is written', 'Count'], [
    ['Font sizes', '17 different pixel sizes. 12px 80 times, 13px 51, 11px 42, 14px 34, 10px 17, 15px 16, 18px 14, 16px 11, 20px 6, 9px 5, 22px 4; 17px, 40px and 6px twice; 8px, 24px and 28px once. Also size tokens (<code>--nav-font-size</code> 13px, <code>--label-size</code>, <code>--field-font</code> 14px, 16px on a phone).', '12, 13, 11 and 14px are 207 of 289 pixel declarations'],
    ['Weights', '600 42 times, 700 35, 400 12, 500 7, 650 5, 800 2, and <code>--nav-font-weight</code> (600) 5. Buttons are 500.', '6 values'],
    ['Line height', '16px 13 times, 1 12 (buttons), 1.4 9, 1.1 5, 14px 4, 26px 3, 1.5 2, 18px 2, 20px 2, 1.45 1.', ''],
  ])}
<p class="ds-desc">The proposal keeps these sizes. Each candidate is variable, so the in-between 650 is real weight, not a jump to 600 or 700.</p>

<h4 class="ds-h4" id="typography-scale">Type scale, body text and Buttons, per candidate</h4>
<p class="ds-desc">Today's system stack first, then the three candidates. The Buttons are the approved ones, unchanged, set in each font. The Cyrillic and Greek lines show coverage: where a candidate has no letters, the browser takes them from the fallback.</p>
<div data-slot="samples"></div>

<h4 class="ds-h4" id="typography-headline">Headline font (a second font for big words)</h4>
<p class="ds-desc">Thomas keeps Figtree as the UI font. This asks whether big words, and only those, should be set in a second font. <b>Use the Headline group at the top of the page</b> (Same as UI, Archivo, Fraunces, Bricolage) to flip the in-context examples; the scale below shows each candidate side by side, with Figtree for the body text. Nothing in the product loads these fonts yet.</p>
<p class="ds-desc"><b>Where a headline font would apply:</b> the page title (28px), the hero and the away and countdown words (40px, 22px), the space name on its Home card (17px), the environment's name in the top bar (17px), module titles on Manage and a module's settings page (20px), and the headings of the setup and phase sheets (18px). <b>Where it would not:</b> the small capital labels (13px and below: the Home heading, panel and popover headings, status), buttons, fields, tabs, menus, the nav text including the space name in the bar, chat, tables, and the 14px title bar of a docked module. They stay in Figtree.</p>
${tbl(['Font', 'Why', 'Licence', 'Weights', 'Alphabets', 'woff2 (latin, the only file bundled)', 'Latin extended, not bundled'], HEADS.map((c) => [
    c.name, c.why, c.lic, c.weights, c.alphabets, `${kb(c.file)} (one file, every weight from 100 to 900, 600 to 800 inside)`, `${kb(c.ext)} more`])) }
<p class="ds-desc">Each is a variable file with a weight axis: weights 600, 650, 700 and 800 are all real, and one file covers every headline weight. The static 600, 700 and 800 files of Archivo are 13.8 + 14.5 + 14.4 = 42.7 KB, so the variable file (34.9 KB) is smaller and has the in-between weights. Archivo also comes with a width axis (62 to 125%), which adds 55 KB (90.1 KB in all); it is not used here. Only the latin file is bundled: a headline with Polish, Czech or Vietnamese letters takes those letters from Figtree (the stack ends in the UI font), so a letter is never missing, only set in the other font. A page in English loads one headline file, 34.9 to 41.3 KB, and only when a headline is drawn. Added to the Figtree page: 110.2 KB for the three together, or about 35 to 41 KB for the one chosen.</p>
<div data-slot="head-scale"></div>
<h4 class="ds-h4" id="typography-headline-context">In context</h4>
<p class="ds-desc">The product's own classes and structure (<code>.topbar</code>, <code>.space-choice</code>, <code>.module-head</code>, <code>.mod-header</code>), with the headline font applied to the big words only. Follows the Headline group, the Font group and Dark or Light.</p>
<div data-slot="head-mock"></div>
<h4 class="ds-h4" id="typography-headline-centre">Is a big title centred in its bar?</h4>
<p class="ds-desc">The same method as the buttons: a title bar with a 1px border, bold, <code>line-height: 1</code>, twelve headlines with no descenders, photographed at 4x, the middle of the ink against the middle of the bar. Mean offset in px (+ low, - high) and the worst headline in brackets. The bundled fonts have ascent and descent set (below); with each font's own tables the 28px and 22px titles sit up to 1.25px high.</p>
${tbl(['Font', '28px in 56', '22px in 48', '18px in 40', 'Own ascent / descent', 'Set to'], HEADS.map((c) => [c.name, `${c.centre[0]} (own tables: ${c.own_c[0]})`, `${c.centre[1]} (own: ${c.own_c[1]})`, `${c.centre[2]} (own: ${c.own_c[2]})`, c.own + '%', c.set + '%']))}
<div data-slot="head-bars"></div>
<p class="ds-desc"><b>The fallback</b> (the headline font failing to load): a bold system font scaled to the same width, with the same ascent and descent, so the page does not jump. Archivo and Bricolage use Arial Bold (or Helvetica Bold, or Liberation Sans Bold), Fraunces uses Times New Roman Bold (or Liberation Serif Bold). Measured live by this page, in this browser, for one headline at 28px, bold.</p>
<div data-slot="head-fail"></div>

<h4 class="ds-h4" id="typography-fail">If the font fails to load</h4>
<p class="ds-desc">While the file downloads, or if it never arrives (blocked, offline, a bad file), each candidate has a fallback face: Arial (or Helvetica, or Liberation Sans, whichever the device has) scaled to the same width and given the same ascent and descent as the bundled font. Text looks plain but the page does not jump when the real font arrives, and a button label sits where it would. Where the device has none of those, the stack goes on to Today's system fonts, unadjusted. The table below is measured live by this page, in this browser, for one line of 14px text (the same sentence in every row).</p>
<div data-slot="fail"></div>

<h4 class="ds-h4" id="typography-centre">Is the button label centred?</h4>
<div data-slot="centre"></div>
`;
    block.querySelector('[data-slot="centre"]').innerHTML = CENTRE_HTML(tbl, api.h);
    const slot = block.querySelector('[data-slot="samples"]');
    for (const c of [null].concat(CANDS)) {
      slot.appendChild(mk('p', 'ds-ctx', c ? `${c.name}: ${kb(total(c))} in all` : "Today's system stack"));
      slot.appendChild(api.makeFrame('app', tySample(c), { proposed: true, title: c ? `Typography, ${c.name}` : 'Typography, Today', css: PM_CSS + TY_CSS }));
    }
    const SENT = 'Tomorrow we meet at the Louvre at nine thirty and bring our tickets.';
    const failRows = (c) => [
      ['Bundled font', `pm-f-${c.key}`], ['If it fails: the fallback face', `pm-fb-${c.key}`], ['Arial, not adjusted', 'pm-f-arial'], ["Today's system stack", 'pm-f-today'],
    ].map(([n, cls]) => `<tr><td>${n}</td><td><span class="pm-s ${cls}">${SENT}</span></td><td class="pm-n" data-out="w"></td><td class="pm-n" data-out="h"></td></tr>`).join('');
    const failBody = `<div class="ds-proposed" data-font-fixed="1">${CANDS.map((c) => `<p class="pm-meas-h">${c.name}</p><table class="pm-meas-t"><thead><tr><th>Line</th><th>Sample</th><th>Width</th><th>Box height</th></tr></thead><tbody>${failRows(c)}</tbody></table>`).join('')}</div>`;
    const measure = (doc) => {
      const go = () => {
        for (const t of doc.querySelectorAll('.pm-meas-t tbody')) {
          const rows = [...t.rows]; const base = rows[0].querySelector('.pm-s').getBoundingClientRect();
          for (const r of rows) {
            const b = r.querySelector('.pm-s').getBoundingClientRect();
            r.querySelector('[data-out="w"]').textContent = `${b.width.toFixed(1)} px (${b.width >= base.width ? '+' : ''}${((b.width / base.width - 1) * 100).toFixed(1)}%)`;
            r.querySelector('[data-out="h"]').textContent = `${b.height.toFixed(1)} px`;
          }
        }
      };
      doc.fonts.ready.then(go);
      doc.fonts.addEventListener('loadingdone', go);
    };
    const hs = block.querySelector('[data-slot="head-scale"]');
    for (const c of [null].concat(HEADS)) {
      hs.appendChild(mk('p', 'ds-ctx', c ? `${c.name}: ${kb(c.file)}` : 'Same as the UI font (Figtree)'));
      hs.appendChild(api.makeFrame('app', headSample(c), { proposed: true, title: c ? `Headline, ${c.name}` : 'Headline, same as UI', css: PM_CSS + TY_CSS }));
    }
    block.querySelector('[data-slot="head-mock"]').appendChild(api.makeFrame('app', mockBody(), { proposed: true, title: 'Headline, in context', css: PM_CSS + TY_CSS }));
    block.querySelector('[data-slot="head-bars"]').appendChild(api.makeFrame('app', barsBody(), { proposed: true, title: 'Headline, title bars', css: PM_CSS + TY_CSS }));
    const HSENT = 'Plan the trip together in Kraków';
    const headFail = HEADS.map((c) => `<p class="pm-meas-h">${c.name}</p><table class="pm-meas-t"><thead><tr><th>Line</th><th>Sample</th><th>Width</th><th>Box height</th></tr></thead><tbody>${[
      ['Bundled font', `pm-hf-${c.key}`], ['If it fails: the fallback face', `pm-hb-${c.key}`], [`${c.fbName.replace(' Bold', '')}, not adjusted`, c.fbCls],
    ].map(([n, cls]) => `<tr><td>${n}</td><td><span class="pm-s ${cls}" style="font-size:28px;font-weight:700">${HSENT}</span></td><td class="pm-n" data-out="w"></td><td class="pm-n" data-out="h"></td></tr>`).join('')}</tbody></table>`).join('');
    block.querySelector('[data-slot="head-fail"]').appendChild(api.makeFrame('app', `<div class="ds-proposed" data-font-fixed="1" data-headline-fixed="1">${headFail}</div>`, { proposed: true, title: 'Headline, if the font fails', css: PM_CSS + TY_CSS, onload: measure }));
    block.querySelector('[data-slot="fail"]').appendChild(api.makeFrame('app', failBody, { proposed: true, title: 'Typography, if the font fails', css: PM_CSS + TY_CSS, onload: measure }));
    return block;
  }

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

  // Families still to decide: names only, in the groups Today uses. Nothing is drawn for them.
  window.DS_PROPOSED.undecided = [
    { group: 'Controls', names: ['Links', 'Pickers: date, kind, currency', 'Choice rows and people chips', 'Editor window'] },
    { group: 'Navigation', names: ['Tabs, view switches and segmented rows', 'Menus and flyouts', 'Popovers and sheets'] },
    { group: 'Containers', names: ['Cards, panels and rows', 'Home cards and the ghost slot', 'Tables and lists in Manage', 'Progress bars and meters', 'Module window: title, toolbar and status'] },
    { group: 'Feedback', names: ['Banners, notices and toasts', 'Empty, loading and error states'] },
    { group: 'Content', names: ['Chips, badges, pills and counts', 'Messages, chat and AI cards', 'Avatars and portraits', 'Status strip, phases and countdown', 'Day cards, calendar cells and markers', 'Map pins and map UI', 'Round buttons'] },
    { group: 'Other', names: ['Tokens', 'Icons', 'Live SDK pieces'] },
  ];

  window.DS_PROPOSED.families.push({
    id: 'buttons', covers: ['buttons', 'icon-buttons'], group: 'Controls', name: 'Buttons', status: 'approved',
    words: 'button icon-only icon buttons primary secondary danger quiet small round buttons circle icon toggle play bookmark star microphone video call fbtn', render,
  });
  window.DS_PROPOSED.families.push({
    id: 'fields', covers: ['fields', 'forms', 'form-standard', 'switch'], group: 'Controls', name: 'Fields and forms', status: 'approved',
    words: 'fields forms form input text area textarea select list number date time search file colour color slider range checkbox tick box radio switch toggle label hint error optional required placeholder focus disabled read-only aria-invalid sdk-form sdk-field', render: renderFields,
  });
  window.DS_PROPOSED.families.push({
    id: 'typography', covers: ['typography', 'fonts'], group: 'Foundations', name: 'Typography', status: 'proposed',
    words: 'typography headline heading title archivo fraunces bricolage font fonts typeface type scale text bundled self-hosted woff2 figtree nunito source sans fallback metrics ascent descent centring baseline', render: renderTypography,
  });
})();

/* The page engine for proposed.html. Small on purpose: it reads three stylesheets (style.css, theme.css, proposed.css), draws the
   approved families from window.DS_PROPOSED into small frames, and lists the families still to decide by name. It loads no
   inventory of what exists today. Frames are written with the stylesheet text (read by XHR, which also works from disk), so the
   forced hover, focus and pressed states can be made from the stylesheet's own rules; if the text cannot be read, the frame links the
   stylesheet and the forced states are skipped. */
(() => {
  'use strict';
  const D = document;
  const stats = { frames: 0, loaded: 0, families: 0, undecided: 0, errors: [], forcedRules: 0, ready: false };
  window.__dsStats = stats;
  window.addEventListener('error', (e) => stats.errors.push(String(e.message || e)));
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = (sel, root) => (root || D).querySelector(sel);
  const $$ = (sel, root) => [...(root || D).querySelectorAll(sel)];
  const mk = (tag, cls, html) => { const e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const SHEETS = ['app', 'theme', 'proposed']; // the data-ds names of the stylesheet links in the page
  const href = {}; const text = {};
  function xhr(url) {
    return new Promise((resolve) => {
      const r = new XMLHttpRequest();
      r.open('GET', url);
      r.onload = () => resolve(r.status === 0 || (r.status >= 200 && r.status < 300) ? r.responseText : '');
      r.onerror = () => resolve('');
      r.send();
    });
  }

  const FRAME_CSS = `
html[data-theme-mode="dark"] { color-scheme: dark; }
html[data-theme-mode="light"] { color-scheme: light; }
html, body { min-height: 0 !important; height: auto !important; overflow-x: hidden; }
body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 14px; }
.dsf { padding: 4px 14px 14px; }
.dsf-states { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 14px 24px; }
.dsf-state { display: flex; flex-direction: column; gap: 5px; min-width: 0; max-width: 100%; }
.dsf-state > small { line-height: 12px; height: 12px; color: var(--text-dim); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.dsf-ex { min-width: 0; max-width: 100%; }
`;
  let mode = 'dark';
  let width = 'fit';
  let font = 'figtree'; // '' is Today's system stack; else a candidate's key (data-font on .ds-proposed in the frames). Figtree is Thomas's pick.
  let headline = 'archivo'; // '' is the UI font; else a headline candidate's key (data-headline on .ds-proposed in the frames)
  const frames = [];
  const frameReady = [];

  function frameHtml(body, o) {
    const m = o.pin || mode;
    const sheets = SHEETS.map((k) => (text[k] ? `<style>${text[k]}</style>` : `<link rel="stylesheet" href="${h(href[k] || '')}">`)).join('');
    return `<!doctype html><html lang="en" data-theme-mode="${m}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${h(href.fa)}">${sheets}<style>${FRAME_CSS}${o.css || ''}</style></head><body><div class="dsf">${body}</div></body></html>`;
  }

  // Forced states: a copy of every :hover, :focus and :active rule that matches a class instead, right after the original.
  const PSEUDO = /:(hover|focus-visible|focus-within|focus|active)(?![A-Za-z-])/g;
  const FORCE = { hover: 'ds-force-hover', 'focus-visible': 'ds-force-focus', 'focus-within': 'ds-force-focus', focus: 'ds-force-focus', active: 'ds-force-active' };
  function addForceRules(doc) {
    let added = 0;
    const handle = (parent) => {
      const list = parent.cssRules;
      for (let i = list.length - 1; i >= 0; i -= 1) {
        const r = list[i];
        if (r.type === 1) {
          PSEUDO.lastIndex = 0;
          if (!PSEUDO.test(r.selectorText)) continue;
          PSEUDO.lastIndex = 0;
          const sel = r.selectorText.replace(PSEUDO, (_, k) => '.' + FORCE[k]);
          const t = r.cssText;
          try { parent.insertRule(sel + ' ' + t.slice(t.indexOf('{')), i + 1); added += 1; } catch (e) { /* a selector the copy cannot be written for */ }
        } else if (r.cssRules && r.constructor.name !== 'CSSKeyframesRule') handle(r);
      }
    };
    for (const s of doc.styleSheets) { try { handle(s); } catch (e) { /* a sheet we cannot read */ } }
    stats.forcedRules += added;
  }

  function setWidth(f) { f.iframe.style.width = f.pinWidth ? f.pinWidth + 'px' : width === 'fit' ? '100%' : width + 'px'; }
  function makeFrame(ctx, bodyHtml, o = {}) {
    const wrap = mk('div', 'ds-frame-wrap');
    const iframe = D.createElement('iframe');
    iframe.className = 'ds-frame';
    iframe.title = o.title || 'Examples';
    iframe.style.height = (o.height || 160) + 'px';
    const f = { iframe, ctx, fixed: o.height || 0, pin: o.pin || '', pinWidth: o.pinWidth || 0, fit: null };
    frames.push(f);
    stats.frames += 1;
    frameReady.push(new Promise((resolve) => {
      iframe.addEventListener('load', () => {
        const doc = iframe.contentDocument;
        if (!doc || !doc.body) { resolve(); return; }
        addForceRules(doc);
        applyFont(doc);
        applyHeadline(doc);
        if (o.onload) o.onload(doc, f);
        doc.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('a[href]')) e.preventDefault(); });
        doc.addEventListener('submit', (e) => e.preventDefault());
        if (!f.fixed) {
          const fit = () => { const n = Math.ceil(doc.body.getBoundingClientRect().height + 2) + 'px'; if (iframe.style.height !== n) iframe.style.height = n; };
          fit();
          f.fit = fit;
          if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(fit)).observe(doc.body);
        }
        stats.loaded += 1;
        resolve();
      }, { once: true });
    }));
    setWidth(f);
    iframe.srcdoc = frameHtml(bodyHtml, o);
    wrap.appendChild(iframe);
    return wrap;
  }

  // The font switch: every .ds-proposed in a frame gets data-font, except the ones that show one font on purpose (data-font-fixed).
  function applyFont(doc) {
    for (const e of doc.querySelectorAll('.ds-proposed:not([data-font-fixed])')) { if (font) e.dataset.font = font; else delete e.dataset.font; }
  }
  // The headline switch: the same, for the big words (data-headline), except where a frame shows one candidate on purpose (data-headline-fixed).
  function applyHeadline(doc) {
    for (const e of doc.querySelectorAll('.ds-proposed:not([data-headline-fixed])')) { if (headline) e.dataset.headline = headline; else delete e.dataset.headline; }
  }
  function setHeadline(k) {
    headline = k;
    for (const b of $$('#ds-headline button')) { const on = b.dataset.headline === k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
    for (const f of frames) { const doc = f.iframe.contentDocument; if (doc && doc.body) applyHeadline(doc); }
  }
  function setFont(k) {
    font = k;
    for (const b of $$('#ds-font button')) { const on = b.dataset.font === k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
    for (const f of frames) { const doc = f.iframe.contentDocument; if (doc && doc.body) applyFont(doc); }
  }

  function setMode(m) {
    mode = m;
    D.documentElement.dataset.themeMode = m;
    for (const b of $$('#ds-mode button')) { const on = b.dataset.mode === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
    for (const f of frames) {
      const doc = f.iframe.contentDocument;
      if (doc && doc.documentElement) doc.documentElement.dataset.themeMode = f.pin || m;
    }
  }
  function setWidthAll(w) {
    width = w;
    for (const b of $$('#ds-width button')) { const on = b.dataset.w === w; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
    for (const f of frames) setWidth(f);
  }

  // ---- the page ----
  const STATUS = { proposed: 'Proposed', approved: 'Approved', undecided: 'Not yet decided' };
  const chip = (st) => `<span class="ds-status-chip ds-st-${st}">${STATUS[st]}</span>`;
  const nav = $('#ds-nav');
  const content = $('#ds-content');
  const navItems = [];
  function navGroup(title) { nav.appendChild(mk('h2', '', h(title))); const ul = mk('ul'); nav.appendChild(ul); return ul; }
  function navItem(ul, label, id, st, search) {
    const li = mk('li'); const a = mk('a', '', `<span>${h(label)}</span>${chip(st)}`);
    a.href = '#' + id; li.appendChild(a); ul.appendChild(li);
    navItems.push({ li, id, name: (search || label).toLowerCase() });
  }
  function applySearch() {
    const q = $('#ds-search').value.trim().toLowerCase();
    for (const b of $$('.ds-block')) b.hidden = Boolean(q) && !b.dataset.name.includes(q);
    for (const n of navItems) { const t = D.getElementById(n.id); n.li.hidden = Boolean(q) && (t ? t.hidden : !n.name.includes(q)); }
  }
  // #buttons, and the older #proposed/buttons, scroll to that block or heading.
  function route(first) {
    const id = decodeURIComponent(location.hash.slice(1)).replace(/^proposed\//, '');
    const t = id && (D.getElementById(id) || D.getElementById('p-' + id));
    for (const n of navItems) { const a = $('a', n.li); if (n.id === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }
    if (t) { t.scrollIntoView(); return; }
    if (!first) window.scrollTo(0, 0);
  }

  async function init() {
    for (const k of SHEETS.concat('fa')) { const l = $(`link[data-ds="${k}"]`); href[k] = l ? l.href : ''; }
    const got = await Promise.all(SHEETS.map((k) => (href[k] ? xhr(href[k]) : '')));
    SHEETS.forEach((k, i) => { text[k] = got[i]; });
    const P = window.DS_PROPOSED;
    const decided = P.families || [];
    const undecided = P.undecided || [];
    stats.families = decided.length;
    const sec = mk('section', 'ds-sec');
    sec.id = 'top';
    sec.innerHTML = `<h2>Design system: proposed</h2><p class="ds-lead">The system as Thomas has decided it, one family at a time. Only decided components are drawn, as specs, from the proposed rules (<code>proposed.css</code>, all under <code>.ds-proposed</code>, so the product is untouched). A family not yet decided is listed by name only. ${chip('approved')} decided, ${chip('proposed')} drawn and waiting for a decision, ${chip('undecided')} not yet decided. What exists today is on its own page: <a href="index.html">Today's inventory</a>.</p>`;
    content.appendChild(sec);
    const api = { mk, h, makeFrame, mode: () => mode };
    sec.appendChild(mk('h3', 'ds-group', 'Decided'));
    const ul = navGroup('Decided');
    for (const p of decided) {
      const b = p.render(api);
      b.id = p.id; b.classList.add('ds-block'); b.dataset.name = (p.name + ' ' + p.id + ' ' + (p.words || '')).toLowerCase();
      sec.appendChild(b);
      navItem(ul, p.name, p.id, p.status, p.name + ' ' + p.id + ' ' + (p.words || ''));
    }
    sec.appendChild(mk('h3', 'ds-group', 'Still to decide'));
    for (const g of undecided) {
      const gul = navGroup(g.group);
      for (const name of g.names) {
        stats.undecided += 1;
        const id = 'u-' + slug(name);
        const b = mk('section', 'ds-block ds-undecided');
        b.id = id; b.dataset.name = (name + ' ' + g.group).toLowerCase();
        b.innerHTML = `<header><h3>${h(name)}</h3>${chip('undecided')}<span class="ds-count">${h(g.group)}</span></header><p class="ds-desc">Not yet decided.</p>`;
        sec.appendChild(b);
        navItem(gul, name, id, 'undecided', name + ' ' + g.group);
      }
    }
    await Promise.all(frameReady);
    $('#ds-status').textContent = `${stats.families} decided ${stats.families === 1 ? 'family' : 'families'}, ${stats.undecided} still to decide, ${stats.frames} example frames.`;
    route(true);
    stats.ready = true;
  }

  $('#ds-search').addEventListener('input', applySearch);
  $('#ds-mode').addEventListener('click', (e) => { const b = e.target.closest('button[data-mode]'); if (b) setMode(b.dataset.mode); });
  $('#ds-font').addEventListener('click', (e) => { const b = e.target.closest('button[data-font]'); if (b) setFont(b.dataset.font); });
  $('#ds-headline').addEventListener('click', (e) => { const b = e.target.closest('button[data-headline]'); if (b) setHeadline(b.dataset.headline); });
  $('#ds-width').addEventListener('click', (e) => { const b = e.target.closest('button[data-w]'); if (b) setWidthAll(b.dataset.w); });
  $('#ds-menu-btn').addEventListener('click', () => { const open = nav.classList.toggle('open'); $('#ds-menu-btn').setAttribute('aria-expanded', String(open)); });
  nav.addEventListener('click', (e) => { if (e.target.closest('a') && nav.classList.contains('open')) { nav.classList.remove('open'); $('#ds-menu-btn').setAttribute('aria-expanded', 'false'); } });
  window.addEventListener('hashchange', () => route(false));
  window.__ds = { setMode, setWidth: setWidthAll, setFont, setHeadline, frames, stats };
  const start = new URLSearchParams(location.search).get('mode');
  setMode(start === 'light' || start === 'dark' ? start : mode);
  const startFont = new URLSearchParams(location.search).get('font');
  if (startFont && $(`#ds-font button[data-font="${startFont.replace(/[^a-z0-9-]/g, '')}"]`)) font = startFont.replace(/[^a-z0-9-]/g, '');
  setFont(font);
  const startHead = new URLSearchParams(location.search).get('headline');
  if (startHead !== null && $(`#ds-headline button[data-headline="${startHead.replace(/[^a-z0-9-]/g, '')}"]`)) headline = startHead.replace(/[^a-z0-9-]/g, '');
  setHeadline(headline);
  init().catch((e) => { stats.errors.push('init: ' + (e && e.stack || e)); $('#ds-status').textContent = 'The page failed to draw: ' + (e && e.message); });
})();
