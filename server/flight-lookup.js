// The flight lookup (documentation/plans/plan-flight-lookup.md): one schedule for the whole server, learned from the flights
// people save in the Planner, and findFlights, the one function every lookup goes through.
//
// The schedule is a fact about a flight, never about a person: for each cleaned flight number (WN2483), up to 5 schedules,
// each the airline's name, the two airports' IATA codes, the local clock times at each, how many days after leaving it
// lands, the flight time, the departure terminal, the days of the week it was seen leaving and the latest day it was saved
// for. Never who saved it, which environment or space it came from, anyone's name, the seat, class, booking reference,
// cost, who paid, the people on it, the notes, the title or the gate: remember() reads only the listed fields out of what
// it is sent, and the file is written from those alone.
//
// File: flight-schedule.json in the root DATA_DIR (the host's on a hosted install, beside host.json; never an environment's
// folder). Kept in memory, written a moment after a change, through a temporary file and a rename.
//
// findFlights asks only the saved schedule today. An outside service, should one ever be added, goes inside it, switched on
// by an environment variable holding its key; nothing outside is asked now and no variable is read.
'use strict';

const fs = require('fs');
const path = require('path');
const airports = require('./airports');
const { cleanObject } = require('./object-format');

const FILE_NAME = 'flight-schedule.json';
const MAX_NUMBERS = 20000;
const MAX_SCHEDULES = 5; // for each number
const MAX_FILE_BYTES = 40 * 1024 * 1024; // 20,000 numbers of 5 schedules is far less; a larger file is not ours
const MAX_INPUT = 40; // longest number or date text read at all
const SAVE_MS = 2000;
const MAX_DAYS_AFTER = 7; // the Planner's rule for an arrival on the ticket: at most 7 days after leaving,
const MAX_DAYS_BEFORE = 1; // and at most a day before (across the date line)
const MAX_MINUTES = 10080;
const MAX_AIRLINE = 60;
const MAX_TERMINAL = 30;
const MAX_DAYS_AHEAD = 400; // a save for a flight further ahead than this is not kept (no airline sells that far out),
const MAX_DAYS_BACK = 3 * 365; // nor one further back than this: either would rank first, or never go, for years

class FlightLookupError extends Error {}

const oneLine = (s, n) => String(s == null ? '' : s).replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
const pad2 = (n) => String(n).padStart(2, '0');

// --- numbers and dates -------------------------------------------------------------------------------------------

// A flight number: an airline code (two letters or digits with at least one letter, or three letters) and 1 to 4 digits
// with an optional letter, spaces ignored, any case. Anchored, no nested repeats, read only from short text.
const NUMBER = /^(?:([A-Z0-9]{2})|([A-Z]{3}))(\d{1,4}[A-Z]?)$/;
function parseNumber(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_INPUT) return null;
  const s = raw.replace(/\s+/g, '').toUpperCase();
  const m = NUMBER.exec(s);
  if (!m) return null;
  const airline = m[1] || m[2];
  if (!/[A-Z]/.test(airline)) return null;
  return { key: `${airline}${m[3]}`, shown: `${airline} ${m[3]}` };
}
// The key a number is kept under (WN2483), or null.
const cleanNumber = (raw) => { const p = parseNumber(raw); return p ? p.key : null; };

const DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
// A real YYYY-MM-DD, or null.
function cleanDate(raw) {
  if (typeof raw !== 'string' || raw.length > MAX_INPUT) return null;
  const m = DATE.exec(raw.trim());
  if (!m) return null;
  const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return t.getUTCFullYear() === +m[1] && t.getUTCMonth() === +m[2] - 1 && t.getUTCDate() === +m[3] ? `${m[1]}-${m[2]}-${m[3]}` : null;
}
const dayMs = (date) => Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1, +date.slice(8, 10));
const addDays = (date, n) => new Date(dayMs(date) + n * 86400000).toISOString().slice(0, 10);
const daysFrom = (a, b) => Math.round((dayMs(b) - dayMs(a)) / 86400000);
const weekday = (date) => ((new Date(dayMs(date)).getUTCDay() + 6) % 7) + 1; // Monday 1 ... Sunday 7
const CLOCK = /^([01]\d|2[0-3]):([0-5]\d)$/;
const today = (now) => new Date(now).toISOString().slice(0, 10);

// --- one schedule, as kept ---------------------------------------------------------------------------------------

