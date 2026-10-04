// Your own profile: change your own photo, see everything else your admin
// set. An admin visiting /profile/<key> gets the same page in edit mode
// for that person instead -- the one place any of a user's settings are
// changed, rather than a flat table of everyone on the Manage page.
import { renderModuleSettings } from '/module-settings.js';
import { pickBackground } from '/background-picker.js';
import '/slot-paste.js'; // paste a picture into any image slot
import { loadBranding, api, wireOverlayBack, renderTopbar, renderPageBar, hasOwnerRights, isAdminAccount, roleLabel, word, applyWords, maskPassword } from '/brand.js';
import { formatHotkey, comboFromEvent } from '/hotkeys.js';
import { mountEnrolment, mountDisable } from '/mfa-enrol.js';

const $ = (id) => document.getElementById(id);
const editingKey = decodeURIComponent(location.pathname.split('/')[2] || '') || null;
let me = null; // the signed-in owner or admin, when editing someone: only used to tell their own account apart
let user = null; // whose profile this is: me, or the person being edited
let mfaRequired = false; // the environment requires a second factor of the signed-in person (their own profile only)
let mfaOffered = true; // the server offers two-step sign-in at all (ENABLE_MFA)
let mfaBypass = false; // the server's admin lockout bypass applies to the signed-in person: no code asked, own reset offered
let spacesById = new Map(); // every real space (not the Lobby), for the per-space sections below
let environmentName = ''; // the environment's own name, for the calendar feed's hint
let feed = null; // your own calendar feed, from GET /api/me/feed: { allowed, on, made, readAt }
let feedUrl = ''; // the address just made: answered once by the server, kept only until the page is left
let feedsAllowed = false; // an owner editing someone: whether the environment allows calendar feeds (settings.calendarFeeds)
let external = null; // your own other calendars, from GET /api/me/external-calendars: { allowed, calendars: [{ id, name, host, readAt, error }] }
let externalBusy = false; // a calendar is being read for Add (up to 15 seconds)

// If this page is open as the overlay on top of an active call (same
// pattern as closeProfileOverlay -- see brand.js/space.js), and it's my own
// settings rather than an admin editing someone else's, tell the running
// call to pick up the change now instead of waiting for a camera toggle.
function notifyLiveCallPrefs(patch) {
  if (editingKey || window.parent === window) return;
  window.parent.appApplyCallPrefs?.(patch)?.catch?.(() => {});
}

function say(text, error = false) {
  $('status').textContent = text;
  $('status').classList.toggle('error', error);
}

function sayField(el, text, error = false) {
  el.textContent = text;
  el.classList.toggle('error', error);
  if (text && !error) setTimeout(() => el.textContent === text && (el.textContent = ''), 3000);
}

async function copy(text, statusEl) {
  try {
    await navigator.clipboard.writeText(text);
    sayField(statusEl, 'copied');
  } catch (err) {
    window.prompt('Copy this:', text);
  }
}

function imgUrl(slot) {
  return `/img/${encodeURIComponent(user.key)}/${slot}?v=${Date.now()}`;
}

async function reload() {
  if (editingKey) {
    user = (await api('GET', `/api/users/${editingKey}`)).user;
  } else {
    const res = await api('GET', '/api/me');
    user = res.user;
    mfaRequired = Boolean(res.mfaRequired);
    mfaOffered = res.mfaOffered !== false;
    mfaBypass = Boolean(res.mfaBypass);
  }
}

// An admin editing someone can change anything; on your own profile it's
// whatever your role's Images permissions allow (Manage > Roles).
const canImg = (slot) => !!editingKey || !!user.permissions?.[`image_${slot}`];
const canSpaceImages = () => !!editingKey || Object.entries(user.permissions || {}).some(([k, v]) => v && k.startsWith('image_') && k !== 'image_profile' && k !== 'image_background');
const imgApi = (slot, spaceId) => editingKey
  ? `/api/users/${user.key}${spaceId ? `/spaces/${spaceId}` : ''}/images/${slot}`
  : `/api/me${spaceId ? `/spaces/${spaceId}` : ''}/images/${slot}`;

