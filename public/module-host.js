// The page side of a module frame. A module runs in a sandboxed iframe and can
// only talk to this page (see public/sdk/host.js); this file answers those
// calls by making the real, authenticated requests, and pushes live changes
// back into the frame. Used by a module's own page (module.js), the dashboard (dashboard.js) and a
// space's canvas (canvas.js).

import { api, accessKeyHeaders, word, words, withinSpacePage } from '/brand.js';
import { nav as navBar } from '/nav-bar.js';
import { openHostMenu, closeHostMenu } from '/host-menu.js';

// The design tokens a module's frame receives (see design-theme.md).
const THEME_TOKENS = [
  '--bg', '--bg-section', '--bg-card', '--bg-input', '--border', '--text', '--text-dim', '--accent', '--on-accent',
  '--accent-hover', '--primary-hover', '--secondary', '--secondary-text', '--secondary-hover', '--header-bg',
  '--header-text', '--icon-hover', '--danger', '--ok', '--surface', '--surface-hover', '--shade',
  // The tints (plan-chat-model.md), in the mode showing, so a module's own colour matches the host's.
  '--tint-gold', '--tint-blue', '--tint-green', '--tint-teal', '--tint-purple', '--tint-red', '--tint-orange', '--tint-pink',
];

export function readTheme() {
  const styles = getComputedStyle(document.documentElement);
  const theme = {};
  for (const token of THEME_TOKENS) {
    const value = styles.getPropertyValue(token).trim();
    if (value) theme[token] = value;
  }
  return theme;
}

// One live stream per page (and space) is shared by every module frame on it. Browsers allow only a
// few long-lived connections to one site, so a stream per module would starve everything else once
// a handful of modules were open. See GET /api/modules/stream in server/index.js.
const streams = new Map(); // "<space>|<guest>" -> { source, subs }
function joinStream(space, guest, onEvent) {
  const key = `${space || ''}|${guest || ''}`;
  let s = streams.get(key);
  if (!s) {
    const p = new URLSearchParams();
    if (space) p.set('space', space);
    if (guest) p.set('guest', guest);
    const source = new EventSource(`/api/modules/stream?${p}`);
    s = { source, subs: new Set() };
    for (const type of ['change', 'schedule', 'links', 'refchange', 'bus', 'action', 'settings', 'markers', 'external']) {
      source.addEventListener(type, (ev) => {
        let data;
        try {
          data = JSON.parse(ev.data);
        } catch {
          return; // ignore a malformed event
        }
        for (const fn of s.subs) fn(type, data);
      });
    }
    streams.set(key, s);
  }
  s.subs.add(onEvent);
  return () => {
    s.subs.delete(onEvent);
    if (!s.subs.size) {
      s.source.close();
      streams.delete(key);
    }
  };
}

// --- watching one person's media (host.media.watch) ----------------------------------------------
// A read-only viewer connection to the space the person is in, following them as they move (`follow`),
// that never publishes. The module gets the elements to place (`handlers.video`, `handlers.audio`),
// the person's state (`handlers.state`: online, cameraOn, micOn, speaking, name) and their reactions
// (`handlers.reaction`). The client library is loaded the first time anyone watches.
let livekit = null;
async function watchMedia({ key, audio = false, video = true, space: startSpace = 'lobby', handlers = {} }) {
  if (typeof key !== 'string' || !key) throw Object.assign(new Error('media.watch needs the person\'s key'), { status: 400 });
  if (!livekit) livekit = await import('/lib/livekit-client.esm.mjs');
  const { Room, RoomEvent, Track } = livekit;
  const call = (name, ...args) => { try { if (typeof handlers[name] === 'function') handlers[name](...args); } catch (err) { console.error(err); } };
  const viewer = new Room({ adaptiveStream: false });
  // Everything for a video box; a box that only needs "are they talking" subscribes to the microphone
  // alone once the person is found (LiveKit reports who is talking over the subscriber link).
  const autoSubscribe = video || audio;
  let participant = null;
  let speaking = false;
  let wantedSpace = typeof startSpace === 'string' && startSpace ? startSpace : 'lobby';
  let connectedSpace = null;
  let following = false; // this disconnect is ours (follow), so reconnect at once, not after the usual pause
  let stopped = false;
  let videoEl = null;
  let audioEl = null;
  // One retry at a time: a failed connect is reported both by its own rejection and by a Disconnected event,
  // and two timers per failure would double the attempts every round.
  let retry = null;
  const connectLater = (ms) => {
    if (stopped) return;
    clearTimeout(retry);
    retry = setTimeout(connect, ms);
  };

  const state = () => {
    const cam = participant && participant.getTrackPublication(Track.Source.Camera);
    const mic = participant && participant.getTrackPublication(Track.Source.Microphone);
    call('state', {
      online: Boolean(participant),
      cameraOn: Boolean(cam && !cam.isMuted && cam.track),
      micOn: Boolean(mic && !mic.isMuted),
      speaking: Boolean(participant) && speaking,
      name: participant ? participant.name || null : null,
    });
  };
  const subscribeMic = (p) => {
    if (autoSubscribe) return;
    for (const pub of p.trackPublications.values()) if (pub.kind === Track.Kind.Audio && !pub.isSubscribed) pub.setSubscribed(true);
  };
  const adopt = (p) => {
    if (p.identity !== key) return;
    participant = p;
    subscribeMic(p);
    state();
  };
  const dropMedia = () => {
    if (videoEl) { videoEl.remove(); videoEl = null; call('video', null); }
    if (audioEl) { audioEl.remove(); audioEl = null; call('audio', null); }
  };
  const drop = (p) => {
    if (p.identity !== key) return;
    participant = null;
    dropMedia();
    state();
  };
  viewer
    .on(RoomEvent.ParticipantConnected, adopt)
    .on(RoomEvent.ParticipantDisconnected, drop)
    .on(RoomEvent.TrackPublished, (_pub, p) => adopt(p))
    .on(RoomEvent.TrackSubscribed, (track, _pub, p) => {
      if (p.identity !== key) return;
      participant = p;
      if (track.kind === Track.Kind.Video && video) {
        if (videoEl) videoEl.remove();
        videoEl = track.attach();
        call('video', videoEl);
      } else if (track.kind === Track.Kind.Audio && audio) {
        if (audioEl) audioEl.remove();
        audioEl = track.attach();
        call('audio', audioEl);
      }
      state();
    })
    .on(RoomEvent.TrackUnsubscribed, (track, _pub, p) => {
      if (p.identity !== key) return;
      const gone = track.detach();
      if (videoEl && gone.includes(videoEl)) { videoEl = null; call('video', null); }
      if (audioEl && gone.includes(audioEl)) { audioEl = null; call('audio', null); }
      gone.forEach((el) => el.remove());
      state();
    })
    .on(RoomEvent.TrackMuted, (_pub, p) => adopt(p))
    .on(RoomEvent.TrackUnmuted, (_pub, p) => adopt(p))
    .on(RoomEvent.DataReceived, (payload, p, _kind, topic) => {
      if (topic !== 'reaction' || !p || p.identity !== key) return;
      try {
        const data = JSON.parse(new TextDecoder().decode(payload));
        if (data.type === 'reaction' && typeof data.id === 'string') call('reaction', data.id);
      } catch {
        // not a reaction
      }
    })
    .on(RoomEvent.ActiveSpeakersChanged, (speakers) => {
      const now = speakers.some((s) => s.identity === key);
      if (now !== speaking) {
        speaking = now;
        state();
      }
    })
    .on(RoomEvent.Disconnected, () => {
      connectedSpace = null;
      participant = null;
      dropMedia();
      state();
      call('connection', { connected: false, space: null });
      const soon = following;
      following = false;
      connectLater(soon ? 300 : 3000);
    });

  async function connect() {
    if (stopped) return;
    const target = wantedSpace;
    try {
      const { token, livekitUrl } = await api('POST', '/api/token', { role: 'viewer', space: target });
      await viewer.connect(livekitUrl, token, { autoSubscribe });
      connectedSpace = target;
      call('connection', { connected: true, space: target });
      for (const p of viewer.remoteParticipants.values()) adopt(p);
      state();
    } catch (err) {
      call('connection', { connected: false, space: null, error: err.message });
      connectLater(5000);
    }
  }
  connect();
  return {
    // The person moved: leave this space for that one (the reconnect follows Disconnected).
    follow(spaceId) {
      if (typeof spaceId !== 'string' || !spaceId || spaceId === wantedSpace) return;
      wantedSpace = spaceId;
      if (connectedSpace) {
        following = true;
        viewer.disconnect().catch(() => {});
      }
    },
    stop() {
      stopped = true;
      clearTimeout(retry);
      dropMedia();
      viewer.disconnect().catch(() => {});
    },
  };
}

// --- dragging an object from one module onto another ---------------------------------------------
// A drag that starts in one module frame does not reliably carry its data into another, so the host
// brokers it. The source says a drag of a pointer began (host.objects.drag), the host puts an invisible
// layer over every other module frame on the page for the length of the drag, and the layer, being in
// the host's own page, receives the drag. It tells the frame under it where the pointer is and, on a
// drop, which pointer was dropped, in the frame's own coordinates. The frame decides what that means
// (and the host still checks the pointer when it is resolved). Nothing else crosses.
const mounted = new Set(); // every module frame the host has on this page: { frame, module, send }
// Light or dark flipped, or the owner changed the theme (theme-mode.js fires 'app:theme' once the new colors are in):
// every module hears its colors again, through the SDK's 'theme' event, which a framed module's SDK also sets on its
// own :root.
document.addEventListener('app:theme', () => {
  const theme = readTheme();
  for (const target of mounted) target.send('theme', theme);
});
let activeDrag = null; // { source, ref, layers, timer }

const REF_SHAPE = (r) => r && typeof r.module === 'string' && typeof r.kind === 'string' && typeof r.id === 'string'
  && /^[a-z][a-z0-9-]{1,31}$/.test(r.module) && /^[a-z][a-z0-9-]{0,23}$/.test(r.kind) && /^[A-Za-z0-9_-]{1,64}$/.test(r.id)
  && (r.scope === 'environment' || r.scope === 'person' || (r.scope === 'space' && typeof r.space === 'string' && r.space.length <= 64));
