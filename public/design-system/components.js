/* The Design System page's catalog, part 1: controls (buttons, fields, choices, pickers, links, the call's buttons). Each family is
   one family block of public/sdk/system.css (`/* <id>:start *\/ ... /* <id>:end *\/`; `block` names it when the id differs) or, said
   in its description, a look public/style.css still draws. Each look is the product's own markup with the classes the product
   uses, and only classes some rule of its stylesheets names (tools/check-design-system-catalog.mjs fails otherwise).
   `ctx` says which stylesheets the look is drawn with: 'app' (an app page: public/style.css, the theme and public/sdk/system.css),
   'host' (a module's page: public/sdk/system.css and public/sdk/host.css) or 'mod:<id>' (that, and the module's own stylesheet).
   `sel` is the selector the page finds the file and line for; `states` are the stylesheet's own :hover, :focus and :active rules,
   forced on. Nothing here is a style: only markup and words. */
window.DS_FAMILIES = window.DS_FAMILIES || [];
window.DS_NOT_MOUNTED = window.DS_NOT_MOUNTED || [];
(() => {
  const fa = (n, extra) => `<i class="fa-solid fa-${n}${extra ? ' ' + extra : ''}" aria-hidden="true"></i>`;
  window.DSH = { fa };
  const F = window.DS_FAMILIES;
  const row = (inner, gap = 8) => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:${gap}px">${inner}</div>`;

  // ---- Buttons ----
  F.push({
    id: 'buttons', group: 'Controls', name: 'Buttons',
    desc: 'One button for the app and every module: <code>.btn</code> (words), <code>.sdk-btn</code> (the same look in a form) and <code>.sdk-icon-btn</code> (an icon only). The kind is a second class: <code>.btn-primary</code>, <code>.btn-danger</code> (add <code>.solid</code> for a final action), <code>.btn-quiet</code>; <code>.btn-small</code> is the 30px size. Pressed (a toggle) is <code>.on</code> or <code>aria-pressed="true"</code>; busy is <code>aria-busy="true"</code>.',
    variants: [
      { n: 'Secondary (the default)', ctx: 'app', sel: ':is(.btn, .sdk-btn, .sdk-icon-btn)', html: '<button type="button" class="btn">Cancel</button>', states: ['hover', 'focus', 'active', 'disabled'] },
      { n: 'Primary', ctx: 'app', sel: '.btn-primary', html: '<button type="button" class="btn btn-primary">Save</button>', states: ['hover', 'focus', 'active', 'disabled'] },
      { n: 'Danger', ctx: 'app', sel: '.btn-danger', note: 'An action that removes something, soft: a person can undo it or is asked first.', html: '<button type="button" class="btn btn-danger">Remove</button>', states: ['hover', 'focus', 'active', 'disabled'] },
      { n: 'Danger, solid (final)', ctx: 'app', sel: '.btn-danger.solid', note: 'Cannot be undone: the confirm\'s action for a final delete.', html: '<button type="button" class="btn btn-danger solid">Delete for good</button>', states: ['hover', 'focus', 'disabled'] },
      { n: 'Quiet', ctx: 'app', sel: '.btn-quiet', html: '<button type="button" class="btn btn-quiet">Not now</button>', states: ['hover', 'focus', 'active'] },
      { n: 'With an icon', ctx: 'app', sel: ':is(.btn, .sdk-btn) > :is(i, .ic)', html: row('<button type="button" class="btn">' + fa('plus') + ' Add</button><button type="button" class="btn btn-primary">' + fa('check') + ' Done</button>') },
      { n: 'Small (30px)', ctx: 'app', sel: '.btn-small', note: 'The toolbar, a card\'s head, the action bar. A phone keeps a 44px touch area around it.', html: row('<button type="button" class="btn btn-small btn-primary">Save</button><button type="button" class="btn btn-small">Cancel</button><button type="button" class="btn btn-small btn-danger">Discard</button>'), target: '.btn' },
      { n: 'Pressed (a toggle)', ctx: 'app', sel: '.btn.on', html: row('<button type="button" class="btn btn-small" aria-pressed="false">' + fa('filter') + ' Filter</button><button type="button" class="btn btn-small on" aria-pressed="true">' + fa('filter') + ' Filter</button>') },
      { n: 'Busy', ctx: 'app', sel: '[aria-busy="true"]', html: '<button type="button" class="btn btn-primary" aria-busy="true"><span class="sdk-spinner sdk-spinner-sm" aria-hidden="true"></span> Saving</button>' },
      { n: 'Form button .sdk-btn', ctx: 'host', sel: '.sdk-btn', note: 'The same button, in a form\'s line.', html: row('<button type="button" class="sdk-btn">Find</button><button type="button" class="sdk-btn primary">Save</button>'), target: '.sdk-btn', states: ['hover', 'focus', 'disabled'] },
      { n: 'Icon button .sdk-icon-btn', ctx: 'app', sel: '.sdk-icon-btn', note: 'Always with an aria-label. Secondary, Primary or Quiet; regular or small.', html: row('<button type="button" class="sdk-icon-btn" aria-label="Add">' + fa('plus') + '</button><button type="button" class="sdk-icon-btn btn-primary" aria-label="Send">' + fa('paper-plane') + '</button><button type="button" class="sdk-icon-btn btn-quiet" aria-label="More">' + fa('ellipsis-vertical') + '</button>'), target: '.sdk-icon-btn', states: ['hover', 'focus', 'active', 'disabled'] },
      { n: 'Icon button, small', ctx: 'app', sel: '.sdk-icon-btn.btn-small', html: row('<button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Reply">' + fa('reply') + '</button><button type="button" class="sdk-icon-btn btn-quiet btn-small on" aria-pressed="true" aria-label="Keep">' + fa('bookmark') + '</button><button type="button" class="sdk-icon-btn btn-small" aria-label="Close">' + fa('xmark') + '</button>'), target: '.sdk-icon-btn', states: ['hover'] },
      { n: 'In a module', ctx: 'host', sel: '.btn', note: 'A module\'s page has the same rules (the server puts system.css in it).', html: row('<button type="button" class="btn">Cancel</button><button type="button" class="btn btn-primary">Save</button><button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="More">' + fa('ellipsis-vertical') + '</button>'), target: '.btn', states: ['hover', 'focus'] },
    ],
  });

  // ---- Fields ----
  const field = (label, input, hint = '', cls = '') => `<label class="sdk-field${cls ? ' ' + cls : ''}"><span class="sdk-label">${label}</span>${input}<span class="sdk-hint">${hint}</span></label>`;
  F.push({
    id: 'fields', group: 'Controls', name: 'Fields and forms',
    desc: 'The bare <code>input</code>, <code>select</code> and <code>textarea</code> are the field (system.css draws them, at no weight). A labelled field is <code>.sdk-field</code> with <code>.sdk-label</code>, the control and <code>.sdk-hint</code> or <code>.sdk-error</code>; a form is <code>.sdk-form</code> with <code>.sdk-form-row</code> and the widths <code>.sdk-s</code>, <code>.sdk-m</code>, <code>.sdk-l</code>, <code>.sdk-full</code>. An error is <code>aria-invalid="true"</code>.',
    variants: [
      { n: 'Text field', ctx: 'host', sel: '.sdk-field', html: '<form class="sdk-form" onsubmit="return false" style="width:240px">' + field('Title', '<input type="text" value="Flight to Lisbon">', 'A short hint under the field.') + '</form>', target: 'input', states: [{ n: 'Hover', force: 'hover' }, { n: 'Focus', force: 'focus' }, { n: 'Disabled', attrs: { disabled: '' } }, { n: 'Error', html: '<form class="sdk-form" onsubmit="return false" style="width:240px"><label class="sdk-field"><span class="sdk-label">Title</span><input type="text" aria-invalid="true" value=""><span class="sdk-error">Enter a title.</span></label></form>' }] },
      { n: 'Select and text area', wide: true, ctx: 'host', sel: ':where(select)', html: '<form class="sdk-form" onsubmit="return false"><div class="sdk-form-row">' + field('Class', '<select><option>Economy</option><option>Business</option></select>', '', 'sdk-m') + field('Seats', '<input type="number" value="2">', '', 'sdk-s') + '</div>' + field('Notes', '<textarea rows="3">Window seat if there is one.</textarea>', '', 'sdk-full') + '</form>' },
      { n: 'Optional label', wide: true, ctx: 'host', sel: '.sdk-optional', html: '<form class="sdk-form" onsubmit="return false"><label class="sdk-field"><span class="sdk-label">Booking code <span class="sdk-optional">optional</span></span><input type="text" placeholder="ABC123"><span class="sdk-hint"></span></label></form>' },
      { n: 'Search .sdk-search', ctx: 'host', sel: '.sdk-search', html: '<label class="sdk-search">' + fa('magnifying-glass') + '<input type="search" placeholder="Search places" aria-label="Search places"></label>', target: 'input', states: [{ n: 'Focus', force: 'focus' }] },
      { n: 'Date field .sdk-datefield', wide: true, ctx: 'host', sel: '.sdk-datefield', note: 'host.ui.datePicker puts the calendar button in the field; the month grid is under Pickers.', html: '<form class="sdk-form" onsubmit="return false"><div class="sdk-field" role="group" aria-labelledby="dsl1"><span class="sdk-label" id="dsl1">Departure day</span><div class="sdk-datefield sdk-group"><input type="date" value="2026-10-09" aria-labelledby="dsl1"><button type="button" class="sdk-icon-btn btn-small btn-quiet" aria-label="Open the calendar">' + fa('calendar') + '</button></div><span class="sdk-hint">Fri</span></div></form>' },
      { n: 'A pair .sdk-pair and a section .sdk-section', ctx: 'host', sel: '.sdk-pair', wide: true, html: '<form class="sdk-form" onsubmit="return false"><div class="sdk-pair">' + field('From', '<input type="text" value="Lisbon">') + '<span class="sdk-pair-arrow">' + fa('arrow-right') + '</span>' + field('To', '<input type="text" value="Porto">') + '</div><fieldset class="sdk-section"><legend class="sdk-section-title">Details</legend><div class="sdk-form-row">' + field('Hours', '<span class="sdk-group"><input type="text" inputmode="numeric" value="2" aria-label="Hours"><span class="sdk-unit">h</span></span>', '', 'sdk-s') + field('Cost', '<input type="text" value="40">', '', 'sdk-m') + '</div></fieldset></form>' },
      { n: 'Form error .sdk-form-error', wide: true, ctx: 'host', sel: '.sdk-form-error', note: 'The line under a form when saving did not work; <code>.ok</code> when it did.', html: '<div class="sdk-form"><div class="sdk-form-error">The save did not work. Try again.</div><div class="sdk-form-error ok">Saved.</div></div>' },
      { n: 'On an app page', wide: true, ctx: 'app', sel: '.sdk-field', note: 'Profile, Manage and the space settings use the same field.', html: '<form class="sdk-form" onsubmit="return false"><div class="sdk-form-row">' + field('Display name', '<input type="text" value="Thomas">', '', 'sdk-m') + field('Role', '<select><option>Member</option><option>Moderator</option></select>', '', 'sdk-m') + '</div></form>', target: 'input', states: [{ n: 'Focus', force: 'focus' }] },
      { n: 'File, colour and range', wide: true, ctx: 'host', sel: ':where(input[type="file"])', html: row('<input type="file" aria-label="Choose a file"><input type="color" value="#c47a2c" aria-label="Colour"><input type="range" value="40" aria-label="Volume">', 16) },
    ],
  });

  // ---- Choices ----
  F.push({
    id: 'choices', group: 'Controls', name: 'Tick boxes, choices and switches',
    desc: 'A tick box or a radio is the bare <code>input</code>; a switch is <code>input type="checkbox" class="sdk-switch" role="switch"</code>. A labelled row is <code>.sdk-choice-row</code> in a <code>.sdk-choice-list</code>, with <code>.sdk-choice-text</code>, <code>.sdk-choice-label</code> and <code>.sdk-choice-desc</code>; <code>.sdk-choice-boxed</code> draws the row as a box.',
    variants: [
      { n: 'Tick rows', ctx: 'host', sel: '.sdk-choice-row', html: '<div class="sdk-choice-list"><label class="sdk-choice-row"><input type="checkbox" checked><span class="sdk-choice-text"><span class="sdk-choice-label">Round trip</span></span></label><label class="sdk-choice-row"><input type="checkbox"><span class="sdk-choice-text"><span class="sdk-choice-label">Booked</span></span></label><label class="sdk-choice-row"><input type="checkbox" disabled><span class="sdk-choice-text"><span class="sdk-choice-label">Locked</span></span></label></div>', target: 'label:nth-child(2)', states: ['hover'] },
      { n: 'One of a few (radio rows)', ctx: 'host', sel: '.sdk-choice-row', html: '<div class="sdk-choice-list" role="radiogroup" aria-label="Show"><label class="sdk-choice-row"><input type="radio" name="c1" checked><span class="sdk-choice-text"><span class="sdk-choice-label">Day</span></span></label><label class="sdk-choice-row"><input type="radio" name="c1"><span class="sdk-choice-text"><span class="sdk-choice-label">Week</span></span></label><label class="sdk-choice-row"><input type="radio" name="c1"><span class="sdk-choice-text"><span class="sdk-choice-label">Month</span></span></label></div>' },
      { n: 'With a description', ctx: 'host', sel: '.sdk-choice-desc', html: '<div class="sdk-choice-list"><label class="sdk-choice-row"><input type="checkbox" checked><span class="sdk-choice-text"><span class="sdk-choice-label">Send a reminder</span><span class="sdk-choice-desc">A day before, to everyone in the space.</span></span></label></div>' },
      { n: 'Switch rows', ctx: 'app', sel: 'input.sdk-switch', note: 'Space settings, Manage, the module list.', html: '<div class="sdk-choice-list"><label class="sdk-choice-row"><span class="sdk-choice-text"><span class="sdk-choice-label">Published calendar</span></span><input type="checkbox" class="sdk-switch" role="switch" checked></label><label class="sdk-choice-row"><span class="sdk-choice-text"><span class="sdk-choice-label">Chat</span><span class="sdk-choice-desc">always on</span></span><input type="checkbox" class="sdk-switch" role="switch" checked disabled></label></div>', target: 'input', states: ['focus'] },
      { n: 'Boxed rows .sdk-choice-boxed', ctx: 'host', sel: '.sdk-choice-boxed', html: '<div class="sdk-choice-list"><label class="sdk-choice-row sdk-choice-boxed"><input type="radio" name="c2" checked><span class="sdk-choice-text"><span class="sdk-choice-label">Everyone</span><span class="sdk-choice-desc">Every member of the space</span></span></label><label class="sdk-choice-row sdk-choice-boxed"><input type="radio" name="c2"><span class="sdk-choice-text"><span class="sdk-choice-label">Only me</span><span class="sdk-choice-desc">Nobody else sees it</span></span></label></div>' },
      { n: 'The bare controls', ctx: 'host', sel: ':where(input[type="checkbox"], input[type="radio"])', html: row('<input type="checkbox" aria-label="One"><input type="checkbox" checked aria-label="Two"><input type="radio" name="c3" aria-label="Three"><input type="radio" name="c3" checked aria-label="Four"><input type="checkbox" class="sdk-switch" role="switch" aria-label="Five"><input type="checkbox" class="sdk-switch" role="switch" checked aria-label="Six">', 14), target: 'input', states: ['focus', 'disabled'] },
    ],
  });

  // ---- Pickers ----
  const dpDays = () => {
    const names = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
    let s = names.map((n) => `<div class="sdk-dp-dow">${n}</div>`).join('');
    const days = [28, 29, 30, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 1];
    days.forEach((d, i) => {
      const other = (i < 3 || i > 33) ? ' other' : '';
      const cls = d === 14 && !other ? ' today' : d === 18 && !other ? ' sel' : d >= 19 && d <= 21 && !other ? ' inrange' : '';
      s += `<button type="button" class="sdk-dp-day${other}${cls}">${d}</button>`;
    });
    return s;
  };
  const SW = ['#c47a2c', '#2c7ac4', '#3f9a5a', '#2a9d9a', '#7a2cc4', '#c43a2c', '#d9822b', '#c42c7a'];
  F.push({
    id: 'pickers', group: 'Controls', name: 'Pickers: date, kind, colour',
    desc: 'The SDK\'s own pickers: the date picker\'s month (<code>.sdk-dp</code>, from host.ui.datePicker), the kind picker\'s field (<code>.sdk-kind-field</code>, host.ui.kindPicker; its list is under Menus) and the colour picker (<code>.sdk-picker</code> with <code>.sdk-picker-pop</code> and <code>.sdk-swatch</code>). Live ones are under Live SDK pieces.',
    variants: [
      { n: 'Date picker month .sdk-dp', ctx: 'host', sel: '.sdk-dp', static: true, note: 'Today is a fill; the chosen day is the accent; a range is a tint. The real one is placed under its field.', html: '<div class="sdk-dp"><div class="sdk-dp-head"><button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Earlier">' + fa('chevron-left') + '</button><strong class="sdk-dp-title">October 2026</strong><button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Later">' + fa('chevron-right') + '</button></div><div class="sdk-dp-grid">' + dpDays() + '</div><div class="sdk-dp-foot"><button type="button" class="btn btn-small btn-quiet">Today</button><button type="button" class="btn btn-small btn-quiet">Clear</button></div></div>' },
      { n: 'Kind picker field .sdk-kind-field', ctx: 'host', sel: '.sdk-kind-field', html: '<div class="sdk-kind" style="max-width:280px"><div class="sdk-kind-field"><span class="sdk-kind-chip" style="--kind-color:#c47a2c">' + fa('landmark') + '</span><input class="sdk-kind-input" value="Sight" aria-label="What is it"><span class="sdk-kind-chevron">' + fa('chevron-down') + '</span></div></div>', target: '.sdk-kind-field', states: [{ n: 'Focus', force: 'focus' }, { n: 'Open', html: '<div class="sdk-kind open" style="max-width:280px"><div class="sdk-kind-field"><span class="sdk-kind-chip" style="--kind-color:#c47a2c">' + fa('landmark') + '</span><input class="sdk-kind-input" value="Sight" aria-label="What is it"><span class="sdk-kind-chevron">' + fa('chevron-down') + '</span></div></div>' }] },
      { n: 'Colour picker .sdk-picker', ctx: 'app', sel: '.sdk-picker', note: 'public/colour-pick.js: the trigger shows the swatch and its value; the swatches open under it.', html: '<button type="button" class="sdk-picker" aria-haspopup="dialog" aria-expanded="false"><span class="sdk-picker-sw" style="--sw:#2c7ac4" aria-hidden="true"></span><span class="sdk-picker-value"><span class="sdk-hex">#2c7ac4</span></span><span class="sdk-picker-icon">' + fa('chevron-down') + '</span></button>', states: ['hover', 'focus', { n: 'Open', attrs: { 'aria-expanded': 'true' } }, 'disabled'] },
      { n: 'Colour swatches .sdk-picker-pop', ctx: 'app', sel: '.sdk-swatch-grid', static: true, target: '.sdk-swatch', states: ['hover', 'focus'], html: '<div class="sdk-popover sdk-popover-dense sdk-picker-pop" role="dialog" aria-label="Colour"><div class="sdk-swatch-grid" role="radiogroup" aria-label="Colours">' + SW.map((c, i) => `<button type="button" class="sdk-swatch" role="radio" aria-checked="${i === 1}" aria-label="${c}" style="--sw:${c}">${fa('check')}</button>`).join('') + '</div><label class="sdk-swatch-custom"><span>Custom</span><input type="color" value="#888888" aria-label="Custom colour"></label></div>' },
    ],
    notMounted: 'the kind picker\'s phone sheet (fixed to the screen) and the date picker\'s placement under its field.',
  });

  // ---- Links (public/style.css) ----
  F.push({
    id: 'links', group: 'Controls', name: 'Links',
    desc: 'Text that goes somewhere. Not a system.css family: the plain link and these looks are public/style.css\'s.',
    variants: [
      { n: 'Link, app', ctx: 'app', sel: 'a', html: '<a href="#">Forgot the password</a>', states: ['hover', 'focus'] },
      { n: 'Link, module', ctx: 'host', sel: 'a', html: '<a href="#">Open in the map</a>', states: ['hover', 'focus'] },
      { n: 'Link-like button .linklike', ctx: 'app', sel: '.linklike', html: '<button type="button" class="linklike">Show the key</button>', states: ['hover', 'focus'] },
      { n: 'Setup link .setup-link', ctx: 'app', sel: '.setup-link', html: '<a class="setup-link" href="#">' + fa('arrow-up-right-from-square') + ' Open the page</a>', states: ['hover', 'focus'] },
      { n: 'Crumb .crumb (the top bar\'s left)', ctx: 'app', sel: '.crumb', html: '<div class="topbar" style="position:static;min-height:0;padding:4px 8px"><span class="crumb"><a class="crumb-link nav-text" href="#">Lisbon</a><span class="crumb-sep">/</span><span class="crumb-here nav-text">Plan</span></span></div>' },
    ],
  });

  // ---- Call buttons (public/style.css) ----
  F.push({
    id: 'call-controls', group: 'Controls', name: 'Call buttons',
    desc: 'The call\'s round buttons (<code>.fbtn</code>) and the top bar\'s icon links (<code>.icon-link</code>). Not a system.css family: public/style.css draws them. A real call needs LiveKit, which this page does not have.',
    variants: [
      { n: 'Call button .fbtn', ctx: 'app', sel: '.fbtn', html: '<div class="fbtn-wrap"><button class="fbtn" type="button" aria-label="Microphone"><span class="glyph"><i class="fa-solid fa-microphone fa-fw icon-on" aria-hidden="true"></i><i class="fa-solid fa-microphone-slash fa-fw icon-off" aria-hidden="true"></i></span></button><button class="fbtn-caret" type="button" aria-label="Microphone settings">' + fa('chevron-down') + '</button></div>', target: '.fbtn', states: ['hover', 'focus', 'active', { n: 'Off (muted)', cls: 'off' }] },
      { n: 'The row', ctx: 'app', sel: '.fbtn', html: row(['microphone', 'volume-high', 'video'].map((n) => `<button class="fbtn" type="button" aria-label="${n}"><span class="glyph">${fa(n, 'fa-fw')}</span></button>`).join('') + '<button class="fbtn" type="button" aria-label="Leave the call"><span class="glyph">' + fa('phone', 'fa-fw') + '</span></button>') },
      { n: 'Top bar icon link .icon-link', ctx: 'app', sel: '.icon-link', html: '<div class="topbar" style="position:static;min-height:0;padding:4px 8px"><button type="button" class="icon-link" aria-label="Notifications">' + fa('bell', 'fa-fw') + '</button><button type="button" class="icon-link on" aria-label="Chat">' + fa('comments', 'fa-fw') + '</button></div>', target: '.icon-link', states: ['hover', 'focus'] },
    ],
  });
})();
