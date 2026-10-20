/* The Dialogs and sheets family (proposed): one shell for the editor window, the Set up sheets, the layout sheet, the phase sheet, the background picker and the confirm,
   in three sizes (360, 560, 880), with a styled confirm that replaces the browser's own. Loaded by proposed.html through proposed-families.json, after proposed.js (the page
   engine); it registers one family through window.DS_PROPOSED.families.push and draws it with the rules in proposed-dialogs.css. Nothing here is a style of the product:
   markup, words, tables and one working demo (a real <dialog>: Escape, the focus trap, the focus return, the discard row). How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules (.pm-row, .pm-role ...), from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // The example-page rules of this family's frames only (the layout of the examples; nothing of the component).
  const DL_CSS = `
.pm-grid { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 14px 24px; }
.pm-cell { display: flex; flex-direction: column; gap: 5px; min-width: 0; max-width: 100%; }
.pm-cell > small, .pm-cap { color: var(--text-dim); font-size: var(--text-11); font-weight: 700; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-cap { margin: 0 0 6px; }
.pm-cell > .sdk-dialog, .pm-box > .pm-scene + .sdk-dialog-layer { margin: 0; }
.pm-box { position: relative; overflow: hidden; transform: translateZ(0); border-radius: var(--radius-medium); background: var(--bg); }
.pm-scene { padding: 14px; }
.pm-scene p { margin: 0 0 10px; padding: 12px; border-radius: var(--radius-medium); background: var(--bg-section); color: var(--text-dim); }
.pm-two { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr); gap: 12px; }
.pm-arrow { align-self: center; color: var(--text-dim); font-size: 20px; }
.pm-log { margin: 8px 0 0; color: var(--text-dim); font-size: 12px; min-height: 18px; }
.pm-bar2 { display: flex; flex-wrap: wrap; gap: 6px; }
.pm-ct { width: 100%; border-collapse: collapse; font-size: 12px; }
.pm-ct th { padding: 4px 8px 4px 0; color: var(--text-dim); font-size: var(--text-11); letter-spacing: 0.08em; text-align: left; text-transform: uppercase; }
.pm-ct td { padding: 4px 8px 4px 0; border-top: 1px solid var(--border); vertical-align: top; }
.pm-ct .pm-n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.pm-pass { color: var(--ok); font-weight: 700; } .pm-fail { color: var(--danger-text); font-weight: 700; }
.pm-pop-at { position: fixed; z-index: 26; }
.pm-here { margin: 0; color: var(--text-dim); font-size: 13px; }
@media (max-width: 640px) { .pm-two { grid-template-columns: minmax(0, 1fr); } }`;

  let uid = 0;
  const CLOSE = `<button type="button" class="sdk-icon-btn btn-quiet btn-small sdk-dialog-close" aria-label="Close" data-close>${fa('xmark')}</button>`;

  // ---- builders ----
  // One dialog. o: title, body, foot (HTML), size (confirm | form | wide), alert, scrolled, discard (shows the discard row instead of the foot), style, id, attrs.
  const D = (o = {}) => {
    const id = o.id || `dl${++uid}`;
    const cls = ['sdk-dialog', o.size === 'confirm' ? 'sdk-dialog-confirm' : '', o.size === 'wide' ? 'sdk-dialog-wide' : ''].filter(Boolean).join(' ');
    return `<div class="${cls}" role="${o.alert ? 'alertdialog' : 'dialog'}" aria-modal="true" aria-labelledby="${id}-t"${o.alert ? ` aria-describedby="${id}-d"` : ''}${o.scrolled ? ' data-scrolled' : ''}${o.style ? ` style="${o.style}"` : ''}${o.attrs || ''}>
      <div class="sdk-dialog-head"><h2 class="sdk-dialog-title" id="${id}-t">${o.title}</h2>${CLOSE}</div>
      <div class="sdk-dialog-body"${o.alert ? ` id="${id}-d"` : ''}>${o.body || ''}</div>
      ${o.discard ? `<div class="sdk-dialog-discard" role="group" aria-label="Discard your changes?"><span class="sdk-dialog-discard-text">Discard your changes?</span><button type="button" class="btn">Keep editing</button><button type="button" class="btn btn-danger">Discard</button></div>` : ''}
      <div class="sdk-dialog-foot"${o.discard ? ' hidden' : ''}>${o.foot || ''}</div></div>`;
  };
  const CANCEL = '<button type="button" class="btn" data-close>Cancel</button>';
  const FOOT_FORM = `${CANCEL}<button type="button" class="btn btn-primary">Save</button>`;
  const field = (label, ctl, hint) => `<label class="sdk-field"><span class="sdk-label">${label}</span>${ctl}<span class="sdk-hint">${hint || ''}</span></label>`;
  const FORM = (o = {}) => `${field('Name', `<input type="text" value="${o.name === undefined ? 'Louvre museum' : o.name}"${o.dis ? ' disabled' : ''}>`)}
    <div class="pm-two">${field('Kind', `<select${o.dis ? ' disabled' : ''}><option>Visit</option><option>Meal</option><option>Travel</option></select>`)}${field('Day', `<input type="date" value="2026-10-24"${o.dis ? ' disabled' : ''}>`)}</div>
    ${field('Cost <span class="sdk-optional">(optional)</span>', `<input type="number" value="17"${o.dis ? ' disabled' : ''}>`, 'In euros.')}
    ${o.more ? field('Notes', '<textarea rows="3">Book the 10:00 slot. Bring the passes.</textarea>') : ''}`;
  const MANY = () => Array.from({ length: 9 }, (_, i) => field(['Name', 'Kind', 'Address', 'Phone', 'Web address', 'Day', 'Starts', 'Ends', 'Cost'][i], `<input type="text" value="${['Louvre museum', 'Visit', '99 Rue de Rivoli', '+33 1 40 20 50 50', 'https://louvre.fr', '2026-10-24', '10:00', '12:00', '17'][i]}">`)).join('');

  const CONFIRM = {
    plain: { title: 'Leave this space?', body: '<p>You can join again with the invite link.</p>', foot: `${CANCEL}<button type="button" class="btn btn-primary" data-ok>Leave</button>`, alert: true, size: 'confirm' },
    destructive: { title: 'Delete this place?', body: '<p><b>Louvre museum</b> will be removed from Saturday. You can undo this for a few seconds.</p>', foot: `${CANCEL}<button type="button" class="btn btn-danger" data-ok>Delete</button>`, alert: true, size: 'confirm' },
    final: { title: 'Delete Paris trip for good?', body: `<p>Its places, notes and files are deleted and cannot be brought back.</p>${field('Type <b>Paris trip</b> to confirm', '<input type="text" placeholder="Paris trip" autocomplete="off" data-typed>')}`, foot: `${CANCEL}<button type="button" class="btn btn-danger solid" data-ok disabled>Delete for good</button>`, alert: true, size: 'confirm' },
  };
  const confirmHtml = (k, extra) => D(Object.assign({}, CONFIRM[k], extra || {}));

  // ---- the examples ----
  const sizesBody = () => `<div class="ds-proposed"><div class="pm-grid" style="display:block">
    <div class="pm-cell" style="margin-bottom:16px"><small>360: a confirm</small>${confirmHtml('destructive', { style: '--dlg-max-h: none' })}</div>
    <div class="pm-cell" style="margin-bottom:16px"><small>560: a form (the editor window, the Set up sheets, the layout sheet)</small>${D({ title: 'Add a place', body: FORM({ more: true }), foot: FOOT_FORM, style: '--dlg-max-h: none' })}</div>
    <div class="pm-cell"><small>880: a browse (the background picker, the phase sheet, a large editor)</small>${D({ size: 'wide', title: 'Choose a background', body: `<div class="pm-two" style="grid-template-columns:repeat(4,minmax(0,1fr))">${['Library', 'Fireplace', 'Harbour', 'Garden', 'Alps', 'Café', 'Desert', 'Forest'].map((n) => `<div class="pm-scene" style="background:var(--bg-card);border-radius:var(--radius-medium);padding:0"><div style="height:72px;border-radius:var(--radius-medium) var(--radius-medium) 0 0;background:var(--selected-bg)"></div><p style="margin:0;padding:8px 10px;background:none">${n}</p></div>`).join('')}</div>`, foot: `<span class="sdk-dialog-note">Pick one to preview it.</span><button type="button" class="btn" data-close>Cancel</button><button type="button" class="btn btn-primary">Use this</button>`, style: '--dlg-max-h: none' })}</div>
  </div></div>`;

  const anatomyBody = () => `<div class="ds-proposed"><div class="pm-box" style="padding:14px"><div style="max-width:560px">${D({ title: 'Add a place', body: FORM(), foot: FOOT_FORM, style: '--dlg-max-h: none' })}</div></div></div>`;

  const statesBody = () => `<div class="ds-proposed"><div class="pm-grid">
    <div class="pm-cell" style="width:560px"><small>Rest</small>${D({ title: 'Add a place', body: FORM(), foot: FOOT_FORM, style: '--dlg-max-h: none' })}</div>
    <div class="pm-cell" style="width:560px"><small>Dirty: Escape or Cancel shows the discard row in place of the buttons</small>${D({ title: 'Add a place', body: FORM({ name: 'Louvre museum, east wing' }), foot: FOOT_FORM, discard: true, style: '--dlg-max-h: none' })}</div>
    <div class="pm-cell" style="width:560px"><small>Scrolling: the head and the foot stay, a hairline shows under the head</small>${D({ title: 'Edit a place', body: MANY(), foot: FOOT_FORM, scrolled: true, style: '--dlg-max-h: 380px', id: 'dl-scroll' })}</div>
    <div class="pm-cell" style="width:560px"><small>Loading: the fields wait, Save shows a spinner and cannot be pressed again</small>${D({ title: 'Add a place', body: FORM({ dis: true }), foot: `${CANCEL}<button type="button" class="btn btn-primary" aria-busy="true">${fa('spinner', 'fa-spin')} Saving</button>`, style: '--dlg-max-h: none' })}</div>
    <div class="pm-cell" style="width:560px"><small>Error in the foot: on the left, in the readable red; the dialog stays open</small>${D({ title: 'Add a place', body: FORM(), foot: `<p class="sdk-form-error" role="alert">Could not save. The server did not answer.</p>${CANCEL}<button type="button" class="btn btn-primary">Try again</button>`, style: '--dlg-max-h: none' })}</div>
  </div></div>`;
  const statesReady = (doc) => {
    const b = doc.querySelector('#dl-scroll-t')?.closest('.sdk-dialog')?.querySelector('.sdk-dialog-body');
    if (b) b.scrollTop = 40;
  };

  // The form dialog in context: a page behind the scrim.
  const scene = () => `<div class="pm-scene"><p>Dinner at Le Comptoir, tomorrow 19:30</p><p>Train to Lyon, Friday 08:12</p><p>Louvre museum, Saturday 10:00</p><p>Hotel des Arts, check in Friday</p></div>`;
  const ctxBody = (w, h2) => `<div class="ds-proposed"><div class="pm-box" style="height:${h2}px">${scene()}<div class="sdk-dialog-layer" style="position:absolute">${D({ title: 'Add a place', body: FORM({ more: true }), foot: FOOT_FORM, style: '--dlg-max-h: 100%' })}</div></div></div>`;

  const phoneBody = () => `<div class="ds-proposed"><div class="sdk-dialog-layer" data-phone>${D({ title: 'Add a place', body: FORM({ more: true }), foot: FOOT_FORM, id: 'dl-phone' })}</div></div>`;

  // The stack: a dialog, a popover opened from it, and a toast over both.
  const DAYS = (() => { const c = []; for (let d = 1; d <= 31; d += 1) c.push(`<button type="button" class="sdk-dp-day${d === 19 ? ' today' : ''}${d === 24 ? ' sel' : ''}"${d === 24 ? ' aria-pressed="true"' : ''}>${d}</button>`); return c.join(''); })();
  const stackBody = () => `<div class="ds-proposed">${scene()}<div class="sdk-dialog-layer">${D({ title: 'Add a place', body: `${field('Name', '<input type="text" value="Louvre museum">')}${field('Day', '<div class="sdk-group"><input type="date" value="2026-10-24"><button type="button" class="sdk-field-btn" aria-label="Open the calendar">' + fa('calendar') + '</button></div>')}${field('Cost', '<input type="number" value="17">')}`, foot: FOOT_FORM, style: '--dlg-max-h: 420px;margin-top:40px' })}
      <div class="sdk-dp pm-pop-at" role="dialog" aria-label="Choose a day" style="left:calc(50% - 40px);top:228px"><div class="sdk-dp-head"><button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Previous month">${fa('chevron-left')}</button><span class="sdk-dp-title">October 2026</span><button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Next month">${fa('chevron-right')}</button></div><div class="sdk-dp-grid">${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => `<span class="sdk-dp-dow" aria-hidden="true">${d}</span>`).join('')}${DAYS}</div></div>
    </div>
    <div class="sdk-toasts" aria-label="Notifications"><div class="sdk-toast" data-kind="ok" role="status"><span class="sdk-toast-icon" aria-hidden="true">${fa('check')}</span><div class="sdk-toast-body"><span class="sdk-toast-title">Place copied</span></div><div class="sdk-toast-end"><button type="button" class="sdk-icon-btn btn-quiet btn-small" aria-label="Close">${fa('xmark')}</button></div></div></div></div>`;

  // The three kinds of confirm and the two-step.
  const confirmKindsBody = () => `<div class="ds-proposed"><div class="pm-grid">
    <div class="pm-cell" style="width:360px"><small>Confirm: Cancel (Secondary) and Primary</small>${confirmHtml('plain', { style: '--dlg-max-h: none' })}</div>
    <div class="pm-cell" style="width:360px"><small>Destructive: soft Danger; focus starts on Cancel</small>${confirmHtml('destructive', { style: '--dlg-max-h: none' })}</div>
    <div class="pm-cell" style="width:360px"><small>Final, cannot be undone: solid Danger; the name is typed</small>${confirmHtml('final', { style: '--dlg-max-h: none' })}</div>
  </div></div>`;
  const twoStepBody = () => `<div class="ds-proposed"><div class="pm-grid" style="flex-wrap:nowrap;overflow-x:auto">
    <div class="pm-cell" style="width:360px;flex:none"><small>Step 1</small>${D({ size: 'confirm', alert: true, title: 'Delete Paris trip?', body: '<p>Everyone loses access to the space.</p>', foot: `${CANCEL}<button type="button" class="btn btn-danger">Delete</button>`, style: '--dlg-max-h: none' })}</div>
    <span class="pm-arrow" aria-hidden="true">${fa('arrow-right')}</span>
    <div class="pm-cell" style="width:360px;flex:none"><small>Step 2: only after step 1</small>${D({ size: 'confirm', alert: true, title: 'Delete its data too?', body: '<p>The places, notes, photos and files are deleted for good. If you keep them, an admin can restore the space.</p>', foot: `<button type="button" class="btn">Keep data</button><button type="button" class="btn btn-danger solid">Delete data too</button>`, style: '--dlg-max-h: none' })}</div>
  </div></div>`;

  // ---- try it: a real <dialog> ----
  const tryBody = () => `<div class="ds-proposed"><div class="pm-scene">
    <div class="pm-bar2" role="group" aria-label="Open a dialog">
      <button type="button" class="btn" data-open="form">Edit a place</button>
      <button type="button" class="btn" data-open="plain">Leave the space</button>
      <button type="button" class="btn" data-open="destructive">Delete a place</button>
      <button type="button" class="btn" data-open="final">Delete for good</button>
      <button type="button" class="btn" data-open="two">Delete a space (two steps)</button>
    </div>
    <p class="pm-log" data-log role="status" aria-live="polite">Open one. Try Escape, Tab, the backdrop, and typing in the form first.</p>
    <p class="pm-here" data-state></p>
  </div>
  ${dlgEl('form', D({ title: 'Edit a place', body: FORM(), foot: FOOT_FORM, discard: true, attrs: ' data-kind="form"', id: 'dt-form' }))}
  ${dlgEl('plain', confirmHtml('plain', { id: 'dt-plain', attrs: ' data-kind="plain"' }))}
  ${dlgEl('destructive', confirmHtml('destructive', { id: 'dt-destructive', attrs: ' data-kind="destructive"' }))}
  ${dlgEl('final', confirmHtml('final', { id: 'dt-final', attrs: ' data-kind="final"' }))}
  ${dlgEl('two1', D({ size: 'confirm', alert: true, title: 'Delete Paris trip?', body: '<p>Everyone loses access to the space.</p>', foot: `${CANCEL}<button type="button" class="btn btn-danger" data-ok>Delete</button>`, id: 'dt-two1', attrs: ' data-kind="destructive"' }))}
  ${dlgEl('two2', D({ size: 'confirm', alert: true, title: 'Delete its data too?', body: '<p>The places, notes, photos and files are deleted for good.</p>', foot: `<button type="button" class="btn" data-close>Keep data</button><button type="button" class="btn btn-danger solid" data-ok>Delete data too</button>`, id: 'dt-two2', attrs: ' data-kind="final"' }))}
  </div>`;
  // A static dialog markup turned into a real <dialog> by the demo's script (it keeps the markup the page draws everywhere else).
  function dlgEl(k, html) { return `<template data-dlg="${k}">${html}</template>`; }

  const tryDemo = (doc) => {
    const win = doc.defaultView;
    const log = doc.querySelector('[data-log]');
    const stateEl = doc.querySelector('[data-state]');
    const say = (t) => { log.textContent = t; };
    const dialogs = {};
    const lock = (on) => { doc.documentElement.style.overflow = on ? 'hidden' : ''; };
    for (const t of doc.querySelectorAll('template[data-dlg]')) {
      const div = t.content.firstElementChild;
      const dlg = doc.createElement('dialog');
      dlg.className = div.className; dlg.id = div.id || '';
      for (const a of div.attributes) if (!['class', 'style'].includes(a.name)) dlg.setAttribute(a.name, a.value);
      dlg.innerHTML = div.innerHTML;
      dlg.removeAttribute('data-scrolled');
      t.replaceWith(dlg);
      dialogs[t.dataset.dlg] = dlg;
    }
    const focusables = (dlg) => [...dlg.querySelectorAll('button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])')].filter((e) => !e.disabled && !e.closest('[hidden]') && e.getClientRects().length);
    const discardRow = (dlg) => dlg.querySelector('.sdk-dialog-discard');
    const foot = (dlg) => dlg.querySelector('.sdk-dialog-foot');
    const isDirty = (dlg) => dlg.dataset.dirty === 'true';
    const open = (dlg, opener) => {
      dlg._opener = opener; dlg.dataset.dirty = 'false'; dlg.dataset.closing = 'false';
      if (discardRow(dlg)) { discardRow(dlg).hidden = true; foot(dlg).hidden = false; }
      const typed = dlg.querySelector('[data-typed]'); if (typed) { typed.value = ''; dlg.querySelector('[data-ok]').disabled = true; }
      lock(true);
      dlg.showModal();
      const first = dlg.dataset.kind === 'form' ? dlg.querySelector('input') : dlg.querySelector('.sdk-dialog-foot [data-close]');
      if (first) first.focus();
      say(`Opened "${dlg.querySelector('.sdk-dialog-title').textContent}". Focus is on ${dlg.dataset.kind === 'form' ? 'the first field' : 'Cancel (the safe choice)'}.`);
      stateEl.textContent = '';
    };
    const showDiscard = (dlg) => { discardRow(dlg).hidden = false; foot(dlg).hidden = true; discardRow(dlg).querySelector('.btn').focus(); say('There are edits: asked "Discard your changes?"'); };
    const hideDiscard = (dlg) => { discardRow(dlg).hidden = true; foot(dlg).hidden = false; dlg.querySelector('input').focus(); say('Kept editing.'); };
    const request = (dlg, why) => {
      if (win.performance.now() - (dlg._last || -1000) < 40 && why === 'escape') return; // keydown and cancel both fire for one press
      dlg._last = win.performance.now();
      if (discardRow(dlg) && !discardRow(dlg).hidden) { if (why === 'escape') hideDiscard(dlg); return; }
      if (discardRow(dlg) && isDirty(dlg)) { showDiscard(dlg); return; }
      dlg.close(why);
    };
    for (const dlg of Object.values(dialogs)) {
      dlg.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') { e.preventDefault(); request(dlg, 'escape'); return; }
        if (e.key !== 'Tab') return;
        const f = focusables(dlg); if (!f.length) return;
        const i = f.indexOf(doc.activeElement);
        if (e.shiftKey && (i <= 0)) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      });
      dlg.addEventListener('cancel', (e) => { e.preventDefault(); request(dlg, 'escape'); });
      dlg.addEventListener('click', (e) => {
        if (e.target === dlg) { if (isDirty(dlg)) { say('A click on the backdrop does nothing: the form has edits.'); return; } request(dlg, 'backdrop'); return; }
        const c = e.target.closest('[data-close]'); if (c) { request(dlg, 'button'); return; }
        const k = e.target.closest('.sdk-dialog-discard .btn'); if (k) { if (k.classList.contains('btn-danger')) dlg.close('discard'); else hideDiscard(dlg); return; }
        const ok = e.target.closest('[data-ok]'); if (ok && !ok.disabled) { dlg.dataset.result = 'ok'; dlg.close('ok'); }
      });
      dlg.addEventListener('input', (e) => {
        if (e.target.matches('[data-typed]')) dlg.querySelector('[data-ok]').disabled = e.target.value.trim() !== 'Paris trip';
        else dlg.dataset.dirty = 'true';
      });
      dlg.addEventListener('close', () => {
        lock(false);
        const why = dlg.returnValue; const op = dlg._opener;
        if (dlg === dialogs.two1 && why === 'ok') { open(dialogs.two2, op); say('Step 2: "Delete its data too?"'); return; }
        if (op) op.focus();
        say(`Closed (${why || 'closed'}). Focus went back to "${op ? op.textContent.trim() : ''}".`);
        stateEl.textContent = why === 'ok' ? 'Done.' : '';
      });
      const body = dlg.querySelector('.sdk-dialog-body');
      body.addEventListener('scroll', () => dlg.toggleAttribute('data-scrolled', body.scrollTop > 0));
    }
    doc.addEventListener('click', (e) => {
      const b = e.target.closest('[data-open]'); if (!b) return;
      const k = b.dataset.open;
      open(k === 'two' ? dialogs.two1 : dialogs[k], b);
    });
    win.__dialogs = dialogs;
  };

  // ---- the aliases: today's markup takes the look ----
  const aliasBody = () => `<div class="ds-proposed"><div class="pm-grid">
    <div class="pm-cell" style="width:560px"><small>.sdk-editor (host.ui.editor): corner and close hang from it today</small><div class="sdk-editor" role="dialog" aria-label="Add a place" style="--dlg-max-h:none"><div class="sdk-dialog-head"><h2 class="sdk-dialog-title">Add a place</h2><button type="button" class="sdk-editor-close" aria-label="Close">${fa('xmark')}</button></div><form class="sdk-form"><div class="sdk-dialog-body">${field('Name', '<input type="text" value="Louvre museum">')}</div><div class="sdk-editor-actions"><button type="button" class="btn">Cancel</button><button type="button" class="btn btn-primary">Save</button></div></form></div></div>
    <div class="pm-cell" style="width:560px"><small>.sdk-editor-large (880 today too)</small><div class="sdk-editor sdk-editor-large" role="dialog" aria-label="Edit the trip" style="--dlg-max-h:none"><div class="sdk-dialog-head"><h2 class="sdk-dialog-title">Edit the trip</h2><button type="button" class="sdk-editor-close" aria-label="Close">${fa('xmark')}</button></div><div class="sdk-dialog-body"><p class="sdk-dialog-note">Eleven fields in two columns.</p></div><div class="sdk-editor-actions"><button type="button" class="btn">Cancel</button><button type="button" class="btn btn-primary">Save</button></div></div></div>
    <div class="pm-cell" style="width:560px"><small>.layout-sheet (360 today; 560 now)</small><div class="layout-sheet" role="dialog" aria-label="Save this layout" style="--dlg-max-h:none"><div class="sdk-dialog-head"><h2 class="layout-sheet-title">Save this layout</h2><button type="button" class="sdk-dialog-close" aria-label="Close">${fa('xmark')}</button></div><div class="layout-form-body">${field('Name', '<input type="text" value="Evening">')}</div><div class="sdk-dialog-foot"><button type="button" class="btn">Cancel</button><button type="button" class="btn btn-primary">Save</button></div></div></div>
    <div class="pm-cell" style="width:560px"><small>.phase-sheet (760 today; 880 now)</small><div class="phase-sheet" role="dialog" aria-label="Phases" style="--dlg-max-h:none"><div class="phase-sheet-head"><h2>Phases</h2><button type="button" class="phase-sheet-close" aria-label="Close">${fa('xmark')}</button></div><div class="phase-sheet-body"><p class="sdk-dialog-note">Planning, Travel, Back home.</p></div></div></div>
    <div class="pm-cell" style="width:560px"><small>.bgpick with .bgpick-card (the overlay and the card)</small><div class="pm-box" style="height:300px"><div class="bgpick" style="position:absolute"><div class="bgpick-card" style="--dlg-max-h:none"><header class="bgpick-head"><h2>Choose a background</h2><button type="button" class="bgpick-close" aria-label="Close">${fa('xmark')}</button></header><div class="bgpick-body"><p class="sdk-dialog-note">Pick one to preview it.</p></div><footer class="bgpick-foot"><span class="grow"></span><button type="button" class="btn">Cancel</button><button type="button" class="btn btn-primary">Use this</button></footer></div></div></div></div>
  </div></div>`;

  // ---- contrast: the title, the body and the scrim ----
  const TC_ROWS = [
    ['Title (--text) on the panel', 'var(--text)', ['--bg-section'], 4.5],
    ['Body text (--text-dim) on the panel', 'var(--text-dim)', ['--bg-section'], 4.5],
    ['Close icon (--text-dim) on the panel', 'var(--text-dim)', ['--bg-section'], 3],
    ['Close icon on its hover fill (text 10%)', 'var(--text)', ['--bg-section', 'color-mix(in srgb, var(--text) 10%, transparent)'], 4.5],
    ['Error in the foot (danger 70% into text) on the panel', 'color-mix(in srgb, var(--danger) 70%, var(--text))', ['--bg-section'], 4.5],
    ['Soft Danger text on its fill (danger 16%) on the panel', 'color-mix(in srgb, var(--danger) 70%, var(--text))', ['--bg-section', 'color-mix(in srgb, var(--danger) 16%, transparent)'], 4.5],
    ['Solid Danger: --on-danger on --danger', 'var(--on-danger)', ['--danger'], 4.5],
    ['Focus ring (--accent) on the panel', 'var(--accent)', ['--bg-section'], 3],
    ['The panel against the page behind the scrim (the hairline and the shadow carry the edge)', 'var(--bg-section)', ['--bg'], 1],
  ];
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
  function renderDialogs(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="dialogs-h"><a href="#dialogs">Dialogs and sheets</a></h3><span class="ds-status-chip ds-st-proposed">Proposed</span><span class="ds-count">one shell for the editor, the Set up sheets, the layout and phase sheets, the picker and the confirm: three sizes, one close</span></header>
<p class="ds-desc"><b>Proposed 2026-10-20, from Thomas's decisions of 2026-10-20.</b> One shell for the six dialogs of today, in <b>three sizes: 360 (a confirm), 560 (a form), 880 (a browse)</b>; the phase sheet's 760 folds into 880. The title is Figtree 600 at 18px (not Fraunces). The close is the approved icon-only Quiet small button at the top right, in the same place in every dialog. The footer has its buttons at the right, Primary last, under a hairline. The head and the foot stay while the body scrolls. The surface is the panel with a hairline, <code>--radius-large</code>, <code>--shadow-3</code> (the Foundations family's) and the scrim. It comes in over 200ms. On a phone it is <b>full screen</b>, not a bottom sheet. Escape closes it (and asks "Discard your changes?" when there are edits), focus is trapped and goes back to the opener, and a click on the backdrop does not close a form with edits. A <b>styled confirm</b> replaces the browser's own <code>window.confirm</code> (42 calls today).</p>
<nav class="ds-toc" aria-label="In this family"><a href="#dialogs-anatomy">Anatomy</a><a href="#dialogs-sizes">Three sizes</a><a href="#dialogs-states">States</a><a href="#dialogs-confirm">Confirm</a><a href="#dialogs-two">Two steps</a><a href="#dialogs-ctx">A form in context</a><a href="#dialogs-phone">On a phone</a><a href="#dialogs-stack">The stack</a><a href="#dialogs-try">Try it</a><a href="#dialogs-keys">Behaviour</a><a href="#dialogs-alias">Aliases</a><a href="#dialogs-today">Today to proposed</a><a href="#dialogs-contrast">Contrast</a><a href="#dialogs-tokens">Tokens</a><a href="#dialogs-markup">Markup contract</a><a href="#dialogs-widths">Widths</a></nav>

<h4 class="ds-h4" id="dialogs-anatomy">Anatomy</h4>
<div data-slot="anatomy"></div>
${dim([
    ['1 Surface', 'The panel (<code>--bg-section</code>), a 1px <code>--border</code> hairline, <code>--radius-large</code>, <code>--shadow-3</code>. Width 360, 560 or 880 (less on a narrow screen), never taller than the screen less 48px.'],
    ['2 Head', 'Title and close. 16px from the top, 16px from the right, 24px from the left (16px on a phone). A hairline shows under it once the body has scrolled.'],
    ['3 Title', 'Figtree, weight 600, 18px, a line of 24px, <code>--text</code>. The question or the name of the job, in sentence case: "Add a place", "Delete this place?".'],
    ['4 Close', 'The approved icon-only Quiet small button: 30px, <code>--text-dim</code> icon, the quiet fill on hover, a 44px hit area on a phone. At the top right, the same place in every dialog. Escape does the same.'],
    ['5 Body', 'The one part that scrolls. 24px at the sides (16px on a phone), 16px between fields. Fields and buttons are the approved ones.'],
    ['6 Foot', 'Buttons at the right, 8px apart, Primary last (a destructive confirm: the soft Danger last). A 1px <code>--border</code> hairline above. An error or a note goes to the left of the buttons.'],
    ['7 Scrim', '<code>--scrim</code> (black at 55%), from the Foundations family. On a phone it is opaque (<code>--bg</code>) because the dialog covers the screen.'],
  ])}

<h4 class="ds-h4" id="dialogs-sizes">Three sizes</h4>
<p class="ds-desc"><b>360</b> is for a question (a confirm). <b>560</b> is for a form: the editor window, the Set up sheets, the layout sheet. <b>880</b> is for choosing from many things: the background picker, the phase sheet, a large editor. The width is a token (<code>--dlg-w</code>) set by a class; the height follows the content up to the screen less 48px.</p>
<div data-slot="sizes"></div>

<h4 class="ds-h4" id="dialogs-states">States</h4>
<div data-slot="states"></div>

<h4 class="ds-h4" id="dialogs-confirm">Confirm</h4>
<p class="ds-desc">The styled confirm replaces <code>window.confirm</code>: a 360px dialog with a plain question, one line of what happens, <b>Cancel</b> (Secondary) and the action. Three kinds. A <b>confirm</b> asks before something that is easy to take back: Primary last. A <b>destructive confirm</b> asks before something that removes: the <b>soft Danger</b> button last, and the focus starts on Cancel. A <b>final, irreversible confirm</b> is the only place for the <b>solid red</b>; it may ask for the name to be typed, and the button stays off until it matches. Escape cancels all three, and so does a click on the backdrop. It is <code>role="alertdialog"</code> with the question as its name and the line as its description.</p>
<div data-slot="confirm"></div>

<h4 class="ds-h4" id="dialogs-two">Two steps: "Delete data too?"</h4>
<p class="ds-desc">When a delete has two parts, ask in two dialogs, never one with a hidden choice. Step 1 asks about the thing. Step 2 asks only about what goes with it; "Keep data" is the safe choice and sits next to the solid red. The focus starts on the safe choice each time.</p>
<div data-slot="two"></div>

<h4 class="ds-h4" id="dialogs-ctx">A form in context</h4>
<p class="ds-desc">The approved fields and buttons inside the shell, over the page and the scrim, at 1280.</p>
<div data-slot="ctx"></div>

<h4 class="ds-h4" id="dialogs-phone">On a phone</h4>
<p class="ds-desc">390 wide: full screen. No radius, no shadow, an opaque backdrop, the safe-area insets on every side, the footer at the bottom with 44px buttons. Not a bottom sheet: a form needs the whole screen and the keyboard.</p>
<div data-slot="phone"></div>

<h4 class="ds-h4" id="dialogs-stack">The stack</h4>
<p class="ds-desc">A dialog, a popover opened from inside it (the date picker), and a toast over both. The popover belongs to the dialog (it closes with it); the toast belongs to the page and sits above everything (<code>--z-toast</code> over <code>--z-dialog</code> over <code>--z-menu</code>).</p>
<div data-slot="stack"></div>

<h4 class="ds-h4" id="dialogs-try">Try it</h4>
<p class="ds-desc">Real dialogs. Open one, press Escape, Tab around it, click the backdrop, type in the form first and press Escape again. The line below says what happened.</p>
<div data-slot="try"></div>

<h4 class="ds-h4" id="dialogs-keys">Behaviour</h4>
${tbl(['Key or action', 'Does'], [
    ['Escape', 'Closes. If the form has edits, shows the discard row ("Discard your changes?", Keep editing or Discard) in place of the buttons; Escape again keeps editing.'],
    ['Tab and Shift+Tab', 'Stay inside the dialog: from the last control to the first and back. The page behind cannot be reached.'],
    ['Focus on open', 'A form: its first field. A confirm: Cancel (so Enter does not delete). A confirm that is not destructive may focus its Primary.'],
    ['Focus on close', 'Returns to the control that opened it.'],
    ['Click on the backdrop', 'Closes a dialog with nothing to lose (a confirm, a clean form). Does nothing to a form with edits.'],
    ['The page behind', 'Does not scroll while a dialog is open (<code>overflow: hidden</code> on the page; the SDK sets and clears it).'],
    ['Roles', '<code>role="dialog"</code> for a form, <code>role="alertdialog"</code> with <code>aria-describedby</code> for a confirm; <code>aria-modal="true"</code> and <code>aria-labelledby</code> the title on both.'],
    ['Enter and exit', '200ms, ease-out: a fade and an 8px rise. No motion for a person who asks for less.'],
  ])}

<h4 class="ds-h4" id="dialogs-alias">Aliases</h4>
<p class="ds-desc">Today's names take the look with no markup edit. The close of today's <code>.sdk-editor</code> hangs from a sticky corner; here it sits in the head, so the corner goes.</p>
<div data-slot="alias"></div>

<h4 class="ds-h4" id="dialogs-today">Today to proposed</h4>
${tbl(['Today', 'Proposed', 'Note'], [
    ['Six shells: <code>.sdk-editor</code>, the Set up sheets, <code>.layout-sheet</code>, <code>.phase-sheet</code>, <code>.bgpick</code> with <code>.bgpick-card</code>, and the browser\'s <code>window.confirm</code>', 'One: <code>.sdk-dialog</code>', 'Aliases kept.'],
    ['Four widths: 360 (layout sheet), 560 (editor), 760 (phase sheet), 880 (large editor, picker)', 'Three: 360 (confirm), 560 (form), 880 (browse)', 'The layout sheet moves to 560, the phase sheet to 880.'],
    ['Close buttons in different places: the editor\'s hangs from a sticky corner, the picker\'s sits in its header, the layout sheet has none', 'One close, top right, 16px in, the Quiet small icon button', 'The same place in every dialog.'],
    ['Titles 15px (layout sheet), 18px (picker, editor), none (the Set up sheets)', 'Figtree 600 at 18px, always', 'Not Fraunces: a dialog is not a headline.'],
    ['Scrim: <code>--bg</code> at 70% (the sheets), raw black at 60% (the picker)', '<code>--scrim</code>: black at 55%', 'Foundations token.'],
    ['Shadows <code>0 16px 48px</code> at 45% and <code>0 20px 60px</code> at 50%', '<code>--shadow-3</code>, about <code>0 8px 30px</code>', 'The Foundations family\'s token.'],
    ['Two of the six are not full screen on a phone (the layout sheet, the picker)', 'All are, at 640px and below', 'Safe-area insets.'],
    ['The head scrolls away with the body in the Set up sheets and the phase sheet', 'The head and the foot stay; the body scrolls', 'A hairline under the head once scrolled.'],
    ['<code>window.confirm</code>: 42 calls. <code>admin.js</code> 15, <code>profile.js</code> 12, <code>space.js</code> 4, <code>host-templates.js</code> 3, <code>module-config.js</code> 2, <code>module-settings.js</code> 2, one each in <code>chat-input.js</code>, <code>flight-schedule.js</code>, <code>host.js</code> and the Stream module', 'The styled confirm, three kinds', 'Counted from the code on 2026-10-20 (a search for <code>confirm(</code>); an earlier list had admin 17 and profile 13, which makes 45.'],
    ['"Discard your changes?" row stuck to the bottom over the button row (<code>.sdk-editor-discard</code>)', 'The discard row in the foot, in place of the buttons', 'Same words.'],
  ])}

<h4 class="ds-h4" id="dialogs-contrast">Contrast</h4>
<p class="ds-desc">Worked out by this page, in the mode on show: flip the Dark and Light switch and the table follows.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="dialogs-tokens">Tokens</h4>
${tbl(['Token', 'Use here', ''], [
    ['<code>--shadow-3</code>', 'The shadow of a window: about <code>0 8px 30px</code> (the Foundations family\'s value: dark black at 50%, light <code>--text</code> at 18%).', 'exists (Foundations)'],
    ['<code>--scrim</code>', 'The backdrop: black at 55%. Opaque <code>--bg</code> on a phone.', 'exists (Foundations)'],
    ['<code>--dlg-w-confirm</code>, <code>--dlg-w-form</code>, <code>--dlg-w-browse</code>', '360px, 560px, 880px.', 'new'],
    ['<code>--dlg-pad-x</code>, <code>--dlg-ms</code>, <code>--dlg-max-h</code>', '24px (16px on a phone); 200ms; the screen less 48px.', 'new'],
    ['<code>--z-dialog</code>', 'The layer of a dialog that is not a <code>&lt;dialog&gt;</code>: above the menus, under the toasts (40).', 'exists (Foundations)'],
    ['<code>--bg-section</code>, <code>--border</code>, <code>--text</code>, <code>--text-dim</code>', 'The panel surface, the hairlines, the text.', 'exists'],
    ['<code>--radius-large</code>', 'The dialog\'s corner (none on a phone).', 'exists'],
    ['<code>--btn-h-small</code>', 'The close: 30px.', 'exists (Buttons)'],
  ])}

<h4 class="ds-h4" id="dialogs-markup">Markup contract</h4>
${code(`<!-- a form dialog: a <dialog> opened with showModal(); a size class only for 360 or 880 -->
<dialog class="sdk-dialog" aria-labelledby="t1">            <!-- add sdk-dialog-confirm (360) or sdk-dialog-wide (880) -->
  <div class="sdk-dialog-head">
    <h2 class="sdk-dialog-title" id="t1">Add a place</h2>
    <button type="button" class="sdk-icon-btn btn-quiet btn-small sdk-dialog-close" aria-label="Close">...</button>
  </div>
  <div class="sdk-dialog-body"> ...fields... </div>
  <div class="sdk-dialog-discard" hidden>
    <span class="sdk-dialog-discard-text">Discard your changes?</span>
    <button type="button" class="btn">Keep editing</button><button type="button" class="btn btn-danger">Discard</button>
  </div>
  <div class="sdk-dialog-foot">
    <p class="sdk-form-error" role="alert"></p>              <!-- optional, at the left -->
    <button type="button" class="btn">Cancel</button><button type="submit" class="btn btn-primary">Save</button>
  </div>
</dialog>

<!-- a confirm: role=alertdialog, the line described by aria-describedby; Cancel is first in the DOM and has the focus -->
<dialog class="sdk-dialog sdk-dialog-confirm" role="alertdialog" aria-labelledby="t2" aria-describedby="d2">
  <div class="sdk-dialog-head"><h2 class="sdk-dialog-title" id="t2">Delete this place?</h2> ...close... </div>
  <div class="sdk-dialog-body" id="d2"><p>Louvre museum will be removed from Saturday.</p></div>
  <div class="sdk-dialog-foot"><button class="btn">Cancel</button><button class="btn btn-danger">Delete</button></div>   <!-- the final one: btn-danger solid -->
</dialog>

<!-- not a <dialog>: a layer holds it (the picker's overlay); on a phone the layer is opaque and the dialog fills it -->
<div class="sdk-dialog-layer"><div class="sdk-dialog sdk-dialog-wide" role="dialog" aria-modal="true" aria-labelledby="t3"> ... </div></div>`)}

<h4 class="ds-h4" id="dialogs-widths">Widths</h4>
<p class="ds-desc">The same form dialog at 390 (full screen), 700 and 1280 wide.</p>
<div data-slot="widths"></div>
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + DL_CSS }, o || {}));
    slot('anatomy').appendChild(F(anatomyBody(), 'Dialogs, anatomy'));
    slot('sizes').appendChild(F(sizesBody(), 'Dialogs, three sizes'));
    slot('states').appendChild(F(statesBody(), 'Dialogs, states', { onload: statesReady }));
    slot('confirm').appendChild(F(confirmKindsBody(), 'Dialogs, confirm'));
    slot('two').appendChild(F(twoStepBody(), 'Dialogs, two steps'));
    slot('ctx').appendChild(F(ctxBody(1280, 620), 'Dialogs, in context', { height: 640 }));
    slot('phone').appendChild(F(phoneBody(), 'Dialogs, phone', { pinWidth: 390, height: 720 }));
    slot('stack').appendChild(F(stackBody(), 'Dialogs, stack', { height: 600 }));
    slot('try').appendChild(F(tryBody(), 'Dialogs, try it', { height: 700, onload: tryDemo }));
    slot('alias').appendChild(F(aliasBody(), 'Dialogs, aliases'));
    slot('contrast').appendChild(F(tcBody(), 'Dialogs, contrast', { onload: measureContrast }));
    const ws = mk('div', '');
    for (const w of [390, 700, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(w <= 640 ? F(phoneBody(), `Dialogs at ${w}`, { pinWidth: w, height: 720 }) : F(ctxBody(w, 620), `Dialogs at ${w}`, { pinWidth: w, height: 640 }));
    }
    slot('widths').appendChild(ws);
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'dialogs', covers: ['dialog', 'sheet', 'confirm', 'editor', 'modal', 'scrim'], group: 'Feedback', name: 'Dialogs and sheets', status: 'proposed',
    words: 'dialog dialogs sheet sheets modal editor window set up layout sheet phase sheet background picker confirm styled confirm destructive discard changes scrim backdrop shadow title close footer full screen phone focus trap escape alertdialog',
    render: renderDialogs,
  });
})();