function render() {
  const editing = !!editingKey;
  $('portrait-slot').querySelector('.slot-pick').classList.toggle('still', !canImg('profile'));
  $('background-slot').querySelector('.slot-pick').classList.toggle('still', !canImg('background'));

  const has = !!user.images.profile;
  $('portrait').src = imgUrl('profile'); // the server draws initials when unset
  $('portrait-slot').classList.toggle('set', has);
  $('portrait-clear').hidden = !has || !canImg('profile'); // nothing on an account is off-limits to an admin, this included
  document.querySelector('#portrait-slot .unset').hidden = true;
  $('whoami-img').src = `/img/${encodeURIComponent(me ? me.key : user.key)}/profile?v=${Date.now()}`;
  $('whoami-img').hidden = false;
  $('whoami').textContent = me ? me.displayName : user.displayName;
  $('name').textContent = user.displayName;

  const hasBg = !!user.images.background;
  $('background').hidden = !hasBg;
  if (hasBg) $('background').src = imgUrl('background');
  $('background-slot').querySelector('.unset').hidden = hasBg;
  $('background-clear').hidden = !hasBg || !canImg('background');
  $('background-hint').textContent = editing
    ? `Shown behind ${user.displayName}'s portrait when their camera is off, and used as their real call background too if Background Style below is set to Image Background. Unset shows the plain color instead.`
    : 'Shown behind your portrait when your camera is off, and used as your real call background too if Background Style below is set to Image Background. Leave it unset to use the plain color instead.';

  // Someone's own mic and camera setup, not an admin's to adjust for them --
  // only shown on your own profile.
  $('section-call').hidden = editing;
  $('call-prefs-hint').textContent = 'Your own mic and camera settings, applied automatically wherever you join a call from. Which device to use is separate -- that stays on this device, in the call itself.';
  if (!document.activeElement?.id?.startsWith('cp-')) {
    const cp = user.callPrefs;
    $('cp-gain').value = String(cp.gain);
    $('cp-gain-value').textContent = `${cp.gain}%`;
    $('cp-gate').value = String(cp.gate);
    $('cp-gate-value').textContent = cp.gate ? `${cp.gate}` : 'off';
    $('cp-noise').checked = cp.noise;
    $('cp-echo').checked = cp.echo;
    $('cp-agc').checked = cp.agc;
    $('cp-talk-mode').value = cp.ptt ? 'ptt' : 'open';
    $('cp-quality').value = String(cp.quality);
    $('cp-mirror').checked = cp.mirror;
    $('cp-background').value = cp.background;
    $('cp-master-volume').value = String(cp.masterVolume);
    $('cp-volume-value').textContent = `${cp.masterVolume}%`;
    $('cp-mute-key').textContent = formatHotkey(cp.muteKey);
    $('cp-ptt-key').textContent = formatHotkey(cp.pttKey);
    $('cp-cam-key').textContent = formatHotkey(cp.camKey);
  }

  $('portrait-hint').textContent = editing
    ? `${user.displayName}'s own photo: it shows next to their name in the header and on their tile in the call. Click it to change it, or paste a picture -- it is not the picture used in the recording, that's below.`
    : 'Your own photo: it shows next to your name in the header and on your tile in the call. Click it to change it, or paste a picture; square images look best. It is not the picture used in the recording; that one is set in Manage.';

  // Account: read-only facts normally, editable fields for an owner. Same
  // boxed layout either way (see .facts/.fact in style.css) -- only
  // whether a box holds plain text or an input changes.
  $('account-facts').hidden = editing;
  $('account-fields').hidden = !editing;
  $('account-save-row').hidden = !editing;
  $('account-hint').hidden = editing;
  // The admin (the server's, or the host admin's stand-in) signs in with what the server or the host console holds:
  // its role, username, password and personal link are not changed here, and the server refuses them.
  const fixed = isAdminAccount(user);
  if (!editing) {
    $('f-name').textContent = user.displayName;
    $('f-login').textContent = user.login;
    $('f-role').textContent = fixed ? `${roleLabel(user)}: runs this server` : hasOwnerRights(user) ? `${word('owner', { cap: true })}: runs the ${word('environment')}` : word('member', { cap: true });
    $('f-password').textContent = user.hostAdmin ? 'Set on the host console.'
      : fixed ? "Set in the server's configuration."
        : user.hasPassword ? 'Set. Change it in Manage.' : 'None. You sign in with your personal link.';
  } else if (document.activeElement?.closest?.('#account-fields') == null) {
    $('e-name').value = user.displayName;
    $('e-login').value = user.login;
    // Admin is not a role anyone is given: it shows as it is (Admin, or Host admin for the stand-in), locked.
    const roleSelect = $('e-role');
    roleSelect.querySelector('option[data-fixed]')?.remove();
    if (fixed) {
      const opt = new Option(roleLabel(user), user.role);
      opt.dataset.fixed = '';
      roleSelect.add(opt);
    }
    roleSelect.value = user.role;
    roleSelect.disabled = fixed;
    $('e-role-note').hidden = !fixed;
    $('e-role-note').textContent = user.hostAdmin
      ? "The host admin's own account. It signs in through the host console, so its role and sign-in can't be changed here."
      : "The server's admin. It signs in with the settings in the server's configuration, so its role and sign-in can't be changed here.";
    // You can't make yourself a member here -- the disabled option says enough.
    const self = me && user.key === me.key;
    roleSelect.querySelector('option[value="member"]').disabled = self;
    $('e-login').disabled = fixed;
    $('e-password').closest('label').hidden = fixed;
    $('account-clear-password').hidden = fixed || !user.hasPassword;
  }
  renderMfa(editing);
  // Seeing and copying your own link isn't an editing action -- only
  // creating, regenerating or turning it off is.
  $('link-value').textContent = user.link || 'off';
  $('link-value').classList.toggle('dim', !user.link);
  $('link-copy').hidden = !user.link;
  $('link-edit-actions').hidden = !editing || fixed;
  if (editing) {
    $('link-off').hidden = !user.link;
    $('link-new').textContent = user.link ? 'Regenerate' : 'Create';
  }

  $('images-heading').textContent = editing ? 'Default Profile Images' : 'Your Default Profile Images';
  $('player-images-hint').textContent = editing
    ? "The participant's video box. Offline shows the Offline picture (or nothing). Online shows the camera, or the Online picture when the camera is off. Talking and muted lay their pictures on top, and draw the borders set under Settings."
    : 'Your video box. Offline shows the Offline picture (or nothing). Online shows your camera, or the Online picture when your camera is off. Talking and muted lay their pictures on top, and draw the borders set under Settings.';
  $('character-images-hint').textContent = editing
    ? 'A second box for OBS. Offline shows the Offline picture, Online the character picture, with Talking and Muted laid on top while they speak or while their microphone is off. Any picture left unset is transparent, so with no Online picture the box can sit over a character bar.'
    : 'A second box for OBS. Offline shows the Offline picture, Online the character picture, with Talking and Muted laid on top while you speak or while your microphone is off. Any picture left unset is transparent, so with no Online picture the box can sit over a character bar.';
  for (const slot of document.querySelectorAll('#other-images .slot')) {
    const name = slot.dataset.slot;
    const set = !!user.images[name];
    const img = slot.querySelector('img');
    img.hidden = !set;
    if (set) img.src = imgUrl(name);
    slot.querySelector('.unset').hidden = set;
    slot.classList.toggle('set', set);
    slot.querySelector('.slot-pick').classList.toggle('still', !canImg(name));
    slot.querySelector('[data-action="slot-clear"]').hidden = !canImg(name) || !set;
  }

  renderFeed(editing);
  renderExternal(editing);

  $('danger-row').hidden = !editing;
  if (editing) {
    const self = me && user.key === me.key;
    $('delete-btn').hidden = self || (fixed && !user.hostAdmin); // the server's admin can't be removed here
  }

  renderSpaceSections();
}

// --- per-space images -------------------------------------------------------
// One section per real space this person belongs to (never the Lobby --
// per-space images are for spaces an admin actually picked them into). A
// space's profile decides which of the two groups it even offers; an unset
// slot here simply uses the Default Profile Images above, so someone in
// two campaigns can give each its own Character images without the other
// campaign's set ever needing to be touched.

