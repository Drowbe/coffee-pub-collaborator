// The call page: players see and hear each other.
import { Room, RoomEvent, Track, createLocalTracks } from '/lib/livekit-client.esm.mjs';
import { loadBranding, api, renderTopbar, setTopbarLocation, iconClasses, spaceCrumbIcon, hasOwnerRights, word, verb, applyWords, followTheme } from '/brand.js';
import { createCanvas, joinModules, setJoinModules } from '/canvas.js';
import { whatOpens, conferenceAllowed } from '/opens-with.js';
import { switchListHtml, wireSwitchList } from '/switch-list.js';
import { createWhoHere } from '/space-people.js';
import { hotkeyMatches, formatHotkey } from '/hotkeys.js';
import { initDashboard } from '/dashboard.js';
import { nav } from '/nav-bar.js';
import { attachChatInput, placeAbove } from '/chat-input.js';
import { openHostMenu, openConfirmMenu, closeHostMenu } from '/module-host.js';

// Elements by id, wherever the canvas currently lives (the page or the pop-out
// window, which takes the whole canvas with it).
const canvasEl = document.getElementById('canvas');
// The conference can float or live in a window of its own, away from the canvas.
const confEl = document.getElementById('conference');
// The header moves to the popped-out window with the canvas, so it is searched too.
const topbarEl = document.getElementById('topbar');
// The chat can be in a window of its own, away from the canvas, so it is searched too.
const chatEl = document.getElementById('chat');
const $ = (id) => (id === 'canvas' ? canvasEl : document.getElementById(id) || canvasEl.querySelector(`#${id}`) || confEl.querySelector(`#${id}`) || topbarEl.querySelector(`#${id}`) || chatEl.querySelector(`#${id}`));
// Before anything else touches a header element -- the header itself is
// built here, not left static in space.html, so every #topbar-crumb,
// #recall-button etc. lookup below needs this to have already run.
renderTopbar();
if (new URLSearchParams(location.search).has('layout')) import('/layout-debug.js'); // a live geometry readout, see there
// The space's own bar, a second row of the header (so it moves with the header when the app is
// popped out): the modules to open on the left (chat, the space's modules; canvas.js fills
// #modules-menu), and the controls for the whole app on the right, full screen and pop out,
// which move the whole call page, not the conference.
const subnav = document.createElement('div');
subnav.className = 'subnav';
subnav.id = 'subnav';
// The secondary nav is about the space, in three zones (see documentation/plans/plan-nav.md and
// architecture-navigation.md): left, the space's name and the module selector; middle, the space's own information and
// navigation (nothing yet); right, the space's actions: the canvas-level snap, full screen, pop out, pulling people back
// from an aside, and leaving. The right zone's controls are registrations in the nav-bar registry (public/nav-bar.js),
// made below beside the code each one drives; a module's own tools (host.nav.set) land in the same bar, after them.
subnav.innerHTML = `
  <div class="nav-left subnav-left">
    <span class="space-name" id="space-name" hidden><i class="fa-solid fa-fw" id="space-icon" aria-hidden="true"></i><span id="space-name-text"></span></span>
  </div>
  <div class="nav-middle subnav-middle" id="subnav-middle"></div>
  <span class="nav-right subnav-tools"></span>`;
topbarEl.appendChild(subnav);
nav.attach('secondary', subnav); // its tools are registered further down, once the state their `visible` reads exists
// The module chooser, after the space's name: one button that opens a list of switches, one per module (the conference,
// the chat and the space's modules), each showing or hiding its module on the canvas (canvas.js fills #modules-menu,
// with switch-list.js). On a phone the same #modules-menu is the tab bar instead, and the button is not drawn.
const moduleChooser = document.createElement('span');
moduleChooser.className = 'module-chooser';
moduleChooser.innerHTML = `
  <button class="btn btn-small module-chooser-toggle" id="modules-toggle" type="button" aria-expanded="false" aria-controls="modules-menu"><i class="fa-solid fa-puzzle-piece fa-fw" aria-hidden="true"></i> <span class="module-chooser-label"></span> <i class="fa-solid fa-caret-down fa-fw" aria-hidden="true"></i><span class="badge" hidden></span></button>
  <div class="module-chooser-list" id="modules-menu" role="group" hidden></div>`;
nav.register({ bar: 'secondary', zone: 'left', group: 'modules', id: 'module-chooser', order: 1, icon: 'puzzle-piece', label: word('module', { many: true, cap: true }), element: moduleChooser });
// The chooser's words are the environment's word for modules (registerWordTools() below calls this once they are known).
function nameModuleChooser() {
  const many = word('module', { many: true, cap: true });
  moduleChooser.querySelector('.module-chooser-label').textContent = many;
  moduleChooser.querySelector('#modules-menu').setAttribute('aria-label', many);
}
nameModuleChooser();
// On a phone the space bar is a tab bar at the bottom of the page, in the flow after the canvas, so
// the call toolbar sits directly above it whatever the browser does with its own bottom bar. Wider,
// it is the header's second row. The chooser's list is the tab bar on a phone (`subnav-modules`, always shown), a list
// under its button wider.
// Phone or wide is the header's own window: popped out, the header is in that window, whose width is its own (a
// 480 wide pop-out is a phone there, and its stylesheet says so). Re-checked as that window crosses the line, and
// when the header moves between windows (setUpPopoutWindow and its pagehide call placeSubnav()).
let phoneWatch = null; // { view, query } the header's window and its phone-width query, listened to
function phoneWidth() {
  const view = subnav.ownerDocument.defaultView || window;
  if (!phoneWatch || phoneWatch.view !== view) {
    phoneWatch?.query.removeEventListener('change', placeSubnav);
    const query = view.matchMedia('(max-width: 640px)');
    query.addEventListener('change', placeSubnav);
    phoneWatch = { view, query };
  }
  return phoneWatch.query.matches;
}
function placeSubnav() {
  const popped = topbarEl.ownerDocument !== document;
  if (popped && subnav.parentNode !== topbarEl) topbarEl.appendChild(subnav); // popped out, the bar is the header's second row
  const list = moduleChooser.querySelector('#modules-menu');
  const tabs = phoneWidth();
  if (list.classList.contains('subnav-modules') !== tabs) {
    list.classList.toggle('subnav-modules', tabs);
    list.classList.toggle('module-chooser-list', !tabs);
    if (tabs) list.removeAttribute('role'); else list.setAttribute('role', 'group');
    list.hidden = !tabs;
    moduleChooser.querySelector('#modules-toggle').setAttribute('aria-expanded', 'false');
    window.hostModules?.updateMenu(); // tabs or switches (not yet made on the first call)
  }
  if (popped) { nav.draw('primary'); return; } // the header's phone menu follows that window too
  if (tabs) document.body.appendChild(subnav);
  else topbarEl.appendChild(subnav);
}
placeSubnav();
// Only this page loads your profile/Manage as an overlay over a running
// call instead of a real navigation (see openOverlay() below) -- the
// shared header doesn't know that, so it's marked here instead. Your
// profile is the account menu's View profile, which asks first
// (app:open-profile, see the listener by openOverlay()).
$('admin-link').dataset.overlayLink = '';
const call = new Room({ adaptiveStream: true, dynacast: true });
const tiles = new Map(); // participant identity (user key) -> tile element
const ghostTiles = new Map(); // identity -> tile element, for space members aside elsewhere
const asideSelection = new Set(); // identities picked to pull aside together, before confirming
let me = null;
let spaceName = 'Coffee Pub'; // the space I am in, once joined; the environment's name before that
const presenceUsers = new Map(); // key -> { displayName, borderColor, online, space, ... } from /api/presence
let presenceSpaces = []; // the spaces, with `mine` for the ones I may join
let currentSpace = null; // the space I am in, once joined
// Reloading the page keeps you in your space: the space is remembered for this tab (not across tabs or restarts) and rejoined when the
// page starts again. It is forgotten when you leave or are removed, but not when the page itself is going away.
let unloading = false;
addEventListener('pagehide', () => { unloading = true; });
addEventListener('pageshow', () => { unloading = false; });
const REMEMBERED_SPACE = 'app.space';
const rememberSpace = (id) => { try { sessionStorage.setItem(REMEMBERED_SPACE, id); } catch { /* not remembered */ } };
const forgetSpace = () => { if (unloading) return; try { sessionStorage.removeItem(REMEMBERED_SPACE); } catch { /* nothing */ } };
const rememberedSpace = () => { try { return sessionStorage.getItem(REMEMBERED_SPACE) || ''; } catch { return ''; } };
// Being in the space and being in the conference are separate: the page stays connected
// for the chat and the modules, and only sends and receives audio and video while the
// conference module is open. Others see the difference through the "call" attribute.
let inCall = false;
// Away (setAway, below): declared up here because what you hear (hearingOff) is set from page load on.
let isAway = false;
let awayRestoreMic = false;
let awayRestoreCam = false;
let awayMessage = ''; // the away message others read (the "awayMessage" attribute), '' for a plain Away
let awayRestartCam = false; // a camera change (device, quality) made while away, applied on Back (restartCamera)
const LOBBY = 'lobby';
let activeSpace = LOBBY; // the space the stream currently hears (server-computed)
let ownerOnline = false; // whether that's actually backed by an owner (or the admin) online right now
// Server-wide call feature toggles (Manage > Settings) -- these defaults
// hold until init() replaces them with whatever /api/branding actually says.
let features = { maxQuality: 720, allowScreenShare: true, allowAsides: true, allowPrivate: true, allowReactions: true, conferenceEnabled: true };

// A guest link (/guest/<token>): no account, just a name and this space. The
// token both identifies which space's guest link this is and, appended to
// our own reads below, is this tab's only credential -- there's no session.
const GUEST_PREFIX = 'guest-';
const guestToken = location.pathname.startsWith('/guest/') ? decodeURIComponent(location.pathname.split('/')[2] || '') : null;

// A picture URL for a slot, guest-aware: a guest identity (however many
// different guests are in the call) always shows the one shared guest
// picture set, and our own guest token (if we are the guest looking) rides
// along so the server recognises this tab without a session.
function imgUrl(key, slot, params = {}) {
  const isGuest = key.startsWith(GUEST_PREFIX);
  const urlKey = isGuest ? 'guest' : key;
  const urlSlot = isGuest && slot === 'profile' ? 'player' : slot;
  const q = new URLSearchParams(params);
  if (guestToken) q.set('guest', guestToken);
  const qs = q.toString();
  return `/img/${encodeURIComponent(urlKey)}/${urlSlot}${qs ? `?${qs}` : ''}`;
}

// The conference shows one set, chosen on the space: Character images, or
// Participant images (the usual, including a space still marked roleplaying).
// An aside uses the space it came from.
function conferenceSlot(spaceId, offline) {
  const space = presenceSpaces.find((r) => r.id === spaceId);
  const character = space?.profile === 'characters';
  if (offline) return character ? 'characterOffline' : 'playerOffline';
  return character ? 'character' : 'player';
}
// That set's picture, in the same order as the other views: this space's own,
// then this person's, then the default set. The profile photo is only the last
// step, when the image fails to load. The lobby and a guest have no space
// picture, so they use the profile photo.
function spacePortraitUrl(key) {
  const spaceId = currentSpace?.isAside ? currentSpace.origin : currentSpace?.id;
  if (!spaceId || spaceId === LOBBY || key.startsWith(GUEST_PREFIX)) return imgUrl(key, 'profile');
  return imgUrl(key, conferenceSlot(spaceId), { space: spaceId });
}
// One box. Only the address changes when the space's set changes, or when the
// picture is missing and the profile photo stands in.
function showConferencePortrait(img, key) {
  const src = spacePortraitUrl(key);
  if (img.dataset.src === src) return;
  img.dataset.src = src;
  img.onerror = () => { img.onerror = null; img.src = imgUrl(key, 'profile'); };
  img.src = src;
}

// An aside as the page lists it beside the spaces: its record, the environment's word for it, and the mark.
const asideEntry = (a) => ({ ...a, name: word('aside', { cap: true }), isAside: true });
// Whether I am in an aside right now: the call only, no modules, chat or chat pictures (plan-names decision 5).
const inAside = () => Boolean(currentSpace?.isAside);

// Who is in a call comes from LiveKit. When that does not answer, the page gives up and keeps what it
// already has: the space list and the call do not wait on it (GitHub #71). A little longer than the
// server's own two seconds, so a slow answer still arrives.
const PRESENCE_GIVE_UP_MS = 3000;

function adoptPendingSpace() {
  if (!currentSpace?.pending) return;
  const found = presenceSpaces.find((r) => r.id === currentSpace.id);
  if (!found) return;
  currentSpace = found;
  spaceName = spaceDisplayName(found);
  renderSpaceLink();
  applyPermissions();
  updateRecallButton();
  updateCrumb();
}

async function loadPresence() {
  try {
    const url = guestToken ? `/api/presence?guest=${encodeURIComponent(guestToken)}` : '/api/presence';
    const { users, spaces, asides, activeSpace: active, ownerOnline: hasOwner } = await api('GET', url, undefined, undefined, AbortSignal.timeout(PRESENCE_GIVE_UP_MS));
    presenceUsers.clear();
    for (const u of users) presenceUsers.set(u.key, u);
    // The asides are their own record (plan-names step 8); the page lists them after the spaces, marked isAside, so
    // everything that finds where someone is reads one list.
    presenceSpaces = [...(spaces || []), ...(asides || []).map(asideEntry)];
    activeSpace = active || LOBBY;
    ownerOnline = Boolean(hasOwner);
    for (const [key, tile] of tiles) {
      const colour = presenceUsers.get(key)?.borderColor;
      if (colour) tile.style.setProperty('--talk', colour);
      updateBackgroundPlaceholder(tile, key);
      const portrait = tile.querySelector('.placeholder');
      if (portrait) showConferencePortrait(portrait, key);
    }
    renderSpaces();
    if (!guestToken) initDashboard({ users, spaces: presenceSpaces, me: me?.key }, { openInSpace, joinSpace: joinInvitedSpace });
    reconcileGhostTiles();
    renderGuestLink();
    renderSpaceLink();
    updateRecallButton();
    adoptPendingSpace();
  } catch (err) {
    // default colour stands; the next poll tries again
  }
}

// The space's own launch link, mirrored in the floatbar so it's reachable
// without leaving the call. Reads live off presenceSpaces (like renderGuestLink)
// rather than the frozen currentSpace, so an admin editing the link mid-call
// is reflected here on the next poll.
function renderSpaceLink() {
  const btn = $('space-link');
  if (!btn || !currentSpace) return;
  const space = presenceSpaces.find((r) => r.id === currentSpace.id);
  const link = space?.link;
  btn.hidden = !link;
  if (link) btn.querySelector('.glyph').innerHTML = `<i class="${iconClasses(space.linkIcon || 'link')} fa-fw" aria-hidden="true"></i>`;
}
$('space-link').addEventListener('click', () => {
  const space = currentSpace && presenceSpaces.find((r) => r.id === currentSpace.id);
  if (space?.link) window.open(space.link, '_blank', 'noopener');
});

// Admin only: shows "Pull participants back" whenever a Private
// Conversation was pulled out of the space I'm currently in -- the admin
// is never part of those (see /api/asides), so without this
// there'd be no way to know one is even happening, let alone end it.
let recallButtonTimer = 0;
let recallButtonCountingDown = false;

// The tool's `visible` (see its registration above): shown while the countdown runs, whatever else changes.
function recallWanted() {
  return recallButtonCountingDown || Boolean(hasOwnerRights(me) && currentSpace && presenceSpaces.some((r) => r.isAside && r.private && r.origin === currentSpace.id));
}

function updateRecallButton() {
  nav.draw('secondary');
}

function resetRecallButton() {
  clearInterval(recallButtonTimer);
  recallButtonCountingDown = false;
  const btn = $('recall-button');
  if (!btn) return;
  btn.disabled = false;
  btn.innerHTML = '<i class="fa-solid fa-people-arrows fa-fw" aria-hidden="true"></i> Pull participants back';
}

async function recallParticipants() {
  const btn = $('recall-button');
  try {
    await api('POST', '/api/asides/recall');
    recallButtonCountingDown = true;
    btn.disabled = true;
    let n = 10;
    btn.textContent = `Rejoining in... ${n}`;
    clearInterval(recallButtonTimer);
    recallButtonTimer = setInterval(() => {
      n -= 1;
      if (n <= 0) {
        resetRecallButton();
        updateRecallButton();
        return;
      }
      btn.textContent = `Rejoining in... ${n}`;
    }, 1000);
  } catch (err) {
    setStatus(`pull participants back: ${err.message}`, true);
  }
}

// The countdown a Private Conversation's own participants see once the
// admin recalls them -- a warning, not an instant yank, so it doesn't cut
// anyone off mid-sentence. Re-triggering (e.g. the admin clicks it twice)
// restarts the same countdown rather than stacking a second one.
let recallTimer = 0;
function startRecallCountdown(spaceId, name) {
  clearInterval(recallTimer);
  $('recall-space-name').textContent = name || 'the call';
  $('recall-overlay').hidden = false;
  let n = 10;
  $('recall-countdown').textContent = n;
  recallTimer = setInterval(() => {
    n -= 1;
    if (n <= 0) {
      clearInterval(recallTimer);
      $('recall-overlay').hidden = true;
      reconnectTo(spaceId, 'pulled back to the call...', { keepCall: true });
      return;
    }
    $('recall-countdown').textContent = n;
  }, 1000);
}

