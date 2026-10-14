// The pure rules of a module window's "+" (host.add.set) and its status bar (host.status.set): cleaning what a module
// sends, whether the "+" runs its one action or opens a menu, the menu's entries in the shared menu's shape
// (public/host-menu.js, with categories as flyouts), and the status bar's text and its polite, debounced read-out.
// No DOM and no imports: public/module-host.js draws with these, and tools/check-module-chrome.mjs tests them.
// See documentation/plans/plan-module-titlebar-add.md, "The contract".

export const ADD_LIMITS = { top: 8, perCategory: 12, leaves: 40, label: 40 };
export const STATUS_LIMITS = { items: 4, text: 60, title: 200 };
export const STATUS_QUIET_MS = 1500;

const ICON = /^[a-z0-9-]{1,40}$/;
const TINT = /^(gold|blue|green|teal|purple|red|orange|pink)$/;
const str = (v, n) => String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, n);

// What host.add.set sent, cleaned: a leaf { id, label, icon?, tint?, hint?, disabled }, a category
// { label, icon?, items: [leaf...] } (one level; a category inside one is dropped), or { divider: true }. At most 8
// top-level entries, 12 per category and 40 leaves in all; the rest is dropped. A category with one leaf is that leaf;
// an empty one is dropped. No divider first, last or twice in a row.
export function cleanAddEntries(entries) {
  let leaves = 0;
  const leaf = (e) => {
    if (!e || typeof e !== 'object' || e.items || e.divider) return null;
    const id = str(e.id, 40);
    const label = str(e.label, ADD_LIMITS.label);
    if (!id || !label || leaves >= ADD_LIMITS.leaves) return null;
    leaves += 1;
    const out = { id, label, disabled: Boolean(e.disabled) };
    if (ICON.test(e.icon || '')) out.icon = e.icon;
    if (TINT.test(e.tint || '')) out.tint = e.tint;
    const hint = str(e.hint, 40);
    if (hint) out.hint = hint;
    return out;
  };
  const out = [];
  const counted = () => out.filter((x) => !x.divider).length;
  for (const e of Array.isArray(entries) ? entries : []) {
    if (counted() >= ADD_LIMITS.top) break;
    if (!e || typeof e !== 'object') continue;
    if (e.divider) {
      if (out.length && !out[out.length - 1].divider) out.push({ divider: true });
      continue;
    }
    if (Array.isArray(e.items)) {
      const label = str(e.label, ADD_LIMITS.label);
      if (!label) continue;
      const items = [];
      for (const s of e.items) {
        if (items.length >= ADD_LIMITS.perCategory) break;
        const l = leaf(s);
        if (l) items.push(l);
      }
      if (!items.length) continue;
      if (items.length === 1) { out.push(items[0]); continue; }
      const cat = { label, items };
      if (ICON.test(e.icon || '')) cat.icon = e.icon;
      out.push(cat);
      continue;
    }
    const l = leaf(e);
    if (l) out.push(l);
  }
  while (out.length && out[out.length - 1].divider) out.pop();
  return out;
}

// The old action bar (host.bar.set), folded into the "+": each button a plain leaf, the primary ones first and the rest in
// their order (10 at most, as the bar took). A quick-add item is a leaf too (its label, else its placeholder, else "Add";
// icon `plus` unless it gave one); `quick` lists their ids, whose pick sends { id, value: '' }. `overflow` and `iconOnly`
// mean nothing in a menu and are dropped. Returns { entries, quick }; entries go through cleanAddEntries as any others.
export function foldBarItems(items) {
  const clean = (Array.isArray(items) ? items : []).slice(0, 10).map((i) => {
    const quick = i?.type === 'quickadd';
    const icon = ICON.test(i?.icon || '') ? i.icon : quick ? 'plus' : '';
    const label = str(i?.label, ADD_LIMITS.label) || (quick ? str(i?.placeholder, ADD_LIMITS.label) || 'Add' : '');
    return { id: str(i?.id, 40), label, icon, primary: Boolean(i?.primary), disabled: Boolean(i?.disabled), quick };
  }).filter((i) => i.id && i.label);
  const ordered = [...clean.filter((i) => i.primary), ...clean.filter((i) => !i.primary)];
  return {
    entries: ordered.map(({ id, label, icon, disabled }) => ({ id, label, disabled, ...(icon ? { icon } : {}) })),
    quick: new Set(ordered.filter((i) => i.quick).map((i) => i.id)),
  };
}

// What the "+" does with cleaned entries: { kind: 'none' } (no "+"), { kind: 'direct', leaf } (exactly one leaf and no
// category: it runs at once, its label the tooltip and the accessible name) or { kind: 'menu', label: 'Add' }.
export function addPlan(clean) {
  const real = (clean || []).filter((x) => !x.divider);
  if (!real.length) return { kind: 'none' };
  if (real.length === 1 && !real[0].items) return { kind: 'direct', leaf: real[0] };
  return { kind: 'menu', label: 'Add' };
}

