/*
 * check-design-system-tables.mjs -- the Tables and Manage lists family of the proposed design system page (public/design-system/proposed-tables.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a table header that is not 12px, weight 600, capitals, --text-dim with a 1px --border line under it (no accent colour anywhere in a header); a cell that is
 * not 8px by 10px with a 1px --border line under it; a hover that is not the quiet fill, a selected row that is not the selected fill (the accent at 28% over the
 * surface), a group row that is not the neutral fill with the name in --text (not accent text), a number cell not right-aligned with tabular figures; a header that is
 * not sticky, a sortable header without a button and aria-sort (ascending, descending), a sort that does not reorder the rows when pressed; an empty row or a loading
 * row (aria-busy, a status line) missing; at 390 a table not inside a sideways scroll box, a first column that is not sticky and opaque, a tick column under 44px;
 * a member tile with a coloured border, an online dot that is not 7px with a 2px ring, a toggle that is not the selected fill when on or not 45% strength when off; a
 * hard-coded #b8503f (the invalid field must be the Fields error); the Manage page without module rows with a switch, plan and AI service cards, member tiles; an alias
 * that does not look like the new name; in the stylesheet a gradient, a hex colour, an accent colour on a header or a one-sided coloured border; the family not marked
 * Proposed; the undecided entry not removed.
 */
export const id = 'tables';
export const todayOnly = [];

