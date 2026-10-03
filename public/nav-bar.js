// The registry behind both nav bars (documentation/plans/plan-nav.md, "Modules register into the bars";
// documentation/architecture/architecture-navigation.md). The primary nav (brand.js) and the secondary (space.js) each
// attach their two zones here (plan-two-zone-nav.md: a left zone and a right zone, no middle) and register their own
// controls as tools; a module's tools arrive through
// module-host.js under the module's own namespace. One drawing path: the host draws every tool and owns its look, so a
// module never hands over markup, and the page's own controls are registrations of the same shape as a module's.
//
// A tool is { id, bar: 'primary' | 'secondary', zone: 'left' | 'right', icon, label, title?, order?, group?,
// groupOrder?, href? | onClick?, visible?, toggleable?, active?, badge? }, plus, for the page's own tools only,
// `phone` (where it goes on a phone: 'bar', a tool that stays in the bar instead of folding into the menu, the top bar's
// bell and the space bar's Leave and Rejoin call; 'popout', a space bar tool hidden on a phone and in the "..." only in a
// narrow popped-out window, Full screen and Pop out; see phoneZones() and phoneFold()), `short` (a word shown under the
// icon where the space bar is the phone's tab bar: Rejoin call's "Rejoin"), `activeLabel` (what a toggle's entry in the
// "..." reads while it is on: Pop out's "Pop it back in"),
// `element` (an element the registry places and orders but does not draw: the snap slider, the clock, your picture),
// `labelled` (drawn as a small text button with its icon, not an icon alone: Pull participants back) and `activeIcon`
// (the icon a toggle shows while it is on: full screen's compress). A secondary left-zone tool may also give `fit(avail)`:
// the fold (below) calls it with the width it may take before anything folds (fitWidth), and the tool shrinks to fit
// (Online, who is here: its names become the count, then portraits drop, then it shows only the short count). `register()` returns the element drawn, which lives
// until `unregister()`, so the page may mark it (a data attribute the overlay opener looks for).
//
// The pure parts (the bands, the sort, the visibility rule, the cleaning of a module's registration, the phone's fold
// of the space bar) touch no document,
// so tools/check-nav.mjs runs them in node.

const BARS = ['primary', 'secondary'];
const ZONES = ['left', 'right'];

// Where an order lands: the system's core tools first, then its secondary and utility ones, a module's own after
// them, and 999 for the one thing that goes last (Leave). Nobody coordinates numbers across modules: a module's
// orders are clamped into its band by cleanModuleTools.
export const BANDS = {
  core: [1, 10],
  secondary: [11, 50],
  utility: [51, 100],
  module: [101, 998],
  last: [999, 999],
};
export const DEFAULT_ORDER = 500; // the middle of the module band, for a tool that names none
export function bandOf(order) {
  const n = Number(order);
  for (const [name, [lo, hi]] of Object.entries(BANDS)) if (n >= lo && n <= hi) return name;
  return null;
}

// `visible` is a boolean or a function; left out means shown (and other code may still toggle the element's own
// `hidden`, which the registry then leaves alone). A function that throws counts as shown, so a bug in it never
// hides a control.
export function isVisible(tool) {
  if (typeof tool.visible === 'function') {
    try {
      return Boolean(tool.visible());
    } catch (err) {
      return true;
    }
  }
  return tool.visible === undefined ? true : Boolean(tool.visible);
}

const orderOf = (t) => (Number.isFinite(t.order) ? t.order : DEFAULT_ORDER);

// The tools of one zone as groups in drawing order: groups by groupOrder (the smallest any tool of the group names,
// or its first tool's order when none does), tools by order; ties keep registration order (`seq`). Hidden tools
// stay in their place so they can be shown again without moving; the caller decides what a divider separates.
export function arrange(list) {
  const groups = new Map();
  for (const t of list) {
    const key = t.group || '';
    let g = groups.get(key);
    if (!g) {
      g = { key, tools: [], seq: Number.isFinite(t.seq) ? t.seq : groups.size, groupOrder: null };
      groups.set(key, g);
    }
    g.tools.push(t);
    if (Number.isFinite(t.groupOrder)) g.groupOrder = g.groupOrder === null ? t.groupOrder : Math.min(g.groupOrder, t.groupOrder);
    if (Number.isFinite(t.seq) && t.seq < g.seq) g.seq = t.seq;
  }
  const out = [...groups.values()];
  for (const g of out) {
    g.tools.sort((a, b) => orderOf(a) - orderOf(b) || (a.seq || 0) - (b.seq || 0));
    if (g.groupOrder === null) g.groupOrder = orderOf(g.tools[0]);
  }
  out.sort((a, b) => a.groupOrder - b.groupOrder || a.seq - b.seq);
  return out.map((g) => g.tools);
}

