/*
 * check-design-system-chips.mjs -- the Chips, badges and counts family of the proposed design system page (public/design-system/proposed-chips.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a choice chip or a person not 30px, a tag, a removable chip or a status label not 24px, a count not 18px, a micro count not a 14px badge with 9px numbers (the same box, text, fill and inset as the Tabs family draws on an icon-only tab), a dot not 7px,
 * the x of a removable chip not 20px; any chip with a corner that is not --radius-small (5px), any edge not 1px transparent in any state (no coloured border, no
 * bar, no underline), any text in a chip frame under 11px (the micro count, .sdk-badge-micro, is left out: numbers only) (tags and status labels under 12px, choice chips and people under 13px); a selected fill that is not the
 * --selected-bg token with the accent-mix text; a rest chip without a fill; the focus not a 2px outline at offset -2px (all four sides the same at 1.25x and 1.5x);
 * a tint fill that is not the tone mixed into the surface (or that has a coloured edge); a contrast pair under its minimum (the rows marked "Not used here" are
 * shown to compare and are left out); the ink of a label more than 1px off the middle (4x); on a phone, a pressable chip without a 44px hit area (a press 5px above it
 * must reach it) or an x without a 44px hit area; a micro count that is not 3px (the dot 4px) in from the parent's padding edge on the top and right, as the Tabs family has it, or that makes an icon-only tab
 * not square; a kept name that does not take the look; the family not marked Approved, or its page without the micro count wording (14px badge, 9px numbers, below the 11px floor because it holds numbers only); "Chips that filter" and "Chips, badges, pills and counts" still listed as
 * Not yet decided; in the stylesheet: a chips rule that draws an edge on one side, an underline, an inset shadow, a tint in a border, a font size under 11px (except the micro count's 9px), the
 * hard-coded #e0b25a, a new name that is not defined.
 */
export const id = 'chips';
export const todayOnly = ['aside', 'ref', 'warn', 'in-trip', 'current', 'today', 'mono'];

export function staticChecks({ fail, css, defined, js }) {
  if (/border-(left|right|top|bottom)\s*:/.test(css)) fail('proposed-chips.css: a chips rule draws an edge on one side (no bar)');
  if (/text-decoration\s*:\s*underline/.test(css)) fail('proposed-chips.css: a chips rule underlines something');
  if (/inset\s*\)|box-shadow\s*:\s*inset/.test(css)) fail('proposed-chips.css: a chips rule draws an inset shadow (a bar)');
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-chips.css: a hard-coded colour (tokens only)');
  const cssNoMicro = css.replace(/\.ds-proposed :is\(\.sdk-badge-micro[^{]*\{[^}]*\}/, '');
  if (!/\.sdk-badge-micro/.test(css)) fail('proposed-chips.css: no .sdk-badge-micro (the micro count)');
  for (const m of cssNoMicro.matchAll(/font-size\s*:\s*(\d+(?:\.\d+)?)px/g)) if (Number(m[1]) < 11) fail(`proposed-chips.css: a font size of ${m[1]}px, under 11px`);
  if (/e0b25a/i.test(css)) fail('proposed-chips.css: still draws the hard-coded #e0b25a (it is --warn)');
  for (const c of ['sdk-chip', 'sdk-chips', 'sdk-chip-tag', 'sdk-chip-people', 'sdk-chip-removable', 'sdk-chip-x', 'sdk-chip-label', 'sdk-chip-dot', 'sdk-chip-avatar', 'sdk-status', 'sdk-badge', 'sdk-badge-micro', 'sdk-badge-corner', 'sdk-dot', 'sdk-dot-corner',
    'filter-chip', 'bgpick-chip', 'chip', 'chip-btn', 'rs-chip', 'daychip', 'sdk-people', 'tag', 'host-menu-tag', 'pill', 'phase-tag', 'stream-badge', 'phase-tag-now', 'phase-tag-main', 'badge-ok', 'phase-chip', 'count', 'whos-around-count', 'badge', 'nav-badge']) {
    if (!defined.has(c)) fail(`the proposed stylesheets do not define the chips name .${c} (a new name or a kept alias)`);
  }
  if (!/--warn\s*:/.test(css)) fail('proposed-chips.css: no --warn token');
  if (!/--radius-small/.test(css)) fail('proposed-chips.css: the chips do not use --radius-small');
}

