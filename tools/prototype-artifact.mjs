#!/usr/bin/env node
// Builds the Prototype (public/design-system/prototype.html) as a static folder that works from any location with no server:
//   node tools/prototype-artifact.mjs --out <dir> [--changed-since <file-or-timestamp>]
// It copies the real files (nothing is kept as a second copy) and turns every absolute path ('/x.js', url(/fonts/...)) into a
// relative one. Layout: index.html (the Prototype page), the product scripts it imports at the top, sdk/, fonts/, fa/, themes/.
// The last line printed is a JSON array of the published paths ([{"path":"..."}]); with --changed-since only the ones that
// changed: bytes different from the last build in <dir>, or a source file newer than the given file's time or timestamp (ms or date).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const pub = path.join(root, 'public');
const ds = path.join(pub, 'design-system');
const args = process.argv.slice(2);
const opt = (n) => { const i = args.indexOf(n); return i >= 0 ? args[i + 1] : undefined; };
const out = opt('--out');
if (!out) { console.error('usage: node tools/prototype-artifact.mjs --out <dir> [--changed-since <file-or-timestamp>]'); process.exit(2); }
const sinceArg = opt('--changed-since');
let since = null;
if (sinceArg !== undefined) {
  since = fs.existsSync(sinceArg) ? fs.statSync(sinceArg).mtimeMs : (/^\d+$/.test(sinceArg) ? Number(sinceArg) : Date.parse(sinceArg));
  if (!Number.isFinite(since)) { console.error('--changed-since: not a file, a timestamp or a date'); process.exit(2); }
}
const outDir = path.resolve(out);
const faDirs = ['@fortawesome/fontawesome-pro', '@fortawesome/fontawesome-free'].map((d) => path.join(root, 'node_modules', d)).filter((d) => fs.existsSync(d));

const files = new Map(); // out-relative path -> { data: Buffer, mtime }
const add = (rel, data, mtime) => files.set(rel, { data: Buffer.isBuffer(data) ? data : Buffer.from(data), mtime });
const rel = (from, to) => { const r = path.posix.relative(path.posix.dirname(from), to); return r.startsWith('.') ? r : './' + r; };
const read = (f) => ({ text: fs.readFileSync(f, 'utf8'), mtime: fs.statSync(f).mtimeMs });

// Absolute '/x' (a root path of public/) written as a path relative to the file `at` (an out path).
const rewriteJs = (text, at) => text.replace(/(\bfrom\s*|\bimport\s*\(?\s*)(['"])\/([^'"]+)\2/g, (m, a, q, p) => `${a}${q}${rel(at, p)}${q}`);
const rewriteCss = (text, at) => text.replace(/url\(\s*(['"]?)\/([^)'"]+)\1\s*\)/g, (m, q, p) => `url(${q}${rel(at, p)}${q})`);
const rewriteHtml = (text, at) => text.replace(/\b(src|href)="\/([^"]+)"/g, (m, a, p) => `${a}="${rel(at, p)}"`);

// The page, with the paths that climbed out of design-system/ (../style.css) made into the flat layout.
{
  const { text, mtime } = read(path.join(ds, 'prototype.html'));
  const fixed = text.replace(/\b(src|href)="\.\.\/([^"]+)"/g, '$1="$2"')
    .replace(/<nav class="ds-pages"[\s\S]*?<\/nav>\n?/, ''); // the sibling pages are not in the folder
  add('index.html', rewriteHtml(fixed, 'index.html'), mtime);
}
// The page's own files, and the themes it can switch to.
for (const f of ['prototype.js', 'prototype.css', 'pages.css']) { const { text, mtime } = read(path.join(ds, f)); add(f, f.endsWith('.js') ? rewriteJs(text, f) : rewriteCss(text, f), mtime); }
for (const f of fs.readdirSync(path.join(ds, 'themes'))) { const { text, mtime } = read(path.join(ds, 'themes', f)); add('themes/' + f, rewriteCss(text, 'themes/' + f), mtime); }

// Every script the page imports, followed through its own imports; dynamic imports too.
const seen = new Set();
const walk = (rel0) => {
  if (seen.has(rel0)) return; seen.add(rel0);
  const src = path.join(pub, rel0);
  if (!fs.existsSync(src)) { console.error(`missing import: /${rel0}`); process.exit(1); }
  const { text, mtime } = read(src);
  add(rel0, rewriteJs(text, rel0), mtime);
  for (const m of text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]\/([^'"]+)['"]/g)) walk(m[1]);
};
for (const m of read(path.join(ds, 'prototype.js')).text.matchAll(/(?:\bfrom\s*|\bimport\s*\(?\s*)['"]\/([^'"]+)['"]/g)) walk(m[1]);

// Style sheets, the fonts they name, and the icon font.
const sheet = (r) => { const { text, mtime } = read(path.join(pub, r)); add(r, rewriteCss(text, r), mtime); for (const m of text.matchAll(/url\(\s*['"]?\/([^)'"]+)['"]?\s*\)/g)) copy(m[1]); };
const copy = (r) => { const f = path.join(pub, r); if (!files.has(r)) add(r, fs.readFileSync(f), fs.statSync(f).mtimeMs); };
sheet('style.css'); sheet('sdk/system.css');
for (const d of ['figtree', 'fraunces']) for (const f of fs.readdirSync(path.join(pub, 'fonts', d))) if (f.endsWith('.woff2')) copy(`fonts/${d}/${f}`);
const faCss = path.join(faDirs[0] || '', 'css/all.min.css');
if (!faDirs[0] || !fs.existsSync(faCss)) { console.error('Font Awesome is not installed (npm install)'); process.exit(1); }
add('fa/css/all.min.css', fs.readFileSync(faCss), fs.statSync(faCss).mtimeMs);
for (const m of fs.readFileSync(faCss, 'utf8').matchAll(/url\(\.\.\/webfonts\/([^)?#]+)/g)) { const f = path.join(faDirs[0], 'webfonts', m[1]); add('fa/webfonts/' + m[1], fs.readFileSync(f), fs.statSync(f).mtimeMs); }

// Write what is different, and note it.
const changed = [];
for (const [r, { data, mtime }] of files) {
  const dest = path.join(outDir, r);
  const same = fs.existsSync(dest) && fs.readFileSync(dest).equals(data);
  if (!same) { fs.mkdirSync(path.dirname(dest), { recursive: true }); fs.writeFileSync(dest, data); }
  if (!same || (since !== null && mtime > since)) changed.push(r);
}
const all = [...files.keys()].sort();
const total = [...files.values()].reduce((n, f) => n + f.data.length, 0);
console.error(`${all.length} files, ${(total / 1048576).toFixed(2)} MB, in ${outDir}${all.length > 255 ? ' (MORE THAN 255 FILES)' : ''}${total > 16 * 1048576 ? ' (OVER 16 MB)' : ''}`);
console.log(JSON.stringify((since === null ? all : changed.sort()).map((p) => ({ path: p }))));
