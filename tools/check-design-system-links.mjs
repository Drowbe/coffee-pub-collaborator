/*
 * check-design-system-links.mjs -- the Links family of the proposed design system page (public/design-system/legacy/system-v1/proposed-links.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: link text under 4.5 to 1 on the page, a panel, a card or a field fill (live, in the mode on show), or the picked link colour under 4.5 to 1 on the
 * page and a panel in any theme and mode the Colour family ships; a link in running text that is not underlined 1px with a 2px offset (2px thick on hover); a
 * standalone link or link button underlined at rest, or not underlined on hover and on focus; a link in a nav, a tab, a menu row, a button or a chip that is underlined;
 * a :visited rule that changes the colour; a focus that is not a 2px solid accent outline 2px off the text, or not equal on all four sides at 1.25x and 1.5x;
 * an external link without the 12px aria-hidden icon, the visually hidden words, target="_blank" and rel="noopener" (or an icon on a link that stays in the app);
 * a link button without its target (32px high, 44px on a phone); a link chip that is not a 24px Chips tag; the family not marked Approved; the stylesheet
 * styling a bare a, drawing an edge on one side, or using a hard-coded colour; the undecided list still naming Links.
 */
import fs from 'node:fs';
import path from 'node:path';

import { alignRows } from './check-design-system-align.mjs';

export const id = 'links';
export const todayOnly = [];