function buildSpaceSection(spaceId) {
  const section = $('space-section-template').content.firstElementChild.cloneNode(true);
  applyWords(section); // the template's data-fill, in this environment's words
  section.id = `section-space-${spaceId}`;
  section.dataset.space = spaceId;
  $('space-sections').appendChild(section);
  return section;
}

function fillSpaceSection(section, space, spaceImages) {
  const editing = !!editingKey;
  section.querySelector('.space-section-title').textContent = space.name;
  const token = section.querySelector('.space-token');
  token.hidden = !space.hasImage;
  if (space.hasImage && token.dataset.for !== `${space.id}`) {
    token.dataset.for = space.id;
    token.src = `/img/space/${encodeURIComponent(space.id)}?v=${Date.now()}`;
  }
  section.querySelector('[data-action="space-remove"]').hidden = !editing;

  // Only an owner or the admin sets any of this, same as the images themselves.
  const perms = spaceImages.permissions || {};
  for (const box of section.querySelectorAll('[data-permission]')) {
    box.checked = !!perms[box.dataset.permission];
    box.disabled = !editing || hasOwnerRights(user);
  }
  section.querySelector('[data-permissions-hint]').textContent = hasOwnerRights(user)
    ? `${user.hostAdmin ? 'The host admin' : isAdminAccount(user) ? 'The admin' : word('owner', { many: true, cap: true })} can always do all of this, in every ${word('space')}.`
    : editing
      ? `${word('moderator', { cap: true })} makes ${user.displayName} ${word('moderator', { a: true })} in ${space.name} only -- they get everything the ${word('moderator', { cap: true })} role has (Manage > Roles) here, and nothing extra elsewhere.`
      : `Set in Manage. ${word('moderator', { cap: true })} gives you the ${word('moderator', { cap: true })} role's permissions in ${space.name} only.`;
  const useDefault = spaceImages.useDefaultImages !== false;
  const useBox = section.querySelector('[data-use-default]');
  useBox.checked = useDefault;
  useBox.disabled = !canSpaceImages();
  section.querySelector('[data-space-images]').hidden = useDefault;
  section.querySelector('.space-section-hint').textContent = editing
    ? `${user.displayName}'s images just for ${space.name}. Anything left unset here uses the Default Profile Images above.`
    : `Your images just for ${space.name}. Anything left unset here uses your Default Profile Images above.`;

  section.querySelector('[data-group="participant"]').hidden = false;
  section.querySelector('[data-group="character"]').hidden = false;

  for (const slot of section.querySelectorAll('.slot')) {
    const name = slot.dataset.slot;
    const hasOwn = !!spaceImages.images[name];
    const hasEffective = hasOwn || !!user.images[name];
    const img = slot.querySelector('img');
    img.hidden = !hasEffective;
    if (hasEffective) img.src = `/img/${encodeURIComponent(user.key)}/${name}?space=${encodeURIComponent(space.id)}&v=${Date.now()}`;
    slot.querySelector('.unset').hidden = hasEffective;
    slot.classList.toggle('set', hasOwn);
    slot.querySelector('.slot-pick').classList.toggle('still', !canImg(name));
    slot.querySelector('[data-action="slot-clear"]').hidden = !canImg(name) || !hasOwn;
  }
}

function renderSpaceSections() {
  const userSpaces = user.spaces || {};
  const keep = new Set(Object.keys(userSpaces));
  for (const [spaceId, spaceImages] of Object.entries(userSpaces)) {
    const space = spacesById.get(spaceId);
    if (!space) continue; // a space we don't know about yet (shouldn't happen); skip rather than crash
    const section = $(`section-space-${spaceId}`) || buildSpaceSection(spaceId);
    fillSpaceSection(section, space, spaceImages);
  }
  for (const section of [...$('space-sections').children]) {
    if (keep.has(section.dataset.space)) continue;
    section.remove();
  }
}

$('space-sections').addEventListener('change', (event) => {
  const changedId = event.target.closest('.space-section')?.dataset.space;
  if (changedId && ((editingKey && event.target.dataset.permission) || event.target.hasAttribute('data-use-default'))) {
    const patch = event.target.dataset.permission
      ? { permissions: { [event.target.dataset.permission]: event.target.checked } }
      : { useDefaultImages: event.target.checked };
    run(async () => {
      user = (await api('PATCH', editingKey ? `/api/users/${user.key}/spaces/${changedId}` : `/api/me/spaces/${changedId}`, patch)).user;
      render();
    });
    return;
  }
  if (event.target.type !== 'file') return;
  const spaceId = event.target.closest('.space-section').dataset.space;
  const slot = event.target.closest('.slot').dataset.slot;
  if (!canImg(slot)) return;
  const file = event.target.files[0];
  event.target.value = '';
  if (!file) return;
  run(async () => {
    say(`uploading ${slot}...`);
    user = (await api('PUT', imgApi(slot, spaceId), file, file.type)).user;
    render();
    say('image saved');
  });
});
$('space-sections').addEventListener('click', (event) => {
  const remove = event.target.closest('[data-action="space-remove"]');
  if (remove && editingKey) {
    const section = remove.closest('.space-section');
    const name = section.querySelector('.space-section-title').textContent;
    if (!window.confirm(`Remove ${user.displayName} from ${name}? They can be added back on the ${word('space')}'s ${word('member', { many: true, cap: true })} tab.`)) return;
    run(async () => {
      user = (await api('DELETE', `/api/spaces/${section.dataset.space}/members/${user.key}`)).user;
      render();
    });
    return;
  }
  const button = event.target.closest('[data-action="slot-clear"]');
  if (!button) return;
  const spaceId = button.closest('.space-section').dataset.space;
  const slot = button.closest('.slot').dataset.slot;
  if (!canImg(slot)) return;
  run(async () => {
    user = (await api('DELETE', imgApi(slot, spaceId))).user;
    render();
  });
});

// --- portrait: self-service, or an admin overriding it for someone else ----
// Nothing on a user's account is admin-proof, this photo included -- an
// admin editing someone else's profile can replace or clear it exactly like
// their own, via the same per-user image route every other slot already uses.

