// The objects format: what an AI (this server's or another) may write, and how it is read.
// One checker for the Assistant's answers and for an import. Nothing here names a module.

'use strict';

const { word } = require('./words');
const { productName } = require('./product-name');
const fileFormat = require('./file-format');

const FORMAT_VERSION = fileFormat.FORMAT_VERSIONS.objects;
const FENCE = 'objects'; // the label of the format's fenced block (plan-kind-names.md)
const FILE_SUFFIX = '.objects.json';
const MAX_IMPORT_OBJECTS = 50;
const MAX_IMPORT_CANDIDATES = 200;
const MAX_IMPORT_BYTES = 262144;
const MAX_TITLE = 80;
const MAX_CONTENT = 6000;
const MAX_TAG = 24;
const MAX_TAGS = 5;
const MAX_PLACE_NAME = 120;
const MAX_LINKS = 5;
const MAX_LINK_TITLE = 100;
const MAX_LINK_URL = 500;
const MAX_SOURCES = 12;

const BASES = ['general', 'items', 'both'];
const KINDS = ['flight', 'train', 'bus', 'ferry', 'car', 'hotel', 'restaurant', 'cafe', 'bar', 'sight', 'museum', 'tour', 'show'];
const ICONS = ['note', 'lightbulb', 'location-dot', 'calendar-days', 'link', 'star', 'bed', 'hotel', 'utensils', 'ticket', 'train', 'plane', 'car', 'ship', 'bus', 'camera', 'circle-info', 'mug-hot', 'landmark', 'mountain', 'umbrella-beach', 'sun', 'moon', 'bell', 'clock', 'wallet', 'triangle-exclamation', 'circle-check', 'heart', 'users', 'bag-shopping', 'music', 'map', 'suitcase', 'hourglass-half', 'flag', 'magnifying-glass', 'list-check', 'scale-balanced', 'coins'];

const EXAMPLE = '{"icon":"note","kind":"optional","title":"a short title","content":"the text to keep; plain prose, or simple Markdown (headings, **bold**, *italic*, lists, links) if that reads better","tags":["one","word"],"place":{"name":"optional"},"date":"optional YYYY-MM-DD","links":[{"title":"optional","url":"https://..."}]}';
const EXAMPLE_WITH_PROVENANCE = EXAMPLE.slice(0, -1) + ',"basis":"general","sources":[1]}';

class FormatError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const plain = (s, n, lines) => String(s == null ? '' : s).replace(/<[^>]*>/g, ' ').replace(lines ? /(?!\n)\p{Cc}/gu : /\p{Cc}/gu, ' ').replace(lines ? /[ \t]+/g : /\s+/g, ' ').replace(/\n{3,}/g, '\n\n').trim().slice(0, n);

// A file's bytes as text: UTF-16 when it starts with that byte order mark, else UTF-8. Same rule as public/file-text.js.
function decodeBytes(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  const encoding = bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : 'utf-8';
  return new TextDecoder(encoding).decode(bytes);
}

