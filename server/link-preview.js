'use strict';

// Read a page's title, description and image for a link someone is adding.
// The fetch is the dangerous part: the address is whatever they typed, so it is resolved first and a private,
// loopback or link-local address is refused, including after a redirect. Nothing here names a module.

const dns = require('dns').promises;
const http = require('http');
const https = require('https');
const net = require('net');

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

function getOnce(target, addresses) {
  return new Promise((resolve, reject) => {
    const lib = target.protocol === 'https:' ? https : http;
    const req = lib.request({
      protocol: target.protocol,
      hostname: target.hostname,
      port: target.port || (target.protocol === 'https:' ? 443 : 80),
      path: `${target.pathname}${target.search}`,
      method: 'GET',
      headers: { 'user-agent': 'Collaborator', accept: 'text/html,application/xhtml+xml' },
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
        if (size > MAX_BYTES) {
          req.destroy();
          reject(new PreviewError('that page is too large'));
          return;
        }
        chunks.push(chunk);
      });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('timeout', () => req.destroy(new PreviewError('that page took too long')));
    req.on('error', () => reject(new PreviewError('that page could not be read')));
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

// Title, description and image from a page's HTML. The image address is resolved against the final page address.
function readPreview(html, base) {
  const text = String(html || '');
  const titleTag = /<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(text);
  const title = plain(metaContent(text, 'og:title') || (titleTag && titleTag[1]) || '', 120);
  const description = plain(metaContent(text, 'og:description') || metaContent(text, 'description') || '', 2000);
  let image = '';
  const raw = metaContent(text, 'og:image');
  if (raw) {
    try {
      const u = new URL(decode(raw).trim(), base);
      const ip = net.isIP(u.hostname) ? u.hostname : '';
      if ((u.protocol === 'https:' || u.protocol === 'http:') && !u.username && !u.password && !blockedName(u.hostname) && !(ip && blockedAddress(ip)) && u.href.length <= 500) image = u.href;
    } catch { /* not an address */ }
  }
  return { title, description, image };
}

async function fetchPreview(text) {
  let current = pageUrl(text);
  if (!current) throw new PreviewError('give a web address that starts with https:// or http://');
  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const addresses = await publicAddresses(current.hostname);
    const res = await getOnce(current, addresses);
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

module.exports = { PreviewError, blockedAddress, blockedName, readPreview, fetchPreview };
