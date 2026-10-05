// The canvas of a space: the Layout button and its menu, and every module the space has
// open on it. A module is either an installed one (a sandboxed frame driven by module-host.js)
// or a built-in one, the conference and the chat. Both work the same way and can be shown
// three ways:
//
//   docked   as a column of the space's grid: conference, chat, module...
//   floating as a draggable, resizable box over the call
//   window   as a window of its own
//
// A module's manifest says which of docked and floating it supports (both, if it
// does not say); every module can be popped into a window. Modules follow the call
// when it is popped out: they open in whichever window the canvas is in.
// See documentation/architecture/architecture-canvas.md.

import { api, markModuleRead, followTheme, word } from '/brand.js';
import { mountModule, openClearMenu } from '/module-host.js';
import { nav } from '/nav-bar.js';
import { whatOpens } from '/opens-with.js';
import { switchListHtml, wireSwitchList } from '/switch-list.js';
import { layoutOf, placeLayout, leftOutNote } from '/layouts.js';
import { MIN_W, MIN_H, gridFor, cellBox, snapCell, leastSpan, clampCell, nearestFree, nextFree, tileFresh, resettle, tidyCells, tidyBoxes, TIDY_GAP, DOCK_MIN, FLEX_MIN, NARROW, dockLimit, fitDock } from '/snap-grid.js';

// What each space remembers (`app.canvas.<space>`; brand.js moves the old `app.panels` keys): the modules open when the person last used it,
// and each module's mode and sizes. `app.canvas` alone is what earlier versions kept for all
// spaces, and is the starting point for a space with nothing saved yet.
const STORE_KEY = 'app.canvas';
const storeKey = (spaceId) => `${STORE_KEY}.${spaceId}`;
const HEAD_H = 42; // the shared module header height (--module-header-h in style.css)
// A fixed column's least width (DOCK_MIN), the flexible column's (FLEX_MIN) and the narrow line (NARROW) are snap-grid.js's,
// beside fitDock(), the rule for how many columns a window holds (plan-docked-limit.md).

function readStore(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || 'null');
  } catch {
    return null;
  }
}

function loadSaved(spaceId) {
  const own = spaceId ? readStore(storeKey(spaceId)) : null;
  if (own) return own;
  const { __open, ...rest } = readStore(STORE_KEY) || {};
  return rest;
}

// The modules this person had open in a space (ids, in order), or null when nothing is remembered yet. The space
// list's "Open with" choice reads and writes this.
export function joinModules(spaceId) {
  const open = loadSaved(spaceId).__open;
  return Array.isArray(open) ? open : null;
}

export function setJoinModules(spaceId, ids) {
  const saved = loadSaved(spaceId);
  saved.__open = ids;
  try {
    localStorage.setItem(storeKey(spaceId), JSON.stringify(saved));
  } catch {
    // private mode: nothing is remembered
  }
}

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

// The buttons at the end of every module's header: switch between docked and
// floating, open in a window, close.
const toolsHtml = ({ mode, canDock, canFloat, closable = true, snap = false }) => `
  ${mode === 'float' ? `<button class="msg-btn${snap ? ' on' : ''}" data-snap type="button" title="Snap to a grid" aria-label="Snap to a grid" aria-pressed="${snap ? 'true' : 'false'}"><i class="fa-solid fa-border-all fa-fw" aria-hidden="true"></i></button>` : ''}
  ${mode !== 'float' && canFloat ? '<button class="msg-btn" data-mode="float" type="button" title="Float over the call" aria-label="Float over the call"><i class="fa-regular fa-window-restore fa-fw" aria-hidden="true"></i></button>' : ''}
  ${mode !== 'dock' && canDock ? '<button class="msg-btn" data-mode="dock" type="button" title="Dock beside the video" aria-label="Dock beside the video"><i class="fa-solid fa-table-columns fa-fw" aria-hidden="true"></i></button>' : ''}
  ${mode !== 'window' ? '<button class="msg-btn" data-popout type="button" title="Open in its own window" aria-label="Open in its own window"><i class="fa-solid fa-up-right-from-square fa-fw" aria-hidden="true"></i></button>' : ''}
  ${closable ? '<button class="msg-btn" data-close type="button" title="Close" aria-label="Close"><i class="fa-solid fa-xmark fa-fw" aria-hidden="true"></i></button>' : ''}`;