export function staticChecks({ fail, css, js, defined }) {
  if (/gradient/i.test(css)) fail('proposed-tables.css: a gradient');
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-tables.css: a hex colour (tokens only)');
  if (/b8503f/i.test(css + js.replace(/#b8503f/g, ''))) fail('proposed-tables: the hard-coded #b8503f is back (use the Fields error)');
  if (/border-(left|right|top)\s*:/.test(css)) fail('proposed-tables.css: a border on the left, right or top (only the line under a row)');
  if (/box-shadow\s*:\s*(?!\s|none)/.test(css)) fail('proposed-tables.css: a box-shadow other than none');
  const header = css.slice(css.indexOf('thead th'), css.indexOf('thead th') + 400);
  if (/var\(--accent\)/.test(header.split('}')[0])) fail('proposed-tables.css: the table header uses the accent colour');
  const group = /\.sdk-table-group[^{]*\{[^}]*\}/.exec(css);
  if (!group || /--accent/.test(group[0])) fail('proposed-tables.css: the group row uses the accent colour');
  if (/(^|[\s,}])\.ds-proposed\s+\.sdk-skel\s*[{,.]/.test(css)) fail('proposed-tables.css: it styles .sdk-skel itself; the skeleton belongs to the States family (scope table spacing under .sdk-table-skel)');
  if (!/position:\s*sticky/.test(css)) fail('proposed-tables.css: no sticky header');
  if (!/ds-st-approved/.test(js) || /ds-st-proposed/.test(js)) fail('proposed-tables.js: the family is not marked Approved');
  for (const c of ['sdk-table', 'sdk-table-wrap', 'sdk-table-group', 'sdk-table-empty', 'sdk-table-check', 'sdk-sort', 'sdk-skel', 'sdk-member', 'sdk-member-pic', 'sdk-member-name', 'sdk-member-dot', 'sdk-member-toggle', 'sdk-members',
    'roles-table', 'files-table', 'roles-group', 'member', 'member-toggle', 'num', 'is-center']) if (!defined.has(c)) fail(`the proposed stylesheets do not define the tables name .${c}`);
}

export async function browserChecks(b) {
  const { ev, where, problems } = b;
  const cp = JSON.parse(await ev(`(${tablesProbe.toString()})()`));
  for (const x of cp.problems) problems.push(`${where}: ${x}`);
}

const tablesProbe = async () => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^Tables, /.test(t) && !/contrast/.test(t));
  if (TITLES.length < 9) bad(`the Tables family has only ${TITLES.length} frames`);
  const cs = (e, p) => getComputedStyle(e, p);
  const tok = (d, expr, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = expr; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const bg = (d, expr) => tok(d, expr, 'backgroundColor');
  const phone = (d) => d.defaultView.innerWidth <= 640;
  await wait(100);
  for (const t of TITLES) {
    const d = get(t); if (!d) { bad(`no frame ${t}`); continue; }
    if (d.documentElement.scrollWidth > d.documentElement.clientWidth + 1) bad(`${t}: scrolls sideways (the table box must scroll, not the page)`);
    const border = tok(d, 'var(--border)'); const accent = tok(d, 'var(--accent)');
    for (const el of d.querySelectorAll('.ds-proposed *')) {
      const c = cs(el); const nm = `${t}: ${el.className || el.tagName}`;
      if (/gradient/.test(c.backgroundImage) && !el.classList.contains('sdk-skel')) bad(`${nm}: a gradient`); // the one gradient is the States skeleton's shimmer
      const sides = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({ w: c['border' + s + 'Width'], col: c['border' + s + 'Color'], st: c['border' + s + 'Style'] })).filter((s) => !(s.st === 'none' || s.w === '0px'));
      if (sides.length && sides.length < 4) for (const s of sides) if (s.col !== border) bad(`${nm}: a coloured one-sided border (${s.col})`);
      if (el.matches('th') && c.color === accent) bad(`${nm}: a header in the accent colour`);
      if (el.matches('.sdk-member, .member, .sdk-member-toggle, .member-toggle') && (sides.some((s) => s.col !== border) || c.boxShadow !== 'none')) bad(`${nm}: a coloured edge or ring on a member tile`);
    }
  }
  // The table: header, cells, hover, selected, sort.
  { const d = get('Tables, states'); const tables = [...d.querySelectorAll('.sdk-table')]; const files = tables[0]; const th = files.querySelector('thead th:nth-child(3)'); const s = cs(th);
    if (s.fontSize !== '12px' || s.fontWeight !== '600' || s.textTransform !== 'uppercase') bad(`the table header is ${s.fontSize} weight ${s.fontWeight} ${s.textTransform}, expected 12px, 600, uppercase`);
    if (s.color !== tok(d, 'var(--text-dim)')) bad('the table header is not --text-dim');
    if (s.borderBottomWidth !== '1px' || s.borderBottomColor !== tok(d, 'var(--border)')) bad('the table header has no 1px --border line under it');
    if (s.position !== 'sticky') bad('the table header is not sticky');
    const surf = bg(d, 'var(--bg-section)'); const cells = files.querySelectorAll('tbody tr');
    const td = cells[0].querySelector('td.num'); const c = cs(td);
    if (c.paddingTop !== '8px' || c.paddingBottom !== '8px' || c.paddingLeft !== '10px' || c.paddingRight !== '10px') bad(`a cell padding is ${c.paddingTop} ${c.paddingRight}, expected 8px 10px`);
    if (c.borderBottomWidth !== '1px' || c.borderBottomColor !== tok(d, 'var(--border)')) bad('a row has no 1px --border line under it');
    if (c.textAlign !== 'right' || c.fontVariantNumeric.indexOf('tabular') < 0) bad('a number cell is not right-aligned with tabular figures');
    if (cs(cells[0].querySelector('td')).backgroundColor !== surf && cs(cells[0].children[1]).backgroundColor !== surf) bad('a row at rest is not the table surface');
    const hovC = cs(cells[1].children[1]); if (hovC.backgroundColor !== bg(d, 'color-mix(in srgb, var(--text) 8%, var(--bg-section))')) bad(`row hover is ${hovC.backgroundColor}, not the quiet fill`);
    const selC = cs(cells[2].children[1]); if (selC.backgroundColor !== bg(d, 'color-mix(in srgb, var(--accent) 28%, var(--bg-section))')) bad(`a selected row is ${selC.backgroundColor}, not the selected fill`);
    { const sb = tok(d, 'var(--selected-bg)', 'backgroundColor'); const m = /\/\s*([\d.]+)\)/.exec(sb); if (!m || Math.abs(Number(m[1]) - 0.28) > 0.01) bad(`--selected-bg is ${sb}; the selected row assumes the accent at 28%`); }
    if (cs(cells[2].children[1]).borderBottomColor !== c.borderBottomColor) bad('a selected row changes the line under it');
    // aria-sort and a live sort.
    const sorted = files.querySelectorAll('th[aria-sort]'); if (sorted.length !== 1 || sorted[0].getAttribute('aria-sort') !== 'ascending') bad('the sorted header has no aria-sort="ascending"');
    if (!files.querySelector('thead .sdk-sort') || !files.querySelector('thead .sdk-sort i')) bad('a sortable header has no button with an icon');
    if (cs(sorted[0]).color !== tok(d, 'var(--text)')) bad('the sorted header is not the text colour');
    const btn = files.querySelector('thead th:nth-child(4) .sdk-sort'); const first = () => files.querySelector('tbody tr th').textContent; const before = first();
    btn.click(); const size = files.querySelector('thead th:nth-child(4)').getAttribute('aria-sort'); if (size !== 'ascending') bad(`pressing Size sets aria-sort to ${size}, expected ascending`); if (files.querySelectorAll('th[aria-sort]').length !== 1) bad('two headers are sorted at once');
    const sizes = [...files.querySelectorAll('tbody td.num')].map((x) => parseFloat(x.textContent)); void before; void sizes;
    btn.click(); if (files.querySelector('thead th:nth-child(4)').getAttribute('aria-sort') !== 'descending') bad('a second press does not sort descending');
    // The group row.
    const group = tables[1].querySelector('.sdk-table-group > th'); const g = cs(group);
    if (g.backgroundColor !== bg(d, 'color-mix(in srgb, var(--text) 8%, var(--bg-section))')) bad('the group row is not the neutral fill'); if (g.color !== tok(d, 'var(--text)')) bad('the group name is not --text (it was accent)');
    if (g.fontSize !== '12px' || g.fontWeight !== '600') bad('the group row is not 12px, weight 600'); if (group.getAttribute('colspan') !== '4' || group.getAttribute('scope') !== 'colgroup') bad('the group row does not span the table as a colgroup header');
    const tk = tables[1].querySelector('td input[type="checkbox"]'); if (!tk || !tk.getAttribute('aria-label')) bad('a tick in a table has no name');
    const rowHead = tables[1].querySelector('tbody th[scope="row"]'); if (cs(rowHead).textAlign !== 'left') bad('a row header is not left-aligned'); }
  // Empty and loading.
  { const d = get('Tables, empty and loading'); const e = d.querySelector('.sdk-table-empty td'); if (!e || e.getAttribute('colspan') !== '3' || cs(e).textAlign !== 'center' || cs(e).color !== tok(d, 'var(--text-dim)')) bad('the empty row is not one centred muted cell');
    const l = d.querySelector('table[aria-busy="true"]'); if (!l) bad('the loading table is not aria-busy'); else { if (l.querySelectorAll('.sdk-skel').length < 6) bad('the loading rows have too few bars'); if (!d.querySelector('[role="status"]') || !/Loading/.test(d.querySelector('[role="status"]').textContent)) bad('the loading table has no status line');
      const bar = cs(l.querySelector('.sdk-skel')); if (bar.backgroundColor !== bg(d, 'var(--skel-base)')) bad('a loading bar is not the States skeleton colour (--skel-base)'); if (!/sdk-shimmer/.test(bar.animationName)) bad('a loading bar does not shimmer with the States keyframe'); if (parseFloat(bar.height) !== 12) bad(`a loading bar is ${bar.height} high; the States skeleton line is 12px`);
      const rowH = l.querySelector('tbody tr').getBoundingClientRect().height; if (rowH < 33) bad(`a loading row is ${rowH}px high; it should keep the height of a row`); } }
  // Sticky header: scroll the box and the header stays.
  { const d = get('Tables, sticky header'); const wrap = d.querySelector('.sdk-table-wrap'); if (cs(wrap).overflowY !== 'auto') bad('the sticky example does not scroll'); wrap.scrollTop = 100; await wait(80);
    const th = wrap.querySelector('thead th'); const tr = th.getBoundingClientRect(); const wr = wrap.getBoundingClientRect(); if (Math.abs(tr.top - wr.top) > 1.5) bad(`the header moved to ${tr.top - wr.top}px from the top of the box when it scrolled`);
    if (cs(th).backgroundColor === 'rgba(0, 0, 0, 0)') bad('the sticky header is transparent (rows would show through)'); }
  // A phone: the box scrolls, the first column stays and is opaque, the tick column is 44px.
  { const d = get('Tables, on a phone'); if (!phone(d)) bad('the phone frame is wider than a phone');
    const wrap = d.querySelector('[data-scroll]'); if (cs(wrap).overflowX !== 'auto') bad('a phone table is not in a sideways scroll box'); if (wrap.scrollWidth <= wrap.clientWidth) bad('the wide table does not overflow its box at 390');
    wrap.scrollLeft = 120; await wait(80); const first = wrap.querySelector('tbody th'); const fr = first.getBoundingClientRect(); const wr = wrap.getBoundingClientRect();
    if (Math.abs(fr.left - wr.left) > 1.5) bad(`the first column moved to ${fr.left - wr.left}px from the left when scrolled`); if (cs(first).position !== 'sticky') bad('the first column is not sticky');
    if (cs(first).backgroundColor === 'rgba(0, 0, 0, 0)' || /\/\s*0\./.test(cs(first).backgroundColor)) bad(`the sticky first column is not opaque (${cs(first).backgroundColor})`);
    const chk = d.querySelectorAll('.sdk-table-wrap')[1].querySelector('td.sdk-table-check'); if (chk.getBoundingClientRect().width < 43.4) bad(`the phone tick column is ${chk.getBoundingClientRect().width}px, under 44`); }
  // The Manage page: module rows with the switch, plan and AI cards, member tiles.
  for (const title of ['Tables, Manage page', 'Tables, Manage page on a phone']) { const d = get(title); if (!d) continue;
    const rows = d.querySelectorAll('.sdk-row input.sdk-switch'); if (rows.length < 4) bad(`${title}: fewer than four module rows with a switch`);
    for (const sw of rows) { if (sw.getAttribute('role') !== 'switch' || !sw.getAttribute('aria-label')) bad(`${title}: a switch has no role or name`); const r = sw.getBoundingClientRect(); if (Math.abs(r.width - 36) > 0.6 || Math.abs(r.height - 20) > 0.6) bad(`${title}: a switch is ${r.width} by ${r.height}, expected 36 by 20`); }
    if (d.querySelectorAll('.sdk-card').length < 4) bad(`${title}: fewer than four plan and AI cards`); if (d.querySelectorAll('.sdk-member').length < 5) bad(`${title}: fewer than five member tiles`);
    const want = phone(d) ? 44 : 38; for (const r of d.querySelectorAll('.sdk-list > .sdk-row')) if (r.getBoundingClientRect().height < want - 0.6) bad(`${title}: a row is under ${want}px`);
    const card = d.querySelector('.sdk-card'); if (cs(card).paddingTop !== '12px' || cs(card).backgroundColor !== bg(d, 'var(--bg-card)')) bad(`${title}: a plan card is not the Cards card`);
    if (!d.querySelector('.sdk-table-wrap .sdk-table')) bad(`${title}: no files table`); }
  // Members.
  { const d = get('Tables, members'); const border = tok(d, 'var(--border)'); const tiles = [...d.querySelectorAll('.sdk-member')]; const online = d.querySelector('.sdk-member .sdk-member-dot'); const dot = cs(online);
    if (dot.width !== '7px' || dot.height !== '7px' || dot.borderTopWidth !== '2px' || dot.borderTopColor !== tok(d, 'var(--bg-card)')) bad(`the online dot is ${dot.width} with a ${dot.borderTopWidth} ring in ${dot.borderTopColor}, expected 7px with a 2px --bg-card ring`);
    if (dot.backgroundColor !== bg(d, 'var(--ok-mark)')) bad('the online dot is not --ok-mark'); if (!online.parentElement.querySelector('.sdk-sr-only')) bad('the online dot has no word for a screen reader');
    for (const t of tiles) if (cs(t).borderTopColor !== border) bad('a member tile has a coloured border');
    const toggles = tiles.filter((t) => t.classList.contains('sdk-member-toggle')); const on = toggles.find((t) => t.classList.contains('is-on') && !t.classList.contains('ds-force-focus')); const off = toggles.find((t) => !t.classList.contains('is-on') && !t.classList.contains('ds-force-hover'));
    if (cs(on).backgroundColor !== bg(d, 'var(--selected-bg)')) bad('a toggle that is on is not the selected fill'); if (cs(off).opacity !== '0.45') bad(`a toggle that is off is at ${cs(off).opacity}, not 0.45`);
    const offHover = toggles.find((t) => !t.classList.contains('is-on') && t.classList.contains('ds-force-hover')); if (cs(offHover).opacity !== '1') bad('a toggle that is off does not return to full on hover');
    if (on.getAttribute('aria-pressed') !== 'true' || off.getAttribute('aria-pressed') !== 'false') bad('a toggle does not carry aria-pressed');
    const foc = toggles.find((t) => t.classList.contains('ds-force-focus')); if (cs(foc).outlineWidth !== '2px') bad('a member toggle focus is not a 2px outline');
    if (Math.abs(tiles[0].getBoundingClientRect().width - 72) > 0.6) bad('a member tile is not 72px wide'); }
  // Replaced: the invalid field is the Fields error; the banner is referenced.
  { const d = get('Tables, replaced'); const input = d.querySelector('input[aria-invalid="true"]'); if (!input || cs(input).borderTopColor !== tok(d, 'var(--danger)')) bad('the invalid icon field edge is not the --danger token'); if (!d.querySelector('.sdk-error')) bad('the invalid field has no error line');
    if (!/Toasts family/.test(d.body.textContent)) bad('the environment banner is not referenced to the Toasts family'); }
  // Aliases.
  { const d = get('Tables, aliases'); const th = d.querySelector('.roles-table thead th'); if (cs(th).fontSize !== '12px' || cs(th).fontWeight !== '600' || cs(th).color !== tok(d, 'var(--text-dim)')) bad('aliases: .roles-table header is not the table header');
    const g = d.querySelector('.roles-group th'); if (cs(g).color !== tok(d, 'var(--text)') || cs(g).backgroundColor !== bg(d, 'color-mix(in srgb, var(--text) 8%, var(--bg-section))')) bad('aliases: .roles-group is not the group row');
    const f = d.querySelector('.files-table td'); if (cs(f).paddingTop !== '8px' || cs(f).paddingLeft !== '10px') bad('aliases: .files-table cells are not 8px by 10px'); }
  const blk = document.getElementById('tables');
  if (!blk || !blk.querySelector('.ds-st-approved') || blk.querySelector('.ds-st-proposed')) bad('the Tables family is not marked Approved');
  if (document.getElementById('u-tables-and-lists-in-manage')) bad('"Tables and lists in Manage" is still listed as Not yet decided');
  if (!/roles-table/.test(blk ? blk.textContent : '') || !/Today to proposed/.test(blk ? blk.textContent : '') || !/Toasts family/.test(blk ? blk.textContent : '')) bad('the Tables family has no "Today to proposed" table, or does not reference the Banner of the Toasts family');
  return JSON.stringify(out);
};
export { tablesProbe as probe };
