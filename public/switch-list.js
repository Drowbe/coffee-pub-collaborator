// A list of switches, one per module: its switch, its icon and its name (and a short note, and a count). One piece for
// every list of modules to turn on and off: the space bar's module chooser (canvas.js, shown or hidden on the canvas),
// Open with on the space list (space.js, what this person's own layout opens with), and in space settings Opens with
// (what a first visit opens) and the space's modules (which are on in the space; space-settings.js). The switch is the space bar's own look (`.switch` in style.css) on a
// real checkbox with role="switch", so a screen reader says "on" or "off" and Space toggles it; wireSwitchList() adds
// Enter to toggle and the arrow keys to move between them. Each page listens for `change` (or `click`) on the list.
//
//   switchListHtml(items, 'opens')  items: [{ id, icon, name, on, note?, badge?, disabled? }], the data attribute's name in
//                                   dashed form ('opens' gives data-opens="<id>" on each checkbox)

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const ICON = /^[a-z0-9-]{1,40}$/;

export function switchRowHtml({ id, icon, name, on = false, note = '', badge = 0, disabled = false }, attr) {
  const n = Number(badge) || 0;
  return `<label class="switch-row${disabled ? ' disabled' : ''}"><input type="checkbox" class="switch" role="switch" data-${attr}="${escapeHtml(id)}"${on ? ' checked' : ''}${disabled ? ' disabled' : ''}>`
    + `<i class="fa-solid fa-${ICON.test(icon || '') ? icon : 'puzzle-piece'} fa-fw" aria-hidden="true"></i>`
    + `<span class="switch-name">${escapeHtml(name)}</span>`
    + (note ? ` <span class="hint">(${escapeHtml(note)})</span>` : '')
    + (n ? `<span class="badge">${n > 9 ? '9+' : n}</span>` : '')
    + '</label>';
}

export function switchListHtml(items, attr) {
  return items.map((item) => switchRowHtml(item, attr)).join('');
}

// Enter toggles a switch as Space does; Up and Down (and Home and End) move between them. Once per list element.
const wired = new WeakSet();
export function wireSwitchList(list) {
  if (!list || wired.has(list)) return;
  wired.add(list);
  list.addEventListener('keydown', (event) => {
    const input = event.target.closest?.('input.switch');
    if (!input || !list.contains(input)) return;
    if (event.key === 'Enter') {
      event.preventDefault();
      input.click();
      return;
    }
    const all = [...list.querySelectorAll('input.switch:not(:disabled)')];
    const at = all.indexOf(input);
    const to = { ArrowDown: at + 1, ArrowUp: at - 1, Home: 0, End: all.length - 1 }[event.key];
    if (to === undefined) return;
    event.preventDefault();
    all[Math.max(0, Math.min(all.length - 1, to))]?.focus();
  });
}
