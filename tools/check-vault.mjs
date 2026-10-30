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
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
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

console.log(`check-vault: ${n} checks OK`);
