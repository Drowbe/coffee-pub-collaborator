// The dashboard on the spaces page: cards under the space list, across all of a person's spaces. Who is around is
// the host's own; every other card is a widget a module provides (its manifest's surfaces.widget), hosted here
// exactly as a module page is, so the host names no module. The section stays hidden while there is nothing to show.
import { api, escapeHtml, word } from '/brand.js';
import { whereWords, tileRefTarget, tileHeading } from '/primary-nav.js';
import { mountModule } from '/module-host.js';

// What each module has unread (the host's notification counts): shown on its card's heading, since the header no
// longer has an item for a module with a widget. brand.js announces the counts; this keeps the latest.
let unread = {};
document.addEventListener('app:unread', (event) => {
  unread = event.detail || {};
  paintUnread();
});
function paintUnread() {
  for (const el of document.querySelectorAll('#dashboard [data-widget]')) {
    const n = unread[el.dataset.widget] || 0;
    let badge = el.querySelector('.dashboard-badge');
    if (!n) { badge?.remove(); continue; }
    if (!badge) {
      badge = document.createElement('span');
      badge.className = 'dashboard-badge';
      el.querySelector('.dashboard-widget-title').after(badge);
    }
    badge.textContent = n > 9 ? '9+' : String(n);
    badge.title = `${n} unread`;
  }
}

let started = false;

const section = () => document.getElementById('dashboard');

// Showing an object a tile opens (tileRefTarget, primary-nav.js). Its own module's object goes to the destination the
// tile's heading leads to while that shows (/calendar#ref=), over the space while present in one. Otherwise one in a
// space takes the person into that space with the module open on its canvas (the page supplies how, since it owns
// joining), and anything else goes to the module's own page, given the pointer in the address (the page hands it on).
// Asked for a new tab (Ctrl or middle click in the tile), the same address opens in one, leaving this page and the call.
let openInSpace = null;
function openRef(ref, { page = '', module = '', newTab = false } = {}) {
  const to = tileRefTarget(ref, { page, module });
  if (newTab) return openNewTab(to.href);
  if (to.how === 'space' && openInSpace) {
    openInSpace(ref.space, ref.module, ref);
    return true;
  }
  openModulePage(to.href);
  return true;
}
function openNewTab(href) {
  window.open(href, '_blank', 'noopener');
  return true;
}

// A module's page from home. Present in a space (home shows over it), the space page takes it (app:open-page, kind
// 'module') and opens it over the space, so the call keeps running; present nowhere, nobody takes it and it is a real
// navigation (plan-primary-nav.md, decision 2, option (a)).
function openModulePage(href) {
  const unhandled = document.dispatchEvent(new CustomEvent('app:open-page', { detail: { href, kind: 'module' }, cancelable: true }));
  if (unhandled) location.href = href;
}
// A plain click on a link to a module page on home (a card's heading, or a link inside a widget that runs in the page)
// goes the same way. A click meant for a new tab or window (a modifier, the middle button, target) is left to the
// browser: it leaves this page, and the call, alone.
document.addEventListener('click', (event) => {
  if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const link = event.target.closest?.('#dashboard a[href]');
  if (!link || (link.target && link.target !== '_self')) return;
  const url = new URL(link.href, location.href);
  // A tile's heading may lead to a destination (/calendar) rather than its module's page: the same way (data-page-link).
  if (url.origin !== location.origin || !(url.pathname.startsWith('/modules/') || link.hasAttribute('data-page-link'))) return;
  const unhandled = document.dispatchEvent(new CustomEvent('app:open-page', { detail: { href: url.pathname + url.search + url.hash, kind: 'module' }, cancelable: true }));
  if (!unhandled) event.preventDefault();
});

// `title` is the widget's own; `icon` and `name` are its module's as this environment shows them (its display name and
// icon, else its own): the icon beside the title, and the name on the link to the module's page.
function card({ id, title, icon, name, href, size }) {
  const el = document.createElement('article');
  el.className = 'dashboard-widget';
  el.dataset.widget = id;
  el.dataset.size = size || 'small';
  const head = document.createElement('header');
  const label = `<i class="fa-solid fa-${escapeHtml(icon || 'puzzle-piece')} fa-fw" aria-hidden="true"></i> ${escapeHtml(title)}`;
  head.innerHTML = href
    ? `<a class="dashboard-widget-title" href="${escapeHtml(href)}" title="Open ${escapeHtml(name || title)}" data-page-link>${label}</a>`
    : `<span class="dashboard-widget-title">${label}</span>`;
  const body = document.createElement('div');
  body.className = 'dashboard-widget-body';
  el.append(head, body);
  return { el, body };
}

