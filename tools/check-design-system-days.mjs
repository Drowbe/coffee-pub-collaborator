/*
 * check-design-system-days.mjs -- the Day cards and day chips family of the proposed design system page (public/design-system/legacy/system-v1/proposed-days.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a day card that is not the Cards card (--bg-card, a 1px neutral --border on all four edges, --radius-large, 12px padding, no shadow); a gradient, a glow
 * or a shadow anywhere in a frame; an accent border or ring on any day card, current included; a solid accent date block; a date block that is not the neutral fill
 * with the day at 22px weight 600 and the weekday at 11px in capitals; a head with a wash; a current card that is not --selected-bg; a "Today" label missing on a
 * today card, or a phase without its status label; a day chip that is not a neutral chip (40px, 44px at 390, all the same height), a current chip that is not
 * --selected-bg, a lift or shadow, a coloured border, an in-trip chip without its 7px dot, a today chip without its 4px dot, a hover that is not a fill, a focus that
 * is not a 2px accent outline at -2px (the same on four sides at 1.25x and 1.5x); a gap count with a border; an alias that does not look like the new name; the
 * Add word showing on a phone; in the stylesheet a gradient, a hex colour, a transform, a shadow or an accent block; the family not marked Approved.
 */
export const id = 'days';
export const todayOnly = [];

export function staticChecks({ fail, css, js, defined }) {
  if (/gradient/i.test(css)) fail('proposed-days.css: a gradient (the head wash is gone)');
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-days.css: a hex colour');
  if (/border-(left|right|top|bottom)\s*:/.test(css)) fail('proposed-days.css: a border on one side');
  if (/box-shadow\s*:\s*(?!\s|none)/.test(css)) fail('proposed-days.css: a box-shadow other than none (the glow and the lift are gone)');
  if (/(?<![-\w])transform\s*:\s*(?!\s|none)/.test(css)) fail('proposed-days.css: a transform (the day chip no longer lifts)');
  if (/(dnum|sdk-day-date)[^{]*\{[^}]*background:\s*var\(--accent\)/.test(css)) fail('proposed-days.css: the date block is a solid accent block');
  if (!/ds-st-approved/.test(js) || /ds-st-proposed/.test(js)) fail('proposed-days.js: the family is not marked Approved');
  for (const c of ['sdk-day', 'sdk-day-head', 'sdk-day-date', 'sdk-day-main', 'sdk-day-labels', 'sdk-day-actions', 'sdk-day-empty', 'sdk-daychip', 'sdk-daychip-dot', 'sdk-daystrip', 'sdk-gap', 'sdk-gapcount',
    'day2', 'day-head2', 'dnum', 'dmeta', 'day-actions', 'daychip', 'gapcount', 'day-empty-add', 'is-current', 'is-today']) if (!defined.has(c)) fail(`the proposed stylesheets do not define the days name .${c}`);
}

export async function browserChecks(b) {
  const { ev, cdp, sessionId, sc, where, problems, edgeColours } = b;
  const cp = JSON.parse(await ev(`(${daysProbe.toString()})()`));
  for (const x of cp.problems) problems.push(`${where}: ${x}`);
  if (sc.width >= 500) {
    for (const dsf of [1.25, 1.5]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: dsf, mobile: false }, sessionId);
      await new Promise((r) => setTimeout(r, 400));
      for (const nudge of [0.3, 0.7]) {
        const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Days, day chip'); const d = m.iframe.contentDocument; const el = d.querySelectorAll('.sdk-daychip')[3]; el.scrollIntoView({ block: 'center', behavior: 'instant' });
          const c = document.getElementById('ds-content'); c.style.marginTop = '${nudge}px'; c.style.marginLeft = '${nudge * 1.7 % 1}px'; window.scrollTo(0, Math.round(window.scrollY) + ${nudge}); await new Promise((r) => setTimeout(r, 150));
          const cv = document.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = getComputedStyle(el).outlineColor; g.fillRect(0, 0, 1, 1); const px = g.getImageData(0, 0, 1, 1).data;
          const bb = el.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + bb.left + window.scrollX, y: fr.top + bb.top + window.scrollY, w: bb.width, h: bb.height, col: 'rgb(' + px[0] + ',' + px[1] + ',' + px[2] + ')' }); })()`));
        const pad = 6;
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x - pad, y: at.y - pad, width: at.w + pad * 2, height: at.h + pad * 2, scale: 1 } }, sessionId);
        const e = edgeColours(Buffer.from(shot.data, 'base64'), at.col.match(/[\d.]+/g).map(Number), dsf, pad, at.w, at.h);
        const vals = Object.values(e);
        if (Math.max(...vals) - Math.min(...vals) > 40) problems.push(`${where}: the focused day chip outline is not the same on all four sides at ${dsf}x with the page ${nudge}px off the pixel grid (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
        if (Math.max(...vals) > 60) problems.push(`${where}: a side of the focused day chip outline never reaches its full colour at ${dsf}x`);
      }
      await ev(`(() => { const c = document.getElementById('ds-content'); c.style.marginTop = ''; c.style.marginLeft = ''; })()`);
    }
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
    await new Promise((r) => setTimeout(r, 300));
  }
}

