#!/usr/bin/env node
/*
 * check-switches.mjs -- the view switch is built once.
 *
 * A view switch (host.ui.viewSwitch in a module's toolbar or its own page, Chat's Private | Shared, a destination's
 * switches) is a .tb-tabs of .tb-tab choices, each an icon and a word. Its rules sit between the markers
 * view-switch:start and view-switch:end in public/style.css and public/sdk/host.css, word for word the same, and its
 * drawing and fit are hostSwitch in public/sdk/host.js (fill, fit, watch): while the words do not fit the switch's
 * container, the switch shows its icons only. This fails when:
 *   - the two copies of the rules differ, either is missing, or the icons-only rule is gone;
 *   - host.ui.viewSwitch drops an option's icon on the way to the toolbar, or its `element` switch is not drawn the shared way;
 *   - a choice in icons only loses its word as its accessible name and tooltip, a choice without an icon loses its word,
 *     the fit changes what is selected, or the words do not come back once they fit again;
 *   - a bundled module, or a host stylesheet outside the shared rules, sizes the switch itself;
 *   - the host's toolbar, Chat or the destination page stop drawing or fitting their switches the shared way;
 *   - a bundled module's view switch has a choice without an icon.
 */
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
const problems = [];
const fail = (msg) => problems.push(msg);
let n = 0;
const test = async (name, fn) => {
  try {
    await fn();
    n += 1;
  } catch (err) {
    fail(`${name}: ${err.message}`);
  }
};

// --- 1. The rules ---------------------------------------------------------------------------------------------------
const SIZE_PROPS = /^(width|height|min-width|min-height|max-width|max-height|padding|padding-[a-z]+|font|font-size|line-height|gap)$/;
const BLOCK = /\/\* view-switch:start[\s\S]*?\/\* view-switch:end \*\//g;

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
    out.push({ selector, decls });
  }
  return out;
}
// A selector aimed at the switch or one of its parts (its last compound names a tb-tab class).
const aimsAtSwitch = (selector) => selector.split(',').some((s) => /\.tb-tab(s|-glyph|-word|-icon)?\b(?![-\w])/.test(s.trim().split(/\s+|>|~|\+/).filter(Boolean).pop() || ''));

