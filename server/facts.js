// How a space stands, reported by modules (documentation/plans/plan-space-story-strip.md, "The contract", step 4): the
// facts the space's status strip shows as chips ("$2,340 of $4,000", "Next: Thu · SJC → ONT"). Unlike attention
// (server/attention.js), facts are the space's, not a person's: one report per space and module, whoever sent it, and
// never who sent it. One file per environment, DATA_DIR/facts.json (so the environment's export and the host console's
// backup, which zip the whole data folder, carry it):
//
//   { "spaces": { "<space id>": { "<module id>": { facts: [{ id, icon, text, value?, progress?, order?, budget?, when? }], at } } } }
//
// A report older than 7 days is dropped when read and when the file is loaded. An empty list clears a report.
// cleanFacts() is the one shape check, pure. `when` is a day (YYYY-MM-DD): the page words it against the viewer's own
// today ("Tomorrow · SJC → ONT") and leaves the fact out once that day has passed, so the words never go stale. Lengths
// are counted in characters as a person sees them (code points), so an emoji is one. The maps are made without a
// prototype, and a stored `__proto__` key is skipped, so a damaged file cannot reach Object.prototype.

'use strict';

const fs = require('fs');
const path = require('path');
const { isDay } = require('../public/phases.js');

const LIMITS = { facts: 6, id: 32, text: 40, value: 24, order: 99 };
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const ID_RE = /^[a-z][a-z0-9-]{0,31}$/;
const ICON_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
// Font Awesome Free's own solid icons, what a fact's icon must be so the strip can draw it (fa-solid fa-<id>); read once.
// Without the folder (a trimmed install) the name's shape is the only check.
const FA_FREE_SOLID = path.join(__dirname, '..', 'node_modules', '@fortawesome', 'fontawesome-free', 'svgs', 'solid');
let solidIcons;
function iconKnown(name) {
  if (solidIcons === undefined) {
    try {
      solidIcons = new Set(fs.readdirSync(FA_FREE_SOLID).filter((f) => f.endsWith('.svg')).map((f) => f.slice(0, -4)));
    } catch {
      solidIcons = null;
    }
  }
  return !solidIcons || solidIcons.has(name);
}

const isObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const oneLine = (s) => s.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim();
// Characters that show nothing yet change what is shown: zero-width ones (U+200B to U+200F, U+2060, U+FEFF) and the
// controls that reorder text (U+202A to U+202E, U+2066 to U+2069). A fact holding one could look empty or read backwards.
const INVISIBLE = /[\u200B-\u200F\u2060\uFEFF\u202A-\u202E\u2066-\u2069]/;
const chars = (s) => [...s].length; // code points: an emoji counts as one
const UNSAFE_KEYS = new Set(['__proto__', 'constructor', 'prototype']);
const map = () => Object.create(null);

