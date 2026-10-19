/*
 * check-design-system-tabs.mjs -- the Tabs and view switches family of the proposed design system page (public/design-system/proposed-tabs.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: tabs not 38px (44px at 390), small not 30px, an icon-only tab not square, any edge not 1px transparent in any state (no coloured border, no underline,
 * no bar), the selected fill not equal to the --selected-bg token with the accent-mix text, the focus not a 2px outline at offset -2px (all four sides the same at
 * 1.25x and 1.5x), a strip that overflows without scrolling, with its scrollbar showing, or without keeping the selected tab in view by a press and by the arrow
 * keys, the joined switch not 2px apart and icons only (word kept as the title and name) at 390, a small tab on a phone without 30px and a 44px hit area, the
 * ink of a label, an icon and label and an icon more than 1px off the middle (4x, Figtree and its fallback), the top bar fold, a kept name that is not an
 * alias, the family not marked Approved with its date; in the stylesheet: a tabs rule that draws an edge on one side, an underline or an inset shadow, a tabs
 * name that is not defined.
 */
export const id = 'tabs';
export const todayOnly = [];

export function staticChecks({ fail, css, defined }) {
  // No underline, no bar on one side, every kept name defined as an alias, the new names defined.
  const tabsCss = css.slice(css.indexOf('.sdk-tabs'));
  if (/border-(left|right|top|bottom)\s*:/.test(tabsCss.replace(/\.ds-proposed input[^{]*\{[^}]*\}/g, ''))) fail('proposed-tabs.css: the tabs rules draw an edge on one side (no underline bar, no left bar)');
  if (/text-decoration\s*:\s*underline/.test(tabsCss)) fail('proposed-tabs.css: the tabs rules underline something');
  if (/inset\s*\)|inset 0|box-shadow\s*:\s*inset/.test(tabsCss)) fail('proposed-tabs.css: the tabs rules draw an inset shadow (a bar)');
  for (const c of ['sdk-tabs', 'sdk-tab', 'sdk-tab-glyph', 'sdk-tab-word', 'sdk-tab-badge', 'sdk-tab-dot', 'sdk-tab-icon', 'sdk-tabs-small', 'sdk-tabs-joined', 'sdk-tabs-bar', 'sdk-tabs-compact',
    'tb-tabs', 'tb-tab', 'tb-tab-glyph', 'tb-tab-word', 'tb-tab-icon', 'tb-tabs-compact', 'subtabs', 'subtab', 'setup-tabs', 'setup-tab', 'setup-tab-dot', 'layout-tabs', 'core-link', 'badge']) {
    if (!defined.has(c)) fail(`the proposed stylesheets do not define the tabs name .${c} (a new name or a kept alias)`);
  }
}