function mountWidget(w) {
  // Where its heading goes: the server's `href` (the module's page, or the destination it is a part of while that shows,
  // a panel's with #panel=<module id> so the page opens on it). `path` is that without the hash, for a place of its own.
  const { page, path } = tileHeading(w.href, w.id);
  const { el, body } = card({ id: w.id, title: w.title, icon: w.icon, name: w.name, href: page, size: w.size });
  const inPage = w.runMode === 'page';
  let holder;
  if (inPage) {
    holder = document.createElement('div');
    holder.className = 'module-root dashboard-widget-root';
  } else {
    holder = document.createElement('iframe');
    holder.className = 'dashboard-widget-frame';
    holder.title = w.title;
  }
  body.appendChild(holder);
  section().appendChild(el);
  mountModule({
    module: { id: w.id, version: w.version, scope: w.scope },
    ...(inPage ? { container: holder } : { frame: holder }),
    scope: 'environment',
    entry: w.entry,
    onOpenRef: (ref, o = {}) => openRef(ref, { page, module: w.id, newTab: o.newTab }),
    // A click in the widget that means "show me this in full": where its heading goes (the destination, or the module's
    // own page), at that place; over the space while present in one, or in a new tab when the click asked for one.
    onOpenPage: (hash, o = {}) => {
      const href = hash ? `${path}#${hash}` : page;
      if (o.newTab) return openNewTab(href);
      openModulePage(href);
      return true;
    },
    // A widget in a frame says how tall it is.
    onResize: ({ height }) => { if (!inPage && Number.isFinite(height)) holder.style.height = `${Math.min(Math.max(Math.ceil(height), 40), 600)}px`; },
  });
}

// Who is around: a strip above the space cards of everyone online (signed in with the host open, in a space or not),
// with where they are, and a button to ask them into a private conversation of two. Where is whereWords()
// (primary-nav.js): a space of mine by name, "in an aside", or "in another <space>" for one I don't belong to.
let joinSpace = null;
let whoNote = '';
function renderWho(presence) {
  const el = document.getElementById('whos-around');
  if (!el) return;
  const spaces = presence.spaces || [];
  const here = (presence.users || []).filter((u) => u.present || u.online);
  const people = here.map((u) => {
    const mine = u.key === presence.me;
    const where = whereWords(u, spaces, { aside: word('aside', { a: true }), space: word('space') });
    const label = escapeHtml(u.displayName || u.login || 'Someone');
    // One cell of the grid: who, where they are, and what can be done (in the call, invite).
    const actions = `${u.inCall ? '<i class="fa-solid fa-video fa-fw dashboard-person-call" title="In the call" aria-hidden="true"></i>' : ''}${!mine && joinSpace ? `<button type="button" class="dashboard-invite" data-invite="${escapeHtml(u.key)}" title="Invite ${label} to a private conversation" aria-label="Invite ${label} to a private conversation"><i class="fa-solid fa-people-arrows fa-fw" aria-hidden="true"></i></button>` : ''}`;
    return `<div class="dashboard-person${where ? ' is-placed' : ''}"><img src="/img/${encodeURIComponent(u.key)}/profile" alt=""><span class="dashboard-person-text"><span class="dashboard-person-name">${label}${mine ? ' (you)' : ''}</span><span class="dashboard-person-where">${where ? escapeHtml(where) : 'online'}</span></span><span class="dashboard-person-actions">${actions}</span></div>`;
  });
  el.innerHTML = `<h2 class="whos-around-title"><i class="fa-solid fa-user-group fa-fw" aria-hidden="true"></i> Who's around <span class="whos-around-count">${people.length || ''}</span></h2>` + (people.length ? `<div class="whos-around-list">${people.join('')}</div>` : '<p class="dashboard-empty">Nobody is around right now.</p>') + (whoNote ? `<p class="whos-around-note">${escapeHtml(whoNote)}</p>` : '');
  el.hidden = false;
}

async function invite(key) {
  try {
    const { aside } = await api('POST', '/api/asides/invite', { to: key });
    whoNote = '';
    await joinSpace(aside.id);
  } catch (err) {
    whoNote = err.message;
    renderWho(lastPresence);
    setTimeout(() => { whoNote = ''; renderWho(lastPresence); }, 6000);
  }
}
let lastPresence = {};
document.addEventListener('click', (event) => {
  const b = event.target.closest('#whos-around [data-invite]');
  if (b) invite(b.dataset.invite);
});

// Called each time the space list is drawn: the widgets are mounted once, who is around every time.
export async function initDashboard(presence, hooks = {}) {
  const root = section();
  if (!root) return;
  if (hooks.openInSpace) openInSpace = hooks.openInSpace;
  if (hooks.joinSpace) joinSpace = hooks.joinSpace;
  lastPresence = presence;
  if (!started) {
    started = true;
    let widgets = [];
    try {
      widgets = (await api('GET', '/api/modules/widgets')).widgets;
    } catch {
      // no widgets is fine: just who is around
    }
    for (const w of widgets) mountWidget(w);
    paintUnread();
  }
  renderWho(presence);
  root.hidden = root.children.length === 0;
}
