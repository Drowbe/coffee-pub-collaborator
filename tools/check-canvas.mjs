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
  const { whatOpens, conferenceAllowed, opensWithSummary } = await import(pathToFileURL(copy).href);
  fs.rmSync(tmp, { recursive: true, force: true });
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
  const emptySentence = opensWithSummary({ list: ['gone'], modules: ['todo'], canOpen: (id) => id !== 'gone', nameOf: () => 'To-do' });
  if (/To-do|Chat/.test(emptySentence)) fail('public/opens-with.js', `a list with nothing openable must not name what would open without it (got "${emptySentence}")`);
  const spaceJs = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  if (!/allowed: \(\) => conferenceAllowed\(\{ conferenceEnabled: features\.conferenceEnabled/.test(spaceJs)) fail('public/space.js', 'the conference module\'s allowed() must follow the environment\'s switch (conferenceAllowed), for owners too');
  const settingsJs = fs.readFileSync(path.join(ROOT, 'public/space-settings.js'), 'utf8');
  if (!/opensWithSummary\(\{\s*list: opensWithList/.test(settingsJs)) fail('public/space-settings.js', 'the Opens with sentence must come from the stored list (opensWithSummary with list: opensWithList)');
  const canvasJs = fs.readFileSync(path.join(ROOT, 'public/canvas.js'), 'utf8');
  const restore = canvasJs.slice(canvasJs.indexOf('function restore()'), canvasJs.indexOf('// --- the toolbar button'));
  if (!/whatOpens\(\{[^}]*guest: Boolean\(guestToken\)/s.test(restore)) fail('public/canvas.js', 'restore() must ask whatOpens (opens-with.js) for what to open, with whether this is a guest');
  if (/opened\.has\('conference'\)\) view = 'conference'/.test(restore)) fail('public/canvas.js', 'restore() must start a phone on the first module opened, not always the call');
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
  const { MIN_W, MIN_H, tidyBoxes, tidyCells, gridFor, cellBox, resettle, cellsOverlap, leastSpan } = await import(pathToFileURL(copy).href);
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
    check(`six piled on ${w}x${h}`, Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, box: { x: 40 + i * 5, y: 40, w: 420, h: 320 } })), A, { apart: 6 <= Math.floor(A.w / (MIN_W + 8)) * Math.floor(A.h / (MIN_H + 8)) });
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
  // canvas.js runs it from cleanUp(), floating modules only, in this window, snapped ones by the grid's resettle.
  const canvasJs = fs.readFileSync(path.join(ROOT, 'public/canvas.js'), 'utf8');
  const clean = canvasJs.slice(canvasJs.indexOf('  function cleanUp() {'), canvasJs.indexOf('  // The grid\'s size, from the space bar\'s slider'));
  if (!/floaterOf\(p\) && floaterOf\(p\)\.ownerDocument === doc/.test(clean)) fail('public/canvas.js', 'cleanUp() must take only the floating modules in the canvas\'s window');
  if (!/tidyCells\(g, snapped\.map\(\(p\) => \(\{ id: p\.id, cell: snapCell\(g, currentBox\(floaterOf\(p\)\)\) \}\)\)\)/.test(clean) || !/tidyBoxes\(free\.map/.test(clean)) fail('public/canvas.js', 'cleanUp() must place snapped modules by tidyCells, in their own cells, and free ones by tidyBoxes');
  if (!/remember\(p\.id, \{ box: currentBox\(floater\), layout: 'user' \}\)/.test(clean)) fail('public/canvas.js', 'cleanUp() must remember the tidy places as a drag does');
  if (!/\n    cleanUp,\n/.test(canvasJs)) fail('public/canvas.js', 'the canvas must offer cleanUp()');
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
  const setupJoin = setup.slice(setup.indexOf('if (joinCall)'));
  const setupRest = setup.slice(0, setup.indexOf('if (joinCall)'));
  if (!setup.includes('if (joinCall)') || /startCall|joinTheCall|joinOnShow|callStarting/.test(setupRest)) fail('public/space.js', 'entering a space (connectAndSetup) must never join the call, only a pull that moves the call (if (joinCall))');
  if (!/setAttributes\(\{ call: 'off' \}\)/.test(setupRest)) fail('public/space.js', 'entering a space must tell others "off"');
  if (/joinOnShow/.test(spaceJs)) fail('public/space.js', 'no joinOnShow: entering a space never joins the call');
  if (!/async function join\(spaceId = 'lobby', \{ joinCall = false \} = \{\}\)/.test(spaceJs)) fail('public/space.js', 'join() joins the call only when told to (joinCall, false unless so)');
  const joinCallers = [...spaceJs.matchAll(/\bjoin\([^)]*joinCall[^)]*\)/g)].map((m) => m[0]).filter((c) => !c.startsWith('join(spaceId = '));
  const reconnect = spaceJs.slice(spaceJs.indexOf('async function reconnectTo('), spaceJs.indexOf('\n}\n', spaceJs.indexOf('async function reconnectTo(')));
  if (joinCallers.length !== 1 || !reconnect.includes(joinCallers[0])) fail('public/space.js', `only reconnectTo() may ask join() to join the call (found ${JSON.stringify(joinCallers)})`);
  if (!/const stayOnCall = Boolean\(keepCall\) && inCall;/.test(reconnect) || reconnect.indexOf('stayOnCall =') > reconnect.indexOf('call.disconnect(')) fail('public/space.js', 'reconnectTo() keeps the call only for a pull, and only when I was on it (read before the disconnect)');
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
  // joinTheCall() shows the conference as its switch does, then joins; called by a pull's joinCall and by the space
  // bar's Join the call, nothing else.
  if (!/^function joinTheCall\(\) \{\n  if \(!canvas\.showBuiltin\('conference'\)\) return;\n  startCall\(\)/m.test(spaceJs)) fail('public/space.js', 'joinTheCall() shows the conference (canvas.showBuiltin) and then joins (startCall)');
  const sharedCallers = [...spaceJs.matchAll(/^.*\bjoinTheCall\(\).*$/gm)].map((m) => m[0].trim()).filter((line) => !line.startsWith('//') && !line.startsWith('function joinTheCall('));
  if (sharedCallers.length !== 2 || !setupJoin.includes(sharedCallers.find((l) => /joinCall\)/.test(l)) || '\0') || !sharedCallers.some((l) => l.startsWith('joinCallButton.addEventListener('))) fail('public/space.js', `joinTheCall() is called from connectAndSetup()'s joinCall (a pull) and the space bar's Join the call alone (found ${JSON.stringify(sharedCallers)})`);
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
  const click = canvasJs.slice(canvasJs.indexOf("menu?.addEventListener('click'"), canvasJs.indexOf('// The modules on for this space and this viewer'));
  if (!/hiddenByView\(id\)\) setView\(id\)/.test(click)) fail('public/canvas.js', 'a switch on a module hidden behind the narrow canvas\'s view must show it (setView), not close it');
  if (!/on: shown\(def\.id\)/.test(canvasJs)) fail('public/canvas.js', 'a switch reads off while its module is hidden behind the narrow canvas\'s view');
  if (/aria-haspopup="true"[^>]*id="modules-toggle"|id="modules-toggle"[^>]*aria-haspopup/.test(spaceJs)) fail('public/space.js', '#modules-toggle opens a group of switches, not a menu: aria-expanded and aria-controls, no aria-haspopup');
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
    assert.deepEqual(me.data.at(-1), ['away', { type: 'away', on: true, message: '  back in five  ' }], 'the old "away" message is still sent, for a page on the build before');
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
    assert.equal(overlays.get('old'), 'away: old build', 'the old "away" message is still read');
  } catch (err) {
    fail('public/space.js', `a tile must show away from the "away" attributes, for late joiners and changes alike: ${err.message}`);
  }
  // The pop-out: every remote video attached there (now or later) is kept live, and the watch goes on popping back in.
  if ((attach.match(/prepend\(video\);\n\s*keepPoppedVideoLive\(track, video\);/g) || []).length !== 2) fail('public/space.js', 'attachTrack() must keep each video it adds (camera and screen) live in the pop-out (keepPoppedVideoLive(track, video) after the prepend)');
  const setUp = fn('function setUpPopoutWindow(');
  if (!/appendChild\(\$\('canvas'\)\);[\s\S]*keepPoppedVideosLive\(\);/.test(setUp)) fail('public/space.js', 'popping out must keep the moved videos live (keepPoppedVideosLive())');
  if (!/pipWindow = null;\n\s*dropPoppedWatches\(\);/.test(setUp)) fail('public/space.js', 'popping back in must drop the pop-out watches (dropPoppedWatches())');
  try {
    const src = `${fn('function keepPoppedVideoLive(')}${fn('function dropPoppedWatches(')}`;
    const make = (pipWindow) => new Function('pipWindow', 'document', `const poppedWatches = new Set();\n${src}\nreturn { keepPoppedVideoLive, dropPoppedWatches, poppedWatches };`)(pipWindow, mainDoc);
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

if (problems.length) {
  console.error(`check-canvas: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('check-canvas: OK');
