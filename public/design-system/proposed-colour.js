/* The Colour foundation, proposed (documentation/plans/plan-design-system.md; the roles are the "colour roles" spec: 7 base roles the theme
   author sets, optional status bases, and about 45 derived roles, each driving one job). A VISUAL proposal: a swatch board, a live mock
   screen, a "what does this role drive?" highlight and a try-it playground. Nothing here is a style of the product: the roles are CSS custom
   properties on the .ds-colour scope of this page only, computed from the bases with color-mix (named formulas, below), never written to
   style.css, host.css or theme.css. Loaded by proposed.js through proposed-families.json; it registers one family. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  'use strict';
  const D = document;
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n) => `<i class="fa-solid fa-${n}" aria-hidden="true"></i>`;

  // ---- the themes: the seven base colours of each mode, read from server/store.js (DEFAULT_THEME and BUILTIN_THEMES) ----
  const THEMES = {
    coffee: { name: 'Strong Coffee',
      dark: { bg: '#1a1410', bgSection: '#241c16', border: '#3b2e24', text: '#f1e6d8', textDim: '#a8998a', accent: '#c8873a', onAccent: '#1a1206' },
      light: { bg: '#faf6f1', bgSection: '#f1e9df', border: '#ded0bf', text: '#2b2119', textDim: '#76675a', accent: '#a8692a', onAccent: '#ffffff' } },
    teal: { name: 'Calming Teal',
      light: { bg: '#ffffff', bgSection: '#f7f9fa', border: '#e1e8e8', text: '#333333', textDim: '#767676', accent: '#0dc9ca', onAccent: '#ffffff' },
      dark: { bg: '#111a1b', bgSection: '#182325', border: '#2a3b3d', text: '#e4eeee', textDim: '#8ea3a4', accent: '#0dc9ca', onAccent: '#062021' } },
    orange: { name: 'Burnt Orange',
      light: { bg: '#ffffff', bgSection: '#f7f7f7', border: '#e0e0e0', text: '#333333', textDim: '#767676', accent: '#e45628', onAccent: '#ffffff' },
      dark: { bg: '#1a1512', bgSection: '#241d19', border: '#3c302a', text: '#eee8e3', textDim: '#a69a91', accent: '#e45628', onAccent: '#ffffff' } },
  };
  // The theme file's key for each base role (so "copy as theme JSON" is a file the product already reads).
  const KEY = { 'surface-page': 'bg', 'surface-panel': 'bgSection', 'edge-hairline': 'border', 'text-primary': 'text', 'text-muted': 'textDim', 'accent-fill': 'accent', 'text-on-accent': 'onAccent' };
  // Optional status bases. No theme file sets them today: the defaults are today's --danger and --ok, and the gold and blue category tints.
  const STATUS_DEFAULT = {
    dark: { 'status-danger-fill': '#b8503f', 'status-ok-fill': '#6fae6b', 'status-warn-fill': '#d9a93c', 'status-info-fill': '#6aa6e8' },
    light: { 'status-danger-fill': '#b8503f', 'status-ok-fill': '#6fae6b', 'status-warn-fill': '#94680a', 'status-info-fill': '#2a62b0' },
  };

  // ---- the roles. f is the formula: ['mix', a, aPercent, b] (b a role, or transparent, white, black) or ['ref', a]. ----
  const M = (a, pa, b) => ['mix', a, pa, b];
  const REF = (a) => ['ref', a];
  const LIT = ['transparent', 'white', 'black'];
  const R = [];
  const add = (id, area, kind, job, o) => R.push(Object.assign({ id, area, kind, job }, o || {}));
  const S = 'Surfaces'; const T = 'Text'; const E = 'Edges'; const I = 'Interaction'; const ST = 'Status'; const C = 'Category';
  // Surfaces
  add('surface-page', S, 'surface', 'The page background', { base: true });
  add('surface-panel', S, 'surface', 'A side panel, dialog or editor body, dashboard widget, action bar', { base: true });
  add('surface-card', S, 'surface', 'A raised object inside a panel', { f: M('surface-panel', 92, 'text-primary') });
  add('surface-field', S, 'surface', 'The inside of an input, select or textarea', { f: M('surface-page', 85, 'edge-hairline') });
  add('surface-menu', S, 'surface', 'A menu or dropdown', { f: M('surface-panel', 96, 'text-primary') });
  add('surface-popover', S, 'surface', 'A popover or the emoji picker', { f: REF('surface-menu'), unseen: 'Popovers and the emoji picker (not drawn in this screen)' });
  add('surface-toast', S, 'surface', 'A toast', { f: REF('surface-card') });
  add('surface-tooltip', S, 'surface', 'A tooltip', { f: REF('text-primary'), how: 'inverse of the page: the text colour' });
  add('surface-chat-message', S, 'surface', 'A chat bubble', { f: REF('surface-field') });
  add('surface-chat-own', S, 'surface', 'Your own chat bubble', { f: M('accent-fill', 22, 'transparent'), over: 'surface-canvas' });
  add('surface-titlebar', S, 'surface', 'A module title bar', { f: REF('surface-field') });
  add('surface-toolbar', S, 'surface', 'A module toolbar row', { f: REF('surface-field') });
  add('surface-bar-top', S, 'surface', 'The top bar', { f: REF('surface-page'), how: 'the page (can be set on its own)' });
  add('surface-bar-nav', S, 'surface', 'The space bar and the phone tab bar', { f: REF('surface-page'), how: 'the page (can be set on its own)' });
  add('surface-bar-brand', S, 'surface', 'The logo zone of the top bar', { f: M('surface-bar-top', 97, 'black') });
  add('surface-bar-right', S, 'surface', 'The bell and avatar zone of the top bar', { f: M('surface-bar-top', 97, 'black') });
  add('surface-canvas', S, 'surface', 'The work area, and the call canvas', { f: REF('surface-page') });
  add('surface-track', S, 'surface', 'A scrollbar track or a progress track', { f: M('surface-panel', 88, 'text-primary'), changed: 'The spec says "panel", which makes a track vanish inside a panel; this is panel + 12% text.' });
  // Text
  add('text-primary', T, 'text', 'Body text', { base: true, on: 'surface-page', pairs: [['surface-page', 4.5], ['surface-panel', 4.5], ['surface-card', 4.5], ['surface-field', 4.5], ['surface-menu', 4.5], ['surface-chat-own', 4.5, 'surface-canvas']] });
  add('text-muted', T, 'text', 'Hints, labels, times', { base: true, on: 'surface-panel', pairs: [['surface-page', 4.5], ['surface-panel', 4.5], ['surface-card', 4.5], ['surface-field', 4.5]] });
  add('text-on-accent', T, 'text', 'Text on a solid accent fill (auto-picked to pass)', { base: true, on: 'accent-fill', pairs: [['accent-fill', 4.5], ['accent-fill-hover', 4.5]] });
  add('text-disabled', T, 'text', 'Disabled text', { f: M('text-muted', 55, 'transparent'), on: 'surface-panel', pairs: [['surface-panel', 0]] });
  add('text-bar', T, 'text', 'Text and icons in the bars', { f: REF('text-primary'), on: 'surface-bar-top', pairs: [['surface-bar-top', 4.5], ['surface-bar-brand', 4.5], ['surface-bar-right', 4.5]] });
  // Accent as text, picked automatically: the accent itself if it reaches 4.5:1 on the page and on a panel, else the least text colour mixed
  // into it (darker in light, lighter in dark) that does. Link text is this role.
  add('text-accent', T, 'text', 'The accent used as text (auto-picked to pass)', { auto: { kind: 'text', fill: 'accent-fill', floor: 0, on: ['surface-page', 'surface-panel'] }, from: ['accent-fill', 'text-primary', 'surface-page', 'surface-panel'], on: 'surface-page', how: 'the accent, mixed with the least text colour that reaches 4.5:1', pairs: [['surface-page', 4.5], ['surface-panel', 4.5]], unseen: 'Any word coloured with the accent; link text is this role' });
  add('text-link', T, 'text', 'Link text', { f: REF('text-accent'), on: 'surface-page', pairs: [['surface-page', 4.5], ['surface-panel', 4.5]] });
  add('text-selected', T, 'text', 'Selected tab or row text', { f: M('accent-fill', 55, 'text-primary'), on: 'fill-selected', onOver: 'surface-panel', pairs: [['fill-selected', 4.5, 'surface-panel'], ['fill-selected', 4.5, 'surface-page']] });
  add('text-tooltip', T, 'text', 'Text in a tooltip', { f: REF('surface-page'), added: true, on: 'surface-tooltip', pairs: [['surface-tooltip', 4.5]] });
  add('icon-default', T, 'icon', 'An icon', { f: REF('text-muted'), on: 'surface-panel', pairs: [['surface-panel', 3]] });
  add('icon-bar', T, 'icon', 'An icon in a bar', { f: M('text-bar', 75, 'transparent'), on: 'surface-bar-top', pairs: [['surface-bar-top', 3], ['surface-bar-right', 3]] });
  // Edges
  add('edge-hairline', E, 'edge', 'A divider or a card outline', { base: true, pairs: [['surface-panel', 0]] });
  add('edge-field', E, 'edge', 'A field outline', { f: M('edge-hairline', 80, 'text-primary'), pairs: [['surface-panel', 3]], accepted: 'Accepted exception to the 3:1 target for non-text: the field is a hairline by design (1.7 to 2.4:1 on a panel in the three themes). The fill separates the field from the panel, and focus and error are strong.' });
  add('edge-bar', E, 'edge', 'The line under a bar', { f: REF('edge-hairline'), pairs: [['surface-bar-top', 0]] });
  add('edge-menu', E, 'edge', 'A menu outline', { f: REF('edge-hairline'), pairs: [['surface-menu', 0]] });
  add('scrollbar-thumb', E, 'edge', 'The scrollbar thumb', { f: REF('text-muted'), pairs: [['surface-track', 3]], changed: 'Was the hairline (about 1.0 to 1.1:1 against its track). Muted text at 55% over the track only reaches 1.9 to 2.4:1 and needs about 92% to reach 3:1 in every theme, so the thumb is the muted text colour itself (3.4:1 to 4.4:1).' });
  // Interaction
  add('accent-fill', I, 'fill', 'A solid accent button, bar or badge fill', { base: true, pairs: [['surface-page', 3], ['surface-track', 3]] });
  add('accent-fill-hover', I, 'fill', 'Hover on a solid accent fill', { f: M('accent-fill', 85, 'white') });
  add('fill-hover', I, 'fill', 'A hover wash on a row, tab or icon', { f: M('text-primary', 8, 'transparent') });
  add('fill-selected', I, 'fill', 'Selected tab, row, chip or day', { f: M('accent-fill', 28, 'transparent') });
  add('fill-today', I, 'fill', "Today's cell", { f: M('accent-fill', 14, 'transparent') });
  add('fill-secondary', I, 'fill', 'A secondary button', { f: REF('surface-card') });
  add('fill-secondary-hover', I, 'fill', 'A secondary button, hovered', { f: M('surface-card', 94, 'text-primary') });
  add('focus-ring', I, 'edge', 'The focus outline', { f: REF('accent-fill'), pairs: [['surface-page', 3], ['surface-panel', 3]] });
  add('overlay-scrim', I, 'fill', 'The dim layer behind a dialog', { f: M('surface-page', 70, 'transparent'), unseen: 'The dim layer behind a dialog (not drawn in this screen)' });
  add('shadow-color', I, 'fill', 'The tint of a shadow', { css: 'color-mix(in srgb, #000 35%, transparent)', cssLight: 'color-mix(in srgb, #000 15%, transparent)', how: 'black at 35% (dark) or 15% (light)' });
  // Status: each has a fill (the optional base), readable text, and a soft background
  for (const [k, word] of [['danger', 'Danger'], ['ok', 'OK'], ['warn', 'Warning'], ['info', 'Info']]) {
    add(`status-${k}-fill`, ST, 'fill', `${word}: the solid fill`, { base: true, optional: true, pairs: [['surface-page', 3]] });
    add(`status-${k}-text`, ST, 'text', `${word}: readable text (auto-picked to pass)`, { auto: { kind: 'text', fill: `status-${k}-fill`, floor: 30, on: ['surface-page', 'surface-panel', `status-${k}-tint`] }, from: [`status-${k}-fill`, 'text-primary', 'surface-page', 'surface-panel'], how: 'the fill with at least 30% text colour, the least that reaches 4.5:1', on: 'surface-page', pairs: [['surface-page', 4.5], ['surface-panel', 4.5], [`status-${k}-tint`, 4.5, 'surface-panel']] });
    add(`status-${k}-tint`, ST, 'fill', `${word}: a soft background`, { f: M(`status-${k}-fill`, 12, 'transparent') });
  }
  // Text or a glyph on a solid status fill: one per status, picked automatically from the fill (the same rule as text on accent).
  for (const [k, word] of [['danger', 'Danger'], ['ok', 'OK'], ['warn', 'Warning'], ['info', 'Info']]) {
    add(`status-${k}-on-fill`, ST, 'text', `${word}: text or a glyph on its fill (auto-picked to pass)`, { auto: { kind: 'on', fill: `status-${k}-fill` }, from: [`status-${k}-fill`], how: 'white or near-black, whichever reaches 4.5:1', on: `status-${k}-fill`, pairs: [[`status-${k}-fill`, 4.5]] });
  }
  // Category: the module identity colours, unchanged
  for (const k of ['gold', 'blue', 'green', 'teal', 'purple', 'red', 'orange', 'pink']) add(`tint-${k}`, C, 'fill', `A module's identity colour (${k})`, { kept: true, css: null, pairs: [['surface-panel', 3]] });

  const BY = Object.fromEntries(R.map((r) => [r.id, r]));
  const isRole = (x) => Object.prototype.hasOwnProperty.call(BY, x);
  for (const r of R) {
    if (r.f && !r.from) r.from = r.f.slice(1).filter((x) => typeof x === 'string' && isRole(x));
    r.from = r.from || [];
  }
  // Which roles move when this one changes: every role that is computed from it, directly or through others.
  const kids = {};
  for (const r of R) for (const p of r.from) (kids[p] = kids[p] || []).push(r.id);
  const follow = (id) => { const seen = new Set(); const go = (x) => { for (const k of kids[x] || []) if (!seen.has(k)) { seen.add(k); go(k); } }; go(id); return seen; };
  const short = (id) => id.replace(/^(surface|text|edge|fill|status)-/, '').replace(/-fill$/, '');
  const nick = (id) => ({ 'surface-page': 'page', 'surface-panel': 'panel', 'text-primary': 'text', 'text-muted': 'muted text', 'edge-hairline': 'hairline', 'accent-fill': 'accent', 'surface-card': 'card', 'surface-field': 'field', 'surface-menu': 'menu', 'surface-bar-top': 'top bar', 'text-bar': 'bar text', 'surface-canvas': 'canvas' }[id] || short(id).replace(/-/g, ' '));
  function cssOf(r) {
    if (r.css) return r.css;
    const f = r.f;
    if (f[0] === 'ref') return `var(--${f[1]})`;
    const col = (x) => (LIT.includes(x) ? x : `var(--${x})`);
    return `color-mix(in srgb, ${col(f[1])} ${f[2]}%, ${col(f[3])})`;
  }
  function wordsOf(r) {
    if (r.how) return r.how;
    const f = r.f;
    if (f[0] === 'ref') return `same as ${nick(f[1])}`;
    const [, a, pa, b] = f;
    if (b === 'transparent') return `${pa}% ${nick(a)} wash`;
    if (b === 'white' || b === 'black') return `${nick(a)} ${pa}% + ${b}`;
    return pa >= 90 ? `${nick(a)} + ${100 - pa}% ${nick(b)}` : `${nick(a)} ${pa}% + ${nick(b)} ${100 - pa}%`;
  }
  // The stylesheet of derived roles, written from the same table the board reads, so the words and the colours cannot drift apart.
  function roleCss() {
    const lines = R.filter((r) => !r.base && !r.kept && (r.f || r.css)).map((r) => `  --${r.id}: ${cssOf(r)};`);
    return `.ds-colour {\n${lines.join('\n')}\n}\n.ds-colour[data-mode="light"] { --shadow-color: ${BY['shadow-color'].cssLight}; }`;
  }

  // ---- colour maths ----
  const clamp = (n) => Math.max(0, Math.min(255, n));
  const hex2 = (n) => Math.round(clamp(n)).toString(16).padStart(2, '0');
  const toHex = (c) => '#' + hex2(c.r) + hex2(c.g) + hex2(c.b);
  const fromHex = (x) => { const m = /^#?([0-9a-f]{6})$/i.exec(x || ''); if (!m) return null; const n = parseInt(m[1], 16); return { r: n >> 16, g: (n >> 8) & 255, b: n & 255, a: 1 }; };
  function parseCss(s) {
    const n = (s.match(/-?[\d.]+(?:e-?\d+)?%?/g) || []).map((x) => (x.endsWith('%') ? parseFloat(x) / 100 : parseFloat(x)));
    if (/^color\(/.test(s)) return { r: n[0] * 255, g: n[1] * 255, b: n[2] * 255, a: n.length > 3 ? n[3] : 1 };
    return { r: n[0], g: n[1], b: n[2], a: n.length > 3 ? n[3] : 1 };
  }
  const over = (f, b) => ({ r: f.r * f.a + b.r * (1 - f.a), g: f.g * f.a + b.g * (1 - f.a), b: f.b * f.a + b.b * (1 - f.a), a: 1 });
  const lum = (c) => { const f = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b); };
  const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };

  // ---- the automatic picks (computed at render from the fill; nothing is stored) ----
  // On a solid fill: white or near-black, whichever has more contrast with the fill, if it reaches 4.5:1; if neither does, the fill is flagged.
  const WHITE = '#ffffff'; const NEAR_BLACK = '#0a0a0a'; const MIN_TEXT = 4.5;
  function pickOn(fill) {
    const w = ratio(fromHex(WHITE), fill); const d = ratio(fromHex(NEAR_BLACK), fill);
    const hex = w >= d ? WHITE : NEAR_BLACK; const best = Math.max(w, d);
    return { hex, ratio: best, ok: best >= MIN_TEXT };
  }
  // Colour as text: the fill itself if it reaches 4.5:1 on every background, else the fill mixed with the least text colour (from floor percent up, in
  // whole percents) that does. In light the text colour is dark, in dark it is light, so the result is the darker or the lighter mix.
  function pickText(fill, textC, bgs, floor) {
    let last = null;
    for (let p = floor; p <= 100; p += 1) {
      const t = p / 100; const c = { r: Math.round(fill.r * (1 - t) + textC.r * t), g: Math.round(fill.g * (1 - t) + textC.g * t), b: Math.round(fill.b * (1 - t) + textC.b * t), a: 1 };
      const worst = Math.min(...bgs.map((b) => ratio(c, b)));
      last = { hex: toHex(c), p, ratio: worst, ok: worst >= MIN_TEXT };
      if (last.ok) return last;
    }
    return last;
  }

  // ---- state ----
  const st = { auto: {}, theme: 'coffee', mode: 'dark', edits: {}, preview: null, sel: null, part: null, vals: {}, flat: {} };
  const editKey = () => st.theme + '|' + st.mode;
  const baseSet = () => {
    const t = THEMES[st.theme][st.mode];
    const o = {};
    for (const [id, k] of Object.entries(KEY)) o[id] = t[k];
    Object.assign(o, STATUS_DEFAULT[st.mode]);
    return Object.assign(o, st.edits[editKey()] || {});
  };
  const BASE_IDS = R.filter((r) => r.base).map((r) => r.id);
  const LABEL = { 'surface-page': 'Page', 'surface-panel': 'Panel', 'text-primary': 'Text', 'text-muted': 'Muted text', 'edge-hairline': 'Hairline', 'accent-fill': 'Accent', 'text-on-accent': 'Text on accent', 'status-danger-fill': 'Danger', 'status-ok-fill': 'OK', 'status-warn-fill': 'Warning', 'status-info-fill': 'Info' };

  let scope = null; let wrap = null; let mock = null; let svgHost = null; let detail = null; let board = null; let probes = null;

  // ---- the mock: one screen, coloured only by the roles. data-roles lists the roles that colour that element itself. ----
  const ban = (k, word, icon, text) => `<div class="cm-ban cm-ban-${k}" data-roles="status-${k}-tint status-${k}-text" data-part="${word} banner"><span class="cm-ban-i" data-roles="status-${k}-fill status-${k}-on-fill" data-part="${word} banner icon">${fa(icon)}</span><span>${text}</span></div>`;
  const TINTS = ['gold', 'blue', 'green', 'teal', 'purple', 'red', 'orange', 'pink'];
  const MOCK = `
<div class="cm" data-roles="surface-page text-primary" data-part="Page">
  <div class="cm-top" data-roles="surface-bar-top text-bar" data-part="Top bar">
    <div class="cm-brand" data-roles="surface-bar-brand" data-part="Brand zone">${fa('mug-hot')}<b>Collab</b></div>
    <div class="cm-grow"></div>
    <div class="cm-right" data-roles="surface-bar-right" data-part="Bell zone">
      <span class="cm-ic" data-roles="icon-bar" data-part="Bar icon">${fa('bell')}</span>
      <span class="cm-badge" data-roles="accent-fill text-on-accent" data-part="Badge">3</span>
      <span class="cm-ic" data-roles="icon-bar" data-part="Bar icon">${fa('circle-user')}</span>
    </div>
  </div>
  <div class="cm-rule" data-roles="edge-bar" data-part="Bar edge"></div>
  <div class="cm-nav" data-roles="surface-bar-nav text-bar" data-part="Space bar">
    <span class="cm-navi on" data-roles="fill-selected text-selected" data-part="Selected destination">Paris trip</span>
    <span class="cm-navi hv" data-roles="fill-hover" data-part="Hovered tab">Plans</span>
    <span class="cm-navi">Budget</span>
    <div class="cm-grow"></div>
    <span class="cm-dots" aria-hidden="true">${TINTS.map((k) => `<i data-roles="tint-${k}" data-part="Module colours"></i>`).join('')}</span>
  </div>
  <div class="cm-rule" data-roles="edge-bar" data-part="Bar edge"></div>
  <div class="cm-body">
    <div class="cm-side" data-roles="surface-panel" data-part="Side panel">
      <div class="cm-h">Plans <span class="cm-muted" data-roles="text-muted" data-part="Hint text">3 objects</span></div>
      <div class="cm-card" data-roles="surface-card edge-hairline" data-part="Card">
        <div class="cm-row"><span class="cm-ico" data-roles="icon-default" data-part="Icon">${fa('landmark')}</span><span>Louvre</span><span class="cm-muted cm-r" data-roles="text-muted" data-part="Hint text">9:30</span></div>
        <div class="cm-hair" data-roles="edge-hairline" data-part="Divider"></div>
        <div class="cm-row hv" data-roles="fill-hover" data-part="Hovered row"><span class="cm-ico" data-roles="icon-default" data-part="Icon">${fa('utensils')}</span><span>Lunch</span><span class="cm-muted cm-r" data-roles="text-muted" data-part="Hint text">12:30</span></div>
      </div>
      <div class="cm-field" data-roles="surface-field edge-field focus-ring" data-part="Field (focused)"><span class="cm-ph" data-roles="text-muted" data-part="Hint text">Add a place</span></div>
      <div class="cm-line"><span class="cm-link" data-roles="text-link" data-part="Link">Open the map</span></div>
      <div class="cm-line">
        <span class="cm-btn" data-roles="fill-secondary" data-part="Secondary button">Edit</span>
        <span class="cm-btn hv" data-roles="fill-secondary-hover" data-part="Secondary button (hover)">Share</span>
        <span class="cm-btn dis" data-roles="fill-secondary text-disabled" data-part="Disabled button">Print</span>
      </div>
      <div class="cm-menu" data-roles="surface-menu edge-menu shadow-color" data-part="Menu">
        <span class="cm-mi">Rename</span>
        <span class="cm-mi hv" data-roles="fill-hover" data-part="Hovered row">Duplicate</span>
        <span class="cm-mi dng" data-roles="status-danger-text" data-part="Danger text">Delete</span>
      </div>
    </div>
    <div class="cm-canvas" data-roles="surface-canvas" data-part="Work area">
      <div class="cm-title" data-roles="surface-titlebar" data-part="Module title bar"><span class="cm-ico" data-roles="tint-teal" data-part="Module colours">${fa('map-location-dot')}</span><b>Planner</b><span class="cm-r cm-ico" data-roles="icon-default" data-part="Icon">${fa('xmark')}</span></div>
      <div class="cm-tool" data-roles="surface-toolbar" data-part="Module toolbar">
        <span class="cm-btn pri" data-roles="accent-fill text-on-accent" data-part="Primary button">${fa('plus')} Add</span>
        <span class="cm-btn" data-roles="fill-secondary" data-part="Secondary button">Edit</span>
        <span class="cm-tab on" data-roles="fill-selected text-selected" data-part="Selected tab">Day</span>
        <span class="cm-tab" data-roles="text-muted" data-part="Hint text">Week</span>
        <span class="cm-tab" data-roles="text-muted" data-part="Hint text">Map</span>
      </div>
      <div class="cm-content">
        <div class="cm-chat">
          <div class="cm-msgs">
            <div class="cm-bub" data-roles="surface-chat-message" data-part="Chat bubble">Louvre first? <span class="cm-muted" data-roles="text-muted" data-part="Hint text">Sam</span></div>
            <div class="cm-bub own" data-roles="surface-chat-own" data-part="Own chat bubble">Yes, 9:30 works.</div>
          </div>
          <div class="cm-sbt" data-roles="surface-track" data-part="Scrollbar track"><i class="cm-sbh" data-roles="scrollbar-thumb" data-part="Scrollbar thumb"></i></div>
        </div>
        <div class="cm-bans">
          ${ban('danger', 'Danger', 'circle-exclamation', 'Payment failed')}
          ${ban('ok', 'OK', 'circle-check', 'Saved')}
          ${ban('warn', 'Warning', 'triangle-exclamation', 'Closes at 6')}
          ${ban('info', 'Info', 'circle-info', 'Sam joined')}
        </div>
        <div class="cm-prog"><div class="cm-bar" data-roles="surface-track" data-part="Progress track"><i data-roles="accent-fill" data-part="Progress fill"></i></div><span class="cm-muted" data-roles="text-muted" data-part="Hint text">60% planned</span></div>
        <div class="cm-days">${['M', 'T', 'W', 'T', 'F'].map((d, i) => `<span class="cm-day${i === 2 ? ' today' : ''}" data-roles="${i === 2 ? 'fill-today' : 'surface-card'}" data-part="${i === 2 ? "Today's cell" : 'Day cell'}">${d}</span>`).join('')}</div>
        <div class="cm-tipwrap"><span class="cm-tip" data-roles="surface-tooltip text-tooltip shadow-color" data-part="Tooltip">Send to Sam</span><span class="cm-btn pri hv" data-roles="accent-fill-hover text-on-accent" data-part="Primary button (hover)">${fa('paper-plane')} Send</span></div>
      </div>
      <div class="cm-toast" data-roles="surface-toast shadow-color" data-part="Toast">${fa('check')} Plan saved</div>
    </div>
  </div>
</div>`;

  // ---- the Today vs Proposed strip: the five tokens that colour the most unrelated things today (the spec's table) ----
  const OVERLAPS = [
    { tok: '--bg-section', now: 'surface-panel', items: [['Side panel', 'surface-panel'], ['Dialog and editor', 'surface-panel'], ['Toast', 'surface-toast'], ['Menu', 'surface-menu'], ['Popover', 'surface-popover'], ['Chat command menu', 'surface-menu'], ['Dashboard widget', 'surface-panel'], ['Action bar', 'surface-panel'], ['Scrollbar track', 'surface-track'], ['Secondary button', 'fill-secondary']] },
    { tok: '--bg-card', now: 'surface-field', items: [['Card', 'surface-card'], ['Bell list', 'surface-menu'], ['Menu', 'surface-menu'], ['Popover', 'surface-popover'], ['Chip', 'surface-card'], ['Chat object', 'surface-chat-message'], ['Skeleton loader', 'surface-card'], ['Calendar day cell', 'surface-card'], ['Progress track', 'surface-track']] },
    { tok: '--border', now: 'edge-hairline', items: [['Divider', 'edge-hairline'], ['Top bar edge', 'edge-bar'], ['Field outline', 'edge-field'], ['Card outline', 'edge-hairline'], ['Menu outline', 'edge-menu'], ['Scrollbar thumb', 'scrollbar-thumb'], ['Tint inside a field', 'surface-field']] },
    { tok: '--accent', now: 'accent-fill', items: [['Link', 'text-link'], ['Focus ring', 'focus-ring'], ['Primary button', 'accent-fill'], ['Badge', 'accent-fill'], ['Progress fill', 'accent-fill'], ['Selected fill', 'fill-selected'], ['Hover wash', 'fill-hover'], ['Secondary button', 'fill-secondary']] },
    { tok: '--bg', now: 'surface-page', items: [['Page', 'surface-page'], ['Modal backdrop', 'overlay-scrim'], ['Module window', 'surface-canvas'], ['Chat action strip', 'surface-toolbar'], ['Top bar', 'surface-bar-top'], ['Field fill', 'surface-field'], ['Toolbar fill', 'surface-toolbar']] },
  ];
  const chipFor = (role, label, today) => {
    const r = BY[role];
    const txt = r.kind === 'text' || r.kind === 'icon';
    const style = today ? `background:var(--${role});color:var(--${role === 'accent-fill' ? 'text-on-accent' : 'text-primary'})` : txt ? `background:var(--surface-panel);color:var(--${role})` : `background:linear-gradient(var(--${role}),var(--${role})),var(--surface-panel);color:var(--${role === 'accent-fill' ? 'text-on-accent' : 'text-primary'})`;
    return `<span class="cs-chip" style="${style}">${h(label)}${today ? '' : `<small>${h(role.replace(/^(surface|text|edge|fill|status)-/, ''))}</small>`}</span>`;
  };
  const stripHtml = () => OVERLAPS.map((o) => `<div class="cs-row">
    <div class="cs-side"><div class="cs-cap">Today</div><div class="cs-sq" style="background:var(--${o.now});color:var(--${o.now === 'accent-fill' ? 'text-on-accent' : 'text-primary'})" title="${o.tok}"><code>${o.tok}</code></div><div class="cs-chips">${o.items.map(([n]) => chipFor(o.now, n, true)).join('')}</div></div>
    <div class="cs-arrow" aria-hidden="true">${fa('arrow-right')}</div>
    <div class="cs-side"><div class="cs-cap">Proposed</div><div class="cs-chips">${o.items.map(([n, r]) => chipFor(r, n, false)).join('')}</div></div>
  </div>`).join('');

  // ---- the board ----
  const chipBg = (on, ov) => (ov ? `background:linear-gradient(var(--${on}),var(--${on})),var(--${ov})` : `background:var(--${on})`);
  function swatch(r) {
    const tag = r.base ? (r.optional ? 'base, optional' : 'base') : r.kept ? 'kept' : 'derived';
    const how = r.base ? (r.optional ? 'set by the theme, or auto' : 'set by the theme') : r.kept ? 'the same as today' : '= ' + wordsOf(r);
    let chip;
    if (r.kind === 'text') chip = `<span class="cb-chip" style="${chipBg(r.on, r.onOver)}"><span class="cb-aa" style="color:var(--${r.id})">Aa</span></span>`;
    else if (r.kind === 'icon') chip = `<span class="cb-chip" style="${chipBg(r.on)}"><span class="cb-aa" style="color:var(--${r.id})">${fa('star')}</span></span>`;
    else chip = `<span class="cb-chip" style="${chipBg(r.id, 'surface-panel')}"></span>`;
    return `<button type="button" class="cb-sw" data-role="${r.id}" aria-pressed="false">
      ${chip}
      <span class="cb-body">
        <span class="cb-name"><code>--${r.id}</code><em class="cb-tag${r.base ? ' cb-base' : ''}">${tag}</em></span>
        <span class="cb-job">${h(r.job)}</span>
        <span class="cb-how">${h(how)}</span>
        <span class="cb-val"><span class="cb-hex" data-hex="${r.id}"></span></span>
        <span class="cb-pairs" data-pairs="${r.id}"></span>
      </span>
    </button>`;
  }
  const AREAS = [S, T, E, I, ST, C];
  const boardHtml = () => AREAS.map((a) => `<section class="cb-area" aria-label="${a}"><h4>${a}<span>${R.filter((r) => r.area === a).length}</span></h4>${R.filter((r) => r.area === a).map(swatch).join('')}</section>`).join('');

  // ---- reading the computed colours ----
  function readVals() {
    const v = {};
    for (const p of probes.children) v[p.dataset.p] = parseCss(getComputedStyle(p).color);
    st.vals = v;
    const flat = {};
    const flatOf = (id, ov) => {
      const key = id + '>' + (ov || '');
      if (flat[key]) return flat[key];
      const c = v[id];
      const r = c.a >= 0.999 ? { r: c.r, g: c.g, b: c.b, a: 1 } : over(c, flatOf(ov || BY[id].over || 'surface-panel'));
      flat[key] = r;
      return r;
    };
    st.flatOf = flatOf;
  }
  const pairCalc = (fgId, p) => {
    const [onId, min, ov] = p;
    const bg = st.flatOf(onId, ov);
    const c = st.vals[fgId];
    const fg = c.a >= 0.999 ? c : over(c, bg);
    return { bg, fg, ratio: ratio(fg, bg), min, onId, ov };
  };
  function fillBoard() {
    for (const r of R) {
      const hx = board.querySelector(`[data-hex="${r.id}"]`);
      const au = st.auto[r.id];
      if (au) {
        const how = board.querySelector(`.cb-sw[data-role="${r.id}"] .cb-how`);
        how.textContent = au.kind === 'on' ? `= ${au.hex === WHITE ? 'white' : 'near-black'}: ${au.ratio.toFixed(2)} : 1 on the fill${au.ok ? '' : ', flagged: neither reaches 4.5'}` : (au.p === 0 ? '= the colour itself, which reaches 4.5:1 on every background' : au.p === au.floor ? `= the colour with ${au.p}% text mixed in (the ${au.p}% floor already reaches 4.5:1 on every background)` : `= the colour with ${au.p}% text mixed in: the least that reaches 4.5:1 on ${au.ok ? 'every background' : 'every background, and none does (flagged)'}`);
      }
      const c = st.vals[r.id];
      const flatHex = toHex(st.flatOf(r.id));
      hx.textContent = flatHex;
      hx.dataset.value = flatHex;
      hx.title = c.a < 0.999 ? `${Math.round(c.a * 100)}% see-through; shown over the panel` : '';
      hx.innerHTML = `${flatHex}${c.a < 0.999 ? `<small>${Math.round(c.a * 100)}% over panel</small>` : ''}`;
      const box = board.querySelector(`[data-pairs="${r.id}"]`);
      if (!r.pairs) { box.innerHTML = ''; continue; }
      const flagged = Object.values(st.auto).some((a) => a.kind === 'on' && a.fill === r.id && !a.ok);
      box.innerHTML = (flagged ? '<span class="cb-pair cb-flag"><span class="cb-mark cb-fail">&#10007; flagged: neither white nor near-black reaches 4.5:1 on this fill</span></span>' : '') + r.pairs.map((p) => {
        const x = pairCalc(r.id, p);
        const nonText = r.kind !== 'text' && r.kind !== 'icon' ? true : p[1] === 3;
        const ok = x.min === 0 ? null : x.ratio >= x.min;
        const where = nick(x.onId) + (x.ov ? ` over ${nick(x.ov)}` : '');
        const mark = x.min === 0 ? '<span class="cb-mark cb-na">no minimum</span>' : `<span class="cb-mark ${ok ? 'cb-pass' : 'cb-fail'}">${ok ? '&#10003; pass' : '&#10007; fail'}</span>`;
        return `<span class="cb-pair" data-ratio="${x.ratio.toFixed(2)}" data-fg="${toHex(x.fg)}" data-bg="${toHex(x.bg)}" data-min="${x.min}" data-pass="${ok === null ? '' : ok}"><b>${x.ratio.toFixed(2)}</b> on ${h(where)} <span class="cb-need">needs ${x.min || '-'}${x.min ? (nonText ? ' (non-text)' : '') : ''}</span> ${mark}</span>`;
      }).join('') + (r.accepted && r.pairs.some((p) => pairCalc(r.id, p).ratio < p[1]) ? `<span class="cb-note">${h(r.accepted)}</span>` : '');
    }
  }

  // ---- highlight: a soft dim of the rest, a hatch on the parts the role colours; no outlines, no coloured edges ----
  const annotated = () => [...mock.querySelectorAll('[data-roles]')];
  const rolesOf = (el) => el.dataset.roles.split(/\s+/);
  function hits(role) {
    const fo = follow(role);
    const direct = []; const via = [];
    for (const el of annotated()) {
      const rs = rolesOf(el);
      if (rs.includes(role)) direct.push(el);
      else if (rs.some((x) => fo.has(x))) via.push(el);
    }
    return { direct, via, fo };
  }
  function paint() {
    const role = st.preview || st.sel;
    svgHost.innerHTML = '';
    wrap.classList.toggle('hl', !!role);
    for (const b of board.querySelectorAll('.cb-sw')) { b.classList.toggle('sel', b.dataset.role === st.sel); b.setAttribute('aria-pressed', String(b.dataset.role === st.sel)); b.classList.toggle('peek', b.dataset.role === role && role !== st.sel); }
    renderDetail(role);
    if (!role) return;
    const { direct, via } = hits(role);
    const W = wrap.clientWidth; const H = wrap.clientHeight;
    const wr = wrap.getBoundingClientRect();
    const rect = (el, fill) => {
      const r = el.getBoundingClientRect();
      const rx = Math.min(parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0, r.height / 2, r.width / 2);
      return `<rect x="${(r.left - wr.left).toFixed(1)}" y="${(r.top - wr.top).toFixed(1)}" width="${r.width.toFixed(1)}" height="${r.height.toFixed(1)}" rx="${rx}" fill="${fill}"/>`;
    };
    const set = (arr) => new Set(arr);
    const D1 = set(direct); const V1 = set(via);
    const els = annotated();
    const mask = (id, pick) => `<mask id="${id}" maskUnits="userSpaceOnUse" x="0" y="0" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="black"/>${els.map((el) => rect(el, pick(el) ? 'white' : 'black')).join('')}</mask>`;
    svgHost.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" aria-hidden="true" focusable="false">
      <defs>
        <pattern id="cb-hatch" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="rgba(255,255,255,0.28)"/><rect width="2.5" height="8" fill="rgba(255,255,255,0.8)"/><rect x="4" width="2" height="8" fill="rgba(0,0,0,0.22)"/></pattern>
        <pattern id="cb-hatch2" width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="8" height="8" fill="rgba(255,255,255,0.12)"/><rect width="1.5" height="8" fill="rgba(255,255,255,0.45)"/></pattern>
        ${mask('cb-m-dim', (el) => !D1.has(el) && !V1.has(el))}
        ${mask('cb-m-d', (el) => D1.has(el))}
        ${mask('cb-m-v', (el) => V1.has(el))}
      </defs>
      <rect class="cb-dim" width="${W}" height="${H}" mask="url(#cb-m-dim)"/>
      <rect class="cb-flash" width="${W}" height="${H}" fill="url(#cb-hatch2)" mask="url(#cb-m-v)"/>
      <rect class="cb-flash" width="${W}" height="${H}" fill="url(#cb-hatch)" mask="url(#cb-m-d)"/>
    </svg>`;
  }
  function renderDetail(role) {
    if (!role) {
      detail.innerHTML = `<div class="cd-empty"><b>What does this role drive?</b><span>Hover or focus a role in the board, or click a part of the screen. Esc clears.</span></div>`;
      return;
    }
    const r = BY[role];
    const { direct, via } = hits(role);
    const uniq = (els) => [...new Set(els.map((e) => e.dataset.part))];
    const dn = uniq(direct);
    const vn = uniq(via).filter((n) => !dn.includes(n));
    const viaOf = (name) => {
      const fo = follow(role);
      const roles = new Set();
      for (const el of via.filter((e) => e.dataset.part === name)) for (const x of rolesOf(el)) if (fo.has(x)) roles.add(nick(x));
      return [...roles].join(', ');
    };
    const tag = r.base ? 'base' : r.kept ? 'kept' : 'derived';
    const fol = [...follow(role)];
    detail.innerHTML = `<div class="cd-head"><code>--${role}</code><em class="cb-tag${r.base ? ' cb-base' : ''}">${tag}</em><span>${h(r.job)}</span></div>
      <div class="cd-cols">
        <div><small>Drives</small>${dn.length ? `<ul>${dn.map((n) => `<li>${h(n)}</li>`).join('')}</ul>` : `<p>${h(r.unseen || 'Nothing in this screen.')}</p>`}</div>
        ${vn.length || fol.length ? `<div><small>Follows through</small>${vn.length ? `<ul>${vn.slice(0, 10).map((n) => `<li>${h(n)} <span>(${h(viaOf(n))})</span></li>`).join('')}${vn.length > 10 ? `<li>+${vn.length - 10} more</li>` : ''}</ul>` : '<p>No other part of this screen.</p>'}${fol.length ? `<p class="cd-roles">Roles computed from it (${fol.length}): ${fol.slice(0, 8).map((x) => nick(x)).join(', ')}${fol.length > 8 ? ' and more' : ''}</p>` : ''}</div>` : ''}
      </div>${st.part ? `<div class="cd-part"><small>This part of the screen uses</small>${st.part.map((x) => `<button type="button" class="btn btn-small${x === role ? ' on' : ''}" data-pick="${x}">${h(nick(x))}</button>`).join('')}</div>` : ''}`;
  }

  // ---- the playground ----
  function playHtml() {
    const ids = BASE_IDS;
    return `<div class="cp-grid">${ids.map((id) => `<label class="cp-in" data-for="${id}"><span>${LABEL[id]}${BY[id].optional ? ' <em>optional</em>' : ''}</span><input type="color" data-base="${id}" value="#000000" aria-label="${LABEL[id]}"><code data-code="${id}"></code></label>`).join('')}</div>
      <div class="cp-warn" id="cp-warn" role="status" aria-live="polite"></div>
      <div class="cp-actions">
        <button type="button" class="btn btn-small" id="cp-reset">Reset</button>
        <button type="button" class="btn btn-small" id="cp-copy">Copy as theme JSON</button>
        <button type="button" class="btn btn-small" id="cp-ex-panel">Example: change Panel</button>
        <button type="button" class="btn btn-small" id="cp-ex-accent">Example: change Accent</button>
      </div>
      <div class="cp-json" id="cp-json" hidden><textarea readonly rows="8" aria-label="Theme JSON"></textarea></div>`;
  }
  const WARN_PAIRS = [['text-primary', 'surface-page', 4.5, 'Text on page'], ['text-primary', 'surface-panel', 4.5, 'Text on panel'], ['text-muted', 'surface-page', 4.5, 'Muted text on page'], ['text-muted', 'surface-panel', 4.5, 'Muted text on panel'], ['text-on-accent', 'accent-fill', 4.5, 'Text on accent'], ['accent-fill', 'surface-page', 3, 'Accent on page (bars, rings)']];
  function fillPlay() {
    const b = baseSet();
    for (const id of BASE_IDS) {
      const inp = scope.querySelector(`[data-base="${id}"]`);
      if (D.activeElement !== inp) inp.value = b[id];
      scope.querySelector(`[data-code="${id}"]`).textContent = b[id];
    }
    const warns = [];
    for (const [a, bg, min, label] of WARN_PAIRS) {
      const x = pairCalc(a, [bg, min]);
      if (x.ratio < min) warns.push(`<li><span><b>${label}</b>: ${x.ratio.toFixed(2)} : 1, needs ${min}</span>${a === 'text-on-accent' ? ' <button type="button" class="btn btn-small" id="cp-fix">Auto-fix text on accent</button>' : ''}</li>`);
    }
    for (const a of Object.values(st.auto)) if (a.kind === 'on' && !a.ok) warns.push(`<li><span><b>${LABEL[a.fill]} fill</b> is flagged: neither white nor near-black reaches 4.5 : 1 on it (best ${a.ratio.toFixed(2)})</span></li>`);
    scope.querySelector('#cp-warn').innerHTML = warns.length ? `<ul>${warns.join('')}</ul>` : '<span class="cp-ok">Every base pair passes.</span>';
  }

  // The roles that are picked, not mixed: computed from the fills now on the page, set on the scope, then read back with every other role.
  function runAuto() {
    const v = st.vals; const textC = st.flatOf('text-primary');
    st.auto = {};
    for (const r of R) {
      if (!r.auto) continue;
      const fill = st.flatOf(r.auto.fill);
      const x = r.auto.kind === 'on' ? pickOn(fill) : pickText(fill, textC, r.auto.on.map((id) => st.flatOf(id)), r.auto.floor);
      st.auto[r.id] = Object.assign({ kind: r.auto.kind, fill: r.auto.fill, floor: r.auto.floor }, x);
      scope.style.setProperty('--' + r.id, x.hex);
    }
  }

  // ---- applying a state to the page ----
  let flashTimer = 0;
  function apply(flash) {
    scope.dataset.mode = st.mode;
    const b = baseSet();
    const prev = st.vals;
    for (const id of Object.keys(b)) scope.style.setProperty('--' + id, b[id]);
    readVals();
    runAuto();
    readVals();
    fillBoard();
    fillPlay();
    if (flash && prev && Object.keys(prev).length) {
      let n = 0;
      for (const r of R) {
        const a = prev[r.id]; const c = st.vals[r.id];
        const sw = board.querySelector(`.cb-sw[data-role="${r.id}"]`);
        sw.classList.remove('flash');
        if (a && (Math.abs(a.r - c.r) + Math.abs(a.g - c.g) + Math.abs(a.b - c.b) + Math.abs(a.a - c.a) * 255 > 0.6)) { void sw.offsetWidth; sw.classList.add('flash'); n += 1; }
      }
      st.lastChanged = n;
      clearTimeout(flashTimer);
      flashTimer = setTimeout(() => { for (const s of board.querySelectorAll('.flash')) s.classList.remove('flash'); }, 1400);
    }
    paint();
  }
  const setPreview = (r) => { if (st.preview !== r) { st.preview = r; paint(); } };
  function select(role, part) {
    st.sel = role; st.part = part || null;
    paint();
    if (role) { const sw = board.querySelector(`.cb-sw[data-role="${role}"]`); if (sw && part) sw.scrollIntoView({ block: 'nearest' }); }
  }
  function setBase(id, hex) {
    const k = editKey();
    st.edits[k] = Object.assign(st.edits[k] || {}, { [id]: hex });
    apply(true);
  }
  function bestOnAccent() { return pickOn(st.flatOf('accent-fill')).hex; }
  function themeJson() {
    const out = { name: THEMES[st.theme].name + ' (edited)' };
    for (const m of ['light', 'dark']) {
      const t = Object.assign({}, THEMES[st.theme][m]);
      const e = st.edits[st.theme + '|' + m] || {};
      const status = {};
      for (const [id, v] of Object.entries(e)) { if (KEY[id]) t[KEY[id]] = v; else status[id.replace(/^status-|-fill$/g, '')] = v; }
      out[m] = t;
      if (Object.keys(status).length) out[m + 'Status'] = status;
    }
    return JSON.stringify(out, null, 2);
  }

  // ---- building the section ----
  function render(api) {
    const block = api.mk('section', 'ds-block ds-spec');
    const themeBtns = Object.entries(THEMES).map(([k, t], i) => `<button type="button" class="tb-tab${i === 0 ? ' on' : ''}" data-theme="${k}" aria-pressed="${i === 0}"><span class="tb-tab-word">${t.name}</span></button>`).join('');
    block.innerHTML = `<header><h3 id="colour-h" style="line-height:26px"><a href="#colour">Colour</a></h3><span class="ds-status-chip ds-st-approved" style="line-height:16px">Approved</span><span class="ds-count" style="line-height:18px">Decided 2026-10-19: 7 base roles, 4 optional status bases, ${R.filter((r) => !r.base && !r.kept).length} derived roles, 8 category tints</span></header>
<p class="ds-desc" style="line-height:20px">Seven colours a theme sets; everything else is worked out from them by a named formula, so each role drives one job. Pick a theme, then hover a role to see what it colours. Light or dark follows the switch at the top.</p>
<div class="ds-colour ds-proposed" id="colour-scope" data-mode="dark" data-font="proposed">
  <div class="cx-bar">
    <div class="tb-tabs" role="group" aria-label="Theme" id="cx-theme">${themeBtns}</div>
  </div>
  <div class="cx-grid">
    <div class="cx-left">
      <section class="cx-card" aria-labelledby="cx-try-h"><h4 id="cx-try-h">Try it</h4><p class="cx-note">Change a base colour for this theme and mode. Only the roles that move flash.</p>${playHtml()}</section>
      <div class="cb-board" id="cb-board">${boardHtml()}</div>
    </div>
    <div class="cx-right">
      <div class="cx-sticky">
        <div class="cd" id="cd" aria-live="polite"></div>
        <div class="cm-wrap" id="cm-wrap"><div class="cm-scene" id="cm-scene">${MOCK}</div><div class="cm-ov" id="cm-ov"></div></div>
        <p class="cx-note">The screen is a picture. Click a part of it to see its role; the roles are also in the board, which works with the keyboard.</p>
      </div>
    </div>
  </div>
  <h4 class="ds-h4">Today and proposed</h4>
  <p class="cx-note">The five tokens that colour the most unrelated things today. Left: one token, many jobs. Right: the same things, each with its own role.</p>
  <div class="cs" id="cs">${stripHtml()}</div>
  <div class="cb-probes" id="cb-probes" aria-hidden="true">${R.map((r) => `<i data-p="${r.id}" style="color:var(--${r.id})"></i>`).join('')}</div>
</div>`;
    scope = block.querySelector('#colour-scope');
    board = block.querySelector('#cb-board');
    wrap = block.querySelector('#cm-wrap');
    mock = block.querySelector('#cm-scene');
    svgHost = block.querySelector('#cm-ov');
    detail = block.querySelector('#cd');
    probes = block.querySelector('#cb-probes');

    if (!D.getElementById('ds-colour-roles')) { const s = D.createElement('style'); s.id = 'ds-colour-roles'; s.textContent = roleCss(); D.head.appendChild(s); }

    // theme and mode
    block.querySelector('#cx-theme').addEventListener('click', (e) => {
      const b = e.target.closest('button[data-theme]'); if (!b) return;
      st.theme = b.dataset.theme;
      for (const x of block.querySelectorAll('#cx-theme button')) { x.classList.toggle('on', x === b); x.setAttribute('aria-pressed', String(x === b)); }
      apply(false);
    });
    const syncMode = () => { const m = D.documentElement.dataset.themeMode === 'light' ? 'light' : 'dark'; if (m !== st.mode) { st.mode = m; apply(false); } };
    new MutationObserver(syncMode).observe(D.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
    const fontBar = D.getElementById('ds-font');
    const syncFont = (k) => { if (k) scope.dataset.font = k; else delete scope.dataset.font; };
    if (fontBar) fontBar.addEventListener('click', (e) => { const b = e.target.closest('button[data-font]'); if (b) syncFont(b.dataset.font); });

    // the board: hover and focus preview, click or tap selects, arrows move, Escape clears
    board.addEventListener('mouseover', (e) => { const s = e.target.closest('.cb-sw'); if (s) setPreview(s.dataset.role); });
    board.addEventListener('mouseleave', () => setPreview(null));
    board.addEventListener('focusin', (e) => { const s = e.target.closest('.cb-sw'); if (s) setPreview(s.dataset.role); });
    board.addEventListener('focusout', (e) => { if (!board.contains(e.relatedTarget)) setPreview(null); });
    board.addEventListener('click', (e) => {
      const s = e.target.closest('.cb-sw'); if (!s) return;
      const r = s.dataset.role;
      st.preview = null;
      select(st.sel === r ? null : r);
      if (st.sel && matchMedia('(max-width: 900px)').matches) wrap.scrollIntoView({ block: 'nearest' });
    });
    board.addEventListener('keydown', (e) => {
      if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
      const all = [...board.querySelectorAll('.cb-sw')];
      const i = all.indexOf(D.activeElement); if (i < 0) return;
      e.preventDefault();
      const n = all[Math.max(0, Math.min(all.length - 1, i + (e.key === 'ArrowDown' ? 1 : -1)))];
      n.focus();
    });
    D.addEventListener('keydown', (e) => { if (e.key === 'Escape' && (st.sel || st.preview)) { st.preview = null; st.part = null; select(null); } });
    // the mock: click a part, the role that colours it is selected
    mock.addEventListener('click', (e) => {
      const el = e.target.closest('[data-roles]'); if (!el) return;
      const rs = rolesOf(el);
      st.preview = null;
      select(rs[0], rs);
    });
    detail.addEventListener('click', (e) => { const b = e.target.closest('[data-pick]'); if (b) select(b.dataset.pick, st.part); });
    new ResizeObserver(() => { if (st.preview || st.sel) paint(); }).observe(wrap);

    // the playground
    scope.addEventListener('input', (e) => { const i = e.target.closest('input[data-base]'); if (i) setBase(i.dataset.base, i.value); });
    scope.addEventListener('click', (e) => {
      const id = e.target.id;
      if (id === 'cp-reset') { delete st.edits[editKey()]; apply(true); }
      else if (id === 'cp-fix') setBase('text-on-accent', bestOnAccent());
      else if (id === 'cp-copy') {
        const box = scope.querySelector('#cp-json'); const ta = box.querySelector('textarea');
        ta.value = themeJson(); box.hidden = false; ta.select();
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(ta.value).catch(() => {});
      } else if (id === 'cp-ex-panel') {
        setBase('surface-panel', st.mode === 'dark' ? '#2b2145' : '#e4dcf7'); select('surface-panel');
      } else if (id === 'cp-ex-accent') {
        setBase('accent-fill', st.mode === 'dark' ? '#7c8cf0' : '#3f4fc4'); select('accent-fill');
      }
    });

    // draw once the block is in the page (the colours are read from the browser)
    const start = () => {
      st.mode = D.documentElement.dataset.themeMode === 'light' ? 'light' : 'dark';
      const fb = D.querySelector('#ds-font button.on'); if (fb) syncFont(fb.dataset.font);
      apply(false);
    };
    if (block.isConnected) start(); else queueMicrotask(() => (block.isConnected ? start() : requestAnimationFrame(start)));
    window.__dsColour = { pickOn, pickText, roles: R, state: st, select, setBase, setPreview, apply, hits, follow, themes: THEMES, roleCss, cssOf, wordsOf, ratio, parseCss };
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'colour', covers: ['colour', 'color', 'colours', 'theme'], group: 'Foundations', navGroup: 'Foundations', name: 'Colour', status: 'approved',
    words: 'colour color colours roles base derived surface panel card field menu toast tooltip text muted edge hairline accent fill hover selected today focus ring scrim shadow status danger ok warn info tint theme themes strong coffee calming teal burnt orange contrast ratio playground swatch', render,
  });
})();
