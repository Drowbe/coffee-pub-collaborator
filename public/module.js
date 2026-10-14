// A module's own full-width page (/modules/<id>): the shell that hosts its
// sandboxed frame. The module itself is public/module-host.js's business.
//
// Two ways in:
//   /modules/<id>                          the module's server page
//   /modules/<id>?space=<space>&popout=1   a module on a space's canvas, in a window of its own (?moduleRoom= redirects here)
//                                          (add &guest=<token> for a guest)
// (A module page opened over a call also carries from=space&spaceName=<the space's name>, for its Back link.)
import { loadBranding, api, wireOverlayBack, renderTopbar, renderPageBar, markModuleRead, word } from '/brand.js';
import { mountModule, openClearMenu, askCanvasToOpen, sameSiteOpener } from '/module-host.js';
import { moduleTint } from '/module-tint.js';
import { compositesOn, compositesToAsk } from '/composites.js';
import { nav } from '/nav-bar.js';

const $ = (id) => document.getElementById(id);
const id = decodeURIComponent(location.pathname.split('/')[2] || '');
const params = new URLSearchParams(location.search);
const spaceId = params.get('space');
const guestToken = params.get('guest');
const popout = params.get('popout') === '1';

async function start() {
  if (popout) document.body.classList.add('module-popout'); // no header: the window is the module
  renderTopbar({ location: '' });
  await loadBranding();
  wireOverlayBack();
  if (!guestToken) {
    let me;
    try {
      me = (await api('GET', '/api/me')).user;
    } catch {
      location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
      return;
    }
    $('whoami').textContent = me.displayName;
    $('whoami-img').src = `/img/${encodeURIComponent(me.key)}/profile`;
    $('whoami-img').hidden = false;
  }

  // Which module, and how it is shown: its own page (the environment's scope), or on a space's canvas.
  let mod;
  let scope = 'environment';
  let entry;
  if (spaceId) {
    scope = 'space';
    const q = new URLSearchParams({ space: spaceId });
    if (guestToken) q.set('guest', guestToken);
    const list = (await api('GET', `/api/modules/for-space?${q}`)).modules;
    const found = list.find((m) => m.id === id);
    // A part of a composite that is on in this space (the Calendar and the To-do while the Calendar is on; Maps and
    // Places while the space's Map is shown; composites.js, plan-calendar-todo.md and plan-map-places.md step 3) has no
    // page of its own there: its pop-out is the destination's page for the space, the same the Workspace's composite
    // holds, the pointer in the address (#ref=) kept. A composite that asks (the Map needs a map file) is on only where
    // its destination answers for the space, as the canvas asks; refused, the part keeps its own page here.
    const ids = list.map((m) => m.id);
    const shown = [];
    for (const c of compositesToAsk(ids)) {
      if (!c.parts.includes(id)) continue;
      try { await api('GET', `/api/destinations/${encodeURIComponent(c.dest)}?${q}`); shown.push(c.dest); } catch { /* not shown here */ }
    }
    const composite = compositesOn(ids, shown).find((c) => c.parts.includes(id));
    if (composite) {
      q.delete('popout');
      location.replace(`${composite.path}?${q}${location.hash}`);
      return;
    }
    if (found) {
      mod = { ...found, entry: found.canvas.entry };
      entry = found.canvas.entry;
    }
  } else {
    const found = (await api('GET', '/api/modules/nav')).modules.find((m) => m.id === id);
    if (found) {
      mod = { ...found, entry: found.page };
      entry = found.page;
    }
  }
  if (!mod) {
    $('module-missing').hidden = false;
    return;
  }
  document.title = `${document.title.split(' - ')[0]} - ${mod.name}`;
  if (popout) wireTitlebar(mod);
  if (!popout) renderPageBar({ name: mod.name, icon: mod.icon }); // its name in the page bar (plan-two-zone-nav.md)
  if (!guestToken) markModuleRead(mod.id);
  let frame = $('module-frame');
  // A module that runs in the page gets an element of its own where the frame would be.
  const inPage = mod.runMode === 'page';
  if (inPage) {
    const holder = document.createElement('div');
    holder.className = 'module-frame module-root';
    holder.id = 'module-frame';
    frame.replaceWith(holder);
    frame = holder;
  }
  frame.hidden = false;
  // The "+" (host.add.set) and the status bar (host.status.set; plan-module-titlebar-add.md, step 5). Popped out, the
  // "+" is in the window's own titlebar; on the module's own page it is a tool of the page bar's right zone (the nav
  // registry), the same button. The status bar is the last thing on the page, under the module, above the safe area.
  const status = $('module-status');
  status.setAttribute('aria-label', `${mod.name} status`);
  const add = popout ? $('module-titlebar-add') : pageAddSlot(mod);
  // Showing an item in the module that owns it, from a module's own page: go to that module's page,
  // which is given the pointer in the address (#ref=...) and passes it to the module.
  const refHash = (ref) => `#ref=${encodeURIComponent(JSON.stringify(ref))}`;
  // Popped out of a space's canvas: the canvas that opened this window shows it there, if it answers (askCanvasToOpen),
  // rather than this window becoming another module's page.
  const openRef = async (ref) => {
    if (ref.module === mod.id) {
      mounted.deliver('objectopen', { ref });
      return true;
    }
    const opener = popout ? sameSiteOpener() : null;
    if (opener && (await askCanvasToOpen(opener, ref)) === true) return true;
    const q = new URLSearchParams(location.search);
    q.delete('popout');
    q.delete('space');
    if (ref.scope === 'space') q.set('space', ref.space);
    location.href = `/modules/${encodeURIComponent(ref.module)}${q.toString() ? '?' + q : ''}${refHash(ref)}`;
    return true;
  };
  const mounted = mountModule({
    onOpenRef: openRef,
    module: { id: mod.id, version: mod.version, scope: mod.scope, budget: mod.budget === true },
    ...(inPage ? { container: frame } : { frame }),
    // A window of its own is the module: its frame fills the window, so an editor window needs no lift (editor.lift).
    lift: !popout,
    header: popout ? $('module-titlebar-custom') : null,
    toolbar: $('module-toolbar'),
    add,
    status,
    scope,
    spaceId,
    guestToken,
    entry,
    onTitle: (title) => {
      document.title = `${title || mod.name}`;
      if (popout) $('module-titlebar-title').textContent = title || mod.name;
      if (!popout) renderPageBar({ name: title || mod.name, icon: mod.icon });
    },
  });
  // Opened by another module's link: hand the pointer on, and again if the address changes.
  const first = refFromHash();
  if (first) mounted.deliver('objectopen', { ref: first });
  const place = placeFromHash();
  if (place) mounted.deliver('pagehash', { hash: place });
  window.addEventListener('hashchange', () => {
    const ref = refFromHash();
    if (ref) mounted.deliver('objectopen', { ref });
    const at = placeFromHash();
    if (at) mounted.deliver('pagehash', { hash: at });
  });
}

