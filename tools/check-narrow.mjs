// check-narrow.mjs: three layout rules measured in the running product (headless Chromium, the screenshot seed), each at the
// size where it once broke.
//   1. Maps: its notice (#state, "Maps is not set up yet") sits in the content area, below the search field (the module frame's
//      toolbar field, .mf-search, in the module's window), never over it
//      (the Workspace with Maps open in a window; Maps' own page at 390 px).
//   2. Planner (Itinerary): in a narrow window (260 px) no word of a card's title is broken across lines (a word is only ever
//      split when it is longer than the line).
//   3. Budget: with no target, "Target left over time" has no empty band between its title and its words.
//   4. Budget's Costs: the sort is a button on the left of the row that says the order ("Sort: Date, earliest first"), shown
//      or folded into More but never cut, and not a filter: the Filters button counts nothing while nothing is filtered
//      (Thomas, 2026-10-29), at 1280 and 390 px.
// Usage: node tools/check-narrow.mjs. With no Chromium it says SKIPPED and exits 0 (a skip, never a pass).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findBrowser, launch, freePort, stopServer, bootSeeded, Tab, sleep, driveScreen } from './shots.mjs';

const say = (...a) => console.log('check-narrow:', ...a);
const failures = [];

// In the page: every shadow root (each bundled module runs in one), searched from the document.
const ROOTS = `const roots = []; (function walk(r) { roots.push(r); for (const x of r.querySelectorAll('*')) if (x.shadowRoot) walk(x.shadowRoot); })(document);`;
const shown = `const shown = (e) => e && !e.hidden && e.getClientRects().length > 0;`;

const MAPS = `(() => { ${ROOTS} ${shown}
  const out = [];
  for (const r of roots) { const st = r.querySelector('#state'); const win = r.host ? r.host.closest('.mf, .module-floating, body') : null; const se = win ? win.querySelector('.mf-toolbar .mf-search') : null;
    if (!shown(st) || st.querySelector('.sdk-skel')) continue;
    const a = st.getBoundingClientRect(); const own = a.top;
    const title = st.querySelector('.sdk-empty-title'); const t = title ? title.getBoundingClientRect() : null;
    out.push({ search: shown(se) ? se.getBoundingClientRect().bottom : null, state: own, title: t ? t.top : null, area: st.parentElement.getBoundingClientRect().top }); }
  return out; })()`;

const TITLES = `(() => { ${ROOTS}
  const out = [];
  for (const r of roots) for (const h of r.querySelectorAll('.card h3, .card .kicker + h3')) {
    if (!h.getClientRects().length) continue;
    const saved = h.innerHTML; const text = h.textContent;
    h.replaceChildren(...text.split(/(\\s+)/).map((w) => { if (/^\\s*$/.test(w)) return document.createTextNode(w); const s = document.createElement('span'); s.textContent = w; return s; }));
    for (const s of h.querySelectorAll('span')) if (s.getClientRects().length > 1) out.push({ title: text.trim(), word: s.textContent, width: Math.round(h.clientWidth) });
    h.innerHTML = saved; }
  return out; })()`;

const BURN = `(() => { ${ROOTS} ${shown}
  for (const r of roots) { const t = r.querySelector('#burn-tile'); if (!t || !shown(t)) continue;
    const head = t.querySelector('.sdk-card-title').getBoundingClientRect(); const words = t.querySelector('#burn-words').getBoundingClientRect();
    return { gap: Math.round(words.top - head.bottom), words: t.querySelector('#burn-words').textContent.trim() }; }
  return null; })()`;

const SORT = `(() => { ${shown}
  const bar = document.querySelector('#module-main .mf-toolbar'); if (!bar) return null;
  const sort = [...bar.querySelectorAll('.mf-btn')].find((b) => (b.getAttribute('aria-label') || '').startsWith('Sort: '));
  const filters = bar.querySelector('.mf-filters');
  const r = sort && sort.getBoundingClientRect(); const b = bar.getBoundingClientRect();
  return { name: sort ? sort.getAttribute('aria-label') : null, shown: Boolean(sort && shown(sort) && sort.offsetParent), moved: Boolean(sort && sort.classList.contains('is-moved')),
    inRow: Boolean(r && r.left >= b.left && r.right <= b.right), left: Boolean(r && filters && r.right <= filters.getBoundingClientRect().left),
    count: filters && filters.querySelector('.sdk-badge') ? filters.querySelector('.sdk-badge').textContent : '' }; })()`;

