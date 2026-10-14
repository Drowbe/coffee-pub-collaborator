#!/usr/bin/env node
/*
 * check-canvas.mjs -- keep the canvas's grid honest.
 *
 * A space's canvas is a grid of module columns (content over an action bar), and the layout rules are in
 * documentation/architecture/architecture-canvas.md. This fails when the stylesheet drifts back
 * to the measured, absolute-positioned layout it replaced, or when something other than the shared
 * token sets a module header height. It also runs the snap grid's arithmetic (public/snap-grid.js: a change of grid size re-settles
 * snapped modules without overlap) and what a space opens with on entering (public/opens-with.js, the order
 * in documentation/plans/plan-entering.md, "What opens on entering"), which canvas.js's restore() asks.
 *
 *   node tools/check-canvas.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = ['public/style.css', 'public/space.js', 'public/space.html'];
const problems = [];
const fail = (file, detail) => problems.push(`${file}: ${detail}`);

// Values that used to be measured or subtracted by hand. The bar row sizes itself now.
const BANNED = [
  [/--barh\b/, 'the measured bar height (--barh); the bottom row of the grid sizes itself'],
  [/--floatbar-h\b/, 'the measured toolbar height (--floatbar-h); anchor to the bar, do not measure it'],
  [/calc\(\s*100%\s*-\s*var\(--chat-w/, 'subtracting the chat width by hand; the chat is its own grid column'],
];

for (const rel of files) {
  const text = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  for (const [re, what] of BANNED) if (re.test(text)) fail(rel, `uses ${what}`);
}

// One token sets the module header height, and only module headers read it.
const css = fs.readFileSync(path.join(ROOT, 'public/style.css'), 'utf8');
const defs = css.match(/--module-header-h\s*:/g) || [];
if (defs.length !== 1) fail('public/style.css', `--module-header-h must be defined exactly once (found ${defs.length})`);

// A rule for a module header (anything named like .mod-header, or a chat header) must take its height from the token.
for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
  const selector = m[1].trim();
  if (!/(\.mod-header|\.chat\s+header)\b/.test(selector)) continue;
  const body = m[2];
  for (const decl of body.split(';')) {
    const hm = decl.match(/^\s*(min-|max-)?height\s*:\s*(.+)$/);
    if (hm && !/var\(--module-header-h\)/.test(hm[2])) {
      fail('public/style.css', `${selector} sets a header height of ${hm[2].trim()}; use var(--module-header-h)`);
    }
  }
}

// What opens on entering. The page's file is plain ES module syntax under a .js name, imported from a .mjs copy as
// check-nav.mjs does.
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-check-'));
  const copy = path.join(tmp, 'opens-with.mjs');
  fs.copyFileSync(path.join(ROOT, 'public/opens-with.js'), copy);
  const { whatOpens, conferenceAllowed, opensWithSummary, shouldAutoJoin, firstVisitLayout, SYSTEM_TABS } = await import(pathToFileURL(copy).href);
  fs.rmSync(tmp, { recursive: true, force: true });
  // GitHub #199: entering joins the call by itself only with the environment's setting on, out of the call, where Join
  // the call would show, not in an aside, and not for a person who left the call since they entered.
  const joinBase = { setting: true, inCall: false, canJoin: true, aside: false, left: false };
  for (const [name, input, want] of [
    ['the setting on, out of the call, may join: joins', joinBase, true],
    ['the setting off: as today, no join', { ...joinBase, setting: false }, false],
    ['the setting absent: no join', { inCall: false, canJoin: true }, false],
    ['the setting not a boolean true: no join', { ...joinBase, setting: 'true' }, false],
    ['already in the call: no join', { ...joinBase, inCall: true }, false],
    ['may not join (no permission, the conference off, a guest without it): no join', { ...joinBase, canJoin: false }, false],
    ['an aside: left as it is', { ...joinBase, aside: true }, false],
    ['left the call since entering: stays out', { ...joinBase, left: true }, false],
    ['nothing given: no join', undefined, false],
  ]) {
    if (shouldAutoJoin(input) !== want) fail('public/opens-with.js', `shouldAutoJoin, ${name}: got ${shouldAutoJoin(input)}, want ${want}`);
  }
  const everyone = () => true;
  const noConference = (id) => id !== 'conference';
  const cases = [
    ['nothing set: the chat and every module on here, without the conference',
      { modules: ['todo', 'notes'], canOpen: everyone }, ['chat', 'todo', 'notes']],
    ['nothing set, a guest: the conference and the chat',
      { modules: ['todo'], canOpen: everyone, guest: true }, ['conference', 'chat']],
    ['nothing set, a guest without the conference: the chat',
      { modules: ['todo'], canOpen: noConference, guest: true }, ['chat']],
    ['the remembered layout wins after a first visit',
      { remembered: ['todo', 'conference'], own: ['chat'], environment: ['notes'], modules: ['todo', 'notes'] }, ['todo', 'conference']],
    ['a remembered empty layout stays empty',
      { remembered: [], own: ['chat'], modules: ['todo'] }, []],
    ['a guest has no remembered layout: the space\'s own list',
      { remembered: ['todo'], own: ['notes', 'chat'], modules: ['todo', 'notes'], guest: true }, ['notes', 'chat']],
    ['the space\'s own list before the environment\'s, less what may not be opened, in its order',
      { own: ['notes', 'conference', 'gone', 'chat'], environment: ['todo'], modules: ['notes'], canOpen: (id) => id !== 'gone' }, ['notes', 'conference', 'chat']],
    ['the environment\'s list for a space with none of its own',
      { environment: ['todo', 'chat'], modules: ['todo', 'notes'] }, ['todo', 'chat']],
    ['a guest with the environment\'s list',
      { environment: ['todo', 'chat'], modules: ['todo'], guest: true }, ['todo', 'chat']],
    ['a list set with nothing that may be opened leaves the canvas empty',
      { own: ['gone'], environment: ['chat'], canOpen: (id) => id !== 'gone' }, []],
    ['a repeat opens once',
      { own: ['chat', 'chat', 'todo'] }, ['chat', 'todo']],
    // The always-on column (plan-one-bar.md, step 6): asked with `column`, the conference and the chat are left out of
    // what goes on the canvas, whichever list names them; the lists themselves keep them (a phone's tabs).
    ['the column: the remembered layout without the conference and the chat',
      { remembered: ['todo', 'conference', 'chat'], modules: ['todo'], column: true }, ['todo']],
    ['the column: the space\'s own list without them',
      { own: ['chat', 'notes', 'conference'], modules: ['notes'], column: true }, ['notes']],
    ['the column: nothing set gives the modules alone',
      { modules: ['todo', 'notes'], column: true }, ['todo', 'notes']],
    ['the column, a guest: nothing on the canvas',
      { modules: ['todo'], guest: true, column: true }, []],
    ['without the column (a phone) the lists hold them as before',
      { remembered: ['todo', 'conference', 'chat'], modules: ['todo'] }, ['todo', 'conference', 'chat']],
    // The composite (plan-calendar-todo.md, step 3; public/composites.js): a stored `calendar` or `todo` reads as
    // `dest:calendar` while the Calendar is on in the space, once, where the first is named; the list is not rewritten.
    ['the composite: a remembered list naming calendar and todo opens the composite once, in the first\'s place',
      { remembered: ['todo', 'notes', 'calendar'], modules: ['calendar', 'todo', 'notes'], aliases: { calendar: 'dest:calendar', todo: 'dest:calendar' } }, ['dest:calendar', 'notes']],
    ['the composite: the space\'s own list naming todo opens it, when it may open here',
      { own: ['todo', 'chat'], modules: ['calendar', 'todo'], canOpen: (id) => id !== 'todo', aliases: { calendar: 'dest:calendar', todo: 'dest:calendar' }, column: true }, ['dest:calendar']],
    ['the composite off (the Calendar off here): a remembered dest:calendar opens the To-do\'s own list',
      { remembered: ['dest:calendar', 'notes'], modules: ['todo', 'notes'], aliases: { 'dest:calendar': ['todo'] } }, ['todo', 'notes']],
    ['the composite off, the To-do off too: a remembered dest:calendar opens nothing',
      { remembered: ['dest:calendar', 'notes'], modules: ['notes'], aliases: { 'dest:calendar': [] } }, ['notes']],
    ['nothing set with the composite: the chat, the composite in the Calendar\'s place, the rest',
      { modules: ['calendar', 'todo', 'notes'], aliases: { calendar: 'dest:calendar', todo: 'dest:calendar' } }, ['chat', 'dest:calendar', 'notes']],
  ];
  for (const [name, input, want] of cases) {
    try {
      assert.deepEqual(whatOpens(input), want);
    } catch {
      fail('public/opens-with.js', `${name}: got ${JSON.stringify(whatOpens(input))}, want ${JSON.stringify(want)}`);
    }
  }
  // The conference switched off in the environment refuses the conference to everyone, an owner (whose permission
  // says yes) included, so a list naming it opens without it.
  const ownerCanOpen = (conferenceEnabled) => (id) => id !== 'conference' || conferenceAllowed({ conferenceEnabled, permitted: true });
  const checks = [
    ['the conference switched off: refused for an owner', conferenceAllowed({ conferenceEnabled: false, permitted: true }), false],
    ['the conference switched on: an owner may open it', conferenceAllowed({ conferenceEnabled: true, permitted: true }), true],
    ['the conference switched on: refused without the permission', conferenceAllowed({ conferenceEnabled: true, permitted: false }), false],
    ['a list with the conference, switched off, for an owner', whatOpens({ own: ['conference', 'chat'], canOpen: ownerCanOpen(false) }), ['chat']],
    ['a list with the conference, switched on, for an owner', whatOpens({ own: ['conference', 'chat'], canOpen: ownerCanOpen(true) }), ['conference', 'chat']],
    // Space settings' sentence comes from the stored list, not the ticks on screen.
    ['a stored list with nothing that can open: nothing opens, and no module is named',
      opensWithSummary({ list: ['gone'], environment: ['chat'], modules: ['todo'], canOpen: (id) => id !== 'gone', nameOf: (id) => ({ chat: 'Chat', todo: 'To-do' })[id] || id }),
      'None of the ones switched on can open now, so nothing opens.'],
    ['a stored list that opens something: nothing to add', opensWithSummary({ list: ['gone', 'todo'], modules: ['todo'], canOpen: (id) => id !== 'gone' }), ''],
    ['nothing stored: what opens instead, by name',
      opensWithSummary({ list: null, modules: ['todo', 'polls'], nameOf: (id) => ({ chat: 'Chat', todo: 'To-do', polls: 'Polls' })[id] }),
      'Nothing switched on: Chat, To-do and Polls open.'],
    ['nothing stored, the environment\'s list: its names',
      opensWithSummary({ list: null, environment: ['todo'], modules: ['todo', 'polls'], nameOf: (id) => ({ todo: 'To-do' })[id] }),
      'Nothing switched on: To-do opens.'],
  ];
  for (const [name, got, want] of checks) {
    try {
      assert.deepEqual(got, want);
    } catch {
      fail('public/opens-with.js', `${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
    }
  }
  // The first visit's layout (plan-layout-views.md, step 5): the server's resolved firstVisit.layout on entering, for a
  // first visit (or a guest); a remembered arrangement wins after; a guest has no Calendar or Map tab. Opens with sits
  // beside a layout (no layout needs a list, a list never stops a layout), and whatOpens still answers the list.
  const fv = (layout, opensWith = null) => ({ layout, opensWith });
  const firstCases = [
    ['nothing resolved: the Workspace', firstVisitLayout({}), 'workspace'],
    ['an old answer with no firstVisit: the Workspace', firstVisitLayout({ firstVisit: null }), 'workspace'],
    ['the Workspace with a list', firstVisitLayout({ firstVisit: fv('workspace', ['chat', 'todo']) }), 'workspace'],
    ['Calendar on a first visit', firstVisitLayout({ firstVisit: fv('calendar') }), 'calendar'],
    ['Map on a first visit, a list beside it', firstVisitLayout({ firstVisit: fv('map', ['notes']) }), 'map'],
    ['a shared layout with no Opens with set: it opens all the same', firstVisitLayout({ firstVisit: fv('labc123') }), 'labc123'],
    ['a shared layout with Opens with set too (an old space with both)', firstVisitLayout({ firstVisit: fv('labc123', ['todo']) }), 'labc123'],
    ['remembered: the Workspace as remembered, whatever the first visit says', firstVisitLayout({ firstVisit: fv('calendar'), remembered: ['todo'] }), 'workspace'],
    ['remembered empty is still remembered', firstVisitLayout({ firstVisit: fv('labc123'), remembered: [] }), 'workspace'],
    ['not entering (the Workspace tab pressed): the Workspace', firstVisitLayout({ firstVisit: fv('map'), entering: false }), 'workspace'],
    ['a guest: a shared layout every time', firstVisitLayout({ firstVisit: fv('labc123'), remembered: ['todo'], guest: true }), 'labc123'],
    ['a guest: no Calendar tab', firstVisitLayout({ firstVisit: fv('calendar'), guest: true }), 'workspace'],
    ['the tabs a first visit may open', [...SYSTEM_TABS], ['calendar', 'map']],
    ['Opens with beside a layout is still the Workspace\'s list', whatOpens({ own: ['chat', 'todo'], modules: ['todo'] }), ['chat', 'todo']],
  ];
  for (const [name, got, want] of firstCases) {
    try {
      assert.deepEqual(got, want);
    } catch {
      fail('public/opens-with.js', `firstVisitLayout, ${name}: got ${JSON.stringify(got)}, want ${JSON.stringify(want)}`);
    }
  }
  const emptySentence = opensWithSummary({ list: ['gone'], modules: ['todo'], canOpen: (id) => id !== 'gone', nameOf: () => 'To-do' });
  if (/To-do|Chat/.test(emptySentence)) fail('public/opens-with.js', `a list with nothing openable must not name what would open without it (got "${emptySentence}")`);
  const spaceJs = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  if (!/allowed: \(\) => conferenceAllowed\(\{ conferenceEnabled: features\.conferenceEnabled/.test(spaceJs)) fail('public/space.js', 'the conference module\'s allowed() must follow the environment\'s switch (conferenceAllowed), for owners too');
  const settingsJs = fs.readFileSync(path.join(ROOT, 'public/space-setup.js'), 'utf8');
  if (!/opensWithSummary\(\{\s*list: state\.draft\.opensWith/.test(settingsJs)) fail('public/space-setup.js', 'the Opens with sentence must come from the list being edited (opensWithSummary with list: state.draft.opensWith)');
  const canvasJs = fs.readFileSync(path.join(ROOT, 'public/canvas.js'), 'utf8');
  const restore = canvasJs.slice(canvasJs.indexOf('function restore()'), canvasJs.indexOf('// --- the toolbar button'));
  if (!/whatOpens\(\{[^}]*guest: Boolean\(guestToken\)/s.test(restore)) fail('public/canvas.js', 'restore() must ask whatOpens (opens-with.js) for what to open, with whether this is a guest');
  if (/opened\.has\('conference'\)\) view = 'conference'/.test(restore)) fail('public/canvas.js', 'restore() must start a phone on the first module opened, not always the call');
  // The always-on column (plan-one-bar.md, step 6): wider than a phone restore() opens the conference and the chat in
  // the column, whatever the lists say, and asks whatOpens with `column` so neither goes on the canvas.
  if (!/if \(columnMode\(\)\) for \(const id of builtins\.keys\(\)\) if \(canOpenHere\(id\)\) api_openBuiltin\(id\);/.test(restore)) fail('public/canvas.js', 'restore() opens the conference and the chat in the side column (column mode) before anything else');
  if (!/whatOpens\(\{[^}]*column: columnMode\(\)/s.test(restore)) fail('public/canvas.js', 'restore() must ask whatOpens with column: columnMode()');
  // The first visit's layout (plan-layout-views.md, step 5): restore() asks firstVisitLayout, and no longer asks for Opens
  // with to be set before a layout opens; a phone opens Calendar's or Map's composite first.
  if (!/firstVisitLayout\(\{ firstVisit: spaceFirstVisit, remembered: saved\.__open, guest: Boolean\(guestToken\), entering: enteringNow \}\)/.test(restore)) fail('public/canvas.js', 'restore() must ask firstVisitLayout (opens-with.js) for the first visit\'s layout');
  if (/spaceDefaultLayout && Array\.isArray\(spaceOpensWith\)/.test(restore)) fail('public/canvas.js', 'a layout as the first visit must not need Opens with to be set');
  if (!/const lead = tab && isNarrow\(\) \? readAliased\(\[tab === 'map' \? 'maps' : 'calendar'\], aliases\)/.test(restore)) fail('public/canvas.js', 'on a phone, Calendar or Map as the first visit opens its composite first');
  if (!/const builtinList = columnMode\(\) \? \[\] :/.test(canvasJs)) fail('public/canvas.js', 'the Show list leaves the conference and the chat out in column mode');
  const html = fs.readFileSync(path.join(ROOT, 'public/space.html'), 'utf8');
  for (const id of ['side-column', 'side-column-toggle', 'side-column-strip', 'side-column-chat', 'side-column-rail', 'work']) if (!html.includes(`id="${id}"`)) fail('public/space.html', `the always-on column needs #${id}`);
  if (!/<div class="work" id="work">\s*<aside class="side-column" id="side-column"[\s\S]*<main class="canvas" id="canvas" hidden>/.test(html)) fail('public/space.html', '#side-column sits before #canvas inside #work');
  if (!/aria-expanded="true"/.test(html.slice(html.indexOf('id="side-column-toggle"') - 200, html.indexOf('id="side-column-toggle"') + 200))) fail('public/space.html', 'the column\'s handle is a button that says whether the column is open (aria-expanded)');
}

// The snap grid's size (public/snap-grid.js; canvas.js's setSnapPitch): shrinking the grid re-settles snapped modules into the
// cells nearest the boxes they were put in, none on another where there is room, never below a module's smallest size, and
// growing it back gives back about the old boxes.
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-check-'));
  const copy = path.join(tmp, 'snap-grid.mjs');
  fs.copyFileSync(path.join(ROOT, 'public/snap-grid.js'), copy);
  const { MIN_W, MIN_H, gridFor, cellBox, snapCell, cellsOverlap, leastSpan, tileFresh, resettle } = await import(pathToFileURL(copy).href);
  fs.rmSync(tmp, { recursive: true, force: true });
  const rect = { left: 0, top: 60, width: 1280, height: 640 };
  const at = (pitch) => gridFor(rect, pitch);
  const rel = (g, b) => ({ x: b.x - g.x, y: b.y - g.y, w: b.w, h: b.h });
  const abs = (g, b) => ({ x: g.x + b.x, y: g.y + b.y, w: b.w, h: b.h });
  const noOverlap = (cells) => { const list = [...cells.values()]; return list.every((a, i) => list.every((b, j) => i === j || !cellsOverlap(a, b))); };
  // Two modules side by side at 130, as the snap-all tiling leaves To-do and Polls.
  const g130 = at(130);
  const start = new Map([['todo', { col: 0, row: 0, cols: 2, rows: 2 }], ['polls', { col: 2, row: 0, cols: 2, rows: 2 }]]);
  const placed = [...start].map(([id, c]) => ({ id, box: rel(g130, cellBox(g130, c)) }));
  const settle = (pitch) => resettle(at(pitch), placed.map((p) => ({ id: p.id, box: abs(at(pitch), p.box) })));
  for (let pitch = 120; pitch >= 50; pitch -= 10) {
    const g = at(pitch);
    const cells = settle(pitch);
    if (!noOverlap(cells)) fail('public/snap-grid.js', `two modules side by side overlap at a grid size of ${pitch}: ${JSON.stringify([...cells])}`);
    for (const [id, c] of cells) {
      const b = cellBox(g, c);
      if (b.w < MIN_W || b.h < MIN_H) fail('public/snap-grid.js', `${id} is below its smallest size at ${pitch}: ${Math.round(b.w)}x${Math.round(b.h)}`);
    }
  }
  const back = settle(130);
  for (const [id, c] of back) {
    if (JSON.stringify(c) !== JSON.stringify(start.get(id))) fail('public/snap-grid.js', `${id} did not come back to its cells at 130 after 50: ${JSON.stringify(c)}`);
  }
  // Every size along the way keeps each box near the one it was put in (within a cell), not its count of cells.
  for (const pitch of [100, 70, 50, 200, 320]) {
    const g = at(pitch);
    for (const [id, c] of settle(pitch)) {
      const want = abs(g, placed.find((p) => p.id === id).box);
      const got = cellBox(g, c);
      const tol = Math.max(g.cw, g.ch);
      const fits = Math.abs(got.x - want.x) <= tol && Math.abs(got.y - want.y) <= tol
        && got.w >= want.w - tol && got.w <= Math.max(want.w, MIN_W + g.cw) + tol
        && got.h >= want.h - tol && got.h <= Math.max(want.h, MIN_H + g.ch) + tol;
      if (!fits) fail('public/snap-grid.js', `${id} at ${pitch} strays from its box: ${JSON.stringify(got)} for ${JSON.stringify(want)}`);
    }
  }
  // Two boxes that fill the canvas side by side: rounding to whole cells at a finer grid makes them a cell too wide
  // together, so one gives up a cell rather than sitting on the other (a 1400x428 canvas, as a space with the call above it).
  {
    const wide = { left: 0, top: 472, width: 1400, height: 428 };
    const two = [{ id: 'todo', box: { x: 8, y: 480, w: 684, h: 412 } }, { id: 'polls', box: { x: 708, y: 480, w: 684, h: 412 } }];
    for (let pitch = 50; pitch <= 320; pitch += 10) {
      const got = resettle(gridFor(wide, pitch), two);
      if (!noOverlap(got)) fail('public/snap-grid.js', `two modules filling the canvas side by side overlap at ${pitch}: ${JSON.stringify([...got])}`);
    }
  }
  // From the real snap-all tiling (tileFresh) at 130, every grid size from 50 to 320: none overlap wherever the smallest
  // sizes fit (as many as whole runs of the smallest size fit across times down), and every module keeps its smallest size.
  const fitsAtLeast = (g, n) => { const l = leastSpan(g); return n <= Math.floor(g.cols / l.cols) * Math.floor(g.rows / l.rows); };
  for (const [n, width, height] of [[4, 1400, 409.5], [6, 1400, 409.5], [8, 1280, 664], [5, 1024, 700], [2, 1400, 409.5], [3, 1400, 409.5]]) {
    const r = { left: 0, top: 50, width, height };
    const g0 = gridFor(r, 130);
    const tiled = tileFresh(g0, n, []).map((c, i) => ({ id: `m${i}`, box: rel(g0, cellBox(g0, c)) }));
    for (let pitch = 50; pitch <= 320; pitch += 10) {
      const g = gridFor(r, pitch);
      const got = resettle(g, tiled.map((t) => ({ id: t.id, box: abs(g, t.box) })));
      if (got.size !== n) fail('public/snap-grid.js', `${n} on ${width}x${height} at ${pitch}: ${got.size} placed`);
      if (fitsAtLeast(g, n) && !noOverlap(got)) fail('public/snap-grid.js', `${n} tiled on ${width}x${height} overlap at ${pitch} though their smallest sizes fit: ${JSON.stringify([...got.values()])}`);
      for (const c of got.values()) {
        const b = cellBox(g, c);
        if (b.w < MIN_W - 0.5 || b.h < MIN_H - 0.5) fail('public/snap-grid.js', `${n} on ${width}x${height} at ${pitch}: a module below its smallest size (${Math.round(b.w)}x${Math.round(b.h)})`);
      }
    }
    const back = resettle(g0, tiled.map((t) => ({ id: t.id, box: abs(g0, t.box) })));
    tileFresh(g0, n, []).forEach((c, i) => {
      if (JSON.stringify(back.get(`m${i}`)) !== JSON.stringify(c)) fail('public/snap-grid.js', `${n} on ${width}x${height}: m${i} did not come back to its tiled cells at 130 (${JSON.stringify(back.get(`m${i}`))})`);
    });
  }
  // Two equal boxes side by side stay equal (within a cell) at every size, rather than one rounding up and the other giving way.
  for (let pitch = 50; pitch <= 320; pitch += 10) {
    const wide = { left: 0, top: 472, width: 1400, height: 428 };
    const g = gridFor(wide, pitch);
    const got = [...resettle(g, [{ id: 'a', box: { x: 8, y: 480, w: 684, h: 412 } }, { id: 'b', box: { x: 708, y: 480, w: 684, h: 412 } }]).values()];
    if (Math.abs(got[0].cols - got[1].cols) > 1) fail('public/snap-grid.js', `two equal boxes at ${pitch} come out ${got[0].cols} and ${got[1].cols} cells wide`);
  }
  // Time: the slider re-settles on every step, so this must take a frame at most. Worst cases at the finest grid.
  const timed = (label, rect, boxes, budget) => {
    const g = gridFor(rect, 50);
    const t0 = performance.now();
    for (let i = 0; i < 5; i += 1) resettle(g, boxes);
    const ms = (performance.now() - t0) / 5;
    if (ms > budget) fail('public/snap-grid.js', `${label}: resettle took ${ms.toFixed(1)} ms at a grid size of 50 (budget ${budget} ms)`);
  };
  const full = (n, w, h) => Array.from({ length: n }, (_, i) => ({ id: `f${i}`, box: { x: 8, y: 8, w: w - 16, h: h - 16 } }));
  timed('2 maximised on 1920x1000', { left: 0, top: 0, width: 1920, height: 1000 }, full(2, 1920, 1000), 16);
  timed('4 maximised on 1920x1000', { left: 0, top: 0, width: 1920, height: 1000 }, full(4, 1920, 1000), 16);
  timed('8 maximised on 1920x1000', { left: 0, top: 0, width: 1920, height: 1000 }, full(8, 1920, 1000), 33);
  timed('12 maximised on 2560x1400', { left: 0, top: 0, width: 2560, height: 1400 }, full(12, 2560, 1400), 33);
  // A small box on a coarse grid still gets a module's smallest size.
  const tiny = snapCell(at(50), { x: 0, y: 60, w: 40, h: 30 });
  const tb = cellBox(at(50), tiny);
  if (tb.w < MIN_W || tb.h < MIN_H) fail('public/snap-grid.js', `a small box snaps below the smallest size: ${Math.round(tb.w)}x${Math.round(tb.h)}`);
  // More modules than the canvas holds: every one still gets cells (sharing, by design), none lost.
  const crowd = Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, box: { x: 0, y: 60, w: 600, h: 400 } }));
  const crowded = resettle(at(130), crowd);
  if (crowded.size !== 12) fail('public/snap-grid.js', `a crowded canvas lost modules: ${crowded.size} of 12 placed`);
  // canvas.js re-settles through resettle, from the kept `placed` box, and does not overwrite it while it does.
  const canvasJs = fs.readFileSync(path.join(ROOT, 'public/canvas.js'), 'utf8');
  const pitchFn = canvasJs.slice(canvasJs.indexOf('function setSnapPitch('), canvasJs.indexOf('// Drag a floating module by'));
  if (!/resettle\(/.test(pitchFn) || !/keepPlaced: true/.test(pitchFn)) fail('public/canvas.js', 'setSnapPitch must re-settle snapped modules with resettle (snap-grid.js) from their placed box, keeping it');
  if (!/holdStore = true/.test(pitchFn) || !/if \(!preview\) persist\(\)/.test(pitchFn)) fail('public/canvas.js', 'setSnapPitch must store the layout once, when the slider is let go, not on every preview step');
}

// Clean up with the grid off (public/snap-grid.js's tidyBoxes; canvas.js's cleanUp, plan-layout-menu.md): floating modules
// moved fully onto the canvas and apart, a box that fits keeping its size, a box clear of the others not moved, boxes the
// grid holds (taken) kept clear of, and many boxes on a small canvas all still inside it, every one placed.
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-check-'));
  const copy = path.join(tmp, 'snap-grid.mjs');
  fs.copyFileSync(path.join(ROOT, 'public/snap-grid.js'), copy);
  const { MIN_W, MIN_H, TIDY_GAP, tidyBoxes, tidyCells, gridFor, cellBox, resettle, cellsOverlap, leastSpan } = await import(pathToFileURL(copy).href);
  fs.rmSync(tmp, { recursive: true, force: true });
  const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;
  const inside = (b, A) => b.x >= A.x && b.y >= A.y && b.x + b.w <= A.x + A.w && b.y + b.h <= A.y + A.h;
  const check = (label, boxes, area, { taken = [], apart = true } = {}) => {
    const got = tidyBoxes(boxes, area, taken);
    if (got.size !== boxes.length) fail('public/snap-grid.js', `${label}: ${got.size} of ${boxes.length} placed`);
    const list = [...got.values()];
    for (const [id, b] of got) {
      if (!inside(b, area)) fail('public/snap-grid.js', `${label}: ${id} is off the canvas: ${JSON.stringify(b)}`);
      if (b.w < Math.min(MIN_W, area.w) || b.h < Math.min(MIN_H, area.h)) fail('public/snap-grid.js', `${label}: ${id} is below its smallest size: ${b.w}x${b.h}`);
    }
    if (apart) {
      list.forEach((a, i) => list.forEach((b, j) => { if (i < j && overlap(a, b)) fail('public/snap-grid.js', `${label}: two modules overlap: ${JSON.stringify([a, b])}`); }));
      for (const t of taken) for (const b of list) if (overlap(b, t)) fail('public/snap-grid.js', `${label}: a module sits on a snapped one: ${JSON.stringify([b, t])}`);
    }
    return got;
  };
  const area = { x: 8, y: 68, w: 1264, h: 624 }; // a 1280x640 canvas under the header, less the margin
  // Four stacked on one spot, one half off the right edge, one above the top: all fit, so each keeps its size.
  const stacked = [
    { id: 'a', box: { x: 100, y: 100, w: 400, h: 300 } },
    { id: 'b', box: { x: 110, y: 110, w: 400, h: 300 } },
    { id: 'c', box: { x: 1100, y: 120, w: 360, h: 260 } },
    { id: 'd', box: { x: 300, y: -200, w: 320, h: 240 } },
  ];
  const tidied = check('four stacked and off the canvas', stacked, area);
  for (const { id, box } of stacked) {
    const b = tidied.get(id);
    if (b.w !== box.w || b.h !== box.h) fail('public/snap-grid.js', `four stacked: ${id} lost its size though it fits (${b.w}x${b.h} for ${box.w}x${box.h})`);
  }
  if (JSON.stringify(tidied.get('a')) !== JSON.stringify(stacked[0].box)) fail('public/snap-grid.js', `the first module, on the canvas and clear, moved: ${JSON.stringify(tidied.get('a'))}`);
  // Two already apart and on the canvas stay where they are.
  const apart = [{ id: 'x', box: { x: 20, y: 80, w: 500, h: 400 } }, { id: 'y', box: { x: 600, y: 80, w: 500, h: 400 } }];
  const kept = check('two already apart', apart, area);
  for (const { id, box } of apart) if (JSON.stringify(kept.get(id)) !== JSON.stringify(box)) fail('public/snap-grid.js', `two already apart: ${id} moved to ${JSON.stringify(kept.get(id))}`);
  // Bigger than the canvas: brought down to it.
  check('one bigger than the canvas', [{ id: 'big', box: { x: -50, y: 0, w: 3000, h: 2000 } }], area);
  // Three as big as the canvas: they cannot all keep their size, so they are made smaller and set apart.
  check('three canvas-sized', [0, 1, 2].map((i) => ({ id: `f${i}`, box: { x: area.x, y: area.y, w: area.w, h: area.h } })), area);
  // Kept clear of what the grid holds: a snapped module in the middle.
  const g = gridFor({ left: 0, top: 60, width: 1280, height: 640 }, 130);
  const snapped = [...resettle(g, [{ id: 's', box: { x: 400, y: 200, w: 400, h: 300 } }]).values()].map((c) => cellBox(g, c));
  check('around a snapped module', stacked, area, { taken: snapped });
  // Many on a small canvas, more than fit even at the smallest size: every one placed, every one still on the canvas.
  const small = { x: 8, y: 8, w: 684, h: 400 };
  check('twelve on a small canvas', Array.from({ length: 12 }, (_, i) => ({ id: `m${i}`, box: { x: 900 + i * 10, y: -100, w: 500, h: 400 } })), small, { apart: false });
  // As many as fit at the smallest size: apart.
  check('four smallest on a small canvas', Array.from({ length: 4 }, (_, i) => ({ id: `n${i}`, box: { x: 0, y: 0, w: 600, h: 380 } })), small);
  // Snap off and on alike: every size from a phone-wide canvas to a wide one, six modules piled up, all on it and apart.
  for (const [w, h] of [[700, 500], [900, 640], [1280, 640], [1920, 1000]]) {
    const A = { x: 8, y: 8, w: w - 16, h: h - 16 };
    check(`six piled on ${w}x${h}`, Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, box: { x: 40 + i * 5, y: 40, w: 420, h: 320 } })), A, { apart: 6 <= Math.floor(A.w / (MIN_W + TIDY_GAP)) * Math.floor(A.h / (MIN_H + TIDY_GAP)) });
  }
  // Clean up with the grid on (tidyCells; QA's repro): a small Chat and three modules a third of the grid wide and its full
  // height, two dragged onto the third. Where the grid holds all of them (12 columns) every one keeps its cells;
  // where it has not (9 and 6 columns), the ones with a place keep theirs and only the rest are made smaller. Never all shrunk
  // because one could not fit, and a second Clean up changes nothing.
  for (const [width, allFit, mustKeep] of [[1600, true, []], [1280, false, ['chat', 'todo']], [900, false, ['chat']]]) {
    const gg = gridFor({ left: 0, top: 77, width, height: 683 }, 130);
    const items = [
      { id: 'chat', cell: { col: 0, row: 0, cols: 2, rows: 3 } },
      { id: 'todo', cell: { col: 4, row: 0, cols: 3, rows: 6 } },
      { id: 'polls', cell: { col: 4, row: 0, cols: 3, rows: 6 } },
      { id: 'calendar', cell: { col: 4, row: 0, cols: 3, rows: 6 } },
    ];
    const got = tidyCells(gg, items);
    const list = [...got.values()];
    const label = `Clean up, snapped, ${gg.cols} columns`;
    if (got.size !== items.length) fail('public/snap-grid.js', `${label}: ${got.size} of ${items.length} placed`);
    list.forEach((a, i) => list.forEach((b, j) => { if (i < j && cellsOverlap(a, b)) fail('public/snap-grid.js', `${label}: two modules overlap: ${JSON.stringify([...got])}`); }));
    const kept = items.filter(({ id, cell }) => got.get(id)?.cols === cell.cols && got.get(id)?.rows === cell.rows).map(({ id }) => id);
    if (allFit && kept.length !== items.length) fail('public/snap-grid.js', `${label}: every module fits at its size, but only ${kept.join(', ') || 'none'} kept it: ${JSON.stringify([...got])}`);
    if (mustKeep.some((id) => !kept.includes(id))) fail('public/snap-grid.js', `${label}: ${mustKeep.join(' and ')} have a place and must keep their size: ${JSON.stringify([...got])}`);
    if (!allFit && kept.length === 0) fail('public/snap-grid.js', `${label}: every module was made smaller`);
    const l = leastSpan(gg);
    for (const [id, c] of got) if (c.cols < l.cols || c.rows < l.rows) fail('public/snap-grid.js', `${label}: ${id} below its smallest size`);
    const again = tidyCells(gg, [...got].map(([id, cell]) => ({ id, cell })));
    if (JSON.stringify([...again]) !== JSON.stringify([...got])) fail('public/snap-grid.js', `${label}: a second Clean up moved something: ${JSON.stringify([...again])}`);
  }
  // canvas.js runs cleanUp() in Window Mode (Thomas, 2026-10-13): floating modules only, in this window, every one
  // tiled to fill the Workspace by fillBoxes (whole cells with the grid on), remembered as a drag is.
  const canvasJs = fs.readFileSync(path.join(ROOT, 'public/canvas.js'), 'utf8');
  const clean = canvasJs.slice(canvasJs.indexOf('  function cleanUp() {'), canvasJs.indexOf('  // The grid\'s size, from the space bar\'s slider'));
  if (!/floaterOf\(p\) && floaterOf\(p\)\.ownerDocument === doc/.test(clean)) fail('public/canvas.js', 'cleanUp() must take only the floating modules in the canvas\'s window');
  if (!/fillBoxes\(mods\.map\(\(p\) => \(\{ id: p\.id, box: cellOf\(p\) \}\)\), \{ x: 0, y: 0, w: g\.cols, h: g\.rows \}, \{ least: \{ w: least\.cols, h: least\.rows \}, integer: true \}\)/.test(clean)) fail('public/canvas.js', 'cleanUp() with the grid on must fill the grid in whole cells (fillBoxes, integer, the least span)');
  if (!/fillBoxes\(mods\.map\(\(p\) => \(\{ id: p\.id, box: currentBox\(floaterOf\(p\)\) \}\)\), \{ x: g\.x, y: g\.y, w: g\.w, h: g\.h \}, \{ least: \{ w: MIN_W \+ TIDY_GAP, h: MIN_H \+ TIDY_GAP \} \}\)/.test(clean)) fail('public/canvas.js', 'cleanUp() with the grid off must fill the whole grid box (fillBoxes over it, each tile at least the smallest size plus the gutter)');
  if (!/remember\(p\.id, \{ layout: 'user' \}\)/.test(clean)) fail('public/canvas.js', 'cleanUp() must remember the places as a drag does');
  if (!/\n    cleanUp,\n/.test(canvasJs)) fail('public/canvas.js', 'the canvas must offer cleanUp()');
}

// Clean up in Window Mode (public/snap-grid.js's fillBoxes; Thomas, 2026-10-13): every floating module tiled to fill
// the whole Workspace, none on another, no gap, none below its least size while the Workspace holds them all, each
// keeping its side (a module left of another stays left of it, one above stays above), a bigger one staying bigger;
// in whole cells with the grid on. Pure, and the same answer for the same input.
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-fill-'));
  const copy = path.join(tmp, 'snap-grid.mjs');
  fs.copyFileSync(path.join(ROOT, 'public/snap-grid.js'), copy);
  const { MIN_W, MIN_H, fillBoxes, gridFor, leastSpan } = await import(pathToFileURL(copy).href);
  fs.rmSync(tmp, { recursive: true, force: true });
  const F = 'public/snap-grid.js';
  const area = { x: 0, y: 44, w: 1000, h: 700 };
  let seed = 11;
  const rnd = () => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed / 2147483648; };
  const overlaps = (a, b) => a.x < b.x + b.w - 0.01 && b.x < a.x + a.w - 0.01 && a.y < b.y + b.h - 0.01 && b.y < a.y + a.h - 0.01;
  const covers = (tiles, A) => Math.abs(tiles.reduce((sum, t) => sum + t.w * t.h, 0) - A.w * A.h) < 0.5
    && tiles.every((t) => t.x >= A.x - 0.01 && t.y >= A.y - 0.01 && t.x + t.w <= A.x + A.w + 0.01 && t.y + t.h <= A.y + A.h + 0.01);
  for (let n = 1; n <= 8; n += 1) {
    for (let round = 0; round < 6; round += 1) {
      const items = Array.from({ length: n }, (_, i) => ({ id: `m${i}`, box: { x: Math.floor(rnd() * 700), y: 44 + Math.floor(rnd() * 400), w: 240 + Math.floor(rnd() * 400), h: 160 + Math.floor(rnd() * 400) } }));
      const got = fillBoxes(items, area);
      const tiles = [...got.values()];
      if (got.size !== n) fail(F, `fillBoxes: ${n} modules, ${got.size} tiles`);
      if (!covers(tiles, area)) fail(F, `fillBoxes: ${n} modules do not fill the 1000x700 workspace: ${JSON.stringify(tiles)}`);
      if (tiles.some((a, i) => tiles.some((b, j) => i !== j && overlaps(a, b)))) fail(F, `fillBoxes: ${n} modules overlap: ${JSON.stringify(tiles)}`);
      for (const [id, t] of got) if (t.w < MIN_W - 0.01 || t.h < MIN_H - 0.01) fail(F, `fillBoxes: ${id} of ${n} is below its least size (${Math.round(t.w)}x${Math.round(t.h)})`);
      if (JSON.stringify([...fillBoxes(items, area)]) !== JSON.stringify([...got])) fail(F, 'fillBoxes must be pure');
    }
  }
  // Sides are kept: two modules side by side stay so, the left one left; one above another stays above. A bigger one
  // stays bigger.
  const pair = fillBoxes([{ id: 'left', box: { x: 10, y: 60, w: 300, h: 300 } }, { id: 'right', box: { x: 600, y: 60, w: 300, h: 300 } }], { x: 0, y: 0, w: 1400, h: 500 });
  if (!(pair.get('left').x < pair.get('right').x && pair.get('left').y === pair.get('right').y)) fail(F, `fillBoxes: two side by side must stay side by side, the left one left: ${JSON.stringify([...pair])}`);
  const stack = fillBoxes([{ id: 'top', box: { x: 10, y: 60, w: 300, h: 200 } }, { id: 'bottom', box: { x: 10, y: 400, w: 300, h: 200 } }], { x: 0, y: 0, w: 600, h: 900 });
  if (!(stack.get('top').y < stack.get('bottom').y && stack.get('top').x === stack.get('bottom').x)) fail(F, `fillBoxes: one above another must stay so: ${JSON.stringify([...stack])}`);
  const sized = fillBoxes([{ id: 'big', box: { x: 0, y: 0, w: 600, h: 500 } }, { id: 'small', box: { x: 700, y: 0, w: 260, h: 200 } }], { x: 0, y: 0, w: 1400, h: 500 });
  if (!(sized.get('big').w > sized.get('small').w)) fail(F, `fillBoxes: the bigger module must stay bigger: ${JSON.stringify([...sized])}`);
  // With the grid on: whole cells, the grid filled, none below the least span (a 1000x700 canvas at 130 holds 9 at 2x2).
  const g = gridFor({ left: 0, top: 44, width: 1000, height: 700 }, 130);
  const least = leastSpan(g);
  for (let n = 1; n <= 8; n += 1) {
    const items = Array.from({ length: n }, (_, i) => ({ id: `m${i}`, box: { x: i % 3, y: Math.floor(i / 3) * 2, w: 2, h: 2 } }));
    const got = fillBoxes(items, { x: 0, y: 0, w: g.cols, h: g.rows }, { least: { w: least.cols, h: least.rows }, integer: true });
    const tiles = [...got.values()];
    if (!tiles.every((t) => [t.x, t.y, t.w, t.h].every(Number.isInteger))) fail(F, `fillBoxes on the grid: ${n} modules must get whole cells: ${JSON.stringify(tiles)}`);
    if (!covers(tiles, { x: 0, y: 0, w: g.cols, h: g.rows })) fail(F, `fillBoxes on the grid: ${n} modules do not fill it: ${JSON.stringify(tiles)}`);
    if (tiles.some((a, i) => tiles.some((b, j) => i !== j && overlaps(a, b)))) fail(F, `fillBoxes on the grid: ${n} modules overlap: ${JSON.stringify(tiles)}`);
    for (const t of tiles) if (t.w < least.cols || t.h < least.rows) fail(F, `fillBoxes on the grid: ${n} modules, one below its least span: ${JSON.stringify(t)}`);
  }
  // Nothing to place; a workspace too small for them all still gives every module a tile inside it.
  if (fillBoxes([], area).size !== 0) fail(F, 'fillBoxes with nothing gives nothing');
  const tight = fillBoxes(Array.from({ length: 4 }, (_, i) => ({ id: `t${i}`, box: { x: i * 10, y: 0, w: 240, h: 160 } })), { x: 0, y: 0, w: 300, h: 200 });
  if (tight.size !== 4 || !covers([...tight.values()], { x: 0, y: 0, w: 300, h: 200 })) fail(F, `fillBoxes: four in a 300x200 workspace still share it: ${JSON.stringify([...tight])}`);
}

// How windows sit in Window Mode (Thomas, 2026-10-13): a tight 4px gap between them, snapped or not, and the same gap at
// the Workspace's edges (the grid sits half a gutter in; a cell's box is inset half a gutter on each side); the window's
// shadow is a hairline, not a drop; a lifted column keeps a modest one; no coloured top edge on a titlebar.
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-gap-'));
  const copy = path.join(tmp, 'snap-grid.mjs');
  fs.copyFileSync(path.join(ROOT, 'public/snap-grid.js'), copy);
  const { SNAP_GAP, TIDY_GAP, gridFor, cellBox, leastSpan } = await import(pathToFileURL(copy).href);
  fs.rmSync(tmp, { recursive: true, force: true });
  const F = 'public/snap-grid.js';
  if (SNAP_GAP !== 4) fail(F, `SNAP_GAP is 4 (got ${SNAP_GAP})`);
  if (TIDY_GAP !== 4) fail(F, `TIDY_GAP is 4 (got ${TIDY_GAP})`);
  const g = gridFor({ left: 2, top: 46, width: 996, height: 696 }, 130); // a 1000x700 canvas at (0, 44), half a gutter in, as canvas.js's snapGrid makes it
  const a = cellBox(g, { col: 0, row: 0, cols: 1, rows: 1 });
  const b = cellBox(g, { col: 1, row: 0, cols: 1, rows: 1 });
  if (Math.abs(b.x - (a.x + a.w) - SNAP_GAP) > 0.01) fail(F, `two cells side by side are a gutter apart (${b.x - (a.x + a.w)})`);
  if (Math.abs(a.x - 0 - SNAP_GAP) > 0.01 || Math.abs(a.y - 44 - SNAP_GAP) > 0.01) fail(F, `the first cell is a gutter from the Workspace's edges (${a.x}, ${a.y - 44})`);
  const all = cellBox(g, { col: 0, row: 0, cols: g.cols, rows: g.rows });
  if (Math.abs(all.x + all.w - (1000 - SNAP_GAP)) > 0.01 || Math.abs(all.y + all.h - (744 - SNAP_GAP)) > 0.01) fail(F, 'a module spanning every cell ends a gutter from the far edges');
  const l = leastSpan(g);
  const least = cellBox(g, { col: 0, row: 0, cols: l.cols, rows: l.rows });
  if (least.w < 240 || least.h < 160) fail(F, `the least span still holds a module's smallest size (${Math.round(least.w)}x${Math.round(least.h)})`);
  const canvasJs = fs.readFileSync(path.join(ROOT, 'public/canvas.js'), 'utf8');
  if (!/win\.innerWidth - SNAP_GAP\)/.test(canvasJs) || !/win\.innerHeight - SNAP_GAP\)/.test(canvasJs)) fail('public/canvas.js', 'clampBox keeps SNAP_GAP clear of the window\'s edges');
  if (!/const half = SNAP_GAP \/ 2;\n\s*return gridFor\(\{ left: s\.left \+ half, top: s\.top \+ half, width: Math\.max\(1, s\.width - SNAP_GAP\), height: Math\.max\(1, s\.height - SNAP_GAP\) \}, snapPitch\(\)\);/.test(canvasJs)) fail('public/canvas.js', 'snapGrid() lays the grid half a gutter in from the canvas\'s edges');
  if ((canvasJs.match(/\{ x: g\.x \+ TIDY_GAP \/ 2, y: g\.y \+ TIDY_GAP \/ 2, w: g\.w - TIDY_GAP, h: g\.h - TIDY_GAP \}/g) || []).length !== 2) fail('public/canvas.js', 'floatAll() and placeWaiting() tidy within half a gutter of the grid (a gutter from the edge)');
  const floating = /\.module-floating \{([^}]*)\}/.exec(css);
  if (!floating || !/box-shadow: 0 1px 3px color-mix\(in srgb, black 18%, transparent\);/.test(floating[1])) fail('public/style.css', 'a floating window\'s shadow is a hairline (0 1px 3px, black at 18%)');
  if (!/\.module-lifted \{[^}]*box-shadow: 0 0 0 2px var\(--accent\), 0 4px 12px color-mix\(in srgb, black 25%, transparent\);/.test(css)) fail('public/style.css', 'a lifted column keeps the accent ring and a modest shadow (0 4px 12px, black at 25%)');
  if (/inset 0 3px 0 var\(--tint\)/.test(css)) fail('public/style.css', 'no 3px tint edge anywhere');
}

// The docked limit (public/snap-grid.js's dockLimit and fitDock; plan-docked-limit.md, GitHub #156): a window holds the
// flexible column at 280 px and fixed columns at 240 px each; the conference and the chat keep their columns and installed
// modules give way from the right; at 640 px and below nothing waits. canvas.js builds its columns from it.
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-check-'));
  const copy = path.join(tmp, 'snap-grid.mjs');
  fs.copyFileSync(path.join(ROOT, 'public/snap-grid.js'), copy);
  const grid = await import(pathToFileURL(copy).href);
  fs.rmSync(tmp, { recursive: true, force: true });
  const { DOCK_MIN, FLEX_MIN, NARROW, dockLimit, fitDock } = grid;
  const F = 'public/snap-grid.js';
  if (DOCK_MIN !== 240 || FLEX_MIN !== 280 || NARROW !== 640) fail(F, `DOCK_MIN, FLEX_MIN and NARROW must be 240, 280 and 640 (are ${DOCK_MIN}, ${FLEX_MIN}, ${NARROW})`);
  for (const [w, n] of [[639, Infinity], [640, Infinity], [641, 2], [760, 3], [1000, 4], [1280, 5], [1600, 6], [1920, 7]]) {
    if (dockLimit(w) !== n) fail(F, `dockLimit(${w}) is ${dockLimit(w)}, not ${n}`);
  }
  const conference = { id: 'conference', width: 600, flex: true, keep: true };
  const chat = { id: 'chat', width: 320, keep: true };
  const mods = (n, width = 360) => Array.from({ length: n }, (_, i) => ({ id: `m${i + 1}`, width }));
  const six = [conference, chat, ...mods(4)];
  const at760 = fitDock(760, six);
  if (JSON.stringify(at760.docked) !== JSON.stringify(['conference', 'chat', 'm1'])) fail(F, `six columns at 760 px must dock the conference, the chat and m1, not ${JSON.stringify(at760.docked)}`);
  if (JSON.stringify(at760.waiting) !== JSON.stringify(['m2', 'm3', 'm4'])) fail(F, `six columns at 760 px must leave m2, m3 and m4 waiting, not ${JSON.stringify(at760.waiting)}`);
  if (fitDock(641, [conference, chat]).waiting.length || fitDock(700, [conference, chat]).waiting.length) fail(F, 'the conference and the chat alone must both dock at 700 px');
  // In any column order and at every width above 640 px, the conference and the chat never wait; the docked ids keep the
  // column order; the fixed widths fit beside the flexible column, none under 240 px; and the waiting ones are the rightmost.
  const orders = [six, [chat, ...mods(4), conference], [...mods(2), chat, ...mods(4).slice(2), conference], [mods(1)[0], chat, conference, ...mods(5).slice(1)]];
  for (const cols of orders) {
    for (const w of [641, ...Array.from({ length: 88 }, (_, i) => 660 + i * 20)]) {
      const label = `${JSON.stringify(cols.map((c) => c.id))} at ${w} px`;
      const got = fitDock(w, cols);
      if (got.waiting.includes('conference') || got.waiting.includes('chat')) fail(F, `${label}: the conference or the chat is waiting`);
      if (got.docked.length !== Math.min(cols.length, dockLimit(w))) fail(F, `${label}: ${got.docked.length} docked, the limit is ${dockLimit(w)}`);
      if (got.docked.length + got.waiting.length !== cols.length) fail(F, `${label}: a column is lost`);
      const ids = cols.map((c) => c.id);
      if (JSON.stringify(got.docked) !== JSON.stringify(ids.filter((id) => got.docked.includes(id)))) fail(F, `${label}: docked is not in column order: ${JSON.stringify(got.docked)}`);
      if (JSON.stringify(got.waiting) !== JSON.stringify(ids.filter((id) => got.waiting.includes(id)))) fail(F, `${label}: waiting is not in column order`);
      const others = ids.filter((id) => id !== 'conference' && id !== 'chat');
      const lastDocked = Math.max(-1, ...got.docked.filter((id) => others.includes(id)).map((id) => others.indexOf(id)));
      if (got.waiting.some((id) => others.indexOf(id) < lastDocked)) fail(F, `${label}: a module waits while one to its right is docked`);
      const sum = [...got.widths.values()].reduce((a, b) => a + b, 0);
      if (sum > w - FLEX_MIN) fail(F, `${label}: the fixed columns take ${sum} px, more than ${w - FLEX_MIN}`);
      for (const [id, px] of got.widths) if (px < DOCK_MIN) fail(F, `${label}: ${id} is ${px} px, under ${DOCK_MIN}`);
      if (got.widths.has('conference')) fail(F, `${label}: the conference is the flexible column and has no fixed width`);
      if (got.widths.size !== got.docked.length - 1) fail(F, `${label}: every docked column but the flexible one needs a width`);
    }
  }
  // At 640 px and below nothing waits (the space bar is the phone tab bar there).
  for (const w of [0, 390, 639, 640]) if (fitDock(w, [...six, ...mods(9)]).waiting.length) fail(F, `nothing may wait at 640 px or below (at ${w})`);
  // With the conference not docked, the first column is the flexible one.
  const noConf = fitDock(760, [mods(1)[0], chat, ...mods(4).slice(1)]);
  if (JSON.stringify(noConf.docked) !== JSON.stringify(['m1', 'chat', 'm2']) || noConf.widths.has('m1')) fail(F, `with no conference the first column must be flexible: ${JSON.stringify(noConf.docked)}, ${JSON.stringify([...noConf.widths])}`);
  // While they fit, every column keeps its own width; a column narrower than 240 px is shown at 240 px.
  const wide = fitDock(1920, [conference, chat, { id: 'm1', width: 400 }, { id: 'm2', width: 200 }]);
  if (wide.widths.get('chat') !== 320 || wide.widths.get('m1') !== 400 || wide.widths.get('m2') !== 240) fail(F, `at 1920 px the columns must keep their widths: ${JSON.stringify([...wide.widths])}`);
  // Pure: the same answer for the same input, and the input is not changed.
  const input = JSON.stringify(six);
  if (JSON.stringify(fitDock(1000, six).docked) !== JSON.stringify(fitDock(1000, six).docked) || JSON.stringify(six) !== input) fail(F, 'fitDock must be pure');
  // canvas.js takes the 240 px floor from here, and builds its columns from fitDock.
  const canvasJs = fs.readFileSync(path.join(ROOT, 'public/canvas.js'), 'utf8');
  if (/const DOCK_MIN\s*=/.test(canvasJs) || !/import \{[^}]*\bDOCK_MIN\b[^}]*\} from '\/snap-grid\.js'/.test(canvasJs)) fail('public/canvas.js', 'DOCK_MIN must come from snap-grid.js');
  if (/Math\.max\(160,/.test(canvasJs) || /- 160\)/.test(canvasJs)) fail('public/canvas.js', 'the 160 px floor is gone; a fixed column keeps at least DOCK_MIN');
  if (!/fitDock\(/.test(canvasJs.slice(canvasJs.indexOf('function syncDock('), canvasJs.indexOf('function settleDock(')))) fail('public/canvas.js', 'syncDock() must build the columns from fitDock()');
  // The note is in the panel (#modules-menu-note, role="status"), and, only while the panel is closed, in a visually
  // hidden status region outside it (#layout-announce), so a dock with the panel closed is heard, and never twice.
  const spaceJs = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const noteFn = spaceJs.slice(spaceJs.indexOf('function layoutNote('), spaceJs.indexOf('// The space\'s canvas: the Modules menu'));
  if (!/id="modules-menu-note" role="status"/.test(spaceJs)) fail('public/space.js', 'the Layout panel needs its note line, #modules-menu-note, role="status"');
  if (!/onNote: \(text\) => layoutNote\(text\)/.test(spaceJs)) fail('public/space.js', 'createCanvas({ onNote }) must go through layoutNote()');
  if (!/layoutAnnouncer\.id = 'layout-announce'/.test(noteFn) || !/setAttribute\('role', 'status'\)/.test(noteFn) || !/className = 'visually-hidden'/.test(noteFn) || !/doc\.body\.appendChild\(layoutAnnouncer\)/.test(noteFn)) fail('public/space.js', 'layoutNote() must announce through a visually hidden role="status" region on the page, outside the panel');
  if (!/textContent = menuOpen \? '' : t/.test(noteFn) || !/setTimeout\(/.test(noteFn)) fail('public/space.js', 'the region outside the panel is for a closed panel only (decided after the click), so nothing is heard twice');
  if (!/\.visually-hidden\s*\{[^}]*clip-path: inset\(50%\)/.test(css)) fail('public/style.css', '.visually-hidden must hide the status region from sight only');
}

// Saved layouts (public/layouts.js; plan-saved-layouts.md, step 2): layoutOf() turns the canvas into a layout (docked
// first in column order, then floating; floating boxes as fractions; the flexible column without a width), and
// placeLayout() puts one on a canvas (fractions back to pixels, at least the smallest size and on the canvas, snapped
// ones on the grid without overlap, what cannot open left out and named). canvas.js's captureLayout() and loadLayout()
// use them, keep the conference while on the call, fit the columns with fitDock() and remember the result.
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-layouts-'));
  fs.copyFileSync(path.join(ROOT, 'public/snap-grid.js'), path.join(tmp, 'snap-grid.mjs'));
  const src = fs.readFileSync(path.join(ROOT, 'public/layouts.js'), 'utf8');
  if (!src.includes("from '/snap-grid.js'")) fail('public/layouts.js', 'must take the grid arithmetic from snap-grid.js');
  fs.writeFileSync(path.join(tmp, 'layouts.mjs'), src.replace("from '/snap-grid.js'", "from './snap-grid.mjs'"));
  const { layoutOf, placeLayout, leftOutNote, LAYOUT_LIMITS } = await import(pathToFileURL(path.join(tmp, 'layouts.mjs')).href);
  const { MIN_W, MIN_H, DOCK_MIN, gridFor, cellsOverlap } = await import(pathToFileURL(path.join(tmp, 'snap-grid.mjs')).href);
  fs.rmSync(tmp, { recursive: true, force: true });
  const F = 'public/layouts.js';
  if (/\bdocument\.\w|\bwindow\.\w|localStorage/.test(src)) fail(F, 'layouts.js must stay pure: no DOM, no storage');
  const area = { x: 0, y: 77, w: 1600, h: 823 };
  const mods = [
    { id: 'calendar', mode: 'float', order: 5, box: { x: 300, y: 200, w: 400, h: 500 }, snap: false },
    { id: 'chat', mode: 'dock', order: 0, width: 320 },
    { id: 'conference', mode: 'dock', order: -1, flex: true, width: 600 },
    { id: 'todo', mode: 'float', order: 3, box: { x: 900, y: 120, w: 300, h: 300 }, snap: true },
    { id: 'polls', mode: 'float', order: 4, box: { x: 1000, y: 150, w: 300, h: 300 }, snap: true },
    { id: 'travel', mode: 'window', was: 'dock', order: 2, width: 420 },
    { id: 'notes', mode: 'dock', order: 6, width: 100 }, // waiting modules come in as dock: the layout is the intent
  ];
  const input = JSON.stringify(mods);
  const layout = layoutOf(mods, area, { all: false, pitch: 130 });
  if (JSON.stringify(mods) !== input) fail(F, 'layoutOf() must not change its input');
  const ids = layout.modules.map((m) => m.id);
  // The conference and the chat are the always-on column's (plan-one-bar.md, step 6): never saved.
  if (JSON.stringify(ids) !== JSON.stringify(['travel', 'notes', 'todo', 'polls', 'calendar'])) fail(F, `layoutOf(): docked first in column order (a window saved as its old mode), then floating in the order opened, without the conference and the chat, not ${JSON.stringify(ids)}`);
  const by = Object.fromEntries(layout.modules.map((m) => [m.id, m]));
  if (by.travel.dockW !== 420 || by.notes.dockW !== LAYOUT_LIMITS.dockWMin) fail(F, `docked widths are pixels, within the server's 160 to 2000: ${JSON.stringify(layout.modules)}`);
  const flexFirst = layoutOf([{ id: 'map', mode: 'dock', order: 1, flex: true, width: 600 }, { id: 'todo', mode: 'dock', order: 2, width: 300 }], area);
  if ('dockW' in flexFirst.modules[0] || flexFirst.modules[1].dockW !== 300) fail(F, 'the flexible column is saved without a width');
  // An older layout (or a phone's) naming the two: accepted, placed nowhere, never "left out".
  const older = placeLayout({ modules: [{ id: 'conference', mode: 'dock' }, { id: 'chat', mode: 'float', box: { x: 0.7, y: 0.1, w: 0.25, h: 0.5 } }, { id: 'todo', mode: 'dock', dockW: 300 }], snap: { all: false, pitch: 130 } }, area);
  if (older.modules.map((m) => m.id).join() !== 'todo' || older.left.length) fail(F, `placeLayout() accepts the conference and the chat in an older layout and leaves them alone: ${JSON.stringify(older)}`);
  for (const m of layout.modules.filter((x) => x.mode === 'float')) {
    if (!m.box || !['x', 'y', 'w', 'h'].every((k) => m.box[k] >= 0 && m.box[k] <= 1) || m.box.w === 0 || m.box.h === 0) fail(F, `${m.id}: a floating box is fractions of the canvas from 0 to 1: ${JSON.stringify(m.box)}`);
    if ('snap' in m) fail(F, `${m.id}: a module's own snap is never saved (the canvas-level switch is the only one)`);
  }
  if (JSON.stringify(layout.snap) !== JSON.stringify({ all: false, pitch: 130 })) fail(F, 'layoutOf() keeps the canvas-level snap');
  if (layoutOf(Array.from({ length: 30 }, (_, i) => ({ id: `m${i}`, mode: 'dock', order: i })), area).modules.length !== LAYOUT_LIMITS.modules) fail(F, `a layout holds at most ${LAYOUT_LIMITS.modules} modules`);
  if (layoutOf([{ id: 'x', mode: 'window', canDock: false }], area).modules[0].mode !== 'float') fail(F, 'a window that cannot dock is saved floating');
  // The same size gives back the same boxes (within a pixel); the free ones exactly where they were.
  const same = placeLayout(layout, area);
  const back = Object.fromEntries(same.modules.map((m) => [m.id, m]));
  const near = (a, b) => ['x', 'y', 'w', 'h'].every((k) => Math.abs(a[k] - b[k]) <= 1);
  if (!near(back.calendar.box, mods[0].box)) fail(F, `placeLayout() at the same size must give back the same box: ${JSON.stringify(back.calendar.box)}`);
  if (back.travel.dockW !== 420 || back.notes.dockW !== DOCK_MIN) fail(F, 'placeLayout() keeps the docked widths, clamped as clampDock() does');
  if (same.left.length) fail(F, 'nothing is left out when everything may open');
  // An older layout with a module's own `snap` and the canvas-level switch off: read without error, nothing snaps.
  const olderSnap = { ...layout, modules: layout.modules.map((m) => (m.mode === 'float' ? { ...m, snap: m.id !== 'calendar' } : m)) };
  if (placeLayout(olderSnap, area).modules.some((m) => m.snap || m.cell)) fail(F, 'a module\'s own stored snap is ignored: with the canvas-level snap off nothing snaps');
  // At half the width (and a smaller window), every box is on the canvas and at least the smallest size, and with the
  // canvas-level snap on the floating ones sit in grid cells, none on another.
  for (const small of [{ x: 0, y: 77, w: 800, h: 600 }, { x: 0, y: 60, w: 1000, h: 700 }, { x: 0, y: 77, w: 1920, h: 923 }]) {
    const got = placeLayout({ ...olderSnap, snap: { all: true, pitch: 130 } }, small);
    const label = `at ${small.w}x${small.h}`;
    for (const m of got.modules.filter((x) => x.box)) {
      const b = m.box;
      if (b.x < small.x || b.y < small.y || b.x + b.w > small.x + small.w + 1 || b.y + b.h > small.y + small.h + 1) fail(F, `${label}: ${m.id} is off the canvas: ${JSON.stringify(b)}`);
      if (!m.cell && (b.w < MIN_W || b.h < MIN_H)) fail(F, `${label}: ${m.id} is under the smallest size: ${JSON.stringify(b)}`);
    }
    const snapped = got.modules.filter((m) => m.snap);
    if (snapped.length !== 3 || snapped.some((m) => !m.cell)) fail(F, `${label}: the snapped modules get grid cells`);
    else snapped.forEach((a, i) => snapped.forEach((b, j) => { if (i < j && cellsOverlap(a.cell, b.cell)) fail(F, `${label}: snapped modules overlap: ${JSON.stringify(snapped.map((m) => m.cell))}`); }));
    const g = gridFor({ left: small.x, top: small.y, width: small.w, height: small.h }, 130);
    for (const m of snapped) if (m.cell && (m.cell.col + m.cell.cols > g.cols || m.cell.row + m.cell.rows > g.rows)) fail(F, `${label}: ${m.id} is off the grid`);
    for (const m of got.modules.filter((x) => x.dockW)) if (m.dockW < DOCK_MIN || m.dockW > Math.max(DOCK_MIN, Math.round(small.w * 0.6))) fail(F, `${label}: ${m.id}'s width ${m.dockW} is not clamped as clampDock() does`);
  }
  // The canvas-level snap snaps every floating module.
  if (!placeLayout({ ...layout, snap: { all: true, pitch: 200 } }, area).modules.filter((m) => m.mode === 'float').every((m) => m.snap && m.cell)) fail(F, 'with the canvas-level snap on, every floating module settles on the grid');
  // What cannot open is left out and named, in order; the layout itself is not changed.
  const before = JSON.stringify(layout);
  const some = placeLayout(layout, area, (id) => !['travel', 'calendar'].includes(id));
  if (JSON.stringify(some.left) !== JSON.stringify(['travel', 'calendar'])) fail(F, `the ids left out, in order: ${JSON.stringify(some.left)}`);
  if (some.modules.some((m) => ['travel', 'calendar'].includes(m.id))) fail(F, 'a module that cannot open is not placed');
  if (JSON.stringify(layout) !== before) fail(F, 'placeLayout() must not change the layout');
  if (leftOutNote(['maps'], () => 'Map') !== "Map isn't on in this space, so it was left out.") fail(F, `the one line for one left out: ${leftOutNote(['maps'], () => 'Map')}`);
  if (leftOutNote(['a', 'b', 'c'], (id) => id.toUpperCase(), 'trip') !== "A, B and C aren't on in this trip, so they were left out.") fail(F, 'the one line for several, in the space word');
  if (leftOutNote([]) !== '') fail(F, 'no line when nothing was left out');
  // canvas.js: captureLayout() through layoutOf(); loadLayout() (not applyLayout, space.js's) through placeLayout() and
  // canOpenHere(), keeping the conference while on the call, fitting the columns (syncDock, fitDock), remembering the result.
  const canvasJs = fs.readFileSync(path.join(ROOT, 'public/canvas.js'), 'utf8');
  const C = 'public/canvas.js';
  const capture = canvasJs.slice(canvasJs.indexOf('  function captureLayout() {'), canvasJs.indexOf('  function loadLayout('));
  const load = canvasJs.slice(canvasJs.indexOf('  function loadLayout('), canvasJs.indexOf('  const nameOfLayout'));
  if (!capture || !/layoutOf\(mods, canvasArea\(\), \{ all: snapAllOn\(\), pitch: snapPitch\(\) \}\)/.test(capture)) fail(C, 'captureLayout() must build the layout with layoutOf(), with the canvas-level snap');
  if (!/p\.waiting \? 'dock'/.test(capture)) fail(C, 'captureLayout() saves a module waiting for a column as docked');
  if (!/placeLayout\(layout, area, canOpenHere, aliases\)/.test(load)) fail(C, 'loadLayout() must place the layout with placeLayout(), canOpenHere() and the composites\' aliases');
  if (!/id: compositeOf\(p\.m\) \? compositeOf\(p\.m\)\.main : p\.id/.test(capture)) fail(C, 'captureLayout() saves a composite under its main module\'s id (the server\'s layout store takes module ids only)');
  if (!/aliases,/.test(canvasJs.slice(canvasJs.indexOf('  function restore() {'), canvasJs.indexOf('  // --- saved layouts')))) fail(C, 'restore() must ask whatOpens with the composites\' aliases');
  if (!/p\.id === 'conference' && p\.kind === 'builtin' && Boolean\(p\.def\?\.inCall\?\.\(\)\)/.test(load) || !/p\.kind !== 'builtin' && !named\.has\(p\.id\) && !keepCall\(p\)\) closeModule\(p\.id\)/.test(load)) fail(C, 'loadLayout() closes what the layout does not name, never the conference or the chat (the column\'s; plan-one-bar.md step 6)');
  if (!/syncDock\(\)/.test(load) || !/snapshot\(\)/.test(load)) fail(C, 'loadLayout() fits the columns (syncDock, fitDock) and becomes the remembered layout (snapshot)');
  if (!/leftOutNote\(plan\.left/.test(load)) fail(C, 'loadLayout() says in one line what it left out');
  if (/function applyLayout\(/.test(canvasJs)) fail(C, 'applyLayout is space.js\'s window-width handler; the canvas\'s load is loadLayout()');
  if (!/\n    captureLayout,\n    loadLayout,\n/.test(canvasJs)) fail(C, 'the canvas must offer captureLayout() and loadLayout()');
}

// Composites on the Workspace (public/composites.js; plan-calendar-todo.md step 3, reused by plan-map-places.md step 3):
// one module, `dest:calendar`, in the Calendar's place while the Calendar is on in a space, the To-do's own surface left
// out there; a stored `calendar` or `todo` reads as the composite and is never written back; where the Calendar is off,
// a stored `dest:calendar` reads as the To-do alone, so nobody loses their list. The Map (`dest:map`) the same, in
// Maps' place, Places left out, while the space's Map is shown (Maps on there and a map file).
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-check-'));
  const copy = path.join(tmp, 'composites.mjs');
  fs.copyFileSync(path.join(ROOT, 'public/composites.js'), copy);
  const { COMPOSITES, compositesOn, compositesToAsk, aliasesFor, readAs, composeList, isCompositeId } = await import(pathToFileURL(copy).href);
  fs.rmSync(tmp, { recursive: true, force: true });
  const F = 'public/composites.js';
  const src = fs.readFileSync(path.join(ROOT, F), 'utf8');
  if (/\bimport\b|\bdocument\.\w|\bwindow\.\w|localStorage/.test(src)) fail(F, 'composites.js must stay pure: no imports, no DOM, no storage');
  const cal = COMPOSITES.find((c) => c.id === 'dest:calendar');
  if (!cal || cal.main !== 'calendar' || cal.path !== '/calendar' || [...cal.parts].join() !== 'calendar,todo') fail(F, 'dest:calendar holds /calendar, its main the Calendar, its parts the Calendar and the To-do');
  if (!isCompositeId('dest:calendar') || isCompositeId('calendar')) fail(F, 'a composite id starts with dest:');
  assert.deepEqual(compositesOn(['todo', 'notes']).map((c) => c.id), [], 'the composite is off where the Calendar is off, whatever the To-do does');
  assert.deepEqual(compositesOn(['calendar']).map((c) => c.id), ['dest:calendar'], 'the composite is on where the Calendar is on, the To-do off or not');
  assert.deepEqual(aliasesFor(['calendar', 'todo']), { calendar: 'dest:calendar', todo: 'dest:calendar', 'dest:map': [] }, 'on: both parts read as the composite');
  assert.deepEqual(aliasesFor(['todo']), { 'dest:calendar': ['todo'], 'dest:map': [] }, 'off: the composite reads as the parts on');
  assert.deepEqual(aliasesFor([]), { 'dest:calendar': [], 'dest:map': [] }, 'off, nothing on: the composite reads as nothing');
  // The Map (plan-map-places.md step 3): the same table row, `dest:map` for `/map`, its main Maps, its parts Maps and
  // Places; Maps on in the space is not enough, the page asks the destination for the space first (a map file,
  // server/destinations.js `needsFile`) and the composite is on only where it answered (`shown`). Refused, Maps and
  // Places keep their own surfaces and a stored `dest:map` reads as whichever of them is on.
  const map = COMPOSITES.find((c) => c.id === 'dest:map');
  if (!map || map.main !== 'maps' || map.path !== '/map' || map.dest !== 'map' || [...map.parts].join() !== 'maps,places' || map.ask !== true) fail(F, 'dest:map holds /map, its main Maps, its parts Maps and Places, and asks the destination first');
  assert.deepEqual(compositesToAsk(['maps', 'places', 'calendar']).map((c) => c.id), ['dest:map'], 'compositesToAsk: the Map, while Maps is on; never the Calendar');
  assert.deepEqual(compositesToAsk(['places']).map((c) => c.id), [], 'nothing to ask with Maps off');
  assert.deepEqual(compositesOn(['maps', 'places']).map((c) => c.id), [], 'the Map is off where the destination was not asked or refused (no map file)');
  assert.deepEqual(compositesOn(['maps', 'places'], ['map']).map((c) => c.id), ['dest:map'], 'and on where it answered for the space');
  assert.deepEqual(compositesOn(['places'], ['map']).map((c) => c.id), [], 'never with Maps off, whatever answered');
  assert.deepEqual(compositesOn(['calendar', 'maps'], ['map']).map((c) => c.id), ['dest:calendar', 'dest:map'], 'both on together');
  assert.deepEqual(aliasesFor(['maps', 'places'], ['map']), { 'dest:calendar': [], maps: 'dest:map', places: 'dest:map' }, 'the Map on: Maps and Places read as it');
  assert.deepEqual(aliasesFor(['maps', 'places']), { 'dest:calendar': [], 'dest:map': ['maps', 'places'] }, 'the Map off (no map file): a stored dest:map reads as Maps and Places as they are');
  assert.deepEqual(readAs(Object.freeze(['places', 'travel', 'maps']), aliasesFor(['maps', 'places', 'travel'], ['map'])), ['dest:map', 'travel'], 'a stored list naming places and maps reads as one Map, where the first is named');
  assert.deepEqual(readAs(['dest:map', 'travel'], aliasesFor(['maps', 'places', 'travel'])), ['maps', 'places', 'travel'], 'a stored dest:map reads as Maps and Places where there is no map file');
  const mapList = [{ id: 'travel', name: 'Planner', icon: 'route' }, { id: 'places', name: 'Places', icon: 'location-dot' }, { id: 'maps', name: 'Maps', icon: 'map-location-dot', color: 'pink', version: '0.9.0', scope: ['environment', 'space'] }];
  const mapShown = composeList(mapList, ['map']);
  assert.deepEqual(mapShown.map((m) => m.id), ['travel', 'dest:map'], 'the Show list: one Map in Maps\' place, Places left out');
  if (mapShown[1].name !== 'Maps' || mapShown[1].icon !== 'map-location-dot' || mapShown[1].color !== 'pink' || mapShown[1].composite?.path !== '/map') fail(F, 'the Map composite reads as Maps: its name, icon and colour, its page /map');
  assert.deepEqual(composeList(mapList).map((m) => m.id), ['travel', 'places', 'maps'], 'with no map file the Show list keeps Maps and Places as they are');
  const stored = Object.freeze(['todo', 'chat', 'calendar', 'notes']);
  assert.deepEqual(readAs(stored, aliasesFor(['calendar', 'todo', 'notes'])), ['dest:calendar', 'chat', 'notes'], 'a stored list reads with the composite once, in the first part\'s place');
  assert.deepEqual([...stored], ['todo', 'chat', 'calendar', 'notes'], 'and is never written back');
  assert.deepEqual(readAs(['dest:calendar', 'notes'], aliasesFor(['todo', 'notes'])), ['todo', 'notes'], 'a stored composite reads as the To-do where the Calendar is off');
  const list = [{ id: 'notes', name: 'Notes', icon: 'note' }, { id: 'todo', name: 'To-do', icon: 'check', color: 'green' }, { id: 'calendar', name: 'Calendar', icon: 'calendar', color: 'red', version: '1.25.0', scope: ['space'] }];
  const shown = composeList(list);
  assert.deepEqual(shown.map((m) => m.id), ['notes', 'dest:calendar'], 'the Show list: the composite in the Calendar\'s place, the To-do left out');
  const c = shown[1];
  if (c.name !== 'Calendar' || c.icon !== 'calendar' || c.color !== 'red' || !c.composite || c.composite.id !== 'dest:calendar') fail(F, 'the composite reads as the Calendar: its name, icon and colour');
  if (!c.canvas || c.canvas.entry !== null || !c.canvas.mode.includes('dock') || !c.canvas.mode.includes('float')) fail(F, 'the composite docks and floats, and has no module entry of its own');
  assert.deepEqual(composeList([list[0], list[1]]).map((m) => m.id), ['notes', 'todo'], 'with the Calendar off the To-do keeps its own surface');
  // The pop-out of a part goes to the destination's page for the space (public/module.js); the canvas builds the
  // composite's frame from the same table and never writes `calendar` or `todo` into a remembered list.
  const moduleJs = fs.readFileSync(path.join(ROOT, 'public/module.js'), 'utf8');
  if (!/compositesOn\(ids, shown\)\.find\(\(c\) => c\.parts\.includes\(id\)\)/.test(moduleJs) || !/location\.replace\(`\$\{composite\.path\}\?\$\{q\}\$\{location\.hash\}`\)/.test(moduleJs)) fail('public/module.js', 'a part\'s pop-out (/modules/calendar?space=, /modules/todo?space=, /modules/maps?space=, /modules/places?space=) goes to the destination\'s page for the space, the hash kept');
  // The Map's pop-out asks the destination for the space first (a 404 keeps the part's own page), as the canvas does.
  if (!/for \(const c of compositesToAsk\(ids\)\)/.test(moduleJs) || !/await api\('GET', `\/api\/destinations\/\$\{encodeURIComponent\(c\.dest\)\}\?\$\{q\}`\); shown\.push\(c\.dest\);/.test(moduleJs)) fail('public/module.js', 'a part of a composite that asks (Maps, Places) redirects only where GET /api/destinations/map?space= answers');
  const canvasJs = fs.readFileSync(path.join(ROOT, 'public/canvas.js'), 'utf8');
  if (!/available = composeList\(modules, shown\)/.test(canvasJs) || !/aliases = aliasesFor\(modules\.map\(\(m\) => m\.id\), shown\)/.test(canvasJs)) fail('public/canvas.js', 'refresh() composes the Show list and the aliases from composites.js, with the destinations that answered');
  if (!/const shown = await askDestinations\(id, modules\);/.test(canvasJs) || !/compositesToAsk\(list\.map\(\(m\) => m\.id\)\)/.test(canvasJs) || !/await api\('GET', `\/api\/destinations\/\$\{encodeURIComponent\(c\.dest\)\}\?\$\{q\}`\);/.test(canvasJs)) fail('public/canvas.js', 'refresh() asks GET /api/destinations/<dest>?space= for each composite that asks (the Map) before composing');
  if (!/if \(spaceId !== id\) return; \/\/ another space was entered/.test(canvasJs)) fail('public/canvas.js', 'refresh() drops its answer when another space was entered meanwhile');
  if (!/list: \(\) => modules\.slice\(\)/.test(canvasJs)) fail('public/canvas.js', 'list() stays the server\'s modules (Chat reads commands by module id)');
  // A drag from a module on the Workspace over the composite's frame is relayed into the page inside (module-host.js),
  // same origin only, from the parent window only; the canvas registers each composite's frame and lets it go on close.
  const hostJs = fs.readFileSync(path.join(ROOT, 'public/module-host.js'), 'utf8');
  if (!/export function registerDragRelay\(frame\)/.test(hostJs) || !/postMessage\(\{ type: 'app:objectdrag', drag \}, location\.origin\)/.test(hostJs)) fail('public/module-host.js', 'a drag over a composite frame is relayed into it as app:objectdrag, same origin');
  if (!/if \(event\.source !== window\.parent \|\| event\.origin !== location\.origin\) return;/.test(hostJs)) fail('public/module-host.js', 'a relayed drag is taken only from the parent window, same origin');
  if (!/const unrelay = registerDragRelay\(frame\);/.test(canvasJs) || !/destroy\(\) \{ unrelay\(\); waiting = null; frame\.src = 'about:blank'; \}/.test(canvasJs)) fail('public/canvas.js', 'compositeMount registers the frame for relayed drags and lets it go on close');
  // A pointer delivered before the destination's page is in the frame (the composite opened for a place card, a task)
  // waits for the frame's load, then goes in as #ref=; one delivered after goes in at once.
  if (!/frame\.addEventListener\('load', \(\) => \{ if \(waiting && loaded\(\)\) \{ show\(waiting\); waiting = null; \} \}\);/.test(canvasJs) || !/if \(loaded\(\)\) show\(data\.ref\); else waiting = data\.ref;/.test(canvasJs)) fail('public/canvas.js', 'compositeMount holds a pointer until the composite\'s page has loaded');
  // A link in a composite's part to another module's object (the Calendar's event linked from the Itinerary): the page in
  // the frame asks the canvas (app:openref), which opens that module with the object and answers; the frame is never led
  // on to the module's page (a whole app page inside the Calendar's window). A window popped out of the canvas asks the
  // canvas that opened it first; only a page with no canvas goes to the module's page.
  const destJs = fs.readFileSync(path.join(ROOT, 'public/destination.js'), 'utf8');
  const destOpen = destJs.slice(destJs.indexOf('async function openRef(ref)'), destJs.indexOf('\n}\n', destJs.indexOf('async function openRef(ref)')));
  const askAt = destOpen.indexOf('if (inComposite) return (await askCanvasToOpen(window.parent, ref)) === true;');
  const openerAt = destOpen.indexOf('if (opener && (await askCanvasToOpen(opener, ref)) === true) return true;');
  const goAt = destOpen.indexOf('location.href =');
  if (!destOpen || askAt < 0 || goAt < 0 || askAt > goAt) fail('public/destination.js', 'openRef in a composite\'s frame asks the canvas and returns before any navigation');
  if (openerAt < 0 || openerAt > goAt || !/const opener = embedded \? null : sameSiteOpener\(\);/.test(destOpen)) fail('public/destination.js', 'openRef in a window popped out of the canvas asks its opener before navigating');
  const modOpen = moduleJs.slice(moduleJs.indexOf('const openRef = async (ref) => {'), moduleJs.indexOf('\n  };\n', moduleJs.indexOf('const openRef = async (ref) => {')));
  if (!modOpen || !/const opener = popout \? sameSiteOpener\(\) : null;\n\s*if \(opener && \(await askCanvasToOpen\(opener, ref\)\) === true\) return true;/.test(modOpen) || modOpen.indexOf('askCanvasToOpen') > modOpen.indexOf('location.href =')) fail('public/module.js', 'a module\'s pop-out asks the canvas that opened it before becoming another module\'s page');
  const ask = hostJs.slice(hostJs.indexOf('export function askCanvasToOpen('), hostJs.indexOf('\n}\n', hostJs.indexOf('export function askCanvasToOpen(')));
  if (!ask || !/win\.postMessage\(\{ type: 'app:openref', id, ref: cleanPointer\(ref\) \}, location\.origin\)/.test(ask) || !/if \(event\.source !== win \|\| event\.origin !== location\.origin\) return;/.test(ask) || /location\.(href|assign|replace)/.test(ask)) fail('public/module-host.js', 'askCanvasToOpen posts app:openref same origin, takes only that window\'s answer, and never navigates');
  if (!/if \(d && d\.type === 'app:openref'\) return answerOpenRef\(event, d\);/.test(canvasJs)) fail('public/canvas.js', 'compositeMount answers a composite page\'s app:openref (from its own frame, same origin)');
  const answer = canvasJs.slice(canvasJs.indexOf('function answerOpenRef(event, d)'), canvasJs.indexOf('\n  }\n', canvasJs.indexOf('function answerOpenRef(event, d)')));
  if (!answer || !/&& openRef\(r\);/.test(answer) || !/postMessage\(\{ type: 'app:openref-done', id: d\.id, ok \}, event\.origin\)/.test(answer)) fail('public/canvas.js', 'answerOpenRef shows the object with openRef and answers app:openref-done');
  if (!/if \(!\[\.\.\.windows\.values\(\)\]\.includes\(event\.source\)\) return; \/\/ only a window this canvas popped out/.test(canvasJs)) fail('public/canvas.js', 'app:openref from another window is taken only from a window this canvas popped out');
}

// The reaction tray (GitHub #169): with many reactions it never rises under the header. Opening it caps its height to
// the room between its bottom and the header's, and the rest scrolls inside it, so its first row (keys 1 to 6) shows.
{
  const spaceJs = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const toggle = spaceJs.slice(spaceJs.indexOf('function toggleTray('), spaceJs.indexOf('\n}\n', spaceJs.indexOf('function toggleTray(')));
  if (!/if \(open\) \{ closeSettings\(\); fitTray\(\); \}/.test(toggle)) fail('public/space.js', 'opening the reaction tray must fit it under the header (fitTray)');
  const fit = spaceJs.slice(spaceJs.indexOf('function fitTray('), spaceJs.indexOf('\n}\n', spaceJs.indexOf('function fitTray(')));
  if (!/doc\.getElementById\('topbar'\)/.test(fit) || !/tray\.getBoundingClientRect\(\)\.bottom - top - TRAY_GAP/.test(fit) || !/tray\.style\.maxHeight = /.test(fit)) fail('public/space.js', 'fitTray() caps the tray to the height between its bottom and the header');
  if (!/\n\.popover \{\s*max-height: [^;]+;\s*overflow-y: auto;/.test(css)) fail('public/style.css', 'a popover (the tray among them) scrolls inside when it is capped');
}

// The conference's switch (Thomas, 2026-09-30): a switch always reads the module's name, never a closed label such as
// "Rejoin call"; joining lives in the conference's "Not in a call" note, so the space bar has no call control.
{
  const canvasJs = fs.readFileSync(path.join(ROOT, 'public/canvas.js'), 'utf8');
  const spaceJs = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const spaceHtml = fs.readFileSync(path.join(ROOT, 'public/space.html'), 'utf8');
  if (/closedLabel/.test(canvasJs + spaceJs)) fail('public/canvas.js', 'a module switch must read the module\'s name; no closedLabel');
  // The old "N in the call · Join" control stays gone; the space bar's Join the call (#join-call, GitHub #165) is checked
  // below and in check-nav.mjs.
  if (/id: 'call-control'|\.call-control\b|id="call-join"/.test(spaceJs + css)) fail('public/space.js', 'the space bar\'s call control is gone; join from the conference\'s "Not in a call" note or Join the call');
  for (const id of ['no-call-list', 'no-call-empty', 'no-call-join', 'install-hint']) {
    if (!spaceHtml.includes(`id="${id}"`)) fail('public/space.html', `the "Not in a call" note needs #${id}`);
  }
  // Guests get no install at all (Thomas, 2026-10-01): a guest link's page or an account whose role is guest has no
  // install hint or note, no service worker, no Install as an app in either menu, and keeps no beforeinstallprompt.
  {
    const brandJs = fs.readFileSync(path.join(ROOT, 'public/brand.js'), 'utf8');
    const describe = spaceJs.slice(spaceJs.indexOf('function describeInstall('), spaceJs.indexOf('\n}\n', spaceJs.indexOf('function describeInstall(')));
    if (!/const isGuestViewer = \(\) => Boolean\(guestToken\) \|\| me\?\.role === 'guest'/.test(spaceJs)) fail('public/space.js', 'isGuestViewer() must cover a guest link and an account whose role is guest');
    if (!/^\s*if \(isGuestViewer\(\)\) return '';/m.test(describe)) fail('public/space.js', 'describeInstall() must give a guest no install text');
    const swCalls = [...spaceJs.matchAll(/serviceWorker\.register\(/g)].length;
    if (swCalls !== 1 || !/if \(!isGuestViewer\(\) && 'serviceWorker' in navigator\) navigator\.serviceWorker\.register/.test(spaceJs)) fail('public/space.js', 'the service worker (it only makes the site installable) is registered once, never for a guest');
    if (/describeInstall\(\)/.test(spaceJs.slice(spaceJs.indexOf('async function init('), spaceJs.indexOf('if (guestToken) {', spaceJs.indexOf('async function init('))))) fail('public/space.js', 'init() must not paint the install hint before it knows the viewer is not a guest (offerInstall() after /api/me)');
    const guestBranch = spaceJs.slice(spaceJs.indexOf('if (guestToken) {', spaceJs.indexOf('async function init(')), spaceJs.indexOf("const info = await api('GET', '/api/me')", spaceJs.indexOf('async function init(')));
    if (/offerInstall\(/.test(guestBranch)) fail('public/space.js', 'a guest link\'s page must not offer install');
    if (!/visible: \(\) => inMenu\(\) && Boolean\(installPromptEvent\) && !installBarred/.test(brandJs)) fail('public/brand.js', 'the ☰ entry account-install must stay hidden for a guest (installBarred)');
    if (!/installPromptEvent && !installBarred \? \[\{ icon: 'download', label: 'Install as an app'/.test(brandJs)) fail('public/brand.js', 'accountMenuItems() must leave Install as an app out for a guest (installBarred)');
    const bip = brandJs.slice(brandJs.indexOf("window.addEventListener('beforeinstallprompt'"), brandJs.indexOf('});', brandJs.indexOf("window.addEventListener('beforeinstallprompt'")));
    if (!/if \(installBarred\) return;[\s\S]*installPromptEvent = event/.test(bip)) fail('public/brand.js', 'beforeinstallprompt must not keep the event for a guest');
    if (!/if \(isGuestPage\(\)\) barInstall\(\);/.test(brandJs) || !/me\?\.user\?\.role === 'guest'\) barInstall\(\)/.test(brandJs)) fail('public/brand.js', 'install must be barred on a guest link\'s page and for an account whose role is guest');
  }
  // Entering a space never joins the call, for members and guests alike (Thomas, 2026-09-30): the conference shows
  // "Not in a call", and only a click joins (the green phone or "Join the call", both through phoneButton()). The one
  // other way on (Thomas, 2026-09-30, "Pull keeps you on the call"): a pull (into an aside, or back) while on the call
  // moves the call with you: reconnectTo(..., { keepCall: true }) reads inCall before it disconnects, and hands
  // join() and connectAndSetup() `joinCall`, false unless so, which alone starts the call there (joinTheCall(), which
  // is still startCall()). The space bar's Join the call (GitHub #165) is a click too, through joinTheCall().
  const setup = spaceJs.slice(spaceJs.indexOf('async function connectAndSetup('), spaceJs.indexOf('async function startCall('));
  if (!setup.includes('canvas.restore()')) fail('public/space.js', 'connectAndSetup() must open what the space starts with (canvas.restore())');
  if (!/async function connectAndSetup\(token, livekitUrl, \{ joinCall = false \} = \{\}\)/.test(setup)) fail('public/space.js', 'connectAndSetup() joins only when told to (joinCall, false unless so)');
  // GitHub #199: the one other way on is the environment's "join the call on entering" (branding.autoJoinCall), asked
  // through autoJoinOnEntry() (shouldAutoJoin, opens-with.js) in the same line, so it is the same join (joinTheCall).
  const JOIN_LINE = 'if (joinCall || autoJoinOnEntry()) joinTheCall();';
  const setupJoin = setup.slice(setup.indexOf(JOIN_LINE));
  const setupRest = setup.slice(0, setup.indexOf(JOIN_LINE));
  if (!setup.includes(JOIN_LINE) || /startCall|joinTheCall|joinOnShow|callStarting|autoJoinOnEntry\(\)/.test(setupRest)) fail('public/space.js', 'entering a space (connectAndSetup) must never join the call by itself, only a pull that moves the call or the environment\'s setting (if (joinCall || autoJoinOnEntry()))');
  if (!/const autoJoinOnEntry = \(\) => shouldAutoJoin\(\{ setting: features\.autoJoinCall, inCall, canJoin: joinCallWanted\(\), aside: inAside\(\), left: leftCall \}\);/.test(spaceJs)) fail('public/space.js', 'autoJoinOnEntry() asks shouldAutoJoin with the environment\'s setting, inCall, Join the call\'s own rule (joinCallWanted), the aside and leftCall');
  if (!/autoJoinCall: branding\.autoJoinCall === true/.test(spaceJs)) fail('public/space.js', 'features.autoJoinCall is read from /api/branding, on only when true');
  if (!/^function hangUp\(\) \{\n  if \(pipWindow\) closePopout\(\);\n  leftCall = true;/m.test(spaceJs)) fail('public/space.js', 'Hang up marks leftCall, so the setting does not join them again');
  if (!/if \(!pull\) leftCall = false;/.test(spaceJs) || !/leftCall = false; \/\/ a fresh entry/.test(spaceJs)) fail('public/space.js', 'entering again (join() not as a pull, joinAsGuest()) clears leftCall');
  if (!/setAttributes\(\{ call: 'off' \}\)/.test(setupRest)) fail('public/space.js', 'entering a space must tell others "off"');
  if (/joinOnShow/.test(spaceJs)) fail('public/space.js', 'no joinOnShow: entering a space never joins the call');
  if (!/async function join\(spaceId = 'lobby', \{ joinCall = false, pull = false \} = \{\}\)/.test(spaceJs)) fail('public/space.js', 'join() joins the call only when told to (joinCall, false unless so; pull says it is not the person entering again)');
  const joinCallers = [...spaceJs.matchAll(/\bjoin\([^)]*joinCall[^)]*\)/g)].map((m) => m[0]).filter((c) => !c.startsWith('join(spaceId = '));
  const reconnect = spaceJs.slice(spaceJs.indexOf('async function reconnectTo('), spaceJs.indexOf('\n}\n', spaceJs.indexOf('async function reconnectTo(')));
  if (joinCallers.length !== 1 || !reconnect.includes(joinCallers[0])) fail('public/space.js', `only reconnectTo() may ask join() to join the call (found ${JSON.stringify(joinCallers)})`);
  if (!/const stayOnCall = Boolean\(keepCall\) && inCall;/.test(reconnect) || reconnect.indexOf('stayOnCall =') > reconnect.indexOf('call.disconnect(')) fail('public/space.js', 'reconnectTo() keeps the call only for a pull, and only when I was on it (read before the disconnect)');
  if (!reconnect.includes('{ joinCall: stayOnCall, pull: true }')) fail('public/space.js', 'reconnectTo() tells join() it is a pull, so a person who left the call is not joined again by the setting');
  // Which moves are pulls: in and out of an aside, never going somewhere myself (an invitation, the dashboard, a pop-out).
  const keepers = [...spaceJs.matchAll(/^.*reconnectTo\(.*\{ keepCall: true \}.*$/gm)].length;
  if (keepers !== 6) fail('public/space.js', `a pull keeps the call: the aside's pull (an owner's, a peer's), following back, the recall's countdown, pullAside and Rejoin call (found ${keepers})`);
  for (const fn of ['async function joinInvitedSpace(', 'async function openInSpace(', 'async function joinInPopout(']) {
    const body = spaceJs.slice(spaceJs.indexOf(fn), spaceJs.indexOf('\n}\n', spaceJs.indexOf(fn)));
    if (/keepCall/.test(body)) fail('public/space.js', `${fn.replace('async function ', '').replace('(', '()')} goes somewhere myself: it never joins the call`);
  }
  const callers = [...spaceJs.matchAll(/^.*\bstartCall\(\).*$/gm)].map((m) => m[0].trim()).filter((line) => !line.startsWith('//') && !line.startsWith('async function startCall('));
  const inPhone = spaceJs.slice(spaceJs.indexOf('function phoneButton('), spaceJs.indexOf('async function toggleMic('));
  const linesOf = (text) => text.split('\n').map((l) => l.trim()); // whole lines: one caller's line may hold another's
  const byClick = callers.filter((line) => linesOf(inPhone).includes(line));
  const shared = spaceJs.slice(spaceJs.indexOf('function joinTheCall('), spaceJs.indexOf('\n}\n', spaceJs.indexOf('function joinTheCall(')));
  const byShared = callers.filter((line) => linesOf(shared).includes(line));
  if (byClick.length !== 1 || byShared.length !== 1 || callers.length !== 2) fail('public/space.js', `startCall() is called from phoneButton() (a click in the conference) and joinTheCall() alone (found ${JSON.stringify(callers)})`);
  // joinTheCall() shows the conference as its switch does, then joins; called by connectAndSetup() (a pull's joinCall,
  // or the environment's "join the call on entering", GitHub #199) and by the space bar's Join the call, nothing else.
  if (!/^function joinTheCall\(\) \{\n  if \(!canvas\.showBuiltin\('conference'\)\) return;\n  startCall\(\)/m.test(spaceJs)) fail('public/space.js', 'joinTheCall() shows the conference (canvas.showBuiltin) and then joins (startCall)');
  const sharedCallers = [...spaceJs.matchAll(/^.*\bjoinTheCall\(\).*$/gm)].map((m) => m[0].trim()).filter((line) => !line.startsWith('//') && !line.startsWith('function joinTheCall('));
  if (sharedCallers.length !== 2 || !setupJoin.includes(sharedCallers.find((l) => l === JOIN_LINE) || '\0') || !sharedCallers.some((l) => l.startsWith('joinCallButton.addEventListener('))) fail('public/space.js', `joinTheCall() is called from connectAndSetup() (a pull, or the setting) and the space bar's Join the call alone (found ${JSON.stringify(sharedCallers)})`);
  const confDef = spaceJs.slice(spaceJs.indexOf("id: 'conference',"), spaceJs.indexOf("$('conf-close').addEventListener"));
  if (/startCall/.test(confDef)) fail('public/space.js', 'showing the conference (its onChange) must never join the call');
}

// A join that is stopped part-way (Thomas, 2026-09-30: nobody is left in the call, or with their mic live, with the
// Conference hidden). startCall() asks the server first (POST /api/call/join, the calls cap) and so, before the
// microphone; and every wait after that is followed by a look at whether the call was stopped meanwhile (stopped(),
// which stopCall() makes true by counting callGeneration up, even before the join is in the call), so the microphone is
// never published, nor the call said "on", after a stop. Push to talk does nothing out of the call (check-module-host
// runs it).
{
  const spaceJs = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const start = spaceJs.slice(spaceJs.indexOf('async function startCall('), spaceJs.indexOf('\n}\n', spaceJs.indexOf('async function startCall(')));
  const stop = spaceJs.slice(spaceJs.indexOf('async function stopCall('), spaceJs.indexOf('\n}\n', spaceJs.indexOf('async function stopCall(')));
  const at = (s) => start.indexOf(s);
  if (at("'/api/call/join'") < 0 || at("'/api/call/join'") > at('inCall = true') || at("'/api/call/join'") > at('openMic(')) fail('public/space.js', 'startCall() must ask POST /api/call/join before it joins or asks for the microphone');
  const refused = start.slice(at("'/api/call/join'"), at('inCall = true'));
  if (!/catch \(err\) \{[^}]*setJoinProblem\(err\.status && err\.serverSaid \? err\.message :[^}]*return;/.test(refused)) fail('public/space.js', 'a refused join check must say the server\'s own sentence (or a plain one, never "HTTP 500") in the "Not in a call" note (setJoinProblem) and not join');
  if (!/const stopped = \(\) => generation !== callGeneration/.test(start)) fail('public/space.js', 'startCall() must know when a stop came while it waited (callGeneration)');
  const stopBody = stop.split('\n');
  const bump = stopBody.findIndex((l) => /callGeneration \+= 1/.test(l));
  const early = stopBody.findIndex((l) => /if \(!inCall\) return/.test(l));
  if (bump < 0 || bump > early) fail('public/space.js', 'stopCall() must count callGeneration up before it returns out of the call, so a join still asking backs out');
  // Every wait after the join check, outside backOut itself, is followed by stopped() before the next wait.
  const lines = start.split('\n');
  const backFrom = lines.findIndex((l) => /const backOut = async/.test(l));
  const backTo = lines.findIndex((l, i) => i > backFrom && /^ {2}\};/.test(l));
  lines.forEach((line, i) => {
    if (!/\bawait\b/.test(line) || (i >= backFrom && i <= backTo) || /await callJoining|return await backOut/.test(line)) return;
    let j = i + 1;
    while (j < lines.length && !/\bawait\b/.test(lines[j]) && !/stopped\(\)/.test(lines[j])) j += 1;
    if (!/stopped\(\)/.test(lines[j] || '')) fail('public/space.js', `startCall(): after "${line.trim()}" look at stopped() before going on`);
  });
  if (!/await openMic\(\);\n\s*if \(stopped\(\)\) return await backOut\(\);\n\s*await call\.localParticipant\.publishTrack/.test(start)) fail('public/space.js', 'startCall() must back out, releasing the microphone, when stopped while the browser asked for it, before publishTrack');
  if (!/publishTrack\([^\n]*\n\s*if \(stopped\(\)\) return await backOut\(track\);/.test(start)) fail('public/space.js', 'startCall() must unpublish the microphone it published after a stop');
  const onKey = spaceJs.slice(spaceJs.indexOf('function onKey('), spaceJs.indexOf('\n}\n', spaceJs.indexOf('function onKey(')));
  if (!/if \(inCall && prefs\.ptt && hotkeyMatches\(event, prefs\.pttKey\)/.test(onKey)) fail('public/space.js', 'push to talk must do nothing out of the call (inCall first)');
}

// The space bar's module chooser and the conference's "Not in a call" note (QA of the 2026-09-30 batch).
{
  const canvasJs = fs.readFileSync(path.join(ROOT, 'public/canvas.js'), 'utf8');
  const spaceJs = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const spaceHtml = fs.readFileSync(path.join(ROOT, 'public/space.html'), 'utf8');
  const rules = [...css.replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim(), body: m[2] }));
  // The note sits below the module's header (never over its title and x), and a short module scrolls it from its top.
  const noCall = rules.filter((r) => r.selector === '.no-call');
  if (!noCall.some((r) => /justify-content:\s*safe center/.test(r.body))) fail('public/style.css', '.no-call must centre with justify-content: safe center, so a short module does not cut off its top');
  if (noCall.some((r) => /(^|;)\s*inset:\s*0/.test(r.body))) fail('public/style.css', '.no-call must not cover the module\'s header (inset: 0); start it below var(--module-header-h)');
  if (!noCall.some((r) => /top:\s*var\(--module-header-h\)/.test(r.body))) fail('public/style.css', '.no-call must start below the module\'s header (top: var(--module-header-h))');
  if (!noCall.some((r) => /overflow-y:\s*auto/.test(r.body)) || noCall.some((r) => /pointer-events:\s*none/.test(r.body))) fail('public/style.css', '.no-call must scroll (overflow-y: auto, and take the wheel: no pointer-events: none)');
  // The chooser's button hides only while its list is the tab bar, and phone or wide is the header's own window (a
  // narrow pop-out is a phone there), not the main window's.
  for (const r of rules) {
    if (/\.module-chooser-toggle\s*$/.test(r.selector) && /display:\s*none/.test(r.body) && !/\.subnav-modules/.test(r.selector)) {
      fail('public/style.css', `${r.selector} hides the chooser's button without the list being the tab bar; scope it to .subnav-modules`);
    }
  }
  const place = spaceJs.slice(spaceJs.indexOf('function phoneWidth('), spaceJs.indexOf('placeSubnav();\n'));
  if (!/subnav\.ownerDocument\.defaultView/.test(place) || !/function placeSubnav\(/.test(place)) fail('public/space.js', 'placeSubnav must decide phone or wide by the header\'s own window (subnav.ownerDocument.defaultView)');
  if (/window\.matchMedia\('\(max-width: 640px\)'\)/.test(spaceJs)) fail('public/space.js', 'phone or wide must not be the main window\'s matchMedia; the header may be in a pop-out');
  const setUp = spaceJs.slice(spaceJs.indexOf('function setUpPopoutWindow('), spaceJs.indexOf('function closePopout('));
  if ((setUp.match(/placeSubnav\(\)/g) || []).length < 2) fail('public/space.js', 'popping out and back must re-place the space bar for the window it is now in (placeSubnav())');
  // On a narrow canvas a switch on a module open but hidden behind the view shows it, never closes it (switching the
  // conference off hangs up).
  const click = canvasJs.slice(canvasJs.indexOf('  function flipShown(id'), canvasJs.indexOf('  function layoutMenuItems() {'));
  if (!/hiddenByView\(id\)\) setView\(id\)/.test(click)) fail('public/canvas.js', 'a switch on a module hidden behind the narrow canvas\'s view must show it (setView), not close it');
  if (!/checked: shown\(def\.id\)/.test(canvasJs)) fail('public/canvas.js', 'a switch reads off while its module is hidden behind the narrow canvas\'s view');
  // The Layout button opens the page's shared menu (Thomas, 2026-10-13): an icon button beside Set up that says so.
  if (!/id: 'modules-toggle' \}\);\nnav\.elementOf\('modules-toggle'\)\?\.setAttribute\('aria-haspopup', 'menu'\);/.test(spaceJs)) fail('public/space.js', '#modules-toggle is a nav tool beside Set up that opens a menu (aria-haspopup="menu")');
  if (!/onClick: \(event\) => canvas\.toggleMenu\(event\.currentTarget\)/.test(spaceJs)) fail('public/space.js', 'the Layout button opens the canvas\'s menu (canvas.toggleMenu)');
  if (!/openHostMenu\(trigger, layoutMenuItems\);/.test(canvasJs)) fail('public/canvas.js', 'the Layout menu is the page\'s shared menu (host-menu.js openHostMenu), drawn from layoutMenuItems()');
  for (const needle of ["{ heading: 'Show' }", "{ heading: 'Arrange' }", "label: 'Panel Mode'", "label: 'Window Mode'", "label: 'Snap to grid'", "label: 'Clean up'"]) if (!canvasJs.includes(needle)) fail('public/canvas.js', `the Layout menu has ${needle}`);
  const arrangeItems = canvasJs.slice(canvasJs.indexOf("{ heading: 'Arrange' }"), canvasJs.indexOf("const extra = typeof menuItems"));
  if (!/if \(windowMode\) \{[\s\S]*label: 'Snap to grid'[\s\S]*label: 'Clean up'[\s\S]*\}/.test(arrangeItems)) fail('public/canvas.js', 'Snap to grid and Clean up are offered in Window Mode only');
  if (!/const arrangeMode = \(\) => \(saved\.__mode === 'window' \? 'window' : 'panel'\);/.test(canvasJs)) fail('public/canvas.js', 'the arrange mode is remembered with the space\'s layout (__mode), Panel Mode unless said otherwise');
  if (/guest-mic-note/.test(spaceHtml + spaceJs)) fail('public/space.html', 'entering never joins the call, so the guest form must not say the browser will ask for the microphone');
}

// The call's marks, away and the pop-out (Thomas's real-call report of 2026-10-01). A tile's muted mark is the
// microphone publication's own state (micMarkedMuted), refreshed whenever a publication comes or goes, not only on
// TrackMuted/TrackUnmuted: someone joining the call says "on" before their microphone is published, and no
// TrackUnmuted comes for a microphone published unmuted, so their mark used to stick on "muted". Away stops you
// hearing others (every remote audio element, those attached later too) and nothing opens your microphone while
// away. A remote video moved into the pop-out window carries a watch telling LiveKit's adaptive stream it is shown
// in a window of its own, or a hidden main window pauses it (a frozen picture).
{
  const spaceJs = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const fn = (name, end = '\n}\n') => {
    const at = spaceJs.indexOf(name);
    return at < 0 ? '' : spaceJs.slice(at, spaceJs.indexOf(end, at) + end.length);
  };
  try {
    const micMarkedMuted = new Function(`${fn('function micMarkedMuted(')}\nreturn micMarkedMuted;`)();
    assert.equal(micMarkedMuted(undefined), true, 'no microphone published');
    assert.equal(micMarkedMuted({ isMuted: true }), true, 'a muted microphone');
    assert.equal(micMarkedMuted({ isMuted: false }), false, 'a live microphone');
    // The call's event handlers, run against a stand-in call: each step's mark is what a viewer's tile shows.
    const chainAt = spaceJs.indexOf('call\n  .on(RoomEvent.TrackSubscribed');
    const chain = spaceJs.slice(chainAt, spaceJs.indexOf('\n\nasync function fillDevices(', chainAt));
    const handlers = {};
    const fakeCall = { on(name, h) { handlers[name] = h; return fakeCall; } };
    const marks = new Map();
    const shownInCall = (p) => p.isLocal || p.attributes?.call !== 'off';
    const stubs = {
      RoomEvent: new Proxy({}, { get: (_t, name) => name }),
      inCall: true,
      shownInCall,
      updateMuted: (p) => { if (shownInCall(p)) marks.set(p.identity, micMarkedMuted(p.getTrackPublication('microphone'))); },
      updateCamera: () => {}, attachTrack: () => {}, detachTrack: () => {}, tileFor: () => {}, subscribeAll: () => {}, applyLayout: () => {},
      removeParticipant: (p) => marks.delete(p.identity),
    };
    const names = Object.keys(stubs);
    new Function(...names, `const call = arguments[${names.length}];\n${chain};`)(...names.map((k) => stubs[k]), fakeCall);
    const person = (identity, isLocal = false) => {
      const pubs = new Map();
      return { identity, isLocal, attributes: {}, pubs, getTrackPublication: (source) => pubs.get(source) };
    };
    const ann = person('ann');
    const local = person('me', true);
    fakeCall.localParticipant = local;
    const step = (what, mark, who = ann) => assert.equal(marks.get(who.identity), mark, what);
    const fire = (name, ...args) => { assert.equal(typeof handlers[name], 'function', `a ${name} handler`); handlers[name](...args); };
    ann.attributes = { call: 'on' };
    fire('ParticipantAttributesChanged', { call: 'on' }, ann);
    step('joined the call, microphone not yet published', true);
    const mic = { source: 'microphone', isMuted: false, setSubscribed() {} };
    ann.pubs.set('microphone', mic);
    fire('TrackPublished', mic, ann);
    step('microphone published unmuted (no TrackUnmuted follows)', false);
    fire('TrackSubscribed', { kind: 'audio' }, mic, ann);
    step('and subscribed', false);
    mic.isMuted = true; fire('TrackMuted', mic, ann);
    step('muted', true);
    mic.isMuted = false; fire('TrackUnmuted', mic, ann);
    step('unmuted', false);
    ann.pubs.delete('microphone'); fire('TrackUnpublished', mic, ann);
    step('microphone unpublished', true);
    ann.pubs.set('microphone', mic); fire('TrackPublished', mic, ann);
    step('published again (a rejoin)', false);
    const own = { source: 'microphone', isMuted: false, track: {} };
    local.pubs.set('microphone', own);
    fire('LocalTrackPublished', own);
    step('my own microphone published', false, local);
    local.pubs.delete('microphone');
    fire('LocalTrackUnpublished', own);
    step('my own microphone unpublished', true, local);
  } catch (err) {
    fail('public/space.js', `the muted mark must follow the microphone publication, joiners and late publishes too: ${err.message}`);
  }
  // Away: what I hear is off (deafened or away), set at once on setAway, and on every audio element attached later.
  const hearing = /const hearingOff = \(\) => ([^;]+);/.exec(spaceJs);
  if (!hearing) fail('public/space.js', 'what I hear must be off while away or deafened (const hearingOff = () => ...)');
  else {
    const off = (deafened, isAway) => new Function('prefs', 'isAway', `return ${hearing[1]};`)({ deafened }, isAway);
    if (off(false, false) || !off(true, false) || !off(false, true)) fail('public/space.js', 'hearingOff() must be true when deafened or away, and only then');
  }
  if (!/function applyHearing\(\) \{\n\s*canvasDoc\(\)\.querySelectorAll\('audio'\)\.forEach\(\(el\) => \{ el\.muted = hearingOff\(\); \}\);/.test(spaceJs)) fail('public/space.js', 'applyHearing() must mute every audio element where the canvas is (canvasDoc()) by hearingOff()');
  const attach = fn('function attachTrack(');
  if (!/audio\.muted = hearingOff\(\)/.test(attach)) fail('public/space.js', 'attachTrack() must mute a new remote audio element while away or deafened (hearingOff())');
  const away = fn('async function setAway(');
  if (!/isAway = on;\n\s*applyHearing\(\);/.test(away)) fail('public/space.js', 'setAway() must turn what I hear off (or back) at once (applyHearing() right after isAway = on)');
  if (!/if \(enabled && isAway\) \{[^}]*return; \}/.test(fn('async function toggleMic('))) fail('public/space.js', 'toggleMic() must not open the microphone while away');
  if (!/if \(prefs\.ptt \|\| isAway\) \{\n\s*await call\.localParticipant\.setMicrophoneEnabled\(false\);/.test(fn('async function startCall('))) fail('public/space.js', 'startCall() must leave the microphone off when joining while away');
  // Away is said with the "away" and "awayMessage" attributes (known-issues, 2026-10-01): kept at the call service, so
  // someone who joins, reloads or reconnects later sees it, and setAttributes changes only the keys it is given, so
  // "call" and away never undo each other. The old 'away' data message is still read, for one release. While away the
  // camera does not come on: not the button or its keys (toggleCam), not a device or quality change (restartCamera).
  try {
    const helpers = ['function awayAttributes(', 'function awayAttributesChanged(', 'async function syncAwayAttributes(', 'async function syncCallAttributes(', 'function showAway(', 'async function keepCameraOffWhileAway(', 'async function keepMicOffWhileAway(', 'async function sendAway(', 'async function setAway(', 'async function toggleCam(', 'async function restartCamera('].map((name) => {
      const body = fn(name);
      if (!body) throw new Error(`no ${name.replace(/^(async )?function /, '')}...)`);
      return body;
    }).join('');
    const make = () => new Function('Track', 'encoder', '$', 'applyHearing', 'reflectMic', 'updateCamera', 'updateAwayOverlay', 'setStatus', 'applyBackground', 'videoConstraints', 'prefs', `
      let call; let isAway = false; let awayRestoreMic = false; let awayRestoreCam = false; let awayMessage = ''; let awayRestartCam = false;
      let inCall = true; let camToggling = false;
      async function setCameraEnabledWithRetry(enabled) { await call.localParticipant.setCameraEnabled(enabled); }
      ${helpers}
      return { setAway, toggleCam, restartCamera, showAway, syncCallAttributes, set call(c) { call = c; }, set inCall(v) { inCall = v; }, get isAway() { return isAway; } };
    `)(
      { Source: { Camera: 'camera' } }, { encode: (text) => text }, () => ({ classList: { toggle() {}, add() {}, remove() {} } }),
      () => {}, () => {}, () => {}, (identity, on, message) => overlays.set(identity, on ? `away${message ? `: ${message}` : ''}` : 'here'),
      (text) => { said = text; }, async () => {}, () => ({ deviceId: prefs.camId }), prefs,
    );
    const prefs = { background: 'none', camId: 'first' };
    const overlays = new Map();
    let said = '';
    const restarts = [];
    const cameraPub = { track: { restartTrack: async (constraints) => restarts.push(constraints) } };
    const me = {
      identity: 'me', isLocal: true, attributes: { call: 'on' }, isMicrophoneEnabled: true, isCameraEnabled: true, cameraOpened: 0, sent: [], data: [],
      async setAttributes(a) { this.sent.push(a); this.attributes = { ...this.attributes, ...a }; },
      async publishData(payload, opts) { this.data.push([opts.topic, JSON.parse(payload)]); },
      async setMicrophoneEnabled(on) { this.isMicrophoneEnabled = on; },
      async setCameraEnabled(on) { this.isCameraEnabled = on; if (on) this.cameraOpened += 1; },
      getTrackPublication: (source) => (source === 'camera' ? cameraPub : undefined),
    };
    const away = make();
    away.call = { state: 'connected', localParticipant: me };
    await away.setAway(true, '  back in five  ');
    assert.equal(me.attributes.away, 'on', 'going away sets the "away" attribute to on');
    assert.equal(me.attributes.awayMessage, 'back in five', 'and the message, trimmed, in "awayMessage"');
    assert.equal(me.attributes.call, 'on', 'going away leaves the "call" attribute as it was');
    assert.ok(me.sent.every((a) => !('call' in a)), 'away never sends the "call" key');
    assert.ok(!(me.data || []).some(([topic]) => topic === 'away'), 'the old "away" message (kept for one release) is no longer sent');
    assert.equal(me.isCameraEnabled, false, 'going away turns the camera off');
    said = '';
    await away.toggleCam();
    assert.equal(me.cameraOpened, 0, 'the camera button does not turn the camera on while away');
    assert.equal(said, 'away: come back to turn your camera on', 'and says why');
    await away.restartCamera();
    assert.equal(restarts.length, 0, 'a camera change while away does not open the camera (restartTrack)');
    await away.setAway(false);
    assert.equal(me.attributes.away, 'off', 'coming back sets "away" to off');
    assert.equal(me.attributes.awayMessage, '', 'and clears the message');
    assert.equal(me.attributes.call, 'on', 'and leaves "call" as it was');
    assert.equal(me.isCameraEnabled, true, 'coming back turns on the camera that was on before');
    assert.equal(restarts.length, 1, 'and applies the camera change made while away');
    me.isCameraEnabled = false;
    await away.setAway(true);
    assert.equal(me.attributes.away, 'on', 'a plain Away is "away" on');
    assert.equal(me.attributes.awayMessage, '', 'with no message');
    await away.setAway(false);
    assert.equal(me.isCameraEnabled, false, 'a camera off before going away stays off on Back');
    // Going away before the call service is reached: said once connected (connectAndSetup, startCall, Reconnected).
    const early = make();
    const late = { ...me, attributes: { call: 'off' }, sent: [], data: [], isCameraEnabled: false, isMicrophoneEnabled: false };
    early.call = { state: 'connecting', localParticipant: late };
    await early.setAway(true, 'brb');
    assert.equal(late.sent.length, 0, 'nothing is sent before connecting');
    // A camera change while away with the camera off waits for the camera to be turned on, then opens the new device.
    const offCam = make();
    const off = { ...me, attributes: { call: 'on' }, sent: [], data: [], isCameraEnabled: false, cameraOpened: 0 };
    offCam.call = { state: 'connected', localParticipant: off };
    restarts.length = 0;
    await offCam.setAway(true);
    prefs.camId = 'second';
    await offCam.restartCamera();
    await offCam.setAway(false);
    assert.equal(off.cameraOpened, 0, 'Back leaves a camera that was off, off');
    assert.equal(restarts.length, 0, 'and does not open it to take the change');
    await offCam.toggleCam();
    assert.deepEqual(restarts, [{ deviceId: 'second' }], 'turning the camera on after Back restarts it with videoConstraints() (the device chosen while away)');
    restarts.length = 0;
    await offCam.toggleCam();
    await offCam.toggleCam();
    assert.equal(restarts.length, 0, 'once: the change is not applied again');
    // Back, then away again before the microphone was on: the microphone ends up off.
    const race = make();
    let openMic;
    const racer = {
      ...me, attributes: { call: 'on' }, sent: [], data: [], isMicrophoneEnabled: true, isCameraEnabled: false, cameraOpened: 0,
      setMicrophoneEnabled(on) {
        if (!on) { this.isMicrophoneEnabled = false; return Promise.resolve(); }
        return new Promise((resolve) => { openMic = () => { this.isMicrophoneEnabled = true; resolve(); }; });
      },
    };
    race.call = { state: 'connected', localParticipant: racer };
    await race.setAway(true);
    const back = race.setAway(false);
    await Promise.resolve();
    await race.setAway(true);
    openMic();
    await back;
    assert.equal(race.isAway, true, 'away again');
    assert.equal(racer.isMicrophoneEnabled, false, 'Back then away before the microphone came on leaves it off');
    // A reconnect: "call" back to what inCall says, away with it.
    const recon = make();
    const rejoined = { ...me, attributes: { call: 'off' }, sent: [], data: [] };
    recon.call = { state: 'connected', localParticipant: rejoined };
    await recon.syncCallAttributes();
    assert.deepEqual(rejoined.sent, [{ call: 'on', away: 'off', awayMessage: '' }], 'in the call, a reconnect that lost "call" says it on again');
    rejoined.sent.length = 0;
    await recon.syncCallAttributes();
    assert.equal(rejoined.sent.length, 0, 'nothing is sent when nothing was lost');
    recon.inCall = false;
    await recon.syncCallAttributes();
    assert.deepEqual(rejoined.sent, [{ call: 'off', away: 'off', awayMessage: '' }], 'out of the call, "call" is said off');
  } catch (err) {
    fail('public/space.js', `away must be said with the "away" attributes, and the camera kept off while away: ${err.message}`);
  }
  {
    const setup = fn('async function connectAndSetup(');
    if (!/setAttributes\(\{ call: 'off' \}\)[^\n]*\n\s*await syncAwayAttributes\(\);/.test(setup)) fail('public/space.js', 'connectAndSetup() must say away once connected (syncAwayAttributes()) when away before connecting');
    if (!/setAttributes\(\{ call: 'on', \.\.\.awayAttributes\(\) \}\)/.test(fn('async function startCall('))) fail('public/space.js', 'startCall() must say away with "call" on (awayAttributes()), for a join while away');
    if (!/setAttributes\(\{ call: 'off', away: 'off', awayMessage: '' \}\)/.test(fn('async function stopCall('))) fail('public/space.js', 'stopCall() ends away with the call, so it must clear the away attributes with "call" off');
    if (!/tiles\.set\(participant\.identity, tile\);\n\s*showAway\(participant\);/.test(fn('function tileFor('))) fail('public/space.js', 'tileFor() must show the away mark of someone already away (showAway) when it makes their tile');
    if (!/RoomEvent\.Reconnected, \(\) => \{\n[^\n]*\n\s*syncCallAttributes\(\);/.test(spaceJs)) fail('public/space.js', 'a reconnect must say "call" and away again if the call service lost them (syncCallAttributes() on Reconnected)');
  }
  // The other end: a late joiner with the attribute, a change of it, and the old message, run through the call's events.
  try {
    const chainAt = spaceJs.indexOf('call\n  .on(RoomEvent.TrackSubscribed');
    const chain = spaceJs.slice(chainAt, spaceJs.indexOf('\n\nasync function fillDevices(', chainAt));
    const handlers = {};
    const fakeCall = { on(name, h) { handlers[name] = h; return fakeCall; } };
    const overlays = new Map();
    const tilesMade = new Set();
    const updateAwayOverlay = (identity, on, message) => { if (tilesMade.has(identity)) overlays.set(identity, on ? `away${message ? `: ${message}` : ''}` : 'here'); };
    const showAway = new Function('updateAwayOverlay', 'isAway', 'awayMessage', `${fn('function showAway(')}\nreturn showAway;`)(updateAwayOverlay, false, '');
    const stubs = {
      RoomEvent: new Proxy({}, { get: (_t, name) => name }),
      inCall: true,
      shownInCall: (p) => p.isLocal || p.attributes?.call !== 'off',
      updateMuted: () => {}, updateCamera: () => {}, attachTrack: () => {}, detachTrack: () => {}, subscribeAll: () => {}, applyLayout: () => {},
      tileFor: (p) => { if (!tilesMade.has(p.identity)) { tilesMade.add(p.identity); showAway(p); } },
      removeParticipant: (p) => { tilesMade.delete(p.identity); overlays.delete(p.identity); },
      showAway, updateAwayOverlay,
      decoder: { decode: (payload) => payload },
    };
    const names = Object.keys(stubs);
    new Function(...names, `const call = arguments[${names.length}];\n${chain};`)(...names.map((k) => stubs[k]), fakeCall);
    const fire = (name, ...args) => { assert.equal(typeof handlers[name], 'function', `a ${name} handler`); handlers[name](...args); };
    const bo = { identity: 'bo', isLocal: false, attributes: { call: 'on', away: 'on', awayMessage: 'at the door' } };
    fire('ParticipantConnected', bo);
    assert.equal(overlays.get('bo'), 'away: at the door', 'someone already away when they arrive shows away, with their message');
    const cy = { identity: 'cy', isLocal: false, attributes: { call: 'off' } };
    fire('ParticipantConnected', cy);
    cy.attributes = { call: 'on', away: 'on', awayMessage: '' };
    fire('ParticipantAttributesChanged', { call: 'on', away: 'on' }, cy);
    assert.equal(overlays.get('cy'), 'away', 'joining the call while away shows a plain Away');
    bo.attributes = { ...bo.attributes, away: 'off', awayMessage: '' };
    fire('ParticipantAttributesChanged', { away: 'off', awayMessage: '' }, bo);
    assert.equal(overlays.get('bo'), 'here', 'coming back (away off) takes the mark off');
    bo.attributes = { ...bo.attributes, away: 'on', awayMessage: 'lunch' };
    fire('ParticipantAttributesChanged', { away: 'on', awayMessage: 'lunch' }, bo);
    assert.equal(overlays.get('bo'), 'away: lunch', 'going away again puts it back');
    bo.attributes = { ...bo.attributes, call: 'on' };
    fire('ParticipantAttributesChanged', { call: 'on' }, bo);
    assert.equal(overlays.get('bo'), 'away: lunch', 'a change of "call" alone leaves the mark as it is');
    const old = { identity: 'old', isLocal: false, attributes: { call: 'on' } };
    fire('ParticipantConnected', old);
    fire('DataReceived', JSON.stringify({ type: 'away', on: true, message: 'old build' }), old, undefined, 'away');
    assert.notEqual(overlays.get('old'), 'away: old build', 'the old "away" message (kept for one release) is no longer read');
  } catch (err) {
    fail('public/space.js', `a tile must show away from the "away" attributes, for late joiners and changes alike: ${err.message}`);
  }
  // The pop-out: every remote video attached there (now or later) is kept live, and the watch goes on popping back in.
  if ((attach.match(/prepend\(video\);\n\s*keepPoppedVideoLive\(track, video\);/g) || []).length !== 2) fail('public/space.js', 'attachTrack() must keep each video it adds (camera and screen) live in the pop-out (keepPoppedVideoLive(track, video) after the prepend)');
  const setUp = fn('function setUpPopoutWindow(');
  if (!/appendChild\(workEl\);[\s\S]*keepPoppedVideosLive\(\);/.test(setUp)) fail('public/space.js', 'popping out must move the work area (the canvas and the side column, workEl) and keep the moved videos live (keepPoppedVideosLive())');
  if (!/pipWindow = null;\n\s*dropPoppedWatches\(\);/.test(setUp)) fail('public/space.js', 'popping back in must drop the pop-out watches (dropPoppedWatches())');
  try {
    const src = `${fn('function keepPoppedVideoLive(')}${fn('function dropPoppedWatches(')}`;
    // `callWindow`: the conference alone in a window of its own (canvas.builtinWindow), popped out from the column.
    const make = (pipWindow, callWindow = null) => new Function('pipWindow', 'document', 'canvas', `const poppedWatches = new Set();\n${src}\nreturn { keepPoppedVideoLive, dropPoppedWatches, poppedWatches };`)(pipWindow, mainDoc, { builtinWindow: (id) => (id === 'conference' ? callWindow : null) });
    const mainDoc = { name: 'main' };
    const popDoc = { name: 'pop-out', defaultView: { ResizeObserver: class { observe() {} disconnect() {} } } };
    const track = () => ({ isAdaptiveStream: true, infos: [], observeElementInfo(i) { this.infos.push(i); i.observe(); }, stopObservingElementInfo(i) { this.infos = this.infos.filter((x) => x !== i); } });
    const popped = make({});
    const t = track();
    const video = { ownerDocument: popDoc, clientWidth: 320, clientHeight: 180 };
    popped.keepPoppedVideoLive(t, video);
    popped.keepPoppedVideoLive(t, video);
    assert.equal(t.infos.length, 1, 'one watch for a video in the pop-out, however often asked');
    const [info] = t.infos;
    assert.ok(info.visible && info.pictureInPicture && info.element === video && info.width() === 320 && info.height() === 180, 'the watch says shown, in a window of its own, at its size there');
    const inMain = track();
    popped.keepPoppedVideoLive(inMain, { ownerDocument: mainDoc });
    assert.equal(inMain.infos.length, 0, 'no watch for a video still in the main window');
    const notPopped = track();
    make(null).keepPoppedVideoLive(notPopped, video);
    assert.equal(notPopped.infos.length, 0, 'no watch when nothing is popped out');
    const callOnly = track();
    make(null, {}).keepPoppedVideoLive(callOnly, video);
    assert.equal(callOnly.infos.length, 1, 'a video in the call\'s own window (popped out from the column) is kept live too');
    const local = { attach() {} };
    popped.keepPoppedVideoLive(local, video); // my own camera: a local track, nothing to keep
    popped.dropPoppedWatches();
    assert.equal(t.infos.length, 0, 'popping back in drops the watch');
    assert.equal(popped.poppedWatches.size, 0, 'and forgets it');
  } catch (err) {
    fail('public/space.js', `a remote video in the pop-out must be kept live for LiveKit's adaptive stream: ${err.message}`);
  }
}

// The way back from an aside: "Rejoin call" shows while I am in an aside that came from a space (its `origin`). The
// server tells everyone on the call that an aside started (aside-started), those pulled into it too, and the page
// lists it at once, without its origin; a join that finds that entry before presence answers must still end up with
// presence's record (adoptPendingSpace), or Rejoin call never shows and Leave is the only way out.
{
  const spaceJs = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const fn = (name, end = '\n}\n') => {
    const at = spaceJs.indexOf(name);
    return at < 0 ? '' : spaceJs.slice(at, spaceJs.indexOf(end, at) + end.length);
  };
  try {
    const entryLine = spaceJs.match(/^const asideEntry = .*$/m)?.[0];
    const rejoin = spaceJs.match(/id: 'rejoin-call'.*?visible: (\(\) => .*?), onClick:/)?.[1];
    assert.ok(entryLine && rejoin, 'asideEntry and the rejoin-call tool\'s visible() are where this check looks');
    // join() takes what the page already lists, else a pending stand-in; page.join below does the same.
    assert.match(fn('async function join('), /const known = presenceSpaces\.find\(\(r\) => r\.id === spaceId\);\n\s*currentSpace = known \|\| \{ id: spaceId, name: spaceName, members: \[\], pending: true \};/, 'join() looks the space up as this check does');
    const chainAt = spaceJs.indexOf('call\n  .on(RoomEvent.TrackSubscribed');
    const chain = spaceJs.slice(chainAt, spaceJs.indexOf('\n\nasync function fillDevices(', chainAt));
    const handlers = {};
    const fakeCall = { on(name, h) { handlers[name] = h; return fakeCall; } };
    const noop = () => {};
    const stubs = {
      RoomEvent: new Proxy({}, { get: (_t, name) => name }),
      decoder: new TextDecoder(), presenceUsers: new Map(), word: () => 'Aside', reconcileGhostTiles: noop, removeParticipant: noop,
      setTimeout: noop, spaceDisplayName: (r) => r.name, renderSpaceLink: noop, applyPermissions: noop, updateRecallButton: noop, updateCrumb: noop,
      phoneWidth: () => true, // the bar's Rejoin call shows where the bar is the phone's tab bar; wider, the top bar's aside-rejoin is the one
    };
    const names = Object.keys(stubs);
    const page = new Function(...names, `const call = arguments[${names.length}];
      let presenceSpaces = [];
      let currentSpace = null;
      let spaceName = '';
      ${entryLine}
      ${fn('function adoptPendingSpace(')}
      ${chain};
      return {
        list: () => presenceSpaces,
        presence: (spaces) => { presenceSpaces = spaces.map(asideEntry); adoptPendingSpace(); },
        join: (id) => { currentSpace = presenceSpaces.find((r) => r.id === id) || { id, members: [], pending: true }; },
        rejoinShown: ${rejoin},
      };`)(...names.map((k) => stubs[k]), fakeCall);
    assert.equal(typeof handlers.DataReceived, 'function', 'a DataReceived handler');
    const started = new TextEncoder().encode(JSON.stringify({ type: 'aside-started', spaceId: 'a1', members: ['me', 'ann'] }));
    handlers.DataReceived(started, undefined, 0, 'aside-started');
    assert.ok(page.list().some((r) => r.id === 'a1' && r.isAside), 'aside-started lists the aside at once');
    page.join('a1'); // the pulled person's join, before presence has answered
    page.presence([{ id: 'a1', origin: 'lobby', members: ['me', 'ann'], private: false }]);
    assert.equal(page.rejoinShown(), true, 'Rejoin call shows once presence has answered with where the aside came from');
  } catch (err) {
    fail('public/space.js', `in an aside, Rejoin call must show (the aside-started entry gives way to presence's record): ${err.message}`);
  }
}

// A Set or Map a canvas function reads (`x.has(`, `x.add(`, `x.delete(`) must be declared somewhere it can see: in the
// function, as a parameter, in createCanvas or the file, or imported. A deleted `const was = new Set(...)` in setSnapAll
// once left `was.has(...)` behind, and turning the canvas-level snap off threw a ReferenceError.
{
  const C = 'public/canvas.js';
  const src = fs.readFileSync(path.join(ROOT, C), 'utf8');
  const shared = new Set([...src.matchAll(/^(?: {2})?(?:export\s+)?(?:const|let|var|function)\s+(\w+)/gm)].map((m) => m[1]));
  for (const m of src.matchAll(/^import\s*\{([^}]*)\}/gm)) for (const n of m[1].split(',')) shared.add(n.trim().split(/\s+as\s+/).pop());
  const starts = [...src.matchAll(/^ {2}function (\w+)\(([^)]*)\)\s*\{/gm)];
  for (const [i, s] of starts.entries()) {
    const body = src.slice(s.index, starts[i + 1]?.index ?? src.length);
    const local = new Set([...body.matchAll(/\b(?:const|let|var)\s+(\w+)/g)].map((m) => m[1]));
    for (const m of body.matchAll(/\b(?:const|let|var)\s*[[{]([^\]}=]*)/g)) for (const n of m[1].split(',')) local.add(n.trim().split(/[:\s=]/).pop());
    for (const m of body.matchAll(/(?:\(|\b)(\w+)\s*\)?\s*=>/g)) local.add(m[1]);
    for (const m of body.matchAll(/\(([^()]*)\)\s*=>/g)) for (const n of m[1].split(',')) local.add(n.trim().split(/[\s=]/)[0]);
    for (const n of s[2].split(',')) local.add(n.trim().split(/[\s=]/)[0].replace(/[{}]/g, ''));
    for (const m of body.matchAll(/(?<![.\w])([a-z]\w*)\.(has|add|delete)\(/g)) {
      if (!local.has(m[1]) && !shared.has(m[1])) fail(C, `${s[1]}() reads ${m[1]}.${m[2]}() but nothing it can see declares ${m[1]}`);
    }
  }
}

// The column's splitters (plan-one-bar.md step 6, Thomas's feedback): the column's inner edge resizes it between
// 220px and the whole window (Thomas, 2026-10-14: the chat may take all of it), reusing the chat's width preference; on
// the call a second splitter sets the strip's
// height. Both are separators with a vertical or horizontal orientation and a value; the keyboard moves by 16px, Shift
// by 64px, Home and End to the ends, Shift+Enter back to the default, and any other key is left alone (never trapped).
{
  const F = 'public/space.js';
  const spaceJs = fs.readFileSync(path.join(ROOT, F), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'public/space.html'), 'utf8');
  for (const [id, orient, name] of [['side-column-splitter', 'vertical', 'Resize the chat column'], ['side-column-strip-splitter', 'horizontal', 'Resize the call'], ['side-column-call-splitter', 'vertical', 'Resize the call beside the chat']]) {
    const at = html.indexOf(`id="${id}"`);
    const tag = at < 0 ? '' : html.slice(html.lastIndexOf('<', at), html.indexOf('>', at) + 1);
    if (!tag) fail('public/space.html', `the column needs its splitter #${id}`);
    else if (!tag.includes('role="separator"') || !tag.includes(`aria-orientation="${orient}"`) || !tag.includes('tabindex="0"') || !tag.includes(`aria-label="${name}"`)) fail('public/space.html', `#${id} is a focusable ${orient} separator named "${name}"`);
  }
  const start = spaceJs.indexOf('const COLUMN_MIN = 220;');
  const src = start < 0 ? '' : spaceJs.slice(start, spaceJs.indexOf('const columnWin = ', start));
  if (!/function clampColumnWidth\(/.test(src) || !/function clampStripHeight\(/.test(src) || !/function splitterKey\(/.test(src)) fail(F, 'the column\'s splitters need clampColumnWidth(), clampStripHeight() and splitterKey() after COLUMN_MIN');
  else {
    const { clampColumnWidth, clampStripHeight, splitterKey, stripHeightFor, callPlaceFor, clampCallSide } = new Function(`${src}\nreturn { clampColumnWidth, clampStripHeight, splitterKey, stripHeightFor: typeof stripHeightFor === 'function' ? stripHeightFor : null, callPlaceFor: typeof callPlaceFor === 'function' ? callPlaceFor : null, clampCallSide: typeof clampCallSide === 'function' ? clampCallSide : null };`)();
    if (!stripHeightFor) fail(F, 'the call area needs stripHeightFor() after COLUMN_MIN (the chat keeps its share)');
    // No "Hide the video" (Thomas, 2026-10-14): the tiles always show, scaled to the height they get; nothing decides
    // a slim call by the window's height any more.
    if (/callTilesShown|SHORT_WINDOW/.test(spaceJs)) fail(F, 'no callTilesShown() or SHORT_WINDOW: the tiles always show in the column, a short window included');
    if (!callPlaceFor || !clampCallSide) fail(F, 'Call position Left needs callPlaceFor() and clampCallSide() after COLUMN_MIN');
    const cases = [
      ['a width inside the range holds', clampColumnWidth(320, 1280), 320],
      ['the least width is 220px', clampColumnWidth(10, 1280), 220],
      ['a width past half the window holds (the chat may take all of it)', clampColumnWidth(900, 1280), 900],
      ['the most is the whole window', clampColumnWidth(1500, 1280), 1280],
      ['the whole window, exactly', clampColumnWidth(1280, 1280), 1280],
      ['a window narrower than the least still gives the least', clampColumnWidth(300, 200), 220],
      ['a width that is not a number gives the least', clampColumnWidth(undefined, 1280), 220],
      ['the strip\'s least height is 100px', clampStripHeight(10, 800), 100],
      // The video never squeezes the chat (Thomas, 2026-10-14): the call area (tiles + its toolbar and row, `chrome`)
      // is at most 55% of the column, so the chat keeps 45% or more; untouched, the call area is at most 40%.
      ['the strip takes at most 55% of the column', clampStripHeight(700, 800), 440],
      ['the strip\'s height inside the range holds', clampStripHeight(168, 800), 168],
      ['the call\'s toolbar and row count against the 55%', clampStripHeight(700, 800, 120), 320],
      ['a column too short still gives the least', clampStripHeight(300, 200, 120), 100],
    ];
    if (stripHeightFor) cases.push(
      ['the default height holds in a tall column', stripHeightFor(168, 1000, 110), 168],
      ['the default height is held to 40% of the column with its toolbar and row', stripHeightFor(168, 556, 112), 110],
      ['a height the person chose holds up to 55%', stripHeightFor(250, 676, 112), 250],
      ['a height the person chose stops at 55%', stripHeightFor(600, 676, 112), 260],
      ['a short window (600px): the default tiles held to the least, never hidden', stripHeightFor(168, 520, 162), 100],
    );
    // Call position Left (Thomas, 2026-10-14): the call beside the chat in a column at least 560px wide; narrower, it
    // shows at the top, the choice kept (the caller keeps prefs.callPosition). The call's width there is at least 240px
    // and leaves the chat its least (220px).
    if (callPlaceFor && clampCallSide) cases.push(
      ['Top stays top', callPlaceFor('top', 900), 'top'],
      ['Bottom stays bottom at any width', callPlaceFor('bottom', 300), 'bottom'],
      ['Left in a 560px column', callPlaceFor('left', 560), 'left'],
      ['Left in a 559px column falls back to the top', callPlaceFor('left', 559), 'top'],
      ['Left at the default 320px column falls back to the top', callPlaceFor('left', 320), 'top'],
      ['an unknown position is the top', callPlaceFor('middle', 900), 'top'],
      ['no position is the top', callPlaceFor(undefined, 900), 'top'],
      ['the call beside the chat: a width inside the range holds', clampCallSide(320, 720), 320],
      ['the call beside the chat: at least 240px', clampCallSide(100, 720), 240],
      ['the call beside the chat leaves the chat 220px', clampCallSide(700, 720), 500],
      ['the call beside the chat in the narrowest Left column', clampCallSide(400, 560), 340],
    );
    const lim = { min: 220, max: 640, def: 320, grow: 'ArrowRight', shrink: 'ArrowLeft' };
    cases.push(
      ['Right widens by 16', splitterKey({ key: 'ArrowRight', shift: false }, 320, lim), 336],
      ['Left narrows by 16', splitterKey({ key: 'ArrowLeft', shift: false }, 320, lim), 304],
      ['Shift+Right widens by 64', splitterKey({ key: 'ArrowRight', shift: true }, 320, lim), 384],
      ['Shift+Left narrows by 64', splitterKey({ key: 'ArrowLeft', shift: true }, 320, lim), 256],
      ['Left at the least stays', splitterKey({ key: 'ArrowLeft', shift: true }, 230, lim), 220],
      ['Right at the most stays', splitterKey({ key: 'ArrowRight', shift: false }, 636, lim), 640],
      ['Home is the least', splitterKey({ key: 'Home', shift: false }, 320, lim), 220],
      ['End is the most', splitterKey({ key: 'End', shift: false }, 320, lim), 640],
      ['Shift+Enter is the default', splitterKey({ key: 'Enter', shift: true }, 500, lim), 320],
      ['Enter alone is not the splitter\'s', splitterKey({ key: 'Enter', shift: false }, 500, lim), null],
      ['Tab is not the splitter\'s (focus moves on)', splitterKey({ key: 'Tab', shift: false }, 320, lim), null],
      ['Up is not the vertical splitter\'s', splitterKey({ key: 'ArrowUp', shift: false }, 320, lim), null],
      ['Down grows the strip', splitterKey({ key: 'ArrowDown', shift: false }, 168, { min: 100, max: 480, def: 168, grow: 'ArrowDown', shrink: 'ArrowUp' }), 184],
    );
    for (const [label, got, want] of cases) if (got !== want) fail(F, `${label}: got ${got}, wanted ${want}`);
  }
  if (!/wireSplitter\(columnEl\.querySelector\('#side-column-splitter'\), \{ which: 'width'/.test(spaceJs)) fail(F, 'the column\'s edge is wired as a splitter setting the width');
  if (!/if \(which === 'width'\) prefs\.chatWidth = clampColumnWidth\(/.test(spaceJs)) fail(F, 'the column\'s width is the chat\'s width preference (prefs.chatWidth), so a width set before the column holds');
  // The cap is the whole window (COLUMN_MAX_SHARE 1), the splitter's aria-valuemax says so, and the canvas gives way to
  // nothing rather than pushing the page wider; the column's edge stays inside the window at its widest.
  if (!/const COLUMN_MAX_SHARE = 1;/.test(spaceJs)) fail(F, 'the column may take the whole window (COLUMN_MAX_SHARE = 1)');
  if (!/v\.setAttribute\('aria-valuemax', String\(Math\.max\(COLUMN_MIN, columnMaxWidth\(\)\)\)\);/.test(spaceJs)) fail(F, 'the column\'s edge says its most (aria-valuemax, the window\'s width)');
  if (!/\.work > \.canvas \{\s*min-width: 0;/.test(css)) fail('public/style.css', 'the canvas gives way to nothing beside a column as wide as the window (.work > .canvas { min-width: 0 })');
  if (!/columnEl\.classList\.toggle\('full', w >= columnWin\(\)\.innerWidth - 8\)/.test(spaceJs) || !/\.side-column\.full \.side-column-splitter-v \{\s*right: 0;/.test(css)) fail(F, 'at the whole window the column\'s edge stays inside it, to drag back (.side-column.full)');
  // Left: the line between the call and the chat is a splitter of its own, remembered per person (prefs.callSideWidth).
  if (!/wireSplitter\(columnEl\.querySelector\('#side-column-call-splitter'\), \{ which: 'side', axis: 'x', def: DEFAULT_PREFS\.callSideWidth, min: CALL_SIDE_MIN, max: callSideMax,/.test(spaceJs)) fail(F, 'the call\'s line beside the chat is wired as a splitter (which: \'side\')');
  if (!/else if \(which === 'side'\) prefs\.callSideWidth = clampCallSide\(value, columnWidthNow\(\)\);/.test(spaceJs)) fail(F, 'the call\'s width beside the chat is remembered (prefs.callSideWidth), held to the column');
  if (!/\n  callSideWidth: 320,/.test(spaceJs)) fail(F, 'the call beside the chat is 320px wide by default (DEFAULT_PREFS.callSideWidth)');
  if (!/\.side-column\.call-left \{\s*display: grid;\s*grid-template-columns: var\(--side-column-call-w, 320px\) minmax\(0, 1fr\);/.test(css)) fail('public/style.css', 'Left: the call and the chat side by side (.side-column.call-left, a grid of two columns)');
  if (!/body:not\(\.in-aside\) \.side-column\.call-left > \.side-column-chat \{\s*grid-area: chat;/.test(css)) fail('public/style.css', 'Left: the chat on the right, the column\'s full height');
  if (!/--side-column-w: 320px;/.test(css) || !/grid-template-rows: minmax\(0, var\(--side-column-strip-h, 168px\)\) auto;/.test(css)) fail('public/style.css', 'the column\'s width and the height of the strip\'s tiles (the toolbar under them, the tiles giving way first) come from --side-column-w and --side-column-strip-h');
  // The chat's guaranteed share: the strip gives way (it shrinks), the chat never under 45% of the column.
  if (!/body:not\(\.in-aside\) \.side-column-chat \{\s*min-height: 45%;/.test(css)) fail('public/style.css', 'the chat keeps at least 45% of the column (body:not(.in-aside) .side-column-chat { min-height: 45% })');
  if (!/\.side-column-strip \{\s*flex: 0 1 auto;[^}]*min-height: 0;/.test(css)) fail('public/style.css', 'the call\'s strip gives way before the chat (flex: 0 1 auto; min-height: 0)');
  if (!/else prefs\.stripHeight = clampStripHeight\(value, columnHeight\(\), callChrome\(\)\)/.test(spaceJs)) fail(F, 'a dragged call height is held to the call area\'s share, its toolbar and row counted (clampStripHeight with callChrome())');
  if (!/\.side-column-splitter:hover,\s*\.side-column-splitter:focus-visible,\s*\.side-column-splitter\.dragging \{\s*background: color-mix\(in srgb, var\(--accent\)/.test(css)) fail('public/style.css', 'a splitter shows the accent on hover, focus and while dragged');
  if (!/\.side-column-splitter-v \{[^}]*width: 8px;/.test(css) || !/@media \(pointer: coarse\) \{\s*\.side-column-splitter-v \{[^}]*width: 14px;/.test(css)) fail('public/style.css', 'the splitter\'s hit area is 8px, 14px for a finger');
}

// Home's three columns (plan-home-lobby.md, step 3): [Chat] [Spaces] [Modules] across the page's width. The chat column
// on the left, full height under the top bar, resizable (the space column's limits and keys) and remembered in this
// browser (prefs.homeChatWidth, 360px); the spaces in the middle, Who's around above the cards; the Modules (#dashboard,
// the tiles, headed with the module word) on the right, under the cards below 1200px; one column at 760px and below.
// The one #chat shows there pointed at Home's chat (the hidden `lobby` record) while Home shows with no space entered.
{
  const F = 'public/space.js';
  const spaceJs = fs.readFileSync(path.join(ROOT, F), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'public/space.html'), 'utf8');
  const H = 'public/space.html';
  const home = html.slice(html.indexOf('<div class="home" id="home">'), html.indexOf('<!-- A guest link'));
  if (!home) fail(H, 'Home needs its columns in <div class="home" id="home">');
  const order = ['id="home-chat"', 'id="home-chat-slot"', 'id="home-chat-splitter"', 'class="home-main"', 'id="whos-around"', 'id="space-list-title"', 'id="home-add-space"', 'id="spaces"', 'id="join-error"', 'id="home-modules"', 'id="home-modules-title"', 'id="dashboard"'];
  const at = order.map((a) => home.indexOf(a));
  if (at.some((i) => i < 0)) fail(H, `Home keeps every id, in its column: missing ${order.filter((_, i) => at[i] < 0).join(', ')}`);
  else if (at.some((i, n) => n && i < at[n - 1])) fail(H, 'Home reads Chat (its slot and splitter), then the spaces (Who\'s around, the heading row, the cards), then the Modules (their heading, #dashboard)');
  if (!/<aside class="home-chat" id="home-chat" aria-label="Chat" hidden>/.test(home)) fail(H, 'the chat column is an aside named Chat, hidden until space.js shows it');
  const split = home.slice(home.lastIndexOf('<', home.indexOf('id="home-chat-splitter"')), home.indexOf('>', home.indexOf('id="home-chat-splitter"')) + 1);
  if (!split.includes('role="separator"') || !split.includes('aria-orientation="vertical"') || !split.includes('tabindex="0"') || !split.includes('aria-label="Resize the chat column"') || !split.includes('side-column-splitter-v')) fail(H, '#home-chat-splitter is a focusable vertical separator named "Resize the chat column", drawn as the space column\'s');
  if (/>\s*Tools\s*</.test(home)) fail(H, 'the right-hand column is Modules, never Tools (decision 11)');
  // The page's width: no 1180px cap on Home.
  if (!/\.page-scroll > #join \{\s*max-width: none;/.test(css)) fail('public/style.css', 'Home uses the page\'s whole width (.page-scroll > #join { max-width: none })');
  if (!/\.home \{\s*--home-chat-w: 360px;\s*--home-modules-w: 320px;[^}]*grid-template-columns: var\(--home-chat-w\) minmax\(0, 1fr\) var\(--home-modules-w\);\s*grid-template-areas: "chat main modules";/.test(css)) fail('public/style.css', 'Home is three columns: Chat (360px), the spaces, the Modules (320px)');
  if (!/\.home-chat \{\s*grid-area: chat;\s*position: sticky;\s*top: 0;\s*height: var\(--home-h\);/.test(css)) fail('public/style.css', 'the chat column is the page\'s full height under the top bar, staying put');
  if (!/@media \(max-width: 1200px\) \{\s*\.home \{\s*grid-template-columns: var\(--home-chat-w\) minmax\(0, 1fr\);\s*grid-template-areas: "chat main" "chat modules";/.test(css)) fail('public/style.css', 'below 1200px the Modules go under the space cards');
  if (!/@media \(max-width: 760px\) \{\s*\.home,[^{]*\{\s*grid-template-columns: minmax\(0, 1fr\);\s*grid-template-areas: "main" "chat" "modules";/.test(css)) fail('public/style.css', 'at 760px and below Home is one column, the spaces first');
  if (!/\.home-modules:has\(> \.dashboard\[hidden\]\) \{\s*display: none;/.test(css)) fail('public/style.css', 'no tiles, no Modules column');
  if (!/\.home-main \.space-list \{\s*grid-template-columns: repeat\(auto-fill, minmax\(min\(100%, max\(260px, calc\(\(100% - 18px\) \/ 2\)\)\), 1fr\)\);/.test(css)) fail('public/style.css', 'the space cards are two wide where they fit, never more');
  // The width: its own preference, the space column's limits and keys.
  if (!/homeChatWidth: 360,/.test(spaceJs)) fail(F, 'Home\'s chat column is 360px by default (DEFAULT_PREFS.homeChatWidth)');
  if (!/prefs\.homeChatWidth = clampColumnWidth\(value, window\.innerWidth\);/.test(spaceJs)) fail(F, 'Home\'s chat width is held between COLUMN_MIN and the whole window (clampColumnWidth)');
  // Dragged wide, the Modules go under the cards, then only the chat is drawn, its edge inside the window to drag back.
  if (!/home\.classList\.toggle\('chat-wide', spare < HOME_SPARE_BESIDE\);\s*home\.classList\.toggle\('chat-full', spare < HOME_SPARE_LEAST\);/.test(spaceJs)) fail(F, 'Home\'s chat dragged wide: chat-wide (the Modules under the cards), chat-full (the chat alone)');
  if (!/\.home\.chat-full:not\(:has\(> \.home-chat\[hidden\]\)\) > \.home-main,\s*\.home\.chat-full:not\(:has\(> \.home-chat\[hidden\]\)\) > \.home-modules \{\s*display: none;/.test(css) || !/\.home\.chat-full \.home-chat-splitter \{\s*right: 0;/.test(css)) fail('public/style.css', 'Home\'s chat at the whole window: the chat alone, its edge inside the window');
  const wire = spaceJs.slice(spaceJs.indexOf('function wireHomeChatSplitter('), spaceJs.indexOf('// --- end Home\'s chat column ---'));
  if (!/splitterKey\(\{ key: event\.key, shift: event\.shiftKey \}, now\(\), \{ min: COLUMN_MIN, max, def: DEFAULT_PREFS\.homeChatWidth, grow: 'ArrowRight', shrink: 'ArrowLeft' \}\)/.test(wire) || !/if \(next === null\) return;/.test(wire)) fail(F, 'Home\'s splitter takes the space column\'s keys (splitterKey), and leaves every other key alone');
  if (!/wireHomeChatSplitter\(\$\('home-chat-splitter'\)\);/.test(spaceJs)) fail(F, 'the splitter is wired');
  // Home's chat: the one #chat, the `lobby` record's, while Home shows with no space entered; never for a guest.
  if (!/const HOME_CHAT = 'lobby';/.test(spaceJs)) fail(F, 'Home\'s chat is the hidden Lobby record\'s (decision 6)');
  if (!/const chatSpace = \(\) => homeChatSpace \|\| currentSpace;/.test(spaceJs) || !/getSpace: \(\) => chatSpace\(\),/.test(spaceJs)) fail(F, 'the chat reads its space from chatSpace(): Home\'s while it shows on Home, else the space\'s');
  const wanted = spaceJs.slice(spaceJs.indexOf('function homeChatWanted() {'), spaceJs.indexOf('function syncHomeChat() {'));
  for (const [re, why] of [[/!guestToken/, 'never on a guest link'], [/me\.role !== 'guest'/, 'never for a guest'], [/!currentSpace/, 'only with no space entered (Home over a space is step 4)'], [/canDo\('chatRead'\)/, 'only for whoever may read chat'], [/!homeChatEntering/, 'not while a space is being entered']]) if (!re.test(wanted)) fail(F, `Home's chat shows ${why}`);
  if (!/\$\('home-chat-slot'\)\.appendChild\(chat\);/.test(spaceJs)) fail(F, 'Home\'s chat is the one #chat, moved, never a copy');
  if (!/new EventSource\(`\/api\/spaces\/\$\{HOME_CHAT\}\/chat\/stream`\)/.test(spaceJs)) fail(F, 'Home\'s chat hears others live from the server\'s stream (step 1), since Home holds no call');
  if (!/homeChatEntering = true;[^\n]*\n\s*hideHomeChat\(\);/.test(spaceJs.slice(spaceJs.indexOf('async function join('), spaceJs.indexOf('async function joinAsGuest(')))) fail(F, 'entering a space takes the chat out of Home\'s column first');
  if (!/word\('module', \{ many: true, cap: true \}\)/.test(spaceJs.slice(spaceJs.indexOf('function renderSpaceListHead('), spaceJs.indexOf('async function addSpace(')))) fail(F, 'the Modules column is headed with the module word (the template\'s, else Modules)');

  // Step 2: the Lobby leaves the pages' lists. Its record stays (decision 6); its card is not drawn, and every way into
  // it for a signed-in person (join, an invitation, /#join=lobby, a remembered `lobby`, an aside's fallback, Set up by
  // address) lands on Home. A guest link still enters it (joinAsGuest never asks isHomeRecord).
  const body = (head) => { const at = spaceJs.indexOf(head); return at < 0 ? '' : spaceJs.slice(at, spaceJs.indexOf('\n}\n', at)); };
  if (!/presenceSpaces\.filter\(\(x\) => x\.mine && !x\.isLobby\)/.test(body('function renderSpaces() {'))) fail(F, 'Home draws no card for the Lobby (renderSpaces leaves out isLobby)');
  if (!/return !guestToken && id === LOBBY;/.test(body('function isHomeRecord(id) {'))) fail(F, 'isHomeRecord: the Lobby, for anyone but a guest link');
  if (!/^\s*if \(isHomeRecord\(spaceId\)\) return landOnHome\(\);/m.test(body("async function join(spaceId = 'lobby'"))) fail(F, 'join() never enters the Lobby: it lands on Home');
  if (!/^\s*if \(isHomeRecord\(spaceId\)\) return landOnHome\(\);/m.test(body('async function joinInvitedSpace(spaceId) {'))) fail(F, 'an invitation or /#join=lobby lands on Home');
  if (!/if \(isHomeRecord\(id\)\) \{\s*landOnHome\(\);\s*if \(hasOwnerRights\(me\)\) openOverlay\('\/admin#spaces'\);/.test(body('async function openSetupFor('))) fail(F, '/?setup=lobby opens Manage at Spaces for owners and the admin, never the Lobby\'s Set up');
  const land = body('function landOnHome() {');
  if (!/if \(rememberedSpace\(\) === LOBBY\) forgetSpace\(\);/.test(land) || !/showSpaceList\(\);/.test(land)) fail(F, 'landing on Home forgets a remembered Lobby, and over a space shows Home over it (the call kept)');
  if (/isHomeRecord/.test(body('async function joinAsGuest('))) fail(F, 'a guest link made for the Lobby keeps working (working assumption, question 3)');

  // Step 4: Home over a space. The one #chat moves into Home's column pointed at Home's chat; the space's messages wait
  // aside (homeChatStash) and come back where #chat was, with what the space's call said meanwhile (parkSpaceChat);
  // nothing of Home's goes on the space's call. The person stays in the space's call, Away (showSpaceList).
  const wanted2 = body('function homeChatWanted() {');
  if (!/return 'home';/.test(wanted2) || !/currentSpace && viewingHome && call\.state === 'connected' && !inAside\(\)[^\n]*\n[^\n]*!canvas\.builtinWindow\('chat'\)\) return 'over';/.test(wanted2)) fail(F, 'Home\'s chat shows over a space this page is present in (never an aside, never with the chat in its own window)');
  if (!/syncHomeChat\(\);/.test(body('function showSpaceList() {')) || !/setAway\(true\);/.test(body('function showSpaceList() {'))) fail(F, 'going Home from a space sets Away and swaps in Home\'s chat');
  if (!/syncHomeChat\(\);/.test(body('function returnToCanvas() {'))) fail(F, 'Back to <space> gives the space\'s chat back');
  const show = body("function showHomeChat(mode = 'home') {");
  if (!/homeChatStash = \{\s*parent: chat\.parentNode, next: chat\.nextSibling,/.test(show) || !/nodes: \[\.\.\.\$\('messages'\)\.childNodes\], log: chatLog\.splice\(0\)/.test(show)) fail(F, 'over a space, the space\'s chat (its messages as drawn, its log, where #chat was) is kept aside, never dropped');
  if (!/\$\('home-chat-slot'\)\.appendChild\(chat\);/.test(show)) fail(F, 'Home\'s chat over a space is the same one #chat, moved');
  const hide = body('function hideHomeChat() {');
  if (!/\$\('messages'\)\.replaceChildren\(\.\.\.stash\.nodes\);/.test(hide) || !/stash\.parent\.insertBefore\(chat,/.test(hide) || !/for \(const run of stash\.parked\) run\(\);/.test(hide)) fail(F, 'back in the space: its messages, #chat in its place, then what its call said meanwhile');
  if (!/^\s*if \(homeChatSpace\) return;/m.test(body('function publishChat(data) {'))) fail(F, 'Home\'s chat never goes on the space\'s call');
  if (!/if \(topic === 'chat' && parkSpaceChat\(\(\) => onCallData\(payload, participant, _kind, topic\)\)\) return;/.test(spaceJs)) fail(F, 'the space\'s call chat heard while Home\'s chat shows is kept for the space, never drawn in Home\'s');
  if (!/if \(!parkSpaceChat\(add\)\) add\(\);/.test(spaceJs) || !/\|\| homeChatSpace\) return;/.test(body('async function sendImage(file) {'))) fail(F, 'pictures stay the space\'s: a received one waits, none is sent into Home\'s chat');
  const disc = spaceJs.slice(spaceJs.indexOf('.on(RoomEvent.Disconnected, () => {'), spaceJs.indexOf('async function fillDevices('));
  if (!/viewingHome = false;[^\n]*\n\s*hideHomeChat\(\);/.test(disc)) fail(F, 'a dropped connection gives the space\'s chat back before it clears');
  // Unread on the Home link (decision 8), fed by Home's chat stream while Home is out of sight; cleared when it shows.
  const notice = body('function homeChatNotice(data) {');
  if (!/if \(!homeChatSpace\) \{\s*countHomeNotice\(data\);/.test(notice)) fail(F, 'Home\'s chat out of sight: its stream counts for the Home link');
  const count = body('function countHomeNotice(data) {');
  if (!/data\.by !== me\?\.key && data\.visibility !== 'private'/.test(count) || !/chat-clear'\) homeUnreadIds\.clear\(\)/.test(count)) fail(F, 'the Home link counts others\' public messages, and a clear takes them off');
  if (!/setHomeUnread\(0\);/.test(show)) fail(F, 'Home in sight clears the count');
  if (!/nav\.setBadge\('menu-home', n\);/.test(body('function paintHomeUnread() {')) || !/#brand-home-link \.brand-logo/.test(body('function paintHomeUnread() {'))) fail(F, 'the count shows on the Home link: the logo, and the phone menu\'s Home');
  if (!/\.topbar \.brand-logo \.home-unread \{[^}]*background: var\(--accent\);[^}]*color: var\(--on-accent\);/.test(css)) fail('public/style.css', 'the Home link\'s count is drawn in theme tokens');
  // Catch-up: every `ready` after the first (a reconnect) reads the history again; other event types are left alone.
  const open = body('function openHomeChatStream() {');
  if (!/if \(data\?\.type === 'ready'\) \{\s*ready \+= 1;\s*if \(ready > 1\) catchUpHomeChat\(\);/.test(open)) fail(F, 'a reconnected stream catches up on what was missed');
  if (!/fetchChatHistory\(HOME_CHAT\)/.test(body('async function catchUpHomeChat() {'))) fail(F, 'the catch-up reads Home\'s history');
}

// The call pops out again, and has a place (Thomas, 2026-10-14): a visible Pop out on the call's toolbar (the same button
// brings it back) with Call position on its caret (top or bottom of the column, a floating window, its own window), the
// same in Chat's "..."; its own window is the conference's element moved into a window (canvas.popBuiltin), so the call
// keeps its connection; out of the column the column shows #call-out with Bring the call back, and closing the window,
// Bring the call back or Hang up puts it back in the column.
{
  const F = 'public/space.js';
  const spaceJs = fs.readFileSync(path.join(ROOT, F), 'utf8');
  const html = fs.readFileSync(path.join(ROOT, 'public/space.html'), 'utf8');
  const canvasJs = fs.readFileSync(path.join(ROOT, 'public/canvas.js'), 'utf8');
  const bar = html.slice(html.indexOf('id="floatbar"'), html.indexOf('id="floatbar-overflow"'));
  if (!/id="call-popout"[^>]*title="Pop out the call"/.test(bar)) fail('public/space.html', 'the call\'s toolbar has a visible Pop out (#call-popout, "Pop out the call")');
  if (!/id="call-place"[^>]*title="Call position"[^>]*aria-haspopup="menu"/.test(bar)) fail('public/space.html', 'Pop out\'s caret is Call position (#call-place), a menu');
  if (!/id="call-place-wrap" data-collapse="\d+"/.test(bar)) fail('public/space.html', 'Pop out folds with the rest of the toolbar (data-collapse)');
  for (const id of ['call-out', 'call-out-note', 'call-back']) if (!html.includes(`id="${id}"`)) fail('public/space.html', `the column needs #${id}`);
  // No "Hide the video" (Thomas, 2026-10-14: "I am not sure we need to 'hide the video'... remove it"): no button at
  // the end of the row, no menu entry, no slim call in the column, no toggle; a `callTiles` stored before is ignored.
  if (/side-column-tiles|side-column-online/.test(html) || /side-column-tiles|side-column-online/.test(spaceJs)) fail('public/space.html', 'no #side-column-tiles (Hide the video) and no Online row in the column: Who is here is the top bar\'s');
  if (/Hide the video|Show the video|toggleCallTiles|call-slim|prefs\.callTiles|callTiles: /.test(spaceJs)) fail(F, 'no Hide the video / Show the video, no toggle, no slim call, no callTiles preference read');
  if (/call-slim|side-column-tiles/.test(css)) fail('public/style.css', 'no rules for the slim call or the Hide the video button');
  // Beside the chat (Left) the tiles fill from the top, sized to the strip less the toolbar, the toolbar right under
  // them: the grid is as tall as what the tiles used (--grid-used-h), never centred in a tall empty column.
  if (!/const beside = grid\.closest\('\.side-column\.call-left \.side-column-strip'\);/.test(spaceJs) || !/const H = beside \? beside\.clientHeight - \(toolbar \? toolbar\.offsetHeight : 0\) - padY : grid\.clientHeight - padY;/.test(spaceJs) || !/grid\.style\.setProperty\('--grid-used-h'/.test(spaceJs)) fail(F, 'beside the chat fitTiles() sizes the tiles to the strip less the toolbar and sets --grid-used-h');
  if (!/refit\.observe\(\$\('side-column-strip'\)\)/.test(spaceJs)) fail(F, 'the tiles are fitted again as the strip changes (beside the chat the grid follows its tiles)');
  if (!/\.side-column\.call-left \.side-column-strip > \.canvas \{\s*flex: none;\s*height: auto;\s*grid-template-rows: auto auto;/.test(css) || !/\.side-column\.call-left \.side-column-strip \.grid \{\s*flex: none;\s*height: var\(--grid-used-h, auto\);/.test(css)) fail('public/style.css', 'beside the chat the tiles take their own height from the top and the toolbar sits right under them');
  if (!/id="call-back"[^>]*>[\s\S]{0,120}Bring the call back</.test(html)) fail('public/space.html', '#call-back reads "Bring the call back"');
  for (const label of ['Top of the column', 'Bottom of the column', 'Left of the chat', 'Floating window', 'Its own window']) if (!spaceJs.includes(`label: '${label}'`)) fail(F, `Call position offers "${label}"`);
  // Left is offered only in a column wide enough, and says why otherwise; the position marked is the one chosen.
  if (!/label: 'Left of the chat', hint: wide \? undefined : 'Needs a wider column', disabled: !wide, onPick: \(\) => setCallPosition\('left'\)/.test(spaceJs) || !/const wide = columnWidthNow\(\) >= CALL_LEFT_MIN;/.test(spaceJs)) fail(F, 'Left of the chat is offered in a column at least CALL_LEFT_MIN wide, else disabled with "Needs a wider column"');
  if (!/const callPlaceNow = \(\) => \(columnCollapsed\(\) \|\| inAside\(\) \? \(callAtBottom\(\) \? 'bottom' : 'top'\) : callPlaceFor\(prefs\.callPosition, columnWidthNow\(\)\)\);/.test(spaceJs)) fail(F, 'where the call shows follows the chosen position and the column\'s width now (callPlaceNow, callPlaceFor), never rewriting the choice');
  if (!/columnEl\.classList\.toggle\('call-left', left\);/.test(spaceJs)) fail(F, 'Left draws as .call-left on the column');
  // No call area out of the call (Thomas, 2026-10-14): no titlebar and no Left column whatever position is saved (the
  // choice kept); the chat fills the column with the Join the call row. The area comes with the call (or a call out of
  // the column, floating or in its own window).
  if (!/const callArea = inCall \|\| outside;\n  const chosen = callPlaceNow\(\);\n  const place = !callArea && chosen === 'left' \? 'top' : chosen;/.test(spaceJs)) fail(F, 'out of the call the column shows no Left call area (callArea), the saved position kept');
  if (!/if \(head\) head\.hidden = !callArea \|\| where === 'closed' \|\| where === 'dock';/.test(spaceJs)) fail(F, 'out of the call the column shows no call titlebar');
  // The call's titlebar (Thomas, 2026-10-14: "why does the conf not have a titlebar like Discussion?"): a header above
  // the call in the column, named by callTitle(), with a "..." on the shared menu holding Pop out or Bring the call back,
  // Call position, Settings and Leave the call.
  const head = html.slice(html.indexOf('<header class="side-column-call-head" id="call-head">'), html.indexOf('</header>', html.indexOf('id="call-head"')));
  if (!head) fail('public/space.html', 'the column needs the call\'s titlebar (<header class="side-column-call-head" id="call-head">)');
  else {
    if (!/id="call-head-name">Call</.test(head)) fail('public/space.html', 'the call\'s titlebar reads Call (#call-head-name) until the environment names it');
    if (!/<button class="sdk-more" id="call-more" type="button" title="More" aria-label="More for the call" aria-haspopup="menu">/.test(head)) fail('public/space.html', 'the call\'s titlebar has a "..." (#call-more), a menu named for the call');
  }
  if (html.indexOf('id="call-head"') > html.indexOf('id="side-column-strip"')) fail('public/space.html', 'the call\'s titlebar sits above the call (before #side-column-strip)');
  if (!/openHostMenu\(event\.currentTarget, callMenuItems\)/.test(spaceJs)) fail(F, 'the call\'s "..." opens on the shared menu (openHostMenu, callMenuItems)');
  const callMenu = spaceJs.slice(spaceJs.indexOf('function callMenuItems() {'), spaceJs.indexOf('\n}\n', spaceJs.indexOf('function callMenuItems() {')));
  for (const [re, what] of [[/label: 'Bring the call back', onPick: bringCallBack/, 'Bring the call back'], [/label: 'Pop out the call', onPick: popOutCall/, 'Pop out the call'], [/\.\.\.callPlaceItems\(\)/, 'Call position'], [/label: 'Settings', onPick: \(\) => setTimeout\(\(\) => openSettings\('more'\), 0\)/, 'Settings (the toolbar\'s gear)'], [/label: 'Leave the call', danger: true, onPick: \(\) => \$\('hangup'\)\.click\(\)/, 'Leave the call (Hang up)']]) if (!re.test(callMenu)) fail(F, `the call's "..." offers ${what}`);
  if (!/onShown: \(def\) => \{ showBuiltinName\(def\); setCallHead\(def\); \}/.test(spaceJs) || !/name\.textContent = callTitle\(def\.name\);/.test(spaceJs)) fail(F, 'the call\'s titlebar follows the environment\'s name for the conference (setCallHead, callTitle)');
  if (!/\.side-column-call-head \{[^}]*height: var\(--module-header-h\);[^}]*border-bottom: 1px solid var\(--border\);/.test(css)) fail('public/style.css', 'the call\'s titlebar is drawn as the chat\'s (the module header\'s height, the border token)');
  if (!/heading: 'Call position'/.test(spaceJs)) fail(F, 'Call position is the menu\'s heading');
  if (!/\$\('call-place'\)\?\.addEventListener\('click'[\s\S]{0,400}openHostMenu\(anchor, callPlaceItems\)/.test(spaceJs)) fail(F, 'Call position opens on the shared menu (openHostMenu)');
  if (!/label: 'Call position', items: \(\) => callPlaceItems\(\)/.test(spaceJs)) fail(F, 'Chat\'s "..." has Call position too');
  if (!/label: 'Pop out the call', onPick: popOutCall/.test(spaceJs) || !/label: 'Bring the call back', onPick: bringCallBack/.test(spaceJs)) fail(F, 'Chat\'s "..." pops the call out and brings it back');
  if (!/function popOutCall\(\) \{\n  if \(canvas\.columnMode\(\)\) \{\n    if \(!canvas\.popBuiltin\('conference'\)\)/.test(spaceJs)) fail(F, 'Pop out moves the conference into its own window (canvas.popBuiltin), never a second join');
  if (!/callOutEl\.querySelector\('#call-back'\)\.addEventListener\('click', bringCallBack\)/.test(spaceJs)) fail(F, '#call-back brings the call back (bringCallBack)');
  if (!/function hangUp\(\) \{[\s\S]{0,400}canvas\.returnBuiltin\('conference'\)/.test(spaceJs)) fail(F, 'Hang up brings a call out of the column back to it');
  if (!/if \(prefs\.callFloat && callWhere\(\) === 'column'\) canvas\.liftBuiltin\('conference', true, 'person'\)/.test(spaceJs)) fail(F, 'Floating window, remembered (prefs.callFloat), floats the call as they join');
  if (!/callPosition: 'top', callFloat: false,\n/.test(spaceJs)) fail(F, 'the call\'s place is remembered per person (prefs.callPosition, callFloat), and no callTiles any more');
  if (!/if \(open && mode === 'window'\) keepPoppedVideosLive\(\);/.test(spaceJs)) fail(F, 'the call in its own window keeps its videos live (keepPoppedVideosLive)');
  // canvas.js: the window is the conference's own element (openBuiltinWindow); closing it puts it back in the column.
  if (!/function popBuiltin\(id\) \{[\s\S]*?openBuiltinWindow\(def, \{ moving: true \}\)[\s\S]*?\.popped = true;/.test(canvasJs)) fail('public/canvas.js', 'popBuiltin() moves the element into its window (openBuiltinWindow, moving) and marks it the column\'s');
  if (!/function returnBuiltin\(id\) \{[\s\S]*?openBuiltinIn\(mod\.def, 'column', \{ moving: true \}\)/.test(canvasJs)) fail('public/canvas.js', 'returnBuiltin() puts it back in the column, moving (the call keeps going)');
  if (!/const back = columnMode\(\) \? 'column'/.test(canvasJs)) fail('public/canvas.js', 'closing the call\'s window brings it back to the column');
  if (!/if \(!on && mod\.lifted && \(why === 'person' \|\| mod\.lifted !== 'person'\)\)/.test(canvasJs)) fail('public/canvas.js', 'a screen share ending never puts back a call the person floated');
  // The call at the bottom: the chat first; the strip's line turns round (up grows it).
  if (!/\.side-column\.call-bottom \.side-column-chat \{\s*order: 1;/.test(css)) fail('public/style.css', 'at the bottom of the column the chat comes first');
  if (!/const flipped = \(\) => which === 'strip' && columnEl\.classList\.contains\('call-bottom'\);/.test(spaceJs)) fail(F, 'with the call at the bottom the strip\'s splitter turns round');
}

// Each module's titlebar told apart (GitHub #229, public/module-tint.js): the manifest's colour when it names a tint,
// else a stable pick from the id, never gold (the AI's), the same every time; and the stylesheet draws it on the
// header (docked, floating and the popped-out page's, all .mod-header) from the tint tokens, never a raw colour.
{
  const F = 'public/module-tint.js';
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-check-'));
  const copy = path.join(tmp, 'module-tint.mjs');
  fs.copyFileSync(path.join(ROOT, F), copy);
  const { TINTS, moduleTint } = await import(pathToFileURL(copy).href);
  fs.rmSync(tmp, { recursive: true, force: true });
  if (TINTS.join() !== 'gold,blue,green,teal,purple,red,orange,pink') fail(F, 'the eight tints, in the stylesheet\'s order');
  for (const t of TINTS) if (moduleTint('anything', t) !== t) fail(F, `the manifest's ${t} wins`);
  if (moduleTint('anything', 'mauve') === 'mauve' || moduleTint('anything', null) === null) fail(F, 'a colour that is not a tint, or none, falls back to a pick from the id');
  if (moduleTint('', null) !== null || moduleTint(null) !== null) fail(F, 'no id, no tint');
  const ids = ['assistant', 'stream', 'notes', 'weather', 'dice', 'a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'module-with-a-long-id', 'x1', 'x2'];
  for (const id of ids) {
    const first = moduleTint(id);
    if (first !== moduleTint(id)) fail(F, `${id}: the pick is stable`);
    if (!TINTS.includes(first)) fail(F, `${id}: the pick is one of the tints (got ${first})`);
    if (first === 'gold') fail(F, `${id}: gold is the AI's, never a module's fallback`);
  }
  if (new Set(ids.map((id) => moduleTint(id))).size < 4) fail(F, 'the picks spread over the tints');
  const canvasJs = fs.readFileSync(path.join(ROOT, 'public/canvas.js'), 'utf8');
  // A composite (dest:calendar) carries its main module's colour (composites.js), so the one Calendar keeps the Calendar's tint.
  if (!/const colorOf = \(id\) => \{ const c = compositeById\(id\); const base = c \? c\.main : id; return moduleTint\(base, colors\.get\(base\) \|\| null\); \};/.test(canvasJs)) fail('public/canvas.js', 'a module\'s colour is moduleTint(id, the manifest\'s); a composite\'s is its main module\'s');
  if (!/<header class="mod-header module-floating-head"\$\{tintAttr\(m\.id\)\}>/.test(canvasJs) || !/<header class="mod-header"\$\{tintAttr\(m\.id\)\}>/.test(canvasJs)) fail('public/canvas.js', 'the floating and the docked header carry data-tint');
  const moduleJs = fs.readFileSync(path.join(ROOT, 'public/module.js'), 'utf8');
  if (!/\$\('module-titlebar'\)\.dataset\.tint = tint;/.test(moduleJs)) fail('public/module.js', 'the popped-out page\'s titlebar carries data-tint');
  const rule = /\.mod-header\[data-tint\] \{([^}]*)\}/.exec(css);
  if (!rule) fail('public/style.css', 'a rule for .mod-header[data-tint]');
  else {
    if (/box-shadow/.test(rule[1])) fail('public/style.css', 'no coloured top edge on the titlebar (Thomas, 2026-10-13): the tint is the wash and the icon only');
    if (!/color-mix\(in srgb, var\(--tint\) 10%, transparent\)/.test(rule[1])) fail('public/style.css', 'the wash is a 10% mix of the tint over the header\'s own background');
    if (/#[0-9a-f]{3,8}\b|rgba?\(/i.test(rule[1])) fail('public/style.css', 'the titlebar\'s accent uses the tint token, never a raw colour');
  }
  if (!/\.mod-header\[data-tint\] \.mod-title > i \{[^}]*color: var\(--tint\);/.test(css)) fail('public/style.css', 'the title\'s icon takes the tint');
}

// The call's toolbar in the always-on column (plan-one-bar.md, step 6; Thomas, 2026-10-13: "Where did all of the other
// conference controls go?"). The column shows the whole toolbar, every control the toolbar had before the column
// (6b5b989), as a wrapping row of at most two rows; what does not fit folds into "..." lowest data-collapse first
// (public/call-toolbar.js), and the stylesheet hides no control there for any other reason.
{
  const html = fs.readFileSync(path.join(ROOT, 'public/space.html'), 'utf8');
  const start = html.indexOf('id="floatbar"');
  const end = html.indexOf('id="floatbar-overflow"');
  const bar = start >= 0 && end > start ? html.slice(start, end) : '';
  if (!bar) fail('public/space.html', 'the call\'s toolbar (#floatbar) is missing');
  const OLD_CONTROLS = ['mic', 'meter', 'deafen', 'cam', 'screen-share', 'layout', 'layout-glyph', 'away-toggle', 'react-toggle', 'settings-toggle', 'space-link', 'floatbar-more', 'hangup'];
  for (const id of OLD_CONTROLS) if (!bar.includes(`id="${id}"`)) fail('public/space.html', `the call's toolbar lost #${id}`);
  for (const g of ['mic', 'audio', 'camera', 'layout', 'more']) if (!bar.includes(`data-settings="${g}"`)) fail('public/space.html', `the call's toolbar lost its data-settings="${g}"`);
  for (const id of ['floatbar-overflow', 'react-tray', 'settings', 'mic-select', 'gain', 'gate', 'noise', 'echo', 'agc', 'talk-mode', 'speaker-select', 'master-volume', 'test-speaker', 'cam-select', 'quality', 'mirror', 'background-mode', 'layout-pick']) {
    if (!html.includes(`id="${id}"`)) fail('public/space.html', `the call's settings lost #${id}`);
  }
  const want = { mic: 10, cam: 9, deafen: 7, layout: 6, 'away-toggle': 5, 'screen-share': 4, 'react-toggle': 3, 'settings-toggle': 2, 'space-link': 1 };
  const priorityOf = {};
  let wrapPriority = NaN;
  for (const line of bar.split('\n')) {
    const wrap = line.match(/class="fbtn-wrap" data-collapse="(\d+)"/);
    if (wrap) { wrapPriority = Number(wrap[1]); continue; }
    if (/^\s*<\/div>/.test(line)) { wrapPriority = NaN; continue; } // the group's end
    const id = line.match(/<button[^>]*\bid="([^"]+)"/);
    if (!id) continue;
    const own = line.match(/data-collapse="(\d+)"/);
    priorityOf[id[1]] = own ? Number(own[1]) : wrapPriority; // a group's button takes the group's
  }
  for (const [id, n] of Object.entries(want)) {
    const got = priorityOf[id];
    if (got !== n) fail('public/space.html', `#${id}'s fold priority (data-collapse) is ${got}, want ${n}`);
  }
  // Nothing in the column's stylesheet hides a toolbar control but the fold's own [data-folded].
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = m[1].trim();
    if (!/side-column/.test(selector) || !/floatbar|fbtn|#mic|#cam|#hangup/.test(selector)) continue;
    if (/display\s*:\s*none/.test(m[2]) && !/\[data-folded\]/.test(selector)) fail('public/style.css', `${selector} hides call controls in the column; fold them into "..." instead`);
  }
  if (!/\.floatbar > \[data-folded\]\s*\{[^}]*display:\s*none/.test(css)) fail('public/style.css', 'a folded control ([data-folded]) must be hidden: .floatbar > [data-folded] { display: none }');
  // The fold, as arithmetic: 30px buttons, 6px apart, as in the column's strip.
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'canvas-check-'));
  const copy = path.join(tmp, 'call-toolbar.mjs');
  fs.copyFileSync(path.join(ROOT, 'public/call-toolbar.js'), copy);
  const { foldCallToolbar, wrapRows, callTitle } = await import(pathToFileURL(copy).href);
  for (const [name, want] of [[undefined, 'Call'], ['', 'Call'], ['Conference', 'Call'], ['  Video  call ', 'Video call'], ['Video chat', 'Video chat']]) {
    if (typeof callTitle !== 'function' || callTitle(name) !== want) fail('public/call-toolbar.js', `callTitle(${JSON.stringify(name)}) should be ${JSON.stringify(want)}`);
  }
  fs.rmSync(tmp, { recursive: true, force: true });
  const W = 30;
  const toolbar = ({ share = true, link = false, w = W } = {}) => [
    { id: 'mic', width: w, priority: 10 }, { id: 'deafen', width: w, priority: 7 }, { id: 'cam', width: w, priority: 9 },
    { id: 'screen-share', width: w, priority: 4, hidden: !share }, { id: 'layout', width: w, priority: 6 },
    { id: 'away-toggle', width: w, priority: 5 }, { id: 'react-toggle', width: w, priority: 3 },
    { id: 'settings-toggle', width: w, priority: 2 }, { id: 'space-link', width: w, priority: 1, hidden: !link },
    { id: 'floatbar-more', width: w, priority: null, hidden: true }, { id: 'hangup', width: w, priority: null },
  ];
  const foldCases = [
    ['the default 320px column (308px of row): nothing folds', { items: toolbar(), width: 308, gap: 6 }, []],
    ['the narrowest column (220px, 208px of row): two rows, nothing folds', { items: toolbar(), width: 208, gap: 6 }, []],
    ['a 160px row: the two least important fold, Settings first', { items: toolbar(), width: 160, gap: 6 }, ['settings-toggle', 'react-toggle']],
    ['a 120px row: then Share your screen and Away', { items: toolbar(), width: 120, gap: 6 }, ['settings-toggle', 'react-toggle', 'screen-share', 'away-toggle']],
    ['a 90px row: the microphone, the camera, "..." and Leave stay', { items: toolbar(), width: 90, gap: 6 }, ['settings-toggle', 'react-toggle', 'screen-share', 'away-toggle', 'layout', 'deafen']],
    ['a space link shown folds first', { items: toolbar({ link: true }), width: 160, gap: 6 }, ['space-link', 'settings-toggle', 'react-toggle']],
    ['no screen share in this browser: it takes no space in the row and never folds', { items: toolbar({ share: false }), width: 130, gap: 6 }, ['settings-toggle', 'react-toggle', 'away-toggle']],
    ['44px buttons at the narrowest column: folds into "..."', { items: toolbar({ w: 44 }), width: 208, gap: 6 }, ['settings-toggle', 'react-toggle']],
    ['one row asked for: more folds', { items: toolbar(), width: 308, gap: 6, rows: 1 }, ['settings-toggle', 'react-toggle']],
    ['nothing can fit: everything that folds folds, never Leave the call', { items: toolbar(), width: 10, gap: 6 }, ['settings-toggle', 'react-toggle', 'screen-share', 'away-toggle', 'layout', 'deafen', 'cam', 'mic']],
  ];
  for (const [name, input, wantFold] of foldCases) {
    try { assert.deepEqual(foldCallToolbar(input), wantFold); } catch { fail('public/call-toolbar.js', `${name}: got ${JSON.stringify(foldCallToolbar(input))}, want ${JSON.stringify(wantFold)}`); }
  }
  for (const [widths, width, gap, rows] of [[[30, 30, 30], 102, 6, 1], [[30, 30, 30], 101, 6, 2], [[], 100, 6, 0], [[200], 100, 6, 1]]) {
    if (wrapRows(widths, width, gap) !== rows) fail('public/call-toolbar.js', `wrapRows(${JSON.stringify(widths)}, ${width}, ${gap}) is ${wrapRows(widths, width, gap)}, want ${rows}`);
  }
}

// A call control's settings caret (.fbtn-caret: Microphone settings, Camera settings, Call position, ...) sits in its
// button's corner and never over its centre, so a click in the middle is always the main action (QA, 2026-10-14: in a
// 500px column the 16px caret covered a 30px button's centre, and a click on the microphone opened its settings). The
// caret box is read from the stylesheet, every rule that sizes or places it, and tried against every size the call's
// buttons take (--action-btn-h for .fbtn, the 38px default, 34px compact, 30px tiny, 40px on a phone).
{
  const F = 'public/style.css';
  const px = (body, prop) => { const m = body.match(new RegExp(`(?:^|[;\\s{])${prop}\\s*:\\s*(-?\\d+(?:\\.\\d+)?)px`)); return m ? Number(m[1]) : null; };
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)].map((m) => ({ selector: m[1].trim(), body: m[2] }));
  const caretRules = rules.filter((r) => r.selector.split(',').some((s) => /\.fbtn-caret\s*$/.test(s.trim())));
  const base = caretRules.find((r) => r.selector === '.fbtn-caret');
  if (!base) fail(F, '.fbtn-caret must have its own rule (its size and corner)');
  else {
    const box0 = { w: px(base.body, 'width'), h: px(base.body, 'height'), top: px(base.body, 'top'), right: px(base.body, 'right') };
    if (Object.values(box0).some((v) => v === null)) fail(F, `.fbtn-caret must set width, height, top and right in px (got ${JSON.stringify(box0)})`);
    if (box0.w > 12 || box0.h > 12) fail(F, `.fbtn-caret is at most 12px square (got ${box0.w}x${box0.h})`);
    if (!/pointer-events\s*:\s*none/.test(base.body) && !/overflow\s*:\s*hidden/.test(base.body)) fail(F, '.fbtn-caret clips its glyph (overflow: hidden), so its hit area is its own box');
    const boxes = [['.fbtn-caret', box0]];
    for (const r of caretRules) {
      if (r === base) continue;
      const b = { w: px(r.body, 'width') ?? box0.w, h: px(r.body, 'height') ?? box0.h, top: px(r.body, 'top') ?? box0.top, right: px(r.body, 'right') ?? box0.right };
      if (/display\s*:\s*none/.test(r.body) || ['width', 'height', 'top', 'right'].every((p) => px(r.body, p) === null)) continue;
      boxes.push([r.selector, b]);
    }
    const sizes = new Set([38, 34, 30, 40]);
    for (const r of rules) if (/\.fbtn\b/.test(r.selector)) { const v = px(r.body, '--action-btn-h'); if (v !== null) sizes.add(v); }
    for (const [sel, b] of boxes) {
      for (const size of sizes) {
        const c = size / 2;
        const left = size - b.right - b.w;
        const covers = c >= left && c <= size - b.right && c >= b.top && c <= b.top + b.h;
        if (covers) fail(F, `${sel}: a ${b.w}x${b.h} caret at top ${b.top}px, right ${b.right}px covers the centre of a ${size}px call button; keep it in the corner`);
      }
    }
  }
}

// A screen share's lift survives a phone's width (QA, 2026-10-14): placeBuiltins() ends the lift on the way to a phone
// and, back in the column, must ask the module (def.shareLift) and lift it again while a screen is shared (or put it back
// when the share ended meanwhile). space.js's conference answers from its tiles (a tile-screen), as syncShareLift does.
{
  const canvasJs = fs.readFileSync(path.join(ROOT, 'public/canvas.js'), 'utf8');
  const spaceJs = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const start = canvasJs.indexOf('function placeBuiltins()');
  const place = canvasJs.slice(start, canvasJs.indexOf('\n  }\n', start));
  const intoColumn = place.slice(place.indexOf('if (want)'), place.indexOf('} else {', place.indexOf('openBuiltinIn(def, \'column\'')));
  if (!/def\.shareLift[\s\S]*liftBuiltin\(def\.id, Boolean\(def\.shareLift\(\)\)\)/.test(intoColumn)) fail('public/canvas.js', 'placeBuiltins() must lift the conference again when a screen tile exists (liftBuiltin(def.id, Boolean(def.shareLift()))) after putting it back in the column');
  const conf = spaceJs.slice(spaceJs.indexOf("canvas.registerBuiltin({\n  id: 'conference'"), spaceJs.indexOf("canvas.registerBuiltin({\n  id: 'chat'"));
  if (!/shareLift: \(\) => screenShared\(\)/.test(conf)) fail('public/space.js', 'the conference must answer shareLift from its screen tiles (screenShared)');
  if (!/const screenShared = \(\) => \[\.\.\.tiles\.values\(\)\]\.some\(\(t\) => t\.classList\.contains\('tile-screen'\)\)/.test(spaceJs)) fail('public/space.js', 'screenShared() is whether a tile-screen exists');
  if (!/const sharing = screenShared\(\);/.test(spaceJs.slice(spaceJs.indexOf('function syncShareLift()')))) fail('public/space.js', 'syncShareLift() and the canvas ask the same screenShared()');
}

if (problems.length) {
  console.error(`check-canvas: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('check-canvas: OK');
