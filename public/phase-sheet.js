// The timeline sheet behind the phase chip (documentation/plans/plan-one-bar.md, decisions 7, 8 and 9, step 3; redrawn
// to Thomas's sketch: a bar, then one row per phase): a <dialog> in the editor window's look (public/sdk/host.css
// .sdk-editor; the rules here are style.css's .phase-sheet). At the top the bar: the phases as bands laid end to end,
// each as wide as it is long (a least width keeps a short one readable), in a tint of its own with its name, the
// "today" line in the band today falls in and that band marked "now"; a phase with no dates is a small dashed stub.
// Under it one row per phase in the template's order, every phase at once: its name, a start and an end (native date
// inputs, so a phone's picker and the arrow keys both work) and its length in days; an undated row reads "Not
// scheduled" with Add dates. Every edit goes through the rule in public/phases.js (setPhaseDate, addDatesFor,
// skipPhase), which keeps the timeline contiguous: an end moved moves the next start, a start moved moves the previous
// end, a refusal is one sentence by the row and in the live region, and the input snaps back. Nothing dated yet: one
// first step, "Start the first phase on", then the ends down the list (an end set starts the next phase and puts the
// keyboard on its end). Whoever may not PATCH the space reads the same rows with the inputs disabled.
//
// Nothing saves as you go (the action bar's rule, public/action-bar.js): the edits are held in the sheet, a Save and a
// Cancel sit in a bar locked to its bottom, Save sends ONE PATCH with the whole phases object, a click outside the
// sheet does nothing, and Escape or Cancel close it, asking "Discard changes?" first when dates were edited. A reader
// without the right to PATCH sees Close alone.
//
// The pure parts (chipFit, bandShares, todayPercent, rowsOf, plainDays, dayWords) touch no document, so
// tools/check-nav.mjs runs them in node. `rule` is the Phases object (window.Phases on a page).

import { actionBar } from './action-bar.js';

// The chip in the top bar gives way in three steps (decision 9): its label, then the dot alone, then nothing.
// `avail` is the width it may take, `full` and `dot` its widths with the label and with the dot only.
export function chipFit({ avail, full, dot }) {
  const limit = Number.isFinite(avail) ? avail : Infinity;
  if (full <= limit + 0.5) return 'full';
  if (dot <= limit + 0.5) return 'dot';
  return 'none';
}

export const BAND_MIN = 56; // the least width of a dated band, in px (a one-day phase keeps it; 12 phases scroll sideways)
const OPEN_DAYS_PAST_TODAY = 14; // how far an open-ended band is drawn past today
// The bands' tints, by position: eight named tokens (design-theme.md, "Tints"), round again after the eighth.
export const TINTS = ['blue', 'green', 'teal', 'purple', 'orange', 'pink', 'gold', 'red'];
export const tintOf = (i) => TINTS[((i % TINTS.length) + TINTS.length) % TINTS.length];

// How much of the bar each band takes: { id, days, grow }. A dated band's days are its length (an open-ended one runs
// to two weeks past `today`, or its start); `grow` is its share of the bar (flex-grow), the days themselves. An
// undated band has none.
export function bandShares(bands, { today, rule } = {}) {
  const R = rule || globalThis.Phases;
  return bands.map((b) => {
    if (!b.dated) return { id: b.id, days: 0, grow: 0 };
    let days;
    if (b.end) days = R.daysBetween(b.start, b.end) + 1;
    else {
      const far = today && today > b.start ? today : b.start;
      days = R.daysBetween(b.start, far) + 1 + OPEN_DAYS_PAST_TODAY;
    }
    return { id: b.id, days, grow: days };
  });
}

// Where the "today" line goes across a band, as a percent of its width, or null when today is not in it.
export function todayPercent(band, days, today, { rule } = {}) {
  const R = rule || globalThis.Phases;
  if (!today || !band || !band.dated || today < band.start || (band.end && today > band.end)) return null;
  return ((R.daysBetween(band.start, today) + 0.5) / Math.max(1, days)) * 100;
}

