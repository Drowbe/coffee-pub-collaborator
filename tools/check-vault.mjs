#!/usr/bin/env node
/*
 * check-vault.mjs -- a library module's files (documentation/plans/plan-attachments-vault.md, step 1), with no outside
 * service. Part 1, the store on its own (server/vault-store.js): the layout on disk, ids and names, no path a caller
 * chooses, records written whole by a rename, what a restart leaves removed on start, usage counted per space and person,
 * a deleted space's files gone. Part 2, types (server/vault-types.js): each type from its own bytes; SVG, HTML, XML, zip,
 * programs, scripts, Matroska and HEIC refused; names and types sent checked before the body and against the bytes;
 * picture sizes from the header; a PDF's active content found as a stream; Markdown's text.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const { buildModule } = require('../server/module-build.js');
const { VaultStore, cleanName, nameForType, extensionOf } = require('../server/vault-store.js');
const types = require('../server/vault-types.js');

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

// --- the files the checks send ----------------------------------------------------------------------------------------
const pngOf = (w, h, extra = Buffer.alloc(0)) => {
  const chunk = (t, d) => { const b = Buffer.alloc(12 + d.length); b.writeUInt32BE(d.length, 0); b.write(t, 4, 'latin1'); d.copy(b, 8); return b; };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('tEXt', Buffer.from('Comment\0hidden words')), chunk('IDAT', Buffer.concat([Buffer.from([1, 2, 3]), extra])), chunk('IEND', Buffer.alloc(0))]);
};
// A JPEG with a camera, a time and a position (52.5N 13.4E) in its EXIF, as check-uploads builds one.
function exifTiff() {
  const u16 = (v) => { const b = Buffer.alloc(2); b.writeUInt16BE(v); return b; };
  const u32 = (v) => { const b = Buffer.alloc(4); b.writeUInt32BE(v); return b; };
  const ent = (tag, type, count, value) => Buffer.concat([u16(tag), u16(type), u32(count), value]);
  const ifd0At = 8; const exifAt = ifd0At + 2 + 4 * 12 + 4; const gpsAt = exifAt + 2 + 12 + 4; const dataAt = gpsAt + 2 + 4 * 12 + 4;
  const make = Buffer.from('Acme\0'); const dt = Buffer.from('2026:09:21 14:30:05\0');
  const rat = (a, b) => Buffer.concat([u32(a), u32(b)]);
  const makeAt = dataAt; const dtAt = makeAt + make.length; const latAt = dtAt + dt.length; const lngAt = latAt + 24;
  const pad = (b) => Buffer.concat([b, Buffer.alloc(4 - b.length)]);
  return Buffer.concat([Buffer.from('MM'), u16(42), u32(ifd0At),
    u16(4), ent(0x010f, 2, make.length, u32(makeAt)), ent(0x0112, 3, 1, Buffer.concat([u16(1), u16(0)])), ent(0x8769, 4, 1, u32(exifAt)), ent(0x8825, 4, 1, u32(gpsAt)), u32(0),
    u16(1), ent(0x9003, 2, dt.length, u32(dtAt)), u32(0),
    u16(4), ent(1, 2, 2, pad(Buffer.from('N\0'))), ent(2, 5, 3, u32(latAt)), ent(3, 2, 2, pad(Buffer.from('E\0'))), ent(4, 5, 3, u32(lngAt)), u32(0),
    make, dt, rat(52, 1), rat(30, 1), rat(0, 1), rat(13, 1), rat(24, 1), rat(0, 1)]);
}
const seg = (marker, body) => { const h = Buffer.alloc(4); h[0] = 0xff; h[1] = marker; h.writeUInt16BE(body.length + 2, 2); return Buffer.concat([h, body]); };
const jpegOf = (w = 4, h = 3) => Buffer.concat([
  Buffer.from([0xff, 0xd8]), seg(0xe0, Buffer.from('JFIF\0\x01\x01\0\0\x01\0\x01\0\0')), seg(0xe1, Buffer.concat([Buffer.from('Exif\0\0'), exifTiff()])),
  seg(0xdb, Buffer.alloc(65, 1)), seg(0xc0, Buffer.from([8, h >> 8, h & 255, w >> 8, w & 255, 1, 1, 0x11, 0])), seg(0xda, Buffer.from([1, 1, 0, 0, 63, 0])), Buffer.from([0x12, 0x34, 0xff, 0xd9]),
]);
const gifOf = (w = 2, h = 2) => { const b = Buffer.alloc(32); b.write('GIF89a', 0, 'latin1'); b.writeUInt16LE(w, 6); b.writeUInt16LE(h, 8); return b; };
const webpOf = () => { const b = Buffer.alloc(40); b.write('RIFF', 0, 'latin1'); b.writeUInt32LE(32, 4); b.write('WEBPVP8X', 8, 'latin1'); b.writeUInt32LE(10, 16); b.writeUIntLE(9, 24, 3); b.writeUIntLE(9, 27, 3); return b; };
const riffOf = (kind) => { const b = Buffer.alloc(44); b.write('RIFF', 0, 'latin1'); b.writeUInt32LE(36, 4); b.write(kind, 8, 'latin1'); return b; };
const ftypOf = (major, compat = []) => { const size = 16 + compat.length * 4; const b = Buffer.alloc(size + 16); b.writeUInt32BE(size, 0); b.write('ftyp', 4, 'latin1'); b.write(major, 8, 'latin1'); compat.forEach((c, i) => b.write(c, 16 + i * 4, 'latin1')); b.write('mdat', size + 4, 'latin1'); return b; };
const ebmlOf = (doc) => Buffer.concat([Buffer.from([0x1a, 0x45, 0xdf, 0xa3, 0x9f, 0x42, 0x86, 0x81, 0x01, 0x42, 0x82, 0x80 | doc.length]), Buffer.from(doc, 'latin1'), Buffer.alloc(40)]);
const mp3Of = () => Buffer.concat([Buffer.from('ID3\x04\0\0\0\0\0\0', 'latin1'), Buffer.from([0xff, 0xfb, 0x90, 0x64]), Buffer.alloc(200)]);
const oggOf = () => Buffer.concat([Buffer.from('OggS\0\x02', 'latin1'), Buffer.alloc(60)]);
const pdfOf = (body = '') => Buffer.from(`%PDF-1.7\n1 0 obj << /Type /Catalog /Pages 2 0 R ${body} >> endobj\ntrailer << /Root 1 0 R >>\n%%EOF\n`, 'latin1');

// --- part 2: types ------------------------------------------------------------------------------------------------------
{
  const sniffed = (b, name = 'x') => types.sniff(b, name).type || `refused:${types.sniff(b, name).refuse}`;
  same(sniffed(jpegOf()), 'image/jpeg', 'JPEG from FF D8 FF');
  same(sniffed(pngOf(2, 2)), 'image/png', 'PNG from its signature');
  same(sniffed(webpOf()), 'image/webp', 'WebP: RIFF then WEBP');
  same(sniffed(gifOf()), 'image/gif', 'GIF89a');
  same(sniffed(mp3Of()), 'audio/mpeg', 'MP3 from ID3');
  same(sniffed(Buffer.concat([Buffer.from([0xff, 0xfb, 0x90, 0x64]), Buffer.alloc(40)])), 'audio/mpeg', 'MP3 from a frame sync');
  same(sniffed(Buffer.concat([Buffer.from([0xff, 0xf1, 0x50, 0x80]), Buffer.alloc(40)])), 'refused:kind', 'AAC\'s ADTS is not MP3');
  same(sniffed(oggOf()), 'audio/ogg', 'OggS');
  same(sniffed(riffOf('WAVE')), 'audio/wav', 'WAV: RIFF then WAVE');
  same(sniffed(riffOf('AVI ')), 'refused:kind', 'an AVI is refused');
  same(sniffed(ftypOf('M4A ', ['isom'])), 'audio/mp4', 'M4A by its brand');
  same(sniffed(ftypOf('isom', ['iso2', 'avc1'])), 'video/mp4', 'MP4 by an ISO brand');
  same(sniffed(ftypOf('3gp5', ['isom'])), 'video/mp4', 'or an ISO brand among the compatible ones');
  same(sniffed(ftypOf('qt  ')), 'video/quicktime', '.mov is taken as video/quicktime');
  same(sniffed(ftypOf('heic', ['mif1'])), 'refused:heic', 'HEIC is refused with its own sentence');
  same(sniffed(ftypOf('mif1', ['heic'])), 'refused:heic', 'and as mif1');
  same(sniffed(ftypOf('avif', ['mif1'])), 'refused:heic', 'an AVIF that names HEIC brands only');
  same(sniffed(ftypOf('crx ')), 'refused:kind', 'another brand is refused');
  same(sniffed(ebmlOf('webm')), 'video/webm', 'WebM by its DocType');
  same(sniffed(ebmlOf('matroska')), 'refused:kind', '.mkv is refused');
  same(sniffed(pdfOf()), 'application/pdf', '%PDF-');
  same(sniffed(Buffer.from('# Packing\n\n- socks\n'), 'list.md'), 'text/markdown', 'Markdown by its name and text');
  same(sniffed(Buffer.from('# Packing\n'), 'list.txt'), 'refused:kind', 'text with another name is not taken');
  for (const [what, bytes, name] of [
    ['SVG', '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script></svg>', 'x.svg'],
    ['HTML', '<!doctype html><script>alert(1)</script>', 'x.html'],
    ['XML', '<?xml version="1.0"?><a/>', 'x.xml'],
    ['a zip', 'PK\x03\x04\x14\0\0\0\0\0', 'x.zip'],
    ['a program', 'MZ\x90\0\x03\0\0\0\x04\0', 'x.exe'],
    ['a script', '#!/bin/sh\nrm -rf /\n', 'x.sh'],
  ]) same(sniffed(Buffer.from(bytes, 'latin1'), name), 'refused:kind', `${what} is refused`);

  // Before the body: names and types sent.
  same(types.claimRefusal('photo.heic', ''), 'heic', 'a .heic name is refused before the body');
  same(types.claimRefusal('x', 'image/heif'), 'heic', 'so is the HEIF type');
  same(['x.svg', 'x.html', 'x.zip', 'x.exe', 'x.docx', 'x.mkv'].map((nm) => types.claimRefusal(nm, '')), Array(6).fill('kind'), 'names of refused kinds');
  same(['image/svg+xml', 'text/html', 'application/zip', 'application/javascript'].map((t) => types.claimRefusal('x', t)), Array(4).fill('kind'), 'types of refused kinds');
  same([types.claimRefusal('ticket', ''), types.claimRefusal('a.pdf', 'application/octet-stream'), types.claimRefusal('a.md', 'text/plain')], [null, null, null], 'no extension, a type that says nothing, and Markdown as text/plain are fine');
  same([types.claimedType('a.mp4', ''), types.claimedType('x', 'image/png'), types.claimedType('x', ''), types.claimedType('x', 'text/plain')], ['video/mp4', 'image/png', null, null], 'the claimed type for the early limit');
  same([types.mismatch('application/pdf', 'ticket.exe', ''), types.mismatch('application/pdf', 'ticket.jpg', ''), types.mismatch('application/pdf', 'ticket', 'image/png')], [true, true, true], 'a PDF under another name or type is a mismatch');
  same([types.mismatch('application/pdf', 'ticket.PDF', 'application/pdf'), types.mismatch('image/jpeg', 'a.jpeg', 'image/jpeg'), types.mismatch('text/markdown', 'a.md', 'text/plain'), types.mismatch('video/quicktime', 'IMG_1.MOV', 'video/quicktime')], [false, false, false, false], 'the right ones are not');
  same(Object.fromEntries(Object.entries(types.LIMITS).map(([k, v]) => [k, v.bytes / 1048576])), { image: 25, audio: 200, video: 2048, pdf: 100, markdown: 1 }, 'the limits: 25 MB, 200 MB, 2 GB, 100 MB, 1 MB');

  // Pictures too large to draw, from the header.
  same([types.picturePixels(pngOf(20000, 6000), 'image/png'), types.picturePixels(gifOf(300, 200), 'image/gif'), types.picturePixels(jpegOf(4000, 3000), 'image/jpeg'), types.picturePixels(webpOf(), 'image/webp')], [120000000, 60000, 12000000, 100], 'pixels from PNG, GIF, JPEG and WebP headers');
  ok(types.picturePixels(pngOf(20000, 6000), 'image/png') > types.MAX_PIXELS, 'over 100 million is over the limit');

  // PDF active content, read as a stream.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-vault-pdf-'));
  const scan = async (bytes) => { const f = path.join(dir, `p${n}`); fs.writeFileSync(f, bytes); return types.pdfActiveContent(f); };
  same(await scan(pdfOf()), null, 'a plain PDF passes');
  for (const name of ['JavaScript', 'JS', 'Launch', 'EmbeddedFile', 'RichMedia', 'XFA']) same(await scan(pdfOf(`/OpenAction << /S /${name} (x) >>`)), name, `/${name} is refused`);
  same(await scan(pdfOf('/OpenAction << /S /J#61vaScript >>')), 'JavaScript', 'a name written with #xx escapes too');
  same(await scan(pdfOf('/JSON (fine) /JSX 1')), null, '/JSON is not /JS');
  const straddle = Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(1024 * 1024 - 14, 0x20), Buffer.from('/JavaScript (x)\n')]);
  same(await scan(straddle), 'JavaScript', 'a name across the 1 MB window is found');
  same(await scan(Buffer.concat([Buffer.from('%PDF-1.7\n'), Buffer.alloc(3 * 1024 * 1024, 0x41), Buffer.from(' /Launch')])), 'Launch', 'at the end of a larger file');
  fs.rmSync(dir, { recursive: true, force: true });

  // Markdown's text.
  same([types.markdownRefusal(Buffer.from('# Day one\n*sun*')), types.markdownRefusal(Buffer.from([0x23, 0x20, 0xc3, 0x28])), types.markdownRefusal(Buffer.from('a\0b')), types.markdownRefusal(Buffer.from('  <!DOCTYPE html><p>x')), types.markdownRefusal(Buffer.from('<svg onload=1>'))], [null, 'kind', 'kind', 'kind', 'kind'], 'Markdown: UTF-8, no NUL, not a page or a drawing');
}

// --- a throwaway server -------------------------------------------------------------------------------------------------
const base = fs.mkdtempSync(path.join(os.tmpdir(), 'check-vault-'));
// A module that declares `library`, as the Vault will: the four permissions (guest defaults asked for, and turned off
// by the host), and the owner's two lower quotas.
function shelfZip() {
  const root = path.join(base, 'mods', 'shelf');
  fs.mkdirSync(path.join(root, 'src'), { recursive: true });
  fs.writeFileSync(path.join(root, 'module.json'), JSON.stringify({
    id: 'shelf', name: 'Shelf', version: '1.0.0', scope: ['space'], icon: 'circle',
    surfaces: { canvas: { entry: 'shelf.html' } },
    library: true,
    permissions: [
      { key: 'view', label: 'See the files', default: { member: true, moderator: true, guest: true } },
      { key: 'add', label: 'Add files', default: { member: true, moderator: true, guest: true } },
      { key: 'download', label: 'Download files', default: { member: true, moderator: true, guest: true } },
      { key: 'remove_any', label: 'Remove files other people added', default: { member: false, moderator: true } },
    ],
    access: { read: 'view', write: 'add' },
    refs: { produces: [{ kind: 'file', name: 'File', key: 'file:{id}', summary: { title: 'name', category: 'group' }, open: true, backlinks: true }] },
    settings: [
      { key: 'spaceMaxGb', label: 'Most for one space, in GB', type: 'number', scope: 'environment', min: 0, default: 0 },
      { key: 'personMaxGb', label: 'Most for one person, in GB', type: 'number', scope: 'environment', min: 0, default: 0 },
    ],
  }));
  fs.writeFileSync(path.join(root, 'src', 'shelf.html'), '<!DOCTYPE html><html><head><style>/*__CSS__*/</style></head><body><script>/*__JS__*/</script></body></html>');
  fs.writeFileSync(path.join(root, 'src', 'shelf.css'), '');
  fs.writeFileSync(path.join(root, 'src', 'shelf.js'), '');
  return buildModule(root).zip;
}

