/*
 * check-design-system-typography.mjs -- the Typography family of the proposed design system page (public/design-system/proposed-typography.js and .css):
 * the Font switch (Today, Figtree, Nunito Sans, Source Sans 3) and the Headline switch (Archivo, Fraunces, Bricolage Grotesque).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (files) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: no @font-face url() in proposed-typography.css, a font url that is not a bundled woff2 under fonts/ that the proposed snapshot holds, a font folder
 * without its licence (OFL.txt), a stylesheet that fetches something from outside, a fonts/ folder in Today's snapshot, a Today file that refers to
 * the bundled fonts; in the browser: a font file that does not load in the Buttons frame, the ink of a button label more than 1px off the middle of its
 * button in any of the four fonts, a headline font that does not load in the title bars frame, the ink of a title bar more than 1px off the middle.
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
}

export async function browserChecks(b) {
  const { ev, cdp, sessionId, where, problems, inkCentre } = b;
  // The first button of each role and size in the Buttons frame: the labels are made free of descenders (as in the Buttons check), and each is named.
  const probe = JSON.parse(await ev(`(() => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Buttons, all states'); const out = { targets: [] }; if (!m) return JSON.stringify(out); const d = m.iframe.contentDocument;
    for (const t of d.querySelectorAll('.pm-row button')) for (const c of t.childNodes) if (c.nodeType === 3) c.textContent = c.textContent.replace(/g/g, 'o');
    for (const row of d.querySelectorAll('.pm-row')) { const nm = row.querySelector('.pm-role').textContent; const b = row.querySelectorAll('button')[0]; out.targets.push({ n: nm + ' ' + (b.textContent.trim() || b.getAttribute('aria-label')) + ' ' + Math.round(b.getBoundingClientRect().height) }); }
    return JSON.stringify(out); })()`));
  // The ink: the visible letters or icon (not the boxes) must sit within 1px of the middle of the button, the first button of each role and size.
  // Each candidate font too (the Font group): its files load from fonts/ (no 404, nothing from outside), and the labels stay centred within 1px.
  for (const fk of ['', 'figtree', 'nunito-sans', 'source-sans-3']) {
  await ev(`window.__ds.setFont(${JSON.stringify(fk)})`);
  if (fk) {
    await new Promise((r) => setTimeout(r, 900));
    const loaded = await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Buttons, all states'); const d = m.iframe.contentDocument; const fam = getComputedStyle(d.querySelector('.pm-row button')).fontFamily; const first = fam.split(',')[0].trim(); await d.fonts.ready; return JSON.stringify({ fam: first, ok: d.fonts.check('500 14px ' + first, 'Save') && [...d.fonts].some((f) => f.status === 'loaded' && ('"' + f.family + '"' === first || f.family === first.replace(/"/g, ''))) }); })()`);
    const lj = JSON.parse(loaded);
    if (!lj.ok) problems.push(`${where}: the font ${fk} (${lj.fam}) did not load in the Buttons frame`);
  }
  for (let k = 0; k < (probe.targets || []).length; k += 1) {
    const t = probe.targets[k];
    const at = JSON.parse(await ev(`(() => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Buttons, all states'); const b = m.iframe.contentDocument.querySelectorAll('.pm-row')[${k}].querySelector('button'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + r.left + window.scrollX, y: fr.top + r.top + window.scrollY, w: r.width, h: r.height }); })()`));
    const shotB = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x, y: at.y, width: at.w, height: at.h, scale: 4 } }, sessionId);
    const c = inkCentre(Buffer.from(shotB.data, 'base64'), 4);
    if (c === null) problems.push(`${where}: no ink found in ${t.n}`);
    else if (Math.abs(c) > 1.01) problems.push(`${where}: the ink of ${t.n} is ${Math.abs(c).toFixed(2)}px ${c > 0 ? 'low' : 'high'} in its button${fk ? ` set in ${fk}` : ''}`);
  }
  }
  // The headline fonts (the Headline group): each file loads from fonts/ (local woff2), and a big title in a 1px-bordered bar sits within 1px of the middle of the bar.
  for (const hk of ['archivo', 'fraunces', 'bricolage-grotesque']) {
    await ev(`window.__ds.setHeadline(${JSON.stringify(hk)})`);
    await new Promise((r) => setTimeout(r, 900));
    const hl = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Headline, title bars'); const d = m.iframe.contentDocument; const first = getComputedStyle(d.querySelector('.pm-tb')).fontFamily.split(',')[0].trim(); await d.fonts.ready; const fam = first.replace(/"/g, ''); return JSON.stringify({ fam: first, ok: d.fonts.check('700 28px "' + fam + '"', 'Welcome') && [...d.fonts].some((f) => f.status === 'loaded' && f.family.replace(/"/g, '') === fam) }); })()`));
    if (!hl.ok) problems.push(`${where}: the headline font ${hk} (${hl.fam}) did not load in the title bars frame`);
    for (let k = 0; k < 3; k += 1) {
      const at = JSON.parse(await ev(`(() => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Headline, title bars'); const b = m.iframe.contentDocument.querySelectorAll('.pm-tb')[${k}]; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + r.left + window.scrollX, y: fr.top + r.top + window.scrollY, w: r.width, h: r.height }); })()`));
      const shotH = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x, y: at.y, width: at.w, height: at.h, scale: 4 } }, sessionId);
      const c = inkCentre(Buffer.from(shotH.data, 'base64'), 4);
      if (c === null) problems.push(`${where}: no ink found in the ${hk} title bar ${k + 1}`);
      else if (Math.abs(c) > 1.01) problems.push(`${where}: the ink of the ${hk} title bar ${k + 1} is ${Math.abs(c).toFixed(2)}px ${c > 0 ? 'low' : 'high'} in its bar`);
    }
  }
  await ev('window.__ds.setHeadline("archivo")');
  await ev('window.__ds.setFont("figtree")');
}
