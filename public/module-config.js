// One module's own settings page (Manage > Modules > Module Configuration): /module-config.html?id=<module id>.
// Owners and the admin. Every module gets a page, so a module with many settings is not squeezed into a shared box.
// Above the module's own settings, the host draws the environment switches that belong to the module
// (plan-space-calendars.md, section 4, decision 11): Calendar sharing for a module that takes part in it, and Show in
// the top bar for a module whose page is a top bar destination's main part. Neither names a module.
import { loadBranding, api, renderTopbar, renderPageBar, wireOverlayBack, word, fill, hasOwnerRights, refreshDestinations } from '/brand.js';
import { renderModuleSettings } from '/module-settings.js';
import { wireRegionCut } from '/region-cut.js';

const $ = (id) => document.getElementById(id);
const id = new URLSearchParams(location.search).get('id') || '';

// A status line's message; a plain one clears after 3 s, as on Manage.
const sayTimers = new WeakMap();
function say(el, text, error = false) {
  clearTimeout(sayTimers.get(el));
  el.textContent = text;
  el.classList.toggle('error', error);
  if (text && !error) sayTimers.set(el, setTimeout(() => { el.textContent = ''; }, 3000));
}

// The top bar's destinations the host knows (server/destinations.js), each with the setting that shows it and the line
// under its switch. A module offers one by declaring its main part (surfaces.destination).
const DESTINATIONS = [
  { id: 'calendar', key: 'showCalendar', hint: () => fill('events and tasks from every {space} in one place.') },
  { id: 'map', key: 'showMap', hint: () => fill('places from every {space} on one map.') },
];
const SHARING = [
  { key: 'calendarFeeds', input: 'set-calendar-feeds', hint: 'calendar-feeds-hint' },
  { key: 'otherCalendars', input: 'set-other-calendars', hint: 'other-calendars-hint' },
  // Not shown until step 4 of plan-space-calendars.md builds the published calendar's address: until then the switch
  // would turn on nothing. The setting and the server's handling of it stay; drop `later` to show it.
  { key: 'publishedCalendar', input: 'set-published-calendar', hint: 'published-calendar-hint', later: true },
];

// Why a read failed, in plain words: the server's own sentence when it sent one, never the browser's ("Failed to fetch").
function failure(err) {
  if (err && err.serverSaid) return err.message;
  if (err && err.status) return `the server answered ${err.status}`;
  if (!err || err instanceof TypeError) return 'the server didn\'t answer';
  return err.message;
}

renderTopbar();
renderPageBar({ manage: '/admin#modules' }); // named once the module is known (plan-two-zone-nav.md)
await loadBranding();
wireOverlayBack();

// Owners and the admin only. Signed out (401): to sign-in and back. Signed in without the right (403): say so and stop,
// since sign-in would only send them back here. Anything else: say the list could not be read.
let data;
let stop = '';
let denied = false;
try {
  data = await api('GET', '/api/modules');
} catch (err) {
  denied = err.status === 403;
  if (err.status === 401) location.href = `/login?next=${encodeURIComponent(location.pathname + location.search)}`;
  else stop = err.status === 403 ? `Only ${word('owner', { many: true })} can change this.` : `The ${word('module', { many: true })} could not be read (${failure(err)}). Reload the page to try again.`;
}
const m = data && data.modules.find((x) => x.id === id);
if (stop) {
  $('cfg-denied').textContent = stop;
  $('cfg-denied').hidden = false;
  if (denied) document.querySelector('.module-config-back').hidden = true; // Modules is not theirs either
} else if (data && !m) {
  $('cfg-missing').hidden = false;
} else if (m) {
  // What this environment calls it (its display name and icon, else its own), with its own name beside the version
  // when the two differ, as its card on the Modules tab shows.
  const name = m.displayName || m.name;
  document.title = `${document.title.split(' - ')[0]} - ${name} configuration`; // the environment's name is in front once branding has loaded
  $('config').hidden = false;
  $('cfg-icon').classList.add(`fa-${m.displayIcon || m.icon}`);
  $('cfg-name').textContent = `${name} configuration`;
  renderPageBar({ name, icon: m.displayIcon || m.icon });
  $('cfg-version').textContent = `${m.displayName ? `${m.name} ` : ''}v${m.version}${m.author ? ' by ' + m.author : ''}`;
  $('cfg-state').textContent = m.enabled ? 'Enabled' : 'Disabled';
  $('cfg-state').classList.add(m.enabled ? 'on' : 'warn');
  $('cfg-desc').textContent = m.description || '';
  const mine = (scope) => (m.settings || []).filter((d) => d.scope === scope).length; // the server's scope names (plan-names step 5a)
  const showSettings = () => renderModuleSettings($('settings'), { scope: 'environment', only: m.id, heading: false });
  const hostSections = await wireHostSections(m, name);
  if (!mine('environment')) {
    $('cfg-none').hidden = hostSections;
  } else if (!m.enabled) {
    $('cfg-off').hidden = false;
    $('cfg-off').textContent = `Turn ${name} on (Manage > ${word('module', { many: true, cap: true })}) to change its settings.`;
  } else {
    await showSettings();
  }
  if (m.geocoder && m.enabled) wireCache(m.id);
  if (m.regionSource && m.enabled) wireRegion(m, showSettings);
  const others = [mine('space') && `each ${word('space')}'s ${word('moderator', { many: true })} choose some in the ${word('space')}'s ${word('module')} settings`, mine('person') && 'each person chooses some in their own profile'].filter(Boolean);
  if (others.length) {
    $('cfg-other').hidden = false;
    $('cfg-other').textContent = `Also: ${others.join('; ')}.`;
  }
}

