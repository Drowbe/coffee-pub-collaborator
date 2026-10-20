/*
 * check-design-system-calendar.mjs -- the Calendar cells family of the proposed design system page (public/design-system/proposed-calendar.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a picker cell that is not 30px (44px at 390) or whose corner is not --radius-small; a month cell with a corner other than --radius-medium or under 74px
 * (week under 150px, compact under 54px); a hover, today, range or chosen fill that is not its token (hover --text 10% over the card, today the accent at 14%
 * = --selected-bg at half strength, chosen solid --accent with --on-accent text, range as hover); an outside-the-month cell not at 55% opacity; a focus that is not
 * a 2px outline at offset -2px in --accent (--on-accent on the chosen day); a hover that changes the edge; the picker's cell and the Menus' .sdk-dp-day differing in
 * size, corner or fill; an event chip under 11px, not --radius-small or not the 22% tone fill; a coloured one-sided border or a thin coloured block on a side
 * anywhere except the declared Calendar exception (.sdk-bar-kept: three agenda rows and the chips, flagged "Exception, kept"); the "now" row or the linked day
 * with an accent edge or without its word; the arrow keys, Home and End not moving focus in the grid; a hard-coded #c0574a; a gradient, a hex colour or a
 * shadow in the stylesheet; the family not marked Approved; the undecided entry not removed; a name not defined.
 */
export const id = 'calendar';
export const todayOnly = [];

export function staticChecks({ fail, css, js, defined }) {
  if (/gradient/i.test(css)) fail('proposed-calendar.css: a gradient');
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-calendar.css: a hex colour (tokens only)');
  if (/c0574a/i.test(css)) fail('proposed-calendar: the hard-coded #c0574a fallback is back (use var(--danger))');
  if (/border-(left|right|top|bottom)\s*:/.test(css)) fail('proposed-calendar.css: a border on one side (the bar is .sdk-bar-kept from Cards, a block, not a border)');
  if (/box-shadow\s*:\s*(?!\s|none)/.test(css)) fail('proposed-calendar.css: a box-shadow other than none (a ring or an inset bar)');
  if (/\.sdk-bar-kept/.test(css.replace(/\.sdk-cal-event\.sdk-bar-kept[^{]*\{[^}]*\}/g, '').replace(/\.sdk-cal-compact[^{]*sdk-bar-kept[^{]*\{[^}]*\}/g, ''))) fail('proposed-calendar.css: .sdk-bar-kept is styled outside the event chip (the bar itself is the Cards family\'s)');
  if (!/Exception, kept/.test(js)) fail('proposed-calendar.js: the Calendar exception is not flagged "Exception, kept"');
  if (!/ds-st-approved/.test(js) || /ds-st-proposed/.test(js)) fail('proposed-calendar.js: the family is not marked Approved');
  for (const c of ['sdk-cal-grid', 'sdk-cal-dow', 'sdk-cal-cell', 'sdk-cal-n', 'sdk-cal-chips', 'sdk-cal-event', 'sdk-cal-pick', 'sdk-cal-hour', 'sdk-cal-allday', 'sdk-cal-hr', 'sdk-cal-agenda', 'sdk-cal-compact', 'sdk-cal-week', 'dow', 'hour', 'allday', 'hr', 'now', 'is-today', 'is-selected', 'in-range', 'is-other', 'is-linked', 'is-now']) {
    if (!defined.has(c)) fail(`the proposed stylesheets do not define the calendar name .${c}`);
  }
}

export async function browserChecks(b) {
  const { ev, cdp, sessionId, sc, where, problems, edgeColours } = b;
  const cp = JSON.parse(await ev(`(${calendarProbe.toString()})()`));
  for (const x of cp.problems) problems.push(`${where}: ${x}`);
  // The focus outline of a cell: the same on all four sides at 1.25x and 1.5x.
  if (sc.width >= 500) {
    for (const dsf of [1.25, 1.5]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: dsf, mobile: false }, sessionId);
      await new Promise((r) => setTimeout(r, 400));
      for (const nudge of [0.3, 0.7]) {
        const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Calendar, cell states'); const d = m.iframe.contentDocument; const el = d.querySelectorAll('.sdk-cal-cell')[3]; el.scrollIntoView({ block: 'center', behavior: 'instant' });
          const c = document.getElementById('ds-content'); c.style.marginTop = '${nudge}px'; c.style.marginLeft = '${nudge * 1.7 % 1}px'; window.scrollTo(0, Math.round(window.scrollY) + ${nudge}); await new Promise((r) => setTimeout(r, 150));
          const cv = document.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = getComputedStyle(el).outlineColor; g.fillRect(0, 0, 1, 1); const px = g.getImageData(0, 0, 1, 1).data;
          const bb = el.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + bb.left + window.scrollX, y: fr.top + bb.top + window.scrollY, w: bb.width, h: bb.height, col: 'rgb(' + px[0] + ',' + px[1] + ',' + px[2] + ')' }); })()`));
        const pad = 6;
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x - pad, y: at.y - pad, width: at.w + pad * 2, height: at.h + pad * 2, scale: 1 } }, sessionId);
        const e = edgeColours(Buffer.from(shot.data, 'base64'), at.col.match(/[\d.]+/g).map(Number), dsf, pad, at.w, at.h);
        const vals = Object.values(e);
        if (Math.max(...vals) - Math.min(...vals) > 40) problems.push(`${where}: the focused calendar cell outline is not the same on all four sides at ${dsf}x with the page ${nudge}px off the pixel grid (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
        if (Math.max(...vals) > 60) problems.push(`${where}: a side of the focused calendar cell outline never reaches its full colour at ${dsf}x`);
      }
      await ev(`(() => { const c = document.getElementById('ds-content'); c.style.marginTop = ''; c.style.marginLeft = ''; })()`);
    }
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
    await new Promise((r) => setTimeout(r, 300));
  }
}

