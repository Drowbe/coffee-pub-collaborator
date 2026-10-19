/* The Cards, panels and rows family (proposed): the panel, the card, the row, the group header and the empty state, with the Home space card and
   the ghost slot. Loaded by proposed.html through proposed-families.json, after proposed.js (the page engine); it registers one family through
   window.DS_PROPOSED.families.push and draws it with the rules in proposed-cards.css. Nothing here is a style of the product: markup, words and
   tables only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules, from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // Layout of the example pages only (not a style of the product).
  const CD_CSS = `
.pm-cd-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 14px 16px; align-items: start; }
.pm-cd-grid > div > small, .pm-cd-cap { display: block; margin-bottom: 5px; color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-cd-stack { display: flex; flex-direction: column; gap: 8px; }
.pm-cd-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; align-items: start; }
.pm-cd-tool { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.pm-cd-tool .sdk-search { flex: 1 1 140px; min-width: 0; }
.pm-cd-note { margin: 6px 0 0; color: var(--text-dim); font-size: 12px; }
.pm-cd-step { box-sizing: border-box; padding: 10px; border: 1px solid var(--border); }
.pm-cd-step > b { display: block; margin-bottom: 8px; font-size: 12px; font-weight: 600; }
.pm-cd-step > b small { margin-left: 6px; color: var(--text-dim); font-size: 11px; font-weight: 400; }
.pm-cd-ct { border-collapse: collapse; width: 100%; font-size: 12px; }
.pm-cd-ct th, .pm-cd-ct td { padding: 4px 8px 4px 0; text-align: left; border-bottom: 1px solid var(--border); }
.pm-cd-ct th { color: var(--text-dim); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.pm-cd-pass { color: var(--ok); font-weight: 600; }
.pm-cd-fail { color: var(--danger); font-weight: 600; }
.pm-cd-out { outline: 1px dotted var(--text-dim); outline-offset: 2px; }
.pm-cd-sw { display: inline-block; width: 14px; height: 14px; border: 1px solid var(--border); border-radius: var(--radius-small); vertical-align: -2px; margin-right: 6px; }
`;

  const MENU = `<button type="button" class="sdk-icon-btn btn-small btn-quiet" aria-label="More" title="More">${fa('ellipsis-vertical')}</button>`;
  const FORCE = { hover: ' ds-force-hover', active: ' ds-force-active' };

  // One card. o: tint, icon, kicker, title, sub, body, list (html), foot (html), menu, open, state (hover | focus | active), sel, dis, drag, cls, ghost.
  const card = (o = {}) => {
    const cls = ['sdk-card'].concat(o.cls || [], o.drag ? 'is-dragging' : [], o.state === 'hover' || o.state === 'active' ? FORCE[o.state].trim() : []).join(' ');
    const at = `${o.sel ? ' aria-current="true"' : ''}${o.dis ? ' aria-disabled="true"' : ''}${o.tint ? ` data-tint="${o.tint}"` : ''}`;
    const t = o.open ? `<a class="sdk-open${o.state === 'focus' ? ' ds-force-focus' : ''}" href="#">${o.title}</a>` : o.title;
    return `<div class="${cls}"${at}>
      <div class="sdk-card-head">${o.icon ? `<span class="sdk-card-icon">${fa(o.icon)}</span>` : ''}<div class="sdk-card-main">${o.kicker ? `<p class="sdk-card-sub sdk-tint-text">${o.kicker}</p>` : ''}<h4 class="sdk-card-title">${t}</h4>${o.sub ? `<p class="sdk-card-sub">${o.sub}</p>` : ''}</div></div>
      ${o.body ? `<p class="sdk-card-body">${o.body}</p>` : ''}${o.list ? `<div class="sdk-card-list">${o.list}</div>` : ''}${o.foot ? `<div class="sdk-card-foot">${o.foot}</div>` : ''}${o.menu ? `<span class="sdk-card-menu">${MENU}</span>` : ''}
    </div>`;
  };

  // One row. o: tick (true | 'on'), icon, tint, title, sub, meta, action, menu, open, state, sel, dis, drag, cls, bar.
  const row = (o = {}) => {
    const cls = ['sdk-row'].concat(o.cls || [], o.bar ? 'sdk-bar-kept' : [], o.drag ? 'is-dragging' : [], o.state === 'hover' || o.state === 'active' ? FORCE[o.state].trim() : []).join(' ');
    const at = `${o.sel ? ' aria-current="true"' : ''}${o.dis ? ' aria-disabled="true"' : ''}${o.tint ? ` data-tint="${o.tint}"` : ''}`;
    const t = o.open ? `<a class="sdk-open${o.state === 'focus' ? ' ds-force-focus' : ''}" href="#">${o.title}</a>` : o.title;
    return `<div class="${cls}"${at}>${o.tick ? `<label class="sdk-row-tick"><input type="checkbox"${o.tick === 'on' ? ' checked' : ''} aria-label="Done: ${h(o.title)}"></label>` : ''}${o.icon ? `<span class="sdk-card-icon">${fa(o.icon)}</span>` : ''}<span class="sdk-row-main"><span class="sdk-row-title">${t}</span>${o.sub ? `<span class="sdk-row-sub">${o.sub}</span>` : ''}</span>${o.meta ? `<span class="sdk-row-meta">${o.meta}</span>` : ''}${o.action ? `<button type="button" class="btn btn-small">${o.action}</button>` : ''}${o.menu ? MENU : ''}</div>`;
  };

  const wrap = (inner) => `<div class="ds-proposed">${inner}</div>`;
  const CAPTION = (s) => `<small>${s}</small>`;

  // ---- frame bodies ----
  const stepsBody = () => wrap(`<div class="pm-cd-two">
    <div class="pm-cd-step" style="background:var(--bg);border-radius:var(--radius-large)"><b>Page<small>--bg</small></b>
      <div class="pm-cd-step" style="background:var(--bg-section);border-radius:var(--radius-large)"><b>Panel<small>--bg-section, --radius-large</small></b>
        <div class="pm-cd-step" style="background:var(--bg-card);border-radius:var(--radius-large)"><b>Card<small>--bg-card, --radius-large</small></b>
          <div class="pm-cd-step" style="background:var(--bg-input);border-color:transparent;border-radius:var(--radius-small)"><b>Row in a card<small>--bg-input, --radius-small, no edge</small></b>
            <div class="pm-cd-step" style="background:var(--bg-input);border-radius:var(--radius-small)"><b>Field<small>--bg-input, 1px --border, --radius-small</small></b></div>
          </div>
        </div>
      </div>
    </div>
    <div class="pm-cd-step" style="background:var(--bg);border-radius:var(--radius-large)"><b>The same, with a row that sits on a panel<small>not in a card</small></b>
      <div class="pm-cd-step" style="background:var(--bg-section);border-radius:var(--radius-large)"><b>Panel<small>--bg-section</small></b>
        <div class="pm-cd-step" style="background:var(--bg-card);border-radius:var(--radius-medium)"><b>Row on a panel<small>--bg-card, --radius-medium, 1px --border</small></b></div>
      </div>
    </div></div>
    <p class="pm-cd-note">Each box takes the next step from the one it sits on. In today's theme --bg-card and --bg-input are the same colour (the card follows the input shade until a theme sets it), so the last two steps look alike here; the Colour family proposes a card a little lighter than the field.</p>`);

  const anatomyBody = () => wrap(`<div class="pm-cd-two"><div>${CAPTION('Card')}${card({ tint: 'blue', icon: 'landmark', kicker: 'Sights', title: 'Louvre', sub: 'Paris, Day 2, 9:30', body: 'Book the timed entry before Friday.', foot: '<button type="button" class="btn btn-small btn-primary">Open</button>', menu: true })}</div>
    <div>${CAPTION('Row')}<div class="sdk-panel">${row({ tick: true, title: 'Book the flights', sub: 'Assigned to Sam', meta: 'Fri', menu: true })}</div></div></div>`);

  const cardStates = [
    ['Rest', { open: true }], ['Hover', { open: true, state: 'hover' }], ['Selected', { open: true, sel: true }], ['Focus', { open: true, state: 'focus' }],
    ['Pressed', { open: true, state: 'active' }], ['Dragging (shadow only now)', { drag: true }], ['Disabled', { dis: true }], ['Not clickable: no hover fill', {}],
  ];
  const cardStatesBody = () => wrap(`<div class="sdk-panel"><div class="pm-cd-grid">${cardStates.map(([n, o]) => `<div>${CAPTION(n)}${card(Object.assign({ title: 'Louvre', sub: 'Paris, Day 2, 9:30', menu: true }, o))}</div>`).join('')}</div></div>`);

  const TINTS = ['gold', 'blue', 'green', 'teal', 'purple', 'red', 'orange', 'pink'];
  const partsBody = () => wrap(`<div class="sdk-panel"><div class="pm-cd-grid">
    <div>${CAPTION('With the menu slot and one primary action')}${card({ title: 'Seine dinner', sub: 'Tonight, 8:00', body: 'Table for six near the river.', foot: '<button type="button" class="btn btn-small btn-primary">Confirm</button>', menu: true })}</div>
    <div>${CAPTION('Category: tint on the icon and its words')}${card({ tint: 'orange', icon: 'utensils', kicker: 'Food', title: 'Café Marly', sub: 'Open until 11', menu: true })}</div>
    <div>${CAPTION('Clickable: the whole card opens it')}${card({ tint: 'blue', icon: 'landmark', kicker: 'Sights', title: 'Louvre', sub: 'Open the place', open: true, menu: true })}</div>
    <div>${CAPTION('Plain: no icon, no menu')}${card({ title: 'Packing list', body: 'Passports, chargers, the folding umbrella.' })}</div>
    </div>
    <div class="pm-cd-cap" style="margin-top:14px">The eight category tints, on the icon chip</div>
    <div class="pm-cd-grid">${TINTS.map((t) => `<div>${card({ tint: t, icon: 'location-dot', kicker: t[0].toUpperCase() + t.slice(1), title: 'A place', sub: 'Nearby' })}</div>`).join('')}</div></div>`);

  const rowStates = [
    ['Rest', { open: true }], ['Hover', { open: true, state: 'hover' }], ['Selected', { open: true, sel: true }], ['Focus', { open: true, state: 'focus' }],
    ['Pressed', { open: true, state: 'active' }], ['Disabled', { dis: true }], ['Not clickable: no hover fill', {}],
  ];
  const rowStatesBody = () => wrap(`<div class="sdk-panel"><div class="pm-cd-grid">${rowStates.map(([n, o]) => `<div>${CAPTION(n)}${row(Object.assign({ title: 'Lunch at Café Marly', meta: '12:30', menu: true }, o))}</div>`).join('')}</div></div>`);

  const rowPartsBody = () => wrap(`<div class="sdk-panel"><div class="sdk-list">
    ${row({ title: 'Plain row' })}
    ${row({ tick: true, title: 'Book the flights', meta: 'Fri' })}
    ${row({ tick: 'on', title: 'Renew the passports', meta: 'Done' })}
    ${row({ tick: true, title: 'Reserve the Seine dinner', sub: 'Assigned to Sam', meta: 'Due Fri', action: 'Open', menu: true })}
    ${row({ tint: 'teal', icon: 'train', title: 'Train to Lyon', sub: '9:12, platform 4', meta: '2 h', menu: true })}
    ${row({ tint: 'gold', icon: 'hotel', title: 'Hôtel du Nord with a name long enough to be cut where the row ends', sub: 'Paris, 3 nights', menu: true })}
  </div><p class="pm-cd-note">The tick, the due label, the one action and the "..." menu, in that order. A row has at most one primary action.</p></div>`);

  const nestedBody = () => wrap(`<div class="sdk-panel"><div class="pm-cd-two">
    <div>${CAPTION('A card with a list of rows')}${card({ tint: 'blue', icon: 'calendar-day', kicker: 'Day 2', title: 'Paris', menu: true, list: [
      row({ title: 'Louvre', meta: '9:30', menu: true }), row({ title: 'Lunch at Café Marly', meta: '12:30', menu: true, sel: true }), row({ title: 'Seine walk', meta: '16:00', open: true, menu: true }),
    ].join('') })}</div>
    <div>${CAPTION('Rows on a panel, then a card')}<div class="sdk-list">${row({ title: 'Louvre', meta: '9:30', menu: true })}${row({ title: 'Seine walk', meta: '16:00', menu: true })}${card({ title: 'Notes', body: 'Nothing planned for the evening.' })}</div></div>
  </div></div>`);

  const phoneBody = () => wrap(`<div class="sdk-panel"><div class="sdk-list-group"><h4 class="sdk-group-head">Today<span class="sdk-group-count">3</span></h4><div class="sdk-list">
    ${row({ tick: true, title: 'Book the flights', meta: 'Fri', menu: true })}
    ${row({ tick: 'on', title: 'Renew the passports', menu: true })}
    ${row({ title: 'Louvre', sub: 'Paris, 9:30', open: true, menu: true })}
  </div></div></div>`);

  const homeBody = () => wrap(`<div class="sdk-panel"><div class="pm-cd-grid" style="grid-template-columns:repeat(auto-fill,minmax(240px,1fr))">
    <div>${CAPTION('Space card, 20px padding')}<div class="sdk-card sdk-card-home"><div class="sdk-card-image">${fa('image')}</div><div class="sdk-card-main"><h4 class="sdk-card-title">Paris in spring</h4><p class="sdk-card-sub">6 people, 4 modules</p></div><div class="sdk-card-foot"><button type="button" class="btn btn-primary">Open</button><button type="button" class="btn">Invite</button></div><span class="sdk-card-menu">${MENU}</span></div></div>
    <div>${CAPTION('Space card, hover')}<div class="sdk-card sdk-card-home ds-force-hover" aria-current="false"><div class="sdk-card-image">${fa('image')}</div><div class="sdk-card-main"><h4 class="sdk-card-title"><a class="sdk-open" href="#">Lisbon in June</a></h4><p class="sdk-card-sub">Whole card opens it</p></div><div class="sdk-card-foot"><button type="button" class="btn">Invite</button></div><span class="sdk-card-menu">${MENU}</span></div></div>
    <div>${CAPTION('Ghost: add')}<button type="button" class="sdk-card sdk-card-add">${fa('plus')}<span>Add a space</span></button></div>
    <div>${CAPTION('Ghost: hover')}<button type="button" class="sdk-card sdk-card-add ds-force-hover">${fa('plus')}<span>Add a space</span></button></div>
    <div>${CAPTION('Ghost: focus')}<button type="button" class="sdk-card sdk-card-add ds-force-focus">${fa('plus')}<span>Add a space</span></button></div>
  </div></div>`);

  const barsBody = () => wrap(`<div class="sdk-panel">
    <div class="pm-cd-two">
    <div><div class="pm-cd-cap">Chat message with a tint: the tint is on the portrait only</div><div class="pm-cd-stack">
      <div class="sdk-msg" data-tint="blue"><span class="sdk-portrait">${fa('map')}</span><div class="sdk-msg-body"><span class="sdk-msg-name">Maps<small>10:42</small></span><span>I found three cafés near the hotel.</span></div></div>
      <div class="sdk-msg" data-tint="gold"><span class="sdk-portrait">${fa('wand-magic-sparkles')}</span><div class="sdk-msg-body"><span class="sdk-msg-name">Assistant<small>10:43</small></span><span>Café Marly is open until 11.</span></div></div></div></div>
    <div><div class="pm-cd-cap">Chat link box: a neutral hairline and an icon</div>
      <div class="sdk-msg"><span class="sdk-portrait" data-tint="green">${fa('user')}</span><div class="sdk-msg-body"><span class="sdk-msg-name">Sam<small>10:45</small></span><span>This one looks good.</span>
      <div class="sdk-row" style="background:none"><span class="sdk-card-icon">${fa('link')}</span><span class="sdk-row-main"><span class="sdk-row-title">Café Marly, Paris</span><span class="sdk-row-sub">cafemarly.example</span></span></div></div></div></div>
    <div><div class="pm-cd-cap">Option help callout: a neutral hairline and an icon</div>
      <div class="sdk-callout">${fa('circle-info')}<span>Guests can see this space but cannot add to it.</span></div>
      <div class="pm-cd-cap" style="margin-top:12px">Toast: the same rule (its own look comes with the Toasts family)</div>
      <div class="sdk-callout">${fa('circle-check')}<span>Saved.</span></div></div>
    <div><div class="pm-cd-cap">Host console environment: a status word</div><div class="pm-cd-stack">
      ${card({ title: 'Harbour Games', sub: 'harbour.example.com', foot: '<span class="sdk-status-word">Active</span>', menu: true })}
      ${card({ title: 'Cliffside Club', sub: 'cliffside.example.com', foot: '<span class="sdk-status-word">Past due</span>', menu: true })}
      ${card({ title: 'Old Town Tours', sub: 'oldtown.example.com', foot: '<span class="sdk-status-word">Suspended</span>', menu: true })}</div>
      <p class="pm-cd-note">The word is a plain placeholder. The status chip itself belongs to the Chips family.</p></div>
    </div>
    <div class="pm-cd-cap" style="margin-top:16px">Exception, kept: Calendar's agenda rows and event markers keep their left bar (Thomas, 2026-10-18)</div>
    <div class="sdk-list" data-exception="calendar">
      ${row({ cls: [], bar: true, tint: 'blue', title: 'Team call', sub: 'Agenda row', meta: '9:00' })}
      ${row({ bar: true, tint: 'orange', title: 'Dinner with Sam', sub: 'Outside event (.item.ext)', meta: '19:30' })}
      ${row({ bar: true, tint: 'purple', title: 'Visa deadline', sub: 'Marker (.item.marker)', meta: 'All day' })}
      <div class="pm-cd-note">Seen nowhere else on this page. The bar is a 3px block in the event's colour, not a border; the row keeps the same hairline, fill and corner as every other row. Event chips in the month (.chip.ext, .chip.marker) are the same exception.</div>
    </div></div>`);

  const emptyBody = () => wrap(`<div class="pm-cd-two">
    <div class="sdk-panel"><div class="pm-cd-cap">Empty state: icon, one short line, an optional button</div>
      <div class="sdk-empty">${fa('list-check')}<p>Nothing to do yet.</p><button type="button" class="btn btn-primary">Add a task</button></div></div>
    <div class="sdk-panel"><div class="pm-cd-cap">Without the button</div>
      <div class="sdk-empty">${fa('magnifying-glass')}<p>No places match.</p></div></div>
    <div class="sdk-panel" style="grid-column:1/-1"><div class="pm-cd-cap">Group header: 12px, weight 600, muted, letter-spaced, with the divider</div>
      <div class="sdk-list-group"><h4 class="sdk-group-head">Today<span class="sdk-group-count">3</span></h4><div class="sdk-list">${row({ title: 'Louvre', meta: '9:30', menu: true })}${row({ title: 'Lunch at Café Marly', meta: '12:30', menu: true })}</div></div>
      <div class="sdk-list-group"><h4 class="sdk-group-head">Later</h4><div class="sdk-list">${row({ title: 'Seine walk', meta: '16:00', menu: true })}</div></div></div></div>`);

  const SW = (a) => `<button type="button" class="sdk-tab" aria-pressed="${a[1]}"${a[3] ? ` aria-label="${a[0]}" title="${a[0]}"` : ''}><i class="sdk-tab-glyph fa-solid fa-${a[2]}" aria-hidden="true"></i><span class="sdk-tab-word">${a[0]}</span></button>`;
  const contextBody = (narrow) => wrap(`<div class="sdk-panel" style="min-width:0">
    <div class="pm-cd-tool"><button type="button" class="btn btn-primary">${fa('plus')}Add</button>
      <div class="sdk-tabs sdk-tabs-joined${narrow ? ' sdk-tabs-compact' : ''}" role="group" aria-label="View">${[['List', 'true', 'list', narrow], ['Day', 'false', 'calendar-day', narrow], ['Map', 'false', 'map', narrow]].map(SW).join('')}</div>
      <div class="sdk-search">${fa('magnifying-glass')}<input type="search" aria-label="Search" placeholder="Search"></div></div>
    <div class="sdk-list-group"><h4 class="sdk-group-head">Today<span class="sdk-group-count">3</span></h4><div class="sdk-list">
      ${row({ tick: true, title: 'Book the flights', meta: 'Fri', menu: true })}
      ${row({ tick: 'on', title: 'Renew the passports', meta: 'Done', menu: true })}
      ${row({ tick: true, title: 'Reserve the Seine dinner', meta: 'Due Fri', action: 'Open', menu: true, sel: true })}
    </div></div>
    <div class="sdk-list-group"><h4 class="sdk-group-head">Day 2 in Paris<span class="sdk-group-count">2 places</span></h4>
      ${card({ tint: 'blue', icon: 'landmark', kicker: 'Sights', title: 'Louvre', sub: '9:30 to 12:00', menu: true, list: [row({ title: 'Timed entry booked', meta: 'Done', menu: true }), row({ title: 'Audio guide', meta: '5 EUR', menu: true })].join(''), foot: '<button type="button" class="btn btn-small btn-primary">Open</button>' })}
    </div></div>`);

  const aliasBody = () => wrap(`<div class="pm-cd-two">
    <div class="sdk-panel"><div class="pm-cd-cap">Old names, no markup change</div>
      <div class="section"><div class="card"><h4 class="sdk-card-title">.section and .card</h4><p class="sdk-card-body">The shared card and section.</p></div>
      <div class="tile"><h4 class="sdk-card-title">.tile</h4><p class="sdk-card-body">The Budget tile, with the same hairline.</p></div>
      <div class="rcard"><h4 class="sdk-card-title">.rcard</h4><p class="sdk-card-body">Research: no gradient, no lift.</p><div class="place-row">.place-row inside a card</div></div>
      <div class="place-row">.place-row on a panel</div><div class="cat-line">.cat-line</div><div class="result">.result</div></div></div>
    <div class="sdk-panel"><div class="pm-cd-cap">Empty states and callouts</div>
      <div class="empty">${fa('inbox')}<p>.empty</p></div><div class="rs-empty">${fa('inbox')}<p>.rs-empty</p></div><div class="state">${fa('inbox')}<p>.state</p></div>
      <div class="option-help">${fa('circle-info')}<span>.option-help, a hairline and an icon</span></div></div></div>`);

  const CT_ROWS = [
    ['Body text on the panel', '--text', ['--bg-section'], 4.5],
    ['Body text on a card', '--text', ['--bg-card'], 4.5],
    ['Body text on a row inside a card', '--text', ['--bg-input'], 4.5],
    ['Muted text on the panel (group header, count)', '--text-dim', ['--bg-section'], 4.5],
    ['Muted text on a card (sub line, due label)', '--text-dim', ['--bg-card'], 4.5],
    ['Muted text on a row inside a card', '--text-dim', ['--bg-input'], 4.5],
    ['Text on the selected fill, over a card', '--text', ['--bg-card', '--selected-bg'], 4.5],
    ['Muted text on the selected fill (the stronger mix)', 'color-mix(in srgb, var(--text) 78%, var(--text-dim))', ['--bg-card', '--selected-bg'], 4.5],
    ['Focus outline (accent) on a card', '--accent', ['--bg-card'], 3],
    ['Focus outline (accent mix) on the selected fill', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg-card', '--selected-bg'], 3],
    ['Hairline on the panel', '--border', ['--bg-section'], 1],
    ['Hairline on the page', '--border', ['--bg'], 1],
  ].concat(TINTS.map((t) => [`Tint icon, ${t}, on its chip over a card`, `color-mix(in srgb, var(--tint-${t}) 62%, var(--text))`, ['--bg-card', `color-mix(in srgb, var(--tint-${t}) 18%, transparent)`], 3]));
  const contrastBody = () => wrap(`<table class="pm-cd-ct"><thead><tr><th>Pair</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${CT_ROWS.map((r) => `<tr data-fg="${h(r[1])}" data-bgs="${h(JSON.stringify(r[2]))}" data-min="${r[3]}"><td>${r[0]}</td><td data-out="r"></td><td>${r[3] === 1 ? 'info' : r[3] + ':1'}</td><td data-out="p"></td></tr>`).join('')}</tbody></table>`);
  const measureContrast = (doc) => {
    const host = doc.querySelector('.ds-proposed');
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const col = (expr) => { const p = doc.createElement('span'); p.style.color = expr.startsWith('--') ? `var(${expr})` : expr; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (d) => 0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]);
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-cd-ct tbody tr')) {
        g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillRect(0, 0, 1, 1); g.clearRect(0, 0, 1, 1);
        for (const l of JSON.parse(tr.dataset.bgs)) { g.fillStyle = col(l); g.fillRect(0, 0, 1, 1); }
        const base = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        g.fillStyle = col(tr.dataset.fg); g.fillRect(0, 0, 1, 1);
        const top = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        const a = lum(top); const b = lum(base);
        const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const min = Number(tr.dataset.min); const p = tr.querySelector('[data-out="p"]');
        p.textContent = min === 1 ? 'Info' : r >= min ? 'Passes' : 'Fails'; p.className = min === 1 ? '' : r >= min ? 'pm-cd-pass' : 'pm-cd-fail';
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  function renderCards(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="cards-h"><a href="#cards">Cards, panels and rows</a></h3><span class="ds-status-chip ds-st-approved">Approved</span><span class="ds-count">the panel, the card, the row, the group header and the empty state; Home's space card and the ghost slot</span></header>
<p class="ds-desc"><b>Approved 2026-10-19, from Thomas's decisions of 2026-10-18 and 2026-10-19.</b> (1) One card and one row look: a 1px neutral hairline (<code>--border</code>), no shadow. (2) Hover and selected are quiet fills; selected is <code>--selected-bg</code>. (3) Surfaces step down: page <code>--bg</code>, panel <code>--bg-section</code>, card <code>--bg-card</code>, a row inside a card and a field <code>--bg-input</code>; a row inside a card drops its own edge. (4) The Planner, Places and Research cards lose the gradient, the coloured edge and the lift; the category colour stays on the icon chip and its words. (5) A "..." menu sits in a fixed top-right slot on a card and at the end of a row; a card or row has at most one primary action. (6) A row is 44px high on a phone. (7) Coloured left bars become fills, icons and words, except Calendar's agenda rows and event markers. What was chosen beyond that is listed under "Decided 2026-10-19" (the radii, the paddings, the group header and the ghost slot, which Thomas accepted as a start and may tune later) and "Taken as drawn".</p>
<nav class="ds-toc" aria-label="In this family"><a href="#cards-anatomy">Anatomy</a><a href="#cards-steps">Surface steps</a><a href="#cards-states">Card states</a><a href="#cards-parts">Card parts</a><a href="#cards-rowstates">Row states</a><a href="#cards-rowparts">Row parts</a><a href="#cards-nested">Rows in a card</a><a href="#cards-phone">On a phone</a><a href="#cards-home">Home card and ghost</a><a href="#cards-bars">Left bars</a><a href="#cards-empty">Empty state and group header</a><a href="#cards-context">In context</a><a href="#cards-contrast">Contrast</a><a href="#cards-map">Today to proposed</a><a href="#cards-alias">Aliases</a><a href="#cards-tokens">Tokens</a><a href="#cards-contract">Markup</a><a href="#cards-widths">Widths</a><a href="#cards-decide">Decided 2026-10-19</a><a href="#cards-taken">Taken as drawn</a></nav>

<h4 class="ds-h4" id="cards-anatomy">Anatomy</h4>
<div data-slot="anatomy"></div>
${dim([
    ['1 Surface', 'A 1px <code>--border</code> hairline, no shadow, no gradient. Panel and card <code>--radius-large</code>; a row on a panel <code>--radius-medium</code>; a row inside a card <code>--radius-small</code>.'],
    ['2 Padding', 'Row 8px by 10px. Card 12px. Panel 14px (16px wider than a phone). Home\'s space card 20px, its own larger variant.'],
    ['3 Spacing', 'One rule: 8px between things (inside a card or a row, and between cards or rows), 16px between groups.'],
    ['4 Icon chip', 'Optional. 32px in a card, 28px in a row; <code>--radius-small</code>. The category tint is a quiet fill behind the icon and the icon itself; nothing else is coloured.'],
    ['5 Title and lines', 'Title 14px, weight 600 in a card; weight 500 in a row. Sub line 12px <code>--text-dim</code>. Body 13px. A row\'s title is cut with an ellipsis; a card\'s wraps.'],
    ['6 Menu slot', 'A "..." button, the approved icon-only Quiet small button (30px). On a card a fixed slot 8px from the top and right, which the title leaves room for. On a row, the last thing. 44px hit area on a phone.'],
    ['7 One action', 'At most one primary action inline: a Primary small button in a card\'s foot, or the one action before a row\'s menu. Everything else goes in the menu.'],
    ['8 Focus', 'Where the whole box opens something: a 2px <code>--accent</code> outline drawn over the hairline, inside the box (offset -2px): the Fields and Tabs mechanism, equal on all four sides at any display scale (measured at 1.25 and 1.5).'],
  ])}

<h4 class="ds-h4" id="cards-steps">Surface steps</h4>
<p class="ds-desc">Page, panel, card, a row inside a card and a field, drawn as nested boxes in the current mode. A thing takes the next step from what it sits on; only a row on a panel (not in a card) keeps its hairline.</p>
<div data-slot="steps"></div>

<h4 class="ds-h4" id="cards-states">Card states</h4>
<p class="ds-desc">Hover is a quiet neutral fill (<code>--text</code> at 8% over the card). Selected is <code>--selected-bg</code>; selected and hovered is the accent at 38%, as in the Tabs. Pressed is a step darker. A card that does not open anything has no hover fill. The shadow (<code>--shadow-1</code>, a proposed token) appears only while a card is dragged. Disabled is half strength.</p>
<div data-slot="states"></div>

<h4 class="ds-h4" id="cards-parts">Card parts</h4>
<div data-slot="parts"></div>

<h4 class="ds-h4" id="cards-rowstates">Row states</h4>
<p class="ds-desc">The same states, the same fills. A row on a panel keeps its hairline.</p>
<div data-slot="rowstates"></div>

<h4 class="ds-h4" id="cards-rowparts">Row parts</h4>
<div data-slot="rowparts"></div>

<h4 class="ds-h4" id="cards-nested">Rows in a card</h4>
<p class="ds-desc">A row inside a card drops its edge, takes <code>--bg-input</code> and the <code>--radius-small</code> corner. A row on a panel keeps the hairline on <code>--bg-card</code> and <code>--radius-medium</code>.</p>
<div data-slot="nested"></div>

<h4 class="ds-h4" id="cards-phone">On a phone (390 wide)</h4>
<p class="ds-desc">A row is 44px high. The tick has a 44px hit area; the "..." button keeps its 30px look with a 44px hit area (Buttons). The whole row is a target where it opens something.</p>
<div data-slot="phone"></div>

<h4 class="ds-h4" id="cards-home">Home space card and the ghost slot</h4>
<p class="ds-desc">The space card is the card with 20px of padding, the space name in the headline font, buttons at the default height (38px, 44px on a phone; today's are 40px), one Primary at most, and the "..." slot for the rest. The ghost "add" slot keeps its place beside the cards as a variant of the card: a dashed neutral hairline (<code>--border</code>), no fill, a quiet hover fill, the same focus outline.</p>
<div data-slot="home"></div>

<h4 class="ds-h4" id="cards-bars">What replaces a coloured left bar</h4>
${tbl(['Where', 'Today', 'Proposed'], [
    ['Chat message with a tint', 'A 3px bar in the tint on the left', 'A neutral message. The tint is on the portrait icon only (a quiet tint behind the glyph).'],
    ['Chat link box', 'A tinted bar', 'A neutral hairline and an icon.'],
    ['Option help callout (<code>.option-help</code>)', 'A bar', 'A neutral hairline and an icon. Drawn here.'],
    ['Toast', 'A bar', 'A neutral hairline and an icon. The toast\'s own look (shadow, place, timing) belongs to the later Toasts family; only the rule is drawn here.'],
    ['Host console environment', 'A 4px bar in the status colour', 'A status word: Active, Past due or Suspended. A plain placeholder label is drawn; the status chip belongs to the Chips family, built at the same time.'],
    ['Calendar agenda rows and event markers', 'A bar in the event\'s colour', '<b>Exception, kept</b> (Thomas, 2026-10-18): <code>.item</code>, <code>.item.ext</code>, <code>.item.marker</code>, <code>.chip.ext</code>, <code>.chip.marker</code>. Drawn below, flagged, and used nowhere else.'],
  ])}
<div data-slot="bars" style="margin-top:12px"></div>

<h4 class="ds-h4" id="cards-empty">Empty state and group header</h4>
<p class="ds-desc">An empty state is a text-only block, no box: an icon, one short line, an optional button. One look for <code>.empty</code>, <code>.rs-empty</code> and <code>.state</code>. A group header is 12px, weight 600, <code>--text-dim</code>, upper case with <code>--ls-label</code> (0.04em, a proposed token), and a hairline under it (the divider). Today's three (12px dim, 13px bold, 11px) become this one.</p>
<div data-slot="empty"></div>

<h4 class="ds-h4" id="cards-context">In context</h4>
<p class="ds-desc">A module panel with a toolbar (the approved Primary button, the joined view switch and the search field), group headers, rows with a tick, a due label, an action and a menu, and a card with a nested list.</p>
<div data-slot="context"></div>

<h4 class="ds-h4" id="cards-contrast">Contrast</h4>
<p class="ds-desc">Worked out in the page from the computed colours, in the current mode (WCAG 2). Text needs 4.5 to 1, an icon or an outline 3 to 1.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="cards-map">Today to proposed</h4>
${tbl(['Today', 'Proposed'], [
    ['Shared <code>.card</code> (host.css:261) and <code>.section</code> (:268)', '<code>.sdk-card</code> and <code>.sdk-panel</code>. Hairline, no shadow, the surface steps.'],
    ['Planner <code>.card</code> (336 rules), Places <code>.place-row</code>, Research <code>.rcard</code>: tinted gradient, coloured edge, lift', 'The card or the row. No gradient, no coloured edge, no lift. The category colour is on the icon chip and its words.'],
    ['Polls card; Budget <code>.tile</code> (no border)', '<code>.sdk-card</code>, with the hairline.'],
    ['Home space card: <code>--bg-section</code>, shadow, accent edge on hover, 20px padding, 40px buttons', '<code>.sdk-card.sdk-card-home</code>: <code>--bg-card</code>, hairline, no shadow, a quiet hover fill, 20px padding, default-height buttons, the "..." slot.'],
    ['The add-space ghost card (2px dashed)', '<code>.sdk-card-add</code>: kept as the add variant, with a dashed neutral 1px hairline.'],
    ['Sign-in <code>.panel</code>; <code>.user-card</code>; member avatar tile; overlay card; picker card; module settings card; editor card (restated in 7 modules)', 'The panel or the card. The editor card is stated once.'],
    ['Chat message and chat link box', 'A neutral message with a tint on the portrait; a link box with a hairline and an icon.'],
    ['<code>.empty</code>, <code>.rs-empty</code>, <code>.state</code>', '<code>.sdk-empty</code>: a text-only block with an icon, one line and an optional button.'],
    ['To-do row (accent edge on hover)', '<code>.sdk-row</code>: a quiet fill on hover.'],
    ['Calendar agenda row (flat, bottom hairline, accent bar)', '<code>.sdk-row</code> with the bar kept: the approved exception.'],
    ['Poll option; Decision row; search result; Manage list row; Found row; switch row; module list item; Itinerary row; Research list row; Budget category line', '<code>.sdk-row</code>. Selected is <code>--selected-bg</code>, never an edge or a gradient.'],
    ['Group headers: uppercase 12px dim <code>h4</code>, 13px bold, 11px', '<code>.sdk-group-head</code>: 12px, weight 600, <code>--text-dim</code>, <code>--ls-label</code>, with the divider.'],
    ['Left bars on chat, the link box, the toast, the option help and the host environment', 'Fills, icons and words (above). Calendar keeps its bar.'],
  ])}

<h4 class="ds-h4" id="cards-alias">Aliases</h4>
<p class="ds-desc">Today's names take the new look without a markup change (the rule is the contract <code>.sdk-*</code>, the older names are aliases). Names too general to alias (the To-do <code>.row</code>, the Calendar <code>.item</code>, Planner's own classes) join by editing the markup, or by the module adding the <code>sdk-</code> class beside the old one.</p>
${tbl(['Component', 'New name', 'Older names that take the same rules'], [
    ['Panel', '<code>.sdk-panel</code>', '<code>.section</code> <code>.panel</code>'],
    ['Card', '<code>.sdk-card</code>', '<code>.card</code> <code>.tile</code> <code>.rcard</code> <code>.user-card</code> <code>.module-settings-card</code> <code>.editor-card</code> <code>.bgpick-card</code> <code>.aside-overlay-card</code> <code>.space-choice</code> (Home\'s, with the larger padding)'],
    ['Home card variants', '<code>.sdk-card-home</code> <code>.sdk-card-add</code>', '<code>.space-choice</code> <code>.space-choice-add</code>'],
    ['Row', '<code>.sdk-row</code>', '<code>.place-row</code> <code>.cat-line</code> <code>.result</code> <code>.switch-row</code> <code>.module-display-row</code> <code>.opt</code>'],
    ['Group header', '<code>.sdk-group-head</code>', 'the <code>h4</code> of a list'],
    ['Empty state', '<code>.sdk-empty</code>', '<code>.empty</code> <code>.rs-empty</code> <code>.state</code>'],
    ['Callout', '<code>.sdk-callout</code>', '<code>.option-help</code>'],
  ])}
<div data-slot="alias"></div>

<h4 class="ds-h4" id="cards-tokens">Tokens</h4>
${tbl(['Token', 'Value', 'Used for'], [
    ['<code>--bg</code> <code>--bg-section</code> <code>--bg-card</code> <code>--bg-input</code>', 'the theme\'s', 'The surface steps: page, panel, card, a row inside a card and a field.'],
    ['<code>--border</code>', 'the theme\'s', 'The one hairline (a divider uses it on one side).'],
    ['<code>--selected-bg</code>', 'the theme\'s', 'A selected card or row.'],
    ['<code>--radius-large</code> <code>--radius-medium</code> <code>--radius-small</code>', '11px, 7px, 5px', 'Card and panel; a row on a panel; a row in a card and the icon chip.'],
    ['<code>--card-pad</code> <code>--panel-pad</code> <code>--home-pad</code>', '12px, 14px (16px wider than a phone), 20px', 'Padding. Proposed tokens.'],
    ['<code>--row-pad-y</code> <code>--row-pad-x</code>', '8px, 10px', 'A row\'s padding. Proposed tokens.'],
    ['<code>--gap-in</code> <code>--gap-group</code>', '8px, 16px', 'The one spacing rule. Proposed tokens.'],
    ['<code>--ls-label</code>', '0.04em', 'Group header letter spacing. Proposed token.'],
    ['<code>--shadow-1</code>', '0 2px 8px, black at 28%', 'A card while it is dragged. Smaller than the menu\'s <code>--shadow-2</code> (<code>0 4px 12px</code>). Proposed token (the plan\'s elevation scale).'],
    ['<code>--tint-*</code>', 'the eight tints', 'The icon chip and the category words.'],
  ])}

<h4 class="ds-h4" id="cards-contract">Markup</h4>
${code(`<section class="sdk-panel">
  <div class="sdk-list-group">
    <h4 class="sdk-group-head">Today<span class="sdk-group-count">3</span></h4>
    <div class="sdk-list">
      <div class="sdk-row">
        <label class="sdk-row-tick"><input type="checkbox" aria-label="Done: Book the flights"></label>
        <span class="sdk-row-main"><span class="sdk-row-title"><a class="sdk-open" href="#">Book the flights</a></span></span>
        <span class="sdk-row-meta">Fri</span>
        <button type="button" class="sdk-icon-btn btn-small btn-quiet" aria-label="More">...</button>
      </div>
    </div>
  </div>
  <div class="sdk-card" data-tint="blue">
    <div class="sdk-card-head">
      <span class="sdk-card-icon">icon</span>
      <div class="sdk-card-main"><h4 class="sdk-card-title"><a class="sdk-open" href="#">Louvre</a></h4><p class="sdk-card-sub">Paris, 9:30</p></div>
    </div>
    <div class="sdk-card-list"><div class="sdk-row">...</div></div>
    <div class="sdk-card-foot"><button class="btn btn-small btn-primary">Open</button></div>
    <span class="sdk-card-menu"><button class="sdk-icon-btn btn-small btn-quiet" aria-label="More">...</button></span>
  </div>
  <div class="sdk-empty"><i class="fa-solid fa-list-check"></i><p>Nothing to do yet.</p><button class="btn btn-primary">Add a task</button></div>
</section>`)}
${dim([
    ['Clickable', 'Put <code>.sdk-open</code> on the one link or button in the box (the title). Its <code>::after</code> covers the whole card or row; the "..." button, the action and the tick sit above it. The box shows the hover fill and the focus outline. A box with no <code>.sdk-open</code> has neither.'],
    ['Selected', '<code>aria-current="true"</code>, <code>aria-selected="true"</code> or <code>.on</code>.'],
    ['Category', '<code>data-tint="blue"</code> (gold, blue, green, teal, purple, red, orange or pink) on the card or row. It colours the icon chip and <code>.sdk-tint-text</code>, nothing else.'],
    ['Dragging', '<code>.is-dragging</code> on the card or row while it moves.'],
    ['The exception', '<code>.sdk-bar-kept</code> on a Calendar agenda row. Nowhere else.'],
  ])}

<h4 class="ds-h4" id="cards-widths">Widths</h4>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="cards-decide">Decided 2026-10-19</h4>
<p class="ds-desc">Thomas approved these on 2026-10-19 and said "we can start with this" about the radii and the paddings, so those two may be tuned later without reopening the family.</p>
${tbl(['Decided 2026-10-19', 'Why', 'Other way, if tuned later'], [
    ['Radii: card and panel large, a row on a panel medium, a row in a card small', 'Each box inside another has a smaller corner, so the corners stay concentric.', 'Make the card medium and the row small everywhere.'],
    ['Padding: card 12, panel 14 and 16, row 8 by 10, Home card 20', 'Matches what the modules mostly use today.', 'Card 16 for air.'],
    ['Group header: 12px, weight 600, muted, upper case, 0.04em, with a hairline under it', 'The most common of the three today, and the divider is part of the decision.', 'Sentence case with no letter spacing; no hairline.'],
    ['The ghost add slot is a dashed neutral hairline with no fill', 'The add variant keeps its dashed edge, quiet like the rest.', 'A solid hairline.'],
  ])}

<h4 class="ds-h4" id="cards-taken">Taken as drawn</h4>
${tbl(['Drawn', 'Why', 'Other way'], [
    ['One spacing rule: 8px between things, 16px between groups', 'One number a module can remember.', 'Cards 12px apart.'],
    ['Hover is the text colour at 8% over the surface; selected is <code>--selected-bg</code> as it is (translucent over what is behind)', 'The same quiet fills as the buttons and tabs.', 'Selected on a card mixed over the card\'s own fill.'],
    ['The word for muted text in code is <code>--text-dim</code>', 'The product has no <code>--text-muted</code>; the Colour family\'s "Muted text" role is <code>--text-dim</code>.', 'Rename the token when Colour moves in.'],
    ['In today\'s theme the card and the field are the same colour', 'The product sets <code>--bg-card</code> to the input shade. The steps are tokens, so they separate when a theme or the Colour family does.', 'Decide the card shade in Colour.'],
    ['The chat message is neutral, with the tint on the portrait only', 'Your later note; the plan says "a tint fill" for the message.', 'A quiet tint fill on the whole message.'],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + CD_CSS }, o || {}));
    slot('anatomy').appendChild(F(anatomyBody(), 'Cards, anatomy'));
    slot('steps').appendChild(F(stepsBody(), 'Cards, surface steps'));
    slot('states').appendChild(F(cardStatesBody(), 'Cards, states'));
    slot('parts').appendChild(F(partsBody(), 'Cards, parts'));
    slot('rowstates').appendChild(F(rowStatesBody(), 'Rows, states'));
    slot('rowparts').appendChild(F(rowPartsBody(), 'Rows, parts'));
    slot('nested').appendChild(F(nestedBody(), 'Cards, nested rows'));
    slot('phone').appendChild(F(phoneBody(), 'Rows, on a phone', { pinWidth: 390 }));
    slot('home').appendChild(F(homeBody(), 'Cards, Home card and ghost'));
    slot('bars').appendChild(F(barsBody(), 'Cards, left bar replacements'));
    slot('empty').appendChild(F(emptyBody(), 'Cards, empty and group header'));
    slot('context').appendChild(F(contextBody(false), 'Cards, in context'));
    slot('contrast').appendChild(F(contrastBody(), 'Cards, contrast', { onload: measureContrast }));
    slot('alias').appendChild(F(aliasBody(), 'Cards, aliases'));
    const ws = mk('div', '');
    for (const w of [390, 700, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(contextBody(w <= 500), `Cards at ${w}`, { pinWidth: w }));
    }
    slot('widths').appendChild(ws);
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'cards', covers: ['card', 'panel', 'row', 'section', 'tile', 'empty', 'group-head', 'home-card', 'ghost'], group: 'Containers', name: 'Cards, panels and rows', status: 'approved',
    words: 'cards card panel rows row list tile section group header heading divider empty state ghost add home space card callout option help toast message link box exception calendar left bar surface step hairline shadow selected hover menu slot tick due phone 44', render: renderCards,
  });
})();
