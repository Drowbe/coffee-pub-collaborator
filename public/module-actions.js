// The standard actions a module hands to the host (host.standard.set; Thomas, 2026-10-29): Settings, Share and Print are the
// engine's, the same in every module. The frame's menu draws them (module-frame.js, titlebar.moduleStandard) and
// createFrameBands (module-host.js) runs them. Settings is the module's own (its handler opens its settings); what is shared
// is the host's:
//   shareDialog(doc, { title, url, message })   the one Share dialog: the link to copy, a Copy link button and a plain
//                                               message, in the shared dialog look (the Dialogs and confirm blocks of
//                                               /sdk/system.css). Resolves when it closes. Anything with a link to hand
//                                               out (the Vault's links later) opens this.
//   printFrame(frameEl, { iframe, height })     prints the module's content area alone through the print rules of the
//                                               moduleframe block: the chrome and the rest of the page left out, the
//                                               page in its light colours while it prints. `iframe` and `height`: a
//                                               module in a frame, made as tall as its own page (the SDK measured it).
//                                               Resolves once the page is put back.

let uid = 0;

export function shareDialog(doc, { title = 'Share', url, message = '' } = {}) {
  return new Promise((resolve) => {
    const make = (tag, cls, text) => { const e = doc.createElement(tag); if (cls) e.className = cls; if (text !== undefined) e.textContent = text; return e; };
    const id = `mf-share-${++uid}`;
    const opener = doc.activeElement && doc.activeElement !== doc.body ? doc.activeElement : null;
    const dlg = make('dialog', 'sdk-dialog-confirm mf-share');
    dlg.setAttribute('aria-modal', 'true');
    dlg.setAttribute('aria-labelledby', `${id}-t`);
    const head = make('div', 'sdk-dialog-head');
    const h = make('h2', 'sdk-dialog-title', title);
    h.id = `${id}-t`;
    const close = make('button', 'sdk-icon-btn btn-quiet btn-small sdk-dialog-close');
    close.type = 'button';
    close.setAttribute('aria-label', 'Close');
    close.dataset.close = '';
    close.innerHTML = '<i class="fa-solid fa-xmark" aria-hidden="true"></i>';
    head.append(h, close);
    const body = make('div', 'sdk-dialog-body');
    if (message) {
      const p = make('p', '', message);
      p.id = `${id}-d`;
      dlg.setAttribute('aria-describedby', p.id);
      body.append(p);
    }
    const field = make('label', 'sdk-field');
    field.append(make('span', 'sdk-label', 'Link'));
    const input = make('input', 'mf-share-link');
    input.type = 'text';
    input.readOnly = true;
    input.value = url;
    input.setAttribute('spellcheck', 'false');
    field.append(input);
    const said = make('span', 'sdk-hint');
    said.setAttribute('role', 'status');
    said.setAttribute('aria-live', 'polite');
    field.append(said);
    body.append(field);
    const foot = make('div', 'sdk-dialog-foot');
    const done = make('button', 'btn', 'Close');
    done.type = 'button';
    done.dataset.close = '';
    const copy = make('button', 'btn btn-primary', 'Copy link');
    copy.type = 'button';
    foot.append(done, copy);
    dlg.append(head, body, foot);

    const root = doc.documentElement;
    const was = root.style.overflow;
    let ended = false;
    const end = () => {
      if (ended) return;
      ended = true;
      if (dlg.open) dlg.close();
      root.style.overflow = was;
      dlg.remove();
      if (opener && opener.isConnected && typeof opener.focus === 'function') opener.focus();
      resolve();
    };
    copy.addEventListener('click', async () => {
      input.select();
      try {
        await (doc.defaultView || window).navigator.clipboard.writeText(url);
        said.textContent = 'Copied. Paste it wherever you want to share it.';
      } catch {
        said.textContent = 'This browser would not copy it. The link is selected: copy it from the field.';
        input.focus();
        input.select();
      }
    });
    input.addEventListener('focus', () => input.select());
    dlg.addEventListener('cancel', (e) => { e.preventDefault(); end(); });
    // Close and Escape close it; a click outside it does not (Thomas, 2026-10-13).
    dlg.addEventListener('click', (e) => { if (e.target.closest('[data-close]')) end(); });
    dlg.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      const f = [...dlg.querySelectorAll('button, input')].filter((x) => !x.disabled);
      const i = f.indexOf(doc.activeElement);
      if (e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); } else if (!e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
    });
    doc.body.append(dlg);
    root.style.overflow = 'hidden';
    try { dlg.showModal(); } catch { root.style.overflow = was; dlg.remove(); resolve(); return; }
    copy.focus();
  });
}

