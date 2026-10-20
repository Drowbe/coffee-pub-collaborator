/*
 * check-design-system-tooltips.mjs -- the Tooltips family of the proposed design system page (public/design-system/proposed-tooltips.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a tooltip that is not the inverse of the page (--text fill, --bg text), not 12px, not --radius-small, not padded 4px by 8px, wider than 240px, or without
 * --shadow-2; a shortcut chip not 11px; a control with a tooltip (data-tip) and no aria-label of the same words; in the live demo: a label that shows before 500ms of hover or
 * not after it, one that does not show at once on keyboard focus, one that does not hide on Escape or on leaving, one that shows on touch hover, one that does not show on a long
 * press, a control without aria-describedby while it shows, no role="tooltip", a label that does not flip below when the top is clipped, a truncated-text label that shows
 * when the text is not cut (or does not when it is); a contrast row under 4.5 to 1 (inverse text on the inverse fill); the family not marked Approved or its page naming
 * Tooltips as not yet decided. In the stylesheet: a hex colour, a one-sided border, a font under 11px, an inset shadow, a name that is not defined, a delay that is not 500ms.
 */
export const id = 'tooltips';
export const todayOnly = ['sdk-tabs', 'sdk-tab', 'sdk-tab-icon', 'sdk-tab-glyph', 'sdk-tabs-joined'];

export function staticChecks({ fail, css, defined }) {
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-tooltips.css: a hard-coded colour (tokens only)');
  if (/border-(left|right|top|bottom)\s*:/.test(css)) fail('proposed-tooltips.css: a rule draws an edge on one side');
  if (/box-shadow\s*:\s*inset|inset\s+\d/.test(css)) fail('proposed-tooltips.css: an inset shadow');
  for (const m of css.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)) if (Number(m[1]) < 11) fail(`proposed-tooltips.css: a font size of ${m[1]}px, under 11px`);
  if (!/--tip-delay:\s*500ms/.test(css) || !/--tip-max-w:\s*240px/.test(css)) fail('proposed-tooltips.css: the delay is not 500ms or the width not 240px');
  if (!/background:\s*var\(--text\)/.test(css) || !/color:\s*var\(--bg\)/.test(css)) fail('proposed-tooltips.css: the tooltip is not the inverse of the page (--text fill, --bg text)');
  if (!/box-shadow:\s*var\(--shadow-2\)/.test(css) || !/border-radius:\s*var\(--radius-small\)/.test(css)) fail('proposed-tooltips.css: the tooltip does not use --shadow-2 and --radius-small');
  for (const c of ['sdk-tooltip', 'sdk-truncate']) if (!defined.has(c)) fail(`the proposed stylesheets do not define the tooltips name .${c}`);
}

export async function browserChecks(b) {
  const { ev, sc, where, problems } = b;
  const r = JSON.parse(await ev(`(${tipsProbe.toString()})(${JSON.stringify({ width: sc.width, mode: sc.mode })})`));
  for (const x of r.problems) problems.push(`${where}: ${x}`);
}