// A pointer that passed REF_SHAPE, with only its own fields.
const cleanPointer = (r) => ({ module: r.module, kind: r.kind, id: r.id, scope: r.scope, ...(r.scope === 'space' ? { space: r.space } : {}) });

// The environment's name, as its header shows it (GET /api/branding, public, asked once per page): a module names the
// environment's own list by it (info.context.environment.name), as the destination's filter does (decision 19).
let brandingAsked = null;
function environmentName() {
  if (!brandingAsked) {
    brandingAsked = fetch('/api/branding').then((res) => (res.ok ? res.json() : {})).then((b) => (typeof b.environmentName === 'string' ? b.environmentName.trim() : '')).catch(() => '');
  }
  return brandingAsked;
}

// --- who is where, for a module (host.presence) -----------------------------------------------------
// GET /api/presence as a module reads it. A person's place is as the viewer may know it (plan-primary-nav step 3):
// `space` is a space or an aside the viewer belongs to, or null; `aside` says they are in an aside (`space` is then
// the aside's id, or the space it came out of), and `asidePrivate` whether that aside is a private conversation (never
// with whom); `elsewhere` says they are online somewhere the viewer is not told of.
// `activeSpace` is null when there is none the viewer may know of.
function presenceForModule(d) {
  return {
    people: (d.users || []).map((u) => ({ key: u.key, name: u.displayName, online: Boolean(u.online), space: u.space || null, aside: Boolean(u.aside), asidePrivate: Boolean(u.aside && u.asidePrivate), elsewhere: Boolean(u.elsewhere), inCall: Boolean(u.inCall), isOwner: Boolean(u.isOwner) })),
    spaces: (d.spaces || []).map((r) => ({ id: r.id, name: r.name })),
    asides: (d.asides || []).map((r) => ({ id: r.id, origin: r.origin || null, private: Boolean(r.private) })),
    activeSpace: typeof d.activeSpace === 'string' && d.activeSpace ? d.activeSpace : null,
    ownerOnline: Boolean(d.ownerOnline),
    reactions: (d.reactions || []).map((r) => ({ id: r.id, glyph: r.glyph })),
    pictureScale: d.pictureScale || 100,
  };
}

// --- where a module's call goes -------------------------------------------------------------------
// A call names a scope ('context', the default, is wherever the frame is showing) and may name a space:
// { space: <id> } from a module's environment page reaches into one of the viewer's spaces, to write there as well as
// read (plan-calendar-destination). The host only shapes the request; the server decides whether this viewer may.
// A mount in a space reaches only its own space. `mount` is { scope, spaceId, moduleScopes }. Returns { scope, space }.
const SPACE_ID = /^[A-Za-z0-9_-]{1,64}$/;
function placeOf(requested, space, mount) {
  const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
  const named = space !== undefined && space !== null && space !== '';
  if (named && (typeof space !== 'string' || !SPACE_ID.test(space))) fail('that is not a space');
  const scopes = Array.isArray(mount.moduleScopes) ? mount.moduleScopes : [];
  let sc = !requested || requested === 'context' ? (named ? 'space' : mount.scope) : requested;
  // A name from before the product's rename says which word replaced it.
  const renamed = { server: 'environment', room: 'space', rooms: 'spaces' }[sc];
  if (renamed) fail(`scope "${sc}" is an old name; use "${renamed}"`);
  if (!['environment', 'space', 'spaces', 'person'].includes(sc)) fail(`scope "${String(sc).slice(0, 20)}" is not one of context, environment, space, spaces or person`);
  if (named && sc !== 'space') fail(`a space goes with scope "space", not "${sc}"`);
  // 'person' is the viewer's own data (their profile's), from a page anywhere; the module must have declared the scope.
  if (sc === 'person' && !scopes.includes('person')) fail('this module has no personal scope');
  // 'spaces' is the environment page reading every space the viewer belongs to (read-only).
  if (sc === 'spaces' && (mount.scope !== 'environment' || !scopes.includes('space'))) fail('only a module\'s environment page can read across spaces');
  if (sc !== 'space') return { scope: sc, space: null };
  if (mount.scope === 'space') {
    if (named && space !== mount.spaceId) fail('this module is in another space');
    return { scope: 'space', space: mount.spaceId };
  }
  if (!named) fail('this module is not in a space');
  if (!scopes.includes('space')) fail('this module has no space scope');
  return { scope: 'space', space };
}

// The query for GET /api/objects/search on a module's behalf (host.objects.search). 'person' is the viewer's own
// private objects, from anywhere. `scope: 'spaces'` (a module's environment page only, never a space or a keyed page)
// asks every space the viewer belongs to at once, each pointer with its space; `has: 'place'` keeps only summaries
// with a place (plan-map-destination, "SDK and the host"). Otherwise the place is placeOf's.
function objectSearchParams(moduleId, { q, scope: s, space, has } = {}, mount) {
  const fail = (message) => { throw Object.assign(new Error(message), { status: 400 }); };
  let sc;
  if (s === 'person') sc = { scope: 'person', space: null };
  else if (s === 'spaces') {
    if (mount.scope !== 'environment' || mount.keyed) fail('only a module\'s environment page can search across spaces');
    if (space !== undefined && space !== null && space !== '') fail('a space goes with scope "space", not "spaces"');
    sc = { scope: 'spaces', space: null };
  } else sc = placeOf(s, space, mount);
  if (has !== undefined && has !== null && has !== '' && has !== 'place') fail('has is "place" or nothing');
  const p = new URLSearchParams({ from: moduleId, q: String(q || '').slice(0, 100), scope: sc.scope });
  if (sc.scope === 'space') p.set('space', sc.space);
  if (has === 'place') p.set('has', 'place');
  return p;
}
// --- end of the search

// Whether a mount may show the person's own other calendars: only at environment scope, on no keyed page, and not
// within a space in any way (a page opened over a call, or a window popped out of a space's canvas).
export function externalAllowedHere({ scope, keyed = false, overCall = false, search = '' }) {
  const q = new URLSearchParams(search || '');
  return scope === 'environment' && !keyed && !overCall && !q.get('space') && q.get('popout') !== '1' && q.get('from') !== 'space';
}
// --- end of externalAllowedHere

// --- destinations ---------------------------------------------------------------------------------
// A destination (plan-calendar-destination, plan-map-destination) is a host page made of modules' parts: a `main`
// and up to one `panel`. The page keeps one shared state per destination and hands it to every part on mount and on
// each change (host.destination.onState). The page sets what it owns (the view, the filter, the search) with
// update(); a part may change only the fields its destination lets that part change (host.destination.set), each
// checked for shape. Each destination's state is its own shape.
const DAY_TEXT = /^\d{4}-\d{2}-\d{2}$/;
const MARKER_KIND_ID = /^[a-z0-9][a-z0-9-]{0,39}:[A-Za-z0-9_-]{1,40}$/;
const TINT_NAMES = ['gold', 'blue', 'green', 'teal', 'purple', 'red', 'orange', 'pink'];
const DESTINATION_FIELDS = {
  day: (v) => (typeof v === 'string' && DAY_TEXT.test(v) ? v : undefined),
  from: (v) => (typeof v === 'string' && DAY_TEXT.test(v) ? v : undefined),
  to: (v) => (typeof v === 'string' && DAY_TEXT.test(v) ? v : undefined),
  selected: (v) => (v === null ? null : REF_SHAPE(v) ? cleanPointer(v) : undefined),
  // A part asking the page to bring a part into view (on a phone, its tab): the map's "Show in list".
  reveal: (v) => (v === 'main' || v === 'panel' ? v : undefined),
  // The kinds of markers the calendar has shown (plan-calendar-markers.md), for the page's filter: up to 20 of
  // { id: '<module>:<kind>', label, icon, tint }, the label at most 40 characters, the icon a Font Awesome name, the
  // tint one of the eight or none.
  markerKinds: (v) => {
    if (!Array.isArray(v) || v.length > 20) return undefined;
    const out = [];
    for (const k of v) {
      if (!k || typeof k !== 'object' || typeof k.id !== 'string' || !MARKER_KIND_ID.test(k.id)) return undefined;
      const label = typeof k.label === 'string' ? k.label.replace(/\p{Cc}/gu, ' ').trim().slice(0, 40) : '';
      if (!label) return undefined;
      out.push({ id: k.id, label, icon: typeof k.icon === 'string' && /^[a-z0-9-]{1,40}$/.test(k.icon) ? k.icon : 'calendar-check', tint: TINT_NAMES.includes(k.tint) ? k.tint : null });
    }
    return out;
  },
};
// Which part may set what, by destination: in the calendar only the main part (the calendar) sets the selected day,
// the period shown and the kinds of markers it has shown; on the map both parts select a place, and either may ask for a part to be shown (`reveal`).
// The page's own fields (the view, the filter, the search, `phone`) are set only by the page.
const DESTINATIONS = {
  calendar: { main: ['day', 'from', 'to', 'markerKinds'] },
  map: { main: ['selected', 'reveal'], panel: ['selected', 'reveal'] },
};
const DESTINATION_PARTS = ['main', 'panel'];
export function createDestination(id, initial = {}) {
  const rules = DESTINATIONS[id];
  if (!rules) throw new Error(`there is no destination called ${String(id).slice(0, 20)}`);
  let state = { ...initial };
  const parts = new Set(); // { part, send }
  const watchers = new Set();
  const copy = () => JSON.parse(JSON.stringify(state));
  const publish = () => {
    for (const p of parts) p.send(copy());
    for (const fn of watchers) fn(copy());
  };
  return {
    id,
    get state() { return copy(); },
    // The page's own changes (the view, the filter, the search): anything it likes, passed to every part.
    update(patch) {
      state = { ...state, ...(patch || {}) };
      publish();
    },
    // A part's change: only what its destination lets that part set, and only in the right shape.
    fromPart(part, patch) {
      const allowed = rules[part] || [];
      if (!allowed.length) throw Object.assign(new Error(`the ${String(part).slice(0, 20)} part cannot change this page`), { status: 403 });
      if (!patch || typeof patch !== 'object' || Array.isArray(patch)) throw Object.assign(new Error('send the fields to change'), { status: 400 });
      const clean = {};
      for (const [key, value] of Object.entries(patch)) {
        if (!allowed.includes(key)) throw Object.assign(new Error(`the ${part} part cannot set ${String(key).slice(0, 20)}`), { status: 403 });
        const ok = DESTINATION_FIELDS[key](value);
        if (ok === undefined) throw Object.assign(new Error(`${key} is not valid`), { status: 400 });
        clean[key] = ok;
      }
      if (Object.keys(clean).some((k) => JSON.stringify(state[k]) !== JSON.stringify(clean[k]))) {
        state = { ...state, ...clean };
        publish();
      }
      return copy();
    },
    // A part joins (mountModule does this); `send` gets the whole state on each change. Returns the leave.
    join(part, send) {
      const p = { part, send };
      parts.add(p);
      return () => parts.delete(p);
    },
    // The page hears every change too, the parts' included. Returns the off.
    onChange(fn) {
      watchers.add(fn);
      return () => watchers.delete(fn);
    },
  };
}
// --- end of destinations

