#!/usr/bin/env node
/*
 * check-links.mjs -- links between modules stay true (documentation/plans/plan-linked-objects.md).
 * Step 1: a write or delete of a linked object sends refchange on the module stream, and only to the
 * modules that point at it. The two modules are declared here; no bundled module is named.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { buildModule } = require('../server/module-build.js');
const objectSync = require('../server/object-sync.js');

let n = 0;
let failed = 0;
const test = async (name, fn) => {
  try { await fn(); n += 1; } catch (err) { failed += 1; console.error(`check-links: ${name}: ${err.stack || err.message}`); }
};

function startServer(dataDir) {
  const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: '0', DATA_DIR: dataDir, LIVEKIT_API_KEY: 'devkey', LIVEKIT_API_SECRET: 'devsecretdevsecret', ADMIN_PASSWORD: 'admin-password-1' },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  const portPromise = new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`the server did not start in time:\n${out}`)); }, 20000);
    const onData = () => { const m = /listening on :(\d+)/.exec(out); if (m) { clearTimeout(timer); resolve(Number(m[1])); } };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`the server stopped (${code}):\n${out}`)); });
  });
  return portPromise.then((port) => ({ port, stop: () => new Promise((resolve) => { if (child.exitCode !== null) return resolve(); child.once('exit', resolve); child.kill('SIGTERM'); }) }));
}

function call(server, method, urlPath, { body, type, cookie } = {}) {
  const payload = body === undefined ? null : Buffer.isBuffer(body) ? body : Buffer.from(JSON.stringify(body));
  const headers = { host: `127.0.0.1:${server.port}`, accept: 'application/json' };
  if (payload) { headers['content-type'] = type || 'application/json'; headers['content-length'] = payload.length; }
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

function openStream(server, cookie, space) {
  const events = [];
  let buf = '';
  let res = null;
  const req = http.request({
    host: '127.0.0.1',
    port: server.port,
    path: `/api/modules/stream?space=${encodeURIComponent(space)}`,
    headers: { host: `127.0.0.1:${server.port}`, cookie, accept: 'text/event-stream' },
  }, (response) => {
    res = response;
    response.on('data', (c) => {
      buf += c.toString('utf8');
      const parts = buf.split(/\n\n/);
      buf = parts.pop();
      for (const part of parts) {
        let event = 'message';
        let data = '';
        for (const line of part.split(/\n/)) {
          if (line.startsWith('event:')) event = line.slice(6).trim();
          else if (line.startsWith('data:')) data += line.slice(5).trim();
        }
        if (!data || data === '') continue;
        try { events.push({ event, data: JSON.parse(data) }); } catch { /* a comment or a ping */ }
      }
    });
  });
  req.end();
  const refchanges = () => events.filter((e) => e.event === 'refchange');
  const waitFor = async (count) => {
    for (let i = 0; i < 40 && refchanges().length < count; i += 1) await new Promise((r) => setTimeout(r, 50));
  };
  return { refchanges, waitFor, close: () => { req.destroy(); if (res) res.destroy(); } };
}

function writeModule(dir, id, refs) {
  const root = path.join(dir, id);
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'module.json'), JSON.stringify({
    id, name: id, version: '1.0.0', scope: ['space'], icon: 'circle',
    surfaces: { canvas: { entry: `${id}.html`, menu: false } },
    refs,
  }));
  fs.writeFileSync(path.join(root, 'src', `${id}.html`), '<!DOCTYPE html><html><head><style>/*__CSS__*/</style></head><body><script>/*__JS__*/</script></body></html>');
  fs.writeFileSync(path.join(root, 'src', `${id}.css`), '');
  fs.writeFileSync(path.join(root, 'src', `${id}.js`), '');
  return root;
}

