// The page's own dropdown menu: the host-drawn "..." for whatever a module's header, action bar or toolbar row didn't
// have room for (module-host.js), the canvas's title bar menus (space.js) and the account menu under your picture in
// the primary nav (brand.js). The host's own chrome, so it cannot use a module's host.menu.show (that draws inside the
// module's own frame), but it looks and behaves the same: the .host-menu styles in style.css, under the button that
// opened it, flipped above when there is no room below. Only one is ever open at once, the same rule as host.menu.show.
//
// Keyboard: the first item takes focus when it opens, the arrow keys (and Home, End) move between the items, Enter
// or Space picks, Escape or Tab closes, and Escape (or a pick) puts focus back on the button that opened it.
//
// An item is { label, icon?, regular?, hint?, danger?, disabled?, checked?, badge?, onPick }. `checked` (true or false)
// makes it a checkbox item that says whether it is on (a tool that toggles, folded into the space bar's "..."); `badge`
// is a count shown after its label.
let open = null;

function close({ refocus = false } = {}) {
  if (!open) return;
  const { cleanup, trigger, menu } = open;
  open = null;
  const doc = menu.ownerDocument;
  const hadFocus = menu.contains(doc.activeElement);
  cleanup();
  if (refocus || hadFocus) {
    try { trigger.focus(); } catch { /* not focusable */ }
  }
}

export function closeHostMenu() {
  close();
}

// Opens the menu under `trigger`, or closes it when it is already open from that same trigger.
export function openHostMenu(trigger, items) {
  const reopening = open && open.trigger === trigger;
  close();
  if (reopening || !items || !items.length) return;
  const doc = trigger.ownerDocument;
  const menu = doc.createElement('div');
  menu.className = 'host-menu';
  menu.setAttribute('role', 'menu');
  const rows = [];
  for (const item of items) {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'host-menu-item';
    const checkable = typeof item.checked === 'boolean';
    b.setAttribute('role', checkable ? 'menuitemcheckbox' : 'menuitem');
    if (checkable) b.setAttribute('aria-checked', String(item.checked));
    b.tabIndex = -1;
    b.disabled = Boolean(item.disabled);
    if (item.icon) {
      const i = doc.createElement('i');
      i.className = `fa-${item.regular ? 'regular' : 'solid'} fa-${item.icon} fa-fw`;
      i.setAttribute('aria-hidden', 'true');
      b.appendChild(i);
    }
    const label = doc.createElement('span');
    label.className = 'host-menu-label';
    label.textContent = item.label || item.title || '';
    b.appendChild(label);
    const count = Math.max(0, Math.round(Number(item.badge) || 0));
    if (count) {
      const badge = doc.createElement('span');
      badge.className = 'host-menu-badge';
      badge.textContent = count > 9 ? '9+' : String(count);
      b.appendChild(badge);
    }
    if (checkable) {
      const check = doc.createElement('i');
      check.className = 'fa-solid fa-check fa-fw host-menu-check';
      check.setAttribute('aria-hidden', 'true');
      b.appendChild(check);
    }
    if (item.hint) {
      const hint = doc.createElement('span');
      hint.className = 'host-menu-hint';
      hint.textContent = item.hint;
      b.appendChild(hint);
    }
    if (!item.disabled) {
      b.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        close({ refocus: true });
        item.onPick();
      });
      rows.push(b);
    }
    if (item.danger) b.classList.add('danger');
    menu.appendChild(b);
  }
  // A docked module's own element has no box (display: contents; the column is the grid's).
  // Measure the button in the window, the same way a menu inside a module does, and hang this one under it.
  doc.body.appendChild(menu);
  const view = doc.defaultView;
  const t = trigger.getBoundingClientRect();
  let x = t.left;
  let y = t.bottom + 4;
  if (y + menu.offsetHeight > view.innerHeight) y = t.top - menu.offsetHeight - 4;
  x = Math.max(4, Math.min(x, view.innerWidth - menu.offsetWidth - 4));
  y = Math.max(4, Math.min(y, view.innerHeight - menu.offsetHeight - 4));
  menu.style.left = `${x}px`;
  menu.style.top = `${y}px`;
  const move = (step) => {
    if (!rows.length) return;
    const at = rows.indexOf(doc.activeElement);
    const next = step === 'first' ? 0 : step === 'last' ? rows.length - 1 : (at + step + rows.length) % rows.length;
    rows[at === -1 && step === -1 ? rows.length - 1 : next].focus();
  };
  const onKey = (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close({ refocus: true });
    } else if (e.key === 'Tab') {
      close();
    } else if (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      move(e.key === 'ArrowDown' ? 1 : e.key === 'ArrowUp' ? -1 : e.key === 'Home' ? 'first' : 'last');
    }
  };
  const onOutside = (e) => { if (!menu.contains(e.target) && !trigger.contains(e.target)) close(); };
  // The click that opened this menu has already happened. Listening on the next frame keeps that same
  // click from counting as an outside press and closing the menu before it can be used.
  let listening = false;
  const frame = view.requestAnimationFrame(() => {
    if (!menu.isConnected) return;
    listening = true;
    doc.addEventListener('pointerdown', onOutside, true);
  });
  // Keys from the start, so an Enter that opened the menu can be followed straight away by an arrow.
  doc.addEventListener('keydown', onKey, true);
  trigger.setAttribute('aria-expanded', 'true');
  open = {
    trigger,
    menu,
    cleanup: () => {
      view.cancelAnimationFrame(frame);
      menu.remove();
      trigger.setAttribute('aria-expanded', 'false');
      doc.removeEventListener('keydown', onKey, true);
      if (listening) doc.removeEventListener('pointerdown', onOutside, true);
    },
  };
  if (rows[0]) rows[0].focus();
}