function endDrag() {
  if (!activeDrag) return;
  clearTimeout(activeDrag.timer);
  for (const { el, target } of activeDrag.layers) {
    el.remove();
    target.send('objectdrag', { type: 'leave' });
  }
  activeDrag = null;
}

function beginDrag(source, ref) {
  endDrag();
  const layers = [];
  for (const target of mounted) {
    if (target === source) continue;
    const rect = target.frame.getBoundingClientRect();
    if (!rect.width || !rect.height) continue;
    const doc = target.frame.ownerDocument;
    const el = doc.createElement('div');
    el.style.cssText = `position:fixed;z-index:2147483000;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;background:transparent`;
    const at = (e) => ({ x: Math.round(e.clientX - rect.left), y: Math.round(e.clientY - rect.top) });
    el.addEventListener('dragenter', (e) => e.preventDefault());
    el.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'link';
      target.send('objectdrag', { type: 'over', ...at(e), ref });
    });
    el.addEventListener('dragleave', () => target.send('objectdrag', { type: 'leave' }));
    el.addEventListener('drop', (e) => {
      e.preventDefault();
      target.send('objectdrag', { type: 'drop', ...at(e), ref });
      endDrag();
    });
    // A click on the layer means no drag is going on (a module cannot keep the layers up).
    el.addEventListener('pointerdown', endDrag);
    doc.body.appendChild(el);
    layers.push({ el, target });
  }
  activeDrag = { source, ref, layers, timer: setTimeout(endDrag, 20000) };
}

// A trace of a drag on screen, for finding out where one stops: open the host once with ?debug=1 (?debug=0
// turns it off). Every step, in the module that starts the drag, in the host and in the module under it,
// adds a line at the bottom left of the page.
try {
  const flag = new URLSearchParams(location.search).get('debug');
  if (flag === '1') localStorage.setItem('app.debug', '1');
  else if (flag === '0') localStorage.removeItem('app.debug');
} catch {
  // no storage: no trace
}
const debugOn = () => {
  try {
    return localStorage.getItem('app.debug') === '1';
  } catch {
    return false;
  }
};
const traceLines = [];
function trace(text) {
  if (!debugOn()) return;
  traceLines.push(`${new Date().toLocaleTimeString([], { hour12: false })} ${text}`);
  if (traceLines.length > 12) traceLines.shift();
  console.log('[host]', text);
  let box = document.getElementById('app-debug');
  if (!box) {
    box = document.createElement('pre');
    box.id = 'app-debug';
    box.style.cssText = 'position:fixed;left:8px;bottom:8px;z-index:2147483002;margin:0;padding:8px 10px;max-width:60vw;max-height:40vh;overflow:auto;background:rgba(0,0,0,.85);color:#9f9;font:11px/1.35 monospace;border-radius:6px;pointer-events:none';
    document.body.appendChild(box);
  }
  box.textContent = traceLines.join('\n');
}

// A drag driven by the pointer instead of the browser's drag and drop, which is unreliable between
// sandboxed frames. The source frame (host.objects.draggable) tells the host when a drag begins, where
// the pointer is as it moves, and where it lets go, in its own coordinates; the host turns those into
// the page's, finds the module frame under the pointer, and forwards over, leave and drop to it in
// that frame's coordinates, drawing a small label at the pointer meanwhile.
let ptrDrag = null; // { source, ref, summary, label, ghost, over, timer, doc }

// A summary carried by a drag instead of a pointer (a module with nothing stored, Assistant's answers): only the
// fields a target can fill an action from, checked for shape and size, or null.
function cleanSummary(c) {
  if (!c || typeof c !== 'object' || typeof c.title !== 'string' || !c.title.trim()) return null;
  const summary = { title: c.title.trim().slice(0, 200) };
  if (typeof c.kind === 'string' && /^[a-z][a-z0-9-]{0,39}$/.test(c.kind)) summary.kind = c.kind;
  if (typeof c.content === 'string' && c.content.trim()) summary.text = c.content.replace(/\p{Cc}(?<!\n)/gu, ' ').slice(0, 8000);
  if (typeof c.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(c.date)) summary.date = c.date;
  const p = c.place;
  if (p && typeof p === 'object' && Number.isFinite(p.lat) && Number.isFinite(p.lng) && Math.abs(p.lat) <= 90 && Math.abs(p.lng) <= 180) {
    summary.place = { lat: p.lat, lng: p.lng, ...(typeof p.name === 'string' && p.name.trim() ? { name: p.name.trim().slice(0, 120) } : {}) };
  }
  return summary;
}

// What a drag carries, as a target's objectdrag event gets it: a pointer, or a summary.
const dragged = () => ({ ref: ptrDrag.ref || null, summary: ptrDrag.summary || null });

function ptrEnd() {
  if (!ptrDrag) return;
  clearTimeout(ptrDrag.timer);
  ptrDrag.ghost.remove();
  if (ptrDrag.over) ptrDrag.over.send('objectdrag', { type: 'leave' });
  ptrDrag = null;
}

// The module frame in the same window as the source that is under a point of the page, and where in it.
function ptrTarget(px, py) {
  for (const target of mounted) {
    if (target === ptrDrag.source || target.frame.ownerDocument !== ptrDrag.doc) continue;
    const r = target.frame.getBoundingClientRect();
    if (px >= r.left && px < r.right && py >= r.top && py < r.bottom) return { target, x: Math.round(px - r.left), y: Math.round(py - r.top) };
  }
  return null;
}

function ptrPoint(x, y) {
  const r = ptrDrag.source.frame.getBoundingClientRect();
  return { px: r.left + x, py: r.top + y };
}

function ptrBegin(source, { ref = null, summary = null }, label, x, y) {
  trace(`host: drag begins from ${source.module.id} (${ref ? `${ref.kind} ${ref.id}` : `a summary "${summary.title.slice(0, 30)}"`}) at ${x},${y}; ${[...mounted].filter((t) => t !== source).map((t) => t.module.id).join(', ') || 'no other module frames'} to drop on`);
  ptrEnd();
  endDrag();
  const doc = source.frame.ownerDocument;
  const ghost = doc.createElement('div');
  ghost.textContent = String(label || '').slice(0, 40);
  ghost.style.cssText = 'position:fixed;z-index:2147483001;pointer-events:none;padding:3px 9px;border-radius:6px;background:#c8873a;color:#1a1206;font:600 12px sans-serif;max-width:220px;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;box-shadow:0 4px 14px rgba(0,0,0,.4)';
  doc.body.appendChild(ghost);
  ptrDrag = { source, ref, summary, label, ghost, over: null, doc, timer: setTimeout(ptrEnd, 60000) };
  ptrMove(x, y);
}

function ptrMove(x, y) {
  if (!ptrDrag) return;
  const { px, py } = ptrPoint(x, y);
  ptrDrag.ghost.style.left = `${px + 12}px`;
  ptrDrag.ghost.style.top = `${py + 12}px`;
  const hit = ptrTarget(px, py);
  if (ptrDrag.over && (!hit || hit.target !== ptrDrag.over)) {
    ptrDrag.over.send('objectdrag', { type: 'leave' });
    ptrDrag.over = null;
  }
  if (hit && ptrDrag.over !== hit.target) trace(`host: pointer is over ${hit.target.module.id} at ${hit.x},${hit.y}`);
  if (hit) {
    ptrDrag.over = hit.target;
    hit.target.send('objectdrag', { type: 'over', x: hit.x, y: hit.y, ...dragged() });
  }
}

function ptrDrop(x, y) {
  if (!ptrDrag) {
    trace('host: released, but no drag was in progress');
    return;
  }
  const { px, py } = ptrPoint(x, y);
  const hit = ptrTarget(px, py);
  trace(hit ? `host: released over ${hit.target.module.id} at ${hit.x},${hit.y}: dropping` : `host: released at page ${Math.round(px)},${Math.round(py)}, over no module frame`);
  if (hit) hit.target.send('objectdrag', { type: 'drop', x: hit.x, y: hit.y, ...dragged() });
  ptrDrag.over = null; // the drop already ended it for the target
  ptrEnd();
}

// The host-drawn "..." dropdown for whatever a header, action bar or toolbar row didn't have room for is the page's
// shared menu (public/host-menu.js), the same one the canvas's title bars and the account menu use.
export { openHostMenu, closeHostMenu };

// The host's "..." (same look as host.ui.moreButton / .sdk-more inside a module).
function drawMoreButton(doc, extraClass, onClick) {
  const more = doc.createElement('button');
  more.type = 'button';
  more.className = extraClass ? `sdk-more ${extraClass}` : 'sdk-more';
  more.title = 'More';
  more.setAttribute('aria-label', 'More');
  more.setAttribute('aria-haspopup', 'menu');
  const i = doc.createElement('i');
  i.className = 'fa-solid fa-ellipsis-vertical fa-fw';
  i.setAttribute('aria-hidden', 'true');
  more.appendChild(i);
  more.addEventListener('click', onClick);
  return more;
}

