// check-conformance.mjs: the module window is one component, measured in the running product (plan-design-system.md, the
// Module window block, step 28). The design system's own checks read the CSS; this one loads the pages the way a person sees
// them and measures what the browser drew, so a module's own rule, a page that does not load the block, a container query or
// a selector that loses to another cannot make one module's band differ from another's without this failing.
//
// What it does. It starts a throwaway server with the screenshot seed (tools/shots.mjs, bootSeeded: the travel template, a
// trip with every bundled module on), adds a picture map so the Map is on too, and drives headless Chromium over its
// DevTools protocol:
//   - the Workspace at 1280 px in the light mode, with every module and both destinations (the Calendar and the Map) open,
//     docked as many as fit and the rest floating;
//   - the Workspace at 390 px in the dark mode, each module in turn through the phone's tab bar;
//   - each module's own page and each destination's page, at 1280 light and 390 dark.
// In each window it measures the bands (the title bar .mod-header / .chat-head, the toolbars: the host's .mod-toolbar, a
// module's own .sdk-toolbar, a destination's bar and its panel's head; the status line .mod-status), every search field
// (.sdk-search) and every button in a band, and holds them to the approved values in public/sdk/system.css (modulechrome,
// fields and buttons blocks):
//   title bar 34 px (42 on a phone), its words 14 px, its first item 12 px in and its last 4 px from the end;
//   toolbar 34 px, its first item 8 px in (12 on a phone), nothing closer than that to its end;
//   status line 24 px, its first item 12 px in;
//   a search field 30 px wherever it is in a window; a button in a band 30 px.
// Every value is the same for every module by construction, so one table of expectations holds for all of them; a module
// may not differ. On a failure it prints, per module, every band and what it measured against what it should be.
//
// Robust to load: each page is waited for (its windows drawn, their frames filled, fonts in), then measured until two
// readings 300 ms apart agree; heights are compared to the half pixel. With no Chromium (CHROME_PATH, a Playwright or a
// system one) it says SKIPPED and exits 0: a skip, never a pass.
//
// Usage: node tools/check-conformance.mjs [--table] (--table prints every window's measurements, failing or not).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { findBrowser, launch, freePort, stopServer, bootSeeded, Tab, sleep, fill } from './shots.mjs';

const TABLE = process.argv.includes('--table');
const ONLY = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7); // only the views whose name holds this text (for working on one)
const say = (...a) => console.log('check-conformance:', ...a);
const started = Date.now();

// The approved values (public/sdk/system.css: modulechrome, fields, buttons; style.css: --module-header-h, --toolbar-h).
const WANT = {
  wide: { title: 34, titleFont: 14, titleLeft: 12, titleRight: 4, toolbar: 34, toolbarLeft: 8, status: 24, statusLeft: 12, search: 30, button: 30 },
  phone: { title: 42, titleFont: 14, titleLeft: 12, titleRight: 4, toolbar: 34, toolbarLeft: 12, status: 24, statusLeft: 12, search: 30, button: 30 },
};

// A whole small PMTiles v3 picture (as tools/check-picture-map.mjs makes one), so the Map destination is on in the space.
function picture() {
  const dir = zlib.gzipSync(Buffer.from([1, 0, 1, 4, 1]));
  const tile = Buffer.from([1, 2, 3, 4]);
  const head = Buffer.alloc(127);
  head.write('PMTiles', 0, 'ascii'); head.writeUInt8(3, 7);
  head.writeBigUInt64LE(127n, 8); head.writeBigUInt64LE(BigInt(dir.length), 16);
  head.writeBigUInt64LE(BigInt(127 + dir.length), 56); head.writeBigUInt64LE(BigInt(tile.length), 64);
  head.writeUInt8(1, 97); head.writeUInt8(2, 98); head.writeUInt8(2, 99); head.writeUInt8(0, 100); head.writeUInt8(4, 101);
  [-180, -85, 180, 85].forEach((d, i) => head.writeInt32LE(Math.round(d * 1e7), 102 + i * 4));
  return Buffer.concat([head, dir, tile]);
}

