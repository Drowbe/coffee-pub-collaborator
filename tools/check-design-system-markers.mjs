/*
 * check-design-system-markers.mjs -- the Markers family of the proposed design system page (public/design-system/proposed-markers.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a marker form (line chip, day row, day tag) with no text label; a line chip or day tag that is not 24px high with --radius-small; a marker form with a
 * coloured edge (every edge must be the transparent 1px of a chip, or the neutral hairline of a row on a panel), a hatch or any gradient, a shadow at rest, an
 * outline at rest; a fill that is not the marker at 22% over its surface; words that are not --text; a tag with capitals or text under 12px; a hover that is not a
 * fill; a focus that is not a 2px accent outline at offset -2px; a day row that is not the Cards row (--bg-input, --radius-small, no edge inside a card; 38px, 44px at
 * 390); a phone chip or tag without a 44px hit area; a marker taking a phase colour; a thin coloured block on a side outside the Calendar frame's declared exception;
 * the legend missing a type or a form; in the stylesheet a gradient, a hex colour, a coloured one-sided border or a shadow; the family not marked Proposed.
 */
export const id = 'markers';
export const todayOnly = [];

export function staticChecks({ fail, css, js, defined }) {
  if (/gradient/i.test(css)) fail('proposed-markers.css: a gradient (the hatch is gone)');
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-markers.css: a hex colour (tokens only; the colour is --marker)');
  if (/border-(left|right|top|bottom)\s*:/.test(css)) fail('proposed-markers.css: a border on one side');
  if (/box-shadow\s*:\s*(?!\s|none)/.test(css)) fail('proposed-markers.css: a box-shadow other than none');
  if (/border(?:-width)?\s*:\s*1\.5px/.test(css)) fail('proposed-markers.css: a 1.5px border (the old pill)');
  if (/text-transform\s*:\s*uppercase/.test(css)) fail('proposed-markers.css: capitals on a marker (the old day tag)');
  if (/--ph\b/.test(css)) fail('proposed-markers.css: a marker takes a phase colour (--ph)');
  if (!/ds-st-proposed/.test(js) || /ds-st-approved/.test(js)) fail('proposed-markers.js: the family is not marked Proposed');
  for (const c of ['sdk-mk-line', 'sdk-mk-ic', 'sdk-mk-label', 'sdk-mk-when', 'sdk-mk-row', 'sdk-mk-time', 'sdk-mk-tag', 'sdk-mk-spine', 'daytag']) if (!defined.has(c)) fail(`the proposed stylesheets do not define the markers name .${c}`);
}

export async function browserChecks(b) {
  const { ev, where, problems } = b;
  const cp = JSON.parse(await ev(`(${markersProbe.toString()})()`));
  for (const x of cp.problems) problems.push(`${where}: ${x}`);
}

