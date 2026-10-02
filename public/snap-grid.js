// The snap grid's arithmetic, apart from the page so tools/check-canvas.mjs can run it: the grid a canvas and a pitch
// make, the cells nearest a box, and re-settling snapped modules when the grid's size changes. No DOM in here; canvas.js
// measures the canvas and places the modules. See documentation/architecture/architecture-canvas.md.

export const MIN_W = 240; // a floating module's smallest size
export const MIN_H = 160;
export const SNAP_GAP = 16; // the same 16px canvas.js's clampBox keeps clear of the window's edges, so a module spanning every cell still fits the grid

// The grid over a canvas of `rect` (left, top, width, height) at `pitch` px a cell (a cell is 0.77 as tall): as many
// cells as fit, never fewer than one.
export function gridFor(rect, pitch) {
  const cols = Math.max(1, Math.floor(rect.width / pitch));
  const rows = Math.max(1, Math.floor(rect.height / (pitch * 0.77)));
  return { x: rect.left, y: rect.top, w: rect.width, h: rect.height, cols, rows, cw: rect.width / cols, ch: rect.height / rows };
}

// The box a run of cells makes.
export const cellBox = (g, c) => ({ x: g.x + c.col * g.cw + SNAP_GAP / 2, y: g.y + c.row * g.ch + SNAP_GAP / 2, w: c.cols * g.cw - SNAP_GAP, h: c.rows * g.ch - SNAP_GAP });

// The fewest cells a module's smallest size needs on this grid.
export function leastSpan(g) {
  return {
    cols: Math.min(g.cols, Math.max(1, Math.ceil((MIN_W + SNAP_GAP) / g.cw))),
    rows: Math.min(g.rows, Math.max(1, Math.ceil((MIN_H + SNAP_GAP) / g.ch))),
  };
}

// The run of cells a box is nearest to, never fewer than a module's smallest size needs.
export function snapCell(g, box) {
  const least = leastSpan(g);
  const cols = Math.max(least.cols, Math.min(g.cols, Math.round((box.w + SNAP_GAP) / g.cw)));
  const rows = Math.max(least.rows, Math.min(g.rows, Math.round((box.h + SNAP_GAP) / g.ch)));
  const col = Math.max(0, Math.min(g.cols - cols, Math.round((box.x - g.x) / g.cw)));
  const row = Math.max(0, Math.min(g.rows - rows, Math.round((box.y - g.y) / g.ch)));
  return { col, row, cols, rows };
}

// A cell run that fits this grid, at least as big as a module's smallest size.
export function clampCell(g, c) {
  const least = leastSpan(g);
  const cols = Math.max(least.cols, Math.min(g.cols, Math.round(c?.cols) || least.cols));
  const rows = Math.max(least.rows, Math.min(g.rows, Math.round(c?.rows) || least.rows));
  return {
    col: Math.max(0, Math.min(g.cols - cols, Math.round(c?.col) || 0)),
    row: Math.max(0, Math.min(g.rows - rows, Math.round(c?.row) || 0)),
    cols, rows,
  };
}

export const cellsOverlap = (a, b) => a.col < b.col + b.cols && b.col < a.col + a.cols && a.row < b.row + b.rows && b.row < a.row + a.rows;