// A place in the module's own page left in the address by a widget ("#day=2026-09-24"; see host.page.open).
function placeFromHash() {
  const m = /^#([A-Za-z0-9=&_.:,-]{1,80})$/.exec(location.hash);
  return m && !m[1].startsWith('ref=') ? m[1] : null;
}

// A pointer left in the address by another module's "open this" (see host.objects.open).
function refFromHash() {
  try {
    const m = /^#ref=(.+)$/.exec(location.hash);
    return m ? JSON.parse(decodeURIComponent(m[1])) : null;
  } catch {
    return null;
  }
}

// Everything this module holds in the scope this window is open in.
// (start()'s `scope` is not reachable here; it follows from ?space= the same way.)
async function clearModuleData() {
  const q = new URLSearchParams({ scope: spaceId ? 'space' : 'environment' });
  if (spaceId) q.set('space', spaceId);
  if (guestToken) q.set('guest', guestToken);
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz) q.set('tz', tz);
  } catch { /* the server falls back */ }
  await api('DELETE', `/api/modules/${encodeURIComponent(id)}/data?${q}`);
}

// The "+" on a module's own page: an empty slot registered into the page bar's right zone (renderPageBar's bar, through
// the nav registry), never folded into the bar's "..."; module-host.js draws the button in it (createAddSlot) and hides
// the slot while the module has no adds. In the module's colour, as on its titlebar.
function pageAddSlot(mod) {
  const slot = document.createElement('span');
  slot.className = 'titlebar-add page-bar-add';
  slot.id = 'page-bar-add';
  slot.hidden = true;
  const tint = moduleTint(mod.id, mod.color || null);
  if (tint) slot.dataset.tint = tint;
  nav.register({ id: 'page-bar-add', bar: 'secondary', zone: 'right', group: 'page-add', groupOrder: 990, order: 990, fold: false, element: slot });
  return slot;
}

// The window's own titlebar: close, and (while the space page that opened it is still there) the
// way back into the space as a docked column or floating.
function wireTitlebar(mod) {
  $('module-titlebar').hidden = false;
  $('module-titlebar-icon').className = `fa-solid fa-${mod.icon} fa-fw`;
  // The module's colour on the titlebar and its icon, as on the canvas (plan-chat-model.md, decision 18; GitHub #229):
  // the server's, else a stable pick from the id (module-tint.js).
  const tint = moduleTint(mod.id, mod.color || null);
  if (tint) {
    $('module-titlebar-icon').dataset.tint = tint;
    $('module-titlebar').dataset.tint = tint;
  }
  $('module-titlebar-title').textContent = mod.name;
  $('module-close').addEventListener('click', () => window.close());
  $('module-menu').addEventListener('click', (event) => {
    event.stopPropagation();
    openClearMenu(event.currentTarget, () => clearModuleData());
  });
  let host = null;
  try {
    host = window.opener && !window.opener.closed ? window.opener.hostModules : null;
  } catch {
    host = null;
  }
  if (!host) return;
  const back = (mode) => {
    host.open(mod.id, mode);
    window.close();
  };
  for (const mode of ['dock', 'float']) {
    const button = $(`module-back-${mode}`);
    button.hidden = !host.supportsMode(mod.id, mode);
    button.addEventListener('click', () => back(mode));
  }
}

// Whatever goes wrong, say so on the page instead of leaving it blank.
start().catch((err) => {
  const note = $('module-missing');
  note.textContent = `This ${word('module')} could not start: ${err.message}`;
  note.hidden = false;
});
