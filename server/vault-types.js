// What a library module's file is (documentation/plans/plan-attachments-vault.md, section 1): decided from its own first
// bytes, never from its name or the type it was sent with, then compared with both. A file whose name or type says
// something else is refused, and so is anything not in the table: SVG, HTML, XML, scripts, programs, archives, Office
// files, Matroska and HEIC. The server never opens, decodes or runs a file; it reads a few header bytes, a picture's
// size from its header, a PDF's names as a stream, and a Markdown file's text. Sentences are the caller's (they need the
// environment's words); this file answers what was found.
'use strict';

const fs = require('fs');

const MB = 1024 * 1024;
// The limit each kind of file has, and the word for it in "That file is over the 25 MB limit for pictures."
const LIMITS = {
  image: { bytes: 25 * MB, words: 'pictures' },
  audio: { bytes: 200 * MB, words: 'audio' },
  video: { bytes: 2048 * MB, words: 'video' },
  pdf: { bytes: 100 * MB, words: 'PDFs' },
  markdown: { bytes: 1 * MB, words: 'Markdown' },
};
const MAX_BYTES = Math.max(...Object.values(LIMITS).map((l) => l.bytes));
// The head read to decide a type: a WebM's DocType is somewhere in its first 4 KB.
const HEAD_BYTES = 4096;
// A picture whose header says more than this many pixels is refused, so no viewer is handed a decompression bomb.
const MAX_PIXELS = 100 * 1000 * 1000;

// type -> { group (what the list shows), limit (a key of LIMITS), exts (the first is the one a name is given),
// claims (the types a browser may send it as) }
const TYPES = {
  'image/jpeg': { group: 'image', limit: 'image', exts: ['jpg', 'jpeg'], claims: ['image/jpeg', 'image/jpg', 'image/pjpeg'] },
  'image/png': { group: 'image', limit: 'image', exts: ['png'], claims: ['image/png', 'image/apng', 'image/x-png'] },
  'image/webp': { group: 'image', limit: 'image', exts: ['webp'], claims: ['image/webp'] },
  'image/gif': { group: 'image', limit: 'image', exts: ['gif'], claims: ['image/gif'] },
  'audio/mpeg': { group: 'audio', limit: 'audio', exts: ['mp3'], claims: ['audio/mpeg', 'audio/mp3', 'audio/mpeg3', 'audio/x-mpeg', 'audio/x-mp3'] },
  'audio/ogg': { group: 'audio', limit: 'audio', exts: ['ogg', 'oga'], claims: ['audio/ogg', 'application/ogg', 'audio/x-ogg', 'audio/vorbis', 'audio/opus'] },
  'audio/wav': { group: 'audio', limit: 'audio', exts: ['wav'], claims: ['audio/wav', 'audio/x-wav', 'audio/wave', 'audio/vnd.wave'] },
  'audio/mp4': { group: 'audio', limit: 'audio', exts: ['m4a'], claims: ['audio/mp4', 'audio/x-m4a', 'audio/m4a'] },
  'video/mp4': { group: 'video', limit: 'video', exts: ['mp4'], claims: ['video/mp4', 'application/mp4'] },
  'video/webm': { group: 'video', limit: 'video', exts: ['webm'], claims: ['video/webm', 'audio/webm'] },
  'video/quicktime': { group: 'video', limit: 'video', exts: ['mov'], claims: ['video/quicktime'] },
  'application/pdf': { group: 'document', limit: 'pdf', exts: ['pdf'], claims: ['application/pdf', 'application/x-pdf'] },
  'text/markdown': { group: 'document', limit: 'markdown', exts: ['md'], claims: ['text/markdown', 'text/x-markdown', 'text/plain'] },
};
// What a browser sends for a file it has no type for: says nothing, so never a mismatch.
const SAYS_NOTHING = ['', 'application/octet-stream', 'binary/octet-stream'];
const HEIC_EXTS = ['heic', 'heif', 'hif'];
const HEIC_CLAIMS = ['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence'];
const HEIC_BRANDS = ['heic', 'heix', 'heim', 'heis', 'hevc', 'hevx', 'hevm', 'hevs', 'mif1', 'msf1'];
const ISO_BRANDS = ['isom', 'iso2', 'mp41', 'mp42', 'avc1', 'dash'];

const ext = (name) => (/\.([A-Za-z0-9]{1,8})$/.exec(String(name || ''))?.[1] || '').toLowerCase();
const claimOf = (contentType) => String(contentType || '').split(';')[0].trim().toLowerCase();

