/*
 * check-design-system-cards.mjs -- the Cards, panels and rows family of the proposed design system page (public/design-system/proposed-cards.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a surface step that is not its token (panel --bg-section, card --bg-card, a row on a panel --bg-card, a row inside a card --bg-input), a corner that is not
 * the token (card and panel large, a row on a panel medium, a row in a card small), a shadow at rest (only a dragged card has one), a gradient, a hairline that is not 1px
 * and the neutral --border (a row inside a card keeps a transparent one), a coloured one-sided border anywhere (the Calendar bar is the declared exception: three rows in
 * one frame, a 3px block that is not a border, nowhere else), hover or selected that is not a fill (selected = --selected-bg), a focus that is not a 2px outline at offset
 * -2px (all four sides the same at 1.25x and 1.5x), a phone row under 44px or a tick or "..." hit area under 44px, a row wider than 38px at desktop, a card with more than
 * one primary button, a menu slot that is not 30px at the top right, a group header that is not 12px, weight 600, letter-spaced, upper case with the hairline, an empty
 * state with a box, an alias that does not look like the new name, a frame that scrolls sideways, the family not marked Approved and dated 2026-10-19 (with the radii, paddings, group header and ghost slot marked Decided 2026-10-19), a --shadow-1 that is not 0 2px 8px (it must be smaller than the menus --shadow-2), the two names not taken out of the
 * undecided list, a missing note that the toast and the status chip belong to other families; in the stylesheet: a gradient, a hex colour, a one-sided coloured border,
 * a shadow other than none and --shadow-1, a name not defined.
 */
export const id = 'cards';
export const todayOnly = [];

