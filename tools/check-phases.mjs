#!/usr/bin/env node
/*
 * check-phases.mjs -- the phase timeline (documentation/plans/plan-one-bar.md, step 1): the pure rule in
 * public/phases.js run in node (contiguity refusals, a skipped undated phase, coverMain shifting later boundaries by
 * the same days and never moving an earlier one, chipWords before, during and after the main phase, no phases at
 * all), then the routes on a throwaway server (PORT=0, DATA_DIR under the system tmpdir, stopped by its pid): a space
 * carries `phases`, PATCH /api/spaces/:id { phases } for the admin and a moderator, refused for a member, each refusal
 * with its sentence, POST /api/spaces/:id/phases/cover for a member who can write in a module on in the space, and
 * the stored key.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

// Days are counted in UTC here and on the server it starts, so the created day is the same on both sides.
process.env.TZ = 'UTC';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const P = require('../public/phases.js');

let n = 0;
let failed = 0;
const test = async (name, fn) => {
  try { await fn(); n += 1; } catch (err) { failed += 1; console.error(`check-phases: ${name}: ${err.stack || err.message}`); }
};

// The travel template's phases, as server/templates.js gives them.
const TRAVEL = [
  { id: 'planning', label: 'Planning' }, { id: 'booking', label: 'Booking' }, { id: 'buffer', label: 'Buffer' },
  { id: 'pre-trip', label: 'Pre-trip' }, { id: 'trip', label: 'Trip', main: true }, { id: 'post-trip', label: 'Post-trip' },
];
const CREATED = '2026-09-01T12:00:00.000Z';
const band = (b) => [b.id, b.start, b.end, b.dated, b.current];

// --- the pure rule ------------------------------------------------------------------------------------------------

await test('days: real days only, arithmetic, a moment read as its local day', () => {
  assert.deepEqual(['2026-02-29', '2026-13-01', '2026-2-1', 20260201, '', null].map(P.isDay), [false, false, false, false, false, false]);
  assert.deepEqual(['2024-02-29', '2026-10-13'].map(P.isDay), [true, true]);
  assert.equal(P.addDays('2026-12-30', 3), '2027-01-02');
  assert.equal(P.daysBetween('2026-10-01', '2026-10-13'), 12);
  assert.equal(P.daysBetween('2026-10-13', '2026-10-01'), -12);
  assert.equal(P.dayOf('2026-09-01'), '2026-09-01');
  assert.equal(P.dayOf(CREATED), P.dayOf(new Date(CREATED)), 'a moment, as a day');
  assert.equal(P.dayOf('nope'), null);
});

await test('timelineOf: the first phase starts on the created day, a boundary is the first day of the next phase, the last dated band is open-ended unless it is main', () => {
  const bands = P.timelineOf(TRAVEL, { booking: { start: '2026-09-10' }, trip: { start: '2026-10-01', end: '2026-10-07' } }, { today: '2026-09-12', created: CREATED });
  assert.deepEqual(bands.map(band), [
    ['planning', P.dayOf(CREATED), '2026-09-09', true, false],
    ['booking', '2026-09-10', '2026-09-30', true, true],
    ['buffer', null, null, false, false],
    ['pre-trip', null, null, false, false],
    ['trip', '2026-10-01', '2026-10-07', true, false],
    ['post-trip', null, null, false, false],
  ]);
  assert.deepEqual(bands.map((b) => [b.label, b.main]), [['Planning', false], ['Booking', false], ['Buffer', false], ['Pre-trip', false], ['Trip', true], ['Post-trip', false]]);
  // Booking's band runs to the day before Trip starts: the undated Buffer and Pre-trip have zero width and are skipped.
  // A dated last phase that is not main is open-ended; a main last phase without an end is open-ended too.
  const open = P.timelineOf(TRAVEL, { trip: { start: '2026-10-01', end: '2026-10-07' }, 'post-trip': { start: '2026-10-08' } }, { today: '2026-10-20', created: CREATED });
  assert.deepEqual(open.map(band).filter((b) => b[3]), [['planning', P.dayOf(CREATED), '2026-09-30', true, false], ['trip', '2026-10-01', '2026-10-07', true, false], ['post-trip', '2026-10-08', null, true, true]]);
  const mainLast = P.timelineOf([{ id: 'plan', label: 'Plan' }, { id: 'go', label: 'Go', main: true }], { go: { start: '2026-10-01' } }, { today: '2026-12-01', created: CREATED });
  assert.deepEqual(mainLast.map(band), [['plan', P.dayOf(CREATED), '2026-09-30', true, false], ['go', '2026-10-01', null, true, true]]);
  // Nothing dated: the first phase from the created day, open-ended; without a created day nothing is dated.
  assert.deepEqual(P.timelineOf(TRAVEL, {}, { today: '2026-10-01', created: CREATED }).map(band)[0], ['planning', P.dayOf(CREATED), null, true, true]);
  assert.deepEqual(P.timelineOf(TRAVEL, {}, { today: '2026-10-01' }).map((b) => b.dated), [false, false, false, false, false, false]);
  assert.deepEqual(P.timelineOf([], {}, { today: '2026-10-01', created: CREATED }), [], 'no phases, no bands');
  assert.deepEqual(P.timelineOf(TRAVEL, { trip: { start: '2026-10-01' } }, { created: CREATED }).map((b) => b.current), [false, false, false, false, false, false], 'no today, nothing current');
});

await test('problemOf: the refusals, each one sentence', () => {
  const problem = (dates, extra) => P.problemOf(TRAVEL, dates, { created: CREATED, ...extra });
  assert.equal(problem({}), null);
  assert.equal(problem({ booking: { start: '2026-09-10' }, trip: { start: '2026-10-01', end: '2026-10-07' }, 'post-trip': { start: '2026-10-08' } }), null);
  assert.equal(problem({ nope: { start: '2026-09-10' } }), 'There is no phase called "nope".');
  assert.equal(problem({ booking: { start: '2026-09-10', end: '2026-09-20' } }), 'Only Trip, the main phase, has an end.');
  assert.equal(P.problemOf([{ id: 'a', label: 'A' }], { a: { end: '2026-09-20' } }, { created: CREATED }), 'No phase here has an end.');
  assert.equal(problem({ booking: { start: '10/09/2026' } }), 'Booking\'s start must be a day written as YYYY-MM-DD.');
  assert.equal(problem({ trip: { start: '2026-10-01', end: '2026-02-30' } }), 'Trip\'s end must be a day written as YYYY-MM-DD.');
  assert.equal(problem({ booking: { begins: '2026-09-10' } }), 'Booking\'s dates are start and end.');
  assert.equal(problem({ booking: 'soon' }), 'Booking\'s dates are start and end.');
  assert.equal(problem('soon'), 'Phases must be a set of dates by phase id.');
  assert.equal(problem({ trip: { end: '2026-10-07' } }), 'Set when Trip starts before its end.');
  assert.equal(problem({ trip: { start: '2026-10-07', end: '2026-10-01' } }), 'Trip can\'t end before it starts, 2026-10-07.');
  assert.equal(problem({ trip: { start: '2026-10-01', end: '2026-10-01' } }), null, 'a one-day main phase');
  // Not after the previous boundary: the same day, or earlier.
  assert.equal(problem({ booking: { start: '2026-09-10' }, buffer: { start: '2026-09-10' } }), 'Buffer must start after Booking starts, 2026-09-10.');
  assert.equal(problem({ booking: { start: '2026-09-10' }, trip: { start: '2026-09-05' } }), 'Trip must start after Booking starts, 2026-09-10.');
  assert.equal(problem({ planning: { start: '2026-09-20' }, booking: { start: '2026-09-10' } }), 'Booking must start after Planning starts, 2026-09-20.');
  assert.equal(problem({ trip: { start: '2026-10-01', end: '2026-10-07' }, 'post-trip': { start: '2026-10-07' } }), 'Post-trip must start after Trip ends, 2026-10-07.');
  // The first phase's start may be before the created day (there is no boundary before it).
  assert.equal(problem({ planning: { start: '2026-08-01' } }), null);
  // Read from the moved phase's side: not before the next.
  assert.equal(problem({ booking: { start: '2026-09-10' }, trip: { start: '2026-09-05' } }, { moved: 'booking' }), 'Booking must start before Trip starts, 2026-09-05.');
  assert.equal(problem({ trip: { start: '2026-10-01', end: '2026-10-09' }, 'post-trip': { start: '2026-10-08' } }, { moved: 'trip' }), 'Trip must end before Post-trip starts, 2026-10-08.');
  assert.equal(P.problemOf([], { trip: { start: '2026-10-01' } }, { created: CREATED }), 'There is no phase called "trip".', 'a space whose template has no phases');
});

await test('moveBoundary: a start or the main end, refused with the sentence and nothing changed, cleared with null', () => {
  const dates = { booking: { start: '2026-09-10' }, trip: { start: '2026-10-01', end: '2026-10-07' } };
  const ok = P.moveBoundary(TRAVEL, dates, { id: 'booking' }, '2026-09-12', { created: CREATED });
  assert.deepEqual(ok, { ok: true, dates: { booking: { start: '2026-09-12' }, trip: { start: '2026-10-01', end: '2026-10-07' } } });
  assert.deepEqual(P.moveBoundary(TRAVEL, dates, 'booking', '2026-10-01', { created: CREATED }), { ok: false, problem: 'Booking must start before Trip starts, 2026-10-01.' });
  assert.deepEqual(P.moveBoundary(TRAVEL, dates, { id: 'booking' }, P.dayOf(CREATED), { created: CREATED }), { ok: false, problem: `Booking must start after Planning starts, ${P.dayOf(CREATED)}.` });
  assert.deepEqual(P.moveBoundary(TRAVEL, dates, { id: 'trip', edge: 'end' }, '2026-10-20', { created: CREATED }).dates.trip, { start: '2026-10-01', end: '2026-10-20' });
  assert.deepEqual(P.moveBoundary(TRAVEL, dates, { id: 'booking', edge: 'end' }, '2026-09-20', { created: CREATED }), { ok: false, problem: 'Only Trip, the main phase, has an end.' });
  assert.deepEqual(P.moveBoundary(TRAVEL, dates, { id: 'booking' }, null, { created: CREATED }).dates, { trip: { start: '2026-10-01', end: '2026-10-07' } }, 'cleared');
  assert.deepEqual(P.moveBoundary(TRAVEL, dates, { id: 'trip', edge: 'end' }, null, { created: CREATED }).dates.trip, { start: '2026-10-01' });
  assert.deepEqual(dates, { booking: { start: '2026-09-10' }, trip: { start: '2026-10-01', end: '2026-10-07' } }, 'the given dates are not touched');
});

await test('moveBoundary keeps the timeline contiguous: the main end and the next dated start are one boundary', () => {
  const dates = { trip: { start: '2026-10-01', end: '2026-10-07' }, 'post-trip': { start: '2026-10-08' } };
  // The main end moved: the next dated phase starts the day after, later or earlier.
  assert.deepEqual(P.moveBoundary(TRAVEL, dates, { id: 'trip', edge: 'end' }, '2026-10-12', { created: CREATED }).dates, { trip: { start: '2026-10-01', end: '2026-10-12' }, 'post-trip': { start: '2026-10-13' } });
  assert.deepEqual(P.moveBoundary(TRAVEL, dates, { id: 'trip', edge: 'end' }, '2026-10-03', { created: CREATED }).dates, { trip: { start: '2026-10-01', end: '2026-10-03' }, 'post-trip': { start: '2026-10-04' } });
  // The next dated start moved: the main phase ends the day before.
  assert.deepEqual(P.moveBoundary(TRAVEL, dates, { id: 'post-trip' }, '2026-10-20', { created: CREATED }).dates, { trip: { start: '2026-10-01', end: '2026-10-19' }, 'post-trip': { start: '2026-10-20' } });
  // Moved onto the main phase's first day: the end would come before the start, refused.
  assert.deepEqual(P.moveBoundary(TRAVEL, dates, { id: 'post-trip' }, '2026-10-01', { created: CREATED }), { ok: false, problem: 'Trip can\'t end before it starts, 2026-10-01.' });
  // A later phase dated for the first time: the main end follows it too (the moved side wins).
  assert.deepEqual(P.moveBoundary(TRAVEL, { trip: { start: '2026-10-01', end: '2026-10-07' } }, { id: 'post-trip' }, '2026-10-20', { created: CREATED }).dates, { trip: { start: '2026-10-01', end: '2026-10-19' }, 'post-trip': { start: '2026-10-20' } });
  // An earlier boundary moved: the shared boundary stays as it is.
  assert.deepEqual(P.moveBoundary(TRAVEL, dates, { id: 'booking' }, '2026-09-10', { created: CREATED }).dates, { booking: { start: '2026-09-10' }, ...dates });
  // The phase after the main one cleared: the next dated phase after it takes the shared boundary.
  const three = { trip: { start: '2026-10-01', end: '2026-10-07' }, 'post-trip': { start: '2026-10-08' } };
  const twoMain = [{ id: 'go', label: 'Go', main: true }, { id: 'rest', label: 'Rest' }, { id: 'after', label: 'After' }];
  const cleared = P.moveBoundary(twoMain, { go: { end: '2026-10-07' }, rest: { start: '2026-10-08' }, after: { start: '2026-10-20' } }, { id: 'rest' }, null, { created: CREATED });
  assert.deepEqual(cleared, { ok: true, dates: { go: { end: '2026-10-07' }, after: { start: '2026-10-08' } } });
  // Without a main end the next start is the only boundary and moves on its own.
  const noEnd = { trip: { start: '2026-10-01' }, 'post-trip': { start: '2026-10-08' } };
  assert.deepEqual(P.moveBoundary(TRAVEL, noEnd, { id: 'post-trip' }, '2026-10-20', { created: CREATED }).dates, { trip: { start: '2026-10-01' }, 'post-trip': { start: '2026-10-20' } });
  for (const d of [three, noEnd]) assert.equal(P.problemOf(TRAVEL, d, { created: CREATED }), null);
});

await test('coverMain: the main end later, later boundaries shifted by the same days, earlier ones never moved', () => {
  const dates = { booking: { start: '2026-09-10' }, trip: { start: '2026-10-01', end: '2026-10-07' }, 'post-trip': { start: '2026-10-08' } };
  const r = P.coverMain(TRAVEL, dates, '2026-10-10', { created: CREATED });
  assert.deepEqual(r, { moved: true, dates: { booking: { start: '2026-09-10' }, trip: { start: '2026-10-01', end: '2026-10-10' }, 'post-trip': { start: '2026-10-11' } } });
  assert.equal(P.problemOf(TRAVEL, r.dates, { created: CREATED }), null, 'still contiguous');
  // Covered already, before the main phase, on its first day: nothing moves.
  for (const day of ['2026-10-07', '2026-10-03', '2026-09-15', '2026-10-01']) assert.deepEqual(P.coverMain(TRAVEL, dates, day, { created: CREATED }), { moved: false, dates }, day);
  // No end yet: the main phase ends the day before the next boundary, and that boundary shifts.
  const noEnd = { trip: { start: '2026-10-01' }, 'post-trip': { start: '2026-10-05' } };
  assert.deepEqual(P.coverMain(TRAVEL, noEnd, '2026-10-09', { created: CREATED }).dates, { trip: { start: '2026-10-01', end: '2026-10-09' }, 'post-trip': { start: '2026-10-10' } });
  // No end and no later boundary: the end is set.
  assert.deepEqual(P.coverMain(TRAVEL, { trip: { start: '2026-10-01' } }, '2026-10-09', { created: CREATED }).dates, { trip: { start: '2026-10-01', end: '2026-10-09' } });
  // No dated main phase, no main phase, a day that is not a day: nothing moves.
  assert.equal(P.coverMain(TRAVEL, { booking: { start: '2026-09-10' } }, '2026-10-09', { created: CREATED }).moved, false);
  assert.equal(P.coverMain([{ id: 'a', label: 'A' }], { a: { start: '2026-09-10' } }, '2026-10-09', { created: CREATED }).moved, false);
  assert.equal(P.coverMain(TRAVEL, dates, 'tomorrow', { created: CREATED }).moved, false);
  // The main phase is the first phase: it starts on the created day.
  const mainFirst = [{ id: 'go', label: 'Go', main: true }, { id: 'after', label: 'After' }];
  const c = P.dayOf(CREATED);
  assert.deepEqual(P.coverMain(mainFirst, { after: { start: P.addDays(c, 3) } }, P.addDays(c, 5), { created: CREATED }).dates, { go: { end: P.addDays(c, 5) }, after: { start: P.addDays(c, 6) } });
});

await test('chipWords: day N of M in a band with an end, days to go before the next band, else the label', () => {
  const dates = { booking: { start: '2026-09-10' }, trip: { start: '2026-10-01', end: '2026-10-07' } };
  const words = (today, d = dates, phases = TRAVEL) => P.chipWords(P.timelineOf(phases, d, { today, created: CREATED }), today);
  assert.equal(words('2026-10-02'), 'Trip · day 2 of 7', 'during the main phase');
  assert.equal(words('2026-10-07'), 'Trip · day 7 of 7');
  assert.equal(words('2026-09-11'), 'Booking · day 2 of 21', 'before the main phase, in a band with an end');
  assert.equal(words('2026-10-08'), 'Trip', 'after the main phase, nothing dated after it: the last band\'s label');
  assert.equal(words('2026-10-08', { ...dates, 'post-trip': { start: '2026-10-08' } }), 'Post-trip', 'an open-ended band');
  assert.equal(words('2026-10-20', { ...dates, 'post-trip': { start: '2026-10-08' } }), 'Post-trip');
  assert.equal(words('2026-08-20', { planning: { start: '2026-09-01' }, ...dates }), 'Planning · 12 days to go', 'not started');
  assert.equal(words('2026-08-31', { planning: { start: '2026-09-01' }, ...dates }), 'Planning · 1 day to go');
  assert.equal(words('2026-10-09', { trip: { start: '2026-10-01', end: '2026-10-07' }, 'post-trip': { start: '2026-10-12' } }), 'Post-trip · 3 days to go', 'in a gap');
  assert.equal(words('2026-10-01', {}), 'Planning', 'nothing dated: the first phase, open-ended from the created day');
  assert.equal(words('2026-10-01', {}, []), '', 'no phases');
  assert.equal(P.chipWords(P.timelineOf(TRAVEL, dates, { created: CREATED }), null), 'Trip', 'no today: the last dated band');
});

// --- the routes -----------------------------------------------------------------------------------------------------

const PRODUCT = 'Testname';
let child = null;
function startServer(dataDir, env = {}) {
  child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: '0', DATA_DIR: dataDir, TZ: 'UTC', PRODUCT_NAME: PRODUCT, LIVEKIT_API_KEY: 'devkey', LIVEKIT_API_SECRET: 'devsecretdevsecret', ADMIN_PASSWORD: 'admin-password-1', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`the server did not start in time:\n${out}`)); }, 20000);
    const onData = () => { const m = /listening on :(\d+)/.exec(out); if (m) { clearTimeout(timer); resolve({ port: Number(m[1]), output: () => out }); } };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`the server stopped (${code}):\n${out}`)); });
  });
}
// Stopped by its own pid (child.kill sends SIGTERM to that process only), never by name.
const stopServer = () => new Promise((resolve) => { if (!child || child.exitCode !== null) return resolve(); child.once('exit', resolve); child.kill('SIGTERM'); });
function call(server, method, urlPath, { body, cookie } = {}) {
  const payload = body === undefined ? null : Buffer.from(JSON.stringify(body));
  const headers = { host: `127.0.0.1:${server.port}`, accept: 'application/json' };
  if (payload) { headers['content-type'] = 'application/json'; headers['content-length'] = payload.length; }
  if (cookie) headers.cookie = cookie;
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: server.port, method, path: urlPath, headers }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = JSON.parse(text); } catch { /* not JSON */ }
        resolve({ status: res.statusCode, json, text, headers: res.headers });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}
