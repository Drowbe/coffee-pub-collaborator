/*
 * check-design-system-fields.mjs -- the Fields and forms family of the proposed design system page (public/design-system/proposed-fields.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls browserChecks (listed in tools/check-design-system-families.json) at each width and mode.
 *
 * Fails on: every field one-line 38px (44px at 390, and in the 44px grid), the focus a 2px accent edge and a 2px ring (all four sides the same at 1.25x and 1.5x
 * with a fractional scroll), the calendar button inside the date field (equal inset, 30px, a 44px target on a phone, ink centred with the text), the
 * placeholder the --text-dim colour, hover a fill, disabled half strength with a not-allowed cursor, error the danger edge, a tick box 16px and a
 * switch 36 by 20, the text of a filled field within 1px of the middle of its box (4x ink, in Figtree and in its fallback face); the only coloured edges
 * are a focus and an error.
 */
export const id = 'fields';
// Classes of Today's form markup that the proposal draws as it is (the layout of rows and columns stays in the form block of style.css and host.css).
export const todayOnly = ['sdk-form', 'sdk-field', 'sdk-full', 'sdk-label', 'sdk-group', 'sdk-row', 'sdk-s', 'sdk-m', 'sdk-l', 'sdk-unit', 'sdk-checks', 'sdk-section', 'sdk-section-title'];