function cleanObject(raw, { count = 0, imported = false } = {}) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const title = plain(raw.title, MAX_TITLE);
  const content = plain(raw.content, MAX_CONTENT, true);
  if (!title || !content) return null;
  const basis = imported ? 'imported' : (BASES.includes(raw.basis) ? raw.basis : count > 0 ? 'items' : 'general');
  const summary = { icon: ICONS.includes(raw.icon) ? raw.icon : ICONS[0], title, content, basis };
  if (KINDS.includes(raw.kind)) summary.kind = raw.kind;
  const tags = [];
  for (const t of Array.isArray(raw.tags) ? raw.tags : []) {
    const tag = String(t == null ? '' : t).toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, MAX_TAG);
    if (tag && !tags.includes(tag) && tags.length < MAX_TAGS) tags.push(tag);
  }
  if (tags.length) summary.tags = tags;
  const pl = raw.place;
  if (pl && typeof pl === 'object') {
    const name = plain(pl.name, MAX_PLACE_NAME);
    if (name) {
      summary.place = { name };
      if (Number.isFinite(pl.lat) && Number.isFinite(pl.lng) && Math.abs(pl.lat) <= 90 && Math.abs(pl.lng) <= 180) {
        summary.place.lat = Math.round(pl.lat * 1e6) / 1e6;
        summary.place.lng = Math.round(pl.lng * 1e6) / 1e6;
      }
    }
  }
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw.date || ''));
  if (d) {
    const t = new Date(Date.UTC(+d[1], +d[2] - 1, +d[3]));
    if (t.getUTCFullYear() === +d[1] && t.getUTCMonth() === +d[2] - 1 && t.getUTCDate() === +d[3]) summary.date = raw.date;
  }
  const links = [];
  for (const l of Array.isArray(raw.links) ? raw.links.slice(0, MAX_LINKS) : []) {
    let u;
    try { u = new URL(String((l && l.url) || '')); } catch { continue; }
    if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.username || u.password || u.href.length > MAX_LINK_URL) continue;
    links.push({ title: plain(l.title, MAX_LINK_TITLE) || u.hostname, url: u.href });
  }
  if (links.length) summary.links = links;
  if (!imported) {
    const sources = [...new Set((Array.isArray(raw.sources) ? raw.sources : []).filter((n) => Number.isInteger(n) && n >= 1 && n <= count))].slice(0, MAX_SOURCES);
    if (sources.length) summary.sources = sources;
  }
  return summary;
}

function dropWhy(raw) {
  if (raw && raw.__notJson) return 'not valid JSON';
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return `not ${word('object', { a: true })}`;
  if (!plain(raw.title, MAX_TITLE)) return 'it has no title';
  if (!plain(raw.content, MAX_CONTENT, true)) return 'it has no content';
  return null;
}

function objectRule({ fence, noun, max, withProvenance }) {
  const example = withProvenance ? EXAMPLE_WITH_PROVENANCE : EXAMPLE;
  const tail = withProvenance
    ? ` "basis" says where the ${noun} comes from: "general" (your own knowledge), "items" (the material) or "both". "sources" are the item numbers you used. Leave out the optional parts you do not need.`
    : ` Keep each title under 80 characters and each content under 6000. Links must start with http:// or https://. Leave out the optional parts you do not need, and add no other fields.`;
  return `single fenced block (exactly one, never one per ${noun}) whose JSON is an array of every ${noun} worth keeping (at most ${max}):\n\`\`\`${fence}\n[${example}]\n\`\`\`\nThe icon is one of: ${ICONS.join(', ')}. If the ${noun} is plainly one of these everyday things, set "kind" to it (leave it out otherwise): ${KINDS.join(', ')}. When asked for several distinct things (an itinerary, a list of options, "find me three hotels"), put one ${noun} in that array per thing instead of folding them into prose or writing another fence; a single question still gets one ${noun} in the array.${tail}`;
}

function instructions(noun) {
  return `I keep my research in ${productName()}. When I ask you to find or plan something, answer as you normally would, then put every thing worth keeping in one JSON array inside one ${objectRule({ fence: FENCE, noun, max: MAX_IMPORT_OBJECTS, withProvenance: false })}\nIf I ask for a file instead, write one JSON file named <something>${FILE_SUFFIX} holding {"format":"objects","formatVersion":1,"objects":[...]}, with the same ${word('object', { many: true })} in that one list. Do not write a separate file or a separate fenced block for each ${noun}.`;
}

