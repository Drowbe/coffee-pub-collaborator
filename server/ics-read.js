// Reading iCalendar (RFC 5545) from a person's other calendar (documentation/plans/plan-google-calendar.md, Part 2).
// Pure: the caller hands in the file's text and a window, and gets back the events in it, each occurrence of a repeat
// on its own. It reads VEVENT with DTSTART, DTEND or DURATION, RRULE, RDATE, EXDATE, RECURRENCE-ID and TZID (a zone
// Intl knows, else the file's own VTIMEZONE, else the calendar's X-WR-TIMEZONE, else the server's). Repeats are
// worked out on the wall clock of the event's zone, so a weekly 18:00 stays 18:00 across a change of daylight saving.
// Nothing here names a provider or a module.
'use strict';

const { offsetAt, serverZone } = require('./ics');

const DAY = 24 * 60 * 60 * 1000;
const MAX_EVENTS = 2000; // per calendar
const MAX_COMPONENTS = 20000; // VEVENTs read from one file
const MAX_PERIODS = 50000; // periods one repeat may walk through
// The work one file may cost, so a small file of repeats that never land cannot hold up the server: the periods every
// repeat in it walks through together, the limit that matters, the same on any machine; and, only as a backstop, the
// time spent working them out, generous so a slow machine (a Raspberry Pi) still reads real calendars. Past either,
// the file is refused.
const WORK_PERIODS = 200000;
const WORK_MS = 1500;
const WEEKDAYS = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
const FREQS = ['DAILY', 'WEEKLY', 'MONTHLY', 'YEARLY'];

class CalendarFileError extends Error {
  constructor(message, code = 'type') {
    super(message);
    this.code = code; // 'type': not a calendar; 'complex': more work than one file may cost
  }
}
const tooComplex = () => new CalendarFileError('the calendar is too complex to read', 'complex');
// One period walked, against the file's budget: { left, deadline }.
function spend(budget) {
  if (!budget) return;
  budget.left -= 1;
  if (budget.left <= 0) throw tooComplex();
  if ((budget.left & 1023) === 0 && Date.now() > budget.deadline) throw tooComplex();
}

// --- lines ---------------------------------------------------------------------------------------------------------

// Logical lines: CRLF, LF or CR endings, a line starting with a space or a tab continuing the one before.
function unfold(text) {
  const out = [];
  for (const line of String(text).replace(/^﻿/, '').split(/\r\n|\n|\r/)) {
    if ((line[0] === ' ' || line[0] === '\t') && out.length) out[out.length - 1] += line.slice(1);
    else if (line) out.push(line);
  }
  return out;
}

// One content line as { name, params, value }, or null when it is not one. A parameter's quoted value may hold ; : ,
function parseLine(line) {
  const n = line.length;
  let i = 0;
  while (i < n && line[i] !== ';' && line[i] !== ':') i += 1;
  const name = line.slice(0, i).toUpperCase();
  if (!name) return null;
  const params = {};
  while (i < n && line[i] === ';') {
    i += 1;
    const from = i;
    while (i < n && line[i] !== '=' && line[i] !== ';' && line[i] !== ':') i += 1;
    const key = line.slice(from, i).toUpperCase();
    const parts = [];
    if (line[i] === '=') {
      i += 1;
      for (;;) {
        if (line[i] === '"') {
          const end = line.indexOf('"', i + 1);
          if (end < 0) return null;
          parts.push(line.slice(i + 1, end));
          i = end + 1;
        } else {
          const start = i;
          while (i < n && line[i] !== ',' && line[i] !== ';' && line[i] !== ':') i += 1;
          parts.push(line.slice(start, i));
        }
        if (line[i] === ',') { i += 1; continue; }
        break;
      }
    }
    if (key) params[key] = parts.join(',');
  }
  if (line[i] !== ':') return null;
  return { name, params, value: line.slice(i + 1) };
}

const unescapeText = (v) => String(v).replace(/\\([\\;,nN])/g, (_, c) => (c === 'n' || c === 'N' ? '\n' : c));

