#!/usr/bin/env node
/*
 * check-module-chrome.mjs -- a module window's "+" (host.add.set) and its status bar (host.status.set), step 1 of
 * documentation/plans/plan-module-titlebar-add.md. public/module-chrome.js holds the pure rules; module-host.js draws
 * with them and canvas.js gives them their places. This fails when:
 *   - the "+"'s entries are not cleaned to the contract (the caps, one level, a one-leaf category as its leaf);
 *   - one leaf does not run at once with its label as the name, or several do not open the menu (categories as flyouts);
 *   - the status items are not cleaned (4 at most, one end item and last, 60 characters), the same items are not seen as
 *     the same, or the last item before the end one is not cut first;
 *   - the read-out speaks on the first draw, before 1.5 s of quiet, a quiet item, or the same text twice;
 *   - the fallback breaks: no titlebar answers false, and host.bar.set still draws the old bottom bar;
 *   - the chrome stops giving the "+" a slot and the status bar a labelled region, or moveModule rebuilds them instead
 *     of moving them.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/\r\n/g, '\n');
// Copied to a .mjs so Node reads it as the module it is (the package has no "type").
const copy = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'check-module-chrome-')), 'module-chrome.mjs');
fs.copyFileSync(path.join(ROOT, 'public/module-chrome.js'), copy);
const R = await import(pathToFileURL(copy).href);
fs.rmSync(path.dirname(copy), { recursive: true, force: true });

let passed = 0;
const failures = [];
function test(name, fn) {
  try { fn(); passed += 1; } catch (err) { failures.push(`${name}: ${err.message}`); }
}

test('the "+": entries cleaned to the contract', () => {
  const clean = R.cleanAddEntries([
    { divider: true },
    { id: 'note', label: 'Note', icon: 'note-sticky', tint: 'blue', hint: 'N' },
    { id: '', label: 'no id' },
    { id: 'x', label: '' },
    { id: 'bad', label: 'Bad icon', icon: 'Not An Icon!', tint: '#fff' },
    { divider: true },
    { divider: true },
    { label: 'Travel', icon: 'plane', items: [{ id: 'flight', label: 'Flight' }, { id: 'train', label: 'Train' }, { label: 'Nested', items: [{ id: 'z', label: 'Z' }] }] },
    { label: 'Stay', items: [{ id: 'hotel', label: 'Hotel' }] },
    { label: 'Empty', items: [] },
    { label: '', items: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }] },
    { divider: true },
  ]);
  assert.deepEqual(clean, [
    { id: 'note', label: 'Note', disabled: false, icon: 'note-sticky', tint: 'blue', hint: 'N' },
    { id: 'bad', label: 'Bad icon', disabled: false },
    { divider: true },
    { label: 'Travel', icon: 'plane', items: [{ id: 'flight', label: 'Flight', disabled: false }, { id: 'train', label: 'Train', disabled: false }] },
    { id: 'hotel', label: 'Hotel', disabled: false },
  ], 'no divider first, last or twice; one level; a one-leaf category is its leaf; an empty or unnamed one goes');
  assert.equal(R.cleanAddEntries([{ id: 'l', label: 'x'.repeat(80) }])[0].label.length, 40, 'labels up to 40');
  assert.deepEqual(R.cleanAddEntries(null), []);
  assert.deepEqual(R.cleanAddEntries('nope'), []);
});

test('the "+": the caps (8 top-level, 12 per category, 40 leaves)', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ id: `t${i}`, label: `T${i}` }));
  assert.equal(R.cleanAddEntries(many).length, 8, '8 top-level');
  const cat = { label: 'Big', items: Array.from({ length: 20 }, (_, i) => ({ id: `c${i}`, label: `C${i}` })) };
  assert.equal(R.cleanAddEntries([cat])[0].items.length, 12, '12 per category');
  const cats = Array.from({ length: 5 }, (_, k) => ({ label: `K${k}`, items: Array.from({ length: 12 }, (_, i) => ({ id: `k${k}-${i}`, label: `L${i}` })) }));
  const leaves = R.cleanAddEntries(cats).reduce((n, e) => n + (e.items ? e.items.length : 1), 0);
  assert.equal(leaves, 40, '40 leaves in all');
});

test('the "+": one leaf runs at once, several open the menu, none takes it away', () => {
  assert.deepEqual(R.addPlan(R.cleanAddEntries([])), { kind: 'none' });
  assert.deepEqual(R.addPlan(R.cleanAddEntries([{ divider: true }])), { kind: 'none' });
  const one = R.addPlan(R.cleanAddEntries([{ id: 'event', label: 'Add event', icon: 'plus' }]));
  assert.equal(one.kind, 'direct');
  assert.equal(one.leaf.id, 'event');
  assert.equal(one.leaf.label, 'Add event', 'the tooltip and the name are the leaf\'s label');
  const oneInCategory = R.addPlan(R.cleanAddEntries([{ label: 'Stay', items: [{ id: 'hotel', label: 'Hotel' }] }]));
  assert.equal(oneInCategory.kind, 'direct', 'a category of one is its leaf, so it runs at once too');
  assert.deepEqual(R.addPlan(R.cleanAddEntries([{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }])), { kind: 'menu', label: 'Add' });
  assert.equal(R.addPlan(R.cleanAddEntries([{ label: 'Travel', items: [{ id: 'f', label: 'Flight' }, { id: 't', label: 'Train' }] }])).kind, 'menu', 'one category of several: the menu');
});

test('the "+": the menu is the shared menu\'s shape, categories with items (flyouts), a pick sends the leaf\'s id', () => {
  const picked = [];
  const items = R.addMenuItems(R.cleanAddEntries([
    { id: 'note', label: 'Note', icon: 'note-sticky' },
    { divider: true },
    { label: 'Travel', icon: 'plane', items: [{ id: 'flight', label: 'Flight', tint: 'blue' }, { id: 'train', label: 'Train', disabled: true }] },
  ]), (id) => picked.push(id));
  assert.equal(items.length, 3);
  assert.equal(items[0].label, 'Note');
  assert.equal(items[0].icon, 'note-sticky');
  assert.deepEqual(items[1], { divider: true });
  assert.equal(items[2].label, 'Travel');
  assert.ok(Array.isArray(items[2].items) && items[2].items.length === 2, 'a category: its leaves in `items`, which the shared menu opens as a flyout');
  assert.equal(items[2].onPick, undefined, 'a category itself sends nothing');
  assert.equal(items[2].items[0].tint, 'blue');
  assert.equal(items[2].items[1].disabled, true);
  items[0].onPick();
  items[2].items[0].onPick();
  assert.deepEqual(picked, ['note', 'flight']);
});

test('the status bar: items cleaned (4 at most, one end item and last, 60 characters, the title)', () => {
  const clean = R.cleanStatusItems([
    { text: 'Updated now', quiet: true, end: true },
    { text: '12 of 40' },
    { text: '' },
    null,
    { text: 'Links', chip: true, icon: 'link' },
    { text: 'Second end', end: true },
    { text: 'x'.repeat(100), title: 'The whole long thing' },
    { text: 'one too many' },
  ]);
  assert.equal(clean.length, 4, '4 at most');
  assert.deepEqual(clean.map((i) => i.text), ['12 of 40', 'Links', 'Second end', 'Updated now'], 'in order, a second end item a plain one');
  assert.equal(clean[3].end, true, 'the end item goes last');
  assert.equal(clean.filter((i) => i.end).length, 1, 'one end item');
  assert.equal(clean[1].chip, true);
  assert.equal(clean[1].icon, 'link');
  assert.equal(clean[0].title, '12 of 40', 'the title is the text unless given');
  const long = R.cleanStatusItems([{ text: 'y'.repeat(100), title: 'The whole long thing' }])[0];
  assert.equal(long.text.length, 60, 'text up to 60');
  assert.equal(long.title, 'The whole long thing');
  assert.deepEqual(R.cleanStatusItems(undefined), []);
});

test('the status bar: the same items are the same, the text read out, the bar\'s title, who gives way first', () => {
  const a = R.cleanStatusItems([{ text: '3 open' }, { text: 'Updated 2 min ago', quiet: true, end: true }]);
  const b = R.cleanStatusItems([{ text: '3 open' }, { text: 'Updated 2 min ago', quiet: true, end: true }]);
  assert.equal(R.statusKey(a), R.statusKey(b), 'the same items: nothing drawn again');
  assert.notEqual(R.statusKey(a), R.statusKey(R.cleanStatusItems([{ text: '4 open' }])));
  assert.equal(R.statusSpoken(a), '3 open', 'a quiet item is not read out');
  assert.equal(R.statusTitle(a), '3 open · Updated 2 min ago', 'the bar\'s title is every item\'s text');
  const items = [{ w: 40 }, { w: 90 }, { w: 300 }, { w: 70, end: true }];
  assert.deepEqual(R.statusFit(items, 0), [null, null, null, null], 'it fits: nothing cut');
  assert.deepEqual(R.statusFit(items, 100.4), [null, null, 199, null], 'the last before the end is cut first, the rest whole');
  assert.deepEqual(R.statusFit(items, 350), [null, 40, 0, null], 'then the one before it');
  assert.deepEqual(R.statusFit(items, 1000), [0, 0, 0, null], 'the end item never gives way');
});

test('the read-out: polite and debounced (never the first draw, 1.5 s of quiet, never the same twice)', () => {
  let now = 0;
  let timers = [];
  const said = [];
  const a = R.createAnnouncer({
    write: (t) => said.push(t),
    setTimer: (fn, ms) => { const t = { fn, at: now + ms }; timers.push(t); return t; },
    clearTimer: (t) => { timers = timers.filter((x) => x !== t); },
  });
  const tick = (ms) => { now += ms; for (const t of timers.filter((x) => x.at <= now)) { timers = timers.filter((x) => x !== t); t.fn(); } };
  assert.equal(R.STATUS_QUIET_MS, 1500);
  a.update('Day 1 of 26');
  tick(5000);
  assert.deepEqual(said, [], 'never on the first draw');
  a.update('Day 2 of 26');
  tick(500);
  a.update('Day 3 of 26');
  tick(500);
  a.update('Day 4 of 26');
  tick(1499);
  assert.deepEqual(said, [], 'nothing while it keeps changing');
  tick(1);
  assert.deepEqual(said, ['Day 4 of 26'], 'once, after 1.5 s without a change');
  a.update('Day 4 of 26');
  tick(2000);
  assert.deepEqual(said, ['Day 4 of 26'], 'not the same text twice');
  a.update('Day 5 of 26');
  tick(700);
  a.update('Day 4 of 26');
  tick(2000);
  assert.deepEqual(said, ['Day 4 of 26'], 'back to what was last read out: nothing');
  a.update('');
  tick(2000);
  assert.deepEqual(said, ['Day 4 of 26'], 'the bar going away says nothing');
  a.update('Day 9 of 26');
  a.stop();
  tick(2000);
  assert.deepEqual(said, ['Day 4 of 26'], 'stopped: nothing more');
});

const host = read('public/module-host.js');
const canvas = read('public/canvas.js');
const sdk = read('public/sdk/host.js');
const css = read('public/style.css');
const sdkCss = read('public/sdk/host.css');

test('the fallback: no titlebar or status place answers false; host.bar.set still draws the old bottom bar', () => {
  assert.match(host, /async 'add\.set'\(\{ entries \}\) \{\s*\n\s*if \(!add\) return false;/);
  assert.match(host, /async 'status\.set'\(\{ items \}\) \{\s*\n\s*if \(!status\) return false;/);
  assert.match(host, /if \(key === statusLast\) return true;/, 'the same items draw nothing');
  assert.match(host, /async 'bar\.set'\(\{ items \}\) \{[\s\S]{0,1200}drawModuleBar\(\);/, 'bar.set still draws the action bar');
  assert.match(sdk, /add: \{\s*\n\s*set: \(entries\) => call\('add\.set', \{ entries \}\),/);
  assert.match(sdk, /status: \{\s*\n\s*set: \(items\) => call\('status\.set', \{ items \}\),/);
  assert.match(sdk, /bar: \{[\s\S]{0,400}set: \(items\) => call\('bar\.set', \{ items \}\),/, 'host.bar.set stays');
  assert.match(sdk, /'add' \(\{ id \}\)/, 'the add event is in the contract');
});

test('the "+" and the status bar as drawn: names, the shared menu, the live node, focus back to the "+"', () => {
  assert.match(host, /import \{ cleanAddEntries, addPlan, addMenuItems, cleanStatusItems, statusKey, statusTitle, statusSpoken, statusFit, createAnnouncer \} from '\/module-chrome\.js';/);
  assert.match(host, /openHostMenu\(addButton, \(\) => addMenuItems\(addEntries, \(id\) => send\('add', \{ id \}\)\)\)/, 'several: the shared menu');
  assert.match(host, /if \(now\.kind === 'direct'\) \{ if \(!now\.leaf\.disabled\) send\('add', \{ id: now\.leaf\.id \}\); return; \}/, 'one: at once');
  assert.match(host, /addButton\.setAttribute\('aria-label', label\);/);
  assert.match(host, /addButton\.setAttribute\('aria-haspopup', 'menu'\);/);
  assert.match(host, /addButton\.removeAttribute\('aria-haspopup'\);/, 'one leaf is a plain button');
  assert.match(host, /statusLive\.setAttribute\('aria-live', 'polite'\);/);
  assert.match(host, /statusLive\.className = 'visually-hidden';/);
  assert.match(host, /status\.hidden = clean\.length === 0;/, 'hidden when empty');
  assert.match(host, /const fit = statusFit\(/, 'one line: cut in order');
  assert.match(host, /statusObserver\.observe\(status\);/, 'and again when the window changes width');
  assert.match(host, /if \(item\.quiet\) el\.setAttribute\('aria-hidden', 'true'\);/);
  assert.match(host, /event === 'nav' \|\| event === 'add'\)\) opener =/, 'focus goes back to the "+" when its editor closes');
});

test('the chrome: a "+" slot before "...", a labelled status region, moved (not rebuilt) between docked and floating', () => {
  const header = canvas.slice(canvas.indexOf('  const moduleHeader = '), canvas.indexOf('  // The page a composite holds'));
  assert.ok(header.includes('<span class="titlebar-custom" data-header-custom></span><span class="titlebar-add" data-header-add hidden></span>${snapHtml'), 'icon, name, tools, "+", then the host\'s buttons');
  assert.match(canvas, /const statusHtml = \(m\) => `<div class="mod-status" data-status role="region" aria-label="\$\{escapeHtml\(`\$\{m\.name\} status`\)\}" hidden><\/div>`;/);
  const floating = canvas.slice(canvas.indexOf('  function openModuleFloating('), canvas.indexOf('  function openModuleDocked('));
  const docked = canvas.slice(canvas.indexOf('  function openModuleDocked('), canvas.indexOf('  function moveModule('));
  const move = canvas.slice(canvas.indexOf('  function moveModule('), canvas.indexOf('  // --- built-in modules'));
  assert.ok(floating.includes('${statusHtml(m)}\n      <div class="module-floating-bar" hidden></div>'), 'floating: under the content, above the old bar');
  assert.ok(docked.includes("${statusHtml(m)}\n      </div>\n      <div class=\"mod-bar dock-bar\" hidden></div>"), 'docked: the last thing in the module\'s own column');
  for (const [name, code] of [['floating', floating], ['docked', docked]]) {
    assert.ok(/if \(reuse\.add\) \w+\.querySelector\('\[data-header-add\]'\)\.replaceWith\(reuse\.add\);/.test(code), `${name}: the "+" moved in`);
    assert.ok(/if \(reuse\.status\) \w+\.querySelector\('\[data-status\]'\)\.replaceWith\(reuse\.status\);/.test(code), `${name}: the status bar moved in`);
  }
  assert.ok(move.includes("add: mod.el.querySelector('[data-header-add]'),") && move.includes("status: mod.el.querySelector('[data-status]'),"), 'moveModule carries both');
  assert.ok(canvas.includes("add: mod.el.querySelector('[data-header-add]'),\n      status: mod.el.querySelector('[data-status]'),\n      onOpenRef"), 'the mount gets both');
});

test('the styles: --status-bar-h 24px in both sheets, one line, tokens only', () => {
  assert.match(css, /--status-bar-h: 24px;/);
  assert.match(sdkCss, /--status-bar-h: 24px;/);
  const block = css.slice(css.indexOf('/* mod-chrome:start'), css.indexOf('/* mod-chrome:end */'));
  assert.ok(block.length > 100, 'the block is there');
  assert.match(block, /\.mod-status \{[^}]*height: var\(--status-bar-h\);[^}]*border-top: 1px solid var\(--border\);[^}]*color: var\(--text-dim\);[^}]*font-size: 12px;[^}]*white-space: nowrap;/);
  assert.ok(!/\.mod-status \{[^}]*background/.test(block), 'no colour of its own');
  assert.match(block, /\.mod-status\[hidden\] \{\s*display: none;/);
  assert.match(block, /\.mod-status-text \{[^}]*text-overflow: ellipsis;/);
  assert.match(block, /\.canvas\.narrow \.module-docked \.mod-add \{[^}]*width: 44px;/, '44 px on a phone');
  assert.ok(!/#[0-9a-f]{3,6}\b/i.test(block) && !/rgba?\(/.test(block), 'tokens only');
});

if (failures.length) {
  console.error(`check-module-chrome: ${failures.length} failed`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`check-module-chrome: OK (${passed} checks)`);
