// To-do module. One file of code for every place it shows: the environment's own page, a
// space's canvas (docked or floating), a window of its own, and the Calendar destination's panel. Each place has its
// own list. On the environment page (and as the panel) the viewer's spaces' lists are shown too, each with its
// space's icon, and editable where the viewer may change tasks in that space (`write` from host.spaces()); a new task
// there asks where it goes, every time. The SDK (window.host) is injected by the host.
(async function () {
  'use strict';

  // This module runs in a frame (the SDK is a global) or in the page (its SDK is handed to its script);
  // either way it looks elements up in host.root, never in document, so it works in both.
  const host = (document.currentScript && document.currentScript.host) || window.host;
  const root = host.root;
  const word = host.util.word; // the environment's word for a level or role (host.locale().words)

  const $ = (id) => root.getElementById(id);
  const { esc, ymd, parseYmd, objectKey, id: newId } = host.util;

  let info;
  try {
    info = await host.ready();
  } catch (err) {
    $('msg').textContent = 'The to-do list could not start: ' + err.message;
    return;
  }
  const inSpace = info.context.scope === 'space';
  const canEdit = host.can('edit'); // in this frame's own place: the space it is in, else the environment
  // The Calendar destination's panel ('panel'), or null on every other surface. As the panel it draws no filter of
  // its own (the page's bar has it, through host.destination) and groups the tasks by when they are due.
  const part = (info.context.destination && info.context.destination.part) || null;
  const DAY = 24 * 60 * 60 * 1000;

  // Every task we know of, by key. `scope` is 'own' (this place's list) or 'spaces' (another space's, read-only).
  const tasks = new Map();
  const spaceInfo = new Map(); // space id -> { id, name, icon, svg, write }, on the environment page
  const hiddenSpaces = new Set();
  let hideOwn = false; // as the panel: the page's filter has the environment's own list off
  let show = 'open';

  // Where a task may be changed: this place's list by this module's permission here; another space's (on the
  // environment page) where host.spaces() says `write`. A space that does not say is read only.
  const spaceWritable = (spaceId) => Boolean(spaceInfo.get(spaceId) && spaceInfo.get(spaceId).write === true);
  const writable = (x) => (x.scope === 'own' ? canEdit : x.scope === 'spaces' ? spaceWritable(x.spaceId) : false);
  const writableSpaces = () => [...spaceInfo.values()].filter((r) => r.write === true);
  const canAdd = () => canEdit || (!inSpace && writableSpaces().length > 0);
  // The storage options for a task's place: another space's list is reached with { space }.
  const placeOpts = (scope, spaceId) => (scope === 'spaces' ? { space: spaceId } : {});
  // The environment's own list is named by the environment's name (info.context.environment.name), as the destination's
  // filter names it (decision 19); the environment word only where the name is not known.
  const envName = () => (info.context.environment && info.context.environment.name) || word('environment', { cap: true });
  const placeName = (scope, spaceId) => (scope === 'spaces' ? (spaceInfo.get(spaceId) ? spaceInfo.get(spaceId).name : word('space', { cap: true })) : inSpace ? word('space', { cap: true }) : envName());
  let editing = null; // { key, id, version } while the editor is open
  let editingLinks = []; // the links the open editor will save
  let editingRules = {}; // and what each does when the object reports something: { pointerKey: { eventName: outcome } }
  const MAX_LINKS = 5;
  // What this module may link to is whatever other modules share and the host says it may (module.json
  // refs.consumes is "*"), so a module written later takes part with no change here.
  let consumable = new Set(); // "module:kind"
  const kindEvents = new Map(); // "module:kind" -> what that kind of object can report: [{ name, label, data }]
  async function loadKinds() {
    try {
      const kinds = await host.objects.kinds();
      consumable = new Set(kinds.map((k) => k.module + ':' + k.kind));
      for (const k of kinds) kindEvents.set(k.module + ':' + k.kind, k.events || []);
    } catch (err) {
      consumable = new Set();
    }
  }
  // What a task can do when an object it links to reports something. Each is offered only when the event
  // carries what it needs: the summary is a line about how it turned out, the pick is an object it chose.
  const OUTCOMES = [
    { id: 'tick', label: 'Tick this', needs: [] },
    { id: 'note', label: 'Add the result to the notes', needs: ['summary'] },
    { id: 'both', label: 'Tick this and add the result', needs: ['summary'] },
    { id: 'title', label: 'Use the result as the title', needs: ['summary'] },
    { id: 'link', label: 'Link what it picked', needs: ['pick'] },
  ];
  const FINISHED = new Set(['closed', 'done', 'completed', 'finished']);
  // And what it can ask other modules to do with what an object reports: any action another module offers whose
  // required fields can be filled from the event (a date from its date, text from its summary, the object itself),
  // shown as "Module: what it does". Nothing here names those modules.
  let askable = [];
  async function loadAskable() {
    try {
      askable = (await host.actions.list()).filter((a) => a && a.input);
    } catch (err) {
      askable = [];
    }
  }
  const baseType = (t) => t.replace(/\?$/, '');
  const fillable = (a, event) => Object.entries(a.input).every(([, type]) => {
    if (type.endsWith('?')) return true;
    const base = baseType(type);
    const has = (f) => Object.keys(event.data || {}).includes(f);
    return base === 'date' ? has('date') : base === 'string' || base === 'text' ? has('summary') : base === 'ref';
  }) && Object.values(a.input).some((t) => !t.endsWith('?'));
  const outcomesFor = (event) => [
    ...OUTCOMES.filter((o) => o.needs.every((f) => Object.keys(event.data || {}).includes(f))),
    ...askable.filter((a) => fillable(a, event)).map((a) => ({ id: 'ask:' + a.action, label: a.moduleName + ': ' + a.label })),
  ];
  const askInput = (a, e) => {
    const data = e.data || {};
    const input = {};
    for (const [field, type] of Object.entries(a.input)) {
      if (type.endsWith('?')) continue;
      const base = baseType(type);
      if (base === 'date') input[field] = String(data.date || '');
      else if (base === 'string' || base === 'text') input[field] = String(data.summary || '');
      else if (base === 'ref') input[field] = e.ref;
    }
    return input;
  };
  const summaries = new Map(); // pointer key -> summary, or { error } when it is gone or not for this viewer

  // --- dates ---------------------------------------------------------------

  const pad = (n) => String(n).padStart(2, '0');
  const startOfToday = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };

  function dueText(due) {
    const days = Math.round((parseYmd(due) - startOfToday()) / DAY);
    if (days === 0) return { text: 'Today', cls: 'soon' };
    if (days === 1) return { text: 'Tomorrow', cls: 'soon' };
    if (days === -1) return { text: 'Yesterday', cls: 'late' };
    const text = parseYmd(due).toLocaleDateString([], { month: 'short', day: 'numeric' });
    return { text, cls: days < 0 ? 'late' : '' };
  }

  // --- loading and live updates --------------------------------------------

  const OLD_PLACE = { room: 'space', server: 'environment' };
  const ruleKey = (k) => { const p = String(k).split('|'); if (p.length === 5 && OLD_PLACE[p[3]]) p[3] = OLD_PLACE[p[3]]; return p.join('|'); };

  const keyOf = (scope, id, spaceId) => (scope === 'spaces' ? `spaces:${spaceId}:${id}` : `own:${id}`);
  function remember(scope, item, spaceId) {
    if (!item.key.startsWith('task:') || !item.value) return;
    const id = item.key.slice(5);
    const key = keyOf(scope, id, spaceId);
    // Stored data is whatever a writer put there: keep only well-formed links.
    const t = item.value;
    t.links = Array.isArray(t.links) ? t.links.filter((r) => r && typeof r === 'object' && typeof r.module === 'string' && typeof r.kind === 'string' && typeof r.id === 'string' && linkable(r)).slice(0, MAX_LINKS) : [];
    // A rule is kept under its link's key (host.util.objectKey), which named the place 'room' or 'server' before
    // The product's names changed: read those under the new names. Saving the task writes the new keys.
    if (t.rules && typeof t.rules === 'object') t.rules = Object.fromEntries(Object.entries(t.rules).map(([k, v]) => [ruleKey(k), v]));
    tasks.set(key, { key, scope, spaceId, id, version: item.version, t });
  }
  async function load() {
    tasks.clear();
    for (const item of await host.storage.list('task:')) remember('own', item);
    if (!inSpace && info.context.scope === 'environment') {
      try {
        for (const r of await host.spaces()) spaceInfo.set(r.id, r);
        for (const item of await host.storage.list('task:', { scope: 'spaces' })) remember('spaces', item, item.spaceId);
      } catch (err) {
        // just the environment's own list
      }
    }
  }
  host.on('change', (e) => {
    if (!e.key.startsWith('task:')) return;
    const scope = e.scope === 'spaces' ? 'spaces' : 'own';
    const id = e.key.slice(5);
    if (e.deleted) tasks.delete(keyOf(scope, id, e.spaceId));
    else remember(scope, { key: e.key, value: e.value, version: e.version }, e.spaceId);
    if (editing && editing.key === keyOf(scope, id, e.spaceId) && e.by !== info.user.key) {
      showError('This task was just changed by someone else. Close and reopen it to see the change.');
    }
    render();
  });

  // --- links to other modules' objects ----------------------------------------
  // A task stores only pointers ({ module, kind, id, scope, space }); what to show comes from
  // the host each time (host.objects.resolve), so it is always current and never more than the
  // viewer may see. The pointers are checked in the drop and search: only the kinds above.

  const linkable = (r) => consumable.has(r.module + ':' + r.kind);
  // A pointer to one of this module's tasks: in this place, or (from the environment page) in another space.
  const myRef = (id, spaceId) => host.objects.make('task', id, spaceId ? { space: spaceId } : undefined);
  const syncedLinks = new Map(); // task key -> the links last told to the host

  // Tell the host what a task points at, so the things it points at can show it. Only when it changed.
  async function syncLinks(x, links) {
    if (!host.objects || !host.objects.setLinks) return;
    const sig = JSON.stringify(links.map(objectKey));
    if (syncedLinks.get(x.key) === sig) return;
    syncedLinks.set(x.key, sig);
    try {
      await host.objects.setLinks(myRef(x.id, x.spaceId), links, placeOpts(x.scope, x.spaceId));
    } catch (err) {
      syncedLinks.delete(x.key); // try again next time
    }
  }

  async function resolveLinks() {
    if (!host.objects) return;
    const want = new Map();
    for (const x of tasks.values()) for (const r of x.t.links || []) if (!summaries.has(objectKey(r))) want.set(objectKey(r), r);
    for (const r of editingLinks) if (!summaries.has(objectKey(r))) want.set(objectKey(r), r);
    if (!want.size) return;
    const list = [...want.values()];
    try {
      const got = await host.objects.resolve(list);
      list.forEach((r, i) => summaries.set(objectKey(r), got[i] || { error: 'unavailable' }));
    } catch (err) {
      list.forEach((r) => summaries.set(objectKey(r), { error: 'unavailable' }));
    }
    if (!$('body')) return; // closed while the host answered: nothing left to draw into
    render();
    renderEditorLinks();
  }

  function dateText(when, allDay) {
    if (when === undefined || when === null || when === '') return '';
    const d = typeof when === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(when) ? parseYmd(when) : new Date(when);
    if (Number.isNaN(d.getTime())) return '';
    return allDay === false ? d.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: host.util.hour12() }) : d.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }

  function linkChip(r, removable) {
    const c = summaries.get(objectKey(r));
    const x = removable ? `<button class="x" type="button" data-unlink="${esc(objectKey(r))}" aria-label="Remove link">&times;</button>` : '';
    if (!c) return `<span class="link gone">Loading...${x}</span>`;
    if (c.error) return `<span class="link gone" title="Deleted, or not something you can see">Not available${x}</span>`;
    const when = dateText(c.when, c.allDay);
    const body = `<b>${esc(c.kindName || c.module.name)}</b> ${esc(c.title)}${when ? ' &middot; ' + esc(when) : ''}`;
    // A summary that says its module can show the object is a button that does.
    return c.open
      ? `<span class="link"><span class="open" role="button" tabindex="0" data-open-ref="${esc(objectKey(r))}" title="Open ${esc(c.title)}">${body}</span>${x}</span>`
      : `<span class="link" title="${esc(c.title)}">${body}${x}</span>`;
  }

  // Add a pointer to a task (from a drop) and save it.
  async function linkTo(key, ref) {
    const x = tasks.get(key);
    if (!x || !writable(x) || !ref || !linkable(ref)) return;
    const links = x.t.links || [];
    if (links.some((r) => objectKey(r) === objectKey(ref))) return;
    if (links.length >= MAX_LINKS) return showNote('A task can link to ' + MAX_LINKS + ' things.');
    try {
      await put(x, { ...x.t, links: [...links, ref] });
    } catch (err) {
      showNote(err.status === 409 ? 'Someone changed that task first. Try again.' : err.message);
    }
    render();
    resolveLinks();
  }

  // --- drawing -------------------------------------------------------------

  const spaceIcon = (spaceId) => {
    const r = spaceInfo.get(spaceId);
    return r && r.svg ? `<span class="ri">${r.svg}</span>` : '';
  };

  // Open tasks: soonest due first, then the ones with no date, oldest first. Done: latest first.
  function sorted(list, done) {
    return list.slice().sort((a, b) => {
      if (done) return (b.t.doneAt || 0) - (a.t.doneAt || 0);
      const da = a.t.due || '9999';
      const db = b.t.due || '9999';
      return da < db ? -1 : da > db ? 1 : (a.t.createdAt || 0) - (b.t.createdAt || 0);
    });
  }

  function taskHtml(x) {
    const t = x.t;
    const editable = writable(x);
    const due = t.due ? dueText(t.due) : null;
    const notes = t.notes ? `<small>${esc(t.notes.split('\n')[0].slice(0, 90))}</small>` : '';
    const links = (t.links || []).length ? `<span class="links">${t.links.map((r) => linkChip(r, false)).join('')}</span>` : '';
    return `<div class="task ${t.done ? 'done' : ''}" data-task="${esc(x.key)}">
      <input class="tick" type="checkbox" data-tick="${esc(x.key)}" ${t.done ? 'checked' : ''} ${editable ? '' : 'disabled'} aria-label="Done">
      <button class="text" type="button" data-open="${esc(x.key)}">${part && x.scope === 'spaces' ? spaceIcon(x.spaceId) : ''}${esc(t.title)}${notes}${links}</button>
      ${due && !t.done ? `<span class="due ${due.cls}">${esc(due.text)}</span>` : ''}
    </div>`;
  }

  function groupHtml(label, list) {
    const shown = list.filter((x) => (show === 'all' ? true : show === 'done' ? x.t.done : !x.t.done));
    if (!shown.length) return '';
    const open = sorted(shown.filter((x) => !x.t.done), false);
    const done = sorted(shown.filter((x) => x.t.done), true);
    return `<section class="group">${label ? `<h4>${label}</h4>` : ''}${[...open, ...done].map(taskHtml).join('')}</section>`;
  }

  // Open / Done / All is the toolbar's view switch.
  const FILTERS = [
    { id: 'open', label: 'Open', icon: 'circle', regular: true },
    { id: 'done', label: 'Done', icon: 'circle-check' },
    { id: 'all', label: 'All', icon: 'list-check' },
  ];
  // As the panel there is no toolbar row: the same switch is drawn in the page (`element`), at the top beside Add task.
  const filterSwitch = host.ui.viewSwitch({
    id: 'filter',
    options: FILTERS,
    value: show,
    onChange: (id) => { show = id; render(); },
    ...(part ? { element: $('show') } : {}),
  });

  // As the panel: open tasks across the places the page's filter has on, by when they are due.
  function dueGroup(t) {
    if (!t.due) return 'none';
    const today = startOfToday();
    const due = parseYmd(t.due);
    if (due < today) return 'late';
    if (due - today < DAY / 2) return 'today';
    const weekEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + (6 - today.getDay()));
    return due <= weekEnd ? 'week' : 'later';
  }
  const DUE_GROUPS = [['late', 'Overdue'], ['today', 'Today'], ['week', 'This week'], ['later', 'Later'], ['none', 'No date']];
  function renderByDue() {
    const shown = [...tasks.values()].filter((x) => (x.scope === 'own' ? !hideOwn : !hiddenSpaces.has(x.spaceId)));
    const openCount = shown.filter((x) => !x.t.done).length;
    filterSwitch.set(show, FILTERS.map((f) => (f.id === 'open' && openCount ? { ...f, label: `Open (${openCount})` } : f)));
    if (hideOwn && ![...spaceInfo.keys()].some((id) => !hiddenSpaces.has(id))) {
      $('body').innerHTML = `<p class="empty">Pick at least one in ${esc(word('space', { many: true, cap: true }))}.</p>`;
      return;
    }
    let html = '';
    if (show !== 'done') {
      const open = shown.filter((x) => !x.t.done);
      for (const [id, label] of DUE_GROUPS) {
        const list = sorted(open.filter((x) => dueGroup(x.t) === id), false);
        if (list.length) html += `<section class="group"><h4>${esc(label)}</h4>${list.map(taskHtml).join('')}</section>`;
      }
    }
    if (show !== 'open') {
      const done = sorted(shown.filter((x) => x.t.done), true);
      if (done.length) html += `<section class="group">${show === 'all' ? '<h4>Done</h4>' : ''}${done.map(taskHtml).join('')}</section>`;
    }
    $('body').innerHTML = html || `<p class="empty">${show === 'done' ? 'Nothing done yet.' : 'Nothing to do.'}${canAdd() && show !== 'done' ? ' Add a task to get started.' : ''}</p>`;
  }

  function render() {
    if (part) return renderByDue();
    const own = [...tasks.values()].filter((x) => x.scope === 'own');
    const openCount = own.filter((x) => !x.t.done).length;
    $('count').textContent = own.length ? `${openCount} open` : '';
    filterSwitch.set(show, FILTERS.map((f) => (f.id === 'open' && openCount ? { ...f, label: `Open (${openCount})` } : f)));

    $('spaces').hidden = spaceInfo.size === 0;
    if (spaceInfo.size) {
      $('spaces').innerHTML = [...spaceInfo.values()].map((r) => `<button type="button" class="filter ${hiddenSpaces.has(r.id) ? '' : 'on'}" data-space="${esc(r.id)}" title="${hiddenSpaces.has(r.id) ? 'Show' : 'Hide'} ${esc(r.name)}"><span class="ri">${r.svg || ''}</span> ${esc(r.name)}</button>`).join('');
    }

    let html = groupHtml(spaceInfo.size ? esc(envName()) : '', own);
    for (const r of spaceInfo.values()) {
      if (hiddenSpaces.has(r.id)) continue;
      html += groupHtml(`${spaceIcon(r.id)} ${esc(r.name)}`, [...tasks.values()].filter((x) => x.scope === 'spaces' && x.spaceId === r.id));
    }
    $('body').innerHTML = html || `<p class="empty">${show === 'done' ? 'Nothing done yet.' : 'Nothing to do.'}${canAdd() && show !== 'done' ? ' Add a task to get started.' : ''}</p>`;
  }

  function showNote(text) {
    $('note').textContent = text;
    $('note').hidden = !text;
    if (text) setTimeout(() => { $('note').hidden = true; }, 5000);
  }

  // --- reminders ------------------------------------------------------------
  // A reminder is a schedule the host runs for us: at 9:00 on the due date it sends a
  // notification, even with this page closed. It stops when the task is done, changed or deleted.

  // `where` is the task's place for the host ({ space } for another space's task), so the reminder is set in that
  // space and reaches its people.
  async function applyReminder(t, where) {
    const key = 'remind:' + t.id;
    try {
      if (!t.remind || !t.due || t.done) return await host.cancelSchedule(key, where);
      const at = parseYmd(t.due).getTime() + 9 * 60 * 60 * 1000;
      if (at <= Date.now()) return await host.cancelSchedule(key, where);
      await host.schedule({ key, at, payload: { id: t.id }, notify: { title: t.title, body: 'Due today' }, ...(where || {}) });
    } catch (err) {
      showNote('Saved, but the reminder could not be set: ' + err.message);
      throw err;
    }
  }

  // --- changing tasks --------------------------------------------------------

  // Save a task in its place: an existing task's own (`x`), or `target` ({ scope: 'own' } or { scope: 'spaces',
  // spaceId }) for a new one. Answers the saved record, with `where` (the storage options for its place).
  async function put(x, t, target) {
    const place = x ? { scope: x.scope, spaceId: x.spaceId } : target || { scope: 'own' };
    const where = placeOpts(place.scope, place.spaceId);
    const saved = await host.storage.set('task:' + t.id, t, { ...(x && x.version ? { version: x.version } : {}), ...where });
    remember(place.scope, { key: 'task:' + t.id, value: t, version: saved.version }, place.spaceId);
    const now = tasks.get(keyOf(place.scope, t.id, place.spaceId));
    if (now) syncLinks(now, t.links || []);
    return { ...saved, where };
  }
  const whereOf = (x) => placeOpts(x.scope, x.spaceId);


  async function tick(key, done) {
    const x = tasks.get(key);
    if (!x || !writable(x)) return;
    const t = { ...x.t, done, doneAt: done ? Date.now() : null };
    try {
      await put(x, t);
      applyReminder(t, whereOf(x)).catch(() => {});
    } catch (err) {
      showNote(err.status === 409 ? 'Someone changed that task first. It has been refreshed.' : err.message);
      try { await load(); } catch (e) { /* keep what we have */ }
    }
    render();
  }

  // --- the editor -----------------------------------------------------------

  function showError(text) {
    $('f-error').textContent = text;
    $('f-error').hidden = !text;
  }

  function syncForm() {
    $('f-remind-wrap').hidden = !$('f-due').value;
  }
  $('f-due').addEventListener('change', syncForm);
  const duePicker = host.ui.datePicker($('f-due'), { clearable: true });

  // --- where a task goes ------------------------------------------------------------
  // On the environment page (and as the panel) a new task asks where it goes, every time: the environment's own list,
  // for people who may change it, then each space where the viewer may add tasks. It starts empty whatever was picked
  // last, and Save says to pick first. A task that exists stays where it is: Where shows its place, unchangeable.
  const pickWhere = () => `Pick ${word('space', { a: true })}`;
  function fillWhere(x) {
    const select = $('f-where');
    $('f-where-wrap').hidden = inSpace;
    if (inSpace) return;
    if (x) {
      select.innerHTML = `<option value="">${esc(placeName(x.scope, x.spaceId))}</option>`;
      select.disabled = true;
      return;
    }
    const options = [`<option value="" selected disabled>${esc(pickWhere())}</option>`];
    if (canEdit) options.push(`<option value="own">${esc(placeName('own'))}</option>`);
    for (const r of writableSpaces()) options.push(`<option value="in:${esc(r.id)}">${esc(r.name)}</option>`);
    select.innerHTML = options.join('');
    select.value = '';
    select.disabled = false;
  }
  // Where the open editor's new task goes, or null while none is picked on the environment page.
  function targetOf() {
    if (inSpace) return { scope: 'own' };
    const w = $('f-where').value;
    if (w === 'own' && canEdit) return { scope: 'own' };
    if (w.startsWith('in:') && spaceWritable(w.slice(3))) return { scope: 'spaces', spaceId: w.slice(3) };
    return null;
  }
  $('f-where').addEventListener('change', () => showError(''));

  function openEditor(x, prefill) {
    if (!x && !canAdd()) return;
    const readOnly = x ? !writable(x) : false;
    const t = x ? x.t : { title: (prefill && prefill.title) || '', notes: '', due: (prefill && prefill.date) || null, remind: false, done: false };
    editing = x ? { key: x.key, id: x.id, version: x.version } : { key: null, id: null, version: null };
    fillWhere(x);
    // Read only in a place where the viewer may not change tasks: say why (on the environment page, where it can differ).
    const why = readOnly && !inSpace && x ? `Only people who can add tasks in ${placeName(x.scope, x.spaceId)} can change this.` : '';
    $('f-readonly').textContent = why;
    $('f-readonly').hidden = !why;
    editingLinks = ((x && x.t.links) || []).slice();
    editingRules = rulesFor(x && x.t);
    $('f-link-search').value = '';
    $('f-link-results').innerHTML = '';
    $('f-link-search').hidden = readOnly || !host.objects;
    $('f-links-wrap').hidden = !host.objects || (readOnly && !editingLinks.length);
    renderEditorLinks(readOnly);
    resolveLinks();
    showError('');
    const from = x && x.scope === 'spaces' && spaceInfo.get(x.spaceId) ? ` (${spaceInfo.get(x.spaceId).name})` : '';
    $('editor-title').textContent = x ? (readOnly ? t.title + from : 'Edit task') : 'New task';
    $('f-title').value = t.title;
    $('f-notes').value = t.notes || '';
    $('f-due').value = t.due || '';
    duePicker.refresh();
    $('f-remind').checked = Boolean(t.remind);
    $('f-done').checked = Boolean(t.done);
    $('f-by').textContent = x && t.by ? `Added by ${t.by}` : '';
    for (const id of ['f-title', 'f-notes', 'f-due', 'f-remind', 'f-done']) $(id).disabled = readOnly;
    $('f-save').hidden = readOnly;
    $('f-delete').hidden = readOnly || !x;
    $('f-delete').textContent = 'Delete';
    $('f-cancel').textContent = readOnly ? 'Close' : 'Cancel';
    syncForm();
    $('editor').hidden = false;
    $(readOnly ? 'f-cancel' : x || inSpace ? 'f-title' : 'f-where').focus();
  }
  function closeEditor() {
    $('editor').hidden = true;
    editing = null;
    editingLinks = [];
  }

  // The task's rules with the older per-task settings folded in: those meant "tick, and keep the result" for
  // a finished object, which is what a rule on a link now says.
  function rulesFor(t) {
    const rules = {};
    const legacy = t && t.autoDone && t.autoNote ? 'both' : t && t.autoDone ? 'tick' : t && t.autoNote ? 'note' : null;
    for (const r of (t && t.links) || []) {
      for (const ev of kindEvents.get(r.module + ':' + r.kind) || []) {
        const set = t.rules && t.rules[objectKey(r)] && t.rules[objectKey(r)][ev.name];
        const use = set || (FINISHED.has(ev.name) ? legacy : null);
        if (use && outcomesFor(ev).some((o) => o.id === use)) (rules[objectKey(r)] = rules[objectKey(r)] || {})[ev.name] = use;
      }
    }
    return rules;
  }
  function renderRules(readOnly) {
    const rows = [];
    for (const r of editingLinks) {
      const c = summaries.get(objectKey(r));
      for (const ev of kindEvents.get(r.module + ':' + r.kind) || []) {
        const chosen = (editingRules[objectKey(r)] || {})[ev.name] || '';
        rows.push(`<label class="rule"><span>${esc(c && !c.error ? c.title : `That ${word('object')}`)}: ${esc(ev.label)}</span><select data-rule="${esc(objectKey(r))}|${esc(ev.name)}" ${readOnly ? 'disabled' : ''}><option value="">Do nothing</option>${outcomesFor(ev).map((o) => `<option value="${o.id}"${o.id === chosen ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select></label>`);
      }
    }
    $('f-rules').innerHTML = rows.join('');
  }
  $('f-rules').addEventListener('change', (e) => {
    const s = e.target.closest('[data-rule]');
    if (!s) return;
    const cut = s.dataset.rule.lastIndexOf('|'); // the pointer's own key holds bars
    const key = s.dataset.rule.slice(0, cut);
    const name = s.dataset.rule.slice(cut + 1);
    const rule = editingRules[key] = editingRules[key] || {};
    if (s.value) rule[name] = s.value; else delete rule[name];
  });
  function renderEditorLinks(readOnly = $('f-link-search').hidden) {
    $('f-links').innerHTML = editingLinks.map((r) => linkChip(r, !readOnly)).join('');
    renderRules(readOnly);
  }
  $('f-links').addEventListener('click', (e) => {
    const o = e.target.closest('[data-open-ref]');
    if (o) return void openLink(o.dataset.openRef);
    const b = e.target.closest('[data-unlink]');
    if (!b) return;
    editingLinks = editingLinks.filter((r) => objectKey(r) !== b.dataset.unlink);
    renderEditorLinks();
  });

  function addEditorLink(ref) {
    if (!linkable(ref) || editingLinks.some((r) => objectKey(r) === objectKey(ref))) return;
    if (editingLinks.length >= MAX_LINKS) return showError('A task can link to ' + MAX_LINKS + ' things.');
    editingLinks.push(ref);
    renderEditorLinks();
    resolveLinks();
  }

  // Search the things this module may link to: here, and (from a space) the environment's.
  let searchTimer = 0;
  async function searchLinks() {
    const text = $('f-link-search').value.trim();
    const box = $('f-link-results');
    if (!host.objects) return;
    try {
      const found = [...await host.objects.search(text)];
      if (inSpace) found.push(...await host.objects.search(text, { scope: 'environment' }).catch(() => []));
      const fresh = found.filter((c) => !editingLinks.some((r) => objectKey(r) === objectKey(c.ref))).slice(0, 12);
      for (const c of fresh) summaries.set(objectKey(c.ref), c);
      box.innerHTML = fresh.length ? fresh.map((c) => `<button type="button" class="result" data-link="${esc(objectKey(c.ref))}"><span>${esc(c.module.name)}: ${esc(c.title)}</span><small>${esc(dateText(c.when, c.allDay))}</small></button>`).join('') : '<span class="hint">Nothing found.</span>';
      box.dataset.found = JSON.stringify(fresh.map((c) => c.ref));
    } catch (err) {
      box.innerHTML = '';
    }
  }
  $('f-link-search').addEventListener('input', () => { clearTimeout(searchTimer); searchTimer = setTimeout(searchLinks, 250); });
  $('f-link-search').addEventListener('focus', searchLinks);
  $('f-link-results').addEventListener('click', (e) => {
    const b = e.target.closest('[data-link]');
    if (!b) return;
    const ref = JSON.parse($('f-link-results').dataset.found || '[]').find((r) => objectKey(r) === b.dataset.link);
    if (ref) addEditorLink(ref);
    b.remove();
  });

  $('f-cancel').addEventListener('click', closeEditor);
  async function save() {
    if (!editing) return;
    showError('');
    const current = editing.key ? tasks.get(editing.key) : null;
    const target = current ? null : targetOf();
    if (!current && !target) return showError(`${pickWhere()} first.`);
    const title = $('f-title').value.trim();
    if (!title) return showError('A task needs a name.');
    const done = $('f-done').checked;
    const due = $('f-due').value || null;
    const t = {
      id: editing.id || newId(),
      title,
      notes: $('f-notes').value.trim(),
      due,
      remind: Boolean(due) && $('f-remind').checked,
      done,
      doneAt: done ? (current && current.t.done ? current.t.doneAt : Date.now()) : null,
      createdAt: current ? current.t.createdAt : Date.now(),
      by: current ? current.t.by : info.user.name,
      links: editingLinks.slice(0, MAX_LINKS),
      rules: Object.fromEntries(Object.entries(editingRules).filter(([k, v]) => editingLinks.some((r) => objectKey(r) === k) && Object.keys(v).length)),
    };
    $('f-save').disabled = true;
    try {
      const saved = await put(current, t, target);
      let reminderFailed = false;
      try { await applyReminder(t, saved.where); } catch (err) { reminderFailed = true; }
      render();
      if (!reminderFailed) closeEditor();
    } catch (err) {
      showError(err.status === 409 ? 'Someone changed this task since you opened it. Close it and open it again.' : err.message);
    } finally {
      $('f-save').disabled = false;
    }
  }
  $('f-save').addEventListener('click', save);
  $('form').addEventListener('submit', (e) => { e.preventDefault(); save(); });
  $('form').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
    e.preventDefault();
    save();
  });

  let deleteArmed = false;
  $('f-delete').addEventListener('click', async () => {
    if (!editing || !editing.id) return;
    if (!deleteArmed) {
      deleteArmed = true;
      $('f-delete').textContent = 'Really delete?';
      setTimeout(() => { deleteArmed = false; $('f-delete').textContent = 'Delete'; }, 4000);
      return;
    }
    deleteArmed = false;
    const x = tasks.get(editing.key);
    if (!x) return;
    try {
      await host.storage.delete('task:' + editing.id, whereOf(x));
      syncLinks(x, []);
      try { await host.cancelSchedule('remind:' + editing.id, whereOf(x)); } catch (err) { /* nothing to cancel */ }
      tasks.delete(editing.key);
      closeEditor();
      render();
    } catch (err) {
      showError(err.message);
    }
  });

  // --- wiring ---------------------------------------------------------------

  $('spaces').addEventListener('click', (e) => {
    const b = e.target.closest('[data-space]');
    if (!b) return;
    if (hiddenSpaces.has(b.dataset.space)) hiddenSpaces.delete(b.dataset.space); else hiddenSpaces.add(b.dataset.space);
    render();
  });
  // A link to another module's object opens it there; the host opens that module and hands it the pointer.
  const openLink = (key) => {
    const c = summaries.get(key);
    if (!c || c.error || !c.open || !host.objects || !host.objects.open) return;
    host.objects.open(c.ref).catch((err) => showNote(err.message));
  };
  $('body').addEventListener('click', (e) => {
    const ref = e.target.closest('[data-open-ref]');
    if (ref) return void openLink(ref.dataset.openRef);
    const open = e.target.closest('[data-open]');
    if (open) {
      const x = tasks.get(open.dataset.open);
      if (x) openEditor(x);
    }
  });
  // A task can be dragged to another module (one that links to tasks, or does something with one).
  if (host.objects && host.objects.draggable) {
    host.objects.draggable($('body'), (target) => {
      const row = target.closest('[data-task]');
      const x = row && tasks.get(row.dataset.task);
      return x && writable(x) ? { kind: 'task', id: x.id, label: x.t.title, ...whereOf(x) } : null;
    });
  }

  // Something dropped here from another module (a drag the host brokers between panes on the same page): what can be
  // done with it is the shared decision (host.objects.dropMenu). This module's own offers: link it to the task under
  // the pointer, or start a task from it (linked to it when it is an object, titled and dated from it when it is a summary
  // carried by the drag, an answer say). Dropped on the open editor's link field, it is linked there and nothing is asked.
  const clearDrop = () => {
    for (const r of root.querySelectorAll('.task.drop')) r.classList.remove('drop');
    $('editor').classList.remove('drop');
  };
  const taskAt = (pt) => {
    const el = host.objects.elementAt(pt);
    const row = el && el.closest('[data-task]');
    return row && tasks.get(row.dataset.task) && writable(tasks.get(row.dataset.task)) ? row : null;
  };
  if (host.objects && host.objects.dropTarget) {
    host.objects.dropTarget({
      over: (pt, ref, dragged) => {
        clearDrop();
        if (!(ref || dragged.summary) || !canAdd()) return;
        if (!$('editor').hidden) {
          if (ref && linkable(ref) && !$('f-link-search').hidden) $('editor').classList.add('drop');
          return;
        }
        const row = taskAt(pt);
        if (row) row.classList.add('drop');
      },
      leave: clearDrop,
      drop: async (ref, pt, dragged) => {
        clearDrop();
        if (!(ref || dragged.summary) || !canAdd()) return host.objects.trace(`drop ignored: ${canAdd() ? 'nothing valid was dropped' : 'cannot edit'}`);
        if (!$('editor').hidden) {
          if (ref && linkable(ref) && !$('f-link-search').hidden) addEditorLink(ref);
          return;
        }
        const row = taskAt(pt);
        const x = row && tasks.get(row.dataset.task);
        try {
          // On a task, the obvious thing is to link it there; on the list's empty space, to start a task from it. One
          // own offer each, so the drop just does it unless the object's own module adds something (see dropMenu).
          const own = x && ref && linkable(ref)
            ? [{ id: 'link', label: `Link it to "${x.t.title}"`, run: () => linkTo(row.dataset.task, ref) }]
            : [{ id: 'create', label: 'Start a task from it', run: (ctx) => { openEditor(null, { title: ctx.summary.title || '', date: ctx.summary.date || null }); if (ref && linkable(ref)) addEditorLink(ref); } }];
          const chosen = await host.objects.dropMenu(dragged, pt, { context: x ? { target: myRef(x.id, x.spaceId) } : {}, own, remember: x ? 'task' : 'list' });
          if (chosen && chosen.id !== 'link' && chosen.id !== 'create') showNote(`${chosen.label}: done`);
        } catch (err) {
          showNote(err.message);
        }
      },
    });
  }
  $('body').addEventListener('change', (e) => {
    const box = e.target.closest('[data-tick]');
    if (box) tick(box.dataset.tick, box.checked);
  });
  function startNew() {
    if (!canAdd()) return;
    openEditor(null);
  }
  $('add').addEventListener('click', startNew);
  $('new-todo').addEventListener('click', startNew);
  // Typed text goes through Chat `/t` (addTask): parseWhen, then this same editor, nothing saved until Save.
  // The host draws New todo in the module's action bar when docked; the in-page button stays for a host without one,
  // and as the panel, whose page has no action bar (Add task at its top). Who may add is known once the spaces are in.
  let barHosted = false;
  function showAdd() {
    $('add').hidden = !canAdd();
    $('new-form').hidden = Boolean(part) || !canAdd();
    if (barHosted) host.bar.set(canAdd() ? [{ id: 'add', label: 'New todo', icon: 'square-plus', primary: true }] : []).catch(() => {});
  }
  if (host.bar && !part) {
    barHosted = true;
    $('add').classList.add('hosted');
    $('new-form').classList.add('hosted');
    host.bar.set(canEdit ? [{ id: 'add', label: 'New todo', icon: 'square-plus', primary: true }] : []).catch(() => {
      barHosted = false;
      $('add').classList.remove('hosted');
      $('new-form').classList.remove('hosted');
    });
    host.on('bar', (e) => {
      if (e.id !== 'add' || !canAdd()) return;
      startNew();
    });
  }
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('editor').hidden) closeEditor(); });

  // As the panel: the page's filter says whose tasks show (host.destination.onState); the panel sets nothing.
  let pickedSpaces = null;
  let loaded = false;
  function takeState(st) {
    if (!st || typeof st !== 'object') return;
    if (Array.isArray(st.spaces)) {
      pickedSpaces = new Set(st.spaces.map(String));
      hiddenSpaces.clear();
      for (const id of spaceInfo.keys()) if (!pickedSpaces.has(id)) hiddenSpaces.add(id);
    }
    hideOwn = st.environment === false;
    if (loaded) render();
  }
  if (part && host.destination) host.destination.onState(takeState);
  if (part) {
    $('count').hidden = true;
    $('show').hidden = false;
    $('spaces').hidden = true;
    $('app').classList.add('part');
  }

  $('add').hidden = true;
  $('new-form').hidden = true;
  try {
    await loadKinds();
    await loadAskable();
    await load();
  } catch (err) {
    $('msg').textContent = 'The to-do list could not load: ' + err.message;
    return;
  }
  if (pickedSpaces) for (const id of spaceInfo.keys()) if (!pickedSpaces.has(id)) hiddenSpaces.add(id);
  showAdd();
  loaded = true;
  $('msg').hidden = true;
  $('app').hidden = false;
  render();
  // Other modules say what happens to their objects (a poll closing, say); the host delivers what this module
  // was approved to hear. Each link on a task can carry a rule for an event it may report: tick the task, keep
  // the result in its notes, use it as the title, or link what the object picked. A task from before rules that
  // asked to follow a finished object keeps doing that (the conventional names closed, done, completed and
  // finished). Doing a rule twice is harmless.
  if (host.events && host.events.subscribe) {
    host.events.subscribe(async (e) => {
      if (!e.ref) return;
      const k = objectKey(e.ref);
      const summary = e.data && typeof e.data.summary === 'string' ? e.data.summary.slice(0, 200) : '';
      const pick = e.data && e.data.pick && typeof e.data.pick === 'object' && linkable(e.data.pick) ? e.data.pick : null;
      for (const x of [...tasks.values()]) {
        if (x.scope !== 'own' || !(x.t.links || []).some((r) => objectKey(r) === k)) continue;
        const rule = rulesFor(x.t)[k] && rulesFor(x.t)[k][e.name];
        if (!rule) continue;
        let t = { ...x.t };
        let ask = null;
        if (rule.startsWith('ask:')) {
          // Ask another module to do something; the first page to record it does the asking, the others fail to save.
          const a = askable.find((o) => 'ask:' + o.action === rule);
          const marker = k + '|' + e.name;
          if (!a || (e.id && t.fired && t.fired[marker] === e.id) || (e.data && e.data.date && !/^\d{4}-\d{2}-\d{2}$/.test(String(e.data.date)))) continue;
          t = { ...t, fired: { ...(t.fired || {}), [marker]: e.id || Date.now() } };
          ask = { a, input: askInput(a, e) };
        }
        if ((rule === 'tick' || rule === 'both') && !t.done) t = { ...t, done: true, doneAt: Date.now() };
        if ((rule === 'note' || rule === 'both') && summary && !(t.notes || '').includes('Result: ' + summary)) t.notes = ((t.notes ? t.notes + '\n' : '') + 'Result: ' + summary).slice(0, 1000);
        if (rule === 'title' && summary && t.title !== summary) t.title = summary.slice(0, 200);
        if (rule === 'link' && pick && !(t.links || []).some((r) => objectKey(r) === objectKey(pick)) && (t.links || []).length < MAX_LINKS) t.links = [...(t.links || []), pick];
        if (JSON.stringify(t) === JSON.stringify(x.t)) continue;
        try {
          await put(x, t);
          applyReminder(t).catch(() => {});
          if (ask) {
            try {
              await host.actions.request(ask.a.action, ask.input);
              showNote(ask.a.moduleName + ': ' + ask.a.label + ' (from "' + t.title + '")');
            } catch (err) {
              showNote(err.message);
            }
          }
        } catch (err) {
          // changed or ticked by someone else meanwhile
        }
      }
      render();
    });
  }

  // What other modules may ask of this one about a task it names: link it to something, or set its due date. On the
  // environment page that may be one of a space's tasks, where the viewer may change it.
  const taskFor = (ref) => {
    if (!ref || ref.kind !== 'task') return null;
    if (ref.scope === 'space' && !inSpace) return tasks.get(keyOf('spaces', ref.id, ref.space)) || null;
    return tasks.get('own:' + ref.id) || null;
  };
  const ownTask = (ref) => {
    const x = taskFor(ref);
    if (!x || !writable(x)) throw new Error('that task is not here');
    return x;
  };
  // What other modules may ask of this one. A task made this way links to the object it came from.
  if (host.actions && host.actions.provide) {
    host.actions.provide({
      createTask: async (input, meta) => {
        const t = {
          id: newId(), title: input.title, notes: input.notes || '', due: null, remind: false, done: false, doneAt: null,
          createdAt: Date.now(), by: (meta && meta.by) || 'someone', links: input.ref && linkable(input.ref) ? [input.ref] : [], autoDone: false,
        };
        await put(null, t);
        render();
        resolveLinks();
        return { ref: myRef(t.id) };
      },
      linkTask: async (input) => {
        const x = ownTask(input.task);
        if (!linkable(input.target)) throw new Error('this list may not link to that');
        await linkTo(x.key, input.target);
        return { ref: myRef(x.id, x.spaceId) };
      },
      setTaskDue: async (input) => {
        const x = ownTask(input.task);
        const t = { ...x.t, due: input.date, remind: x.t.remind };
        await put(x, t);
        applyReminder(t, whereOf(x)).catch(() => {});
        render();
        return { ref: myRef(x.id, x.spaceId) };
      },
      addTask: async (input) => {
        if (!canAdd()) throw new Error('this person cannot add tasks here');
        const parsed = input.text && host.util.parseWhen ? host.util.parseWhen(input.text) : { title: input.text || '' };
        openEditor(null, parsed);
        return {};
      },
    });
  }

  // Another module asking to show one of this module's tasks (from a link to it): open it.
  if (host.objects && host.objects.onOpen) {
    host.objects.onOpen((ref) => {
      const x = taskFor(ref);
      if (x) openEditor(x);
    });
  }
  resolveLinks();
  // Tell the host about links made before it was told (and only those that changed).
  for (const x of [...tasks.values()].filter((t) => t.scope === 'own' && (t.t.links || []).length).slice(0, 100)) syncLinks(x, x.t.links);
  // The objects linked to can change or go; look again now and then.
  const relook = setInterval(() => { if (!$('body')) return void clearInterval(relook); summaries.clear(); resolveLinks(); }, 60000);
})();
