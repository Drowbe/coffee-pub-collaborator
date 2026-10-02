#!/usr/bin/env node
/*
 * check-nav.mjs -- the nav-bar registry's rules, run without a browser.
 *
 * public/nav-bar.js is what both nav bars draw from (documentation/plans/plan-nav.md, "Modules register into the
 * bars"). Its ordering (groups by groupOrder, tools by order, the bands), its visibility rule and the cleaning of a
 * module's registration are pure, so this runs them in node and fails when any of them drifts.
 *
 *   node tools/check-nav.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// The page's file is plain ES module syntax under a .js name; node wants .mjs to load it without a warning, so it is
// imported from a temporary copy (the same way check-syntax.mjs parses the pages).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-check-'));
const copy = path.join(tmp, 'nav-bar.mjs');
fs.copyFileSync(path.join(ROOT, 'public/nav-bar.js'), copy);
const { arrange, isVisible, cleanModuleTools, bandOf, BANDS, DEFAULT_ORDER, phoneZones, isShown, foldSteps, foldCount, middleCentred, middleWidth } = await import(pathToFileURL(copy).href);
// Who is here (the space bar's middle zone) gives way before the bar folds; its fitting and its reading of the call are pure.
const peopleCopy = path.join(tmp, 'space-people.mjs');
fs.copyFileSync(path.join(ROOT, 'public/space-people.js'), peopleCopy);
const { facesThatFit, peopleIn, hereWords, MAX_FACES } = await import(pathToFileURL(peopleCopy).href);
// The primary nav's pure parts (plan-primary-nav.md, step 2): the profile menu by role, the switcher, the bell, the breadcrumb.
const primaryCopy = path.join(tmp, 'primary-nav.mjs');
fs.copyFileSync(path.join(ROOT, 'public/primary-nav.js'), primaryCopy);
const { SLOTS, profileEntries, seesUpdates, hostConsoleUrl, switcherEntries, switchPick, bellState, crumbSegments, anchorSegments } = await import(pathToFileURL(primaryCopy).href);
fs.rmSync(tmp, { recursive: true, force: true });

let n = 0;
const test = (name, fn) => {
  try {
    fn();
    n += 1;
  } catch (err) {
    console.error(`check-nav: ${name}\n  ${err.message}`);
    process.exit(1);
  }
};
const ids = (groups) => groups.map((g) => g.map((t) => t.id));

test('the bands: 1-10 core, 11-50 secondary, 51-100 utility, 101-998 a module, 999 last', () => {
  assert.equal(bandOf(1), 'core');
  assert.equal(bandOf(10), 'core');
  assert.equal(bandOf(11), 'secondary');
  assert.equal(bandOf(50), 'secondary');
  assert.equal(bandOf(51), 'utility');
  assert.equal(bandOf(100), 'utility');
  assert.equal(bandOf(101), 'module');
  assert.equal(bandOf(998), 'module');
  assert.equal(bandOf(999), 'last');
  assert.equal(bandOf(0), null);
  assert.equal(bandOf(1000), null);
  assert.equal(bandOf(DEFAULT_ORDER), 'module', 'a tool that names no order lands in the module band');
});

test('tools sort by order inside a group, ties by registration', () => {
  const groups = arrange([
    { id: 'c', order: 3, seq: 1 },
    { id: 'a', order: 1, seq: 2 },
    { id: 'b2', order: 2, seq: 4 },
    { id: 'b1', order: 2, seq: 3 },
  ]);
  assert.deepEqual(ids(groups), [['a', 'b1', 'b2', 'c']]);
});

test('groups sort by groupOrder; a group that names none takes its first tool\'s order', () => {
  const groups = arrange([
    { id: 'leave', group: 'leave', groupOrder: 999, order: 999, seq: 1 },
    { id: 'mod-x', group: 'mod:own', order: 500, seq: 2 }, // no groupOrder: 500
    { id: 'snap', group: 'space', groupOrder: 1, order: 2, seq: 3 },
    { id: 'dock', group: 'space', order: 1, seq: 4 }, // shares the group's groupOrder
  ]);
  assert.deepEqual(ids(groups), [['dock', 'snap'], ['mod-x'], ['leave']]);
});

test('the smallest groupOrder any tool of a group names wins for the group', () => {
  const groups = arrange([
    { id: 'p', group: 'g1', groupOrder: 40, order: 1, seq: 1 },
    { id: 'q', group: 'g1', groupOrder: 5, order: 2, seq: 2 },
    { id: 'r', group: 'g2', groupOrder: 20, order: 1, seq: 3 },
  ]);
  assert.deepEqual(ids(groups), [['p', 'q'], ['r']]);
});

test('the system stays ahead of a module without coordinating numbers', () => {
  const system = [
    { id: 'dock-all', group: 'space', groupOrder: 1, order: 1, seq: 1 },
    { id: 'fullscreen-toggle', group: 'space', order: 11, seq: 2 },
    { id: 'leave-space', group: 'leave', groupOrder: 999, order: 999, seq: 3 },
  ];
  const mod = cleanModuleTools('calendar', [
    { id: 'today', icon: 'calendar-day', label: 'Today', order: 1 }, // asks for 1, gets the band's floor
    { id: 'add', icon: 'plus', label: 'Add', order: 5000, groupOrder: 1 },
  ]);
  const groups = arrange([...system, ...mod.map((t, i) => ({ ...t, seq: 10 + i }))]);
  assert.deepEqual(ids(groups), [['dock-all', 'fullscreen-toggle'], ['calendar:today', 'calendar:add'], ['leave-space']]);
  assert.equal(mod[0].order, BANDS.module[0]);
  assert.equal(mod[1].order, BANDS.module[1]);
  assert.equal(mod[1].groupOrder, BANDS.module[0]);
});

test('visible: left out means shown; a boolean; a function; a throwing function counts as shown', () => {
  assert.equal(isVisible({}), true);
  assert.equal(isVisible({ visible: false }), false);
  assert.equal(isVisible({ visible: true }), true);
  assert.equal(isVisible({ visible: () => 0 }), false);
  assert.equal(isVisible({ visible: () => 'yes' }), true);
  assert.equal(isVisible({ visible: () => { throw new Error('bug'); } }), true);
});

test('hidden tools keep their place in the order, so showing one again moves nothing', () => {
  const groups = arrange([
    { id: 'a', order: 1, seq: 1 },
    { id: 'b', order: 2, visible: false, seq: 2 },
    { id: 'c', order: 3, seq: 3 },
  ]);
  assert.deepEqual(ids(groups), [['a', 'b', 'c']]);
});

test('a module\'s tools are namespaced: ids and groups carry the module id, and the module band clamps orders', () => {
  const [t] = cleanModuleTools('todo', [{ id: 'mine', icon: 'list-check', label: 'My tasks', group: 'views', title: 'Only my tasks' }]);
  assert.equal(t.id, 'todo:mine');
  assert.equal(t.own, 'mine');
  assert.equal(t.group, 'todo:views');
  assert.equal(t.bar, 'secondary');
  assert.equal(t.zone, 'right');
  assert.equal(t.order, DEFAULT_ORDER);
  assert.equal(t.groupOrder, DEFAULT_ORDER);
  assert.equal(t.visible, true);
  assert.equal(t.title, 'Only my tasks');
  const [u] = cleanModuleTools('todo', [{ id: 'all', icon: 'list', label: 'All', zone: 'middle', order: 200, groupOrder: 150, toggleable: true, active: true, badge: 3, visible: false }]);
  assert.equal(u.zone, 'middle');
  assert.equal(u.order, 200);
  assert.equal(u.groupOrder, 150);
  assert.equal(u.toggleable, true);
  assert.equal(u.active, true);
  assert.equal(u.badge, 3);
  assert.equal(u.visible, false);
  assert.equal(u.group, 'todo:own');
});

test('a module cannot name another module\'s or the system\'s ids', () => {
  assert.throws(() => cleanModuleTools('todo', [{ id: 'calendar:today', icon: 'x', label: 'x' }]), /letters, digits and hyphens/);
  const [t] = cleanModuleTools('todo', [{ id: 'leave-space', icon: 'x', label: 'x' }]);
  assert.equal(t.id, 'todo:leave-space', 'the system\'s leave-space is untouched: the module\'s tool is its own');
});

test('a registration needs an id, an icon and a label, once each', () => {
  assert.throws(() => cleanModuleTools('m', [{ icon: 'x', label: 'x' }]), /needs an id/);
  assert.throws(() => cleanModuleTools('m', [{ id: 'a', label: 'x' }]), /needs an icon/);
  assert.throws(() => cleanModuleTools('m', [{ id: 'a', icon: 'x' }]), /needs a label/);
  assert.throws(() => cleanModuleTools('m', [{ id: 'a', icon: 'x', label: 'x' }, { id: 'a', icon: 'y', label: 'y' }]), /twice/);
  assert.throws(() => cleanModuleTools('m', 'nope'), /list/);
  assert.throws(() => cleanModuleTools('m', Array.from({ length: 13 }, (_, i) => ({ id: `t${i}`, icon: 'x', label: 'x' }))), /at most 12/);
});

test('href: a path on this server or an https address, nothing else', () => {
  assert.equal(cleanModuleTools('m', [{ id: 'a', icon: 'x', label: 'x', href: '/modules/m' }])[0].href, '/modules/m');
  assert.equal(cleanModuleTools('m', [{ id: 'a', icon: 'x', label: 'x', href: 'https://example.org/' }])[0].href, 'https://example.org/');
  assert.throws(() => cleanModuleTools('m', [{ id: 'a', icon: 'x', label: 'x', href: 'javascript:alert(1)' }]), /href/);
  assert.throws(() => cleanModuleTools('m', [{ id: 'a', icon: 'x', label: 'x', href: '//evil.example/' }]), /href/);
  assert.throws(() => cleanModuleTools('m', [{ id: 'a', icon: 'x', label: 'x', href: 'http://example.org/' }]), /href/);
});

test('a module never places a tool in the top bar: bar: \'primary\' and system: true are ignored, not refused, and the tool lands in the space bar', () => {
  const tool = { id: 'a', icon: 'x', label: 'x', bar: 'primary', system: true };
  const [t] = cleanModuleTools('m', [tool]);
  assert.equal(t.bar, 'secondary', 'placed in the space bar like any other tool');
  assert.equal(t.zone, 'right');
  assert.ok(!('system' in t), 'system is not carried');
  const [u] = cleanModuleTools('m', [{ ...tool, zone: 'middle' }], { allowPrimary: true });
  assert.equal(u.bar, 'secondary', 'even with the old option passed, nothing reaches the top bar');
  assert.equal(u.zone, 'middle');
  const navSrc = fs.readFileSync(path.join(ROOT, 'public/nav-bar.js'), 'utf8');
  const hostSrc = fs.readFileSync(path.join(ROOT, 'public/module-host.js'), 'utf8');
  assert.ok(!/allowPrimary/.test(navSrc + hostSrc), 'allowPrimary is gone from nav-bar.js and module-host.js');
  assert.ok(!/contextInfo\.module\.nav/.test(hostSrc), 'module-host.js no longer reads the manifest\'s surfaces.page.nav');
});

test('on a phone the primary bar folds: the left stays, the bell stays (phone: \'bar\'), and everything else goes into the menu, your picture too', () => {
  const t = (id, zone, extra = {}) => ({ id, bar: 'primary', zone, ...extra });
  const byZone = {
    left: [t('modules-nav', 'left', { order: 1 }), t('topbar-crumb', 'left', { order: 3 })],
    middle: [t('mid', 'middle', { order: 1 })],
    right: [t('menu-home', 'right', { order: 2 }), t('notifications-bell', 'right', { order: 90, phone: 'bar' }), t('whoami-link', 'right', { group: 'you', order: 999 }), t('account-profile', 'right', { group: 'you', order: 999 })],
  };
  const z = phoneZones(byZone);
  assert.deepEqual(z.left.map((run) => run.map((x) => x.id)), [['modules-nav', 'topbar-crumb']], 'the left zone stays (Modules and Spaces hide themselves there)');
  assert.deepEqual(z.middle.map((run) => run.map((x) => x.id)), [['notifications-bell']], 'only the bell stays in the bar, in the middle zone');
  assert.deepEqual(z.right.map((run) => run.map((x) => x.id)), [['mid'], ['menu-home', 'whoami-link', 'account-profile']], 'the middle run first, then the right, without the bell');
  const brand = fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
  assert.match(brand, /id: 'notifications-bell'[^\n]*phone: 'bar'/, 'the bell says phone: \'bar\'');
  for (const id of ['modules-nav', 'spaces-slot']) assert.match(brand, new RegExp(`id: '${id}'[^\\n]*visible: \\(\\) => wide\\(\\) && signedIn\\(\\)`), `${id} leaves the bar on a phone`);
  const src = fs.readFileSync(path.join(ROOT, 'public/nav-bar.js'), 'utf8') + fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
  assert.ok(!/keepOnPhone/.test(src), 'keepOnPhone is gone: nothing stays in the bar on a phone');
});

test('a divider only separates groups that show something: a tool hidden by its owner (your picture, for a guest) counts as not shown', () => {
  const hidden = new Set(['whoami-link']);
  const hiddenOf = (t) => hidden.has(t.id);
  const you = [{ id: 'whoami-link' }, { id: 'account-profile', visible: () => false }, { id: 'account-sign-out', visible: false }];
  assert.equal(you.some((t) => isShown(t, hiddenOf)), false, 'a guest\'s "you" group shows nothing, so no divider goes before it');
  hidden.clear();
  assert.equal(isShown(you[0], hiddenOf), true, 'shown again once its owner shows it');
  assert.equal(isShown({ id: 'x', visible: true }, () => true), true, 'a tool with `visible` follows it, not the element');
  const src = fs.readFileSync(path.join(ROOT, 'public/nav-bar.js'), 'utf8');
  assert.match(src, /shown = group\.filter\(\(t\) => isShown\(/, 'flatten() decides dividers with isShown');
  assert.match(src, /watchHidden\(t\.id, el\)/, 'the bar is drawn again when a page toggles a tool\'s hidden');
});

test('the phone menu: opening it focuses its first entry, Escape from inside returns to the button; the picture is a label there and a width change closes the account menu', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
  const wire = src.slice(src.indexOf('function wireNavMenu('), src.indexOf('function firstEntry('));
  assert.match(wire, /if \(on && !wasOpen\) firstEntry\(menu\)\?\.focus\(\)/);
  assert.match(wire, /if \(!on && wasOpen && focus\) toggle\.focus\(\)/);
  assert.match(wire, /Escape/);
  const paint = src.slice(src.indexOf('function paintWhoami('), src.indexOf('function viewProfile('));
  assert.ok(paint.indexOf('closeHostMenu()') > -1 && paint.indexOf('closeHostMenu()') < paint.indexOf('if (onPhone())'), 'paintWhoami closes the account menu before repainting');
  assert.match(paint, /aria-disabled', 'true'/);
  assert.match(paint, /removeAttribute\('aria-disabled'\)/);
});

test('the phone menu closes when focus leaves it and its button, from either (Tab on from the button into the page too)', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
  const wire = src.slice(src.indexOf('function wireNavMenu('), src.indexOf('function firstEntry('));
  assert.match(wire, /menu\.addEventListener\('focusout', leaving\)/);
  assert.match(wire, /toggle\.addEventListener\('focusout', leaving\)/);
  assert.match(wire, /!menu\.contains\(to\) && to !== toggle\) setOpen\(false\)/);
});

test('the phone menu closes when the width crosses the phone line, and focus it held goes to something shown', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
  const wire = src.slice(src.indexOf('function wireNavMenu('), src.indexOf('function firstEntry('));
  const change = wire.slice(wire.indexOf("phoneQuery.addEventListener('change'"));
  assert.ok(change.length > 0, 'wireNavMenu watches the phone width');
  assert.match(change, /setOpen\(false\)/);
  assert.match(change, /\(shown\(was\) \? was : onPhone\(\) \? toggle : firstEntry\(menu\)\)\?\.focus\(\)/, 'back to what had focus if still shown, else the menu button on a phone or the bar\'s first entry');
  assert.match(wire, /header\.addEventListener\('focusin'/, 'the header remembers what last had focus, since a redraw can drop it');
  assert.match(src, /matchMedia\('\(max-width: 640px\)'\)/, 'the same width as nav-bar.js folds at');
  assert.match(fs.readFileSync(path.join(ROOT, 'public/nav-bar.js'), 'utf8'), /matchMedia\('\(max-width: 640px\)'\)/);
});

test('the space bar folds by band, each from its end: secondary, a module\'s, core (the slider with its switch), utility; never Leave or the "..."', () => {
  const click = () => {};
  const right = [
    { id: 'dock-all', order: 1, onClick: click },
    { id: 'snap-all', order: 2, onClick: click },
    { id: 'snap-size', order: 3, element: {} },
    { id: 'fullscreen-toggle', order: 11, onClick: click },
    { id: 'popout', order: 12, onClick: click },
    { id: 'recall-button', order: 51, onClick: click },
    { id: 'rejoin-call', order: 52, onClick: click },
    { id: 'm:a', order: 101 },
    { id: 'm:b', order: 102 },
    { id: 'subnav-more', order: 998, element: {}, fold: false },
    { id: 'leave-space', order: 999, onClick: click },
  ];
  assert.deepEqual(foldSteps(right), [['popout'], ['fullscreen-toggle'], ['m:b'], ['m:a'], ['snap-all', 'snap-size'], ['dock-all'], ['rejoin-call'], ['recall-button']]);
  assert.deepEqual(foldSteps([{ id: 'x', order: 20, fold: false }, { id: 'y', order: 21, onClick: click }]), [['y']], 'fold: false keeps a tool in the bar');
  assert.deepEqual(foldSteps([{ id: 'e', order: 5, element: {} }]), [['e']], 'an element with nothing before it folds on its own');
});

test('the space bar folds only as much as it must, with and without something in the middle', () => {
  const steps = [40, 40, 120];
  // Nothing in the middle: the zones share the row (two grid gaps of 12).
  assert.equal(foldCount({ width: 1000, gap: 12, left: 300, right: 300, more: 30, steps }), 0);
  assert.equal(foldCount({ width: 600, gap: 12, left: 300, right: 300, more: 30, steps: [20, 20, 120] }), 3, 'the "..." takes width too: 300+30-20-20 is still too wide');
  assert.equal(foldCount({ width: 600, gap: 12, left: 300, right: 300, more: 30, steps }), 2);
  assert.equal(foldCount({ width: 700, gap: 12, left: 300, right: 420, more: 30, steps: [100, 40] }), 1);
  // Something in the middle: it stays centred, so the right zone has half of what it leaves.
  assert.equal(foldCount({ width: 1000, gap: 12, middle: 200, left: 100, right: 388, more: 30, steps }), 0);
  assert.equal(foldCount({ width: 1000, gap: 12, middle: 200, left: 100, right: 389, more: 30, steps }), 1);
  // A name too long for its half: the middle gives up the centre and the right zone folds before the name is cut.
  assert.equal(middleCentred({ width: 1000, gap: 12, middle: 200, left: 388 }), true);
  assert.equal(middleCentred({ width: 1000, gap: 12, middle: 200, left: 389 }), false);
  assert.equal(foldCount({ width: 1000, gap: 12, middle: 200, left: 500, right: 250, more: 30, steps }), 0, 'all three fit side by side: nothing folds');
  assert.equal(foldCount({ width: 1000, gap: 12, middle: 200, left: 500, right: 300, more: 30, steps }), 2, 'the right zone folds for the name');
  assert.equal(foldCount({ width: 1000, gap: 12, middle: 200, left: 900, right: 100, more: 30, steps }), 3, 'everything folds before the name is cut');
  // Nothing fits: everything that can fold does, and no more.
  assert.equal(foldCount({ width: 100, gap: 12, left: 300, right: 300, more: 30, steps }), 3);
  assert.equal(foldCount({ width: 100, gap: 12, left: 300, right: 300, more: 30, steps: [] }), 0);
});

test('the space bar\'s "..." uses the shared menu, shows a toggle\'s state and clicks the tool itself', () => {
  const src = fs.readFileSync(path.join(ROOT, 'public/nav-bar.js'), 'utf8');
  const menu = src.slice(src.indexOf('async function openFoldMenu('));
  assert.match(menu, /openHostMenu\(fold\.more, items\)/);
  assert.match(menu, /checked: t\.toggleable \? on : undefined/);
  assert.match(menu, /onPick: \(\) => \{\s*fold\.picked = c;\s*c\.click\(\);/);
  // After a pick the keyboard goes to the tool, else the "..." while it shows, else the left zone (the module chooser).
  const fit = src.slice(src.indexOf('function fitSecondary('), src.indexOf('function paintMoreBadge('));
  assert.match(fit, /\[focusable\(picked\), fold\.more\.hidden \? null : fold\.more, inLeft\(\)\]/);
  // The "..." had the keyboard and hides (the bar grew): to a tool it held, else the left zone; never <body>.
  assert.match(fit, /wasFocused === fold\.more && fold\.more\.hidden/);
  assert.match(fit, /heldBefore\.has\(c\.dataset\.navTool\)/);
  assert.match(src, /more\.className = 'sdk-more nav-more'/);
  const hm = fs.readFileSync(path.join(ROOT, 'public/host-menu.js'), 'utf8');
  assert.match(hm, /'menuitemcheckbox'/);
  assert.match(hm, /aria-checked/);
});

test('who is here drops portraits, then shows only its count, before the bar folds anything', () => {
  const sizes = { base: 60, first: 26, step: 17, plus: 24 };
  assert.equal(MAX_FACES, 4);
  assert.equal(facesThatFit({ avail: Infinity, count: 9, ...sizes }), 4, 'at most four, the rest a "+N"');
  assert.equal(facesThatFit({ avail: Infinity, count: 3, ...sizes }), 3, 'everyone when they fit, no "+N"');
  assert.equal(facesThatFit({ avail: 60 + 26 + 17 * 2, count: 3, ...sizes }), 3);
  assert.equal(facesThatFit({ avail: 60 + 26 + 17 * 2 - 1, count: 3, ...sizes }), 1, 'one fewer needs a "+1" too, which does not fit either');
  assert.equal(facesThatFit({ avail: 60 + 26 + 17 + 24, count: 9, ...sizes }), 2);
  assert.equal(facesThatFit({ avail: 60 + 26 + 24, count: 9, ...sizes }), 1);
  assert.equal(facesThatFit({ avail: 60 + 26 + 23, count: 9, ...sizes }), 0, 'the count alone');
  assert.equal(facesThatFit({ avail: 10, count: 9, ...sizes }), 0, 'the count alone is the smallest; the bar folds after that');
  assert.equal(facesThatFit({ avail: 500, count: 0, ...sizes }), 0);
});

test('who is here gets the width the left and right zones leave, so it shrinks before a tool folds or the name is cut', () => {
  const steps = [40, 40, 120];
  // Centred: each side as wide as the wider zone.
  assert.equal(middleWidth({ width: 1000, gap: 12, left: 100, right: 300 }), 1000 - 2 * (300 + 12));
  // A long name (the left zone wider than the right): the middle sits beside it, and has what the two leave, not what
  // the right zone alone would leave centred (1000 - 2 * (250 + 12) = 476, far more than the row holds).
  assert.equal(middleWidth({ width: 1000, gap: 12, left: 500, right: 250 }), 1000 - 500 - 250 - 2 * 12, 'two grid gaps, whatever the middle holds');
  assert.ok(middleWidth({ width: 1000, gap: 12, left: 500, right: 250 }) < 1000 - 2 * (250 + 12));
  // A middle that takes exactly that width folds nothing, centred or beside; a little more folds the right zone.
  for (const [left, right] of [[100, 300], [300, 100], [500, 250], [700, 120], [306, 300]]) {
    const middle = middleWidth({ width: 1000, gap: 12, left, right });
    assert.equal(foldCount({ width: 1000, gap: 12, middle, left, right, more: 30, steps }), 0, `left ${left}, right ${right}: nothing folds`);
    assert.ok(foldCount({ width: 1000, gap: 12, middle: middle + 2, left, right, more: 30, steps }) > 0, `left ${left}, right ${right}: a little more folds`);
  }
  // The long name at 800 wide: with this width four portraits no longer fit, the count alone does, and nothing folds.
  const sizes = { base: 60, first: 26, step: 17, plus: 24 };
  const avail = middleWidth({ width: 800, gap: 12, left: 440, right: 230 });
  assert.equal(avail, 800 - 440 - 230 - 24);
  // Exact, so the name is never cut while portraits show: beside a long name, the middle, the left and right zones and
  // the two gaps fill the row to the pixel and nothing folds; a pixel more on the left and the right zone folds.
  for (const [width, left, right] of [[844, 453, 215], [842, 453, 215], [700, 420, 200], [1000, 600, 120]]) {
    const m = middleWidth({ width, gap: 12, left, right });
    assert.equal(left + m + right + 2 * 12, width, `${width}: the three and two gaps fill the row`);
    assert.equal(foldCount({ width, gap: 12, middle: m, left, right, more: 30, steps }), 0, `${width}: nothing folds at that width`);
    assert.ok(foldCount({ width, gap: 12, middle: m, left: left + 2, right, more: 30, steps }) > 0, `${width}: a wider name folds the right zone`);
  }
  assert.equal(facesThatFit({ avail, count: 9, ...sizes }), 0);
  assert.equal(foldCount({ width: 800, gap: 12, middle: 60, left: 440, right: 230, more: 30, steps }), 0);
});

test('who is here reads the call: you first, then by name, never a hidden participant, "on the call" unless off', () => {
  const remote = new Map([
    ['z', { identity: 'z', name: 'Zoe', attributes: { call: 'on' } }],
    ['a', { identity: 'a', name: 'Al', attributes: { call: 'off' } }],
    ['obs', { identity: 'obs', name: 'OBS', attributes: {}, permissions: { hidden: true } }],
    ['n', { identity: 'n', attributes: {} }],
  ]);
  const call = { localParticipant: { identity: 'me', name: 'Me', attributes: { call: 'off' } }, remoteParticipants: remote };
  const people = peopleIn(call, { meOnCall: true });
  assert.deepEqual(people.map((p) => [p.name, p.you, p.onCall]), [['Me', true, true], ['Al', false, false], ['n', false, true], ['Zoe', false, true]]);
  assert.deepEqual(peopleIn(null), []);
  assert.deepEqual(hereWords(people, 'space'), { shown: '4 here', said: '4 people in this space, 3 on the call' });
  assert.deepEqual(hereWords(people.slice(0, 1).map((p) => ({ ...p, onCall: false })), 'aside'), { shown: 'Just you', said: 'Just you in this aside' });
});

test('the space bar\'s lists draw above the modules and under a page opened over the call', () => {
  // The header (.topbar) is its own stacking layer, under the floating modules' layer, so a list inside it can't rise
  // above a module by its own z-index: the header rises to the menus' level while one is open, and the lists and the
  // page's shared menu sit at that level (above .module-layer, under .page-overlay).
  const css = fs.readFileSync(path.join(ROOT, 'public/style.css'), 'utf8');
  const block = (sel) => {
    const at = css.search(new RegExp(`(^|\\n)${sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*\\{`));
    assert.ok(at > -1, `style.css has ${sel}`);
    return css.slice(at, css.indexOf('}', at));
  };
  const z = (sel) => (block(sel).match(/z-index:\s*([^;]+);/) || [])[1]?.trim();
  const menu = Number((css.match(/--z-menu:\s*(\d+);/) || [])[1]);
  assert.ok(menu > Number(z('.module-layer')), '--z-menu is above the floating modules\' layer');
  assert.ok(menu < Number(z('.page-overlay')), '--z-menu is under a page opened over the call');
  assert.ok(Number(z('.topbar')) < Number(z('.module-layer')), 'the header stays under a module dragged over it when nothing is open');
  for (const sel of ['.host-menu', '.module-chooser-list', '.who-here-list']) assert.equal(z(sel), 'var(--z-menu)', `${sel} is at the menus' level`);
  const lift = css.match(/\n\.topbar:has\(([^)]*\)[^{]*)\)\s*\{([^}]*)\}/);
  assert.ok(lift, 'the header rises while one of its lists is open (.topbar:has(...))');
  for (const list of ['.module-chooser-list:not([hidden])', '.who-here-list:not([hidden])']) assert.ok(lift[1].includes(list), `the header rises while ${list} is open`);
  assert.match(lift[2], /z-index:\s*var\(--z-menu\)/);
});

test('the top bar\'s slots, left to right: logo, environment, Modules, Spaces, the anchor, then online people, the bell and the profile', () => {
  assert.deepEqual(SLOTS, ['logo', 'environment', 'modules', 'home', 'anchor', 'people', 'notifications', 'profile']);
  const brand = fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
  const reg = (id) => {
    const m = brand.match(new RegExp(`nav\\.register\\(\\{ id: '${id}', bar: 'primary', zone: '(\\w+)'[^\\n]*?order: (\\d+)`));
    assert.ok(m, `brand.js registers ${id}`);
    return { zone: m[1], order: Number(m[2]) };
  };
  const left = ['modules-nav', 'spaces-slot', 'topbar-crumb', 'topbar-status'].map(reg);
  assert.ok(left.every((t) => t.zone === 'left'), 'Modules, Spaces and the anchor are the left zone');
  assert.deepEqual(left.map((t) => t.order), [1, 2, 3, 4], 'Modules before Spaces (decision 26), then the anchor');
  const html = brand.slice(brand.indexOf('header.innerHTML = `'), brand.indexOf('nav.attach(\'primary\', header)'));
  assert.ok(html.indexOf('brand-logo') > -1 && html.indexOf('brand-logo') < html.indexOf('data-brand="environmentName"'), 'the logo box, then the environment\'s name, in the left zone\'s markup ahead of the tools');
  assert.ok(reg('notifications-bell').zone === 'right' && reg('whoami-link').zone === 'right', 'the bell and the profile are the right zone');
  assert.match(brand, /id: 'notifications-bell'[^\n]*groupOrder: 90/);
  assert.match(brand, /id: 'whoami-link'[^\n]*groupOrder: 999/, 'the profile last');
});

test('gone from the top bar: the clock, the lock or luggage icon beside the logo, the theme switch and Manage on a wider screen, the module page links', () => {
  const brand = fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
  assert.ok(!/topbar-clock|startClock/.test(brand), 'no clock');
  assert.ok(!/id: 'spaces-link'|spacesTool/.test(brand), 'the Spaces slot replaced the spaces-link tool');
  assert.ok(!/zone: 'middle'/.test(brand), 'nothing of the system\'s in the middle zone');
  assert.match(brand, /id: 'theme-mode-switch'[^\n]*visible: \(\) => inMenu\(\) && offers\('theme'\)/, 'the theme switch is in the phone menu only; the profile menu has Dark mode');
  assert.match(brand, /id: 'admin-link'[^\n]*visible: \(\) => inMenu\(\) && offers\('manage'\)/, 'Manage is in the phone menu only; the profile menu has it');
  assert.match(brand, /<img data-brand="icon"[^>]*><i [^>]*data-brand="home-icon"/, 'the uploaded logo and the home icon share one box');
  assert.match(brand, /if \(img\) img\.hidden = !b\.hasIcon;/, 'the uploaded logo shows only when there is one');
  assert.match(brand, /if \(icon\) icon\.hidden = Boolean\(b\.hasIcon\);/, 'never both');
  const space = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  assert.ok(!/id="space-name"/.test(space), 'the space bar no longer names the space (decision 14)');
  assert.match(space, /anchorSegments\(/, 'the space page draws the breadcrumb with anchorSegments (crumbSegments inside)');
});

test('the profile menu by role: owners get Manage; the single install\'s admin Manage only; the host admin\'s stand-in Manage and Host console; members and moderators nothing more; Install only while offered; no menu for a guest', () => {
  const base = ['profile', 'theme'];
  assert.deepEqual(profileEntries({ role: 'member' }), [...base, 'sign-out']);
  assert.deepEqual(profileEntries({ role: 'member', installOffered: true }), [...base, 'install', 'sign-out']);
  assert.deepEqual(profileEntries({ role: 'owner' }), [...base, 'manage', 'sign-out']);
  assert.deepEqual(profileEntries({ role: 'owner', hosted: true, installOffered: true }), [...base, 'manage', 'install', 'sign-out']);
  assert.deepEqual(profileEntries({ role: 'admin', hosted: false }), [...base, 'manage', 'sign-out'], 'a single install: Manage only, no host console');
  assert.deepEqual(profileEntries({ role: 'admin', hosted: false, hostAdmin: true }), [...base, 'manage', 'sign-out'], 'no host console without a hosted server');
  assert.deepEqual(profileEntries({ role: 'admin', hosted: true, hostAdmin: true }), [...base, 'manage', 'host-console', 'sign-out']);
  assert.deepEqual(profileEntries({ role: 'admin', hosted: true, hostAdmin: true, installOffered: true }), [...base, 'manage', 'host-console', 'install', 'sign-out']);
  assert.deepEqual(profileEntries({ role: 'member', themeSwitch: false }), ['profile', 'sign-out']);
  assert.deepEqual(profileEntries({ role: 'guest', installOffered: true }), [], 'a guest: no menu, no install');
  assert.deepEqual(profileEntries({}), []);
  assert.equal(seesUpdates('owner') && seesUpdates('admin'), true);
  assert.equal(seesUpdates('member') || seesUpdates('guest') || seesUpdates(undefined), false);
  const brand = fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
  const menu = brand.slice(brand.indexOf('function accountMenuItems('), brand.indexOf('\n}\n', brand.indexOf('function accountMenuItems(')));
  assert.match(menu, /new Set\(profileFor\(\)\)/, 'the menu under your picture follows profileEntries');
  assert.match(menu, /label: 'Dark mode', checked: modeNow\(\) === 'dark'/, 'Dark mode is a checkbox entry');
});

test('the host console\'s address, from an environment\'s own; none on a single install', () => {
  assert.equal(hostConsoleUrl({ protocol: 'https:', hostname: 'sandbox.example.org', port: '' }, 'sandbox'), 'https://admin.example.org/');
  assert.equal(hostConsoleUrl({ protocol: 'http:', hostname: 'sandbox.localhost', port: '3000' }, 'sandbox'), 'http://admin.localhost:3000/');
  assert.equal(hostConsoleUrl({ protocol: 'https:', hostname: 'example.org' }, ''), null);
  assert.equal(hostConsoleUrl({ protocol: 'https:', hostname: 'other.example.org' }, 'sandbox'), null);
});

test('the space switcher: your spaces in the list\'s order, never an aside, a mark where you are present, the count; a pick enters or goes back', () => {
  const spaces = [
    { id: 'lobby', name: 'Lobby', mine: true },
    { id: 'paris', name: 'Paris', mine: false },
    { id: 'disney', name: 'Disneyland', mine: true },
    { id: 'aside1', name: 'Aside', mine: true, isAside: true },
  ];
  const users = [{ key: 'a', online: true, space: 'disney' }, { key: 'b', online: true, space: 'disney' }, { key: 'c', online: false, space: 'disney' }, { key: 'd', online: true, space: 'lobby' }];
  assert.deepEqual(switcherEntries({ spaces, users, present: 'disney' }), [
    { id: 'lobby', name: 'Lobby', here: false, count: 1 },
    { id: 'disney', name: 'Disneyland', here: true, count: 2 },
  ]);
  assert.deepEqual(switcherEntries({}), []);
  assert.equal(switchPick(null, 'disney'), 'enter', 'present nowhere: enter');
  assert.equal(switchPick('disney', 'disney'), 'back', 'present there: back to it');
  assert.equal(switchPick('lobby', 'disney'), 'enter', 'present elsewhere: enter, until the visit view');
});

test('the bell: unread notices for everyone, and module updates for owners and the admin only', () => {
  assert.deepEqual(bellState({ unread: 2, updates: 3, role: 'member', moduleWord: 'module' }), { count: 2, updates: 0, title: 'Notifications, 2 unread' });
  assert.deepEqual(bellState({ unread: 2, updates: 3, role: 'owner', moduleWord: 'module' }), { count: 5, updates: 3, title: 'Notifications, 2 unread, 3 module updates' });
  assert.deepEqual(bellState({ unread: 0, updates: 1, role: 'admin', moduleWord: 'tool' }), { count: 1, updates: 1, title: 'Notifications, 0 unread, 1 tool update' });
  const brand = fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
  assert.ok(!/nav\.setBadge\('admin-link'/.test(brand), 'the update count is off Manage and your picture: it is on the bell');
});

test('the breadcrumb: nothing on home; a space\'s name; an aside\'s parent (Rejoin call) then the aside word and the others\' first names', () => {
  assert.deepEqual(crumbSegments({ space: null }), []);
  assert.deepEqual(crumbSegments({ space: { name: 'Disneyland' } }), [{ label: 'Disneyland', current: true }]);
  assert.deepEqual(crumbSegments({ space: { isAside: true }, parentName: 'Disneyland', asideWord: 'Aside', others: ['Michelle Obama', 'Sam'] }), [
    { label: 'Disneyland', current: false, action: 'rejoin', title: 'Rejoin call in Disneyland' },
    { label: 'Aside: Michelle, Sam', current: true },
  ]);
  assert.deepEqual(crumbSegments({ space: { isAside: true }, asideWord: 'Side chat' }), [{ label: 'Side chat', current: true }]);
});

test('the anchor on the space page: the space\'s breadcrumb, nothing while home shows over it, a guest link\'s space; entering any space clears home', () => {
  assert.deepEqual(anchorSegments({ space: { name: 'Paris' } }), [{ label: 'Paris', current: true }]);
  assert.deepEqual(anchorSegments({ space: { name: 'Paris' }, viewingHome: true }), [], 'home over the space: empty (the pill is a later step)');
  assert.deepEqual(anchorSegments({ space: null, viewingHome: true }), []);
  assert.deepEqual(anchorSegments({ space: null, guestSpaceName: 'Disneyland' }), [{ label: 'Disneyland', current: true }]);
  assert.equal(anchorSegments({ space: { isAside: true }, parentName: 'Disneyland', asideWord: 'Aside', others: ['Max'] })[0].title, 'Rejoin call in Disneyland');
  const space = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const crumb = space.slice(space.indexOf('function updateCrumb('), space.indexOf('\n}\n', space.indexOf('function updateCrumb(')));
  assert.match(crumb, /anchorSegments\(\{ space, viewingHome,/, 'updateCrumb draws anchorSegments');
  // Every way into a space clears "home over the space": join() itself, connectAndSetup() (every join, pull, invitation
  // and reload lands there) and a dropped connection.
  const join = space.slice(space.indexOf("async function join(spaceId = 'lobby'"), space.indexOf('\n}\n', space.indexOf("async function join(spaceId = 'lobby'")));
  assert.match(join, /viewingHome = false;/, 'join() clears viewingHome');
  const setup = space.slice(space.indexOf('async function connectAndSetup('), space.indexOf('async function startCall('));
  assert.ok(setup.indexOf('viewingHome = false;') > -1 && setup.indexOf('viewingHome = false;') < setup.indexOf('updateCrumb();'), 'connectAndSetup() clears viewingHome before it draws the breadcrumb');
  assert.match(space, /\.on\(RoomEvent\.Disconnected, \(\) => \{\n\s*viewingHome = false;/, 'a dropped connection clears it');
  assert.match(space, /aria-label="\$\{escapeHtml\(seg\.title \|\| seg\.label\)\}"/, 'the parent segment says what it does to a screen reader');
});

test('in an aside, picking the parent space in the switcher does what Rejoin call does: returnFromAside, never a move of my own', () => {
  const space = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const at = space.indexOf("document.addEventListener('app:enter-space'");
  assert.ok(at > -1, 'the space page takes the switcher\'s picks');
  const handler = space.slice(at, space.indexOf('\n});\n', at));
  const aside = handler.indexOf('currentSpace.isAside && currentSpace.origin === id) returnFromAside()');
  assert.ok(aside > -1, 'a pick of the aside\'s parent calls returnFromAside()');
  assert.ok(aside < handler.indexOf('joinInvitedSpace(id)'), 'checked before any move (joinInvitedSpace would strand the others)');
});

test('no ☰ with nothing in its menu (a guest), and the place outlasts your name and the environment\'s between the phone and a wide screen', () => {
  const brand = fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
  const wire = brand.slice(brand.indexOf('function wireNavMenu('), brand.indexOf('function firstEntry('));
  assert.match(wire, /const any = \[\.\.\.menu\.children\]\.some\(\(c\) => !c\.hidden && !\('navDivider' in c\.dataset\)\);/);
  assert.match(wire, /toggle\.hidden = !any/);
  assert.match(wire, /new MutationObserver\(syncToggle\)\.observe\(menu, \{ childList: true, subtree: true, attributes: true, attributeFilter: \['hidden'\] \}\)/);
  const css = fs.readFileSync(path.join(ROOT, 'public/style.css'), 'utf8');
  assert.match(css, /\.topbar \.nav-toggle\[hidden\] \{\s*display: none;/, 'the phone rule that shows the button gives way to [hidden]');
  assert.match(css, /@media \(min-width: 641px\) and \(max-width: 1000px\) \{\s*\.topbar button\.whoami #whoami \{\s*display: none;/, 'your name goes first');
  assert.match(css, /@media \(min-width: 641px\) and \(max-width: 820px\) \{\s*\.topbar \.brand-home \.brand-name \{\s*display: none;/, 'then the environment\'s');
  assert.match(css, /\.topbar \.nav-left > \.crumb \{\s*flex: 0 1 auto;\s*min-width: 6em;/, 'the place keeps a few letters and its ellipsis at any width');
});

console.log(`check-nav: OK (${n} tests)`);
