/*
 * check-design-system-menus.mjs -- the Menus and popovers family of the proposed design system page (public/design-system/proposed-menus.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: an item not 32px high (44px in a frame of 640px or less, with .narrow, and in the sheet); a surface that is not --bg-card with a 1px
 * --border hairline on all four sides, --radius-medium, --shadow-2 and the padding of its kind (4px a menu, 14px a popover, 8px a dense one); a menu outside
 * 180 to 320px; a hover (forced) that is not the quiet neutral fill, or that is tinted by the accent or by danger; a current row that is not --selected-bg with
 * the accent-mix text, or that carries a check mark; a check mark anywhere but a tick-box row; a danger row with a fill at rest or on hover, or with text under
 * 4.5 to 1 (rest and hover, in light and dark mode); a disabled row not at half strength; a focus that is not a 2px accent outline at offset -2px, or not the same
 * on all four edges at 1.25x and 1.5x; an element with a one-sided border; a heading not 11px uppercase; a divider not 1px with a 4px and 6px margin; the count
 * not 18px; the sheet without --radius-large top corners, a scrim, 44px rows, or with a shadow of its own; a day cell not 30px (44px on a phone), a hover that
 * is not the quiet fill, a chosen day that is not the solid accent with --on-accent, a today that is not the half-strength selected fill, a range that is not
 * the quiet fill; a kind list that is not --radius-medium, a chosen kind not bold with its chip; an alias (today's class name) that does not take the same
 * surface and row; a popover heading that is accent coloured; the keyboard demo not answering Down, Up, Home, End, Right, Left, Escape and Enter; the family
 * not marked Approved and dated 2026-10-19; a --shadow-2 that is not 0 4px 12px (dark black at 40%, light --text at 14%) or a --shadow-1 not smaller than it; Dialogs and sheets, Toasts and banners or Tooltips still listed as not yet decided (they are drawn now); Menus and flyouts and Popovers and
 * sheets still listed as not yet decided. In the stylesheet: a rule that draws an edge on one side, an inset shadow, an underline, a red or accent fill on a
 * danger row or a hover, a name that is not defined, a --shadow-2 with no light value.
 */
export const id = 'menus';
export const todayOnly = [];

export function staticChecks({ fail, css, defined }) {
  if (/border-(left|right|top|bottom)(-color|-width|-style)?\s*:/.test(css)) fail('proposed-menus.css: a rule draws an edge on one side (no coloured one-sided border, no bar)');
  if (/box-shadow\s*:\s*inset|inset\s+\d/.test(css)) fail('proposed-menus.css: a rule draws an inset shadow (a bar)');
  if (/text-decoration\s*:\s*underline/.test(css)) fail('proposed-menus.css: a rule underlines something');
  if (!/--shadow-2:\s*0 4px 12px rgba\(0, 0, 0, 0\.40\)/.test(css)) fail('proposed-menus.css: the dark --shadow-2 is not 0 4px 12px rgba(0, 0, 0, 0.40)');
  if (!/:root\[data-theme-mode="light"\][^{]*\{[^}]*--shadow-2:\s*0 4px 12px color-mix\(in srgb, var\(--text\) 14%, transparent\)/.test(css)) fail('proposed-menus.css: the light --shadow-2 is not 0 4px 12px of --text at 14%');
  if (!/--shadow-2\s*:/.test(css) || !/:root\[data-theme-mode="light"\][^{]*\{[^}]*--shadow-2\s*:/.test(css)) fail('proposed-menus.css: --shadow-2 has no dark value and light value');
  if ((css.match(/box-shadow\s*:\s*var\(--shadow-2\)/g) || []).length < 1) fail('proposed-menus.css: the surface does not use box-shadow: var(--shadow-2)');
  // A hover or danger rule is neutral: no accent or danger fill (the current row's own hover is the one allowed, and the chosen day's).
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim(); const body = m[2];
    const fill = /background[^;]*(var\(--accent\)|var\(--danger\)|--primary-hover)/.test(body);
    if (/:hover|:focus-visible/.test(sel) && fill && !/aria-current|aria-checked|\.current|\.on\b|\.sel\b|aria-pressed/.test(sel)) fail(`proposed-menus.css: a hover or focus rule fills with the accent or danger: ${sel.slice(0, 90)}`);
    if (/\.danger|sdk-menu-danger|data-danger/.test(sel) && /background/.test(body)) fail(`proposed-menus.css: a danger rule sets a background: ${sel.slice(0, 90)}`);
  }
  // The large radius is for the sheet only.
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*--radius-large[^{}]*)\}/g)) if (!/sdk-menu-sheet/.test(m[1])) fail(`proposed-menus.css: --radius-large outside the sheet: ${m[1].trim().slice(0, 80)}`);
  for (const c of ['sdk-menu', 'sdk-menu-item', 'sdk-menu-icon', 'sdk-menu-label', 'sdk-menu-hint', 'sdk-menu-caret', 'sdk-menu-check', 'sdk-menu-switch', 'sdk-menu-heading', 'sdk-menu-sep', 'sdk-menu-flyout',
    'sdk-menu-sheet', 'sdk-menu-scrim', 'sdk-menu-grip', 'sdk-menu-list', 'sdk-popover', 'sdk-popover-heading', 'sdk-popover-block', 'sdk-popover-foot', 'sdk-popover-dense',
    'host-menu', 'host-menu-item', 'host-menu-label', 'host-menu-hint', 'host-menu-heading', 'host-menu-category', 'host-menu-caret', 'host-menu-switch', 'host-menu-flyout',
    'modules-menu', 'modules-menu-item', 'menu', 'popover', 'chat-command-menu', 'chat-command-item', 'sdk-kind-list', 'sdk-kind-option', 'sdk-kind-group', 'sdk-kind-group-title',
    'sdk-dp', 'sdk-dp-day', 'sdk-dp-grid', 'sdk-dp-dow', 'sdk-dp-head', 'sdk-dp-foot', 'bell-list', 'bell-head', 'narrow', 'danger']) {
    if (!defined.has(c)) fail(`the proposed stylesheets do not define the menus name .${c} (a new name or a kept alias)`);
  }
}

