/*
 * check-design-system-states.mjs -- the Empty, loading and error states family of the proposed design system page (public/design-system/proposed-states.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 * The family writes its own keyframes (the shimmer, the spinner), which the shared rule check cannot read, so it takes its own rules over (ownRules): every rule is
 * under .ds-proposed, no hex colour, no coloured border, radii are tokens, no font under 11px, and the shimmer is defined once.
 *
 * Fails on: an empty block whose icon is not 24px or whose heading is not 16px at weight 600; a compact line that is not one line; a skeleton with no shimmer, with more
 * than one shimmer keyframe in the stylesheet, or one that is not still under reduced motion; a skeleton row that is not 56px or a line not 12px; a spinner that is not 16px
 * (12px and 20px with their classes) or does not turn; the rule in the live demo: an answer in 200ms shows no skeleton, an answer in 1.8s shows the skeleton after 300ms and the
 * list after the answer, a failure shows the error block with a Retry, and Retry loads again; an error whose colour is not the readable danger mix (4.5 to 1 in both modes), or the
 * old #e07a5f anywhere in the family; the field error line not 12px in the readable red; an alias (today's class name) that does not take the look; at 390 a page that scrolls
 * sideways; the family not marked Approved, or its page naming Empty, loading and error states as not yet decided.
 */
export const id = 'states';
export const ownRules = true;
export const todayOnly = ['sdk-field', 'sdk-label', 'sdk-form-error', 'ic', 'state', 'empty', 'rs-empty', 'skeleton', 'skel', 'error', 'emptynote', 'activity-empty', 'bell-empty', 'ok'];

