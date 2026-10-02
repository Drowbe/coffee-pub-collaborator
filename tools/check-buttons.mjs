#!/usr/bin/env node
/*
 * check-buttons.mjs -- the action button is defined once.
 *
 * The square icon button of the bottom row (the call's controls, the chat's Send, a module's action bar, a module's own
 * bottom buttons) is .action-btn: its size is --action-btn-h and its icon --action-icon-ratio of that. The app's own page
 * (public/style.css) and a module's page (public/sdk/host.css, which the server adds to every module page) each carry the
 * rules, between the markers action-btn:start and action-btn:end, and they must be word for word the same, with the same
 * two tokens. This fails when:
 *   - the two copies differ, or either is missing, or the tokens differ (the size, or the icon's share of it);
 *   - public/style.css sizes the call controls, the Send or the action bar's buttons outside the shared rules (a smaller
 *     button sets --action-btn-h, nothing else);
 *   - the call controls, the chat's Send or the host-drawn action bar stop using .action-btn;
 *   - a bundled module's CSS sizes .action-btn, sets the two tokens, or keeps its own copy (a button sized to the bottom
 *     row's 38px).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const problems = [];
const fail = (msg) => problems.push(msg);

const SIZE_PROPS = /^(width|height|min-width|min-height|max-width|max-height|padding|padding-[a-z]+|font|font-size|line-height)$/;
const TOKENS = /^--action-(btn-h|icon-ratio)$/;

// The shared block, between its markers.
function block(rel, text) {
  const all = [...text.matchAll(/\/\* action-btn:start[\s\S]*?\/\* action-btn:end \*\//g)];
  if (all.length !== 1) {
    fail(`${rel}: needs exactly one action-btn:start ... action-btn:end block, found ${all.length}`);
    return null;
  }
  return all[0];
}

// The innermost rules of a stylesheet, { selector, decls: [[prop, value]], at }, comments taken out (offsets kept).
function rules(text) {
  const clean = text.replace(/\/\*[\s\S]*?\*\//g, (c) => ' '.repeat(c.length));
  const out = [];
  const re = /([^{}]+)\{([^{}]*)\}/g;
  let m;
  while ((m = re.exec(clean))) {
    const selector = m[1].trim();
    if (selector.startsWith('@')) continue;
    const decls = m[2].split(';').map((d) => d.trim()).filter(Boolean).map((d) => {
      const i = d.indexOf(':');
      return [d.slice(0, i).trim().toLowerCase(), d.slice(i + 1).trim()];
    });
    out.push({ selector, decls, at: m.index + m[0].indexOf(m[1].trim()) });
  }
  return out;
}

const rootValue = (text, name) => {
  const root = /:root\s*\{([^}]*)\}/.exec(text.replace(/\/\*[\s\S]*?\*\//g, ''));
  const m = root && new RegExp(`${name}\\s*:\\s*([^;]+);`).exec(root[1]);
  return m ? m[1].trim() : null;
};

// 1. The two copies.
const style = read('public/style.css');
const sdk = read('public/sdk/host.css');
const a = block('public/style.css', style);
const b = block('public/sdk/host.css', sdk);
if (a && b && a[0] !== b[0]) {
  const al = a[0].split('\n');
  const bl = b[0].split('\n');
  const at = al.findIndex((line, i) => line !== bl[i]);
  fail(`the action button's rules differ between public/style.css and public/sdk/host.css (block line ${at + 1}: "${al[at] ?? ''}" vs "${bl[at] ?? ''}"); keep them word for word the same`);
}
if (a) {
  const declared = rules(a[0]).map((r) => r.selector);
  for (const sel of ['.action-btn', '.action-btn:hover', '.action-btn.primary', '.action-btn.primary:hover', '.action-btn:disabled']) {
    if (!declared.includes(sel)) fail(`the action button's rules have no ${sel}`);
  }
  const base = rules(a[0]).find((r) => r.selector === '.action-btn');
  const get = (p) => base && (base.decls.find(([k]) => k === p) || [])[1];
  if (base && get('width') !== 'var(--action-btn-h)') fail('.action-btn: width must be var(--action-btn-h)');
  if (base && get('height') !== 'var(--action-btn-h)') fail('.action-btn: height must be var(--action-btn-h)');
  if (base && get('font-size') !== 'calc(var(--action-btn-h) * var(--action-icon-ratio))') fail('.action-btn: font-size must be calc(var(--action-btn-h) * var(--action-icon-ratio))');
  for (const r of rules(a[0])) {
    for (const [k, v] of r.decls) {
      if (/color|background|border/.test(k) && /#[0-9a-f]{3,8}\b|rgba?\(/i.test(v)) fail(`${r.selector}: ${k} must come from the theme tokens, not ${v}`);
    }
  }
}

// The tokens: the same ratio, and the same height (style.css's --action-btn-h is the bottom row's --bar-control-h).
const ratioA = rootValue(style, '--action-icon-ratio');
const ratioB = rootValue(sdk, '--action-icon-ratio');
if (!ratioA || ratioA !== ratioB) fail(`--action-icon-ratio differs: public/style.css "${ratioA}", public/sdk/host.css "${ratioB}"`);
const px = (v) => (v && /^\d+(\.\d+)?px$/.test(v) ? parseFloat(v) : null);
let hA = rootValue(style, '--action-btn-h');
if (hA === 'var(--bar-control-h)') hA = rootValue(style, '--bar-control-h');
const hB = rootValue(sdk, '--action-btn-h');
if (px(hA) === null || px(hA) !== px(hB)) fail(`--action-btn-h differs: public/style.css "${hA}", public/sdk/host.css "${hB}"`);

// 2. No second sizing of the action button in the app's own stylesheet. The call's More menu (#floatbar-overflow)
// turns the controls into menu rows, which is not a button size.
const OURS = /\.action-btn\b|\.fbtn(?![-\w])|\.quick-add-go\b|\.bar-icon\b|#chat-form\b/;
for (const rel of ['public/style.css', 'public/sdk/host.css']) {
  const text = rel === 'public/style.css' ? style : sdk;
  const own = rel === 'public/style.css' ? a : b;
  for (const r of rules(text)) {
    if (own && r.at >= own.index && r.at < own.index + own[0].length) continue;
    if (!OURS.test(r.selector) || /#floatbar-overflow/.test(r.selector)) continue;
    // The icon inside: only the menu rows above may size it.
    const sizing = r.decls.filter(([k]) => SIZE_PROPS.test(k));
    const parts = r.selector.split(',').map((s) => s.trim()).filter((s) => OURS.test(s));
    // A rule on something inside the button (a badge, the meter, the caret) is not the button's size, except its icon.
    const onButton = parts.some((s) => /(\.action-btn|\.fbtn|\.quick-add-go|\.bar-icon)(:[\w-]+|\.[\w-]+|#[\w-]+)*$/.test(s) || /\s(i|svg|\.glyph i)$/.test(s));
    if (onButton && sizing.length) fail(`${rel}: "${r.selector}" sets ${sizing.map(([k]) => k).join(', ')}; the action button is sized only by its shared rules (set --action-btn-h for a smaller one)`);
  }
}

// 3. The markup and the host's action bar use it.
const space = read('public/space.html');
for (const m of space.matchAll(/<button\b[^>]*class="([^"]*(?<![\w-])fbtn(?![\w-])[^"]*)"[^>]*>/g)) {
  const id = (/\bid="([^"]+)"/.exec(m[0]) || [])[1] || '?';
  if (!/\baction-btn\b/.test(m[1])) fail(`public/space.html: the call control #${id} must be an .action-btn`);
}
const send = /<form id="chat-form">[\s\S]*?<button\b[^>]*type="submit"[^>]*>/.exec(space);
if (!send || !/class="[^"]*\baction-btn\b[^"]*\bprimary\b/.test(send[0])) fail('public/space.html: the chat\'s Send must be an .action-btn.primary');
const host = read('public/module-host.js');
if (!/className = 'action-btn primary quick-add-go'/.test(host)) fail('public/module-host.js: a quick-add\'s + must be an .action-btn.primary');
if (!/iconOnly \? `action-btn\$\{item\.primary \? ' primary' : ''\}`/.test(host)) fail('public/module-host.js: an action-bar button with an icon must be an .action-btn');

// 4. Modules use the SDK's button; they do not size it or keep a copy of it.
const BUTTON = /(^|[\s>+~,(])(button|\.btn|\.action-btn)\b/;
const BAR = /^(38px|var\(--(action-btn-h|bar-control-h)\))$/;
const modDir = path.join(ROOT, 'modules');
for (const id of fs.readdirSync(modDir).sort()) {
  const src = path.join(modDir, id, 'src');
  if (!fs.existsSync(src)) continue;
  for (const file of fs.readdirSync(src).sort()) {
    const rel = `modules/${id}/src/${file}`;
    let css = '';
    if (file.endsWith('.css')) css = read(rel);
    else if (file.endsWith('.html')) css = [...read(rel).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n');
    if (!css) continue;
    for (const r of rules(css)) {
      for (const [k, v] of r.decls) {
        if (TOKENS.test(k)) fail(`${rel}: "${r.selector}" sets ${k}; the action button's size and icon are the SDK's (public/sdk/host.css)`);
      }
      const sizing = r.decls.filter(([k]) => SIZE_PROPS.test(k));
      if (/\.action-btn\b/.test(r.selector) && sizing.length) fail(`${rel}: "${r.selector}" sets ${sizing.map(([k]) => k).join(', ')} on .action-btn; use it as the SDK draws it`);
      else if (BUTTON.test(r.selector) && r.decls.some(([k, v]) => /^(min-)?(height|width)$/.test(k) && BAR.test(v))) {
        fail(`${rel}: "${r.selector}" sizes a button to the bottom row's height; use the SDK's .action-btn (class="action-btn", .primary for the accent) instead of a copy`);
      }
    }
  }
}

if (problems.length) {
  for (const p of problems) console.error(`check-buttons: ${p}`);
  process.exit(1);
}
console.log('check-buttons: OK (the action button is defined once, in public/style.css and public/sdk/host.css alike)');
