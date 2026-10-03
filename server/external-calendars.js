// A person's other calendars (documentation/plans/plan-google-calendar.md, Part 2): the addresses they pasted, read
// through the private-address guard (server/link-preview.js), and the events read from them, kept in memory only and
// read again after a restart. One per environment (server/environment.js). The addresses are kept sealed in the store;
// this file opens one only to read it and to show its host. Nothing here names a provider or a module: a module reaches
// the events through the approved `external` hook (server/index.js).
'use strict';

const crypto = require('crypto');
const { EventEmitter } = require('events');
const { readCalendar, CalendarFileError } = require('./ics-read');
const { serverZone } = require('./ics');

const DAY = 24 * 60 * 60 * 1000;
const READ_EVERY_MS = 30 * 60 * 1000; // a calendar is read again after this
const REFRESH_GAP_MS = 60 * 1000; // Refresh, at most once a minute
const SEEN_FOR_MS = 14 * DAY; // read on the timer only for someone seen this recently
const BACK_MS = 30 * DAY;
const AHEAD_MS = 180 * DAY;

// Why a calendar could not be read, in plain words, by the PreviewError's code (server/link-preview.js) and the
// address's host. The host is the one the person pasted, never where a redirect went.
function problemSentence(code, host) {
  const where = host || 'The calendar\'s server';
  switch (code) {
    case 'blocked': return 'That address is not allowed.';
    case 'missing': return `${where} could not be found.`;
    case 'timeout': return `${where} took too long to answer.`;
    case 'unreachable': return `${where} could not be reached.`;
    case 'wrong': return `${where} said the address is wrong.`;
    case 'redirects': return `${where} sent the calendar elsewhere too many times.`;
    case 'big': return 'The calendar is larger than 5 MB.';
    case 'type': return 'The address did not give a calendar.';
    case 'complex': return 'The calendar is too complex to read.';
    case 'sealed': return 'This address can no longer be read here. Remove it and add it again.';
    default: return `${where} could not send the calendar just now.`;
  }
}

class ExternalCalendars extends EventEmitter {
  // `store`: the environment's (externalCalendarsOf, noteExternalCalendarRead, users). `open(sealed)`: the address, or
  // null. `fetch(url)`: the file's text, or a throw with a `code`. `now()`: the clock, for the check.
  constructor({ store, open, fetch, now = () => Date.now(), tz = () => serverZone() }) {
    super();
    this.setMaxListeners(0);
    this.store = store;
    this.open = open;
    this.fetch = fetch;
    this.now = now;
    this.tz = tz;
    this.cache = new Map(); // "<user key>|<id>" -> { events, readAt, error, triedAt, refreshedAt, print }
    this.reading = new Map(); // "<user key>|<id>" -> the read under way
    this.seen = new Map(); // user key -> when they last used a page that shows these
  }

  noteSeen(userKey) {
    if (userKey) this.seen.set(userKey, this.now());
  }

  // The address's host, or null when it cannot be opened.
  hostOf(calendar) {
    const url = this.open(calendar.url);
    try { return url ? new URL(url).hostname : null; } catch { return null; }
  }

  // Profile's list: never the address, only its host.
  view(userKey) {
    return this.store.externalCalendarsOf(userKey).map((c) => this.viewOne(userKey, c));
  }

  viewOne(userKey, c) {
    const kept = this.cache.get(`${userKey}|${c.id}`);
    const readAt = kept?.readAt ? new Date(kept.readAt).toISOString() : c.readAt || null;
    return { id: c.id, name: c.name, host: this.hostOf(c), readAt, error: kept ? kept.error : c.error || null };
  }

  // Seconds to wait before this calendar may be refreshed again, or 0.
  refreshWait(userKey, id) {
    const kept = this.cache.get(`${userKey}|${id}`);
    const since = kept?.refreshedAt ? this.now() - kept.refreshedAt : Infinity;
    return since >= REFRESH_GAP_MS ? 0 : Math.max(1, Math.ceil((REFRESH_GAP_MS - since) / 1000));
  }

  // Reads one calendar now (one read at a time each): answers { ok, error }. `refresh` counts it as a Refresh.
  read(userKey, id, { refresh = false } = {}) {
    const key = `${userKey}|${id}`;
    if (refresh) {
      const kept = this.cache.get(key) || { events: [], readAt: null, error: null, triedAt: 0, print: null };
      kept.refreshedAt = this.now();
      this.cache.set(key, kept);
    }
    if (this.reading.has(key)) return this.reading.get(key);
    const run = this.readNow(userKey, id).finally(() => this.reading.delete(key));
    this.reading.set(key, run);
    return run;
  }

