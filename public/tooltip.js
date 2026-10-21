// The tooltip (design system, Tooltips; styles in public/sdk/system.css, the tooltips block).
//
// One label for the page, moved to the control that asks for it. A control asks with data-tip="Bold" (the same words as its aria-label),
// and data-tip-keys="Ctrl+B" for its shortcut. Text that is cut with an ellipsis can carry data-tip-if-truncated: the label shows only
// while it is cut (give it tabindex="0" so the keyboard can reach it).
//
// It shows after 500 ms of hover, at once on keyboard focus, and on touch after a long press (never on touch hover); it hides on
// Escape, on leaving, on blur, on a press and on scroll. It sits on top of the control, 8px away, and flips to the bottom when the top
// is cut off. The control gets aria-describedby while it shows. A module runs in a shadow root inside the page; events cross it, so one
// listener on the document serves the page and every module.
// A plain script (no import or export), so a page loads it with a module import (brand.js) and a module in a sandboxed frame
// with a <script> the SDK adds (public/sdk/host.js, ensureTooltips). It runs once per window.
(() => {
  if (window.__sdkTooltip) return;
  window.__sdkTooltip = true;
  const DELAY = 500;
  const TOUCH_KEEP = 1200;
  const GAP = 8;
  const EDGE = 4;

  let tip = null;
  let cur = null;
  let timer = 0;
  let touchTimer = 0;
  let lastTouch = 0;

  function label() {
    if (tip) return tip;
    tip = document.createElement('span');
    tip.className = 'sdk-tooltip';
    tip.id = 'sdk-tip';
    tip.setAttribute('role', 'tooltip');
    tip.dataset.arrow = '';
    document.body.appendChild(tip);
    return tip;
  }

  // The control under an event, through shadow roots: the first element on the event's path that asks for a label.
  function asker(e) {
    const path = typeof e.composedPath === 'function' ? e.composedPath() : [];
    for (const n of path) {
      if (n === document || n === window) break;
      if (n instanceof Element && n.hasAttribute('data-tip')) return n;
    }
    return null;
  }

  function place(el) {
    const t = label();
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const box = t.getBoundingClientRect();
    let where = 'top';
    if (r.top - box.height - GAP < EDGE) where = 'bottom';
    if (where === 'bottom' && r.bottom + box.height + GAP > vh - EDGE && r.top - box.height - GAP >= EDGE) where = 'top';
    const left = Math.max(EDGE, Math.min(r.left + r.width / 2 - box.width / 2, vw - box.width - EDGE));
    t.style.left = `${left}px`;
    t.style.top = `${where === 'top' ? r.top - box.height - GAP : r.bottom + GAP}px`;
    t.style.setProperty('--arrow-x', `${r.left + r.width / 2 - left}px`);
    t.dataset.placement = where;
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  function show(el) {
    if (!el.isConnected) return;
    if (el.hasAttribute('data-tip-if-truncated') && el.scrollWidth <= el.clientWidth) return;
    const words = el.getAttribute('data-tip');
    if (!words) return;
    const t = label();
    hide();
    cur = el;
    t.innerHTML = esc(words) + (el.dataset.tipKeys ? `<kbd>${esc(el.dataset.tipKeys)}</kbd>` : '');
    place(el);
    el.setAttribute('aria-describedby', 'sdk-tip');
    t.setAttribute('data-show', '');
  }

  function hide() {
    clearTimeout(timer);
    clearTimeout(touchTimer);
    if (cur) cur.removeAttribute('aria-describedby');
    if (tip) tip.removeAttribute('data-show');
    cur = null;
  }

  document.addEventListener('pointerover', (e) => {
    const el = asker(e);
    if (!el || el === cur) return;
    if (e.pointerType === 'touch') return; // never on touch hover
    if (performance.now() - lastTouch < 800) return; // the mouse events a touch makes after it
    hide();
    timer = setTimeout(() => show(el), DELAY);
  });
  document.addEventListener('pointerout', (e) => {
    const el = asker(e);
    if (!el) return;
    if (el.matches(':hover')) return; // still over it (moved between its parts)
    if (el === cur || timer) hide();
  });
  document.addEventListener('focusin', (e) => {
    const el = asker(e);
    if (!el) return;
    // Keyboard focus only: a click focuses a button too, and must not show a label.
    const target = e.composedPath()[0];
    if (target instanceof Element && target.matches(':focus-visible')) show(el);
  });
  document.addEventListener('focusout', hide);
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && cur) hide(); }, true);
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch') {
      lastTouch = performance.now();
      const el = asker(e);
      clearTimeout(touchTimer);
      if (el) touchTimer = setTimeout(() => show(el), DELAY);
    } else hide();
  }, true);
  const lift = () => {
    clearTimeout(touchTimer);
    if (cur) setTimeout(hide, TOUCH_KEEP);
  };
  document.addEventListener('pointerup', lift);
  document.addEventListener('pointercancel', lift);
  window.addEventListener('scroll', hide, true);
  window.addEventListener('resize', hide);
})();