// A member of the space I'm in who is online but not actually connected
// here -- they're in a private aside elsewhere -- gets a placeholder tile:
// their picture stands in for video, dimmed, with who they stepped aside
// with, so they read as "still in the call" rather than looking like they
// hung up. Reconciled from the same polled /api/presence data that already
// drives the join screen's badges, since a genuine LiveKit disconnect
// alone can't tell "went to a private aside" apart from "actually left".
function othersLabel(members, exclude) {
  const names = members.filter((k) => k !== exclude).map((k) => presenceUsers.get(k)?.displayName).filter(Boolean);
  if (!names.length) return '';
  if (names.length === 1) return `with ${names[0]}`;
  return `with ${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
}

// The Aside/Private picture (their own, their space's, or the server-wide
// Default Images fallback) laid over their profile photo, same as OBS
// shows it over the Online/Offline picture -- a badge, not a replacement.
// Optional, so unlike the profile photo it simply stays hidden rather
// than falling back to anything when nothing resolves for that slot.
function setGhostBadge(img, key, slot) {
  img.hidden = true;
  img.onerror = () => { img.hidden = true; };
  img.onload = () => { img.hidden = false; };
  img.src = imgUrl(key, slot);
}

function ghostTile(key) {
  let tile = ghostTiles.get(key);
  if (tile) return tile;
  tile = document.createElement('div');
  tile.className = 'tile tile-ghost';
  tile.dataset.identity = key;
  const placeholder = document.createElement('img');
  placeholder.className = 'placeholder';
  placeholder.alt = '';
  placeholder.src = imgUrl(key, 'profile');
  tile.appendChild(placeholder);
  const badge = document.createElement('img');
  badge.className = 'tile-ghost-badge';
  badge.alt = '';
  badge.hidden = true;
  tile.appendChild(badge);
  const overlay = document.createElement('div');
  overlay.className = 'tile-ghost-overlay';
  const status = document.createElement('span');
  status.className = 'tile-ghost-status';
  status.textContent = `In ${word('aside', { a: true })}`;
  const withLine = document.createElement('span');
  withLine.className = 'tile-ghost-with';
  overlay.append(status, withLine);
  tile.appendChild(overlay);
  const name = document.createElement('span');
  name.className = 'name';
  tile.appendChild(name);
  ghostTiles.set(key, tile);
  placeInOrder(tile);
  return tile;
}

function removeGhost(key) {
  const tile = ghostTiles.get(key);
  if (!tile) return;
  tile.remove();
  ghostTiles.delete(key);
}

function reconcileGhostTiles() {
  if (!currentSpace || !inCall || !document.body.classList.contains('in-space')) return;
  let changed = false;
  for (const key of currentSpace.members) {
    if (key === me?.key) continue;
    if (tiles.has(key)) {
      if (ghostTiles.has(key)) { removeGhost(key); changed = true; }
      continue;
    }
    const user = presenceUsers.get(key);
    const aside = user?.online && user.space && user.space !== currentSpace.id ? presenceSpaces.find((r) => r.id === user.space) : null;
    if (aside?.isAside) {
      const tile = ghostTile(key);
      const isPrivate = Boolean(aside.private);
      tile.classList.toggle('tile-ghost-private', isPrivate);
      setGhostBadge(tile.querySelector('.tile-ghost-badge'), key, isPrivate ? 'playerPrivate' : 'playerAside');
      tile.querySelector('.name').textContent = user.displayName;
      tile.querySelector('.tile-ghost-status').textContent = isPrivate ? 'In a private conversation' : `In ${word('aside', { a: true })}`;
      // Who a private word is with stays off the record here too, same as
      // it's kept off the OBS-facing recording -- everyone else at the
      // call only gets to know that it's happening, not with whom.
      tile.querySelector('.tile-ghost-with').textContent = isPrivate ? '' : othersLabel(aside.members, key);
      changed = true;
    } else if (ghostTiles.has(key)) {
      removeGhost(key);
      changed = true;
    }
  }
  for (const key of [...ghostTiles.keys()]) {
    if (!currentSpace.members.includes(key)) { removeGhost(key); changed = true; }
  }
  if (changed) applyLayout();
}

// A space's name for display: asides carry no useful
// stored name, so build one from whoever else is in it.
function spaceDisplayName(r) {
  if (!r?.isAside) return r?.name || spaceName;
  const others = r.members.filter((k) => k !== me?.key).map((k) => presenceUsers.get(k)?.displayName).filter(Boolean);
  // Says "Private" rather than "Aside" whenever it is one -- whoever's in
  // here should be able to tell at a glance that this one is genuinely off
  // the record, not just infer it from which button someone clicked earlier.
  const label = r.private ? 'Private' : word('aside', { cap: true });
  return others.length ? `${label} with ${others.join(' & ')}` : label;
}

// The join screen: one card per space I belong to, with its members and a
// green dot on those in that space right now. Refreshed until I join.
function renderSpaces() {
  const list = $('spaces');
  if (!list) return;
  const keep = new Set();
  for (const r of presenceSpaces.filter((x) => x.mine)) {
    keep.add(r.id);
    let card = list.querySelector(`[data-space="${CSS.escape(r.id)}"]`);
    if (!card) {
      card = document.getElementById('space-choice').content.firstElementChild.cloneNode(true);
      applyWords(card); // the template's data-fill titles, in this environment's words
      card.dataset.space = r.id;
      card.querySelector('[data-join]').dataset.join = r.id;
      list.appendChild(card);
    }
    card.classList.toggle('aside', Boolean(r.isAside));
    // Entering is the primary action; joining the call is a separate choice inside (plan-entering.md). A space's
    // button reads this environment's enter verb; an aside is a call, so its button reads Join with the phone
    // (plan-environment-templates.md, addendum 4). Still connected to this one (just browsing the space list -- see
    // showSpaceList()): offer to go back instead.
    const back = call.state === 'connected' && currentSpace?.id === r.id;
    const action = r.isAside ? 'Join' : verb('enter');
    const enterLabel = back ? `Back to ${spaceDisplayName(r)}` : action;
    const enter = card.querySelector('[data-join]');
    card.querySelector('[data-join-icon]').className = `fa-solid fa-${back ? 'circle-left' : r.isAside ? 'phone' : 'door-open'} fa-fw`;
    card.querySelector('[data-join-label]').textContent = enterLabel;
    const popout = card.querySelector('[data-join-popout]');
    const popoutLabel = `${action} in a pop-out window`;
    if (popout.title !== popoutLabel) { popout.title = popoutLabel; popout.setAttribute('aria-label', popoutLabel); }
    if (enter.title !== enterLabel) enter.title = enterLabel; // the whole label, wherever a narrow card cuts it short
    card.querySelector('[data-join-with]').hidden = Boolean(r.isAside);
    const edit = card.querySelector('[data-edit]');
    edit.hidden = r.isAside || !hasOwnerRights(me);
    edit.href = `/spaces/${encodeURIComponent(r.id)}`;
    // A moderator cannot open the space's page, but changes what its modules do here.
    const modSettings = card.querySelector('[data-module-settings]');
    modSettings.hidden = r.isAside || hasOwnerRights(me) || !me?.spaces?.[r.id]?.permissions?.moderator;
    modSettings.href = `/module-settings?space=${encodeURIComponent(r.id)}`;
    const link = card.querySelector('[data-link]');
    link.hidden = !r.link;
    if (r.link) {
      link.href = r.link;
      link.querySelector('i').className = `${iconClasses(r.linkIcon || 'link')} fa-fw`;
    }
    card.querySelector('.space-choice-name').textContent = spaceDisplayName(r);
    card.querySelector('.space-choice-desc').textContent = r.description;
    card.querySelector('.space-choice-desc').hidden = !r.description || r.isAside;
    const img = card.querySelector('.space-choice-image');
    const src = !r.isAside && r.hasImage ? `/img/space/${encodeURIComponent(r.id)}` : '';
    img.hidden = !src;
    if (src && img.dataset.src !== src) {
      img.dataset.src = src;
      img.src = src;
    }
    const members = r.members.map((k) => presenceUsers.get(k)).filter(Boolean);
    card.querySelector('.space-choice-count').textContent = r.isAside ? '' : hereCount(members, r.id);
    renderMembers(card.querySelector('.members'), members, r.id);
  }
  for (const card of [...list.children]) if (!keep.has(card.dataset.space)) card.remove();
}

// "3 here · 2 in the call", or "3 here" with nobody in the call, from /api/presence (`space` and `inCall` per person).
function hereCount(members, spaceId) {
  const here = members.filter((u) => u.online && u.space === spaceId);
  const calling = here.filter((u) => u.inCall).length;
  const people = here.length ? `${here.length} here` : 'Nobody here';
  return calling ? `${people} · ${calling} in the call` : people;
}

function renderMembers(list, members, spaceId) {
  const keep = new Set();
  for (const u of members) {
    keep.add(u.key);
    let el = list.querySelector(`[data-key="${CSS.escape(u.key)}"]`);
    if (!el) {
      el = document.createElement('div');
      el.className = 'member';
      el.dataset.key = u.key;
      const img = document.createElement('img');
      img.alt = '';
      const dot = document.createElement('span');
      dot.className = 'dot';
      const name = document.createElement('span');
      name.className = 'member-name';
      el.append(img, dot, name);
      list.appendChild(el);
    }
    const here = Boolean(u.online) && u.space === spaceId;
    // The same set the conference shows for this space, Online or Offline.
    const img = el.querySelector('img');
    const slot = conferenceSlot(spaceId, !here);
    if (img.dataset.slot !== slot) {
      img.dataset.slot = slot;
      const profile = imgUrl(u.key, 'profile');
      img.onerror = () => { img.onerror = null; img.src = profile; };
      img.src = spaceId && spaceId !== LOBBY && !u.key.startsWith(GUEST_PREFIX) ? imgUrl(u.key, slot, { space: spaceId }) : profile;
    }
    el.querySelector('.member-name').textContent = u.displayName;
    el.querySelector('.dot').classList.toggle('online', here);
    el.classList.toggle('online', here);
    // In the call: a small mark beside the online dot, with its own words, never the colour alone.
    const calling = here && Boolean(u.inCall);
    let mark = el.querySelector('.call-mark');
    if (calling && !mark) {
      mark = document.createElement('span');
      mark.className = 'call-mark';
      mark.setAttribute('role', 'img');
      mark.innerHTML = '<i class="fa-solid fa-video" aria-hidden="true"></i>'; // the same mark as Who's around
      el.querySelector('.dot').after(mark);
    } else if (!calling && mark) {
      mark.remove();
    }
    if (mark && calling) {
      mark.title = `${u.displayName} is in the call`;
      mark.setAttribute('aria-label', 'In the call');
    }
    const elsewhere = u.online && !here ? presenceSpaces.find((r) => r.id === u.space) : null;
    el.title = calling ? `${u.displayName} is here, in the call` : here ? `${u.displayName} is here` : elsewhere ? `${u.displayName} is in ${spaceDisplayName(elsewhere)}` : u.displayName;
    // Off stream: this member is online but not in the space the stream
    // currently hears (wherever the owner actually is); "aside" is the
    // more specific case of a pulled-aside private word, which implies off
    // stream too. Only meaningful when an owner is actually online -- with
    // none, activeSpace is just the Lobby fallback, not a real "here's where
    // the stream is" signal, so nobody should read as off stream against it.
    const asideNow = u.online && presenceSpaces.find((r) => r.id === u.space)?.isAside;
    const offStream = u.online && ownerOnline && u.space !== activeSpace;
    let badge = el.querySelector('.stream-badge');
    if (asideNow || offStream) {
      if (!badge) {
        badge = document.createElement('span');
        badge.className = 'stream-badge';
        el.appendChild(badge);
      }
      badge.textContent = asideNow ? word('aside') : 'off stream';
      badge.classList.toggle('aside', Boolean(asideNow));
    } else if (badge) {
      badge.remove();
    }
  }
  for (const el of [...list.children]) if (!keep.has(el.dataset.key)) el.remove();
}
setInterval(() => {
  if (!$('join').hidden || document.body.classList.contains('in-space')) loadPresence();
}, 5000);
// Join a space straight into its own window, skipping the step of joining in
// the page first and then popping out. The window opens first, synchronously
// with the click (a popup opened after a network wait is what browsers
// block); the canvas moves into it, and is revealed there once connected.
async function joinInPopout(spaceId) {
  if (!pipWindow) openPopout();
  if (call.state === 'connected' && currentSpace?.id === spaceId) returnToCanvas();
  else if (call.state === 'connected') await reconnectTo(spaceId);
  else await join(spaceId);
  if (call.state !== 'connected') closePopout(); // it failed; don't leave an empty window
}
// "Open with": what this person's own layout for a space opens with, remembered for that space (see joinModules in
// canvas.js). The list is the conference, the chat and the space's modules; with nothing remembered, the switches on are what
// entering would open (the space's "Opens with", else the environment's, else the chat and the modules; opens-with.js).
const spaceModuleList = new Map(); // space id -> the modules on for it and what it opens with, fetched once
const canIn = (spaceId, permission) => hasOwnerRights(me) || !!(me?.spaces?.[spaceId]?.effective || me?.permissions || {})[permission];

async function toggleJoinWith(card, spaceId) {
  const open = card.querySelector('.join-with');
  closeJoinWith();
  if (open) return;
  const button = card.querySelector('[data-join-with]');
  const pop = document.createElement('div');
  pop.className = 'join-with';
  pop.id = `open-with-${spaceId}`;
  pop.setAttribute('role', 'group');
  pop.setAttribute('aria-label', 'Open with');
  pop.innerHTML = `<strong>Open with</strong><div class="join-with-list"></div><p class="hint">Remembered for this ${escapeHtml(word('space'))}.</p>`;
  // In the buttons' row, after the buttons (the same place in the tab order), shown above the whole row.
  (card.querySelector('.space-choice-actions') || card).appendChild(pop);
  button.setAttribute('aria-expanded', 'true');
  button.setAttribute('aria-controls', pop.id);
  if (!spaceModuleList.has(spaceId)) {
    try {
      const { modules, builtin, opensWith, spaceDefaultsOpensWith } = await api('GET', `/api/modules/for-space?space=${encodeURIComponent(spaceId)}`);
      spaceModuleList.set(spaceId, { modules: (modules || []).filter((m) => !m.canvas || m.canvas.menu !== false), builtin: builtin || [], opensWith: opensWith ?? null, environment: spaceDefaultsOpensWith ?? null });
    } catch {
      spaceModuleList.set(spaceId, { modules: [], builtin: [], opensWith: null, environment: null });
    }
  }
  if (!pop.isConnected) return; // closed while it loaded
  // The conference and the chat as this environment shows them (their display names and icons, else their own).
  const { modules: onHere, builtin, opensWith, environment } = spaceModuleList.get(spaceId);
  const shownBuiltin = (id, name, icon) => ({ id, name, icon, ...builtin.find((b) => b.id === id) });
  const choices = [
    ...(conferenceAllowed({ conferenceEnabled: features.conferenceEnabled, permitted: canIn(spaceId, 'conference') }) ? [shownBuiltin('conference', 'Conference', 'video')] : []),
    ...(canIn(spaceId, 'chatRead') ? [shownBuiltin('chat', 'Chat', 'message')] : []),
    ...onHere.map((m) => ({ id: m.id, name: m.name, icon: m.icon })),
  ];
  const chosen = new Set(whatOpens({
    remembered: joinModules(spaceId),
    own: opensWith,
    environment,
    modules: onHere.map((m) => m.id),
    canOpen: (id) => choices.some((c) => c.id === id),
  }));
  const list = pop.querySelector('.join-with-list');
  list.innerHTML = switchListHtml(choices.map((c) => ({ ...c, on: chosen.has(c.id) })), 'join-module');
  wireSwitchList(list);
  list.addEventListener('change', () => {
    setJoinModules(spaceId, [...list.querySelectorAll('input:checked')].map((i) => i.dataset.joinModule));
  });
  // From the keyboard: straight into the list, and Escape goes back to the button.
  if (document.activeElement === button) list.querySelector('input')?.focus();
  pop.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    event.stopPropagation();
    closeJoinWith();
    button.focus();
  });
}
function closeJoinWith() {
  for (const pop of document.querySelectorAll('.join-with')) pop.remove();
  for (const b of document.querySelectorAll('[data-join-with][aria-expanded="true"]')) b.setAttribute('aria-expanded', 'false');
}
document.addEventListener('click', (event) => {
  if (!event.target.closest('.join-with, [data-join-with]')) closeJoinWith();
});

$('spaces').addEventListener('click', (event) => {
  const withBtn = event.target.closest('[data-join-with]');
  if (withBtn) {
    const card = withBtn.closest('.space-choice');
    toggleJoinWith(card, card.dataset.space);
    return;
  }
  const popout = event.target.closest('[data-join-popout]');
  if (popout) {
    joinInPopout(popout.closest('.space-choice').dataset.space);
    return;
  }
  const button = event.target.closest('[data-join]');
  if (!button) return;
  const spaceId = button.dataset.join;
  if (call.state === 'connected' && currentSpace?.id === spaceId) returnToCanvas();
  else if (call.state === 'connected') reconnectTo(spaceId);
  else join(spaceId);
});
$('guest-join').addEventListener('submit', async (event) => {
  event.preventDefault();
  $('guest-join-error').hidden = true;
  const name = $('guest-name').value.trim();
  if (!name) return;
  const submit = $('guest-join').querySelector('button[type="submit"]');
  submit.disabled = true;
  try {
    const { token, livekitUrl, identity, spaceId: joinedId, spaceName: joinedName, permissions } = await api('POST', '/api/guest-join', { token: guestToken, name });
    me = { key: identity, displayName: name, role: 'guest', permissions };
    await joinAsGuest(token, livekitUrl, joinedId, joinedName);
  } catch (err) {
    $('guest-join-error').textContent = err.message;
    $('guest-join-error').hidden = false;
  } finally {
    submit.disabled = false;
  }
});
let unread = 0;
let pipWindow = null;

function setStatus(text, error = false) {
  $('status').textContent = text;
  $('status').classList.toggle('error', error);
  // The page header shows the same status, except the plain "in <space>"
  // which the space name next to the brand already says.
  const top = $('topbar-status');
  top.textContent = !error && text === `in ${spaceName}` ? '' : text;
  top.classList.toggle('error', error);
}

// --- tiles -------------------------------------------------------------------

// While the camera is off, a chosen background image (the same one used
// live when the camera is on -- see space.js's video settings) shows behind
// the profile photo too, instead of a plain fill, so the box looks like
// them even without video.
function updateBackgroundPlaceholder(tile, key) {
  const user = presenceUsers.get(key);
  const hasBg = !!user?.images?.background;
  tile.classList.toggle('has-bg-image', hasBg);
  const bg = tile.querySelector('.placeholder-bg');
  // removeAttribute, not src='' -- an empty string still makes the browser
  // fetch the current page as an "image" and show a broken-image icon once
  // it fails to decode; only actually removing the attribute stays invisible.
  if (bg) { if (hasBg) bg.src = imgUrl(key, 'background'); else bg.removeAttribute('src'); }
  tile.style.setProperty('--pic-scale', user?.pictureScale || 100);
}

// Admin only, on hover: mute (toggles, reading the live mic state fresh on
// each click rather than tracking our own copy of it) and kick. Neither
// touches this browser's own call state, so no local UI besides the tile
// itself needs updating -- the space's own presence/track events do that.
// What I can do here: everything as an admin; otherwise the space's own
// effective set (my role's permissions plus anything ticked for me in that
// space, see Settings > Roles and profile > Spaces), or just my role's
// outside a space the server has no per-space entry for (an aside, a guest).
const CHAT_PERMISSIONS = ['chatRead', 'chat', 'sendPictures'];
function canDo(permission) {
  if (inAside() && CHAT_PERMISSIONS.includes(permission)) return false; // an aside has no chat and no chat pictures, for anyone
  if (hasOwnerRights(me)) return true;
  const inSpace = currentSpace && me?.spaces?.[currentSpace.id]?.effective;
  return !!(inSpace || me?.permissions || {})[permission];
}
// Everything a permission hides or shows on the page. Reruns once who I am
// and which space I'm in are both known, not just at load.
function applyPermissions() {
  applyFeatureFlags();
  syncCallControl();
  $('chat-form').hidden = !canDo('chat');
  $('chat-pic').hidden = !canDo('sendPictures');
}

function adminToolsFor(participant) {
  const tools = document.createElement('div');
  tools.className = 'tile-admin-tools';
  // Muting is a real server-side toggle, but LiveKit has no "remote
  // unmute" -- only the participant's own client can turn their mic back
  // on, so offering it here just fails ("remote unmute not enabled").
  // The button only ever mutes; once muted, updateMuted() hides it and
  // whoever's muted has to unmute themselves.
  const mute = document.createElement('button');
  mute.type = 'button';
  mute.dataset.action = 'mute';
  mute.className = 'tile-admin-btn';
  mute.title = 'Mute';
  mute.hidden = participant.getTrackPublication(Track.Source.Microphone)?.isMuted ?? false;
  mute.innerHTML = '<i class="fa-solid fa-microphone-slash fa-fw" aria-hidden="true"></i>';
  mute.addEventListener('click', async (e) => {
    e.stopPropagation();
    try {
      await api('POST', `/api/users/${encodeURIComponent(participant.identity)}/mute`, { muted: true });
    } catch (err) {
      setStatus(`mute: ${err.message}`, true);
    }
  });
  const kick = document.createElement('button');
  kick.type = 'button';
  kick.className = 'tile-admin-btn danger';
  kick.title = 'Kick';
  kick.innerHTML = '<i class="fa-solid fa-user-slash fa-fw" aria-hidden="true"></i>';
  kick.addEventListener('click', async (e) => {
    e.stopPropagation();
    if (!window.confirm(`Kick ${participant.name || participant.identity} from the call? They can rejoin.`)) return;
    try {
      await api('POST', `/api/users/${encodeURIComponent(participant.identity)}/kick`);
    } catch (err) {
      setStatus(`kick: ${err.message}`, true);
    }
  });
  if (canDo('canMute')) tools.append(mute);
  if (canDo('canKick')) tools.append(kick);
  // Same restriction as the corner step-aside button: you can't step aside
  // from an aside (or private) space, there's nowhere further to go. Each
  // also has its own Manage > Settings toggle, independent of the other.
  const isOwner = hasOwnerRights(me);
  if (isOwner && !currentSpace?.isAside && features.allowAsides) {
    const aside = document.createElement('button');
    aside.type = 'button';
    aside.className = 'tile-admin-btn';
    aside.title = 'Step aside';
    aside.innerHTML = '<i class="fa-solid fa-people-arrows fa-fw" aria-hidden="true"></i>';
    aside.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!window.confirm(`Step aside with ${participant.name || participant.identity}?`)) return;
      pullAside([participant.identity]);
    });
    tools.append(aside);
  }
  if (isOwner && !currentSpace?.isAside && features.allowPrivate) {
    const priv = document.createElement('button');
    priv.type = 'button';
    priv.className = 'tile-admin-btn';
    priv.title = 'Privately';
    priv.innerHTML = '<i class="fa-solid fa-user-lock fa-fw" aria-hidden="true"></i>';
    priv.addEventListener('click', (e) => {
      e.stopPropagation();
      if (!window.confirm(`Have a private word with ${participant.name || participant.identity}?`)) return;
      pullAside([participant.identity], true);
    });
    tools.append(priv);
  }
  return tools;
}

// A tile exists only while I am in the conference and the person is too.
const shownInCall = (participant) => inCall && (participant.isLocal || participant.attributes?.call !== 'off');
const subscribeAll = (participant) => { for (const pub of participant.trackPublications.values()) pub.setSubscribed(true); };

function tileFor(participant) {
  let tile = tiles.get(participant.identity);
  if (tile) return tile;
  removeGhost(participant.identity); // they're back live, the placeholder can go
  tile = document.createElement('div');
  tile.className = 'tile';
  tile.dataset.identity = participant.identity;
  const placeholderBg = document.createElement('img');
  placeholderBg.className = 'placeholder-bg';
  placeholderBg.alt = '';
  tile.appendChild(placeholderBg);
  const placeholder = document.createElement('img');
  placeholder.className = 'placeholder';
  placeholder.alt = '';
  showConferencePortrait(placeholder, participant.identity);
  const colour = presenceUsers.get(participant.identity)?.borderColor;
  if (colour) tile.style.setProperty('--talk', colour);
  tile.appendChild(placeholder);
  updateBackgroundPlaceholder(tile, participant.identity);
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = participant.name || participant.identity;
  tile.appendChild(name);
  if (!participant.isLocal) {
    const vol = document.createElement('input');
    vol.type = 'range';
    vol.className = 'vol';
    vol.min = '0';
    vol.max = '100';
    vol.value = String(Math.round((prefs.volumes[participant.identity] ?? 1) * 100));
    vol.title = 'Volume';
    vol.addEventListener('input', () => setVolume(participant, Number(vol.value) / 100));
    vol.addEventListener('click', (e) => e.stopPropagation());
    vol.addEventListener('pointerenter', () => (tile.draggable = false));
    vol.addEventListener('pointerleave', () => (tile.draggable = true));
    tile.appendChild(vol);
    // An admin has Step Aside/Privately right in the hover tools below, one
    // click each -- this corner button (pick one or more, then confirm) is
    // only still needed for a non-admin, who has no other way to invite
    // someone for a private word.
    if (!currentSpace?.isAside && !hasOwnerRights(me) && ((features.allowPrivate && canDo('privateCall')) || (features.allowAsides && canDo('startAside')))) {
      const aside = document.createElement('button');
      aside.type = 'button';
      aside.className = 'tile-aside';
      aside.title = `Have a private word with ${participant.name || participant.identity} (pick one or more, then confirm)`;
      aside.innerHTML = '<i class="fa-solid fa-people-arrows" aria-hidden="true"></i>';
      aside.classList.toggle('selected', asideSelection.has(participant.identity));
      aside.addEventListener('click', (e) => { e.stopPropagation(); toggleAsideSelection(participant.identity, aside); });
      tile.appendChild(aside);
    }
    // Mute/Kick for owners, or for a member granted them in this space --
    // never against an owner (the server refuses that anyway).
    const targetIsOwner = presenceUsers.get(participant.identity)?.isOwner;
    if (hasOwnerRights(me) || (!targetIsOwner && (canDo('canMute') || canDo('canKick')))) {
      const tools = adminToolsFor(participant);
      tools.addEventListener('pointerenter', () => (tile.draggable = false));
      tools.addEventListener('pointerleave', () => (tile.draggable = true));
      tile.appendChild(tools);
    }
  }
  tile.draggable = true;
  tile.addEventListener('dragstart', onDragStart);
  tile.addEventListener('dragover', onDragOver);
  tile.addEventListener('drop', onDrop);
  tile.addEventListener('dragend', onDragEnd);
  tile.addEventListener('click', () => spotlight(participant.identity));
  tiles.set(participant.identity, tile);
  showAway(participant); // someone already away when their tile is made (a late join, a reload)
  placeInOrder(tile);
  applyLayout();
  return tile;
}

// A shared screen gets its own tile, separate from the sharer's camera one
// -- someone can keep their camera up while sharing, and both stay visible.
function screenTileId(identity) {
  return `${identity}::screen`;
}
function screenTileFor(participant) {
  const key = screenTileId(participant.identity);
  let tile = tiles.get(key);
  if (tile) return tile;
  tile = document.createElement('div');
  tile.className = 'tile tile-screen';
  tile.dataset.identity = key;
  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = `${participant.name || participant.identity}'s screen`;
  tile.appendChild(name);
  if (document.pictureInPictureEnabled) {
    const pip = document.createElement('button');
    pip.type = 'button';
    pip.className = 'tile-pip';
    pip.title = 'Pop out this screen share';
    pip.innerHTML = '<i class="fa-solid fa-up-right-from-square" aria-hidden="true"></i>';
    pip.addEventListener('click', (e) => {
      e.stopPropagation();
      const video = tile.querySelector('video');
      if (!video) return;
      (document.pictureInPictureElement === video ? document.exitPictureInPicture() : video.requestPictureInPicture()).catch(() => {});
    });
    tile.appendChild(pip);
  }
  tile.addEventListener('click', () => spotlight(key));
  tiles.set(key, tile);
  $('grid').appendChild(tile);
  applyLayout();
  return tile;
}
function removeScreenTile(identity) {
  const key = screenTileId(identity);
  const tile = tiles.get(key);
  if (!tile) return;
  if (document.pictureInPictureElement && tile.contains(document.pictureInPictureElement)) {
    document.exitPictureInPicture().catch(() => {});
  }
  tile.remove();
  tiles.delete(key);
  applyLayout();
}

// --- layouts and ordering -----------------------------------------------------

const DEFAULT_PREFS = {
  layout: 'grid', order: [], pinned: null, follow: true,
  micId: '', camId: '', gain: 100, gate: 0, noise: true, echo: true, agc: true, ptt: false,
  quality: 720, mirror: true, background: 'none', volumes: {}, popout: null, deafened: false,
  chatWidth: 320, speakerId: '', masterVolume: 100,
  pttKey: 'Space', muteKey: 'Mod+KeyD', camKey: 'Mod+KeyE',
};
// Call preferences (layout, devices, volumes, keys). brand.js moves the key they had before the Names plan on load.
const PREFS_KEY = 'app.call';
const prefs = loadPrefs();
// The space's canvas: the Modules menu and every module open on it, docked, floating or in a window.
let askInChat = null;
const canvas = createCanvas({
  guestToken,
  onChatAsk: (input) => {
    if (!askInChat) return Promise.reject(Object.assign(new Error('Chat is not ready.'), { status: 400 }));
    toggleChat(true);
    return askInChat(input);
  },
});
window.hostModules = canvas; // for debugging and tests

