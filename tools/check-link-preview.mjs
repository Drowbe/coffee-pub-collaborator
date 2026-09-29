#!/usr/bin/env node
/*
 * check-link-preview.mjs -- the page reader (server/link-preview.js) on its own: what it takes from HTML,
 * and which addresses it refuses before any request is made.
 */
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const { blockedAddress, blockedName, readPreview } = createRequire(import.meta.url)('../server/link-preview.js');

let n = 0;
const test = (name, fn) => { fn(); n += 1; console.log(`ok ${name}`); };

test('private and loopback addresses are refused', () => {
  for (const ip of ['127.0.0.1', '10.1.2.3', '192.168.1.1', '172.16.0.1', '169.254.169.254', '0.0.0.0', '::1', 'fe80::1', 'fd00::1', '::ffff:127.0.0.1']) {
    assert.equal(blockedAddress(ip), true, ip);
  }
  assert.equal(blockedAddress('8.8.8.8'), false);
  assert.equal(blockedAddress('2606:4700:4700::1111'), false);
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

console.log(`check-link-preview: OK (${n} checks)`);
