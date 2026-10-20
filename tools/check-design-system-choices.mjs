/*
 * check-design-system-choices.mjs -- the Choice rows family of the proposed design system page (public/design-system/proposed-choices.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a one-line row that is not --check-h high (32px, 44px in a frame of 640px or less and in the 44px frame; a row with a description is at least that); a tick box
 * or radio that is not the 16px drawn box (no native appearance), a switch not 36 by 20; a hover that is not --menu-hover; a checked row (not a switch row) that is not
 * --selected-bg, or a switch row with a fill; a focus that is not a 2px accent outline inside the row (offset -2px) with the box's own ring off; a disabled row not at
 * half strength with a not-allowed cursor; a description not 12px --text-dim; a row whose input is not inside the label (the whole row is the target); a boxed row without a
 * description, not --radius-medium, or whose hairline changes when checked; a poll fill that is not behind the row, or a poll row without the percent in text; a segmented choice that
 * is not the Tabs joined switch with two to four options, 2px apart; an accent border or fill on any row; a pair under its contrast minimum; the family not marked Approved; the
 * stylesheet drawing an edge on one side, a coloured border, a hard-coded colour; the undecided list still naming Choice rows.
 */
import fs from 'node:fs';
import path from 'node:path';

import { alignRows } from './check-design-system-align.mjs';

export const id = 'choices';
export const todayOnly = [];

export function staticChecks({ fail, css, js, DS }) {
  if (/border-(left|right|top|bottom)\s*:/.test(css)) fail('proposed-choices.css: a rule draws an edge on one side (no bar)');
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-choices.css: a hard-coded colour (tokens only)');
  if (/accent-color\s*:/.test(css)) fail('proposed-choices.css: a native accent-color box (the Fields box is drawn from tokens)');
  if (/background[^;]*var\(--accent\)\s*;/.test(css)) fail('proposed-choices.css: an accent fill on a row (checked is --selected-bg)');
  if (!/status: 'approved'/.test(js)) fail('proposed-choices.js: the family is not marked Approved');
  const pj = fs.readFileSync(path.join(DS, 'proposed.js'), 'utf8');
  if (/'Choice rows and people chips'/.test(pj)) fail("proposed.js: the undecided list still names 'Choice rows and people chips'");
}