// `onNote(text)`: a short line for the Layout panel's note (#modules-menu-note), '' to clear it. `onMenu(open)`: the
// Layout panel opened or closed (space.js refreshes its Layouts section as it opens).
export function createCanvas({ guestToken = null, onChatAsk = null, onNote = null, onMenu = null } = {}) {
  const toggle = document.getElementById('modules-toggle');
  const menu = document.getElementById('modules-menu');
  // An inline menu (the module buttons sit in a bar in the space header) is always shown: it is never hidden
  // or positioned by this file, only kept up to date.
  const inline = () => Boolean(menu && menu.classList.contains('subnav-modules'));
  // The panel's Arrange section (space.js writes it once, inside #modules-menu): kept here, since the phone's tab bar
  // takes the list's whole content and the section comes back with the panel.
  const arrangeEl = menu ? menu.querySelector('.module-chooser-arrange') : null;
  // The Layouts section after it (space.js writes and refreshes it; plan-saved-layouts.md), kept the same way.
  const layoutsEl = menu ? menu.querySelector('.module-chooser-layouts') : null;
  const canvas = document.getElementById('canvas');
  let saved = loadSaved(null);
  // Nothing is remembered until a join has restored the space's modules, and not while the space is
  // being torn down: closing every module on the way out must not become the layout.
  let suspended = true;
  const opened = new Map(); // id -> module; a module is open while it is in here
  const builtins = new Map(); // id -> the built-in module's definition (the conference and the chat)
  const canvasEmpty = document.getElementById('canvas-empty');
  let spaceId = null;
  let available = [];
  // Each module's colour in this space (plan-chat-model.md, decision 18), a tint name or null, from every module the
  // server listed, the ones kept out of the Layout menu (canvas.menu false) included: Chat colours a command's
  // messages by it.
  let colors = new Map();
  const TINTS = ['gold', 'blue', 'green', 'teal', 'purple', 'red', 'orange', 'pink'];
  const colorOf = (id) => (colors.get(id) || null);
  const tintAttr = (id) => (colorOf(id) ? ` data-tint="${colorOf(id)}"` : '');
  // What this space opens with, and the environment's list for a space that has none. Both null until a space is loaded.
  let spaceOpensWith = null;
  let spaceDefaultLayout = null; // the space's default layout, whole (plan-saved-layouts.md, decision 4), or null
  let environmentOpensWith = null;
  let z = 40;
  let order = 0;
  let unread = {}; // module id -> unread notifications, from brand.js
  const builtinUnread = {}; // built-in module id -> unread count (the chat's messages)

  const canvasDoc = () => canvas.ownerDocument;
  const canvasWin = () => canvasDoc().defaultView || window;

  // A layer for floating modules in whichever window the call is in.
  const layers = new WeakMap();
  function layerFor(doc) {
    let layer = layers.get(doc);
    if (!layer) {
      layer = doc.createElement('div');
      layer.id = 'module-layer';
      layer.className = 'module-layer';
      doc.body.appendChild(layer);
      layers.set(doc, layer);
    }
    return layer;
  }
  // Floating modules live in their own layer, a sibling of the canvas, so hiding the canvas (space.js's
  // own space-list view, shown while still connected but not looking at this space) does not hide them
  // on its own -- without this they go on floating over whatever the space shows instead. Nothing is
  // torn down: the same modules reappear exactly as they were once the canvas comes back.
  function showFloating(show) {
    const layer = layers.get(canvasDoc());
    if (layer) layer.hidden = !show;
  }

  const supports = (p, mode) => (p.modes || ['dock', 'float']).includes(mode);

  // A narrow canvas has no room for a column.
  function isNarrow() {
    const w = canvas.clientWidth;
    return w > 0 ? w <= NARROW : canvas.classList.contains('narrow'); // the same line as the space bar's tab bar
  }

  // `holdStore`: the grid-size slider's preview changes the layout on every step but writes it once, when let go.
  let holdStore = false;
  function persist() {
    if (!spaceId || holdStore) return; // an aside remembers nothing
    try {
      localStorage.setItem(storeKey(spaceId), JSON.stringify(saved));
    } catch {
      // private mode: modules still work, they just do not remember where they were
    }
  }

  // The modules open now, in column order.
  // A join that was asked to open one item (from the dashboard) opens just that module, once, and does not
  // become the space's remembered layout: nothing is saved until the person opens or closes a module themselves.
  let openRequest = null;
  let keepLayout = false;
  let restoring = false;
  function snapshot() {
    if (suspended || !spaceId || keepLayout) return;
    saved.__open = [...opened.values()].sort((a, b) => a.order - b.order).map((p) => p.id);
    persist();
  }

  function remember(id, patch) {
    saved[id] = { ...(saved[id] || {}), ...patch };
    persist();
  }

  // --- floating: place, drag, resize ----------------------------------------

  function clampBox(box, win) {
    const maxW = Math.max(MIN_W, win.innerWidth - 16);
    const maxH = Math.max(MIN_H, win.innerHeight - 16);
    const w = Math.min(Math.max(box.w, MIN_W), maxW);
    const h = Math.min(Math.max(box.h, MIN_H), maxH);
    const x = Math.min(Math.max(box.x, 0), Math.max(0, win.innerWidth - w));
    const y = Math.min(Math.max(box.y, 0), Math.max(0, win.innerHeight - h));
    return { x, y, w, h };
  }

  function place(floater, box) {
    const win = floater.ownerDocument.defaultView || window;
    const b = clampBox(box, win);
    floater.style.left = `${b.x}px`;
    floater.style.top = `${b.y}px`;
    floater.style.width = `${b.w}px`;
    floater.style.height = `${b.h}px`;
    return b;
  }

  const currentBox = (floater) => ({ x: floater.offsetLeft, y: floater.offsetTop, w: floater.offsetWidth, h: floater.offsetHeight });
  const front = (floater) => { floater.style.zIndex = String(++z); };

  // --- snap: a floating module can snap to a grid over the canvas --------------
  // Floating is free by default (anywhere, any size). A module with `snap` on sits in the cells of a grid laid over
  // the canvas instead: dragged, it jumps from cell to cell; resized, it grows a cell at a time; and what is
  // remembered is its cells (`cell`: col, row, cols, rows), so it keeps its place in the grid when the window
  // changes size. Turning the grid on keeps a place the user dragged or resized (`layout: 'user'`, or a saved box
  // that does not sit on another). Windows still on a default spot are tiled so they do not stack. The grid is as many cells of about SNAP_CELL as the canvas fits (never fewer than one), gutter
  // SNAP_GAP, drawn (`.snap-grid`) only while a snapped module is being dragged. Docked and window are untouched.
  // The grid's pitch (a cell's width; a cell is 0.77 as tall) is the canvas's: the space bar's slider sets it, remembered with
  // the space's layout (`__snap.pitch`), beside the canvas-level switch (`__snap.all`) that snaps every floating module, now and later.
  const SNAP_PITCH = { min: 50, max: 320, step: 10, default: 130 };
  const snapPitch = () => { const p = Number(saved.__snap?.pitch); return p >= SNAP_PITCH.min && p <= SNAP_PITCH.max ? p : SNAP_PITCH.default; };
  const snapAllOn = () => Boolean(saved.__snap?.all);
  const snapping = (id) => snapAllOn() || Boolean(saved[id]?.snap);
  function snapGrid() {
    const win = canvasWin();
    const r = canvas.getBoundingClientRect();
    const s = r.width > 0 && r.height > 0 ? r : { left: 0, top: 0, width: win.innerWidth, height: win.innerHeight };
    return gridFor(s, snapPitch());
  }
  // The grid's arithmetic (cellBox, snapCell, leastSpan, clampCell, nearestFree, nextFree, tileFresh, resettle) is in snap-grid.js.
  // Put a snapped module in its cells (its remembered ones, or the ones nearest its box) and remember both. `placed` is the
  // box it was put in, kept apart from `box` so a change of grid size can go back to it (setSnapPitch leaves it alone).
  function settleSnap(id, floater, cell, { keepPlaced = false } = {}) {
    const g = snapGrid();
    const c = clampCell(g, cell || snapCell(g, currentBox(floater)));
    const box = place(floater, cellBox(g, c));
    remember(id, keepPlaced ? { cell: c, box } : { cell: c, box, placed: { x: box.x - g.x, y: box.y - g.y, w: box.w, h: box.h } });
    return box;
  }
  // The cells already taken by snapped modules that are not part of this layout pass.
  function takenCells(exceptIds) {
    const g = snapGrid();
    const taken = [];
    for (const p of opened.values()) {
      if (exceptIds.has(p.id) || !snapping(p.id)) continue;
      if (saved[p.id]?.cell) taken.push(clampCell(g, saved[p.id].cell));
    }
    return taken;
  }
  const overlapArea = (a, b) => {
    const w = Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x));
    const h = Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
    return w * h;
  };
  // A saved box from before this flag counts as a placement, unless those boxes sit on top of each other
  // (the old snap, or the default cascade). A box the user dragged is always a placement, even if it overlaps.
  function userPlaced(p, mods) {
    const rec = saved[p.id] || {};
    if (rec.layout === 'user') return true;
    if (rec.layout === 'auto' || !rec.box || !floaterOf(p)) return false;
    const box = currentBox(floaterOf(p));
    const area = box.w * box.h;
    if (!area) return false;
    for (const other of mods) {
      if (other.id === p.id || !floaterOf(other)) continue;
      const theirs = saved[other.id] || {};
      if (theirs.layout === 'auto' || !theirs.box) continue;
      if (overlapArea(box, currentBox(floaterOf(other))) > area * 0.45) return false;
    }
    return true;
  }
  // Snap a group. A module the user has placed keeps that place (the cells nearest where it is, clear of the
  // others). Modules still on a default spot are tiled, so a first visit to the grid does not stack them.
  function applySnapLayout(mods) {
    const g = snapGrid();
    const ids = new Set(mods.map((p) => p.id));
    const taken = takenCells(ids);
    const live = mods.filter((p) => floaterOf(p));
    const user = live.filter((p) => userPlaced(p, live));
    const fresh = live.filter((p) => !user.includes(p));
    for (const p of user) {
      const cell = nearestFree(g, snapCell(g, currentBox(floaterOf(p))), taken);
      settleSnap(p.id, floaterOf(p), cell);
      remember(p.id, { layout: 'user' });
      taken.push(cell);
    }
    const alone = fresh.length === 1 && !user.length && !taken.length;
    const cells = alone ? [snapCell(g, currentBox(floaterOf(fresh[0])))] : tileFresh(g, fresh.length, taken);
    fresh.forEach((p, i) => {
      settleSnap(p.id, floaterOf(p), cells[i]);
      remember(p.id, { layout: 'auto' });
    });
  }
  function paintSnap(mod, on) {
    for (const b of [mod.el, floaterOf(mod)].flatMap((el) => [...(el?.querySelectorAll?.('[data-snap]') || [])])) {
      b.classList.toggle('on', Boolean(on));
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  // A module opening while the grid is on: back to the cells the user left it in, or the next free spot.
  function snapOntoGrid(id, floater) {
    const rec = saved[id] || {};
    const g = snapGrid();
    const taken = takenCells(new Set([id]));
    if (rec.layout !== 'auto' && rec.cell) {
      settleSnap(id, floater, nearestFree(g, rec.cell, taken));
      return;
    }
    const least = leastSpan(g);
    settleSnap(id, floater, nextFree(g, taken, least.cols, least.rows) || nearestFree(g, { col: 0, row: 0, cols: least.cols, rows: least.rows }, taken));
    remember(id, { layout: 'auto' });
  }
  // The grid, drawn in the layer while a snapped module moves.
  function showGrid(layer, g) {
    let grid = layer.querySelector('.snap-grid');
    if (!grid) {
      grid = layer.ownerDocument.createElement('div');
      grid.className = 'snap-grid';
      layer.appendChild(grid);
    }
    grid.style.left = `${g.x}px`;
    grid.style.top = `${g.y}px`;
    grid.style.width = `${g.w}px`;
    grid.style.height = `${g.h}px`;
    grid.style.setProperty('--snap-cw', `${g.cw}px`);
    grid.style.setProperty('--snap-ch', `${g.ch}px`);
    layer.classList.add('snapping');
  }
  const hideGrid = (layer) => layer.classList.remove('snapping');
  // The box a module floats in (an installed module's is its own element; a built-in module's is around it).
  const floaterOf = (mod) => (mod.kind === 'builtin' ? mod.floatEl : mod.mode === 'float' ? mod.el : null);
  function setSnap(id, on) {
    const mod = opened.get(id);
    const floater = mod && floaterOf(mod);
    if (!floater) return;
    remember(id, { snap: Boolean(on) });
    if (on) applySnapLayout([mod]);
    paintSnap(mod, on);
  }
  // The canvas-level switch. On: every module that can float does -- the docked ones are floated first, their docked mode
  // remembered (`__snap.before`) -- and snaps, each one's own switch following; any module opened later floats and snaps too
  // (preferredMode, api_openBuiltin). Off: the modules that were docked when it went on go back to docked, the rest stay floating,
  // free again. A module on a narrow canvas (a phone) is left docked either way: it has no room to float.
  function setSnapAll(on) {
    const snap = saved.__snap || {};
    if (on) {
      const before = { ...(snap.before || {}) };
      // Remembered in column order, so turning the switch off docks them back in it. A waiting module already floats; it
      // wanted a column, so it docks again (or waits again) when the switch goes off.
      const columns = isNarrow() ? [] : [...opened.values()].filter((p) => wantsColumn(p) && supports(p, 'float')).sort(byOrder).map((p) => p.id);
      for (const id of columns) before[id] = 'dock';
      for (const id of columns) {
        const p = opened.get(id);
        if (p?.waiting) { p.waiting = false; remember(id, { mode: 'float' }); }
      }
      for (const id of columns) if (opened.get(id)?.mode === 'dock') setMode(id, 'float');
      saved.__snap = { ...snap, all: true, before };
      persist();
      const mods = [...opened.values()].filter((p) => floaterOf(p));
      for (const p of mods) remember(p.id, { snap: true });
      applySnapLayout(mods);
      for (const p of mods) paintSnap(p, true);
      return;
    }
    saved.__snap = { ...snap, all: false, before: {} };
    persist();
    for (const p of [...opened.values()]) if (floaterOf(p)) setSnap(p.id, false);
    // Back to docked through the fit: what the window has no room for waits, named in one note.
    const was = new Set([...opened.values()].filter((p) => p.waiting).map((p) => p.id));
    hush += 1;
    try {
      for (const [id, mode] of Object.entries(snap.before || {})) {
        const p = opened.get(id);
        if (p && p.mode === 'float' && supports(p, mode)) setMode(id, mode);
      }
    } finally { hush -= 1; }
    tellWaiting([...opened.values()].filter((p) => p.waiting && !was.has(p.id)).sort(byOrder).map((p) => p.id));
  }
  // The space bar's "dock all": every floating module that can be a column goes back beside the call. The canvas-level snap
  // goes off first (it would float a module again the moment it opened), with nothing remembered to restore, since docked is
  // where everything is now. A module in a window of its own, and one that can only float, are left alone.
  // Through the fit (plan-docked-limit.md): what the window holds gets a column, in column order; the rest wait, floating,
  // and the panel's note says how many. Answers { docked, waiting }: how many of them docked, and how many wait now.
  function dockAll() {
    if (snapAllOn()) {
      saved.__snap = { ...(saved.__snap || {}), all: false, before: {} };
      persist();
      for (const p of opened.values()) if (floaterOf(p)) setSnap(p.id, false);
    }
    if (isNarrow()) { update(); return { docked: 0, waiting: 0 }; }
    // The conference and the chat first (they always have a column), then the others in the order they opened.
    const tried = [...opened.values()].filter((p) => p.mode === 'float' && !p.waiting && supports(p, 'dock'))
      .sort((a, b) => (a.kind === 'builtin' ? 0 : 1) - (b.kind === 'builtin' ? 0 : 1) || byOrder(a, b)).map((p) => p.id);
    hush += 1;
    try {
      for (const id of tried) setMode(id, 'dock');
    } finally { hush -= 1; }
    syncDock();
    update();
    const docked = tried.filter((id) => opened.get(id)?.mode === 'dock').length;
    const waiting = [...opened.values()].filter((p) => p.waiting).length;
    if (waiting) note(`${docked} docked. ${waiting} ${waiting === 1 ? 'stays' : 'stay'} floating until the window is wide enough.`);
    else note('');
    return { docked, waiting };
  }
  // Clean up (the Layout panel's Arrange section): every floating module on this canvas, in this window, moved fully onto
  // the canvas and apart. Snapped ones go to the grid's nearest free cells, keeping their size in cells wherever a place
  // for it exists, only one with no place made smaller (snap-grid.js's tidyCells); free ones are placed around them (tidyBoxes), keeping their
  // size where it fits, in the order they were opened. Docked modules and modules in their own window are left alone.
  // Remembered as a drag is (`layout: 'user'`). Answers how many moved.
  function cleanUp() {
    if (isNarrow()) return 0;
    const doc = canvasDoc();
    const mods = [...opened.values()].filter((p) => floaterOf(p) && floaterOf(p).ownerDocument === doc).sort((a, b) => a.order - b.order);
    if (!mods.length) return 0;
    const snapped = mods.filter((p) => snapping(p.id));
    const free = mods.filter((p) => !snapping(p.id));
    const taken = [];
    if (snapped.length) {
      const g = snapGrid();
      const cells = tidyCells(g, snapped.map((p) => ({ id: p.id, cell: snapCell(g, currentBox(floaterOf(p))) })));
      for (const p of snapped) {
        taken.push(settleSnap(p.id, floaterOf(p), cells.get(p.id)));
        remember(p.id, { layout: 'user' });
      }
    }
    if (free.length) {
      const g = snapGrid(); // the canvas's box, in the layer's coordinates
      const area = { x: g.x + TIDY_GAP, y: g.y + TIDY_GAP, w: g.w - 2 * TIDY_GAP, h: g.h - 2 * TIDY_GAP };
      const boxes = tidyBoxes(free.map((p) => ({ id: p.id, box: currentBox(floaterOf(p)) })), area, taken);
      for (const p of free) {
        const floater = floaterOf(p);
        place(floater, boxes.get(p.id));
        remember(p.id, { box: currentBox(floater), layout: 'user' });
      }
    }
    return mods.length;
  }
  // The grid's size, from the space bar's slider: every snapped module is re-settled into the cells nearest the box it was
  // put in (`placed`), so it keeps about its size in pixels, not its count of cells, and none sits on another where the canvas
  // has room (snap-grid.js's resettle). Going back to the old size gives back the old boxes. While the slider moves
  // (`preview`) the grid shows, so the size can be seen, and the modules already sit where letting go leaves them.
  function setSnapPitch(px, { preview = false } = {}) {
    const pitch = Math.min(SNAP_PITCH.max, Math.max(SNAP_PITCH.min, Math.round(Number(px) || SNAP_PITCH.default)));
    holdStore = true;
    try { resnap(pitch); } finally { holdStore = false; }
    if (!preview) persist(); // stored once, when the slider is let go (a key press is a let go too)
    const layer = layerFor(canvasDoc());
    if (preview) showGrid(layer, snapGrid()); else hideGrid(layer);
  }
  function resnap(pitch) {
    const before = snapGrid();
    const snapped = [...opened.values()].filter((p) => floaterOf(p) && snapping(p.id));
    // A module snapped before `placed` was kept starts from where it is now, on the grid it is on now.
    for (const p of snapped) {
      if (saved[p.id]?.placed) continue;
      const b = currentBox(floaterOf(p));
      remember(p.id, { placed: { x: b.x - before.x, y: b.y - before.y, w: b.w, h: b.h } });
    }
    saved.__snap = { ...(saved.__snap || {}), pitch };
    const g = snapGrid();
    const cells = resettle(g, snapped.map((p) => {
      const b = saved[p.id].placed;
      return { id: p.id, box: { x: g.x + b.x, y: g.y + b.y, w: b.w, h: b.h } };
    }));
    for (const p of snapped) settleSnap(p.id, floaterOf(p), cells.get(p.id), { keepPlaced: true });
  }

  // Drag a floating module by `handle`, resize it by `grip`. A snapped module moves and grows by whole cells.
  function wireFloating(id, floater, handle, grip) {
    const layer = floater.parentNode;
    let drag = null;
    const begin = (kind) => (event) => {
      if (event.target.closest('button, input, textarea, a')) return;
      event.preventDefault();
      drag = { kind, sx: event.clientX, sy: event.clientY, box: currentBox(floater), grid: snapping(id) ? snapGrid() : null };
      layer.classList.add('dragging'); // frames swallow pointer events; switch them off while dragging
      if (drag.grid) showGrid(layer, drag.grid);
      event.currentTarget.setPointerCapture?.(event.pointerId);
    };
    const move = (event) => {
      if (!drag) return;
      const dx = event.clientX - drag.sx;
      const dy = event.clientY - drag.sy;
      const b = { ...drag.box };
      if (dx || dy) drag.moved = true;
      if (drag.kind === 'move') { b.x += dx; b.y += dy; } else { b.w += dx; b.h += dy; }
      place(floater, drag.grid ? cellBox(drag.grid, snapCell(drag.grid, b)) : b);
    };
    const end = () => {
      if (!drag) return;
      const g = drag.grid;
      const moved = drag.moved;
      drag = null;
      if (moved) settleWaiting(id); // a waiting module the person moves is floating by their choice
      layer.classList.remove('dragging');
      hideGrid(layer);
      if (g) {
        settleSnap(id, floater, snapCell(g, currentBox(floater)));
        remember(id, { layout: 'user' });
      } else remember(id, { box: currentBox(floater), layout: 'user' });
    };
    for (const [el, kind] of [[handle, 'move'], [grip, 'size']]) {
      el.addEventListener('pointerdown', begin(kind));
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    }
    floater.addEventListener('pointerdown', () => front(floater));
  }

  // --- docked: columns of the grid ------------------------------------------

  const dockedModules = () => [...opened.values()].filter((p) => p.mode === 'dock').sort((a, b) => a.order - b.order);

  const maxDock = () => Math.max(DOCK_MIN, Math.round(canvas.clientWidth * 0.6));
  const clampDock = (w) => Math.min(Math.max(Math.round(w), DOCK_MIN), maxDock());

  // --- how many columns fit (plan-docked-limit.md) ----------------------------------------------------------------
  // A module whose remembered mode is dock wants a column. snap-grid.js's fitDock() says which get one at the canvas's
  // width: the conference and the chat always, installed modules from the left until the window is full. The rest are
  // waiting (`mod.waiting`): shown floating, their remembered mode still dock, and docked again, in their old place in the
  // column order, as soon as the canvas is wide enough. Dragging or resizing a waiting module makes it floating for good.
  const wantsColumn = (p) => p.mode === 'dock' || Boolean(p.waiting);
  const byOrder = (a, b) => a.order - b.order;
  const dockWidthOf = (p) => p.width ?? clampDock(saved[p.id]?.dockW || p.m?.canvas?.width || p.def?.width || 320);
  const columnsOf = (mods) => mods.slice().sort(byOrder).map((p) => ({ id: p.id, width: dockWidthOf(p), flex: Boolean(p.def?.flex), keep: p.kind === 'builtin' }));
  // The canvas's width; while it is hidden (the space list shown over a running call), the last width it had.
  let fitWidth = 0;
  const canvasWidth = () => { if (canvas.clientWidth > 0) fitWidth = canvas.clientWidth; return fitWidth; };
  // fitDock() over every module wanting a column now, and `extra` (one about to dock).
  const planColumns = (extra = []) => fitDock(canvasWidth(), columnsOf([...opened.values()].filter(wantsColumn).concat(extra)));
  // Whether a module about to dock would get a column, or wait.
  const wouldWait = (p) => !isNarrow() && planColumns([{ ...p, order: order + 1, mode: 'dock', waiting: false }]).waiting.includes(p.id);

  // No note while the layout is put back on entering, a canvas pops out or back, or the window is resized: the change is
  // in front of the person, or is not theirs.
  let hush = 0;
  const quiet = () => hush > 0 || restoring || suspended;
  const nameOf = (id) => opened.get(id)?.m?.name || available.find((x) => x.id === id)?.name || builtins.get(id)?.name || id;
  let noteTimer = null;
  let noteAt = 0;
  function note(text) {
    clearTimeout(noteTimer);
    noteAt = Date.now();
    onNote?.(text);
    if (text) noteTimer = setTimeout(() => onNote?.(''), 6000);
  }
  function tellWaiting(ids) {
    if (!ids.length || quiet()) return;
    const names = ids.map(nameOf);
    const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
    note(names.length === 1
      ? `The window is too narrow for another column, so ${list} is floating. It docks when the window is wide enough.`
      : `The window is too narrow for another column, so ${list} are floating. They dock when the window is wide enough.`);
  }

  // A waiting module with no remembered box is placed tidily around the other floating modules.
  function placeWaiting(mod) {
    if (saved[mod.id]?.box || snapping(mod.id)) return;
    const doc = canvasDoc();
    const g = snapGrid();
    const area = { x: g.x + TIDY_GAP, y: g.y + TIDY_GAP, w: g.w - 2 * TIDY_GAP, h: g.h - 2 * TIDY_GAP };
    const taken = [...opened.values()].filter((p) => p !== mod && floaterOf(p) && floaterOf(p).ownerDocument === doc).map((p) => currentBox(floaterOf(p)));
    const box = tidyBoxes([{ id: mod.id, box: currentBox(mod.el) }], area, taken).get(mod.id);
    if (box) place(mod.el, box);
  }
  // A docked module gives up its column and waits, floating, in its place in the column order.
  function startWaiting(p) {
    const { order: keepOrder, width } = p;
    moveModule(p.id, 'float');
    const mod = opened.get(p.id);
    Object.assign(mod, { order: keepOrder, waiting: true, width });
    placeWaiting(mod);
  }
  // A waiting module docks again, in its old place in the column order, at its remembered width.
  function stopWaiting(p) {
    const { order: keepOrder, width } = p;
    moveModule(p.id, 'dock');
    const mod = opened.get(p.id);
    mod.order = keepOrder;
    // Its own width, not the one a narrower canvas would clamp it to on the way back (none on a narrow one: no columns).
    if (width) mod.width = isNarrow() ? width : clampDock(width);
  }
  // Fit the columns to the canvas: modules past the limit wait, waiting ones that now fit dock. Answers the ids that
  // started waiting. Not while a fit is already moving modules (moving one calls syncDock again), nor on a hidden canvas.
  let fitting = false;
  function fitColumns() {
    // While modules are being opened or closed together (entering, leaving, popping out), the fit waits for the end.
    if (fitting || suspended || canvas.clientWidth <= 0) return [];
    fitting = true;
    const started = [];
    try {
      const waits = new Set(planColumns().waiting);
      for (const p of [...opened.values()].sort(byOrder)) {
        if (p.kind !== 'module') continue; // the conference and the chat always have a column (fitDock's `keep`)
        if (p.mode === 'dock' && waits.has(p.id)) { startWaiting(p); started.push(p.id); }
        else if (p.waiting && !waits.has(p.id)) stopWaiting(p);
      }
    } finally {
      fitting = false;
    }
    tellWaiting(started);
    return started;
  }
  // A floating module's Dock button: unavailable while it waits, and while the columns are full (so a press never stores
  // a dock it cannot show). The conference and the chat always have a column, so theirs always works.
  function paintDockButtons() {
    const full = !isNarrow() && [...opened.values()].filter(wantsColumn).length >= dockLimit(canvasWidth());
    for (const p of opened.values()) {
      if (p.kind !== 'module' || p.mode !== 'float' || !p.el) continue;
      p.el.toggleAttribute('data-waiting', Boolean(p.waiting));
      const b = p.el.querySelector('[data-mode="dock"]');
      if (!b) continue;
      const off = Boolean(p.waiting) || full;
      if (off) b.setAttribute('aria-disabled', 'true'); else b.removeAttribute('aria-disabled');
      b.title = p.waiting ? 'Docks when the window is wide enough' : full ? 'The window is too narrow for another column' : 'Dock beside the video';
    }
  }
  // A waiting module dragged or resized by the person floats for good.
  function settleWaiting(id) {
    const mod = opened.get(id);
    if (!mod?.waiting) return;
    mod.waiting = false;
    remember(id, { mode: 'float' });
    paintDockButtons();
    snapshot();
  }

  // Docked modules are the columns, in order: the conference, the chat, then modules. One
  // column is flexible and takes what is left: the conference when it is docked, else the
  // first docked module, so the canvas is never left with an empty column. The others keep
  // their widths while they fit, and shrink in step when they do not, none below DOCK_MIN (fitDock); a module past the
  // limit waits, floating (fitColumns). On a narrow canvas CSS takes over (see architecture-canvas).
  function syncDock() {
    fitColumns();
    const docked = dockedModules();
    // The narrow layout keys off this, as it does off chat-open.
    canvas.classList.toggle('module-open', docked.some((p) => p.kind === 'module'));
    syncView();
    for (const p of opened.values()) p.el.classList?.remove('is-flex');
    for (const p of docked) for (const el of p.parts()) el.style.gridColumn = '';
    if (canvasEmpty) canvasEmpty.hidden = opened.size > 0;
    paintDockButtons();
    if (isNarrow() || !docked.length) {
      canvas.style.removeProperty('--canvas-cols');
      return;
    }
    const flex = docked.find((p) => p.def?.flex) || docked[0];
    flex.el.classList.add('is-flex');
    // Each module keeps the width it was given for when there is room again; only what is shown shrinks.
    const { widths } = fitDock(canvasWidth(), columnsOf(docked));
    canvas.style.setProperty('--canvas-cols', docked.map((p) => (p === flex ? 'minmax(0, 1fr)' : `${widths.get(p.id) ?? DOCK_MIN}px`)).join(' '));
    docked.forEach((p, i) => { for (const el of p.parts()) el.style.gridColumn = String(1 + i); });
  }

  // When the fixed columns together are wider than the canvas allows, syncDock shows them squeezed in step
  // and the conference at its minimum. A drag would then change a stored width that is not what is on
  // screen, so the conference never moved. Called as a drag starts: each fixed module takes the width it is
  // showing, so the drag moves what the person sees (narrowing one gives the room to the conference).
  function settleDock() {
    const docked = dockedModules();
    if (isNarrow() || docked.length < 2) return;
    const flex = docked.find((p) => p.def?.flex) || docked[0];
    const fixed = docked.filter((p) => p !== flex);
    const total = fixed.reduce((sum, p) => sum + p.width, 0);
    if (total <= canvasWidth() - FLEX_MIN) return;
    const { widths } = fitDock(canvasWidth(), columnsOf(docked));
    for (const p of fixed) p.width = widths.get(p.id) ?? DOCK_MIN;
  }

  // Widening a column when there is no room left takes the width from the other fixed columns (each down to
  // its minimum), not by squeezing the one being dragged; the conference keeps what it has.
  function takeWidthFromOthers(mod) {
    const docked = dockedModules();
    if (isNarrow() || docked.length < 2) return;
    const flex = docked.find((p) => p.def?.flex) || docked[0];
    if (mod === flex) return;
    const fixed = docked.filter((p) => p !== flex);
    const others = fixed.filter((p) => p !== mod);
    const excess = fixed.reduce((sum, p) => sum + p.width, 0) - Math.max(DOCK_MIN, canvasWidth() - FLEX_MIN);
    if (excess <= 0) return;
    const spare = others.reduce((sum, p) => sum + Math.max(0, p.width - DOCK_MIN), 0);
    if (spare <= 0) return;
    const take = Math.min(excess, spare);
    for (const p of others) p.width -= Math.round(take * (Math.max(0, p.width - DOCK_MIN) / spare));
  }

  // Reordering the columns: drag a docked module by its titlebar. The module's column follows the pointer as the others make way, so the
  // order is what the person sees; it is remembered with the layout. Buttons in the bar are left alone, and a press that does not move
  // is a click as before.
  function wireReorder(head, current) {
    if (!head || wired.has(head)) return;
    wired.add(head);
    head.classList.add('reorderable');
    let drag = null;
    head.addEventListener('pointerdown', (event) => {
      const mod = current();
      if (!mod || mod.mode !== 'dock' || isNarrow() || event.button !== 0 || event.target.closest('button, a, input, select, textarea, [data-close]')) return;
      drag = { id: event.pointerId, x: event.clientX, started: false };
    });
    head.addEventListener('pointermove', (event) => {
      const mod = current();
      if (!drag || event.pointerId !== drag.id || !mod) return;
      if (!drag.started) {
        if (Math.abs(event.clientX - drag.x) < 6) return;
        drag.started = true;
        head.setPointerCapture?.(event.pointerId);
        canvas.classList.add('reordering');
        for (const el of mod.parts()) el.classList.add('module-lifted');
      }
      const docked = dockedModules();
      const at = docked.indexOf(mod);
      const cols = getComputedStyle(canvas).gridTemplateColumns.split(' ').map(parseFloat);
      if (at < 0 || cols.length !== docked.length || cols.some((w) => !Number.isFinite(w))) return;
      // Where the pointer is among the other columns, as they would sit without this one: each other column's midpoint in that row.
      const others = docked.map((p, i) => ({ p, w: cols[i] })).filter((c) => c.p !== mod);
      let x = canvas.getBoundingClientRect().left;
      let target = 0;
      for (const c of others) {
        if (event.clientX > x + c.w / 2) target += 1;
        x += c.w;
      }
      if (target === at) return;
      const values = docked.map((p) => p.order).sort((a, b) => a - b);
      const next = others.map((c) => c.p);
      next.splice(target, 0, mod);
      next.forEach((p, i) => { p.order = values[i]; });
      syncDock();
      update();
    });
    const stop = (event) => {
      if (!drag || event.pointerId !== drag.id) return;
      const moved = drag.started;
      drag = null;
      if (!moved) return;
      canvas.classList.remove('reordering');
      for (const p of opened.values()) for (const el of p.parts()) el.classList.remove('module-lifted');
      // The release would otherwise count as a click on something in the bar.
      const swallow = (ev) => { ev.stopPropagation(); ev.preventDefault(); };
      head.addEventListener('click', swallow, { capture: true, once: true });
      setTimeout(() => head.removeEventListener('click', swallow, { capture: true }), 100);
    };
    head.addEventListener('pointerup', stop);
    head.addEventListener('pointercancel', stop);
  }

  // `current` returns the module the handle belongs to right now (a built-in module is a new object each time it opens).
  function wireDockResize(current, handle) {
    let drag = null;
    handle.addEventListener('pointerdown', (event) => {
      const mod = current();
      if (!mod) return;
      event.preventDefault();
      settleDock();
      drag = { sx: event.clientX, w: mod.width };
      handle.classList.add('dragging');
      canvas.classList.add('resizing-dock'); // frames swallow the pointer while dragging
      handle.setPointerCapture?.(event.pointerId);
    });
    handle.addEventListener('pointermove', (event) => {
      const mod = current();
      if (!drag || !mod) return;
      mod.width = clampDock(drag.w + (drag.sx - event.clientX)); // the column is on the right: dragging left widens it
      takeWidthFromOthers(mod);
      syncDock();
    });
    const stop = () => {
      const mod = current();
      if (!drag || !mod) return;
      drag = null;
      handle.classList.remove('dragging');
      canvas.classList.remove('resizing-dock');
      remember(mod.id, { dockW: mod.width });
      mod.onWidth?.(mod.width);
    };
    handle.addEventListener('pointerup', stop);
    handle.addEventListener('pointercancel', stop);
  }

  // --- installed modules -------------------------------------------------------

  const moduleHeader = (m, mode, canDock, canFloat, snap = false) => `
    <span class="mod-title"><i class="fa-solid fa-${escapeHtml(m.icon)} fa-fw" aria-hidden="true"${tintAttr(m.id)}></i> <span data-title>${escapeHtml(m.name)}</span></span>
    <span class="mod-header-tools"><span class="titlebar-custom" data-header-custom></span><button class="sdk-more" data-module-menu type="button" title="More" aria-label="More" aria-haspopup="menu"><i class="fa-solid fa-ellipsis-vertical fa-fw" aria-hidden="true"></i></button>${toolsHtml({ mode, canDock, canFloat, snap })}</span>`;

  // An installed module's place on the canvas: a frame for a sandboxed module, an element of its own for one that runs in the page.
  const holder = (m, cls) => (m.runMode === 'page'
    ? `<div class="module-root ${cls}" data-module-root="${escapeHtml(m.id)}"></div>`
    : `<iframe class="${cls}" title="${escapeHtml(m.name)}"></iframe>`);

  // onBar and onResize are wired the same way regardless of which mode a module opened in, and read
  // the module's *current* element and mode rather than the one it was mounted with (`mod.el`, `mod.mode`):
  // that is what lets moveModule, below, hand a mount that started in one mode on to the other without
  // remounting it. has-bar only styles the docked layout; onResize only remembers a size while floating.
  function mountFor(mod, frame, bar, extra = {}) {
    const m = mod.m;
    return mountModule({
      module: { id: m.id, version: m.version, scope: m.scope },
      ...(frame.tagName === 'IFRAME' ? { frame } : { container: frame }),
      bar,
      header: mod.el.querySelector('[data-header-custom]'),
      toolbar: mod.el.querySelector('[data-toolbar]'),
      onOpenRef: openRef,
      // A request for an action waits for the page of the module that carries it: open that module if it is on here.
      onOpenModule: (id) => { const target = available.find((x) => x.id === id); if (target && !opened.has(id)) openModule(target); },
      onChatAsk,
      scope: 'space',
      spaceId,
      guestToken,
      entry: m.canvas.entry,
      onTitle: (title) => { mod.el.querySelector('[data-title]').textContent = title || m.name; },
      onBar: (has) => mod.el.classList.toggle('has-bar', has),
      onToolbar: (has) => mod.el.classList.toggle('has-toolbar', has),
      onResize: ({ width, height } = {}) => {
        if (mod.mode !== 'float') return;
        const b = currentBox(mod.el);
        if (Number.isFinite(width)) b.w = width;
        if (Number.isFinite(height)) b.h = height + HEAD_H;
        if (snapping(m.id)) { const g = snapGrid(); settleSnap(m.id, mod.el, snapCell(g, b)); remember(m.id, { layout: 'user' }); return; }
        remember(m.id, { box: place(mod.el, b), layout: 'user' });
      },
      ...extra,
    });
  }

  // `reuse` (from moveModule) carries a frame/container, bar, toolbar and header-buttons span already
  // mounted in the other mode's chrome: they are moved into the new chrome instead of built fresh, so the
  // module inside keeps running and keeps whatever it was holding (a conversation, a draft, ...) rather
  // than being torn down and started over. Only the class that lays each one out changes.
  function openModuleFloating(m, reuse) {
    const doc = canvasDoc();
    const floater = doc.createElement('section');
    floater.className = 'module-floating';
    floater.dataset.module = m.id;
    floater.innerHTML = `
      <header class="mod-header module-floating-head">${moduleHeader(m, 'float', supports({ modes: m.canvas.mode }, 'dock') && !isNarrow(), true, snapping(m.id))}</header>
      <div class="mod-toolbar" data-toolbar hidden></div>
      ${reuse ? '<div class="reuse-slot frame-slot"></div>' : holder(m, 'module-floating-frame')}
      <div class="module-floating-bar" hidden></div>
      <span class="module-floating-grip" title="Drag to resize"></span>`;
    layerFor(doc).appendChild(floater);
    const index = [...opened.values()].filter((p) => p.mode === 'float').length;
    const win = canvasWin();
    place(floater, saved[m.id]?.box || {
      w: m.canvas.width,
      h: m.canvas.height + HEAD_H,
      x: win.innerWidth - m.canvas.width - 24 - index * 28,
      y: 70 + index * 28,
    });
    if (snapping(m.id)) snapOntoGrid(m.id, floater);
    front(floater);
    const mod = { id: m.id, kind: 'module', mode: 'float', m, el: floater, modes: m.canvas.mode, order: ++order, parts: () => [] };
    if (reuse) {
      reuse.frame.className = reuse.frame.classList.contains('module-root') ? 'module-root module-floating-frame' : 'module-floating-frame';
      floater.querySelector('.frame-slot').replaceWith(reuse.frame);
      reuse.bar.className = 'module-floating-bar';
      floater.querySelector('.module-floating-bar').replaceWith(reuse.bar);
      floater.querySelector('[data-header-custom]').replaceWith(reuse.headerCustom);
      floater.querySelector('[data-toolbar]').replaceWith(reuse.toolbar);
      mod.mount = reuse.mount;
    } else {
      mod.mount = mountFor(mod, floater.querySelector('iframe, .module-root'), floater.querySelector('.module-floating-bar'));
    }
    opened.set(m.id, mod);
    wireFloating(m.id, floater, floater.querySelector('.module-floating-head'), floater.querySelector('.module-floating-grip'));
    wireHeader(floater, mod);
  }

  function openModuleDocked(m, reuse) {
    const doc = canvasDoc();
    const section = doc.createElement('section');
    section.className = 'module module-docked';
    section.dataset.module = m.id;
    section.innerHTML = `
      <div class="dock-resize" title="Drag to resize"></div>
      <div class="mod-content dock-content">
        <header class="mod-header">${moduleHeader(m, 'dock', false, true)}</header>
        <div class="mod-toolbar" data-toolbar hidden></div>
        ${reuse ? '<div class="reuse-slot frame-slot"></div>' : holder(m, 'dock-frame')}
      </div>
      <div class="mod-bar dock-bar" hidden></div>`;
    canvas.appendChild(section);
    const mod = {
      id: m.id, kind: 'module', mode: 'dock', m, el: section, modes: m.canvas.mode, order: ++order,
      width: clampDock(saved[m.id]?.dockW || m.canvas.width),
      parts: () => [...section.children],
    };
    if (reuse) {
      reuse.frame.className = reuse.frame.classList.contains('module-root') ? 'module-root dock-frame' : 'dock-frame';
      section.querySelector('.frame-slot').replaceWith(reuse.frame);
      reuse.bar.className = 'mod-bar dock-bar';
      section.querySelector('.dock-bar').replaceWith(reuse.bar);
      section.querySelector('[data-header-custom]').replaceWith(reuse.headerCustom);
      section.querySelector('[data-toolbar]').replaceWith(reuse.toolbar);
      mod.mount = reuse.mount;
      // The bar's own onBar callback only fires on the next change; a bar or toolbar already showing needs this now.
      section.classList.toggle('has-bar', !reuse.bar.hidden);
      section.classList.toggle('has-toolbar', !reuse.toolbar.hidden);
    } else {
      // With a bar the module's content stops above the shared bottom row; without one it fills the column.
      mod.mount = mountFor(mod, section.querySelector('iframe, .module-root'), section.querySelector('.dock-bar'));
    }
    opened.set(m.id, mod);
    syncDock();
    wireDockResize(() => mod, section.querySelector('.dock-resize'));
    wireHeader(section, mod);
    wireReorder(section.querySelector('.mod-header'), () => opened.get(m.id));
  }

  // Switch an installed module between docked and floating without the module inside noticing: pull its frame
  // (or in-page container), its action bar, toolbar and header buttons out of the old chrome and into the
  // new one, then drop the emptied-out old chrome. Leaving for a window is a real new page, so that keeps
  // going through closeModule + popOut instead (see setMode).
  function moveModule(id, mode) {
    const mod = opened.get(id);
    const m = mod.m;
    const reuse = {
      frame: mod.el.querySelector('iframe, .module-root'),
      bar: mod.el.querySelector('.dock-bar, .module-floating-bar'),
      headerCustom: mod.el.querySelector('[data-header-custom]'),
      toolbar: mod.el.querySelector('[data-toolbar]'),
      mount: mod.mount,
    };
    const titleText = mod.el.querySelector('[data-title]')?.textContent || '';
    const old = mod.el;
    opened.delete(id);
    if (mode === 'dock') openModuleDocked(m, reuse); else openModuleFloating(m, reuse);
    old.remove();
    if (titleText) opened.get(id).el.querySelector('[data-title]').textContent = titleText;
    // The move took the module's box out of the page and back, which drops an open editor window (a modal <dialog>,
    // host.ui.editor) out of the top layer: the module's SDK shows it again on this event.
    opened.get(id).mount?.deliver('moved', { mode });
  }

  // --- built-in modules (the conference and the chat) ---------------------------
  // The module's DOM already exists in the page; moving it between the canvas's grid,
  // a floating box and a window keeps everything wired to it (a node moved to
  // another document keeps its listeners).

  const wired = new WeakSet();

  // `opts.moving`: the module is only changing where it is shown, not opening or closing, so
  // its owner (the conference: a call) is told not to start or stop anything.
  function openBuiltinIn(def, mode, opts = {}) {
    if (def.allowed && !def.allowed()) return false;
    if (mode !== 'dock' && def.modes && !def.modes.includes(mode)) mode = 'dock';
    if (mode === 'window') return openBuiltinWindow(def, opts);
    const doc = canvasDoc();
    const el = def.el;
    const mod = {
      id: def.id, kind: 'builtin', mode, def, el, modes: def.modes || ['dock', 'float'], order: def.order,
      width: clampDock(saved[def.id]?.dockW || def.width || 320),
      onWidth: def.onWidth,
      parts: () => [...el.children],
    };
    if (mode === 'dock') {
      canvas.appendChild(el);
      el.hidden = false;
      const handle = el.querySelector('.chat-resize');
      if (handle && !wired.has(handle)) {
        wired.add(handle);
        wireDockResize(() => opened.get(def.id), handle);
      }
      wireReorder(el.querySelector('header'), () => opened.get(def.id));
    } else {
      const floater = doc.createElement('section');
      floater.className = `module-floating builtin-floating ${def.id}-floating`;
      floater.dataset.module = def.id;
      floater.appendChild(wrapFor(def, el, doc));
      const grip = doc.createElement('span');
      grip.className = 'module-floating-grip';
      grip.title = 'Drag to resize';
      floater.appendChild(grip);
      layerFor(doc).appendChild(floater);
      el.hidden = false;
      const size = def.floatSize || { w: 340, h: 480 };
      place(floater, saved[def.id]?.box || { ...size, x: Math.max(8, canvasWin().innerWidth - size.w - 24), y: 70 });
      if (snapping(def.id)) snapOntoGrid(def.id, floater);
      front(floater);
      mod.floatEl = floater;
      wireFloating(def.id, floater, el.querySelector('header'), grip);
    }
    opened.set(def.id, mod);
    syncDock();
    decorateBuiltin(mod);
    def.onChange?.({ open: true, mode, moving: opts.moving });
    update();
    return true;
  }

  // The conference's tiles are styled by an ancestor `.canvas`, so out of the canvas's grid it
  // needs one of its own (`def.wrap` is its class); the chat needs nothing.
  function wrapFor(def, el, doc) {
    if (!def.wrap) return el;
    const wrap = doc.createElement('div');
    wrap.className = def.wrap;
    wrap.appendChild(el);
    return wrap;
  }

  // Add (or refresh) the mode buttons in the module's own header.
  function decorateBuiltin(mod) {
    const tools = mod.el.querySelector('.chat-tools, .conference-tools');
    if (!tools) return;
    tools.querySelectorAll('[data-mode], [data-popout]').forEach((b) => b.remove());
    const holder = tools.ownerDocument.createElement('span');
    tools.querySelectorAll('[data-snap]').forEach((b) => b.remove());
    holder.innerHTML = toolsHtml({ mode: mod.mode, canDock: true, canFloat: mod.modes.includes('float'), closable: false, snap: snapping(mod.id) });
    const close = tools.querySelector('#chat-close, [data-module-close]');
    for (const b of [...holder.children]) tools.insertBefore(b, close);
    for (const b of tools.querySelectorAll('[data-mode], [data-popout]')) {
      b.onclick = (event) => {
        event.stopPropagation();
        setMode(mod.id, b.dataset.mode || 'window');
      };
    }
    for (const b of tools.querySelectorAll('[data-snap]')) {
      b.onclick = (event) => {
        event.stopPropagation();
        setSnap(mod.id, !snapping(mod.id));
      };
    }
  }

  function openBuiltinWindow(def, opts = {}) {
    const size = saved[def.id]?.win || def.windowSize || { w: 380, h: 520 };
    const win = window.open('/popout.html', `app-${def.id}`, `popup,width=${size.w},height=${size.h}`);
    if (!win) return false;
    const mod = { id: def.id, kind: 'builtin', mode: 'window', def, el: def.el, win, modes: def.modes || ['dock', 'float'], order: def.order, parts: () => [] };
    opened.set(def.id, mod);
    const setup = () => {
      win.document.title = def.name;
      for (const sheet of document.querySelectorAll('link[rel="stylesheet"]')) win.document.head.appendChild(sheet.cloneNode(true));
      followTheme(win.document); // light or dark, and a changed theme, follow the call page's (brand.js)
      win.document.body.className = def.windowClass || 'chat-window';
      const grid = def.wrap ? wrapFor(def, def.el, win.document) : win.document.createElement('div');
      if (!def.wrap) {
        grid.className = 'chat-window-grid';
        grid.appendChild(def.el);
      }
      win.document.body.appendChild(grid);
      def.el.hidden = false;
      decorateBuiltin(mod);
      def.onWindow?.(win);
      // Popups the chat opens (emoji, formatting help) close on a click elsewhere.
      win.document.addEventListener('click', (e) => {
        for (const id of ['chat-help-popup', 'chat-emoji-popup', 'chat-command-menu']) {
          const p = win.document.getElementById(id);
          if (p && !p.hidden && !e.target.closest(`#${id}`) && !e.target.closest('#chat-help, #chat-emoji, #chat-command')) p.hidden = true;
        }
      });
      win.addEventListener('resize', () => {
        remember(def.id, { win: { w: win.innerWidth, h: win.innerHeight } });
        def.onWindowResize?.(win);
      });
      def.onChange?.({ open: true, mode: 'window', moving: opts.moving });
      update();
    };
    win.addEventListener('load', () => {
      setup();
      // Closing the window brings the module back into the page, in the mode it had before it left (docked or
      // floating), with whatever it holds untouched: a call keeps going, a chat keeps its draft. Closing the
      // window is not closing the module; a call is left with Hang up, a chat with its own close. Registered
      // only once the window has loaded: the blank page it starts as also fires pagehide, when it navigates
      // to the real one, and that must not count as the person closing it. The module the app closed itself
      // (closeBuiltin) is already gone from `opened` by the time its window's pagehide fires, so it stays closed.
      win.addEventListener('pagehide', () => {
        if (opened.get(def.id) !== mod) return;
        canvas.appendChild(def.el);
        def.el.hidden = true;
        def.el.classList.remove('is-flex');
        opened.delete(def.id);
        const back = saved[def.id]?.mode === 'float' && supports(mod, 'float') && !isNarrow() ? 'float' : 'dock';
        if (!openBuiltinIn(def, back, { moving: true })) {
          syncDock();
          def.onChange?.({ open: false, mode: 'window' });
        }
        update();
      });
    }, { once: true });
    return true;
  }

  function closeBuiltin(id, opts = {}) {
    const mod = opened.get(id);
    if (!mod) return;
    if (!restoring) keepLayout = false;
    const def = mod.def;
    opened.delete(id);
    if (mod.floatEl) mod.floatEl.remove();
    canvas.appendChild(def.el); // home again, before a window goes and takes it along
    def.el.hidden = true;
    def.el.classList.remove('is-flex');
    for (const el of def.el.children) el.style.gridColumn = '';
    if (mod.mode === 'window') mod.win.close();
    syncDock();
    def.onChange?.({ open: false, mode: mod.mode, moving: opts.moving });
    update();
  }

  // --- opening, closing, switching -------------------------------------------

  function preferredMode(p) {
    const want = saved[p.id]?.mode;
    // A phone shows one module at a time, docked below the conference strip like the chat; a module that cannot dock floats.
    if (isNarrow()) return supports(p, 'dock') ? 'dock' : 'float';
    if (snapAllOn() && supports(p, 'float')) return 'float'; // the canvas-level snap: every module that can float does, snapped
    if (want && supports(p, want)) return want;
    return supports(p, 'dock') ? 'dock' : 'float';
  }

  // On a narrow canvas (a phone) one view is shown at a time: the conference, the chat or a module. The others
  // stay open, only hidden, so the call keeps running (its microphone and camera as they were) while you read
  // the chat; a tab switches the view and never closes anything. `view` is the id being shown.
  let view = null;
  function syncView() {
    const narrow = isNarrow();
    const shown = [...opened.values()].filter((p) => p.mode === 'dock').map((p) => p.id);
    // With no conference (the admin turned it off), the chat is the view to start on.
    if (narrow && !shown.includes(view)) view = shown.includes('conference') ? 'conference' : shown.includes('chat') ? 'chat' : shown[shown.length - 1] || null;
    for (const p of opened.values()) {
      if (p.mode !== 'dock') continue;
      const hide = narrow && p.id !== view;
      for (const el of p.parts()) el.classList.toggle('narrow-hidden', hide);
    }
  }
  // Open, docked, and hidden on a narrow canvas because another view is shown.
  function hiddenByView(id) {
    const mod = opened.get(id);
    return Boolean(mod && mod.mode === 'dock' && isNarrow() && view !== id);
  }
  function setView(id) {
    if (!opened.has(id)) return;
    const mod = opened.get(id);
    if (mod.mode !== 'dock') {
      if (mod.el.classList && mod.mode === 'float') front(mod.el);
      return;
    }
    view = id;
    syncView();
    if (mod.kind === 'module') markModuleRead(id);
    update();
  }

  function openModule(m, mode) {
    if (!restoring) keepLayout = false;
    const p = { id: m.id, modes: m.canvas.mode, kind: 'module' };
    if (opened.has(m.id)) {
      const mod = opened.get(m.id);
      if (mod.mode === 'float') front(mod.el);
      return;
    }
    if (isNarrow()) view = m.id;
    mode ||= preferredMode(p);
    if (mode === 'dock' && !supports(p, 'dock')) mode = 'float';
    // One too many for the window: it takes the newest place in the column order, so it is the one that waits, floating.
    if (mode === 'dock' && wouldWait({ ...p, m })) {
      openModuleFloating(m);
      const mod = opened.get(m.id);
      Object.assign(mod, { waiting: true, width: Math.max(DOCK_MIN, Math.round(saved[m.id]?.dockW || m.canvas.width)) });
      placeWaiting(mod);
      tellWaiting([m.id]);
    } else if (mode === 'dock') openModuleDocked(m); else openModuleFloating(m);
    markModuleRead(m.id);
    update();
  }

  // Show an item in the module that owns it, here: open its module (if it is on in this space) and hand it
  // the pointer, which its own code turns into showing the item. the host knows nothing about the item.
  function openRef(ref) {
    const m = available.find((x) => x.id === ref.module);
    if (!m) return false;
    if (!opened.has(m.id)) openModule(m);
    const mod = opened.get(m.id);
    if (!mod || !mod.mount) return false;
    if (mod.mode === 'float') front(mod.el);
    mod.mount.deliver('objectopen', { ref });
    return true;
  }

  function closeModule(id) {
    const mod = opened.get(id);
    if (!mod) return;
    if (!restoring) keepLayout = false;
    if (mod.kind === 'builtin') return closeBuiltin(id);
    mod.mount.destroy();
    mod.el.remove();
    opened.delete(id);
    syncDock();
    update();
  }

  function closeAllModules() {
    for (const p of [...opened.values()]) if (p.kind === 'module') closeModule(p.id);
    if (menu && !inline()) setMenuOpen(false);
  }

  function setMode(id, mode) {
    const mod = opened.get(id);
    if (!mod) return;
    // A waiting module already wants its column; floating it is the person's choice, so it stops waiting.
    if (mod.waiting && mode === 'dock') return;
    if (mod.waiting && mode === 'float') { settleWaiting(id); update(); return; }
    if (mod.mode === mode) return;
    if (mod.kind === 'builtin') {
      const def = mod.def;
      const before = mod.mode;
      closeBuiltin(id, { moving: true });
      if (mode !== 'window') remember(id, { mode });
      // A window the browser refuses to open must not leave the module closed.
      if (!openBuiltinIn(def, mode, { moving: true })) openBuiltinIn(def, before, { moving: true });
      return;
    }
    if (mode !== 'window' && !supports(mod, mode)) return;
    const m = mod.m;
    if (mode === 'window') { closeModule(id); return popOut(m.id); }
    remember(id, { mode });
    // Docking one too many (not from its Dock button, which is unavailable then): it stays where it floats, and waits.
    if (mode === 'dock' && wouldWait(mod)) {
      Object.assign(mod, { waiting: true, order: ++order, width: dockWidthOf(mod) });
      tellWaiting([id]);
      update();
      return;
    }
    moveModule(id, mode);
    syncDock(); // a column given up may let a waiting module dock
    markModuleRead(m.id);
    update();
  }

  // A module's own window: the same page a server page uses, in this space's scope.
  const windows = new Map();
  function popOut(id) {
    const mod = opened.get(id);
    const m = mod?.m || available.find((x) => x.id === id);
    if (!m) return;
    const q = new URLSearchParams({ space: spaceId, popout: '1' });
    if (guestToken) q.set('guest', guestToken);
    const width = Math.max(320, Math.min(m.canvas.width, screen.availWidth));
    const height = Math.max(240, Math.min(m.canvas.height + HEAD_H, screen.availHeight));
    const win = window.open(`/modules/${encodeURIComponent(m.id)}?${q}`, `app-module-${m.id}`, `popup,width=${width},height=${height}`);
    if (!win) return;
    windows.set(m.id, win);
    if (mod) closeModule(m.id);
  }

  function wireHeader(el, mod) {
    el.querySelector('[data-close]').addEventListener('click', () => closeModule(mod.id));
    el.querySelector('[data-popout]').addEventListener('click', () => popOut(mod.id));
    el.querySelector('[data-mode]')?.addEventListener('click', (event) => {
      if (event.currentTarget.getAttribute('aria-disabled') === 'true') return; // the window has no room for another column
      setMode(mod.id, event.currentTarget.dataset.mode);
    });
    el.querySelector('[data-snap]')?.addEventListener('click', () => setSnap(mod.id, !snapping(mod.id)));
    el.querySelector('[data-module-menu]')?.addEventListener('click', (event) => {
      event.stopPropagation();
      openClearMenu(event.currentTarget, () => clearModuleData(mod));
    });
  }

  // Everything this module holds in this space. The conference and the chat are not modules, so they never get this.
  async function clearModuleData(mod) {
    const q = new URLSearchParams({ scope: 'space', space: spaceId });
    if (guestToken) q.set('guest', guestToken);
    try {
      const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
      if (tz) q.set('tz', tz);
    } catch { /* the server falls back */ }
    await api('DELETE', `/api/modules/${encodeURIComponent(mod.m.id)}/data?${q}`);
  }

  // The call moved to (or came back from) a window of its own. Module frames cannot
  // move between windows without reloading, and a frame's messages arrive in the
  // window it lives in, so each open module is opened again in the canvas's new
  // window, the same way it was. A floating chat is carried over; a docked one is
  // inside the canvas and goes with it.
  function canvasPopped() {
    suspended = true; // closing and reopening the modules is not a change of layout
    const doc = canvasDoc();
    const again = [...opened.values()].filter((p) => p.kind === 'module').sort(byOrder).map((p) => ({ m: p.m, mode: p.waiting ? 'dock' : p.mode }));
    for (const { m } of again) closeModule(m.id);
    for (const p of opened.values()) {
      if (p.kind === 'builtin' && p.mode === 'float' && p.floatEl) {
        layerFor(doc).appendChild(p.floatEl);
        place(p.floatEl, currentBox(p.floatEl));
      }
    }
    bindDoc(doc);
    for (const { m, mode } of again) openModule(m, isNarrow() ? undefined : mode);
    suspended = false;
    syncDock();
    update(); // the tab or switch for the view shown in this window's width
  }

  // Whether this person may open a module here: the conference and the chat by their own rule, any other by being on
  // in this space for them.
  function canOpenHere(id) {
    if (builtins.has(id)) {
      const def = builtins.get(id);
      return !def.allowed || def.allowed();
    }
    return available.some((m) => m.id === id);
  }

  // Open what this space starts with (plan-entering.md, "What opens on entering"): a fresh request, then the
  // remembered layout (never for a guest), then the space's own list, then the environment's list, then the chat and
  // every module on here without the conference (for a guest, the conference and the chat). See opens-with.js.
  function restore() {
    suspended = true;
    restoring = true;
    // A pending request to open one item wins, when the module is on for this space and the request is fresh.
    const request = openRequest && Date.now() - openRequest.at < 20000 && available.some((x) => x.id === openRequest.module) ? openRequest : null;
    openRequest = null;
    keepLayout = Boolean(request);
    // The space's default layout (plan-saved-layouts.md, decision 4): when what opens comes from the space's own Opens
    // with (a first visit, or a guest) and the space has one, it opens through loadLayout, modes and places included.
    // A person's remembered layout still wins after their first visit (plan-entering, decision 5).
    if (!request && spaceDefaultLayout && Array.isArray(spaceOpensWith) && (guestToken || !Array.isArray(saved.__open))) {
      restoring = false;
      suspended = false;
      loadLayout(spaceDefaultLayout);
      return;
    }
    const want = request ? [request.module] : whatOpens({
      remembered: saved.__open,
      own: spaceOpensWith,
      environment: environmentOpensWith,
      modules: available.map((m) => m.id),
      canOpen: canOpenHere,
      guest: Boolean(guestToken),
    });
    for (const id of want) {
      if (builtins.has(id)) { if (canOpenHere(id)) api_openBuiltin(id); }
      else {
        const m = available.find((x) => x.id === id);
        if (m) openModule(m);
      }
    }
    // The remembered order is the column order, for the built-in modules as well as the installed ones.
    if (!request) {
      const docked = [...opened.values()].filter(wantsColumn).sort(byOrder); // waiting ones keep their place too
      const sequence = want.map((id) => opened.get(id)).filter((p) => p && wantsColumn(p));
      if (sequence.length === docked.length) {
        const values = docked.map((p) => p.order).sort((a, b) => a - b);
        sequence.forEach((p, i) => { p.order = values[i]; });
      }
    }
    // On a phone the first tab is the first module opened, whichever it is (the call only when it comes first).
    if (isNarrow()) {
      const first = want.find((id) => opened.has(id));
      if (first) view = first;
    }
    restoring = false;
    suspended = false;
    syncDock();
    update();
    snapshot();
    if (request) openRef(request.ref);
  }

  // --- saved layouts (plan-saved-layouts.md) ------------------------------------------------------------------------
  // The canvas's box, in the floating layer's coordinates (the window's); the window while the canvas is hidden.
  function canvasArea() {
    const win = canvasWin();
    const r = canvas.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : { x: 0, y: 0, w: win.innerWidth, h: win.innerHeight };
  }

  // The canvas as a layout to save (layouts.js's layoutOf): the open modules in column order, docked widths in pixels,
  // floating boxes as fractions of the canvas, and the canvas-level snap. A module waiting for a column is saved docked
  // (the layout is the intent; each window fits it on load); one in a window of its own as the mode it had before. On a
  // narrow canvas, where everything shows docked one at a time, each module's remembered mode and box are what is saved.
  function captureLayout() {
    const narrow = isNarrow();
    const mods = [...opened.values()].map((p) => {
      const rec = saved[p.id] || {};
      const floater = floaterOf(p);
      const mode = narrow ? (rec.mode === 'float' && supports(p, 'float') ? 'float' : 'dock') : p.waiting ? 'dock' : p.mode;
      return {
        id: p.id,
        mode,
        was: rec.mode,
        order: p.order,
        canDock: supports(p, 'dock'),
        flex: Boolean(p.def?.flex),
        width: p.width ?? rec.dockW,
        box: !narrow && floater && p.mode === 'float' ? currentBox(floater) : rec.box,
        snap: snapAllOn() || Boolean(rec.snap),
      };
    });
    return layoutOf(mods, canvasArea(), { all: snapAllOn(), pitch: snapPitch() });
  }

  // Put a saved layout on the canvas (plan-saved-layouts.md, "Saving and loading"): what may open here (canOpenHere)
  // opens or moves to its mode, in order; the open modules the layout does not name close, except the conference while
  // this person is on the call (closing it would hang up); docked widths, floating boxes scaled from the fractions,
  // snapped ones settled onto the grid at the saved pitch; then the columns are fitted to the window by fitDock(),
  // exactly as a resize would. The result becomes this person's remembered layout for the space. On a narrow canvas the
  // modes and places are remembered for a wider window and the first module is the view. Answers { left, waiting }:
  // the ids left out, and the ids waiting for a column; the panel's note says both in plain words.
  function loadLayout(layout) {
    if (!spaceId || !layout || !Array.isArray(layout.modules)) return { left: [], waiting: [] };
    const narrow = isNarrow();
    const area = canvasArea();
    const plan = placeLayout(layout, area, canOpenHere);
    const named = new Set(plan.modules.map((p) => p.id));
    const keepCall = (p) => p.id === 'conference' && p.kind === 'builtin' && Boolean(p.def?.inCall?.());
    suspended = true;
    restoring = true;
    try {
      for (const p of [...opened.values()]) if (!named.has(p.id) && !keepCall(p)) closeModule(p.id);
      // The canvas-level snap as saved; what it floated before is not this layout's.
      saved.__snap = { ...(saved.__snap || {}), all: plan.snap.all, pitch: plan.snap.pitch, before: {} };
      const g = gridFor({ left: area.x, top: area.y, width: area.w, height: area.h }, plan.snap.pitch);
      for (const want of plan.modules) {
        const def = builtins.get(want.id);
        const m = def ? null : available.find((x) => x.id === want.id);
        const p = def ? { modes: def.modes || ['dock', 'float'] } : { modes: m.canvas.mode };
        const mode = supports(p, want.mode) ? want.mode : supports(p, 'dock') ? 'dock' : 'float';
        // The records first, so whatever opens now opens where the layout says.
        const rec = { mode, snap: mode === 'float' && want.snap };
        if (want.dockW) rec.dockW = want.dockW;
        if (want.box) {
          Object.assign(rec, { box: want.box, layout: 'user' });
          if (want.cell) Object.assign(rec, { cell: want.cell, placed: { x: want.box.x - g.x, y: want.box.y - g.y, w: want.box.w, h: want.box.h } });
        }
        remember(want.id, rec);
        let mod = opened.get(want.id);
        if (mod && mod.waiting) {
          if (mode === 'float') { mod.waiting = false; } else { mod.width = clampDock(want.dockW || mod.width); continue; }
        }
        const shown = narrow ? 'dock' : mode;
        if (!mod) {
          if (def) api_openBuiltin(want.id, narrow ? undefined : shown);
          else openModule(m, narrow ? undefined : shown);
        } else if (mod.mode !== shown && !(narrow && mod.mode === 'dock')) {
          setMode(want.id, shown);
        }
        mod = opened.get(want.id);
        if (!mod) continue; // a window the browser refused, or a module that may not open after all
        if (mod.mode === 'dock' && want.dockW) {
          mod.width = clampDock(want.dockW);
          mod.onWidth?.(mod.width);
        }
        const floater = floaterOf(mod);
        if (floater && mod.mode === 'float') {
          if (want.cell) settleSnap(want.id, floater, want.cell, { keepPlaced: true });
          else if (want.box) remember(want.id, { box: place(floater, want.box) });
          paintSnap(mod, snapping(want.id));
          front(floater);
        }
      }
      // The column order is the layout's: the modules it names follow whatever stays (the conference on the call).
      for (const want of plan.modules) { const mod = opened.get(want.id); if (mod) mod.order = ++order; }
      if (narrow) {
        const first = plan.modules.find((want) => opened.has(want.id));
        if (first) view = first.id;
      }
    } finally {
      restoring = false;
      suspended = false;
    }
    keepLayout = false;
    hush += 1; // one note for the whole load, below, not one per module
    try { syncDock(); } finally { hush -= 1; }
    update();
    snapshot();
    const waiting = [...opened.values()].filter((p) => p.waiting).sort(byOrder).map((p) => p.id);
    const lines = [leftOutNote(plan.left, nameOfLayout, word('space'))];
    if (waiting.length) {
      const names = waiting.map(nameOf);
      const list = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
      lines.push(names.length === 1 ? `The window is too narrow for another column, so ${list} is floating.` : `The window is too narrow for more columns, so ${list} are floating.`);
    }
    note(lines.filter(Boolean).join(' '));
    return { left: plan.left, waiting };
  }
  // A module's name for the load's note, open or not, installed here or not (one left out has only its id).
  const nameOfLayout = (id) => builtins.get(id)?.name || available.find((x) => x.id === id)?.name || id.charAt(0).toUpperCase() + id.slice(1).replace(/-/g, ' ');

  // --- the toolbar button and its menu --------------------------------------

  // The one place to show and hide modules: the chat first, then the space's modules.
  function update() {
    const total = available.reduce((sum, m) => sum + (unread[m.id] || 0), 0)
      + [...builtins.keys()].reduce((sum, id) => sum + (opened.has(id) ? 0 : builtinUnread[id] || 0), 0);
    const badge = toggle?.querySelector('.badge');
    if (badge) {
      badge.hidden = total === 0;
      badge.textContent = total > 9 ? '9+' : String(total);
    }
    snapshot();
    paintDockButtons();
    if (canvasEmpty) canvasEmpty.hidden = opened.size > 0;
    if (!menu) return;
    const builtinList = [...builtins.values()].sort((a, b) => a.order - b.order).filter((def) => !def.allowed || def.allowed());
    // A switch always reads the module's name (the environment's name for it), open or not, in the call or not.
    if (!inline()) {
      // The space bar's chooser: a list of switches under its button (switch-list.js), on while the module is shown.
      // Rebuilt in place, so the switch that had the keyboard keeps it.
      const doc = menu.ownerDocument;
      const had = menu.contains(doc.activeElement) ? doc.activeElement : null;
      const key = had ? (had.dataset.builtin ? `builtin:${had.dataset.builtin}` : had.dataset.module ? `module:${had.dataset.module}` : null) : null;
      // On a narrow canvas a module open but hidden behind the view shown reads off; its switch shows it.
      const shown = (id) => opened.has(id) && !hiddenByView(id);
      // The panel's sections (plan-layout-menu.md): Show, rewritten here on every change, then Arrange, the space page's
      // own (Dock all, Clean up, the snap switch and the grid's size), never rewritten here, so a control in use is
      // never replaced under the pointer or the keyboard. Arrange is not drawn on a narrow canvas: nothing docks there.
      let show = menu.querySelector(':scope > .module-chooser-show');
      if (!show) {
        for (const el of [...menu.children]) if (el !== arrangeEl && el !== layoutsEl) el.remove(); // the phone's tabs, before
        show = doc.createElement('div');
        show.className = 'module-chooser-show';
        menu.prepend(show);
        wireSwitchList(show);
      }
      if (arrangeEl) {
        if (arrangeEl.parentNode !== menu) menu.appendChild(arrangeEl);
        arrangeEl.hidden = isNarrow();
      }
      // Layouts, last, never rewritten here; hidden on a narrow canvas as Arrange is, and while space.js has none to show.
      if (layoutsEl) {
        if (layoutsEl.parentNode !== menu || layoutsEl.previousElementSibling !== arrangeEl) menu.appendChild(layoutsEl);
        layoutsEl.hidden = isNarrow() || layoutsEl.dataset.empty === 'true';
      }
      // Under a Show heading (the header's menu heading), its own group, so a screen reader reads "Show" with the switches.
      show.innerHTML = '<div class="nav-menu-heading module-chooser-heading" id="modules-menu-show">Show</div>'
        + '<div class="module-chooser-section" role="group" aria-labelledby="modules-menu-show">'
        + switchListHtml(builtinList.map((def) => ({ id: def.id, icon: def.icon, name: def.name, on: shown(def.id), badge: builtinUnread[def.id] || 0 })), 'builtin')
        + switchListHtml(available.map((m) => ({ id: m.id, icon: m.icon, name: m.name, on: shown(m.id), badge: unread[m.id] || 0, tint: colorOf(m.id) })), 'module')
        + '</div>';
      if (key) {
        const [kind, id] = key.split(/:(.*)/s);
        [...menu.querySelectorAll(`[data-${kind}]`)].find((el) => el.dataset[kind] === id)?.focus();
      }
      return;
    }
    // The phone's tab bar: a tab per module (the highlighted tab is the view being shown). Arrange is kept, out of it.
    menu.innerHTML = '';
    for (const def of builtinList) {
      const open = opened.has(def.id);
      const b = menu.ownerDocument.createElement('button');
      b.type = 'button';
      b.className = 'modules-menu-item';
      b.dataset.builtin = def.id;
      // On a phone the highlighted tab is the view being shown, not just an open module.
      b.classList.toggle('on', isNarrow() && open ? view === def.id : open);
      // The call is on: the phone's tab bar marks it, since the conference can be hidden while it runs. Open is not
      // enough: the conference can be shown and out of the call ("Not in a call"), so its owner says (def.inCall).
      b.classList.toggle('in-call', open && Boolean(def.inCall?.()));
      const n = builtinUnread[def.id] || 0;
      b.innerHTML = `<i class="fa-solid fa-${escapeHtml(def.icon)} fa-fw" aria-hidden="true"></i><span>${escapeHtml(def.name)}</span>${n ? `<span class="badge">${n > 9 ? '9+' : n}</span>` : ''}`;
      menu.appendChild(b);
    }
    for (const m of available) {
      const b = menu.ownerDocument.createElement('button');
      b.type = 'button';
      b.className = 'modules-menu-item';
      b.dataset.module = m.id;
      b.classList.toggle('on', isNarrow() && opened.has(m.id) ? view === m.id : opened.has(m.id));
      const n = unread[m.id] || 0;
      b.innerHTML = `<i class="fa-solid fa-${escapeHtml(m.icon)} fa-fw" aria-hidden="true"></i><span>${escapeHtml(m.name)}</span>${n ? `<span class="badge">${n > 9 ? '9+' : n}</span>` : ''}`;
      menu.appendChild(b);
    }
    // The tabs are new: the bar folds again (nav-bar.js, plan-phone-space-bar.md), so the tabs that do not fit and
    // their unread counts go into its "...", and the view being shown keeps its tab. On the next frame, before a paint.
    nav.draw('secondary');
  }

  // Clicking away closes the menu, and a resize keeps floating modules on screen,
  // in whichever window the call is in.
  const bound = new WeakSet();
  let lastNarrow = null;
  function bindDoc(doc) {
    if (bound.has(doc)) return;
    bound.add(doc);
    doc.addEventListener('click', (event) => {
      // By the event's path: a switch just flipped is already rebuilt, out of the document, by the time this hears it.
      if (menu && !inline() && !menu.hidden && !event.composedPath().some((n) => n === menu || n === toggle)) setMenuOpen(false);
    });
    (doc.defaultView || window).addEventListener('resize', () => {
      for (const p of opened.values()) {
        const floater = floaterOf(p);
        if (!floater || floater.ownerDocument !== doc) continue;
        // A snapped module keeps its cells in the grid the new size makes; a free one just stays on screen.
        if (snapping(p.id)) settleSnap(p.id, floater, saved[p.id]?.cell); else place(floater, currentBox(floater));
      }
      hush += 1; // the columns fit again, quietly: the change is in front of the person
      try { syncDock(); } finally { hush -= 1; }
      // Crossing the narrow line changes which module shows, so the tabs and switches say so.
      if (isNarrow() !== lastNarrow) { lastNarrow = isNarrow(); update(); }
      if (menu && !inline() && !menu.hidden) positionMenu();
    });
  }
  bindDoc(document);

  document.addEventListener('app:unread', (event) => {
    unread = event.detail || {};
    update();
  });
  // The menu belongs to the canvas, so it works with the conference closed. It opens under the
  // Layout button in the page header (the one place to open modules).
  function positionMenu() {
    if (inline() || menu.closest('.module-chooser')) return; // the space bar's chooser: CSS puts it under its button
    const visible = (el) => el && el.getBoundingClientRect().width > 0;
    // The header moves with the canvas when the app is popped out, so the button is always beside it.
    const anchor = [toggle].find(visible);
    const s = canvas.getBoundingClientRect();
    const w = menu.offsetWidth;
    menu.style.transform = 'none';
    menu.style.bottom = 'auto';
    menu.style.top = '8px';
    if (!anchor || anchor.ownerDocument !== canvas.ownerDocument) {
      menu.style.left = 'auto';
      menu.style.right = '8px';
      return;
    }
    const a = anchor.getBoundingClientRect();
    menu.style.right = 'auto';
    menu.style.left = `${Math.min(Math.max(a.left - s.left + a.width / 2 - w / 2, 8), Math.max(8, s.width - w - 8))}px`;
    // Under a button inside the canvas; a header button is above the canvas, so 8px from its top.
    if (canvas.contains(anchor)) menu.style.top = `${a.bottom - s.top + 6}px`;
  }

  // The chooser's list stays open while switches are flipped; its button, Escape or a click elsewhere closes it, and
  // the keyboard goes back to the button. Opened from the keyboard, it goes straight to the first switch.
  function setMenuOpen(open, { focus = false } = {}) {
    if (!menu || inline()) return;
    menu.hidden = !open;
    toggle?.setAttribute('aria-expanded', String(open));
    // Closing the panel clears its note, except one the same click just wrote (a titlebar's Dock, outside the panel).
    if (!open && Date.now() - noteAt > 250) note('');
    onMenu?.(open);
    if (open) {
      positionMenu();
      if (focus) menu.querySelector('input, button')?.focus();
    } else if (focus) toggle?.focus();
  }
  function toggleMenu() {
    if (!menu || inline()) return;
    setMenuOpen(menu.hidden);
  }

  toggle?.addEventListener('click', (event) => {
    event.stopPropagation();
    // A click from the keyboard (Enter or Space) has no pointer position.
    setMenuOpen(menu.hidden, { focus: event.detail === 0 });
  });
  menu?.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || inline() || menu.hidden) return;
    event.stopPropagation();
    setMenuOpen(false, { focus: true });
  });
  // A tab on the phone's bar, or a switch in the chooser's list (its checkbox's click, from a pointer, Space or Enter).
  // A switch shows or hides the module, the same for every one; the conference's owner hears it through onChange.
  // On a narrow canvas one docked module shows at a time (syncView): a switch on a module that is open but hidden
  // behind another shows it (it reads off until then, see update()), so seeing the conference never means switching it
  // off, which hangs up. The switch keeps the keyboard while the list is open, whatever the module does as it opens
  // (the chat puts it in its message box).
  menu?.addEventListener('click', (event) => {
    const el = event.target.closest('[data-builtin], [data-module]');
    if (!el) return;
    const builtin = el.dataset.builtin;
    const m = builtin ? null : available.find((x) => x.id === el.dataset.module);
    if (!builtin && !m) return;
    const id = builtin || m.id;
    const open = () => (builtin ? api_openBuiltin(id) : openModule(m));
    const close = () => (builtin ? closeBuiltin(id) : closeModule(id));
    // On a phone a tab switches the view; it never closes a module (so it never hangs up the call).
    if (inline() && isNarrow()) { if (opened.has(id)) setView(id); else open(); return; }
    if (opened.has(id) && hiddenByView(id)) setView(id);
    else if (opened.has(id)) close();
    else open();
    if (inline()) return;
    update(); // the switch shows what happened (a module that may not open stays off)
    if (!menu.hidden) {
      const kind = builtin ? 'builtin' : 'module';
      [...menu.querySelectorAll(`[data-${kind}]`)].find((x) => x.dataset[kind] === id)?.focus();
    }
  });
  // Esc on the chooser's button closes its list too, as it does from a switch.
  toggle?.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || inline() || !menu || menu.hidden) return;
    event.stopPropagation();
    event.preventDefault();
    setMenuOpen(false, { focus: true });
  });

  // The modules on for this space and this viewer, or none (null = not in a space).
  async function refresh(id) {
    suspended = true;
    closeAllModules();
    note('');
    spaceId = id;
    saved = loadSaved(id);
    available = [];
    colors = new Map();
    spaceOpensWith = null;
    spaceDefaultLayout = null;
    environmentOpensWith = null;
    if (id) {
      try {
        const q = new URLSearchParams({ space: id });
        if (guestToken) q.set('guest', guestToken);
        const answer = await api('GET', `/api/modules/for-space?${q}`);
        available = (answer.modules || []).filter((m) => !m.canvas || m.canvas.menu !== false);
        colors = new Map((answer.modules || []).filter((m) => TINTS.includes(m.color)).map((m) => [m.id, m.color]));
        spaceOpensWith = Array.isArray(answer.opensWith) ? answer.opensWith : null;
        spaceDefaultLayout = answer.defaultLayout && Array.isArray(answer.defaultLayout.modules) ? answer.defaultLayout : null;
        environmentOpensWith = Array.isArray(answer.spaceDefaultsOpensWith) ? answer.spaceDefaultsOpensWith : null;
        showBuiltin(answer.builtin);
      } catch {
        available = [];
      }
    }
    update();
  }

  // The built-in modules' names and icons as this environment shows them (their display names, else their own), from the
  // server's `builtin` list; a module that draws its own header hears it through def.onShown.
  function showBuiltin(list) {
    for (const b of Array.isArray(list) ? list : []) {
      const def = builtins.get(b.id);
      if (!def || typeof b.name !== 'string' || !b.name) continue;
      const was = def.name;
      def.name = b.name;
      if (typeof b.icon === 'string' && /^[a-z0-9-]{1,40}$/.test(b.icon)) def.icon = b.icon;
      def.onShown?.(def);
      // A window of its own titled by the module's name follows it (one titled otherwise, the conference's, keeps its own).
      const mod = opened.get(b.id);
      if (mod?.mode === 'window' && mod.win && !mod.win.closed && mod.win.document.title === was) mod.win.document.title = def.name;
    }
  }

  const api_openBuiltin = (id, mode) => {
    const def = builtins.get(id);
    if (!def) return false;
    if (opened.has(id)) return true;
    if (!restoring) keepLayout = false;
    if (isNarrow()) view = id;
    const canFloat = !def.modes || def.modes.includes('float');
    // With the canvas-level snap on, a module that can float opens floating (and snapped), whatever it was last time.
    const want = canFloat && (saved[id]?.mode === 'float' || snapAllOn()) ? 'float' : 'dock';
    return openBuiltinIn(def, mode || (isNarrow() ? 'dock' : want));
  };
  // Show a built-in module the way its switch does (the click handler above): open it if it is closed; if it is open
  // but out of sight (behind another view on a narrow canvas, or floating behind), bring it forward; a window of its
  // own is focused. Never closes it. Says whether it is open now (false: it may not open here).
  const api_showBuiltin = (id) => {
    if (!builtins.has(id)) return false;
    if (!opened.has(id)) api_openBuiltin(id);
    else if (opened.get(id).mode === 'window') opened.get(id).win?.focus?.();
    else setView(id);
    update();
    return opened.has(id);
  };
  // The same for any module (Chat's Send to... and Keep, after a module's form opened on this page): open it if it is
  // closed, else bring it forward the way its tab or switch does (on a phone, it becomes the view shown; floating, it
  // comes to the front; in a window of its own, that window is focused). Never closes anything.
  const api_show = (id) => {
    if (builtins.has(id)) return api_showBuiltin(id);
    const m = available.find((x) => x.id === id);
    if (!m) return false;
    if (!opened.has(id)) openModule(m);
    else if (opened.get(id).mode === 'window') opened.get(id).win?.focus?.();
    else setView(id);
    update();
    return opened.has(id);
  };

  return {
    refresh,
    restore,
    // Ask the next restore to open just this module, on this item (a pointer), instead of the remembered modules.
    requestOpen: (module, ref) => { openRequest = { module, ref, at: Date.now() }; },
    suspend: () => { suspended = true; },
    setBuiltinUnread(id, n) {
      builtinUnread[id] = n;
      update();
    },
    closeAll: closeAllModules,
    popped: canvasPopped, // the call moved to (or back from) a window of its own
    showFloating,
    layoutChanged: () => { hush += 1; try { syncDock(); } finally { hush -= 1; } },
    updateMenu: update,
    openRef,
    // For tests: send a host event to an open module's frame.
    sendTo: (id, event, data) => opened.get(id)?.mount?.send(event, data),
    testDrag: (id, ref) => opened.get(id)?.mount?.beginDragForTest(ref),
    testPtr: (id, step, ref, label, x, y) => opened.get(id)?.mount?.ptrForTest(step, ref, label, x, y),
    // The canvas-level snap (the space bar's switch and slider): whether every floating module snaps, and the grid's pitch.
    snapAll: setSnapAll,
    snapAllOn,
    dockAll,
    cleanUp,
    snapPitch,
    snapPitchRange: () => ({ ...SNAP_PITCH }),
    setSnapPitch,
    toggleMenu,
    // Saved layouts (plan-saved-layouts.md): the canvas as a layout to save, and a saved layout put on the canvas.
    captureLayout,
    loadLayout,
    // Whether the canvas is narrow (640 px and below): the Layout panel's Layouts section is not drawn then.
    isNarrow,
    // `mode` (a module's own window asking to come back as a column or floating) is remembered.
    open: (id, mode) => {
      const m = available.find((x) => x.id === id);
      if (!m) return;
      if (mode) remember(id, { mode });
      openModule(m, mode);
    },
    // Whether the module supports a mode (the window's titlebar offers only what works).
    supportsMode: (id, mode) => {
      const m = available.find((x) => x.id === id);
      return Boolean(m) && supports({ modes: m.canvas.mode }, mode);
    },
    close: closeModule,
    isOpen: (id) => opened.has(id),
    modeOf: (id) => opened.get(id)?.mode || null,
    setMode,
    popOut,
    list: () => available.slice(),
    colorOf,
    // The built-in modules: the conference and the chat register their element and how to be told about changes.
    registerBuiltin(def) {
      def.order ??= 0; // the conference sets -1 to come first; the chat is the next column
      builtins.set(def.id, def);
      update(); // the menu lists it
    },
    openBuiltin: api_openBuiltin,
    showBuiltin: api_showBuiltin,
    show: api_show,
    closeBuiltin,
    builtinOpen: (id) => opened.has(id),
    // The window a built-in module is popped out into, or null (the page's idle-hide needs that document's own canvas).
    builtinWindow: (id) => { const p = opened.get(id); return p && p.mode === 'window' && p.win && !p.win.closed ? p.win : null; },
    builtinMode: (id) => opened.get(id)?.mode || null,
    // A notification's toast asks the call to open the module on the canvas.
    handleNotification(n) {
      if (n.scope !== 'space' || n.spaceId !== spaceId) return false;
      const m = available.find((x) => x.id === n.module);
      if (!m) return false;
      openModule(m);
      return true;
    },
  };
}
