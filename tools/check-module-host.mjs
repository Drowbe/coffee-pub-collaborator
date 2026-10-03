#!/usr/bin/env node
/*
 * check-module-host.mjs -- the pointer shape modules and the host agree on, run on its own.
 *
 * Since plan-names step 5c a module speaks the server's names directly: a pointer is
 * { module, kind, id, scope: 'space' | 'environment' | 'person', space? }, and nothing translates between an old and a
 * new shape. Two places check a pointer's shape before it goes anywhere: the page side (public/module-host.js,
 * REF_SHAPE and cleanPointer) and the SDK in the module (public/sdk/host.js, cleanRef). This slices those few lines out
 * of each and checks that they accept the one shape, keep only its own fields, and refuse the old one (scope 'room'
 * with `room`, scope 'server'): the hard break of decision 2.
 *
 *   node tools/check-module-host.mjs
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';

function slice(file, startMark, endMark) {
  const src = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const start = src.indexOf(startMark);
  const end = src.indexOf(endMark, start);
  if (start === -1 || end === -1) {
    console.error(`check-module-host: could not find "${startMark}" ... "${endMark}" in ${file}`);
    process.exit(1);
  }
  return src.slice(start, end + endMark.length);
}

const hostSrc = slice('public/module-host.js', 'const REF_SHAPE', 'const cleanPointer = (r) => ({ module: r.module, kind: r.kind, id: r.id, scope: r.scope, ...(r.scope === \'space\' ? { space: r.space } : {}) });');
const { REF_SHAPE, cleanPointer } = new Function(`${hostSrc}\nreturn { REF_SHAPE, cleanPointer };`)();
const sdkSrc = slice('public/sdk/host.js', 'function cleanRef(ref) {', '\n  }\n');
const cleanRef = new Function(`${sdkSrc}\nreturn cleanRef;`)();

let failed = 0;
let n = 0;
const test = (name, fn) => {
  try { fn(); n += 1; } catch (err) { failed += 1; console.error(`check-module-host: ${name}: ${err.message}`); }
};
const base = { module: 'todo', kind: 'task', id: 'abc' };
const inSpace = { ...base, scope: 'space', space: 'gq2zb7pq' };

test('a pointer in a space, the environment or a person is accepted by both sides', () => {
  for (const p of [inSpace, { ...base, scope: 'environment' }, { ...base, scope: 'person' }]) {
    assert.ok(REF_SHAPE(p), `module-host refused ${JSON.stringify(p)}`);
    assert.deepEqual(cleanRef(p), p);
    assert.deepEqual(cleanPointer(p), p);
  }
});
test('each side keeps only the pointer\'s own fields, and a place only for a space', () => {
  const extra = { ...inSpace, title: 'not part of a pointer', room: 'old' };
  assert.deepEqual(cleanRef(extra), inSpace);
  assert.deepEqual(cleanPointer(extra), inSpace);
  assert.deepEqual(cleanRef({ ...base, scope: 'environment', space: 'x' }), { ...base, scope: 'environment' });
  assert.deepEqual(cleanPointer({ ...base, scope: 'environment', space: 'x' }), { ...base, scope: 'environment' });
});
test('the old shape is refused, not translated', () => {
  for (const p of [{ ...base, scope: 'room', room: 'gq2zb7pq' }, { ...base, scope: 'server' }, { ...base, scope: 'rooms' }, { ...base, scope: 'room', space: 'gq2zb7pq' }]) {
    assert.equal(Boolean(REF_SHAPE(p)), false, `module-host accepted ${JSON.stringify(p)}`);
    assert.equal(cleanRef(p), null, `the SDK accepted ${JSON.stringify(p)}`);
  }
});
test('a space pointer needs its space, of a sane length', () => {
  for (const p of [{ ...base, scope: 'space' }, { ...base, scope: 'space', space: 7 }, { ...base, scope: 'space', space: 'x'.repeat(65) }]) {
    assert.equal(Boolean(REF_SHAPE(p)), false);
    assert.equal(cleanRef(p), null);
  }
});
test('nothing is left of the old translation (WIRE_SCOPE, toSdk, toWire)', () => {
  const src = fs.readFileSync(new URL('../public/module-host.js', import.meta.url), 'utf8');
  for (const name of ['WIRE_SCOPE', 'SDK_SCOPE', 'toSdk', 'toWire', 'pointersIn']) assert.equal(src.includes(name), false, `${name} is still in module-host.js`);
});

// Where a module's call goes (placeOf in public/module-host.js; plan-calendar-destination, "SDK and the host"): a module's
// environment page may name one of the viewer's spaces with { space } (to read and write there, the server deciding), a
// mount in a space reaches only its own space, and the rules that were there before still hold.
{
  const src = slice('public/module-host.js', 'const SPACE_ID', '\n  return { scope: \'space\', space };\n}\n');
  const placeOf = new Function(`${src}\nreturn placeOf;`)();
  const env = { scope: 'environment', spaceId: null, moduleScopes: ['environment', 'space'] };
  const inSpace = { scope: 'space', spaceId: 'gq2zb7pq', moduleScopes: ['environment', 'space'] };
  const refused = (fn, re) => assert.throws(fn, (err) => err.status === 400 && (!re || re.test(err.message)));
  test('an environment page names a space with { space }, with or without scope "space"', () => {
    assert.deepEqual(placeOf(undefined, 'abc123', env), { scope: 'space', space: 'abc123' });
    assert.deepEqual(placeOf('context', 'abc123', env), { scope: 'space', space: 'abc123' });
    assert.deepEqual(placeOf('space', 'abc123', env), { scope: 'space', space: 'abc123' });
  });
  test('an environment page without a space stays in the environment, and reads across spaces as before', () => {
    assert.deepEqual(placeOf(undefined, undefined, env), { scope: 'environment', space: null });
    assert.deepEqual(placeOf('environment', null, env), { scope: 'environment', space: null });
    assert.deepEqual(placeOf('spaces', undefined, env), { scope: 'spaces', space: null });
    refused(() => placeOf('space', undefined, env), /not in a space/);
  });
  test('a space mount keeps to its own space and refuses another', () => {
    assert.deepEqual(placeOf(undefined, undefined, inSpace), { scope: 'space', space: 'gq2zb7pq' });
    assert.deepEqual(placeOf('space', undefined, inSpace), { scope: 'space', space: 'gq2zb7pq' });
    assert.deepEqual(placeOf(undefined, 'gq2zb7pq', inSpace), { scope: 'space', space: 'gq2zb7pq' });
    assert.deepEqual(placeOf('environment', undefined, inSpace), { scope: 'environment', space: null });
    refused(() => placeOf(undefined, 'other1', inSpace), /another space/);
    refused(() => placeOf('space', 'other1', inSpace), /another space/);
    refused(() => placeOf('spaces', undefined, inSpace), /environment page/);
  });
  test('a space goes only with scope "space", must look like an id, and needs a module with the space scope', () => {
    refused(() => placeOf('environment', 'abc123', env), /scope "space"/);
    refused(() => placeOf('spaces', 'abc123', env), /scope "space"/);
    refused(() => placeOf('person', 'abc123', { ...env, moduleScopes: ['environment', 'space', 'person'] }), /scope "space"/);
    for (const bad of ['a b', 'x'.repeat(65), '../x', 7]) refused(() => placeOf(undefined, bad, env), /not a space/);
    refused(() => placeOf(undefined, 'abc123', { ...env, moduleScopes: ['environment'] }), /no space scope/);
  });
  test('the person scope and the old names are as before', () => {
    refused(() => placeOf('person', undefined, env), /no personal scope/);
    assert.deepEqual(placeOf('person', undefined, { ...env, moduleScopes: ['environment', 'person'] }), { scope: 'person', space: null });
    for (const old of ['server', 'room', 'rooms']) refused(() => placeOf(old, undefined, env), /old name/);
    refused(() => placeOf('everywhere', undefined, env), /not one of/);
  });
  test('storage, schedule, notify and links pass the space on (module-host.js and the SDK)', () => {
    const host = fs.readFileSync(new URL('../public/module-host.js', import.meta.url), 'utf8');
    for (const call of ['storage.get', 'storage.set', 'storage.delete', 'storage.list', 'cancelSchedule']) {
      const at = host.indexOf(`async ${call.includes('.') ? `'${call}'` : call}(`);
      assert.ok(at > 0, `${call} is in module-host.js`);
      assert.match(host.slice(at, host.indexOf('\n    },', at)), /scopeOf\(s, space\)/, `${call} passes { space }`);
    }
    for (const call of ['schedule', 'notify']) {
      const at = host.indexOf(`async ${call}(spec)`);
      assert.match(host.slice(at, host.indexOf('\n    },', at)), /scopeOf\(spec\?\.scope, spec\?\.space\)[^\n]*space: undefined/, `${call} passes { space } and keeps it out of the body`);
    }
    assert.ok(host.includes("async 'objects.setLinks'({ from, to, space })"), 'setLinks takes { space }');
    const sdk = fs.readFileSync(new URL('../public/sdk/host.js', import.meta.url), 'utf8');
    assert.ok(sdk.includes("const opts = (o) => ({ scope: (o && o.scope) || 'context', ...(o && o.space ? { space: String(o.space) } : {}) });"), 'the SDK passes { space }');
  });
}

// host.objects.search (objectSearchParams in public/module-host.js; plan-map-destination, "SDK and the host"): an
// environment page may search every space at once and ask only for summaries with a place; a space mount may not.
{
  const placeSrc = slice('public/module-host.js', 'const SPACE_ID', '\n  return { scope: \'space\', space };\n}\n');
  const src = slice('public/module-host.js', 'function objectSearchParams(', '// --- end of the search');
  const objectSearchParams = new Function(`${placeSrc}\n${src}\nreturn objectSearchParams;`)();
  const env = { scope: 'environment', spaceId: null, moduleScopes: ['environment', 'space'] };
  const inSpace = { scope: 'space', spaceId: 'gq2zb7pq', moduleScopes: ['environment', 'space'] };
  const q = (o, mount) => Object.fromEntries(objectSearchParams('maps', o, mount));
  const refused = (fn) => assert.throws(fn, (err) => err.status === 400);
  test('search: an environment page asks every space at once, and only for places', () => {
    assert.deepEqual(q({ q: '', scope: 'spaces', has: 'place' }, env), { from: 'maps', q: '', scope: 'spaces', has: 'place' });
    assert.deepEqual(q({ q: 'cafe', scope: 'spaces' }, env), { from: 'maps', q: 'cafe', scope: 'spaces' });
  });
  test('search: a space mount, or a keyed page, cannot ask across spaces', () => {
    refused(() => q({ scope: 'spaces' }, inSpace));
    refused(() => q({ scope: 'spaces' }, { ...env, keyed: true }));
    refused(() => q({ scope: 'spaces', space: 'abc123' }, env));
  });
  test('search: one place as before, has only "place"', () => {
    assert.deepEqual(q({ q: 'x' }, inSpace), { from: 'maps', q: 'x', scope: 'space', space: 'gq2zb7pq' });
    assert.deepEqual(q({ q: 'x', scope: 'environment', has: 'place' }, inSpace), { from: 'maps', q: 'x', scope: 'environment', has: 'place' });
    assert.deepEqual(q({ scope: 'person' }, inSpace), { from: 'maps', q: '', scope: 'person' });
    assert.deepEqual(q({ space: 'abc123' }, env), { from: 'maps', q: '', scope: 'space', space: 'abc123' });
    refused(() => q({ space: 'other1' }, inSpace));
    refused(() => q({ has: 'date' }, env));
  });
}

// host.actions.list with the object a drop is about (decision 21): the host passes the pointer on, cleaned, and the drop
// asks with the dropped object, so the server lists only what can be done in that object's own place.
test('actions.list passes a valid ref on, cleaned, and drops a bad one; the drop menu asks with the dropped object', () => {
  const src = fs.readFileSync(new URL('../public/module-host.js', import.meta.url), 'utf8');
  const at = src.indexOf("async 'actions.list'(");
  const body = src.slice(at, src.indexOf('\n    },', at));
  const run = new Function('REF_SHAPE', 'cleanPointer', `return (${body.replace("async 'actions.list'", 'function')}\n    });`.replace(/\(await api\('GET', `\/api\/bus\/actions\?\$\{busQuery\(\{ from: module\.id, \.\.\.extra \}\)\}`\)\)\.actions/, 'extra'));
  const list = run(REF_SHAPE, cleanPointer);
  const ref = { module: 'todo', kind: 'task', id: 'list', scope: 'space', space: 'gq2zb7pq', title: 'x' };
  assert.deepEqual(list({ accepts: 'todo:task', ref }), { accepts: 'todo:task', ref: JSON.stringify({ module: 'todo', kind: 'task', id: 'list', scope: 'space', space: 'gq2zb7pq' }) });
  assert.deepEqual(list({ accepts: 'todo:task', ref: { module: 'todo', scope: 'room' } }), { accepts: 'todo:task' });
  assert.deepEqual(list({}), {});
  const sdk = fs.readFileSync(new URL('../public/sdk/host.js', import.meta.url), 'utf8');
  assert.ok(sdk.includes("list: (o) => call('actions.list', { accepts: o && o.accepts, self: Boolean(o && o.self), ref: o && o.ref }),"), 'the SDK passes ref');
  assert.ok(sdk.includes('host.actions.list({ accepts: `${d.ref.module}:${d.ref.kind}`, ref: d.ref })'), 'a drop asks with the dropped object');
});

// A destination's shared state (createDestination in public/module-host.js): the page sets what it owns, every part
// hears every change, and a part may set only what its destination lets it (the calendar: main sets the day and the
// period; the map: either part selects).
{
  const src = slice('public/module-host.js', '// --- destinations', '// --- end of destinations').replace('export function createDestination', 'function createDestination');
  const createDestination = new Function(`${hostSrc}\n${src}\nreturn createDestination;`)();
  const listen = (hub, part) => { const got = []; hub.join(part, (s) => got.push(s)); return got; };
  const status = (fn, code) => assert.throws(fn, (err) => err.status === code);
  test('the calendar: the page\'s state reaches every part, and only main sets the day and the period', () => {
    const hub = createDestination('calendar', { view: 'month', spaces: ['a1'], environment: true });
    const main = listen(hub, 'main');
    const panel = listen(hub, 'panel');
    const page = [];
    hub.onChange((s) => page.push(s));
    hub.update({ view: 'week' });
    assert.equal(main.at(-1).view, 'week');
    assert.equal(panel.at(-1).view, 'week');
    const period = { day: '2026-10-02', from: '2026-09-27', to: '2026-10-04' };
    hub.fromPart('main', period);
    assert.deepEqual(panel.at(-1), { view: 'week', spaces: ['a1'], environment: true, ...period });
    assert.deepEqual(main.at(-1), panel.at(-1));
    assert.equal(page.length, 2);
    status(() => hub.fromPart('panel', { day: '2026-10-03' }), 403);
    status(() => hub.fromPart('main', { view: 'day' }), 403);
    status(() => hub.fromPart('main', { selected: null }), 403);
    status(() => hub.fromPart('main', { reveal: 'panel' }), 403); // the calendar's parts do not ask
    status(() => hub.fromPart('main', { day: '2 October' }), 400);
    status(() => hub.fromPart('main', 'day'), 400);
    assert.equal(hub.state.day, '2026-10-02');
    hub.fromPart('main', { day: '2026-10-02' }); // nothing changed: nobody is told again
    assert.equal(panel.length, 2);
  });
  // The kinds of markers the calendar has shown (plan-calendar-markers.md), for the page's filter: main only, checked.
  test('the calendar: main tells the page the kinds of markers it shows, in shape; the panel cannot', () => {
    const hub = createDestination('calendar', { view: 'month' });
    const panel = listen(hub, 'panel');
    const kinds = [{ id: 'todo:task', label: 'Tasks due', icon: 'list-check', tint: 'green' }, { id: 'polls:poll', label: ' Polls closing ', icon: 'Bad Icon', tint: 'plaid', extra: 1 }];
    hub.fromPart('main', { markerKinds: kinds });
    assert.deepEqual(panel.at(-1).markerKinds, [{ id: 'todo:task', label: 'Tasks due', icon: 'list-check', tint: 'green' }, { id: 'polls:poll', label: 'Polls closing', icon: 'calendar-check', tint: null }]);
    hub.fromPart('main', { markerKinds: [] });
    assert.deepEqual(hub.state.markerKinds, []);
    status(() => hub.fromPart('panel', { markerKinds: [] }), 403);
    status(() => hub.fromPart('main', { markerKinds: 'todo:task' }), 400);
    status(() => hub.fromPart('main', { markerKinds: [{ id: 'no kind', label: 'x' }] }), 400);
    status(() => hub.fromPart('main', { markerKinds: [{ id: 'todo:task', label: '  ' }] }), 400);
    status(() => hub.fromPart('main', { markerKinds: Array.from({ length: 21 }, (_, i) => ({ id: `m${i}:k`, label: 'K' })) }), 400);
  });
  test('the map: either part selects, with a pointer or null, and a part that left hears nothing', () => {
    const hub = createDestination('map', { q: '' });
    const main = listen(hub, 'main');
    const got = [];
    const leave = hub.join('panel', (s) => got.push(s));
    const place = { module: 'places', kind: 'place', id: 'p1', scope: 'space', space: 'gq2zb7pq', title: 'not a pointer field' };
    hub.fromPart('panel', { selected: place });
    assert.deepEqual(main.at(-1).selected, { module: 'places', kind: 'place', id: 'p1', scope: 'space', space: 'gq2zb7pq' });
    hub.fromPart('main', { selected: null });
    assert.equal(got.at(-1).selected, null);
    status(() => hub.fromPart('main', { selected: { module: 'places', kind: 'place', id: 'p1', scope: 'room', room: 'x' } }), 400);
    status(() => hub.fromPart('panel', { day: '2026-10-02' }), 403);
    // Either part may ask the page to show a part (a phone's tabs); nothing else, and never the page's own `phone`.
    hub.fromPart('main', { reveal: 'panel' });
    assert.equal(main.at(-1).reveal, 'panel');
    status(() => hub.fromPart('main', { reveal: 'sideways' }), 400);
    status(() => hub.fromPart('panel', { phone: true }), 403);
    leave();
    hub.update({ q: 'cafe' });
    assert.equal(got.length, 3);
    assert.equal(main.at(-1).q, 'cafe');
  });
  test('an unknown destination is refused', () => {
    assert.throws(() => createDestination('kitchen'));
  });
  test('a part is told the destination and its state in the hello, and mounting checks the part', () => {
    const host = fs.readFileSync(new URL('../public/module-host.js', import.meta.url), 'utf8');
    // Every module hears the environment's name (decision 19: Where and the filter name the environment's own alike).
    assert.ok(host.includes('environment: { name: envName }'), 'the hello carries info.context.environment.name');
    assert.ok(/fetch\('\/api\/branding'\)/.test(host), 'from the public branding, asked once per page');
    for (const piece of ['destination: { id: destination.hub.id, part: destination.part }', 'destinationState: destination.hub.state', 'part is "main" or "panel"', 'destination.hub.join(destination.part,', 'leaveDestination();']) {
      assert.ok(host.includes(piece), `module-host.js has ${piece}`);
    }
    assert.ok(/async 'destination\.set'\(\{ patch \}\) \{\n\s+if \(!destination\)/.test(host), 'destination.set refuses a mount that is not a part');
  });
}

// host.presence.get (presenceForModule in public/module-host.js): a person's place as the viewer may know it (plan-primary-nav
// step 3) reaches the module: `aside` and `elsewhere` pass through, and `activeSpace` may be null.
{
  const src = slice('public/module-host.js', 'function presenceForModule(d) {', '\n}\n');
  const presenceForModule = new Function(`${src}\nreturn presenceForModule;`)();
  test('presence: aside, asidePrivate (only with an aside) and elsewhere pass through, and nothing else of the person', () => {
    const p = presenceForModule({ users: [
      { key: 'a', displayName: 'Ana', online: true, space: 'as1', aside: true, asidePrivate: true, elsewhere: false, inCall: true, isOwner: false, secret: 'x' },
      { key: 'b', displayName: 'Bo', online: true, space: null, aside: false, asidePrivate: true, elsewhere: true, inCall: false },
      { key: 'c', displayName: 'Cy', online: false, space: 'sp1' },
    ], activeSpace: null });
    assert.deepEqual(p.people, [
      { key: 'a', name: 'Ana', online: true, space: 'as1', aside: true, asidePrivate: true, elsewhere: false, inCall: true, isOwner: false },
      { key: 'b', name: 'Bo', online: true, space: null, aside: false, asidePrivate: false, elsewhere: true, inCall: false, isOwner: false },
      { key: 'c', name: 'Cy', online: false, space: 'sp1', aside: false, asidePrivate: false, elsewhere: false, inCall: false, isOwner: false },
    ]);
  });
  test('presence: activeSpace null, missing or a space id', () => {
    assert.equal(presenceForModule({ activeSpace: null }).activeSpace, null);
    assert.equal(presenceForModule({}).activeSpace, null);
    assert.equal(presenceForModule({ activeSpace: 'sp1' }).activeSpace, 'sp1');
    assert.deepEqual(presenceForModule({}).people, []);
  });
}

// A module's own window (public/module.js): Clear in the title bar's "..." runs clearModuleData, a top-level function.
// It once used start()'s local `scope` and failed with "scope is not defined". Run it with only the page's top-level
// names (id, spaceId, guestToken, api) and check what it asks the server to clear.
{
  const clearSrc = slice('public/module.js', 'async function clearModuleData() {', '\n}\n');
  const clearFor = (spaceId, guestToken) => {
    const calls = [];
    const api = async (method, url) => { calls.push([method, url]); };
    const fn = new Function('id', 'spaceId', 'guestToken', 'api', `${clearSrc}\nreturn clearModuleData;`)('todo', spaceId, guestToken, api);
    return fn().then(() => calls.map(([method, url]) => [method, url.replace(/&tz=[^&]*/, '')]));
  };
  const cases = [
    ['a module\'s window in a space clears that space', ['gq2zb7pq', null], [['DELETE', '/api/modules/todo/data?scope=space&space=gq2zb7pq']]],
    ['a guest\'s window in a space carries the guest token', ['gq2zb7pq', 'tok'], [['DELETE', '/api/modules/todo/data?scope=space&space=gq2zb7pq&guest=tok']]],
    ['a module\'s window with no space clears the environment\'s data', [null, null], [['DELETE', '/api/modules/todo/data?scope=environment']]],
  ];
  for (const [name, args, want] of cases) {
    try { assert.deepEqual(await clearFor(...args), want); n += 1; } catch (err) { failed += 1; console.error(`check-module-host: Clear in ${name}: ${err.message}`); }
  }
}