// The space's actions, in the secondary nav's right zone (built at the top of this file): one group in the bands
// plan-nav.md sets out (the layout tools core, full screen and pop out secondary, the aside's two utility), and Leave
// last on its own, a divider before it. Registered here, after the state their `visible` functions read exists.
const SPACE_TOOL = { bar: 'secondary', zone: 'right', group: 'space', groupOrder: 1 };
const snapSize = document.createElement('input');
snapSize.type = 'range';
snapSize.id = 'snap-size';
snapSize.title = 'Grid size';
snapSize.setAttribute('aria-label', 'Grid size');
snapSize.hidden = true;
nav.register({ ...SPACE_TOOL, id: 'snap-size', order: 3, element: snapSize }); // the slider: the registry places it, syncSnapBar() runs it
nav.register({ ...SPACE_TOOL, id: 'fullscreen-toggle', order: 11, icon: 'expand', activeIcon: 'compress', label: 'Full screen', title: 'Full screen (F)', toggleable: true, active: false, onClick: () => toggleFullscreen() });
nav.register({ ...SPACE_TOOL, id: 'popout', order: 12, icon: 'up-right-from-square', activeIcon: 'window-restore', label: 'Pop out into its own window', toggleable: true, active: false, onClick: () => (pipWindow ? closePopout() : openPopout()) });
// The tools whose words are the environment's: registered again (the same elements) once loadBranding() has them.
function registerWordTools() {
  nameModuleChooser();
  nav.register({ ...SPACE_TOOL, id: 'dock-all', order: 1, icon: 'table-columns', label: `Dock every floating ${word('module')} beside the call`, onClick: () => { canvas.dockAll(); syncSnapBar(); } });
  nav.register({ ...SPACE_TOOL, id: 'snap-all', order: 2, icon: 'border-all', label: `Snap every floating ${word('module')} to a grid`, toggleable: true, active: canvas.snapAllOn(), onClick: () => { canvas.snapAll(!canvas.snapAllOn()); syncSnapBar(); } });
  nav.register({ ...SPACE_TOOL, id: 'recall-button', order: 51, icon: 'people-arrows', label: 'Pull participants back', title: `Give everyone in a Private Conversation from this ${word('space')} a 10 second warning, then pull them back`, labelled: true, visible: () => recallWanted(), onClick: recallParticipants });
  nav.register({ bar: 'secondary', zone: 'right', group: 'leave', groupOrder: 999, id: 'leave-space', order: 999, icon: 'right-from-bracket', label: `Leave ${word('space')}`, onClick: () => leaveSpace() });
}
registerWordTools();
nav.register({ ...SPACE_TOOL, id: 'rejoin-call', order: 52, icon: 'circle-left', label: 'Rejoin call', visible: () => Boolean(currentSpace && currentSpace.isAside && currentSpace.origin), onClick: () => returnFromAside() });
// On a phone the header's links are a menu (see brand.js), and the call's settings would otherwise
// only be reachable from the Conference view's toolbar. This tool, in the menu only (its class, see style.css) and
// only while in the call, shows the conference and opens them. It sits in the session group, ahead of the clock.
nav.register({
  id: 'call-settings', bar: 'primary', zone: 'right', group: 'session', order: 50, icon: 'sliders', label: 'Call settings',
  visible: () => inCall,
  onClick: () => {
    document.querySelector('.modules-menu-item[data-builtin="conference"]')?.click(); // shows the conference view
    setTimeout(() => { if ($('settings').hidden || $('settings').dataset.group !== 'more') openSettings('more'); }, 50);
  },
}).classList.add('call-settings-link');
topbarEl.querySelector('#nav-toggle')?.addEventListener('click', () => nav.draw('primary'));

// Who is in the call, while I am not: the conference's "Not in a call" note lists them, with "Join the call" and the
// microphone note under it. The space bar's call control ("N in the call · Join", plan-entering decisions 2 and 16) is
// gone (Thomas, 2026-09-30): joining lives in the conference, which its switch shows out of the call.
function syncCallControl() {
  syncWhoIsInCall();
  whoHere.refresh(); // who is here, in the space bar (space-people.js)
}
// The conference's "Not in a call" note lists who is in the call now: the call's own participants whose `call` attribute
// is not off (what /api/presence reports as inCall), with their picture in this space, else their first letter.
// Kept live by the call's events; built only while the note shows.
function syncWhoIsInCall() {
  const list = $('no-call-list');
  if (!list || $('no-call').hidden) return;
  const people = [...call.remoteParticipants.values()].filter((p) => p.attributes?.call !== 'off')
    .map((p) => ({ key: p.identity, name: p.name || p.identity }))
    .sort((a, b) => a.name.localeCompare(b.name));
  list.replaceChildren(...people.map(({ key, name }) => {
    const li = document.createElement('li');
    const img = document.createElement('img');
    img.alt = '';
    img.src = spacePortraitUrl(key);
    img.onerror = () => {
      if (img.dataset.fallback) { img.replaceWith(initialOf(name)); return; }
      img.dataset.fallback = '1';
      img.src = imgUrl(key, 'profile');
    };
    const label = document.createElement('span');
    label.textContent = name;
    li.append(img, label);
    return li;
  }));
  list.hidden = people.length === 0;
  $('no-call-empty').hidden = people.length > 0;
}
function initialOf(name) {
  const el = document.createElement('span');
  el.className = 'no-call-initial';
  el.setAttribute('aria-hidden', 'true');
  el.textContent = String(name || '?').trim().charAt(0).toUpperCase() || '?';
  return el;
}
call
  .on(RoomEvent.ParticipantConnected, syncCallControl)
  .on(RoomEvent.ParticipantDisconnected, syncCallControl)
  .on(RoomEvent.ParticipantAttributesChanged, syncCallControl)
  .on(RoomEvent.ParticipantNameChanged, syncWhoIsInCall);

// --- who is here (space-people.js) ------------------------------------------------------------------
// The space bar's middle zone: everyone in this space (or aside) now, you among them, with a mark on those on the call,
// and the list under it. Live from the call itself (LiveKit's Room); it gives way (fewer portraits, then the count alone) before
// anything on the bar's right folds (its `fit`, called by nav-bar.js). On a phone it is a count in the tab bar.
const whoHere = createWhoHere({
  call,
  meOnCall: () => inCall,
  where: () => (inAside() ? word('aside') : word('space')),
  portraitUrl: spacePortraitUrl,
  profileUrl: (key) => imgUrl(key, 'profile'),
  wanted: () => Boolean(currentSpace) && call.state === 'connected',
  events: {
    redraw: () => nav.draw('secondary'),
    call: { [RoomEvent.ParticipantNameChanged]: () => whoHere.refresh(), [RoomEvent.Disconnected]: () => whoHere.refresh() },
  },
});
nav.register({ bar: 'secondary', zone: 'middle', group: 'people', id: 'who-here', order: 1, fold: false, icon: 'user-group', label: 'Who is here', element: whoHere.el, fit: whoHere.fit, visible: () => Boolean(currentSpace) && call.state === 'connected' });
// --- end who is here ---

// The canvas-level snap, in the space bar: one switch that makes every floating module, now and later, snap to a grid over the
// canvas, and, while it is on, a slider for the grid's size (the grid shows while the slider moves). Each module's own switch
// on its titlebar still works on its own; this one sets them all. Remembered with the space's layout.
// The switch and Dock all (the way back: every floating module docks beside the call, and the canvas-level snap goes off with it,
// or it would float them again) are registered with the bar's other tools at the top of this file.
function syncSnapBar() {
  const on = canvas.snapAllOn();
  const range = canvas.snapPitchRange();
  nav.setActive('snap-all', on);
  const size = $('snap-size');
  size.hidden = !on;
  size.min = String(range.min); size.max = String(range.max); size.step = String(range.step);
  size.value = String(canvas.snapPitch());
}
$('snap-size').addEventListener('input', () => canvas.setSnapPitch(Number($('snap-size').value), { preview: true }));
$('snap-size').addEventListener('change', () => canvas.setSnapPitch(Number($('snap-size').value)));
syncSnapBar();
// A toast about a space module opens it on the canvas; an environment module opens over the call.
document.addEventListener('app:notification', (event) => {
  const n = event.detail;
  if (canvas.handleNotification(n)) event.preventDefault();
  else if (n.scope === 'environment' && document.body.classList.contains('in-space')) {
    event.preventDefault();
    openOverlay(`/modules/${encodeURIComponent(n.module)}`);
  }
});

function loadPrefs() {
  try {
    return { ...DEFAULT_PREFS, ...JSON.parse(localStorage.getItem(PREFS_KEY) || '{}') };
  } catch (err) {
    return { ...DEFAULT_PREFS };
  }
}

function savePrefs() {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch (err) {
    // private mode or storage off: the session still works
  }
}

// The mic/camera processing fields (not device selection) also live on the
// account -- see populateCallSettingsUI -- so a change here follows to the
// profile page and to wherever else this account joins from. A guest has no
// account to save it to; localStorage above is all they get. Debounced and
// accumulated across fields so dragging a slider doesn't fire a request per
// tick.
let pendingCallPrefs = {};
let callPrefsTimer = 0;
function syncCallPrefs(patch) {
  if (guestToken) return;
  Object.assign(pendingCallPrefs, patch);
  clearTimeout(callPrefsTimer);
  callPrefsTimer = setTimeout(async () => {
    const body = pendingCallPrefs;
    pendingCallPrefs = {};
    try {
      await api('PATCH', '/api/me/call-prefs', body);
    } catch (err) {
      // best-effort: the local change already applied, this just fails to follow the account
    }
  }, 500);
}

// Insert a tile where the remembered order says; unknown ones go last.
function placeInOrder(tile) {
  const rank = (el) => {
    const i = prefs.order.indexOf(el.dataset.identity);
    return i < 0 ? Number.MAX_SAFE_INTEGER : i;
  };
  const siblings = [...$('grid').querySelectorAll('.tile')];
  const next = siblings.find((el) => rank(el) > rank(tile));
  if (next) next.parentNode.insertBefore(tile, next);
  else ($('grid').querySelector('.rest') || $('grid')).appendChild(tile);
}

function rememberOrder() {
  const order = [...$('grid').querySelectorAll('.tile')].map((el) => el.dataset.identity);
  // In spotlight the big tile sits apart from the row; keep its remembered place.
  const spot = $('grid').querySelector('.tile.spot');
  if (spot && prefs.layout === 'spotlight') {
    const id = spot.dataset.identity;
    const previous = prefs.order.indexOf(id);
    order.splice(order.indexOf(id), 1);
    order.splice(previous < 0 ? order.length : Math.min(previous, order.length), 0, id);
  }
  prefs.order = order;
  savePrefs();
}

const LAYOUTS = ['grid', 'strip', 'spotlight']; // the actual stored prefs.layout values
// Four picker buttons over three real layouts: Focus and Spotlight are both
// prefs.layout 'spotlight' underneath, one big tile either picked by hand
// (pinned, or just first) or following whoever's speaking -- prefs.follow
// is the only thing that differs between them.
const VIEWS = [
  { id: 'grid', layout: 'grid', icon: 'fa-solid fa-table-cells-large' },
  { id: 'strip', layout: 'strip', icon: 'fa-solid fa-grip' },
  { id: 'focus', layout: 'spotlight', follow: false, icon: 'fa-regular fa-square' },
  { id: 'spotlight', layout: 'spotlight', follow: true, icon: 'fa-brands fa-square-web-awesome' },
];

function currentViewId() {
  if (prefs.layout === 'spotlight') return prefs.follow ? 'spotlight' : 'focus';
  return LAYOUTS.includes(prefs.layout) ? prefs.layout : 'grid';
}

function syncLayoutPick() {
  const id = currentViewId();
  for (const b of $('layout-pick').children) b.classList.toggle('selected', b.dataset.view === id);
  $('layout-glyph').className = `${VIEWS.find((v) => v.id === id).icon} fa-fw`;
}

function setView(id) {
  const view = VIEWS.find((v) => v.id === id) || VIEWS[0];
  prefs.layout = view.layout;
  if ('follow' in view) prefs.follow = view.follow;
  savePrefs();
  syncLayoutPick();
  applyLayout();
}

function cycleView() {
  const id = currentViewId();
  setView(VIEWS[(VIEWS.findIndex((v) => v.id === id) + 1) % VIEWS.length].id);
}

function applyLayout() {
  fitFloatbar();
  canvas.layoutChanged(); // modules' columns follow the canvas's width
  const grid = $('grid');
  grid.dataset.layout = prefs.layout;
  const portrait = grid.clientHeight > grid.clientWidth;
  grid.classList.toggle('portrait', portrait);
  const canvasEl = $('canvas');
  canvasEl.classList.toggle('narrow', canvasEl.clientWidth < 640);
  // The sizes follow the conference itself, wherever it is (docked beside the chat, floating,
  // or in a window of its own), not the whole canvas.
  const host = confEl.closest('.canvas') || canvasEl;
  const box = confEl.querySelector('.mod-content');
  const cw = box?.clientWidth || host.clientWidth;
  const ch = box?.clientHeight || host.clientHeight;
  for (const el of new Set([canvasEl, host])) {
    el.classList.toggle('compact', cw < 460);
    el.classList.toggle('tiny', cw < 300 || ch < 220);
  }
  const ordered = [...grid.querySelectorAll('.tile')];
  let rest = grid.querySelector('.rest');
  if (prefs.layout === 'spotlight' && ordered.length > 1) {
    // remember where every tile sits before the big one is pulled out
    let changed = false;
    for (const tile of ordered) {
      if (!prefs.order.includes(tile.dataset.identity)) {
        prefs.order.push(tile.dataset.identity);
        changed = true;
      }
    }
    if (changed) savePrefs();
    const wanted = (prefs.pinned && tiles.get(prefs.pinned)) || (prefs.follow && speaker && tiles.get(speaker)) || ordered[0];
    if (!rest) {
      rest = document.createElement('div');
      rest.className = 'rest';
    }
    // the big tile stays a direct child; the others share a row underneath
    for (const tile of ordered) {
      const isSpot = tile === wanted;
      tile.classList.toggle('spot', isSpot);
      if (isSpot && tile.parentNode !== grid) grid.appendChild(tile);
      else if (!isSpot && tile.parentNode !== rest) rest.appendChild(tile);
    }
    if (rest.parentNode !== grid) grid.appendChild(rest);
  } else {
    for (const tile of ordered) {
      tile.classList.remove('spot');
      if (tile.parentNode !== grid) grid.appendChild(tile);
    }
    if (rest) rest.remove();
  }
  fitTiles(grid, portrait);
}

// Size the tiles so all of them fit the grid area at 16:9, whatever the
// window shape. Sizes go into CSS variables the layouts read.
const RATIO = 16 / 9;
const GAP = 10;
function fitTiles(grid, portrait) {
  // Ghost tiles (members stepped into an aside) are real .tile elements in
  // the grid too -- size for all of them, or the ones left out get the
  // sizing meant for a smaller crowd and spill past the grid's own edges.
  const n = tiles.size + ghostTiles.size;
  const style = getComputedStyle(grid);
  const W = grid.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight);
  const H = grid.clientHeight - parseFloat(style.paddingTop) - parseFloat(style.paddingBottom);
  if (n === 0 || W <= 0 || H <= 0) return;
  let w = 0;
  let h = 0;
  let sw = 0;
  let sh = 0;
  if (prefs.layout === 'strip') {
    if (portrait) {
      w = Math.min(W, ((H - GAP * (n - 1)) / n) * RATIO);
      h = w / RATIO;
    } else {
      h = Math.min(H, (W - GAP * (n - 1)) / n / RATIO);
      w = h * RATIO;
    }
  } else if (prefs.layout === 'spotlight' && n > 1) {
    sh = Math.max(64, Math.min(160, H * 0.22));
    sw = Math.min(sh * RATIO, (W - GAP * (n - 2)) / (n - 1));
    sh = sw / RATIO;
    h = H - sh - GAP;
    w = Math.min(W, h * RATIO);
    h = w / RATIO;
  } else {
    // grid (and a spotlight of one): the column count that gives the biggest tiles
    for (let cols = 1; cols <= n; cols += 1) {
      const rows = Math.ceil(n / cols);
      let tw = (W - GAP * (cols - 1)) / cols;
      let th = tw / RATIO;
      if (th * rows + GAP * (rows - 1) > H) {
        th = (H - GAP * (rows - 1)) / rows;
        tw = th * RATIO;
      }
      if (tw > w) {
        w = tw;
        h = th;
      }
    }
  }
  grid.style.setProperty('--tw', `${Math.floor(w)}px`);
  grid.style.setProperty('--th', `${Math.floor(h)}px`);
  grid.style.setProperty('--sw', `${Math.floor(sw)}px`);
  grid.style.setProperty('--sh', `${Math.floor(sh)}px`);
}

// Refit whenever the grid area changes (window resize, chat drawer, pop out).
const refit = new ResizeObserver(() => applyLayout());
refit.observe($('grid'));

// Click a tile: pin it as the spotlight (click again to unpin).
function spotlight(identity) {
  if (dragging || justDragged) return;
  prefs.pinned = prefs.pinned === identity ? null : identity;
  if (prefs.layout !== 'spotlight') prefs.layout = 'spotlight';
  savePrefs();
  syncLayoutPick();
  applyLayout();
}

let speaker = null;
let dragging = null;
let justDragged = false;

function onDragStart(event) {
  dragging = event.currentTarget;
  dragging.classList.add('dragging');
  event.dataTransfer.effectAllowed = 'move';
  try {
    event.dataTransfer.setData('text/plain', dragging.dataset.identity);
  } catch (err) {
    // some browsers refuse setData in synthetic events
  }
}

function onDragOver(event) {
  if (!dragging) return;
  event.preventDefault();
  const over = event.currentTarget;
  if (over === dragging) return;
  // in spotlight only the small row reorders; the big tile stays put
  if (prefs.layout === 'spotlight' && (over.classList.contains('spot') || dragging.classList.contains('spot'))) return;
  const box = over.getBoundingClientRect();
  const horizontal = box.width >= box.height || $('grid').dataset.layout !== 'strip';
  const before = horizontal ? event.clientX < box.left + box.width / 2 : event.clientY < box.top + box.height / 2;
  over.parentNode.insertBefore(dragging, before ? over : over.nextSibling);
}

function onDrop(event) {
  event.preventDefault();
  rememberOrder();
}

function onDragEnd() {
  if (dragging) dragging.classList.remove('dragging');
  dragging = null;
  rememberOrder();
  // a click can follow the drop; keep it from toggling the spotlight
  justDragged = true;
  setTimeout(() => (justDragged = false), 200);
}

function attachTrack(participant, track) {
  if (!shownInCall(participant)) return;
  if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
    const screenTile = screenTileFor(participant);
    screenTile.querySelector('video')?.remove();
    const video = track.attach();
    video.muted = true;
    screenTile.prepend(video);
    keepPoppedVideoLive(track, video);
    return;
  }
  const tile = tileFor(participant);
  if (track.kind === Track.Kind.Video) {
    tile.querySelector('video')?.remove();
    const video = track.attach();
    video.muted = true; // audio comes through its own element
    tile.prepend(video);
    keepPoppedVideoLive(track, video); // in the pop-out window, LiveKit must not think it unseen
    // placeholder-bg sits later in the tile than the just-prepended video,
    // so it paints on top and hides live video behind whoever's custom
    // background picture unless it's hidden here too -- updateCamera()
    // already knew to do both, but this is the only path a remote viewer's
    // very first subscribe to someone's camera ever goes through.
    tile.querySelector('.placeholder').hidden = true;
    tile.querySelector('.placeholder-bg').hidden = true;
  } else if (track.kind === Track.Kind.Audio) {
    if (participant.isLocal) return; // never play your own voice back
    const audio = track.attach();
    audio.dataset.identity = participant.identity;
    audio.muted = hearingOff(); // deafened or away
    if (prefs.speakerId && audio.setSinkId) audio.setSinkId(prefs.speakerId).catch(() => {});
    $('canvas').appendChild(audio);
    track.setVolume(effectiveVolume(participant.identity));
  }
}

function detachTrack(participant, track) {
  track.detach().forEach((el) => el.remove());
  if (track.kind === Track.Kind.Video && track.source === Track.Source.ScreenShare) {
    removeScreenTile(participant.identity);
    return;
  }
  const tile = tiles.get(participant.identity);
  if (tile && track.kind === Track.Kind.Video) {
    tile.querySelector('.placeholder').hidden = false;
    tile.querySelector('.placeholder-bg').hidden = false;
  }
}

function removeParticipant(participant) {
  const tile = tiles.get(participant.identity);
  if (tile) tile.remove();
  tiles.delete(participant.identity);
  removeScreenTile(participant.identity);
  if (asideSelection.delete(participant.identity)) updateAsideConfirm();
  canvasDoc().querySelectorAll(`audio[data-identity="${CSS.escape(participant.identity)}"]`).forEach((el) => el.remove());
  reconcileGhostTiles(); // they may have just stepped into a private aside, not actually left
  applyLayout();
}

// Marked muted: no microphone published, or the one published is muted. Only the publication's own state, which a
// late joiner gets with the publication, never what events happened to arrive (tools/check-canvas.mjs runs it).
function micMarkedMuted(pub) {
  return !pub || !!pub.isMuted;
}
function updateMuted(participant) {
  if (!shownInCall(participant)) return;
  const tile = tileFor(participant);
  let badge = tile.querySelector('.muted');
  const muted = micMarkedMuted(participant.getTrackPublication(Track.Source.Microphone));
  if (muted && !badge) {
    badge = document.createElement('span');
    badge.className = 'muted';
    badge.textContent = 'muted';
    tile.appendChild(badge);
  } else if (!muted && badge) {
    badge.remove();
  }
  // The admin Mute button can't unmute (see adminToolsFor) -- hide it once
  // there's nothing left for it to do.
  const muteBtn = tile.querySelector('.tile-admin-btn[data-action="mute"]');
  if (muteBtn) muteBtn.hidden = muted;
}

// A camera turned off keeps its publication but mutes it: show the image again.
function updateCamera(participant) {
  if (!shownInCall(participant)) return;
  const tile = tileFor(participant);
  const cam = participant.getTrackPublication(Track.Source.Camera);
  const off = !cam || cam.isMuted;
  const video = tile.querySelector('video');
  if (video) video.hidden = off;
  // Not gated on the <video> element already existing: attachTrack() hides
  // these the moment it runs regardless, and if this fires first there's
  // nothing to gain by leaving them showing for however long that takes --
  // an empty tile reads better than the wrong picture stuck on top of live video.
  tile.querySelector('.placeholder').hidden = !off;
  tile.querySelector('.placeholder-bg').hidden = !off;
}

// The document the canvas currently lives in (the page, or the pop-out window).
function canvasDoc() {
  return $('canvas').ownerDocument;
}

// --- chat ---------------------------------------------------------------------

