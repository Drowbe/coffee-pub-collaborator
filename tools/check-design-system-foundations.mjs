/*
 * check-design-system-foundations.mjs -- the Foundations family of the proposed design system page (public/design-system/proposed-foundations.js and .css):
 * spacing, elevation (shadows, the scrim, the layers), radius, motion, icons and layout.
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a spacing token that is not on the scale (--space-0 is 2px and --space-1 to --space-9 are 4, 8, 12, 16, 20, 24, 32, 40 and 48), a bar of the scale
 * that is not drawn from its token or not its width, a before/after mock whose "on the scale" side uses a value off the scale; a shadow whose offset and blur are
 * not 0 1px 4px, 0 2px 8px and 0 4px 16px (each larger than the one before) in both modes, a scrim that is not black at 55% in both modes; a layer token that is not
 * 0, 20, 25, 26, 30, 40, 50, 60 or 100, layers that do not stack in that order (found by pointing at the overlaps, with the markup highest first), a dialog scene
 * where the popover is not above the dialog and the toast above the popover and the scrim above the bar; a radius box that is not its token, a role that is not
 * its token; a motion duration that is not 120ms and 200ms, a fast demo or a base demo that does not use them with the easing, a shimmer or a reaction that is not the
 * shared keyframe, a reduced-motion rule that does not stop the transitions and the animations when the browser asks for it (emulated), when the page switch is
 * on, or that leaves them stopped when it is off, a second reduced-motion block in the stylesheet, a keyframe defined twice; an icon size that is not 12, 14, 16,
 * 20 or 24 or whose first three are not the type steps, an icon-only button without an accessible name and a tooltip, one not 30, 38 or 44 square, a regular
 * or brand icon outside the three "wrong" examples, a colour role that is not its token; a breakpoint ruler whose active band is not the one for the frame's
 * width, a device that does not change layout at 390, 700, 900 and 1200 (phone, tablet, tablet, wide), a bar height that is not 44, 34 (42 on a phone), 34, 24 and
 * 54 plus the safe area; a frame that scrolls sideways, text under 11px, a one-sided edge in a colour, a gradient other than the shimmer line, a radius or a
 * colour written out in the stylesheet, a frame missing, the family not marked Approved, the "Decided 2026-10-21" list missing, or the undecided list
 * still holding a bare Tokens or Icons.
 */
import { checkNesting } from './check-design-system-nesting.mjs';
export const id = 'foundations';
export const todayOnly = [];

const SCALE = [2, 4, 8, 12, 16, 20, 24, 32, 40, 48];