// Push to talk in a space (public/space.js, typing to onKey): its key, Space by default, once took Space away from a
// focused button or host-menu entry, and the mic could stay open when the key's release never reached the page. Run the
// sliced handlers against stand-in elements: Space presses a control reached by keyboard and any menu entry, and talks
// on the page, on a link or on a button just clicked; releasing it always stops talking, wherever focus went and
// whatever modifier came down meanwhile; the window losing focus or being hidden stops it too; and every document that
// hears the keys also hears where focus came from and when its window goes away.
{
  const src = slice('public/space.js', '// Whether the key went to a text field.', '\n  event.preventDefault();\n}\n');
  // public/hotkeys.js's rule, without its navigator: the code, and exactly the combo's modifiers.
  const hotkeyMatches = (event, combo) => {
    const parts = combo.split('+');
    const code = parts.pop();
    return event.code === code && event.shiftKey === parts.includes('Shift') && event.ctrlKey === parts.includes('Ctrl') && event.altKey === parts.includes('Alt') && event.metaKey === parts.includes('Meta');
  };
  const el = (tagName, role, parent) => {
    const e = { tagName, role, parent, isContentEditable: false };
    e.matches = (sel) => sel.split(',').map((s) => s.trim()).some((s) => {
      const m = /^\[role=([a-z]+)\]$/.exec(s);
      return m ? e.role === m[1] : s.toUpperCase() === e.tagName;
    });
    e.closest = (sel) => { for (let at = e; at; at = at.parent) if (at.matches(sel)) return at; return null; };
    e.contains = (other) => { for (let at = other; at; at = at.parent) if (at === e) return true; return false; };
    return e;
  };
  const listening = () => {
    const heard = {};
    return { heard, addEventListener(type, fn) { (heard[type] ||= []).push(fn); } };
  };
  const run = (steps, pttKey, inSpace = true, inCall = true, isAway = false) => {
    const mic = [];
    const doc = { ...listening(), visibilityState: 'visible', body: { classList: { contains: (c) => inSpace && c === 'in-space' } } };
    const win = listening();
    const h = new Function('document', 'window', 'prefs', 'call', 'hotkeyMatches', 'reflectMic', 'inCall', 'isAway', `let pttHeld = false;\n${src}\nreturn { onKey, onKeyUp };`)(
      doc, win, { ptt: true, pttKey, muteKey: 'Mod+KeyD', camKey: 'Mod+KeyE' }, { localParticipant: { setMicrophoneEnabled: (on) => { mic.push(on); return Promise.resolve(); } } }, hotkeyMatches, () => {}, inCall, isAway);
    const prevented = [];
    for (const [type, target, code = pttKey, extra = {}] of steps) {
      if (type === 'blur' || type === 'pagehide') { for (const fn of win.heard[type] || []) fn({ type, target: win }); continue; }
      if (type === 'hidden' || type === 'visible') { doc.visibilityState = type; for (const fn of doc.heard.visibilitychange || []) fn({ type: 'visibilitychange', target: doc }); continue; }
      const event = { type, code, key: code === 'Space' ? ' ' : code.replace(/(Left|Right)$/, ''), repeat: false, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false,
        ...extra, target, composedPath: () => [target], preventDefault() { prevented.push(type); } };
      // As in the browser: a key goes to the window's capture listeners first, then the page's; pointer presses and
      // focus to what the document hears.
      if (type === 'keydown') { for (const fn of win.heard.keydown || []) fn(event); h.onKey(event); } else if (type === 'keyup') h.onKeyUp(event);
      else for (const fn of doc.heard[type] || []) fn(event);
    }
    return { mic, prevented };
  };
  const body = el('BODY');
  const button = el('BUTTON', null, body);
  const icon = el('I', null, button);
  const menu = el('DIV', 'menu', body);
  const entry = el('BUTTON', 'menuitem', menu);
  const talks = { mic: [true, false], prevented: ['keydown', 'keyup'] };
  const leaves = { mic: [], prevented: [] };
  const press = (target, code) => [['keydown', target, code], ['keyup', target, code]];
  const tabTo = (target) => [['keydown', body, 'Tab'], ['focusin', target]];
  const click = (target, focused = target) => [['pointerdown', target], ['focusin', focused]];
  const link = el('A', null, body);
  const shift = { shiftKey: true };
  const cases = [
    ['Space on the page talks', press(body), talks],
    ['Space on a button reached by keyboard presses it', [...tabTo(button), ...press(button)], leaves],
    ['Space on a [role=button] reached by keyboard presses it', (() => { const b = el('DIV', 'button', body); return [...tabTo(b), ...press(b)]; })(), leaves],
    ['Space on a <summary> reached by keyboard presses it', (() => { const b = el('SUMMARY', null, body); return [...tabTo(b), ...press(b)]; })(), leaves],
    ['Space on a menu entry picks it, even when the menu was opened by a click', [...click(icon, button), ['focusin', entry], ...press(entry)], leaves],
    ['Space on a menu entry just pressed with the mouse picks it', [...click(icon, button), ['focusin', entry], ...click(entry), ...press(entry)], leaves],
    ['Space on a button reached by keyboard, then clicked, talks (the click moves no focus)', [...tabTo(button), ['pointerdown', icon], ...press(button)], talks],
    ['Space on a button just clicked talks (clicking the mic, then holding Space)', [...click(icon, button), ...press(button)], talks],
    ['Space after a menu entry picked by mouse talks (the menu gives its button focus back by script)', [...click(icon, button), ['focusin', entry], ...click(entry), ['focusin', button], ...press(button)], talks],
    ['Space after a menu closed by Escape presses its button again', [...tabTo(button), ['keydown', button, 'Enter'], ['focusin', entry], ['keydown', entry, 'Escape'], ['focusin', button], ...press(button)], leaves],
    ['Space on a button clicked, then tabbed away from and back to, presses it', [...click(icon, button), ...tabTo(el('BUTTON', null, body)), ...tabTo(button), ...press(button)], leaves],
    ['Space on a link talks (Space does not follow a link)', [...tabTo(link), ...press(link)], talks],
    ['Space in a text field types', press(el('INPUT', null, body)), leaves],
    ['a push-to-talk key a button does not use still talks on a button', [...tabTo(button), ...press(button, 'KeyT')], talks, 'KeyT'],
    ['Enter as the push-to-talk key presses a focused button', [...tabTo(button), ...press(button, 'Enter')], leaves, 'Enter'],
    ['Enter as the push-to-talk key talks on a link', [...tabTo(link), ...press(link, 'Enter')], talks, 'Enter'],
    ['push to talk does nothing outside a space', press(body), leaves, 'Space', false],
    // In a space but not in the call (entering never joins): holding the key must not open the microphone.
    ['push to talk does nothing out of the call', press(body), leaves, 'Space', true, false],
    ['push to talk does nothing out of the call, the key held and the window losing focus', [['keydown', body], ['blur'], ['hidden'], ['keyup', body]], leaves, 'Space', true, false],
    ['releasing after focus moved into a text field stops talking', [['keydown', body], ['keyup', el('INPUT', null, body)]], talks],
    ['releasing after focus moved onto a button stops talking', [['keydown', body], ['keyup', button]], talks],
    ['releasing with Shift pressed meanwhile stops talking', [['keydown', body], ['keydown', body, 'ShiftLeft', shift], ['keyup', body, 'Space', shift], ['keyup', body, 'ShiftLeft']], talks],
    ['releasing Shift+Space (the key set so) without Shift stops talking', [['keydown', body, 'Space', shift], ['keyup', body, 'ShiftLeft'], ['keyup', body, 'Space']], talks, 'Shift+Space'],
    ['a held key keeps talking through repeats, another key and the page coming back into view', [['keydown', body], ['keydown', body, 'Space', { repeat: true }], ['keydown', body, 'ShiftLeft', shift], ['keyup', body, 'ShiftLeft'], ['visible']], { mic: [true], prevented: ['keydown', 'keydown'] }],
    ['the window losing focus while the key is held stops talking', [['keydown', body], ['blur'], ['keyup', body]], { mic: [true, false], prevented: ['keydown'] }],
    ['the page hidden while the key is held stops talking', [['keydown', body], ['hidden']], { mic: [true, false], prevented: ['keydown'] }],
    ['the page going away while the key is held stops talking', [['keydown', body], ['pagehide']], { mic: [true, false], prevented: ['keydown'] }],
    ['the window losing focus with the key up changes nothing, and the next press talks', [['blur'], ['hidden'], ['visible'], ...press(body)], talks],
    // Away, nobody hears you (setAway): the key is the page's still (no scrolling), but it opens nothing.
    ['push to talk opens nothing while away', press(body), { mic: [], prevented: ['keydown'] }, 'Space', true, true, true],
  ];
  for (const [name, steps, want, pttKey = 'Space', inSpace = true, inCall = true, isAway = false] of cases) {
    try { assert.deepEqual(run(steps, pttKey, inSpace, inCall, isAway), want); n += 1; } catch (err) { failed += 1; console.error(`check-module-host: push to talk, ${name}: ${err.message.split('\n')[0]}`); }
  }
  test('every document that hears the call\'s keys hears pointer presses and focus, and its window going away, too (the page and both pop-outs)', () => {
    const page = fs.readFileSync(new URL('../public/space.js', import.meta.url), 'utf8');
    const count = (re) => (page.match(re) || []).length;
    const keys = count(/addEventListener\('keydown', onKey\)/g);
    assert.equal(keys, 3, 'keydown listeners');
    assert.equal(count(/addEventListener\('keyup', onKeyUp\)/g), keys, 'keyup listeners');
    assert.equal(count(/addEventListener\('keydown', noteKey, true\)/g), keys, 'keydown capture listeners');
    assert.equal(count(/addEventListener\('pointerdown', notePointer, true\)/g), keys, 'pointerdown listeners');
    assert.equal(count(/addEventListener\('focusin', noteFocus, true\)/g), keys, 'focusin listeners');
    assert.equal(count(/addEventListener\('blur', releaseTalk\)/g), keys, 'window blur listeners');
    assert.equal(count(/addEventListener\('pagehide', releaseTalk\)/g), keys, 'pagehide listeners');
    assert.equal(count(/addEventListener\('visibilitychange', releaseWhenHidden\)/g), keys, 'visibilitychange listeners');
  });
}

