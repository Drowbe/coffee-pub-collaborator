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
import { createRequire } from 'node:module';

// The page's file is plain ES module syntax under a .js name; node wants .mjs to load it without a warning, so it is
// imported from a temporary copy (the same way check-syntax.mjs parses the pages).
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'nav-check-'));
const copy = path.join(tmp, 'nav-bar.mjs');
fs.copyFileSync(path.join(ROOT, 'public/nav-bar.js'), copy);
const { arrange, isVisible, cleanModuleTools, bandOf, BANDS, DEFAULT_ORDER, phoneZones, isShown, foldSteps, foldCount, fitWidth, register, nav: navApi } = await import(pathToFileURL(copy).href);
// Who is here (Online, the space bar's left zone) gives way before the bar folds; its fitting and its reading of the call are pure.
const peopleCopy = path.join(tmp, 'space-people.mjs');
fs.copyFileSync(path.join(ROOT, 'public/space-people.js'), peopleCopy);
const { facesThatFit, peopleIn, hereWords, MAX_FACES } = await import(pathToFileURL(peopleCopy).href);
// The primary nav's pure parts (plan-primary-nav.md, step 2): the profile menu by role, the switcher, the bell, the breadcrumb.
const primaryCopy = path.join(tmp, 'primary-nav.mjs');
fs.copyFileSync(path.join(ROOT, 'public/primary-nav.js'), primaryCopy);
const { SLOTS, pageAnchor, profileEntries, seesUpdates, hostConsoleUrl, switcherEntries, switchPick, bellState, crumbSegments, anchorSegments, pageOpens, isHere, steppedOut, hereCount, asidePlaceholder, whereWords, offStream, destinationTools, tileRefTarget, tileHeading, hashPanel } = await import(pathToFileURL(primaryCopy).href);
// The server's presence by membership (plan-primary-nav.md, step 3), so the pages' reading is held against the real answer.
const { presenceView } = createRequire(import.meta.url)('../server/presence-view.js');
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
  assert.equal(u.zone, 'right', 'a module tool naming the middle lands in the right zone, not refused (plan-two-zone-nav.md)');
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
  assert.equal(u.zone, 'right');
  // plan-two-zone-nav.md, step 5: every module tool goes in the space bar's right zone, where it can fold; `zone` is not read.
  for (const zone of ['left', 'middle', 'right', 'nowhere', undefined]) assert.equal(cleanModuleTools('m', [{ id: 'a', icon: 'x', label: 'x', zone }])[0].zone, 'right', `zone ${zone}: the right zone`);
  const navSrc = fs.readFileSync(path.join(ROOT, 'public/nav-bar.js'), 'utf8');
  const hostSrc = fs.readFileSync(path.join(ROOT, 'public/module-host.js'), 'utf8');
  assert.ok(!/allowPrimary/.test(navSrc + hostSrc), 'allowPrimary is gone from nav-bar.js and module-host.js');
  assert.ok(!/contextInfo\.module\.nav/.test(hostSrc), 'module-host.js no longer reads the manifest\'s surfaces.page.nav');
});

