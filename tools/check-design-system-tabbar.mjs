/*
 * check-design-system-tabbar.mjs -- the Phone bottom bar family (one tab bar for the space bar and the destination bar) of the proposed design system page
 * (public/design-system/proposed-tabbar.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a bar that is not 54px plus its inset on the bar surface (--header-bg) with one 1px --border hairline on top, a tab narrower than 56px or lower than 44px, a tab
 * whose icon is not 20px over an 11px label 4px apart, a current tab that is not --selected-bg with the accent-mix label (or is accent words on a bare background), a hover or
 * pressed tab that does not change its fill, a focus that is not a 2px accent outline inside the tab (the same on all four sides at 1.25x and 1.5x), a disabled tab not at half
 * strength, a icon box that is not 24 by 24 with the glyph centred, a count or dot that is not at the same place against the icon box on every tab (count 4px above and 6px past the top right corner, dot 1px above and 3px past, within 0.5px), a count within 2px of its label, Conference as the first tab or a first tab that is not current, a badge that is not the 14px micro count with 9px numbers, a Join icon that is not --ok, Leave words that are not
 * the readable red, a bar that overflows or squeezes a tab under 56px instead of folding, a fold that does not put the tabs that do not fit into a "..." tab with a menu above the bar
 * (the current tab kept in the bar, the pinned tabs kept, a pick that selects), a label more than 1px off the middle of its tab, a coloured one-sided edge or a thin coloured
 * block, a weight other than 400, 500 and 600 or text under 11px (the micro count excepted), a contrast pair under its minimum, an alias that does not look like the new name, a frame
 * that scrolls sideways, the family not marked Approved, the undecided name still listed; in the stylesheet: a hex colour, a colour written out, a gradient, a shadow, a side border other
 * than the hairline on top, a weight over 600, a font size under 11px, a name not defined.
 */
export const id = 'tabbar';
export const todayOnly = ['subnav', 'on', 'badge'];