// ---- in the page: find every module window and measure it ----
// Answers { ready, windows: [{ name, kind, bands: [{ band, h, left, right, font?, buttons: [h...] }], searches: [h...] }] }.
// `ready` is false while a window's frame is still empty (a shadow root with nothing in it, a frame still loading).
const COLLECT = String.raw`(() => {
  const R = (e) => e.getBoundingClientRect();
  const shown = (e) => { if (!e || !e.getClientRects().length) return false; const r = R(e); if (r.width < 1 || r.height < 1) return false; const s = getComputedStyle(e); return s.visibility !== 'hidden' && s.display !== 'none'; };
  const kids = (band) => [...band.children].filter((k) => shown(k) && !k.classList.contains('visually-hidden') && !['absolute', 'fixed'].includes(getComputedStyle(k).position));
  const px = (v) => Math.round(v * 2) / 2;
  let ready = true;
  // Every root under a node: itself, the shadow roots below it and the documents of same-origin frames below it.
  const roots = (node) => {
    const out = [node];
    const walk = (r) => { for (const e of r.querySelectorAll('*')) { if (e.shadowRoot) { out.push(e.shadowRoot); walk(e.shadowRoot); } if (e.tagName === 'IFRAME') { let d = null; try { d = e.contentDocument; } catch (x) { d = null; } if (d && d.body) { if (d.readyState !== 'complete') ready = false; out.push(d.body); walk(d.body); } else ready = false; } } };
    walk(node);
    return out;
  };
  // A rectangle in the top page's coordinates (a frame's own are offset by where the frame is).
  const offsetOf = (e) => { let x = 0; let y = 0; let w = e.ownerDocument.defaultView; while (w && w.frameElement) { const f = w.frameElement.getBoundingClientRect(); x += f.left; y += f.top; w = w.parent; } return { x, y }; };
  const band = (kind, el) => {
    const r = R(el); const s = getComputedStyle(el);
    const k = kids(el);
    const bl = r.left + parseFloat(s.borderLeftWidth); const br = r.right - parseFloat(s.borderRightWidth);
    const left = k.length ? px(Math.min(...k.map((x) => R(x).left)) - bl) : null;
    const right = k.length ? px(br - Math.max(...k.map((x) => R(x).right))) : null;
    const out = { band: kind, h: px(r.height), left, right, buttons: [] };
    if (kind === 'title') { const t = el.querySelector('.mod-title span, :scope > span'); if (t) out.font = parseFloat(getComputedStyle(t).fontSize); }
    for (const b of el.querySelectorAll('.btn, .sdk-icon-btn, .tb-tab')) if (shown(b) && !b.closest('.sdk-search')) out.buttons.push({ h: px(R(b).height), add: Boolean(b.closest('.titlebar-add')), what: (b.getAttribute('aria-label') || b.textContent || b.className).trim().replace(/\s+/g, ' ').slice(0, 24) });
    out.at = { x: Math.round(r.left + offsetOf(el).x), y: Math.round(r.top + offsetOf(el).y) };
    return out;
  };
  const windows = [];
  const seen = new Set();
  const measure = (name, kind, win, titleSel) => {
    const w = { name, kind, bands: [], searches: [] };
    const title = titleSel ? win.querySelector(titleSel) : null;
    if (title && shown(title)) { w.bands.push(band('title', title)); seen.add(title); }
    for (const r of roots(win)) {
      for (const t of r.querySelectorAll('.mod-toolbar, .sdk-toolbar, #dest-bar, .dest-side-head')) if (shown(t) && !seen.has(t)) { seen.add(t); w.bands.push(band('toolbar', t)); }
      for (const t of r.querySelectorAll('.mod-status')) if (shown(t) && !seen.has(t)) { seen.add(t); w.bands.push(band('status', t)); }
      for (const f of r.querySelectorAll('.sdk-search')) if (shown(f) && !seen.has(f)) { seen.add(f); w.searches.push({ h: px(R(f).height), what: (f.className || '').replace('sdk-search', '').trim() || 'search' }); }
      for (const m of r.querySelectorAll('.module-root')) { const sr = m.shadowRoot || m; if (!sr.querySelector('#app, .app, main, section, div')) ready = false; }
    }
    windows.push(w);
  };
  const nameOf = (win) => { const t = win.querySelector('.mod-header .mod-title span, .chat-head > span'); return t ? t.textContent.trim() : '?'; };
  for (const win of document.querySelectorAll('.module-docked > .mod-content, .module-floating, #chat-content')) {
    if (!shown(win)) continue;
    const kind = win.matches('.module-floating') ? 'floating' : win.id === 'chat-content' ? 'chat' : 'docked';
    measure(nameOf(win), kind, win, ':scope > .mod-header, :scope > .chat-head');
  }
  // A module's own page, or a destination's: the page is the window (no title bar; the page bar names it).
  if (document.body.matches('.module-page, .destination-page')) {
    const name = (document.querySelector('#page-bar-name .page-bar-label, .page-bar-label') || {}).textContent || document.title;
    measure(String(name).trim(), document.body.matches('.destination-page') ? 'destination page' : 'own page', document.body, null);
  }
  return { ready, windows };
})()`;

