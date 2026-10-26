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
 * taken out of the space gets `removed` and the stream ends; an aside's stream is for its members only.
 * What can't be checked here: anything that needs a real LiveKit server (the microphone and camera merged from a call).
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
const { LiveRegister, mergeCall, cleanAwayMessage } = require('../server/live.js');
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
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-live-'));
let child = null;
let port = 0;
let serverOut = '';
async function startServer() {
  child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT,
    env: {
      PATH: process.env.PATH, HOME: process.env.HOME, PORT: '0', DATA_DIR: dataDir,
      LIVEKIT_API_KEY: 'devkey', LIVEKIT_API_SECRET: 'devsecretdevsecret', ADMIN_PASSWORD: 'testpass1234',
      // Nothing listens here: the call service fails fast and answers nobody.
      LIVEKIT_API_URL: 'http://127.0.0.1:9',
      CHAT_STREAMS_PER_PERSON: '4', CHAT_STREAMS_PER_GUEST_LINK: '5', TRUST_PROXY_HOPS: '0',
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

async function call(method, urlPath, { body, cookie } = {}) {
  const headers = { accept: 'application/json' };
  if (cookie) headers.cookie = `app_session=${cookie}`;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, json, text };
}

// An open stream: `events` collects each event's data (with its `id:` as `_id`); `until(pred)` waits for one that
// matches; `ended` resolves when the server ends it.
async function openStream(urlPath, cookie) {
  const ctl = new AbortController();
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, { headers: cookie ? { cookie: `app_session=${cookie}` } : {}, signal: ctl.signal });
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
// The last presence event's people as [key, onCall, away, awayMessage, guest].
const lastPeople = (s) => {
  const e = [...s.events].reverse().find((x) => x.type === 'presence');
  return e ? e.people.map((p) => [p.key, p.onCall, p.away, p.awayMessage, p.guest]) : null;
};
const hasPeople = (keys) => (e) => e.type === 'presence' && JSON.stringify(e.people.map((p) => p.key).sort()) === JSON.stringify([...keys].sort());

await startServer();
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

  // --- caps: four at most for one person (CHAT_STREAMS_PER_PERSON=4, counted with the chat stream) ---------------
  const home = await watch('/api/live', patC);
  same((await home.until((e) => e.type === 'ready')).space, null, 'Home: a stream in no space');
  const chat = await watch(`/api/spaces/${keep.id}/chat/stream`, patC);
  same(chat.status, 200, 'a chat stream counts too');
  same(await refused(K, patC), [429, 'you have too many live streams open (4 at most); close one and try again'], 'the fifth is refused');
  same(await refused(`/api/spaces/${keep.id}/chat/stream`, patC), [429, 'you have too many chat streams open (4 at most); close one and try again'], 'whichever kind');
  home.close();
  chat.close();
  await quiet();
  const again = await watch(K, patC);
  same(again.status, 200, 'a closed stream frees its place');
  again.close();
  patT.close();
  patK.close();

  // --- a guest ---------------------------------------------------------------------------------------------------
  const G = `${K}&guest=${encodeURIComponent(guestToken)}`;
  const guest = await watch(`${G}&name=Vic`, null);
  const gReady = await guest.until((e) => e.type === 'ready');
  ok(/^guest-/.test(gReady.you), 'a guest gets an id of their own');
  await samS.until((e) => e.type === 'presence' && e.people.some((p) => p.key === gReady.you && p.name === 'Vic' && p.guest));
  n += 1;
  same((await call('PATCH', `${P}?guest=${encodeURIComponent(guestToken)}`, { body: { away: true } })).status, 409, 'a guest names their stream');
  same((await call('PATCH', `${P}?guest=${encodeURIComponent(guestToken)}`, { body: { away: true, stream: gReady.stream } })).json, { ok: true }, 'and says away with it');
  await samS.until((e) => e.type === 'presence' && e.people.some((p) => p.key === gReady.you && p.away));
  n += 1;
  // CHAT_STREAMS_PER_GUEST_LINK=5: one address gets 2 of them.
  const g2 = await watch(G, null);
  same(g2.status, 200, 'a second from one address');
  same(await refused(G, null), [429, 'you have too many live streams open (2 at most); close one and try again'], 'a guest address\'s cap');
  g2.close();
  guest.close();

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
  for (const s of open) s.close();
  await stopServer();
  fs.rmSync(dataDir, { recursive: true, force: true });
}
if (failed) {
  console.error(`check-live: failed after ${n} checks`);
  process.exit(1);
}
console.log(`check-live: ${n} checks passed`);
