/*
 * check-design-system-modulechrome.mjs -- the Module window family (title bar, toolbar, status line) of the proposed design system page
 * (public/design-system/proposed-modulechrome.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a band height that is not its token (title bar 34px, 42px on a phone, toolbar 34px, status line 24px, plus the inset on a popped-out phone window),
 * a tint anywhere but the title bar (the toolbar is --bg-input, the status line and the content are the window's step, never --shade), a wash that is not 10% of the
 * tint over the window, a toolbar or title bar button that is not the 30px Quiet small look, a selected button that is not --selected-bg (and the retired 26px round
 * .tb-btn pill, or its solid accent "on"), a status chip that is not 20px with a fill and the small corner, a floating window without --shadow-2 and a grab cursor, a
 * docked one with a shadow, a popped-out one with an edge or a corner, a focus ring that is not 2px, inside the button (offset -2px) and the same on all four sides
 * at 1.25x and 1.5x, a toolbar that overflows without scrolling sideways or shows a scrollbar, a status line without the phone inset, a label more than 1px off the
 * middle of its button, a coloured one-sided edge or a thin coloured block anywhere in the family, a contrast pair under its minimum, an alias that does not look like
 * the new name, a frame that scrolls sideways, the family not marked Approved, the undecided name still listed; in the stylesheet: a hex colour, a gradient, a colour
 * written out, a shadow other than none and --shadow-2, --shade, a side border other than the 1px --border divider, a name not defined.
 */
export const id = 'modulechrome';
export const todayOnly = [];

