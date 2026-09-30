#!/usr/bin/env node
/*
 * check-slot-names.mjs -- every picture slot on a page (.slot > .slot-pick-wrap > label.slot-pick) can be named and
 * can take a paste: slot-paste.js names a slot from its data-slot-name, or from its caption (a <span> in the .slot,
 * outside the picture) after the names of its data-slot-group ancestors. A slot with neither would be read out as just
 * "Picture". And a page with slots loads slot-paste.js from its own script, or its slots take no paste.
 * Reads the markup as text; no server.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PUBLIC = path.resolve(process.argv[2] || path.join(ROOT, 'public')); // a folder to read instead, for testing the check
const failures = [];
let slots = 0;
let pages = 0;

// A tag's class list holds this class, whatever the attribute order or line breaks.
const hasClass = (tag, name) => new RegExp(`\\bclass\\s*=\\s*["'][^"']*(?<![\\w-])${name}(?![\\w-])[^"']*["']`).test(tag);
const DIV_TAG = /<(\/?)div\b[^>]*>/g; // [^>] crosses line breaks

for (const file of fs.readdirSync(PUBLIC).filter((f) => f.endsWith('.html')).sort()) {
  const html = fs.readFileSync(path.join(PUBLIC, file), 'utf8');
  const wraps = [...html.matchAll(/<[a-z][^>]*>/gi)].filter((t) => hasClass(t[0], 'slot-pick-wrap')).length;
  if (!wraps) continue;
  pages += 1;
  let found = 0;
  // Each slot: from its opening <div> tag to the </div> that closes it.
  const starts = [...html.matchAll(/<div\b[^>]*>/g)].filter((t) => hasClass(t[0], 'slot'));
  starts.forEach((m) => {
    const tags = new RegExp(DIV_TAG.source, 'g');
    tags.lastIndex = m.index;
    let depth = 0;
    let end = html.length;
    for (let t; (t = tags.exec(html));) {
      depth += t[1] ? -1 : 1;
      if (depth === 0) { end = t.index + t[0].length; break; }
    }
    const chunk = html.slice(m.index, end);
    const inner = [...chunk.matchAll(/<[a-z][^>]*>/gi)].filter((t) => hasClass(t[0], 'slot-pick-wrap')).length;
    if (!inner) return;
    found += inner;
    slots += 1;
    const where = `${file}:${html.slice(0, m.index).split('\n').length}`;
    if (inner > 1) failures.push(`${where}: one slot holds ${inner} pictures; give each picture its own .slot`);
    if (/\bdata-slot-name\s*=\s*"[^"]+"/.test(m[0])) return;
    // The caption sits outside the picture: drop the wrap (it holds no <div>) and look for a <span> with words.
    const outside = chunk.slice(m[0].length).replace(/<div\b[^>]*>[\s\S]*?<\/div>/, (w) => (hasClass(w.slice(0, w.indexOf('>') + 1), 'slot-pick-wrap') ? '' : w));
    const caption = [...outside.matchAll(/<span\b([^>]*)>([^<]*)<\/span>/g)].some((c) => !hasClass(`<span${c[1]}>`, 'unset') && c[2].trim());
    if (!caption) failures.push(`${where}: a picture slot with no data-slot-name and no caption`);
  });
  if (found !== wraps) failures.push(`${file}: ${wraps} picture(s) (.slot-pick-wrap) but ${found} inside a .slot the check can read; every picture needs a <div class="slot"> around it`);
  // The page's own module script(s) must import the paste helper (src and type in either order).
  const scripts = [...html.matchAll(/<script\b[^>]*>/g)].map((t) => t[0])
    .filter((t) => /\btype\s*=\s*["']module["']/.test(t))
    .map((t) => t.match(/\bsrc\s*=\s*["']\/([^"']+)["']/)?.[1]).filter(Boolean);
  const loads = scripts.some((s) => {
    const js = path.join(PUBLIC, s);
    return fs.existsSync(js) && /import\s+['"]\/slot-paste\.js['"]/.test(fs.readFileSync(js, 'utf8'));
  });
  if (!loads) failures.push(`${file}: has picture slots but its script does not import '/slot-paste.js'`);
}

const helper = fs.readFileSync(path.join(PUBLIC, 'slot-paste.js'), 'utf8');
for (const needle of ['dataset.slotName', "'[data-slot-group]'"]) {
  if (!helper.includes(needle)) failures.push(`slot-paste.js: no longer reads ${needle}; the markup above relies on it`);
}

if (failures.length) {
  for (const f of failures) console.error(`check-slot-names: ${f}`);
  process.exit(1);
}
console.log(`check-slot-names: OK (${slots} picture slots on ${pages} pages)`);
