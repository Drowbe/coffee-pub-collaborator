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