export async function browserChecks(b) {
  const { ev, cdp, sessionId, sc, where, problems, inkCentre, edgeColours } = b;
  // The Tabs and view switches family.
  { const tp = JSON.parse(await ev(`(${tabsProbe.toString()})()`)); for (const x of tp.problems) problems.push(`${where}: ${x}`);
    // The ink of a label, an icon and label, an icon alone: within 1px of the middle of the tab, by a 4x screenshot, in Figtree and in its fallback face.
    for (const face of ['figtree', 'fallback']) {
      await ev(`(() => { for (const t of ['Tabs, all states', 'Tabs, all states, small']) { const d = window.__ds.frames.find((f) => f.iframe.title === t).iframe.contentDocument; let st = d.getElementById('ds-face'); if (!st) { st = d.createElement('style'); st.id = 'ds-face'; d.head.appendChild(st); } st.textContent = ${JSON.stringify(face === 'fallback' ? '.ds-proposed .sdk-tab { font-family: "Figtree Fallback", Arial, sans-serif !important; }' : '')}; } })()`);
      await new Promise((r) => setTimeout(r, 400));
      for (const title of ['Tabs, all states', 'Tabs, all states, small']) {
        for (const [r, nm] of [[0, 'label'], [1, 'icon and label'], [2, 'icon alone']]) for (const col of [0, 3]) {
          const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === ${JSON.stringify(title)}); const el = m.iframe.contentDocument.querySelectorAll('.pm-row')[${r}].querySelectorAll('.dsf-state')[${col}].querySelector('.sdk-tab'); el.scrollIntoView({ block: 'center', behavior: 'instant' }); await new Promise((r) => setTimeout(r, 120)); m.iframe.style.position = 'relative'; m.iframe.style.top = '0px'; let b = el.getBoundingClientRect(); let fr = m.iframe.getBoundingClientRect(); const fy = fr.top + window.scrollY; /* the frame's own origin: a frame that starts between two device pixels is painted snapped, so its ink moves up to a pixel against the box; it is moved to a whole pixel here (position only) */ const frac = fy - Math.floor(fy); if (frac > 0.01) { m.iframe.style.top = (1 - frac) + 'px'; await new Promise((r) => setTimeout(r, 120)); b = el.getBoundingClientRect(); fr = m.iframe.getBoundingClientRect(); } return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height }); })()`));
          const shotT = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x, y: at.y, width: at.w, height: at.h, scale: 4 } }, sessionId);
          const c = inkCentre(Buffer.from(shotT.data, 'base64'), 4, 10);
          if (c === null) problems.push(`${where}: no ink found in the ${nm} tab (${title}, ${col ? 'selected' : 'rest'}, ${face})`);
          else if (Math.abs(c) > 1.01) problems.push(`${where}: the ${nm} tab is ${Math.abs(c).toFixed(2)}px ${c > 0 ? 'low' : 'high'} of the middle of its box (${title}, ${col ? 'selected' : 'rest'}, ${face})`);
        }
      }
    }
    await ev(`(() => { for (const f of window.__ds.frames) { f.iframe.style.top = ''; f.iframe.style.position = ''; const s = f.iframe.contentDocument && f.iframe.contentDocument.getElementById('ds-face'); if (s) s.remove(); } })()`);
    // The focus outline of a tab, rest and selected: all four sides the same at a fractional device pixel ratio and page offset (the Fields' method).
    if (sc.width >= 500) {
      for (const dsf of [1.25, 1.5]) {
        await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: dsf, mobile: false }, sessionId);
        await new Promise((r) => setTimeout(r, 400));
        for (const [nm, idx] of [['focused', 2], ['selected and focused', 5]]) {
          for (const nudge of [0.3, 0.7]) {
            const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Tabs, all states'); const d = m.iframe.contentDocument; const el = d.querySelectorAll('.pm-row')[0].querySelectorAll('.dsf-state')[${idx}].querySelector('.sdk-tab'); el.scrollIntoView({ block: 'center', behavior: 'instant' });
              const c = document.getElementById('ds-content'); c.style.marginTop = '${nudge}px'; c.style.marginLeft = '${nudge * 1.7 % 1}px'; window.scrollTo(0, Math.round(window.scrollY) + ${nudge}); await new Promise((r) => setTimeout(r, 150));
              const cv = document.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = getComputedStyle(el).outlineColor; g.fillRect(0, 0, 1, 1); const px = g.getImageData(0, 0, 1, 1).data;
              const b = el.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height, col: 'rgb(' + px[0] + ',' + px[1] + ',' + px[2] + ')' }); })()`));
            const pad = 6;
            const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x - pad, y: at.y - pad, width: at.w + pad * 2, height: at.h + pad * 2, scale: 1 } }, sessionId);
            const e = edgeColours(Buffer.from(shot.data, 'base64'), at.col.match(/[\d.]+/g).map(Number), dsf, pad, at.w, at.h);
            const vals = Object.values(e);
            if (Math.max(...vals) - Math.min(...vals) > 40) problems.push(`${where}: the ${nm} tab outline is not the same on all four sides at ${dsf}x with the page ${nudge}px off the pixel grid (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
            if (Math.max(...vals) > 60) problems.push(`${where}: a side of the ${nm} tab outline never reaches its full colour at ${dsf}x (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
          }
        }
        await ev(`(() => { const c = document.getElementById('ds-content'); c.style.marginTop = ''; c.style.marginLeft = ''; })()`);
      }
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
      await new Promise((r) => setTimeout(r, 300));
    }
  }
}

