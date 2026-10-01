// Who is here: the space bar's middle zone shows everyone in this space right now (you among them), as a short row of
// overlapping portraits and a count, with a camera mark on those on the call. Clicking it (or Enter or Space) opens the
// list under it: each person's portrait and name, "(you)", and "on the call". In an aside it shows the aside's people.
//
// The source is the call itself (the page's LiveKit connection, open while it is in a space: everyone in a space is
// connected, `call: 'off'` until they join): the local participant and the remote ones, never a hidden one (an OBS
// view). Kept live by the call's events; space.js registers it in the bar and calls refresh() when its own call state
// changes (a join, a hang-up, entering and leaving).
//
// It gives way before anything in the bar folds: nav-bar.js calls the tool's `fit(avail)` with the width the middle
// zone may take, and the row drops portraits, then shows only the count (`facesThatFit`, pure, for check-nav). On a
// phone it is a compact count in the tab bar, between the module tabs and Leave (style.css).
//
// The list is the same popover pattern as the Modules chooser beside it: by its button (under it, or above it in a
// tab bar at the window's bottom, kept inside the window, place()), open until the button,
// Escape, a click elsewhere or focus leaving closes it; the keyboard goes to the list when opened from the keyboard and
// back to the button on Escape. Nothing here reads the page's globals: space.js hands in what it needs.

export const MAX_FACES = 4;

// How many portraits fit in `avail` px (the width available). `base` is the tool's width with no portraits (its
// padding and its count), `first` what the first portrait adds (itself and the gap after it), `step` what each further,
// overlapping one adds, and `plus` what the "+N" adds when some are left out. Everyone fits up to `max`; when not even
// one portrait fits, 0: the count alone, the smallest it gets (and what it stays at when even that does not fit: the
// bar folds its right zone then).
export function facesThatFit({ avail, count, base = 0, first = 0, step = 0, plus = 0, max = MAX_FACES }) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  const limit = Number.isFinite(avail) ? avail : Infinity;
  const width = (k) => base + first + (k - 1) * step + (k < n ? plus : 0);
  for (let k = Math.min(max, n); k > 0; k -= 1) if (width(k) <= limit + 0.5) return k;
  return 0;
}

// The people on the connection, you first, then by name: { key, name, you, onCall }. Hidden participants (OBS views)
// are left out. `meOnCall` is the page's own say (it knows before the call echoes the attribute); anyone else is on
// the call when their `call` attribute is not off, the same test as the conference's "Not in a call" list.
export function peopleIn(call, { meOnCall = false } = {}) {
  if (!call) return [];
  const out = [];
  const lp = call.localParticipant;
  if (lp && lp.identity) out.push({ key: lp.identity, name: lp.name || lp.identity, you: true, onCall: Boolean(meOnCall) });
  const others = [];
  for (const p of call.remoteParticipants?.values?.() || []) {
    if (!p || !p.identity || p.permissions?.hidden) continue;
    others.push({ key: p.identity, name: p.name || p.identity, you: false, onCall: p.attributes?.call !== 'off' });
  }
  others.sort((a, b) => a.name.localeCompare(b.name));
  return out.concat(others);
}

// What the button says to a screen reader and as its tooltip, and what it shows.
export function hereWords(people, where) {
  const n = people.length;
  const calling = people.filter((p) => p.onCall).length;
  const shown = n <= 1 ? 'Just you' : `${n} here`;
  const said = `${n <= 1 ? 'Just you' : `${n} people`} in this ${where}${calling ? `, ${calling} on the call` : ''}`;
  return { shown, said };
}