export async function browserChecks(b) {
  const { ev, cdp, sessionId, sc, where, problems, inkCentre, edgeColours } = b;
  const cp = JSON.parse(await ev(`(${chipsProbe.toString()})()`)); for (const x of cp.problems) problems.push(`${where}: ${x}`);
  // The ink of a label in a choice chip, a tag and a status label: within 1px of the middle of the box, by a 4x screenshot.
  if (sc.width >= 500) {
    for (const [title, sel, nm] of [['Chips, all states', '.pm-row:nth-child(1) .dsf-state:nth-child(1) .sdk-chip', 'choice chip'], ['Chips, all states', '.pm-row:nth-child(1) .dsf-state:nth-child(4) .sdk-chip', 'selected choice chip'], ['Chips, states of the other roles', '.pm-row:nth-child(1) .dsf-state:nth-child(1) .sdk-chip-tag', 'tag'], ['Chips, states of the other roles', '.pm-row:nth-child(5) .dsf-state:nth-child(1) .sdk-status', 'status label']]) {
      const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === ${JSON.stringify(title)}); const el = m.iframe.contentDocument.querySelector(${JSON.stringify(sel)}); el.scrollIntoView({ block: 'center', behavior: 'instant' }); await new Promise((r) => setTimeout(r, 120)); m.iframe.style.position = 'relative'; m.iframe.style.top = '0px'; let b = el.getBoundingClientRect(); let fr = m.iframe.getBoundingClientRect(); const fy = fr.top + window.scrollY; const frac = fy - Math.floor(fy); if (frac > 0.01) { m.iframe.style.top = (1 - frac) + 'px'; await new Promise((r) => setTimeout(r, 120)); b = el.getBoundingClientRect(); fr = m.iframe.getBoundingClientRect(); } return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height }); })()`));
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x, y: at.y, width: at.w, height: at.h, scale: 4 } }, sessionId);
      const c = inkCentre(Buffer.from(shot.data, 'base64'), 4, 10);
      if (c === null) problems.push(`${where}: no ink found in the ${nm}`);
      else if (Math.abs(c) > 1.01) problems.push(`${where}: the ${nm} label is ${Math.abs(c).toFixed(2)}px ${c > 0 ? 'low' : 'high'} of the middle of its box`);
    }
    await ev(`(() => { for (const f of window.__ds.frames) { f.iframe.style.top = ''; f.iframe.style.position = ''; } })()`);
    // The focus outline of a chip, rest and selected: all four sides the same at a fractional device pixel ratio and page offset.
    for (const dsf of [1.25, 1.5]) {
      await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: dsf, mobile: false }, sessionId);
      await new Promise((r) => setTimeout(r, 400));
      for (const [nm, idx] of [['focused', 3], ['selected and focused', 6]]) {
        for (const nudge of [0.3, 0.7]) {
          const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Chips, all states'); const d = m.iframe.contentDocument; const el = d.querySelectorAll('.pm-row')[0].querySelectorAll('.dsf-state')[${idx - 1}].querySelector('.sdk-chip'); el.scrollIntoView({ block: 'center', behavior: 'instant' });
            const c = document.getElementById('ds-content'); c.style.marginTop = '${nudge}px'; c.style.marginLeft = '${nudge * 1.7 % 1}px'; window.scrollTo(0, Math.round(window.scrollY) + ${nudge}); await new Promise((r) => setTimeout(r, 150));
            const cv = document.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = getComputedStyle(el).outlineColor; g.fillRect(0, 0, 1, 1); const px = g.getImageData(0, 0, 1, 1).data;
            const b = el.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height, col: 'rgb(' + px[0] + ',' + px[1] + ',' + px[2] + ')' }); })()`));
          const pad = 6;
          const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x - pad, y: at.y - pad, width: at.w + pad * 2, height: at.h + pad * 2, scale: 1 } }, sessionId);
          const e = edgeColours(Buffer.from(shot.data, 'base64'), at.col.match(/[\d.]+/g).map(Number), dsf, pad, at.w, at.h);
          const vals = Object.values(e);
          if (Math.max(...vals) - Math.min(...vals) > 40) problems.push(`${where}: the ${nm} chip outline is not the same on all four sides at ${dsf}x with the page ${nudge}px off the pixel grid (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
          if (Math.max(...vals) > 60) problems.push(`${where}: a side of the ${nm} chip outline never reaches its full colour at ${dsf}x (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
        }
      }
      await ev(`(() => { const c = document.getElementById('ds-content'); c.style.marginTop = ''; c.style.marginLeft = ''; })()`);
    }
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
    await new Promise((r) => setTimeout(r, 300));
  }
}