// A module's registration, checked and namespaced. Ids, groups and orders are the module's own (`<module>:<id>`,
// `<module>:<group>`, orders clamped into the module band), so a module can neither touch another's tools nor the
// system's, nor get ahead of them. Every module tool goes in the space bar's right zone (the secondary), where it can
// fold: a module never places a tool in the top bar (plan-primary-nav.md, decision 10) nor in the space bar's left zone
// (plan-two-zone-nav.md, decision 5). A tool written for an older contract, with bar: 'primary', system: true or any
// `zone` ('left', 'middle'), is not refused; all three are ignored and it lands in the right zone like any other.
// Throws with a status on anything else, so the module hears why.
const TOOL_ID = /^[a-z][a-z0-9-]{0,39}$/;
const ICON = /^[a-z0-9-]{1,40}$/;
const clamp = (n, lo, hi, fallback) => (Number.isFinite(Number(n)) ? Math.max(lo, Math.min(hi, Math.round(Number(n)))) : fallback);
const refuse = (message, status = 400) => { throw Object.assign(new Error(message), { status }); };
export function cleanModuleTools(moduleId, tools) {
  if (!Array.isArray(tools)) refuse('nav.set takes a list of tools');
  if (tools.length > 12) refuse('a module may register at most 12 nav tools');
  const [lo, hi] = BANDS.module;
  const seen = new Set();
  return tools.map((raw) => {
    const t = raw && typeof raw === 'object' ? raw : {};
    const id = String(t.id ?? '');
    if (!TOOL_ID.test(id)) refuse(`a nav tool needs an id of letters, digits and hyphens (got "${id.slice(0, 40)}")`);
    if (seen.has(id)) refuse(`nav tool "${id}" is listed twice`);
    seen.add(id);
    const bar = 'secondary'; // `bar`, `system` and `zone` are not read: the host decides where a module's tools go
    const zone = 'right';
    const icon = String(t.icon ?? '');
    if (!ICON.test(icon)) refuse(`nav tool "${id}" needs an icon (a Font Awesome name)`);
    const label = String(t.label ?? '').trim().slice(0, 40);
    if (!label) refuse(`nav tool "${id}" needs a label (what a screen reader and a tooltip say)`);
    const href = t.href === undefined || t.href === null ? '' : String(t.href).slice(0, 500);
    if (href && !/^(\/(?!\/)|https:\/\/)/.test(href)) refuse(`nav tool "${id}": href must be a path on this server or an https address`);
    const group = String(t.group ?? '');
    if (group && !TOOL_ID.test(group)) refuse(`nav tool "${id}": a group is letters, digits and hyphens`);
    const out = {
      id: `${moduleId}:${id}`,
      own: id,
      module: moduleId,
      bar,
      zone,
      icon,
      label,
      title: String(t.title ?? '').slice(0, 80) || undefined,
      order: clamp(t.order, lo, hi, DEFAULT_ORDER),
      group: `${moduleId}:${group || 'own'}`,
      groupOrder: clamp(t.groupOrder, lo, hi, DEFAULT_ORDER),
      visible: t.visible === undefined ? true : Boolean(t.visible),
      toggleable: Boolean(t.toggleable),
      active: Boolean(t.active),
      badge: clamp(t.badge, 0, 999, 0),
    };
    if (href) out.href = href;
    return out;
  });
}

// --- the registry ------------------------------------------------------------------------------

const tools = new Map(); // id -> tool (with seq)
const els = new Map(); // id -> the element drawn (or placed) for it
const bars = { primary: null, secondary: null }; // bar -> { el, zones: { left, right }, place }
let seq = 0;

// On a phone the primary nav's right zone folds into the one menu (the right zone's element, which the stylesheet
// turns into the menu), and back when the window widens. Only a tool that says `phone: 'bar'` stays in the bar (the
// bell), drawn in the phone's place (`.nav-middle`, #core-nav: the top bar's middle element, empty and not drawn from
// 641px, plan-two-zone-nav.md); your picture folds in, last (brand.js shows it there with your name and the profile
// menu's entries after it).
const phone = typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia('(max-width: 640px)') : null;
if (phone) phone.addEventListener('change', () => draw('primary'));

export function has(bar) {
  return Boolean(bars[bar]);
}

// Tell the registry where a bar is: its element holds `.nav-left` and `.nav-right` (the top bar also `.nav-middle`,
// #core-nav, the phone's place for the bell: nothing registers into it). Tools registered before this are drawn now. The elements may later move to another document (the popped-out window takes the header
// with it); the registry follows them, since it keeps the elements, not selectors.
export function attach(bar, el) {
  if (!BARS.includes(bar)) throw new Error(`no such bar: ${bar}`);
  bars[bar] = { el, zones: Object.fromEntries(ZONES.map((z) => [z, el.querySelector(`:scope > .nav-${z}`)])), place: el.querySelector(':scope > .nav-middle') };
  if (bar === 'secondary') attachFold(el);
  draw(bar);
}

export function register(tool) {
  if (!tool || typeof tool.id !== 'string' || !tool.id) throw new Error('a nav tool needs an id');
  if (!BARS.includes(tool.bar)) throw new Error(`nav tool "${tool.id}": bar must be primary or secondary`);
  if (!ZONES.includes(tool.zone)) throw new Error(`nav tool "${tool.id}": zone must be left or right`);
  const prev = tools.get(tool.id);
  const rec = { ...tool, seq: prev ? prev.seq : ++seq };
  tools.set(tool.id, rec);
  const b = bars[rec.bar];
  if (b) {
    if (els.has(rec.id)) apply(els.get(rec.id), rec); // registered again: the same element, brought up to date
    else ensureEl(rec, b.el.ownerDocument);
    draw(rec.bar);
  }
  return els.get(tool.id) || null;
}

