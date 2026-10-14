#!/usr/bin/env node
/*
 * check-guest-chat.mjs -- guests in Home's chat (GitHub #289): a guest on the Lobby's guest link reads the Lobby's chat
 * (history and the live stream, GET /api/spaces/lobby/chat/stream?guest=<token>) and posts in it, and the abuse limits
 * hold. A throwaway server on PORT=0, a DATA_DIR under the temp folder, and small limits so the check runs quickly
 * (GUEST_CHAT_POSTS_PER_MINUTE=3, CHAT_STREAMS_PER_PERSON=2, CHAT_STREAMS_PER_GUEST_LINK=3). Addresses are told with
 * X-Forwarded-For (the server trusts the proxy). Checks:
 *   - the Lobby's guest reads and posts in the Lobby only: another space's chat, stream and posts are refused;
 *   - a guest's long message is cut as everyone's is (1000 characters, the name 40), a body over 64 KB is refused;
 *   - guest posts are limited per guest link and per address (429 with Retry-After and a sentence); members are not;
 *   - open streams are capped per person and per guest link (429), and a closed one frees its place;
 *   - a guest link turned off, regenerated, or its space's guests turned off ends the guest's stream at once (a last
 *     `closed` event) and refuses the old token's posts;
 *   - an owner's delete and clear reach the guest's stream; a guest can't delete, clear, change who sees a message or
 *     use the AI.
 * What can't be checked here: the call's data channel (no LiveKit server), which a guest in the Lobby's call also hears.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-guest-chat-'));
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
      GUEST_CHAT_POSTS_PER_MINUTE: '3', CHAT_STREAMS_PER_PERSON: '2', CHAT_STREAMS_PER_GUEST_LINK: '3',
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

async function call(method, urlPath, { body, cookie, ip } = {}) {
  const headers = { accept: 'application/json' };
  if (cookie) headers.cookie = `app_session=${cookie}`;
  if (ip) headers['x-forwarded-for'] = ip;
  if (body !== undefined) headers['content-type'] = 'application/json';
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
  const text = await res.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* not JSON */ }
  return { status: res.status, json, text, retryAfter: res.headers.get('retry-after') };
}