// The page while it prints: the frame's ancestors let it run on (.mf-print-path), everything beside them is left out
// ([data-mf-print-hide]), the frame shows its content only (.mf-printing), and the documents it is drawn in show their light
// mode, which module-host.js passes on to the modules' frames (the 'app:theme' event). All of it is put back after.
export function printFrame(frameEl, { iframe = null, height = 0 } = {}) {
  const doc = frameEl.ownerDocument;
  const win = doc.defaultView || window;
  const docs = [...new Set([doc, document])];
  const marked = [];
  const hidden = [];
  for (let el = frameEl.parentElement; el && el !== doc.body; el = el.parentElement) { el.classList.add('mf-print-path'); marked.push(el); }
  for (let el = frameEl; el && el.parentElement && el !== doc.body; el = el.parentElement) {
    for (const sib of el.parentElement.children) if (sib !== el && !sib.hasAttribute('data-mf-print-hide')) { sib.setAttribute('data-mf-print-hide', ''); hidden.push(sib); }
  }
  frameEl.classList.add('mf-printing');
  const modes = docs.map((d) => ({ d, mode: d.documentElement.dataset.themeMode, shown: d.documentElement.dataset.modeShown }));
  for (const d of docs) { d.documentElement.dataset.mfPrinting = ''; d.documentElement.dataset.themeMode = 'light'; d.documentElement.dataset.modeShown = 'light'; }
  const light = modes.some((m) => m.mode !== 'light' || m.shown !== 'light');
  if (light) document.dispatchEvent(new CustomEvent('app:theme', { detail: { mode: 'light' } }));
  if (iframe && height > 0) iframe.style.setProperty('--mf-print-h', `${Math.ceil(height)}px`);
  return new Promise((resolve) => {
    let back = false;
    // Where print() returns before the printing is done (a phone's print sheet), the page goes back on afterprint; where
    // there is no afterprint, on the next thing the person does.
    const later = () => putBack();
    const putBack = () => {
      if (back) return;
      back = true;
      win.removeEventListener('afterprint', putBack);
      doc.removeEventListener('pointerdown', later, true);
      doc.removeEventListener('keydown', later, true);
      for (const el of marked) el.classList.remove('mf-print-path');
      for (const el of hidden) el.removeAttribute('data-mf-print-hide');
      frameEl.classList.remove('mf-printing');
      if (iframe) iframe.style.removeProperty('--mf-print-h');
      for (const { d, mode, shown } of modes) {
        delete d.documentElement.dataset.mfPrinting;
        if (mode) d.documentElement.dataset.themeMode = mode; else delete d.documentElement.dataset.themeMode;
        if (shown) d.documentElement.dataset.modeShown = shown; else delete d.documentElement.dataset.modeShown;
      }
      if (light) document.dispatchEvent(new CustomEvent('app:theme', { detail: { mode: modes[0].mode || modes[0].shown } }));
      resolve();
    };
    win.addEventListener('afterprint', putBack);
    // The light colours reach a module's frame by a message: two frames and a moment for it to draw them, then print.
    win.requestAnimationFrame(() => win.requestAnimationFrame(() => win.setTimeout(() => {
      try { win.print(); } catch { putBack(); return; }
      if (back) return;
      doc.addEventListener('pointerdown', later, true);
      doc.addEventListener('keydown', later, true);
    }, light ? 150 : 0)));
  });
}