export function unregister(id) {
  const t = tools.get(id);
  if (!t) return;
  tools.delete(id);
  const el = els.get(id);
  els.delete(id);
  if (el) el.remove(); // the page's own element is only taken out of the bar; whoever made it still has it
  draw(t.bar);
}

// Every tool whose id starts with `prefix` (a module's namespace) goes.
export function unregisterAll(prefix) {
  for (const id of [...tools.keys()]) if (id.startsWith(prefix)) unregister(id);
}

export function get(id) {
  return tools.get(id) || null;
}

export function elementOf(id) {
  return els.get(id) || null;
}

// A toggle's state, in place: the element takes or drops `on` and says so to a screen reader. Never a re-registration.
export function setActive(id, on) {
  const t = tools.get(id);
  if (!t) return false;
  t.active = Boolean(on);
  const el = els.get(id);
  if (el && !t.element) {
    el.classList.toggle('on', t.active);
    el.setAttribute('aria-pressed', String(t.active));
  }
  return true;
}

// A count on the tool (unread items, updates waiting); 0 takes it off.
export function setBadge(id, n) {
  const t = tools.get(id);
  if (!t) return false;
  t.badge = Math.max(0, Math.round(Number(n) || 0));
  const el = els.get(id);
  if (el && !t.element) paintBadge(el, t);
  if (fold.ids.has(id)) paintMoreBadge();
  return true;
}

// The primary bar's zones on a phone (plan-primary-nav.md, decision 7: the logo, the anchor, the bell and the menu
// button): the left stays; a right tool that says `phone: 'bar'` (the bell) stays in the bar, drawn in the phone's
// place (`bar`: #core-nav); everything else from the right goes into the menu, which is the right zone's element. Each
// is a list of runs, each run arranged on its own. Pure, for check-nav.
export function phoneZones(byZone) {
  const stays = (t) => t.phone === 'bar';
  return {
    left: [byZone.left],
    bar: [byZone.right.filter(stays)],
    right: [byZone.right.filter((t) => !stays(t))],
  };
}

// Redraw a bar (or both): order, dividers and visibility. Call it after something a `visible` function reads has
// changed; registering, unregistering and the phone fold call it themselves.
export function draw(bar) {
  if (!bar) {
    for (const b of BARS) draw(b);
    return;
  }
  const b = bars[bar];
  if (!b) return;
  const doc = b.el.ownerDocument;
  // Phone or not is the bar's own window (a popped-out header is in a window of its own width; space.js redraws it there).
  const view = doc.defaultView;
  const fold = bar === 'primary' && Boolean(view && typeof view.matchMedia === 'function' ? view.matchMedia('(max-width: 640px)').matches : phone && phone.matches);
  const byZone = { left: [], right: [] };
  for (const t of tools.values()) if (t.bar === bar) byZone[t.zone].push(t);
  const targets = { ...b.zones, bar: b.place };
  for (const zone of Object.values(targets)) {
    if (!zone) continue;
    for (const d of zone.querySelectorAll(':scope > [data-nav-divider]')) d.remove();
  }
  const runs = fold ? phoneZones(byZone) : { left: [byZone.left], right: [byZone.right], bar: [] };
  for (const [z, list] of Object.entries(runs)) if (targets[z]) place(targets[z], list.flatMap((run) => flatten(run, doc)));
  if (bar === 'secondary') scheduleFold();
}

// --- drawing -------------------------------------------------------------------------------------

// The look is the host's, by where the tool is: the primary nav's left zone is the core navigation (an icon and its
// name: the destinations; plan-two-zone-nav.md), everywhere else a tool is an icon button with its name as the tooltip and for a screen reader, unless the
// page marked it `labelled`. Every class here already exists in the stylesheet; nothing new is styled.
const lookOf = (t) => (t.bar === 'primary' && t.zone === 'left' ? 'core' : t.labelled ? 'labelled' : 'icon');
const LOOK_CLASSES = { core: ['core-link'], labelled: ['btn', 'btn-small'], icon: ['icon-link'] };
const PLAIN_ID = /^[a-z][a-z0-9-]*$/;

function ensureEl(t, doc) {
  let el = els.get(t.id);
  if (el) return el;
  if (t.element) {
    el = t.element;
  } else {
    el = doc.createElement(t.href ? 'a' : 'button');
    if (!t.href) el.type = 'button';
    // The page's own tools keep the element ids other code and the checks look up; a module's carry a colon and
    // get none, which also keeps them from ever colliding with the page's.
    if (PLAIN_ID.test(t.id)) el.id = t.id;
    el.addEventListener('click', (event) => {
      const now = tools.get(t.id);
      if (now && typeof now.onClick === 'function') now.onClick(event);
    });
  }
  el.dataset.navTool = t.id;
  els.set(t.id, el);
  watchHidden(t.id, el);
  apply(el, t);
  return el;
}

// A tool with no `visible` is shown or hidden by other code (Manage for an admin, your picture for a guest); when it
// is, its bar is drawn again so no divider is left before a group with nothing in it. The draw never writes these
// elements' `hidden`, so this cannot loop.
const pending = new Set();
function watchHidden(id, el) {
  if (typeof MutationObserver !== 'function') return;
  new MutationObserver(() => {
    const t = tools.get(id);
    if (!t || t.visible !== undefined || els.get(id) !== el) return;
    if (!pending.size) queueMicrotask(() => { const list = [...pending]; pending.clear(); for (const b of list) draw(b); });
    pending.add(t.bar);
  }).observe(el, { attributes: true, attributeFilter: ['hidden'] });
}

