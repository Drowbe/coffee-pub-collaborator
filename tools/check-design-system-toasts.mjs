/*
 * check-design-system-toasts.mjs -- the Toasts and banners family of the proposed design system page (public/design-system/proposed-toasts.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a toast not 340px wide (at a wide frame), not the card surface (--bg-card) with the same 1px --border hairline on all four sides (no coloured left bar, no outline),
 * --radius-medium and --shadow-2; four kinds that do not give four different chip tints; a danger toast without role="alert", or another kind without role="status"; a close that is not the
 * quiet 30px icon button; a stack of three that is not 8px apart; on a desktop a stack that is not 16px from the top and right, 340px wide; at 390 a stack that is not at the bottom, 8px
 * in from each side (the width minus 16px); in the live demo: the durations not 4500, 9000 and 60000 ms (note, notice, invite), a fourth toast not waiting (three at most),
 * a toast that is not dismissed when its time is up, one that goes while the pointer or the focus is on it (pause on hover and on focus), one that does not go after the pointer leaves, Escape on the close
 * not closing it; a banner with no tint fill, with an edge, with a different fill from another kind, a full-width banner with a corner or an inline one without --radius-medium, a
 * dismissible banner without a close or a blocking one with a close; an alias (today's class) that does not take the look; a contrast row under its minimum; the family not marked
 * Proposed, or its page naming Toasts and banners as not yet decided. In the stylesheet: a one-sided border, a hex colour, an inset shadow, a font under 11px, a coloured outline, a name
 * that is not defined.
 */
export const id = 'toasts';
export const todayOnly = ['sdk-dialog', 'sdk-dialog-layer', 'sdk-dp', 'ds-force-hover', 'sdk-tabs'];

export function staticChecks({ fail, css, defined }) {
  if (/border-(left|right|top|bottom)(-color|-width|-style)?\s*:/.test(css)) fail('proposed-toasts.css: a rule draws an edge on one side (no coloured bar)');
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-toasts.css: a hard-coded colour (tokens only)');
  if (/box-shadow\s*:\s*inset|inset\s+\d/.test(css)) fail('proposed-toasts.css: an inset shadow (a bar)');
  for (const m of css.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)) if (Number(m[1]) < 11) fail(`proposed-toasts.css: a font size of ${m[1]}px, under 11px`);
  if (!/--toast-w:\s*340px/.test(css) || !/--toast-gap:\s*8px/.test(css) || !/--toast-ms:\s*200ms/.test(css)) fail('proposed-toasts.css: the toast is not 340px, 8px apart and 200ms');
  if (!/--status-danger-fill/.test(css) || !/--status-ok-on-fill/.test(css)) fail('proposed-toasts.css: the status roles are missing');
  if (!/box-shadow:\s*var\(--shadow-2\)/.test(css) || !/background:\s*var\(--bg-card\)/.test(css)) fail('proposed-toasts.css: the toast is not the card surface with --shadow-2');
  for (const c of ['sdk-toasts', 'sdk-toast', 'sdk-toast-icon', 'sdk-toast-body', 'sdk-toast-title', 'sdk-toast-text', 'sdk-toast-actions', 'sdk-toast-end', 'sdk-banner', 'sdk-banner-wide', 'sdk-banner-icon', 'sdk-banner-text', 'sdk-banner-action', 'sdk-banner-close',
    'toast-layer', 'toast', 'toast-icon', 'toast-text', 'toast-body', 'toast-invite', 'toast-actions', 'env-banner', 'env-page-banner', 'conflict-bar', 'template-notices', 'option-help']) if (!defined.has(c)) fail(`the proposed stylesheets do not define the toasts name .${c} (a new name or a kept alias)`);
}

export async function browserChecks(b) {
  const { ev, sc, where, problems } = b;
  const r = JSON.parse(await ev(`(${toastsProbe.toString()})(${JSON.stringify({ width: sc.width, mode: sc.mode })})`));
  for (const x of r.problems) problems.push(`${where}: ${x}`);
}

