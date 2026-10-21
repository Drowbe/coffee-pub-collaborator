#!/usr/bin/env node
/*
 * check-design-system-align.mjs -- the alignment measuring helper for the families of the proposed design system page. Not a check of its own
 * (it has no id and is not in check-design-system-families.json): a family's browserChecks(b) imports alignRows and calls it with a list of rows.
 *
 *   import { alignRows } from './check-design-system-align.mjs';
 *   await alignRows(b, [
 *     { frame: /^Toasts, banner/, row: '.sdk-banner' },                         // every .sdk-banner in the frames whose title matches
 *     { frame: 'Links, list', row: '.row', skip: '.sdk-badge', padding: false }, // skip: children left out; padding: false = not symmetric on purpose
 *   ]);
 *
 * For each element the row selector matches (visible ones, in the frames whose title matches `frame`: a string is an exact title, a RegExp a match),
 * it measures the row's visible, in-flow children and fails when:
 *   - the vertical centres differ by more than 1px. A child that wraps to two lines or more counts by the centre of its FIRST line (top + top padding
 *     + half a line); every other child by the centre of its box. So a one-line row shares one centre line, and a multi-line row shares the first
 *     line's centre line (an icon, a button and a close are not centred against the whole paragraph);
 *   - the row's left padding differs from its right padding, or the top from the bottom, by more than 1px (`padding: false` leaves this out, `padding: 'x'` judges left and right only);
 *   - the gap between two neighbours (side by side, or one under the other) is not on the 4px scale (4, 8, 12, 16, 20, 24) when it is under 28px. A gap
 *     of 28px or more is layout pushing parts apart (space-between, an auto margin) and is not judged. `gaps: false` leaves gaps out; `zero: true`
 *     allows 0 (parts that touch on purpose, such as a segmented control);
 *   - the selector matches nothing in a frame set (so a renamed class cannot silently pass).
 * Row options: tops (true: the parts count by their top edges, for a row of avatar-and-text where the avatar hangs from the first line), flush (true: every child runs the row's full inner width), box (true: every child counts by the centre of its box, for a row whose stack of bars is centred as a whole, such as a skeleton row), across (a selector of parts in different cells of the row that must share one centre line), row (selector), frame, skip (selector of children to leave out), only (selector: judge just these children), padding, gaps, zero,
 * centres (false: leave the centre test out, for a row whose parts are deliberately top-aligned columns), tol (px, default 1).
 */
export async function alignRows(b, rows) {
  const { ev, where, problems } = b;
  const specs = rows.map((r) => ({ ...r, frame: r.frame instanceof RegExp ? { re: r.frame.source, flags: r.frame.flags } : { eq: r.frame } }));
  const r = JSON.parse(await ev(`(${alignProbe.toString()})(${JSON.stringify(specs)})`));
  for (const x of r.problems) problems.push(`${where}: ${x}`);
  return r;
}