const markersProbe = async () => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^Markers, /.test(t) && !/contrast/.test(t));
  if (TITLES.length < 5) bad(`the Markers family has only ${TITLES.length} frames`);
  const cs = (e, p) => getComputedStyle(e, p);
  const tok = (d, expr, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = expr; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const rad = (d, n) => tok(d, `var(${n})`, 'borderTopLeftRadius');
  const phone = (d) => d.defaultView.innerWidth <= 640;
  await wait(100);
  const kinds = { 'sdk-mk-line': 0, 'sdk-mk-row': 0, 'sdk-mk-tag': 0 };
  for (const t of TITLES) {
    const d = get(t); if (!d) { bad(`no frame ${t}`); continue; }
    if (d.documentElement.scrollWidth > d.documentElement.clientWidth + 1) bad(`${t}: scrolls sideways`);
    const border = tok(d, 'var(--border)');
    for (const el of d.querySelectorAll('.ds-proposed *')) {
      const c = cs(el); const nm = `${t}: ${el.className || el.tagName}`;
      if (/gradient/.test(c.backgroundImage)) bad(`${nm}: a gradient`);
      const shown = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({ w: c['border' + s + 'Width'], col: c['border' + s + 'Color'], st: c['border' + s + 'Style'] })).filter((s) => !(s.st === 'none' || s.w === '0px'));
      if (shown.length && shown.length < 4) for (const s of shown) if (s.col !== border) bad(`${nm}: a coloured one-sided border (${s.col})`);
      for (const ps of ['::before', '::after']) { const p = cs(el, ps); if (p.content === 'none' || p.position !== 'absolute') continue;
        if (!el.matches('.sdk-bar-kept, .sdk-mk-spine') && /^(\d(\.\d+)?)px$/.test(p.width) && parseFloat(p.width) <= 4 && p.backgroundColor !== 'rgba(0, 0, 0, 0)' && !/checkbox|radio/.test(el.type || '')) bad(`${nm}: a thin coloured block (${p.width}) on a side`); }
      for (const k of Object.keys(kinds)) if (el.classList.contains(k)) {
        kinds[k] += 1;
        if (!el.textContent.trim() && !el.querySelector('.sdk-mk-label, .sdk-row-title')) bad(`${nm}: a marker with no text label`);
        if (c.boxShadow !== 'none') bad(`${nm}: a shadow at rest`);
        if (c.outlineStyle !== 'none' && !el.classList.contains('ds-force-focus')) bad(`${nm}: an outline at rest`);
        if (/--ph|phase/.test(el.getAttribute('style') || '')) bad(`${nm}: takes a phase colour`);
      }
    }
  }
  for (const [k, n] of Object.entries(kinds)) if (n < 7) bad(`only ${n} of ${k} drawn`);
  // The line chip and the day tag.
  { const d = get('Markers, the three forms'); const small = rad(d, '--radius-small'); const text = tok(d, 'var(--text)');
    for (const sel of ['.sdk-mk-line', '.sdk-mk-tag']) for (const el of d.querySelectorAll(sel + ':not(.ds-force-hover):not(.ds-force-focus):not(:disabled)')) { const c = cs(el);
      const h = el.getBoundingClientRect().height; if (Math.abs(h - 24) > 0.6) bad(`a ${sel} is ${h}px high, expected 24`);
      if (c.borderTopLeftRadius !== small) bad(`a ${sel} corner is ${c.borderTopLeftRadius}, not --radius-small`);
      for (const s of ['Top', 'Right', 'Bottom', 'Left']) if (c['border' + s + 'Color'] !== 'rgba(0, 0, 0, 0)' || c['border' + s + 'Width'] !== '1px') bad(`a ${sel} has an edge that is not the transparent 1px (${s})`);
      if (c.color !== text) bad(`a ${sel} has words in ${c.color}, not --text`);
      if (parseFloat(c.fontSize) < 12) bad(`a ${sel} is ${c.fontSize}, under 12px`); if (c.textTransform !== 'none') bad(`a ${sel} has capitals`);
      const m = el.style.getPropertyValue('--marker'); const want = tok(d, `color-mix(in srgb, ${m} 22%, var(--bg-section))`, 'backgroundColor');
      if (sel === '.sdk-mk-line' && c.backgroundColor !== want) bad(`a line chip fill is ${c.backgroundColor}, not its marker at 22% over the panel (${want})`);
      if (!el.querySelector('i, svg')) bad(`a ${sel} has no icon`); }
    const lines = d.querySelectorAll('.sdk-mk-line'); const hov = [...lines].find((x) => x.classList.contains('ds-force-hover')); const foc = [...lines].find((x) => x.classList.contains('ds-force-focus')); const rest = lines[0];
    if (cs(hov).backgroundColor === cs(rest).backgroundColor || cs(hov).borderTopColor !== 'rgba(0, 0, 0, 0)') bad('a line chip hover is not a fill');
    if (!(cs(foc).outlineWidth === '2px' && cs(foc).outlineOffset === '-2px' && cs(foc).outlineColor === tok(d, 'var(--accent)'))) bad('a line chip focus is not a 2px accent outline at -2px');
    const th = d.querySelectorAll('.sdk-mk-tag'); const th0 = [...th].find((x) => x.classList.contains('ds-force-hover')); if (cs(th0).backgroundColor === cs(th[0]).backgroundColor) bad('a day tag hover is not a fill');
    const tf = [...th].find((x) => x.classList.contains('ds-force-focus')); if (cs(tf).outlineWidth !== '2px') bad('a day tag focus is not a 2px outline');
    // The day row: the Cards row inside a card.
    const r = d.querySelector('.sdk-mk-row'); const rc = cs(r); const want = phone(d) ? 44 : 38;
    if (rc.backgroundColor !== tok(d, 'var(--bg-input)', 'backgroundColor')) bad('a day row in a card is not --bg-input'); if (rc.borderTopColor !== 'rgba(0, 0, 0, 0)') bad('a day row in a card has an edge'); if (rc.borderTopLeftRadius !== small) bad('a day row corner is not --radius-small');
    if (r.getBoundingClientRect().height < want - 0.6) bad(`a day row is ${r.getBoundingClientRect().height}px high, under ${want}`);
    const ic = r.querySelector('.sdk-card-icon'); if (cs(ic).backgroundColor === tok(d, 'var(--bg-input)', 'backgroundColor')) bad('the day row icon chip has no tint'); }
  // Every type has its three forms in the legend.
  { const d = get('Markers, legend'); const rows = d.querySelectorAll('.pm-mk-leg tbody tr'); if (rows.length !== 7) bad(`the legend has ${rows.length} types, expected 7`);
    for (const tr of rows) if (!tr.querySelector('.sdk-mk-line') || !tr.querySelector('.sdk-mk-row') || !tr.querySelector('.sdk-mk-tag')) bad(`the legend row ${tr.children[0].textContent} lacks a form`); }
  // The Planner context: the day card head carries the phase label and the tag, with different fills.
  { const d = get('Markers, in the Planner'); const card = d.querySelector('.sdk-day'); if (!card.querySelector('.sdk-day-labels .sdk-mk-tag') || !card.querySelector('.sdk-status')) bad('the day card head does not carry both the phase label and a day tag');
    const tag = card.querySelector('.sdk-mk-tag'); const st = card.querySelector('.sdk-status'); if (cs(tag).backgroundColor === cs(st).backgroundColor) bad('a day tag and the phase label have the same fill');
    if (!d.querySelector('.sdk-mk-spine .sdk-mk-line')) bad('no line chip on the line'); }
  // On a phone: 44px hit areas, no overflow.
  { const d = get('Markers, on a phone'); if (d.defaultView.innerWidth > 640) bad('the phone frame is wider than a phone');
    for (const sel of ['.sdk-mk-line', '.sdk-mk-tag']) { const el = d.querySelector(sel); const a = cs(el, '::before'); const r = el.getBoundingClientRect();
      if (a.content === 'none' || a.position !== 'absolute') { bad(`a phone ${sel} has no hit area`); continue; }
      const hit = d.elementFromPoint(r.left + r.width / 2, r.top - 8); if (!hit || !hit.closest(sel)) bad(`a press 8px above a phone ${sel} does not reach it`); }
    const row = d.querySelector('.sdk-mk-row'); if (row.getBoundingClientRect().height < 43.4) bad('a phone day row is under 44px'); }
  // The Calendar frame: the bar is the declared exception, flagged.
  { const d = get('Markers, in the Calendar'); if (!/Exception, kept/.test(d.body.textContent)) bad('the Markers Calendar frame does not flag the exception'); if (!d.querySelector('.sdk-bar-kept')) bad('the Markers Calendar frame shows no kept bar'); }
  const blk = document.getElementById('markers');
  if (!blk || !blk.querySelector('.ds-st-proposed') || blk.querySelector('.ds-st-approved')) bad('the Markers family is not marked Proposed');
  if (!/Today to proposed/.test(blk ? blk.textContent : '') || !/markerpill/.test(blk ? blk.textContent : '')) bad('the Markers family has no "Today to proposed" table naming .markerpill');
  return JSON.stringify(out);
};
export { markersProbe as probe };