// ---- the contexts ----
async function openTab(browser, S, size, mode, url, { call = false, before = null } = {}) {
  const tab = new Tab(browser.cdp, S.ctx);
  await tab.open(size, mode, call);
  for (const c of S.cookies.mia) await browser.cdp.send('Network.setCookie', { name: c.name, value: c.value, url: S.base, httpOnly: true }, tab.sid);
  if (before) await browser.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: before }, tab.sid);
  await browser.cdp.send('Page.navigate', { url: S.base + fill(url, S.ctx) }, tab.sid);
  return tab;
}
// Measured once the page holds still: ready, and two readings 300 ms apart the same.
async function settled(tab, wantWindows = 1) {
  // Fonts in and the document loaded (not every request done: the space page keeps asking, and the readings below wait for
  // the page to hold still instead).
  await tab.eval(`(async () => { try { await document.fonts.ready; } catch (e) {} return document.readyState; })()`).catch(() => null);
  const end = Date.now() + 20000;
  let last = '';
  while (Date.now() < end) {
    const got = await tab.eval(COLLECT).catch(() => null);
    if (got && got.ready && got.windows.length >= wantWindows) {
      const key = JSON.stringify(got.windows);
      if (key === last) return got.windows;
      last = key;
    }
    await sleep(300);
  }
  const got = await tab.eval(COLLECT).catch(() => null);
  if (!got) throw new Error('the page could not be measured');
  return got.windows;
}

const failures = [];