// The person's own other calendars (plan-google-calendar.md, Part 2): host.external.events asks the module's route with
// only `from` and `to`, and the stream's `external` event reaches only the modules the server named.
await (async (name, fn) => {
  try { await fn(); n += 1; } catch (err) { failed += 1; console.error(`check-module-host: ${name}: ${err.message}`); }
})('external: events asks the route with from and to only; the stream event reaches only the modules named', async () => {
  const src = fs.readFileSync(new URL('../public/module-host.js', import.meta.url), 'utf8');
  const at = src.indexOf("async 'external.events'(");
  assert.ok(at > 0, "module-host.js answers 'external.events'");
  const body = src.slice(at, src.indexOf('\n    },', at)).replace("async 'external.events'", 'async function');
  const asked = [];
  const api = async (method, u) => { asked.push([method, u]); return { calendars: [], events: [] }; };
  const url = (path, place, extra) => `${path}?${new URLSearchParams(Object.entries(extra).filter(([, v]) => v !== undefined))}`;
  const make = (externalHere) => new Function('api', 'url', 'scopeOf', 'externalHere', `return (${body}\n    });`)(api, url, () => ({ scope: 'environment' }), externalHere);
  const run = make(true);
  assert.deepEqual(await run({ from: '2026-10-01', to: '2026-11-01', extra: 'no' }), { calendars: [], events: [] });
  await run({});
  assert.deepEqual(asked, [['GET', '/external-events?from=2026-10-01&to=2026-11-01'], ['GET', '/external-events?']]);
  assert.deepEqual(await make(false)({ from: '2026-10-01' }), { calendars: [], events: [] }, 'within a space: none, and nothing asked');
  assert.equal(asked.length, 2);
  const stream = src.slice(src.indexOf("if (type === 'external') {"), src.indexOf("if (type !== 'bus'", src.indexOf("if (type === 'external') {")));
  const deliver = (moduleId, d, here = true) => { const sent = []; new Function('type', 'd', 'module', 'send', 'externalHere', `${stream}`)('external', d, { id: moduleId }, (e, x) => sent.push([e, x]), here); return sent; };
  assert.deepEqual(deliver('calendar', { modules: ['calendar'] }), [['external', {}]]);
  assert.deepEqual(deliver('calendar', { modules: ['calendar'] }, false), [], 'within a space it is never heard');
  assert.deepEqual(deliver('todo', { modules: ['calendar'] }), []);
  assert.deepEqual(deliver('calendar', {}), []);
  assert.match(src, /for \(const type of \[[^\]]*'external'\]\)/, 'the shared stream listens for it');
  // Never within a space, whatever the scope says (the coordinator's decision for #42 Part 2).
  const rule = new Function(`${slice('public/module-host.js', 'export function externalAllowedHere', '// --- end of externalAllowedHere').replace('export function', 'function')}\nreturn externalAllowedHere;`)();
  assert.equal(rule({ scope: 'environment', search: '' }), true, 'the module\'s own page');
  assert.equal(rule({ scope: 'environment', search: '?' }), true, '/calendar');
  assert.equal(rule({ scope: 'space', search: '' }), false, 'a space\'s canvas');
  assert.equal(rule({ scope: 'environment', overCall: true, search: '?from=space&spaceName=Keep' }), false, 'a page opened over a call');
  assert.equal(rule({ scope: 'environment', search: '?from=space' }), false, 'a page that says it is over a call');
  assert.equal(rule({ scope: 'environment', search: '?space=gq2zb7pq&popout=1' }), false, 'a window popped out of a space');
  assert.equal(rule({ scope: 'environment', keyed: true }), false, 'a keyed page');
  assert.match(src, /const externalHere = externalAllowedHere\(\{ scope, keyed: Boolean\(keyed\), overCall: withinSpacePage\(\), search: location\.search \}\);/, 'each mount asks the rule');
  const sdk = fs.readFileSync(new URL('../public/sdk/host.js', import.meta.url), 'utf8');
  assert.ok(sdk.includes("events: (o) => call('external.events', { from: o && o.from, to: o && o.to }),"), 'the SDK passes from and to');
});

