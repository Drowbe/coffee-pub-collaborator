// A page's tabs in the top bar (issue #262: Manage's tabs; Profile's next, #263). The page keeps its own tab strip
// (`<nav class="subtabs" id="subtabs">` with `.subtab[data-tab]` buttons, its ids, its classes and its own selectTab());
// this only places that strip in the top bar's left zone, where a space's layout tabs sit, and makes it behave as they
// do: the tab shown wears `aria-current="page"` (and the selected look, the Tabs component in public/sdk/system.css), and when the bar is
// tight the tabs leave from the right into a "..." after the last one shown (tabOverflow() in primary-nav.js, the layout
// tabs' rule: the first tab and the tab shown never leave), which opens the shared menu listing them. On a phone the
// strip is not in the bar (as the layout tabs are not); each tab is an entry at the top of the header's menu instead,
// its current one marked. The strip stays a <nav> landmark with the page's name (`label`). A click on a tab, in the bar,
// from the "..." or from the phone menu, is a click on the page's own button, so the page's own code does the rest.
//
// renderPageBar() (brand.js) calls it for a control marked `data-top-bar`; nothing else needs to. Gives { strip, more }.
import nav from '/nav-bar.js';
import { tabOverflow } from '/primary-nav.js';
import { openHostMenu } from '/host-menu.js';

export function topBarTabs({ strip, label = '' }) {
  if (!strip) return null;
  const doc = strip.ownerDocument;
  const view = doc.defaultView || window;
  const phone = typeof view.matchMedia === 'function' ? view.matchMedia('(max-width: 640px)') : null;
  const onPhone = () => Boolean(phone && phone.matches);
  const id = strip.id || 'page-tabs';
  strip.classList.add('layout-tabs', 'page-tabs');
  if (label) strip.setAttribute('aria-label', label);
  const tabs = () => [...strip.querySelectorAll(':scope > .subtab')];
  const isOn = (t) => t.classList.contains('active') || t.getAttribute('aria-current') === 'page';
  // A tab's words without its count (Manage's Modules tab carries one).
  const nameOf = (t) => [...t.childNodes].filter((n) => !(n.nodeType === 1 && n.classList.contains('badge'))).map((n) => n.textContent).join('').trim();
  const countOf = (t) => parseInt(t.querySelector(':scope > .badge')?.textContent || '0', 10) || 0;
  // The count as the phone menu's entry shows it: green when the tab's is (badge-ok), said as the tab's own words.
  const badgeOf = (t) => {
    const b = t.querySelector(':scope > .badge');
    return { badge: countOf(t), badgeTone: b && b.classList.contains('badge-ok') ? 'ok' : '', badgeLabel: b?.getAttribute('aria-label') || '' };
  };

  const more = doc.createElement('button');
  more.type = 'button';
  more.id = `${id}-more`;
  more.className = 'core-link layout-tabs-more';
  more.title = 'More tabs';
  more.setAttribute('aria-label', 'More tabs');
  more.setAttribute('aria-haspopup', 'menu');
  more.setAttribute('aria-expanded', 'false');
  more.hidden = true;
  more.innerHTML = '<i class="fa-solid fa-ellipsis-vertical fa-fw" aria-hidden="true"></i>';
  strip.append(more);

  // The tab shown says so (aria-current), and the "..." wears the current mark while that tab is in it.
  function mark() {
    let outCurrent = false;
    for (const t of tabs()) {
      t.classList.add('core-link');
      const on = t.classList.contains('active');
      if (on && t.getAttribute('aria-current') !== 'page') t.setAttribute('aria-current', 'page');
      else if (!on && t.hasAttribute('aria-current')) t.removeAttribute('aria-current');
      if (on && t.classList.contains('layout-tab-out')) outCurrent = true;
    }
    more.classList.toggle('layout-tabs-more-current', outCurrent);
  }

  // The width the bar gives the strip (nav-bar.js's fitLeft): every tab while they all fit; else they leave from the
  // right into the "...", never the first nor the one shown. The keyboard on a tab that leaves goes to the "...".
  function fit(avail) {
    const list = tabs().filter((t) => !t.hidden);
    const focused = doc.activeElement && strip.contains(doc.activeElement) ? doc.activeElement : null;
    for (const t of tabs()) t.classList.remove('layout-tab-out');
    more.hidden = true;
    if (!list.length || !strip.getClientRects().length || !Number.isFinite(avail)) { mark(); return; }
    const w = (el) => el.getBoundingClientRect().width;
    const gap = parseFloat(view.getComputedStyle(strip).columnGap) || 0;
    more.hidden = false;
    const moreWidth = w(more);
    more.hidden = true;
    const { out, more: showMore } = tabOverflow({ avail: Math.floor(avail) - 1, gap, widths: list.map(w), more: moreWidth, current: list.findIndex(isOn) });
    list.forEach((t, i) => t.classList.toggle('layout-tab-out', out.includes(i)));
    more.hidden = !showMore;
    mark();
    if (focused && focused.closest('.layout-tab-out')) more.focus();
  }

  // The "...": the tabs that did not fit, in their order, on the shared menu (Enter, the arrows), a check on the one shown.
  more.addEventListener('click', () => {
    const items = tabs().filter((t) => t.classList.contains('layout-tab-out') && !t.hidden).map((t) => ({
      label: nameOf(t),
      radio: true,
      checked: isOn(t),
      badge: countOf(t),
      onPick: () => {
        t.click();
        nav.draw('primary'); // the one shown never stays in the "...": the bar fits again
        if (!t.classList.contains('layout-tab-out')) t.focus();
      },
    }));
    openHostMenu(more, items);
  });

  // In the top bar's left zone, in the place a space's layout tabs take (group `views`), wider than a phone.
  nav.register({ id, bar: 'primary', zone: 'left', group: 'views', groupOrder: 12, order: 10, icon: 'table-columns', label: label || 'Tabs', element: strip, visible: () => !onPhone(), fit });

  // On a phone: each tab an entry at the top of the header's menu (before the environment's name and home), drawn
  // again whenever the tabs change (their words, the one shown, a tab hidden, Modules' count).
  let menuIds = [];
  let drawn = '';
  function menu() {
    const list = tabs();
    const key = JSON.stringify(list.map((t) => [t.dataset.tab, nameOf(t), t.dataset.icon || '', t.hidden, isOn(t), countOf(t)]));
    if (key === drawn) return;
    drawn = key;
    const want = list.map((t) => `${id}-menu-${t.dataset.tab}`);
    for (const old of menuIds) if (!want.includes(old)) nav.unregister(old);
    menuIds = want;
    list.forEach((t, i) => {
      const entryId = want[i];
      nav.register({ id: entryId, bar: 'primary', zone: 'right', group: `${id}-menu`, groupOrder: 0, order: 1 + i, icon: t.dataset.icon || 'angle-right', label: nameOf(t), ...badgeOf(t), visible: () => onPhone() && !t.hidden, onClick: () => t.click() });
      const el = nav.elementOf(entryId);
      if (!el) return;
      if (isOn(t)) el.setAttribute('aria-current', 'page');
      else el.removeAttribute('aria-current');
    });
  }

  // The page changes its tabs on its own (selectTab() moves `active`, the words fill in, a count arrives): mark them,
  // redraw the phone's entries, and fit the bar again. Only a change that matters counts, so the fit's own class changes
  // (layout-tab-out) never loop.
  let seen = '';
  const state = () => JSON.stringify(tabs().map((t) => [nameOf(t), t.hidden, t.classList.contains('active'), countOf(t)]));
  new view.MutationObserver(() => {
    const now = state();
    if (now === seen) return;
    seen = now;
    mark();
    menu();
    nav.draw('primary');
  }).observe(strip, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ['class', 'hidden'] });
  seen = state();
  mark();
  menu();
  return { strip, more };
}