export function staticChecks({ fail, css, js, DS }) {
  if (/border-(left|right|top|bottom)\s*:/.test(css)) fail('proposed-links.css: a rule draws an edge on one side (no bar)');
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-links.css: a hard-coded colour (tokens only)');
  for (const m of css.matchAll(/([^{}]+)\{/g)) {
    const sel = m[1].trim(); if (!sel || sel.startsWith('@')) continue;
    if (/^\.ds-proposed\s+a\b/.test(sel)) fail('proposed-links.css: a rule styles a bare a (links get a class or sit in .sdk-prose)');
  }
  if (!/:visited\s*\{[^}]*color:\s*var\(--text-link\)/.test(css)) fail('proposed-links.css: no :visited rule that keeps the link colour (no visited colour)');
  if (!/--text-link:/.test(css)) fail('proposed-links.css: no --text-link token');
  if (!/text-underline-offset:\s*var\(--link-offset\)/.test(css) || !/--link-offset:\s*2px/.test(css)) fail('proposed-links.css: the underline offset is not 2px');
  if (!/--link-icon:\s*12px/.test(css)) fail('proposed-links.css: the external icon is not 12px');
  if (!/status: 'approved'/.test(js)) fail('proposed-links.js: the family is not marked Approved');
  const pj = fs.readFileSync(path.join(DS, 'proposed.js'), 'utf8');
  if (/'Links'/.test(pj)) fail("proposed.js: the undecided list still names 'Links'");
}

export async function browserChecks(b) {
  const { ev, cdp, sessionId, sc, where, problems, edgeColours } = b;
  const probe = JSON.parse(await ev(`(() => {
    const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
    const out = { problems: [] }; const bad = (m) => out.problems.push(m);
    const d = get('Links, all states'); const dn = get('Links that are not links'); const dt = get('Links in running text'); const dc = get('Links in use'); const dk = get('Links, contrast');
    if (!d || !dn || !dt || !dc || !dk) { bad('a Links frame is missing'); return JSON.stringify(out); }
    const cs = (x, p) => d.defaultView.getComputedStyle(x, p);
    const rows = [...d.querySelectorAll('.pm-row')]; const cell = (r, s) => rows[r].querySelectorAll('.dsf-state')[s].querySelector('a,button');
    // rows: 0 running, 1 standalone, 2 icon, 3 button, 4 external, 5 chip. states: 0 rest, 1 hover, 2 focus, 3 pressed, 4 disabled.
    const run = cell(0, 0); const r1 = cs(run);
    if (r1.textDecorationLine !== 'underline' || r1.textDecorationThickness !== '1px' || r1.textUnderlineOffset !== '2px') bad('a link in running text is not underlined 1px with a 2px offset (' + r1.textDecorationLine + ' ' + r1.textDecorationThickness + ' ' + r1.textUnderlineOffset + ')');
    if (cs(cell(0, 1)).textDecorationThickness !== '2px') bad('a link in running text is not 2px thick on hover');
    for (const r of [1, 2, 3, 4]) {
      const nm = ['', 'standalone link', 'link with an icon', 'link button', 'external link'][r];
      if (cs(cell(r, 0)).textDecorationLine !== 'none') bad('the ' + nm + ' is underlined at rest');
      if (cs(cell(r, 1)).textDecorationLine !== 'underline') bad('the ' + nm + ' is not underlined on hover');
      if (cs(cell(r, 2)).textDecorationLine !== 'underline') bad('the ' + nm + ' is not underlined on focus');
    }
    for (let r = 0; r < 5; r += 1) {
      const f = cs(cell(r, 2));
      if (f.outlineStyle !== 'solid' || f.outlineWidth !== '2px' || f.outlineOffset !== '2px') bad('the focus of row ' + r + ' is not a 2px solid outline 2px off (' + f.outlineStyle + ' ' + f.outlineWidth + ' ' + f.outlineOffset + ')');
    }
    // not links
    for (const [sel, nm] of [['.pm-navrow a', 'a nav link'], ['.tb-tab', 'a tab'], ['a.btn', 'a button'], ['a.sdk-menu-item', 'a menu row'], ['a.sdk-chip-tag', 'a link chip']]) {
      const e = dn.querySelector(sel); if (!e) { bad('no ' + nm + ' in the not-a-link frame'); continue; }
      if (dn.defaultView.getComputedStyle(e).textDecorationLine !== 'none') bad(nm + ' is underlined');
    }
    const chip = d.querySelectorAll('.pm-row')[5].querySelector('a'); const ch = Math.round(chip.getBoundingClientRect().height);
    if (ch !== 24 || !chip.classList.contains('sdk-chip-tag')) bad('the link chip is ' + ch + 'px, not a 24px Chips tag');
    // external links
    for (const doc of [d, dt, dc]) for (const a of doc.querySelectorAll('a[target="_blank"]')) {
      const ic = a.querySelector('.sdk-link-ext'); const hid = a.querySelector('.visually-hidden');
      if (!ic || ic.getAttribute('aria-hidden') !== 'true' || parseFloat(doc.defaultView.getComputedStyle(ic).fontSize) !== 12) bad('an external link has no 12px aria-hidden icon');
      if (!hid || !/opens in a new tab/.test(hid.textContent)) bad('an external link has no hidden "opens in a new tab"');
      if (!/noopener/.test(a.rel)) bad('an external link has no rel="noopener"');
      if (!ic.classList.contains('fa-arrow-up-right-from-square')) bad('the external icon is not fa-arrow-up-right-from-square');
    }
    for (const doc of [d, dt, dc, dn]) for (const a of doc.querySelectorAll('a:not([target="_blank"]) .sdk-link-ext')) bad('an icon on a link that stays in the app');
    // link button target
    { const btn = cell(3, 0); const a = cs(btn, '::after'); const want = d.defaultView.innerWidth <= 640 ? 44 : 32; const hh = parseFloat(a.height); const bh = btn.getBoundingClientRect().height;
      if (a.content === 'none' || Math.abs(hh - (bh + 2 * (want === 44 ? 14 : 8))) > 1.5 || hh < want - 1) bad('the link button target is ' + hh + 'px high, expected about ' + want); }
    // the link colour on its surfaces, live
    const host = d.querySelector('.ds-proposed'); const cv = d.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true });
    const rgb = (c) => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = c; g.fillRect(0, 0, 1, 1); const x = g.getImageData(0, 0, 1, 1).data; return [x[0], x[1], x[2]]; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const tok = (n) => { const p = d.createElement('span'); p.style.color = 'var(' + n + ')'; host.appendChild(p); const c = d.defaultView.getComputedStyle(p).color; p.remove(); return rgb(c); };
    const ra = (a, b2) => { const x = lum(a); const y = lum(b2); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const link = rgb(cs(cell(1, 0)).color); out.worst = 99;
    for (const n of ['--bg', '--bg-section', '--bg-card', '--bg-input']) { const r = ra(link, tok(n)); out.worst = Math.min(out.worst, r); if (r < 4.5) bad('link text is ' + r.toFixed(2) + ' to 1 on ' + n); }
    // the sweep over every theme and mode
    const sweep = [...dk.querySelectorAll('#lk-sweep tbody tr')]; out.sweep = sweep.length; if (sweep.length < 6) bad('the theme sweep has ' + sweep.length + ' rows, expected 6');
    for (const tr of sweep) { const mn = parseFloat(tr.querySelector('[data-link-min]').dataset.linkMin); out.sweepMin = Math.min(out.sweepMin || 99, mn); if (mn < 4.5) bad('the picked link colour is ' + mn + ' to 1 in ' + tr.cells[0].textContent); }
    for (const tr of dk.querySelectorAll('.pm-ct:not(#lk-sweep) tbody tr')) if (/Link text|Focus ring/.test(tr.cells[0].textContent) && tr.cells[4].textContent !== 'Passes') bad('contrast row fails: ' + tr.cells[0].textContent);
    return JSON.stringify(out); })()`));
  for (const x of probe.problems) problems.push(`${where}: ${x}`);
  // The focus ring of a standalone link: the same on all four sides at 1.25x and 1.5x with the page off the pixel grid.
  if (sc.width >= 500) {
    for (const dsf of [1.25, 1.5]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: dsf, mobile: false }, sessionId);
      await new Promise((r) => setTimeout(r, 400));
      for (const nudge of [0.3, 0.7]) {
        const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Links, all states'); const d = m.iframe.contentDocument; const el = d.querySelectorAll('.pm-row')[1].querySelectorAll('.dsf-state')[2].querySelector('a'); el.scrollIntoView({ block: 'center', behavior: 'instant' });
          const c = document.getElementById('ds-content'); c.style.marginTop = '${nudge}px'; c.style.marginLeft = '${nudge * 1.7 % 1}px'; window.scrollTo(0, Math.round(window.scrollY) + ${nudge}); await new Promise((r) => setTimeout(r, 150));
          const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style.color = 'var(--accent)'; host.appendChild(p); const col = getComputedStyle(p).color; p.remove();
          const b = el.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height, col }); })()`));
        const pad = 6; const off = 3; // the ring is drawn 2px off the text and 2px thick: its middle is 3px outside the box
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x - pad, y: at.y - pad, width: at.w + pad * 2, height: at.h + pad * 2, scale: 1 } }, sessionId);
        const e = edgeColours(Buffer.from(shot.data, 'base64'), at.col.match(/[\d.]+/g).map(Number), dsf, pad - off, at.w + off * 2, at.h + off * 2);
        const vals = Object.values(e);
        if (Math.max(...vals) - Math.min(...vals) > 40) problems.push(`${where}: the link focus ring is not the same on all four sides at ${dsf}x with the page ${nudge}px off the pixel grid (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
        if (Math.max(...vals) > 60) problems.push(`${where}: a side of the link focus ring never reaches its full colour at ${dsf}x (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
      }
      await ev(`(() => { const c = document.getElementById('ds-content'); c.style.marginTop = ''; c.style.marginLeft = ''; })()`);
    }
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
    await new Promise((r) => setTimeout(r, 300));
  }
  // Alignment (tools/check-design-system-align.mjs): shared centre lines, even padding, gaps on the 4px scale.
  await alignRows(b, [
    { frame: 'Links, all states', row: '.pm-row', across: (sc.width > 640 ? '.pm-role, ' : '') + '.dsf-ex', centres: false, padding: false, gaps: false },
    { frame: 'Links in use', row: '.pm-opt', padding: false },
    { frame: /^Links in/, row: '.pm-chat', tops: true, padding: false },
    { frame: 'Links in use', row: '.pm-card2', centres: false },
    { frame: 'Links that are not links', row: '.pm-row-flex', padding: false },
  ]);
}
