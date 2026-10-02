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
      count: users.filter((u) => isHere(u, s.id)).length,
    }));
}

// Where a person is, as GET /api/presence tells this viewer (decision 6, step 3). `space` is a place the viewer
// belongs to, or null with `elsewhere: true` for one they don't. Someone in an aside reads as the aside's id with
// `aside: true` to the aside's own people (and owners and the admin), and as the parent space's id with `aside: true`
// to the rest of the parent's people: stepped out of that space, not in it. `aside` here says whether `spaceId` is
// itself an aside (then its own people, `aside: true`, are in it).
export function steppedOut(u, spaceId, { aside = false } = {}) {
  return Boolean(u && u.online && spaceId && !aside && u.aside && u.space === spaceId);
}
export function isHere(u, spaceId, { aside = false } = {}) {
  return Boolean(u && u.online && spaceId && u.space === spaceId && !steppedOut(u, spaceId, { aside }));
}

// A space card's count: "3 here · 2 in the call", "3 here", or "Nobody here". Those stepped out into an aside are not here.
export function hereCount(members = [], spaceId = null) {
  const here = members.filter((u) => isHere(u, spaceId));
  const calling = here.filter((u) => u.inCall).length;
  const people = here.length ? `${here.length} here` : 'Nobody here';
  return calling ? `${people} · ${calling} in the call` : people;
}

// Whether a member of the space I am in (`current`: { id, isAside }) gets the "In an aside" placeholder tile instead
// of nothing, and what it says: null for none, else { private, members } (`members`: who they are with, to name;
// never for a private one). Two ways to know: the person reads as stepped out of this space (the presence answer
// alone, for those not in the aside), or as in an aside listed in `spaces` (its own people, owners, the admin, or the
// aside-started message's entry). `started`, when given, is what the call's aside-started message said of the aside
// they went to ({ private, members }), the only way someone outside it learns who it is with. Private is the
// answer's own `asidePrivate` (so it holds after a reload), the aside record's, or the message's.
export function asidePlaceholder(u, current, spaces = [], started = null) {
  if (!u || !u.online || !current || !current.id) return null;
  if (steppedOut(u, current.id, { aside: Boolean(current.isAside) })) {
    const priv = Boolean(u.asidePrivate || (started && started.private));
    return { private: priv, members: started && !priv && Array.isArray(started.members) ? started.members : [] };
  }
  if (!u.space || u.space === current.id) return null;
  const record = spaces.find((r) => r && r.id === u.space);
  if (!record || !record.isAside) return null;
  const priv = Boolean(record.private || u.asidePrivate);
  return { private: priv, members: priv ? [] : record.members || [] };
}

// Where Who's around says someone is: "in <the space's name>" for a space I belong to, "in an aside" for an aside
// (stepped out of one of my spaces or in one of mine), "in another <space>" for a place I can't see, '' when online
// with no place. A private aside reads "in a private conversation". `spaces` holds the spaces and the asides the page
// knows (each aside with `isAside`); `words` the environment's words, from word(): { aside: word('aside', { a: true }),
// space: word('space') }. The aside is checked first: someone stepped out reads as their parent space's id, and must
// never read as in it.
export function whereWords(u, spaces = [], words = {}) {
  if (!u) return '';
  const record = u.space ? spaces.find((r) => r && r.id === u.space) : null;
  if (u.aside || (record && record.isAside)) return u.asidePrivate || (record && record.isAside && record.private) ? 'in a private conversation' : `in ${words.aside}`;
  if (u.elsewhere) return `in another ${words.space}`;
  return record ? `in ${record.name}` : '';
}

// Off stream: online, an owner online (otherwise there is no stream to be off), and not where the stream hears.
// `activeSpace` null means the stream is somewhere this viewer can't see (a space they don't belong to, or an aside
// they are not in): everyone they can place is off it, and those they can't (elsewhere, or stepped out into an aside
// they are not in) might be on it, so they are not marked. With the stream somewhere they can see, those are off it.
// `asideIds`: the asides the viewer can see (theirs; owners and the admin see all), whose people read as the aside's id.
export function offStream(u, activeSpace, ownerOnline, asideIds = []) {
  if (!u || !u.online || !ownerOnline) return false;
  const unknown = activeSpace === null || activeSpace === undefined;
  const unseen = Boolean(u.elsewhere) || (Boolean(u.aside) && !asideIds.includes(u.space));
  if (unseen) return !unknown;
  return u.space !== activeSpace;
}

// What a pick in the switcher does (decision 15, until the visit view): present nowhere, it enters; present in that
// space, it goes back to it; present in another, it enters (the visit view replaces this in a later step).
export function switchPick(present, id) {
  if (present && present === id) return 'back';
  return 'enter';
}

// How the space page opens a page asked for with app:open-page (decision 2, option (a)): the host console, another
// site, in a new tab; a module page over the space while present in one (home over the space included), and as a real
// page present nowhere, where nothing is lost; anything else (Manage, a new space, the updates line) over the page.
export function pageOpens({ kind = '', present = false } = {}) {
  if (kind === 'host-console') return 'new-tab';
  if (kind === 'module' && !present) return 'page';
  return 'overlay';
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

// The top bar's destinations (plan-calendar-destination.md, "The bar's entry"; plan-map-destination.md): one entry per
// destination GET /api/destinations lists for this viewer, in its order, each its main module's name and icon as this
// environment shows them. On a wider screen it is a middle-zone tool (`dest-<id>`, the core links' look); on a phone an
// entry in the menu after the Spaces slot's entries (`menu-dest-<id>`, in their group, before New <space>). `current`
// while that page is open (`path` is the page's own). `overlay` while present in a space, so the space page opens it
// over the space as a view (data-overlay-link, Away while on the call). Anything malformed in the list is left out.
export function destinationTools(list, { path = '', present = false } = {}) {
  const ok = (d) => d && /^[a-z][a-z0-9-]{1,31}$/.test(d.id || '') && typeof d.name === 'string' && d.name.trim()
    && typeof d.href === 'string' && /^\/[a-z][a-z0-9-]*$/.test(d.href);
  return (Array.isArray(list) ? list : []).filter(ok).slice(0, 8).map((d, i) => {
    const shared = { icon: /^[a-z0-9-]{1,40}$/.test(d.icon || '') ? d.icon : 'puzzle-piece', label: d.name.trim().slice(0, 40), href: d.href, current: path === d.href, overlay: Boolean(present) };
    return {
      bar: { id: `dest-${d.id}`, zone: 'middle', group: 'destinations', groupOrder: 1, order: 1 + i, ...shared },
      menu: { id: `menu-dest-${d.id}`, zone: 'right', group: 'menu-where', order: 950 + i, ...shared },
    };
  });
}
