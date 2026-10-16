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
<nav class="ds-toc" aria-label="In this family"><a href="#typography-pick">Candidates</a><a href="#typography-today">Used today</a><a href="#typography-scale">Type scale</a><a href="#typography-fail">If the font fails</a><a href="#typography-centre">Centring</a><a href="#typography-code">The fix</a></nav>

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
    block.querySelector('[data-slot="fail"]').appendChild(api.makeFrame('app', failBody, { proposed: true, title: 'Typography, if the font fails', css: PM_CSS + TY_CSS, onload: measure }));
    return block;
  }

  // Families still to decide: names only, in the groups Today uses. Nothing is drawn for them.
  window.DS_PROPOSED.undecided = [
    { group: 'Controls', names: ['Links', 'Fields: text, select, text area', 'Pickers: date, kind, currency', 'Tick boxes, choices and switches', 'Form standard and editor window'] },
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
    id: 'typography', covers: ['typography', 'fonts'], group: 'Foundations', name: 'Typography', status: 'proposed',
    words: 'typography font fonts typeface type scale text bundled self-hosted woff2 figtree nunito source sans fallback metrics ascent descent centring baseline', render: renderTypography,
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
  let font = ''; // '' is Today's system stack; else a candidate's key (data-font on .ds-proposed in the frames)
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
  $('#ds-width').addEventListener('click', (e) => { const b = e.target.closest('button[data-w]'); if (b) setWidthAll(b.dataset.w); });
  $('#ds-menu-btn').addEventListener('click', () => { const open = nav.classList.toggle('open'); $('#ds-menu-btn').setAttribute('aria-expanded', String(open)); });
  nav.addEventListener('click', (e) => { if (e.target.closest('a') && nav.classList.contains('open')) { nav.classList.remove('open'); $('#ds-menu-btn').setAttribute('aria-expanded', 'false'); } });
  window.addEventListener('hashchange', () => route(false));
  window.__ds = { setMode, setWidth: setWidthAll, setFont, frames, stats };
  const start = new URLSearchParams(location.search).get('mode');
  setMode(start === 'light' || start === 'dark' ? start : mode);
  const startFont = new URLSearchParams(location.search).get('font');
  if (startFont && $(`#ds-font button[data-font="${startFont.replace(/[^a-z0-9-]/g, '')}"]`)) font = startFont.replace(/[^a-z0-9-]/g, '');
  setFont(font);
  init().catch((e) => { stats.errors.push('init: ' + (e && e.stack || e)); $('#ds-status').textContent = 'The page failed to draw: ' + (e && e.message); });
})();