export async function browserChecks(b) {
  const { ev, cdp, sessionId, sc, where, problems, inkCentre, edgeColours } = b;
  // The Fields and forms family.
  { const fp = JSON.parse(await ev(`(${fieldProbe.toString()})()`)); for (const x of fp.problems) problems.push(`${where}: ${x}`);
    if (!/^(3px|5px|7px|11px|999px)/.test(fp.radius0 || '')) problems.push(`${where}: the field radius is not a token value (${fp.radius0})`);
    // The ink of a filled field, in Figtree and in its fallback face: within 1px of the middle of the box, one-line fields only.
    for (const face of ['figtree', 'fallback']) {
      await ev(`(() => { for (const t of ['Fields, all states', 'Fields, all states, 44px']) { const d = window.__ds.frames.find((f) => f.iframe.title === t).iframe.contentDocument; let st = d.getElementById('ds-face'); if (!st) { st = d.createElement('style'); st.id = 'ds-face'; d.head.appendChild(st); } st.textContent = ${JSON.stringify(face === 'fallback' ? '.ds-proposed input, .ds-proposed select { font-family: "Figtree Fallback", Arial, sans-serif !important; }' : '')}; } })()`);
      await new Promise((r) => setTimeout(r, 400));
      for (const [title, rowsToDo] of [['Fields, all states', [[0, 'text'], [2, 'list'], [3, 'number'], [5, 'time'], [6, 'search']]], ['Fields, all states, 44px', [[0, 'text'], [3, 'number']]]]) {
        for (const [r, nm] of rowsToDo) {
          const { png: pngF } = await b.shotAt(title, `d.querySelectorAll('.pm-row')[${r}].querySelectorAll('.dsf-state')[3].querySelector('input,select')`); // the field itself on a whole pixel, across and down
          const c = inkCentre(pngF, 4, 10); // a field has a 1px edge and rounded corners: look 2.5px in
          if (c === null) problems.push(`${where}: no ink found in the filled ${nm} field (${title}, ${face})`);
          else if (Math.abs(c) > 1.01) problems.push(`${where}: the text of the filled ${nm} field is ${Math.abs(c).toFixed(2)}px ${c > 0 ? 'low' : 'high'} in its box (${title}, ${face})`);
        }
      }
    }
    await ev(`(() => { for (const f of window.__ds.frames) { const s = f.iframe.contentDocument && f.iframe.contentDocument.getElementById('ds-face'); if (s) s.remove(); } })()`);
    // The date field: the text and the calendar icon each sit within 1px of the middle of the field's height, by ink (4x).
    for (const [title, part] of [['Fields, all states', 'text'], ['Fields, all states', 'icon'], ['Fields, all states, 44px', 'text'], ['Fields, all states, 44px', 'icon']]) {
      // the field on a whole pixel, then the part of its width: the text (up to 4px short of the button) or the button's own box
      const { png: pngD } = await b.shotAt(title, `d.querySelectorAll('.pm-row')[4].querySelectorAll('.dsf-state')[3].querySelector('input')`, '', `(el, b) => { const q = el.parentElement.querySelector('.sdk-field-btn').getBoundingClientRect(); return ${part === 'icon' ? '[q.left, q.right]' : '[b.left, q.left - 4]'}; }`);
      const c = inkCentre(pngD, 4, 10);
      if (c === null) problems.push(`${where}: no ink found in the date ${part} (${title})`);
      else if (Math.abs(c) > 1.01) problems.push(`${where}: the date ${part} is ${Math.abs(c).toFixed(2)}px ${c > 0 ? 'low' : 'high'} in its field (${title})`);
    }
  }
  // The focus and error edge of a field: all four sides the same at a fractional device pixel ratio and a fractional scroll offset
  // (Windows display scaling 125% / 150%). A hairline is drawn per side and snaps differently; the edge must stay whole on every side.
  if (sc.width >= 500) {
    for (const dsf of [1.25, 1.5]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: dsf, mobile: false }, sessionId);
      await new Promise((r) => setTimeout(r, 400));
      for (const [nm, idx, tokName] of [['focused', 2, '--accent'], ['error', 6, '--danger']]) {
        for (const nudge of [0.3, 0.7]) {
          const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Fields, all states'); const d = m.iframe.contentDocument; const el = d.querySelectorAll('.pm-row')[0].querySelectorAll('.dsf-state')[${idx}].querySelector('input'); el.scrollIntoView({ block: 'center', behavior: 'instant' });
            const c = document.getElementById('ds-content'); c.style.marginTop = '${nudge}px'; c.style.marginLeft = '${nudge * 1.7 % 1}px'; window.scrollTo(0, Math.round(window.scrollY) + ${nudge}); await new Promise((r) => setTimeout(r, 150));
            const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style.color = 'var(${tokName})'; host.appendChild(p); const col = getComputedStyle(p).color; p.remove();
            const b = el.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height, col }); })()`));
          const pad = 6;
          const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x - pad, y: at.y - pad, width: at.w + pad * 2, height: at.h + pad * 2, scale: 1 } }, sessionId);
          const e = edgeColours(Buffer.from(shot.data, 'base64'), at.col.match(/[\d.]+/g).map(Number), dsf, pad, at.w, at.h);
          const vals = Object.values(e);
          if (Math.max(...vals) - Math.min(...vals) > 40) problems.push(`${where}: the ${nm} field edge is not the same on all four sides at ${dsf}x with the page ${nudge}px off the pixel grid (how far the nearest pixel is from the full colour: top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
          if (Math.max(...vals) > 60) problems.push(`${where}: a side of the ${nm} field edge never reaches its full colour at ${dsf}x (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
        }
      }
      await ev(`(() => { const c = document.getElementById('ds-content'); c.style.marginTop = ''; c.style.marginLeft = ''; })()`);
    }
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
    await new Promise((r) => setTimeout(r, 300));
  }
}


// The Fields and forms family, measured in the page (runs in the browser): sizes, the ring, the placeholder colour, the states, the marks.
const fieldProbe = async () => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  for (const [title, forced] of [['Fields, all states', 0], ['Fields, all states, 44px', 44]]) {
    const d = get(title); if (!d) { bad(`no frame ${title}`); continue; }
    const cs = (x, p) => getComputedStyle(x, p); const host = d.querySelector('.ds-proposed');
    const tok = (n) => { const p = d.createElement('span'); p.style.color = `var(${n})`; host.appendChild(p); const c = cs(p).color; p.remove(); return c; };
    const rows = [...d.querySelectorAll('.pm-row')]; const cell = (r, s) => rows[r].querySelectorAll('.dsf-state')[s];
    const want = forced || (d.defaultView.innerWidth <= 640 ? 44 : 38);
    // heights: text, list, number, date (and its group), time, search, file, colour, slider
    for (const [r, s, nm] of [[0, 3, 'text'], [2, 3, 'list'], [3, 3, 'number'], [4, 3, 'date'], [5, 3, 'time'], [6, 3, 'search'], [7, 0, 'file'], [8, 0, 'colour'], [9, 0, 'slider']]) {
      const el = cell(r, s).querySelector('input,select'); const h = el.getBoundingClientRect().height;
      if (Math.abs(h - want) > 0.6) bad(`${title}: the ${nm} field is ${h}px, expected ${want}`);
    }
    const ta = cell(1, 3).querySelector('textarea').getBoundingClientRect().height; if (ta < want * 1.9) bad(`${title}: the text area is only ${ta}px`);
    const rest = cell(0, 0).querySelector('input'); const hov = cell(0, 1).querySelector('input'); const foc = cell(0, 2).querySelector('input');
    const dis = cell(0, 5).querySelector('input'); const err = cell(0, 6).querySelector('input'); const ro = cell(0, 7).querySelector('input');
    if (cs(rest).borderTopColor !== tok('--border') || cs(rest).borderTopWidth !== '1px') bad(`${title}: the rest edge is not the 1px --border hairline (${cs(rest).borderTopWidth} ${cs(rest).borderTopColor})`);
    if (cs(rest).backgroundColor !== tok('--bg-input')) bad(`${title}: the rest fill is not --bg-input`);
    if (cs(hov).backgroundColor === cs(rest).backgroundColor) bad(`${title}: the forced hover does not change the fill`);
    if (cs(hov).borderTopColor !== cs(rest).borderTopColor) bad(`${title}: hover changes the edge colour`);
    if (cs(foc).borderTopColor !== tok('--accent')) bad(`${title}: the focus edge is not --accent (${cs(foc).borderTopColor})`);
    if (!/\b2px\b/.test(cs(foc).boxShadow) || cs(foc).boxShadow === 'none') bad(`${title}: the focus shows no 2px ring (${cs(foc).boxShadow})`);
    if (cs(dis).opacity !== '0.5' || cs(dis).cursor !== 'not-allowed') bad(`${title}: disabled is not half strength with a not-allowed cursor (${cs(dis).opacity}, ${cs(dis).cursor})`);
    if (cs(err).borderTopColor !== tok('--danger') || err.getAttribute('aria-invalid') !== 'true') bad(`${title}: the error edge is not --danger on an aria-invalid field`);
    if (!cell(0, 6).querySelector('.sdk-error')) bad(`${title}: the error state has no error line`);
    if (cs(ro).backgroundColor !== 'rgba(0, 0, 0, 0)') bad(`${title}: read-only is not without a fill`);
    // The date field: the calendar button sits INSIDE the field's box (one field), at the trailing edge, 30px or less, with the same inset above, below and right;
    // the field keeps its height and the text never runs under the button.
    { const dEl = cell(4, 3).querySelector('input'); const dBtn = cell(4, 3).querySelector('.sdk-field-btn');
      if (!dBtn) bad(`${title}: the date field has no .sdk-field-btn`);
      else { const f = dEl.getBoundingClientRect(); const q = dBtn.getBoundingClientRect(); const grp = dEl.parentElement.getBoundingClientRect();
        if (q.left < f.left - 0.5 || q.right > f.right + 0.5 || q.top < f.top - 0.5 || q.bottom > f.bottom + 0.5) bad(`${title}: the calendar button is not inside the date field's box`);
        if (q.width > 30.6 || q.height > 30.6) bad(`${title}: the calendar button is ${q.width} by ${q.height}px, over 30`);
        const t = q.top - f.top; const b2 = f.bottom - q.bottom; const r2 = f.right - q.right;
        if (Math.abs(t - b2) > 0.6 || Math.abs(t - r2) > 0.6) bad(`${title}: the calendar button's inset is not equal (top ${t}, bottom ${b2}, right ${r2})`);
        if (Math.abs(grp.height - want) > 0.6 || Math.abs(f.height - want) > 0.6) bad(`${title}: the date field is ${f.height}px in a ${grp.height}px group, expected ${want}`);
        const padR = parseFloat(cs(dEl).paddingRight); if (f.right - padR > q.left + 0.5) bad(`${title}: the date text can run under the calendar button (padding-right ${padR}px, the button starts ${(f.right - q.left).toFixed(1)}px from the right edge)`);
        const hit = want === 44 && d.defaultView.innerWidth <= 640 ? 44 : 0; if (hit) { const a = cs(dBtn, '::after'); const hw = q.width + 14; const hh = q.height + 14; if (a.content === 'none' || Math.abs(parseFloat(a.width) - hw) > 1 || Math.abs(parseFloat(a.height) - hh) > 1) bad(`${title}: the calendar button has no 44px target on a phone (${a.width} by ${a.height})`); } } }
    const dim = tok('--text-dim');
    for (const [r, nm] of [[0, 'text'], [1, 'text area'], [3, 'number'], [6, 'search']]) { const el = cell(r, 4).querySelector('input,textarea'); if (cs(el, '::placeholder').color !== dim) bad(`${title}: the ${nm} placeholder is ${cs(el, '::placeholder').color}, not --text-dim (${dim})`); }
    if (cs(rest).fontFamily.indexOf('Figtree') < 0 && window.__ds.stats.fontNow !== 'x') { /* only when a font is chosen */ }
    out['radius' + forced] = cs(rest).borderTopLeftRadius;
  }
  const c = get('Tick box, radio and switch, all states');
  if (!c) bad('no tick box frame');
  else {
    const cs = (x) => getComputedStyle(x); const host = c.querySelector('.ds-proposed');
    const accent = (() => { const p = c.createElement('span'); p.style.color = 'var(--accent)'; host.appendChild(p); const v = cs(p).color; p.remove(); return v; })();
    const rows = [...c.querySelectorAll('.pm-row')]; const inp = (r, s) => rows[r].querySelectorAll('.dsf-state')[s].querySelector('input');
    for (const [r, nm, w, h] of [[0, 'tick box', 16, 16], [1, 'radio', 16, 16], [2, 'switch', 36, 20]]) {
      const b = inp(r, 0).getBoundingClientRect(); if (Math.abs(b.width - w) > 0.6 || Math.abs(b.height - h) > 0.6) bad(`the ${nm} is ${b.width} by ${b.height}px, expected ${w} by ${h}`);
      if (cs(inp(r, 3)).backgroundColor !== accent) bad(`the checked ${nm} is not the --accent fill`);
      if (cs(inp(r, 0)).backgroundColor === cs(inp(r, 3)).backgroundColor) bad(`the ${nm} looks the same on and off`);
      if (!(/solid/.test(cs(inp(r, 2)).outline) && /\b2px\b/.test(cs(inp(r, 2)).outline))) bad(`the focused ${nm} shows no 2px ring (${cs(inp(r, 2)).outline})`);
      if (cs(inp(r, 5)).opacity !== '0.5' || cs(inp(r, 5)).cursor !== 'not-allowed') bad(`the disabled ${nm} is not half strength with a not-allowed cursor`);
    }
    if (inp(2, 0).getAttribute('role') !== 'switch') bad('the switch has no role="switch"');
  }
  return JSON.stringify(out);
};
