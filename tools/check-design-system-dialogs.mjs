/*
 * check-design-system-dialogs.mjs -- the Dialogs and sheets family of the proposed design system page (public/design-system/legacy/system-v1/proposed-dialogs.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a dialog not 360 (a confirm), 560 (a form) or 880 (a browse) wide; the same sizes through the aliases (.sdk-editor 560, .sdk-editor-large 880, .layout-sheet 560,
 * .phase-sheet 880, .bgpick-card 880); a title not Figtree (never Fraunces) 600 at 18px; a close that is not the quiet 30px icon button, or is not 17px from the top and the
 * right edge of the dialog's border box in every dialog and every alias; a surface that is not the panel with a 1px hairline, --radius-large and a 0 4px 16px shadow; a
 * footer that is not right-aligned with a top hairline and the Primary (or the Danger) last; a head that does not get a hairline once the body has scrolled, or a body that
 * does not scroll while the head and the foot stay; a discard row that does not replace the foot; a confirm that is not 360, whose destructive button is not the soft Danger
 * (or the final one the solid), or whose Cancel is not first; the scrim not black at 55%; at 390 a dialog that is not full screen with no radius,
 * no shadow and an opaque backdrop; in the live demo: Escape closing a clean form, Escape asking "Discard your changes?" on a dirty one (and again keeping the edits), the
 * backdrop ignored while dirty, the Tab trap, the focus return to the opener, the page's scroll lock, the default focus (the first field of a form, Cancel of a
 * confirm), the typed name enabling the final button; an element with an edge of a colour on one side only; a contrast row under its minimum; the family not marked
 * Proposed, or its page naming Dialogs and sheets as not yet decided. In the stylesheet: a one-sided border (the hairlines of the head and the foot are allowed), a hex colour,
 * a font under 11px, an inset shadow, a name that is not defined.
 */
import { alignRows } from './check-design-system-align.mjs';

export const id = 'dialogs';
export const todayOnly = ['sdk-form', 'sdk-tabs', 'sdk-field', 'sdk-label', 'sdk-hint', 'sdk-optional', 'sdk-group', 'sdk-dp', 'sdk-dp-head', 'sdk-dp-title', 'sdk-dp-grid', 'sdk-dp-dow', 'sdk-dp-day', 'sel', 'today', 'solid', 'sdk-toasts', 'sdk-toast', 'sdk-toast-icon', 'sdk-toast-body', 'sdk-toast-title', 'sdk-toast-end'];

export function staticChecks({ fail, css, defined }) {
  const noHair = css.replace(/border-(top|bottom)\s*:\s*1px solid var\(--border\)/g, '').replace(/border-bottom\s*:\s*1px solid transparent/g, '');
  if (/border-(left|right|top|bottom)\s*:/.test(noHair)) fail('proposed-dialogs.css: a rule draws an edge on one side (only the head and foot hairlines are allowed)');
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-dialogs.css: a hard-coded colour (tokens only)');
  if (/box-shadow\s*:\s*inset|inset\s+\d/.test(css)) fail('proposed-dialogs.css: an inset shadow (a bar)');
  if (/text-decoration\s*:\s*underline/.test(css)) fail('proposed-dialogs.css: a rule underlines something');
  for (const m of css.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)) if (Number(m[1]) < 11) fail(`proposed-dialogs.css: a font size of ${m[1]}px, under 11px`);
  if (!/box-shadow:\s*var\(--shadow-3\)/.test(css)) fail('proposed-dialogs.css: the surface does not use box-shadow: var(--shadow-3)');
  if (!/--dlg-w-confirm:\s*360px/.test(css) || !/--dlg-w-form:\s*560px/.test(css) || !/--dlg-w-browse:\s*880px/.test(css)) fail('proposed-dialogs.css: the three sizes are not 360, 560 and 880');
  if (!/--dlg-ms:\s*200ms/.test(css) || !/ease-out/.test(css)) fail('proposed-dialogs.css: the enter and exit is not 200ms ease-out');
  if (!/@media \(max-width: 640px\)[\s\S]*--radius-large: 0px;[\s\S]*box-shadow: none;/.test(css)) fail('proposed-dialogs.css: no full-screen rule at 640px (no radius, no shadow)');
  if (!/font-weight: 600;[^}]*line-height: 24px/.test(css) || !/font-size: var\(--text-18, 18px\)/.test(css)) fail('proposed-dialogs.css: the title is not 18px at weight 600');
  for (const c of ['sdk-dialog', 'sdk-dialog-layer', 'sdk-dialog-confirm', 'sdk-dialog-wide', 'sdk-dialog-head', 'sdk-dialog-title', 'sdk-dialog-close', 'sdk-dialog-body', 'sdk-dialog-foot', 'sdk-dialog-discard', 'sdk-dialog-discard-text', 'sdk-dialog-note',
    'sdk-editor', 'sdk-editor-large', 'sdk-editor-actions', 'sdk-editor-discard', 'sdk-editor-close', 'layout-sheet', 'layout-sheet-title', 'layout-form-body', 'phase-sheet', 'phase-sheet-head', 'phase-sheet-body', 'phase-sheet-close', 'bgpick', 'bgpick-card', 'bgpick-head', 'bgpick-body', 'bgpick-foot', 'bgpick-close']) {
    if (!defined.has(c)) fail(`the proposed stylesheets do not define the dialogs name .${c} (a new name or a kept alias)`);
  }
}