// Which cells are covered, answered in constant time per run of cells: a count per cell, summed (a prefix sum) once per
// change, so a search looks at each place on the grid once rather than against every module already placed.
function occupancy(g, taken) {
  const W = g.cols + 1;
  const count = new Int32Array(g.cols * g.rows);
  const sum = new Int32Array(W * (g.rows + 1));
  const add = (t) => {
    const c0 = Math.max(0, t.col); const r0 = Math.max(0, t.row);
    const c1 = Math.min(g.cols, t.col + t.cols); const r1 = Math.min(g.rows, t.row + t.rows);
    for (let r = r0; r < r1; r += 1) for (let c = c0; c < c1; c += 1) count[r * g.cols + c] += 1;
  };
  const build = () => {
    for (let r = 0; r < g.rows; r += 1) {
      let line = 0;
      for (let c = 0; c < g.cols; c += 1) {
        line += count[r * g.cols + c];
        sum[(r + 1) * W + c + 1] = sum[r * W + c + 1] + line;
      }
    }
  };
  for (const t of taken) add(t);
  build();
  return {
    free: (c) => sum[(c.row + c.rows) * W + c.col + c.cols] - sum[c.row * W + c.col + c.cols] - sum[(c.row + c.rows) * W + c.col] + sum[c.row * W + c.col] === 0,
    take: (t) => { add(t); build(); },
  };
}

// The free place for a run of cells the size of `base` nearest it (fewest rows plus columns moved; up, then left, first on
// a tie), or null.
function nearestIn(g, occ, base) {
  if (occ.free(base)) return base;
  let best = null;
  let bestKey = Infinity;
  for (let row = 0; row <= g.rows - base.rows; row += 1) {
    for (let col = 0; col <= g.cols - base.cols; col += 1) {
      const dr = row - base.row; const dc = col - base.col;
      const key = ((Math.abs(dr) + Math.abs(dc)) * (2 * g.rows + 1) + (dr + g.rows)) * (2 * g.cols + 1) + (dc + g.cols);
      if (key >= bestKey) continue;
      const cell = { col, row, cols: base.cols, rows: base.rows };
      if (occ.free(cell)) { best = cell; bestKey = key; }
    }
  }
  return best;
}

// The cells nearest `prefer` that none of `taken` covers; `prefer` itself when the grid has no such place.
export function nearestFree(g, prefer, taken) {
  const base = clampCell(g, prefer);
  return nearestIn(g, occupancy(g, taken), base) || base;
}

// The first free run of this size, reading the grid row by row, or null.
export function nextFree(g, taken, cols, rows) {
  const occ = occupancy(g, taken);
  for (let row = 0; row <= g.rows - rows; row += 1) {
    for (let col = 0; col <= g.cols - cols; col += 1) {
      const cell = { col, row, cols, rows };
      if (occ.free(cell)) return cell;
    }
  }
  return null;
}

// Windows nobody has placed yet: share the grid, or the gaps left by the ones someone did place.
export function tileFresh(g, count, taken) {
  const least = leastSpan(g);
  const cells = [];
  if (!count) return cells;
  if (!taken.length) {
    let across = Math.max(1, Math.round(Math.sqrt(count * (g.cols / Math.max(1, g.rows)))));
    let down = Math.ceil(count / across);
    while (across > 1 && Math.floor(g.cols / across) < least.cols) across -= 1;
    down = Math.ceil(count / across);
    while (down > 1 && Math.floor(g.rows / down) < least.rows) {
      down -= 1;
      across = Math.ceil(count / Math.max(1, down));
    }
    const spanC = Math.max(least.cols, Math.min(g.cols, Math.floor(g.cols / across)));
    const spanR = Math.max(least.rows, Math.min(g.rows, Math.floor(g.rows / down)));
    for (let i = 0; i < count; i += 1) {
      const c = i % across;
      const r = Math.floor(i / across);
      const cell = clampCell(g, { col: c * spanC, row: r * spanR, cols: spanC, rows: spanR });
      cells.push(nearestFree(g, cell, taken.concat(cells)));
    }
    return cells;
  }
  for (let i = 0; i < count; i += 1) {
    const used = taken.concat(cells);
    cells.push(nextFree(g, used, least.cols, least.rows) || nearestFree(g, { col: 0, row: 0, cols: least.cols, rows: least.rows }, used));
  }
  return cells;
}