async function view(browser, S, size, mode, screen, expr, wait = 1500) {
  const tab = new Tab(browser.cdp, S.ctx);
  await tab.open(size, mode, screen.call === true);
  const settle = tab.settle.bind(tab); tab.settle = () => Promise.race([settle(), sleep(3000)]);
  try { await driveScreen(tab, screen, S.base, S.cookies, S.ctx); await sleep(wait); return await tab.eval(expr); } finally { await tab.close(); }
}

async function main() {
  const bin = findBrowser();
  if (!bin) { say('SKIPPED. No Chromium found (set CHROME_PATH). This is not a pass; nothing was measured.'); return 0; }
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'narrow-data-'));
  let server = null; let browser = null;
  try {
    const boot = await bootSeeded('travel', dataDir, await freePort());
    server = boot.server;
    const S = { base: server.base, ctx: boot.ctx, cookies: boot.cookies };
    browser = await launch(bin);

    // 1. Maps' notice below its search field.
    const workspace = { id: 'workspace', as: 'mia', url: '/#join={trip}', wait: 'button.sdk-strip-fact[data-module=budget]', call: true };
    const page = { id: 'maps-page', as: 'mia', url: '/modules/maps?space={trip}', wait: '#module-frame >>> *' };
    for (const [name, size, screen] of [['Workspace 1280', 1280, workspace], ['Maps page 390', 390, page], ['Maps page 1280', 1280, page]]) {
      const got = await view(browser, S, size, 'light', screen, MAPS, 3000);
      const states = (got || []).filter((x) => x.search !== null);
      if (!states.length) failures.push(`${name}: Maps showed no notice with a search field (the seed has no map file), so nothing was measured`);
      for (const x of states) if (x.state < x.search - 0.5) failures.push(`${name}: the notice starts at ${Math.round(x.state)}px, over the search field that ends at ${Math.round(x.search)}px`);
      say(`${name}: ${states.length ? states.map((x) => `notice top ${Math.round(x.state)} / search bottom ${Math.round(x.search)}`).join('; ') : 'no search field over a notice'}`);
    }

    // 2. Itinerary in a narrow window: no word of a card title broken.
    const planner = { id: 'planner', as: 'mia', url: '/modules/travel?space={trip}', wait: '#module-frame >>> .day-add' };
    for (const size of [260, 220]) {
      const got = await view(browser, S, size, 'light', planner, TITLES);
      for (const x of got || []) failures.push(`Itinerary at ${size}px: the word "${x.word}" of "${x.title}" is broken across lines (title ${x.width}px wide)`);
      say(`Itinerary ${size}px: ${(got || []).length} broken words`);
    }

    // 3. Budget, no target: no empty band under the title. (The seed has no target.)
    const budget = { id: 'budget', as: 'mia', url: '/modules/budget?space={trip}', wait: '#module-frame >>> #target-edit' };
    for (const size of [1280, 390]) {
      const got = await view(browser, S, size, 'light', budget, BURN);
      if (!got) { failures.push(`Budget at ${size}px: the "Target left over time" card was not found`); continue; }
      if (got.gap > 16) failures.push(`Budget at ${size}px: ${got.gap}px between "Target left over time" and its words`);
      say(`Budget ${size}px: ${got.gap}px between the title and "${got.words}"`);
    }

    // 4. Budget's Costs: Sort is a button on the left that says the order, not a counted filter.
    const costs = { ...budget, id: 'budget-costs', steps: [{ click: 'button.mf-switch-btn', text: 'Costs', until: 'button.mf-filters' }] };
    for (const size of [1280, 390]) {
      const got = await view(browser, S, size, 'dark', costs, SORT);
      if (!got || !got.name) { failures.push(`Budget's Costs at ${size}px: no Sort button in the toolbar`); continue; }
      if (got.name !== 'Sort: Date, earliest first') failures.push(`Budget's Costs at ${size}px: the Sort button says "${got.name}", not the order ("Sort: Date, earliest first")`);
      if (!got.moved && !(got.shown && got.inRow && got.left)) failures.push(`Budget's Costs at ${size}px: the Sort button is neither in the row's left side nor in More`);
      if (got.count) failures.push(`Budget's Costs at ${size}px: the Filters button counts ${got.count} with nothing filtered (the sort is not a filter)`);
      say(`Budget's Costs ${size}px: "${got.name}" ${got.moved ? 'in More' : 'on the left of the row'}, Filters count ${got.count || 'none'}`);
    }
  } finally {
    try { if (browser) { browser.cdp.ws.close(); browser.child.kill(); fs.rmSync(browser.dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } } catch { /* best effort */ }
    if (server) await stopServer(server);
    fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
  if (failures.length) { for (const f of failures) say('FAIL', f); return 1; }
  say('ok');
  return 0;
}
process.exit(await main());