function iconEl(doc, name, extra) {
  const i = doc.createElement('i');
  i.className = `${name.includes(' ') ? name : `fa-solid fa-${name}`} fa-fw${extra ? ` ${extra}` : ''}`;
  i.setAttribute('aria-hidden', 'true');
  return i;
}

// The word under a tool's icon where the space bar is the phone's tab bar (style.css shows it only there); its
// accessible name stays the tool's label.
function shortEl(doc, text) {
  const s = doc.createElement('span');
  s.className = 'nav-short';
  s.setAttribute('aria-hidden', 'true');
  s.textContent = text;
  return s;
}

function apply(el, t) {
  if (t.element) return; // its look is its own
  const doc = el.ownerDocument;
  const look = lookOf(t);
  el.classList.add(...LOOK_CLASSES[look]);
  if (t.href) {
    el.setAttribute('href', t.href);
    if (t.target) el.setAttribute('target', t.target);
    else el.removeAttribute('target');
  }
  const label = String(t.label || '');
  const title = t.title || (look === 'icon' ? label : '');
  if (title) el.title = title;
  else el.removeAttribute('title');
  el.setAttribute('aria-label', label);
  if (t.toggleable) el.setAttribute('aria-pressed', String(Boolean(t.active)));
  else el.removeAttribute('aria-pressed');
  el.classList.toggle('on', Boolean(t.toggleable && t.active));
  const parts = [];
  if (t.icon) parts.push(iconEl(doc, t.icon, t.activeIcon ? 'icon-on' : ''));
  if (t.activeIcon) parts.push(iconEl(doc, t.activeIcon, 'icon-off')); // shown while on, see .icon-link.on in style.css
  if (look === 'core') {
    const s = doc.createElement('span');
    s.className = 'core-label';
    s.textContent = label;
    parts.push(s);
  } else if (look === 'labelled') {
    parts.push(doc.createTextNode(` ${label}`));
  }
  if (t.short) parts.push(shortEl(doc, t.short));
  el.replaceChildren(...parts);
  paintBadge(el, t);
}

function paintBadge(el, t) {
  const cls = lookOf(t) === 'core' ? 'nav-badge' : 'badge';
  let badge = el.querySelector(`:scope > .${cls}`);
  const n = Number(t.badge) || 0;
  if (!n) {
    if (badge) badge.remove();
    return;
  }
  if (!badge) {
    badge = el.ownerDocument.createElement('span');
    badge.className = cls;
    badge.setAttribute('aria-hidden', 'true');
    el.appendChild(badge);
  }
  badge.textContent = n > 9 ? '9+' : String(n);
}

// A tool counts as shown when its `visible` says so, or, with no `visible`, while whoever owns its `hidden` has not set
// it (your picture, hidden for a guest). `hiddenOf(tool)` says whether its element is hidden. Pure, for check-nav: a
// divider only ever separates two groups that each show something.
export function isShown(tool, hiddenOf) {
  if (tool.visible !== undefined) return isVisible(tool);
  return !hiddenOf(tool);
}

// One zone's elements in drawing order, dividers between the groups that show something. A tool whose `visible`
// says no keeps its place, hidden; one with no `visible` is left to whoever toggles its `hidden` (and the bar is
// drawn again when they do, see watchHidden).
function flatten(list, doc) {
  const out = [];
  let shownBefore = false;
  for (const group of arrange(list)) {
    const shown = group.filter((t) => isShown(t, (x) => Boolean(ensureEl(x, doc).hidden)));
    if (shown.length && shownBefore) {
      const d = doc.createElement('span');
      d.className = 'nav-divider';
      d.dataset.navDivider = '';
      out.push(d);
    }
    if (shown.length) shownBefore = true;
    for (const t of group) {
      const el = ensureEl(t, doc);
      if (t.visible !== undefined) el.hidden = !isVisible(t);
      out.push(el);
    }
  }
  return out;
}

// Put the owned elements into the container in this order, moving only what is out of place. Anything else in the
// container (the space's name and module switches, an overlay page's Back button) stays where it is: the registry
// owns its own elements, not the zone.
const owned = (n) => n.nodeType === 1 && n.dataset && ('navTool' in n.dataset || 'navDivider' in n.dataset);
function place(container, list) {
  let cursor = null;
  for (const el of list) {
    let n = cursor ? cursor.nextSibling : container.firstChild;
    while (n && n !== el && !owned(n)) n = n.nextSibling;
    if (n !== el) {
      if (cursor) cursor.after(el);
      else container.insertBefore(el, n);
    }
    cursor = el;
  }
}

// --- the space bar's "..." ---------------------------------------------------------------------