// The grid's size changed: every snapped module goes to the cells nearest its box (`placed`, the box it was last put in
// at any grid size), so it keeps about its size in pixels rather than its count of cells, and none sits on another
// whenever the canvas has room for them all at their smallest size. Placed top-left first, each at the free cells
// nearest its box. When that leaves one without room (rounding to whole cells can make boxes that fitted one cell too
// wide together; a smallest size can be more cells than the box was), every module is tried again a little smaller,
// all by the same share, so equal boxes stay equal; then all at their smallest size; then, smallest size, in rows in
// order. Only when even that cannot fit them all do they share: the nearest cells, at their size.
// `placed` is [{ id, box }]; the answer is a Map of id -> cell. The work is bounded: a few dozen passes, each looking
// at every place on the grid once per module.
export function resettle(g, placed) {
  const order = [...placed].sort((a, b) => (a.box.y - b.box.y) || (a.box.x - b.box.x) || String(a.id).localeCompare(String(b.id)));
  const least = leastSpan(g);
  const wants = order.map(({ box }) => snapCell(g, box));
  const pass = (sized) => {
    const occ = occupancy(g, []);
    const cells = new Map();
    for (let i = 0; i < order.length; i += 1) {
      const cell = nearestIn(g, occ, clampCell(g, sized[i]));
      if (!cell) return null;
      occ.take(cell);
      cells.set(order[i].id, cell);
    }
    return cells;
  };
  // Each module a share `s` of its box, never below its smallest size.
  const scaled = (s) => order.map(({ box }, i) => {
    const w = box.w * s; const h = box.h * s;
    const cols = Math.max(least.cols, Math.min(wants[i].cols, Math.round((w + SNAP_GAP) / g.cw)));
    const rows = Math.max(least.rows, Math.min(wants[i].rows, Math.round((h + SNAP_GAP) / g.ch)));
    return { ...wants[i], cols, rows };
  });
  let last = '';
  for (let step = 20; step >= 0; step -= 1) {
    const sized = step === 20 ? wants : scaled(step / 20);
    const key = sized.map((c) => `${c.cols}x${c.rows}`).join();
    if (key === last) continue;
    last = key;
    const cells = pass(sized);
    if (cells) return cells;
  }
  // Rows of the smallest size, in order: fits whenever any arrangement of that many at that size does.
  const across = Math.floor(g.cols / least.cols);
  const down = Math.floor(g.rows / least.rows);
  const cells = new Map();
  if (order.length <= across * down) {
    order.forEach(({ id }, i) => cells.set(id, { col: (i % across) * least.cols, row: Math.floor(i / across) * least.rows, cols: least.cols, rows: least.rows }));
    return cells;
  }
  // No room: the nearest free cells where there are some, else the nearest cells, shared.
  const occ = occupancy(g, []);
  order.forEach(({ id }, i) => {
    const base = clampCell(g, wants[i]);
    const cell = nearestIn(g, occ, base) || base;
    occ.take(cell);
    cells.set(id, cell);
  });
  return cells;
}

// --- Clean up, with the grid on (plan-layout-menu.md, "Clean up") ------------------------------------------------------
// Snapped modules kept at their size in cells wherever there is a place for it, and set apart. `items` is [{ id, cell }]
// in the order they were opened. First, each one whose own cells are still free keeps them (an earlier one wins where
// two sit on each other), and each of the rest goes to the free place of its own size nearest its cells. When that
// leaves one without a place, they are packed from the top left at their own sizes instead, if the grid holds them
// all that way. Only when it does not is a module with no place made smaller, on its own (the biggest size that leaves
// the rest a place at their smallest), never below a module's smallest size; and only when they cannot all fit even at
// that does every module go through resettle() (all smaller together, then sharing). Unlike resettle(), nobody gives
// up cells because another could not fit.
// The answer is a Map of id -> cell.
export function tidyCells(g, items) {
  const least = leastSpan(g);
  const wants = items.map(({ cell }) => clampCell(g, cell));
  // Every module at its own size, packed from the top left (in the order opened, then largest first): used when keeping
  // places would leave gaps too narrow for one of them, though the grid holds them all.
  const packed = (order) => {
    const out = new Map();
    for (const i of order) {
      const cell = nextFree(g, [...out.values()], wants[i].cols, wants[i].rows);
      if (!cell) return null;
      out.set(items[i].id, cell);
    }
    return out;
  };
  const kept = keepOrShrink(g, items, wants, least);
  if (kept.whole) return kept.cells;
  const byOrder = items.map((_, i) => i);
  const bySize = [...byOrder].sort((a, b) => wants[b].cols * wants[b].rows - wants[a].cols * wants[a].rows || a - b);
  return packed(byOrder) || packed(bySize) || kept.cells;
}

