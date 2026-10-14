// The call's toolbar in the always-on column (plan-one-bar.md, step 6): every control the toolbar has, as a wrapping
// row of at most `rows` rows under the tiles. When the column is too narrow for them all, the least important fold
// into the toolbar's "..." (space.js opens it on the shared menu, host-menu.js), lowest `data-collapse` first, the
// same order the docked toolbar folds in. Pure arithmetic, so tools/check-canvas.mjs can ask it.
//
// items: the toolbar's children in order, each { id, width, priority, hidden }: `priority` is its data-collapse (a
// number; none for the ones that never fold: the "..." and Leave the call), `hidden` true for one hidden for its own
// reason (no screen share in this browser), which takes no room and is never folded. `more` is the id of the "..."
// (it takes room only once something folds). width: the room in the row; gap: the space between two controls.
// Returns the ids folded, in the order they folded.

// The call's titlebar in the column reads the environment's name for the conference (its template's or its own), else
// "Call" (the built-in name, Conference, is the module's; the titlebar names the call, as Chat's names the Discussion).
export function callTitle(name) {
  const n = String(name || '').replace(/\s+/g, ' ').trim();
  return !n || n === 'Conference' ? 'Call' : n;
}

// The time in the call, as the titlebar shows it: mm:ss, h:mm:ss from the first hour ("12:34", "1:00:00"). Whole seconds;
// anything not a number, or below 0, reads 0. callDuration is the same as a <time datetime>: PT12M34S.
export function callTime(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const pad = (n) => String(n).padStart(2, '0');
  return h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
}
export function callDuration(seconds) {
  const s = Math.max(0, Math.floor(Number(seconds) || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return `PT${h ? `${h}H` : ''}${h || m ? `${m}M` : ''}${s % 60}S`;
}

// How many rows the given widths wrap into (a flex row with `flex-wrap: wrap`).
export function wrapRows(widths, width, gap = 0) {
  let rows = 0;
  let used = 0;
  for (const w of widths) {
    if (rows === 0 || used + gap + w > width + 0.5) {
      rows += 1;
      used = w;
    } else used += gap + w;
  }
  return rows;
}

export function foldCallToolbar({ items = [], width = 0, gap = 0, rows = 2, more = 'floatbar-more' } = {}) {
  const shown = items.filter((it) => !it.hidden || it.id === more);
  const order = shown
    .filter((it) => it.id !== more && Number.isFinite(Number(it.priority)) && it.priority !== null && it.priority !== undefined)
    .sort((a, b) => Number(a.priority) - Number(b.priority));
  const folded = [];
  const fits = () => {
    const widths = shown
      .filter((it) => (it.id === more ? folded.length > 0 : !folded.includes(it.id)))
      .map((it) => Number(it.width) || 0);
    return wrapRows(widths, width, gap) <= rows;
  };
  for (const it of order) {
    if (fits()) break;
    folded.push(it.id);
  }
  return folded;
}
