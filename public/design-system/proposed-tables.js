/* The Tables and Manage lists family (proposed): the one small table (roles, files, Set up), its states, and the Manage lists drawn from the approved Cards and rows
   (module rows with the switch, plan and AI service cards, member tiles). Loaded by proposed.html through proposed-families.json, after proposed.js (the page engine);
   it registers one family through window.DS_PROPOSED.families.push and draws it with the rules in proposed-tables.css. Nothing here is a style of the product:
   markup, words and tables only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules, from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // Layout of the example pages only (not a style of the product).
  const TB_CSS = `
.pm-tb-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; align-items: start; }
.pm-tb-cap { display: block; margin: 0 0 5px; color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-tb-cap.pm-top { margin-top: 14px; }
.pm-tb-note { margin: 6px 0 0; color: var(--text-dim); font-size: 12px; }
.pm-tb-h { margin: 0 0 8px; font-size: 16px; font-weight: 600; }
.pm-tb-ct { border-collapse: collapse; width: 100%; font-size: 12px; }
.pm-tb-ct th, .pm-tb-ct td { padding: 4px 8px 4px 0; text-align: left; border-bottom: 1px solid var(--border); }
.pm-tb-ct th { color: var(--text-dim); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.pm-tb-pass { color: var(--ok); font-weight: 600; }
.pm-tb-fail { color: var(--danger); font-weight: 600; }
.pm-tb-fieldrow { display: flex; flex-direction: column; gap: 4px; max-width: 320px; }
`;

  const wrap = (inner) => `<div class="ds-proposed">${inner}</div>`;
  const CAP = (s, top) => `<span class="pm-tb-cap${top ? ' pm-top' : ''}">${s}</span>`;
  const MORE = `<button type="button" class="sdk-icon-btn btn-small btn-quiet" aria-label="More" title="More">${fa('ellipsis-vertical')}</button>`;
  const sortBtn = (label, dir) => `<button type="button" class="sdk-sort">${label}${fa(dir === 'ascending' ? 'arrow-up' : dir === 'descending' ? 'arrow-down' : 'sort')}</button>`;
  const th = (label, o = {}) => `<th scope="col"${o.sort ? ` aria-sort="${o.sort}"` : ''}${o.cls ? ` class="${o.cls}"` : ''}>${o.sortable ? sortBtn(label, o.sort) : label}</th>`;
  const tick = (label, on, extra) => `<input type="checkbox"${on ? ' checked' : ''}${extra || ''} aria-label="${h(label)}">`;

  // ---- frame bodies ----
  const FILES = [['Packing list', 'Document', '12 KB', 'Oct 18'], ['Hotel booking', 'PDF', '240 KB', 'Oct 17'], ['Itinerary map', 'Image', '1.4 MB', 'Oct 15'], ['Visa letter', 'PDF', '86 KB', 'Oct 12']];
  const filesTable = (o = {}) => `<div class="sdk-table-wrap${o.tall ? ' is-tall' : ''}"><table class="sdk-table"${o.label ? ` aria-label="${o.label}"` : ' aria-label="Files"'}>
    <thead><tr><th scope="col" class="sdk-table-check">${tick('Select all', false)}</th>${th('Name', { sortable: true, sort: 'ascending' })}${th('Type', { sortable: true })}${th('Size', { cls: 'num', sortable: true })}${th('Modified', { sortable: true })}</tr></thead>
    <tbody>${(o.rows || FILES).map((r, i) => `<tr${o.sel === i ? ' aria-selected="true"' : ''}${o.hover === i ? ' class="ds-force-hover"' : ''}><td class="sdk-table-check">${tick('Select ' + r[0], o.sel === i)}</td><th scope="row">${r[0]}</th><td class="sdk-table-dim">${r[1]}</td><td class="num">${r[2]}</td><td class="sdk-table-dim">${r[3]}</td></tr>`).join('')}</tbody></table></div>`;

  const statesBody = () => wrap(`<div class="sdk-panel"><div class="pm-tb-two">
    <div>${CAP('Rest, hover (row 2), selected (row 3), sorted by Name')}${filesTable({ hover: 1, sel: 2 })}
      <p class="pm-tb-note">Header: 12px, weight 600, capitals, muted, a hairline under it. Cells 8px by 10px. Size is right-aligned with tabular figures. The sorted header is the text colour with an arrow and <code>aria-sort</code>.</p></div>
    <div>${CAP('Group rows')}<div class="sdk-table-wrap"><table class="sdk-table" aria-label="Roles"><thead><tr><th scope="col">Role</th><th scope="col" class="is-center">Tasks</th><th scope="col" class="is-center">Calendar</th><th scope="col" class="is-center">Files</th></tr></thead><tbody>
      <tr class="sdk-table-group"><th scope="colgroup" colspan="4">Planning<span class="sdk-table-count">3</span></th></tr>
      <tr><th scope="row">Owner</th><td class="is-center">${tick('Owner, Tasks', true)}</td><td class="is-center">${tick('Owner, Calendar', true)}</td><td class="is-center">${tick('Owner, Files', true)}</td></tr>
      <tr><th scope="row">Moderator</th><td class="is-center">${tick('Moderator, Tasks', true)}</td><td class="is-center">${tick('Moderator, Calendar', true)}</td><td class="is-center">${tick('Moderator, Files', false)}</td></tr>
      <tr class="sdk-table-group"><th scope="colgroup" colspan="4">Sharing<span class="sdk-table-count">2</span></th></tr>
      <tr><th scope="row">Member</th><td class="is-center">${tick('Member, Tasks', true)}</td><td class="is-center">${tick('Member, Calendar', false)}</td><td class="is-center">${tick('Member, Files', false)}</td></tr>
      <tr><th scope="row">Guest</th><td class="is-center">${tick('Guest, Tasks', false)}</td><td class="is-center">${tick('Guest, Calendar', false)}</td><td class="is-center">${tick('Guest, Files', false)}</td></tr></tbody></table></div>
      <p class="pm-tb-note">A group row is a neutral fill with the group's name in the text colour (it was accent text), 12px, weight 600.</p></div></div></div>`);

  const emptyBody = () => wrap(`<div class="sdk-panel"><div class="pm-tb-two">
    <div>${CAP('Empty')}<div class="sdk-table-wrap"><table class="sdk-table" aria-label="Files"><thead><tr>${th('Name')}${th('Type')}${th('Size', { cls: 'num' })}</tr></thead><tbody><tr class="sdk-table-empty"><td colspan="3">No files yet.</td></tr></tbody></table></div></div>
    <div>${CAP('Loading: skeleton rows')}<div class="sdk-table-wrap"><table class="sdk-table" aria-label="Files" aria-busy="true"><thead><tr>${th('Name')}${th('Type')}${th('Size', { cls: 'num' })}</tr></thead><tbody>
      ${[0, 1, 2].map(() => `<tr class="sdk-table-skel"><td><span class="sdk-skel is-mid"></span></td><td><span class="sdk-skel is-short"></span></td><td class="num"><span class="sdk-skel is-num"></span></td></tr>`).join('')}</tbody></table><span class="sdk-sr-only" role="status">Loading files</span></div>
      <p class="pm-tb-note">The rows keep their height and hairlines; each bar is the text colour at 10%. The table is <code>aria-busy</code> and a hidden line says "Loading files".</p></div></div></div>`);

  const stickyBody = () => wrap(`<div class="sdk-panel">${CAP('Sticky header in a scrolling table (scroll the box)')}${filesTable({ tall: true, rows: FILES.concat(FILES).concat(FILES).map((r, i) => [r[0] + (i > 3 ? ' ' + (i + 1) : ''), r[1], r[2], r[3]]) })}</div>`);

  const wideTable = () => `<div class="sdk-table-wrap" data-scroll><table class="sdk-table" aria-label="Roles"><thead><tr><th scope="col">Role</th>${['Tasks', 'Calendar', 'Files', 'Chat', 'Polls', 'Budget'].map((c) => `<th scope="col" class="is-center">${c}</th>`).join('')}</tr></thead><tbody>
    ${['Owner', 'Moderator', 'Member', 'Guest'].map((r, i) => `<tr><th scope="row">${r}</th>${[0, 1, 2, 3, 4, 5].map((c) => `<td class="is-center">${tick(r + ', ' + c, c <= 3 - i + 2)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
  const phoneBody = () => wrap(`<div class="sdk-panel">${CAP('Scrolls sideways, the first column stays')}${wideTable()}
    ${CAP('Files, with a tick column', true)}${filesTable({ sel: 1 })}<p class="pm-tb-note">The table keeps its own width; the box scrolls. The first column is opaque so nothing shows through it. The tick column is a 44px target.</p></div>`);

  const MOD_ROWS = [['Planner', 'route', '1.4.0', 'orange', true], ['Calendar', 'calendar', '1.2.1', 'blue', true], ['Research', 'magnifying-glass', '0.9.3', 'purple', false], ['Budget', 'wallet', '1.0.2', 'green', true]];
  const modRow = (m) => `<div class="sdk-row" data-tint="${m[3]}"><span class="sdk-card-icon">${fa(m[1])}</span><span class="sdk-row-main"><span class="sdk-row-title">${m[0]}</span></span><span class="sdk-row-meta">v${m[2]}</span><label class="sdk-switch-wrap"><input type="checkbox" class="sdk-switch" role="switch"${m[4] ? ' checked' : ''} aria-label="${m[0]} on in this environment"></label>${MORE}</div>`;
  const member = (name, tint, o = {}) => {
    const pic = `<span class="sdk-member-pic" data-tint="${tint}" aria-hidden="true">${name[0]}</span>`;
    const cls = `sdk-member${o.on != null ? ' sdk-member-toggle' : ''}${o.on ? ' is-on' : ''}${o.locked ? ' is-locked' : ''}${o.state === 'hover' ? ' ds-force-hover' : ''}${o.state === 'focus' ? ' ds-force-focus' : ''}`;
    const dot = o.online ? `<span class="sdk-member-dot" aria-hidden="true"></span><span class="sdk-sr-only">Online</span>` : '';
    const inner = `${pic}${dot}<span class="sdk-member-name">${name}</span>`;
    return o.on != null ? `<button type="button" class="${cls}" aria-pressed="${o.on}">${inner}</button>` : `<div class="${cls}">${inner}</div>`;
  };
  const manageBody = (narrow) => wrap(`<div class="sdk-panel sdk-manage">
    <div class="sdk-manage-section"><div class="sdk-list-group"><h4 class="sdk-group-head">Modules<span class="sdk-group-count">${MOD_ROWS.length}</span></h4><div class="sdk-list">${MOD_ROWS.map(modRow).join('')}</div></div></div>
    <div class="sdk-manage-section"><div class="sdk-list-group"><h4 class="sdk-group-head">Plans<span class="sdk-group-count">2</span></h4><div class="sdk-list">
      <div class="sdk-card"><div class="sdk-card-head"><div class="sdk-card-main"><h4 class="sdk-card-title">Family</h4><p class="sdk-card-sub">Up to 12 people, 3 spaces</p></div></div><div class="sdk-card-foot"><span class="sdk-status" data-tone="ok"><span class="sdk-chip-label">In use</span></span><span class="sdk-row-meta">9 EUR a month</span></div><span class="sdk-card-menu">${MORE}</span></div>
      <div class="sdk-card"><div class="sdk-card-head"><div class="sdk-card-main"><h4 class="sdk-card-title">Club</h4><p class="sdk-card-sub">Up to 60 people, 10 spaces</p></div></div><div class="sdk-card-foot"><span class="sdk-row-meta">29 EUR a month</span></div><span class="sdk-card-menu">${MORE}</span></div></div></div></div>
    <div class="sdk-manage-section"><div class="sdk-list-group"><h4 class="sdk-group-head">AI services<span class="sdk-group-count">2</span></h4><div class="sdk-list">
      <div class="sdk-card"><div class="sdk-card-head"><span class="sdk-card-icon" data-tint="gold" style="--tint:var(--tint-gold)">${fa('wand-magic-sparkles')}</span><div class="sdk-card-main"><h4 class="sdk-card-title">Assistant</h4><p class="sdk-card-sub">Managed by the host</p></div></div>
        <div class="sdk-card-list"><div class="sdk-row"><span class="sdk-row-main"><span class="sdk-row-title">Use in every environment</span></span><label class="sdk-switch-wrap"><input type="checkbox" class="sdk-switch" role="switch" checked aria-label="Use in every environment"></label></div></div><span class="sdk-card-menu">${MORE}</span></div>
      <div class="sdk-card"><div class="sdk-card-head"><span class="sdk-card-icon">${fa('language')}</span><div class="sdk-card-main"><h4 class="sdk-card-title">Translator</h4><p class="sdk-card-sub">Off</p></div></div><div class="sdk-card-foot"><span class="sdk-status" data-tone="neutral"><span class="sdk-chip-label">Off</span></span></div><span class="sdk-card-menu">${MORE}</span></div></div></div></div>
    <div class="sdk-manage-section"><div class="sdk-list-group"><h4 class="sdk-group-head">Members<span class="sdk-group-count">5</span></h4><div class="sdk-members">${member('Ana', 'pink', { online: true })}${member('Sam', 'blue', { online: true })}${member('Lee', 'teal')}${member('Mo', 'orange')}${member('Kit', 'purple')}</div></div></div>
    <div class="sdk-manage-section"><div class="sdk-list-group"><h4 class="sdk-group-head">Files<span class="sdk-group-count">4</span></h4>${filesTable({ sel: 1 })}</div></div></div>`);

  const membersBody = () => wrap(`<div class="sdk-panel"><div class="pm-tb-two">
    <div>${CAP('Member tile')}<div class="sdk-members">${member('Ana', 'pink')}${member('Sam', 'blue', { online: true })}${member('Lee', 'teal', { state: 'hover' })}</div>
      <p class="pm-tb-note">Online is a 7px dot with a 2px ring in the tile's colour (it was a green-mixed border). The word "Online" is there for a screen reader.</p></div>
    <div>${CAP('Turn on or off in a space')}<div class="sdk-members">${member('Ana', 'pink', { on: true, online: true })}${member('Sam', 'blue', { on: true })}${member('Lee', 'teal', { on: false })}${member('Mo', 'orange', { on: false, state: 'hover' })}${member('Kit', 'purple', { on: true, state: 'focus' })}${member('Jo', 'green', { on: true, locked: true })}</div>
      <p class="pm-tb-note">On is the selected fill; off is 45% strength and comes back to full on hover. The button's <code>aria-pressed</code> carries the state, and the person's name is on the tile. It no longer has an accent border and ring.</p></div>
    <div>${CAP('A person as a row')}<div class="sdk-list"><div class="sdk-row" data-tint="pink"><span class="sdk-card-icon" style="--tint:var(--tint-pink)">A</span><span class="sdk-row-main"><span class="sdk-row-title">Ana</span><span class="sdk-row-sub">Owner</span></span><span class="sdk-status" data-tone="ok"><span class="sdk-chip-label">Online</span></span>${MORE}</div>
      <div class="sdk-row" data-tint="blue"><span class="sdk-card-icon" style="--tint:var(--tint-blue)">S</span><span class="sdk-row-main"><span class="sdk-row-title">Sam</span><span class="sdk-row-sub">Member</span></span>${MORE}</div></div></div></div></div>`);

  const replacedBody = () => wrap(`<div class="sdk-panel"><div class="pm-tb-two">
    <div>${CAP('Icon HTML field, invalid (was a hard-coded #b8503f edge)')}<div class="pm-tb-fieldrow"><label class="sdk-label" for="tb-icon">Icon (HTML)</label><input id="tb-icon" type="text" value="&lt;svg" aria-invalid="true" aria-describedby="tb-icon-e"><span id="tb-icon-e" class="sdk-error">That is not an icon.</span></div>
      <p class="pm-tb-note">The Fields family's error: a danger edge on the field, and an error line below it in the readable danger mix. The hard-coded hex goes.</p></div>
    <div>${CAP('Environment banner (was a 1px danger outline)')}<div class="sdk-callout">${fa('triangle-exclamation')}<span>Placeholder: this environment is past due. The Banner itself is drawn by the Toasts family, built at the same time; it replaces the outline.</span></div></div></div></div>`);

  const aliasBody = () => wrap(`<div class="sdk-panel"><div class="pm-tb-two">
    <div>${CAP('.roles-table with .roles-group')}<div class="sdk-table-wrap"><table class="roles-table"><thead><tr><th>Role</th><th>Tasks</th><th>Files</th></tr></thead><tbody>
      <tr class="roles-group"><th colspan="3">Planning</th></tr><tr><th scope="row">Owner</th><td>${tick('Owner, Tasks', true)}</td><td>${tick('Owner, Files', true)}</td></tr><tr><th scope="row">Guest</th><td>${tick('Guest, Tasks', false)}</td><td>${tick('Guest, Files', false)}</td></tr></tbody></table></div></div>
    <div>${CAP('.files-table')}<div class="sdk-table-wrap"><table class="files-table"><thead><tr><th>Name</th><th>Type</th><th class="num">Size</th></tr></thead><tbody><tr><td>Packing list</td><td>Document</td><td class="num">12 KB</td></tr><tr><td>Hotel booking</td><td>PDF</td><td class="num">240 KB</td></tr></tbody></table></div></div></div></div>`);

  // ---- contrast ----
  const HOV = 'color-mix(in srgb, var(--text) 8%, var(--bg-section))';
  const SEL = 'color-mix(in srgb, var(--accent) 28%, var(--bg-section))';
  const CT_ROWS = [
    ['Header (dim) on the table surface', '--text-dim', ['--bg-section'], 4.5],
    ['Group count (muted, stronger mix) on a group row', 'color-mix(in srgb, var(--text-dim) 55%, var(--text))', ['--bg-section', 'color-mix(in srgb, var(--text) 8%, var(--bg-section))'], 4.5],
    ['Cell text on the surface', '--text', ['--bg-section'], 4.5],
    ['Cell text on hover', '--text', ['--bg-section', HOV], 4.5],
    ['Muted cell text on hover (stronger mix)', 'color-mix(in srgb, var(--text-dim) 55%, var(--text))', ['--bg-section', HOV], 4.5],
    ['Cell text on a selected row', '--text', ['--bg-section', SEL], 4.5],
    ['Muted cell text on a selected row (the stronger mix)', 'color-mix(in srgb, var(--text) 78%, var(--text-dim))', ['--bg-section', SEL], 4.5],
    ['Group name on its fill', '--text', ['--bg-section', 'color-mix(in srgb, var(--text) 8%, var(--bg-section))'], 4.5],
    ['Sorted header (text) on the surface', '--text', ['--bg-section'], 4.5],
    ['Focus outline (accent) on a selected row', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg-section', SEL], 3],
    ['Empty-row text (dim) on the surface', '--text-dim', ['--bg-section'], 4.5],
    ['Hairline on the panel', '--border', ['--bg-section'], 1],
    ['Member name on a tile', '--text', ['--bg-card'], 4.5],
    ['Member name on an "on" tile', '--text', ['--bg-card', '--selected-bg'], 4.5],
    ['Online dot against its tile (non-text)', 'color-mix(in srgb, var(--ok) 65%, var(--text))', ['--bg-card'], 3],
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

  // A sortable header sorts the rows in the live example (the first click ascending, then descending).
  const liveSort = (doc) => {
    doc.addEventListener('click', (e) => {
      const b = e.target.closest('.sdk-sort'); if (!b) return;
      const thEl = b.closest('th'); const table = thEl.closest('table'); const idx = [...thEl.parentElement.children].indexOf(thEl);
      const next = thEl.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';
      for (const t of table.querySelectorAll('th[aria-sort]')) { t.removeAttribute('aria-sort'); const i = t.querySelector('.sdk-sort > i'); if (i) i.className = 'fa-solid fa-sort'; }
      thEl.setAttribute('aria-sort', next); const ic = b.querySelector('i'); if (ic) ic.className = `fa-solid fa-arrow-${next === 'ascending' ? 'up' : 'down'}`;
      const body = table.tBodies[0]; const rows = [...body.rows].filter((r) => !r.classList.contains('sdk-table-group') && !r.classList.contains('sdk-table-empty'));
      const val = (r) => { const c = r.children[idx]; const t = c.textContent.trim(); const n = parseFloat(t); return Number.isNaN(n) ? t.toLowerCase() : n; };
      rows.sort((a, c) => { const x = val(a); const y = val(c); return (x < y ? -1 : x > y ? 1 : 0) * (next === 'ascending' ? 1 : -1); });
      for (const r of rows) body.appendChild(r);
    });
  };

  function renderTables(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="tables-h"><a href="#tables">Tables and Manage lists</a></h3><span class="ds-status-chip ds-st-proposed">Proposed</span><span class="ds-count">the table (roles, files, Set up), and the Manage lists: module rows, plan and AI service cards, member tiles</span></header>
<p class="ds-desc"><b>Proposed 2026-10-20, from the research recommendations Thomas approved as a batch the same day.</b> (1) One small table: a header of 12px, weight 600, capitals, <code>--text-dim</code>, with a hairline under it and no accent colour; cells 8px by 10px; a hairline under each row; hover is the quiet fill; a group row is a neutral fill with the group's name; a selected row is the selected fill; numbers are right-aligned with tabular figures; the header sticks; on a phone the table scrolls sideways in its own box and keeps its first column. (2) The lists in Manage (<code>.list-row</code>, plan rows, AI service rows, module list items, member rows) are the approved Cards and rows: nothing new is drawn for them but one composed Manage page. (3) A member tile that is online has a 7px dot with a 2px ring, not a coloured border; a member toggle is the selected fill when on and 45% strength when off. (4) The hard-coded <code>#b8503f</code> of an invalid icon field becomes the Fields error; the environment banner's outline becomes the Banner, which the Toasts family draws at the same time.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#tables-anatomy">Anatomy</a><a href="#tables-states">Table states</a><a href="#tables-empty">Empty and loading</a><a href="#tables-sticky">Sticky header</a><a href="#tables-phone">On a phone</a><a href="#tables-manage">A Manage page</a><a href="#tables-members">Members</a><a href="#tables-replaced">Replaced</a><a href="#tables-contrast">Contrast</a><a href="#tables-map">Today to proposed</a><a href="#tables-alias">Aliases</a><a href="#tables-tokens">Tokens</a><a href="#tables-contract">Markup</a><a href="#tables-decide">What Thomas chooses</a></nav>

<h4 class="ds-h4" id="tables-anatomy">Anatomy</h4>
${dim([
    ['1 Header', '12px, weight 600, capitals with <code>--ls-label</code>, <code>--text-dim</code>, a 1px <code>--border</code> line under it. It sticks to the top of a scrolling table and has the table\'s surface behind it.'],
    ['2 Cells', '13px, padding 8px by 10px, a 1px <code>--border</code> line under each row. The first cell of a row can be a row header (<code>th scope="row"</code>).'],
    ['3 Hover and selected', 'Hover: <code>--text</code> at 8% over the surface. Selected: the accent at 28% (the <code>--selected-bg</code> value) over the surface, deepening to 38% when hovered. Both are fills; no edge changes.'],
    ['4 Group row', 'A neutral fill (the text colour at 8%), the group name in <code>--text</code>, 12px, weight 600, capitals, and an optional count. A <code>th scope="colgroup"</code> that spans the columns.'],
    ['5 Numbers', 'Right-aligned, tabular figures (<code>.num</code>). A tick column is 40px wide, 44px on a phone, with the Fields tick box.'],
    ['6 Sort', 'A button in the header with the word and an icon (a double arrow, up or down), and <code>aria-sort</code> on the <code>th</code>. The sorted header is the text colour.'],
    ['7 Empty and loading', 'An empty row: one centred line, muted. A loading row: grey bars at the row height, the table <code>aria-busy</code>, a hidden status line.'],
    ['8 Phone', 'The table sits in <code>.sdk-table-wrap</code>, which scrolls sideways; the first column is sticky and opaque.'],
  ])}

<h4 class="ds-h4" id="tables-states">Table states</h4>
<div data-slot="states"></div>

<h4 class="ds-h4" id="tables-empty">Empty and loading</h4>
<div data-slot="empty"></div>

<h4 class="ds-h4" id="tables-sticky">Sticky header</h4>
<div data-slot="sticky"></div>

<h4 class="ds-h4" id="tables-phone">On a phone (390 wide)</h4>
<div data-slot="phone"></div>

<h4 class="ds-h4" id="tables-manage">A Manage page, in context</h4>
<p class="ds-desc">Module rows with the approved switch, plan and AI service cards, member tiles and a files table, all from the Cards family and this one.</p>
<div data-slot="manage"></div>
<div data-slot="manage-narrow"></div>

<h4 class="ds-h4" id="tables-members">Members</h4>
<div data-slot="members"></div>

<h4 class="ds-h4" id="tables-replaced">Replaced</h4>
<div data-slot="replaced"></div>

<h4 class="ds-h4" id="tables-contrast">Contrast</h4>
<p class="ds-desc">Worked out in the page from the computed colours, in the current mode (WCAG 2). Text needs 4.5 to 1, a dot or an outline 3 to 1.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="tables-map">Today to proposed</h4>
${tbl(['Today', 'Proposed'], [
    ['<code>.roles-table</code> (style.css:5980): 8px by 12px cells, all centred; header 12px capitals; group rows in accent text, 11px, no border, 16px above', 'The table: 8px by 10px, a left-aligned row header and centred ticks; a group row is a neutral fill with the name in the text colour, 12px, weight 600.'],
    ['<code>.files-table</code> (style.css:8758): 6px by 8px, 13px; header 11px capitals; the first column 48px', 'The table: 8px by 10px; header 12px, weight 600; the first column is a tick column (40px).'],
    ['No hover, no selected row, no sorting, no sticky header, no empty or loading row', 'All five, as drawn.'],
    ['Phone: <code>.roles-scroll</code> scrolls the roles table only', 'Every table in <code>.sdk-table-wrap</code>, with the first column kept.'],
    ['<code>.list-row</code>: a boxed row (a hairline, <code>--radius-medium</code>) in Manage lists, plain module rows elsewhere', 'One row: the Cards row. On a panel it keeps the hairline; inside a card it drops it.'],
    ['<code>.plan-row</code> and <code>.ai-service</code>: a hairline card with a 12px by 14px padding, a grid of fields', 'The Cards family\'s card (12px padding), with the "..." slot; fields stay the Fields family\'s.'],
    ['Module list items with a switch row', 'A Cards row with the Fields switch at its end, and the "..." menu.'],
    ['<code>.member.online</code>: a green-mixed border (<code>--ok</code> 50% into the hairline)', 'A 7px <code>--ok</code> dot with a 2px ring (<code>.sdk-member-dot</code>); the border stays the hairline.'],
    ['<code>.member-toggle.online</code>: an accent border and a 1px accent ring; off at 45% strength', 'On is <code>--selected-bg</code>; off stays 45% strength, back to full on hover.'],
    ['<code>.icon-row .icon-html.invalid</code>: <code>border-color: #b8503f</code>', 'The Fields error (<code>aria-invalid</code>, the danger edge and an error line). No hex.'],
    ['<code>.env-banner</code>: a 1px danger outline and a 12% danger fill', 'The Banner (the Toasts family).'],
  ])}

<h4 class="ds-h4" id="tables-alias">Aliases</h4>
${tbl(['Component', 'New name', 'Older names that take the same rules'], [
    ['Table', '<code>.sdk-table</code> in <code>.sdk-table-wrap</code>', '<code>.roles-table</code> <code>.files-table</code>'],
    ['Group row', '<code>.sdk-table-group</code>', '<code>.roles-group</code>'],
    ['Member tile', '<code>.sdk-member</code> (<code>.sdk-member-pic</code> <code>.sdk-member-name</code> <code>.sdk-member-dot</code>)', '<code>.member</code> (<code>img</code>, <code>.member-name</code>, <code>.dot</code>)'],
    ['Member toggle', '<code>.sdk-member-toggle</code> with <code>.is-on</code>', '<code>.member-toggle</code> with <code>.online</code>'],
    ['Manage list rows and cards', 'the Cards family\'s <code>.sdk-row</code>, <code>.sdk-card</code>', '<code>.list-row</code>, <code>.plan-row</code>, <code>.ai-service</code>, <code>.module-display-row</code>: see the Cards family\'s aliases'],
  ])}
<div data-slot="alias"></div>

<h4 class="ds-h4" id="tables-tokens">Tokens</h4>
${tbl(['Token', 'Value', 'Used for'], [
    ['<code>--tbl-surface</code>', '<code>--bg-section</code>', 'What the table sits on (it must be opaque for the sticky header and column). Proposed token.'],
    ['<code>--tbl-hover</code>', '8%', 'The share of <code>--text</code> over the surface on hover. Proposed token.'],
    ['<code>--tbl-cell-y</code> <code>--tbl-cell-x</code>', '8px, 10px', 'Cell padding. Proposed tokens.'],
    ['<code>--ls-label</code> <code>--border</code> <code>--selected-bg</code> <code>--ok</code>', 'the theme\'s', 'The header, the hairlines, the selected row, the online dot.'],
  ])}

<h4 class="ds-h4" id="tables-contract">Markup</h4>
${code(`<div class="sdk-table-wrap">
  <table class="sdk-table" aria-label="Files">
    <thead><tr>
      <th class="sdk-table-check"><input type="checkbox" aria-label="Select all"></th>
      <th scope="col" aria-sort="ascending"><button class="sdk-sort">Name <i class="fa-solid fa-arrow-up"></i></button></th>
      <th scope="col" class="num">Size</th>
    </tr></thead>
    <tbody>
      <tr class="sdk-table-group"><th scope="colgroup" colspan="3">Documents</th></tr>
      <tr aria-selected="true"><td class="sdk-table-check"><input type="checkbox" checked aria-label="Select Packing list"></td><th scope="row">Packing list</th><td class="num">12 KB</td></tr>
      <tr class="sdk-table-empty"><td colspan="3">No files yet.</td></tr>
    </tbody>
  </table>
</div>
<button class="sdk-member sdk-member-toggle is-on" aria-pressed="true"><span class="sdk-member-pic">A</span><span class="sdk-member-dot"></span><span class="sdk-member-name">Ana</span></button>`)}
${dim([
    ['Selected', '<code>aria-selected="true"</code> or <code>.is-selected</code> on the row.'],
    ['Sort', '<code>aria-sort</code> on the <code>th</code> (<code>ascending</code>, <code>descending</code>; none on the others). The module sorts; the look is here. The example above sorts live.'],
    ['Loading', '<code>aria-busy="true"</code> on the table and a <code>.sdk-sr-only</code> status line.'],
  ])}

<h4 class="ds-h4" id="tables-decide">What Thomas chooses</h4>
${tbl(['Chosen here', 'Why', 'Other way'], [
    ['A selected row is the accent at 28% over the surface, made opaque, not the translucent <code>--selected-bg</code>', 'A sticky first column must hide what scrolls under it, so every fill is opaque. The colour is the same.', 'The translucent token and a transparent sticky column.'],
    ['Header cells left-aligned; ticks and role columns centred; numbers right', 'The roles table is a grid of ticks; the files table is text and numbers.', 'Everything left.'],
    ['The group row has capitals (12px, weight 600) in the text colour', 'The same type as the Cards group header, but on a neutral fill.', 'Sentence case.'],
    ['The off member toggle stays at 45% strength', 'The brief keeps it. Text at 45% does not reach 4.5 to 1; the name is on the tile and the state is in <code>aria-pressed</code>.', 'A label "Off" on the tile.'],
    ['A table row does not open anything by default', 'Where it does, give the row <code>tabindex="0"</code>; it takes the 2px outline.', 'A whole-row link, as the Cards\' <code>.sdk-open</code>.'],
    ['Manage lists add no new component', 'They are the Cards rows and cards; only the member tile is new.', 'A separate Manage list look.'],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + TB_CSS, onload: liveSort }, o || {}));
    slot('states').appendChild(F(statesBody(), 'Tables, states'));
    slot('empty').appendChild(F(emptyBody(), 'Tables, empty and loading'));
    slot('sticky').appendChild(F(stickyBody(), 'Tables, sticky header'));
    slot('phone').appendChild(F(phoneBody(), 'Tables, on a phone', { pinWidth: 390 }));
    slot('manage').appendChild(F(manageBody(false), 'Tables, Manage page'));
    slot('manage-narrow').appendChild(F(manageBody(true), 'Tables, Manage page on a phone', { pinWidth: 390 }));
    slot('members').appendChild(F(membersBody(), 'Tables, members'));
    slot('replaced').appendChild(F(replacedBody(), 'Tables, replaced'));
    slot('contrast').appendChild(F(contrastBody(), 'Tables, contrast', { onload: measureContrast }));
    slot('alias').appendChild(F(aliasBody(), 'Tables, aliases'));
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'tables', covers: ['table', 'roles-table', 'files-table', 'list-row', 'plan-row', 'member', 'member-toggle', 'manage'], group: 'Containers', name: 'Tables and Manage lists', status: 'proposed',
    words: 'tables table lists manage list row roles files set up header sticky sort aria-sort group row selected hover empty loading skeleton phone scroll member tile online dot toggle module rows plan ai service switch banner invalid', render: renderTables,
  });
})();