// Text and pictures travel live over LiveKit's data channel. The sender also posts a text message to the server,
// which keeps a rolling window per space (see server/chat-history.js), and everyone who joins reads it back, so a
// late joiner or a new browser sees what was said. Pictures are live only. An aside/private space keeps nothing,
// staying as off-the-record as everything else about it. The log here is what Save writes out and goes when you
// leave. Deleting the chat removes it for everyone. Deleting one message removes that message for everyone, and
// only the person who sent it can.
const chatLog = []; // { id, who, by, at, text } or { id, who, by, at, blob, name }
// Older versions kept the history in this browser only. It is still read when the server has none and has never
// been deleted (or cannot be reached). A delete on the server records when, so that old copy stays hidden.
const chatHistoryKey = (spaceId) => `app:chat:${spaceId}:${me?.key || guestToken || 'guest'}`;
const chatClearedKey = (spaceId) => `app:chatclear:${spaceId}:${me?.key || guestToken || 'guest'}`;
function loadChatHistory(spaceId) {
  try {
    return JSON.parse(localStorage.getItem(chatHistoryKey(spaceId))) || [];
  } catch {
    return [];
  }
}
function chatClearedAt(spaceId) {
  try {
    return Number(localStorage.getItem(chatClearedKey(spaceId))) || 0;
  } catch {
    return 0;
  }
}
function chatIdOk(id) {
  return typeof id === 'string' && /^[a-f0-9]{12}$/.test(id);
}
function newChatId() {
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  return [...bytes].map((b) => b.toString(16).padStart(2, '0')).join('');
}
function chatMessageNode(id) {
  if (!chatIdOk(id)) return null;
  return $('messages')?.querySelector(`.message[data-chat-id="${CSS.escape(id)}"]`) || null;
}
async function fetchChatHistory(spaceId) {
  const q = guestToken ? `?guest=${encodeURIComponent(guestToken)}` : '';
  const { messages, clearedAt } = await api('GET', `/api/spaces/${encodeURIComponent(spaceId)}/chat${q}`);
  return {
    messages: messages.map((m) => ({ id: m.id, who: m.who, by: m.by, text: m.text, at: new Date(m.at).toISOString() })),
    clearedAt: Number(clearedAt) || 0,
  };
}
// Tell the server what was just said, so the space's history has it. Returns the stored message, or null when it
// could not be kept (an aside, or the server did not answer).
async function postChatMessage(text) {
  if (!currentSpace || currentSpace.isAside) return null;
  const q = guestToken ? `?guest=${encodeURIComponent(guestToken)}` : '';
  try {
    const { message } = await api('POST', `/api/spaces/${encodeURIComponent(currentSpace.id)}/chat${q}`, { text, name: me?.displayName || call.localParticipant?.name });
    return message || null;
  } catch {
    return null;
  }
}
function publishChat(data) {
  if (!call || call.state !== 'connected' || !call.localParticipant) return;
  call.localParticipant.publishData(encoder.encode(JSON.stringify(data)), { reliable: true, topic: 'chat' }).catch(() => {});
}
// Stores the message, draws it here with that id, and tells everyone else in the call. Without a stored id (the
// server did not answer) it still goes out live, and then it cannot be deleted for everyone.
async function sendChatText(text) {
  const stored = await postChatMessage(text);
  if (stored?.id) {
    addEntry({ id: stored.id, who: stored.who, by: stored.by, text: stored.text, at: new Date(stored.at) }, true);
    publishChat({ type: 'chat', id: stored.id, text: stored.text, at: stored.at, who: stored.who, by: stored.by });
    return;
  }
  try {
    if (call && call.localParticipant) await call.localParticipant.sendChatMessage(text);
  } catch (err) {
    setStatus(`chat: ${err.message}`, true);
  }
}
function dropChatMessage(id) {
  chatMessageNode(id)?.remove();
  const at = chatLog.findIndex((e) => e.id === id);
  if (at >= 0) chatLog.splice(at, 1);
}
function dropSharedChat() {
  for (const el of [...($('messages')?.querySelectorAll('.message, .chat-session-divider, .chat-closed-ask') || [])]) el.remove();
  chatLog.length = 0;
  unread = 0;
  canvas.setBuiltinUnread('chat', 0);
}
// An owner, or a member marked moderator in this space.
function canModerateChat() {
  if (!currentSpace || currentSpace.isAside || !me || me.role === 'guest') return false;
  if (hasOwnerRights(me)) return true;
  return Boolean(me.spaces?.[currentSpace.id]?.permissions?.moderator);
}
// Only the person who posted a shared message can change private or public. A private turn on this page
// (an AI answer, a command) is already only on their screen. Guests share one stored sender, so a guest
// cannot change a stored message; a picture they sent still can, because that one carries their own id.
function canChangeVisibility(entry, by) {
  if (!entry?.chat) return true;
  if (!me?.key) return false;
  if (me.role === 'guest') return Boolean(entry.blob && by === me.key);
  return by === me.key;
}
// A shared message can be deleted by the person who sent it. A picture is live only, so its id is this page's.
function canDeleteChatEntry(entry) {
  if (!entry?.chat || !chatIdOk(entry.id)) return false;
  if (entry.blob) return Boolean(me?.key && entry.by === me.key);
  if (canModerateChat()) return true;
  return Boolean(me?.key && entry.by === me.key && me.role !== 'guest');
}
// Called once per join, after the canvas is up but before anything live has
// arrived -- fills #messages with whatever this space already said, so it
// reads as "still here" rather than the chat looking wiped on every rejoin.
async function renderChatHistory(spaceId) {
  let history;
  let serverCleared = 0;
  try {
    const got = await fetchChatHistory(spaceId);
    history = got.messages;
    serverCleared = got.clearedAt;
  } catch {
    history = loadChatHistory(spaceId);
  }
  const cleared = Math.max(chatClearedAt(spaceId), serverCleared);
  history = history.filter((e) => new Date(e.at).getTime() > cleared);
  // Anything live that arrived while this was loading is already there, so the history goes above it.
  const fragment = document.createDocumentFragment();
  for (const entry of history) {
    if (entry.id && chatMessageNode(entry.id)) continue;
    const el = messageEl({ id: entry.id, who: entry.who, by: entry.by, text: entry.text, at: new Date(entry.at) }, entry.who === me?.displayName);
    el.classList.add('history');
    fragment.appendChild(el);
  }
  // Everything above this line was said before you opened the call just
  // now; everything below it is happening live. Only worth marking when
  // there's actually old chat to separate from the new.
  if (history.length) {
    const divider = document.createElement('div');
    divider.className = 'chat-session-divider';
    divider.innerHTML = `<span>${escapeHtml(new Date().toLocaleString([], { weekday: 'short', hour: 'numeric', minute: '2-digit' }))}</span>`;
    fragment.appendChild(divider);
    $('messages').prepend(fragment);
    $('messages').scrollTop = $('messages').scrollHeight;
  }
}

function escapeHtml(s) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// Markdown to safe HTML: headings, **bold**, *italic*/_italic_, `code`, fenced code, - and 1. lists, > quotes
// (what replyToEntry() quotes with), [text](url) and bare links. The one shared implementation every module
// (and now Chat) uses, in /sdk/host.js -- loaded on this page already for the modules it hosts in the page.
function renderMarkup(text) {
  return window.hostText.markdown(text);
}

function iconButton(icon, title, onClick) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'msg-btn';
  b.title = title;
  b.setAttribute('aria-label', title);
  b.innerHTML = `<i class="fa-solid fa-${icon} fa-fw" aria-hidden="true"></i>`;
  b.addEventListener('click', onClick);
  return b;
}

function flashIcon(btn, icon) {
  const i = btn.querySelector('i');
  const was = i.className;
  i.className = `fa-solid fa-${icon} fa-fw`;
  setTimeout(() => (i.className = was), 1200);
}

function saveBlob(blob, name) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name || 'picture.png';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 10000);
}

async function toPng(blob) {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas');
  c.width = bmp.width;
  c.height = bmp.height;
  c.getContext('2d').drawImage(bmp, 0, 0);
  bmp.close();
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}

async function copyEntry(entry, btn) {
  try {
    if (entry.blob) {
      const png = entry.blob.type === 'image/png' ? entry.blob : await toPng(entry.blob);
      await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
    } else {
      await navigator.clipboard.writeText(entry.text);
    }
    if (btn) flashIcon(btn, 'check');
  } catch (err) {
    setStatus(`copy: ${err.message}`, true);
  }
}

// Quotes the original message (markdown blockquote, so it renders as one
// once sent -- see renderMarkup()) at the start of whatever's already
// being typed, cursor landing right after so the reply continues below it.
function replyToEntry(entry) {
  const el = $('chat-input');
  const quoted = entry.blob
    ? `> ${entry.who} sent a picture`
    : `> ${entry.who}: ${entry.text.split('\n').join('\n> ')}`;
  const prefix = `${quoted}\n`;
  el.value = prefix + el.value;
  el.focus();
  el.setSelectionRange(prefix.length, prefix.length);
  resizeChatInput();
}

function messageStamp(at) {
  const d = at instanceof Date ? at : new Date(at);
  if (Number.isNaN(d.getTime())) return '';
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const date = d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  return `${date}, ${time}`;
}

function senderKey(entry) {
  if (entry?.by) return entry.by;
  if (entry?.who && me?.displayName === entry.who) return me.key;
  for (const [key, user] of presenceUsers) {
    if (user?.displayName === entry.who) return key;
  }
  return '';
}

function messagePortrait(name, kind, icon, by) {
  const el = document.createElement('span');
  el.className = 'message-portrait';
  el.setAttribute('aria-hidden', 'true');
  const safe = /^[a-z0-9-]{1,40}$/.test(icon || '') ? icon : (kind === 'ai' ? 'robot' : '');
  if (safe) {
    el.innerHTML = `<i class="fa-solid fa-${safe} fa-fw"></i>`;
    return el;
  }
  if (by) {
    const img = document.createElement('img');
    img.className = 'message-portrait';
    img.alt = '';
    img.src = spacePortraitUrl(by);
    img.onerror = () => {
      img.onerror = null;
      img.src = imgUrl(by, 'profile');
    };
    return img;
  }
  el.textContent = String(name || '?').trim().charAt(0).toUpperCase() || '?';
  return el;
}

// A chat message is a header and a container. The header has a left zone (portrait, name, time) and a
// right zone (private or public, then the menu). The container is the message itself.
function frameMessage({ name, at, visibility = 'public', kind, icon, by, body, entry, onPublic }) {
  const el = document.createElement('div');
  el.className = 'message';
  if (kind === 'own' || kind === 'you') el.classList.add('own');
  if (kind === 'ai' || kind === 'you') el.classList.add('private-ai');
  if (kind === 'ai') el.classList.add('msg-ai');
  const head = document.createElement('div');
  head.className = 'message-head';
  const left = document.createElement('span');
  left.className = 'message-head-side';
  const nameEl = document.createElement('span');
  nameEl.className = 'message-name';
  nameEl.textContent = name || 'someone';
  const dash = document.createElement('span');
  dash.className = 'message-dash';
  dash.setAttribute('aria-hidden', 'true');
  dash.textContent = '–';
  const when = document.createElement('span');
  when.className = 'message-when';
  when.textContent = messageStamp(at);
  left.append(messagePortrait(name, kind, icon, by), nameEl);
  if (when.textContent) left.append(dash, when);
  const right = document.createElement('span');
  right.className = 'message-head-side';
  let state = visibility === 'private' ? 'private' : 'public';
  let posted = state === 'public';
  const canChange = canChangeVisibility(entry, by);
  const vis = document.createElement(canChange ? 'button' : 'span');
  if (canChange) vis.type = 'button';
  vis.className = 'message-vis';
  const paintVis = () => {
    vis.textContent = state;
    vis.setAttribute('aria-label', state === 'private' ? 'Private' : 'Public');
  };
  paintVis();
  if (canChange) vis.addEventListener('click', (event) => {
    event.stopPropagation();
    const next = state === 'private' ? 'public' : 'private';
    openHostMenu(vis, [{
      icon: next === 'public' ? 'users' : 'lock',
      label: next === 'public' ? 'Make public' : 'Make private',
      onPick: () => {
        state = next;
        if (entry) entry.visibility = state;
        paintVis();
        if (state === 'public' && !posted && onPublic) {
          posted = true;
          onPublic();
        }
      },
    }]);
  });
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'sdk-more';
  more.title = 'More';
  more.setAttribute('aria-label', 'More');
  more.setAttribute('aria-haspopup', 'menu');
  more.innerHTML = '<i class="fa-solid fa-ellipsis-vertical fa-fw" aria-hidden="true"></i>';
  more.addEventListener('click', (event) => {
    event.stopPropagation();
    const items = [
      { icon: 'copy', label: 'Copy', onPick: () => copyEntry(entry) },
      { icon: 'reply', label: 'Reply', onPick: () => replyToEntry(entry) },
      { icon: 'share', label: 'Send to...', onPick: () => {} },
    ];
    if (!entry?.chat || canDeleteChatEntry(entry)) {
      items.push({ icon: 'trash', label: 'Delete', danger: true, onPick: () => deleteMessage(el, entry) });
    }
    openHostMenu(more, items);
  });
  right.append(vis, more);
  head.append(left, right);
  el.append(head, body);
  return el;
}

async function deleteMessage(el, entry) {
  if (!currentSpace) return;
  const space = `/api/spaces/${encodeURIComponent(currentSpace.id)}`;
  if (entry?.threadId && chatIdOk(entry.threadId)) {
    try {
      await api('DELETE', `${space}/ai/thread/${entry.threadId}`);
    } catch (err) {
      setStatus(err.message || 'Could not delete that.', true);
      return;
    }
    el.remove();
    return;
  }
  if (entry?.chat) {
    if (!canDeleteChatEntry(entry)) return;
    if (!entry.blob) {
      try {
        const q = guestToken ? `?guest=${encodeURIComponent(guestToken)}` : '';
        await api('DELETE', `${space}/chat/${entry.id}${q}`);
      } catch (err) {
        setStatus(err.message || 'Could not delete that.', true);
        return;
      }
    }
    dropChatMessage(entry.id);
    publishChat({ type: 'chat-delete', id: entry.id });
    return;
  }
  el.remove();
}

function messageEl(entry, own) {
  entry.chat = true;
  entry.visibility = 'public';
  const body = document.createElement('div');
  body.className = 'message-body text';
  if (entry.blob) {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(entry.blob);
    img.alt = entry.name || 'picture';
    img.title = 'Open full size';
    img.addEventListener('click', () => window.open(img.src, '_blank'));
    body.appendChild(img);
  } else {
    body.innerHTML = renderMarkup(entry.text);
  }
  const el = frameMessage({
    name: entry.who,
    at: entry.at,
    visibility: 'public',
    kind: own ? 'own' : '',
    by: senderKey(entry),
    body,
    entry,
  });
  el.classList.add('is-chat');
  if (chatIdOk(entry.id)) el.dataset.chatId = entry.id;
  return el;
}

function addEntry(entry, own = false) {
  if (!entry.at) entry.at = new Date();
  else if (!(entry.at instanceof Date)) entry.at = new Date(entry.at);
  entry.chat = true;
  chatLog.push(entry);
  $('messages').appendChild(messageEl(entry, own));
  $('messages').scrollTop = $('messages').scrollHeight;
  if (!canvas.builtinOpen('chat') && !own) {
    unread += 1;
    canvas.setBuiltinUnread('chat', unread);
  }
}

function addMessage(message, from, own = false, by = '') {
  addEntry({ who: from, text: message, by }, own);
}

function saveChat() {
  if (!chatLog.length) return;
  const lines = chatLog.map((e) => `[${e.at.toLocaleTimeString()}] ${e.who}: ${e.blob ? `[picture${e.name ? ' ' + e.name : ''}]` : e.text}`);
  saveBlob(new Blob([lines.join('\n') + '\n'], { type: 'text/plain' }), `${spaceName.replace(/[^\w-]+/g, '-').toLowerCase()}-chat-${new Date().toISOString().slice(0, 10)}.txt`);
}

