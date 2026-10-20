/*
 * check-design-system-typography.mjs -- the Typography family of the proposed design system page (public/design-system/proposed-typography.js and .css):
 * Figtree for the interface, Fraunces for headlines, the nine-step size scale and the weights (decided 2026-10-19), and the one
 * "Today's fonts / Proposed fonts" switch in the page header.
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (files) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: no @font-face url() in proposed-typography.css, a font url that is not a bundled woff2 under fonts/ that the proposed snapshot holds, a
 * font folder without its licence (OFL.txt), a bundled font that is not Figtree or Fraunces (only the chosen fonts are bundled, and the
 * stylesheet names no other family), a missing token (--font-ui, --font-display, --text-11 to --text-40, --weight-*), a stylesheet that fetches something
 * from outside, a fonts/ folder in Today's snapshot, a Today file that refers to the bundled fonts, a header with a Font or Headline candidate group (it
 * must hold one switch of two buttons); in the browser: Figtree or Fraunces not loading, a scale step missing or drawn in the wrong size, weight or
 * family, a weight that is not 400, 500 or 600 in the weights frame, a token with the wrong value, any text under 11px in any frame of a family other than a 9px micro count (a number in a tab or button badge), the
 * ink of a button label more than 1px off the middle of its button in Figtree (and in Today's fonts), the ink of a title bar more than 1px off the
 * middle in Fraunces, and a switch that does not flip the frames between the system stack and the two fonts.
 */
import fs from 'node:fs';
import path from 'node:path';

export const id = 'typography';
// The Headline mock-ups draw the product's own markup from style.css (a Home card, the module page's title, a docked title bar); the proposal styles none of it but the font.
export const todayOnly = ['space-list-head', 'space-list-title', 'space-list', 'space-choice', 'space-choice-head', 'space-choice-name', 'space-choice-count', 'space-choice-desc', 'space-choice-actions', 'members', 'hint', 'panel', 'module-config', 'module-head', 'module-icon', 'grow', 'pill', 'mod-header', 'mod-title', 'topbar', 'nav-left', 'brand-home', 'brand-logo', 'brand-name', 'space-switcher', 'space-switcher-button', 'crumb-label', 'visually-hidden'];

