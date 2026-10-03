#!/usr/bin/env node
/*
 * check-layouts.mjs -- saved layouts, step 1 (documentation/plans/plan-saved-layouts.md, GitHub #161): the pure shape
 * check cleanLayout(), the limits, DATA_DIR/layouts.json (shared per space, each person's own per space), the clean-up
 * when a space or a person is removed, and the four routes under /api/spaces/:id/layouts with their codes for an
 * owner, a moderator, a member, someone not in the space, a guest and nobody signed in. Step 4: a space's
 * defaultLayout (owners only), kept in step with its opensWith both ways, cleared when its layout is deleted, carried by
 * GET /api/modules/for-space, and nothing stored before it changed. The shape check and the file run in-process; the
 * routes run against a throwaway server.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { Layouts, LayoutError, cleanLayout, LAYOUT_LIMITS } = require('../server/layouts.js');
const { Store } = require('../server/store.js');

let n = 0;
const tmp = (name) => fs.mkdtempSync(path.join(os.tmpdir(), `check-layouts-${name}-`));
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const good = () => ({
  name: 'Game night',
  modules: [
    { id: 'conference', mode: 'dock' },
    { id: 'chat', mode: 'float', box: { x: 0.7, y: 0.05, w: 0.27, h: 0.6 }, snap: false },
    { id: 'calendar', mode: 'dock', dockW: 360 },
  ],
  snap: { all: false, pitch: 130 },
});
const refused = (input, pattern, label, options) => {
  const out = cleanLayout(input, options);
  assert.ok(out.error && !out.layout, `${label}: refused (${JSON.stringify(out)})`);
  if (pattern) assert.match(out.error, pattern, label);
  assert.match(out.error, /^[^\n]+\.$/, `${label}: one sentence`);
  n += 1;
};

// --- cleanLayout: the shape -------------------------------------------------------------------------------------

{
  const out = cleanLayout(good());
  assert.deepEqual(out.layout, good(), 'a good layout comes back as sent');
  const trimmed = cleanLayout({ ...good(), name: '  Game \t night  ', shared: true, modules: [{ id: 'calendar', mode: 'dock', dockW: 360.4 }], snap: { all: true, pitch: 99.6 } }).layout;
  assert.equal(trimmed.name, 'Game night', 'the name is trimmed, its whitespace collapsed');
  assert.equal(trimmed.shared, true);
  assert.equal(trimmed.modules[0].dockW, 360, 'pixels rounded');
  assert.equal(trimmed.snap.pitch, 100);
  assert.ok(!('snap' in cleanLayout({ name: 'x', modules: [{ id: 'chat', mode: 'dock' }] }).layout), 'snap may be left out');
  assert.equal(cleanLayout({ ...good(), name: 'é'.repeat(LAYOUT_LIMITS.name) }).layout.name.length, 40, '40 characters is allowed');
  assert.equal(cleanLayout({ ...good(), modules: Array.from({ length: 20 }, (_, i) => ({ id: `m${i}`, mode: 'dock' })) }).layout.modules.length, 20, '20 modules is allowed');
  const edge = cleanLayout({ name: 'Edge', modules: [{ id: 'a', mode: 'dock', dockW: 160 }, { id: 'b', mode: 'dock', dockW: 2000 }, { id: 'c', mode: 'float', box: { x: 0, y: 1, w: 1, h: 0.01 } }], snap: { all: true, pitch: 320 } });
  assert.ok(edge.layout, `the limits themselves are allowed: ${edge.error}`);
  assert.ok(cleanLayout({ ...good(), snap: { all: false, pitch: 50 } }).layout);
  n += 1;

  refused(null, /JSON/, 'not an object');
  refused([], /JSON/, 'a list');
  refused({ ...good(), extra: 1 }, /"extra"/, 'an unknown top-level field');
  refused({ ...good(), name: undefined }, /name/, 'no name');
  refused({ ...good(), name: '   ' }, /name/, 'a blank name');
  refused({ ...good(), name: 7 }, /text/, 'a name that is not text');
  refused({ ...good(), name: 'x'.repeat(41) }, /40 characters/, 'a name of 41 characters');
  refused({ ...good(), shared: 'yes' }, /shared with true or false/, 'shared not a boolean');
  refused({ ...good(), modules: [] }, /List the/, 'no modules');
  refused({ ...good(), modules: 'chat' }, /List the/, 'modules not a list');
  refused({ ...good(), modules: Array.from({ length: 21 }, (_, i) => ({ id: `m${i}`, mode: 'dock' })) }, /at most 20/, '21 modules');
  refused({ ...good(), modules: ['chat'] }, /id and a mode/, 'a module that is a string');
  refused({ ...good(), modules: [{ id: 'Chat', mode: 'dock' }] }, /"Chat" is not a module id/, 'a bad id');
  refused({ ...good(), modules: [{ mode: 'dock' }] }, /null is not a module id/, 'no id');
  refused({ ...good(), modules: [{ id: 'chat', mode: 'dock' }, { id: 'chat', mode: 'float' }] }, /listed twice/, 'an id twice');
  refused({ ...good(), modules: [{ id: 'chat', mode: 'window' }] }, /dock or float/, 'mode window');
  refused({ ...good(), modules: [{ id: 'chat' }] }, /dock or float/, 'no mode');
  refused({ ...good(), modules: [{ id: 'chat', mode: 'dock', cell: 3 }] }, /"cell"/, 'an unknown module field');
  refused({ ...good(), modules: [{ id: 'chat', mode: 'dock', dockW: 159 }] }, /160 to 2000/, 'dockW 159');
  refused({ ...good(), modules: [{ id: 'chat', mode: 'dock', dockW: 2001 }] }, /160 to 2000/, 'dockW 2001');
  refused({ ...good(), modules: [{ id: 'chat', mode: 'dock', dockW: '300' }] }, /160 to 2000/, 'dockW as text');
  refused({ ...good(), modules: [{ id: 'chat', mode: 'float', box: { x: 0, y: 0, w: 1.2, h: 0.5 } }] }, /fraction/, 'a box wider than the canvas');
  refused({ ...good(), modules: [{ id: 'chat', mode: 'float', box: { x: -0.1, y: 0, w: 0.5, h: 0.5 } }] }, /fraction/, 'a negative fraction');
  refused({ ...good(), modules: [{ id: 'chat', mode: 'float', box: { x: 0, y: 0, w: 0, h: 0.5 } }] }, /above 0/, 'a box of no width');
  refused({ ...good(), modules: [{ id: 'chat', mode: 'float', box: { x: 0, y: 0, w: 0.5 } }] }, /fraction/, 'a box with no h');
  refused({ ...good(), modules: [{ id: 'chat', mode: 'float', box: { x: 0, y: 0, w: 0.5, h: 0.5, z: 1 } }] }, /fraction/, 'a box with z');
  refused({ ...good(), modules: [{ id: 'chat', mode: 'float', snap: 'yes' }] }, /snap must be true or false/, 'a module snap not a boolean');
  refused({ ...good(), snap: { all: false, pitch: 49 } }, /50 to 320/, 'pitch 49');
  refused({ ...good(), snap: { all: false, pitch: 321 } }, /50 to 320/, 'pitch 321');
  refused({ ...good(), snap: { pitch: 100 } }, /all true or false/, 'snap with no all');
  refused({ ...good(), snap: true }, /snap must be/, 'snap not an object');
  refused({ ...good(), snap: { all: true, pitch: 100, cells: 3 } }, /snap must be/, 'snap with an extra field');
  refused({ ...good(), modules: [{ id: 'chat', mode: 'dock' }, { id: 'map', mode: 'dock', dockW: 50 }] }, /"map"/, 'one bad entry refuses the whole layout');

  // A PUT: any of name, modules, snap; never shared.
  assert.deepEqual(cleanLayout({ name: 'Planning' }, { partial: true }).layout, { name: 'Planning' });
  assert.deepEqual(cleanLayout({}, { partial: true }).layout, {});
  assert.deepEqual(cleanLayout({ snap: { all: true, pitch: 80 } }, { partial: true }).layout, { snap: { all: true, pitch: 80 } });
  refused({ shared: true }, /moved between/, 'a PUT cannot move a layout between lists', { partial: true });
  refused({ name: '' }, /name/, 'a PUT with a blank name', { partial: true });
  refused({ modules: [] }, /List the/, 'a PUT with no modules', { partial: true });
}

// --- the file: lists, limits, names, clean-up --------------------------------------------------------------------

{
  const dir = tmp('file');
  const layouts = new Layouts(dir);
  assert.ok(!fs.existsSync(path.join(dir, 'layouts.json')), 'nothing written until something is saved');
  const g = cleanLayout(good()).layout;
  const shared = layouts.add('s1', 'pat', { ...g, shared: true });
  assert.match(shared.id, /^l[a-z0-9]{6}$/);
  assert.equal(shared.by, 'pat');
  assert.ok(!Number.isNaN(Date.parse(shared.at)));
  assert.ok(!('shared' in shared), 'shared is where it is kept, not a field');
  const mine = layouts.add('s1', 'pat', { ...g, name: 'game NIGHT' });
  assert.notEqual(mine.id, shared.id, 'the same name in the other list is fine');
  const onDisk = readJson(path.join(dir, 'layouts.json'));
  assert.deepEqual(Object.keys(onDisk), ['spaces']);
  assert.equal(onDisk.spaces.s1.shared[0].id, shared.id);
  assert.equal(onDisk.spaces.s1.people.pat[0].id, mine.id);
  assert.deepEqual(new Layouts(dir).list('s1', 'pat'), layouts.list('s1', 'pat'), 'read back as written');
  assert.deepEqual(layouts.list('s1', null).mine, [], 'a guest has none of their own');
  assert.equal(layouts.list('s1', 'sam').mine.length, 0, "nobody sees another person's own");
  assert.equal(layouts.list('s1', 'sam').shared.length, 1, 'everyone sees the shared ones');
  assert.equal(layouts.find('s1', mine.id, 'sam'), null, "another person's own is not found for anyone else");

  // Names unique in their list, regardless of case: 409 with the id of the one that has it.
  assert.throws(() => layouts.add('s1', 'pat', { ...g, name: 'GAME night' }), (e) => e instanceof LayoutError && e.status === 409 && e.extra.id === mine.id && e.message === 'There is already a layout called game NIGHT.');
  assert.throws(() => layouts.add('s1', 'sam', { ...g, shared: true, name: 'Game Night' }), (e) => e.status === 409 && e.extra.id === shared.id);
  assert.equal(layouts.add('s2', 'pat', { ...g }).name, 'Game night', 'the same name in another space is fine');

  // 10 personal per person per space, 10 shared per space.
  for (let i = 1; i < 10; i += 1) layouts.add('s1', 'pat', { ...g, name: `Mine ${i}` });
  assert.throws(() => layouts.add('s1', 'pat', { ...g, name: 'Eleventh' }), (e) => e.status === 409 && e.message === 'You have 10 saved layouts here. Delete one first.');
  assert.ok(layouts.add('s1', 'sam', { ...g, name: 'Eleventh' }), 'the limit is per person');
  for (let i = 1; i < 10; i += 1) layouts.add('s1', 'sam', { ...g, shared: true, name: `Shared ${i}` });
  assert.throws(() => layouts.add('s1', 'pat', { ...g, shared: true, name: 'Eleventh shared' }), (e) => e.status === 409 && e.message === 'This space has 10 shared layouts. Delete one first.');

  // Rename and replace; a rename onto a taken name is a 409; renaming to its own name in another case is fine.
  assert.equal(layouts.update('s1', mine.id, 'pat', { name: 'Game Night' }).name, 'Game Night');
  assert.throws(() => layouts.update('s1', mine.id, 'pat', { name: 'mine 1' }), (e) => e.status === 409);
  const replaced = layouts.update('s1', shared.id, 'sam', { modules: [{ id: 'chat', mode: 'dock' }], snap: { all: true, pitch: 90 } });
  assert.deepEqual(replaced.modules, [{ id: 'chat', mode: 'dock' }]);
  assert.equal(replaced.by, 'pat', 'by stays who saved it first');
  assert.equal(layouts.update('s1', mine.id, 'sam', { name: 'Taken' }), null, "nobody changes another person's own");
  assert.equal(layouts.remove('s1', mine.id, 'sam'), false);
  assert.equal(layouts.remove('s1', mine.id, 'pat'), true);
  assert.equal(layouts.find('s1', mine.id, 'pat'), null);

  // A removed space takes its layouts; a removed person takes their own everywhere, and the shared ones they saved stay.
  layouts.forgetPerson('pat');
  const after = readJson(path.join(dir, 'layouts.json'));
  assert.ok(!after.spaces.s1.people.pat && !after.spaces.s2, "pat's own are gone, and s2 had nothing else");
  assert.ok(after.spaces.s1.shared.some((l) => l.id === shared.id), 'the shared one pat saved stays');
  layouts.forgetSpace('s1');
  assert.deepEqual(readJson(path.join(dir, 'layouts.json')), { spaces: {} });
  n += 1;

  // A later version's extra fields survive a read and a write here; malformed entries are dropped.
  const dir2 = tmp('extra');
  fs.writeFileSync(path.join(dir2, 'layouts.json'), JSON.stringify({ spaces: { s1: { shared: [{ id: 'lfuture', name: 'Future', by: 'x', at: 'now', modules: [{ id: 'chat', mode: 'dock', later: 1 }], later: true }, 'junk', { id: 7 }], people: { pat: 'junk' } } } }));
  const kept = new Layouts(dir2);
  kept.add('s1', 'pat', { ...g });
  const back = readJson(path.join(dir2, 'layouts.json')).spaces.s1;
  assert.equal(back.shared.length, 1);
  assert.equal(back.shared[0].later, true, 'a field this version does not know is kept');
  n += 1;

  // A file that is there but cannot be read is never written over: lists read empty, every change refused with a 500.
  const dir3 = tmp('broken');
  fs.writeFileSync(path.join(dir3, 'layouts.json'), '{ not json');
  const broken = new Layouts(dir3);
  assert.deepEqual(broken.list('s1', 'pat'), { mine: [], shared: [] });
  assert.throws(() => broken.add('s1', 'pat', { ...g }), (e) => e.status === 500 && /cannot be read/.test(e.message));
  broken.forgetSpace('s1');
  broken.forgetPerson('pat');
  assert.equal(fs.readFileSync(path.join(dir3, 'layouts.json'), 'utf8'), '{ not json', 'left exactly as it was');
  n += 1;
  for (const d of [dir, dir2, dir3]) fs.rmSync(d, { recursive: true, force: true });
}

// --- the store: removeSpace and removeUser take their layouts ---------------------------------------------------

{
  const dir = tmp('store');
  const store = new Store(dir);
  const pat = store.addUser({ login: 'pat', displayName: 'Pat', role: 'member', passwordHash: 'x' });
  const sam = store.addUser({ login: 'sam', displayName: 'Sam', role: 'member', passwordHash: 'x' });
  const a = store.addSpace({ name: 'A', members: [pat.key, sam.key] });
  const b = store.addSpace({ name: 'B', members: [pat.key, sam.key] });
  const g = cleanLayout(good()).layout;
  store.layouts.add(a.id, pat.key, { ...g });
  store.layouts.add(a.id, sam.key, { ...g, shared: true });
  store.layouts.add(b.id, pat.key, { ...g });
  store.layouts.add(b.id, sam.key, { ...g });
  store.removeSpace(a.id);
  let file = readJson(path.join(dir, 'layouts.json'));
  assert.ok(!file.spaces[a.id], 'a removed space takes its shared and personal layouts');
  store.removeUser(pat.key);
  file = readJson(path.join(dir, 'layouts.json'));
  assert.deepEqual(Object.keys(file.spaces[b.id].people), [sam.key], 'a removed person takes their own');
  assert.equal(path.dirname(store.layouts.file), dir, "layouts.json is in the environment's data folder, which its export and backup zip whole");
  fs.rmSync(dir, { recursive: true, force: true });
  n += 1;
}

// --- the store: a space's default layout (step 4) -----------------------------------------------------------------

{
  const dir = tmp('default');
  const store = new Store(dir);
  const pat = store.addUser({ login: 'pat', displayName: 'Pat', role: 'member', passwordHash: 'x' });
  const a = store.addSpace({ name: 'A', members: [pat.key] });
  const g = cleanLayout(good()).layout;
  store.updateSpace(a.id, { opensWith: ['chat'] });
  assert.ok(!('defaultLayout' in store.spaceById(a.id)), 'absent while not set');
  const shared = store.layouts.add(a.id, pat.key, { ...g, shared: true });
  const own = store.layouts.add(a.id, pat.key, { ...g, name: 'Mine' });

  // Setting it sets Opens with to its modules; refusals change nothing.
  let space = store.updateSpace(a.id, { defaultLayout: shared.id });
  assert.equal(space.defaultLayout, shared.id);
  assert.deepEqual(space.opensWith, ['conference', 'chat', 'calendar'], "Opens with follows the layout's modules, in order");
  assert.deepEqual(store.defaultLayoutOf(a.id), store.layouts.find(a.id, shared.id, null).layout, 'the whole layout');
  const storeRefused = (patch, status, pattern, label) => {
    const before = JSON.stringify(store.spaceById(a.id));
    assert.throws(() => store.updateSpace(a.id, { name: 'Renamed', ...patch }), (e) => e.status === status && pattern.test(e.message) && /^[A-Z][^\n]*\.$/.test(e.message), label);
    assert.equal(JSON.stringify(store.spaceById(a.id)), before, `${label}: nothing changed`);
    n += 1;
  };
  storeRefused({ defaultLayout: own.id }, 404, /no shared layout/, "a person's own layout cannot be the default");
  storeRefused({ defaultLayout: 'lnosuch' }, 404, /no shared layout/, 'no such layout');
  storeRefused({ defaultLayout: 7 }, 400, /shared layout's id/, 'not an id');
  storeRefused({ defaultLayout: shared.id, opensWith: ['chat'] }, 400, /not both/, 'both at once');

  // Replacing its modules moves Opens with (syncDefaultLayout, as the PUT route calls it); a rename does not touch it.
  store.layouts.update(a.id, shared.id, pat.key, { modules: [{ id: 'notes', mode: 'dock' }, { id: 'chat', mode: 'float', box: { x: 0, y: 0, w: 0.5, h: 0.5 } }] });
  store.syncDefaultLayout(a.id);
  assert.deepEqual(store.spaceById(a.id).opensWith, ['notes', 'chat']);
  assert.equal(store.spaceById(a.id).defaultLayout, shared.id);

  // Kept across a restart.
  assert.equal(new Store(dir).spaceById(a.id).defaultLayout, shared.id, 'read back as written');

  // Opens with by hand clears it; null clears it and keeps Opens with.
  space = store.updateSpace(a.id, { opensWith: ['chat', 'notes'] });
  assert.ok(!('defaultLayout' in space), 'changing Opens with by hand clears the default');
  assert.deepEqual(space.opensWith, ['chat', 'notes']);
  store.updateSpace(a.id, { defaultLayout: shared.id });
  space = store.updateSpace(a.id, { defaultLayout: null });
  assert.ok(!('defaultLayout' in space), 'null clears it');
  assert.deepEqual(space.opensWith, ['notes', 'chat'], 'null leaves Opens with as it was');
  assert.equal(store.defaultLayoutOf(a.id), null);
  space = store.updateSpace(a.id, { defaultLayout: null, opensWith: null });
  assert.ok(!('opensWith' in space) && !('defaultLayout' in space), 'both cleared at once');

  // Deleting it clears the default and leaves Opens with; deleting another changes nothing.
  store.updateSpace(a.id, { defaultLayout: shared.id });
  const other = store.layouts.add(a.id, pat.key, { ...g, name: 'Other', shared: true });
  store.layouts.remove(a.id, other.id, pat.key);
  store.syncDefaultLayout(a.id);
  assert.equal(store.spaceById(a.id).defaultLayout, shared.id, 'deleting another shared layout keeps the default');
  store.layouts.remove(a.id, shared.id, pat.key);
  store.syncDefaultLayout(a.id);
  assert.ok(!('defaultLayout' in store.spaceById(a.id)), 'deleting the default layout clears it');
  assert.deepEqual(store.spaceById(a.id).opensWith, ['notes', 'chat'], 'and Opens with stays');
  n += 1;

  // Nothing stored breaks: a space from before this step (no defaultLayout) reads and writes as it did; a stored id
  // whose layout is gone reads as no default; a stored value that is not an id is dropped.
  const appFile = path.join(dir, 'app.json');
  const b = store.addSpace({ name: 'B', members: [] });
  const c = store.addSpace({ name: 'C', members: [] });
  const rawNow = readJson(appFile);
  const before = rawNow.spaces.find((r) => r.id === b.id);
  assert.ok(!('defaultLayout' in before), 'a new space has no defaultLayout key');
  rawNow.spaces.find((r) => r.id === a.id).defaultLayout = 'lgone12';
  rawNow.spaces.find((r) => r.id === c.id).defaultLayout = 'Not an id!';
  fs.writeFileSync(appFile, JSON.stringify(rawNow));
  const again = new Store(dir);
  assert.deepEqual(again.spaceById(b.id), store.spaceById(b.id), 'a space without a default reads exactly as before');
  assert.equal(again.spaceById(a.id).defaultLayout, 'lgone12', 'a stored id is kept as it is');
  assert.equal(again.defaultLayoutOf(a.id), null, 'and reads as no default while its layout is gone');
  assert.ok(!('defaultLayout' in again.spaceById(c.id)), 'a stored value that is not an id is dropped');
  fs.rmSync(dir, { recursive: true, force: true });
  n += 1;
}

// --- the routes, against a throwaway server -----------------------------------------------------------------------

const dataDir = tmp('server');
let child = null;
let port = 0;
let serverOut = '';
async function startServer() {
  child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT,
    env: {
      PATH: process.env.PATH, HOME: process.env.HOME, PORT: '0', DATA_DIR: dataDir,
      LIVEKIT_API_KEY: 'devkey', LIVEKIT_API_SECRET: 'devsecretdevsecret', ADMIN_PASSWORD: 'testpass1234',
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  serverOut = '';
  child.stdout.on('data', (d) => { serverOut += d; });
  child.stderr.on('data', (d) => { serverOut += d; });
  port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`the server did not start in time:\n${serverOut}`)); }, 25000);
    const onData = () => { const m = /listening on :(\d+)/.exec(serverOut); if (m) { clearTimeout(timer); resolve(Number(m[1])); } };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`the server stopped (${code}):\n${serverOut}`)); });
  });
}
const stopServer = () => new Promise((resolve) => { if (!child || child.exitCode !== null) return resolve(); child.once('exit', resolve); child.kill('SIGTERM'); });

async function call(method, urlPath, { body, cookie } = {}) {
  const headers = { accept: 'application/json' };
  if (cookie) headers.cookie = `app_session=${cookie}`;
  let payload;
  if (body !== undefined) {
    headers['content-type'] = 'application/json';
    payload = JSON.stringify(body);
  }
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, { method, headers, body: payload });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, json, text };
}
const expect = async (label, status, method, urlPath, options) => {
  const r = await call(method, urlPath, options);
  assert.equal(r.status, status, `${label}: ${method} ${urlPath} answered ${r.status} ${r.text}`);
  if (status >= 400) assert.match(r.json?.error || '', /^[A-Z"].*\.$/, `${label}: one plain sentence (${r.text})`);
  return r;
};

await startServer();
try {
  const login = async (name, password) => {
    const r = await call('POST', '/api/login', { body: { login: name, password } });
    assert.equal(r.status, 200, `${name} signs in: ${r.text}`);
    return r.json.token;
  };
  const owner = await login('admin', 'testpass1234');
  const mk = async (name) => (await call('POST', '/api/users', { cookie: owner, body: { login: name, displayName: name, role: 'member', password: 'memberpass1234' } })).json.user;
  const patUser = await mk('pat');
  const samUser = await mk('sam');
  const outUser = await mk('out');
  const space = (await call('POST', '/api/spaces', { cookie: owner, body: { name: 'Trip', members: [patUser.key, samUser.key] } })).json.space;
  const S = space.id;
  const L = `/api/spaces/${S}/layouts`;
  await expect('sam made moderator', 200, 'PATCH', `/api/users/${samUser.key}/spaces/${S}`, { cookie: owner, body: { permissions: { moderator: true } } });
  const pat = await login('pat', 'memberpass1234');
  const sam = await login('sam', 'memberpass1234');
  const out = await login('out', 'memberpass1234');
  await expect('guests allowed', 200, 'PATCH', `/api/spaces/${S}`, { cookie: owner, body: { allowGuests: true } });
  const guestToken = (await expect('guest link', 200, 'POST', `/api/spaces/${S}/guest-link`, { cookie: owner, body: {} })).json.space.guestToken;
  const asGuest = `?guest=${encodeURIComponent(guestToken)}`;

  // Who may read.
  const empty = await expect('member reads', 200, 'GET', L, { cookie: pat });
  assert.deepEqual(empty.json, { mine: [], shared: [], defaultLayout: null, canShare: false, canSetDefault: false });
  assert.deepEqual((await expect('moderator reads', 200, 'GET', L, { cookie: sam })).json, { mine: [], shared: [], defaultLayout: null, canShare: true, canSetDefault: false });
  assert.deepEqual((await expect('owner reads', 200, 'GET', L, { cookie: owner })).json, { mine: [], shared: [], defaultLayout: null, canShare: true, canSetDefault: true });
  assert.deepEqual((await expect('guest reads', 200, 'GET', `${L}${asGuest}`)).json, { mine: [], shared: [], defaultLayout: null, canShare: false, canSetDefault: false });
  await expect('nobody signed in', 401, 'GET', L);
  await expect('a member of another space', 403, 'GET', L, { cookie: out });
  await expect('no such space', 404, 'GET', '/api/spaces/nosuchsp/layouts', { cookie: pat });
  await expect('a guest of this space reading another', 403, 'GET', `/api/spaces/${(await call('GET', '/api/spaces', { cookie: owner })).json.spaces.find((s) => s.isLobby).id}/layouts${asGuest}`);
  n += 1;

  // Saving: personal for any member; shared for owners, the admin and the space's moderators; never a guest.
  const patOwn = await expect('member saves own', 201, 'POST', L, { cookie: pat, body: good() });
  assert.equal(patOwn.json.layout.name, 'Game night');
  assert.equal(patOwn.json.layout.by, patUser.key);
  const refusal = await expect('member saves shared', 403, 'POST', L, { cookie: pat, body: { ...good(), shared: true } });
  assert.equal(refusal.json.error, "Only owners, the admin and this space's moderators can change shared layouts.");
  await expect('guest saves', 403, 'POST', `${L}${asGuest}`, { body: good() });
  await expect('guest saves shared', 403, 'POST', `${L}${asGuest}`, { body: { ...good(), shared: true } });
  await expect('outsider saves', 403, 'POST', L, { cookie: out, body: good() });
  await expect('bad shape', 400, 'POST', L, { cookie: pat, body: { ...good(), modules: [{ id: 'chat', mode: 'window' }] } });
  await expect('not JSON fields', 400, 'POST', L, { cookie: pat, body: { name: 'x' } });
  const samShared = await expect('moderator saves shared', 201, 'POST', L, { cookie: sam, body: { ...good(), name: 'Planning', shared: true } });
  const ownerShared = await expect('owner saves shared', 201, 'POST', L, { cookie: owner, body: { ...good(), shared: true } });
  const taken = await expect('name taken in own list', 409, 'POST', L, { cookie: pat, body: { ...good(), name: 'GAME NIGHT' } });
  assert.equal(taken.json.id, patOwn.json.layout.id, 'the 409 names the one with that name');
  assert.equal(taken.json.error, 'There is already a layout called Game night.');
  const takenShared = await expect('name taken in shared list', 409, 'POST', L, { cookie: sam, body: { ...good(), name: 'planning', shared: true } });
  assert.equal(takenShared.json.id, samShared.json.layout.id);
  n += 1;

  // Reading back: the shared ones for everyone, each person's own only for them.
  const patList = (await call('GET', L, { cookie: pat })).json;
  assert.deepEqual(patList.mine.map((l) => l.id), [patOwn.json.layout.id]);
  assert.deepEqual(patList.shared.map((l) => l.id), [samShared.json.layout.id, ownerShared.json.layout.id]);
  const guestList = (await call('GET', `${L}${asGuest}`)).json;
  assert.deepEqual(guestList.mine, []);
  assert.equal(guestList.shared.length, 2, 'a guest reads the shared ones');
  assert.deepEqual((await call('GET', L, { cookie: sam })).json.mine, [], "sam does not see pat's own");
  n += 1;

  // Changing: own by their person; shared by anyone who may share; guests never.
  const patPath = `${L}/${patOwn.json.layout.id}`;
  const samPath = `${L}/${samShared.json.layout.id}`;
  const renamed = await expect('member renames own', 200, 'PUT', patPath, { cookie: pat, body: { name: 'Quiet night' } });
  assert.equal(renamed.json.layout.name, 'Quiet night');
  assert.deepEqual(renamed.json.layout.modules, good().modules, 'a rename keeps the modules');
  const replaced = await expect('member replaces own', 200, 'PUT', patPath, { cookie: pat, body: { modules: [{ id: 'chat', mode: 'dock', dockW: 400 }], snap: { all: true, pitch: 100 } } });
  assert.equal(replaced.json.layout.name, 'Quiet night');
  assert.deepEqual(replaced.json.layout.snap, { all: true, pitch: 100 });
  await expect("someone else's own is not there", 404, 'PUT', patPath, { cookie: sam, body: { name: 'Mine now' } });
  await expect("the owner cannot reach a person's own either", 404, 'DELETE', patPath, { cookie: owner });
  await expect('member renames shared', 403, 'PUT', samPath, { cookie: pat, body: { name: 'Mine now' } });
  await expect('member deletes shared', 403, 'DELETE', samPath, { cookie: pat });
  await expect('guest renames shared', 403, 'PUT', `${samPath}${asGuest}`, { body: { name: 'Guest' } });
  await expect('guest deletes shared', 403, 'DELETE', `${samPath}${asGuest}`);
  await expect('owner renames the moderator\'s shared', 200, 'PUT', samPath, { cookie: owner, body: { name: 'Planning day' } });
  await expect('rename onto a taken shared name', 409, 'PUT', samPath, { cookie: sam, body: { name: 'game night' } });
  await expect('a PUT with nothing', 400, 'PUT', samPath, { cookie: sam, body: {} });
  await expect('a PUT moving lists', 400, 'PUT', samPath, { cookie: sam, body: { shared: false } });
  await expect('a PUT with a bad shape', 400, 'PUT', samPath, { cookie: sam, body: { snap: { all: true, pitch: 10 } } });
  await expect('no such layout', 404, 'PUT', `${L}/lnosuch`, { cookie: sam, body: { name: 'x' } });
  await expect('no such layout', 404, 'DELETE', `${L}/lnosuch`, { cookie: sam });
  await expect('moderator deletes the owner\'s shared', 204, 'DELETE', `${L}/${ownerShared.json.layout.id}`, { cookie: sam });
  assert.deepEqual((await call('GET', L, { cookie: pat })).json.shared.map((l) => l.name), ['Planning day']);
  n += 1;

  // The limits through the routes.
  for (let i = 1; i < 10; i += 1) await expect(`pat's own #${i + 1}`, 201, 'POST', L, { cookie: pat, body: { ...good(), name: `Mine ${i}` } });
  const full = await expect('the eleventh own', 409, 'POST', L, { cookie: pat, body: { ...good(), name: 'Eleventh' } });
  assert.equal(full.json.error, 'You have 10 saved layouts here. Delete one first.');
  for (let i = 1; i < 10; i += 1) await expect(`shared #${i + 1}`, 201, 'POST', L, { cookie: owner, body: { ...good(), name: `Shared ${i}`, shared: true } });
  const fullShared = await expect('the eleventh shared', 409, 'POST', L, { cookie: sam, body: { ...good(), name: 'Eleventh', shared: true } });
  assert.equal(fullShared.json.error, 'This space has 10 shared layouts. Delete one first.');
  await expect('sam may still save his own', 201, 'POST', L, { cookie: sam, body: { ...good(), name: 'Mine' } });
  n += 1;

  // Kept across a restart, in DATA_DIR/layouts.json.
  await stopServer();
  const file = readJson(path.join(dataDir, 'layouts.json'));
  assert.equal(file.spaces[S].shared.length, 10);
  assert.equal(file.spaces[S].people[patUser.key].length, 10);
  await startServer();
  const pat2 = await login('pat', 'memberpass1234');
  assert.equal((await call('GET', L, { cookie: pat2 })).json.mine.length, 10, 'read back after a restart');
  n += 1;

  // The default layout (step 4), in a space of its own: owners only, Opens with in step both ways, cleared by a delete.
  const owner2 = await login('admin', 'testpass1234');
  const sam2 = await login('sam', 'memberpass1234');
  const camp = (await call('POST', '/api/spaces', { cookie: owner2, body: { name: 'Camp', members: [patUser.key, samUser.key] } })).json.space;
  assert.ok(!('defaultLayout' in camp), 'a new space has none');
  const C = `/api/spaces/${camp.id}`;
  await expect('sam made moderator of Camp', 200, 'PATCH', `/api/users/${samUser.key}/spaces/${camp.id}`, { cookie: owner2, body: { permissions: { moderator: true } } });
  const night = (await expect('moderator saves shared in Camp', 201, 'POST', `${C}/layouts`, { cookie: sam2, body: { ...good(), shared: true } })).json.layout;
  const plan = (await expect('owner saves shared in Camp', 201, 'POST', `${C}/layouts`, { cookie: owner2, body: { ...good(), name: 'Planning', modules: [{ id: 'calendar', mode: 'dock' }], shared: true } })).json.layout;
  const ownCamp = (await expect('owner saves own in Camp', 201, 'POST', `${C}/layouts`, { cookie: owner2, body: { ...good(), name: 'Mine' } })).json.layout;
  const forSpace = async (cookie, query = '') => (await expect('for-space', 200, 'GET', `/api/modules/for-space?space=${camp.id}${query}`, { cookie })).json;
  assert.equal((await forSpace(pat2)).defaultLayout, null, 'for-space: null while none is set');
  assert.equal((await call('GET', `${C}/layouts`, { cookie: pat2 })).json.defaultLayout, null);

  // Owners only: a moderator, a member and a guest are refused, and nothing changes.
  for (const [label, cookie] of [['moderator', sam2], ['member', pat2]]) {
    const r = await call('PATCH', C, { cookie, body: { defaultLayout: night.id } });
    assert.equal(r.status, 403, `${label} sets the default: ${r.text}`);
  }
  assert.equal((await call('PATCH', C, { body: { defaultLayout: night.id } })).status, 401, 'nobody signed in');
  assert.equal((await call('GET', `${C}/layouts`, { cookie: owner2 })).json.defaultLayout, null, 'refusals changed nothing');
  await expect("a person's own layout", 404, 'PATCH', C, { cookie: owner2, body: { defaultLayout: ownCamp.id } });
  await expect('no such layout', 404, 'PATCH', C, { cookie: owner2, body: { defaultLayout: 'lnosuch' } });
  await expect('not an id', 400, 'PATCH', C, { cookie: owner2, body: { defaultLayout: 12 } });
  await expect('both at once', 400, 'PATCH', C, { cookie: owner2, body: { defaultLayout: night.id, opensWith: ['chat'] } });
  await expect('a layout of another space', 404, 'PATCH', C, { cookie: owner2, body: { defaultLayout: samShared.json.layout.id } });
  n += 1;

  // Setting it sets Opens with; every reader sees it.
  let set = await expect('owner sets the default', 200, 'PATCH', C, { cookie: owner2, body: { defaultLayout: night.id } });
  assert.equal(set.json.space.defaultLayout, night.id);
  assert.deepEqual(set.json.space.opensWith, ['conference', 'chat', 'calendar'], "Opens with is the layout's modules");
  for (const [label, cookie] of [['owner', owner2], ['moderator', sam2], ['member', pat2]]) {
    assert.equal((await call('GET', `${C}/layouts`, { cookie })).json.defaultLayout, night.id, `${label} reads the default's id`);
    const fs1 = await forSpace(cookie);
    assert.deepEqual(fs1.defaultLayout, night, `${label}: for-space carries the whole layout`);
    assert.deepEqual(fs1.opensWith, ['conference', 'chat', 'calendar'], `${label}: for-space's opensWith in step`);
  }
  await expect('guests allowed in Camp', 200, 'PATCH', C, { cookie: owner2, body: { allowGuests: true } });
  const campGuest = `?guest=${encodeURIComponent((await expect('Camp guest link', 200, 'POST', `${C}/guest-link`, { cookie: owner2, body: {} })).json.space.guestToken)}`;
  assert.equal((await call('GET', `${C}/layouts${campGuest}`)).json.defaultLayout, night.id, 'a guest reads the default too');
  assert.deepEqual((await call('GET', `/api/modules/for-space?space=${camp.id}&guest=${campGuest.slice(7)}`)).json.defaultLayout, night, 'and gets it from for-space');
  assert.equal((await call('PATCH', `${C}${campGuest}`, { body: { defaultLayout: null } })).status, 401, 'a guest cannot clear it');

  // Replacing the default's modules moves Opens with; a rename does not; replacing another layout does not.
  await expect('moderator replaces the default', 200, 'PUT', `${C}/layouts/${night.id}`, { cookie: sam2, body: { modules: [{ id: 'chat', mode: 'dock' }, { id: 'notes', mode: 'dock' }] } });
  assert.deepEqual((await forSpace(pat2)).opensWith, ['chat', 'notes'], 'Opens with follows a replace');
  await expect('rename the default', 200, 'PUT', `${C}/layouts/${night.id}`, { cookie: sam2, body: { name: 'Late night' } });
  await expect('replace another', 200, 'PUT', `${C}/layouts/${plan.id}`, { cookie: owner2, body: { modules: [{ id: 'map', mode: 'dock' }] } });
  let fs2 = await forSpace(pat2);
  assert.deepEqual(fs2.opensWith, ['chat', 'notes'], 'only the default moves Opens with');
  assert.equal(fs2.defaultLayout.name, 'Late night');

  // Changing Opens with by hand clears the default.
  set = await expect('Opens with by hand', 200, 'PATCH', C, { cookie: owner2, body: { opensWith: ['chat'] } });
  assert.ok(!('defaultLayout' in set.json.space), 'cleared by a hand change');
  assert.equal((await forSpace(pat2)).defaultLayout, null);

  // null stops using it and keeps Opens with.
  await expect('set again', 200, 'PATCH', C, { cookie: owner2, body: { defaultLayout: plan.id } });
  set = await expect('stop using it', 200, 'PATCH', C, { cookie: owner2, body: { defaultLayout: null } });
  assert.ok(!('defaultLayout' in set.json.space));
  assert.deepEqual(set.json.space.opensWith, ['map'], 'null leaves Opens with as it was');

  // Deleting the default clears it and keeps Opens with; deleting another keeps it.
  await expect('set the default', 200, 'PATCH', C, { cookie: owner2, body: { defaultLayout: night.id } });
  await expect('delete another', 204, 'DELETE', `${C}/layouts/${plan.id}`, { cookie: owner2 });
  assert.equal((await call('GET', `${C}/layouts`, { cookie: pat2 })).json.defaultLayout, night.id, 'deleting another keeps the default');
  await expect('delete the default', 204, 'DELETE', `${C}/layouts/${night.id}`, { cookie: sam2 });
  assert.equal((await call('GET', `${C}/layouts`, { cookie: pat2 })).json.defaultLayout, null, 'deleting the default clears it');
  fs2 = await forSpace(pat2);
  assert.equal(fs2.defaultLayout, null);
  assert.deepEqual(fs2.opensWith, ['chat', 'notes'], 'and Opens with stays');
  const campRecord = (await call('GET', C, { cookie: owner2 })).json.space;
  assert.ok(!('defaultLayout' in campRecord), 'the key is gone from the record');
  n += 1;

  // A removed person takes their own layouts; a removed space takes all of its layouts.
  await expect('remove Camp', 200, 'DELETE', C, { cookie: owner2 });
  await expect('remove pat', 200, 'DELETE', `/api/users/${patUser.key}`, { cookie: owner2 });
  assert.ok(!readJson(path.join(dataDir, 'layouts.json')).spaces[S].people[patUser.key], "pat's layouts are gone");
  assert.equal(readJson(path.join(dataDir, 'layouts.json')).spaces[S].shared.length, 10, 'the shared ones stay');
  await expect('remove the space', 200, 'DELETE', `/api/spaces/${S}`, { cookie: owner2 });
  assert.deepEqual(readJson(path.join(dataDir, 'layouts.json')), { spaces: {} }, "the space's layouts are gone");
  await expect('its layouts route', 404, 'GET', L, { cookie: owner2 });
  n += 1;
} finally {
  await stopServer();
  fs.rmSync(dataDir, { recursive: true, force: true });
}

console.log(`check-layouts: OK (${n} checks)`);
