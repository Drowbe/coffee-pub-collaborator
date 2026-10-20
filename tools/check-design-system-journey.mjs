/*
 * check-design-system-journey.mjs -- the Journey bar family (the status strip, the phases and the countdown) of the proposed design system page
 * (public/design-system/proposed-journey.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a strip that is not 44px (28px on a phone, with the 2px journey line along its foot), a header chip that is not 28px (the phone's slim line keeps them under 28),
 * a countdown without the 22% accent fill or with a number that is not 16px weight 600, a fact whose fill is not its share, an attention pill that is solid or round or whose count is
 * not the 18px Chips count, a band that is not 24px with the medium corner and a 1px --border hairline, a band fill that is not the tint at 12% (past) or 22% (ahead), a current band
 * that is not --selected-bg with the accent-mix name and the text "Now", an off band that is not a dashed neutral hairline, names that do not drop below 760px (and the facts), a today
 * pin that is not 28px round in the micro fill with its label as its name, a Set up band that is not 58px or that keeps a coloured top edge, a ring or a shadow, a phase tag that is
 * not the Chips tag, a rail that is not 6px, a cap that is not a heading with its own icon (stacked at a joint, the ending one first, wrapping, no end cap when a phase has no end),
 * a weight other than 400, 500 and 600 or text under 11px, a coloured one-sided edge or a coloured block under 5px outside the journey line, a focus that is not a 2px outline inside
 * the chip (the same on all four sides at 1.25x and 1.5x), a label more than 1px off the middle of its chip, a contrast pair under its minimum, an alias that does not look like the
 * new name, a frame that scrolls sideways, the family not marked Approved, the undecided name still listed; in the stylesheet: a hex colour, a colour written out, a gradient other than
 * the dashed today line, a shadow other than none and the pin's ring, a side border other than the divider, a weight over 600, a font size under 11px (the micro pin excepted), a name not defined.
 */
export const id = 'journey';
export const todayOnly = [];