// The calendar's components: its own properties, its VEVENTs and its VTIMEZONEs, each with its properties by name. A
// component nested in an event (a VALARM) is skipped, so its DESCRIPTION never stands in for the event's.
function components(text) {
  const lines = unfold(text);
  const stack = [];
  const calendar = {};
  const events = [];
  const zones = [];
  let event = null;
  let zone = null;
  let observance = null;
  let seenCalendar = false;
  for (const raw of lines) {
    const line = parseLine(raw);
    if (!line) continue;
    if (line.name === 'BEGIN') {
      const what = line.value.trim().toUpperCase();
      const parent = stack[stack.length - 1];
      stack.push(what);
      if (what === 'VCALENDAR' && stack.length === 1) seenCalendar = true;
      else if (what === 'VEVENT' && parent === 'VCALENDAR') {
        if (events.length >= MAX_COMPONENTS) throw new CalendarFileError('too many events');
        event = {};
      } else if (what === 'VTIMEZONE' && parent === 'VCALENDAR') zone = { props: {}, observances: [] };
      else if ((what === 'STANDARD' || what === 'DAYLIGHT') && parent === 'VTIMEZONE' && zone) observance = {};
      if (stack.length > 8) throw new CalendarFileError('nested too deep');
      continue;
    }
    if (line.name === 'END') {
      const what = stack.pop();
      if (what === 'VEVENT' && event && stack[stack.length - 1] === 'VCALENDAR') { events.push(event); event = null; }
      else if (what === 'VTIMEZONE' && zone) { zones.push(zone); zone = null; }
      else if ((what === 'STANDARD' || what === 'DAYLIGHT') && observance && zone) { zone.observances.push(observance); observance = null; }
      continue;
    }
    const top = stack[stack.length - 1];
    const into = top === 'VEVENT' && stack.length === 2 ? event
      : top === 'VCALENDAR' && stack.length === 1 ? calendar
        : (top === 'STANDARD' || top === 'DAYLIGHT') && observance ? observance
          : top === 'VTIMEZONE' && zone ? zone.props : null;
    if (into) (into[line.name] ||= []).push(line);
  }
  if (!seenCalendar) throw new CalendarFileError('not a calendar');
  return { calendar, events, zones };
}

// --- dates and zones -----------------------------------------------------------------------------------------------

const DATE_RE = /^(\d{4})(\d{2})(\d{2})$/;
const DATE_TIME_RE = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})(Z?)$/;
const dayNumber = (y, m, d) => Math.floor(Date.UTC(y, m - 1, d) / DAY);
const ymdOfDay = (day) => new Date(day * DAY).toISOString().slice(0, 10);
const validDate = (y, m, d) => m >= 1 && m <= 12 && d >= 1 && d <= 31 && new Date(Date.UTC(y, m - 1, d)).getUTCDate() === d;

const zoneNames = new Map();
function knownZone(name) {
  if (typeof name !== 'string' || !name || name.length > 64) return null;
  if (zoneNames.has(name)) return zoneNames.get(name);
  let found = null;
  try {
    found = new Intl.DateTimeFormat('en-US', { timeZone: name }).resolvedOptions().timeZone;
  } catch {
    found = null;
  }
  zoneNames.set(name, found);
  return found;
}

// One value as { allDay, wall } (wall: milliseconds of the wall-clock time read as if it were UTC) with its zone:
// 'UTC' for a time ending in Z, else the TZID's zone, else the calendar's. Null when it is not a date.
function readValue(value, params, zoneFor) {
  const text = String(value || '').trim();
  let m = DATE_RE.exec(text);
  if (m && (params.VALUE || 'DATE').toUpperCase() === 'DATE') {
    const [y, mo, d] = [+m[1], +m[2], +m[3]];
    if (!validDate(y, mo, d)) return null;
    return { allDay: true, wall: dayNumber(y, mo, d) * DAY, zone: null };
  }
  m = DATE_TIME_RE.exec(text);
  if (!m) return null;
  const [y, mo, d, hh, mi, ss] = [+m[1], +m[2], +m[3], +m[4], +m[5], +m[6]];
  if (!validDate(y, mo, d) || hh > 23 || mi > 59 || ss > 60) return null;
  const wall = Date.UTC(y, mo - 1, d, hh, mi, Math.min(ss, 59));
  return { allDay: false, wall, zone: m[7] ? UTC_ZONE : zoneFor(params.TZID) };
}

