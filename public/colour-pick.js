// The colour picker (the design system's Pickers family): a trigger that shows the chosen colour as a swatch and its hex in words,
// and a popover of the palette with the browser's own colour input as the last choice, "Custom". It upgrades a native
// <input type="color"> the page already has: the input stays where it is, hidden, and keeps the value (so the page reads and saves it
// as before); a choice here sets it and sends `input` and `change` from it.
//
// The palette is data, not design: colours a person may store. It does not follow the theme (a stored colour must look the same in
// every theme), so it lives here as data and is read into the swatches as a custom property (--sw), never as a declaration.
// Selected is a check on a neutral disc over the swatch, never an accent border. Keys: the arrow keys move between swatches,
// Enter or Space chooses, Escape closes and puts the keyboard back on the trigger. Styles: the Pickers block of /sdk/system.css.
export const PALETTE = [
  ['Amber', '#c8873a'], ['Orange', '#e45628'], ['Red', '#b8503f'], ['Gold', '#d9a93c'],
  ['Green', '#6fae6b'], ['Teal', '#2f9e8f'], ['Cyan', '#0dc9ca'], ['Sky', '#6aa6e8'],
  ['Blue', '#3b6fb6'], ['Purple', '#7a5bb5'], ['Magenta', '#b05fa0'], ['Pink', '#e07aa0'],
  ['Stone', '#8a7a6a'], ['Brown', '#5a4a3c'], ['Sand', '#cfc6bb'], ['Ink', '#2b2119'],
];

const HEX = /^#[0-9a-f]{6}$/i;
const COLUMNS = 8;
let seq = 0;

// Upgrade every native colour input under `root` that has not been upgraded yet. `label` is what a screen reader says for the trigger
// (the input's own aria-label, or its label's words, else "Colour").
export function upgradeColourInputs(root) {
  for (const input of root.querySelectorAll('input[type="color"]:not([data-colour-picker])')) colourPicker(input);
}

