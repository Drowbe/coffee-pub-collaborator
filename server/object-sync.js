// After a module writes or deletes an object, tell the modules that point at it, and keep a held pointer
// true (plan-linked-objects.md). The routes call afterWrite. A write this file makes itself does not, so
// nothing here is sent again. `tz` is the writer's zone, used to turn an instant into a day. A zone Intl
// does not accept falls back to TZ, then UTC, and never refuses the write.
'use strict';

const { EventEmitter } = require('events');

const bus = new EventEmitter();
bus.setMaxListeners(0);

let deps = null;

function writerZone(tz) {
  const accept = (zone) => {
    if (typeof zone !== 'string' || !zone || zone.length > 64) return null;
    try {
      Intl.DateTimeFormat(undefined, { timeZone: zone });
      return zone;
    } catch {
      return null;
    }
  };
  return accept(tz) || accept(process.env.TZ) || 'UTC';
}

// The calendar day of a summary `when` in the writer's zone. A plain date is already a day. An instant
// (anything Date.parse accepts) is the day it falls on in that zone, so a time near midnight can be
// yesterday in one zone and today in another.
function dayInZone(when, tz) {
  if (typeof when !== 'string' || !when) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(when)) return when;
  const ms = Date.parse(when);
  if (Number.isNaN(ms)) return null;
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(ms));
  const get = (type) => parts.find((p) => p.type === type)?.value;
  const year = get('year');
  const month = get('month');
  const day = get('day');
  if (!year || !month || !day) return null;
  return `${year}-${month}-${day}`;
}

function configure(next) {
  deps = next;
}

function refOf(moduleId, produce, id, scopeKey) {
  if (scopeKey === 'environment') return { module: moduleId, kind: produce.kind, id, scope: 'environment' };
  if (scopeKey.startsWith('person:')) return { module: moduleId, kind: produce.kind, id, scope: 'person' };
  if (scopeKey.startsWith('space:')) return { module: moduleId, kind: produce.kind, id, scope: 'space', space: scopeKey.slice('space:'.length) };
  return null;
}

function scopeKeyOfHolder(ref) {
  if (ref.scope === 'space' && ref.space) return `space:${ref.space}`;
  if (ref.scope === 'environment') return 'environment';
  return null;
}

function pointsAt(value, field, ref) {
  const got = value?.[field];
  if (!got || typeof got !== 'object') return false;
  return got.module === ref.module && got.kind === ref.kind && String(got.id) === String(ref.id) && got.scope === ref.scope && (ref.scope !== 'space' || got.space === ref.space);
}

// The stored object that `holder` says it is, when that kind declares `holds`. Null when it cannot be read.
function held(holder) {
  const produce = deps.produceOf(holder.module, holder.kind);
  if (!produce?.holds) return null;
  const scopeKey = scopeKeyOfHolder(holder);
  if (!scopeKey) return null;
  const key = produce.key.replace('{id}', holder.id);
  return { produce, scopeKey, key, value: deps.read(holder.module, scopeKey, key) };
}

function applyDelete(holder, ref, by) {
  const loaded = held(holder);
  if (!loaded || !pointsAt(loaded.value, loaded.produce.holds.field, ref)) return;
  const { produce, scopeKey, key, value } = loaded;
  if (produce.holds.onDelete === 'remove') {
    deps.remove(holder.module, scopeKey, key, by);
    deps.dropLinks(holder);
    return;
  }
  const mark = produce.holds.markField;
  if (!mark || !value || typeof value !== 'object' || value[mark] === true) return;
  deps.write(holder.module, scopeKey, key, { ...value, [mark]: true }, by);
}

function applyFollow(holder, ref, beforeSummary, afterSummary, zone, by) {
  const loaded = held(holder);
  const follow = loaded?.produce.holds.follow;
  if (!follow || !loaded.value || typeof loaded.value !== 'object') return;
  if (!pointsAt(loaded.value, loaded.produce.holds.field, ref)) return;
  const next = { ...loaded.value };
  let changed = false;
  if (follow.title && typeof afterSummary?.title === 'string' && next[follow.title] !== afterSummary.title) {
    next[follow.title] = afterSummary.title;
    changed = true;
  }
  // Move a placed holder onto the object's new day only when it was sitting on the old one and is not pinned.
  if (follow.day) {
    const oldDay = dayInZone(beforeSummary?.when, zone);
    const newDay = dayInZone(afterSummary?.when, zone);
    const pinned = follow.pin ? next[follow.pin] === true : false;
    const heldDay = next[follow.day];
    if (typeof heldDay === 'string' && heldDay && !pinned && oldDay && newDay && heldDay === oldDay && newDay !== oldDay) {
      next[follow.day] = newDay;
      changed = true;
    }
  }
  if (changed) deps.write(holder.module, loaded.scopeKey, loaded.key, next, by);
}

// { module, scopeKey, key, before, after, by, tz }. `before` and `after` are the stored values; `after` is null
// when the object was deleted. Does nothing when the key is not a produced kind, nothing points at it, or an
// update leaves its summary the same.
function afterWrite({ module, scopeKey, key, before, after, by, tz }) {
  const zone = writerZone(tz);
  if (!deps) return;
  const found = deps.produceFor(module, key);
  if (!found) return;
  const ref = refOf(module, found.produce, found.id, scopeKey);
  if (!ref) return;
  const holders = deps.linksTo(ref);
  if (!holders.length) return;
  if (after == null) {
    for (const holder of holders) {
      try { applyDelete(holder, ref, by); } catch { /* a holder that cannot be written waits */ }
    }
    bus.emit('refchange', { ref, change: 'deleted', holders });
    return;
  }
  const beforeSummary = deps.summarize(module, found.produce, ref, found.id, before);
  const afterSummary = deps.summarize(module, found.produce, ref, found.id, after);
  if (JSON.stringify(beforeSummary) === JSON.stringify(afterSummary)) return;
  for (const holder of holders) {
    try { applyFollow(holder, ref, beforeSummary, afterSummary, zone, by); } catch { /* a holder that cannot be written waits */ }
  }
  bus.emit('refchange', { ref, change: 'updated', holders });
}

module.exports = {
  writerZone,
  dayInZone,
  configure,
  afterWrite,
  on: (event, fn) => bus.on(event, fn),
  off: (event, fn) => bus.off(event, fn),
};