// Pictures: pasted, dropped or picked, shrunk to a sensible size, then sent
// as a LiveKit byte stream on topic "chat-image" (no server involved).
const MAX_IMAGE_SIDE = 1600;
async function shrinkImage(file) {
  const bmp = await createImageBitmap(file);
  const keep = file.size <= 1.5e6 && Math.max(bmp.width, bmp.height) <= MAX_IMAGE_SIDE && /^image\/(png|jpeg|gif|webp)$/.test(file.type);
  if (keep) {
    bmp.close();
    return file;
  }
  const scale = Math.min(1, MAX_IMAGE_SIDE / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.round(bmp.width * scale));
  c.height = Math.max(1, Math.round(bmp.height * scale));
  c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close();
  const blob = await new Promise((resolve) => c.toBlob(resolve, 'image/jpeg', 0.85));
  return new File([blob], `${(file.name || 'picture').replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' });
}

async function sendImage(file) {
  if (!file || !file.type.startsWith('image/') || call.state !== 'connected' || !canDo('sendPictures')) return;
  try {
    const out = await shrinkImage(file);
    const id = newChatId();
    const named = new File([out], `cid-${id}-${out.name || 'picture'}`, { type: out.type });
    addEntry({ id, who: call.localParticipant.name || call.localParticipant.identity, by: me?.key || call.localParticipant.identity, blob: named, name: out.name || 'picture' }, true);
    await call.localParticipant.sendFile(named, { topic: 'chat-image', mimeType: named.type });
  } catch (err) {
    setStatus(`picture: ${err.message}`, true);
  }
}

call.registerByteStreamHandler('chat-image', async (reader, { identity }) => {
  if (!canDo('chatRead')) return; // not in an aside, nor for a role that can't read the chat
  try {
    const chunks = await reader.readAll();
    const blob = new Blob(chunks, { type: reader.info.mimeType || 'image/png' });
    const from = call.remoteParticipants.get(identity);
    const named = /^cid-([a-f0-9]{12})-(.*)$/.exec(reader.info.name || '');
    addEntry({ id: named ? named[1] : '', who: from?.name || identity, by: identity, blob, name: named ? (named[2] || 'picture') : (reader.info.name || 'picture') }, false);
  } catch (err) {
    setStatus(`picture: ${err.message}`, true);
  }
});

function imageFiles(list) {
  return [...(list || [])].filter((f) => f && f.type && f.type.startsWith('image/'));
}

// --- reactions ------------------------------------------------------------------
// A reaction travels over the data channel (topic "reaction"), like chat but
// never stored: every call page and every OBS view page of that player
// floats it up from their tile for a couple of seconds.

// The reaction tray, as the admin has set it up (Manage > Theme); keys 1
// to 6 reach only the first six, however many are configured.
let REACTIONS = {}; // id -> glyph
let REACTION_KEYS = []; // id, in tray order
const encoder = new TextEncoder();
const decoder = new TextDecoder();

function renderReactionTray(list) {
  const reactions = Array.isArray(list) ? list : [];
  REACTIONS = Object.fromEntries(reactions.map((r) => [r.id, r.glyph]));
  REACTION_KEYS = reactions.map((r) => r.id);
  renderChatEmoji(reactions);
  const tray = $('react-tray');
  tray.textContent = '';
  reactions.forEach((r, i) => {
    const button = document.createElement('button');
    button.className = 'react';
    button.type = 'button';
    button.dataset.reaction = r.id;
    button.title = i < 6 ? `${r.label} (${i + 1})` : r.label;
    button.textContent = r.glyph;
    tray.appendChild(button);
  });
}

function showReaction(identity, id) {
  const glyph = REACTIONS[id];
  const tile = tiles.get(identity);
  if (!glyph || !tile) return;
  const el = tile.ownerDocument.createElement('span');
  el.className = 'reaction';
  el.textContent = glyph;
  el.style.left = `${20 + Math.random() * 60}%`;
  el.addEventListener('animationend', () => el.remove());
  setTimeout(() => el.remove(), 3000); // a hidden tab never fires animationend
  tile.appendChild(el);
}

async function sendReaction(id) {
  if (!features.allowReactions || !canDo('react') || !REACTIONS[id] || call.state !== 'connected') return;
  showReaction(call.localParticipant.identity, id); // data is not echoed back
  try {
    await call.localParticipant.publishData(encoder.encode(JSON.stringify({ type: 'reaction', id })), { reliable: true, topic: 'reaction' });
  } catch (err) {
    setStatus(`reaction: ${err.message}`, true);
  }
}

function toggleTray(open = $('react-tray').hidden) {
  if (open && !(features.allowReactions && canDo('react'))) return;
  $('react-tray').hidden = !open;
  $('react-toggle').classList.toggle('on', open);
  if (open) closeSettings();
}

// The settings popover shows one focused group at a time: mic, audio
// (speaker + volume), camera, layout, or "more" (everything else -- guests,
// install, account links) for the gear. Each of mic/audio/camera/layout's
// own caret opens straight to its group; clicking the same one again (or
// anywhere outside) closes it, same as any dropdown.
function closeSettings() {
  $('settings').hidden = true;
  for (const b of confEl.querySelectorAll('[data-settings]')) b.classList.remove('on');
}
function openSettings(group) {
  const trigger = confEl.querySelector(`[data-settings="${group}"]`);
  if (!$('settings').hidden && $('settings').dataset.group === group) {
    closeSettings();
    return;
  }
  for (const el of confEl.querySelectorAll('.settings-group')) el.hidden = el.dataset.group !== group;
  $('settings').dataset.group = group;
  $('settings').hidden = false;
  for (const b of confEl.querySelectorAll('[data-settings]')) b.classList.remove('on');
  if (trigger) trigger.classList.add('on');
  toggleTray(false);
}

// A built-in module's own header, with the name and icon this environment shows it by (canvas.js hands them over once the
// space's modules are loaded).
function showBuiltinName(def) {
  const name = def.el.querySelector('[data-module-name]');
  if (name) name.textContent = def.name;
  const icon = def.el.querySelector('[data-module-icon]');
  if (icon) icon.className = `fa-solid fa-${def.icon} fa-fw`;
}

// The conference is a module too: docked, floating or in a window of its own, and it can be
// closed, which leaves the call but not the space. It is the flexible column, and the first
// one. Its switch only shows and hides it, like every module's, and always reads its name (Thomas, 2026-09-30):
// shown it says "Not in a call" and never joins by itself; switched off (the switch, its titlebar x) it hangs up, so
// nobody is left in the call with the module hidden. Entering a space never joins either, for members and guests alike
// (Thomas, 2026-09-30): only a click joins, the green phone or "Join the call". Moving it between docked, floating and
// a window leaves the call running.
canvas.registerBuiltin({
  id: 'conference',
  name: 'Conference',
  inCall: () => inCall, // the phone's tab bar marks the switch while in the call, not merely while shown
  icon: 'video',
  el: $('conference'),
  onShown: showBuiltinName,
  order: -1,
  flex: true,
  modes: ['dock', 'float', 'window'],
  wrap: 'canvas conference-canvas', // out of the canvas's grid it needs a .canvas of its own
  windowClass: 'conference-window',
  windowSize: { w: 640, h: 420 },
  floatSize: { w: 560, h: 380 },
  // The environment's switch holds for owners and the admin too (canDo says yes to them whatever it is), so the
  // canvas, the Modules menu and the Open with popover agree.
  allowed: () => conferenceAllowed({ conferenceEnabled: features.conferenceEnabled, permitted: canDo('conference') }),
  // A window of its own has its own document: idle/hover, popovers and keys need to hear it.
  onWindow: (win) => {
    win.document.title = spaceName;
    watchPointer(win.document);
    watchOutsideClick(win.document);
    win.document.addEventListener('keydown', onKey);
    win.document.addEventListener('keyup', onKeyUp);
    win.addEventListener('keydown', noteKey, true);
    win.document.addEventListener('pointerdown', notePointer, true);
    win.document.addEventListener('focusin', noteFocus, true);
    win.document.addEventListener('visibilitychange', releaseWhenHidden);
    win.addEventListener('blur', releaseTalk);
    win.addEventListener('pagehide', releaseTalk);
    win.document.addEventListener('fullscreenchange', syncFullscreenButton);
  },
  onWindowResize: () => applyLayout(),
  onChange: ({ open, mode, moving }) => {
    $('canvas').classList.toggle('conference-open', open && mode === 'dock'); // the narrow layout keys off this
    if (!moving) {
      if (open) { if (!inCall) setNoCall(true); syncWhoIsInCall(); } // shown (entering or switched on): out of the call until a click joins
      else { stopCall(); setNoCall(false); } // switched off: hang up (nothing to do out of the call); it starts fresh next time
    }
    updateCrumb();
    setTimeout(applyLayout, 0); // once the module is in place
  },
});
// The titlebar's x closes the module (and with it the call); Hang up on the toolbar only leaves the call.
$('conf-close').addEventListener('click', () => { if (pipWindow) closePopout(); canvas.closeBuiltin('conference'); });
$('no-call-join').addEventListener('click', () => phoneButton());


// The chat is a built-in module, shown like any other: a column beside the video, floating,
// or a window of its own (see canvas.js). This is what the canvas
// tells the chat when it opens or closes.
canvas.registerBuiltin({
  id: 'chat',
  name: 'Chat',
  icon: 'message',
  el: $('chat'),
  onShown: showBuiltinName,
  allowed: () => canDo('chatRead'),
  width: prefs.chatWidth,
  onWidth: (w) => { prefs.chatWidth = w; savePrefs(); },
  onChange: ({ open, mode, moving }) => {
    $('canvas').classList.toggle('chat-open', open && mode === 'dock'); // the narrow layout keys off this
    applyLayout();
    if (open) {
      unread = 0;
      canvas.setBuiltinUnread('chat', 0);
      // Into the message box when it opens, but not when it only moves (docked, floating, snapped), and not while the
      // module chooser's list is open: the switch that turned it on keeps the keyboard.
      if ((!moving || mode === 'window') && $('modules-toggle')?.getAttribute('aria-expanded') !== 'true') $('chat-input').focus();
      $('messages').scrollTop = $('messages').scrollHeight;
    }
  },
});

function toggleChat(open = !canvas.builtinOpen('chat')) {
  if (open) canvas.openBuiltin('chat');
  else canvas.closeBuiltin('chat');
}

// --- microphone: device -> level -> gate -> what the call hears -----------
//
// The mic is processed in the page before it is published, so the level
// slider and the noise gate work in every browser and the meter shows what
// others actually receive. Changing device or filters swaps the input; the
// published track stays the same.

const mic = { ctx: null, raw: null, source: null, level: null, gate: null, analyser: null, timer: 0, dest: null, track: null, open: true, shown: 0, bypass: false };
let pttHeld = false; // while the push-to-talk key is held: its code (see onKeyUp)

function micConstraints() {
  const c = { noiseSuppression: prefs.noise, echoCancellation: prefs.echo, autoGainControl: prefs.agc };
  if (prefs.micId) c.deviceId = { exact: prefs.micId };
  return c;
}

async function buildMicGraph() {
  mic.ctx = new AudioContext();
  mic.level = mic.ctx.createGain();
  mic.dest = mic.ctx.createMediaStreamDestination();
  try {
    // The gate lives on the audio thread (see gate-worklet.js), so it keeps
    // working when the tab is hidden and page timers are throttled.
    await mic.ctx.audioWorklet.addModule('/gate-worklet.js');
    mic.gate = new AudioWorkletNode(mic.ctx, 'mic-gate', { numberOfInputs: 1, numberOfOutputs: 1, outputChannelCount: [1] });
    mic.gate.port.onmessage = (event) => onMicLevel(event.data);
    mic.level.connect(mic.gate);
    mic.gate.connect(mic.dest);
  } catch (err) {
    console.warn('[app] no audio worklet, gate off:', err.message);
    mic.gate = null;
    mic.analyser = mic.ctx.createAnalyser();
    mic.analyser.fftSize = 512;
    mic.level.connect(mic.analyser);
    mic.level.connect(mic.dest);
    mic.timer = setInterval(meterFromAnalyser, 50);
  }
  mic.track = mic.dest.stream.getAudioTracks()[0];
}

// Rebuilds just the graph's output node (and the track that publishes from
// it) after LiveKit has stopped the old one -- everything upstream (the
// AudioContext, gain, gate/analyser) is untouched and still running.
function rebuildMicDestination() {
  const from = mic.gate || mic.level;
  from.disconnect(mic.dest);
  mic.dest = mic.ctx.createMediaStreamDestination();
  from.connect(mic.dest);
  mic.track = mic.dest.stream.getAudioTracks()[0];
}

async function openMic() {
  let stream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({ audio: micConstraints() });
  } catch (err) {
    if (!prefs.micId) throw err;
    prefs.micId = ''; // the remembered device is gone
    savePrefs();
    stream = await navigator.mediaDevices.getUserMedia({ audio: micConstraints() });
  }
  const raw = stream.getAudioTracks()[0];
  if (!mic.ctx) await buildMicGraph();
  // LiveKit's call.disconnect() (called on every reconnectTo(), including
  // every aside/private step and the return from one) stops the underlying
  // MediaStreamTrack of whatever was published -- our processed track from
  // the Web Audio graph included. A stopped track can never restart, so
  // without this the mic would go dead the moment you first stepped aside
  // and stay dead for the rest of the session.
  else if (!mic.track || mic.track.readyState === 'ended') rebuildMicDestination();
  if (mic.source) mic.source.disconnect();
  if (mic.raw) mic.raw.stop();
  mic.raw = raw;
  mic.source = mic.ctx.createMediaStreamSource(new MediaStream([raw]));
  mic.source.connect(mic.level);
  applyMicSettings();
  await mic.ctx.resume();
  if (mic.ctx.state !== 'running') {
    // No audio output device or the browser refused to start the graph:
    // publish the microphone as it is, without level and gate.
    console.warn('[app] audio graph not running; publishing the raw microphone');
    mic.bypass = true;
    return raw;
  }
  return mic.track;
}

function closeMic() {
  if (mic.raw) mic.raw.stop();
  if (mic.source) mic.source.disconnect();
  mic.raw = null;
  mic.source = null;
  mic.shown = 0;
  $('meter').style.setProperty('--level', '0');
}

function applyMicSettings() {
  if (!mic.ctx) return;
  mic.level.gain.setTargetAtTime(prefs.gain / 100, mic.ctx.currentTime, 0.02);
  // slider 0..60 maps to a quiet-to-loud rms range
  if (mic.gate) mic.gate.parameters.get('threshold').value = prefs.gate / 100 / 4;
  $('gain-value').textContent = `${prefs.gain}%`;
  $('gate-value').textContent = !mic.gate && mic.ctx ? 'unavailable' : prefs.gate ? `${prefs.gate}` : 'off';
}

// Level and gate state from the audio thread: peak hold with a quick decay
// reads better than raw samples.
function onMicLevel({ level, open }) {
  mic.shown = Math.max(Math.min(1, level * 4), mic.shown * 0.85);
  $('meter').style.setProperty('--level', mic.shown.toFixed(2));
  if (open !== mic.open) {
    mic.open = open;
    $('mic').classList.toggle('gated', !open);
  }
}

const samples = new Float32Array(512);
function meterFromAnalyser() {
  if (!mic.analyser) return;
  mic.analyser.getFloatTimeDomainData(samples);
  let sum = 0;
  for (let i = 0; i < samples.length; i += 1) sum += samples[i] * samples[i];
  onMicLevel({ level: Math.sqrt(sum / samples.length), open: true });
}

// The master volume (Settings > Audio output) multiplies every remote
// participant's own volume (set by hovering their tile) rather than
// replacing it, so both stay independently adjustable.
function effectiveVolume(identity) {
  return (prefs.masterVolume / 100) * (prefs.volumes[identity] ?? 1);
}

function setVolume(participant, volume) {
  prefs.volumes[participant.identity] = volume;
  savePrefs();
  const pub = participant.getTrackPublication(Track.Source.Microphone);
  if (pub?.track?.setVolume) pub.track.setVolume(effectiveVolume(participant.identity));
}

function applyMasterVolume() {
  for (const p of call.remoteParticipants.values()) {
    const pub = p.getTrackPublication(Track.Source.Microphone);
    if (pub?.track?.setVolume) pub.track.setVolume(effectiveVolume(p.identity));
  }
}

// The output device every remote participant's audio plays through.
async function applySpeaker() {
  if (!prefs.speakerId) return;
  for (const audio of canvasDoc().querySelectorAll('audio')) {
    if (audio.setSinkId) await audio.setSinkId(prefs.speakerId).catch(() => {});
  }
}

const RESOLUTIONS = { 360: { width: 640, height: 360 }, 540: { width: 960, height: 540 }, 720: { width: 1280, height: 720 } };
function videoConstraints() {
  const c = { resolution: RESOLUTIONS[prefs.quality] || RESOLUTIONS[720] };
  if (prefs.camId) c.deviceId = { exact: prefs.camId };
  return c;
}

async function setPushToTalk(on) {
  prefs.ptt = on;
  savePrefs();
  pttHeld = false;
  $('mic').title = on ? `Push to talk: hold ${formatHotkey(prefs.pttKey)} (M toggles)` : 'Microphone (M)';
  if (on && call.state === 'connected') await call.localParticipant.setMicrophoneEnabled(false).catch(() => {});
  reflectMic();
}

function reflectMic() {
  const on = call.localParticipant?.isMicrophoneEnabled;
  $('mic').classList.toggle('on', !!on);
  $('mic').classList.toggle('off', !on);
  $('mic').classList.toggle('ptt', prefs.ptt);
  // On a phone the conference can be hidden behind the chat while the mic is live, so the space bar
  // says so (see the in-call dot in style.css). The bar's own element is kept, its items are rebuilt.
  const bar = $('modules-menu');
  if (bar) bar.dataset.mic = on ? 'live' : 'off';
  if (call.state === 'connected') updateMuted(call.localParticipant);
}

// --- call events ---------------------------------------------------------------

// A tile's muted mark follows the person's microphone publication: one coming or going changes it as much as a mute
// does. Someone joining the call says "on" before their microphone is published, so their tile is made with none
// (marked muted), and no TrackMuted/TrackUnmuted ever comes for a microphone published unmuted. updateMuted does nothing
// for someone not in the call. The camera's picture keeps to TrackMuted/TrackUnmuted and attachTrack/detachTrack.
call
  .on(RoomEvent.TrackSubscribed, (track, _pub, participant) => { attachTrack(participant, track); updateMuted(participant); })
  .on(RoomEvent.TrackUnsubscribed, (track, _pub, participant) => detachTrack(participant, track))
  .on(RoomEvent.LocalTrackPublished, (pub) => { if (pub.track) attachTrack(call.localParticipant, pub.track); updateMuted(call.localParticipant); })
  .on(RoomEvent.LocalTrackUnpublished, (pub) => { if (pub.track) detachTrack(call.localParticipant, pub.track); updateMuted(call.localParticipant); })
  .on(RoomEvent.ParticipantConnected, (p) => { if (shownInCall(p)) tileFor(p); })
  // Nothing is received until I am in the conference; then everything published is taken.
  .on(RoomEvent.TrackPublished, (pub, p) => { if (shownInCall(p)) pub.setSubscribed(true); updateMuted(p); })
  .on(RoomEvent.TrackUnpublished, (_pub, p) => updateMuted(p))
  // Someone left or rejoined the conference without leaving the space, or went away or came back (showAway).
  .on(RoomEvent.ParticipantAttributesChanged, (changed, p) => {
    if (p.isLocal || !inCall) return;
    if ('call' in changed) {
      if (p.attributes?.call === 'off') return removeParticipant(p);
      tileFor(p);
      subscribeAll(p);
      updateMuted(p);
      updateCamera(p);
      applyLayout();
    }
    if ('away' in changed || 'awayMessage' in changed) showAway(p);
  })
  .on(RoomEvent.ParticipantDisconnected, removeParticipant)
  .on(RoomEvent.TrackMuted, (_pub, participant) => {
    updateMuted(participant);
    updateCamera(participant);
  })
  .on(RoomEvent.TrackUnmuted, (_pub, participant) => {
    updateMuted(participant);
    updateCamera(participant);
  })
  .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
    const active = new Set(speakers.map((s) => s.identity));
    for (const [identity, tile] of tiles) tile.classList.toggle('speaking', active.has(identity));
    const loudest = speakers.find((s) => !s.isLocal) || speakers[0];
    if (loudest && loudest.identity !== speaker) {
      speaker = loudest.identity;
      if (prefs.layout === 'spotlight' && !prefs.pinned && prefs.follow) applyLayout();
    }
  })
  .on(RoomEvent.ChatMessage, (message, participant) => {
    if (!canDo('chatRead')) return;
    addMessage(message.message, participant?.name || participant?.identity || 'someone', participant?.isLocal, participant?.identity);
  })
  .on(RoomEvent.DataReceived, (payload, participant, _kind, topic) => {
    try {
      const data = JSON.parse(decoder.decode(payload));
      if (topic === 'reaction' && participant && data.type === 'reaction') showReaction(participant.identity, data.id);
      // A page still on the build before the "away" attribute (showAway) says it only this way. Kept for one release.
      else if (topic === 'away' && participant && data.type === 'away') updateAwayOverlay(participant.identity, !!data.on, data.message);
      else if (topic === 'chat' && data.type === 'chat' && chatIdOk(data.id)) {
        if (!canDo('chatRead') || chatMessageNode(data.id) || data.by === me?.key) return;
        addEntry({ id: data.id, who: data.who || participant?.name || 'someone', by: data.by || '', text: data.text || '', at: new Date(data.at) }, false);
      } else if (topic === 'chat' && data.type === 'chat-delete' && chatIdOk(data.id)) dropChatMessage(data.id);
      else if (topic === 'chat' && data.type === 'chat-clear') dropSharedChat();
      // A server push (no sending participant): someone pulled me aside.
      // An owner's word is final -- just go. A peer's "Privately" needs
      // this end to actually agree to it first. Deferred a tick so this
      // event's own dispatch finishes first.
      else if (topic === 'aside-pull' && data.type === 'aside-pull' && data.spaceId) {
        if (data.byOwner) {
          setTimeout(() => reconnectTo(data.spaceId, 'pulled aside...', { keepCall: true }), 0);
        } else {
          setTimeout(() => {
            if (window.confirm(`${data.from || 'Someone'} wants ${data.private === false ? 'to step aside with you' : 'to have a private word'}. Join them?`)) {
              reconnectTo(data.spaceId, data.private === false ? 'stepping aside...' : 'stepping aside privately...', { keepCall: true });
            }
          }, 0);
        }
      }
      // The other member of a pull-aside space clicked "Rejoin call";
      // follow them there instead of being left behind.
      else if (topic === 'aside-return' && data.type === 'aside-return' && data.spaceId) {
        setTimeout(() => reconnectTo(data.spaceId, 'back to the call...', { keepCall: true }), 0);
      }
      // Someone just got pulled into a private aside: prime
      // the local data so their tile can turn into an "in an aside"
      // placeholder right away, without waiting for the next /api/presence poll.
      // The server sends this to everyone on the call, those pulled too, and their join can find this entry before
      // presence answers. It has no origin, so it is marked pending: presence replaces it (adoptPendingSpace), and
      // with the origin "Rejoin call" shows in the aside.
      else if (topic === 'aside-started' && data.type === 'aside-started' && data.spaceId && Array.isArray(data.members)) {
        if (!presenceSpaces.some((r) => r.id === data.spaceId)) presenceSpaces.push(asideEntry({ id: data.spaceId, members: data.members, pending: true }));
        for (const key of data.members) {
          const user = presenceUsers.get(key);
          if (user) { user.online = true; user.space = data.spaceId; }
        }
        reconcileGhostTiles();
      }
      // The admin clicked "Pull participants back" in the space this Private
      // Conversation came from: warn, don't yank -- a countdown, then go.
      else if (topic === 'aside-recall' && data.type === 'aside-recall' && data.spaceId) {
        startRecallCountdown(data.spaceId, data.spaceName);
      }
    } catch (err) {
      // not ours
    }
  })
  .on(RoomEvent.Reconnecting, () => setStatus('reconnecting...'))
  // A full reconnect joins the call service afresh, with the token's attributes ("call" off, no away): say both again.
  .on(RoomEvent.Reconnected, () => {
    setStatus(`in ${spaceName}`);
    syncCallAttributes();
  })
  .on(RoomEvent.Disconnected, () => {
    canvas.suspend(); // tearing the call down must not become its remembered layout
    inCall = false; // the whole call is gone, so there is nothing to stop; the rest of this clears it
    syncCallControl();
    closeMic();
    closePopout();
    canvas.closeBuiltin('conference');
    setStatus('left the call');
    forgetSpace();
    currentSpace = null;
    canvas.refresh(null);
    document.body.classList.remove('in-space');
    $('canvas').hidden = true;
    $('space-link').hidden = true;
    resetRecallButton();
    updateRecallButton(); // no room, so the tool's own `visible` hides it
    clearInterval(recallTimer);
    $('recall-overlay').hidden = true;
    // A guest has no session and no room to pick from -- back to their own
    // name-only form for the one space their link is for, not the real
    // members' space list (which they can't do anything with anyway).
    $('join').hidden = !!guestToken;
    $('guest-join').hidden = !guestToken;
    $('away').hidden = true;
    updateCrumb();
    asideSelection.clear();
    updateAsideConfirm();
    // Not setAway(false): that would try to re-enable mic/camera on a
    // participant that's already gone. Just drop the stale state so the
    // next space starts clean, not still marked away from the last one.
    $('away-overlay').hidden = true;
    isAway = false;
    awayMessage = '';
    awayRestartCam = false;
    $('away-toggle').classList.remove('off');
    $('away-toggle').title = 'Away: pauses your mic and camera, mutes what you hear, and lets everyone know';
    for (const [, tile] of tiles) tile.remove();
    tiles.clear();
    for (const [, tile] of ghostTiles) tile.remove();
    ghostTiles.clear();
    canvasDoc().querySelectorAll('audio').forEach((el) => el.remove());
    $('messages').textContent = '';
    closeHostMenu();
    if ($('chat-ai-share')) $('chat-ai-share').hidden = true;
    toggleChat(false);
    toggleTray(false);
    loadPresence();
  });

async function fillDevices() {
  // Do not let the device list ask for permissions again: a denied camera
  // would throw here and drop an audio-only player out of the call.
  let devices = [];
  try {
    devices = await Room.getLocalDevices(undefined, false);
  } catch (err) {
    console.warn('[app] device list:', err.message);
  }
  const wantedFor = { audioinput: prefs.micId, videoinput: prefs.camId, audiooutput: prefs.speakerId };
  for (const [kind, select] of [['audioinput', $('mic-select')], ['videoinput', $('cam-select')], ['audiooutput', $('speaker-select')]]) {
    select.textContent = '';
    for (const d of devices.filter((d) => d.kind === kind)) {
      const option = document.createElement('option');
      option.value = d.deviceId;
      option.textContent = d.label || kind;
      select.appendChild(option);
    }
    const wanted = wantedFor[kind];
    if (wanted && [...select.options].some((o) => o.value === wanted)) select.value = wanted;
  }
}

// --- join / leave ---------------------------------------------------------------

// Disconnect (if connected) and join a different space. Used for the admin's
// own "pull aside" click, for the pulled player's push notification, and
// for "Rejoin call".
// From the dashboard: go into a space with one module's module open on one item, and nothing else changed. In the
// space already, that is just showing the canvas and opening the module.
// Into a space I was invited to (or started): the one I am in is left for it.
async function joinInvitedSpace(spaceId) {
  if (call.state === 'connected' && currentSpace?.id === spaceId) return returnToCanvas();
  if (call.state === 'connected') return reconnectTo(spaceId);
  return join(spaceId);
}
// An invitation accepted on this page (the toast in brand.js asks; a page that handles it says so).
document.addEventListener('app:invite-accept', (event) => {
  event.preventDefault();
  joinInvitedSpace(event.detail.spaceId);
});

async function openInSpace(spaceId, moduleId, ref) {
  if (call.state === 'connected' && currentSpace?.id === spaceId) {
    returnToCanvas();
    canvas.open(moduleId);
    canvas.openRef(ref);
    return;
  }
  canvas.requestOpen(moduleId, ref);
  if (call.state === 'connected') await reconnectTo(spaceId);
  else await join(spaceId);
}
// A pull (into an aside, or back: "Pull participants back", "Rejoin call", following the others back) moves the call
// with you (Thomas, 2026-09-30, "Pull keeps you on the call"): `keepCall` says this is one, and if I was on the call I
// am on the new one without a click, through the same join check and microphone rules as a click (startCall). Out of
// the call, I land out of it. Going somewhere myself (an invitation, a module opened from the dashboard) never joins.
async function reconnectTo(spaceId, statusText, { keepCall = false } = {}) {
  const stayOnCall = Boolean(keepCall) && inCall; // read before the disconnect, which ends the call here
  if (statusText) setStatus(statusText);
  await call.disconnect().catch(() => {});
  await join(spaceId, { joinCall: stayOnCall });
}

// Admin only: pick who to pull into a private space with me -- click a
// tile's door icon to add or remove them, then confirm once ready.
function toggleAsideSelection(identity, button) {
  if (asideSelection.has(identity)) asideSelection.delete(identity);
  else asideSelection.add(identity);
  button.classList.toggle('selected', asideSelection.has(identity));
  updateAsideConfirm();
}

function updateAsideConfirm() {
  const overlay = $('aside-overlay');
  if (!overlay) return;
  overlay.hidden = asideSelection.size === 0;
  const n = asideSelection.size;
  const names = [...asideSelection].map((k) => presenceUsers.get(k)?.displayName || k);
  // An ordinary (recorded) aside and an off-the-record word are separate
  // permissions -- see Settings > Roles and /api/asides.
  const canAside = canDo('startAside') && features.allowAsides;
  const canPrivate = canDo('privateCall') && features.allowPrivate;
  $('aside-confirm').hidden = !canAside;
  $('aside-confirm-private').hidden = !canPrivate;
  $('aside-overlay-prompt').textContent = canAside ? `Step aside with ${names.join(' & ')}?` : `Have a private word with ${names.join(' & ')}?`;
  $('aside-confirm-label').textContent = n === 1 ? 'Step aside' : `Step aside with ${n}`;
  $('aside-confirm-private-label').textContent = n === 1 ? 'Privately' : `Privately with ${n}`;
}

// Back out without pulling anyone: un-pick everyone, door icons included.
function cancelAsideSelection() {
  for (const key of asideSelection) tiles.get(key)?.querySelector('.tile-aside')?.classList.remove('selected');
  asideSelection.clear();
  updateAsideConfirm();
}

// Admin only: pull one or more people who are currently in the call into a
// new space with me, for a word away from the rest. `priv` marks a real
// off-the-record word (Studio hides it from the recording, and the stream
// doesn't follow me there) rather than an in-fiction private moment (still
// recorded, just muted/dimmed on the main feed while it's happening).
async function pullAside(identities, priv = false) {
  try {
    const { aside } = await api('POST', '/api/asides', { with: identities, private: priv });
    asideSelection.clear();
    await reconnectTo(aside.id, priv ? 'stepping aside privately...' : 'stepping aside...', { keepCall: true });
  } catch (err) {
    setStatus(`pull aside: ${err.message}`, true);
  }
}

// "Rejoin call": return to the space a pull-aside space came from
// (whichever space that was, not always the Lobby), and bring whoever else
// is still in there with me.
async function returnFromAside() {
  try {
    const { space: homeSpace } = await api('POST', '/api/asides/return');
    await reconnectTo(homeSpace.id, 'back to the call...', { keepCall: true });
  } catch (err) {
    setStatus(`rejoin call: ${err.message}`, true);
  }
}

// Leaving entirely (not "Rejoin call" -- I'm not going anywhere
// myself). If I'm in a pulled-aside space, regular or private, whoever's
// still in there with me would otherwise be stranded -- an aside/private
// space is normally just the two (or few) of us, so without me there's no
// reason for them to still be off in a space by themselves. Applies to
// anyone, not just an admin: a Private Conversation doesn't need one.
// Same nudge /api/asides/return already sends the others in
// returnFromAside() above; I just never reconnect anywhere myself afterward.
async function leaveSpace() {
  if (currentSpace?.isAside) {
    await api('POST', '/api/asides/return').catch(() => {});
  }
  call.disconnect();
}

// Keeps the header's crumb in sync with where we actually are: the space
// list (nobody's called join() yet, or Disconnected just fired), a real
// space (with its own Leave), or an aside/private pulled out of one (with
// both a Leave for the whole call and a Rejoin Call back into the space it
// came from). Same delegated click handler covers both, wired once below.
// "Spaces" is a real ancestor, not a label that only shows up when there's
// nothing more specific to say -- the path never skips a level, so it's
// always here and always a link back to the space list, whether or not
// there's anything after it.
// Rejoin is icon-only, styled like the header's other icon buttons
// (settings, sign out) rather than a labeled pill -- title carries the
// name for a screen reader or a hover, same as those. Leave is in the subnav.
// The label text hides at narrow widths (see .crumb-label in style.css),
// leaving just the icon -- which is why every crumb-here needs one.
const crumbHere = (icon, text) => `<span class="crumb-here"><i class="${icon.includes(' ') ? icon : `fa-solid fa-${icon}`} fa-fw" aria-hidden="true"></i><span class="crumb-label"> ${escapeHtml(text)}</span></span>`;

// The space's name in the secondary nav's left zone. On the call page the primary nav's crumb is empty: the secondary nav says
// where you are, and saying it twice was noise (plan-nav.md). In an aside the name is the origin's plus the kind, and the
// Rejoin call tool (a space action, its `visible` reads currentSpace) shows in the right zone once the bar is redrawn.
function setSpaceName(icon, text) {
  const el = $('space-name');
  if (!el) return;
  el.hidden = !text;
  const i = $('space-icon');
  if (i) i.className = `${icon.includes(' ') ? icon : `fa-solid fa-${icon}`} fa-fw`;
  const t = $('space-name-text');
  if (t) t.textContent = text || '';
  el.title = text || ''; // the whole name, when the bar has had to cut it short
}
function updateCrumb() {
  setTopbarLocation('');
  if (!currentSpace) {
    setSpaceName('couch', '');
  } else if (currentSpace.isAside && currentSpace.origin) {
    const originSpace = presenceSpaces.find((r) => r.id === currentSpace.origin);
    const originName = originSpace ? spaceDisplayName(originSpace) : 'the call';
    const kind = currentSpace.private ? 'Private' : word('aside', { cap: true });
    setSpaceName('people-arrows', `${originName} · ${kind}`);
  } else {
    setSpaceName(spaceCrumbIcon(currentSpace), spaceName);
  }
  nav.draw('secondary');
}

// `joinCall`: a pull moving my call with me (reconnectTo); entering a space never joins.
async function join(spaceId = 'lobby', { joinCall = false } = {}) {
  $('join-error').hidden = true;
  for (const b of document.querySelectorAll('[data-join]')) b.disabled = true;
  try {
    setStatus('connecting...');
    const { token, livekitUrl } = await api('POST', '/api/token', { space: spaceId });
    // Fresh permissions each join -- an admin may have changed them since
    // this page loaded.
    me = (await api('GET', '/api/me')).user;
    // The call connects with the space already on the list. Presence, which asks LiveKit who is in a
    // call, fills the rest in when it answers and does not hold the connection (GitHub #71).
    const known = presenceSpaces.find((r) => r.id === spaceId);
    currentSpace = known || { id: spaceId, name: spaceName, members: [], pending: true };
    if (!currentSpace.pending) spaceName = spaceDisplayName(currentSpace);
    loadPresence();
    await canvas.refresh(currentSpace.isAside ? null : currentSpace.id); // asides have no modules
    spaceName = spaceDisplayName(currentSpace);
    renderSpaceLink();
    applyPermissions();
    updateRecallButton();
    await connectAndSetup(token, livekitUrl, { joinCall });
  } catch (err) {
    setStatus('', false);
    forgetSpace(); // a space that cannot be joined is not remembered, so a reload does not try it again
    $('join-error').textContent = err.message;
    $('join-error').hidden = false;
    await call.disconnect().catch(() => {});
  } finally {
    for (const b of document.querySelectorAll('[data-join]')) b.disabled = false;
  }
}

// A guest link: locked to the one space the link is for, no space picker, no
// account -- everything past "connect" is identical to a real member's join.
async function joinAsGuest(token, livekitUrl, joinedId, joinedName) {
  $('guest-join-error').hidden = true;
  try {
    setStatus('connecting...');
    spaceName = joinedName;
    // Same as a member's join: connect now, and let presence fill in members when LiveKit answers.
    const known = presenceSpaces.find((r) => r.id === joinedId);
    currentSpace = known || { id: joinedId, name: joinedName, members: [], pending: true };
    loadPresence();
    await canvas.refresh(currentSpace.isAside ? null : currentSpace.id);
    renderSpaceLink();
    applyPermissions();
    updateRecallButton();
    await connectAndSetup(token, livekitUrl);
  } catch (err) {
    setStatus('', false);
    $('guest-join-error').textContent = err.message;
    $('guest-join-error').hidden = false;
    await call.disconnect().catch(() => {});
  }
}

// Shared by join() and joinAsGuest() once a LiveKit token is in hand:
// connect, reveal the canvas, and open what this space starts with.
// Errors propagate to whichever of those called it, to land on the right error message.
// Nothing is received until the conference starts, so autoSubscribe is off.
async function connectAndSetup(token, livekitUrl, { joinCall = false } = {}) {
    await call.connect(livekitUrl, token, { autoSubscribe: false });
    console.debug('[app] connected to', currentSpace.id);
    // Everyone connects out of the call (the token's "call" attribute is off); entering never joins. Said again here
    // in case a token ever says otherwise, else others would draw a tile and list this person as on the call.
    if (call.localParticipant.attributes?.call !== 'off') await call.localParticipant.setAttributes({ call: 'off' }).catch(() => {});
    await syncAwayAttributes(); // away before the call service was reached: said now
    if (!guestToken && currentSpace && !currentSpace.isAside) rememberSpace(currentSpace.id); // an aside is gone once it ends, so it is not kept
    $('join').hidden = true;
    $('guest-join').hidden = true;
    $('canvas').hidden = false;
    updateCrumb();
    document.body.classList.add('in-space');
    wake();
    setStatus(`in ${spaceName}`);
    if (!currentSpace.isAside) {
      renderChatHistory(currentSpace.id);
      if (chatInput) chatInput.loadThread();
    }
    canvas.updateMenu();
    // A fresh request, else the remembered layout, else what this space or environment opens with, else the chat and the modules.
    // The conference among them opens in "Not in a call": entering never joins, and the microphone is asked for only on a join.
    canvas.restore();
    syncSnapBar(); // and this space's canvas-level snap
    syncCallControl(); // who is in the call, for the conference's "Not in a call" note
    // A pull while I was on the call (reconnectTo): straight onto this one, with the conference showing, through the
    // join check and the microphone rules a click goes through. Not awaited: the space is entered either way, and a
    // refusal is said in the "Not in a call" note as for a click.
    if (joinCall) {
      if (!canvas.builtinOpen('conference')) canvas.openBuiltin('conference');
      if (canvas.builtinOpen('conference')) startCall().catch((err) => setStatus(`call: ${err.message}`, true));
    }
}

// Start the conference: tiles for everyone in it, their media, and my own microphone.
// Runs only on a join: a click (the green phone or "Join the call"), or a pull that finds me on the call, which joins
// the new space's call from connectAndSetup() (entering a space otherwise never joins).
// The server is asked first (POST /api/call/join, the calls cap); a refusal is said in the "Not in a call" note and
// nothing is asked of the microphone. Every wait after that can outlast a stop (Hang up, the Conference switched off,
// the call gone): after each one the join backs out if that happened, releasing what it got, and never publishes the
// microphone or says "on" after a stop.
let callGeneration = 0; // stopCall() counts it up, so a join still waiting sees it was stopped
let callJoining = null; // the join under way, until it is in the call or has backed out
async function startCall() {
  if (callJoining) await callJoining; // a join stopped part-way backs out first: the two would share the microphone
  if (inCall || callJoining || call.state !== 'connected') return;
  const generation = callGeneration;
  const stopped = () => generation !== callGeneration || call.state !== 'connected' || !canvas.builtinOpen('conference');
  // Back out of a stopped join. If nothing has stopped the call yet (the call or the module went some other way),
  // stop it now, which unpublishes and releases everything; else release what this join got after the stop.
  const backOut = async (published) => {
    if (inCall && generation === callGeneration) { await stopCall(); return; }
    if (published && call.state === 'connected') await call.localParticipant.unpublishTrack(published, true).catch(() => {});
    closeMic();
  };
  let settle;
  callJoining = new Promise((resolve) => { settle = resolve; });
  try {
    setJoinProblem('');
    try {
      await api('POST', '/api/call/join', guestToken ? { guest: guestToken } : { space: currentSpace?.id });
    } catch (err) {
      // The server's own sentence when it gave one (the calls cap's refusal); anything else (no answer, a 500 page, a
      // proxy's 502) is said plainly, never as "HTTP 500".
      if (!stopped()) setJoinProblem(err.status && err.serverSaid ? err.message : 'Could not reach the server to join the call. Try again in a moment.');
      return;
    }
    if (stopped()) return;
    inCall = true;
    syncCallControl();
    setNoCall(false);
    canvas.updateMenu(); // the phone's Conference tab carries its in-call dot
    // "on", with away said in the same request when joining while away (or it was lost).
    if (call.localParticipant.attributes?.call !== 'on' || awayAttributesChanged()) {
      await call.localParticipant.setAttributes({ call: 'on', ...awayAttributes() }).catch(() => {});
      if (stopped()) return await backOut();
    }
    tileFor(call.localParticipant);
    applyMirror();
    for (const p of call.remoteParticipants.values()) {
      if (!shownInCall(p)) continue;
      tileFor(p);
      subscribeAll(p);
      updateMuted(p);
      updateCamera(p);
    }
    reconcileGhostTiles(); // anyone else in this space who's aside elsewhere, without waiting for the next poll
    // Only the microphone publishes on join. The camera stays off until
    // deliberately turned on -- a safety default, so nobody's video goes out
    // before they mean it to, and camera permission is only ever asked for
    // once someone actually reaches for it. toggleCam()'s setCameraEnabled
    // call already handles publishing a fresh track the first time, same as
    // it does for anyone who declined the camera here and turns it on later.
    let haveMic = false;
    try {
      const track = await openMic();
      if (stopped()) return await backOut();
      await call.localParticipant.publishTrack(track, { source: Track.Source.Microphone, name: 'microphone' });
      if (stopped()) return await backOut(track);
      haveMic = true;
      console.debug('[app] published audio');
      // Away when joining: the microphone stays off and comes on with Back, unless push to talk keeps it off anyway.
      if (isAway) awayRestoreMic = !prefs.ptt;
      if (prefs.ptt || isAway) {
        await call.localParticipant.setMicrophoneEnabled(false);
        if (stopped()) return await backOut(track);
      }
    } catch (err) {
      if (stopped()) return await backOut();
      console.warn('[app] no microphone:', err.message);
    }
    updateMuted(call.localParticipant);
    updateCamera(call.localParticipant);
    await fillDevices();
    if (stopped()) return await backOut();
    reflectMic();
    $('cam').classList.remove('on');
    $('cam').classList.add('off');
    setStatus(haveMic ? `in ${spaceName}` : `in ${spaceName} (no microphone)`);
    applyLayout();
  } finally {
    callJoining = null;
    settle();
  }
}
// The join check's refusal (or no answer), said plainly in the "Not in a call" note; '' clears it.
function setJoinProblem(text) {
  const el = $('no-call-error');
  if (!el) return;
  el.textContent = text;
  el.hidden = !text;
}

// Leave the conference and stay in the space: stop sending and receiving media, drop the
// tiles, and tell everyone I am not in it (the "call" attribute), so they drop mine.
async function stopCall() {
  callGeneration += 1; // a join still under way backs out (it may not be in the call yet)
  setJoinProblem('');
  if (!inCall) return;
  inCall = false;
  if (call.state === 'connected') {
    // Away ends with the call (below), so it is cleared for everyone with it.
    await call.localParticipant.setAttributes({ call: 'off', away: 'off', awayMessage: '' }).catch(() => {});
    for (const pub of [...call.localParticipant.trackPublications.values()]) {
      if (pub.track) await call.localParticipant.unpublishTrack(pub.track, true).catch(() => {});
    }
    for (const p of call.remoteParticipants.values()) for (const pub of p.trackPublications.values()) pub.setSubscribed(false);
  }
  closeMic();
  // Away is a conference state: going out of the call ends it without a word to anyone.
  $('away-overlay').hidden = true;
  isAway = false;
  awayMessage = '';
  awayRestartCam = false;
  $('away-toggle').classList.remove('off');
  $('away-toggle').title = 'Away: pauses your mic and camera, mutes what you hear, and lets everyone know';
  for (const [, tile] of tiles) tile.remove();
  tiles.clear();
  for (const [, tile] of ghostTiles) tile.remove();
  ghostTiles.clear();
  canvasDoc().querySelectorAll('audio').forEach((el) => el.remove());
  asideSelection.clear();
  updateAsideConfirm();
  $('cam').classList.remove('on');
  $('cam').classList.add('off');
  $('screen-share').classList.remove('on');
  toggleTray(false);
  closeSettings();
  setStatus(`in ${spaceName}`);
  syncCallControl();
  canvas.updateMenu(); // and loses it
}

// The hang-up button. In a pop-out window the canvas comes back to the page first, since the
// Modules button that brings the conference back is in the page's header.
// Hang up leaves the call but keeps the conference module, which says "Not in a call" while the toolbar's phone turns
// green to dial back in; the module's own close (its titlebar x) is what closes it. The whole-call popout comes back
// in with the call, as before.
function hangUp() {
  if (pipWindow) closePopout();
  stopCall();
  setNoCall(true);
}
function setNoCall(off) {
  $('conference').classList.toggle('call-off', off); // the section's state; .no-call is the note laid over the tiles
  $('no-call').hidden = !off;
  $('conf-close').title = off ? 'Close' : 'Leave the call and close';
  $('conf-close').setAttribute('aria-label', $('conf-close').title);
  syncWhoIsInCall();
  const h = $('hangup');
  h.classList.toggle('danger', !off);
  h.classList.toggle('dial', off);
  h.title = off ? 'Join the call' : `Leave the call (you stay in the ${word('space')})`;
  h.querySelector('i').className = off ? 'fa-solid fa-phone fa-fw' : 'fa-solid fa-phone-slash fa-fw';
}
// The toolbar's phone: red hangs up, green dials back in.
function phoneButton() {
  if (inCall) hangUp();
  else startCall().catch((err) => setStatus(`call: ${err.message}`, true));
}

async function toggleMic() {
  if (!inCall) return;
  const enabled = !call.localParticipant.isMicrophoneEnabled;
  // Away, nobody hears you: coming back (the away button) is what turns the microphone on again.
  if (enabled && isAway) { setStatus('away: come back to turn your microphone on'); return; }
  try {
    await call.localParticipant.setMicrophoneEnabled(enabled);
  } catch (err) {
    setStatus(`microphone: ${err.message}`, true);
  }
  reflectMic();
}

let camToggling = false;
async function toggleCam() {
  if (!inCall) return;
  // getUserMedia (plus the retry above) can take a moment -- without this
  // guard a quick double-tap fires a second toggle before the first one has
  // actually turned the camera on, landing on whichever finishes last.
  if (camToggling) return;
  const enabled = !call.localParticipant.isCameraEnabled;
  // Away, nobody sees you: coming back (the away button) is what turns the camera on again.
  if (enabled && isAway) { setStatus('away: come back to turn your camera on'); return; }
  camToggling = true;
  $('cam').classList.add('loading');
  try {
    await setCameraEnabledWithRetry(enabled);
    if (enabled) await keepCameraOffWhileAway();
    // A camera change made while away with the camera off (restartCamera) is applied now it is on: turning it on
    // alone would open the device it had before.
    if (enabled && awayRestartCam && !isAway && call.localParticipant.isCameraEnabled) {
      awayRestartCam = false;
      await restartCamera();
    }
    if (enabled && prefs.background !== 'none') await applyBackground(); // a fresh track on re-enable needs the processor reapplied
  } catch (err) {
    setStatus(`camera: ${err.message}`, true);
  }
  camToggling = false;
  $('cam').classList.remove('loading');
  const on = call.localParticipant.isCameraEnabled;
  $('cam').classList.toggle('on', on);
  $('cam').classList.toggle('off', !on);
  updateCamera(call.localParticipant);
}

// Right after a reconnectTo() (stepping into or back from an aside/private),
// the camera device can still be a beat from actually releasing on the OS
// side -- most often on mobile -- so the very next getUserMedia can fail
// with NotReadableError even though nothing is really wrong. One short
// retry covers that without making a real failure (denied permission, no
// camera at all) wait needlessly.
async function setCameraEnabledWithRetry(enabled) {
  try {
    await call.localParticipant.setCameraEnabled(enabled);
  } catch (err) {
    if (!enabled || err?.name !== 'NotReadableError') throw err;
    await new Promise((resolve) => setTimeout(resolve, 700));
    await call.localParticipant.setCameraEnabled(enabled);
  }
}

// Desktop sharing: LiveKit's own screen-share track (getDisplayMedia under
// the hood), published and rendered as its own tile -- see screenTileFor.
async function toggleScreenShare() {
  if (!inCall) return;
  try {
    await call.localParticipant.setScreenShareEnabled(!call.localParticipant.isScreenShareEnabled, { audio: true });
  } catch (err) {
    // cancelling the browser's own share picker throws too -- not a real error
    if (err?.name !== 'NotAllowedError') setStatus(`screen share: ${err.message}`, true);
  }
  const on = call.localParticipant.isScreenShareEnabled;
  $('screen-share').classList.toggle('on', on);
  $('screen-share').title = on ? 'Stop sharing your screen (S)' : 'Share your screen (S)';
}

// What I hear is off while I have muted it (deafened) or am away (setAway): every remote
// audio element, including any attached later (attachTrack), wherever the canvas is.
const hearingOff = () => !!prefs.deafened || isAway;
function applyHearing() {
  canvasDoc().querySelectorAll('audio').forEach((el) => { el.muted = hearingOff(); });
}
// Mute what I hear: everyone else's audio, not my own mic -- for when a
// phone call or something else needs the space quiet for a minute without
// actually leaving or muting yourself to the others.
function applyDeafen() {
  applyHearing();
  $('deafen').classList.toggle('on', !prefs.deafened);
  $('deafen').classList.toggle('off', prefs.deafened);
  $('deafen').title = prefs.deafened ? 'Unmute what you hear (D)' : 'Mute what you hear (D)';
}

function toggleDeafen() {
  prefs.deafened = !prefs.deafened;
  savePrefs();
  applyDeafen();
}

$('mic').addEventListener('click', toggleMic);
$('cam').addEventListener('click', toggleCam);
$('deafen').addEventListener('click', toggleDeafen);
$('screen-share').addEventListener('click', toggleScreenShare);
applyDeafen();
$('mic-select').addEventListener('change', async (e) => {
  prefs.micId = e.target.value;
  savePrefs();
  if (mic.ctx) await openMic().catch((err) => setStatus(`microphone: ${err.message}`, true));
});
$('cam-select').addEventListener('change', async (e) => {
  prefs.camId = e.target.value;
  savePrefs();
  await restartCamera();
});
$('speaker-select').addEventListener('change', async (e) => {
  prefs.speakerId = e.target.value;
  savePrefs();
  await applySpeaker();
});
// A short tone through whichever speaker is picked above -- routed through
// an <audio> element (not straight to AudioContext.destination) since
// setSinkId is how a specific output device actually gets chosen, same as
// every remote participant's own audio already goes through one.
$('test-speaker').addEventListener('click', async () => {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 440;
    osc.connect(gain);
    const dest = ctx.createMediaStreamDestination();
    gain.connect(dest);
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.25, now + 0.05); // fade in/out so it doesn't click
    gain.gain.setValueAtTime(0.25, now + 0.55);
    gain.gain.linearRampToValueAtTime(0, now + 0.65);
    const audio = new Audio();
    audio.srcObject = dest.stream;
    if (prefs.speakerId && audio.setSinkId) await audio.setSinkId(prefs.speakerId).catch(() => {});
    await audio.play();
    osc.start(now);
    osc.stop(now + 0.7);
    osc.onended = () => {
      audio.pause();
      ctx.close();
    };
  } catch (err) {
    setStatus(`test speaker: ${err.message}`, true);
  }
});
$('master-volume').addEventListener('input', (e) => {
  prefs.masterVolume = Number(e.target.value);
  savePrefs();
  syncCallPrefs({ masterVolume: prefs.masterVolume });
  $('volume-value').textContent = `${prefs.masterVolume}%`;
  applyMasterVolume();
});
$('gain').addEventListener('input', (e) => {
  prefs.gain = Number(e.target.value);
  savePrefs();
  syncCallPrefs({ gain: prefs.gain });
  applyMicSettings();
});
$('gate').addEventListener('input', (e) => {
  prefs.gate = Number(e.target.value);
  savePrefs();
  syncCallPrefs({ gate: prefs.gate });
  applyMicSettings();
});
for (const id of ['noise', 'echo', 'agc']) {
  $(id).addEventListener('change', async (e) => {
    prefs[id] = e.target.checked;
    savePrefs();
    syncCallPrefs({ [id]: prefs[id] });
    if (mic.ctx) await openMic().catch((err) => setStatus(`microphone: ${err.message}`, true));
  });
}
$('talk-mode').addEventListener('change', (e) => setPushToTalk(e.target.value === 'ptt'));
$('quality').addEventListener('change', async (e) => {
  prefs.quality = Number(e.target.value);
  savePrefs();
  syncCallPrefs({ quality: prefs.quality });
  await restartCamera();
});
$('mirror').addEventListener('change', (e) => {
  prefs.mirror = e.target.checked;
  savePrefs();
  syncCallPrefs({ mirror: prefs.mirror });
  applyMirror();
});
$('background-mode').addEventListener('change', async (e) => {
  prefs.background = e.target.value;
  savePrefs();
  syncCallPrefs({ background: prefs.background });
  await applyBackground();
});

function applyMirror() {
  const tile = call.localParticipant && tiles.get(call.localParticipant.identity);
  if (tile) tile.classList.toggle('mirror', prefs.mirror);
}

const MEDIAPIPE_ASSET_PATHS = { tasksVisionFileSet: '/lib/mediapipe-wasm', modelAssetPath: '/models/selfie_segmenter.tflite' };

// Blur, or a still picture (set on your profile page), behind your own
// camera -- entirely client-side (LiveKit's server never sees the real
// background or the other way around; this runs on the same track before
// it's published, same idea as a mirror flip). The model is real weight --
// a WASM runtime plus an ML segmenter -- so it's only fetched the first
// time someone actually turns either of these on, not on every join.
async function applyBackground() {
  const pub = call.localParticipant?.getTrackPublication(Track.Source.Camera);
  if (!pub?.track) return; // camera off right now; applied when it comes back on
  try {
    if (prefs.background === 'blur') {
      const { BackgroundBlur } = await import('/lib/track-processors.mjs');
      await pub.track.setProcessor(BackgroundBlur(10, undefined, undefined, { assetPaths: MEDIAPIPE_ASSET_PATHS }));
    } else if (prefs.background === 'image') {
      const { VirtualBackground } = await import('/lib/track-processors.mjs');
      await pub.track.setProcessor(VirtualBackground(`/img/${encodeURIComponent(me.key)}/background?v=${Date.now()}`, undefined, undefined, { assetPaths: MEDIAPIPE_ASSET_PATHS }));
    } else {
      await pub.track.stopProcessor();
    }
  } catch (err) {
    setStatus(`background: ${err.message}`, true);
    prefs.background = 'none';
    savePrefs();
    $('background-mode').value = 'none';
  }
}

async function restartCamera() {
  const pub = call.localParticipant?.getTrackPublication(Track.Source.Camera);
  if (!pub?.track) return;
  // Away: a restart asks the browser for the camera afresh, so it waits for Back (setAway).
  if (isAway) { awayRestartCam = true; return; }
  try {
    await pub.track.restartTrack(videoConstraints());
  } catch (err) {
    setStatus(`camera: ${err.message}`, true);
  }
}
$('hangup').addEventListener('click', phoneButton);
// The crumb's own action buttons (Leave, Rejoin Call) get regenerated with
// every updateCrumb() call, so one delegated listener on the stable
// container instead of rewiring a fresh element's click every time.
$('topbar-crumb').addEventListener('click', (event) => {
  const action = event.target.closest('[data-crumb-action]')?.dataset.crumbAction;
  if (action === 'rejoin') returnFromAside();
});
// Rejoin call and Leave live in the space's bar (registered with its other tools at the top of this file); the crumb
// listener above is kept for any page that still draws Rejoin there.
$('aside-confirm').addEventListener('click', () => pullAside([...asideSelection]));
$('aside-confirm-private').addEventListener('click', () => pullAside([...asideSelection], true));
$('aside-cancel').addEventListener('click', cancelAsideSelection);
$('aside-overlay').addEventListener('click', (e) => { if (e.target === e.currentTarget) cancelAsideSelection(); });
window.addEventListener('beforeunload', () => call.disconnect());

$('chat-close').addEventListener('click', () => toggleChat(false));
$('chat-more').addEventListener('click', (event) => {
  event.stopPropagation();
  const button = event.currentTarget;
  const items = [
    { icon: 'download', label: 'Save the chat', onPick: () => saveChat() },
  ];
  if (canModerateChat()) {
    items.push({ icon: 'trash', label: 'Delete the chat', danger: true, onPick: () => openConfirmMenu(button, {
      confirm: 'Delete the chat for everyone?',
      hint: 'Every message goes, for everyone.',
      armed: true,
      onConfirm: async () => {
        if (!currentSpace) return;
        try {
          await api('DELETE', `/api/spaces/${encodeURIComponent(currentSpace.id)}/chat`);
        } catch (err) {
          setStatus(err.message || 'Could not delete the chat.', true);
          return;
        }
        dropSharedChat();
        publishChat({ type: 'chat-clear' });
        try {
          localStorage.removeItem(chatHistoryKey(currentSpace.id));
          localStorage.removeItem(chatClearedKey(currentSpace.id));
        } catch {
          // the server already deleted it
        }
      },
    }) });
  }
  if ($('messages')?.querySelector('.message.private-ai:not(.chat-import-msg)')) {
    items.push({ icon: 'eraser', label: 'Clear your AI thread', danger: true, onPick: () => openConfirmMenu(button, {
      icon: 'eraser',
      confirm: 'Clear the thread?',
      hint: 'Only you see this. Shared answers stay.',
      armed: true,
      onConfirm: async () => {
        if (!currentSpace) return;
        await api('DELETE', `/api/spaces/${encodeURIComponent(currentSpace.id)}/ai/thread`);
        for (const el of [...$('messages').querySelectorAll('.message.private-ai:not(.chat-import-msg)')]) el.remove();
      },
    }) });
  }
  openHostMenu(button, items);
});
$('chat-pic').addEventListener('click', () => { $('chat-file').click(); });
$('chat-file').addEventListener('change', () => {
  for (const f of imageFiles($('chat-file').files)) sendImage(f);
  $('chat-file').value = '';
});
$('chat').addEventListener('paste', (event) => {
  const files = imageFiles(event.clipboardData?.files);
  if (!files.length) return;
  event.preventDefault();
  for (const f of files) sendImage(f);
});
$('chat').addEventListener('dragover', (event) => {
  event.preventDefault();
  $('chat').classList.add('drop');
});
$('chat').addEventListener('dragleave', () => $('chat').classList.remove('drop'));
$('chat').addEventListener('drop', (event) => {
  event.preventDefault();
  $('chat').classList.remove('drop');
  for (const f of imageFiles(event.dataTransfer?.files)) sendImage(f);
});
const chatInput = attachChatInput({
  $,
  api,
  word,
  getSpace: () => currentSpace,
  getMe: () => me,
  canvas,
  canDo,
  sendChat: (text) => sendChatText(text),
  resizeChatInput,
  setStatus,
  renderMarkup,
  frameMessage,
});
askInChat = (input) => chatInput.askAbout(input);
$('chat-form').addEventListener('submit', async (event) => {
  event.preventDefault();
  const text = $('chat-input').value.trim();
  if (!text || !canDo('chat')) return;
  if (chatInput && await chatInput.handleSubmit(text)) {
    $('chat-input').value = '';
    resizeChatInput();
    return;
  }
  if (/^\//.test(text)) return;
  $('chat-input').value = '';
  resizeChatInput();
  await sendChatText(text);
});
// Enter sends, like a normal chat; Shift+Enter is the way to actually get a
// newline into a <textarea> without that also submitting the form.
$('chat-input').addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' || event.shiftKey) return;
  event.preventDefault();
  $('chat-form').requestSubmit();
});
// Grows with the text up to a few lines, then scrolls -- resetting height
// to 'auto' first is what lets scrollHeight shrink back down too, not just
// grow, when a line is deleted.
function resizeChatInput() {
  const el = $('chat-input');
  el.style.height = 'auto';
  el.style.height = `${el.scrollHeight}px`;
}
$('chat-input').addEventListener('input', resizeChatInput);

// Wraps the current selection (or just inserts an empty pair, cursor
// landing in the middle) in the chat input with the given marker --
// **bold**, *italic*, `code`, matching what renderMarkup() understands.
function wrapChatSelection(marker) {
  const el = $('chat-input');
  const { selectionStart: start, selectionEnd: end, value } = el;
  const selected = value.slice(start, end);
  el.value = value.slice(0, start) + marker + selected + marker + value.slice(end);
  el.focus();
  const from = start + marker.length;
  el.setSelectionRange(from, from + selected.length);
  resizeChatInput();
}
$('chat-bold').addEventListener('click', () => wrapChatSelection('**'));
$('chat-italic').addEventListener('click', () => wrapChatSelection('*'));
$('chat-code').addEventListener('click', () => wrapChatSelection('`'));
// Prefixes the current line (or every non-blank line the selection spans)
// with "- ", rather than wrapping like the others -- a list marker belongs
// at the start of a line, not around a span of text.
$('chat-list').addEventListener('click', () => {
  const el = $('chat-input');
  const { selectionStart: start, selectionEnd: end, value } = el;
  const lineStart = value.lastIndexOf('\n', start - 1) + 1;
  const lineEnd = value.indexOf('\n', end) === -1 ? value.length : value.indexOf('\n', end);
  const block = value.slice(lineStart, lineEnd);
  const newBlock = block.split('\n').map((l) => (l.trim() ? `- ${l}` : l)).join('\n');
  el.value = value.slice(0, lineStart) + newBlock + value.slice(lineEnd);
  el.focus();
  el.setSelectionRange(lineStart, lineStart + newBlock.length);
  resizeChatInput();
});
$('chat-format-bar').addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  $('chat-help-popup').hidden = true;
  $('chat-emoji-popup').hidden = true;
  if (chatInput) { chatInput.hidePicker(); chatInput.hideImport(); }
  $('chat-input').focus();
});
$('chat-help').addEventListener('click', (e) => {
  e.stopPropagation();
  $('chat-emoji-popup').hidden = true;
  if (chatInput) chatInput.hidePicker();
  const help = $('chat-help-popup');
  help.hidden = !help.hidden;
  if (!help.hidden) placeAbove(help, visibleAnchor($('chat-help')));
});
document.addEventListener('click', (e) => {
  if (!$('chat-help-popup').hidden && !e.target.closest('#chat-help-popup')) $('chat-help-popup').hidden = true;
  if (!$('chat-emoji-popup').hidden && !e.target.closest('#chat-emoji-popup')) $('chat-emoji-popup').hidden = true;
  if (chatInput && !e.target.closest('#chat-command-wrap')) chatInput.hidePicker();
});

