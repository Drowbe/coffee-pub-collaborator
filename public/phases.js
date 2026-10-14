// The phase timeline rule (documentation/plans/plan-one-bar.md, decision 7 and step 1). A template's phases
// ([{ id, label, main? }], in order) and a space's dates ({ <id>: { start?, end? } }, days as YYYY-MM-DD) make one
// contiguous timeline: a boundary is the first day of the next phase, and the phase before it ends the day before. The
// first phase starts on the day the space was created when it has no start of its own. Only the main phase has an
// end, and so does the last phase in order (Post-trip may be given an end day, or left open-ended); every other dated
// phase ends where the next dated one starts, and the last dated phase is open-ended unless it has an end of its own.
// A phase with no dates has zero width and is skipped. Nothing here touches a document, so the server
// (server/store.js) and tools/check-phases.mjs run it in node, and the pages run it in the browser as `Phases`.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Phases = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
  const PHASE_ID = /^[a-z][a-z0-9-]*$/;
  // The one colour a phase has everywhere it is drawn (the sheet's bands and rows, Set up's rows, the status strip's
  // bars, pin and dot, and any module reading host.util.phaseTimeline): its place in the template's list picks one of
  // the eight theme tints by name (design-theme.md, "Tints"), round again after the eighth. Templates carry no colour.
  const TINTS = ['blue', 'green', 'teal', 'purple', 'orange', 'pink', 'gold', 'red'];
  const tintOf = (i) => TINTS[((i % TINTS.length) + TINTS.length) % TINTS.length];

  const pad = (n) => String(n).padStart(2, '0');
  // A day, written as YYYY-MM-DD, that is a real calendar day.
  function isDay(s) {
    const m = typeof s === 'string' ? YMD.exec(s) : null;
    if (!m) return false;
    const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])));
    return d.getUTCFullYear() === Number(m[1]) && d.getUTCMonth() === Number(m[2]) - 1 && d.getUTCDate() === Number(m[3]);
  }
  const parseDay = (s) => { const m = YMD.exec(s); return Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])); };
  const dayAt = (ms) => { const d = new Date(ms); return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`; };
  // The day `n` days after `day` (n may be negative).
  const addDays = (day, n) => dayAt(parseDay(day) + n * DAY_MS);
  // Whole days from `a` to `b` (negative when b is earlier).
  const daysBetween = (a, b) => Math.round((parseDay(b) - parseDay(a)) / DAY_MS);
  // A day from a day or a moment (an ISO string or a Date), the moment read in local time. Null when it is neither.
  function dayOf(value) {
    if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
    if (typeof value !== 'string' || !value) return null;
    if (isDay(value)) return value;
    return dayOf(new Date(value));
  }

  // The template's phases as given, with anything malformed left out.
  function cleanPhases(list) {
    return (Array.isArray(list) ? list : []).filter((p) => p && typeof p === 'object' && typeof p.id === 'string' && PHASE_ID.test(p.id))
      .map((p) => ({ id: p.id, label: typeof p.label === 'string' && p.label.trim() ? p.label.trim() : p.id, main: p.main === true }));
  }
  // The stored dates, leniently: only real days under start and end, only phases with at least one of them. This is
  // the shape stored on the space; the rule's refusals are problemOf's.
  function cleanDates(raw) {
    const out = {};
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;
    for (const [id, span] of Object.entries(raw)) {
      if (!PHASE_ID.test(id) || !span || typeof span !== 'object' || Array.isArray(span)) continue;
      const start = isDay(span.start) ? span.start : null;
      const end = isDay(span.end) ? span.end : null;
      if (!start && !end) continue;
      out[id] = Object.assign({}, start ? { start } : {}, end ? { end } : {});
    }
    return out;
  }

  // Which phases hold an end of their own: the main phase, and the last phase in order. (Any other phase ends the day
  // before the next dated one starts, so its end is that start moved.)
  const ownEnd = (list, i) => Boolean(list[i]) && (list[i].main || i === list.length - 1);

  // Each phase's own start, with the first phase's falling back to the created day. Null when it has none.
  const startOf = (phases, dates, i, created) => (dates[phases[i].id] && dates[phases[i].id].start) || (i === 0 ? created : null);

  // Why `dates` is refused for `phases`, as one sentence, or null when it is allowed: an unknown phase, a date that is
  // not a day, an end on a phase that is not main, an end before its start, or a start that is not after the previous
  // boundary (or not before the next: the same rule read from `moved`'s side, when the caller names the phase it moved).
  function problemOf(phases, dates, { created, moved } = {}) {
    const list = cleanPhases(phases);
    if (!dates || typeof dates !== 'object' || Array.isArray(dates)) return 'Phases must be a set of dates by phase id.';
    const main = list.find((p) => p.main) || null;
    const byId = Object.fromEntries(list.map((p) => [p.id, p]));
    for (const [id, span] of Object.entries(dates)) {
      const phase = byId[id];
      if (!phase) return `There is no phase called "${id}".`;
      if (!span || typeof span !== 'object' || Array.isArray(span)) return `${phase.label}'s dates are start and end.`;
      for (const key of Object.keys(span)) if (key !== 'start' && key !== 'end') return `${phase.label}'s dates are start and end.`;
      for (const key of ['start', 'end']) {
        const v = span[key];
        if (v !== undefined && v !== null && v !== '' && !isDay(v)) return `${phase.label}'s ${key} must be a day written as YYYY-MM-DD.`;
      }
      if (isDay(span.end) && !ownEnd(list, list.indexOf(phase))) return main ? `Only ${main.label}, the main phase, and the last phase have an end.` : 'Only the last phase has an end.';
    }
    const clean = cleanDates(dates);
    const createdDay = dayOf(created);
    // The dated phases in order, each with its start and (the main phase) its end.
    const dated = [];
    list.forEach((phase, i) => {
      const start = startOf(list, clean, i, createdDay);
      const end = ownEnd(list, i) && clean[phase.id] && clean[phase.id].end ? clean[phase.id].end : null;
      if (end && !start) return;
      if (start) dated.push({ phase, start, end });
    });
    for (const phase of list) {
      const span = clean[phase.id];
      if (span && span.end && !dated.some((d) => d.phase === phase)) return `Set when ${phase.label} starts before its end.`;
      if (span && span.end && span.start && span.end < span.start) return `${phase.label} can't end before it starts, ${span.start}.`;
      if (span && span.end && !span.start && createdDay && span.end < createdDay) return `${phase.label} can't end before it starts, ${createdDay}.`;
    }
    for (let i = 1; i < dated.length; i += 1) {
      const prev = dated[i - 1];
      const cur = dated[i];
      const after = prev.end || prev.start;
      if (cur.start <= after) {
        if (moved && prev.phase.id === moved) return `${prev.phase.label} must ${prev.end ? 'end' : 'start'} before ${cur.phase.label} starts, ${cur.start}.`;
        return `${cur.phase.label} must start after ${prev.phase.label} ${prev.end ? 'ends' : 'starts'}, ${after}.`;
      }
    }
    return null;
  }

  // The bands, one per phase in order: { id, label, main, tint, start, end, dated, current }.
  // `tint` is the phase's colour name (tintOf). `start` and `end` are days (inclusive); `end` is null for an open-ended band; both null and `dated` false for a phase with no dates (zero
  // width). `current` is the one band `today` falls in, when a day is given.
  function timelineOf(phases, dates, { today, created } = {}) {
    const list = cleanPhases(phases);
    const clean = cleanDates(dates);
    const createdDay = dayOf(created);
    const day = isDay(today) ? today : null;
    const starts = list.map((p, i) => startOf(list, clean, i, createdDay));
    return list.map((phase, i) => {
      const start = starts[i];
      const tint = tintOf(i);
      if (!start) return { id: phase.id, label: phase.label, main: phase.main, tint, start: null, end: null, dated: false, current: false };
      let next = null;
      for (let j = i + 1; j < list.length && !next; j += 1) if (starts[j] && starts[j] > start) next = starts[j];
      let end = next ? addDays(next, -1) : null;
      const own = ownEnd(list, i) && clean[phase.id] ? clean[phase.id].end : null;
      if (own && own >= start && (!end || own < end)) end = own;
      const current = Boolean(day) && day >= start && (!end || day <= end);
      return { id: phase.id, label: phase.label, main: phase.main, tint, start, end, dated: true, current };
    });
  }

  // One boundary moved: `boundary` is { id } for where that phase starts, or { id, edge: 'end' } for the main phase's
  // end; `day` the new day, or null to clear it. Answers { ok: true, dates } with the new dates, or { ok: false,
  // problem } with the sentence, the dates untouched.
  //
  // The timeline has no gaps (decision 7): when the main phase has an end and a dated phase comes after it, the two are
  // one boundary, and the side that was moved carries the other with it (the main end moved: the next dated phase
  // starts the day after; that phase's start moved: the main phase ends the day before). Anything else that moved
  // (another boundary, a boundary cleared) leaves the main end where it is and brings the next dated start to it. The
  // server holds only the order of boundaries (problemOf); this is the editor's rule, so a sheet that moves through it
  // never stores a gap.
  function moveBoundary(phases, dates, boundary, day, { created } = {}) {
    const id = boundary && typeof boundary === 'object' ? boundary.id : boundary;
    const edge = boundary && typeof boundary === 'object' && boundary.edge === 'end' ? 'end' : 'start';
    const list = cleanPhases(phases);
    const next = cleanDates(dates);
    const span = Object.assign({}, next[id] || {});
    if (day === null || day === undefined || day === '') delete span[edge];
    else span[edge] = day;
    if (Object.keys(span).length) next[id] = span; else delete next[id];
    const mainAt = list.findIndex((p) => p.main);
    const main = mainAt >= 0 ? list[mainAt] : null;
    if (main && next[main.id] && isDay(next[main.id].end)) {
      const after = list.slice(mainAt + 1).find((p) => next[p.id] && isDay(next[p.id].start)) || null;
      if (after && after.id === id && edge === 'start') {
        next[main.id] = Object.assign({}, next[main.id], { end: addDays(next[after.id].start, -1) });
      } else if (after) {
        next[after.id] = Object.assign({}, next[after.id], { start: addDays(next[main.id].end, 1) });
      }
    }
    const problem = problemOf(phases, next, { created, moved: id });
    return problem ? { ok: false, problem } : { ok: true, dates: next };
  }

  // --- the sheet's rows (public/phase-sheet.js): one row per phase, a start and an end each ---------------------------
  // The rows read the timeline (timelineOf); these three turn a row's edit into a new set of dates, each answering
  // { ok: true, dates } or { ok: false, problem } with one sentence and the given dates untouched. The timeline stays
  // contiguous: a phase's end is the day before the next dated phase starts, so an end moved moves that start (and an
  // end set on the last dated phase starts the next phase in order the day after); a start moved moves the previous
  // dated phase's end (its own, when it is the main phase); a phase skipped (its dates cleared) joins its neighbours.

  const datedAfter = (bands, from) => { for (let j = from + 1; j < bands.length; j += 1) if (bands[j].dated) return j; return -1; };
  const datedBefore = (bands, from) => { for (let j = from - 1; j >= 0; j -= 1) if (bands[j].dated) return j; return -1; };

  // Phase `id`'s `edge` ('start' or 'end') set to `day`. Refused when the day is not a day, an end comes before its
  // start, a start after its end (the next phase's start, or the main phase's own end), a start not after the previous
  // dated phase's start (it keeps at least one day), or the next phase would start after it ends. `day` null (or '')
  // on an end clears it: the main phase or the last phase in order goes back to open-ended (or to the day before the
  // next phase starts); any other phase's end is the next phase's start, so it can't be cleared on its own.
  function setPhaseDate(phases, dates, id, edge, day, { created } = {}) {
    const list = cleanPhases(phases);
    const i = list.findIndex((p) => p.id === id);
    if (i < 0) return { ok: false, problem: `There is no phase called "${id}".` };
    const which = edge === 'end' ? 'end' : 'start';
    const me0 = list[i];
    if (which === 'end' && (day === null || day === undefined || day === '')) {
      if (!ownEnd(list, i)) return { ok: false, problem: `${me0.label} ends the day before the next phase starts.` };
      return moveBoundary(list, dates, { id, edge: 'end' }, null, { created });
    }
    if (!isDay(day)) return { ok: false, problem: `${me0.label}'s ${which} must be a day written as YYYY-MM-DD.` };
    const bands = timelineOf(list, dates, { created });
    const me = bands[i];
    if (which === 'end') {
      if (!me.dated) return { ok: false, problem: `Set when ${me.label} starts first.` };
      if (day < me.start) return { ok: false, problem: `${me.label} can't end before it starts, ${me.start}.` };
      const j = datedAfter(bands, i);
      if (j < 0) {
        const next = cleanDates(dates);
        if (ownEnd(list, i)) next[id] = Object.assign({}, next[id] || {}, { end: day });
        if (i + 1 < list.length) next[list[i + 1].id] = { start: addDays(day, 1) }; // the next phase in order starts
        const problem = problemOf(list, next, { created, moved: id });
        return problem ? { ok: false, problem } : { ok: true, dates: next };
      }
      const after = addDays(day, 1);
      if (bands[j].end && after > bands[j].end) return { ok: false, problem: `${bands[j].label} can't start after it ends, ${bands[j].end}.` };
      if (ownEnd(list, i)) return moveBoundary(list, dates, { id, edge: 'end' }, day, { created });
      return moveBoundary(list, dates, { id: bands[j].id }, after, { created });
    }
    if (me.dated && me.end && day > me.end) return { ok: false, problem: `${me.label} can't start after it ends, ${me.end}.` };
    const p = datedBefore(bands, i);
    if (p >= 0 && day <= bands[p].start) return { ok: false, problem: `${me.label} must start after ${bands[p].label} starts, ${bands[p].start}.` };
    return moveBoundary(list, dates, { id }, day, { created });
  }

  // An undated phase given dates, nothing else shifted: after the previous dated phase (the day after the main
  // phase's end; else from `today` when the previous phase has begun, else `days` after its start), or, before a
  // later dated phase, the `days` (at most) just before it, the previous phase keeping at least one day. The main
  // phase gets an end too (`days` long, or the day before the next dated phase). Refused when there are no free days.
  function addDatesFor(phases, dates, id, { created, today, days = 7 } = {}) {
    const list = cleanPhases(phases);
    const i = list.findIndex((p) => p.id === id);
    if (i < 0) return { ok: false, problem: `There is no phase called "${id}".` };
    const bands = timelineOf(list, dates, { created });
    const me = bands[i];
    if (me.dated) return { ok: false, problem: `${me.label} has dates already.` };
    const span = Math.max(1, Math.floor(Number(days)) || 7);
    const day = isDay(today) ? today : null;
    const p = datedBefore(bands, i);
    const q = datedAfter(bands, i);
    let start;
    if (p < 0) {
      if (!day) return { ok: false, problem: `Set when ${me.label} starts.` };
      start = day;
    } else if (q < 0) {
      const prev = bands[p];
      const own = prev.main && cleanDates(dates)[prev.id] ? cleanDates(dates)[prev.id].end : null;
      if (own) start = addDays(own, 1);
      else start = day && day > prev.start ? day : addDays(prev.start, span);
    } else {
      const freeDays = daysBetween(bands[p].start, bands[q].start) - 1;
      if (freeDays < 1) return { ok: false, problem: `There are no free days for ${me.label} between ${bands[p].label} and ${bands[q].label}.` };
      start = addDays(bands[q].start, -Math.min(span, freeDays));
    }
    const moved = moveBoundary(list, dates, { id }, start, { created });
    if (!moved.ok || !me.main) return moved;
    const next = moved.dates;
    next[id] = Object.assign({}, next[id], { end: q >= 0 ? addDays(bands[q].start, -1) : addDays(start, span - 1) });
    const problem = problemOf(list, next, { created, moved: id });
    return problem ? { ok: false, problem } : { ok: true, dates: next };
  }

  // Phase `id`'s dates cleared: it is skipped and its neighbours join (the main phase's end stays; the next dated
  // phase starts the day after it). The first phase can't be skipped: it starts on the day the space was made.
  function skipPhase(phases, dates, id, { created } = {}) {
    const list = cleanPhases(phases);
    const i = list.findIndex((p) => p.id === id);
    if (i < 0) return { ok: false, problem: `There is no phase called "${id}".` };
    if (i === 0) return { ok: false, problem: `${list[0].label} is the first phase and can't be skipped.` };
    const without = cleanDates(dates);
    if (without[id] && without[id].end) { delete without[id].end; if (!Object.keys(without[id]).length) delete without[id]; }
    return moveBoundary(list, without, { id }, null, { created });
  }

  // The main phase's end moved later to cover `day`, every later boundary shifted by the same number of days (their
  // lengths kept). Answers { moved: true, dates } with the new dates, or { moved: false, dates } when nothing moves:
  // the day is already covered, is before the main phase, or there is no dated main phase.
  function coverMain(phases, dates, day, { created } = {}) {
    const list = cleanPhases(phases);
    const clean = cleanDates(dates);
    const mainAt = list.findIndex((p) => p.main);
    if (mainAt < 0 || !isDay(day)) return { moved: false, dates: clean };
    const bands = timelineOf(list, clean, { created });
    const main = bands[mainAt];
    if (!main.dated || day <= main.start) return { moved: false, dates: clean };
    const end = main.end || main.start;
    if (day <= end) return { moved: false, dates: clean };
    const delta = daysBetween(end, day);
    const next = Object.assign({}, clean, { [main.id]: Object.assign({}, clean[main.id] || {}, { end: day }) });
    for (let i = mainAt + 1; i < list.length; i += 1) {
      const span = clean[list[i].id];
      if (span && span.start) next[list[i].id] = Object.assign({}, span, { start: addDays(span.start, delta) });
    }
    return { moved: true, dates: next };
  }

  // The chip's words for `today`: "Booking · day 2 of 3" in a band with an end, "Planning · 12 days to go" before the
  // next dated band, else the label (the open-ended band today is in, the last band once everything has passed, the
  // first phase when nothing is dated). '' with no phases.
  function chipWords(bands, today) {
    const list = Array.isArray(bands) ? bands.filter(Boolean) : [];
    if (!list.length) return '';
    const day = isDay(today) ? today : null;
    const current = day ? list.find((b) => b.current || (b.dated && day >= b.start && (!b.end || day <= b.end))) : null;
    if (current) {
      if (current.end) return `${current.label} · day ${daysBetween(current.start, day) + 1} of ${daysBetween(current.start, current.end) + 1}`;
      return current.label;
    }
    const next = day ? list.find((b) => b.dated && b.start > day) : null;
    if (next) {
      const n = daysBetween(day, next.start);
      return `${next.label} · ${n} ${n === 1 ? 'day' : 'days'} to go`;
    }
    const dated = list.filter((b) => b.dated);
    const over = finishedWord(list, day);
    if (over) return over;
    return (dated.length ? dated[dated.length - 1] : list[0]).label;
  }
  // Once the last phase has an end (it isn't the main one) and `day` is past it, everything is over: "Trip finished",
  // the main phase's name (else the last phase's), or '' when it isn't so.
  function finishedWord(list, day) {
    if (!day) return '';
    const dated = list.filter((b) => b.dated);
    const last = dated[dated.length - 1];
    if (!last || last.main || !last.end || day <= last.end) return '';
    const main = dated.find((b) => b.main);
    return `${(main || last).label} finished`;
  }

  // --- the status strip's story (plan-space-story-strip.md, step 1) -------------------------------------------------
  // One sentence from the bands and `today`, in the template's phase labels only, as its clauses in reading order (the
  // strip lets the last ones give way on a narrow screen; storyWords joins them with " · "):
  //   inside a phase, the next a day or more away   "Planning · Booking in 6 days · Trip in 41 days"
  //   the day before a boundary                     "Booking starts tomorrow · Trip in 35 days"
  //   before the first phase, or in a gap           "Planning starts in 12 days · Trip in 52 days"
  //   inside the main phase                         "Trip · day 3 of 10", "Trip · last day" ("Trip · day 3" with no end)
  //   after the main phase                          "Post-trip · back 2 days" ("Trip · back 9 days" once nothing is current)
