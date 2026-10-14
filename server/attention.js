// What needs a person's action, reported by modules (documentation/plans/plan-space-status-strip.md, "Attention, the
// contract"). One file per environment, DATA_DIR/attention.json (so the environment's export and the host console's
// backup, which zip the whole data folder, carry it):
//
//   { "spaces": { "<space id>": { "<user key>": { "<module id>": { count, label, items: [{ title, object? }], at } } } } }
//
// The server keeps each module's last report per person and space. A report older than 7 days is dropped when read and
// when the file is loaded. count 0 clears a report (nothing needs action). cleanReport() is the one shape check, pure.

'use strict';

const fs = require('fs');
const path = require('path');

const LIMITS = { count: 99, label: 40, items: 20, title: 120 };
const MAX_AGE = 7 * 24 * 60 * 60 * 1000;

const isObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

// { report } or { error } (one plain sentence). `object` is passed on as the module sent it (an object reference the
// host opens): it must be an object and small, nothing more is asked here.
function cleanReport(body) {
  if (!isObject(body)) return { error: 'Send the count, the label and the list as JSON.' };
  const { count, label, items } = body;
  if (!Number.isInteger(count) || count < 0 || count > LIMITS.count) return { error: `The count must be a whole number from 0 to ${LIMITS.count}.` };
  if (label !== undefined && typeof label !== 'string') return { error: 'The label must be text.' };
  const text = (label || '').replace(/\p{Cc}/gu, ' ').trim();
  if (text.length > LIMITS.label) return { error: `The label can be at most ${LIMITS.label} characters.` };
  if (items !== undefined && !Array.isArray(items)) return { error: 'The list must be a list of entries.' };
  if ((items || []).length > LIMITS.items) return { error: `Send at most ${LIMITS.items} entries.` };
  const kept = [];
  for (const item of items || []) {
    if (!isObject(item) || typeof item.title !== 'string') return { error: 'Each entry needs a title.' };
    const title = item.title.replace(/\p{Cc}/gu, ' ').trim();
    if (!title || title.length > LIMITS.title) return { error: `Each title must be 1 to ${LIMITS.title} characters.` };
    if (item.object !== undefined && (!isObject(item.object) || JSON.stringify(item.object).length > 1000)) return { error: 'An entry\'s reference is not valid.' };
    kept.push(item.object === undefined ? { title } : { title, object: item.object });
  }
  return { report: { count, label: text, items: kept } };
}

class Attention {
  constructor(dir, now = () => Date.now()) {
    this.dir = dir;
    this.file = path.join(dir, 'attention.json');
    this.now = now;
    this.spaces = {};
    let raw = null;
    try {
      raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch {
      // nothing yet
    }
    for (const [spaceId, people] of Object.entries(isObject(raw?.spaces) ? raw.spaces : {})) {
      for (const [key, reports] of Object.entries(isObject(people) ? people : {})) {
        for (const [moduleId, r] of Object.entries(isObject(reports) ? reports : {})) {
          if (this.fresh(r)) this.bucket(spaceId, key, true)[moduleId] = r;
        }
      }
    }
  }

  fresh(r) {
    return isObject(r) && Number.isInteger(r.count) && r.count > 0 && Number.isFinite(r.at) && this.now() - r.at <= MAX_AGE;
  }

  save() {
    fs.mkdirSync(this.dir, { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify({ spaces: this.spaces })}\n`);
    fs.renameSync(tmp, this.file);
  }

  bucket(spaceId, userKey, create = false) {
    let people = this.spaces[spaceId];
    if (!people) { if (!create) return null; people = this.spaces[spaceId] = {}; }
    if (!people[userKey] && create) people[userKey] = {};
    return people[userKey] || null;
  }

  // Keep a module's last report for this person here; count 0 clears it.
  set(spaceId, userKey, moduleId, report) {
    if (!report.count) return this.clear(spaceId, userKey, moduleId);
    this.bucket(spaceId, userKey, true)[moduleId] = { ...report, at: this.now() };
    this.save();
  }

  clear(spaceId, userKey, moduleId) {
    const mine = this.bucket(spaceId, userKey);
    if (!mine || !mine[moduleId]) return false;
    delete mine[moduleId];
    if (!Object.keys(mine).length) delete this.spaces[spaceId][userKey];
    if (!Object.keys(this.spaces[spaceId]).length) delete this.spaces[spaceId];
    this.save();
    return true;
  }

  // This person's fresh reports here: [{ module, count, label, items, at }].
  list(spaceId, userKey) {
    const mine = this.bucket(spaceId, userKey);
    if (!mine) return [];
    return Object.entries(mine).filter(([, r]) => this.fresh(r)).map(([module, r]) => ({ module, ...r }));
  }

  forgetSpace(spaceId) {
    if (!this.spaces[spaceId]) return;
    delete this.spaces[spaceId];
    this.save();
  }

  forgetPerson(userKey) {
    let changed = false;
    for (const [spaceId, people] of Object.entries(this.spaces)) {
      if (!people[userKey]) continue;
      delete people[userKey];
      if (!Object.keys(people).length) delete this.spaces[spaceId];
      changed = true;
    }
    if (changed) this.save();
  }

  forgetModule(moduleId) {
    let changed = false;
    for (const [spaceId, people] of Object.entries(this.spaces)) {
      for (const [key, reports] of Object.entries(people)) {
        if (!(moduleId in reports)) continue;
        delete reports[moduleId];
        if (!Object.keys(reports).length) delete people[key];
        changed = true;
      }
      if (!Object.keys(people).length) delete this.spaces[spaceId];
    }
    if (changed) this.save();
  }
}

module.exports = { Attention, cleanReport, LIMITS, MAX_AGE };