// A zone turns a wall-clock time into an instant.
const UTC_ZONE = { instant: (wall) => wall };
// Asking Intl for a zone's offset is slow, and a file asks thousands of times: offsets change only on a quarter hour,
// so each quarter hour's is asked once per zone.
const offsetCache = new Map(); // zone -> Map(quarter hour -> minutes)
function cachedOffset(ms, tz) {
  let byZone = offsetCache.get(tz);
  if (!byZone) { byZone = new Map(); offsetCache.set(tz, byZone); }
  const quarter = Math.floor(ms / 900000);
  let minutes = byZone.get(quarter);
  if (minutes === undefined) {
    if (byZone.size > 100000) byZone.clear();
    minutes = offsetAt(quarter * 900000, tz);
    byZone.set(quarter, minutes);
  }
  return minutes;
}
function intlZone(tz) {
  return {
    tz,
    instant(wall) {
      let ms = wall - cachedOffset(wall, tz) * 60000;
      ms = wall - cachedOffset(ms, tz) * 60000;
      return ms;
    },
  };
}
const offsetMinutes = (text) => {
  const m = /^([+-])(\d{2})(\d{2})(\d{2})?$/.exec(String(text || '').trim());
  return m ? (m[1] === '-' ? -1 : 1) * (+m[2] * 60 + +m[3]) : null;
};
// A file's own VTIMEZONE: each observance's start, its offset after, and its yearly rule, read on the wall clock.
function fileZone(zone, budget) {
  const observances = [];
  for (const o of zone.observances) {
    const start = o.DTSTART ? readValue(o.DTSTART[0].value, {}, () => UTC_ZONE) : null;
    const to = o.TZOFFSETTO ? offsetMinutes(o.TZOFFSETTO[0].value) : null;
    if (!start || to === null) continue;
    observances.push({ start: start.wall, to, rule: o.RRULE ? parseRule(o.RRULE[0].value) : null, rdates: (o.RDATE || []).flatMap((l) => l.value.split(',')).map((v) => readValue(v, {}, () => UTC_ZONE)).filter(Boolean).map((v) => v.wall) });
  }
  if (!observances.length) return null;
  const onsetsBefore = (wall) => {
    let best = null;
    for (const o of observances) {
      const consider = (at) => { if (at <= wall && (!best || at > best.at)) best = { at, to: o.to }; };
      consider(o.start);
      for (const at of o.rdates) consider(at);
      if (o.rule) for (const at of expandRule(o.start, o.rule, { budget, fromWall: wall - 400 * DAY, toWall: wall + DAY, limit: 50, pastUntil: untilTest(o.rule.until, { allDay: false, zone: UTC_ZONE }, () => UTC_ZONE) })) consider(at);
    }
    return best;
  };
  const earliest = observances.reduce((a, b) => (b.start < a.start ? b : a));
  const offsetAtWall = (wall) => (onsetsBefore(wall) || { to: earliest.to }).to;
  return { instant: (wall) => wall - offsetAtWall(wall) * 60000 };
}

// --- repeats -------------------------------------------------------------------------------------------------------

// An RRULE as { freq, interval, count, until, byday, bymonthday, bymonth, byyearday, bysetpos, wkst }, or null when it is
// not one this reader repeats (an hourly rule, say: the event is then read once).
function parseRule(value) {
  const parts = {};
  for (const piece of String(value || '').split(';')) {
    const at = piece.indexOf('=');
    if (at > 0) parts[piece.slice(0, at).trim().toUpperCase()] = piece.slice(at + 1).trim();
  }
  const freq = String(parts.FREQ || '').toUpperCase();
  if (!FREQS.includes(freq)) return null;
  const ints = (text, lo, hi) => String(text || '').split(',').map((s) => Number(s.trim())).filter((x) => Number.isInteger(x) && x !== 0 && Math.abs(x) >= lo && Math.abs(x) <= hi);
  const byday = String(parts.BYDAY || '').split(',').map((s) => /^([+-]?\d{1,2})?(SU|MO|TU|WE|TH|FR|SA)$/i.exec(s.trim())).filter(Boolean)
    .map((m) => ({ n: m[1] ? Number(m[1]) : 0, wd: WEEKDAYS.indexOf(m[2].toUpperCase()) }));
  const interval = Number(parts.INTERVAL || 1);
  const count = parts.COUNT !== undefined ? Number(parts.COUNT) : null;
  const rule = {
    freq,
    interval: Number.isInteger(interval) && interval > 0 && interval < 1000 ? interval : 1,
    count: Number.isInteger(count) && count > 0 ? count : null,
    until: parts.UNTIL || null,
    byday,
    bymonthday: ints(parts.BYMONTHDAY, 1, 31),
    bymonth: ints(parts.BYMONTH, 1, 12).filter((x) => x > 0),
    byyearday: ints(parts.BYYEARDAY, 1, 366),
    bysetpos: ints(parts.BYSETPOS, 1, 366),
    wkst: Math.max(0, WEEKDAYS.indexOf(String(parts.WKST || 'MO').toUpperCase())),
  };
  rule.never = neverLands(rule);
  return rule;
}

