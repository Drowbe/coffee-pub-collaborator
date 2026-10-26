#!/usr/bin/env node
/*
 * check-live.mjs -- the live register and the live stream (documentation/plans/plan-realtime-optional-livekit.md,
 * step 1, and its Verify section, point 1). First server/live.js on its own, with a clock handed in: the grace after the last
 * stream closes, two tabs, two spaces, `onCall` going with the stream that said it, away and its message, the page
 * heartbeat, and mergeCall (the call service's list merged in for the call and the microphone and camera). Then a
 * throwaway single-environment server (PORT=0, a DATA_DIR under the temp folder, dummy LiveKit keys and no LiveKit
 * server): GET /api/live refuses the signed out (401), a non-member (403), no such space (404) and too many streams
 * (429); two people in one space each see the other in `presence`; away and onCall changes arrive; GET /api/presence
 * and GET /api/status answer from the register; a guest is listed and says away with their stream's id; a person
 * taken out of the space gets `removed` and the stream ends; an aside's stream is for its members only. Asides and the
 * kick on the live stream (step 4, Verify point 4), with no call service answering: POST /api/asides, /recall and /return
 * read who is in the space and on the call from the register; each nudge reaches only its people; a nudge (and a kick)
 * for a stream that is reconnecting arrives when it opens again, within 30 seconds; a kick sends `removed { reason:
 * 'kicked' }`, ends the stream and leaves the space at once.
 * Then chat on the live stream (step 3, Verify point 3; what check-chat-stream and check-guest-chat held), on a second
 * server: a post reaches the other streams with its stored id and its space (a space's stream carries its own chat and
 * the Lobby's, Home's the Lobby's, a guest's their space's); deletes, visibility, Clear... and Delete the chat arrive; a
 * private message never does; a reader without chatRead gets none; pictures are relayed live (type and size checked,
 * never stored, deleted and cleared by their sender); nothing is replayed on a reconnect; the guest limits on posts and
 * open streams (LIVE_STREAMS_PER_PERSON, LIVE_STREAMS_PER_GUEST_LINK) hold, spoofed addresses change nothing, and a guest
 * link turned off or regenerated, or guests turned off, ends a guest's stream at once with `removed`.
 * What can't be checked here: anything that needs a real LiveKit server (the microphone and camera merged from a call,
 * a kick or a mute on a live call, a pull moving people's calls).
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
const { LiveRegister, mergeCall, cleanAwayMessage, NUDGE_HOLD_MS } = require('../server/live.js');
let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n += 1; };
const same = (a, b, msg) => { assert.deepEqual(a, b, msg); n += 1; };

// --- the register on its own ----------------------------------------------------------------------------------------
{
  let t = 1000;
  let ids = 0;
  const reg = new LiveRegister({ now: () => t, makeId: () => `s${(ids += 1)}` });
  const where = (who) => { const p = reg.placeOf(who); return p ? [p.space, p.onCall, p.away, p.awayMessage] : null; };

  const a1 = reg.open({ who: 'al', name: 'Al', space: 'keep' });
  same(where('al'), ['keep', false, false, ''], 'a stream open: in the space');
  same(reg.people('keep'), [{ key: 'al', name: 'Al', guest: false, onCall: false, away: false, awayMessage: '' }], 'listed there');
  ok(reg.onSite('al'), 'a stream open is on the site');

  // Two tabs: onCall said on one stream goes with that stream; away is the person's in that space.
  t += 10;
  const a2 = reg.open({ who: 'al', name: 'Al', space: 'keep' });
  same(reg.set('al', 'keep', { onCall: true }, a1), true, 'onCall on the first tab');
  same(where('al'), ['keep', true, false, ''], 'on the call');
  same(reg.set('al', 'keep', { onCall: true }, a1), false, 'the same word again changes nothing');
  same(reg.close(a2), { who: 'al', space: 'keep', until: 0 }, 'closing the other tab: no grace, the first still holds');
  same(where('al'), ['keep', true, false, ''], 'still on the call');
  same(reg.set('al', 'keep', { away: true, awayMessage: '  back   in five  ' }), true, 'away, with a message');
  same(where('al'), ['keep', true, true, 'back in five'], 'the message is trimmed and its spaces folded');
  same(reg.set('al', 'keep', { away: false }), true, 'back');
  same(where('al'), ['keep', true, false, ''], 'turning away off clears the message');
  same(cleanAwayMessage('x'.repeat(300)).length, 200, 'a message is cut to 200 characters');
  same(reg.set('al', 'tower', { away: true }), null, 'no word for a space they have no stream in');
  same(reg.set('al', 'keep', { onCall: false }, 'nosuch'), null, 'nor for a stream that is not theirs');

  // The last stream closes: still there for the grace, never on the call; then gone.
  reg.set('al', 'keep', { away: true });
  t += 10;
  same(reg.close(a1), { who: 'al', space: 'keep', until: t + 15000 }, 'the last stream: a grace of 15 seconds');
  same(where('al'), ['keep', false, true, ''], 'in the grace: there, off the call, still away');
  ok(reg.isThere('al', 'keep'), 'isThere in the grace');
  same(reg.close(a1), null, 'closing twice is nothing');
  t += 14000;
  ok(reg.placeOf('al'), 'still there a second before the grace ends');
  const back = reg.open({ who: 'al', name: 'Al', space: 'keep' });
  same(where('al'), ['keep', false, true, ''], 'a reload inside the grace keeps their away');
  reg.close(back);
  t += 15001;
  same(where('al'), null, 'after the grace: in no space');
  same(reg.people('keep'), [], 'and no longer listed');
  ok(!reg.onSite('al'), 'nor on the site');
  reg.open({ who: 'al', name: 'Al', space: 'keep' });
  same(where('al'), ['keep', false, false, ''], 'their away went with them');

  // Two spaces: the one opened last; closing it falls back to the other.
  t += 10;
  const b1 = reg.open({ who: 'bo', name: 'Bo', space: 'keep' });
  t += 10;
  const b2 = reg.open({ who: 'bo', name: 'Bo', space: 'tower' });
  same(where('bo')[0], 'tower', 'the space opened last');
  same(reg.people('keep').map((p) => p.key), ['al'], 'not listed in the other');
  reg.close(b2);
  same(where('bo')[0], 'keep', 'closing it: back to the one still open (an open stream beats a grace)');
  reg.close(b1);
  same(where('bo')[0], 'keep', 'the most recent grace');
  t += 15001;
  same(where('bo'), null, 'then nowhere');

  // A page in no space (Home) and the heartbeat: on the site, in no space.
  const home = reg.open({ who: 'cy', name: 'Cy', space: null });
  ok(reg.onSite('cy') && reg.placeOf('cy') === null, 'Home: on the site, in no space');
  same(reg.close(home), { who: 'cy', space: null, until: 0 }, 'closing Home leaves no grace');
  ok(!reg.onSite('cy'), 'then off the site');
  reg.beat('di');
  ok(reg.onSite('di'), 'a heartbeat is on the site');
  t += 75000;
  ok(!reg.onSite('di'), 'for 75 seconds');

  // Guests are listed with their name and guest: true.
  const g = reg.open({ who: 'guest-1', name: 'Vic', guest: true, space: 'keep' });
  same(reg.people('keep').find((p) => p.key === 'guest-1'), { key: 'guest-1', name: 'Vic', guest: true, onCall: false, away: false, awayMessage: '' }, 'a guest');
  reg.close(g);

  // A nudge for a stream that is reconnecting (step 4): kept for 30 seconds while they are in the grace, handed once to
  // the next stream they open there; never for someone not there. A kick's leave() ends the grace at once.
  same(NUDGE_HOLD_MS, 30000, 'a nudge is kept for 30 seconds');
  const h1 = reg.open({ who: 'fa', name: 'Fa', space: 'keep' });
  reg.close(h1);
  ok(reg.hold('fa', 'keep', { type: 'aside-return', spaceId: 'keep' }), 'kept for someone in the grace');
  ok(!reg.hold('fa', 'tower', { type: 'aside-return', spaceId: 'x' }), 'not for a space they are not in');
  ok(!reg.hold('nobody', 'keep', { type: 'aside-pull', spaceId: 'x' }), 'nor for someone not there');
  same(reg.takeHeld('fa', 'tower'), [], 'nothing kept for another space');
  t += 10000;
  same(reg.takeHeld('fa', 'keep'), [{ type: 'aside-return', spaceId: 'keep' }], 'handed to the next stream they open there');
  same(reg.takeHeld('fa', 'keep'), [], 'once');
  ok(reg.hold('fa', 'keep', { type: 'removed', reason: 'kicked' }), 'kept again');
  t += 30000;
  same(reg.takeHeld('fa', 'keep'), [], 'and gone after 30 seconds');
  const h2 = reg.open({ who: 'fa', name: 'Fa', space: 'keep' });
  reg.set('fa', 'keep', { away: true });
  reg.close(h2);
  ok(reg.isThere('fa', 'keep'), 'in the grace');
  reg.leave('fa', 'keep');
  ok(!reg.isThere('fa', 'keep') && reg.placeOf('fa') === null, 'leave(): out at once, no grace');
  ok(!reg.hold('fa', 'keep', { type: 'aside-pull', spaceId: 'x' }), 'and nothing is kept for them');

  // mergeCall: the register's place, the call service's media only for that call.
  const places = new Map([
    ['al', { space: 'keep', onCall: false, since: 5, name: 'Al' }],
    ['bo', { space: 'keep', onCall: true, since: 6, name: 'Bo' }],
    ['cy', { space: 'tower', onCall: false, since: 7, name: 'Cy' }],
  ]);
  const call = [
    { key: 'al', name: 'Al', space: 'keep', call: 'c-keep', joinedAt: 1, inCall: true, micOn: true, cameraOn: true },
    { key: 'cy', name: 'Cy', space: 'keep', call: 'c-keep', joinedAt: 2, inCall: true, micOn: true, cameraOn: false },
    { key: 'ed', name: 'Ed', space: 'tower', call: 'c-tower', joinedAt: 3, inCall: false, micOn: false, cameraOn: false },
  ];
  const m = mergeCall(places, call);
  const of = (k) => { const p = m.get(k); return [p.space, p.inCall, p.micOn, p.cameraOn, p.call]; };
  same(of('al'), ['keep', true, true, true, 'c-keep'], 'on that space\'s call at the call service: on the call, with media');
  same(of('bo'), ['keep', true, false, false, undefined], 'the page\'s word alone: on the call, no media');
  same(of('cy'), ['tower', false, false, false, undefined], 'the register\'s place wins; another space\'s call lends nothing');
  same(of('ed'), ['tower', false, false, false, 'c-tower'], 'someone only the call service has reads as it says');
  same(mergeCall(places, []).get('al').joinedAt, 5, 'no call service: joinedAt is when the stream opened');
}

// --- a started server -----------------------------------------------------------------------------------------------
let dataDir = '';
let child = null;
let port = 0;
let serverOut = '';
// A throwaway server with its own data folder; `env` adds to the settings every run has.
async function startServer(env) {
  dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-live-'));
  serverOut = '';
  child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT,
    env: {
      PATH: process.env.PATH, HOME: process.env.HOME, PORT: '0', DATA_DIR: dataDir,
      LIVEKIT_API_KEY: 'devkey', LIVEKIT_API_SECRET: 'devsecretdevsecret', ADMIN_PASSWORD: 'testpass1234',
      // Nothing listens here: the call service fails fast and answers nobody.
      LIVEKIT_API_URL: 'http://127.0.0.1:9',
      ...env,
    },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  child.stdout.on('data', (d) => { serverOut += d; });
  child.stderr.on('data', (d) => { serverOut += d; });
  port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`the server did not start in time:\n${serverOut}`)); }, 25000);
    const onData = () => { const mm = /listening on :(\d+)/.exec(serverOut); if (mm) { clearTimeout(timer); resolve(Number(mm[1])); } };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`the server stopped (${code}):\n${serverOut}`)); });
  });
}
const stopServer = () => new Promise((resolve) => { if (!child || child.exitCode !== null) return resolve(); child.once('exit', resolve); child.kill('SIGTERM'); });

// A request. `ip` is the X-Forwarded-For a proxy in front would add; `raw` is a body sent as it is, with `type`.
async function call(method, urlPath, { body, cookie, ip, raw, type } = {}) {
  const headers = { accept: 'application/json' };
  if (cookie) headers.cookie = `app_session=${cookie}`;
  if (ip) headers['x-forwarded-for'] = ip;
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (raw !== undefined) headers['content-type'] = type;
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, { method, headers, body: raw !== undefined ? raw : body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, json, text, retryAfter: res.headers.get('retry-after') };
}

// An open stream: `events` collects each event's data (with its `id:` as `_id`); `until(pred)` waits for one that
// matches; `ended` resolves when the server ends it. The second argument is a session cookie, or { cookie, ip }.
async function openStream(urlPath, who) {
  const { cookie, ip } = who && typeof who === 'object' ? who : { cookie: who };
  const headers = {};
  if (cookie) headers.cookie = `app_session=${cookie}`;
  if (ip) headers['x-forwarded-for'] = ip;
  const ctl = new AbortController();
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, { headers, signal: ctl.signal });
  const stream = { status: res.status, type: res.headers.get('content-type') || '', events: [], text: '', close: () => ctl.abort() };
  if (res.status !== 200) {
    stream.text = await res.text();
    try { stream.error = JSON.parse(stream.text).error; } catch { /* not JSON */ }
    return stream;
  }
  const waiters = [];
  stream.ended = (async () => {
    const decoder = new TextDecoder();
    let buf = '';
    try {
      for await (const chunk of res.body) {
        buf += decoder.decode(chunk, { stream: true });
        let at;
        while ((at = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, at).split('\n');
          buf = buf.slice(at + 2);
          const line = block.find((l) => l.startsWith('data: '));
          if (!line) continue;
          const id = block.find((l) => l.startsWith('id: '));
          stream.events.push({ ...JSON.parse(line.slice(6)), _id: id ? Number(id.slice(4)) : null });
          for (const w of [...waiters]) w();
        }
      }
    } catch { /* closed */ }
    return true;
  })();
  stream.until = (pred, ms = 5000) => new Promise((resolve, reject) => {
    const look = () => { const e = [...stream.events].reverse().find(pred); if (e) { clearTimeout(timer); waiters.splice(waiters.indexOf(look), 1); resolve(e); } };
    const timer = setTimeout(() => { waiters.splice(waiters.indexOf(look), 1); reject(new Error(`no such event; got ${JSON.stringify(stream.events)}`)); }, ms);
    waiters.push(look);
    look();
  });
  return stream;
}
const quiet = (ms = 300) => new Promise((r) => setTimeout(r, ms));
const within = (promise, ms) => Promise.race([promise, new Promise((r) => setTimeout(() => r('timeout'), ms))]);
// The last presence event's people as [key, onCall, away, awayMessage, guest].
const lastPeople = (s) => {
  const e = [...s.events].reverse().find((x) => x.type === 'presence');
  return e ? e.people.map((p) => [p.key, p.onCall, p.away, p.awayMessage, p.guest]) : null;
};
const hasPeople = (keys) => (e) => e.type === 'presence' && JSON.stringify(e.people.map((p) => p.key).sort()) === JSON.stringify([...keys].sort());

