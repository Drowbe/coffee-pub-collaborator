/* The Prototype page (prototype.html): the list of screens (prototype/screens.js, written by tools/prototype-build.mjs), one screen at
   a time in a frame at its own width and height, and the switches: the width (the widths that screen was captured at), Dark or Light,
   the theme, the size on this page (Fit scales the screen down to the column; 100% shows it at its own size) and Measure (the
   overlay of heights and padding, drawn by prototype-frame.js inside the screen). The address keeps the choice:
   #<screen>?w=<width>&mode=<dark|light>&theme=<id>&measure=1. */
(() => {
  'use strict';
  const D = document;
  const $ = (s) => D.querySelector(s);
  const $$ = (s) => [...D.querySelectorAll(s)];
  const h = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const data = window.PROTO_SCREENS || { screens: [], themes: [] };
  const screens = data.screens || [];
  const themes = data.themes || [];
  const nav = $('#ds-nav');
  const stage = $('#pt-stage');
  const status = $('#pt-status');
  const state = { id: '', w: 0, mode: 'dark', theme: themes[0] ? themes[0].id : 'strong-coffee', measure: false, scale: 'fit' };
  let frame = null; let box = null; let counts = null;

  const screenOf = (id) => screens.find((s) => s.id === id) || screens[0];
  const variantOf = (s, w) => (s.variants.find((v) => v.width === w) || s.variants[0]);

  function readHash() {
    const [id, q] = location.hash.replace(/^#/, '').split('?');
    const p = new URLSearchParams(q || '');
    const s = screenOf(decodeURIComponent(id || ''));
    if (!s) return;
    state.id = s.id;
    const w = Number(p.get('w'));
    state.w = variantOf(s, w).width;
    if (p.get('mode') === 'light' || p.get('mode') === 'dark') state.mode = p.get('mode');
    if (themes.some((t) => t.id === p.get('theme'))) state.theme = p.get('theme');
    state.measure = p.get('measure') === '1';
    if (p.get('scale') === '1') state.scale = '1'; else state.scale = 'fit';
  }
  function writeHash() {
    const q = new URLSearchParams({ w: String(state.w), mode: state.mode, theme: state.theme });
    if (state.measure) q.set('measure', '1');
    if (state.scale === '1') q.set('scale', '1');
    history.replaceState(null, '', `#${encodeURIComponent(state.id)}?${q}`);
  }

  function drawNav() {
    const groups = new Map();
    for (const s of screens) { if (!groups.has(s.group)) groups.set(s.group, []); groups.get(s.group).push(s); }
    nav.innerHTML = [...groups.entries()].map(([g, list]) => `<h2>${h(g)}</h2><ul>${list.map((s) => `<li><a href="#${encodeURIComponent(s.id)}" data-id="${h(s.id)}"><span>${h(s.name)}</span><span class="n">${s.variants.map((v) => v.width).join(' · ')}</span></a></li>`).join('')}</ul>`).join('')
      + `<h2>Refresh</h2><p class="ds-use">Built ${h(data.built || 'never')}. <code>node tools/prototype-build.mjs</code></p>`;
  }
  function pressed(group, attr, value) { for (const b of $$(`${group} button`)) { const on = b.dataset[attr] === String(value); b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); } }

  function drawTools(s) {
    $('#pt-width').innerHTML = s.variants.map((v) => `<button type="button" class="tb-tab" data-w="${v.width}" aria-pressed="false"><span class="tb-tab-word">${v.width}</span></button>`).join('');
    $('#pt-theme').innerHTML = themes.map((t) => `<button type="button" class="tb-tab" data-theme="${h(t.id)}" aria-pressed="false"><span class="tb-tab-word">${h(t.name)}</span></button>`).join('');
    pressed('#pt-width', 'w', state.w);
    pressed('#pt-theme', 'theme', state.theme);
    pressed('#pt-mode', 'mode', state.mode);
    pressed('#pt-scale', 'scale', state.scale);
    $('#pt-measure').classList.toggle('on', state.measure);
    $('#pt-measure').setAttribute('aria-pressed', String(state.measure));
    for (const a of $$('#ds-nav a[data-id]')) a.setAttribute('aria-current', String(a.dataset.id === s.id));
  }

  function fit() {
    if (!box) return;
    const v = variantOf(screenOf(state.id), state.w);
    const room = stage.clientWidth;
    const k = state.scale === 'fit' && room > 0 && room < v.width + 2 ? room / (v.width + 2) : 1;
    box.style.transform = k === 1 ? '' : `scale(${k})`;
    stage.classList.toggle('pt-fit', k !== 1);
    stage.style.height = `${Math.ceil((v.height + 2) * k)}px`;
    stage.style.width = k === 1 && state.scale === '1' ? '' : '';
    box.dataset.scale = String(Math.round(k * 1000) / 1000);
    say();
  }

  function say() {
    const v = variantOf(screenOf(state.id), state.w);
    const k = box ? Number(box.dataset.scale) : 1;
    const size = `${v.width} × ${v.height}${k !== 1 ? `, shown at ${Math.round(k * 100)}%` : ''}`;
    const m = state.measure && counts ? `. Measure: ${counts.boxes} boxes, ${counts.lopsided} with uneven padding (dashed), ${counts.unequal} beside one of another height (≠). Point at anything for its numbers.` : state.measure ? '. Measuring' : '';
    status.textContent = `${size}${m}`;
  }

  function load() {
    const s = screenOf(state.id);
    if (!s) { stage.innerHTML = '<p class="pt-empty">No screens yet. Run <code>node tools/prototype-build.mjs</code>.</p>'; status.textContent = ''; return; }
    const v = variantOf(s, state.w);
    state.w = v.width;
    $('#pt-title').textContent = s.name;
    $('#pt-note').textContent = s.note || '';
    drawTools(s);
    writeHash();
    counts = null;
    const q = new URLSearchParams({ mode: state.mode, theme: state.theme });
    if (state.measure) q.set('measure', '1');
    stage.innerHTML = '';
    box = D.createElement('div');
    box.className = 'pt-box';
    box.style.width = `${v.width + 2}px`;
    frame = D.createElement('iframe');
    frame.className = 'pt-frame';
    frame.title = `${s.name}, ${v.width} wide`;
    frame.width = String(v.width + 2); frame.height = String(v.height + 2);
    frame.style.width = `${v.width + 2}px`; frame.style.height = `${v.height + 2}px`;
    frame.src = `prototype/${v.file}?${q}`;
    box.appendChild(frame);
    stage.appendChild(box);
    fit();
  }

  // A switch that only changes the screen's colours or overlay is sent to it; a new screen or width loads it.
  function send() {
    writeHash();
    D.documentElement.dataset.themeMode = state.mode;
    if (frame && frame.contentWindow) frame.contentWindow.postMessage({ proto: 'set', mode: state.mode, theme: state.theme, measure: state.measure }, '*');
    if (!state.measure) counts = null;
    drawTools(screenOf(state.id));
    say();
  }

  window.addEventListener('message', (e) => {
    if (!frame || e.source !== frame.contentWindow || !e.data || typeof e.data !== 'object') return;
    if (e.data.proto === 'measured') { counts = e.data.on ? e.data : null; say(); }
    if (e.data.proto === 'ready') send();
  });
  $('#pt-width').addEventListener('click', (e) => { const b = e.target.closest('button[data-w]'); if (b) { state.w = Number(b.dataset.w); load(); } });
  $('#pt-mode').addEventListener('click', (e) => { const b = e.target.closest('button[data-mode]'); if (b) { state.mode = b.dataset.mode; send(); } });
  $('#pt-theme').addEventListener('click', (e) => { const b = e.target.closest('button[data-theme]'); if (b) { state.theme = b.dataset.theme; send(); } });
  $('#pt-scale').addEventListener('click', (e) => { const b = e.target.closest('button[data-scale]'); if (b) { state.scale = b.dataset.scale; pressed('#pt-scale', 'scale', state.scale); writeHash(); fit(); } });
  $('#pt-measure').addEventListener('click', () => { state.measure = !state.measure; send(); });
  nav.addEventListener('click', (e) => {
    const a = e.target.closest('a[data-id]');
    if (!a) return;
    e.preventDefault();
    state.id = a.dataset.id;
    load();
    if (nav.classList.contains('open')) { nav.classList.remove('open'); $('#ds-menu-btn').setAttribute('aria-expanded', 'false'); }
    $('#ds-main').focus({ preventScroll: true });
  });
  $('#ds-menu-btn').addEventListener('click', () => { const open = nav.classList.toggle('open'); $('#ds-menu-btn').setAttribute('aria-expanded', String(open)); });
  window.addEventListener('resize', fit);
  window.addEventListener('hashchange', () => { const was = `${state.id}/${state.w}`; readHash(); if (`${state.id}/${state.w}` !== was) load(); else send(); });

  drawNav();
  readHash();
  if (!state.id && screens[0]) { state.id = screens[0].id; state.w = screens[0].variants[0].width; }
  D.documentElement.dataset.themeMode = state.mode;
  load();
})();
