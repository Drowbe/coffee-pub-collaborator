  // An object from elsewhere, in the objects format (plan-object-handoff.md, "Mapping into each module"), as the plan's own
  // fields: what an import, an AI's answer or a chat message hands acceptSuggestion as its `object` input. No page in it, so
  // tools/check-travel.mjs runs it on its own. It expects travel-lib.js in scope, and is given host.util's `plain` and
  // `localWhen` (the SDK's), so a check can hand it the very same ones.

  // A details field in words, for the notes line of a field the plan has no place for ("Cabin: 4B"). A car's ends are its
  // pick-up and drop-off.
  const DETAIL_WORDS = {
    airline: 'Airline', operator: 'Operator', company: 'Company', number: 'Number', from: 'From', to: 'To', departs: 'Departs',
    arrives: 'Arrives', minutes: 'Length', terminal: 'Terminal', gate: 'Gate', seat: 'Seat', class: 'Class', reference: 'Reference',
    platform: 'Platform', carriage: 'Coach', cabin: 'Cabin', address: 'Address', checkIn: 'Check in', checkOut: 'Check out',
    roomType: 'Room', guests: 'People', starts: 'Starts', ends: 'Ends', partySize: 'Party size', name: 'Booking name',
    tickets: 'Tickets', allDay: 'All day', due: 'Due', options: 'Options', closes: 'Closes', multiple: 'More than one answer',
  };
  const CAR_WORDS = { from: 'Pick up', to: 'Drop off', departs: 'Pick up', arrives: 'Drop off' };
  const OBJECT_JOURNEYS = ['flight', 'train', 'bus', 'ferry'];
  const OBJECT_MEALS = ['restaurant', 'cafe', 'bar'];
  const OBJECT_VISITS = ['sight', 'museum', 'tour', 'show'];
  const MAX_NOTES = 8000;

  // Whole minutes from one local day and time to another, read as wall-clock times in one place (no zone): a car's pick-up to
  // its drop-off, a dinner's start to its end. Null unless both have a day and a time.
  function minutesBetween(a, b) {
    if (!a || !b || !a.date || !a.time || !b.date || !b.time) return null;
    const at = (w) => Date.UTC(+w.date.slice(0, 4), +w.date.slice(5, 7) - 1, +w.date.slice(8, 10), +w.time.slice(0, 2), +w.time.slice(3, 5));
    return Math.round((at(b) - at(a)) / 60000);
  }

  // The plan's fields for an object { title, kind?, content?, details?, date?, place?, links?, basis? }. `util` is
  // { plain, localWhen }; `place` ({ date } or { after }) puts it there whatever the object's own day (the Planner's own drop).
  // The title and every details field become plain text; the content stays as written, since the plan draws Notes as
  // Markdown. A details field the plan has no field for goes into the notes as a "Label: value" line after the content, so
  // nothing is lost; then the links, and "External source" for an import, as Chat's Keep wrote them before.
  function objectFields(object, util, place) {
    const o = object && typeof object === 'object' ? object : {};
    const line = (v, n) => clip(util.plain(typeof v === 'number' ? String(v) : typeof v === 'string' ? v : '', { line: true }), n);
    const title = line(o.title, 120);
    if (!title) throw new Error('that needs a title');
    const kind = typeof o.kind === 'string' ? o.kind : '';
    const details = o.details && typeof o.details === 'object' && !Array.isArray(o.details) ? o.details : {};
    const has = (name) => Object.prototype.hasOwnProperty.call(details, name) && details[name] !== null && details[name] !== undefined && details[name] !== '';
    const used = new Set();
    const take = (name) => { used.add(name); return details[name]; };
    const text = (name, n) => (has(name) ? line(take(name), n) : '');
    const whole = (name, max) => (has(name) && Number.isFinite(details[name]) ? count(take(name), max) : null);
    const day = isYmd(o.date) ? o.date : null;
    // A `when` as { date, time }: its own day, else the object's for a time alone. Null when it is not given; one that cannot
    // be read is left for the notes.
    const when = (name, fallback = day) => {
      if (!has(name)) return null;
      const w = util.localWhen(String(take(name)), fallback);
      if (!w) used.delete(name);
      return w;
    };
    // A `point` ({ code, name } or a string) as its code and its name.
    const point = (name) => {
      if (!has(name)) return { code: '', name: '' };
      const v = take(name);
      if (typeof v === 'string') return /^[A-Z]{3}$/.test(v.trim()) ? { code: v.trim(), name: '' } : { code: '', name: line(v, 120) };
      return { code: code(v && v.code, 5), name: line(v && v.name, 120) };
    };
    const pointText = (p) => (p.name && p.code ? `${p.name} (${p.code})` : p.name || p.code);

    const fields = { title, place: line(o.place && o.place.name, 120) };
    let start = null;
    if (OBJECT_JOURNEYS.includes(kind)) {
      Object.assign(fields, { kind: 'journey', mode: kind, category: 'travel' });
      fields.operator = text(kind === 'flight' ? 'airline' : 'operator', 60);
      fields.number = text('number', 20);
      const from = point('from');
      const to = point('to');
      // A flight shows its airports' codes beside their names; any other journey has one place for each end.
      if (kind === 'flight') Object.assign(fields, { fromCode: from.code, from: from.name, toCode: to.code, to: to.name });
      else Object.assign(fields, { from: clip(pointText(from), 80), to: clip(pointText(to), 80) });
      start = when('departs');
      // As on the ticket (decision 11): a time alone is on the day it leaves.
      const arrives = when('arrives', (start && start.date) || day);
      if (arrives && arrives.time) fields.arrives = arrives.date ? `${arrives.date}T${arrives.time}` : arrives.time;
      // A day with no time, or one more than 7 days after it leaves or more than a day before: a notes line.
      if (fields.arrives && !arrivalFits((start && start.date) || day, start && start.time, fields.arrives)) delete fields.arrives;
      if (!fields.arrives) used.delete('arrives');
      fields.minutes = whole('minutes', MAX_MINUTES);
      if (kind === 'flight') { fields.terminal = text('terminal', 30); fields.gate = text('gate', 30); }
      if (kind === 'train') { fields.platform = text('platform', 30); fields.carriage = text('carriage', 30); }
      fields.seat = text('seat', 30);
      if (kind === 'flight' || kind === 'train') fields.travelClass = text('class', 30);
      fields.confirm = text('reference', 60);
    } else if (kind === 'car') {
      Object.assign(fields, { kind: 'journey', mode: 'car', category: 'travel' });
      fields.operator = text('company', 60);
      fields.pickup = pointText(point('from'));
      fields.dropoff = pointText(point('to'));
      start = when('departs');
      // The drop-off is the car's length when both ends have a day and a time and it is at most 7 days; else a notes line.
      const back = when('arrives', (start && start.date) || day);
      const length = minutesBetween(start, back);
      if (length && length > 0 && length <= MAX_MINUTES) fields.minutes = length;
      else used.delete('arrives');
      fields.confirm = text('reference', 60);
    } else if (kind === 'hotel') {
      Object.assign(fields, { kind: 'stay', type: 'hotel', category: 'stay' });
      start = when('checkIn');
      const out = when('checkOut', null);
      const inDay = (start && start.date) || day;
      if (out && out.date && inDay && out.date > inDay) {
        fields.checkOut = out.date;
        fields.checkOutTime = out.time || null;
      } else if (out && !out.date && out.time) {
        fields.checkOutTime = out.time;
      } else used.delete('checkOut');
      fields.roomType = text('roomType', 60);
      fields.guests = whole('guests', 99);
      fields.address = text('address', 200);
      fields.confirm = text('reference', 60);
    } else if (OBJECT_MEALS.includes(kind) || OBJECT_VISITS.includes(kind) || kind === 'event') {
      Object.assign(fields, { kind: 'stop', type: kind === 'event' ? 'other' : kind, category: OBJECT_MEALS.includes(kind) ? 'eat' : 'do' });
      start = when('starts');
      // An event that is all day has no time of its own.
      if (kind === 'event' && has('allDay') && take('allDay') === true && start) start = { date: start.date, time: null };
      fields.minutes = whole('minutes', MAX_MINUTES);
      // Its length, when only the end is given; an end that gives none (another day past 7, before the start) is a notes line.
      if (has('ends') && fields.minutes === null) {
        const length = minutesBetween(start, when('ends', (start && start.date) || day));
        if (length > 0 && length <= MAX_MINUTES) fields.minutes = length;
        else used.delete('ends');
      } else if (has('ends')) take('ends'); // the length says it already
      fields.address = text('address', 200);
      if (OBJECT_MEALS.includes(kind)) { fields.partySize = whole('partySize', 99); fields.reservationName = text('name', 60); }
      if (OBJECT_VISITS.includes(kind)) fields.admissionCount = whole('tickets', 999);
      if (kind !== 'event') fields.confirm = text('reference', 60);
    } else if (kind === 'note') {
      Object.assign(fields, { kind: 'note', category: 'other' });
    } else {
      fields.kind = 'stop';
    }
    // Its day and time: from the details, which win over the object's own date; the drop's place wins over both.
    fields.date = (start && start.date) || day;
    fields.time = (start && start.time) || null;
    fields.after = null;
    if (place && (place.date !== undefined || place.after !== undefined)) {
      const was = fields.date;
      Object.assign(fields, placeFields(place));
      // Put on another day, a dated arrival moves with it; put on the line, it is kept relative to the day it leaves.
      if (was && fields.date && fields.date !== was) fields.arrives = shiftArrives(fields.arrives, Math.round((parseYmd(fields.date) - parseYmd(was)) / DAY_MS));
      else if (was && !fields.date) fields.arrives = relativeArrives(was, fields.arrives);
    }

    // The notes: the content, then what had no field, then the links and where it came from.
    const shown = (name, v) => {
      if (typeof v === 'boolean') return v ? 'yes' : 'no';
      if (name === 'minutes' && Number.isFinite(v)) return gapText(v);
      if (typeof v === 'number') return String(v);
      if (typeof v === 'string') return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(v) ? v.slice(0, 16).replace('T', ' ') : v;
      if (Array.isArray(v)) return v.filter((x) => typeof x === 'string').join(', ');
      if (v && typeof v === 'object') return pointText({ code: typeof v.code === 'string' ? v.code : '', name: typeof v.name === 'string' ? v.name : '' });
      return '';
    };
    const rest = [];
    for (const [name, v] of Object.entries(details)) {
      if (used.has(name) || name === 'upload') continue;
      const value = line(shown(name, v), 300);
      if (value) rest.push(`${(kind === 'car' && CAR_WORDS[name]) || DETAIL_WORDS[name] || name}: ${value}`);
    }
    const extras = [];
    const links = Array.isArray(o.links) ? o.links.filter((l) => l && typeof l.url === 'string') : [];
    if (links.length) {
      extras.push('Links:');
      for (const l of links) extras.push(`- ${line(l.title, 100) || l.url}: ${l.url}`);
    }
    if (o.basis === 'imported') extras.push('External source');
    const suffix = extras.length ? `\n\n${extras.join('\n')}` : '';
    let notes = [String(typeof o.content === 'string' ? o.content : '').trim(), rest.join('\n')].filter(Boolean).join('\n\n');
    if (notes.length + suffix.length > MAX_NOTES) notes = `${notes.slice(0, Math.max(0, MAX_NOTES - suffix.length - 1))}…`;
    fields.notes = (notes + suffix).trim();
    return fields;
  }

  // --- the flight lookup (plan-flight-lookup.md) ------------------------------------------------------------------------

  // A flight number as the server cleans it ("wn2483" is "WN 2483"): an airline code (two letters or digits with a letter, or
  // three letters) and 1 to 4 digits with an optional letter, spaces ignored. Null for anything else, so the form can say so
  // before asking.
  function flightNumberOf(raw) {
    if (typeof raw !== 'string' || raw.length > 40) return null;
    const m = /^(?:([A-Z0-9]{2})|([A-Z]{3}))(\d{1,4}[A-Z]?)$/.exec(raw.replace(/\s+/g, '').toUpperCase());
    if (!m) return null;
    const airline = m[1] || m[2];
    return /[A-Z]/.test(airline) ? `${airline} ${m[3]}` : null;
  }

  // The flight number a flight is saved with: the cleaned form ("wn2483" is "WN 2483", decision 5), or the number as typed when
  // it does not clean ("Southwest 2483"). Any other way of travelling keeps its number as typed.
  const numberToSave = (mode, raw) => (mode === 'flight' && typeof raw === 'string' && flightNumberOf(raw)) || raw;

  // A saved flight's schedule part in the objects format, for host.lookup.remember: only what the server's schedule keeps (the
  // airline as typed, the number, both airport codes, the departure, the arrival on the ticket, the flight time and the
  // terminal), with a fixed title the server needs and does not keep. Not the airport names (the server takes them from its
  // airport list), the seat, class, reference, cost, who paid, the people, the notes, the gate or the plan's own title. Null
  // for anything that is not a flight with a number.
  function flightObject(item) {
    if (!item || item.kind !== 'journey' || item.mode !== 'flight' || !flightNumberOf(item.number || '')) return null;
    const number = flightNumberOf(item.number);
    const details = { number };
    if (item.operator) details.airline = item.operator;
    const point = (code) => ({ code: String(code).trim().toUpperCase() });
    if (item.fromCode) details.from = point(item.fromCode);
    if (item.toCode) details.to = point(item.toCode);
    if (item.date && item.time) details.departs = `${item.date}T${item.time}`;
    if (typeof item.arrives === 'string' && item.arrives.length === 16) details.arrives = item.arrives;
    if (Number.isInteger(item.minutes) && item.minutes > 0) details.minutes = item.minutes;
    if (item.terminal) details.terminal = item.terminal;
    return { kind: 'flight', title: `Flight ${number}`, ...(item.date ? { date: item.date } : {}), details };
  }

  // What a found flight fills in the flight form (decision 4), from objectFields' answer for its object: the departure day and
  // time, the flight time, the arrival on the ticket, the airline, the number, both airports and the terminal. A value the
  // schedule does not know is left out, so the form keeps its own. The title is the caller's (only when the form has none);
  // the seat, class, reference, cost, people, notes and the gate are never in it.
  const LOOKUP_FILLS = ['date', 'time', 'minutes', 'arrives', 'operator', 'number', 'fromCode', 'from', 'toCode', 'to', 'terminal'];
  function lookupFill(fields) {
    const out = {};
    for (const k of LOOKUP_FILLS) {
      const v = fields && fields[k];
      if (v !== null && v !== undefined && v !== '') out[k] = v;
    }
    return out;
  }

  // What a second lookup does to the form (and the first, with `before` empty). `got` is lookupFill's answer, plus the title when
  // the leg has one to offer; `before` is what the last lookup put in the form, by field; `now` is what the form holds. Each
  // value the answer has is put in (decision 4), the title only when the form's is empty or still the earlier lookup's. A field
  // an earlier lookup filled that this answer lacks (a terminal) is emptied, but only while it still holds what the lookup put
  // there: a value the person typed or changed is never touched. Answers { set, filled }: the values to put in ('' empties
  // one), and what the lookup has now filled, for the next time.
  function lookupApply(got, before, now) {
    const was = before || {};
    const form = now || {};
    const same = (k) => k in was && String(form[k] ?? '') === String(was[k]);
    const set = {};
    for (const k of new Set([...Object.keys(got || {}), ...Object.keys(was)])) {
      const v = got && got[k];
      const has = v !== null && v !== undefined && v !== '';
      if (k === 'title') {
        if (has && (!String(form.title ?? '').trim() || same(k))) set.title = v;
        else if (!has && same(k)) set.title = '';
      } else if (has) set[k] = v;
      else if (same(k)) set[k] = '';
    }
    const filled = {};
    for (const [k, v] of Object.entries(set)) if (v !== '') filled[k] = v;
    return { set, filled };
  }
