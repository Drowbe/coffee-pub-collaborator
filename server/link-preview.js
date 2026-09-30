'use strict';

// Read a page's title, description and image for a link someone is adding.
// The fetch is the dangerous part: the address is whatever they typed, so it is resolved first and a private,
// loopback or link-local address is refused, including after a redirect. Nothing here names a module.

const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');
const { userAgent } = require('./product-name');

const MAX_BYTES = 262144;
const MAX_REDIRECTS = 3;
const TIMEOUT_MS = 8000;

class PreviewError extends Error {
  constructor(message) {
    super(message);
    this.name = 'PreviewError';
  }
}

function blockedAddress(ip) {
  const kind = net.isIP(ip);
  if (kind === 4) {
    const p = ip.split('.').map(Number);
    if (p[0] === 0 || p[0] === 10 || p[0] === 127) return true;
    if (p[0] === 100 && p[1] >= 64 && p[1] <= 127) return true;
    if (p[0] === 169 && p[1] === 254) return true;
    if (p[0] === 172 && p[1] >= 16 && p[1] <= 31) return true;
    if (p[0] === 192 && p[1] === 168) return true;
    if (p[0] >= 224) return true;
    return false;
  }
  if (kind === 6) {
    const n = ip.toLowerCase();
    if (n === '::' || n === '::1') return true;
    if (n.startsWith('fe80:') || n.startsWith('fc') || n.startsWith('fd')) return true;
    const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(n);
    if (mapped) return blockedAddress(mapped[1]);
    return false;
  }
  return true;
}

function blockedName(host) {
  const h = String(host || '').toLowerCase().replace(/\.$/, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return true;
  if (/^\d+$/.test(h) || /^0x[0-9a-f]+$/i.test(h)) return true;
  return false;
}

function pageUrl(text) {
  let u;
  try { u = new URL(String(text || '').trim()); } catch { return null; }
  if ((u.protocol !== 'https:' && u.protocol !== 'http:') || u.username || u.password) return null;
  if (blockedName(u.hostname)) return null;
  return u;
}

async function publicAddresses(hostname) {
  if (net.isIP(hostname)) {
    if (blockedAddress(hostname)) throw new PreviewError('that address is not allowed');
    return [hostname];
  }
  if (blockedName(hostname)) throw new PreviewError('that address is not allowed');
  let records;
  try { records = await dns.lookup(hostname, { all: true, verbatim: true }); } catch { throw new PreviewError('that address could not be found'); }
  const addresses = records.map((r) => r.address);
  if (!addresses.length || addresses.some(blockedAddress)) throw new PreviewError('that address is not allowed');
  return addresses;
}

function getOnce(target, addresses, maxBytes, accept) {
  return new Promise((resolve, reject) => {
    const lib = target.protocol === 'https:' ? https : http;
    let settled = false;
    const done = (value) => { if (!settled) { settled = true; resolve(value); } };
    const fail = (err) => { if (!settled) { settled = true; reject(err); } };
    const req = lib.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: `${target.pathname}${target.search}`,
      method: 'GET',
      headers: { 'user-agent': userAgent(), accept: accept || 'text/html,application/xhtml+xml' },
      timeout: TIMEOUT_MS,
      lookup: (_hostname, opts, cb) => {
        const list = addresses.map((address) => ({ address, family: net.isIP(address) }));
        if (opts && opts.all) cb(null, list);
        else cb(null, list[0].address, list[0].family);
      },
    }, (res) => {
      const chunks = [];
      let size = 0;
      res.on('data', (chunk) => {
        size += chunk.length;
        if (size > maxBytes) {
          req.destroy();
          done({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks), cut: true });
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => done({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks), cut: false }));
    });
    req.on('timeout', () => req.destroy(new PreviewError('that page took too long')));
    req.on('error', () => fail(new PreviewError('that page could not be read')));
    req.end();
  });
}

function decode(text) {
  return String(text || '').replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (all, ent) => {
    const e = ent.toLowerCase();
    if (e === 'amp') return '&';
    if (e === 'lt') return '<';
    if (e === 'gt') return '>';
    if (e === 'quot') return '"';
    if (e === 'apos') return "'";
    if (e === 'nbsp') return ' ';
    const n = e[1] === 'x' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
    return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : all;
  });
}

function plain(text, n) {
  return decode(text).replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, n);
}

function attr(tag, name) {
  const re = new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = re.exec(tag);
  return m ? (m[1] ?? m[2] ?? m[3] ?? '') : '';
}

function metaContent(html, which) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  for (const tag of tags) {
    const prop = (attr(tag, 'property') || attr(tag, 'name')).toLowerCase();
    if (prop === which) return attr(tag, 'content');
  }
  return '';
}