export async function browserChecks(b) {
  const { ev, sc, where, problems } = b;
  const r = JSON.parse(await ev(`(${dialogsProbe.toString()})(${JSON.stringify({ width: sc.width, mode: sc.mode })})`));
  for (const x of r.problems) problems.push(`${where}: ${x}`);
  // Alignment: the title and the close share a centre line, the head, body and foot are even left to right, and every gap is on the scale.
  await alignRows(b, [
    { frame: /^Dialogs/, row: '.sdk-dialog-head', padding: 'x' },
    { frame: /^Dialogs/, row: '.sdk-dialog-foot', skip: '.sdk-dialog-note, .sdk-form-error, .hint' },
    { frame: /^Dialogs, (states|two steps|try it)/, row: '.sdk-dialog-discard' },
    { frame: /^Dialogs, (anatomy|three sizes|confirm)/, row: '.sdk-dialog-body', padding: 'x', centres: false },
    { frame: /^Dialogs, aliases/, row: '.sdk-editor-actions, .layout-sheet .sdk-dialog-foot', padding: 'x' },
  ]);
}

const dialogsProbe = async (ctx) => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const near = (a, b, e = 0.6) => Math.abs(a - b) <= e;
  const tok = (d, n, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = n; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^Dialogs/.test(t) && !/contrast/.test(t));
  if (TITLES.length < 12) bad(`the Dialogs family has only ${TITLES.length} frames`);
  const SIDES = ['Top', 'Right', 'Bottom', 'Left'];
  const SHELL = '.sdk-dialog, .sdk-editor, .layout-sheet, .phase-sheet, .bgpick-card';

  // No element with a coloured edge on one side; no stray one-sided edge.
  for (const t of TITLES) {
    const d = get(t); if (!d) { bad(`no frame ${t}`); continue; }
    const hair = tok(d, 'var(--border)');
    for (const el of d.querySelectorAll('.ds-proposed *')) {
      if (el.closest('.sdk-dp, .pm-ct, .sdk-field, .sdk-toast, .pm-scene')) continue;
      const cs = getComputedStyle(el); const w = SIDES.map((s) => cs['border' + s + 'Width']);
      if (new Set(w).size > 1) {
        for (const s of SIDES) if (cs['border' + s + 'Width'] !== '0px' && cs['border' + s + 'Color'] !== 'rgba(0, 0, 0, 0)' && cs['border' + s + 'Color'] !== hair) bad(`${t}: ${el.className || el.tagName} has a coloured edge on one side (${s})`);
      }
    }
  }

  // The three sizes, the surface, the title, the close, the foot.
  { const d = get('Dialogs, three sizes'); const wide = d.defaultView.innerWidth >= 960;
    const [c, f, w] = [...d.querySelectorAll('.sdk-dialog')];
    const iw = d.defaultView.innerWidth;
    for (const [el, want, nm] of [[c, 360, 'confirm'], [f, 560, 'form'], [w, 880, 'browse']]) { const got = el.getBoundingClientRect().width; if (wide ? !near(got, want, 1) : got > want + 1 || got > iw) bad(`the ${nm} dialog is ${got}px wide, expected ${want}`); }
    const panel = tok(d, 'var(--bg-section)', 'backgroundColor');
    for (const el of [c, f, w]) { const cs = getComputedStyle(el);
      if (cs.backgroundColor !== panel) bad(`a dialog surface is ${cs.backgroundColor}, not --bg-section`);
      if (cs.borderTopWidth !== '1px' || cs.borderTopColor !== tok(d, 'var(--border)')) bad('a dialog has no 1px --border hairline');
      if (cs.borderTopLeftRadius !== getComputedStyle(d.querySelector('.ds-proposed')).getPropertyValue('--radius-large').trim()) bad(`a dialog corner is ${cs.borderTopLeftRadius}, not --radius-large`);
      if (!/0px 4px 16px 0px/.test(cs.boxShadow)) bad(`a dialog shadow is ${cs.boxShadow}, not 0 4px 16px`);
      const title = el.querySelector('.sdk-dialog-title'); const tc = getComputedStyle(title);
      if (tc.fontSize !== '18px' || tc.fontWeight !== '600') bad(`a dialog title is ${tc.fontSize} at ${tc.fontWeight}, not 18px at 600`);
      if (/Fraunces/i.test(tc.fontFamily)) bad('a dialog title is in Fraunces');
      if (d.querySelector('.ds-proposed').dataset.font === 'proposed' && !/Figtree/.test(tc.fontFamily)) bad(`a dialog title is not Figtree (${tc.fontFamily})`);
      const foot = el.querySelector('.sdk-dialog-foot'); const fc = getComputedStyle(foot);
      if (fc.justifyContent !== 'flex-end' || fc.borderTopWidth !== '1px') bad('a footer is not right-aligned under a 1px hairline');
      const btns = [...foot.querySelectorAll('.btn')]; const last = btns[btns.length - 1];
      if (!last || !/btn-primary|btn-danger/.test(last.className)) bad('the last button of a footer is not the Primary (or the Danger)');
      const rr = el.getBoundingClientRect(); const cb = el.querySelector('.sdk-dialog-close').getBoundingClientRect();
      if (!near(cb.width, 30) || !near(cb.height, 30)) bad(`a close is ${cb.width} by ${cb.height}px, not 30`);
      const rightWant = el.ownerDocument.defaultView.innerWidth <= 640 ? 9 : 17; /* the glyph sits the dialog's side padding from the edge: the close box hangs 8px into it */
      if (!near(cb.top - rr.top, 17) || !near(rr.right - cb.right, rightWant)) bad(`a close is ${cb.top - rr.top}px from the top and ${rr.right - cb.right}px from the right, expected 17 and ${rightWant}`);
      if (getComputedStyle(el.querySelector('.sdk-dialog-close')).backgroundColor !== 'rgba(0, 0, 0, 0)') bad('the close has a fill at rest (it is Quiet)');
    }
    if (!/btn-danger/.test(c.querySelector('.sdk-dialog-foot .btn:last-child').className) || /solid/.test(c.querySelector('.sdk-dialog-foot .btn:last-child').className)) bad('the destructive confirm does not end with the soft Danger');
  }

  // States: scrolling keeps the head and the foot and gets a hairline; the discard row replaces the foot; loading and error.
  { const d = get('Dialogs, states'); const ds = [...d.querySelectorAll('.sdk-dialog')]; if (ds.length !== 5) bad(`the states frame has ${ds.length} dialogs, expected 5`);
    const sc2 = d.querySelector('#dl-scroll-t').closest('.sdk-dialog'); const body = sc2.querySelector('.sdk-dialog-body');
    await wait(150);
    if (!(body.scrollHeight > body.clientHeight + 10) || getComputedStyle(body).overflowY !== 'auto') bad('the scrolling example does not scroll in its body');
    if (body.scrollTop <= 0) bad('the scrolling example is not scrolled');
    const hb = getComputedStyle(sc2.querySelector('.sdk-dialog-head')); if (hb.borderBottomColor === 'rgba(0, 0, 0, 0)') bad('the head has no hairline once the body has scrolled');
    const rest = getComputedStyle(ds[0].querySelector('.sdk-dialog-head')); if (rest.borderBottomColor !== 'rgba(0, 0, 0, 0)') bad('the head of an unscrolled dialog has a hairline');
    const hr = sc2.querySelector('.sdk-dialog-head').getBoundingClientRect(); const fr = sc2.querySelector('.sdk-dialog-foot').getBoundingClientRect(); const sr = sc2.getBoundingClientRect();
    if (!near(hr.top - sr.top, 1) || !near(sr.bottom - fr.bottom, 1)) bad('the head and the foot do not stay at the top and bottom of a scrolling dialog');
    const dirty = ds[1]; if (dirty.querySelector('.sdk-dialog-foot').getClientRects().length) bad('the foot shows beside the discard row'); const dr = dirty.querySelector('.sdk-dialog-discard'); if (!dr.getClientRects().length || !/Discard your changes\?/.test(dr.textContent)) bad('the dirty example does not show the discard row');
    const busy = ds[3].querySelector('[aria-busy="true"]'); if (!busy || !busy.querySelector('.fa-spin')) bad('the loading example has no busy Save with a spinner');
    const er = ds[4].querySelector('.sdk-dialog-foot .sdk-form-error'); if (!er) bad('the error example has no error in the footer'); else { const eb = er.getBoundingClientRect(); const bb = ds[4].querySelector('.sdk-dialog-foot .btn').getBoundingClientRect(); if (eb.right > bb.left) bad('the foot error is not at the left of the buttons'); }
  }

  // Confirm kinds.
  { const d = get('Dialogs, confirm'); const k = [...d.querySelectorAll('.sdk-dialog')]; if (k.length !== 3) bad('the confirm frame does not show three kinds');
    k.forEach((el, i) => { const w = el.getBoundingClientRect().width; if (!near(w, 360, 1) && d.defaultView.innerWidth > 1000) bad(`confirm ${i} is ${w}px, expected 360`); if (el.getAttribute('role') !== 'alertdialog' || !el.getAttribute('aria-describedby') || !el.getAttribute('aria-labelledby')) bad(`confirm ${i} lacks role=alertdialog, aria-labelledby or aria-describedby`);
      const btns = [...el.querySelectorAll('.sdk-dialog-foot .btn')]; if (!/^Cancel$/.test(btns[0].textContent.trim()) || /btn-primary|btn-danger/.test(btns[0].className)) bad(`confirm ${i}: Cancel is not first and Secondary`); });
    if (!/btn-primary/.test(k[0].querySelector('.sdk-dialog-foot .btn:last-child').className)) bad('the plain confirm does not end with the Primary');
    const sol = k[2].querySelector('.sdk-dialog-foot .btn:last-child'); if (!/solid/.test(sol.className) || !sol.disabled) bad('the final confirm does not end with a disabled solid Danger');
    const dst = k[1].querySelector('.sdk-dialog-foot .btn:last-child'); if (getComputedStyle(dst).backgroundColor === getComputedStyle(sol).backgroundColor) bad('the soft and the solid Danger are the same fill');
    const d2 = get('Dialogs, two steps'); if (d2.querySelectorAll('.sdk-dialog').length !== 2 || !/Delete data too/.test(d2.body.textContent)) bad('the two-step example is missing');
  }

  // The scrim and the phone.
  { const d = get('Dialogs, in context'); const layer = d.querySelector('.sdk-dialog-layer'); const want = d.defaultView.innerWidth <= 640 ? tok(d, 'var(--bg)', 'backgroundColor') : tok(d, 'var(--scrim)', 'backgroundColor'); if (d.defaultView.innerWidth > 640 && want !== 'rgba(0, 0, 0, 0.55)') bad(`--scrim is ${want}, not black at 55%`);
    if (getComputedStyle(layer).backgroundColor !== want) bad(`the scrim is ${getComputedStyle(layer).backgroundColor}, expected ${want}`);
    const dlg = layer.querySelector('.sdk-dialog'); if (d.defaultView.innerWidth > 640 && !near(dlg.getBoundingClientRect().width, 560, 1)) bad('the form in context is not 560px');
    const p = get('Dialogs, phone'); const dl = p.querySelector('.sdk-dialog'); const cs = getComputedStyle(dl); const iw = p.defaultView.innerWidth; const ih = p.defaultView.innerHeight;
    if (iw !== 390) bad(`the phone frame is ${iw}px`);
    const r = dl.getBoundingClientRect(); if (!near(r.width, iw, 1) || !near(r.height, ih, 1)) bad(`at 390 the dialog is ${r.width} by ${r.height}, not full screen (${iw} by ${ih})`);
    if (cs.borderTopLeftRadius !== '0px' || cs.boxShadow !== 'none' || cs.borderTopWidth !== '0px') bad('at 390 the dialog has a radius, a shadow or an edge');
    const lb = getComputedStyle(p.querySelector('.sdk-dialog-layer')).backgroundColor; if (lb !== tok(p, 'var(--bg)', 'backgroundColor')) bad(`at 390 the backdrop is ${lb}, not opaque --bg`);
    const cb = dl.querySelector('.sdk-dialog-close'); const cr = cb.getBoundingClientRect(); const hit = p.elementFromPoint(cr.left - 5, cr.top + 15); if (!hit || hit.closest('.sdk-dialog-close') !== cb) bad('at 390 the close has no 44px hit area');
    const fb = dl.querySelector('.sdk-dialog-foot .btn'); if (!near(fb.getBoundingClientRect().height, 44)) bad(`at 390 a footer button is ${fb.getBoundingClientRect().height}px, expected 44`);
    const ds = get('Dialogs, stack'); const tz = getComputedStyle(ds.querySelector('.sdk-toasts')).zIndex; const lz = getComputedStyle(ds.querySelector('.sdk-dialog-layer')).zIndex; if (!(Number(tz) > Number(lz))) bad('the toast is not above the dialog in the stack'); if (!ds.querySelector('.sdk-dp') || !ds.querySelector('.sdk-toast')) bad('the stack lacks the popover or the toast');
  }

  // Aliases.
  { const d = get('Dialogs, aliases'); const want = [['.sdk-editor:not(.sdk-editor-large)', '560px'], ['.sdk-editor-large', '880px'], ['.layout-sheet', '560px'], ['.phase-sheet', '880px'], ['.bgpick-card', '880px']];
    const rl = getComputedStyle(d.querySelector('.ds-proposed')).getPropertyValue('--radius-large').trim();
    for (const [s, w] of want) { const el = d.querySelector(s); if (!el) { bad(`aliases: no ${s}`); continue; } const cs = getComputedStyle(el);
      if (cs.getPropertyValue('--dlg-w').trim() !== w) bad(`aliases: ${s} has --dlg-w ${cs.getPropertyValue('--dlg-w').trim()}, expected ${w}`);
      if (cs.borderTopLeftRadius !== rl && d.defaultView.innerWidth > 640) bad(`aliases: ${s} does not take --radius-large`);
      const t = el.querySelector('.sdk-dialog-title, .layout-sheet-title, h2'); const tc = getComputedStyle(t); if (tc.fontSize !== '18px' || tc.fontWeight !== '600' || /Fraunces/i.test(tc.fontFamily)) bad(`aliases: the title of ${s} is ${tc.fontSize} ${tc.fontWeight} ${tc.fontFamily}`);
      const cb = el.querySelector('.sdk-editor-close, .sdk-dialog-close, .phase-sheet-close, .bgpick-close').getBoundingClientRect(); const rr = el.getBoundingClientRect();
      const edge = cs.borderTopWidth === '1px' ? 17 : 16; const edgeR = d.defaultView.innerWidth <= 640 ? edge - 8 : edge; if (!near(cb.width, 30) || !near(cb.top - rr.top, edge) || !near(rr.right - cb.right, edgeR)) bad(`aliases: the close of ${s} is not 30px at 17px from the top and right (${cb.width}, ${cb.top - rr.top}, ${rr.right - cb.right})`); }
    if (d.querySelector('.bgpick') && getComputedStyle(d.querySelector('.bgpick')).backgroundColor === 'rgba(0, 0, 0, 0)') bad('aliases: .bgpick has no scrim');
  }

  // The live demo.
  { const t = get('Dialogs, try it'); const win = t.defaultView; const D = win.__dialogs; if (!D) { bad('the demo has no dialogs'); } else {
    const key = (el, k, o) => el.dispatchEvent(new win.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, o || {})));
    const btn = (k) => t.querySelector(`[data-open="${k}"]`);
    // A clean form: first field has the focus, the page is locked, Escape closes, focus returns.
    const ob = btn('form'); ob.focus(); ob.click(); await wait(120);
    const f = D.form; if (!f.open) bad('the form dialog did not open'); else {
      if (t.activeElement !== f.querySelector('input')) bad('a form does not put the focus in its first field');
      if (t.documentElement.style.overflow !== 'hidden') bad('the page behind a dialog is not scroll-locked');
      if (f.getAttribute('aria-labelledby') !== 'dt-form-t' || !f.matches('[aria-modal="true"]')) bad('a dialog lacks aria-labelledby or aria-modal');
      // Tab trap: from the last control to the first, and Shift+Tab from the first to the last.
      const fo = [...f.querySelectorAll('button, input, select, textarea')].filter((e) => !e.disabled && e.getClientRects().length); fo[fo.length - 1].focus(); key(fo[fo.length - 1], 'Tab'); if (t.activeElement !== fo[0]) bad('Tab from the last control does not go to the first');
      fo[0].focus(); key(fo[0], 'Tab', { shiftKey: true }); if (t.activeElement !== fo[fo.length - 1]) bad('Shift+Tab from the first control does not go to the last');
      fo[0].focus(); key(f, 'Escape'); await wait(400);
      if (f.open) bad('Escape does not close a clean form'); if (t.activeElement !== ob) bad('the focus does not return to the control that opened the dialog'); if (t.documentElement.style.overflow === 'hidden') bad('the page is still locked after the dialog closed');
    }
    // A dirty form: Escape asks, Escape again keeps editing, the backdrop does nothing, Discard closes.
    ob.click(); await wait(120); const inp = f.querySelector('input'); inp.value = 'Changed'; inp.dispatchEvent(new win.Event('input', { bubbles: true }));
    key(f, 'Escape'); await wait(100);
    if (!f.open) bad('Escape closed a dirty form'); const dr = f.querySelector('.sdk-dialog-discard'); if (dr.hidden || !f.querySelector('.sdk-dialog-foot').hidden) bad('Escape on a dirty form does not show the discard row in place of the buttons');
    await wait(60); key(f, 'Escape'); await wait(100); if (!dr.hidden) bad('Escape on the discard row does not keep editing');
    f.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await wait(100); if (!f.open) bad('a click on the backdrop closed a form with edits');
    key(f, 'Escape'); await wait(100); dr.querySelector('.btn-danger').click(); await wait(400); if (f.open) bad('Discard does not close the form'); if (t.activeElement !== ob) bad('the focus does not return after Discard');
    // A clean form closes on the backdrop.
    ob.click(); await wait(120); f.dispatchEvent(new win.MouseEvent('click', { bubbles: true })); await wait(400); if (f.open) bad('a click on the backdrop does not close a clean form');
    // A destructive confirm: Cancel has the focus; Escape cancels.
    const ob2 = btn('destructive'); ob2.focus(); ob2.click(); await wait(120); const c = D.destructive;
    if (!c.open || t.activeElement.textContent.trim() !== 'Cancel') bad('a destructive confirm does not start with the focus on Cancel'); if (c.getAttribute('role') !== 'alertdialog') bad('a confirm is not an alertdialog');
    key(c, 'Escape'); await wait(400); if (c.open) bad('Escape does not cancel a confirm'); if (t.activeElement !== ob2) bad('the focus does not return after a confirm');
    // The final confirm: the button waits for the typed name.
    const ob3 = btn('final'); ob3.click(); await wait(120); const fin = D.final; const ok = fin.querySelector('[data-ok]'); if (!ok.disabled) bad('the final button is on before the name is typed');
    const ty = fin.querySelector('[data-typed]'); ty.value = 'Paris trip'; ty.dispatchEvent(new win.Event('input', { bubbles: true })); if (ok.disabled) bad('the final button stays off after the name is typed');
    key(fin, 'Escape'); await wait(400);
    // The two steps.
    const ob4 = btn('two'); ob4.click(); await wait(120); D.two1.querySelector('[data-ok]').click(); await wait(500); if (!D.two2.open || D.two1.open) bad('the first step does not lead to the second'); if (t.activeElement.textContent.trim() !== 'Keep data') bad('step 2 does not start on the safe choice');
    key(D.two2, 'Escape'); await wait(400); if (t.activeElement !== ob4) bad('after two steps the focus does not return to the opener');
  } }

  // Contrast.
  { const d = get('Dialogs, contrast'); await wait(300); const rows = [...d.querySelectorAll('.pm-ct tbody tr')]; if (rows.length < 8) bad(`the contrast list has only ${rows.length} rows`);
    for (const tr of rows) { const rr = tr.querySelector('[data-out="r"]').textContent; if (!rr) { bad('a contrast row is not worked out'); continue; } if (tr.querySelector('[data-out="p"]').textContent === 'Fails') bad(`contrast under its minimum: ${tr.children[0].textContent} (${rr})`); } }

  // The page.
  const blk = document.getElementById('dialogs');
  if (!blk || !blk.querySelector('.ds-st-approved') || blk.querySelector('.ds-st-proposed')) bad('the Dialogs family is not marked Approved');
  if (!blk || !/Today to proposed/.test(blk.textContent) || !/--shadow-3/.test(blk.textContent) || !/Markup contract/.test(blk.textContent)) bad('the Dialogs family page lacks its Today to proposed table, the --shadow-3 token or its markup contract');
  if (document.getElementById('u-dialogs-and-sheets')) bad('Dialogs and sheets is still listed as Not yet decided');
  return JSON.stringify(out);
};