export function staticChecks({ fail, css, js, defined }) {
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-modulechrome.css: a hex colour (tokens only)');
  if (/gradient\(/.test(css)) fail('proposed-modulechrome.css: a gradient');
  if (/rgba?\(/.test(css)) fail('proposed-modulechrome.css: a colour written out (tokens only)');
  if (/--shade\b/.test(css)) fail('proposed-modulechrome.css: --shade (the toolbar is --bg-input; the title bar and status line are the window\'s step)');
  for (const m of css.matchAll(/box-shadow\s*:\s*([^;]+);/g)) if (!/^(none|var\(--shadow-2\))$/.test(m[1].trim())) fail(`proposed-modulechrome.css: box-shadow ${m[1].trim()} (only none, and --shadow-2 on a floating window)`);
  for (const m of css.matchAll(/border-(left|right|top|bottom)\s*:\s*([^;]+);/g)) {
    if (/left|right/.test(m[1])) fail(`proposed-modulechrome.css: border-${m[1]} (a side edge is a bar)`);
    else if (!/^(1px solid var\(--border\)|0)$/.test(m[2].trim())) fail(`proposed-modulechrome.css: border-${m[1]}: ${m[2].trim()} (only the 1px --border divider)`);
  }
  if (!/--module-header-h:\s*34px/.test(css) || !/--module-header-h:\s*42px/.test(css)) fail('proposed-modulechrome.css: the title bar is not 34px with a 42px phone value');
  if (!/--toolbar-h:\s*34px/.test(css) || !/--status-bar-h:\s*24px/.test(css)) fail('proposed-modulechrome.css: the toolbar is not 34px or the status line is not 24px');
  if (!/data-tint\][^{]*\{\s*background:\s*color-mix\(in srgb, var\(--tint\) var\(--mc-wash\), var\(--bg-section\)\)/.test(css) || !/--mc-wash:\s*10%/.test(css)) fail('proposed-modulechrome.css: the title bar tint is not a 10% wash over --bg-section');
  if (!/\.sdk-window-floating[^{]*\{\s*box-shadow:\s*var\(--shadow-2\)/.test(css)) fail('proposed-modulechrome.css: a floating window has no --shadow-2');
  for (const c of ['sdk-window', 'sdk-window-docked', 'sdk-window-floating', 'sdk-window-popout', 'sdk-window-content', 'sdk-titlebar', 'sdk-titlebar-title', 'sdk-titlebar-tools', 'sdk-toolbar', 'sdk-toolbar-text', 'sdk-sep',
    'sdk-progress', 'sdk-progress-fill', 'sdk-status-line', 'sdk-status-items', 'sdk-status-item', 'sdk-status-text', 'sdk-status-sep', 'mod-header', 'mod-title', 'mod-header-tools', 'module-floating-head',
    'module-docked', 'module-floating', 'chat-head', 'mod-toolbar', 'tb-btn', 'tb-sep', 'tb-text', 'tb-progress', 'tb-progress-fill', 'mod-status', 'mod-status-items', 'mod-status-item', 'mod-status-text', 'mod-status-sep', 'mod-add']) {
    if (!defined.has(c)) fail(`the proposed stylesheets do not define the module window name .${c} (a new name or a kept alias)`);
  }
  if (!/ds-st-approved/.test(js) || /ds-st-proposed/.test(js)) fail('proposed-modulechrome.js: the family is not marked Approved');
}

export async function browserChecks(b) {
  const { ev, cdp, sessionId, sc, where, problems, inkCentre, edgeColours } = b;
  const cp = JSON.parse(await ev(`(${probe.toString()})()`));
  for (const x of cp.problems) problems.push(`${where}: ${x}`);
  // The label of a text button in the toolbar, within 1px of the middle of its box (a 4x screenshot of the button).
  for (const [title, sel, nm] of [['Module chrome, toolbar', '.sdk-toolbar .btn:not(.sdk-icon-btn)', 'the toolbar text button'], ['Module chrome, aliases', '.tb-btn', 'the .tb-btn alias']]) {
    const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === ${JSON.stringify(title)}); const el = m.iframe.contentDocument.querySelector(${JSON.stringify(sel)}); { const ic = el.querySelector('i'); if (ic) ic.remove(); } el.scrollIntoView({ block: 'center', behavior: 'instant' }); await new Promise((r) => setTimeout(r, 150));
      let b = el.getBoundingClientRect(); let fr = m.iframe.getBoundingClientRect(); const frac = (fr.top + window.scrollY) - Math.floor(fr.top + window.scrollY); m.iframe.style.position = 'relative'; if (frac > 0.01) { m.iframe.style.top = (1 - frac) + 'px'; await new Promise((r) => setTimeout(r, 120)); b = el.getBoundingClientRect(); fr = m.iframe.getBoundingClientRect(); }
      return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height }); })()`));
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x, y: at.y, width: at.w, height: at.h, scale: 4 } }, sessionId);
    const c = inkCentre(Buffer.from(shot.data, 'base64'), 4, 10);
    if (c === null) problems.push(`${where}: no ink found in ${nm}`);
    else if (Math.abs(c) > 1.01) problems.push(`${where}: ${nm} is ${Math.abs(c).toFixed(2)}px ${c > 0 ? 'low' : 'high'} of the middle of its box`);
  }
  await ev(`(() => { for (const f of window.__ds.frames) { f.iframe.style.top = ''; f.iframe.style.position = ''; } })()`);
  // The focus ring of a toolbar button: all four sides the same at a fractional device pixel ratio and page offset.
  if (sc.width >= 500) {
    for (const dsf of [1.25, 1.5]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: dsf, mobile: false }, sessionId);
      await new Promise((r) => setTimeout(r, 400));
      for (const nudge of [0.3, 0.7]) {
        const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Module chrome, toolbar'); const d = m.iframe.contentDocument; const el = d.querySelector('.sdk-toolbar .ds-force-focus'); el.scrollIntoView({ block: 'center', behavior: 'instant' });
          const c = document.getElementById('ds-content'); c.style.marginTop = '${nudge}px'; c.style.marginLeft = '${nudge * 1.7 % 1}px'; window.scrollTo(0, Math.round(window.scrollY) + ${nudge}); await new Promise((r) => setTimeout(r, 150));
          const cv = document.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = getComputedStyle(el).outlineColor; g.fillRect(0, 0, 1, 1); const px = g.getImageData(0, 0, 1, 1).data;
          const b = el.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height, col: 'rgb(' + px[0] + ',' + px[1] + ',' + px[2] + ')' }); })()`));
        const pad = 6;
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x - pad, y: at.y - pad, width: at.w + pad * 2, height: at.h + pad * 2, scale: 1 } }, sessionId);
        const e = edgeColours(Buffer.from(shot.data, 'base64'), at.col.match(/[\d.]+/g).map(Number), dsf, pad, at.w, at.h);
        const vals = Object.values(e);
        if (Math.max(...vals) - Math.min(...vals) > 40) problems.push(`${where}: the focused toolbar button outline is not the same on all four sides at ${dsf}x with the page ${nudge}px off the pixel grid (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
        if (Math.max(...vals) > 60) problems.push(`${where}: a side of the focused toolbar button outline never reaches its full colour at ${dsf}x (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
      }
      await ev(`(() => { const c = document.getElementById('ds-content'); c.style.marginTop = ''; c.style.marginLeft = ''; })()`);
    }
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
    await new Promise((r) => setTimeout(r, 300));
  }
}