export function colourPicker(input) {
  const doc = input.ownerDocument;
  const win = doc.defaultView;
  input.dataset.colourPicker = '';
  const name = input.getAttribute('aria-label') || (input.closest('label') && input.closest('label').firstChild && input.closest('label').firstChild.textContent.trim()) || 'Colour';
  const id = `colour-pick-${++seq}`;
  const trigger = doc.createElement('button');
  trigger.type = 'button';
  trigger.className = 'sdk-picker';
  trigger.setAttribute('aria-haspopup', 'dialog');
  trigger.setAttribute('aria-expanded', 'false');
  trigger.setAttribute('aria-controls', id);
  trigger.innerHTML = '<span class="sdk-picker-sw" aria-hidden="true"></span><span class="sdk-picker-value"><span class="sdk-hex"></span></span><span class="sdk-picker-icon" aria-hidden="true"><svg viewBox="0 0 16 16" width="12" height="12"><path fill="currentColor" d="M2.3 5.3 8 11l5.7-5.7-1.4-1.4L8 8.2 3.7 3.9z"/></svg></span>';
  const swatch = trigger.querySelector('.sdk-picker-sw');
  const hex = trigger.querySelector('.sdk-hex');
  input.hidden = true;
  input.tabIndex = -1;
  input.before(trigger); // first, so a label around both leads to the trigger (a button is labelable), not to the hidden input
  const current = () => (HEX.test(input.value) ? input.value.toLowerCase() : '#000000');
  const nameOf = (value) => { const hit = PALETTE.find(([, h]) => h === value); return hit ? hit[0] : ''; };
  const show = () => {
    const value = current();
    swatch.style.setProperty('--sw', value);
    hex.textContent = value;
    trigger.setAttribute('aria-label', `${name}, ${nameOf(value) ? `${nameOf(value)}, ` : ''}${value}. Change it`);
  };
  show();
  if (input.disabled) trigger.disabled = true;

  let pop = null;
  const close = ({ refocus = false } = {}) => {
    if (!pop) return;
    pop.remove();
    pop = null;
    trigger.setAttribute('aria-expanded', 'false');
    doc.removeEventListener('pointerdown', away, true);
    doc.removeEventListener('keydown', key, true);
    win.removeEventListener('resize', place);
    if (refocus) trigger.focus();
  };
  const set = (value) => {
    input.value = value;
    input.dispatchEvent(new Event('input', { bubbles: true }));
    input.dispatchEvent(new Event('change', { bubbles: true }));
    show();
  };
  const away = (e) => { if (pop && !pop.contains(e.target) && !trigger.contains(e.target)) close(); };
  const key = (e) => {
    if (!pop) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close({ refocus: true }); return; }
    const cells = [...pop.querySelectorAll('.sdk-swatch')];
    const at = cells.indexOf(doc.activeElement);
    if (at === -1) return;
    const step = { ArrowRight: 1, ArrowLeft: -1, ArrowDown: COLUMNS, ArrowUp: -COLUMNS }[e.key];
    if (step !== undefined) {
      e.preventDefault();
      const next = Math.max(0, Math.min(cells.length - 1, at + step));
      cells[next].focus();
    } else if (e.key === 'Home' || e.key === 'End') {
      e.preventDefault();
      cells[e.key === 'Home' ? 0 : cells.length - 1].focus();
    }
  };
  // Under the trigger, kept inside the window (above it when there is no room below).
  const place = () => {
    if (!pop) return;
    const r = trigger.getBoundingClientRect();
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    let top = r.bottom + 4;
    if (top + h > win.innerHeight - 4 && r.top - 4 - h > 4) top = r.top - 4 - h;
    pop.style.top = `${Math.max(4, top)}px`;
    pop.style.left = `${Math.max(4, Math.min(r.left, win.innerWidth - w - 4))}px`;
  };
  const open = () => {
    if (pop) return close({ refocus: true });
    if (input.disabled) return;
    const value = current();
    pop = doc.createElement('div');
    pop.id = id;
    pop.className = 'sdk-popover sdk-popover-dense sdk-picker-pop';
    pop.setAttribute('role', 'dialog');
    pop.setAttribute('aria-label', name);
    const grid = doc.createElement('div');
    grid.className = 'sdk-swatch-grid';
    grid.setAttribute('role', 'radiogroup');
    grid.setAttribute('aria-label', 'Colours');
    const chosen = PALETTE.some(([, h]) => h === value) ? value : '';
    for (const [label, h] of PALETTE) {
      const b = doc.createElement('button');
      b.type = 'button';
      b.className = 'sdk-swatch';
      b.setAttribute('role', 'radio');
      b.setAttribute('aria-checked', String(h === chosen));
      b.setAttribute('aria-label', label);
      b.title = label;
      b.tabIndex = h === chosen || (!chosen && h === PALETTE[0][1]) ? 0 : -1;
      b.style.setProperty('--sw', h);
      b.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true"></i>';
      b.addEventListener('click', () => { set(h); close({ refocus: true }); });
      grid.appendChild(b);
    }
    const custom = doc.createElement('label');
    custom.className = 'sdk-swatch-custom';
    const words = doc.createElement('span');
    words.textContent = 'Custom';
    const native = doc.createElement('input');
    native.type = 'color';
    native.value = value;
    native.setAttribute('aria-label', 'Custom colour');
    native.addEventListener('input', () => set(native.value));
    custom.append(words, native);
    pop.append(grid, custom);
    doc.body.appendChild(pop);
    trigger.setAttribute('aria-expanded', 'true');
    place();
    doc.addEventListener('pointerdown', away, true);
    doc.addEventListener('keydown', key, true);
    win.addEventListener('resize', place);
    const first = pop.querySelector('.sdk-swatch[tabindex="0"]');
    if (first) first.focus();
  };
  trigger.addEventListener('click', open);
  return { show, close, destroy() { close(); trigger.remove(); input.hidden = false; input.tabIndex = 0; delete input.dataset.colourPicker; } };
}
