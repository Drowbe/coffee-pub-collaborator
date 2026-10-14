#!/usr/bin/env node
/*
 * check-chat-stream.mjs -- GET /api/spaces/:id/chat/stream (documentation/plans/plan-home-lobby.md, step 1): Home's chat
 * hears the Lobby's public chat live from the server, without the call service. A throwaway server on PORT=0 and a
 * DATA_DIR under the temp folder. Checks: the same rules as reading the chat (signed out 401, a stranger or another
 * space's guest 403, a member, the owner and the space's guest in), a posted message arrives with its stored id, delete /
 * visibility / clear arrive, a private message never does, another space's events don't, and a reconnect works.
 * A guest's stream ends with a last `closed` event when the guest link is regenerated (GitHub #289; more in
 * check-guest-chat.mjs).
 * What can't be checked here: the relay of Lobby messages to the call's data channel (no LiveKit server).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-chat-stream-'));
let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n += 1; };
const same = (a, b, msg) => { assert.deepEqual(a, b, msg); n += 1; };

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
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, json, text };
}

// An open stream: `events` collects each data line's JSON; `until(pred)` waits for one that matches.
async function openStream(urlPath, cookie) {
  const ctl = new AbortController();
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, { headers: cookie ? { cookie: `app_session=${cookie}` } : {}, signal: ctl.signal });
  const stream = { status: res.status, type: res.headers.get('content-type') || '', events: [], text: '', close: () => ctl.abort() };
  if (res.status !== 200) { stream.text = await res.text(); return stream; }
  const waiters = [];
  (async () => {
    const decoder = new TextDecoder();
    let buf = '';
    try {
      for await (const chunk of res.body) {
        buf += decoder.decode(chunk, { stream: true });
        let at;
        while ((at = buf.indexOf('\n\n')) >= 0) {
          const block = buf.slice(0, at);
          buf = buf.slice(at + 2);
          const line = block.split('\n').find((l) => l.startsWith('data: '));
          if (!line) continue;
          stream.events.push(JSON.parse(line.slice(6)));
          for (const w of [...waiters]) w();
        }
      }
    } catch { /* closed */ }
  })();
  stream.until = (pred, ms = 5000) => new Promise((resolve, reject) => {
    const look = () => { const e = stream.events.find(pred); if (e) { clearTimeout(timer); waiters.splice(waiters.indexOf(look), 1); resolve(e); } };
    const timer = setTimeout(() => { waiters.splice(waiters.indexOf(look), 1); reject(new Error(`no such event; got ${JSON.stringify(stream.events)}`)); }, ms);
    waiters.push(look);
    look();
  });
  return stream;
}
const quiet = (ms = 400) => new Promise((r) => setTimeout(r, ms));