export async function browserChecks(b) {
  const { ev, cdp, sessionId, sc, where, problems, edgeColours } = b;
  const probe = JSON.parse(await ev(`(() => {
    const F = window.__ds.frames; const out = { problems: [], rows: 0 }; const bad = (m) => out.problems.push(m);
    const dd = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
    const near = (a, b2) => Math.abs(a - b2) <= 0.6;
    for (const t of ['Choice rows, all states', 'Choice rows, all states, 44px', 'Choice rows, segmented', 'Choice rows, in use', 'Choice rows, contrast']) if (!dd(t)) { bad('no frame ' + t); return JSON.stringify(out); }
    for (const [title, forced] of [['Choice rows, all states', 0], ['Choice rows, all states, 44px', 44]]) {
      const d = dd(title); const w = d.defaultView; const cs = (e, p) => w.getComputedStyle(e, p); const want = forced || (w.innerWidth <= 640 ? 44 : 32);
      const tok = (prop, expr) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop] = expr; host.appendChild(p); const c = w.getComputedStyle(p)[prop]; p.remove(); return c; };
      const selBg = tok('backgroundColor', 'var(--selected-bg)'); const hov = tok('backgroundColor', 'var(--menu-hover)'); const clear = 'rgba(0, 0, 0, 0)'; const acc = tok('color', 'var(--accent)'); const dim = tok('color', 'var(--text-dim)'); const medium = tok('borderTopLeftRadius', 'var(--radius-medium)');
      const rows = [...d.querySelectorAll('.pm-row')]; const wantRows = forced ? 3 : 7; if (rows.length !== wantRows) bad(title + ': expected ' + wantRows + ' rows of kinds, found ' + rows.length);
      rows.forEach((r, k) => { const nm = r.querySelector('.pm-role').textContent; const cells = [...r.querySelectorAll('.dsf-state')];
        cells.forEach((c, s) => { const lab = c.querySelector('.sdk-choice-row'); const inp = lab.querySelector('input'); out.rows += 1; const st = ['Rest', 'Hover', 'Focus', 'Checked', 'Checked hover', 'Disabled', 'Disabled checked'][s]; const sw = inp.classList.contains('sdk-switch'); const where2 = title + ': ' + nm + ', ' + st;
          const h = lab.getBoundingClientRect().height; const hasDesc = !!lab.querySelector('.sdk-choice-desc'); const boxed = lab.classList.contains('sdk-choice-boxed');
          if (!hasDesc && !boxed) { if (!near(h, want)) bad(where2 + ' is ' + h + 'px high, expected ' + want); } else if (h < want - 0.6) bad(where2 + ' is ' + h + 'px, under ' + want);
          if (!lab.contains(inp) || lab.querySelector('.sdk-choice-label') === null) bad(where2 + ': the input is not inside the label with its words');
          const ib = inp.getBoundingClientRect(); if (sw) { if (!near(ib.width, 36) || !near(ib.height, 20)) bad(where2 + ': the switch is ' + ib.width + ' by ' + ib.height); } else if (!near(ib.width, 16) || !near(ib.height, 16)) bad(where2 + ': the box is ' + ib.width + ' by ' + ib.height + ', expected 16');
          if (cs(inp).appearance !== 'none') bad(where2 + ': the box has a native appearance (' + cs(inp).appearance + ')');
          if (!sw && !inp.checked && cs(inp).borderTopColor !== dim && s !== 5) bad(where2 + ': the unchecked box edge is not --text-dim');
          const bg = cs(lab).backgroundColor; const checked = inp.checked;
          if (s === 0 || s === 5) { if (bg !== clear && !lab.classList.contains('sdk-choice-poll')) bad(where2 + ' has a fill at rest (' + bg + ')'); }
          if (s === 1 && bg !== hov) bad(where2 + ': the hover is not --menu-hover (' + bg + ')');
          if (s === 3 || s === 6) { if (sw) { if (bg !== clear) bad(where2 + ': a switch row has a fill (' + bg + ')'); } else if (bg !== selBg) bad(where2 + ': checked is not --selected-bg (' + bg + ')'); }
          if (s === 2) { const c = cs(lab); if (c.outlineStyle !== 'solid' || c.outlineWidth !== '2px' || c.outlineColor !== acc || c.outlineOffset !== '-2px') bad(where2 + ': the focus is not a 2px accent outline inside the row (' + c.outlineWidth + ' ' + c.outlineColor + ' ' + c.outlineOffset + ')'); }
          if (s >= 5) { const c = cs(lab); if (c.opacity !== '0.5' || c.cursor !== 'not-allowed') bad(where2 + ': disabled is not half strength with a not-allowed cursor'); }
          const ds = lab.querySelector('.sdk-choice-desc'); if (ds && s === 0) { if (cs(ds).fontSize !== '12px' || cs(ds).color !== dim) bad(where2 + ': the description is not 12px --text-dim'); }
          if (boxed) { const c = cs(lab); if (c.borderTopWidth !== '1px' || c.borderTopLeftRadius !== medium) bad(where2 + ': a boxed row is not a 1px hairline with --radius-medium'); if (!hasDesc) bad(where2 + ': a boxed row has no description');
            if (c.borderTopColor === acc) bad(where2 + ': a boxed row has an accent border'); if (checked && c.borderTopColor !== cs(cells[0].querySelector('.sdk-choice-row')).borderTopColor) bad(where2 + ': the boxed hairline changes when checked'); }
          const fill = lab.querySelector('.sdk-progress-behind'); if (fill) { if (cs(fill).position !== 'absolute') bad(where2 + ': the poll fill is not behind the row'); if (!/%/.test(lab.querySelector('.sdk-meter-value').textContent)) bad(where2 + ': the poll row has no percent in text'); } }); });
    }
    // segmented
    { const d = dd('Choice rows, segmented'); const w = d.defaultView; const groups = [...d.querySelectorAll('.sdk-choice')]; if (groups.length !== 6) bad('segmented: expected 6 groups, found ' + groups.length);
      for (const g of groups) { const bt = [...g.children]; const small = g.classList.contains('sdk-tabs-small');
        if (!g.classList.contains('sdk-tabs-joined') || g.getAttribute('role') !== 'group' || !g.getAttribute('aria-label')) bad('segmented: a choice is not a named Tabs joined switch');
        if (bt.length < 2 || bt.length > 4) bad('segmented: ' + bt.length + ' options (two to four)');
        const hgt = bt[0].getBoundingClientRect().height; if (small ? hgt > 30.6 : hgt < 37.4) bad('segmented: a ' + (small ? 'small' : 'default') + ' segment is ' + hgt + 'px high');
        const on = bt.filter((x) => x.getAttribute('aria-pressed') === 'true'); if (on.length !== 1) bad('segmented: ' + on.length + ' segments pressed');
        else if (w.getComputedStyle(on[0]).backgroundColor === w.getComputedStyle(bt.find((x) => x !== on[0])).backgroundColor) bad('segmented: the chosen segment has no fill');
        if (bt.length > 1) { const gap = bt[1].getBoundingClientRect().left - bt[0].getBoundingClientRect().right; if (Math.abs(gap - 2) > 0.6) bad('segmented: the segments are ' + gap + 'px apart, expected 2'); } } }
    // in use: nothing has an accent edge or fill
    for (const t of ['Choice rows, in use', 'Choice rows, all states']) { const d = dd(t); const w = d.defaultView; const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style.color = 'var(--accent)'; host.appendChild(p); const acc = w.getComputedStyle(p).color; p.remove();
      for (const e of d.querySelectorAll('.sdk-choice-row')) { const c = w.getComputedStyle(e); if (c.backgroundColor === acc) bad(t + ': an accent fill on a row'); if (parseFloat(c.borderTopWidth) > 0 && c.borderTopColor === acc) bad(t + ': an accent border on a row'); } }
    { const d = dd('Choice rows, in use'); if (d.querySelectorAll('.sdk-choice-boxed').length < 3 || [...d.querySelectorAll('.sdk-choice-boxed')].some((e) => !e.querySelector('.sdk-choice-desc'))) bad('in use: the boxed rows are fewer than 3 or one has no description'); if (d.querySelectorAll('.sdk-choice-row:has(> input.sdk-switch)').length < 3) bad('in use: fewer than 3 switch rows'); }
    // contrast
    { const d = dd('Choice rows, contrast'); for (const tr of d.querySelectorAll('.pm-ct tbody tr')) if (tr.cells[4].textContent !== 'Passes') bad('contrast below its minimum: ' + tr.cells[0].textContent + ' (' + tr.cells[2].textContent + ')'); }
    if (out.rows < 60) bad('only ' + out.rows + ' rows drawn');
    return JSON.stringify(out); })()`));
  for (const x of [...new Set(probe.problems)]) problems.push(`${where}: ${x}`);
  // The focus outline of a row: the same on all four sides at 1.25x and 1.5x with a fractional scroll offset.
  if (sc.width >= 500) {
    for (const dsf of [1.25, 1.5]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: dsf, mobile: false }, sessionId);
      await new Promise((r) => setTimeout(r, 400));
      for (const nudge of [0.3, 0.7]) {
        const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Choice rows, all states'); const d = m.iframe.contentDocument; const el = d.querySelectorAll('.pm-row')[0].querySelectorAll('.dsf-state')[2].querySelector('.sdk-choice-row'); el.scrollIntoView({ block: 'center', behavior: 'instant' });
          const c = document.getElementById('ds-content'); c.style.marginTop = '${nudge}px'; c.style.marginLeft = '${nudge * 1.7 % 1}px'; window.scrollTo(0, Math.round(window.scrollY) + ${nudge}); await new Promise((r) => setTimeout(r, 150));
          const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style.color = 'var(--accent)'; host.appendChild(p); const col = getComputedStyle(p).color; p.remove();
          const b = el.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height, col }); })()`));
        const pad = 6;
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x - pad, y: at.y - pad, width: at.w + pad * 2, height: at.h + pad * 2, scale: 1 } }, sessionId);
        const e = edgeColours(Buffer.from(shot.data, 'base64'), at.col.match(/[\d.]+/g).map(Number), dsf, pad, at.w, at.h);
        const vals = Object.values(e);
        if (Math.max(...vals) - Math.min(...vals) > 40) problems.push(`${where}: the choice row focus outline is not the same on all four sides at ${dsf}x with the page ${nudge}px off the pixel grid (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
        if (Math.max(...vals) > 60) problems.push(`${where}: a side of the choice row focus outline never reaches its full colour at ${dsf}x (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
      }
      await ev(`(() => { const c = document.getElementById('ds-content'); c.style.marginTop = ''; c.style.marginLeft = ''; })()`);
    }
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
    await new Promise((r) => setTimeout(r, 300));
  }
  // Alignment (tools/check-design-system-align.mjs): shared centre lines, even padding, gaps on the 4px scale.
  await alignRows(b, [
    { frame: /^Choice rows, all states$/, row: '.pm-row', across: (sc.width > 640 ? '.pm-role, ' : '') + '.dsf-ex .sdk-choice-label', centres: false, padding: false, gaps: false },
    { frame: 'Choice rows, in use', row: '.sdk-choice-row', padding: 'x' },
    { frame: 'Choice rows, in use', row: '.sdk-choice-list', centres: false, padding: false },
    { frame: 'Choice rows, in use', row: '.pm-panel', centres: false, padding: false },
    { frame: 'Choice rows, segmented', row: '.pm-line', padding: false },
  ]);
}
