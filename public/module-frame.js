// The module panel (Thomas, 2026-10-22, step one of three): one function draws the whole frame a module sits in, in four
// levels, top down: the title bar (icon, title, "+", icon buttons, close), the toolbar (one row), the content area and
// the status bar. Its styles are the moduleframe block of public/sdk/system.css; every size there is a named token at the
// top of the block. Today only the design system's panel page (public/design-system/panel.html) uses it; the product's
// windows will be rebuilt from it later.
//
//   const frame = createModuleFrame({
//     title, icon,                                   // the title bar's words and Font Awesome icon name
//     titlebar: {                                    // the title bar's actions (below)
//       add,                                         // true or { label, entries: [{ id, label, icon }] }: the "+"
//       actions: [{ id, label, icon, placement: 'bar' | 'menu', danger?, on?, regular? }],  // the module's own
//       standard: { window, popout, settings, share, print },  // each true unless switched off
//       close,                                       // true: a close button at the end
//       onAction(event),                             // the title bar's events; else the frame's onAction
//     },
//     toolbar: [ ...entries ],                        // see below
//     content, flush, empty: { icon, title, text },   // a Node, or nothing (empty is drawn); flush: no padding
//     status: { text, items: [{ text, icon?, tone? }] },
//     onAction(event),                               // { area, id, value?, on? } for every control
//   });
//   frame.el                                         // the <section>, ready to append
//   frame.setToolbar(list), frame.setStatus(s), frame.setContent(node), frame.setTitle(t), frame.fit(), frame.destroy()
//   frame.titlebarMenu()                             // the title bar menu's entries as they are now (host-menu.js items)
//
// The title bar, start to end: the icon, the title, the module's 'bar' actions (icon buttons), the "+", the menu button
// (More, whenever the menu has anything in it) and the close button. The menu: the module's own actions, a line, the
// standard actions (Open as a window, Open in its own window, Settings, Share, Print), then a destructive action last, red,
// after a line of its own. A title bar event is { area: 'titlebar', id, standard?: true, on?, value? }; the standard ids
// are window, popout, settings, share, print. Narrow, the bar icons fold into the menu (the last first) before the title is
// cut, so nothing is clipped.
//
// A toolbar entry is one of:
//   { type: 'switch', id, label, value, options: [{ id, label, icon }] }   a segmented view switch
//   { type: 'tabs', id, label, value, options: [{ id, label, count? }] }  a tab strip
//   { type: 'search', id, label, placeholder, value? }
//   { type: 'chips', id, label, options: [{ id, label, on }] }            filter chips
//   { type: 'button', id, label, icon?, kind: 'primary' | 'secondary' | 'icon' }
//   { type: 'title', text }                                               words in the row
//   { type: 'spacer' }                                                     what follows sits at the end
//
// The overflow rule, one row, nothing ever cut. While the row is wider than its room, these steps are taken in this
// order, each only if the row still does not fit: the chips fold into one Filters button; the view switch shows only its
// icons; a secondary button with an icon shows only its icon; the tab strip folds into one button with the current tab;
// the search becomes a magnifier (it opens over the row); a primary button with an icon shows only its icon. Then, if it
// still does not fit, whole controls go into the "More" menu one at a time, in MOVE order below, until it fits. A word
// folded away is the control's tooltip and its name.
import { openHostMenu, closeHostMenu, hostMenuOpen } from '/host-menu.js';
import '/tooltip.js';

// The standard title bar actions, drawn by the host the same in every module, in this order; each is on unless the module
// switches it off (titlebar.standard: { print: false }). The words and icons are the canvas's own (public/canvas.js).
const STANDARD = [
  { id: 'window', label: 'Open as a window', icon: 'window-restore', regular: true, tip: 'Float over the call' },
  { id: 'popout', label: 'Open in its own window', icon: 'up-right-from-square', tip: 'Pop out of this page' },
  { id: 'settings', label: 'Settings', icon: 'gear' },
  { id: 'share', label: 'Share', icon: 'share-nodes' },
  { id: 'print', label: 'Print', icon: 'print' },
];
const STANDARD_ON = Object.fromEntries(STANDARD.map((s) => [s.id, true]));
const FOLDS = ['chips', 'switch', 'secondary', 'tabs', 'search', 'primary'];
// Which control goes into "More" first: the lowest number first, then the one furthest along the row.
const MOVE = { icon: 1, secondary: 2, chips: 3, title: 4, primary: 5, switch: 6, tabs: 7, search: 8 };

