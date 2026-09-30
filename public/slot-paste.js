// Paste a picture into an image slot (.slot-pick-wrap > label.slot-pick > input[type=file]), beside clicking to choose a
// file. Shared by every page with slots (profile, Manage, a space's settings): imported once, it finds the slots itself,
// including the ones a page adds later, so a page wires nothing new.
//
// A pasted picture goes through exactly the path a chosen file does: it is put into the slot's own file input and a
// `change` event is sent from there, so the page's existing handler uploads it, with the same limits, errors and preview.
//
// Two ways in:
// - the keyboard: Tab to the picture (it is focusable here) and press Ctrl+V (Cmd+V on a Mac). Only the slot that has
//   focus takes the paste; a paste in a text field anywhere else on the page is left alone.
// - the pointer: a small Paste button on the slot's corner (shown on hover and focus, always on a touch screen), where
//   the browser lets a page read the clipboard. Where it doesn't, there is no button, and the hint says what to do.

import { fill } from '/words.js';

const HINT = 'Paste or click to choose';
const KEY = /Mac|iPhone|iPad/.test(navigator.platform || navigator.userAgent) ? 'Cmd+V' : 'Ctrl+V';
const TOUCH = window.matchMedia?.('(hover: none)').matches;
const CAN_READ = typeof navigator.clipboard?.read === 'function' && window.isSecureContext;

const inputOf = (wrap) => wrap.querySelector('label.slot-pick input[type="file"]');
const labelOf = (wrap) => wrap.querySelector('label.slot-pick');
// A slot this person can't change (profile marks those .still) takes no paste and no focus.
const usable = (wrap) => {
  const label = labelOf(wrap);
  const input = inputOf(wrap);
  return !!(label && input && !input.disabled && !label.classList.contains('still') && !wrap.closest('[hidden], fieldset:disabled'));
};
const captionOf = (wrap) => {
  const slot = wrap.closest('.slot');
  const span = slot && [...slot.children].find((el) => el.tagName === 'SPAN' && !el.classList.contains('unset'));
  return span?.textContent.trim() || '';
};
// Which picture this is, for a screen reader: a slot's own data-slot-name ("Profile picture", "{Environment} icon"), or
// its caption ("Online") after the name of each group it sits in, outermost first ("Default", a space's name,
// "Participant") -- a data-slot-group with no value takes its group's first heading. Level words in braces are the
// environment's own (words.js fill).
function nameOf(wrap) {
  const slot = wrap.closest('.slot');
  if (slot?.dataset.slotName) return fill(slot.dataset.slotName);
  const groups = [];
  for (let el = wrap.closest('[data-slot-group]'); el; el = el.parentElement?.closest('[data-slot-group]')) {
    const text = el.dataset.slotGroup ? fill(el.dataset.slotGroup) : el.querySelector('h1, h2, h3, h4')?.textContent.trim();
    if (text) groups.unshift(text);
  }
  const caption = captionOf(wrap);
  return [...groups, caption ? `${caption} picture` : 'Picture'].join(' ');
}

// A short line under the slot: the hint while it is hovered or focused, or for a moment what happened.
const timers = new WeakMap();
function note(wrap, text) {
  const hint = wrap.querySelector('.slot-hint');
  if (!hint) return;
  clearTimeout(timers.get(hint));
  hint.textContent = text;
  hint.classList.add('say');
  timers.set(hint, setTimeout(() => {
    hint.classList.remove('say');
    hint.textContent = HINT;
  }, 3500));
}
// Back to the plain hint at once: a picture went in, so an earlier note ("Can't read the clipboard…") no longer holds.
function unnote(wrap) {
  const hint = wrap.querySelector('.slot-hint');
  if (!hint) return;
  clearTimeout(timers.get(hint));
  hint.classList.remove('say');
  hint.textContent = HINT;
}

// The picture goes in as if it had been chosen: into the input, then the input's own change handler.
function useFile(wrap, file) {
  const input = inputOf(wrap);
  if (!input || !usable(wrap)) return;
  const name = file.name && file.name !== 'image.png' ? file.name : `pasted.${(file.type.split('/')[1] || 'png').replace('jpeg', 'jpg')}`;
  const named = file.name === name ? file : new File([file], name, { type: file.type, lastModified: Date.now() });
  const dt = new DataTransfer();
  dt.items.add(named);
  input.files = dt.files;
  unnote(wrap);
  input.dispatchEvent(new Event('change', { bubbles: true }));
}

