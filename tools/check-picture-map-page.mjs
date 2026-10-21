#!/usr/bin/env node
/*
 * check-picture-map-page.mjs -- the page side of the picture map (documentation/plans/plan-map-image.md, step 2), read as
 * code (the live run is in a browser; this holds the contract so a refactor cannot drop it):
 *   - module-settings.js: a `file` setting with `upload` draws a file picker (.pmtiles) and Clear; the upload is an XHR PUT to
 *     /api/modules/<id>/files/<folder>?name= as application/octet-stream with an "Uploading... N%" line and the server's own
 *     sentence on failure; the settings are drawn again after it; Clear and the delete button name the folder (?folder=);
 *     the file list says "Picture" or "Map data" from `kinds`; the row says that both act at once;
 *   - host.js: the host console's shared list shows the same from `files[].kind`;
 *   - module-host.js / sdk/host.js: the hello carries `environment.pictureMap` and the SDK exposes `host.environment`.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (f) => fs.readFileSync(new URL(`../${f}`, import.meta.url), 'utf8');
let n = 0;
const test = (name, fn) => { try { fn(); n += 1; } catch (err) { console.error(`check-picture-map-page: ${name}: ${err.message}`); process.exitCode = 1; } };

const ms = read('public/module-settings.js');
const host = read('public/host.js');
const mh = read('public/module-host.js');
const sdk = read('public/sdk/host.js');

test('an upload setting draws a .pmtiles picker, Clear, and the "acts at once" line', () => {
  assert.match(ms, /def\.upload && !draft \? uploadRow\(def\)/);
  assert.match(ms, /type="file" accept="\.pmtiles"/);
  assert.match(ms, /data-clear-file/);
  assert.match(ms, /Neither waits for Save\./);
});
test('the upload is an XHR PUT of the file, as octet-stream, with progress and the server\'s sentence', () => {
  assert.match(ms, /new XMLHttpRequest\(\)/);
  assert.match(ms, /xhr\.open\('PUT', `\/api\/modules\/\$\{encodeURIComponent\(moduleId\)\}\/files\/\$\{encodeURIComponent\(folder\)\}\?name=\$\{encodeURIComponent\(file\.name\)\}`\)/);
  assert.match(ms, /setRequestHeader\('Content-Type', 'application\/octet-stream'\)/);
  assert.match(ms, /xhr\.send\(file\)/);
  assert.match(ms, /`Uploading\.\.\. \$\{[^}]*\}%`/);
  assert.match(ms, /typeof data\.error === 'string' && data\.error \? data\.error/);
  assert.match(ms, /accessKeyHeaders/);
});
test('after an upload or a Clear the settings are read again; Clear and delete name the folder', () => {
  assert.equal((ms.match(/await renderModuleSettings\(container, \{ scope, space, only, heading \}\);\n\s+sayUpload/g) || []).length, 2);
  assert.match(ms, /files\/\$\{encodeURIComponent\(name\)\}\?folder=\$\{encodeURIComponent\(row\.dataset\.folder\)\}/);
  assert.match(ms, /\$\{folder \? `\?folder=\$\{encodeURIComponent\(folder\)\}` : ''\}/);
});
test('the file list says Picture or Map data from kinds, and nothing when absent', () => {
  assert.match(ms, /KIND_WORDS = \{ picture: 'Picture', vector: 'Map data' \}/);
  assert.match(ms, /\(def\.kinds \|\| \{\}\)\[n\]/);
  assert.match(ms, /hasKinds \? '<th scope="col">Type<\/th>' : ''/);
  assert.match(host, /KIND_WORDS = \{ picture: 'Picture', vector: 'Map data' \}/);
  assert.match(host, /files\.some\(\(f\) => f\.kind\)/);
  assert.match(host, /KIND_WORDS\[f\.kind\] \|\| ''/);
});
test('a module hears environment.pictureMap in the hello and reads host.environment', () => {
  // The hello's facts come from the context through environmentFacts (the same as the live 'environment' event).
  assert.match(mh, /environment: \(toldFacts = environmentFacts\(contextInfo\)\),/);
  assert.match(mh, /export function environmentFacts\(answer\) \{\n  const pm = answer && answer\.environment && answer\.environment\.pictureMap;\n  return \{ pictureMap: pm && typeof pm === 'object' && !Array\.isArray\(pm\) \? pm : null \};/);
  assert.match(sdk, /get environment\(\) \{ return \{ pictureMap: \(info && info\.environment && info\.environment\.pictureMap\) \|\| null \}; \}/);
  assert.match(mh, /async 'files\.url'\(\{ name, folder \}\)/);
  assert.match(sdk, /url: \(name, o\) => call\('files\.url', \{ name, \.\.\.\(o && o\.folder \? \{ folder: o\.folder \} : \{\}\) \}\)/);
});

if (!process.exitCode) console.log(`check-picture-map-page: ${n} checks passed`);