export function staticChecks({ fail, css, js, defined }) {
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-journey.css: a hex colour (tokens only)');
  if (/rgba?\(/.test(css)) fail('proposed-journey.css: a colour written out (tokens only)');
  const grads = css.match(/gradient\(/g) || []; if (grads.length !== 1 || !/\.sdk-phase-today, \.phase-today\) \{[^}]*linear-gradient\(var\(--text\) 50%, transparent 50%\)/.test(css)) fail('proposed-journey.css: a gradient other than the Set up band\'s dashed today line');
  for (const m of css.matchAll(/box-shadow\s*:\s*([^;]+);/g)) if (!/^(none|0 0 0 2px var\(--header-bg\))$/.test(m[1].trim())) fail(`proposed-journey.css: box-shadow ${m[1].trim()} (only none, and the pin's 2px ring in the header colour)`);
  for (const m of css.matchAll(/border-(left|right|top|bottom)\s*:\s*([^;]+);/g)) {
    if (/left|right/.test(m[1])) fail(`proposed-journey.css: border-${m[1]} (a side edge is a bar)`);
    else if (!/^(1px solid var\(--border\)|0)$/.test(m[2].trim())) fail(`proposed-journey.css: border-${m[1]}: ${m[2].trim()} (only the 1px --border divider)`);
  }
  for (const m of css.matchAll(/font-weight\s*:\s*(\d+)/g)) if (Number(m[1]) > 600) fail(`proposed-journey.css: font-weight ${m[1]} (the weights are 400, 500 and 600)`);
  for (const m of css.matchAll(/font-size\s*:\s*(\d+)px/g)) if (Number(m[1]) < 11) fail(`proposed-journey.css: font-size ${m[1]}px (nothing under 11px)`);
  if (/border-top\s*:\s*[2-9]px/.test(css) || /inset 0 0 0 2px/.test(css)) fail('proposed-journey.css: a 4px top edge or an inset ring is back');
  if (!/--status-strip-h:\s*44px/.test(css) || !/--status-strip-slim-h:\s*28px/.test(css) || !/--jr-chip-h:\s*28px/.test(css) || !/--jr-band-h:\s*24px/.test(css) || !/--jr-pin:\s*28px/.test(css) || !/--jr-phase-h:\s*58px/.test(css) || !/--jr-line:\s*2px/.test(css) || !/--jr-rail:\s*6px/.test(css)) fail('proposed-journey.css: a size token is not its value (strip 44 and 28, chip 28, band 24, pin 28, Set up 58, line 2, rail 6)');
  if (!/--jr-past:\s*12%/.test(css) || !/--jr-ahead:\s*22%/.test(css) || !/--jr-count:\s*22%/.test(css)) fail('proposed-journey.css: the band fills are not 12% (past) and 22% (ahead), the countdown 22%');
  for (const c of ['sdk-strip', 'sdk-strip-said', 'sdk-strip-chip', 'sdk-strip-phase', 'sdk-strip-dot', 'sdk-strip-sentence', 'sdk-strip-count', 'sdk-strip-count-n', 'sdk-strip-count-words', 'sdk-strip-facts', 'sdk-strip-fact', 'sdk-strip-fact-fill',
    'sdk-strip-fact-text', 'sdk-strip-attn', 'sdk-journey', 'sdk-band', 'sdk-band-box', 'sdk-band-name', 'sdk-band-icon', 'sdk-band-now', 'sdk-today', 'sdk-phase-strip', 'sdk-phase-bands', 'sdk-phase-band', 'sdk-phase-band-label', 'sdk-phase-band-span',
    'sdk-phase-band-now', 'sdk-phase-today', 'sdk-phase-today-word', 'sdk-phase', 'sdk-phase-days', 'sdk-phase-gap', 'sdk-rail', 'sdk-cap', 'sdk-cap-end', 'sdk-cap-icon', 'sdk-cap-meta',
    'status-strip', 'status-said', 'status-facts', 'phase-chip', 'phase-dot', 'phase-chip-label', 'status-togo', 'status-togo-days', 'status-togo-words', 'status-fact', 'status-fact-fill', 'status-fact-text', 'attention-count', 'status-attention',
    'status-track', 'status-band', 'status-band-box', 'status-band-name', 'status-band-icon', 'status-today', 'phase-strip', 'phase-bands', 'phase-band', 'phase-band-label', 'phase-band-span', 'phase-band-now', 'phase-today', 'phase-tag', 'phase-tag-now', 'lit']) {
    if (!defined.has(c)) fail(`the proposed stylesheets do not define the journey name .${c} (a new name or a kept alias)`);
  }
  if (!/ds-st-approved/.test(js) || /ds-st-proposed/.test(js)) fail('proposed-journey.js: the family is not marked Approved');
}

export async function browserChecks(b) {
  const { ev, cdp, sessionId, sc, where, problems, inkCentre, edgeColours } = b;
  const cp = JSON.parse(await ev(`(${probe.toString()})()`));
  for (const x of cp.problems) problems.push(`${where}: ${x}`);
  // The label of a chip or a band, within 1px of the middle of its box (a 4x screenshot; the words are changed to ones with no descenders, as the Buttons' check does).
  for (const [title, sel, nm] of [['Journey, header chips', '.sdk-strip-phase', 'the phase chip'], ['Journey, header chips', '.sdk-strip-attn', 'the attention pill'], ['Journey, header chips', '.sdk-strip-count', 'the countdown'], ['Journey at 1280', '.sdk-band:not([data-state="current"]):not([data-state="off"])', 'a band']]) {
    if (title === 'Journey at 1280' && sc.width < 500) continue;
    const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === ${JSON.stringify(title)}); const el = m.iframe.contentDocument.querySelector(${JSON.stringify(sel)});
      for (const t of el.querySelectorAll('.sdk-strip-sentence, .sdk-strip-count-words, .sdk-band-name, .sdk-strip-attn > span:last-child')) t.textContent = 'Hello now';
      el.scrollIntoView({ block: 'center', behavior: 'instant' }); await new Promise((r) => setTimeout(r, 150));
      let b = el.getBoundingClientRect(); let fr = m.iframe.getBoundingClientRect(); const frac = (fr.top + window.scrollY) - Math.floor(fr.top + window.scrollY); m.iframe.style.position = 'relative'; if (frac > 0.01) { m.iframe.style.top = (1 - frac) + 'px'; await new Promise((r) => setTimeout(r, 120)); b = el.getBoundingClientRect(); fr = m.iframe.getBoundingClientRect(); }
      return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height }); })()`));
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x, y: at.y, width: at.w, height: at.h, scale: 4 } }, sessionId);
    const c = inkCentre(Buffer.from(shot.data, 'base64'), 4, 10);
    if (c === null) problems.push(`${where}: no ink found in ${nm}`);
    else if (Math.abs(c) > 1.01) problems.push(`${where}: ${nm} is ${Math.abs(c).toFixed(2)}px ${c > 0 ? 'low' : 'high'} of the middle of its box`);
  }
  await ev(`(() => { for (const f of window.__ds.frames) { f.iframe.style.top = ''; f.iframe.style.position = ''; } })()`);
  // The focus ring of a chip: all four sides the same at a fractional device pixel ratio and page offset.
  if (sc.width >= 500) {
    for (const dsf of [1.25, 1.5]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: dsf, mobile: false }, sessionId);
      await new Promise((r) => setTimeout(r, 400));
      for (const nudge of [0.3, 0.7]) {
        const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Journey, header chips'); const d = m.iframe.contentDocument; const el = d.querySelector('.sdk-strip-count.ds-force-focus'); el.scrollIntoView({ block: 'center', behavior: 'instant' });
          const c = document.getElementById('ds-content'); c.style.marginTop = '${nudge}px'; c.style.marginLeft = '${nudge * 1.7 % 1}px'; window.scrollTo(0, Math.round(window.scrollY) + ${nudge}); await new Promise((r) => setTimeout(r, 150));
          const cv = document.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = getComputedStyle(el).outlineColor; g.fillRect(0, 0, 1, 1); const px = g.getImageData(0, 0, 1, 1).data;
          const b = el.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height, col: 'rgb(' + px[0] + ',' + px[1] + ',' + px[2] + ')' }); })()`));
        const pad = 6;
        const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x - pad, y: at.y - pad, width: at.w + pad * 2, height: at.h + pad * 2, scale: 1 } }, sessionId);
        const e = edgeColours(Buffer.from(shot.data, 'base64'), at.col.match(/[\d.]+/g).map(Number), dsf, pad, at.w, at.h);
        const vals = Object.values(e);
        if (Math.max(...vals) - Math.min(...vals) > 40) problems.push(`${where}: the focused chip outline is not the same on all four sides at ${dsf}x with the page ${nudge}px off the pixel grid (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
        if (Math.max(...vals) > 60) problems.push(`${where}: a side of the focused chip outline never reaches its full colour at ${dsf}x (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
      }
      await ev(`(() => { const c = document.getElementById('ds-content'); c.style.marginTop = ''; c.style.marginLeft = ''; })()`);
    }
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
    await new Promise((r) => setTimeout(r, 300));
  }
}

