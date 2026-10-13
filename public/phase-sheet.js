// The timeline sheet behind the phase chip (documentation/plans/plan-one-bar.md, decisions 7, 8 and 9, step 3): a
// <dialog> in the editor window's look (public/sdk/host.css .sdk-editor; the rules here are style.css's .phase-sheet)
// that draws the space's phases as bands in a scrolling row with a "today" line, and one button per boundary between
// dated bands. Pressing a boundary opens a date picker; the arrow keys move it a day, Shift and an arrow a week. The
// timeline has no gaps and no overlaps: every move goes through Phases.moveBoundary (public/phases.js), which keeps
// the main phase's end and the next dated start as one boundary and answers a refusal with a sentence, read out in the
// sheet's live region. Whoever may not PATCH the space reads the sheet and changes nothing.
//
// The pure parts (chipFit, bandWidths, todayOffset, boundariesOf, plainDays) touch no document, so tools/check-nav.mjs
// runs them in node. `rule` is the Phases object (window.Phases on a page).

// The chip in the top bar gives way in three steps (decision 9): its label, then the dot alone, then nothing.
// `avail` is the width it may take, `full` and `dot` its widths with the label and with the dot only.
export function chipFit({ avail, full, dot }) {
  const limit = Number.isFinite(avail) ? avail : Infinity;
  if (full <= limit + 0.5) return 'full';
  if (dot <= limit + 0.5) return 'dot';
  return 'none';
}

export const BAND_MIN = 56; // the least width of a dated band, in px (a one-day phase keeps it; 12 phases scroll sideways)
export const BAND_ROW_MOST = 900; // the row's width before the bands are scaled down (and the least width takes over)
const OPEN_DAYS_PAST_TODAY = 14; // how far an open-ended band is drawn past today

// How wide each band is drawn: { id, days, width }. A dated band's days are its length (an open-ended one runs to two
// weeks past `today`, or its start); each is `days` times one scale, at least `min`; the scale fits the row into
// `most` when it can. An undated band has no width.
export function bandWidths(bands, { today, min = BAND_MIN, most = BAND_ROW_MOST, rule } = {}) {
  const R = rule || globalThis.Phases;
  const dated = bands.filter((b) => b.dated);
  const daysOf = (b) => {
    if (b.end) return R.daysBetween(b.start, b.end) + 1;
    const far = today && today > b.start ? today : b.start;
    return R.daysBetween(b.start, far) + 1 + OPEN_DAYS_PAST_TODAY;
  };
  const total = dated.reduce((n, b) => n + daysOf(b), 0);
  const perDay = total ? Math.min(10, most / total) : 0;
  return bands.map((b) => {
    if (!b.dated) return { id: b.id, days: 0, width: 0 };
    const days = daysOf(b);
    return { id: b.id, days, width: Math.max(min, Math.round(days * perDay)) };
  });
}

// Where the "today" line goes across the row, in px from its left, or null when today is in no band.
export function todayOffset(bands, widths, today, { rule } = {}) {
  const R = rule || globalThis.Phases;
  if (!today) return null;
  let left = 0;
  for (let i = 0; i < bands.length; i += 1) {
    const b = bands[i];
    const w = widths[i] ? widths[i].width : 0;
    if (b.dated && today >= b.start && (!b.end || today <= b.end)) {
      const days = widths[i].days || 1;
      return left + ((R.daysBetween(b.start, today) + 0.5) / days) * w;
    }
    left += w;
  }
  return null;
}