const calendarProbe = async () => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^Calendar, /.test(t) && !/contrast/.test(t));
  if (TITLES.length < 9) bad(`the Calendar family has only ${TITLES.length} frames`);
  const cs = (e, p) => getComputedStyle(e, p);
  const tok = (d, expr, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = expr; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const bg = (d, expr) => tok(d, expr, 'backgroundColor');
  const rad = (d, n) => tok(d, `var(${n})`, 'borderTopLeftRadius');
  await wait(100);
  // Every box: no gradient; a one-sided coloured edge or a thin coloured block only on the declared exception.
  let bars = 0;
  for (const t of TITLES) {
    const d = get(t); if (!d) { bad(`no frame ${t}`); continue; }
    if (d.documentElement.scrollWidth > d.documentElement.clientWidth + 1) bad(`${t}: scrolls sideways`);
    const border = tok(d, 'var(--border)');
    for (const el of d.querySelectorAll('.ds-proposed *')) {
      const c = cs(el); const nm = `${t}: ${el.className || el.tagName}`;
      if (/gradient/.test(c.backgroundImage)) bad(`${nm}: a gradient`);
      const shown = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({ w: c['border' + s + 'Width'], col: c['border' + s + 'Color'], st: c['border' + s + 'Style'] })).filter((s) => !(s.st === 'none' || s.w === '0px'));
      if (shown.length && shown.length < 4) for (const s of shown) if (s.col !== border) bad(`${nm}: a coloured one-sided border (${s.col})`);
      if (c.boxShadow !== 'none' && /inset/.test(c.boxShadow)) bad(`${nm}: an inset shadow (a bar)`);
      if (el.classList.contains('sdk-bar-kept')) bars += 1;
      for (const ps of ['::before', '::after']) { const p = cs(el, ps); if (p.content === 'none' || p.position !== 'absolute') continue;
        if (!el.matches('.sdk-bar-kept') && /^(\d(\.\d+)?)px$/.test(p.width) && parseFloat(p.width) <= 4 && p.backgroundColor !== 'rgba(0, 0, 0, 0)' && !/checkbox|radio/.test(el.type || '')) bad(`${nm}: a thin coloured block (${p.width}) outside the Calendar exception`); }
    }
  }
  if (bars < 8) bad(`the Calendar exception shows ${bars} bars; expected the three agenda rows and the chips`);
  { const d = get('Calendar, agenda and the kept bar'); if (!/Exception, kept/.test(d.body.textContent)) bad('the Calendar exception is not flagged "Exception, kept"');
    const r = d.querySelector('.sdk-row.sdk-bar-kept'); if (cs(r, '::before').width !== '3px') bad(`the Calendar bar is ${cs(r, '::before').width}, expected 3px`); if (cs(r).borderLeftWidth !== '1px' || cs(r).borderLeftColor !== tok(d, 'var(--border)')) bad('the kept agenda row has a coloured or heavy edge');
    const ch = d.querySelector('.sdk-cal-event.sdk-bar-kept'); if (cs(ch, '::before').width !== '3px') bad('the kept chip bar is not 3px'); }
  // The cell states.
  { const d = get('Calendar, cell states'); const cells = [...d.querySelectorAll('.sdk-cal-cell')]; const [rest, hov, prs, foc, today, todayHov, sel, selFoc, range, other, linked, drop] = cells;
    const card = 'var(--bg-card)';
    if (cs(rest).backgroundColor !== bg(d, card)) bad('a cell at rest is not --bg-card');
    if (cs(rest).borderTopColor !== tok(d, 'var(--border)') || cs(rest).borderTopWidth !== '1px') bad('a cell has no 1px --border hairline');
    if (cs(rest).borderTopLeftRadius !== rad(d, '--radius-medium')) bad(`a month cell corner is ${cs(rest).borderTopLeftRadius}, not --radius-medium`);
    if (cs(hov).backgroundColor !== bg(d, `color-mix(in srgb, var(--text) 10%, ${card})`)) bad(`cell hover is ${cs(hov).backgroundColor}, not the quiet fill (--text 10% over the card)`);
    if (cs(hov).borderTopColor !== cs(rest).borderTopColor) bad('cell hover changes the edge (it must be a fill)');
    if (cs(prs).backgroundColor === cs(hov).backgroundColor) bad('cell pressed looks like hover');
    if (cs(today).backgroundColor !== bg(d, `color-mix(in srgb, var(--accent) 14%, ${card})`)) bad(`cell today is ${cs(today).backgroundColor}, not the accent at 14% (the selected fill at half strength)`);
    { const s = tok(d, 'var(--selected-bg)', 'backgroundColor'); const m = /\/\s*([\d.]+)\)/.exec(s); if (!m || Math.abs(Number(m[1]) - 0.28) > 0.01) bad(`--selected-bg is ${s}; today's half strength assumes the accent at 28%`); }
    if (cs(today).borderTopColor !== cs(rest).borderTopColor) bad('cell today has its own edge');
    if (cs(todayHov).backgroundColor === cs(today).backgroundColor) bad('cell today does not change on hover');
    if (cs(sel).backgroundColor !== bg(d, 'var(--accent)') || cs(sel).color !== tok(d, 'var(--on-accent)')) bad(`the chosen day is ${cs(sel).backgroundColor} on ${cs(sel).color}, not --accent with --on-accent`);
    if (cs(range).backgroundColor !== cs(hov).backgroundColor) bad('a range cell is not the quiet fill');
    if (cs(other).opacity !== '0.55') bad(`an outside-the-month cell is at ${cs(other).opacity}, not 0.55`);
    if (!(cs(foc).outlineWidth === '2px' && cs(foc).outlineStyle === 'solid' && cs(foc).outlineOffset === '-2px' && cs(foc).outlineColor === tok(d, 'var(--accent)'))) bad(`cell focus is ${cs(foc).outlineWidth} ${cs(foc).outlineStyle} ${cs(foc).outlineOffset} ${cs(foc).outlineColor}, not a 2px accent outline at -2px`);
    if (cs(selFoc).outlineColor !== tok(d, 'var(--on-accent)')) bad('the chosen day focus outline is not --on-accent');
    if (cs(rest).outlineStyle !== 'none') bad('an outline at rest');
    if (cs(linked).backgroundColor !== bg(d, 'var(--selected-bg)') || !/Linked/.test(linked.textContent)) bad('the linked day is not the selected fill with the word Linked');
    if (cs(linked).borderTopColor !== cs(rest).borderTopColor || cs(linked).boxShadow !== 'none') bad('the linked day has an accent edge or ring');
    if (cs(drop).outlineWidth !== '2px') bad('the drop target is not the 2px outline');
    // The event chip.
    const ev1 = rest.querySelector('.sdk-cal-event'); const c = cs(ev1);
    if (parseFloat(c.fontSize) < 11) bad(`an event chip is ${c.fontSize}, under 11px`);
    if (c.borderTopLeftRadius !== rad(d, '--radius-small')) bad('an event chip corner is not --radius-small');
    if (c.backgroundColor !== bg(d, `color-mix(in srgb, var(--tint-pink) 22%, ${card})`)) bad(`an event chip is ${c.backgroundColor}, not its tone at 22% over the cell`);
  }
  // Month, week, compact heights, the arrow keys.
  { const d = get('Calendar, month'); const cs0 = d.querySelector('.sdk-cal-cell'); if (cs0.getBoundingClientRect().height < 73.5) bad(`a month cell is ${cs0.getBoundingClientRect().height}px high, under 74`);
    const cur = d.querySelector('.sdk-cal-cell[tabindex="0"]'); cur.focus(); const key = (k) => d.activeElement.closest('[data-grid]').dispatchEvent(new d.defaultView.KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
    const num = () => d.activeElement.querySelector('.sdk-cal-n').textContent;
    const n0 = num(); key('ArrowRight'); if (num() !== '21') bad(`ArrowRight from ${n0} went to ${num()}, expected 21`);
    key('ArrowDown'); if (num() !== '28') bad(`ArrowDown went to ${num()}, expected 28`);
    key('ArrowUp'); key('ArrowLeft'); if (num() !== '20') bad(`ArrowUp then ArrowLeft went to ${num()}, expected 20`);
    key('Home'); if (num() !== '19') bad(`Home went to ${num()}, expected 19 (the Monday)`); key('End'); if (num() !== '25') bad(`End went to ${num()}, expected 25 (the Sunday)`);
    key('Enter'); if (d.activeElement.getAttribute('aria-selected') !== 'true') bad('Enter does not choose the day');
    if (d.querySelectorAll('[aria-selected="true"]').length !== 1) bad('more than one chosen day in the month');
    if (d.querySelectorAll('.sdk-cal-cell[tabindex="0"]').length !== 1) bad('the grid has more than one tab stop'); }
  { const d = get('Calendar, week'); for (const c of d.querySelectorAll('.sdk-cal-cell')) if (c.getBoundingClientRect().height < 149.5) bad(`a week cell is ${c.getBoundingClientRect().height}px high, under 150`); }
  { const d = get('Calendar, compact'); const g = d.querySelector('.sdk-cal-grid:not(.sdk-cal-week)'); for (const c of g.querySelectorAll('.sdk-cal-cell')) if (c.getBoundingClientRect().height < 53.5) bad(`a compact month cell is ${c.getBoundingClientRect().height}px high, under 54`);
    const dot = d.querySelector('.sdk-cal-event'); if (Math.abs(dot.getBoundingClientRect().width - 7) > 0.6) bad('a compact event is not a 7px dot'); }
  // The picker: 30px (44px on a phone), small corner, and the same as the Menus' cell.
  { const d = get('Calendar, date picker'); const want = d.defaultView.innerWidth <= 640 ? 44 : 30; const p = d.querySelector('.sdk-cal-pick'); const r = p.getBoundingClientRect();
    if (Math.abs(r.width - want) > 0.6 || Math.abs(r.height - want) > 0.6) bad(`a picker cell is ${r.width} by ${r.height}, expected ${want}`);
    if (cs(p).borderTopLeftRadius !== rad(d, '--radius-small')) bad('a picker cell corner is not --radius-small');
    for (const k of ['rest', 'today', 'sel', 'range']) { const a = d.querySelector(`.sdk-dp-day[data-pair="${k}"]`); const c = d.querySelector(`.sdk-cal-cell[data-pair="${k}"]`); const A = cs(a); const C = cs(c);
      if (A.backgroundColor !== C.backgroundColor) bad(`the picker's ${k} fill (${C.backgroundColor}) is not the Menus' (${A.backgroundColor})`);
      if (A.borderTopLeftRadius !== C.borderTopLeftRadius || A.width !== C.width || A.height !== C.height) bad(`the picker's ${k} size or corner differs from the Menus'`);
      if (k === 'sel' && A.color !== C.color) bad('the chosen day text differs from the Menus\''); }
  }
  { const d = get('Calendar, on a phone'); if (d.defaultView.innerWidth > 640) bad('the phone frame is wider than a phone'); const r = d.querySelector('.sdk-cal-pick').getBoundingClientRect(); if (Math.abs(r.width - 44) > 0.6 || Math.abs(r.height - 44) > 0.6) bad(`a phone picker cell is ${r.width} by ${r.height}, expected 44`); }
  // "Now" in the day view.
  { const d = get('Calendar, day view'); const now = d.querySelector('.sdk-cal-hour.is-now'); const rest = d.querySelector('.sdk-cal-hour:not(.is-now)');
    if (cs(now).backgroundColor !== bg(d, 'var(--selected-bg)')) bad('the "now" row is not --selected-bg'); if (cs(now).borderTopColor !== cs(rest).borderTopColor) bad('the "now" row has an accent edge'); if (!/Now/.test(now.textContent)) bad('the "now" row has no word');
    const hov = d.querySelector('.sdk-cal-hour.ds-force-hover'); if (cs(hov).borderTopColor !== cs(rest).borderTopColor || cs(hov).backgroundColor === cs(rest).backgroundColor) bad('an hour row hover is not a fill'); }
  // Aliases.
  { const d = get('Calendar, aliases'); const h = d.querySelector('.hour.now'); if (cs(h).backgroundColor !== bg(d, 'var(--selected-bg)') || cs(h).borderTopLeftRadius !== rad(d, '--radius-medium')) bad('aliases: .hour.now does not look like the day view row'); if (cs(d.querySelector('.dow')).fontSize !== '11px') bad('aliases: .dow is not 11px'); }
  // The page.
  const blk = document.getElementById('calendar');
  if (!blk || !blk.querySelector('.ds-st-approved') || blk.querySelector('.ds-st-proposed')) bad('the Calendar family is not marked Approved');
  if (document.getElementById('u-day-cards-calendar-cells-and-markers')) bad('"Day cards, calendar cells and markers" is still listed as Not yet decided');
  if (!/Exception, kept/.test(blk ? blk.textContent : '')) bad('the Calendar family does not name the kept exception');
  return JSON.stringify(out);
};
export { calendarProbe as probe };