// A confirm in this same menu, under the button that opened it. The first choice asks; the second does it.
// `armed` skips the ask, for a choice that was already picked from a longer menu.
// `choices` ([{ label, hint?, disabled?, onConfirm }]) makes the armed confirm offer more than one way to do it (Chat's
// Clear…: yours or everyone's): `confirm` is then a heading line above them, and each acts at once. Keep it is last.
// A failure shows its message in the menu's place, whichever choice it was.
export function openConfirmMenu(trigger, { label, confirm, hint, icon = 'trash', onConfirm, choices = null, fail = 'It could not be cleared.', armed = false } = {}) {
  const act = (run) => async () => {
    try { await run(); }
    catch (err) { openHostMenu(trigger, [{ label: err.message || fail, disabled: true }]); }
  };
  const open = (isArmed) => {
    const doing = Array.isArray(choices) && choices.length
      ? [
          ...(confirm ? [{ icon, label: confirm, disabled: true }] : []),
          ...choices.map((c) => ({ icon, label: c.label, hint: c.hint, disabled: Boolean(c.disabled), danger: !c.disabled, onPick: act(c.onConfirm) })),
        ]
      : [{ icon, label: confirm, hint, danger: true, onPick: act(onConfirm) }];
    const items = isArmed
      ? [...doing, { icon: 'xmark', label: 'Keep it', onPick: () => {} }]
      : [{ icon, label, hint, danger: true, onPick: () => open(true) }];
    openHostMenu(trigger, items);
  };
  open(armed);
}

// The titlebar "..." on an installed module (not the conference or the chat).
export function openClearMenu(trigger, onClear) {
  openConfirmMenu(trigger, { label: 'Clear', confirm: 'Clear everything and start again?', onConfirm: onClear });
}

// Splits a cleaned item list into what a header/bar/toolbar row shows directly and what collapses into
// its "..." (an item marked `overflow: true`, or whatever doesn't fit in `max` slots including the "...").
// Leftovers come off the left of `shown`, so the rightmost (the primary, when there is one) stays.
function splitOverflow(items, max) {
  const shown = [];
  const hidden = [];
  for (const item of items) (item.overflow ? hidden : shown).push(item);
  while (shown.length + (hidden.length ? 1 : 0) > max) hidden.push(shown.shift());
  return { shown, hidden };
}