// The secondary bar never lets its zones run into each other: when they do not fit, the right zone's tools fold into
// a "..." (More) just before Leave, and come back as the bar widens. Which fold first is by band, each band from its
// end: the secondary tools (Pop out, then Full screen), then a module's own, then the core ones (the snap switch with
// its grid slider, then Dock all), then the utility ones (Rejoin call, then Pull participants back). Leave (the last
// band) never folds, a tool that says `fold: false` never does, and nothing in the left zone does: a tool there that can
// shrink (`fit`: Online) gives way first, before anything here folds. An `element` tool with no
// click of its own (the grid slider) folds with the tool before it, the one it belongs to. On a phone the bar is the
// tab bar and folds its own way (phoneFold() and phoneTabs() below, plan-phone-space-bar.md).
//
// `foldSteps(list)` takes a zone's tools in drawing order and gives the steps in folding order, each step the ids that
// fold together. Pure, for check-nav.
const FOLD_RANK = { secondary: 0, module: 1, core: 2, utility: 3 };
export function foldSteps(list) {
  const steps = [];
  let prev = null;
  list.forEach((t, at) => {
    const band = bandOf(orderOf(t));
    const foldable = t.fold !== false && band !== 'last' && band !== null;
    if (t.element && typeof t.onClick !== 'function' && !t.href) {
      if (prev && foldable) prev.ids.push(t.id); // a companion folds with the tool it sits after
      else if (foldable) steps.push((prev = { ids: [t.id], rank: FOLD_RANK[band], at }));
      return;
    }
    if (!foldable) { prev = null; return; }
    steps.push((prev = { ids: [t.id], rank: FOLD_RANK[band], at }));
  });
  steps.sort((a, b) => a.rank - b.rank || b.at - a.at);
  return steps.map((s) => s.ids);
}

// The width a left-zone tool that can shrink (`fit`: Online) may take before anything folds: the bar's inner width
// (`width`), less the gap between the two zones (`gap`), the right zone at its natural width with nothing folded
// (`right`, with its margins: its column is as wide as that) and the rest of the left zone (`left`: its padding, the
// Layout button, the divider and the gaps, the one before the tool too). A tool given exactly this width folds nothing
// (foldCount). Pure, for check-nav.
export function fitWidth({ width, gap = 0, left = 0, right = 0 }) {
  return width - gap - left - right;
}
// How many of those steps to fold for the bar to fit. `width` is the bar's inner width, `gap` the gap between its two
// zones, `left` the left zone's width once its fitting tool has shrunk (its box: its max-width is its column's), `right`
// the right zone's natural width with nothing folded, `more` what the "..." adds to the right zone once it shows, and
// `steps` the widths the steps free, in folding order. The left zone takes what the right does not; folds everything
// when even that does not fit. Pure, for check-nav.
export function foldCount({ width, gap = 0, left = 0, right = 0, more = 0, steps = [] }) {
  const fits = (r) => left + r + gap <= width + 0.5;
  if (fits(right)) return 0;
  let r = right + more;
  for (let k = 0; k < steps.length; k += 1) {
    r -= steps[k];
    if (fits(r)) return k + 1;
  }
  return steps.length;
}

// --- the space bar on a phone (plan-phone-space-bar.md) ---------------------------------------------
// At 640px and below (the bar's own window: a phone, a narrow window, a narrow pop-out) the bar is the tab bar: the
// module tabs that fit, Join, Online's count, Rejoin call, the "..." and Leave. Every right-zone tool but those that say
// `phone: 'bar'` goes into the "..." (phoneFold), and the tabs that do not fit go in it too, ahead of the tools
// (phoneTabs); the tab of the view being shown always stays.

// The least width of a tab (decision 7). style.css's tab rule (`flex: 1 0 56px`) says the same; check-nav holds them equal.
export const TAB_MIN = 56;

// Which tabs show and which fold. `width` is the bar's inner width, `fixed` the width of what always shows (Join when
// shown, Online, Rejoin call when shown, Leave, and the gaps), `more` the "..."'s, `tabs` the tab ids in order, `shown`
// the id of the view being shown, `foldsTools` whether a tool is in the "..." already. Every tab shows when nothing
// folds and they all fit at `tabMin`; else the "..." takes its width and as many tabs as fit show, at least one, the
// shown view's among them (in the last place when it is past the cut). Pure, for check-nav: { shown, folded }, ids in order.
export function phoneTabs({ width, fixed = 0, more = 0, tabMin = TAB_MIN, tabs = [], shown = null, foldsTools = false }) {
  const list = [...tabs];
  const spare = width - fixed;
  if (!foldsTools && list.length * tabMin <= spare + 0.5) return { shown: list, folded: [] };
  const n = Math.max(1, Math.min(list.length, Math.floor((spare - more + 0.5) / tabMin)));
  let keep = list.slice(0, n);
  if (shown !== null && list.includes(shown) && !keep.includes(shown)) keep = [...list.slice(0, n - 1), shown];
  const kept = new Set(keep);
  return { shown: list.filter((id) => kept.has(id)), folded: list.filter((id) => !kept.has(id)) };
}

// The right zone's tools that go into the "..." on a phone, in the order given: all but those that say `phone: 'bar'`
// (Leave, Rejoin call) and the "..." itself (`fold: false`). A tool that says `phone: 'popout'` (Full screen, Pop out)
// goes in only in a popped-out window (`popped`); elsewhere on a phone the stylesheet hides it. Pure, for check-nav.
export function phoneFold(list, { popped = false } = {}) {
  return list.filter((t) => t.phone !== 'bar' && t.fold !== false && (t.phone !== 'popout' || popped)).map((t) => t.id);
}

