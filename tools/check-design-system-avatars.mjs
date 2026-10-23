/*
 * check-design-system-avatars.mjs -- the Avatars and portraits family of the proposed design system page (public/design-system/legacy/system-v1/proposed-avatars.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: an avatar that is not 20, 24, 32, 40, 64 or 96px square, or not a circle (--radius-round); initials under 11px, off the size's step (11, 11, 13, 16, 28, 40px)
 * or not weight 600; a second initial shown at 20 or 24px, or hidden from 32px; a default fill that is not the text at 14% over the panel; a photo that is not object-fit cover;
 * a fallback icon that is not fa-user at half the diameter; a presence dot that is not 7px, without a 2px ring in the surface colour, not on the circle's lower right edge, not
 * --ok for online or --text-dim for away, or without a title and an aria-label; a list row with a dot and not the word; a stack that does not overlap by 8px with a ring on each
 * circle, or whose count is not the 14px micro count with 9px digits; a photo tile that is not 72, 52 or 96px, not --radius-medium, with a border or not object-fit cover;
 * an avatar with neither aria-hidden nor role="img" and a name; initials under 4.5 to 1 on the fill (default and each of the eight tints); the family not marked Approved; the
 * stylesheet drawing an edge on one side, a border colour, a hard-coded colour; the undecided list still naming Avatars and portraits.
 */
import fs from 'node:fs';
import path from 'node:path';

import { alignRows } from './check-design-system-align.mjs';

export const id = 'avatars';
export const todayOnly = [];

export function staticChecks({ fail, css, js, DS }) {
  if (/border-(left|right|top|bottom)\s*:/.test(css)) fail('proposed-avatars.css: a rule draws an edge on one side (no bar)');
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-avatars.css: a hard-coded colour (tokens only)');
  for (const m of css.matchAll(/border-radius\s*:\s*([^;}]+)/g)) if (!/^(inherit|var\(--radius-(min|small|medium|large|round)\))$/.test(m[1].trim())) fail(`proposed-avatars.css: a radius that is not a token: ${m[1].trim()}`);
  if (!/status: 'approved'/.test(js)) fail('proposed-avatars.js: the family is not marked Approved');
  if (/#1a1410/i.test(css)) fail('proposed-avatars: the raw #1a1410 fallback is back');
  const pj = fs.readFileSync(path.join(DS, 'proposed.js'), 'utf8');
  if (/'Avatars and portraits'/.test(pj)) fail("proposed.js: the undecided list still names 'Avatars and portraits'");
}