test('on a phone the primary bar folds: the left stays, the bell stays (phone: \'bar\'), and everything else goes into the menu, your picture too', () => {
  const t = (id, zone, extra = {}) => ({ id, bar: 'primary', zone, ...extra });
  const byZone = {
    left: [t('spaces-slot', 'left', { order: 1 }), t('topbar-crumb', 'left', { order: 2 })],
    right: [t('menu-home', 'right', { order: 2 }), t('notifications-bell', 'right', { order: 90, phone: 'bar' }), t('whoami-link', 'right', { group: 'you', order: 999 }), t('account-profile', 'right', { group: 'you', order: 999 })],
  };
  const z = phoneZones(byZone);
  assert.deepEqual(z.left.map((run) => run.map((x) => x.id)), [['spaces-slot', 'topbar-crumb']], 'the left zone stays (Spaces hides itself there)');
  assert.deepEqual(z.bar.map((run) => run.map((x) => x.id)), [['notifications-bell']], 'only the bell stays in the bar, in the phone\'s place (#core-nav)');
  assert.deepEqual(z.right.map((run) => run.map((x) => x.id)), [['menu-home', 'whoami-link', 'account-profile']], 'everything else from the right, without the bell, in the menu');
  assert.ok(!('middle' in z), 'no middle zone (plan-two-zone-nav.md)');
  const navSrc = fs.readFileSync(path.join(ROOT, 'public/nav-bar.js'), 'utf8');
  assert.match(navSrc, /place: el\.querySelector\(':scope > \.nav-middle'\)/, 'the top bar\'s #core-nav is where the phone\'s bell is drawn');
  const brand = fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
  assert.match(brand, /id: 'notifications-bell'[^\n]*phone: 'bar'/, 'the bell says phone: \'bar\'');
  for (const id of ['spaces-slot']) assert.match(brand, new RegExp(`id: '${id}'[^\\n]*visible: \\(\\) => wide\\(\\) && signedIn\\(\\)`), `${id} leaves the bar on a phone`);
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

test('the space bar folds only as much as it must: two zones, the left taking what the right does not', () => {
  const steps = [40, 40, 120];
  // One grid gap of 12 between the two zones.
  assert.equal(foldCount({ width: 1000, gap: 12, left: 300, right: 300, more: 30, steps }), 0);
  assert.equal(foldCount({ width: 612, gap: 12, left: 300, right: 300, more: 30, steps }), 0, 'exactly full: nothing folds');
  assert.equal(foldCount({ width: 611, gap: 12, left: 300, right: 300, more: 30, steps }), 1, 'a pixel short: one step folds');
  assert.equal(foldCount({ width: 600, gap: 12, left: 300, right: 300, more: 30, steps: [20, 20, 120] }), 3, 'the "..." takes width too: 300+30-20-20 is still too wide');
  assert.equal(foldCount({ width: 600, gap: 12, left: 300, right: 300, more: 30, steps }), 2);
  assert.equal(foldCount({ width: 700, gap: 12, left: 300, right: 420, more: 30, steps: [100, 40] }), 1);
  // Nothing fits: everything that can fold does, and no more.
  assert.equal(foldCount({ width: 100, gap: 12, left: 300, right: 300, more: 30, steps }), 3);
  assert.equal(foldCount({ width: 100, gap: 12, left: 300, right: 300, more: 30, steps: [] }), 0);
  // A middle, if anyone still passes one, is not read.
  assert.equal(foldCount({ width: 612, gap: 12, middle: 500, left: 300, right: 300, more: 30, steps }), 0);
  const src = fs.readFileSync(path.join(ROOT, 'public/nav-bar.js'), 'utf8');
  assert.ok(!/middleCentred|middleWidth|dataset\.middle/.test(src), 'middleCentred(), middleWidth() and data-middle are gone');
  assert.match(src, /^const ZONES = \['left', 'right'\];/m, 'two zones');
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

test('Online gets the width the rest of the left zone and the right zone leave, so it shrinks before anything folds', () => {
  const steps = [40, 40, 120];
  // The bar's width, less the gap between the zones, the right zone at its full width and the rest of the left zone.
  assert.equal(fitWidth({ width: 1000, gap: 12, left: 140, right: 300 }), 1000 - 12 - 140 - 300);
  // A tool that takes exactly that width folds nothing; a little more folds the right zone.
  for (const [width, rest, right] of [[1000, 140, 300], [800, 140, 230], [641, 140, 201], [700, 130, 420]]) {
    const w = fitWidth({ width, gap: 12, left: rest, right });
    assert.equal(rest + w + right + 12, width, `${width}: the rest, the tool, the right zone and the gap fill the row`);
    assert.equal(foldCount({ width, gap: 12, left: rest + w, right, more: 30, steps }), 0, `${width}: nothing folds at that width`);
    assert.ok(foldCount({ width, gap: 12, left: rest + w + 2, right, more: 30, steps }) > 0, `${width}: a little more folds the right zone`);
  }
  // At 641 with the right zone wide (Rejoin call and Pull participants back showing), the portraits go first.
  const sizes = { base: 60, first: 26, step: 17, plus: 24 };
  assert.equal(facesThatFit({ avail: fitWidth({ width: 641, gap: 12, left: 140, right: 420 }), count: 9, ...sizes }), 0, 'the count alone');
  // The fold gives it that width, measured from the rest of the left zone (the tool itself left out, a gap before it).
  const src = fs.readFileSync(path.join(ROOT, 'public/nav-bar.js'), 'utf8');
  const fit = src.slice(src.indexOf('function fitSecondary('), src.indexOf('function paintMoreBadge('));
  assert.match(fit, /t\.zone === 'left' && typeof t\.fit === 'function'/, 'a left-zone tool that can shrink');
  assert.match(fit, /const rest = naturalWidth\(b\.zones\.left, els\.get\(t\.id\), \{ margins: false \}\);/);
  assert.match(fit, /fitWidth\(\{ width, gap, left: rest\.w \+ \(rest\.n \? rest\.gap : 0\), right: r\.w \}\)/);
  assert.ok(fit.indexOf('t.fit(avail)') < fit.indexOf('const leftWidth'), 'the left zone is measured after it has shrunk');
  assert.match(fit, /foldCount\(\{ width, gap, left: leftWidth, right: r\.w, more: moreWidth, steps: stepWidths \}\)/);
});

test('the space bar in two zones: Modules, then Online, on the left; one colour; no #subnav-middle', () => {
  const space = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  assert.ok(!/subnav-middle|nav-middle/.test(space), 'the space bar\'s markup has no middle');
  assert.match(space, /<div class="nav-left subnav-left"><\/div>\n  <span class="nav-right subnav-tools"><\/span>/);
  assert.match(space, /nav\.register\(\{ bar: 'secondary', zone: 'left', group: 'modules', id: 'module-chooser', order: 1,/);
  assert.match(space, /nav\.register\(\{ bar: 'secondary', zone: 'left', group: 'people', groupOrder: 2, id: 'who-here', order: 1, fold: false,[^\n]*fit: whoHere\.fit,/, 'Online after Modules, never folding, with fit');
  // In drawing order, Modules then Online, two groups (a divider between).
  const left = arrange([{ id: 'who-here', group: 'people', groupOrder: 2, order: 1, seq: 1 }, { id: 'module-chooser', group: 'modules', order: 1, seq: 2 }]);
  assert.deepEqual(ids(left), [['module-chooser'], ['who-here']]);
  const css = fs.readFileSync(path.join(ROOT, 'public/style.css'), 'utf8');
  const dest = fs.readFileSync(path.join(ROOT, 'public/destination.css'), 'utf8');
  assert.match(css, /body\.in-space \.subnav \{\s*display: grid;\s*grid-column: 1 \/ -1;[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/, 'the left zone takes what the right does not');
  assert.ok(!/data-middle|subnav-middle/.test(css + dest), 'no data-middle and no #subnav-middle rules');
  assert.ok(!/\.subnav[^{,]*\.nav-middle/.test(css + dest), 'no rule for a middle in the space bar or a page bar');
  assert.match(dest, /body\.destination-page \.subnav \{\s*display: grid;\s*grid-column: 1 \/ -1;\s*grid-template-columns: minmax\(0, 1fr\) auto;/, 'the destination page\'s bar too');
  // One colour: the bar's own, and no rule gives either zone a background.
  const plain = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const [, sel, body] of plain.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/background/.test(body)) continue;
    for (const one of sel.split(',').map((x) => x.trim())) {
      assert.ok(!/(^|\s)\.topbar \.nav-(left|right)$|\.subnav[^>]*\.nav-(left|right)$|\.subnav-(left|tools)$/.test(one), `no background on the space bar's zones (${one})`);
    }
  }
  assert.match(css, /\n\.subnav \{[^}]*background: var\(--nav-secondary-bg\);/, 'the whole bar is --nav-secondary-bg');
  // The phone's tab bar: Online's count follows the tabs in the left zone, no divider there.
  assert.match(css, /body\.in-space \.subnav \.nav-left > \.who-here \{\s*align-self: stretch;/);
  assert.match(css, /body\.in-space \.subnav \.nav-left > \.nav-divider \{\s*display: none;/);
});

test('the registry has two zones: register() refuses the middle, as any unknown zone', () => {
  assert.throws(() => register({ id: 'x', bar: 'secondary', zone: 'middle', icon: 'x', label: 'x' }), /zone must be left or right/);
  assert.throws(() => register({ id: 'x', bar: 'primary', zone: 'middle', icon: 'x', label: 'x' }), /zone must be left or right/);
  assert.throws(() => register({ id: 'x', bar: 'secondary', zone: 'top', icon: 'x', label: 'x' }), /zone must be left or right/);
  assert.ok(!('middleCentred' in navApi) && !('middleWidth' in navApi) && 'fitWidth' in navApi, 'the registry\'s object');
  for (const f of ['brand.js', 'primary-nav.js', 'space.js', 'destination.js']) assert.ok(!/zone: 'middle'/.test(fs.readFileSync(path.join(ROOT, 'public', f), 'utf8')), `${f} registers nothing in a middle zone`);
  const sdk = fs.readFileSync(path.join(ROOT, 'public/sdk/host.js'), 'utf8');
  assert.match(sdk, /`zone` is ignored/, 'the SDK says a module\'s zone is ignored');
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

test('nothing around the space bar\'s lists cuts them off: no overflow but visible on the space bar or its zones', () => {
  // The Modules list and who's here hang below the space bar, out of its zones' boxes. The space bar sits inside the
  // header (.topbar), so a rule meant for the top bar's own zones (`.topbar .nav-left`) reaches the space bar's too
  // unless it is a child selector (`.topbar > .nav-left`): an `overflow: hidden` there hid the Modules list as it opened.
  const css = fs.readFileSync(path.join(ROOT, 'public/style.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const around = ['subnav', 'subnav-left', 'subnav-tools', 'page-bar', 'dest-bar', 'nav-left', 'nav-right', 'module-chooser', 'who-here'];
  const bad = [];
  for (const [, selectors, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    if (!/(^|[;\s])overflow(-[xy])?\s*:\s*(hidden|clip|auto|scroll)/.test(body)) continue;
    for (const sel of selectors.split(',').map((x) => x.trim())) {
      const m = sel.match(/(\s*>\s*|\s+)?([^\s>+~]+)$/);
      if (!m) continue;
      const classes = [...m[2].replace(/:[\w-]+(\([^)]*\))?/g, '').matchAll(/\.([\w-]+)/g)].map((c) => c[1]);
      if (!classes.some((c) => around.includes(c))) continue;
      const child = (m[1] || '').includes('>');
      const before = sel.slice(0, sel.length - m[0].length).trim();
      // A zone selected as the top bar's own child is not the space bar's; anything else may match it.
      if (child && /(^|\s)\.topbar$/.test(before) && !classes.includes('subnav')) continue;
      bad.push(sel);
    }
  }
  assert.deepEqual(bad, [], 'these rules clip the space bar or its zones, and so its Modules list or who\'s here');
  assert.match(css, /\n\.topbar > \.nav-left \{\s*overflow: hidden;/, 'the top bar\'s own left zone still cuts a long breadcrumb');
});

test('the top bar\'s slots, left to right: logo, environment, the destinations, Spaces, the anchor, then online people, the bell and the profile', () => {
  assert.deepEqual(SLOTS, ['logo', 'environment', 'destinations', 'home', 'anchor', 'people', 'notifications', 'profile']);
  const brand = fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
  const reg = (id) => {
    const m = brand.match(new RegExp(`nav\\.register\\(\\{ id: '${id}', bar: 'primary', zone: '(\\w+)'[^\\n]*?order: (\\d+)`));
    assert.ok(m, `brand.js registers ${id}`);
    return { zone: m[1], order: Number(m[2]) };
  };
  const left = ['spaces-slot', 'topbar-crumb', 'topbar-status'].map(reg);
  assert.ok(left.every((t) => t.zone === 'left'), 'Spaces and the anchor are the left zone');
  assert.deepEqual(left.map((t) => t.order), [9, 10, 11], 'Spaces, then the anchor, after the destinations (orders 1 to 8)');
  assert.match(brand, /id: 'spaces-slot', bar: 'primary', zone: 'left', group: 'where'/, 'Spaces in the group `where`, with the destinations');
  const dests = destinationTools(Array.from({ length: 9 }, (_, i) => ({ id: `d${'abcdefghi'[i]}x`, name: `D${i}`, href: `/d${i}` })));
  assert.ok(dests.every((d) => d.bar.zone === 'left' && d.bar.group === 'where' && d.bar.order < 9), 'every destination ahead of Spaces (at most 8)');
  const html = brand.slice(brand.indexOf('header.innerHTML = `'), brand.indexOf('nav.attach(\'primary\', header)'));
  assert.ok(html.indexOf('brand-logo') > -1 && html.indexOf('brand-logo') < html.indexOf('data-brand="environmentName"'), 'the logo box, then the environment\'s name, in the left zone\'s markup ahead of the tools');
  assert.ok(reg('notifications-bell').zone === 'right' && reg('whoami-link').zone === 'right', 'the bell and the profile are the right zone');
  assert.match(brand, /id: 'notifications-bell'[^\n]*groupOrder: 90/);
  assert.match(brand, /id: 'whoami-link'[^\n]*groupOrder: 999/, 'the profile last');
});

test('no Modules slot in the top bar (Thomas, 2026-10-02): no modules-nav, no module page entries in the phone menu, no Modules menu or its counts', () => {
  assert.ok(!SLOTS.includes('modules'), 'SLOTS has no Modules slot');
  const brand = fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
  assert.ok(!/modules-nav|moduleMenuItems|openModulePage|modulePages|loadModuleNav|refreshModuleNav|module-nav-loaded/.test(brand), 'brand.js draws no Modules slot, menu or count');
  assert.ok(!/id: `page-\$\{/.test(brand), 'no page-<id> entries in the phone menu');
  assert.ok(!/\/api\/modules\/nav/.test(brand), 'the bar does not ask for the module pages');
  const admin = fs.readFileSync(path.join(ROOT, 'public/admin.js'), 'utf8');
  assert.ok(!/refreshModuleNav/.test(admin), 'Manage no longer refreshes a bar entry that is gone');
  const css = fs.readFileSync(path.join(ROOT, 'public/style.css'), 'utf8');
  assert.ok(!/module-nav-link|module-nav-label/.test(css), 'no styles left for the old module page links');
  // The space bar's own Modules chooser (the canvas's switches) stays.
  const space = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  assert.match(space, /id: 'module-chooser'/);
});

test('gone from the top bar: the clock, the lock or luggage icon beside the logo, the theme switch and Manage on a wider screen, the module page links', () => {
  const brand = fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
  assert.ok(!/topbar-clock|startClock/.test(brand), 'no clock');
  assert.ok(!/id: 'spaces-link'|spacesTool/.test(brand), 'the Spaces slot replaced the spaces-link tool');
  assert.ok(!/zone: 'middle'/.test(brand), 'nothing of the system\'s in the middle zone');
  assert.ok(!/zone: 'middle'/.test(fs.readFileSync(path.join(ROOT, 'public/primary-nav.js'), 'utf8')), 'the destinations are not in the middle zone either (plan-two-zone-nav.md)');
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

// One presence answer, as GET /api/presence gives it to `viewer` (decision 6, step 3). Bo, Cy and Di are in the
// Hall; Bo and Cy stepped out of it into an aside (private when `priv`); Di stays; Ed is in the Cellar, which the
// member Al does not belong to.
function presenceAnswer(viewer, { priv = false } = {}) {
  const spaces = [
    { id: 'hall', name: 'Hall', members: ['al', 'bo', 'cy', 'di'] },
    { id: 'cellar', name: 'Cellar', members: ['ed'] },
  ];
  const asides = [{ id: 'aside-1', origin: 'hall', private: priv, members: ['bo', 'cy'] }];
  const online = new Map([
    ['al', { key: 'al', space: 'hall', inCall: true }],
    ['bo', { key: 'bo', space: 'aside-1', inCall: true }],
    ['cy', { key: 'cy', space: 'aside-1', inCall: true }],
    ['di', { key: 'di', space: 'hall', inCall: false }],
    ['ed', { key: 'ed', space: 'cellar', inCall: true }],
  ]);
  const users = ['al', 'bo', 'cy', 'di', 'ed'].map((key) => ({ key, displayName: key.toUpperCase() }));
  const view = presenceView(viewer, {
    users, spaces, asides, online, present: () => false, activeSpace: 'cellar',
    describeUser: (u) => ({ key: u.key, displayName: u.displayName }), describeSpace: (r) => ({ ...r }),
  });
  // As space.js lists them: the asides after the spaces, marked.
  return { ...view, list: [...view.spaces, ...view.asides.map((a) => ({ ...a, isAside: true }))], user: (k) => view.users.find((u) => u.key === k) };
}

test('presence by membership: those stepped out into an aside are not here, in the cards, the switcher or the count', () => {
  const p = presenceAnswer({ key: 'al', owner: false });
  assert.equal(p.user('bo').space, 'hall', 'the stand-in answer: Bo reads as the Hall');
  assert.equal(p.user('bo').aside, true);
  assert.equal(p.user('ed').elsewhere, true, 'Ed is somewhere Al cannot see');
  assert.equal(steppedOut(p.user('bo'), 'hall'), true);
  assert.equal(isHere(p.user('bo'), 'hall'), false, 'stepped out: not here');
  assert.equal(isHere(p.user('di'), 'hall'), true);
  assert.equal(isHere(p.user('ed'), 'hall'), false);
  const hallPeople = ['al', 'bo', 'cy', 'di'].map(p.user);
  assert.equal(hereCount(hallPeople, 'hall'), '2 here · 1 in the call', 'Al and Di here, Al on the call; Bo and Cy left out');
  assert.equal(hereCount([p.user('bo')], 'hall'), 'Nobody here');
  assert.deepEqual(switcherEntries({ spaces: p.spaces, users: p.users, present: 'hall' }).map((e) => [e.id, e.count]), [['hall', 2]], 'the switcher: only the Hall, 2 here');
  // An aside's own people (an owner sees the aside itself) are in it, not stepped out of it.
  const o = presenceAnswer({ key: 'zz', owner: true });
  assert.equal(o.user('bo').space, 'aside-1');
  assert.equal(isHere(o.user('bo'), 'aside-1', { aside: true }), true);
  assert.equal(isHere(o.user('bo'), 'hall'), false);
  assert.equal(hereCount(['al', 'bo', 'cy', 'di'].map(o.user), 'hall'), '2 here · 1 in the call', 'an owner counts the same');
  // A guest of the Hall: the cut-down answer, the same count.
  const g = presenceAnswer({ guestSpace: 'hall' });
  assert.deepEqual(g.spaces.map((s) => s.id), ['hall']);
  assert.equal(hereCount(g.users.filter((u) => ['al', 'bo', 'cy', 'di'].includes(u.key)), 'hall'), '2 here · 1 in the call');
  // The page draws it this way.
  const space = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  assert.ok(!/function hereCount\(/.test(space), 'space.js uses primary-nav.js\'s hereCount, not its own');
  assert.match(space, /const here = isHere\(u, spaceId, \{ aside: isAside \}\);/, 'renderMembers reads here with isHere');
});

test('presence by membership: the "In an aside" placeholder tiles come from the answer, and a private one names nobody', () => {
  const hall = { id: 'hall', members: ['al', 'bo', 'cy', 'di'] };
  for (const priv of [false, true]) {
    const p = presenceAnswer({ key: 'al', owner: false }, { priv });
    assert.equal(p.asides.length, 0, 'Al is not in the aside, so it is not listed');
    // From the answer alone (asidePrivate, so it holds after a reload): a placeholder, naming nobody.
    assert.equal(p.user('bo').asidePrivate, priv, 'the answer says which kind');
    assert.deepEqual(asidePlaceholder(p.user('bo'), hall, p.list), { private: priv, members: [] });
    assert.equal(asidePlaceholder(p.user('di'), hall, p.list), null, 'Di is here');
    assert.equal(asidePlaceholder(p.user('ed'), hall, p.list), null, 'Ed is elsewhere, not aside from here');
    // With what the call's aside-started message said.
    const said = { private: priv, members: priv ? [] : ['bo', 'cy'] };
    assert.deepEqual(asidePlaceholder(p.user('bo'), hall, p.list, said), priv ? { private: true, members: [] } : { private: false, members: ['bo', 'cy'] });
    // An owner sees the aside record itself; a private one still names nobody.
    const o = presenceAnswer({ key: 'zz', owner: true }, { priv });
    assert.deepEqual(asidePlaceholder(o.user('bo'), hall, o.list), priv ? { private: true, members: [] } : { private: false, members: ['bo', 'cy'] });
    // In the aside myself: its own people are not placeholders.
    const b = presenceAnswer({ key: 'bo', owner: false }, { priv });
    assert.equal(asidePlaceholder(b.user('cy'), { id: 'aside-1', isAside: true, members: ['bo', 'cy'] }, b.list), null);
    // A guest of the Hall sees the placeholder too.
    const g = presenceAnswer({ guestSpace: 'hall' }, { priv });
    assert.deepEqual(asidePlaceholder(g.users.find((u) => u.key === 'bo'), hall, g.list), { private: priv, members: [] });
    // A message that names people for a private aside still names nobody.
    assert.deepEqual(asidePlaceholder(p.user('bo'), hall, p.list, { private: false, members: ['bo', 'cy'] }), priv ? { private: true, members: [] } : { private: false, members: ['bo', 'cy'] });
  }
  const space = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const reconcile = space.slice(space.indexOf('function reconcileGhostTiles('), space.indexOf('\n}\n', space.indexOf('function reconcileGhostTiles(')));
  assert.match(reconcile, /asidePlaceholder\(user, currentSpace, presenceSpaces, startedAsides\.get\(key\)\)/, 'the tiles come from asidePlaceholder');
  const started = space.slice(space.indexOf("topic === 'aside-started'"), space.indexOf("topic === 'aside-recall'"));
  assert.match(started, /data\.private/, 'the aside-started message is read for private');
  assert.match(started, /pending: true/, 'the pulled member\'s join still finds the pending entry');
  assert.ok(!/Array\.isArray\(data\.members\)\)\s*\{/.test(started), 'a private message with no members is still read');
  assert.match(started, /if \(priv \|\| !said\.length\) loadPresence\(\);/, 'a private message asks presence at once for who stepped out');
  assert.match(started, /asideEntry\(\{ id: data\.spaceId, members: priv \? \[\] : said,/, 'a private entry keeps no members, so it never reads "Private with ..."');
});

test('presence by membership: Who\'s around says "in an aside" and "in another <space>"; the stream somewhere unseen', () => {
  const p = presenceAnswer({ key: 'al', owner: false });
  const words = { aside: 'a side chat', space: 'trip' };
  assert.equal(whereWords(p.user('di'), p.list, words), 'in Hall');
  assert.equal(whereWords(p.user('bo'), p.list, words), 'in a side chat');
  assert.equal(whereWords(p.user('ed'), p.list, words), 'in another trip');
  assert.equal(whereWords({ online: true, space: null }, p.list, words), '');
  const o = presenceAnswer({ key: 'zz', owner: true });
  assert.equal(whereWords(o.user('bo'), o.list, words), 'in a side chat', 'an owner, who sees the aside: still the aside word');
  // Private, from the answer: "in a private conversation", for members and owners alike.
  const pp = presenceAnswer({ key: 'al', owner: false }, { priv: true });
  assert.equal(whereWords(pp.user('bo'), pp.list, words), 'in a private conversation');
  const op = presenceAnswer({ key: 'zz', owner: true }, { priv: true });
  assert.equal(whereWords(op.user('bo'), op.list, words), 'in a private conversation');
  // The home cards' tooltip on a card other than the parent's: stepped out reads as the aside, never "in Hall".
  const space = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const members = space.slice(space.indexOf('function renderMembers('), space.indexOf('\n}\n', space.indexOf('function renderMembers(')));
  assert.match(members, /const there = u\.online && !here && !u\.aside && !u\.elsewhere \?/, 'a stepped-out person is not "in" their parent space');
  assert.match(members, /whereWords\(u, presenceSpaces,/, 'the tooltip takes the aside words from whereWords');
  // The stream is in the Cellar, which Al can't see: activeSpace is null.
  assert.equal(p.activeSpace, null);
  assert.equal(offStream(p.user('di'), p.activeSpace, true), true, 'Di is off the stream');
  assert.equal(offStream(p.user('ed'), p.activeSpace, true), false, 'Ed may be on it: not marked');
  assert.equal(offStream(p.user('ed'), 'hall', true), true, 'the stream in the Hall: Ed is off it');
  assert.equal(offStream(p.user('di'), null, false), false, 'no owner online: no stream to be off');
  // Stepped out of the space the stream hears: off it, on its own (not only through the aside badge).
  assert.equal(offStream(p.user('bo'), 'hall', true), true, 'the stream in the Hall, Bo stepped out of it: off');
  assert.equal(offStream(p.user('bo'), null, true), false, 'the stream somewhere unseen (perhaps Bo\'s aside): not marked');
  assert.equal(offStream(o.user('bo'), 'aside-1', true, ['aside-1']), false, 'an owner, the stream following the aside Bo is in: on it');
  assert.equal(offStream(o.user('bo'), 'hall', true, ['aside-1']), true, 'an owner, the stream in the Hall: Bo is off it');
  assert.equal(offStream(p.user('di'), 'hall', true), false, 'Di, in the Hall with the stream: on it');
  const dash = fs.readFileSync(path.join(ROOT, 'public/dashboard.js'), 'utf8');
  assert.match(dash, /whereWords\(u, spaces,/, 'Who\'s around uses whereWords');
  assert.ok(!/activeSpace = active \|\| LOBBY/.test(space), 'activeSpace null is kept, not read as the Lobby');
  assert.match(members, /offStream\(u, activeSpace, ownerOnline, presenceSpaces\.filter\(\(r\) => r\.isAside\)/, 'off stream knows the asides I can see');
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

test('a module page opened from home while present in a space slides over the space (option (a)); present nowhere it is a real page', () => {
  assert.equal(pageOpens({ kind: 'module', present: true }), 'overlay');
  assert.equal(pageOpens({ kind: 'module', present: false }), 'page');
  assert.equal(pageOpens({ kind: 'manage', present: false }), 'overlay', 'Manage and the rest open over the page as before');
  assert.equal(pageOpens({ kind: 'host-console', present: true }), 'new-tab');
  // The real handlers, run against a stand-in document: dashboard.js's click on a card's heading and space.js's
  // app:open-page listener.
  const dash = fs.readFileSync(path.join(ROOT, 'public/dashboard.js'), 'utf8');
  const space = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const handlerOf = (src, head, first = '') => {
    const at = src.indexOf(head + first);
    assert.ok(at > -1, `found: ${head}${first}`);
    return src.slice(at + head.length, src.indexOf('\n});\n', at));
  };
  assert.match(dash, /<a class="dashboard-widget-title" href="\$\{escapeHtml\(href\)\}"/, 'the heading stays a real link (new tab, present nowhere)');
  // To the module's page, or (plan-calendar-destination, decision 16) the destination it is a part of while that shows:
  // the server's `href`, a path on this server.
  assert.match(dash, /const \{ page, path \} = tileHeading\(w\.href, w\.id\);/, 'to the server\'s href, else the module\'s page (tileHeading)');
  assert.match(dash, /card\(\{ id: w\.id, [^\n]*href: page,/, 'the heading uses it');
  assert.match(dash, /title="Open \$\{escapeHtml\(name \|\| title\)\}" data-page-link>/, 'a heading says it is a page link, whatever its address');
  const dashClick = handlerOf(dash, "document.addEventListener('click', (event) => {", '\n  if (event.defaultPrevented');
  const spaceOpen = handlerOf(space, "document.addEventListener('app:open-page', (event) => {");
  const run = (present, click = {}) => {
    const listeners = {};
    const doc = {
      addEventListener: (type, fn) => { (listeners[type] ||= []).push(fn); },
      dispatchEvent: (e) => { for (const fn of listeners[e.type] || []) fn(e); return !e.defaultPrevented; },
    };
    class CustomEvent {
      constructor(type, { detail, cancelable } = {}) { Object.assign(this, { type, detail, cancelable, defaultPrevented: false }); }
      preventDefault() { if (this.cancelable) this.defaultPrevented = true; }
    }
    const loc = { href: 'http://h.test/', origin: 'http://h.test' };
    const opened = [];
    new Function('document', 'pageOpens', 'currentSpace', 'closePopout', 'openOverlay', 'window',
      `document.addEventListener('app:open-page', (event) => {${spaceOpen}\n});`)(
      doc, pageOpens, present ? { id: 'lobby' } : null, () => {}, (h) => opened.push(h), { open: () => {} });
    new Function('document', 'location', 'CustomEvent', 'URL', `document.addEventListener('click', (event) => {${dashClick}\n});`)(doc, loc, CustomEvent, URL);
    const link = { href: click.href || 'http://h.test/modules/todo', target: '', hasAttribute: (a) => Boolean(click.pageLink) && a === 'data-page-link' };
    const event = {
      type: 'click', button: 0, defaultPrevented: false, ...click,
      target: { closest: (sel) => (sel === '#dashboard a[href]' ? link : null) },
      preventDefault() { this.defaultPrevented = true; },
    };
    doc.dispatchEvent(event);
    return { navigated: !event.defaultPrevented, opened };
  };
  assert.deepEqual(run(true), { navigated: false, opened: ['/modules/todo'] }, 'present: the heading opens over the space and the page stays');
  assert.deepEqual(run(false), { navigated: true, opened: [] }, 'present nowhere: the link navigates');
  assert.deepEqual(run(true, { ctrlKey: true }), { navigated: true, opened: [] }, 'a click meant for a new tab is left to the browser');
  // A tile heading that leads to a destination (/calendar) goes the same way: over the space while present, a page otherwise.
  const toDest = { href: 'http://h.test/calendar#day=2026-10-02', pageLink: true };
  assert.deepEqual(run(true, toDest), { navigated: false, opened: ['/calendar#day=2026-10-02'] }, 'present: a destination heading opens over the space');
  assert.deepEqual(run(false, toDest), { navigated: true, opened: [] }, 'present nowhere: it navigates');
  assert.deepEqual(run(true, { href: 'http://h.test/calendar' }), { navigated: true, opened: [] }, 'another link on home, not a heading, is left alone');
  // A panel tile's heading (/calendar#panel=todo) keeps its hash over the space; present nowhere the link itself goes.
  const toPanel = { href: 'http://h.test/calendar#panel=todo', pageLink: true };
  assert.deepEqual(run(true, toPanel), { navigated: false, opened: ['/calendar#panel=todo'] }, 'present: a panel heading opens over the space, hash and all');
  assert.deepEqual(run(false, toPanel), { navigated: true, opened: [] }, 'present nowhere: it navigates (the link has the hash)');
  // The widget's own "open in full" and an object out of a space go the same way, never straight to location.href.
  assert.ok(!/location\.href = `\/modules/.test(dash), 'dashboard.js never navigates to a module page directly');
  assert.match(dash, /openModulePage\(href\);/, 'a widget\'s "open in full" goes through openModulePage');
});

// Home's tiles (plan-calendar-destination.md, decisions 16 and 20 to 22): an event or a task in the Calendar or To-do
// tile opens the Calendar destination on it while that shows (over the space while present in one, a new tab on Ctrl
// or the middle button); with no destination shown, today's way (its space, or its module's page). The Polls tile is
// unchanged, and the Planner has no tile.
test('home tiles: an object opens where its tile\'s heading goes (the destination), else its space or its module\'s page', () => {
  const ev = { module: 'calendar', kind: 'event', id: 'e1', scope: 'space', space: 'paris' };
  const own = { module: 'todo', kind: 'task', id: 't1', scope: 'environment' };
  const hash = (r) => `#ref=${encodeURIComponent(JSON.stringify(r))}`;
  assert.deepEqual(tileRefTarget(ev, { page: '/calendar', module: 'calendar' }), { how: 'page', href: `/calendar${hash(ev)}` }, 'the destination shows: an event in a space opens there');
  assert.deepEqual(tileRefTarget(own, { page: '/calendar', module: 'todo' }), { how: 'page', href: `/calendar${hash(own)}` }, 'a task too (the To-do part)');
  assert.deepEqual(tileRefTarget({ ...own, scope: 'space', space: 'p' }, { page: '/calendar', module: 'todo' }).how, 'page');
  assert.deepEqual(tileRefTarget(ev, { page: '/modules/calendar', module: 'calendar' }), { how: 'space', href: `/modules/calendar?space=paris${hash(ev)}` }, 'no destination: into its space (the href for a new tab)');
  assert.deepEqual(tileRefTarget(own, { page: '/modules/todo', module: 'todo' }), { how: 'page', href: `/modules/todo${hash(own)}` }, 'no destination: an environment task on its module\'s page');
  assert.equal(tileRefTarget(ev, { page: '/calendar', module: 'polls' }).how, 'space', 'another module\'s object never goes to this tile\'s destination');
  const poll = { module: 'polls', kind: 'poll', id: 'p1', scope: 'space', space: 'paris' };
  assert.equal(tileRefTarget(poll, { page: '/modules/polls', module: 'polls' }).how, 'space', 'a poll still goes into its space');
  assert.equal(tileRefTarget(ev, { page: '', module: 'calendar' }).how, 'space', 'no heading address: today\'s way');

  // dashboard.js's own openRef, run against stand-ins: what it opens, and how.
  const dash = fs.readFileSync(path.join(ROOT, 'public/dashboard.js'), 'utf8');
  const body = dash.slice(dash.indexOf('let openInSpace = null;'), dash.indexOf('// A plain click on a link to a module page on home'));
  assert.match(body, /function openRef\(/);
  assert.match(dash, /onOpenRef: \(ref, o = \{\}\) => openRef\(ref, \{ page, module: w\.id, newTab: o\.newTab \}\)/, 'a widget\'s objects go by its heading\'s address');
  assert.match(dash, /onOpenPage: \(hash, o = \{\}\) => \{\n\s*const href = hash \? `\$\{path\}#\$\{hash\}` : page;\n\s*if \(o\.newTab\) return openNewTab\(href\);/, 'a day: where the heading goes (its place replacing a #panel=), a new tab when asked');
  const run = ({ present = false, page, module, ref, newTab = false, hooks = true }) => {
    const out = { pages: [], spaces: [], tabs: [], navigated: null };
    const doc = { dispatchEvent: (e) => { if (present) { out.pages.push(e.detail.href); return false; } return true; } };
    class CustomEvent { constructor(type, init) { Object.assign(this, { type }, init); } }
    const loc = { set href(h) { out.navigated = h; } };
    const win = { open: (h, t, f) => out.tabs.push([h, t, f]) };
    const api = new Function('document', 'location', 'window', 'CustomEvent', 'tileRefTarget', `${body}\nreturn { openRef, set: (f) => { openInSpace = f; } };`)(doc, loc, win, CustomEvent, tileRefTarget);
    if (hooks) api.set((space, mod) => out.spaces.push([space, mod]));
    api.openRef(ref, { page, module, newTab });
    return out;
  };
  const r1 = run({ present: true, page: '/calendar', module: 'calendar', ref: ev });
  assert.deepEqual([r1.pages, r1.spaces, r1.navigated], [[`/calendar${hash(ev)}`], [], null], 'present: the destination opens over the space, the space is not entered');
  const r2 = run({ present: false, page: '/calendar', module: 'calendar', ref: ev });
  assert.equal(r2.navigated, `/calendar${hash(ev)}`, 'present nowhere: a real page');
  const r3 = run({ present: true, page: '/calendar', module: 'todo', ref: own, newTab: true });
  assert.deepEqual([r3.tabs, r3.pages], [[[`/calendar${hash(own)}`, '_blank', 'noopener']], []], 'Ctrl or middle click: a new tab, and nothing else');
  const r4 = run({ present: true, page: '/modules/calendar', module: 'calendar', ref: ev });
  assert.deepEqual([r4.spaces, r4.pages], [[['paris', 'calendar']], []], 'Show Calendar off: into the event\'s space, as before');
  const r5 = run({ present: false, page: '/modules/polls', module: 'polls', ref: poll });
  assert.deepEqual(r5.spaces, [['paris', 'polls']], 'a poll: into its space');

  // The module host hands the click's wish on; the SDK sends it.
  const hostSrc = fs.readFileSync(path.join(ROOT, 'public/module-host.js'), 'utf8');
  assert.match(hostSrc, /onOpenRef\(cleanPointer\(ref\), \{ newTab: newTab === true \}\)/);
  assert.match(hostSrc, /onOpenPage\(h, \{ newTab: newTab === true \}\)/);
  const sdk = fs.readFileSync(path.join(ROOT, 'public/sdk/host.js'), 'utf8');
  assert.match(sdk, /open: \(ref, o\) => call\('objects\.open', \{ ref, newTab: Boolean\(o && o\.newTab\) \}\)/);
  assert.match(sdk, /open: \(hash, o\) => call\('page\.open', \{ hash, newTab: Boolean\(o && o\.newTab\) \}\)/);
  // The two tiles ask for a new tab on Ctrl, Cmd, Shift or the middle button, for a day, an event and a task.
  for (const [id, sel] of [['calendar', 'data-event'], ['todo', 'data-task']]) {
    const w = fs.readFileSync(path.join(ROOT, `modules/${id}/src/${id}-widget.js`), 'utf8');
    assert.match(w, /const newTab = Boolean\(e\.ctrlKey \|\| e\.metaKey \|\| e\.shiftKey \|\| e\.button === 1\);/, `${id}: a new tab on a modifier or the middle button`);
    assert.match(w, /root\.addEventListener\('auxclick', \(e\) => \{ if \(e\.button === 1\) opened\(e\); \}\);/, `${id}: the middle button`);
    assert.match(w, /host\.objects\.open\([^\n]*\{ newTab \}\)/, `${id}: the object, with the wish`);
    assert.match(w, /if \(e\.key !== 'Enter' \|\| !\(e\.ctrlKey \|\| e\.metaKey\)/, `${id}: Ctrl or Cmd + Enter from the keyboard`);
    assert.ok(w.includes(`'${sel}'`) || w.includes(`[${sel}]`), `${id}: its objects`);
  }
  assert.match(fs.readFileSync(path.join(ROOT, 'modules/calendar/src/calendar-widget.js'), 'utf8'), /host\.page\.open\('day=' \+ day\.dataset\.day, \{ newTab \}\)/, 'calendar: a day, with the wish');
  // The Planner has no tile on home (decision 22); the Polls tile is still there.
  const manifest = (id) => JSON.parse(fs.readFileSync(path.join(ROOT, `modules/${id}/module.json`), 'utf8'));
  assert.equal(manifest('travel').surfaces.widget, undefined, 'no Trips tile');
  assert.ok(manifest('polls').surfaces.widget, 'the Polls tile stays');
});

// The space page's own functions, cut from the source and run against stand-ins: home over the space, and a page over it.
function homeHarness({ present = true, inSpace = true, home = false, overlayOpen = false } = {}) {
  const space = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const fn = (name) => {
    const at = space.indexOf(`function ${name}(`);
    assert.ok(at > -1, `space.js has ${name}()`);
    return space.slice(at, space.indexOf('\n}\n', at) + 2);
  };
  const at = space.indexOf("const HOME_LINKS = '");
  assert.ok(at > -1, 'space.js names the home links once');
  const links = space.slice(at, space.indexOf('\n', at));
  const listener = space.slice(space.indexOf("document.addEventListener('click', (event) => {\n  if (event.target.closest(HOME_LINKS))"), space.indexOf('\n});\n', space.indexOf('if (event.target.closest(HOME_LINKS)) goHome(event)')) + 4);
  assert.match(listener, /goHome\(event\)/, 'the page\'s Spaces, logo and menu home go through goHome()');
  const state = { away: [], navigated: true, classes: new Set(inSpace ? ['in-space'] : []), frameHidden: !overlayOpen };
  const listeners = [];
  const doc = { addEventListener: (type, f) => { if (type === 'click') listeners.push(f); }, body: { classList: { contains: (c) => state.classes.has(c), remove: (c) => state.classes.delete(c) } } };
  const $ = (id) => (id === 'page-overlay-frame' ? { get hidden() { return state.frameHidden; }, set hidden(v) { state.frameHidden = v; }, src: '' } : {});
  const api = new Function('document', '$', 'setAway', 'state', 'currentSpace', 'guestToken', `
    let viewingHome = ${home};
    function showSpaceList() { setAway(true); viewingHome = true; document.body.classList.remove('in-space'); }
    function refreshNotices() {}
    ${fn('closeOverlay')}
    ${fn('goHome')}
    ${links}
    ${listener}
    return { closeOverlay, viewingHome: () => viewingHome };
  `)(doc, $, (on) => state.away.push(on), state, present ? { id: 'lobby' } : null, null);
  const click = () => {
    const event = { target: { closest: (sel) => (sel.includes('#spaces-link') ? {} : null) }, preventDefault() { state.navigated = false; } };
    for (const f of listeners) f(event);
  };
  return { state, click, ...api };
}

test('Spaces or the logo on home while present stays in the page (the call keeps running); present nowhere it navigates', () => {
  let h = homeHarness({ inSpace: true });
  h.click();
  assert.equal(h.state.navigated, false, 'from the space: home over it');
  assert.equal(h.viewingHome(), true);
  h = homeHarness({ inSpace: false, home: true });
  h.click();
  assert.equal(h.state.navigated, false, 'again on home over the space: still no navigation');
  assert.deepEqual(h.state.away, [], 'and Away is left as it is');
  h = homeHarness({ inSpace: false, home: true, overlayOpen: true });
  h.click();
  assert.equal(h.state.navigated, false);
  assert.equal(h.state.frameHidden, true, 'a page open over home closes');
  assert.ok(!h.state.away.includes(false), 'without clearing Away');
  h = homeHarness({ present: false, inSpace: false, home: false });
  h.click();
  assert.equal(h.state.navigated, true, 'present nowhere: a real navigation');
  // The same links in the header of a page opened over the call (target _top) go the same way.
  const space = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  assert.match(space, /\$\('page-overlay-frame'\)\.addEventListener\('load', \(\) => \{[\s\S]*?doc\?\.addEventListener\('click', \(event\) => \{\n\s*if \(event\.target\.closest\?\.\(HOME_LINKS\)\) goHome\(event\);/);
});

test('closing a page opened from home keeps Away; Away clears only back on the space\'s canvas', () => {
  let h = homeHarness({ inSpace: false, home: true, overlayOpen: true });
  h.closeOverlay();
  assert.deepEqual(h.state.away, [], 'closed onto home over the space: still Away');
  h = homeHarness({ inSpace: true, home: false, overlayOpen: true });
  h.closeOverlay();
  assert.deepEqual(h.state.away, [false], 'closed onto the space: Away clears');
  const space = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const back = space.slice(space.indexOf('function returnToCanvas('), space.indexOf('\n}\n', space.indexOf('function returnToCanvas(')));
  assert.match(back, /viewingHome = false;[\s\S]*setAway\(false\);/, 'returnToCanvas() clears Away');
});

// The top bar's destinations (plan-calendar-destination.md, step 5; plan-two-zone-nav.md, decision 2): a left-zone entry
// per destination the server lists for this viewer, ahead of Spaces, none when it lists none; on a phone an entry in the
// menu after the Spaces slot's entries.
test('destinations: an entry each in the left zone, in the server\'s order, ahead of Spaces, current on its own page', () => {
  const list = [{ id: 'calendar', name: 'Calendar', icon: 'calendar-days', href: '/calendar' }, { id: 'map', name: 'Maps', icon: 'map', href: '/map' }];
  const t = destinationTools(list, { path: '/calendar' });
  assert.deepEqual(t.map((x) => x.bar.id), ['dest-calendar', 'dest-map']);
  assert.ok(t.every((x) => x.bar.zone === 'left' && x.bar.group === 'where'), 'the left zone, in Spaces\' group: no divider between Map and Spaces');
  assert.deepEqual(t.map((x) => x.bar.order), [1, 2]);
  assert.deepEqual(t.map((x) => [x.bar.label, x.bar.icon, x.bar.href]), [['Calendar', 'calendar-days', '/calendar'], ['Maps', 'map', '/map']]);
  assert.deepEqual(t.map((x) => x.bar.current), [true, false]);
  assert.equal(destinationTools(list, { present: true })[0].bar.overlay, true);
  assert.equal(destinationTools(list)[0].bar.overlay, false);
});
// A panel tile's heading (plan-calendar-destination.md): the server gives a panel's tile `href: '/calendar#panel=<id>'`;
// home keeps the hash on every way there, and the destination page opens on that panel (its bottom tab on a phone),
// once, then remembered as a pick. An unknown or unreadable id is ignored; #ref= and #day= still work beside it.
test('a panel tile\'s heading: /calendar#panel=<id> survives home and the overlay, and opens that panel', () => {
  assert.deepEqual(tileHeading('/calendar#panel=todo', 'todo'), { page: '/calendar#panel=todo', path: '/calendar' });
  assert.deepEqual(tileHeading('/calendar', 'calendar'), { page: '/calendar', path: '/calendar' });
  assert.deepEqual(tileHeading('/calendar#ref=x', 'todo'), { page: '/modules/todo', path: '/modules/todo' }, 'only #panel= is a heading\'s hash');
  assert.deepEqual(tileHeading('https://evil.test/x', 'todo'), { page: '/modules/todo', path: '/modules/todo' });
  assert.deepEqual(tileHeading(undefined, 'polls'), { page: '/modules/polls', path: '/modules/polls' });
  const own = { module: 'todo', kind: 'task', id: 't1', scope: 'environment' };
  assert.deepEqual(tileRefTarget(own, { page: '/calendar#panel=todo', module: 'todo' }), { how: 'page', href: `/calendar#ref=${encodeURIComponent(JSON.stringify(own))}` }, 'a task from a panel tile: one hash, the pointer');

  const keys = ['panel:calendar', 'panel:todo'];
  assert.deepEqual(hashPanel('panel=todo', keys), { key: 'panel:todo', found: true, rest: '' });
  assert.deepEqual(hashPanel('panel=nope', keys), { key: '', found: true, rest: '' }, 'unknown: ignored');
  assert.deepEqual(hashPanel('panel=%E0%A4%A', keys), { key: '', found: true, rest: '' }, 'unreadable: ignored');
  assert.deepEqual(hashPanel('panel=todo&day=2026-10-02', keys), { key: 'panel:todo', found: true, rest: 'day=2026-10-02' });
  assert.deepEqual(hashPanel('day=2026-10-02', keys), { key: '', found: false, rest: 'day=2026-10-02' });
  assert.deepEqual(hashPanel('ref=%7B%7D', keys), { key: '', found: false, rest: 'ref=%7B%7D' });

  // The space page's overlay puts its ?from=space… before the hash.
  const space = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const ov = space.slice(space.indexOf('function openOverlay(path) {'), space.indexOf('\n}\n', space.indexOf('function openOverlay(path) {'))) + '\n}';
  const frame = { hidden: true, src: '' };
  new Function('$', 'document', 'spaceName', 'setAway', `${ov}\nopenOverlay('/calendar#panel=todo');`)(() => frame, { querySelector: () => null }, 'Paris', () => {});
  assert.equal(frame.src, '/calendar?from=space&spaceName=Paris#panel=todo', 'over the space: the query, then the hash');

  // destination.js's takeHash, run against stand-ins.
  const dest = fs.readFileSync(path.join(ROOT, 'public/destination.js'), 'utf8');
  assert.match(dest, /import \{ hashPanel \} from '\/primary-nav\.js';/);
  const take = dest.slice(dest.indexOf('function takeHash() {'), dest.indexOf('\n}\n', dest.indexOf('function takeHash() {'))) + '\n}';
  const runDest = (hash, { phone = false, saved = {} } = {}) => {
    const out = { stored: { ...saved }, delivered: [], refs: [], address: null, layouts: 0, shown: [] };
    const st = { panel: saved.panel || 'panel:calendar', tab: saved.tab || 'main' };
    const location = { hash: hash ? `#${hash}` : '', pathname: '/calendar', search: '?from=space' };
    const history = { state: null, replaceState: (s, t, u) => { out.address = u; } };
    const parts = [{ key: 'main', mounted: { deliver: (k, v) => out.delivered.push(v.hash) } }, { key: 'panel:calendar' }, { key: 'panel:todo' }];
    const f = new Function('location', 'history', 'parts', 'hashPanel', 'onPhone', 'remember', 'layout', 'show', 'openRef', 'st',
      `let panel = st.panel, tab = st.tab;\n${take}\ntakeHash();\nreturn { panel, tab };`);
    const r = f(location, history, parts, hashPanel, () => phone, (p) => Object.assign(out.stored, p), () => { out.layouts++; },
      (k) => out.shown.push(k), (ref) => out.refs.push(ref), st);
    return { ...out, ...r };
  };
  const wide = runDest('panel=todo', { saved: { panel: 'panel:calendar' } });
  assert.deepEqual([wide.panel, wide.stored.panel, wide.layouts, wide.address, wide.shown], ['panel:todo', 'panel:todo', 1, '/calendar?from=space', []], 'wide: the To-do panel, remembered, the hash taken out (the query kept)');
  const phone = runDest('panel=todo', { phone: true, saved: { tab: 'main' } });
  assert.deepEqual([phone.tab, phone.stored.tab, phone.shown], ['panel:todo', 'panel:todo', []], 'phone: the To-do tab, remembered; not the main part');
  const unknown = runDest('panel=nope', { saved: { panel: 'panel:calendar' } });
  assert.deepEqual([unknown.panel, unknown.stored, unknown.layouts, unknown.delivered], ['panel:calendar', { panel: 'panel:calendar' }, 0, []], 'unknown: ignored, never handed to the main part');
  const withDay = runDest('panel=todo&day=2026-10-02');
  assert.deepEqual([withDay.panel, withDay.delivered], ['panel:todo', ['day=2026-10-02']], 'with a day: both');
  assert.deepEqual(runDest('day=2026-10-02').delivered, ['day=2026-10-02'], 'a day alone, as before');
  assert.deepEqual(runDest(`ref=${encodeURIComponent(JSON.stringify(own))}`).refs, [own], 'a pointer alone, as before');
  assert.match(dest, /takeHash\(\);\n\s*window\.addEventListener\('hashchange', takeHash\);/, 'on load and on hashchange');
});

test('destinations: none listed (the option off, the Calendar off or unreadable, a guest) means no entry; a malformed one is left out', () => {
  assert.deepEqual(destinationTools([]), []);
  assert.deepEqual(destinationTools(undefined), []);
  const bad = [{ id: 'Cal', name: 'x', href: '/x' }, { id: 'calendar', name: '', href: '/calendar' }, { id: 'calendar', name: 'C', href: 'https://elsewhere.example/calendar' }, { id: 'calendar', name: 'C', href: '/calendar?x=1' }];
  assert.deepEqual(destinationTools(bad), []);
  assert.equal(destinationTools([{ id: 'calendar', name: 'Calendar', icon: '<b>', href: '/calendar' }])[0].bar.icon, 'puzzle-piece');
});
test('destinations: on a phone the entry is in the menu after the Spaces slot\'s entries, before New <space>', () => {
  const [d] = destinationTools([{ id: 'calendar', name: 'Calendar', icon: 'calendar-days', href: '/calendar' }]);
  const tools = [
    { id: 'menu-environment', zone: 'right', group: 'menu-where', groupOrder: 1, order: 1, seq: 1 },
    { id: 'menu-home', zone: 'right', group: 'menu-where', order: 2, seq: 2 },
    { id: 'menu-new-space', zone: 'right', group: 'menu-new', groupOrder: 2, order: 1, seq: 3 },
    { ...d.bar, seq: 4 },
    { ...d.menu, seq: 5 },
    { id: 'menu-space-a', zone: 'right', group: 'menu-where', order: 3, seq: 6 },
    { id: 'menu-space-b', zone: 'right', group: 'menu-where', order: 4, seq: 7 },
  ];
  const byZone = { left: tools.filter((t) => t.zone === 'left'), right: tools.filter((t) => t.zone === 'right') };
  const z = phoneZones(byZone);
  // The left-zone entry is hidden on a phone (brand.js: visible only wider), so the menu's own entry is the one read.
  const menu = z.right.flatMap((run) => arrange(run).flatMap((g) => g.map((t) => t.id))).filter((id) => id !== 'dest-calendar');
  assert.deepEqual(menu, ['menu-environment', 'menu-home', 'menu-space-a', 'menu-space-b', 'menu-dest-calendar', 'menu-new-space']);
});
test('the top bar is two zones: no middle centred from 1001px, the phone\'s place for the bell not drawn wider, the entries icons only from 641 to 820px', () => {
  const css = fs.readFileSync(path.join(ROOT, 'public/style.css'), 'utf8');
  assert.ok(!/min-width: 1001px/.test(css), 'no 1001px rule centring a middle zone');
  assert.ok(!/\.topbar:has\(> \.nav-middle/.test(css), 'nothing reads what the middle holds');
  assert.match(css, /\n\.topbar \{[^}]*grid-template-columns: minmax\(0, 1fr\) auto;/, 'the left zone takes what the right does not');
  assert.match(css, /@media \(min-width: 641px\) \{\s*\.topbar > \.nav-middle \{\s*display: none;/, '#core-nav is the phone\'s place only');
  assert.match(css, /@media \(min-width: 641px\) and \(max-width: 820px\) \{\s*\.topbar > \.nav-left > \.core-link\[data-destination\] \.core-label \{\s*display: none;/, 'from 641 to 820px the entries in the left zone are their icons only');
  assert.ok(!/\.nav-middle \.core-link/.test(css), 'no rule for entries in a middle zone');
  assert.match(css, /\.topbar > \.nav-left > \.core-link\[data-destination\] \{\s*flex: none;/, 'the destinations never shrink');
  assert.match(css, /\.topbar \.crumb span,\s*\.topbar \.core-link \.core-label \{\s*font-size: inherit;/, 'their names keep their own size in the branding\'s zone');
  assert.match(fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8'), /el\.title = tool\.label;/, 'and keep their name as the tooltip');
  const navSrc = fs.readFileSync(path.join(ROOT, 'public/nav-bar.js'), 'utf8');
  assert.match(navSrc, /const lookOf = \(t\) => \(t\.bar === 'primary' && t\.zone === 'left' \? 'core'/, 'the core links\' look in the top bar\'s left zone');
  const html = fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
  assert.match(html, /<div class="nav-middle core-nav" id="core-nav"><\/div>/, '#core-nav kept, for the bell on a phone');
});

// The top bar holds places, not a breadcrumb (plan-two-zone-nav.md, decisions 7 and 10): only the space page adds
// segments; every other page names itself in its page bar, and on a phone in the anchor, as a plain label.
test('the anchor: nothing wider than a phone, the page\'s name as a plain label on one; only space.js sets segments', () => {
  assert.equal(pageAnchor({ phone: false, name: 'Calendar', icon: 'calendar-days' }), null, 'wider: nothing (the entry is current, or the page bar names it)');
  assert.deepEqual(pageAnchor({ phone: true, name: ' Calendar ', icon: 'calendar-days' }), { label: 'Calendar', icon: 'calendar-days', title: 'Calendar', current: 'page' });
  assert.equal(pageAnchor({ phone: true, name: '' }), null, 'no name yet: nothing');
  const read = (f) => fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');
  for (const f of ['destination.js', 'admin.js', 'profile.js', 'space-settings.js', 'ai-config.js', 'module-config.js', 'module.js', 'module-settings-page.js', 'host.js']) {
    const src = read(f);
    assert.ok(!/crumbLink\(/.test(src), `${f} calls no crumbLink()`);
    assert.ok(!/setTopbarLocation\(/.test(src), `${f} sets no segment`);
    assert.ok(!/renderTopbar\(\{[^}]*location: [^'}]/.test(src), `${f} passes renderTopbar() no location`);
  }
  assert.match(read('space.js'), /setTopbarLocation\(segs\.map/, 'the space page keeps its breadcrumb');
  const brand = read('brand.js');
  assert.ok(!/export function crumbLink/.test(brand), 'crumbLink() is gone with its last caller');
  const paint = brand.slice(brand.indexOf('function paintPageAnchor('), brand.indexOf('\n}\n', brand.indexOf('function paintPageAnchor(')));
  assert.match(paint, /pageAnchor\(\{ phone: onPhone\(\), name, icon \}\)/);
  assert.ok(!/crumb-sep|<a /.test(paint), 'no separator, not a link');
  assert.match(paint, /setAttribute\('aria-current', a\.current\)/);
  const bar = brand.slice(brand.indexOf('export function renderPageBar('), brand.indexOf('function paintPageAnchor('));
  assert.match(bar, /phoneQuery\.addEventListener\('change', paint\)/, 'painted again as the window crosses 640px');
  const css = fs.readFileSync(path.join(ROOT, 'public/style.css'), 'utf8');
  assert.match(css, /\.topbar \.crumb \[aria-current="location"\],\s*\.topbar \.crumb \[aria-current="page"\] \{/, 'the label reads as the current place');
});

test('the page bar: one shared builder, its name first, a Manage link for owners and the admin, the page\'s tabs inside it', () => {
  const read = (f) => fs.readFileSync(path.join(ROOT, 'public', f), 'utf8');
  const brand = read('brand.js');
  const bar = brand.slice(brand.indexOf('export function renderPageBar('), brand.indexOf('function paintPageAnchor('));
  assert.ok(bar.length > 0, 'brand.js exports renderPageBar()');
  assert.match(bar, /el\.className = `subnav page-bar\$\{/, 'a .subnav.page-bar row');
  assert.match(bar, /nav\.attach\('secondary', el\)/, 'attached as the secondary bar, so it folds as the space bar does');
  assert.match(bar, /'<div class="nav-left"><\/div><span class="nav-right"><\/span>'/, 'two zones');
  assert.match(bar, /id: 'page-bar-name', bar: 'secondary', zone: 'left'[^\n]*visible: \(\) => !onPhone\(\) && Boolean\(state\.name\)/, 'the name in the left zone, not on a phone (the anchor has it)');
  assert.match(bar, /id: 'page-bar-manage', bar: 'secondary', zone: 'left', group: 'page-manage', groupOrder: 1[^\n]*visible: \(\) => seesUpdates\(account\?\.role\)/, 'the Manage link first, owners and the admin only');
  assert.match(bar, /href: keepingQuery\(manage\)/, 'keeping ?from=space');
  assert.match(bar, /zone: 'left', group: 'page', order: 2 \+ i, fold: false, element: c/, 'the page\'s controls after the name, never folding');
  assert.match(brand, /nav\.draw\(\); \/\/ both bars/, 'the Manage link appears once the role is known');
  // Each page in the plan's table.
  assert.match(read('admin.js'), /renderPageBar\(\{ name: 'Manage', icon: 'gear', controls: \[\$\('subtabs'\)\] \}\)/);
  assert.match(read('profile.js'), /renderPageBar\(\{ name: editingKey \? '' : 'Profile', icon: 'user', manage: editingKey \? '\/admin#users' : '', controls: \[\$\('subtabs'\)\] \}\)/);
  assert.match(read('profile.js'), /if \(editingKey\) renderPageBar\(\{ name: user\.displayName/);
  assert.match(read('space-settings.js'), /renderPageBar\(\{ manage: '\/admin#spaces', controls: \[\$\('subtabs'\)\] \}\)/);
  assert.match(read('space-settings.js'), /renderPageBar\(\{ name: space\.name, icon: spaceCrumbIcon\(space\) \}\)/);
  assert.match(read('ai-config.js'), /renderPageBar\(\{ name: 'AI configuration'[^\n]*manage: '\/admin#modules' \}\)/);
  assert.match(read('module-config.js'), /renderPageBar\(\{ manage: '\/admin#modules' \}\)/);
  assert.match(read('module-settings-page.js'), /renderPageBar\(\{ name: \$\('title'\)\.textContent/);
  assert.match(read('module.js'), /if \(!popout\) renderPageBar\(\{ name: mod\.name, icon: mod\.icon \}\)/);
  assert.match(read('module.js'), /if \(!popout\) renderPageBar\(\{ name: title \|\| mod\.name, icon: mod\.icon \}\)/);
  const dest = read('destination.js');
  assert.match(dest, /renderPageBar\(\{ name: d\.name, icon: d\.icon, showName: false, id: 'dest-bar', className: 'dest-bar' \}\)/, 'Calendar and Map: the shared bar, no name (their entry is current)');
  assert.ok(!/bar\.className = 'subnav dest-bar'/.test(dest), 'no copy of the bar in destination.js');
  assert.ok(!/renderPageBar/.test(read('host.js')), 'the host console has no page bar');
  // The tabs keep their ids; the page bar's look.
  for (const f of ['admin.html', 'profile.html', 'space-settings.html']) assert.match(read(f), /<nav class="subtabs" id="subtabs">/, `${f} keeps #subtabs`);
  const css = read('style.css');
  assert.match(css, /\.subnav\.page-bar \.nav-left > \.subtabs \{\s*flex: 0 1 auto;\s*min-width: 0;/, 'the tabs give way inside the bar and scroll sideways');
  assert.match(css, /\.page-bar \.subtab\[hidden\] \{\s*display: none;/, 'a hidden tab stays hidden (space settings\' Modules)');
  assert.match(css, /@media \(max-width: 640px\) \{\s*\.topbar > \.page-bar:not\(:has\(/, 'on a phone a bar with nothing to show is not drawn');
});

test('the top bar\'s colour areas: the branding and the right zone, with defaults that look as before, by child selectors', () => {
  const css = fs.readFileSync(path.join(ROOT, 'public/style.css'), 'utf8');
  const root = css.slice(css.indexOf(':root {'), css.indexOf('\n}\n', css.indexOf(':root {')));
  assert.match(root, /--nav-primary-edge-bg: color-mix\(in srgb, var\(--header-bg\) 97%, black\);/, 'the shade, opaque');
  assert.match(root, /--nav-brand-bg: var\(--nav-primary-edge-bg\);/);
  assert.match(root, /--nav-brand-text: var\(--header-text\);/);
  assert.match(root, /--nav-right-bg: var\(--nav-primary-edge-bg\);/);
  assert.match(root, /--nav-right-text: var\(--header-text\);/);
  assert.match(css, /\n\.topbar > \.nav-left > \.brand-home \{\s*--header-text: var\(--nav-brand-text\);[^}]*background: var\(--nav-brand-bg\);/, 'the branding area, its text through --header-text');
  assert.match(css, /@media \(min-width: 641px\) \{\s*\.topbar > \.nav-right \{\s*--header-text: var\(--nav-right-text\);\s*color: var\(--header-text\);\s*background: var\(--nav-right-bg\);/, 'the right zone, wider than a phone');
  assert.ok(!/\.topbar \.nav-left,\s*\.topbar \.nav-right \{[^}]*background/.test(css), 'no descendant rule paints the zones (it reached the space bar)');
  assert.ok(!/(^|\n)\.page-bar[^{]*\.nav-(left|right)[^{]*\{[^}]*background/.test(css), 'a page bar is one colour');
  assert.match(css, /\.theme-preview-header > \.theme-preview-brand,\s*\.theme-preview-header > span:last-child \{/, 'Manage > Theme\'s sample header shows the two areas');
});

test('destinations: brand.js registers them from GET /api/destinations, wider only and phone only, and opens them over a space while present', () => {
  const brand = fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
  const load = brand.slice(brand.indexOf('async function loadDestinations('), brand.indexOf('\n}\n', brand.indexOf('function markDestinations(')));
  assert.match(load, /fetch\('\/api\/destinations'\)/);
  assert.match(load, /destinationTools\(list/);
  assert.match(load, /\[\[inBar, wide\], \[menu, inMenuOnly\]\]/);
  assert.match(load, /setAttribute\('aria-current', 'page'\)/);
  assert.match(load, /toggleAttribute\('data-overlay-link', over\)/);
  assert.match(load, /const over = Boolean\(presentSpaceNow\(\)\) && !overCall\(\);/);
  assert.match(brand, /presentSpace = id \|\| null;\n  markDestinations\(\);/, 'entering or leaving a space marks them again');
  assert.match(brand, /loadDestinations\(\{ wide: \(\) => wide\(\) && signedIn\(\), inMenuOnly \}\);/);
  assert.match(load, /for \(const id of destinationIds\) nav\.unregister\(id\);/, 'asked again, the old entries go first');
  assert.match(brand, /export function refreshDestinations\(\)/, 'Manage can ask again');
  assert.match(fs.readFileSync(path.join(ROOT, 'public/admin.js'), 'utf8'), /refreshDestinations\(\); \/\/ the bar's entry comes or goes/, 'Manage asks again after a Top bar switch');
  assert.match(load, /window\.location\.pathname\.toLowerCase\(\)/, '/CALENDAR is current too');
  // A guest's bar and the host console return before the menu's entries are registered, so they have no entry.
  const sys = brand.slice(brand.indexOf('function registerSystemTools('), brand.indexOf('loadDestinations({'));
  assert.match(sys, /if \(guest \|\| hostConsole\) return;/);
});

console.log(`check-nav: OK (${n} tests)`);
