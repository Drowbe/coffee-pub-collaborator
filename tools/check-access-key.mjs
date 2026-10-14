#!/usr/bin/env node
/*
 * check-access-key.mjs -- the access key (?s=, the stream/OBS key) on a real server (GitHub #174). The key opens a
 * module's own keyed page and nothing else: it is not a person and not a guest, so it is in no space. Every route that
 * reads a viewer's space (modules for a space, the objects routes, links, the bus, the live stream) must answer it
 * 401, never a 500 from a missing guest space. A signed-in owner still gets the same routes.
 */
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-access-key-'));
let out = '';
const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
  cwd: ROOT,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: '0', DATA_DIR: dataDir, LIVEKIT_API_KEY: 'devkey', LIVEKIT_API_SECRET: 'devsecretdevsecret', ADMIN_PASSWORD: 'testpass1234' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
child.stdout.on('data', (d) => { out += d; });
child.stderr.on('data', (d) => { out += d; });
const stop = () => new Promise((resolve) => { if (child.exitCode !== null) return resolve(); child.once('exit', resolve); child.kill('SIGTERM'); });
let n = 0;
try {
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`the server did not start in time:\n${out}`)), 25000);
    const look = () => { const m = /listening on :(\d+)/.exec(out); if (m) { clearTimeout(timer); resolve(Number(m[1])); } };
    child.stdout.on('data', look);
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`the server stopped (${code}):\n${out}`)); });
  });
  const base = `http://127.0.0.1:${port}`;
  const call = async (method, url, { body, cookie } = {}) => {
    const headers = { accept: 'application/json', origin: base };
    if (cookie) headers.cookie = cookie;
    if (body !== undefined) headers['content-type'] = 'application/json';
    const res = await fetch(base + url, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not JSON */ }
    return { status: res.status, json, text, res };
  };
  const login = await call('POST', '/api/login', { body: { login: 'admin', password: 'testpass1234' } });
  assert.equal(login.status, 200, login.text);
  const cookie = login.res.headers.getSetCookie().map((c) => c.split(';')[0]).join('; ');
  const key = (await call('GET', '/api/settings', { cookie })).json.streamKey;
  assert.ok(key, 'the owner can read the access key');
  const space = (await call('POST', '/api/spaces', { cookie, body: { name: 'Camp' } })).json.space.id;
  for (const id of ['todo', 'calendar']) {
    assert.ok([200, 201].includes((await call('POST', `/api/modules/bundled/${id}/install`, { cookie })).status), `${id} installs`);
    assert.equal((await call('PATCH', `/api/modules/${id}`, { cookie, body: { enabled: true } })).status, 200, `${id} is on`);
  }
  const k = `s=${encodeURIComponent(key)}`;
  const q = (url) => `${url}${url.includes('?') ? '&' : '?'}${k}`;
  const ref = { module: 'todo', kind: 'task', id: 'abc', scope: 'space', space };
  const routes = [
    ['GET', `/api/modules/for-space?space=${space}`],
    ['POST', '/api/objects/resolve', { from: 'calendar', refs: [ref] }],
    ['GET', `/api/objects/search?from=calendar&scope=space&space=${space}`],
    ['GET', `/api/modules/todo/objects/task/abc?from=calendar&scope=space&space=${space}`],
    ['POST', '/api/objects/links', { module: 'todo', from: ref, to: [] }],
    ['GET', `/api/objects/links?from=todo&ref=${encodeURIComponent(JSON.stringify(ref))}`],
    ['POST', '/api/bus/publish', { module: 'todo', name: 'x', scope: 'space', space }],
    ['GET', `/api/bus/events?scope=space&space=${space}`],
    ['GET', `/api/bus/actions?module=todo&scope=space&space=${space}`],
    ['POST', '/api/bus/actions/request', { module: 'todo', action: 'x', scope: 'space', space }],
    ['GET', `/api/bus/actions/pending?module=todo&scope=space&space=${space}`],
    ['POST', '/api/bus/actions/claim', { module: 'todo', scope: 'space', space }],
    ['POST', '/api/bus/actions/complete', { module: 'todo', scope: 'space', space }],
    ['GET', `/api/bus/actions/status?module=todo&scope=space&space=${space}`],
    ['GET', `/api/modules/stream?space=${space}`],
  ];
  for (const [method, url, body] of routes) {
    const r = await call(method, q(url), { body });
    assert.equal(r.status, 401, `the access key, ${method} ${url}: ${r.status} ${r.text.slice(0, 120)}`);
    assert.ok(r.json?.error, `${method} ${url} says why`);
    n += 1;
  }
  // The routes it is meant for still work: a module with no keyed page is refused with a sentence, not a crash.
  for (const [method, url] of [['GET', '/api/modules/todo/data'], ['GET', `/api/modules/todo/data?scope=space&space=${space}`], ['GET', `/api/modules/todo/markers?space=${space}`]]) {
    const r = await call(method, q(url));
    assert.equal(r.status, 403, `the access key, ${method} ${url}: ${r.status} ${r.text.slice(0, 120)}`);
    n += 1;
  }
  // A signed-in owner is not affected.
  const mine = await call('GET', `/api/modules/for-space?space=${space}`, { cookie });
  assert.equal(mine.status, 200, mine.text);
  assert.ok(Array.isArray(mine.json.modules), 'the owner still gets the modules for the space');
  n += 1;
  assert.equal((await call('POST', '/api/objects/resolve', { cookie, body: { from: 'calendar', refs: [] } })).status, 200);
  n += 1;
  assert.ok(!/TypeError/.test(out), `the server logged a TypeError:\n${out}`);
  n += 1;
} finally {
  await stop();
  fs.rmSync(dataDir, { recursive: true, force: true });
}
console.log(`check-access-key: OK (${n} checks)`);