async function startServer(name, env) {
  const dataDir = path.join(base, `${name}-data`);
  const vaultDir = path.join(base, `${name}-vault`);
  const child = spawn(process.execPath, [path.join(ROOT, 'server', 'index.js')], {
    cwd: ROOT,
    env: { PATH: process.env.PATH, HOME: process.env.HOME, PORT: '0', DATA_DIR: dataDir, VAULT_DIR: vaultDir, ADMIN_PASSWORD: 'testpass1234', TRUST_PROXY_HOPS: '0', ...env },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  let out = '';
  child.stdout.on('data', (d) => { out += d; });
  child.stderr.on('data', (d) => { out += d; });
  const port = await new Promise((resolve, reject) => {
    const timer = setTimeout(() => { child.kill(); reject(new Error(`the server did not start in time:\n${out}`)); }, 25000);
    const onData = () => { const m = /listening on :(\d+)/.exec(out); if (m) { clearTimeout(timer); resolve(Number(m[1])); } };
    child.stdout.on('data', onData);
    child.stderr.on('data', onData);
    child.once('exit', (code) => { clearTimeout(timer); reject(new Error(`the server stopped (${code}):\n${out}`)); });
  });
  const stop = () => new Promise((resolve) => { if (child.exitCode !== null) return resolve(); child.once('exit', resolve); child.kill('SIGTERM'); });
  const rss = () => { try { return Number(fs.readFileSync(`/proc/${child.pid}/status`, 'utf8').match(/VmRSS:\s+(\d+)/)?.[1] || 0) / 1024; } catch { return 0; } };
  return { port, dataDir, vaultDir, stop, rss, out: () => out, pid: child.pid };
}

// One request: { status, headers, bytes, json, text }. `cookie` is a session token; `host` a Host header; `body` a
// Buffer (its Content-Length set unless `headers` names one).
function send(server, method, urlPath, { cookie, headers = {}, body, host } = {}) {
  return new Promise((resolve, reject) => {
    const h = { accept: 'application/json', ...headers };
    if (cookie) h.cookie = `app_session=${cookie}`;
    if (host) h.host = host;
    if (body !== undefined && h['content-length'] === undefined && h['transfer-encoding'] === undefined) h['content-length'] = String(body.length);
    const req = http.request({ host: '127.0.0.1', port: server.port, method, path: urlPath, headers: h }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const bytes = Buffer.concat(chunks);
        let json = null;
        try { json = JSON.parse(bytes.toString()); } catch { /* bytes */ }
        resolve({ status: res.statusCode, headers: res.headers, bytes, json, text: bytes.toString().slice(0, 400), cookies: (res.headers['set-cookie'] || []).map((c) => c.split(';')[0]) });
      });
      res.on('error', reject);
    });
    req.on('error', (err) => resolve({ status: 0, error: err.code || err.message, headers: {}, bytes: Buffer.alloc(0), json: null, text: '' }));
    if (body !== undefined) req.write(body);
    req.end();
  });
}
// A request whose body the check writes itself: { req, answer } where `answer` resolves with the response (or the
// error) as send does; nothing is written until the check writes it.
function open(server, method, urlPath, { cookie, headers = {} } = {}) {
  const h = { accept: 'application/json', ...headers };
  if (cookie) h.cookie = `app_session=${cookie}`;
  const req = http.request({ host: '127.0.0.1', port: server.port, method, path: urlPath, headers: h });
  const answer = new Promise((resolve) => {
    req.on('response', (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => { const bytes = Buffer.concat(chunks); let json = null; try { json = JSON.parse(bytes.toString()); } catch { /* bytes */ } resolve({ status: res.statusCode, headers: res.headers, bytes, json }); });
      res.on('error', () => resolve({ status: res.statusCode, headers: res.headers, json: null }));
    });
    req.on('error', (err) => resolve({ status: 0, error: err.code || err.message }));
  });
  req.flushHeaders();
  return { req, answer };
}
const quiet = (ms) => new Promise((r) => setTimeout(r, ms));
// Every file under a folder (relative names), for "nothing was written" and "no part was left".
function filesUnder(dir) {
  const out = [];
  const walk = (d) => { let es = []; try { es = fs.readdirSync(d, { withFileTypes: true }); } catch { return; } for (const e of es) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p); else out.push(path.relative(dir, p)); } };
  walk(dir);
  return out.sort();
}
const partsUnder = (dir) => filesUnder(dir).filter((f) => path.basename(f).startsWith('.part-'));