// Before the body: whether the name and the type it is sent with could be a file the Vault takes. Answers null, 'heic'
// or 'kind' (any other refusal).
function claimRefusal(name, contentType) {
  const e = ext(name);
  const c = claimOf(contentType);
  if (HEIC_EXTS.includes(e) || HEIC_CLAIMS.includes(c)) return 'heic';
  if (e && !Object.values(TYPES).some((t) => t.exts.includes(e))) return 'kind';
  if (!SAYS_NOTHING.includes(c) && !Object.values(TYPES).some((t) => t.claims.includes(c))) return 'kind';
  return null;
}

// Before the body: the type the name (or else the type sent) points to, for the limit to check Content-Length against;
// null when neither says.
function claimedType(name, contentType) {
  const e = ext(name);
  const c = claimOf(contentType);
  return Object.keys(TYPES).find((t) => TYPES[t].exts.includes(e)) || Object.keys(TYPES).find((t) => TYPES[t].claims.includes(c) && c !== 'text/plain') || null;
}

// Once the type is known from the bytes: whether the name's extension or the type sent says another one.
function mismatch(type, name, contentType) {
  const t = TYPES[type];
  const e = ext(name);
  const c = claimOf(contentType);
  return Boolean((e && !t.exts.includes(e)) || (!SAYS_NOTHING.includes(c) && !t.claims.includes(c)));
}

// The ftyp box's brands: [major, ...compatible], or null.
function ftypBrands(b) {
  if (b.length < 16 || b.toString('latin1', 4, 8) !== 'ftyp') return null;
  const size = Math.min(b.readUInt32BE(0), b.length);
  const out = [b.toString('latin1', 8, 12)];
  for (let i = 16; i + 4 <= size; i += 4) out.push(b.toString('latin1', i, i + 4));
  return out;
}

// A WebM's EBML header names its DocType: 'webm', 'matroska' (refused) or null.
function ebmlDocType(b) {
  const head = b.subarray(0, HEAD_BYTES);
  for (let i = 4; i + 3 < head.length; i += 1) {
    if (head[i] !== 0x42 || head[i + 1] !== 0x82) continue;
    const s = head[i + 2];
    if (!(s & 0x80)) continue;
    const len = s & 0x7f;
    return head.toString('latin1', i + 3, i + 3 + len);
  }
  return null;
}

