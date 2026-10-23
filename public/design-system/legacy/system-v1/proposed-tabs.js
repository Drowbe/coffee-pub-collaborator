/* The Tabs and view switches family (approved): tab strips, the joined view switch, the top bar fold and the aliases. Loaded by proposed.html through proposed-families.json, after proposed.js (the page engine); it registers one family
   through window.DS_PROPOSED.families.push and draws it with the rules in proposed-tabs.css. Nothing here is a style of the product:
   markup, words and tables only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules (.pm-row, .pm-role ...), from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // ---- Tabs and view switches (PROPOSED 2026-10-18): Thomas's decisions of 2026-10-18, drawn from proposed.css ----
  const TB_CSS = `
.pm-hdr { display: flex; align-items: center; gap: 10px; box-sizing: border-box; min-width: 0; padding: 6px 12px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--nav-primary-edge-bg); color: var(--header-text); --t-ink: var(--header-text); --t-fg: var(--icon, color-mix(in srgb, var(--header-text) 75%, transparent)); }
.pm-hdr + .pm-hdr { margin-top: 8px; }
.pm-hname { flex: none; display: inline-flex; align-items: center; gap: 6px; color: var(--header-text); font-size: var(--nav-font-size, 13px); font-weight: var(--nav-font-weight, 600); white-space: nowrap; }
.pm-hdr > .pm-grow { flex: 1 1 auto; min-width: 0; }
.pm-tbar { display: flex; align-items: center; gap: 8px; box-sizing: border-box; min-width: 0; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-tbar > .pm-grow { flex: 1 1 96px; min-width: 96px; }
.pm-fill { flex: 1 1 0; min-width: 0; }
.pm-tbar + .pm-tbar { margin-top: 10px; }
.pm-tbar-t { margin: 0 0 4px; color: var(--text-dim); font-size: 11px; }
.pm-panel { box-sizing: border-box; padding: 12px 12px 14px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-panel + .pm-panel { margin-top: 10px; }
.pm-panel-t { margin: 0 0 10px; font-size: 16px; font-weight: 600; }
.pm-panel-b { margin: 12px 0 0; color: var(--text-dim); font-size: 13px; }
.pm-menu { display: inline-flex; flex-direction: column; min-width: 180px; padding: 4px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--surface); box-shadow: 0 8px 24px color-mix(in srgb, black 30%, transparent); }
.pm-mi { display: flex; align-items: center; gap: 8px; height: 34px; padding: 0 10px; border: 0; border-radius: var(--radius-small); background: none; color: var(--text); font: inherit; font-size: 14px; text-align: left; cursor: pointer; }
.pm-mi:hover { background: color-mix(in srgb, var(--text) 10%, transparent); }
.pm-mi i { width: 16px; color: var(--text-dim); text-align: center; }
.pm-cap { margin: 0 0 4px; color: var(--text-dim); font-size: 12px; }
.pm-cap + .dsf-states, .pm-cap + .pm-hdr { margin-top: 0; }
.pm-line { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 24px; padding: 6px 0; }
.pm-stage { padding-top: 6px; }
.pm-stage + .pm-stage { margin-top: 14px; }
.pm-hit { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 24px; }`;

  const TAB_SEL = '[aria-selected="true"],[aria-pressed="true"],[aria-current="page"],[aria-current="true"],.on,.active';
  const NAMES = (s) => s.split(',').map((x) => x.trim());
  // One tab. o: word, icon, iconOnly, badge, dot, sel (selected), mode ('selected' tab list | 'pressed' switch | 'current' place), cls, dis.
  function tab(o) {
    const m = o.mode || 'selected';
    const on = Boolean(o.sel);
    const a = m === 'pressed' ? ` aria-pressed="${on}"` : m === 'current' ? (on ? ' aria-current="page"' : '') : ` role="tab" aria-selected="${on}"`;
    const cls = ['sdk-tab'].concat(o.iconOnly ? 'sdk-tab-icon' : [], o.cls ? o.cls : []).join(' ');
    const name = o.iconOnly || o.fitTitle ? ` aria-label="${o.word}" title="${o.word}"` : '';
    return `<button type="button" class="${cls}"${a}${name}${o.dis ? ' disabled' : ''}>${o.icon ? `<i class="sdk-tab-glyph fa-solid fa-${o.icon}" aria-hidden="true"></i>` : ''}${o.iconOnly ? '' : `<span class="sdk-tab-word">${o.word}</span>`}${o.badge != null ? `<span class="sdk-tab-badge${o.iconOnly ? ' sdk-badge-micro' : ''}">${o.badge}</span>` : ''}${o.dot ? '<span class="sdk-tab-dot" aria-hidden="true"></span><span class="visually-hidden">Unsaved changes</span>' : ''}</button>`;
  }
  // A wrapper. o: cls (more classes), role ('tablist' or 'group'), label, sel (the attribute the demo script sets), demo, fade.
  const tabs = (items, o = {}) => `<div class="sdk-tabs${o.cls ? ' ' + o.cls : ''}" role="${o.role || 'group'}" aria-label="${o.label || 'Tabs'}"${o.demo ? ` data-demo data-sel="${o.sel || 'aria-selected'}"` : ''}${o.fade ? ' data-fade-on' : ''}>${items.map(tab).join('')}</div>`;

  const TK = [ // the kinds of tab a row shows
    { n: 'Label only', o: { word: 'Planner' } },
    { n: 'Icon and label', o: { word: 'Calendar', icon: 'calendar-days' } },
    { n: 'Icon only', o: { word: 'Calendar', icon: 'calendar-days', iconOnly: true } },
    { n: 'With a count', o: { word: 'Modules', badge: 3 } },
    { n: 'With a dot (unsaved change)', o: { word: 'People', dot: true } },
    { n: 'Icon only, with a count', o: { word: 'Chat', icon: 'comments', iconOnly: true, badge: 3 } },
    { n: 'Icon only, with a dot', o: { word: 'People', icon: 'user-group', iconOnly: true, dot: true } },
  ];
  const TS = [
    { n: 'Rest' }, { n: 'Hover', c: 'ds-force-hover' }, { n: 'Focus', c: 'ds-force-focus' },
    { n: 'Selected', sel: true }, { n: 'Selected, hover', sel: true, c: 'ds-force-hover' }, { n: 'Selected, focus', sel: true, c: 'ds-force-focus' },
    { n: 'Disabled', dis: true },
  ];
  const stateMatrix = (small) => `<div class="ds-proposed">${TK.map((k) => `<div class="pm-row${small ? ' pm-small' : ''}"><div class="pm-role">${k.n}</div><div class="dsf-states">${TS.map((s) => `<div class="dsf-state"><small>${s.n}</small><div class="dsf-ex"><div class="sdk-tabs${small ? ' sdk-tabs-small' : ''}" role="tablist" aria-label="${k.n}">${tab(Object.assign({}, k.o, { sel: s.sel, dis: s.dis, cls: s.c }))}</div></div></div>`).join('')}</div></div>`).join('')}</div>`;

  const SW = {
    2: [['Month', 'calendar-days'], ['Week', 'calendar-week']],
    3: [['List', 'list'], ['Board', 'table-cells'], ['Map', 'map']],
    5: [['Month', 'calendar-days'], ['Week', 'calendar-week'], ['Day', 'calendar-day'], ['Agenda', 'list'], ['Year', 'table-cells']],
  };
  const sw = (n, o = {}) => `<div class="sdk-tabs sdk-tabs-joined${o.small ? ' sdk-tabs-small' : ''}${o.compact ? ' sdk-tabs-compact' : ''}" role="group" aria-label="View">${SW[n].map(([w, i], k) => tab({ word: w, icon: i, mode: 'pressed', sel: k === (o.at == null ? 0 : o.at), fitTitle: o.compact })).join('')}</div>`;
  const joinedBody = () => `<div class="ds-proposed">${[2, 3, 5].map((n) => `<div class="pm-stage"><p class="pm-cap">${n} items, joined by 2px</p><div class="pm-line">${sw(n, { at: n === 5 ? 2 : 0 })}${sw(n, { small: true, at: n === 5 ? 2 : 0 })}</div></div>`).join('')}
    <div class="pm-stage"><p class="pm-cap">Narrow: icons only, the word is the tooltip and the accessible name (3 and 5 items)</p><div class="pm-line">${sw(3, { compact: true, at: 1 })}${sw(3, { small: true, compact: true, at: 1 })}${sw(5, { compact: true, at: 2 })}${sw(5, { small: true, compact: true, at: 2 })}</div></div></div>`;

  const STRIP = ['Spaces', 'People', 'Modules', 'Themes', 'Words', 'Storage', 'Environments', 'Backups', 'Activity', 'Billing', 'Security', 'About'];
  const stripItems = (at) => STRIP.map((w, i) => ({ word: w, badge: w === 'Modules' ? 2 : null, sel: i === at }));
  const stripBody = () => `<div class="ds-proposed">
    <div class="pm-stage"><p class="pm-cap">A strip that does not fit: it scrolls sideways, no scrollbar, and the selected tab (Security) is scrolled into view. Press a tab, or use the arrow keys, Home and End.</p>${tabs(stripItems(10), { role: 'tablist', label: 'Sections', demo: true })}</div>
    <div class="pm-stage"><p class="pm-cap">The same with the optional edge fade (a 20px mask on the side that has more).</p>${tabs(stripItems(10), { role: 'tablist', label: 'Sections, with a fade', demo: true, fade: true })}</div>
    <div class="pm-stage"><p class="pm-cap">Small, the same two ways</p>${tabs(stripItems(7), { role: 'tablist', label: 'Sections, small', demo: true, cls: 'sdk-tabs-small' })}</div>
  </div>`;

  const BARTABS = [['Workspace', 'table-cells-large'], ['Calendar', 'calendar-days'], ['Map', 'map'], ['Evening plan', 'bookmark'], ['Packing', 'suitcase']];
  const barTab = ([w, i], on) => tab({ word: w, icon: i, mode: 'current', sel: on, cls: 'core-link' });
  const bar = (shown, at, folded) => `<div class="pm-hdr"><span class="pm-hname"><i class="fa-solid fa-mug-hot" aria-hidden="true"></i> Kraków in spring</span><div class="sdk-tabs sdk-tabs-bar sdk-tabs-small" role="group" aria-label="Views">${shown.map((k) => barTab(BARTABS[k], k === at)).join('')}${folded ? `<button type="button" class="sdk-more" aria-label="More views" title="More views" aria-haspopup="menu" aria-expanded="${folded === 'open'}"><i class="fa-solid fa-ellipsis-vertical" aria-hidden="true"></i></button>` : ''}</div></div>`;
  const foldBody = () => `<div class="ds-proposed">
    <div class="pm-stage"><p class="pm-cap">Wide bar: every tab shows, no "...".</p>${bar([0, 1, 2, 3, 4], 0, false)}</div>
    <div class="pm-stage"><p class="pm-cap">Tight bar: the tabs leave from the right into a "...".</p>${bar([0, 1, 2], 1, true)}</div>
    <div class="pm-stage"><p class="pm-cap">Tighter bar: Workspace and the tab being shown (Packing) never leave. The "..." is open: the folded tabs, each with its icon.</p>${bar([0, 4], 4, 'open')}
      <div class="pm-menu" role="menu" aria-label="More views" style="margin:6px 0 0 190px"><button type="button" class="pm-mi" role="menuitem"><i class="fa-solid fa-calendar-days" aria-hidden="true"></i>Calendar</button><button type="button" class="pm-mi" role="menuitem"><i class="fa-solid fa-map" aria-hidden="true"></i>Map</button><button type="button" class="pm-mi" role="menuitem"><i class="fa-solid fa-bookmark" aria-hidden="true"></i>Evening plan</button></div></div>
  </div>`;

  const MANAGE = [['Spaces', null], ['People', null], ['Modules', 2], ['Themes', null], ['Words', null], ['Storage', null], ['Environments', null], ['Backups', null], ['Activity', null]];
  const pageBody = () => `<div class="ds-proposed">
    <div class="pm-stage"><p class="pm-cap">A page bar (Manage): the page's name, then small tabs in the bar's colours. The strip scrolls and never folds; the selected tab (Modules, with a count) is kept in view.</p>
      <div class="pm-hdr"><span class="pm-hname"><i class="fa-solid fa-screwdriver-wrench" aria-hidden="true"></i> Manage</span>${tabs(MANAGE.map(([w, b], i) => ({ word: w, badge: b, mode: 'current', sel: w === 'Activity' })), { cls: 'sdk-tabs-small pm-fill', role: 'group', label: 'Manage', demo: true, sel: 'aria-current' })}</div></div>
    <div class="pm-stage"><p class="pm-cap">Set up: a sheet with default tabs under its title, and the dot on a tab that has a change not saved yet (said to a screen reader as "Unsaved changes").</p>
      <div class="pm-panel"><h5 class="pm-panel-t">Set up</h5>${tabs([{ word: 'General', sel: true }, { word: 'People', dot: true }, { word: 'Phases' }, { word: 'Call', dot: true }, { word: 'Words' }, { word: 'Notifications' }, { word: 'Advanced' }], { role: 'tablist', label: 'Set up', demo: true })}<p class="pm-panel-b">The panel for the tab shown sits here.</p></div></div>
  </div>`;

  const SRCH = `<div class="sdk-search pm-grow">${fa('magnifying-glass')}<input type="search" aria-label="Search places" placeholder="Search places"></div>`;
  const toolBody = () => `<div class="ds-proposed" data-fit>
    <p class="pm-tbar-t">38px: the buttons, a search field and the view switch share one height</p>
    <div class="pm-tbar" data-fit-box><button type="button" class="btn btn-primary">${fa('plus')}Add</button>${SRCH}${sw(3, { at: 0 })}<button type="button" class="sdk-icon-btn" aria-label="More" title="More">${fa('ellipsis-vertical')}</button></div>
    <p class="pm-tbar-t" style="margin-top:10px">30px (a dense toolbar): small buttons and a small switch. The search field is 38px and has no compact size yet, so it is left out here.</p>
    <div class="pm-tbar pm-dense" data-fit-box><button type="button" class="btn btn-small btn-primary">${fa('plus')}Add</button><button type="button" class="btn btn-small">${fa('filter')}Filter</button><span class="pm-fill"></span>${sw(3, { small: true, at: 0 })}<button type="button" class="sdk-icon-btn btn-small" aria-label="More" title="More">${fa('ellipsis-vertical')}</button></div>
  </div>`;

  // The aliases: today's class names and markup, drawn as they are in the product.
  const aliasBody = () => `<div class="ds-proposed">
    <div class="pm-stage"><p class="pm-cap"><code>.tb-tabs .tb-tab</code> with <code>.on</code> (host.ui.viewSwitch): small and joined by itself</p>
      <div class="tb-tabs"><button type="button" class="tb-tab on"><span class="tb-tab-glyph"><i class="fa-solid fa-list" aria-hidden="true"></i></span><span class="tb-tab-word">List</span></button><button type="button" class="tb-tab"><span class="tb-tab-glyph"><i class="fa-solid fa-map" aria-hidden="true"></i></span><span class="tb-tab-word">Map</span></button><button type="button" class="tb-tab"><span class="tb-tab-glyph"><i class="fa-solid fa-table-cells" aria-hidden="true"></i></span><span class="tb-tab-word">Board</span></button></div>
      <p class="pm-cap" style="margin-top:8px"><code>.tb-tabs.tb-tabs-compact</code> (what hostSwitch.fit sets when narrow)</p>
      <div class="tb-tabs tb-tabs-compact"><button type="button" class="tb-tab on" aria-label="List" title="List"><span class="tb-tab-glyph"><i class="fa-solid fa-list" aria-hidden="true"></i></span><span class="tb-tab-word">List</span></button><button type="button" class="tb-tab" aria-label="Map" title="Map"><span class="tb-tab-glyph"><i class="fa-solid fa-map" aria-hidden="true"></i></span><span class="tb-tab-word">Map</span></button></div></div>
    <div class="pm-stage"><p class="pm-cap"><code>.subtabs .subtab</code> with <code>.active</code> and a <code>.badge</code> (a page's tabs, folder tabs today)</p>
      <div class="subtabs"><button type="button" class="subtab">Spaces</button><button type="button" class="subtab active">Modules <span class="badge">2</span></button><button type="button" class="subtab">Themes</button></div></div>
    <div class="pm-stage"><p class="pm-cap"><code>.setup-tabs .setup-tab</code> with <code>aria-selected</code> and <code>.setup-tab-dot</code></p>
      <div class="setup-tabs" role="tablist"><button type="button" class="setup-tab" role="tab" aria-selected="true">General</button><button type="button" class="setup-tab" role="tab" aria-selected="false">People <span class="setup-tab-dot"></span></button><button type="button" class="setup-tab" role="tab" aria-selected="false">Phases</button></div></div>
    <div class="pm-hdr"><span class="pm-hname"><i class="fa-solid fa-mug-hot" aria-hidden="true"></i> Kraków in spring</span><div class="layout-tabs"><button type="button" class="core-link" aria-current="page"><i class="fa-solid fa-table-cells-large" aria-hidden="true"></i><span>Workspace</span></button><button type="button" class="core-link"><i class="fa-solid fa-calendar-days" aria-hidden="true"></i><span>Calendar</span></button></div><span class="pm-cap" style="margin:0"><code>.layout-tabs .core-link</code> with <code>aria-current</code></span></div>
  </div>`;

  const phoneBody = () => `<div class="ds-proposed">
    <div class="pm-stage"><p class="pm-cap">Default tabs on a phone: 44px.</p>${tabs([{ word: 'General', sel: true }, { word: 'People', dot: true }, { word: 'Phases' }, { word: 'Call' }, { word: 'Words' }], { role: 'tablist', label: 'Default', demo: true })}</div>
    <div class="pm-stage"><p class="pm-cap">Small tabs on a phone: they keep the 30px look (the strip is 44px high and each tab's hit area is 44px).</p>${tabs([{ word: 'General', sel: true }, { word: 'People', badge: 2 }, { word: 'Phases' }, { word: 'Call' }, { word: 'Words' }], { role: 'tablist', label: 'Small', demo: true, cls: 'sdk-tabs-small' })}</div>
    <div class="pm-stage"><p class="pm-cap">The joined switch on a phone, default and small, icons only.</p><div class="pm-line">${sw(3, { compact: true, at: 0 })}${sw(3, { small: true, compact: true, at: 0 })}</div></div></div>`;

  const tabWidthBody = () => `<div class="ds-proposed" data-fit>
    ${tabs(stripItems(8), { role: 'tablist', label: 'Sections', demo: true })}
    <div class="pm-tbar" data-fit-box style="margin-top:10px"><button type="button" class="btn btn-primary">${fa('plus')}Add</button>${SRCH}${sw(3, { at: 0 })}</div>
    <div class="pm-tbar pm-dense" data-fit-box><button type="button" class="btn btn-small">${fa('filter')}Filter</button><span class="pm-fill"></span>${sw(5, { small: true, at: 2 })}</div>
  </div>`;

  // Contrast of the tab colours, worked out in the page for the mode on show. Each row: text, the fills under it (in order), the least ratio.
  const TC_ROWS = [
    ['Selected text (accent 55% into text) on the selected fill, on the page', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg', '--selected-bg'], 4.5],
    ['The same, on a panel', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg-section', '--selected-bg'], 4.5],
    ['The same, selected and hovered (accent 38% fill)', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg', 'color-mix(in srgb, var(--accent) 38%, transparent)'], 4.5],
    ['Plain --accent on the selected fill, on the page (not used: shown to compare)', 'var(--accent)', ['--bg', '--selected-bg'], 4.5],
    ['Rest text (--text-dim) on the page', 'var(--text-dim)', ['--bg'], 4.5],
    ['Rest text on a panel', 'var(--text-dim)', ['--bg-section'], 4.5],
    ['Hovered text (--text) on the hover fill (text 10%), on the page', 'var(--text)', ['--bg', 'color-mix(in srgb, var(--text) 10%, transparent)'], 4.5],
    ['Count text (--text) on its pill (text 14%), on the page', 'var(--text)', ['--bg', 'color-mix(in srgb, var(--text) 14%, transparent)'], 4.5],
    ['Count text on its pill, on the selected fill', 'var(--text)', ['--bg', '--selected-bg', 'color-mix(in srgb, var(--text) 14%, transparent)'], 4.5],
    ['Dot (--accent) on the page', 'var(--accent)', ['--bg'], 3],
    ['Dot (--accent) on the selected fill (not used)', 'var(--accent)', ['--bg', '--selected-bg'], 3],
    ['Dot on the selected fill, as drawn (the accent mix)', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg', '--selected-bg'], 3],
    ['Selected fill against the page (the fill alone; the text colour carries the state too)', 'var(--selected-bg)', ['--bg'], 1],
    ['Focus outline (--accent) on the page', 'var(--accent)', ['--bg'], 3],
    ['Focus outline (--accent) on the selected fill (not used)', 'var(--accent)', ['--bg', '--selected-bg'], 3],
    ['Focus outline on the selected fill, as drawn (the accent mix)', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg', '--selected-bg'], 3],
  ];
  const tcBody = () => `<div class="ds-proposed"><table class="pm-ct"><thead><tr><th>Pair</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${TC_ROWS.map((r) => `<tr data-fg="${h(r[1])}" data-bgs="${h(JSON.stringify(r[2]))}" data-min="${r[3]}"><td>${r[0]}</td><td class="pm-n" data-out="r"></td><td class="pm-n">${r[3] === 1 ? 'no minimum' : r[3] + ':1'}</td><td data-out="p"></td></tr>`).join('')}</tbody></table></div>`;
  const measureTabContrast = (doc) => {
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

  // The behaviour the strips and the switch need, drawn in each example frame: a press selects, the selected tab is kept in view, a tab
  // list answers the arrow keys, and a switch goes to icons only when its words do not fit (the same rule as hostSwitch.fit in host.js).
  // In the product this is the pages' and the SDK's own script; the component's CSS does none of it.
  function tabsDemo(doc) {
    const SELQ = TAB_SEL;
    const fadeOf = (s) => {
      if (!s.hasAttribute('data-fade-on')) return;
      const v = [s.scrollLeft > 1 ? 'start' : '', s.scrollLeft + s.clientWidth < s.scrollWidth - 1 ? 'end' : ''].filter(Boolean).join(' ');
      s.setAttribute('data-fade', v);
    };
    const keep = (s) => {
      const t = s.querySelector(SELQ); if (!t) return;
      const pad = s.hasAttribute('data-fade-on') ? 20 : 6; const a = s.getBoundingClientRect(); const b = t.getBoundingClientRect();
      if (b.left < a.left + pad) s.scrollLeft -= a.left + pad - b.left; else if (b.right > a.right - pad) s.scrollLeft += b.right - (a.right - pad);
      fadeOf(s);
    };
    const pick = (s, t) => {
      const how = s.dataset.sel || 'aria-selected';
      for (const x of s.querySelectorAll(':scope > .sdk-tab')) {
        const on = x === t;
        if (how === 'aria-current') { if (on) x.setAttribute('aria-current', 'page'); else x.removeAttribute('aria-current'); } else x.setAttribute(how, String(on));
        x.classList.remove('on', 'active');
        if (s.getAttribute('role') === 'tablist') x.tabIndex = on ? 0 : -1;
      }
      keep(s);
    };
    const strips = () => [...doc.querySelectorAll('.sdk-tabs[data-demo]')];
    for (const s of strips()) {
      if (s.getAttribute('role') === 'tablist') for (const x of s.querySelectorAll(':scope > .sdk-tab')) x.tabIndex = x.matches(SELQ) ? 0 : -1;
      s.addEventListener('scroll', () => fadeOf(s), { passive: true });
    }
    doc.addEventListener('click', (e) => {
      const t = e.target.closest && e.target.closest('.sdk-tabs[data-demo] > .sdk-tab');
      if (t && !t.disabled) pick(t.parentElement, t);
    });
    doc.addEventListener('keydown', (e) => {
      const t = e.target.closest && e.target.closest('.sdk-tabs[data-demo][role="tablist"] > .sdk-tab'); if (!t) return;
      const list = [...t.parentElement.querySelectorAll(':scope > .sdk-tab:not(:disabled)')]; const i = list.indexOf(t);
      const n = e.key === 'ArrowRight' ? list[(i + 1) % list.length] : e.key === 'ArrowLeft' ? list[(i - 1 + list.length) % list.length] : e.key === 'Home' ? list[0] : e.key === 'End' ? list[list.length - 1] : null;
      if (n) { e.preventDefault(); n.focus(); pick(t.parentElement, n); }
    });
    // The switch: words while they fit the toolbar, icons only (word kept as the title and the name) when they do not.
    const fit = () => {
      for (const box of doc.querySelectorAll('[data-fit-box]')) {
        const groups = [...box.querySelectorAll('.sdk-tabs-joined')];
        for (const g of groups) g.classList.remove('sdk-tabs-compact');
        const narrow = box.clientWidth > 0 && box.scrollWidth > box.clientWidth + 1;
        for (const g of groups) {
          g.classList.toggle('sdk-tabs-compact', narrow);
          for (const b of g.querySelectorAll('.sdk-tab')) {
            const w = b.querySelector('.sdk-tab-word'); if (!w) continue;
            b.setAttribute('aria-label', w.textContent.trim());
            if (narrow) b.title = w.textContent.trim(); else b.removeAttribute('title');
          }
        }
      }
    };
    const all = () => { fit(); for (const s of strips()) keep(s); };
    doc.fonts.ready.then(all);
    requestAnimationFrame(all);
    if (doc.defaultView.ResizeObserver) new doc.defaultView.ResizeObserver(() => requestAnimationFrame(all)).observe(doc.body);
  }

  function renderTabs(api) {
    const { mk, h } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="tabs-h"><a href="#tabs">Tabs and view switches</a></h3><span class="ds-status-chip ds-st-approved">Approved</span><span class="ds-count">a tab strip, a page's tabs, the top bar's tabs and the toolbar view switch: one component</span></header>
<p class="ds-desc"><b>Decided 2026-10-18; counts provisional until the chips and badges family.</b> (1) Each tab is its own pill, <code>--radius-small</code>, the heights of the buttons: 30px small, 38px default, 44px on a phone. The toolbar view switch is the same component with its tabs joined by 2px gaps. (2) Selected is the quiet neutral fill (<code>--selected-bg</code>) everywhere, with the text in the darker accent mix (accent 55% into <code>--text</code>), the same mix as the selected Button. No accent block, no underline, no coloured border, no left bar. (3) A strip scrolls sideways with the selected tab kept in view; the toolbar switch drops to icons only when narrow; the top bar keeps its "..." fold. No tab disappears except where the top bar folds into the "...". (4) Chips that filter, and the phone's bottom bar, are not in this family (see the end). Drawn from <code>proposed.css</code> (every rule under <code>.ds-proposed</code>); the Dark and Light switch and the Font and Headline groups at the top of the page change the colours of the Dark and Light switch and the Font and Headline groups at the top of the page. What exists today is on its own page, <a href="../../index.html#tabs">Legacy inventory</a>.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#tabs-anatomy">Anatomy</a><a href="#tabs-contract">Wrappers and tabs</a><a href="#tabs-sizes">Sizes</a><a href="#tabs-states">States</a><a href="#tabs-joined">Joined switch</a><a href="#tabs-overflow">Overflow</a><a href="#tabs-fold">Top bar fold</a><a href="#tabs-pages">Page bar and Set up</a><a href="#tabs-toolbar">In a toolbar</a><a href="#tabs-count">Count and dot</a><a href="#tabs-alias">Aliases</a><a href="#tabs-widths">Widths</a><a href="#tabs-rules">Usage rules</a><a href="#tabs-map">Today to proposed</a><a href="#tabs-contrast">Contrast</a><a href="#tabs-tokens">Tokens</a><a href="#tabs-markup">Markup</a><a href="#tabs-later">Decided in other families</a></nav>

<h4 class="ds-h4" id="tabs-anatomy">Anatomy</h4>
<div data-slot="zoom"></div>
${dim([
    ['1 Pill', 'Height = size (small 30px, default 38px, 44px on a phone). Corners <code>--radius-small</code>. A 1px edge that is transparent in every state, so a selected tab is the same box. Never wraps its label.'],
    ['2 Fill', 'Rest: none. Hover: <code>--text</code> at 10%. Selected: <code>--selected-bg</code>. Selected and hovered: <code>--accent</code> at 38%. Pressed: a step darker. A state is a fill, never an edge.'],
    ['3 Icon', 'Optional. 16px (small 14px), 6px before the label, <code>aria-hidden</code>.'],
    ['4 Label', '14px (small 13px), weight 500 in every state, so no tab changes width when it is selected. Sentence case. Never shortened; where it cannot fit, the strip scrolls or the switch shows its icon.'],
    ['5 Count', 'Optional. After the label: a neutral pill, 18px high, 11px bold. <b>Provisional</b>: the chips and badges family decides the badge.'],
    ['6 Dot', 'Optional. After the label: 7px, <code>--accent</code> (the accent mix on a selected tab), for a change not saved yet. A hidden "Unsaved changes" is read with it.'],
    ['7 Focus', 'A 2px <code>--accent</code> outline drawn over the 1px edge, inside the box (offset -2px): the Fields family\'s mechanism, equal on all four sides at any display scale (measured at 1.25 and 1.5). Inside, because a strip scrolls and cuts anything outside it. On a selected tab the outline is the accent mix (the plain accent is 2.9 to 1 on that fill in light mode).'],
  ])}

<h4 class="ds-h4" id="tabs-contract">Wrappers and tabs: what is the contract</h4>
<p class="ds-desc"><b>The contract is a wrapper with tabs as its direct children: <code>.sdk-tabs</code> and <code>.sdk-tab</code>.</b> Everything else is a variant of the wrapper or an alias of a name the product already uses, so no markup has to change for the look to change.</p>
${tbl(['Wrapper', 'Is', 'Tabs are', 'Overflow'], [
    ['<code>.sdk-tabs</code>', 'A strip. The default.', '6px apart, default size. Aliases <code>.subtabs</code>, <code>.setup-tabs</code>.', 'Scrolls sideways, scrollbar hidden, selected tab kept in view. Optional edge fade.'],
    ['<code>.sdk-tabs.sdk-tabs-joined</code>', 'The view switch (<code>host.ui.viewSwitch</code>).', '<b>2px apart</b>, no gap in the fill, each tab a pill. Alias <code>.tb-tabs</code> (small by itself).', 'Never scrolls. Goes to icons only when narrow (<code>.sdk-tabs-compact</code>, alias <code>.tb-tabs-compact</code>); the word is the tooltip and the accessible name.'],
    ['<code>.sdk-tabs.sdk-tabs-bar</code>', 'The tabs on the header bar (the top bar\'s layout tabs). Header colours and the nav type.', '6px apart, small. Alias <code>.layout-tabs</code> with <code>.core-link</code> tabs.', 'Never scrolls. What does not fit folds into the bar\'s "...".'],
    ['<code>.sdk-tabs-small</code> (on any of them)', 'The 30px size.', 'Small by themselves: <code>.tb-tabs</code>, <code>.layout-tabs</code>, a page bar\'s <code>.subtabs</code>.', ''],
  ])}
${tbl(['Tab or part', 'Class', 'Aliases kept', 'Notes'], [
    ['Tab', '<code>.sdk-tab</code>', '<code>.tb-tab</code>, <code>.subtab</code>, <code>.setup-tab</code>, <code>.core-link</code>', 'A <code>button</code>, or an <code>a</code> for a place. Direct child of the wrapper.'],
    ['Icon only', '<code>.sdk-tab-icon</code>', '<code>.tb-tab-icon</code>', 'A square, the tab height. Needs <code>aria-label</code> and <code>title</code>.'],
    ['Icon, word', '<code>.sdk-tab-glyph</code>, <code>.sdk-tab-word</code>', '<code>.tb-tab-glyph</code>, <code>.tb-tab-word</code>', ''],
    ['Count', '<code>.sdk-tab-badge</code>', '<code>.badge</code> in a tab, <code>.chat-view-count</code>', 'Provisional.'],
    ['Dot', '<code>.sdk-tab-dot</code>', '<code>.setup-tab-dot</code>, <code>.chat-view-dot</code>', 'With a <code>.visually-hidden</code> "Unsaved changes" beside it.'],
  ])}
<p class="ds-desc"><b>Selected</b> is an attribute, never a class a consumer picks: <code>aria-selected="true"</code> on a tab list's tabs, <code>aria-pressed="true"</code> on a switch's choices, <code>aria-current="page"</code> on a place. <code>.on</code> and <code>.active</code> are kept as aliases so today's markup works. The tab list (<code>role="tablist"</code>) takes the arrow keys, Home and End with one tab stop; a switch and the top bar's tabs are plain buttons or links in the Tab order.</p>

<h4 class="ds-h4" id="tabs-sizes">Sizes</h4>
${tbl(['Size', 'Class', 'Height', 'Use it for'], [
    ['Default', '(none)', '<code>--btn-h</code>: 38px; 44px on a phone (640px and narrower)', 'A page\'s or a sheet\'s tabs (Set up), a switch beside default buttons, every touch use.'],
    ['Small', '<code>.sdk-tabs-small</code>', '<code>--tab-h-small</code>: 30px', 'Dense toolbars, the page bar, the top bar. On a phone its look stays 30px and its hit area grows to 44px (the strip is 44px high).'],
  ])}
<p class="ds-desc">The same two heights as the Buttons. A tab inside a toolbar whose buttons are set to a different <code>--btn-h</code> follows it, so a switch and the buttons beside it always line up. Shown on a phone (a 390px frame):</p>
<div data-slot="phone"></div>

<h4 class="ds-h4" id="tabs-states">States</h4>
<p class="ds-desc">Every kind of tab in every state, forced from the proposed rules: Rest, Hover, Focus, Selected, Selected and hovered, Selected and focused, Disabled (half strength, no pointer). Rows: a label alone, an icon and a label, an icon alone, a count, a dot, and an icon alone with a count or a dot. The Dark and Light switch changes every example, and so does the width control.</p>
<p class="ds-desc"><b>Default (38px; 44px when the frame is 640px or narrower)</b></p>
<div data-slot="matrix"></div>
<p class="ds-desc"><b>Small (30px)</b></p>
<div data-slot="matrix-small"></div>

<h4 class="ds-h4" id="tabs-joined">The joined toolbar switch</h4>
<p class="ds-desc">The same tabs with <b>2px</b> between them (a strip has 6px). Two, three and five choices, at both sizes; the selected choice has the fill, the others none. Narrow, the words go and the icons stay: the word is the tooltip and the accessible name. <code>hostSwitch.fit</code> keeps doing this, unchanged.</p>
<div data-slot="joined"></div>

<h4 class="ds-h4" id="tabs-overflow">A strip that overflows</h4>
<p class="ds-desc"><b>One rule: no tab disappears, except where the top bar folds into the "...".</b> A strip that does not fit scrolls sideways (no scrollbar, the wheel or a swipe, and the keyboard: Tab or the arrow keys reach every tab, and the browser brings the focused one into view). When a tab is selected, the strip scrolls so it is fully in view. The edge fade is optional: a mask on the side that has more, so it needs no colour.</p>
<div data-slot="strip"></div>

<h4 class="ds-h4" id="tabs-fold">The top bar\'s "..." fold</h4>
<p class="ds-desc">What the product does today and keeps. When the bar is tight the layout tabs leave from the right into a "..." after the last one shown. Workspace and the tab being shown never leave, and names are never shortened. This happens before anything else in the bar folds (only Who is here gives way first). The "..." is the small Quiet icon button, and opens the shared menu listing the folded tabs, each with its icon; pressing one does what the tab does. Only the look of the tab changes. The bars below are drawn static to show it; the folding itself is <code>nav-bar.js</code>, untouched.</p>
<div data-slot="fold"></div>

<h4 class="ds-h4" id="tabs-pages">A page bar and a Set up strip</h4>
<p class="ds-desc">A page\'s tabs in the page bar (Manage, Profile, a space\'s settings): small, in the bar\'s colours, scrolling and never folding. Set up: default tabs under the sheet title, with the dot on a tab that has an unsaved change. In both, press a tab or use the arrow keys.</p>
<div data-slot="pages"></div>

<h4 class="ds-h4" id="tabs-toolbar">In a module toolbar</h4>
<p class="ds-desc">A view switch beside the approved Buttons and a search field. At 38px they share one height; at 30px the buttons and the switch do. The search field has no compact size (decided with the Fields), so a 30px toolbar has no search here. Narrow the page (the width control) and the switch drops to icons.</p>
<div data-slot="toolbar"></div>

<h4 class="ds-h4" id="tabs-count">Count and dot</h4>
<p class="ds-desc"><b>The count (provisional until the chips and badges family):</b> one small neutral pill after the label, <code>--text</code> at 14% with <code>--text</code> text, 18px high, 11px bold, 6px side padding, the same on a selected and an unselected tab. It is not accent: an accent count competes with the selected fill. On an icon-only tab the count sits on the icon\'s corner as the micro count (<code>.sdk-badge-micro</code>, defined once in the Chips family): a 14px pill with 9px numbers and <code>--on-accent</code> text on the accent mixed 88% into <code>--text</code>, 3px in from the top and right edges (a count needs to be seen without a word beside it); the dot sits 4px in from the same edges. Both are in the States grid above.</p>

<h4 class="ds-h4" id="tabs-alias">Aliases: today\'s markup, unchanged</h4>
<p class="ds-desc">These use only today\'s class names. They take the proposed look with no markup edit: the view switch, a page\'s tabs, Set up\'s tabs, the top bar\'s layout tabs.</p>
<div data-slot="alias"></div>

<h4 class="ds-h4" id="tabs-widths">Widths</h4>
<p class="ds-desc">A strip, a 38px toolbar and a 30px toolbar at 390 (a phone, 44px, the switch in icons), 700 and 1280.</p>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="tabs-rules">Usage rules</h4>
<ul class="ds-desc">
  <li>Tabs choose one of a few views of the same thing. A choice that changes the page (a link) is a place: <code>aria-current="page"</code>.</li>
  <li>Selected is the fill and the text colour. Never an underline, a coloured edge or a left bar, and never the solid accent (that is the Primary button).</li>
  <li>A strip scrolls, a switch goes to icons, only the top bar folds. A tab is never hidden, shortened or wrapped.</li>
  <li>Keep the selected tab in view whenever it changes: <code>scrollLeft</code> so the whole tab shows.</li>
  <li>An icon-only tab needs an <code>aria-label</code> and a <code>title</code>. A tab with a count says it in its name ("Chat, 3 unread").</li>
  <li>The dot is for a change not saved yet, with "Unsaved changes" read beside it.</li>
  <li>Label: a noun, sentence case, the names in CLAUDE.md. Two to five choices in a switch; more than that is a strip.</li>
  <li>Minimum target 44px on a phone: the default size, or a small tab with its grown hit area.</li>
</ul>

<h4 class="ds-h4" id="tabs-map">Today to proposed</h4>
<p class="ds-desc">Written from the brief; not loaded here (Today\'s page shows these as they are). Every one takes the new look through its alias, with no markup change; the size is the one noted.</p>
${tbl(['Today', 'Where', 'Proposed', 'What changes visually'], [
    ['View switch: <code>.tb-tabs .tb-tab</code>, about 23px, accent solid selected, joined segments with 1px edges', 'Module toolbars (<code>host.ui.viewSwitch</code>), the host pages', 'The component, joined, small (30px; default 38px beside default buttons)', 'Taller (23 to 30px). Separate pills with a 2px gap and no edges. Selected is the quiet fill with darker accent text, not a solid accent block. Icons only when narrow, as now.'],
    ['Top bar tabs: <code>.layout-tabs .core-link</code>, 30px, selected fill', 'Top bar (Workspace, Calendar, Map, favorites)', 'The component, bar variant, small', 'Same height and fill. Selected text is the accent mix (now header text). Hover is a neutral fill (now accent 14%). Focus ring is inside the tab. The "..." fold is unchanged.'],
    ['Page bar tabs: <code>.page-bar .subtab</code>, 28px', 'Manage, Profile, a space\'s settings', 'The component, strip in the bar\'s colours, small', '28 to 30px. Selected text is the accent mix. The strip still scrolls; the selected tab is now scrolled into view. Gap 2px to 6px.'],
    ['Folder tabs: <code>.subtabs .subtab</code> (legacy), a rule under the strip, top corners only, selected accent text', 'Pages outside a page bar', 'The component, strip, default (38px)', 'The rule under the strip and the folder shape go. Separate pills. Selected is the fill, not accent text on a fill.'],
    ['<code>.setup-tabs .setup-tab</code>, 14px 600, selected fill', 'Set up', 'The component, strip, default (38px), with <code>.sdk-tab-dot</code>', 'Weight 600 to 500 (no width change when selected). Selected text is the accent mix (now plain text). The dot is the same. Focus ring is the shared one.'],
    ['Chat Discussion | Assistant: a view switch with a count and a dot', 'Chat', 'The component, joined, small, with the count and the dot', 'Accent solid selected becomes the fill. The count is the neutral pill. The dot is the tab\'s dot.'],
    ['Destination header view switch (Month | Week | Day) in the header colours', 'Calendar and Map pages', 'The component, joined, small, in the bar\'s colours', 'Accent solid selected becomes the fill with the accent mix in the header text colour. Gaps instead of joined edges.'],
    ['Polls\' own <code>.seg</code>, a stale copy of the view switch', 'Polls module', '<code>host.ui.viewSwitch</code> (the component)', 'Its own rules go. It gets the same look, icons-only fit and keyboard as every other switch. Polls is bumped when it moves (not in this build).'],
  ])}

<h4 class="ds-h4" id="tabs-contrast">Contrast</h4>
<p class="ds-desc">Worked out by this page, in the mode on show: flip the Dark and Light switch and the table follows. Text needs 4.5 to 1; a dot and the focus outline need 3 to 1. The plain accent on the selected fill is shown to explain the mix; it is not used.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="tabs-tokens">Tokens</h4>
${tbl(['Token', 'Use here', ''], [
    ['<code>--btn-h</code>', 'The default tab height: 38px, 44px at 640px and narrower. A toolbar that sets it sets its tabs.', 'exists (Buttons)'],
    ['<code>--tab-h-small</code>, <code>--tab-pad-x</code>, <code>--tab-font</code>, <code>--tab-icon</code>, <code>--tab-gap</code>', '30px; 12px (small 10px); 14px (small 13px); 16px (small 14px); 6px between icon and label.', 'new'],
    ['<code>--tabs-gap</code>, <code>--tabs-gap-joined</code>, <code>--tabs-fade</code>', 'The gap between tabs of a strip (6px) and of a joined switch (2px); the width of the edge fade (20px).', 'new'],
    ['<code>--t-ink</code>, <code>--t-fg</code>', 'The tab\'s text colours: <code>--text</code> and <code>--text-dim</code>; on the header bar <code>--header-text</code> and <code>--icon</code>.', 'new'],
    ['<code>--selected-bg</code>', 'The selected fill.', 'exists'],
    ['<code>--accent</code>, <code>--on-accent</code>', 'The selected text (mixed 55% into the ink), the dot, the focus outline, the icon-only count.', 'exists'],
    ['<code>--text</code>, <code>--text-dim</code>', 'Rest and hover text; hover, pressed and count fills (mixed with transparent).', 'exists'],
    ['<code>--header-text</code>, <code>--icon</code>', 'The bar variant\'s text.', 'exists'],
    ['<code>--radius-small</code>, <code>--radius-round</code>', 'The tab; the count and the dot.', 'exists'],
  ])}

<h4 class="ds-h4" id="tabs-markup">Markup contract</h4>
${code(`<!-- a strip: a tab list. Selected is aria-selected. Scrolls; the script keeps the selected tab in view -->
<div class="sdk-tabs" role="tablist" aria-label="Sections">
  <button type="button" class="sdk-tab" role="tab" aria-selected="true">General</button>
  <button type="button" class="sdk-tab" role="tab" aria-selected="false">People <span class="sdk-tab-dot" aria-hidden="true"></span><span class="visually-hidden">Unsaved changes</span></button>
  <button type="button" class="sdk-tab" role="tab" aria-selected="false">Modules <span class="sdk-tab-badge">3</span></button>
</div>

<!-- small: add .sdk-tabs-small -->
<div class="sdk-tabs sdk-tabs-small" role="tablist" aria-label="Sections">...</div>

<!-- the view switch (host.ui.viewSwitch draws this): joined; icons only when narrow adds .sdk-tabs-compact -->
<div class="sdk-tabs sdk-tabs-joined" role="group" aria-label="View">
  <button type="button" class="sdk-tab" aria-pressed="true"><i class="sdk-tab-glyph fa-solid fa-list" aria-hidden="true"></i><span class="sdk-tab-word">List</span></button>
  <button type="button" class="sdk-tab" aria-pressed="false"><i class="sdk-tab-glyph fa-solid fa-map" aria-hidden="true"></i><span class="sdk-tab-word">Map</span></button>
</div>

<!-- icon only: aria-label and title are required -->
<button type="button" class="sdk-tab sdk-tab-icon" aria-label="Chat" title="Chat"><i class="sdk-tab-glyph fa-solid fa-comments" aria-hidden="true"></i></button>

<!-- the header bar: places, with aria-current -->
<div class="sdk-tabs sdk-tabs-bar" role="group" aria-label="Views">
  <button type="button" class="sdk-tab" aria-current="page">Workspace</button>
  <button type="button" class="sdk-tab">Calendar</button>
</div>`)}
<p class="ds-desc"><b>Names kept so no consumer has to change.</b> <code>.tb-tabs</code>, <code>.tb-tab</code>, <code>.tb-tab-glyph</code>, <code>.tb-tab-word</code>, <code>.tb-tab-icon</code>, <code>.tb-tabs-compact</code>, <code>.subtabs</code>, <code>.subtab</code>, <code>.setup-tabs</code>, <code>.setup-tab</code>, <code>.setup-tab-dot</code>, <code>.layout-tabs</code>, <code>.core-link</code> (as a tab in these wrappers only), <code>.badge</code> in a tab, <code>.on</code> and <code>.active</code> are aliases of the component. New names, all with <code>sdk-</code>: <code>.sdk-tabs</code> and <code>.sdk-tab</code> (the contract), <code>.sdk-tabs-joined</code>, <code>.sdk-tabs-bar</code>, <code>.sdk-tabs-small</code>, <code>.sdk-tabs-compact</code>, <code>.sdk-tab-icon</code>, <code>.sdk-tab-glyph</code>, <code>.sdk-tab-word</code>, <code>.sdk-tab-badge</code>, <code>.sdk-tab-dot</code>. Not an alias: <code>.dest-tabs</code>, the phone\'s bottom bar.</p>

<h4 class="ds-h4" id="tabs-later">Decided in other families</h4>
${tbl(['Not in this family', 'Note'], [
    ['Chips that filter', 'The Chips, badges and counts family. A tab chooses a view; a filter chip narrows a list.'],
    ['The phone\'s bottom bar (icon over label)', 'On a phone the bar at the bottom of the screen (an icon over a word) is its own pattern, the Phone bottom bar family; this family does not cover it.'],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + TB_CSS, onload: tabsDemo }, o || {}));
    slot('zoom').appendChild(F(`<div class="ds-proposed"><div class="pm-zoom" style="zoom:2.5">${tabs([{ word: 'Modules', icon: 'puzzle-piece', badge: 3, sel: true }, { word: 'People' }], { role: 'tablist', label: 'Anatomy sample' })}</div></div>`, 'Tabs, anatomy sample', { height: 150 }));
    slot('phone').appendChild(F(phoneBody(), 'Tabs, on a phone', { pinWidth: 390 }));
    slot('matrix').appendChild(F(stateMatrix(false), 'Tabs, all states'));
    slot('matrix-small').appendChild(F(stateMatrix(true), 'Tabs, all states, small'));
    slot('joined').appendChild(F(joinedBody(), 'Tabs, joined switch'));
    slot('strip').appendChild(F(stripBody(), 'Tabs, strip that overflows', { pinWidth: 390 }));
    slot('fold').appendChild(F(foldBody(), 'Tabs, top bar fold', { pinWidth: 560 }));
    slot('pages').appendChild(F(pageBody(), 'Tabs, page bar and Set up', { pinWidth: 520 }));
    slot('toolbar').appendChild(F(toolBody(), 'Tabs, in a toolbar'));
    slot('alias').appendChild(F(aliasBody(), 'Tabs, aliases'));
    slot('contrast').appendChild(F(tcBody(), 'Tabs, contrast', { onload: measureTabContrast }));
    const ws = mk('div', '');
    for (const w of [390, 700, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(tabWidthBody(), `Tabs at ${w}`, { pinWidth: w }));
    }
    slot('widths').appendChild(ws);
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'tabs', covers: ['tabs', 'view-switch', 'switch'], group: 'Navigation', name: 'Tabs and view switches', status: 'approved',
    words: 'tabs tab view switch viewswitch toolbar strip subtab setup tab core-link layout tabs page bar scroll overflow fold selected badge count dot unsaved icon only compact segmented seg', render: renderTabs,
  });
})();