// The chat's emoji picker offers the same list as the reaction tray (the admin
// sets it under Manage > Theme), rebuilt whenever that list is loaded.
function renderChatEmoji(reactions) {
  const popup = $('chat-emoji-popup');
  popup.textContent = '';
  for (const r of reactions) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chat-emoji-btn';
    b.textContent = r.glyph;
    b.title = r.label;
    b.addEventListener('click', () => {
      const el = $('chat-input');
      const { selectionStart: start, selectionEnd: end, value } = el;
      el.value = value.slice(0, start) + r.glyph + value.slice(end);
      el.focus();
      const at = start + r.glyph.length;
      el.setSelectionRange(at, at);
      resizeChatInput();
    });
    popup.appendChild(b);
  }
  $('chat-emoji').hidden = reactions.length === 0;
}
$('chat-emoji').addEventListener('click', (e) => {
  e.stopPropagation();
  $('chat-help-popup').hidden = true;
  if (chatInput) chatInput.hidePicker();
  const emoji = $('chat-emoji-popup');
  emoji.hidden = !emoji.hidden;
  if (!emoji.hidden) placeAbove(emoji, visibleAnchor($('chat-emoji')));
});

$('layout').addEventListener('click', cycleView);
$('layout-pick').addEventListener('click', (e) => {
  const b = e.target.closest('[data-view]');
  if (b) setView(b.dataset.view);
});
window.addEventListener('resize', applyLayout);

