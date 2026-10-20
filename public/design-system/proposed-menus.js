/* The Menus and popovers family (proposed): one menu surface and one menu item for menus, flyouts, popovers, dropdown lists, the chat command menu
   and the bell panel's container, with the long-list bottom sheet. Loaded by proposed.html through proposed-families.json, after proposed.js (the page
   engine); it registers one family through window.DS_PROPOSED.families.push and draws it with the rules in proposed-menus.css. Nothing here is a style
   of the product: markup, words and tables only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules (.pm-row, .pm-role ...), from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // The example-page rules of this family's frames only (layout of the examples; nothing of the component). The reset lines undo what Today's
  // stylesheet still says about its own names (position, width), because a menu is placed by its host and these examples sit in the page.
  const MN_CSS = `
.pm-grid { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 14px 24px; }
.pm-cell { display: flex; flex-direction: column; gap: 5px; min-width: 0; max-width: 100%; }
.pm-cell > small, .pm-cap { color: var(--text-dim); font-size: var(--text-11); font-weight: 700; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-cap { margin: 0 0 6px; }
.pm-cell > .sdk-menu, .pm-cell > .host-menu, .pm-cell > .modules-menu, .pm-cell > .menu, .pm-cell > .chat-command-menu, .pm-cell > .sdk-kind-list, .pm-cell > .popover, .pm-cell > .sdk-popover, .pm-cell > .sdk-dp { max-width: 100%; }
.ds-proposed :is(.host-menu, .modules-menu, .chat-command-menu, .popover, .menu, .sdk-menu, .sdk-kind-list, .sdk-dp) { position: static; inset: auto; transform: none; width: auto; }
.ds-proposed .pm-w180 { width: 180px; } .ds-proposed .pm-w200 { width: 200px; } .ds-proposed .pm-w220 { width: 220px; } .ds-proposed .pm-w260 { width: 260px; } .ds-proposed .pm-w300 { width: 300px; } .ds-proposed .pm-w320 { width: 320px; }
.pm-page { padding: 14px; border-radius: var(--radius-medium); background: var(--bg); }
.pm-sect { padding: 14px; border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-line { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 24px; padding: 6px 0; }
.pm-zoom { zoom: 2; display: block; padding: 6px 4px; }
.pm-sw { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.pm-sw > div { padding: 10px 12px; border: 1px solid var(--border); border-radius: var(--radius-medium); font-size: 12px; }
.pm-sw b { display: block; font-size: 13px; }
.pm-sw .pm-hex { display: block; margin-top: 2px; color: var(--text-dim); font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; }
.pm-over { position: relative; }
.pm-obj { position: relative; display: flex; align-items: flex-start; gap: 10px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-obj + .pm-obj { margin-top: 8px; }
.pm-obj > .pm-grow { flex: 1 1 auto; min-width: 0; }
.pm-obj b { display: block; font-size: 14px; }
.pm-obj span.pm-sub2 { color: var(--text-dim); font-size: 12px; }
.pm-pop-at { position: absolute; z-index: 2; }
.pm-tbar { display: flex; align-items: center; gap: 8px; box-sizing: border-box; min-width: 0; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-tbar > .pm-fill { flex: 1 1 0; min-width: 0; }
.pm-phone-screen { position: relative; margin: 0 -14px; overflow: hidden; height: 640px; border-radius: var(--radius-medium); background: var(--bg); }
.pm-phone-screen .pm-behind { padding: 14px; }
.pm-phone-screen .pm-behind p { margin: 0 0 10px; padding: 12px; border-radius: var(--radius-medium); background: var(--bg-section); color: var(--text-dim); }
.pm-phone-screen .sdk-menu-scrim { position: absolute; inset: 0; }
.pm-phone-screen .sdk-menu-sheet { position: absolute; left: 0; bottom: -1px; }
.pm-flyrow { display: flex; align-items: flex-start; }
.ds-proposed .pm-flyrow .sdk-menu-flyout { margin-top: calc(var(--menu-item-h) * 2); }
.ds-proposed .sdk-menu-flyout.pm-fly3 { margin-top: calc(var(--menu-item-h) * 3); }
.pm-chat { display: flex; flex-direction: column; justify-content: flex-end; gap: 4px; }
.pm-ct { width: 100%; border-collapse: collapse; font-size: 12px; }
.pm-ct th { padding: 4px 8px 4px 0; color: var(--text-dim); font-size: var(--text-11); letter-spacing: 0.08em; text-align: left; text-transform: uppercase; }
.pm-ct td { padding: 4px 8px 4px 0; border-top: 1px solid var(--border); vertical-align: top; }
.pm-ct .pm-n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.pm-pass { color: var(--ok); font-weight: 700; } .pm-fail { color: var(--danger-text); font-weight: 700; }
@media (max-width: 640px) {
  .pm-sw { grid-template-columns: minmax(0, 1fr); }
}`;

  // ---- builders ----
  // One item. k: item (default), radio, check, switch, cat. o: icon, hint, count, tag, on (checked), current, danger, disabled, open, blank (empty icon slot), force (a forced state class), active.
  const I = (label, o = {}) => {
    const k = o.k || 'item';
    const role = k === 'radio' ? 'menuitemradio' : (k === 'check' || k === 'switch') ? 'menuitemcheckbox' : 'menuitem';
    const aria = [`role="${role}"`];
    if (k === 'radio' || k === 'check' || k === 'switch') aria.push(`aria-checked="${o.on ? 'true' : 'false'}"`);
    if (k === 'cat') aria.push('aria-haspopup="menu"', `aria-expanded="${o.open ? 'true' : 'false'}"`);
    if (o.current) aria.push('aria-current="true"');
    if (o.disabled) aria.push('aria-disabled="true"');
    const cls = ['sdk-menu-item', k === 'cat' ? 'sdk-menu-category' : '', o.danger ? 'danger' : '', o.active ? 'active' : '', o.force || ''].filter(Boolean).join(' ');
    const lead = k === 'check' ? '<span class="sdk-menu-check" aria-hidden="true"></span>' : o.icon ? `<span class="sdk-menu-icon">${fa(o.icon)}</span>` : o.blank ? '<span class="sdk-menu-icon" aria-hidden="true"></span>' : '';
    const tail = [
      o.hint ? `<span class="sdk-menu-hint">${o.hint}</span>` : '',
      o.count != null ? `<span class="sdk-badge">${o.count}</span>` : '',
      o.tag ? `<span class="sdk-chip-tag">${o.tag}</span>` : '',
      k === 'switch' ? '<span class="sdk-menu-switch" aria-hidden="true"></span>' : '',
      k === 'cat' ? `<span class="sdk-menu-caret" aria-hidden="true">${fa('chevron-right')}</span>` : '',
    ].join('');
    return `<button type="button" class="${cls}" ${aria.join(' ')} tabindex="${o.tab === 0 ? 0 : -1}"${o.id ? ` id="${o.id}"` : ''}${o.flyout ? ` data-flyout="${o.flyout}"` : ''}>${lead}<span class="sdk-menu-label">${label}</span>${tail}</button>`;
  };
  const HEAD = (t) => `<div class="sdk-menu-heading" role="presentation">${t}</div>`;
  const SEP = '<div class="sdk-menu-sep" role="separator"></div>';
  const M = (inner, o = {}) => `<div class="sdk-menu${o.narrow ? ' narrow' : ''}${o.cls ? ' ' + o.cls : ''}" role="menu" aria-label="${o.label || 'Actions'}"${o.demo ? ' data-demo-menu' : ''}${o.id ? ` id="${o.id}"` : ''}${o.hidden ? ' hidden' : ''}>${inner}</div>`;
  const CELL = (cap, body, w) => `<div class="pm-cell${w ? ' pm-w' + w : ''}"><small>${cap}</small>${body}</div>`;
  const MORE = (open) => `<button type="button" class="sdk-more${open ? ' on' : ''}" aria-label="More" title="More" aria-haspopup="menu" aria-expanded="${open ? 'true' : 'false'}">${fa('ellipsis-vertical')}</button>`;

  // The "..." menu of an object: edit, duplicate, move, divider, delete.
  const ACTIONS = (o = {}) => M([
    I('Edit', { icon: 'pen' }), I('Duplicate', { icon: 'copy' }), I('Move to...', { icon: 'arrow-right-to-bracket', k: 'cat', open: o.open, flyout: o.flyout }), SEP, I('Delete', { icon: 'trash', danger: true }),
  ].join(''), { narrow: o.narrow, cls: o.cls, id: o.id });

  // ---- the states (a one-row menu each) ----
  const STATES = [
    ['Rest', {}], ['Hover', { force: 'ds-force-hover' }], ['Focus', { force: 'ds-force-focus' }],
    ['Current', { current: true }], ['Current, hover', { current: true, force: 'ds-force-hover' }], ['Current, focus', { current: true, force: 'ds-force-focus' }],
    ['Danger', { danger: true, icon: 'trash' }], ['Danger, hover', { danger: true, icon: 'trash', force: 'ds-force-hover' }], ['Danger, focus', { danger: true, icon: 'trash', force: 'ds-force-focus' }],
    ['Disabled', { disabled: true }], ['Submenu open', { k: 'cat', open: true }], ['Cursor (list keeps focus)', { active: true }],
  ];
  const statesBody = (narrow) => `<div class="ds-proposed"><div class="pm-grid">${STATES.map(([cap, o]) => CELL(cap, M(I(o.danger ? 'Delete' : 'Duplicate', Object.assign({ icon: o.icon || 'copy' }, o)), { narrow, label: cap }), 220)).join('')}</div></div>`;

  // ---- the content kinds ----
  const contentBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('Content of a row', M([
    I('Label only', { blank: true }), I('With an icon', { icon: 'pen' }), I('With a hint', { icon: 'keyboard', hint: 'Ctrl+D' }), I('With a count', { icon: 'inbox', count: 3 }), I('With a tag', { icon: 'star', tag: 'Default' }), I('With a submenu', { icon: 'folder-open', k: 'cat' }),
  ].join(''), { label: 'Content' }), 260)}
    ${CELL('Tick boxes and switches (the only rows with a check)', M([
    I('Show notes', { k: 'check' }), I('Show completed', { k: 'check', on: true }), I('Compact rows', { k: 'switch' }), I('Show on the call', { k: 'switch', on: true }), I('Not for guests', { k: 'check', on: true, disabled: true }),
  ].join(''), { label: 'Tick boxes' }), 260)}
    ${CELL('One choice of several (radio: the current one has the fill)', M([
    I('Date', { k: 'radio', on: true }), I('Name', { k: 'radio' }), I('Cost', { k: 'radio' }),
  ].join(''), { label: 'Sort by' }), 260)}
    ${CELL('Headings and dividers', M([
    HEAD('Sort by'), I('Date', { k: 'radio', on: true }), I('Name', { k: 'radio' }), SEP, HEAD('Show'), I('Completed', { k: 'check', on: true }), I('Notes', { k: 'check' }),
  ].join(''), { label: 'Sections' }), 260)}
  </div></div>`;

  // ---- anatomy ----
  const zoomBody = () => `<div class="ds-proposed"><div class="pm-zoom">${M([
    HEAD('Selected'), I('Duplicate', { icon: 'copy', hint: 'Ctrl+D' }), I('Inbox', { icon: 'inbox', count: 3, current: true }), SEP, I('Delete', { icon: 'trash', danger: true }),
  ].join(''), { cls: 'pm-w220', label: 'Anatomy sample' })}</div></div>`;

  // ---- surface and shadow ----
  const surfaceBody = () => `<div class="ds-proposed">
    <p class="pm-cap">The three surfaces, read from the theme in the mode on show</p>
    <div class="pm-sw" data-swatches>
      <div data-tok="--bg" style="background: var(--bg)"><b>Page</b><code>--bg</code><span class="pm-hex"></span></div>
      <div data-tok="--bg-section" style="background: var(--bg-section)"><b>Section</b><code>--bg-section</code><span class="pm-hex"></span></div>
      <div data-tok="--bg-card" style="background: var(--bg-card)"><b>Menu and popover</b><code>--bg-card</code><span class="pm-hex"></span></div>
    </div>
    <p class="pm-cap" style="margin-top:14px">The same menu over the page and over a section: the hairline and the shadow do the separating</p>
    <div class="pm-grid">
      <div class="pm-page pm-w300">${M([I('Edit', { icon: 'pen' }), I('Duplicate', { icon: 'copy' }), SEP, I('Delete', { icon: 'trash', danger: true })].join(''), { label: 'On the page' })}</div>
      <div class="pm-sect pm-w300">${M([I('Edit', { icon: 'pen' }), I('Duplicate', { icon: 'copy' }), SEP, I('Delete', { icon: 'trash', danger: true })].join(''), { label: 'On a section' })}</div>
    </div>
    <p class="pm-cap" style="margin-top:14px">The shadow token, read from the page</p>
    <p class="pm-sub2" data-shadow style="margin:0;font-size:12px;color:var(--text-dim)"></p></div>`;
  const surfaceReady = (doc) => {
    const go = () => {
      const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true });
      const host = doc.querySelector('.ds-proposed');
      const hex = (expr) => { const p = doc.createElement('span'); p.style.color = expr; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); g.clearRect(0, 0, 1, 1); g.fillStyle = c; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return '#' + [d[0], d[1], d[2]].map((x) => x.toString(16).padStart(2, '0')).join(''); };
      for (const e of doc.querySelectorAll('[data-swatches] [data-tok]')) e.querySelector('.pm-hex').textContent = hex(`var(${e.dataset.tok})`);
      const p = doc.createElement('span'); p.style.boxShadow = 'var(--shadow-2)'; host.appendChild(p);
      const s = getComputedStyle(p).boxShadow; p.remove();
      const mode = doc.documentElement.dataset.themeMode;
      doc.querySelector('[data-shadow]').textContent = `--shadow-2 in ${mode} mode: ${s}`;
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  // ---- the menu and its phone version ----
  const cardWith = (menu, o = {}) => `<div class="pm-over" style="min-height:${o.h || 230}px">
    <div class="pm-obj"><div class="pm-grow"><b>Dinner at Le Comptoir</b><span class="pm-sub2">Tomorrow, 19:30 · 4 people</span></div>${MORE(true)}</div>
    <div class="pm-obj"><div class="pm-grow"><b>Train to Lyon</b><span class="pm-sub2">Friday, 08:12</span></div>${MORE(false)}</div>
    <div class="pm-pop-at" style="top:${o.top || 52}px;right:${o.right || 8}px">${menu}</div></div>`;
  const desktopBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('The "..." menu, 32px rows', M([I('Edit', { icon: 'pen' }), I('Duplicate', { icon: 'copy' }), I('Move to...', { icon: 'arrow-right-to-bracket', k: 'cat' }), SEP, I('Delete', { icon: 'trash', danger: true })].join(''), { label: 'Actions' }), 220)}
    ${CELL('The same, the trigger and the object it belongs to', `<div class="pm-w300">${cardWith(ACTIONS(), { h: 210, top: 50, right: 6, cls: 'pm-w200' })}</div>`)}
  </div></div>`;
  const phoneBody = () => `<div class="ds-proposed">
    <p class="pm-cap">390 wide: the menu stays a popover; the rows are 44px, the "..." has a 44px hit area</p>
    ${cardWith(ACTIONS({ cls: 'pm-w220' }), { h: 290, top: 58, right: 6 })}</div>`;

  // ---- the flyout ----
  const flyBody = () => `<div class="ds-proposed"><p class="pm-cap">Right (or Enter) on "Move to..." opens the flyout beside it; Left or Escape closes it and returns to the row. The flyout's first row lines up with the row that opened it.</p>
    <div class="pm-flyrow">${ACTIONS({ open: true, cls: 'pm-w200', flyout: 'x' })}
    <div class="sdk-menu-flyout pm-w200" role="menu" aria-label="Move to">${[I('Today', { icon: 'calendar-day' }), I('Tomorrow', { icon: 'calendar-day' }), I('Pick a day...', { icon: 'calendar' })].join('')}</div></div></div>`;

  // ---- the long-list sheet at 390 ----
  const KINDS = [
    ['Travel', [['Flight', 'plane', 'blue'], ['Train', 'train', 'teal'], ['Stay', 'bed', 'purple'], ['Car', 'car', 'orange']]],
    ['Food', [['Meal', 'utensils', 'orange'], ['Coffee', 'mug-hot', 'gold']]],
    ['Things to do', [['Museum', 'landmark', 'pink'], ['Walk', 'person-walking', 'green'], ['Show', 'ticket', 'red'], ['Shopping', 'bag-shopping', 'purple'], ['Note', 'note-sticky', 'gold'], ['Other', 'circle', null]]],
  ];
  const kindOpt = ([n, ic, c], o = {}) => `<div class="sdk-kind-option${o.active ? ' active' : ''}${o.force ? ' ' + o.force : ''}" role="option" aria-selected="${o.sel ? 'true' : 'false'}"${c ? ` style="--kind-color: var(--tint-${c})"` : ''}><span class="sdk-kind-icon">${fa(ic)}</span><span class="sdk-kind-name">${n}</span></div>`;
  const kindGroups = (o = {}) => KINDS.map(([t, ks]) => `<div class="sdk-kind-group" role="group" aria-label="${t}"><div class="sdk-kind-group-title" role="presentation">${t}</div>${ks.map((k) => kindOpt(k, { sel: k[0] === 'Train', active: k[0] === (o.active || 'Stay') })).join('')}</div>`).join('');
  const sheetBody = () => `<div class="ds-proposed"><div class="pm-phone-screen">
    <div class="pm-behind"><p>Add an activity</p><p>Name</p><p>Kind: Train</p><p>Day</p></div>
    <div class="sdk-menu-scrim" aria-hidden="true"></div>
    <div class="sdk-menu-sheet" role="dialog" aria-modal="true" aria-label="Choose a kind">
      <span class="sdk-menu-grip" aria-hidden="true"></span>
      <div class="sdk-search">${fa('magnifying-glass')}<input type="search" aria-label="Search kinds" placeholder="Search kinds"></div>
      <div class="sdk-menu-list" role="listbox" aria-label="Kinds">${kindGroups()}</div>
    </div></div></div>`;

  // ---- date picker ----
  const DOW = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  const dpDay = (label, cls, extra) => `<button type="button" class="sdk-dp-day${cls ? ' ' + cls : ''}"${extra || ''}>${label}</button>`;
  const dp = (o = {}) => {
    const cells = [];
    for (const d of [28, 29, 30]) cells.push(dpDay(d, 'other'));
    for (let d = 1; d <= 31; d += 1) {
      const cls = [d === 19 ? 'today' : '', o.range && d > o.range[0] && d < o.range[1] ? 'inrange' : '', (o.sel === d || (o.range && (d === o.range[0] || d === o.range[1]))) ? 'sel' : '', o.hover === d ? 'ds-force-hover' : '', o.focus === d ? 'ds-force-focus' : ''].filter(Boolean).join(' ');
      const on = cls.includes('sel');
      cells.push(dpDay(d, cls, `${on ? ' aria-pressed="true"' : ''} aria-label="${d} October 2026"${d === 19 ? ' aria-current="date"' : ''}${o.disabledBefore && d < o.disabledBefore ? ' disabled' : ''}`));
    }
    cells.push(dpDay(1, 'other'));
    return `<div class="sdk-dp" role="dialog" aria-label="${o.label || 'Choose a day'}">
      <div class="sdk-dp-head"><button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Previous month">${fa('chevron-left')}</button><span class="sdk-dp-title">October 2026</span><button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Next month">${fa('chevron-right')}</button></div>
      <div class="sdk-dp-grid" role="group" aria-label="October 2026">${DOW.map((d) => `<span class="sdk-dp-dow" aria-hidden="true">${d}</span>`).join('')}${cells.join('')}</div>
      <div class="sdk-dp-foot"><button type="button" class="btn btn-quiet btn-small">Clear</button><button type="button" class="btn btn-small">Today</button></div></div>`;
  };
  const dpBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('One day chosen (the 23rd); today is the 19th', dp({ sel: 23 }))}
    ${CELL('A range (the 21st to the 25th), the 22nd hovered', dp({ range: [21, 25], hover: 22, label: 'Choose the days' }))}
    ${CELL('A day, in each state', `<div class="pm-line" style="gap:6px 10px;max-width:420px;align-items:flex-start">${[
    ['Rest', ''], ['Hover', 'ds-force-hover'], ['Focus', 'ds-force-focus'], ['Today', 'today'], ['Chosen', 'sel'], ['Chosen, focus', 'sel ds-force-focus'], ['In range', 'inrange'], ['Other month', 'other'], ['Disabled', ''],
  ].map(([c, k], i) => `<div class="pm-cell" style="align-items:center;width:64px"><small style="text-align:center">${c}</small>${dpDay(i === 8 ? 12 : 14, k, i === 8 ? ' disabled' : (k.includes('sel') ? ' aria-pressed="true"' : ''))}</div>`).join('')}</div>`)}
  </div></div>`;
  const dpPhoneBody = () => `<div class="ds-proposed"><p class="pm-cap">390 wide: the day cell is 44px; the popup is 338px wide</p>${dp({ sel: 23 })}</div>`;

  // ---- kind picker ----
  const kindBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('The list under the kind field (desktop): Train is chosen, Stay is the keyboard cursor', `<div class="sdk-kind-list" role="listbox" aria-label="Kinds">${kindGroups()}</div>`, 260)}
    ${CELL('Group title 11px, quiet fill on the cursor row, bold with the kind-coloured chip on the chosen row', `<div class="sdk-kind-list" role="listbox" aria-label="Kinds, three rows">${[
    `<div class="sdk-kind-group" role="group" aria-label="Travel"><div class="sdk-kind-group-title" role="presentation">Travel</div>${kindOpt(KINDS[0][1][0])}${kindOpt(KINDS[0][1][1], { sel: true })}${kindOpt(KINDS[0][1][2], { active: true })}${kindOpt(KINDS[0][1][2], { force: 'ds-force-focus' })}</div>`,
  ].join('')}</div>`, 260)}
  </div></div>`;

  // ---- chat command menu ----
  const chatBody = () => `<div class="ds-proposed"><div class="pm-grid"><div class="pm-cell pm-w300"><small>Typing "/ro" in the chat box: the menu opens above it; focus stays in the box, the cursor row has the quiet fill</small>
    <div class="pm-chat"><div class="chat-command-menu" role="listbox" aria-label="Commands">
      <button type="button" class="chat-command-item active" role="option" aria-selected="true" tabindex="-1"><span class="sdk-menu-label">/roll</span><span class="sdk-menu-hint">Roll dice</span></button>
      <button type="button" class="chat-command-item" role="option" aria-selected="false" tabindex="-1"><span class="sdk-menu-label">/rules</span><span class="sdk-menu-hint">Look up a rule</span></button>
      <button type="button" class="chat-command-item" role="option" aria-selected="false" tabindex="-1"><span class="sdk-menu-label">/recap</span><span class="sdk-menu-hint">Summarise the session</span></button>
    </div><input type="text" value="/ro" aria-label="Message"></div></div></div></div>`;

  // ---- a call popover ----
  const callBody = () => `<div class="ds-proposed"><div class="pm-grid">${CELL('A call popover: heading, controls, footer; 14px padding', `<div class="sdk-popover" role="dialog" aria-label="Audio settings">
    <div class="sdk-popover-block"><h3 class="sdk-popover-heading">Microphone</h3><select aria-label="Microphone"><option>Built-in microphone</option><option>Headset</option></select></div>
    <div class="sdk-popover-block"><h3 class="sdk-popover-heading">Speakers</h3><select aria-label="Speakers"><option>Built-in speakers</option><option>Headset</option></select></div>
    <div class="sdk-popover-block"><h3 class="sdk-popover-heading">Sound</h3><label class="sdk-check"><input type="checkbox" class="sdk-switch" role="switch" checked><span>Reduce background noise</span></label></div>
    <div class="sdk-popover-foot"><button type="button" class="btn btn-quiet btn-small">Test sound</button><button type="button" class="btn btn-small">Done</button></div></div>`, 300)}
    ${CELL('A small picker popover: 8px padding, the same surface (an emoji grid)', `<div class="sdk-popover sdk-popover-dense sdk-emoji" role="dialog" aria-label="Emoji"><div class="pm-line" style="gap:2px;padding:0;max-width:224px">${['face-smile', 'face-laugh', 'heart', 'thumbs-up', 'fire', 'dice-d20', 'hat-wizard', 'dragon', 'skull', 'mug-hot', 'star', 'face-surprise'].map((n) => `<button type="button" class="sdk-icon-btn btn-quiet" aria-label="${n}" title="${n}">${fa(n)}</button>`).join('')}</div></div>`)}
  </div></div>`;

  // ---- in context: a toolbar with a view switch and a menu ----
  const toolBody = (w) => {
    const compact = w <= 500;
    const sw = `<div class="sdk-tabs sdk-tabs-joined sdk-tabs-small${compact ? ' sdk-tabs-compact' : ''}" role="group" aria-label="View">${[['list', 'List', 1], ['table-columns', 'Board', 0], ['map', 'Map', 0]].map(([ic, wd, on]) => `<button type="button" class="sdk-tab" aria-pressed="${on ? 'true' : 'false'}"${compact ? ` aria-label="${wd}" title="${wd}"` : ''}><i class="sdk-tab-glyph fa-solid fa-${ic}" aria-hidden="true"></i><span class="sdk-tab-word">${wd}</span></button>`).join('')}</div>`;
    return `<div class="ds-proposed"><div class="pm-over" style="min-height:${compact ? 520 : 330}px"><div class="pm-tbar">${sw}<span class="pm-fill"></span><button type="button" class="btn btn-small on" aria-haspopup="menu" aria-expanded="true">${fa('sliders')}<span>View</span></button>${MORE(false)}</div>
    <div class="pm-pop-at" style="top:46px;right:8px">${M([HEAD('Sort by'), I('Date', { k: 'radio', on: true }), I('Name', { k: 'radio' }), I('Cost', { k: 'radio' }), SEP, HEAD('Show'), I('Completed', { k: 'check', on: true }), I('Notes', { k: 'check' }), I('Compact rows', { k: 'switch' })].join(''), { label: 'View', cls: 'pm-w220' })}</div></div></div>`;
  };

  // ---- a menu you can drive from the keyboard ----
  const tryBody = () => `<div class="ds-proposed"><p class="pm-cap">Press the button, or Tab to it then press Down. Arrows, Home, End, Enter, Escape; Right on "Move to..." opens its flyout, Left or Escape closes it.</p>
    <div class="pm-over" style="min-height:330px"><button type="button" class="btn btn-small" id="tryTrigger" aria-haspopup="menu" aria-expanded="true" aria-controls="tryMenu">${fa('ellipsis')}<span>Actions</span></button>
    <div class="pm-pop-at" style="top:36px;left:0">${M([
    I('Edit', { icon: 'pen', tab: 0 }), I('Duplicate', { icon: 'copy' }), I('Archive', { icon: 'box-archive', disabled: true }), I('Move to...', { icon: 'arrow-right-to-bracket', k: 'cat', flyout: 'tryFly' }), SEP, I('Show notes', { k: 'check', on: true }), I('Compact rows', { k: 'switch' }), SEP, I('Delete', { icon: 'trash', danger: true }),
  ].join(''), { id: 'tryMenu', demo: true, cls: 'pm-w220', label: 'Actions' })}</div>
    <div class="pm-pop-at" style="top:36px;left:226px"><div class="sdk-menu-flyout pm-w180 pm-fly3" id="tryFly" role="menu" aria-label="Move to" data-demo-menu hidden>${[I('Today', { icon: 'calendar-day', tab: 0 }), I('Tomorrow', { icon: 'calendar-day' }), I('Pick a day...', { icon: 'calendar' })].join('')}</div></div></div></div>`;
  function tryDemo(doc) {
    const trig = doc.getElementById('tryTrigger'); const top = doc.getElementById('tryMenu'); const fly = doc.getElementById('tryFly');
    if (!trig || !top || !fly) return;
    const its = (m) => [...m.querySelectorAll(':scope > [role^="menuitem"]')].filter((x) => x.getAttribute('aria-disabled') !== 'true');
    const rove = (m, el) => { for (const x of m.querySelectorAll(':scope > [role^="menuitem"]')) x.tabIndex = x === el ? 0 : -1; el.focus(); };
    const cat = top.querySelector('[data-flyout]');
    const openFly = () => { fly.hidden = false; cat.setAttribute('aria-expanded', 'true'); rove(fly, its(fly)[0]); };
    const closeFly = (back) => { fly.hidden = true; cat.setAttribute('aria-expanded', 'false'); if (back) rove(top, cat); };
    const openTop = () => { top.hidden = false; trig.setAttribute('aria-expanded', 'true'); rove(top, its(top)[0]); };
    const closeTop = () => { closeFly(false); top.hidden = true; trig.setAttribute('aria-expanded', 'false'); trig.focus(); };
    trig.addEventListener('click', () => { if (top.hidden) openTop(); else closeTop(); });
    trig.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown' && top.hidden) { e.preventDefault(); openTop(); } });
    doc.addEventListener('keydown', (e) => {
      const it = e.target.closest && e.target.closest('[data-demo-menu] > [role^="menuitem"]'); if (!it) return;
      const m = it.parentElement; const list = its(m); const i = list.indexOf(it);
      const go = (el) => { e.preventDefault(); rove(m, el); };
      if (e.key === 'ArrowDown') go(list[(i + 1) % list.length]);
      else if (e.key === 'ArrowUp') go(list[(i - 1 + list.length) % list.length]);
      else if (e.key === 'Home') go(list[0]);
      else if (e.key === 'End') go(list[list.length - 1]);
      else if (e.key === 'ArrowRight' && it === cat) { e.preventDefault(); openFly(); }
      else if (e.key === 'ArrowLeft' && m === fly) { e.preventDefault(); closeFly(true); }
      else if (e.key === 'Escape') { e.preventDefault(); if (m === fly) closeFly(true); else closeTop(); }
      else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); it.click(); }
    });
    doc.addEventListener('click', (e) => {
      const it = e.target.closest && e.target.closest('[data-demo-menu] > [role^="menuitem"]'); if (!it) return;
      const role = it.getAttribute('role');
      if (it === cat) { if (fly.hidden) openFly(); else closeFly(true); return; }
      if (role === 'menuitemcheckbox') it.setAttribute('aria-checked', String(it.getAttribute('aria-checked') !== 'true'));
      else if (role === 'menuitemradio') { for (const x of it.parentElement.querySelectorAll('[role="menuitemradio"]')) x.setAttribute('aria-checked', String(x === it)); }
      else closeTop();
    });
  }

  // ---- the aliases: Today's own class names ----
  const aliasBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('.sdk-menu (host.menu.show)', `<div class="sdk-menu" role="menu"><button type="button" class="sdk-menu-item"><span class="sdk-menu-icon">${fa('pen')}</span><span class="sdk-menu-label">Edit</span></button><div class="sdk-menu-sep"></div><button type="button" class="sdk-menu-item danger"><span class="sdk-menu-icon">${fa('trash')}</span><span class="sdk-menu-label">Delete</span></button></div>`, 220)}
    ${CELL('.host-menu (the nav registry)', `<div class="host-menu" role="menu"><div class="host-menu-heading">Layout</div><button type="button" class="host-menu-item">${fa('table-cells')}<span class="host-menu-label">Grid</span><span class="host-menu-tag">Default</span></button><button type="button" class="host-menu-item host-menu-category" aria-haspopup="menu" aria-expanded="true">${fa('folder-open')}<span class="host-menu-label">Saved</span><span class="host-menu-caret">${fa('chevron-right')}</span></button><button type="button" class="host-menu-item" role="menuitemcheckbox" aria-checked="true"><span class="host-menu-label">Snap to grid</span><span class="host-menu-switch"></span></button></div>`, 220)}
    ${CELL('.modules-menu', `<div class="modules-menu" role="menu"><button type="button" class="modules-menu-item on">${fa('comments')}<span>Chat</span><span class="badge">3</span></button><button type="button" class="modules-menu-item">${fa('calendar')}<span>Calendar</span></button><button type="button" class="modules-menu-item">${fa('map')}<span>Map</span></button></div>`, 220)}
    ${CELL('.menu (the Planner\'s)', `<div class="menu" role="menu"><button type="button">${fa('pen')}<span>Edit</span></button><button type="button">${fa('arrow-up')}<span>Earlier</span></button><button type="button" class="danger">${fa('trash')}<span>Delete</span></button></div>`, 220)}
    ${CELL('.chat-command-menu', `<div class="chat-command-menu" role="listbox"><button type="button" class="chat-command-item" role="option"><span>/roll</span></button><button type="button" class="chat-command-item" role="option"><span>/rules</span></button></div>`, 220)}
    ${CELL('.sdk-kind-list (a dropdown list)', `<div class="sdk-kind-list" role="listbox"><div class="sdk-kind-group"><div class="sdk-kind-group-title">Travel</div>${kindOpt(KINDS[0][1][0])}${kindOpt(KINDS[0][1][1], { sel: true })}</div></div>`, 220)}
    ${CELL('.popover (a call popover)', `<div class="popover" role="dialog"><h3>Microphone</h3><select aria-label="Microphone"><option>Built-in microphone</option></select></div>`, 220)}
  </div></div>`;

  // ---- contrast, worked out in the page ----
  const CARD = '--bg-card';
  const HOVER = 'color-mix(in srgb, var(--text) 10%, transparent)';
  const TC_ROWS = [
    ['Item text (--text) on the menu surface', 'var(--text)', [CARD], 4.5],
    ['Hint (--text-dim, 12px) on the surface', 'var(--text-dim)', [CARD], 4.5],
    ['Hint on a hovered or focused row, as drawn (dim 50% into text)', 'color-mix(in srgb, var(--text-dim) 50%, var(--text))', [CARD, HOVER], 4.5],
    ['Section heading (--text-dim, 11px) on the surface', 'var(--text-dim)', [CARD], 4.5],
    ['Current row text (accent 55% into text) on the selected fill', 'color-mix(in srgb, var(--accent) 55%, var(--text))', [CARD, '--selected-bg'], 4.5],
    ['The same, hovered (accent 33% fill)', 'color-mix(in srgb, var(--accent) 55%, var(--text))', [CARD, 'color-mix(in srgb, var(--accent) 33%, transparent)'], 4.5],
    ['Hint on the current row, as drawn', 'color-mix(in srgb, var(--accent) 55%, var(--text))', [CARD, '--selected-bg'], 4.5],
    ['Danger text (danger 70% into text) on the surface', 'color-mix(in srgb, var(--danger) 70%, var(--text))', [CARD], 4.5],
    ['Danger text on the hover fill, as drawn (danger 55% into text)', 'color-mix(in srgb, var(--danger) 55%, var(--text))', [CARD, HOVER], 4.5],
    ['Danger text at rest (70%) on the hover fill (not used: shown to compare)', 'color-mix(in srgb, var(--danger) 70%, var(--text))', [CARD, HOVER], 4.5],
    ['Plain --danger on the surface (not used: shown to compare)', 'var(--danger)', [CARD], 4.5],
    ['Count text (--text) on its pill (text 14%)', 'var(--text)', [CARD, 'color-mix(in srgb, var(--text) 14%, transparent)'], 4.5],
    ['Chosen day: --on-accent on --accent', 'var(--on-accent)', [CARD, '--accent'], 4.5],
    ['Today: --text on the half-strength selected fill', 'var(--text)', [CARD, 'color-mix(in srgb, var(--selected-bg) 50%, transparent)'], 4.5],
    ['A day in a range: --text on the quiet fill', 'var(--text)', [CARD, HOVER], 4.5],
    ['A day of the other month (--text-dim) on the surface', 'var(--text-dim)', [CARD], 4.5],
    ['Focus outline (--accent) on the surface', 'var(--accent)', [CARD], 3],
    ['Focus outline on the current row, as drawn (accent mix)', 'color-mix(in srgb, var(--accent) 55%, var(--text))', [CARD, '--selected-bg'], 3],
    ['Focus outline on the chosen day, as drawn (--on-accent)', 'var(--on-accent)', [CARD, '--accent'], 3],
    ['Tick box edge and switch track (--text-dim) on the surface', 'var(--text-dim)', [CARD], 3],
    ['The surface against the page (the fill alone; the hairline and the shadow carry the edge)', 'var(--bg-card)', ['--bg'], 1],
  ];
  const tcBody = () => `<div class="ds-proposed"><table class="pm-ct"><thead><tr><th>Pair</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${TC_ROWS.map((r) => `<tr data-fg="${h(r[1])}" data-bgs="${h(JSON.stringify(r[2]))}" data-min="${r[3]}"><td>${r[0]}</td><td class="pm-n" data-out="r"></td><td class="pm-n">${r[3] === 1 ? 'info' : r[3] + ' to 1'}</td><td data-out="p"></td></tr>`).join('')}</tbody></table></div>`;
  const measureContrast = (doc) => {
    const host = doc.querySelector('.ds-proposed');
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const col = (expr) => { const p = doc.createElement('span'); p.style.color = expr.startsWith('--') ? `var(${expr})` : expr; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (d) => 0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]);
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-ct tbody tr')) {
        const layers = JSON.parse(tr.dataset.bgs);
        g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillRect(0, 0, 1, 1); g.clearRect(0, 0, 1, 1);
        for (const l of layers) { g.fillStyle = col(l); g.fillRect(0, 0, 1, 1); }
        const base = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        g.fillStyle = col(tr.dataset.fg); g.fillRect(0, 0, 1, 1);
        const top = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        const a = lum(top); const b = lum(base);
        const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const ok = r >= Number(tr.dataset.min);
        const p = tr.querySelector('[data-out="p"]'); p.textContent = Number(tr.dataset.min) === 1 ? 'Info' : ok ? 'Passes' : 'Fails'; p.className = Number(tr.dataset.min) === 1 ? '' : ok ? 'pm-pass' : 'pm-fail';
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  // ---- the block ----
  function renderMenus(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="menus-h"><a href="#menus">Menus and popovers</a></h3><span class="ds-status-chip ds-st-approved">Approved</span><span class="ds-count">menus, flyouts, popovers, dropdown lists, the chat command menu, the bell panel's container: one surface, one item</span></header>
<p class="ds-desc"><b>Approved 2026-10-19, from Thomas's decisions of 2026-10-18 and 2026-10-19.</b> Decided by Thomas: one standard surface (a 1px neutral hairline, <code>--radius-medium</code>, one shadow token, 4px of padding, 180 to 320px wide); items 32px high (44px on a phone); hover is a quiet neutral fill; the current choice has <code>--selected-bg</code> with the darker accent text; a check mark only in tick-box rows; danger is red text only; a long list with search becomes the bottom sheet the kind picker already uses. <b>Decided 2026-10-19:</b> the shadow is smaller and tighter (<code>0 4px 12px</code>; Thomas: "just make sure the shadow isn't too large"); the scrim token; hover at <code>--text</code> 10%; and the date picker's chosen-day exception (the one solid accent). <b>Taken as drawn</b> (to tune later): the surface step, the tick box and the popover padding rule, and the numbers in "Tokens". Drawn from <code>proposed-menus.css</code>; the product is untouched. The count and the tag in a row are the Chips family's (<code>.sdk-badge</code>, <code>.sdk-chip-tag</code>); this family only places them.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#menus-anatomy">Anatomy</a><a href="#menus-surface">Surface and shadow</a><a href="#menus-contract">Markup and parts</a><a href="#menus-states">States</a><a href="#menus-content">Rows by content</a><a href="#menus-desktop">A "..." menu</a><a href="#menus-phone">On a phone</a><a href="#menus-flyout">Flyout</a><a href="#menus-keys">Keyboard</a><a href="#menus-sheet">Bottom sheet</a><a href="#menus-dp">Date picker</a><a href="#menus-kind">Kind picker</a><a href="#menus-chat">Chat command menu</a><a href="#menus-pop">Popovers</a><a href="#menus-ctx">In context</a><a href="#menus-widths">Widths</a><a href="#menus-alias">Aliases</a><a href="#menus-map">Today to proposed</a><a href="#menus-contrast">Contrast</a><a href="#menus-tokens">Tokens</a><a href="#menus-later">Later families</a></nav>

<h4 class="ds-h4" id="menus-anatomy">Anatomy</h4>
<div data-slot="zoom"></div>
${dim([
    ['1 Surface', '<code>--bg-card</code>, a 1px <code>--border</code> hairline, <code>--radius-medium</code>, <code>--shadow-2</code>, 4px padding, 180 to 320px wide (a popover: its own width, 14px or 8px padding), one layer: <code>--z-menu</code>.'],
    ['2 Row', '32px high, 44px on a phone and when the menu has <code>.narrow</code>. A 1px transparent edge, then 6px by 9px of padding, so 7 by 10 in all. <code>--radius-small</code>. 14px text, a line of 18px. A row never grows: the label is cut with an ellipsis and carries a <code>title</code>.'],
    ['3 Icon', 'Optional, <code>1em</code>, 8px before the label. If one row has an icon, every row has one (or an empty slot), so the labels line up.'],
    ['4 Label', 'One line. Sentence case. A label that ends in "..." opens a dialog or a flyout.'],
    ['5 Hint', 'Optional, at the row\'s end: 12px, <code>--text-dim</code> (a shortcut, a small fact). It takes a darker dim on a hovered, focused or current row so it stays readable (see Contrast).'],
    ['6 Count or tag', 'Optional, at the row\'s end, 12px after the label: the Chips family\'s neutral count (<code>.sdk-badge</code>, 18px) or tag (<code>.sdk-chip-tag</code>, 24px, which stands a little into the row\'s padding). This family places them and draws nothing of its own.'],
    ['7 Tick box, switch, arrow', 'A tick box at the start of a tick-box row (the only check mark). A switch at the end of a switch row. A small chevron at the end of a row that opens a flyout.'],
    ['8 Heading', '11px, bold, uppercase, <code>--text-dim</code>, 6% letter spacing, 8px above and 4px below. The smallest text in the system is 11px.'],
    ['9 Divider', 'A 1px <code>--border</code> line, 4px above and below, 6px in from each side.'],
    ['10 Focus', 'A 2px <code>--accent</code> outline drawn over the 1px edge, inside the row (offset -2px): the Fields\' and Tabs\' mechanism, equal on all four sides at any display scale (measured at 1.25 and 1.5). Inside, because a menu scrolls and cuts anything outside it. On the current row the outline is the accent mix (the plain accent is under 3 to 1 on that fill in light mode).'],
  ])}

<h4 class="ds-h4" id="menus-surface">Surface and shadow</h4>
<p class="ds-desc"><b>The surface step (taken as drawn).</b> The surface is <code>--bg-card</code>, which today is the page colour with 15% of the hairline colour mixed in (<code>--bg-input</code>). It is opaque. In dark mode it is a hair lighter than the page and a hair darker than a section; in light mode it is a hair darker than the page. So the hairline and the shadow, not the fill, set a menu apart, and that is why the shadow is real. If Thomas wants the menu to read as lifted in dark mode too, the alternative is one step lighter (<code>--bg-section</code> mixed 8% toward <code>--text</code>); it costs one new mix. The hex values below are read from the theme in the mode on show.</p>
<div data-slot="surface"></div>
${tbl(['', 'Dark', 'Light', 'Note'], [
    ['<code>--shadow-2</code> (<b>Decided 2026-10-19</b>)', '<code>0 4px 12px rgba(0, 0, 0, 0.40)</code>', '<code>0 4px 12px</code> of <code>--text</code> at 14%', 'The one shadow of what floats: a menu, a flyout, a popover, the list under a field. Thomas asked that it not be too large, so it is smaller and tighter than today\'s <code>0 8px 24px</code> (it reaches 16px below a menu, not 32px). Measured at 1280: in the light mode the darkest shadow pixel under a menu is 1.21 to 1 against the page behind (1.34 over a section); in the dark mode it is 1.05 to 1 and the 1px hairline (1.39 to 1) does the separating. <code>--shadow-1</code> (a card while dragged) is <code>0 2px 8px</code>, smaller than this one. Windows and dialogs get their own <code>--shadow-3</code> with the Dialogs family. The bottom sheet has no shadow: the scrim separates it.'],
    ['<code>--scrim</code> (<b>Decided 2026-10-19</b>)', '<code>rgba(0, 0, 0, 0.55)</code>', '<code>rgba(0, 0, 0, 0.55)</code> (the same in light: the token is Foundations\'s)', 'The backdrop behind the bottom sheet. Dialogs and sheets use the same token.'],
    ['<code>--z-menu</code>', '26', '26', 'The one layer for menus, flyouts, popovers and the sheet with its scrim. It exists today. The other layers in use (9999, 30, 40, 60, 7, 20) go.'],
  ])}

<h4 class="ds-h4" id="menus-contract">Markup and parts</h4>
<p class="ds-desc"><b>The contract is <code>.sdk-menu</code> with <code>.sdk-menu-item</code> rows as direct children.</b> Everything else is a part, a variant, or an alias of a name the product already uses, so no markup has to change for the look to change.</p>
${tbl(['Part', 'Class', 'Aliases kept', 'Notes'], [
    ['Menu', '<code>.sdk-menu</code>', '<code>.host-menu</code>, <code>.modules-menu</code>, <code>.menu</code>, <code>.chat-command-menu</code>, <code>.sdk-kind-list</code>', 'Placed by its host (fixed or absolute); the component sets no position. <code>role="menu"</code> (a list: <code>role="listbox"</code>). <code>.narrow</code> makes the rows 44px.'],
    ['Row', '<code>.sdk-menu-item</code>', '<code>.host-menu-item</code>, <code>.modules-menu-item</code>, <code>.chat-command-item</code>, <code>.menu &gt; button</code>, <code>.sdk-kind-option</code>', 'A <code>button</code>, or an <code>a</code> for a place. <code>role="menuitem"</code>, <code>menuitemradio</code> or <code>menuitemcheckbox</code>.'],
    ['Parts', '<code>.sdk-menu-icon</code> <code>.sdk-menu-label</code> <code>.sdk-menu-hint</code> <code>.sdk-badge</code> <code>.sdk-chip-tag</code> <code>.sdk-menu-caret</code>', '<code>.host-menu-label</code>, <code>.host-menu-hint</code>, <code>.host-menu-tag</code>, <code>.host-menu-caret</code>, <code>.modules-menu-item .badge</code>', 'Direct children of the row, in this order.'],
    ['Tick box, switch', '<code>.sdk-menu-check</code>, <code>.sdk-menu-switch</code>', '<code>.host-menu-switch</code>', 'Spans, drawn as the Fields\' tick box and switch. The row carries <code>aria-checked</code>.'],
    ['Heading, divider', '<code>.sdk-menu-heading</code>, <code>.sdk-menu-sep</code>', '<code>.host-menu-heading</code>, <code>.sdk-kind-group-title</code>, <code>.popover h3</code>', 'The divider is a 1px line (a background, never a border).'],
    ['Flyout', '<code>.sdk-menu-flyout</code>', '<code>.host-menu-flyout</code>', 'A second menu beside the row that opens it.'],
    ['Sheet', '<code>.sdk-menu-sheet</code>, <code>.sdk-menu-scrim</code>, <code>.sdk-menu-grip</code>, <code>.sdk-menu-list</code>', '<code>.sdk-kind-sheet</code> (the kind picker\'s phone sheet)', 'New. A phone only.'],
    ['Popover', '<code>.sdk-popover</code>, <code>.sdk-popover-heading</code>, <code>.sdk-popover-block</code>, <code>.sdk-popover-foot</code>, <code>.sdk-popover-dense</code>', '<code>.popover</code> (with its <code>h3</code>), <code>.bell-list</code> (container), <code>.sdk-dp</code> (the date picker), the emoji picker', 'The same surface with its own padding.'],
  ])}
<p class="ds-desc"><b>Choice states are attributes</b>, never a class a consumer picks: <code>aria-current="true"</code> (or <code>"page"</code>) on a place, <code>aria-checked="true"</code> on a radio row (the current fill) or a tick-box or switch row (the check or the switch on), <code>aria-expanded="true"</code> on a row whose flyout is open, <code>aria-disabled="true"</code> or <code>disabled</code>. <code>.current</code> and <code>.on</code> are kept as aliases for today's markup. <code>.danger</code> marks a danger row; <code>.active</code> marks the cursor row of a list that keeps focus elsewhere (the chat command menu).</p>

<h4 class="ds-h4" id="menus-states">States</h4>
<p class="ds-desc">One row in every state, forced from the proposed rules. <b>Hover</b> is a quiet neutral fill (<code>--text</code> at 10%), the same in every row, danger included. <b>Focus</b> is the quiet fill and the 2px ring. <b>Current</b> is <code>--selected-bg</code> with the accent-mix text; hovered it deepens to accent 33%. <b>Danger</b> is red text only (danger 70% into text, the Danger button's text); no red fill ever. <b>Disabled</b> is half strength and takes no pointer. <b>Submenu open</b> keeps the quiet fill. <b>Cursor</b> is the quiet fill for a list whose focus stays in a text box. <b>Decided 2026-10-19:</b> hover at 10% (the Tabs' value), so the quiet fill is one value everywhere.</p>
<p class="ds-desc"><b>32px rows (the default)</b></p>
<div data-slot="states"></div>
<p class="ds-desc"><b>44px rows (<code>.narrow</code>, and any phone)</b></p>
<div data-slot="states-narrow"></div>

<h4 class="ds-h4" id="menus-content">Rows by content</h4>
<p class="ds-desc">An icon, a hint, a count, a tag, a submenu arrow; a tick box (unchecked, checked); a switch (off, on); a radio group with its current row; headings and dividers. A check mark appears only in a tick-box row. A radio row shows its current choice by the fill, never a mark. A <b>choice</b>: the tick box is the Fields' 16px box drawn at the start of the row, so it reads as a box you can tick and not as "selected".</p>
<div data-slot="content"></div>

<h4 class="ds-h4" id="menus-desktop">A "..." menu</h4>
<p class="ds-desc">Edit, Duplicate, Move to..., a divider, Delete. Delete is red text; on hover it has the same quiet fill as Edit. The trigger is the approved Quiet small icon button (<code>.sdk-more</code>), selected (<code>.on</code>) while its menu is open.</p>
<div data-slot="desktop"></div>

<h4 class="ds-h4" id="menus-phone">On a phone</h4>
<p class="ds-desc">Menus stay popovers on a phone; only the long-list sheet changes shape. The rows are 44px, which is the phone's own navigation panel today (the only 44px menu), now everywhere. The "..." trigger keeps its small look and has a 44px hit area.</p>
<div data-slot="phone"></div>

<h4 class="ds-h4" id="menus-flyout">Flyout</h4>
<p class="ds-desc">A row with a chevron opens a second menu beside it, with the same surface and rows, 2px off the first. Its first row lines up with the row that opened it. The opener keeps the quiet fill while the flyout is open. At the edge of the screen the flyout opens to the left. On a phone a flyout is a second popover under the row, not beside it.</p>
<div data-slot="flyout"></div>

<h4 class="ds-h4" id="menus-keys">Keyboard</h4>
<p class="ds-desc">Down and Up move between rows and wrap; Home and End go to the first and last; Enter or Space chooses (a tick box or switch toggles and the menu stays open; any other row closes it and returns focus to the trigger); Escape closes the menu and returns focus to the trigger; Right opens a flyout and Left or Escape closes it back to its row. A disabled row is skipped. One row is the tab stop (roving tab index). The ring is drawn in the States above and measured at 1.25 and 1.5 display scale. This example is live:</p>
<div data-slot="try"></div>

<h4 class="ds-h4" id="menus-sheet">Bottom sheet for a long list</h4>
<p class="ds-desc"><b>On a phone, a list with a search field, or with more than about 8 rows, becomes a bottom sheet</b> (the kind picker's, which it already has). Wider than a phone, the same list stays a popover and scrolls at 360px. The sheet is the lower 80% of the screen at most, with <code>--radius-large</code> top corners (a sheet is a window edge, so it keeps the large corner), the scrim behind it, 44px rows, a search field at the top (the Fields' search) and a drag handle (optional: a 36 by 4 bar). It has no shadow of its own. Tapping the scrim, or Escape, closes it.</p>
<div data-slot="sheet"></div>

<h4 class="ds-h4" id="menus-dp">Date picker popup</h4>
<p class="ds-desc">The popover surface with 8px padding. The day cell is 30px (44px on a phone), <code>--radius-small</code>. Hover is the quiet fill. <b>Today</b> is a neutral fill with no outline: <code>--selected-bg</code> at half strength (the accent at 14%), in bold. <b>A range</b> is the quiet fill. <b>The chosen day is a solid accent fill with <code>--on-accent</code> text.</b> <b>Decided 2026-10-19 (an exception):</b> everywhere else "selected" is the neutral fill, but the chosen day is the single value the picker exists to set, so it gets the one solid accent in the family, like the Primary button. Its focus ring is <code>--on-accent</code>, because an accent ring cannot show on an accent fill. In light mode the chosen day reads 4.45 to 1 (white on the accent), the same pair as the Primary button, just under 4.5: it is fixed once in the Colour family's text-on-accent, not here. Month names and arrows are 14px and the small Quiet buttons.</p>
<div data-slot="dp"></div>
<div data-slot="dp-phone"></div>

<h4 class="ds-h4" id="menus-kind">Kind picker list</h4>
<p class="ds-desc">The dropdown list under the kind field: the menu surface, so its corner is <code>--radius-medium</code> (it is the large radius today; the large corner is for windows and the sheet). Group titles are the standard heading at 11px (10px today), separated by a divider. Rows are the menu row: 32px (28px today), 44px on a phone. The cursor row has the quiet fill. The chosen row is bold and its icon sits on a chip in the kind's colour; every other row has the icon in the kind's colour with no chip.</p>
<div data-slot="kind"></div>

<h4 class="ds-h4" id="menus-chat">Chat command menu</h4>
<p class="ds-desc">The menu surface above the chat box (it opens upward and replaces today's 97% blend, 29px rows and 16% accent hover). Focus stays in the box, so the cursor row has the quiet fill (<code>aria-selected</code> and <code>.active</code>) and the box names it with <code>aria-activedescendant</code>.</p>
<div data-slot="chat"></div>

<h4 class="ds-h4" id="menus-pop">Popovers</h4>
<p class="ds-desc">A popover is the menu surface (same fill, hairline, corner and shadow) around content that is not a list of rows: the call popovers, filter popovers, the emoji picker, the bell panel's container, the date picker. <b>The padding rule (decided; 14px stays, 2026-10-21).</b> 14px around controls and forms (call and filter popovers, the bell panel), 8px around a grid or a list (the date picker, the emoji picker); 12px between blocks; nothing else. The heading is the standard section heading, neutral and dim (the accent-coloured 12px uppercase <code>h3</code> of the call popovers goes). The corner is <code>--radius-medium</code>.</p>
<div data-slot="pop"></div>

<h4 class="ds-h4" id="menus-ctx">In context</h4>
<p class="ds-desc">A card with its "..." and the menu open over the next card; and a toolbar with a view switch, a View button and its menu (a radio group with the current choice, tick boxes and a switch).</p>
<div data-slot="ctx-card"></div>
<div data-slot="ctx-tool"></div>

<h4 class="ds-h4" id="menus-widths">Widths</h4>
<p class="ds-desc">The toolbar and its open menu at 390 (a phone: 44px rows, the switch in icons), 700 and 1280.</p>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="menus-alias">Aliases: today's markup, unchanged</h4>
<p class="ds-desc">These use only today's class names. They take the proposed look with no markup edit. Three small markup edits remain, all in the code that draws them: the empty caret span of <code>host.menu.show</code> gets its chevron icon, the tick-box and switch rows get their span, and the kind list's group dividers come from the heading rule.</p>
<div data-slot="alias"></div>
${tbl(['Today\'s name', 'Becomes', 'Where'], [
    ['<code>.sdk-menu</code>, <code>.sdk-menu-item</code>, <code>-icon</code>, <code>-label</code>, <code>-hint</code>, <code>-sep</code>, <code>-heading</code>, <code>-caret</code>, <code>-category</code>', 'The component itself', '<code>host.menu.show</code> (host.js)'],
    ['<code>.host-menu</code> and its <code>-item</code>, <code>-label</code>, <code>-hint</code>, <code>-heading</code>, <code>-category</code>, <code>-caret</code>, <code>-flyout</code>, <code>-switch</code>, <code>-tag</code>', '<code>.sdk-menu</code> and its parts', 'The nav registry\'s menus: Layout, Favorites, the folded top bar (style.css)'],
    ['<code>.modules-menu</code>, <code>.modules-menu-item</code> (and <code>.on</code>, <code>.badge</code>)', '<code>.sdk-menu</code>, a row, the current fill, the count', 'The Modules list, the phone\'s tab bar holder (style.css)'],
    ['<code>.chat-command-menu</code>, <code>.chat-command-item</code>', '<code>.sdk-menu</code> as a listbox', 'Chat (style.css)'],
    ['<code>.menu</code> and <code>.menu button</code>', '<code>.sdk-menu</code>; the Planner moves onto <code>host.menu.show</code>', 'The Planner (modules/travel)'],
    ['<code>.sdk-kind-list</code>, <code>.sdk-kind-option</code>, <code>.sdk-kind-group-title</code>', 'A dropdown list on the same surface and row', '<code>host.ui.kindPicker</code> (host.css)'],
    ['<code>.sdk-dp</code> and its parts', 'A dense popover', '<code>host.ui.datePicker</code> (host.css)'],
    ['<code>.popover</code> (defined twice) and <code>.popover h3</code>', '<code>.sdk-popover</code>; the heading is the standard one', 'The call popovers, chat help and emoji (style.css)'],
    ['<code>.bell-list</code>, <code>.bell-head</code>', 'A popover container and heading (the notification rows are not part of this family)', 'The bell panel (style.css)'],
    ['The phone nav panel, <code>.topbar.menu-open nav.links</code>', '<code>.sdk-menu</code> with <code>.narrow</code>', 'The top bar on a phone (style.css)'],
  ])}

<h4 class="ds-h4" id="menus-map">Today to proposed</h4>
<p class="ds-desc">Written from the brief; not loaded here (Today's page shows these as they are).</p>
${tbl(['Today', 'Proposed', 'What changes visually'], [
    ['<code>.sdk-menu</code>: 180 to 320 wide, 31px rows, accent 14% hover, red fill on danger hover, shadow 0 8px 24px, z 9999 (host.js)', 'The component', 'Rows 31 to 32px. Hover is neutral, not an orange tint. Danger hover is the same quiet fill, not red. Layer 9999 to the one menu layer.'],
    ['<code>.host-menu</code>: 160 to 280 wide, trailing check, switch rows 22 by 12, a bordered tag, a 26px "more" button (style.css:7234)', 'The component', 'Wider range. The trailing check goes: a radio row is the fill, a tick-box row has its box. The switch is the Fields\' switch. The tag is the neutral pill. The 26px "more" is the small Quiet icon button.'],
    ['<code>.modules-menu</code>: 6px padding, 8px rows on the Secondary fill, <code>.on</code> already the selected fill, an accent count', 'The component', 'The rows lose their button fill. <code>.on</code> is already right. The count is the neutral pill, not accent.'],
    ['Chat command menu: 97% blend of the section colour, 29px rows, 16% accent hover, shadow 0 8px 30px, z 30 (style.css:4942)', 'The component, as a listbox', 'Opaque card colour. Rows 29 to 32px. Neutral hover. The shadow and layer are the shared ones.'],
    ['Planner <code>.menu</code>: section colour, 36px rows, hover text 10%, mouse only (travel.css:119)', '<code>host.menu.show</code>', 'Rows 36 to 32px. Arrow keys, Home, End and Escape work. The Planner stops drawing its own menu.'],
    ['Bell panel (<code>.bell-list</code>)', 'A popover container', 'The shared surface and shadow; its rows are not changed here.'],
    ['Phone nav panel: 44px rows, 15px text, z 40 (style.css:8386)', 'The component, narrow', 'Text 15 to 14px. Same rows, now everywhere on a phone.'],
    ['Date picker <code>.sdk-dp</code>: section colour, 252px, 30px cells, accent 14% hover, 18% range, 10px weekday names (host.css:746)', 'A dense popover', 'Card colour. Neutral hover and range. Today is a quieter fill. 44px cells on a phone. Weekday names 11px. The chosen day stays solid accent.'],
    ['Kind list <code>.sdk-kind-list</code>: large corner, 28px rows, 10px group titles, a bottom sheet on a phone (host.css:1090)', 'A dropdown list; the long list on a phone is the sheet', 'Corner large to medium. Rows 28 to 32px. Titles 10 to 11px. The sheet keeps the large top corners and gets a scrim and a handle.'],
    ['Call popovers <code>.popover</code> (defined twice): 97% blend, shadow 0 8px 30px, z 7, accent uppercase 12px heading (style.css:5383, 5544)', '<code>.sdk-popover</code>', 'Opaque card colour. The heading is neutral and 11px. One definition.'],
    ['Chat help and emoji popups', 'A popover (14px, or 8px for a grid)', 'The shared surface.'],
  ])}
<p class="ds-desc"><b>What the one component settles.</b></p>
${tbl(['Today has', 'Now'], [
    ['Row heights 28, 29, 31, 34, 36 and 44', '32, and 44 on a phone'],
    ['Corners medium and large', 'Medium (the sheet\'s top corners are large)'],
    ['Five shadows', 'One: <code>--shadow-2</code>'],
    ['Surfaces <code>--bg-card</code>, <code>--bg-section</code>, 97% blends', '<code>--bg-card</code>, opaque'],
    ['Hover: accent 14%, accent 16%, text 10%, the Secondary fill', 'Text 10%'],
    ['Selected: a check, a fill, bold', 'A radio row or a place: the fill. A tick-box row: its box. A kind: bold and a chip. A day: the solid accent'],
    ['Danger: red text with a red hover fill, plain red text', 'The darker red text, quiet hover'],
    ['Layers 9999, 26, 30, 40, 60, 7, 20', '<code>--z-menu</code>'],
  ])}

<h4 class="ds-h4" id="menus-contrast">Contrast</h4>
<p class="ds-desc">Worked out by this page, in the mode on show: flip the Dark and Light switch and the table follows. Text needs 4.5 to 1; the focus ring, the tick box edge and the switch track need 3 to 1.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="menus-tokens">Tokens</h4>
${tbl(['Token', 'Use here', ''], [
    ['<code>--shadow-2</code>', 'The one shadow of what floats. Dark <code>0 4px 12px rgba(0, 0, 0, 0.40)</code>; light <code>0 4px 12px</code> of <code>--text</code> at 14%.', 'new'],
    ['<code>--scrim</code>', 'The backdrop of the sheet: black at 55% in both modes (the Foundations token).', 'new'],
    ['<code>--menu-pad</code>, <code>--menu-w-min</code>, <code>--menu-w-max</code>', '4px; 180px; 320px.', 'new'],
    ['<code>--menu-item-h</code>, <code>--menu-font</code>', '32px (44px at 640px and narrower, and with <code>.narrow</code>); 14px.', 'new'],
    ['<code>--menu-hover</code>, <code>--menu-press</code>', 'The quiet fills: <code>--text</code> at 10% and 16%, mixed with transparent.', 'new'],
    ['<code>--menu-current-fg</code>, <code>--menu-current-hover</code>', 'The current row\'s text (accent 55% into text, the Tabs\' mix) and its hovered fill (accent at 33%).', 'new'],
    ['<code>--menu-danger-fg</code>', 'Danger 70% into text, the Danger button\'s text.', 'new'],
    ['<code>--pop-pad</code>, <code>--dp-day</code>', 'A popover\'s padding (14px, or 8px when dense); the date picker\'s cell (30px, 44px on a phone).', 'new'],
    ['<code>--bg-card</code>, <code>--border</code>', 'The surface and its hairline.', 'exists'],
    ['<code>--selected-bg</code>', 'The current row, and (at half strength) today in the date picker.', 'exists'],
    ['<code>--accent</code>, <code>--on-accent</code>, <code>--danger</code>', 'The focus ring, the chosen day, the tick box and switch on; danger text (mixed).', 'exists'],
    ['<code>--text</code>, <code>--text-dim</code>', 'Text; hints, headings, the arrow, the tick box edge.', 'exists'],
    ['<code>--radius-small</code>, <code>--radius-medium</code>, <code>--radius-large</code>, <code>--radius-round</code>, <code>--radius-min</code>', 'A row; the surface; the sheet\'s top; the count and the switch; the tick box.', 'exists'],
    ['<code>--z-menu</code>', 'The one layer (26).', 'exists'],
    ['<code>--btn-h</code>', 'Not used by the rows; the "..." trigger is the Buttons\' small icon button.', 'exists (Buttons)'],
  ])}

<h4 class="ds-h4" id="menus-markup">Markup contract</h4>
${code(`<!-- the "..." menu: placed by its host; rows are direct children; the state is an attribute -->
<div class="sdk-menu" role="menu" aria-label="Actions">
  <button type="button" class="sdk-menu-item" role="menuitem" tabindex="0">
    <span class="sdk-menu-icon"><i class="fa-solid fa-pen" aria-hidden="true"></i></span><span class="sdk-menu-label">Edit</span>
  </button>
  <button type="button" class="sdk-menu-item" role="menuitem" aria-haspopup="menu" aria-expanded="false">
    <span class="sdk-menu-icon">...</span><span class="sdk-menu-label">Move to...</span>
    <span class="sdk-menu-caret"><i class="fa-solid fa-chevron-right" aria-hidden="true"></i></span>
  </button>
  <div class="sdk-menu-sep" role="separator"></div>
  <button type="button" class="sdk-menu-item danger" role="menuitem">...Delete</button>
</div>

<!-- a radio group (the current row has the fill), a tick box and a switch -->
<div class="sdk-menu-heading" role="presentation">Sort by</div>
<button type="button" class="sdk-menu-item" role="menuitemradio" aria-checked="true"><span class="sdk-menu-label">Date</span></button>
<button type="button" class="sdk-menu-item" role="menuitemcheckbox" aria-checked="true"><span class="sdk-menu-check" aria-hidden="true"></span><span class="sdk-menu-label">Completed</span></button>
<button type="button" class="sdk-menu-item" role="menuitemcheckbox" aria-checked="false"><span class="sdk-menu-label">Compact rows</span><span class="sdk-menu-switch" aria-hidden="true"></span></button>

<!-- the long-list sheet (a phone): inside a fixed layer; the scrim closes it -->
<div class="sdk-menu-scrim"></div>
<div class="sdk-menu-sheet" role="dialog" aria-modal="true" aria-label="Choose a kind">
  <span class="sdk-menu-grip" aria-hidden="true"></span>
  <div class="sdk-search">...<input type="search" aria-label="Search kinds"></div>
  <div class="sdk-menu-list" role="listbox">...options...</div>
</div>

<!-- a popover: controls at 14px, a grid or a list at 8px (add sdk-popover-dense) -->
<div class="sdk-popover" role="dialog" aria-label="Audio settings">
  <div class="sdk-popover-block"><h3 class="sdk-popover-heading">Microphone</h3><select>...</select></div>
  <div class="sdk-popover-foot"><button type="button" class="btn btn-small">Done</button></div>
</div>`)}

<h4 class="ds-h4" id="menus-later">Later families</h4>
${tbl(['Not in this family', 'Note'], [
    ['Dialogs and sheets', 'The editor window, the Set up sheets and the confirm dialog. Shares this family\'s scrim and takes <code>--shadow-3</code>, the window layer and the sheet corner.'],
    ['Toasts and banners', 'Listed today as "Banners, notices and toasts". A toast floats, so it takes <code>--shadow-2</code> and a layer above the menus.'],
    ['Tooltips', 'A small label on hover and focus. It floats too, and would use the same surface smaller.'],
  ])}
<p class="ds-desc"><b>Which to decide next: Dialogs and sheets.</b> This family only proposes the scrim and the sheet's corner because the bottom sheet needs them; the Dialogs family is where they are really decided, together with <code>--shadow-3</code> (the window), the window layer and the phone's full-height sheet. It is also the biggest pile of inconsistency left (the editor window, nine Set up sheets, the confirm). Then Toasts and banners (it shares the shadow and the layer, and wants the Chips family's colours first). Tooltips last: the smallest, and it is the menu surface made small.</p>
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + MN_CSS }, o || {}));
    slot('zoom').appendChild(F(zoomBody(), 'Menus, anatomy sample', { height: 330 }));
    slot('surface').appendChild(F(surfaceBody(), 'Menus, surface', { onload: surfaceReady }));
    slot('states').appendChild(F(statesBody(false), 'Menus, states'));
    slot('states-narrow').appendChild(F(statesBody(true), 'Menus, states, narrow'));
    slot('content').appendChild(F(contentBody(), 'Menus, content'));
    slot('desktop').appendChild(F(desktopBody(), 'Menus, the ... menu'));
    slot('phone').appendChild(F(phoneBody(), 'Menus, on a phone', { pinWidth: 390 }));
    slot('flyout').appendChild(F(flyBody(), 'Menus, flyout'));
    slot('try').appendChild(F(tryBody(), 'Menus, keyboard', { onload: tryDemo }));
    slot('sheet').appendChild(F(sheetBody(), 'Menus, sheet at 390', { pinWidth: 390 }));
    slot('dp').appendChild(F(dpBody(), 'Menus, date picker'));
    slot('dp-phone').appendChild(F(dpPhoneBody(), 'Menus, date picker on a phone', { pinWidth: 390 }));
    slot('kind').appendChild(F(kindBody(), 'Menus, kind picker'));
    slot('chat').appendChild(F(chatBody(), 'Menus, chat command menu'));
    slot('pop').appendChild(F(callBody(), 'Menus, popovers'));
    slot('ctx-card').appendChild(F(`<div class="ds-proposed">${cardWith(ACTIONS({ cls: 'pm-w200' }), { h: 230, top: 50, right: 8 })}</div>`, 'Menus, in a card', { pinWidth: 520 }));
    slot('ctx-tool').appendChild(F(toolBody(900), 'Menus, in a toolbar', { pinWidth: 640 }));
    slot('alias').appendChild(F(aliasBody(), 'Menus, aliases'));
    slot('contrast').appendChild(F(tcBody(), 'Menus, contrast', { onload: measureContrast }));
    const ws = mk('div', '');
    for (const w of [390, 700, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(toolBody(w), `Menus at ${w}`, { pinWidth: w }));
    }
    slot('widths').appendChild(ws);
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'menus', covers: ['menu', 'popover', 'flyout', 'sheet', 'datepicker', 'kindpicker'], group: 'Navigation', name: 'Menus and popovers', status: 'approved',
    words: 'menu menus popover popovers flyout submenu dropdown list sheet bottom sheet scrim shadow item row hover current danger disabled checkbox switch tick heading divider date picker day today range kind picker chat command bell panel call popover emoji more dots ellipsis host.menu.show', render: renderMenus,
  });
})();