const setAttr = (el, name, value) => {
  if (value === null) { if (el.hasAttribute(name)) el.removeAttribute(name); } else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
};

function enhance(wrap) {
  const label = labelOf(wrap);
  if (!label || !inputOf(wrap)) return;
  const can = usable(wrap);
  if (!wrap.hasAttribute('data-paste')) {
    wrap.setAttribute('data-paste', '');
    label.removeAttribute('title'); // the hint under the slot says it now
    const hint = document.createElement('span');
    hint.className = 'slot-hint';
    hint.setAttribute('role', 'status');
    hint.textContent = HINT;
    wrap.append(hint);
    if (CAN_READ) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'slot-paste';
      btn.title = 'Paste';
      btn.innerHTML = '<i class="fa-solid fa-paste" aria-hidden="true"></i>';
      label.after(btn); // in Tab order: the picture, Paste, then Remove
    }
  }
  // Changeable: a button that says what it does. Not (can't change it, or on a hidden tab): just the picture's name.
  const name = nameOf(wrap);
  setAttr(label, 'aria-label', can ? `${name}: paste or choose a file` : name);
  setAttr(label, 'role', can ? 'button' : null);
  const btn = wrap.querySelector('.slot-paste');
  if (btn) {
    setAttr(btn, 'aria-label', `Paste into ${name}`);
    if (btn.hidden !== !can) btn.hidden = !can;
  }
  const tab = can ? 0 : -1;
  if (label.tabIndex !== tab) label.tabIndex = tab;
  wrap.classList.toggle('slot-fixed', !can);
}

let queued = false;
function sync() {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => {
    queued = false;
    for (const wrap of document.querySelectorAll('.slot-pick-wrap')) enhance(wrap);
  });
}

// Enter or Space on the focused picture chooses a file, as a click does.
document.addEventListener('keydown', (event) => {
  const label = event.target.closest?.('label.slot-pick');
  if (!label || event.target !== label || (event.key !== 'Enter' && event.key !== ' ')) return;
  const wrap = label.closest('.slot-pick-wrap');
  if (!wrap || !usable(wrap)) return;
  event.preventDefault();
  inputOf(wrap).click();
});

const editable = (el) => !!el?.closest?.('input, textarea, select, [contenteditable]:not([contenteditable="false"])');

document.addEventListener('paste', (event) => {
  const target = event.target instanceof Element ? event.target : document.activeElement;
  if (editable(target)) return; // a text field keeps its paste
  const wrap = target?.closest?.('.slot-pick-wrap');
  if (!wrap || !usable(wrap)) return;
  event.preventDefault();
  const data = event.clipboardData;
  const file = [...(data?.files || [])].find((f) => /^image\//.test(f.type))
    || [...(data?.items || [])].filter((i) => i.kind === 'file' && /^image\//.test(i.type)).map((i) => i.getAsFile()).find(Boolean);
  if (file) useFile(wrap, file);
  else note(wrap, 'No picture to paste. Copy one first.');
});

document.addEventListener('click', async (event) => {
  const btn = event.target.closest?.('.slot-paste');
  if (!btn) return;
  const wrap = btn.closest('.slot-pick-wrap');
  if (!wrap || !usable(wrap)) return;
  let items;
  try {
    items = await navigator.clipboard.read();
  } catch (err) {
    // Refused: the keyboard way still works, from the picture itself, so put the focus there and say so.
    if (TOUCH) note(wrap, "Can't read the clipboard here. Tap the picture to choose one.");
    else {
      // Ringed while it has focus (a focus from a click doesn't show the usual ring), so the person sees where it goes.
      const label = labelOf(wrap);
      wrap.classList.add('slot-armed');
      label.addEventListener('blur', () => wrap.classList.remove('slot-armed'), { once: true });
      label.focus({ focusVisible: true });
      note(wrap, `Can't read the clipboard here. Press ${KEY} now to paste.`);
    }
    return;
  }
  for (const item of items) {
    const type = item.types.find((t) => /^image\//.test(t));
    if (!type) continue;
    try {
      const blob = await item.getType(type);
      useFile(wrap, new File([blob], '', { type: blob.type || type }));
    } catch (err) {
      note(wrap, "That picture couldn't be read. Try choosing the file.");
    }
    return;
  }
  note(wrap, 'No picture to paste. Copy one first.');
});

new MutationObserver(sync).observe(document.documentElement, { subtree: true, childList: true, attributes: true, attributeFilter: ['class', 'hidden', 'disabled'] });
sync();