//   after the last phase, when it has an end      "Trip finished" (the main phase's name, else the last phase's)
  //   no main phase                                 "Build · day 4 of 12 · Launch in 9 days" (the next phase only)
  // With no day, or nothing dated, chipWords' words. [] with no phases.
  const inDays = (n) => (n === 1 ? 'tomorrow' : `in ${n} days`);
  function storyParts(bands, today) {
    const list = Array.isArray(bands) ? bands.filter(Boolean) : [];
    if (!list.length) return [];
    const day = isDay(today) ? today : null;
    if (!day || !list.some((b) => b.dated)) return [chipWords(list, today)];
    const holds = (b) => b.dated && day >= b.start && (!b.end || day <= b.end);
    const current = list.find((b) => b.current && b.dated) || list.find(holds) || null;
    const main = list.find((b) => b.main && b.dated) || null;
    const next = list.find((b) => b.dated && b.start > day) || null;
    if (current && current.main) {
      if (!current.end) return [current.label, `day ${daysBetween(current.start, day) + 1}`];
      if (day === current.end) return [current.label, 'last day'];
      return [current.label, `day ${daysBetween(current.start, day) + 1} of ${daysBetween(current.start, current.end) + 1}`];
    }
    const over = !current && !next ? finishedWord(list, day) : '';
    if (over) return [over];
    const parts = [];
    const toNext = next ? daysBetween(day, next.start) : null;
    if (next && (!current || toNext === 1)) {
      parts.push(`${next.label} starts ${inDays(toNext)}`);
    } else if (current) {
      parts.push(current.label);
      if (!main && current.end) parts.push(`day ${daysBetween(current.start, day) + 1} of ${daysBetween(current.start, current.end) + 1}`);
      if (next && next !== main) parts.push(`${next.label} ${inDays(toNext)}`);
    }
    if (main && main.start > day) {
      if (main !== next || (current && toNext > 1)) parts.push(`${main.label} ${inDays(daysBetween(day, main.start))}`);
    } else if (main && main.end && day > main.end && !next) {
      const back = daysBetween(main.end, day);
      if (!parts.length) parts.push(main.label);
      parts.push(`back ${back} ${back === 1 ? 'day' : 'days'}`);
    }
    if (!parts.length) parts.push(chipWords(list, today));
    return parts;
  }
  const storyWords = (bands, today) => storyParts(bands, today).join(' · ');

  // The days to go at the end of the strip's track: { days, words } before the main phase ("35 days to Trip"), and in
  // it when it has an end ("8 days left", counting today); null with no dated main phase, no day, or once it is over.
  function countdown(bands, today) {
    const list = Array.isArray(bands) ? bands.filter(Boolean) : [];
    const day = isDay(today) ? today : null;
    const main = list.find((b) => b.main && b.dated) || null;
    if (!day || !main) return null;
    if (day < main.start) {
      const n = daysBetween(day, main.start);
      return { days: n, words: `${n} ${n === 1 ? 'day' : 'days'} to ${main.label}` };
    }
    if (main.end && day <= main.end) {
      const n = daysBetween(day, main.end) + 1;
      return { days: n, words: `${n} ${n === 1 ? 'day' : 'days'} left` };
    }
    return null;
  }

  return { TINTS, tintOf, isDay, addDays, daysBetween, dayOf, cleanPhases, cleanDates, problemOf, timelineOf, moveBoundary, setPhaseDate, addDatesFor, skipPhase, coverMain, chipWords, storyParts, storyWords, countdown };
}));
