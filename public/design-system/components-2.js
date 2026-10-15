/* The design system page's components, part 2: navigation, menus and containers. See components.js for the shape. */
(() => {
  const fa = window.DSH.fa;
  const F = window.DS_FAMILIES;
  const mod = (id) => 'mod:' + id;
  const tbTab = (label, icon, on) => `<button type="button" class="tb-tab${on ? ' on' : ''}" aria-pressed="${!!on}">${icon ? `<span class="tb-tab-glyph">${fa(icon)}</span>` : ''}<span class="tb-tab-word">${label}</span></button>`;

  // ---- Tabs and view switches ----
  F.push({
    id: 'tabs', group: 'Navigation', name: 'Tabs, view switches and segmented rows',
    desc: 'Choosing one view of several. The view switch (.tb-tabs, host.ui.viewSwitch) is the shared one.',
    dup: 'Six tab looks do this job: .tb-tabs, .layout-tabs, .setup-tabs, .subtabs, .dest-tabs and Polls\' own .seg (a copy of the view switch). Selected is an accent fill in .tb-tab.on but --selected-bg in the others.',
    dupCount: 6,
    variants: [
      { n: 'View switch .tb-tabs, app', ctx: 'app', sel: '.tb-tabs', html: '<div class="tb-tabs" role="group" aria-label="View">' + tbTab('List', 'list', true) + tbTab('Month', 'calendar') + tbTab('Map', 'map') + '</div>', target: '.tb-tab:nth-child(2)', states: ['hover', 'focus'] },
      { n: 'View switch, module', ctx: 'host', sel: '.tb-tabs', html: '<div class="tb-tabs" role="group" aria-label="View">' + tbTab('List', 'list', true) + tbTab('Month', 'calendar') + tbTab('Map', 'map') + '</div>' },
      { n: 'View switch, icons only (.tb-tabs-compact)', ctx: 'host', sel: '.tb-tabs-compact', html: '<div class="tb-tabs tb-tabs-compact" role="group" aria-label="View">' + tbTab('List', 'list', true) + tbTab('Month', 'calendar') + tbTab('Map', 'map') + '</div>' },
      { n: 'View switch, words only', ctx: 'host', html: '<div class="tb-tabs" role="group" aria-label="Filter">' + tbTab('All', '', true) + tbTab('Mine') + '</div>' },
      { n: 'Polls .seg (a copy, made of .btn)', ctx: mod('polls'), sel: '.seg', html: '<div class="seg" role="group" aria-label="Show"><button type="button" class="btn on">Open</button><button type="button" class="btn">Closed</button></div>', target: '.btn:nth-child(2)', states: ['hover'] },
      { n: 'Layout tabs .layout-tabs (top bar)', ctx: 'app', sel: '.layout-tabs', html: '<div class="topbar" style="position:static;min-height:0;padding:4px 8px"><div class="layout-tabs" style="display:flex;gap:2px"><button type="button" class="core-link" aria-current="page">Plan</button><button type="button" class="core-link">Map</button><button type="button" class="core-link layout-tabs-more" aria-label="More">' + fa('ellipsis') + '</button></div></div>', target: '.core-link:nth-child(2)', states: ['hover', 'focus'] },
      { n: 'Set up tabs .setup-tabs', ctx: 'app', sel: '.setup-tabs', html: '<div class="setup-tabs" role="tablist" style="margin:0;padding:0"><button type="button" role="tab" class="setup-tab" aria-selected="true"><span>General</span></button><button type="button" role="tab" class="setup-tab" aria-selected="false"><span>People</span><span class="setup-tab-dot" aria-hidden="true"></span></button><button type="button" role="tab" class="setup-tab" aria-selected="false">Modules</button></div>', target: '.setup-tab:nth-child(2)', states: ['hover', 'focus'] },
      { n: 'Manage subtabs .subtabs', ctx: 'app', sel: '.subtabs', html: '<div class="subtabs"><button class="subtab active" type="button">Environment</button><button class="subtab" type="button">Theme</button><button class="subtab" type="button">Roles <span class="badge">2</span></button></div>', target: '.subtab:nth-child(2)', states: ['hover'] },
      { n: 'Page bar subtabs .page-bar .subtab', ctx: 'app', sel: '.page-bar .subtab', html: '<div class="topbar" style="position:static;min-height:0;padding:4px 8px"><div class="page-bar"><button class="subtab active" type="button">Plan</button><button class="subtab" type="button">Notes</button></div></div>', target: '.subtab:nth-child(2)', states: ['hover', 'focus'] },
      { n: 'Destination views .dest-views', ctx: 'app', sel: '.tb-tab', note: 'public/destination.css restyles .tb-tab in the page bar.', html: '<div class="tb-tabs dest-views">' + tbTab('Map', 'map', true) + tbTab('List', 'list') + '</div>' },
    ],
  });

  // ---- Menus ----
  const sdkMenu = '<div class="sdk-menu" role="menu"><button class="sdk-menu-item" role="menuitem"><span class="sdk-menu-icon">' + fa('pen') + '</span><span class="sdk-menu-label">Edit</span></button><button class="sdk-menu-item" role="menuitem"><span class="sdk-menu-icon">' + fa('copy') + '</span><span class="sdk-menu-label">Duplicate</span><span class="sdk-menu-hint">Makes a copy beside it</span></button><button class="sdk-menu-item sdk-menu-category open" role="menuitem"><span class="sdk-menu-label">Move to</span><span class="sdk-menu-caret"></span></button><div class="sdk-menu-sep"></div><div class="sdk-menu-heading">Danger</div><button class="sdk-menu-item" disabled>Not now</button><button class="sdk-menu-item danger" role="menuitem"><span class="sdk-menu-icon">' + fa('trash') + '</span><span class="sdk-menu-label">Delete</span></button></div>';
  F.push({
    id: 'menus', group: 'Navigation', name: 'Menus and flyouts',
    desc: 'A short list of actions that opens from a button or a right click.',
    dup: 'Five menu looks: .sdk-menu (host.menu.show), .host-menu (the nav registry\'s), .modules-menu, .chat-command-menu and the Planner\'s own .menu. The module menu\'s CSS is a string inside host.js (UI_CSS), not a stylesheet. Real ones are position:fixed or absolute; shown here in the flow.',
    dupCount: 5,
    variants: [
      { n: 'Module menu .sdk-menu', ctx: 'host', sel: '.sdk-menu', static: true, note: 'Its CSS lives in public/sdk/host.js UI_CSS, so the page mounts the real one in the Live SDK section; this is its markup.', html: sdkMenu, target: '.sdk-menu-item', states: ['hover', 'focus'] },
      { n: 'Host menu .host-menu (nav registry, top bar)', ctx: 'app', sel: '.host-menu', static: true, html: '<div class="host-menu" role="menu"><div class="host-menu-heading">Switch space</div><button class="host-menu-item" role="menuitemradio" aria-checked="true">' + fa('check', 'host-menu-check') + '<span class="host-menu-label">Lisbon</span></button><button class="host-menu-item" role="menuitemradio" aria-checked="false"><span class="host-menu-label">Porto</span><span class="host-menu-badge">3</span></button><div class="host-menu-divider"></div><button class="host-menu-item danger" role="menuitem"><span class="host-menu-label">Leave</span></button><button class="host-menu-item" disabled><span class="host-menu-label">Disabled</span></button></div>', target: '.host-menu-item', states: ['hover', 'focus'] },
      { n: 'Modules menu .modules-menu (space bar)', ctx: 'app', sel: '.modules-menu', static: true, html: '<div class="popover modules-menu" style="display:flex;flex-direction:column"><button type="button" class="modules-menu-item on">' + fa('calendar-days', 'fa-fw') + 'Calendar</button><button type="button" class="modules-menu-item">' + fa('map', 'fa-fw') + 'Maps<span class="badge">2</span></button></div>', target: '.modules-menu-item:nth-child(2)', states: ['hover'] },
      { n: 'Chat command menu .chat-command-menu', ctx: 'app', sel: '.chat-command-menu', static: true, html: '<div class="chat-command-menu"><button type="button" class="chat-command-item">/roll</button><button type="button" class="chat-command-item">/whisper</button></div>', target: '.chat-command-item', states: ['hover'] },
      { n: 'Planner menu .menu', ctx: mod('travel'), sel: '.menu', static: true, html: '<div class="menu"><button type="button">' + fa('pen') + ' Edit</button><button type="button">' + fa('copy') + ' Duplicate</button><button type="button" class="danger">' + fa('trash') + ' Delete</button></div>', target: 'button', states: ['hover'] },
      { n: 'Flyout (category open beside its row)', ctx: 'host', sel: '.sdk-menu-category', static: true, wide: true, html: '<div style="display:flex;gap:4px;align-items:flex-start">' + sdkMenu + '<div class="sdk-menu"><button class="sdk-menu-item">Day 1</button><button class="sdk-menu-item">Day 2</button><button class="sdk-menu-item">Unscheduled</button></div></div>' },
    ],
  });

  F.push({
    id: 'popovers', group: 'Navigation', name: 'Popovers and sheets',
    desc: 'A small panel opened over the page.',
    dup: '.popover is defined twice in style.css; the date picker, kind list and emoji popup are each their own.',
    variants: [
      { n: 'Popover .popover (call settings)', ctx: 'app', sel: '.popover', static: true, html: '<div class="popover" style="display:flex;flex-direction:column;gap:10px;position:static"><h3>Microphone</h3><label>Device<select><option>Default</option></select></label><label class="check"><input type="checkbox" checked> Noise filter</label></div>' },
      { n: 'Tray popover .popover.tray (reactions)', ctx: 'app', sel: '.popover.tray', static: true, html: '<div class="popover tray" style="position:static;display:flex"><button type="button" class="btn">👍</button><button type="button" class="btn">❤️</button><button type="button" class="btn">😂</button></div>' },
      { n: 'Emoji popup .chat-emoji-popup', ctx: 'app', sel: '.chat-emoji-popup', static: true, html: '<div class="chat-emoji-popup" style="position:static">😀 😃 😄 😁</div>' },
      { n: 'Date picker .sdk-dp', ctx: 'host', sel: '.sdk-dp', static: true, html: '<div class="sdk-dp" style="width:252px"><div class="sdk-dp-head"><strong>October 2026</strong></div><p style="margin:0;color:var(--text-dim)">see Pickers</p></div>' },
    ],
  });

  // ---- Cards, rows and lists ----
  F.push({
    id: 'cards', group: 'Containers', name: 'Cards, panels and rows',
    desc: 'A box that holds one thing, and a row in a list.',
    dup: 'Many looks for "a thing in a box": .card and .section (host.css), .panel, .tile (four rule sets), .user-card, .module-settings-card and the modules\' own: Planner cards, Research .rcard, Places .place-row, Calendar and Polls .item. Selected rows are drawn three ways.',
    dupCount: 10,
    variants: [
      { n: '.card and .section (module base)', ctx: 'host', sel: '.card', html: '<div style="display:grid;gap:10px;max-width:420px"><div class="card"><b>Card</b><div class="dim">A thing inside a panel</div></div><div class="section"><b>Section</b><div class="dim">A panel</div></div></div>' },
      { n: '.panel (sign in, Manage)', ctx: 'app', sel: '.panel', html: '<div class="panel" style="margin:0;max-width:420px"><h2 style="margin:0">Panel</h2><p class="hint">A panel with a heading and a hint.</p></div>' },
      { n: '.user-card (Manage, the sign-in)', ctx: 'app', sel: '.user-card', html: '<div class="user-card"><i class="fa-solid fa-user" aria-hidden="true"></i><div><b>Thomas</b><div class="hint">Owner</div></div></div>' },
      { n: '.module-settings-card (Manage > modules)', ctx: 'app', sel: '.module-settings-card', html: '<div class="module-settings-card"><h3>Calendar</h3><p class="hint">Private addresses</p></div><div class="module-settings-card"><h3>Maps</h3><p class="hint">Offline regions</p></div>' },
      { n: '.tile (a person on the call)', ctx: 'app', sel: '.tile', html: '<div class="tile" style="width:220px;height:130px"><div class="placeholder">T</div><span class="name">Thomas</span></div>', note: 'Four top-level rule sets for .tile (style.css:2119, 2199, 2208, 5541).' },
      { n: '.tile.speaking', ctx: 'app', sel: '.tile.speaking', html: '<div class="tile speaking" style="width:220px;height:130px"><div class="placeholder">A</div><span class="name">Ana</span></div>' },
      { n: 'Calendar list item .item', ctx: mod('calendar'), sel: '.item', html: '<button type="button" class="item"><span class="when">Fri 9 Oct, 10:30</span><span class="what"><strong>Flight to Lisbon</strong></span></button>', states: ['hover', 'focus'] },
      { n: 'Calendar list item, marker and outside event', ctx: mod('calendar'), sel: '.item.marker', note: 'A 3px inset coloured edge (box-shadow).', html: '<button type="button" class="item marker" style="--mk:#6aa6e8"><span class="when">Today</span><span class="what"><strong>Trip starts</strong></span></button><button type="button" class="item ext" style="--ext:#6fbf73"><span class="when">9:00</span><span class="what"><strong>Dentist</strong></span></button>' },
      { n: 'Polls widget row .item', ctx: 'widget:polls', sel: '.item', html: '<button type="button" class="item"><span>Where to eat?</span><span class="go">' + fa('chevron-right') + '</span></button>', states: ['hover'] },
      { n: 'To-do widget row .item', ctx: 'widget:todo', sel: '.item', html: '<button type="button" class="item"><span>Book the train</span></button>', states: ['hover'] },
      { n: 'Places row .place-row', ctx: mod('places'), sel: '.place-row', html: '<div class="place-row"><span class="mark">' + fa('landmark') + '</span><div class="main"><p class="title">Louvre</p><p class="sub">Rue de Rivoli, Paris</p><div class="meta"><span class="chip">Museum</span></div></div></div>', states: ['hover', { n: 'Selected', cls: 'selected' }] },
      { n: 'Research card .rcard', ctx: mod('research'), sel: '.rcard', html: '<div class="rcard" data-kind="note" tabindex="0"><div class="top"><span class="kind">' + fa('note-sticky') + '</span><div class="head-main"><span class="kicker">Note</span><b>Opening hours</b></div></div><p class="dim">Closed on Tuesdays.</p></div>', states: ['hover', 'focus', { n: 'Open', cls: 'open' }] },
      { n: 'Planner card .card', ctx: mod('travel'), sel: '.card', html: '<div class="card" style="--tone:#2c7ac4"><div style="display:flex;gap:10px;padding:10px"><span class="badge">' + fa('plane') + '</span><div><h3>Flight to Lisbon</h3><p>10:30 to 12:45</p></div></div></div>', states: ['hover'] },
      { n: 'Planner marker pill .markerpill', ctx: mod('travel'), sel: '.markerpill', html: '<div class="card block markerpill" data-type="rest"><div style="padding:8px 12px;position:relative">Rest</div></div>' },
      { n: 'Background picker card .bgpick-card', ctx: 'app', sel: '.bgpick-card', html: '<div class="bgpick-card" style="width:100%"><div class="bgpick-head" style="padding:10px">Choose a background</div></div>' },
    ],
  });

  F.push({
    id: 'home-cards', group: 'Containers', name: 'Home cards and the ghost slot',
    desc: 'The page that lists spaces: a space\'s card, the add-a-space slot and the ghost tile.',
    variants: [
      { n: 'Space card .space-choice', ctx: 'app', sel: '.space-choice', wide: true, html: '<div class="space-choice" style="max-width:420px"><div class="space-choice-head"><b>Lisbon, October</b></div><p class="space-choice-desc hint">Flights, hotel, what to see.</p><div class="space-choice-actions"><button type="button" class="btn btn-primary">Enter</button><button type="button" class="btn">Invite</button></div></div>' },
      { n: 'Add a space .space-choice-add', ctx: 'app', sel: '.space-choice-add', html: '<button type="button" class="space-choice-add" style="width:260px">' + fa('plus') + '<span>New space</span></button>', states: ['hover', 'focus', 'disabled'] },
      { n: 'Ghost tile .tile-ghost', ctx: 'app', sel: '.tile-ghost', html: '<div class="tile tile-ghost" style="width:220px;height:130px"><div class="placeholder">B</div><div class="tile-ghost-overlay"><span class="tile-ghost-status">Away</span><span class="tile-ghost-with">with Ana</span></div></div>' },
      { n: 'Dashboard widget .dashboard-widget', ctx: 'app', sel: '.dashboard-widget', html: '<div class="dashboard-widget" style="max-width:320px"><div class="dashboard-widget-title">To-do</div><p class="dashboard-empty">Nothing yet</p></div>' },
    ],
  });

  // ---- Tables and lists in Manage ----
  F.push({
    id: 'tables', group: 'Containers', name: 'Tables and lists in Manage',
    desc: 'Rows of data on the Manage pages.',
    variants: [
      { n: 'Files table .files-table', ctx: 'app', sel: '.files-table', wide: true, html: '<table class="files-table"><thead><tr><th></th><th>Name</th><th>Size</th></tr></thead><tbody><tr><td>' + fa('file') + '</td><td>map.pmtiles</td><td>12 MB</td></tr><tr><td>' + fa('file') + '</td><td>notes.txt</td><td>2 KB</td></tr></tbody></table>' },
      { n: 'Roles table .roles-table', ctx: 'app', sel: '.roles-table', wide: true, html: '<table class="roles-table"><thead><tr><th></th><th>Member</th><th>Guest</th></tr></thead><tbody><tr class="roles-group"><th colspan="3">Chat</th></tr><tr><th scope="row">Send</th><td><input type="checkbox" checked></td><td><input type="checkbox"></td></tr></tbody></table>' },
      { n: 'Activity rows .activity-row', ctx: 'app', sel: '.activity-row', wide: true, html: '<div class="activity-log"><div class="activity-row"><span class="activity-time">10:30</span><span class="activity-source">calendar</span><span>Synced 3 events</span></div><div class="activity-row" data-level="warn"><span class="activity-time">10:31</span><span class="activity-source">' + fa('triangle-exclamation') + ' maps</span><span>Region failed</span></div></div>' },
      { n: 'Phase rows .phase-row', ctx: 'app', sel: '.phase-row', wide: true, html: '<div class="phase-rows"><div class="phase-row"><span class="phase-row-name">Planning</span><span class="phase-row-days hint">12 days</span></div></div>' },
    ],
  });

  F.push({
    id: 'progress', group: 'Containers', name: 'Progress bars and meters',
    variants: [
      { n: 'Module toolbar progress .tb-progress', ctx: 'app', sel: '.tb-progress', html: '<div class="tb-progress" style="width:160px"><span class="tb-progress-fill" style="width:60%"></span></div>' },
      { n: 'Budget bar .bar', ctx: mod('budget'), sel: '.bar', html: '<div class="bar" style="width:240px"><span class="bar-expected" style="width:70%"></span><span class="bar-spent" style="width:45%"></span></div><div class="bar over" style="width:240px;margin-top:8px"><span class="bar-spent" style="width:100%"></span></div>' },
      { n: 'AI meter .ai-meter', ctx: 'app', sel: '.ai-meter', html: '<div class="ai-meter" style="width:240px"><span style="width:40%"></span></div><div class="ai-meter warn" style="width:240px;margin-top:8px"><span style="width:92%"></span></div>' },
      { n: 'Region progress (a native progress)', ctx: 'app', sel: '.region-progress', html: '<div class="region-progress" style="width:240px"><progress max="100" value="55"></progress></div>' },
    ],
  });

  F.push({
    id: 'module-window', group: 'Containers', name: 'Module window: title, toolbar and status',
    desc: 'What the host draws around a module (host.toolbar.set, host.add.set, host.status.set). The host draws it, not the module, so only its markup is shown.',
    variants: [
      { n: 'Titlebar .mod-header, toolbar .mod-toolbar, status .mod-status', ctx: 'app', sel: '.mod-header', wide: true, html: '<div class="module" style="max-width:520px;border:1px solid var(--border);border-radius:var(--radius-large);overflow:hidden;display:block"><div class="mod-header" data-tint="blue"><span class="mod-title">' + fa('calendar') + ' Calendar</span><span class="mod-header-tools"><button type="button" class="sdk-more mod-add" aria-label="Add">' + fa('plus') + '</button><button type="button" class="sdk-more" aria-label="More">' + fa('ellipsis-vertical') + '</button></span></div><div class="mod-toolbar"><div class="tb-tabs">' + tbTab('List', 'list', true) + tbTab('Month', 'calendar') + '</div><span class="tb-sep"></span><span class="tb-text">October</span><label class="tb-slider"><span class="tb-slider-label">Zoom</span><input type="range"></label></div><div style="padding:16px;color:var(--text-dim)">The module</div><div class="mod-status"><span class="mod-status-items"><span class="mod-status-item">3 events</span><span class="mod-status-item chip">Synced</span></span></div></div>' },
    ],
    notMounted: 'the real titlebar, toolbar, add button and status line are drawn by module-host.js from host.toolbar.set, host.add.set and host.status.set; they need a module running in a space.',
  });
})();
