// Saved layouts (documentation/plans/plan-saved-layouts.md, step 1): named arrangements of a space's canvas, kept on
// the server so a person's own follow them to any browser and a space's shared ones reach everyone in it. One file per
// environment, DATA_DIR/layouts.json (so the environment's export and the host console's backup, which zip the whole
// data folder, carry it):
//
//   { "spaces": { "<space id>": { "shared": [layout], "people": { "<user key>": [layout] },
//                                  "favorites": { "<user key>": [layout id] } } } }
//
// favorites (documentation/plans/plan-favorite-layouts.md, step 1): each person's own favorites in a space, layout ids
// in the order they were favorited. Only a layout the person can see can be one, each id once, and at most
// LAYOUT_LIMITS.favorites of them (Thomas, 2026-10-04, replacing "no limit"). A longer stored list reads as its first
// visible ones, and the file is trimmed at its next write. remove() and forgetPerson() keep it clean; the key is left out of a space's entry while nobody there has a favorite.
//
// A layout is { id, name, by, at, modules: [{ id, mode, dockW?, box?, snap? }], snap?: { all, pitch } }. cleanLayout()
// is the one shape check, pure; the Layouts class keeps the lists, their limits and the clean-up when a space or a
// person is removed (server/store.js calls forgetSpace and forgetPerson). The browser's own remembered layout
// (app.canvas.<space id>) is unchanged and separate. An aside has no layouts: index.js only finds spaces.

'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const words = require('./words');

const LAYOUT_LIMITS = Object.freeze({
  personal: 10, // per person per space
  shared: 10, // per space
  name: 40, // characters, after trimming
  modules: 20, // entries in a layout's modules, the same count as a space's opensWith
  dockWMin: 160,
  dockWMax: 2000,
  pitchMin: 50, // the snap grid's pitch in pixels, as the canvas's SNAP_PITCH
  pitchMax: 320,
  favorites: 3, // favorite layouts per person per space
});
// A module id: the same rule as a space's opensWith (server/store.js).
const MODULE_ID = /^[a-z][a-z0-9-]{0,31}$/;
const MODES = ['dock', 'float'];
const TOP_KEYS = ['name', 'shared', 'modules', 'snap'];
const MODULE_KEYS = ['id', 'mode', 'dockW', 'box', 'snap'];
const BOX_KEYS = ['x', 'y', 'w', 'h'];
const SNAP_KEYS = ['all', 'pitch'];
const ID_ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789';

const isObject = (v) => Boolean(v) && typeof v === 'object' && !Array.isArray(v);
const isFraction = (v) => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= 1;
const many = (key) => words.word(key, { many: true });

// A layout's name as it is kept: control characters out, whitespace collapsed, trimmed.
function cleanName(value) {
  return typeof value === 'string' ? value.replace(/\p{Cc}/gu, ' ').replace(/\s+/g, ' ').trim() : '';
}

