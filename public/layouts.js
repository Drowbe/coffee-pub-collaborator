// Saved layouts (documentation/plans/plan-saved-layouts.md, step 2): the arithmetic of saving a canvas as a layout and
// placing a layout on a canvas, apart from the page so tools/check-canvas.mjs can run it. No DOM in here; canvas.js
// measures the canvas and its modules (captureLayout) and opens and moves them (loadLayout).
//
// A layout is { modules: [{ id, mode, dockW?, box?, snap? }], snap: { all, pitch } }, the shape server/layouts.js
// keeps: modules in column order (docked first, in their columns' order, then floating, in the order they were opened),
// a docked module's width in pixels (none for the flexible column, the conference when docked: its size is what the
// others leave it), a floating module's box as fractions of the canvas (0 to 1, so it scales to another window), and
// the canvas-level snap switch with the grid's pitch in pixels.

import { MIN_W, MIN_H, DOCK_MIN, gridFor, cellBox, resettle } from '/snap-grid.js';

// The server's limits (server/layouts.js, LAYOUT_LIMITS), so the page says what the server would refuse before asking.
export const LAYOUT_LIMITS = Object.freeze({ personal: 10, shared: 10, name: 40, modules: 20, dockWMin: 160, dockWMax: 2000, pitchMin: 50, pitchMax: 320 });
const PITCH_DEFAULT = 130;

const num = (v, fallback = 0) => (Number.isFinite(Number(v)) ? Number(v) : fallback);
const clamp = (v, lo, hi) => Math.min(Math.max(v, lo), hi);
// Four places: a fraction of a 4000 px canvas is still within half a pixel.
const frac = (v) => Math.round(clamp(v, 0, 1) * 10000) / 10000;
const pitchOf = (p) => clamp(Math.round(num(p, PITCH_DEFAULT)), LAYOUT_LIMITS.pitchMin, LAYOUT_LIMITS.pitchMax);

// The layout a canvas makes. `modules` is every open module, as canvas.js reads them:
//   { id, mode: 'dock' | 'float' | 'window', order, was?, canDock?, flex?, width?, box?, snap? }
// `mode` what it is now (a module waiting for a column is 'dock': it wants one), `order` its place in the column order
// (and, floating, the order it was opened), `was` its remembered mode (for one in a window of its own), `canDock`
// whether it can be a column, `flex` the flexible column, `width` its own docked width in pixels, `box` a floating
// box in pixels in the same coordinates as `area`, `snap` whether it snaps. `area` is the canvas: { x, y, w, h }.
// `snap` is the canvas-level { all, pitch }. A module in a window of its own is saved as the mode it had on the canvas
// before (`was`), else docked where it can dock.
export function layoutOf(modules, area, snap = {}) {
  const A = { x: num(area?.x), y: num(area?.y), w: Math.max(1, num(area?.w, 1)), h: Math.max(1, num(area?.h, 1)) };
  const list = (Array.isArray(modules) ? modules : []).filter((p) => p && typeof p.id === 'string' && p.id);
  const modeOf = (p) => {
    if (p.mode === 'dock' || p.mode === 'float') return p.mode;
    if (p.was === 'dock' || p.was === 'float') return p.was;
    return p.canDock === false ? 'float' : 'dock';
  };
  const byOrder = (a, b) => num(a.order) - num(b.order);
  const seen = new Set();
  const take = (p) => (seen.has(p.id) ? false : (seen.add(p.id), true));
  const docked = list.filter((p) => modeOf(p) === 'dock').sort(byOrder).filter(take);
  const floating = list.filter((p) => modeOf(p) === 'float').sort(byOrder).filter(take);
  const out = [];
  for (const p of docked) {
    const entry = { id: p.id, mode: 'dock' };
    const w = Math.round(num(p.width, 0));
    if (!p.flex && w > 0) entry.dockW = clamp(w, LAYOUT_LIMITS.dockWMin, LAYOUT_LIMITS.dockWMax);
    out.push(entry);
  }
  for (const p of floating) {
    const entry = { id: p.id, mode: 'float' };
    const b = p.box;
    if (b && num(b.w) > 0 && num(b.h) > 0) {
      const w = clamp(num(b.w) / A.w, 0.0001, 1);
      const h = clamp(num(b.h) / A.h, 0.0001, 1);
      entry.box = { x: frac((num(b.x) - A.x) / A.w), y: frac((num(b.y) - A.y) / A.h), w: Math.max(0.0001, frac(w)), h: Math.max(0.0001, frac(h)) };
    }
    entry.snap = Boolean(p.snap);
    out.push(entry);
  }
  return { modules: out.slice(0, LAYOUT_LIMITS.modules), snap: { all: Boolean(snap?.all), pitch: pitchOf(snap?.pitch) } };
}