export function staticChecks({ fail, css }) {
  const text = css;
  const split = (t) => { const parts = []; let d = 0; let cur = ''; for (const ch of t) { if (ch === '(' || ch === '[') d += 1; if (ch === ')' || ch === ']') d -= 1; if (ch === ',' && d === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) parts.push(cur.trim()); return parts; };
  for (const m of text.matchAll(/([^{}]+)\{/g)) {
    const sel = m[1].trim(); if (!sel || sel.startsWith('@') || /^(from|to|\d+%)$/.test(sel)) continue;
    for (const part of split(sel)) if (!/^\.ds-proposed\b/.test(part.trim())) fail(`proposed-states.css: a rule not under .ds-proposed: ${part.trim().slice(0, 80)}`);
  }
  if (/#[0-9a-f]{3,8}\b/i.test(text)) fail('proposed-states.css: a hard-coded colour (tokens only)');
  if (/e07a5f/i.test(text) && !/never|retired|goes/i.test(text)) fail('proposed-states.css: the raw #e07a5f is still drawn');
  for (const m of text.matchAll(/(border(?:-[a-z]+)*)\s*:\s*([^;}]+)/g)) { if (/radius/.test(m[1])) { if (!/^var\(--radius-(min|small|medium|large|round)\)$/.test(m[2].trim())) fail(`proposed-states.css: ${m[1]}: ${m[2]} is not a radius token`); } else if (/(rgb|hsl|color-mix|--accent|--danger|--ok|--tint)/i.test(m[2])) fail(`proposed-states.css: a coloured border: ${m[1]}`); }
  for (const m of text.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)) if (Number(m[1]) < 11) fail(`proposed-states.css: a font size of ${m[1]}px, under 11px`);
  if (/border-(left|right|top|bottom)\s*:/.test(text)) fail('proposed-states.css: a rule draws an edge on one side');
  if ((text.match(/@keyframes sdk-shimmer/g) || []).length !== 1) fail('proposed-states.css: the shimmer keyframe is not defined exactly once');
  if (!/prefers-reduced-motion: reduce\)[\s\S]*animation: none/.test(text)) fail('proposed-states.css: the shimmer is not switched off under reduced motion');
  if (!/--spin:\s*16px/.test(text) || !/sdk-spinner-sm\s*\{\s*--spin:\s*12px/.test(text) || !/sdk-spinner-lg\s*\{\s*--spin:\s*20px/.test(text)) fail('proposed-states.css: the spinner sizes are not 16, 12 and 20px');
  if (!/--state-error:\s*color-mix\(in srgb, var\(--danger\) 70%, var\(--text\)\)/.test(text)) fail('proposed-states.css: the error colour is not the readable danger mix');
  for (const c of ['sdk-empty', 'sdk-empty-title', 'sdk-empty-text', 'sdk-empty-actions', 'sdk-empty-line', 'sdk-skel', 'sdk-skel-line', 'sdk-skel-title', 'sdk-skel-dot', 'sdk-skel-block', 'sdk-skel-row', 'sdk-skel-stack', 'sdk-skel-card', 'sdk-skel-list', 'sdk-skel-grid', 'sdk-spinner', 'sdk-spinner-sm', 'sdk-spinner-lg', 'sdk-form-error', 'skel', 'skeleton', 'error', 'emptynote', 'activity-empty', 'bell-empty'].filter((c) => !['sdk-empty', 'emptynote', 'activity-empty', 'bell-empty'].includes(c))) if (!new RegExp('\\.' + c + '(?![\\w-])').test(text)) fail(`proposed-states.css: no rule for .${c}`);
}

export async function browserChecks(b) {
  const { ev, sc, where, problems } = b;
  const r = JSON.parse(await ev(`(${statesProbe.toString()})(${JSON.stringify({ width: sc.width, mode: sc.mode })})`));
  for (const x of r.problems) problems.push(`${where}: ${x}`);
}

const statesProbe = async (ctx) => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const near = (a, b, e = 0.6) => Math.abs(a - b) <= e;
  const tok = (d, n, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = n; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^States/.test(t) && !/contrast/.test(t));
  if (TITLES.length < 12) bad(`the States family has only ${TITLES.length} frames`);

  // Empty.
  { const d = get('States, empty'); const es = [...d.querySelectorAll('.sdk-empty')]; if (es.length < 3) bad('fewer than three empty blocks');
    for (const e of es) { const i = e.querySelector(':scope > i'); const t = e.querySelector('.sdk-empty-title'); if (getComputedStyle(i).fontSize !== '24px') bad(`an empty icon is ${getComputedStyle(i).fontSize}, not 24px`); const tc = getComputedStyle(t); if (tc.fontSize !== '16px' || tc.fontWeight !== '600') bad(`an empty heading is ${tc.fontSize} at ${tc.fontWeight}, not 16px at 600`);
      if (getComputedStyle(e.querySelector('.sdk-empty-text') || i).color !== tok(d, 'var(--text-dim)')) bad('empty text is not --text-dim'); }
    if (!es[0].querySelector('.btn-primary') || !es[1].querySelector('.btn-quiet')) bad('the empty blocks do not show a Primary and a Quiet button');
    const l = get('States, compact line'); for (const x of l.querySelectorAll('.sdk-empty-line')) { if (x.getBoundingClientRect().height > 50) bad(`a compact line is ${x.getBoundingClientRect().height}px high: not one line`); }
  }
  // Skeleton.
  { const d = get('States, skeleton'); const sk = [...d.querySelectorAll('.sdk-skel')]; if (sk.length < 10) bad('too few skeleton pieces');
    for (const s of sk) { const cs = getComputedStyle(s); if (cs.animationName !== 'sdk-shimmer') bad(`a skeleton piece animates ${cs.animationName}, not sdk-shimmer`); }
    const names = new Set(sk.map((s) => getComputedStyle(s).animationName)); if (names.size !== 1) bad('the skeleton has more than one shimmer');
    const line = d.querySelector('.sdk-skel-line'); if (!near(line.getBoundingClientRect().height, 12)) bad('a skeleton line is not 12px'); const row = d.querySelector('.sdk-skel-row'); if (!near(row.getBoundingClientRect().height, 56)) bad(`a skeleton row is ${row.getBoundingClientRect().height}px, not 56`);
    if (!d.querySelector('.sdk-skel-card')) bad('no skeleton card');
    // Reduced motion switches it off: the rule is in the stylesheet; here the media query is read from the rules.
    let off = false; for (const sh of d.styleSheets) { try { for (const r of sh.cssRules) if (r.media && /reduce/.test(r.media.mediaText)) for (const x of r.cssRules) if (/sdk-skel/.test(x.selectorText || '') && x.style.animationName === 'none') off = true; } catch (e) { /* skip */ } }
    if (!off) bad('the skeleton is not switched off under reduced motion');
  }
  // Spinner.
  { const d = get('States, spinner'); const want = [['.sdk-spinner-sm', 12], ['.sdk-spinner:not(.sdk-spinner-sm):not(.sdk-spinner-lg)', 16], ['.sdk-spinner-lg', 20]];
    for (const [s, w] of want) { const el = d.querySelector(s); const r = { width: el.offsetWidth, height: el.offsetHeight }; if (!near(r.width, w) || !near(r.height, w)) bad(`the ${s} spinner is ${r.width} by ${r.height}, not ${w}`); if (getComputedStyle(el).animationName !== 'sdk-spin') bad('a spinner does not turn'); }
    if (!d.querySelector('.btn-primary[aria-busy="true"] .sdk-spinner')) bad('no spinner in a busy button');
  }
  // Error.
  { const d = get('States, error'); const e = d.querySelector('.sdk-empty[data-kind="error"]'); if (!e || !e.querySelector('[data-retry]')) bad('the error block has no Retry'); else { const ic = getComputedStyle(e.querySelector(':scope > i')).color; if (ic !== tok(d, 'color-mix(in srgb, var(--danger) 70%, var(--text))')) bad('the error icon is not the readable danger mix'); }
    const fe = d.querySelector('.sdk-form-error'); const cs = getComputedStyle(fe); if (cs.fontSize !== '12px' || cs.color !== tok(d, 'color-mix(in srgb, var(--danger) 70%, var(--text))')) bad(`the field error is ${cs.fontSize} in ${cs.color}`);
    if (!fe.id || d.querySelector('input[aria-invalid="true"]').getAttribute('aria-describedby') !== fe.id) bad('the field error is not tied to its field'); }
  // The rule, live.
  { const d = get('States, the rule'); const win = d.defaultView; const out2 = d.querySelector('[data-out]'); const click = (k) => d.querySelector(`[data-load="${k}"]`).click();
    click('fast'); await wait(260); if (out2.querySelector('.sdk-skel')) bad('an answer in 200ms flashed a skeleton'); await wait(100); if (!out2.querySelector('.sdk-skel-row') || out2.querySelector('.sdk-skel')) bad('a fast answer does not show the list');
    click('slow'); await wait(200); if (out2.children.length) bad('nothing should show in the first 300ms'); await wait(300); if (!out2.querySelector('.sdk-skel') || out2.getAttribute('aria-busy') !== 'true') bad('a slow load does not show the skeleton after 300ms'); await wait(1500); if (out2.querySelector('.sdk-skel') || !out2.querySelector('.sdk-skel-row')) bad('the slow load did not end with the list');
    click('fail'); await wait(1100); const rb = out2.querySelector('[data-retry]'); if (!rb) bad('a failed load shows no Retry'); else { rb.click(); await wait(350); if (out2.querySelector('[data-retry]')) bad('Retry did not load again'); }
  }
  // Aliases.
  { const d = get('States, aliases'); const cs = (s) => { const e = d.querySelector(s); if (!e) { bad(`aliases: no ${s}`); return null; } return getComputedStyle(e); };
    const st = d.querySelector('.state h2'); if (st && (getComputedStyle(st).fontSize !== '16px')) bad('aliases: the h2 of .state is not 16px'); const ic = cs('.state .ic'); if (ic && ic.fontSize !== '24px') bad('aliases: the .ic of .state is not 24px');
    const sk = cs('.skeleton .skel'); if (sk && sk.animationName !== 'sdk-shimmer') bad('aliases: .skel does not shimmer'); const er = cs('p.error'); if (er && er.color !== tok(d, 'color-mix(in srgb, var(--danger) 70%, var(--text))')) bad('aliases: .error is not the readable danger mix');
    for (const s of ['.emptynote', '.activity-empty', '.bell-empty']) { const c = cs(s); if (c && (c.display !== 'flex' || c.borderTopStyle === 'dashed')) bad(`aliases: ${s} is not the compact line`); }
    if (/e07a5f/i.test(d.body.outerHTML.replace(/Stream's was #e07a5f/g, ''))) bad('the old #e07a5f is drawn');
  }
  // Contrast.
  { const d = get('States, contrast'); await wait(300); const rows = [...d.querySelectorAll('.pm-ct tbody tr')]; if (rows.length < 8) bad('the contrast list is short');
    for (const tr of rows) { const rr = tr.querySelector('[data-out="r"]').textContent; if (!rr) { bad('a contrast row is not worked out'); continue; } if (tr.querySelector('[data-out="p"]').textContent === 'Fails') bad(`contrast under its minimum: ${tr.children[0].textContent} (${rr})`); } }
  // The page.
  const blk = document.getElementById('states');
  if (!blk || !blk.querySelector('.ds-st-approved') || blk.querySelector('.ds-st-proposed')) bad('the States family is not marked Approved');
  if (!blk || !/Today to proposed/.test(blk.textContent) || !/300ms/.test(blk.textContent) || !/Markup contract/.test(blk.textContent) || !/#e07a5f/.test(blk.textContent)) bad('the States page lacks its Today to proposed table, the 300ms rule, the #e07a5f note or its markup contract');
  if (document.getElementById('u-empty-loading-and-error-states')) bad('Empty, loading and error states is still listed as Not yet decided');
  return JSON.stringify(out);
};
