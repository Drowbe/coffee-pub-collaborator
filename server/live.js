// The live register (documentation/plans/plan-realtime-optional-livekit.md, "The presence register"): who is on the
// site, who is in which space, who says they are on the call, and who is away, per environment and in memory only.
// Pure: no timers, no requests, no LiveKit; the clock is handed in, so a check can run every rule on its own. The
// routes in server/index.js (GET /api/live, PATCH /api/spaces/:id/presence, POST and GET /api/presence, GET
// /api/status) keep one register per environment and tell the open streams when something changed.
//
// Five things are held:
//   - streams: one entry per open live stream, { id, who, name, guest, space, onCall, openedAt }. `who` is a person's
//     key or a guest's id; `space` is a space's or an aside's id, or null for a page in no space (Home).
//   - left: a person whose last stream for a space closed, { who, name, guest, space, openedAt, until }. They still read
//     as in that space until `until` (the grace), so a reload or a short drop does not read as leaving. Never on the call.
//   - away: per person and space, { away, awayMessage }, kept while they are there (a stream or the grace).
//   - beats: the page heartbeat (POST /api/presence), per person: on the site for siteMs after the last.
//   - held: nudges (an aside's, a kick's) for someone whose stream was reconnecting, kept for holdMs (30 seconds).
//
// A person is in the space of their most recently opened stream that is in a space; with none open, the space they
// left last, while its grace runs. They are on the call while one of their open streams there says so; a stream's word goes
// with it when it closes.
'use strict';

const crypto = require('crypto');

const GRACE_MS = 15 * 1000;
const SITE_MS = 75 * 1000;
const AWAY_MESSAGE_MAX = 200;
const NUDGE_HOLD_MS = 30 * 1000;

const pairKey = (who, space) => `${who}\u0000${space}`;

class LiveRegister {
  constructor({ now = Date.now, graceMs = GRACE_MS, siteMs = SITE_MS, holdMs = NUDGE_HOLD_MS, makeId } = {}) {
    this.now = now;
    this.graceMs = graceMs;
    this.siteMs = siteMs;
    this.holdMs = holdMs;
    this.held = []; // nudges for a stream that is reconnecting: { who, space, data, until }
    // A stream's id is a guest's proof that the stream is theirs (PATCH /api/spaces/:id/presence), so it can't be guessed.
    this.makeId = makeId || (() => crypto.randomBytes(12).toString('base64url'));
    this.streams = new Map(); // id -> entry
    this.left = new Map(); // pairKey -> { who, name, guest, space, openedAt, until }
    this.away = new Map(); // pairKey -> { away, awayMessage }
    this.beats = new Map(); // who -> time
    this.order = 0; // ties in openedAt are broken by the order of opening
  }

  // A live stream opened: its id.
  open({ who, name = '', guest = false, space = null }) {
    const id = this.makeId();
    const at = this.now();
    this.order += 1;
    if (space) this.left.delete(pairKey(who, space));
    this.streams.set(id, { id, who, name, guest: Boolean(guest), space: space || null, onCall: false, openedAt: at, seq: this.order });
    return id;
  }

  // A live stream closed: { who, space, until } (until: when its grace ends, or 0 when another stream still holds the
  // person there), or null when no such stream was open. Its word about the call goes with it.
  close(id) {
    const entry = this.streams.get(id);
    if (!entry) return null;
    this.streams.delete(id);
    if (!entry.space) return { who: entry.who, space: null, until: 0 };
    if (this.openFor(entry.who, entry.space).length) return { who: entry.who, space: entry.space, until: 0 };
    const until = this.now() + this.graceMs;
    this.order += 1; // among graces, the one left last is where they were
    this.left.set(pairKey(entry.who, entry.space), { who: entry.who, name: entry.name, guest: entry.guest, space: entry.space, openedAt: entry.openedAt, seq: this.order, until });
    return { who: entry.who, space: entry.space, until };
  }

  // The page heartbeat (POST /api/presence).
  beat(who) {
    this.beats.set(who, this.now());
  }

  stream(id) {
    return this.streams.get(id) || null;
  }

  openFor(who, space) {
    return [...this.streams.values()].filter((e) => e.who === who && e.space === space);
  }

  // Whether `who` is here at all (a stream open for `space`, or its grace still running).
  isThere(who, space) {
    this.sweep();
    return this.openFor(who, space).length > 0 || this.left.has(pairKey(who, space));
  }

  // The page's word, for `who` in `space`: { away?, awayMessage?, onCall? }. `onCall` goes on the stream `streamId`
  // when one is named (it must be theirs, in that space), else on every stream of theirs there. Answers whether
  // anything changed, or null when they are not there (no open stream for that space, or not that stream).
  set(who, space, patch, streamId = null) {
    let targets = this.openFor(who, space);
    if (streamId) targets = targets.filter((e) => e.id === streamId);
    if (!targets.length) return null;
    let changed = false;
    if (typeof patch.onCall === 'boolean') {
      for (const e of targets) {
        if (e.onCall !== patch.onCall) changed = true;
        e.onCall = patch.onCall;
      }
    }
    if (typeof patch.away === 'boolean' || typeof patch.awayMessage === 'string') {
      const key = pairKey(who, space);
      const was = this.away.get(key) || { away: false, awayMessage: '' };
      const next = {
        away: typeof patch.away === 'boolean' ? patch.away : was.away,
        awayMessage: typeof patch.awayMessage === 'string' ? cleanAwayMessage(patch.awayMessage) : was.awayMessage,
      };
      if (!next.away && typeof patch.awayMessage !== 'string') next.awayMessage = '';
      if (next.away !== was.away || next.awayMessage !== was.awayMessage) changed = true;
      if (next.away || next.awayMessage) this.away.set(key, next);
      else this.away.delete(key);
    }
    return changed;
  }

