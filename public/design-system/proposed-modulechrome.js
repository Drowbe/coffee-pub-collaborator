/* The Module window family (proposed): the title bar, the toolbar and the status line of a module, docked, floating and popped out. Loaded by
   proposed.html through proposed-families.json; it registers one family through window.DS_PROPOSED.families.push and draws it with the rules in
   proposed-modulechrome.css. Nothing here is a style of the product: markup, words and tables only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules, from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // Layout of the example pages only (not a style of the product).
  const MC_CSS = `
.pm-mc-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; align-items: start; }
.pm-mc-grid > div > small, .pm-mc-cap { display: block; margin-bottom: 5px; color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-mc-win { height: 232px; }
.pm-mc-tall { height: 300px; }
.pm-mc-stack { display: flex; flex-direction: column; gap: 12px; }
.pm-mc-note { margin: 6px 0 0; color: var(--text-dim); font-size: 12px; }
.pm-mc-ruler { display: grid; grid-template-columns: minmax(0, 360px) minmax(0, 1fr); gap: 20px; align-items: start; }
.pm-mc-legend { display: flex; flex-direction: column; height: 262px; margin: 0; padding: 0; list-style: none; font-size: 12px; }
.pm-mc-legend li { display: flex; gap: 6px; align-items: center; box-sizing: border-box; padding: 0 0 0 8px; color: var(--text-dim); }
.pm-mc-legend li b { color: var(--text); font-weight: 600; }
.pm-mc-states { display: flex; flex-wrap: wrap; gap: 14px 24px; align-items: flex-start; }
.pm-mc-states > div { display: flex; flex-direction: column; gap: 5px; }
.pm-mc-narrow { width: 280px; max-width: 100%; }
.pm-mc-browser { box-sizing: border-box; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg); padding: 6px; }
.pm-mc-browser > i { display: block; margin: 0 0 6px; color: var(--text-dim); font-size: 11px; font-style: normal; }
.pm-mc-ct { border-collapse: collapse; width: 100%; font-size: 12px; }
.pm-mc-ct th, .pm-mc-ct td { padding: 4px 8px 4px 0; text-align: left; border-bottom: 1px solid var(--border); }
.pm-mc-ct th { color: var(--text-dim); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.pm-mc-pass { color: var(--ok); font-weight: 600; }
.pm-mc-fail { color: var(--danger); font-weight: 600; }
@media (max-width: 640px) { .pm-mc-ruler { grid-template-columns: minmax(0, 1fr); } }
`;

  const wrap = (inner) => `<div class="ds-proposed">${inner}</div>`;
  const CAP = (s) => `<small>${s}</small>`;
  const TINTS = ['gold', 'blue', 'green', 'teal', 'purple', 'red', 'orange', 'pink'];

  const ibtn = (icon, label, extra, attrs) => `<button type="button"${attrs || ''} class="sdk-icon-btn btn-small btn-quiet${extra ? ' ' + extra : ''}" aria-label="${label}" title="${label}">${fa(icon)}</button>`;
  const rowx = (t, m) => `<div class="sdk-row"><span class="sdk-row-main"><span class="sdk-row-title">${t}</span></span>${m ? `<span class="sdk-row-meta">${m}</span>` : ''}</div>`;
  const ROWS = rowx('Book the flights', 'Fri') + rowx('Renew the passports', 'Done') + rowx('Reserve the Seine dinner', 'Due Fri');

  // The title bar. o: tint, icon, title, tools (html), cls, attrs.
  const titlebar = (o = {}) => `<div class="sdk-titlebar${o.cls ? ' ' + o.cls : ''}"${o.tint ? ` data-tint="${o.tint}"` : ''}><span class="sdk-titlebar-title">${o.icon ? fa(o.icon) : ''}<span>${o.title || 'To-do'}</span></span><span class="sdk-titlebar-tools">${o.tools == null ? ibtn('plus', 'Add') + ibtn('ellipsis-vertical', 'More') + ibtn('xmark', 'Close') : o.tools}</span></div>`;
  const SWITCH = (compact) => `<div class="sdk-tabs sdk-tabs-joined sdk-tabs-small${compact ? ' sdk-tabs-compact' : ''}" role="group" aria-label="View">${[['List', true, 'list'], ['Day', false, 'calendar-day'], ['Map', false, 'map']].map(([w, on, i]) => `<button type="button" class="sdk-tab" aria-pressed="${on}"${compact ? ` aria-label="${w}" title="${w}"` : ''}><i class="sdk-tab-glyph fa-solid fa-${i}" aria-hidden="true"></i><span class="sdk-tab-word">${w}</span></button>`).join('')}</div>`;
  const SEARCH = `<label class="sdk-search">${fa('magnifying-glass')}<input type="search" aria-label="Search" placeholder="Search"></label>`;
  const PROG = (p) => `<span class="sdk-progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${p}" aria-label="Done"><span class="sdk-progress-fill" style="width:${p}%"></span></span>`;
  const SEP = '<span class="sdk-sep" aria-hidden="true"></span>';
  // A full toolbar: the view switch, icon buttons (one selected), a separator, search, progress, a count, a text button.
  const toolbar = (o = {}) => `<div class="sdk-toolbar"${o.cls ? `` : ''}>${SWITCH(o.compact)}${SEP}${ibtn('filter', 'Filter', '', ' aria-pressed="true"')}${ibtn('arrow-down-wide-short', 'Sort')}${ibtn('rotate', 'Refresh')}${SEP}${SEARCH}${PROG(o.p == null ? 60 : o.p)}<span class="sdk-toolbar-text">12 of 20</span><button type="button" class="btn btn-small btn-quiet">${fa('print')}Print</button></div>`;
  const status = (o = {}) => `<div class="sdk-status-line" id="${o.id || 'mod-status'}" role="region" aria-label="Status"><span class="sdk-status-items">${o.items || `<span class="sdk-status-item"><span class="sdk-status-text">20 tasks</span></span><span class="sdk-status-sep" aria-hidden="true">·</span><span class="sdk-status-item"><span class="sdk-status-text">Saved just now</span></span><span class="sdk-status-item end"><span class="sdk-status-text">Sam is editing</span></span>`}</span></div>`;
  // A window. o: kind (docked | floating | popout), tint, icon, title, tools, toolbar (html), status (html), body, style.
  const KIND = { docked: 'sdk-window sdk-window-docked', floating: 'sdk-window sdk-window-floating', popout: 'sdk-window sdk-window-popout' };
  const win = (o = {}) => {
    const k = o.kind || 'docked';
    return `<div class="${KIND[k]}"${o.style ? ` style="${o.style}"` : ''}>${titlebar(o)}${o.toolbar || ''}<div class="sdk-window-content">${o.body || ROWS}</div>${o.status || ''}</div>`;
  };

  // ---- frame bodies ----
  const anatomyBody = () => wrap(`<div class="pm-mc-ruler"><div>${win({ tint: 'blue', icon: 'list-check', title: 'To-do', toolbar: toolbar(), status: status(), style: 'height:260px' })}</div>
    <ul class="pm-mc-legend"><li style="height:36px"><b>1 Title bar</b> 34px, 42px on a phone. Icon, name, the "+", "..." and Close. The only band with a tint.</li>
      <li style="height:35px"><b>2 Toolbar</b> 34px, the field step. View switch, icon buttons, search, progress.</li>
      <li style="height:25px;margin-top:auto"><b>3 Status line</b> 24px, 12px muted.</li></ul></div>`);

  const windowsBody = () => wrap(`<div class="pm-mc-grid">
    <div>${CAP('Docked, tinted')}${win({ tint: 'blue', icon: 'list-check', title: 'To-do', toolbar: toolbar(), status: status(), cls: '', style: 'height:260px' })}</div>
    <div>${CAP('Docked, no tint')}${win({ icon: 'note-sticky', title: 'Notes', toolbar: toolbar({ p: 30 }), status: status(), style: 'height:260px' })}</div>
    <div>${CAP('Floating: a window, --shadow-2, grab cursor')}<div class="pm-mc-browser" style="padding:12px">${win({ kind: 'floating', tint: 'purple', icon: 'wand-magic-sparkles', title: 'Assistant', toolbar: '', status: status(), style: 'height:230px' })}</div></div>
    <div>${CAP('Popped out: the window is the edge')}<div class="pm-mc-browser"><i>A browser window, 360 wide</i>${win({ kind: 'popout', tint: 'teal', icon: 'map', title: 'Maps', toolbar: toolbar({ compact: true }), status: status(), style: 'height:230px' })}</div></div>
  </div>`);

  const tintsBody = () => wrap(`<div class="pm-mc-grid" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">${TINTS.map((t) => `<div>${CAP(t)}${win({ tint: t, icon: 'location-dot', title: 'A module', tools: ibtn('ellipsis-vertical', 'More'), body: '<span style="color:var(--text-dim);font-size:12px">The wash is 10% of the tint over the window.</span>', style: 'height:100px' })}</div>`).join('')}</div>`);

  const stateBtns = [['Rest', ''], ['Hover', ' ds-force-hover'], ['Pressed', ' ds-force-active'], ['Focus', ' ds-force-focus'], ['Selected', ''], ['Disabled', '']];
  const buttonsBody = () => wrap(`<div class="pm-mc-states">${stateBtns.map(([n, c]) => `<div>${CAP(n)}<div class="sdk-titlebar" data-tint="gold" style="width:150px;padding-left:12px"><span class="sdk-titlebar-title">${fa('calendar')}<span>Calendar</span></span><span class="sdk-titlebar-tools"><button type="button" class="sdk-icon-btn btn-small btn-quiet${c}"${n === 'Selected' ? ' aria-pressed="true"' : ''}${n === 'Disabled' ? ' disabled' : ''} aria-label="Add" title="Add">${fa('plus')}</button></span></div></div>`).join('')}</div>
    <p class="pm-mc-note">The "+" is an icon button like the others (it was .mod-add, a tinted icon with its own focus). Hit area 44px on a phone.</p>`);

  const toolbarBody = () => wrap(`<div class="pm-mc-stack">
    <div>${CAP('A toolbar full of items, 560 wide')}<div style="width:560px;max-width:100%"><div class="sdk-window sdk-window-docked">${toolbar()}</div></div></div>
    <div>${CAP('Overflow: 280 wide, it scrolls sideways by touch or drag, with no scrollbar')}<div class="pm-mc-narrow"><div class="sdk-window sdk-window-docked">${toolbar()}</div></div></div>
    <div>${CAP('Narrow switch: icons only, 280 wide')}<div class="pm-mc-narrow"><div class="sdk-window sdk-window-docked">${toolbar({ compact: true })}</div></div></div>
    <div>${CAP('The items, by state')}<div class="pm-mc-states" style="align-items:center">
      <div class="sdk-window sdk-window-docked"><div class="sdk-toolbar" style="overflow:visible">${ibtn('filter', 'Rest')}${ibtn('filter', 'Hover', 'ds-force-hover')}${ibtn('filter', 'Pressed', 'ds-force-active')}${ibtn('filter', 'Focus', 'ds-force-focus')}${ibtn('filter', 'Selected', '', ' aria-pressed="true"')}${ibtn('filter', 'Disabled', '', ' disabled')}${SEP}<button type="button" class="btn btn-small btn-quiet">${fa('plus')}Add</button><button type="button" class="btn btn-small btn-quiet" aria-pressed="true">${fa('eye')}Hidden</button></div></div>
      <div class="sdk-window sdk-window-docked" style="width:200px"><div class="sdk-toolbar">${PROG(0)}${PROG(40)}${PROG(100)}</div></div></div></div>
  </div>`);

  const statusBody = () => wrap(`<div class="pm-mc-stack">
    <div>${CAP('Items and dots')}<div class="sdk-window sdk-window-docked">${status()}</div></div>
    <div>${CAP('chip: true, a Chips status label at 20px')}<div class="sdk-window sdk-window-docked">${status({ items: `<span class="sdk-status-item"><span class="sdk-status" data-tone="ok">${fa('circle')}Connected</span></span><span class="sdk-status-sep" aria-hidden="true">·</span><span class="sdk-status-item"><span class="sdk-status-text">12:41</span></span><span class="sdk-status-item end"><span class="sdk-status-text">Sam joined</span></span>` })}</div></div>
    <div>${CAP('A problem is a plain sentence')}<div class="sdk-window sdk-window-docked">${status({ items: `<span class="sdk-status-item is-problem">${fa('triangle-exclamation')}<span class="sdk-status-text">Chat is offline. Trying again.</span></span><span class="sdk-status-item end"><span class="sdk-status-text">Not sent: 1</span></span>` })}</div></div>
    <div>${CAP('Too narrow: the end item is cut first (280 wide)')}<div class="pm-mc-narrow"><div class="sdk-window sdk-window-docked">${status({ items: `<span class="sdk-status-item cut"><span class="sdk-status-text">20 tasks, 3 due this week</span></span><span class="sdk-status-sep" aria-hidden="true">·</span><span class="sdk-status-item cut"><span class="sdk-status-text">Saved just now</span></span><span class="sdk-status-item end"><span class="sdk-status-text">Sam is editing the list</span></span>` })}</div></div></div>
  </div>`);

  const chatBody = () => wrap(`<div class="pm-mc-grid"><div>${CAP('The Chat header is the title bar')}${win({ tint: 'gold', icon: 'comments', title: 'Chat', tools: ibtn('ellipsis-vertical', 'More') + ibtn('xmark', 'Close chat'), toolbar: `<div class="sdk-toolbar" id="chat-views">${SWITCH(false).replace('List', 'Discussion').replace('Day', 'Assistant').replace('>Map<', '>Notes<').replace('fa-list', 'fa-comments').replace('fa-calendar-day', 'fa-wand-magic-sparkles')}</div>`, body: '<span style="color:var(--text-dim);font-size:12px">The messages go here.</span>', status: status({ id: 'chat-status', items: '<span class="sdk-status-item"><span class="sdk-status-text">In a call · 12:41</span></span><span class="sdk-status-item end"><span class="sdk-status-text">Sam joined</span></span>' }), style: 'height:210px' })}</div>
    <div><div class="pm-mc-cap">Same component, different padding removed</div><p class="pm-mc-note" style="margin-top:0">Chat's header was a bare <code>header</code> with its own padding and tool box. It becomes the title bar (it gets the <code>sdk-titlebar</code> class: a bare <code>header</code> is too general to alias): the same height, tint, tools and hairline as every module. Its "More" and Close are the same 30px icon buttons.</p></div></div>`);

  const phoneBody = () => wrap(`<div class="pm-mc-browser" style="padding:0;border:0;background:none">${win({ kind: 'popout', tint: 'green', icon: 'wallet', title: 'Budget', toolbar: toolbar(), status: status(), style: 'height:360px;--safe-b:34px' })}</div><p class="pm-mc-note">390 wide. Title bar 42px. The toolbar scrolls sideways, no scrollbar. The status line is 24px plus the 34px home-indicator inset (set here by hand; a phone supplies it).</p>`);

  const aliasBody = () => wrap(`<div class="pm-mc-grid"><div>${CAP('Today\'s markup, no edit')}<div class="module-docked" style="height:210px"><div class="mod-header" data-tint="orange"><span class="mod-title">${fa('map')}<span>Places</span></span><span class="mod-header-tools"><button type="button" class="mod-add" aria-label="Add">${fa('plus')}</button><button type="button" class="msg-btn" aria-label="Close">${fa('xmark')}</button></span></div>
      <div class="mod-toolbar"><button type="button" class="tb-btn">${fa('filter')}Filter</button><button type="button" class="tb-btn on">${fa('star')}Saved</button><span class="tb-sep"></span><span class="tb-text">12 places</span><span class="tb-progress"><span class="tb-progress-fill" style="width:50%"></span></span></div>
      <div class="sdk-window-content">${ROWS}</div>
      <div class="mod-status"><span class="mod-status-items"><span class="mod-status-item">Saved</span><span class="mod-status-sep">·</span><span class="mod-status-item chip">Synced</span><span class="mod-status-item end">Sam</span></span></div></div></div>
    <div>${CAP('Floating head')}<div class="module-floating" style="height:150px"><div class="module-floating-head" data-tint="pink"><span class="mod-title">${fa('image')}<span>Pictures</span></span></div><div class="sdk-window-content">Alias of the title bar in a floating module.</div></div></div></div>`);

  const CT_ROWS = [
    ['Title text, no tint', '--text', ['--bg-section'], 4.5],
    ['Icon button on the title bar', '--text-dim', ['--bg-section'], 4.5],
    ['Toolbar text', '--text', ['--bg-input'], 4.5],
    ['Muted text on the toolbar', '--text-dim', ['--bg-input'], 4.5],
    ['Selected button: accent mix on the selected fill, over the toolbar', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg-input', '--selected-bg'], 4.5],
    ['Status line text (12px muted)', '--text-dim', ['--bg-section'], 4.5],
    ['A problem sentence in the status line', 'color-mix(in srgb, var(--danger) 70%, var(--text))', ['--bg-section'], 4.5],
    ['Status label in the line', '--text', ['--bg-section', 'color-mix(in srgb, var(--text) 8%, transparent)'], 4.5],
    ['Focus outline (accent) on the window', '--accent', ['--bg-section'], 3],
    ['Hairline on the window', '--border', ['--bg-section'], 1],
  ].concat(...TINTS.map((t) => [
    [`Title text on the ${t} wash`, '--text', ['--bg-section', `color-mix(in srgb, var(--tint-${t}) 10%, transparent)`], 4.5],
    [`Tinted icon, ${t}, on its wash`, `color-mix(in srgb, var(--tint-${t}) 62%, var(--text))`, ['--bg-section', `color-mix(in srgb, var(--tint-${t}) 10%, transparent)`], 3],
  ]));
  const contrastBody = () => wrap(`<table class="pm-mc-ct"><thead><tr><th>Pair</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${CT_ROWS.map((r) => `<tr data-fg="${h(r[1])}" data-bgs="${h(JSON.stringify(r[2]))}" data-min="${r[3]}"><td>${r[0]}</td><td data-out="r"></td><td>${r[3] === 1 ? 'info' : r[3] + ':1'}</td><td data-out="p"></td></tr>`).join('')}</tbody></table>`);
  const measureContrast = (doc) => {
    const host = doc.querySelector('.ds-proposed');
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const col = (expr) => { const p = doc.createElement('span'); p.style.color = expr.startsWith('--') ? `var(${expr})` : expr; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (d) => 0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]);
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-mc-ct tbody tr')) {
        g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillRect(0, 0, 1, 1); g.clearRect(0, 0, 1, 1);
        for (const l of JSON.parse(tr.dataset.bgs)) { g.fillStyle = col(l); g.fillRect(0, 0, 1, 1); }
        const base = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        g.fillStyle = col(tr.dataset.fg); g.fillRect(0, 0, 1, 1);
        const top = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        const a = lum(top); const b = lum(base);
        const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const min = Number(tr.dataset.min); const p = tr.querySelector('[data-out="p"]');
        p.textContent = min === 1 ? 'Info' : r >= min ? 'Passes' : 'Fails'; p.className = min === 1 ? '' : r >= min ? 'pm-mc-pass' : 'pm-mc-fail';
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  const widthBody = (w) => wrap(win({ tint: 'blue', icon: 'list-check', title: 'To-do', toolbar: toolbar({ compact: w < 500 }), status: status(), style: 'height:250px' }));

  function renderModuleChrome(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="modulechrome-h"><a href="#modulechrome">Module window: title bar, toolbar and status line</a></h3><span class="ds-status-chip ds-st-proposed">Proposed</span><span class="ds-count">three bands, in a docked, a floating and a popped-out module; the Chat header</span></header>
<p class="ds-desc"><b>Proposed 2026-10-20, from the research recommendations Thomas approved as a batch.</b> (1) Three bands with tokens: title bar <code>--module-header-h</code> 34px (42px on a phone), toolbar <code>--toolbar-h</code> 34px, status line <code>--status-bar-h</code> 24px. (2) The title bar is the only tinted band: the module's tint is a 10% wash and a tinted icon. The toolbar takes the field step (<code>--bg-input</code>), not <code>--shade</code>. (3) Buttons in a band are the approved Quiet small buttons (30px); selected is <code>--selected-bg</code>. The 26px round <code>.tb-btn</code> with its solid accent "on", <code>.msg-btn</code> (13px) and <code>.mod-add</code> are retired. (4) Chat's header is this title bar. (5) A floating module is a window: <code>--shadow-2</code> and a grab cursor. (6) The status line is a hairline, 12px muted words separated by dots; an item with <code>chip: true</code> is a Chips status label.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#modulechrome-anatomy">Anatomy</a><a href="#modulechrome-windows">Docked, floating, popped out</a><a href="#modulechrome-tints">Tints</a><a href="#modulechrome-buttons">Title bar buttons</a><a href="#modulechrome-toolbar">Toolbar</a><a href="#modulechrome-status">Status line</a><a href="#modulechrome-chat">Chat header</a><a href="#modulechrome-phone">On a phone</a><a href="#modulechrome-contrast">Contrast</a><a href="#modulechrome-map">Today to proposed</a><a href="#modulechrome-alias">Aliases</a><a href="#modulechrome-tokens">Tokens</a><a href="#modulechrome-contract">Markup</a><a href="#modulechrome-widths">Widths</a><a href="#modulechrome-chosen">Chosen while drawing</a></nav>

<h4 class="ds-h4" id="modulechrome-anatomy">Anatomy and surface steps</h4>
<div data-slot="anatomy"></div>
${dim([
    ['1 Title bar', '34px (42px on a phone), 14px weight 600 sans, a 1px <code>--border</code> hairline under it. Icon 15px, name, then the tools: "+", "..." and Close as Quiet small icon buttons, 2px apart. Left padding 12px, right 4px.'],
    ['2 Toolbar', '34px, 8px between items, 0 8px of padding (0 12px on a phone). The Tabs joined switch (small, 30px), icon buttons, a search field at 30px, the 6px progress, 1px separators, a 12px muted text, a Quiet small text button. It scrolls sideways when it does not fit and shows no scrollbar.'],
    ['3 Status line', '24px, 12px words in <code>--text-dim</code>, a 1px hairline on top, items separated by a dot (6px each side). The last item may be "end" (pushed right); the end item is cut first, then the ones before it. A problem is a plain sentence in the readable red.'],
    ['4 Surface steps', 'Window <code>--bg-section</code>. Title bar: the window\'s step, with the tint wash when the module has a tint. Toolbar: <code>--bg-input</code>. Status line: the window\'s step. Content: the window\'s step; a card in it takes <code>--bg-card</code>. Never <code>--shade</code>.'],
    ['5 Tint', 'Only the title bar: <code>--tint</code> at 10% over <code>--bg-section</code>, the icon in <code>--tint</code> mixed 62% into <code>--text</code> (readable, as the Cards icon chip). The name keeps <code>--text</code>. No tint, no wash: the bar is the window\'s step.'],
    ['6 Kinds', 'Docked: 1px hairline, <code>--radius-large</code>, no shadow. Floating: the same plus <code>--shadow-2</code> (a floating module is a window) and a grab cursor on the title bar. Popped out: the browser window is the edge, so no edge, no corner; the status line keeps the home-indicator inset.'],
  ])}

<h4 class="ds-h4" id="modulechrome-windows">Docked, floating and popped out</h4>
<div data-slot="windows"></div>

<h4 class="ds-h4" id="modulechrome-tints">The eight tints</h4>
<p class="ds-desc">A tinted and an untinted title bar, drawn in the current mode. The wash is 10%, so the same name colour reads on all eight; the icon is the readable mix.</p>
<div data-slot="tints"></div>

<h4 class="ds-h4" id="modulechrome-buttons">Title bar buttons</h4>
<div data-slot="buttons"></div>

<h4 class="ds-h4" id="modulechrome-toolbar">Toolbar</h4>
<p class="ds-desc">Items are the approved ones: the Tabs joined view switch, Quiet small icon and text buttons, a 30px search, the 6px progress and 1px separators. A toolbar button that is on has the neutral selected fill and the accent-mix words, not a solid accent.</p>
<div data-slot="toolbar"></div>

<h4 class="ds-h4" id="modulechrome-status">Status line</h4>
<div data-slot="status"></div>

<h4 class="ds-h4" id="modulechrome-chat">The Chat header</h4>
<div data-slot="chat"></div>

<h4 class="ds-h4" id="modulechrome-phone">On a phone (390 wide)</h4>
<div data-slot="phone"></div>

<h4 class="ds-h4" id="modulechrome-contrast">Contrast</h4>
<p class="ds-desc">Worked out in the page from the computed colours, in the current mode (WCAG 2). Text needs 4.5 to 1, an icon or an outline 3 to 1.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="modulechrome-map">Today to proposed</h4>
${tbl(['Today', 'Proposed'], [
    ['<code>.mod-header</code> (34px, 42px phone), a gradient wash and <code>--tint</code> on the icon', '<code>.sdk-titlebar</code>: the same heights; a flat 10% wash over the window step; the icon in the readable mix.'],
    ['<code>.module-floating-head</code>: <code>--shade</code> fill, grab cursor', '<code>.sdk-titlebar</code> in a floating window: the window\'s step (no <code>--shade</code>), grab cursor, and the window has <code>--shadow-2</code> (today <code>0 1px 3px</code>).'],
    ['Chat\'s bare <code>header</code> with its own padding and <code>.chat-tools</code>', 'The title bar, with the same tools. One component.'],
    ['<code>.tb-btn</code>: 26px high, a round pill with a 1px edge; <code>.on</code> and <code>.primary</code> are solid accent', 'Quiet small, 30px; selected is <code>--selected-bg</code> with the accent-mix words. The pill and its solid "on" are retired.'],
    ['<code>.msg-btn</code> (13px) and <code>.mod-add</code> (a tinted "+" with its own focus), <code>.sdk-more</code> 28px', 'The icon-only Quiet small button, 30px. The "+" stays, as an icon button.'],
    ['<code>.mod-toolbar</code>: 34px on <code>--shade</code>', '<code>.sdk-toolbar</code>: 34px on <code>--bg-input</code>.'],
    ['<code>.tb-tabs</code>', 'The Tabs joined view switch at 30px (<code>.sdk-tabs-joined</code>).'],
    ['<code>.tb-progress</code> (6px)', '<code>.sdk-progress</code>: kept at 6px.'],
    ['<code>.mod-status</code> (24px, 12px, top hairline), <code>.mod-status-sep</code>', '<code>.sdk-status-line</code>: kept; words are <code>--text-dim</code>, dots between items, a safe-area inset where the window ends the screen.'],
    ['<code>.mod-status-item.chip</code>: a round pill with a 1px edge', 'A Chips status label (<code>.sdk-status</code>): tint or neutral fill, the small corner, no edge, 20px.'],
  ])}

<h4 class="ds-h4" id="modulechrome-alias">Aliases</h4>
<p class="ds-desc">Today's names take the new look without a markup change; the rule is the contract <code>.sdk-*</code>.</p>
${tbl(['Component', 'New name', 'Older names that take the same rules'], [
    ['Window', '<code>.sdk-window</code> with <code>.sdk-window-docked</code>, <code>-floating</code> or <code>-popout</code>', '<code>.module-docked</code> <code>.module-floating</code>'],
    ['Title bar', '<code>.sdk-titlebar</code> (<code>-title</code>, <code>-tools</code>)', '<code>.mod-header</code> <code>.mod-title</code> <code>.mod-header-tools</code> <code>.module-floating-head</code> <code>.chat-head</code>'],
    ['"+" in the title bar', '<code>.sdk-icon-btn.btn-small.btn-quiet</code>', '<code>.mod-add</code>'],
    ['Toolbar', '<code>.sdk-toolbar</code>', '<code>.mod-toolbar</code>'],
    ['Toolbar button, text', '<code>.btn.btn-small.btn-quiet</code>', '<code>.tb-btn</code>'],
    ['Separator, text, progress', '<code>.sdk-sep</code> <code>.sdk-toolbar-text</code> <code>.sdk-progress</code>', '<code>.tb-sep</code> <code>.tb-text</code> <code>.tb-progress</code>'],
    ['Status line', '<code>.sdk-status-line</code> (<code>-items</code>, <code>-item</code>, <code>-text</code>, <code>-sep</code>)', '<code>.mod-status</code> and its <code>-items</code>, <code>-item</code>, <code>-text</code>, <code>-sep</code>; <code>.mod-status-item.chip</code>'],
  ])}
<div data-slot="alias"></div>

<h4 class="ds-h4" id="modulechrome-tokens">Tokens</h4>
${tbl(['Token', 'Value', 'Used for'], [
    ['<code>--module-header-h</code>', '34px; 42px at 640px and below', 'The title bar. Same name and value as today.'],
    ['<code>--toolbar-h</code>', '34px', 'The toolbar. Same as today.'],
    ['<code>--status-bar-h</code>', '24px', 'The status line, without the inset. Same as today.'],
    ['<code>--mc-wash</code>', '10%', 'The tint wash on the title bar. Proposed token.'],
    ['<code>--safe-b</code>', '<code>env(safe-area-inset-bottom)</code> on a popped-out window, else 0', 'The home-indicator inset added to the status line. Proposed token.'],
    ['<code>--bg-section</code> <code>--bg-input</code> <code>--border</code> <code>--selected-bg</code> <code>--tint-*</code>', 'the theme\'s', 'The window, the toolbar, the hairline, a selected button, the wash.'],
    ['<code>--shadow-2</code>', '0 4px 12px', 'A floating module (the one shadow of what floats).'],
  ])}

<h4 class="ds-h4" id="modulechrome-contract">Markup</h4>
${code(`<div class="sdk-window sdk-window-docked">
  <div class="sdk-titlebar" data-tint="blue">
    <span class="sdk-titlebar-title"><i class="fa-solid fa-list-check"></i><span>To-do</span></span>
    <span class="sdk-titlebar-tools">
      <button class="sdk-icon-btn btn-small btn-quiet" aria-label="Add"><i class="fa-solid fa-plus"></i></button>
      <button class="sdk-icon-btn btn-small btn-quiet" aria-label="More">...</button>
    </span>
  </div>
  <div class="sdk-toolbar">  <!-- view switch, icon buttons, .sdk-sep, .sdk-search, .sdk-progress, .sdk-toolbar-text -->  </div>
  <div class="sdk-window-content">...</div>
  <div class="sdk-status-line" role="region" aria-label="Status">
    <span class="sdk-status-items">
      <span class="sdk-status-item"><span class="sdk-status-text">20 tasks</span></span>
      <span class="sdk-status-sep" aria-hidden="true">·</span>
      <span class="sdk-status-item end"><span class="sdk-status" data-tone="ok">Connected</span></span>
    </span>
  </div>
</div>`)}
${dim([
    ['Tint', '<code>data-tint="blue"</code> on the title bar (gold, blue, green, teal, purple, red, orange or pink). The wash and the icon colour come from it; nothing else in the window is tinted.'],
    ['Selected button', '<code>aria-pressed="true"</code> on a toolbar button or a switch tab.'],
    ['Floating', '<code>.sdk-window-floating</code>: the shadow and the grab cursor. The host adds the drag and the resize grip.'],
    ['Popped out', '<code>.sdk-window-popout</code>: no edge or corner; the status line adds <code>env(safe-area-inset-bottom)</code>.'],
    ['Problem', '<code>.is-problem</code> on a status item: the readable red; the words say what is wrong.'],
  ])}

<h4 class="ds-h4" id="modulechrome-widths">Widths</h4>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="modulechrome-chosen">Chosen while drawing</h4>
<p class="ds-desc">Thomas decides each of these; each has another way.</p>
${tbl(['Chosen', 'Why', 'Other way'], [
    ['The toolbar is <code>--bg-input</code>, one step below the window', 'The brief says the field and inner step, not <code>--shade</code>. In today\'s theme the card and the input are the same colour, so it separates as the Colour family does.', 'The window\'s own step with only the hairline.'],
    ['The status label in the line is 20px, not the Chips 24px', 'A 24px chip would fill a 24px line, hairline included. Fills, words and corner are the Chips status label\'s.', 'Make the line 32px when it holds a chip, or draw no chip there.'],
    ['The toolbar search is 30px, 13px words (16px on a phone)', 'A 38px field does not fit a 34px band. Fields has no compact variant; this is the real need it waited for.', 'A toolbar of 44px, or no search in it.'],
    ['The tinted icon is the readable mix (<code>--tint</code> 62% into <code>--text</code>), not the raw tint', 'The raw tint fails 3 to 1 for some tints on the wash; the Cards icon chip uses the same mix.', 'The raw tint.'],
    ['The home-indicator inset is added only in a popped-out window', 'A docked or floating module never reaches the screen\'s bottom edge on a phone (the tab bar is below it).', 'Add it to every status line.'],
    ['Docked windows keep a hairline and the large corner; popped-out has neither', 'The edge is the window\'s.', 'A hairline on the popped-out page too.'],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + MC_CSS }, o || {}));
    slot('anatomy').appendChild(F(anatomyBody(), 'Module chrome, anatomy'));
    slot('windows').appendChild(F(windowsBody(), 'Module chrome, windows'));
    slot('tints').appendChild(F(tintsBody(), 'Module chrome, tints'));
    slot('buttons').appendChild(F(buttonsBody(), 'Module chrome, title bar buttons'));
    slot('toolbar').appendChild(F(toolbarBody(), 'Module chrome, toolbar'));
    slot('status').appendChild(F(statusBody(), 'Module chrome, status line'));
    slot('chat').appendChild(F(chatBody(), 'Module chrome, chat header'));
    slot('phone').appendChild(F(phoneBody(), 'Module chrome, phone', { pinWidth: 390 }));
    slot('contrast').appendChild(F(contrastBody(), 'Module chrome, contrast', { onload: measureContrast }));
    slot('alias').appendChild(F(aliasBody(), 'Module chrome, aliases'));
    const ws = mk('div', '');
    for (const w of [390, 700, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(widthBody(w), `Module chrome at ${w}`, { pinWidth: w }));
    }
    slot('widths').appendChild(ws);
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'modulechrome', covers: ['titlebar', 'toolbar', 'status-line', 'window', 'tb-btn', 'mod-add', 'msg-btn'], group: 'Containers', name: 'Module window: title bar, toolbar and status line', status: 'proposed',
    words: 'module window title bar titlebar toolbar status line statusbar tint wash docked floating popped out pop-out chat header tb-btn mod-add msg-btn progress separator chip safe area inset home indicator shadow grab phone 42 34 24', render: renderModuleChrome,
  });
})();
