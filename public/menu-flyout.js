// The pure rules of a menu's flyout (a category's entries opened beside its row): whether a category flies out or drills
// in, where its flyout goes, whether the pointer is on its way to it, and what a key does. Used by the page's shared menu
// (public/host-menu.js); the SDK's host.menu.show (public/sdk/host.js) carries a copy of the block between the markers,
// kept the same by tools/check-host-menu.mjs, which also tests these.

// --- menu-flyout ---
// A category's entries fly out beside its row, or drill in (the same menu shows them, Back first) on a phone or a narrow
// window (640px and below). In a module's frame the frame's own width is the module's, not the window's: there it drills
// in only on a touch screen, or when the module has no room for the menu and its flyout side by side.
const MENU_NARROW = 640;
function submenuStyle({ width = 0, framed = false, touch = false, boxWidth = Infinity, need = 0 } = {}) {
  if (width > MENU_NARROW) return 'flyout';
  if (!framed) return 'drill';
  return touch || boxWidth < need ? 'drill' : 'flyout';
}

// Where a flyout goes: beside its menu (`row`: the menu's left and right, the row's top), to the right when it fits, else
// to the left, else on the side with more room and shifted to stay inside `view` ({ w, h }). Its first entry is level
// with its row (both menus have 4px of padding). Answers { x, y, side }.
function flyoutPlace({ row, size, view, gap = 2, margin = 4 }) {
  const fitsRight = row.right + gap + size.w <= view.w - margin;
  const fitsLeft = row.left - gap - size.w >= margin;
  const side = fitsRight ? 'right' : fitsLeft ? 'left' : view.w - row.right >= row.left ? 'right' : 'left';
  let x = side === 'right' ? row.right + gap : row.left - gap - size.w;
  x = Math.max(margin, Math.min(x, view.w - size.w - margin));
  const y = Math.max(margin, Math.min(row.top - 4, view.h - size.h - margin));
  return { x, y, side };
}

// Whether the pointer at `p` is on its way from `from` (where it left the category's row) to the open flyout (`rect`, on
// `side` of the menu): inside the triangle from that point to the flyout's near edge. A row crossed on the way does not
// close the flyout then.
function inSafeZone(p, from, rect, side) {
  if (!p || !from || !rect) return false;
  const edge = side === 'left' ? rect.right : rect.left;
  const b = { x: edge, y: rect.top };
  const c = { x: edge, y: rect.bottom };
  const s = (p1, p2, p3) => (p1.x - p3.x) * (p2.y - p3.y) - (p2.x - p3.x) * (p1.y - p3.y);
  const d1 = s(p, from, b);
  const d2 = s(p, b, c);
  const d3 = s(p, c, from);
  return !((d1 < 0 || d2 < 0 || d3 < 0) && (d1 > 0 || d2 > 0 || d3 > 0));
}

// The row the arrow keys go to among `count` rows from `at` (-1: none has the keyboard): 1 or -1, around the ends, or
// 'first' and 'last' (Home, End).
function menuStep(count, at, step) {
  if (!count) return -1;
  if (step === 'first') return 0;
  if (step === 'last') return count - 1;
  if (at < 0) return step < 0 ? count - 1 : 0;
  return (at + step + count) % count;
}

// What a key does in a menu with categories: 'next', 'prev', 'first', 'last' (move), 'open' (a category's entries),
// 'back' (close the flyout, or leave a drilled-in category, the keyboard back on its row), 'close' (the whole menu), or
// null (the key is not the menu's: Enter and Space press the row itself).
function menuKeyAction(key, { inFlyout = false, onCategory = false, drilled = false } = {}) {
  if (key === 'ArrowDown') return 'next';
  if (key === 'ArrowUp') return 'prev';
  if (key === 'Home') return 'first';
  if (key === 'End') return 'last';
  if (key === 'ArrowRight') return onCategory && !inFlyout ? 'open' : null;
  if (key === 'ArrowLeft') return inFlyout || drilled ? 'back' : null;
  if (key === 'Escape') return inFlyout ? 'back' : 'close';
  if (key === 'Tab') return 'close';
  return null;
}
// --- end menu-flyout ---

export { MENU_NARROW, submenuStyle, flyoutPlace, inSafeZone, menuStep, menuKeyAction };