$('floatbar').addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-settings]');
  if (trigger) openSettings(trigger.dataset.settings);
});

// --- floatbar overflow -------------------------------------------------------
// Only "More" and hang up always show; everything else collapses into "More"
// (rather than wrapping to a second row) as the bar runs out of room, lowest
// data-collapse first -- the extras, then chat, then camera, then the
// microphone last. See fitFloatbar(), called from applyLayout() whenever the
// canvas (or the chat next to it) changes size.
const FLOATBAR_ALL = [...$('floatbar').children];
const FLOATBAR_COLLAPSE_ORDER = FLOATBAR_ALL.filter((el) => el.dataset.collapse).sort(
  (a, b) => Number(a.dataset.collapse) - Number(b.dataset.collapse)
);
function fitFloatbar() {
  const bar = $('floatbar');
  // Put everything back in its original spot first -- simplest way to get a
  // stable, correctly-ordered result every time rather than tracking where
  // each collapsed item needs to be spliced back in.
  for (const item of FLOATBAR_ALL) bar.appendChild(item);
  $('floatbar-more').hidden = true;
  for (const item of FLOATBAR_COLLAPSE_ORDER) {
    if (bar.scrollWidth <= bar.clientWidth) break;
    if (item.hidden) continue; // already hidden by its own logic (no room link, say) -- moving it won't help
    $('floatbar-overflow').appendChild(item);
    $('floatbar-more').hidden = false;
  }
  fitChatChrome();
}

// The same fold as the conference bar, for a row of icon buttons in the chat: lowest data-collapse
// first (left to right) into that row's "...". A button hidden for its own reason (Bring in research
// when it does not apply) is left alone. data-collapsed marks the ones this fold hid, so they can come back.
function rowIcon(el) {
  const node = el.querySelector('i');
  const match = node && node.className.match(/fa-(?!solid|regular|fw\b)([a-z0-9-]+)/);
  return match ? match[1] : '';
}
function rowLabel(el) {
  const named = el.matches('button') ? el : el.querySelector('button');
  return (named && (named.getAttribute('aria-label') || named.title)) || el.getAttribute('aria-label') || 'More';
}
function fitRow(bar) {
  if (!bar) return;
  const more = bar.querySelector('[data-more]');
  const items = [...bar.querySelectorAll('[data-collapse]')].sort(
    (a, b) => Number(a.dataset.collapse) - Number(b.dataset.collapse)
  );
  for (const item of items) {
    if (!item.dataset.collapsed) continue;
    item.hidden = false;
    delete item.dataset.collapsed;
  }
  if (more) more.hidden = true;
  if (!bar.clientWidth) return;
  const spills = () => {
    const edge = bar.getBoundingClientRect();
    return [...bar.querySelectorAll('button')].some((child) => {
      if (child.hidden || child.closest('[hidden]')) return false;
      const box = child.getBoundingClientRect();
      return box.left < edge.left - 1 || box.right > edge.right + 1;
    });
  };
  let guard = 0;
  while (spills() && guard < 20) {
    const next = items.find((el) => !el.hidden && !el.dataset.collapsed);
    if (!next) break;
    next.hidden = true;
    next.dataset.collapsed = '1';
    if (more) more.hidden = false;
    guard += 1;
  }
}
function fitChatChrome() {
  fitRow($('chat-format-bar'));
  fitRow($('chat-import-foot'));
}
function openCollapsed(more, bar) {
  const hidden = [...bar.querySelectorAll('[data-collapsed]')];
  openHostMenu(more, hidden.map((el) => ({
    icon: rowIcon(el),
    label: rowLabel(el),
    onPick: () => {
      const btn = el.matches('button') ? el : el.querySelector('button');
      btn?.click();
    },
  })));
}
function visibleAnchor(el) {
  const collapsed = el.closest('[data-collapsed]');
  const more = $('chat-format-more');
  if ((el.hidden || collapsed) && more && !more.hidden) return more;
  return el;
}
for (const barId of ['chat-format-bar', 'chat-import-foot']) {
  const bar = $(barId);
  if (!bar) continue;
  const more = bar.querySelector('[data-more]');
  if (more) more.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    openCollapsed(more, bar);
  });
  // The row's own box, not the column: opening the import panel does not resize the column.
  new ResizeObserver(() => fitRow(bar)).observe(bar);
}
$('floatbar-overflow').addEventListener('click', (event) => {
  const trigger = event.target.closest('[data-settings]');
  if (trigger) openSettings(trigger.dataset.settings);
  if (event.target.closest('button')) $('floatbar-overflow').hidden = true;
});
$('floatbar-more').addEventListener('click', (event) => {
  event.stopPropagation();
  $('floatbar-overflow').hidden = !$('floatbar-overflow').hidden;
});
document.addEventListener('click', (event) => {
  if (!$('floatbar-overflow').hidden && !event.target.closest('#floatbar-overflow') && !event.target.closest('#floatbar-more')) {
    $('floatbar-overflow').hidden = true;
  }
});

// Guests: the space's own reusable join link, same door for everyone at the
// call to open (see the guest-link routes) -- not just an admin.
function say(el, text, error = false) {
  el.textContent = text;
  el.classList.toggle('error', error);
  if (text && !error) setTimeout(() => el.textContent === text && (el.textContent = ''), 3000);
}
async function copyText(text, statusEl) {
  try {
    await navigator.clipboard.writeText(text);
    if (statusEl) say(statusEl, 'copied');
  } catch (err) {
    window.prompt('Copy this:', text);
  }
}
function renderGuestLink() {
  if (guestToken || !currentSpace) return; // a guest has no session to manage this with
  $('guest-section').hidden = !canDo('canInvite');
  const space = presenceSpaces.find((r) => r.id === currentSpace.id);
  const token = space?.guestToken || null;
  const allowed = space?.allowGuests !== false;
  $('guest-link-off-note').hidden = allowed;
  $('guest-link-value').textContent = token ? `${location.origin}/guest/${token}` : 'off';
  $('guest-link-on').hidden = !allowed || !!token;
  $('guest-link-copy').hidden = !token;
  $('guest-link-new').hidden = !allowed || !token;
  $('guest-link-off').hidden = !token;
}
async function setGuestLink(body) {
  try {
    if (body === null) await api('DELETE', `/api/spaces/${encodeURIComponent(currentSpace.id)}/guest-link`);
    else await api('POST', `/api/spaces/${encodeURIComponent(currentSpace.id)}/guest-link`, body);
    await loadPresence();
    renderGuestLink();
  } catch (err) {
    say($('guest-link-status'), err.message, true);
  }
}
$('guest-link-on').addEventListener('click', () => setGuestLink({}));
$('guest-link-new').addEventListener('click', () => setGuestLink({ regenerate: true }));
$('guest-link-off').addEventListener('click', () => setGuestLink(null));
$('guest-link-copy').addEventListener('click', () => copyText($('guest-link-value').textContent, $('guest-link-status')));
$('react-toggle').addEventListener('click', () => toggleTray());
$('react-tray').addEventListener('click', (event) => {
  const button = event.target.closest('[data-reaction]');
  if (!button) return;
  sendReaction(button.dataset.reaction);
  toggleTray(false);
});

// Keyboard: M mic, V camera, D deafen, C chat, L layout, R reactions, S
// screen share (once available), 1 to 6 send a reaction, the account's own
// push-to-talk key held = talk while in that mode, unless typing in a
// field. The account's mute and camera hotkeys (Cmd/Ctrl+D and +E by
// default, set on the profile page) work alongside M and V, not instead
// of them.
document.addEventListener('keydown', onKey);
document.addEventListener('keyup', onKeyUp);
// Whether the key went to a text field. A module that runs in the page keeps its fields in a shadow root, where
// event.target is only the root's host, so the field itself is the first thing on the event's path.
function typing(event) {
  const target = (event.composedPath && event.composedPath()[0]) || event.target;
  return Boolean(target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable));
}
// Where focus last went by keyboard (see pressesControl): taken as focus moves, after a key or a pointer press, so a
// script's focus counts as whatever the person did last (a menu picked by mouse gives its button focus back by mouse).
// The browser's :focus-visible can't tell: by the time the key's own keydown arrives, it already says keyboard.
let byPointer = false;
let keyFocus = null;
function notePointer() {
  byPointer = true;
  keyFocus = null; // a click on the control focus is already on moves no focus, and makes it the mouse's
}
function noteKey() {
  byPointer = false;
}
function noteFocus(event) {
  keyFocus = byPointer ? null : (event.composedPath && event.composedPath()[0]) || event.target;
}
window.addEventListener('keydown', noteKey, true); // the window's capture runs first, before a menu's own keys move focus
document.addEventListener('pointerdown', notePointer, true);
document.addEventListener('focusin', noteFocus, true);
// Whether the key presses the focused control, so push-to-talk leaves it alone: Space or Enter on an entry of an open
// menu, or on a button (or anything playing one) reached by keyboard. A button focused by a mouse click keeps
// push-to-talk, or clicking the mic and then holding Space would press the mic again. Fields are typing()'s.
function pressesControl(event) {
  if (event.key !== ' ' && event.key !== 'Enter') return false;
  const target = (event.composedPath && event.composedPath()[0]) || event.target;
  if (!target || !target.matches) return false;
  if (target.closest('[role=menu]')) return true;
  if (target !== keyFocus) return false;
  return target.matches('button, summary, [role=button], [role=menuitem], [role=menuitemcheckbox], [role=menuitemradio], [role=checkbox], [role=switch], [role=tab]');
}
// Talking stops when the key that started it comes up, wherever focus has moved and whatever modifier came down since
// (pttHeld holds that key's code), or when its release can't reach the page: the window loses focus, is hidden or goes.
function releaseTalk() {
  if (!pttHeld) return;
  pttHeld = false;
  call.localParticipant.setMicrophoneEnabled(false).then(reflectMic).catch(() => {});
}
function releaseWhenHidden(event) {
  if (event.target.visibilityState === 'hidden') releaseTalk();
}
window.addEventListener('blur', releaseTalk);
window.addEventListener('pagehide', releaseTalk);
document.addEventListener('visibilitychange', releaseWhenHidden);
function onKeyUp(event) {
  if (prefs.ptt && pttHeld && event.code === pttHeld) {
    releaseTalk();
    event.preventDefault();
  }
}
function onKey(event) {
  if (!document.body.classList.contains('in-space')) return;
  if (typing(event)) return;
  // Push-to-talk only while in the call: out of it the key does nothing, or holding it would open the microphone
  // (LiveKit publishes one) with the person not in the call. Letting go is safe either way (releaseTalk).
  if (inCall && prefs.ptt && hotkeyMatches(event, prefs.pttKey) && !pressesControl(event)) {
    event.preventDefault();
    if (event.repeat || pttHeld || isAway) return; // away, nobody hears you (setAway)
    pttHeld = event.code;
    call.localParticipant.setMicrophoneEnabled(true).then(reflectMic).catch(() => {});
    return;
  }
  // Configurable mute/camera shortcuts (Cmd/Ctrl+D and +E by default, same
  // as Google Meet) check first since they carry a modifier the plain
  // single-letter shortcuts below intentionally reject.
  if (hotkeyMatches(event, prefs.muteKey)) { toggleMic(); event.preventDefault(); return; }
  if (hotkeyMatches(event, prefs.camKey)) { toggleCam(); event.preventDefault(); return; }
  if (event.metaKey || event.ctrlKey || event.altKey) return;
  const key = event.key.toLowerCase();
  if (key === 'm') toggleMic();
  else if (key === 'v') toggleCam();
  else if (key === 'd') toggleDeafen();
  else if (key === 'c') toggleChat();
  else if (key === 'l') cycleView();
  else if (key === 'r') toggleTray();
  else if (key === 's' && !$('screen-share').hidden) toggleScreenShare();
  else if (key === 'f') toggleFullscreen(event.target.ownerDocument || event.target);
  else if (/^[1-6]$/.test(key)) sendReaction(REACTION_KEYS[Number(key) - 1]);
  else return;
  event.preventDefault();
}

// --- mobile viewport quirks ---------------------------------------------------

// Mobile browsers can be slow to recompute CSS's own `dvh` as their address
// and tab bar show and hide on scroll -- visualViewport's resize event
// fires the moment that actually happens, so mirroring it into a custom
// property keeps the floating controls above the browser's own chrome
// instead of sliding out from under it (see body.in-space in style.css).
function syncViewportHeight() {
  const h = window.visualViewport?.height || window.innerHeight;
  document.documentElement.style.setProperty('--app-vh', `${h}px`);
}
window.visualViewport?.addEventListener('resize', syncViewportHeight);
window.addEventListener('resize', syncViewportHeight);
syncViewportHeight();


// --- floating controls: show on movement, hide when the pointer rests --------

let idleTimer = 0;
// The canvases that hide their chrome when the pointer rests: the page's own, and the one the conference is wrapped in
// when it is popped out into a window of its own (that window's document, not this page's).
function idleCanvases() {
  const out = [$('canvas')];
  const win = canvas.builtinWindow('conference');
  const theirs = win && win.document.querySelector('.canvas');
  if (theirs) out.push(theirs);
  return out;
}
// `doc`: the document the movement happened in, so a pointer on the page does not bring the popped-out window's chrome
// back (or the other way round); with none given, every canvas wakes.
function wake(doc = null) {
  for (const s of idleCanvases()) if (!doc || s.ownerDocument === doc) s.classList.remove('idle');
  clearTimeout(idleTimer);
  idleTimer = setTimeout(() => {
    // The settings popover, the reaction tray and the floating toolbar live inside the conference section, so they are in
    // whichever document the conference is in: this page's, or its own window's once popped out. An open popover, or a
    // pointer resting on the toolbar, keeps the chrome up. The chat keeps it up only while the call is on this page: in
    // the conference's own window the chat is not there to need it.
    const win = canvas.builtinWindow('conference');
    const doc = win ? win.document : document;
    const shown = (id) => { const el = doc.getElementById(id); return Boolean(el && !el.hidden); };
    const floatbar = doc.getElementById('floatbar');
    const keepOpen = shown('settings') || shown('react-tray') || Boolean(floatbar && floatbar.matches(':hover')) || (!win && canvas.builtinOpen('chat'));
    if (!keepOpen) for (const s of idleCanvases()) s.classList.add('idle');
    else wake();
  }, 2500);
}
function watchPointer(doc) {
  const here = () => wake(doc);
  doc.addEventListener('mousemove', here);
  doc.addEventListener('touchstart', here, { passive: true });
  doc.addEventListener('keydown', here);
}
watchPointer(document);

// Click anywhere outside the settings popover (but still on the page) closes
// it, same as any other dropdown -- doesn't fire for the gear or any of the
// per-button carets that open it, or for clicks inside the popover itself
// (a link, a colour picker, ...).
function watchOutsideClick(doc) {
  doc.addEventListener('click', (event) => {
    if ($('settings').hidden) return;
    if (event.target.closest('#settings') || event.target.closest('[data-settings]')) return;
    closeSettings();
  });
}
watchOutsideClick(document);

// --- full screen ---------------------------------------------------------------

// Full screen applies to whichever document actually holds the canvas right
// now -- the main window normally, or the popped-out one once it exists.
// Hardcoding `document` here would fullscreen the wrong (empty) window
// once popped out, since that's a separate top-level browsing context.
function toggleFullscreen(doc = canvasDoc()) {
  if (doc.fullscreenElement) {
    doc.exitFullscreen().catch(() => {});
  } else {
    doc.documentElement.requestFullscreen().catch((err) => setStatus(`full screen: ${err.message}`, true));
  }
}
// Not just the click handler -- covers Esc and any other way the browser
// itself might leave full screen, so the button's icon never gets stuck
// showing the wrong state. Registered on the main document up front, and
// on the popout's own document once it exists (see setUpPopoutWindow).
function syncFullscreenButton() {
  const on = !!document.fullscreenElement || !!canvasDoc().fullscreenElement || !!confEl.ownerDocument.fullscreenElement;
  nav.setActive('fullscreen-toggle', on);
  $('fullscreen-toggle').title = on ? 'Exit full screen (F)' : 'Full screen (F)';
}
document.addEventListener('fullscreenchange', syncFullscreenButton);

// --- install as an app / pop out ------------------------------------------------
// The entry itself (and the beforeinstallprompt handling behind it) now
// lives in the shared header's account menu -- see accountMenuItems() in
// brand.js -- so this is just the manual-instructions fallback for
// browsers that never fire that event at all. Guests get no install at all
// (Thomas, 2026-10-01): a guest link, or an account whose role is guest, has
// no hint, no note and no service worker (the worker is only there to make the
// site installable).

const isGuestViewer = () => Boolean(guestToken) || me?.role === 'guest';

