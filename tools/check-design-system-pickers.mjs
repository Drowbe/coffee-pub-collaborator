/*
 * check-design-system-pickers.mjs -- the Pickers family of the proposed design system page (public/design-system/legacy/system-v1/proposed-pickers.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a picker trigger that is not --field-h high (38px, 44px in a frame of 640px or less and in the 44px frame), that has a corner that is not
 * --radius-small, a fill that is not --bg-input, an edge that is not the 1px --border hairline, a trailing icon outside its box, a chevron that does not turn when
 * open; a focus that is not a 2px accent outline over the hairline with the ring (all four sides the same at 1.25x and 1.5x); a hover with no fill change;
 * a disabled trigger not at half strength; an error edge that is not --danger; a flyout that is not --radius-medium with --shadow-2 and the 1px hairline; list
 * rows not 32px (44px on a phone); a chosen row that is not --selected-bg; an icon grid that is not 8 columns of 32px (6 of 44px on a phone); a selected icon,
 * swatch or tile without the check, or with an accent fill or an accent border anywhere in the family's frames; a swatch not 24px (a cell not 28px, 44px on
 * a phone); the native colour input missing as "Custom"; a tile selection that is not --selected-bg; the sheet without 44px rows and large top corners;
 * the family not marked Approved; the stylesheet drawing an edge on one side other than a neutral divider, or using a hard-coded colour; the undecided list
 * still naming the pickers.
 */
import fs from 'node:fs';
import path from 'node:path';

import { alignRows, badgeInk } from './check-design-system-align.mjs';

export const id = 'pickers';
export const todayOnly = [];

export function staticChecks({ fail, css, js, DS }) {
  for (const m of css.matchAll(/(border-(?:left|right|top|bottom)[a-z-]*)\s*:\s*([^;}]+)/g)) if (!/^1px solid var\(--border\)$/.test(m[2].trim())) fail(`proposed-pickers.css: ${m[1]}: ${m[2].trim()} (a one-sided edge must be the neutral divider)`);
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-pickers.css: a hard-coded colour (tokens only; a swatch colour is data passed as --sw)');
  if (/box-shadow\s*:\s*inset|inset\s+\d/.test(css)) fail('proposed-pickers.css: an inset shadow (a bar)');
  if (/text-decoration\s*:\s*underline/.test(css)) fail('proposed-pickers.css: an underline');
  if (/background[^;]*var\(--accent\)\s*;/.test(css.replace(/outline[^;]*;/g, ''))) fail('proposed-pickers.css: an accent fill (selected is neutral)');
  if (!/status: 'approved'/.test(js)) fail('proposed-pickers.js: the family is not marked Approved');
  const pj = fs.readFileSync(path.join(DS, 'proposed.js'), 'utf8');
  if (/'Pickers: date, kind, currency'/.test(pj)) fail("proposed.js: the undecided list still names 'Pickers: date, kind, currency'");
}