// A schedule rebuilt from the listed fields alone, every value checked, or null. Used for what is read from the file as
// well as what is remembered, so nothing else can ever be written back. `lastSeen` must lie within MAX_DAYS_BACK before
// and MAX_DAYS_AHEAD after the day `now` (ms) falls on: further back, null; further ahead, null for a save, and for what is
// read from the file (`clamp`) the furthest day allowed.
function cleanSchedule(r, { now = Date.now(), clamp = false } = {}) {
  if (!r || typeof r !== 'object' || Array.isArray(r)) return null;
  const from = typeof r.from === 'string' && /^[A-Z]{3}$/.test(r.from) ? r.from : null;
  const to = typeof r.to === 'string' && /^[A-Z]{3}$/.test(r.to) ? r.to : null;
  const departs = typeof r.departs === 'string' && CLOCK.test(r.departs) ? r.departs : null;
  const arrives = typeof r.arrives === 'string' && CLOCK.test(r.arrives) ? r.arrives : null;
  const days = Number.isInteger(r.days) && r.days >= -MAX_DAYS_BEFORE && r.days <= MAX_DAYS_AFTER ? r.days : null;
  let lastSeen = typeof r.lastSeen === 'string' ? cleanDate(r.lastSeen) : null;
  if (lastSeen) {
    const day = today(now);
    const ahead = daysFrom(day, lastSeen);
    if (ahead < -MAX_DAYS_BACK) lastSeen = null;
    else if (ahead > MAX_DAYS_AHEAD) lastSeen = clamp ? addDays(day, MAX_DAYS_AHEAD) : null;
  }
  if (!from || !to || !departs || !arrives || days === null || !lastSeen) return null;
  const weekdays = [...new Set((Array.isArray(r.weekdays) ? r.weekdays.slice(0, 7) : []).filter((d) => Number.isInteger(d) && d >= 1 && d <= 7))].sort((a, b) => a - b);
  const out = {};
  const airline = oneLine(r.airline, MAX_AIRLINE);
  if (airline) out.airline = airline;
  Object.assign(out, { from, to, departs, arrives, days });
  if (Number.isInteger(r.minutes) && r.minutes >= 1 && r.minutes <= MAX_MINUTES) out.minutes = r.minutes;
  const terminal = oneLine(r.terminal, MAX_TERMINAL);
  if (terminal) out.terminal = terminal;
  out.weekdays = weekdays.length ? weekdays : [weekday(lastSeen)];
  out.lastSeen = lastSeen;
  return out;
}

// The schedule part of a saved flight, in the objects format, or null when it cannot be kept: not a flight, a number that
// does not clean, an airport not in the list, no departure day and time, neither an arrival nor a flight time, or a
// departure more than MAX_DAYS_AHEAD after or MAX_DAYS_BACK before the day `now` (ms) falls on.
function scheduleFrom(object, now = Date.now()) {
  const o = cleanObject(object);
  if (!o || o.kind !== 'flight' || !o.details) return null;
  const d = o.details;
  const number = parseNumber(d.number);
  if (!number) return null;
  const from = airports.airport(d.from && d.from.code);
  const to = airports.airport(d.to && d.to.code);
  if (!from || !to) return null;
  const dep = typeof d.departs === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d.departs) ? d.departs : null;
  if (!dep) return null;
  const zones = !!(from.tz && to.tz);
  let arr = typeof d.arrives === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(d.arrives) ? d.arrives : null;
  let minutes = Number.isInteger(d.minutes) ? d.minutes : null;
  if (!arr && minutes && zones) arr = airports.arrivalFrom(dep, from.tz, minutes, to.tz);
  if (!arr) return null;
  if (zones) {
    const worked = airports.minutesBetween(dep, from.tz, arr, to.tz);
    if (worked === null || worked < 1 || worked > MAX_MINUTES) return null; // lands before it leaves: not a flight
    minutes = worked;
  }
  const date = dep.slice(0, 10);
  const days = daysFrom(date, arr.slice(0, 10));
  if (days < -MAX_DAYS_BEFORE || days > MAX_DAYS_AFTER) return null;
  const schedule = cleanSchedule({
    airline: d.airline, from: from.code, to: to.code, departs: dep.slice(11), arrives: arr.slice(11), days,
    minutes: minutes || undefined, terminal: d.terminal, weekdays: [weekday(date)], lastSeen: date,
  }, { now });
  return schedule ? { key: number.key, schedule } : null;
}

const sameSchedule = (a, b) => a.from === b.from && a.to === b.to && a.departs === b.departs && a.arrives === b.arrives;
const newest = (list) => list.reduce((m, s) => (s.lastSeen > m ? s.lastSeen : m), '');

// --- the schedule ------------------------------------------------------------------------------------------------

class FlightSchedule {
  // `dataDir`: the root DATA_DIR. Read once, here. `now`: the clock, as ms (the checks set it).
  constructor(dataDir, { now = () => Date.now() } = {}) {
    this.now = now;
    this.file = path.join(dataDir, FILE_NAME);
    this.numbers = new Map(); // key -> [schedule]
    this.timer = null;
    this.load();
  }

