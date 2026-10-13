// The page's own dropdown menu: the host-drawn "..." for whatever a module's header, action bar or toolbar row didn't
// have room for (module-host.js), the canvas's title bar menus and the Layout menu (space.js, canvas.js) and the account
// menu under your picture in the primary nav (brand.js). The host's own chrome, so it cannot use a module's
// host.menu.show (that draws inside the module's own frame), but it looks and behaves the same: the .host-menu styles
// in style.css, under the button that opened it, flipped above when there is no room below. Only one is ever open at
// once, the same rule as host.menu.show.
//
// Keyboard: the first item takes focus when it opens, the arrow keys (and Home, End) move between the items, Enter
// or Space picks, Escape or Tab closes, and Escape (or a pick) puts focus back on the button that opened it. Right
// moves from a row to its "..." (`more`), Left back; Enter on the "..." opens that row's own entries in the same menu,
// with Back first.
//
// An item is { label, icon?, regular?, tint?, hint?, danger?, disabled?, checked?, toggle?, radio?, keepOpen?, badge?,
// tag?, mark?, more?, onPick }. `checked` (true or false) makes it a checkbox item that says whether it is on (a tool
// that toggles, folded into the space bar's "..."); with `toggle: true` it is drawn as a switch instead (the same switch
// as the Show list's) and the menu stays open as it flips, so several can be flipped in a row; with `radio: true` it is
// one of a set, a check on the one chosen. `keepOpen: true` keeps the menu open after a pick and draws it again (the
// items given as a function are asked again, so what the pick changed shows). `badge` is a count shown after its
// label; `tag` a small word after it (Default); `mark` a small accent icon after it (a favorite's heart). `icon` is a
// Font Awesome name, or a whole class list (a module's own icon); `tint` colours it, one of the eight tint names (a
// module's colour, gold for the AI), as a message's icon is. `more` (a list of items, or a function giving one) puts a
// "..." at the row's end whose entries replace the menu's, with Back first.
// `items` (or `submenu`; a list of items, or a function giving one) makes the row a category: a caret at its end, its
// entries in a flyout beside the row (on hover after a short wait, on a click or tap, on Right or Enter; Left or Escape
// closes just the flyout, the keyboard back on its row; it flips to the other side or shifts to stay on screen). On a
// phone or a narrow window (640px and below) a category drills in instead, as `more` does, with Back first. One level:
// a category inside a flyout is not drawn as one. The rules are menu-flyout.js's.
// { divider: true } draws a line between two runs of entries (the space switcher's "+ New"). { heading: 'Show' } is a
// section's heading over the entries after it. { element } puts the page's own element in the menu (a note that is read
// out as it changes, a slider), not an entry: the keys in it are its own.
// `items` may be a function: it is called as the menu opens and again after a pick that keeps it open.
import { submenuStyle, flyoutPlace, inSafeZone, menuStep, menuKeyAction } from '/menu-flyout.js';

let open = null;

function close({ refocus = false } = {}) {
  if (!open) return;
  const { cleanup, trigger, menu, flyout } = open;
  open = null;
  const doc = menu.ownerDocument;
  const flyEl = flyout ? flyout() : null;
  const hadFocus = menu.contains(doc.activeElement) || Boolean(flyEl && flyEl.contains(doc.activeElement));
  cleanup();
  if (refocus || hadFocus) {
    try { trigger.focus(); } catch { /* not focusable */ }
  }
}

export function closeHostMenu() {
  close();
}

// Whether the menu open now was opened from `trigger` (any trigger when none is given).
export function hostMenuOpen(trigger) {
  return Boolean(open) && (!trigger || open.trigger === trigger);
}

// The open menu drawn again from its items (given as a function), the keyboard kept on the same row. For a change
// made outside the menu while it is open (the list of layouts arriving, a note written). Nothing when none is open.
export function refreshHostMenu() {
  if (!open || !open.redraw) return;
  open.redraw();
}

const TINT = /^(gold|blue|green|teal|purple|red|orange|pink)$/;

function iconEl(doc, icon, regular, tint) {
  const i = doc.createElement('i');
  i.className = String(icon).includes(' ') ? `${icon} fa-fw` : `fa-${regular ? 'regular' : 'solid'} fa-${icon} fa-fw`;
  i.setAttribute('aria-hidden', 'true');
  if (TINT.test(tint || '')) i.dataset.tint = tint;
  return i;
}

// A category's entries: `items` or `submenu`, a list or a function giving one.
const entriesOf = (item) => {
  const e = item && (item.items || item.submenu);
  const list = typeof e === 'function' ? e() : e;
  return Array.isArray(list) ? list.filter(Boolean) : null;
};
const isCategory = (item) => Boolean(item && !item.disabled && (item.items || item.submenu));

