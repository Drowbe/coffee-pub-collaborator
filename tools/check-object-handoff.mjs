#!/usr/bin/env node
/*
 * check-object-handoff.mjs -- object handoff (documentation/plans/plan-object-handoff.md, GitHub #182 and #181), steps 2
 * and 3. On their own: which `takes` entry takes which kind, the bus's `object` input as the format's checker keeps it,
 * and the prompt's kinds for different sets of enabled modules. On a throwaway server with stand-in modules (none of this
 * repository's): `takes` and `may` on GET /api/spaces/:id/actions, an action's permission, the `object` input refused or
 * kept through POST /api/spaces/:id/action and /api/bus/actions/request, the copied instructions following the enabled
 * modules, and a request already waiting in bus.json from before still running.
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
const PRODUCT = 'Testname';
process.env.PRODUCT_NAME = PRODUCT;
const { KINDS, TRAVEL_KINDS, cleanHandoff, takersOf, kindsTaken, instructions } = require('../server/object-format.js');
const { buildModule } = require('../server/module-build.js');

let n = 0;
const test = async (name, fn) => { await fn(); n += 1; };
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'check-object-handoff-'));
process.on('exit', () => fs.rmSync(base, { recursive: true, force: true })); // also when a check fails

// --- on their own -----------------------------------------------------------------------------------------------------

await test('which entry takes which kind: named kinds, "*" with except, "text" for no kind, a handoff kind only by name', () => {
  const calendarLike = [{ kinds: ['*', 'text'], except: TRAVEL_KINDS.slice(), as: 'an event' }];
  assert.equal(takersOf(calendarLike, 'event').length, 1);
  assert.equal(takersOf(calendarLike, 'task').length, 1, '"*" takes any kind it does not leave out');
  assert.equal(takersOf(calendarLike, undefined).length, 1, 'an object with no kind (a message\'s words)');
  for (const kind of TRAVEL_KINDS) assert.equal(takersOf(calendarLike, kind).length, 0, kind);
  assert.equal(takersOf(calendarLike, 'image').length, 0, '"*" never takes a picture');
  assert.equal(takersOf([{ kinds: ['image'], as: 'an image' }], 'image').length, 1);
  assert.equal(takersOf([{ kinds: ['text'], as: 'a note' }], undefined).length, 1);
  assert.equal(takersOf([{ kinds: ['text'], as: 'a note' }], 'note').length, 0, '"text" is words, not a kind');
  assert.equal(takersOf([{ kinds: ['note'], as: 'a note' }], undefined).length, 0);
  assert.deepEqual(takersOf(undefined, 'note'), [], 'an action without takes takes nothing');
});

await test('the bus\'s object: kept as the checker keeps it, a picture kept, no sources, basis only as given', () => {
  const flight = cleanHandoff({ kind: 'flight', title: 'Southwest 1234', content: '**Booked**\u0007', details: { airline: '**Southwest**', from: 'MDW', to: { code: 'sjc', name: 'San Jose' }, departs: '2026-11-14T12:50:00Z', seat: 12, wings: 2 }, sources: [1], basis: 'items', extra: 'x' });
  assert.deepEqual(flight, { icon: 'note', title: 'Southwest 1234', content: '**Booked**', basis: 'items', kind: 'flight', details: { airline: 'Southwest', from: { code: 'MDW' }, to: { code: 'SJC', name: 'San Jose' }, departs: '2026-11-14T12:50', seat: '12' } }, 'a whole number is read as its digits; an unknown field dropped');
  const words = cleanHandoff({ title: 'Dinner Friday', content: 'Dinner Friday at 7' });
  assert.equal('basis' in words, false, 'a chat message\'s words claim no basis');
  const picture = cleanHandoff({ kind: 'image', title: 'beach.jpg', details: { upload: 'a'.repeat(24), name: 'beach.jpg' } });
  assert.deepEqual(picture, { icon: 'note', title: 'beach.jpg', kind: 'image', details: { upload: 'a'.repeat(24), name: 'beach.jpg' } });
  assert.equal(cleanHandoff({ kind: 'image', title: 'x', details: { upload: '../../etc' } }), null, 'a picture with no file is nothing');
  assert.equal(cleanHandoff({ title: 'no content' }), null);
  assert.equal(cleanHandoff(null), null);
  assert.equal(cleanHandoff({ title: 'T', content: 'c', basis: 'imported' }).basis, 'imported');
});

// Stand-in manifests as the server keeps them (actions.provides[].takes).
const manifest = (id, provides) => ({ id, actions: { provides } });
const planner = manifest('stand-plans', [{ name: 'acceptSuggestion', takes: [{ kinds: ['flight', 'train', 'bus', 'ferry', 'car'], as: '{kind}' }, { kinds: ['hotel'], as: 'a stay' }, { kinds: ['restaurant', 'cafe', 'bar', 'sight', 'museum', 'tour', 'show', 'event'], as: '{kind}' }, { kinds: ['note'], as: 'a note' }] }]);
const todo = manifest('stand-tasks', [{ name: 'createTask', takes: [{ kinds: ['task', '*', 'text'], as: 'a task' }] }]);
const calendar = manifest('stand-days', [{ name: 'createEvent', takes: [{ kinds: ['*', 'text'], except: TRAVEL_KINDS.slice(), as: 'an event' }] }]);
const research = manifest('stand-notes', [{ name: 'saveNote', takes: [{ kinds: ['note', '*', 'text'], as: 'a note' }] }, { name: 'saveLink', takes: [{ kinds: ['link'], as: 'a link' }] }, { name: 'savePhoto', takes: [{ kinds: ['image'], as: 'an image' }] }]);
const polls = manifest('stand-polls', [{ name: 'draftPoll', takes: [{ kinds: ['poll', 'text'], as: 'a poll', permission: 'create' }] }]);
const older = manifest('stand-older', [{ name: 'acceptSuggestion', input: { title: 'string', kind: 'string?' } }]);
const notTyped = manifest('stand-other', [{ name: 'acceptSuggestion', input: { title: 'string' } }, { name: 'addStop', input: { title: 'string', kind: 'string?' } }]);

await test('the prompt\'s kinds: only those some enabled module names, in the catalogue\'s order', () => {
  const every = [planner, todo, calendar, research, polls];
  assert.deepEqual(kindsTaken(every), KINDS, 'every bundled-like module on: every kind');
  assert.ok(!kindsTaken([planner, calendar, research, polls]).includes('task'), 'To-do off: task is gone ("*" names no kind)');
  assert.deepEqual(kindsTaken([todo, calendar]), ['task'], '"*" and "text" name no kind, and except adds none');
  assert.deepEqual(kindsTaken([research]), ['note', 'link'], 'a handoff kind is never listed');
  assert.deepEqual(kindsTaken([older]), TRAVEL_KINDS, 'the typed keeper from before takes: the travel kinds, as before');
  assert.deepEqual(kindsTaken([older, todo]), [...TRAVEL_KINDS, 'task'], 'the old keeper still counts beside a module that declares takes');
  assert.deepEqual(kindsTaken([older, research]), [...TRAVEL_KINDS, 'note', 'link']);
  assert.deepEqual(kindsTaken([notTyped]), [], 'only that action, taking a title and a kind, counts');
  assert.deepEqual(kindsTaken([{ id: 'x', actions: { provides: [{ ...older.actions.provides[0], takes: [{ kinds: ['note'], as: 'a note' }] }] } }]), ['note'], 'once it declares takes, its takes count');
  assert.deepEqual(kindsTaken([]), [], 'nothing on: no kinds');
});

await test('the copied instructions for different sets of modules: each kind with every field of its details', () => {
  const every = instructions('object', { kinds: kindsTaken([planner, todo, calendar, research, polls]) });
  assert.ok(every.startsWith(`I keep my plans and research in ${PRODUCT}. `));
  assert.match(every, /Set "kind" to what the object is: flight, train, bus, ferry, car, hotel, restaurant, cafe, bar, sight, museum, tour, show, event, task, poll, note or link\. Leave it out only when none fits\./);
  assert.match(every, /One object per thing\. A whole itinerary is one object for each flight, train, stay, meal, visit and event, in the order they happen; a return flight is its own object\. Never fold several into one object's text\./);
  assert.match(every, /never guess a date or a year\. If something happens on a day you were not told, ask me for the date before you write the block; if I do not know, leave the date out\./);
  assert.match(every, /- flight: airline, number, from and to \(\{"code","name"\}\), departs, arrives, minutes \(time in the air\), terminal, gate, seat, class, reference\n/);
  assert.match(every, /\n- car: company, from \(pick-up\), to \(drop-off\), departs \(pick-up\), arrives \(drop-off\), class, reference\n/);
  assert.match(every, /\n- restaurant, cafe, bar: starts, ends, minutes, address, partySize, name \(the booking's name\), reference\n/);
  assert.match(every, /\n- sight, museum, tour, show: starts, ends, minutes, address, tickets, reference\n/);
  assert.match(every, /\n- note and link: no details; a link's address goes in "links"\.\n/);
  assert.ok(!every.includes('image'), 'a picture is never asked of an AI');
  assert.match(every, /\n- hotel \(any stay: hotel, rental, hostel\): address, checkIn/);
  assert.match(every, /Leave out tags, place and links when you have nothing for them, and content when "details" says it all\. Add no fields other than these\./);
  // Every field of every listed kind is named on its line.
  const { DETAILS } = require('../server/object-format.js');
  for (const kind of KINDS) {
    const line = every.split('\n').find((l) => l.startsWith('- ') && l.slice(2).split(/ \(|:/)[0].split(/, | and /).includes(kind));
    assert.ok(line, kind);
    for (const field of Object.keys(DETAILS[kind])) assert.ok(new RegExp(`[:,] ${field === 'to' ? '(?:from and )?to' : field}\\b`).test(line), `${kind}.${field}`);
  }
  const before = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools/fixtures/object-format/before-details.json'), 'utf8'));
  assert.equal(every, before.prompts.instructionsEveryKind);
  // The size the plan expects: about 1,500 characters over the instructions before details (1,895 with "Testname").
  assert.ok(every.length - 1895 < 1800, `the full instructions are ${every.length} characters`);
  const travelOnly = instructions('object');
  // To-do off: no task line, no task in the kinds.
  const noTodo = instructions('object', { kinds: kindsTaken([planner, calendar, research, polls]) });
  assert.ok(!/\btask\b/.test(noTodo));
  // Only To-do and the Calendar: no flight example, no itinerary line, a plain example, task's line.
  const small = instructions('object', { kinds: kindsTaken([todo, calendar]) });
  assert.ok(!small.includes('flight') && !small.includes('itinerary'));
  assert.match(small, /\[\{"icon":"note","kind":"task","title":"a short title"/);
  assert.match(small, /Set "kind" to what the object is: task\. /);
  assert.match(small, /\n- task: due\n/);
  // Nothing named: no kind line and no details, only the date rule.
  const none = instructions('object', { kinds: [] });
  assert.ok(!none.includes('"kind"') && !none.includes('"details"'));
  assert.match(none, /never guess a date or a year\. .* Write a date as YYYY-MM-DD\.\n/);
  assert.match(none, /Leave out tags, place and links when you have nothing for them\. Add no fields/);
  assert.ok(travelOnly.includes('- hotel (any stay: hotel, rental, hostel): address, checkIn, checkOut, roomType, guests, reference'));
});

// --- a real server ------------------------------------------------------------------------------------------------

function writeModule(id, name, extra) {
  const root = path.join(base, 'mods', id);
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'module.json'), JSON.stringify({
    id, name, version: '1.0.0', scope: ['environment', 'space'], icon: 'circle',
    surfaces: { page: { entry: `${id}.html` }, canvas: { entry: `${id}.html` } },
    ...extra,
  }));
  fs.writeFileSync(path.join(root, 'src', `${id}.html`), '<!DOCTYPE html><html><head><style>/*__CSS__*/</style></head><body><script>/*__JS__*/</script></body></html>');
  fs.writeFileSync(path.join(root, 'src', `${id}.css`), '');
  fs.writeFileSync(path.join(root, 'src', `${id}.js`), '');
  return buildModule(root).zip;
}
const writes = { permissions: [{ key: 'view', label: 'See it', default: { member: true, moderator: true, guest: true } }, { key: 'edit', label: 'Change it', default: { member: true, moderator: true, guest: false } }], access: { read: 'view', write: 'edit' } };
const zips = [
  writeModule('stand-days', 'Days', { ...writes, actions: { provides: [
    { name: 'createEvent', label: 'Add an event', input: { title: 'string?', date: 'date?', object: 'object?' }, takes: [{ kinds: ['*', 'text'], except: TRAVEL_KINDS.slice(), as: 'an event' }] },
  ] } }),
  writeModule('stand-plans', 'Plans', { ...writes, actions: { provides: [
    { name: 'acceptSuggestion', label: 'Add it to the trip', input: { title: 'string', kind: 'string?', content: 'text?', place: 'string?', date: 'date?', object: 'object?' }, takes: planner.actions.provides[0].takes },
  ] } }),
  writeModule('stand-tasks', 'Tasks', { ...writes, actions: { provides: [
    { name: 'createTask', label: 'Add a task', input: { title: 'string?', object: 'object?' }, takes: [{ kinds: ['task', '*', 'text'], as: 'a task' }] },
  ] } }),
  writeModule('stand-notes', 'Notes', { ...writes, actions: { provides: [
    { name: 'savePhoto', label: 'Keep a photo', input: { object: 'object' }, takes: [{ kinds: ['image'], as: 'an image' }] },
  ] } }),
  writeModule('stand-polls', 'Votes', { permissions: [...writes.permissions, { key: 'create', label: 'Start polls', default: { member: false, moderator: true } }], access: writes.access, actions: { provides: [
    { name: 'draftPoll', label: 'Start a poll', local: true, input: { object: 'object' }, takes: [{ kinds: ['poll', 'text'], as: 'a poll', permission: 'create' }] },
    { name: 'noteVote', label: 'Note a vote', input: { object: 'object' }, takes: [{ kinds: ['poll'], as: 'a poll', permission: 'create' }, { kinds: ['text'], as: ' a \u0007 note ' }] },
    { name: 'addPoll', label: 'Start a poll', local: true, input: { text: 'string' } },
  ] } }),
  writeModule('stand-asker', 'Asker', { ...writes, actions: { uses: ['stand-days:createEvent', 'stand-polls:draftPoll', 'stand-polls:addPoll'] } }),
  writeModule('stand-older', 'Older', { ...writes, actions: { provides: [
    { name: 'acceptSuggestion', label: 'Add it, typed', input: { title: 'string', kind: 'string?' } },
  ] } }),
];