// ---- padding symmetry: a box owns its padding ----
// Each box of a shared family (below) that has an edge or a fill of its own: its content (the boxes of its children in the flow
// and its own words) as far from its top edge as from its bottom one, and, where its content fills its width (a card's lines, a
// chip's words), as far from its left edge as from its right; and the children of a stack (a card's lines, a message's words and
// cards) one gap apart. A child's margin that adds to the box's padding is what breaks it. Measured to the whole pixel, within 1px.
// `h: false`: only top and bottom (a band's or a row's content is laid from the start, so its end is wherever the content ends).
const SYMMETRY_FAMILIES = [
  { sel: '.message .chat-object, .message .chat-link', name: 'chat card', h: true, stack: '.chat-object' },
  { sel: '.message .message-body', name: 'message body', h: false, stack: '*', box: false },
  { sel: '.sdk-card:not(.sdk-card-banded)', name: 'card', h: true },
  { sel: '.sdk-row', name: 'row', h: false },
  { sel: '.sdk-card-head, .message-head', name: 'band head', h: false },
  { sel: '.sdk-card-banded, .message', name: 'banded box', h: false, box: false, stack: '*' },
  { sel: '.sdk-chip, .sdk-strip-chip', name: 'chip', h: true, hExcept: '.sdk-strip-phase' },
  { sel: '.mod-header, .chat-head, .mod-toolbar, .sdk-toolbar, .mod-status, #dest-bar, .dest-side-head', name: 'band', h: false },
  { sel: '.sdk-search', name: 'search field', h: false },
  { sel: '.btn, .tb-tab', name: 'button', h: false },
];
// EXCEPTIONS, each with its reason:
// - a banded box's body (.message-body, .sdk-card-body: 8px under the head band, 12px at the foot) is approved as 8/12/12 (Cards,
//   the banded card): its top sits against the band, not an edge, so it is not held to top = bottom;
// - the phase chip (.sdk-strip-phase) starts with its round dot 8px in and ends 10px after its words: the approved optical
//   correction (public/design-system/proposed-journey.css, the Journey bar family), so it is held to top = bottom only;
// - a card with its "..." laid in its corner (an absolutely placed small button) keeps room for it at its end (the card's padding
//   plus the button), so it is held to top = bottom only;
// - a box that scrolls (its content taller than it) or whose content overflows it is not measured.
const SYMMETRY = String.raw`((families) => {
  const R = (e) => e.getBoundingClientRect();
  const shown = (e) => e && e.getClientRects().length && R(e).width >= 1 && R(e).height >= 1 && getComputedStyle(e).visibility !== 'hidden';
  const out = [];
  const allRoots = () => { const list = [document]; const walk = (r) => { for (const e of r.querySelectorAll('*')) { if (e.shadowRoot) { list.push(e.shadowRoot); walk(e.shadowRoot); } if (e.tagName === 'IFRAME') { try { const d = e.contentDocument; if (d && d.body) { list.push(d); walk(d); } } catch (x) {} } } }; walk(document); return list; };
  const roots = allRoots();
  const label = (e) => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + [...e.classList].slice(0, 3).map((c) => '.' + c).join('');
  for (const f of families) {
    for (const r of roots) for (const el of r.querySelectorAll(f.sel)) {
      if (!shown(el) || el.dataset.symmetryChecked) continue;
      el.dataset.symmetryChecked = '1';
      const cs = getComputedStyle(el);
      if (el.scrollHeight > el.clientHeight + 1 && /auto|scroll|hidden/.test(cs.overflowY) && f.name !== 'band') continue;
      const b = R(el);
      const inner = { top: b.top + parseFloat(cs.borderTopWidth), bottom: b.bottom - parseFloat(cs.borderBottomWidth), left: b.left + parseFloat(cs.borderLeftWidth), right: b.right - parseFloat(cs.borderRightWidth) };
      const parts = [];
      const kids = [...el.children].filter((k) => shown(k) && !['absolute', 'fixed'].includes(getComputedStyle(k).position) && !k.classList.contains('visually-hidden'));
      for (const k of kids) parts.push(R(k));
      for (const n of el.childNodes) if (n.nodeType === 3 && n.textContent.trim()) { const rg = document.createRange(); rg.selectNodeContents(n); for (const x of rg.getClientRects()) parts.push(x); }
      if (!parts.length) continue;
      const c = { top: Math.min(...parts.map((x) => x.top)), bottom: Math.max(...parts.map((x) => x.bottom)), left: Math.min(...parts.map((x) => x.left)), right: Math.max(...parts.map((x) => x.right)) };
      const t = Math.round(c.top - inner.top); const bo = Math.round(inner.bottom - c.bottom); const l = Math.round(c.left - inner.left); const ri = Math.round(inner.right - c.right);
      if (t < 0 || bo < 0 || l < 0 || ri < 0) continue; // content past the edge: overflow, not padding
      const why = [];
      if (f.box !== false && Math.abs(t - bo) > 1) why.push('top ' + t + ' / bottom ' + bo);
      // Left and right only where the content runs from one padding edge to the other (a chip shrunk to its words, a card's
      // lines); a box wider than its content (a stretched chip, a row) lays it from the start, which is alignment, not padding.
      const reach = (v, pad) => v <= Math.round(pad) + 1;
      const cornerBtn = [...el.children].some((k) => getComputedStyle(k).position === 'absolute' && k.matches('.sdk-icon-btn, .sdk-more, .sdk-card-menu, [data-action=menu]'));
      if (f.box !== false && f.h && !cornerBtn && !(f.hExcept && el.matches(f.hExcept)) && Math.abs(l - ri) > 1 && reach(l, parseFloat(cs.paddingLeft)) && reach(ri, parseFloat(cs.paddingRight))) why.push('left ' + l + ' / right ' + ri);
      if (f.stack && (f.stack === '*' || el.matches(f.stack)) && kids.length > 2) {
        const gaps = []; for (let i = 1; i < kids.length; i++) gaps.push(Math.round(R(kids[i]).top - R(kids[i - 1]).bottom));
        if (Math.max(...gaps) - Math.min(...gaps) > 1) why.push('gaps ' + gaps.join(', '));
      }
      if (why.length) out.push({ family: f.name, el: label(el), why: why.join('; '), padding: cs.padding, margins: kids.map((k) => { const m = getComputedStyle(k); return m.marginTop + ' ' + m.marginBottom; }).filter((m) => m !== '0px 0px').slice(0, 3).join(' | ') });
    }
  }
  for (const r of roots) for (const e of r.querySelectorAll('[data-symmetry-checked]')) delete e.dataset.symmetryChecked;
  return out;
})(${JSON.stringify(SYMMETRY_FAMILIES)})`;
const symmetryRows = [];
async function symmetry(tab, context) {
  const list = await tab.eval(SYMMETRY).catch((e) => [{ family: 'load', el: '-', why: e.message, padding: '', margins: '' }]);
  for (const o of list) {
    const key = `${o.family} ${o.el}: ${o.why}`;
    if (symmetryRows.some((x) => x.key === key)) continue; // the same box in another view says nothing new
    symmetryRows.push({ key, context, ...o });
    failures.push({ context, window: o.el, what: `padding symmetry (${o.family})`, got: o.why, should: 'symmetrical' });
  }
}
const tables = [];
function judge(context, phone, windows) {
  const want = phone ? WANT.phone : WANT.wide;
  for (const w of windows) {
    const rows = [];
    const bad = (what, got, should) => { failures.push({ context, window: `${w.name} (${w.kind})`, what, got, should }); rows.push(`    !! ${what}: ${got}, should be ${should}`); };
    for (const b of w.bands) {
      const exp = b.band === 'title' ? want.title : b.band === 'toolbar' ? want.toolbar : want.status;
      rows.push(`    ${b.band.padEnd(8)} h ${String(b.h).padStart(5)}  in ${b.left ?? '-'} / ${b.right ?? '-'}${b.font ? `  words ${b.font}px` : ''}  buttons ${b.buttons.map((x) => x.h).join(',') || '-'}  at ${b.at.x},${b.at.y}`);
      if (Math.abs(b.h - exp) > 0.5) bad(`${b.band} height`, b.h, exp);
      if (b.band === 'title') {
        if (b.font && b.font !== want.titleFont) bad('title words', `${b.font}px`, `${want.titleFont}px`);
        if (b.left !== null && Math.abs(b.left - want.titleLeft) > 0.5) bad('title bar inset, start', b.left, want.titleLeft);
        // EXCEPTION: the Chat's title bar ends under the side column's own toggle (#side-column-toggle, laid over the bar's end,
        // style.css), so its tools stop 40 px from the end: 4 px, the 28 px toggle and the 8 px around it.
        const endWant = w.kind === 'chat' ? 40 : want.titleRight;
        if (b.right !== null && Math.abs(b.right - endWant) > 0.5) bad('title bar inset, end', b.right, endWant);
      }
      if (b.band === 'toolbar') {
        if (b.left !== null && Math.abs(b.left - want.toolbarLeft) > 0.5) bad('toolbar inset, start', b.left, want.toolbarLeft);
        if (b.right !== null && b.right < want.toolbarLeft - 0.5) bad('toolbar inset, end', b.right, `at least ${want.toolbarLeft}`);
      }
      if (b.band === 'status' && b.left !== null && Math.abs(b.left - want.statusLeft) > 0.5) bad('status line inset, start', b.left, want.statusLeft);
      for (const x of b.buttons) {
        // EXCEPTION (plan-module-titlebar-add.md, the touch sizes): on a phone the title bar's "+" is 44 px wide and as tall as
        // the bar's inside (42 less its 1px edge), in every module alike; every other button in a band is the small one.
        const should = phone && b.band === 'title' && x.add ? want.title - 1 : want.button;
        if (Math.abs(x.h - should) > 0.5) bad(`button in the ${b.band} (${x.what})`, x.h, should);
      }
    }
    for (const s of w.searches) {
      rows.push(`    search   h ${String(s.h).padStart(5)}  ${s.what}`);
      if (Math.abs(s.h - want.search) > 0.5) bad(`search field (${s.what})`, s.h, want.search);
    }
    tables.push({ context, head: `  ${w.name} (${w.kind})`, rows, failed: rows.some((r) => r.includes('!!')) });
  }
}