// The boundaries the sheet shows, in order: { kind, id, edge, label, day, at }. `kind` is 'set' for a date that is set
// (the first band's start, every later dated band's start, the main band's end when it is the last dated band) and
// 'add' for one that may be set next (an undated phase before a later dated band, the main end when it has none, and
// the one phase after the last dated band: each boundary set adds the next band). `at` is the index of the band whose
// left edge the boundary sits on (bands.length for the main end at the row's end). `day` is the date of a set
// boundary, or the day an add button offers first.
export function boundariesOf(bands, { today, rule } = {}) {
  const R = rule || globalThis.Phases;
  const out = [];
  const datedAt = bands.map((b, i) => (b.dated ? i : -1)).filter((i) => i >= 0);
  if (!datedAt.length) {
    if (bands.length) out.push({ kind: 'add', id: bands[0].id, edge: 'start', label: 'Set the start', day: today || null, at: 0 });
    return out;
  }
  const last = datedAt[datedAt.length - 1];
  const mainAt = bands.findIndex((b) => b.main);
  const later = (day) => (today && today > day ? today : day);
  bands.forEach((b, i) => {
    if (b.dated) {
      out.push({ kind: 'set', id: b.id, edge: 'start', label: `${b.label} starts`, day: b.start, at: i });
      return;
    }
    if (i > last) return;
    const prev = bands.slice(0, i).reverse().find((x) => x.dated);
    out.push({ kind: 'add', id: b.id, edge: 'start', label: `Set when ${b.label} starts`, day: prev ? R.addDays(prev.start, 1) : today || null, at: i });
  });
  const main = mainAt >= 0 ? bands[mainAt] : null;
  if (main && main.dated && mainAt === last) {
    if (main.end) out.push({ kind: 'set', id: main.id, edge: 'end', label: `${main.label} ends`, day: main.end, at: bands.length });
    else out.push({ kind: 'add', id: main.id, edge: 'end', label: `Set when ${main.label} ends`, day: later(main.start), at: bands.length });
  }
  const next = bands[last + 1];
  if (next) {
    const lastBand = bands[last];
    const from = lastBand.end ? R.addDays(lastBand.end, 1) : later(R.addDays(lastBand.start, 1));
    out.push({ kind: 'add', id: next.id, edge: 'start', label: `Set when ${next.label} starts`, day: from, at: last + 1 });
  }
  return out;
}

// The rule's sentences name days as YYYY-MM-DD; a person reads them as "Oct 4".
export function plainDays(sentence, fmt) {
  return String(sentence || '').replace(/\d{4}-\d{2}-\d{2}/g, (d) => fmt(d));
}

// A day as a person reads it: "Oct 4", with the year when it is not this year's.
export function dayWords(day, { today } = {}) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(day || '');
  if (!m) return '';
  const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
  const sameYear = today ? today.slice(0, 4) === m[1] : true;
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(sameYear ? {} : { year: 'numeric' }) });
}

// --- the sheet ----------------------------------------------------------------------------------------------------

const WEEK = 7;

