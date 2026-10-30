/* The Design System page's catalog, part 3: feedback (toasts and banners, tooltips, empty and loading states, progress) and
   content (chips, avatars, chat messages, the journey, the calendar, markers, day cards), then the live SDK pieces (window.DS_LIVE:
   the real public/sdk/host.js mounts them; ds.js draws them) and what this page cannot mount. How a family is written: components.js. */
window.DS_FAMILIES = window.DS_FAMILIES || [];
window.DS_NOT_MOUNTED = window.DS_NOT_MOUNTED || [];
(() => {
  const { fa } = window.DSH;
  const F = window.DS_FAMILIES;
  const row = (inner, gap = 8) => `<div style="display:flex;flex-wrap:wrap;align-items:center;gap:${gap}px">${inner}</div>`;

  // ---- Toasts and banners ----
  const toast = (kind, icon, title, text, extra = '') => `<div class="sdk-toast" data-kind="${kind}" role="status"><span class="sdk-toast-icon" aria-hidden="true">${fa(icon)}</span><div class="sdk-toast-body"><span class="sdk-toast-title">${title}</span>${text ? `<span class="sdk-toast-text">${text}</span>` : ''}</div><div class="sdk-toast-end"><button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Close">${fa('xmark')}</button></div>${extra}</div>`;
  const banner = (kind, icon, text, action) => `<div class="sdk-banner" data-kind="${kind}" role="status"><span class="sdk-banner-icon" aria-hidden="true">${fa(icon)}</span><span class="sdk-banner-text">${text}</span>${action ? `<button type="button" class="btn btn-small sdk-banner-action">${action}</button>` : ''}<button type="button" class="sdk-icon-btn btn-quiet btn-small sdk-banner-close" aria-label="Close">${fa('xmark')}</button></div>`;
  F.push({
    id: 'toasts', group: 'Feedback', name: 'Toasts and banners',
    desc: 'A toast is <code>.sdk-toast</code> in the one stack <code>.sdk-toasts</code> (public/brand.js; a module asks with <code>host.ui.toast</code>): <code>.sdk-toast-icon</code>, <code>.sdk-toast-body</code> (<code>.sdk-toast-title</code>, <code>.sdk-toast-text</code>), <code>.sdk-toast-end</code>, <code>.sdk-toast-actions</code>. A banner is <code>.sdk-banner</code> across the top of a page or module (<code>.sdk-banner-wide</code> the full width). The kind is <code>data-kind</code>: info (the default), ok, warn, danger.',
    variants: [
      { wide: true, n: 'Toasts, each kind', ctx: 'app', sel: '.sdk-toast', html: '<div class="sdk-toasts" style="position:static;pointer-events:auto">' + toast('info', 'circle-info', 'Saved in Places.') + toast('ok', 'circle-check', 'Ben joined the call') + toast('warn', 'triangle-exclamation', 'The map is still loading', 'It may take a minute.') + toast('danger', 'circle-xmark', 'Could not save', 'Check the connection and try again.') + '</div>' },
      { wide: true, n: 'With actions', ctx: 'app', sel: '.sdk-toast-actions', html: '<div class="sdk-toasts" style="position:static;pointer-events:auto">' + toast('info', 'comments', 'Ana', 'Shall we book the train?', '<div class="sdk-toast-actions"><button type="button" class="btn btn-small">Open the chat</button></div>') + '</div>' },
      { n: 'Banners .sdk-banner', ctx: 'app', sel: '.sdk-banner', wide: true, html: '<div style="display:grid;gap:8px">' + banner('info', 'circle-info', 'This space is shared with <b>4 people</b>.') + banner('warn', 'triangle-exclamation', 'You are offline. Changes are saved when you are back.', 'Try again') + banner('danger', 'circle-xmark', 'The module could not start.', 'Reload') + banner('ok', 'circle-check', 'Everything is up to date.') + '</div>' },
      { n: 'In a module', ctx: 'host', sel: '.sdk-banner', wide: true, html: banner('warn', 'triangle-exclamation', 'The flight lookup is not set up.', 'Set it up') },
    ],
  });

  // ---- Tooltips ----
  F.push({
    id: 'tooltips', group: 'Feedback', name: 'Tooltips',
    desc: 'One tooltip, drawn by public/tooltip.js for any control with <code>data-tip</code> (and <code>data-tip-keys</code> for a shortcut, shown as <code>kbd</code>): <code>.sdk-tooltip</code>, placed above, below or beside, with its arrow. <code>.sdk-truncate</code> cuts a line with an ellipsis; with <code>data-tip-if-truncated</code> the whole shows as a tooltip. Here they are drawn in place and shown.',
    variants: [
      { n: 'Above and below', ctx: 'app', sel: '.sdk-tooltip', html: row('<div class="sdk-tooltip" data-show data-arrow data-placement="top" style="position:relative;margin-top:8px">Microphone <kbd>M</kbd></div><div class="sdk-tooltip" data-show data-arrow data-placement="bottom" style="position:relative">Open as a window</div><div class="sdk-tooltip" data-show style="position:relative;max-width:200px">A longer tooltip wraps at its width and stays short.</div>', 24) },
      { n: 'A cut line .sdk-truncate', ctx: 'app', sel: '.sdk-truncate', html: '<p class="sdk-truncate" style="max-width:220px" data-tip-if-truncated>Packing list for the long weekend in the mountains</p>' },
    ],
  });

  // ---- States ----
  F.push({
    id: 'states', group: 'Feedback', name: 'Empty, loading and error states',
    desc: 'Nothing yet is <code>.sdk-empty</code> (an icon, <code>.sdk-empty-title</code>, <code>.sdk-empty-text</code>, <code>.sdk-empty-actions</code>; <code>data-kind="error"</code> when it failed); in a small place, one line: <code>.sdk-empty-line</code>. Loading is the one skeleton, <code>.sdk-skel</code> (<code>-line</code>, <code>-title</code>, <code>-dot</code>, <code>-block</code>, laid out with <code>-row</code>, <code>-stack</code>, <code>-card</code>, <code>-list</code>, <code>-grid</code>), or the spinner <code>.sdk-spinner</code> (<code>-sm</code>, <code>-lg</code>).',
    variants: [
      { wide: true, n: 'Empty .sdk-empty', ctx: 'app', sel: '.sdk-empty', html: '<div class="sdk-empty">' + fa('inbox') + '<p class="sdk-empty-title">Nothing here yet</p><p class="sdk-empty-text">Add the first place with New.</p><div class="sdk-empty-actions"><button type="button" class="btn btn-primary">' + fa('plus') + ' New</button></div></div>' },
      { wide: true, n: 'Failed', ctx: 'app', sel: '.sdk-empty[data-kind="error"]', html: '<div class="sdk-empty" data-kind="error">' + fa('triangle-exclamation') + '<p class="sdk-empty-title">Could not load the calendar</p><p class="sdk-empty-text">Check the connection.</p><div class="sdk-empty-actions"><button type="button" class="btn">Try again</button></div></div>' },
      { wide: true, n: 'One line .sdk-empty-line', ctx: 'app', sel: '.sdk-empty-line', html: '<div style="display:grid;gap:8px;max-width:420px"><div class="sdk-empty-line">' + fa('magnifying-glass') + ' Nothing matches "museum".</div><div class="sdk-empty-line" data-kind="error">' + fa('triangle-exclamation') + ' Could not load. <button type="button" class="btn btn-small">Try again</button></div></div>' },
      { wide: true, n: 'Skeleton .sdk-skel', ctx: 'app', sel: '.sdk-skel', note: 'Under reduced motion it holds still.', html: '<div class="sdk-skel-list" style="max-width:420px" aria-busy="true" aria-label="Loading"><div class="sdk-skel-row"><span class="sdk-skel sdk-skel-dot"></span><span class="sdk-skel-stack"><span class="sdk-skel sdk-skel-title"></span><span class="sdk-skel sdk-skel-line"></span></span></div><div class="sdk-skel-row"><span class="sdk-skel sdk-skel-dot"></span><span class="sdk-skel-stack"><span class="sdk-skel sdk-skel-title"></span><span class="sdk-skel sdk-skel-line"></span></span></div></div>' },
      { wide: true, n: 'Skeleton cards', ctx: 'app', sel: '.sdk-skel-card', html: '<div class="sdk-skel-grid" aria-busy="true" aria-label="Loading"><div class="sdk-skel-card"><span class="sdk-skel sdk-skel-block"></span><span class="sdk-skel sdk-skel-title"></span><span class="sdk-skel sdk-skel-line"></span></div><div class="sdk-skel-card"><span class="sdk-skel sdk-skel-block"></span><span class="sdk-skel sdk-skel-title"></span><span class="sdk-skel sdk-skel-line"></span></div></div>' },
      { n: 'Spinner .sdk-spinner', ctx: 'app', sel: '.sdk-spinner', html: row('<span class="sdk-spinner sdk-spinner-sm" role="status" aria-label="Loading"></span><span class="sdk-spinner" role="status" aria-label="Loading"></span><span class="sdk-spinner sdk-spinner-lg" role="status" aria-label="Loading"></span><button type="button" class="btn btn-primary" aria-busy="true"><span class="sdk-spinner sdk-spinner-sm" aria-hidden="true"></span> Saving</button>', 16) },
      { wide: true, n: 'In a module', ctx: 'host', sel: '.sdk-empty', html: '<div class="sdk-empty">' + fa('list-check') + '<p class="sdk-empty-title">Nothing to do</p><p class="sdk-empty-text">Everything is done.</p></div>' },
    ],
  });

  // ---- Progress ----
  const bar = (pct, cls = '', planned) => `<div class="sdk-progress${cls}" role="progressbar" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" aria-label="Spent">${planned ? `<span class="sdk-progress-planned" style="--pct:${planned}%"></span>` : ''}<span class="sdk-progress-fill" style="--pct:${pct}%"></span></div>`;
  F.push({
    id: 'progress', group: 'Feedback', name: 'Progress and meters',
    desc: 'A bar is <code>.sdk-progress</code> with <code>.sdk-progress-fill</code> (its share in <code>--pct</code>) and, for a budget, <code>.sdk-progress-planned</code>. <code>.warn</code> is almost full, <code>.over</code> over, <code>.indeterminate</code> unknown; <code>.sdk-progress-sm</code> thin, <code>.sdk-progress-short</code> beside text. A native <code>progress.sdk-progress</code> looks the same. With its words it is <code>.sdk-meter</code>. A poll option\'s share sits behind its row: <code>.sdk-progress-behind</code>. The call\'s microphone level is <code>.sdk-mic</code>.',
    variants: [
      { wide: true, n: 'Bars', ctx: 'app', sel: '.sdk-progress', html: '<div style="display:grid;gap:12px;max-width:360px">' + bar(40) + bar(55, '', 75) + bar(92, ' warn') + bar(100, ' over') + '<div class="sdk-progress indeterminate" role="progressbar" aria-label="Loading"><span class="sdk-progress-fill"></span></div><progress class="sdk-progress" value="30" max="100" aria-label="Upload"></progress>' + bar(60, ' sdk-progress-sm') + '</div>' },
      { wide: true, n: 'Meter .sdk-meter', ctx: 'app', sel: '.sdk-meter', html: '<div class="sdk-meter" style="max-width:360px"><div class="sdk-meter-head"><span class="sdk-meter-label">Food</span><span class="sdk-meter-value"><b>€320</b> of €500</span></div>' + bar(64, '', 80) + '<span class="sdk-meter-sub">€180 left</span></div>' },
      { wide: true, n: 'Behind a row .sdk-progress-behind', ctx: 'app', sel: '.sdk-progress-behind', html: '<div class="sdk-list" style="max-width:360px"><div class="sdk-row" style="position:relative;overflow:hidden"><span class="sdk-progress-behind" style="--pct:62%"></span><span class="sdk-row-main"><span class="sdk-row-title">Fish place by the river</span></span><span class="sdk-row-meta">62%</span></div><div class="sdk-row" style="position:relative;overflow:hidden"><span class="sdk-progress-behind" style="--pct:38%"></span><span class="sdk-row-main"><span class="sdk-row-title">Tapas bar</span></span><span class="sdk-row-meta">38%</span></div></div>' },
      { n: 'Microphone level .sdk-mic', ctx: 'app', sel: '.sdk-mic', html: row('<span class="sdk-mic" style="--pct:20%" aria-hidden="true">' + fa('microphone') + '</span><span class="sdk-mic" style="--pct:70%" aria-hidden="true">' + fa('microphone') + '</span>', 12) },
      { wide: true, n: 'In a module', ctx: 'host', sel: '.sdk-progress', html: '<div style="max-width:360px">' + bar(48, '', 70) + '</div>' },
    ],
  });

  // ---- Chips, badges and counts ----
  F.push({
    id: 'chips', group: 'Content', name: 'Chips, badges and counts',
    desc: 'A choice is <code>.sdk-chip</code> (a button; chosen with <code>aria-pressed="true"</code>) in a <code>.sdk-chips</code> row; people are <code>.sdk-chip-people</code> or the tick boxes of <code>.sdk-people</code>. A label is <code>.sdk-chip-tag</code>; one a person can take off <code>.sdk-chip-removable</code> (<code>.sdk-chip-label</code> and the <code>.sdk-chip-x</code> button); a state is <code>.sdk-status</code> with a <code>.sdk-chip-dot</code>. The tone is <code>data-tone</code>: ok, warn, danger, info, neutral. A count is <code>.sdk-badge</code>: a circle round one digit, a box with the small corner for two or more (its width decides; nothing to set). On an icon it is <code>.sdk-badge-micro</code>; a dot alone is <code>.sdk-dot</code>.',
    variants: [
      { n: 'Choice chips .sdk-chip', ctx: 'app', sel: '.sdk-chip', html: '<div class="sdk-chips" role="group" aria-label="Show"><button type="button" class="sdk-chip" aria-pressed="true">All</button><button type="button" class="sdk-chip" aria-pressed="false">' + fa('utensils') + ' Food</button><button type="button" class="sdk-chip" aria-pressed="false">Sights</button><button type="button" class="sdk-chip" aria-pressed="false" disabled>Hotels</button></div>', target: '.sdk-chip:nth-child(2)', states: ['hover', 'focus', 'active', { n: 'Chosen', attrs: { 'aria-pressed': 'true' } }] },
      { n: 'People .sdk-people', ctx: 'host', sel: '.sdk-people', html: '<div class="sdk-people" role="group" aria-label="Who"><label><input type="checkbox" checked> Ana</label><label><input type="checkbox"> Ben</label><label><input type="checkbox" checked> Mia</label></div>' },
      { n: 'People chip .sdk-chip-people', ctx: 'app', sel: '.sdk-chip-people', html: row('<button type="button" class="sdk-chip-people" aria-pressed="true">' + fa('user') + ' Ana</button><button type="button" class="sdk-chip-people" aria-pressed="false">' + fa('user') + ' Ben</button>') },
      { n: 'Tags .sdk-chip-tag, each tone', ctx: 'app', sel: '.sdk-chip-tag', html: row('<span class="sdk-chip-tag">Food</span>' + ['ok', 'warn', 'danger', 'info', 'neutral'].map((t) => `<span class="sdk-chip-tag" data-tone="${t}">${t === 'ok' ? 'Booked' : t === 'warn' ? 'Soon' : t === 'danger' ? 'Late' : t === 'info' ? 'New' : 'Draft'}</span>`).join('') + '<button type="button" class="sdk-chip-tag">' + fa('tag') + ' A tag that opens</button>', 6) },
      { n: 'Removable .sdk-chip-removable', ctx: 'app', sel: '.sdk-chip-removable', html: row('<span class="sdk-chip-removable"><span class="sdk-chip-label">Lisbon</span><button type="button" class="sdk-chip-x" aria-label="Take off Lisbon">' + fa('xmark') + '</button></span><span class="sdk-chip-removable" data-tone="info"><span class="sdk-chip-label">Porto</span><button type="button" class="sdk-chip-x" aria-label="Take off Porto">' + fa('xmark') + '</button></span>', 6) },
      { n: 'Status .sdk-status', ctx: 'app', sel: '.sdk-status', html: row(['ok', 'warn', 'danger', 'neutral'].map((t, i) => `<span class="sdk-status" data-tone="${t}"><span class="sdk-chip-dot" aria-hidden="true"></span>${['Online', 'Away', 'Offline', 'Not set'][i]}</span>`).join(''), 6) },
      { n: 'Counts .sdk-badge (one digit, two, three), .sdk-badge-micro and .sdk-dot', ctx: 'app', sel: '.sdk-badge', html: row('<span class="sdk-badge">3</span><span class="sdk-badge">12</span><span class="sdk-badge">128</span><span class="sdk-badge" data-tone="ok">2</span><span class="sdk-badge" data-tone="ok">13</span><span style="position:relative;display:inline-flex">' + fa('bell') + '<span class="sdk-badge-micro">4</span></span><span class="sdk-dot" aria-label="New"></span>', 14) },
      { n: 'In a module', ctx: 'host', sel: '.sdk-chip', html: '<div class="sdk-chips" role="group" aria-label="Show"><button type="button" class="sdk-chip" aria-pressed="true">Open</button><button type="button" class="sdk-chip" aria-pressed="false">Done</button><span class="sdk-chip-tag" data-tone="warn">2 late</span></div>' },
    ],
  });

  // ---- Avatars ----
  const ava = (size, ini, extra = '') => `<span class="sdk-avatar sdk-avatar-${size} sdk-avatar-ini"${extra}>${ini}</span>`;
  F.push({
    id: 'avatars', group: 'Content', name: 'Avatars',
    desc: 'A person\'s picture is <code>.sdk-avatar</code> holding an <code>img</code>, their first letter (<code>.sdk-avatar-ini</code>) or an icon. Sizes: 20, 24, 32 (the default), 40, 64, 96 (<code>.sdk-avatar-40</code> ...). Overlapping, <code>.sdk-avatar-stack</code>, with a <code>.sdk-badge-micro</code> for the rest.',
    variants: [
      { n: 'Sizes', ctx: 'app', sel: '.sdk-avatar', html: row(ava(20, 'A') + ava(24, 'B') + '<span class="sdk-avatar sdk-avatar-ini">C</span>' + ava(40, 'D') + ava(64, 'E') + ava(96, 'F'), 12) },
      { n: 'An icon', ctx: 'app', sel: '.sdk-avatar > i', html: row('<span class="sdk-avatar" aria-label="Guest">' + fa('user') + '</span><span class="sdk-avatar sdk-avatar-40" aria-label="The assistant">' + fa('robot') + '</span>', 12) },
      { n: 'Stack .sdk-avatar-stack', ctx: 'app', sel: '.sdk-avatar-stack', html: '<span class="sdk-avatar-stack" aria-label="Ana, Ben, Mia and 3 more">' + ava(24, 'A') + ava(24, 'B') + ava(24, 'M') + '<span class="sdk-badge-micro">3</span></span>' },
      { n: 'In a module', ctx: 'host', sel: '.sdk-avatar', html: row(ava(24, 'A') + ava(40, 'B'), 12) },
    ],
  });

  // ---- Chat ----
  const msg = (name, when, body, o = {}) => `<div class="message${o.own ? ' own' : ''}"${o.tint ? ` data-tint="${o.tint}"` : ''}><div class="message-head"><span class="message-head-side"><span class="message-portrait" aria-hidden="true">${o.icon ? fa(o.icon, 'fa-fw') : name.charAt(0)}</span><span class="message-name">${name}</span>${o.command ? `<span class="message-command">${o.command}</span>` : ''}<span class="message-dash" aria-hidden="true">–</span><span class="message-when">${when}</span></span><span class="message-head-side"><button type="button" class="message-vis" aria-label="${o.vis === 'private' ? 'Private' : 'Public'}">${o.vis || 'public'}</button></span></div><div class="message-body text">${body}</div></div>`;
  F.push({
    id: 'chat', group: 'Content', name: 'Chat messages',
    desc: 'A message is <code>.message</code> (<code>.own</code> for yours; <code>data-tint</code> colours a command\'s or the AI\'s portrait): a head <code>.message-head</code> with two <code>.message-head-side</code> zones (<code>.message-portrait</code>, <code>.message-name</code>, <code>.message-command</code>, <code>.message-when</code>; and <code>.message-vis</code>), then <code>.message-body</code>, whose text may hold links, code, a list and a <code>.message-quote</code>. The composer is the <code>textarea</code> of <code>.chat-bar</code>. public/space.js draws them.',
    variants: [
      { n: 'Messages', ctx: 'app', sel: '.message', wide: true, html: '<div class="chat"><div class="messages" style="position:static;overflow:visible">' + msg('Ana', '10:42', '<p>Shall we book the train for <b>Friday</b>? <a href="#">Timetable</a></p>') + msg('Thomas', '10:44', '<p>Yes. I can do it tonight.</p>', { own: true }) + msg('AI', '10:45', '<p class="message-quote">Which train is fastest?</p><p>The 9:00 Alfa Pendular takes 2 h 49 min.</p>', { tint: 'gold', icon: 'robot', command: '/ask', vis: 'private' }) + '</div></div>' },
      { n: 'Text in a message', ctx: 'app', sel: '.message .text', wide: true, html: '<div class="chat"><div class="messages" style="position:static;overflow:visible">' + msg('Ben', '11:02', '<p>What to bring:</p><ul><li>Passports</li><li>Chargers</li></ul><p>The code is <code>LIS-14C</code>.</p><blockquote>Bring a rain jacket.</blockquote>') + '</div></div>' },
      { n: 'Composer .chat-bar', ctx: 'app', sel: '.chat-bar textarea', wide: true, html: '<div class="chat-bar" style="position:static"><textarea rows="1" placeholder="Write a message" aria-label="Write a message"></textarea></div>', target: 'textarea', states: [{ n: 'Focus', force: 'focus' }] },
    ],
  });

  // ---- The journey (status strip and phases) ----
  const band = (state, tint, name, x, w, extra = '') => `<span class="sdk-band" data-state="${state}" data-tint="${tint}" data-label="full" tabindex="0" aria-label="${name}" style="--x:${x}px;--w:${w}px"><span class="sdk-band-box" data-align="start"><span class="sdk-band-name">${name}</span>${extra}</span>${state === 'current' ? '<span class="sdk-band-progress" style="--p:30px"></span>' : ''}</span>`;
  F.push({
    id: 'journey', group: 'Content', name: 'Journey: the status strip and phases',
    desc: 'The strip under a space\'s top bar: <code>.sdk-strip</code> with the phase chip (<code>.sdk-strip-chip.sdk-strip-phase</code>, its <code>.sdk-strip-dot</code> and <code>.sdk-strip-sentence</code>), the journey bar <code>.sdk-journey</code> of <code>.sdk-band</code> phases (<code>data-state</code>: past, current, off; <code>.sdk-band-name</code>, <code>.sdk-band-now</code>), ticks and today\'s pin (<code>.sdk-today</code>), the countdown <code>.sdk-strip-count</code>, facts <code>.sdk-strip-fact</code> and the attention chip <code>.sdk-strip-attn</code>. The phases sheet draws <code>.sdk-phase-strip</code>. public/space.js and public/phase-sheet.js place them by measuring; this is a picture at one width.',
    variants: [
      { n: 'The strip .sdk-strip', ctx: 'app', sel: '.sdk-strip', wide: true, note: 'Wider than a phone: on a phone the strip is a slim line (the bar scrolls here).', html: '<div style="overflow-x:auto"><div style="background:var(--surface-bar-top);min-width:900px;max-width:1100px"><div class="sdk-strip"><span class="sdk-strip-said"><button type="button" class="sdk-strip-chip sdk-strip-phase"><span class="sdk-strip-dot" aria-hidden="true"></span><span class="sdk-strip-sentence"><span class="story-part story-lead">In Lisbon</span><span class="story-part">, day 2 of 6</span></span></button></span><div class="sdk-journey" style="flex:1 1 auto;position:relative;min-width:320px">' + band('past', 'blue', 'Plan', 0, 90) + band('current', 'gold', 'Trip', 94, 150, '<span class="sdk-band-now">Now</span>') + band('', 'green', 'Home', 248, 70) + '<span class="sdk-today" role="img" aria-label="Today, 10 October" style="--pin-x:130px">10<span class="sdk-today-stem" aria-hidden="true"></span></span></div><button type="button" class="sdk-strip-chip sdk-strip-count"><span class="sdk-strip-count-n">4</span><span class="sdk-strip-count-words">days to go</span></button><span class="sdk-strip-facts"><button type="button" class="sdk-strip-chip sdk-strip-fact"><span class="sdk-strip-fact-fill" style="--p:40%"></span>' + fa('wallet') + '<span class="sdk-strip-fact-text">€320 spent</span></button></span><span class="sdk-strip-attn-slot"><button type="button" class="sdk-strip-chip sdk-strip-attn" aria-expanded="false">' + fa('bell') + '<span class="sdk-badge">2</span></button></span></div></div></div>' },
      { n: 'Header chips .sdk-strip-chip', ctx: 'app', sel: '.sdk-strip-chip', html: '<div style="background:var(--surface-bar-top);padding:8px;display:inline-flex;gap:8px"><button type="button" class="sdk-strip-chip">' + fa('calendar') + ' 9 to 14 Oct</button><button type="button" class="sdk-strip-chip on">' + fa('wallet') + ' Budget</button></div>', target: '.sdk-strip-chip', states: ['hover', 'focus', 'active'] },
      { n: 'Phases sheet .sdk-phase-strip', ctx: 'app', sel: '.sdk-phase-strip', wide: true, note: 'public/phase-sheet.js grows each band by its days (flex-grow) and places today\'s line by <code>--at</code>.', html: '<div class="sdk-phase-strip" style="max-width:640px"><ol class="sdk-phase-bands" aria-label="The phases in order"><li class="sdk-phase-band" data-state="past" data-tint="blue" style="flex-grow:8"><span class="sdk-phase-band-label">Plan</span><span class="sdk-phase-band-span">1 to 8 Oct, 8 days</span></li><li class="sdk-phase-band" data-state="current" data-tint="gold" data-main="1" style="flex-grow:6"><span class="sdk-phase-band-label">Trip</span><span class="sdk-phase-band-span">9 to 14 Oct, 6 days</span><span class="sdk-phase-band-now">Now</span><span class="sdk-phase-today" style="--at:30%"><span class="sdk-phase-today-word">Today</span></span></li><li class="sdk-phase-band" data-state="ahead" data-tint="green" style="flex-grow:2"><span class="sdk-phase-band-label">Home</span><span class="sdk-phase-band-span">from 15 Oct</span></li><li class="sdk-phase-band" data-state="off" data-tint="purple"><span class="sdk-phase-band-label">Ideas</span><span class="sdk-phase-band-span">not scheduled</span></li></ol></div>' },
    ],
  });

  // ---- Calendar ----
  const cal = () => {
    let s = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<div class="sdk-cal-dow">${d}</div>`).join('');
    const days = [28, 29, 30, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    days.forEach((d, i) => {
      const other = i < 3;
      const cls = `sdk-cal-cell${other ? ' is-other' : ''}${d === 8 ? ' is-today' : ''}${d === 10 ? ' is-selected' : ''}${d >= 3 && d <= 5 ? ' in-range' : ''}`;
      const chips = d === 2 ? '<button type="button" class="sdk-cal-event">Flight 10:30</button><button type="button" class="sdk-cal-event" data-tint="green">Dinner</button>'
        : d === 4 ? '<button type="button" class="sdk-cal-event is-environment">Holiday</button>'
          : d === 8 ? '<button type="button" class="sdk-cal-event sdk-bar-kept is-marker" data-tint="purple">' + fa('flag') + ' Trip starts</button><button type="button" class="sdk-cal-event sdk-bar-kept is-ext">Dentist</button>'
            : d === 10 ? '<button type="button" class="sdk-cal-event" data-tint="blue">Museum</button>' : '';
      s += `<div class="${cls}"${d === 8 ? ' aria-current="date"' : ''}><span class="sdk-cal-n">${d}</span><div class="sdk-cal-chips">${chips}</div>${d === 2 ? '<span class="sdk-cal-more">+2 more</span>' : ''}</div>`;
    });
    return s;
  };
  F.push({
    id: 'calendar', group: 'Content', name: 'Calendar',
    desc: 'The month is <code>.sdk-cal-grid</code> of <code>.sdk-cal-dow</code> heads and <code>.sdk-cal-cell</code> days (<code>.sdk-cal-n</code>, <code>.sdk-cal-chips</code>, <code>.sdk-cal-more</code>; <code>.is-today</code>, <code>.is-selected</code>, <code>.in-range</code>, <code>.is-other</code>). An event is <code>.sdk-cal-event</code> in its tint (<code>data-tint</code>), <code>.is-environment</code> for the environment\'s own; one kept in another calendar or a marker has the bar, <code>.sdk-bar-kept</code> (with <code>.is-ext</code>, <code>.is-marker</code>, <code>.is-past</code>). The week adds <code>.sdk-cal-week</code>; the day <code>.sdk-cal-hours</code> of <code>.sdk-cal-hour</code>; the list <code>.sdk-cal-agenda</code>; a narrow module <code>.sdk-cal-compact</code>.',
    variants: [
      { n: 'Month .sdk-cal-grid', ctx: 'host', sel: '.sdk-cal-grid', wide: true, html: '<div class="sdk-cal-grid" style="max-width:760px">' + cal() + '</div>', target: '.sdk-cal-cell:nth-child(12)', states: ['hover', 'focus'] },
      { n: 'Compact .sdk-cal-compact', ctx: 'host', sel: '.sdk-cal-compact', html: '<div class="sdk-cal-compact" style="max-width:340px"><div class="sdk-cal-grid">' + cal() + '</div></div>' },
      { n: 'Day hours .sdk-cal-hours', ctx: 'host', sel: '.sdk-cal-hours', wide: true, html: '<div class="sdk-cal-hours" style="max-width:520px"><div class="sdk-cal-allday"><span class="sdk-cal-hr">All day</span><div class="sdk-cal-chips"><button type="button" class="sdk-cal-event is-environment">Holiday</button></div></div><div class="sdk-cal-hour"><span class="sdk-cal-hr">9 AM</span><div class="sdk-cal-chips"><button type="button" class="sdk-cal-event" data-tint="blue">Walking tour</button></div></div><div class="sdk-cal-hour is-now"><span class="sdk-cal-hr">10 AM</span><div class="sdk-cal-chips"></div></div><div class="sdk-cal-hour"><span class="sdk-cal-hr">11 AM</span><div class="sdk-cal-chips"><button type="button" class="sdk-cal-event sdk-bar-kept is-ext">Call with the bank</button></div></div></div>' },
      { n: 'Agenda .sdk-cal-agenda', ctx: 'host', sel: '.sdk-cal-agenda', wide: true, html: '<div class="sdk-cal-agenda" style="max-width:560px"><button type="button" class="sdk-row sdk-bar-kept" data-tint="blue"><span class="sdk-row-meta">Fri 10:30 to 12:45</span><span class="sdk-row-main"><span class="sdk-row-title">Flight to Lisbon</span></span></button><button type="button" class="sdk-row sdk-bar-kept is-ext"><span class="sdk-row-meta">Fri 15:00</span><span class="sdk-row-main"><span class="sdk-row-title">Dentist <span class="sdk-chip-tag">Work</span></span></span></button><button type="button" class="sdk-row sdk-bar-kept is-past" data-tint="green"><span class="sdk-row-meta">Thu 20:00</span><span class="sdk-row-main"><span class="sdk-row-title">Dinner</span></span></button></div>' },
    ],
  });

  // ---- Markers ----
  F.push({
    id: 'markers', group: 'Content', name: 'Markers',
    desc: 'A marker is a moment on a day (a check-in, a deadline). Three forms, all in the marker\'s colour (<code>--marker</code>): a line in the day, <code>.sdk-mk-line</code> (<code>.sdk-mk-ic</code>, <code>.sdk-mk-when</code>, <code>.sdk-mk-label</code>, <code>.sdk-mk-note</code>); a tag in a card\'s head, <code>.sdk-mk-tag</code>; and a time block, the row <code>.sdk-mk-row</code> (<code>.sdk-mk-time</code>, <code>.sdk-mk-len</code>). <code>.sdk-mk-legend</code> names them.',
    variants: [
      { n: 'Line .sdk-mk-line', ctx: 'host', sel: '.sdk-mk-line', wide: true, html: '<div style="display:grid;gap:8px;max-width:520px"><div class="sdk-mk-line" style="--marker:var(--tint-purple)"><span class="sdk-mk-ic">' + fa('hotel') + '</span><span class="sdk-mk-when">15:00</span><span class="sdk-mk-label">Check in</span><span class="sdk-mk-note">Hotel Avenida</span></div><button type="button" class="sdk-mk-line" style="--marker:var(--tint-red)"><span class="sdk-mk-ic">' + fa('flag-checkered') + '</span><span class="sdk-mk-label">Trip ends</span></button></div>', target: 'button', states: ['hover', 'focus'] },
      { n: 'Tag .sdk-mk-tag', ctx: 'host', sel: '.sdk-mk-tag', html: row('<button type="button" class="sdk-mk-tag" style="--marker:var(--tint-purple)">' + fa('hotel') + '<span class="sdk-mk-label">Check in</span></button><button type="button" class="sdk-mk-tag" style="--marker:var(--tint-teal)">' + fa('plane') + '<span class="sdk-mk-label">Fly home</span></button>', 6), target: '.sdk-mk-tag', states: ['hover', 'focus', 'disabled'] },
      { wide: true, n: 'Time block .sdk-mk-row', ctx: 'host', sel: '.sdk-mk-row', html: '<div class="sdk-list" style="max-width:420px"><article class="sdk-row sdk-mk-row" style="--marker:var(--tint-gold)"><span class="sdk-card-icon">' + fa('mug-hot') + '</span><span class="sdk-row-main"><span class="sdk-row-title">Coffee break</span><span class="sdk-row-sub">Rest before the museum</span></span><span class="sdk-row-meta sdk-mk-len">30 min</span></article></div>' },
    ],
  });

  // ---- Day cards ----
  F.push({
    id: 'days', group: 'Content', name: 'Day cards and day chips',
    desc: 'A day of a trip is <code>.sdk-card.sdk-day</code>, its head <code>.sdk-day-head</code> (the date block <code>.sdk-day-date</code>, <code>.sdk-day-main</code> with the title, a <code>.sdk-day-labels</code> row of marker tags, <code>.sdk-day-actions</code>); the day being looked at is <code>.is-current</code>. An empty day offers <code>.sdk-day-empty</code>. Days run along <code>.sdk-daystrip</code> as <code>.sdk-daychip</code> buttons (<code>.is-today</code>, <code>aria-current="true"</code>, <code>.is-empty</code>, <code>.sdk-daychip-dot</code>); days with nothing between are <code>.sdk-daygap</code> with <code>.sdk-gapcount</code>. The Planner draws them.',
    variants: [
      { n: 'Day card .sdk-day', ctx: 'mod:travel', sel: '.sdk-day', wide: true, html: '<section class="sdk-card sdk-day is-current" style="max-width:560px"><div class="sdk-day-head"><div class="sdk-day-date"><b>10</b><span>Oct</span></div><div class="sdk-day-main"><h2 class="sdk-card-title">Day 2, Lisbon</h2><p class="sdk-card-sub">3 plans, 1 marker</p><div class="sdk-day-labels"><button type="button" class="sdk-mk-tag" style="--marker:var(--tint-purple)">' + fa('hotel') + '<span class="sdk-mk-label">Check in</span></button></div></div><div class="sdk-day-actions"><button type="button" class="btn btn-small sdk-day-add" aria-label="Add to this day">' + fa('plus') + ' <span class="sdk-day-add-word">Add</span></button><button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Day menu">' + fa('ellipsis-vertical') + '</button></div></div></section>' },
      { n: 'Empty day .sdk-day-empty', ctx: 'mod:travel', sel: '.sdk-day-empty', html: '<button type="button" class="sdk-day-empty" style="min-width:260px">Nothing planned. Add something</button>', states: ['hover', 'focus'] },
      { n: 'Day chips .sdk-daystrip', ctx: 'mod:travel', sel: '.sdk-daychip', wide: true, html: '<div class="sdk-daystrip"><button type="button" class="sdk-daychip"><span>Fri</span><b>9</b><span class="sdk-daychip-dot" aria-hidden="true"></span></button><button type="button" class="sdk-daychip is-today" aria-current="true"><span>Sat</span><b>10</b><span class="sdk-daychip-dot" aria-hidden="true"></span></button><button type="button" class="sdk-daychip"><span>Sun</span><b>11</b></button><button type="button" class="sdk-daychip is-empty"><span>Mon</span><b>12</b></button><div class="sdk-daygap"><span class="sdk-gapcount">3</span><span>days</span></div><button type="button" class="sdk-daychip"><span>Fri</span><b>16</b></button></div>', target: '.sdk-daychip:nth-child(3)', states: ['hover', 'focus', 'active'] },
    ],
  });

  // ---- The live SDK pieces: mounted by the real public/sdk/host.js (ds.js draws them) ----
  window.DS_LIVE = [
    {
      id: 'live-pickers', block: 'pickers', name: 'Live: date picker, kind picker, currency list', height: 330,
      desc: 'Mounted by the real SDK on plain fields, as a module\'s script does. Click a field\'s button to open it.',
      title: 'Live pickers',
      body: `<div class="dsf-live"><form class="sdk-form" onsubmit="return false">
        <div class="sdk-form-row">
          <label class="sdk-field sdk-m"><span class="sdk-label">Day</span><input type="date" id="d1" value="2026-10-09"><span class="sdk-hint"></span></label>
          <label class="sdk-field sdk-m"><span class="sdk-label">Currency</span><select id="currency1"></select><span class="sdk-hint"></span></label>
          <div class="sdk-field sdk-full"><span class="sdk-label">Kind</span><div id="f-types"></div></div>
        </div></form></div>`,
      script: `
        var inp = document.getElementById('d1'); host.ui.datePicker(inp, { clearable: true });
        host.ui.currencySelect(document.getElementById('currency1'), { value: 'USD' });
        host.ui.kindPicker(document.getElementById('f-types'), { label: 'What is it', value: 'sight', groups: [
          { label: 'Places', options: [{ id: 'sight', label: 'Sight', icon: 'landmark', color: '#c47a2c', words: 'sight' }, { id: 'food', label: 'Food and drink', icon: 'utensils', color: '#2c7ac4', words: 'food' }] },
          { label: 'Getting about', options: [{ id: 'flight', label: 'Flight', icon: 'plane', color: '#7a2cc4', words: 'flight' }] }] });`,
    },
    {
      id: 'live-datepicker-open', block: 'pickers', name: 'Live: date picker, open', height: 330, title: 'Live date picker, open',
      desc: 'The month (.sdk-dp) opened under a field.',
      body: '<div class="dsf-live"><form class="sdk-form" onsubmit="return false"><div class="sdk-form-row"><label class="sdk-field sdk-m"><span class="sdk-label">Departure day</span><input type="date" id="d2" value="2026-10-14"><span class="sdk-hint"></span></label></div></form></div>',
      script: `host.ui.datePicker(document.getElementById('d2'), { clearable: true }); var b = document.querySelector('.sdk-datefield .sdk-icon-btn'); if (b) b.click();`,
    },
    {
      id: 'live-menu', block: 'menus', name: 'Live: host.menu.show (the module menu and its flyout)', height: 330, title: 'Live menu',
      desc: '.sdk-menu, opened by host.menu.show on a button, with a category that opens a flyout, a separator, a heading, a danger row and a disabled one.',
      body: '<div class="dsf-live"><div class="dsf-row"><button type="button" class="btn" id="mb">Open the menu</button><button type="button" class="sdk-icon-btn btn-quiet btn-small" id="mm" aria-label="More"></button></div></div>',
      script: `
        host.ui.moreButton(document.getElementById('mm'), { label: 'More' });
        var open = function () { host.menu.show({ id: 'ds-menu', anchor: document.getElementById('mb'), items: [
          { label: 'Edit', icon: 'pen' }, { label: 'Duplicate', icon: 'copy', hint: 'Makes a copy beside it' },
          { label: 'Move to', icon: 'arrow-right', items: [{ label: 'Day 1' }, { label: 'Day 2' }, { label: 'Unscheduled' }] },
          { separator: true }, { heading: 'Danger' }, { label: 'Not now', disabled: true }, { label: 'Delete', icon: 'trash', danger: true }] }); };
        document.getElementById('mb').addEventListener('click', open); open();
        setTimeout(function () { var c = document.querySelector('.sdk-menu-category'); if (c) c.dispatchEvent(new MouseEvent('click', { bubbles: true })); }, 400);`,
    },
    {
      id: 'live-switch', block: 'tabs', name: 'Live: view switch, more button, toast', height: 230, title: 'Live view switch and toast',
      desc: 'host.ui.viewSwitch with an element (the toolbar form is host-drawn), host.ui.moreButton and host.ui.toast.',
      body: '<div class="dsf-live"><div class="dsf-row"><div id="vs"></div></div><div class="dsf-row"><div id="vs2"></div></div><div class="dsf-row"><button type="button" class="btn" id="tb">Show a toast</button></div></div>',
      script: `
        host.ui.viewSwitch({ id: 'a', element: document.getElementById('vs'), value: 'list', options: [{ id: 'list', label: 'List', icon: 'list' }, { id: 'month', label: 'Month', icon: 'calendar' }, { id: 'map', label: 'Map', icon: 'map' }], onChange: function () {} });
        host.ui.viewSwitch({ id: 'b', element: document.getElementById('vs2'), value: 'all', options: [{ id: 'all', label: 'All' }, { id: 'mine', label: 'Mine' }], onChange: function () {} });
        var t = function () { host.ui.toast('Saved in Places.'); }; document.getElementById('tb').addEventListener('click', t); t();`,
    },
    {
      id: 'live-editor', block: 'dialogs', name: 'Live: editor window (host.ui.editor)', height: 560, title: 'Live editor window',
      desc: 'A &lt;dialog class="sdk-editor"&gt; opened with host.ui.editor, with a form inside. The SDK adds the head and its Close button; this frame is not lifted, so a narrow width shows the phone sheet.',
      body: `<div class="dsf-live"><dialog class="sdk-editor" id="ed" aria-label="Add a place"><form class="sdk-form" onsubmit="return false"><h2>Add a place</h2>
          <label class="sdk-field sdk-full"><span class="sdk-label">Name</span><input type="text" value="Louvre" id="en"><span class="sdk-hint"></span></label>
          <div class="sdk-form-row"><label class="sdk-field sdk-m"><span class="sdk-label">Day</span><input type="date" value="2026-10-12"><span class="sdk-hint"></span></label>
          <label class="sdk-field sdk-m"><span class="sdk-label">Cost</span><input type="text" value="22" aria-invalid="true"><span class="sdk-error">Enter a number.</span></label></div>
          <div class="sdk-choice-list"><label class="sdk-choice-row"><input type="checkbox" checked><span class="sdk-choice-text"><span class="sdk-choice-label">Booked</span></span></label></div>
        </form><div class="sdk-editor-actions"><button type="button" class="btn btn-primary">Save</button><button type="button" class="btn" id="ec">Cancel</button></div></dialog></div>`,
      script: `var ed = host.ui.editor(document.getElementById('ed'), { size: 'medium', isDirty: function () { return false; } }); ed.open({}); document.getElementById('ec').addEventListener('click', function () { ed.cancel(); });`,
    },
    {
      id: 'live-moduleframe', block: 'moduleframe', name: 'Live: the module panel (createModuleFrame)', height: 420, title: 'Live module panel', ctx: 'app', module: true,
      desc: 'The real public/module-frame.js on an app page\'s stylesheets. Change the width at the top to see the toolbar fold. All of its states: the <a href="/design-system/prototype.html" target="_top">Prototype page</a>.',
      body: '<div class="dsf-live"><div id="mf-here" style="height:360px"></div></div>',
      script: `return import('/module-frame.js').then(function (m) {
        var f = m.createModuleFrame({ title: 'Packing list', icon: 'suitcase', titlebar: { add: { label: 'Add' }, actions: [{ id: 'pin', icon: 'thumbtack', label: 'Pin', placement: 'bar', on: false }], close: true },
          toolbar: [{ type: 'switch', id: 'view', label: 'View', value: 'list', options: [{ id: 'list', label: 'List', icon: 'list' }, { id: 'board', label: 'Board', icon: 'table-columns' }] }, { type: 'chips', id: 'when', label: 'Filters', options: [{ id: 'today', label: 'Today', on: true }, { id: 'flagged', label: 'Flagged' }] }, { type: 'spacer' }, { type: 'search', id: 'find', label: 'Search the list', placeholder: 'Search' }, { type: 'button', id: 'new', label: 'New', icon: 'plus', kind: 'primary' }],
          empty: { icon: 'inbox', title: 'Nothing here yet', text: 'Add the first one with New.' }, status: { text: 'Nothing yet', items: [{ text: 'Saved', icon: 'check', tone: 'ok' }] } });
        f.el.style.height = '100%'; document.getElementById('mf-here').append(f.el); });`,
    },
  ];

  window.DS_NOT_MOUNTED.push(
    'The call: the toolbar\'s meter, device lists, the video tiles and the pop-out window need LiveKit; there is none here.',
    'The module window around a running module (host.toolbar.set, host.status.set and the title bar, drawn by module-host.js): shown as a picture under "Module window".',
    'Map pins, the map\'s controls and callouts: drawn by MapLibre on a WebGL canvas.',
    'The date picker and kind picker on a phone (a sheet fixed to the screen): see the width buttons; the live ones open inside their frame.',
    'The top bar and its two zones (public/nav-bar.js): needs the signed-in app; the crumb, the icon links and the phone\'s tab bar are shown.',
    'Uploaded modules: not scanned and not shown.',
  );
})();