// An image address the page named, or ''. Resolved against the final page address. A private or local host is dropped.
function absoluteImage(raw, base) {
  const text = decode(String(raw || '')).trim();
  if (!text) return '';
  try {
    const u = new URL(text, base);
    const ip = net.isIP(u.hostname) ? u.hostname : '';
    if ((u.protocol === 'https:' || u.protocol === 'http:') && !u.username && !u.password && !blockedName(u.hostname) && !(ip && blockedAddress(ip)) && u.href.length <= 2000) return u.href;
  } catch { /* not an address */ }
  return '';
}

// The kinds of thing a page is about. A logo on the site or a picture of the author is not one of these.
const SUBJECT_TYPES = new Set([
  'article', 'newsarticle', 'blogposting', 'report', 'scholarlyarticle', 'techarticle', 'socialmediaposting',
  'product', 'productgroup',
  'place', 'localbusiness', 'restaurant', 'hotel', 'touristattraction', 'touristtrip', 'event', 'recipe',
  'lodgingbusiness', 'accommodation', 'landmarksorhistoricalbuildings', 'airport', 'civicstructure',
]);

function typeNames(node) {
  const raw = node && node['@type'];
  const list = Array.isArray(raw) ? raw : [raw];
  return list.filter((t) => typeof t === 'string').map((t) => t.toLowerCase().split('/').pop());
}

function ldNodes(html) {
  const nodes = [];
  const scripts = String(html || '').matchAll(/<script\b[^>]*\btype\s*=\s*["']application\/ld\+json[^"']*["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const script of scripts) {
    const raw = script[1].trim();
    if (!raw) continue;
    let data = null;
    try { data = JSON.parse(raw); } catch { try { data = JSON.parse(decode(raw)); } catch { data = null; } }
    collectNodes(data, nodes);
  }
  return nodes;
}

function collectNodes(data, nodes) {
  if (Array.isArray(data)) { for (const one of data) collectNodes(one, nodes); return; }
  if (!data || typeof data !== 'object') return;
  if (Array.isArray(data['@graph'])) { collectNodes(data['@graph'], nodes); return; }
  nodes.push(data);
}

function nodesById(nodes) {
  const map = new Map();
  for (const node of nodes) if (typeof node['@id'] === 'string') map.set(node['@id'], node);
  return map;
}

// A string, a list, or an ImageObject. An @id that names another block is followed once.
function firstImage(value, base, byId, seen) {
  if (value == null) return '';
  if (typeof value === 'string') return absoluteImage(value, base);
  if (Array.isArray(value)) {
    for (const one of value) {
      const got = firstImage(one, base, byId, seen);
      if (got) return got;
    }
    return '';
  }
  if (typeof value !== 'object') return '';
  const direct = absoluteImage(value.url || value.contentUrl || '', base);
  if (direct) return direct;
  const id = value['@id'];
  if (typeof id !== 'string' || !byId || seen?.has(id)) return absoluteImage(id, base);
  const node = byId.get(id);
  if (!node) return absoluteImage(id, base);
  const next = new Set(seen || []);
  next.add(id);
  return firstImage(node.url || node.contentUrl || node.image, base, byId, next);
}

function resolveNode(value, byId) {
  if (typeof value === 'string') return byId.get(value) || null;
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const id = value['@id'];
  const pointed = typeof id === 'string' ? byId.get(id) : null;
  if (pointed && !value.image && !value.url && !value.contentUrl) return pointed;
  return value;
}

// The picture the page names for itself, the way a search result does: primaryImageOfPage, then the picture on
// the main thing (an article, a product, a place), before the share tags.
function schemaImage(html, base) {
  const nodes = ldNodes(html);
  if (!nodes.length) return '';
  const byId = nodesById(nodes);
  for (const node of nodes) {
    const got = firstImage(node.primaryImageOfPage, base, byId);
    if (got) return got;
  }
  for (const node of nodes) {
    const main = node.mainEntity;
    const target = Array.isArray(main) ? resolveNode(main[0], byId) : resolveNode(main, byId);
    const got = target ? firstImage(target.image, base, byId) : '';
    if (got) return got;
  }
  for (const node of nodes) {
    if (!node.mainEntityOfPage) continue;
    const got = firstImage(node.image, base, byId);
    if (got) return got;
  }
  for (const node of nodes) {
    if (!typeNames(node).some((name) => SUBJECT_TYPES.has(name))) continue;
    const got = firstImage(node.image, base, byId);
    if (got) return got;
  }
  return '';
}

// Title, description and image from a page's HTML. The image address is resolved against the final page address.
function readPreview(html, base) {
  const text = String(html || '');
  const titleTag = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(text);
  const title = plain(metaContent(text, 'og:title') || (titleTag && titleTag[1]) || '', 120);
  const description = plain(metaContent(text, 'og:description') || metaContent(text, 'description') || '', 2000);
  const image = schemaImage(text, base) || absoluteImage(metaContent(text, 'og:image') || metaContent(text, 'twitter:image'), base);
  return { title, description, image };
}

async function fetchPreview(text) {
  let current = pageUrl(text);
  if (!current) throw new PreviewError('give a web address that starts with https:// or http://');
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const addresses = await publicAddresses(current.hostname);
    const res = await getOnce(current, addresses, MAX_BYTES);
    const status = res.status || 0;
    if (status >= 300 && status < 400 && res.headers.location) {
      if (hop === MAX_REDIRECTS) throw new PreviewError('that page could not be read');
      let next;
      try { next = new URL(res.headers.location, current); } catch { throw new PreviewError('that page could not be read'); }
      current = pageUrl(next.href);
      if (!current) throw new PreviewError('that address is not allowed');
      continue;
    }
    if (status < 200 || status >= 300) throw new PreviewError('that page could not be read');
    const type = String(res.headers['content-type'] || '');
    const body = res.body.toString('utf8');
    if (type && !/text\/html|application\/xhtml\+xml/i.test(type)) throw new PreviewError('that page is not text');
    if (!type && !/<\s*(!doctype|html|head|title|meta)\b/i.test(body)) throw new PreviewError('that page is not text');
    const preview = readPreview(body, current.href);
    if (preview.image) {
      try { await publicAddresses(new URL(preview.image).hostname); } catch { preview.image = ''; }
    }
    return preview;
  }
  throw new PreviewError('that page could not be read');
}