  async readNow(userKey, id) {
    const key = `${userKey}|${id}`;
    const calendar = this.store.externalCalendarsOf(userKey).find((c) => c.id === id);
    if (!calendar) return { ok: false, error: null };
    const before = this.cache.get(key);
    const started = this.now();
    const url = this.open(calendar.url);
    let host = null;
    try { host = url ? new URL(url).hostname : null; } catch { host = null; }
    let events = before?.events || [];
    let error = null;
    let readAt = before?.readAt || null;
    try {
      if (!url) throw Object.assign(new Error('sealed'), { code: 'sealed' });
      const text = await this.fetch(url);
      const now = this.now();
      events = readCalendar(text, { from: now - BACK_MS, to: now + AHEAD_MS, now, tz: this.tz() });
      readAt = now;
    } catch (err) {
      error = problemSentence(err instanceof CalendarFileError ? err.code : err && err.code, host);
    }
    // Removed while it was being read: nothing is kept.
    if (!this.store.externalCalendarsOf(userKey).some((c) => c.id === id)) {
      this.cache.delete(key);
      return { ok: false, error: null };
    }
    const print = crypto.createHash('sha256').update(JSON.stringify(events)).digest('base64url');
    const kept = this.cache.get(key);
    this.cache.set(key, { events, readAt, error, triedAt: started, refreshedAt: kept?.refreshedAt || 0, print });
    this.store.noteExternalCalendarRead(userKey, id, { readAt: error ? null : new Date(readAt).toISOString(), error }, this.now());
    if (!before || before.print !== print || (before.error || null) !== error) this.emit('change', { userKey });
    return { ok: !error, error };
  }

  // Every calendar of this person not read since the server started, read now (not waited for).
  readMissing(userKey) {
    for (const c of this.store.externalCalendarsOf(userKey)) {
      const key = `${userKey}|${c.id}`;
      if (!this.cache.has(key) && !this.reading.has(key)) this.read(userKey, c.id).catch(() => {});
    }
  }

  // The timer's turn: each calendar not tried for 30 minutes, of everyone seen in the last 14 days. Answers the reads.
  refreshDue() {
    const now = this.now();
    const runs = [];
    for (const user of this.store.users) {
      const seen = this.seen.get(user.key);
      if (!seen || now - seen > SEEN_FOR_MS) continue;
      for (const c of this.store.externalCalendarsOf(user.key)) {
        const key = `${user.key}|${c.id}`;
        const kept = this.cache.get(key);
        if (this.reading.has(key) || (kept && now - kept.triedAt < READ_EVERY_MS)) continue;
        runs.push(this.read(user.key, c.id).catch(() => {}));
      }
    }
    // What belongs to nobody any more (a person removed, or a calendar removed elsewhere) is let go.
    for (const key of this.cache.keys()) {
      const [userKey, id] = key.split('|');
      if (!this.store.externalCalendarsOf(userKey).some((c) => c.id === id)) this.cache.delete(key);
    }
    for (const [userKey, at] of this.seen) if (now - at > SEEN_FOR_MS) this.seen.delete(userKey);
    return Promise.all(runs);
  }

  forget(userKey, id) {
    this.cache.delete(`${userKey}|${id}`);
    this.emit('change', { userKey });
  }

  // The person's own events between `from` and `to` (milliseconds, either may be null), with the calendars they come
  // from. Only calendars still on their record, so a removed one is never answered.
  eventsFor(userKey, { from = null, to = null } = {}) {
    const calendars = this.store.externalCalendarsOf(userKey);
    const events = [];
    for (const c of calendars) {
      const kept = this.cache.get(`${userKey}|${c.id}`);
      for (const e of kept?.events || []) {
        const startMs = e.allDay ? Date.parse(`${e.start}T00:00:00Z`) - DAY : Date.parse(e.start);
        const endMs = e.allDay ? Date.parse(`${e.end}T00:00:00Z`) + 2 * DAY : e.end ? Date.parse(e.end) : startMs;
        if ((to !== null && startMs >= to) || (from !== null && endMs < from)) continue;
        events.push({ calendar: c.id, ...e });
      }
    }
    return { calendars: calendars.map((c) => ({ id: c.id, name: c.name })), events };
  }
}

module.exports = { ExternalCalendars, problemSentence, READ_EVERY_MS, REFRESH_GAP_MS, SEEN_FOR_MS };
