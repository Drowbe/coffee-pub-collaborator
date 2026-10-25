#!/usr/bin/env node
/*
 * check-design-system-catalog.mjs -- the Design System page (public/design-system/index.html, "what is in production") and the
 * Prototype page show only what the product really has. Static: no browser, no server; it reads the files.
 *
 * Fails on:
 *   (a) a class in a catalog example's markup (public/design-system/components*.js: every look, every state cell, the live SDK
 *       pieces) that no rule of the stylesheets that example is drawn with names. The stylesheets per context are the product's:
 *       'app' is public/style.css and public/sdk/system.css (as every app page links them); 'host' is public/sdk/system.css and
 *       public/sdk/host.css (what the server puts in a module's page); 'mod:<id>' adds that module's own page stylesheets;
 *       'widget:<id>' its widget stylesheet. Font Awesome classes must be in Font Awesome Free's all.min.css (served as /fa/); the page's own frame
 *       classes (dsf-*) must be in ds.js; ds-force-* are the forced states ds.js writes.
 *   (b) a family block of public/sdk/system.css (between its `<id>:start` and `<id>:end` markers) with no catalog family
 *       (a family's `block`, else its `id`), a family that names a block that does not exist, or a family that uses none of its
 *       block's classes; the moduleframe family not linking to the Prototype page; a family that still carries the audit's
 *       duplicate notes (dup, dupCount).
 *   (c) a class the Prototype page (prototype.html, prototype.js) writes that no rule of the stylesheets it links names
 *       (style.css, sdk/system.css, its theme, prototype.css, pages.css; Font Awesome as above).
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { moduleStyles } from './design-system-snapshot.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DS = path.join(root, 'public', 'design-system');
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const problems = [];
const fail = (m) => problems.push(m);

// Every class a stylesheet's selectors name (comments and declarations left out).
function classesOf(css) {
  const out = new Set();
  const body = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'/g, '""');
  for (const m of body.matchAll(/([^{}]+)\{/g)) {
    const sel = m[1].split(';').pop().trim();
    if (!sel || sel.startsWith('@')) continue;
    for (const c of sel.matchAll(/\.(-?[A-Za-z_][\w-]*)/g)) out.add(c[1]);
  }
  return out;
}
const union = (...sets) => { const s = new Set(); for (const x of sets) for (const c of x) s.add(c); return s; };

const system = read('public/sdk/system.css');
const SYS = classesOf(system);
const APP = union(classesOf(read('public/style.css')), SYS);
const HOST = union(SYS, classesOf(read('public/sdk/host.css')));
const FA = classesOf(read('node_modules/@fortawesome/fontawesome-free/css/all.min.css')); // served as /fa/
const MODS = moduleStyles();
const ctxClasses = new Map();
function sheetsFor(ctx) {
  if (ctxClasses.has(ctx)) return ctxClasses.get(ctx);
  let set = null;
  if (ctx === 'app') set = APP;
  else if (ctx === 'host') set = HOST;
  else if (/^(mod|widget):/.test(ctx)) {
    const [kind, id] = ctx.split(':');
    const files = (MODS[id] && MODS[id].files) || [];
    if (!files.length) fail(`a catalog example is drawn in ${ctx}, and modules/${id}/src has no stylesheet`);
    const mine = files.filter((f) => (kind === 'mod' ? f.page !== false : /-widget\.css$/.test(f.file)));
    set = union(HOST, ...mine.map((f) => classesOf(f.text)));
  } else fail(`a catalog example names an unknown context: ${ctx}`);
  ctxClasses.set(ctx, set || new Set());
  return ctxClasses.get(ctx);
}

const dsJs = fs.readFileSync(path.join(DS, 'ds.js'), 'utf8');
const FRAME = new Set([...dsJs.matchAll(/\.(dsf-[\w-]+)/g)].map((m) => m[1]));
const classAttrs = (html) => [...String(html).matchAll(/\bclass="([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/).filter(Boolean));
function checkClass(c, set, where) {
  if (/^ds-force-(hover|focus|active)$/.test(c)) return;
  if (c.startsWith('dsf-')) { if (!FRAME.has(c)) fail(`${where}: .${c} is not one of the page frame's own classes (ds.js)`); return; }
  if (c.startsWith('fa-')) { if (!FA.has(c)) fail(`${where}: .${c} is not a Font Awesome class (Font Awesome Free, all.min.css)`); return; }
  if (!set.has(c)) fail(`${where}: .${c} has no rule in the stylesheets it is drawn with`);
}

// ---- the catalog ----
const ctx = { window: {}, document: undefined };
ctx.window.window = ctx.window;
vm.createContext(ctx);
for (const f of ['components.js', 'components-2.js', 'components-3.js']) vm.runInContext(fs.readFileSync(path.join(DS, f), 'utf8'), ctx, { filename: f });
const families = ctx.window.DS_FAMILIES || [];
const live = ctx.window.DS_LIVE || [];
if (families.length < 20) fail(`the catalog has ${families.length} families (components*.js); it should have one per family block and more`);
if (!live.length) fail('the catalog has no live SDK pieces (window.DS_LIVE in components*.js)');

// (a) every class of every example
let nClasses = 0;
for (const fam of families) {
  if (fam.dup || fam.dupCount) fail(`${fam.id}: still carries the audit's duplicate notes (dup, dupCount)`);
  for (const v of fam.variants || []) {
    const c = v.ctx || 'app';
    const set = sheetsFor(c);
    if (v.dup) fail(`${fam.id} "${v.n}": still carries a duplicate note`);
    const cells = [v.html, ...(v.states || []).map((s) => (typeof s === 'object' && s.html) || '')];
    const used = cells.flatMap(classAttrs);
    for (const s of v.states || []) if (typeof s === 'object' && s.cls) used.push(...s.cls.split(/\s+/).filter(Boolean));
    for (const cl of new Set(used)) { nClasses += 1; checkClass(cl, set, `${fam.id} "${v.n}" (${c})`); }
  }
}
for (const spec of live) for (const cl of new Set(classAttrs(spec.body))) { nClasses += 1; checkClass(cl, sheetsFor(spec.ctx || 'host'), `${spec.id} (live, ${spec.ctx || 'host'})`); }

// (b) every family block of system.css has its catalog entry, and each entry shows its block's classes
const blocks = new Map();
for (const m of system.matchAll(/\/\* ([a-z][a-z0-9-]*):start \*\/([\s\S]*?)\/\* \1:end \*\//g)) blocks.set(m[1], classesOf(m[2]));
const opened = [...system.matchAll(/\/\* ([a-z][a-z0-9-]*):start \*\//g)].map((m) => m[1]);
for (const id of opened) if (!blocks.has(id)) fail(`system.css: the ${id} block has no matching ${id}:end marker`);
const byBlock = new Map();
for (const fam of families) { const b = fam.block || fam.id; if (!byBlock.has(b)) byBlock.set(b, []); byBlock.get(b).push(fam); }
for (const [id, cls] of blocks) {
  const fams = byBlock.get(id);
  if (!fams) { fail(`system.css has the ${id} family block and the catalog has no family for it (an entry with id or block '${id}')`); continue; }
  const used = new Set(fams.flatMap((f) => (f.variants || []).flatMap((v) => classAttrs(v.html))).concat(live.filter((l) => l.block === id).flatMap((l) => classAttrs(l.body))));
  if (![...cls].some((c) => used.has(c))) fail(`the catalog's ${id} family uses none of the classes of system.css's ${id} block`);
}
for (const fam of families) if (fam.block && !blocks.has(fam.block)) fail(`${fam.id}: names the block ${fam.block}, which system.css does not have`);
const mf = families.find((f) => (f.block || f.id) === 'moduleframe');
if (mf && !/prototype\.html/.test(JSON.stringify(mf))) fail('the moduleframe family does not link to /design-system/prototype.html');

// (c) the Prototype page
{
  const html = fs.readFileSync(path.join(DS, 'prototype.html'), 'utf8');
  const js = fs.readFileSync(path.join(DS, 'prototype.js'), 'utf8');
  const sheets = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)].map((m) => m[1]).filter((h) => !/\/fa\//.test(h));
  let set = new Set();
  for (const href of sheets) {
    const p = path.resolve(DS, href);
    if (!fs.existsSync(p)) { fail(`prototype.html links ${href}, which does not exist`); continue; }
    set = union(set, classesOf(fs.readFileSync(p, 'utf8')));
  }
  // Every theme the page can switch to (themes/<id>.css).
  for (const f of fs.readdirSync(path.join(DS, 'themes')).filter((n) => n.endsWith('.css'))) set = union(set, classesOf(fs.readFileSync(path.join(DS, 'themes', f), 'utf8')));
  const used = new Set(classAttrs(html.replace(/<!--[\s\S]*?-->/g, '')));
  // In the script: className = '...' or `...`, classList.add/toggle/remove('...'), and class="..." in markup strings.
  const words = (lit) => {
    // `${...}` right after a word is a computed name (fa-${name}): left out; `${a ? ' x' : ''}` adds whole classes.
    const s = lit.replace(/([\w-]*)\$\{([^}]*)\}/g, (all, pre, e) => (pre ? ' ' : ' ' + [...e.matchAll(/'([^']*)'/g)].map((x) => x[1]).join(' ') + ' '));
    return s.split(/\s+/).filter((w) => /^-?[A-Za-z_][\w-]*$/.test(w));
  };
  for (const m of js.matchAll(/\bclassName\s*=\s*(?:'([^']*)'|`([^`]*)`)/g)) for (const w of words(m[1] ?? m[2])) used.add(w);
  for (const m of js.matchAll(/\bclassList\.(?:add|toggle|remove|contains)\(\s*'([^']+)'/g)) used.add(m[1]);
  for (const c of classAttrs(js)) used.add(c);
  for (const c of used) {
    if (c.startsWith('fa-')) { if (!FA.has(c)) fail(`prototype: .${c} is not a Font Awesome class`); continue; }
    if (!set.has(c)) fail(`prototype: .${c} has no rule in the stylesheets prototype.html links`);
  }
}

if (problems.length) {
  console.error(`check-design-system-catalog: ${problems.length} problem(s):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`check-design-system-catalog: OK (${families.length} families, ${families.reduce((a, f) => a + (f.variants || []).length, 0)} looks, ${live.length} live pieces, ${nClasses} class uses; ${blocks.size} system.css blocks each in the catalog; the Prototype page's classes all have rules)`);