// A folded tool has an entry in the "..." unless it is a companion element with no click of its own (the grid slider).
const hasEntry = (t) => Boolean(t) && !(t.element && typeof t.onClick !== 'function' && !t.href);
// A phone tab's id: its module (`module:<id>`) or built-in (`builtin:<id>`), as canvas.js draws it.
const tabKey = (tab) => (!tab ? null : tab.dataset.builtin ? `builtin:${tab.dataset.builtin}` : `module:${tab.dataset.module}`);
const unreadOf = (tab) => parseInt(tab.querySelector(':scope > .badge')?.textContent || '0', 10) || 0;

const fold = { el: null, more: null, ids: new Set(), tabs: [], showMore: false, frame: 0, frameView: null, view: null, observer: null, picked: null };
const FOLDED = 'nav-folded';

function attachFold(el) {
  fold.el = el;
  if (fold.more) return;
  const doc = el.ownerDocument;
  const more = doc.createElement('button');
  more.type = 'button';
  more.id = 'subnav-more';
  more.className = 'sdk-more nav-more'; // the same "..." as a module's bars (host.ui.moreButton, module-host.js)
  more.title = 'More';
  more.setAttribute('aria-label', 'More');
  more.setAttribute('aria-haspopup', 'menu');
  more.setAttribute('aria-expanded', 'false');
  more.appendChild(iconEl(doc, 'ellipsis-vertical'));
  more.appendChild(shortEl(doc, 'More')); // its name under the icon in the phone's tab bar
  more.addEventListener('click', openFoldMenu);
  fold.more = more;
  // Just before Leave, in its group, so the divider before Leave's group comes before it too.
  register({ bar: 'secondary', zone: 'right', group: 'leave', id: 'subnav-more', order: 998, fold: false, icon: 'ellipsis-vertical', label: 'More', element: more, visible: () => fold.showMore });
}

// On the next frame, once whatever changed has been laid out; any number of calls in one frame fold once.
function scheduleFold() {
  const el = fold.el;
  if (!el) return;
  const view = el.ownerDocument.defaultView;
  if (!view) return;
  // A frame asked of another window (the pop-out, closing with the bar's frame still pending) never comes: ask again here.
  if (fold.frame && fold.frameView !== view) {
    try { fold.frameView.cancelAnimationFrame(fold.frame); } catch { /* that window is gone */ }
    fold.frame = 0;
  }
  if (fold.frame) return;
  fold.frameView = view;
  fold.frame = view.requestAnimationFrame(() => {
    fold.frame = 0;
    fitSecondary();
  });
}

// Watch what can change the width the bar has to work with, in whichever window it is in now (the header moves to a popped-out
// window): the bar's width, and the left zone's content (the words loading, Online's people coming and going).
function watchFold(view) {
  if (fold.view === view) return;
  if (fold.observer) fold.observer.disconnect();
  fold.view = view;
  fold.observer = null;
  if (typeof view.ResizeObserver === 'function') {
    fold.observer = new view.ResizeObserver(() => scheduleFold());
    fold.observer.observe(fold.el);
    const b = bars.secondary;
    if (b && b.zones.left) fold.observer.observe(b.zones.left);
  }
  view.addEventListener('resize', scheduleFold);
  view.matchMedia('(max-width: 640px)').addEventListener('change', scheduleFold);
  const fonts = view.document.fonts;
  if (fonts && typeof fonts.addEventListener === 'function') {
    fonts.addEventListener('loadingdone', scheduleFold);
    fonts.ready.then(scheduleFold, () => {});
  }
}

const shownEl = (el) => !el.hidden && el.ownerDocument.defaultView.getComputedStyle(el).display !== 'none';
const px = (v) => parseFloat(v) || 0;

// A zone's natural width: its shown children side by side with its gap between them, plus the zone's own padding and
// margins (the header's zones carry both, style.css `.topbar .nav-left`). Measured while the bar is
// `nav-measuring` (style.css), when nothing in it shrinks, so each item counts at its full width.
// `margins: false` for the left zone: its max-width (100%, style.css) holds its box, not its margins, to its column.
// `n` is how many children counted, so a caller leaving one out (`skip`) knows whether a gap goes before it.
function naturalWidth(zone, skip, { margins = true } = {}) {
  const view = zone.ownerDocument.defaultView;
  const zs = view.getComputedStyle(zone);
  const gap = px(zs.columnGap);
  let w = px(zs.paddingLeft) + px(zs.paddingRight) + (margins ? px(zs.marginLeft) + px(zs.marginRight) : 0) + px(zs.borderLeftWidth) + px(zs.borderRightWidth);
  let n = 0;
  for (const c of zone.children) {
    if (c === skip || !shownEl(c)) continue;
    w += c.getBoundingClientRect().width;
    n += 1;
  }
  return { w: w + gap * Math.max(0, n - 1), gap, n };
}