// Measured in the page (runs in the browser).
const probe = async () => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^Journey/.test(t));
  if (TITLES.length < 10) bad(`the Journey family has only ${TITLES.length} frames`);
  await wait(150);
  const tok = (d, expr, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = expr; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const bg = (d, expr) => tok(d, expr, 'backgroundColor');
  const cs = (e, p) => getComputedStyle(e, p);
  const phone = (d) => d.defaultView.innerWidth <= 640;
  const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 0.6 : t);
  const SIDES = ['Top', 'Right', 'Bottom', 'Left'];
  const TINT = (n, p) => `color-mix(in srgb, var(--tint-${n}) ${p}%, transparent)`;
  // ---- the strip at three widths ----
  for (const w of [1280, 700, 390]) {
    const d = get(`Journey at ${w}`); const win = d.defaultView.innerWidth; if (win !== w) bad(`Journey at ${w} is ${win} wide`);
    const s = d.querySelector('.sdk-strip'); const sr = s.getBoundingClientRect(); const ph = w <= 640;
    if (!near(sr.height, ph ? 28 : 44)) bad(`Journey at ${w}: the strip is ${sr.height}px, expected ${ph ? 28 : 44}`);
    if (cs(s).backgroundColor !== bg(d, 'var(--header-bg)')) bad(`Journey at ${w}: the strip is not --header-bg`);
    const chips = [...s.querySelectorAll('.sdk-strip-chip')].filter((c) => c.getBoundingClientRect().height > 0);
    if (!chips.length) bad(`Journey at ${w}: no header chips`);
    for (const c of chips) { const hh = c.getBoundingClientRect().height; if (ph ? hh >= 28 : !near(hh, 28)) bad(`Journey at ${w}: a header chip is ${hh}px, expected ${ph ? 'under 28 (the slim line)' : 28} (${c.className})`); if (cs(c).borderTopLeftRadius !== tok(d, 'var(--radius-small)', 'borderTopLeftRadius')) bad(`Journey at ${w}: a chip is not the small corner`); }
    const tr = s.querySelector('.sdk-journey'); const bands = [...tr.querySelectorAll('.sdk-band')];
    if (ph) { const r = tr.getBoundingClientRect(); if (!near(r.height, 2) || cs(tr).position !== 'absolute' || !near(sr.bottom - r.bottom, 0, 1)) bad('Journey at 390: the journey is not a 2px line along the strip\'s foot');
      if (cs(s.querySelector('.sdk-strip-count')).display !== 'none' || cs(s.querySelector('.sdk-strip-facts')).display !== 'none') bad('Journey at 390: the countdown or the facts are drawn on the slim line');
      const pin = s.querySelector('.sdk-today'); if (!near(pin.getBoundingClientRect().width, 8)) bad('Journey at 390: the today mark is not an 8px dot');
      if (!near(s.querySelector('.sdk-strip-dot').getBoundingClientRect().width, 8)) bad('Journey at 390: the phase dot is not 8px on the slim line'); }
    else {
      for (const bd of bands) { if (bd.dataset.state === 'off') continue; const r = bd.getBoundingClientRect(); if (!near(r.height, 24)) bad(`Journey at ${w}: a band is ${r.height}px, expected 24`);
        const c = cs(bd); if (c.borderTopLeftRadius !== tok(d, 'var(--radius-medium)', 'borderTopLeftRadius')) bad(`Journey at ${w}: a band is not --radius-medium`);
        for (const sd of SIDES) if (c['border' + sd + 'Width'] !== '1px' || c['border' + sd + 'Color'] !== tok(d, 'var(--border)') || c['border' + sd + 'Style'] !== 'solid') bad(`Journey at ${w}: a band has a ${sd.toLowerCase()} edge that is not the 1px --border hairline`);
        if (c.boxShadow !== 'none') bad(`Journey at ${w}: a band has a shadow or a ring`); }
      const past = bands.find((x) => x.dataset.state === 'past'); const ahead = bands.find((x) => x.dataset.state === 'ahead'); const cur = bands.find((x) => x.dataset.state === 'current');
      if (cs(past).backgroundColor !== bg(d, TINT('blue', 12))) bad(`Journey at ${w}: a past band is not the tint at 12%`);
      if (cs(ahead).backgroundColor !== bg(d, TINT('teal', 22))) bad(`Journey at ${w}: an ahead band is not the tint at 22%`);
      if (cs(cur).backgroundColor !== bg(d, 'var(--selected-bg)')) bad(`Journey at ${w}: the current band is ${cs(cur).backgroundColor}, not --selected-bg`);
      if (cs(cur).color !== tok(d, 'color-mix(in srgb, var(--accent) 55%, var(--header-text))')) bad(`Journey at ${w}: the current band's name is not the accent mix`);
      if (!near(s.querySelector('.sdk-today').getBoundingClientRect().width, 28)) bad(`Journey at ${w}: the today pin is not 28px`);
      if (w >= 1000) { const wide = cur.getBoundingClientRect().width >= 140; const nowEl = cur.querySelector('.sdk-band-now'); if (cs(cur.querySelector('.sdk-band-name')).display === 'none' || !/^Now$/.test(nowEl.textContent) || (cs(nowEl).display === 'none') === wide) bad(`Journey at ${w}: the current band (${cur.getBoundingClientRect().width}px) does not show its name, and the text "Now" only when it is 140px or more`); }
      const off = bands.find((x) => x.dataset.state === 'off'); if (off) { const c = cs(off); if (c.borderTopStyle !== 'dashed' || c.borderTopColor !== tok(d, 'var(--border)') || c.backgroundColor !== 'rgba(0, 0, 0, 0)') bad('an off band is not a dashed neutral hairline'); } }
    // Names and facts give way at 760px.
    const names = [...s.querySelectorAll('.sdk-band-name')]; const shown = names.some((n) => cs(n).display !== 'none'); const facts = [...s.querySelectorAll('.sdk-strip-fact')].filter((f) => cs(f).display !== 'none' && cs(s.querySelector('.sdk-strip-facts')).display !== 'none');
    if (w > 760 && !shown) bad(`Journey at ${w}: the names in the bands are gone`); if (w <= 760 && shown) bad(`Journey at ${w}: the names in the bands are still drawn below 760px`);
    if (w > 760 && !facts.length) bad(`Journey at ${w}: no facts are drawn`); if (w <= 760 && facts.length) bad(`Journey at ${w}: the facts are still drawn below 760px`);
    if (w > 760 && tr.getBoundingClientRect().width < 380 && facts.length) bad(`Journey at ${w}: the journey bar is under 400px while facts are still drawn (they give way first)`);
    if (d.documentElement.scrollWidth > d.documentElement.clientWidth + 1) bad(`Journey at ${w}: scrolls sideways`);
  }
  // ---- the header chips ----
  { const d = get('Journey, header chips'); const chips = [...d.querySelectorAll('.sdk-strip-chip')]; if (chips.length < 24) bad(`the chips frame shows only ${chips.length} chips`);
    for (const c of chips) if (!near(c.getBoundingClientRect().height, 28)) bad(`a header chip is ${c.getBoundingClientRect().height}px, expected 28 (${c.className})`);
    const neutral = bg(d, 'color-mix(in srgb, var(--header-text) 8%, transparent)'); const rows = [...d.querySelectorAll('.pm-jr-row')];
    const [phase, hover, open, focus, press, dis] = [...rows[0].querySelectorAll('.sdk-strip-chip')];
    if (cs(phase).backgroundColor !== neutral) bad('the phase chip is not the neutral fill'); if (cs(hover).backgroundColor === cs(phase).backgroundColor) bad('the phase chip hover does not change the fill'); if (cs(press).backgroundColor === cs(hover).backgroundColor) bad('the phase chip pressed looks like hover');
    if (cs(open).backgroundColor !== bg(d, 'var(--selected-bg)')) bad('an open chip is not --selected-bg'); if (cs(focus).outlineWidth !== '2px' || cs(focus).outlineOffset !== '-2px' || cs(focus).outlineColor !== tok(d, 'var(--accent)')) bad('the chip focus is not a 2px outline at -2px in the accent');
    if (cs(dis).opacity !== '0.5') bad('a disabled chip is not half strength'); if (!near(phase.querySelector('.sdk-strip-dot').getBoundingClientRect().width, 10)) bad('the phase dot is not 10px');
    for (const c of chips) for (const sd of SIDES) if (cs(c)['border' + sd + 'Color'] !== 'rgba(0, 0, 0, 0)') bad('a header chip has a coloured edge');
    const cnt = [...rows[1].querySelectorAll('.sdk-strip-count')]; if (cs(cnt[0]).backgroundColor !== bg(d, 'color-mix(in srgb, var(--accent) 22%, transparent)')) bad('the countdown is not the 22% accent fill');
    const n = cs(cnt[0].querySelector('.sdk-strip-count-n')); if (n.fontSize !== '16px' || n.fontWeight !== '600') bad(`the countdown number is ${n.fontSize} weight ${n.fontWeight}, expected 16px 600`); if (cs(cnt[0].querySelector('.sdk-strip-count-words')).fontSize !== '13px') bad('the countdown words are not 13px');
    const facts = [...rows[2].querySelectorAll('.sdk-strip-fact')]; const f62 = facts[1]; const fill = f62.querySelector('.sdk-strip-fact-fill'); const share = fill.getBoundingClientRect().width / f62.getBoundingClientRect().width; if (!near(share, 0.62, 0.03)) bad(`the budget fact fills ${(share * 100).toFixed(0)}%, expected 62%`);
    if (cs(fill).backgroundColor !== bg(d, 'color-mix(in srgb, var(--accent) 22%, transparent)')) bad('the fact progress is not the accent at 22%');
    if (cs(facts[3]).backgroundColor !== neutral) bad('a fact is not the neutral fill');
    const at = [...rows[3].querySelectorAll('.sdk-strip-attn')]; const a = cs(at[0]); if (a.backgroundColor === tok(d, 'var(--accent)', 'backgroundColor') || a.borderTopLeftRadius !== tok(d, 'var(--radius-small)', 'borderTopLeftRadius')) bad('the attention pill is solid or round');
    if (a.backgroundColor !== bg(d, 'color-mix(in srgb, var(--warn, var(--tint-gold)) 18%, var(--header-bg))')) bad('the attention pill is not the warn tone fill');
    for (const p of at) { const badge = p.querySelector('.sdk-badge'); if (!near(badge.getBoundingClientRect().height, 18)) bad('the attention count is not the 18px count badge'); }
    if (!/99\+/.test(rows[3].textContent)) bad('the 99+ cap is not drawn'); }
  // ---- the band states, the pin ----
  { const d = get('Journey, band states'); const bars = [...d.querySelectorAll('.sdk-journey')]; if (bars.length < 12) bad('the band states frame shows too few journey bars');
    const first = bars[0]; { const cb = first.querySelector('[data-state="current"]'); const nw = cb && cb.querySelector('.sdk-band-now'); if (d.defaultView.innerWidth > 760 && cb.getBoundingClientRect().width >= 140 && (!nw || cs(nw).display === 'none')) bad('the current band in the states frame does not show the text "Now"'); }
    const off = first.querySelector('[data-state="off"]'); if (!off || cs(off).borderTopStyle !== 'dashed') bad('the off band is not drawn dashed');
    for (const sd of SIDES) if (cs(off)['border' + sd + 'Color'] !== tok(d, 'var(--border)')) bad('the off band is not a neutral hairline');
    const lead = bars[1]; const pin = lead.querySelector('.sdk-today'); const pr = pin.getBoundingClientRect(); const c = cs(pin);
    if (!near(pr.width, 28) || !near(pr.height, 28) || c.borderTopLeftRadius !== tok(d, 'var(--radius-round)', 'borderTopLeftRadius')) bad('the today pin is not a 28px round');
    if (c.backgroundColor !== bg(d, 'var(--micro-fill)') || c.color !== tok(d, 'var(--on-accent)')) bad('the today pin is not the micro count fill with --on-accent'); if (!/^Today,/.test(pin.getAttribute('aria-label') || '')) bad('the today pin has no label'); if (c.fontSize !== '13px' || c.fontWeight !== '600') bad('the today pin number is not 13px 600');
    const first2 = lead.querySelector('.sdk-band').getBoundingClientRect(); if (first2.left < pr.right - 0.5) bad('a lead pin overlaps the first band');
    const trail = bars[2]; const tb = [...trail.querySelectorAll('.sdk-band')].pop().getBoundingClientRect(); if (trail.querySelector('.sdk-today').getBoundingClientRect().left < tb.right - 0.5) bad('a trail pin overlaps the last band');
    const lit = d.querySelector('.sdk-band.lit'); const ahead = [...d.querySelectorAll('.sdk-band[data-state="ahead"]')].find((x) => x !== lit); if (cs(lit).backgroundColor === cs(ahead).backgroundColor) bad('a lit band is not a stronger fill');
    // the eight tints
    const names = ['gold', 'blue', 'green', 'teal', 'purple', 'red', 'orange', 'pink']; const tbars = bars.slice(-8);
    tbars.forEach((tb2, i) => { const bd = [...tb2.querySelectorAll('.sdk-band')]; if (cs(bd[0]).backgroundColor !== bg(d, TINT(names[i], 12)) || cs(bd[1]).backgroundColor !== bg(d, TINT(names[i], 22))) bad(`the ${names[i]} bands are not 12% and 22% of the tint`); }); }
  // ---- the Set up band ----
  { const d = get('Journey, set up band'); const bs = d.querySelector('.sdk-phase-bands'); if (!near(bs.getBoundingClientRect().height, 58)) bad(`the Set up band row is ${bs.getBoundingClientRect().height}px, expected 58`);
    const bands = [...bs.querySelectorAll('.sdk-phase-band')]; const border = tok(d, 'var(--border)'); const card = 'var(--bg-card)';
    for (const bd of bands) { const c = cs(bd); if (bd.dataset.state === 'off') continue; if (!near(bd.getBoundingClientRect().height, 58)) bad('a Set up band is not 58px');
      for (const sd of SIDES) if (c['border' + sd + 'Width'] !== '1px' || c['border' + sd + 'Color'] !== border) bad(`a Set up band has a ${sd.toLowerCase()} edge that is not the 1px --border hairline (no coloured top edge)`);
      if (c.boxShadow !== 'none') bad('a Set up band has a shadow or a ring'); if (c.borderTopLeftRadius !== tok(d, 'var(--radius-medium)', 'borderTopLeftRadius')) bad('a Set up band is not --radius-medium'); }
    if (cs(bands[0]).backgroundColor !== bg(d, `color-mix(in srgb, var(--tint-blue) 12%, ${card})`)) bad('the past Set up band is not the tint at 12%'); if (cs(bands[2]).backgroundColor === bg(d, `color-mix(in srgb, var(--tint-teal) 22%, ${card})`) && !bands[2].classList.contains('lit')) bad('the lit Set up band is not stronger');
    if (cs(bands[1]).backgroundColor !== bg(d, `color-mix(in srgb, var(--selected-bg), ${card})`)) bad('the current Set up band is not the selected fill'); const now = bands[1].querySelector('.sdk-phase-band-now'); if (!now || now.textContent !== 'Now' || cs(now).textTransform !== 'none' || cs(now).fontSize !== '11px') bad('the current Set up band has no text "Now" at 11px');
    if (cs(bands[1].querySelector('.sdk-phase-band-label')).color !== tok(d, 'color-mix(in srgb, var(--accent) 55%, var(--text))')) bad('the current Set up band name is not the accent mix');
    const off = bands.find((x) => x.dataset.state === 'off'); if (cs(off).borderTopStyle !== 'dashed') bad('the off Set up band is not dashed');
    const today = d.querySelector('.sdk-phase-today'); const tc = cs(today); if (!near(today.getBoundingClientRect().width, 2) || !/gradient/.test(tc.backgroundImage) || tc.borderLeftWidth !== '0px') bad('the Set up today mark is not a 2px dashed block'); if (!/^Today$/.test(d.querySelector('.sdk-phase-today-word').textContent)) bad('the Set up band has no "Today" word');
    for (const t of d.querySelectorAll('.sdk-row .sdk-chip-tag[data-tint]')) if (!near(t.getBoundingClientRect().height, 24) || cs(t).fontSize !== '12px') bad('a phase tag is not the 24px, 12px Chips tag');
    const nowTag = d.querySelector('.sdk-status'); if (!nowTag || !near(nowTag.getBoundingClientRect().height, 24) || cs(nowTag).textTransform !== 'none') bad('"Now" is not the Chips status label'); }
  // ---- the Planner's caps and rail ----
  { const d = get('Journey, caps and rail'); const phases = [...d.querySelectorAll('.sdk-phase')]; if (phases.length !== 3) bad('the caps and rail frame has not three phases');
    const rails = [...d.querySelectorAll('.sdk-rail')]; if (rails.length !== 3) bad('the rail is not drawn once for each phase');
    for (const r of rails) { const rc = cs(r); if (!near(r.getBoundingClientRect().width, 6) || r.getAttribute('aria-hidden') !== 'true' || rc.borderLeftWidth !== '0px') bad('a rail is not a 6px decorative block'); const days = r.parentElement.getBoundingClientRect(); if (!near(r.getBoundingClientRect().height, days.height, 1)) bad('a rail does not run the whole of its days'); }
    const names = ['purple', 'teal', 'green']; phases.forEach((p, i) => { const r = p.querySelector('.sdk-rail'); if (cs(r).backgroundColor !== bg(d, `color-mix(in srgb, var(--tint-${names[i]}) 38%, var(--bg-section))`)) bad(`the ${names[i]} rail is not the tint at 38%`);
      const cap = p.querySelector('.sdk-cap'); if (cap.tagName !== 'H4') bad('a cap is not a heading'); if (!cap.querySelector('.sdk-cap-icon.fa-solid')) bad('a cap has no icon'); if (cs(cap).backgroundColor !== bg(d, `color-mix(in srgb, var(--tint-${names[i]}) 18%, var(--bg-section))`)) bad('a begin cap is not the tint at 18%');
      if (cap.getBoundingClientRect().height < 31.4) bad('a cap is under 32px'); if (!/ begins$/.test(cap.querySelector('span').textContent)) bad('a begin cap does not say "begins"'); });
    const ends = [...d.querySelectorAll('.sdk-cap-end')]; if (ends.length !== 2) bad('the open-ended Trip has an end cap, or a phase has none'); if (phases[2].querySelector('.sdk-cap-end')) bad('a phase with no end has an end cap');
    // stacked at a joint: the ending cap, then the beginning one
    const caps = [...d.querySelectorAll('.sdk-cap')]; const iEnd = caps.findIndex((c) => /Booking ends/.test(c.textContent)); if (!/Pre-trip begins/.test((caps[iEnd + 1] || { textContent: '' }).textContent)) bad('the caps at the joint are not stacked, the ending one first'); else if (caps[iEnd + 1].getBoundingClientRect().top - caps[iEnd].getBoundingClientRect().bottom > 8) bad('the stacked caps are not together');
    const gap = d.querySelector('.sdk-phase-gap'); if (gap.querySelector('.sdk-rail, .sdk-cap')) bad('a day no phase covers has a rail or a cap');
    // a cap wraps and is never clipped
    const probeCap = caps[0]; const cc = cs(probeCap); if (cc.overflow !== 'visible' || cc.textOverflow === 'ellipsis' || cc.flexWrap !== 'wrap') bad('a cap can be clipped (it must wrap)'); }
  // ---- the phase tags ----
  { const d = get('Journey, phase tags'); const tags = [...d.querySelectorAll('.sdk-chip-tag, .sdk-status')]; if (tags.length < 7) bad('the phase tags are missing'); for (const t of tags) { if (!near(t.getBoundingClientRect().height, 24) || cs(t).textTransform !== 'none' || parseFloat(cs(t).fontSize) < 12) bad('a phase tag is not the 24px Chips tag (12px, no capitals)'); } }
  // ---- aliases ----
  { const d = get('Journey, aliases'); const ph = phone(d); const s = d.querySelector('.status-strip'); if (!near(s.getBoundingClientRect().height, ph ? 28 : 44)) bad('.status-strip is not the strip height');
    const pc = d.querySelector('.phase-chip'); if (!near(pc.getBoundingClientRect().height, ph ? 22 : 28)) bad('.phase-chip is not the header chip height'); if (!ph && cs(pc).backgroundColor !== bg(d, 'color-mix(in srgb, var(--header-text) 8%, transparent)')) bad('.phase-chip in the strip is not the neutral fill');
    if (!ph) { const tg = d.querySelector('.status-togo'); if (!near(tg.getBoundingClientRect().height, 28) || cs(tg).backgroundColor !== bg(d, 'color-mix(in srgb, var(--accent) 22%, transparent)')) bad('.status-togo is not the countdown chip'); const n = cs(d.querySelector('.status-togo-days')); if (n.fontSize !== '16px' || n.fontWeight !== '600') bad('.status-togo-days is not 16px 600');
      if (!near(d.querySelector('.status-fact').getBoundingClientRect().height, 28)) bad('.status-fact is not 28px'); const ac = d.querySelector('.attention-count'); if (!near(ac.getBoundingClientRect().height, 28) || ac.getBoundingClientRect().height === 24 || cs(ac).backgroundColor === tok(d, 'var(--accent)', 'backgroundColor')) bad('.attention-count is not the 28px tone chip (not the 24px solid accent pill)');
      if (cs(d.querySelector('.status-attention')).position === 'absolute') bad('.status-attention is still positioned over the strip');
      const sb = [...d.querySelectorAll('.status-band')]; if (!near(sb[0].getBoundingClientRect().height, 24)) bad('.status-band is not 24px'); if (cs(sb[0]).backgroundColor !== bg(d, TINT('blue', 12))) bad('.status-band.past is not 12%'); if (cs(sb[1]).backgroundColor !== bg(d, 'var(--selected-bg)')) bad('.status-band.current is not --selected-bg'); if (cs(sb[3]).borderTopStyle !== 'dashed') bad('.status-band.off is not dashed');
      const pn = d.querySelector('.status-today'); if (!near(pn.getBoundingClientRect().width, 28) || cs(pn).backgroundColor !== bg(d, 'var(--micro-fill)')) bad('.status-today is not the pin'); }
    const pb = [...d.querySelectorAll('.phase-band')]; for (const bd of pb) { if (bd.classList.contains('off')) continue; if (cs(bd).borderTopWidth !== '1px' || cs(bd).borderTopColor !== tok(d, 'var(--border)') || cs(bd).boxShadow !== 'none') bad('.phase-band keeps its 4px top edge or its ring'); }
    const pbn = d.querySelector('.phase-band-now'); if (cs(pbn).textTransform !== 'none' || cs(pbn).fontSize !== '11px') bad('.phase-band-now is still 10px capitals');
    const tags = [...d.querySelectorAll('.phase-tag')]; for (const t of tags) if (!near(t.getBoundingClientRect().height, 24) || cs(t).textTransform !== 'none') bad('.phase-tag is not the Chips tag'); }
  // ---- the whole family: weights, sizes, edges, thin blocks, no side bars ----
  for (const t of TITLES) { const d = get(t); const border = tok(d, 'var(--border)'); if (/contrast/.test(t)) continue;
    if (d.documentElement.scrollWidth > d.documentElement.clientWidth + 1) bad(`${t}: scrolls sideways`);
    for (const el of d.querySelectorAll('body *')) { if (el.closest('svg') || el.closest('.pm-jr-note')) continue; const c = cs(el);
      const sides = SIDES.filter((s) => c['border' + s + 'Width'] !== '0px' && c['border' + s + 'Style'] !== 'none');
      for (const s of sides) { const col = c['border' + s + 'Color']; if (col !== border && col !== 'rgba(0, 0, 0, 0)') bad(`${t}: a ${s.toLowerCase()} edge of ${el.className || el.tagName} is ${col}, not --border or transparent`); }
      if (sides.length && sides.length < 4 && sides.some((s) => s === 'Left' || s === 'Right')) bad(`${t}: a left or right edge on ${el.className || el.tagName}`);
      const r = el.getBoundingClientRect(); if (c.position === 'absolute' && (r.width <= 4 || r.height <= 4) && r.width > 0 && r.height > 0 && c.backgroundColor !== 'rgba(0, 0, 0, 0)' && !el.closest('.sdk-journey')) bad(`${t}: a thin coloured block (${r.width} by ${r.height}) on ${el.className || el.tagName}`);
      if (c.position !== 'static') for (const p of ['::before', '::after']) { const pc = cs(el, p); if (pc.content !== 'none' && pc.content !== 'normal' && pc.backgroundColor !== 'rgba(0, 0, 0, 0)' && pc.position === 'absolute' && (parseFloat(pc.width) <= 4 || parseFloat(pc.height) <= 4)) bad(`${t}: a thin coloured block on ${el.className || el.tagName}`); }
      if ([...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) && c.display !== 'none' && c.fontSize !== '0px') {
        if (!['400', '500', '600'].includes(c.fontWeight)) bad(`${t}: weight ${c.fontWeight} on ${el.className || el.tagName} (400, 500 and 600 only)`);
        if (parseFloat(c.fontSize) < 11 && !el.matches('.sdk-badge-micro')) bad(`${t}: ${c.fontSize} text on ${el.className || el.tagName} (nothing under 11px)`);
        if (c.textTransform === 'uppercase' && !el.matches('.pm-jr-cap')) bad(`${t}: upper-case type on ${el.className || el.tagName} (the 10px capitals are retired)`); } } }
  // ---- contrast ----
  { const d = get('Journey, contrast'); await wait(700); const rows = [...d.querySelectorAll('.pm-jr-ct tbody tr')]; if (rows.length < 60) bad(`the contrast table has only ${rows.length} rows`);
    for (const tr of rows) { const p = tr.querySelector('[data-out="p"]').textContent; if (p === 'Fails') bad(`contrast: ${tr.children[0].textContent} is ${tr.querySelector('[data-out="r"]').textContent}`); if (!p) bad('the contrast table is not measured'); } }
  // ---- the page ----
  const blk = document.getElementById('journey');
  if (!blk || !blk.querySelector('.ds-st-approved') || blk.querySelector('.ds-st-proposed')) bad('the Journey family is not marked Approved');
  if (document.getElementById('u-status-strip-phases-and-countdown')) bad('Status strip, phases and countdown is still listed as Not yet decided');
  if (!blk || !/Chosen while drawing/.test(blk.textContent) || !/Today to proposed/.test(blk.textContent) || !/caps and rail/i.test(blk.textContent)) bad('the Journey family lacks its Today to proposed, Chosen while drawing or caps and rail section');
  return JSON.stringify(out);
};