// Opens the sheet over the page. `phases` is the template's list, `dates` the space's dates, `created` the space's
// createdAt, `today` a day, `canEdit` whether this person may PATCH, `save(dates)` the save (resolving to the dates the
// server kept), `onChange(dates)` told after each kept save, `rule` the Phases object, `doc` the document to draw in.
// Returns { el, close }.
export function openPhaseSheet({ phases, dates, created, today, canEdit = false, save, onChange, rule, doc = document, opener = null, words = {} } = {}) {
  const R = rule || globalThis.Phases;
  const ownerWord = words.owner || 'owner';
  const moderatorWord = words.moderator || 'moderator';
  let kept = R.cleanDates(dates); // the dates the server has
  let draft = R.cleanDates(dates); // the dates shown, ahead of a save
  let saveTimer = 0;
  let saving = null;
  const fmt = (d) => dayWords(d, { today });

  const dlg = doc.createElement('dialog');
  dlg.className = 'phase-sheet';
  dlg.setAttribute('aria-labelledby', 'phase-sheet-title');
  dlg.innerHTML = `
    <div class="phase-sheet-head">
      <h2 id="phase-sheet-title">Phases</h2>
      <p class="phase-sheet-now"></p>
      <button type="button" class="phase-sheet-close" aria-label="Close"><i class="fa-solid fa-xmark fa-fw" aria-hidden="true"></i></button>
    </div>
    <div class="phase-sheet-scroll">
      <div class="phase-row">
        <div class="phase-track">
          <ol class="phase-bands" aria-label="The phases in order"></ol>
          <div class="phase-today" hidden><span class="phase-today-word">Today</span></div>
        </div>
        <ol class="phase-boundaries" aria-label="The dates"></ol>
      </div>
    </div>
    <p class="phase-sheet-undated hint" hidden></p>
    <p class="phase-sheet-hint hint" id="phase-sheet-hint"></p>
    <p class="phase-sheet-status" role="status" aria-live="polite"></p>
  `;
  const bandsEl = dlg.querySelector('.phase-bands');
  const boundariesEl = dlg.querySelector('.phase-boundaries');
  const todayEl = dlg.querySelector('.phase-today');
  const nowEl = dlg.querySelector('.phase-sheet-now');
  const undatedEl = dlg.querySelector('.phase-sheet-undated');
  const hintEl = dlg.querySelector('.phase-sheet-hint');
  const statusEl = dlg.querySelector('.phase-sheet-status');
  hintEl.textContent = canEdit
    ? 'Press a date to pick another. The arrow keys move it a day, Shift and an arrow a week.'
    : `Only ${ownerWord === 'owner' ? 'an' : 'a'} ${ownerWord} or a ${moderatorWord} can change these dates.`;

  const say = (text) => { statusEl.textContent = ''; statusEl.textContent = text; };

  function draw({ focusKey = null } = {}) {
    const bands = R.timelineOf(phases, draft, { today, created });
    const widths = bandWidths(bands, { today, rule: R });
    nowEl.textContent = today ? `Today, ${fmt(today)}: ${R.chipWords(bands, today)}` : R.chipWords(bands, today);
    bandsEl.replaceChildren(...bands.map((b, i) => {
      if (!b.dated) return null;
      const li = doc.createElement('li');
      li.className = `phase-band${b.current ? ' current' : ''}${b.main ? ' main' : ''}`;
      li.style.width = `${widths[i].width}px`;
      const span = b.end ? `${fmt(b.start)} to ${fmt(b.end)}, ${widths[i].days} ${widths[i].days === 1 ? 'day' : 'days'}` : `from ${fmt(b.start)}`;
      li.title = `${b.label}: ${span}`;
      li.innerHTML = `<span class="phase-band-label"></span><span class="phase-band-span"></span>${b.current ? '<span class="phase-band-now">now</span>' : ''}`;
      li.querySelector('.phase-band-label').textContent = b.label;
      li.querySelector('.phase-band-span').textContent = span;
      return li;
    }).filter(Boolean));
    const total = widths.reduce((n, w) => n + w.width, 0);
    bandsEl.style.width = `${total}px`;
    const at = todayOffset(bands, widths, today, { rule: R });
    todayEl.hidden = at === null;
    if (at !== null) todayEl.style.setProperty('--at', `${at}px`);
    todayEl.classList.toggle('at-start', at !== null && at < 24); // its word hangs to the right, not off the row's edge
    const edges = [];
    let left = 0;
    for (const w of widths) { edges.push(left); left += w.width; }
    edges.push(left);
    const list = boundariesOf(bands, { today, rule: R });
    let row = 0; // set boundaries alternate between two rows of pills on a wide screen, so close ones never overlap
    boundariesEl.replaceChildren(...list.map((b) => {
      const li = doc.createElement('li');
      li.className = `phase-boundary ${b.kind}`;
      li.style.setProperty('--at', `${edges[Math.min(b.at, edges.length - 1)]}px`);
      if (b.kind === 'set') { li.dataset.row = String(row % 2); row += 1; }
      const key = `${b.id}:${b.edge}`;
      li.dataset.key = key;
      if (!canEdit) {
        if (b.kind !== 'set') return null;
        li.innerHTML = '<span class="phase-boundary-text"><span class="phase-boundary-label"></span><span class="phase-boundary-day"></span></span>';
        li.querySelector('.phase-boundary-label').textContent = b.label;
        li.querySelector('.phase-boundary-day').textContent = fmt(b.day);
        li.title = `${b.label}, ${fmt(b.day)}`;
        return li;
      }
      const btn = doc.createElement('button');
      btn.type = 'button';
      btn.className = 'btn btn-small phase-boundary-btn';
      btn.setAttribute('aria-describedby', 'phase-sheet-hint');
      if (b.kind === 'set') {
        btn.innerHTML = '<span class="phase-boundary-label"></span><span class="phase-boundary-day"></span>';
        btn.querySelector('.phase-boundary-label').textContent = b.label;
        btn.querySelector('.phase-boundary-day').textContent = fmt(b.day);
        btn.title = `${b.label}, ${fmt(b.day)}`;
        btn.setAttribute('aria-label', `${b.label}, ${fmt(b.day)}. Pick a date`);
      } else {
        btn.classList.add('phase-boundary-add');
        btn.innerHTML = '<i class="fa-solid fa-plus fa-fw" aria-hidden="true"></i> <span class="phase-boundary-label"></span>';
        btn.querySelector('.phase-boundary-label').textContent = b.label;
      }
      const input = doc.createElement('input');
      input.type = 'date';
      input.className = 'phase-date';
      input.hidden = true;
      input.setAttribute('aria-label', b.label);
      if (b.day) input.value = b.day;
      btn.addEventListener('click', () => openPicker(btn, input));
      btn.addEventListener('keydown', (event) => {
        if (b.kind !== 'set') return;
        const step = event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0;
        if (!step) return;
        event.preventDefault();
        move(b, R.addDays(b.day, step * (event.shiftKey ? WEEK : 1)), { focusKey: key, quick: true });
      });
      input.addEventListener('change', () => {
        if (!R.isDay(input.value)) return;
        closePicker(btn, input);
        move(b, input.value, { focusKey: key });
      });
      input.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') { event.preventDefault(); event.stopPropagation(); closePicker(btn, input); }
      });
      input.addEventListener('blur', () => { if (!input.hidden) closePicker(btn, input, { keepFocus: true }); });
      li.append(btn, input);
      return li;
    }).filter(Boolean));
    const undated = bands.filter((b) => !b.dated).map((b) => b.label);
    undatedEl.hidden = !undated.length;
    undatedEl.textContent = undated.length ? `Not dated yet: ${undated.join(', ')}.` : '';
    if (focusKey) {
      const target = boundariesEl.querySelector(`[data-key="${CSS.escape(focusKey)}"] button`);
      if (target) target.focus();
    }
  }

  function openPicker(btn, input) {
    input.hidden = false;
    btn.setAttribute('aria-expanded', 'true');
    input.focus();
    try { if (typeof input.showPicker === 'function') input.showPicker(); } catch (err) { /* the field itself takes a date */ }
  }
  function closePicker(btn, input, { keepFocus = false } = {}) {
    input.hidden = true;
    btn.removeAttribute('aria-expanded');
    if (!keepFocus) btn.focus();
  }

  // One boundary moved through the rule: kept and drawn when allowed, the sentence read out when not. Arrow keys
  // (`quick`) save a moment after the last press; a pick saves at once.
  function move(b, day, { focusKey, quick = false } = {}) {
    const answer = R.moveBoundary(phases, draft, { id: b.id, edge: b.edge }, day, { created });
    if (!answer.ok) { say(plainDays(answer.problem, fmt)); return; }
    draft = answer.dates;
    const after = R.timelineOf(phases, draft, { today, created });
    const band = after.find((x) => x.id === b.id);
    say(`${band.label} ${b.edge === 'end' ? 'ends' : 'starts'} ${fmt(b.edge === 'end' ? band.end : band.start)}.`);
    draw({ focusKey });
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(flush, quick ? 400 : 0);
  }

  async function flush() {
    saveTimer = 0;
    if (!save || saving) { if (saving) saveTimer = setTimeout(flush, 200); return; }
    const sending = draft;
    saving = (async () => {
      try {
        const result = await save(sending);
        kept = R.cleanDates(result && typeof result === 'object' ? result : sending);
        if (draft === sending) draft = kept;
        if (typeof onChange === 'function') onChange(kept);
      } catch (err) {
        draft = kept;
        say(plainDays((err && err.message) || 'The dates were not saved.', fmt));
        draw();
      }
    })();
    await saving;
    saving = null;
  }

  function close() {
    if (saveTimer) { clearTimeout(saveTimer); saveTimer = 0; flush(); }
    if (dlg.open) dlg.close();
  }
  dlg.querySelector('.phase-sheet-close').addEventListener('click', close);
  dlg.addEventListener('click', (event) => { if (event.target === dlg) close(); }); // the backdrop
  dlg.addEventListener('close', () => {
    dlg.remove();
    if (opener && typeof opener.focus === 'function' && opener.isConnected) opener.focus();
  });
  doc.body.appendChild(dlg);
  draw();
  dlg.showModal();
  const first = dlg.querySelector('.phase-boundary-btn') || dlg.querySelector('.phase-sheet-close');
  if (first) first.focus();
  return { el: dlg, close };
}