// The Tabs and view switches family, measured in the page (runs in the browser): heights, the selected fill, no coloured edge, the focus, the
// overflow (the selected tab kept in view, with a press and with the keyboard), icons only when narrow, the hit area on a phone, the aliases.
const tabsProbe = async () => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^Tabs/.test(t) && !/contrast/.test(t));
  const RADII = /^(3px|5px|7px|11px|999px)$/;
  const tok = (d, n, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = n; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const selTok = (d) => tok(d, 'var(--selected-bg)', 'backgroundColor');
  const mixTok = (d) => tok(d, 'color-mix(in srgb, var(--accent) 55%, var(--text))');
  const stripOk = (s, t, nm) => { const a = s.getBoundingClientRect(); const b = t.getBoundingClientRect(); if (b.left < a.left - 0.5 || b.right > a.right + 0.5) bad(`${nm}: the selected tab ${t.textContent.trim()} is not fully in view (tab ${b.left.toFixed(0)}..${b.right.toFixed(0)}, strip ${a.left.toFixed(0)}..${a.right.toFixed(0)})`); };
  const inWidthSelector = (d) => d.defaultView.innerWidth;
  if (TITLES.length < 12) bad(`the Tabs family has only ${TITLES.length} frames`);
  // Every tab of every frame: a 1px transparent edge in every state, a token radius, no outline at rest, no underline, weight 500 (4.. except the bar's nav type).
  for (const t of TITLES) {
    const d = get(t); if (!d) { bad(`no frame ${t}`); continue; }
    for (const el of d.querySelectorAll('.sdk-tabs > :is(.sdk-tab, .tb-tab, .subtab, .setup-tab, .core-link), .tb-tabs > .tb-tab, .subtabs > .subtab, .setup-tabs > .setup-tab, .layout-tabs > .core-link')) {
      const cs = getComputedStyle(el); const nm = `${t}: ${el.textContent.trim() || el.getAttribute('aria-label')}`;
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) { if (cs['border' + side + 'Color'] !== 'rgba(0, 0, 0, 0)' || (cs['border' + side + 'Width'] !== '1px' && t !== 'Tabs, anatomy sample')) bad(`${nm}: the ${side.toLowerCase()} edge is ${cs['border' + side + 'Width']} ${cs['border' + side + 'Color']}, not a 1px transparent edge`); }
      for (const c of ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight']) if (!RADII.test(cs['border' + c + 'Radius'])) bad(`${nm}: a corner is ${cs['border' + c + 'Radius']}, not a radius token`);
      if (!el.classList.contains('ds-force-focus') && cs.outlineStyle !== 'none') bad(`${nm}: an outline at rest (${cs.outlineStyle})`);
      if (cs.textDecorationLine !== 'none') bad(`${nm}: underlined`);
      if (cs.boxShadow !== 'none') bad(`${nm}: a shadow (${cs.boxShadow})`);
    }
  }
  // Heights: default 38 (44 on a phone), small 30, an icon-only tab square.
  { const d = get('Tabs, all states'); const dd = get('Tabs, all states, small'); const phone = d.defaultView.innerWidth <= 640; const want = phone ? 44 : 38;
    for (const el of d.querySelectorAll('.sdk-tab')) { const r = el.getBoundingClientRect(); if (Math.abs(r.height - want) > 0.6) bad(`a default tab is ${r.height}px, expected ${want}`); if (el.classList.contains('sdk-tab-icon') && Math.abs(r.width - want) > 0.6) bad(`an icon-only default tab is ${r.width} wide, expected ${want}`); }
    for (const el of dd.querySelectorAll('.sdk-tab')) { const r = el.getBoundingClientRect(); if (Math.abs(r.height - 30) > 0.6) bad(`a small tab is ${r.height}px, expected 30`); if (el.classList.contains('sdk-tab-icon') && Math.abs(r.width - 30) > 0.6) bad(`an icon-only small tab is ${r.width} wide, expected 30`); }
    // States, in both grids.
    for (const [dx, nm] of [[d, 'default'], [dd, 'small']]) {
      const rows = [...dx.querySelectorAll('.pm-row')]; const cell = (r, s) => rows[r].querySelectorAll('.dsf-state')[s].querySelector('.sdk-tab'); const cs = (x) => getComputedStyle(x);
      const [rest, hov, foc, sel, selHov, selFoc, dis] = [0, 1, 2, 3, 4, 5, 6].map((s) => cell(0, s));
      if (cs(rest).backgroundColor !== 'rgba(0, 0, 0, 0)') bad(`${nm}: a tab at rest has a fill (${cs(rest).backgroundColor})`);
      if (cs(hov).backgroundColor === cs(rest).backgroundColor) bad(`${nm}: the forced hover does not change the fill`);
      if (!/^2px solid/.test(`${cs(foc).outlineWidth} ${cs(foc).outlineStyle}`) || cs(foc).outlineOffset !== '-2px') bad(`${nm}: the focus is not a 2px outline at offset -2px (${cs(foc).outlineWidth} ${cs(foc).outlineStyle} ${cs(foc).outlineOffset})`);
      if (cs(foc).outlineColor !== tok(dx, 'var(--accent)')) bad(`${nm}: the focus outline is not --accent (${cs(foc).outlineColor})`);
      if (cs(sel).backgroundColor !== selTok(dx)) bad(`${nm}: the selected fill is ${cs(sel).backgroundColor}, not --selected-bg (${selTok(dx)})`);
      if (cs(sel).color !== mixTok(dx)) bad(`${nm}: the selected text is ${cs(sel).color}, not the accent mix (${mixTok(dx)})`);
      if (cs(selHov).backgroundColor === cs(sel).backgroundColor) bad(`${nm}: the forced selected hover does not change the fill`);
      if (cs(selFoc).outlineStyle !== 'solid' || cs(selFoc).outlineWidth !== '2px') bad(`${nm}: the selected focus shows no 2px outline`);
      if (cs(dis).opacity !== '0.5') bad(`${nm}: disabled is not half strength (${cs(dis).opacity})`);
      if (cs(sel).fontWeight !== cs(rest).fontWeight) bad(`${nm}: the weight changes when selected (${cs(rest).fontWeight} to ${cs(sel).fontWeight})`);
      // A selected tab is the same box as a rest tab.
      const a = rest.getBoundingClientRect(); const b = sel.getBoundingClientRect(); if (Math.abs(a.height - b.height) > 0.1) bad(`${nm}: a selected tab is not the height of a tab at rest`);
      // Icon-only count and dot: clear of the tab's top and right edges (3px or more, equal), inside the box, icon still centred, tab size unchanged.
      for (const [r, kind] of [[5, '.sdk-tab-badge'], [6, '.sdk-tab-dot']]) for (let s = 0; s < 7; s += 1) {
        const tb = cell(r, s); const mk = tb.querySelector(kind); const g = tb.querySelector('.sdk-tab-glyph'); if (!mk || !g) { bad(`${nm}: icon-only ${kind} row, state ${s}: missing`); continue; }
        const T = tb.getBoundingClientRect(); const M = mk.getBoundingClientRect(); const G = g.getBoundingClientRect();
        const top = M.top - T.top; const right = T.right - M.right;
        if (top < 2.95 || right < 2.95) bad(`${nm}: the icon-only ${kind} is ${top.toFixed(1)}px from the top and ${right.toFixed(1)}px from the right edge, under 3px (state ${s})`);
        if (Math.abs(top - right) > 0.6 && kind === '.sdk-tab-badge') bad(`${nm}: the icon-only count insets differ (top ${top}, right ${right})`);
        if (M.bottom > T.bottom - 2.95 || M.left < T.left) bad(`${nm}: the icon-only ${kind} is not inside the tab (state ${s})`);
        if (Math.abs((G.left + G.right) / 2 - (T.left + T.right) / 2) > 0.6) bad(`${nm}: an icon-only tab's icon is off the middle (state ${s})`);
        if (Math.abs(T.width - T.height) > 0.6) bad(`${nm}: an icon-only tab with a ${kind} is not square (${T.width} by ${T.height})`);
      }
      // Count and dot.
      const badge = rows[3].querySelector('.sdk-tab-badge'); if (!badge || Math.abs(badge.getBoundingClientRect().height - 18) > 0.6) bad(`${nm}: the count is not an 18px pill`);
      const dot = rows[4].querySelector('.sdk-tab-dot'); if (!dot || Math.abs(dot.getBoundingClientRect().width - 7) > 0.6 || Math.abs(dot.getBoundingClientRect().height - 7) > 0.6) bad(`${nm}: the dot is not 7px`);
    }
  }
  // Aliases: today's markup takes the look. Heights: view switch and the bar's tabs small, a page's folder tabs and Set up's tabs default.
  { const d = get('Tabs, aliases'); const want = d.defaultView.innerWidth <= 640 ? 44 : 38; const cs = (x) => getComputedStyle(x);
    const sets = [['.tb-tabs:not(.tb-tabs-compact) .tb-tab', 30], ['.tb-tabs-compact .tb-tab', 30], ['.subtabs .subtab', want], ['.setup-tabs .setup-tab', want], ['.layout-tabs .core-link', 30]];
    for (const [sel, h] of sets) { const els = d.querySelectorAll(sel); if (!els.length) bad(`aliases: nothing for ${sel}`); for (const el of els) if (Math.abs(el.getBoundingClientRect().height - h) > 0.6) bad(`aliases: ${sel} is ${el.getBoundingClientRect().height}px, expected ${h}`); }
    for (const sel of ['.tb-tab.on', '.subtab.active', '.setup-tab[aria-selected="true"]', '.core-link[aria-current="page"]']) { const el = d.querySelector(sel); if (!el) { bad(`aliases: no ${sel}`); continue; } if (cs(el).backgroundColor !== selTok(d)) bad(`aliases: ${sel} is not the --selected-bg fill (${cs(el).backgroundColor})`); if (cs(el).color !== mixTok(d) && !/layout-tabs/.test(sel) && !/core-link/.test(sel)) bad(`aliases: ${sel} text is not the accent mix (${cs(el).color})`); }
    const tabsEl = d.querySelector('.tb-tabs'); const kids = [...tabsEl.children]; const gap = kids[1].getBoundingClientRect().left - kids[0].getBoundingClientRect().right; if (Math.abs(gap - 2) > 0.6) bad(`aliases: the view switch tabs are ${gap}px apart, expected 2`);
    const sb = d.querySelector('.subtabs'); const gk = [...sb.children]; const g2 = gk[1].getBoundingClientRect().left - gk[0].getBoundingClientRect().right; if (Math.abs(g2 - 6) > 0.6) bad(`aliases: the strip tabs are ${g2}px apart, expected 6`);
    if (cs(sb).borderBottomWidth !== '0px') bad('aliases: the old folder-tab rule under .subtabs is still drawn');
  }
  // Overflow: the strip scrolls, hides its scrollbar and keeps the selected tab in view, by a press and by the keyboard.
  for (const [title, idx] of [['Tabs, strip that overflows', 0], ['Tabs, strip that overflows', 1], ['Tabs, strip that overflows', 2], ['Tabs at 390', 0]]) {
    const d = get(title); const strips = [...d.querySelectorAll('.sdk-tabs[data-demo]')]; const s = strips[idx]; if (!s) { bad(`${title}: no strip ${idx}`); continue; }
    const nm = `${title}, strip ${idx + 1}`; await wait(100);
    if (s.scrollWidth <= s.clientWidth + 1) { bad(`${nm}: does not overflow, so it cannot be tested (${s.scrollWidth} in ${s.clientWidth})`); continue; }
    if (getComputedStyle(s).scrollbarWidth !== 'none') bad(`${nm}: the scrollbar is not hidden`);
    if (!/^(auto|scroll)$/.test(getComputedStyle(s).overflowX)) bad(`${nm}: does not scroll sideways`);
    const tabsEls = [...s.querySelectorAll(':scope > .sdk-tab')];
    if (idx < 2 || title === 'Tabs at 390') { /* the selected tab starts deep in the list */ }
    stripOk(s, s.querySelector(':scope > .sdk-tab[aria-selected="true"], :scope > .sdk-tab[aria-current="page"]'), `${nm} at the start`);
    if (!(s.scrollLeft > 0)) bad(`${nm}: the selected tab is deep in the list but the strip did not scroll (scrollLeft ${s.scrollLeft})`);
    tabsEls[0].click(); await wait(120); stripOk(s, tabsEls[0], `${nm} after the first tab is pressed`);
    if (!tabsEls[0].matches('[aria-selected="true"], [aria-current="page"]')) bad(`${nm}: pressing the first tab does not select it`);
    tabsEls[tabsEls.length - 1].click(); await wait(120); stripOk(s, tabsEls[tabsEls.length - 1], `${nm} after the last tab is pressed`);
    if (!(s.scrollLeft > 0)) bad(`${nm}: after the last tab is pressed the strip is still at the start`);
    if (s.getAttribute('role') === 'tablist') {
      tabsEls[0].click(); await wait(80); tabsEls[0].focus();
      for (let i = 0; i < tabsEls.length - 1; i += 1) { d.activeElement.dispatchEvent(new d.defaultView.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })); await wait(20); }
      await wait(120); if (d.activeElement !== tabsEls[tabsEls.length - 1]) bad(`${nm}: the arrow keys do not reach the last tab (focus is on ${d.activeElement.textContent.trim()})`); stripOk(s, tabsEls[tabsEls.length - 1], `${nm} after the arrow keys`);
      d.activeElement.dispatchEvent(new d.defaultView.KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })); await wait(120); stripOk(s, tabsEls[0], `${nm} after Home`);
      const stops = tabsEls.filter((x) => x.tabIndex === 0).length; if (stops !== 1) bad(`${nm}: a tab list has ${stops} tab stops, expected 1`);
    }
    // Restore a deep selection for the screenshots.
    tabsEls[tabsEls.length > 10 ? 10 : tabsEls.length - 1].click(); await wait(120);
  }
  // The edge fade: only on the side that has more.
  { const d = get('Tabs, strip that overflows'); const s = d.querySelectorAll('.sdk-tabs[data-demo]')[1]; const f = s.getAttribute('data-fade') || ''; if (!/\bstart\b/.test(f)) bad(`the faded strip has no fade at its start while scrolled (data-fade="${f}")`); s.scrollLeft = s.scrollWidth; await wait(120); const f2 = s.getAttribute('data-fade') || ''; if (/\bend\b/.test(f2)) bad(`the faded strip still fades its end at the end (data-fade="${f2}")`); s.scrollLeft = 0; await wait(120); const f3 = s.getAttribute('data-fade') || ''; if (/\bstart\b/.test(f3) || !/\bend\b/.test(f3)) bad(`the faded strip at its start should fade its end only (data-fade="${f3}")`); const t = s.querySelector('[aria-selected="true"]'); t.click(); await wait(120); }
  // The joined switch: 2px gaps, icons only when narrow with the word as title and name; words when wide.
  for (const w of [390, 700, 1280]) {
    const d = get(`Tabs at ${w}`); if (!d) { bad(`no frame Tabs at ${w}`); continue; } await wait(150);
    const boxes = [...d.querySelectorAll('[data-fit-box]')]; const g0 = boxes[0].querySelector('.sdk-tabs-joined'); const compact = g0.classList.contains('sdk-tabs-compact');
    const words = [...g0.querySelectorAll('.sdk-tab-word')]; const hidden = words.every((x) => getComputedStyle(x).display === 'none'); const shown = words.every((x) => getComputedStyle(x).display !== 'none');
    if (w === 390 && !(compact && hidden)) bad(`Tabs at 390: the switch did not drop to icons only (compact ${compact}, words hidden ${hidden})`);
    if (w === 1280 && !(!compact && shown)) bad(`Tabs at 1280: the switch dropped to icons although it fits (compact ${compact})`);
    if (compact) for (const b of g0.querySelectorAll('.sdk-tab')) { const nm = b.querySelector('.sdk-tab-word').textContent.trim(); if (b.getAttribute('aria-label') !== nm || b.title !== nm) bad(`Tabs at ${w}: an icon-only tab has no word as its title and name (${b.getAttribute('aria-label')}, ${b.title})`); }
    if (box0Overflow(boxes[0])) bad(`Tabs at ${w}: the toolbar overflows even with icons only`);
    // Heights line up: 38 beside default buttons and the search; 30 in the dense toolbar.
    const want = w <= 640 ? 44 : 38; const r = (x) => x.getBoundingClientRect().height;
    for (const x of [boxes[0].querySelector('.btn'), boxes[0].querySelector('.sdk-search input'), ...boxes[0].querySelectorAll('.sdk-tab')]) if (Math.abs(r(x) - want) > 0.6) bad(`Tabs at ${w}: the 38px toolbar has a ${r(x)}px item (${x.className}), expected ${want}`);
    for (const x of [boxes[1].querySelector('.btn'), ...boxes[1].querySelectorAll('.sdk-tab')]) if (Math.abs(r(x) - 30) > 0.6) bad(`Tabs at ${w}: the 30px toolbar has a ${r(x)}px item (${x.className}), expected 30`);
    const kids = [...g0.children]; const gap = kids[1].getBoundingClientRect().left - kids[0].getBoundingClientRect().right; if (Math.abs(gap - 2) > 0.6) bad(`Tabs at ${w}: the joined tabs are ${gap}px apart, expected 2`);
  }
  function box0Overflow(b) { return b.scrollWidth > b.clientWidth + 1; }
  // A phone: default 44; small keeps 30 with a 44px hit area (the strip is 44px high and the tab's ::after is 44px).
  { const d = get('Tabs, on a phone'); const strips = [...d.querySelectorAll('.sdk-tabs')]; const [def, small] = strips; const cs = (x, p) => getComputedStyle(x, p);
    if (d.defaultView.innerWidth > 640) bad('the phone frame is wider than a phone');
    if (Math.abs(def.querySelector('.sdk-tab').getBoundingClientRect().height - 44) > 0.6) bad('a default tab on a phone is not 44px');
    const t = small.querySelector('.sdk-tab'); if (Math.abs(t.getBoundingClientRect().height - 30) > 0.6) bad('a small tab on a phone does not keep its 30px look');
    if (Math.abs(small.getBoundingClientRect().height - 44) > 0.6) bad(`a small strip on a phone is ${small.getBoundingClientRect().height}px high, expected 44`);
    const a = cs(t, '::after'); if (a.content === 'none' || Math.abs(parseFloat(a.height) - 44) > 1) bad(`a small tab on a phone has no 44px hit area (${a.content}, ${a.height})`);
    const hit = d.elementFromPoint(t.getBoundingClientRect().left + 10, t.getBoundingClientRect().top - 5); if (!hit || hit.closest('.sdk-tab') !== t) bad('a press 5px above a small tab on a phone does not reach it');
  }
  // The top bar fold: a "..." button after the shown tabs, the Workspace and the shown tab kept.
  { const d = get('Tabs, top bar fold'); const bars = [...d.querySelectorAll('.pm-hdr')]; if (bars.length !== 3) bad('the fold frame does not show three bars'); else {
      const more = bars.map((b) => !!b.querySelector('.sdk-more')); if (more.join() !== 'false,true,true') bad(`the fold frame shows the "..." in ${more.join()}`);
      const last = bars[2]; if (!last.querySelector('[aria-current="page"]') || !/Workspace/.test(last.querySelector('.sdk-tab').textContent)) bad('the tightest bar lost Workspace or the tab shown');
      const m = last.querySelector('.sdk-more'); if (Math.abs(m.getBoundingClientRect().height - 30) > 0.6) bad('the "..." is not 30px'); } }
  // The page: the family is Proposed, dated, and the two not-yet-decided families are named.
  const doc = document; const blk = doc.getElementById('tabs');
  if (!blk || !blk.querySelector('.ds-st-approved') || blk.querySelector('.ds-st-proposed')) bad('the Tabs family is not marked Approved');
  if (!blk || !/Decided 2026-10-18/.test(blk.textContent)) bad('the Tabs family has no Decided 2026-10-18 note');
  if (doc.getElementById('u-tabs-view-switches-and-segmented-rows')) bad('Tabs and view switches is still listed as Not yet decided');
  for (const id of ['u-phone-bottom-bar-icon-over-label']) if (!doc.getElementById(id)) bad(`${id} is not listed as Not yet decided`);
  if (!/Chips that filter/.test(blk ? blk.textContent : '') || !/bottom bar/.test(blk ? blk.textContent : '')) bad('the Tabs family does not note the two families that are not part of it');
  return JSON.stringify(out);
};