// The one shape check, pure. `input` is what a request sends ({ name, shared?, modules, snap? }); with `partial`
// (a PUT) any of name, modules and snap may be left out, and shared is not taken. Returns { layout } with only the
// fields given, cleaned (numbers of pixels rounded), or { error } with one sentence saying what is wrong; anything
// wrong refuses the whole layout.
function cleanLayout(input, { partial = false } = {}) {
  if (!isObject(input)) return { error: `Send the layout as JSON: a name and the ${many('module')} it opens.` };
  const allowed = partial ? TOP_KEYS.filter((k) => k !== 'shared') : TOP_KEYS;
  const extra = Object.keys(input).find((k) => !allowed.includes(k));
  if (extra) return { error: partial && extra === 'shared' ? 'A saved layout cannot be moved between your own and the shared ones; save it again instead.' : `A layout does not take "${extra}".` };
  const out = {};

  if (!partial || input.name !== undefined) {
    if (input.name !== undefined && typeof input.name !== 'string') return { error: 'A layout\'s name must be text.' };
    const name = cleanName(input.name);
    if (!name) return { error: 'Give the layout a name.' };
    if ([...name].length > LAYOUT_LIMITS.name) return { error: `A layout's name can be at most ${LAYOUT_LIMITS.name} characters.` };
    out.name = name;
  }

  if (!partial && input.shared !== undefined) {
    if (typeof input.shared !== 'boolean') return { error: 'Say whether the layout is shared with true or false.' };
    out.shared = input.shared;
  }

  if (!partial || input.modules !== undefined) {
    if (!Array.isArray(input.modules) || input.modules.length === 0) return { error: `List the ${many('module')} the layout opens.` };
    if (input.modules.length > LAYOUT_LIMITS.modules) return { error: `A layout can hold at most ${LAYOUT_LIMITS.modules} ${many('module')}.` };
    const seen = new Set();
    out.modules = [];
    for (const entry of input.modules) {
      if (!isObject(entry)) return { error: `Each ${words.word('module')} in a layout needs an id and a mode.` };
      const id = entry.id;
      if (typeof id !== 'string' || !MODULE_ID.test(id)) return { error: `${JSON.stringify(id ?? null)} is not ${words.word('module', { a: true })} id.` };
      if (seen.has(id)) return { error: `"${id}" is listed twice in the layout.` };
      seen.add(id);
      const unknown = Object.keys(entry).find((k) => !MODULE_KEYS.includes(k));
      if (unknown) return { error: `"${id}": a layout does not keep "${unknown}".` };
      if (!MODES.includes(entry.mode)) return { error: `"${id}": mode must be dock or float.` };
      const kept = { id, mode: entry.mode };
      if (entry.dockW !== undefined) {
        const w = entry.dockW;
        if (typeof w !== 'number' || !Number.isFinite(w) || w < LAYOUT_LIMITS.dockWMin || w > LAYOUT_LIMITS.dockWMax) {
          return { error: `"${id}": dockW must be a width in pixels from ${LAYOUT_LIMITS.dockWMin} to ${LAYOUT_LIMITS.dockWMax}.` };
        }
        kept.dockW = Math.round(w);
      }
      if (entry.box !== undefined) {
        const b = entry.box;
        const bad = !isObject(b) || Object.keys(b).some((k) => !BOX_KEYS.includes(k)) || !BOX_KEYS.every((k) => isFraction(b[k])) || b.w === 0 || b.h === 0;
        if (bad) return { error: `"${id}": box must be { x, y, w, h }, each a fraction of the ${words.word('canvas')} from 0 to 1, with w and h above 0.` };
        kept.box = { x: b.x, y: b.y, w: b.w, h: b.h };
      }
      if (entry.snap !== undefined) {
        if (typeof entry.snap !== 'boolean') return { error: `"${id}": snap must be true or false.` };
        kept.snap = entry.snap;
      }
      out.modules.push(kept);
    }
  }

  if (input.snap !== undefined) {
    const s = input.snap;
    const pitch = s?.pitch;
    const bad = !isObject(s) || Object.keys(s).some((k) => !SNAP_KEYS.includes(k)) || typeof s.all !== 'boolean'
      || typeof pitch !== 'number' || !Number.isFinite(pitch) || pitch < LAYOUT_LIMITS.pitchMin || pitch > LAYOUT_LIMITS.pitchMax;
    if (bad) return { error: `A layout's snap must be { all, pitch }, with all true or false and pitch from ${LAYOUT_LIMITS.pitchMin} to ${LAYOUT_LIMITS.pitchMax} pixels.` };
    out.snap = { all: s.all, pitch: Math.round(pitch) };
  }
  return { layout: out };
}

