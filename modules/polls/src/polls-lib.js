  // Polls' model of an object handed in (plan-object-handoff.md, "Mapping into each module"): what Chat's Send to... hands
  // draftPoll as `object`, a `poll` or a message's words. No page in it, so tools/check-object-handoff.mjs runs it on its own;
  // it is given host.util ({ plain, localWhen }), so a check can hand it the SDK's very same helpers.

  const DRAFT_QUESTION_MAX = 200;
  const DRAFT_OPTION_MAX = 100;
  const DRAFT_OPTIONS_MAX = 10;
  const isDraftDay = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return false;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  };

  // What the poll form starts with: { title (the question), options: [text], closes: 'YYYY-MM-DDTHH:MM' or '', multi }.
  // The question is the title, plain. The options are details.options; with none, the content's own short lines (a message
  // "Where to eat?" then "- Pizza" and "- Sushi" on lines of their own), when there are at least two. It closes at
  // details.closes (a time alone on the object's own day), else on the object's own day at 12:00, as /v reads a typed day;
  // a closing day with no time is 12:00 too. More than one answer when details.multiple is true. Nothing is saved: the
  // person sees the form and saves it, or not.
  function pollFromObject(object, util) {
    const o = object && typeof object === 'object' ? object : {};
    const one = (v, n) => util.plain(typeof v === 'string' ? v : '', { line: true }).slice(0, n).trim();
    const title = one(o.title, DRAFT_QUESTION_MAX);
    const details = o.details && typeof o.details === 'object' && !Array.isArray(o.details) ? o.details : {};
    const options = [];
    const add = (text) => {
      const t = one(text, DRAFT_OPTION_MAX);
      if (t && t.toLowerCase() !== title.toLowerCase() && !options.some((x) => x.toLowerCase() === t.toLowerCase()) && options.length < DRAFT_OPTIONS_MAX) options.push(t);
    };
    if (Array.isArray(details.options)) for (const x of details.options) if (typeof x === 'string') add(x);
    if (options.length < 2) {
      options.length = 0;
      const lines = util.plain(typeof o.content === 'string' ? o.content : '').split('\n').map((l) => l.replace(/^\s*(?:[-*+•]|\d{1,2}[.)])\s+/, '').trim()).filter(Boolean);
      // Short lines only: a paragraph is not an option.
      if (lines.length >= 2 && lines.every((l) => l.length <= DRAFT_OPTION_MAX)) for (const l of lines) add(l);
      if (options.length < 2) options.length = 0;
    }
    const ownDay = isDraftDay(o.date) ? o.date : null;
    const w = typeof details.closes === 'string' ? util.localWhen(details.closes, ownDay) : null;
    const day = (w && w.date) || (!w ? ownDay : null);
    const closes = day && isDraftDay(day) ? `${day}T${(w && w.time) || '12:00'}` : '';
    return { title, options, closes, multi: details.multiple === true };
  }

  // Whether a finished poll can fill another module's action (the buttons under a closed poll): it gives a title (the question
  // and its winner), notes (the question), a date (the winning option's day, when it has one; `hasDate`) and a pointer to the
  // poll, in fields of those names. An action is offered only when it takes a title and every input it requires is one of
  // those, of a type that holds it; one that needs a date (`needs`) only with a date. "Save this link" (a required `url`) is not.
  function pollFills(action, hasDate) {
    const input = action && action.input && typeof action.input === 'object' ? action.input : null;
    if (!input || !input.title) return false;
    if (Array.isArray(action.needs) && action.needs.includes('date') && !hasDate) return false;
    const fits = {
      title: (t) => t === 'string' || t === 'text',
      notes: (t) => t === 'string' || t === 'text',
      date: (t) => t === 'date' && hasDate,
      ref: (t) => t === 'ref' || t === 'ref:polls:poll',
    };
    return Object.entries(input).every(([field, type]) => {
      const t = String(type);
      if (t.endsWith('?')) return true;
      return Object.prototype.hasOwnProperty.call(fits, field) && fits[field](t);
    });
  }