const dataDir = path.join(base, 'data');
async function startServer() {
  const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: base,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: '0', DATA_DIR: dataDir, TZ: 'UTC', PRODUCT_NAME: PRODUCT, LIVEKIT_API_KEY: 'devkey', LIVEKIT_API_SECRET: 'devsecretdevsecret', ADMIN_PASSWORD: 'testpass1234' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`the server did not start in time:\n${out}`)); }, 20000);
    const onData = () => { const m = /listening on :(\d+)/.exec(out); if (m) { clearTimeout(timer); resolve(Number(m[1])); } };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`the server stopped (${code}):\n${out}`)); });
  });
  const call = async (method, urlPath, { body, token, type } = {}) => {
    const headers = { accept: 'application/json' };
    if (body !== undefined) headers['content-type'] = type || 'application/json';
    if (token) headers.authorization = `Bearer ${token}`;
    const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, { method, headers, body: body === undefined ? undefined : Buffer.isBuffer(body) ? body : JSON.stringify(body) });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json, text };
  };
  const signIn = async (login, password) => {
    const r = await call('POST', '/api/login', { body: { login, password } });
    assert.equal(r.status, 200, `${login} signs in: ${r.text}`);
    return r.json.token;
  };
  const stop = () => new Promise((resolve) => { if (child.exitCode !== null) return resolve(); child.once('exit', resolve); child.kill('SIGTERM'); });
  return { call, signIn, stop };
}