// The bundled fonts: with their licence, self-hosted (the url() list of every stylesheet is checked by the runner; this is what is specific to the fonts).
export function staticChecks({ DS, fail, snap, css }) {
  if (!/url\(/.test(css)) fail('proposed-typography.css has no @font-face url()');
  if (snap.files.some((f) => /^fonts\//.test(f.file))) fail("Today's snapshot holds a fonts/ folder");
  for (const f of ['index.html', 'ds.css', 'ds.js', 'components.js', 'components-2.js', 'components-3.js']) if (/fonts\/[a-z0-9-]+\/|@font-face/.test(fs.readFileSync(path.join(DS, f), 'utf8'))) fail(`${f} (Today's page) refers to the bundled fonts`);
  // Only the chosen fonts are bundled.
  const dirs = fs.readdirSync(path.join(DS, 'fonts'), { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
  if (dirs.join() !== 'figtree,fraunces') fail(`fonts/ holds ${dirs.join(', ')}; only figtree and fraunces are bundled`);
  const families = new Set([...css.matchAll(/@font-face\s*\{\s*font-family:\s*"([^"]+)"/g)].map((m) => m[1]));
  if ([...families].sort().join() !== 'Figtree,Figtree Fallback,Fraunces,Fraunces Fallback') fail(`proposed-typography.css declares ${[...families].join(', ')}; expected Figtree, Fraunces and their fallbacks`);
  if (/nunito|source sans|archivo|bricolage/i.test(css)) fail('proposed-typography.css still names a font that was not chosen');
  const tokens = ['--font-ui', '--font-display', '--text-9', '--text-11', '--text-12', '--text-13', '--text-14', '--text-16', '--text-18', '--text-22', '--text-28', '--text-40', '--weight-regular', '--weight-medium', '--weight-strong'];
  for (const t of tokens) if (!new RegExp(t + ':').test(css)) fail(`proposed-typography.css does not define ${t}`);
  const html = fs.readFileSync(path.join(DS, 'proposed.html'), 'utf8');
  if (/id="ds-headline"/.test(html)) fail('proposed.html still has the Headline candidate group');
  const grp = /id="ds-font">([\s\S]*?)<\/div>/.exec(html);
  if (!grp || (grp[1].match(/<button/g) || []).length !== 2 || !/Today's fonts/.test(grp[1]) || !/Proposed fonts/.test(grp[1])) fail("proposed.html: the font group must be one switch of two buttons, Today's fonts and Proposed fonts");
}

export async function browserChecks(b) {
  const { ev, cdp, sessionId, where, problems, inkCentre } = b;
  // The first button of each role and size in the Buttons frame: the labels are made free of descenders (as in the Buttons check), and each is named.
  const probe = JSON.parse(await ev(`(() => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Buttons, all states'); const out = { targets: [] }; if (!m) return JSON.stringify(out); const d = m.iframe.contentDocument;
    for (const t of d.querySelectorAll('.pm-row button')) for (const c of t.childNodes) if (c.nodeType === 3) c.textContent = c.textContent.replace(/g/g, 'o');
    for (const row of d.querySelectorAll('.pm-row')) { const nm = row.querySelector('.pm-role').textContent; const b = row.querySelectorAll('button')[0]; out.targets.push({ n: nm + ' ' + (b.textContent.trim() || b.getAttribute('aria-label')) + ' ' + Math.round(b.getBoundingClientRect().height) }); }
    return JSON.stringify(out); })()`));
  // The ink: the visible letters or icon (not the boxes) must sit within 1px of the middle of the button, the first button of each role and size.
  // In Today's fonts and in the proposed fonts (Figtree): its files load from fonts/ (no 404, nothing from outside), and the labels stay centred within 1px.
  for (const fk of ['', 'proposed']) {
    await ev(`window.__ds.setFont(${JSON.stringify(fk)})`);
    if (fk) {
      await new Promise((r) => setTimeout(r, 900));
      const lj = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Buttons, all states'); const d = m.iframe.contentDocument; const first = getComputedStyle(d.querySelector('.pm-row button')).fontFamily.split(',')[0].trim(); await d.fonts.ready; return JSON.stringify({ fam: first, ok: first.replace(/"/g, '') === 'Figtree' && d.fonts.check('500 14px "Figtree"', 'Save') && [...d.fonts].some((f) => f.status === 'loaded' && f.family.replace(/"/g, '') === 'Figtree') }); })()`));
      if (!lj.ok) problems.push(`${where}: Figtree (${lj.fam}) did not load in the Buttons frame`);
    }
    for (let k = 0; k < (probe.targets || []).length; k += 1) {
      const t = probe.targets[k];
      const at = JSON.parse(await ev(`(() => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Buttons, all states'); const b = m.iframe.contentDocument.querySelectorAll('.pm-row')[${k}].querySelector('button'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + r.left + window.scrollX, y: fr.top + r.top + window.scrollY, w: r.width, h: r.height }); })()`));
      const shotB = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x, y: at.y, width: at.w, height: at.h, scale: 4 } }, sessionId);
      const c = inkCentre(Buffer.from(shotB.data, 'base64'), 4, 10);
      if (c === null) problems.push(`${where}: no ink found in ${t.n}`);
      else if (Math.abs(c) > 1.01) problems.push(`${where}: the ink of ${t.n} is ${Math.abs(c).toFixed(2)}px ${c > 0 ? 'low' : 'high'} in its button${fk ? ' set in Figtree' : ''}`);
    }
  }
  // Fraunces: the file loads from fonts/ (local woff2), and a big title in a 1px-bordered bar sits within 1px of the middle of the bar, at 40, 28, 22 and 18px.
  await ev('window.__ds.setFont("proposed")');
  await new Promise((r) => setTimeout(r, 900));
  const hl = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Headline, title bars'); const d = m.iframe.contentDocument; const first = getComputedStyle(d.querySelector('.pm-tb')).fontFamily.split(',')[0].trim(); await d.fonts.ready; return JSON.stringify({ fam: first, n: d.querySelectorAll('.pm-tb').length, ok: first.replace(/"/g, '') === 'Fraunces' && d.fonts.check('600 28px "Fraunces"', 'Welcome') && [...d.fonts].some((f) => f.status === 'loaded' && f.family.replace(/"/g, '') === 'Fraunces') }); })()`));
  if (!hl.ok) problems.push(`${where}: Fraunces (${hl.fam}) did not load in the title bars frame`);
  if (hl.n !== 4) problems.push(`${where}: the title bars frame has ${hl.n} bars, expected 4 (40, 28, 22, 18px)`);
  for (let k = 0; k < hl.n; k += 1) {
    const at = JSON.parse(await ev(`(() => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Headline, title bars'); const b = m.iframe.contentDocument.querySelectorAll('.pm-tb')[${k}]; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + r.left + window.scrollX, y: fr.top + r.top + window.scrollY, w: r.width, h: r.height }); })()`));
    const shotH = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x, y: at.y, width: at.w, height: at.h, scale: 4 } }, sessionId);
    const c = inkCentre(Buffer.from(shotH.data, 'base64'), 4);
    if (c === null) problems.push(`${where}: no ink found in the Fraunces title bar ${k + 1}`);
    else if (Math.abs(c) > 1.01) problems.push(`${where}: the ink of the Fraunces title bar ${k + 1} is ${Math.abs(c).toFixed(2)}px ${c > 0 ? 'low' : 'high'} in its bar`);
  }
  // The nine steps: each is drawn once, in its size, family and weight (Figtree 11 to 16, Fraunces 18 to 40, weight 600 for headlines).
  const steps = JSON.parse(await ev(`(() => { const out = []; const m = window.__ds.frames.find((f) => f.iframe.title === 'Typography, the nine steps'); if (!m) return JSON.stringify(null); const d = m.iframe.contentDocument;
    for (const el of d.querySelectorAll('.pm-ty-row > div:last-child > div:first-child')) { const cs = getComputedStyle(el); out.push({ size: cs.fontSize, weight: cs.fontWeight, fam: cs.fontFamily.split(',')[0].trim().replace(/"/g, '') }); }
    return JSON.stringify(out); })()`));
  const want = [[40, 'Fraunces', 600], [28, 'Fraunces', 600], [22, 'Fraunces', 600], [18, 'Fraunces', 600], [16, 'Figtree', 400], [14, 'Figtree', 400], [13, 'Figtree', 600], [12, 'Figtree', 400], [11, 'Figtree', 600], [9, 'Figtree', 600]];
  if (!steps) problems.push(`${where}: the nine steps frame is missing`);
  else {
    if (steps.length !== 10) problems.push(`${where}: the scale draws ${steps.length} steps, expected 10 (nine and the micro count)`);
    want.forEach(([px, fam, w], i) => {
      const s = steps[i]; if (!s) return;
      if (s.size !== px + 'px') problems.push(`${where}: scale step ${i + 1} is ${s.size}, expected ${px}px`);
      if (s.fam !== fam) problems.push(`${where}: the ${px}px step is set in ${s.fam}, expected ${fam}`);
      if (Number(s.weight) !== w) problems.push(`${where}: the ${px}px step has weight ${s.weight}, expected ${w}`);
    });
  }
  const wt = JSON.parse(await ev(`(() => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Typography, weights'); if (!m) return JSON.stringify(null); const d = m.iframe.contentDocument; return JSON.stringify([...new Set([...d.querySelectorAll('.ds-proposed *')].filter((e) => [...e.childNodes].some((c) => c.nodeType === 3 && c.textContent.trim())).map((e) => getComputedStyle(e).fontWeight))]); })()`));
  if (!wt) problems.push(`${where}: the weights frame is missing`);
  else {
    for (const need of ['400', '500', '600']) if (!wt.includes(need)) problems.push(`${where}: the weights frame does not draw ${need}`);
    if (wt.some((w) => !['400', '500', '600'].includes(w))) problems.push(`${where}: the weights frame draws a weight other than 400, 500 and 600: ${wt.join(', ')}`);
  }
  // The tokens are defined where the examples are drawn.
  const tok = JSON.parse(await ev(`(() => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Typography, the nine steps'); const cs = getComputedStyle(m.iframe.contentDocument.querySelector('.ds-proposed')); const o = {}; for (const t of ['--text-9', '--text-11', '--text-12', '--text-13', '--text-14', '--text-16', '--text-18', '--text-22', '--text-28', '--text-40', '--weight-regular', '--weight-medium', '--weight-strong']) o[t] = cs.getPropertyValue(t).trim(); return JSON.stringify(o); })()`));
  for (const [t, v] of Object.entries(tok)) { const e = t.startsWith('--text-') ? t.slice(7) + 'px' : { '--weight-regular': '400', '--weight-medium': '500', '--weight-strong': '600' }[t]; if (v !== e) problems.push(`${where}: ${t} is "${v}" in the examples, expected ${e}`); }
  // The switch: Today's fonts put the system stack on the examples, Proposed fonts put Figtree (and Fraunces on the headlines).
  const sw = JSON.parse(await ev(`(() => { const out = {}; const fam = () => { const d = window.__ds.frames.find((f) => f.iframe.title === 'Headline, in context').iframe.contentDocument; return [getComputedStyle(d.querySelector('.pm-mock .btn')).fontFamily.split(',')[0].trim().replace(/\"/g, ''), getComputedStyle(d.querySelector('h1.head')).fontFamily.split(',')[0].trim().replace(/\"/g, '')]; };
    window.__ds.setFont(''); out.today = fam(); window.__ds.setFont('proposed'); out.proposed = fam(); return JSON.stringify(out); })()`));
  if (sw.proposed[0] !== 'Figtree' || sw.proposed[1] !== 'Fraunces') problems.push(`${where}: Proposed fonts does not set Figtree and Fraunces (${sw.proposed.join(' / ')})`);
  if (/Figtree|Fraunces/.test(sw.today.join())) problems.push(`${where}: Today's fonts still sets a bundled font (${sw.today.join(' / ')})`);
  // Nothing is smaller than 11px: no text in any frame of the proposed page, except a micro count (9px, numbers only, in a corner badge: --text-9).
  const small = JSON.parse(await ev(`(() => { const out = []; for (const f of window.__ds.frames) { const d = f.iframe.contentDocument; if (!d || !d.body) continue; const w = d.createTreeWalker(d.body, NodeFilter.SHOW_TEXT);
    for (let n = w.nextNode(); n; n = w.nextNode()) { if (!n.textContent.trim()) continue; const e = n.parentElement; const cs = getComputedStyle(e); if (cs.display === 'none' || cs.visibility === 'hidden') continue; const px = parseFloat(cs.fontSize); if (px < 10.99 && !(px === 9 && e.matches('.sdk-badge-micro, .sdk-tab-badge, .nav-badge, .badge, .chat-view-count, .pm-s9') && /^[0-9]+[+]?$/.test(n.textContent.trim()))) out.push(f.iframe.title + ': ' + (e.className || e.tagName) + ' ' + px + 'px'); } }
    return JSON.stringify([...new Set(out)].slice(0, 12)); })()`));
  for (const x of small) problems.push(`${where}: text under 11px: ${x}`);
  await ev('window.__ds.setFont("proposed")');
  // The wordmark (decided 2026-10-21): Figtree 600 at 16px below 640px wide, Fraunces 600 at 18px from 641px up; a long name is cut with an ellipsis.
  await new Promise((r) => setTimeout(r, 600));
  const wm = JSON.parse(await ev(`(async () => {
    const out = { problems: [], n: 0 }; const bad = (m) => out.problems.push(m);
    const F = window.__ds.frames;
    for (const title of ['Wordmark', 'Headline, in context']) {
      const f = F.find((x) => x.iframe.title === title); if (!f) { bad('no frame ' + title); continue; }
      const d = f.iframe.contentDocument; const w = f.iframe.contentWindow; await d.fonts.ready;
      const narrow = w.innerWidth <= 640;
      for (const el of d.querySelectorAll('.topbar .brand-name')) {
        out.n += 1; const c = w.getComputedStyle(el); const fam = c.fontFamily.split(',')[0].replace(/"/g, '').trim(); const long = el.textContent.length > 20;
        if (d.documentElement.getAttribute('data-font') === 'proposed' || d.querySelector('.ds-proposed').dataset.font === 'proposed') {
          if (fam !== (narrow ? 'Figtree' : 'Fraunces')) bad(title + ' (' + w.innerWidth + 'px wide): the wordmark is set in ' + fam + ', expected ' + (narrow ? 'Figtree' : 'Fraunces'));
          if (c.fontSize !== (narrow ? '16px' : '18px')) bad(title + ' (' + w.innerWidth + 'px wide): the wordmark is ' + c.fontSize + ', expected ' + (narrow ? '16px' : '18px'));
          if (c.fontWeight !== '600') bad(title + ': the wordmark weight is ' + c.fontWeight + ', expected 600');
        }
        const bar = el.closest('.topbar').getBoundingClientRect(); const r = el.getBoundingClientRect();
        if (r.right > bar.right + 0.5) bad(title + ': the wordmark runs out of its bar');
        if (el.scrollWidth > el.clientWidth + 0.5) { if (!long && title === 'Wordmark') bad(title + ': the short name "' + el.textContent + '" is cut'); else if (c.textOverflow !== 'ellipsis' || c.whiteSpace !== 'nowrap') bad(title + ': a long name is cut without an ellipsis'); }
        else if (long && title === 'Wordmark' && narrow) bad(title + ': the long name is not cut at ' + w.innerWidth + 'px');
        if (r.height > 40) bad(title + ': the wordmark wraps (' + r.height + 'px high)');
      }
    }
    if (out.n < 3) bad('only ' + out.n + ' wordmarks drawn');
    return JSON.stringify(out); })()`));
  for (const x of [...new Set(wm.problems)]) problems.push(`${where}: ${x}`);
}