// An open stream: `events` collects each data line's JSON; `until(pred)` waits for one that matches; `ended` resolves
// when the server ends it.
async function openStream(urlPath, { cookie, ip } = {}) {
  const ctl = new AbortController();
  const headers = {};
  if (cookie) headers.cookie = `app_session=${cookie}`;
  if (ip) headers['x-forwarded-for'] = ip;
  const res = await fetch(`http://127.0.0.1:${port}${urlPath}`, { headers, signal: ctl.signal });
  const stream = { status: res.status, events: [], text: '', close: () => ctl.abort() };
  if (res.status !== 200) { stream.text = await res.text(); stream.error = JSON.parse(stream.text).error; return stream; }
  const waiters = [];
  stream.ended = (async () => {
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
      return 'ended';
    } catch {
      return 'aborted';
    }
  })();
  stream.until = (pred, ms = 5000) => new Promise((resolve, reject) => {
    const look = () => { const e = stream.events.find(pred); if (e) { clearTimeout(timer); waiters.splice(waiters.indexOf(look), 1); resolve(e); } };
    const timer = setTimeout(() => { waiters.splice(waiters.indexOf(look), 1); reject(new Error(`no such event; got ${JSON.stringify(stream.events)}`)); }, ms);
    waiters.push(look);
    look();
  });
  return stream;
}
const within = (promise, ms) => Promise.race([promise, new Promise((r) => setTimeout(() => r('timeout'), ms))]);
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
  const patCookie = await login('pat', 'memberpass1234');
  const trip = (await call('POST', '/api/spaces', { cookie: owner, body: { name: 'Trip', members: [pat.key] } })).json.space;
  const L = '/api/spaces/lobby/chat';
  const T = `/api/spaces/${trip.id}/chat`;
  const watch = async (p, opts) => { const s = await openStream(p, opts); open.push(s); return s; };
  let lobbyToken = (await call('POST', '/api/spaces/lobby/guest-link', { cookie: owner, body: {} })).json?.space?.guestToken;
  const tripToken = (await call('POST', `/api/spaces/${trip.id}/guest-link`, { cookie: owner, body: {} })).json?.space?.guestToken;
  ok(lobbyToken && tripToken, 'guest links made');
  const g = (token) => `?guest=${encodeURIComponent(token)}`;

  // --- the Lobby's guest reads and posts in the Lobby, and nowhere else ------------------------------------------
  same((await call('GET', `${L}${g(lobbyToken)}`, { ip: '10.0.0.9' })).status, 200, "the Lobby's guest reads its history");
  const guestStream = await watch(`${L}/stream${g(lobbyToken)}`, { ip: '10.0.0.1' });
  same(guestStream.status, 200, "the Lobby's guest reads its stream");
  await guestStream.until((e) => e.type === 'ready');
  const fromHome = await call('POST', L, { cookie: patCookie, body: { text: 'hello from Home' } });
  await guestStream.until((e) => e.type === 'chat' && e.id === fromHome.json.message.id);
  ok(true, "a message from Home reaches the guest's stream");
  const guestPost = await call('POST', `${L}${g(lobbyToken)}`, { ip: '10.0.0.1', body: { name: 'Vic', text: 'hello from a guest' } });
  same(guestPost.status, 200, guestPost.text);
  same([guestPost.json.message.by, guestPost.json.message.who], ['guest', 'Vic'], 'kept as a guest, with their name');
  await guestStream.until((e) => e.type === 'chat' && e.id === guestPost.json.message.id);
  ok(true, "the guest's own message comes back on the stream");
  for (const [what, r] of [
    ['history', await call('GET', `${T}${g(lobbyToken)}`, { ip: '10.0.0.9' })],
    ['post', await call('POST', `${T}${g(lobbyToken)}`, { ip: '10.0.0.9', body: { name: 'Vic', text: 'sneaking in' } })],
    ['stream', await watch(`${T}/stream${g(lobbyToken)}`, { ip: '10.0.0.9' })],
  ]) {
    same(r.status, 403, `another space's ${what} is refused to the Lobby's guest`);
    ok(/not in that/.test(r.error || r.json?.error), 'with one plain sentence');
  }
  same((await call('POST', `${L}${g(tripToken)}`, { ip: '10.0.0.9', body: { name: 'Tia', text: 'wrong place' } })).status, 403, "another space's guest can't post in the Lobby");
  const dead = await call('POST', `${L}?guest=nosuchtoken0000000000`, { ip: '10.0.0.9', body: { name: 'X', text: 'x' } });
  same([dead.status, dead.json.error], [401, 'that guest link is off or wrong'], 'a token that names no space says so');

  // --- the length cap (as for everyone: cut at 1000 characters; the request body is at most 64 KB) --------------------
  const long = await call('POST', `${T}${g(tripToken)}`, { ip: '10.0.0.5', body: { name: 'V'.repeat(80), text: 'a'.repeat(5000) } });
  same([long.status, long.json.message.text.length, long.json.message.who.length], [200, 1000, 40], "a guest's long message is cut to 1000 characters, the name to 40");
  const huge = await call('POST', `${T}${g(tripToken)}`, { ip: '10.0.0.5', body: { name: 'V', text: 'a'.repeat(70 * 1024) } });
  same(huge.status, 413, 'a body over 64 KB is refused');

  // --- guest posts: per guest link and per address ---------------------------------------------------------------
  // 10.0.0.1 has posted once with the Lobby's link (above): two more, then the fourth in the minute is refused.
  for (let i = 0; i < 2; i += 1) same((await call('POST', `${L}${g(lobbyToken)}`, { ip: '10.0.0.1', body: { name: 'Vic', text: `post ${i}` } })).status, 200);
  const limited = await call('POST', `${L}${g(lobbyToken)}`, { ip: '10.0.0.1', body: { name: 'Vic', text: 'one too many' } });
  same(limited.status, 429, 'the fourth guest post in a minute is refused');
  same(limited.json.error.replace(/\d+ seconds?$/, 'N seconds'), 'Guests can post 3 messages a minute; try again in N seconds', 'with one plain sentence');
  ok(Number(limited.retryAfter) >= 1 && Number(limited.retryAfter) <= 60, `with Retry-After (${limited.retryAfter})`);
  same((await call('POST', `${L}${g(lobbyToken)}`, { ip: '10.0.0.2', body: { name: 'Ann', text: 'from elsewhere' } })).status, 429, 'the guest link is limited from another address too');
  same((await call('POST', `${T}${g(tripToken)}`, { ip: '10.0.0.1', body: { name: 'Vic', text: 'other link' } })).status, 429, 'the address is limited with another guest link too');
  same((await call('POST', `${T}${g(tripToken)}`, { ip: '10.0.0.3', body: { name: 'Tia', text: 'fresh' } })).status, 200, 'another link from another address is not');
  for (let i = 0; i < 6; i += 1) same((await call('POST', L, { cookie: patCookie, body: { text: `member ${i}` } })).status, 200, 'members are not under the guest limit');

  // --- open streams: per person and per guest link -----------------------------------------------------------------
  const p1 = await watch(`${L}/stream`, { cookie: patCookie });
  const p2 = await watch(`${L}/stream`, { cookie: patCookie });
  const p3 = await watch(`${L}/stream`, { cookie: patCookie });
  same([p1.status, p2.status], [200, 200], 'a person opens up to the cap');
  same([p3.status, p3.error], [429, 'you have too many chat streams open (2 at most); close one and try again'], 'one more is refused');
  p1.close();
  await quiet();
  const p4 = await watch(`${L}/stream`, { cookie: patCookie });
  same(p4.status, 200, 'a closed stream frees its place');
  // The Lobby's guest at 10.0.0.1 holds one already (guestStream): one more there, the third refused as the person's.
  same((await watch(`${L}/stream${g(lobbyToken)}`, { ip: '10.0.0.1' })).status, 200);
  const gFull = await watch(`${L}/stream${g(lobbyToken)}`, { ip: '10.0.0.1' });
  same([gFull.status, gFull.error], [429, 'you have too many chat streams open (2 at most); close one and try again'], "a guest's own cap");
  same((await watch(`${L}/stream${g(lobbyToken)}`, { ip: '10.0.0.2' })).status, 200, 'another address on the link: the third of the link');
  const linkFull = await watch(`${L}/stream${g(lobbyToken)}`, { ip: '10.0.0.4' });
  same([linkFull.status, linkFull.error], [429, 'this guest link has too many chat streams open (3 at most); close one and try again'], "the guest link's cap");

  // --- an owner's delete and clear reach the guest; a guest moderates nothing ---------------------------------------
  same((await call('DELETE', `${L}/${fromHome.json.message.id}`, { cookie: owner })).status, 200);
  await guestStream.until((e) => e.type === 'chat-delete' && e.id === fromHome.json.message.id);
  ok(true, "an owner's delete reaches the guest");
  same((await call('DELETE', `${L}/messages?type=chat&scope=everyone`, { cookie: owner })).status, 200);
  await guestStream.until((e) => e.type === 'chat-clear-some' && e.ids.includes(guestPost.json.message.id));
  ok(true, "an owner's clear reaches the guest");
  const guestIp = { ip: '10.0.0.7' };
  const kept = (await call('POST', L, { cookie: patCookie, body: { text: 'keep me' } })).json.message;
  same((await call('DELETE', `${L}/${kept.id}${g(lobbyToken)}`, guestIp)).status, 403, "a guest can't delete a message");
  same((await call('DELETE', `${L}${g(lobbyToken)}`, guestIp)).status, 403, "a guest can't delete the chat");
  same((await call('DELETE', `${L}/messages${g(lobbyToken)}&type=chat&scope=everyone`, guestIp)).status, 403, "a guest can't clear");
  same((await call('PATCH', `${L}/${kept.id}${g(lobbyToken)}`, { ...guestIp, body: { visibility: 'private' } })).status, 403, "a guest can't change who sees a message");
  const ai = await call('POST', `/api/spaces/lobby/ai${g(lobbyToken)}`, { ...guestIp, body: { question: 'hi' } });
  same([ai.status, ai.json.error], [403, 'guests cannot use AI'], 'the Assistant is for members');

  // --- a guest link turned off, regenerated, or guests turned off ends the stream at once --------------------------
  const offAt = Date.now();
  same((await call('DELETE', '/api/spaces/lobby/guest-link', { cookie: owner })).status, 200);
  same(await within(guestStream.ended, 1500), 'ended', 'turning the link off ends its streams');
  ok(Date.now() - offAt < 1500, 'at once');
  same(guestStream.events.at(-1), { type: 'closed', error: 'that guest link is off or wrong' }, 'with a last event that says why');
  same((await call('POST', `${L}${g(lobbyToken)}`, { ip: '10.0.0.8', body: { name: 'Vic', text: 'still here?' } })).status, 401, 'and refuses its posts');
  same((await watch(`${L}/stream${g(lobbyToken)}`, { ip: '10.0.0.8' })).status, 401, 'and its streams');

  lobbyToken = (await call('POST', '/api/spaces/lobby/guest-link', { cookie: owner, body: {} })).json.space.guestToken;
  const s2 = await watch(`${L}/stream${g(lobbyToken)}`, { ip: '10.0.0.8' });
  await s2.until((e) => e.type === 'ready');
  const fresh = (await call('POST', '/api/spaces/lobby/guest-link', { cookie: owner, body: { regenerate: true } })).json.space.guestToken;
  ok(fresh && fresh !== lobbyToken, 'regenerated');
  same(await within(s2.ended, 1500), 'ended', 'regenerating the link ends the old token\'s streams');
  same((await call('POST', `${L}${g(lobbyToken)}`, { ip: '10.0.0.8', body: { name: 'Vic', text: 'old link' } })).status, 401, "and refuses the old token's posts");
  same((await call('POST', `${L}${g(fresh)}`, { ip: '10.0.0.8', body: { name: 'Vic', text: 'new link' } })).status, 200, 'the new token posts');

  const s3 = await watch(`${L}/stream${g(fresh)}`, { ip: '10.0.0.8' });
  await s3.until((e) => e.type === 'ready');
  same((await call('PATCH', '/api/spaces/lobby', { cookie: owner, body: { allowGuests: false } })).status, 200);
  same(await within(s3.ended, 1500), 'ended', "turning guests off in the space ends a guest's stream");

  // --- a member's stream still works after all of that ---------------------------------------------------------------
  const last = (await call('POST', L, { cookie: owner, body: { text: 'still on' } })).json.message;
  await p4.until((e) => e.id === last.id);
  ok(true, "a member's stream is untouched");
} finally {
  for (const s of open) s.close();
  await stopServer();
  fs.rmSync(dataDir, { recursive: true, force: true });
}
console.log(`check-guest-chat: ${n} checks passed`);
process.exit(0);