let failed = false;
const servers = [];
try {
  // Server A: small quotas, so they can be filled; a minute's allowance of 4 MB.
  const A = await startServer('a', { VAULT_SPACE_MAX_GB: String(40 / 1024), VAULT_PERSON_MAX_GB: String(30 / 1024), VAULT_MAX_GB: String(60 / 1024), VAULT_MB_PER_MINUTE: '40' });
  servers.push(A);
  const login = async (who, password) => { const r = await send(A, 'POST', '/api/login', { headers: { 'content-type': 'application/json' }, body: Buffer.from(JSON.stringify({ login: who, password })) }); assert.equal(r.status, 200, `${who} signs in: ${r.text}`); return r.json.token; };
  const json = (method, urlPath, cookie, value) => send(A, method, urlPath, { cookie, headers: { 'content-type': 'application/json' }, body: Buffer.from(JSON.stringify(value)) });
  const admin = await login('admin', 'testpass1234');
  const people = {};
  for (const who of ['pat', 'sam', 'mo', 'lou', 'rae', 'kit']) {
    const r = await json('POST', '/api/users', admin, { login: who, displayName: who, role: 'member', password: 'memberpass1234' });
    assert.equal(r.status, 201, r.text);
    people[who] = { key: r.json.user.key, token: await login(who, 'memberpass1234') };
  }
  const members = ['pat', 'sam', 'mo', 'rae', 'kit'].map((w) => people[w].key);
  const trip = (await json('POST', '/api/spaces', admin, { name: 'Rome', members })).json.space;
  const other = (await json('POST', '/api/spaces', admin, { name: 'Oslo', members: [people.lou.key] })).json.space;
  await json('PATCH', `/api/spaces/${trip.id}`, admin, { members });
  await json('PATCH', `/api/spaces/${other.id}`, admin, { members: [people.lou.key] });
  assert.equal((await json('PATCH', `/api/users/${people.mo.key}/spaces/${trip.id}`, admin, { permissions: { moderator: true } })).status, 200);
  const up = await send(A, 'POST', '/api/modules', { cookie: admin, headers: { 'content-type': 'application/zip' }, body: shelfZip() });
  same(up.status, 201, `a module that declares library installs: ${up.text}`);
  same((await json('PATCH', '/api/modules/shelf', admin, { enabled: true, allSpaces: true })).status, 200, 'and turns on');
  const roles = (await send(A, 'GET', '/api/roles', { cookie: admin })).json.roles;
  same(['view', 'add', 'download', 'remove_any'].map((k) => roles.guest[`module.shelf.${k}`]), [false, false, false, false], 'its library permissions are off for guests, whatever the manifest asked');
  same(['view', 'add', 'download', 'remove_any'].map((k) => roles.member[`module.shelf.${k}`]), [true, true, true, false], 'and as asked for members');
  const guestToken = (await json('POST', `/api/spaces/${trip.id}/guest-link`, admin, {})).json.space.guestToken;
  const streamKey = (await send(A, 'GET', '/api/me', { cookie: admin })).json.streamKey;
  const spaceDir = path.join(A.vaultDir, '_default', `space-${trip.id}`);
  const lib = (q = '') => `/api/modules/shelf/library?space=${trip.id}${q}`;
  const add = (who, name, body, { type, q = '' } = {}) => send(A, 'POST', lib(`&name=${encodeURIComponent(name)}${q}`), { cookie: people[who]?.token || who, headers: { 'content-type': type || 'application/octet-stream' }, body });

  // --- piece 3: uploads ---------------------------------------------------------------------------------------------
  const kept = {};
  for (const [label, who, name, bytes, type, want] of [
    ['a JPEG', 'pat', 'beach.jpg', jpegOf(), 'image/jpeg', ['image/jpeg', 'image', 'beach.jpg']],
    ['a PNG', 'pat', 'map.png', pngOf(3, 2), 'image/png', ['image/png', 'image', 'map.png']],
    ['a WebP', 'pat', 'sky.webp', webpOf(), 'image/webp', ['image/webp', 'image', 'sky.webp']],
    ['a GIF', 'pat', 'wave.gif', gifOf(), 'image/gif', ['image/gif', 'image', 'wave.gif']],
    ['an MP3', 'sam', 'song.mp3', mp3Of(), 'audio/mpeg', ['audio/mpeg', 'audio', 'song.mp3']],
    ['an OGG', 'sam', 'birds.ogg', oggOf(), 'audio/ogg', ['audio/ogg', 'audio', 'birds.ogg']],
    ['a WAV', 'sam', 'bell.wav', riffOf('WAVE'), 'audio/x-wav', ['audio/wav', 'audio', 'bell.wav']],
    ['an M4A', 'sam', 'talk.m4a', ftypOf('M4A ', ['isom']), 'audio/x-m4a', ['audio/mp4', 'audio', 'talk.m4a']],
    ['an MP4', 'sam', 'walk.mp4', ftypOf('isom', ['mp42']), 'video/mp4', ['video/mp4', 'video', 'walk.mp4']],
    ['a WebM', 'sam', 'clip.webm', ebmlOf('webm'), 'video/webm', ['video/webm', 'video', 'clip.webm']],
    ['a MOV', 'sam', 'IMG_0001.MOV', ftypOf('qt  '), 'video/quicktime', ['video/quicktime', 'video', 'IMG_0001.MOV']],
    ['a PDF', 'pat', 'ticket', pdfOf(), 'application/pdf', ['application/pdf', 'document', 'ticket.pdf']],
    ['Markdown', 'pat', 'notes.md', Buffer.from('# Day one\n<script>alert(1)</script>\n'), 'text/markdown', ['text/markdown', 'document', 'notes.md']],
  ]) {
    const r = await add(who, name, bytes, { type });
    same([r.status, r.json?.file?.type, r.json?.file?.group, r.json?.file?.name], [201, ...want], `${label} is kept from its bytes: ${r.text}`);
    kept[want[0]] = r.json.file;
  }
  const v = kept['application/pdf'];
  same(Object.keys(v).sort(), ['at', 'by', 'group', 'hasThumb', 'id', 'name', 'size', 'type', 'uses'], 'a file\'s view');
  same([v.by, v.size, v.hasThumb, v.uses], [people.pat.key, pdfOf().length, false, 0], 'who added it, its size, no thumbnail, no links');
  ok(/^[a-f0-9]{24}$/.test(v.id) && fs.existsSync(path.join(spaceDir, `${v.id}.bin`)), 'its bytes are VAULT_DIR/_default/space-<id>/<id>.bin on a single install');
  same(fs.readFileSync(path.join(spaceDir, `${v.id}.bin`)), pdfOf(), 'kept as sent');
  const recs = JSON.parse(fs.readFileSync(path.join(A.dataDir, 'modules', 'shelf', 'library', `space-${trip.id}.json`), 'utf8'));
  same([recs[v.id].sha256, recs[v.id].name], [require('node:crypto').createHash('sha256').update(pdfOf()).digest('hex'), 'ticket.pdf'], 'its record, with its SHA-256, in DATA_DIR');
  ok(!filesUnder(A.dataDir).some((f) => f.endsWith('.bin')), 'no bytes under DATA_DIR');

  // Pictures: where it was taken goes unless the person keeps it; what rides along goes either way.
  const jpg = fs.readFileSync(path.join(spaceDir, `${kept['image/jpeg'].id}.bin`));
  ok(!jpg.includes(Buffer.from('Acme')) && !jpg.includes(Buffer.from('2026:09')), 'a JPEG loses its EXIF by default, so where it was taken');
  same(kept['image/jpeg'].taken, '2026-09-21T14:30:05', 'and its taken time is in the record');
  const keptPos = await add('pat', 'pos.jpg', jpegOf(), { type: 'image/jpeg', q: '&keepPosition=1' });
  same(keptPos.status, 201, 'keepPosition=1 keeps it');
  ok(fs.readFileSync(path.join(spaceDir, `${keptPos.json.file.id}.bin`)).includes(Buffer.from('Acme')), 'with its EXIF');
  ok(!fs.readFileSync(path.join(spaceDir, `${kept['image/png'].id}.bin`)).includes(Buffer.from('hidden words')), 'a PNG loses its text');

  // Refused, with the sentence that says why, and nothing kept.
  const before = filesUnder(spaceDir);
  for (const [label, name, bytes, type, status, sentence] of [
    ['SVG', 'x.svg', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'), 'image/svg+xml', 400, /That kind of file can't be added here\. It takes pictures/],
    ['SVG under a .png name', 'x.png', Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"><script>1</script></svg>'), 'image/png', 400, /That kind of file/],
    ['HTML as Markdown', 'x.md', Buffer.from('<!doctype html><script>1</script>'), 'text/markdown', 400, /That kind of file/],
    ['HTML', 'x.html', Buffer.from('<html><script>1</script></html>'), 'text/html', 400, /That kind of file/],
    ['a zip', 'x.zip', Buffer.from('PK\x03\x04\x14\0\0\0\0\0', 'latin1'), 'application/zip', 400, /That kind of file/],
    ['a zip with no name', 'x', Buffer.from('PK\x03\x04\x14\0\0\0\0\0', 'latin1'), 'application/octet-stream', 400, /That kind of file/],
    ['HEIC by name', 'IMG_2.HEIC', ftypOf('heic', ['mif1']), 'image/heic', 400, /^HEIC pictures can't be added here\. Save it as a JPEG\.$/],
    ['HEIC under a .jpg name', 'IMG_2.jpg', ftypOf('heic', ['mif1']), 'image/jpeg', 400, /Save it as a JPEG/],
    ['Matroska', 'film.mkv', ebmlOf('matroska'), 'video/x-matroska', 400, /That kind of file/],
    ['a PDF named .exe', 'ticket.exe', pdfOf(), 'application/octet-stream', 400, /That kind of file/],
    ['a PDF named .jpg', 'ticket.jpg', pdfOf(), 'image/jpeg', 400, /^That file's name or type doesn't match what is in it\.$/],
    ['a PDF sent as a PNG', 'ticket', pdfOf(), 'image/png', 400, /doesn't match/],
    ['a JPEG named .png', 'beach.png', jpegOf(), 'image/png', 400, /doesn't match/],
    ['a PDF with JavaScript', 'evil.pdf', pdfOf('/OpenAction << /S /JavaScript /JS (app.alert(1)) >>'), 'application/pdf', 400, /^That PDF holds scripts or other active content, so it can't be added\.$/],
    ['a PDF that launches', 'evil.pdf', pdfOf('/OpenAction << /S /Launch /F (calc.exe) >>'), 'application/pdf', 400, /active content/],
    ['a picture too large to draw', 'huge.png', pngOf(20000, 6000), 'image/png', 400, /^That picture is too large to show\.$/],
    ['a JPEG cut short', 'cut.jpg', jpegOf().subarray(0, 60), 'image/jpeg', 400, /^That picture is damaged or cut short\.$/],
    ['text that is not Markdown', 'notes.txt', Buffer.from('# hi'), 'text/plain', 400, /That kind of file/],
    ['Markdown that is not UTF-8', 'bad.md', Buffer.from([0x23, 0x20, 0xc3, 0x28]), 'text/markdown', 400, /That kind of file/],
  ]) {
    const r = await add('rae', name, bytes, { type });
    ok(r.status === status && sentence.test(r.json?.error || ''), `${label} is refused (${status}): ${r.status} ${r.text}`);
  }
  same(filesUnder(spaceDir), before, 'nothing was kept for any of them, and no part was left');
  same((await add('rae', '', pdfOf())).json?.error, 'Name the file in ?name=.', 'no name: 400');
  same((await add('rae', 'empty.pdf', Buffer.alloc(0))).status, 400, 'an empty body: 400');
  const chunked = await send(A, 'POST', lib('&name=a.pdf'), { cookie: people.rae.token, headers: { 'content-type': 'application/pdf', 'transfer-encoding': 'chunked' }, body: pdfOf() });
  same([chunked.status, chunked.json?.error], [411, 'Send the file with its size (Content-Length).'], 'no Content-Length: 411');

  // Sizes from Content-Length, before the body: a picture over 25 MB is refused at once and nothing is written.
  const MB = 1024 * 1024;
  const mp4Of = (bytes) => Buffer.concat([ftypOf('isom', ['mp42']), Buffer.alloc(bytes - ftypOf('isom', ['mp42']).length, 7)]);
  {
    const big = open(A, 'POST', lib('&name=big.png'), { cookie: people.pat.token, headers: { 'content-type': 'image/png', 'content-length': String(26 * MB) } });
    const r = await big.answer;
    same([r.status, r.json?.error], [413, 'That file is over the 25 MB limit for pictures.'], 'a 26 MB picture is refused from its Content-Length');
    big.req.destroy();
    same(partsUnder(A.vaultDir), [], 'before any byte was written: no part file');
    const huge = open(A, 'POST', lib('&name=film'), { cookie: people.pat.token, headers: { 'content-type': 'application/octet-stream', 'content-length': String(3 * 1024 * MB) } });
    same((await huge.answer).json?.error, 'That file is over the 2 GB limit for video.', 'over 2 GB with no type said: refused at once');
    huge.req.destroy();
    const pdf = open(A, 'POST', lib('&name=a.pdf'), { cookie: people.pat.token, headers: { 'content-type': 'application/pdf', 'content-length': String(101 * MB) } });
    same((await pdf.answer).json?.error, 'That file is over the 100 MB limit for PDFs.', 'a PDF over 100 MB');
    pdf.req.destroy();
    const md = open(A, 'POST', lib('&name=a.md'), { cookie: people.pat.token, headers: { 'content-type': 'text/markdown', 'content-length': String(2 * MB) } });
    same((await md.answer).json?.error, 'That file is over the 1 MB limit for Markdown.', 'Markdown over 1 MB');
    md.req.destroy();
  }
  // A body that says nothing of its type is refused once its first bytes say it is a picture over 25 MB, without the rest.
  {
    const sneaky = open(A, 'POST', lib('&name=photo'), { cookie: people.kit.token, headers: { 'content-type': 'application/octet-stream', 'content-length': String(26 * MB) } });
    sneaky.req.write(Buffer.concat([pngOf(2, 2), Buffer.alloc(8192)]));
    const r = await sneaky.answer;
    same([r.status, r.json?.error], [413, 'That file is over the 25 MB limit for pictures.'], 'a 26 MB PNG with no name or type said is refused from its first bytes');
    sneaky.req.destroy();
    await quiet(200);
    same(partsUnder(A.vaultDir), [], 'and its part is gone');
  }
  // A body longer than its Content-Length: only what it declared is read as the file.
  {
    const r = await send(A, 'POST', lib('&name=short.pdf'), { cookie: people.pat.token, headers: { 'content-type': 'application/pdf', 'content-length': String(pdfOf().length) }, body: Buffer.concat([pdfOf(), Buffer.from('GARBAGE AFTER THE END'.repeat(10))]) });
    await quiet(300);
    const listed = (await send(A, 'GET', lib(), { cookie: people.pat.token })).json.files.find((f) => f.name === 'short.pdf');
    same([r.status === 201 || r.status === 400, listed?.size], [true, pdfOf().length], 'a body longer than its Content-Length is cut off at it (what follows is not a request, so the server answers 400 to it)');
  }
  // An upload cut off part way: its part goes, and what it reserved is free again.
  {
    const cut = open(A, 'POST', lib('&name=cut.mp4'), { cookie: people.mo.token, headers: { 'content-type': 'video/mp4', 'content-length': String(10 * MB) } });
    cut.req.write(mp4Of(1 * MB));
    await quiet(300);
    same(partsUnder(A.vaultDir).length, 1, 'an upload arriving has a part file');
    cut.req.destroy();
    await cut.answer;
    await quiet(400);
    same(partsUnder(A.vaultDir), [], 'cut off, its part is removed');
  }
  // Two uploads at once reserve against one quota: the second is refused while the first is still arriving.
  {
    const first = open(A, 'POST', lib('&name=first.mp4'), { cookie: people.sam.token, headers: { 'content-type': 'video/mp4', 'content-length': String(20 * MB) } });
    const body = mp4Of(20 * MB);
    first.req.write(body.subarray(0, MB));
    await quiet(200);
    const second = await add('sam', 'second.mp4', mp4Of(12 * MB), { type: 'video/mp4' });
    same([second.status, second.json?.error], [413, 'You have used your 30 MB in Shelf. Remove some of your files to add more.'], 'a second upload that would pass the person\'s quota with the first: 413');
    first.req.end(body.subarray(MB));
    same((await first.answer).status, 201, 'the first is kept');
    same((await add('sam', 'third.mp4', mp4Of(12 * MB), { type: 'video/mp4' })).status, 413, 'and then counts on disk');
  }
  // Two uploads at once for one person; a third waits.
  {
    const a1 = open(A, 'POST', lib('&name=a1.mp4'), { cookie: people.pat.token, headers: { 'content-type': 'video/mp4', 'content-length': String(MB) } });
    const a2 = open(A, 'POST', lib('&name=a2.mp4'), { cookie: people.pat.token, headers: { 'content-type': 'video/mp4', 'content-length': String(MB) } });
    const body = mp4Of(MB);
    a1.req.write(body.subarray(0, 8192));
    a2.req.write(body.subarray(0, 8192));
    await quiet(300);
    const a3 = await add('pat', 'a3.mp4', mp4Of(MB), { type: 'video/mp4' });
    same([a3.status, a3.json?.error, a3.headers['retry-after']], [429, 'Another upload is still running. Wait for it to finish.', '5'], 'a third upload at once: 429');
    a1.req.end(body.subarray(8192));
    a2.req.end(body.subarray(8192));
    same([(await a1.answer).status, (await a2.answer).status], [201, 201], 'the two finish');
    same((await add('pat', 'a3.mp4', mp4Of(MB), { type: 'video/mp4' })).status, 201, 'then another may start');
  }
  // The space's quota (40 MB here), the owner's lower person quota, the server's total (60 MB).
  {
    same((await add('pat', 'big.mp4', mp4Of(14 * MB), { type: 'video/mp4' })).status, 201, 'the space fills up');
    const full = await add('mo', 'more.mp4', mp4Of(5 * MB), { type: 'video/mp4' });
    same([full.status, full.json?.error], [413, 'This space\'s Shelf is full (40 MB). Remove some files to add more.'], 'a space that is full: 413');
    const set = await json('PUT', '/api/modules/shelf/settings/environment', admin, { values: { personMaxGb: 0.01 } });
    same(set.status, 200, `the owner sets a lower person quota: ${set.text}`);
    const lower = await add('rae', 'tiny.gif', gifOf(), { type: 'image/gif' });
    same(lower.status, 201, 'someone under it still adds');
    const overLower = await send(A, 'POST', `/api/modules/shelf/library?space=${other.id}&name=x.mp4`, { cookie: people.lou.token, headers: { 'content-type': 'video/mp4' }, body: mp4Of(11 * MB) });
    same([overLower.status, overLower.json?.error], [413, 'You have used your 10.2 MB in Shelf. Remove some of your files to add more.'], 'the owner\'s lower quota holds');
    await json('PUT', '/api/modules/shelf/settings/environment', admin, { values: { personMaxGb: 0 } });
    const inOther = (who, name, bytes) => send(A, 'POST', `/api/modules/shelf/library?space=${other.id}&name=${name}`, { cookie: people[who].token, headers: { 'content-type': 'video/mp4' }, body: bytes });
    same((await inOther('lou', 'x.mp4', mp4Of(20 * MB))).status, 201, 'another space still takes files');
    const total = await inOther('lou', 'y.mp4', mp4Of(5 * MB));
    same([total.status, total.json?.error], [413, 'The server\'s file storage is full. Ask the admin.'], 'the server\'s total (VAULT_MAX_GB): 413');
  }
  // The minute's allowance (40 MB here), counted from Content-Length when an upload starts.
  {
    const r = await send(A, 'POST', `/api/modules/shelf/library?space=${trip.id}&name=late.mp4`, { cookie: people.kit.token, headers: { 'content-type': 'video/mp4' }, body: mp4Of(15 * MB) });
    ok(r.status === 429 && /^You have sent a lot in the last minute\. Wait \d+ seconds and try again\.$/.test(r.json?.error) && Number(r.headers['retry-after']) > 0, `over VAULT_MB_PER_MINUTE: 429 with Retry-After (${r.status} ${r.text})`);
  }
  // The module's own upload limit: 30 a minute for one person.
  {
    let got = null;
    for (let i = 0; i < 32 && !got; i += 1) {
      const r = await add('rae', `g${i}.gif`, gifOf(), { type: 'image/gif' });
      if (r.status === 429) got = r;
    }
    ok(got && /doing that too often/.test(got.json.error), 'the module upload limit (30 a minute) holds');
  }
  same(partsUnder(A.vaultDir), [], 'no part file is left after any of it');

  // Who may add, decided before the body: nothing is read or written for a refusal.
  {
    const asks = [
      ['signed out', {}, 401, 'Sign in first.'],
      ['a guest pass', { q: `&guest=${guestToken}` }, 403, 'Guests can\'t use Shelf.'],
      ['the access key', { headers: { 'x-stream-key': streamKey } }, 403, 'The access key can\'t open Shelf.'],
      ['someone not in the space', { cookie: people.lou.token }, 403, 'Shelf is not on in this space for you.'],
      ['no such space', { cookie: people.pat.token, space: 'nosuch1' }, 404, 'There is no such space.'],
    ];
    for (const [who, o, status, error] of asks) {
      const u = open(A, 'POST', `/api/modules/shelf/library?space=${o.space || trip.id}&name=x.mp4${o.q || ''}`, { cookie: o.cookie, headers: { 'content-type': 'video/mp4', 'content-length': String(5 * MB), ...(o.headers || {}) } });
      const r = await u.answer;
      same([r.status, r.json?.error], [status, error], `${who}: ${status} before the body`);
      u.req.destroy();
    }
    await json('PATCH', '/api/roles/member', admin, { 'module.shelf.add': false });
    const noAdd = await add('rae', 'x.gif', gifOf(), { type: 'image/gif' });
    same([noAdd.status, noAdd.json?.error], [403, 'Your role can\'t do that in Shelf.'], 'a member whose role may not add: 403');
    same((await add('mo', 'mod.gif', gifOf(), { type: 'image/gif' })).status, 201, 'a moderator still may (the moderator role keeps add)');
    await json('PATCH', '/api/roles/member', admin, { 'module.shelf.add': true });
    same((await send(A, 'POST', '/api/modules/nosuch/library?space=x&name=a.pdf', { cookie: people.pat.token, body: pdfOf() })).status, 404, 'no such module: 404');
    same(partsUnder(A.vaultDir), [], 'nothing written for any refusal');
  }
  // --- end of server A ---
  await A.stop();
} catch (err) {
  failed = true;
  console.error(err);
  for (const s of servers) console.error(`--- server output ---\n${s.out().slice(-3000)}`);
} finally {
  for (const s of servers) await s.stop();
  fs.rmSync(base, { recursive: true, force: true });
}
if (failed) process.exit(1);

console.log(`check-vault: ${n} checks OK`);