// Mounts one module: into an empty <iframe> (`frame`; sandboxed, with only the SDK to reach the page), or,
// for a module that runs in the page, into an empty element (`container`), where it lives in a shadow
// root of its own, beside the page's own elements, with the page's power (see the run modes in
// documentation/architecture/architecture-modules.md).
//
// `scope` is 'environment' (the module's own page) or 'space' (on a space's canvas, with `spaceId`). `destination`
// is { hub, part } for a destination's part: `hub` from createDestination(), `part` 'main' or 'panel'. Returns
// { destroy, send, deliver }. The module hears the same names the server uses (plan-names step 5c).
export function mountModule({ module, frame = null, container = null, scope = 'environment', spaceId = null, guestToken = null, entry, onTitle, onResize, bar = null, onBar, header = null, toolbar = null, onToolbar, onOpenRef = null, onOpenPage = null, onOpenModule = null, onChatAsk = null, keyed = null, destination = null }) {
  const base = `/api/modules/${encodeURIComponent(module.id)}`;
  let contextInfo = null;
  // A keyed page (public/keyed.js): the module's page about one person, opened with the access key and no
  // session. `keyed` is { path, subject, query }; the page's own api() already carries the key.
  if (destination && (!destination.hub || !DESTINATION_PARTS.includes(destination.part))) throw new Error('a destination\'s part is "main" or "panel"');

  // `sc` is a scope name ('space' meaning the space this frame is in) or a place from scopeOf ({ scope, space }).
  const q = (sc) => {
    const place = typeof sc === 'string' ? { scope: sc, space: sc === 'space' ? spaceId : null } : sc;
    const p = new URLSearchParams();
    if (place.scope === 'space') { p.set('scope', 'space'); p.set('space', place.space); } else if (place.scope === 'spaces' || place.scope === 'person') p.set('scope', place.scope); else p.set('scope', 'environment');
    if (guestToken) p.set('guest', guestToken);
    return p;
  };
  // The person's own other calendars (plan-google-calendar.md, Part 2) are shown only on a module's own page and on a
  // destination, never within a space, whatever the mount's scope says: not on a space's canvas, not in a window popped
  // out of one, not on a page opened over a call (?from=space), and never on a keyed page. Elsewhere the module is
  // answered none and never hears the 'external' event.
  const externalHere = externalAllowedHere({ scope, keyed: Boolean(keyed), overCall: withinSpacePage(), search: location.search });
  // 'context' means wherever this frame is showing; a module on a space's canvas may also ask for 'environment', and a
  // module's environment page for one of the viewer's spaces ({ space }). See placeOf.
  const scopeOf = (requested, space) => placeOf(requested, space, { scope, spaceId, moduleScopes: module.scope });
  const url = (path, sc, extra = {}) => {
    const p = q(sc);
    for (const [k, v] of Object.entries(extra)) if (v !== undefined && v !== null && v !== '') p.set(k, v);
    return `${base}${path}?${p}`;
  };

  // The place this module is in, for the bus routes: on a space's canvas it is in that space, a page in the environment.
  const busPlaceBody = () => (scope === 'space' ? { scope: 'space', space: spaceId } : { scope: 'environment' });
  const busGuest = () => (guestToken ? `?guest=${encodeURIComponent(guestToken)}` : '');
  const busQuery = (extra) => {
    const p = new URLSearchParams({ ...extra, ...busPlaceBody() });
    if (guestToken) p.set('guest', guestToken);
    return p;
  };

  // This module, as the drag brokering sees it (its `send` is defined below).
  const pageMode = Boolean(container);
  // `frame` in the drag brokering below is whichever element holds the module: its frame, or its container.
  const mine = { frame: pageMode ? container : frame, module, send: (event, data) => send(event, data) };

  // The nav-bar tools this mount registered (their namespaced ids), so destroy() takes exactly those out.
  const navIds = new Set();
  let barItems = [];
  let barObserver = null;
  let fittingBar = false;

  function drawBarItem(item) {
    if (item.input) {
      const form = document.createElement('form');
      form.className = 'quick-add';
      const field = document.createElement('input');
      field.type = 'text';
      field.maxLength = 200;
      field.placeholder = item.placeholder;
      field.setAttribute('aria-label', item.placeholder || 'Quick add');
      const go = document.createElement('button');
      go.type = 'submit';
      go.className = 'action-btn primary quick-add-go';
      go.setAttribute('aria-label', item.label || 'Add');
      go.title = item.label || 'Add';
      go.disabled = item.disabled;
      const plus = document.createElement('i');
      plus.className = `fa-solid fa-${item.icon || 'circle-plus'} fa-fw`;
      plus.setAttribute('aria-hidden', 'true');
      go.appendChild(plus);
      form.append(field, go);
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        send('bar', { id: item.id, value: field.value.trim() });
        field.value = '';
      });
      bar.appendChild(form);
      return;
    }
    const b = document.createElement('button');
    b.type = 'button';
    // An icon is the button (the shared .action-btn, the same size and icon as the call's controls). The words stay as
    // the tooltip and as the line in "...". A button with no icon is a worded .btn.
    const iconOnly = Boolean(item.icon);
    b.className = iconOnly ? `action-btn${item.primary ? ' primary' : ''}` : `btn${item.primary ? ' btn-primary' : ''}`;
    b.disabled = item.disabled;
    if (iconOnly) { b.title = item.label; b.setAttribute('aria-label', item.label); }
    if (item.icon) {
      const i = document.createElement('i');
      i.className = `fa-solid fa-${item.icon} fa-fw`;
      i.setAttribute('aria-hidden', 'true');
      b.append(i);
    }
    if (!iconOnly) b.append(item.label);
    b.addEventListener('click', () => send('bar', { id: item.id }));
    bar.appendChild(b);
  }

  function drawBarMore(hidden) {
    const more = drawMoreButton(document, 'bar-more', () => openHostMenu(more, hidden.map((item) => ({ ...item, onPick: () => send('bar', { id: item.id }) }))));
    bar.appendChild(more);
  }

  // Primary on the far right; secondaries to its left. As the bar shrinks, leftovers come off the left into "...".
  function drawModuleBar() {
    if (!bar || fittingBar) return;
    fittingBar = true;
    try {
      const quickadds = barItems.filter((i) => i.input);
      const forced = barItems.filter((i) => !i.input && i.overflow);
      const primaries = barItems.filter((i) => !i.input && !i.overflow && i.primary);
      const secondaries = barItems.filter((i) => !i.input && !i.overflow && !i.primary);
      const hidden = [...forced];
      const visible = [...secondaries];
      const paint = () => {
        bar.textContent = '';
        for (const item of quickadds) drawBarItem(item);
        if (hidden.length) drawBarMore(hidden);
        for (const item of visible) drawBarItem(item);
        for (const item of primaries) drawBarItem(item);
      };
      paint();
      if (!bar.clientWidth) return;
      // The bar packs to the right, so a button that does not fit sticks out of the left. scrollWidth
      // does not count that. Measure the buttons against the bar instead, and fold them left to right.
      const spills = () => {
        const edge = bar.getBoundingClientRect();
        return [...bar.children].some((child) => {
          if (child.hidden) return false;
          const box = child.getBoundingClientRect();
          return box.left < edge.left - 1 || box.right > edge.right + 1;
        });
      };
      let guard = 0;
      while ((visible.length || primaries.length) && spills() && guard < 20) {
        hidden.push(visible.length ? visible.shift() : primaries.shift());
        paint();
        guard += 1;
      }
    } finally {
      fittingBar = false;
    }
  }

  // Events for the module before its page has said hello wait until it has.
  let ready = false;
  const queued = [];
  const deliver = (event, data) => {
    if (ready) send(event, data);
    else queued.push([event, data]);
  };

  const handlers = {
    async hello() {
      const [answer, envName] = await Promise.all([api('GET', url('/context', scope)), environmentName()]);
      contextInfo = answer;
      ready = true;
      setTimeout(() => { for (const [event, data] of queued.splice(0)) send(event, data); }, 50);
      return {
        user: contextInfo.user,
        permissions: contextInfo.permissions,
        module: contextInfo.module,
        context: keyed ? { scope: 'keyed', spaceId: null, path: keyed.path, subject: keyed.subject, query: keyed.query || {} } : { scope, spaceId: scope === 'space' ? spaceId : null, environment: { name: envName }, ...(destination ? { destination: { id: destination.hub.id, part: destination.part } } : {}) },
        // A destination's part gets the page's state now, and each change after it as the 'destination' event.
        ...(destination ? { destinationState: destination.hub.state } : {}),
        locale: contextInfo.locale || { language: 'en', clock: '12', currency: 'USD', words: words() },
        space: contextInfo.space || null,
        phases: Array.isArray(contextInfo.phases) ? contextInfo.phases : [],
        theme: readTheme(),
        debug: debugOn(),
      };
    },
    async 'storage.get'({ key, scope: s, space }) {
      try {
        return (await api('GET', url(`/data/${encodeURIComponent(key)}`, scopeOf(s, space)))).item;
      } catch (err) {
        if (err.status === 404) return null;
        throw err;
      }
    },
    async 'storage.set'({ key, value, version, scope: s, space }) {
      let tz = '';
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* the server falls back */ }
      return (await api('PUT', url(`/data/${encodeURIComponent(key)}`, scopeOf(s, space)), { value, version, tz })).item;
    },
    async 'storage.delete'({ key, version, scope: s, space }) {
      let tz = '';
      try { tz = Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { /* the server falls back */ }
      return api('DELETE', url(`/data/${encodeURIComponent(key)}`, scopeOf(s, space), { version, tz }));
    },
    async 'storage.list'({ prefix, scope: s, space }) {
      const sc = scopeOf(s, space);
      if (sc.scope === 'spaces') return (await api('GET', url('/spaces-data', sc, { prefix }))).items;
      return (await api('GET', url('/data', sc, { prefix }))).items;
    },
    // Objects: summaries for pointers to other modules' objects, and a search for objects this module may link to.
    // Always asked on this module's behalf (`from`), so the server can check it was approved for them.
    async 'objects.resolve'({ refs }) {
      const q = guestToken ? `?guest=${encodeURIComponent(guestToken)}` : '';
      return (await api('POST', `/api/objects/resolve${q}`, { from: module.id, refs: Array.isArray(refs) ? refs.slice(0, 50) : [] })).summaries;
    },
    // The kinds of other modules' objects this module may link to, so it need not know them by name.
    async 'objects.kinds'() {
      const p = new URLSearchParams({ from: module.id });
      if (guestToken) p.set('guest', guestToken);
      return (await api('GET', `/api/objects/kinds?${p}`)).kinds;
    },
    // Show an object in the module that owns it (the page decides how: the canvas, a page). `newTab`: the click asked for
    // a new tab (Ctrl or the middle button); a page that can (home's tiles) opens it in one, any other ignores it.
    async 'objects.open'({ ref, newTab }) {
      if (!REF_SHAPE(ref)) throw Object.assign(new Error('that is not a valid reference'), { status: 400 });
      if (!onOpenRef) throw Object.assign(new Error('nothing here can open it'), { status: 400 });
      return Boolean(await onOpenRef(cleanPointer(ref), { newTab: newTab === true }));
    },
    // A Font Awesome icon as inline SVG, for a module in a sandboxed frame that cannot load the icon font.
    async 'icons.svg'({ name, style }) {
      const n = String(name ?? '');
      const st = ['solid', 'regular', 'brands'].includes(style) ? style : 'solid';
      if (!/^[a-z0-9-]{1,40}$/.test(n)) throw Object.assign(new Error('no such icon'), { status: 400 });
      const res = await fetch(`/api/icons/${st}/${n}`);
      if (!res.ok) throw Object.assign(new Error('no such icon'), { status: res.status });
      return res.text();
    },
    // Open this module's own page, at a place in it (a short hash such as day=2026-09-24). Only a host that has
    // somewhere to take it (the dashboard) answers; the page then hands the hash to the module (pagehash).
    async 'page.open'({ hash, newTab }) {
      const h = String(hash ?? '');
      if (!/^[A-Za-z0-9=&_.:,-]{0,80}$/.test(h)) throw Object.assign(new Error('that is not a valid place'), { status: 400 });
      if (!onOpenPage) throw Object.assign(new Error('nothing here can open it'), { status: 400 });
      return Boolean(await onOpenPage(h, { newTab: newTab === true }));
    },
    // Tell the host what one of this module's objects points at (all of it: the list replaces the last).
    async 'objects.setLinks'({ from, to, space }) {
      if (!REF_SHAPE(from)) throw Object.assign(new Error('that is not a valid reference'), { status: 400 });
      // The object's own place, as any other write: a mount in a space speaks only for that space, and { space } must
      // be the pointer's. The server checks the viewer may change the module's data there.
      if (from.scope === 'space') {
        const place = scopeOf('space', space === undefined || space === null || space === '' ? from.space : space);
        if (place.space !== from.space) throw Object.assign(new Error('that object is in another space'), { status: 400 });
      } else if (space !== undefined && space !== null && space !== '') throw Object.assign(new Error('that object is not in a space'), { status: 400 });
      const q = guestToken ? `?guest=${encodeURIComponent(guestToken)}` : '';
      return api('POST', `/api/objects/links${q}`, { module: module.id, from: cleanPointer(from), to: (Array.isArray(to) ? to : []).filter(REF_SHAPE).slice(0, 20).map(cleanPointer) });
    },
    // What points at one of this module's objects ('to'), or what it points at ('from'): summaries.
    async 'objects.links'({ ref, dir }) {
      if (!REF_SHAPE(ref)) throw Object.assign(new Error('that is not a valid reference'), { status: 400 });
      const p = new URLSearchParams({ from: module.id, ref: JSON.stringify(cleanPointer(ref)), dir: dir === 'from' ? 'from' : 'to' });
      if (guestToken) p.set('guest', guestToken);
      return (await api('GET', `/api/objects/links?${p}`)).summaries;
    },
    // Events and actions between modules (see the SDK's host.events and host.actions). Always in this
    // module's own place, and always on its behalf: the server checks what it declared and was approved for.
    async 'events.publish'({ name, ref, data }) {
      return api('POST', `/api/bus/publish${busGuest()}`, { module: module.id, name, ref, data, ...busPlaceBody() });
    },
    async 'events.since'({ after }) {
      return api('GET', `/api/bus/events?${busQuery({ module: module.id, after: String(after ?? 0) })}`);
    },
    // `ref`: the object the actions would be about (a drop's): the server then lists only those that can be carried out
    // in that object's own place for this viewer (plan-calendar-destination, decision 21).
    async 'actions.list'({ accepts, self, ref } = {}) {
      const extra = {};
      if (typeof accepts === 'string' && accepts) extra.accepts = accepts.slice(0, 80);
      if (self) extra.self = '1';
      if (REF_SHAPE(ref)) extra.ref = JSON.stringify(cleanPointer(ref));
      return (await api('GET', `/api/bus/actions?${busQuery({ from: module.id, ...extra })}`)).actions;
    },
    async 'actions.request'({ action, input }) {
      const name = String(action || '');
      if (name === 'assistant:askAssistant' || name === 'askAssistant') {
        if (typeof onChatAsk !== 'function') throw Object.assign(new Error(`Ask this from Chat in ${word('space', { a: true })}.`), { status: 400 });
        const q = String(input?.question || '').trim() || (input?.ref ? 'What should I know about this?' : '');
        if (!q) throw Object.assign(new Error('Type a question.'), { status: 400 });
        const refs = input?.ref ? [input.ref] : [];
        await onChatAsk({ question: q, refs });
        return { id: 0, status: 'done', result: { ok: true } };
      }
      const queued = await api('POST', `/api/bus/actions/request${busGuest()}`, { from: module.id, action, input, ...busPlaceBody() });
      // The module that carries an action does it from its own page, so a request waits until that page is open: ask the host to
      // open it here (on the space's canvas) when it is not.
      if (onOpenModule) { try { onOpenModule(String(action).split(':')[0]); } catch (err) { /* it cannot be opened here */ } }
      return queued;
    },
    async 'actions.pending'() {
      return (await api('GET', `/api/bus/actions/pending?${busQuery({ module: module.id })}`)).actions;
    },
    async 'actions.claim'({ id }) {
      return api('POST', `/api/bus/actions/claim${busGuest()}`, { module: module.id, id, ...busPlaceBody() });
    },
    async 'actions.complete'({ id, result }) {
      return api('POST', `/api/bus/actions/complete${busGuest()}`, { module: module.id, id, result, ...busPlaceBody() });
    },
    async 'actions.status'({ id }) {
      return api('GET', `/api/bus/actions/status?${busQuery({ from: module.id, id: String(id) })}`);
    },
    async 'objects.format'() {
      return api('GET', '/api/objects/format');
    },
    async 'objects.checkAvailable'() {
      return api('GET', url('/objects/check', scopeOf()));
    },
    async 'objects.check'({ text, file }) {
      const body = file instanceof Blob ? file : new Blob([String(text ?? '')], { type: 'text/plain' });
      return api('POST', url('/objects/check', scopeOf()), body, file instanceof Blob ? 'application/octet-stream' : 'text/plain');
    },
    // `scope: 'spaces'` (an environment page only) asks every space the viewer belongs to at once, each pointer with its
    // space; `has: 'place'` keeps only summaries with a place (plan-map-destination, "SDK and the host").
    async 'objects.search'({ q, scope: s, space, has }) {
      const p = objectSearchParams(module.id, { q, scope: s, space, has }, { scope, spaceId, moduleScopes: module.scope, keyed: Boolean(keyed) });
      if (guestToken) p.set('guest', guestToken);
      return (await api('GET', `/api/objects/search?${p}`)).summaries;
    },
    async spaces() {
      return (await api('GET', url('/spaces-data', 'spaces', { info: 1 }))).spaces;
    },
    // The address of a file an owner placed for this module (see the server's module files), in this module's place.
    async 'files.url'({ name }) {
      const n = String(name ?? '');
      if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,99}$/.test(n)) throw Object.assign(new Error('no such file'), { status: 400 });
      return url(`/files/${encodeURIComponent(n)}`, scopeOf());
    },
    async 'settings.get'() {
      return (await api('GET', url('/settings/values', scopeOf()))).values;
    },
    // AI (a module that declares the `ai` hook): whether this person may use it here, and a request the server answers.
    async 'ai.available'() {
      return api('GET', url('/ai', scopeOf()));
    },
    async 'ai.ask'({ task, question, objects }) {
      return api('POST', url('/ai', scopeOf()), { task: String(task ?? ''), question: String(question ?? '').slice(0, 1000), objects: Array.isArray(objects) ? objects.slice(0, 12) : [] });
    },
    // The signed-in person's own other calendars (a module that declares the `external` hook), read only: their events
    // between `from` and `to` (YYYY-MM-DD or ISO times), with the calendars they come from. A guest gets none.
    async 'external.events'({ from, to }) {
      if (!externalHere) return { calendars: [], events: [] };
      const when = (v) => (v === undefined || v === null || v === '' ? undefined : String(v).slice(0, 40));
      return api('GET', url('/external-events', scopeOf(), { from: when(from), to: when(to) }));
    },
    // Other modules' objects shown on a calendar as markers (host.objects.markers; plan-calendar-markers.md): the module's
    // own route, in the mount's place (the space, or the environment and the viewer's spaces) and as the guest. A keyed
    // page has none.
    async 'objects.markers'({ from, to }) {
      if (keyed) return [];
      const when = (v) => (v === undefined || v === null || v === '' ? undefined : String(v).slice(0, 40));
      return (await api('GET', url('/markers', scopeOf(), { from: when(from), to: when(to) }))).markers;
    },
    // Ask in this space's Chat (host.chat.ask). Only the canvas host provides it.
    async 'chat.ask'({ question, refs }) {
      if (typeof onChatAsk !== 'function') throw Object.assign(new Error(`Ask this from Chat in ${word('space', { a: true })}.`), { status: 400 });
      const q = String(question || '').trim().slice(0, 1000);
      if (!q) throw Object.assign(new Error('Type a question.'), { status: 400 });
      const list = (Array.isArray(refs) ? refs : []).filter(REF_SHAPE).slice(0, 12).map(cleanPointer);
      return onChatAsk({ question: q, refs: list });
    },
    // Uploaded pictures (a module whose manifest declares `uploads`): kept per scope, checked and cleaned by the server.
    async 'uploads.put'({ file, name, keepPosition, scope: s }) {
      if (!(file instanceof Blob)) throw Object.assign(new Error('send a picture'), { status: 400 });
      return (await api('POST', url('/uploads', scopeOf(s), { name: String(name ?? file.name ?? '').slice(0, 100), keepPosition: keepPosition ? '1' : '' }), file, file.type)).file;
    },
    async 'uploads.inspect'({ head, scope: s }) {
      if (!(head instanceof Blob)) throw Object.assign(new Error('send a picture'), { status: 400 });
      return api('POST', url('/uploads/inspect', scopeOf(s)), head.slice(0, 256 * 1024), head.type);
    },
    async 'uploads.thumb'({ id, file, scope: s }) {
      if (!(file instanceof Blob)) throw Object.assign(new Error('send a picture'), { status: 400 });
      return (await api('PUT', url(`/uploads/${encodeURIComponent(String(id ?? ''))}/thumb`, scopeOf(s)), file, file.type)).file;
    },
    async 'uploads.list'({ scope: s }) {
      return (await api('GET', url('/uploads', scopeOf(s)))).files;
    },
    async 'uploads.remove'({ id, scope: s }) {
      return api('DELETE', url(`/uploads/${encodeURIComponent(String(id ?? ''))}`, scopeOf(s)));
    },
    // The address to show a picture from (an <img> in the page), or its thumbnail.
    async 'uploads.url'({ id, thumb, scope: s }) {
      return url(`/uploads/${encodeURIComponent(String(id ?? ''))}${thumb ? '/thumb' : ''}`, scopeOf(s));
    },
    // Place search answered by the server (a module that declares `geocoder`): saved places first, then the chosen service.
    async 'geocode.search'({ q, lat, lon }) {
      return api('GET', url('/geocode', scopeOf(), { q: String(q ?? '').slice(0, 200), lat, lon }));
    },
    async 'geocode.used'({ key }) {
      return api('POST', url('/geocode/use', scopeOf()), { key: String(key ?? '') });
    },
    // A page's title, description and image, read by the server (a module with a linkPreviews setting).
    async 'preview.link'({ url: page }) {
      return api('POST', url('/link-preview', scopeOf()), { url: String(page ?? '').slice(0, 500) });
    },
    // The address of a link's picture, fetched by this server, for an <img> on the card.
    async 'preview.image'({ url: page }) {
      return url('/link-image', scopeOf(), { url: String(page ?? '').slice(0, 2000) });
    },
    // The people of the space this module is in: [{ key, name }], for a module that lets a person be chosen ("whose is it").
    // Empty on a module's environment page, which is not in one space.
    async people() {
      if (scope !== 'space' || !spaceId) return [];
      const q = guestToken ? `?guest=${encodeURIComponent(guestToken)}` : '';
      const { users, spaces } = await api('GET', `/api/presence${q}`);
      const members = new Set((spaces || []).find((r) => r.id === spaceId)?.members || []);
      return (users || []).filter((u) => members.has(u.key)).map((u) => ({ key: u.key, name: u.displayName }));
    },
    async schedule(spec) {
      return api('POST', url('/schedule', scopeOf(spec?.scope, spec?.space)), { ...spec, scope: undefined, space: undefined });
    },
    async cancelSchedule({ key, scope: s, space }) {
      return api('DELETE', url(`/schedule/${encodeURIComponent(key)}`, scopeOf(s, space)));
    },
    // `to: 'space'` is the space the call is in: this frame's, or the one named with { space }.
    async notify(spec) {
      return api('POST', url('/notify', scopeOf(spec?.scope, spec?.space)), { ...spec, scope: undefined, space: undefined });
    },
    // A destination's part changing the page's shared state (host.destination.set): only what its destination lets
    // this part set (see DESTINATIONS); the page passes it on to every part.
    async 'destination.set'({ patch }) {
      if (!destination) throw Object.assign(new Error('this is not part of a destination'), { status: 400 });
      return destination.hub.fromPart(destination.part, patch);
    },
    // The module's action bar: the host draws the buttons into `bar` and sends
    // clicks back as a 'bar' event.
    async 'bar.set'({ items }) {
      barItems = (Array.isArray(items) ? items : []).slice(0, 10).map((i) => ({
        id: String(i?.id ?? '').slice(0, 40),
        label: String(i?.label ?? '').slice(0, 30),
        icon: /^[a-z0-9-]{1,40}$/.test(i?.icon || '') ? i.icon : '',
        primary: Boolean(i?.primary),
        disabled: Boolean(i?.disabled),
        // An item can be a quick-add: a text field with a small + button. What is typed comes back with the click.
        input: i?.type === 'quickadd',
        iconOnly: Boolean(i?.iconOnly),
        placeholder: String(i?.placeholder ?? '').slice(0, 60),
        overflow: Boolean(i?.overflow) && i?.type !== 'quickadd',
      })).filter((i) => i.id && (i.label || i.input));
      if (bar) {
        bar.hidden = barItems.length === 0;
        if (!barObserver) {
          barObserver = new ResizeObserver(() => drawModuleBar());
          barObserver.observe(bar);
        }
        drawModuleBar();
      }
      if (onBar) onBar(barItems.length > 0);
      return true;
    },
    // Icon buttons in the module's titlebar, before the host's own buttons and set off by a pipe. Only a
    // host with a titlebar (a module on the canvas, or in its own window) has room for them: the answer says which,
    // so a module can keep its own controls in the page when it is not.
    async 'header.set'({ items }) {
      if (!header) return false;
      const clean = (Array.isArray(items) ? items : []).slice(0, 10).map((i) => ({
        id: String(i?.id ?? '').slice(0, 40),
        title: String(i?.title ?? '').slice(0, 40),
        icon: /^[a-z0-9-]{1,40}$/.test(i?.icon || '') ? i.icon : '',
        regular: Boolean(i?.regular),
        on: Boolean(i?.on),
        disabled: Boolean(i?.disabled),
        overflow: Boolean(i?.overflow),
      })).filter((i) => i.id && i.icon);
      const { shown, hidden } = splitOverflow(clean, 5);
      header.textContent = '';
      const doc = header.ownerDocument;
      if (hidden.length) {
        const more = drawMoreButton(doc, '', () => openHostMenu(more, hidden.map((item) => ({ ...item, onPick: () => send('header', { id: item.id }) }))));
        header.appendChild(more);
      }
      for (const item of shown) {
        const b = doc.createElement('button');
        b.type = 'button';
        b.className = `msg-btn${item.on ? ' on' : ''}`;
        b.title = item.title;
        b.setAttribute('aria-label', item.title || item.id);
        b.setAttribute('aria-pressed', String(item.on));
        b.disabled = item.disabled;
        const i = doc.createElement('i');
        i.className = `fa-${item.regular ? 'regular' : 'solid'} fa-${item.icon} fa-fw`;
        i.setAttribute('aria-hidden', 'true');
        b.appendChild(i);
        b.addEventListener('click', () => send('header', { id: item.id }));
        header.appendChild(b);
      }
      if (clean.length) {
        const pipe = doc.createElement('span');
        pipe.className = 'header-pipe';
        header.appendChild(pipe);
      }
      return true;
    },
    // An optional row under the titlebar: filters, tabs, a progress bar -- see host.toolbar.set.
    async 'toolbar.set'({ items }) {
      if (!toolbar) return false;
      const clean = (Array.isArray(items) ? items : []).slice(0, 12).map((i) => {
        if (i?.separator) return { separator: true };
        const type = ['tabs', 'text', 'progress', 'slider'].includes(i?.type) ? i.type : 'button';
        if (type === 'text') return { type, text: String(i?.text ?? '').slice(0, 80) };
        if (type === 'progress') return { type, value: Math.max(0, Math.min(100, Number(i?.value) || 0)), label: String(i?.label ?? '').slice(0, 40) };
        if (type === 'slider') {
          const min = Number.isFinite(Number(i?.min)) ? Number(i.min) : 0;
          const max = Number.isFinite(Number(i?.max)) ? Number(i.max) : 100;
          const step = Number.isFinite(Number(i?.step)) && Number(i.step) > 0 ? Number(i.step) : 1;
          return {
            type,
            id: String(i?.id ?? '').slice(0, 40),
            min,
            max: max > min ? max : min + 1,
            step,
            value: Math.max(min, Math.min(max, Number.isFinite(Number(i?.value)) ? Number(i.value) : min)),
            label: String(i?.label ?? '').slice(0, 40),
            disabled: Boolean(i?.disabled),
          };
        }
        if (type === 'tabs') {
          return {
            type,
            id: String(i?.id ?? '').slice(0, 40),
            value: String(i?.value ?? '').slice(0, 40),
            options: (Array.isArray(i?.options) ? i.options : []).slice(0, 8).map((o) => ({
              id: String(o?.id ?? '').slice(0, 40),
              label: String(o?.label ?? '').slice(0, 30),
              icon: /^[a-z0-9-]{1,40}$/.test(o?.icon || '') ? o.icon : '',
              regular: Boolean(o?.regular),
              iconOnly: Boolean(o?.iconOnly),
            })).filter((o) => o.id && (o.label || o.icon)),
          };
        }
        return {
          type: 'button',
          id: String(i?.id ?? '').slice(0, 40),
          label: String(i?.label ?? '').slice(0, 30),
          icon: /^[a-z0-9-]{1,40}$/.test(i?.icon || '') ? i.icon : '',
          on: Boolean(i?.on),
          primary: Boolean(i?.primary),
          disabled: Boolean(i?.disabled),
          overflow: Boolean(i?.overflow),
        };
      }).filter((i) => i.separator || i.type === 'text' || i.type === 'progress'
        || (i.type === 'slider' && i.id)
        || (i.type === 'tabs' && i.id && i.options.length)
        || (i.type === 'button' && i.id && (i.label || i.icon)));
      const doc = toolbar.ownerDocument;
      toolbar.textContent = '';
      const buttons = clean.filter((i) => i.type === 'button');
      const { shown, hidden: overflow } = splitOverflow(buttons, 5);
      const shownIds = new Set(shown.map((i) => i.id));
      let moreDrawn = false;
      const drawToolbarMore = () => {
        if (moreDrawn || !overflow.length) return;
        moreDrawn = true;
        const more = drawMoreButton(doc, '', () => openHostMenu(more, overflow.map((item) => ({ ...item, onPick: () => send('toolbar', { id: item.id }) }))));
        toolbar.appendChild(more);
      };
      for (const item of clean) {
        if (item.type === 'button' && !shownIds.has(item.id)) continue;
        if (item.type === 'button') drawToolbarMore();
        if (item.separator) { const s = doc.createElement('span'); s.className = 'tb-sep'; toolbar.appendChild(s); continue; }
        if (item.type === 'text') { const s = doc.createElement('span'); s.className = 'tb-text'; s.textContent = item.text; toolbar.appendChild(s); continue; }
        if (item.type === 'progress') {
          const wrap = doc.createElement('span');
          wrap.className = 'tb-progress';
          if (item.label) wrap.setAttribute('aria-label', item.label);
          const fill = doc.createElement('span');
          fill.className = 'tb-progress-fill';
          fill.style.width = `${item.value}%`;
          wrap.appendChild(fill);
          toolbar.appendChild(wrap);
          continue;
        }
        if (item.type === 'slider') {
          const wrap = doc.createElement('span');
          wrap.className = 'tb-slider';
          if (item.label) {
            const lbl = doc.createElement('span');
            lbl.className = 'tb-slider-label';
            lbl.textContent = item.label;
            wrap.appendChild(lbl);
          }
          const input = doc.createElement('input');
          input.type = 'range';
          input.min = String(item.min);
          input.max = String(item.max);
          input.step = String(item.step);
          input.value = String(item.value);
          input.disabled = item.disabled;
          input.setAttribute('aria-label', item.label || item.id);
          input.addEventListener('input', () => send('toolbar', { id: item.id, value: Number(input.value) }));
          wrap.appendChild(input);
          toolbar.appendChild(wrap);
          continue;
        }
        if (item.type === 'tabs') {
          // The shared view switch (hostSwitch, public/sdk/host.js): icon and word, icons only while the row is too narrow.
          const seg = doc.createElement('span');
          seg.className = 'tb-tabs';
          for (const opt of item.options) {
            const b = doc.createElement('button');
            b.type = 'button';
            window.hostSwitch.fill(b, opt);
            if (opt.id === item.value) b.classList.add('on');
            b.addEventListener('click', () => send('toolbar', { id: item.id, value: opt.id }));
            seg.appendChild(b);
          }
          toolbar.appendChild(seg);
          continue;
        }
        const b = doc.createElement('button');
        b.type = 'button';
        b.className = `tb-btn${item.primary ? ' primary' : ''}${item.on ? ' on' : ''}`;
        b.disabled = item.disabled;
        if (item.icon) {
          const i = doc.createElement('i');
          i.className = `fa-solid fa-${item.icon} fa-fw`;
          i.setAttribute('aria-hidden', 'true');
          b.appendChild(i);
          if (item.label) b.append(' ');
        }
        if (item.label) b.append(item.label);
        if (!item.icon && !item.label) { b.append(item.id); }
        b.setAttribute('aria-label', item.label || item.icon || item.id);
        // `x`: where the button starts across the module's own area, so a menu it opens can sit under it
        // (host.ui.toolbarButton hands the event to its onClick).
        b.addEventListener('click', () => {
          const box = (pageMode ? container : frame).getBoundingClientRect();
          send('toolbar', { id: item.id, x: Math.max(0, Math.round(b.getBoundingClientRect().left - box.left)) });
        });
        toolbar.appendChild(b);
      }
      drawToolbarMore();
      toolbar.hidden = clean.length === 0;
      window.hostSwitch.watch(toolbar);
      if (onToolbar) onToolbar(clean.length > 0);
      return true;
    },
    // The module's tools in the nav bars (host.nav.set): registered under the module's own namespace in the shared
    // registry (public/nav-bar.js), drawn while this mount lives (the module open on this space's canvas) and taken out when it is
    // destroyed. The set replaces the last one. Every tool goes in the space bar: a module never places one in the top
    // bar (plan-primary-nav.md, decision 10), and a tool that still says bar: 'primary' or system: true is placed like
    // any other; see cleanModuleTools for every rule. Resolves false when there is no space bar here (a module's own
    // page), and then nothing is drawn.
    async 'nav.set'({ tools }) {
      const clean = navBar.cleanModuleTools(module.id, tools);
      const wanted = new Set(clean.map((t) => t.id));
      for (const id of navIds) if (!wanted.has(id)) { navBar.unregister(id); navIds.delete(id); }
      let drawn = true;
      for (const t of clean) {
        if (!navBar.has(t.bar)) { drawn = false; continue; }
        const { own, module: _m, ...tool } = t;
        navBar.register({ ...tool, onClick: () => send('nav', { id: own }) });
        navIds.add(t.id);
      }
      return drawn;
    },
    async 'nav.setActive'({ id, on }) {
      const full = `${module.id}:${String(id ?? '')}`;
      return navIds.has(full) && navBar.setActive(full, Boolean(on));
    },
    async 'nav.setBadge'({ id, n }) {
      const full = `${module.id}:${String(id ?? '')}`;
      return navIds.has(full) && navBar.setBadge(full, Number(n) || 0);
    },
    // A drag of a pointer to one of this module's objects began or ended (see host.objects.drag).
    async 'objects.dragStart'({ ref }) {
      if (!REF_SHAPE(ref)) throw Object.assign(new Error('that is not a valid reference'), { status: 400 });
      beginDrag(mine, cleanPointer(ref));
      return true;
    },
    async 'objects.dragEnd'() {
      if (activeDrag && activeDrag.source === mine) endDrag();
      if (ptrDrag && ptrDrag.source === mine) ptrEnd();
      return true;
    },
    // A line for the on-screen trace (see the top of this file), from a module that was told tracing is on.
    async 'objects.trace'({ msg }) {
      trace(`${module.id}: ${String(msg).slice(0, 160)}`);
      return true;
    },
    // The pointer-driven drag (see host.objects.draggable): begin, move, and let go.
    // What is dragged is a pointer to one of this module's objects, or, for a module with nothing stored (an answer
    // the assistant wrote), a summary of it.
    async 'objects.ptrStart'({ ref, summary, label, x, y }) {
      const carried = ref ? null : cleanSummary(summary);
      if (ref && !REF_SHAPE(ref)) throw Object.assign(new Error('that is not a valid reference'), { status: 400 });
      if (!ref && !carried) throw Object.assign(new Error('nothing valid to drag: a reference or a summary with a title'), { status: 400 });
      ptrBegin(mine, ref ? { ref: cleanPointer(ref) } : { summary: carried }, label, Number(x) || 0, Number(y) || 0);
      return true;
    },
    async 'objects.ptrMove'({ x, y }) {
      if (ptrDrag && ptrDrag.source === mine) ptrMove(Number(x) || 0, Number(y) || 0);
      return true;
    },
    async 'objects.ptrDrop'({ x, y }) {
      if (ptrDrag && ptrDrag.source === mine) ptrDrop(Number(x) || 0, Number(y) || 0);
      return true;
    },
    async resize(size) {
      if (onResize) onResize(size || {});
      return true;
    },
    async setTitle({ title }) {
      if (onTitle) onTitle(String(title || '').slice(0, 80));
      return true;
    },
    // Who is online right now, everyone: the same roster the call page reads. For a page that follows
    // people (a keyed page about one of them, a dashboard) rather than the members of the space a module is in (`people`).
    // The asides are their own record (plan-names step 8), never among the spaces.
    async 'presence.get'() {
      return presenceForModule(await api('GET', `/api/presence${busGuest()}`));
    },
    // One person's picture in a slot (profile, player, character, talking ...), as a blob URL the module shows and
    // releases; null when they have none there. `space` asks for that space's own picture set, the way the call page does.
    async 'images.get'({ key, slot, space, fallback }) {
      const p = new URLSearchParams();
      if (space) p.set('space', String(space));
      if (fallback === 'none') p.set('fallback', 'none'); // the profile slot: the real photo only, not the initials plate
      if (guestToken) p.set('guest', guestToken);
      const res = await fetch(`/img/${encodeURIComponent(String(key ?? ''))}/${encodeURIComponent(String(slot ?? ''))}?${p}`, { headers: accessKeyHeaders() });
      if (!res.ok) return null;
      return URL.createObjectURL(await res.blob());
    },
    'images.release'({ url }) {
      if (typeof url === 'string' && url.startsWith('blob:')) URL.revokeObjectURL(url);
      return true;
    },
    // The server's access key (an owner's to see), for a module that builds links to a keyed page.
    async 'access.key'() {
      return (await api('GET', '/api/me')).streamKey || null;
    },
    async 'access.regenerate'() {
      return (await api('POST', '/api/stream-key/regenerate')).streamKey;
    },
    // A read-only viewer of one person's camera and microphone, following them from space to space. Page mode only:
    // the media elements are handed to the module's own handlers, which a frame could not receive.
    async 'media.watch'(params) {
      if (!pageMode) throw Object.assign(new Error('media.watch needs a module that runs in the page'), { status: 400 });
      return watchMedia(params);
    },
  };

  // Each frame has its own secret, handed to it in its address. Messages to the frame carry it, and
  // the SDK ignores any that do not, so another frame that can reach this one cannot pose as the host.
  // (Checking who sent a message is not enough: when the call has been popped out, this code runs in
  // a different window from the frame's parent.)
  const secret = Array.from(crypto.getRandomValues(new Uint8Array(12)), (b) => b.toString(16).padStart(2, '0')).join('');

  function reply(id, message) {
    frame.contentWindow?.postMessage({ host: 1, tk: secret, id, ...message }, '*');
  }

  async function onMessage(e) {
    if (pageMode || e.source !== frame.contentWindow) return; // only our own frame
    const m = e.data;
    if (!m || m.host !== 1 || typeof m.id !== 'number' || typeof m.method !== 'string') return;
    const handler = handlers[m.method];
    if (!handler) return reply(m.id, { error: { message: `unknown call ${m.method}`, status: 400 } });
    try {
      reply(m.id, { result: await handler(m.params || {}) });
    } catch (err) {
      reply(m.id, { error: { message: err.message, status: err.status, current: err.current } });
    }
  }
  // A frame's messages arrive in the window it lives in, which is not this one
  // when the call has been popped out.
  const hostWin = (pageMode ? container : frame).ownerDocument.defaultView || window;
  if (!pageMode) hostWin.addEventListener('message', onMessage);
  mounted.add(mine);
  // A destination's part hears the page's state on each change (the hello carried it as it was then).
  const leaveDestination = destination ? destination.hub.join(destination.part, (state) => deliver('destination', state)) : () => {};

  // Live changes: one stream per scope the frame can see. For a module in the page, an event goes
  // straight to its SDK.
  let sdkEmit = null;
  function send(event, data) {
    if (pageMode) {
      if (sdkEmit) sdkEmit(event, data);
      return;
    }
    frame.contentWindow?.postMessage({ host: 1, tk: secret, event, data }, '*');
  }
  // A module on a space's canvas hears that space and the environment; a module's environment page hears the
  // environment and the viewer's spaces (see the stream's scopes on the server). A keyed page has no session for the
  // event stream, so it asks after its settings now and then instead (the one live thing it needs).
  const leaveStream = keyed ? pollSettings() : joinStream(scope === 'space' ? spaceId : null, guestToken, (type, d) => {
    // The person's own other calendars changed (plan-google-calendar.md, Part 2): only the modules the server named,
    // those with the approved `external` hook, hear it, and ask again for what they show.
    if (type === 'external') {
      if (externalHere && Array.isArray(d.modules) && d.modules.includes(module.id)) send('external', {});
      return;
    }
    // An object of a marker kind changed (plan-calendar-markers.md): only the modules the server named, those approved
    // to show it, hear it, and ask again for what they show. No object data comes with it.
    if (type === 'markers') {
      if (Array.isArray(d.modules) && d.modules.includes(module.id)) send('markers', {});
      return;
    }
    if (type !== 'bus' && type !== 'action' && type !== 'refchange' && d.module !== module.id) return;
    const here = scope === 'space' ? 'space' : 'environment';
    if (type === 'change') send('change', { key: d.key, value: d.value, version: d.version, deleted: d.deleted, by: d.by, scope: d.scope, spaceId: d.spaceId });
    else if (type === 'refchange') {
      if (Array.isArray(d.modules) && d.modules.includes(module.id)) send('refchange', { ref: d.ref, change: d.change });
    }
    else if (type === 'links') send('links', { ref: d.ref });
    else if (type === 'settings') send('settings', { scope: d.scope });
    else if (type === 'bus') {
      // An event some module published: only the modules the server named may hear it, in their own place.
      if (Array.isArray(d.subscribers) && d.subscribers.includes(module.id) && d.scope === here) send('bus', { id: d.id, at: d.at, module: d.module, name: d.name, ref: d.ref, data: d.data });
    } else if (type === 'action') {
      // A request for this module to do something.
      if (d.provider === module.id && d.scope === here) send('action', { id: d.id, name: d.name, from: d.from, by: d.by });
    }
    else send('schedule', { key: d.key, payload: d.payload, scope: d.scope });
  });

  // The keyed page's stand-in for the event stream: its settings, compared every 10 seconds, a 'settings'
  // event when they changed (an admin adjusting the box while the stream is up).
  function pollSettings() {
    let last = null;
    const tick = async () => {
      try {
        const sig = JSON.stringify((await api('GET', url('/settings/values', 'environment'))).values);
        if (last !== null && sig !== last) send('settings', { scope: 'environment' });
        last = sig;
      } catch {
        // the next tick asks again
      }
    };
    const timer = setInterval(tick, 10000);
    tick();
    return () => clearInterval(timer);
  }

  // No same-origin: an opaque origin, no cookies, no host DOM. allow-forms lets a
  // module's own <form> fire its submit event (a sandboxed frame without it
  // swallows the submit, so a Save button appears to do nothing); the frame's
  // policy sets form-action 'none', so nothing can actually be submitted anywhere.
  if (!pageMode) {
    frame.setAttribute('sandbox', 'allow-scripts allow-forms');
    frame.setAttribute('referrerpolicy', 'no-referrer');
    frame.src = `/m/${encodeURIComponent(module.id)}/${encodeURIComponent(module.version)}/${entry}?tk=${secret}`;
  } else {
    startInPage().catch((err) => {
      container.textContent = `This ${word('module')} could not start: ${err.message}`;
    });
  }

  // A module running in the page: its styles, markup and script come from the server in parts, into a
  // shadow root on the container. Its page-wide selectors (html, body) mean the container, the theme
  // reaches it because CSS variables inherit into a shadow root, and it gets its own SDK, whose calls
  // go straight to the handlers above instead of through a frame. Nothing stops the module reaching
  // beyond that: it runs with the page's power.
  async function startInPage() {
    const scopeCss = (text) => text.replace(/:root\s*\{[^}]*\}/g, '').replace(/(^|[\s,}])(html|body)(?=[\s,{.:[])/g, '$1:host');
    const base = `/m/${encodeURIComponent(module.id)}/${encodeURIComponent(module.version)}/${entry}`;
    const text = async (url) => {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`${url} ${res.status}`);
      return res.text();
    };
    const [sdkCss, css, body] = await Promise.all([text('/sdk/host.css'), text(`${base}?part=css`), text(`${base}?part=body`)]);
    const root = container.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    style.textContent = scopeCss(sdkCss) + '\n' + scopeCss(css);
    root.appendChild(style);
    const tpl = document.createElement('template');
    tpl.innerHTML = body;
    root.appendChild(tpl.content);
    const call = (method, params) => {
      const handler = handlers[method];
      if (!handler) return Promise.reject(Object.assign(new Error(`unknown call ${method}`), { status: 400 }));
      return Promise.resolve().then(() => handler(params || {}));
    };
    const built = window.createHost({
      call,
      root,
      rootElement: container,
      // The pointer in the page's coordinates, in the module's own.
      localPoint: (x, y) => {
        const r = container.getBoundingClientRect();
        return { x: x - r.left, y: y - r.top };
      },
      // Points from the SDK are in the module's own coordinates; a shadow root wants the page's.
      elementAt: (pt) => {
        const r = container.getBoundingClientRect();
        return root.elementFromPoint(pt.x + r.left, pt.y + r.top);
      },
    });
    sdkEmit = built.emit;
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${base}?part=js&v=${encodeURIComponent(module.version)}`;
      script.host = built.host; // the module reads it from document.currentScript when it starts
      script.onload = () => { script.remove(); resolve(); };
      script.onerror = () => { script.remove(); reject(new Error('its script did not load')); };
      document.head.appendChild(script);
    });
  }

  return {
    send,
    // For tests: start a brokered drag of `ref` from this module, as its SDK would.
    beginDragForTest: (ref) => beginDrag(mine, ref),
    // For tests: run the pointer-driven drag from this module as its SDK would (steps: start, move, drop).
    ptrForTest: (step, ref, label, x, y) => (step === 'start' ? ptrBegin(mine, ref && ref.summary ? { summary: cleanSummary(ref.summary) } : { ref }, label, x, y) : step === 'move' ? ptrMove(x, y) : ptrDrop(x, y)),
    // An event for the module from the page (a pointer to open, objectopen; a place in its page, pagehash).
    deliver,
    destroy() {
      if (!pageMode) hostWin.removeEventListener('message', onMessage);
      sdkEmit = null;
      mounted.delete(mine);
      if (activeDrag && (activeDrag.source === mine || activeDrag.layers.some((l) => l.target === mine))) endDrag();
      if (ptrDrag && ptrDrag.source === mine) ptrEnd();
      for (const id of navIds) navBar.unregister(id); // its nav tools go with it
      navIds.clear();
      if (barObserver) { barObserver.disconnect(); barObserver = null; }
      leaveStream();
      leaveDestination();
      if (pageMode) container.shadowRoot?.replaceChildren();
      else frame.removeAttribute('src');
    },
  };
}
