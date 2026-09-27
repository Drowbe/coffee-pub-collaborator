// After a module writes or deletes an object, tell the modules that point at it (plan-linked-objects.md,
// step 1). The routes call afterWrite; a write the server makes itself does not, so nothing here is sent again.
// `tz` is the writer's zone, kept for the later steps that turn an instant into a day. A zone Intl does not
// accept falls back to TZ, then UTC, and never refuses the write.
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

function configure(next) {
  deps = next;
}

function refOf(moduleId, produce, id, scopeKey) {
  if (scopeKey === 'environment') return { module: moduleId, kind: produce.kind, id, scope: 'environment' };
  if (scopeKey.startsWith('person:')) return { module: moduleId, kind: produce.kind, id, scope: 'person' };
  if (scopeKey.startsWith('space:')) return { module: moduleId, kind: produce.kind, id, scope: 'space', space: scopeKey.slice('space:'.length) };
  return null;
}

// { module, scopeKey, key, before, after, by, tz }. `before` and `after` are the stored values; `after` is null
// when the object was deleted. Does nothing when the key is not a produced kind, nothing points at it, or an
// update leaves its summary the same.
function afterWrite({ module, scopeKey, key, before, after, tz }) {
  writerZone(tz);
  if (!deps) return;
  const found = deps.produceFor(module, key);
  if (!found) return;
  const ref = refOf(module, found.produce, found.id, scopeKey);
  if (!ref) return;
  const holders = deps.linksTo(ref);
  if (!holders.length) return;
  let change = 'updated';
  if (after == null) change = 'deleted';
  else if (JSON.stringify(deps.summarize(module, found.produce, ref, found.id, before)) === JSON.stringify(deps.summarize(module, found.produce, ref, found.id, after))) return;
  bus.emit('refchange', { ref, change, holders });
}

module.exports = {
  writerZone,
  configure,
  afterWrite,
  on: (event, fn) => bus.on(event, fn),
  off: (event, fn) => bus.off(event, fn),
};