await startServer({ LIVE_STREAMS_PER_PERSON: '4', LIVE_STREAMS_PER_GUEST_LINK: '5', TRUST_PROXY_HOPS: '0' });
const open = [];
let failed = false;
try {
  const login = async (name, password) => {
    const r = await call('POST', '/api/login', { body: { login: name, password } });
    assert.equal(r.status, 200, `${name} signs in: ${r.text}`);
    return r.json.token;
  };
  const owner = await login('admin', 'testpass1234');
  const streamKey = (await call('GET', '/api/me', { cookie: owner })).json.streamKey;
  const mk = async (loginName, displayName) => (await call('POST', '/api/users', { cookie: owner, body: { login: loginName, displayName, role: 'member', password: 'memberpass1234' } })).json.user;
  const pat = await mk('pat', 'Pat');
  const sam = await mk('sam', 'Sam');
  const lou = await mk('lou', 'Lou');
  const patC = await login('pat', 'memberpass1234');
  const samC = await login('sam', 'memberpass1234');
  const louC = await login('lou', 'memberpass1234');
  const keep = (await call('POST', '/api/spaces', { cookie: owner, body: { name: 'Keep', members: [pat.key, sam.key] } })).json.space;
  const tower = (await call('POST', '/api/spaces', { cookie: owner, body: { name: 'Tower', members: [pat.key] } })).json.space;
  await call('PATCH', `/api/spaces/${keep.id}`, { cookie: owner, body: { members: [pat.key, sam.key] } });
  await call('PATCH', `/api/spaces/${tower.id}`, { cookie: owner, body: { members: [pat.key] } });
  const guestToken = (await call('POST', `/api/spaces/${keep.id}/guest-link`, { cookie: owner, body: {} })).json.space.guestToken;
  const towerGuest = (await call('POST', `/api/spaces/${tower.id}/guest-link`, { cookie: owner, body: {} })).json.space.guestToken;
  const watch = async (p, cookie) => { const s = await openStream(p, cookie); if (s.status === 200) open.push(s); return s; };
  const K = `/api/live?space=${keep.id}`;

  // --- who may listen ------------------------------------------------------------------------------------------
  const refused = async (p, cookie) => { const s = await watch(p, cookie); return [s.status, s.error]; };
  same(await refused(K, null), [401, 'sign in first'], 'signed out: 401');
  same(await refused(K, louC), [403, 'you are not in that space'], 'a non-member: 403');
  same(await refused('/api/live?space=nosuch', patC), [404, 'no such space'], 'no such space: 404');
  same(await refused(`${K}&guest=wrong`, null), [401, 'that guest link is off or wrong'], 'a dead guest link: 401');
  same(await refused(`${K}&guest=${encodeURIComponent(towerGuest)}`, null), [403, 'you are not in that space'], 'another space\'s guest: 403');
  same(await refused(`${K}&s=${encodeURIComponent(streamKey)}`, null), [401, 'sign in first'], 'the access key is not a person: 401');
  same(await refused(`/api/live?guest=${encodeURIComponent(guestToken)}`, null), [400, 'say which space the live stream is for'], 'a guest names their space');

  // --- two people in one space -----------------------------------------------------------------------------------
  const patS = await watch(K, patC);
  same([patS.status, patS.type.startsWith('text/event-stream')], [200, true], 'a member opens the live stream');
  const ready = await patS.until((e) => e.type === 'ready');
  same([ready.you, ready.space, typeof ready.stream, ready._id], [pat.key, keep.id, 'string', 1], 'ready first, numbered, with who, where and the stream');
  await patS.until(hasPeople([pat.key]));
  const samS = await watch(K, samC);
  await samS.until(hasPeople([pat.key, sam.key]));
  await patS.until(hasPeople([pat.key, sam.key]));
  same(lastPeople(samS), [[pat.key, false, false, '', false], [sam.key, false, false, '', false]], 'each sees the other');
  ok(samS.events.find((e) => e.type === 'presence').people.find((p) => p.key === pat.key).name === 'Pat', 'by name');
  const ids = patS.events.map((e) => e._id);
  same(ids, ids.map((_, i) => i + 1), 'every event has the next id');

  // --- away and onCall arrive -----------------------------------------------------------------------------------
  const P = `/api/spaces/${keep.id}/presence`;
  same((await call('PATCH', P, { cookie: patC, body: { away: true, awayMessage: 'brb' } })).json, { ok: true }, 'away answers ok');
  await samS.until((e) => e.type === 'presence' && e.people.some((p) => p.key === pat.key && p.away && p.awayMessage === 'brb'));
  n += 1;
  same((await call('PATCH', P, { cookie: patC, body: { onCall: true, stream: ready.stream } })).status, 200, 'onCall on this stream');
  await samS.until((e) => e.type === 'presence' && e.people.some((p) => p.key === pat.key && p.onCall));
  n += 1;
  const pr = (await call('GET', '/api/presence', { cookie: samC })).json.users.find((u) => u.key === pat.key);
  same([pr.online, pr.present, pr.space, pr.inCall], [true, true, keep.id, true], 'GET /api/presence answers from the register');
  const st = (await call('GET', `/api/status?s=${encodeURIComponent(streamKey)}`)).json.users.find((u) => u.key === pat.key).online;
  same([st.space, st.inCall, st.micOn, st.cameraOn, 'call' in st], [keep.id, true, false, false, false], 'GET /api/status too, with no media and no call name');
  same((await call('GET', '/api/status')).status, 403, 'GET /api/status still needs the access key');

  // --- refusals on the word -------------------------------------------------------------------------------------
  same((await call('PATCH', P, { body: { away: true } })).status, 401, 'signed out: 401');
  same((await call('PATCH', P, { cookie: louC, body: { away: true } })).status, 403, 'a non-member: 403');
  same((await call('PATCH', P, { cookie: patC, body: {} })).json, { error: 'say away, awayMessage or onCall' }, 'nothing to say: 400');
  same((await call('PATCH', P, { cookie: patC, body: { away: 'yes' } })).status, 400, 'away must be true or false');
  const noStream = await call('PATCH', `/api/spaces/${tower.id}/presence`, { cookie: patC, body: { away: true } });
  same([noStream.status, noStream.json.error], [409, 'open the space first; there is no live stream of yours there'], 'no stream there: 409');
  same((await call('PATCH', P, { cookie: samC, body: { onCall: true, stream: ready.stream } })).status, 409, 'another person\'s stream: 409');

  // --- two tabs; the call's word goes with its stream --------------------------------------------------------------
  const pat2 = await watch(K, patC);
  await pat2.until((e) => e.type === 'ready');
  pat2.close();
  await quiet();
  same(lastPeople(samS).find((p) => p[0] === pat.key).slice(0, 3), [pat.key, true, true], 'closing the other tab: still on the call');
  patS.close();
  await samS.until((e) => e.type === 'presence' && e.people.some((p) => p.key === pat.key && !p.onCall));
  same(lastPeople(samS).map((p) => p[0]), [pat.key, sam.key], 'closing the last: still there (the grace), off the call');
  const graced = (await call('GET', '/api/presence', { cookie: samC })).json.users.find((u) => u.key === pat.key);
  same([graced.space, graced.inCall], [keep.id, false], 'and so in GET /api/presence');

  // --- two spaces: the one opened last ---------------------------------------------------------------------------
  const patK = await watch(K, patC);
  await samS.until(hasPeople([pat.key, sam.key]));
  const patT = await watch(`/api/live?space=${tower.id}`, patC);
  await patT.until(hasPeople([pat.key]));
  await samS.until(hasPeople([sam.key]));
  n += 1;
  same((await call('GET', '/api/presence', { cookie: samC })).json.users.find((u) => u.key === pat.key).space, null, 'Pat is in the Tower now, which Sam can\'t see');

  // --- caps: four at most for one person (LIVE_STREAMS_PER_PERSON=4) ---------------------------------------------
  const home = await watch('/api/live', patC);
  same((await home.until((e) => e.type === 'ready')).space, null, 'Home: a stream in no space');
  const fourth = await watch(K, patC);
  same(fourth.status, 200, 'the fourth');
  same(await refused(K, patC), [429, 'you have too many live streams open (4 at most); close one and try again'], 'the fifth is refused');
  same((await call('GET', `/api/spaces/${keep.id}/chat/stream`, { cookie: patC })).status, 404, 'the old chat stream route is gone');
  home.close();
  fourth.close();
  await quiet();
  const again = await watch(K, patC);
  same(again.status, 200, 'a closed stream frees its place');
  again.close();
  patT.close();
  patK.close();

  // --- a guest ---------------------------------------------------------------------------------------------------
  // A guest enters with a name (POST /api/guest-join) and opens the stream with the pass it answers.
  const passFor = async (token, name) => (await call('POST', '/api/guest-join', { body: { token, name } })).json.guest.pass;
  const G0 = `${K}&guest=${encodeURIComponent(guestToken)}`;
  same(await refused(G0, null), [403, 'that guest pass is not valid; enter again'], 'a guest with no pass: 403');
  const G = `${G0}&pass=${encodeURIComponent(await passFor(guestToken, 'Vic'))}`;
  const guest = await watch(G, null);
  const gReady = await guest.until((e) => e.type === 'ready');
  ok(/^guest-/.test(gReady.you), 'a guest gets an id of their own');
  await samS.until((e) => e.type === 'presence' && e.people.some((p) => p.key === gReady.you && p.name === 'Vic' && p.guest));
  n += 1;
  same((await call('PATCH', `${P}?guest=${encodeURIComponent(guestToken)}`, { body: { away: true } })).status, 409, 'a guest names their stream');
  same((await call('PATCH', `${P}?guest=${encodeURIComponent(guestToken)}`, { body: { away: true, stream: gReady.stream } })).json, { ok: true }, 'and says away with it');
  await samS.until((e) => e.type === 'presence' && e.people.some((p) => p.key === gReady.you && p.away));
  n += 1;
  // LIVE_STREAMS_PER_GUEST_LINK=5: one address gets 2 of them.
  const g2 = await watch(G, null);
  same(g2.status, 200, 'a second from one address');
  same(await refused(G, null), [429, 'you have too many live streams open (2 at most); close one and try again'], 'a guest address\'s cap');
  g2.close();
  guest.close();

  // --- the guest pass and the call's token (step 5) ------------------------------------------------------------------
  // POST /api/guest-join hands a guest their pass; the live stream knows them by it, and the call's token is minted only
  // by POST /api/call/join, for the same id.
  const claims = (jwt) => JSON.parse(Buffer.from(jwt.split('.')[1], 'base64url').toString('utf8'));
  const gj = await call('POST', '/api/guest-join', { body: { token: guestToken, name: 'Wren' } });
  same([gj.status, gj.json.spaceId, gj.json.guest.name, /^guest-/.test(gj.json.guest.id), typeof gj.json.guest.pass], [200, keep.id, 'Wren', true, 'string'], 'guest-join answers the guest pass');
  const passed = await watch(`${G0}&pass=${encodeURIComponent(gj.json.guest.pass)}`, null);
  same((await passed.until((e) => e.type === 'ready')).you, gj.json.guest.id, 'the stream knows a guest by their pass');
  await samS.until((e) => e.type === 'presence' && e.people.some((p) => p.key === gj.json.guest.id && p.name === 'Wren'));
  n += 1;
  const forged = gj.json.guest.pass.replace(/^[^.]+/, Buffer.from(JSON.stringify({ id: 'guest-someone', name: 'Wren' })).toString('base64url'));
  same(await refused(`${G0}&pass=${encodeURIComponent(forged)}`, null), [403, 'that guest pass is not valid; enter again'], 'a pass changed by hand: 403');
  same(await refused(`${K}&guest=${encodeURIComponent(towerGuest)}&pass=${encodeURIComponent(gj.json.guest.pass)}`, null), [403, 'you are not in that space'], 'nor with another link');
  const gCall = await call('POST', '/api/call/join', { body: { guest: guestToken, pass: gj.json.guest.pass } });
  same([gCall.status, claims(gCall.json.token).sub, claims(gCall.json.token).name, typeof gCall.json.livekitUrl], [200, gj.json.guest.id, 'Wren', 'string'], 'the guest\'s call token is for the id on their pass');
  passed.close();
  const mCall = await call('POST', '/api/call/join', { cookie: samC, body: { space: keep.id } });
  same([mCall.status, claims(mCall.json.token).sub, typeof mCall.json.call], [200, sam.key, 'string'], 'a member\'s call token');
  same((await call('POST', '/api/call/join', { cookie: louC, body: { space: keep.id } })).status, 403, 'not a member: no token');

  // --- asides and the kick on the live stream (step 4; the Verify section, point 4) ------------------------------
  // No LiveKit answers here: who is in the space and on the call is the register's, and every nudge goes on the stream.
  const readyOf = async (s) => (await s.until((e) => e.type === 'ready')).stream;
  const say = (cookie, space, body) => call('PATCH', `/api/spaces/${space}/presence`, { cookie, body });
  const nudges = (s, type) => s.events.filter((e) => e.type === type);
  // Close `key`'s stream `s`, which said it is on the call, and wait until the server has seen it close: `watcher`, another
  // stream in that space, hears them on the call, then not (the call's word goes with the stream; the grace keeps them
  // there, or a stream of theirs open in another space takes them there).
  const onCallIn = (watcher, key, on) => (e) => e.type === 'presence' && e.people.some((p) => p.key === key && p.onCall === on);
  // `mark` is the watcher's event count before the person was last said to be there on the call.
  const closeSeen = async (s, watcher, key, mark) => {
    await watcher.until((e) => onCallIn(watcher, key, true)(e) && watcher.events.indexOf(e) >= mark);
    const from = watcher.events.length;
    s.close();
    await watcher.until((e) => e.type === 'presence' && !onCallIn(watcher, key, true)(e) && watcher.events.indexOf(e) >= from);
  };
  const ownerKey = (await call('GET', '/api/me', { cookie: owner })).json.user.key;
  const ownerS = await watch(K, owner);
  const ownerSt = await readyOf(ownerS);
  const patA = await watch(K, patC);
  const patASt = await readyOf(patA);
  const samSt = samS.events.find((e) => e.type === 'ready').stream;
  const pull = (cookie, body) => call('POST', '/api/asides', { cookie, body });
  same((await pull(owner, { with: [sam.key] })).json, { error: 'you need to be in a call yourself to pull someone aside' }, 'pulling off the call (as the register says): 400');
  same((await say(owner, keep.id, { onCall: true, stream: ownerSt })).status, 200);
  const offCall = await pull(owner, { with: [sam.key] });
  same([offCall.status, offCall.json.error], [409, 'Sam is not in the conference right now'], 'someone in the space but off the call: 409');
  const away = await pull(owner, { with: [lou.key] });
  same([away.status, away.json.error], [404, 'Lou is not with you right now'], 'someone not in the space: 404');
  same((await say(samC, keep.id, { onCall: true, stream: samSt })).status, 200);
  const pulled = await pull(owner, { with: [sam.key] });
  same(pulled.status, 200, `the owner pulls Sam, both on the call by the register, with no call service: ${pulled.text}`);
  const a1 = pulled.json.aside.id;
  const gotPull = await samS.until((e) => e.type === 'aside-pull');
  same([gotPull.spaceId, gotPull.byOwner, gotPull.private, typeof gotPull.from], [a1, true, false, 'string'], 'aside-pull reaches the one pulled, on their stream');
  for (const s of [patA, ownerS, samS]) same((await s.until((e) => e.type === 'aside-started')).members, [ownerKey, sam.key], 'aside-started reaches everyone in the space, with who went');
  await quiet();
  same([nudges(patA, 'aside-pull').length, nudges(ownerS, 'aside-pull').length], [0, 0], 'aside-pull reaches nobody else');

  // Both in the aside; Sam's stream drops, the owner goes back: Sam's aside-return comes when it opens again.
  const ownerX = await watch(`/api/live?space=${a1}`, owner);
  await readyOf(ownerX);
  const samMark = ownerX.events.length;
  const samX = await watch(`/api/live?space=${a1}`, samC);
  same((await say(samC, a1, { onCall: true, stream: await readyOf(samX) })).status, 200, 'on the aside\'s call');
  await closeSeen(samX, ownerX, sam.key, samMark);
  const back = await call('POST', '/api/asides/return', { cookie: owner });
  same([back.status, back.json.space.id], [200, keep.id], 'returning from the aside answers the space it came from');
  const sentAt = Date.now();
  const samX2 = await watch(`/api/live?space=${a1}`, samC);
  const late = await samX2.until((e) => e.type === 'aside-return', 30000);
  same(late.spaceId, keep.id, 'a nudge for a reconnecting stream arrives when it opens again');
  ok(Date.now() - sentAt < 30000, 'within 30 seconds');
  same(nudges(ownerX, 'aside-return').length, 0, 'the one returning is not nudged');
  same((await call('POST', '/api/asides/return', { cookie: patC })).json, { error: 'you are not in an aside' }, 'returning from no aside: 400');
  samX2.close();
  ownerX.close();
  await quiet();

  // A private conversation from the Keep; the owner there recalls it: only its members hear.
  same((await say(patC, keep.id, { onCall: true, stream: patASt })).status, 200);
  const priv = await pull(patC, { with: [sam.key], private: true });
  same(priv.status, 200, `a member starts a private conversation: ${priv.text}`);
  const a2 = priv.json.aside.id;
  const privPull = await samS.until((e) => e.type === 'aside-pull' && e.spaceId === a2);
  same([privPull.byOwner, privPull.private], [false, true], 'a peer\'s private pull asks first');
  same(Object.keys(await ownerS.until((e) => e.type === 'aside-started' && e.spaceId === a2)).filter((k) => k !== '_id').sort(), ['private', 'spaceId', 'type'], 'a private aside-started names nobody');
  const patY = await watch(`/api/live?space=${a2}`, patC);
  await readyOf(patY);
  const samY = await watch(`/api/live?space=${a2}`, samC);
  await readyOf(samY);
  same((await call('POST', '/api/asides/recall', { cookie: patC })).status, 403, 'recall is the owners\'');
  same((await call('POST', '/api/asides/recall', { cookie: owner })).json, { recalled: 1 }, 'the owner in the Keep recalls');
  for (const s of [patY, samY]) same((await s.until((e) => e.type === 'aside-recall')).spaceId, keep.id, 'aside-recall reaches the conversation\'s members');
  await quiet();
  same([nudges(ownerS, 'aside-recall').length, nudges(patA, 'aside-recall').length, nudges(samS, 'aside-recall').length], [0, 0, 0], 'and nobody outside it');

  // The kick: out of the call and the space; the stream ends. A member without Can Kick is refused.
  const refusedKick = await call('POST', `/api/users/${sam.key}/kick`, { cookie: patC });
  same([refusedKick.status, refusedKick.json.error], [403, 'not allowed'], 'a member without Can Kick: 403');
  same((await call('POST', `/api/users/${lou.key}/kick`, { cookie: owner })).json, { error: 'they are not in a space right now' }, 'kicking someone in no space: 404');
  same((await call('POST', `/api/users/${sam.key}/kick`, { cookie: owner })).json, { ok: true }, 'the owner kicks Sam, with no call service');
  same((await samY.until((e) => e.type === 'removed')).reason, 'kicked', 'Sam\'s stream there gets removed { reason: kicked }');
  same(await within(samY.ended, 2000), true, 'and ends');
  same((await patY.until((e) => e.type === 'presence' && !e.people.some((p) => p.key === sam.key))).people.map((p) => p.key), [pat.key], 'Sam is out of it at once, with no grace');
  ok(!samS.ended || samS.events.at(-1).type !== 'removed', 'the stream of another space of theirs stays');
  // A kick for someone whose stream is reconnecting comes when it opens again. Pat's aside stream closes, so the Keep's
  // (on the call) is where Pat is; then that one closes too.
  const patMark = ownerS.events.length;
  patY.close();
  await closeSeen(patA, ownerS, pat.key, patMark);
  same((await call('POST', `/api/users/${pat.key}/kick`, { cookie: owner })).json, { ok: true }, 'kicking Pat in the grace');
  const patBack = await watch(K, patC);
  same((await patBack.until((e) => e.type === 'removed')).reason, 'kicked', 'the kick arrives when Pat\'s stream opens again');
  same(await within(patBack.ended, 2000), true, 'and ends it');
  ok((await call('GET', '/api/presence', { cookie: owner })).json.users.find((u) => u.key === pat.key).space !== keep.id, 'Pat is out of the Keep at once');
  ownerS.close();
  ok(!/listener failed/.test(serverOut), `no listener failed:\n${serverOut}`);

  // --- the access no longer holding: removed, and the stream ends ------------------------------------------------
  await call('PATCH', `/api/spaces/${keep.id}`, { cookie: owner, body: { members: [pat.key] } });
  const removed = await samS.until((e) => e.type === 'removed', 4000);
  same([removed.reason, removed.error], ['access', 'you are not in that space'], 'Sam taken out of the Keep: removed, saying why');
  same(await Promise.race([samS.ended, quiet(2000).then(() => false)]), true, 'and the stream ends');

  // --- an aside: its members only ----------------------------------------------------------------------------------
  const patH = await watch('/api/live', patC); // on the site, so an invitation reaches them
  await patH.until((e) => e.type === 'ready');
  const inv = await call('POST', '/api/asides/invite', { cookie: samC, body: { to: pat.key } });
  same(inv.status, 200, `an invitation to Pat, who is on the site through the live stream: ${inv.text}`);
  const asideId = inv.json.aside.id;
  const inAside = await watch(`/api/live?space=${asideId}`, samC);
  await inAside.until(hasPeople([sam.key]));
  n += 1;
  same(await refused(`/api/live?space=${asideId}`, louC), [403, 'you are not in that space'], 'not a member of the aside: 403');
  same((await call('PATCH', `/api/spaces/${asideId}/presence`, { cookie: samC, body: { away: true } })).status, 200, 'away in an aside');
  inAside.close();
  patH.close();

  // The heartbeat still answers.
  same((await call('POST', '/api/presence', { cookie: louC })).json, { ok: true }, 'POST /api/presence');
  ok(!/listener failed/.test(serverOut), `no listener failed:\n${serverOut}`);
} catch (err) {
  failed = true;
  console.error(`FAIL ${err.stack || err}`);
} finally {
  for (const s of open.splice(0)) s.close();
  await stopServer();
  fs.rmSync(dataDir, { recursive: true, force: true });
}

