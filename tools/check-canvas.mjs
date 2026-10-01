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

// The conference's switch (Thomas, 2026-09-30): a switch always reads the module's name, never a closed label such as
// "Rejoin call"; joining lives in the conference's "Not in a call" note, so the space bar has no call control.
{
  const canvasJs = fs.readFileSync(path.join(ROOT, 'public/canvas.js'), 'utf8');
  const spaceJs = fs.readFileSync(path.join(ROOT, 'public/space.js'), 'utf8');
  const spaceHtml = fs.readFileSync(path.join(ROOT, 'public/space.html'), 'utf8');
  if (/closedLabel/.test(canvasJs + spaceJs)) fail('public/canvas.js', 'a module switch must read the module\'s name; no closedLabel');
  if (/id: 'call-control'|\.call-control\b|id="call-join"/.test(spaceJs + css)) fail('public/space.js', 'the space bar\'s call control is gone; join from the conference\'s "Not in a call" note');
  for (const id of ['no-call-list', 'no-call-empty', 'no-call-join', 'install-hint']) {
    if (!spaceHtml.includes(`id="${id}"`)) fail('public/space.html', `the "Not in a call" note needs #${id}`);
  }
  // Entering a space never joins the call, for members and guests alike (Thomas, 2026-09-30): the conference shows
  // "Not in a call", and only a click joins (the green phone or "Join the call", both through phoneButton()). The one
  // other way on (Thomas, 2026-09-30, "Pull keeps you on the call"): a pull (into an aside, or back) while on the call
  // moves the call with you: reconnectTo(..., { keepCall: true }) reads inCall before it disconnects, and hands
  // join() and connectAndSetup() `joinCall`, false unless so, which alone starts the call there (still startCall()).
  const setup = spaceJs.slice(spaceJs.indexOf('async function connectAndSetup('), spaceJs.indexOf('async function startCall('));
  if (!setup.includes('canvas.restore()')) fail('public/space.js', 'connectAndSetup() must open what the space starts with (canvas.restore())');
  if (!/async function connectAndSetup\(token, livekitUrl, \{ joinCall = false \} = \{\}\)/.test(setup)) fail('public/space.js', 'connectAndSetup() joins only when told to (joinCall, false unless so)');
  const setupJoin = setup.slice(setup.indexOf('if (joinCall) {'));
  const setupRest = setup.slice(0, setup.indexOf('if (joinCall) {'));
  if (!setup.includes('if (joinCall) {') || /startCall|joinOnShow|callStarting/.test(setupRest)) fail('public/space.js', 'entering a space (connectAndSetup) must never join the call, only a pull that moves the call (if (joinCall))');
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
  const byClick = callers.filter((line) => inPhone.includes(line));
  const byPull = callers.filter((line) => setupJoin.includes(line));
  if (byClick.length !== 1 || byPull.length !== 1 || callers.length !== 2) fail('public/space.js', `startCall() is called from phoneButton() (a click) and connectAndSetup()'s joinCall (a pull) alone (found ${JSON.stringify(callers)})`);
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

if (problems.length) {
  console.error(`check-canvas: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('check-canvas: OK');