// Navigation inside a tab (#262: the second row is reserved for it): a strip of the page's own `.subtab` buttons in
// the page bar's row (the secondary bar, renderPageBar()), in the page bar's tab look, scrolling sideways when it does
// not fit (style.css), never folding. `visible` says when the row holds it (Manage: while its tab is shown); a row with
// nothing to show is not drawn. The tab shown (`.active`) wears aria-current="page"; the strip is a <nav> landmark
// named `label`. The page wires its own clicks. Gives the strip.
export function rowTabs({ strip, label = '', visible = true }) {
  if (!strip) return null;
  const view = strip.ownerDocument.defaultView || window;
  strip.classList.add('page-bar-control');
  if (label) strip.setAttribute('aria-label', label);
  const mark = () => {
    for (const t of strip.querySelectorAll(':scope > .subtab')) {
      const on = t.classList.contains('active');
      if (on && t.getAttribute('aria-current') !== 'page') t.setAttribute('aria-current', 'page');
      else if (!on && t.hasAttribute('aria-current')) t.removeAttribute('aria-current');
    }
  };
  new view.MutationObserver(mark).observe(strip, { subtree: true, attributes: true, attributeFilter: ['class'] });
  mark();
  nav.register({ id: strip.id || 'page-row-tabs', bar: 'secondary', zone: 'left', group: 'page', order: 2, fold: false, element: strip, visible });
  return strip;
}