// --- chat on the live stream (step 3; the Verify section, point 3) ---------------------------------------------------
// A second server, with small guest limits so the check runs quickly (GUEST_CHAT_POSTS_PER_MINUTE=10, so 5 an address;
// LIVE_STREAMS_PER_GUEST_LINK=5, so 2 an address; LIVE_STREAMS_PER_PERSON left at its default, 50), a 10 KB picture cap
// (CHAT_PICTURE_MAX_MB=0.01), and TRUST_PROXY_HOPS=1: this check is the one proxy in front, so an address is told as the
// proxy would, the rightmost X-Forwarded-For entry, and a client's own spoofed entries go to its left.
const PNG = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(40, 7)]);
if (!failed) {
  await startServer({ GUEST_CHAT_POSTS_PER_MINUTE: '10', LIVE_STREAMS_PER_GUEST_LINK: '5', TRUST_PROXY_HOPS: '1', CHAT_PICTURE_MAX_MB: '0.01' });
  try {
    const login = async (name, password) => {
      const r = await call('POST', '/api/login', { body: { login: name, password } });
      assert.equal(r.status, 200, `${name} signs in: ${r.text}`);
      return r.json.token;
    };
    const owner = await login('admin', 'testpass1234');
    const mk = async (loginName, displayName) => (await call('POST', '/api/users', { cookie: owner, body: { login: loginName, displayName, role: 'member', password: 'memberpass1234' } })).json.user;
    const pat = await mk('pat', 'Pat');
    const sam = await mk('sam', 'Sam');
    await mk('tab', 'Tab');
    const patC = await login('pat', 'memberpass1234');
    const samC = await login('sam', 'memberpass1234');
    const tabC = await login('tab', 'memberpass1234');
    const trip = (await call('POST', '/api/spaces', { cookie: owner, body: { name: 'Trip', members: [pat.key, sam.key] } })).json.space;
    await call('PATCH', `/api/spaces/${trip.id}`, { cookie: owner, body: { members: [pat.key, sam.key] } });
    const L = '/api/spaces/lobby/chat';
    const T = `/api/spaces/${trip.id}/chat`;
    const LT = `/api/live?space=${trip.id}`;
    const watch = async (p, who) => { const s = await openStream(p, who); if (s.status === 200) open.push(s); return s; };
    let lobbyToken = (await call('POST', '/api/spaces/lobby/guest-link', { cookie: owner, body: {} })).json?.space?.guestToken;
    const tripToken = (await call('POST', `/api/spaces/${trip.id}/guest-link`, { cookie: owner, body: {} })).json?.space?.guestToken;
    ok(lobbyToken && tripToken, 'guest links made');
    const g = (token) => `guest=${encodeURIComponent(token)}`;
    // A guest's stream carries their pass (POST /api/guest-join), one per link, made as it is first asked for.
    const passes = new Map();
    const pass = async (token, name = 'Vic') => {
      if (!passes.has(token)) passes.set(token, (await call('POST', '/api/guest-join', { body: { token, name } })).json?.guest?.pass || 'none');
      return `pass=${encodeURIComponent(passes.get(token))}`;
    };
    const LG = async (token) => `/api/live?space=lobby&${g(token)}&${await pass(token)}`;
    const chatOf = (s, id) => s.events.filter((e) => e.id === id && /^chat/.test(e.type));

    // --- who hears which chat --------------------------------------------------------------------------------------
    // Home's stream (no space) carries the Lobby's chat; a space's stream carries its own and the Lobby's; a guest's
    // stream carries their space's only (the Lobby's guest: the Lobby's).
    const patHome = await watch('/api/live', patC);
    const bossHome = await watch('/api/live', owner);
    const patTrip = await watch(LT, patC);
    const samTrip = await watch(LT, samC);
    const lobbyGuest = await watch(await LG(lobbyToken), { ip: '10.0.0.1' });
    const tripGuest = await watch(`${LT}&${g(tripToken)}&${await pass(tripToken, 'Tia')}`, { ip: '10.0.0.20' });
    for (const s of [patHome, bossHome, patTrip, samTrip, lobbyGuest, tripGuest]) {
      same(s.status, 200, 'an allowed reader is in');
      await s.until((e) => e.type === 'ready');
    }
    same((await call('GET', `${L}?${g(lobbyToken)}`, { ip: '10.0.0.9' })).status, 200, "the Lobby's guest reads its history");

    const posted = await call('POST', L, { cookie: samC, body: { text: 'hello from Home https://example.com/a' } });
    same(posted.status, 200, posted.text);
    const lm = posted.json.message;
    for (const s of [patHome, bossHome, patTrip, samTrip, lobbyGuest]) {
      const e = await s.until((x) => x.type === 'chat' && x.id === lm.id);
      same([e.space, e.text, e.who, e.by, e.at], ['lobby', lm.text, 'Sam', sam.key, lm.at], 'a Lobby post reaches every reader of the Lobby, as stored, with its space');
      same(e.preview, { url: 'https://example.com/a' }, 'with its link');
    }
    const tp = (await call('POST', T, { cookie: patC, body: { text: 'trip talk' } })).json.message;
    for (const s of [samTrip, patTrip, tripGuest]) same((await s.until((x) => x.type === 'chat' && x.id === tp.id)).space, trip.id, "a space's post reaches its streams (the sender's own too)");
    await quiet();
    ok(!patHome.events.some((e) => e.id === tp.id) && !lobbyGuest.events.some((e) => e.id === tp.id), "Home's stream and the Lobby's guest hear nothing of the Trip");
    ok(!tripGuest.events.some((e) => e.id === lm.id), "another space's guest hears nothing of the Lobby");

    // --- delete, visibility, clear, a private message --------------------------------------------------------------
    const m2 = (await call('POST', T, { cookie: samC, body: { text: 'second' } })).json.message;
    await patTrip.until((x) => x.id === m2.id);
    same((await call('PATCH', `${T}/${m2.id}`, { cookie: samC, body: { visibility: 'private' } })).status, 200);
    const priv = await patTrip.until((x) => x.type === 'chat-visibility' && x.id === m2.id && x.visibility === 'private');
    same([priv.space, priv.message], [trip.id, undefined], 'made private: only the id');
    same((await call('PATCH', `${T}/${m2.id}`, { cookie: samC, body: { visibility: 'public' } })).status, 200);
    same((await patTrip.until((x) => x.type === 'chat-visibility' && x.visibility === 'public' && x.id === m2.id)).message.text, 'second', 'made public again: with the message');
    same((await call('DELETE', `${T}/${m2.id}`, { cookie: samC })).status, 200);
    await tripGuest.until((x) => x.type === 'chat-delete' && x.id === m2.id);
    n += 1;
    const before = patTrip.events.length;
    await call('POST', `/api/spaces/${trip.id}/command`, { cookie: samC, body: { name: 'zzzz', text: 'private echo' } });
    await quiet();
    ok(!patTrip.events.slice(before).some((e) => e.type === 'chat'), 'a private message is never sent');
    const m3 = (await call('POST', T, { cookie: samC, body: { text: 'third' } })).json.message;
    await patTrip.until((x) => x.id === m3.id);
    same((await call('DELETE', `${T}/messages?type=chat&scope=everyone`, { cookie: owner })).status, 200);
    same((await patTrip.until((x) => x.type === 'chat-clear-some' && x.ids.includes(m3.id))).scope, 'everyone', 'Clear... arrives');
    same((await call('DELETE', T, { cookie: owner })).status, 200);
    await samTrip.until((x) => x.type === 'chat-clear' && x.space === trip.id);
    n += 1;

    // --- a reader without chatRead gets none --------------------------------------------------------------------------
    same((await call('PATCH', '/api/roles/member', { cookie: owner, body: { chatRead: false } })).status, 200, 'members may no longer read the chat');
    const bossTrip = await watch(LT, owner);
    await bossTrip.until((e) => e.type === 'ready');
    const unseen = (await call('POST', T, { cookie: owner, body: { text: 'for readers only' } })).json.message;
    await bossTrip.until((x) => x.type === 'chat' && x.id === unseen.id);
    await quiet();
    same([chatOf(samTrip, unseen.id).length, chatOf(patHome, unseen.id).length], [0, 0], 'a member without chatRead hears none of it');
    same((await call('GET', T, { cookie: samC })).status, 403, 'nor reads the history');
    ok(samTrip.events.at(-1).type !== 'removed', 'and stays in the space: being there is the stream\'s test');
    same((await call('PATCH', '/api/roles/member', { cookie: owner, body: { chatRead: true } })).status, 200);
    const seen = (await call('POST', T, { cookie: owner, body: { text: 'back' } })).json.message;
    await samTrip.until((x) => x.type === 'chat' && x.id === seen.id);
    ok(true, 'given back, the next message arrives');
    bossTrip.close();

    // --- pictures: relayed live, never stored ------------------------------------------------------------------------
    const P = `${T}/pictures`;
    const pic = await call('POST', `${P}?file=map.png`, { cookie: patC, raw: PNG, type: 'image/png' });
    same(pic.status, 200, pic.text);
    ok(/^[a-f0-9]{12}$/.test(pic.json.id), 'answers the picture\'s id');
    for (const s of [samTrip, tripGuest, patTrip]) {
      const e = await s.until((x) => x.type === 'chat-picture' && x.id === pic.json.id);
      same([e.space, e.by, e.who, e.file, e.mime, Buffer.from(e.data, 'base64').equals(PNG)], [trip.id, pat.key, 'Pat', 'map.png', 'image/png', true], 'a picture reaches the space, as sent');
    }
    await quiet();
    ok(!patHome.events.some((e) => e.type === 'chat-picture'), 'and nowhere else');
    ok(!(await call('GET', T, { cookie: samC })).json.messages.some((m) => m.id === pic.json.id), 'never stored');
    same((await call('POST', P, { cookie: patC, raw: Buffer.from('not a picture at all'), type: 'image/png' })).json, { error: 'that is not a PNG, JPEG, GIF or WebP picture' }, 'bytes that are not a picture: 415');
    same((await call('POST', P, { cookie: patC, raw: PNG, type: 'image/jpeg' })).status, 415, 'nor a PNG sent as a JPEG');
    same((await call('POST', P, { cookie: patC, raw: Buffer.from('<svg/>'), type: 'image/svg+xml' })).json, { error: 'send a PNG, JPEG, GIF or WebP picture' }, 'another type: 415');
    const big = await call('POST', P, { cookie: patC, raw: Buffer.concat([PNG, Buffer.alloc(11 * 1024)]), type: 'image/png' });
    same([big.status, big.json.error], [413, 'that picture is over 10 KB'], 'over the cap (CHAT_PICTURE_MAX_MB): 413');
    const gpic = await call('POST', `${P}?${g(tripToken)}&name=Tia`, { ip: '10.0.0.20', raw: PNG, type: 'image/png' });
    same([gpic.status, (await samTrip.until((x) => x.type === 'chat-picture' && x.id === gpic.json.id)).who], [200, 'Tia'], 'a guest sends one, by the name they gave');
    same((await call('POST', `/api/spaces/lobby/chat/pictures?${g(tripToken)}`, { ip: '10.0.0.20', raw: PNG, type: 'image/png' })).status, 403, 'not into another space');
    same((await call('DELETE', `${T}/${pic.json.id}`, { cookie: samC })).json, { error: 'you can only delete a message you sent' }, 'someone else\'s picture can\'t be deleted');
    same((await call('DELETE', `${T}/${pic.json.id}`, { cookie: patC })).status, 200, 'its sender deletes it');
    await samTrip.until((x) => x.type === 'chat-delete' && x.id === pic.json.id);
    n += 1;
    same((await call('DELETE', `${T}/${pic.json.id}`, { cookie: patC })).status, 404, 'once');
    const pic2 = (await call('POST', P, { cookie: patC, raw: PNG, type: 'image/png' })).json.id;
    await samTrip.until((x) => x.id === pic2);
    same((await call('DELETE', `${T}/messages?type=chat&scope=mine`, { cookie: patC })).status, 200);
    same((await samTrip.until((x) => x.type === 'chat-clear-some' && x.by === pat.key)).ids, [], 'clearing only pictures is told too (the pages take them by the rule)');
    same((await call('DELETE', `${T}/${pic2}`, { cookie: patC })).status, 404, 'and the cleared picture is gone');

    // --- a reconnect: nothing replayed, the history whole --------------------------------------------------------------
    patHome.close();
    const kept = (await call('POST', L, { cookie: samC, body: { text: 'while away' } })).json.message;
    const again = await watch('/api/live', patC);
    await again.until((e) => e.type === 'ready');
    ok(!again.events.some((e) => e.id === kept.id), 'nothing is replayed');
    ok((await call('GET', L, { cookie: patC })).json.messages.some((m) => m.id === kept.id), 'the history has what was missed');
    const next = (await call('POST', L, { cookie: samC, body: { text: 'after' } })).json.message;
    await again.until((e) => e.type === 'chat' && e.id === next.id);
    n += 1;

    // --- the Lobby's guest posts in the Lobby, and nowhere else --------------------------------------------------------
    const guestPost = await call('POST', `${L}?${g(lobbyToken)}`, { ip: '10.0.0.1', body: { name: 'Vic', text: 'hello from a guest' } });
    same([guestPost.status, guestPost.json.message.by, guestPost.json.message.who], [200, 'guest', 'Vic'], 'kept as a guest, with their name');
    await lobbyGuest.until((e) => e.type === 'chat' && e.id === guestPost.json.message.id);
    await again.until((e) => e.type === 'chat' && e.id === guestPost.json.message.id);
    ok(true, "the guest's own message comes back on their stream, and reaches Home");
    for (const [what, r] of [
      ['history', await call('GET', `${T}?${g(lobbyToken)}`, { ip: '10.0.0.9' })],
      ['post', await call('POST', `${T}?${g(lobbyToken)}`, { ip: '10.0.0.9', body: { name: 'Vic', text: 'sneaking in' } })],
      ['stream', await watch(`${LT}&${g(lobbyToken)}`, { ip: '10.0.0.9' })],
    ]) {
      same(r.status, 403, `another space's ${what} is refused to the Lobby's guest`);
      ok(/not in that/.test(r.error || r.json?.error), 'with one plain sentence');
    }
    same((await call('POST', `${L}?${g(tripToken)}`, { ip: '10.0.0.9', body: { name: 'Tia', text: 'wrong place' } })).status, 403, "another space's guest can't post in the Lobby");
    const dead = await call('POST', `${L}?guest=nosuchtoken0000000000`, { ip: '10.0.0.9', body: { name: 'X', text: 'x' } });
    same([dead.status, dead.json.error], [401, 'that guest link is off or wrong'], 'a token that names no space says so');

    // --- the length cap (as for everyone: cut at 1000 characters; the request body is at most 64 KB) ---------------------
    const long = await call('POST', `${T}?${g(tripToken)}`, { ip: '10.0.0.5', body: { name: 'V'.repeat(80), text: 'a'.repeat(5000) } });
    same([long.status, long.json.message.text.length, long.json.message.who.length], [200, 1000, 40], "a guest's long message is cut to 1000 characters, the name to 40");
    same((await call('POST', `${T}?${g(tripToken)}`, { ip: '10.0.0.5', body: { name: 'V', text: 'a'.repeat(70 * 1024) } })).status, 413, 'a body over 64 KB is refused');

    // --- guest posts: per address (half the link's) and per guest link --------------------------------------------------
    // 10.0.0.1 has posted once with the Lobby's link (above): four more, then the sixth in the minute is refused as the
    // address's, though the link has five left.
    for (let i = 0; i < 4; i += 1) same((await call('POST', `${L}?${g(lobbyToken)}`, { ip: '10.0.0.1', body: { name: 'Vic', text: `post ${i}` } })).status, 200);
    const limited = await call('POST', `${L}?${g(lobbyToken)}`, { ip: '10.0.0.1', body: { name: 'Vic', text: 'one too many' } });
    same(limited.status, 429, 'the sixth guest post in a minute from one address is refused');
    same(limited.json.error.replace(/\d+ seconds?$/, 'N seconds'), 'Guests can post 5 messages a minute from one address; try again in N seconds', 'with one plain sentence');
    ok(Number(limited.retryAfter) >= 1 && Number(limited.retryAfter) <= 60, `with Retry-After (${limited.retryAfter})`);
    for (let i = 0; i < 5; i += 1) {
      const spoofed = await call('POST', `${L}?${g(lobbyToken)}`, { ip: `203.0.113.${i + 1}, 10.0.0.1`, body: { name: 'Vic', text: `spoof ${i}` } });
      same(spoofed.status, 429, `a spoofed X-Forwarded-For (${i + 1}) does not raise the address's limit`);
    }
    same((await call('POST', `${T}?${g(tripToken)}`, { ip: '10.0.0.1', body: { name: 'Vic', text: 'other link' } })).status, 429, 'the address is limited with another guest link too');
    for (let i = 0; i < 5; i += 1) same((await call('POST', `${L}?${g(lobbyToken)}`, { ip: '10.0.0.2', body: { name: 'Ann', text: `from elsewhere ${i}` } })).status, 200, 'another address on the link still posts');
    const linkLimited = await call('POST', `${L}?${g(lobbyToken)}`, { ip: '10.0.0.3', body: { name: 'Bo', text: 'link is full' } });
    same(linkLimited.status, 429, "the guest link's minute is spent");
    same(linkLimited.json.error.replace(/\d+ seconds?$/, 'N seconds'), 'Guests can post 10 messages a minute; try again in N seconds', 'with one plain sentence');
    same((await call('POST', `${T}?${g(tripToken)}`, { ip: '10.0.0.3', body: { name: 'Tia', text: 'fresh' } })).status, 200, 'another link from another address is not');
    for (let i = 0; i < 6; i += 1) same((await call('POST', L, { cookie: patC, body: { text: `member ${i}` } })).status, 200, 'members are not under the guest limit');

    // --- open streams: a signed-in person (one a tab, 50 at most) ---------------------------------------------------------
    const tabs = [];
    for (let i = 0; i < 50; i += 1) tabs.push(await watch('/api/live', tabC));
    ok(tabs.every((t) => t.status === 200), 'a member opens up to 50');
    same(await (async () => { const s = await watch('/api/live', tabC); return [s.status, s.error]; })(), [429, 'you have too many live streams open (50 at most); close one and try again'], 'the 51st is refused');
    for (const t of tabs) t.close();
    await quiet();
    same((await watch('/api/live', tabC)).status, 200, 'a closed stream frees its place');

    // --- open streams: a guest address (40% of the link's, here 2) and the guest link (5) --------------------------------
    // The Lobby's guest at 10.0.0.1 holds one already (lobbyGuest): one more there, the third refused as the address's.
    same((await watch(await LG(lobbyToken), { ip: '10.0.0.1' })).status, 200);
    const gFull = await watch(await LG(lobbyToken), { ip: '10.0.0.1' });
    same([gFull.status, gFull.error], [429, 'you have too many live streams open (2 at most); close one and try again'], "a guest address's own cap");
    for (let i = 0; i < 3; i += 1) same((await watch(await LG(lobbyToken), { ip: `198.51.100.${i + 1}, 10.0.0.1` })).status, 429, `a spoofed X-Forwarded-For (${i + 1}) does not open another stream`);
    same((await watch(await LG(lobbyToken), { ip: '10.0.0.2' })).status, 200, 'another address on the link');
    same((await watch(await LG(lobbyToken), { ip: '10.0.0.2' })).status, 200, 'its second');
    same((await watch(await LG(lobbyToken), { ip: '10.0.0.4' })).status, 200, 'a third address: the fifth of the link');
    const linkFull = await watch(await LG(lobbyToken), { ip: '10.0.0.6' });
    same([linkFull.status, linkFull.error], [429, 'this guest link has too many live streams open (5 at most); close one and try again'], "the guest link's cap");

    // --- an owner's delete and clear reach the guest; a guest moderates nothing ---------------------------------------
    same((await call('DELETE', `${L}/${lm.id}`, { cookie: owner })).status, 200);
    await lobbyGuest.until((e) => e.type === 'chat-delete' && e.id === lm.id);
    ok(true, "an owner's delete reaches the guest");
    same((await call('DELETE', `${L}/messages?type=chat&scope=everyone`, { cookie: owner })).status, 200);
    await lobbyGuest.until((e) => e.type === 'chat-clear-some' && e.ids.includes(guestPost.json.message.id));
    ok(true, "an owner's clear reaches the guest");
    const guestIp = { ip: '10.0.0.7' };
    const keep = (await call('POST', L, { cookie: patC, body: { text: 'keep me' } })).json.message;
    same((await call('DELETE', `${L}/${keep.id}?${g(lobbyToken)}`, guestIp)).status, 403, "a guest can't delete a message");
    same((await call('DELETE', `${L}?${g(lobbyToken)}`, guestIp)).status, 403, "a guest can't delete the chat");
    same((await call('DELETE', `${L}/messages?${g(lobbyToken)}&type=chat&scope=everyone`, guestIp)).status, 403, "a guest can't clear");
    same((await call('PATCH', `${L}/${keep.id}?${g(lobbyToken)}`, { ...guestIp, body: { visibility: 'private' } })).status, 403, "a guest can't change who sees a message");
    const ai = await call('POST', `/api/spaces/lobby/ai?${g(lobbyToken)}`, { ...guestIp, body: { question: 'hi' } });
    same([ai.status, ai.json.error], [403, 'guests cannot use AI'], 'the Assistant is for members');

    // --- a guest link turned off, regenerated, or guests turned off ends the stream at once ---------------------------
    const offAt = Date.now();
    same((await call('DELETE', '/api/spaces/lobby/guest-link', { cookie: owner })).status, 200);
    same(await within(lobbyGuest.ended, 1500), true, 'turning the link off ends its streams');
    ok(Date.now() - offAt < 1500, 'at once');
    same([lobbyGuest.events.at(-1).type, lobbyGuest.events.at(-1).reason, lobbyGuest.events.at(-1).error], ['removed', 'access', 'that guest link is off or wrong'], 'with a last event that says why');
    same((await call('POST', `${L}?${g(lobbyToken)}`, { ip: '10.0.0.8', body: { name: 'Vic', text: 'still here?' } })).status, 401, 'and refuses its posts');
    same((await watch(await LG(lobbyToken), { ip: '10.0.0.8' })).status, 401, 'and its streams');
    lobbyToken = (await call('POST', '/api/spaces/lobby/guest-link', { cookie: owner, body: {} })).json.space.guestToken;
    const s2 = await watch(await LG(lobbyToken), { ip: '10.0.0.8' });
    await s2.until((e) => e.type === 'ready');
    const fresh = (await call('POST', '/api/spaces/lobby/guest-link', { cookie: owner, body: { regenerate: true } })).json.space.guestToken;
    ok(fresh && fresh !== lobbyToken, 'regenerated');
    same(await within(s2.ended, 1500), true, "regenerating the link ends the old token's streams");
    same((await call('POST', `${L}?${g(lobbyToken)}`, { ip: '10.0.0.8', body: { name: 'Vic', text: 'old link' } })).status, 401, "and refuses the old token's posts");
    same((await call('POST', `${L}?${g(fresh)}`, { ip: '10.0.0.8', body: { name: 'Vic', text: 'new link' } })).status, 200, 'the new token posts');
    const s3 = await watch(await LG(fresh), { ip: '10.0.0.8' });
    await s3.until((e) => e.type === 'ready');
    same((await call('PATCH', '/api/spaces/lobby', { cookie: owner, body: { allowGuests: false } })).status, 200);
    same(await within(s3.ended, 1500), true, "turning guests off in the space ends a guest's stream");

    // --- a member's stream still works after all of that ---------------------------------------------------------------
    const last = (await call('POST', L, { cookie: owner, body: { text: 'still on' } })).json.message;
    await again.until((e) => e.id === last.id);
    ok(!/listener failed|access check failed/.test(serverOut), `no listener failed:\n${serverOut}`);
  } catch (err) {
    failed = true;
    console.error(`FAIL ${err.stack || err}`);
  } finally {
    for (const s of open.splice(0)) s.close();
    await stopServer();
    fs.rmSync(dataDir, { recursive: true, force: true });
  }
}
if (failed) {
  console.error(`check-live: failed after ${n} checks`);
  process.exit(1);
}
console.log(`check-live: ${n} checks passed`);