// The Chips family, measured in the page (runs in the browser): sizes, corners, edges, text sizes, the states, the tints and their contrast, the hit areas on a phone,
// the corner count and dot, the aliases and the page's own notes.
const chipsProbe = async () => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^Chips/.test(t) && !/contrast/.test(t));
  const tok = (d, n, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = n; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const near = (a, w, tol) => Math.abs(a - w) <= (tol || 0.6);
  if (TITLES.length < 12) bad(`the Chips family has only ${TITLES.length} frames`);
  const CHIP = '.sdk-chip, .sdk-chip-people, .sdk-chip-tag, .sdk-chip-removable, .sdk-status';
  // Every chip of every frame: a 1px transparent edge in every state, the small corner, no outline at rest, no underline, no shadow, no text under its role's size.
  for (const t of TITLES) {
    const d = get(t); if (!d) { bad(`no frame ${t}`); continue; }
    const phone = d.defaultView.innerWidth <= 640;
    for (const el of d.querySelectorAll(`${CHIP}, .filter-chip, .bgpick-chip, .chip, .chip-btn, .rs-chip, .daychip, .tag, .host-menu-tag, .pill, .phase-tag, .stream-badge, .phase-tag-now, .badge-ok, .phase-chip, .sdk-people > label`)) {
      const cs = getComputedStyle(el); const nm = `${t}: ${(el.textContent || '').trim().slice(0, 24) || el.className}`;
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) if (cs['border' + side + 'Color'] !== 'rgba(0, 0, 0, 0)' || (cs['border' + side + 'Width'] !== '1px' && t !== 'Chips, anatomy sample')) bad(`${nm}: the ${side.toLowerCase()} edge is ${cs['border' + side + 'Width']} ${cs['border' + side + 'Color']}, not a 1px transparent one`);
      for (const c of ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight']) if (cs['border' + c + 'Radius'] !== '5px') bad(`${nm}: a corner is ${cs['border' + c + 'Radius']}, not --radius-small (5px)`);
      if (!el.matches('.ds-force-focus') && cs.outlineStyle !== 'none') bad(`${nm}: an outline at rest (${cs.outlineStyle})`);
      if (cs.textDecorationLine !== 'none') bad(`${nm}: underlined`);
      if (cs.boxShadow !== 'none') bad(`${nm}: a shadow (${cs.boxShadow})`);
      if (cs.textTransform !== 'none') bad(`${nm}: text-transform ${cs.textTransform} (no caps)`);
      const fs = parseFloat(cs.fontSize); const want = el.matches('.sdk-chip, .sdk-chip-people, .filter-chip, .bgpick-chip, .chip, .chip-btn, .rs-chip:not(.tag), .daychip, .sdk-people > label') ? 13 : 12;
      if (fs < 11) bad(`${nm}: text is ${fs}px, under 11px`); else if (!near(fs, want, 0.01)) bad(`${nm}: text is ${fs}px, expected ${want}px`);
    }
    // No text anywhere in a chips frame under 11px, inside the chips and badges.
    for (const el of d.querySelectorAll('.sdk-badge:not(.sdk-badge-micro), .count, .badge:not(.sdk-badge-micro), .nav-badge, .whos-around-count, .sdk-chip-avatar, .sdk-chip-label')) if (el.closest('.sdk-badge-micro')) continue; else if (!el.matches('.nav-badge') && parseFloat(getComputedStyle(el).fontSize) < 11) bad(`${t}: ${el.className} text is ${getComputedStyle(el).fontSize}, under 11px`);
    void phone;
  }
  // Sizes: the roles' exact heights.
  const heights = (d, sel, h, nm, tol) => { const els = d.querySelectorAll(sel); if (!els.length) bad(`${nm}: nothing for ${sel}`); for (const el of els) { const r = el.getBoundingClientRect(); if (!near(r.height, h, tol)) bad(`${nm}: ${sel} (${(el.textContent || '').trim().slice(0, 16)}) is ${r.height}px high, expected ${h}`); } };
  for (const t of ['Chips, all states', 'Chips, roles', 'Chips, on a phone']) heights(get(t), '.sdk-chip', 30, t);
  for (const t of ['Chips, people states', 'Chips, roles', 'Chips, on a phone']) heights(get(t), '.sdk-chip-people', 30, t);
  { const d = get('Chips, states of the other roles'); heights(d, '.sdk-chip-tag', 24, 'tags'); heights(d, '.sdk-chip-removable', 24, 'removable'); heights(d, '.sdk-status', 24, 'status'); heights(d, '.sdk-chip-x', 20, 'the x'); for (const el of d.querySelectorAll('.sdk-chip-x')) if (!near(el.getBoundingClientRect().width, 20)) bad('an x is not 20px wide'); }
  { const d = get('Chips, counts and dots'); heights(d, '.sdk-badge:not(.sdk-badge-micro)', 18, 'counts'); heights(d, '.sdk-badge-micro', 14, 'micro counts'); for (const el of d.querySelectorAll('.sdk-badge-micro')) { const c = getComputedStyle(el); if (c.fontSize !== '9px') bad(`a micro count has ${c.fontSize} numbers, expected 9px`); } heights(d, '.sdk-dot', 7, 'dots'); for (const el of d.querySelectorAll('.sdk-dot')) if (!near(el.getBoundingClientRect().width, 7)) bad('a dot is not 7px wide'); }
  { const d = get('Chips, roles'); const e = d.querySelector('.sdk-chip-tag'); if (!near(e.getBoundingClientRect().height, 24)) bad('roles: a tag is not 24px'); }
  // A selected chip is the same box as a rest chip; the states.
  { const d = get('Chips, all states'); const cs = (x) => getComputedStyle(x);
    const sel = tok(d, 'var(--selected-bg)', 'backgroundColor'); const mix = tok(d, 'color-mix(in srgb, var(--accent) 55%, var(--text))');
    for (const [r, nm] of [[0, 'label'], [1, 'icon and label'], [2, 'count'], [3, 'category dot']]) {
      const row = d.querySelectorAll('.pm-row')[r]; const cell = (s) => row.querySelectorAll('.dsf-state')[s].querySelector('.sdk-chip');
      const [rest, hov, foc, on, onHov, onFoc, dis] = [0, 1, 2, 3, 4, 5, 6].map(cell);
      if (cs(rest).backgroundColor === 'rgba(0, 0, 0, 0)') bad(`${nm}: a chip at rest has no fill`);
      if (cs(hov).backgroundColor === cs(rest).backgroundColor) bad(`${nm}: the forced hover does not change the fill`);
      if (!/^2px solid/.test(`${cs(foc).outlineWidth} ${cs(foc).outlineStyle}`) || cs(foc).outlineOffset !== '-2px') bad(`${nm}: the focus is not a 2px outline at offset -2px (${cs(foc).outlineWidth} ${cs(foc).outlineStyle} ${cs(foc).outlineOffset})`);
      if (cs(foc).outlineColor !== tok(d, 'var(--accent)')) bad(`${nm}: the focus outline is not --accent (${cs(foc).outlineColor})`);
      if (cs(on).backgroundColor !== sel) bad(`${nm}: the selected fill is ${cs(on).backgroundColor}, not --selected-bg (${sel})`);
      if (cs(on).color !== mix) bad(`${nm}: the selected text is ${cs(on).color}, not the accent mix (${mix})`);
      if (cs(onHov).backgroundColor === cs(on).backgroundColor) bad(`${nm}: the forced selected hover does not change the fill`);
      if (cs(onFoc).outlineStyle !== 'solid' || cs(onFoc).outlineWidth !== '2px') bad(`${nm}: the selected focus shows no 2px outline`);
      if (cs(dis).opacity !== '0.5') bad(`${nm}: disabled is not half strength (${cs(dis).opacity})`);
      if (!near(rest.getBoundingClientRect().height, on.getBoundingClientRect().height, 0.1)) bad(`${nm}: a selected chip is not the height of one at rest`);
      if (Math.abs(rest.getBoundingClientRect().width - on.getBoundingClientRect().width) > 8) bad(`${nm}: a selected chip is much wider than one at rest (${rest.getBoundingClientRect().width} to ${on.getBoundingClientRect().width})`);
      if (cs(on).backgroundColor === tok(d, 'var(--accent)', 'backgroundColor')) bad(`${nm}: the selected fill is the solid accent`);
    }
    // A category dot never tints the chip's fill.
    const dotChip = d.querySelectorAll('.pm-row')[3].querySelector('.sdk-chip'); const plain = d.querySelectorAll('.pm-row')[0].querySelector('.sdk-chip');
    if (cs(dotChip).backgroundColor !== cs(plain).backgroundColor) bad('a category choice chip takes the tint as its fill');
  }
  { const d = get('Chips, people states'); const cs = (x) => getComputedStyle(x); const sel = tok(d, 'var(--selected-bg)', 'backgroundColor');
    const row = d.querySelectorAll('.pm-row')[0]; const cell = (s) => row.querySelectorAll('.dsf-state')[s].querySelector('.sdk-chip-people');
    if (cs(cell(3)).backgroundColor !== sel) bad('a selected person is not the --selected-bg fill');
    if (cs(cell(0)).backgroundColor === sel) bad('a person at rest has the selected fill');
    const a = cell(0).querySelector('.sdk-chip-avatar').getBoundingClientRect(); if (!near(a.width, 22) || !near(a.height, 22)) bad(`the avatar is ${a.width} by ${a.height}, not 22`);
    const long = d.querySelectorAll('.pm-row')[1].querySelector('.sdk-chip-people'); if (long.scrollWidth > long.clientWidth + 1 && d.defaultView.innerWidth > 640) bad('a long name overflows its chip');
  }
  // Tints: the tag takes a tint fill (the tone into the surface) and no coloured edge; the choice chip does not; the removable chip and the status label too.
  { const d = get('Chips, category tints'); const cs = (x) => getComputedStyle(x);
    const tags = [...d.querySelectorAll('.sdk-chip-tag[data-tint]')]; if (tags.length < 16) bad(`the tints frame shows ${tags.length} tinted tags, expected 16 or more`);
    const neutral = tok(d, 'color-mix(in srgb, var(--text) 8%, transparent)', 'backgroundColor');
    for (const t of tags) { const c = cs(t); if (c.backgroundColor === neutral || c.backgroundColor === 'rgba(0, 0, 0, 0)') bad(`a tinted tag (${t.textContent.trim()}) has no tint fill`); if (c.borderTopColor !== 'rgba(0, 0, 0, 0)') bad('a tinted tag has a coloured edge'); }
    for (const t of d.querySelectorAll('.sdk-chip-removable[data-tint]')) if (cs(t).backgroundColor === neutral) bad('a tinted removable chip has no tint fill');
    // The eight tones are eight different fills.
    const fills = new Set([...d.querySelectorAll('.pm-box:not(.pm-on-card) .sdk-chip-tag[data-tint]')].map((t) => cs(t).backgroundColor)); if (fills.size < 8) bad(`the eight tints give only ${fills.size} different fills`);
    // A tint is written as the tone into the surface, not a plain alpha: a card surface gives a different fill from a panel.
    const boxFill = cs(d.querySelector('.pm-box:not(.pm-on-card) .sdk-chip-tag[data-tint="blue"]')).backgroundColor; const cardFill = cs(d.querySelector('.pm-on-card .sdk-chip-tag[data-tint="blue"]')).backgroundColor;
    if (boxFill === cardFill) bad('a tint does not follow the surface it sits on (panel and card give the same fill)');
  }
  // Status labels: words always, a tint fill in a tone, never colour alone.
  { const d = get('Chips, status labels'); const cs = (x) => getComputedStyle(x); const all = [...d.querySelectorAll('.sdk-status')];
    for (const s of all) { if (!s.textContent.trim()) bad('a status label has no word'); }
    const tones = new Set(all.filter((s) => s.dataset.tone && s.dataset.tone !== 'neutral').map((s) => cs(s).backgroundColor)); if (tones.size < 4) bad(`the status labels show only ${tones.size} tone fills`);
    const caps = d.querySelector('.sdk-chip-tag[style*="small-caps"]'); if (!caps || cs(caps).fontVariantCaps !== 'small-caps') bad('--chip-caps does not give small caps');
  }
  // Counts and dots: on a tab and an icon button.
  { const d = get('Chips, counts and dots'); const cs = (x) => getComputedStyle(x);
    for (const kind of ['.sdk-badge-micro', '.sdk-dot-corner']) {
      const els = [...d.querySelectorAll(kind)]; if (!els.length) bad(`counts: no ${kind}`);
      for (const m of els) {
        const P = m.parentElement.getBoundingClientRect(); const M = m.getBoundingClientRect(); const top = M.top - P.top; const right = P.right - M.right; const pb = parseFloat(getComputedStyle(m.parentElement).borderTopWidth) || 0; const w = (kind === '.sdk-badge-micro' ? 3 : 4) + pb;
        if (!near(top, w, 0.6) || !near(right, w, 0.6)) bad(`counts: a ${kind} is ${top.toFixed(1)}px from the top and ${right.toFixed(1)}px from the right edge, expected ${w}px each (${w - pb}px in from the padding edge, as Tabs has it)`);
        if (M.left < P.left - 0.5 || M.bottom > P.bottom + 0.5) bad(`counts: a ${kind} is outside its tab or button`);
        const par = m.parentElement; if (par.matches('.sdk-tab-icon') && Math.abs(P.width - P.height) > 0.6) bad(`counts: an icon-only tab with a ${kind} is not square (${P.width} by ${P.height})`);
        if (cs(m).position !== 'absolute') bad(`counts: a ${kind} is not absolute`);
      }
    }
    const widths = [...d.querySelectorAll('.sdk-badge-micro')].map((m) => ({ t: m.textContent.trim(), w: m.getBoundingClientRect().width }));
    const one = widths.find((x) => x.t === '3'); const cap = widths.find((x) => x.t === '99+'); if (!one || !near(one.w, 14)) bad(`a one-digit micro count is ${one && one.w}px wide, expected 14`); if (!cap || cap.w <= 16) bad('a 99+ micro count does not widen');
    for (const m of d.querySelectorAll('.sdk-badge:not(.sdk-badge-micro)')) { if (cs(m).borderTopWidth !== '0px') bad('a count has an edge'); }
    const acc = tok(d, 'var(--accent)', 'backgroundColor'); const cc = cs(d.querySelector('.sdk-badge-micro')).backgroundColor; if (cc !== tok(d, 'color-mix(in srgb, var(--accent) 88%, var(--text))', 'backgroundColor')) bad(`the micro count fill is ${cc}, not the accent mixed 88% into text`); if (cc === 'rgba(0, 0, 0, 0)' || cc === tok(d, 'var(--text)', 'backgroundColor')) bad('the micro count has no accent fill'); void acc;
    // The count after a label is neutral (not the accent) and 18px.
    const n = d.querySelector('.sdk-tab .sdk-badge:not(.sdk-badge-micro)'); if (!n || cs(n).backgroundColor === cc) bad('the count after a label is not neutral');
  }
  // One component: the micro count the Tabs family draws on an icon-only tab is the same box, text, fill and inset as the Chips family's.
  { const mine = get('Chips, counts and dots').querySelector('.sdk-tab-icon > .sdk-badge-micro'); const tabsFrame = F.find((x) => x.iframe.contentDocument.querySelector('.sdk-tab-icon > .sdk-tab-badge.sdk-badge-micro') && /^Tabs/.test(x.iframe.title));
    if (!mine) bad('no micro count on an icon-only tab in the Chips frame'); else if (!tabsFrame) bad('the Tabs family draws no .sdk-badge-micro on an icon-only tab');
    else { const theirs = tabsFrame.iframe.contentDocument.querySelector('.sdk-tab-icon > .sdk-tab-badge.sdk-badge-micro'); const a = getComputedStyle(mine); const b2 = getComputedStyle(theirs);
      for (const k of ['height', 'minWidth', 'fontSize', 'fontWeight', 'paddingLeft', 'top', 'right', 'backgroundColor', 'color', 'borderTopLeftRadius']) if (a[k] !== b2[k]) bad(`the micro count differs between Chips and Tabs: ${k} is ${a[k]} in Chips and ${b2[k]} in Tabs`); } }
  // Contrast: every pair passes its minimum; the rows marked "Not used here" are to compare.
  { const d = get('Chips, contrast'); await wait(300); const rows = [...d.querySelectorAll('.pm-ct tbody tr')]; if (rows.length < 40) bad(`the contrast list has only ${rows.length} rows`);
    const fails = []; for (const tr of rows) { const r = tr.querySelector('[data-out="r"]').textContent; if (!r) { bad('a contrast row is not worked out'); continue; } if (tr.querySelector('[data-out="p"]').textContent === 'Fails' && !/Not used here/.test(tr.cells[0].textContent)) fails.push(`${tr.cells[0].textContent} ${r}`); }
    for (const f of fails) bad(`contrast under its minimum: ${f}`);
  }
  // A phone: the look stays, the hit area is 44px, rows of chips are far enough apart that two hit areas do not overlap.
  { const d = get('Chips, on a phone'); const cs = (x, p) => getComputedStyle(x, p); if (d.defaultView.innerWidth > 640) bad('the phone frame is wider than a phone');
    for (const t of d.querySelectorAll('.sdk-chip, .sdk-chip-people')) {
      const a = cs(t, '::before'); if (a.content === 'none' || !near(parseFloat(a.height), 44, 1)) bad(`a ${t.className} on a phone has no 44px hit area (${a.content}, ${a.height})`);
      const r = t.getBoundingClientRect(); const hit = d.elementFromPoint(r.left + 10, r.top - 5); if (!hit || hit.closest('.sdk-chip, .sdk-chip-people') !== t) bad(`a press 5px above a ${t.className} (${t.textContent.trim()}) on a phone does not reach it`);
      const hit2 = d.elementFromPoint(r.left + 10, r.bottom + 5); if (!hit2 || hit2.closest('.sdk-chip, .sdk-chip-people') !== t) bad(`a press 5px below a ${t.className} (${t.textContent.trim()}) on a phone does not reach it`);
    }
    for (const x of d.querySelectorAll('.sdk-chip-x')) { const a = cs(x, '::before'); if (a.content === 'none' || !near(parseFloat(a.height), 44, 1) || !near(parseFloat(a.width), 44, 1)) bad(`an x on a phone has no 44px hit area (${a.content}, ${a.width} by ${a.height})`); const r = x.getBoundingClientRect(); const hit = d.elementFromPoint(r.left + 10, r.top - 8); if (!hit || hit.closest('.sdk-chip-x') !== x) bad('a press 8px above an x on a phone does not reach it'); }
    // Two rows of chips: the hit areas do not overlap (the rows are 14px apart or more).
    const rowsTop = [...new Set([...d.querySelectorAll('.sdk-chips > .sdk-chip, .sdk-chips > .sdk-chip-people')].map((t) => Math.round(t.getBoundingClientRect().top)))].sort((a, b) => a - b);
    for (let i = 1; i < rowsTop.length; i += 1) if (rowsTop[i] - rowsTop[i - 1] < 44 - 0.5 && rowsTop[i] - rowsTop[i - 1] > 4) bad(`two rows of chips on a phone are ${rowsTop[i] - rowsTop[i - 1]}px apart, so their 44px hit areas overlap`);
  }
  // On a wide page there is no extra hit area (the look and the hit area are one).
  { const d = get('Chips, all states'); if (d.defaultView.innerWidth > 640) { const a = getComputedStyle(d.querySelector('.sdk-chip'), '::before'); if (a.content !== 'none' && a.content !== 'normal') bad('a chip has a hit-area pseudo-element on a wide page'); } }
  // Aliases: today's markup takes the look.
  { const d = get('Chips, aliases'); const cs = (x) => getComputedStyle(x); const sel = tok(d, 'var(--selected-bg)', 'backgroundColor');
    const sets = [['.filter-chip', 30], ['.bgpick-chip', 30], ['.chip', 30], ['.chip-btn', 30], ['.rs-chip:not(.tag)', 30], ['.tag', 24], ['.host-menu-tag', 24], ['.pill', 24], ['.phase-tag', 24], ['.stream-badge', 24], ['.phase-tag-now', 24], ['.rs-chip.tag', 24], ['.badge-ok', 24], ['.phase-chip', 24], ['.sdk-people > label', 30], ['.count', 18], ['.whos-around-count', 18], ['.badge', 18], ['.nav-badge', 14]];
    for (const [s, h] of sets) { const els = d.querySelectorAll(s); if (!els.length) bad(`aliases: nothing for ${s}`); for (const el of els) if (!near(el.getBoundingClientRect().height, h)) bad(`aliases: ${s} is ${el.getBoundingClientRect().height}px high, expected ${h}`); }
    for (const s of ['.filter-chip.on', '.bgpick-chip.on', '.chip-btn.on', '.rs-chip.on']) { const el = d.querySelector(s); if (!el) { bad(`aliases: no ${s}`); continue; } if (cs(el).backgroundColor !== sel) bad(`aliases: ${s} is not the --selected-bg fill`); }
    const lab = d.querySelector('.sdk-people > label'); if (!lab) bad('aliases: no .sdk-people > label'); else if (cs(lab).backgroundColor !== sel) bad('aliases: a checked .sdk-people label is not the selected fill'); const unchecked = d.querySelectorAll('.sdk-people > label')[1]; if (cs(unchecked).backgroundColor === sel) bad('aliases: an unchecked .sdk-people label has the selected fill');
    const warn = d.querySelector('.pill.warn'); const plain = d.querySelector('.pill:not(.warn)'); if (cs(warn).backgroundColor === cs(plain).backgroundColor) bad('aliases: .pill.warn has no warn tone');
    const ok = d.querySelector('.badge-ok'); if (cs(ok).backgroundColor === cs(d.querySelector('.phase-chip')).backgroundColor) bad('aliases: .badge-ok has no ok tone');
    const x = d.querySelector('.rs-chip.tag .x'); if (!x || !near(x.getBoundingClientRect().width, 20)) bad('aliases: the .x of a removable .rs-chip.tag is not 20px');
    const sb = d.querySelector('.stream-badge'); if (cs(sb).textTransform !== 'none' || parseFloat(cs(sb).fontSize) < 12) bad('aliases: .stream-badge is still small caps text or under 12px');
    const days = d.querySelectorAll('.daychip'); if (days.length < 2 || cs(days[1]).backgroundColor !== sel) bad('aliases: a current .daychip is not the selected fill');
  }
  // The demo works: a press toggles a choice chip, the x removes a removable chip.
  { const d = get('Chips, which one'); const c = d.querySelector('.sdk-chip'); const was = c.getAttribute('aria-pressed'); c.click(); if (c.getAttribute('aria-pressed') === was) bad('a press does not toggle a choice chip'); c.click();
    const d2 = get('Chips, states of the other roles'); const rm = d2.querySelectorAll('.sdk-chip-removable')[5]; const x = rm && rm.querySelector('.sdk-chip-x'); if (!x) bad('no removable chip to test'); else { x.click(); if (!rm.hidden) bad('the x does not remove its chip'); rm.hidden = false; } }
  // The page: the family is Proposed, the two lists of names are gone from "Not yet decided".
  const doc = document; const blk = doc.getElementById('chips');
  if (!blk || !blk.querySelector('.ds-st-approved') || blk.querySelector('.ds-st-proposed')) bad('the Chips family is not marked Approved');
  if (!blk || !blk.textContent.includes('Micro count: 14px badge, 9px numbers, allowed below the 11px text floor because it holds numbers only (99+ at most), always inside a corner of an icon')) bad('the Chips family does not state the micro count rule');
  if (blk && /Corner count and Tabs|Thomas decides|Your call/.test(blk.textContent)) bad('the Chips family still has an open decision wording');
  if (blk) for (const k of ['mod-status-item.chip', 'calendar.css:22', 'places.css:25', 'Left out']) if (!blk.textContent.includes(k)) bad(`the Chips alias table does not list ${k} (the three .chip looks)`);
  for (const id of ['u-chips-that-filter', 'u-chips-badges-pills-and-counts']) if (doc.getElementById(id)) bad(`${id} is still listed as Not yet decided`);
  if (!blk || !/Calendar/.test(blk.textContent) || !/exception/.test(blk.textContent)) bad('the Chips family does not note the Calendar left-bar exception');
  for (const k of ['--warn', '.sdk-chip-people', '.sdk-status', 'Today to proposed']) if (!blk || !blk.textContent.includes(k)) bad(`the Chips family page does not mention ${k}`);
  return JSON.stringify(out);
};
