// Who is here (plan-two-zone-nav.md; the top bar's since Thomas, 2026-10-14): everyone in this space right now (you among them), as a short row of
// square portraits and who they are in a few words ("You and Alex", "You and 3 others", "5 in this space"), with a
// camera mark on those on the call. Clicking it (or Enter or Space) opens the
// list under it: each person's portrait and name, "(you)", and "on the call". In an aside it shows the aside's people.
// Its accessible name is "Who is here"; how many are here and on the call is its description (and its tooltip).
//
// The source is the live stream (space-live.js, GET /api/live): its `presence` event lists everyone in the space or the
// aside, with who is on the call, and space.js hands that list in (peopleFromPresence: you first, then by name) and calls
// refresh() when it changes, and when its own call state changes (a join, a hang-up, entering and leaving). An OBS view
// never opens the live stream, so it is never listed.
//
// It gives way before anything in the bar folds: nav-bar.js calls the tool's `fit(avail)` with the width it may take
// (fitWidth: the bar less the right zone at its full width and the Layout button), and the row gives way in steps: the names become the count ("5 in this space"), then portraits drop,
// then it shows only an icon and the short count ("5 here"; `facesThatFit`, pure, for check-nav). On a phone it is a tab
// of the tab bar, "Online" with how many are here as the count at its icon's corner (system.css, tabbar block), before
// Leave; on the call it is the bar's call item (space.js, paintCallTab).
//
// The list is the same popover pattern as the Modules chooser beside it: by its button (under it, or above it in a
// tab bar at the window's bottom, kept inside the window, place()), open until the button,
// Escape, a click elsewhere or focus leaving closes it; the keyboard goes to the list when opened from the keyboard and
// back to the button on Escape. Nothing here reads the page's globals: space.js hands in what it needs.

export const MAX_FACES = 4;

// How many portraits fit in `avail` px (the width available). `base` is the tool's width with no portraits (its
// padding and its words), `first` what the first portrait adds (itself and the gap after it), `step` what each further
// one adds, and `plus` what the "+N" adds when some are left out. Everyone fits up to `max`; when not even
// one portrait fits, 0: the count alone, the smallest it gets (and what it stays at when even that does not fit: the
// bar folds its right zone then).
export function facesThatFit({ avail, count, base = 0, first = 0, step = 0, plus = 0, max = MAX_FACES }) {
  const n = Math.max(0, Math.floor(Number(count) || 0));
  const limit = Number.isFinite(avail) ? avail : Infinity;
  const width = (k) => base + first + (k - 1) * step + (k < n ? plus : 0);
  for (let k = Math.min(max, n); k > 0; k -= 1) if (width(k) <= limit + 0.5) return k;
  return 0;
}

// What the button says to a screen reader and as its tooltip (`said`), and what it shows when only the count fits
// (`shown`, under an icon: "5 here", "Just you").
export function hereWords(people, where) {
  const n = people.length;
  const calling = people.filter((p) => p.onCall).length;
  const shown = n <= 1 ? 'Just you' : `${n} here`;
  const said = `${n <= 1 ? 'Just you' : `${n} people`} in this ${where}${calling ? `, ${calling} on the call` : ''}`;
  return { shown, said };
}

// What the row says beside the portraits, longest first; fit() takes the first that leaves room for every portrait.
// `names`: you, then the others by first name ("You and Alex", "You, Alex and Sam", "You and 3 others"); `count`: "5
// in this space" (the environment's word). Alone, both are "Just you".
const firstName = (name) => {
  const word = String(name || '').trim().split(/\s+/)[0] || '?';
  return word.length > 16 ? `${word.slice(0, 15)}\u2026` : word;
};
export function hereLabel(people, where) {
  const n = people.length;
  if (n <= 1) return { names: 'Just you', count: 'Just you' };
  const count = `${n} in this ${where}`;
  const youHere = people.some((p) => p.you);
  const first = youHere ? 'You' : firstName(people[0].name);
  const rest = people.filter((p, i) => (youHere ? !p.you : i > 0)).map((p) => firstName(p.name));
  let names;
  if (rest.length === 1) names = `${first} and ${rest[0]}`;
  else if (rest.length === 2) names = `${first}, ${rest[0]} and ${rest[1]}`;
  else names = `${first} and ${rest.length} others`;
  return { names, count };
}