// The menu's entries in the shared menu's shape: a category's `items` open as a flyout (a drill-in on a phone).
// `onPick(id)` runs for a leaf.
export function addMenuItems(clean, onPick) {
  const leafItem = (l) => ({
    label: l.label,
    ...(l.icon ? { icon: l.icon } : {}),
    ...(l.tint ? { tint: l.tint } : {}),
    ...(l.hint ? { hint: l.hint } : {}),
    disabled: l.disabled,
    onPick: () => onPick(l.id),
  });
  return (clean || []).map((e) => {
    if (e.divider) return { divider: true };
    if (e.items) return { label: e.label, ...(e.icon ? { icon: e.icon } : {}), items: e.items.map(leafItem) };
    return leafItem(e);
  });
}

// What host.status.set sent, cleaned: up to 4 items { text, icon?, chip, title, quiet, end }, text up to 60 characters,
// `title` (the tooltip) the text unless given. At most one `end` item (the first marked), and it goes last.
export function cleanStatusItems(items) {
  const out = [];
  let end = null;
  for (const i of Array.isArray(items) ? items : []) {
    if (out.length + (end ? 1 : 0) >= STATUS_LIMITS.items) break;
    if (!i || typeof i !== 'object') continue;
    const text = str(i.text, STATUS_LIMITS.text);
    if (!text) continue;
    const item = { text, chip: Boolean(i.chip), title: str(i.title, STATUS_LIMITS.title) || text, quiet: Boolean(i.quiet), end: false };
    if (ICON.test(i.icon || '')) item.icon = i.icon;
    if (i.end && !end) { item.end = true; end = item; } else out.push(item);
  }
  return end ? [...out, end] : out;
}

// The same items as last time draw nothing.
export const statusKey = (clean) => JSON.stringify(clean || []);
// The bar's own tooltip: every item's text. What a screen reader hears: the items that are not quiet.
export const statusTitle = (clean) => (clean || []).map((i) => i.text).join(' · ');
export const statusSpoken = (clean) => (clean || []).filter((i) => !i.quiet).map((i) => i.text).join(' · ');

// How the items give way when the bar is `over` pixels too narrow: the last before the `end` item first, down to
// nothing, then the one before it, and so on; the `end` item never. `items` are [{ w, end }] (each item's own width);
// the answer is each item's widest (whole pixels, cut with an ellipsis), or null where it keeps its own width.
export function statusFit(items, over) {
  const out = (items || []).map(() => null);
  let left = Math.max(0, Number(over) || 0);
  for (let k = out.length - 1; k >= 0 && left > 0; k -= 1) {
    if (items[k].end) continue;
    const w = Math.max(0, Number(items[k].w) || 0);
    const keep = Math.max(0, Math.floor(w - left));
    out[k] = keep;
    left -= w - keep;
  }
  return out;
}

// The polite read-out: `write(text)` gets the spoken text only after `delay` without a change, never for the first
// draw, and only when it differs from what was last read out. `setTimer` and `clearTimer` are the window's (or a test's).
export function createAnnouncer({ write, delay = STATUS_QUIET_MS, setTimer = setTimeout, clearTimer = clearTimeout }) {
  let first = true;
  let last = '';
  let timer = null;
  return {
    update(text) {
      const t = String(text || '');
      if (first) { first = false; last = t; return; }
      if (timer !== null) clearTimer(timer);
      timer = setTimer(() => {
        timer = null;
        if (!t || t === last) return; // nothing to say (the bar went away), or already said
        last = t;
        write(t);
      }, delay);
    },
    stop() {
      if (timer !== null) clearTimer(timer);
      timer = null;
    },
  };
}

// Which module is on top at a point (issue #60). Each candidate is { id, rect, z, order, visible, blocks }: a module
// frame, or a `blocks` cover (a module window's own titlebar, toolbar or status bar, a composite page's frame) that
// takes a drop without passing it on. `z` is how high it paints at that point (the host reads it from the page's own
// stacking, document.elementsFromPoint); `order` breaks a tie, the later one on top. A hidden one, or one the point
// is not inside, never wins. Answers the topmost candidate, or null when nothing is there.
export function topmostAt(candidates, x, y) {
  let best = null;
  for (const c of candidates || []) {
    if (!c || c.visible === false || !c.rect) continue;
    const r = c.rect;
    if (!(x >= r.left && x < r.right && y >= r.top && y < r.bottom)) continue;
    if (!best || c.z > best.z || (c.z === best.z && (c.order || 0) > (best.order || 0))) best = c;
  }
  return best;
}

// A toolbar row drawn again keeps the keyboard where it was (issue #155): each drawn control carries a key (its
// item id, and the choice's id inside a switch), read before the row is cleared and found again after it is built.
export const toolbarKey = (kind, id, choice = '') => `${kind}:${id}${choice === '' ? '' : `:${choice}`}`;
export function focusedToolbarKey(row) {
  const active = row?.ownerDocument?.activeElement;
  return active && active !== row && row.contains(active) ? active.dataset?.tbKey || null : null;
}
export function restoreToolbarFocus(row, key) {
  if (!key) return false;
  for (const el of row.querySelectorAll('[data-tb-key]')) {
    if (el.dataset.tbKey !== key || el.disabled) continue;
    el.focus({ preventScroll: true });
    return true;
  }
  return false;
}