await startServer();
const open = [];
try {
  const login = async (name, password) => {
    const r = await call('POST', '/api/login', { body: { login: name, password } });
    assert.equal(r.status, 200, `${name} signs in: ${r.text}`);
    return r.json.token;
  };
  const owner = await login('admin', 'testpass1234');
  const pat = (await call('POST', '/api/users', { cookie: owner, body: { login: 'pat', displayName: 'Pat', role: 'member', password: 'memberpass1234' } })).json.user;
  const sam = (await call('POST', '/api/users', { cookie: owner, body: { login: 'sam', displayName: 'Sam', role: 'member', password: 'memberpass1234' } })).json.user;
  const patCookie = await login('pat', 'memberpass1234');
  const samCookie = await login('sam', 'memberpass1234');
  // A space only Pat is in: Sam is a stranger to it.
  const trip = (await call('POST', '/api/spaces', { cookie: owner, body: { name: 'Trip', members: [pat.key] } })).json.space;
  const L = '/api/spaces/lobby/chat';
  const watch = async (p, cookie) => { const s = await openStream(p, cookie); open.push(s); return s; };

  // --- who may listen ---------------------------------------------------------------------------------------
  const signedOut = await watch(`${L}/stream`, null);
  same([signedOut.status, JSON.parse(signedOut.text).error], [401, 'sign in first'], 'signed out is refused');
  const stranger = await watch(`/api/spaces/${trip.id}/chat/stream`, samCookie);
  same(stranger.status, 403, 'a member who is not in that space is refused');
  ok(/not in that/.test(JSON.parse(stranger.text).error), 'with one plain sentence');
  same((await watch(`/api/spaces/nosuch/chat/stream`, patCookie)).status, 404, 'no such space');

  // A guest link for the Lobby reads the Lobby's stream; a guest of the Trip does not.
  const lobbyGuest = (await call('POST', '/api/spaces/lobby/guest-link', { cookie: owner, body: {} })).json?.space?.guestToken;
  const tripGuest = (await call('POST', `/api/spaces/${trip.id}/guest-link`, { cookie: owner, body: {} })).json?.space?.guestToken;
  ok(lobbyGuest && tripGuest, 'guest links made');
  same((await watch(`${L}/stream?guest=${encodeURIComponent(tripGuest)}`, null)).status, 403, "another space's guest is refused");

  const mine = await watch(`${L}/stream`, patCookie);
  const boss = await watch(`${L}/stream`, owner);
  const guest = await watch(`${L}/stream?guest=${encodeURIComponent(lobbyGuest)}`, null);
  const other = await watch(`/api/spaces/${trip.id}/chat/stream`, patCookie);
  for (const s of [mine, boss, guest, other]) {
    same(s.status, 200, 'an allowed reader is in');
    ok(s.type.startsWith('text/event-stream'), 'as an event stream');
    await s.until((e) => e.type === 'ready');
  }

  // --- a posted message arrives, with its stored id ------------------------------------------------------------
  const posted = await call('POST', `${L}`, { cookie: samCookie, body: { text: 'hello from Home https://example.com/a' } });
  same(posted.status, 200, posted.text);
  for (const s of [mine, boss, guest]) {
    const e = await s.until((x) => x.type === 'chat' && x.id === posted.json.message.id);
    same([e.text, e.who, e.by, e.at], [posted.json.message.text, 'Sam', sam.key, posted.json.message.at], 'the message as stored');
    same(e.preview, { url: 'https://example.com/a' }, 'with its link');
  }
  await quiet();
  same(other.events.filter((e) => e.type === 'chat').length, 0, "another space's stream hears nothing of the Lobby");
  // The guest posts too (a guest may chat); the stream hears it as 'guest'.
  const gp = await call('POST', `${L}?guest=${encodeURIComponent(lobbyGuest)}`, { body: { name: 'Visitor', text: 'hi from a guest' } });
  same(gp.status, 200, gp.text);
  same((await mine.until((x) => x.id === gp.json.message.id)).by, 'guest');

  // --- a space's own stream works the same way ---------------------------------------------------------------
  const tp = await call('POST', `/api/spaces/${trip.id}/chat`, { cookie: patCookie, body: { text: 'trip talk' } });
  await other.until((x) => x.type === 'chat' && x.id === tp.json.message.id);
  await quiet();
  ok(!mine.events.some((e) => e.text === 'trip talk'), "the Lobby's stream hears nothing of the Trip");

  // --- delete, visibility, clear -------------------------------------------------------------------------------
  const m2 = (await call('POST', L, { cookie: samCookie, body: { text: 'second' } })).json.message;
  await mine.until((x) => x.id === m2.id);
  same((await call('PATCH', `${L}/${m2.id}`, { cookie: samCookie, body: { visibility: 'private' } })).status, 200);
  same(await mine.until((x) => x.type === 'chat-visibility' && x.id === m2.id && x.visibility === 'private'), { type: 'chat-visibility', id: m2.id, visibility: 'private' }, 'made private: only the id');
  same((await call('PATCH', `${L}/${m2.id}`, { cookie: samCookie, body: { visibility: 'public' } })).status, 200);
  const back = await mine.until((x) => x.type === 'chat-visibility' && x.visibility === 'public' && x.id === m2.id);
  same(back.message.text, 'second', 'made public again: with the message');
  same((await call('DELETE', `${L}/${m2.id}`, { cookie: samCookie })).status, 200);
  await guest.until((x) => x.type === 'chat-delete' && x.id === m2.id);

  // A private message (a command echo) never goes on the stream.
  const before = mine.events.length;
  await call('POST', `${L.replace('/chat', '')}/command`, { cookie: samCookie, body: { name: 'zzzz', text: 'private echo' } });
  await quiet();
  ok(!mine.events.slice(before).some((e) => e.type === 'chat'), 'a private message is never sent');

  const m3 = (await call('POST', L, { cookie: samCookie, body: { text: 'third' } })).json.message;
  await mine.until((x) => x.id === m3.id);
  same((await call('DELETE', `${L}/messages?type=chat&scope=everyone`, { cookie: owner })).status, 200);
  const some = await mine.until((x) => x.type === 'chat-clear-some' && x.ids.includes(m3.id));
  same(some.scope, 'everyone', 'Clear… arrives');
  same((await call('DELETE', L, { cookie: owner })).status, 200);
  await guest.until((x) => x.type === 'chat-clear');

  // --- a reconnect works: the history is whole, and a new stream hears what comes next ---------------------------
  mine.close();
  const kept = (await call('POST', L, { cookie: samCookie, body: { text: 'while away' } })).json.message;
  const again = await watch(`${L}/stream`, patCookie);
  await again.until((e) => e.type === 'ready');
  ok(!again.events.some((e) => e.id === kept.id), 'nothing is replayed');
  same((await call('GET', L, { cookie: patCookie })).json.messages.map((m) => m.text), ['while away'], 'the history has what was missed');
  const next = (await call('POST', L, { cookie: samCookie, body: { text: 'after' } })).json.message;
  await again.until((e) => e.type === 'chat' && e.id === next.id);

  // --- a guest's stream ends when their guest link changes (GitHub #289) -------------------------------------------
  // The guest's stream (opened above) is still listening: regenerating the Lobby's guest link ends it at once, with a
  // last `closed` event, and the old token is refused from then on.
  const ended = new Promise((resolve) => { const t = setInterval(() => { if (guest.events.some((e) => e.type === 'closed')) { clearInterval(t); resolve(true); } }, 50); setTimeout(() => { clearInterval(t); resolve(false); }, 3000); });
  same((await call('POST', '/api/spaces/lobby/guest-link', { cookie: owner, body: { regenerate: true } })).status, 200);
  ok(await ended, "regenerating the guest link ends the old token's stream");
  same(guest.events.at(-1), { type: 'closed', error: 'that guest link is off or wrong' }, 'saying why');
  const oldToken = await watch(`${L}/stream?guest=${encodeURIComponent(lobbyGuest)}`, null);
  same([oldToken.status, JSON.parse(oldToken.text).error], [401, 'that guest link is off or wrong'], 'the old token is refused');
  // Members' streams are untouched by it.
  const still = (await call('POST', L, { cookie: samCookie, body: { text: 'still listening' } })).json.message;
  await again.until((e) => e.type === 'chat' && e.id === still.id);

  // --- the server stops cleanly with streams open --------------------------------------------------------------
  const exited = new Promise((r) => child.once('exit', (code, sig) => r({ code, sig })));
  child.kill('SIGTERM');
  const gone = await Promise.race([exited, new Promise((r) => setTimeout(() => r(null), 5000))]);
  ok(gone, 'the server stops with streams open');
} finally {
  for (const s of open) s.close();
  await stopServer();
  fs.rmSync(dataDir, { recursive: true, force: true });
}
console.log(`check-chat-stream: ${n} checks passed`);
process.exit(0);