// The phone's fold (plan-phone-space-bar.md, "Where it runs"): the right zone's tools into the "..." (phoneFold), then
// the tabs that do not fit (phoneTabs), measured with the bar as it is drawn (no `nav-measuring`: the tabs' strip takes
// what the rest leaves, style.css). Gives the folded tool ids and the folded tab elements.
function fitPhone(b, el, width) {
  const doc = el.ownerDocument;
  const right = b.zones.right;
  // Online is its short count here. Drawn again now, in this window's styles: a popped-out window's stylesheet
  // arrives after the header has moved, and Online kept the words it drew without it (#160).
  for (const t of tools.values()) {
    if (t.bar !== 'secondary' || t.zone !== 'left' || typeof t.fit !== 'function' || !els.has(t.id)) continue;
    try { t.fit(width); } catch { /* keeps its size */ }
  }
  const inOrder = [...right.children].map((c) => c.dataset && c.dataset.navTool).filter(Boolean).map((id) => tools.get(id))
    .filter((t) => t && t.bar === 'secondary' && t.zone === 'right');
  const shown = inOrder.filter((t) => isShown(t, (x) => Boolean(els.get(x.id)?.hidden)));
  const ids = new Set(phoneFold(shown, { popped: Boolean(doc.body && doc.body.classList.contains('popout')) }));
  for (const id of ids) els.get(id).classList.add(FOLDED);
  const strip = b.zones.left ? b.zones.left.querySelector('.subnav-modules') : null;
  const tabEls = strip ? [...strip.querySelectorAll(':scope > .modules-menu-item')] : [];
  if (!tabEls.length) return { ids, tabs: [] };
  // The strip takes the width the rest leaves: measured without the "..." and with it.
  fold.more.hidden = true;
  const bare = strip.getBoundingClientRect().width;
  fold.more.hidden = false;
  const withMore = strip.getBoundingClientRect().width;
  const answer = phoneTabs({
    width,
    fixed: width - bare,
    more: Math.max(0, bare - withMore),
    tabs: tabEls.map(tabKey),
    shown: tabKey(tabEls.find((t) => t.classList.contains('on'))),
    foldsTools: [...ids].some((id) => hasEntry(tools.get(id))),
  });
  const out = new Set(answer.folded);
  const tabs = tabEls.filter((t) => out.has(tabKey(t)));
  for (const t of tabs) t.classList.add(FOLDED);
  return { ids, tabs };
}

function fitSecondary() {
  const b = bars.secondary;
  const el = fold.el;
  if (!b || !el || !fold.more) return;
  const doc = el.ownerDocument;
  const view = doc.defaultView;
  watchFold(view);
  const right = b.zones.right;
  if (!right) return;
  const wasFocused = el.contains(doc.activeElement) ? doc.activeElement : null;
  // Everything back and at its full size, to measure it as it would be: the tools, and on a phone the tabs.
  for (const c of el.querySelectorAll(`.${FOLDED}`)) c.classList.remove(FOLDED);
  const cs = view.getComputedStyle(el);
  const width = el.clientWidth - px(cs.paddingLeft) - px(cs.paddingRight);
  const phoneNow = view.matchMedia('(max-width: 640px)').matches;
  let ids = new Set();
  let tabs = [];
  if (phoneNow) {
    if (width > 0 && shownEl(el)) ({ ids, tabs } = fitPhone(b, el, width));
  } else {
    el.classList.add('nav-measuring');
    if (width > 0 && shownEl(el)) {
      const list = [...tools.values()].filter((t) => t.bar === 'secondary' && t.zone === 'right' && els.has(t.id));
      const inOrder = [...right.children].map((c) => c.dataset && c.dataset.navTool).filter(Boolean).map((id) => tools.get(id)).filter((t) => t && list.includes(t));
      const steps = foldSteps(inOrder.filter((t) => shownEl(els.get(t.id))));
      const r = naturalWidth(right, fold.more);
      const stepWidths = steps.map((s) => s.reduce((sum, id) => sum + els.get(id).getBoundingClientRect().width + r.gap, 0));
      const moreWidth = px(view.getComputedStyle(fold.more).width) + r.gap;
      // A left tool that can give way (`fit`, the space bar's Online) is told what it may take, and gives it before
      // anything here folds: what the rest of the left zone and the right zone at its full width leave (fitWidth).
      const gap = px(cs.columnGap);
      const fitting = b.zones.left ? [...tools.values()].filter((t) => t.bar === 'secondary' && t.zone === 'left' && typeof t.fit === 'function' && els.has(t.id) && shownEl(els.get(t.id))) : [];
      for (const t of fitting) {
        const rest = naturalWidth(b.zones.left, els.get(t.id), { margins: false });
        const avail = fitWidth({ width, gap, left: rest.w + (rest.n ? rest.gap : 0), right: r.w });
        try { t.fit(avail); } catch { /* a tool that cannot measure keeps its size */ }
      }
      // The left zone as it is now (its box, not its negative margin), rounded up: a cut is counted in whole pixels.
      const leftWidth = b.zones.left ? Math.ceil(naturalWidth(b.zones.left, null, { margins: false }).w) : 0;
      const k = foldCount({ width, gap, left: leftWidth, right: r.w, more: moreWidth, steps: stepWidths });
      ids = new Set(steps.slice(0, k).flat());
    }
    el.classList.remove('nav-measuring');
    for (const id of ids) els.get(id).classList.add(FOLDED);
  }
  const heldBefore = fold.ids;
  fold.ids = ids;
  fold.tabs = tabs;
  fold.showMore = tabs.length > 0 || [...ids].some((id) => hasEntry(tools.get(id)));
  fold.more.hidden = !fold.showMore;
  // The conference's tab folded while in the call: its in-call dot is on the "..." (style.css), so nobody talks unseen.
  fold.more.classList.toggle('in-call', tabs.some((t) => t.classList.contains('in-call')));
  // No divider with nothing shown before it since the last one (a group that folded away).
  let seen = false;
  for (const c of right.children) {
    if (c.dataset && 'navDivider' in c.dataset) {
      if (!seen) c.classList.add(FOLDED);
      seen = false;
    } else if (!c.classList.contains(FOLDED) && shownEl(c)) {
      seen = true;
    }
  }
  paintMoreBadge();
  // A tab picked from the "..." is named by its id: canvas.js draws the tabs afresh as the view changes.
  const picked = typeof fold.picked === 'string' ? (b.zones.left ? [...b.zones.left.querySelectorAll('.subnav-modules > .modules-menu-item')].find((t) => tabKey(t) === fold.picked) : null) : fold.picked;
  fold.picked = null;
  const focusable = (node) => node && (node.matches('button, a[href], input, select, [tabindex]') ? node : node.querySelector('button, a[href], input, select, [tabindex]'));
  const visible = (node) => node && node.isConnected && !node.closest(`.${FOLDED}`) && shownEl(node) && node.getBoundingClientRect().width > 0;
  const inLeft = () => (b.zones.left ? [...b.zones.left.querySelectorAll('button, a[href], input')].find(visible) : null);
  if (picked) {
    // A tool picked from the "...": the keyboard goes to it when the pick brought it back into the bar (the bar fits
    // now), else stays on the "..." while that shows, else (the "..." gone) to the first control in the left zone, the
    // module chooser's button; never left on a hidden button, nor taken by whatever the tool opened.
    const target = [focusable(picked), fold.more.hidden ? null : fold.more, inLeft()].find(visible);
    if (target) target.focus();
  } else if (wasFocused === fold.more && fold.more.hidden) {
    // The "..." had the keyboard and is gone (the bar grew): to the first tool it held, back in the bar now, else the
    // module chooser's button; never left on <body>.
    const back = [...right.children].filter((c) => c.dataset && heldBefore.has(c.dataset.navTool)).map(focusable);
    const target = [...back, inLeft()].find(visible);
    if (target) target.focus();
  } else if (wasFocused && wasFocused.closest(`.${FOLDED}`)) fold.more.focus(); // what had focus folded away: the "..." holds it
}