export async function browserChecks(b) {
  const { ev, sc, where, problems } = b;
  const probe = JSON.parse(await ev(`(() => {
    const F = window.__ds.frames; const out = { problems: [], n: 0 }; const bad = (m) => out.problems.push(m);
    const dd = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
    for (const t of ['Avatars, sizes and fills', 'Avatars, presence', 'Avatars, the stack', 'Avatars, photo tiles', 'Avatars, in use', 'Avatars, contrast']) if (!dd(t)) { bad('no frame ' + t); return JSON.stringify(out); }
    const near = (a, b2, e) => Math.abs(a - b2) <= (e || 0.6);
    const STEP = { 20: 11, 24: 11, 32: 13, 40: 16, 64: 28, 96: 40 };
    for (const f of F.filter((x) => /^Avatars/.test(x.iframe.title) && !/contrast/.test(x.iframe.title))) {
      const d = f.iframe.contentDocument; const w = d.defaultView; const cs = (e, p) => w.getComputedStyle(e, p); const t = f.iframe.title;
      const tok = (prop, expr) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop] = expr; host.appendChild(p); const c = w.getComputedStyle(p)[prop]; p.remove(); return c; };
      const round = tok('borderTopLeftRadius', 'var(--radius-round)'); const med = tok('borderTopLeftRadius', 'var(--radius-medium)');
      const panel = tok('backgroundColor', 'var(--bg-section)'); const okc = tok('backgroundColor', 'var(--ok-mark)'); const dimc = tok('backgroundColor', 'var(--text-dim)');
      const fill = tok('backgroundColor', 'color-mix(in srgb, var(--text) 14%, var(--bg-section))');
      for (const e of d.querySelectorAll('.sdk-avatar')) { out.n += 1; const r = e.getBoundingClientRect(); const c = cs(e);
        const sizeCls = [...e.classList].find((x) => /^sdk-avatar-(20|24|40|64|96)$/.test(x)); const px = sizeCls ? parseInt(sizeCls.split('-')[2], 10) : 32;
        if (!near(r.width, px) || !near(r.height, px)) bad(t + ': an avatar is ' + r.width + ' by ' + r.height + 'px, expected ' + px);
        if (c.borderTopLeftRadius !== round) bad(t + ': an avatar is not a circle (' + c.borderTopLeftRadius + ')');
        if (!e.hasAttribute('aria-hidden') && !(e.getAttribute('role') === 'img' && e.getAttribute('aria-label'))) bad(t + ': an avatar is neither aria-hidden nor a named image');
        const ini = e.querySelector('.sdk-avatar-ini'); const ini2 = e.querySelector('.sdk-avatar-ini2'); const img = e.querySelector(':scope > img'); const ic = e.querySelector(':scope > i');
        if (ini) { const fs2 = parseFloat(cs(ini).fontSize); if (fs2 < 11) bad(t + ': initials are ' + fs2 + 'px, under 11'); if (fs2 !== STEP[px]) bad(t + ': the initials at ' + px + 'px are ' + fs2 + 'px, expected ' + STEP[px]); if (cs(ini).fontWeight !== '600') bad(t + ': the initials are weight ' + cs(ini).fontWeight);
          const shown = cs(ini2).display !== 'none'; if ((px <= 24) === shown) bad(t + ': the second initial is ' + (shown ? 'shown' : 'hidden') + ' at ' + px + 'px');
          if (!e.hasAttribute('data-tint') && c.backgroundColor !== fill) bad(t + ': the default fill is not the text at 14% over the panel (' + c.backgroundColor + ')'); }
        if (img && cs(img).objectFit !== 'cover') bad(t + ': a photo is not object-fit cover');
        if (ic) { if (!ic.classList.contains('fa-user')) bad(t + ': the fallback icon is not fa-user'); if (!near(parseFloat(cs(ic).fontSize), px / 2, 0.51)) bad(t + ': the fallback icon is ' + cs(ic).fontSize + ' at ' + px + 'px'); }
        const dot = e.querySelector('.sdk-presence');
        if (dot) { const dr = dot.getBoundingClientRect(); const dc = cs(dot);
          if (!near(dr.width, 7) || !near(dr.height, 7)) bad(t + ': a presence dot is ' + dr.width + ' by ' + dr.height + 'px, expected 7');
          const ring = dc.boxShadow; if (!/\\b2px\\b/.test(ring) || ring.indexOf(panel) < 0) bad(t + ': the presence dot has no 2px ring in the panel colour (' + ring + ')');
          const st = dot.dataset.state; if (dc.backgroundColor !== (st === 'online' ? okc : dimc)) bad(t + ': the ' + st + ' dot is not ' + (st === 'online' ? '--ok-mark' : '--text-dim'));
          if (!dot.getAttribute('title') || !dot.getAttribute('aria-label')) bad(t + ': a presence dot has no title or aria-label');
          const cx = dr.left + dr.width / 2 - (r.left + r.width / 2); const cy = dr.top + dr.height / 2 - (r.top + r.height / 2); const dist = Math.hypot(cx, cy);
          if (cx <= 0 || cy <= 0 || Math.abs(dist - px / 2) > 1.5) bad(t + ': the presence dot is not on the circle\\'s lower right edge (' + dist.toFixed(1) + ' from the centre of a ' + px + 'px avatar)'); } }
      // in a list, the word
      for (const row of d.querySelectorAll('.sdk-person')) { const dot = row.querySelector('.sdk-presence'); if (dot) { const wd = row.querySelector('.sdk-presence-word'); if (!wd || !new RegExp(dot.dataset.state, 'i').test(wd.textContent)) bad(t + ': a list row has a dot and not its word'); } }
      // the stack
      for (const s of d.querySelectorAll('.sdk-avatar-stack')) { const a = [...s.children].filter((x) => x.classList.contains('sdk-avatar'));
        for (let i = 1; i < a.length; i += 1) { if (cs(a[i]).marginLeft !== '-8px') bad(t + ': a stack does not overlap by 8px'); if (!/\\b2px\\b/.test(cs(a[i]).boxShadow)) bad(t + ': a stack circle has no ring'); }
        const cnt = s.querySelector('.sdk-badge-micro'); if (cnt) { const c = cs(cnt); if (!near(cnt.getBoundingClientRect().height, 14) || c.fontSize !== '9px' || !/^[0-9]+$/.test(cnt.textContent.trim())) bad(t + ': the stack count is not the 14px micro count with 9px digits'); if (!s.querySelector('.visually-hidden')) bad(t + ': the stack count has no words for a screen reader'); } }
      // photo tiles
      for (const e of d.querySelectorAll('.sdk-photo')) { out.n += 1; const r = e.getBoundingClientRect(); const c = cs(e);
        if (![52, 72, 96].some((x) => near(r.width, x) && near(r.height, x))) bad(t + ': a photo tile is ' + r.width + ' by ' + r.height + 'px'); if (c.borderTopLeftRadius !== med) bad(t + ': a photo tile is not --radius-medium (' + c.borderTopLeftRadius + ')'); if (c.borderTopWidth !== '0px') bad(t + ': a photo tile has a border');
        const img = e.querySelector(':scope > img'); if (img && cs(img).objectFit !== 'cover') bad(t + ': a tile photo is not object-fit cover');
        const dot = e.querySelector('.sdk-presence'); if (dot) { const dr = dot.getBoundingClientRect(); if (!near(dr.width, 7) || dr.right > r.right - 4 || dr.bottom > r.bottom - 4) bad(t + ': a tile dot is not 7px inside the lower right corner'); } }
    }
    if (out.n < 40) bad('only ' + out.n + ' avatars and tiles drawn');
    { const d = dd('Avatars, the stack'); if (!d.querySelector('.sdk-avatar-stack .sdk-badge-micro')) bad('no stack with a micro count'); }
    { const d = dd('Avatars, photo tiles'); if (d.querySelectorAll('.sdk-photo').length < 5) bad('the tiles frame has fewer than 5 tiles'); }
    // contrast
    { const d = dd('Avatars, contrast'); const rows = [...d.querySelectorAll('.pm-ct:not(#av-tints) tbody tr')];
      for (const tr of rows.slice(0, 2)) if (tr.cells[4].textContent !== 'Passes') bad('contrast row below its minimum: ' + tr.cells[0].textContent + ' (' + tr.cells[2].textContent + ')');
      const tints = [...d.querySelectorAll('#av-tints tbody tr')]; if (tints.length !== 8) bad('the list of tints has ' + tints.length + ' rows'); for (const tr of tints) if (parseFloat(tr.cells[1].dataset.avMin) < 4.5) bad('the letters of the ' + tr.cells[0].textContent + ' tint are ' + tr.cells[1].textContent + ', under 4.5'); }
    return JSON.stringify(out); })()`));
  for (const x of [...new Set(probe.problems)]) problems.push(`${where}: ${x}`);
  // Alignment (tools/check-design-system-align.mjs): shared centre lines, even padding, gaps on the 4px scale.
  await alignRows(b, [
    { frame: 'Avatars, sizes and fills', row: '.pm-row', across: (sc.width > 640 ? '.pm-role, ' : '') + '.sdk-avatar', centres: false, padding: false, gaps: false },
    { frame: 'Avatars, presence', row: '.pm-row:first-child', across: (sc.width > 640 ? '.pm-role, ' : '') + '.sdk-avatar', centres: false, padding: false, gaps: false },
    { frame: 'Avatars, photo tiles', row: '.pm-tiles', across: '.sdk-photo, .sdk-avatar', centres: false, padding: false, gaps: false },
    { frame: 'Avatars, in use', row: '.pm-msg', tops: true, padding: false },
    { frame: 'Avatars, in use', row: '.pm-link', tops: true },
    { frame: 'Avatars, in use', row: '.pm-members > div', centres: false, padding: 'x' },
    { frame: 'Avatars, in use', row: '.pm-call > div', centres: false, padding: 'x' },
    { frame: 'Avatars, in use', row: '.pm-card3', centres: false },
  ]);
}
