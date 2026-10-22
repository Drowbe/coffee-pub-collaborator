/* The Prototype page's script inside each screen (public/design-system/prototype/screens/*.htm, written by tools/prototype-build.mjs).
   A screen is the product's own markup with its scripts taken out; this puts back what markup does not keep and answers the page's
   switches. It is the only script a screen runs.

   On load: each module's shadow root gets its stylesheet (the SDK's host.css and system.css read from the product now, scoped as
   public/module-host.js scopes them, and the module's own part from prototype/styles/<hash>.txt); lists are scrolled back to where
   they were (data-proto-scroll), a dialog that was open as a modal is opened as one again (data-proto-modal), an open popover too;
   links and forms do nothing.

   Switches, from the address (?mode=light&theme=<id>&measure=1) and from the page by postMessage ({ proto: 'set', mode, theme,
   measure }), passed on to the frames inside: the mode (data-theme-mode and data-mode-shown on <html>, as public/theme-mode.js sets
   them), the theme (the stylesheet marked data-proto-theme) and the measure overlay.

   The measure overlay outlines every box that draws something (a fill, an edge or padding), with its height and its padding in px:
   "38 · 8 12" is 38px tall with 8px above and below and 12px left and right; when the top differs from the bottom or the left from the
   right, all four are shown (top right bottom left) and the label is marked. Boxes side by side in one row whose heights differ are
   marked "≠". Pointing at anything shows its full numbers. The counts are posted to the page ({ proto: 'measured', ... }) and kept in
   window.__protoMeasure for tools/check-prototype.mjs. */