// tidyCells' first try: places kept, then the nearest free place of each one's own size, then smaller on its own (the
// biggest size that still leaves the others a place at their smallest). `whole`: every module kept its size. When the
// kept places leave the rest no place even at their smallest, every module is placed again the same way, in order,
// with no place kept; and when even that fails, resettle().
function keepOrShrink(g, items, wants, least) {
  const area = (c) => c.cols * c.rows;
  // Whether the modules in `rest` still fit at their smallest size beside `taken`.
  const fitsBeside = (taken, rest) => {
    const placed = [...taken];
    for (let k = 0; k < rest; k += 1) {
      const cell = nextFree(g, placed, least.cols, least.rows);
      if (!cell) return false;
      placed.push(cell);
    }
    return true;
  };
  // Sizes to try for module i, biggest first (more columns first on a tie), never below the smallest.
  const sizes = (i) => {
    const out = [];
    for (let cols = wants[i].cols; cols >= least.cols; cols -= 1) for (let rows = wants[i].rows; rows >= least.rows; rows -= 1) out.push({ cols, rows });
    return out.sort((a, b) => area(b) - area(a) || b.cols - a.cols);
  };
  const place = (order, keep) => {
    const occ = occupancy(g, []);
    const taken = [];
    const out = new Map();
    const rest = [];
    for (const i of order) {
      if (keep && occ.free(wants[i])) { occ.take(wants[i]); taken.push(wants[i]); out.set(items[i].id, wants[i]); } else rest.push(i);
    }
    for (let n = 0; n < rest.length; n += 1) {
      const i = rest[n];
      let cell = null;
      for (const size of sizes(i)) {
        const c = nearestIn(g, occ, clampCell(g, { ...wants[i], ...size }));
        if (c && fitsBeside([...taken, c], rest.length - n - 1)) { cell = c; break; }
      }
      if (!cell) return null;
      occ.take(cell);
      taken.push(cell);
      out.set(items[i].id, cell);
    }
    return out;
  };
  const order = items.map((_, i) => i);
  const cells = place(order, true) || place(order, false);
  if (!cells) return { whole: false, cells: resettle(g, items.map(({ id }, j) => ({ id, box: cellBox(g, wants[j]) }))) };
  return { whole: items.every(({ id }, i) => cells.get(id).cols === wants[i].cols && cells.get(id).rows === wants[i].rows), cells };
}

// --- Clean up, with the grid off (plan-layout-menu.md, "Clean up") -----------------------------------------------------
// Floating modules moved fully onto `area` ({ x, y, w, h }, the canvas less a margin) and apart, in the order given (the
// order they were opened). Each keeps its size where it fits; one that cannot fit anywhere free is made smaller, a step
// at a time, on its own. Only when one cannot fit even at a module's smallest size are they all made smaller together,
// by the same share; then all at the smallest size. Only when even that cannot fit them all do they share: cascaded,
// each still inside the area. `boxes` is [{ id, box: { x, y, w, h } }]; `taken` boxes (a snapped module, say) are left
// where they are and kept clear of. The answer is a Map of id -> box. No DOM; tools/check-canvas.mjs runs it.
export const TIDY_GAP = 8;

