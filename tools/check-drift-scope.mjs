#!/usr/bin/env node
// Proves what the drift guards leave out is only what they should (tools/lib/drift.mjs):
//   - the product page's own palette (public/landing.css) is not read by check-no-raw-colours, check-type-scale and
//     check-breakpoints, but is still read by check-spacing;
//   - the same things in any other file still fail those checks;
//   - an @font-face block (weight ranges such as 100 900) is not read, but a real font-weight 300 elsewhere still fails.
// Each case runs the real check on a throwaway tree (DRIFT_ROOT) with an empty allow-list (DRIFT_ALLOW_DIR).
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const tools = path.dirname(fileURLToPath(import.meta.url));
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'drift-scope-'));
const allowDir = path.join(tmp, 'allow');
fs.mkdirSync(allowDir);
for (const n of ['check-no-raw-colours', 'check-type-scale', 'check-breakpoints', 'check-spacing']) {
  fs.writeFileSync(path.join(allowDir, `${n}-allow.json`), '{"about":"test","counts":{}}\n');
}

const BAD = '.a { color: #123456; font-size: 15px; font-weight: 300; padding: 7px; }\n@media (max-width: 500px) { .a { margin: 0; } }\n';
function run(check, files) {
  const root = fs.mkdtempSync(path.join(tmp, 'tree-'));
  fs.mkdirSync(path.join(root, 'public', 'sdk'), { recursive: true });
  for (const [rel, text] of Object.entries(files)) fs.writeFileSync(path.join(root, rel), text);
  const r = spawnSync(process.execPath, [path.join(tools, `${check}.mjs`)], { env: { ...process.env, DRIFT_ROOT: root, DRIFT_ALLOW_DIR: allowDir }, encoding: 'utf8' });
  return { ok: r.status === 0, out: r.stdout + r.stderr };
}

for (const check of ['check-no-raw-colours', 'check-type-scale', 'check-breakpoints']) {
  const own = run(check, { 'public/landing.css': BAD });
  assert.ok(own.ok, `${check}: the product page's own palette is not read\n${own.out}`);
  assert.match(own.out, /own palette, not read: public\/landing\.css/, `${check}: names the file it leaves out`);
  const other = run(check, { 'public/other.css': BAD });
  assert.ok(!other.ok, `${check}: the same styling in another file still fails\n${other.out}`);
}
assert.ok(!run('check-spacing', { 'public/landing.css': BAD }).ok, 'check-spacing still reads the product page');

const FACE = '@font-face { font-family: "F"; font-weight: 100 900; src: local("Arial"); }\n@font-face { font-family: "G"; font-weight: 300; src: local("Arial"); }\n';
assert.ok(run('check-type-scale', { 'public/sdk/system.css': FACE }).ok, 'font-weight inside @font-face is not read');
const real = run('check-type-scale', { 'public/sdk/system.css': `${FACE}.x { font-weight: 300; }\n` });
assert.ok(!real.ok && /weight 300/.test(real.out), `a real font-weight 300 outside @font-face still fails\n${real.out}`);

fs.rmSync(tmp, { recursive: true, force: true });
console.log('check-drift-scope: OK (own-palette pages scoped to colours, type and breakpoints; @font-face ignored; planted offenders still fail elsewhere)');