// The rows, one per band in order: { id, label, main, current, dated, start, end, days, open, endEditable, canSkip,
// minStart, maxStart, minEnd }. `days` is the length (null when open-ended); `endEditable` is false for the last phase
// in order unless it is main (it has no end of its own); the first phase keeps its dates (`canSkip` false); the
// bounds are what the date pickers grey out: a start after the previous dated phase's start and not after its own
// end, an end not before its start.
export function rowsOf(bands, { rule } = {}) {
  const R = rule || globalThis.Phases;
  const list = Array.isArray(bands) ? bands.filter(Boolean) : [];
  return list.map((b, i) => {
    const prev = list.slice(0, i).reverse().find((x) => x.dated) || null;
    const dated = Boolean(b.dated);
    return {
      id: b.id,
      label: b.label,
      main: Boolean(b.main),
      current: Boolean(b.current),
      dated,
      start: dated ? b.start : null,
      end: dated ? b.end || null : null,
      days: dated && b.end ? R.daysBetween(b.start, b.end) + 1 : null,
      open: dated && !b.end,
      endEditable: dated && (Boolean(b.main) || i < list.length - 1),
      canSkip: dated && i > 0,
      minStart: prev ? R.addDays(prev.start, 1) : null,
      maxStart: dated && b.end ? b.end : null,
      minEnd: dated ? b.start : null,
    };
  });
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

const daysWord = (n) => `${n} ${n === 1 ? 'day' : 'days'}`;

// --- the sheet ----------------------------------------------------------------------------------------------------

// Two sets of dates are the same when every phase has the same start and end (the order of the keys does not count).
export function sameDates(a, b) {
  const one = (d) => JSON.stringify(Object.keys(d || {}).sort().map((id) => [id, d[id] && d[id].start || '', d[id] && d[id].end || '']));
  return one(a) === one(b);
}

// Opens the sheet over the page. `phases` is the template's list, `dates` the space's dates, `created` the space's
// createdAt, `today` a day, `canEdit` whether this person may PATCH, `save(dates)` the save (resolving to the dates the
// server kept), `onChange(dates)` told after each kept save, `rule` the Phases object, `doc` the document to draw in.
// Returns { el, close, cancel, bar }: `close` closes it at once, `cancel` as Escape does (asking when dirty).
export function openPhaseSheet({ phases, dates, created, today, canEdit = false, save, onChange, rule, doc = document, opener = null, words = {} } = {}) {
  const R = rule || globalThis.Phases;
  const ownerWord = words.owner || 'owner';
  const moderatorWord = words.moderator || 'moderator';
  const list = R.cleanPhases(phases);
  let kept = R.cleanDates(dates); // the dates the server has
  let draft = R.cleanDates(dates); // the dates shown, ahead of a save
  const fmt = (d) => dayWords(d, { today });

  const dlg = doc.createElement('dialog');
  dlg.className = 'phase-sheet';
  dlg.setAttribute('aria-labelledby', 'phase-sheet-title');
  dlg.innerHTML = `
    <div class="phase-sheet-body action-content">
    <div class="phase-sheet-head">
      <h2 id="phase-sheet-title">Phases</h2>
      <p class="phase-sheet-now"></p>
      <button type="button" class="phase-sheet-close" aria-label="Close"><i class="fa-solid fa-xmark fa-fw" aria-hidden="true"></i></button>
    </div>
    <div class="phase-strip">
      <ol class="phase-bands" aria-label="The phases in order"></ol>
    </div>
    <div class="phase-first" hidden>
      <label class="phase-first-label" for="phase-first-day">Start the first phase on</label>
      <input type="date" class="phase-date" id="phase-first-day">
      <button type="button" class="btn btn-small phase-first-go">Start</button>
    </div>
    <div class="phase-rows" role="group" aria-label="Each phase's start and end">
      <div class="phase-rows-head" aria-hidden="true"><span>Phase</span><span>Start</span><span>End</span><span>Length</span><span></span></div>
      <ol class="phase-list"></ol>
    </div>
    <p class="phase-sheet-hint hint" id="phase-sheet-hint"></p>
    <p class="phase-sheet-status" role="status" aria-live="polite"></p>
    </div>
  `;
  const bandsEl = dlg.querySelector('.phase-bands');
  const listEl = dlg.querySelector('.phase-list');
  const firstEl = dlg.querySelector('.phase-first');
  const firstInput = dlg.querySelector('#phase-first-day');
  const nowEl = dlg.querySelector('.phase-sheet-now');
  const hintEl = dlg.querySelector('.phase-sheet-hint');
  const statusEl = dlg.querySelector('.phase-sheet-status');
  dlg.classList.toggle('read-only', !canEdit);
  hintEl.textContent = canEdit
    ? 'Each phase starts the day after the one before ends. A phase with no dates is skipped.'
    : `Only ${ownerWord === 'owner' ? 'an' : 'a'} ${ownerWord} or a ${moderatorWord} can change these dates.`;

  const say = (text) => { statusEl.textContent = ''; statusEl.textContent = text; };

  // The bar: Save sends the whole phases object once; Cancel, Escape and the X ask first when dates were edited.
  const bar = actionBar({
    readOnly: !canEdit,
    label: 'Save the phases',
    doc,
    dirty: () => canEdit && !sameDates(draft, kept),
    onCancel: () => close(),
    onSave: async () => {
      const sending = draft;
      let result;
      try {
        result = await save(sending);
      } catch (err) {
        throw new Error(plainDays((err && err.message) || 'The dates were not saved.', fmt)); // the bar says it
      }
      kept = R.cleanDates(result && typeof result === 'object' ? result : sending);
      draft = kept;
      problemOn('', '');
      if (typeof onChange === 'function') onChange(kept);
      update();
      return true;
    },
  });
  dlg.appendChild(bar.el);
  const timeline = () => R.timelineOf(list, draft, { today, created });

  // One band and one row per phase, built once; update() fills them, so the keyboard stays where it is.
  const bandEls = new Map();
  const rowEls = new Map();
  list.forEach((p, i) => {
    const band = doc.createElement('li');
    band.className = 'phase-band';
    band.dataset.id = p.id;
    band.dataset.tint = tintOf(i);
    band.innerHTML = '<span class="phase-band-label"></span><span class="phase-band-span"></span><span class="phase-band-now" hidden>now</span><span class="phase-today" hidden><span class="phase-today-word">Today</span></span>';
    band.addEventListener('click', () => focusRow(p.id));
    band.addEventListener('mouseenter', () => lit(p.id, true));
    band.addEventListener('mouseleave', () => lit(p.id, false));
    bandsEl.appendChild(band);
    bandEls.set(p.id, band);

    const row = doc.createElement('li');
    row.className = 'phase-row';
    row.dataset.id = p.id;
    row.dataset.tint = tintOf(i);
    row.innerHTML = `
      <div class="phase-row-name">
        <span class="phase-swatch" aria-hidden="true"></span>
        <span class="phase-row-label"></span>
        <span class="phase-tag phase-tag-now" hidden>now</span>
        <span class="phase-tag phase-tag-main" hidden>main</span>
      </div>
      <label class="phase-row-field phase-row-start"><span class="phase-row-word">Start</span><input type="date" class="phase-date" data-edge="start"></label>
      <label class="phase-row-field phase-row-end"><span class="phase-row-word">End</span><input type="date" class="phase-date" data-edge="end"></label>
      <span class="phase-row-days"></span>
      <div class="phase-row-tools"><button type="button" class="btn btn-small phase-skip">Skip</button></div>
      <div class="phase-row-off" hidden><span class="phase-row-off-word">Not scheduled</span><button type="button" class="btn btn-small phase-add"><i class="fa-solid fa-plus fa-fw" aria-hidden="true"></i> Add dates</button></div>
      <p class="phase-row-problem" hidden></p>
    `;
    row.querySelector('.phase-row-label').textContent = p.label;
    row.querySelectorAll('input').forEach((input) => {
      input.setAttribute('aria-label', `${p.label} ${input.dataset.edge === 'end' ? 'ends' : 'starts'}`);
      input.dataset.id = p.id;
    });
    row.querySelector('.phase-skip').setAttribute('aria-label', `Skip ${p.label}: clear its dates`);
    row.querySelector('.phase-add').setAttribute('aria-label', `Add dates for ${p.label}`);
    row.addEventListener('mouseenter', () => lit(p.id, true));
    row.addEventListener('mouseleave', () => lit(p.id, false));
    row.addEventListener('focusin', () => lit(p.id, true));
    row.addEventListener('focusout', (event) => { if (!row.contains(event.relatedTarget)) lit(p.id, false); });
    listEl.appendChild(row);
    rowEls.set(p.id, row);
  });

  function lit(id, on) {
    const band = bandEls.get(id);
    const row = rowEls.get(id);
    if (band) band.classList.toggle('lit', on);
    if (row) row.classList.toggle('lit', on);
  }

  // The keyboard onto a row: its start, its Add dates, or (read-only) the row itself, scrolled into view.
  function focusRow(id, edge = 'start') {
    const row = rowEls.get(id);
    if (!row) return;
    const target = row.classList.contains('off') ? row.querySelector('.phase-add') : row.querySelector(`input[data-edge="${edge}"]`) || row.querySelector('input');
    if (target && !target.disabled && !target.hidden && target.offsetParent !== null) target.focus();
    else { row.tabIndex = -1; row.focus(); }
    row.scrollIntoView({ block: 'nearest' });
  }

  // A refusal's sentence by its row; any edit kept clears every row's (the dates are right again).
  function problemOn(id, text) {
    for (const [rid, row] of rowEls) {
      const p = row.querySelector('.phase-row-problem');
      const mine = rid === id ? text || '' : '';
      p.textContent = mine;
      p.hidden = !mine;
      row.classList.toggle('has-problem', Boolean(mine));
    }
  }

  const nothingDated = () => !Object.keys(R.cleanDates(draft)).length;

  function update() {
    const bands = timeline();
    const shares = bandShares(bands, { today, rule: R });
    const rows = rowsOf(bands, { rule: R });
    nowEl.textContent = today ? `Today, ${fmt(today)}: ${R.chipWords(bands, today)}` : R.chipWords(bands, today);
    bands.forEach((b, i) => {
      const band = bandEls.get(b.id);
      const share = shares[i];
      band.classList.toggle('off', !b.dated);
      band.classList.toggle('current', b.current);
      band.classList.toggle('main', b.main);
      band.style.flexGrow = b.dated ? String(share.grow) : '0';
      const span = !b.dated ? 'not scheduled' : b.end ? `${fmt(b.start)} to ${fmt(b.end)}, ${daysWord(share.days)}` : `from ${fmt(b.start)}`;
      band.querySelector('.phase-band-label').textContent = b.label;
      band.querySelector('.phase-band-span').textContent = span;
      band.querySelector('.phase-band-now').hidden = !b.current;
      band.title = `${b.label}: ${span}${b.current ? ', now' : ''}`;
      const at = todayPercent(b, share.days, today, { rule: R });
      const line = band.querySelector('.phase-today');
      line.hidden = at === null;
      if (at !== null) line.style.setProperty('--at', `${at}%`);
      line.classList.toggle('at-start', at !== null && at < 20);
      line.classList.toggle('at-end', at !== null && at > 80);
    });
    rows.forEach((r) => {
      const row = rowEls.get(r.id);
      row.classList.toggle('off', !r.dated);
      row.classList.toggle('current', r.current);
      row.classList.toggle('main', r.main);
      row.querySelector('.phase-tag-now').hidden = !r.current;
      row.querySelector('.phase-tag-main').hidden = !r.main;
      const start = row.querySelector('input[data-edge="start"]');
      const end = row.querySelector('input[data-edge="end"]');
      start.value = r.start || '';
      end.value = r.end || '';
      start.disabled = !canEdit || !r.dated;
      end.disabled = !canEdit || !r.endEditable;
      if (r.minStart) start.min = r.minStart; else start.removeAttribute('min');
      if (r.maxStart) start.max = r.maxStart; else start.removeAttribute('max');
      if (r.minEnd) end.min = r.minEnd; else end.removeAttribute('min');
      end.placeholder = r.open ? 'no end yet' : '';
      row.querySelector('.phase-row-days').textContent = !r.dated ? '' : r.days !== null ? daysWord(r.days) : 'no end yet';
      row.querySelector('.phase-row-tools').hidden = !canEdit || !r.canSkip;
      row.querySelector('.phase-row-off').hidden = r.dated;
      row.querySelector('.phase-add').hidden = !canEdit;
      row.querySelector('.phase-row-off-word').textContent = canEdit ? 'Not scheduled' : 'Not scheduled (skipped)';
    });
    const first = canEdit && nothingDated();
    firstEl.hidden = !first;
    if (first && !firstInput.value) firstInput.value = today || (bands[0] && bands[0].start) || '';
  }

  // One edit through the rule: kept and drawn when allowed, the sentence by the row and read out when not (the input
  // snaps back in update()). An end set that dates the next phase puts the keyboard on that phase's end.
  function commit(id, edge, day) {
    const before = timeline();
    const answer = R.setPhaseDate(list, draft, id, edge, day, { created });
    if (!answer.ok) {
      const text = plainDays(answer.problem, fmt);
      problemOn(id, text);
      say(text);
      update();
      return false;
    }
    draft = answer.dates;
    problemOn(id, '');
    const after = timeline();
    const i = list.findIndex((p) => p.id === id);
    const me = after[i];
    const parts = [`${me.label} ${edge === 'end' ? 'ends' : 'starts'} ${fmt(edge === 'end' ? me.end : me.start)}.`];
    let focusNext = null;
    if (edge === 'end') {
      const j = after.findIndex((b, k) => k > i && b.dated);
      if (j >= 0 && (!before[j].dated || before[j].start !== after[j].start)) parts.push(`${after[j].label} starts ${fmt(after[j].start)}.`);
      if (j >= 0 && !before[j].dated) focusNext = after[j].id;
    } else if (i > 0) {
      const p = after.slice(0, i).reverse().find((b) => b.dated);
      const was = p ? before.find((b) => b.id === p.id) : null;
      if (p && was && was.end !== p.end) parts.push(`${p.label} ends ${fmt(p.end)}.`);
    }
    say(parts.join(' '));
    update();
    if (focusNext) {
      const row = rowEls.get(focusNext);
      const input = row && row.querySelector('input[data-edge="end"]');
      if (input && !input.disabled) input.focus(); else focusRow(focusNext);
    }
    bar.refresh();
    return true;
  }

  function applyAnswer(id, answer, said) {
    if (!answer.ok) {
      const text = plainDays(answer.problem, fmt);
      problemOn(id, text);
      say(text);
      update();
      return false;
    }
    draft = answer.dates;
    problemOn(id, '');
    say(said(timeline()));
    update();
    bar.refresh();
    return true;
  }

  function skip(id) {
    const ok = applyAnswer(id, R.skipPhase(list, draft, id, { created }), (bands) => {
      const i = list.findIndex((p) => p.id === id);
      const prev = bands.slice(0, i).reverse().find((b) => b.dated);
      return `${list[i].label} is skipped.${prev ? ` ${prev.label} ${prev.end ? `runs to ${fmt(prev.end)}` : `runs on from ${fmt(prev.start)}`}.` : ''}`;
    });
    if (ok) focusRow(id);
  }

  function addDates(id) {
    const ok = applyAnswer(id, R.addDatesFor(list, draft, id, { created, today }), (bands) => {
      const me = bands.find((b) => b.id === id);
      return `${me.label} ${me.end ? `is ${fmt(me.start)} to ${fmt(me.end)}` : `starts ${fmt(me.start)}`}.`;
    });
    if (ok) focusRow(id, 'end');
  }

  // A date input commits when its value is a whole day that differs from the row's (Chromium fires change on every
  // keystroke in the year, with years like 0002 on the way: those wait for the fourth digit, Enter or leaving).
  const yearOf = (v) => Number(String(v).slice(0, 4));
  function wire(input) {
    const current = () => {
      const bands = timeline();
      const me = bands.find((b) => b.id === input.dataset.id);
      return me && me.dated ? (input.dataset.edge === 'end' ? me.end || '' : me.start) : '';
    };
    const tryCommit = ({ typing = false } = {}) => {
      const v = input.value;
      if (!R.isDay(v)) { if (!typing) update(); return; }
      if (typing && yearOf(v) < 1000) return;
      if (v === current()) return;
      commit(input.dataset.id, input.dataset.edge, v);
    };
    input.addEventListener('change', () => tryCommit({ typing: true }));
    input.addEventListener('blur', () => tryCommit());
    input.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') { event.preventDefault(); tryCommit(); }
    });
  }
  listEl.querySelectorAll('input.phase-date').forEach(wire);
  listEl.addEventListener('click', (event) => {
    const skipBtn = event.target.closest('.phase-skip');
    if (skipBtn) { skip(skipBtn.closest('.phase-row').dataset.id); return; }
    const addBtn = event.target.closest('.phase-add');
    if (addBtn) addDates(addBtn.closest('.phase-row').dataset.id);
  });

  // The first step when nothing is dated: the first phase's own start, then the keyboard on its end.
  function startFirst() {
    if (!list.length || !R.isDay(firstInput.value)) { say('Pick a day to start on.'); return; }
    if (commit(list[0].id, 'start', firstInput.value)) focusRow(list[0].id, 'end');
  }
  dlg.querySelector('.phase-first-go').addEventListener('click', startFirst);
  firstInput.addEventListener('keydown', (event) => { if (event.key === 'Enter') { event.preventDefault(); startFirst(); } });

  function close() {
    if (dlg.open) dlg.close();
  }
  dlg.querySelector('.phase-sheet-close').addEventListener('click', () => bar.requestCancel());
  // No click on the backdrop closes it: the person leaves by Cancel, Escape or Close, and edits are never lost by a stray click.
  bar.bindEscape(dlg);
  dlg.addEventListener('cancel', (event) => { event.preventDefault(); bar.requestCancel(); }); // a browser's own close request
  dlg.addEventListener('close', () => {
    dlg.remove();
    if (opener && typeof opener.focus === 'function' && opener.isConnected) opener.focus();
  });
  doc.body.appendChild(dlg);
  update();
  dlg.showModal();
  const first = !firstEl.hidden ? firstInput : dlg.querySelector('.phase-list input:not(:disabled), .phase-list button:not([hidden])') || dlg.querySelector('.phase-sheet-close');
  if (first) first.focus();
  return { el: dlg, close, cancel: () => bar.requestCancel(), bar };
}