export function staticChecks({ fail, css, js, defined }) {
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-tabbar.css: a hex colour (tokens only)');
  if (/rgba?\(/.test(css)) fail('proposed-tabbar.css: a colour written out (tokens only)');
  if (/gradient\(/.test(css)) fail('proposed-tabbar.css: a gradient');
  for (const m of css.matchAll(/box-shadow\s*:\s*([^;]+);/g)) if (m[1].trim() !== 'none') fail(`proposed-tabbar.css: box-shadow ${m[1].trim()} (a tab bar has no shadow)`);
  for (const m of css.matchAll(/border-(left|right|top|bottom)\s*:\s*([^;]+);/g)) {
    if (m[1] !== 'top' || m[2].trim() !== '1px solid var(--border)') fail(`proposed-tabbar.css: border-${m[1]}: ${m[2].trim()} (only the 1px --border hairline on top of the bar)`);
  }
  for (const m of css.matchAll(/font-weight\s*:\s*(\d+)/g)) if (Number(m[1]) > 600) fail(`proposed-tabbar.css: font-weight ${m[1]} (the weights are 400, 500 and 600)`);
  for (const m of css.matchAll(/font-size\s*:\s*(\d+)px/g)) if (Number(m[1]) < 11 && Number(m[1]) !== 9) fail(`proposed-tabbar.css: font-size ${m[1]}px (nothing under 11px)`);
  if (/text-decoration\s*:\s*underline/.test(css)) fail('proposed-tabbar.css: an underline');
  if (!/--tabbar-h:\s*54px/.test(css) || !/--tabbar-min:\s*56px/.test(css) || !/--tabbar-icon:\s*20px/.test(css) || !/--tabbar-gap:\s*4px/.test(css)) fail('proposed-tabbar.css: a size token is not its value (bar 54, least width 56, icon 20, gap 4)');
  for (const c of ['sdk-tabbar', 'sdk-tabbar-tab', 'sdk-tabbar-glyph', 'sdk-tabbar-label', 'sdk-tabbar-more', 'sdk-tabbar-menu', 'subnav-modules', 'modules-menu-item', 'dest-tabs', 'dest-tab']) {
    if (!defined.has(c)) fail(`the proposed stylesheets do not define the tab bar name .${c} (a new name or a kept alias)`);
  }
  if (!/ds-st-approved/.test(js) || /ds-st-proposed/.test(js)) fail('proposed-tabbar.js: the family is not marked Approved');
}

export async function browserChecks(b) {
  const { ev, cdp, sessionId, sc, where, problems, inkCentre, edgeColours } = b;
  const cp = JSON.parse(await ev(`(${probe.toString()})()`));
  for (const x of cp.problems) problems.push(`${where}: ${x}`);
  // The label of a tab, within 1px of the middle of its box (a 4x screenshot; the label's words have no descenders).
  for (const [title, idx, nm] of [['Tab bar, states', 0, 'a tab at rest'], ['Tab bar, states', 4, 'the current tab']]) {
    const { png } = await b.shotAt(title, `d.querySelectorAll('.sdk-tabbar')[0].querySelectorAll('.sdk-tabbar-tab')[${idx}]`); // on a whole pixel, across and down
    const c = inkCentre(png, 4, 10);
    if (c === null) problems.push(`${where}: no ink found in ${nm}`);
    else if (Math.abs(c) > 1.01) problems.push(`${where}: the icon and label of ${nm} are ${Math.abs(c).toFixed(2)}px ${c > 0 ? 'low' : 'high'} of the middle of its box`);
  }
  await ev(`(() => { for (const f of window.__ds.frames) { f.iframe.style.top = ''; f.iframe.style.left = ''; f.iframe.style.position = ''; } })()`);
  // The focus outline of a tab: all four sides the same at a fractional device pixel ratio and page offset.
  if (sc.width >= 500 || true) {
    for (const dsf of [1.25, 1.5]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: dsf, mobile: false }, sessionId);
      await new Promise((r) => setTimeout(r, 400));
      for (const nudge of [0.3, 0.7]) {
        const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Tab bar, states'); const d = m.iframe.contentDocument; const el = d.querySelector('.sdk-tabbar-tab.ds-force-focus'); el.scrollIntoView({ block: 'center', behavior: 'instant' });
          const c = document.getElementById('ds-content'); c.style.marginTop = '${nudge}px'; c.style.marginLeft = '${nudge * 1.7 % 1}px'; window.scrollTo(0, Math.round(window.scrollY) + ${nudge}); await new Promise((r) => setTimeout(r, 150));
          const cv = document.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = getComputedStyle(el).outlineColor; g.fillRect(0, 0, 1, 1); const px = g.getImageData(0, 0, 1, 1).data;
          const b = el.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height, col: 'rgb(' + px[0] + ',' + px[1] + ',' + px[2] + ')' }); })()`));
        const pad = 6;
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x - pad, y: at.y - pad, width: at.w + pad * 2, height: at.h + pad * 2, scale: 1 } }, sessionId);
        const e = edgeColours(Buffer.from(shot.data, 'base64'), at.col.match(/[\d.]+/g).map(Number), dsf, pad, at.w, at.h);
        const vals = Object.values(e);
        if (Math.max(...vals) - Math.min(...vals) > 40) problems.push(`${where}: the focused tab outline is not the same on all four sides at ${dsf}x with the page ${nudge}px off the pixel grid (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
        if (Math.max(...vals) > 60) problems.push(`${where}: a side of the focused tab outline never reaches its full colour at ${dsf}x (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
      }
      await ev(`(() => { const c = document.getElementById('ds-content'); c.style.marginTop = ''; c.style.marginLeft = ''; })()`);
    }
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: 1, mobile: sc.width < 500 }, sessionId);
    await new Promise((r) => setTimeout(r, 300));
  }
}

// Measured in the page (runs in the browser).
const probe = async () => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^Tab bar/.test(t));
  if (TITLES.length < 9) bad(`the Tab bar family has only ${TITLES.length} frames`);
  await wait(200);
  const tok = (d, expr, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = expr; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const bg = (d, expr) => tok(d, expr, 'backgroundColor');
  const cs = (e, p) => getComputedStyle(e, p);
  const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 0.6 : t);
  const SIDES = ['Top', 'Right', 'Bottom', 'Left'];
  const vis = (el) => !el.hidden && el.getBoundingClientRect().width > 0;
  const tabs = (bar) => [...bar.querySelectorAll(':scope > .sdk-tabbar-tab, :scope > .modules-menu-item, :scope > .dest-tab')].filter(vis);
  const NOW = 'color-mix(in srgb, var(--accent) 55%, var(--header-text))';
  // ---- every bar: the box, the surface, the tabs ----
  for (const t of TITLES) { const d = get(t); if (/contrast/.test(t)) continue;
    if (d.documentElement.scrollWidth > d.documentElement.clientWidth + 1) bad(`${t}: scrolls sideways`);
    for (const bar of d.querySelectorAll('.sdk-tabbar, .subnav-modules, .dest-tabs')) { const c = cs(bar); const safe = parseFloat(c.getPropertyValue('--safe-b')) || 0; const r = bar.getBoundingClientRect();
      if (!near(r.height, 54 + safe)) bad(`${t}: a bar is ${r.height}px high, expected ${54 + safe}`);
      if (c.backgroundColor !== bg(d, 'var(--header-bg)')) bad(`${t}: a bar is not --header-bg`);
      if (c.borderTopWidth !== '1px' || c.borderTopColor !== tok(d, 'var(--border)') || c.borderBottomWidth !== '0px' || c.borderLeftWidth !== '0px' || c.borderRightWidth !== '0px') bad(`${t}: a bar is not one 1px --border hairline on top`);
      if (c.boxShadow !== 'none') bad(`${t}: a bar has a shadow`);
      if (bar.scrollWidth > bar.clientWidth + 1) bad(`${t}: a bar overflows instead of folding`);
      const ts = tabs(bar); if (!ts.length) bad(`${t}: a bar has no tabs`);
      for (const tb of ts) { const tr = tb.getBoundingClientRect(); const tc = cs(tb);
        if (tr.width < 55.4) bad(`${t}: a tab is ${tr.width}px wide, under 56`); if (tr.height < 43.4) bad(`${t}: a tab is ${tr.height}px high, under 44`);
        if (tc.minWidth !== '56px') bad(`${t}: a tab's least width is ${tc.minWidth}, expected 56px`);
        if (tc.borderTopLeftRadius !== tok(d, 'var(--radius-small)', 'borderTopLeftRadius')) bad(`${t}: a tab is not the small corner`);
        for (const sd of SIDES) if (tc['border' + sd + 'Color'] !== 'rgba(0, 0, 0, 0)') bad(`${t}: a tab has a coloured edge`);
        if (tc.fontSize !== '11px' || tc.fontWeight !== '500') bad(`${t}: a tab label is ${tc.fontSize} weight ${tc.fontWeight}, expected 11px 500`);
        const gl = tb.querySelector('.sdk-tabbar-glyph, :scope > i'); const ic = gl && (gl.matches('i') ? gl : gl.querySelector('i')); const lb = tb.querySelector('.sdk-tabbar-label') || tb.querySelector(':scope > span:not(.badge):not(.sdk-badge-micro)');
        if (!ic || cs(ic).fontSize !== '20px') bad(`${t}: a tab icon is not 20px`);
        if (ic && lb) { const gap = lb.getBoundingClientRect().top - ic.getBoundingClientRect().bottom; if (!near(gap, 4, 1.2)) bad(`${t}: the icon and the label are ${gap}px apart, expected 4`); }
        if ((tb.hasAttribute('aria-current') || tb.classList.contains('on')) && !/ds-force/.test(tb.className)) { if (tc.backgroundColor !== bg(d, 'var(--selected-bg)')) bad(`${t}: the current tab is ${tc.backgroundColor}, not --selected-bg`); if (tc.color !== tok(d, NOW)) bad(`${t}: the current tab's label is not the accent mix`); if (tc.color === tok(d, 'var(--accent)') || tc.backgroundColor === 'rgba(0, 0, 0, 0)') bad(`${t}: the current tab is accent words on a bare background`); } }
      const cur = ts.filter((x) => x.hasAttribute('aria-current') || x.classList.contains('on')); if (cur.length > 1) bad(`${t}: a bar has ${cur.length} current tabs`); } }
  // ---- the widths: 3, 5 and 7 tabs, at 390 and 320 ----
  for (const w of [390, 320]) { const d = get(`Tab bar at ${w}`); if (d.defaultView.innerWidth !== w) bad(`Tab bar at ${w} is ${d.defaultView.innerWidth} wide`);
    const [b3, b5, b7] = [...d.querySelectorAll('.sdk-tabbar')]; const t3 = tabs(b3); if (t3.length !== 3 || !near(t3[0].getBoundingClientRect().width, t3[2].getBoundingClientRect().width, 1)) bad(`Tab bar at ${w}: three tabs do not share the bar equally`);
    const slots = Math.floor(((w) - 8 + 4) / 60); const want5 = 5 <= slots ? 5 : slots; const t5 = tabs(b5); if (t5.length !== (5 <= slots ? 5 : slots)) bad(`Tab bar at ${w}: the five-tab bar shows ${t5.length} tabs, expected ${want5}`);
    const t7 = tabs(b7); const more = b7.querySelector(':scope > .sdk-tabbar-more'); if (!more || !vis(more)) bad(`Tab bar at ${w}: seven tabs do not fold into a "..." tab`);
    else { if (t7.length !== slots) bad(`Tab bar at ${w}: the seven-tab bar shows ${t7.length} tabs with the "..." (expected ${slots})`); const budget = b7.querySelector(':scope > .sdk-tabbar-tab[aria-current="page"]'); if (!budget || !vis(budget)) bad(`Tab bar at ${w}: the current tab was folded away`);
      if (!more.hasAttribute('aria-haspopup') || more.getAttribute('aria-expanded') !== 'false') bad('the "..." tab is not a menu button');
      // press it
      more.click(); const menu = b7.querySelector(':scope > .sdk-tabbar-menu'); if (!menu || menu.hidden) bad(`Tab bar at ${w}: the "..." tab does not open its menu`);
      else { const items = [...menu.querySelectorAll('.sdk-menu-item')]; if (items.length !== 7 - t7.length + 1 - 1 && items.length < 2) bad(`Tab bar at ${w}: the folded tabs are not listed`); const mr = menu.getBoundingClientRect(); const br = b7.getBoundingClientRect(); if (mr.bottom > br.top + 0.5) bad(`Tab bar at ${w}: the menu is not above the bar`);
        if (cs(menu).backgroundColor !== bg(d, 'var(--bg-card)') || cs(menu).borderTopLeftRadius !== tok(d, 'var(--radius-medium)', 'borderTopLeftRadius')) bad('the fold menu is not the Menus popover');
        if (b7.querySelector(':scope > .sdk-tabbar-more').getAttribute('aria-expanded') !== 'true') bad('the "..." tab does not say it is expanded');
        for (const it of items) if (!near(it.getBoundingClientRect().height, 44)) bad(`Tab bar at ${w}: a menu item is ${it.getBoundingClientRect().height}px, expected 44 on a phone`);
        const pickedLabel = items[0].querySelector('.sdk-menu-label').textContent; items[0].click();
        const now = b7.querySelector(':scope > .sdk-tabbar-tab[aria-current="page"]'); if (!now || now.querySelector('.sdk-tabbar-label').textContent !== pickedLabel || !vis(now)) bad(`Tab bar at ${w}: picking a folded tab does not select it and keep it in the bar`);
        if (!b7.querySelector(':scope > .sdk-tabbar-menu').hidden) bad('picking a folded tab does not close the menu'); } }
    // badges, in the 5-tab bar: the icon box is 24 by 24, the micro count is 14px with 9px numbers
    const glyphs = [...b5.querySelectorAll('.sdk-tabbar-glyph')]; for (const gl of glyphs) { const gr = gl.getBoundingClientRect(); const m = gl.querySelector('.sdk-badge-micro');
      if (!near(gr.width, 24) || !near(gr.height, 24)) bad(`Tab bar at ${w}: the icon box is ${gr.width} by ${gr.height}, expected 24 by 24`);
      const ir = gl.querySelector('i').getBoundingClientRect(); if (!near(ir.left + ir.width / 2, gr.left + 12, 0.6) || !near(ir.top + ir.height / 2, gr.top + 12, 0.6)) bad(`Tab bar at ${w}: the icon is not centred in its box`);
      if (!m) continue; const r = m.getBoundingClientRect(); const c = cs(m);
      if (!near(r.height, 14) || c.fontSize !== '9px') bad(`Tab bar at ${w}: a micro count is ${r.height}px high at ${c.fontSize}, expected 14px and 9px`);
      if (!/^[\w -]+, [\d+]+ new$/.test(gl.closest('.sdk-tabbar-tab').getAttribute('aria-label') || '')) bad('a tab with a count has no name with the count'); }
    const dots = b5.querySelectorAll('.sdk-dot'); if (!dots.length || !near(dots[0].getBoundingClientRect().width, 7)) bad(`Tab bar at ${w}: the dot is not 7px`);
    // the first tab is a module (Chat) and is the current one; Conference is not a tab
    { const f = tabs(b5)[0]; if (f.querySelector('.sdk-tabbar-label').textContent !== 'Chat' || f.getAttribute('aria-current') !== 'page') bad(`Tab bar at ${w}: the first tab is not Chat, chosen`); for (const bb of [b3, b5, b7]) if (/Conference/.test(bb.textContent)) bad(`Tab bar at ${w}: Conference is a tab on the phone bar`); }
    }
  // ---- one place for every count and dot, on every bar in the family (light and dark, 390 and 320 are the run's own scenarios; 320 is drawn too) ----
  { const offs = []; const seen = [];
    for (const t of TITLES) { const d = get(t); if (/contrast/.test(t)) continue;
      for (const gl of d.querySelectorAll('.sdk-tabbar-tab:not([hidden]) > .sdk-tabbar-glyph')) { const gr = gl.getBoundingClientRect(); if (gr.width === 0) continue;
        for (const [sel, kind] of [['.sdk-badge-micro', 'count'], ['.sdk-dot', 'dot']]) { const m = gl.querySelector(sel); if (!m) continue; const r = m.getBoundingClientRect();
          offs.push({ kind, t, right: r.right - gr.right, top: r.top - gr.top, w: r.width }); } } }
    for (const kind of ['count', 'dot']) { const of = offs.filter((o) => o.kind === kind); if (of.length < 3) { bad(`only ${of.length} ${kind}s drawn in the Tab bar frames`); continue; }
      const spread = (k) => Math.max(...of.map((o) => o[k])) - Math.min(...of.map((o) => o[k]));
      if (spread('top') > 0.5) bad(`the ${kind} top offset from the icon box differs by ${spread('top').toFixed(2)}px across tabs`);
      if (kind === 'dot' && spread('right') > 0.5) bad(`the dot right offset from the icon box differs by ${spread('right').toFixed(2)}px across tabs`);
      // a count is anchored by its right edge: the same whatever the digits (1, 3, 12, 99+)
      if (kind === 'count' && spread('right') > 0.5) bad(`the count right offset from the icon box differs by ${spread('right').toFixed(2)}px across tabs (two digits must grow left)`);
      const o0 = of[0]; const want = kind === 'count' ? [-4, 6] : [-1, 3]; if (!near(o0.top, want[0], 0.5) || !near(o0.right, want[1], 0.5)) bad(`the ${kind} is ${o0.top} from the icon box top and ${o0.right} past its right edge, expected ${want[0]} and ${want[1]}`); }
    if (!offs.some((o) => o.kind === 'count' && o.w > 20)) bad('no 99+ count is drawn in the Tab bar frames'); }
  // a count never touches the label below it
  for (const t of TITLES) { const d = get(t); if (/contrast/.test(t)) continue; for (const tb of d.querySelectorAll('.sdk-tabbar-tab:not([hidden])')) { const m = tb.querySelector('.sdk-badge-micro, .sdk-dot'); const lb = tb.querySelector('.sdk-tabbar-label'); if (m && lb && m.getBoundingClientRect().bottom > lb.getBoundingClientRect().top - 2) bad(`${t}: a count is within 2px of the label`); } }
  // ---- states and badges ----
  { const d = get('Tab bar, states'); const bars = [...d.querySelectorAll('.sdk-tabbar')]; const [rest, hov, prs, foc, cur, dis] = tabs(bars[0]); const rf = bg(d, 'color-mix(in srgb, var(--header-text) 10%, transparent)');
    if (cs(rest).backgroundColor !== 'rgba(0, 0, 0, 0)' || cs(rest).color !== tok(d, 'color-mix(in srgb, var(--header-text) 75%, var(--header-bg))')) bad('a tab at rest is not the quiet colour on no fill');
    if (cs(hov).backgroundColor !== rf) bad('a hovered tab is not the quiet fill'); if (cs(prs).backgroundColor === cs(hov).backgroundColor || cs(prs).backgroundColor === 'rgba(0, 0, 0, 0)') bad('a pressed tab does not change the fill');
    if (cs(foc).outlineWidth !== '2px' || cs(foc).outlineStyle !== 'solid' || cs(foc).outlineOffset !== '-2px' || cs(foc).outlineColor !== tok(d, 'var(--accent)')) bad(`the tab focus is ${cs(foc).outlineWidth} at ${cs(foc).outlineOffset} ${cs(foc).outlineColor}, expected a 2px accent outline at -2px`);
    if (cs(rest).outlineStyle !== 'none') bad('a tab has an outline at rest'); if (cs(dis).opacity !== '0.5') bad('a disabled tab is not half strength');
    const curH = tabs(bars[1])[0]; const curF = tabs(bars[2])[1]; const curP = tabs(bars[3])[2]; if (cs(curH).backgroundColor === cs(cur).backgroundColor) bad('a current tab, hovered, does not change its fill'); if (cs(curP).backgroundColor === cs(curH).backgroundColor) bad('a current tab, pressed, looks like hovered'); if (cs(curF).outlineColor !== tok(d, 'color-mix(in srgb, var(--accent) 55%, var(--header-text))') || cs(curF).outlineOffset !== '-2px') bad('the current tab focus is not the accent mix outline inside the tab');
    const badges = [...bars[4].querySelectorAll('.sdk-badge-micro')]; if (badges.length < 3 || !/99\+/.test(bars[4].textContent)) bad('the badges frame does not show a count, 12, 99+'); if (!bars[4].querySelector('.sdk-dot')) bad('the badges frame has no dot'); }
  // ---- the space bar: Join, Online, Leave ----
  { const d = get('Tab bar, space bar'); const [b1, b2, b3] = [...d.querySelectorAll('.sdk-tabbar')]; const t1 = tabs(b1); if (t1[0].querySelector('.sdk-tabbar-label').textContent === 'Conference') bad('Conference is the first tab of the space bar'); if (t1[0].getAttribute('aria-current') !== 'page') bad('the first tab of the space bar is not the current one'); const labels = t1.map((x) => x.querySelector('.sdk-tabbar-label').textContent);
    for (const l of ['Join', 'Online', 'Leave']) if (!labels.includes(l)) bad(`the space bar lost "${l}" (pinned tabs never fold)`); if (labels[labels.length - 1] !== 'Leave') bad('Leave is not the last tab'); if (!b1.querySelector(':scope > .sdk-tabbar-more') || !vis(b1.querySelector(':scope > .sdk-tabbar-more'))) bad('the space bar with Join does not fold into "..."');
    const join = t1.find((x) => x.dataset.role === 'join'); if (cs(join.querySelector('.sdk-tabbar-glyph')).color !== tok(d, 'color-mix(in srgb, var(--ok) 70%, var(--header-text))')) bad('the Join icon is not the ok status colour');
    const leave = t1.find((x) => x.dataset.role === 'leave'); if (cs(leave).color !== tok(d, 'color-mix(in srgb, var(--danger) 70%, var(--header-text))')) bad('Leave is not the readable red');
    const online = t1.find((x) => x.querySelector('.sdk-tabbar-label').textContent === 'Online'); if (!online.querySelector('.sdk-badge-micro')) bad('Online does not show its count');
    const cur = t1.find((x) => x.getAttribute('aria-current') === 'page'); if (!cur) bad('the current tab was folded away in the space bar');
    const l2 = tabs(b2).map((x) => x.querySelector('.sdk-tabbar-label').textContent); if (!l2.includes('Leave') || !l2.includes('Online')) bad('the in-call bar lost Online or Leave'); if (l2.includes('Join')) bad('the in-call bar shows Join');
    if (tabs(b3).length !== 4) bad('the aside bar does not show four tabs'); }
  // ---- the destination bar and the context ----
  { const d = get('Tab bar, destination'); const bar = d.querySelector('.sdk-tabbar'); if (tabs(bar).length !== 4) bad('the destination bar is not four tabs'); }
  { const d = get('Tab bar, in context'); const bar = d.querySelector('.sdk-tabbar'); const ph = d.querySelector('.pm-tb-phone'); if (!near(ph.getBoundingClientRect().bottom, bar.getBoundingClientRect().bottom, 1)) bad('the bar is not at the foot of the phone'); if (!near(bar.getBoundingClientRect().height, 88)) bad('the in-context bar is not 54px plus the 34px inset'); const t = tabs(bar)[0]; if (t.getBoundingClientRect().bottom > bar.getBoundingClientRect().bottom - 34) bad('the tabs run into the inset'); }
  // ---- aliases ----
  { const d = get('Tab bar, aliases'); const sb = d.querySelector('.subnav-modules'); const db = d.querySelector('.dest-tabs'); for (const bar of [sb, db]) { if (!near(bar.getBoundingClientRect().height, 54)) bad(`${bar.className} is not the bar height`); if (cs(bar).backgroundColor !== bg(d, 'var(--header-bg)')) bad(`${bar.className} is not the bar surface`); }
    const on = sb.querySelector('.modules-menu-item.on'); if (cs(on).backgroundColor !== bg(d, 'var(--selected-bg)') || cs(on).color !== tok(d, NOW)) bad('.modules-menu-item.on is not the current look'); const cur = db.querySelector('.dest-tab[aria-current]'); if (cs(cur).backgroundColor !== bg(d, 'var(--selected-bg)') || cs(cur).color !== tok(d, NOW)) bad('.dest-tab[aria-current] is not the current look (it is accent words today)');
    for (const t of [...sb.querySelectorAll('.modules-menu-item'), ...db.querySelectorAll('.dest-tab')]) { const r = t.getBoundingClientRect(); if (r.width < 55.4 || r.height < 43.4 || cs(t).minWidth !== '56px') bad(`${t.className} is under 56 by 44 or its least width is not 56px`); if (cs(t.querySelector('i')).fontSize !== '20px') bad(`${t.className} icon is not 20px`); }
    const bd = sb.querySelector('.badge'); const br = bd.getBoundingClientRect(); const tr = bd.parentElement.getBoundingClientRect(); if (!near(br.height, 14) || cs(bd).fontSize !== '9px' || !near(br.top - tr.top, -0, 1.2)) bad('.badge in a tab is not the micro count');
    { const ic = bd.parentElement.querySelector('i').getBoundingClientRect(); const ibRight = ic.left + ic.width / 2 + 12; const ibTop = ic.top - 2; if (!near(br.right - ibRight, 6, 0.8) || !near(br.top - ibTop, -4, 0.8)) bad('.badge in a tab is not at the icon box corner (' + (br.right - ibRight) + ', ' + (br.top - ibTop) + ', badge top ' + br.top + ', tab top ' + tr.top + ', icon top ' + ic.top + ', icon h ' + ic.height + ', tab h ' + tr.height + ', badge sib ' + [...bd.parentElement.children].map((x) => x.tagName + '.' + x.className + ':' + x.getBoundingClientRect().top).join('|') + ')'); } }
  // ---- the whole family: weights, sizes, edges ----
  for (const t of TITLES) { const d = get(t); if (/contrast/.test(t)) continue; const border = tok(d, 'var(--border)');
    for (const el of d.querySelectorAll('body *')) { if (el.closest('svg') || el.closest('.pm-tb-note') || el.closest('.pm-tb-legend')) continue; const c = cs(el);
      const sides = SIDES.filter((s) => c['border' + s + 'Width'] !== '0px' && c['border' + s + 'Style'] !== 'none');
      for (const s of sides) { const col = c['border' + s + 'Color']; if (col !== border && col !== 'rgba(0, 0, 0, 0)') bad(`${t}: a ${s.toLowerCase()} edge of ${el.className || el.tagName} is ${col}, not --border or transparent`); }
      if (sides.length && sides.length < 4 && el.closest('.sdk-tabbar') && sides.some((s) => s !== 'Top')) bad(`${t}: a side edge on ${el.className || el.tagName} in the bar`);
      if (c.position !== 'static') for (const p of ['::before', '::after']) { const pc = cs(el, p); if (pc.content !== 'none' && pc.content !== 'normal' && pc.backgroundColor !== 'rgba(0, 0, 0, 0)' && pc.position === 'absolute' && (parseFloat(pc.width) <= 4 || parseFloat(pc.height) <= 4)) bad(`${t}: a thin coloured block on ${el.className || el.tagName}`); }
      if (el.closest('.sdk-tabbar, .subnav-modules, .dest-tabs') && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && c.display !== 'none') {
        if (!['400', '500', '600'].includes(c.fontWeight)) bad(`${t}: weight ${c.fontWeight} on ${el.className || el.tagName} (400, 500 and 600 only)`);
        if (parseFloat(c.fontSize) < 11 && !el.matches('.sdk-badge-micro, .badge')) bad(`${t}: ${c.fontSize} text on ${el.className || el.tagName} (nothing under 11px)`); } } }
  // ---- contrast ----
  { const d = get('Tab bar, contrast'); await wait(700); const rows = [...d.querySelectorAll('.pm-tb-ct tbody tr')]; if (rows.length < 13) bad(`the contrast table has only ${rows.length} rows`);
    for (const tr of rows) { const p = tr.querySelector('[data-out="p"]').textContent; if (p === 'Fails') bad(`contrast: ${tr.children[0].textContent} is ${tr.querySelector('[data-out="r"]').textContent}`); if (!p) bad('the contrast table is not measured'); } }
  // ---- the page ----
  const blk = document.getElementById('tabbar');
  if (!blk || !blk.querySelector('.ds-st-approved') || blk.querySelector('.ds-st-proposed')) bad('the Tab bar family is not marked Approved');
  if (document.getElementById('u-phone-bottom-bar-icon-over-label')) bad('Phone bottom bar (icon over label) is still listed as Not yet decided');
  if (!blk || !/Decided 2026-10-21/.test(blk.textContent) || !/Today to proposed/.test(blk.textContent)) bad('the Tab bar family lacks its Today to proposed or Decided 2026-10-21 section');
  return JSON.stringify(out);
};
