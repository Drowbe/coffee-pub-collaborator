// What a library module's file is (documentation/plans/plan-attachments-vault.md, section 1): decided from its own first
// bytes, never from its name or the type it was sent with, then compared with both. A file whose name or type says
// something else is refused, and so is anything not in the table: SVG, HTML, XML, scripts, programs, archives, Office
// files, Matroska and HEIC. The server never opens, decodes or runs a file; it reads a few header bytes, a picture's
// size from its header, a PDF's names as a stream, and a Markdown file's text. Sentences are the caller's (they need the
// environment's words); this file answers what was found.
'use strict';

const fs = require('fs');
const zlib = require('zlib');

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
const ISO_BRANDS = ['isom', 'iso2', 'iso3', 'iso4', 'iso5', 'iso6', 'mp41', 'mp42', 'avc1', 'dash', 'M4V ', 'MSNV', 'mmp4', '3gp4', '3gp5', '3gp6', '3g2a'];

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

// The ftyp box's brands: [major, ...compatible], or null when it is not a whole, sane box: a size of 16 to 1024 bytes in
// whole brands, inside the head, and (when the head holds it) a next box with a size and a four-letter type.
function ftypBrands(b) {
  if (b.length < 16 || b.toString('latin1', 4, 8) !== 'ftyp') return null;
  const size = b.readUInt32BE(0);
  if (size < 16 || size > 1024 || size % 4 || size > b.length) return null;
  if (b.length >= size + 8) {
    const next = b.readUInt32BE(size);
    if (!(next === 0 || next === 1 || next >= 8) || !/^[\x20-\x7e]{4}$/.test(b.toString('latin1', size + 4, size + 8))) return null;
  }
  const out = [b.toString('latin1', 8, 12)];
  for (let i = 16; i + 4 <= size; i += 4) out.push(b.toString('latin1', i, i + 4));
  return out;
}

// An EBML variable-length number at `i`: { value, length } (the marker bit kept for an element id, taken off for a size),
// or null.
function ebmlVint(b, i, id) {
  if (i >= b.length || !b[i]) return null;
  const length = Math.clz32(b[i]) - 23;
  if (length > (id ? 4 : 8) || i + length > b.length) return null;
  let value = id ? b[i] : b[i] & (0xff >> length);
  for (let k = 1; k < length; k += 1) value = value * 256 + b[i + k];
  return { value, length };
}
// A WebM's EBML header, read as elements, names its DocType: 'webm', 'matroska' (refused), or null. The header must be
// whole inside the head and followed by the Segment (or a Void element) when the head holds that far.
function ebmlDocType(b) {
  const head = b.subarray(0, HEAD_BYTES);
  const size = ebmlVint(head, 4, false);
  if (!size || 4 + size.length + size.value > head.length) return null;
  const end = 4 + size.length + size.value;
  if (head.length >= end + 4 && !(head.readUInt32BE(end) === 0x18538067 || head[end] === 0xec)) return null;
  let docType = null;
  for (let i = 4 + size.length; i < end;) {
    const id = ebmlVint(head, i, true);
    const len = id && ebmlVint(head, i + id.length, false);
    if (!id || !len) return null;
    const at = i + id.length + len.length;
    if (at + len.value > end) return null;
    if (id.value === 0x4282) docType = head.toString('latin1', at, at + len.value).replace(/\0+$/, '');
    i = at + len.value;
  }
  return docType;
}