$('portrait-file').addEventListener('change', async () => {
  const file = $('portrait-file').files[0];
  if (!file) return;
  try {
    say('uploading...');
    if (editingKey) user = (await api('PUT', `/api/users/${user.key}/images/profile`, file, file.type)).user;
    else { await api('PUT', '/api/me/images/profile', file, file.type); await reload(); }
    render();
    say('image saved');
  } catch (err) {
    say(err.message, true);
  }
  $('portrait-file').value = '';
});

$('portrait-clear').addEventListener('click', async () => {
  try {
    if (editingKey) user = (await api('DELETE', `/api/users/${user.key}/images/profile`)).user;
    else { await api('DELETE', '/api/me/images/profile'); await reload(); }
    render();
    say('image removed');
  } catch (err) {
    say(err.message, true);
  }
});

// A background from a file the person chose or a pre-made one from the library.
async function saveBackground(file) {
  try {
    say('uploading...');
    if (editingKey) user = (await api('PUT', `/api/users/${user.key}/images/background`, file, file.type)).user;
    else { await api('PUT', '/api/me/images/background', file, file.type); await reload(); }
    render();
    notifyLiveCallPrefs();
    say('image saved');
  } catch (err) {
    say(err.message, true);
  }
}
$('background-file').addEventListener('change', async () => {
  const file = $('background-file').files[0];
  if (!file) return;
  await saveBackground(file);
  $('background-file').value = '';
});
$('background-library').addEventListener('click', async () => {
  const file = await pickBackground({ title: editingKey ? 'Choose their background' : 'Choose your background' });
  if (file) await saveBackground(file);
});

$('background-clear').addEventListener('click', async () => {
  try {
    if (editingKey) user = (await api('DELETE', `/api/users/${user.key}/images/background`)).user;
    else { await api('DELETE', '/api/me/images/background'); await reload(); }
    render();
    notifyLiveCallPrefs();
    say('image removed');
  } catch (err) {
    say(err.message, true);
  }
});

// --- call settings: mic/camera processing, applied wherever this account
// joins a call from. Saves as you change it, debounced (and accumulated
// across fields) so dragging a slider doesn't fire a request per tick.

let pendingCallPrefs = {};
let callPrefsTimer = 0;
function patchCallPrefs(patch) {
  Object.assign(pendingCallPrefs, patch);
  clearTimeout(callPrefsTimer);
  callPrefsTimer = setTimeout(async () => {
    const body = pendingCallPrefs;
    pendingCallPrefs = {};
    try {
      if (editingKey) user.callPrefs = (await api('PATCH', `/api/users/${user.key}/call-prefs`, body)).callPrefs;
      else user.callPrefs = (await api('PATCH', '/api/me/call-prefs', body)).callPrefs;
      notifyLiveCallPrefs(body);
      sayField($('call-prefs-status'), 'saved');
    } catch (err) {
      sayField($('call-prefs-status'), err.message, true);
    }
  }, 500);
}
$('cp-gain').addEventListener('input', (e) => {
  $('cp-gain-value').textContent = `${e.target.value}%`;
  patchCallPrefs({ gain: Number(e.target.value) });
});
$('cp-gate').addEventListener('input', (e) => {
  $('cp-gate-value').textContent = e.target.value !== '0' ? e.target.value : 'off';
  patchCallPrefs({ gate: Number(e.target.value) });
});
for (const id of ['noise', 'echo', 'agc', 'mirror']) {
  $(`cp-${id}`).addEventListener('change', (e) => patchCallPrefs({ [id]: e.target.checked }));
}
$('cp-talk-mode').addEventListener('change', (e) => patchCallPrefs({ ptt: e.target.value === 'ptt' }));
$('cp-quality').addEventListener('change', (e) => patchCallPrefs({ quality: Number(e.target.value) }));
$('cp-background').addEventListener('change', (e) => patchCallPrefs({ background: e.target.value }));
$('cp-master-volume').addEventListener('input', (e) => {
  $('cp-volume-value').textContent = `${e.target.value}%`;
  patchCallPrefs({ masterVolume: Number(e.target.value) });
});

// --- hotkeys: click a button, then press the combo you want -------------
// Escape or clicking away cancels without changing anything; any other key
// (with or without modifiers) is captured as soon as it lands, since a
// bare modifier alone isn't a usable combo yet.

function startHotkeyCapture(btn, prefKey) {
  btn.textContent = 'Press a key…';
  btn.classList.add('recording');
  const onKeyDown = (event) => {
    event.preventDefault();
    event.stopPropagation();
    if (event.key === 'Escape') { stop(); return; }
    const combo = comboFromEvent(event);
    if (!combo) return; // only a modifier so far -- keep waiting
    user.callPrefs[prefKey] = combo;
    patchCallPrefs({ [prefKey]: combo });
    stop();
  };
  const onBlur = () => stop();
  function stop() {
    document.removeEventListener('keydown', onKeyDown, true);
    btn.removeEventListener('blur', onBlur);
    btn.classList.remove('recording');
    btn.textContent = formatHotkey(user.callPrefs[prefKey]);
  }
  document.addEventListener('keydown', onKeyDown, true);
  btn.addEventListener('blur', onBlur);
  btn.focus();
}
for (const [id, prefKey] of [['cp-mute-key', 'muteKey'], ['cp-ptt-key', 'pttKey'], ['cp-cam-key', 'camKey']]) {
  $(id).addEventListener('click', () => startHotkeyCapture($(id), prefKey));
}

// --- calendar feed (plan-google-calendar.md, Part 1) ----------------------
// A private address a calendar app (Google, Apple, Outlook) reads to show the events this person can see. The server
// keeps only its hash, so the address is shown once, right after it is made; a lost one is replaced with a new one.
// An owner looking at someone sees whether they have one, and can turn it off, never the address.