// Where a layout's modules go on a canvas `area` ({ x, y, w, h }). `canOpen(id)` says whether this person may open a
// module here (on in the space, installed, readable): the others are left out, named in `left`, and the stored layout
// is not changed, so it comes back whole when the module is on again. The answer:
//   modules  [{ id, mode, dockW?, box?, cell?, snap }] in the layout's order: a docked width clamped as the canvas's
//            clampDock() does (DOCK_MIN to 60% of the canvas), a floating box in pixels, scaled from the fractions, at
//            least MIN_W by MIN_H and inside the area; a snapped one (its own switch, or the canvas-level one) with the
//            grid cells it settles in at the saved pitch, by snap-grid.js's resettle(), none on another where there is
//            room, and its box the cells' box;
//   left     the ids left out, in the layout's order;
//   snap     the canvas-level { all, pitch }.
export function placeLayout(layout, area, canOpen = () => true) {
  const A = { x: num(area?.x), y: num(area?.y), w: Math.max(1, num(area?.w, 1)), h: Math.max(1, num(area?.h, 1)) };
  const snap = { all: Boolean(layout?.snap?.all), pitch: pitchOf(layout?.snap?.pitch) };
  const left = [];
  const modules = [];
  const seen = new Set();
  const maxDock = Math.max(DOCK_MIN, Math.round(A.w * 0.6));
  const least = { w: Math.min(MIN_W, A.w), h: Math.min(MIN_H, A.h) };
  for (const entry of Array.isArray(layout?.modules) ? layout.modules : []) {
    if (!entry || typeof entry.id !== 'string' || seen.has(entry.id)) continue;
    seen.add(entry.id);
    if (!canOpen(entry.id)) { left.push(entry.id); continue; }
    const mode = entry.mode === 'float' ? 'float' : 'dock';
    const placed = { id: entry.id, mode, snap: mode === 'float' && (snap.all || Boolean(entry.snap)) };
    if (mode === 'dock' && entry.dockW !== undefined) placed.dockW = clamp(Math.round(num(entry.dockW, DOCK_MIN)), DOCK_MIN, maxDock);
    if (mode === 'float' && entry.box) {
      const b = entry.box;
      const w = Math.round(clamp(num(b.w) * A.w, least.w, A.w));
      const h = Math.round(clamp(num(b.h) * A.h, least.h, A.h));
      const x = Math.round(clamp(A.x + num(b.x) * A.w, A.x, A.x + A.w - w));
      const y = Math.round(clamp(A.y + num(b.y) * A.h, A.y, A.y + A.h - h));
      placed.box = { x, y, w, h };
    }
    modules.push(placed);
  }
  // The snapped ones, settled together onto the grid at the saved pitch from their scaled boxes.
  const snapped = modules.filter((p) => p.snap && p.box);
  if (snapped.length) {
    const g = gridFor({ left: A.x, top: A.y, width: A.w, height: A.h }, snap.pitch);
    const cells = resettle(g, snapped.map((p) => ({ id: p.id, box: p.box })));
    for (const p of snapped) {
      p.cell = cells.get(p.id);
      const c = cellBox(g, p.cell);
      p.box = { x: Math.round(c.x), y: Math.round(c.y), w: Math.round(c.w), h: Math.round(c.h) };
    }
  }
  return { modules, left, snap };
}

// The one line a load says about what it left out, by the modules' names: "Map isn't on in this space, so it was left
// out." `nameOf(id)` gives a module's name, `space` the environment's word for a space. '' when nothing was left out.
export function leftOutNote(ids, nameOf = (id) => id, space = 'space') {
  const names = (Array.isArray(ids) ? ids : []).map((id) => nameOf(id) || id);
  if (!names.length) return '';
  if (names.length === 1) return `${names[0]} isn't on in this ${space}, so it was left out.`;
  const list = `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return `${list} aren't on in this ${space}, so they were left out.`;
}
