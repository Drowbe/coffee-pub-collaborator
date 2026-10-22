/* The Buttons family (approved): the text and icon-only buttons, their roles, sizes and states, and the round call buttons. Loaded by proposed.html through proposed-families.json, after proposed.js (the page engine); it registers one family
   through window.DS_PROPOSED.families.push and draws it with the rules in proposed-buttons.css. Nothing here is a style of the product:
   markup, words and tables only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules (.pm-row, .pm-role ...), from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
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
    <div class="pm-card"><form class="sdk-form" style="flex:1 1 260px" onsubmit="return false"><div class="sdk-field sdk-full"><span class="sdk-label">Name</span><div class="sdk-group"><input type="text" value="Louvre" aria-label="Name"><button type="button" class="sdk-icon-btn btn-small btn-quiet" aria-label="Open the calendar" title="Open the calendar">${fa('calendar')}</button><button type="button" class="sdk-btn primary">Find</button></div></div></form></div>
  </div>`);

  // ---- the round buttons: a general component, kept as circles, drawn with the product's own .fbtn rules ----
  const RB_STATES = [
    { n: 'Rest' }, { n: 'Hover', cls: 'ds-force-hover' }, { n: 'Focus', cls: 'ds-force-focus' }, { n: 'Pressed', cls: 'ds-force-active' },
    { n: 'On', cls: 'on' }, { n: 'Off', cls: 'off' }, { n: 'Loading', cls: 'loading' }, { n: 'Disabled', attrs: ' disabled' },
  ];
  // icon is shown when on or at rest; off is the icon shown in the Off state (a toggle has one, a plain action does not).
  const rbBtn = (s, label, icon, off, extra) => `<button type="button" class="fbtn${extra ? ' ' + extra : ''}${s.cls ? ' ' + s.cls : ''}" aria-label="${label}" title="${label}"${s.attrs || ''}><span class="glyph">${fa(icon, 'fa-fw icon-on')}${fa(off || icon, 'fa-fw icon-off')}${fa('spinner', 'fa-fw fa-spin icon-loading')}</span></button>`;
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
<p class="ds-desc">Thomas's decisions of 2026-10-15, drawn from <code>proposed.css</code> (every rule under <code>.ds-proposed</code>). Four roles, two sizes, one icon-only button, every state. What exists today is on its own page, <a href="index.html#buttons">Legacy inventory</a>.</p>
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
<p class="ds-desc"><b>The names.</b> <code>.btn-quiet</code>, <code>.btn-danger.solid</code> and <code>.sdk-icon-btn</code> are the new ones. <code>.sdk-icon-btn</code> is the one icon-only name because it is what the SDK draws (like <code>.sdk-btn</code>). <code>.btn</code>, <code>.btn-primary</code>, <code>.btn-danger</code>, <code>.btn-small</code>, <code>.sdk-btn</code> and <code>.btn.on</code> keep their names; <code>.btn-accent</code> and <code>.btn.off</code> fold into the roles. There are no aliases: the old icon-button names are gone from the markup.</p>
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

  window.DS_PROPOSED.families.push({
    id: 'buttons', covers: ['buttons', 'icon-buttons'], group: 'Controls', name: 'Buttons', status: 'approved',
    words: 'button icon-only icon buttons primary secondary danger quiet small round buttons circle icon toggle play bookmark star microphone video call fbtn', render,
  });
})();
