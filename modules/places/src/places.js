// The Places module's page: the space's saved places, listed by category, each with an address, an optional position, notes and
// owners. The places live in the module's store (see places-lib.js) and, with a position, give their summary a `place` that a map
// module draws. This page draws into the markup in places.html by cloning its templates and filling their [data-slot] and
// [data-icon] hooks, and toggles the state classes and data attributes CONTRACT.md lists. It builds no markup from strings
// and sets no style (the item menu is placed under the button that opened it). Nothing here names another module.
// As the Map destination's list (plan-map-destination) it lists Mine, the environment's own and each chosen space's places
// in one list, following the page's filter and search (host.destination), and a new place asks where it goes, every time.
(async () => {
  'use strict';

  // This module runs in a frame (the SDK is a global) or in the page (its SDK is handed to its script); either way it looks
  // elements up in host.root, never in document.
  const host = (document.currentScript && document.currentScript.host) || window.host;
  const root = host.root;
  const word = host.util.word; // the environment's word for a level or role (host.locale().words)
  const $ = (id) => root.getElementById(id);

  let info;
  try {
    info = await host.ready();
  } catch (err) {
    $('msg').textContent = 'Places could not start: ' + err.message;
    return;
  }
  // On a space's canvas or on the module's own page: a space has its own list; the page has only mine and everyone's.
  const inSpace = info.context.scope === 'space';
  if (!inSpace && info.context.scope !== 'environment') {
    $('msg').textContent = `${info.module.name} could not open here.`;
    return;
  }
  // The Map destination's list: Mine, everyone's and the viewer's spaces' places together, beside the map. The page draws
  // the filter and the search; this draws no header, view switch or bar of its own.
  const asPart = !inSpace && Boolean(info.context.destination && info.context.destination.part);

  const geo = host.util.geo;
  /*__LIB__*/

  const canEdit = host.can('edit');
  // Its heading reads its name as this environment shows it (host.info's: the display name, else its own).
  for (const el of root.querySelectorAll('[data-slot="own-name"]')) el.textContent = info.module.name;
  const personal = Boolean(info.user && info.user.key !== 'guest'); // a guest has no profile, so no personal places
  const apple = /iPhone|iPad|iPod|Macintosh/.test(navigator.userAgent) && 'ontouchend' in document;
  const CAT_ORDER = ['do', 'eat', 'stay', 'travel', 'other'];
  const CAT_LABEL = { do: 'Things to do', eat: 'Food', stay: 'Stay', travel: 'Travel', other: 'Other' };
  const CAT_ICON = { do: 'ticket', eat: 'utensils', stay: 'bed', travel: 'plane', other: 'note-sticky' };

  // Two stores of the same kind of thing: this space's, and the person's own (private, in their profile, the same in every space).
  // `places` is whichever the person is looking at.
  // Beside the map, each of the viewer's spaces has a store too, keyed 'in:<space id>' (see addSpaceStore below). A place is
  // known by where it is (`w`, a store's key) and its id: two stores may hold the same id.
  const stores = { space: createPlaces(host, { scope: 'space' }), my: createPlaces(host, { scope: 'person' }), global: createPlaces(host, { scope: 'environment' }) };
  const loadedStores = new Set();
  const ensureLoaded = (v) => { if (loadedStores.has(v)) return Promise.resolve(); loadedStores.add(v); return stores[v].load().catch((err) => { loadedStores.delete(v); throw err; }); };
  let view = inSpace ? 'space' : 'my';
  const spaceInfo = new Map(); // beside the map: space id -> { id, name, icon, svg, write }, from host.spaces()
  // A module that can show a place on a map, if one is installed: found by what it offers, never by name.
  let showAction = null;
  async function findShowAction() {
    try {
      const list = await host.actions.list({ accepts: 'places:place' });
      showAction = list.find((a) => a.name === 'showOnMap') || null;
    } catch (err) {
      showAction = null;
    }
  }
  const state = {
    people: [],
    filter: '',
    cat: '',
    loaded: false,
    links: new Map(), // place id -> summaries of what other modules point at it
    editing: null, // { id | null, version, point: {lat, lng} | null, pointOk, conflict, origin (the search result it came from) }
    menuFor: null,
    armed: null,
    search: false, // whether a place search is set up
    searchCredit: '', // what to say about it under the results
    dest: null, // beside the map: the page's filter, { mine, environment, spaces: Set | null }; null shows everything
    q: '', // beside the map: the page's search text as typed
    selected: '', // beside the map: the selected place, `${w}/${id}`, shared with the map through the page
  };
  const nameOf = (key) => (state.people.find((p) => p.key === key) || {}).name || '';
  const initial = (key) => (nameOf(key)[0] || '?').toUpperCase();

  // --- small helpers ------------------------------------------------------------------------------------------------

  const clone = (id) => $(id).content.firstElementChild.cloneNode(true);
  const hide = (node, yes) => { if (node) node.hidden = Boolean(yes); };
  const slot = (el, name) => (el.dataset.slot === name ? el : el.querySelector(`[data-slot="${name}"]`));
  // Set a slot's text, or hide the slot when there is nothing to show.
  function fill(el, values) {
    for (const [name, value] of Object.entries(values)) {
      const s = slot(el, name);
      if (!s) continue;
      s.textContent = value == null ? '' : String(value);
      s.hidden = value === '' || value == null;
    }
  }
  const iconSvg = new Map();
  const iconWait = new Map();
  function wantIcon(name) {
    if (iconSvg.has(name)) return Promise.resolve(iconSvg.get(name));
    if (!iconWait.has(name)) iconWait.set(name, host.ui.icon(name).then((svg) => { iconSvg.set(name, svg); return svg; }).catch(() => { iconSvg.set(name, ''); return ''; }));
    return iconWait.get(name);
  }
  function hydrate(scope) {
    for (const el of scope.querySelectorAll('[data-icon]')) {
      const name = el.dataset.icon;
      if (!name || el.dataset.shown === name) continue;
      if (iconSvg.has(name)) { el.innerHTML = iconSvg.get(name); el.dataset.shown = name; } else wantIcon(name).then(() => hydrate(scope));
    }
  }
  const setIcon = (node, name) => { if (node) { node.dataset.icon = name || ''; delete node.dataset.shown; node.textContent = ''; } };
  const say = (text) => { const n = $('note'); n.textContent = text || ''; n.hidden = !text; };
  // Where a place is, for the host: a pointer's options, and the store a pointer names.
  const whereOpts = (w) => (w === 'my' ? { scope: 'person' } : w === 'global' ? { scope: 'environment' } : w.startsWith('in:') ? { space: w.slice(3) } : {});
  const placeRef = (w, id) => host.objects.make('place', id, whereOpts(w));
  const whereOfRef = (ref) => (ref.scope === 'person' ? 'my' : ref.scope === 'environment' ? 'global' : ref.scope === 'space' ? (inSpace ? 'space' : `in:${ref.space}`) : null);
  const rowKey = (w, id) => `${w}/${id}`;
  // Who may change the places in a store. On the module's own pages, as before: this module's edit permission here. Beside
  // the map: Mine and everyone's by the edit permission at the environment (Mine needs a signed-in person), a space's where
  // host.spaces() says `write` there.
  function writable(w) {
    if (!asPart) return canEdit;
    if (w === 'my') return personal && canEdit;
    if (w === 'global') return canEdit;
    if (w.startsWith('in:')) { const r = spaceInfo.get(w.slice(3)); return Boolean(r && r.write === true); }
    return false;
  }
  // The environment's own places are named by the environment's name (info.context.environment.name), as the Map
  // destination's filter names them (decision 19); "Everyone" only where the name is not known.
  const everyoneName = () => (info.context.environment && info.context.environment.name) || 'Everyone';
  const whereName = (w) => (w === 'my' ? 'Mine' : w === 'global' ? everyoneName() : w === 'space' ? `This ${word('space')}` : (spaceInfo.get(w.slice(3)) || {}).name || word('space', { cap: true }));
  // Where a new place may go, beside the map: Mine, everyone's, then each space where the viewer may add places.
  function whereOptions() {
    const out = [];
    if (writable('my')) out.push({ w: 'my', label: 'Mine' });
    if (writable('global')) out.push({ w: 'global', label: everyoneName() });
    for (const r of spaceInfo.values()) if (r.write === true) out.push({ w: `in:${r.id}`, label: r.name });
    return out;
  }
  const canAdd = () => (asPart ? whereOptions().length > 0 : canEdit);
  // The stores shown: the view's on the module's own pages; beside the map, those the page's filter has on.
  function shownWheres() {
    if (!asPart) return [view];
    const f = state.dest;
    const out = [];
    if (personal && (!f || f.mine)) out.push('my');
    if (!f || f.environment) out.push('global');
    for (const id of spaceInfo.keys()) if (!f || !f.spaces || f.spaces.has(id)) out.push(`in:${id}`);
    return out;
  }
  const entries = () => shownWheres().flatMap((w) => (stores[w] ? stores[w].list().map((p) => ({ p, w })) : [])).sort((a, b) => a.p.title.localeCompare(b.p.title));
  const placeAt = (w, id) => (w && stores[w] ? stores[w].get(id) : null);

  // The pane's width, not the window's: a bundled module runs in the page, so a media query would follow the window.
  const fit = () => {
    const w = host.rootElement.clientWidth;
    if (w) $('app').classList.toggle('narrow', w < 720);
  };
  fit();
  new ResizeObserver(fit).observe(host.rootElement);

  // --- the list -----------------------------------------------------------------------------------------------------

  const matches = (p, q) => !q || [p.title, p.address, p.notes].some((t) => t.toLowerCase().includes(q));
  const visible = () => {
    const q = state.filter.trim().toLowerCase();
    return entries().filter((x) => matches(x.p, q));
  };

  // What other modules point at each place (asked once per place; the 'links' event clears it).
  const asked = new Set();
  async function loadLinks() {
    if (!host.objects || !host.objects.linksTo) return;
    let changed = false;
    for (const { p, w } of entries().filter((x) => x.w !== 'my').slice(0, 100)) { // personal places are not linked
      const key = rowKey(w, p.id);
      if (asked.has(key)) continue;
      asked.add(key);
      try {
        const summaries = await host.objects.linksTo(placeRef(w, p.id));
        if (summaries.length) { state.links.set(key, summaries); changed = true; }
      } catch (err) { /* nothing points at it */ }
    }
    if (changed) render();
  }
  if (host.on) host.on('links', () => { asked.clear(); state.links.clear(); loadLinks().catch(() => {}); });

  const linkPill = (summary) => {
    const el = clone('tpl-link');
    setIcon(el.querySelector('[data-icon]'), (summary.module && summary.module.icon) || 'link');
    fill(el, { kind: summary.kindName || summary.kind || '', title: summary.title || '' });
    return el;
  };

  // Beside the map each place says whose it is: the person mark for Mine, the globe for everyone's, a space's own icon.
  function scopeMark(el, w) {
    const mark = el.querySelector('.scope-mark');
    if (!mark) return;
    if (!asPart) { mark.remove(); return; }
    const ic = mark.querySelector('.ic');
    const r = w.startsWith('in:') ? spaceInfo.get(w.slice(3)) : null;
    if (r && r.svg) { ic.innerHTML = r.svg; ic.dataset.shown = 'space'; } else setIcon(ic, w === 'my' ? 'user' : w === 'global' ? 'globe' : 'users');
    fill(mark, { scope: whereName(w) });
    mark.hidden = false;
  }

  function row(p, w) {
    const el = clone('tpl-place');
    el.dataset.id = p.id;
    el.dataset.where = w;
    el.dataset.cat = p.category;
    if (asPart && state.selected === rowKey(w, p.id)) el.classList.add('selected');
    scopeMark(el, w);
    setIcon(el.querySelector('.mark [data-icon]'), CAT_ICON[p.category]);
    fill(el, { title: p.title, address: p.address });
    hide(slot(el, 'pinned'), !p.point);
    hide(slot(el, 'nopos'), Boolean(p.point));
    const owners = slot(el, 'owners');
    owners.replaceChildren(...p.owners.map((k) => { const o = clone('tpl-owner'); o.textContent = initial(k); o.title = nameOf(k); return o; }));
    owners.hidden = !owners.children.length;
    const links = slot(el, 'links');
    links.replaceChildren(...(state.links.get(rowKey(w, p.id)) || []).slice(0, 4).map(linkPill));
    links.hidden = !links.children.length;
    return el;
  }

  // Beside the map, with a name typed in the page's search and a place search set up: look for new places, at the list's foot.
  const findMore = () => {
    if (!asPart || !state.search || !state.q || !readEntry(state.q).find) return null;
    const el = clone('tpl-find-more');
    hydrate(el);
    return el;
  };

  function render() {
    const all = entries().map((x) => x.p);
    const empty = state.loaded && !all.length;
    hide($('app').querySelector('.head'), empty || asPart);
    hide($('part-head'), !asPart || !state.loaded || !canAdd());
    hide($('chips'), empty || !state.loaded);
    fill($('app').querySelector('.head'), { count: all.length ? String(all.length) : '' });
    const body = $('body');
    if (!state.loaded) { body.replaceChildren(clone('tpl-state-loading')); return; }
    // Beside the map, with nothing on in the page's filter.
    if (asPart && !shownWheres().length) {
      const none = clone('tpl-state-none');
      fill(none, { text: `Pick at least one in ${word('space', { many: true, cap: true })}.` });
      body.replaceChildren(none);
      hide($('chips'), true);
      return;
    }
    if (empty) {
      const st = clone('tpl-state-empty');
      if (asPart) { fill(st, { title: 'No places here yet.' }); hide(st.querySelector('[data-slot="text"]'), true); }
      body.replaceChildren(st);
      hide(body.querySelector('[data-action="add-place"]'), !canAdd());
      const more = findMore();
      if (more) body.append(more);
      hydrate(root);
      return;
    }
    // The chips: All, then a chip per category with places, each with its count of what the search leaves.
    const searched = visible().map((x) => x.p);
    const counts = Object.fromEntries(CAT_ORDER.map((c) => [c, searched.filter((p) => p.category === c).length]));
    const chips = [];
    const chip = (key, icon, label, count) => {
      const c = clone('tpl-chip');
      c.dataset.cat = key;
      setIcon(c.querySelector('[data-icon]'), icon);
      fill(c, { label, count: String(count) });
      c.classList.toggle('on', state.cat === key);
      chips.push(c);
    };
    chip('', 'layer-group', 'All', searched.length);
    for (const c of CAT_ORDER) if (counts[c]) chip(c, CAT_ICON[c], CAT_LABEL[c], counts[c]);
    $('chips').replaceChildren(...chips);
    // The groups.
    const shown = visible().filter((x) => !state.cat || x.p.category === state.cat);
    if (!shown.length) {
      const st = clone('tpl-state-noresults');
      // Beside the map the search text is the page's: only a category chip can be cleared from here.
      if (asPart) hide(st.querySelector('[data-action="clear-filter"]'), !state.cat);
      body.replaceChildren(st);
      const more = findMore();
      if (more) body.append(more);
      hydrate(root);
      return;
    }
    const groups = [];
    for (const c of CAT_ORDER) {
      const inCat = shown.filter((x) => x.p.category === c);
      if (!inCat.length) continue;
      const g = clone('tpl-group');
      setIcon(g.querySelector('[data-icon]'), CAT_ICON[c]);
      fill(g, { title: CAT_LABEL[c] });
      g.querySelector('.rows').replaceChildren(...inCat.map((x) => row(x.p, x.w)));
      groups.push(g);
    }
    const more = findMore();
    body.replaceChildren(...groups, ...(more ? [more] : []));
    hydrate(root);
  }
  // A store's change redraws the list when it is shown, and checks the place open in the dialog.
  function watch(key) {
    stores[key].subscribe(() => {
      if (!shownWheres().includes(key)) return; // a change to a store not being looked at needs no redraw
      if (state.loaded) render();
      checkConflict();
    });
  }
  for (const key of Object.keys(stores)) watch(key);
  // Beside the map: a store for one of the viewer's spaces, reached with { space }.
  function addSpaceStore(id) {
    const key = `in:${id}`;
    if (stores[key]) return stores[key];
    stores[key] = createPlaces(host, { scope: 'space', space: id });
    watch(key);
    return stores[key];
  }

  $('filter').addEventListener('input', () => { state.filter = $('filter').value; render(); });

  // Beside the map: mark the selected place (the map's or this list's), and bring it into view when the map picked it.
  function markSelected(scroll) {
    let found = null;
    for (const el of $('body').querySelectorAll('.place-row')) {
      const on = rowKey(el.dataset.where, el.dataset.id) === state.selected;
      el.classList.toggle('selected', on);
      if (on) found = el;
    }
    if (found && scroll) found.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }
  // Select a place from the list: the page tells the map, which flies to it.
  let told = null; // the selection last told to the page or heard from it (an object key, '' for none)
  function selectPlace(w, id) {
    state.selected = w && id ? rowKey(w, id) : '';
    markSelected(false);
    if (!host.destination) return;
    const ref = w && id ? placeRef(w, id) : null;
    told = ref ? host.util.objectKey(ref) : '';
    host.destination.set({ selected: ref }).catch(() => {});
  }

  // --- the place menu -----------------------------------------------------------------------------------------------

  function openLinkFor(p) {
    if (p.point) return geo.mapsLink(p.point.lat, p.point.lng, p.title, apple);
    return geo.mapsSearch(p.address || p.title, apple);
  }
  // Delete armed by id, cleared a few seconds after arming so a stray later click cannot delete unarmed.
  const armedDelete = new Set();
  // A copy of a place into another store: the original stays where it is.
  async function copyTo(target, p, done) {
    try {
      await stores[target].save({ ...p, id: '', ref: null, by: info.user.key, owners: [info.user.key] });
      say(done);
      setTimeout(() => say(''), 2500);
    } catch (err) { say('It could not be copied: ' + ((err && err.message) || err)); }
  }
  function openMenu(w, id, button) {
    const p = placeAt(w, id);
    if (!p) return;
    const canShare = canEdit && personal && inSpace && (view === 'my' || view === 'space'); // copy between mine and this space: the original stays where it is
    const items = [
      { id: 'edit', label: writable(w) ? 'Edit' : 'View', icon: 'pen', onClick: () => openEditor(w, id) },
    ];
    // Beside the map the copies name where they go: a shared place to Mine, one of Mine to a space the viewer may add to.
    if (asPart && w !== 'my' && writable('my')) items.push({ id: 'share', label: 'Save to mine', icon: 'share-nodes', onClick: () => copyTo('my', p, 'Saved to your places.') });
    if (asPart && w === 'my' && personal) {
      for (const r of [...spaceInfo.values()].filter((s) => s.write === true).slice(0, 8)) {
        items.push({ id: `share-${r.id}`, label: `Share to ${r.name}`, icon: 'share-nodes', onClick: () => copyTo(`in:${r.id}`, p, `Shared to ${r.name}.`) });
      }
    }
    if (canShare) {
      items.push({
        id: 'share',
        label: view === 'my' ? `Share to this ${word('space')}` : 'Save to mine',
        icon: 'share-nodes',
        onClick: () => copyTo(view === 'my' ? 'space' : 'my', p, view === 'my' ? `Shared to this ${word('space')}.` : 'Saved to your places.'),
      });
    }
    items.push({ id: 'open-in-maps', label: 'Open in my maps app', icon: 'arrow-up-right-from-square', href: openLinkFor(p) });
    if (p.point) {
      items.push({
        id: 'copy-coords',
        label: 'Copy coordinates',
        icon: 'copy',
        onClick: async () => {
          try { await navigator.clipboard.writeText(geo.coordsText(p.point.lat, p.point.lng)); say('Coordinates copied.'); setTimeout(() => say(''), 2000); } catch (err) { say('Copy them from the place: ' + geo.coordsText(p.point.lat, p.point.lng)); }
        },
      });
    }
    if (writable(w)) {
      items.push({
        id: 'delete',
        label: 'Delete',
        icon: 'trash',
        danger: true,
        onClick: (item, b) => {
          if (!armedDelete.has(id)) {
            armedDelete.add(id);
            const label = b.querySelector('.sdk-menu-label');
            if (label) label.textContent = 'Delete it?';
            setTimeout(() => armedDelete.delete(id), 4000);
            return false;
          }
          armedDelete.delete(id);
          stores[w].remove(id).catch((err) => say('It could not be deleted: ' + ((err && err.message) || err)));
        },
      });
    }
    host.menu.show({ id: `place-${id}`, anchor: button, items });
  }

  // --- the dialog for one place -------------------------------------------------------------------------------------

  const FIELD_WRAPPERS = () => [...$('form').children].filter((n) => !['editor-title', 'f-where-wrap', 'f-readonly', 'f-links-out', 'f-used-by', 'f-by', 'f-error'].includes(n.id) && !n.classList.contains('editor-buttons') && !n.classList.contains('readonly') && !n.classList.contains('conflict-bar'));

  // --- where a new place goes (beside the map) ------------------------------------------------------------------------
  // It always asks: Mine, everyone's, then the spaces where the viewer may add places, starting empty whatever the filter
  // shows or was picked last; Save says to pick first. A place that exists stays where it is: Where shows it, unchangeable.
  // The prompt names what is offered: "Pick a <space>, or Mine", "Pick a <space>", or "Pick where it goes" for Mine alone.
  const pickWhere = () => {
    const offered = whereOptions();
    const mine = offered.some((o) => o.w === 'my');
    const others = offered.some((o) => o.w !== 'my');
    if (mine && others) return `Pick ${word('space', { a: true })}, or Mine`;
    return others ? `Pick ${word('space', { a: true })}` : 'Pick where it goes';
  };
  // Beside the map: a new place asks (for those who may add one); a place that exists shows where it is, unchangeable,
  // whether the viewer may change it or not.
  function fillWhere(w, editable) {
    const wrap = $('f-where-wrap');
    const select = $('f-where');
    const shown = asPart && (Boolean(w) || editable);
    hide(wrap, !shown);
    wrap.hidden = !shown;
    if (!shown) return;
    const option = (value, label, o) => {
      const el = document.createElement('option');
      el.value = value;
      el.textContent = label;
      if (o && o.disabled) el.disabled = true;
      return el;
    };
    if (w) {
      select.replaceChildren(option('', whereName(w)));
      select.disabled = true;
      return;
    }
    select.replaceChildren(option('', pickWhere(), { disabled: true }), ...whereOptions().map((o) => option(o.w, o.label)));
    select.value = '';
    select.disabled = false;
  }
  $('f-where').addEventListener('change', () => editorError(''));

  function fillOwners(selected) {
    const box = $('f-owners');
    box.replaceChildren(...state.people.map((person) => {
      const label = document.createElement('label');
      label.className = 'check';
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = person.key;
      input.checked = selected.includes(person.key);
      label.append(input, document.createTextNode(' ' + person.name));
      return label;
    }));
  }
  const ownersChosen = () => [...$('f-owners').querySelectorAll('input:checked')].map((i) => i.value);

  // The position field: a pair of coordinates or a map link. Empty means no position.
  function readPoint() {
    const text = $('f-point').value.trim();
    const e = state.editing;
    if (!text) { e.point = null; e.pointOk = true; $('f-point-note').textContent = ''; return; }
    const pt = geo.parsePoint(text);
    e.point = pt;
    e.pointOk = Boolean(pt);
    $('f-point-note').textContent = pt ? 'Coordinates found.' : 'No coordinates in that.';
  }
  $('f-point').addEventListener('input', readPoint);

  const editorError = (text) => { $('f-error').textContent = text; $('f-error').hidden = !text; };
  const dropConflict = () => { for (const n of $('form').querySelectorAll('.conflict-bar')) n.remove(); if (state.editing) state.editing.conflict = null; };

  // Show a place in the dialog: a new one (`id` null, `seed` its start), or an existing one in the store `where`.
  function openEditor(where, id, seed) {
    const w = id ? where || view : null;
    const p = id ? placeAt(w, id) : null;
    if (id && !p) return;
    if (!id && asPart && !canAdd()) return;
    state.editing = { where: w, id: id || null, version: p ? stores[w].versionOf(id) : undefined, point: p ? p.point : (seed && seed.point) || null, pointOk: true, conflict: null, origin: (seed && seed.origin) || '' };
    dropConflict();
    for (const n of $('form').querySelectorAll('.readonly')) n.remove();
    const shown = p || { title: (seed && seed.title) || '', category: 'other', address: (seed && seed.address) || '', point: (seed && seed.point) || null, notes: (seed && seed.notes) || '', owners: [], by: '', ref: null };
    const editable = id ? writable(w) : asPart || canEdit;
    $('editor-title').textContent = id ? (editable ? 'Change this place' : shown.title) : 'Add a place';
    fillWhere(w, editable);
    // Read only where the viewer may not change places: beside the map, say why (it differs from one place to the next).
    const why = asPart && id && !editable ? `Only people who can add places ${w === 'global' ? `for everyone in this ${word('environment')}` : `in ${whereName(w)}`} can change this.` : '';
    $('f-readonly').textContent = why;
    hide($('f-readonly'), !why);
    for (const el of FIELD_WRAPPERS()) el.hidden = !editable;
    if (editable) {
      $('f-title').value = shown.title;
      $('f-category').value = shown.category;
      $('f-address').value = shown.address;
      $('f-point').value = shown.point ? geo.coordsText(shown.point.lat, shown.point.lng) : '';
      $('f-point-note').textContent = '';
      $('f-notes').value = shown.notes;
      fillOwners(id ? shown.owners : [info.user.key]);
    } else {
      const ro = clone('tpl-readonly');
      fill(ro, { category: CAT_LABEL[shown.category], address: shown.address || 'None', point: shown.point ? geo.coordsText(shown.point.lat, shown.point.lng) : 'None yet', owners: shown.owners.map(nameOf).filter(Boolean).join(', ') || 'Nobody in particular', notes: shown.notes });
      $('editor-title').after(ro);
    }
    // Where it is, and what uses it.
    hide($('f-links-out'), !id);
    if (id) $('f-open-in-maps').href = openLinkFor(shown);
    const used = (id && state.links.get(rowKey(w, id))) || [];
    hide($('f-used-by'), !used.length);
    $('f-used-by-links').replaceChildren(...used.map(linkPill));
    $('f-by').textContent = shown.by ? `Last changed by ${nameOf(shown.by) || 'someone'}` : '';
    editorError('');
    hide($('f-save'), !editable);
    hide($('f-delete'), !id || !editable);
    $('f-delete').textContent = 'Delete';
    $('f-cancel').textContent = editable ? 'Close' : 'Close';
    state.armed = null;
    hide($('editor'), false);
    hydrate($('editor'));
    if (editable) $(!id && asPart ? 'f-where' : 'f-title').focus();
    else $('f-cancel').focus();
  }
  function closeEditor() {
    hide($('editor'), true);
    state.editing = null;
  }

  // Someone else changed the place that is open: say so, and offer their version or keeping mine.
  function checkConflict() {
    const e = state.editing;
    if (!e || !e.id || !writable(e.where) || e.conflict) return;
    const store = stores[e.where];
    const now = store.versionOf(e.id);
    if (!store.get(e.id)) { closeEditor(); return; }
    if (now === e.version) return;
    showConflict(store.get(e.id), now);
  }
  function showConflict(theirs, version) {
    const e = state.editing;
    if (!e) return;
    dropConflict();
    e.conflict = { theirs, version };
    const bar = clone('tpl-conflict');
    fill(bar, { text: 'Someone changed this place while you were editing.' });
    $('form').querySelector('.editor-buttons').before(bar);
    editorError('');
  }
  $('form').addEventListener('click', (ev) => {
    const b = ev.target.closest('[data-action]');
    const e = state.editing;
    if (!b || !e || !e.conflict) return;
    if (b.dataset.action === 'use-theirs') {
      const id = e.id;
      dropConflict();
      openEditor(e.where, id);
    } else if (b.dataset.action === 'keep-mine') {
      e.version = e.conflict.version;
      dropConflict();
    }
  });

  $('form').addEventListener('submit', async (ev) => {
    ev.preventDefault();
    const e = state.editing;
    if (!e || !(e.id ? writable(e.where) : asPart ? canAdd() : canEdit)) return;
    // A new place beside the map goes where it was told to, and nowhere until then.
    let w = e.where;
    if (!e.id) {
      w = asPart ? $('f-where').value : view;
      if (asPart && !whereOptions().some((o) => o.w === w)) return editorError('Pick where it goes first.');
    }
    const store = stores[w];
    const title = geo.oneLine($('f-title').value, 120);
    if (!title) return editorError('Give the place a name.');
    readPoint();
    if (!e.pointOk) return editorError('The position is not coordinates or a map link. Leave it empty, or paste one.');
    if (e.conflict) return editorError('Choose Use theirs or Keep mine first.');
    const base = e.id ? store.get(e.id) : null;
    const place = {
      id: e.id || '',
      title,
      category: CAT_ORDER.includes($('f-category').value) ? $('f-category').value : 'other',
      address: geo.oneLine($('f-address').value, 200),
      point: e.point,
      notes: $('f-notes').value,
      owners: ownersChosen(),
      by: info.user.key,
      ref: base ? base.ref : null,
    };
    $('f-save').disabled = true;
    try {
      const saved = await store.save(place, e.id ? e.version : undefined);
      if (e.origin) markUsed(e.origin);
      closeEditor();
      // Beside the map a new place with a position is selected, so the map shows it.
      if (asPart && !e.id && saved && saved.point) {
        if (e.origin) closeFound();
        if (!shownWheres().includes(w)) say(`Saved in ${whereName(w)}, which is not shown now.`);
        selectPlace(w, saved.id);
      }
    } catch (err) {
      if (err && err.status === 409) {
        const cur = e.id ? store.get(e.id) : null;
        if (cur) showConflict(cur, store.versionOf(e.id));
        else editorError('That place was removed by someone else.');
      } else editorError('It could not be saved: ' + ((err && err.message) || err));
    } finally {
      $('f-save').disabled = false;
    }
  });
  $('f-cancel').addEventListener('click', closeEditor);
  $('f-delete').addEventListener('click', async () => {
    const e = state.editing;
    if (!e || !e.id) return;
    if (state.armed !== 'editor') { state.armed = 'editor'; $('f-delete').textContent = 'Delete it?'; return; }
    state.armed = null;
    try { await stores[e.where].remove(e.id); closeEditor(); } catch (err) { editorError('It could not be deleted: ' + ((err && err.message) || err)); }
  });
  // --- clicks on the page -------------------------------------------------------------------------------------------

  root.addEventListener('click', async (ev) => {
    const t = ev.target.closest('[data-action]');
    const rowEl = ev.target.closest('.place-row');
    if (t && t.dataset.action === 'menu' && rowEl) {
      ev.stopPropagation();
      return openMenu(rowEl.dataset.where, rowEl.dataset.id, t);
    }
    if (t && t.dataset.action === 'add-place') return openEditor(null, null);
    if (t && t.dataset.action === 'find-new') return void (state.q && showFound(state.q, sharedSearch(state.q)));
    if (t && t.dataset.action === 'clear-filter') { if (!asPart) { state.filter = ''; $('filter').value = ''; } state.cat = ''; return render(); }
    const chip = ev.target.closest('.chip');
    if (chip) { state.cat = chip.dataset.cat === state.cat ? '' : chip.dataset.cat; return render(); }
    if (rowEl && !ev.target.closest('.item-menu')) {
      const w = rowEl.dataset.where;
      const p = placeAt(w, rowEl.dataset.id);
      // Beside the map a place with a position is selected, and the map beside flies to it; one with none opens.
      if (asPart) {
        if (p && p.point) return selectPlace(w, p.id);
        return openEditor(w, rowEl.dataset.id);
      }
      // In a space, a click on a place with a position shows it on the map when something offers that; otherwise it opens
      // the place. (On the environment page that would wait for a map page that is not open.)
      if (p && p.point && showAction && inSpace) return void host.actions.request(showAction.action, { ref: placeRef(w, p.id) }).catch(() => openEditor(w, p.id));
      openEditor(w, rowEl.dataset.id);
    }
  });
  // A place can be dragged out to another module (onto a day of a plan, or a task that links to it): press its row and move.
  // The pointer is the place's in the view it is shown in. A click after the drag is swallowed by the SDK.
  if (host.objects && host.objects.draggable) {
    host.objects.draggable(root, (target) => {
      const row = target.closest && target.closest('.place-row');
      if (!row || !row.dataset.id || target.closest('.item-menu, button, a')) return null;
      const p = placeAt(row.dataset.where, row.dataset.id);
      return p ? { kind: 'place', id: p.id, label: p.title, ...whereOpts(row.dataset.where) } : null;
    });
  }
  // Something from another module dropped here: what can be done with it is the shared decision (host.objects.dropMenu).
  // This module's own offer, when the object has a position, is to save it as a place: the editor opens seeded from it,
  // so the person finishes it rather than a copy landing unseen. The modules around add theirs.
  if (host.objects && host.objects.dropTarget) {
    const showDrop = (yes) => $('app').classList.toggle('drop-target', yes);
    const foreign = (ref, dragged) => (ref ? ref.module !== info.module.id : Boolean(dragged && dragged.summary));
    host.objects.dropTarget({
      over: (_pt, ref, dragged) => showDrop(canAdd() && foreign(ref, dragged)),
      leave: () => showDrop(false),
      drop: async (ref, pt, dragged) => {
        showDrop(false);
        if (!canAdd() || !foreign(ref, dragged)) return;
        try {
          const chosen = await host.objects.dropMenu(dragged, pt, {
            context: {},
            own: [{
              id: 'save',
              label: 'Save it as a place',
              run: (ctx) => openEditor(null, null, { title: ctx.summary.title || '', point: ctx.summary.place ? { lat: ctx.summary.place.lat, lng: ctx.summary.place.lng } : null, address: ctx.summary.place && ctx.summary.place.name && ctx.summary.place.name !== ctx.summary.title ? ctx.summary.place.name : '' }),
              // Only offered for an object that is somewhere: the shared menu drops an own offer whose `when` says no.
              when: (ctx) => Boolean(ctx.summary.place),
            }],
            remember: 'pane',
          });
          if (chosen && chosen.id !== 'save') say(`${chosen.label}: done`);
        } catch (err) { say((err && err.message) || String(err)); }
      },
    });
  }
  root.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      if (!$('editor').hidden) closeEditor(); else if (!$('found').hidden) closeFound();
    } else if (ev.key === 'Enter' && ev.target.classList && ev.target.classList.contains('place-row')) {
      ev.target.click();
    }
  });

  // --- adding: the bottom bar, and what other modules and pointers ask ----------------------------------------------

  // --- find a place (only when the admin set a search address) -----------------------------------------------------

  let searchToken = 0;
  let hits = [];
  // Ask the server to search for places by name: [{ key, title, sub, lat, lng, from }], or an Error. The server looks in the
  // places it has saved first and asks the outside service only for what is missing.
  async function searchFor(q, near) {
    if (!state.search) throw new Error('search is not configured');
    const out = await host.geocode.search(q, near || null);
    if (out.credit) state.searchCredit = out.credit;
    return (out.results || []).slice(0, 6);
  }
  const closeFound = () => { searchToken += 1; hits = []; hide($('found'), true); $('found').replaceChildren(); };
  function foundHead(label, query, closable) {
    const h = clone('tpl-found-head');
    fill(h, { label, query: '\u201c' + query + '\u201d' });
    hide(h.querySelector('.found-close'), !closable);
    return h;
  }
  // Beside the map one search serves the list and the map beside it: the map asks (searchPlaces, near its centre) when the
  // page's search is entered, and the list shows the same answer. Kept a little while, by its text.
  const searches = new Map(); // lower-cased text -> { at, promise }
  const FRESH = 15000;
  function sharedSearch(q, near) {
    const key = q.toLowerCase();
    const known = searches.get(key);
    if (known && Date.now() - known.at < FRESH) return known.promise;
    const promise = searchFor(q, near);
    promise.catch(() => {});
    searches.set(key, { at: Date.now(), promise });
    for (const [k, v] of searches) if (Date.now() - v.at >= FRESH) searches.delete(k);
    return promise;
  }
  const searching = (query) => {
    const box = $('found');
    box.replaceChildren(foundHead('Searching for', query, false), clone('tpl-found-searching'));
    hide(box, false);
  };
  // Enter in the page's search, beside the map: wait a moment for the map's own search (which knows where the map is), and
  // search here if it does not come.
  let findToken = 0;
  function partFind(text) {
    const token = ++findToken;
    searchToken += 1;
    searching(text);
    const started = Date.now();
    const look = () => {
      if (token !== findToken || state.q !== text) return;
      const known = searches.get(text.toLowerCase());
      if (known && Date.now() - known.at < FRESH) return void showFound(text, known.promise);
      if (Date.now() - started >= 1500) return void showFound(text, sharedSearch(text));
      setTimeout(look, 100);
    };
    look();
  }
  const find = (query) => showFound(query, searchFor(query));
  async function showFound(query, promise) {
    const mine = ++searchToken;
    searching(query);
    const box = $('found');
    let found;
    try {
      found = await promise;
    } catch (err) {
      if (mine !== searchToken) return;
      const st = clone('tpl-found-state');
      fill(st, { text: 'Search is not available right now.' });
      box.replaceChildren(foundHead('Results for', query, true), st);
      return;
    }
    if (mine !== searchToken) return;
    hits = found;
    if (!found.length) {
      const st = clone('tpl-found-state');
      fill(st, { text: 'Nothing found. Try a fuller name, or paste coordinates or a map link.' });
      box.replaceChildren(foundHead('Results for', query, true), st);
      return;
    }
    const rows = document.createElement('div');
    rows.className = 'found-rows';
    found.forEach((h, i) => {
      const r = clone('tpl-found-row');
      r.dataset.i = String(i);
      fill(r, { title: h.title, address: h.sub, source: h.from || '' });
      hide(r.querySelector('[data-action="save-found"]'), !canAdd());
      rows.append(r);
    });
    const parts = [foundHead('Results for', query, true), rows];
    if (state.searchCredit) { const c = document.createElement('p'); c.className = 'found-credit'; c.textContent = state.searchCredit; parts.push(c); }
    box.replaceChildren(...parts);
    hydrate(box);
  }
  // A picked result is marked used on the server, which keeps it from being purged. Nothing depends on it, so a failure is ignored.
  const markUsed = (key) => { if (key && host.geocode) host.geocode.used(key).catch(() => {}); };
  // A result saved as a place: its name, address and position (the category is left for the person to set).
  // Beside the map it opens the dialog with the result filled in, so it asks where the place goes.
  async function saveFound(i) {
    const h = hits[i];
    if (!h || !canAdd()) return;
    if (asPart) return openEditor(null, null, { title: h.title, address: h.sub, point: { lat: h.lat, lng: h.lng }, origin: h.key });
    try {
      await stores[view].save({ id: '', title: h.title, category: 'other', address: h.sub, point: { lat: h.lat, lng: h.lng }, notes: '', owners: [info.user.key], by: info.user.key, ref: null });
      markUsed(h.key);
      closeFound();
    } catch (err) {
      say('It could not be saved: ' + ((err && err.message) || err));
    }
  }
  $('found').addEventListener('click', (ev) => {
    const row = ev.target.closest('.found-row');
    if (ev.target.closest('[data-action="close-found"]')) return closeFound();
    if (row) saveFound(Number(row.dataset.i));
  });
  $('found').addEventListener('keydown', (ev) => {
    const row = ev.target.closest && ev.target.closest('.found-row');
    if (!row) return;
    if (ev.key === 'Enter') { ev.preventDefault(); saveFound(Number(row.dataset.i)); }
    else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      const next = ev.key === 'ArrowDown' ? row.nextElementSibling : row.previousElementSibling;
      if (next) next.focus();
    }
  });

  // Beside the map there is no bar: the page's search field and Add a place at the top of the list do these.
  if (host.bar && !asPart) {
    host.bar.set(canEdit ? [{ id: 'add', type: 'quickadd', label: 'Add a place', placeholder: 'Add a place: name, or paste coordinates or a map link' }] : []).catch(() => {});
    host.on('bar', (e) => {
      if (e.id !== 'add' || !canEdit) return;
      if (!e.value) return openEditor(null, null);
      const entry = readEntry(e.value);
      // A name, with a search address set, looks for the place; anything with coordinates or a link (or no search) opens the dialog.
      if (entry.find && state.search) return void find(entry.title);
      closeFound();
      openEditor(null, null, entry);
    });
  }

  // What other modules may ask of this page, for the person who asked (a view, so only their own page does it): look for a
  // place by name, and open the dialog for a new one where a map was clicked.
  if (host.actions && host.actions.provide) {
    host.actions.provide({
      searchPlaces: async (input) => {
        const q = geo.oneLine(input && input.q, 200);
        if (q.length < 2) throw new Error('nothing to look for');
        const near = input && input.lat !== undefined ? { lat: input.lat, lon: input.lon } : null;
        if (!asPart) return { data: { results: await searchFor(q, near) } };
        // Beside the map: the map beside searching for what was entered in the page's search. The list shows it too.
        const promise = sharedSearch(q, near);
        if (q === state.q) { findToken += 1; showFound(q, promise); }
        return { data: { results: await promise } };
      },
      newPlace: async (input) => {
        if (!canAdd()) throw new Error('you may not add places here');
        const i = input || {};
        const has = (x) => x !== undefined && x !== null && x !== '';
        const point = has(i.lat) && has(i.lng) && geo.inRange(Number(i.lat), Number(i.lng)) ? { lat: geo.round6(Number(i.lat)), lng: geo.round6(Number(i.lng)) } : null;
        closeFound();
        openEditor(null, null, { title: geo.oneLine(i.title, 120), point, address: geo.oneLine(i.address, 200), notes: String(i.notes || '').slice(0, 1000), origin: geo.oneLine(i.origin, 60) });
        return {};
      },
    });
  }

  if (inSpace) stores.space.provide(info.user.key); // other modules' requests to add a place go to the space's list
  if (host.objects && host.objects.onOpen) {
    host.objects.onOpen((ref) => {
      if (ref.module !== info.module.id || ref.kind !== 'place') return;
      const w = whereOfRef(ref);
      if (!w) return;
      // On the environment page, a place in the other view (Mine or everyone's) switches to it first.
      const show = () => {
        if (!asPart && w !== view && allowed[w]) { showView(w); ensureLoaded(w).then(() => openEditor(w, ref.id)).catch(() => {}); return; }
        if (asPart && placeAt(w, ref.id)) selectPlace(w, ref.id);
        openEditor(w, ref.id);
      };
      if (state.loaded) show(); else state.openWanted = show;
    });
  }

  // --- start --------------------------------------------------------------------------------------------------------

  // Whose places: the person's own need a signed-in person (a guest has no profile), and so does everyone's (an environment-wide store).
  const VIEW_NOTES = { my: `Only you see these. They follow you into every ${word('space')}.`, global: `Everyone in this ${word('environment')} sees these, and anyone who can edit can change them.` };
  const allowed = { my: personal, space: inSpace, global: personal };
  const VIEW_OPTIONS = [
    { id: 'my', label: 'Mine', icon: 'user' },
    { id: 'space', label: `This ${word('space')}`, icon: 'users' },
    { id: 'global', label: everyoneName(), icon: 'globe' },
  ].filter((o) => allowed[o.id]);
  const viewSwitch = !asPart && VIEW_OPTIONS.length > 1 ? host.ui.viewSwitch({ id: 'whose', options: VIEW_OPTIONS, value: view, onChange: showView }) : null;
  function showView(next) {
    if (!allowed[next]) next = inSpace ? 'space' : 'my';
    view = next;
    try { localStorage.setItem('places-view', view); } catch (err) { /* not remembered */ }
    viewSwitch?.set(view);
    const note = root.querySelector('[data-slot="view-note"]');
    fill(note, { text: VIEW_NOTES[view] || '' });
    hide(note, !VIEW_NOTES[view]);
    state.links = new Map();
    asked.clear();
    host.menu.close();
    closeFound();
    closeEditor();
    render();
    ensureLoaded(view).then(() => { if (view === next) { render(); loadLinks().catch(() => {}); } }).catch((err) => say('These places could not load: ' + err.message));
  }
  try { const last = localStorage.getItem('places-view'); if (!asPart && allowed[last] && (last !== 'space' || inSpace)) view = last; } catch (err) { /* the default */ }
  if (!asPart && (view !== 'space' || !inSpace)) {
    viewSwitch?.set(view);
    fill(root.querySelector('[data-slot="view-note"]'), { text: VIEW_NOTES[view] || '' });
    hide(root.querySelector('[data-slot="view-note"]'), !VIEW_NOTES[view]);
  }
  // --- as the Map destination's list --------------------------------------------------------------------------------
  // The page owns the filter (Mine, the environment's own, which spaces) and the search field and hands them over
  // (host.destination.onState): typing filters the list, Enter (`find` raised) searches for new places. The selection is
  // shared with the map, either may set it.
  let lastFind = null;
  function takeState(st) {
    if (!st || typeof st !== 'object') return;
    state.dest = { mine: st.mine !== false, environment: st.environment !== false, spaces: Array.isArray(st.spaces) ? new Set(st.spaces.map(String)) : null };
    const text = typeof st.q === 'string' ? st.q.trim() : '';
    const entry = text ? readEntry(text) : null;
    state.q = text;
    state.filter = entry && entry.point ? '' : text; // a pasted position starts a new place (the map asks), it filters nothing
    if (!text) { findToken += 1; closeFound(); }
    const find = Number(st.find) || 0;
    if (lastFind === null) lastFind = find; // what the page held when this part came: nothing asked yet
    else if (find !== lastFind) {
      lastFind = find;
      if (entry && entry.find && state.search) partFind(text);
    }
    const ref = st.selected && typeof st.selected === 'object' ? st.selected : null;
    const sel = ref ? host.util.objectKey(ref) : '';
    const picked = sel !== told; // the map picked another (or none): bring the place into view in the list
    if (picked) {
      told = sel;
      const w = ref && ref.module === info.module.id && ref.kind === 'place' ? whereOfRef(ref) : null;
      state.selected = w ? rowKey(w, ref.id) : '';
    }
    if (!state.loaded) return;
    render();
    if (picked) markSelected(true);
    loadLinks().catch(() => {});
  }
  // Every space the viewer reads places in, and their places, in one request (each item with its space).
  async function loadSpaces() {
    for (const r of await host.spaces()) { spaceInfo.set(r.id, r); addSpaceStore(r.id); }
    const bySpace = new Map();
    for (const it of await host.storage.list('place:', { scope: 'spaces' })) {
      if (!bySpace.has(it.spaceId)) bySpace.set(it.spaceId, []);
      bySpace.get(it.spaceId).push(it);
    }
    for (const id of spaceInfo.keys()) { stores[`in:${id}`].seed(bySpace.get(id) || []); loadedStores.add(`in:${id}`); }
  }
  if (asPart) {
    $('app').classList.add('part');
    $('body').before($('found')); // the results show at the top of the list, not over its foot
    hide(root.querySelector('[data-slot="view-note"]'), true);
    if (host.destination) host.destination.onState(takeState);
  }

  $('msg').hidden = true;
  $('app').hidden = false;
  render();
  try {
    if (asPart) {
      await Promise.all([personal ? ensureLoaded('my') : null, ensureLoaded('global').catch(() => {}), loadSpaces().catch(() => {})]);
    } else await ensureLoaded(view);
    state.people = await host.people().catch(() => []);
    const useSearch = (v) => { state.search = searchOn(v); state.searchCredit = ''; if (!state.search) closeFound(); };
    try { useSearch(await host.settings.get()); } catch (err) { useSearch(null); }
    host.settings.onChange((v) => useSearch(v));
    await Promise.all([...new Set([...root.querySelectorAll('[data-icon]'), ...[...root.querySelectorAll('template')].flatMap((t) => [...t.content.querySelectorAll('[data-icon]')])].map((n) => n.dataset.icon).concat(Object.values(CAT_ICON), ['layer-group', 'link']))].filter(Boolean).map(wantIcon));
    findShowAction();
    state.loaded = true;
    render();
    loadLinks().catch(() => {});
    if (state.openWanted) { const f = state.openWanted; state.openWanted = null; f(); }
  } catch (err) {
    $('app').hidden = true;
    $('msg').hidden = false;
    $('msg').textContent = 'The places could not load: ' + err.message;
  }
})();