// An MPEG audio frame header at `i`: its length in bytes, or 0 when it is not one (11 bits of sync, a version and a
// layer that are not the reserved ones -- layer 00 is AAC's ADTS, not taken -- a bitrate that is neither free nor bad,
// a sample rate that is not the reserved one).
const MP3_RATES = {
  '1-1': [0, 32, 64, 96, 128, 160, 192, 224, 256, 288, 320, 352, 384, 416, 448],
  '1-2': [0, 32, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, 384],
  '1-3': [0, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320],
  '2-1': [0, 32, 48, 56, 64, 80, 96, 112, 128, 144, 160, 176, 192, 224, 256],
  '2-2': [0, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160],
};
MP3_RATES['2-3'] = MP3_RATES['2-2'];
const MP3_SAMPLES = { 3: [44100, 48000, 32000], 2: [22050, 24000, 16000], 0: [11025, 12000, 8000] };
function mp3Frame(b, i) {
  if (i + 4 > b.length || b[i] !== 0xff || (b[i + 1] & 0xe0) !== 0xe0) return 0;
  const version = (b[i + 1] >> 3) & 3;
  const layer = 4 - ((b[i + 1] >> 1) & 3);
  if (version === 1 || layer === 4) return 0;
  const rate = MP3_RATES[`${version === 3 ? 1 : 2}-${layer}`][b[i + 2] >> 4];
  const sample = MP3_SAMPLES[version][(b[i + 2] >> 2) & 3];
  if (!rate || !sample) return 0;
  const pad = (b[i + 2] >> 1) & 1;
  if (layer === 1) return (Math.floor((12 * rate * 1000) / sample) + pad) * 4;
  return Math.floor(((layer === 3 && version !== 3 ? 72 : 144) * rate * 1000) / sample) + pad;
}
// Two frames one after the other from `i` (or one, when the bytes end before the second could).
function mp3Frames(b, i) {
  const len = mp3Frame(b, i);
  if (!len) return false;
  return i + len + 4 > b.length || mp3Frame(b, i + len) > 0;
}
// An ID3v2 tag at the start: the offset its frames follow at, or -1 when it is not a sane one (version 2 to 4, a
// syncsafe size no larger than the audio limit).
function id3End(b) {
  if (b.length < 10 || b.toString('latin1', 0, 3) !== 'ID3' || b[3] < 2 || b[3] > 4 || b[4] === 0xff) return -1;
  if ([6, 7, 8, 9].some((k) => b[k] & 0x80)) return -1;
  const size = ((b[6] << 21) | (b[7] << 14) | (b[8] << 7) | b[9]) + 10 + (b[5] & 0x10 ? 10 : 0);
  return size > LIMITS.audio.bytes ? -1 : size;
}
// What a PDF's first kilobyte must not hold: a page's or a script's tags.
const PDF_HTML_RE = /<\s*(?:!doctype|html|head|body|script|iframe|svg|object|embed|meta|img|style|link|form)\b/i;

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
  if (b.length >= 5 && latin(0, 5) === '%PDF-') return PDF_HTML_RE.test(latin(0, 1024)) ? { refuse: 'kind' } : { type: 'application/pdf' };
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
  // MP3: a sane ID3v2 tag (the frames after it are looked at once the file is in: mp3Refusal), or two MPEG audio frames.
  if (latin(0, 3) === 'ID3') return id3End(b) > 0 ? { type: 'audio/mpeg' } : { refuse: 'kind' };
  if (mp3Frames(b, 0)) return { type: 'audio/mpeg' };
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

