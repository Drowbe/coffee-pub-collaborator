/* The Toasts and banners family (proposed): one toast (a small card that floats and goes away) and one banner (a tint fill with an icon, in two sizes), in four kinds.
   Loaded by proposed.html through proposed-families.json, after proposed.js (the page engine); it registers one family through window.DS_PROPOSED.families.push and
   draws it with the rules in proposed-toasts.css. Nothing here is a style of the product: markup, words, tables and one working demo. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules (.pm-row, .pm-role ...), from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // The example-page rules of this family's frames only (the layout of the examples; nothing of the component).
  const TB_CSS = `
.pm-grid { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 16px 24px; }
.pm-cell { display: flex; flex-direction: column; gap: 4px; min-width: 0; max-width: 100%; }
.pm-cell > small, .pm-cap { color: var(--text-dim); font-size: var(--text-11); font-weight: 700; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-cap { margin: 0 0 8px; }
.pm-line { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 24px; padding: 8px 0; }
.pm-col { display: flex; flex-direction: column; gap: 8px; min-width: 0; }
.pm-zoom { zoom: 2; display: block; padding: 8px 4px; }
.pm-page { padding: 16px; border-radius: var(--radius-medium); background: var(--bg); }
.pm-sect { padding: 16px; border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-stage { position: relative; overflow: hidden; box-sizing: border-box; border-radius: var(--radius-medium); background: var(--bg); }
.pm-stage .sdk-toasts, .pm-stage .toast-layer { position: absolute; }
.pm-stage-pad { padding: 16px; }
.pm-stage-pad p { margin: 0 0 12px; padding: 12px; border-radius: var(--radius-medium); background: var(--bg-section); color: var(--text-dim); }
.pm-obj { padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-obj + .pm-obj { margin-top: 8px; }
.pm-obj b { display: block; font-size: 14px; }
.pm-obj span { color: var(--text-dim); font-size: 12px; }
.pm-log { margin: 8px 0 0; color: var(--text-dim); font-size: 12px; min-height: 18px; }
.pm-ct { width: 100%; border-collapse: collapse; font-size: 12px; }
.pm-ct th { padding: 4px 8px 4px 0; color: var(--text-dim); font-size: var(--text-11); letter-spacing: 0.08em; text-align: left; text-transform: uppercase; }
.pm-ct td { padding: 4px 8px 4px 0; border-top: 1px solid var(--border); vertical-align: top; }
.pm-ct .pm-n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.pm-pass { color: var(--ok); font-weight: 700; } .pm-fail { color: var(--danger-text); font-weight: 700; }
.pm-wide-list .sdk-banner-wide { margin: 0; }
.pm-bar2 { display: flex; flex-wrap: wrap; gap: 8px; }`;

  const ICON = { info: 'circle-info', ok: 'check', warn: 'triangle-exclamation', danger: 'circle-exclamation' };
  const WORD = { info: 'Information', ok: 'Done', warn: 'Warning', danger: 'Error' };
  const CLOSE = (cls) => `<button type="button" class="sdk-icon-btn btn-quiet btn-small ${cls || ''}" aria-label="Close">${fa('xmark')}</button>`;

  // ---- builders ----
  // One toast. o: kind, title, text, undo, close (default true), invite, state (leaving), force (a forced state class on the close), id.
  const T = (o = {}) => {
    const kind = o.kind || 'info';
    const end = `${o.undo ? '<button type="button" class="btn btn-quiet btn-small">Undo</button>' : ''}${o.close === false ? '' : CLOSE(o.force || '')}`;
    return `<div class="sdk-toast" data-kind="${kind}" role="${kind === 'danger' ? 'alert' : 'status'}"${o.state ? ` data-state="${o.state}"` : ''}${o.ms ? ` data-duration="${o.ms}"` : ''}${o.id ? ` id="${o.id}"` : ''}>
      <span class="sdk-toast-icon" aria-hidden="true">${fa(o.icon || ICON[kind])}</span>
      <div class="sdk-toast-body"><span class="sdk-toast-title">${o.title}</span>${o.text ? `<span class="sdk-toast-text">${o.text}</span>` : ''}</div>
      <div class="sdk-toast-end">${end}</div>
      ${o.invite ? '<div class="sdk-toast-actions"><button type="button" class="btn btn-primary btn-small">Join</button><button type="button" class="btn btn-small">Decline</button></div>' : ''}
    </div>`;
  };
  // One banner. o: kind, text (HTML), action, close, wide, title.
  const B = (o = {}) => `<div class="sdk-banner${o.wide ? ' sdk-banner-wide' : ''}" data-kind="${o.kind || 'info'}" role="${o.kind === 'danger' ? 'alert' : 'status'}">
      <span class="sdk-banner-icon" aria-hidden="true">${fa(ICON[o.kind || 'info'])}</span>
      <span class="sdk-banner-text">${o.title ? `<b>${o.title}</b> ` : ''}${o.text}</span>
      ${o.action ? `<button type="button" class="btn btn-small sdk-banner-action">${o.action}</button>` : ''}
      ${o.close ? CLOSE('sdk-banner-close') : ''}</div>`;
  const CELL = (cap, body, w) => `<div class="pm-cell"${w ? ` style="width:${w}px"` : ''}><small>${cap}</small>${body}</div>`;
  const KINDS = ['info', 'ok', 'warn', 'danger'];
  const SAMPLE = {
    info: ['Sam joined the call', 'Sam is in the Paris trip.'],
    ok: ['Plan saved', 'Everyone can see the new dates.'],
    warn: ['Offline for a moment', 'Changes are kept and sent when you are back.'],
    danger: ['Could not save', 'The server did not answer. Try again.'],
  };
  const BANNER_TEXT = {
    info: 'This is a copy of the Paris template. Change anything you like.',
    ok: 'Your changes are saved and shared.',
    warn: 'Two places overlap on Friday at 14:00.',
    danger: 'This environment is paused. Ask an owner to turn it back on.',
  };

  // ---- anatomy ----
  const zoomBody = () => `<div class="ds-proposed"><div class="pm-zoom">${T({ kind: 'ok', title: 'Plan saved', text: 'Everyone can see the new dates.', undo: true })}</div></div>`;

  // ---- kinds ----
  const kindsBody = () => `<div class="ds-proposed"><div class="pm-grid">${KINDS.map((k) => CELL(`${k} (${WORD[k]})`, T({ kind: k, title: SAMPLE[k][0], text: SAMPLE[k][1] }), 340)).join('')}</div></div>`;
  const formsBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('Note: title only, 4.5 s', T({ kind: 'ok', title: 'Copied to the clipboard', ms: 4500 }), 340)}
    ${CELL('Note with Undo, 4.5 s', T({ kind: 'info', title: 'Place removed', text: 'Louvre museum is gone from Friday.', undo: true, ms: 4500 }), 340)}
    ${CELL('Notice: a title and a line, 9 s', T({ kind: 'warn', title: 'Offline for a moment', text: 'Changes are kept and sent when you are back.', ms: 9000 }), 340)}
    ${CELL('Invite: Join and Decline, 60 s', T({ kind: 'info', icon: 'video', title: 'Sam invites you to a call', text: 'Paris trip, the Louvre.', invite: true, ms: 60000 }), 340)}
    ${CELL('Danger: role=alert, 9 s', T({ kind: 'danger', title: 'Could not save', text: 'The server did not answer. Try again.', ms: 9000 }), 340)}
    ${CELL('No close (a short note)', T({ kind: 'ok', title: 'Saved', close: false, ms: 4500 }), 340)}
  </div></div>`;

  // ---- states ----
  const statesBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('Rest', T({ kind: 'ok', title: 'Plan saved', text: 'Everyone can see the new dates.', undo: true }), 340)}
    ${CELL('Hover or focus: the timer waits', T({ kind: 'ok', title: 'Plan saved', text: 'Everyone can see the new dates.', undo: true, force: 'ds-force-hover' }), 340)}
    ${CELL('Focus on the close button', T({ kind: 'ok', title: 'Plan saved', text: 'Everyone can see the new dates.', force: 'ds-force-focus' }), 340)}
    ${CELL('Leaving: 200 ms ease-out, then gone', T({ kind: 'ok', title: 'Plan saved', text: 'Everyone can see the new dates.', state: 'leaving' }), 340)}
  </div></div>`;

  // ---- the stack ----
  const stackBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('Three at once, 8px apart, newest on top', `<div class="pm-col" style="width:340px">${T({ kind: 'info', title: 'Sam joined the call' })}${T({ kind: 'ok', title: 'Plan saved', text: 'Everyone can see the new dates.', undo: true })}${T({ kind: 'warn', title: 'Offline for a moment', text: 'Changes are kept and sent when you are back.' })}</div>`)}
    <div class="pm-cell" style="width:300px"><small>A fourth waits</small><p class="pm-cap" style="margin:0;letter-spacing:normal;text-transform:none;font-weight:400;font-size:13px;line-height:18px">When three are showing, the next one waits in line and appears when one goes. The ones showing are never pushed off the screen.</p></div>
  </div></div>`;

  // ---- try it: a real stack in a stage (timers, pause on hover and focus, the cap of three) ----
  const tryBody = () => `<div class="ds-proposed"><div class="pm-stage" style="height:340px"><div class="pm-stage-pad">
    <div class="pm-bar2" role="group" aria-label="Show a toast">
      <button type="button" class="btn btn-small" data-show="note">Note, 4.5 s</button>
      <button type="button" class="btn btn-small" data-show="undo">Note with Undo</button>
      <button type="button" class="btn btn-small" data-show="notice">Notice, 9 s</button>
      <button type="button" class="btn btn-small" data-show="invite">Invite, 60 s</button>
      <button type="button" class="btn btn-small" data-show="danger">Danger</button>
      <button type="button" class="btn btn-small" data-show="four">Four at once</button>
    </div>
    <p class="pm-log" data-log role="status" aria-live="polite">Press a button. Hold the pointer over a toast, or tab into it, and its timer waits.</p>
  </div><div class="sdk-toasts" data-stack aria-label="Notifications"></div></div></div>`;
  const tryDemo = (doc) => {
    const win = doc.defaultView;
    const stack = doc.querySelector('[data-stack]');
    const log = doc.querySelector('[data-log]');
    const queue = [];
    win.__toastScale = 1; // the checks set this to run the 4.5 s, 9 s and 60 s clocks fast
    const FORMS = {
      note: { kind: 'ok', title: 'Copied to the clipboard', ms: 4500 },
      undo: { kind: 'info', title: 'Place removed', text: 'Louvre museum is gone from Friday.', undo: true, ms: 4500 },
      notice: { kind: 'warn', title: 'Offline for a moment', text: 'Changes are kept and sent when you are back.', ms: 9000 },
      invite: { kind: 'info', icon: 'video', title: 'Sam invites you to a call', text: 'Paris trip, the Louvre.', invite: true, ms: 60000 },
      danger: { kind: 'danger', title: 'Could not save', text: 'The server did not answer. Try again.', ms: 9000 },
    };
    const say = (t) => { log.textContent = t; };
    const place = (spec) => {
      const wrap = doc.createElement('div'); wrap.innerHTML = T(spec).trim();
      const el = wrap.firstElementChild;
      const t = { el, total: spec.ms * win.__toastScale, left: spec.ms * win.__toastScale, started: 0, timer: 0, held: false, ms: spec.ms };
      const start = () => { if (t.held || t.gone) return; t.started = Date.now(); clearTimeout(t.timer); t.timer = setTimeout(() => close(t), t.left); el.dataset.paused = 'false'; };
      const hold = () => { if (t.gone) return; t.held = true; if (t.started) { t.left = Math.max(0, t.left - (Date.now() - t.started)); t.started = 0; } clearTimeout(t.timer); el.dataset.paused = 'true'; };
      el.addEventListener('mouseenter', hold);
      el.addEventListener('mouseleave', () => { if (!el.matches(':focus-within')) { t.held = false; start(); } });
      el.addEventListener('focusin', hold);
      el.addEventListener('focusout', () => { if (!el.matches(':hover') && !el.contains(doc.activeElement)) { t.held = false; start(); } });
      el.addEventListener('click', (e) => { if (e.target.closest('.sdk-icon-btn, .btn')) close(t); });
      el.querySelector('.sdk-toast-end .sdk-icon-btn')?.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(t); });
      t.start = start;
      stack.prepend(el);
      start();
      return t;
    };
    const close = (t) => {
      if (t.gone) return;
      t.gone = true; clearTimeout(t.timer);
      t.el.dataset.state = 'leaving';
      setTimeout(() => { t.el.remove(); const next = queue.shift(); if (next) place(next); }, 200);
    };
    const show = (spec) => {
      const visible = [...stack.children].filter((e) => e.dataset.state !== 'leaving').length;
      if (visible >= 3) { queue.push(spec); say(`${visible} showing: this one waits (${queue.length} in line).`); return null; }
      say(`Showing a ${spec.ms === 4500 ? 'note' : spec.ms === 9000 ? 'notice' : 'invite'} for ${spec.ms / 1000} seconds.`);
      return place(spec);
    };
    win.__toast = { show, queue, stack, say };
    doc.addEventListener('click', (e) => {
      const b = e.target.closest('[data-show]'); if (!b) return;
      const k = b.dataset.show;
      if (k === 'four') { for (const f of ['note', 'notice', 'undo', 'danger']) show(FORMS[f]); return; }
      show(FORMS[k]);
    });
  };

  // ---- the banner ----
  const bannerKindsBody = () => `<div class="ds-proposed"><div class="pm-grid">${KINDS.map((k) => CELL(k, `<div style="width:420px;max-width:100%">${B({ kind: k, text: BANNER_TEXT[k], action: k === 'warn' ? 'Review' : '', close: k !== 'danger' })}</div>`)).join('')}</div></div>`;
  const bannerParts = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('Text only', `<div style="width:420px;max-width:100%">${B({ kind: 'info', text: 'Prices are in euros.' })}</div>`)}
    ${CELL('With a bold lead and an action', `<div style="width:420px;max-width:100%">${B({ kind: 'warn', title: 'Conflict.', text: 'Dinner and the train overlap.', action: 'Move dinner' })}</div>`)}
    ${CELL('Dismissible (it does not block)', `<div style="width:420px;max-width:100%">${B({ kind: 'ok', text: 'Your changes are saved and shared.', close: true })}</div>`)}
    ${CELL('Blocking: no close (it stays until fixed)', `<div style="width:420px;max-width:100%">${B({ kind: 'danger', text: 'This environment is paused. Ask an owner to turn it back on.' })}</div>`)}
    ${CELL('Two lines of text', `<div style="width:300px;max-width:100%">${B({ kind: 'warn', text: 'Two places overlap on Friday at 14:00. Move one of them, or keep both.', action: 'Review', close: true })}</div>`)}
  </div></div>`;
  const bannerWideBody = () => `<div class="ds-proposed"><div class="pm-col pm-wide-list">${KINDS.map((k) => B({ kind: k, wide: true, text: BANNER_TEXT[k], close: k !== 'danger' })).join('')}</div></div>`;

  // ---- positions: desktop (top right) and phone (bottom) ----
  const stageScene = () => `<div class="pm-stage-pad"><p>Dinner at Le Comptoir, tomorrow 19:30</p><p>Train to Lyon, Friday 08:12</p><p>Louvre museum, Saturday 10:00</p></div>`;
  const posDesktopBody = () => `<div class="ds-proposed"><div class="pm-stage" style="height:340px">${stageScene()}<div class="sdk-toasts" aria-label="Notifications">${T({ kind: 'info', title: 'Sam joined the call' })}${T({ kind: 'ok', title: 'Plan saved', text: 'Everyone can see the new dates.', undo: true })}</div></div></div>`;
  const posPhoneBody = () => `<div class="ds-proposed"><p class="pm-cap">390 wide: at the bottom, 8px in from each side (the page width minus 16px), newest at the bottom</p><div class="pm-stage" style="height:520px">${stageScene()}<div class="sdk-toasts" aria-label="Notifications">${T({ kind: 'ok', title: 'Plan saved', text: 'Everyone can see the new dates.', undo: true })}${T({ kind: 'info', title: 'Sam joined the call' })}</div></div></div>`;

  // ---- in context: a page with a page banner, an inline banner in a form and a toast ----
  const ctxBody = (w) => `<div class="ds-proposed"><div class="pm-stage" style="height:${w <= 640 ? 460 : 400}px">
    ${B({ kind: 'danger', wide: true, text: 'This is a test environment. Nothing you do here is kept.', close: false })}
    <div class="pm-stage-pad" style="padding-top:12px">
      <div class="pm-obj"><b>Louvre museum</b><span>Saturday 10:00 to 12:00</span></div>
      <div class="pm-obj" style="margin-bottom:10px"><b>Dinner at Le Comptoir</b><span>Saturday 11:30 · 4 people</span></div>
      ${B({ kind: 'warn', text: 'These two places overlap at 11:30.', action: 'Review', close: true })}
    </div>
    <div class="sdk-toasts" aria-label="Notifications"${w <= 640 ? '' : ' style="top:80px"'}>${T({ kind: 'ok', title: 'Plan saved', text: 'Everyone can see the new dates.', undo: true })}</div></div></div>`;

  // ---- aliases: today's markup takes the look ----
  const aliasBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('.toast (with .toast-icon, .toast-text, .toast-body)', `<div class="toast" role="status"><i class="fa-solid fa-bell toast-icon" aria-hidden="true"></i><span class="toast-text"><b>Sam</b><span class="toast-body">Added the Louvre to Saturday.</span></span></div>`, 340)}
    ${CELL('.toast.toast-invite (with .toast-actions)', `<div class="toast toast-invite" role="status"><i class="fa-solid fa-video toast-icon" aria-hidden="true"></i><span class="toast-text"><b>Sam invites you to a call</b><span class="toast-body">Paris trip</span><span class="toast-actions"><button type="button" class="btn btn-primary btn-small">Join</button><button type="button" class="btn btn-small">Decline</button></span></span></div>`, 340)}
    ${CELL('.env-banner (danger by default)', `<div class="env-banner" role="status"><span>This environment is a test copy.</span></div>`, 420)}
    ${CELL('.conflict-bar (warn by default)', `<div class="conflict-bar" role="status"><span>Dinner and the train overlap.</span><button type="button" class="btn btn-small">Move dinner</button></div>`, 420)}
    ${CELL('.option-help with data-kind="info"', `<div class="option-help" data-kind="info"><span>Leave this empty to use the default.</span></div>`, 420)}
    ${CELL('.template-notices &gt; li (info)', `<ul class="template-notices"><li>This template needs the Places module.</li></ul>`, 420)}
    ${CELL('.env-page-banner (full width)', `<div class="env-page-banner" role="status">This environment is paused. <a href="#">Turn it on</a></div>`, 560)}
  </div></div>`;

  // ---- contrast, worked out in the page ----
  const PAGE = '--bg'; const PANEL = '--bg-section'; const CARD = '--bg-card';
  const TC_ROWS = [];
  for (const k of KINDS) {
    TC_ROWS.push([`${k}: icon colour on the chip (the tint over the card)`, `var(--status-${k}-text)`, [CARD, `var(--status-${k}-tint)`], 4.5]);
    TC_ROWS.push([`${k}: banner text on the tint, over the page`, `var(--status-${k}-text)`, [PAGE, `var(--status-${k}-tint)`], 4.5]);
    TC_ROWS.push([`${k}: banner text on the tint, over a panel`, `var(--status-${k}-text)`, [PANEL, `var(--status-${k}-tint)`], 4.5]);
    TC_ROWS.push([`${k}: glyph on the banner icon (on-fill on the fill)`, `var(--status-${k}-on-fill)`, [`var(--status-${k}-fill)`], 4.5]);
  }
  TC_ROWS.push(['Toast title (--text) on the card', 'var(--text)', [CARD], 4.5]);
  TC_ROWS.push(['Toast text (--text-dim) on the card', 'var(--text-dim)', [CARD], 4.5]);
  TC_ROWS.push(['The toast card against the page (the fill alone; the hairline and the shadow carry the edge)', 'var(--bg-card)', [PAGE], 1]);
  const tcBody = () => `<div class="ds-proposed"><table class="pm-ct"><thead><tr><th>Pair</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${TC_ROWS.map((r) => `<tr data-fg="${h(r[1])}" data-bgs="${h(JSON.stringify(r[2]))}" data-min="${r[3]}"><td>${r[0]}</td><td class="pm-n" data-out="r"></td><td class="pm-n">${r[3] === 1 ? 'info' : r[3] + ' to 1'}</td><td data-out="p"></td></tr>`).join('')}</tbody></table></div>`;
  const measureContrast = (doc) => {
    const host = doc.querySelector('.ds-proposed');
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const col = (expr) => { const p = doc.createElement('span'); p.style.color = expr.startsWith('--') ? `var(${expr})` : expr; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (d) => 0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]);
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-ct tbody tr')) {
        const layers = JSON.parse(tr.dataset.bgs);
        g.clearRect(0, 0, 1, 1);
        for (const l of layers) { g.fillStyle = col(l); g.fillRect(0, 0, 1, 1); }
        const base = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        g.fillStyle = col(tr.dataset.fg); g.fillRect(0, 0, 1, 1);
        const top = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        const a = lum(top); const b = lum(base);
        const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const ok = r >= Number(tr.dataset.min);
        const p = tr.querySelector('[data-out="p"]'); p.textContent = Number(tr.dataset.min) === 1 ? 'Info' : ok ? 'Passes' : 'Fails'; p.className = Number(tr.dataset.min) === 1 ? '' : ok ? 'pm-pass' : 'pm-fail';
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  // ---- the block ----
  function renderToasts(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="toasts-h"><a href="#toasts">Toasts and banners</a></h3><span class="ds-status-chip ds-st-approved">Approved</span><span class="ds-count">a toast that floats and goes away, a banner that stays: four kinds, no coloured bar</span></header>
<p class="ds-desc"><b>Decided 2026-10-21: approved as drawn.</b> A <b>toast</b> is a neutral card (the card step, a hairline, <code>--shadow-2</code>, <code>--radius-medium</code>, 340px wide) with a status icon chip, a title, a line of text, an optional Undo and a close. It shows top right on a desktop and at the bottom on a phone, three at most, and goes by itself: a note after 4.5 s, a notice after 9 s, an invite after 60 s; hover or focus waits the clock. A <b>banner</b> is the status tint with an icon, text and, if it does not block, a close; inline or full width; info, ok, warn or danger. <b>Neither has a coloured bar or outline.</b> Maps' floating pill folds into the toast; the bell's notice rows stay rows (the Menus family). The status roles are page-local copies of the Colour family's.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#toasts-anatomy">Anatomy</a><a href="#toasts-kinds">Kinds</a><a href="#toasts-forms">Note, notice, invite</a><a href="#toasts-states">States</a><a href="#toasts-stack">The stack</a><a href="#toasts-try">Try it</a><a href="#toasts-banner">Banners</a><a href="#toasts-position">Position</a><a href="#toasts-ctx">In context</a><a href="#toasts-alias">Aliases</a><a href="#toasts-today">Today to proposed</a><a href="#toasts-contrast">Contrast</a><a href="#toasts-tokens">Tokens</a><a href="#toasts-markup">Markup contract</a><a href="#toasts-widths">Widths</a><a href="#toasts-decided">Decided 2026-10-21</a></nav>

<h4 class="ds-h4" id="toasts-anatomy">Anatomy</h4>
<div data-slot="zoom"></div>
${dim([
    ['1 Surface', '<code>--bg-card</code> (the card step), a 1px <code>--border</code> hairline, <code>--radius-medium</code>, <code>--shadow-2</code>, 12px of padding, 340px wide (less on a narrow screen). Nothing coloured on the edge.'],
    ['2 Icon chip', '28px, <code>--radius-small</code>: the kind\'s tint (the fill at 14%) with the kind\'s readable text colour for the glyph. The only place the kind shows on a toast.'],
    ['3 Title', '14px, weight 600, <code>--text</code>. Sentence case, no full stop. Always there.'],
    ['4 Text', 'Optional. 13px, <code>--text-dim</code>. One or two lines.'],
    ['5 Undo', 'Optional. A Quiet small button (30px). Only where the action can be undone; the toast waits as long as the pointer or the focus is on it.'],
    ['6 Close', 'Icon-only, Quiet, small (30px; a 44px hit area on a phone). It is a button and can be reached by keyboard. Escape on it closes the toast.'],
    ['7 Join, Decline', 'An invite only: Join (Primary, small) and Decline (Secondary, small) under the text. The invite stays 60 s.'],
  ])}

<h4 class="ds-h4" id="toasts-kinds">Kinds</h4>
<p class="ds-desc">Four kinds, set with <code>data-kind</code>: <b>info</b> (the default), <b>ok</b>, <b>warn</b>, <b>danger</b>. The kind sets the icon and the chip colour and nothing else. Words say what happened, so the kind is never the only signal. A danger toast is <code>role="alert"</code> (read at once); the others are <code>role="status"</code> (read politely).</p>
<div data-slot="kinds"></div>

<h4 class="ds-h4" id="toasts-forms">Note, notice, invite</h4>
<p class="ds-desc">Three lengths of life, set by what the toast asks of a person. A <b>note</b> (4.5 s) confirms something just done. A <b>notice</b> (9 s) tells something that needs a read. An <b>invite</b> (60 s) asks for an answer, so it carries Join and Decline and stays long enough to be answered. The duration is on the toast (<code>data-duration</code>) and the stack stops the clock while the pointer or the focus is inside.</p>
<div data-slot="forms"></div>

<h4 class="ds-h4" id="toasts-states">States</h4>
<div data-slot="states"></div>

<h4 class="ds-h4" id="toasts-stack">The stack</h4>
<p class="ds-desc">Up to three show at once, 8px apart, the newest nearest the screen edge (the top on a desktop, the bottom on a phone). A fourth waits and comes in when one goes. A toast comes in over 200ms and goes over 200ms (ease-out; a fade and a 16px slide, only a fade when the person asks for less motion).</p>
<div data-slot="stack"></div>

<h4 class="ds-h4" id="toasts-try">Try it</h4>
<p class="ds-desc">The real thing, in a stage: the clocks run (4.5 s, 9 s, 60 s), hover or tab into a toast and its clock waits, a fourth waits in line. Close with the button or Escape on it.</p>
<div data-slot="try"></div>

<h4 class="ds-h4" id="toasts-banner">Banners</h4>
<p class="ds-desc">A banner is a line of the kind's tint (the fill at 14%) with a 20px round icon (the kind's fill, the glyph in its on-fill), the text in the readable text colour, an optional action (Secondary, small: a visible button) and, when it does not block, a close. <b>Inline</b> sits inside a form, a card or a column and has the medium corner. <b>Full width</b> is the same banner stretched to the width of its container: the same corner and padding, the text from the left, the close at the right edge; at the top of a page it sits in from the screen edges by the page padding (16px, 12px on a phone). A banner that blocks something (a paused environment) has no close.</p>
<p class="ds-desc"><b>Inline, four kinds</b></p>
<div data-slot="banner-kinds"></div>
<p class="ds-desc"><b>Parts</b></p>
<div data-slot="banner-parts"></div>
<p class="ds-desc"><b>Full width</b></p>
<div data-slot="banner-wide"></div>

<h4 class="ds-h4" id="toasts-position">Position</h4>
<p class="ds-desc"><b>Desktop:</b> top right, 16px in from the top and right, 340px wide. <b>Phone (640px and below):</b> at the bottom, 8px in from each side, the width of the page minus 16px, above the safe area; the newest is the one at the bottom.</p>
<div data-slot="pos-desktop"></div>
<div data-slot="pos-phone"></div>

<h4 class="ds-h4" id="toasts-ctx">In context</h4>
<p class="ds-desc">A page banner at the top, two objects, an inline banner (a conflict) under them and a toast. At 1280 and at 390.</p>
<div data-slot="ctx"></div>

<h4 class="ds-h4" id="toasts-alias">Aliases</h4>
<p class="ds-desc">Today's names take the look with no markup edit. <code>.option-help</code> becomes a banner only when it carries a <code>data-kind</code>; without one it stays the Cards family's hairline callout.</p>
<div data-slot="alias"></div>

<h4 class="ds-h4" id="toasts-today">Today to proposed</h4>
${tbl(['Today', 'Proposed', 'Note'], [
    ['Toast <code>.toast</code> (style.css:6930): a 3px accent bar on the left, an accent icon with no chip in the note form, shadow <code>0 8px 26px</code>, section fill', '<code>.sdk-toast</code>: the card step, a hairline, an icon chip in the kind\'s tint, <code>--shadow-2</code>', 'No bar. The chip shows the kind.'],
    ['Stack <code>.toast-layer</code> top 56px, right 12px, z 60, 340px', '<code>.sdk-toasts</code>: top right 16px; bottom, 8px in from each side, on a phone; <code>--z-toast</code>', 'Three at once; a fourth waits.'],
    ['Invite <code>.toast-invite</code> with <code>.toast-actions</code>', 'The same toast with Join (Primary) and Decline (Secondary)', 'Stays 60 s.'],
    ['<code>.env-banner</code>: outline in danger, 12% fill, no icon', '<code>.sdk-banner</code> inline, kind danger: tint fill and icon, no outline', 'Alias kept. Default kind danger.'],
    ['<code>.env-page-banner</code>: 18% fill, a bottom border, centred', '<code>.sdk-banner-wide</code>: tint fill and icon, no border', 'Alias kept. Default kind danger.'],
    ['<code>.conflict-bar</code>: three copies (Places, Research, Planner), each with a danger outline', 'One <code>.sdk-banner</code>, kind warn, with the action as a Secondary small button', 'Alias kept. Default kind warn.'],
    ['Maps <code>.banner</code>: a round pill with an accent border, floating over the map', 'A toast (it floats, so it is one) with its action as Undo or a Quiet button', 'Maps changes in its own version.'],
    ['<code>.option-help</code>: a 3px accent bar, a 7% fill', 'An inline banner, kind info (or the Cards callout when it carries no kind)', 'No bar.'],
    ['Template notice (<code>.template-notices li</code>): a plain card', 'An inline banner, kind info', 'Alias kept.'],
    ['<code>.emptynote</code>: a dashed box', 'Not a banner: it is an empty line (the States family)', 'See Empty, loading and error states.'],
    ['Bell notice rows', 'Stay rows', 'Menus and popovers family.'],
    ['Five shadows, three layers', '<code>--shadow-2</code>; <code>--z-toast</code>', ''],
  ])}

<h4 class="ds-h4" id="toasts-contrast">Contrast</h4>
<p class="ds-desc">Worked out by this page, in the mode on show: flip the Dark and Light switch and the table follows. Text needs 4.5 to 1.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="toasts-tokens">Tokens</h4>
${tbl(['Token', 'Use here', ''], [
    ['<code>--status-danger-fill</code>, <code>-ok-</code>, <code>-warn-</code>, <code>-info-</code>', 'The kind\'s fill: the theme\'s danger and ok, the gold and the blue tints. Page-local copies of the Colour family\'s roles.', 'new (page-local)'],
    ['<code>--status-*-tint</code>', 'The fill at 14% over the surface: a banner\'s background, a toast chip\'s background.', 'new (page-local)'],
    ['<code>--status-*-text</code>', 'The fill mixed into <code>--text</code> (danger 70%, ok 40% because its fill is the palest, warn and info 60%): readable on the tint over a page or a panel.', 'new (page-local)'],
    ['<code>--status-*-on-fill</code>', 'White or near-black, whichever reaches 4.5 to 1 on the fill (relative colour from the fill\'s lightness).', 'new (page-local)'],
    ['<code>--toast-w</code>, <code>--toast-gap</code>, <code>--toast-ms</code>', '340px; 8px; 200ms.', 'new'],
    ['<code>--z-toast</code>', 'The layer of the stack: above the dialogs (60).', 'exists (Foundations)'],
    ['<code>--shadow-2</code>', 'The toast\'s shadow (Menus family).', 'exists (Menus)'],
    ['<code>--bg-card</code>, <code>--border</code>, <code>--text</code>, <code>--text-dim</code>', 'The toast\'s surface, hairline and text.', 'exists'],
    ['<code>--radius-small</code>, <code>--radius-medium</code>, <code>--radius-round</code>', 'The chip; the toast and the inline banner; the banner icon.', 'exists'],
  ])}

<h4 class="ds-h4" id="toasts-markup">Markup contract</h4>
${code(`<!-- the stack: one per page, in the top layer; role per toast -->
<div class="sdk-toasts" aria-label="Notifications">
  <div class="sdk-toast" data-kind="ok" role="status" data-duration="4500">
    <span class="sdk-toast-icon" aria-hidden="true"><i class="fa-solid fa-check"></i></span>
    <div class="sdk-toast-body"><span class="sdk-toast-title">Plan saved</span><span class="sdk-toast-text">Everyone can see the new dates.</span></div>
    <div class="sdk-toast-end">
      <button type="button" class="btn btn-quiet btn-small">Undo</button>
      <button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Close"><i class="fa-solid fa-xmark"></i></button>
    </div>
    <!-- an invite: <div class="sdk-toast-actions"> Join (btn-primary) and Decline </div> -->
  </div>
</div>

<!-- a banner: inline, or add sdk-banner-wide at the top of a page; remove the close when it blocks -->
<div class="sdk-banner" data-kind="warn" role="status">
  <span class="sdk-banner-icon" aria-hidden="true"><i class="fa-solid fa-triangle-exclamation"></i></span>
  <span class="sdk-banner-text"><b>Conflict.</b> Dinner and the train overlap.</span>
  <button type="button" class="btn btn-small sdk-banner-action">Move dinner</button>
  <button type="button" class="sdk-icon-btn btn-quiet btn-small sdk-banner-close" aria-label="Close">...</button>
</div>`)}

<h4 class="ds-h4" id="toasts-widths">Widths</h4>
<p class="ds-desc">The same page at 390, 700 and 1280 wide: the stack moves from top right to the bottom at 640 and below; the banners and the toast never run off the page.</p>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="toasts-decided">Decided 2026-10-21</h4>
<p class="ds-desc">Thomas approved every choice below, as drawn, on 2026-10-21.</p>
${tbl(["Decided as drawn","What"], [
    ["Status text","Mixes danger 70%, ok 40%, warn and info 60% into the text colour."],
    ["Order","The newest toast sits nearest the screen edge; on a phone it is 8px in from each side."],
    ["<code>.option-help</code>","Becomes a banner only when it has <code>data-kind</code>."],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + TB_CSS }, o || {}));
    slot('zoom').appendChild(F(zoomBody(), 'Toasts, anatomy sample', { height: 180 }));
    slot('kinds').appendChild(F(kindsBody(), 'Toasts, kinds'));
    slot('forms').appendChild(F(formsBody(), 'Toasts, note notice invite'));
    slot('states').appendChild(F(statesBody(), 'Toasts, states'));
    slot('stack').appendChild(F(stackBody(), 'Toasts, stack'));
    slot('try').appendChild(F(tryBody(), 'Toasts, try it', { height: 360, onload: tryDemo }));
    slot('banner-kinds').appendChild(F(bannerKindsBody(), 'Toasts, banners'));
    slot('banner-parts').appendChild(F(bannerParts(), 'Toasts, banner parts'));
    slot('banner-wide').appendChild(F(bannerWideBody(), 'Toasts, banners full width'));
    slot('pos-desktop').appendChild(F(posDesktopBody(), 'Toasts, desktop position', { height: 360, pinWidth: 760 }));
    slot('pos-phone').appendChild(F(posPhoneBody(), 'Toasts, phone position', { height: 560, pinWidth: 390 }));
    slot('ctx').appendChild(F(ctxBody(1280), 'Toasts, in context'));
    slot('alias').appendChild(F(aliasBody(), 'Toasts, aliases'));
    slot('contrast').appendChild(F(tcBody(), 'Toasts, contrast', { onload: measureContrast }));
    const ws = mk('div', '');
    for (const w of [390, 700, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(ctxBody(w), `Toasts at ${w}`, { pinWidth: w, height: w <= 640 ? 480 : 420 }));
    }
    slot('widths').appendChild(ws);
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'toasts', covers: ['toast', 'banner', 'notice', 'alert', 'callout'], group: 'Feedback', name: 'Toasts and banners', status: 'approved',
    words: 'toast toasts banner banners notice notification note invite undo alert status info ok warn danger tint conflict env banner page banner callout inline full width stack auto dismiss pause pill bell',
    render: renderToasts,
  });
})();
