// The action bar: the one rule for every settings or edit surface in the app (Thomas, 2026-10-13). A surface has
// explicit Save and Cancel buttons in a bar LOCKED TO ITS BOTTOM (the content scrolls above it; on a phone the bar
// respects the safe area), nothing saves as you go, a click outside never closes it, and Escape and Cancel close it and
// drop the unsaved changes, asking "Discard changes?" first when something is half-edited. Save stays off until
// something changed, and says "Saved" afterwards. This is the page's twin of the editor window's button row
// (public/sdk/host.css, .sdk-editor-actions; host.ui.editor asks "Discard your changes?" the same way); the look is
// `.action-bar` in style.css. tools/check-action-bar.mjs holds every surface to it.
//
//   const bar = actionBar({ onSave, onCancel, dirty });
//   surface.append(bar.el);              // last child of a flex column whose content scrolls (.action-surface)
//   bar.bindEscape(surface);             // Escape = Cancel, with the discard question when dirty
//   bar.refresh();                       // after any edit: Save is enabled while dirty() says so
//
// `onSave()` does the save and returns false (or throws) when it did not go through; anything else is a save, and the
// bar says "Saved" and stays clean. `onCancel()` closes the surface, edits dropped. `dirty()` says whether something
// would be lost. `readOnly` shows no Save, only Close. Returns { el, refresh, save, requestCancel, bindEscape, say,
// setBusy, saved, isAsking, saveButton, cancelButton }.

export const DISCARD_WORDS = 'Discard changes?';

export function actionBar({
  onSave,
  onCancel,
  dirty = () => false,
  saveLabel = 'Save',
  cancelLabel = 'Cancel',
  closeLabel = 'Close',
  savedWord = 'Saved',
  discardWords = DISCARD_WORDS, // the question on Cancel and Escape while dirty (the Set up panel asks host.ui.editor's "Discard your changes?")
  readOnly = false,
  submit = false, // Save is a form's submit button (the surface is a <form>)
  ids = {}, // { save, cancel }: element ids the surface keeps
  label = 'Actions',
  doc = document,
} = {}) {
  const el = doc.createElement('div');
  el.className = 'action-bar';
  el.setAttribute('role', 'group');
  el.setAttribute('aria-label', label);
  el.innerHTML = `
    <p class="action-bar-status" role="status" aria-live="polite"></p>
    <div class="action-bar-buttons">
      <button type="button" class="btn btn-small action-bar-cancel"></button>
      <button type="${submit ? 'submit' : 'button'}" class="btn btn-small btn-primary action-bar-save"></button>
    </div>
    <div class="action-bar-ask" role="alertdialog" aria-labelledby="action-bar-ask-text" hidden>
      <span class="action-bar-ask-text"></span>
      <button type="button" class="btn btn-small action-bar-keep">Keep editing</button>
      <button type="button" class="btn btn-small btn-danger action-bar-discard">Discard</button>
    </div>`;
  const statusEl = el.querySelector('.action-bar-status');
  const buttons = el.querySelector('.action-bar-buttons');
  const askEl = el.querySelector('.action-bar-ask');
  const askText = el.querySelector('.action-bar-ask-text');
  const saveButton = el.querySelector('.action-bar-save');
  const cancelButton = el.querySelector('.action-bar-cancel');
  const keepButton = el.querySelector('.action-bar-keep');
  const discardButton = el.querySelector('.action-bar-discard');
  askText.id = `action-bar-ask-${Math.random().toString(36).slice(2, 8)}`;
  askEl.setAttribute('aria-labelledby', askText.id);
  askText.textContent = discardWords;
  saveButton.textContent = saveLabel;
  cancelButton.textContent = readOnly ? closeLabel : cancelLabel;
  if (ids.save) saveButton.id = ids.save;
  if (ids.cancel) cancelButton.id = ids.cancel;
  saveButton.hidden = readOnly;

  let busy = false;
  let justSaved = false; // saved and not edited since: the Cancel button reads Close
  let asking = null; // while the question shows: { focus }

  const isDirty = () => { try { return Boolean(dirty()); } catch (err) { console.error(err); return false; } };
  const say = (text) => { statusEl.textContent = ''; statusEl.textContent = text || ''; };

  function refresh() {
    const d = isDirty();
    if (d && justSaved) { justSaved = false; say(''); }
    saveButton.disabled = readOnly || busy || !d;
    saveButton.setAttribute('aria-disabled', saveButton.disabled ? 'true' : 'false');
    cancelButton.disabled = busy;
    cancelButton.textContent = readOnly || justSaved ? closeLabel : cancelLabel;
    el.classList.toggle('dirty', d);
  }

  async function save() {
    if (saveButton.disabled || busy || readOnly) return false;
    busy = true;
    el.classList.add('busy');
    refresh();
    let result;
    try {
      result = typeof onSave === 'function' ? await onSave() : true;
    } catch (err) {
      say((err && err.message) || 'It was not saved.');
      result = false;
    } finally {
      busy = false;
      el.classList.remove('busy');
    }
    if (result !== false) { justSaved = !isDirty(); say(savedWord); }
    refresh();
    return result !== false;
  }

  function keep() {
    if (!asking) return;
    const back = asking.focus;
    asking = null;
    askEl.hidden = true;
    buttons.hidden = false;
    if (back && back.isConnected && typeof back.focus === 'function' && !back.disabled) back.focus(); else cancelButton.focus();
  }

  function ask() {
    const active = doc.activeElement;
    asking = { focus: active && !el.contains(active) ? active : null };
    buttons.hidden = true;
    askEl.hidden = false;
    keepButton.focus();
    say('');
  }

  // Cancel, Escape and the surface's own close button come here: the question first when something would be lost.
  function requestCancel() {
    if (asking) { keep(); return; }
    if (busy) return;
    if (isDirty()) ask();
    else if (typeof onCancel === 'function') onCancel();
  }

  function leave() {
    asking = null;
    askEl.hidden = true;
    buttons.hidden = false;
    if (typeof onCancel === 'function') onCancel();
  }

  saveButton.addEventListener('click', (event) => { if (!submit) save(); else if (saveButton.disabled) event.preventDefault(); });
  cancelButton.addEventListener('click', () => requestCancel());
  keepButton.addEventListener('click', () => keep());
  discardButton.addEventListener('click', () => leave());

  // Escape on a surface is Cancel. Stopped here so nothing behind it sees the key; a menu or list open inside has
  // stopped it already and closed only itself.
  function bindEscape(target) {
    target.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return;
      event.preventDefault();
      event.stopPropagation();
      requestCancel();
    });
  }

  refresh();
  return {
    el,
    refresh,
    save,
    requestCancel,
    bindEscape,
    say,
    setBusy: (b) => { busy = Boolean(b); refresh(); },
    saved: (text) => { justSaved = !isDirty(); say(text || savedWord); refresh(); },
    isAsking: () => Boolean(asking),
    saveButton,
    cancelButton,
  };
}