// The names in a PDF that make it run, open something outside it, send something or carry files (decision 9, and Thomas's
// rule of 2026-10-30: links to web pages and fillable forms are taken, scripts and launches are not), read as PDF names:
// "/JS" is the name JS and not the start of "/JSON", and "#xx" escapes are read as the characters they stand for. Each
// says what kind of thing it is, for the sentence. /URI and /AcroForm are not here: a link's address is looked at
// instead (uriRefusal), and a form that does not send itself anywhere or run a script is a form.
const ACTIVE_NAMES = new Map([
  ['JavaScript', 'scripts'], ['JS', 'scripts'], ['AA', 'scripts'], ['XFA', 'scripts'],
  ['Launch', 'opens'], ['GoToR', 'opens'], ['GoToE', 'opens'],
  ['SubmitForm', 'sends'],
  ['EmbeddedFile', 'files'], ['EmbeddedFiles', 'files'], ['RichMedia', 'files'],
]);
// A link (a /URI string, literal or hex) to anything but a web page or an email address: a program, a file, a script.
const URI_RE = /\/URI\s*(?:\(((?:\\.|[^\\)])*)\)|<([0-9A-Fa-f\s]*)>)/g;
function uriRefusal(text) {
  URI_RE.lastIndex = 0;
  for (let m = URI_RE.exec(text); m; m = URI_RE.exec(text)) {
    const raw = m[1] !== undefined ? m[1].replace(/\\([0-7]{1,3}|.)/g, (_, c) => (/^[0-7]+$/.test(c) ? String.fromCharCode(parseInt(c, 8)) : c)) : Buffer.from(m[2].replace(/\s+/g, ''), 'hex').toString('latin1');
    const address = raw.replace(/[\0-\x20\x7f]+/g, '').toLowerCase();
    if (!/^(?:https?:\/\/|mailto:)/.test(address)) return { name: 'URI', what: 'opens' };
  }
  return null;
}
const NAME_RE = /\/((?:[^\s()<>[\]{}/%#\0]|#[0-9A-Fa-f]{2})+)/g;
const OBJ_RE = /\d+\s+\d+\s+obj\b/;
const STREAM_RE = /\bstream(?:\r\n|\n|\r)/g;
const WINDOW = 1024 * 1024;
const OVERLAP = 4096;
// Compressed object streams: each is inflated as a stream and read the same way, at most 16 MB out of one, 64 MB out of
// all, and at most 200 of them; a PDF over any of that, or one whose object stream can't be inflated, is not checked and
// so not taken.
const PDF_STREAM_MAX = 16 * 1024 * 1024;
const PDF_STREAMS_OUT_MAX = 64 * 1024 * 1024;
const PDF_STREAMS_MAX = 200;
const PDF_STREAM_IN_MAX = 32 * 1024 * 1024;

// The first active name in `text` ({ name, what }), leaving one that touches the end for the next window unless `last`.
function activeIn(text, last) {
  NAME_RE.lastIndex = 0;
  for (let m = NAME_RE.exec(text); m; m = NAME_RE.exec(text)) {
    if (!last && m.index + m[0].length === text.length) break; // may go on in the next window: read there
    const name = m[1].replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    if (ACTIVE_NAMES.has(name)) return { name, what: ACTIVE_NAMES.get(name) };
  }
  return uriRefusal(text);
}
const unescapeNames = (dict) => dict.replace(/#([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));

// Inflates the object stream whose data starts at `start` and reads it for active names: null, { name, what }, or
// { refuse: 'unchecked' }. Never holds more than a window of what comes out.
function inflatedActive(fh, start, fileSize, budget) {
  return new Promise((resolve) => {
    const inflate = zlib.createInflate();
    let out = 0;
    let carry = '';
    let done = false;
    let pos = start;
    const end = (r) => { if (done) return; done = true; inflate.removeAllListeners('data'); inflate.on('error', () => {}); inflate.destroy(); resolve(r); };
    inflate.on('data', (chunk) => {
      out += chunk.length;
      budget.out += chunk.length;
      if (out > PDF_STREAM_MAX || budget.out > PDF_STREAMS_OUT_MAX) return end({ refuse: 'unchecked' });
      const text = carry + chunk.toString('latin1');
      const found = activeIn(text, false);
      if (found) return end(found);
      carry = text.slice(-OVERLAP);
    });
    inflate.on('end', () => end(activeIn(carry, true)));
    inflate.on('error', () => end({ refuse: 'unchecked' }));
    const buf = Buffer.alloc(64 * 1024);
    (async () => {
      const stop = Math.min(fileSize, start + PDF_STREAM_IN_MAX);
      while (!done && pos < stop) {
        const { bytesRead } = await fh.read(buf, 0, Math.min(buf.length, stop - pos), pos);
        if (!bytesRead || done) break;
        pos += bytesRead;
        if (!inflate.write(Buffer.from(buf.subarray(0, bytesRead)))) await new Promise((r) => { inflate.once('drain', r); inflate.once('close', r); });
      }
      if (!done) inflate.end();
    })().catch(() => end({ refuse: 'unchecked' }));
  });
}

// What stops a PDF file from being taken, read as a stream in 1 MB windows with an overlap: null, { name, what } for
// active content (in the file as it is, or in a Flate-compressed object stream), { refuse: 'damaged' } for one that is
// not a whole PDF (no object, no %%EOF in its last kilobyte), or { refuse: 'unchecked' } for an object stream that
// can't be read within the limits.
async function pdfRefusal(file) {
  const fh = await fs.promises.open(file, 'r');
  try {
    const { size } = await fh.stat();
    const buf = Buffer.alloc(WINDOW);
    let carry = '';
    let base = 0; // the file offset of the text's first character
    let sawObj = false;
    const objStreams = new Set(); // file offsets of the data of the object streams
    for (let at = 0; ;) {
      const { bytesRead } = await fh.read(buf, 0, WINDOW, at);
      const last = at + bytesRead >= size || bytesRead < WINDOW;
      const text = carry + buf.toString('latin1', 0, bytesRead);
      const found = activeIn(text, last);
      if (found) return found;
      if (!sawObj && OBJ_RE.test(text)) sawObj = true;
      STREAM_RE.lastIndex = 0;
      for (let m = STREAM_RE.exec(text); m; m = STREAM_RE.exec(text)) {
        if (!last && m.index + m[0].length >= text.length - 1) continue; // its line end may go on: read in the next window
        const dictStart = Math.max(text.lastIndexOf('obj', m.index), 0);
        const dict = unescapeNames(text.slice(dictStart, m.index));
        if (!/\/Type\s*\/ObjStm\b/.test(dict)) continue;
        if (!/\/Filter\s*(?:\[\s*)?\/FlateDecode\s*\]?\s*(?:\/|>>)/.test(dict) || /\/DecodeParms/.test(dict)) return { refuse: 'unchecked' };
        objStreams.add(base + m.index + m[0].length);
        if (objStreams.size > PDF_STREAMS_MAX) return { refuse: 'unchecked' };
      }
      at += bytesRead;
      if (last) break;
      carry = text.slice(-OVERLAP);
      base = at - carry.length;
    }
    const tail = Buffer.alloc(Math.min(1024, size));
    await fh.read(tail, 0, tail.length, size - tail.length);
    if (!sawObj || !tail.includes('%%EOF')) return { refuse: 'damaged' };
    const budget = { out: 0 };
    for (const start of objStreams) {
      const r = await inflatedActive(fh, start, size, budget);
      if (r) return r;
    }
    return null;
  } finally {
    await fh.close();
  }
}

// What stops an MP3 that starts with an ID3v2 tag from being taken, once the file is in: null, or 'kind' when there are
// no two MPEG audio frames one after the other in the 64 KB after the tag.
async function mp3Refusal(file) {
  const fh = await fs.promises.open(file, 'r');
  try {
    const head = Buffer.alloc(10);
    await fh.read(head, 0, 10, 0);
    const from = id3End(head);
    if (from < 0) return head.toString('latin1', 0, 3) === 'ID3' ? 'kind' : null;
    const b = Buffer.alloc(64 * 1024 + 4096);
    const { bytesRead } = await fh.read(b, 0, b.length, from);
    const got = b.subarray(0, bytesRead);
    for (let i = 0; i < Math.min(got.length, 64 * 1024); i += 1) if (got[i] === 0xff && mp3Frames(got, i) && mp3Frame(got, i) + i + 4 <= got.length) return null;
    return 'kind';
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

module.exports = { TYPES, LIMITS, MAX_BYTES, HEAD_BYTES, MAX_PIXELS, claimRefusal, claimedType, mismatch, sniff, picturePixels, pdfRefusal, mp3Refusal, markdownRefusal };