let server = null;
try {
  server = await startServer();
  let { call, signIn } = server;
  const admin = await signIn('admin', 'testpass1234');
  const made = await call('POST', '/api/users', { token: admin, body: { login: 'pat', displayName: 'Pat', role: 'member', password: 'memberpass1234' } });
  assert.equal(made.status, 201, made.text);
  const S = (await call('POST', '/api/spaces', { token: admin, body: { name: 'Trip', members: [made.json.user.key] } })).json.space.id;
  for (const zip of zips) {
    const up = await call('POST', '/api/modules', { token: admin, body: zip, type: 'application/zip' });
    assert.equal(up.status, 201, up.text);
  }
  const turn = async (id, enabled) => assert.equal((await call('PATCH', `/api/modules/${id}`, { token: admin, body: { enabled, allSpaces: true } })).status, 200, id);
  for (const id of ['stand-days', 'stand-plans', 'stand-tasks', 'stand-notes', 'stand-polls', 'stand-asker']) await turn(id, true);
  const pat = await signIn('pat', 'memberpass1234');
  const actionsOf = async (token) => {
    const r = await call('GET', `/api/spaces/${S}/actions`, { token });
    assert.equal(r.status, 200, r.text);
    return Object.fromEntries(r.json.actions.filter((a) => a.module.startsWith('stand-')).map((a) => [a.action, a]));
  };
  const send = (token, action, input) => call('POST', `/api/spaces/${S}/action`, { token, body: { action, input } });
  const pending = async (id) => (await call('GET', `/api/bus/actions/pending?module=${id}&scope=space&space=${S}`, { token: admin })).json.actions;

  await test('live: GET .../actions returns takes as declared, and may honours the permission', async () => {
    const mine = await actionsOf(pat);
    assert.deepEqual(mine['stand-days:createEvent'].takes, [{ kinds: ['*', 'text'], except: TRAVEL_KINDS, as: 'an event', may: true }]);
    assert.deepEqual(mine['stand-polls:draftPoll'].takes, [{ kinds: ['poll', 'text'], as: 'a poll', permission: 'create', may: false }], 'each entry says may');
    assert.deepEqual(mine['stand-polls:noteVote'].takes, [{ kinds: ['poll'], as: 'a poll', permission: 'create', may: false }, { kinds: ['text'], as: 'a note', may: true }], 'one entry refused, one not; "as" with a control character keeps single spaces');
    assert.equal(mine['stand-polls:noteVote'].may, true, 'some entry may be used');
    assert.equal('takes' in mine['stand-polls:addPoll'], false, 'an action without takes says none');
    assert.equal(mine['stand-days:createEvent'].may, true);
    assert.equal(mine['stand-polls:draftPoll'].may, false, 'a member without Votes\' create');
    assert.equal(mine['stand-polls:addPoll'].may, true, 'a local action without takes: read is enough, as before');
    assert.equal((await actionsOf(admin))['stand-polls:draftPoll'].may, true, 'an owner has every permission');
    assert.equal((await actionsOf(admin))['stand-polls:draftPoll'].takes[0].may, true);
    // The module's own list (host.actions) leaves out an action whose every entry the viewer is refused.
    const busList = async (token) => (await call('GET', `/api/bus/actions?from=stand-asker&scope=space&space=${S}`, { token })).json.actions.map((a) => a.action);
    assert.ok(!(await busList(pat)).includes('stand-polls:draftPoll'), 'refused every entry: left out');
    assert.ok((await busList(pat)).includes('stand-polls:addPoll'), 'no takes: listed as before');
    assert.ok((await busList(admin)).includes('stand-polls:draftPoll'), 'the owner sees it');
    assert.equal((await call('PATCH', '/api/roles/member', { token: admin, body: { 'module.stand-polls.create': true } })).status, 200);
    assert.equal((await actionsOf(pat))['stand-polls:draftPoll'].may, true, 'granted to members');
    // The module's own list (host.actions) carries takes too.
    const bus = await call('GET', `/api/bus/actions?from=stand-asker&scope=space&space=${S}`, { token: pat });
    assert.equal(bus.status, 200, bus.text);
    assert.deepEqual(bus.json.actions.find((a) => a.action === 'stand-days:createEvent').takes, mine['stand-days:createEvent'].takes);
    assert.ok(bus.json.actions.some((a) => a.action === 'stand-polls:draftPoll'), 'granted: listed');
    assert.equal((await call('PATCH', '/api/roles/member', { token: admin, body: { 'module.stand-polls.create': false } })).status, 200);
  });

  await test('live: the object input is kept as the format keeps it, and refused with its sentence', async () => {
    const flight = { kind: 'flight', title: 'Southwest 1234', details: { airline: '**Southwest**', number: 1234, from: 'MDW', to: 'SJC', departs: '2026-11-14T12:50', arrives: '2026-11-14T15:25', reference: 'ABC123', wings: 2 }, sources: [1] };
    let r = await send(pat, 'stand-plans:acceptSuggestion', { title: 'Southwest 1234', object: flight });
    assert.equal(r.status, 200, r.text);
    const kept = (await pending('stand-plans')).find((a) => a.id === r.json.id);
    assert.deepEqual(kept.input, { title: 'Southwest 1234', object: { icon: 'note', title: 'Southwest 1234', kind: 'flight', details: { airline: 'Southwest', number: '1234', from: { code: 'MDW' }, to: { code: 'SJC' }, departs: '2026-11-14T12:50', arrives: '2026-11-14T15:25', reference: 'ABC123' } } });
    r = await send(pat, 'stand-days:createEvent', { object: flight });
    assert.deepEqual([r.status, r.json], [400, { error: 'Days cannot take a flight' }]);
    r = await send(pat, 'stand-days:createEvent', { object: { kind: 'hotel', title: 'Casa', content: 'x' } });
    assert.deepEqual([r.status, r.json], [400, { error: 'Days cannot take a hotel' }]);
    r = await send(pat, 'stand-days:createEvent', { object: { kind: 'event', title: 'Concert', details: { starts: '2026-11-15T20:00', allDay: false } } });
    assert.equal(r.status, 200, 'an event');
    r = await send(pat, 'stand-days:createEvent', { object: { title: 'Dinner Friday', content: 'Dinner Friday at 7', date: '2026-11-13' } });
    assert.equal(r.status, 200, 'a message\'s words');
    assert.deepEqual((await pending('stand-days')).find((a) => a.id === r.json.id).input, { object: { icon: 'note', title: 'Dinner Friday', content: 'Dinner Friday at 7', date: '2026-11-13' } });
    r = await send(pat, 'stand-days:createEvent', { object: { kind: 'image', title: 'beach.jpg', details: { upload: 'a'.repeat(24) } } });
    assert.deepEqual([r.status, r.json], [400, { error: 'Days cannot take an image' }]);
    r = await send(pat, 'stand-notes:savePhoto', { object: { kind: 'image', title: 'beach.jpg', details: { upload: 'b'.repeat(24), name: 'beach.jpg' } } });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual((await pending('stand-notes')).find((a) => a.id === r.json.id).input.object, { icon: 'note', title: 'beach.jpg', kind: 'image', details: { upload: 'b'.repeat(24), name: 'beach.jpg' } });
    for (const upload of ['../../etc/passwd', undefined, 12]) {
      r = await send(pat, 'stand-notes:savePhoto', { object: { kind: 'image', title: 'beach.jpg', content: 'a caption', details: { upload } } });
      assert.deepEqual([r.status, r.json], [400, { error: 'object is a picture, so its details.upload must be the id of a file uploaded to the module' }], String(upload));
    }
    r = await send(pat, 'stand-days:createEvent', { object: { title: 'T', content: 'x'.repeat(70000) } });
    assert.deepEqual([r.status, r.json], [413, { error: 'that request is over 64 KB' }]);
    r = await send(pat, 'stand-notes:savePhoto', { object: { title: 'Just words', content: 'x' } });
    assert.deepEqual([r.status, r.json], [400, { error: 'Notes cannot take an object with no kind' }]);
    r = await send(pat, 'stand-days:createEvent', { object: 'Concert' });
    assert.deepEqual([r.status, r.json], [400, { error: 'object must be an object' }]);
    r = await send(pat, 'stand-days:createEvent', { object: [{ title: 'T', content: 'c' }] });
    assert.deepEqual([r.status, r.json], [400, { error: 'object must be an object' }]);
    r = await send(pat, 'stand-days:createEvent', { object: { content: 'no title' } });
    assert.deepEqual([r.status, r.json], [400, { error: 'object needs a title, and content or details' }]);
    r = await send(pat, 'stand-notes:savePhoto', {});
    assert.deepEqual([r.status, r.json], [400, { error: 'object is needed' }], 'a required object');
    // Without an object, an action keeps working as before.
    r = await send(pat, 'stand-plans:acceptSuggestion', { title: 'Lunch', kind: 'restaurant' });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual((await pending('stand-plans')).find((a) => a.id === r.json.id).input, { title: 'Lunch', kind: 'restaurant' });
  });

  await test('live: a takes permission is checked on the request too', async () => {
    let r = await send(pat, 'stand-polls:draftPoll', { object: { kind: 'poll', title: 'Where to?', details: { options: ['Faro', 'Lagos'] } } });
    assert.deepEqual([r.status, r.json], [403, { error: 'you may not add a poll to Votes here' }]);
    r = await send(pat, 'stand-polls:draftPoll', { object: { kind: 'task', title: 'Pack', content: 'x' } });
    assert.deepEqual([r.status, r.json], [400, { error: 'Votes cannot take a task' }], 'a kind not taken is said first');
    r = await send(admin, 'stand-polls:draftPoll', { object: { kind: 'poll', title: 'Where to?', details: { options: ['Faro', 'Lagos'] } } });
    assert.equal(r.status, 200, r.text);
  });

  await test('live: a module asking through the bus is held to the same takes', async () => {
    const ask = (input) => call('POST', '/api/bus/actions/request', { token: pat, body: { from: 'stand-asker', action: 'stand-days:createEvent', input, scope: 'space', space: S } });
    let r = await ask({ object: { kind: 'flight', title: 'SW', details: { number: '1' } } });
    assert.deepEqual([r.status, r.json], [400, { error: 'Days cannot take a flight' }]);
    r = await ask({ object: { kind: 'task', title: 'Pack', details: { due: '2026-11-12' } } });
    assert.equal(r.status, 200, r.text);
    assert.deepEqual((await pending('stand-days')).find((a) => a.id === r.json.id).input, { object: { icon: 'note', title: 'Pack', kind: 'task', details: { due: '2026-11-12' } } });
  });

  await test('live: the copied instructions list what the enabled modules take; the schema is the whole catalogue', async () => {
    const shown = async () => (await call('GET', '/api/objects/format', { token: pat })).json;
    let format = await shown();
    assert.match(format.instructions, /Set "kind" to what the object is: flight, train, bus, ferry, car, hotel, restaurant, cafe, bar, sight, museum, tour, show, event, task, poll or note\./);
    assert.match(format.instructions, /\n- task: due\n/);
    assert.deepEqual(format.schema.$defs.object.properties.kind.enum, KINDS);
    await turn('stand-polls', false);
    format = await shown();
    assert.ok(!/\bpoll\b/.test(format.instructions), 'Votes off: no poll');
    await turn('stand-plans', false);
    format = await shown();
    assert.match(format.instructions, /Set "kind" to what the object is: task\. /);
    assert.ok(!format.instructions.includes('flight'));
    assert.deepEqual(format.schema.$defs.object.properties.kind.enum, KINDS, 'the schema stays one schema');
    await turn('stand-older', true);
    format = await shown();
    assert.match(format.instructions, /Set "kind" to what the object is: flight, train, bus, ferry, car, hotel, restaurant, cafe, bar, sight, museum, tour, show or task\./, 'the old typed keeper beside Tasks: the travel kinds and task');
    await turn('stand-older', false);
    for (const id of ['stand-days', 'stand-tasks', 'stand-notes']) await turn(id, false);
    format = await shown();
    assert.ok(!format.instructions.includes('Set "kind"'), 'nothing takes a kind: no kind line');
    for (const id of ['stand-days', 'stand-plans', 'stand-tasks', 'stand-notes', 'stand-polls']) await turn(id, true);
  });

  await test('live: a request already waiting in bus.json from before still runs', async () => {
    await server.stop();
    const file = path.join(dataDir, 'modules', 'bus.json');
    const bus = JSON.parse(fs.readFileSync(file, 'utf8'));
    const old = { id: bus.seq + 1, at: Date.now() - 3600000, from: 'stand-plans', provider: 'stand-plans', action: 'acceptSuggestion', input: { title: 'Casa do Largo', kind: 'hotel', content: 'Stay.', date: '2026-11-14' }, scopeKey: `space:${S}`, by: made.json.user.key, status: 'pending', claimedAt: 0, result: null };
    bus.seq = old.id;
    bus.actions.push(old);
    fs.writeFileSync(file, JSON.stringify(bus));
    server = await startServer();
    ({ call, signIn } = server);
    const again = await signIn('admin', 'testpass1234');
    const waiting = (await call('GET', `/api/bus/actions/pending?module=stand-plans&scope=space&space=${S}`, { token: again })).json.actions.find((a) => a.id === old.id);
    assert.deepEqual(waiting.input, old.input, 'read as it was stored');
    const claimed = await call('POST', '/api/bus/actions/claim', { token: again, body: { module: 'stand-plans', id: old.id, scope: 'space', space: S } });
    assert.equal(claimed.json.ok, true, claimed.text);
    const done = await call('POST', '/api/bus/actions/complete', { token: again, body: { module: 'stand-plans', id: old.id, scope: 'space', space: S, result: { ok: true } } });
    assert.equal(done.json.ok, true, done.text);
  });
} finally {
  if (server) await server.stop();
  fs.rmSync(base, { recursive: true, force: true });
}

console.log(`check-object-handoff: OK (${n} checks)`);