// "3 hours ago", "yesterday", or a date for anything older than a week.
function timeAgo(iso) {
  const then = Date.parse(iso);
  if (!Number.isFinite(then)) return '';
  const minutes = Math.round((Date.now() - then) / 60000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? '' : 's'} ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? '' : 's'} ago`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days} days ago`;
  return `on ${dayOf(iso)}`;
}
const dayOf = (iso) => new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
const readWhen = (readAt) => (readAt ? `last read ${timeAgo(readAt)}` : 'not read yet');
const lastRead = (readAt) => { const t = readWhen(readAt); return `${t[0].toUpperCase()}${t.slice(1)}.`; };

function renderFeed(editing) {
  // Someone else's, for an owner: on or off and when it was last read, with Turn off.
  const theirs = user.calendarFeed || { on: false };
  $('feed-row').hidden = !editing || !(feedsAllowed || theirs.on);
  if (editing) {
    $('feed-row-state').textContent = theirs.on ? 'on' : 'off';
    $('feed-row-state').classList.toggle('on', theirs.on);
    $('feed-row-read').textContent = theirs.on ? readWhen(theirs.readAt) : '';
    $('feed-row-off').hidden = !theirs.on;
  }

  // Your own: shown when you may make one, or while you still have one.
  const section = $('section-feed');
  section.hidden = editing || !feed || !(feed.allowed || feed.on);
  if (section.hidden) return;
  const place = environmentName || `this ${word('environment')}`;
  $('feed-hint').textContent = `Add your events from ${place} to Google Calendar, Apple Calendar or Outlook. Anyone with the address can see them, so keep it private.`;
  const state = $('feed-state');
  state.hidden = !feed.on;
  state.textContent = !feed.on ? ''
    : feed.allowed ? `On, made ${dayOf(feed.made)}. ${lastRead(feed.readAt)}`
      : `Private addresses are off in ${place} for now, so this address does not work. ${lastRead(feed.readAt)}`;
  $('feed-made').hidden = !(feed.on && feedUrl);
  $('feed-url').textContent = feedUrl;
  $('feed-make').hidden = feed.on || !feed.allowed;
  $('feed-new').hidden = !feed.on || !feed.allowed;
  $('feed-off').hidden = !feed.on;
}

async function loadFeed() {
  if (editingKey) {
    // Whether the environment allows feeds decides if an owner sees the row for someone without one.
    try { feedsAllowed = (await api('GET', '/api/settings')).settings?.calendarFeeds === true; } catch { feedsAllowed = false; }
    return;
  }
  const seq = ++feedSeq;
  try {
    const got = await api('GET', '/api/me/feed');
    if (seq !== feedSeq) return false;
    // The address shown once is shown only while it is still the one in use (not turned off or replaced elsewhere).
    if (feedUrl && !(got.on && feed && got.made === feed.made)) feedUrl = '';
    feed = got;
    return true;
  } catch {
    return false; // a later read that fails keeps what was shown; a first one shows no section, as before
  }
}
// As Other calendars below: the owner's switch (Private addresses) is flipped on Calendar's Configure page, in another tab
// or in this one and then Back, so read again whenever the page shows again; one read at a time, and an answer older
// than what is shown (a read or a change made here came since) is dropped.
let feedSeq = 0;
let feedReading = false;
function refreshFeed() {
  if (editingKey || !feed || feedReading || document.visibilityState !== 'visible') return;
  feedReading = true;
  loadFeed().then((fresh) => {
    if (!fresh) return;
    const section = $('section-feed');
    const had = section.contains(document.activeElement) ? document.activeElement : null;
    renderFeed(false);
    // Focus on a button this answer hid goes to the section's first button still shown.
    if (had && had.closest('[hidden]')) section.querySelector('.row button:not([hidden])')?.focus();
  }).finally(() => { feedReading = false; });
}
document.addEventListener('visibilitychange', refreshFeed);
window.addEventListener('pageshow', (event) => { if (event.persisted) refreshFeed(); });

async function makeFeed() {
  const made = await api('POST', '/api/me/feed', {});
  feedSeq += 1; // a read in flight is older than this
  feedUrl = made.url;
  feed = { ...feed, on: true, made: made.made, readAt: null };
  render();
  $('feed-copy').focus();
}
$('feed-make').addEventListener('click', () => run(async () => {
  await makeFeed();
  sayField($('feed-status'), 'address made');
}, $('feed-status')));
$('feed-new').addEventListener('click', () => run(async () => {
  if (!window.confirm('Make a new address? The old address stops working. Add the new one in Google again.')) return;
  await makeFeed();
  sayField($('feed-status'), 'new address made');
}, $('feed-status')));
$('feed-off').addEventListener('click', () => run(async () => {
  if (!window.confirm('Turn off your calendar feed? The address stops working, and your calendar app stops getting new events.')) return;
  await api('DELETE', '/api/me/feed');
  feedUrl = '';
  feed = { ...feed, on: false }; // until the read below says more
  await loadFeed();
  render();
  sayField($('feed-status'), 'calendar feed turned off');
}, $('feed-status')));
$('feed-copy').addEventListener('click', () => copy(feedUrl, $('feed-status')));
$('feed-row-off').addEventListener('click', () => run(async () => {
  if (!window.confirm(`Turn off ${user.displayName}'s calendar feed? Their address stops working. They can make a new one.`)) return;
  await api('DELETE', `/api/users/${user.key}/feed`);
  await reload();
  render();
  sayField($('account-status'), 'calendar feed turned off');
}, $('account-status')));

// --- other calendars (plan-google-calendar.md, Part 2) ----------------------
// Your own calendars elsewhere (Google's, say), added by their private address: their events show in the calendar, read
// only and only to you. The server keeps the address sealed and never answers it again, so a row shows its host only.
// Shown while the environment allows them, while you still have some (to remove them when it no longer does), and while
// the server says why they can't be used here (`why`: the switch, or the module to approve, turn on, update or install).
// When it can't be used it always says why: never just its title.
const MAX_EXTERNAL = 5;
let externalSeq = 0; // counts reads and changes made here: an answer whose number is no longer the latest is older than what is shown
let externalReading = false; // a read on coming back to the page is in flight
const externalRows = new Map(); // calendar id -> its row's parts, kept across draws so focus and a row's status stay
const rowReading = new Set(); // calendars whose Refresh is running