// A count on a folded tool, or a folded tab's unread count, shows on the "..." too, so it is not lost.
function paintMoreBadge() {
  let n = 0;
  for (const id of fold.ids) n += Number(tools.get(id)?.badge) || 0;
  for (const tab of fold.tabs) n += unreadOf(tab);
  paintBadge(fold.more, { badge: n, bar: 'secondary', zone: 'right' });
}

// The folded tabs (on a phone), then the folded tools, in the bar's order, in the page's shared menu under the "...".
// A tab's entry is its icon and name and shows that module as the tab would. A toggle shows its state (a checkbox
// item) and a pick is a click on the tool's own element, so it does exactly what the tool does in the bar.
async function openFoldMenu() {
  const right = bars.secondary && bars.secondary.zones.right;
  if (!right) return;
  const tabItems = [];
  for (const tab of fold.tabs) {
    if (!tab.isConnected) continue;
    const key = tabKey(tab);
    const icon = [...(tab.querySelector(':scope > i')?.classList || [])].filter((c) => c !== 'fa-fw').join(' ');
    tabItems.push({
      icon: icon || undefined,
      label: tab.querySelector(':scope > span:not(.badge)')?.textContent || '',
      badge: unreadOf(tab),
      onPick: () => {
        fold.picked = key;
        tab.click();
        scheduleFold();
      },
    });
  }
  const items = [];
  for (const c of right.children) {
    const id = c.dataset && c.dataset.navTool;
    if (!id || !fold.ids.has(id)) continue;
    const t = tools.get(id);
    if (!hasEntry(t)) continue; // the grid slider has no place in a menu
    const on = Boolean(t.toggleable && t.active);
    const relabelled = on && Boolean(t.activeLabel); // "Pop it back in": an action, not a box to tick
    items.push({
      icon: on && t.activeIcon ? t.activeIcon : t.icon,
      label: relabelled ? t.activeLabel : t.label,
      checked: t.toggleable && !relabelled ? on : undefined,
      badge: Number(t.badge) || 0,
      onPick: () => {
        fold.picked = c;
        c.click();
        scheduleFold(); // the fit after the pick says where the keyboard goes (fitSecondary)
      },
    });
  }
  const { openHostMenu } = await import('/host-menu.js');
  openHostMenu(fold.more, [...tabItems, ...(tabItems.length && items.length ? [{ divider: true }] : []), ...items]);
}

export const nav = { attach, register, unregister, unregisterAll, get, elementOf, setActive, setBadge, draw, has, arrange, isVisible, isShown, phoneZones, phoneTabs, phoneFold, TAB_MIN, foldSteps, foldCount, fitWidth, cleanModuleTools, bandOf, BANDS };
export default nav;