async function main() {
  const bin = findBrowser();
  if (!bin) { say('SKIPPED. No Chromium found (set CHROME_PATH, or install one: npx playwright install chromium). This is not a pass; nothing was measured.'); return 0; }
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'conformance-data-'));
  let server = null; let browser = null;
  try {
    const boot = await bootSeeded('travel', dataDir, await freePort());
    server = boot.server;
    const S = { base: server.base, ctx: boot.ctx, cookies: boot.cookies };
    const admin = boot.cookies.admin.map((c) => `${c.name}=${c.value}`).join('; ');
    const api = (method, url, body, type = 'application/json') => fetch(S.base + url, { method, headers: { cookie: admin, 'content-type': type }, body: Buffer.isBuffer(body) ? body : JSON.stringify(body) });
    // The Map: a picture map for Maps, and the Map on in the top bar, so the space's canvas has the Map composite too.
    const up = await api('PUT', '/api/modules/maps/files/image-map?name=world.pmtiles', picture(), 'application/octet-stream');
    if (!up.ok) throw new Error(`the picture map was refused: ${up.status} ${await up.text()}`);
    const map = await api('PATCH', '/api/settings', { showMap: true });
    if (!map.ok) throw new Error(`the Map could not be turned on: ${map.status}`);
    const mods = await (await fetch(S.base + `/api/modules?space=${S.ctx.trip}`, { headers: { cookie: admin } })).json().catch(() => ({}));
    const list = (Array.isArray(mods) ? mods : mods.modules || []).filter((m) => m && m.enabled !== false);
    const pages = list.filter((m) => m.surfaces && (m.surfaces.page || m.surfaces.canvas)).map((m) => m.id);

    browser = await launch(bin);
    const jobs = [];
    // 1. The Workspace, wide and light: everything open (the canvas's own remembered list), docked as far as they fit.
    jobs.push(['Workspace, 1280', async () => {
      const open = ['dest:calendar', 'dest:map', 'research', 'travel', 'budget', 'polls', 'assistant'];
      const before = `try { localStorage.setItem('app.canvas.${S.ctx.trip}', ${JSON.stringify(JSON.stringify({ __open: open }))}); } catch (e) {}`;
      const tab = await openTab(browser, S, 1280, 'light', '/#join={trip}', { call: true, before });
      try {
        await tab.waitFor('.mod-header .mod-title', '', 45000);
        await sleep(2500);
        judge('Workspace, 1280 px, light', false, await settled(tab, 4));
        await symmetry(tab, 'Workspace, 1280 px, light');
        // The status strip (the Journey bar family) owns its row's inset: its first chip var(--space-3) from the window's start and
        // nothing closer than that to its end (where a fact gave way, the bar does not always take its room back: space.js fitFacts).
        const stripExpr = `(() => { const s = document.querySelector('.sdk-strip'); if (!s || !s.getClientRects().length) return null; const k = [...s.children].filter((e) => e.getClientRects().length && e.getBoundingClientRect().width > 0); return { left: Math.round(Math.min(...k.map((e) => e.getBoundingClientRect().left))), right: Math.round(innerWidth - Math.max(...k.map((e) => e.getBoundingClientRect().right))) }; })()`;
        // Read until two readings 300 ms apart agree (the facts give way one by one as the bar finds its room).
        let strip = null; let prev = '';
        for (let n = 0; n < 30; n++) { strip = await tab.eval(stripExpr); const key = JSON.stringify(strip); if (key === prev) break; prev = key; await sleep(300); }
        const rows = [`    strip    in ${strip ? `${strip.left} / ${strip.right}` : 'none'}`];
        if (!strip || strip.left !== 12 || strip.right < 12) { failures.push({ context: 'Workspace, 1280 px, light', window: 'status strip', what: 'status strip inset', got: strip ? `${strip.left} / ${strip.right}` : 'none', should: '12 / at least 12' }); rows.push(`    !! status strip inset: ${strip ? `${strip.left} / ${strip.right}` : 'none'}, should be 12 / at least 12`); }
        tables.push({ context: 'Workspace, 1280 px, light', head: '  Status strip', rows, failed: rows.length > 1 });
      } finally { await tab.close(); }
    }]);
    // 2. The Workspace on a phone, dark: each module through the tab bar.
    jobs.push(['Workspace, 390', async () => {
      const tab = await openTab(browser, S, 390, 'dark', '/#join={trip}', { call: true });
      try {
        await tab.waitFor('#modules-menu [data-module]', '', 45000);
        await sleep(1500);
        const ids = await tab.eval(`[...document.querySelectorAll('#modules-menu [data-module]')].map((b) => b.dataset.module)`);
        for (const id of ids) {
          await tab.eval(`(() => { const b = document.querySelector('#modules-menu [data-module="${id}"]'); if (b) b.click(); })()`);
          await sleep(600);
          const wins = (await settled(tab, 1)).filter((w) => w.kind !== 'chat');
          judge(`Workspace, 390 px, dark: ${id}`, true, wins);
          await symmetry(tab, `Workspace, 390 px, dark: ${id}`);
        }
      } finally { await tab.close(); }
    }]);
    // 3. Each module's own page and each destination's page.
    const urls = [...pages.map((id) => `/modules/${id}?space={trip}`), '/calendar', '/map'];
    for (const url of urls) {
      for (const [size, mode] of [[1280, 'light'], [390, 'dark']]) {
        jobs.push([`${url} ${size}`, async () => {
          const tab = await openTab(browser, S, size, mode, url);
          try {
            await sleep(1500);
            const view = `${url.replace('?space={trip}', '')}, ${size} px, ${mode}`;
            judge(view, size <= 640, await settled(tab, 1));
            await symmetry(tab, view);
          } finally { await tab.close(); }
        }]);
      }
    }
    const keep = (name) => !ONLY || ONLY.split(',').some((x) => name.includes(x));
    const width = Math.min(4, Math.max(2, os.cpus().length));
    let i = 0;
    const todo = jobs.filter(([name]) => keep(name));
    await Promise.all(Array.from({ length: width }, async () => { while (i < todo.length) { const job = todo[i++][1]; try { await job(); } catch (e) { failures.push({ context: 'load', window: '-', what: e.message, got: '', should: '' }); } } }));

    const contexts = [...new Set(tables.map((t) => t.context))];
    if (TABLE || failures.length) {
      for (const c of contexts) {
        const ts = tables.filter((t) => t.context === c && (TABLE || t.failed));
        if (!ts.length) continue;
        console.log(c);
        for (const t of ts) { console.log(t.head); for (const r of t.rows) console.log(r); }
      }
    }
    if (symmetryRows.length) {
      console.log('Padding symmetry: each box (family, element), what differs, its padding and its children\'s margins (top bottom):');
      for (const o of symmetryRows) console.log(`  ${o.family.padEnd(24)} ${o.el.padEnd(44)} ${o.why}  padding ${o.padding}${o.margins ? `  child margins ${o.margins}` : ''}  (${o.context})`);
    }
    const windows = tables.length;
    if (failures.length) {
      const byWhat = new Map();
      for (const f of failures) byWhat.set(f.what.replace(/ \(.*\)$/, ''), (byWhat.get(f.what.replace(/ \(.*\)$/, '')) || 0) + 1);
      say(`FAIL: ${failures.length} deviations in ${new Set(failures.map((f) => f.context + f.window)).size} of ${windows} windows (${[...byWhat].map(([k, n]) => `${k} ${n}`).join(', ')}); ${Math.round((Date.now() - started) / 1000)} s`);
      return 1;
    }
    say(`${windows} windows in ${contexts.length} views measured; every title bar, toolbar, status line, search and band button is the approved size; ${Math.round((Date.now() - started) / 1000)} s`);
    return 0;
  } finally {
    try { if (browser) { browser.cdp.ws.close(); browser.child.kill(); fs.rmSync(browser.dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } } catch { /* best effort */ }
    await stopServer(server);
    fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

main().then((c) => process.exit(c), (e) => { console.error('check-conformance: ERROR ' + (e.stack || e)); process.exit(1); });