const toastsProbe = async (ctx) => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const near = (a, b, e = 0.6) => Math.abs(a - b) <= e;
  const tok = (d, n, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = n; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^Toasts/.test(t) && !/contrast/.test(t));
  if (TITLES.length < 14) bad(`the Toasts family has only ${TITLES.length} frames`);
  const SIDES = ['Top', 'Right', 'Bottom', 'Left'];
  await wait(300); // the entering transition

  // No toast or banner with an edge on one side or an outline; no tinted edge.
  for (const t of TITLES) { const d = get(t); if (!d) { bad(`no frame ${t}`); continue; }
    for (const el of d.querySelectorAll('.sdk-toast, .toast, .sdk-banner, .env-banner, .env-page-banner, .conflict-bar')) { const cs = getComputedStyle(el); const w = SIDES.map((s) => cs['border' + s + 'Width']); const c = SIDES.map((s) => cs['border' + s + 'Color']);
      if (new Set(w).size > 1 || new Set(c).size > 1) bad(`${t}: ${el.className} has edges that differ (${w.join(' ')}; ${c.join(' ')}): no coloured bar`); if (cs.outlineStyle !== 'none' && cs.outlineWidth !== '0px') bad(`${t}: ${el.className} has an outline`); }
  }

  // The toast.
  { const d = get('Toasts, kinds'); const ts = [...d.querySelectorAll('.sdk-toast')]; if (ts.length !== 4) bad('the kinds frame does not show four toasts');
    const card = tok(d, 'var(--bg-card)', 'backgroundColor'); const rm = getComputedStyle(d.querySelector('.ds-proposed')).getPropertyValue('--radius-medium').trim(); const hair = tok(d, 'var(--border)');
    const tints = new Set();
    for (const t of ts) { const cs = getComputedStyle(t); if (d.defaultView.innerWidth > 800 && !near(t.getBoundingClientRect().width, 340, 1)) bad(`a toast is ${t.getBoundingClientRect().width}px wide, expected 340`);
      if (cs.backgroundColor !== card) bad(`a toast is ${cs.backgroundColor}, not --bg-card`); if (cs.borderTopWidth !== '1px' || cs.borderTopColor !== hair) bad('a toast has no 1px --border hairline');
      if (cs.borderTopLeftRadius !== rm) bad('a toast corner is not --radius-medium'); if (!/0px 4px 12px/.test(cs.boxShadow)) bad(`a toast shadow is ${cs.boxShadow}, not --shadow-2`);
      const role = t.getAttribute('role'); if (t.dataset.kind === 'danger' ? role !== 'alert' : role !== 'status') bad(`a ${t.dataset.kind} toast has role ${role}`);
      const chip = t.querySelector('.sdk-toast-icon'); tints.add(getComputedStyle(chip).backgroundColor); const cc = chip.getBoundingClientRect(); if (!near(cc.width, 28) || !near(cc.height, 28)) bad('the icon chip is not 28px');
      const cl = t.querySelector('.sdk-icon-btn'); if (!near(cl.getBoundingClientRect().width, 30) || !near(cl.getBoundingClientRect().height, 30)) bad('the toast close is not 30px'); if (getComputedStyle(cl).backgroundColor !== 'rgba(0, 0, 0, 0)') bad('the toast close has a fill at rest');
      if (t.querySelector('.sdk-toast-title') && getComputedStyle(t.querySelector('.sdk-toast-title')).fontWeight !== '600') bad('a toast title is not weight 600'); }
    if (tints.size !== 4) bad(`the four kinds give ${tints.size} chip tints, expected 4`);
    const f = get('Toasts, note notice invite'); const inv = f.querySelector('.sdk-toast-actions'); if (!inv || !/Join/.test(inv.textContent) || !/Decline/.test(inv.textContent) || !inv.querySelector('.btn-primary')) bad('the invite has no Join (Primary) and Decline'); const ds = [...f.querySelectorAll('.sdk-toast')].map((x) => x.dataset.duration); for (const want of ['4500', '9000', '60000']) if (!ds.includes(want)) bad(`no toast drawn with the ${want} ms life`);
    const s = get('Toasts, stack'); const col = [...s.querySelectorAll('.pm-col > .sdk-toast')]; if (col.length !== 3) bad('the stack does not show three toasts'); else for (let i = 1; i < 3; i += 1) { const gap = col[i].getBoundingClientRect().top - col[i - 1].getBoundingClientRect().bottom; if (!near(gap, 8)) bad(`the stack gap is ${gap}px, expected 8`); }
  }

  // Position.
  { const dd = get('Toasts, desktop position'); const st = dd.querySelector('.pm-stage').getBoundingClientRect(); const sk = dd.querySelector('.sdk-toasts').getBoundingClientRect();
    if (dd.defaultView.innerWidth > 640 && (!near(sk.top - st.top, 16) || !near(st.right - sk.right, 16) || !near(sk.width, 340, 1))) bad(`desktop stack is ${sk.top - st.top}px from the top, ${st.right - sk.right}px from the right, ${sk.width}px wide; expected 16, 16, 340`);
    const pp = get('Toasts, phone position'); const ps = pp.querySelector('.pm-stage').getBoundingClientRect(); const pk = pp.querySelector('.sdk-toasts').getBoundingClientRect(); const first = pp.querySelectorAll('.sdk-toasts > .sdk-toast');
    if (pp.defaultView.innerWidth <= 640) { if (!near(ps.bottom - pk.bottom, 8) || !near(pk.left - ps.left, 8) || !near(ps.right - pk.right, 8)) bad(`phone stack is ${ps.bottom - pk.bottom}px from the bottom and ${pk.left - ps.left}/${ps.right - pk.right}px from the sides; expected 8`); if (!near(first[0].getBoundingClientRect().width, ps.width - 16, 1)) bad('at 390 a toast is not the stage width minus 16px'); if (first[0].getBoundingClientRect().top < first[1].getBoundingClientRect().top) bad('on a phone the newest is not at the bottom'); }
  }

  // The live stack: durations, the cap of three, the pause, the close.
  { const t = get('Toasts, try it'); const win = t.defaultView; const T = win.__toast; if (!T) bad('the demo has no toast script'); else {
    const click = (k) => t.querySelector(`[data-show="${k}"]`).click(); const live = () => [...T.stack.children].filter((e) => e.dataset.state !== 'leaving');
    win.__toastScale = 0.04; // 4500 -> 180ms, 9000 -> 360ms, 60000 -> 2400ms
    click('note'); click('notice'); click('invite'); click('danger'); await wait(30);
    const durs = live().map((e) => e.dataset.duration); for (const want of ['4500', '9000', '60000']) if (!durs.includes(want)) bad(`the demo has no toast of ${want} ms`);
    if (live().length !== 3 || T.queue.length !== 1) bad(`a fourth toast does not wait (${live().length} showing, ${T.queue.length} waiting)`);
    if (live().some((e) => e.dataset.kind === 'danger')) bad('the waiting danger toast showed early');
    await wait(450); // the note (180ms) and the notice (360ms) are over; the invite waits
    if (live().some((e) => e.dataset.duration === '4500')) bad('a note is not dismissed after its time');
    if (!T.stack.querySelector('[role="alert"]')) bad('the danger toast did not come in when a place was free, or has no role=alert');
    // Pause on hover and on focus.
    for (const el of [...T.stack.children]) el.remove(); T.queue.length = 0;
    click('note'); const n = live()[0]; n.dispatchEvent(new win.MouseEvent('mouseenter')); await wait(400); if (!n.isConnected || n.dataset.paused !== 'true') bad('a toast does not wait while the pointer is on it');
    n.dispatchEvent(new win.MouseEvent('mouseleave')); for (let i = 0; i < 20 && n.isConnected; i += 1) await wait(150); /* its 180ms demo time, then it goes; a busy page (hundreds of frames) can run a timer late, so wait up to 3s */ if (n.isConnected) bad('a toast does not go after the pointer leaves');
    click('note'); const m = live()[0]; m.querySelector('.sdk-icon-btn').focus(); await wait(400); if (!m.isConnected || m.dataset.paused !== 'true') bad('a toast does not wait while the focus is inside it');
    m.querySelector('.sdk-icon-btn').blur(); await wait(500); if (m.isConnected) bad('a toast does not go after the focus leaves');
    win.__toastScale = 1; click('note'); const k = live()[0]; k.querySelector('.sdk-icon-btn').dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); await wait(300); if (k.isConnected) bad('Escape on the close does not close the toast');
    click('undo'); const u = live()[0]; if (!u.querySelector('.btn-quiet')) bad('the Undo toast has no Quiet Undo'); u.querySelector('.sdk-icon-btn').click(); await wait(300);
  } }

  // Banners.
  { const d = get('Toasts, banners'); const bs = [...d.querySelectorAll('.sdk-banner')]; if (bs.length !== 4) bad('the banners frame does not show four'); const fills = new Set(); const rm = getComputedStyle(d.querySelector('.ds-proposed')).getPropertyValue('--radius-medium').trim();
    for (const x of bs) { const cs = getComputedStyle(x); fills.add(cs.backgroundColor); if (cs.backgroundColor === 'rgba(0, 0, 0, 0)') bad('a banner has no tint fill'); if (cs.borderTopWidth !== '0px') bad('a banner has an edge'); if (cs.borderTopLeftRadius !== rm) bad('an inline banner corner is not --radius-medium'); if (!x.querySelector('.sdk-banner-icon')) bad('a banner has no icon'); }
    if (fills.size !== 4) bad(`the four banner kinds give ${fills.size} fills`);
    const p = get('Toasts, banner parts'); const all = [...p.querySelectorAll('.sdk-banner')]; if (!all.some((x) => x.querySelector('.sdk-banner-close')) || !all.some((x) => x.dataset.kind === 'danger' && !x.querySelector('.sdk-banner-close'))) bad('banners: a dismissible one has no close, or the blocking one has');
    const w = get('Toasts, banners full width'); for (const x of w.querySelectorAll('.sdk-banner-wide')) { if (getComputedStyle(x).borderTopLeftRadius !== '0px') bad('a full-width banner has a corner'); if (w.defaultView.innerWidth > 700 && x.getBoundingClientRect().width < w.documentElement.clientWidth - 40) bad('a full-width banner is not the width of the page'); }
    const a = get('Toasts, aliases'); const rd = (s) => { const el = a.querySelector(s); if (!el) { bad(`aliases: no ${s}`); return null; } return getComputedStyle(el); };
    const t1 = rd('.toast'); if (t1 && (t1.backgroundColor !== tok(a, 'var(--bg-card)', 'backgroundColor') || t1.borderLeftWidth !== '1px')) bad('aliases: .toast is not the toast');
    const ev1 = rd('.env-banner'), cb = rd('.conflict-bar'), oh = rd('.option-help[data-kind]'), tn = rd('.template-notices > li'), ep = rd('.env-page-banner');
    for (const [nm, c] of [['.env-banner', ev1], ['.conflict-bar', cb], ['.option-help', oh], ['.template-notices li', tn], ['.env-page-banner', ep]]) if (c && (c.backgroundColor === 'rgba(0, 0, 0, 0)' || c.borderTopWidth !== '0px')) bad(`aliases: ${nm} has no tint fill or has an edge`);
    if (ev1 && cb && ev1.backgroundColor === cb.backgroundColor) bad('aliases: .env-banner (danger) and .conflict-bar (warn) have the same fill'); if (ep && ep.borderTopLeftRadius !== '0px') bad('aliases: .env-page-banner has a corner');
  }

  // Contrast.
  { const d = get('Toasts, contrast'); await wait(300); const rows = [...d.querySelectorAll('.pm-ct tbody tr')]; if (rows.length < 18) bad(`the contrast list has only ${rows.length} rows`);
    for (const tr of rows) { const rr = tr.querySelector('[data-out="r"]').textContent; if (!rr) { bad('a contrast row is not worked out'); continue; } if (tr.querySelector('[data-out="p"]').textContent === 'Fails') bad(`contrast under its minimum: ${tr.children[0].textContent} (${rr})`); } }

  // The page.
  const blk = document.getElementById('toasts');
  if (!blk || !blk.querySelector('.ds-st-proposed') || blk.querySelector('.ds-st-approved')) bad('the Toasts family is not marked Proposed');
  if (!blk || !/Today to proposed/.test(blk.textContent) || !/Markup contract/.test(blk.textContent) || !/Maps/.test(blk.textContent)) bad('the Toasts page lacks its Today to proposed table (with Maps) or its markup contract');
  if (document.getElementById('u-toasts-and-banners')) bad('Toasts and banners is still listed as Not yet decided');
  return JSON.stringify(out);
};