let seq = 0;

// Whether a band's controls reach past its padding (the end padding is room, never for a control).
function overflows(band) {
  if (band.scrollWidth > band.clientWidth + 1) return true;
  const r = band.getBoundingClientRect();
  const end = r.right - parseFloat(getComputedStyle(band).paddingRight) - (band.clientLeft || 0);
  let right = -Infinity;
  for (const c of band.children) {
    if (!c.getClientRects().length) continue;
    right = Math.max(right, c.getBoundingClientRect().right);
  }
  return right > end + 0.5;
}

export function createModuleFrame(opts = {}) {
  const doc = opts.document || document;
  const win = doc.defaultView || window;
  const uid = `mf${++seq}`;
  const onAction = typeof opts.onAction === 'function' ? opts.onAction : () => {};
  let entries = [];
  let searching = false;
  let observer = null;
  let frameReq = 0;

  const el = (tag, cls, attrs = {}) => {
    const e = doc.createElement(tag);
    if (cls) e.className = cls;
    for (const [k, v] of Object.entries(attrs)) {
      if (v === null || v === undefined || v === false) continue;
      if (k === 'text') e.textContent = v;
      else e.setAttribute(k, v === true ? '' : String(v));
    }
    return e;
  };
  const icon = (name, cls = '') => {
    const i = el('i', `fa-solid fa-${name} fa-fw${cls ? ` ${cls}` : ''}`, { 'aria-hidden': 'true' });
    return i;
  };
  const word = (text) => el('span', 'mf-word', { text });
  // A button: its kind's class, an optional icon, optional words. With no words its label is its name and tooltip.
  const button = (cls, { label, iconName, words = true, tip = null }) => {
    const b = el('button', cls, { type: 'button' });
    if (iconName) b.append(icon(iconName));
    if (label && words) b.append(word(label));
    b.setAttribute('aria-label', label || iconName || '');
    if (!words || tip) b.dataset.tip = tip || label;
    return b;
  };

  // ---- the panel ----
  const root = el('section', 'mf', { 'aria-labelledby': `${uid}-title` });
  const head = el('header', 'mf-titlebar');
  const toolbar = el('div', 'mf-toolbar', { role: 'group', 'aria-label': 'Tools' });
  const content = el('div', 'mf-content', { id: `${uid}-content`, tabindex: '-1' });
  const status = el('footer', 'mf-status');
  root.append(head, toolbar, content, status);

  // ---- 1. the title bar ----
  const headIcon = el('span', 'mf-titlebar-icon', { 'aria-hidden': 'true' });
  const headTitle = el('h2', 'mf-titlebar-title', { id: `${uid}-title`, tabindex: '0', 'data-tip-if-truncated': '' });
  const headTools = el('div', 'mf-titlebar-tools');
  head.append(headIcon, headTitle, headTools);
  function setTitle(text, iconName = opts.icon) {
    headTitle.textContent = text || '';
    headTitle.dataset.tip = text || '';
    headIcon.textContent = '';
    if (iconName) headIcon.append(icon(iconName));
    headIcon.hidden = !iconName;
  }
  // The title bar's actions (Thomas, 2026-10-24). Three kinds, one menu: the module's own actions (each 'bar', an icon
  // button beside the menu, or 'menu'), the "+" (the host's, always shown beside the menu), and the standard actions the
  // host draws the same in every module (STANDARD below; a module may switch any of them off). The menu (the host's own,
  // host-menu.js): the module's actions first (any bar icons folded away, then its menu actions), a line, the standard
  // actions, then a destructive action last, in red, after a line of its own. The menu button is there whenever the menu
  // has anything in it.
  const tbFire = (data) => {
    const tb = opts.titlebar || {};
    (typeof tb.onAction === 'function' ? tb.onAction : onAction)({ area: 'titlebar', ...data });
  };
  let tbFold = null;
  function titlebarMenu() {
    const tb = opts.titlebar || {};
    const actions = Array.isArray(tb.actions) ? tb.actions : [];
    const std = { ...STANDARD_ON, ...(tb.standard || {}) };
    const entry = (a) => ({
      label: a.label, icon: a.icon, ...(a.regular ? { regular: true } : {}), ...(a.danger ? { danger: true } : {}),
      ...(typeof a.on === 'boolean' ? { checked: a.on } : {}),
      onPick: () => pickAction(a),
    });
    const own = [];
    if (tbFold) for (const { a, b } of tbFold.bar) if (b.hidden) own.push(entry(a));
    for (const a of actions) if (!a.danger && a.placement !== 'bar') own.push(entry(a));
    const standard = STANDARD.filter((s) => std[s.id]).map((s) => ({
      label: s.label, icon: s.icon, ...(s.regular ? { regular: true } : {}), tip: s.tip,
      onPick: () => tbFire({ id: s.id, standard: true }),
    }));
    const danger = actions.filter((a) => a.danger).map(entry);
    const runs = [own, standard, danger].filter((r) => r.length);
    return runs.flatMap((r, at) => (at ? [{ divider: true }, ...r] : r));
  }
  function pickAction(a) {
    if (typeof a.on === 'boolean') {
      a.on = !a.on;
      const bar = tbFold && tbFold.bar.find((x) => x.a === a);
      if (bar) { bar.b.setAttribute('aria-pressed', String(a.on)); bar.b.classList.toggle('is-on', a.on); }
    }
    tbFire({ id: a.id, ...(typeof a.on === 'boolean' ? { on: a.on } : {}) });
  }
  function drawTitlebar() {
    if (hostMenuOpen() && head.contains(doc.activeElement)) closeHostMenu();
    headTools.textContent = '';
    const tb = opts.titlebar || {};
    const actions = Array.isArray(tb.actions) ? tb.actions : [];
    // The bar icons: a destructive action is never one (it is always last in the menu).
    const bar = [];
    for (const a of actions) {
      if (a.placement !== 'bar' || a.danger) continue;
      const b = button('mf-icon-btn mf-titlebar-btn', { label: a.label, iconName: a.icon || 'circle', words: false });
      if (typeof a.on === 'boolean') { b.setAttribute('aria-pressed', String(a.on)); b.classList.toggle('is-on', a.on); }
      b.addEventListener('click', () => pickAction(a));
      bar.push({ a, b });
      headTools.append(b);
    }
    if (tb.add) {
      const add = typeof tb.add === 'object' ? tb.add : {};
      const b = button('mf-add-btn', { label: add.label || 'Add', iconName: 'plus', words: false });
      if (Array.isArray(add.entries) && add.entries.length) {
        b.setAttribute('aria-haspopup', 'menu');
        b.addEventListener('click', () => openHostMenu(b, add.entries.map((e) => ({ label: e.label, icon: e.icon, onPick: () => tbFire({ id: 'add', value: e.id }) }))));
      } else b.addEventListener('click', () => tbFire({ id: 'add' }));
      headTools.append(b);
    }
    const menu = button('mf-icon-btn mf-titlebar-btn mf-titlebar-menu', { label: 'More', iconName: 'ellipsis-vertical', words: false });
    menu.setAttribute('aria-haspopup', 'menu');
    menu.setAttribute('aria-expanded', 'false');
    menu.addEventListener('click', () => openHostMenu(menu, titlebarMenu));
    headTools.append(menu);
    tbFold = { bar, menu };
    if (tb.close) {
      const b = button('mf-icon-btn mf-titlebar-btn mf-close-btn', { label: 'Close', iconName: 'xmark', words: false });
      b.addEventListener('click', () => tbFire({ id: 'close' }));
      headTools.append(b);
    }
    showMenuButton();
  }
  function showMenuButton() {
    if (tbFold) tbFold.menu.hidden = titlebarMenu().length === 0;
  }
  // Narrow: the bar icons fold into the menu, the last first, before the title is cut or anything is clipped.
  function fitTitlebar() {
    if (!tbFold) return;
    for (const { b } of tbFold.bar) b.hidden = false;
    const cut = () => headTitle.scrollWidth > headTitle.clientWidth + 1;
    for (let at = tbFold.bar.length - 1; at >= 0; at -= 1) {
      showMenuButton();
      if (!overflows(head) && !cut()) break;
      tbFold.bar[at].b.hidden = true;
    }
    showMenuButton();
  }

  // ---- 2. the toolbar ----
  const fire = (data) => onAction({ area: 'toolbar', ...data });
  function drawSwitch(it) {
    const seg = el('div', 'mf-switch', { role: 'group', 'aria-label': it.label || 'View' });
    for (const o of it.options) {
      const b = el('button', 'mf-switch-btn', { type: 'button', 'aria-pressed': String(o.id === it.value), 'aria-label': o.label, 'data-tip-if-truncated': null });
      if (o.icon) b.append(icon(o.icon));
      b.append(word(o.label));
      b.addEventListener('click', () => { it.value = o.id; fire({ id: it.id, value: o.id }); redraw(); });
      seg.append(b);
    }
    return [seg];
  }
  function tabsMenu(it, b) {
    openHostMenu(b, it.options.map((o) => ({ label: o.label, radio: true, checked: o.id === it.value, badge: o.count, onPick: () => { it.value = o.id; fire({ id: it.id, value: o.id }); redraw(); } })));
  }
  function drawTabs(it) {
    const strip = el('div', 'mf-tabs', { role: 'tablist', 'aria-label': it.label || 'Tabs' });
    const tabs = it.options.map((o) => {
      const on = o.id === it.value;
      const t = el('button', 'mf-tab', { type: 'button', role: 'tab', 'aria-selected': String(on), 'aria-controls': `${uid}-content`, tabindex: on ? '0' : '-1' });
      t.append(word(o.label));
      if (o.count !== undefined && o.count !== null) t.append(el('span', 'mf-count', { text: String(o.count) }));
      t.addEventListener('click', () => { it.value = o.id; fire({ id: it.id, value: o.id }); redraw(`tab:${it.id}`); });
      strip.append(t);
      return t;
    });
    // Arrow keys move between the tabs and choose (the tab pattern).
    strip.addEventListener('keydown', (e) => {
      const at = tabs.indexOf(doc.activeElement);
      if (at < 0) return;
      let to = null;
      if (e.key === 'ArrowRight') to = (at + 1) % tabs.length;
      else if (e.key === 'ArrowLeft') to = (at - 1 + tabs.length) % tabs.length;
      else if (e.key === 'Home') to = 0;
      else if (e.key === 'End') to = tabs.length - 1;
      if (to === null) return;
      e.preventDefault();
      tabs[to].click();
    });
    const current = it.options.find((o) => o.id === it.value) || it.options[0];
    const menu = el('button', 'mf-tabs-menu', { type: 'button', 'aria-haspopup': 'menu', 'aria-label': `${it.label || 'Tabs'}: ${current ? current.label : ''}` });
    menu.append(word(current ? current.label : ''), icon('caret-down', 'mf-caret'));
    menu.addEventListener('click', () => tabsMenu(it, menu));
    return [strip, menu];
  }
  function drawSearch(it) {
    const form = el('form', 'mf-search', { role: 'search' });
    const input = el('input', 'mf-search-input', { type: 'search', placeholder: it.placeholder || 'Search', 'aria-label': it.label || 'Search', autocomplete: 'off', enterkeyhint: 'search' });
    input.value = it.value || '';
    form.append(icon('magnifying-glass', 'mf-search-glyph'), input);
    form.addEventListener('submit', (e) => { e.preventDefault(); fire({ id: it.id, value: input.value, submit: true }); });
    input.addEventListener('input', () => { it.value = input.value; fire({ id: it.id, value: input.value }); });
    input.addEventListener('keydown', (e) => {
      if (e.key !== 'Escape') return;
      if (input.value) { input.value = ''; it.value = ''; fire({ id: it.id, value: '' }); e.preventDefault(); return; }
      if (searching) { e.preventDefault(); stopSearching(); }
    });
    // Folded: a magnifier that opens the field over the whole row, with a button to close it again.
    const open = button('mf-icon-btn mf-search-open', { label: it.label || 'Search', iconName: 'magnifying-glass', words: false });
    open.addEventListener('click', () => startSearching(input));
    const shut = button('mf-icon-btn mf-search-close', { label: 'Close search', iconName: 'xmark', words: false });
    shut.addEventListener('click', () => stopSearching());
    form.append(shut);
    return [form, open];
  }
  function chipsMenu(it, b) {
    openHostMenu(b, () => [
      { heading: it.label || 'Filters' },
      ...it.options.map((o) => ({ label: o.label, checked: Boolean(o.on), toggle: true, onPick: () => { o.on = !o.on; fire({ id: it.id, value: o.id, on: o.on }); redraw(); } })),
    ]);
  }
  function drawChips(it) {
    const group = el('div', 'mf-chips', { role: 'group', 'aria-label': it.label || 'Filters' });
    for (const o of it.options) {
      const c = el('button', `mf-chip${o.on ? ' is-on' : ''}`, { type: 'button', 'aria-pressed': String(Boolean(o.on)) });
      c.append(icon(o.on ? 'check' : 'plus', 'mf-chip-mark'), word(o.label));
      c.addEventListener('click', () => { o.on = !o.on; fire({ id: it.id, value: o.id, on: o.on }); redraw(`chip:${it.id}:${o.id}`); });
      c.dataset.key = `chip:${it.id}:${o.id}`;
      group.append(c);
    }
    const on = it.options.filter((o) => o.on).length;
    const menu = el('button', 'mf-chips-menu', { type: 'button', 'aria-haspopup': 'menu', 'aria-label': `${it.label || 'Filters'}${on ? `, ${on} on` : ''}` });
    menu.append(icon('filter'), word(it.label || 'Filters'));
    if (on) menu.append(el('span', 'mf-count', { text: String(on) }));
    menu.addEventListener('click', () => chipsMenu(it, menu));
    return [group, menu];
  }
  function drawButton(it) {
    const kind = it.kind === 'primary' || it.kind === 'icon' ? it.kind : 'secondary';
    const cls = kind === 'icon' ? 'mf-icon-btn' : `mf-btn mf-btn-${kind}`;
    const b = button(cls, { label: it.label, iconName: it.icon, words: kind !== 'icon' });
    if (kind !== 'icon' && it.icon && it.label) b.dataset.tipFolded = it.label;
    b.addEventListener('click', () => fire({ id: it.id }));
    return [b];
  }
  // The entries one control gives the "More" menu.
  function moreEntries(it) {
    if (it.type === 'button') return [{ label: it.label, icon: it.icon, onPick: () => fire({ id: it.id }) }];
    if (it.type === 'title') return [{ heading: it.text }];
    if (it.type === 'search') return [{ label: it.label || 'Search', icon: 'magnifying-glass', onPick: () => win.setTimeout(() => startSearching(it._input), 0) }];
    if (it.type === 'switch' || it.type === 'tabs') {
      return [{ heading: it.label || (it.type === 'switch' ? 'View' : 'Tabs') }, ...it.options.map((o) => ({
        label: o.label, ...(o.icon ? { icon: o.icon } : {}), radio: true, checked: o.id === it.value, badge: o.count,
        onPick: () => { it.value = o.id; fire({ id: it.id, value: o.id }); redraw(); },
      }))];
    }
    if (it.type === 'chips') {
      return [{ heading: it.label || 'Filters' }, ...it.options.map((o) => ({
        label: o.label, checked: Boolean(o.on), toggle: true,
        onPick: () => { o.on = !o.on; fire({ id: it.id, value: o.id, on: o.on }); redraw(); },
      }))];
    }
    return [];
  }
  const moreBtn = button('mf-icon-btn mf-more', { label: 'More', iconName: 'ellipsis', words: false });
  moreBtn.setAttribute('aria-haspopup', 'menu');
  moreBtn.addEventListener('click', () => openHostMenu(moreBtn, () => {
    const list = [];
    for (const it of entries) if (it._els && it._els[0].classList.contains('is-moved')) list.push(...moreEntries(it));
    return list;
  }));

  function startSearching(input) {
    if (!input) return;
    searching = true;
    toolbar.classList.add('is-searching');
    input.focus();
  }
  function stopSearching() {
    searching = false;
    toolbar.classList.remove('is-searching');
    fit();
    const open = toolbar.querySelector('.mf-search-open');
    if (open && open.offsetParent) open.focus();
    else if (moreBtn.offsetParent) moreBtn.focus();
  }

  function drawToolbar() {
    if (hostMenuOpen() && toolbar.contains(doc.activeElement)) closeHostMenu();
    toolbar.textContent = '';
    for (const it of entries) {
      let els = [];
      if (it.type === 'switch') els = drawSwitch(it);
      else if (it.type === 'tabs') els = drawTabs(it);
      else if (it.type === 'search') { els = drawSearch(it); it._input = els[0].querySelector('input'); }
      else if (it.type === 'chips') els = drawChips(it);
      else if (it.type === 'button') els = drawButton(it);
      else if (it.type === 'title') els = [el('span', 'mf-tb-title', { text: it.text, 'data-tip': it.text, 'data-tip-if-truncated': '', tabindex: '0' })];
      else if (it.type === 'spacer') els = [el('span', 'mf-spacer', { 'aria-hidden': 'true' })];
      it._els = els;
      toolbar.append(...els);
    }
    toolbar.append(moreBtn);
    toolbar.hidden = entries.length === 0;
    if (searching) toolbar.classList.add('is-searching');
  }
  // Fit the row: the fold steps in order, then whole controls into "More", until nothing is cut.
  function fit() {
    frameReq = 0;
    if (!root.isConnected) return;
    fitTitlebar();
    if (toolbar.hidden) return;
    for (const f of FOLDS) toolbar.classList.remove(`mf-fold-${f}`);
    for (const it of entries) for (const e of it._els || []) e.classList.remove('is-moved');
    moreBtn.classList.remove('is-shown');
    const over = () => overflows(toolbar);
    const wasSearching = toolbar.classList.contains('is-searching');
    toolbar.classList.remove('is-searching');
    for (const f of FOLDS) {
      if (!over()) break;
      toolbar.classList.add(`mf-fold-${f}`);
    }
    // The words a folded control lost are its tooltip.
    const iconic = (b) => {
      const w = b.querySelector('.mf-word');
      return Boolean(w && b.querySelector('i') && w.offsetParent === null);
    };
    for (const b of toolbar.querySelectorAll('.mf-btn, .mf-switch-btn')) {
      const name = b.getAttribute('aria-label');
      if (iconic(b)) b.dataset.tip = name; else delete b.dataset.tip;
    }
    if (over()) {
      moreBtn.classList.add('is-shown');
      const order = entries
        .map((it, at) => ({ it, at, rank: it.type === 'button' ? MOVE[it.kind === 'primary' || it.kind === 'icon' ? it.kind : 'secondary'] : MOVE[it.type] }))
        .filter((x) => x.rank)
        .sort((a, b) => a.rank - b.rank || b.at - a.at);
      for (const { it } of order) {
        if (!over()) break;
        for (const e of it._els) e.classList.add('is-moved');
      }
    }
    if (wasSearching) toolbar.classList.add('is-searching');
  }
  const later = () => { if (!frameReq) frameReq = win.requestAnimationFrame(fit); };
  function redraw(focusKey = null) {
    const active = doc.activeElement;
    const key = focusKey || (active && toolbar.contains(active) ? active.dataset.key : null);
    drawToolbar();
    fit();
    if (key) {
      const again = key.startsWith('tab:')
        ? toolbar.querySelector('.mf-tab[aria-selected="true"]')
        : toolbar.querySelector(`[data-key="${key}"]`);
      if (again && again.offsetParent) again.focus();
    }
  }

  // ---- 3. the content ----
  function setContent(node, { flush = opts.flush, empty = opts.empty } = {}) {
    content.textContent = '';
    content.classList.toggle('mf-content-flush', Boolean(flush));
    if (node) { content.append(node); return; }
    const e = empty || {};
    const box = el('div', 'mf-empty');
    if (e.icon) box.append(el('span', 'mf-empty-icon', { 'aria-hidden': 'true' }));
    if (e.icon) box.firstChild.append(icon(e.icon));
    box.append(el('p', 'mf-empty-title', { text: e.title || 'Nothing here yet' }));
    if (e.text) box.append(el('p', 'mf-empty-text', { text: e.text }));
    content.append(box);
  }

  // ---- 4. the status bar ----
  function setStatus(s) {
    status.textContent = '';
    const st = s || {};
    const items = Array.isArray(st.items) ? st.items : [];
    status.hidden = !st.text && items.length === 0;
    const left = el('span', 'mf-status-text', { text: st.text || '', 'data-tip': st.text || '', 'data-tip-if-truncated': '' });
    const right = el('span', 'mf-status-items');
    for (const it of items) {
      const s1 = el('span', `mf-status-item${it.tone ? ` mf-tone-${it.tone}` : ''}`);
      if (it.icon) s1.append(icon(it.icon));
      s1.append(el('span', '', { text: it.text }));
      right.append(s1);
    }
    status.append(left, right);
  }

  setTitle(opts.title, opts.icon);
  drawTitlebar();
  entries = Array.isArray(opts.toolbar) ? opts.toolbar : [];
  drawToolbar();
  setContent(opts.content || null);
  setStatus(opts.status);
  if (typeof win.ResizeObserver === 'function') {
    observer = new win.ResizeObserver(later);
    observer.observe(root);
  }

  return {
    el: root,
    content,
    setTitle,
    titlebarMenu,
    setToolbar(list) { entries = Array.isArray(list) ? list : []; redraw(); },
    setContent,
    setStatus,
    fit,
    destroy() {
      if (observer) observer.disconnect();
      observer = null;
      if (hostMenuOpen() && root.contains(doc.activeElement)) closeHostMenu();
    },
  };
}