// Measured in the page (runs in the browser).
const probe = async () => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^Module chrome/.test(t));
  if (TITLES.length < 13) bad(`the Module window family has only ${TITLES.length} frames`);
  await wait(100);
  const tok = (d, expr, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = expr; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const bgTok = (d, n) => tok(d, `var(${n})`, 'backgroundColor');
  const cs = (e, p) => getComputedStyle(e, p);
  const phone = (d) => d.defaultView.innerWidth <= 640;
  const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 0.6 : t);
  // Every band, in every frame: the heights.
  for (const t of TITLES) {
    const d = get(t); const ph = phone(d);
    for (const el of d.querySelectorAll('.sdk-titlebar:not(.pm-free), .mod-header, .module-floating-head')) { if (el.closest('[style*="width:150px"]') || el.getAttribute('style')) continue; const hh = el.getBoundingClientRect().height; if (!near(hh, ph ? 42 : 34)) bad(`${t}: a title bar is ${hh}px high, expected ${ph ? 42 : 34}`); }
    for (const el of d.querySelectorAll('.sdk-toolbar, .mod-toolbar')) { const hh = el.getBoundingClientRect().height; if (!near(hh, 34)) bad(`${t}: a toolbar is ${hh}px high, expected 34`); }
    for (const el of d.querySelectorAll('.sdk-status-line, .mod-status')) { const inset = parseFloat(cs(el).paddingBottom); const hh = el.getBoundingClientRect().height; if (!near(hh, 24 + inset)) bad(`${t}: a status line is ${hh}px high, expected ${24 + inset}`); }
    if (d.documentElement.scrollWidth > d.documentElement.clientWidth + 1) bad(`${t}: scrolls sideways`);
  }
  // The bands, windows and tint: only the title bar is tinted.
  { const d = get('Module chrome, windows'); const [tinted, plain, floating, popout] = [...d.querySelectorAll('.sdk-window')];
    const section = bgTok(d, '--bg-section'); const input = bgTok(d, '--bg-input');
    for (const w of [tinted, plain, floating, popout]) {
      if (cs(w).backgroundColor !== section) bad('a window is not --bg-section');
      const tb = w.querySelector('.sdk-toolbar'); if (tb && cs(tb).backgroundColor !== input) bad(`the toolbar is ${cs(tb).backgroundColor}, not --bg-input`);
      const st = w.querySelector('.sdk-status-line'); if (cs(st).backgroundColor !== section) bad('the status line is not the window\'s step');
      const ct = w.querySelector('.sdk-window-content'); if (cs(ct).backgroundColor !== section) bad('the content is not the window\'s step');
      if (cs(w.querySelector('.sdk-titlebar')).backgroundImage !== 'none') bad('the title bar has a gradient');
    }
    const wash = tok(d, 'color-mix(in srgb, var(--tint-blue) 10%, var(--bg-section))', 'backgroundColor');
    if (cs(tinted.querySelector('.sdk-titlebar')).backgroundColor !== wash) bad(`the tinted title bar is ${cs(tinted.querySelector('.sdk-titlebar')).backgroundColor}, not the 10% wash ${wash}`);
    if (cs(plain.querySelector('.sdk-titlebar')).backgroundColor !== section) bad('an untinted title bar is not the window\'s step');
    const ic = cs(tinted.querySelector('.sdk-titlebar-title > i')).color; if (ic !== tok(d, 'color-mix(in srgb, var(--tint-blue) 62%, var(--text))')) bad('the tinted icon is not the readable tint mix');
    if (cs(plain.querySelector('.sdk-titlebar-title > i')).color !== tok(d, 'var(--text-dim)')) bad('an untinted icon is not --text-dim');
    if (cs(tinted.querySelector('.sdk-titlebar-title')).color !== tok(d, 'var(--text)')) bad('the title words are not --text');
    // Kinds
    if (cs(tinted).boxShadow !== 'none' || cs(plain).boxShadow !== 'none') bad('a docked window has a shadow');
    if (cs(floating).boxShadow !== tok(d, 'var(--shadow-2)', 'boxShadow')) bad(`a floating window has ${cs(floating).boxShadow}, not --shadow-2`);
    if (cs(floating.querySelector('.sdk-titlebar')).cursor !== 'grab') bad('a floating title bar has no grab cursor');
    if (cs(tinted.querySelector('.sdk-titlebar')).cursor === 'grab') bad('a docked title bar has a grab cursor');
    for (const s of ['Top', 'Right', 'Bottom', 'Left']) if (cs(popout)['border' + s + 'Width'] !== '0px') bad('a popped-out window has an edge');
    if (cs(popout).borderTopLeftRadius !== '0px') bad('a popped-out window has a corner');
    if (cs(tinted).borderTopLeftRadius !== tok(d, 'var(--radius-large)', 'borderTopLeftRadius')) bad('a docked window is not --radius-large');
    // The buttons in the bands: 30px Quiet small, selected = --selected-bg.
    for (const btn of d.querySelectorAll('.sdk-titlebar .sdk-icon-btn')) { const r = btn.getBoundingClientRect(); if (!near(r.width, 30) || !near(r.height, 30)) bad(`a title bar button is ${r.width} by ${r.height}, expected 30 by 30`); if (cs(btn).backgroundColor !== 'rgba(0, 0, 0, 0)') bad('a title bar button has a fill at rest'); }
    const sel = tinted.querySelector('.sdk-toolbar [aria-pressed="true"].sdk-icon-btn'); if (!sel || cs(sel).backgroundColor !== bgTok(d, '--selected-bg')) bad('a selected toolbar button is not --selected-bg');
    for (const it of tinted.querySelectorAll('.sdk-toolbar .sdk-tab, .sdk-toolbar .sdk-icon-btn, .sdk-toolbar .btn, .sdk-toolbar .sdk-search input')) { const hh = it.getBoundingClientRect().height; if (!near(hh, 30)) bad(`a toolbar item is ${hh}px high, expected 30 (${it.className})`); }
    const pr = tinted.querySelector('.sdk-progress'); if (!near(pr.getBoundingClientRect().height, 6)) bad('the progress is not 6px');
    const sep = tinted.querySelector('.sdk-sep'); if (!near(sep.getBoundingClientRect().width, 1)) bad('a separator is not 1px');
    const search = tinted.querySelector('.sdk-search input'); if (search && !near(search.getBoundingClientRect().height, 30)) bad('the toolbar search is not 30px');
    // Status line.
    const sl = tinted.querySelector('.sdk-status-line'); const sc2 = cs(sl); if (sc2.fontSize !== '12px' || sc2.color !== tok(d, 'var(--text-dim)')) bad(`the status line is ${sc2.fontSize} ${sc2.color}, expected 12px --text-dim`);
    if (sc2.borderTopWidth !== '1px' || sc2.borderTopColor !== tok(d, 'var(--border)') || sc2.borderBottomWidth !== '0px') bad('the status line is not a 1px --border hairline on top');
    if (!tinted.querySelector('.sdk-status-sep') || cs(tinted.querySelector('.sdk-status-sep')).color !== tok(d, 'var(--text-dim)')) bad('the status items have no dot between them');
  }
  // Tints: eight, each title bar the wash of its own tint.
  { const d = get('Module chrome, tints'); const bars = [...d.querySelectorAll('.sdk-titlebar')]; if (bars.length !== 8) bad(`the tints frame shows ${bars.length} title bars, expected 8`);
    const names = ['gold', 'blue', 'green', 'teal', 'purple', 'red', 'orange', 'pink'];
    bars.forEach((bar, i) => { const want = tok(d, `color-mix(in srgb, var(--tint-${names[i]}) 10%, var(--bg-section))`, 'backgroundColor'); if (cs(bar).backgroundColor !== want) bad(`the ${names[i]} title bar is not its 10% wash`); }); }
  // Title bar buttons: states.
  { const d = get('Module chrome, title bar buttons'); const bs = [...d.querySelectorAll('.sdk-icon-btn')]; const [rest, hov, prs, foc, sel, dis] = bs; if (bs.length !== 6) bad('the title bar button states are not six');
    else { if (cs(hov).backgroundColor === cs(rest).backgroundColor) bad('title bar button: hover does not change the fill'); if (cs(prs).backgroundColor === cs(hov).backgroundColor) bad('title bar button: pressed looks like hover');
      if (cs(foc).outlineWidth !== '2px' || cs(foc).outlineOffset !== '-2px' || cs(foc).outlineColor !== tok(d, 'var(--accent)')) bad(`title bar button: the focus is ${cs(foc).outlineWidth} at ${cs(foc).outlineOffset} ${cs(foc).outlineColor}, expected 2px at -2px --accent`);
      if (cs(sel).backgroundColor !== bgTok(d, '--selected-bg')) bad('title bar button: selected is not --selected-bg');
      if (cs(dis).opacity !== '0.5') bad('title bar button: disabled is not half strength'); } }
  // Toolbar: overflow scrolls sideways with no scrollbar; icons only when narrow; focus inside; progress.
  { const d = get('Module chrome, toolbar'); const tbs = [...d.querySelectorAll('.sdk-toolbar')];
    const narrow = d.querySelectorAll('.pm-mc-narrow .sdk-toolbar')[0]; if (!narrow || narrow.scrollWidth <= narrow.clientWidth + 1) bad('the 280px toolbar does not overflow');
    for (const tb of tbs) { const c = cs(tb); if (c.overflowX !== 'auto' && c.overflowX !== 'visible') bad('a toolbar does not scroll sideways'); if (c.overflowX === 'auto' && c.scrollbarWidth !== 'none') bad('a toolbar shows a scrollbar'); }
    const compact = d.querySelectorAll('.pm-mc-narrow .sdk-toolbar')[1]; const tab = compact && compact.querySelector('.sdk-tab'); if (!tab || !near(tab.getBoundingClientRect().width, 30, 1.5)) bad('the narrow view switch is not icons only (a 30px square tab)');
    const foc = d.querySelector('.sdk-toolbar .ds-force-focus'); if (!foc || cs(foc).outlineOffset !== '-2px') bad('a toolbar button focus is not inside the button (offset -2px)');
    const bars = [...d.querySelectorAll('.sdk-progress-fill')]; if (bars.length < 3) bad('the toolbar frame shows fewer than three progress fills'); }
  // Status line: the chip, a problem, the cut.
  { const d = get('Module chrome, status line'); const chip = d.querySelector('.sdk-status-line .sdk-status'); if (!chip) bad('the status line chip is not drawn');
    else { const r = chip.getBoundingClientRect(); const c = cs(chip); if (!near(r.height, 20)) bad(`the status line chip is ${r.height}px high, expected 20`); if (c.borderTopColor !== 'rgba(0, 0, 0, 0)' || c.backgroundColor === 'rgba(0, 0, 0, 0)' || c.borderTopLeftRadius !== tok(d, 'var(--radius-small)', 'borderTopLeftRadius')) bad('the status line chip is not a Chips fill with the small corner and no edge'); }
    const prob = d.querySelector('.is-problem'); if (!prob || cs(prob).color !== tok(d, 'color-mix(in srgb, var(--danger) 70%, var(--text))')) bad('a problem is not the readable red');
    const narrow = d.querySelector('.pm-mc-narrow .sdk-status-line'); const end = narrow.querySelector('.end'); if (end.getBoundingClientRect().right > narrow.getBoundingClientRect().right + 0.5) bad('the end item runs past the status line');
    const wide = d.querySelector('.sdk-status-line'); const e2 = wide.querySelector('.end'); if (!near(e2.getBoundingClientRect().right, wide.getBoundingClientRect().right - 12, 1.5)) bad('the end item is not pushed to the right edge'); }
  // The Chat header is the title bar.
  { const d = get('Module chrome, chat header'); const bar = d.querySelector('.sdk-titlebar'); const v = d.querySelector('#chat-views'); const s = d.querySelector('#chat-status');
    if (!bar || !v || !s) bad('the chat header frame lacks the title bar, the view switch or #chat-status'); else if (s.getAttribute('role') !== 'region' && s.getAttribute('aria-live') !== 'polite') bad('#chat-status is not a region or a live region'); }
  // A phone: the popped-out window, the inset, the sideways toolbar.
  { const d = get('Module chrome, phone'); if (d.defaultView.innerWidth > 640) bad('the phone frame is wider than a phone');
    const bar = d.querySelector('.sdk-titlebar'); if (!near(bar.getBoundingClientRect().height, 42)) bad(`the phone title bar is ${bar.getBoundingClientRect().height}px, expected 42`);
    const tb = d.querySelector('.sdk-toolbar'); if (tb.scrollWidth <= tb.clientWidth + 1) bad('the phone toolbar does not scroll sideways'); if (cs(tb).scrollbarWidth !== 'none') bad('the phone toolbar shows a scrollbar');
    const st = d.querySelector('.sdk-status-line'); if (!near(parseFloat(cs(st).paddingBottom), 34) || !near(st.getBoundingClientRect().height, 58)) bad(`the phone status line has ${cs(st).paddingBottom} of inset and is ${st.getBoundingClientRect().height}px, expected 34 and 58`);
    const btn = d.querySelector('.sdk-titlebar .sdk-icon-btn'); const a = cs(btn, '::after'); if (a.content === 'none' || parseFloat(a.height) < 43.4 && parseFloat(a.top) > -6) bad('a phone title bar button has no 44px hit area'); }
  // Aliases look like the new names.
  { const d = get('Module chrome, aliases'); const mh = d.querySelector('.mod-header'); const mt = d.querySelector('.mod-toolbar'); const ms = d.querySelector('.mod-status');
    if (!near(mh.getBoundingClientRect().height, phone(d) ? 42 : 34)) bad('.mod-header is not the title bar height'); if (!near(mt.getBoundingClientRect().height, 34)) bad('.mod-toolbar is not 34px'); if (!near(ms.getBoundingClientRect().height, 24)) bad('.mod-status is not 24px');
    if (cs(mt).backgroundColor !== bgTok(d, '--bg-input')) bad('.mod-toolbar is not --bg-input'); if (cs(mh).backgroundColor !== tok(d, 'color-mix(in srgb, var(--tint-orange) 10%, var(--bg-section))', 'backgroundColor')) bad('.mod-header is not the wash'); if (cs(mh).backgroundImage !== 'none') bad('.mod-header has a gradient');
    const tbn = d.querySelector('.tb-btn'); const on = d.querySelector('.tb-btn.on'); if (!near(tbn.getBoundingClientRect().height, 30)) bad('.tb-btn is not 30px (the 26px pill is retired)'); if (cs(tbn).borderTopLeftRadius !== tok(d, 'var(--radius-small)', 'borderTopLeftRadius')) bad('.tb-btn is a pill, not the small corner');
    if (cs(on).backgroundColor !== bgTok(d, '--selected-bg')) bad('.tb-btn.on is not --selected-bg (the solid accent is retired)'); if (cs(on).backgroundColor === bgTok(d, '--accent')) bad('.tb-btn.on is the solid accent');
    const add = d.querySelector('.mod-add'); if (!near(add.getBoundingClientRect().width, 30)) bad('.mod-add is not 30px'); if (cs(add).color !== tok(d, 'var(--text-dim)')) bad('.mod-add is tinted');
    const chip = d.querySelector('.mod-status-item.chip'); if (!near(chip.getBoundingClientRect().height, 20)) bad('.mod-status-item.chip is not 20px'); if (cs(chip).borderTopColor !== 'rgba(0, 0, 0, 0)') bad('.mod-status-item.chip keeps an edge');
    const msg = d.querySelector('.msg-btn'); if (!near(msg.getBoundingClientRect().width, 30)) bad('.msg-btn is not 30px');
    const fl = d.querySelector('.module-floating-head'); if (cs(fl).backgroundColor !== tok(d, 'color-mix(in srgb, var(--tint-pink) 10%, var(--bg-section))', 'backgroundColor') || cs(fl).cursor !== 'grab') bad('.module-floating-head is not the title bar with a grab cursor'); }
  // No coloured one-sided edge and no thin coloured block, anywhere in the family.
  for (const t of TITLES) { const d = get(t); const border = tok(d, 'var(--border)');
    for (const el of d.querySelectorAll('body *')) { if (el.closest('svg')) continue; const c = cs(el);
      const sides = ['Top', 'Right', 'Bottom', 'Left'].filter((s) => c['border' + s + 'Width'] !== '0px' && c['border' + s + 'Style'] !== 'none');
      for (const s of sides) { const col = c['border' + s + 'Color']; if (col !== border && col !== 'rgba(0, 0, 0, 0)') bad(`${t}: a ${s.toLowerCase()} edge of ${el.className || el.tagName} is ${col}, not --border or transparent`); }
      if (sides.length && sides.length < 4 && sides.some((s) => s === 'Left' || s === 'Right')) bad(`${t}: a left or right edge on ${el.className || el.tagName}`);
      if (c.position !== 'static') for (const p of ['::before', '::after']) { const pc = cs(el, p); if (pc.content !== 'none' && pc.content !== 'normal' && pc.backgroundColor !== 'rgba(0, 0, 0, 0)' && pc.position === 'absolute' && (parseFloat(pc.width) <= 4 || parseFloat(pc.height) <= 4)) bad(`${t}: a thin coloured block (${pc.width} by ${pc.height}) on ${el.className || el.tagName}`); } } }
  // Contrast pairs.
  { const d = get('Module chrome, contrast'); await wait(600); const rows = [...d.querySelectorAll('.pm-mc-ct tbody tr')]; if (rows.length < 26) bad(`the contrast table has only ${rows.length} rows`);
    for (const tr of rows) { const p = tr.querySelector('[data-out="p"]').textContent; if (p === 'Fails') bad(`contrast: ${tr.children[0].textContent} is ${tr.querySelector('[data-out="r"]').textContent}`); if (!p) bad('the contrast table is not measured'); } }
  // The page: Proposed, the undecided name is out of the list.
  const blk = document.getElementById('modulechrome');
  if (!blk || !blk.querySelector('.ds-st-approved') || blk.querySelector('.ds-st-proposed')) bad('the Module window family is not marked Approved');
  if (document.getElementById('u-module-window-title-toolbar-and-status')) bad('Module window: title, toolbar and status is still listed as Not yet decided');
  if (!blk || !/Decided 2026-10-21/.test(blk.textContent) || !/Today to proposed/.test(blk.textContent)) bad('the Module window family lacks its Today to proposed or Decided 2026-10-21 section');
  return JSON.stringify(out);
};
