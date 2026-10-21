#!/usr/bin/env node
/*
 * check-product-pages.mjs -- the product's pages at the bare base domain (documentation/plans/plan-product-pages.md,
 * decision 8): public/landing.html (the front page) and each public/landing-<use>.html share one header, footer and
 * sign-in block, and the page head's fixed lines. They are plain files with no build step, so this check is what keeps
 * the copies the same. Also: every use page file is in server/index.js's PRODUCT_PAGES table, and each page has its own
 * <title> and description. The routing itself (200, 404, `pages`) is checked in check-origin.mjs.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.join(ROOT, 'public');
const squash = (s) => s.replace(/\s+/g, ' ').trim();
const one = (html, re) => { const m = re.exec(html); return m ? squash(m[0]) : null; };

// The shared blocks of a page: name -> its text (whitespace squashed), or null when the page does not have it.
export function blocksOf(html) {
  return {
    'viewport': one(html, /<meta name="viewport"[^>]*>/),
    'content security policy': one(html, /<meta http-equiv="Content-Security-Policy"[^>]*>/),
    'stylesheet': one(html, /<link rel="stylesheet" href="\/landing\.css">/),
    'script': one(html, /<script type="module" src="\/landing\.js"><\/script>/),
    'brand': one(html, /<a class="brand"[^>]*>[\s\S]*?<\/a>/),
    'sign in button': one(html, /<a [^>]*id="nav-signin"[^>]*>[\s\S]*?<\/a>/),
    'get started button': one(html, /<a [^>]*data-contact-link[^>]*>[\s\S]*?<\/a>/),
    'sign-in section': one(html, /<section id="signin"[\s\S]*?<\/section>/),
    'footer': one(html, /<footer class="foot">[\s\S]*?<\/footer>/),
  };
}

// The problems among pages ({ name: html }): a block a page lacks, or one that differs from the front page's.
export function problemsOf(pages) {
  const problems = [];
  const names = Object.keys(pages);
  const reference = blocksOf(pages[names[0]]);
  for (const name of names) {
    const html = pages[name];
    const blocks = blocksOf(html);
    for (const [block, text] of Object.entries(blocks)) {
      if (text === null) problems.push(`${name}: the ${block} is missing.`);
      else if (reference[block] !== null && text !== reference[block]) problems.push(`${name}: the ${block} differs from ${names[0]}'s.`);
    }
    const title = one(html, /<title[^>]*>[\s\S]*?<\/title>/);
    const description = /<meta name="description" content="([^"]+)"/.exec(html);
    if (!title) problems.push(`${name}: it has no <title>.`);
    if (!description) problems.push(`${name}: it has no meta description.`);
    if (/href="#signin"/.test(html) && !blocks['sign-in section']) problems.push(`${name}: it links to #signin but has no sign-in section.`);
  }
  const titles = names.map((n) => one(pages[n], /<title[^>]*>[\s\S]*?<\/title>/));
  const descriptions = names.map((n) => (/<meta name="description" content="([^"]+)"/.exec(pages[n]) || [])[1]);
  if (new Set(titles).size !== titles.length) problems.push('Two pages share a <title>.');
  if (new Set(descriptions).size !== descriptions.length) problems.push('Two pages share a description.');
  return problems;
}

let n = 0;
const test = (name, fn) => { fn(); n += 1; };

const files = fs.readdirSync(PUBLIC).filter((f) => f === 'landing.html' || /^landing-[a-z]+\.html$/.test(f)).sort((a, b) => (a === 'landing.html' ? -1 : b === 'landing.html' ? 1 : a.localeCompare(b)));
const pages = Object.fromEntries(files.map((f) => [f, fs.readFileSync(path.join(PUBLIC, f), 'utf8')]));

test('the front page is there', () => assert.equal(files[0], 'landing.html'));
test('the product pages share the header, sign-in and footer blocks', () => assert.deepEqual(problemsOf(pages), []));
test('every use page is in the server\'s table', () => {
  const src = fs.readFileSync(path.join(ROOT, 'server', 'index.js'), 'utf8');
  const table = /const PRODUCT_PAGES = \[([\s\S]*?)\];/.exec(src);
  assert.ok(table, 'PRODUCT_PAGES in server/index.js');
  for (const f of files.slice(1)) assert.ok(table[1].includes(`file: '${f}'`), `${f} has no row in PRODUCT_PAGES`);
});

// The check itself: it fails on a changed footer, a missing block and a shared title.
test('it fails on a changed footer', () => {
  const [front, ...rest] = files;
  const second = rest[0] || front;
  const changed = pages[second].replace('Self-host it', 'Host it yourself');
  const found = problemsOf({ [front]: pages[front], 'changed.html': changed.replace('<title', '<title data-x="1"').replace(/<meta name="description" content="[^"]*"/, '<meta name="description" content="Another."') });
  assert.ok(found.some((p) => /changed\.html: the footer differs/.test(p)), found.join(' | '));
});
test('it fails on a missing sign-in section, a changed brand and a shared title', () => {
  const front = pages['landing.html'];
  const found = problemsOf({ 'landing.html': front, 'a.html': front.replace(/<section id="signin"[\s\S]*?<\/section>/, '').replace('class="brand"', 'class="mark"') });
  assert.ok(found.some((p) => /a\.html: the sign-in section is missing/.test(p)), found.join(' | '));
  assert.ok(found.some((p) => /a\.html: the brand is missing/.test(p)), found.join(' | '));
  assert.ok(found.some((p) => /Two pages share a <title>/.test(p)), found.join(' | '));
});

console.log(`check-product-pages: ${n} OK (${files.join(', ')})`);
