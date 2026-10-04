  // Shared by the calendar and its dashboard widget (inlined into both by the build).
  const DAY = 24 * 60 * 60 * 1000;

  // --- dates ---------------------------------------------------------------

  const pad = (n) => String(n).padStart(2, '0');
  const endOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
  function startOf(ev) {
    return ev.allDay ? parseYmd(ev.start) : new Date(ev.start);
  }
  // Times on the server's clock (host.util.hour12, read each time: the lib is inlined after the page's own code, so nothing
  // here may be called during the page's start-up); 12-hour where there is no host (the checks).
  const timeText = (d) => d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', hour12: typeof host === 'undefined' || !host.util || !host.util.hour12 ? true : host.util.hour12() });
  const shortDay = (d) => d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  const startOfDay = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const addDays = (d, n) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);

  // An event runs from `start` to `end`, which may be days later. A timed event's end is a date and
  // time; an all-day event's end is the last day (inclusive). Neither: it lasts as long as it lasts
  // on the one day it starts.
  function durationOf(ev) {
    if (ev.allDay) return ev.end ? Math.max(0, parseYmd(ev.end) - parseYmd(ev.start)) + DAY : DAY;
    return ev.end ? Math.max(0, new Date(ev.end) - new Date(ev.start)) : 0;
  }
  // When one occurrence (starting at `start`) ends: a moment, exclusive.
  const endOf = (ev, start) => new Date(start.getTime() + durationOf(ev));

  function whenText(ev, start, end) {
    const last = new Date(end.getTime() - (ev.allDay ? 1 : 0));
    const multi = startOfDay(last) > startOfDay(start);
    if (ev.allDay) return multi ? `${shortDay(start)} - ${shortDay(last)}` : 'All day';
    if (!ev.end) return timeText(start);
    return multi ? `${shortDay(start)} ${timeText(start)} - ${shortDay(end)} ${timeText(end)}` : `${timeText(start)} - ${timeText(end)}`;
  }
  const dayHeading = (d) => d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
  const REPEAT_NAMES = { day: 'daily', week: 'weekly', '2weeks': 'every 2 weeks', month: 'monthly', year: 'yearly' };

  // --- repeating events -------------------------------------------------------
  // An event may repeat: { every: 'day' | 'week' | '2weeks' | 'month' | 'year', until: 'YYYY-MM-DD' | null }.
  // The whole series is one event, so changing it changes every occurrence. A
  // repeat keeps the wall-clock time and, monthly, the day of the month (or the
  // last day of a shorter month).

  function occurrenceAt(first, every, i) {
    const y = first.getFullYear();
    const m = first.getMonth();
    const d = first.getDate();
    const h = first.getHours();
    const mi = first.getMinutes();
    if (every === 'day') return new Date(y, m, d + i, h, mi);
    if (every === 'week') return new Date(y, m, d + 7 * i, h, mi);
    if (every === '2weeks') return new Date(y, m, d + 14 * i, h, mi);
    const months = every === 'year' ? 12 * i : i;
    const last = new Date(y, m + months + 1, 0).getDate();
    return new Date(y, m + months, Math.min(d, last), h, mi);
  }

  // The start times of one event that fall in [from, to).
  function occurrences(ev, from, to) {
    const first = startOf(ev);
    if (!ev.repeat) return first >= from && first < to ? [first] : [];
    const every = ev.repeat.every;
    const until = ev.repeat.until ? endOfDay(parseYmd(ev.repeat.until)) : null;
    let i = 0;
    if (from > first) {
      // Skip ahead rather than walk every day since the first one.
      const days = (from - first) / DAY;
      const skip = every === 'day' ? days : every === 'week' ? days / 7 : every === '2weeks' ? days / 14 : every === 'month' ? days / 31 : days / 366;
      i = Math.max(0, Math.floor(skip) - 1);
    }
    const out = [];
    for (let n = 0; n < 1500; n += 1, i += 1) {
      const at = occurrenceAt(first, every, i);
      if (at >= to || (until && at > until)) break;
      if (at >= from) out.push(at);
    }
    return out;
  }

  // --- views ---------------------------------------------------------------

  // The views: Month, Week, Day and the Agenda, whose stored key stays `list` (it read "List" before). "Open on" keeps
  // what a person stored: the old "Month + list" (`both`) opens on Month, which now has that list; anything unknown
  // opens on Month too.
  const VIEW_IDS = ['month', 'week', 'day', 'list'];
  const openView = (stored) => (VIEW_IDS.includes(stored) ? stored : 'month');
  // Month and Week list the period's events under the grid; Day and the Agenda do not. Nor does a part of the Calendar
  // destination (`part`), whose Agenda beside it is that list already.
  const listUnder = (view, part) => !part && (view === 'month' || view === 'week');

  // --- an object handed in (plan-object-handoff.md, "Mapping into each module") -------------------------------------------
  // What an import, an AI's answer or a chat message hands createEvent as `object`: an `event`, or any other object (never a
  // travel kind, which reaches the calendar through the Planner) or a message's words, with a day. `util` is host.util's
  // { plain, localWhen, detailLines, time }; `day` the request's own date, used when the object has none. The answer is an
  // event as stored, { title, allDay, start, end, desc }, or null when there is no day to put it on.
  //   An event runs from `starts` to `ends`, or `starts` plus `minutes`; a day with no time, or `allDay`, is all day, its end the
  //   last day. A task is all day on its due day; anything else all day on its own date. A timed start is read in this
  //   browser's time zone (the Calendar stores an instant). The description is plain: the content, then the details the
  //   event has no field for as "Label: value", the place, the links and "External source" for an import, cut at 600.
  const OBJECT_TITLE_MAX = 120;
  const OBJECT_DESC_MAX = 600;
  const isObjectDay = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return false;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  };
  function eventFromObject(object, util, day) {
    const o = object && typeof object === 'object' ? object : {};
    const one = (v, n) => util.plain(typeof v === 'string' ? v : '', { line: true }).slice(0, n).trim();
    const details = o.details && typeof o.details === 'object' && !Array.isArray(o.details) ? o.details : {};
    const ownDay = isObjectDay(o.date) ? o.date : isObjectDay(day) ? day : null;
    const when = (name, fallback) => (typeof details[name] === 'string' ? util.localWhen(details[name], fallback) : null);
    const skip = [];
    const lines = [];
    let start = null; // { date, time }
    let endAt = null;
    if (o.kind === 'event') {
      const s = when('starts', ownDay);
      if (s && s.date) { start = s; skip.push('starts'); }
      if (details.allDay === true && start) { start = { date: start.date, time: null }; skip.push('allDay'); }
      const e = start ? when('ends', start.date) : null;
      if (e && e.date) endAt = e;
    } else if (o.kind === 'task') {
      const w = when('due', ownDay);
      if (w && w.date) {
        start = { date: w.date, time: null };
        skip.push('due');
        if (w.time) lines.push(`Due at ${typeof util.time === 'function' ? util.time(w.time) : w.time}`);
      }
    }
    if (!start && ownDay) start = { date: ownDay, time: null };
    if (!start || !isObjectDay(start.date)) return null;
    const allDay = !start.time;
    let startValue = start.date;
    let end = null;
    if (allDay) {
      if (endAt && endAt.date > start.date) { end = endAt.date; skip.push('ends'); }
    } else {
      const s = new Date(`${start.date}T${start.time}`);
      if (Number.isNaN(s.getTime())) return null;
      startValue = s.toISOString();
      let t = null;
      if (endAt && endAt.time) {
        t = new Date(`${endAt.date}T${endAt.time}`);
        // An end with no day of its own that is not after the start runs past midnight: it is the next day's (22:00 to 01:00).
        const endHasDay = /^\s*\d{4}-/.test(String(details.ends));
        if (!endHasDay && !(t > s)) t = new Date(endAt.date.slice(0, 4), +endAt.date.slice(5, 7) - 1, +endAt.date.slice(8, 10) + 1, +endAt.time.slice(0, 2), +endAt.time.slice(3, 5));
        if (!(t > s)) t = null;
        else skip.push('ends');
      }
      if (!t && Number.isInteger(details.minutes) && details.minutes > 0 && details.minutes <= 10080) {
        t = new Date(s.getTime() + details.minutes * 60 * 1000);
        skip.push('minutes');
      }
      if (t) end = t.toISOString();
    }
    lines.push(...util.detailLines(details, { kind: o.kind, skip }));
    let content = util.plain(typeof o.content === 'string' ? o.content : '');
    const title = one(o.title, OBJECT_TITLE_MAX);
    if (!o.kind && content) {
      const first = content.split('\n');
      if (one(first[0], OBJECT_TITLE_MAX) === title) content = first.slice(1).join('\n').trim();
    }
    const place = o.place && typeof o.place === 'object' ? one(o.place.name, 120) : '';
    if (place) lines.push(`Place: ${place}`);
    const extras = [];
    const links = (Array.isArray(o.links) ? o.links : []).filter((l) => l && typeof l.url === 'string' && /^https?:\/\//i.test(l.url));
    if (links.length) {
      extras.push('Links:');
      for (const l of links) extras.push(`- ${one(l.title, 100) || l.url}: ${l.url}`);
    }
    if (o.basis === 'imported') extras.push('External source');
    const suffix = extras.length ? `\n\n${extras.join('\n')}` : '';
    let desc = [content, lines.join('\n')].filter(Boolean).join('\n\n');
    if (desc.length + suffix.length > OBJECT_DESC_MAX) desc = `${desc.slice(0, Math.max(0, OBJECT_DESC_MAX - suffix.length - 1))}…`;
    return { title, allDay, start: startValue, end, desc: (desc + suffix).trim().slice(0, OBJECT_DESC_MAX) };
  }
