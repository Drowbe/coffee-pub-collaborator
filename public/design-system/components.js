/* The design system page's components, part 1: controls. Each family lists the looks that exist today, copied from the real
   markup (`sel` is the selector the page finds the file and line for). `ctx` says which stylesheets the look has: 'app'
   (public/style.css), 'host' (public/sdk/host.css) or 'mod:<id>' (host.css and that module's own). `states` are forced from the
   stylesheet's own rules. Nothing here is a style: only markup, names and where a look is used. */
window.DS_FAMILIES = window.DS_FAMILIES || [];
window.DS_NOT_MOUNTED = window.DS_NOT_MOUNTED || [];
(() => {
  const fa = (n, extra) => `<i class="fa-solid fa-${n}${extra ? ' ' + extra : ''}" aria-hidden="true"></i>`;
  window.DSH = { fa };
  const F = window.DS_FAMILIES;
  const mod = (id) => 'mod:' + id;

  // ---- Buttons ----
  F.push({
    id: 'buttons', group: 'Controls', name: 'Buttons',
    desc: 'The text button: .btn, with .btn-primary and .btn-danger. The app and a module page each carry their own .btn; modules then resize it.',
    dup: 'The app\'s .btn (7px 12px, a press shift, no-wrap) and the module .btn (6px 12px) are two rule sets. .btn-small, .btn-accent, .btn.on and .btn.off exist only in the app. Seven modules resize .btn themselves (about 20 rules). .sdk-btn (the form\'s) is a fourth.',
    dupCount: 5,
    variants: [
      { n: 'Button', ctx: 'app', sel: '.btn', note: 'Used by every app page.', html: '<button type="button" class="btn">Cancel</button>', states: ['hover', 'focus', 'active', 'disabled'] },
      { n: 'Primary', ctx: 'app', sel: '.btn-primary', html: '<button type="button" class="btn btn-primary">Save</button>', states: ['hover', 'focus', 'active', 'disabled'] },
      { n: 'Accent (the pop-out join on a space card)', ctx: 'app', sel: '.btn-accent', html: '<button type="button" class="btn btn-accent">Join</button>', states: ['hover'] },
      { n: 'Danger (an outline in --danger)', ctx: 'app', sel: '.btn-danger', html: '<button type="button" class="btn btn-danger">Delete</button>', states: ['hover', 'disabled'] },
      { n: 'On (a toggled button)', ctx: 'app', sel: '.btn.on', html: '<button type="button" class="btn on" aria-pressed="true">Muted</button>' },
      { n: 'Off (a danger outline)', ctx: 'app', sel: '.btn.off', html: '<button type="button" class="btn off">Away</button>' },
      { n: 'Small (the action bar, the nav bar\'s labelled look)', ctx: 'app', sel: '.btn-small', note: 'public/action-bar.js, public/nav-bar.js, Manage. Not in host.css: in a module it does nothing.', html: '<div style="display:flex;gap:8px"><button type="button" class="btn btn-small btn-primary">Save</button><button type="button" class="btn btn-small">Cancel</button><button type="button" class="btn btn-small btn-danger">Discard</button></div>', target: '.btn' },
      { n: 'Nav text button (.btn.nav-text in the top bar)', ctx: 'app', sel: '.btn.nav-text', html: '<div class="topbar" style="position:static;min-height:0;padding:4px 8px"><button type="button" class="btn btn-small nav-text">Invite</button></div>', target: '.btn' },
      { n: 'Button', ctx: 'host', sel: '.btn', note: 'The base of every module page.', html: '<button type="button" class="btn">Cancel</button>', states: ['hover', 'focus', 'active', 'disabled'] },
      { n: 'Primary', ctx: 'host', sel: '.btn-primary', html: '<button type="button" class="btn btn-primary">Save</button>', states: ['hover', 'disabled'] },
      { n: 'Danger', ctx: 'host', sel: '.btn-danger', html: '<button type="button" class="btn btn-danger">Delete</button>', states: ['hover'] },
      { n: 'Small, where a module uses it (Polls, Stream)', ctx: 'host', html: '<button type="button" class="btn btn-small">Edit</button>', note: 'polls.html:33 and stream.html:41-43 write .btn-small; the module base has no rule for it, so it looks like .btn.' },
      { n: 'Form button .sdk-btn (38px)', ctx: 'host', sel: '.sdk-btn', note: 'The form standard\'s text button; it sits in a field\'s line, or alone.', html: '<div style="display:flex;gap:8px"><button type="button" class="sdk-btn">Find</button><button type="button" class="sdk-btn primary">Save</button></div>', target: '.sdk-btn', states: ['hover', 'focus', 'disabled'] },
      { n: 'Budget: target header and empty state', ctx: mod('budget'), sel: '.target-head .btn', html: '<div class="target-head" style="display:flex"><button type="button" class="btn"><span class="ic">' + fa('pen') + '</span> <span>Edit target</span></button></div>' },
      { n: 'Maps: banner and callout', ctx: mod('maps'), sel: '.callout-actions .btn', html: '<div class="callout-actions" style="display:flex;gap:8px"><a class="btn" href="#">' + fa('arrow-up-right-from-square') + ' Open in Maps</a><button type="button" class="btn btn-primary">' + fa('plus') + ' Save place</button></div>' },
      { n: 'Places: found row, part head', ctx: mod('places'), sel: '.found-row .btn', html: '<div class="found-row" style="display:flex"><button type="button" class="btn">' + fa('plus') + ' Add</button></div>' },
      { n: 'Research: with a button', ctx: mod('research'), sel: '.with-button .btn', html: '<div class="with-button" style="display:flex"><button type="button" class="btn">' + fa('wand-magic-sparkles') + ' Ask</button></div>' },
      { n: 'Planner: add row, suggestion, dashed edge button', ctx: mod('travel'), sel: '.add-row .btn', html: '<div class="add-row" style="display:flex;gap:8px"><button type="button" class="btn">Add</button></div><div class="dayedge" style="margin-top:8px"><button type="button" class="btn">' + fa('plus') + ' Add a day</button></div>' },
      { n: 'To-do: quick add (full width)', ctx: mod('todo'), sel: '.quick .btn', html: '<div class="quick" style="width:260px"><button type="button" class="btn">Add</button></div>' },
    ],
  });

  // ---- Icon buttons ----
  F.push({
    id: 'icon-buttons', group: 'Controls', name: 'Icon buttons',
    desc: 'A button that is only an icon: .sdk-icon-btn (Secondary, Primary or Quiet; regular or small), and the call\'s round buttons.',
    dup: 'Six icon-button families plus module copies, now one: .sdk-icon-btn.',
    dupCount: 7,
    variants: [
      { n: 'Icon button .sdk-icon-btn', ctx: 'app', sel: '.sdk-icon-btn', note: 'The chat\'s Send, a module\'s bottom buttons.', html: '<div style="display:flex;gap:8px"><button type="button" class="sdk-icon-btn" aria-label="Add">' + fa('plus') + '</button><button type="button" class="sdk-icon-btn btn-primary" aria-label="Send">' + fa('paper-plane') + '</button></div>', target: '.sdk-icon-btn', states: ['hover', 'focus', 'active', 'disabled'] },
      { n: 'Icon button, sizes', ctx: 'app', sel: '.sdk-icon-btn', html: '<div style="display:flex;gap:8px;align-items:center"><button type="button" class="sdk-icon-btn btn-small" aria-label="Small">' + fa('plus') + '</button><button type="button" class="sdk-icon-btn" aria-label="Regular">' + fa('plus') + '</button></div>' },
      { n: 'Icon button, in a module', ctx: 'host', sel: '.sdk-icon-btn', html: '<div style="display:flex;gap:8px"><button type="button" class="sdk-icon-btn" aria-label="Add">' + fa('plus') + '</button><button type="button" class="sdk-icon-btn btn-primary" aria-label="Save">' + fa('check') + '</button></div>', target: '.sdk-icon-btn', states: ['hover', 'disabled'] },
      { n: 'Call button .fbtn (round, on the call toolbar)', ctx: 'app', sel: '.fbtn', note: 'Visuals only; checked in a real call.', html: '<div class="fbtn-wrap"><button class="fbtn" type="button" aria-label="Microphone"><span class="glyph"><i class="fa-solid fa-microphone fa-fw icon-on" aria-hidden="true"></i><i class="fa-solid fa-microphone-slash fa-fw icon-off" aria-hidden="true"></i></span></button><button class="fbtn-caret" type="button" aria-label="Microphone settings"><i class="fa-solid fa-chevron-down" aria-hidden="true"></i></button></div>', target: '.fbtn', states: ['hover', 'focus', 'active', 'on', { n: 'Off (muted)', cls: 'off' }] },
      { n: 'Call button, leave', ctx: 'app', sel: '.fbtn', html: '<button class="fbtn danger" type="button" aria-label="Leave the call"><span class="glyph"><i class="fa-solid fa-phone fa-fw" aria-hidden="true"></i></span></button>', states: ['hover'] },
      { n: 'More button, quiet small .sdk-icon-btn', ctx: 'host', sel: '.sdk-icon-btn', note: 'From host.ui.moreButton.', html: '<button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="More" aria-haspopup="menu">' + fa('ellipsis-vertical') + '</button>', states: ['hover', 'focus'] },
      { n: 'Close button, Maps and Research', ctx: mod('maps'), sel: '.sdk-icon-btn', html: '<button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Close">' + fa('xmark') + '</button>', states: ['hover'] },
      { n: 'Close button, Research', ctx: mod('research'), sel: '.sdk-icon-btn', html: '<button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Close">' + fa('xmark') + '</button>', states: ['hover'] },
      { n: 'Editor close .sdk-editor-close', ctx: 'host', sel: '.sdk-editor-close', html: '<div style="position:relative;height:40px;width:60px"><button type="button" class="sdk-editor-close" aria-label="Close" style="right:8px">' + fa('xmark') + '</button></div>', target: '.sdk-editor-close', states: ['hover', 'focus'] },
      { n: 'Message buttons (chat)', ctx: 'app', sel: '.sdk-icon-btn', html: '<div style="display:flex;gap:4px"><button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Reply">' + fa('reply') + '</button><button type="button" class="sdk-icon-btn btn-quiet btn-small on" aria-label="Keep">' + fa('bookmark') + '</button></div>', target: '.sdk-icon-btn', states: ['hover', { n: 'Disabled', attrs: { 'aria-disabled': 'true' } }] },
      { n: 'Module toolbar button (.btn.btn-small)', ctx: 'app', sel: '.btn-small', note: 'Drawn by the host for host.ui.toolbarButton.', html: '<div style="display:flex;gap:8px"><button type="button" class="btn btn-small">' + fa('tag') + ' Tags</button><button type="button" class="btn btn-small on" aria-pressed="true">' + fa('filter') + ' Filter</button></div>', target: '.btn-small', states: ['hover', 'disabled'] },
      { n: 'Icon link .icon-link (the top bar)', ctx: 'app', sel: '.icon-link', html: '<div class="topbar" style="position:static;min-height:0;padding:4px 8px"><button type="button" class="icon-link" aria-label="Notifications">' + fa('bell', 'fa-fw') + '</button><button type="button" class="icon-link on" aria-label="Chat">' + fa('comments', 'fa-fw') + '</button></div>', target: '.icon-link', states: ['hover', 'focus'] },
      { n: 'Call buttons .fbtn, the toolbar row', ctx: 'app', sel: '.fbtn', html: '<div style="display:flex;gap:8px;align-items:center">' + ['microphone', 'video', 'display', 'volume-high'].map((n) => `<button class="fbtn" type="button" aria-label="${n}"><span class="glyph">${fa(n, 'fa-fw')}</span></button>`).join('') + '</div>' },
    ],
  });

  // ---- Links ----
  F.push({
    id: 'links', group: 'Controls', name: 'Links',
    desc: 'Text that goes somewhere: the plain link, the quiet link-like button, the top bar\'s links, the crumb.',
    dup: 'The plain link, .linklike, .setup-link and the nav links are each their own rule set.',
    variants: [
      { n: 'Link, app', ctx: 'app', sel: 'a', html: '<a href="#">Forgot the password</a>', states: ['hover', 'focus'] },
      { n: 'Link, module', ctx: 'host', sel: 'a', html: '<a href="#">Open in the map</a>', states: ['hover', 'focus'] },
      { n: 'Link-like button .linklike', ctx: 'app', sel: '.linklike', html: '<button type="button" class="linklike">Show the key</button>', states: ['hover', 'focus'] },
      { n: 'Setup link .setup-link', ctx: 'app', sel: '.setup-link', html: '<a class="setup-link" href="#">' + fa('arrow-up-right-from-square') + ' Open the page</a>', states: ['hover', 'focus'] },
      { n: 'Top bar core link .core-link', ctx: 'app', sel: '.core-link', note: 'The nav registry\'s core look (public/nav-bar.js).', html: '<div class="topbar" style="position:static;min-height:0;padding:4px 8px"><a class="core-link" href="#">' + fa('house', 'fa-fw') + '<span>Trips</span></a><a class="core-link" href="#" aria-current="page"><span>Spaces</span></a></div>', target: '.core-link', states: ['hover', 'focus'] },
      { n: 'Crumb .crumb (the left zone of the top bar)', ctx: 'app', sel: '.crumb', html: '<div class="topbar" style="position:static;min-height:0;padding:4px 8px"><span class="crumb"><a class="crumb-link nav-text" href="#">Lisbon</a><span class="crumb-sep">/</span><span class="crumb-here nav-text">Plan</span></span></div>' },
    ],
  });

  // ---- Fields ----
  const textField = (label, extra = '') => `<label class="sdk-field"><span class="sdk-label">${label}</span><input type="text" value="Flight to Lisbon"${extra}><span class="sdk-hint"></span></label>`;
  F.push({
    id: 'fields', group: 'Controls', name: 'Fields: text, select, text area',
    desc: 'The box a person types in. The form standard (.sdk-form) is the one to use; the others are what the app pages and modules still draw.',
    dup: 'Six field looks: the bare module field, .sdk-form, the app\'s .panel and .fields, .setup-field, .ai-fields and each module\'s .editor-card (restated in seven modules).',
    dupCount: 6,
    variants: [
      { n: 'Form standard .sdk-form', ctx: 'host', sel: '.sdk-form', wide: true, html: '<form class="sdk-form" onsubmit="return false"><div class="sdk-form-row">' + textField('Title') + '<label class="sdk-field"><span class="sdk-label">Class</span><select><option>Economy</option><option>Business</option></select><span class="sdk-hint"></span></label></div><label class="sdk-field sdk-full"><span class="sdk-label">Notes</span><textarea rows="3"></textarea><span class="sdk-hint">A short hint under the field.</span></label></form>', target: 'input', states: [{ n: 'Focus', force: 'focus' }, { n: 'Disabled', attrs: { disabled: '' } }, { n: 'Error', html: '<form class="sdk-form" onsubmit="return false"><label class="sdk-field"><span class="sdk-label">Title</span><input type="text" aria-invalid="true" value=""><span class="sdk-error">Enter a title.</span></label></form>' }] },
      { n: 'Bare module field (host.css base)', ctx: 'host', sel: 'input', html: '<div style="display:flex;gap:8px"><input type="text" value="Louvre"><select><option>Economy</option></select><textarea rows="2">Notes</textarea></div>', target: 'input', states: [{ n: 'Focus', force: 'focus' }, { n: 'Disabled', attrs: { disabled: '' } }] },
      { n: '.panel and .fields (sign in, Manage)', ctx: 'app', sel: '.panel label', html: '<div class="panel" style="margin:0;max-width:none"><label>Display name<input type="text" value="Thomas"></label><label>Role<select><option>Member</option></select></label><label>About<textarea rows="2"></textarea></label></div>', target: 'input', states: [{ n: 'Focus', force: 'focus' }] },
      { n: 'Setup field .setup-field (space settings)', ctx: 'app', sel: '.setup-field', html: '<label class="setup-field"><span class="field-label">Name</span><input type="text" value="Lisbon, October"></label>', target: 'input', states: [{ n: 'Focus', force: 'focus' }] },
      { n: 'AI fields .ai-fields (AI settings)', ctx: 'app', sel: '.ai-fields', html: '<div class="ai-fields" style="margin:0"><label>Service address<input type="url" value="https://api.example.com"></label><label>Model<select><option>default</option></select></label></div>', target: 'input' },
      { n: 'Editor card (Budget, Places, Research, Calendar, Polls, To-do)', ctx: mod('places'), sel: '.editor-card', html: '<div class="editor-card"><h3>Add a place</h3><label>Name<input type="text" value="Louvre"></label><label>Notes<textarea rows="2"></textarea></label><label class="check"><input type="checkbox" checked> Booked</label></div>', target: 'input', states: [{ n: 'Focus', force: 'focus' }] },
      { n: 'Editor card, Maps (its own box)', ctx: mod('maps'), sel: '.editor-card', html: '<div class="editor-card"><h3>New pin</h3><label>Name<input type="text" value="Cafe"></label></div>' },
      { n: 'Error line .error (module)', ctx: mod('places'), sel: '.error', note: 'Restated in 8 modules; Stream\'s is a fixed #e07a5f.', html: '<p class="error">Could not save. Try again.</p>' },
      { n: 'Error line .error, Stream', ctx: mod('stream'), sel: '.error', html: '<p class="error">Could not connect.</p>' },
      { n: 'Field error .sdk-error and form error', ctx: 'host', sel: '.sdk-error', html: '<div class="sdk-form"><span class="sdk-error">Enter a number.</span><div class="sdk-form-error">The save did not work.</div></div>' },
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
  F.push({
    id: 'pickers', group: 'Controls', name: 'Pickers: date, kind, currency',
    desc: 'The SDK\'s own pieces: the date picker\'s month grid, the kind picker\'s field and list, and the currency list. Shown here as markup (a real one is mounted in the Live SDK section).',
    variants: [
      { n: 'Date picker month .sdk-dp', ctx: 'host', sel: '.sdk-dp', static: true, note: 'Today is a fill; a chosen day is the accent; a range is a tint. The real one is placed fixed under its field.', html: '<div class="sdk-dp"><div class="sdk-dp-head"><button type="button" aria-label="Earlier">' + fa('chevron-left') + '</button><strong>October 2026</strong><button type="button" aria-label="Later">' + fa('chevron-right') + '</button></div><div class="sdk-dp-grid">' + dpDays() + '</div><div class="sdk-dp-foot"><button type="button">Today</button><button type="button">Clear</button></div></div>' },
      { n: 'Date field .sdk-datefield', ctx: 'host', sel: '.sdk-datefield', wide: true, html: '<form class="sdk-form"><div class="sdk-field" role="group" aria-labelledby="dsl1"><span class="sdk-label" id="dsl1">Departure day</span><div class="sdk-datefield sdk-group"><input type="date" value="2026-10-09" aria-labelledby="dsl1"><button type="button" class="sdk-icon-btn btn-small btn-quiet" aria-label="Open the calendar">' + fa('calendar') + '</button></div><span class="sdk-hint">Fri</span></div></form>' },
      { n: 'Kind picker field .sdk-kind', ctx: 'host', sel: '.sdk-kind', wide: true, html: '<div class="sdk-kind"><div class="sdk-kind-sheet"><div class="sdk-kind-field"><span class="sdk-kind-chip" style="--kind-color:#c47a2c">' + fa('landmark') + '</span><input class="sdk-kind-input" value="Sight" aria-label="What is it"><span class="sdk-kind-chevron">' + fa('chevron-down') + '</span></div></div></div>', target: '.sdk-kind-field', states: [{ n: 'Focus', force: 'focus' }] },
      { n: 'Kind picker list .sdk-kind-list', ctx: 'host', sel: '.sdk-kind-list', static: true, html: '<ul class="sdk-kind-list" role="listbox"><li class="sdk-kind-group"><div class="sdk-kind-group-title">Places</div><div class="sdk-kind-option active" style="--kind-color:#c47a2c"><span class="sdk-kind-icon">' + fa('landmark') + '</span><span class="sdk-kind-name">Sight</span></div><div class="sdk-kind-option" aria-selected="true" style="--kind-color:#2c7ac4"><span class="sdk-kind-icon">' + fa('utensils') + '</span><span class="sdk-kind-name">Food and drink</span></div></li><li class="sdk-kind-group"><div class="sdk-kind-group-title">Getting about</div><div class="sdk-kind-option" style="--kind-color:#7a2cc4"><span class="sdk-kind-icon">' + fa('plane') + '</span><span class="sdk-kind-name">Flight</span></div></li></ul>' },
      { n: 'Currency select (a plain select in a form)', ctx: 'host', sel: '.sdk-form', wide: true, html: '<form class="sdk-form"><label class="sdk-field sdk-m"><span class="sdk-label">Currency</span><select><optgroup label="Common"><option>USD</option><option>EUR</option></optgroup><optgroup label="All currencies"><option>Australian dollar</option></optgroup></select><span class="sdk-hint"></span></label></form>' },
    ],
    notMounted: 'the kind picker\'s phone sheet (it is fixed to the screen) and the date picker\'s placement.',
  });

  // ---- Choices ----
  F.push({
    id: 'choices', group: 'Controls', name: 'Tick boxes, choices and switches',
    desc: 'Yes or no, one of a few, several of a few.',
    dup: 'A switch exists only in the app (input.switch); a module wanting one writes a tick box with role="switch". Tick rows are drawn four ways.',
    dupCount: 4,
    variants: [
      { n: 'Tick row .sdk-choice-row', ctx: 'host', sel: '.sdk-choice-row', wide: true, html: '<form class="sdk-form"><div class="sdk-choice-list"><label class="sdk-choice-row"><input type="checkbox" checked><span class="sdk-choice-text"><span class="sdk-choice-label">Round trip</span></span></label><label class="sdk-choice-row"><input type="checkbox"><span class="sdk-choice-text"><span class="sdk-choice-label">Booked</span></span></label><label class="sdk-choice-row"><input type="checkbox" disabled><span class="sdk-choice-text"><span class="sdk-choice-label">Locked</span></span></label></div></form>' },
      { n: 'One of a few, radio rows', ctx: 'host', sel: '.sdk-choice-row', html: '<div class="sdk-choice-list"><label class="sdk-choice-row"><input type="radio" name="c1" checked><span class="sdk-choice-text"><span class="sdk-choice-label">Day</span></span></label><label class="sdk-choice-row"><input type="radio" name="c1"><span class="sdk-choice-text"><span class="sdk-choice-label">Week</span></span></label><label class="sdk-choice-row"><input type="radio" name="c1"><span class="sdk-choice-text"><span class="sdk-choice-label">Month</span></span></label></div>', target: 'label:nth-child(2)', states: ['hover'] },
      { n: 'People as chips .sdk-people', ctx: 'host', sel: '.sdk-people', html: '<div class="sdk-people"><label><input type="checkbox" checked> Ana</label><label><input type="checkbox"> Ben</label><label><input type="checkbox"> Chi</label></div>' },
      { n: 'Switch row (.sdk-choice-row with .sdk-switch)', ctx: 'app', sel: 'input.sdk-switch', note: 'Space settings and Manage.', html: '<div class="sdk-choice-list"><label class="sdk-choice-row"><span class="sdk-choice-text"><span class="sdk-choice-label">Published calendar</span></span><input type="checkbox" class="sdk-switch" role="switch" checked></label><label class="sdk-choice-row"><span class="sdk-choice-text"><span class="sdk-choice-label">Private addresses</span></span><input type="checkbox" class="sdk-switch" role="switch"></label></div>', target: 'input', states: ['focus', 'disabled'] },
      { n: 'Switch row, module list', ctx: 'app', sel: '.sdk-choice-row', html: '<div class="sdk-choice-list"><label class="sdk-choice-row"><span class="sdk-choice-text"><span class="sdk-choice-label">Calendar</span><span class="sdk-choice-desc">on</span></span><input type="checkbox" class="sdk-switch" role="switch" checked></label><label class="sdk-choice-row"><span class="sdk-choice-text"><span class="sdk-choice-label">Chat</span><span class="sdk-choice-desc">always on</span></span><input type="checkbox" class="sdk-switch" role="switch" checked disabled></label></div>', target: '.sdk-choice-row', states: ['hover'] },
      { n: 'Light and dark switch .theme-mode', ctx: 'app', sel: '.theme-mode', html: '<button type="button" class="theme-mode" role="switch" aria-checked="false" aria-label="Dark mode"><i class="fa-solid fa-sun" aria-hidden="true"></i><span class="theme-mode-track"><span class="theme-mode-knob"></span></span><i class="fa-solid fa-moon" aria-hidden="true"></i></button>', states: ['focus', { n: 'On', attrs: { 'aria-checked': 'true' } }] },
      { n: 'Tick box, app', ctx: 'app', sel: '.sdk-choice-row', html: '<div class="panel sdk-choice-list" style="margin:0"><label class="sdk-choice-row"><input type="checkbox" checked> Keep me signed in</label><label class="sdk-choice-row"><input type="radio" name="r" checked> Member</label></div>' },
      { n: 'Tick box, editor window (modules)', ctx: mod('calendar'), sel: '.sdk-choice-row', html: '<div class="sdk-choice-list"><label class="sdk-choice-row"><input type="checkbox" checked> All day</label></div>' },
      { n: 'Tick rows, Places', ctx: mod('places'), sel: '.sdk-choice-row', html: '<div class="sdk-choice-list"><label class="sdk-choice-row"><input type="checkbox"> Show on the map</label><label class="sdk-choice-row"><input type="checkbox" disabled> Only saved</label></div>' },
    ],
  });

  // ---- Forms and editor windows ----
  const formBody = `<label class="sdk-field sdk-full"><span class="sdk-label">Name</span><input type="text" value="Louvre"><span class="sdk-hint"></span></label>
    <div class="sdk-form-row"><label class="sdk-field sdk-m"><span class="sdk-label">Day</span><input type="date" value="2026-10-12"><span class="sdk-hint">Mon</span></label><label class="sdk-field sdk-s"><span class="sdk-label">Time</span><input type="time" value="10:30"><span class="sdk-hint"></span></label>
    <div class="sdk-field sdk-m" role="group" aria-labelledby="dsl2"><span class="sdk-label" id="dsl2">Length</span><div class="sdk-group sdk-duration"><input type="text" inputmode="numeric" value="2" aria-label="Hours"><span class="sdk-unit">h</span><input type="text" inputmode="numeric" value="30" aria-label="Minutes"><span class="sdk-unit">min</span></div><span class="sdk-hint"></span></div></div>
    <div class="sdk-pair"><label class="sdk-field"><span class="sdk-label">From</span><input type="text" value="Lisbon"><span class="sdk-hint"></span></label><span class="sdk-pair-arrow">${fa('arrow-right')}</span><label class="sdk-field"><span class="sdk-label">To</span><input type="text" value="Porto"><span class="sdk-hint"></span></label></div>
    <fieldset class="sdk-section"><legend class="sdk-section-title">Details</legend><div class="sdk-checks"><label class="sdk-check"><input type="checkbox" checked> Booked</label></div><label class="sdk-field sdk-full"><span class="sdk-label">Notes</span><textarea rows="2"></textarea><span class="sdk-hint"></span></label></fieldset>`;
  F.push({
    id: 'forms', group: 'Controls', name: 'Form standard and editor window',
    desc: 'The form standard (.sdk-form, plan-form-standard.md) and the editor window (.sdk-editor, host.ui.editor) it sits in. Only the Planner\'s forms use the standard so far; the other modules still use their own .editor-card.',
    variants: [
      { n: 'The form standard, every block', ctx: 'host', sel: '.sdk-form', wide: true, html: '<form class="sdk-form" onsubmit="return false">' + formBody + '</form>' },
      { n: 'Editor window .sdk-editor (560px)', ctx: 'host', sel: '.sdk-editor', static: true, wide: true, note: 'A &lt;dialog&gt; opened modal in the real thing; here open and in the page. Close and the button row are the SDK\'s and the module\'s.', html: '<dialog class="sdk-editor" open style="display:block;margin:0 auto" aria-label="Add a place"><div class="sdk-editor-corner"><button type="button" class="sdk-editor-close" aria-label="Close">' + fa('xmark') + '</button></div><div class="sdk-editor-body"><form class="sdk-form" onsubmit="return false">' + formBody + '</form></div><div class="sdk-editor-actions"><button type="button" class="btn btn-primary">Save</button><button type="button" class="btn">Cancel</button></div></dialog>' },
      { n: 'Editor window, discard row .sdk-editor-discard', ctx: 'host', sel: '.sdk-editor-discard', static: true, wide: true, html: '<dialog class="sdk-editor" open style="display:block;margin:0 auto"><div class="sdk-editor-body" style="padding:12px 0">A short form</div><div class="sdk-editor-discard"><span class="sdk-editor-discard-text">Discard your changes?</span><button type="button" class="btn">Keep editing</button><button type="button" class="btn btn-danger">Discard</button></div></dialog>' },
      { n: 'Action bar .action-bar (app pages)', ctx: 'app', sel: '.action-bar', wide: true, html: '<div class="action-bar" style="position:static"><span class="action-bar-status">3 unsaved changes</span><div class="action-bar-buttons"><button type="button" class="btn btn-small action-bar-cancel">Cancel</button><button type="button" class="btn btn-small btn-primary action-bar-save">Save</button></div></div>' },
      { n: 'App panel form (sign in)', ctx: 'app', sel: '.panel', wide: true, html: '<div class="panel" style="margin:0 auto"><h1>Sign in</h1><label>Name<input type="text" value="admin"></label><label>Password<input type="password" value="secret"></label><button type="button" class="btn btn-primary">Sign in</button><p class="hint">A hint under the form.</p></div>' },
    ],
  });
})();
