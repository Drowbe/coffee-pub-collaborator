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
 *   - no titlebar does not answer false;
 *   - host.bar.set (kept for modules written for the old bar) stops folding its buttons into the "+" (the primary first,
 *     a quick-add a leaf sending an empty value, host.add.set's list winning), or the old bar comes back anywhere;
 *   - a bundled module calls host.bar.set (step 6: every one of them draws the "+");
 *   - the chrome stops giving the "+" a slot and the status bar a labelled region (a window, popped out and the module's
 *     own page), or moveModule rebuilds them instead of moving them.
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
const moduleJs = read('public/module.js');
const moduleHtml = read('public/module.html');

test('the old bar folded into the "+": each button a leaf, the primary first, a quick-add a leaf with no text', () => {
  const { entries, quick } = R.foldBarItems([
    { id: 'link', label: 'Add a link', icon: 'link' },
    { id: 'add', label: 'Add a note', icon: 'note-sticky', primary: true },
    { id: 'find', type: 'quickadd', placeholder: 'Search, or paste a link' },
    { id: 'go', type: 'quickadd', label: 'Add a place', icon: 'magnifying-glass' },
    { id: 'more', label: 'Export', overflow: true, iconOnly: true },
    { id: '', label: 'no id' },
    { id: 'x', label: '' },
  ]);
  assert.deepEqual(entries, [
    { id: 'add', label: 'Add a note', disabled: false, icon: 'note-sticky' },
    { id: 'link', label: 'Add a link', disabled: false, icon: 'link' },
    { id: 'find', label: 'Search, or paste a link', disabled: false, icon: 'plus' },
    { id: 'go', label: 'Add a place', disabled: false, icon: 'magnifying-glass' },
    { id: 'more', label: 'Export', disabled: false },
  ], 'the primary first, the rest in order; a quick-add named by its label, else its placeholder');
  assert.deepEqual([...quick], ['find', 'go'], 'the quick-adds, whose pick sends an empty value');
  assert.equal(R.foldBarItems([{ id: 'q', type: 'quickadd' }]).entries[0].label, 'Add', 'a quick-add with no words reads Add');
  assert.equal(R.foldBarItems(Array.from({ length: 14 }, (_, i) => ({ id: `b${i}`, label: `B${i}` }))).entries.length, 10, '10 at most, as the bar took');
  assert.deepEqual(R.foldBarItems(null).entries, []);
  // One button folds to one leaf: the "+" runs it at once, named by it.
  assert.equal(R.addPlan(R.cleanAddEntries(R.foldBarItems([{ id: 'add', label: 'New todo', icon: 'plus', primary: true }]).entries)).kind, 'direct');
});

test('the host: no old bar; bar.set folds into the "+", add.set\'s list wins, a fold pick sends the bar event', () => {
  assert.match(host, /async 'add\.set'\(\{ entries \}\) \{\s*\n\s*if \(!add\) return false;/);
  assert.match(host, /async 'status\.set'\(\{ items \}\) \{\s*\n\s*if \(!status\) return false;/);
  assert.match(host, /if \(key === statusLast\) return true;/, 'the same items draw nothing');
  assert.match(host, /async 'bar\.set'\(\{ items \}\) \{\s*\n\s*\(\{ entries: barFold, quick: barQuick \} = foldBarItems\(items\)\);\s*\n\s*drawAddSlot\(\);\s*\n\s*return true;/, 'bar.set folds and answers true');
  assert.match(host, /const drawAddSlot = \(\) => \{ if \(addSlot\) addSlot\.set\(addOwn !== null \? addOwn : barFold\); \};/, 'add.set\'s list wins over the fold');
  assert.match(host, /if \(event === 'add' && folding\(\)\) send\('bar', barQuick\.has\(data\.id\) \? \{ id: data\.id, value: '' \} : \{ id: data\.id \}\);/, 'a fold pick is the old bar event');
  for (const gone of ['drawModuleBar', 'barObserver', 'onBar', 'quick-add-go']) assert.ok(!host.includes(gone), `module-host.js: ${gone} is gone`);
  for (const [rel, code] of [['public/canvas.js', canvas], ['public/module.js', moduleJs], ['public/module.html', moduleHtml], ['public/style.css', css], ['public/sdk/host.css', sdkCss]]) {
    assert.ok(!/dock-bar|module-floating-bar|has-bar|id="module-bar"|\$\('module-bar'\)/.test(code), `${rel}: the old bar is gone`);
  }
  assert.match(sdk, /add: \{\s*\n\s*set: \(entries\) => call\('add\.set', \{ entries \}\),/);
  assert.match(sdk, /status: \{\s*\n\s*set: \(items\) => call\('status\.set', \{ items \}\),/);
  assert.match(sdk, /folds the buttons into\n\s*\/\/ the titlebar's "\+"/, 'the SDK\'s contract says bar.set folds into the "+"');
  assert.match(sdk, /'add' \(\{ id \}\)/, 'the add event is in the contract');
});

test('the "+" and the status bar as drawn: names, the shared menu, the live node, focus back to the "+"', () => {
  assert.match(host, /import \{ cleanAddEntries, addPlan, addMenuItems, foldBarItems, cleanStatusItems, statusKey, statusTitle, statusSpoken, statusFit, createAnnouncer, topmostAt, toolbarKey, focusedToolbarKey, restoreToolbarFocus \} from '\/module-chrome\.js';/);
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
  assert.ok(header.includes('<span class="titlebar-custom" data-header-custom></span><span class="titlebar-add" data-header-add hidden></span>${compositeOf(m) ? MORE_HTML'), 'icon, name, tools, "+", then the host\'s buttons (no snap switch: the Layout menu\'s Snap to grid is the one)');
  assert.match(canvas, /const statusHtml = \(m\) => `<div class="mod-status" data-status role="region" aria-label="\$\{escapeHtml\(`\$\{m\.name\} status`\)\}" hidden><\/div>`;/);
  const floating = canvas.slice(canvas.indexOf('  function openModuleFloating('), canvas.indexOf('  function openModuleDocked('));
  const docked = canvas.slice(canvas.indexOf('  function openModuleDocked('), canvas.indexOf('  function moveModule('));
  const move = canvas.slice(canvas.indexOf('  function moveModule('), canvas.indexOf('  // --- built-in modules'));
  assert.ok(floating.includes("${statusHtml(m)}\n      <span class=\"module-floating-grip\""), 'floating: under the content, the last thing in the window');
  assert.ok(docked.includes('${statusHtml(m)}\n      </div>`;'), 'docked: the last thing in the module\'s own column');
  for (const [name, code] of [['floating', floating], ['docked', docked]]) {
    assert.ok(/if \(reuse\.add\) \w+\.querySelector\('\[data-header-add\]'\)\.replaceWith\(reuse\.add\);/.test(code), `${name}: the "+" moved in`);
    assert.ok(/if \(reuse\.status\) \w+\.querySelector\('\[data-status\]'\)\.replaceWith\(reuse\.status\);/.test(code), `${name}: the status bar moved in`);
  }
  assert.ok(move.includes("add: mod.el.querySelector('[data-header-add]'),") && move.includes("status: mod.el.querySelector('[data-status]'),"), 'moveModule carries both');
  assert.ok(canvas.includes("add: mod.el.querySelector('[data-header-add]'),\n      status: mod.el.querySelector('[data-status]'),\n      onOpenRef"), 'the mount gets both');
});

test('popped out and on the module\'s own page: the "+" and the status bar (step 5)', () => {
  assert.match(moduleHtml, /<span class="titlebar-custom" id="module-titlebar-custom"><\/span>\s*\n\s*<span class="titlebar-add" id="module-titlebar-add" hidden><\/span>\s*\n\s*<button class="sdk-icon-btn btn-quiet btn-small" id="module-menu"/, 'popped out: icon, name, tools, "+", "...", close');
  assert.match(moduleHtml, /<div class="mod-status module-status" id="module-status" role="region" aria-label="Status" hidden><\/div>/, 'a labelled status region under the module');
  assert.match(moduleJs, /const add = popout \? \$\('module-titlebar-add'\) : pageAddSlot\(mod\);/, 'the titlebar popped out, the page bar on the own page');
  assert.match(moduleJs, /status\.setAttribute\('aria-label', `\$\{mod\.name\} status`\);/);
  assert.match(moduleJs, /nav\.register\(\{ id: 'page-bar-add', bar: 'secondary', zone: 'right',[^}]*fold: false, element: slot \}\);/, 'the page bar\'s "+" through the nav registry, never folded');
  assert.ok(/\n    add,\n    status,\n/.test(moduleJs), 'the mount gets both');
  const sys = read('public/sdk/system.css');
  assert.match(sys, /:is\(\.sdk-window-popout, body\.module-page\) \{ --safe-b: var\(--safe-bottom\); \}/, 'clear of the home indicator: the inset on a module\'s own page');
  assert.match(sys, /:is\(\.sdk-status-line, \.mod-status\) \{[^}]*height: calc\(var\(--status-bar-h\) \+ var\(--safe-b\)\);[^}]*padding: 0 var\(--space-3\) var\(--safe-b\);/, 'the status line grows by the inset');
  assert.match(css, /body\.module-popout \.module-titlebar \.sdk-icon-btn \{[^}]*width: 44px;/, '44 px on a phone, popped out');
  assert.match(css, /\.page-bar-add > \.sdk-icon-btn \{[^}]*width: 44px;/, '44 px on a phone, in the page bar');
});

test('no bundled module calls host.bar.set (every one draws the "+")', () => {
  const dir = path.join(ROOT, 'modules');
  const callers = [];
  for (const id of fs.readdirSync(dir).sort()) {
    const src = path.join(dir, id, 'src');
    if (!fs.existsSync(src)) continue;
    for (const file of fs.readdirSync(src).sort()) {
      if (!/\.(js|mjs|html)$/.test(file)) continue;
      const text = read(`modules/${id}/src/${file}`).replace(/\/\*[\s\S]*?\*\/|(^|[^:])\/\/.*$/gm, '$1');
      if (/\bbar\s*\.\s*set\s*\(|\bcall\(\s*['"]bar\.set['"]|\.on\(\s*['"]bar['"]/.test(text)) callers.push(`modules/${id}/src/${file}`);
    }
  }
  assert.deepEqual(callers, [], 'host.bar.set is for modules written for the old bar; a bundled module uses host.add.set');
  assert.match(sdk, /bar: \{\s*\n\s*set: \(items\) => call\('bar\.set', \{ items \}\),/, 'host.bar.set stays in the SDK');
});

test('the styles: --status-bar-h 24px in both sheets, one line, tokens only', () => {
  assert.match(css, /--status-bar-h: 24px;/);
  assert.match(sdkCss, /--status-bar-h: 24px;/);
  const sys = read('public/sdk/system.css');
  const block = sys.slice(sys.indexOf('/* modulechrome:start */'), sys.indexOf('/* modulechrome:end */'));
  assert.ok(block.length > 100, 'the Module window block is in system.css');
  assert.match(block, /:is\(\.sdk-status-line, \.mod-status\) \{[^}]*height: calc\(var\(--status-bar-h\) \+ var\(--safe-b\)\);[^}]*border-top: 1px solid var\(--edge-hairline\);[^}]*background: var\(--surface-panel\);[^}]*color: var\(--text-muted\);[^}]*font-size: var\(--text-12\);[^}]*white-space: nowrap;/, 'one line on the window\'s step, muted 12px words under a hairline');
  assert.match(block, /:is\(\.sdk-status-line, \.mod-status\)\[hidden\] \{ display: none; \}/);
  assert.match(block, /:is\(\.sdk-status-text, \.mod-status-text\) \{[^}]*text-overflow: ellipsis;/);
  assert.match(block, /:is\(\.sdk-status-line, \.mod-status\) \.sdk-status \{\s*--chip-h: var\(--mc-chip-h\);/, 'a status label in the line is 20px');
  assert.match(block, /--mc-chip-h: 20px;/);
  assert.match(css, /\.canvas\.narrow \.module-docked \.titlebar-add > \.sdk-icon-btn \{[^}]*width: 44px;/, '44 px on a phone');
  assert.ok(!/#[0-9a-f]{3,6}\b/i.test(block) && !/rgba?\(/.test(block), 'tokens only');
  for (const gone of ['.mod-status {', '.mod-status-item {', '.mod-header {', '.mod-toolbar {', '.module-floating-head {', '.tb-sep {']) assert.ok(!css.includes(`\n${gone}`), `style.css: ${gone} moved to the Module window block`);
});

test('the titlebar\'s height: 34px wider than a phone, 42px on one, no padding above or below, its buttons 30px (Thomas, 2026-10-13: "too much top and bottom padding")', () => {
  const css = read('public/style.css');
  assert.match(css, /--module-header-h: var\(--module-header-phone-h, 34px\);/, 'the one token: 34px wider than a phone');
  assert.match(css, /@media \(max-width: 640px\) \{\n\s*:root \{\n\s*--module-header-phone-h: 42px;/, 'a phone keeps its 42px touch height');
  assert.equal((css.match(/--module-header-phone-h:/g) || []).length, 1, 'set in one place');
  const sys = read('public/sdk/system.css');
  const block = sys.slice(sys.indexOf('/* modulechrome:start */'), sys.indexOf('/* modulechrome:end */'));
  const rule = (sel) => { const m = block.match(new RegExp(`(^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\{([^}]*)\\}`)); return m ? m[2] : null; };
  const head = rule(':is(.sdk-titlebar, .mod-header, .chat-head)');
  assert.ok(head, 'the title bar (.mod-header, and the chat\'s .chat-head with it) is in the Module window block');
  assert.match(head, /height: var\(--module-header-h\);/);
  assert.match(head, /padding: 0 var\(--space-1\) 0 var\(--space-3\);/, 'no padding above or below: the height is the token\'s alone');
  assert.match(read('public/space.html'), /<header class="chat-head">/, 'the chat\'s header is the title bar');
  // Nothing in a titlebar may be taller than the small buttons (the "...", the "+", Close): 2px above and below.
  assert.match(read('public/sdk/system.css'), /--btn-h-small: 30px;/);
  for (const m of (css + '\n' + block).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim();
    if (!/\.mod-header|\.module-floating-head|\.module-titlebar|\.chat-head/.test(sel) || /\.canvas\.narrow/.test(sel)) continue;
    for (const decl of m[2].split(';')) {
      const d = decl.match(/^\s*(min-height|padding(?:-top|-bottom)?|margin(?:-top|-bottom)?)\s*:\s*(.+)$/);
      if (!d) continue;
      if (d[1] === 'min-height') assert.fail(`${sel} sets a min-height (${d[2].trim()}): the titlebar is the token's height`);
      if (/^padding$|^margin$/.test(d[1])) {
        const v = d[2].trim().split(/\s+/);
        const [top, bottom] = [v[0], v[2] ?? v[0]];
        assert.ok(/^0(px)?$/.test(top) && /^0(px)?$/.test(bottom), `${sel} pads the titlebar above or below (${d[1]}: ${d[2].trim()})`);
      }
      else assert.ok(/^0(px)?$/.test(d[2].trim()), `${sel} sets ${d[1]}: ${d[2].trim()}`);
    }
  }
  // canvas.js reads the token (a floating window's height is its content's plus the titlebar's), never a fixed 42.
  const canvas = read('public/canvas.js');
  assert.ok(!/HEAD_H = 42/.test(canvas), 'no fixed titlebar height');
  assert.ok(canvas.includes("getPropertyValue('--module-header-h')"), 'the token, read where it is used');
});

// Issue #60: the drop lands on what is on top, not on the first module mounted.
test('the drop target is the topmost visible module at the point', () => {
  const box = (l, t, r, b) => ({ left: l, top: t, right: r, bottom: b });
  const polls = { id: 'polls', rect: box(0, 0, 400, 300), z: 1, order: 0, visible: true };
  const calendar = { id: 'calendar', rect: box(100, 50, 500, 350), z: 2, order: 1, visible: true };
  assert.equal(R.topmostAt([polls, calendar], 200, 100).id, 'calendar', 'both under the point: the higher one, whatever the mount order');
  assert.equal(R.topmostAt([calendar, polls], 200, 100).id, 'calendar', 'the order of the list does not matter');
  assert.equal(R.topmostAt([polls, calendar], 50, 20).id, 'polls', 'the point only inside the lower one');
  assert.equal(R.topmostAt([polls], 200, 100).id, 'polls', 'one module under the pointer is unchanged');
  assert.equal(R.topmostAt([polls, { ...calendar, visible: false }], 200, 100).id, 'polls', 'a hidden one never wins');
  assert.equal(R.topmostAt([polls, { ...calendar, rect: box(100, 50, 500, 350) }], 450, 340).id, 'calendar');
  assert.equal(R.topmostAt([polls, calendar], 900, 900), null, 'nothing there');
  assert.equal(R.topmostAt([{ ...polls, z: 3 }, { ...calendar, z: 3, order: 5 }], 200, 100).id, 'calendar', 'a tie goes to the later one');
  const cover = { id: null, blocks: true, rect: box(100, 50, 500, 90), z: 9, visible: true };
  assert.equal(R.topmostAt([polls, cover], 200, 60).id, null, 'a window titlebar on top covers the module under it');
  const host = read('public/module-host.js');
  assert.ok(/function ptrTarget[\s\S]*?elementsFromPoint[\s\S]*?topmostAt\(/.test(host), 'ptrTarget reads the page\'s stacking');
});

// Issue #155: a toolbar drawn again keeps the keyboard on the same control.
test('a toolbar redraw puts focus back on the same control', () => {
  const makeRow = () => {
    const doc = { activeElement: null };
    const row = { ownerDocument: doc, kids: [], contains(el) { return this.kids.includes(el); }, querySelectorAll() { return this.kids; } };
    const add = (key) => { const el = { dataset: { tbKey: key }, disabled: false, focus() { doc.activeElement = el; } }; row.kids.push(el); return el; };
    return { row, doc, add };
  };
  const { row, doc, add } = makeRow();
  const open = add(R.toolbarKey('tab', 'status', 'open'));
  add(R.toolbarKey('tab', 'status', 'closed'));
  open.focus();
  const key = R.focusedToolbarKey(row);
  assert.equal(key, 'tab:status:open');
  row.kids = []; // the row is cleared and drawn again: new elements
  const again = add(R.toolbarKey('tab', 'status', 'open'));
  add(R.toolbarKey('tab', 'status', 'closed'));
  doc.activeElement = null;
  assert.ok(R.restoreToolbarFocus(row, key));
  assert.equal(doc.activeElement, again, 'the same choice has the focus');
  doc.activeElement = { dataset: {} };
  assert.equal(R.focusedToolbarKey(row), null, 'focus outside the row is left alone');
  assert.equal(R.restoreToolbarFocus(row, null), false);
  const host = read('public/module-host.js');
  const set = host.slice(host.indexOf("async 'toolbar.set'"), host.indexOf('// The module\'s tools in the nav bars'));
  assert.ok(set.indexOf('focusedToolbarKey(toolbar)') > -1 && set.indexOf('focusedToolbarKey(toolbar)') < set.indexOf("toolbar.textContent = ''"), 'focus is read before the row is cleared');
  assert.ok(set.indexOf('restoreToolbarFocus(toolbar, focusKey)') > set.indexOf("toolbar.hidden = clean.length"), 'and put back after it is drawn');
  assert.ok(/b\.setAttribute\('aria-pressed', String\(opt\.id === item\.value\)\)/.test(set), 'a switch choice says whether it is pressed');
  assert.ok(/tbKey = toolbarKey\('tab'/.test(set) && /tbKey = toolbarKey\('btn'/.test(set) && /tbKey = toolbarKey\('range'/.test(set), 'every control carries its key');
});

test('the "+": one entry for one add (Thomas, 2026-10-14: the Map\'s "+" offered "Add a place" twice)', () => {
  // The same add sent twice by one module (a redraw that did not replace the list) is one entry.
  const twice = R.cleanAddEntries([{ id: 'place', label: 'Add a place', icon: 'location-dot' }, { id: 'place2', label: 'Add a place', icon: 'location-dot' }]);
  assert.equal(twice.length, 1, 'the same label and icon twice is one');
  assert.equal(R.cleanAddEntries([{ id: 'a', label: 'Add a place', icon: 'location-dot' }, { id: 'b', label: 'Add a place', icon: 'plane' }]).length, 2, 'the same words with another icon are two adds');
  const cats = R.cleanAddEntries([{ label: 'A', items: [{ id: 'x', label: 'Same' }, { id: 'y', label: 'Other' }] }, { label: 'B', items: [{ id: 'z', label: 'Same' }, { id: 'w', label: 'Else' }] }]);
  assert.equal(cats.reduce((n, e) => n + e.items.length, 0), 4, 'a name in two categories is two adds');
  // Two parts of one page (a composite's Map and its Places panel) offering the same add: the later one leaves it out.
  const parts = R.dropRepeatedAdds([
    [{ id: 'place', label: 'Add a place', icon: 'location-dot' }],
    [{ id: 'place', label: 'Add a place', icon: 'location-dot' }, { id: 'other', label: 'Add a note' }],
  ]);
  assert.deepEqual(parts, [[{ id: 'place', label: 'Add a place', icon: 'location-dot' }], [{ id: 'other', label: 'Add a note' }]], 'the first part keeps it');
  assert.deepEqual(R.dropRepeatedAdds([[], null]), [[], []]);
  // destination.js builds the composite's "+" through it, and the bundled Map and Places both still offer "Add a place".
  assert.match(read('public/destination.js'), /dropRepeatedAdds\(parts\.map\(\(p\) => p\.adds\)\)/, 'the composite\'s "+" drops an add two parts both offer');
  const label = (f) => (read(f).match(/ADD_PLACE = (?:\{[^}]*label: |)'([^']+)'/) || [])[1];
  assert.equal(label('modules/maps/src/maps.js'), label('modules/places/src/places.js'), 'Map and Places word the add alike, which is how the two are seen as one');
});

test('a composite\'s editor window: the Workspace lifts the frame, as it does a sandboxed module\'s', () => {
  const canvas = read('public/canvas.js');
  const dest = read('public/destination.js');
  const host = read('public/module-host.js');
  assert.match(host, /export function createFrameLift\(/, 'one lift for both kinds of frame');
  assert.match(host, /\.\.\.\(liftUp \? \{ lift:/, 'a part in a composite\'s page gives its SDK the lift');
  assert.match(canvas, /createFrameLift\(frame, \{/, 'the composite\'s frame is lifted by the canvas');
  assert.match(canvas, /app:compositelift/, 'the canvas answers the page\'s lift');
  assert.match(dest, /liftUp: liftComposite/, 'the destination page asks for it when it is in a composite\'s frame');
  assert.match(dest, /app:compositeevent/, 'the Workspace\'s Close reaches the part as editordismiss');
});

if (failures.length) {
  console.error(`check-module-chrome: ${failures.length} failed`);
  for (const f of failures) console.error(`  - ${f}`);
  process.exit(1);
}
console.log(`check-module-chrome: OK (${passed} checks)`);
