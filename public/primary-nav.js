// The primary nav's pure parts (documentation/plans/plan-primary-nav.md, "The bar" and step 2): which entries the
// profile menu has for an account, the host console's address, the space switcher's entries and what a pick does, the
// bell's count and words, and the breadcrumb's segments. brand.js and space.js draw them; nothing here touches a
// document, so tools/check-nav.mjs runs them in node.

// The bar's slots, left to right. The left zone is the logo, the environment, Spaces and the anchor; the right zone is
// online people (a later step), the bell and the profile. No Modules slot: Thomas removed it on 2026-10-02 (most module
// pages are not destinations; a module page is reached from its tile on home, or at /modules/<id>).
export const SLOTS = ['logo', 'environment', 'home', 'anchor', 'people', 'notifications', 'profile'];

// The profile menu's entries, in order, as a pure function of the account, the install and the browser's offer
// (decisions 4 and 17):
//   - every account: View profile, the light or dark switch, Install as an app while the browser offers it, Sign out last;
//   - an owner: Manage;
//   - the admin on a single install (not hosted): Manage only, which holds the server's settings there;
//   - the host admin's stand-in on a hosted server: Manage and Host console;
//   - a member (a moderator is a member with rights in a space): nothing more.
// No account, or a guest: no menu at all.
export function profileEntries({ role, hostAdmin = false, hosted = false, installOffered = false, themeSwitch = true } = {}) {
  if (!role || role === 'guest') return [];
  const out = ['profile'];
  if (themeSwitch) out.push('theme');
  if (role === 'owner' || role === 'admin') out.push('manage');
  if (role === 'admin' && hosted && hostAdmin) out.push('host-console');
  if (installOffered) out.push('install');
  out.push('sign-out');
  return out;
}

// Who sees the module update count on the bell: those who can act on it (decision 9), owners and the admin.
export const seesUpdates = (role) => role === 'owner' || role === 'admin';

// The host console's address, from an environment's own (<slug>.<base domain>, the console at admin.<base domain>).
// Null when it can't be worked out (a single install has no slug and no console).
export function hostConsoleUrl({ protocol = 'https:', hostname = '', port = '' } = {}, slug = '') {
  if (!slug || !hostname.toLowerCase().startsWith(`${String(slug).toLowerCase()}.`)) return null;
  const base = hostname.slice(String(slug).length + 1);
  if (!base) return null;
  return `${protocol}//admin.${base}${port ? `:${port}` : ''}/`;
}

// The space switcher (decision 15): the spaces the viewer belongs to, in the space list's order, never an aside. Each
// says whether you are present there and how many are. `present` is the space you are present in (an aside's parent
// when you are in an aside), or null.
export function switcherEntries({ spaces = [], users = [], present = null } = {}) {
  return spaces
    .filter((s) => s && s.mine && !s.isAside)
    .map((s) => ({
      id: s.id,
      name: s.name,
      here: s.id === present,
      count: users.filter((u) => u && u.online && u.space === s.id).length,
    }));
}

// What a pick in the switcher does (decision 15, until the visit view): present nowhere, it enters; present in that
// space, it goes back to it; present in another, it enters (the visit view replaces this in a later step).
export function switchPick(present, id) {
  if (present && present === id) return 'back';
  return 'enter';
}

// The bell (decisions 9 and 18): its count is the unread module notices, and for owners and the admin the module
// updates too. `moduleWord` is the environment's word for a module.
export function bellState({ unread = 0, updates = 0, role = null, moduleWord = '' } = {}) {
  const u = Math.max(0, Number(unread) || 0);
  const m = seesUpdates(role) ? Math.max(0, Number(updates) || 0) : 0;
  let title = `Notifications, ${u} unread`;
  if (seesUpdates(role)) title += `, ${m} ${moduleWord} update${m === 1 ? '' : 's'}`;
  return { count: u + m, updates: m, title };
}

// The breadcrumb after the Spaces slot (decision 14): nothing on home; in a space, its name, current; in an aside, the
// parent's name (which does what Rejoin call does, decision 25), then "<Aside word>: <the other members' first names>",
// current. Each segment is { label, current, action? }.
export function crumbSegments({ space = null, parentName = '', asideWord = '', others = [] } = {}) {
  if (!space) return [];
  if (!space.isAside) return [{ label: space.name, current: true }];
  const firsts = others.map((n) => String(n || '').trim().split(/\s+/)[0]).filter(Boolean);
  const own = firsts.length ? `${asideWord}: ${firsts.join(', ')}` : asideWord;
  const out = [];
  if (parentName) out.push({ label: parentName, current: false, action: 'rejoin', title: `Rejoin call in ${parentName}` });
  out.push({ label: own, current: true });
  return out;
}

// What the anchor shows on the space page, from where the page is: the breadcrumb of the space it is in (crumbSegments),
// nothing while it shows home over a space it is still in (`viewingHome`, until the return pill of a later step), and
// for a guest who has not entered yet, the guest link's space. `viewingHome` only counts while there is a space:
// entering any space shows that space's breadcrumb whatever was on screen before.
export function anchorSegments({ space = null, viewingHome = false, guestSpaceName = '', ...rest } = {}) {
  if (!space) return guestSpaceName ? [{ label: guestSpaceName, current: true }] : [];
  if (viewingHome) return [];
  return crumbSegments({ space, ...rest });
}
