// The airport list (documentation/plans/plan-flight-lookup.md, "The airport list"): every airport with an IATA code, from
// server/airports.json (built by tools/build-airports.mjs from mwgg/Airports, MIT; the notice is server/airports-LICENSE),
// each with its ICAO code, name, city, country and Olson time zone. Read once, on first use, and never written.
//
// It also turns a local clock time at an airport into a moment and back, with Intl.DateTimeFormat and no added package, so
// a flight's time in the air can be worked out from its two local times, or its arrival from its departure and flight time.
'use strict';

const path = require('path');

const FILE = path.join(__dirname, 'airports.json');

let byIata = null;
let byIcao = null;
function load() {
  if (byIata) return;
  const raw = require(FILE);
  byIata = new Map();
  byIcao = new Map();
  for (const [code, a] of Object.entries(raw)) {
    if (!/^[A-Z]{3}$/.test(code) || !a || typeof a !== 'object') continue;
    const rec = Object.freeze({ code, icao: String(a.icao || ''), name: String(a.name || ''), city: String(a.city || ''), country: String(a.country || ''), tz: String(a.tz || '') });
    byIata.set(code, rec);
    if (/^[A-Z0-9]{4}$/.test(rec.icao) && !byIcao.has(rec.icao)) byIcao.set(rec.icao, rec);
  }
}

// An airport by its IATA code (MDW) or ICAO code (KMDW), any case: { code, icao, name, city, country, tz }, or null.
function airport(code) {
  if (typeof code !== 'string' || code.length > 8) return null;
  const c = code.trim().toUpperCase();
  load();
  if (/^[A-Z]{3}$/.test(c)) return byIata.get(c) || null;
  if (/^[A-Z0-9]{4}$/.test(c)) return byIcao.get(c) || null;
  return null;
}

// How many airports the list has.
function count() {
  load();
  return byIata.size;
}

// The name a person would type: the airport's name without a trailing "International Airport" or "Airport"
// ("Chicago Midway International Airport" -> "Chicago Midway"). Never empty while the name is not.
function displayName(a) {
  const name = a && typeof a.name === 'string' ? a.name.trim() : '';
  const short = name.replace(/\s+(?:International\s+)?Airport$/i, '').trim();
  return short || name;
}

// --- local times and time zones ---------------------------------------------------------------------------------

const WHEN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;
const formats = new Map(); // tz -> Intl.DateTimeFormat, at most one per zone the list names
const MAX_FORMATS = 1000;

function formatFor(tz) {
  let f = formats.get(tz);
  if (f) return f;
  try {
    f = new Intl.DateTimeFormat('en-US', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  } catch {
    return null;
  }
  if (formats.size < MAX_FORMATS) formats.set(tz, f);
  return f;
}

// The zone's offset from UTC at a moment, in milliseconds.
function offsetAt(ms, f) {
  const p = {};
  for (const part of f.formatToParts(new Date(ms))) p[part.type] = part.value;
  const asUtc = Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour % 24, +p.minute, +p.second);
  return asUtc - Math.floor(ms / 1000) * 1000;
}

const realWhen = (m) => {
  const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return t.getUTCFullYear() === +m[1] && t.getUTCMonth() === +m[2] - 1 && t.getUTCDate() === +m[3] && +m[4] <= 23 && +m[5] <= 59;
};

// A local day and time at a place ("2026-11-14T12:50") as a moment (milliseconds since 1970), or null. A clock time the
// zone skips (the hour lost when clocks go forward) is read with the offset from before the change, so it lands an hour
// later; a time the zone has twice (when clocks go back) is the first of the two.
function localToUtc(when, tz) {
  const m = typeof when === 'string' ? WHEN.exec(when) : null;
  if (!m || !realWhen(m) || typeof tz !== 'string' || !tz) return null;
  const f = formatFor(tz);
  if (!f) return null;
  const guess = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]);
  const before = offsetAt(guess - 86400000, f);
  const after = offsetAt(guess + 86400000, f);
  // Try the offset in force a day before, then a day after; keep the first that reads back as the time asked for.
  for (const off of before === after ? [before] : [Math.max(before, after), Math.min(before, after)]) {
    const t = guess - off;
    if (offsetAt(t, f) === off) return t;
  }
  return guess - before;
}

// A moment as the local day and time at a place ("2026-11-14T15:25"), or null.
function utcToLocal(ms, tz) {
  if (!Number.isFinite(ms) || typeof tz !== 'string' || !tz) return null;
  const f = formatFor(tz);
  if (!f) return null;
  const p = {};
  for (const part of f.formatToParts(new Date(ms))) p[part.type] = part.value;
  return `${p.year}-${p.month}-${p.day}T${String(+p.hour % 24).padStart(2, '0')}:${p.minute}`;
}

// Minutes from a local departure in one zone to a local arrival in another, or null when either cannot be read.
function minutesBetween(departs, fromTz, arrives, toTz) {
  const a = localToUtc(departs, fromTz);
  const b = localToUtc(arrives, toTz);
  return a === null || b === null ? null : Math.round((b - a) / 60000);
}

// The local arrival, from a local departure in one zone and a flight time in minutes, in the other zone; or null.
function arrivalFrom(departs, fromTz, minutes, toTz) {
  const a = localToUtc(departs, fromTz);
  return a === null || !Number.isInteger(minutes) ? null : utcToLocal(a + minutes * 60000, toTz);
}

module.exports = { airport, count, displayName, localToUtc, utcToLocal, minutesBetween, arrivalFrom };
