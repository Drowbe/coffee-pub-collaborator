// We never hard-code a radius. Every border-radius in the product is one of five theme tokens, defined once on :root
// (public/style.css, and public/sdk/host.css for a module's page): --radius-min, -small, -medium, -large, -round.
// This check fails on any border-radius value that is not var(--radius-*), 0, inherit or unset, in every product CSS
// file and in the inline styles in JS and HTML (style strings, el.style.borderRadius), and when a token is missing
// from :root of either file. SVG rx/ry is not a CSS radius and is not read.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = ['--radius-min', '--radius-small', '--radius-medium', '--radius-large', '--radius-round'];

// What cannot use a token, each with its reason. A whole file (a vendored library) or one exact value in one file.
const ALLOW_FILES = {
  'modules/maps/src/maps-lib-a-maplibre.css': 'MapLibre GL\'s own minified stylesheet (third-party, replaced whole on upgrade)',
  'modules/maps/src/maps-lib-a-maplibre.js': 'MapLibre GL\'s own minified bundle (third-party, replaced whole on upgrade)',
};
const ALLOW_VALUES = [
  { file: 'modules/maps/src/maps.css', value: '50% 50% 50% 4px', why: 'the map pin is a teardrop: a circle with one square-ish corner; CSS scales every corner by the same factor when the radii overflow, so 999px would shrink the 4px corner away' },
  { file: 'modules/travel/src/travel-lib-cards.css', value: '50% 50% 50% 4px', why: 'the same teardrop pin shape on the place badge' },
];

const SKIP_DIRS = new Set(['node_modules', 'design', 'fa', 'vendor', '.git']);
function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (/\.(css|js|html)$/.test(e.name)) out.push(p);
  }
}
const files = [];
walk(path.join(root, 'public'), files);
for (const m of fs.readdirSync(path.join(root, 'modules'))) {
  const src = path.join(root, 'modules', m, 'src');
  if (fs.existsSync(src)) walk(src, files);
}

const OK_PART = /^(var\(--radius-(min|small|medium|large|round)\)|0|inherit|unset)$/;
const re = /border(?:-(?:top|bottom)-(?:left|right))?-radius\s*:\s*([^;}"'`]+)/g;
const bad = [];
let seen = 0;
for (const f of files) {
  const rel = path.relative(root, f).split(path.sep).join('/');
  if (ALLOW_FILES[rel]) continue;
  const text = fs.readFileSync(f, 'utf8');
  for (const m of text.matchAll(re)) {
    seen++;
    const value = m[1].replace(/\s*!important\s*$/, '').trim();
    if (value.split(/\s+/).every((p) => OK_PART.test(p))) continue;
    if (ALLOW_VALUES.some((a) => a.file === rel && a.value === value)) continue;
    const line = text.slice(0, m.index).split('\n').length;
    bad.push(`${rel}:${line}  border-radius: ${value}`);
  }
  // el.style.borderRadius = '6px' and { borderRadius: '6px' }
  for (const m of text.matchAll(/\bborder(?:Top|Bottom)?(?:Left|Right)?Radius\s*[=:]\s*(['"`])([^'"`]*)\1/g)) {
    seen++;
    const value = m[2].trim();
    if (value.split(/\s+/).every((p) => OK_PART.test(p))) continue;
    const line = text.slice(0, m.index).split('\n').length;
    bad.push(`${rel}:${line}  borderRadius = ${value}`);
  }
}
assert.deepEqual(bad, [], `a radius that is not a token (use var(--radius-min|small|medium|large|round)):\n  ${bad.join('\n  ')}`);
assert.ok(seen > 100, 'the scanner found the radii it should');

for (const css of ['public/style.css', 'public/sdk/host.css']) {
  const text = fs.readFileSync(path.join(root, css), 'utf8');
  const rootBlock = text.match(/(^|\n):root \{([\s\S]*?)\n\}/);
  assert.ok(rootBlock, `${css} has a :root block`);
  for (const t of TOKENS) {
    assert.match(rootBlock[2], new RegExp(`\\n\\s*${t}:\\s*[0-9]+px;`), `${css} :root defines ${t}`);
  }
}
const values = (css) => TOKENS.map((t) => fs.readFileSync(path.join(root, css), 'utf8').match(new RegExp(`${t}:\\s*([0-9]+px)`))[1]).join();
assert.equal(values('public/style.css'), values('public/sdk/host.css'), 'the radius tokens are the same in style.css and host.css');

console.log(`check-radius: ${seen} radii in ${files.length} files, all tokens`);