// Markers (plan-calendar-markers.md): host.objects.markers asks the module's own route with `from` and `to` in the
// mount's place, answers the list, and a keyed page asks nothing; the stream's `markers` event reaches only the modules
// the server named, with no data.
await (async (name, fn) => {
  try { await fn(); n += 1; } catch (err) { failed += 1; console.error(`check-module-host: ${name}: ${err.message}`); }
})('markers: objects.markers asks the route with from and to; the stream event reaches only the modules named', async () => {
  const src = fs.readFileSync(new URL('../public/module-host.js', import.meta.url), 'utf8');
  const at = src.indexOf("async 'objects.markers'(");
  assert.ok(at > 0, "module-host.js answers 'objects.markers'");
  const body = src.slice(at, src.indexOf('\n    },', at)).replace("async 'objects.markers'", 'async function');
  const asked = [];
  const api = async (method, u) => { asked.push([method, u]); return { markers: [{ title: 'Pack' }] }; };
  const url = (path, place, extra) => `${path}?${new URLSearchParams({ ...place, ...Object.fromEntries(Object.entries(extra).filter(([, v]) => v !== undefined)) })}`;
  const make = (keyed) => new Function('api', 'url', 'scopeOf', 'keyed', `return (${body}\n    });`)(api, url, () => ({ scope: 'space', space: 'gq2zb7pq' }), keyed);
  assert.deepEqual(await make(null)({ from: '2026-10-01', to: '2026-10-31', extra: 'no' }), [{ title: 'Pack' }]);
  assert.deepEqual(asked, [['GET', '/markers?scope=space&space=gq2zb7pq&from=2026-10-01&to=2026-10-31']]);
  assert.deepEqual(await make({ path: '/keyed' })({ from: '2026-10-01', to: '2026-10-31' }), [], 'a keyed page has none');
  assert.equal(asked.length, 1);
  const stream = src.slice(src.indexOf("if (type === 'markers') {"), src.indexOf("if (type !== 'bus'", src.indexOf("if (type === 'markers') {")));
  const deliver = (moduleId, d) => { const sent = []; new Function('type', 'd', 'module', 'send', `${stream}`)('markers', d, { id: moduleId }, (e, x) => sent.push([e, x])); return sent; };
  assert.deepEqual(deliver('calendar', { modules: ['calendar'] }), [['markers', {}]]);
  assert.deepEqual(deliver('todo', { modules: ['calendar'] }), []);
  assert.deepEqual(deliver('calendar', {}), []);
  assert.match(src, /for \(const type of \[[^\]]*'markers'[^\]]*\]\)/, 'the shared stream listens for it');
  const sdk = fs.readFileSync(new URL('../public/sdk/host.js', import.meta.url), 'utf8');
  assert.ok(sdk.includes("markers: (o) => call('objects.markers', { from: o && o.from, to: o && o.to }),"), 'the SDK passes from and to');
});

if (failed) process.exit(1);
console.log(`check-module-host: OK (${n} groups)`);
