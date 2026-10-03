#!/usr/bin/env node
/*
 * check-link-preview.mjs -- the page reader (server/link-preview.js) on its own: what it takes from HTML,
 * and which addresses it refuses before any request is made; and the user-agent it sends, "<product>/<version>"
 * (plan-kind-names.md, step 2), from the configured name.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { blockedAddress, blockedName, readPreview, getOnce, fetchPreview, fetchCalendar } = require('../server/link-preview.js');
const { version } = require('../package.json');

let n = 0;
const test = (name, fn) => { fn(); n += 1; console.log(`ok ${name}`); };

test('private and loopback addresses are refused', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.1.1', '172.16.0.1', '169.254.169.254', '0.0.0.0', '::1', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1']) {
    assert.equal(blockedAddress(ip), true, ip);
  }
  assert.equal(blockedAddress('8.8.8.8'), false);
  assert.equal(blockedAddress('2606:4700:4700::1111'), false);
});

test('every way of writing a private IPv6 address is refused, by its 16 bytes', () => {
  for (const ip of [
    '::ffff:7f00:1', '::ffff:127.0.0.1', '::ffff:a00:1', '::ffff:a9fe:a9fe', '::ffff:c0a8:101', // IPv4-mapped, hex and dotted
    '::7f00:1', '::127.0.0.1', '::a9fe:a9fe', // IPv4-compatible ::/96
    '64:ff9b::7f00:1', '64:ff9b::808:808', '64:ff9b:1::1', // NAT64
    '2002:7f00:1::1', '2002:808:808::1', // 6to4
    '2001::1', '2001:0:4136:e378:8000:63bf:3fff:fdd2', // Teredo
    'fc00::1', 'fd12:3456::1', 'fe80::1', 'febf::1', 'fec0::1', 'ff02::1', 'ff0e::1', '100::1', '2001:db8::1',
    '0:0:0:0:0:0:0:1', '::ffff:0:7f00:1', 'fe80::1%eth0', 'not-an-address',
  ]) assert.equal(blockedAddress(ip), true, ip);
  for (const ip of ['2606:4700:4700::1111', '2a00:1450:4001:81c::200e', '::ffff:808:808', '::ffff:8.8.8.8']) assert.equal(blockedAddress(ip), false, ip);
});

test('an IPv6 address written in the address itself is refused outright', () => {
  for (const text of ['https://[::ffff:127.0.0.1]/', 'http://[2606:4700:4700::1111]/', 'https://[::1]:8443/x']) {
    assert.equal(blockedName(new URL(text).hostname), true, text);
  }
});

test('local names are refused before a lookup', () => {
  assert.equal(blockedName('localhost'), true);
  assert.equal(blockedName('printer.local'), true);
  assert.equal(blockedName('db.internal'), true);
  assert.equal(blockedName('2130706433'), true);
  assert.equal(blockedName('disneyland.disney.go.com'), false);
});

test('a page title, description and image are read', () => {
  const html = `<html><head>
    <title>Ignored</title>
    <meta name="description" content="A plain description">
    <meta property="og:title" content="Disneyland &amp; more">
    <meta property="og:description" content="The page says this.">
    <meta property="og:image" content="/hero.jpg">
  </head></html>`;
  const got = readPreview(html, 'https://disneyland.disney.go.com/path');
  assert.equal(got.title, 'Disneyland & more');
  assert.equal(got.description, 'The page says this.');
  assert.equal(got.image, 'https://disneyland.disney.go.com/hero.jpg');
  const twitter = readPreview('<meta name="twitter:image" content="https://cdn.example.org/a.jpg"><title>T</title>', 'https://example.org/');
  assert.equal(twitter.image, 'https://cdn.example.org/a.jpg');
});

test('a private image address is dropped', () => {
  const html = '<meta property="og:image" content="http://127.0.0.1/a.jpg"><title>Hi</title>';
  assert.equal(readPreview(html, 'https://example.org/').image, '');
  assert.equal(readPreview(html, 'https://example.org/').title, 'Hi');
});

test('a page picture comes from structured data before the share tags', () => {
  const primary = `<script type="application/ld+json">{
    "@type": "WebPage",
    "primaryImageOfPage": { "@type": "ImageObject", "url": "https://cdn.example.org/page.jpg" }
  }</script><meta property="og:image" content="https://cdn.example.org/share.jpg">`;
  assert.equal(readPreview(primary, 'https://example.org/').image, 'https://cdn.example.org/page.jpg');

  const article = `<script type="application/ld+json">{
    "@type": "NewsArticle",
    "image": ["/hero.jpg", "https://cdn.example.org/other.jpg"]
  }</script>`;
  assert.equal(readPreview(article, 'https://example.org/story').image, 'https://example.org/hero.jpg');

  const product = `<script type="application/ld+json">{
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "image": "https://cdn.example.org/logo.jpg" },
      { "@type": "Product", "image": { "@type": "ImageObject", "contentUrl": "https://cdn.example.org/product.jpg" } }
    ]
  }</script><meta property="og:image" content="https://cdn.example.org/share.jpg">`;
  assert.equal(readPreview(product, 'https://example.org/').image, 'https://cdn.example.org/product.jpg');

  const place = `<script type="application/ld+json">{
    "@type": "TouristAttraction",
    "mainEntityOfPage": "https://example.org/park",
    "image": "https://cdn.example.org/park.jpg"
  }</script>`;
  assert.equal(readPreview(place, 'https://example.org/park').image, 'https://cdn.example.org/park.jpg');

  const linked = `<script type="application/ld+json">{
    "@graph": [
      { "@type": "ImageObject", "@id": "https://example.org/#img", "url": "https://cdn.example.org/from-id.jpg" },
      { "@type": "WebPage", "primaryImageOfPage": { "@id": "https://example.org/#img" } }
    ]
  }</script>`;
  assert.equal(readPreview(linked, 'https://example.org/').image, 'https://cdn.example.org/from-id.jpg');
});

test('a site logo in structured data is not the page picture', () => {
  const html = `<script type="application/ld+json">{ "@type": "Organization", "image": "https://cdn.example.org/logo.jpg" }</script>
    <meta property="og:image" content="https://cdn.example.org/share.jpg">`;
  assert.equal(readPreview(html, 'https://example.org/').image, 'https://cdn.example.org/share.jpg');
  const broken = `<script type="application/ld+json">{ not json</script><meta property="og:image" content="/ok.jpg">`;
  assert.equal(readPreview(broken, 'https://example.org/a').image, 'https://example.org/ok.jpg');
  const priv = `<script type="application/ld+json">{ "@type": "Article", "image": "http://127.0.0.1/a.jpg" }</script>
    <meta property="og:image" content="https://cdn.example.org/share.jpg">`;
  assert.equal(readPreview(priv, 'https://example.org/').image, 'https://cdn.example.org/share.jpg');
});


// Research's "Fetch link previews" is on by default (Thomas, 2026-10-02): an environment that never saved it fetches
// previews; one that saved it off stays off. The server's routes read exactly these values (values.linkPreviews === true).
test('Research link previews are on unless an environment turned them off', () => {
  const fs = require('node:fs');
  const os = require('node:os');
  const path = require('node:path');
  const { ModuleSettings } = require('../server/module-settings.js');
  const manifest = JSON.parse(fs.readFileSync(new URL('../modules/research/module.json', import.meta.url), 'utf8'));
  const def = (manifest.settings || []).find((s) => s.key === 'linkPreviews');
  assert.ok(def, 'Research declares linkPreviews');
  assert.equal(def.scope, 'environment');
  assert.equal(def.default, true, 'linkPreviews defaults to on');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'link-preview-'));
  try {
    const fresh = new ModuleSettings(dir);
    assert.equal(fresh.values(manifest, 'environment', {}).linkPreviews, true, 'never saved: on');
    fresh.set(manifest, 'environment', {}, { linkPreviews: false }, 'check');
    assert.equal(fresh.values(manifest, 'environment', {}).linkPreviews, false, 'saved off: off');
    assert.equal(new ModuleSettings(dir).values(manifest, 'environment', {}).linkPreviews, false, 'saved off: still off after a restart');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// The request the reader sends, to a local server standing in for a page (its address given as already checked).
{
  const http = require('node:http');
  const saved = process.env.PRODUCT_NAME;
  process.env.PRODUCT_NAME = 'Testname';
  let seen = null;
  const server = http.createServer((req, res) => { seen = req.headers['user-agent']; res.end('<title>t</title>'); });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  try {
    await getOnce(new URL(`http://preview.test:${server.address().port}/`), ['127.0.0.1'], 4096);
    assert.equal(seen, `Testname/${version}`, 'the user-agent: the configured product name and the version');
    n += 1;
    console.log('ok the user-agent names the product and its version');
    // A name a header can't carry (above Latin-1) still sends a valid user-agent: printable ASCII kept, spaces as
    // hyphens, the default when nothing is left.
    const { DEFAULT_PRODUCT_NAME } = require('../server/product-name.js');
    for (const [name, shown] of [['Kollab \u2013 Mesa', 'Kollab-Mesa'], ['\u5354\u4f5c', DEFAULT_PRODUCT_NAME], ['Pub \u{1F37A}', 'Pub']]) {
      process.env.PRODUCT_NAME = name;
      seen = null;
      await getOnce(new URL(`http://preview.test:${server.address().port}/`), ['127.0.0.1'], 4096);
      assert.equal(seen, `${shown}/${version}`, `the user-agent for ${JSON.stringify(name)}`);
    }
    n += 1;
    console.log('ok a product name a header can\'t carry still sends a valid user-agent');
  } finally {
    server.close();
    if (saved === undefined) delete process.env.PRODUCT_NAME; else process.env.PRODUCT_NAME = saved;
  }
}
// An IPv6 address in the address: refused before any request, as a refusal, never a throw that stops the process. And a
// connection that fails at once (an address family this machine lacks) is a rejected request, never an uncaught error.
{
  const http = require('node:http');
  let hits = 0;
  const server = http.createServer((req, res) => { hits += 1; res.end('BEGIN:VCALENDAR'); });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  let uncaught = null;
  const onUncaught = (err) => { uncaught = err; };
  process.on('uncaughtException', onUncaught);
  try {
    for (const scheme of ['http', 'https']) {
      for (const host of ['[::ffff:127.0.0.1]', '[::ffff:7f00:1]', '[::1]', '[64:ff9b::7f00:1]']) {
        const url = `${scheme}://${host}:${port}/x.ics`;
        await assert.rejects(fetchPreview(url), (err) => err.name === 'PreviewError', url);
        await assert.rejects(fetchCalendar(url), (err) => err.name === 'PreviewError' && err.code === 'blocked', url);
      }
    }
    for (const scheme of ['http', 'https']) {
      await assert.rejects(getOnce(new URL(`${scheme}://[::ffff:127.0.0.1]:${port}/`), ['::ffff:7f00:1'], 4096), (err) => err.name === 'PreviewError', scheme);
    }
    await new Promise((resolve) => setTimeout(resolve, 200));
    assert.equal(uncaught, null, `nothing uncaught: ${uncaught && uncaught.message}`);
    assert.equal(hits, 0, 'the local server was never reached');
    n += 1;
    console.log('ok an IPv6 address in the address is refused, and a failing connection never stops the process');
  } finally {
    process.off('uncaughtException', onUncaught);
    server.close();
  }
}
console.log(`check-link-preview: OK (${n} checks)`);
