/* The Phone bottom bar family (proposed): one tab bar for the space bar and the destination bar, an icon over a label, with the fold into a "..." tab. Loaded by
   proposed.html through proposed-families.json; it registers one family through window.DS_PROPOSED.families.push and draws it with the rules in proposed-tabbar.css.
   Nothing here is a style of the product: markup, words, tables, and a small script that shows how the bar folds the tabs that do not fit (the product's own is
   fitSecondary in public/nav-bar.js). How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules, from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // Layout of the example pages only (not a style of the product).
  const TB_CSS = `
.pm-tb-cap { display: block; margin: 14px 0 5px; color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-tb-cap:first-child { margin-top: 0; }
.pm-tb-bleed { margin: 0 -14px; }
.pm-tb-note { margin: 8px 0 0; color: var(--text-dim); font-size: 12px; }
.pm-tb-phone { box-sizing: border-box; display: flex; flex-direction: column; border: 1px solid var(--border); border-radius: var(--radius-large); overflow: hidden; background: var(--bg); }
.pm-tb-ruler { display: grid; grid-template-columns: 390px minmax(0, 1fr); gap: 20px; align-items: start; }
.pm-tb-legend { margin: 0; padding: 0; list-style: none; font-size: 12px; color: var(--text-dim); display: grid; gap: 8px; }
.pm-tb-legend b { color: var(--text); font-weight: 600; }
.pm-tb-top { display: flex; align-items: center; gap: 8px; box-sizing: border-box; height: 48px; padding: 0 12px; background: var(--header-bg); color: var(--header-text); font-family: var(--font-head, inherit); font-size: 18px; font-weight: 600; }
.pm-tb-body { flex: 1 1 auto; min-height: 0; padding: 8px; }
.pm-tb-ct { border-collapse: collapse; width: 100%; font-size: 12px; }
.pm-tb-ct th, .pm-tb-ct td { padding: 4px 8px 4px 0; text-align: left; border-bottom: 1px solid var(--border); }
.pm-tb-ct th { color: var(--text-dim); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.pm-tb-pass { color: var(--ok); font-weight: 600; }
.pm-tb-fail { color: var(--danger); font-weight: 600; }
@media (max-width: 800px) { .pm-tb-ruler { grid-template-columns: minmax(0, 1fr); } }
`;

  const wrap = (inner) => `<div class="ds-proposed">${inner}</div>`;
  const CAP = (s) => `<span class="pm-tb-cap">${s}</span>`;
  const MODS = [['Conference', 'video'], ['Chat', 'comments'], ['To-do', 'list-check'], ['Planner', 'route'], ['Maps', 'map'], ['Budget', 'wallet'], ['Notes', 'note-sticky']];

  // A tab. o: label, icon, cur, state (hover | active | focus), badge, dot, role, dis, pin, name.
  const tab = (o) => `<button type="button" class="sdk-tabbar-tab${o.state ? ' ds-force-' + o.state : ''}"${o.cur ? ' aria-current="page"' : ''}${o.role ? ` data-role="${o.role}"` : ''}${o.pin ? ' data-pin="1"' : ''}${o.dis ? ' disabled' : ''}${o.badge || o.dot || o.name ? ` aria-label="${h(o.name || (o.label + (o.badge ? ', ' + o.badge + ' new' : ', new')))}"` : ''}><span class="sdk-tabbar-glyph">${fa(o.icon)}${o.badge ? `<span class="sdk-badge-micro" aria-hidden="true">${o.badge}</span>` : ''}${o.dot ? '<span class="sdk-dot sdk-dot-corner" aria-hidden="true"></span>' : ''}</span><span class="sdk-tabbar-label">${o.label}</span></button>`;
  const bar = (tabs, o = {}) => `<nav class="sdk-tabbar"${o.fold ? ' data-fold="1"' : ''} aria-label="${o.label || 'Space'}"${o.style ? ` style="${o.style}"` : ''}>${tabs.map((t) => tab(t)).join('')}</nav>`;
  const mods = (n, o = {}) => MODS.slice(0, n).map(([label, icon], i) => ({ label, icon, cur: i === (o.cur == null ? 1 : o.cur), badge: o.badges && i === 1 ? 3 : o.badges && i === 2 ? 12 : 0, dot: o.badges && i === 3 }));

  // ---- the fold: what fitSecondary does in the product. The tabs that do not fit go into a "..." tab; the current tab keeps its place; a pinned tab never folds. ----
  const fit = (nav) => {
    const tabs = [...nav.querySelectorAll(':scope > .sdk-tabbar-tab:not(.sdk-tabbar-more)')];
    let more = nav.querySelector(':scope > .sdk-tabbar-more'); let menu = nav.querySelector(':scope > .sdk-tabbar-menu');
    for (const t of tabs) t.hidden = false;
    if (more) more.hidden = true;
    if (menu) menu.remove();
    const c = getComputedStyle(nav); const inner = nav.clientWidth - parseFloat(c.paddingLeft) - parseFloat(c.paddingRight);
    const slots = Math.floor((inner + 2) / 58);
    if (tabs.length <= slots) return;
    const pinned = tabs.filter((t) => t.dataset.pin); const free = tabs.filter((t) => !t.dataset.pin);
    const room = Math.max(1, slots - pinned.length - 1);
    let keep = free.slice(0, room); const cur = free.find((t) => t.getAttribute('aria-current') === 'page');
    if (cur && !keep.includes(cur)) keep = keep.slice(0, room - 1).concat(cur);
    for (const t of free) t.hidden = !keep.includes(t);
    const folded = free.filter((t) => t.hidden);
    if (!more) {
      more = nav.ownerDocument.createElement('button'); more.type = 'button'; more.className = 'sdk-tabbar-tab sdk-tabbar-more'; more.setAttribute('aria-haspopup', 'menu'); more.setAttribute('aria-expanded', 'false');
      more.innerHTML = `<span class="sdk-tabbar-glyph">${fa('ellipsis')}</span><span class="sdk-tabbar-label">More</span>`;
      const firstPinned = pinned[0]; if (firstPinned) nav.insertBefore(more, firstPinned); else nav.appendChild(more);
    }
    more.hidden = false;
    const news = folded.filter((t) => t.querySelector('.sdk-badge-micro, .sdk-dot')); const g = more.querySelector('.sdk-tabbar-glyph');
    for (const d of g.querySelectorAll('.sdk-dot')) d.remove();
    if (news.length) { g.insertAdjacentHTML('beforeend', '<span class="sdk-dot sdk-dot-corner" aria-hidden="true"></span>'); more.setAttribute('aria-label', 'More, new in ' + news.length); } else more.removeAttribute('aria-label');
    nav.insertAdjacentHTML('beforeend', `<div class="sdk-menu sdk-tabbar-menu" role="menu" aria-label="More" hidden>${folded.map((t, i) => `<button type="button" class="sdk-menu-item" role="menuitem" data-i="${free.indexOf(t)}"><span class="sdk-menu-icon">${t.querySelector('.sdk-tabbar-glyph > i').outerHTML}</span><span class="sdk-menu-label">${t.querySelector('.sdk-tabbar-label').textContent}</span>${t.querySelector('.sdk-badge-micro') ? `<span class="sdk-menu-hint">${t.querySelector('.sdk-badge-micro').textContent}</span>` : ''}</button>`).join('')}</div>`);
  };
  const wire = (doc) => {
    const bars = [...doc.querySelectorAll('.sdk-tabbar[data-fold]')];
    const run = () => { for (const b of bars) fit(b); };
    run(); if (doc.fonts) doc.fonts.ready.then(run); doc.defaultView.addEventListener('resize', run);
    for (const b of bars) {
      const close = () => { const m = b.querySelector(':scope > .sdk-tabbar-menu'); const mo = b.querySelector(':scope > .sdk-tabbar-more'); if (m) m.hidden = true; if (mo) mo.setAttribute('aria-expanded', 'false'); };
      b.addEventListener('click', (e) => {
        const mo = e.target.closest('.sdk-tabbar-more'); const item = e.target.closest('.sdk-tabbar-menu .sdk-menu-item'); const t = e.target.closest('.sdk-tabbar-tab');
        if (mo) { const m = b.querySelector(':scope > .sdk-tabbar-menu'); const open = m.hidden; m.hidden = !open; mo.setAttribute('aria-expanded', String(open)); if (open) { const f = m.querySelector('.sdk-menu-item'); if (f) f.focus(); } return; }
        const free = [...b.querySelectorAll(':scope > .sdk-tabbar-tab:not(.sdk-tabbar-more)')].filter((x) => !x.dataset.pin);
        const pick = item ? free[Number(item.dataset.i)] : t && !t.dataset.pin ? t : null;
        if (pick) { for (const x of free) x.removeAttribute('aria-current'); pick.setAttribute('aria-current', 'page'); fit(b); close(); }
      });
      b.addEventListener('keydown', (e) => { if (e.key === 'Escape') { const mo = b.querySelector(':scope > .sdk-tabbar-more'); close(); if (mo && !mo.hidden) mo.focus(); } });
    }
  };

  // ---- frame bodies ----
  const anatomyBody = () => wrap(`<div class="pm-tb-ruler"><div class="pm-tb-phone" style="height:300px"><div class="pm-tb-top">Paris in spring</div><div class="pm-tb-body"><div class="sdk-panel">The module is here.</div></div>${bar(mods(5, { badges: true }), { style: '--safe-b:34px' })}</div>
    <ul class="pm-tb-legend"><li><b>1 Bar</b> 54px, plus the home-indicator inset (34px here). The bar surface (<code>--header-bg</code>), one 1px hairline on top, 4px of padding.</li>
      <li><b>2 Tab</b> flex 1, at least 56px wide, 45px high (a 44px target or more). An icon, 20px, over an 11px label, 4px apart.</li>
      <li><b>3 Current</b> the quiet selected fill (<code>--selected-bg</code>), the label and icon in the accent mix. Not accent words on a bare background.</li>
      <li><b>4 Badge</b> the micro count in the icon's corner, 3px in; a dot where a number is not useful.</li>
      <li><b>5 Fold</b> what does not fit goes into a "..." tab; the current tab always keeps its place.</li></ul></div>`);

  const widthBody = () => wrap(`${CAP('3 tabs')}<div class="pm-tb-bleed">${bar(mods(3), { label: 'Destination' })}</div>
    ${CAP('5 tabs, a count, a dot')}<div class="pm-tb-bleed">${bar(mods(5, { badges: true }).map((t, i) => Object.assign(t, i === 4 ? { dot: true } : {})), { label: 'Space', fold: true })}</div>
    ${CAP('7 tabs: what does not fit folds into "..."')}<div class="pm-tb-bleed">${bar(mods(7, { badges: true, cur: 5 }), { label: 'Space', fold: true })}</div>
    <p class="pm-tb-note">Press "..." to open the folded tabs. The current tab (Budget) was the seventh; it stays in the bar.</p>`);

  const FORCE = ['', 'hover', 'active', 'focus', '', ''];
  const statesBody = () => wrap(`${CAP('Rest, hover, pressed, focus, current, disabled')}<div class="pm-tb-bleed">${bar(['Rest', 'Hover', 'Pressed', 'Focus', 'Current', 'Disabled'].map((l, i) => ({ label: l, icon: ['circle', 'hand-pointer', 'hand', 'keyboard', 'square', 'ban'][i], state: FORCE[i], cur: i === 4, dis: i === 5 })), { label: 'States' })}</div>
    ${CAP('Current: hovered, focused, pressed')}<div class="pm-tb-bleed">${bar([{ label: 'Chat', icon: 'comments', cur: true, state: 'hover' }, { label: 'To-do', icon: 'list-check' }, { label: 'Maps', icon: 'map' }], { label: 'Current, hovered' })}${bar([{ label: 'Chat', icon: 'comments' }, { label: 'To-do', icon: 'list-check', cur: true, state: 'focus' }, { label: 'Maps', icon: 'map' }], { label: 'Current, focused' })}${bar([{ label: 'Chat', icon: 'comments' }, { label: 'To-do', icon: 'list-check' }, { label: 'Maps', icon: 'map', cur: true, state: 'active' }], { label: 'Current, pressed' })}</div>
    ${CAP('Badges: a count, 12, 99+ and a dot')}<div class="pm-tb-bleed">${bar([{ label: 'Chat', icon: 'comments', badge: 3 }, { label: 'To-do', icon: 'list-check', badge: 12 }, { label: 'Planner', icon: 'route', badge: '99+' }, { label: 'Maps', icon: 'map', dot: true }, { label: 'Budget', icon: 'wallet', cur: true, badge: 2 }], { label: 'Badges' })}</div>`);

  const spaceBody = () => wrap(`${CAP('The space bar: module tabs, Join (the ok colour), Online with its count, Leave (never folds)')}<div class="pm-tb-bleed">${bar(MODS.slice(0, 4).map(([label, icon], i) => ({ label, icon, cur: i === 1, badge: i === 1 ? 3 : 0 })).concat([{ label: 'Join', icon: 'phone', role: 'join', pin: true }, { label: 'Online', icon: 'user-group', badge: 4, pin: true, name: 'Online, 4 here' }, { label: 'Leave', icon: 'right-from-bracket', role: 'leave', pin: true }]), { label: 'Space', fold: true })}</div>
    ${CAP('In the call: no Join; Online and Leave stay')}<div class="pm-tb-bleed">${bar(MODS.slice(0, 6).map(([label, icon], i) => ({ label, icon, cur: i === 0 })).concat([{ label: 'Online', icon: 'user-group', badge: 4, pin: true, name: 'Online, 4 here' }, { label: 'Leave', icon: 'right-from-bracket', role: 'leave', pin: true }]), { label: 'Space', fold: true })}</div>
    ${CAP('An aside: Rejoin call before the "..."')}<div class="pm-tb-bleed">${bar([{ label: 'Chat', icon: 'comments', cur: true }, { label: 'Notes', icon: 'note-sticky' }, { label: 'Rejoin', icon: 'phone', role: 'join', pin: true }, { label: 'Leave', icon: 'right-from-bracket', role: 'leave', pin: true }], { label: 'Aside' })}</div>
    <p class="pm-tb-note">Join, Online, Rejoin and Leave are pinned: they never fold. The module tabs share what is left; with Join showing, two tabs fit and the rest are under "...". There is one least width for every tab (56px), so Join no longer narrows the others.</p>`);

  const destBody = () => wrap(`${CAP('The destination bar (a place or a calendar page): the same component')}<div class="pm-tb-bleed">${bar([{ label: 'Overview', icon: 'house', cur: true }, { label: 'Plan', icon: 'route' }, { label: 'Map', icon: 'map' }, { label: 'People', icon: 'user-group' }], { label: 'Destination' })}</div>`);

  const contextBody = () => wrap(`<div class="pm-tb-bleed"><div class="pm-tb-phone" style="height:520px;border-radius:0;border-width:0">
    <div class="pm-tb-top">Paris in spring</div>
    <div class="sdk-strip" role="region" aria-label="Journey"><div class="sdk-strip-said"><button type="button" class="sdk-strip-chip sdk-strip-phase" data-tint="purple"><span class="sdk-strip-dot" aria-hidden="true"></span><span class="sdk-strip-sentence">Booking · Trip in 12 days</span></button></div><div class="sdk-journey"><span class="sdk-band" data-state="past" data-tint="blue" style="flex:30"></span><span class="sdk-band" data-state="current" data-tint="purple" style="flex:21"></span><span class="sdk-band" data-state="ahead" data-tint="teal" style="flex:14"></span><span class="sdk-today" style="left:48%">14</span></div><button type="button" class="sdk-strip-chip sdk-strip-attn" data-tone="warn"><span class="sdk-badge">3</span><span>need action</span></button></div>
    <div class="sdk-window sdk-window-popout" style="flex:1 1 auto;--safe-b:0px"><div class="sdk-titlebar" data-tint="blue"><span class="sdk-titlebar-title">${fa('list-check')}<span>To-do</span></span><span class="sdk-titlebar-tools"><button type="button" class="sdk-icon-btn btn-small btn-quiet" aria-label="Add">${fa('plus')}</button></span></div><div class="sdk-window-content"><div class="sdk-row"><span class="sdk-row-main"><span class="sdk-row-title">Book the flights</span></span><span class="sdk-row-meta">Fri</span></div></div></div>
    ${bar(mods(5, { badges: true }), { style: '--safe-b:34px' })}</div></div>
    <p class="pm-tb-note">The bar sits at the foot of the phone under the page; the 34px under the tabs is the home-indicator inset, set here by hand (a phone supplies it).</p>`);

  const aliasBody = () => wrap(`${CAP('Today\'s space bar markup, no edit')}<div class="pm-tb-bleed"><nav class="subnav subnav-modules" aria-label="Space"><button type="button" class="modules-menu-item on">${fa('video')}<span>Conference</span></button><button type="button" class="modules-menu-item">${fa('comments')}<span>Chat</span><span class="badge">3</span></button><button type="button" class="modules-menu-item">${fa('list-check')}<span>To-do</span></button><button type="button" class="modules-menu-item">${fa('map')}<span>Maps</span></button></nav></div>
    ${CAP('Today\'s destination bar markup')}<div class="pm-tb-bleed"><div class="dest-tabs" role="tablist"><button type="button" class="dest-tab" aria-current="page">${fa('house')}<span>Overview</span></button><button type="button" class="dest-tab">${fa('route')}<span>Plan</span></button><button type="button" class="dest-tab">${fa('map')}<span>Map</span></button></div></div>`);

  const CT_ROWS = [
    ['Inactive label and icon (11px) on the bar', 'color-mix(in srgb, var(--header-text) 75%, var(--header-bg))', ['--header-bg'], 4.5],
    ['Hovered label on the quiet fill', '--header-text', ['--header-bg', 'color-mix(in srgb, var(--header-text) 10%, transparent)'], 4.5],
    ['Pressed label on the pressed fill', '--header-text', ['--header-bg', 'color-mix(in srgb, var(--header-text) 16%, transparent)'], 4.5],
    ['Current label and icon: the accent mix on the selected fill', 'color-mix(in srgb, var(--accent) 55%, var(--header-text))', ['--header-bg', '--selected-bg'], 4.5],
    ['Current, hovered: the accent mix on the stronger fill', 'color-mix(in srgb, var(--accent) 55%, var(--header-text))', ['--header-bg', 'color-mix(in srgb, var(--accent) 38%, transparent)'], 4.5],
    ['Leave label: the readable red on the bar', 'color-mix(in srgb, var(--danger) 70%, var(--header-text))', ['--header-bg'], 4.5],
    ['Join icon: the ok status colour pulled toward the text, on the bar', 'color-mix(in srgb, var(--ok) 70%, var(--header-text))', ['--header-bg'], 3],
    ['Join icon: the plain ok status colour (not used)', '--ok', ['--header-bg'], 1],
    ['The micro count number on its fill', '--on-accent', ['color-mix(in srgb, var(--accent) 88%, var(--text))'], 4.5],
    ['Focus outline (accent) on the bar', '--accent', ['--header-bg'], 3],
    ['Focus outline (accent mix) on the selected fill', 'color-mix(in srgb, var(--accent) 55%, var(--header-text))', ['--header-bg', '--selected-bg'], 3],
    ['Today: accent words on the bare bar (retired)', '--accent', ['--header-bg'], 1],
    ['Today: the dim colour on the bar (header text at 65%, retired)', 'color-mix(in srgb, var(--header-text) 65%, transparent)', ['--header-bg'], 1],
    ['The hairline on the bar', '--border', ['--header-bg'], 1],
  ];
  const contrastBody = () => wrap(`<table class="pm-tb-ct"><thead><tr><th>Pair</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${CT_ROWS.map((r) => `<tr data-fg="${h(r[1])}" data-bgs="${h(JSON.stringify(r[2]))}" data-min="${r[3]}"><td>${r[0]}</td><td data-out="r"></td><td>${r[3] === 1 ? 'info' : r[3] + ':1'}</td><td data-out="p"></td></tr>`).join('')}</tbody></table>`);
  const measureContrast = (doc) => {
    const host = doc.querySelector('.ds-proposed');
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const col = (expr) => { const p = doc.createElement('span'); p.style.color = expr.startsWith('--') ? `var(${expr})` : expr; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (d) => 0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]);
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-tb-ct tbody tr')) {
        g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillRect(0, 0, 1, 1); g.clearRect(0, 0, 1, 1);
        for (const l of JSON.parse(tr.dataset.bgs)) { g.fillStyle = col(l); g.fillRect(0, 0, 1, 1); }
        const base = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        g.fillStyle = col(tr.dataset.fg); g.fillRect(0, 0, 1, 1);
        const top = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        const a = lum(top); const b = lum(base);
        const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const min = Number(tr.dataset.min); const p = tr.querySelector('[data-out="p"]');
        p.textContent = min === 1 ? 'Info' : r >= min ? 'Passes' : 'Fails'; p.className = min === 1 ? '' : r >= min ? 'pm-tb-pass' : 'pm-tb-fail';
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  function renderTabbar(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="tabbar-h"><a href="#tabbar">Phone bottom bar (icon over label)</a></h3><span class="ds-status-chip ds-st-approved">Approved</span><span class="ds-count">one tab bar for the space bar and the destination bar, 640px and below</span></header>
<p class="ds-desc"><b>Decided 2026-10-21: approved as drawn.</b> (1) One component for the space bar (<code>.subnav .modules-menu-item</code>) and the destination bar (<code>.dest-tab</code>). (2) The bar is 54px plus the safe-area inset, on the bar surface (<code>--header-bg</code>), with a 1px hairline on top. (3) A tab is flex 1 with a 56px least width, a 20px icon over an 11px label, 4px apart, and a target of 44px or more. (4) The current tab is the quiet neutral selected fill with the label in the accent mix, not accent words on a bare background. (5) A badge is the micro count at the icon's corner, 3px in. (6) Tabs that do not fit fold into a "..." tab (a menu) and the current tab keeps its place. (7) Focus is a 2px outline inside the tab. (8) The Join icon uses the ok status token.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#tabbar-anatomy">Anatomy</a><a href="#tabbar-widths">At 390 and 320</a><a href="#tabbar-states">States and badges</a><a href="#tabbar-space">Space bar: Join, Online, Leave</a><a href="#tabbar-dest">Destination bar</a><a href="#tabbar-context">In context</a><a href="#tabbar-contrast">Contrast</a><a href="#tabbar-map">Today to proposed</a><a href="#tabbar-alias">Aliases</a><a href="#tabbar-tokens">Tokens</a><a href="#tabbar-contract">Markup</a><a href="#tabbar-decided">Decided 2026-10-21</a></nav>

<h4 class="ds-h4" id="tabbar-anatomy">Anatomy</h4>
<div data-slot="anatomy"></div>

<h4 class="ds-h4" id="tabbar-widths">At 390 and 320, with 3, 5 and 7 tabs</h4>
<p class="ds-desc">The bar is full width. Three tabs share it equally; at least 56px each. Seven tabs do not fit at either width, so what does not fit folds into "...". Press "..." and the folded tabs open in the Menus popover above the bar.</p>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="tabbar-states">States and badges</h4>
<div data-slot="states"></div>

<h4 class="ds-h4" id="tabbar-space">The space bar: Join, Online and Leave</h4>
<div data-slot="space"></div>

<h4 class="ds-h4" id="tabbar-dest">The destination bar</h4>
<div data-slot="dest"></div>

<h4 class="ds-h4" id="tabbar-context">In context</h4>
<div data-slot="context"></div>

<h4 class="ds-h4" id="tabbar-contrast">Contrast</h4>
<p class="ds-desc">Worked out in the page from the computed colours, in the current mode (WCAG 2). Text needs 4.5 to 1, an icon or an outline 3 to 1. The two retired colours are listed to show why they go.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="tabbar-map">Today to proposed</h4>
${tbl(['Today', 'Proposed'], [
    ['The current tab: accent words and icon on a bare background (<code>.modules-menu-item.on</code>, <code>.dest-tab[aria-current]</code>)', 'The neutral selected fill with the label and icon in the accent mix.'],
    ['Tab least widths: 56px (the space bar), 48px (Online and Join) and 60px (the destination bar)', 'One: 56px, <code>--tabbar-min</code>.'],
    ['Inactive colour: the header text at 65% (the destination bar) against the dim colour (the space bar)', 'One: the header text 25% toward the header, readable at 11px.'],
    ['Icon 18px over an 11px label, 3px apart', 'Icon 20px over an 11px label, 4px apart.'],
    ['A badge: <code>.badge</code> placed by hand (top 2px, left 6px past the middle)', 'The micro count at the icon\'s corner, 3px in; a dot where no number is useful.'],
    ['Tabs that do not fit: the bar shrinks Join\'s neighbours (40px), or a tab runs under Online', 'They fold into a "..." tab; the current tab keeps its place; Join, Online and Leave never fold.'],
    ['Focus: the browser\'s outline on one bar and the accent ring on the other', 'A 2px outline inside the tab, the Fields and Tabs mechanism.'],
    ['Bar: 54px with the inset, the header colour, a 1px hairline (two copies)', 'One bar: the same numbers, written once.'],
    ['The Join icon in the bar\'s colour', 'The ok status colour.'],
  ])}

<h4 class="ds-h4" id="tabbar-alias">Aliases</h4>
${tbl(['Component', 'New name', 'Older names that take the same rules'], [
    ['Bar', '<code>.sdk-tabbar</code>', '<code>.subnav-modules</code> (the space bar on a phone), <code>.dest-tabs</code>'],
    ['Tab', '<code>.sdk-tabbar-tab</code> (parts <code>.sdk-tabbar-glyph</code>, <code>.sdk-tabbar-label</code>)', '<code>.subnav-modules .modules-menu-item</code>, <code>.dest-tab</code>'],
    ['Fold', '<code>.sdk-tabbar-more</code>, <code>.sdk-tabbar-menu</code> (a Menus <code>.sdk-menu</code>)', 'the space bar\'s <code>#subnav-more</code>'],
    ['Count', '<code>.sdk-badge-micro</code> (Chips)', '<code>.badge</code> in a tab'],
  ])}
<div data-slot="alias"></div>

<h4 class="ds-h4" id="tabbar-tokens">Tokens</h4>
${tbl(['Token', 'Value', 'Used for'], [
    ['<code>--tabbar-h</code>', '54px', 'The bar, without the inset. Same name and value as today (<code>--tabbar-h</code>).'],
    ['<code>--tabbar-min</code> <code>--tabbar-icon</code> <code>--tabbar-gap</code>', '56px, 20px, 4px', 'The least tab width, the icon, the space between icon and label. Proposed tokens.'],
    ['<code>--safe-b</code>', '<code>env(safe-area-inset-bottom)</code>', 'The home-indicator inset under the tabs. Proposed token (also used by the Module window).'],
    ['<code>--header-bg</code> <code>--header-text</code> <code>--selected-bg</code> <code>--micro-fill</code> <code>--ok</code> <code>--border</code>', 'the theme\'s, and the Chips family\'s', 'The bar, the words, the current fill, the count, the Join icon, the hairline.'],
  ])}

<h4 class="ds-h4" id="tabbar-contract">Markup</h4>
${code(`<nav class="sdk-tabbar" aria-label="Space">
  <button type="button" class="sdk-tabbar-tab" aria-current="page">
    <span class="sdk-tabbar-glyph"><i class="fa-solid fa-comments"></i><span class="sdk-badge-micro" aria-hidden="true">3</span></span>
    <span class="sdk-tabbar-label">Chat</span>
  </button>
  <button type="button" class="sdk-tabbar-tab" data-role="join" data-pin="1">...Join...</button>   <!-- pinned: never folds -->
  <button type="button" class="sdk-tabbar-tab sdk-tabbar-more" aria-haspopup="menu" aria-expanded="false">...More...</button>
  <div class="sdk-menu sdk-tabbar-menu" role="menu" hidden>...the folded tabs as .sdk-menu-item...</div>
</nav>`)}
${dim([
    ['Current', '<code>aria-current="page"</code> (a place) or <code>aria-selected="true"</code> (a tab list); today\'s <code>.on</code> is kept.'],
    ['Name', 'A tab with a count or dot has an <code>aria-label</code> that starts with its label ("Chat, 3 new"). The count is <code>aria-hidden</code>.'],
    ['Fold', 'Tabs that do not fit are <code>hidden</code> and listed in the "..." menu in the same order; <code>data-pin</code> keeps Join, Online, Rejoin and Leave in the bar. The least width is 56px; the number of slots is the bar\'s width less its padding, over 58px.'],
    ['Inset', 'The bar adds <code>env(safe-area-inset-bottom)</code> as padding and height.'],
  ])}

<h4 class="ds-h4" id="tabbar-decided">Decided 2026-10-21</h4>
<p class="ds-desc">Thomas approved every choice below, as drawn, on 2026-10-21.</p>
${tbl(["Decided as drawn","Why"], [
    ["The icon is 20px (the brief asked \"16/20: use 20?\")","20px reads over an 11px label at arm's length, and the target is 45px high either way."],
    ["The badge sits in the corner of a 36 by 20 icon box, overlapping the icon's top right","The micro count's 3px inset is from the box it sits in; the icon box is the natural one."],
    ["The inactive colour is the header text 25% toward the header","At 11px it must reach 4.5 to 1 (the 65% header text does not)."],
    ["The tab is 45px high: the bar less 4px of padding above and below and the hairline","It keeps the 54px bar and a target over 44px."],
    ["The folded tabs open in a Menus popover above the bar, right aligned","It is the one menu look."],
    ["Join, Online, Rejoin and Leave are pinned and never fold; Leave's words are the readable red","Leave must always be in the window (the phone space bar plan)."],
    ["Online shows its count as a micro count beside the words \"Online\"","Today it is an icon over the count alone; the words say what the number is."],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + TB_CSS, onload: wire }, o || {}));
    slot('anatomy').appendChild(F(anatomyBody(), 'Tab bar, anatomy'));
    const ws = mk('div', '');
    for (const w of [390, 320]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(widthBody(), `Tab bar at ${w}`, { pinWidth: w }));
    }
    slot('widths').appendChild(ws);
    slot('states').appendChild(F(statesBody(), 'Tab bar, states', { pinWidth: 390 }));
    slot('space').appendChild(F(spaceBody(), 'Tab bar, space bar', { pinWidth: 390 }));
    slot('dest').appendChild(F(destBody(), 'Tab bar, destination', { pinWidth: 390 }));
    slot('context').appendChild(F(contextBody(), 'Tab bar, in context', { pinWidth: 390 }));
    slot('contrast').appendChild(F(contrastBody(), 'Tab bar, contrast', { onload: measureContrast }));
    slot('alias').appendChild(F(aliasBody(), 'Tab bar, aliases', { pinWidth: 390 }));
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'tabbar', covers: ['subnav-modules', 'modules-menu-item', 'dest-tabs', 'dest-tab', 'tab-bar'], group: 'Containers', name: 'Phone bottom bar (icon over label)', status: 'approved',
    words: 'phone bottom bar tab bar space bar destination bar icon over label current selected badge micro count fold more overflow join online leave safe area inset 54 56 20 11 modules-menu-item dest-tab', render: renderTabbar,
  });
})();