  load() {
    let text;
    try {
      if (fs.statSync(this.file).size > MAX_FILE_BYTES) {
        // Left as it is, and nothing is learned or written until the admin clears the schedule (clear() replaces it).
        console.error(`${FILE_NAME} is larger than expected; the flight schedule starts empty and the file is left as it is until it is cleared.`);
        this.readOnly = true;
        return;
      }
      text = fs.readFileSync(this.file, 'utf8');
    } catch (err) {
      if (err.code !== 'ENOENT') console.error(`could not read ${FILE_NAME}:`, err.message);
      return;
    }
    let raw = null;
    try { raw = JSON.parse(text); } catch { /* corrupt: below */ }
    if (!raw || typeof raw.numbers !== 'object' || !raw.numbers || Array.isArray(raw.numbers)) {
      this.setAside();
      return;
    }
    const numbers = raw.numbers;
    const now = this.now();
    for (const key of Object.keys(numbers)) {
      if (this.numbers.size >= MAX_NUMBERS) break;
      if (cleanNumber(key) !== key || !Array.isArray(numbers[key])) continue;
      const list = [];
      for (const r of numbers[key].slice(0, MAX_SCHEDULES)) {
        const s = cleanSchedule(r, { now, clamp: true });
        if (s && !list.some((x) => sameSchedule(x, s))) list.push(s);
      }
      if (list.length) this.numbers.set(key, list);
    }
  }

  // A file that is not a schedule is moved aside (flight-schedule.json.bad-<time>, mode 600) and the schedule starts empty,
  // so the next write cannot overwrite what someone may want to look at.
  setAside() {
    const aside = `${this.file}.bad-${new Date(this.now()).toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '')}`;
    try {
      fs.renameSync(this.file, aside);
      fs.chmodSync(aside, 0o600);
      console.error(`could not read ${FILE_NAME}: it is not a flight schedule; it was moved to ${path.basename(aside)} and the flight schedule starts empty.`);
    } catch (err) {
      // Not moved: keep it, and write nothing over it.
      console.error(`could not read ${FILE_NAME}: it is not a flight schedule, and moving it aside failed (${err.message}); the flight schedule starts empty and the file is left as it is until it is cleared.`);
      this.readOnly = true;
    }
  }

  save() {
    if (this.timer || this.readOnly) return;
    this.timer = setTimeout(() => { this.timer = null; this.write(); }, SAVE_MS);
  }

  write({ replace = false } = {}) {
    if (this.readOnly && !replace) return false;
    try {
      const numbers = {};
      const now = this.now();
      for (const [key, list] of this.numbers) {
        const kept = list.map((s) => cleanSchedule(s, { now, clamp: true })).filter(Boolean);
        if (kept.length) numbers[key] = kept;
      }
      fs.mkdirSync(path.dirname(this.file), { recursive: true });
      const tmp = `${this.file}.tmp`;
      fs.writeFileSync(tmp, JSON.stringify({ numbers }), { mode: 0o600 });
      fs.renameSync(tmp, this.file);
      return true;
    } catch (err) {
      console.error('could not save the flight schedule:', err.message);
      return false;
    }
  }

  // Write now, if a write is waiting (at shutdown).
  flush() {
    if (!this.timer) return;
    clearTimeout(this.timer);
    this.timer = null;
    this.write();
  }

  // Learn from a saved flight (an object in the objects format). True when it was kept; false when it could not be,
  // with nothing changed. Never throws on what it is sent.
  remember(object) {
    if (this.readOnly) return false; // nothing kept that would vanish at the next start
    const found = scheduleFrom(object, this.now());
    if (!found) return false;
    const { key, schedule } = found;
    const list = this.numbers.get(key) || [];
    const same = list.find((s) => sameSchedule(s, schedule));
    if (same) {
      same.weekdays = [...new Set([...same.weekdays, ...schedule.weekdays])].sort((a, b) => a - b);
      // A save for the same day or later brings its airline and terminal, when it has them, its day count and flight time;
      // an older one only adds its weekday.
      if (schedule.lastSeen >= same.lastSeen) {
        same.lastSeen = schedule.lastSeen;
        if (schedule.airline) same.airline = schedule.airline;
        if (schedule.terminal) same.terminal = schedule.terminal;
        same.days = schedule.days;
        if (schedule.minutes) same.minutes = schedule.minutes;
      }
    } else {
      list.push(schedule);
      // Past 5, the one seen least recently goes.
      while (list.length > MAX_SCHEDULES) {
        let oldest = 0;
        for (let i = 1; i < list.length; i += 1) if (list[i].lastSeen < list[oldest].lastSeen) oldest = i;
        list.splice(oldest, 1);
      }
    }
    this.numbers.set(key, list);
    // Past 20,000 numbers, the one seen least recently goes (never the one just saved).
    while (this.numbers.size > MAX_NUMBERS) {
      let drop = null;
      let dropSeen = null;
      for (const [k, l] of this.numbers) {
        if (k === key) continue;
        const seen = newest(l);
        if (dropSeen === null || seen < dropSeen) { drop = k; dropSeen = seen; }
      }
      if (drop === null) break;
      this.numbers.delete(drop);
    }
    this.save();
    return true;
  }