// Opens the menu under `trigger`, or closes it when it is already open from that same trigger.
export function openHostMenu(trigger, items) {
  const reopening = open && open.trigger === trigger;
  close();
  const list = typeof items === 'function' ? items() : items;
  if (reopening || !list || !list.length) return;
  const doc = trigger.ownerDocument;
  const view = doc.defaultView;
  const menu = doc.createElement('div');
  menu.className = 'host-menu';
  menu.setAttribute('role', 'menu');
  let rows = []; // the entries the arrow keys move between, in order
  let sub = null; // { items, back, label? } while a row's "..." entries (or a drilled-in category's) are shown
  let fly = null; // { el, rows, row, exit } while a category's flyout is open
  let hoverTimer = 0;
  let frame = 0;
  let listening = false;

  const place = () => {
    const t = trigger.getBoundingClientRect();
    let x = t.left;
    let y = t.bottom + 4;
    if (y + menu.offsetHeight > view.innerHeight) y = t.top - menu.offsetHeight - 4;
    x = Math.max(4, Math.min(x, view.innerWidth - menu.offsetWidth - 4));
    y = Math.max(4, Math.min(y, view.innerHeight - menu.offsetHeight - 4));
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  };

  // A pick: the menu closes first (focus back on the button), unless the item keeps it open, when it is drawn again
  // once the pick has run, the keyboard on the same row. A pick in a flyout always closes the whole menu.
  const pick = (item, at, inFlyout = false) => {
    if (inFlyout) { close({ refocus: true }); item.onPick?.(); return; }
    if (item.keepOpen || item.toggle) {
      const result = item.onPick?.();
      const again = () => { if (open && open.menu === menu) draw({ focus: at }); };
      if (result && typeof result.then === 'function') result.then(again, again); else again();
      return;
    }
    close({ refocus: true });
    item.onPick?.();
  };

  // --- the flyout -----------------------------------------------------------------------------------------------
  const drills = () => submenuStyle({ width: view.innerWidth }) === 'drill';
  const closeFly = ({ refocus = false } = {}) => {
    view.clearTimeout(hoverTimer);
    if (!fly) return;
    const { el, row } = fly;
    fly = null;
    el.remove();
    row.setAttribute('aria-expanded', 'false');
    row.classList.remove('open');
    if (refocus) row.focus();
  };
  const openFly = (item, row, { focus = false } = {}) => {
    view.clearTimeout(hoverTimer);
    if (fly && fly.row === row) { if (focus && fly.rows[0]) fly.rows[0].focus(); return; }
    closeFly();
    const entries = entriesOf(item);
    if (!entries || !entries.length) return;
    const el = doc.createElement('div');
    el.className = 'host-menu host-menu-flyout';
    el.setAttribute('role', 'menu');
    el.setAttribute('aria-label', item.label || '');
    const flyRows = [];
    for (const entry of entries) addEntry(el, entry, flyRows, { inFlyout: true });
    doc.body.appendChild(el);
    const m = menu.getBoundingClientRect();
    const r = row.getBoundingClientRect();
    const at = flyoutPlace({ row: { left: m.left, right: m.right, top: r.top }, size: { w: el.offsetWidth, h: el.offsetHeight }, view: { w: view.innerWidth, h: view.innerHeight } });
    el.style.left = `${at.x}px`;
    el.style.top = `${at.y}px`;
    el.dataset.side = at.side;
    // The pointer reaching the flyout keeps it, whatever row it crossed on the way.
    el.addEventListener('pointerenter', () => view.clearTimeout(hoverTimer));
    row.setAttribute('aria-expanded', 'true');
    row.classList.add('open');
    fly = { el, rows: flyRows, row, side: at.side, exit: null };
    if (focus && flyRows[0]) flyRows[0].focus();
  };
  // The pointer over a row of the menu: a category's flyout opens after a short wait; another row closes an open
  // flyout, later while the pointer is on its way to the flyout (it may only be crossing this row).
  const hover = (item, b, event) => {
    if (event.pointerType && event.pointerType !== 'mouse') return; // a touch opens on the tap
    if (sub || drills()) return;
    view.clearTimeout(hoverTimer);
    if (fly && fly.row === b) return;
    const onWay = fly && inSafeZone({ x: event.clientX, y: event.clientY }, fly.exit, fly.el.getBoundingClientRect(), fly.side);
    const wait = onWay ? 320 : 120;
    hoverTimer = view.setTimeout(() => {
      if (!open || open.menu !== menu) return;
      if (isCategory(item)) openFly(item, b); else closeFly();
    }, wait);
  };

  // One entry into `into` (the menu, or a flyout), its keyboard row pushed onto `rowList`.
  const addEntry = (into, item, rowList, { inFlyout = false, moreOf = null } = {}) => {
    if (!item) return;
    if (item.divider) {
      const line = doc.createElement('div');
      line.className = 'host-menu-divider';
      line.setAttribute('role', 'separator');
      into.appendChild(line);
      return;
    }
    if (item.heading) {
      const h = doc.createElement('div');
      h.className = 'host-menu-heading';
      h.setAttribute('role', 'presentation');
      h.textContent = item.heading;
      into.appendChild(h);
      return;
    }
    if (item.element) {
      const holder = doc.createElement('div');
      holder.className = 'host-menu-row';
      holder.setAttribute('role', 'presentation');
      holder.appendChild(item.element);
      into.appendChild(holder);
      return;
    }
    const category = !inFlyout && isCategory(item);
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = 'host-menu-item';
    const checkable = typeof item.checked === 'boolean';
    b.setAttribute('role', item.radio ? 'menuitemradio' : checkable ? 'menuitemcheckbox' : 'menuitem');
    if (checkable) b.setAttribute('aria-checked', String(item.checked));
    if (category) {
      b.setAttribute('aria-haspopup', 'menu');
      b.setAttribute('aria-expanded', 'false');
      b.classList.add('host-menu-category');
    }
    if (item.tip) b.title = item.tip;
    b.tabIndex = -1;
    b.disabled = Boolean(item.disabled);
    if (checkable && item.toggle) {
      const sw = doc.createElement('span');
      sw.className = 'host-menu-switch';
      sw.setAttribute('aria-hidden', 'true');
      b.appendChild(sw);
    }
    if (item.icon) b.appendChild(iconEl(doc, item.icon, item.regular, item.tint));
    const label = doc.createElement('span');
    label.className = 'host-menu-label';
    label.textContent = item.label || item.title || '';
    b.appendChild(label);
    if (item.mark) {
      const mark = iconEl(doc, item.mark, false, null);
      mark.classList.add('host-menu-mark');
      b.appendChild(mark);
    }
    if (item.tag) {
      const tag = doc.createElement('span');
      tag.className = 'host-menu-tag';
      tag.textContent = item.tag;
      b.appendChild(tag);
    }
    const count = Math.max(0, Math.round(Number(item.badge) || 0));
    if (count) {
      const badge = doc.createElement('span');
      badge.className = 'host-menu-badge';
      badge.textContent = count > 9 ? '9+' : String(count);
      b.appendChild(badge);
    }
    if (checkable && !item.toggle) {
      const check = doc.createElement('i');
      check.className = 'fa-solid fa-check fa-fw host-menu-check';
      check.setAttribute('aria-hidden', 'true');
      b.appendChild(check);
    }
    if (category) {
      const caret = iconEl(doc, 'chevron-right', false, null);
      caret.classList.add('host-menu-caret');
      b.appendChild(caret);
    }
    if (item.hint) {
      const hint = doc.createElement('span');
      hint.className = 'host-menu-hint';
      hint.textContent = item.hint;
      b.appendChild(hint);
    }
    if (item.danger) b.classList.add('danger');
    if (!item.disabled) {
      b.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (category) {
          // A phone or a narrow window drills in; else the flyout, the keyboard in it when a key pressed the row.
          if (drills()) { sub = { items: entriesOf(item) || [], back: rows.indexOf(b), label: item.label }; draw({ focus: 1 }); return; }
          openFly(item, b, { focus: event.detail === 0 });
          return;
        }
        pick(item, rowList.indexOf(b), inFlyout);
      });
      rowList.push(b);
    }
    if (!inFlyout) {
      b.addEventListener('pointerenter', (event) => hover(item, b, event));
      if (category) b.addEventListener('pointerleave', (event) => { if (fly && fly.row === b) fly.exit = { x: event.clientX, y: event.clientY }; });
    }
    if (item.more && !item.disabled && moreOf) {
      const row = doc.createElement('div');
      row.className = 'host-menu-pair';
      row.setAttribute('role', 'presentation');
      const more = doc.createElement('button');
      more.type = 'button';
      more.className = 'host-menu-more';
      more.setAttribute('role', 'menuitem');
      more.setAttribute('aria-haspopup', 'menu');
      more.setAttribute('aria-label', `More for ${item.label || ''}`);
      more.title = 'More';
      more.tabIndex = -1;
      more.appendChild(iconEl(doc, 'ellipsis-vertical', false, null));
      more.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const entries = typeof item.more === 'function' ? item.more() : item.more;
        if (!entries || !entries.length) return;
        sub = { items: entries, back: rows.indexOf(b) };
        draw({ focus: 1 });
      });
      moreOf.set(b, more);
      row.append(b, more);
      into.appendChild(row);
    } else {
      into.appendChild(b);
    }
  };

  // Draw the entries (`list`, or the sub-list's with Back first) into the menu. `focus`: the row to put the keyboard
  // on, by its place among the rows.
  const draw = ({ focus = 0 } = {}) => {
    closeFly();
    const back = sub ? [{ icon: 'arrow-left', label: 'Back', onPick: () => { const at = sub.back; sub = null; draw({ focus: at }); }, keepOpen: true }, ...(sub.label ? [{ heading: sub.label }] : [])] : [];
    const current = sub ? [...back, ...sub.items] : (typeof items === 'function' ? items() : list);
    const had = rows.indexOf(doc.activeElement);
    const want = Number.isFinite(focus) ? focus : had;
    menu.replaceChildren();
    rows = [];
    const moreOf = new Map(); // a row -> its "..." button
    for (const item of current) addEntry(menu, item, rows, { moreOf });
    menu.moreOf = moreOf;
    place();
    const at = Math.max(0, Math.min(rows.length - 1, want));
    if (rows[at]) rows[at].focus();
  };

  const move = (step) => {
    const inFly = fly && fly.el.contains(doc.activeElement);
    const list = inFly ? fly.rows : rows;
    if (!list.length) return;
    const active = doc.activeElement;
    const fromMore = inFly ? null : [...menu.moreOf].find(([, m]) => m === active);
    const at = fromMore ? list.indexOf(fromMore[0]) : list.indexOf(active);
    const next = menuStep(list.length, at, step);
    if (list[next]) list[next].focus();
  };
  const categoryOf = (b) => {
    if (!b || !rows.includes(b)) return null;
    return b.classList.contains('host-menu-category') ? b : null;
  };
  const onKey = (e) => {
    if (e.target && e.target !== menu && menu.contains(e.target) && /^(INPUT|SELECT|TEXTAREA)$/.test(e.target.tagName) && e.key !== 'Escape' && e.key !== 'Tab') return; // a slider's own keys
    const inFlyout = Boolean(fly && fly.el.contains(doc.activeElement));
    const onCategory = Boolean(categoryOf(doc.activeElement));
    const action = menuKeyAction(e.key, { inFlyout, onCategory, drilled: Boolean(sub && sub.label) });
    if (action === 'close') {
      if (e.key === 'Escape') { e.stopPropagation(); close({ refocus: true }); } else close();
    } else if (action === 'next' || action === 'prev' || action === 'first' || action === 'last') {
      e.preventDefault();
      move(action === 'next' ? 1 : action === 'prev' ? -1 : action);
    } else if (action === 'open') {
      e.preventDefault();
      doc.activeElement.click(); // a click with no pointer: the flyout takes the keyboard, or the category drills in
    } else if (action === 'back') {
      e.preventDefault();
      e.stopPropagation();
      if (inFlyout) closeFly({ refocus: true });
      else if (sub) { const at = sub.back; sub = null; draw({ focus: at }); }
    } else if (e.key === 'ArrowRight') {
      const more = menu.moreOf.get(doc.activeElement);
      if (more) { e.preventDefault(); more.focus(); }
    } else if (e.key === 'ArrowLeft') {
      const pair = [...menu.moreOf].find(([, m]) => m === doc.activeElement);
      if (pair) { e.preventDefault(); pair[0].focus(); }
    }
  };
  const onOutside = (e) => { if (!menu.contains(e.target) && !trigger.contains(e.target) && !(fly && fly.el.contains(e.target))) close(); };

  doc.body.appendChild(menu);
  // The click that opened this menu has already happened. Listening on the next frame keeps that same
  // click from counting as an outside press and closing the menu before it can be used.
  frame = view.requestAnimationFrame(() => {
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
    redraw: typeof items === 'function' ? () => draw({ focus: NaN }) : null,
    flyout: () => (fly ? fly.el : null),
    cleanup: () => {
      view.cancelAnimationFrame(frame);
      closeFly();
      menu.remove();
      trigger.setAttribute('aria-expanded', 'false');
      doc.removeEventListener('keydown', onKey, true);
      if (listening) doc.removeEventListener('pointerdown', onOutside, true);
    },
  };
  draw({ focus: 0 });
}
