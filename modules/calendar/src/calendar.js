// Calendar module. One file of code for every place it shows: the environment's own
// page, a space's canvas (docked or floating), a window of its own, and the two parts of the Calendar destination
// (the calendar itself, `main`, and the Agenda beside it, `panel`). On the environment page (and as a part) it holds
// the environment's events and shows the events of every space the viewer belongs to, each marked with its space's
// icon, editable where the viewer may add events in that space (`write` from host.spaces()); a new event there asks
// where it goes, every time. In a space it holds that space's events and shows the environment's beside them. The
// SDK (window.host) is injected by the host.
(async function () {
  'use strict';

  // This module runs in a frame (the SDK is a global) or in the page (its SDK is handed to its script);
  // either way it looks elements up in host.root, never in document, so it works in both.
  const host = (document.currentScript && document.currentScript.host) || window.host;
  const root = host.root;
  const word = host.util.word; // the environment's word for a level or role (host.locale().words)

  const $ = (id) => root.getElementById(id);
  const { esc, ymd, parseYmd } = host.util;

  let info;
  try {
    info = await host.ready();
  } catch (err) {
    $('msg').textContent = 'The calendar could not start: ' + err.message;
    return;
  }
  const inSpace = info.context.scope === 'space';
  // A part of the Calendar destination: 'main' (the calendar) or 'panel' (the Agenda); null on every other surface.
  // As a part it draws no view switch or filter of its own: the page's bar does those (host.destination).
  const part = (info.context.destination && info.context.destination.part) || null;
  // The person's own choice of the view to open on (Settings > Module settings).
  let prefs = {};
  try { prefs = await host.settings.get(); } catch (err) { prefs = {}; }
  const canEdit = host.can('edit'); // in this frame's own place: the space it is in, else the environment
  const TZ = (() => { try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch (err) { return undefined; } })();

  // Every event we know of, by "<scope>:<id>". `scope` is where it is stored: 'here'
  // (this space, or the environment on its page -- the frame's own context),
  // 'environment' (shown read-only in a space) or 'spaces' (another space's, on the environment page).
  const events = new Map();
  const spaceInfo = new Map(); // space id -> { id, name, icon, svg, write }, on the environment page
  const hiddenSpaces = new Set(); // spaces filtered out on the environment page
  let hideOwn = false; // as a part: the page's filter has the environment's own events off
  let cursor = new Date();
  cursor = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
  let view = 'month'; // set from "Open on" once the library is in (openView, below)
  let anchor = new Date(); // the day the week and day views are built around; as a part, the selected day
  let editing = null; // { scope, id, version, spaceId } while the editor is open

  // Where an event may be changed. Another space's (on the environment page) where the viewer may add events there:
  // host.spaces() says so with `write`, and a space that does not say is read only. The environment's events, seen
  // from a space, are read only there as before.
  const spaceWritable = (spaceId) => Boolean(spaceInfo.get(spaceId) && spaceInfo.get(spaceId).write === true);
  const writable = (x) => (x.scope === 'here' ? canEdit : x.scope === 'spaces' ? spaceWritable(x.spaceId) : false);
  const writableSpaces = () => [...spaceInfo.values()].filter((r) => r.write === true);
  // Anyone who may add an event somewhere here: in this place, or (on the environment page) in one of their spaces.
  const canAdd = () => canEdit || (!inSpace && writableSpaces().length > 0);
  // The storage options for a place: another space's events are reached with { space }.
  const placeOpts = (scope, spaceId) => (scope === 'spaces' ? { space: spaceId } : {});
  // The environment's own calendar is named by the environment's name (info.context.environment.name), as the
  // destination's filter names it (decision 19); the environment word only where the name is not known.
  const envName = () => (info.context.environment && info.context.environment.name) || word('environment', { cap: true });
  const placeName = (scope, spaceId) => (scope === 'spaces' ? (spaceInfo.get(spaceId) ? spaceInfo.get(spaceId).name : word('space', { cap: true })) : inSpace && scope === 'here' ? word('space', { cap: true }) : envName());

  /*__LIB__*/

  view = openView(prefs.defaultView);

  // Every occurrence of every event that touches [from, to), soonest first: one that began earlier
  // and runs into the range counts too.
  function inRange(from, to) {
    const out = [];
    for (const x of events.values()) {
      if (x.scope === 'spaces' && hiddenSpaces.has(x.spaceId)) continue;
      if (x.scope === 'here' && hideOwn) continue;
      const dur = durationOf(x.ev);
      for (const start of occurrences(x.ev, new Date(from.getTime() - dur), to)) {
        const end = endOf(x.ev, start);
        if (end > from || start >= from) out.push({ x, start, end });
      }
    }
    return out.sort((a, b) => a.start - b.start);
  }

  // --- loading and live updates --------------------------------------------

  // scope 'spaces' is another space's event on the environment page: read-only, kept by space and id.
  const keyOf = (scope, id, spaceId) => (scope === 'spaces' ? `spaces:${spaceId}:${id}` : `${scope}:${id}`);
  function remember(scope, item, spaceId) {
    if (!item.key.startsWith('event:') || !item.value) return;
    const id = item.key.slice(6);
    const key = keyOf(scope, id, spaceId);
    events.set(key, { key, scope, spaceId, id, version: item.version, ev: item.value });
  }

  // A space's icon (inline SVG from the host) with its name for a tooltip.
  const spaceIcon = (x) => {
    const r = x.scope === 'spaces' ? spaceInfo.get(x.spaceId) : null;
    return r && r.svg ? `<span class="ri" title="${esc(r.name)}">${r.svg}</span>` : '';
  };
  async function load() {
    events.clear();
    for (const item of await host.storage.list('event:')) remember('here', item);
    if (inSpace) {
      try {
        for (const item of await host.storage.list('event:', { scope: 'environment' })) remember('environment', item);
      } catch (err) {
        // guests and people without environment access see just the space's events
      }
    } else if (info.context.scope === 'environment') {
      // Every space the viewer belongs to that has the calendar on.
      try {
        for (const r of await host.spaces()) spaceInfo.set(r.id, r);
        for (const item of await host.storage.list('event:', { scope: 'spaces' })) remember('spaces', item, item.spaceId);
      } catch (err) {
        // no spaces is fine: just the environment's own events
      }
    }
  }
  host.on('change', (e) => {
    if (!e.key.startsWith('event:')) return;
    const scope = e.scope === 'spaces' ? 'spaces' : e.scope === 'environment' && inSpace ? 'environment' : 'here';
    const id = e.key.slice(6);
    if (e.deleted) events.delete(keyOf(scope, id, e.spaceId));
    else remember(scope, { key: e.key, value: e.value, version: e.version }, e.spaceId);
    if (editing && editing.scope === scope && editing.id === id && (scope !== 'spaces' || editing.spaceId === e.spaceId) && e.by !== info.user.key) {
      showError('This event was just changed by someone else. Close and reopen it to see the change.');
    }
    render();
  });

  // --- drawing -------------------------------------------------------------

  const isCompact = () => $('app').classList.contains('compact');

  function chipHtml({ x, start, cont }) {
    // A multi-day event shows its time on the first day and an arrow on the days after.
    const label = cont ? '\u2192 ' + x.ev.title : (x.ev.allDay ? '' : timeText(start) + ' ') + x.ev.title;
    return `<button class="chip ${x.scope === 'environment' && inSpace ? 'environment' : ''}" data-open="${esc(x.key)}" title="${esc(x.ev.title)}">${spaceIcon(x)}${x.ev.repeat ? '<span class="rep">&#8635;</span>' : ''}${esc(label)}</button>`;
  }

  function monthGrid() {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const gridStart = new Date(first.getFullYear(), first.getMonth(), 1 - first.getDay());
    const gridEnd = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + 42);
    const byDay = new Map();
    for (const occ of inRange(gridStart, gridEnd)) {
      // Every day the occurrence covers, within the grid.
      const firstDay = startOfDay(occ.start);
      const lastDay = startOfDay(new Date(Math.max(occ.end.getTime() - 1, occ.start.getTime())));
      for (let d = firstDay < gridStart ? gridStart : firstDay; d <= lastDay && d < gridEnd; d = addDays(d, 1)) {
        const k = ymd(d);
        if (!byDay.has(k)) byDay.set(k, []);
        byDay.get(k).push({ ...occ, cont: d > firstDay });
      }
    }
    const today = ymd(new Date());
    const sel = selectedDay();
    let html = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => `<div class="dow">${d}</div>`).join('');
    for (let i = 0; i < 42; i += 1) {
      const day = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
      const list = byDay.get(ymd(day)) || [];
      const shown = isCompact() ? list : list.slice(0, 3);
      html += `<div class="day ${day.getMonth() !== cursor.getMonth() ? 'other' : ''} ${ymd(day) === today ? 'today' : ''} ${ymd(day) === sel ? 'sel' : ''}" data-day="${ymd(day)}"${ymd(day) === sel ? ' aria-current="date"' : ''}${dayKeys(day)}>
        <span class="n">${day.getDate()}</span><div class="chips">${shown.map(chipHtml).join('')}</div>
        ${shown.length < list.length ? `<span class="more">+${list.length - shown.length} more</span>` : ''}</div>`;
    }
    return `<div class="month">${html}</div>`;
  }

  // Occurrences as a list grouped by day.
  function listHtml(occs, emptyText, floor, end) {
    if (!occs.length) return `<p class="empty">${emptyText}</p>`;
    // The Agenda (the destination's panel) is narrow: a space's icon before the title stands for its name.
    const agenda = part === 'panel';
    const groups = new Map();
    for (const occ of occs) {
      // An event that began before the list does starts it on the list's first day.
      const k = ymd(occ.start < floor ? floor : occ.start);
      if (!groups.has(k)) groups.set(k, []);
      groups.get(k).push(occ);
    }
    return `<div class="list">${[...groups.values()].map((g) => `<div class="group"><h4>${esc(dayHeading(g[0].start < floor ? floor : g[0].start))}</h4>${g.map(({ x, start, end }) => `
      <button class="item" data-open="${esc(x.key)}"><span class="when">${esc(whenText(x.ev, start, end))}</span>
        <span class="what"><strong>${agenda ? spaceIcon(x) : ''}${esc(x.ev.title)}${x.ev.repeat ? `<span class="tag">${esc(REPEAT_NAMES[x.ev.repeat.every] || 'repeats')}</span>` : ''}${x.scope === 'environment' && inSpace ? `<span class="tag">${esc(envName())}</span>` : ''}${!agenda && x.scope === 'spaces' && spaceInfo.get(x.spaceId) ? `<span class="tag space">${spaceIcon(x)} ${esc(spaceInfo.get(x.spaceId).name)}</span>` : ''}</strong>${x.ev.desc && !agenda ? `<span>${esc(x.ev.desc.slice(0, 120))}</span>` : ''}</span></button>`).join('')}</div>`).join('')}${end ? `<p class="empty end">${esc(end)}</p>` : ''}</div>`;
  }

  function monthList() {
    const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
    return listHtml(inRange(from, to), `Nothing in ${cursor.toLocaleDateString([], { month: 'long' })}.${canEdit ? ' Add an event to get started.' : ''}`, from);
  }

  function weekList() {
    const from = weekStart();
    return listHtml(inRange(from, addDays(from, 7)), `Nothing this week.${canEdit ? ' Add an event to get started.' : ''}`, from);
  }

  function upcomingList() {
    const from = new Date();
    from.setHours(0, 0, 0, 0);
    const to = new Date(from.getTime() + 90 * DAY);
    return listHtml(inRange(from, to).slice(0, 300), `Nothing coming up.${canEdit ? ' Add an event to get started.' : ''}`, from);
  }

  // The seven days (Sunday first, like the month grid) around the anchor day, each with its events in full.
  const weekStart = () => new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() - anchor.getDay());
  function weekHtml() {
    const start = weekStart();
    const byDay = new Map();
    for (const occ of inRange(start, addDays(start, 7))) {
      const firstDay = startOfDay(occ.start);
      const lastDay = startOfDay(new Date(Math.max(occ.end.getTime() - 1, occ.start.getTime())));
      for (let d = firstDay < start ? start : firstDay; d <= lastDay && d < addDays(start, 7); d = addDays(d, 1)) {
        const k = ymd(d);
        if (!byDay.has(k)) byDay.set(k, []);
        byDay.get(k).push({ ...occ, cont: d > firstDay });
      }
    }
    const today = ymd(new Date());
    const sel = selectedDay();
    let html = '';
    for (let i = 0; i < 7; i += 1) {
      const day = addDays(start, i);
      const list = byDay.get(ymd(day)) || [];
      html += `<div class="day ${ymd(day) === today ? 'today' : ''} ${ymd(day) === sel ? 'sel' : ''}" data-day="${ymd(day)}"${ymd(day) === sel ? ' aria-current="date"' : ''}${dayKeys(day)}><span class="n">${esc(day.toLocaleDateString([], { weekday: 'short' }))} <b>${day.getDate()}</b></span><div class="chips">${list.map(chipHtml).join('')}</div></div>`;
    }
    return `<div class="week">${html}</div>`;
  }
  function weekTitle() {
    const s = weekStart();
    const e = addDays(s, 6);
    const m = (d) => d.toLocaleDateString([], { month: 'short' });
    return s.getMonth() === e.getMonth() ? `${m(s)} ${s.getDate()} \u2013 ${e.getDate()}, ${e.getFullYear()}` : `${m(s)} ${s.getDate()} \u2013 ${m(e)} ${e.getDate()}, ${e.getFullYear()}`;
  }

  // One day: an all-day row (with what runs into the day from before it), then a column of hours, each with the
  // events that start in it. As one day of the Week view, hour by hour.
  function dayHtml() {
    const start = startOfDay(anchor);
    const end = addDays(start, 1);
    const allDay = [];
    const byHour = new Map();
    for (const occ of inRange(start, end)) {
      if (occ.x.ev.allDay || occ.start < start) allDay.push({ ...occ, cont: occ.start < start });
      else {
        const h = occ.start.getHours();
        if (!byHour.has(h)) byHour.set(h, []);
        byHour.get(h).push({ ...occ, cont: false });
      }
    }
    const k = ymd(start);
    let html = `<div class="allday"><span class="hr">All day</span><div class="chips">${allDay.map(chipHtml).join('')}</div></div><div class="hours">`;
    const now = new Date();
    for (let h = 0; h < 24; h += 1) {
      const at = new Date(start.getFullYear(), start.getMonth(), start.getDate(), h);
      const current = ymd(now) === k && now.getHours() === h;
      html += `<div class="hour${current ? ' now' : ''}" data-day="${k}" data-hour="${h}"><span class="hr">${esc(timeText(at))}</span><div class="chips">${(byHour.get(h) || []).map(chipHtml).join('')}</div></div>`;
    }
    return `<div class="dayview">${html}</div></div>`;
  }
  // Open the day at its first event, or the hour it is now, or 7:00; once per day shown, so a change does not jump it.
  let scrolledFor = '';
  function scrollDay() {
    const k = ymd(anchor);
    if (scrolledFor === k) return;
    scrolledFor = k;
    const first = root.querySelector('.hours .hour .chip');
    const now = root.querySelector('.hours .hour.now');
    const row = (first && first.closest('.hour')) || now || root.querySelector('.hours .hour[data-hour="7"]');
    const body = $('body');
    if (!row || !body) return;
    const go = () => { body.scrollTop = Math.max(0, row.getBoundingClientRect().top - body.getBoundingClientRect().top + body.scrollTop - 4); };
    go();
    requestAnimationFrame(() => { if (row.isConnected) go(); }); // once laid out, in case the first pass had no height yet
  }

  // Month / Week / Day / Agenda is the toolbar's view switch (the Agenda's key is `list`). As the destination's
  // calendar the page's bar has Month, Week and Day, and this draws whichever it says.
  const VIEWS = [
    { id: 'month', label: 'Month', icon: 'calendar-days' },
    { id: 'week', label: 'Week', icon: 'calendar-week' },
    { id: 'day', label: 'Day', icon: 'calendar-day' },
    { id: 'list', label: 'Agenda', icon: 'list' },
  ];
  const PART_VIEWS = ['month', 'week', 'day'];
  if (part && !PART_VIEWS.includes(view)) view = prefs.defaultView === 'week' ? 'week' : 'month';
  const viewSwitch = part ? { set() {} } : host.ui.viewSwitch({
    id: 'view',
    options: VIEWS,
    value: view,
    onChange: (id) => { view = id; render(); },
  });

  // As the destination's calendar a day is selected by keyboard too: Tab to it, then Enter or Space. (Not a button:
  // it holds the events' own buttons.)
  function dayKeys(day) {
    return part === 'main' ? ` tabindex="0" title="${esc(dayHeading(day))}"` : '';
  }
  // As a part: the selected day (YYYY-MM-DD), which the Agenda follows.
  function selectedDay() {
    return part === 'main' ? ymd(anchor) : '';
  }
  // The period the calendar shows: [from, to).
  function period() {
    if (view === 'day') { const d = startOfDay(anchor); return { from: d, to: addDays(d, 1) }; }
    if (view === 'week') { const s0 = weekStart(); return { from: s0, to: addDays(s0, 7) }; }
    return { from: new Date(cursor.getFullYear(), cursor.getMonth(), 1), to: new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1) };
  }
  // The destination's filter left nothing on.
  const nothingPicked = () => Boolean(part) && hideOwn && ![...spaceInfo.keys()].some((id) => !hiddenSpaces.has(id));
  const pickOne = () => `Pick at least one in ${word('space', { many: true, cap: true })}.`;

  function render() {
    if (part === 'panel') return renderAgenda();
    const showNav = view !== 'list';
    $('prev').hidden = $('next').hidden = !showNav;
    viewSwitch.set(view);
    renderFilters();
    $('title').textContent = view === 'week' ? weekTitle() : view === 'day' ? dayHeading(anchor) : view === 'list' ? 'Next 90 days' : cursor.toLocaleDateString([], { month: 'long', year: 'numeric' });
    if (part === 'main') tellPeriod();
    if (view !== 'day') scrolledFor = ''; // back to the day view later opens it at its first event again
    if (nothingPicked()) {
      $('body').innerHTML = `<p class="empty">${esc(pickOne())}</p>`;
    } else if (view === 'week') {
      // Week and Month list their events beneath the grid (listUnder); not as the destination's calendar, whose
      // Agenda beside it is that list.
      $('body').innerHTML = listUnder(view, part) ? `<div class="stack">${weekHtml()}<div><h3 class="list-title">This week</h3>${weekList()}</div></div>` : weekHtml();
    } else if (view === 'day') {
      // A redraw of the same day keeps where it was scrolled to; a new day opens at its first event.
      const keep = $('body').scrollTop;
      $('body').innerHTML = dayHtml();
      if (scrolledFor === ymd(anchor)) $('body').scrollTop = keep;
      else scrollDay();
    } else if (view === 'list') {
      $('body').innerHTML = upcomingList();
    } else if (listUnder(view, part)) {
      $('body').innerHTML = `<div class="stack">${monthGrid()}<div><h3 class="list-title">This month</h3>${monthList()}</div></div>`;
    } else {
      $('body').innerHTML = monthGrid();
    }
  }

  // The Agenda (the destination's panel): the events of the period the calendar shows, from the selected day on.
  let agendaState = null;
  function renderAgenda() {
    if (nothingPicked()) {
      $('body').innerHTML = `<p class="empty">${esc(pickOne())}</p>`;
      return;
    }
    const st = agendaState || {};
    const today = startOfDay(new Date());
    const from = st.from ? parseYmd(st.from) : new Date(today.getFullYear(), today.getMonth(), 1);
    const to = st.to ? parseYmd(st.to) : new Date(today.getFullYear(), today.getMonth() + 1, 1);
    const day = st.day ? parseYmd(st.day) : today;
    const start = day > from && day < to ? day : from;
    const unit = st.view === 'day' ? 'day' : st.view === 'week' ? 'week' : 'month';
    const occs = inRange(start, to);
    $('body').innerHTML = listHtml(occs, `Nothing else this ${unit}.`, start, `Nothing else this ${unit}.`);
  }

  // On the environment page, a row of the viewer's spaces to show or hide. As a part, the page's filter does this.
  function renderFilters() {
    const box = $('filters');
    box.hidden = Boolean(part) || spaceInfo.size === 0;
    if (box.hidden) return;
    box.innerHTML = [...spaceInfo.values()].map((r) => `<button type="button" class="filter ${hiddenSpaces.has(r.id) ? '' : 'on'}" data-space="${esc(r.id)}" title="${hiddenSpaces.has(r.id) ? 'Show' : 'Hide'} ${esc(r.name)}"><span class="ri">${r.svg || ''}</span> ${esc(r.name)}</button>`).join('');
  }
  $('filters').addEventListener('click', (e) => {
    const b = e.target.closest('[data-space]');
    if (!b) return;
    if (hiddenSpaces.has(b.dataset.space)) hiddenSpaces.delete(b.dataset.space); else hiddenSpaces.add(b.dataset.space);
    render();
  });

  // --- the editor -----------------------------------------------------------

  function showError(text) {
    $('f-error').textContent = text;
    $('f-error').hidden = !text;
  }

  function syncForm() {
    const all = $('f-allday').checked;
    $('f-time-wrap').hidden = all;
    $('f-end-wrap').hidden = all;
    $('f-until-wrap').hidden = $('f-repeat').value === '';
  }
  $('f-allday').addEventListener('change', syncForm);
  $('f-repeat').addEventListener('change', syncForm);

  // Who a reminder reaches: everyone in the event's own place.
  function remindHint() {
    let who;
    const target = editing ? targetOf() : null;
    if (inSpace) who = `Everyone in this ${word('space')}`;
    else if (!target) who = `Everyone in the ${word('space')} you pick`;
    else if (target.scope === 'spaces') who = `Everyone in ${placeName('spaces', target.spaceId)}`;
    else who = `Everyone in this ${word('environment')}`;
    $('f-remind-hint').textContent = $('f-remind').value === '' ? '' : who + ' gets a notification, if they are allowed to see the calendar.';
  }
  $('f-remind').addEventListener('change', remindHint);

  // --- where an event goes ----------------------------------------------------------
  // On the environment page (and as a destination's part) a new event asks where it goes, every time: the
  // environment's own calendar, for people who may add events there, then each space where the viewer may add events.
  // It starts empty whatever was picked last, and Save says to pick first. An event that exists stays where it is:
  // Where shows its place and cannot be changed. In a space there is nothing to ask: it goes in that space.
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
    if (canEdit) options.push(`<option value="own">${esc(placeName('here'))}</option>`);
    for (const r of writableSpaces()) options.push(`<option value="in:${esc(r.id)}">${esc(r.name)}</option>`);
    select.innerHTML = options.join('');
    select.value = '';
    select.disabled = false;
  }
  // Where the open editor's event is, or goes: { scope: 'here' } or { scope: 'spaces', spaceId }; null while a new
  // event on the environment page has no place picked yet.
  function targetOf() {
    if (!editing) return null;
    if (editing.id) return { scope: editing.scope, spaceId: editing.spaceId };
    if (inSpace) return { scope: 'here' };
    const w = $('f-where').value;
    if (w === 'own') return { scope: 'here' };
    if (w.startsWith('in:') && spaceWritable(w.slice(3))) return { scope: 'spaces', spaceId: w.slice(3) };
    return null;
  }
  $('f-where').addEventListener('change', () => { showError(''); remindHint(); });

  // --- the date pickers ------------------------------------------------------
  // The shared picker from the SDK; the end and repeat-until fields can be cleared, and the picker on either
  // shows the event's span.
  const span = () => [$('f-date').value, $('f-end-date').value];
  const pickers = [
    host.ui.datePicker($('f-date'), { range: span }),
    host.ui.datePicker($('f-end-date'), { range: span, clearable: true }),
    host.ui.datePicker($('f-until'), { range: span, clearable: true }),
  ];

  // --- what links to an event, and being opened from a link -----------------------
  // Other modules (a to-do, say) can point at an event. The host tells this module what points at it
  // (host.objects.linksTo), only what the viewer may see, and a link to an event can ask for it to be
  // shown (host.objects.onOpen). Nothing here knows which modules those are.

  const whereFor = (x) => (x.scope === 'spaces' ? { space: x.spaceId } : x.scope === 'environment' && inSpace ? { scope: 'environment' } : undefined);
  let backlinksFor = null; // the event key the shown backlinks are for
  async function showBacklinks(x) {
    backlinksFor = x ? x.key : null;
    $('f-links-wrap').hidden = true;
    if (!x || !host.objects || !host.objects.linksTo) return;
    let summaries = [];
    try {
      summaries = await host.objects.linksTo(host.objects.make('event', x.id, whereFor(x)));
    } catch (err) {
      summaries = [];
    }
    if (backlinksFor !== x.key) return; // the editor moved on
    $('f-links').innerHTML = summaries.map((c) => (c.open
      ? `<button type="button" class="link" data-ref="${esc(JSON.stringify(c.ref))}"><b>${esc(c.kindName || c.module.name)}</b> ${esc(c.title)}</button>`
      : `<span class="link"><b>${esc(c.kindName || c.module.name)}</b> ${esc(c.title)}</span>`)).join('');
    $('f-links-wrap').hidden = summaries.length === 0;
  }
  $('f-links').addEventListener('click', (e) => {
    const b = e.target.closest('[data-ref]');
    if (b && host.objects) host.objects.open(JSON.parse(b.dataset.ref)).catch((err) => showError(err.message));
  });
  // Opened at a place in the page (from the dashboard's month: "day=2026-09-24"): show that month with that day marked.
  if (host.page && host.page.onHash) {
    host.page.onHash((hash) => {
      const m = /(?:^|&)day=(\d{4}-\d{2}-\d{2})(?:&|$)/.exec(hash);
      if (!m) return;
      const d = parseYmd(m[1]);
      if (Number.isNaN(d.getTime())) return;
      cursor = new Date(d.getFullYear(), d.getMonth(), 1);
      anchor = d;
      if (!part) view = 'month'; // as a part the page's bar has the view
      render();
      const cell = root.querySelector(`.day[data-day="${m[1]}"]`);
      if (cell) {
        cell.classList.add('pick');
        cell.scrollIntoView({ block: 'center' });
        setTimeout(() => cell.classList.remove('pick'), 2500);
      }
    });
  }
  // A pointer can arrive before the events have loaded (a #ref link on a fresh page, a pane just opened on a
  // space's canvas): it waits until they have, then the event is shown.
  let loaded = false;
  let waitingRef = null;
  function showRef(ref) {
    const x = events.get(keyOf('here', ref.id)) || events.get(keyOf('environment', ref.id)) || events.get(keyOf('spaces', ref.id, ref.space));
    if (!x) return;
    const d = startOf(x.ev);
    cursor = new Date(d.getFullYear(), d.getMonth(), 1);
    anchor = startOfDay(d);
    if (!part) view = 'month';
    render();
    openEditor(x);
  }
  if (host.objects && host.objects.onOpen) {
    host.objects.onOpen((ref) => {
      if (loaded) showRef(ref);
      else waitingRef = ref;
    });
    host.on('links', (e) => {
      if (e.ref && e.ref.kind === 'event' && editing && events.get(backlinksFor) && events.get(backlinksFor).id === e.ref.id) showBacklinks(events.get(backlinksFor));
    });
  }

  function openEditor(x, day, prefill) {
    if (!x && !canAdd()) return;
    const readOnly = x ? !writable(x) : false;
    const ev = x ? x.ev : { title: '', allDay: false, start: '', end: null, desc: '', remind: null, repeat: null };
    editing = x ? { scope: x.scope, id: x.id, version: x.version, spaceId: x.spaceId } : { scope: null, id: null, version: null, spaceId: null };
    showError('');
    fillWhere(x);
    // Read only in a place where the viewer may not add events: say why (on the environment page, where it can differ).
    const why = readOnly && !inSpace && x ? `Only people who can add events in ${placeName(x.scope, x.spaceId)} can change this.` : '';
    $('f-readonly').textContent = why;
    $('f-readonly').hidden = !why;
    const from = x && x.scope === 'spaces' && spaceInfo.get(x.spaceId) ? ` (${spaceInfo.get(x.spaceId).name})` : '';
    $('editor-title').textContent = x ? (readOnly ? ev.title + from : 'Edit event') : 'New event';
    $('f-title').value = ev.title;
    $('f-allday').checked = Boolean(ev.allDay);
    const start = x ? startOf(ev) : null;
    $('f-date').value = start ? ymd(start) : day || ymd(new Date());
    $('f-time').value = start && !ev.allDay ? `${pad(start.getHours())}:${pad(start.getMinutes())}` : '19:00';
    // The end: a date and time for a timed event, the last day for an all-day one.
    const endAt = ev.end && !ev.allDay ? new Date(ev.end) : null;
    $('f-end-date').value = ev.end ? (ev.allDay ? ev.end : ymd(endAt)) : '';
    $('f-end').value = endAt ? `${pad(endAt.getHours())}:${pad(endAt.getMinutes())}` : '';
    $('f-desc').value = ev.desc || '';
    $('f-remind').value = ev.remind === null || ev.remind === undefined ? '' : String(ev.remind);
    // A quick add fills in what it understood: the title, and a time when one was typed.
    if (!x && prefill) {
      if (prefill.title) $('f-title').value = prefill.title;
      if (prefill.time) { $('f-time').value = prefill.time; $('f-allday').checked = false; }
    }
    $('f-repeat').value = ev.repeat ? ev.repeat.every : '';
    $('f-until').value = ev.repeat && ev.repeat.until ? ev.repeat.until : '';
    for (const id of ['f-title', 'f-date', 'f-time', 'f-end-date', 'f-end', 'f-allday', 'f-desc', 'f-remind', 'f-repeat', 'f-until']) $(id).disabled = readOnly;
    $('f-save').hidden = readOnly;
    $('f-delete').hidden = readOnly || !x;
    $('f-delete').textContent = 'Delete';
    $('f-cancel').textContent = readOnly ? 'Close' : 'Cancel';
    syncForm();
    remindHint();
    pickers.forEach((p) => p.refresh());
    showBacklinks(x || null);
    $('editor').hidden = false;
    $(readOnly ? 'f-cancel' : x || inSpace ? 'f-title' : 'f-where').focus();
  }
  function closeEditor() {
    pickers.forEach((p) => p.close());
    backlinksFor = null;
    $('editor').hidden = true;
    editing = null;
  }
  $('f-cancel').addEventListener('click', closeEditor);
  // A reminder is a schedule the host runs for us: at the right time it sends the
  // notification, and for a repeating event the host schedules the next one itself,
  // so reminders keep coming while this page is closed. It stops if the event
  // changes or goes away.
  // `where` is the event's place for the host ({ space } for another space's event), so the reminder is set there and
  // reaches that space's people.
  async function applyReminder(id, ev, where) {
    const key = 'remind:' + id;
    const stop = () => host.cancelSchedule(key, where);
    try {
      if (ev.remind === null || ev.remind === undefined) return await stop();
      const lead = ev.remind * 60 * 1000;
      const nineAm = ev.allDay ? 9 * 60 * 60 * 1000 : 0; // an all-day event reminds relative to 9:00
      const now = Date.now();
      // The first occurrence whose reminder is not already in the past.
      const next = occurrences(ev, new Date(now + lead - 4 * 60 * 1000 - nineAm), new Date(now + 400 * DAY))[0];
      if (!next) return await stop();
      const at = next.getTime() + nineAm - lead;
      const until = ev.repeat && ev.repeat.until ? endOfDay(parseYmd(ev.repeat.until)).getTime() : null;
      if (until !== null && at > until) return await stop();
      const label = ev.remind === 0 ? 'Starting now' : ev.remind === 15 ? 'Starts in 15 minutes' : ev.remind === 60 ? 'Starts in an hour' : 'Starts tomorrow';
      await host.schedule({
        key,
        at,
        payload: { id },
        notify: { title: ev.title, body: label },
        repeat: ev.repeat ? { every: ev.repeat.every, until, tz: TZ } : undefined,
        ...(where || {}),
      });
    } catch (err) {
      showError('Saved, but the reminder could not be set: ' + err.message);
      throw err;
    }
  }

  async function save() {
    if (!editing) return;
    showError('');
    const target = targetOf();
    if (!target) return showError(`${pickWhere()} first.`);
    const title = $('f-title').value.trim();
    const date = $('f-date').value;
    if (!title || !date) return showError('A title and a date are needed.');
    const allDay = $('f-allday').checked;
    let start = date;
    let end = null;
    const endDate = $('f-end-date').value;
    if (allDay) {
      // An all-day event's end is its last day.
      if (endDate && endDate < date) return showError('The end is before the start.');
      if (endDate && endDate > date) end = endDate;
    } else {
      const time = $('f-time').value || '19:00';
      const s = new Date(`${date}T${time}`);
      if (Number.isNaN(s.getTime())) return showError('That time is not valid.');
      start = s.toISOString();
      // An end date, an end time, or both. Missing one takes the start's.
      if (endDate || $('f-end').value) {
        const t = new Date(`${endDate || date}T${$('f-end').value || time}`);
        if (Number.isNaN(t.getTime())) return showError('That end is not valid.');
        if (t < s) return showError('The end is before the start.');
        if (t > s) end = t.toISOString();
      }
    }
    const remind = $('f-remind').value === '' ? null : Number($('f-remind').value);
    let repeat = null;
    if ($('f-repeat').value) {
      const until = $('f-until').value || null;
      if (until && until < date) return showError('"Until" is before the first date.');
      repeat = { every: $('f-repeat').value, until };
    }
    const id = editing.id || Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const ev = { id, title, allDay, start, end, desc: $('f-desc').value.trim(), remind, repeat, by: info.user.name };
    const where = placeOpts(target.scope, target.spaceId);
    $('f-save').disabled = true;
    try {
      const saved = await host.storage.set('event:' + id, ev, { ...(editing.id ? { version: editing.version } : {}), ...where });
      remember(target.scope, { key: 'event:' + id, value: ev, version: saved.version }, target.spaceId);
      let reminderFailed = false;
      try { await applyReminder(id, ev, where); } catch (err) { reminderFailed = true; }
      render();
      if (!reminderFailed) closeEditor();
      else editing = { scope: target.scope, id, version: saved.version, spaceId: target.spaceId };
    } catch (err) {
      showError(err.status === 409 ? 'Someone changed this event since you opened it. Close it and open it again.' : err.message);
    } finally {
      $('f-save').disabled = false;
    }
  }
  // Save on the button, and on Enter in a field. (The frame's own form-submit is
  // not relied on, so this works wherever a sandboxed frame blocks submitting.)
  $('f-save').addEventListener('click', save);
  $('form').addEventListener('submit', (e) => { e.preventDefault(); save(); });
  $('form').addEventListener('keydown', (e) => {
    if (e.key !== 'Enter' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'BUTTON') return;
    e.preventDefault();
    save();
  });

  let deleteArmed = false;
  let deleteAsking = false;
  $('f-delete').addEventListener('click', async () => {
    if (!editing || !editing.id || deleteAsking) return;
    if (!deleteArmed) {
      deleteAsking = true;
      const current = events.get(keyOf(editing.scope, editing.id, editing.spaceId));
      const usual = current && current.ev.repeat ? 'Delete every one?' : 'Really delete?';
      let n = 0;
      if (current && host.objects && host.objects.linksTo) {
        try {
          const summaries = await host.objects.linksTo(host.objects.make('event', current.id, whereFor(current)));
          n = Array.isArray(summaries) ? summaries.length : 0;
        } catch { /* the usual question still stands */ }
      }
      deleteAsking = false;
      deleteArmed = true;
      $('f-delete').textContent = n ? `Used by ${n}. ${usual}` : usual;
      setTimeout(() => { deleteArmed = false; $('f-delete').textContent = 'Delete'; }, 4000);
      return;
    }
    deleteArmed = false;
    try {
      const where = placeOpts(editing.scope, editing.spaceId);
      await host.storage.delete('event:' + editing.id, where);
      try { await host.cancelSchedule('remind:' + editing.id, where); } catch (err) { /* nothing to cancel */ }
      events.delete(keyOf(editing.scope, editing.id, editing.spaceId));
      closeEditor();
      render();
    } catch (err) {
      showError(err.message);
    }
  });

  // --- wiring ---------------------------------------------------------------

  // Previous and next step a month, a week in the week view or a day in the day view; the month, the week and the
  // day follow each other. As the destination's calendar a month keeps today selected when it is in it, else its 1st.
  const step = (n) => {
    if (view === 'day') anchor = addDays(anchor, n);
    else if (view === 'week') anchor = addDays(anchor, 7 * n);
    else {
      anchor = new Date(cursor.getFullYear(), cursor.getMonth() + n, 1);
      const now = new Date();
      if (part && now.getFullYear() === anchor.getFullYear() && now.getMonth() === anchor.getMonth()) anchor = startOfDay(now);
    }
    cursor = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
    render();
  };
  $('prev').addEventListener('click', () => step(-1));
  $('next').addEventListener('click', () => step(1));
  $('today').addEventListener('click', () => { anchor = part ? startOfDay(new Date()) : new Date(); cursor = new Date(anchor.getFullYear(), anchor.getMonth(), 1); render(); });
  function startNew() {
    if (!canAdd()) return;
    openEditor(null, part === 'main' ? ymd(anchor) : undefined);
  }
  $('add').addEventListener('click', startNew);
  // Typed text goes through Chat `/c` (addEvent): parseWhen, then this same editor, nothing saved until Save.
  // The host draws Add event in the module's action bar when docked; the header button stays for a host without one,
  // and as a destination's part, whose page has no action bar. Who may add is known once the spaces are in.
  let barHosted = false;
  function showAdd() {
    $('add').hidden = part === 'panel' || !canAdd();
    if (barHosted) host.bar.set(canAdd() ? [{ id: 'add', label: 'Add event', icon: 'calendar-plus', primary: true }] : []).catch(() => {});
  }
  if (host.bar && !part) {
    barHosted = true;
    $('add').classList.add('hosted');
    host.bar.set(canEdit ? [{ id: 'add', label: 'Add event', icon: 'calendar-plus', primary: true }] : []).catch(() => { barHosted = false; $('add').classList.remove('hosted'); });
    host.on('bar', (e) => {
      if (e.id !== 'add' || !canAdd()) return;
      startNew();
    });
  }

  // --- as a part of the Calendar destination -------------------------------------------
  // The page owns the view and the filter and hands them over (host.destination.onState); the calendar owns the
  // selected day and the period it shows, and tells the page (host.destination.set), which tells the Agenda.
  let told = '';
  function tellPeriod() {
    if (part !== 'main' || !host.destination) return;
    const p = period();
    const next = { day: ymd(anchor), from: ymd(p.from), to: ymd(p.to) };
    const sig = JSON.stringify(next);
    if (sig === told) return;
    told = sig;
    host.destination.set(next).catch(() => { told = ''; });
  }
  let firstState = true;
  function takeState(st) {
    if (!st || typeof st !== 'object') return;
    if (Array.isArray(st.spaces)) {
      const on = new Set(st.spaces.map(String));
      hiddenSpaces.clear();
      for (const id of spaceInfo.keys()) if (!on.has(id)) hiddenSpaces.add(id);
      pickedSpaces = on;
    }
    hideOwn = st.environment === false;
    if (part === 'main') {
      if (PART_VIEWS.includes(st.view)) view = st.view;
      // The day the page opens on (a link to a day, say); after that the calendar says which day is selected.
      if (firstState && typeof st.day === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(st.day)) {
        anchor = parseYmd(st.day);
        cursor = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      }
    } else {
      agendaState = st;
    }
    firstState = false;
    if (loaded) render();
  }
  // The filter's spaces, kept so a space that loads after the state (or joins later) is shown or hidden by it.
  let pickedSpaces = null;
  if (part && host.destination) host.destination.onState(takeState);
  // An event can be dragged onto another module that links to events (a to-do, say): it carries a
  // pointer to the event, and the other module asks the host for what it may show.
  if (host.objects && host.objects.draggable) {
    host.objects.draggable($('body'), (target) => {
      const open = target.closest('[data-open]');
      const x = open && events.get(open.dataset.open);
      return x ? { kind: 'event', id: x.id, label: x.ev.title, ...whereFor(x) } : null;
    });
  }
  // --- what a drop can do ---------------------------------------------------
  // An object dropped from another module on a day, or on an event, offers what can be done with it. Some
  // of that is this module's own (make an event of it); the rest is whatever other modules say they can do
  // with an object of that kind and can be filled in from what this module has (the day, an event's pointer).
  // Nothing here names the module the object came from. More than one choice: the person is asked.
  let noteTimer = 0;
  function note(text, bad) {
    $('note').textContent = text;
    $('note').classList.toggle('bad', Boolean(bad));
    $('note').hidden = false;
    clearTimeout(noteTimer);
    noteTimer = setTimeout(() => { $('note').hidden = true; }, 4000);
  }
  async function createEventOn(title, date, ref) {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const ev = { id, title: String(title).slice(0, 120), allDay: true, start: date, end: null, desc: '', remind: null, repeat: null, by: info.user.name };
    const saved = await host.storage.set('event:' + id, ev, {});
    remember('here', { key: 'event:' + id, value: ev, version: saved.version });
    const made = host.objects.make('event', id);
    // Made from an object dropped or handed over: point at it, so the link shows from both ends.
    if (ref && host.objects.setLinks) host.objects.setLinks(made, [ref]).catch(() => {});
    render();
    return { ref: made };
  }
  const dropSpot = (pt) => {
    const el = host.objects.elementAt(pt);
    if (!el) return null;
    const open = el.closest('[data-open]');
    const x = open && events.get(open.dataset.open);
    if (x) return { el: open, event: x, day: ymd(startOf(x.ev)) };
    const cell = el.closest('[data-day]');
    return cell ? { el: cell, event: null, day: cell.dataset.day } : null;
  };
  const clearDrop = () => { for (const e of root.querySelectorAll('.drop')) e.classList.remove('drop'); };
  // What a drop can do is the one shared decision (host.objects.dropMenu): this module says what is under the
  // pointer (the day, and the event when dropped on one) and offers its own (make an event of it); the SDK adds
  // whatever the modules around offer for an object of that kind, filled from the same context.
  if (host.objects && host.objects.dropTarget && host.actions) {
    const foreign = (ref, dragged) => (ref ? ref.module !== info.module.id : Boolean(dragged && dragged.summary));
    host.objects.dropTarget({
      // A drop is taken from anyone: what it offers may be another module's to do (a task's due date, To-do's own
      // permission), and this module's own offer (an event made of it) only for those who may add events here.
      over: (pt, ref, dragged) => {
        clearDrop();
        if (!foreign(ref, dragged)) return;
        const spot = dropSpot(pt);
        if (spot) spot.el.classList.add('drop');
      },
      leave: clearDrop,
      drop: async (ref, pt, dragged) => {
        clearDrop();
        if (!foreign(ref, dragged)) return;
        const spot = dropSpot(pt);
        host.objects.trace(spot ? 'drop on ' + (spot.event ? 'event ' + spot.event.id : 'day ' + spot.day) : 'drop: nothing under the pointer');
        if (!spot) return;
        try {
          const context = { date: spot.day, ...(spot.event ? { target: host.objects.make('event', spot.event.id, whereFor(spot.event)) } : {}) };
          const chosen = await host.objects.dropMenu(dragged, pt, {
            context,
            own: spot.event || !canEdit ? [] : [{ id: 'create', label: 'Add to the calendar as an event', hint: shortDay(parseYmd(spot.day)), run: (ctx) => createEventOn(ctx.summary.title || (ref ? ref.kind : 'Event'), spot.day, ref) }],
            remember: spot.event ? 'event' : 'day',
          });
          if (chosen) note(chosen.label + ': done');
        } catch (err) {
          note(err.message, true);
        }
      },
    });
  }
  // What other modules may ask of this one: put something on the calendar, pointing at `ref` when one is given.
  // The Agenda leaves them to the calendar beside it, so one page does each once.
  if (host.actions && host.actions.provide && part !== 'panel') {
    host.actions.provide({
      createEvent: async (input) => {
        if (!canEdit) throw new Error('this person cannot add events here');
        return createEventOn(input.title, input.date, input.ref);
      },
      addEvent: async (input) => {
        if (!canAdd()) throw new Error('this person cannot add events here');
        const parsed = input.text && host.util.parseWhen ? host.util.parseWhen(input.text) : { title: input.text || '' };
        openEditor(null, parsed.date, parsed);
        return {};
      },
    });
  }
  $('body').addEventListener('click', (e) => {
    const open = e.target.closest('[data-open]');
    if (open) {
      const x = events.get(open.dataset.open);
      if (x) openEditor(x);
      return;
    }
    // An hour of the day view: a new event at that hour.
    const hour = e.target.closest('[data-hour]');
    if (hour) {
      if (canAdd()) openEditor(null, hour.dataset.day, { time: `${pad(Number(hour.dataset.hour))}:00` });
      return;
    }
    const day = e.target.closest('[data-day]');
    if (!day) return;
    // As the destination's calendar a click selects the day (the Agenda follows); elsewhere it starts an event on it.
    if (part === 'main') {
      anchor = parseYmd(day.dataset.day);
      cursor = new Date(anchor.getFullYear(), anchor.getMonth(), 1);
      render();
    } else if (canAdd()) openEditor(null, day.dataset.day);
  });
  root.addEventListener('keydown', (e) => {
    if ((e.key === 'Enter' || e.key === ' ') && part === 'main' && e.target.matches && e.target.matches('.day[data-day]')) {
      e.preventDefault();
      const k = e.target.dataset.day;
      e.target.click();
      const again = root.querySelector(`.day[data-day="${k}"]`);
      if (again) again.focus();
      return;
    }
    if (e.key !== 'Escape') return;
    if (!$('editor').hidden) closeEditor();
  });

  // A frame can report no width while it is still being laid out, so wait for a real
  // one before choosing the compact layout.
  const fit = () => {
    const w = host.rootElement.clientWidth;
    if (!w) return;
    $('app').classList.toggle('compact', w < 520);
  };
  // A calendar that was just closed (in the page, its elements go before its root stops resizing) has nothing to draw.
  new ResizeObserver(() => { if (!$('app')) return; fit(); render(); }).observe(host.rootElement);

  $('add').hidden = true;
  // The Agenda draws no header of its own: the page's panel switch is its heading.
  if (part === 'panel') root.querySelector('.bar').hidden = true;
  $('app').classList.toggle('part', Boolean(part));
  try {
    await load();
  } catch (err) {
    $('msg').textContent = 'The calendar could not load: ' + err.message;
    return;
  }
  if (pickedSpaces) for (const id of spaceInfo.keys()) if (!pickedSpaces.has(id)) hiddenSpaces.add(id);
  showAdd();
  $('msg').hidden = true;
  $('app').hidden = false;
  fit();
  render();
  loaded = true;
  if (waitingRef) {
    const ref = waitingRef;
    waitingRef = null;
    showRef(ref);
  }

  // An event that has passed is announced once, for the modules that follow it (a task that is done when the
  // event is over, say). Whoever has the calendar open first after it ends announces it, marking the event so
  // nobody repeats it; moving the event clears the mark. Repeating events are not announced, and neither is
  // one that ended more than a week ago (so opening an old calendar announces nothing from long ago).
  const WEEK = 7 * 24 * 60 * 60 * 1000;
  const announcing = new Set();
  async function announceEnded() {
    if (!host.events || !canEdit || part === 'panel') return;
    const now = Date.now();
    let sent = 0;
    for (const x of [...events.values()]) {
      if (x.scope !== 'here' || x.ev.repeat || x.ev.announced || announcing.has(x.id) || sent >= 5) continue;
      const ends = startOf(x.ev).getTime() + durationOf(x.ev);
      if (ends > now || now - ends > WEEK) continue;
      announcing.add(x.id);
      sent += 1;
      const ev = { ...x.ev, announced: true };
      try {
        const saved = await host.storage.set('event:' + x.id, ev, { version: x.version });
        remember('here', { key: 'event:' + x.id, value: ev, version: saved.version });
        const day = startOf(ev).toLocaleDateString([], { month: 'short', day: 'numeric' });
        await host.events.publish('ended', { ref: host.objects.make('event', x.id, whereFor(x)), data: { summary: (ev.title + ', ' + day).slice(0, 200) } });
      } catch (err) {
        // someone else announced it first, or nobody may hear it: the event is fine either way
      } finally {
        announcing.delete(x.id);
      }
    }
  }
  announceEnded();
  setInterval(announceEnded, 60000);
})();