  // The schedules kept for a number (any form that cleans), copies, or an empty list.
  schedulesFor(number) {
    const key = cleanNumber(number);
    const list = key ? this.numbers.get(key) : null;
    return list ? list.map((s) => ({ ...s, weekdays: [...s.weekdays] })) : [];
  }

  // Forget one number. True when it was there.
  forget(number) {
    const key = cleanNumber(number);
    if (!key || !this.numbers.has(key)) return false;
    this.numbers.delete(key);
    this.save();
    return true;
  }

  // Forget everything. Returns how many numbers went, or null when a file that was left as it is (too large, or not a
  // schedule and not moved aside) could not be replaced. Clearing is the admin's own act, so such a file is replaced now
  // with an empty schedule, and the schedule learns again from then on.
  clear() {
    const n = this.numbers.size;
    this.numbers.clear();
    if (this.readOnly) {
      if (this.timer) { clearTimeout(this.timer); this.timer = null; }
      if (!this.write({ replace: true })) return null;
      this.readOnly = false;
      return n;
    }
    this.save();
    return n;
  }

  // The counts only.
  stats() {
    let schedules = 0;
    for (const list of this.numbers.values()) schedules += list.length;
    return { numbers: this.numbers.size, schedules };
  }
}

// --- the answer ----------------------------------------------------------------------------------------------------

const pointFor = (code) => {
  const a = airports.airport(code);
  return { point: { code, name: a ? airports.displayName(a) : code }, airport: a };
};

// One entry of the answer: the saved schedule put on the asked date, as a flight in the objects format.
function entryFor(shown, s, date) {
  const from = pointFor(s.from);
  const to = pointFor(s.to);
  const departs = `${date}T${s.departs}`;
  const arrives = `${addDays(date, s.days)}T${s.arrives}`;
  let minutes = from.airport && to.airport && from.airport.tz && to.airport.tz ? airports.minutesBetween(departs, from.airport.tz, arrives, to.airport.tz) : null;
  if (!(Number.isInteger(minutes) && minutes >= 1 && minutes <= MAX_MINUTES)) minutes = s.minutes;
  const place = (to.airport && to.airport.city) || to.point.name;
  const details = { airline: s.airline, number: shown, from: from.point, to: to.point, departs, arrives, minutes, terminal: s.terminal };
  const object = cleanObject({ icon: 'plane', kind: 'flight', title: `Flight to ${place}`, date, details });
  return { object, line: `${s.from} ${s.departs} to ${s.to} ${s.arrives}`, sameWeekday: s.weekdays.includes(weekday(date)), lastSeen: s.lastSeen.slice(0, 7) };
}

// The flights known for a number on a date: [{ object, line, sameWeekday, lastSeen }], those that fly on that day of the
// week first, then the most recently seen. Empty when nothing is known. Throws FlightLookupError('bad number' or 'bad
// date') when either cannot be read. `schedule`: a FlightSchedule. Async, so an outside service can be added here later
// without changing its callers.
async function findFlights({ number, date, schedule } = {}) {
  const parsed = parseNumber(number);
  if (!parsed) throw new FlightLookupError('bad number');
  const day = cleanDate(date);
  if (!day) throw new FlightLookupError('bad date');
  const list = schedule ? schedule.schedulesFor(parsed.key) : [];
  const wd = weekday(day);
  const ranked = list
    .map((s) => ({ s, same: s.weekdays.includes(wd) }))
    .sort((a, b) => (a.same === b.same ? (a.s.lastSeen < b.s.lastSeen ? 1 : a.s.lastSeen > b.s.lastSeen ? -1 : 0) : a.same ? -1 : 1));
  return ranked.map(({ s }) => entryFor(parsed.shown, s, day)).filter((e) => e.object);
}

module.exports = {
  FlightSchedule, FlightLookupError, findFlights, cleanNumber, parseNumber, cleanDate, cleanSchedule, scheduleFrom,
  FILE_NAME, MAX_NUMBERS, MAX_SCHEDULES,
};
