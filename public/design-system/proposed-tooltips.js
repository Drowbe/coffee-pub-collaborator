/* The Tooltips family (proposed): a small inverse label that names a control, shown after 500ms of hover and at once on keyboard focus. Loaded by proposed.html through
   proposed-families.json, after proposed.js (the page engine); it registers one family through window.DS_PROPOSED.families.push and draws it with the rules in
   proposed-tooltips.css. The demo's behaviour (delay, focus, Escape, placement flip, no touch hover) is real script, the behaviour the SDK would carry. How to add a family:
   README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss;
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // The example-page rules of this family's frames only. The anchor puts a static tooltip beside a control; the component itself is placed by script.
  const TP_CSS = `
.pm-grid { display: flex; flex-wrap: wrap; align-items: stretch; gap: 16px 24px; }
.pm-cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; max-width: 100%; }
.pm-cell > small, .pm-cap { color: var(--text-dim); font-size: var(--text-11); font-weight: 700; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-cap { margin: 0 0 8px; }
.pm-anchor { position: relative; display: inline-block; margin: 0; }
.pm-grid + .pm-grid { margin-top: 16px; }
.pm-cell > .pm-slot { margin-top: auto; }
.pm-slot { display: flex; align-items: center; justify-content: center; box-sizing: border-box; height: 100px; }
.pm-anchor .sdk-tooltip { position: absolute; top: auto; left: 50%; bottom: calc(100% + 8px); transform: translateX(-50%); }
.pm-anchor .sdk-tooltip[data-placement="bottom"] { bottom: auto; top: calc(100% + 8px); }
.pm-anchor .sdk-tooltip[data-placement="left"] { bottom: auto; top: 50%; left: auto; right: calc(100% + 8px); transform: translateY(-50%); }
.pm-anchor .sdk-tooltip[data-placement="right"] { bottom: auto; top: 50%; left: calc(100% + 8px); transform: translateY(-50%); }
.pm-zoom { zoom: 2; display: block; }
.pm-tbar { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; box-sizing: border-box; min-width: 0; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-box { position: relative; overflow: hidden; border-radius: var(--radius-medium); background: var(--bg); }
.pm-note { margin: 8px 0 0; color: var(--text-dim); font-size: 12px; }
.pm-log { margin: 8px 0 0; color: var(--text-dim); font-size: 12px; min-height: 18px; }
.pm-ct { width: 100%; border-collapse: collapse; font-size: 12px; }
.pm-ct th { padding: 4px 8px 4px 0; color: var(--text-dim); font-size: var(--text-11); letter-spacing: 0.08em; text-align: left; text-transform: uppercase; }
.pm-ct td { padding: 4px 8px 4px 0; border-top: 1px solid var(--border); vertical-align: top; }
.pm-ct .pm-n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.pm-pass { color: var(--ok); font-weight: 700; } .pm-fail { color: var(--danger-text); font-weight: 700; }`;

  const TIP = (text, o = {}) => `<span class="sdk-tooltip" role="tooltip" data-show${o.arrow ? ' data-arrow' : ''}${o.place ? ` data-placement="${o.place}"` : ''}${o.id ? ` id="${o.id}"` : ''}>${text}${o.keys ? `<kbd>${o.keys}</kbd>` : ''}</span>`;
  // An icon-only button: it needs an accessible name AND the tooltip (data-tip).
  const IB = (icon, name, o = {}) => `<button type="button" class="sdk-icon-btn btn-quiet${o.small ? ' btn-small' : ''}${o.force ? ' ' + o.force : ''}" aria-label="${name}" data-tip="${name}"${o.keys ? ` data-tip-keys="${o.keys}"` : ''}>${fa(icon)}</button>`;
  const TAB = (icon, name, on) => `<button type="button" class="sdk-tab sdk-tab-icon" aria-label="${name}" data-tip="${name}" aria-pressed="${on ? 'true' : 'false'}"><i class="sdk-tab-glyph fa-solid fa-${icon}" aria-hidden="true"></i></button>`;
  const CELL = (cap, body, w) => `<div class="pm-cell"${w ? ` style="width:${w}px"` : ''}><small>${cap}</small>${body}</div>`;

  const zoomBody = () => `<div class="ds-proposed"><div class="pm-zoom" style="padding:30px 60px 10px">${'<div style="position:relative;display:inline-block;padding-top:40px">'}${TIP('Bold', { keys: 'Ctrl+B', arrow: true, id: 'tz' }).replace('class="sdk-tooltip"', 'class="sdk-tooltip" style="position:absolute;left:50%;top:0;transform:translateX(-50%)"')}${IB('bold', 'Bold')}</div></div></div>`;

  const statesBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('Hidden (rest)', `<div class="pm-slot"><div class="pm-anchor">${IB('bold', 'Bold')}</div></div>`, 140)}
    ${CELL('Shown on hover, after 500ms', `<div class="pm-slot"><div class="pm-anchor">${TIP('Bold')}${IB('bold', 'Bold', { force: 'ds-force-hover' })}</div></div>`, 160)}
    ${CELL('Shown on keyboard focus, at once', `<div class="pm-slot"><div class="pm-anchor">${TIP('Italic')}${IB('italic', 'Italic', { force: 'ds-force-focus' })}</div></div>`, 160)}
    ${CELL('With an arrow', `<div class="pm-slot"><div class="pm-anchor">${TIP('Underline', { arrow: true })}${IB('underline', 'Underline')}</div></div>`, 160)}
    ${CELL('With a shortcut hint', `<div class="pm-slot"><div class="pm-anchor">${TIP('Bold', { keys: 'Ctrl+B', arrow: true })}${IB('bold', 'Bold')}</div></div>`, 200)}
  </div><div class="pm-grid">
    ${CELL('Longest line: 240px, then it wraps', `<div class="pm-slot" style="height:136px"><div class="pm-anchor">${TIP('Move this place to another day, or to the list of places not yet planned')}${IB('arrows-up-down-left-right', 'Move')}</div></div>`, 300)}
  </div></div>`;

  const placeBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('Top (the default)', `<div class="pm-slot"><div class="pm-anchor">${TIP('Search', { arrow: true })}${IB('magnifying-glass', 'Search')}</div></div>`, 200)}
    ${CELL('Bottom (when the top is clipped)', `<div class="pm-slot"><div class="pm-anchor">${TIP('Search', { arrow: true, place: 'bottom' })}${IB('magnifying-glass', 'Search')}</div></div>`, 200)}
    ${CELL('Left', `<div class="pm-slot"><div class="pm-anchor">${TIP('Search', { arrow: true, place: 'left' })}${IB('magnifying-glass', 'Search')}</div></div>`, 200)}
    ${CELL('Right', `<div class="pm-slot"><div class="pm-anchor">${TIP('Search', { arrow: true, place: 'right' })}${IB('magnifying-glass', 'Search')}</div></div>`, 200)}
  </div></div>`;

  const truncBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('Truncated text: the label shows the whole text, only while it is cut', `<div style="width:240px"><div class="pm-tbar" style="display:block"><div class="sdk-truncate" tabindex="0" data-tip="Louvre museum, east wing, Rue de Rivoli, Paris" data-tip-if-truncated>Louvre museum, east wing, Rue de Rivoli, Paris</div></div></div>`)}
    ${CELL('Not cut: no label', `<div style="width:240px"><div class="pm-tbar" style="display:block"><div class="sdk-truncate" tabindex="0" data-tip="Louvre museum" data-tip-if-truncated>Louvre museum</div></div></div>`)}
  </div></div>`;

  // The toolbar: live. The tooltips here are the real thing.
  const toolbar = () => `<div class="pm-tbar" role="toolbar" aria-label="Format">
      ${IB('bold', 'Bold', { keys: 'Ctrl+B' })}${IB('italic', 'Italic', { keys: 'Ctrl+I' })}${IB('underline', 'Underline', { keys: 'Ctrl+U' })}${IB('list', 'List')}${IB('link', 'Add a link', { keys: 'Ctrl+K' })}
      <span style="flex:1 1 auto"></span>
      <div class="sdk-tabs sdk-tabs-joined" role="group" aria-label="View">${TAB('list', 'List view', true)}${TAB('map', 'Map view')}${TAB('calendar-days', 'Calendar view')}</div>
      ${IB('ellipsis-vertical', 'More')}
    </div>`;
  const toolBody = () => `<div class="ds-proposed">${toolbar()}<p class="pm-log" data-log role="status" aria-live="polite">Hover a button for half a second, or Tab to it. Escape hides the label. A touch never shows it on hover.</p></div>`;
  const toolStaticBody = (w) => `<div class="ds-proposed"><div class="pm-box" style="height:130px;padding:14px"><div style="padding-top:34px">${toolbar()}</div>${TIP('Add a link', { keys: 'Ctrl+K', arrow: true }).replace('class="sdk-tooltip"', `class="sdk-tooltip" style="position:absolute;left:${w <= 640 ? 170 : 205}px;top:14px"`)}</div></div>`;
  const phoneBody = () => `<div class="ds-proposed"><p class="pm-cap">390 wide, touch: a tap acts at once and never shows a tooltip. A long press (half a second) shows the label until the finger lifts. The same names are in the "More" menu.</p>${toolbar()}<p class="pm-log" data-log role="status" aria-live="polite"></p></div>`;

  // ---- the controller: the behaviour, in script ----
  const controller = (doc) => {
    const win = doc.defaultView;
    win.__tipScale = 1; // a check sets this to run the 500ms clock fast
    const tip = doc.createElement('span');
    tip.className = 'sdk-tooltip'; tip.setAttribute('role', 'tooltip'); tip.id = 'sdk-tip'; tip.dataset.arrow = '';
    doc.querySelector('.ds-proposed').appendChild(tip);
    const log = doc.querySelector('[data-log]');
    let timer = 0; let cur = null; let touchTimer = 0; let lastTouch = 0;
    const say = (t) => { if (log) log.textContent = t; };
    const place = (el) => {
      const r = el.getBoundingClientRect();
      const vw = doc.documentElement.clientWidth; const vh = doc.documentElement.clientHeight;
      const t = tip.getBoundingClientRect();
      let where = 'top';
      if (r.top - t.height - 8 < 4) where = 'bottom';
      if (where === 'bottom' && r.bottom + t.height + 8 > vh - 4 && r.top - t.height - 8 >= 4) where = 'top';
      let left = r.left + r.width / 2 - t.width / 2;
      left = Math.max(4, Math.min(left, vw - t.width - 4));
      const top = where === 'top' ? r.top - t.height - 8 : r.bottom + 8;
      tip.style.left = left + 'px'; tip.style.top = top + 'px';
      tip.style.setProperty('--arrow-x', (r.left + r.width / 2 - left) + 'px');
      tip.dataset.placement = where;
    };
    const show = (el, why) => {
      if (el.hasAttribute('data-tip-if-truncated') && el.scrollWidth <= el.clientWidth) return;
      cur = el;
      tip.innerHTML = h(el.dataset.tip) + (el.dataset.tipKeys ? `<kbd>${h(el.dataset.tipKeys)}</kbd>` : '');
      tip.removeAttribute('data-show');
      place(el);
      el.setAttribute('aria-describedby', 'sdk-tip');
      tip.setAttribute('data-show', '');
      say(`Label "${el.dataset.tip}" shown (${why}) on the ${tip.dataset.placement}.`);
    };
    const hide = (why) => {
      clearTimeout(timer); clearTimeout(touchTimer);
      if (cur) { cur.removeAttribute('aria-describedby'); if (why) say(`Label hidden (${why}).`); }
      tip.removeAttribute('data-show'); cur = null;
    };
    doc.addEventListener('pointerover', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]'); if (!el || el === cur) return;
      if (e.pointerType === 'touch' || e.pointerType === 'pen' && false) return; // never on touch hover
      if (win.performance.now() - lastTouch < 800) return; // the mouse events a touch makes after it
      hide(); timer = setTimeout(() => show(el, 'hover'), 500 * win.__tipScale);
    });
    doc.addEventListener('pointerout', (e) => { const el = e.target.closest && e.target.closest('[data-tip]'); if (el && !el.contains(e.relatedTarget)) hide('pointer left'); });
    doc.addEventListener('focusin', (e) => {
      const el = e.target.closest && e.target.closest('[data-tip]'); if (!el) return;
      if (el.matches(':focus-visible')) { hide(); show(el, 'keyboard focus'); }
    });
    doc.addEventListener('focusout', () => hide('blur'));
    doc.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cur) { hide('Escape'); } });
    doc.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') { lastTouch = win.performance.now(); const el = e.target.closest('[data-tip]'); if (el) { clearTimeout(touchTimer); touchTimer = setTimeout(() => show(el, 'long press'), 500 * win.__tipScale); } } else hide();
    });
    const lift = () => { clearTimeout(touchTimer); if (cur) setTimeout(() => hide('finger lifted'), 1200 * win.__tipScale); };
    doc.addEventListener('pointerup', lift); doc.addEventListener('pointercancel', lift);
    win.__tip = { show, hide, tip, current: () => cur };
  };

  // ---- contrast ----
  const TC_ROWS = [
    ['Label text (--bg) on the label fill (--text)', 'var(--bg)', ['--text'], 4.5],
    ['Shortcut key text (--bg, 11px) on its chip (page colour at 22% over the fill)', 'var(--bg)', ['--text', 'color-mix(in srgb, var(--bg) 22%, transparent)'], 4.5],
    ['The label fill against the page (it must stand out)', 'var(--text)', ['--bg'], 3],
    ['The label fill against a panel', 'var(--text)', ['--bg-section'], 3],
  ];
  const tcBody = () => `<div class="ds-proposed"><table class="pm-ct"><thead><tr><th>Pair</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${TC_ROWS.map((r) => `<tr data-fg="${h(r[1])}" data-bgs="${h(JSON.stringify(r[2]))}" data-min="${r[3]}"><td>${r[0]}</td><td class="pm-n" data-out="r"></td><td class="pm-n">${r[3]} to 1</td><td data-out="p"></td></tr>`).join('')}</tbody></table></div>`;
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
        g.clearRect(0, 0, 1, 1);
        for (const l of layers) { g.fillStyle = col(l); g.fillRect(0, 0, 1, 1); }
        const base = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        g.fillStyle = col(tr.dataset.fg); g.fillRect(0, 0, 1, 1);
        const top = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        const a = lum(top); const b = lum(base);
        const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const ok = r >= Number(tr.dataset.min);
        const p = tr.querySelector('[data-out="p"]'); p.textContent = ok ? 'Passes' : 'Fails'; p.className = ok ? 'pm-pass' : 'pm-fail';
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  function renderTooltips(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="tooltips-h"><a href="#tooltips">Tooltips</a></h3><span class="ds-status-chip ds-st-approved">Approved</span><span class="ds-count">a small inverse label that names an icon-only control or a tab</span></header>
<p class="ds-desc"><b>Decided 2026-10-21: approved as drawn.</b> A new component. A small label in the <b>inverse</b> of the page (the text colour as the fill, the page colour as the text: dark on light, light on dark), 12px, <code>--radius-small</code>, 240px at most, 4px by 8px of padding, <code>--shadow-2</code>. It shows after <b>500ms of hover</b> and <b>at once on keyboard focus</b>; Escape hides it; it has <code>role="tooltip"</code> and the control gets <code>aria-describedby</code>. <b>Never on touch hover:</b> on a touch screen the label shows on a long press, or is in the menu. The arrow is optional. It sits on top and flips below when the top is clipped. <b>Applied first to icon-only controls and tabs</b>, which need both an accessible name and the tooltip. The other 321 native <code>title</code> hints stay native for now.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#tooltips-anatomy">Anatomy</a><a href="#tooltips-states">States</a><a href="#tooltips-place">Placement</a><a href="#tooltips-trunc">Truncated text</a><a href="#tooltips-tool">In a toolbar</a><a href="#tooltips-phone">On a phone</a><a href="#tooltips-today">Today to proposed</a><a href="#tooltips-contrast">Contrast</a><a href="#tooltips-tokens">Tokens</a><a href="#tooltips-markup">Markup contract</a><a href="#tooltips-widths">Widths</a><a href="#tooltips-decided">Decided 2026-10-21</a></nav>

<h4 class="ds-h4" id="tooltips-anatomy">Anatomy</h4>
<div data-slot="zoom"></div>
${dim([
    ['1 Surface', '<code>--text</code> as the fill, <code>--bg</code> as the text, <code>--radius-small</code>, <code>--shadow-2</code>, 4px by 8px, 240px at most (longer text wraps). No hairline: the inverse fill is its own edge.'],
    ['2 Label', '12px, weight 500, a line of 16px. The same words as the control\'s <code>aria-label</code>: a name, not a sentence.'],
    ['3 Shortcut', 'Optional. A <code>kbd</code> chip at the end: 11px, weight 600, <code>--radius-min</code>, the page colour at 22% as its fill.'],
    ['4 Arrow', 'Optional. 8px, the same fill, on the side that faces the control.'],
    ['5 Gap', '8px between the label and the control.'],
  ])}

<h4 class="ds-h4" id="tooltips-states">States</h4>
<div data-slot="states"></div>

<h4 class="ds-h4" id="tooltips-place">Placement</h4>
<p class="ds-desc">On top by default, centred on the control. When the top would be clipped by the screen or the window it flips to the bottom; it is kept 4px inside the edges sideways. Left and right are for controls at the edge of a narrow column.</p>
<div data-slot="place"></div>

<h4 class="ds-h4" id="tooltips-trunc">Truncated text</h4>
<p class="ds-desc">Text that is cut with an ellipsis carries its whole text as the label, and only while it is cut. It needs <code>tabindex="0"</code> so the keyboard can reach it.</p>
<div data-slot="trunc"></div>

<h4 class="ds-h4" id="tooltips-tool">In a toolbar</h4>
<p class="ds-desc">The real thing: icon buttons and icon-only tabs. Hover for half a second, or Tab onto one: the label appears at once. Escape hides it. The line below says what happened.</p>
<div data-slot="tool"></div>
<p class="ds-desc"><b>Drawn shown</b>, with a shortcut and an arrow:</p>
<div data-slot="tool-static"></div>

<h4 class="ds-h4" id="tooltips-phone">On a phone</h4>
<p class="ds-desc">There is no hover on touch, so there is no tooltip on hover. A long press (half a second) shows the label until the finger lifts, and an icon-only control that is also in a menu has its name there.</p>
<div data-slot="phone"></div>

<h4 class="ds-h4" id="tooltips-today">Today to proposed</h4>
${tbl(['Today', 'Proposed', 'Note'], [
    ['Native <code>title</code> hints: 321 of them. They wait about a second and a half, cannot be styled, do not show on keyboard focus and never show on touch', '<code>.sdk-tooltip</code> on icon-only controls and tabs: 500ms, at once on keyboard focus, styled, long press on touch', 'The other 321 stay native for now.'],
    ['Icon-only controls with a <code>title</code> and an <code>aria-label</code> (top bar, toolbars, the "..." buttons)', 'An <code>aria-label</code> and <code>data-tip</code>, the same words', 'Both are required; a control with only a title is a defect.'],
    ['Icon-only tabs (<code>.sdk-tab-icon</code>) with a <code>title</code>', 'The same: <code>aria-label</code> and <code>data-tip</code>', 'Tabs family.'],
    ['Cut-off text with a <code>title</code>', '<code>data-tip</code> and <code>data-tip-if-truncated</code>', 'Later; native for now.'],
  ])}

<h4 class="ds-h4" id="tooltips-contrast">Contrast</h4>
<p class="ds-desc">Worked out by this page, in the mode on show: the inverse text on the inverse fill reaches 4.5 to 1 in both modes (it is the page's own text and page colours, swapped).</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="tooltips-tokens">Tokens</h4>
${tbl(['Token', 'Use here', ''], [
    ['<code>--tip-max-w</code>, <code>--tip-delay</code>, <code>--tip-ms</code>', '240px; 500ms; 120ms (a short fade).', 'new'],
    ['<code>--z-tooltip</code>', 'The layer above the toasts (70).', 'new'],
    ['<code>--text</code>, <code>--bg</code>', 'The fill and the text: the page, inverted.', 'exists'],
    ['<code>--shadow-2</code>', 'The shadow (Menus family).', 'exists (Menus)'],
    ['<code>--radius-small</code>, <code>--radius-min</code>', 'The label; the key chip.', 'exists'],
  ])}

<h4 class="ds-h4" id="tooltips-markup">Markup contract</h4>
${code(`<!-- the control: an accessible name AND the tooltip text (the same words); the SDK sets aria-describedby while the label shows -->
<button type="button" class="sdk-icon-btn btn-quiet" aria-label="Bold" data-tip="Bold" data-tip-keys="Ctrl+B">...</button>
<button type="button" class="sdk-tab sdk-tab-icon" aria-label="Map view" data-tip="Map view">...</button>
<div class="sdk-truncate" tabindex="0" data-tip="The whole text" data-tip-if-truncated>The whole text, cut...</div>

<!-- one label for the page, in the top layer, moved to the control that asks for it -->
<span class="sdk-tooltip" role="tooltip" id="sdk-tip" data-arrow data-placement="top" data-show>Bold<kbd>Ctrl+B</kbd></span>`)}

<h4 class="ds-h4" id="tooltips-widths">Widths</h4>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="tooltips-decided">Decided 2026-10-21</h4>
<p class="ds-desc">Thomas approved every choice below, as drawn, on 2026-10-21.</p>
${tbl(["Decided as drawn","What"], [
    ["One tooltip look","Replaces the browser's. Nothing was chosen beyond the drawing."],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + TP_CSS }, o || {}));
    slot('zoom').appendChild(F(zoomBody(), 'Tooltips, anatomy sample', { height: 200 }));
    slot('states').appendChild(F(statesBody(), 'Tooltips, states'));
    slot('place').appendChild(F(placeBody(), 'Tooltips, placement'));
    slot('trunc').appendChild(F(truncBody(), 'Tooltips, truncated text', { height: 130, onload: controller }));
    slot('tool').appendChild(F(toolBody(), 'Tooltips, toolbar', { height: 150, onload: controller }));
    slot('tool-static').appendChild(F(toolStaticBody(1280), 'Tooltips, toolbar shown', { height: 150 }));
    slot('phone').appendChild(F(phoneBody(), 'Tooltips, on a phone', { pinWidth: 390, height: 190, onload: controller }));
    slot('contrast').appendChild(F(tcBody(), 'Tooltips, contrast', { onload: measureContrast }));
    const ws = mk('div', '');
    for (const w of [390, 700, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(toolStaticBody(w), `Tooltips at ${w}`, { pinWidth: w, height: w <= 640 ? 190 : 150 }));
    }
    slot('widths').appendChild(ws);
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'tooltips', covers: ['tooltip', 'hint', 'title'], group: 'Feedback', name: 'Tooltips', status: 'approved',
    words: 'tooltip tooltips hint label title hover focus keyboard shortcut kbd arrow inverse icon only name aria describedby long press touch truncated',
    render: renderTooltips,
  });
})();