// Runs in the page.
const alignProbe = (specs) => {
  const out = { problems: [], rows: 0 };
  const F = window.__ds.frames;
  const SCALE = [4, 8, 12, 16, 20, 24];
  const fmt = (n) => Math.round(n * 10) / 10;
  for (const sp of specs) {
    const tol = sp.tol == null ? 1 : sp.tol;
    const frames = F.filter((f) => (sp.frame.re ? new RegExp(sp.frame.re, sp.frame.flags).test(f.iframe.title) : f.iframe.title === sp.frame.eq));
    let seen = 0;
    for (const f of frames) {
      const d = f.iframe.contentDocument; if (!d) continue;
      const win = d.defaultView;
      for (const row of d.querySelectorAll(sp.row)) {
        const rc = row.getBoundingClientRect(); const rcs = win.getComputedStyle(row);
        if (rcs.display === 'none' || rcs.visibility === 'hidden' || !rc.width || !rc.height) continue;
        seen += 1;
        const name = `${f.iframe.title}: ${sp.row}${row.dataset && row.dataset.kind ? `[${row.dataset.kind}]` : ''} "${(row.textContent || '').trim().replace(/\s+/g, ' ').slice(0, 28)}"`;
        const kids = [...row.children].filter((c) => {
          if (sp.skip && c.matches(sp.skip)) return false;
          if (sp.only && !c.matches(sp.only)) return false;
          const cs = win.getComputedStyle(c); const r2 = c.getBoundingClientRect();
          return cs.display !== 'none' && cs.visibility !== 'hidden' && cs.position !== 'absolute' && cs.position !== 'fixed' && r2.width > 0 && r2.height > 0;
        });
        // The first-line centre of a child, or the centre of its box. A stack of blocks (a column of title and text) is judged by its first block.
        const leafCentre = (c) => {
          const cs = win.getComputedStyle(c); const r2 = c.getBoundingClientRect();
          const fs = parseFloat(cs.fontSize) || 14; const lh = cs.lineHeight === 'normal' ? fs * 1.25 : parseFloat(cs.lineHeight);
          const pt = parseFloat(cs.paddingTop) + parseFloat(cs.borderTopWidth); const pb = parseFloat(cs.paddingBottom) + parseFloat(cs.borderBottomWidth);
          const inner = r2.height - pt - pb;
          const hasText = [...c.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) || (c.children.length > 0 && [...c.children].every((e) => /^(B|STRONG|I|EM|A|SPAN|CODE|SMALL)$/.test(e.tagName)) && c.textContent.trim());
          if (hasText && lh && inner > lh * 1.5 && cs.display !== 'flex' && cs.display !== 'inline-flex' && cs.display !== 'grid') return r2.top + pt + lh / 2;
          return r2.top + r2.height / 2;
        };
        const centre = (c) => {
          if (sp.tops) return c.getBoundingClientRect().top;
          if (sp.box) { const r2 = c.getBoundingClientRect(); return r2.top + r2.height / 2; }
          const cs = win.getComputedStyle(c);
          const stack = (cs.display === 'block' || cs.display === 'list-item' || (cs.display === 'flex' && cs.flexDirection === 'column') || (cs.display === 'grid' && cs.gridTemplateColumns.trim().split(/\s+/).length === 1)) && c.firstElementChild && ![...c.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
          if (stack) {
            const k = [...c.children].find((e) => { const k2 = win.getComputedStyle(e); return k2.display !== 'none' && k2.position !== 'absolute' && e.getBoundingClientRect().height > 0; });
            if (k && (win.getComputedStyle(k).display === 'block' || win.getComputedStyle(k).display === 'flex') && !/^(IMG|SVG|BUTTON)$/.test(k.tagName)) return centre(k);
          }
          return leafCentre(c);
        };
        if (sp.centres !== false && kids.length > 1) {
          // Only children on the first visual line of the row take part (a wrapped row is judged line by line below).
          const lines = [];
          for (const c of kids) { const r2 = c.getBoundingClientRect(); const l = lines.find((x) => r2.top < x.bottom - 1 && r2.bottom > x.top + 1); if (l) { l.kids.push(c); l.bottom = Math.max(l.bottom, r2.bottom); l.top = Math.min(l.top, r2.top); } else lines.push({ top: r2.top, bottom: r2.bottom, kids: [c] }); }
          for (const l of lines) {
            if (l.kids.length < 2) continue;
            const cs = l.kids.map(centre); const lo = Math.min(...cs); const hi = Math.max(...cs);
            if (hi - lo > tol) out.problems.push(`${name}: the centre lines of its parts differ by ${fmt(hi - lo)}px (${l.kids.map((c, i) => `${c.className ? '.' + String(c.className).split(' ')[0] : c.tagName.toLowerCase()} ${fmt(cs[i] - rc.top)}`).join(', ')})`);
          }
        }
        if (sp.flush) {
          // A column whose parts must all run the row's full width (a label line and its bar), so nothing floats short of the edge.
          const cl = rc.left + parseFloat(rcs.paddingLeft) + parseFloat(rcs.borderLeftWidth); const cr = rc.right - parseFloat(rcs.paddingRight) - parseFloat(rcs.borderRightWidth);
          for (const c of kids) { const r2 = c.getBoundingClientRect(); if (Math.abs(r2.left - cl) > tol || Math.abs(r2.right - cr) > tol) out.problems.push(`${name}: ${c.className ? '.' + String(c.className).split(' ')[0] : c.tagName.toLowerCase()} runs ${fmt(r2.left - cl)}px / ${fmt(r2.right - cr)}px from the row's edges (it should be flush)`); }
        }
        if (sp.across) {
          // Parts that sit in different cells of one row (the control of each example) share one centre line.
          const parts = [...row.querySelectorAll(sp.across)].filter((e) => e.getBoundingClientRect().height > 0);
          const cs2 = parts.map((e) => { const r2 = e.getBoundingClientRect(); return r2.top + r2.height / 2; });
          if (cs2.length > 1) { const lo = Math.min(...cs2); const hi = Math.max(...cs2); if (hi - lo > tol && hi - lo < rc.height) {
            // Wrapped lines of cells are judged line by line.
            const rows2 = []; for (const e of parts) { const r2 = e.getBoundingClientRect(); const cy = r2.top + r2.height / 2; const l = rows2.find((x) => Math.abs(x.cy - cy) < 24); if (l) l.v.push(cy); else rows2.push({ cy, v: [cy] }); }
            for (const l of rows2) { const a = Math.min(...l.v); const z = Math.max(...l.v); if (z - a > tol) out.problems.push(`${name}: ${sp.across} are not on one centre line (they differ by ${fmt(z - a)}px)`); } } }
        }
        if (sp.padding !== false) {
          const pl = parseFloat(rcs.paddingLeft); const pr = parseFloat(rcs.paddingRight); const pt = parseFloat(rcs.paddingTop); const pb = parseFloat(rcs.paddingBottom);
          if (Math.abs(pl - pr) > tol) out.problems.push(`${name}: left padding ${pl}px, right padding ${pr}px`);
          if (sp.padding !== 'x' && Math.abs(pt - pb) > tol) out.problems.push(`${name}: top padding ${pt}px, bottom padding ${pb}px`);
        }
        if (sp.gaps !== false) {
          for (let i = 1; i < kids.length; i += 1) {
            const a = kids[i - 1].getBoundingClientRect(); const c = kids[i].getBoundingClientRect();
            const stacked = c.top >= a.bottom - 1;
            const gap = stacked ? c.top - a.bottom : c.left - a.right;
            if (gap >= 28 || (gap < 0 && !stacked && c.left >= a.left)) { if (gap < 0) out.problems.push(`${name}: parts overlap by ${fmt(-gap)}px`); continue; }
            if (gap < -tol) { out.problems.push(`${name}: parts overlap by ${fmt(-gap)}px`); continue; }
            if (gap < tol && sp.zero) continue;
            if (!SCALE.some((s) => Math.abs(gap - s) <= tol)) out.problems.push(`${name}: the gap ${stacked ? 'below' : 'after'} ${kids[i - 1].className ? '.' + String(kids[i - 1].className).split(' ')[0] : kids[i - 1].tagName.toLowerCase()} is ${fmt(gap)}px, not on the 4px scale`);
          }
        }
        out.rows += 1;
      }
    }
    if (!seen) out.problems.push(`align: "${sp.row}" matched nothing in the frames ${sp.frame.re ? '/' + sp.frame.re + '/' : '"' + sp.frame.eq + '"'}`);
  }
  return JSON.stringify(out);
};

/*
 * badgeInk(b, specs) -- is the glyph in a badge in the middle of it, on both axes? Measured: the badge is screenshotted at 4x, and the middle of the
 * pixels that differ from the badge's own fill (inside a disc just short of the badge's edge, so the corners of a round badge do not count) is
 * compared with the middle of the badge. Fails when either axis is more than 0.5px off.
 *   spec: { frame: 'title' | RegExp | null (null: the page itself, not a frame), badge: selector of the badge, glyphs: [...], self: true, glyph: selector, tol: px }
 *   self: true when the badge IS the <i> (the glyph is its own ::before); glyph: where the <i> is in the badge (default 'i'); a badge with no <i> (a tick box, a
 *   letter) is measured as drawn.
 * Each glyph name (triangle-exclamation, circle-exclamation, circle-check, circle-info, xmark) is put into the badge's <i> in turn, measured, and the
 * badge put back, so a glyph of a different width is tried in every badge. The glyph as drawn is measured too. Sizes of the glyphs are not changed.
 */
import zlib from 'node:zlib';
export const BADGE_GLYPHS = ['triangle-exclamation', 'circle-exclamation', 'circle-check', 'circle-info', 'xmark'];
export function inkBox(buf, scale, only) { // only: { w, h } = judge just the top-left w x h pixels (a badge drawn in a bigger image)
  let o = 8; let w; let h; let ct; const idat = [];
  while (o < buf.length) { const l = buf.readUInt32BE(o); const t = buf.toString('ascii', o + 4, o + 8); const d = buf.subarray(o + 8, o + 8 + l); if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } if (t === 'IDAT') idat.push(d); o += 12 + l; }
  const bpp = ct === 6 ? 4 : 3; const raw = zlib.inflateSync(Buffer.concat(idat)); const st = w * bpp; const px = Buffer.alloc(h * st);
  for (let y = 0; y < h; y += 1) { const f = raw[y * (st + 1)]; for (let x = 0; x < st; x += 1) { const v = raw[y * (st + 1) + 1 + x]; const a = x >= bpp ? px[y * st + x - bpp] : 0; const b = y ? px[(y - 1) * st + x] : 0; const c = x >= bpp && y ? px[(y - 1) * st + x - bpp] : 0; let r = v; if (f === 1) r += a; else if (f === 2) r += b; else if (f === 3) r += (a + b) >> 1; else if (f === 4) { const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c); r += (pa <= pb && pa <= pc) ? a : pb <= pc ? b : c; } px[y * st + x] = r & 255; } }
  const sw = w; const g = (x, y) => [0, 1, 2].map((i) => px[(y * sw + x) * bpp + i]);
  if (only) { w = Math.min(w, only.w); h = Math.min(h, only.h); }
  const bg = g(Math.floor(w / 2), Math.round(2.5 * scale)); // the badge's own fill, just inside the top edge
  const R = Math.min(w, h) / 2 * 0.86; let x0 = 1e9; let x1 = -1; let y0 = 1e9; let y1 = -1;
  for (let y = 0; y < h; y += 1) for (let x = 0; x < w; x += 1) {
    if (Math.hypot(x + 0.5 - w / 2, y + 0.5 - h / 2) > R) continue;
    const p = g(x, y); if (Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 90) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  }
  return x1 < 0 ? null : { dx: ((x0 + x1 + 1) / 2 - w / 2) / scale, dy: ((y0 + y1 + 1) / 2 - h / 2) / scale };
}
// The box of everything that is not the element's own fill, in CSS px from each edge of the element: { left, right, top, bottom } (null: nothing). The fill is
// read 2.5px in from the left edge, halfway down; the outer `inset` px (2 by default) are left out so a rounded corner does not count.
export function inkBounds(buf, scale, inset = 2) {
  let o = 8; let w; let h; let ct; const idat = [];
  while (o < buf.length) { const l = buf.readUInt32BE(o); const t = buf.toString('ascii', o + 4, o + 8); const d = buf.subarray(o + 8, o + 8 + l); if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } if (t === 'IDAT') idat.push(d); o += 12 + l; }
  const bpp = ct === 6 ? 4 : 3; const raw = zlib.inflateSync(Buffer.concat(idat)); const st = w * bpp; const px = Buffer.alloc(h * st);
  for (let y = 0; y < h; y += 1) { const f = raw[y * (st + 1)]; for (let x = 0; x < st; x += 1) { const v = raw[y * (st + 1) + 1 + x]; const a = x >= bpp ? px[y * st + x - bpp] : 0; const b = y ? px[(y - 1) * st + x] : 0; const c = x >= bpp && y ? px[(y - 1) * st + x - bpp] : 0; let r = v; if (f === 1) r += a; else if (f === 2) r += b; else if (f === 3) r += (a + b) >> 1; else if (f === 4) { const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c); r += (pa <= pb && pa <= pc) ? a : pb <= pc ? b : c; } px[y * st + x] = r & 255; } }
  const g = (x, y) => [0, 1, 2].map((i) => px[(y * w + x) * bpp + i]);
  const bg = g(Math.round(2.5 * scale), Math.floor(h / 2)); const m = Math.round(inset * scale); let x0 = 1e9; let x1 = -1; let y0 = 1e9; let y1 = -1;
  for (let y = m; y < h - m; y += 1) for (let x = m; x < w - m; x += 1) { const p = g(x, y); if (Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 60) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); } }
  return x1 < 0 ? null : { left: x0 / scale, right: (w - 1 - x1) / scale, top: y0 / scale, bottom: (h - 1 - y1) / scale };
}
let badgeN = 0;
export async function badgeInk(b, specs) {
  const { ev, cdp, sessionId, problems, where } = b;
  for (const sp of specs) {
    const frameSpec = sp.frame instanceof RegExp ? { re: sp.frame.source, flags: sp.frame.flags } : sp.frame === null ? { page: true } : { eq: sp.frame };
    // Which badges are there (count), then one at a time.
    const count = JSON.parse(await ev(`(() => { const sp = ${JSON.stringify(frameSpec)}; const docs = sp.page ? [document] : window.__ds.frames.filter((f) => sp.re ? new RegExp(sp.re, sp.flags).test(f.iframe.title) : f.iframe.title === sp.eq).map((f) => f.iframe.contentDocument); const hits = []; docs.forEach((d, di) => d && d.querySelectorAll(${JSON.stringify(sp.badge)}).forEach((el, ei) => { const r = el.getBoundingClientRect(); if (r.width && r.height && getComputedStyle(el).visibility !== 'hidden') hits.push([di, ei]); })); return JSON.stringify(hits); })()`));
    if (!count.length) { problems.push(`${where}: badge ink: nothing matches ${sp.badge}`); continue; }
    for (const [di, ei] of count) {
      for (const glyph of [null, ...(sp.glyphs || BADGE_GLYPHS)]) { // glyphs: [] measures the badge as drawn only
        const at = JSON.parse(await ev(`(async () => { const sp = ${JSON.stringify(frameSpec)}; const frames = sp.page ? [null] : window.__ds.frames.filter((f) => sp.re ? new RegExp(sp.re, sp.flags).test(f.iframe.title) : f.iframe.title === sp.eq);
          const m = frames[${di}]; const d = m ? m.iframe.contentDocument : document; const el = d.querySelectorAll(${JSON.stringify(sp.badge)})[${ei}];
          const i = ${sp.self ? 'el' : `el.querySelector(${JSON.stringify(sp.glyph || 'i')})`}; if (!window.__badgeWas) window.__badgeWas = new Map();
          if (i && ${JSON.stringify(glyph)}) { if (!window.__badgeWas.has(i)) window.__badgeWas.set(i, i.className); i.className = [...window.__badgeWas.get(i).split(' ').filter((c) => c && !/^fa-/.test(c)), 'fa-solid', 'fa-' + ${JSON.stringify(glyph)}].join(' '); } else if (i && window.__badgeWas.has(i)) { i.className = window.__badgeWas.get(i); }
          el.scrollIntoView({ block: 'center', behavior: 'instant' }); await new Promise((r) => setTimeout(r, 120));
          if (m) { m.iframe.style.position = 'relative'; m.iframe.style.top = '0px'; m.iframe.style.left = '0px'; } else { document.body.style.top = '0px'; document.body.style.left = '0px'; }
          const off = () => { const r = el.getBoundingClientRect(); const fr = m ? m.iframe.getBoundingClientRect() : { left: 0, top: 0 }; return { x: fr.left + r.left + window.scrollX, y: fr.top + r.top + window.scrollY, w: r.width, h: r.height }; };
          let o = off(); const frac = o.y - Math.floor(o.y); const fracX = o.x - Math.floor(o.x); /* the badge on a whole pixel, across and down: the 4x ink moves with the sub-pixel position */
          if (frac > 0.01 || fracX > 0.01) { const t = (1 - frac) % 1 + 'px'; const l = (1 - fracX) % 1 + 'px'; if (m) { m.iframe.style.top = t; m.iframe.style.left = l; } else { document.body.style.position = 'relative'; document.body.style.top = t; document.body.style.left = l; } await new Promise((r) => setTimeout(r, 120)); o = off(); }
          return JSON.stringify({ ...o, name: (m ? m.iframe.title + ' | ' : '') + (el.getAttribute('data-part') || String(el.className).split(' ')[0] || el.tagName.toLowerCase()) + ' / ' + (i ? (String(i.className).match(/fa-(?!solid)[a-z-]+/) || [i.className])[0] : (el.textContent.trim().slice(0, 8) || el.type || 'drawn')) }); })()`));
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x, y: at.y, width: at.w, height: at.h, scale: 4 } }, sessionId);
        const c = inkBox(Buffer.from(shot.data, 'base64'), 4);
        if (process.env.BADGE_SHOTS) { const fs = await import('node:fs'); fs.mkdirSync(process.env.BADGE_SHOTS, { recursive: true }); badgeN = (badgeN || 0) + 1; fs.writeFileSync(`${process.env.BADGE_SHOTS}/${String(badgeN).padStart(3, '0')}-${at.name.replace(/\W+/g, '_')}.png`, Buffer.from(shot.data, 'base64')); } // BADGE_SHOTS=dir keeps every 4x picture
        if (process.env.BADGE_DEBUG && c) console.error(`${where} ${at.name} dx=${c.dx.toFixed(2)} dy=${c.dy.toFixed(2)} w=${at.w}`); // BADGE_DEBUG=1 prints every reading
        if (!c) problems.push(`${where}: badge ink: no glyph found in ${at.name}`);
        else if (Math.abs(c.dx) > (sp.tol || 0.5) || Math.abs(c.dy) > (sp.tol || 0.5)) problems.push(`${where}: the glyph in ${at.name} is off the middle of its ${Math.round(at.w)}px badge by ${c.dx.toFixed(2)}px across and ${c.dy.toFixed(2)}px down (${sp.tol || 0.5}px allowed)`);
      }
      // put the badge back
      await ev(`(() => { if (window.__badgeWas) { for (const [i, c] of window.__badgeWas) i.className = c; window.__badgeWas = null; } for (const f of (window.__ds ? window.__ds.frames : [])) { f.iframe.style.top = ''; f.iframe.style.left = ''; f.iframe.style.position = ''; } document.body.style.top = ''; document.body.style.left = ''; document.body.style.position = ''; })()`);
    }
  }
}
