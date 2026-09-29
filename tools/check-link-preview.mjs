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

console.log(`check-link-preview: OK (${n} checks)`);