// Overlapping, or closer than the gap kept between modules.
const boxesOverlap = (a, b) => a.x < b.x + b.w + TIDY_GAP && b.x < a.x + a.w + TIDY_GAP && a.y < b.y + b.h + TIDY_GAP && b.y < a.y + a.h + TIDY_GAP;

export function tidyBoxes(boxes, area, taken = []) {
  const A = { x: Math.round(area.x), y: Math.round(area.y), w: Math.max(1, Math.floor(area.w)), h: Math.max(1, Math.floor(area.h)) };
  const least = { w: Math.min(MIN_W, A.w), h: Math.min(MIN_H, A.h) };
  const sized = (b, s) => ({
    w: Math.round(Math.min(A.w, Math.max(least.w, (Number(b.w) || least.w) * s))),
    h: Math.round(Math.min(A.h, Math.max(least.h, (Number(b.h) || least.h) * s))),
  });
  const inside = (x, lo, span) => Math.min(Math.max(Math.round(Number(x) || 0), lo), lo + span);
  // The free place for a box of this size nearest `want` (its own spot, kept on the area), or null. The places tried:
  // its own, the area's edges, and beside or under every box already placed, a gap apart.
  const spot = (want, size, placed) => {
    const maxX = A.x + A.w - size.w;
    const maxY = A.y + A.h - size.h;
    const own = { x: inside(want.x, A.x, A.w - size.w), y: inside(want.y, A.y, A.h - size.h), ...size };
    if (!placed.some((p) => boxesOverlap(own, p))) return own;
    const xs = new Set([A.x, own.x, maxX]);
    const ys = new Set([A.y, own.y, maxY]);
    for (const p of placed) {
      xs.add(p.x + p.w + TIDY_GAP); xs.add(p.x - TIDY_GAP - size.w); xs.add(p.x);
      ys.add(p.y + p.h + TIDY_GAP); ys.add(p.y - TIDY_GAP - size.h); ys.add(p.y);
    }
    let best = null;
    let bestKey = Infinity;
    for (const x of xs) {
      if (x < A.x || x > maxX) continue;
      for (const y of ys) {
        if (y < A.y || y > maxY) continue;
        const key = Math.abs(x - own.x) + Math.abs(y - own.y);
        if (key >= bestKey) continue;
        const b = { x, y, ...size };
        if (!placed.some((p) => boxesOverlap(b, p))) { best = b; bestKey = key; }
      }
    }
    return best;
  };
  const fixed = taken.map((t) => ({ x: t.x, y: t.y, w: t.w, h: t.h }));
  // One pass: each box at the largest share of its size (from `top` down) that finds a free place.
  const pass = (top, shrinkEach) => {
    const placed = [...fixed];
    const out = new Map();
    for (const { id, box } of boxes) {
      let got = null;
      let last = '';
      for (let step = 20; step >= 0 && !got; step -= 1) {
        const size = sized(box, (top * step) / 20);
        const key = `${size.w}x${size.h}`;
        if (key === last) continue;
        last = key;
        got = spot(box, size, placed);
        if (!shrinkEach) break;
      }
      if (!got) return null;
      placed.push(got);
      out.set(id, got);
    }
    return out;
  };
  const each = pass(1, true);
  if (each) return each;
  for (let step = 19; step >= 0; step -= 1) {
    const all = pass(step / 20, false);
    if (all) return all;
  }
  // Too many even at the smallest size: cascaded inside the area, a step down and across each.
  const out = new Map();
  boxes.forEach(({ id, box }, i) => {
    const size = sized(box, 0);
    const spanX = Math.max(1, A.w - size.w + 1);
    const spanY = Math.max(1, A.h - size.h + 1);
    out.set(id, { x: A.x + ((i * 32) % spanX), y: A.y + ((i * 32) % spanY), ...size });
  });
  return out;
}
