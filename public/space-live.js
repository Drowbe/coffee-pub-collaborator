// The live stream (documentation/plans/plan-realtime-optional-livekit.md, step 2): one server-sent stream per space page,
// GET /api/live?space=<id>, open while the page is in a space or an aside. It says who is there (`presence`, the whole
// list on connect and on every change), and the page says its own state with PATCH /api/spaces/:id/presence (in the
// space is the stream being open; away, its message and on the call are said). space.js opens it on entering and closes
// it on leaving; who is here, the conference's "Not in a call" list, Start or Join call and the tiles' away read it.
//
// The stream drops (a network blip, a server restart): it is opened again after 2, 4, 8 seconds and so on, up to a
// minute between tries, for as long as the page stays in the space. Each opening is a new stream with a new id, so the
// page's state is said again on every `ready` (onReady). A refusal (401, 403 or 404 when asked again) or the server's
// `removed` ends it for good (onEnd); 429 (too many open) is tried again later, since an old stream of the same person
// may still be closing. Nothing here reads the page's globals: space.js hands in what it needs, so a check can run it
// against a stand-in EventSource and clock.

export const LIVE_RETRY_FIRST_MS = 2000;
export const LIVE_RETRY_MAX_MS = 60000;

// The wait before the `tries`th try again (1, 2, 3, ...): 2 s, 4 s, 8 s, ... never more than a minute.
export function liveRetryDelay(tries) {
  const n = Math.max(1, Math.floor(Number(tries) || 1));
  return Math.min(LIVE_RETRY_MAX_MS, LIVE_RETRY_FIRST_MS * 2 ** Math.min(n - 1, 16));
}

// The stream's address: the space (or aside); a guest adds their link's token and the name they gave.
export function liveStreamUrl({ space, guest = null, name = '' }) {
  const q = new URLSearchParams({ space });
  if (guest) {
    q.set('guest', guest);
    if (name) q.set('name', name);
  }
  return `/api/live?${q}`;
}

// The people of a `presence` event as who is here lists them: { key, name, you, onCall, away, awayMessage }, you first,
// then by name. `you` is the key the stream's `ready` gave; `youName` names you when the list does not have you yet (the
// first event is on its way, or the stream is reconnecting); `meOnCall` is the page's own say about the call (it knows
// before the server echoes it back).
export function peopleFromPresence(list, { you = null, youName = '', meOnCall = false } = {}) {
  const out = [];
  const others = [];
  let mine = null;
  for (const p of Array.isArray(list) ? list : []) {
    if (!p || typeof p.key !== 'string' || !p.key) continue;
    const person = { key: p.key, name: String(p.name || p.key), you: p.key === you, onCall: Boolean(p.onCall), away: Boolean(p.away), awayMessage: p.away ? String(p.awayMessage || '') : '' };
    if (person.you) mine = person;
    else others.push(person);
  }
  if (you) {
    const me = mine || { key: you, name: youName || you, you: true, onCall: false, away: false, awayMessage: '' };
    out.push({ ...me, onCall: Boolean(meOnCall) });
  }
  others.sort((a, b) => a.name.localeCompare(b.name));
  return out.concat(others);
}

// Open the stream. `url` is liveStreamUrl's; `onReady({ you, space, stream })` on every opening, `onPresence(people)` on
// every presence event for this space, `onState('live' | 'reconnecting')` as it goes, `onEnd({ reason, error })` once
// when it ends for good (never on close()). `probe(url)` answers the HTTP status of a fresh request (0 when the server
// was not reached), asked after a stream that never opened, to tell a refusal from a drop. Answers { close, ready }:
// `ready` is the last `ready`'s data while the stream is open, else null.
export function openLiveStream({ url, onReady = () => {}, onPresence = () => {}, onState = () => {}, onEnd = () => {}, probe = async () => 0, EventSourceImpl = globalThis.EventSource, schedule = (fn, ms) => setTimeout(fn, ms), cancel = (t) => clearTimeout(t) }) {
  let source = null;
  let timer = null;
  let tries = 0;
  let stopped = false;
  let ready = null;
  const stop = () => {
    stopped = true;
    ready = null;
    if (timer !== null) cancel(timer);
    timer = null;
    source?.close();
    source = null;
  };
  const end = (why) => {
    if (stopped) return;
    stop();
    onEnd(why);
  };
  const again = async (wasLive) => {
    ready = null;
    onState('reconnecting');
    if (!wasLive) {
      const status = await probe(url);
      if (stopped) return;
      if (status === 401 || status === 403 || status === 404) return end({ reason: 'refused', status });
    }
    tries += 1;
    timer = schedule(open, liveRetryDelay(tries));
  };
  function open() {
    timer = null;
    if (stopped) return;
    const es = new EventSourceImpl(url);
    let live = false;
    es.addEventListener('message', (event) => {
      if (source !== es) return;
      let data = null;
      try { data = JSON.parse(event.data); } catch { return; }
      if (!data || typeof data !== 'object') return;
      if (data.type === 'ready') {
        live = true;
        tries = 0;
        ready = { you: data.you, space: data.space, stream: data.stream };
        onState('live');
        onReady(ready);
      } else if (data.type === 'presence') {
        if (live && Array.isArray(data.people)) onPresence(data.people);
      } else if (data.type === 'removed') {
        end({ reason: data.reason || 'removed', error: data.error || '' });
      }
    });
    es.addEventListener('error', () => {
      if (source !== es) return;
      es.close();
      source = null;
      again(live);
    });
    source = es;
  }
  open();
  return { close: stop, get ready() { return ready; } };
}