// Whether a rule's month days can never fall in its months (the 30th of February): then it makes nothing past its
// start, found here rather than by walking period after period looking for one.
const LONGEST = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
function neverLands(rule) {
  if (!rule.bymonthday.length) return false;
  const months = rule.bymonth.length ? rule.bymonth : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
  const longest = Math.max(...months.map((m) => LONGEST[m - 1]));
  return !rule.bymonthday.some((d) => Math.abs(d) <= longest);
}

const daysInMonth = (y, m) => new Date(Date.UTC(y, m, 0)).getUTCDate();
const weekdayOf = (day) => new Date(day * DAY).getUTCDay();
const ymdParts = (day) => { const d = new Date(day * DAY); return { y: d.getUTCFullYear(), m: d.getUTCMonth() + 1, d: d.getUTCDate() }; };

// The days (day numbers) of [first, last] with a BYDAY weekday; with an ordinal, only that one (1 the first, -1 the last).
function bydayIn(first, last, byday) {
  const out = [];
  for (const { n, wd } of byday) {
    const matching = [];
    const offset = (wd - weekdayOf(first) + 7) % 7;
    for (let day = first + offset; day <= last; day += 7) matching.push(day);
    if (!n) out.push(...matching);
    else {
      const pick = n > 0 ? matching[n - 1] : matching[matching.length + n];
      if (pick !== undefined) out.push(pick);
    }
  }
  return out;
}
function monthDays(y, m, list) {
  const len = daysInMonth(y, m);
  return list.map((x) => (x > 0 ? x : len + x + 1)).filter((x) => x >= 1 && x <= len).map((x) => dayNumber(y, m, x));
}

// The candidate days of one period, before BYSETPOS.
function periodDays(rule, startDay, period) {
  const s = ymdParts(startDay);
  const inMonths = (day) => !rule.bymonth.length || rule.bymonth.includes(ymdParts(day).m);
  const byWeekday = (day) => !rule.byday.length || rule.byday.some((b) => b.wd === weekdayOf(day));
  const byMonthDay = (day) => {
    if (!rule.bymonthday.length) return true;
    const p = ymdParts(day);
    const len = daysInMonth(p.y, p.m);
    return rule.bymonthday.some((x) => (x > 0 ? x : len + x + 1) === p.d);
  };
  if (rule.freq === 'DAILY') {
    const day = period;
    return inMonths(day) && byMonthDay(day) && byWeekday(day) ? [day] : [];
  }
  if (rule.freq === 'WEEKLY') {
    const weekdays = rule.byday.length ? rule.byday.map((b) => b.wd) : [weekdayOf(startDay)];
    const out = [];
    for (let i = 0; i < 7; i += 1) if (weekdays.includes(weekdayOf(period + i)) && inMonths(period + i)) out.push(period + i);
    return out;
  }
  if (rule.freq === 'MONTHLY') {
    const y = Math.floor(period / 12);
    const m = (period % 12) + 1;
    if (rule.bymonth.length && !rule.bymonth.includes(m)) return [];
    const first = dayNumber(y, m, 1);
    const last = first + daysInMonth(y, m) - 1;
    if (rule.bymonthday.length && rule.byday.length) return monthDays(y, m, rule.bymonthday).filter(byWeekday);
    if (rule.bymonthday.length) return monthDays(y, m, rule.bymonthday);
    if (rule.byday.length) return bydayIn(first, last, rule.byday);
    return monthDays(y, m, [s.d]);
  }
  // YEARLY
  const y = period;
  if (rule.byyearday.length) {
    const first = dayNumber(y, 1, 1);
    const len = dayNumber(y + 1, 1, 1) - first;
    return rule.byyearday.map((x) => (x > 0 ? first + x - 1 : first + len + x)).filter((day) => day >= first && day < first + len && inMonths(day) && byWeekday(day));
  }
  if (!rule.bymonth.length && rule.byday.length && !rule.bymonthday.length) return bydayIn(dayNumber(y, 1, 1), dayNumber(y, 12, 31), rule.byday);
  const months = rule.bymonth.length ? rule.bymonth : rule.bymonthday.length ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [s.m];
  const out = [];
  for (const m of months) {
    const first = dayNumber(y, m, 1);
    const last = first + daysInMonth(y, m) - 1;
    if (rule.bymonthday.length) out.push(...monthDays(y, m, rule.bymonthday).filter(byWeekday));
    else if (rule.byday.length) out.push(...bydayIn(first, last, rule.byday));
    else out.push(...monthDays(y, m, [s.d]));
  }
  return out;
}