const IMAGE_BYTES = 1048576;
const IMAGE_CACHE_MS = 10 * 60 * 1000;
const IMAGE_CACHE_MAX = 40;
const imageCache = new Map();

function imageType(buf, header) {
  const type = String(header || '').split(';')[0].trim().toLowerCase();
  if (type === 'image/jpeg' || type === 'image/png' || type === 'image/webp' || type === 'image/gif') return type;
  if (buf.length >= 3 && buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return 'image/jpeg';
  if (buf.length >= 8 && buf[0] === 0x89 && buf.toString('ascii', 1, 4) === 'PNG') return 'image/png';
  if (buf.length >= 6 && (buf.toString('ascii', 0, 6) === 'GIF87a' || buf.toString('ascii', 0, 6) === 'GIF89a')) return 'image/gif';
  if (buf.length >= 12 && buf.toString('ascii', 0, 4) === 'RIFF' && buf.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  return '';
}

// A picture already read for this address, or null. The card asks again for every view, so a repeat is not fetched twice.
function cachedImage(text) {
  const target = pageUrl(text);
  if (!target || target.href.length > 2000) return null;
  const hit = imageCache.get(target.href);
  if (!hit || Date.now() - hit.at > IMAGE_CACHE_MS) return null;
  return hit;
}

// The picture itself, fetched here so the card does not ask the other site (many refuse that). Same address rules as the page.
async function fetchImage(text) {
  const hit = cachedImage(text);
  if (hit) return hit;
  let current = pageUrl(text);
  if (!current || current.href.length > 2000) throw new PreviewError('that address is not allowed');
  const asked = current.href;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const addresses = await publicAddresses(current.hostname);
    const res = await getOnce(current, addresses, IMAGE_BYTES, 'image/webp,image/png,image/jpeg,image/gif');
    const status = res.status || 0;
    if (status >= 300 && status < 400 && res.headers.location) {
      if (hop === MAX_REDIRECTS) throw new PreviewError('that picture could not be read');
      let next;
      try { next = new URL(res.headers.location, current); } catch { throw new PreviewError('that picture could not be read'); }
      current = pageUrl(next.href);
      if (!current) throw new PreviewError('that address is not allowed');
      continue;
    }
    if (status < 200 || status >= 300 || res.cut) throw new PreviewError('that picture could not be read');
    const type = imageType(res.body, res.headers['content-type']);
    if (!type) throw new PreviewError('that picture could not be read');
    const stored = { type, body: res.body, at: Date.now() };
    if (imageCache.size >= IMAGE_CACHE_MAX) imageCache.delete(imageCache.keys().next().value);
    imageCache.set(asked, stored);
    return stored;
  }
  throw new PreviewError('that picture could not be read');
}

// getOnce is exported for tools/check-link-preview.mjs only (the request it sends, to an address already checked).
module.exports = { PreviewError, blockedAddress, blockedName, readPreview, fetchPreview, fetchImage, cachedImage, getOnce };