function schema() {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    title: `${productName()} ${word('object', { many: true })}, format 1`,
    description: `One ${word('object')}, a list of ${word('object', { many: true })}, or a ${FILE_SUFFIX} file. Other fields are ignored.`,
    oneOf: [
      { $ref: '#/$defs/object' },
      { type: 'array', items: { $ref: '#/$defs/object' }, maxItems: MAX_IMPORT_OBJECTS },
      { $ref: '#/$defs/file' },
    ],
    $defs: {
      file: {
        type: 'object',
        required: ['format', 'formatVersion', 'objects'],
        properties: {
          format: { const: 'objects' },
          formatVersion: { const: FORMAT_VERSION },
          objects: { type: 'array', items: { $ref: '#/$defs/object' }, maxItems: MAX_IMPORT_OBJECTS },
        },
      },
      object: {
        type: 'object',
        required: ['title', 'content'],
        properties: {
          title: { type: 'string', minLength: 1, maxLength: MAX_TITLE },
          content: { type: 'string', minLength: 1, maxLength: MAX_CONTENT },
          icon: { enum: ICONS.slice() },
          kind: { enum: KINDS.slice() },
          tags: { type: 'array', maxItems: MAX_TAGS, items: { type: 'string', pattern: '^[a-z0-9-]{1,24}$' } },
          place: {
            type: 'object',
            required: ['name'],
            properties: {
              name: { type: 'string', minLength: 1, maxLength: MAX_PLACE_NAME },
              lat: { type: 'number', minimum: -90, maximum: 90 },
              lng: { type: 'number', minimum: -180, maximum: 180 },
            },
          },
          date: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          links: {
            type: 'array',
            maxItems: MAX_LINKS,
            items: {
              type: 'object',
              required: ['url'],
              properties: {
                title: { type: 'string', maxLength: MAX_LINK_TITLE },
                url: { type: 'string', pattern: '^https?://', maxLength: MAX_LINK_URL },
              },
            },
          },
        },
      },
    },
  };
}

function parseFenceValue(body) {
  try {
    return { value: JSON.parse(body) };
  } catch {
    return { bad: true };
  }
}

function addCandidates(list, value) {
  if (Array.isArray(value)) list.push(...value);
  else list.push(value);
}

// Balanced top-level `{...}` spans, strings and escapes respected. Used when a chat's rendered view drops the fences.
function braceSpans(text) {
  const out = [];
  let i = 0;
  while (i < text.length) {
    if (text[i] !== '{') { i += 1; continue; }
    let depth = 0;
    let inStr = false;
    let esc = false;
    let j = i;
    for (; j < text.length; j += 1) {
      const ch = text[j];
      if (inStr) {
        if (esc) esc = false;
        else if (ch === '\\') esc = true;
        else if (ch === '"') inStr = false;
        continue;
      }
      if (ch === '"') { inStr = true; continue; }
      if (ch === '{') depth += 1;
      else if (ch === '}') {
        depth -= 1;
        if (depth === 0) { out.push(text.slice(i, j + 1)); i = j + 1; break; }
      }
    }
    if (depth !== 0) break;
  }
  return out;
}

// An opening fence whose label is a past block label (server/file-format.js), in any letter case: at the start of a
// line, after any indent, list markers (-, *, +, 1. or 1)) and quote markers (>, nested too); then three or more
// backticks, any spaces or tabs, and the label as a whole word (not followed by a letter, digit, _ or -, so a word
// that only starts with the label is not it); anything may follow. Lines may end in LF or CRLF. The block need not be
// closed (plan-kind-names.md, "Objects files and blocks").
const FENCE_PREFIX = '(?:[ \\t]*(?:>|[-*+][ \\t]|\\d{1,9}[.)][ \\t]))*[ \\t]*';
const PAST_FENCE = new RegExp(`^${FENCE_PREFIX}\`{3,}[ \\t]*(?:${fileFormat.PAST_BLOCK_LABELS.join('|')})(?![\\w-])`, 'im');
const OBJECTS_BLOCK = new RegExp(`\`\`\`${FENCE}[ \\t]*\\r?\\n([\\s\\S]*?)\\n?\`\`\``, 'g');