// The wall-clock starts a rule makes from `startWall`, the start itself first, up to `toWall`; those before `fromWall`
// are walked past without being kept (COUNT still counts them). `untilOf(wall)` says whether a start is past UNTIL.
function expandRule(startWall, rule, { fromWall = -Infinity, toWall, limit = MAX_EVENTS * 4, pastUntil = () => false, budget = null }) {
  const out = [];
  const startDay = Math.floor(startWall / DAY);
  const time = startWall - startDay * DAY;
  const firstPeriod = rule.freq === 'DAILY' ? startDay
    : rule.freq === 'WEEKLY' ? startDay - ((weekdayOf(startDay) - rule.wkst + 7) % 7)
      : rule.freq === 'MONTHLY' ? ymdParts(startDay).y * 12 + ymdParts(startDay).m - 1
        : ymdParts(startDay).y;
  const step = rule.freq === 'WEEKLY' ? 7 * rule.interval : rule.interval;
  // With no COUNT, the periods long before the window are skipped rather than walked.
  let k = 0;
  if (!rule.count && Number.isFinite(fromWall) && fromWall > startWall) {
    const fromDay = Math.floor(fromWall / DAY);
    const behind = rule.freq === 'DAILY' ? fromDay - startDay
      : rule.freq === 'WEEKLY' ? fromDay - startDay
        : rule.freq === 'MONTHLY' ? (ymdParts(fromDay).y * 12 + ymdParts(fromDay).m) - (ymdParts(startDay).y * 12 + ymdParts(startDay).m)
          : ymdParts(fromDay).y - ymdParts(startDay).y;
    k = Math.max(0, Math.floor(behind / step) - 1);
  }
  let counted = 0;
  const take = (wall) => {
    counted += 1;
    if (wall >= fromWall) out.push(wall);
  };
  if (pastUntil(startWall)) return out;
  take(startWall);
  if (rule.never) return out;
  for (let walked = 0; walked < MAX_PERIODS; walked += 1, k += 1) {
    spend(budget);
    const period = firstPeriod + k * step;
    const periodStartDay = rule.freq === 'MONTHLY' ? dayNumber(Math.floor(period / 12), (period % 12) + 1, 1)
      : rule.freq === 'YEARLY' ? dayNumber(period, 1, 1) : period;
    if (periodStartDay * DAY > toWall) break;
    let days = [...new Set(periodDays(rule, startDay, period))].sort((a, b) => a - b);
    if (rule.bysetpos.length) days = [...new Set(rule.bysetpos.map((p) => (p > 0 ? days[p - 1] : days[days.length + p])).filter((d) => d !== undefined))].sort((a, b) => a - b);
    for (const day of days) {
      const wall = day * DAY + time;
      if (wall <= startWall) continue;
      if (wall > toWall || pastUntil(wall)) return out;
      if (rule.count && counted >= rule.count) return out;
      take(wall);
      if (out.length >= limit) return out;
    }
    if (rule.count && counted >= rule.count) return out;
  }
  return out;
}

// --- events --------------------------------------------------------------------------------------------------------

const DURATION_RE = /^([+-])?P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
function durationMs(text) {
  const m = DURATION_RE.exec(String(text || '').trim());
  if (!m || m[0] === 'P' || /T$/.test(m[0])) return null;
  const ms = (((+m[2] || 0) * 7 + (+m[3] || 0)) * DAY) + ((+m[4] || 0) * 3600 + (+m[5] || 0) * 60 + (+m[6] || 0)) * 1000;
  return m[1] === '-' ? -ms : ms;
}