// Why something failed, in plain words: the server's own sentence when it sent one, never the browser's ("Failed to fetch").
function failure(err) {
  if (err && err.serverSaid) return err.message;
  if (err && err.status) return `the server answered ${err.status}`;
  if (!err || err instanceof TypeError) return 'the server didn\'t answer';
  return err.message;
}

// One calendar's row, made once; externalFill() writes what it says.
function externalRow(id) {
  const row = document.createElement('li');
  row.className = 'external-row';
  row.dataset.id = id;
  const what = document.createElement('div');
  what.className = 'external-what';
  const name = document.createElement('strong');
  const host = document.createElement('span');
  host.className = 'hint';
  const state = document.createElement('span');
  what.append(name, host, state);
  const actions = document.createElement('div');
  actions.className = 'row external-actions';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'btn btn-small btn-danger';
  remove.dataset.remove = id;
  remove.textContent = 'Remove';
  actions.append(remove);
  const status = document.createElement('span');
  status.className = 'status external-row-status';
  status.setAttribute('role', 'status');
  row.append(what, actions, status);
  return { row, name, host, state, actions, refresh: null, remove, status };
}
// Writes a row's words, touching only what changed.
function externalFill(parts, c) {
  const put = (el, prop, value) => { if (el[prop] !== value) el[prop] = value; };
  put(parts.name, 'textContent', c.name);
  put(parts.host, 'textContent', c.host || 'address unreadable');
  put(parts.state, 'className', c.error ? 'external-state error' : 'external-state hint');
  put(parts.state, 'textContent', c.error || (c.readAt ? `Read ${timeAgo(c.readAt)}` : 'Not read yet'));
  parts.remove.setAttribute('aria-label', `Remove ${c.name}`);
  if (external.allowed && !parts.refresh) {
    const refresh = document.createElement('button');
    refresh.type = 'button';
    refresh.className = 'btn btn-small';
    refresh.dataset.refresh = c.id;
    refresh.textContent = 'Refresh';
    parts.actions.insertBefore(refresh, parts.remove);
    parts.refresh = refresh;
  } else if (!external.allowed && parts.refresh) {
    const had = document.activeElement === parts.refresh;
    parts.refresh.remove();
    parts.refresh = null;
    if (had) parts.remove.focus();
  }
  if (parts.refresh) {
    parts.refresh.setAttribute('aria-label', `Refresh ${c.name}`);
    put(parts.refresh, 'disabled', rowReading.has(c.id));
  }
}

function renderExternal(editing) {
  const section = $('section-external');
  const calendars = (external && external.calendars) || [];
  section.hidden = editing || !external || !(external.allowed || calendars.length || external.why);
  if (section.hidden) return;
  const place = environmentName || `this ${word('environment')}`;
  $('external-hint').textContent = `See the events of your own calendars, such as Google Calendar, beside the ones in ${place}. Only you see them.`;
  $('external-off').hidden = external.allowed;
  $('external-off').textContent = external.allowed ? ''
    : [external.why || `Other calendars are off in ${place} for now.`, calendars.length ? 'Until then their events do not show. You can still remove them.' : ''].filter(Boolean).join(' ');
  const list = $('external-list');
  list.hidden = !calendars.length;
  // Each calendar keeps its row: only what changed is written, and a row moves only when its place changed.
  const gone = new Set(externalRows.keys());
  calendars.forEach((c, i) => {
    gone.delete(c.id);
    if (!externalRows.has(c.id)) externalRows.set(c.id, externalRow(c.id));
    const parts = externalRows.get(c.id);
    externalFill(parts, c);
    if (list.children[i] !== parts.row) list.insertBefore(parts.row, list.children[i] || null);
  });
  for (const id of gone) {
    externalRows.get(id).row.remove();
    externalRows.delete(id);
  }
  const full = calendars.length >= MAX_EXTERNAL;
  $('external-add').hidden = !external.allowed || (full && !externalBusy);
  $('external-full').hidden = !external.allowed || !full;
}

// The server's answer decides (`allowed`, as its routes check it). One that could not be read says so in the section
// rather than hiding it; on a later read, what was shown stays. Answers whether it took the answer: not when a newer
// read or a change made here came since, so an older answer never replaces a newer one.
async function loadExternal() {
  if (editingKey) return false;
  const seq = ++externalSeq;
  try {
    const got = await api('GET', '/api/me/external-calendars');
    if (seq !== externalSeq) return false;
    external = got;
    return true;
  } catch (err) {
    if (external || seq !== externalSeq) return false;
    external = { allowed: false, why: `Your other calendars could not be loaded (${failure(err)}). Reload the page to try again.`, calendars: [] };
    return true;
  }
}
// Approving the module or turning the switch on happens in Manage, in another tab or in this one and then Back (which
// can bring the page back as it was). Read again whenever the page shows again, so it never keeps the first answer;
// one read at a time.
function refreshExternal() {
  if (editingKey || !external || externalBusy || externalReading || document.visibilityState !== 'visible') return;
  externalReading = true;
  loadExternal().then((fresh) => { if (fresh) renderExternal(false); }).finally(() => { externalReading = false; });
}
document.addEventListener('visibilitychange', refreshExternal);
window.addEventListener('pageshow', (event) => { if (event.persisted) refreshExternal(); });

