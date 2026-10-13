// The phase timeline rule (documentation/plans/plan-one-bar.md, decision 7 and step 1). A template's phases
// ([{ id, label, main? }], in order) and a space's dates ({ <id>: { start?, end? } }, days as YYYY-MM-DD) make one
// contiguous timeline: a boundary is the first day of the next phase, and the phase before it ends the day before. The
// first phase starts on the day the space was created when it has no start of its own. Only the main phase has an
// end; every other dated phase ends where the next dated one starts, and the last dated phase is open-ended unless it
// is main. A phase with no dates has zero width and is skipped. Nothing here touches a document, so the server
// (server/store.js) and tools/check-phases.mjs run it in node, and the pages run it in the browser as `Phases`.
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Phases = factory();
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  const DAY_MS = 24 * 60 * 60 * 1000;
  const YMD = /^(\d{4})-(\d{2})-(\d{2})$/;
  const PHASE_ID = /^[a-z][a-z0-9-]*$/;

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
      if (isDay(span.end) && !phase.main) return main ? `Only ${main.label}, the main phase, has an end.` : 'No phase here has an end.';
    }
    const clean = cleanDates(dates);
    const createdDay = dayOf(created);
    // The dated phases in order, each with its start and (the main phase) its end.
    const dated = [];
    list.forEach((phase, i) => {
      const start = startOf(list, clean, i, createdDay);
      const end = phase.main && clean[phase.id] && clean[phase.id].end ? clean[phase.id].end : null;
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

  // The bands, one per phase in order: { id, label, main, start, end, dated, current }. `start` and `end` are days
  // (inclusive); `end` is null for an open-ended band; both null and `dated` false for a phase with no dates (zero
  // width). `current` is the one band `today` falls in, when a day is given.
  function timelineOf(phases, dates, { today, created } = {}) {
    const list = cleanPhases(phases);
    const clean = cleanDates(dates);
    const createdDay = dayOf(created);
    const day = isDay(today) ? today : null;
    const starts = list.map((p, i) => startOf(list, clean, i, createdDay));
    return list.map((phase, i) => {
      const start = starts[i];
      if (!start) return { id: phase.id, label: phase.label, main: phase.main, start: null, end: null, dated: false, current: false };
      let next = null;
      for (let j = i + 1; j < list.length && !next; j += 1) if (starts[j] && starts[j] > start) next = starts[j];
      let end = next ? addDays(next, -1) : null;
      const own = phase.main && clean[phase.id] ? clean[phase.id].end : null;
      if (own && own >= start && (!end || own < end)) end = own;
      const current = Boolean(day) && day >= start && (!end || day <= end);
      return { id: phase.id, label: phase.label, main: phase.main, start, end, dated: true, current };
    });
  }

  // One boundary moved: `boundary` is { id } for where that phase starts, or { id, edge: 'end' } for the main phase's
  // end; `day` the new day, or null to clear it. Answers { ok: true, dates } with the new dates, or { ok: false,
  // problem } with the sentence, the dates untouched.
  function moveBoundary(phases, dates, boundary, day, { created } = {}) {
    const id = boundary && typeof boundary === 'object' ? boundary.id : boundary;
    const edge = boundary && typeof boundary === 'object' && boundary.edge === 'end' ? 'end' : 'start';
    const next = cleanDates(dates);
    const span = Object.assign({}, next[id] || {});
    if (day === null || day === undefined || day === '') delete span[edge];
    else span[edge] = day;
    if (Object.keys(span).length) next[id] = span; else delete next[id];
    const problem = problemOf(phases, next, { created, moved: id });
    return problem ? { ok: false, problem } : { ok: true, dates: next };
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
    return (dated.length ? dated[dated.length - 1] : list[0]).label;
  }

  return { isDay, addDays, daysBetween, dayOf, cleanPhases, cleanDates, problemOf, timelineOf, moveBoundary, coverMain, chipWords };
}));
