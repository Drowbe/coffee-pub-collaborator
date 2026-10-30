#!/usr/bin/env node
/*
 * check-vault.mjs -- a library module's files (documentation/plans/plan-attachments-vault.md, step 1), with no outside
 * service. Part 1, the store on its own (server/vault-store.js): the layout on disk, ids and names, no path a caller
 * chooses, records written whole by a rename, what a restart leaves removed on start, usage counted per space and person,
 * a deleted space's files gone.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { VaultStore, cleanName, nameForType, extensionOf } = require('../server/vault-store.js');

let n = 0;
const ok = (cond, msg) => { assert.ok(cond, msg); n += 1; };
const same = (a, b, msg) => { assert.deepEqual(a, b, msg); n += 1; };
const SPACE = 'abcd1234';
const OTHER = 'wxyz9876';

// --- part 1: the store ------------------------------------------------------------------------------------------------
{
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'check-vault-store-'));
  const bytesDir = path.join(base, 'vault', 'env');
  const modulesDir = path.join(base, 'data', 'modules');
  const s = new VaultStore({ bytesDir, modulesDir });
  same(s.swept, { parts: 0, orphans: 0 }, 'a new store has nothing to sweep');

  same(cleanName('  a\n\tb\u0000c  '), 'a b c', 'a name is one line without control characters');
  same(cleanName('../../etc/passwd'), 'etc passwd', 'path separators and leading dots go');
  same(cleanName('photo‮gpj.exe'), 'photo gpj.exe', 'the invisible characters that turn text around go');
  same(Array.from(cleanName('x'.repeat(300))).length, 120, 'at most 120 characters');
  same(nameForType('ticket', ['pdf']), 'ticket.pdf', 'a name with no extension takes the type\'s');
  same(nameForType('song.MP3', ['mp3']), 'song.MP3', 'one with the right extension keeps it');
  same(extensionOf('a.tar.GZ'), 'gz', 'the extension, lower case');

  const part = s.newPart(SPACE);
  ok(s.isPart(SPACE, part) && path.dirname(part) === path.join(bytesDir, `space-${SPACE}`), 'a part file goes in the space\'s folder');
  ok(!s.isPart(SPACE, '/etc/passwd') && !s.isPart(OTHER, part), 'only a part of this store and space is one');
  fs.writeFileSync(part, Buffer.from('%PDF-1.7 hello'));
  const fid = s.newId();
  ok(/^[a-f0-9]{24}$/.test(fid), 'a file id is 24 random hex characters');
  const rec = s.commit('vault', SPACE, part, { id: fid, name: 'ticket.pdf', type: 'application/pdf', group: 'document', size: 14, sha256: 'x', by: 'pat1', at: '2026-10-30T10:00:00.000Z', thumb: null });
  same(rec.id, fid, 'kept');
  ok(fs.existsSync(path.join(bytesDir, `space-${SPACE}`, `${fid}.bin`)) && !fs.existsSync(part), 'the part became <id>.bin');
  const recFile = path.join(modulesDir, 'vault', 'library', `space-${SPACE}.json`);
  ok(JSON.parse(fs.readFileSync(recFile, 'utf8'))[fid].name === 'ticket.pdf', 'the record is under DATA_DIR/modules/<id>/library/');
  same(fs.readdirSync(path.dirname(recFile)).filter((f) => f.endsWith('.tmp')), [], 'no temp file left beside it');
  assert.throws(() => s.commit('vault', SPACE, '/etc/hosts', { id: s.newId() }), /bad part/);
  assert.throws(() => s.commit('vault', SPACE, s.newPart(SPACE), { id: '../../x' }), /bad file id/);
  assert.throws(() => s.spaceDir('../x'), /not a valid id/);
  assert.throws(() => s.recordFile('../x', SPACE), /not a valid id/);
  same(s.filePath(SPACE, '../../etc/passwd'), null, 'a file id that is not one names no path');
  same(s.get('vault', SPACE, '../x'), null, 'and no record');
  same(s.get('vault', OTHER, fid), null, 'another space cannot reach it');
  n += 4;

  // Usage: per space and person, the thumbnail counted.
  same([s.usage().all, s.usage().spaces.get(SPACE), s.usage().people.get('pat1')], [14, 14, 14], 'usage counted from the records');
  s.putThumb('vault', SPACE, fid, Buffer.alloc(6, 1), 'image/png');
  same([s.usage().all, s.usage().people.get('pat1'), s.get('vault', SPACE, fid).thumb], [20, 20, { type: 'image/png', size: 6 }], 'the thumbnail counts too');
  s.rename('vault', SPACE, fid, 'ticket two.pdf');
  same(new VaultStore({ bytesDir, modulesDir }).get('vault', SPACE, fid).name, 'ticket two.pdf', 'a rename is on disk');
  same(new VaultStore({ bytesDir, modulesDir }).usage().all, 20, 'a fresh store counts the same');

  // What a restart leaves: parts and temp files go at once; bytes with no record only after a week.
  const left = s.newPart(SPACE);
  fs.writeFileSync(left, 'half an upload');
  fs.writeFileSync(`${recFile}.1234.tmp`, '{');
  const orphanNew = path.join(bytesDir, `space-${SPACE}`, `${'b'.repeat(24)}.bin`);
  const orphanOld = path.join(bytesDir, `space-${SPACE}`, `${'c'.repeat(24)}.bin`);
  fs.writeFileSync(orphanNew, 'recent');
  fs.writeFileSync(orphanOld, 'old');
  const weekAgo = new Date(Date.now() - 8 * 24 * 3600 * 1000);
  fs.utimesSync(orphanOld, weekAgo, weekAgo);
  fs.utimesSync(path.join(bytesDir, `space-${SPACE}`, `${fid}.bin`), weekAgo, weekAgo);
  const again = new VaultStore({ bytesDir, modulesDir });
  same(again.swept, { parts: 1, orphans: 1 }, 'on start: the part goes, and the week-old bytes with no record');
  ok(!fs.existsSync(left) && !fs.existsSync(`${recFile}.1234.tmp`), 'the part and the temp record are gone');
  ok(fs.existsSync(orphanNew) && !fs.existsSync(orphanOld), 'recent bytes with no record are kept for now');
  ok(fs.existsSync(path.join(bytesDir, `space-${SPACE}`, `${fid}.bin`)), 'a file with its record is kept, however old');

  // Removing, and a deleted space.
  const p2 = again.newPart(OTHER);
  fs.writeFileSync(p2, 'x');
  const f2 = again.newId();
  again.commit('vault', OTHER, p2, { id: f2, name: 'a.md', type: 'text/markdown', group: 'document', size: 1, by: 'sam1', at: '2026-10-30T11:00:00.000Z', thumb: null });
  same(again.list('vault', OTHER).map((r) => r.id), [f2], 'listed in its own space');
  same(again.remove('vault', OTHER, f2), true, 'removed');
  same([again.list('vault', OTHER).length, fs.existsSync(again.filePath(OTHER, f2)), again.usage().people.get('sam1')], [0, false, undefined], 'bytes, record and usage gone');
  ok(!fs.existsSync(path.join(modulesDir, 'vault', 'library', `space-${OTHER}.json`)), 'an empty record file is removed');
  same(again.remove('vault', OTHER, f2), false, 'removing twice is nothing');
  same(again.forgetSpace(SPACE), 1, 'a deleted space takes its file');
  ok(!fs.existsSync(path.join(bytesDir, `space-${SPACE}`)) && !fs.existsSync(recFile), 'its folder and records are gone');
  same(again.usage().all, 0, 'and nothing is counted');
  fs.rmSync(base, { recursive: true, force: true });
}

console.log(`check-vault: ${n} checks OK`);