const base = fs.mkdtempSync(path.join(os.tmpdir(), 'check-links-'));
let server = null;
let stream = null;
try {
  await test('an unknown time zone falls back, and a known one is kept', () => {
    assert.equal(objectSync.writerZone('Not/AZone'), objectSync.writerZone(''));
    assert.equal(objectSync.writerZone('UTC'), 'UTC');
    assert.equal(objectSync.writerZone('America/New_York'), 'America/New_York');
  });

  const mods = path.join(base, 'mods');
  const ownerDir = writeModule(mods, 'link-owner', {
    produces: [{ kind: 'note', name: 'Note', key: 'note:{id}', summary: { title: 'title' }, backlinks: true }],
    consumes: [],
  });
  const holderDir = writeModule(mods, 'link-holder', {
    produces: [{ kind: 'row', name: 'Row', key: 'row:{id}', summary: { title: 'title' } }],
    consumes: ['link-owner:note'],
  });
  const bystanderDir = writeModule(mods, 'link-bystander', {
    produces: [{ kind: 'mark', name: 'Mark', key: 'mark:{id}', summary: { title: 'title' } }],
    consumes: [],
  });

  server = await startServer(path.join(base, 'data'));
  const cookie = cookieOf(await call(server, 'POST', '/api/login', { body: { login: 'admin', password: 'admin-password-1' } }));
  const as = (method, url, body, type) => call(server, method, url, { cookie, body, type });
  const space = (await as('POST', '/api/spaces', { name: 'Side' })).json.space.id;
  for (const dir of [ownerDir, holderDir, bystanderDir]) {
    const up = await as('POST', '/api/modules', buildModule(dir).zip, 'application/zip');
    assert.equal(up.status, 201, up.text);
  }
  for (const id of ['link-owner', 'link-holder', 'link-bystander']) {
    assert.equal((await as('PATCH', `/api/modules/${id}`, { enabled: true, allSpaces: true })).status, 200, id);
  }
  const note = { module: 'link-owner', kind: 'note', id: 'a', scope: 'space', space };
  const put = (value, tz) => as('PUT', `/api/modules/link-owner/data/note:a?scope=space&space=${space}`, { value, ...(tz ? { tz } : {}) });
  assert.equal((await put({ title: 'One' }, 'Not/AZone')).status, 200, 'a zone the server does not know does not refuse the write');
  const linked = await as('POST', '/api/objects/links', {
    module: 'link-holder',
    from: { module: 'link-holder', kind: 'row', id: '1', scope: 'space', space },
    to: [note],
  });
  assert.equal(linked.status, 200, linked.text);
  assert.equal(linked.json.links, 1);

  stream = openStream(server, cookie, space);
  await new Promise((r) => setTimeout(r, 100));

  await test('a write to a linked object tells the module that points at it, and not one that does not', async () => {
    assert.equal((await put({ title: 'Two' })).status, 200);
    await stream.waitFor(1);
    const heard = stream.refchanges();
    assert.equal(heard.length, 1, JSON.stringify(heard));
    assert.equal(heard[0].data.change, 'updated');
    assert.deepEqual(heard[0].data.ref, note);
    assert.deepEqual(heard[0].data.modules, ['link-holder']);
  });

  await test('a write that leaves the summary the same sends nothing', async () => {
    assert.equal((await put({ title: 'Two', extra: 1 })).status, 200);
    await new Promise((r) => setTimeout(r, 200));
    assert.equal(stream.refchanges().length, 1);
  });

  await test('a delete sends deleted', async () => {
    assert.equal((await as('DELETE', `/api/modules/link-owner/data/note:a?scope=space&space=${space}`)).status, 200);
    await stream.waitFor(2);
    const heard = stream.refchanges();
    assert.equal(heard.length, 2, JSON.stringify(heard));
    assert.equal(heard[1].data.change, 'deleted');
    assert.deepEqual(heard[1].data.modules, ['link-holder']);
  });
} finally {
  if (stream) stream.close();
  if (server) await server.stop();
  fs.rmSync(base, { recursive: true, force: true });
}
if (failed) {
  console.error(`check-links: ${failed} failed`);
  process.exit(1);
}
console.log(`check-links: OK (${n})`);
process.exit(0);