class LayoutError extends Error {
  constructor(message, status = 400, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

// A stored layout as read from the file: kept as it is when it has an id and a name (a later version's extra fields
// survive a roll back), else dropped.
const storedLayout = (l) => isObject(l) && typeof l.id === 'string' && l.id && typeof l.name === 'string' && Array.isArray(l.modules);
const storedList = (list) => (Array.isArray(list) ? list.filter(storedLayout) : []);
const copy = (l) => structuredClone(l);

class Layouts {
  constructor(dataDir) {
    this.dir = dataDir;
    this.file = path.join(dataDir, 'layouts.json');
    this.spaces = {};
    // None yet is the usual case. One that is there but cannot be read is never written over: the lists read as
    // empty and every change is refused, until the file is fixed or restored and the server started again.
    this.unreadable = false;
    let raw = null;
    try {
      raw = JSON.parse(fs.readFileSync(this.file, 'utf8'));
    } catch (err) {
      if (err.code !== 'ENOENT') this.unreadable = true;
    }
    for (const [spaceId, entry] of Object.entries(isObject(raw?.spaces) ? raw.spaces : {})) {
      if (!isObject(entry)) continue;
      const people = {};
      for (const [key, list] of Object.entries(isObject(entry.people) ? entry.people : {})) {
        const kept = storedList(list);
        if (kept.length) people[key] = kept;
      }
      const shared = storedList(entry.shared);
      // A file from before favorites has no key: it reads as none. Ids that are not text, or listed twice, are dropped.
      // Ids of a layout that person cannot see (gone, dropped above as malformed, or hand-edited in) are dropped too,
      // so a space whose favorites name nothing left keeps no entry. Past the limit, the first ones favorited are kept.
      const sharedIds = new Set(shared.map((l) => l.id));
      const favorites = {};
      for (const [key, list] of Object.entries(isObject(entry.favorites) ? entry.favorites : {})) {
        const own = new Set((people[key] || []).map((l) => l.id));
        const ids = Array.isArray(list)
          ? [...new Set(list.filter((id) => typeof id === 'string' && id && (sharedIds.has(id) || own.has(id))))]
          : [];
        ids.splice(LAYOUT_LIMITS.favorites);
        if (ids.length) favorites[key] = ids;
      }
      if (shared.length || Object.keys(people).length || Object.keys(favorites).length) {
        this.spaces[spaceId] = { shared, people, ...(Object.keys(favorites).length ? { favorites } : {}) };
      }
    }
  }

  // Before any change: refused whole while layouts.json cannot be read.
  mustWrite() {
    if (this.unreadable) throw new LayoutError('The saved layouts file cannot be read, so nothing can be saved until it is fixed.', 500);
  }

  save() {
    fs.mkdirSync(this.dir, { recursive: true });
    const tmp = `${this.file}.tmp`;
    fs.writeFileSync(tmp, `${JSON.stringify({ spaces: this.spaces }, null, 2)}\n`);
    fs.renameSync(tmp, this.file);
  }

  // The list a layout belongs in: the space's shared list, or one person's own there. Made when `create`.
  listOf(spaceId, userKey, create = false) {
    let entry = this.spaces[spaceId];
    if (!entry) {
      if (!create) return [];
      entry = this.spaces[spaceId] = { shared: [], people: {} };
    }
    if (userKey === null) return entry.shared;
    if (!entry.people[userKey]) {
      if (!create) return [];
      entry.people[userKey] = [];
    }
    return entry.people[userKey];
  }

  // Drops empty lists and spaces, so the file holds only what someone saved.
  tidy(spaceId) {
    const entry = this.spaces[spaceId];
    if (!entry) return;
    for (const [key, list] of Object.entries(entry.people)) if (!list.length) delete entry.people[key];
    if (entry.favorites) {
      for (const [key, list] of Object.entries(entry.favorites)) if (!list.length) delete entry.favorites[key];
      if (!Object.keys(entry.favorites).length) delete entry.favorites;
    }
    if (!entry.shared.length && !Object.keys(entry.people).length && !entry.favorites) delete this.spaces[spaceId];
  }

  // { mine, shared } in a space: `userKey` null (a guest) has none of their own.
  list(spaceId, userKey) {
    return {
      mine: userKey ? this.listOf(spaceId, userKey).map(copy) : [],
      shared: this.listOf(spaceId, null).map(copy),
    };
  }

  // `userKey`'s favorites in a space: the ids, in the order favorited, of those that still exist and that they can
  // see, at most LAYOUT_LIMITS.favorites (the first ones). A guest (`userKey` null) has none.
  favorites(spaceId, userKey) {
    if (!userKey) return [];
    const stored = this.spaces[spaceId]?.favorites?.[userKey] || [];
    return stored.filter((id) => this.find(spaceId, id, userKey)).slice(0, LAYOUT_LIMITS.favorites);
  }

  // Makes a layout `userKey` can see one of their favorites (`on`), appended at the end, or stops it being one.
  // Doing what is already so changes nothing. A change writes back the visible list (as favorites()) with it, so ids
  // they cannot see, or past the limit, are dropped. Returns their favorites (as favorites()), or null when they cannot
  // see that layout. Throws a LayoutError (409) when they already have LAYOUT_LIMITS.favorites and this is not one.
  setFavorite(spaceId, layoutId, userKey, on) {
    this.mustWrite();
    if (!userKey || !this.find(spaceId, layoutId, userKey)) return null;
    const entry = this.spaces[spaceId];
    const visible = this.favorites(spaceId, userKey);
    const has = visible.includes(layoutId);
    if (on && !has) {
      if (visible.length >= LAYOUT_LIMITS.favorites) {
        throw new LayoutError(`You can have ${LAYOUT_LIMITS.favorites} favorite layouts. Unfavorite one first.`, 409);
      }
      entry.favorites = entry.favorites || {};
      entry.favorites[userKey] = [...visible, layoutId];
    } else if (!on && has) {
      entry.favorites[userKey] = visible.filter((id) => id !== layoutId);
      this.tidy(spaceId);
    } else {
      return visible;
    }
    this.save();
    return this.favorites(spaceId, userKey);
  }

  // A layout by id that `userKey` can see in a space: the shared one, else their own. { layout, shared } or null.
  find(spaceId, layoutId, userKey) {
    const shared = this.listOf(spaceId, null).find((l) => l.id === layoutId);
    if (shared) return { layout: copy(shared), shared: true };
    const mine = userKey ? this.listOf(spaceId, userKey).find((l) => l.id === layoutId) : null;
    return mine ? { layout: copy(mine), shared: false } : null;
  }

  newId(spaceId) {
    const entry = this.spaces[spaceId];
    const taken = new Set(entry ? [...entry.shared, ...Object.values(entry.people).flat()].map((l) => l.id) : []);
    let id;
    do id = `l${Array.from({ length: 6 }, () => ID_ALPHABET[crypto.randomInt(ID_ALPHABET.length)]).join('')}`;
    while (taken.has(id));
    return id;
  }

  // Saves a new layout, already cleaned by cleanLayout: in the shared list when `shared`, else in `by`'s own. Throws
  // a LayoutError (409) when the name is taken in that list (with the id of the one that has it) or the list is full.
  add(spaceId, by, { name, shared = false, modules, snap }) {
    this.mustWrite();
    const owner = shared ? null : by;
    const current = this.listOf(spaceId, owner);
    const same = current.find((l) => l.name.toLowerCase() === name.toLowerCase());
    if (same) throw new LayoutError(`There is already a layout called ${same.name}.`, 409, { id: same.id });
    const cap = shared ? LAYOUT_LIMITS.shared : LAYOUT_LIMITS.personal;
    if (current.length >= cap) {
      throw new LayoutError(shared
        ? `This ${words.word('space')} has ${cap} shared layouts. Delete one first.`
        : `You have ${cap} saved layouts here. Delete one first.`, 409);
    }
    const layout = { id: this.newId(spaceId), name, by, at: new Date().toISOString(), modules, ...(snap ? { snap } : {}) };
    this.listOf(spaceId, owner, true).push(layout);
    this.save();
    return copy(layout);
  }

  // Renames or replaces a layout `userKey` can see (found by find()); `patch` is cleanLayout's partial answer. The
  // caller has already decided whether this person may change it. `at` moves to now; `by` stays who first saved it.
  update(spaceId, layoutId, userKey, patch) {
    this.mustWrite();
    const found = this.find(spaceId, layoutId, userKey);
    if (!found) return null;
    const list = this.listOf(spaceId, found.shared ? null : userKey);
    const layout = list.find((l) => l.id === layoutId);
    if (patch.name !== undefined) {
      const same = list.find((l) => l.id !== layoutId && l.name.toLowerCase() === patch.name.toLowerCase());
      if (same) throw new LayoutError(`There is already a layout called ${same.name}.`, 409, { id: same.id });
      layout.name = patch.name;
    }
    if (patch.modules !== undefined) layout.modules = patch.modules;
    if (patch.snap !== undefined) layout.snap = patch.snap;
    layout.at = new Date().toISOString();
    this.save();
    return copy(layout);
  }

  // Deletes a layout `userKey` can see, and takes it out of every person's favorites in the space. true when there
  // was one.
  remove(spaceId, layoutId, userKey) {
    this.mustWrite();
    const found = this.find(spaceId, layoutId, userKey);
    if (!found) return false;
    const owner = found.shared ? null : userKey;
    const list = this.listOf(spaceId, owner);
    list.splice(list.findIndex((l) => l.id === layoutId), 1);
    const favorites = this.spaces[spaceId].favorites || {};
    for (const key of Object.keys(favorites)) favorites[key] = favorites[key].filter((id) => id !== layoutId);
    this.tidy(spaceId);
    this.save();
    return true;
  }

  // A removed space takes its layouts, shared and personal.
  forgetSpace(spaceId) {
    if (this.unreadable || !this.spaces[spaceId]) return;
    delete this.spaces[spaceId];
    this.save();
  }

  // A removed person takes their own layouts and their favorites in every space. Shared layouts they saved stay: they
  // are the space's.
  forgetPerson(userKey) {
    if (this.unreadable) return;
    let changed = false;
    for (const spaceId of Object.keys(this.spaces)) {
      const entry = this.spaces[spaceId];
      if (entry.people[userKey] || entry.favorites?.[userKey]) {
        delete entry.people[userKey];
        if (entry.favorites) delete entry.favorites[userKey];
        this.tidy(spaceId);
        changed = true;
      }
    }
    if (changed) this.save();
  }
}

module.exports = { Layouts, LayoutError, cleanLayout, LAYOUT_LIMITS };