// Reads pasted text or a file's text, in this order (plan-kind-names.md, "Objects files and blocks"):
//   a block fenced with a past label anywhere -> the whole paste refused (OLD_SENTENCES.answer); nothing in it is read
//   JSON that is an objects file (format "objects", or any formatVersion) -> its marker checked, then its list
//   a JSON object with an old-shaped marker and no format -> refused (OLD_SENTENCES.objects)
//   any other JSON object or array -> read as one object or a list
//   ```objects blocks; when there are none, any JSON object with a title anywhere in the text (a paste that lost its fences)
function readObjects(text) {
  let src = String(text == null ? '' : text);
  if (src.charCodeAt(0) === 0xfeff) src = src.slice(1);
  const trimmed = src.trim();
  if (!trimmed) throw new FormatError(400, 'paste an answer or choose a file first');
  if (PAST_FENCE.test(trimmed)) throw new FormatError(400, fileFormat.OLD_SENTENCES.answer);

  let candidates = null;
  if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      const isObject = parsed && typeof parsed === 'object' && !Array.isArray(parsed);
      const has = (key) => Object.prototype.hasOwnProperty.call(parsed, key);
      if (isObject && (parsed.format === 'objects' || has('formatVersion'))) {
        const marker = fileFormat.readMarker(parsed, 'objects');
        if (marker === 'newer') throw new FormatError(400, `that file is format ${parsed.formatVersion}; this server reads format ${FORMAT_VERSION}`);
        if (marker !== 'ok') throw new FormatError(400, `that is not a ${FILE_SUFFIX} file`);
        if (!Array.isArray(parsed.objects)) throw new FormatError(400, `that file has no list of ${word('object', { many: true })}`);
        candidates = parsed.objects;
      } else if (isObject && fileFormat.readMarker(parsed, 'objects') === 'old') {
        throw new FormatError(400, fileFormat.OLD_SENTENCES.objects);
      } else if (Array.isArray(parsed)) {
        candidates = parsed;
      } else {
        candidates = [parsed];
      }
    } catch (err) {
      if (err instanceof FormatError) throw err;
      candidates = null;
    }
  }

  if (candidates === null) {
    candidates = [];
    OBJECTS_BLOCK.lastIndex = 0;
    let m;
    while ((m = OBJECTS_BLOCK.exec(trimmed))) {
      const parsed = parseFenceValue(m[1]);
      if (parsed.bad) candidates.push({ __notJson: true });
      else addCandidates(candidates, parsed.value);
    }
    if (!candidates.length) {
      for (const span of braceSpans(trimmed)) {
        try {
          const v = JSON.parse(span);
          if (v && typeof v === 'object' && !Array.isArray(v) && typeof v.title === 'string') candidates.push(v);
        } catch { /* ignore */ }
      }
    }
  }

  if (!candidates.length) {
    throw new FormatError(400, `nothing in that could be read as ${word('object', { many: true })}: paste the whole answer, with its ${FENCE} blocks`);
  }

  const found = Math.min(candidates.length, MAX_IMPORT_CANDIDATES);
  const objects = [];
  const dropped = [];
  let over = 0;
  for (let i = 0; i < found; i += 1) {
    const raw = candidates[i];
    const why = dropWhy(raw);
    if (why) { dropped.push({ at: i + 1, why }); continue; }
    const cleaned = cleanObject(raw, { imported: true });
    if (!cleaned) { dropped.push({ at: i + 1, why: 'it has no content' }); continue; }
    if (objects.length < MAX_IMPORT_OBJECTS) objects.push(cleaned);
    else over += 1;
  }
  return { objects, found, dropped, over };
}

module.exports = {
  FORMAT_VERSION,
  FENCE,
  FILE_SUFFIX,
  MAX_IMPORT_OBJECTS,
  MAX_IMPORT_CANDIDATES,
  MAX_IMPORT_BYTES,
  MAX_CONTENT,
  ICONS,
  KINDS,
  BASES,
  FormatError,
  cleanObject,
  objectRule,
  instructions,
  schema,
  readObjects,
  decodeBytes,
};
