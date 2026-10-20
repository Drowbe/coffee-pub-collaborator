/*
 * check-design-system-progress.mjs -- the Progress bars and meters family of the proposed design system page (public/design-system/proposed-progress.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a track that is not 8px high (6px for the small one, a toolbar's and an upload's), not fully round (--radius-round), or not --border; a fill that is not
 * --accent (or --danger on an over budget and an almost full bar); a bar (role="progressbar") with no name, or with no aria-valuenow, -min and -max (an
 * indeterminate one has aria-busy and no valuenow); a value out of its range; a meter with no value in words; a planned fill that is not the accent at 35%; an over-budget bar
 * without the danger fill and the word "Over"; an AI bar at 90% or more without the danger fill and "Almost full"; a poll fill that is not the accent at 24%, not behind the row or
 * that takes the pointer; the shimmer not animated (1.4s) or with no reduced-motion rule; a microphone bar not 3px wide, a lit one not --ok, an unlit one not --border; a
 * raw rgba green; a hard-coded colour; the family not marked Proposed; the undecided list still naming Progress bars and meters.
 */
import fs from 'node:fs';
import path from 'node:path';

export const id = 'progress';
export const todayOnly = [];

export function staticChecks({ fail, css, js, DS }) {
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-progress.css: a hard-coded colour (tokens only)');
  if (/rgba?\(\s*111/.test(css)) fail('proposed-progress.css: the raw green rgba(111,174,107) is back (use --ok)');
  if (/border-(left|right|top|bottom)\s*:/.test(css)) fail('proposed-progress.css: a rule draws an edge on one side (no bar)');
  if (!/prefers-reduced-motion:\s*reduce\)\s*\{[\s\S]*?animation:\s*none/.test(css)) fail('proposed-progress.css: no reduced-motion rule that stops the shimmer');
  if (!/animation:\s*sdk-shimmer\s+1\.4s/.test(css)) fail('proposed-progress.css: the shimmer is not 1.4s');
  if (!/--pg-h:\s*8px/.test(css) || !/--pg-h:\s*6px/.test(css)) fail('proposed-progress.css: the track heights are not 8px and 6px');
  if (!/status: 'proposed'/.test(js)) fail('proposed-progress.js: the family is not marked Proposed');
  const pj = fs.readFileSync(path.join(DS, 'proposed.js'), 'utf8');
  if (/'Progress bars and meters'/.test(pj)) fail("proposed.js: the undecided list still names 'Progress bars and meters'");
}

export async function browserChecks(b) {
  const { ev, where, problems } = b;
  const probe = JSON.parse(await ev(`(() => {
    const F = window.__ds.frames; const out = { problems: [], bars: 0 }; const bad = (m) => out.problems.push(m);
    const titles = ['Progress, tracks', 'Progress, meters', 'Progress, in use'];
    const near = (a, b2) => Math.abs(a - b2) <= 0.6;
    const dd = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
    for (const t of titles) if (!dd(t)) { bad('no frame ' + t); return JSON.stringify(out); }
    for (const f of F.filter((x) => /^Progress/.test(x.iframe.title) && !/contrast/.test(x.iframe.title))) {
      const d = f.iframe.contentDocument; const w = d.defaultView; const cs = (e, p) => w.getComputedStyle(e, p); const t = f.iframe.title;
      const tok = (prop, expr) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop] = expr; host.appendChild(p); const c = w.getComputedStyle(p)[prop]; p.remove(); return c; };
      const border = tok('backgroundColor', 'var(--border)'); const accent = tok('backgroundColor', 'var(--accent)'); const danger = tok('backgroundColor', 'var(--danger)'); const ok = tok('backgroundColor', 'var(--ok)'); const round = tok('borderTopLeftRadius', 'var(--radius-round)');
      // every bar: a role, a name, its numbers
      for (const e of d.querySelectorAll('[role="progressbar"]')) { out.bars += 1;
        if (!(e.getAttribute('aria-label') || e.getAttribute('aria-labelledby'))) bad(t + ': a bar has no name');
        if (e.hasAttribute('aria-busy')) { if (e.hasAttribute('aria-valuenow')) bad(t + ': an indeterminate bar has aria-valuenow'); continue; }
        const n = parseFloat(e.getAttribute('aria-valuenow')); const lo = parseFloat(e.getAttribute('aria-valuemin')); const hi = parseFloat(e.getAttribute('aria-valuemax'));
        if ([n, lo, hi].some((x) => Number.isNaN(x))) bad(t + ': a bar (' + e.getAttribute('aria-label') + ') lacks aria-valuenow, -min or -max'); else if (n < lo || n > hi) bad(t + ': a bar is out of its range'); }
      // the tracks
      for (const e of d.querySelectorAll('.sdk-progress')) { const sm = e.classList.contains('sdk-progress-sm'); const h = e.getBoundingClientRect().height;
        if (!near(h, sm ? 6 : 8)) bad(t + ': a track is ' + h + 'px, expected ' + (sm ? 6 : 8));
        if (cs(e).borderTopLeftRadius !== round) bad(t + ': a track is not fully round (' + cs(e).borderTopLeftRadius + ')');
        if (cs(e).backgroundColor !== border) bad(t + ': a track is not --border');
        const fill = e.querySelector('.sdk-progress-fill'); const dang = e.classList.contains('over') || e.classList.contains('warn');
        if (!e.classList.contains('indeterminate') && cs(fill).backgroundColor !== (dang ? danger : accent)) bad(t + ': a fill is not ' + (dang ? '--danger' : '--accent'));
        if (cs(fill).borderTopLeftRadius !== round) bad(t + ': a fill is not round');
        const head = e.closest('.sdk-meter'); if (head && !head.querySelector('.sdk-meter-value, .sdk-meter-head')) bad(t + ': a meter has no value in words'); }
      for (const e of d.querySelectorAll('.sdk-meter')) { const v = e.querySelector('.sdk-meter-value'); if (!v || !v.textContent.trim()) bad(t + ': a meter has no value text'); }
      for (const e of d.querySelectorAll('.sdk-meter-inline > .sdk-progress')) if (!e.parentElement.querySelector('.sdk-meter-value')) bad(t + ': an inline bar has no value');
      // budget
      for (const e of d.querySelectorAll('.sdk-progress-planned')) { const wantP = tok('backgroundColor', 'color-mix(in srgb, var(--accent) 35%, transparent)'); const par = e.parentElement;
        if (!par.classList.contains('over') && cs(e).backgroundColor !== wantP) bad(t + ': the planned fill is not the accent at 35% (' + cs(e).backgroundColor + ')'); }
      for (const e of d.querySelectorAll('.sdk-progress.over')) { const m = e.closest('.sdk-meter'); if (!m || !/\\bOver\\b/.test(m.querySelector('.sdk-meter-value').textContent)) bad(t + ': an over-budget bar has no word "Over"'); }
      for (const e of d.querySelectorAll('.sdk-progress.warn')) { const m = e.closest('.sdk-meter'); if (!m || !/Almost full/.test(m.querySelector('.sdk-meter-value').textContent)) bad(t + ': a warning bar has no words "Almost full"'); if (parseFloat(e.getAttribute('aria-valuenow')) < 90) bad(t + ': a warning bar is under 90%'); }
      // poll fills
      for (const e of d.querySelectorAll('.sdk-progress-behind')) { const wantB = tok('backgroundColor', 'color-mix(in srgb, var(--accent) 24%, transparent)'); const row = e.parentElement;
        if (cs(e).backgroundColor !== wantB) bad(t + ': a poll fill is not the accent at 24%'); if (cs(e).position !== 'absolute' || cs(e).pointerEvents !== 'none') bad(t + ': a poll fill is not behind the row'); if (!row.querySelector('.sdk-meter-value') || !/%/.test(row.querySelector('.sdk-meter-value').textContent)) bad(t + ': a poll row has no percent in text'); }
      // the shimmer
      for (const e of d.querySelectorAll('.sdk-progress.indeterminate')) { const a = cs(e.querySelector('.sdk-progress-fill')); if (a.animationName !== 'sdk-shimmer' || a.animationDuration !== '1.4s') bad(t + ': the shimmer is not animated (' + a.animationName + ' ' + a.animationDuration + ')'); }
      // the microphone
      for (const e of d.querySelectorAll('.sdk-mic')) { const bars = [...e.children]; if (bars.length !== 5) bad(t + ': a microphone level has ' + bars.length + ' bars');
        bars.forEach((s, i) => { const c = cs(s); if (parseFloat(c.width) !== 3) bad(t + ': a microphone bar is ' + c.width + ' wide'); if (parseFloat(c.height) !== [4, 7, 10, 13, 16][i]) bad(t + ': microphone bar ' + (i + 1) + ' is ' + c.height + ' high');
          const lit = s.classList.contains('on'); if (c.backgroundColor !== (lit ? ok : border)) bad(t + ': a ' + (lit ? 'lit' : 'unlit') + ' microphone bar is not ' + (lit ? '--ok' : '--border')); }); }
    }
    if (out.bars < 20) bad('only ' + out.bars + ' bars drawn');
    return JSON.stringify(out); })()`));
  for (const x of [...new Set(probe.problems)]) problems.push(`${where}: ${x}`);
}