// Draws the host's sections this module has: Calendar sharing (m.sharing) and Show in the top bar (a destination's main
// part). Each switch is saved as it is flipped (PATCH /api/settings) and redrawn from the answer, since otherCalendars
// follows calendarFeeds until it is set. Answers whether any section is shown.
async function wireHostSections(m, name) {
  const sharing = m.sharing === true;
  const mains = DESTINATIONS.filter((d) => (m.surfaces?.destination || []).some((p) => p && p.id === d.id && p.part === 'main'));
  if (!sharing && !mains.length) return false;
  let settings;
  let approver = false; // owners and the admin approve a module's update, so its reason links them to Modules
  try {
    [settings, approver] = await Promise.all([
      api('GET', '/api/settings').then((r) => r.settings),
      api('GET', '/api/me').then((r) => hasOwnerRights(r.user)).catch(() => false),
    ]);
  } catch {
    return false; // nothing to draw the switches from: the module's own settings still show
  }
  const modulesLink = () => {
    const a = document.createElement('a');
    a.href = '/admin#modules';
    a.textContent = `Go to ${word('module', { many: true, cap: true })}`;
    return a;
  };
  // A switch's line: its own words, or the reason it can't be used (off and disabled), with the link to Modules.
  const drawSwitch = (input, hint, on, reason, link = false) => {
    if (!hint.dataset.own) hint.dataset.own = hint.textContent;
    input.checked = !reason && on;
    input.disabled = Boolean(reason);
    input.closest('label').classList.toggle('disabled', Boolean(reason));
    hint.textContent = reason || hint.dataset.own;
    if (reason && link) hint.append(' ', modulesLink());
  };
  const save = async (input, key, status, after) => {
    try {
      const answer = await api('PATCH', '/api/settings', { [key]: input.checked });
      if (answer && answer.settings) settings = answer.settings;
      drawAll();
      if (after) after();
      say(status, 'saved');
    } catch (err) {
      input.checked = !input.checked;
      say(status, failure(err), true);
    }
  };
  const drawSharing = () => {
    const reasons = m.sharingReasons || {};
    for (const s of SHARING) {
      const input = $(s.input);
      const shown = s.key in reasons && !s.later; // a module takes part in the switches it has a use for
      input.closest('label').hidden = !shown;
      $(s.hint).hidden = !shown;
      // Whatever the server says: { reason } as it answers now, or a plain sentence.
      const why = reasons[s.key];
      if (shown) drawSwitch(input, $(s.hint), settings[s.key] === true, typeof why === 'string' ? why : why?.reason || '', approver);
    }
  };
  const drawTopBar = () => {
    const reasons = settings.topBarReasons || {};
    for (const d of mains) {
      const why = typeof reasons[d.id] === 'string' ? reasons[d.id] : '';
      drawSwitch($(`set-show-${d.id}`), $(`show-${d.id}-hint`), settings[d.key] === true, why);
    }
  };
  const drawAll = () => {
    if (sharing) drawSharing();
    if (mains.length) drawTopBar();
  };
  if (sharing) {
    $('cfg-sharing').hidden = false;
    if (!m.enabled) {
      $('sharing-off').hidden = false;
      $('sharing-off').textContent = `${name} is off, so none of these work until it is on.`;
    }
    for (const s of SHARING) $(s.input).addEventListener('change', (event) => save(event.target, s.key, $('calendar-feeds-status')));
  }
  if (mains.length) {
    $('cfg-top-bar').hidden = false;
    for (const d of mains) {
      const label = document.createElement('label');
      label.className = 'check';
      const input = document.createElement('input');
      Object.assign(input, { id: `set-show-${d.id}`, type: 'checkbox', className: 'switch' });
      input.setAttribute('role', 'switch');
      input.setAttribute('aria-describedby', `show-${d.id}-hint`);
      label.append(input, ' Show in the top bar');
      const hint = document.createElement('p');
      hint.className = 'hint';
      hint.id = `show-${d.id}-hint`;
      hint.textContent = `Adds ${name} to the top bar: ${d.hint()}`;
      $('top-bar-checks').append(label, hint);
      input.addEventListener('change', (event) => save(event.target, d.key, $('top-bar-status'), () => {
        refreshDestinations(); // the bar's entry comes or goes on this page too
      }));
    }
  }
  drawAll();
  return true;
}

