/* The proposed system page: the page engine, and nothing about any one family.
   HOW IT IS PUT TOGETHER (also in README.md in this folder)
   - proposed.html loads this file and proposed.css (the shared rules). Everything else comes from proposed-families.json: one entry
     per family, in the order the families are drawn: { "id", "js", "css" } and, only for a family whose rules do not go into the
     example frames, "frames": false. The engine reads the manifest (from the page's own folder, or from window.DS_PROPOSED_MANIFEST,
     which tools/design-system-snapshot.mjs writes into the hosted copy so it also works from a file on disk), links each family's
     stylesheet, loads each family's script in that order, then draws.
   - A family's script registers itself with window.DS_PROPOSED.families.push({ id, covers, group, name, status, words, render }).
     render(api) returns the family's block; api.makeFrame draws examples in a frame that carries the shared and every family stylesheet.
   - This file keeps only: the shared example-page rules (window.DS_PROPOSED.pmCss, for a frame's css option), the list of families
     still to decide (window.DS_PROPOSED.undecided), and the engine: nav, frames, the mode, font, headline and width switches, the
     forced hover, focus and pressed states, and the search.
   - Adding a family = two new files (proposed-<id>.js and .css), one entry in proposed-families.json, and a check file with one entry in
     tools/check-design-system-families.json. No shared file is edited. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {

  // The example-page rules every family's frames share (the label column, the row, the cards): a frame's css option starts with this.
  window.DS_PROPOSED.pmCss = `
.pm-row { display: grid; grid-template-columns: 150px minmax(0, 1fr); gap: 4px 14px; align-items: start; padding: 8px 0; }
.pm-row.pm-small { --pm-h: var(--btn-h-small, 30px); }
.pm-row + .pm-row { border-top: 1px solid var(--border); }
/* The label sits level with the buttons: it starts below the caption (12px line + 5px gap) and is as tall as the button, centred. */
.pm-role { display: flex; align-items: center; min-height: var(--pm-h, var(--btn-h)); margin-top: 17px; color: var(--text-dim); font-size: 12px; font-weight: 700; line-height: 1.2; }
.pm-h { margin: 16px 0 2px; font-size: 13px; font-weight: 700; }
.pm-h:first-child { margin-top: 4px; }
.pm-sub { margin: 0 0 4px; color: var(--text-dim); font-size: 12px; }
.pm-map { display: grid; grid-template-columns: minmax(140px, 1fr) minmax(140px, 1fr) minmax(180px, 1.4fr); gap: 8px 18px; padding: 12px 0; align-items: start; }
.pm-map + .pm-map { border-top: 1px solid var(--border); }
.pm-map > div > small { display: block; margin-bottom: 4px; color: var(--text-dim); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.pm-name { margin: 0 0 6px; font-size: 13px; font-weight: 700; }
.pm-to { margin: 0 0 4px; font-size: 13px; }
.pm-why { margin: 0 0 4px; color: var(--text-dim); font-size: 12px; }
.pm-where { margin: 0; color: var(--text-dim); font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; overflow-wrap: anywhere; }
.pm-zoom { zoom: 2.5; display: flex; gap: 14px; align-items: center; padding: 6px 4px; }
.pm-wide { display: grid; gap: 12px; padding-top: 6px; }
.pm-card { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; padding: 12px; border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-card > .pm-grow { flex: 1 1 140px; min-width: 0; }
.pm-card > .pm-grow b { display: block; font-size: 14px; }
.pm-card > .pm-grow span { color: var(--text-dim); font-size: 12px; }
.pm-bar { display: flex; flex-wrap: wrap; align-items: center; gap: 6px; }
@media (max-width: 640px) {
  .pm-row { grid-template-columns: minmax(0, 1fr); }
  .pm-role { min-height: 0; margin-top: 0; }
  .pm-map { grid-template-columns: minmax(0, 1fr); }
}`;

  // Families still to decide: names only, in the groups Today uses. Nothing is drawn for them.
  window.DS_PROPOSED.undecided = [
    { group: 'Controls', names: ['Links', 'Pickers: date, kind, currency', 'Choice rows and people chips', 'Editor window'] },
    { group: 'Navigation', names: ['Menus and flyouts', 'Popovers and sheets', 'Phone bottom bar (icon over label)'] },
    { group: 'Containers', names: ['Tables and lists in Manage', 'Progress bars and meters', 'Module window: title, toolbar and status'] },
    { group: 'Feedback', names: ['Banners, notices and toasts', 'Empty, loading and error states'] },
    { group: 'Content', names: ['Messages, chat and AI cards', 'Avatars and portraits', 'Status strip, phases and countdown', 'Day cards, calendar cells and markers', 'Map pins and map UI', 'Round buttons'] },
    { group: 'Other', names: ['Tokens', 'Icons', 'Live SDK pieces'] },
  ];
})();

/* The page engine for proposed.html. Small on purpose: it reads the stylesheets (style.css, theme.css, proposed.css and each family's),
   draws the families from window.DS_PROPOSED into small frames, and lists the families still to decide by name. It loads no
   inventory of what exists today. Frames are written with the stylesheet text (read by XHR, which also works from disk), so the
   forced hover, focus and pressed states can be made from the stylesheet's own rules; if the text cannot be read, the frame links the
   stylesheet and the forced states are skipped. */
(() => {
  'use strict';
  const D = document;
  const stats = { frames: 0, loaded: 0, families: 0, undecided: 0, errors: [], forcedRules: 0, ready: false };
  window.__dsStats = stats;
  window.addEventListener('error', (e) => stats.errors.push(String(e.message || e)));
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const $ = (sel, root) => (root || D).querySelector(sel);
  const $$ = (sel, root) => [...(root || D).querySelectorAll(sel)];
  const mk = (tag, cls, html) => { const e = D.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

  const SHEETS = ['app', 'theme', 'proposed']; // the data-ds names of the stylesheet links in the page; each family's ('fam-<id>') is added by loadFamilies
  const href = {}; const text = {};
  function xhr(url) {
    return new Promise((resolve) => {
      const r = new XMLHttpRequest();
      r.open('GET', url);
      r.onload = () => resolve(r.status === 0 || (r.status >= 200 && r.status < 300) ? r.responseText : '');
      r.onerror = () => resolve('');
      r.send();
    });
  }

  // ---- the families: the entries of proposed-families.json, or window.DS_PROPOSED_MANIFEST (written into a hosted copy, where a file on
  // disk cannot be read by XHR). Each family's stylesheet is linked and its script loaded, in the manifest's order. ----
  function loadTag(tag, props, what) {
    return new Promise((resolve) => {
      const e = D.createElement(tag);
      Object.assign(e, props);
      if (tag === 'script') e.async = false;
      e.addEventListener('load', () => resolve(true));
      e.addEventListener('error', () => { stats.errors.push('could not load ' + what); resolve(false); });
      D.head.appendChild(e);
      return e;
    });
  }
  async function loadFamilies() {
    let list = window.DS_PROPOSED_MANIFEST;
    if (!list) {
      const t = await xhr('proposed-families.json');
      try { list = JSON.parse(t); } catch (e) { list = null; }
      if (!list) { stats.errors.push('proposed-families.json could not be read'); return; }
    }
    const loading = [];
    for (const f of list.families || []) {
      if (f.css) {
        const l = D.createElement('link'); l.rel = 'stylesheet'; l.href = f.css; l.dataset.ds = 'fam-' + f.id;
        if (f.frames !== false) SHEETS.push('fam-' + f.id);
        loading.push(new Promise((resolve) => { l.addEventListener('load', () => resolve(true)); l.addEventListener('error', () => { stats.errors.push('could not load ' + f.css); resolve(false); }); }));
        D.head.appendChild(l);
      }
    }
    for (const f of list.families || []) if (f.js) loading.push(loadTag('script', { src: f.js }, f.js));
    await Promise.all(loading);
  }

  const FRAME_CSS = `
html[data-theme-mode="dark"] { color-scheme: dark; }
html[data-theme-mode="light"] { color-scheme: light; }
html, body { min-height: 0 !important; height: auto !important; overflow-x: hidden; }
body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 14px; }
.dsf { padding: 4px 14px 14px; }
.dsf-states { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 14px 24px; }
.dsf-state { display: flex; flex-direction: column; gap: 5px; min-width: 0; max-width: 100%; }
.dsf-state > small { line-height: 12px; height: 12px; color: var(--text-dim); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.dsf-ex { min-width: 0; max-width: 100%; }
`;
  let mode = 'dark';
  let width = 'fit';
  let font = 'figtree'; // '' is Today's system stack; else a candidate's key (data-font on .ds-proposed in the frames). Figtree is Thomas's pick.
  let headline = 'archivo'; // '' is the UI font; else a headline candidate's key (data-headline on .ds-proposed in the frames)
  const frames = [];
  const frameReady = [];

  function frameHtml(body, o) {
    const m = o.pin || mode;
    const sheets = SHEETS.map((k) => (text[k] ? `<style>${text[k]}</style>` : `<link rel="stylesheet" href="${h(href[k] || '')}">`)).join('');
    return `<!doctype html><html lang="en" data-theme-mode="${m}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="${h(href.fa)}">${sheets}<style>${FRAME_CSS}${o.css || ''}</style></head><body><div class="dsf">${body}</div></body></html>`;
  }

  // Forced states: a copy of every :hover, :focus and :active rule that matches a class instead, right after the original.
  const PSEUDO = /:(hover|focus-visible|focus-within|focus|active)(?![A-Za-z-])/g;
  const FORCE = { hover: 'ds-force-hover', 'focus-visible': 'ds-force-focus', 'focus-within': 'ds-force-focus', focus: 'ds-force-focus', active: 'ds-force-active' };
  function addForceRules(doc) {
    let added = 0;
    const handle = (parent) => {
      const list = parent.cssRules;
      for (let i = list.length - 1; i >= 0; i -= 1) {
        const r = list[i];
        if (r.type === 1) {
          PSEUDO.lastIndex = 0;
          if (!PSEUDO.test(r.selectorText)) continue;
          PSEUDO.lastIndex = 0;
          const sel = r.selectorText.replace(PSEUDO, (_, k) => '.' + FORCE[k]);
          const t = r.cssText;
          try { parent.insertRule(sel + ' ' + t.slice(t.indexOf('{')), i + 1); added += 1; } catch (e) { /* a selector the copy cannot be written for */ }
        } else if (r.cssRules && r.constructor.name !== 'CSSKeyframesRule') handle(r);
      }
    };
    for (const s of doc.styleSheets) { try { handle(s); } catch (e) { /* a sheet we cannot read */ } }
    stats.forcedRules += added;
  }

  function setWidth(f) { f.iframe.style.width = f.pinWidth ? f.pinWidth + 'px' : width === 'fit' ? '100%' : width + 'px'; }
  function makeFrame(ctx, bodyHtml, o = {}) {
    const wrap = mk('div', 'ds-frame-wrap');
    const iframe = D.createElement('iframe');
    iframe.className = 'ds-frame';
    iframe.title = o.title || 'Examples';
    iframe.style.height = (o.height || 160) + 'px';
    const f = { iframe, ctx, fixed: o.height || 0, pin: o.pin || '', pinWidth: o.pinWidth || 0, fit: null };
    frames.push(f);
    stats.frames += 1;
    frameReady.push(new Promise((resolve) => {
      iframe.addEventListener('load', () => {
        const doc = iframe.contentDocument;
        if (!doc || !doc.body) { resolve(); return; }
        addForceRules(doc);
        applyFont(doc);
        applyHeadline(doc);
        if (o.onload) o.onload(doc, f);
        doc.addEventListener('click', (e) => { if (e.target.closest && e.target.closest('a[href]')) e.preventDefault(); });
        doc.addEventListener('submit', (e) => e.preventDefault());
        if (!f.fixed) {
          const fit = () => { const n = Math.ceil(doc.body.getBoundingClientRect().height + 2) + 'px'; if (iframe.style.height !== n) iframe.style.height = n; };
          fit();
          f.fit = fit;
          if (window.ResizeObserver) new ResizeObserver(() => requestAnimationFrame(fit)).observe(doc.body);
        }
        stats.loaded += 1;
        resolve();
      }, { once: true });
    }));
    setWidth(f);
    iframe.srcdoc = frameHtml(bodyHtml, o);
    wrap.appendChild(iframe);
    return wrap;
  }

  // The font switch: every .ds-proposed in a frame gets data-font, except the ones that show one font on purpose (data-font-fixed).
  function applyFont(doc) {
    for (const e of doc.querySelectorAll('.ds-proposed:not([data-font-fixed])')) { if (font) e.dataset.font = font; else delete e.dataset.font; }
  }
  // The headline switch: the same, for the big words (data-headline), except where a frame shows one candidate on purpose (data-headline-fixed).
  function applyHeadline(doc) {
    for (const e of doc.querySelectorAll('.ds-proposed:not([data-headline-fixed])')) { if (headline) e.dataset.headline = headline; else delete e.dataset.headline; }
  }
  function setHeadline(k) {
    headline = k;
    for (const b of $$('#ds-headline button')) { const on = b.dataset.headline === k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
    for (const f of frames) { const doc = f.iframe.contentDocument; if (doc && doc.body) applyHeadline(doc); }
  }
  function setFont(k) {
    font = k;
    for (const b of $$('#ds-font button')) { const on = b.dataset.font === k; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
    for (const f of frames) { const doc = f.iframe.contentDocument; if (doc && doc.body) applyFont(doc); }
  }

  function setMode(m) {
    mode = m;
    D.documentElement.dataset.themeMode = m;
    for (const b of $$('#ds-mode button')) { const on = b.dataset.mode === m; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
    for (const f of frames) {
      const doc = f.iframe.contentDocument;
      if (doc && doc.documentElement) doc.documentElement.dataset.themeMode = f.pin || m;
    }
  }
  function setWidthAll(w) {
    width = w;
    for (const b of $$('#ds-width button')) { const on = b.dataset.w === w; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); }
    for (const f of frames) setWidth(f);
  }

  // ---- the page ----
  const STATUS = { proposed: 'Proposed', approved: 'Approved', undecided: 'Not yet decided' };
  const chip = (st) => `<span class="ds-status-chip ds-st-${st}">${STATUS[st]}</span>`;
  const nav = $('#ds-nav');
  const content = $('#ds-content');
  const navItems = [];
  function navGroup(title) { nav.appendChild(mk('h2', '', h(title))); const ul = mk('ul'); nav.appendChild(ul); return ul; }
  function navItem(ul, label, id, st, search) {
    const li = mk('li'); const a = mk('a', '', `<span>${h(label)}</span>${chip(st)}`);
    a.href = '#' + id; li.appendChild(a); ul.appendChild(li);
    navItems.push({ li, id, name: (search || label).toLowerCase() });
  }
  function applySearch() {
    const q = $('#ds-search').value.trim().toLowerCase();
    for (const b of $$('.ds-block')) b.hidden = Boolean(q) && !b.dataset.name.includes(q);
    for (const n of navItems) { const t = D.getElementById(n.id); n.li.hidden = Boolean(q) && (t ? t.hidden : !n.name.includes(q)); }
  }
  // #buttons, and the older #proposed/buttons, scroll to that block or heading.
  function route(first) {
    const id = decodeURIComponent(location.hash.slice(1)).replace(/^proposed\//, '');
    const t = id && (D.getElementById(id) || D.getElementById('p-' + id));
    for (const n of navItems) { const a = $('a', n.li); if (n.id === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); }
    if (t) { t.scrollIntoView(); return; }
    if (!first) window.scrollTo(0, 0);
  }

  async function init() {
    await loadFamilies();
    for (const k of SHEETS.concat('fa')) { const l = $(`link[data-ds="${k}"]`); href[k] = l ? l.href : ''; }
    const got = await Promise.all(SHEETS.map((k) => (href[k] ? xhr(href[k]) : '')));
    SHEETS.forEach((k, i) => { text[k] = got[i]; });
    const P = window.DS_PROPOSED;
    const decided = P.families || [];
    const undecided = P.undecided || [];
    stats.families = decided.length;
    const sec = mk('section', 'ds-sec');
    sec.id = 'top';
    sec.innerHTML = `<h2>Design system: proposed</h2><p class="ds-lead">The system as Thomas has decided it, one family at a time. Only decided components are drawn, as specs, from the proposed rules (<code>proposed.css</code>, all under <code>.ds-proposed</code>, so the product is untouched). A family not yet decided is listed by name only. ${chip('approved')} decided, ${chip('proposed')} drawn and waiting for a decision, ${chip('undecided')} not yet decided. What exists today is on its own page: <a href="index.html">Today's inventory</a>.</p>`;
    content.appendChild(sec);
    const api = { mk, h, makeFrame, mode: () => mode };
    sec.appendChild(mk('h3', 'ds-group', 'Decided'));
    const ulF = decided.some((p) => p.navGroup) ? navGroup(decided.find((p) => p.navGroup).navGroup) : null;
    const ul = navGroup('Decided');
    for (const p of decided) {
      const b = p.render(api);
      b.id = p.id; b.classList.add('ds-block'); b.dataset.name = (p.name + ' ' + p.id + ' ' + (p.words || '')).toLowerCase();
      sec.appendChild(b);
      navItem(p.navGroup ? ulF : ul, p.name, p.id, p.status, p.name + ' ' + p.id + ' ' + (p.words || ''));
    }
    sec.appendChild(mk('h3', 'ds-group', 'Still to decide'));
    for (const g of undecided) {
      const gul = navGroup(g.group);
      for (const name of g.names) {
        stats.undecided += 1;
        const id = 'u-' + slug(name);
        const b = mk('section', 'ds-block ds-undecided');
        b.id = id; b.dataset.name = (name + ' ' + g.group).toLowerCase();
        b.innerHTML = `<header><h3>${h(name)}</h3>${chip('undecided')}<span class="ds-count">${h(g.group)}</span></header><p class="ds-desc">Not yet decided.</p>`;
        sec.appendChild(b);
        navItem(gul, name, id, 'undecided', name + ' ' + g.group);
      }
    }
    await Promise.all(frameReady);
    $('#ds-status').textContent = `${stats.families} decided ${stats.families === 1 ? 'family' : 'families'}, ${stats.undecided} still to decide, ${stats.frames} example frames.`;
    route(true);
    stats.ready = true;
  }

  $('#ds-search').addEventListener('input', applySearch);
  $('#ds-mode').addEventListener('click', (e) => { const b = e.target.closest('button[data-mode]'); if (b) setMode(b.dataset.mode); });
  $('#ds-font').addEventListener('click', (e) => { const b = e.target.closest('button[data-font]'); if (b) setFont(b.dataset.font); });
  $('#ds-headline').addEventListener('click', (e) => { const b = e.target.closest('button[data-headline]'); if (b) setHeadline(b.dataset.headline); });
  $('#ds-width').addEventListener('click', (e) => { const b = e.target.closest('button[data-w]'); if (b) setWidthAll(b.dataset.w); });
  $('#ds-menu-btn').addEventListener('click', () => { const open = nav.classList.toggle('open'); $('#ds-menu-btn').setAttribute('aria-expanded', String(open)); });
  nav.addEventListener('click', (e) => { if (e.target.closest('a') && nav.classList.contains('open')) { nav.classList.remove('open'); $('#ds-menu-btn').setAttribute('aria-expanded', 'false'); } });
  window.addEventListener('hashchange', () => route(false));
  window.__ds = { setMode, setWidth: setWidthAll, setFont, setHeadline, frames, stats };
  const start = new URLSearchParams(location.search).get('mode');
  setMode(start === 'light' || start === 'dark' ? start : mode);
  const startFont = new URLSearchParams(location.search).get('font');
  if (startFont && $(`#ds-font button[data-font="${startFont.replace(/[^a-z0-9-]/g, '')}"]`)) font = startFont.replace(/[^a-z0-9-]/g, '');
  setFont(font);
  const startHead = new URLSearchParams(location.search).get('headline');
  if (startHead !== null && $(`#ds-headline button[data-headline="${startHead.replace(/[^a-z0-9-]/g, '')}"]`)) headline = startHead.replace(/[^a-z0-9-]/g, '');
  setHeadline(headline);
  init().catch((e) => { stats.errors.push('init: ' + (e && e.stack || e)); $('#ds-status').textContent = 'The page failed to draw: ' + (e && e.message); });
})();