const tipsProbe = async (ctx) => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const near = (a, b, e = 0.6) => Math.abs(a - b) <= e;
  const tok = (d, n, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = n; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^Tooltips/.test(t) && !/contrast/.test(t));
  if (TITLES.length < 9) bad(`the Tooltips family has only ${TITLES.length} frames`);

  // Every control with a tooltip has an accessible name of the same words.
  for (const t of TITLES) { const d = get(t); if (!d) { bad(`no frame ${t}`); continue; }
    for (const el of d.querySelectorAll('[data-tip]')) { if (el.matches('.sdk-truncate')) continue; if (el.getAttribute('aria-label') !== el.dataset.tip) bad(`${t}: a control has data-tip "${el.dataset.tip}" but aria-label "${el.getAttribute('aria-label')}"`); }
  }

  // The look.
  { const d = get('Tooltips, states'); const tips = [...d.querySelectorAll('.sdk-tooltip')]; if (tips.length < 5) bad('the states frame shows fewer than five tooltips');
    const fill = tok(d, 'var(--text)', 'backgroundColor'); const txt = tok(d, 'var(--bg)'); const rs = getComputedStyle(d.querySelector('.ds-proposed')).getPropertyValue('--radius-small').trim();
    for (const t of tips) { const cs = getComputedStyle(t);
      if (cs.backgroundColor !== fill || cs.color !== txt) bad(`a tooltip is ${cs.backgroundColor} with ${cs.color}, not the inverse of the page`);
      if (cs.fontSize !== '12px') bad(`a tooltip is ${cs.fontSize}, not 12px`);
      if (cs.borderTopLeftRadius !== rs) bad('a tooltip corner is not --radius-small');
      if (cs.paddingTop !== '4px' || cs.paddingLeft !== '8px' || cs.paddingRight !== '8px') bad(`a tooltip is padded ${cs.paddingTop} ${cs.paddingLeft}, not 4px 8px`);
      if (t.getBoundingClientRect().width > 240.5) bad(`a tooltip is ${t.getBoundingClientRect().width}px wide, over 240`);
      if (!/0px 2px 8px/.test(cs.boxShadow)) bad(`a tooltip shadow is ${cs.boxShadow}, not --shadow-2 (0 2px 8px)`);
      if (t.getAttribute('role') !== 'tooltip') bad('a tooltip has no role');
      if (cs.visibility !== 'visible') bad('a drawn tooltip is hidden'); }
    const kbd = d.querySelector('.sdk-tooltip kbd'); if (!kbd || getComputedStyle(kbd).fontSize !== '11px') bad('the shortcut chip is missing or not 11px');
    if (!d.querySelector('.sdk-tooltip[data-arrow]')) bad('no tooltip with an arrow');
    const pl = get('Tooltips, placement'); for (const p of ['bottom', 'left', 'right']) if (!pl.querySelector(`.sdk-tooltip[data-placement="${p}"]`)) bad(`no ${p} placement drawn`);
  }

  // The behaviour: hover delay, keyboard focus, Escape, touch, long press, flip, truncation.
  { const d = get('Tooltips, toolbar'); const win = d.defaultView; const T = win.__tip; if (!T) bad('the toolbar has no tooltip script'); else {
    const el = d.querySelectorAll('[data-tip]')[1]; const ev2 = (type, o) => el.dispatchEvent(new win.PointerEvent(type, Object.assign({ bubbles: true, pointerType: 'mouse' }, o || {})));
    const shown = () => T.tip.hasAttribute('data-show');
    ev2('pointerover'); await wait(300); if (shown()) bad('a tooltip shows before 500ms of hover');
    await wait(400); if (!shown()) bad('a tooltip does not show after 500ms of hover'); else {
      if (el.getAttribute('aria-describedby') !== T.tip.id) bad('the control has no aria-describedby while its tooltip shows'); if (T.tip.getAttribute('role') !== 'tooltip') bad('the live tooltip has no role');
      if (T.tip.dataset.placement !== 'bottom') bad(`a tooltip near the top of its frame did not flip below (${T.tip.dataset.placement})`);
      const tr = T.tip.getBoundingClientRect(); if (tr.left < 3.5 || tr.right > d.documentElement.clientWidth - 3.5 || tr.top < 3.5) bad('a tooltip is clipped by the frame');
      d.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); if (shown()) bad('Escape does not hide a tooltip'); if (el.hasAttribute('aria-describedby')) bad('aria-describedby stays after Escape'); }
    ev2('pointerout', { relatedTarget: d.body }); await wait(50);
    ev2('pointerover'); await wait(150); ev2('pointerout', { relatedTarget: d.body }); await wait(500); if (shown()) bad('a tooltip shows after the pointer left before 500ms');
    ev2('pointerover', { pointerType: 'touch' }); await wait(700); if (shown()) bad('a tooltip shows on touch hover');
    ev2('pointerdown', { pointerType: 'touch' }); await wait(700); if (!shown()) bad('a long press does not show the label'); ev2('pointerup', { pointerType: 'touch' }); await wait(1500); if (shown()) bad('the label stays after the finger lifts');
    // Keyboard: at once.
    d.body.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Tab', bubbles: true })); el.focus(); await wait(60); if (!shown() && el.matches(':focus-visible')) bad('a tooltip does not show at once on keyboard focus'); else if (!el.matches(':focus-visible')) out.problems.push('note: focus-visible did not match for the keyboard test'); out.problems = out.problems.filter((x) => !x.startsWith('note:'));
    el.blur(); await wait(60); if (shown()) bad('a tooltip stays after blur');
  } }
  { const d = get('Tooltips, truncated text'); const win = d.defaultView; const T = win.__tip; const [cut, whole] = [...d.querySelectorAll('.sdk-truncate')];
    if (!(cut.scrollWidth > cut.clientWidth)) bad('the truncated example is not cut'); T.show(cut, 'test'); if (!T.tip.hasAttribute('data-show')) bad('a tooltip does not show for cut-off text'); T.hide(); T.show(whole, 'test'); if (T.tip.hasAttribute('data-show')) bad('a tooltip shows for text that is not cut'); T.hide();
    if (cut.getAttribute('tabindex') !== '0') bad('truncated text cannot be reached by keyboard');
  }

  // Contrast.
  { const d = get('Tooltips, contrast'); await wait(300); const rows = [...d.querySelectorAll('.pm-ct tbody tr')]; if (rows.length < 4) bad('the contrast list is short');
    for (const tr of rows) { const rr = tr.querySelector('[data-out="r"]').textContent; if (!rr) { bad('a contrast row is not worked out'); continue; } if (tr.querySelector('[data-out="p"]').textContent === 'Fails') bad(`contrast under its minimum: ${tr.children[0].textContent} (${rr})`); } }

  // The page.
  const blk = document.getElementById('tooltips');
  if (!blk || !blk.querySelector('.ds-st-approved') || blk.querySelector('.ds-st-proposed')) bad('the Tooltips family is not marked Approved');
  if (!blk || !/321/.test(blk.textContent) || !/Today to proposed/.test(blk.textContent) || !/Markup contract/.test(blk.textContent)) bad('the Tooltips page lacks the 321 native hints note, its Today to proposed table or its markup contract');
  if (document.getElementById('u-tooltips')) bad('Tooltips is still listed as Not yet decided');
  return JSON.stringify(out);
};