// The saved search results of a module that keeps them: counts, and purging (unused ones, unused ones older than a number of days, everything).
// Used places survive the first two. A destructive button asks twice: it reads "Really purge?" for a few seconds.
function wireCache(id) {
  const box = $('cfg-cache');
  box.hidden = false;
  const base = `/api/modules/${encodeURIComponent(id)}/geocode`;
  const status = $('cache-status');
  const show = (s) => {
    $('cache-saved').textContent = String(s.saved);
    $('cache-used').textContent = String(s.used);
    $('cache-unused').textContent = String(Math.max(0, s.saved - s.used));
    $('cache-oldest').textContent = s.oldest ? new Date(s.oldest).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' }) : '-';
  };
  const load = () => api('GET', `${base}/stats`).then(show).catch(() => { status.textContent = 'The counts could not be read.'; status.classList.add('error'); });
  load();
  const armed = new Map();
  box.addEventListener('click', async (event) => {
    const b = event.target.closest('[data-purge]');
    if (!b) return;
    const what = b.dataset.purge;
    if (!armed.has(b)) {
      const label = b.textContent;
      b.textContent = 'Really purge?';
      armed.set(b, setTimeout(() => { b.textContent = label; armed.delete(b); }, 4000));
      return;
    }
    clearTimeout(armed.get(b));
    armed.delete(b);
    b.textContent = b.dataset.purge === 'older' ? 'Purge unused older than' : what === 'all' ? 'Purge everything' : 'Purge unused';
    status.classList.remove('error');
    status.textContent = 'purging...';
    try {
      const body = what === 'all' ? { what: 'all' } : what === 'older' ? { what: 'unused', olderThanDays: Math.max(1, Number($('cache-days').value) || 90) } : { what: 'unused' };
      const s = await api('POST', `${base}/purge`, body);
      show(s);
      status.textContent = `${s.removed} removed`;
    } catch (err) {
      status.textContent = err.message;
      status.classList.add('error');
    }
  });
}

// "Add a region" (a module with `regionSource`): the shared region-cut UI (public/region-cut.js), cutting into this
// module's own folder. Not offered when the folder is the host's (a shared setting): the host console cuts there.
// `showSettings` redraws the settings card above once a cut lands, so the new file shows up ticked.
function wireRegion(m, showSettings) {
  const filesDef = (m.settings || []).find((d) => d.type === 'files' && d.folder === m.regionSource.folder);
  if (filesDef && filesDef.shared) return;
  wireRegionCut({
    base: `/api/modules/${encodeURIComponent(m.id)}/region-cut`,
    // Tick the new file in the files setting above (merging into its current value only -- the server keeps every
    // other setting as it was) and redraw the settings card so the admin sees it ticked without saving by hand.
    onDone: async (name) => {
      if (filesDef) {
        try {
          const mine = (await api('GET', '/api/module-settings/environment')).modules.find((x) => x.id === m.id);
          const current = mine?.settings.find((d) => d.key === filesDef.key)?.value;
          const list = Array.isArray(current) ? current : [];
          if (!list.includes(name)) await api('PUT', `/api/modules/${encodeURIComponent(m.id)}/settings/environment`, { values: { [filesDef.key]: [...list, name] } });
        } catch (err) {
          // the file is cut and on disk either way; the admin can tick it by hand if this could not be saved
        }
      }
      await showSettings();
    },
  });
}