// Add: the server reads the address first (up to 15 seconds) and keeps it only when it could be read.
function externalBusyState(on) {
  externalBusy = on;
  $('external-add').setAttribute('aria-busy', String(on));
  for (const id of ['external-name', 'external-url', 'external-add-btn']) $(id).disabled = on;
  $('external-add-btn').textContent = on ? 'Reading…' : 'Add';
}
$('external-add').addEventListener('submit', (e) => {
  e.preventDefault();
  if (externalBusy) return;
  const status = $('external-status');
  const url = $('external-url').value.trim();
  if (!url) {
    sayField(status, 'Paste the calendar’s address.', true);
    $('external-url').focus();
    return;
  }
  externalBusyState(true);
  status.classList.remove('error');
  status.textContent = 'Reading the calendar. This can take up to 15 seconds.';
  run(async () => {
    try {
      const { calendar } = await api('POST', '/api/me/external-calendars', { name: $('external-name').value.trim(), url });
      externalSeq += 1; // a read in flight is older than this
      external.calendars = [...external.calendars.filter((c) => c.id !== calendar.id), calendar];
      $('external-name').value = '';
      $('external-url').value = '';
      externalBusyState(false);
      renderExternal(false);
      sayField(status, `${calendar.name} added`);
      (external.calendars.length >= MAX_EXTERNAL ? $('external-list').querySelector(`[data-remove="${CSS.escape(calendar.id)}"]`) : $('external-name'))?.focus();
    } catch (err) {
      externalBusyState(false);
      renderExternal(false);
      throw err; // said by run(), in plain words
    }
  }, status);
});
// A calendar's own status line, on its row.
const rowStatus = (id) => externalRows.get(id)?.status;
$('external-list').addEventListener('click', (e) => {
  const refresh = e.target.closest('[data-refresh]');
  const remove = e.target.closest('[data-remove]');
  const button = refresh || remove;
  if (!button || button.disabled) return;
  const id = button.dataset.refresh || button.dataset.remove;
  const calendar = external.calendars.find((c) => c.id === id);
  if (!calendar) return;
  const status = rowStatus(id);
  if (refresh) {
    rowReading.add(id);
    refresh.disabled = true;
    status.classList.remove('error');
    status.textContent = 'Reading…';
    // Whatever comes back is said on this calendar's own row (looked up again: it may have been removed meanwhile),
    // never in the section's line under Add: a 429 (read less than a minute ago) included.
    api('POST', `/api/me/external-calendars/${encodeURIComponent(id)}/refresh`, {}).then((got) => {
      rowReading.delete(id);
      externalSeq += 1; // a read in flight is older than this
      // Focus back on Refresh when it was there (a disabled button can drop it to the page).
      const wasHere = [externalRows.get(id)?.refresh, document.body, null].includes(document.activeElement);
      external.calendars = external.calendars.map((c) => (c.id === id ? got.calendar : c));
      renderExternal(false);
      if (wasHere) externalRows.get(id)?.refresh?.focus();
      const said = rowStatus(id);
      if (said) sayField(said, got.calendar.error ? 'could not be read' : 'read now', Boolean(got.calendar.error));
    }, (err) => {
      rowReading.delete(id);
      const again = externalRows.get(id)?.refresh;
      if (again) again.disabled = false;
      const said = rowStatus(id);
      if (said) sayField(said, failure(err), true);
    });
    return;
  }
  run(async () => {
    if (!window.confirm(`Remove ${calendar.name}? Its events stop showing, and its address is deleted here.`)) return;
    await api('DELETE', `/api/me/external-calendars/${encodeURIComponent(id)}`);
    externalSeq += 1; // a read in flight is older than this
    external.calendars = external.calendars.filter((c) => c.id !== id);
    renderExternal(false);
    sayField($('external-status'), `${calendar.name} removed`);
    (external.allowed ? $('external-name') : $('external-list').querySelector('[data-remove]'))?.focus();
  }, status);
});

// --- admin editing someone else -----------------------------------------

// Two-step sign-in on the account: your own to turn on (the enrolment block: scan, confirm, keep the recovery codes) and
// off (a code); an admin editing someone can reset theirs, which signs them out everywhere. A required factor cannot be
// turned off, and one not yet set up is asked for here with the block open. Under the server's admin lockout bypass an
// admin is not asked for a code and can reset their own with the password. Not offered by the server: no row at all.
function renderMfa(editing) {
  $('mfa-row').hidden = !mfaOffered;
  if (!mfaOffered) { $('mfa-block').hidden = true; return; }
  const on = Boolean(user.mfaEnrolled);
  $('mfa-state').textContent = on ? (mfaBypass && !editing ? 'on, bypassed' : 'on') : 'off';
  $('mfa-state').classList.toggle('on', on && !mfaBypass);
  $('mfa-on').hidden = editing || on;
  $('mfa-off').hidden = editing || !on || mfaRequired || mfaBypass;
  // An admin's second factor is not someone else's to reset (the server refuses it): only its own profile offers that.
  const othersAdmin = isAdminAccount(user) && !(me && user.key === me.key);
  $('mfa-reset').hidden = !editing || !on || othersAdmin;
  $('mfa-self-reset').hidden = editing || !on || !mfaBypass;
  $('mfa-hint').textContent = editing
    ? (on && othersAdmin ? `${user.displayName} signs in with a code from an authenticator app. Only they can reset it.`
      : on ? `${user.displayName} signs in with a code from an authenticator app. Reset it if the app is gone; they are signed out everywhere and asked nothing until they set it up again.` : `${user.displayName} signs in with a password only.`)
    : mfaBypass
      ? (on ? 'The lockout bypass is on, so you are not asked for a code. Reset your factor here if the app is gone, then turn the bypass off on the server.' : 'The lockout bypass is on; turn it off on the server once you are back in.')
      : on
        ? (mfaRequired ? `A code from your authenticator app, after the password. This ${word('environment')} requires it.` : 'A code from your authenticator app, after the password.')
        : (mfaRequired ? `This ${word('environment')} requires a second step. Set it up now.` : 'A code from an authenticator app after the password, if you want one.');
  if (!editing && !on && mfaRequired && !mfaBypass && $('mfa-block').hidden) $('mfa-on').click();
}
$('mfa-self-reset').addEventListener('click', () => {
  mountDisable($('mfa-block'), { disable: '/api/me/mfa/reset', label: 'Reset', password: true, onDone: async () => { await reload(); render(); say('your second factor is reset; set it up again when you are ready'); } });
});
$('mfa-on').addEventListener('click', () => {
  if (!$('mfa-block').hidden) return;
  mountEnrolment($('mfa-block'), { start: '/api/me/mfa/start', enable: '/api/me/mfa/enable', onDone: async () => { await reload(); render(); say('two-step sign-in is on'); } });
});
$('mfa-off').addEventListener('click', () => {
  mountDisable($('mfa-block'), { disable: '/api/me/mfa/disable', label: 'Turn off', onDone: async () => { await reload(); render(); say('two-step sign-in is off'); } });
});
$('mfa-reset').addEventListener('click', () => run(async () => {
  await api('DELETE', `/api/users/${user.key}/mfa`);
  await reload();
  render();
  say(`${user.displayName}'s second factor is reset`);
}, $('status')));