// Once the page knows who is looking (an account's /api/me has answered): nothing for a guest.
function offerInstall() {
  const hint = describeInstall();
  $('install-hint').textContent = hint;
  $('install-hint').hidden = !hint;
  $('install-note').textContent = hint;
  if (!isGuestViewer() && 'serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(() => {});
}

function describeInstall() {
  if (isGuestViewer()) return '';
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  if (standalone) return '';
  const ua = navigator.userAgent;
  if (/iPhone|iPad/.test(ua)) return 'Add to your home screen for a full-screen call: Share, then Add to Home Screen.';
  if (/Safari/.test(ua) && !/Chrome|Chromium|Edg/.test(ua)) return 'For a window without browser bars: File, then Add to Dock.';
  if (/Firefox/.test(ua)) return 'Firefox has no install; Chrome, Edge or Safari can open the call in its own window.';
  return 'For a window without browser bars, use Install as an app in your profile menu once your browser offers it.';
}

// A plain popup window: the whole canvas moves into it and comes back when
// closed, same as before. Used to be Chrome's document picture-in-picture,
// which floats over other windows automatically -- but that API caps
// itself to ~80% of the screen's work area with no way for a page to ask
// for more (confirmed against Chromium's own source, not just guessed),
// which was exactly the "can't make it bigger" complaint this replaces.
// A regular popup can be resized to fill the whole screen like any other
// window; the trade-off is it needs `popup` in its window features (and
// even then, some platforms still show a thin title bar of their own) and
// won't stay above other windows the way picture-in-picture did.
function openPopout() {
  try {
    // Open small (or at the last size used) so it fits beside the game;
    // the tiles fit whatever size the window is dragged to. Pointed at a
    // real (empty) page of ours rather than '' -- a blank popup's address
    // strip reads "about:blank", which looks broken; this way it reads our
    // own domain, which at least looks intentional. Either way the strip
    // itself can't be suppressed (see the comment above).
    const size = prefs.popout || { w: 480, h: 300 };
    const width = Math.max(240, Math.min(size.w, screen.availWidth));
    const height = Math.max(120, Math.min(size.h, screen.availHeight));
    pipWindow = window.open('/popout.html', 'app-popout', `popup,width=${width},height=${height}`);
    if (!pipWindow) throw new Error('the browser blocked the popup -- allow popups for this site and try again');
    pipWindow.addEventListener('load', () => setUpPopoutWindow(pipWindow), { once: true });
    nav.setActive('popout', true);
    $('popout').title = 'Pop it back in';
  } catch (err) {
    setStatus(`pop out: ${err.message}`, true);
  }
}

// Runs once /popout.html has actually finished loading in the new window --
// moving the canvas in before then would land it in that page's own
// about:blank-era document, which the real navigation throws away.
function setUpPopoutWindow(win) {
  win.document.title = spaceName;
  for (const sheet of document.querySelectorAll('link[rel="stylesheet"]')) {
    win.document.head.appendChild(sheet.cloneNode(true));
  }
  followTheme(win.document); // light or dark, and a changed theme, follow this page's (brand.js)
  win.document.body.className = 'in-space popout';
  // The whole app moves: the header too, so everything works from where you are. Moving a
  // node adopts it into the new document, video and audio and all.
  win.document.body.appendChild(topbarEl);
  win.document.body.appendChild($('canvas'));
  placeSubnav(); // phone or wide by this window's width now: the tab bar, or the chooser's button and list
  canvas.popped(); // the modules open again in this window
  $('away').hidden = false;
  keepPoppedVideosLive();
  watchPointer(win.document);
  watchOutsideClick(win.document);
  win.document.addEventListener('keydown', onKey);
  win.document.addEventListener('keyup', onKeyUp);
  win.addEventListener('keydown', noteKey, true);
  win.document.addEventListener('pointerdown', notePointer, true);
  win.document.addEventListener('focusin', noteFocus, true);
  win.document.addEventListener('visibilitychange', releaseWhenHidden);
  win.addEventListener('blur', releaseTalk);
  win.addEventListener('pagehide', releaseTalk);
  // Full screen while popped out should fullscreen that window, not the
  // (now mostly empty) main one left behind -- see toggleFullscreen().
  win.document.addEventListener('fullscreenchange', syncFullscreenButton);
  // The header's links would navigate this window away from the call. They bring the app back
  // first, then do their thing on the page.
  win.document.addEventListener('click', (event) => {
    const link = event.target.closest('#topbar a[href]');
    if (!link) return;
    event.preventDefault();
    const href = link.getAttribute('href');
    closePopout();
    if (link.matches('#spaces-link, .brand-home')) showSpaceList();
    else if (link.matches('[data-overlay-link]')) openOverlay(href);
  });
  win.addEventListener('resize', () => {
    prefs.popout = { w: win.innerWidth, h: win.innerHeight };
    savePrefs();
    applyLayout();
  });
  setTimeout(applyLayout, 50);
  win.addEventListener('pagehide', () => {
    document.body.prepend(topbarEl);
    document.body.appendChild($('canvas'));
    placeSubnav(); // and by this window's again
    canvas.popped(); // and back in this one
    $('away').hidden = true;
    pipWindow = null;
    dropPoppedWatches();
    nav.setActive('popout', false);
    $('popout').title = 'Pop out into its own window';
    wake();
  });
}
function closePopout() {
  if (pipWindow) pipWindow.close();
}

// LiveKit's adaptive stream stops a remote video it thinks nobody sees: when the main page is hidden
// (document.visibilityState, after a few seconds) or the element is out of the main window's view. It allows for
// Chrome's document picture-in-picture, not for this pop-out window, so a pop-out over a minimised or covered main
// window (an installed app's, most often) froze every video on its last picture. While a remote video is in the
// pop-out, a second watch of ours tells LiveKit it is shown in a window of its own (pictureInPicture, as its own
// picture-in-picture does) and how big it is there; popping back in drops it.
const poppedWatches = new Set(); // { track, info }
function keepPoppedVideoLive(track, video) {
  if (!pipWindow || video.ownerDocument === document || typeof track?.observeElementInfo !== 'function' || !track.isAdaptiveStream) return;
  for (const w of poppedWatches) if (w.info.element === video) return;
  const info = {
    element: video,
    visible: true,
    pictureInPicture: true,
    visibilityChangedAt: 0,
    width: () => video.clientWidth,
    height: () => video.clientHeight,
    observe() {
      const Observer = video.ownerDocument.defaultView?.ResizeObserver;
      this.resize = Observer ? new Observer(() => this.handleResize?.()) : null;
      this.resize?.observe(video);
    },
    stopObserving() { this.resize?.disconnect(); },
  };
  poppedWatches.add({ track, info });
  track.observeElementInfo(info);
}
function keepPoppedVideosLive() {
  for (const p of call.remoteParticipants.values()) {
    for (const pub of p.videoTrackPublications.values()) {
      for (const el of pub.track?.attachedElements || []) keepPoppedVideoLive(pub.track, el);
    }
  }
}
function dropPoppedWatches() {
  for (const { track, info } of poppedWatches) track.stopObservingElementInfo(info); // already gone with a detached video: harmless
  poppedWatches.clear();
}

$('bring-back').addEventListener('click', closePopout);

// --- your profile / Manage, without leaving the call -------------------------
// A real navigation would drop the WebRTC connection (it's tied to the page),
// so these load in an iframe instead: the call keeps running underneath,
// untouched. The loaded page (same origin) gets a "Back to [space]" link
// added to its own header -- see wireOverlayBack in brand.js -- rather than
// this page stacking a second bar of its own on top of it. Everyone else at
// the call sees your own tile marked "Away" while you're in there; you
// don't, since you already know.
function openOverlay(path) {
  const params = new URLSearchParams({ from: 'space', spaceName });
  // Already known here -- handing them off lets the overlay's own header
  // render correctly on its very first paint instead of flashing the
  // generic default. See the matching read in renderTopbar() (brand.js).
  const environmentName = document.querySelector('[data-brand="environmentName"]')?.textContent;
  if (environmentName) params.set('environmentName', environmentName);
  const homeIconEl = document.querySelector('[data-brand="home-icon"]');
  const homeIcon = homeIconEl?.dataset.iconId;
  if (homeIcon) params.set('homeIcon', homeIcon);
  $('page-overlay-frame').src = `${path}${path.includes('?') ? '&' : '?'}${params}`;
  $('page-overlay-frame').hidden = false;
  setAway(true);
}
function closeOverlay() {
  $('page-overlay-frame').hidden = true;
  $('page-overlay-frame').src = 'about:blank';
  setAway(false);
}
window.closeProfileOverlay = closeOverlay; // called directly by the (same-origin) iframe
// The account menu's View profile (brand.js): over the page, not a navigation, from the popped-out window too.
document.addEventListener('app:open-profile', (event) => {
  event.preventDefault();
  closePopout();
  openOverlay('/profile');
});

// Also called directly by the profile page overlay, right after it saves a
// background/call-prefs change -- otherwise the call keeps running with
// whatever was in effect at connect time, and the only way to pick up a
// change made this way used to be toggling the camera off and back on.
// `patch` is whatever fields actually changed (e.g. {background: 'blur'},
// {mirror: true}, {quality: 720}); a bare call with no patch just means
// "the background image itself changed, nothing in prefs did".
window.appApplyCallPrefs = async function (patch) {
  if (patch) {
    Object.assign(prefs, patch);
    savePrefs();
  }
  if (!patch || 'mirror' in patch) applyMirror();
  if (!patch || 'masterVolume' in patch) applyMasterVolume();
  if (!patch || 'gain' in patch || 'gate' in patch) applyMicSettings();
  if ((!patch || 'noise' in patch || 'echo' in patch || 'agc' in patch || 'micId' in patch) && mic.ctx) {
    await openMic().catch(() => {});
  }
  if (!patch || 'quality' in patch || 'camId' in patch) await restartCamera();
  // A plain image re-upload (no mode change) still needs this: applyBackground()
  // re-fetches the picture itself fresh every time, cache-bust and all.
  if (!patch || 'background' in patch || prefs.background === 'image') await applyBackground();
};
// Delegated (not one-time-queried) since a space card's own Edit link is
// built later, once presenceSpaces comes back -- a static query here would
// miss it and open it as a real navigation instead, with no way back.
document.addEventListener('click', (event) => {
  const link = event.target.closest('[data-overlay-link]');
  if (!link) return;
  event.preventDefault();
  openOverlay(link.getAttribute('href'));
});

// --- the space list, without leaving the call ---------------------------------
// "All spaces" (the server name/icon, and its twin in the nav) would otherwise
// be a real navigation to '/' -- same page, but a fresh load drops the
// WebRTC connection entirely. The space list already lives right here on this
// page (#join), so there's nothing to load: just swap views, the same "away"
// treatment openOverlay() gives profile/admin, and stay connected underneath.
function showSpaceList() {
  if (!document.body.classList.contains('in-space')) return;
  setAway(true);
  document.body.classList.remove('in-space');
  $('canvas').hidden = true;
  canvas.showFloating(false); // a floating module lives beside the canvas, not inside it
  if (guestToken) {
    $('guest-join').hidden = false;
  } else {
    $('join').hidden = false;
    loadPresence();
  }
}
// The reverse: a space card recognizes the space it's still connected to (see
// renderSpaces()) and offers "Rejoin" instead of "Join" -- no network round
// trip needed, just the same view swap back.
function returnToCanvas() {
  if (call.state !== 'connected') return;
  $('join').hidden = true;
  $('guest-join').hidden = true;
  $('canvas').hidden = false;
  canvas.showFloating(true);
  document.body.classList.add('in-space');
  updateCrumb();
  setAway(false);
}
document.addEventListener('click', (event) => {
  if (!event.target.closest('#spaces-link, .brand-home')) return;
  if (guestToken || !document.body.classList.contains('in-space')) return; // a real navigation is fine here
  event.preventDefault();
  showSpaceList();
});

// `message` is the optional away message; without one the tile just says Away.
function updateAwayOverlay(identity, on, message) {
  const tile = tiles.get(identity);
  if (!tile) return;
  tile.classList.toggle('tile-away', on);
  let overlay = tile.querySelector('.tile-away-overlay');
  if (on && !overlay) {
    overlay = document.createElement('div');
    overlay.className = 'tile-away-overlay';
    tile.appendChild(overlay);
  } else if (!on && overlay) {
    overlay.remove();
    return;
  }
  if (overlay) {
    const custom = typeof message === 'string' ? message.trim().slice(0, 200) : '';
    // Icon and AWAY on top; the message, if any, under them.
    overlay.textContent = '';
    const bubble = document.createElement('div');
    bubble.className = 'away-bubble';
    const head = document.createElement('div');
    head.className = 'away-head';
    const moon = document.createElement('i');
    moon.className = 'fa-solid fa-moon fa-fw'; // the same moon as the away button
    moon.setAttribute('aria-hidden', 'true');
    head.append(moon, ' Away');
    bubble.appendChild(head);
    if (custom) {
      const msg = document.createElement('div');
      msg.className = 'away-msg';
      msg.textContent = custom;
      bubble.appendChild(msg);
    }
    overlay.appendChild(bubble);
    overlay.classList.add('custom');
  }
}

// Away as everyone reads it, kept with me at the call service so that someone who joins, reloads or reconnects later
// sees it too: the "away" attribute, 'on' or 'off' (none, for a page before it, is 'off'), and "awayMessage", '' for a
// plain Away. setAttributes changes only the keys it is given, so these never touch "call", nor "call" these.
function awayAttributes() {
  return { away: isAway ? 'on' : 'off', awayMessage: isAway ? awayMessage : '' };
}
function awayAttributesChanged() {
  const said = call.localParticipant?.attributes || {};
  const want = awayAttributes();
  return (said.away === 'on' ? 'on' : 'off') !== want.away || (said.awayMessage || '') !== want.awayMessage;
}
async function syncAwayAttributes() {
  if (call.state !== 'connected' || !awayAttributesChanged()) return;
  await call.localParticipant.setAttributes(awayAttributes()).catch(() => {});
}
// "call" as inCall says, with away, after a reconnect that may have put the token's attributes back.
async function syncCallAttributes() {
  if (call.state !== 'connected') return;
  const want = inCall ? 'on' : 'off';
  if (call.localParticipant.attributes?.call === want && !awayAttributesChanged()) return;
  await call.localParticipant.setAttributes({ call: want, ...awayAttributes() }).catch(() => {});
}
// Someone's away mark on their tile, from their attributes; mine from my own state, since my attributes change only
// once the call service has them.
function showAway(participant) {
  if (participant.isLocal) return updateAwayOverlay(participant.identity, isAway, awayMessage);
  updateAwayOverlay(participant.identity, participant.attributes?.away === 'on', participant.attributes?.awayMessage || '');
}
// A camera that came on during a wait after going away (a click just before, Back and away again) goes off again, and
// comes back with Back.
async function keepCameraOffWhileAway() {
  if (!isAway || !call.localParticipant.isCameraEnabled) return;
  awayRestoreCam = true;
  await call.localParticipant.setCameraEnabled(false).catch(() => {});
}
// The same for the microphone: Back, then away again before the microphone was on.
async function keepMicOffWhileAway() {
  if (!isAway || !call.localParticipant.isMicrophoneEnabled) return;
  awayRestoreMic = true;
  await call.localParticipant.setMicrophoneEnabled(false).catch(() => {});
}

async function sendAway(on, message = '') {
  updateAwayOverlay(call.localParticipant?.identity, on, message);
  if (call.state !== 'connected') return;
  await syncAwayAttributes();
  // The "away" message too, for a page still on the build before the attribute. Kept for one release.
  try {
    await call.localParticipant.publishData(encoder.encode(JSON.stringify({ type: 'away', on, message })), { reliable: true, topic: 'away' });
  } catch (err) {
    // best-effort: not worth surfacing to the person who just wants their profile
  }
}

// Away means away: nobody should be hearing or seeing you while your tile
// says so. Set from two places -- opening your profile/Manage over the call
// (openOverlay/closeOverlay above), and the away-toggle button for marking
// yourself away on purpose. Whichever mic/camera were actually on get
// remembered and only those come back when away turns back off, so someone
// whose camera was already off before stepping away doesn't have it turned
// on for them. Away also stops you hearing everyone else (hearingOff), and while away
// nothing opens the microphone: not push to talk, not the mic button or its keys (toggleMic),
// not a join (startCall). The state itself is declared near inCall, at the top.
async function setAway(on, message = '') {
  if (on === isAway) return;
  isAway = on;
  applyHearing(); // straight away, before the waits for the microphone and camera
  awayMessage = on ? String(message || '').trim().slice(0, 200) : '';
  if (on) {
    awayRestoreMic = !!call.localParticipant.isMicrophoneEnabled;
    awayRestoreCam = !!call.localParticipant.isCameraEnabled;
    if (awayRestoreMic) await call.localParticipant.setMicrophoneEnabled(false).catch(() => {});
    if (awayRestoreCam) await call.localParticipant.setCameraEnabled(false).catch(() => {});
  } else {
    if (awayRestoreMic) await call.localParticipant.setMicrophoneEnabled(true).catch(() => {});
    await keepMicOffWhileAway();
    if (awayRestoreCam) await setCameraEnabledWithRetry(true).catch(() => {});
    // A camera change made while away (restartCamera), now that the camera is back on. A camera left off is not
    // opened just to take it: the change waits for the camera to be turned on (toggleCam).
    if (!isAway && awayRestartCam && call.localParticipant.isCameraEnabled) {
      awayRestartCam = false;
      await restartCamera();
    }
    await keepCameraOffWhileAway();
  }
  reflectMic();
  const camOn = call.localParticipant.isCameraEnabled;
  $('cam').classList.toggle('on', camOn);
  $('cam').classList.toggle('off', !camOn);
  updateCamera(call.localParticipant);
  $('away-toggle').classList.toggle('off', on);
  $('away-toggle').title = on ? 'Back: unpause your mic, camera and sound, and let everyone know' : 'Away: pauses your mic and camera, mutes what you hear, and lets everyone know';
  await sendAway(on, message);
}

// The away button asks for an optional message first; coming back is one click.
// Away set by opening your profile or the space list stays a plain "Away".
function closeAwayPrompt() {
  $('away-overlay').hidden = true;
}
$('away-toggle').addEventListener('click', () => {
  if (isAway) return setAway(false);
  $('away-message').value = '';
  $('away-overlay').hidden = false;
  $('away-message').focus();
});
$('away-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const message = $('away-message').value.trim();
  closeAwayPrompt();
  setAway(true, message);
});
$('away-cancel').addEventListener('click', closeAwayPrompt);
$('away-overlay').addEventListener('click', (event) => {
  if (event.target === $('away-overlay')) closeAwayPrompt();
});
$('away-message').addEventListener('keydown', (event) => {
  event.stopPropagation(); // typing here isn't a hotkey (M, V, C ...)
  if (event.key === 'Escape') closeAwayPrompt();
  if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) $('away-form').requestSubmit();
});

// --- start --------------------------------------------------------------------

// The mic/camera processing fields (not device selection -- that's kept
// local, per machine) also live on the account, set from the profile page
// or here; this reflects prefs into the settings-popover controls, called
// once from local defaults at startup and again once the account's own
// values come back from /api/me.
function populateCallSettingsUI() {
  $('gain').value = String(prefs.gain);
  $('gate').value = String(prefs.gate);
  $('gain-value').textContent = `${prefs.gain}%`;
  $('gate-value').textContent = prefs.gate ? `${prefs.gate}` : 'off';
  $('noise').checked = prefs.noise;
  $('echo').checked = prefs.echo;
  $('agc').checked = prefs.agc;
  $('talk-mode').value = prefs.ptt ? 'ptt' : 'open';
  $('quality').value = String(prefs.quality);
  $('mirror').checked = prefs.mirror;
  $('background-mode').value = prefs.background;
  $('master-volume').value = String(prefs.masterVolume);
  $('volume-value').textContent = `${prefs.masterVolume}%`;
  $('mic').classList.toggle('ptt', prefs.ptt);
}

// Manage > Settings' call-feature toggles: hides what's turned off and
// caps the quality picker at whatever the admin set as the ceiling. Run
// once branding is in hand (init()), since these come from the server.
function applyFeatureFlags() {
  $('screen-share').hidden = !(features.allowScreenShare && canDo('shareScreen') && navigator.mediaDevices?.getDisplayMedia);
  $('react-toggle').hidden = !(features.allowReactions && canDo('react'));
  const select = $('quality');
  for (const opt of select.options) opt.hidden = Number(opt.value) > features.maxQuality;
  if (prefs.quality > features.maxQuality) {
    prefs.quality = features.maxQuality;
    savePrefs();
  }
  select.value = String(prefs.quality);
}

async function init() {
  const branding = await loadBranding();
  registerWordTools();
  spaceName = branding.environmentName || spaceName;
  features = {
    maxQuality: branding.maxQuality || 720,
    allowScreenShare: branding.allowScreenShare !== false,
    allowAsides: branding.allowAsides !== false,
    allowPrivate: branding.allowPrivate !== false,
    allowReactions: branding.allowReactions !== false,
    conferenceEnabled: branding.conferenceEnabled !== false,
  };
  applyFeatureFlags();
  // The topbar dropped its own version readout -- too cramped alongside
  // everything else there. It's in the title bar instead, which reads as
  // the space's real native window title once installed as an app.
  if (branding.version) document.title += ` — ${branding.version}`;
  renderReactionTray(branding.reactions);
  updateCrumb();
  syncLayoutPick();
  populateCallSettingsUI();
  applyLayout();

  if (guestToken) {
    // No account: no whoami (and so no Sign out), no Manage, no Guests section (that
    // needs a real session too) -- just the name field and, past that,
    // everything the space itself already handles the same for everyone.
    $('join').hidden = true;
    $('whoami-link').hidden = true;
    $('spaces-link').hidden = true;
    $('guest-section').hidden = true;
    $('settings-links').hidden = true;
    try {
      const info = await api('GET', `/api/guest-link/${encodeURIComponent(guestToken)}`);
      $('guest-space-name').textContent = `${verb('enter')} ${info.spaceName}`;
      $('guest-join').hidden = false;
      $('guest-join').dataset.spaceId = info.spaceId;
      $('guest-join').dataset.spaceName = info.spaceName;
    } catch (err) {
      $('guest-space-name').textContent = 'This link is off';
      $('guest-join-error').textContent = err.message;
      $('guest-join-error').hidden = false;
      $('guest-join').hidden = false;
      $('guest-join').querySelector('button[type="submit"]').hidden = true;
      $('guest-name').hidden = true;
    }
    return;
  }

  try {
    const info = await api('GET', '/api/me');
    me = info.user;
    offerInstall();
    $('whoami').textContent = me.displayName;
    $('whoami-img').src = `/img/${encodeURIComponent(me.key)}/profile?v=${Date.now()}`;
    $('whoami-img').hidden = false;
    $('admin-link').hidden = !hasOwnerRights(me);
    $('admin-link-2').hidden = !hasOwnerRights(me);
    // The account's own mic/camera processing settings take over from
    // whatever this browser had locally, so joining from anywhere lands
    // already set up the way the account is configured.
    if (me.callPrefs) {
      Object.assign(prefs, me.callPrefs);
      savePrefs();
      // Re-clamp: the account's own stored quality could predate whatever
      // the server's maxQuality cap is set to now.
      applyPermissions();
      populateCallSettingsUI();
    }
    loadPresence(); // the join screen's member grid; it does not hold the page when LiveKit is slow
  } catch (err) {
    location.href = '/login';
    return;
  }
  // Following an invitation from another page: "/#join=<space>" goes straight into that space.
  const invited = /^#join=([a-z0-9]{4,16})$/.exec(location.hash);
  if (invited) {
    history.replaceState(null, '', location.pathname + location.search);
    joinInvitedSpace(invited[1]);
  } else if (!guestToken && rememberedSpace()) {
    // A reload: back into the space this tab was in. Joining checks it is still there; presence
    // does not have to have answered first.
    join(rememberedSpace());
  }
}
init();