export async function browserChecks(b) {
  const { ev, cdp, sessionId, sc, where, problems, edgeColours } = b;
  const mp = JSON.parse(await ev(`(${menusProbe.toString()})()`));
  for (const x of mp.problems) problems.push(`${where}: ${x}`);
  // Focus: the same on all four edges at a fractional device pixel ratio and page offset (the Fields' and Tabs' method), on a focused row and a current focused row.
  if (sc.width >= 500) {
    for (const dsf of [1.25, 1.5]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: dsf, mobile: false }, sessionId);
      await new Promise((r) => setTimeout(r, 400));
      for (const [nm, idx] of [['focused', 2], ['current and focused', 5], ['danger and focused', 8]]) {
        for (const nudge of [0.3, 0.7]) {
          const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Menus, states'); const d = m.iframe.contentDocument; const el = d.querySelectorAll('.pm-cell')[${idx}].querySelector('.sdk-menu-item'); el.scrollIntoView({ block: 'center', behavior: 'instant' });
            const c = document.getElementById('ds-content'); c.style.marginTop = '${nudge}px'; c.style.marginLeft = '${nudge * 1.7 % 1}px'; window.scrollTo(0, Math.round(window.scrollY) + ${nudge}); await new Promise((r) => setTimeout(r, 150));
            const cv = document.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = getComputedStyle(el).outlineColor; g.fillRect(0, 0, 1, 1); const px = g.getImageData(0, 0, 1, 1).data;
            const b = el.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height, col: 'rgb(' + px[0] + ',' + px[1] + ',' + px[2] + ')' }); })()`));
          const pad = 6;
          const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x - pad, y: at.y - pad, width: at.w + pad * 2, height: at.h + pad * 2, scale: 1 } }, sessionId);
          const e = edgeColours(Buffer.from(shot.data, 'base64'), at.col.match(/[\d.]+/g).map(Number), dsf, pad, at.w, at.h);
          const vals = Object.values(e);
          if (Math.max(...vals) - Math.min(...vals) > 40) problems.push(`${where}: the ${nm} row outline is not the same on all four sides at ${dsf}x with the page ${nudge}px off the pixel grid (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
          if (Math.max(...vals) > 60) problems.push(`${where}: a side of the ${nm} row outline never reaches its full colour at ${dsf}x (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
        }
      }
      await ev(`(() => { const c = document.getElementById('ds-content'); c.style.marginTop = ''; c.style.marginLeft = ''; })()`);
    }
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
    await new Promise((r) => setTimeout(r, 300));
  }
}

// Measured in the page (runs in the browser).
const menusProbe = async () => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const tok = (d, n, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = n; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const bgTok = (d, n) => tok(d, n, 'backgroundColor');
  const HOVER = 'color-mix(in srgb, var(--text) 10%, transparent)';
  const MIXCUR = 'color-mix(in srgb, var(--accent) 55%, var(--text))';
  const MIXDNG = 'color-mix(in srgb, var(--danger) 70%, var(--text))';
  const ITEM = '.sdk-menu-item, .host-menu-item, .modules-menu-item, .chat-command-item, .menu > button, .sdk-kind-option';
  const SURF = '.sdk-menu, .host-menu, .modules-menu, .menu, .chat-command-menu, .sdk-kind-list, .sdk-menu-flyout, .sdk-popover, .popover, .sdk-dp';
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^Menus/.test(t) && !/contrast/.test(t));
  if (TITLES.length < 20) bad(`the Menus family has only ${TITLES.length} frames`);
  const cv = document.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true });
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (d) => 0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]);
  const ratio = (d, fg, layers) => {
    g.clearRect(0, 0, 1, 1); for (const l of layers) { g.fillStyle = tok(d, l, 'backgroundColor'); g.fillRect(0, 0, 1, 1); }
    const base = g.getImageData(0, 0, 1, 1).data.slice(0, 3); g.fillStyle = fg; g.fillRect(0, 0, 1, 1); const top = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
    const a = lum(top); const c = lum(base); return (Math.max(a, c) + 0.05) / (Math.min(a, c) + 0.05);
  };
  const SIDES = ['Top', 'Right', 'Bottom', 'Left'];

  // Every frame: no element with a one-sided or unequal edge; heights of every row; the surface of every menu and popover.
  for (const t of TITLES) {
    const d = get(t); if (!d) { bad(`no frame ${t}`); continue; }
    const phone = d.defaultView.innerWidth <= 640;
    for (const el of d.querySelectorAll('.ds-proposed *')) {
      const cs = getComputedStyle(el);
      const w = SIDES.map((s) => cs['border' + s + 'Width']); const c = SIDES.map((s) => cs['border' + s + 'Color']);
      if (new Set(w).size > 1 && !el.closest('.pm-sw, .pm-obj, .pm-ct, .sdk-menu-sheet')) bad(`${t}: ${el.className || el.tagName} has unequal edges (${w.join(' ')})`);
      if (w.some((x) => x !== '0px') && new Set(c).size > 1) bad(`${t}: ${el.className || el.tagName} has edges of different colours (${c.join(' ')})`);
    }
    for (const el of d.querySelectorAll(ITEM)) {
      if (el.closest('.pm-zoom, [hidden]')) continue; // the anatomy sample is drawn at 2x; a closed flyout has no box
      const want = (phone || el.closest('.narrow, .sdk-menu-sheet')) ? 44 : 32; const r = el.getBoundingClientRect();
      if (Math.abs(r.height - want) > 0.6) bad(`${t}: a row (${el.className.split(' ')[0]}) is ${r.height}px, expected ${want}`);
    }
    for (const el of d.querySelectorAll(SURF)) {
      if (el.matches('.pm-zoom *, [hidden]')) { if (el.closest('.pm-zoom')) { /* drawn at 2x: its widths are doubled */ } }
      const cs = getComputedStyle(el); const nm = `${t}: ${el.className.split(' ')[0]}`;
      if (cs.backgroundColor !== bgTok(d, 'var(--bg-card)')) bad(`${nm}: the surface is ${cs.backgroundColor}, not --bg-card`);
      for (const s of SIDES) if (cs['border' + s + 'Width'] !== '1px' || cs['border' + s + 'Style'] !== 'solid' || cs['border' + s + 'Color'] !== tok(d, 'var(--border)')) bad(`${nm}: the ${s.toLowerCase()} edge is ${cs['border' + s + 'Width']} ${cs['border' + s + 'Color']}, not a 1px --border hairline`);
      for (const k of ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight']) if (cs['border' + k + 'Radius'] !== '7px') bad(`${nm}: a corner is ${cs['border' + k + 'Radius']}, not --radius-medium (7px)`);
      if (cs.boxShadow !== tok(d, 'var(--shadow-2)', 'boxShadow')) bad(`${nm}: the shadow is not --shadow-2 (${cs.boxShadow})`);
      if (!/ 0px 4px 12px 0px$/.test(cs.boxShadow)) bad(`${nm}: the shadow is ${cs.boxShadow}, not 0 4px 12px`);
      { const s1 = tok(d, 'var(--shadow-1)', 'boxShadow'); const blur = (v) => Number((/ 0px (-?\d+)px (\d+)px/.exec(v) || [])[2]); if (s1 !== 'none' && !(blur(s1) < blur(cs.boxShadow))) bad(`${nm}: --shadow-1 (${s1}) is not smaller than --shadow-2 (${cs.boxShadow})`); }
      const isPop = el.matches('.sdk-popover, .popover'); const dense = el.matches('.sdk-popover-dense, .sdk-dp');
      const want = isPop && !dense ? 14 : dense ? 8 : 4;
      for (const s of SIDES) if (Math.abs(parseFloat(cs['padding' + s]) - want) > 0.1) bad(`${nm}: padding ${s.toLowerCase()} is ${cs['padding' + s]}, expected ${want}px`);
      if (el.matches('.sdk-menu, .host-menu, .modules-menu, .menu, .chat-command-menu, .sdk-menu-flyout') && !el.closest('.sdk-menu-sheet, .pm-zoom, [hidden]')) { const w = el.getBoundingClientRect().width; if (w < 179.5 || w > 320.5) bad(`${nm}: ${w}px wide, outside 180 to 320`); }
    }
  }

  // States of a row (the states frames, default and narrow).
  for (const t of ['Menus, states', 'Menus, states, narrow']) {
    const d = get(t); if (!d) { bad(`no frame ${t}`); continue; }
    const cell = (i) => d.querySelectorAll('.pm-cell')[i].querySelector('.sdk-menu-item'); const cs = (x) => getComputedStyle(x);
    const [rest, hov, foc, cur, curHov, curFoc, dng, dngHov, dngFoc, dis, open, cursor] = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map(cell);
    if (cs(rest).backgroundColor !== 'rgba(0, 0, 0, 0)') bad(`${t}: a row at rest has a fill (${cs(rest).backgroundColor})`);
    for (const [x, nm] of [[hov, 'hover'], [dngHov, 'danger hover'], [open, 'open'], [cursor, 'cursor']]) if (cs(x).backgroundColor !== bgTok(d, HOVER)) bad(`${t}: the ${nm} fill is ${cs(x).backgroundColor}, not the quiet neutral fill (${bgTok(d, HOVER)})`);
    const acc = tok(d, 'var(--accent)'); const dgr = tok(d, 'var(--danger)');
    for (const x of [hov, dngHov, foc]) { const bgc = cs(x).backgroundColor; if (bgc === acc || /\(\s*\d+,\s*\d+,\s*\d+,\s*0\.14\)/.test(bgc)) bad(`${t}: a hover or focus fill looks like the accent tint (${bgc})`); }
    if (cs(dngHov).backgroundColor === dgr || cs(dng).backgroundColor !== 'rgba(0, 0, 0, 0)') bad(`${t}: a danger row has a red fill`);
    for (const x of [foc, curFoc, dngFoc]) if (cs(x).outlineStyle !== 'solid' || cs(x).outlineWidth !== '2px' || cs(x).outlineOffset !== '-2px') bad(`${t}: the focus is not a 2px outline at offset -2px (${cs(x).outlineWidth} ${cs(x).outlineStyle} ${cs(x).outlineOffset})`);
    if (cs(foc).outlineColor !== acc) bad(`${t}: the focus outline is not --accent (${cs(foc).outlineColor})`);
    if (cs(cur).backgroundColor !== bgTok(d, 'var(--selected-bg)')) bad(`${t}: the current row's fill is ${cs(cur).backgroundColor}, not --selected-bg`);
    if (cs(cur).color !== tok(d, MIXCUR)) bad(`${t}: the current row's text is ${cs(cur).color}, not the accent mix (${tok(d, MIXCUR)})`);
    if (cs(curHov).backgroundColor === cs(cur).backgroundColor) bad(`${t}: the forced current hover does not change the fill`);
    if (cur.querySelector('.sdk-menu-check, .fa-check')) bad(`${t}: the current row carries a check mark`);
    if (cs(dng).color !== tok(d, MIXDNG)) bad(`${t}: the danger text is ${cs(dng).color}, not the danger mix (${tok(d, MIXDNG)})`);
    if (cs(dis).opacity !== '0.5') bad(`${t}: disabled is not half strength (${cs(dis).opacity})`);
    if (cs(rest).fontWeight !== cs(cur).fontWeight) bad(`${t}: the weight changes on the current row`);
    // Danger text: 4.5 to 1 at rest on the surface, and hovered on the quiet fill, in the mode on show.
    const r1 = ratio(d, cs(dng).color, ['var(--bg-card)']); if (r1 < 4.5) bad(`${t}: the danger text is ${r1.toFixed(2)} to 1 on the surface, under 4.5`);
    const r2 = ratio(d, cs(dngHov).color, ['var(--bg-card)', HOVER]); if (r2 < 4.5) bad(`${t}: the hovered danger text is ${r2.toFixed(2)} to 1 on the quiet fill, under 4.5`);
    const r3 = ratio(d, cs(curHov).color, ['var(--bg-card)', cs(curHov).backgroundColor]); if (r3 < 4.5) bad(`${t}: the hovered current text is ${r3.toFixed(2)} to 1, under 4.5`);
    const r4 = ratio(d, cs(cur).color, ['var(--bg-card)', 'var(--selected-bg)']); if (r4 < 4.5) bad(`${t}: the current text is ${r4.toFixed(2)} to 1, under 4.5`);
    out['contrast_' + t] = [r1, r2, r3, r4].map((x) => +x.toFixed(2));
  }

  // Content: the check mark only in tick-box rows; the count 18px; heading and divider.
  { const d = get('Menus, content');
    for (const el of d.querySelectorAll('.sdk-menu-check')) if (el.parentElement.getAttribute('role') !== 'menuitemcheckbox') bad('a tick box outside a tick-box row');
    for (const el of d.querySelectorAll('.sdk-menu-item [class*="fa-check"]')) bad('a check mark icon in a row');
    const checked = d.querySelector('[role="menuitemcheckbox"][aria-checked="true"] .sdk-menu-check'); if (!checked || getComputedStyle(checked).backgroundColor !== tok(d, 'var(--accent)')) bad('a checked tick box is not the accent fill');
    const sw = d.querySelector('.sdk-menu-switch'); if (!sw || Math.abs(sw.getBoundingClientRect().width - 36) > 0.6 || Math.abs(sw.getBoundingClientRect().height - 20) > 0.6) bad('the switch is not 36 by 20');
    const cnt = d.querySelector('.sdk-menu-item > .sdk-badge'); if (!cnt || Math.abs(cnt.getBoundingClientRect().height - 18) > 0.6) bad('the count is not 18px');
    const hd = d.querySelector('.sdk-menu-heading'); const hs = getComputedStyle(hd); if (hs.fontSize !== '11px' || hs.textTransform !== 'uppercase' || hs.color !== tok(d, 'var(--text-dim)')) bad(`the heading is ${hs.fontSize} ${hs.textTransform} ${hs.color}, not 11px uppercase --text-dim`);
    const sp = d.querySelector('.sdk-menu-sep'); const ss = getComputedStyle(sp); if (Math.abs(sp.getBoundingClientRect().height - 1) > 0.1 || ss.marginTop !== '4px' || ss.marginBottom !== '4px' || ss.marginLeft !== '6px' || ss.marginRight !== '6px') bad(`the divider is ${sp.getBoundingClientRect().height}px with margins ${ss.marginTop} ${ss.marginLeft}`);
    const radio = d.querySelector('[role="menuitemradio"][aria-checked="true"]'); if (getComputedStyle(radio).backgroundColor !== bgTok(d, 'var(--selected-bg)')) bad('a current radio row is not --selected-bg');
    const hint = d.querySelector('.sdk-menu-hint'); if (getComputedStyle(hint).fontSize !== '12px') bad('the hint is not 12px');
  }

  // The sheet.
  { const d = get('Menus, sheet at 390'); const sh = d.querySelector('.sdk-menu-sheet'); const cs = getComputedStyle(sh);
    if (cs.borderTopLeftRadius !== '11px' || cs.borderTopRightRadius !== '11px' || cs.borderBottomLeftRadius !== '0px') bad(`the sheet corners are ${cs.borderTopLeftRadius} ${cs.borderBottomLeftRadius}, not large on top and square below`);
    if (cs.boxShadow !== 'none') bad('the sheet has a shadow of its own');
    if (cs.backgroundColor !== bgTok(d, 'var(--bg-card)')) bad('the sheet is not --bg-card');
    const sc2 = d.querySelector('.sdk-menu-scrim'); if (!sc2 || getComputedStyle(sc2).backgroundColor !== bgTok(d, 'var(--scrim)')) bad('the scrim is not --scrim');
    if (!d.querySelector('.sdk-menu-grip') || !d.querySelector('.sdk-menu-sheet .sdk-search input')) bad('the sheet has no handle or no search field');
    const rows = d.querySelectorAll('.sdk-menu-sheet .sdk-kind-option'); if (rows.length < 9) bad(`the sheet shows only ${rows.length} rows`);
    const r = sh.getBoundingClientRect(); const wr = d.defaultView.innerWidth; if (r.width < wr - 1) bad(`the sheet is ${r.width}px in a ${wr}px frame`);
    const ph = d.querySelector('.pm-phone-screen').getBoundingClientRect(); if (r.height > ph.height * 0.8 + 2) bad('the sheet is taller than 80% of the screen');
    const sr = d.querySelector('.sdk-menu-sheet .sdk-search').getBoundingClientRect(); if (sr.right > r.right - 4) bad('the sheet\'s search field runs to the sheet\'s edge');
  }

  // The date picker.
  { const d = get('Menus, date picker'); const days = d.querySelectorAll('.sdk-dp-day'); const phone = d.defaultView.innerWidth <= 640; const cs = (x) => getComputedStyle(x); const want = phone ? 44 : 30;
    for (const x of days) { const r = x.getBoundingClientRect(); if (Math.abs(r.width - want) > 0.6 || Math.abs(r.height - want) > 0.6) { bad(`a day cell is ${r.width} by ${r.height}, expected ${want}`); break; } }
    const pick = (sel) => d.querySelector(sel);
    const hover = pick('.sdk-dp-day.ds-force-hover:not(.inrange):not(.sel):not(.today)'); const hov = hover && cs(hover).backgroundColor; if (hov !== bgTok(d, HOVER)) bad(`a hovered day is ${hov}, not the quiet fill`);
    const sel = pick('.sdk-dp-day.sel'); if (cs(sel).backgroundColor !== tok(d, 'var(--accent)', 'backgroundColor') || cs(sel).color !== tok(d, 'var(--on-accent)')) bad('the chosen day is not the solid accent with --on-accent text');
    const today = pick('.sdk-dp-day.today:not(.sel)'); if (cs(today).backgroundColor !== bgTok(d, 'color-mix(in srgb, var(--selected-bg) 50%, transparent)')) bad(`today is ${cs(today).backgroundColor}, not the half-strength selected fill`);
    if (cs(today).borderTopColor !== 'rgba(0, 0, 0, 0)') bad('today has an outline');
    const range = pick('.sdk-dp-day.inrange:not(.ds-force-hover)'); if (cs(range).backgroundColor !== bgTok(d, HOVER)) bad(`a day in a range is ${cs(range).backgroundColor}, not the quiet fill`);
    const foc = pick('.sdk-dp-day.sel.ds-force-focus'); if (cs(foc).outlineStyle !== 'solid' || cs(foc).outlineColor !== tok(d, 'var(--on-accent)')) bad('the chosen day\'s focus ring is not --on-accent');
    const dis = pick('.sdk-dp-day:disabled'); if (cs(dis).opacity !== '0.5') bad('a disabled day is not half strength');
    const dow = pick('.sdk-dp-dow'); if (cs(dow).fontSize !== '11px') bad('the weekday names are not 11px');
    const dd = get('Menus, date picker on a phone'); const day = dd.querySelector('.sdk-dp-day'); if (Math.abs(day.getBoundingClientRect().width - 44) > 0.6) bad(`a day on a phone is ${day.getBoundingClientRect().width}px, expected 44`);
    const dpr = dd.querySelector('.sdk-dp').getBoundingClientRect(); if (dpr.right > dd.defaultView.innerWidth) bad('the date picker runs off a phone');
  }

  // The kind list.
  { const d = get('Menus, kind picker'); const cs = (x) => getComputedStyle(x); const list = d.querySelector('.sdk-kind-list');
    if (cs(list).borderTopLeftRadius !== '7px') bad(`the kind list corner is ${cs(list).borderTopLeftRadius}, not medium`);
    const title = d.querySelector('.sdk-kind-group-title'); if (cs(title).fontSize !== '11px' || cs(title).color !== tok(d, 'var(--text-dim)')) bad('a kind group title is not 11px --text-dim');
    const sel = d.querySelector('.sdk-kind-option[aria-selected="true"]'); if (cs(sel).fontWeight !== '700') bad('the chosen kind is not bold');
    if (cs(sel.querySelector('.sdk-kind-icon')).backgroundColor === 'rgba(0, 0, 0, 0)') bad('the chosen kind has no chip');
    const plain = d.querySelector('.sdk-kind-option[aria-selected="false"]:not(.active)'); if (cs(plain.querySelector('.sdk-kind-icon')).backgroundColor !== 'rgba(0, 0, 0, 0)') bad('an unchosen kind has a chip');
    const act = d.querySelector('.sdk-kind-option.active[aria-selected="false"]'); if (cs(act).backgroundColor !== bgTok(d, HOVER)) bad('the cursor kind row is not the quiet fill');
  }

  // Chat command menu: the cursor row; a call popover's heading.
  { const d = get('Menus, chat command menu'); const act = d.querySelector('.chat-command-item.active'); if (getComputedStyle(act).backgroundColor !== bgTok(d, HOVER)) bad('the chat command menu cursor row is not the quiet fill');
    const p = get('Menus, popovers'); const hd = p.querySelector('.sdk-popover-heading'); const cs = getComputedStyle(hd); if (cs.color !== tok(p, 'var(--text-dim)') || cs.fontSize !== '11px' || cs.textTransform !== 'uppercase') bad(`a popover heading is ${cs.color} ${cs.fontSize}, not the neutral 11px heading`);
    const pp = p.querySelector('.sdk-popover'); if (Math.abs(pp.querySelector('.sdk-popover-heading').getBoundingClientRect().left - pp.getBoundingClientRect().left - 15) > 0.6) bad('a popover is not padded 14px (plus its edge)'); }

  // Aliases: today's class names take the same surface (checked above for every surface) and the same row; the heading of .popover is neutral.
  { const d = get('Menus, aliases'); const want = d.defaultView.innerWidth <= 640 ? 44 : 32;
    for (const sel of ['.sdk-menu .sdk-menu-item', '.host-menu .host-menu-item', '.modules-menu .modules-menu-item', '.menu > button', '.chat-command-menu .chat-command-item', '.sdk-kind-list .sdk-kind-option']) {
      const els = d.querySelectorAll(sel); if (!els.length) { bad(`aliases: nothing for ${sel}`); continue; }
      for (const e of els) if (Math.abs(e.getBoundingClientRect().height - want) > 0.6) bad(`aliases: ${sel} is ${e.getBoundingClientRect().height}px, expected ${want}`);
    }
    const cs = (x) => getComputedStyle(x);
    const mo = d.querySelector('.modules-menu-item.on'); if (cs(mo).backgroundColor !== bgTok(d, 'var(--selected-bg)')) bad('aliases: .modules-menu-item.on is not the current fill');
    const badge = d.querySelector('.modules-menu-item .badge'); if (Math.abs(badge.getBoundingClientRect().height - 18) > 0.6) bad('aliases: the Modules count is not the 18px pill');
    const hd = d.querySelector('.popover h3'); if (cs(hd).color !== tok(d, 'var(--text-dim)')) bad('aliases: the .popover heading is still accent coloured');
    const dn = d.querySelector('.menu .danger'); if (cs(dn).color !== tok(d, MIXDNG)) bad('aliases: .menu .danger is not the danger text');
    const tag = d.querySelector('.host-menu-tag'); if (Math.abs(tag.getBoundingClientRect().height - 24) > 0.6) bad('aliases: .host-menu-tag is not the Chips tag (24px)');
    for (const x of [tag, badge]) { const r = x.getBoundingClientRect(); const row = x.parentElement.getBoundingClientRect(); if (r.top < row.top || r.bottom > row.bottom) bad('aliases: a count or tag sticks out of its row'); }
    const cat = d.querySelector('.host-menu-category[aria-expanded="true"]'); if (cs(cat).backgroundColor !== bgTok(d, HOVER)) bad('aliases: an open category does not keep the quiet fill');
    const swt = d.querySelector('.host-menu-switch'); if (Math.abs(swt.getBoundingClientRect().width - 36) > 0.6) bad('aliases: .host-menu-switch is not 36px wide');
  }

  // The keyboard demo: drive it with key events, as the arrow keys would.
  { const d = get('Menus, keyboard'); const win = d.defaultView; const key = (el, k) => el.dispatchEvent(new win.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    const trig = d.getElementById('tryTrigger'); const top = d.getElementById('tryMenu'); const fly = d.getElementById('tryFly');
    const names = () => d.activeElement.textContent.trim();
    top.hidden = true; fly.hidden = true; trig.focus(); key(trig, 'ArrowDown'); await wait(60);
    if (top.hidden || names() !== 'Edit') bad(`keyboard: Down on the trigger did not open the menu on its first row (${names()})`);
    key(d.activeElement, 'ArrowDown'); key(d.activeElement, 'ArrowDown'); await wait(30);
    if (names() !== 'Move to...') bad(`keyboard: Down twice from Edit reached ${names()}, expected Move to... (a disabled row is skipped)`);
    key(d.activeElement, 'ArrowRight'); await wait(60);
    if (fly.hidden || names() !== 'Today') bad(`keyboard: Right on Move to... did not open the flyout on its first row (${names()})`);
    const fr = fly.querySelector('[role="menuitem"]').getBoundingClientRect(); const cr = top.querySelector('[data-flyout]').getBoundingClientRect(); if (Math.abs(fr.top - cr.top) > 1.5) bad(`keyboard: the flyout's first row is ${fr.top - cr.top}px off the row that opened it`);
    key(d.activeElement, 'ArrowLeft'); await wait(60);
    if (!fly.hidden || names() !== 'Move to...') bad(`keyboard: Left did not close the flyout and return to its row (${names()})`);
    key(d.activeElement, 'ArrowRight'); await wait(40); key(d.activeElement, 'Escape'); await wait(40);
    if (!fly.hidden || names() !== 'Move to...') bad('keyboard: Escape in the flyout did not return to its row');
    key(d.activeElement, 'End'); await wait(30); if (names() !== 'Delete') bad(`keyboard: End reached ${names()}`);
    key(d.activeElement, 'ArrowDown'); await wait(30); if (names() !== 'Edit') bad(`keyboard: Down from the last row did not wrap (${names()})`);
    key(d.activeElement, 'ArrowUp'); await wait(30); if (names() !== 'Delete') bad(`keyboard: Up from the first row did not wrap (${names()})`);
    key(d.activeElement, 'Home'); await wait(30); if (names() !== 'Edit') bad(`keyboard: Home reached ${names()}`);
    const stops = [...top.querySelectorAll(':scope > [role^="menuitem"]')].filter((x) => x.tabIndex === 0).length; if (stops !== 1) bad(`keyboard: the menu has ${stops} tab stops, expected 1`);
    key(d.activeElement, 'Escape'); await wait(40); if (!top.hidden || d.activeElement !== trig) bad('keyboard: Escape did not close the menu and return to the trigger');
    key(trig, 'ArrowDown'); await wait(40); key(d.activeElement, 'ArrowDown'); key(d.activeElement, 'ArrowDown'); key(d.activeElement, 'ArrowDown'); await wait(40);
    if (names() !== 'Show notes') bad(`keyboard: the row after Move to... is ${names()}`);
    key(d.activeElement, 'Enter'); await wait(30); if (d.activeElement.getAttribute('aria-checked') !== 'false' || top.hidden) bad('keyboard: Enter on a tick-box row did not toggle it and keep the menu open');
    key(d.activeElement, 'Enter'); await wait(30);
    key(d.activeElement, 'End'); key(d.activeElement, 'Enter'); await wait(40); if (!top.hidden) bad('keyboard: Enter on a plain row did not close the menu');
    // Leave the demo as it was found.
    top.hidden = false; fly.hidden = true; trig.setAttribute('aria-expanded', 'true');
  }

  // The page: marked Approved and dated; the three later families named; the two old names gone from the undecided list.
  const blk = document.getElementById('menus');
  if (!blk || !blk.querySelector('.ds-st-approved') || blk.querySelector('.ds-st-proposed')) bad('the Menus family is not marked Approved');
  if (!blk || !/Approved 2026-10-19/.test(blk.textContent)) bad('the Menus family has no Approved 2026-10-19 note');
  if (!blk || (blk.textContent.match(/Decided 2026-10-19/g) || []).length < 3) bad('the Menus family does not mark the shadow, the scrim and the hover as Decided 2026-10-19');
  for (const id of ['u-dialogs-and-sheets', 'u-toasts-and-banners', 'u-tooltips']) if (document.getElementById(id)) bad(`${id} is still listed as Not yet decided (the Feedback families are drawn now)`);
  for (const id of ['u-menus-and-flyouts', 'u-popovers-and-sheets', 'u-banners-notices-and-toasts']) if (document.getElementById(id)) bad(`${id} is still listed as Not yet decided`);
  if (!blk || !/Dialogs and sheets/.test(blk.textContent) || !/Tooltips/.test(blk.textContent) || !/Which to decide next/.test(blk.textContent)) bad('the Menus family does not name the three later families and which to decide next');
  return JSON.stringify(out);
};