// { facts } or { error } (one plain sentence). The body is { facts: [...] }.
function cleanFacts(body) {
  if (!isObject(body) || !Array.isArray(body.facts)) return { error: 'Send the facts as a list.' };
  if (body.facts.length > LIMITS.facts) return { error: `Send at most ${LIMITS.facts} facts.` };
  const kept = [];
  const seen = new Set();
  for (const f of body.facts) {
    if (!isObject(f)) return { error: 'Send each fact with its id, icon and words.' };
    if (typeof f.id !== 'string' || !ID_RE.test(f.id)) return { error: 'Each fact needs an id: a short code name in small letters, such as spent.' };
    if (seen.has(f.id)) return { error: `Two facts have the id ${f.id}.` };
    seen.add(f.id);
    if (typeof f.icon !== 'string' || !ICON_RE.test(f.icon) || !iconKnown(f.icon)) return { error: 'Each fact needs an icon from Font Awesome Free\'s solid set.' };
    if (typeof f.text !== 'string') return { error: 'Each fact needs its words.' };
    if (INVISIBLE.test(f.text)) return { error: 'A fact\'s words cannot hold invisible characters.' };
    const text = oneLine(f.text);
    if (!text || chars(text) > LIMITS.text) return { error: `A fact's words must be 1 to ${LIMITS.text} characters.` };
    const fact = { id: f.id, icon: f.icon, text };
    if (f.value !== undefined && f.value !== null) {
      if (typeof f.value !== 'string') return { error: 'A fact\'s value must be text.' };
      if (INVISIBLE.test(f.value)) return { error: 'A fact\'s value cannot hold invisible characters.' };
      const value = oneLine(f.value);
      if (chars(value) > LIMITS.value) return { error: `A fact's value can be at most ${LIMITS.value} characters.` };
      if (value) fact.value = value;
    }
    if (f.progress !== undefined && f.progress !== null) {
      if (typeof f.progress !== 'number' || !Number.isFinite(f.progress) || f.progress < 0 || f.progress > 1) return { error: 'Progress must be a number from 0 to 1.' };
      fact.progress = Math.round(f.progress * 1000) / 1000;
    }
    if (f.order !== undefined && f.order !== null) {
      if (!Number.isInteger(f.order) || f.order < 0 || f.order > LIMITS.order) return { error: `The order must be a whole number from 0 to ${LIMITS.order}.` };
      fact.order = f.order;
    }
    // The fact reads the space's budget target (the space record's `budget`): Set up offers the target once one does.
    if (f.budget !== undefined && f.budget !== null) {
      if (typeof f.budget !== 'boolean') return { error: 'A fact\'s budget mark must be true or false.' };
      if (f.budget) fact.budget = true;
    }
    // The day the fact is about (a booking's), worded by the page against the viewer's today.
    if (f.when !== undefined && f.when !== null) {
      if (!isDay(f.when)) return { error: 'A fact\'s day must be a real date written YYYY-MM-DD.' };
      fact.when = f.when;
    }
    kept.push(fact);
  }
  return { facts: kept };
}

class Facts {
  constructor(dir, now = () => Date.now()) {
    this.dir = dir;
    this.file = path.join(dir, 'facts.json');
    this.now = now;
    this.spaces = map();
    let raw = null;
    try {
      raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      // nothing yet
    }
    for (const [spaceId, reports] of Object.entries(isObject(raw?.spaces) ? raw.spaces : {})) {
      if (UNSAFE_KEYS.has(spaceId)) continue;
      for (const [moduleId, r] of Object.entries(isObject(reports) ? reports : {})) {
        if (UNSAFE_KEYS.has(moduleId) || !this.fresh(r)) continue;
        const { facts, error } = cleanFacts({ facts: r.facts });
        if (error || !facts.length) continue;
        (this.spaces[spaceId] ||= map())[moduleId] = { facts, at: r.at };
      }
    }
  }

  fresh(r) {
    return isObject(r) && Array.isArray(r.facts) && r.facts.length > 0 && Number.isFinite(r.at) && this.now() - r.at <= MAX_AGE;
  }

  save() {
    fs.mkdirSync(this.dir, { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify({ spaces: this.spaces })}\n`);
    fs.renameSync(tmp, this.file);
  }

  // Keep a module's last report for this space; an empty list clears it.
  set(spaceId, moduleId, facts) {
    if (!facts.length) return this.clear(spaceId, moduleId);
    if (UNSAFE_KEYS.has(spaceId) || UNSAFE_KEYS.has(moduleId)) return false;
    (this.spaces[spaceId] ||= map())[moduleId] = { facts, at: this.now() };
    this.save();
    return true;
  }

  clear(spaceId, moduleId) {
    const here = this.spaces[spaceId];
    if (!here || !here[moduleId]) return false;
    delete here[moduleId];
    if (!Object.keys(here).length) delete this.spaces[spaceId];
    this.save();
    return true;
  }

  // The space's fresh reports: [{ module, facts, at }].
  list(spaceId) {
    const here = this.spaces[spaceId];
    if (!here) return [];
    return Object.entries(here).filter(([, r]) => this.fresh(r)).map(([module, r]) => ({ module, facts: r.facts, at: r.at }));
  }

  forgetSpace(spaceId) {
    if (!this.spaces[spaceId]) return;
    delete this.spaces[spaceId];
    this.save();
  }

  forgetModule(moduleId) {
    let changed = false;
    for (const [spaceId, reports] of Object.entries(this.spaces)) {
      if (!(moduleId in reports)) continue;
      delete reports[moduleId];
      if (!Object.keys(reports).length) delete this.spaces[spaceId];
      changed = true;
    }
    if (changed) this.save();
  }
}

module.exports = { Facts, cleanFacts, LIMITS, MAX_AGE };
