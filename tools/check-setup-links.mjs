#!/usr/bin/env node
/*
 * check-setup-links.mjs -- the Set up panel's addresses (documentation/plans/plan-setup-panel.md, "Opening the panel by
 * address", step 7): every address the old settings pages had answers 302 with the right Location (the browser keeps
 * the original fragment, which names the panel's tab), whether or not anyone is signed in, and the pages themselves are
 * gone (step 8). Runs against a throwaway server (PORT=0, DATA_DIR in the temp folder).
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
let n = 0;
const fail = (msg) => { console.error(`check-setup-links: ${msg}`); process.exitCode = 1; };

for (const f of ['space-settings.html', 'space-settings.js', 'module-settings.html', 'module-settings-page.js']) {
  if (fs.existsSync(path.join(ROOT, 'public', f))) fail(`public/${f} should be gone (the Set up panel replaced it)`);
}
if (!fs.existsSync(path.join(ROOT, 'public/module-settings.js'))) fail('public/module-settings.js must stay (the panel, Manage and Profile draw module settings with it)');

const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-setup-links-'));
const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
  cwd: ROOT,
  env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: '0', DATA_DIR: dataDir, ADMIN_PASSWORD: 'testpass1234' },
  stdio: ['ignore', 'pipe', 'pipe'],
});
let out = '';
child.stdout.on('data', (d) => { out += d; });
child.stderr.on('data', (d) => { out += d; });
try {
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`the server did not start in time:\n${out}`)); }, 25000);
    const onData = () => { const m = /listening on :(\d+)/.exec(out); if (m) { clearTimeout(timer); resolve(Number(m[1])); } };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`the server stopped (${code}):\n${out}`)); });
  });
  const cases = [
    ['/spaces/abc', '/?setup=abc'],
    ['/rooms/abc', '/?setup=abc'],
    ['/spaces/a%20b', '/?setup=a%20b'],
    ['/module-settings?space=abc', '/?setup=abc#modules'],
    ['/module-settings?room=abc', '/?setup=abc#modules'],
    ['/module-settings?space=abc&room=zzz', '/?setup=abc#modules'],
    ['/module-settings', '/'],
    ['/space-settings.html', '/'],
    ['/roomconfig.html', '/'],
    ['/module-settings.html', '/'],
  ];
  for (const [from, to] of cases) {
    const res = await fetch(`http://127.0.0.1:${port}${from}`, { redirect: 'manual' });
    assert.equal(res.status, 302, `${from} answers 302`);
    assert.equal(res.headers.get('location'), to, `${from} goes to ${to}`);
    n += 1;
  }
  // Left as they were: the page's other old file name is still a permanent redirect, and the panel's own address is the space page.
  const legacy = await fetch(`http://127.0.0.1:${port}/room.html`, { redirect: 'manual' });
  assert.equal(legacy.status, 301);
  assert.equal(legacy.headers.get('location'), '/space.html');
  const home = await fetch(`http://127.0.0.1:${port}/?setup=abc`, { redirect: 'manual' });
  assert.equal(home.status, 302);
  assert.equal(home.headers.get('location'), '/login', 'signed out, /?setup= still asks for sign-in as / does');
  n += 2;
} catch (err) {
  fail(err.message);
} finally {
  await new Promise((resolve) => { if (child.exitCode !== null) return resolve(); child.once('exit', resolve); child.kill('SIGTERM'); });
  fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 3 });
}
if (!process.exitCode) console.log(`check-setup-links: ${n} checks passed`);