// Each value of a list property (EXDATE, RDATE), read with its line's own parameters.
const listValues = (lines, zoneFor) => (lines || []).flatMap((l) => (String(l.params.VALUE || '').toUpperCase() === 'PERIOD' ? [] : l.value.split(',').map((v) => readValue(v, l.params, zoneFor)))).filter(Boolean);

// Reads a calendar file into the events between `from` and `to` (milliseconds): [{ uid, title, start, end, allDay }],
// all day as 'YYYY-MM-DD' (end the last day, inclusive), timed as ISO instants (end null when the event has none). Each
// occurrence of a repeat is its own event, its uid the event's UID and the occurrence's original start. At most 2000,
// those from now on kept first. Throws CalendarFileError when the text is not a calendar.
function readCalendar(text, { from, to, now = Date.now(), tz = serverZone(), limit = MAX_EVENTS } = {}) {
  const { calendar, events, zones } = components(text);
  const budget = { left: WORK_PERIODS, deadline: Date.now() + WORK_MS };
  const calendarZone = knownZone(calendar['X-WR-TIMEZONE']?.[0]?.value?.trim()) || tz;
  const ownZones = new Map();
  for (const z of zones) {
    const id = z.props.TZID?.[0]?.value?.trim();
    if (id) ownZones.set(id, z);
  }
  const zoneCache = new Map();
  const zoneFor = (tzid) => {
    const id = String(tzid || '').trim();
    if (zoneCache.has(id)) return zoneCache.get(id);
    let zone = null;
    if (id) {
      const named = knownZone(id) || knownZone(id.replace(/^\/+/, '')) || knownZone(id.replace(/^\/[^/]+\/[^/]+\//, ''));
      if (named) zone = intlZone(named);
      else if (ownZones.has(id)) zone = fileZone(ownZones.get(id), budget);
    }
    zone = zone || intlZone(calendarZone);
    zoneCache.set(id, zone);
    return zone;
  };
  const instantOf = (v) => (v.allDay ? v.wall : v.zone.instant(v.wall));
  const keyOf = (v) => (v.allDay ? ymdOfDay(v.wall / DAY) : new Date(instantOf(v)).toISOString());

  // Moved or cancelled occurrences, by UID and the original start they replace.
  const replaced = new Map();
  const out = [];
  const push = (uid, title, startV, endV) => {
    if (startV.allDay) {
      const startDay = startV.wall / DAY;
      const endExclusive = endV && endV.allDay ? endV.wall / DAY : startDay + 1;
      const lastDay = Math.max(startDay, endExclusive - 1);
      if (lastDay * DAY + DAY <= from || startDay * DAY >= to) return;
      out.push({ uid, title, allDay: true, start: ymdOfDay(startDay), end: ymdOfDay(lastDay), sortAt: startDay * DAY, endAt: lastDay * DAY + DAY });
      return;
    }
    const start = instantOf(startV);
    const end = endV ? instantOf(endV) : null;
    if ((end !== null && end > start ? end : start) < from || start >= to) return;
    out.push({ uid, title, allDay: false, start: new Date(start).toISOString(), end: end !== null && end > start ? new Date(end).toISOString() : null, sortAt: start, endAt: end !== null && end > start ? end : start });
  };

  const masters = [];
  for (const ev of events) {
    const uid = unescapeText(ev.UID?.[0]?.value || '').trim().slice(0, 300);
    const startLine = ev.DTSTART?.[0];
    const start = startLine ? readValue(startLine.value, startLine.params, zoneFor) : null;
    if (!start) continue;
    const cancelled = String(ev.STATUS?.[0]?.value || '').trim().toUpperCase() === 'CANCELLED';
    const title = unescapeText(ev.SUMMARY?.[0]?.value || '').replace(/\s+/g, ' ').trim().slice(0, 200);
    const endLine = ev.DTEND?.[0];
    let end = endLine ? readValue(endLine.value, endLine.params, zoneFor) : null;
    if (end && end.allDay !== start.allDay) end = null;
    // A duration (or an end in the same zone) is kept on the wall clock, so each occurrence keeps its length.
    let length = null;
    if (end && (end.allDay || end.zone === start.zone)) length = end.wall - start.wall;
    else if (!end && ev.DURATION) length = durationMs(ev.DURATION[0].value);
    const exact = end && !end.allDay && end.zone !== start.zone ? instantOf(end) - instantOf(start) : null;
    const event = { uid, title, start, length, exact, cancelled, ev };
    const recurrence = ev['RECURRENCE-ID']?.[0];
    if (recurrence) {
      const original = readValue(recurrence.value, recurrence.params, zoneFor);
      if (!original) continue;
      replaced.set(`${uid}\n${keyOf(original)}`, true);
      if (!cancelled) masters.push({ ...event, single: true, id: `${uid}/${keyOf(original)}` });
      continue;
    }
    if (cancelled) continue;
    masters.push(event);
  }

  // An occurrence's end: its start plus the event's length on the wall clock, or plus the exact time between a start
  // and an end in two different zones. None when the event has no length.
  const endOf = (event, startV) => {
    if (event.exact !== null) return { allDay: false, wall: instantOf(startV) + event.exact, zone: UTC_ZONE };
    if (event.length === null || event.length <= 0) return null;
    return { allDay: startV.allDay, wall: startV.wall + event.length, zone: startV.zone };
  };
  const pushOne = (uid, event, startV) => push(uid, event.title, startV, endOf(event, startV));

  for (const event of masters) {
    if (out.length >= limit * 4) break;
    if (Date.now() > budget.deadline) throw tooComplex();
    const rule = !event.single && event.ev.RRULE ? parseRule(event.ev.RRULE[0].value) : null;
    const extra = event.single ? [] : listValues(event.ev.RDATE, zoneFor).filter((v) => v.allDay === event.start.allDay);
    if (!rule && !extra.length) {
      pushOne(event.single ? event.id : event.uid, event, event.start);
      continue;
    }
    const excluded = new Set();
    const excludedDays = new Set();
    for (const v of listValues(event.ev.EXDATE, zoneFor)) {
      if (v.allDay && !event.start.allDay) excludedDays.add(ymdOfDay(v.wall / DAY));
      else excluded.add(keyOf(v));
    }
    // The window on the event's own wall clock, widened by its length and a day for the zone.
    const span = Math.max(0, event.length || 0, event.exact || 0) + 2 * DAY;
    const starts = rule ? expandRule(event.start.wall, rule, {
      budget,
      fromWall: from - span,
      toWall: to + 2 * DAY,
      pastUntil: untilTest(rule.until, event.start, zoneFor),
    }) : [event.start.wall];
    const seen = new Set();
    for (const wall of [...starts, ...extra.map((v) => v.wall)]) {
      const startV = { allDay: event.start.allDay, wall, zone: event.start.zone };
      const key = keyOf(startV);
      if (seen.has(key)) continue;
      seen.add(key);
      if (excluded.has(key) || replaced.has(`${event.uid}\n${key}`)) continue;
      if (excludedDays.size && excludedDays.has(ymdOfDay(Math.floor(wall / DAY)))) continue;
      pushOne(`${event.uid}/${key}`, event, startV);
    }
  }

  // At most `limit`: those still to come first, then the most recent past ones.
  let kept = out;
  if (out.length > limit) {
    const upcoming = out.filter((e) => e.endAt >= now).sort((a, b) => a.sortAt - b.sortAt);
    const past = out.filter((e) => e.endAt < now).sort((a, b) => b.sortAt - a.sortAt);
    kept = [...upcoming.slice(0, limit), ...past.slice(0, Math.max(0, limit - upcoming.length))];
  }
  kept.sort((a, b) => a.sortAt - b.sortAt || (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
  return kept.map(({ uid, title, allDay, start, end }) => ({ uid, title, start, end, allDay }));
}

// Whether a start (wall clock, in the event's zone) is past the rule's UNTIL: a date is its whole day, a time in UTC an
// instant, a floating time the same wall clock.
function untilTest(until, start, zoneFor) {
  if (!until) return () => false;
  const v = readValue(until, {}, () => start.zone || UTC_ZONE);
  if (!v) return () => false;
  if (v.allDay) {
    const lastWall = v.wall + DAY - 1;
    return (wall) => wall > lastWall;
  }
  if (start.allDay) {
    const day = Math.floor(v.wall / DAY);
    return (wall) => Math.floor(wall / DAY) > day;
  }
  const limitMs = v.zone.instant(v.wall);
  const zone = start.zone || zoneFor('');
  return (wall) => zone.instant(wall) > limitMs;
}

module.exports = { readCalendar, CalendarFileError, unfold, parseLine, parseRule, expandRule, MAX_EVENTS, WORK_PERIODS, WORK_MS };
