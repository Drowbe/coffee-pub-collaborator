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
  $('#ds-width').addEventListener('click', (e) => { const b = e.target.closest('button[data-w]'); if (b) setWidthAll(b.dataset.w); });
  $('#ds-menu-btn').addEventListener('click', () => { const open = nav.classList.toggle('open'); $('#ds-menu-btn').setAttribute('aria-expanded', String(open)); });
  nav.addEventListener('click', (e) => { if (e.target.closest('a') && nav.classList.contains('open')) { nav.classList.remove('open'); $('#ds-menu-btn').setAttribute('aria-expanded', 'false'); } });
  window.addEventListener('hashchange', () => route(false));
  window.__ds = { setMode, setWidth: setWidthAll, frames, stats };
  const start = new URLSearchParams(location.search).get('mode');
  setMode(start === 'light' || start === 'dark' ? start : mode);
  init().catch((e) => { stats.errors.push('init: ' + (e && e.stack || e)); $('#ds-status').textContent = 'The page failed to draw: ' + (e && e.message); });
})();