const daysProbe = async () => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^Days, /.test(t) && !/contrast/.test(t));
  if (TITLES.length < 8) bad(`the Days family has only ${TITLES.length} frames`);
  const cs = (e, p) => getComputedStyle(e, p);
  const tok = (d, expr, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = expr; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const bg = (d, expr) => tok(d, expr, 'backgroundColor');
  const rad = (d, n) => tok(d, `var(${n})`, 'borderTopLeftRadius');
  const phone = (d) => d.defaultView.innerWidth <= 640;
  await wait(100);
  for (const t of TITLES) {
    const d = get(t); if (!d) { bad(`no frame ${t}`); continue; }
    if (d.documentElement.scrollWidth > d.documentElement.clientWidth + 1) bad(`${t}: scrolls sideways`);
    const accent = tok(d, 'var(--accent)', 'backgroundColor');
    for (const el of d.querySelectorAll('.ds-proposed *')) {
      const c = cs(el); const nm = `${t}: ${el.className || el.tagName}`;
      if (/gradient/.test(c.backgroundImage)) bad(`${nm}: a gradient`);
      if (el.matches('.sdk-day, .sdk-day *, .sdk-daychip, .daychip, .day2, .day2 *, .sdk-gapcount, .gapcount') && c.boxShadow !== 'none') bad(`${nm}: a shadow (${c.boxShadow})`);
      if (el.matches('.sdk-daychip, .daychip') && c.transform !== 'none') bad(`${nm}: lifted (${c.transform})`);
      if (el.matches('.sdk-day-date, .dnum, .sdk-day-head, .day-head2') && c.backgroundColor === accent) bad(`${nm}: a solid accent block`);
      const sides = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({ w: c['border' + s + 'Width'], col: c['border' + s + 'Color'], st: c['border' + s + 'Style'] })).filter((s) => !(s.st === 'none' || s.w === '0px'));
      if (el.matches('.sdk-day, .sdk-daychip, .daychip, .day2') && sides.some((s) => s.col === tok(d, 'var(--accent)'))) bad(`${nm}: an accent border`);
      for (const ps of ['::before', '::after']) { const p = cs(el, ps); if (p.content === 'none' || p.position !== 'absolute') continue;
        if (/^(\d(\.\d+)?)px$/.test(p.width) && parseFloat(p.width) <= 4 && p.backgroundColor !== 'rgba(0, 0, 0, 0)' && !el.matches('.sdk-daychip, .daychip') && !/checkbox|radio/.test(el.type || '')) bad(`${nm}: a thin coloured block (${p.width}) on a side`); }
    }
  }
  // The day cards.
  { const d = get('Days, day card states'); const cards = [...d.querySelectorAll('.sdk-day')]; if (cards.length < 7) bad('fewer than seven day cards in the states frame');
    const border = tok(d, 'var(--border)'); const [rest, current, today, both, empty, drop] = cards;
    for (const c of cards) { const s = cs(c);
      if (!c.classList.contains('is-current') && s.backgroundColor !== bg(d, 'var(--bg-card)')) bad(`a day card is ${s.backgroundColor}, not --bg-card`);
      if (s.borderTopLeftRadius !== rad(d, '--radius-large')) bad('a day card corner is not --radius-large');
      if (s.paddingTop !== '12px' || s.paddingLeft !== '12px') bad(`a day card padding is ${s.paddingTop} ${s.paddingLeft}, not 12px`);
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) { const w = s['border' + side + 'Width']; const col = s['border' + side + 'Color']; if (!c.classList.contains('is-drop') && (w !== '1px' || col !== border)) bad(`a day card ${side.toLowerCase()} edge is ${w} ${col}, not the neutral 1px hairline`); }
      const head = c.querySelector('.sdk-day-head'); if (cs(head).backgroundImage !== 'none' || cs(head).backgroundColor !== 'rgba(0, 0, 0, 0)') bad('a day card head has a fill or a wash');
      const date = c.querySelector('.sdk-day-date'); const b1 = cs(date.querySelector('b')); const sp = cs(date.querySelector('span'));
      if (cs(date).backgroundColor !== bg(d, 'color-mix(in srgb, var(--text) 8%, var(--bg-card))')) bad('the date block is not the neutral inner fill');
      if (b1.fontSize !== '22px' || b1.fontWeight !== '600') bad(`the day number is ${b1.fontSize} weight ${b1.fontWeight}, expected 22px, 600`);
      if (sp.fontSize !== '11px' || sp.textTransform !== 'uppercase') bad('the weekday is not 11px in capitals');
      if (cs(date).borderTopLeftRadius !== rad(d, '--radius-small')) bad('the date block corner is not --radius-small');
      const lab = c.querySelectorAll('.sdk-status'); for (const l of lab) if (Math.abs(l.getBoundingClientRect().height - 24) > 0.6) bad('a status label in a day head is not 24px high');
    }
    if (cs(current).backgroundColor !== bg(d, 'var(--selected-bg)')) bad(`the current day card is ${cs(current).backgroundColor}, not --selected-bg`);
    if (cs(current).borderTopColor !== cs(rest).borderTopColor || cs(current).boxShadow !== 'none') bad('the current day card has its own edge or a glow');
    if (!/Today/.test(today.textContent) || !/Today/.test(both.textContent) || /Today/.test(rest.textContent)) bad('the Today label is not on exactly the today cards');
    if (!today.querySelector('.sdk-status[data-tone="info"]')) bad('the Today label is not a status label');
    if (cs(today).backgroundColor !== bg(d, 'var(--bg-card)')) bad('a today card that is not current has a fill');
    if (!rest.querySelector('.sdk-status[data-tint]')) bad('the phase is not a status label with a tint');
    if (cs(drop).outlineWidth !== '2px' || cs(drop).outlineOffset !== '-2px') bad('the drop target is not the 2px inside outline');
    if (!empty.querySelector('.sdk-day-empty') || cs(empty.querySelector('.sdk-day-empty')).borderTopStyle !== 'dashed') bad('the empty day is not one dashed quiet button');
    const cnt = rest.querySelector('.sdk-badge'); if (!cnt || cs(cnt).height !== '18px') bad('the count is not the 18px Chips count');
    const rows = rest.querySelectorAll('.sdk-card-list .sdk-row'); if (rows.length && cs(rows[0]).backgroundColor !== bg(d, 'var(--bg-input)')) bad('a row in a day card is not --bg-input');
    const menu = rest.querySelector('.sdk-day-actions .sdk-icon-btn'); if (Math.abs(menu.getBoundingClientRect().height - 30) > 0.6) bad('the "..." in a day head is not the 30px Quiet button'); }
  { const d = get('Days, phase labels'); const labels = d.querySelectorAll('.sdk-status'); if (labels.length !== 5) bad(`the phase labels frame has ${labels.length} labels, expected 5`); for (const l of labels) if (!l.querySelector('i') || !l.textContent.trim()) bad('a phase label has no icon or no words'); }
  // The day chip.
  { const d = get('Days, day chip'); const chips = [...d.querySelectorAll('.sdk-daychip')]; const [rest, hov, prs, foc, cur, today, curToday, trip, tripCur, out, empty] = chips; const want = phone(d) ? 44 : 40;
    for (const c of chips) { const s = cs(c);
      if (Math.abs(c.getBoundingClientRect().height - want) > 0.6) bad(`a day chip is ${c.getBoundingClientRect().height}px high, expected ${want}`);
      if (c.getBoundingClientRect().width < 45.4) bad('a day chip is under 46px wide');
      if (s.borderTopLeftRadius !== rad(d, '--radius-small')) bad('a day chip corner is not --radius-small');
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (s['border' + side + 'Color'] !== 'rgba(0, 0, 0, 0)') bad(`a day chip has a coloured edge (${side})`);
      if (!c.getAttribute('aria-label')) bad('a day chip has no name'); }
    if (cs(rest).backgroundColor !== bg(d, 'color-mix(in srgb, var(--text) 8%, transparent)')) bad(`a day chip at rest is ${cs(rest).backgroundColor}, not the neutral chip fill`);
    if (cs(hov).backgroundColor === cs(rest).backgroundColor) bad('the day chip hover is not a fill'); if (cs(prs).backgroundColor === cs(hov).backgroundColor) bad('the day chip pressed looks like hover');
    if (!(cs(foc).outlineWidth === '2px' && cs(foc).outlineStyle === 'solid' && cs(foc).outlineOffset === '-2px' && cs(foc).outlineColor === tok(d, 'var(--accent)'))) bad('the day chip focus is not a 2px accent outline at -2px');
    for (const c of [cur, curToday, tripCur]) if (cs(c).backgroundColor !== bg(d, 'var(--selected-bg)')) bad(`the current day chip is ${cs(c).backgroundColor}, not --selected-bg`);
    for (const c of [trip, tripCur]) { const dot = c.querySelector('.sdk-daychip-dot'); if (!dot || Math.abs(dot.getBoundingClientRect().width - 7) > 0.6) bad('an in-trip chip has no 7px dot'); }
    if (rest.querySelector('.sdk-daychip-dot') || out.querySelector('.sdk-daychip-dot')) bad('a chip outside the trip has a dot');
    for (const c of [today, curToday]) { const a = cs(c, '::after'); if (a.width !== '4px' || a.backgroundColor === 'rgba(0, 0, 0, 0)') bad('a today chip has no 4px dot'); }
    if (cs(rest, '::after').backgroundColor !== 'rgba(0, 0, 0, 0)') bad('a chip that is not today has a dot'); if (cs(rest, '::after').height !== '4px') bad('the dot line is not kept on every chip (heights would differ)');
    if (cs(empty).transition.indexOf('transform') >= 0) bad('a day chip transitions a transform'); }
  // The strip, gap count, phone, aliases.
  { const d = get('Days, strip and gap'); const g = d.querySelector('.sdk-gapcount'); const s = cs(g); if (s.borderTopWidth !== '0px' || s.height !== '24px') bad('the gap count has a border or is not 24px'); if (!/days between/.test(d.querySelector('.sdk-gap').textContent)) bad('the gap count has no word');
    const hs = new Set([...d.querySelectorAll('.sdk-daychip')].map((c) => c.getBoundingClientRect().height)); if (hs.size !== 1) bad('the strip chips are not all the same height'); }
  { const d = get('Days, on a phone'); if (d.defaultView.innerWidth > 640) bad('the phone frame is wider than a phone'); const w = d.querySelector('.sdk-day-add-word'); const r = w.getBoundingClientRect(); if (r.width > 2) bad('the Add word shows on a phone');
    const add = d.querySelector('.sdk-day-add'); const ar = add.getBoundingClientRect(); const mb = d.querySelector('.sdk-day-actions .sdk-icon-btn'); if (Math.abs(mb.getBoundingClientRect().height - 30) > 0.6) bad('the phone "..." button does not keep its 30px look');
    const hit = d.elementFromPoint(ar.left + ar.width / 2, ar.top - 6); if (!hit || !hit.closest('.sdk-day-add')) bad('a press 6px above the phone Add button does not reach it');
    const card = d.querySelector('.sdk-day'); const hr = card.querySelector('.sdk-day-head').getBoundingClientRect(); const cr = card.getBoundingClientRect(); if (hr.right > cr.right + 0.5) bad('the phone day head overflows its card');
    for (const r2 of d.querySelectorAll('.sdk-row')) if (r2.getBoundingClientRect().height < 43.4) bad('a phone row is under 44px'); }
  { const d = get('Days, aliases'); const card = d.querySelector('.day2'); if (cs(card).backgroundColor !== bg(d, 'var(--bg-card)')) bad('aliases: .day2 with sdk-card is not the card');
    if (cs(d.querySelector('.dnum')).backgroundColor !== bg(d, 'color-mix(in srgb, var(--text) 8%, var(--bg-card))')) bad('aliases: .dnum is not the neutral date block');
    const cur = d.querySelector('.daychip.current'); if (cs(cur).backgroundColor !== bg(d, 'var(--selected-bg)') || cs(cur).transform !== 'none' || cs(cur).boxShadow !== 'none') bad('aliases: .daychip.current is not the selected fill without a lift'); }
  const blk = document.getElementById('days');
  if (!blk || !blk.querySelector('.ds-st-approved') || blk.querySelector('.ds-st-proposed')) bad('the Days family is not marked Approved');
  if (!/\.dnum/.test(blk ? blk.textContent : '') || !/Today to proposed/.test(blk ? blk.textContent : '')) bad('the Days family has no "Today to proposed" table naming .dnum');
  return JSON.stringify(out);
};
export { daysProbe as probe };