export function staticChecks({ fail, css, js }) {
  if (/gradient/i.test(css)) fail('proposed-foundations.css: a gradient');
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-foundations.css: a hex colour (tokens only)');
  if (/border-radius\s*:/.test(css)) fail('proposed-foundations.css: a radius (this file holds the tokens and the one motion rule)');
  if (/@keyframes/.test(css)) fail('proposed-foundations.css: a keyframe (they live in the script, which the stylesheet check cannot take as selectors)');
  SCALE.forEach((px, n) => { if (!new RegExp(`--space-${n}:\\s*${px}px;`).test(css)) fail(`proposed-foundations.css: --space-${n} is not ${px}px`); });
  const want = {
    '--shadow-1': '0 1px 4px', '--shadow-2': '0 2px 8px', '--shadow-3': '0 4px 16px',
    '--scrim': 'rgba\\(0, 0, 0, 0\\.55\\)', '--z-content': '0', '--z-bar': '20', '--z-window': '25', '--z-menu': '26', '--z-page': '30', '--z-dialog': '40', '--z-popover': '50', '--z-toast': '60', '--z-debug': '100',
    '--motion-fast': '120ms', '--motion-base': '200ms', '--ease-out': 'cubic-bezier\\(0\\.2, 0, 0, 1\\)',
    '--icon-12': 'var\\(--text-12\\)', '--icon-14': 'var\\(--text-14\\)', '--icon-16': 'var\\(--text-16\\)', '--icon-20': '20px', '--icon-24': '24px',
    '--topbar-h': '44px', '--page-pad': '16px', '--measure-reading': '720px', '--page-max': '1200px', '--module-head-h': '34px', '--toolbar-h': '34px', '--status-h': '24px', '--bottom-bar-h': '54px',
  };
  for (const [k, v] of Object.entries(want)) if (!new RegExp(`${k}:\\s*${v}`).test(css)) fail(`proposed-foundations.css: ${k} is not ${v.replace(/\\/g, '')}`);
  if (!/--safe-top: env\(safe-area-inset-top/.test(css) || !/--safe-bottom: env\(safe-area-inset-bottom/.test(css)) fail('proposed-foundations.css: the safe-area helper is missing');
  if ((css.match(/@media \(prefers-reduced-motion: reduce\)/g) || []).length !== 1) fail('proposed-foundations.css: there must be exactly one prefers-reduced-motion block');
  const rm = /@media \(prefers-reduced-motion: reduce\) \{([\s\S]*?)\n\}/.exec(css);
  if (!rm || !/animation-duration: 0\.01ms !important/.test(rm[1]) || !/transition-duration: 0\.01ms !important/.test(rm[1]) || !/animation-iteration-count: 1 !important/.test(rm[1])) fail('proposed-foundations.css: the reduced-motion rule does not stop animations and transitions (0.01ms, one iteration)');
  // The script: the example page rules between FD_CSS and the data.
  const fd = (/const FD_CSS = ([\s\S]*?)\n`;/.exec(js) || [, ''])[1];
  if (!fd) fail('proposed-foundations.js: FD_CSS not found');
  if (/#[0-9a-f]{3,8}\b/i.test(fd)) fail('proposed-foundations.js: a hex colour in the example rules');
  for (const m of fd.matchAll(/border-radius:\s*([^;]+);/g)) for (const part of m[1].trim().split(/\s+(?![^(]*\))/)) if (!/^(var\(--radius-(min|small|medium|large|round)\)|0)$/.test(part)) fail(`proposed-foundations.js: border-radius ${m[1].trim()} is not a radius token`);
  for (const m of fd.matchAll(/border-(left|right|top|bottom)\s*:\s*([^;]+);/g)) if (!/var\(--border\)/.test(m[2]) && m[2].trim() !== '0') fail(`proposed-foundations.js: a one-sided edge that is not the neutral hairline: ${m[0]}`);
  for (const m of fd.matchAll(/font-size:\s*(\d+(?:\.\d+)?)px/g)) if (Number(m[1]) < 11) fail(`proposed-foundations.js: a font size of ${m[1]}px, under 11`);
  if ((js.match(/^@keyframes shimmer \{ to/gm) || []).length !== 1) fail('proposed-foundations.js: shimmer must be defined exactly once');
  if ((js.match(/^@keyframes reaction-float \{$/gm) || []).length !== 1) fail('proposed-foundations.js: reaction-float must be defined exactly once');
  if ((js.match(/linear-gradient/g) || []).length !== 1) fail('proposed-foundations.js: the only gradient is the shimmer line');
  // Bars of the scale are drawn from tokens.
  for (const m of js.matchAll(/style="width:([^"]+)"/g)) if (!/^var\(--space-/.test(m[1]) && !/^\d+%$/.test(m[1]) && m[1] !== '1200px') fail(`proposed-foundations.js: a bar or box with a width that is not a spacing token: ${m[1]}`);
  // Solid only: three wrong examples, nothing else.
  const wrong = [...js.matchAll(/<i class="fa-(regular|brands)[^>]*>/g)];
  if (wrong.length !== 3 || wrong.some((m) => !/pm-fd-wrong/.test(m[0]))) fail('proposed-foundations.js: a regular or brand icon outside the three "wrong" examples');
  if (!/Decided 2026-10-21/.test(js)) fail('proposed-foundations.js: no "Decided 2026-10-21" list');
}

export async function browserChecks(b) {
  const { ev, cdp, sessionId, where, problems } = b;
  const r = JSON.parse(await ev(`(${probe.toString()})()`));
  for (const x of r.problems) problems.push(`${where}: ${x}`);
  await checkNesting(b, /^Foundations/);
  // Reduced motion, asked of the browser (emulated): every transition and animation ends at once, in this family's frames and in another family's.
  const readMotion = () => ev(`(() => { const F = window.__ds.frames; const f = F.find((x) => x.iframe.title === 'Foundations, motion'); const d = f.iframe.contentDocument; const w = d.defaultView;
    if (w.__fdRead) w.__fdRead(); const fill = d.querySelector('.pm-fd-fill'); const skel = d.querySelector('.pm-fd-skel'); const sheet = d.querySelector('.pm-fd-sheet');
    const o = F.find((x) => x.iframe.title === 'Buttons, all states'); const btn = o && o.iframe.contentDocument.querySelector('.btn'); const ob = btn && o.iframe.contentWindow.getComputedStyle(btn);
    return JSON.stringify({ fill: w.getComputedStyle(fill).transitionDuration, sheet: w.getComputedStyle(sheet).transitionDuration, skel: w.getComputedStyle(skel).animationDuration, count: w.getComputedStyle(skel).animationIterationCount, other: ob ? ob.transitionDuration : null, state: d.querySelector('[data-readout]').dataset.state }); })()`);
  const ms = (v) => { const n = parseFloat(v); return /ms$/.test(v) ? n : n * 1000; };
  try {
    await cdp.send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] }, sessionId);
    await new Promise((res) => setTimeout(res, 300));
    const on = JSON.parse(await readMotion());
    if (ms(on.fill) > 0.05 || ms(on.sheet) > 0.05) problems.push(`${where}: with reduced motion asked for, the transitions still run (${on.fill}, ${on.sheet})`);
    if (ms(on.skel) > 0.05 || on.count !== '1') problems.push(`${where}: with reduced motion asked for, the shimmer still runs (${on.skel}, ${on.count})`);
    if (on.other !== null && ms(on.other) > 0.05) problems.push(`${where}: with reduced motion asked for, a button of another family still transitions (${on.other})`);
    if (on.state !== 'off') problems.push(`${where}: the motion readout does not say reduced motion is on (${on.state})`);
  } finally {
    await cdp.send('Emulation.setEmulatedMedia', { features: [] }, sessionId);
  }
  await new Promise((res) => setTimeout(res, 300));
  const off = JSON.parse(await readMotion());
  if (Math.abs(ms(off.fill) - 120) > 0.5 || Math.abs(ms(off.sheet) - 200) > 0.5 || Math.abs(ms(off.skel) - 1400) > 0.5) problems.push(`${where}: with no reduced motion, the durations are ${off.fill}, ${off.sheet}, ${off.skel}, not 120ms, 200ms, 1400ms`);
  if (off.state !== 'on') problems.push(`${where}: the motion readout does not say motion is on (${off.state})`);
  // The page switch "Simulate reduced motion".
  await ev(`document.getElementById('foundations-reduce').click()`);
  await new Promise((res) => setTimeout(res, 200));
  const sw = JSON.parse(await readMotion());
  if (ms(sw.fill) > 0.05 || ms(sw.sheet) > 0.05 || ms(sw.skel) > 0.05 || sw.state !== 'off') problems.push(`${where}: the Simulate reduced motion switch does not stop the demos (${sw.fill}, ${sw.sheet}, ${sw.skel}, ${sw.state})`);
  const pressed = await ev(`document.getElementById('foundations-reduce').getAttribute('aria-pressed')`);
  if (pressed !== 'true') problems.push(`${where}: the Simulate reduced motion switch is not marked pressed`);
  await ev(`document.getElementById('foundations-reduce').click()`);
  await new Promise((res) => setTimeout(res, 200));
  const back = JSON.parse(await readMotion());
  if (Math.abs(ms(back.fill) - 120) > 0.5 || back.state !== 'on') problems.push(`${where}: turning the switch off does not bring the motion back (${back.fill}, ${back.state})`);
}

// Measured in the page (runs in the browser).
const probe = async () => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^Foundations/.test(t));
  const EXPECT = ['spacing scale', 'before and after', 'shadows', 'today\'s shadows', 'scrim', 'layers', 'layers in use', 'radius tokens', 'radius by role', 'motion', 'icon sizes', 'icons solid only', 'icon colour', 'icon buttons', 'breakpoints', 'page skeleton', 'nesting and corners'];
  for (const e of EXPECT) if (!TITLES.includes(e === 'motion' ? 'Foundations, motion' : `Foundations, ${e}`)) bad(`no frame "Foundations, ${e}"`);
  for (const w of [390, 700, 1280]) if (!TITLES.includes(`Foundations at ${w}`)) bad(`no frame "Foundations at ${w}"`);
  const cs = (d, e, p) => d.defaultView.getComputedStyle(e, p);
  const root = (d) => d.querySelector('.ds-proposed');
  const prop = (d, n) => cs(d, root(d)).getPropertyValue(n).trim();
  const px = (v) => Number(String(v).replace('px', ''));
  const tokOf = (d, n, p) => { const s = d.createElement('span'); s.style[p] = `var(${n})`; root(d).appendChild(s); const c = cs(d, s)[p]; s.remove(); return c; };
  const SCALE = [2, 4, 8, 12, 16, 20, 24, 32, 40, 48];
  await wait(150);
  const dark = document.documentElement.dataset.themeMode === 'dark';
  // Every frame: no sideways scroll, no text under 11px, no coloured one-sided edge, no gradient but the shimmer line.
  for (const t of TITLES) {
    const d = get(t); if (!d) { bad(`no frame ${t}`); continue; }
    if (d.documentElement.scrollWidth > d.documentElement.clientWidth + 1) bad(`${t}: scrolls sideways (${d.documentElement.scrollWidth} in ${d.documentElement.clientWidth})`);
    const border = tokOf(d, '--border', 'color');
    for (const el of d.querySelectorAll('.ds-proposed *')) {
      const c = cs(d, el); const nm = `${t}: ${el.className && el.className.baseVal === undefined ? el.className : el.tagName}`;
      if (/gradient/.test(c.backgroundImage) && !el.classList.contains('pm-fd-skel')) bad(`${nm}: a gradient`);
      const sides = ['Top', 'Right', 'Bottom', 'Left'].map((s) => ({ w: c['border' + s + 'Width'], col: c['border' + s + 'Color'], st: c['border' + s + 'Style'] }));
      const some = sides.filter((s) => !(s.st === 'none' || s.w === '0px'));
      if (some.length && some.length < 4) for (const s of some) if (s.col !== border) bad(`${nm}: a coloured one-sided edge (${s.col})`);
      if (some.length === 4) { const k = new Set(some.map((s) => s.w + s.col + s.st)); if (k.size > 1 && !el.matches('.pm-fd-old, .btn, button')) bad(`${nm}: the four edges differ`); }
      for (const ps of ['::before', '::after']) { const p = cs(d, el, ps); if (p.content === 'none' || p.position !== 'absolute') continue; if (px(p.width) <= 4 && p.backgroundColor !== 'rgba(0, 0, 0, 0)') bad(`${nm}: a thin coloured block drawn on a side`); }
      if (el.childNodes.length && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && px(c.fontSize) < 10.99) bad(`${nm}: text at ${c.fontSize}, under 11px`);
    }
  }
  // Spacing: the tokens, the bars, the mocks.
  { const d = get('Foundations, spacing scale'); if (d) {
      SCALE.forEach((v, n) => { if (prop(d, `--space-${n}`) !== `${v}px`) bad(`--space-${n} is ${prop(d, `--space-${n}`)}, not ${v}px`); });
      const rows = [...d.querySelectorAll('.pm-fd-srow')]; if (rows.length !== 10) bad(`the spacing scale draws ${rows.length} rows, not 10`);
      rows.forEach((row) => { const bar = row.querySelector('.pm-fd-bar'); const want = Number(row.dataset.px); const got = bar.getBoundingClientRect().width; if (Math.abs(got - want) > 0.6) bad(`the bar of --space-${row.dataset.space} is ${got}px, not ${want}px`);
        if (!/^var\(--space-\d\)$/.test(bar.style.width)) bad(`the bar of --space-${row.dataset.space} is not drawn from its token (${bar.style.width})`); if (!row.textContent.includes(`--space-${row.dataset.space}`) || !row.textContent.includes(`${want}px`)) bad(`the row of --space-${row.dataset.space} lacks its name or size`); });
      if (px(prop(d, '--space-0')) !== 2) bad('--space-0 is not the 2px hairline step');
    } }
  { const d = get('Foundations, before and after'); if (d) {
      const read = (sel) => { const m = d.querySelector(sel); const row = m.querySelector('.pm-fd-mrow'); const card = m.querySelector('.pm-fd-mcard'); const panel = m.querySelector('.pm-fd-mpanel'); const a = cs(d, row); const c = cs(d, card); const p = cs(d, panel);
        return { y: px(a.paddingTop), x: px(a.paddingLeft), gap: px(a.columnGap), card: px(c.paddingTop), cardGap: px(c.rowGap), panel: px(p.paddingTop), between: px(p.rowGap) }; };
      const bf = read('.pm-fd-before'); const af = read('.pm-fd-after');
      if (![bf.y, bf.x, bf.card, bf.panel].every((v) => [6, 10, 14].includes(v))) bad(`the "today" mock does not show the 6, 10 and 14 strays (${JSON.stringify(bf)})`);
      for (const [k, v] of Object.entries(af)) if (!SCALE.includes(v) && !(k === 'x' && v === 10)) bad(`the "on the scale" mock has ${k} ${v}px, off the scale`);
      if (af.y !== 8 || af.x !== 10 || af.gap !== 8 || af.card !== 12 || af.cardGap !== 8 || af.panel !== 16 || af.between !== 8) bad(`the "on the scale" mock is not row 8 by 8+2, gaps 8, card 12, panel 16 (${JSON.stringify(af)})`);
    } }
  // Shadows and the scrim, both modes.
  { const d = get('Foundations, shadows'); if (d) {
      const sh = (n) => cs(d, d.querySelector(`[data-shadow="${n}"]`)).boxShadow;
      const geo = (s) => { const m = /(-?[\d.]+)px (-?[\d.]+)px ([\d.]+)px/.exec(s); return m ? [Number(m[1]), Number(m[2]), Number(m[3])] : null; };
      const g = [1, 2, 3].map((n) => geo(sh(n)));
      const WANT = [[0, 1, 4], [0, 2, 8], [0, 4, 16]];
      g.forEach((v, i) => { if (!v || v.join() !== WANT[i].join()) bad(`--shadow-${i + 1} is ${sh(i + 1)}, not 0 ${WANT[i][1]}px ${WANT[i][2]}px`); });
      if (g.every(Boolean) && !(g[0][2] < g[1][2] && g[1][2] < g[2][2])) bad('the three shadows do not grow');
      if (dark) { const a = [1, 2, 3].map((n) => (/rgba?\(0, 0, 0, ([\d.]+)\)/.exec(sh(n)) || [])[1]); if (a.join() !== '0.35,0.35,0.35') bad(`the dark shadows are black at ${a.join(', ')}, not 35, 35 and 35%`); }
      else for (const n of [1, 2, 3]) if (/rgba?\(0, 0, 0, /.test(sh(n)) && !/color\(|rgba?\((?!0, 0, 0)/.test(sh(n))) bad(`light --shadow-${n} is black, not the text colour at a low strength`);
      if (sh(1) === sh(2) || sh(2) === sh(3)) bad('two shadow levels look the same');
      for (const t of d.querySelectorAll('[data-shadow]')) if (cs(d, t).boxShadow === 'none') bad('a shadow level has no shadow');
    } }
  { const d = get('Foundations, today\'s shadows'); if (d && d.querySelectorAll('.pm-fd-lift').length < 8) bad('today\'s shadows shows fewer than 8 of them'); }
  { const d = get('Foundations, scrim'); if (d) { const s = cs(d, d.querySelector('[data-scrim] i')).backgroundColor; if (s !== 'rgba(0, 0, 0, 0.55)') bad(`the scrim is ${s}, not black at 55%`); if (tokOf(d, '--scrim', 'backgroundColor') !== 'rgba(0, 0, 0, 0.55)') bad('--scrim is not black at 55%'); if (d.querySelectorAll('.pm-fd-old').length !== 3) bad('the scrim frame does not show the old 35, 60 and 72'); } }
  // Layers: tokens, the order they stack in, the dialog scene.
  { const d = get('Foundations, layers'); if (d) {
      const WANT = { content: 0, bar: 20, window: 25, menu: 26, page: 30, dialog: 40, popover: 50, toast: 60, debug: 100 };
      const names = Object.keys(WANT); const tiles = names.map((n) => d.querySelector(`[data-layer="${n}"]`));
      names.forEach((n, i) => { if (!tiles[i]) { bad(`no ${n} layer`); return; } const z = cs(d, tiles[i]).zIndex; if (Number(z) !== WANT[n]) bad(`the ${n} layer is z-index ${z}, not ${WANT[n]}`); });
      const dom = [...d.querySelectorAll('[data-layer]')].map((e) => e.dataset.layer); if (dom[0] !== 'debug') bad('the layers are not listed highest first in the markup');
      for (let i = 0; i + 1 < names.length; i += 1) { if (!tiles[i] || !tiles[i + 1]) continue; const b = tiles[i + 1].getBoundingClientRect(); const hit = d.elementFromPoint(b.left + 4, b.top + 4); if (!hit || hit.closest('[data-layer]') !== tiles[i + 1]) bad(`${names[i + 1]} is not above ${names[i]} where they overlap`); }
      for (const t of ['--z-menu']) if (prop(d, t) !== '26') bad(`${t} is ${prop(d, t)}, not 26`);
    } }
  { const d = get('Foundations, layers in use'); if (d) {
      const q = (n) => d.querySelector(`[data-layer="${n}"]`); const z = (n) => Number(cs(d, q(n)).zIndex);
      if (!(z('bar') < z('scrim') && z('scrim') <= z('dialog') && z('dialog') < z('popover') && z('popover') < z('toast'))) bad(`the scene does not stack bar < scrim <= dialog < popover < toast (${['bar', 'scrim', 'dialog', 'popover', 'toast'].map(z).join(', ')})`);
      const top = (x, y) => { const e = d.elementFromPoint(x, y); return e && e.closest('[data-layer]') && e.closest('[data-layer]').dataset.layer; };
      const bar = q('bar').getBoundingClientRect(); const pop = q('popover').getBoundingClientRect(); const toast = q('toast').getBoundingClientRect(); const dlg = q('dialog').getBoundingClientRect();
      if (top(bar.right - 8, bar.top + 8) !== 'scrim') bad(`the scrim does not cover the bar (${top(bar.right - 8, bar.top + 8)})`);
      if (top(pop.left + 8, pop.top + 8) !== 'popover') bad(`the popover is not above the dialog (${top(pop.left + 8, pop.top + 8)})`);
      if (!(pop.left > dlg.left && pop.top > dlg.top)) bad('the popover is not drawn inside the dialog');
      if (top(toast.left + 8, pop.bottom - 4) !== 'toast' && top(toast.left + 8, toast.top + 4) !== 'toast') bad('the toast is not above the popover');
      if (top(toast.left + 8, Math.max(toast.top, pop.top) + 2) === 'dialog') bad('the dialog is above the toast');
    } }
  // Nesting and corners: the live example's rows are 8px apart in a list and 4px in a card; the card and rows have the stepped corners.
  { const d = get('Foundations, nesting and corners'); if (d) {
      const gap = (sel) => { const rs = [...d.querySelectorAll(sel + ' .sdk-row')]; return rs.length < 2 ? null : rs[1].getBoundingClientRect().top - rs[0].getBoundingClientRect().bottom; };
      const gl = gap('[data-gap="list"]'); const gc = gap('[data-gap="card"]');
      if (gl === null || Math.abs(gl - 8) > 0.6) bad(`rows in a list are ${gl}px apart, not 8`);
      if (gc === null || Math.abs(gc - 4) > 0.6) bad(`rows in a card are ${gc}px apart, not 4`);
      const R = (sel) => cs(d, d.querySelector(sel)).borderTopLeftRadius; const right = '[data-nest="right"]';
      if (R(right + ' .sdk-panel') !== tokOf(d, '--radius-large', 'borderTopLeftRadius') || R(right + ' .sdk-card') !== tokOf(d, '--radius-large', 'borderTopLeftRadius') || R(right + ' .sdk-row') !== tokOf(d, '--radius-small', 'borderTopLeftRadius')) bad('the nesting example does not step the corners panel large, card large, row small');
      if (!d.querySelector('[data-nest="wrong"][data-nesting-skip]')) bad('the wrong example is not marked as skipped by the nesting check');
    } }
  // Radius.
  { const d = get('Foundations, radius tokens'); if (d) { const boxes = [...d.querySelectorAll('[data-radius]')]; if (boxes.length !== 5) bad(`radius tokens draws ${boxes.length}, not 5`);
      const W = { min: '3px', small: '5px', medium: '7px', large: '11px', round: '999px' };
      for (const bx of boxes) { const k = bx.dataset.radius; if (cs(d, bx).borderTopLeftRadius !== tokOf(d, `--radius-${k}`, 'borderTopLeftRadius') || cs(d, bx).borderTopLeftRadius !== W[k]) bad(`radius box ${k} is ${cs(d, bx).borderTopLeftRadius}, not ${W[k]}`); } } }
  { const d = get('Foundations, radius by role'); if (d) { const boxes = [...d.querySelectorAll('[data-role]')]; if (boxes.length !== 9) bad(`radius by role draws ${boxes.length}, not 9`);
      for (const bx of boxes) { const k = bx.dataset.role; if (cs(d, bx).borderTopLeftRadius !== tokOf(d, `--radius-${k}`, 'borderTopLeftRadius')) bad(`a ${k} role box has a corner of ${cs(d, bx).borderTopLeftRadius}`); }
      const names = boxes.map((e) => e.textContent); if (!names.some((n) => /Menu/.test(n)) || !names.some((n) => /Micro count/.test(n))) bad('radius by role lacks the menu or the micro count'); } }
  // Motion: the demos use the tokens and the shared keyframes.
  { const d = get('Foundations, motion'); if (d) {
      if (prop(d, '--motion-fast') !== '120ms' || prop(d, '--motion-base') !== '200ms') bad(`the durations are ${prop(d, '--motion-fast')} and ${prop(d, '--motion-base')}, not 120ms and 200ms`);
      if (!d.defaultView.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const fill = cs(d, d.querySelector('.pm-fd-fill')); const sheet = cs(d, d.querySelector('.pm-fd-sheet')); const skel = cs(d, d.querySelector('.pm-fd-skel')); const react = cs(d, d.querySelector('[data-react]'));
        const all = (v, t) => v.split(',').every((x) => x.trim() === t);
        if (!all(fill.transitionDuration, '0.12s')) bad(`the fast demo takes ${fill.transitionDuration}`);
        if (!all(sheet.transitionDuration, '0.2s')) bad(`the base demo takes ${sheet.transitionDuration}`);
        for (const x of [fill, sheet]) if (!/cubic-bezier\(0\.2, 0, 0, 1\)/.test(x.transitionTimingFunction)) bad(`a demo does not use --ease-out (${x.transitionTimingFunction})`);
        if (skel.animationName !== 'shimmer' || react.animationName !== 'reaction-float') bad(`the loop demos use ${skel.animationName} and ${react.animationName}, not shimmer and reaction-float`);
        // Play really changes the state, and the change happens in the time the token says.
        const demo = d.querySelector('[data-demo="fast"]'); const before = cs(d, d.querySelector('.pm-fd-fill')).backgroundColor; d.querySelector('[data-demo="fast"] [data-play]').click(); await wait(400);
        if (cs(d, d.querySelector('.pm-fd-fill')).backgroundColor === before) bad('Play does not change the fast demo'); demo.removeAttribute('data-on');
        const sh = d.querySelector('[data-demo="base"]'); d.querySelector('[data-demo="base"] [data-play]').click(); await wait(500);
        if (cs(d, d.querySelector('.pm-fd-sheet')).opacity !== '1') bad('Play does not bring the sheet in'); sh.removeAttribute('data-on');
      }
      const sw = document.getElementById('foundations-reduce'); if (!sw || sw.textContent.trim() !== 'Simulate reduced motion') bad('the page has no "Simulate reduced motion" switch');
    } }
  // Icons.
  { const d = get('Foundations, icon sizes'); if (d) {
      for (const n of [12, 14, 16]) if (tokOf(d, `--icon-${n}`, 'fontSize') !== tokOf(d, `--text-${n}`, 'fontSize') || tokOf(d, `--icon-${n}`, 'fontSize') !== `${n}px`) bad(`--icon-${n} is not the type step text-${n} (${tokOf(d, `--icon-${n}`, 'fontSize')})`);
      for (const [n, v] of [[20, '20px'], [24, '24px']]) if (tokOf(d, `--icon-${n}`, 'fontSize') !== v) bad(`--icon-${n} is not ${v}`);
      const rows = [...d.querySelectorAll('[data-isize]')]; if (rows.map((r) => r.dataset.isize).join() !== '12,14,16,20,24') bad('the icon size rows are not 12, 14, 16, 20 and 24');
      for (const row of rows) { const ic = row.querySelector('.pm-fd-ic'); if (cs(d, ic).fontSize !== `${row.dataset.isize}px`) bad(`the --icon-${row.dataset.isize} sample is ${cs(d, ic).fontSize}`); const g = ic.querySelector('i').getBoundingClientRect(); if (Math.abs(g.height - Number(row.dataset.isize)) > 2) bad(`the --icon-${row.dataset.isize} glyph is ${g.height}px high`); }
    } }
  { const d = get('Foundations, icons solid only'); if (d) { if (d.querySelectorAll('i.fa-regular, i.fa-brands').length !== 3) bad('the solid-only frame does not show exactly three non-solid icons'); if (d.querySelectorAll('i.fa-solid').length < 4) bad('the solid-only frame shows too few solid icons');
      for (const i of d.querySelectorAll('i.fa-regular, i.fa-brands')) if (!i.classList.contains('pm-fd-wrong')) bad('a non-solid icon is not marked as wrong'); } }
  { const d = get('Foundations, icon colour'); if (d) {
      const col = (n) => cs(d, d.querySelector(`[data-role="${n}"]`)).color;
      if (col('default') !== tokOf(d, '--text-dim', 'color')) bad(`the default icon is ${col('default')}, not --text-dim`);
      if (col('hover') !== tokOf(d, '--icon-hover', 'color')) bad(`the hover icon is ${col('hover')}, not --icon-hover`);
      const btn = d.querySelector('[data-role="button"]'); if (cs(d, btn.querySelector('i')).color !== cs(d, btn).color) bad('an icon inside a button does not take the button\'s text colour');
      if (col('tint') === col('default')) bad('the category icon has no tint');
      const f = d.querySelector('.btn'); f.classList.add('ds-force-focus'); const o = cs(d, f); if (o.outlineWidth !== '2px' || o.outlineStyle !== 'solid') bad(`a focused button is not a 2px outline (${o.outlineWidth} ${o.outlineStyle})`); f.classList.remove('ds-force-focus');
    } }
  { const d = get('Foundations, icon buttons'); if (d) {
      for (const bt of d.querySelectorAll('[data-bsize]')) { const r = bt.getBoundingClientRect(); const want = bt.dataset.bsize === '38' && d.defaultView.innerWidth <= 640 ? 44 : Number(bt.dataset.bsize); if (Math.abs(r.height - want) > 0.6 || Math.abs(r.width - want) > 0.6) bad(`an icon-only button is ${r.width} by ${r.height}, not ${want} square`);
        const al = bt.getAttribute('aria-label'); if (!al || bt.getAttribute('title') !== al) bad('an icon-only button lacks an accessible name or a tooltip with the same words'); }
      if (d.querySelectorAll('[data-bsize]').length !== 3) bad('the icon buttons are not 30, 38 and 44');
    } }
  // Layout: tokens, the ruler, the device, the skeleton.
  const tier = (w) => (w <= 640 ? 'phone' : w <= 900 ? 'tablet' : w < 1200 ? 'desktop' : 'wide');
  { const d = get('Foundations, breakpoints'); if (d) {
      const W = d.defaultView.innerWidth; const now = d.querySelectorAll('.pm-fd-ruler > span.now'); if (now.length !== 1 || now[0].dataset.tier !== tier(W)) bad(`the ruler marks ${[...now].map((n) => n.dataset.tier)} at ${W}px, expected ${tier(W)}`);
      if (d.querySelector('[data-here]').dataset.tier !== tier(W)) bad('the ruler\'s sentence does not say the frame\'s tier');
      const dev = d.querySelector('[data-device]'); const body = d.querySelector('.pm-fd-body');
      for (const [w, t, cols] of [[390, 'phone', 1], [700, 'tablet', 1], [900, 'tablet', 1], [1200, 'wide', 2]]) {
        d.querySelector(`[data-dev="${w}"]`).click(); await wait(80);
        const name = cs(d, d.querySelector('[data-tier-name]'), '::before').content.replace(/"/g, ''); if (name !== t) bad(`the device at ${w} says "${name}", not "${t}"`);
        if (cs(d, dev).width !== `${w}px`) bad(`the device is ${cs(d, dev).width} wide at ${w}`);
        const n = cs(d, body).gridTemplateColumns.split(' ').length; if (n !== cols) bad(`the page at ${w} has ${n} columns, not ${cols}`);
        const bottom = cs(d, d.querySelector('.pm-fd-bottom')).display; if ((bottom !== 'none') !== (w <= 640)) bad(`the bottom bar is ${bottom} at ${w}`);
        const pad = px(cs(d, body).paddingLeft); if (pad !== (w <= 640 ? 12 : 16)) bad(`page padding at ${w} is ${pad}, not ${w <= 640 ? 12 : 16}`);
        if (d.querySelector(`[data-dev="${w}"]`).getAttribute('aria-pressed') !== 'true') bad('the device width button is not pressed');
      }
      d.querySelector('[data-dev="1200"]').click();
      const clip = d.querySelector('[data-clip]'); if (clip.scrollWidth > clip.clientWidth + 1 || d.documentElement.scrollWidth > d.documentElement.clientWidth + 1) bad('the device does not fit its frame');
    } }
  { const d = get('Foundations, page skeleton'); if (d) {
      const hOf = (box, cls) => d.querySelector(`[data-skeleton="${box}"] .${cls}`).getBoundingClientRect().height;
      const want = { desktop: { 'pm-fd-b-top': 44, 'pm-fd-b-head': 34, 'pm-fd-b-tool': 34, 'pm-fd-b-status': 24 }, phone: { 'pm-fd-b-top': 44, 'pm-fd-b-head': 42, 'pm-fd-b-tool': 34, 'pm-fd-b-status': 24, 'pm-fd-b-bottom': 88 } };
      for (const [box, m] of Object.entries(want)) for (const [cls, v] of Object.entries(m)) if (Math.abs(hOf(box, cls) - v) > 0.6) bad(`the ${box} ${cls} band is ${hOf(box, cls)}px, not ${v}`);
      for (const [n, v] of [['--topbar-h', '44px'], ['--toolbar-h', '34px'], ['--status-h', '24px'], ['--bottom-bar-h', '54px'], ['--measure-reading', '720px'], ['--page-max', '1200px']]) if (prop(d, n) !== v) bad(`${n} is ${prop(d, n)}, not ${v}`);
      const phone = d.defaultView.innerWidth <= 640; if (prop(d, '--module-head-h') !== (phone ? '42px' : '34px')) bad(`--module-head-h is ${prop(d, '--module-head-h')}`); if (prop(d, '--page-pad') !== (phone ? '12px' : '16px')) bad(`--page-pad is ${prop(d, '--page-pad')}`);
    } }
  for (const w of [390, 700, 1280]) { const d = get(`Foundations at ${w}`); if (!d) continue; await wait(100);
    const t = d.querySelector('[data-here2]').dataset.tier; if (t !== tier(d.defaultView.innerWidth)) bad(`Foundations at ${w} says ${t} at ${d.defaultView.innerWidth}px`);
    if (d.documentElement.scrollWidth > d.documentElement.clientWidth + 1) bad(`Foundations at ${w}: scrolls sideways`); }
  // The page: Proposed, the list of choices, the undecided list.
  const blk = document.getElementById('foundations');
  if (!blk || !blk.querySelector('.ds-st-approved') || blk.querySelector('.ds-st-proposed')) bad('the Foundations family is not marked Approved');
  if (!blk || !/Decided 2026-10-21/.test(blk.textContent)) bad('the Foundations family has no Decided 2026-10-21 list');
  if (!blk || !/Today to proposed/.test(blk.textContent) || !/Aliases and migration/.test(blk.textContent) || !/Tokens/.test(blk.textContent)) bad('the Foundations family lacks the Today to proposed, aliases or tokens sections');
  if (document.getElementById('u-tokens') || document.getElementById('u-icons')) bad('Tokens or Icons is still listed bare as Not yet decided');
  if (!/259 icons|259/.test(blk ? blk.textContent : '')) bad('the Icons section does not say where the 259 icons are');
  return JSON.stringify(out);
};