const cookieOf = (res) => [].concat(res.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');
const answer = (r) => [r.status, r.json];

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'check-phases-'));
const dataDir = path.join(base, 'data');
try {
  const server = await startServer(dataDir);
  const admin = cookieOf(await call(server, 'POST', '/api/login', { body: { login: 'admin', password: 'admin-password-1' } }));
  const asAdmin = (method, url, body) => call(server, method, url, { cookie: admin, body });
  const makeUser = async (login) => {
    const made = await asAdmin('POST', '/api/users', { login, displayName: login, role: 'member', password: `${login}-password-1` });
    assert.equal(made.status, 201, made.text);
    return { key: made.json.user.key, cookie: cookieOf(await call(server, 'POST', '/api/login', { body: { login, password: `${login}-password-1` } })) };
  };
  const mia = await makeUser('mia'); // a member of the trip
  const mo = await makeUser('mo'); // a member who moderates the trip
  const outsider = await makeUser('ola'); // not in the trip
  const asMember = (method, url, body) => call(server, method, url, { cookie: mia.cookie, body });
  const asModerator = (method, url, body) => call(server, method, url, { cookie: mo.cookie, body });
  const made = await asAdmin('POST', '/api/spaces', { name: 'Lisbon', members: [mia.key, mo.key] });
  assert.equal(made.status, 200, made.text);
  const trip = made.json.space;
  assert.equal((await asAdmin('PATCH', `/api/users/${mo.key}/spaces/${trip.id}`, { permissions: { moderator: true } })).status, 200);
  const stored = () => JSON.parse(fs.readFileSync(path.join(dataDir, 'app.json'), 'utf8')).spaces.find((s) => s.id === trip.id);
  const ownersOnly = { error: 'owners only' };

  await test('a space carries phases, {} while none is set and no key stored; a template with none refuses any phase', async () => {
    assert.deepEqual(trip.phases, {}, 'on the space as made');
    assert.deepEqual((await asAdmin('GET', `/api/spaces/${trip.id}`)).json.space.phases, {});
    assert.deepEqual((await asAdmin('GET', '/api/spaces')).json.spaces.find((s) => s.id === trip.id).phases, {}, 'on the list');
    assert.equal('phases' in stored(), false, 'nothing stored');
    assert.deepEqual(answer(await asAdmin('PATCH', `/api/spaces/${trip.id}`, { phases: { trip: { start: '2026-10-01' } } })), [400, { error: 'There is no phase called "trip".' }]);
    assert.deepEqual(answer(await asAdmin('PATCH', `/api/spaces/${trip.id}`, { phases: {} })), [200, { space: { ...trip, phases: {} } }], 'an empty set is allowed and stores nothing');
    assert.equal('phases' in stored(), false);
    assert.equal((await asAdmin('POST', `/api/spaces/${trip.id}/phases/cover`, { day: '2026-10-09' })).status, 204, 'nothing to move without phases');
  });

  await test('branding carries the template\'s phases for the chip (step 3): [] with no template, the ordered list with one', async () => {
    assert.deepEqual((await call(server, 'GET', '/api/branding')).json.phases, [], 'no template: an empty list, not missing');
    assert.deepEqual((await asAdmin('GET', '/api/config')).json.phases, [], 'the same through /api/config');
    assert.equal((await asAdmin('PATCH', '/api/settings', { template: 'travel' })).status, 200);
    const expected = TRAVEL.map((p) => ({ id: p.id, label: p.label, ...(p.main ? { main: true } : {}) }));
    assert.deepEqual((await call(server, 'GET', '/api/branding')).json.phases, expected, 'the travel template\'s phases, in order, main marked, with no restart');
    assert.deepEqual((await asAdmin('GET', '/api/config')).json.phases, expected);
    assert.deepEqual(P.cleanPhases(expected), TRAVEL.map((p) => ({ id: p.id, label: p.label, main: p.main === true })), 'the shape the chip cleans');
    assert.equal((await asAdmin('PATCH', '/api/settings', { template: null })).status, 200);
    assert.deepEqual((await call(server, 'GET', '/api/branding')).json.phases, [], 'back to none when the template is dropped');
  });

  // The travel template, for its phases; To-do on in the trip, for a member with write there.
  assert.equal((await asAdmin('PATCH', '/api/settings', { template: 'travel' })).status, 200);
  assert.equal((await asAdmin('POST', '/api/modules/bundled/todo/install')).status, 201);
  assert.equal((await asAdmin('PATCH', '/api/modules/todo', { enabled: true, spaces: [trip.id] })).status, 200);

  // The first phase starts on the day the space was created (today), so every date is counted from it.
  const c = P.dayOf(trip.createdAt);
  const d = (n) => P.addDays(c, n);
  const dates = { booking: { start: d(10) }, trip: { start: d(30), end: d(36) }, 'post-trip': { start: d(37) } };

  await test('PATCH phases: the admin sets the dates, each refusal is 400 with its sentence and changes nothing', async () => {
    const set = await asAdmin('PATCH', `/api/spaces/${trip.id}`, { phases: dates });
    assert.deepEqual([set.status, set.json.space.phases], [200, dates], set.text);
    assert.deepEqual(stored().phases, dates, 'stored under phases on the space record');
    assert.deepEqual((await asAdmin('GET', `/api/spaces/${trip.id}`)).json.space.phases, dates);
    const refused = [
      [{ nope: { start: d(10) } }, 'There is no phase called "nope".'],
      [{ booking: { start: d(10), end: d(20) } }, 'Only Trip, the main phase, has an end.'],
      [{ booking: { start: d(10) }, buffer: { start: d(10) } }, `Buffer must start after Booking starts, ${d(10)}.`],
      [{ booking: { start: d(10) }, trip: { start: d(5) } }, `Trip must start after Booking starts, ${d(10)}.`],
      [{ booking: { start: d(-5) } }, `Booking must start after Planning starts, ${c}.`],
      [{ trip: { start: d(30), end: d(36) }, 'post-trip': { start: d(36) } }, `Post-trip must start after Trip ends, ${d(36)}.`],
      [{ trip: { start: d(36), end: d(30) } }, `Trip can't end before it starts, ${d(36)}.`],
      [{ trip: { start: 'October 1' } }, 'Trip\'s start must be a day written as YYYY-MM-DD.'],
      [{ trip: { end: d(36) } }, 'Set when Trip starts before its end.'],
      ['soon', 'Phases must be a set of dates by phase id.'],
    ];
    for (const [phases, error] of refused) assert.deepEqual(answer(await asAdmin('PATCH', `/api/spaces/${trip.id}`, { phases })), [400, { error }], JSON.stringify(phases));
    assert.deepEqual(stored().phases, dates, 'a refused set changes nothing');
    assert.equal((await asAdmin('PATCH', `/api/spaces/${trip.id}`, { name: 'Lisbon in May', phases: 'soon' })).status, 400, 'a refused set refuses the whole change');
    assert.equal(stored().name, 'Lisbon');
    // Planning given a start before the created day: allowed, there is no boundary before the first phase.
    assert.equal((await asAdmin('PATCH', `/api/spaces/${trip.id}`, { phases: { planning: { start: d(-20) }, booking: { start: d(-5) }, ...dates, booking: { start: d(-5) } } })).status, 200);
    // The whole set replaces what is stored; null clears it.
    const less = await asAdmin('PATCH', `/api/spaces/${trip.id}`, { phases: { trip: { start: d(30), end: d(36) } } });
    assert.deepEqual([less.status, less.json.space.phases], [200, { trip: { start: d(30), end: d(36) } }]);
    assert.deepEqual((await asAdmin('PATCH', `/api/spaces/${trip.id}`, { phases: null })).json.space.phases, {});
    assert.equal('phases' in stored(), false, 'cleared, no key stored');
    assert.equal((await asAdmin('PATCH', `/api/spaces/${trip.id}`, { phases: dates })).status, 200);
  });

  await test('PATCH phases: a moderator may, a member and an outsider may not, a moderator may send nothing else', async () => {
    const moved = { ...dates, booking: { start: d(12) } };
    const r = await asModerator('PATCH', `/api/spaces/${trip.id}`, { phases: moved });
    assert.deepEqual([r.status, r.json.space.phases], [200, moved], r.text);
    assert.deepEqual(answer(await asModerator('PATCH', `/api/spaces/${trip.id}`, { phases: { ...dates, booking: { start: d(30) } } })), [400, { error: `Trip must start after Booking starts, ${d(30)}.` }], 'the same rule for a moderator');
    assert.deepEqual(answer(await asModerator('PATCH', `/api/spaces/${trip.id}`, { name: 'Porto' })), [403, ownersOnly], 'the name is not a moderator\'s');
    assert.deepEqual(answer(await asModerator('PATCH', `/api/spaces/${trip.id}`, { name: 'Porto', phases: moved })), [403, ownersOnly], 'not with phases beside it either');
    assert.deepEqual(answer(await asMember('PATCH', `/api/spaces/${trip.id}`, { phases: moved })), [403, ownersOnly], 'a member');
    assert.deepEqual(answer(await call(server, 'PATCH', `/api/spaces/${trip.id}`, { cookie: outsider.cookie, body: { phases: moved } })), [403, ownersOnly], 'someone not in the space');
    assert.deepEqual(answer(await call(server, 'PATCH', `/api/spaces/${trip.id}`, { body: { phases: moved } })), [401, { error: 'sign in first' }]);
    assert.deepEqual(answer(await asModerator('PATCH', '/api/spaces/nope', { phases: moved })), [404, { error: 'no such trip' }]);
    assert.equal(stored().name, 'Lisbon');
    assert.deepEqual(stored().phases, moved);
  });

  await test('the module context\'s space carries phases, for a member too', async () => {
    const ctx = await asMember('GET', `/api/modules/todo/context?scope=space&space=${trip.id}`);
    assert.equal(ctx.status, 200, ctx.text);
    assert.deepEqual(ctx.json.space, { id: trip.id, name: 'Lisbon', createdAt: trip.createdAt, phases: stored().phases });
    assert.deepEqual(ctx.json.phases.map((p) => p.id), ['planning', 'booking', 'buffer', 'pre-trip', 'trip', 'post-trip'], 'the template\'s phases, as before');
  });

  await test('cover: a member who can write in a module on in the space moves the main end later and the later boundaries with it', async () => {
    const refusal = { error: 'Only someone who can write in a module that is on in this trip can move its dates.' };
    const r = await asMember('POST', `/api/spaces/${trip.id}/phases/cover`, { day: d(39) });
    assert.deepEqual(answer(r), [200, { phases: { booking: { start: d(12) }, trip: { start: d(30), end: d(39) }, 'post-trip': { start: d(40) } } }], r.text);
    assert.deepEqual(stored().phases, r.json.phases);
    for (const day of [d(39), d(33), d(20), d(30)]) {
      const again = await asMember('POST', `/api/spaces/${trip.id}/phases/cover`, { day });
      assert.deepEqual([again.status, again.text], [204, ''], `${day}: nothing moved`);
    }
    assert.deepEqual(stored().phases, r.json.phases, 'nothing moved');
    assert.deepEqual(answer(await asMember('POST', `/api/spaces/${trip.id}/phases/cover`, { day: 'tomorrow' })), [400, { error: 'Send the day to cover as YYYY-MM-DD.' }]);
    assert.deepEqual(answer(await asMember('POST', `/api/spaces/${trip.id}/phases/cover`, {})), [400, { error: 'Send the day to cover as YYYY-MM-DD.' }]);
    assert.deepEqual(answer(await call(server, 'POST', `/api/spaces/${trip.id}/phases/cover`, { cookie: outsider.cookie, body: { day: d(50) } })), [403, refusal]);
    assert.deepEqual(answer(await call(server, 'POST', `/api/spaces/${trip.id}/phases/cover`, { body: { day: d(50) } })), [401, { error: 'sign in first' }]);
    assert.deepEqual(answer(await asMember('POST', '/api/spaces/nope/phases/cover', { day: d(50) })), [404, { error: 'no such trip' }]);
    assert.equal((await asAdmin('PATCH', '/api/modules/todo', { spaces: [] })).status, 200, 'To-do off in the trip');
    assert.deepEqual(answer(await asMember('POST', `/api/spaces/${trip.id}/phases/cover`, { day: d(45) })), [403, refusal], 'no module on in the space');
    assert.equal((await asAdmin('POST', `/api/spaces/${trip.id}/phases/cover`, { day: d(45) })).status, 200, 'the admin, with no module on');
    assert.equal(stored().phases.trip.end, d(45));
    assert.equal(stored().phases['post-trip'].start, d(46));
  });

  await test('the app keeps behaving as before: a space without the key reads as {} and a stored set survives a restart', async () => {
    await stopServer();
    const again = await startServer(dataDir);
    const cookie = cookieOf(await call(again, 'POST', '/api/login', { body: { login: 'admin', password: 'admin-password-1' } }));
    const got = await call(again, 'GET', `/api/spaces/${trip.id}`, { cookie });
    assert.deepEqual(got.json.space.phases, stored().phases);
    assert.deepEqual((await call(again, 'GET', '/api/spaces/lobby', { cookie })).json.space.phases, {});
    await stopServer();
  });
} finally {
  await stopServer();
  fs.rmSync(base, { recursive: true, force: true });
}

if (failed) {
  console.error(`check-phases: ${failed} of ${n + failed} failed`);
  process.exit(1);
}
console.log(`check-phases: OK (${n} checks)`);