export async function browserChecks(b) {
  const { ev, cdp, sessionId, sc, where, problems, edgeColours } = b;
  await badgeInk(b, [{ frame: /./, badge: '.sdk-tile > .sdk-tile-check', self: true, glyphs: [] }, { frame: /./, badge: '.sdk-swatch > i', self: true, glyphs: [] }]);
  const probe = JSON.parse(await ev(`(() => {
    const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
    const out = { problems: [] }; const bad = (m) => out.problems.push(m);
    const titles = ['Pickers, triggers, all states', 'Pickers, triggers, all states, 44px', 'Pickers, flyouts', 'Pickers, bottom sheet', 'Pickers, background dialog content', 'Pickers, a form'];
    for (const t of titles) if (!get(t)) { bad('no frame ' + t); return JSON.stringify(out); }
    const frameFor = (d) => d.defaultView; const near = (a, b2, e) => Math.abs(a - b2) <= (e || 0.6);
    const tokOf = (d, prop, expr) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop] = expr; host.appendChild(p); const c = d.defaultView.getComputedStyle(p)[prop]; p.remove(); return c; };
    for (const [title, forced] of [['Pickers, triggers, all states', 0], ['Pickers, triggers, all states, 44px', 44]]) {
      const d = get(title); const w = frameFor(d); const cs = (x, p) => w.getComputedStyle(x, p); const want = forced || (w.innerWidth <= 640 ? 44 : 38);
      const rows = [...d.querySelectorAll('.pm-row')]; const wantRows = forced ? 3 : 6; if (rows.length !== wantRows) bad(title + ': expected ' + wantRows + ' rows, found ' + rows.length);
      const cell = (r, s) => rows[r].querySelectorAll('.dsf-state')[s];
      for (let r = 0; r < rows.length - 1; r += 1) {
        const nm = rows[r].querySelector('.pm-role').textContent;
        for (let s = 0; s < 7; s += 1) { const t = cell(r, s).querySelector('.sdk-picker'); if (!t) { bad(title + ': ' + nm + ' state ' + s + ' has no trigger'); continue; }
          const hgt = t.getBoundingClientRect().height; if (!near(hgt, want)) bad(title + ': the ' + nm + ' trigger (state ' + s + ') is ' + hgt + 'px, expected ' + want);
          if (t.tagName !== 'BUTTON' || !t.hasAttribute('aria-haspopup') || !t.hasAttribute('aria-expanded')) bad(title + ': the ' + nm + ' trigger is not a button with aria-haspopup and aria-expanded');
          const ic = t.querySelector('.sdk-picker-icon'); const tb = t.getBoundingClientRect(); const ib = ic && ic.getBoundingClientRect();
          if (!ic || ib.right > tb.right - 4 || ib.left < tb.left) bad(title + ': the ' + nm + ' trailing icon is not inside the box'); }
        const rest = cell(r, 1).querySelector('.sdk-picker'); const hov = cell(r, 2).querySelector('.sdk-picker'); const foc = cell(r, 3).querySelector('.sdk-picker'); const open = cell(r, 4).querySelector('.sdk-picker');
        const dis = cell(r, 5).querySelector('.sdk-picker'); const err = cell(r, 6).querySelector('.sdk-picker'); const ph = cell(r, 0).querySelector('.sdk-picker');
        if (!/^(3px|5px|7px|11px)/.test(cs(rest).borderTopLeftRadius) || cs(rest).borderTopLeftRadius !== tokOf(d, 'borderTopLeftRadius', 'var(--radius-small)')) bad(title + ': the ' + nm + ' corner is not --radius-small (' + cs(rest).borderTopLeftRadius + ')');
        if (cs(rest).backgroundColor !== tokOf(d, 'backgroundColor', 'var(--bg-input)')) bad(title + ': the ' + nm + ' fill is not --bg-input');
        { const p = d.createElement('span'); p.style.border = '1px solid var(--border)'; d.querySelector('.ds-proposed').appendChild(p); const want2 = w.getComputedStyle(p).borderTopColor; p.remove(); if (cs(rest).borderTopColor !== want2 || cs(rest).borderTopWidth !== '1px') bad(title + ': the ' + nm + ' edge is not the 1px --border hairline'); }
        if (cs(hov).backgroundColor === cs(rest).backgroundColor) bad(title + ': the forced hover of the ' + nm + ' does not change the fill');
        const acc = tokOf(d, 'color', 'var(--accent)'); const dng = tokOf(d, 'color', 'var(--danger)');
        if (cs(foc).borderTopColor !== acc || cs(foc).outlineStyle !== 'solid' || cs(foc).outlineWidth !== '2px' || cs(foc).outlineColor !== acc || cs(foc).outlineOffset !== '-2px') bad(title + ': the focus of the ' + nm + ' is not a 2px accent outline over the hairline (' + cs(foc).outlineWidth + ' ' + cs(foc).outlineColor + ' ' + cs(foc).outlineOffset + ')');
        if (!/\\b2px\\b/.test(cs(foc).boxShadow) || cs(foc).boxShadow === 'none') bad(title + ': the focus of the ' + nm + ' shows no 2px ring');
        if (cs(dis).opacity !== '0.5' || cs(dis).cursor !== 'not-allowed') bad(title + ': the disabled ' + nm + ' is not half strength with a not-allowed cursor');
        if (cs(err).borderTopColor !== dng || err.getAttribute('aria-invalid') !== 'true') bad(title + ': the error ' + nm + ' is not the danger edge on an aria-invalid trigger');
        if (cs(open.querySelector('.sdk-picker-icon')).transform === 'none') bad(title + ': the chevron of the open ' + nm + ' does not turn');
        if (!ph.querySelector('.sdk-picker-ph')) bad(title + ': the ' + nm + ' placeholder is not .sdk-picker-ph');
        else if (cs(ph.querySelector('.sdk-picker-ph')).color !== tokOf(d, 'color', 'var(--text-dim)')) bad(title + ': the ' + nm + ' placeholder is not --text-dim');
      }
      const dt = cell(rows.length - 1, 1).querySelector('input'); if (!near(dt.getBoundingClientRect().height, want)) bad(title + ': the date field is ' + dt.getBoundingClientRect().height + 'px, expected ' + want);
    }
    // the flyouts
    { const d = get('Pickers, flyouts'); const w = d.defaultView; const cs = (x) => w.getComputedStyle(x); const phone = w.innerWidth <= 640;
      const rad = tokOf(d, 'borderTopLeftRadius', 'var(--radius-medium)'); const shadow = tokOf(d, 'boxShadow', 'var(--shadow-2)');
      for (const el of d.querySelectorAll('.sdk-kind-list, .sdk-menu, .sdk-popover')) {
        if (cs(el).borderTopLeftRadius !== rad) bad('a flyout corner is not --radius-medium (' + cs(el).borderTopLeftRadius + ')');
        if (cs(el).boxShadow !== shadow) bad('a flyout shadow is not --shadow-2');
        if (cs(el).borderTopWidth !== '1px') bad('a flyout has no 1px hairline'); }
      const want = phone ? 44 : 32; const rows = [...d.querySelectorAll('.sdk-menu .sdk-menu-item')];
      if (rows.length < 5) bad('the currency flyout has ' + rows.length + ' rows');
      for (const r of rows) if (!near(r.getBoundingClientRect().height, want)) bad('a currency row is ' + r.getBoundingClientRect().height + 'px, expected ' + want);
      const sel = d.querySelector('.sdk-menu .sdk-menu-item.current'); const selBg = tokOf(d, 'backgroundColor', 'var(--selected-bg)');
      if (!sel || cs(sel).backgroundColor !== selBg) bad('the chosen currency row is not --selected-bg');
      const kopt = [...d.querySelectorAll('.sdk-kind-option')]; for (const r of kopt) if (r.getBoundingClientRect().height < want - 0.6 && phone) bad('a kind row is under 44px on a phone');
      // icon grid
      const grid = d.querySelector('.sdk-iconpick-grid'); const cols = cs(grid).gridTemplateColumns.split(' ').length; const wantCols = phone ? 6 : 8; const wantIcon = phone ? 44 : 32;
      if (cols !== wantCols) bad('the icon grid has ' + cols + ' columns, expected ' + wantCols);
      const btns = [...grid.querySelectorAll('.sdk-iconpick-btn')]; if (btns.length < 16) bad('the icon grid has ' + btns.length + ' buttons');
      for (const bt of btns) { const r = bt.getBoundingClientRect(); if (!near(r.width, wantIcon) || !near(r.height, wantIcon)) { bad('an icon button is ' + r.width + ' by ' + r.height + 'px, expected ' + wantIcon); break; } }
      const on = btns.filter((x) => x.getAttribute('aria-checked') === 'true'); if (on.length !== 1) bad('the icon grid has ' + on.length + ' selected buttons');
      else { if (cs(on[0]).backgroundColor !== selBg) bad('the selected icon is not --selected-bg'); if (cs(on[0].querySelector('.sdk-tile-check')).display === 'none') bad('the selected icon has no check'); }
      for (const x of btns.filter((y) => y.getAttribute('aria-checked') !== 'true')) if (cs(x.querySelector('.sdk-tile-check')).display !== 'none') bad('an unselected icon shows a check');
      // swatches
      const sw = [...d.querySelectorAll('.sdk-swatch')]; if (sw.length < 16) bad('the colour grid has ' + sw.length + ' swatches');
      const wantCell = phone ? 44 : 28; for (const s of sw) { const r = s.getBoundingClientRect(); if (!near(r.width, wantCell) || !near(r.height, wantCell)) { bad('a swatch cell is ' + r.width + 'px, expected ' + wantCell); break; } const b4 = w.getComputedStyle(s, '::before'); if (b4.width !== '24px' || b4.height !== '24px') { bad('a swatch is ' + b4.width + ' by ' + b4.height + ', expected 24'); break; } }
      const son = sw.filter((x) => x.getAttribute('aria-checked') === 'true'); if (son.length !== 1 || cs(son[0].querySelector('i')).display === 'none') bad('the colour grid has no single selected swatch with a check');
      for (const x of sw.filter((y) => y.getAttribute('aria-checked') !== 'true')) if (cs(x.querySelector('i')).display !== 'none') bad('an unselected swatch shows a check');
      const cu = d.querySelector('.sdk-swatch-custom input[type="color"]'); if (!cu) bad('the native colour input is not offered as Custom'); else if (!near(cu.getBoundingClientRect().width, 24)) bad('the Custom colour input is ' + cu.getBoundingClientRect().width + 'px, expected 24'); }
    // the sheet
    { const d = get('Pickers, bottom sheet'); const w = d.defaultView; const sh = d.querySelector('.sdk-menu-sheet'); const lr = tokOf(d, 'borderTopLeftRadius', 'var(--radius-large)');
      if (!sh) bad('no sheet'); else { if (w.getComputedStyle(sh).borderTopLeftRadius !== lr) bad('the sheet top corner is not --radius-large'); if (!d.querySelector('.sdk-menu-scrim') || !d.querySelector('.sdk-menu-grip')) bad('the sheet has no scrim or grip');
        for (const r of sh.querySelectorAll('.sdk-menu-item')) if (!near(r.getBoundingClientRect().height, 44)) { bad('a sheet row is ' + r.getBoundingClientRect().height + 'px, expected 44'); break; }
        const cur = sh.querySelector('.sdk-menu-item.current'); if (!cur || w.getComputedStyle(cur).backgroundColor !== tokOf(d, 'backgroundColor', 'var(--selected-bg)')) bad('the chosen sheet row is not --selected-bg'); } }
    // the background tiles
    { const d = get('Pickers, background dialog content'); const w = d.defaultView; const tiles = [...d.querySelectorAll('.sdk-tile')]; const selBg = tokOf(d, 'backgroundColor', 'var(--selected-bg)');
      if (tiles.length < 6) bad('the background grid has ' + tiles.length + ' tiles');
      const on = tiles.filter((t) => t.getAttribute('aria-pressed') === 'true'); if (on.length !== 1) bad('the background grid has ' + on.length + ' selected tiles');
      else { if (w.getComputedStyle(on[0]).backgroundColor !== selBg) bad('the selected tile is not --selected-bg'); if (w.getComputedStyle(on[0].querySelector('.sdk-tile-check')).display === 'none') bad('the selected tile has no check'); }
      if (w.getComputedStyle(tiles[1]).backgroundColor === selBg) bad('an unselected tile has the selected fill');
      const chips = d.querySelectorAll('.sdk-chips .sdk-chip'); if (chips.length < 4 || ![...chips].some((c) => c.getAttribute('aria-pressed') === 'true')) bad('the background filter row is not the approved choice chips with one pressed'); }
    // nothing in the family's frames has an accent border or an accent fill (a focused trigger and a focused grid cell are the only accent outlines)
    for (const t of titles) { const d = get(t); const w = d.defaultView; const acc = tokOf(d, 'color', 'var(--accent)');
      for (const el of d.querySelectorAll('.sdk-iconpick-btn, .sdk-swatch, .sdk-tile, .sdk-menu-item, .sdk-kind-option, .sdk-picker-lead, .sdk-chip')) { const c = w.getComputedStyle(el);
        if (c.backgroundColor === acc) bad('an accent fill on ' + el.className.split(' ')[0]);
        if (!el.classList.contains('ds-force-focus') && ((parseFloat(c.borderTopWidth) > 0 && c.borderTopColor === acc) || (parseFloat(c.borderLeftWidth) > 0 && c.borderLeftColor === acc))) bad('an accent border on ' + el.className.split(' ')[0]); } }
    return JSON.stringify(out); })()`));
  for (const x of [...new Set(probe.problems)]) problems.push(`${where}: ${x}`);
  // The focus edge of a trigger: all four sides the same at 1.25x and 1.5x with a fractional scroll offset.
  if (sc.width >= 500) {
    for (const dsf of [1.25, 1.5]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: dsf, mobile: false }, sessionId);
      await new Promise((r) => setTimeout(r, 400));
      for (const nudge of [0.3, 0.7]) {
        const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Pickers, triggers, all states'); const d = m.iframe.contentDocument; const el = d.querySelectorAll('.pm-row')[0].querySelectorAll('.dsf-state')[3].querySelector('.sdk-picker'); el.scrollIntoView({ block: 'center', behavior: 'instant' });
          const c = document.getElementById('ds-content'); c.style.marginTop = '${nudge}px'; c.style.marginLeft = '${nudge * 1.7 % 1}px'; window.scrollTo(0, Math.round(window.scrollY) + ${nudge}); await new Promise((r) => setTimeout(r, 150));
          const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style.color = 'var(--accent)'; host.appendChild(p); const col = getComputedStyle(p).color; p.remove();
          const b = el.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height, col }); })()`));
        const pad = 6;
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x - pad, y: at.y - pad, width: at.w + pad * 2, height: at.h + pad * 2, scale: 1 } }, sessionId);
        const e = edgeColours(Buffer.from(shot.data, 'base64'), at.col.match(/[\d.]+/g).map(Number), dsf, pad, at.w, at.h);
        const vals = Object.values(e);
        if (Math.max(...vals) - Math.min(...vals) > 40) problems.push(`${where}: the picker focus edge is not the same on all four sides at ${dsf}x with the page ${nudge}px off the pixel grid (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
        if (Math.max(...vals) > 60) problems.push(`${where}: a side of the picker focus edge never reaches its full colour at ${dsf}x (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
      }
      await ev(`(() => { const c = document.getElementById('ds-content'); c.style.marginTop = ''; c.style.marginLeft = ''; })()`);
    }
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
    await new Promise((r) => setTimeout(r, 300));
  }
  // Alignment (tools/check-design-system-align.mjs): shared centre lines, even padding, gaps on the 4px scale.
  await alignRows(b, [
    { frame: /^Pickers, triggers, all states$/, row: '.pm-row', across: (sc.width > 640 ? '.pm-role, ' : '') + '.dsf-ex > :first-child', centres: false, padding: false, gaps: false },
    { frame: 'Pickers, a form', row: '.sdk-row', tops: true, padding: false },
    { frame: 'Pickers, a form', row: '.pm-ed', centres: false, padding: false },
  ]);
}