(() => {
  'use strict';
  const PREFIX = '/design-system/prototype/';
  const html = document.documentElement;
  const params = new URLSearchParams(location.search);
  const state = { mode: params.get('mode') || 'dark', theme: params.get('theme') || 'strong-coffee', measure: params.get('measure') === '1' };

  // public/module-host.js's scopeCss (tools/check-prototype.mjs holds the two equal).
  const scopeCss = (text) => text.replace(/:root\s*\{[^}]*\}/g, '').replace(/(^|[\s,}])(html|body)(?=[\s,{.:[])/g, '$1:host');
  const texts = new Map();
  const read = (url) => {
    if (!texts.has(url)) texts.set(url, fetch(url).then((r) => (r.ok ? r.text() : '')).catch(() => ''));
    return texts.get(url);
  };
  const shadowRoots = (r = document, out = []) => { for (const e of r.querySelectorAll('*')) if (e.shadowRoot) { out.push(e.shadowRoot); shadowRoots(e.shadowRoot, out); } return out; };
  const deepAll = (sel) => { const out = [...document.querySelectorAll(sel)]; for (const r of shadowRoots()) out.push(...r.querySelectorAll(sel)); return out; };

  async function styleShadows() {
    const jobs = deepAll('style[data-proto-css]').map(async (st) => {
      const parts = st.getAttribute('data-proto-css').split(/\s+/);
      const own = parts.pop();
      const sdk = parts.includes('sdk') ? scopeCss(await read('/sdk/host.css')) + '\n' + scopeCss(await read('/sdk/system.css')) + '\n' : '';
      st.textContent = sdk + await read(`${PREFIX}styles/${own}.txt`);
    });
    await Promise.all(jobs);
  }

  function putBack() {
    for (const d of deepAll('dialog[data-proto-modal]')) { try { d.removeAttribute('open'); d.showModal(); } catch (e) { d.setAttribute('open', ''); } }
    for (const p of deepAll('[data-proto-popover]')) { try { p.showPopover(); } catch (e) { /* not a popover here */ } }
    for (const e of [html, ...deepAll('[data-proto-scroll]')]) {
      const v = e.getAttribute('data-proto-scroll');
      if (!v) continue;
      const [top, left] = v.split(',').map(Number);
      const el = e === html ? document.scrollingElement || html : e;
      el.scrollTop = top; el.scrollLeft = left;
    }
  }

  // A picture of a moment: nothing navigates and nothing is sent.
  document.addEventListener('click', (e) => { const a = e.composedPath().find((n) => n.localName === 'a' && n.hasAttribute && n.hasAttribute('href')); if (a) e.preventDefault(); }, true);
  document.addEventListener('submit', (e) => e.preventDefault(), true);

  const frames = () => [...document.querySelectorAll('iframe')];
  function apply() {
    html.dataset.themeMode = state.mode;
    html.dataset.modeShown = state.mode;
    const link = document.querySelector('link[data-proto-theme]');
    const href = `${PREFIX}themes/${state.theme}.css`;
    if (link && link.getAttribute('href') !== href) link.setAttribute('href', href);
    for (const f of frames()) { try { f.contentWindow.postMessage({ proto: 'set', ...state }, '*'); } catch (e) { /* not loaded */ } }
    measure(state.measure);
  }

  window.addEventListener('message', (e) => {
    const m = e.data;
    if (!m || typeof m !== 'object') return;
    if (m.proto === 'set') {
      for (const k of ['mode', 'theme']) if (typeof m[k] === 'string' && /^[a-z0-9-]+$/.test(m[k])) state[k] = m[k];
      if (typeof m.measure === 'boolean') state.measure = m.measure;
      apply();
    } else if (m.proto === 'ready' && e.source) {
      // A frame inside this screen has loaded: it takes this screen's switches.
      try { e.source.postMessage({ proto: 'set', ...state }, '*'); } catch (err) { /* gone */ }
    } else if (m.proto === 'measured' && e.source !== window) {
      childCounts.set(e.source, m);
      report();
    }
  });

  // ---- the measure overlay ----
  const childCounts = new Map();
  let layer = null; let tip = null; let drawn = { boxes: 0, labels: 0, lopsided: 0, unequal: 0 };
  const px = (v) => Math.round(parseFloat(v) * 10) / 10 || 0;
  const n = (v) => String(Math.round(v * 10) / 10);
  const LAYER_CSS = `
#proto-measure { position: fixed; inset: 0; z-index: 2147483646; pointer-events: none; font: 600 9px/1 ui-monospace, Menlo, monospace; }
#proto-measure .pm-box { position: absolute; box-sizing: border-box; border: 1px solid color-mix(in srgb, var(--accent-fill) 70%, transparent); }
#proto-measure .pm-box.pm-odd { border-color: var(--status-danger-text); border-style: dashed; }
#proto-measure .pm-label { position: absolute; padding: 1px 2px; border-radius: 2px; white-space: nowrap; background: color-mix(in srgb, var(--surface-page) 85%, transparent); color: var(--text-primary); }
#proto-measure .pm-label.pm-odd { background: var(--status-danger-text); color: var(--surface-page); }
#proto-measure .pm-label.pm-unequal { box-shadow: 0 0 0 1px var(--status-warn-text); }
#proto-tip { position: fixed; z-index: 2147483647; pointer-events: none; max-width: 320px; padding: 6px 8px; border-radius: 4px; background: var(--surface-panel); color: var(--text-primary); border: 1px solid var(--edge-hairline); font: 11px/1.4 ui-monospace, Menlo, monospace; white-space: pre; }
#proto-hl { position: fixed; z-index: 2147483646; pointer-events: none; box-sizing: border-box; outline: 2px solid var(--accent-fill); }`;

  // The element drawn at a point, through shadow roots.
  const deepAt = (x, y) => { let el = document.elementFromPoint(x, y); while (el && el.shadowRoot) { const inner = el.shadowRoot.elementFromPoint(x, y); if (!inner || inner === el) break; el = inner; } return el; };
  const holds = (e, hit) => { for (let n = hit; n; n = n.parentNode || n.host) if (n === e) return true; return false; };
  function onTop(e, rect) {
    const xs = [rect.left + 2, rect.left + rect.width / 2, rect.right - 2].map((x) => Math.min(innerWidth - 1, Math.max(0, x)));
    const ys = [rect.top + 2, rect.top + rect.height / 2, rect.bottom - 2].map((y) => Math.min(innerHeight - 1, Math.max(0, y)));
    for (const x of xs) for (const y of ys) { const hit = deepAt(x, y); if (hit && holds(e, hit)) return true; }
    return false;
  }

  function boxesOf() {
    const out = [];
    const vw = innerWidth; const vh = innerHeight;
    const visit = (r) => {
      for (const e of r.querySelectorAll('*')) {
        if (e.shadowRoot) visit(e.shadowRoot);
        if (e.closest && e.closest('#proto-measure')) continue;
        const tag = e.localName;
        if (tag === 'style' || tag === 'link' || tag === 'template' || tag === 'br' || tag === 'i' || tag === 'svg' || tag === 'path' || tag === 'option') continue;
        const rect = e.getBoundingClientRect();
        if (rect.width < 16 || rect.height < 12 || rect.bottom <= 0 || rect.right <= 0 || rect.top >= vh || rect.left >= vw) continue;
        const cs = getComputedStyle(e);
        if (cs.display === 'inline' || cs.display === 'contents' || cs.visibility !== 'visible' || Number(cs.opacity) === 0) continue;
        const pad = [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(px);
        const border = [cs.borderTopWidth, cs.borderRightWidth, cs.borderBottomWidth, cs.borderLeftWidth].map(px);
        const bg = cs.backgroundColor;
        const fills = (bg && bg !== 'transparent' && !/rgba\([^)]*,\s*0\)$/.test(bg)) || cs.backgroundImage !== 'none';
        if (!fills && !border.some(Boolean) && !pad.some(Boolean)) continue;
        // Only what can be seen: a box under another one (a window floating over a column) is left out.
        if (!onTop(e, rect)) continue;
        out.push({ e, rect, pad, border, cs });
      }
    };
    visit(document);
    return out.slice(0, 2500);
  }

  function draw() {
    if (!layer) return;
    layer.textContent = '';
    const boxes = boxesOf();
    // Boxes side by side in one row (same parent, overlapping vertically, apart horizontally) whose heights differ.
    const byParent = new Map();
    for (const b of boxes) { const p = b.e.parentNode; if (!byParent.has(p)) byParent.set(p, []); byParent.get(p).push(b); }
    const unequal = new Set();
    for (const list of byParent.values()) {
      if (list.length < 2) continue;
      for (const a of list) for (const b of list) {
        if (a === b) continue;
        const sideBySide = a.rect.right <= b.rect.left + 1 || b.rect.right <= a.rect.left + 1;
        const sameRow = a.rect.top < b.rect.bottom && b.rect.top < a.rect.bottom;
        if (sideBySide && sameRow && Math.abs(a.rect.height - b.rect.height) > 0.5) { unequal.add(a); unequal.add(b); }
      }
    }
    let lopsided = 0; let labels = 0;
    const frag = document.createDocumentFragment();
    for (const b of boxes) {
      const [t, r, bt, l] = b.pad;
      const odd = Math.abs(t - bt) > 0.5 || Math.abs(l - r) > 0.5;
      if (odd) lopsided++;
      const box = document.createElement('div');
      box.className = 'pm-box' + (odd ? ' pm-odd' : '');
      Object.assign(box.style, { left: `${b.rect.left}px`, top: `${b.rect.top}px`, width: `${b.rect.width}px`, height: `${b.rect.height}px` });
      frag.appendChild(box);
      const label = document.createElement('div');
      label.className = 'pm-label' + (odd ? ' pm-odd' : '') + (unequal.has(b) ? ' pm-unequal' : '');
      const padText = !b.pad.some(Boolean) ? '' : odd ? ` · ${n(t)} ${n(r)} ${n(bt)} ${n(l)}` : ` · ${n(t)} ${n(l)}`;
      label.textContent = `${unequal.has(b) ? '≠' : ''}${n(b.rect.height)}${padText}`;
      Object.assign(label.style, { left: `${Math.max(0, b.rect.left)}px`, top: `${Math.max(0, b.rect.top)}px` });
      frag.appendChild(label);
      labels++;
    }
    layer.appendChild(frag);
    drawn = { boxes: boxes.length, labels, lopsided, unequal: unequal.size };
    report();
  }

  function report() {
    const total = { ...drawn };
    for (const c of childCounts.values()) for (const k of Object.keys(total)) total[k] += Number(c[k]) || 0;
    window.__protoMeasure = state.measure ? { on: true, own: { ...drawn }, ...total } : { on: false, boxes: 0, labels: 0, lopsided: 0, unequal: 0 };
    if (parent !== window) parent.postMessage({ proto: 'measured', ...window.__protoMeasure }, '*');
  }

  let pending = 0;
  const redraw = () => { if (pending) return; pending = requestAnimationFrame(() => { pending = 0; draw(); }); };
  function pointAt(e) {
    if (!state.measure || !tip) return;
    const el = deepAt(e.clientX, e.clientY);
    if (!el || el === html || el === document.body) { tip.hidden = true; hl.hidden = true; return; }
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    const four = (a) => a.map((k) => n(px(cs[k]))).join(' ');
    const cls = typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    tip.textContent = `${el.localName}${el.id ? '#' + el.id : ''}${cls}\n${n(r.width)} × ${n(r.height)}\npadding ${four(['paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft'])}\nborder  ${four(['borderTopWidth', 'borderRightWidth', 'borderBottomWidth', 'borderLeftWidth'])}\nmargin  ${four(['marginTop', 'marginRight', 'marginBottom', 'marginLeft'])}${cs.display.includes('flex') || cs.display.includes('grid') ? `\ngap     ${cs.rowGap} ${cs.columnGap}` : ''}\nfont    ${cs.fontSize} / ${cs.lineHeight} ${cs.fontWeight}`;
    tip.hidden = false;
    const x = Math.min(e.clientX + 14, innerWidth - 330); const y = e.clientY + 14 > innerHeight - 140 ? e.clientY - 140 : e.clientY + 14;
    Object.assign(tip.style, { left: `${Math.max(4, x)}px`, top: `${Math.max(4, y)}px` });
    Object.assign(hl.style, { left: `${r.left}px`, top: `${r.top}px`, width: `${r.width}px`, height: `${r.height}px` });
    hl.hidden = false;
  }
  let hl = null;
  function measure(on) {
    if (on && !layer) {
      const st = document.createElement('style'); st.id = 'proto-measure-css'; st.textContent = LAYER_CSS; document.head.appendChild(st);
      layer = document.createElement('div'); layer.id = 'proto-measure'; layer.setAttribute('aria-hidden', 'true');
      tip = document.createElement('div'); tip.id = 'proto-tip'; tip.hidden = true;
      hl = document.createElement('div'); hl.id = 'proto-hl'; hl.hidden = true;
      html.append(layer, hl, tip);
      addEventListener('scroll', redraw, true);
      addEventListener('resize', redraw);
      addEventListener('mousemove', pointAt, true);
      addEventListener('mouseleave', () => { if (tip) { tip.hidden = true; hl.hidden = true; } });
      draw();
    } else if (!on && layer) {
      layer.remove(); tip.remove(); hl.remove(); document.getElementById('proto-measure-css')?.remove();
      layer = null; tip = null; hl = null;
      removeEventListener('scroll', redraw, true); removeEventListener('resize', redraw); removeEventListener('mousemove', pointAt, true);
      drawn = { boxes: 0, labels: 0, lopsided: 0, unequal: 0 };
      report();
    } else if (on) draw();
  }

  async function start() {
    html.dataset.themeMode = state.mode; html.dataset.modeShown = state.mode;
    await styleShadows();
    try { await document.fonts.ready; } catch (e) { /* none */ }
    putBack();
    apply();
    html.setAttribute('data-proto-ready', '');
    if (parent !== window) parent.postMessage({ proto: 'ready' }, '*');
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