// What the first bytes are: { type } for a type the Vault takes, else { refuse: 'heic' | 'kind' }. `name` decides only
// Markdown, which has no bytes of its own to know it by.
function sniff(b, name) {
  if (!Buffer.isBuffer(b) || b.length < 4) return { refuse: 'kind' };
  const latin = (from, to) => b.toString('latin1', from, to);
  if (b.length >= 12 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { type: 'image/jpeg' };
  if (b.length >= 24 && b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { type: 'image/png' };
  if (b.length >= 12 && latin(0, 4) === 'RIFF' && latin(8, 12) === 'WEBP') return { type: 'image/webp' };
  if (b.length >= 12 && latin(0, 4) === 'RIFF' && latin(8, 12) === 'WAVE') return { type: 'audio/wav' };
  if (b.length >= 10 && (latin(0, 6) === 'GIF87a' || latin(0, 6) === 'GIF89a')) return { type: 'image/gif' };
  if (latin(0, 4) === 'OggS') return { type: 'audio/ogg' };
  if (b.length >= 5 && latin(0, 5) === '%PDF-') return { type: 'application/pdf' };
  const brands = ftypBrands(b);
  if (brands) {
    const [major] = brands;
    if (major === 'M4A ' || major === 'M4B ') return { type: 'audio/mp4' };
    if (major === 'qt  ') return { type: 'video/quicktime' };
    if (HEIC_BRANDS.includes(major) || (!brands.some((x) => ISO_BRANDS.includes(x)) && brands.some((x) => HEIC_BRANDS.includes(x)))) return { refuse: 'heic' };
    if (major === 'avif' || major === 'avis') return { refuse: 'kind' };
    if (brands.some((x) => ISO_BRANDS.includes(x))) return { type: 'video/mp4' };
    return { refuse: 'kind' };
  }
  if (b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return ebmlDocType(b) === 'webm' ? { type: 'video/webm' } : { refuse: 'kind' };
  if (latin(0, 3) === 'ID3') return { type: 'audio/mpeg' };
  // An MPEG audio frame: 11 bits of sync, a version that is not the reserved one, and a layer that is not 00 (00 is AAC's
  // ADTS, which is not taken).
  if (b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && (b[1] & 0x18) !== 0x08 && (b[1] & 0x06) !== 0) return { type: 'audio/mpeg' };
  if (ext(name) === 'md' && !b.includes(0)) return { type: 'text/markdown' };
  return { refuse: 'kind' };
}

// How many pixels a picture's header says it has, or null when the header can't be read. Reads the header only.
function picturePixels(b, type) {
  try {
    if (type === 'image/png') return b.toString('latin1', 12, 16) === 'IHDR' ? b.readUInt32BE(16) * b.readUInt32BE(20) : null;
    if (type === 'image/gif') return b.readUInt16LE(6) * b.readUInt16LE(8);
    if (type === 'image/webp') {
      const chunk = b.toString('latin1', 12, 16);
      if (chunk === 'VP8X') return (1 + b.readUIntLE(24, 3)) * (1 + b.readUIntLE(27, 3));
      if (chunk === 'VP8 ' && b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a) return (b.readUInt16LE(26) & 0x3fff) * (b.readUInt16LE(28) & 0x3fff);
      if (chunk === 'VP8L' && b[20] === 0x2f) { const v = b.readUInt32LE(21); return ((v & 0x3fff) + 1) * (((v >>> 14) & 0x3fff) + 1); }
      return null;
    }
    if (type === 'image/jpeg') {
      let i = 2;
      while (i + 9 <= b.length) {
        if (b[i] !== 0xff) return null;
        const m = b[i + 1];
        if (m === 0xff) { i += 1; continue; }
        if (m === 0xd8 || (m >= 0xd0 && m <= 0xd7) || m === 0x01) { i += 2; continue; }
        if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return b.readUInt16BE(i + 5) * b.readUInt16BE(i + 7);
        if (m === 0xda || m === 0xd9) return null;
        i += 2 + b.readUInt16BE(i + 2);
      }
      return null;
    }
  } catch {
    return null;
  }
  return null;
}

// The names in a PDF that make it run or carry something (decision 9), read as PDF names: "/JS" is the name JS and not
// the start of "/JSON", and "#xx" escapes are read as the characters they stand for.
const ACTIVE_NAMES = new Set(['JavaScript', 'JS', 'Launch', 'EmbeddedFile', 'EmbeddedFiles', 'RichMedia', 'XFA']);
const NAME_RE = /\/((?:[^\s()<>[\]{}/%#\0]|#[0-9A-Fa-f]{2})+)/g;
const WINDOW = 1024 * 1024;
const OVERLAP = 1024;
// The first active-content name in a PDF file, read as a stream in 1 MB windows with an overlap, or null. A name in a
// compressed object stream is not seen: this is a filter, and the headers the file is served with are the guard.
async function pdfActiveContent(file) {
  const fh = await fs.promises.open(file, 'r');
  try {
    const buf = Buffer.alloc(WINDOW);
    let carry = '';
    for (;;) {
      const { bytesRead } = await fh.read(buf, 0, WINDOW, null);
      const last = bytesRead < WINDOW;
      const text = carry + buf.toString('latin1', 0, bytesRead);
      NAME_RE.lastIndex = 0;
      for (let m = NAME_RE.exec(text); m; m = NAME_RE.exec(text)) {
        if (!last && m.index + m[0].length === text.length) break; // may go on in the next window: read there
        const name = m[1].replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
        if (ACTIVE_NAMES.has(name)) return name;
      }
      if (last) return null;
      carry = text.slice(-OVERLAP);
    }
  } finally {
    await fh.close();
  }
}

// Whether a Markdown file's bytes are text the Vault takes: UTF-8 with no NUL, and not a page or a drawing dressed as
// text. Answers null or 'kind'.
function markdownRefusal(b) {
  if (b.includes(0)) return 'kind';
  let text;
  try {
    text = new TextDecoder('utf-8', { fatal: true }).decode(b);
  } catch {
    return 'kind';
  }
  if (/^﻿?\s*<(?:!doctype|html|svg|\?xml|script)\b/i.test(text)) return 'kind';
  return null;
}

module.exports = { TYPES, LIMITS, MAX_BYTES, HEAD_BYTES, MAX_PIXELS, claimRefusal, claimedType, mismatch, sniff, picturePixels, pdfActiveContent, markdownRefusal };