export function staticChecks({ fail, css, js, defined, DS }) {
  if (/gradient/i.test(css)) fail('proposed-cards.css: a gradient (the cards lose them)');
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-cards.css: a hex colour (tokens only)');
  if (/border-(left|right|top|bottom)\s*:[^;]*(accent|danger|ok|tint|color-mix|rgb|#)/i.test(css)) fail('proposed-cards.css: a coloured one-sided border (a bar is the Calendar exception only, and it is a block, not a border)');
  if (/border-(left|right|top)\s*:/.test(css)) fail('proposed-cards.css: a border on one side other than the divider under a group header');
  for (const m of css.matchAll(/box-shadow\s*:\s*([^;]+);/g)) if (!/^(none|var\(--shadow-1\))$/.test(m[1].trim())) fail(`proposed-cards.css: box-shadow ${m[1].trim()} (only none, and --shadow-1 while dragging)`);
  if (!/\.is-dragging\s*\{[^}]*box-shadow:\s*var\(--shadow-1\)/.test(css)) fail('proposed-cards.css: the dragged card has no --shadow-1');
  if (/--shadow-1\s*:/.test(css)) fail('proposed-cards.css: --shadow-1 is defined here (it is the Foundations token, 0 1px 4px)');
  if ((css.match(/rgba?\(/g) || []).length !== 0) fail('proposed-cards.css: a colour written out (the shadow comes from the Foundations token)');
  const bars = css.match(/\.sdk-bar-kept/g) || [];
  if (!/\.sdk-bar-kept\s*\{[^}]*border-top-left-radius:\s*0;[^}]*border-bottom-left-radius:\s*0/.test(css)) fail('proposed-cards.css: the kept bar box is not square on the bar side');
  if (/\.sdk-bar-kept\s*\{[^}]*overflow/.test(css)) fail('proposed-cards.css: the kept bar box hides its overflow (the corner would clip the bar)');
  if (!/\.sdk-bar-kept::before\s*\{[^}]*width:\s*3px;[^}]*border-radius:\s*0/.test(css)) fail('proposed-cards.css: the kept bar is not a square 3px block');
  if (bars.length !== 2) fail(`proposed-cards.css: .sdk-bar-kept is in ${bars.length} rules, expected 2 (the padding and the bar)`);
  if ((js.match(/bar: true/g) || []).length !== 3) fail('proposed-cards.js: the Calendar bar is used other than on the three exception rows');
  for (const c of ['sdk-panel', 'sdk-card', 'sdk-row', 'sdk-group-head', 'sdk-empty', 'sdk-card-head', 'sdk-card-icon', 'sdk-card-title', 'sdk-card-sub', 'sdk-card-body', 'sdk-card-foot',
    'sdk-card-menu', 'sdk-row-main', 'sdk-row-title', 'sdk-row-meta', 'sdk-row-tick', 'sdk-open', 'sdk-card-home', 'sdk-card-add', 'sdk-callout',
    'section', 'panel', 'card', 'tile', 'rcard', 'user-card', 'module-settings-card', 'editor-card', 'bgpick-card', 'aside-overlay-card', 'space-choice', 'space-choice-add',
    'place-row', 'cat-line', 'result', 'switch-row', 'module-display-row', 'opt', 'empty', 'rs-empty', 'state', 'option-help']) {
    if (!defined.has(c)) fail(`the proposed stylesheets do not define the cards name .${c} (a new name or a kept alias)`);
  }
}

export async function browserChecks(b) {
  const { ev, cdp, sessionId, sc, where, problems, edgeColours } = b;
  const cp = JSON.parse(await ev(`(${cardsProbe.toString()})()`));
  for (const x of cp.problems) problems.push(`${where}: ${x}`);
  // The focus outline of a card and of a row: all four sides the same at a fractional device pixel ratio and page offset (the Fields' and Tabs' method).
  if (sc.width >= 500) {
    for (const dsf of [1.25, 1.5]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: dsf, mobile: false }, sessionId);
      await new Promise((r) => setTimeout(r, 400));
      for (const [nm, title, sel, idx] of [['card', 'Cards, states', '.sdk-card', 3], ['row', 'Rows, states', '.sdk-row', 3]]) {
        for (const nudge of [0.3, 0.7]) {
          const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === ${JSON.stringify(title)}); const d = m.iframe.contentDocument; const el = d.querySelectorAll(${JSON.stringify(sel)})[${idx}]; el.scrollIntoView({ block: 'center', behavior: 'instant' });
            const c = document.getElementById('ds-content'); c.style.marginTop = '${nudge}px'; c.style.marginLeft = '${nudge * 1.7 % 1}px'; window.scrollTo(0, Math.round(window.scrollY) + ${nudge}); await new Promise((r) => setTimeout(r, 150));
            const cv = document.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = getComputedStyle(el).outlineColor; g.fillRect(0, 0, 1, 1); const px = g.getImageData(0, 0, 1, 1).data;
            const b = el.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height, col: 'rgb(' + px[0] + ',' + px[1] + ',' + px[2] + ')' }); })()`));
          const pad = 6;
          const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x - pad, y: at.y - pad, width: at.w + pad * 2, height: at.h + pad * 2, scale: 1 } }, sessionId);
          const e = edgeColours(Buffer.from(shot.data, 'base64'), at.col.match(/[\d.]+/g).map(Number), dsf, pad, at.w, at.h);
          const vals = Object.values(e);
          if (Math.max(...vals) - Math.min(...vals) > 40) problems.push(`${where}: the focused ${nm} outline is not the same on all four sides at ${dsf}x with the page ${nudge}px off the pixel grid (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
          if (Math.max(...vals) > 60) problems.push(`${where}: a side of the focused ${nm} outline never reaches its full colour at ${dsf}x (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
        }
      }
      await ev(`(() => { const c = document.getElementById('ds-content'); c.style.marginTop = ''; c.style.marginLeft = ''; })()`);
    }
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
    await new Promise((r) => setTimeout(r, 300));
  }
}

// Measured in the page (runs in the browser).
const cardsProbe = async () => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^(Cards|Rows)/.test(t) && !/contrast/.test(t));
  if (TITLES.length < 14) bad(`the Cards family has only ${TITLES.length} frames`);
  const tok = (d, n, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = n; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const bgTok = (d, n) => tok(d, `var(${n})`, 'backgroundColor');
  const rTok = (d, n) => tok(d, `var(${n})`, 'borderTopLeftRadius');
  const cs = (e, p) => getComputedStyle(e, p);
  // The end cap (decided 2026-10-21): a straight 3px block the full height of its box, square corners, and the box square on the bar side only.
  const barOk = (el, nm) => {
    const c = cs(el); const b = cs(el, '::before'); const r = el.getBoundingClientRect(); const px = parseFloat;
    if (b.width !== '3px') bad(`${nm}: the end cap is ${b.width} wide, expected 3px`);
    if (Math.abs(px(b.height) - r.height) > 0.5 || px(b.top) !== -px(c.borderTopWidth) || px(b.bottom) !== -px(c.borderBottomWidth) || px(b.left) !== -px(c.borderLeftWidth)) bad(`${nm}: the end cap (${b.height} high, top ${b.top}, left ${b.left}) is not the full height of its ${r.height}px box`);
    for (const k of ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight']) if (b['border' + k + 'Radius'] !== '0px') bad(`${nm}: the end cap has a rounded corner (${k})`);
    if (c.borderTopLeftRadius !== '0px' || c.borderBottomLeftRadius !== '0px') bad(`${nm}: the box is rounded on the bar side (${c.borderTopLeftRadius} ${c.borderBottomLeftRadius})`);
    if (c.borderTopRightRadius === '0px' || c.borderBottomRightRadius === '0px') bad(`${nm}: the box lost its radius on the other side`);
    if (c.boxShadow !== 'none') bad(`${nm}: a shadow on a box with an end cap`);
  };
  const phone = (d) => d.defaultView.innerWidth <= 640;
  await wait(100);
  // Every box of every frame: no gradient, no shadow at rest, no coloured one-sided border.
  for (const t of TITLES) {
    const d = get(t); if (!d) { bad(`no frame ${t}`); continue; }
    if (d.documentElement.scrollWidth > d.documentElement.clientWidth + 1) bad(`${t}: scrolls sideways`);
    const border = tok(d, 'var(--border)');
    for (const el of d.querySelectorAll('.ds-proposed *')) {
      const c = cs(el); const nm = `${t}: ${el.className || el.tagName}`;
      if (c.backgroundImage !== 'none' && /gradient/.test(c.backgroundImage)) bad(`${nm}: a gradient`);
      if (el.matches('.sdk-card, .sdk-row, .sdk-panel, .sdk-callout, .sdk-empty, .card, .tile, .rcard, .section, .place-row, .cat-line, .result, .opt, .option-help') && c.boxShadow !== 'none' && !el.classList.contains('is-dragging')) bad(`${nm}: a shadow at rest (${c.boxShadow})`);
      const sides = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({ w: c['border' + s + 'Width'], col: c['border' + s + 'Color'], st: c['border' + s + 'Style'] }));
      const shown = sides.map((s) => (s.st === 'none' || s.w === '0px' ? null : s));
      const some = shown.filter(Boolean);
      if (some.length && some.length < 4) { // a one-sided edge: only the neutral divider
        for (const s of some) if (s.col !== border) bad(`${nm}: a coloured one-sided border (${s.col})`);
      }
      if (some.length === 4) { const k = new Set(some.map((s) => s.w + s.col + s.st)); if (k.size > 1) bad(`${nm}: the four edges differ (${[...k].join(' | ')})`); }
      // A thin block drawn down a side (the bar): only the declared Calendar exception.
      for (const ps of ['::before', '::after']) {
        const p = cs(el, ps); if (p.content === 'none' || p.position !== 'absolute') continue;
        if (!el.matches('.sdk-bar-kept') && /^(\d(\.\d+)?)px$/.test(p.width) && parseFloat(p.width) <= 4 && p.backgroundColor !== 'rgba(0, 0, 0, 0)' && !/checkbox|radio/.test(el.type || '')) bad(`${nm}: a thin coloured block (${p.width}) drawn on a side, outside the Calendar exception`);
      }
    }
  }
  // The exception: three rows, one frame, a 3px block, the same hairline and corner as any row.
  { let n = 0; for (const t of TITLES) { const d = get(t); const k = d.querySelectorAll('.sdk-bar-kept').length; if (k && t !== 'Cards, left bar replacements') bad(`${t}: the Calendar bar is used outside its frame`); n += k; }
    if (n !== 3) bad(`the Calendar exception shows ${n} rows, expected 3`);
    const d = get('Cards, left bar replacements'); for (const r of d.querySelectorAll('.sdk-bar-kept')) barOk(r, 'Cards exception row'); const r = d.querySelector('.sdk-bar-kept'); if (r) { const p = cs(r, '::before'); if (p.width !== '3px') bad(`the Calendar bar is ${p.width}, expected 3px`); if (cs(r).borderLeftWidth !== '1px' || cs(r).borderLeftColor !== tok(d, 'var(--border)')) bad('the Calendar row has a coloured or heavy edge, not the hairline');
      if (!/Exception, kept/.test(d.body.textContent)) bad('the Calendar exception is not flagged "Exception, kept" in its frame'); } }
  // Surface steps, corners and the hairline, on the real components.
  // Paddings (decided 2026-10-21, on the spacing scale): panel 16 at every width, card 12, row 8 by 10 (8 + 2), Home card 20.
  { const d = get('Cards, nested rows'); const pn = d.querySelector('.sdk-panel'), cd = d.querySelector('.sdk-card'), rw = d.querySelector('.sdk-panel > .pm-cd-two > div > .sdk-list > .sdk-row') || d.querySelector('.sdk-row');
    if (cs(pn).paddingTop !== '16px' || cs(pn).paddingLeft !== '16px') bad(`the panel padding is ${cs(pn).paddingTop} ${cs(pn).paddingLeft}, expected 16px at every width`);
    if (cs(cd).paddingTop !== '12px' || cs(cd).paddingLeft !== '12px') bad(`the card padding is ${cs(cd).paddingTop} ${cs(cd).paddingLeft}, expected 12px`);
    if (cs(rw).paddingTop !== '8px' || cs(rw).paddingLeft !== '10px') bad(`the row padding is ${cs(rw).paddingTop} ${cs(rw).paddingLeft}, expected 8px 10px`); }
  { const d = get('Cards, nested rows'); const panel = d.querySelector('.sdk-panel'); const card = d.querySelector('.sdk-card'); const inner = card.querySelector('.sdk-row'); const onPanel = d.querySelector('.sdk-panel > .pm-cd-two > div > .sdk-list > .sdk-row');
    const border = tok(d, 'var(--border)');
    if (cs(panel).backgroundColor !== bgTok(d, '--bg-section')) bad(`the panel is ${cs(panel).backgroundColor}, not --bg-section`);
    if (cs(card).backgroundColor !== bgTok(d, '--bg-card')) bad(`the card is ${cs(card).backgroundColor}, not --bg-card`);
    if (cs(inner).backgroundColor !== bgTok(d, '--bg-input')) bad(`a row inside a card is ${cs(inner).backgroundColor}, not --bg-input`);
    if (!onPanel || cs(onPanel).backgroundColor !== bgTok(d, '--bg-card')) bad('a row on a panel is not --bg-card');
    for (const [el, nm, rad] of [[panel, 'panel', '--radius-large'], [card, 'card', '--radius-large'], [inner, 'row in a card', '--radius-small'], [onPanel, 'row on a panel', '--radius-medium']]) {
      if (!el) continue; if (cs(el).borderTopLeftRadius !== rTok(d, rad)) bad(`the ${nm} corner is ${cs(el).borderTopLeftRadius}, not ${rad}`);
    }
    for (const [el, nm] of [[panel, 'panel'], [card, 'card'], [onPanel, 'row on a panel']]) for (const s of ['Top', 'Right', 'Bottom', 'Left']) { if (!el) continue; if (cs(el)['border' + s + 'Width'] !== '1px' || cs(el)['border' + s + 'Color'] !== border || cs(el)['border' + s + 'Style'] !== 'solid') bad(`the ${nm} ${s.toLowerCase()} edge is not a 1px neutral --border hairline`); }
    for (const s of ['Top', 'Right', 'Bottom', 'Left']) { if (cs(inner)['border' + s + 'Width'] !== '1px' || cs(inner)['border' + s + 'Color'] !== 'rgba(0, 0, 0, 0)') bad(`a row inside a card does not drop its edge (${s.toLowerCase()} is ${cs(inner)['border' + s + 'Color']})`); }
    // The surface-steps frame itself draws the five steps from the tokens.
    const ds = get('Cards, surface steps'); const steps = [...ds.querySelectorAll('.pm-cd-step')]; if (steps.length < 6) bad('the surface steps frame shows fewer than six boxes');
  }
  // States: cards and rows.
  for (const [title, sel, nm] of [['Cards, states', '.sdk-card', 'card'], ['Rows, states', '.sdk-row', 'row']]) {
    const d = get(title); const els = [...d.querySelectorAll(sel)]; const [rest, hov, selc, foc, prs, a, b2] = els; const c = (x) => cs(x);
    const dis = nm === 'card' ? els[6] : els[5]; const plain = els[els.length - 1];
    if (c(hov).backgroundColor === c(rest).backgroundColor) bad(`${nm}: the forced hover does not change the fill`);
    if (c(plain).backgroundColor !== c(rest).backgroundColor) bad(`${nm}: a ${nm} that opens nothing has a different fill from one at rest`);
    if (c(hov).boxShadow !== 'none' || c(hov).borderTopColor !== c(rest).borderTopColor) bad(`${nm}: hover changes the edge or adds a shadow`);
    if (c(selc).backgroundColor !== bgTok(d, '--selected-bg')) bad(`${nm}: selected is ${c(selc).backgroundColor}, not --selected-bg (${bgTok(d, '--selected-bg')})`);
    if (c(selc).borderTopColor !== c(rest).borderTopColor) bad(`${nm}: selected changes the edge`);
    if (c(prs).backgroundColor === c(hov).backgroundColor) bad(`${nm}: pressed looks like hover`);
    if (!(c(foc).outlineWidth === '2px' && c(foc).outlineStyle === 'solid' && c(foc).outlineOffset === '-2px')) bad(`${nm}: the focus is not a 2px outline at offset -2px (${c(foc).outlineWidth} ${c(foc).outlineStyle} ${c(foc).outlineOffset})`);
    if (c(foc).outlineColor !== tok(d, 'var(--accent)')) bad(`${nm}: the focus outline is not --accent (${c(foc).outlineColor})`);
    if (c(rest).outlineStyle !== 'none') bad(`${nm}: an outline at rest`);
    if (c(dis).opacity !== '0.5') bad(`${nm}: disabled is not half strength (${c(dis).opacity})`);
    if (nm === 'card') { const drag = els[5]; if (c(drag).boxShadow === 'none') bad('a dragged card has no shadow'); }
    if (Math.abs(c(rest).paddingLeft.replace('px', '') - (nm === 'card' ? 12 : 10)) > 1.1) bad(`${nm}: padding ${c(rest).paddingLeft}`);
  }
  // Rows: height 38 (44 on a phone), padding 8 by 10 (the edge is 1px), at most one primary button in a box, the menu slot.
  for (const t of TITLES) {
    const d = get(t); const want = phone(d) ? 44 : 38;
    for (const el of d.querySelectorAll('.sdk-row')) { const h = el.getBoundingClientRect().height; if (h < want - 0.6) bad(`${t}: a row is ${h}px high, under ${want}`); }
    for (const el of d.querySelectorAll('.sdk-card, .sdk-row')) { const n = [...el.querySelectorAll('.btn-primary')].filter((x) => x.closest('.sdk-card, .sdk-row') === el).length; if (n > 1) bad(`${t}: a box has ${n} primary buttons`); }
  }
  { const d = get('Rows, parts'); const r = d.querySelector('.sdk-row'); const want = phone(d) ? 44 : 38; if (Math.abs(r.getBoundingClientRect().height - want) > 0.6) bad(`a plain row is ${r.getBoundingClientRect().height}px, expected ${want}`);
    const m = d.querySelector('.sdk-row > .sdk-icon-btn'); if (!m || Math.abs(m.getBoundingClientRect().height - 30) > 0.6 || !m.classList.contains('btn-quiet') || !m.classList.contains('btn-small')) bad('the row menu is not the 30px Quiet small icon button');
    const tall = d.querySelectorAll('.sdk-row')[1]; if (Math.abs(tall.getBoundingClientRect().height - want) > 0.6) bad(`a row with a tick and a due label is ${tall.getBoundingClientRect().height}px, expected ${want}`); }
  // The card menu slot: 30px, top right, 8px in.
  { const d = get('Cards, parts'); for (const card of d.querySelectorAll('.sdk-card:has(> .sdk-card-menu)')) { const s = card.querySelector(':scope > .sdk-card-menu').getBoundingClientRect(); const c = card.getBoundingClientRect();
      if (Math.abs(s.width - 30) > 0.6 || Math.abs(s.height - 30) > 0.6) bad(`the card menu slot is ${s.width} by ${s.height}`);
      if (Math.abs(s.top - c.top - 9) > 1.1 || Math.abs(c.right - s.right - 9) > 1.1) bad(`the card menu slot is not 8px in from the top right (${s.top - c.top}, ${c.right - s.right})`);
      const t = card.querySelector('.sdk-card-title').getBoundingClientRect(); if (t.right > s.left + 0.5) bad('the card title runs under the menu slot'); } }
  // A phone: 44px rows, a 44px tick and "..." hit area, the whole open row is a target.
  { const d = get('Rows, on a phone'); if (d.defaultView.innerWidth > 640) bad('the phone frame is wider than a phone');
    const rows = [...d.querySelectorAll('.sdk-row')]; if (rows.length < 3) bad('the phone frame shows fewer than three rows');
    for (const r of rows) if (Math.abs(r.getBoundingClientRect().height - 44) > 0.6 && !r.querySelector('.sdk-row-sub')) bad(`a phone row is ${r.getBoundingClientRect().height}px, expected 44`);
    for (const r of rows) if (r.getBoundingClientRect().height < 43.4) bad('a phone row is under 44px');
    const tick = d.querySelector('.sdk-row-tick'); const tb = tick.getBoundingClientRect(); if (tb.width < 43.4 || tb.height < 43.4) bad(`the phone tick hit area is ${tb.width} by ${tb.height}, under 44`);
    const rb = tick.closest('.sdk-row').getBoundingClientRect(); if (tb.left < rb.left - 0.5 || tb.right > rb.right + 0.5) bad('the phone tick hit area sticks out of its row');
    const m = d.querySelector('.sdk-row > .sdk-icon-btn'); const a = cs(m, '::after'); const mb = m.getBoundingClientRect();
    if (Math.abs(mb.height - 30) > 0.6) bad('the phone "..." button does not keep its 30px look'); if (a.content === 'none' || parseFloat(a.height) < 43.4 && parseFloat(a.top) > -6) bad(`the phone "..." button has no 44px hit area (${a.content}, ${a.height})`);
    const hit = d.elementFromPoint(mb.left + mb.width / 2, mb.top - 6); if (!hit || hit.closest('.sdk-icon-btn') !== m) bad('a press 6px above the "..." button on a phone does not reach it');
    const open = d.querySelectorAll('.sdk-row')[2]; const ob = open.getBoundingClientRect(); const at = d.elementFromPoint(ob.left + 40, ob.top + ob.height / 2); if (!at || !at.closest('.sdk-open')) bad('the whole open row is not a target on a phone'); }
  // Group header, empty state, callout.
  { const d = get('Cards, empty and group header'); const g = d.querySelector('.sdk-group-head'); const c = cs(g);
    if (c.fontSize !== '12px' || c.fontWeight !== '600' || c.textTransform !== 'uppercase' || Math.abs(parseFloat(c.letterSpacing) - 0.48) > 0.02) bad(`the group header is ${c.fontSize} / ${c.fontWeight} / ${c.letterSpacing} / ${c.textTransform}, expected 12px, 600, 0.48px (0.04em), uppercase`);
    if (c.color !== tok(d, 'var(--text-dim)')) bad(`the group header is not --text-dim (${c.color})`);
    if (c.borderBottomWidth !== '1px' || c.borderBottomColor !== tok(d, 'var(--border)') || c.borderTopWidth !== '0px') bad('the group header divider is not a 1px --border line under it');
    const e = d.querySelector('.sdk-empty'); const ec = cs(e); if (ec.borderTopWidth !== '0px' || ec.backgroundColor !== 'rgba(0, 0, 0, 0)' || ec.boxShadow !== 'none') bad('the empty state has a box');
    if (!e.querySelector('i') || !e.querySelector('p')) bad('the empty state has no icon and line');
    const callout = get('Cards, left bar replacements').querySelector('.sdk-callout'); const cc = cs(callout); if (cc.borderTopWidth !== '1px' || !callout.querySelector('i')) bad('the callout is not a hairline with an icon'); }
  // Home card and ghost.
  { const d = get('Cards, Home card and ghost'); const home = d.querySelector('.sdk-card-home'); if (cs(home).paddingLeft !== '20px') bad(`the Home card padding is ${cs(home).paddingLeft}, expected 20px`);
    const ghost = d.querySelector('.sdk-card-add'); const gc = cs(ghost); if (gc.borderTopStyle !== 'dashed' || gc.borderTopWidth !== '1px' || gc.borderTopColor !== tok(d, 'var(--border)')) bad(`the ghost edge is ${gc.borderTopWidth} ${gc.borderTopStyle} ${gc.borderTopColor}, expected a dashed 1px --border`);
    const gh = d.querySelectorAll('.sdk-card-add'); if (cs(gh[1]).backgroundColor === cs(gh[0]).backgroundColor) bad('the ghost hover does not change the fill'); if (cs(gh[2]).outlineWidth !== '2px') bad('the ghost focus is not a 2px outline');
    const btn = home.querySelector('.btn'); if (Math.abs(btn.getBoundingClientRect().height - (phone(d) ? 44 : 38)) > 0.6) bad('a Home card button is not the default height'); }
  // The tints stay on the icon and its words.
  { const d = get('Cards, parts'); const t = d.querySelectorAll('.sdk-card[data-tint]'); if (t.length < 8) bad('fewer than eight tinted cards'); for (const c of t) { if (cs(c).backgroundColor !== bgTok(d, '--bg-card')) bad('a tinted card has its own fill'); if (cs(c).borderTopColor !== tok(d, 'var(--border)')) bad('a tinted card has a coloured edge'); } }
  // Aliases take the look.
  { const d = get('Cards, aliases'); const card = bgTok(d, '--bg-card'); const rl = rTok(d, '--radius-large');
    for (const sel of ['.card', '.tile', '.rcard']) { const el = d.querySelector(sel); if (!el) { bad(`aliases: no ${sel}`); continue; } if (cs(el).backgroundColor !== card || cs(el).borderTopLeftRadius !== rl || cs(el).boxShadow !== 'none' || cs(el).borderTopWidth !== '1px') bad(`aliases: ${sel} does not look like .sdk-card`); }
    const sec = d.querySelector('.section'); if (cs(sec).backgroundColor !== bgTok(d, '--bg-section')) bad('aliases: .section is not --bg-section');
    for (const sel of ['.empty', '.rs-empty', '.state']) { const el = d.querySelector(sel); if (!el || cs(el).borderTopWidth !== '0px' || cs(el).textAlign !== 'center') bad(`aliases: ${sel} is not the empty state`); }
    const pr = d.querySelector('.rcard .place-row'); if (cs(pr).backgroundColor !== bgTok(d, '--bg-input') || cs(pr).borderTopColor !== 'rgba(0, 0, 0, 0)') bad('aliases: a .place-row in a card does not drop its edge');
    if (!d.querySelector('.option-help') || cs(d.querySelector('.option-help')).borderTopWidth !== '1px') bad('aliases: .option-help is not a hairline'); }
  // The page: the family is Proposed, dated; the two names are out of the undecided list; the other families are named.
  const doc = document; const blk = doc.getElementById('cards');
  if (!blk || !blk.querySelector('.ds-st-approved') || blk.querySelector('.ds-st-proposed')) bad('the Cards family is not marked Approved');
  if (!blk || !/Approved 2026-10-19/.test(blk.textContent)) bad('the Cards family has no Approved 2026-10-19 note');
  if (!blk || !/Decided 2026-10-19/.test(blk.textContent)) bad('the Cards family does not mark the radii, paddings, group header and ghost slot as Decided 2026-10-19');
  for (const id of ['u-cards-panels-and-rows', 'u-home-cards-and-the-ghost-slot']) if (doc.getElementById(id)) bad(`${id} is still listed as Not yet decided`);
  if (!/Toasts family/.test(blk ? blk.textContent : '') || !/Chips family/.test(blk ? blk.textContent : '')) bad('the Cards family does not say the toast and the status chip belong to other families');
  if (!/Taken as drawn/.test(blk ? blk.textContent : '')) bad('the Cards family does not list what was taken as drawn');
  // Overflow at each width of the context mock.
  for (const w of [390, 700, 1280]) { const d = get(`Cards at ${w}`); if (!d) { bad(`no frame Cards at ${w}`); continue; } await wait(100);
    if (d.documentElement.scrollWidth > d.documentElement.clientWidth + 1) bad(`Cards at ${w}: scrolls sideways`);
    const want = w <= 640 ? 44 : 38; for (const r of d.querySelectorAll('.sdk-row')) if (r.getBoundingClientRect().height < want - 0.6) bad(`Cards at ${w}: a row is under ${want}px`);
    const tool = d.querySelector('.pm-cd-tool'); for (const x of tool.querySelectorAll('.btn, .sdk-tab, .sdk-search input')) if (Math.abs(x.getBoundingClientRect().height - want) > 0.6) bad(`Cards at ${w}: a toolbar item is ${x.getBoundingClientRect().height}px, expected ${want}`); }
  return JSON.stringify(out);
};