// The tool. `call` is the call (the page's LiveKit Room); `meOnCall()` whether I am on the call; `where()` the
// environment's word for where I am ("space", or "aside" in one); `portraitUrl(key)` and `profileUrl(key)` the
// pictures to try, in order, before the first letter; `wanted()` whether it shows at all (in a space and connected);
// `events.redraw()` draws the bar again, and `events.call` more of the call's events to refresh on.
export function createWhoHere({ doc = document, call, events = {}, meOnCall = () => false, where = () => 'space', portraitUrl, profileUrl, wanted = () => true }) {
  const el = doc.createElement('span');
  el.className = 'who-here';
  el.innerHTML = `
    <button class="who-here-toggle" id="who-here-toggle" type="button" aria-expanded="false" aria-controls="who-here-list">
      <span class="who-here-faces" aria-hidden="true"></span><span class="who-here-more" aria-hidden="true" hidden></span><i class="fa-solid fa-user-group fa-fw who-here-icon" aria-hidden="true"></i><span class="who-here-count" aria-hidden="true"></span>
    </button>
    <section class="who-here-list" id="who-here-list" tabindex="-1" aria-labelledby="who-here-title" hidden>
      <h3 class="who-here-title" id="who-here-title"></h3>
      <ul class="who-here-people"></ul>
    </section>`;
  const toggle = el.querySelector('.who-here-toggle');
  const listEl = el.querySelector('.who-here-list');
  const faces = el.querySelector('.who-here-faces');
  const more = el.querySelector('.who-here-more');
  const countEl = el.querySelector('.who-here-count');
  let people = [];
  let shownFaces = MAX_FACES; // what fit() last allowed
  let lastAvail = Infinity;

  // A portrait: this space's picture, else the profile picture, else the first letter. One element per person and
  // place (`spot`: 'row' or 'list', so the row and the open list never share one node) and address, kept while they
  // are here: the bar measures and draws the row several times
  // a pass (fit), and a fresh <img> each time would fetch the picture again. A new element only when someone arrives
  // or their picture's address changes (another space's set); one that fell back to the letter stays the letter.
  const portraits = new Map(); // `${spot}|${key}` -> { src, node }
  function portrait(person, cls, spot) {
    const src = portraitUrl(person.key);
    const id = `${spot}|${person.key}`;
    const kept = portraits.get(id);
    if (kept && kept.src === src) return kept.node;
    const entry = { src, node: null };
    const img = doc.createElement('img');
    img.className = cls;
    img.alt = '';
    img.onerror = () => {
      if (img.dataset.fallback) {
        const letter = doc.createElement('span');
        letter.className = `${cls} who-here-initial`;
        letter.setAttribute('aria-hidden', 'true');
        letter.textContent = String(person.name || '?').trim().charAt(0).toUpperCase() || '?';
        entry.node = letter;
        img.replaceWith(letter);
        return;
      }
      img.dataset.fallback = '1';
      img.src = profileUrl(person.key);
    };
    img.src = src;
    entry.node = img;
    portraits.set(id, entry);
    return img;
  }
  // Forget the portraits of those who left, so one who comes back is tried afresh.
  function prunePortraits() {
    const here = new Set(people.map((p) => p.key));
    for (const id of portraits.keys()) if (!here.has(id.slice(id.indexOf('|') + 1))) portraits.delete(id);
  }

  function callMark() {
    const mark = doc.createElement('i');
    mark.className = 'fa-solid fa-video who-here-call';
    mark.setAttribute('aria-hidden', 'true');
    return mark;
  }

  function drawRow() {
    const k = Math.min(shownFaces, people.length);
    faces.replaceChildren(...people.slice(0, k).map((p, i) => {
      const face = doc.createElement('span');
      face.className = `who-here-face${p.you ? ' you' : ''}`;
      face.style.zIndex = String(k - i); // each overlaps the next, so you (first) are whole
      face.appendChild(portrait(p, 'who-here-img', 'row'));
      if (p.onCall) face.appendChild(callMark());
      return face;
    }));
    faces.hidden = k === 0;
    const left = people.length - k;
    more.hidden = !(k > 0 && left > 0);
    more.textContent = `+${left}`;
    el.classList.toggle('count-only', k === 0);
    const { shown, said } = hereWords(people, where());
    countEl.textContent = shown;
    toggle.setAttribute('aria-label', `${said}. Show who is here`);
    toggle.title = said;
  }

  function drawList() {
    const w = where();
    el.querySelector('.who-here-title').textContent = `In this ${w} (${people.length})`;
    el.querySelector('.who-here-people').replaceChildren(...people.map((p) => {
      const li = doc.createElement('li');
      li.className = `who-here-person${p.onCall ? ' on-call' : ''}`;
      li.appendChild(portrait(p, 'who-here-img', 'list'));
      const name = doc.createElement('span');
      name.className = 'who-here-name';
      name.textContent = p.name;
      li.appendChild(name);
      if (p.you) {
        const you = doc.createElement('span');
        you.className = 'who-here-you';
        you.textContent = '(you)';
        li.appendChild(you);
      }
      if (p.onCall) {
        const on = doc.createElement('span');
        on.className = 'who-here-oncall';
        on.appendChild(callMark());
        on.appendChild(doc.createTextNode(' on the call'));
        li.appendChild(on);
      }
      return li;
    }));
  }

  // Read the call again and draw. The bar is drawn again only when whether it shows, or its width, may have changed.
  function refresh() {
    people = wanted() ? peopleIn(call, { meOnCall: meOnCall() }) : [];
    prunePortraits();
    if (!people.length && !listEl.hidden) setOpen(false);
    drawRow();
    if (!listEl.hidden) { drawList(); place(); }
    events.redraw?.();
  }

  // --- the list ---
  // Placed in the window the header is in now (a popped-out window has its own): toward the window's inside, under the
  // button when the bar is in the top half (the space bar, the tab bar at the top of a narrow pop-out), above it when
  // in the bottom half (a phone's tab bar), centred on the button and kept inside the window's left and right edges,
  // no taller than the height it has there (the list scrolls). The numbers are the window's, turned into offsets from
  // the tool itself (the list is positioned in it).
  const EDGE = 8;
  const GAP = 6;
  const MAX_LIST = 320; // the stylesheet's own cap (max-width: min(320px, ...)), kept when the window is wide
  function place() {
    if (listEl.hidden) return;
    const d = el.ownerDocument;
    const view = d.defaultView;
    const W = d.documentElement.clientWidth || view.innerWidth;
    const H = view.innerHeight;
    const t = toggle.getBoundingClientRect();
    const up = (t.top + t.bottom) / 2 > H / 2;
    const tall = Math.max(80, Math.floor(up ? t.top - GAP - EDGE : H - t.bottom - GAP - EDGE));
    Object.assign(listEl.style, { left: '0px', top: '0px', right: 'auto', bottom: 'auto', transform: 'none', maxWidth: `${Math.max(160, Math.min(MAX_LIST, W - 2 * EDGE))}px`, maxHeight: `${tall}px` });
    const box = listEl.getBoundingClientRect();
    const x = Math.max(EDGE, Math.min(t.left + t.width / 2 - box.width / 2, W - box.width - EDGE));
    const y = up ? Math.max(EDGE, t.top - GAP - box.height) : t.bottom + GAP;
    const at = el.getBoundingClientRect();
    listEl.style.left = `${Math.round(x - at.left)}px`;
    listEl.style.top = `${Math.round(y - at.top)}px`;
  }

  let outside = null;
  function setOpen(open, { focus = false } = {}) {
    const d = el.ownerDocument; // the header moves to a popped-out window, and this with it
    listEl.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    if (outside) {
      outside.doc.removeEventListener('pointerdown', outside.fn, true);
      outside.view.removeEventListener('resize', outside.onResize);
      outside = null;
    }
    if (open) {
      drawList();
      place();
      const fn = (e) => { if (!e.composedPath().includes(el)) setOpen(false); };
      const onResize = () => place();
      d.addEventListener('pointerdown', fn, true);
      d.defaultView.addEventListener('resize', onResize);
      outside = { doc: d, view: d.defaultView, fn, onResize };
      if (focus) listEl.focus();
    } else if (focus) {
      toggle.focus();
    }
  }
  toggle.addEventListener('click', (event) => {
    // A click from the keyboard (Enter or Space) has no pointer position: the list takes focus, so it is read out.
    setOpen(listEl.hidden, { focus: event.detail === 0 });
  });
  el.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || listEl.hidden) return;
    event.stopPropagation();
    setOpen(false, { focus: true });
  });
  el.addEventListener('focusout', (event) => {
    if (!listEl.hidden && event.relatedTarget && !el.contains(event.relatedTarget)) setOpen(false);
  });

  // The width the middle zone may take (nav-bar.js calls this while it measures the bar with nothing folded): as many
  // portraits as fit, down to the count alone. Every size is measured, so the stylesheet (or a theme) may change them.
  function fit(avail) {
    lastAvail = avail;
    const count = people.length;
    shownFaces = MAX_FACES;
    if (!count || !el.isConnected || !el.getClientRects().length) { drawRow(); return; }
    const view = el.ownerDocument.defaultView;
    const gap = parseFloat(view.getComputedStyle(toggle).columnGap) || 0;
    const w = (x) => x.getBoundingClientRect().width;
    // With every portrait: the base (padding and count), one portrait, the step between overlapping ones, the "+N".
    drawRow();
    more.hidden = false;
    if (count <= MAX_FACES) more.textContent = `+${count}`;
    const k = Math.min(MAX_FACES, count);
    const facesW = w(faces);
    const faceW = w(faces.firstElementChild);
    const moreW = w(more);
    const base = w(el) - facesW - moreW - 2 * gap;
    shownFaces = facesThatFit({ avail, count, base, first: faceW + gap, step: k > 1 ? (facesW - faceW) / (k - 1) : 0, plus: moreW + gap });
    drawRow();
  }

  for (const [event, fn] of Object.entries(events.call || {})) call.on(event, fn);
  return { el, refresh, fit, close: () => setOpen(false), get avail() { return lastAvail; } };
}