const style = read('public/style.css');
const sdkCss = read('public/sdk/host.css');
const blocks = {};
for (const [rel, text] of [['public/style.css', style], ['public/sdk/host.css', sdkCss]]) {
  const all = [...text.matchAll(BLOCK)];
  if (all.length !== 1) fail(`${rel}: needs exactly one view-switch:start ... view-switch:end block, found ${all.length}`);
  else blocks[rel] = all[0][0];
}
const a = blocks['public/style.css'];
const b = blocks['public/sdk/host.css'];
if (a && b && a !== b) {
  const al = a.split('\n');
  const bl = b.split('\n');
  const at = al.findIndex((line, i) => line !== bl[i]);
  fail(`the view switch's rules differ between public/style.css and public/sdk/host.css (block line ${at + 1}: "${al[at] ?? ''}" vs "${bl[at] ?? ''}"); keep them word for word the same`);
}
if (a) {
  const declared = rules(a);
  const sel = (s) => declared.find((r) => r.selector.split(',').map((x) => x.trim()).includes(s));
  for (const s of ['.tb-tabs', '.tb-tab', '.tb-tab.on', '.tb-tab-glyph', '.tb-tab-glyph svg', '.tb-tabs-compact .tb-tab-glyph ~ .tb-tab-word']) {
    if (!sel(s)) fail(`the view switch's rules have no ${s}`);
  }
  // Icons only hides the word only where there is an icon before it: a choice without one keeps its word.
  const hide = sel('.tb-tabs-compact .tb-tab-glyph ~ .tb-tab-word');
  if (hide && !hide.decls.some(([k, v]) => k === 'display' && v === 'none')) fail('the icons-only rule must hide the word (display: none) after an icon');
  for (const r of declared) {
    if (/\.tb-tab-word/.test(r.selector) && r.decls.some(([k, v]) => k === 'display' && v === 'none') && !/\.tb-tabs-compact\s+\.tb-tab-glyph\s*~\s*\.tb-tab-word/.test(r.selector)) {
      fail(`"${r.selector}" hides a choice's word outside icons only, or without an icon before it`);
    }
  }
  // Colours are the theme's tokens.
  for (const r of declared) {
    for (const [k, v] of r.decls) if (/color|background|border/.test(k) && /#[0-9a-f]{3,8}\b|rgb\(/i.test(v)) fail(`the view switch's ${r.selector} { ${k} } uses a fixed colour; use a theme token`);
  }
}

// Outside the shared rules nothing sizes the switch: the host's stylesheets (their own placement, colours and
// flex are theirs) and every bundled module's CSS, inline <style> and script-made CSS.
const hostSheets = fs.readdirSync(path.join(ROOT, 'public')).filter((f) => f.endsWith('.css')).map((f) => `public/${f}`).concat('public/sdk/host.css');
for (const rel of hostSheets) {
  const text = read(rel).replace(BLOCK, '');
  for (const r of rules(text)) {
    if (!aimsAtSwitch(r.selector)) continue;
    const sized = r.decls.filter(([k]) => SIZE_PROPS.test(k)).map(([k]) => k);
    if (sized.length) fail(`${rel}: "${r.selector}" sizes the view switch (${sized.join(', ')}) outside the shared view-switch rules`);
  }
}
const moduleFiles = [];
for (const id of fs.readdirSync(path.join(ROOT, 'modules'))) {
  const src = path.join(ROOT, 'modules', id, 'src');
  if (!fs.existsSync(src)) continue;
  for (const f of fs.readdirSync(src)) if (/\.(css|html|js)$/.test(f) && !/-lib-|\.min\./.test(f)) moduleFiles.push(`modules/${id}/src/${f}`);
}
for (const rel of moduleFiles) {
  const text = read(rel);
  const css = rel.endsWith('.css') ? text : rel.endsWith('.html') ? [...text.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n') : text;
  for (const r of rules(css)) {
    if (!aimsAtSwitch(r.selector)) continue;
    const sized = r.decls.filter(([k]) => SIZE_PROPS.test(k)).map(([k]) => k);
    if (sized.length) fail(`${rel}: "${r.selector.replace(/\s+/g, ' ').slice(-80)}" sizes the view switch (${sized.join(', ')}); the SDK's view-switch rules size it`);
  }
}

// --- 2. The SDK and the shared fit, run on their own ----------------------------------------------------------------
// A small stand-in for the DOM: class selectors only (".a", ":scope > .a", "[data-x]"), a width per element that
// follows the shared rules (a word shows unless its switch is in icons only and an icon comes before it).
class ClassList {
  constructor() { this.set = new Set(); }
  add(...c) { for (const x of c) this.set.add(x); }
  remove(...c) { for (const x of c) this.set.delete(x); }
  contains(c) { return this.set.has(c); }
  toggle(c, force) { const on = force === undefined ? !this.set.has(c) : Boolean(force); if (on) this.set.add(c); else this.set.delete(c); return on; }
}
class FakeEl {
  constructor(doc, tag) {
    this.ownerDocument = doc;
    this.tagName = tag.toUpperCase();
    this.nodeType = 1;
    this.children = [];
    this.parentElement = null;
    this.attrs = new Map();
    this.dataset = {};
    this.classList = new ClassList();
    this.text = '';
    this.listeners = {};
    this.style = {};
    this.fixedWidth = null;
  }
  get className() { return [...this.classList.set].join(' '); }
  set className(v) { this.classList = new ClassList(); for (const c of String(v).split(/\s+/).filter(Boolean)) this.classList.add(c); }
  get title() { return this.attrs.get('title') || ''; }
  set title(v) { this.attrs.set('title', String(v)); }
  get isConnected() { return true; }
  setAttribute(k, v) { this.attrs.set(k, String(v)); }
  getAttribute(k) { return this.attrs.has(k) ? this.attrs.get(k) : null; }
  hasAttribute(k) { return this.attrs.has(k); }
  removeAttribute(k) { this.attrs.delete(k); }
  appendChild(c) { c.parentElement = this; this.children.push(c); return c; }
  append(...cs) { for (const c of cs) if (typeof c === 'string') this.text += c; else this.appendChild(c); }
  get textContent() { return this.text + this.children.map((c) => c.textContent).join(''); }
  set textContent(v) { this.children = []; this.text = String(v); }
  set innerHTML(v) { this.children = []; this.text = ''; this.html = String(v); }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener(type, fn) { this.listeners[type] = (this.listeners[type] || []).filter((f) => f !== fn); }
  click() { for (const fn of this.listeners.click || []) fn({ target: this }); let p = this.parentElement; while (p) { for (const fn of p.listeners.click || []) fn({ target: this }); p = p.parentElement; } }
  matchesOne(s) {
    if (s.startsWith('[data-')) return Object.prototype.hasOwnProperty.call(this.dataset, s.slice(6, -1).replace(/-([a-z])/g, (_, c) => c.toUpperCase()));
    if (s.startsWith('.')) return s.slice(1).split('.').every((c) => this.classList.contains(c));
    return this.tagName === s.toUpperCase();
  }
  closest(s) { let e = this; while (e) { if (e.matchesOne(s)) return e; e = e.parentElement; } return null; }
  all() { return this.children.flatMap((c) => [c, ...c.all()]); }
  querySelectorAll(s) {
    const scoped = /^:scope\s*>\s*(.+)$/.exec(s);
    return scoped ? this.children.filter((c) => c.matchesOne(scoped[1].trim())) : this.all().filter((c) => c.matchesOne(s));
  }
  querySelector(s) { return this.querySelectorAll(s)[0] || null; }
  contains(e) { return e === this || this.all().includes(e); }
  // Widths: a glyph 15, a word 7 a letter, a choice's padding and border 22, the parts' gap 5.
  naturalWidth() {
    if (this.fixedWidth !== null) return this.fixedWidth;
    if (this.classList.contains('tb-tab')) {
      const compact = this.parentElement && this.parentElement.classList.contains('tb-tabs-compact');
      const glyph = this.querySelector(':scope > .tb-tab-glyph');
      const word = this.querySelector(':scope > .tb-tab-word');
      const wordShows = word && !(compact && glyph);
      return 22 + (glyph ? 15 : 0) + (wordShows ? word.textContent.length * 7 : 0) + (glyph && wordShows ? 5 : 0);
    }
    return this.children.reduce((sum, c) => sum + c.naturalWidth(), 0);
  }
  getBoundingClientRect() { const w = this.naturalWidth(); return { width: w, height: 24, left: 0, top: 0, right: w, bottom: 24 }; }
  get clientWidth() { return this.boxWidth ?? this.naturalWidth(); }
  get scrollWidth() { return Math.max(this.clientWidth, this.naturalWidth()); }
}
const observers = [];
const view = {
  addEventListener() {},
  requestAnimationFrame: (fn) => { fn(); return 1; },
  ResizeObserver: class { constructor(fn) { this.fn = fn; observers.push(this); } observe(el) { this.el = el; } },
  document: null,
};
const fakeDoc = { createElement: (tag) => new FakeEl(fakeDoc, tag), defaultView: view, head: null };
view.document = fakeDoc;
fakeDoc.head = fakeDoc.createElement('head');

const sdk = read('public/sdk/host.js');
const win = { addEventListener() {}, location: { search: '' } };
win.parent = win;
new Function('window', 'document', sdk)(win, fakeDoc);

const calls = [];
const call = async (method, params) => {
  calls.push([method, params]);
  if (method === 'hello') return { module: { id: 'todo' }, context: { scope: 'space', spaceId: 'r' } };
  if (method === 'icons.svg') return `<svg data-name="${params.name}" data-style="${params.style}"></svg>`;
  return true;
};
const { host, emit } = win.createHost({ call, root: fakeDoc, rootElement: fakeDoc.createElement('div') });
const tick = () => new Promise((r) => setTimeout(r, 0));
const sw = win.hostSwitch;

await test('the SDK shares the switch with the host pages (hostSwitch: fill, fit, watch)', () => {
  assert.ok(sw && typeof sw.fill === 'function' && typeof sw.fit === 'function' && typeof sw.watch === 'function');
});

await test('host.ui.viewSwitch takes an icon per choice and sends it to the toolbar', async () => {
  calls.length = 0;
  let picked = null;
  const s = host.ui.viewSwitch({ id: 'view', options: [{ id: 'month', label: 'Month', icon: 'calendar-days' }, { id: 'open', label: 'Open', icon: 'circle', regular: true }, { id: 'all', label: 'All' }], value: 'month', onChange: (v) => { picked = v; } });
  await tick();
  const set = calls.filter(([m]) => m === 'toolbar.set').pop();
  assert.ok(set, 'no toolbar.set');
  const opts = set[1].items[0].options;
  assert.equal(opts[0].icon, 'calendar-days');
  assert.equal(opts[1].icon, 'circle');
  assert.equal(opts[1].regular, true);
  assert.equal(opts[2].icon, undefined);
  emit('toolbar', { id: 'view', value: 'all' });
  assert.equal(picked, 'all');
  s.destroy();
});

const container = (width) => {
  const box = fakeDoc.createElement('div');
  box.boxWidth = width;
  const g = fakeDoc.createElement('span');
  g.className = 'tb-tabs';
  box.appendChild(g);
  return { box, g };
};
const choice = (g, o, on) => {
  const btn = fakeDoc.createElement('button');
  sw.fill(btn, o);
  if (on) btn.classList.add('on');
  btn.setAttribute('aria-pressed', String(Boolean(on)));
  g.appendChild(btn);
  return btn;
};

await test('a choice shows its icon and its word, its word its accessible name', () => {
  const { g } = container(400);
  const btn = choice(g, { id: 'week', label: 'Week', icon: 'calendar-week' });
  const glyph = btn.querySelector(':scope > .tb-tab-glyph');
  assert.ok(glyph, 'no icon');
  assert.ok(/fa-calendar-week/.test(glyph.className) && /fa-solid/.test(glyph.className), glyph.className);
  assert.equal(glyph.getAttribute('aria-hidden'), 'true');
  assert.equal(btn.querySelector(':scope > .tb-tab-word').textContent, 'Week');
  assert.equal(btn.getAttribute('aria-label'), 'Week');
  assert.equal(btn.title, '', 'a choice that shows its word needs no tooltip');
  const reg = choice(g, { id: 'open', label: 'Open', icon: 'circle', regular: true });
  assert.ok(/fa-regular/.test(reg.querySelector(':scope > .tb-tab-glyph').className));
  const bad = choice(g, { id: 'x', label: 'X', icon: 'not an icon"' });
  assert.equal(bad.querySelector(':scope > .tb-tab-glyph'), null, 'an icon name that is not one is not drawn');
});

await test('wide: the switch keeps its words; narrow: icons only, each word kept as title and aria-label', () => {
  const { box, g } = container(1000);
  const day = choice(g, { id: 'day', label: 'Day', icon: 'calendar-day' }, true);
  const agenda = choice(g, { id: 'list', label: 'Agenda', icon: 'list' });
  const plain = choice(g, { id: 'all', label: 'All' });
  sw.fit(box);
  assert.equal(g.classList.contains('tb-tabs-compact'), false, 'compact when the words fit');
  assert.equal(day.title, '');
  box.boxWidth = 120; // narrower than the words (about 200), wide enough for the icons
  sw.fit(box);
  assert.equal(g.classList.contains('tb-tabs-compact'), true, 'not compact when the words do not fit');
  for (const [btn, word] of [[day, 'Day'], [agenda, 'Agenda']]) {
    assert.equal(btn.getAttribute('aria-label'), word, `${word}: accessible name lost in icons only`);
    assert.equal(btn.title, word, `${word}: no tooltip in icons only`);
    assert.equal(btn.querySelector(':scope > .tb-tab-word').textContent, word, `${word}: the word is gone, not hidden`);
  }
  // A choice without an icon keeps its word: there is no icon for the rule to hide it after.
  assert.equal(plain.querySelector(':scope > .tb-tab-glyph'), null);
  assert.equal(plain.querySelector(':scope > .tb-tab-word').textContent, 'All');
  assert.ok(plain.naturalWidth() > 22, 'a choice without an icon lost its word');
  // What is selected does not change.
  assert.equal(day.classList.contains('on'), true);
  assert.equal(day.getAttribute('aria-pressed'), 'true');
  assert.equal(agenda.classList.contains('on'), false);
  // The words fit again: the words come back and the tooltips the fit added go.
  box.boxWidth = 1000;
  sw.fit(box);
  assert.equal(g.classList.contains('tb-tabs-compact'), false, 'still compact once the words fit again');
  assert.equal(day.title, '');
  assert.equal(day.getAttribute('aria-label'), 'Day');
});

await test('a title the page set itself is kept; a hidden container keeps the words', () => {
  const { box, g } = container(40);
  const btn = choice(g, { id: 'private', label: 'Private', icon: 'lock' });
  btn.title = 'Only you see AI answers';
  sw.fit(box);
  assert.equal(btn.title, 'Only you see AI answers');
  box.boxWidth = 1000;
  sw.fit(box);
  assert.equal(btn.title, 'Only you see AI answers');
  const hidden = container(0);
  choice(hidden.g, { id: 'a', label: 'Alpha', icon: 'lock' });
  sw.fit(hidden.box);
  assert.equal(hidden.g.classList.contains('tb-tabs-compact'), false);
});

await test('an icon-only choice (iconOnly) always has its word as title and aria-label', () => {
  const { g } = container(400);
  const btn = choice(g, { id: 'grid', label: 'Cards', icon: 'grip', iconOnly: true });
  assert.equal(btn.querySelector(':scope > .tb-tab-word'), null);
  assert.equal(btn.title, 'Cards');
  assert.equal(btn.getAttribute('aria-label'), 'Cards');
  assert.ok(btn.classList.contains('tb-tab-icon'));
});

await test('watch fits again when its container changes size', () => {
  const { box, g } = container(1000);
  choice(g, { id: 'money', label: 'Money', icon: 'coins' });
  sw.watch(box);
  assert.equal(g.classList.contains('tb-tabs-compact'), false);
  box.boxWidth = 30;
  const ro = observers.find((o) => o.el === box);
  assert.ok(ro, 'not observed');
  ro.fn([]);
  assert.equal(g.classList.contains('tb-tabs-compact'), true);
});

await test('host.ui.viewSwitch with `element` draws the shared switch in the page: SVG icons, pressed state, keeps its buttons', async () => {
  const holder = fakeDoc.createElement('div');
  holder.boxWidth = 1000;
  const el = fakeDoc.createElement('span');
  holder.appendChild(el);
  let picked = null;
  calls.length = 0;
  const s = host.ui.viewSwitch({ id: 'filter', element: el, options: [{ id: 'open', label: 'Open', icon: 'circle', regular: true }, { id: 'done', label: 'Done', icon: 'circle-check' }, { id: 'all', label: 'All' }], value: 'open', onChange: (v) => { picked = v; } });
  assert.equal(calls.filter(([m]) => m === 'toolbar.set').length, 0, 'an element switch is not drawn in the toolbar');
  assert.ok(el.classList.contains('tb-tabs'));
  const btns = el.querySelectorAll(':scope > .tb-tab');
  assert.equal(btns.length, 3);
  assert.equal(btns[0].getAttribute('aria-pressed'), 'true');
  assert.equal(btns[1].getAttribute('aria-pressed'), 'false');
  await tick();
  assert.ok(/data-name="circle" data-style="regular"/.test(btns[0].querySelector(':scope > .tb-tab-glyph').innerHTML ?? btns[0].querySelector(':scope > .tb-tab-glyph').html), 'the icon is not the SDK icon');
  btns[1].click();
  assert.equal(picked, 'done');
  assert.equal(btns[1].getAttribute('aria-pressed'), 'true');
  assert.equal(btns[0].classList.contains('on'), false);
  s.set('done', [{ id: 'open', label: 'Open (3)', icon: 'circle', regular: true }, { id: 'done', label: 'Done', icon: 'circle-check' }, { id: 'all', label: 'All' }]);
  const again = el.querySelectorAll(':scope > .tb-tab');
  assert.equal(again[0], btns[0], 'a new word rebuilt the buttons (the keyboard would lose its place)');
  assert.equal(again[0].querySelector(':scope > .tb-tab-word').textContent, 'Open (3)');
  assert.equal(again[0].getAttribute('aria-label'), 'Open (3)');
  holder.boxWidth = 60;
  sw.fit(holder);
  assert.ok(el.classList.contains('tb-tabs-compact'));
  assert.equal(again[0].title, 'Open (3)');
  s.destroy();
});

// --- 3. Every switch draws and fits the shared way, and every bundled one has its icons ------------------------------
const moduleHost = read('public/module-host.js');
const tabsDraw = /if \(item\.type === 'tabs'\) \{[\s\S]*?toolbar\.appendChild\(seg\);/.exec(moduleHost);
if (!tabsDraw || !/hostSwitch\.fill\(/.test(tabsDraw[0])) fail('public/module-host.js: the toolbar\'s tabs must be drawn with hostSwitch.fill (the shared view switch)');
if (!/hostSwitch\.watch\(toolbar\)/.test(moduleHost)) fail('public/module-host.js: the toolbar must be fitted with hostSwitch.watch(toolbar)');
if (!/icon: \/\^\[a-z0-9-\]\{1,40\}\$\/\.test\(o\?\.icon/.test(moduleHost)) fail('public/module-host.js: toolbar.set must keep a tabs option\'s icon');
const destination = read('public/destination.js');
if ((destination.match(/hostSwitch\.fill\(/g) || []).length < 2) fail('public/destination.js: the view switch and the panel switch must be drawn with hostSwitch.fill');
if ((destination.match(/hostSwitch\.watch\(/g) || []).length < 2) fail('public/destination.js: the view switch and the panel switch must be fitted with hostSwitch.watch');
const destViews = /calendar:\s*\{\s*views:\s*\[([^\]]*)\]/.exec(destination);
if (!destViews || (destViews[1].match(/\{[^}]*\}/g) || []).some((o) => !/icon:/.test(o))) fail('public/destination.js: every view of the Calendar destination needs an icon');
if (!/hostSwitch\.watch\(/.test(read('public/chat-input.js'))) fail('public/chat-input.js: Chat\'s Private | Shared must be fitted with hostSwitch.watch');
const spaceHtml = read('public/space.html');
for (const id of ['chat-ai-private', 'chat-ai-shared']) {
  const m = new RegExp(`<button[^>]*id="${id}"[^>]*>([\\s\\S]*?)</button>`).exec(spaceHtml);
  if (!m) { fail(`public/space.html: #${id} is gone`); continue; }
  if (!/class="tb-tab-glyph [^"]*fa-[a-z0-9-]+/.test(m[1]) || !/class="tb-tab-word"/.test(m[1])) fail(`public/space.html: #${id} needs an icon (.tb-tab-glyph) and its word (.tb-tab-word)`);
  if (!/aria-label="[^"]+"/.test(m[0])) fail(`public/space.html: #${id} needs its word as aria-label`);
}

// Every bundled module's view switch: each choice has an icon. Its options are an array in the call, or a const array.
for (const rel of moduleFiles.filter((f) => f.endsWith('.js'))) {
  const text = read(rel);
  for (const m of text.matchAll(/host\.ui\.viewSwitch\(\{([\s\S]*?)\}\)/g)) {
    const optionsAt = /options:\s*(\[[\s\S]*?\]|[A-Za-z_$][\w$]*)/.exec(m[1]);
    if (!optionsAt) continue;
    let list = optionsAt[1];
    if (!list.startsWith('[')) {
      const def = new RegExp(`const ${list}\\s*=\\s*(\\[[\\s\\S]*?\\])`).exec(text);
      if (!def) continue;
      list = def[1];
    }
    for (const o of list.match(/\{[^{}]*\bid:[^{}]*\}/g) || []) {
      if (!/\bicon:\s*'[a-z0-9-]+'/.test(o)) fail(`${rel}: a view switch choice has no icon: ${o.replace(/\s+/g, ' ')}`);
    }
  }
}

if (problems.length) {
  console.error(`check-switches: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`check-switches: ok (${n} cases, the shared rules, and every switch drawn the shared way with its icons)`);