// The tool. `people()` is who is here now ([{ key, name, you, onCall }], you first: space-live.js, peopleFromPresence);
// `where()` the environment's word for where I am ("space", or "aside" in one); `portraitUrl(key)` and
// `profileUrl(key)` the pictures to try, in order, before the first letter; `wanted()` whether it shows at all (in a
// space and connected); `events.redraw()` draws the bar again.
export function createWhoHere({ doc = document, people: listPeople = () => [], events = {}, where = () => 'space', portraitUrl, profileUrl, wanted = () => true }) {
  const el = doc.createElement('span');
  el.className = 'who-here';
  el.innerHTML = `
    <button class="who-here-toggle nav-text" id="who-here-toggle" type="button" aria-label="Who is here" aria-describedby="who-here-said" aria-expanded="false" aria-controls="who-here-list">
      <span class="who-here-faces sdk-avatar-stack" aria-hidden="true"></span><i class="fa-solid fa-user-group fa-fw who-here-icon" aria-hidden="true"></i><span class="who-here-count" aria-hidden="true"></span><span class="who-here-word sdk-tabbar-label" aria-hidden="true">Online</span><span class="sdk-badge-micro who-here-n" aria-hidden="true"></span><span class="visually-hidden" id="who-here-said"></span>
    </button>
    <section class="who-here-list" id="who-here-list" tabindex="-1" aria-labelledby="who-here-title" hidden>
      <h3 class="who-here-title" id="who-here-title"></h3>
      <ul class="who-here-people"></ul>
    </section>`;
  const toggle = el.querySelector('.who-here-toggle');
  const listEl = el.querySelector('.who-here-list');
  const faces = el.querySelector('.who-here-faces');
  const more = doc.createElement('span'); // the rest of the people, the stack's micro count
  more.className = 'sdk-badge-micro';
  more.setAttribute('aria-hidden', 'true');
  more.hidden = true;
  const countEl = el.querySelector('.who-here-count');
  const nEl = el.querySelector('.who-here-n'); // the phone's tab: "Online" with how many are here at the icon's corner
  let people = [];
  let shownFaces = MAX_FACES; // what fit() last allowed
  let wording = 'names'; // which of hereLabel()'s words fit() last allowed: 'names' or 'count'
  let lastAvail = Infinity;

  // A portrait: this space's picture, else the profile picture, else the first letter. One element per person and
  // place (`spot`: 'row' or 'list', so the row and the open list never share one node) and address, kept while they
  // are here: the bar measures and draws the row several times
  // a pass (fit), and a fresh <img> each time would fetch the picture again. A new element only when someone arrives
  // or their picture's address changes (another space's set); one that fell back to the letter stays the letter.
  const portraits = new Map(); // `${spot}|${key}` -> { src, node }
  function portrait(person, size, spot) {
    const src = portraitUrl(person.key);
    const id = `${spot}|${person.key}`;
    const kept = portraits.get(id);
    if (kept && kept.src === src) return kept.node;
    const entry = { src, node: null };
    const circle = doc.createElement('span');
    circle.className = `sdk-avatar sdk-avatar-${size}`;
    circle.setAttribute('aria-hidden', 'true');
    const img = doc.createElement('img');
    img.alt = '';
    img.onerror = () => {
      if (img.dataset.fallback) {
        const letter = doc.createElement('span');
        letter.className = 'sdk-avatar-ini';
        letter.textContent = String(person.name || '?').trim().charAt(0).toUpperCase() || '?';
        img.replaceWith(letter);
        return;
      }
      img.dataset.fallback = '1';
      img.src = profileUrl(person.key);
    };
    img.src = src;
    circle.append(img);
    entry.node = circle;
    portraits.set(id, entry);
    return circle;
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

  // The stylesheet may show the short count alone whatever fits (a phone's tab bar hides the portraits): then the
  // words are the short ones too.
  function cssCompact() {
    if (!el.isConnected) return false;
    return el.ownerDocument.defaultView.getComputedStyle(faces).display === 'none';
  }

  function drawRow() {
    const k = Math.min(shownFaces, people.length);
    faces.replaceChildren(...people.slice(0, k).map((p, i) => {
      const face = portrait(p, 20, 'row');
      face.classList.toggle('you', Boolean(p.you));
      face.style.zIndex = String(k - i); // a camera mark is drawn over the next portrait, not under it
      face.querySelector('.who-here-call')?.remove();
      if (p.onCall) face.appendChild(callMark());
      return face;
    }));
    faces.hidden = k === 0;
    const compact = k === 0 || cssCompact();
    const left = people.length - k;
    more.hidden = !(k > 0 && left > 0);
    more.textContent = `+${left}`;
    if (!more.hidden) faces.append(more);
    el.classList.toggle('count-only', k === 0);
    const { shown, said } = hereWords(people, where());
    countEl.textContent = compact ? shown : hereLabel(people, where())[wording];
    nEl.textContent = people.length > 9 ? '9+' : String(people.length || '');
    // Its name is "Who is here" wherever it is; how many, and how many on the call, is its description.
    const saidEl = el.querySelector('#who-here-said');
    if (saidEl.textContent !== said) saidEl.textContent = said;
    toggle.title = said;
  }

  function drawList() {
    const w = where();
    el.querySelector('.who-here-title').textContent = `In this ${w} (${people.length})`;
    el.querySelector('.who-here-people').replaceChildren(...people.map((p) => {
      const li = doc.createElement('li');
      li.className = `who-here-person${p.onCall ? ' on-call' : ''}`;
      li.appendChild(portrait(p, 24, 'list'));
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

  // Read who is here again and draw. The bar is drawn again only when whether it shows, or its width, may have changed.
  function refresh() {
    people = wanted() ? listPeople() : [];
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
  // where the list starts (measured at left and top 0): the tool itself where it is positioned in it, or the window
  // where it is fixed (the top bar, whose left zone clips what hangs out of it; style.css).
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
    listEl.style.left = `${Math.round(x - box.left)}px`;
    listEl.style.top = `${Math.round(y - box.top)}px`;
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

  // The width it may take (nav-bar.js calls this while it measures the bar with nothing folded): the
  // names with every portrait, else the count ("5 in this space") with as many portraits as fit, else the short count
  // alone. Every size is measured, so the stylesheet (or a theme) may change them.
  function fit(avail) {
    lastAvail = avail;
    const count = people.length;
    shownFaces = MAX_FACES;
    wording = 'names';
    if (!count || !el.isConnected || !el.getClientRects().length) { drawRow(); return; }
    const view = el.ownerDocument.defaultView;
    const gap = parseFloat(view.getComputedStyle(toggle).columnGap) || 0;
    const w = (x) => x.getBoundingClientRect().width;
    const all = Math.min(MAX_FACES, count);
    const tiers = hereLabel(people, where());
    for (const tier of tiers.names === tiers.count ? ['count'] : ['names', 'count']) {
      // With every portrait and these words: the base (padding and words), one portrait, the step between them, the "+N".
      wording = tier;
      shownFaces = MAX_FACES;
      drawRow();
      if (cssCompact()) return; // a phone's tab bar shows the short count alone (style.css): nothing to measure
      more.hidden = false;
      if (count <= MAX_FACES) more.textContent = `+${count}`;
      const facesW = w(faces);
      const faceW = w(faces.firstElementChild);
      const moreW = w(more);
      const base = w(el) - facesW - moreW - 2 * gap;
      const k = facesThatFit({ avail, count, base, first: faceW + gap, step: all > 1 ? (facesW - faceW) / (all - 1) : 0, plus: moreW + gap });
      // The names only with every portrait: words give way before faces do.
      if (tier === 'names' ? k === all : k > 0) { shownFaces = k; break; }
      shownFaces = 0;
    }
    drawRow();
  }

  return { el, refresh, fit, close: () => setOpen(false), get avail() { return lastAvail; } };
}