  // Take `who` out of `space` now, with no grace (a kick): their away there goes too. Their streams there are ended by
  // the caller; this is for the grace that closing them leaves.
  leave(who, space) {
    this.left.delete(pairKey(who, space));
    this.away.delete(pairKey(who, space));
  }

  // A nudge (an aside's pull, return or recall, or a kick's `removed`) for `who` in `space` whose stream there is
  // reconnecting: kept for NUDGE_HOLD_MS and handed to the next stream they open there (takeHeld). Only while they are
  // still there (the grace); answers whether it was kept.
  hold(who, space, data) {
    this.sweep();
    if (!this.left.has(pairKey(who, space))) return false;
    this.held.push({ who, space, data, until: this.now() + this.holdMs });
    return true;
  }

  // The nudges kept for `who` in `space`, oldest first, taken (each is handed over once).
  takeHeld(who, space) {
    this.sweep();
    const mine = this.held.filter((h) => h.who === who && h.space === space);
    if (mine.length) this.held = this.held.filter((h) => !mine.includes(h));
    return mine.map((h) => h.data);
  }

  // Graces that ran out go, with the away state of whoever is no longer there; so do nudges kept too long.
  sweep() {
    const now = this.now();
    if (this.held.length) this.held = this.held.filter((h) => h.until > now);
    for (const [key, l] of this.left) if (l.until <= now) this.left.delete(key);
    for (const key of this.away.keys()) {
      const [who, space] = key.split('\u0000');
      if (!this.left.has(key) && !this.openFor(who, space).length) this.away.delete(key);
    }
    for (const [who, at] of this.beats) if (now - at >= this.siteMs) this.beats.delete(who);
  }

  // On the site: a live stream open (in a space or not), a grace running, or a heartbeat within siteMs.
  onSite(who) {
    this.sweep();
    if ([...this.streams.values()].some((e) => e.who === who)) return true;
    if ([...this.left.values()].some((l) => l.who === who)) return true;
    return this.beats.has(who);
  }

  // Where `who` is: { space, onCall, away, awayMessage, since, name, guest }, or null when in no space.
  placeOf(who) {
    this.sweep();
    const latest = (list) => list.reduce((best, e) => (!best || e.seq > best.seq ? e : best), null);
    const open = latest([...this.streams.values()].filter((e) => e.who === who && e.space));
    const from = open || latest([...this.left.values()].filter((l) => l.who === who));
    if (!from) return null;
    const onCall = this.openFor(who, from.space).some((e) => e.onCall);
    const away = this.away.get(pairKey(who, from.space)) || { away: false, awayMessage: '' };
    return { space: from.space, onCall, away: away.away, awayMessage: away.awayMessage, since: from.openedAt, name: from.name, guest: from.guest };
  }

  // Everyone in a space: who -> placeOf(who).
  places() {
    this.sweep();
    const whos = new Set([...[...this.streams.values()].filter((e) => e.space).map((e) => e.who), ...[...this.left.values()].map((l) => l.who)]);
    const out = new Map();
    for (const who of whos) {
      const place = this.placeOf(who);
      if (place) out.set(who, place);
    }
    return out;
  }

  // The people in `space`, as the live stream's presence event lists them: [{ key, name, guest, onCall, away,
  // awayMessage }], in the order they came.
  people(space) {
    return [...this.places()]
      .filter(([, p]) => p.space === space)
      .sort((a, b) => a[1].since - b[1].since)
      .map(([key, p]) => ({ key, name: p.name, guest: p.guest, onCall: p.onCall, away: p.away, awayMessage: p.awayMessage }));
  }
}

function cleanAwayMessage(text) {
  return String(text).replace(/\s+/g, ' ').trim().slice(0, AWAY_MESSAGE_MAX);
}

// Who is where, for GET /api/presence and GET /api/status: the register's places, with the call service's list merged
// in. `places` is LiveRegister.places(); `call` is the call service's participants ([{ key, name, space, call, joinedAt,
// inCall, micOn, cameraOn }], or [] with no call service). Answers key -> { key, name, space, call, joinedAt, inCall,
// micOn, cameraOn }, the shape presenceView() and GET /api/status read.
//   - The register says where a person is. They are on the call when their page says so, or when the call service has
//     them on that space's call; the microphone and camera come from the call service only for that call.
//   - Someone the call service has and the register does not (a page that enters through the call service, until the
//     space page opens the live stream) reads as the call service says.
function mergeCall(places, call = []) {
  const byKey = new Map();
  for (const p of call) if (!byKey.has(p.key)) byKey.set(p.key, p);
  const out = new Map();
  for (const [key, place] of places) {
    const there = byKey.get(key);
    const same = there && there.space === place.space ? there : null;
    const inCall = Boolean(place.onCall || (same && same.inCall));
    out.set(key, {
      key,
      name: (same && same.name) || place.name,
      space: place.space,
      call: same ? same.call : undefined,
      joinedAt: same ? same.joinedAt : place.since,
      inCall,
      micOn: Boolean(inCall && same && same.micOn),
      cameraOn: Boolean(inCall && same && same.cameraOn),
    });
  }
  for (const [key, p] of byKey) if (!out.has(key)) out.set(key, p);
  return out;
}

module.exports = { LiveRegister, mergeCall, cleanAwayMessage, GRACE_MS, SITE_MS, AWAY_MESSAGE_MAX, NUDGE_HOLD_MS };
