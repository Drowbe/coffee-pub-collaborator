  // To-do's model of an object handed in (plan-object-handoff.md, "Mapping into each module"): what an import, an AI's answer
  // or a chat message hands createTask as `object`. No page in it, so tools/check-object-handoff.mjs runs it on its own; it is
  // given host.util ({ plain, localWhen, detailLines, time }), so a check can hand it the SDK's very same helpers.

  const TASK_TITLE_MAX = 200;
  const TASK_NOTES_MAX = 1000;
  const isTaskDay = (s) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(s || ''));
    if (!m) return false;
    const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
    return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
  };

  // A task's fields from an object { title, kind?, content?, details?, date?, place?, links?, basis? }: { title, notes, due }.
  // The title and the notes are plain text (To-do shows them as typed). A `task` is due on its details' `due` day, else on its
  // own date; a time on `due` is a notes line, since a task keeps a day only. Any other kind is a task named after it, with no
  // due date. The notes: the content (a message's words lose their first line, which is the title), every details field To-do
  // has no place for as "Label: value", the place, the links, and "External source" for an import, cut at 1000 with the tail kept.
  function taskFromObject(object, util) {
    const o = object && typeof object === 'object' ? object : {};
    const one = (v, n) => util.plain(typeof v === 'string' ? v : '', { line: true }).slice(0, n).trim();
    const title = one(o.title, TASK_TITLE_MAX);
    const details = o.details && typeof o.details === 'object' && !Array.isArray(o.details) ? o.details : {};
    const ownDay = isTaskDay(o.date) ? o.date : null;
    let content = util.plain(typeof o.content === 'string' ? o.content : '');
    if (!o.kind && content) {
      const lines = content.split('\n');
      if (one(lines[0], TASK_TITLE_MAX) === title) content = lines.slice(1).join('\n').trim();
    }
    let due = null;
    const skip = [];
    const lines = [];
    if (o.kind === 'task') {
      const w = typeof details.due === 'string' ? util.localWhen(details.due, ownDay) : null;
      if (w && w.date && isTaskDay(w.date)) {
        due = w.date;
        skip.push('due');
        if (w.time) lines.push(`Due at ${typeof util.time === 'function' ? util.time(w.time) : w.time}`);
      } else if (!w) {
        due = ownDay;
      }
    }
    lines.push(...util.detailLines(details, { kind: o.kind, skip }));
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
    let notes = [content, lines.join('\n')].filter(Boolean).join('\n\n');
    if (notes.length + suffix.length > TASK_NOTES_MAX) notes = `${notes.slice(0, Math.max(0, TASK_NOTES_MAX - suffix.length - 1))}…`;
    return { title, notes: (notes + suffix).trim().slice(0, TASK_NOTES_MAX), due };
  }
