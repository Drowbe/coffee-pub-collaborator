/* The design system page's components, part 3: feedback, content and patterns. See components.js for the shape. */
(() => {
  const fa = window.DSH.fa;
  const F = window.DS_FAMILIES;
  const mod = (id) => 'mod:' + id;

  // ---- Banners, notices, toasts ----
  F.push({
    id: 'banners', group: 'Feedback', name: 'Banners, notices and toasts',
    desc: 'Something to tell a person: a toast that goes by itself, a banner on a page, a notice in a list or beside an action.',
    dup: '.env-banner, .bell-notice, Maps\' .banner and the conflict bar (restated in Places, Research and the Planner, each with a --danger outline) all do "a message with maybe a button". .toast has a 3px accent left edge.',
    dupCount: 6,
    variants: [
      { n: 'Toast .toast (notification)', ctx: 'app', sel: '.toast', static: true, html: '<button type="button" class="toast"><i class="fa-solid fa-bell fa-fw toast-icon" aria-hidden="true"></i><span class="toast-text"><strong>Ana added a poll</strong><span class="toast-body">Where to eat?</span><span class="toast-from">Polls</span></span></button>', states: ['hover'] },
      { n: 'Toast, short note (host.ui.toast)', ctx: 'app', sel: '.toast-note', html: '<button type="button" class="toast toast-note" role="status"><span class="toast-text">Saved in Places.</span></button>' },
      { n: 'Toast, invitation .toast-invite', ctx: 'app', sel: '.toast-invite', html: '<div class="toast toast-invite"><i class="fa-solid fa-user-plus fa-fw toast-icon" aria-hidden="true"></i><span class="toast-text"><strong>Ben invites you</strong><span class="toast-actions"><button type="button" class="btn btn-small btn-primary">Join</button><button type="button" class="btn btn-small">Not now</button></span></span></div>' },
      { n: 'Environment banner .env-banner', ctx: 'app', sel: '.env-banner', html: '<div class="env-banner">This environment is over its space limit.</div>' },
      { n: 'Bell notices .bell-notice', ctx: 'app', sel: '.bell-notice', html: '<ul class="bell-notices"><li class="bell-notice"><i class="fa-solid fa-bell fa-fw bell-notice-icon" aria-hidden="true"></i><span class="bell-notice-text"><strong>A new poll</strong><span class="bell-notice-body">Where to eat?</span><span class="bell-notice-from">Polls · 10:30</span></span></li></ul>' },
      { n: 'Maps banner .banner', ctx: mod('maps'), sel: '.banner', box: true, html: '<div style="position:relative;height:70px;width:440px"><div class="banner">Offline region ready <button type="button" class="btn">Use it</button></div></div>' },
      { n: 'Conflict bar, Places', ctx: mod('places'), sel: '.conflict-bar', html: '<div class="conflict-bar"><span>Someone else changed this place.</span><button type="button" class="btn">Reload</button><button type="button" class="btn">Keep mine</button></div>' },
      { n: 'Conflict bar, Research', ctx: mod('research'), sel: '.conflict-bar', html: '<div class="conflict-bar"><span>Someone else changed this note.</span><button type="button" class="btn">Reload</button></div>' },
      { n: 'Conflict bar, Planner', ctx: mod('travel'), sel: '.conflict-bar', html: '<div class="conflict-bar"><span>Someone else changed this day.</span><button type="button" class="btn">Reload</button></div>' },
      { n: 'Empty note, Planner .emptynote', ctx: mod('travel'), sel: '.emptynote', html: '<p class="emptynote">Nothing planned for this day. <button type="button" class="btn">Add</button></p>' },
    ],
  });

  // ---- Empty and loading ----
  F.push({
    id: 'empty-loading', group: 'Feedback', name: 'Empty, loading and error states',
    desc: 'What a view shows with nothing in it, while it loads, or when it failed.',
    dup: 'No shared component: .state in four modules, .empty in three, .skel in four, and six more on the app\'s pages (.canvas-empty, .dashboard-empty, .bell-empty, .activity-empty, .chat-view-empty, .no-call-empty).',
    dupCount: 10,
    variants: [
      { n: '.state, Budget', ctx: mod('budget'), sel: '.state', html: '<div class="state"><div class="ic">' + fa('wallet') + '</div><h2>No budget yet</h2><p>Set a target to start.</p><button type="button" class="btn">Set a target</button></div>' },
      { n: '.state, Places', ctx: mod('places'), sel: '.state', html: '<div class="state"><div class="ic">' + fa('location-dot') + '</div><h2>No places</h2><p>Add the first one.</p></div>' },
      { n: '.state, Planner', ctx: mod('travel'), sel: '.state', html: '<div class="state"><div class="ic">' + fa('plane') + '</div><h2>No days yet</h2><p>Set the dates in Set up.</p></div>' },
      { n: '.state, Maps (fills the map)', ctx: mod('maps'), sel: '.state', box: true, html: '<div style="position:relative;height:200px"><div class="state"><div class="ic">' + fa('map') + '</div><h2>No map here</h2><p>The map could not load.</p></div></div>' },
      { n: '.empty, Calendar, Polls, To-do', ctx: mod('calendar'), sel: '.empty', html: '<div class="empty">Nothing this month.</div>' },
      { n: '.empty, Polls widget', ctx: 'widget:polls', sel: '.empty', html: '<div class="empty">No polls.</div>' },
      { n: '.empty, To-do widget', ctx: 'widget:todo', sel: '.empty', html: '<div class="empty">Nothing to do.</div>' },
      { n: '.skel, Places (a grid)', ctx: mod('places'), sel: '.skel', html: '<div class="skeleton"><div class="skel"></div><div class="skel"></div></div>' },
      { n: '.skel, Research', ctx: mod('research'), sel: '.skel', html: '<div class="skel"></div>' },
      { n: '.skel, Planner', ctx: mod('travel'), sel: '.skel', html: '<div class="skeleton"><div class="skel"></div><div class="skel"></div></div>' },
      { n: '.skel, Maps', ctx: mod('maps'), sel: '.skel', box: true, html: '<div style="height:60px"><div class="skel"></div></div>' },
      { n: '.canvas-empty, .bell-empty, .activity-empty', ctx: 'app', sel: '.canvas-empty', html: '<div style="display:grid;gap:12px"><div class="canvas-empty" style="padding:12px">No module is open.</div><p class="bell-empty">No notifications.</p><p class="activity-empty hint">No activity yet.</p></div>' },
      { n: '.dashboard-empty, .chat-view-empty, .no-call-empty', ctx: 'app', sel: '.dashboard-empty', html: '<div style="display:grid;gap:12px"><p class="dashboard-empty hint">Nothing here yet.</p><p class="chat-view-empty">No messages.</p><p class="no-call-empty">No one is in the call.</p></div>' },
      { n: 'Planner empty day .day-empty', ctx: mod('travel'), sel: '.day-empty', html: '<p class="day-empty">Nothing planned.</p><p class="day-empty has-add"><button type="button" class="day-empty-add">' + fa('plus') + ' Add something</button></p>' },
    ],
  });

  // ---- Chips, badges, pills ----
  F.push({
    id: 'chips', group: 'Content', name: 'Chips, badges, pills and counts',
    desc: 'Small labels: a filter you can switch, a status, a count.',
    dup: 'More than ten looks: .chip in Calendar (an event block) and in Places (a filter pill), .filter-chip, .rs-chip, .chip-btn, .pill (app and Planner), .badge in four sizes, .daychip, .markerpill, .phase-chip, .nav-badge, .pin-badge, .stream-badge, .bgpick-chip, .attention-count.',
    dupCount: 14,
    variants: [
      { n: 'Filter chip .filter-chip (app)', ctx: 'app', sel: '.filter-chip', html: '<div style="display:flex;gap:8px"><button type="button" class="filter-chip">Chat <span class="count">3</span></button><button type="button" class="filter-chip on">Calendar <span class="count">12</span></button></div>', target: '.filter-chip', states: ['hover', 'focus'] },
      { n: 'Pill .pill (app)', ctx: 'app', sel: '.pill', html: '<div style="display:flex;gap:8px"><span class="pill">Disabled</span><span class="pill on">Enabled</span><span class="pill warn">Needs setup</span></div>' },
      { n: 'Badge .badge in a tab (16px)', ctx: 'app', sel: '.subtab .badge', html: '<button type="button" class="subtab">Roles <span class="badge">2</span></button>' },
      { n: 'Nav badge .nav-badge', ctx: 'app', sel: '.nav-badge', html: '<span class="nav-badge">4</span>' },
      { n: 'Icon-link badge (14px)', ctx: 'app', sel: '.icon-link .badge', html: '<div class="topbar" style="position:static;min-height:0;padding:4px 8px"><button class="icon-link" type="button" aria-label="Chat">' + fa('comments', 'fa-fw') + '<span class="badge">5</span></button></div>' },
      { n: 'Chat view count .chat-view-count (14px)', ctx: 'app', sel: '.chat-view-count', html: '<span class="chat-view-count">2</span>' },
      { n: 'Attention count .attention-count (24px)', ctx: 'app', sel: '.attention-count', html: '<button type="button" class="attention-count">3 need you</button>', states: ['hover'] },
      { n: 'Stream badge .stream-badge', ctx: 'app', sel: '.stream-badge', html: '<span class="stream-badge">live</span> <span class="stream-badge aside">aside</span>' },
      { n: 'Phase tag .phase-tag', ctx: 'app', sel: '.phase-tag', html: '<span class="phase-tag phase-tag-now">Now</span> <span class="phase-tag phase-tag-main">Main</span>' },
      { n: 'Background chip .bgpick-chip', ctx: 'app', sel: '.bgpick-chip', html: '<div class="bgpick-chips"><button type="button" class="bgpick-chip">Cafe</button><button type="button" class="bgpick-chip on">Beach</button></div>' },
      { n: 'Chip, Places (filter pill)', ctx: mod('places'), sel: '.chip', html: '<div class="chips"><button type="button" class="chip">Museum <span class="count">4</span></button><button type="button" class="chip on">Food</button><button type="button" class="chip" data-cat="food" style="--tone:#2c7ac4">' + fa('utensils', 'ic') + ' Cafe</button></div>', target: '.chip', states: ['hover'] },
      { n: 'Chip, Calendar (an event block)', ctx: mod('calendar'), sel: '.chip', html: '<div style="width:140px;display:grid;gap:3px"><button type="button" class="chip">10:30 Flight</button><button type="button" class="chip environment">Trip</button><button type="button" class="chip ext" style="--ext:#6fbf73">Dentist</button><button type="button" class="chip marker" style="--mk:#6aa6e8">Marker</button></div>', target: '.chip', states: ['hover'] },
      { n: 'Chip button .chip-btn, Budget', ctx: mod('budget'), sel: '.chip-btn', html: '<div style="display:flex;gap:6px"><button type="button" class="chip-btn"><span>' + fa('utensils') + '</span><span>Food</span></button><button type="button" class="chip-btn on"><span>' + fa('bed') + '</span><span>Stay</span></button></div>', target: '.chip-btn', states: ['hover'] },
      { n: 'Research chips .rs-chip', ctx: mod('research'), sel: '.rs-chip', html: '<div class="rs-chips" style="padding:0"><button type="button" class="rs-chip">Note</button><button type="button" class="rs-chip on">Link</button><button type="button" class="rs-chip tag" style="--tag:#6aa6e8">food <span class="x">×</span></button></div>' },
      { n: 'Pill, Planner (tinted)', ctx: mod('travel'), sel: '.pill', html: '<span class="pill" style="--tone:#2c7ac4">10:30</span> <span class="pill mono" style="--tone:#c47a2c">LIS</span>' },
      { n: 'Badge, Planner (34px round icon)', ctx: mod('travel'), sel: '.badge', html: '<span class="badge" style="--tone:#2c7ac4;--tone-ink:#fff">' + fa('plane') + '</span>' },
      { n: 'Day chip .daychip, Planner', ctx: mod('travel'), sel: '.daychip', html: '<div style="display:flex;gap:6px"><button type="button" class="daychip">Mon<b>12</b></button><button type="button" class="daychip current today">Tue<b>13</b></button><button type="button" class="daychip in-trip" style="--tone:#2c7ac4">Wed<b>14</b></button></div>', target: '.daychip', states: ['hover'] },
      { n: 'Sdk kind chip .sdk-kind-chip', ctx: 'host', sel: '.sdk-kind-chip', html: '<span class="sdk-kind-chip" style="--kind-color:#2c7ac4">' + fa('plane') + '</span>' },
      { n: 'Status chip .mod-status-item.chip', ctx: 'app', sel: '.mod-status-item.chip', html: '<div class="mod-status" style="border:0"><span class="mod-status-items"><span class="mod-status-item chip">Synced</span></span></div>' },
    ],
  });

  // ---- Messages ----
  F.push({
    id: 'messages', group: 'Content', name: 'Messages, chat and AI cards',
    desc: 'A chat message and its parts. The tinted message has a 3px coloured left edge.',
    variants: [
      { n: 'Message .message', ctx: 'app', sel: '.message', wide: true, html: '<div class="message" style="max-width:520px"><div class="message-head"><span class="message-head-side"><span class="message-portrait">A</span><span class="message-name">Ana</span><span class="message-dash">-</span><span class="message-when">10:30</span></span><span class="message-head-side"><button type="button" class="sdk-more" aria-label="More">' + fa('ellipsis-vertical') + '</button></span></div><div class="message-body text"><p>Shall we book the train?</p></div></div>', states: ['hover'] },
      { n: 'Own message .message.own', ctx: 'app', sel: '.message.own', wide: true, html: '<div class="message own" style="max-width:520px"><div class="message-head"><span class="message-head-side"><span class="message-portrait">T</span><span class="message-name">Thomas</span><span class="message-dash">-</span><span class="message-when">10:31</span></span></div><div class="message-body text"><p>Yes, 9:15.</p></div></div>' },
      { n: 'Tinted message (a 3px coloured left edge)', ctx: 'app', sel: '.message[data-tint]', wide: true, html: '<div class="message" data-tint="blue" style="max-width:520px"><div class="message-head"><span class="message-head-side"><span class="message-portrait message-portrait-icon">' + fa('robot') + '</span><span class="message-name">Assistant</span></span></div><div class="message-body text"><p>The train takes 3 hours.</p></div></div>' },
      { n: 'Command message .message-command and quote', ctx: 'app', sel: '.message-command', wide: true, html: '<div class="message" style="max-width:520px"><div class="message-head"><span class="message-head-side"><span class="message-name">Ben</span><span class="message-command">/roll</span></span></div><div class="message-body text"><blockquote class="message-quote">Shall we book the train?</blockquote><p>Rolled 14.</p></div></div>' },
      { n: 'Private AI message .message.private-ai', ctx: 'app', sel: '.message.private-ai', wide: true, html: '<div class="message private-ai" data-tint="purple" style="max-width:520px"><div class="message-head"><span class="message-head-side"><span class="message-name">Assistant</span><span class="message-vis">Only you</span></span></div><div class="message-body text"><p>Here is a draft.</p></div><div class="actions"><button type="button" class="msg-btn">' + fa('bookmark') + '</button></div></div>' },
      { n: 'Object in a message .chat-object', ctx: 'app', sel: '.message .chat-object', wide: true, html: '<div class="message" style="max-width:520px"><div class="message-body"><div class="chat-object"><h3>Flight to Lisbon</h3><div class="chat-object-body">10:30 to 12:45</div><div class="chat-object-meta">Planner</div></div></div></div>' },
      { n: 'Link preview .chat-link', ctx: 'app', sel: '.chat-link', wide: true, html: '<div class="message" style="max-width:520px"><div class="message-body"><div class="chat-link"><span class="chat-link-text"><span class="chat-link-title">Lisbon in 3 days</span><span class="chat-link-desc">A short guide</span><span class="chat-link-site">example.com</span></span></div></div></div>' },
      { n: 'Assistant messages in the module', ctx: mod('assistant'), html: '<p class="dim">The Assistant module draws its own bubbles; see assistant.css.</p>', note: 'Listed so the family is complete; it holds no look of its own beyond the app\'s message.' },
    ],
  });

  // ---- Avatars ----
  F.push({
    id: 'avatars', group: 'Content', name: 'Avatars and portraits',
    variants: [
      { n: 'Message portrait .message-portrait (22px)', ctx: 'app', sel: '.message-portrait', html: '<span class="message-portrait">A</span>' },
      { n: 'Who is here .who-here-face', ctx: 'app', sel: '.who-here-face', html: '<span class="who-here-faces"><span class="who-here-face"><span class="who-here-initial" style="width:22px;height:22px;border-radius:var(--radius-round);background:var(--secondary)">A</span></span><span class="who-here-face"><span class="who-here-initial" style="width:22px;height:22px;border-radius:var(--radius-round);background:var(--secondary)">B</span><span class="who-here-call">' + fa('video') + '</span></span></span>' },
      { n: 'Member face .setup-member-face (24px)', ctx: 'app', sel: '.setup-member-face', html: '<span class="setup-member-face" style="display:inline-block"></span>' },
      { n: 'Module icon .module-icon', ctx: 'app', sel: '.module-icon', html: '<i class="fa-solid fa-calendar module-icon" aria-hidden="true"></i> <i class="fa-solid fa-map module-icon" data-tint="pink" aria-hidden="true"></i>' },
    ],
  });

  // ---- Status strip ----
  F.push({
    id: 'status-strip', group: 'Content', name: 'Status strip, phases and countdown',
    desc: 'The row under the top bar: the phase chip, the timeline bands, today\'s mark and the days to go.',
    variants: [
      { n: 'Status strip .status-strip', ctx: 'app', sel: '.status-strip', wide: true, html: '<div class="topbar" style="position:static;min-height:0;display:block"><div class="status-strip" style="height:44px"><span class="status-said"><button type="button" class="phase-chip nav-text"><span class="phase-chip-label"><span class="story-part story-lead">Planning</span><span class="story-part"> · day 3</span></span></button></span><div class="status-track"><div class="status-band past" style="flex-grow:3"></div><div class="status-band current main" style="flex-grow:4"><div class="status-band-box"><span class="status-band-name">Trip</span></div></div><div class="status-band" style="flex-grow:3"></div></div><span class="status-togo nav-text"><span class="status-togo-days">12</span><span class="status-togo-words">days to go</span></span></div></div>' },
      { n: 'Status fact .status-fact', ctx: 'app', sel: '.status-fact', html: '<div class="topbar" style="position:static;min-height:0"><div class="status-strip" style="height:44px"><button type="button" class="status-fact">' + fa('plane') + '<span class="status-fact-text">Flight 10:30</span></button></div></div>', target: '.status-fact', states: ['hover', 'focus'] },
      { n: 'Phase bands .phase-band (the sheet)', ctx: 'app', sel: '.phase-band', wide: true, html: '<ul class="phase-bands" style="max-width:560px"><li class="phase-band main" style="--tint:var(--tint-blue);flex-grow:4"><span class="phase-band-label">Planning</span><span class="phase-band-span">1 Sep - 8 Oct</span></li><li class="phase-band current" style="--tint:var(--tint-green);flex-grow:3"><span class="phase-band-now">Now</span><span class="phase-band-label">Trip</span><span class="phase-band-span">9 - 16 Oct</span></li><li class="phase-band off"></li></ul>' },
      { n: 'Countdown .recall-countdown', ctx: 'app', sel: '.recall-countdown', html: '<span class="recall-countdown">3</span>' },
      { n: 'Phase chip, swatch and tag', ctx: 'app', sel: '.phase-swatch', html: '<span class="phase-swatch" style="--tint:var(--tint-blue)"></span> <span class="phase-tag phase-tag-now">Now</span>' },
    ],
  });

  // ---- Day, phase, marker items; calendar cells; pins ----
  F.push({
    id: 'days-markers', group: 'Content', name: 'Day cards, calendar cells and markers',
    desc: 'Three month and day looks: the date picker\'s month, the Calendar module and the Planner\'s day cards.',
    dup: 'Three month or day looks. Calendar\'s markers and outside events use a 3px inset coloured edge.',
    dupCount: 3,
    variants: [
      { n: 'Planner day head .day-head2', ctx: 'mod:travel', sel: '.day-head2', wide: true, html: '<div class="day-head2"><div><b>Tuesday 13 October</b><p class="day-summary">Flight, hotel, dinner</p></div><div class="day-actions"><button type="button" class="btn day-add">' + fa('plus') + ' Add</button></div></div>' },
      { n: 'Calendar month cell (the grid)', ctx: mod('calendar'), sel: '.chip', html: '<div style="display:grid;grid-template-columns:repeat(3,110px);gap:2px"><div style="padding:4px;background:var(--bg-section);min-height:70px"><div class="dim" style="font-size:11px">12</div><button type="button" class="chip">Flight</button></div><div style="padding:4px;background:var(--bg-section);min-height:70px"><div class="dim" style="font-size:11px">13</div><button type="button" class="chip marker" style="--mk:#6aa6e8">Marker</button></div><div style="padding:4px;background:var(--bg-section);min-height:70px"><div class="dim" style="font-size:11px">14</div></div></div>' },
      { n: 'Date picker day .sdk-dp-day', ctx: 'host', sel: '.sdk-dp-day', html: '<div style="display:flex;gap:4px"><button type="button" class="sdk-dp-day" style="width:30px">12</button><button type="button" class="sdk-dp-day today" style="width:30px">13</button><button type="button" class="sdk-dp-day sel" style="width:30px">14</button><button type="button" class="sdk-dp-day inrange" style="width:30px">15</button><button type="button" class="sdk-dp-day other" style="width:30px">16</button></div>', target: '.sdk-dp-day', states: ['hover'] },
      { n: 'Planner day chip row', ctx: mod('travel'), sel: '.daychip', html: '<div class="daystrip" style="display:flex;gap:6px"><button type="button" class="daychip in-phase" style="--ph:#6aa6e8">Mon<b>12</b></button><button type="button" class="daychip current">Tue<b>13</b></button></div>' },
    ],
  });

  F.push({
    id: 'pins', group: 'Content', name: 'Map pins and map UI',
    desc: 'Maps and the Planner draw the pin twice (allow-listed in check-radius). MapLibre\'s own controls are restyled in maps.css.',
    variants: [
      { n: 'Maps callout and controls (static)', ctx: mod('maps'), sel: '.callout-actions', html: '<div class="callout-actions" style="display:flex;gap:8px"><button type="button" class="btn">' + fa('location-dot') + ' Pin</button></div>', note: 'The pin itself is drawn into the map canvas (maps-lib-e-pins.js), not in markup.' },
    ],
    notMounted: 'the pins and the map controls: they are drawn by MapLibre on a WebGL canvas, which needs map tiles.',
  });

  // ---- Call controls ----
  F.push({
    id: 'call-controls', group: 'Content', name: 'Call controls',
    desc: 'The call toolbar\'s buttons, visuals only. Checked in a real call, not here.',
    variants: [
      { n: 'Toolbar .fbtn row with carets', ctx: 'app', sel: '.fbtn', html: '<div style="display:flex;gap:10px;align-items:center">' + ['microphone', 'volume-high', 'video'].map((n) => `<div class="fbtn-wrap"><button class="fbtn action-btn" type="button" aria-label="${n}"><span class="glyph">${fa(n, 'fa-fw')}</span></button><button class="fbtn-caret" type="button" aria-label="Settings">${fa('chevron-down')}</button></div>`).join('') + '<button class="fbtn action-btn" type="button" aria-label="Leave"><span class="glyph">' + fa('phone', 'fa-fw') + '</span></button></div>' },
      { n: 'Dial back in .fbtn.dial', ctx: 'app', sel: '.fbtn.dial', html: '<button class="fbtn action-btn dial" type="button" aria-label="Join the call"><span class="glyph">' + fa('phone', 'fa-fw') + '</span></button>' },
    ],
    notMounted: 'the live meter, device menus and the popped-out window, which need a LiveKit call.',
  });

  window.DS_NOT_MOUNTED.push(
    'The call: the toolbar\'s meter, device lists, the video tiles and the pop-out window need LiveKit; there is none here.',
    'host.toolbar.set, host.add.set, host.status.set and the titlebar: drawn by the host page (module-host.js) around a running module; shown as static markup under "Module window".',
    'Map pins, the map\'s controls and callouts: drawn by MapLibre on a WebGL canvas.',
    'The date picker and kind picker on a phone (a sheet fixed to the screen): see the width buttons; the live ones open inside their frame.',
    'The nav registry\'s whole top bar and the two-zone navigation (public/nav-bar.js): needs the signed-in app; only its link looks are shown.',
    'Module-specific widgets with a data-driven look (the Planner\'s full day card, the Budget chart, the timeline): their markup depends on stored data.',
    'Uploaded modules: not scanned and not shown.',
  );
})();