async function run(fn, statusEl) {
  try {
    await fn();
  } catch (err) {
    sayField(statusEl, failure(err), true);
  }
}

$('account-save').addEventListener('click', () => run(async () => {
  const patch = { displayName: $('e-name').value };
  if (!$('e-login').disabled) patch.login = $('e-login').value; // the admin's sign-in is not changed here
  if (!$('e-role').disabled) patch.role = $('e-role').value;
  const password = $('e-password').value;
  if (password) patch.password = password;
  user = (await api('PATCH', `/api/users/${user.key}`, patch)).user;
  $('e-password').value = '';
  maskPassword('e-password');
  render();
  sayField($('account-status'), 'saved');
}, $('account-status')));

$('account-clear-password').addEventListener('click', () => run(async () => {
  if (!user.link && !window.confirm(`${user.displayName} has no personal link. Without a password they cannot sign in. Remove it anyway?`)) return;
  user = (await api('PATCH', `/api/users/${user.key}`, { password: '' })).user;
  render();
  sayField($('account-status'), 'password removed');
}, $('account-status')));

$('link-copy').addEventListener('click', () => copy(user.link, $('account-status')));
$('link-new').addEventListener('click', () => run(async () => {
  if (user.link && !window.confirm('Regenerate the link? The old one stops working.')) return;
  user = (await api('POST', `/api/users/${user.key}/link`)).user;
  render();
  sayField($('account-status'), user.link ? 'new link made' : 'link created');
}, $('account-status')));
$('link-off').addEventListener('click', () => run(async () => {
  user = (await api('DELETE', `/api/users/${user.key}/link`)).user;
  render();
  sayField($('account-status'), 'link turned off');
}, $('account-status')));

$('other-images').addEventListener('change', (event) => {
  if (event.target.type !== 'file') return;
  const slot = event.target.closest('.slot').dataset.slot;
  const file = event.target.files[0];
  event.target.value = '';
  if (!file || !canImg(slot)) return;
  run(async () => {
    say(`uploading ${slot}...`);
    if (editingKey) user = (await api('PUT', imgApi(slot), file, file.type)).user;
    else { await api('PUT', imgApi(slot), file, file.type); await reload(); }
    render();
    say('image saved');
  });
});
$('other-images').addEventListener('click', (event) => {
  const button = event.target.closest('[data-action="slot-clear"]');
  if (!button) return;
  const slot = button.closest('.slot').dataset.slot;
  if (!canImg(slot)) return;
  run(async () => {
    if (editingKey) user = (await api('DELETE', imgApi(slot))).user;
    else { await api('DELETE', imgApi(slot)); await reload(); }
    render();
  });
});

$('mute-btn').addEventListener('click', () => run(async () => {
  await api('POST', `/api/users/${user.key}/mute`, { muted: true });
  say('muted');
}));
$('kick-btn').addEventListener('click', () => run(async () => {
  if (!window.confirm(`Kick ${user.displayName} from the call? They can rejoin.`)) return;
  await api('POST', `/api/users/${user.key}/kick`);
  say('kicked');
}));
$('delete-btn').addEventListener('click', () => run(async () => {
  if (!window.confirm(`Delete ${user.displayName}? Their images and links go with them.`)) return;
  await api('DELETE', `/api/users/${user.key}`);
  location.href = '/admin';
}));

// Profile / Spaces tabs, remembered in the address -- same pattern as
// admin.html's tabs. #rooms, the old name, still opens Spaces.
function selectTab(name) {
  const tab = name === 'spaces' || name === 'rooms' ? 'spaces' : 'profile';
  $('tab-profile').hidden = tab !== 'profile';
  $('tab-spaces').hidden = tab !== 'spaces';
  for (const b of document.querySelectorAll('.subtab')) b.classList.toggle('active', b.dataset.tab === tab);
  if (location.hash !== `#${tab}`) history.replaceState(null, '', `#${tab}`);
}
$('subtabs').addEventListener('click', (event) => {
  const b = event.target.closest('.subtab');
  if (b) selectTab(b.dataset.tab);
});
window.addEventListener('hashchange', () => selectTab(location.hash.slice(1)));

async function init() {
  renderTopbar();
  // The page bar (plan-two-zone-nav.md): "Profile" and its tabs; someone else's profile, opened from Manage > Users, is
  // named once loaded, with a Manage link first.
  renderPageBar({ name: editingKey ? '' : 'Profile', icon: 'user', manage: editingKey ? '/admin#users' : '', controls: [$('subtabs')] });
  const branding = await loadBranding();
  environmentName = branding.environmentName || '';
  // The stored value is already clamped server-side (see sanitizeCallPrefs)
  // -- this just keeps the picker from offering an option that would get
  // silently rounded back down the moment it's picked.
  const maxQuality = branding.maxQuality || 720;
  for (const opt of $('cp-quality').options) opt.hidden = Number(opt.value) > maxQuality;
  wireOverlayBack();
  try {
    if (editingKey) {
      const mine = await api('GET', '/api/me');
      me = mine.user;
      if (!hasOwnerRights(me)) { location.href = '/'; return; }
    }
    const [, { spaces }] = await Promise.all([reload(), api('GET', '/api/spaces'), loadFeed(), loadExternal()]);
    spacesById = new Map(spaces.map((r) => [r.id, r]));
  } catch (err) {
    location.href = editingKey ? '/admin' : '/login?next=/profile';
    return;
  }
  document.title = `${document.title.split(' - ')[0]} - ${user.displayName}`;
  // An owner editing someone: the page bar names them (its Manage link is the way back).
  if (editingKey) renderPageBar({ name: user.displayName, icon: 'user' });
  render();
  selectTab(location.hash.slice(1));
  // Your own module settings (not when an admin is editing someone else's profile).
  if (!editingKey) renderModuleSettings($('module-settings'), { scope: 'person' }).then(() => { $('section-module-settings').hidden = $('module-settings').hidden; });
}
init();
