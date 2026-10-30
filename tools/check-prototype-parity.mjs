// check-prototype-parity.mjs: the Prototype's Planner (public/design-system/prototype.html) and the real Planner drawn the same,
// measured in a headless Chromium so nobody has to find the difference by eye (Thomas, 2026-10-30).
//
// What it does. It starts the throwaway server with the screenshot seed (tools/shots.mjs, bootSeeded: the travel template, a frozen
// clock), adds the few objects the seed lacks (a buffer, a travel day, a free day, rows from the Calendar, an undated object per
// phase), opens the real Planner and the Prototype's Planner at the same panel width and measures the same parts in both.
//   1. Parity: strip, Unscheduled and its rows, the phase bars, day card and head, row cards, joint and its + button, suggestions,
//      the empty-day box and the more buttons have the same left edge, right inset and height (within 1 px) in both, each measured
//      from its own #body. At 1280 light and dark, 700 and a real 390 viewport.
//   2. Columns: in .days and Unscheduled every full-width part shares one left and right edge; in a day the cards, the suggestions
//      and the empty box share one left and right edge; every more button shares one centre.
//   3. Joint: the gap above and below the + circle differs by at most 2 px.
//   4. Phone: at a real 390 viewport every button and summary in the Planner (and the Prototype's) is at least 44 px tall, counting
//      the hit area its ::after adds.
//   5. Container, not viewport: the Prototype at ?w=390 in a wide window draws the day head as a real 390 window does.
//   6. Copies: the Prototype's TEMPLATES are character for character modules/travel/src/travel.html's, and
//      public/design-system/sources.js is what `node tools/design-system-snapshot.mjs --sources` writes now.
// Usage: node tools/check-prototype-parity.mjs. PARITY_DEBUG=1 prints every measurement. With no Chromium it says SKIPPED and exits 0
// (a skip, never a pass), and fails when CI is set.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { findBrowser, launch, freePort, stopServer, bootSeeded, Tab, sleep, driveScreen } from './shots.mjs';
import { buildSources } from './design-system-snapshot.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const say = (...a) => console.log('check-prototype-parity:', ...a);
const DEBUG = Boolean(process.env.PARITY_DEBUG);
const failures = [];
const fail = (m) => { if (!failures.includes(m)) failures.push(m); };
const started = Date.now();

// ---- 6. the copies (no browser) ----
function checkCopies() {
  const html = fs.readFileSync(path.join(root, 'modules', 'travel', 'src', 'travel.html'), 'utf8');
  const proto = fs.readFileSync(path.join(root, 'public', 'design-system', 'prototype-planner.js'), 'utf8');
  const m = /const TEMPLATES = (\{[\s\S]*?\n\});/.exec(proto);
  if (!m) { fail('public/design-system/prototype-planner.js has no "const TEMPLATES = {...};" block to compare'); return; }
  let templates;
  try { templates = vm.runInNewContext('(' + m[1] + ')'); } catch (e) { fail(`the TEMPLATES block of prototype-planner.js does not run: ${e.message}`); return; }
  const real = new Map([...html.matchAll(/<template id="(tpl-[^"]+)">([\s\S]*?)<\/template>/g)].map((x) => [x[1], x[2]]));
  let n = 0;
  for (const [key, text] of Object.entries(templates)) {
    const id = [key === 'day' ? 'tpl-day2' : `tpl-${key}`, `tpl-card-${key}`].find((c) => real.has(c));
    if (!id) { fail(`prototype-planner.js TEMPLATES.${key} has no <template> in modules/travel/src/travel.html (tpl-${key} or tpl-card-${key})`); continue; }
    n += 1;
    if (real.get(id) !== text) {
      const a = real.get(id); let i = 0; while (i < a.length && a[i] === text[i]) i += 1;
      fail(`prototype-planner.js TEMPLATES.${key} differs from #${id} in travel.html at character ${i}: product "${a.slice(Math.max(0, i - 20), i + 40)}" / Prototype "${text.slice(Math.max(0, i - 20), i + 40)}". Copy the template over character for character`);
    }
  }
  const disk = fs.readFileSync(path.join(root, 'public', 'design-system', 'sources.js'), 'utf8');
  if (buildSources().js !== disk) fail('public/design-system/sources.js is not what the stylesheets on disk produce. Run: node tools/design-system-snapshot.mjs --sources');
  say(`copies: ${n} templates compared with travel.html, sources.js compared with the stylesheets`);
}

// ---- the measuring, in the page ----
const PARTS = {
  strip: '#stripbar', undated: '#undated', undatedRow: '#undated li.sdk-row', ends: '.timeline.ends', phaseBar: '.row.marker.phase .sdk-mk-line',
  day: '.days > .sdk-day', dayHead: '.sdk-day > .sdk-day-head', dayMore: '.sdk-day-head [data-action="day-more"]', dayAdd: '.sdk-day-head .day-add',
  rowcard: '.sdk-day .row.entry .slot > article.sdk-card-banded', block: '.sdk-day .row.entry .slot > article.block', mid: '.card.stay.mid',
  lane: '.row.marker.lane .sdk-mk-line', joint: '.joint', jointadd: '.jointadd', suggestions: '.sdk-day .suggestions:not([hidden]) .suggestion',
  empty: '.sdk-day-empty',
};
const MEASURE = `(() => {
  const PARTS = ${JSON.stringify(PARTS)};
  const MORE = '.sdk-day-head [data-action="day-more"], .sdk-day .menu-btn';
  const host = document.querySelector('#module-frame') || document.querySelector('.pp-planner');
  const root = host && host.shadowRoot; if (!root) return null;
  const body = root.getElementById('body'); const br = body.getBoundingClientRect();
  const vis = (e) => e.getClientRects().length > 0;
  const r = (e) => { const b = e.getBoundingClientRect(); return { l: b.left - br.left, r: br.right - b.right, w: b.width, h: b.height, cx: (b.left + b.right) / 2 - br.left, top: b.top, bottom: b.bottom }; };
  const out = { body: br.width, parts: {}, more: [], taps: [], joints: [] };
  for (const [k, sel] of Object.entries(PARTS)) out.parts[k] = [...root.querySelectorAll(sel)].filter(vis).map(r);
  out.more = [...root.querySelectorAll(MORE)].filter(vis).map((e) => ({ ...r(e), what: e.className.toString().slice(0, 30) }));
  for (const j of root.querySelectorAll('.joint')) {
    const c = j.querySelector('.jointadd'); const p = j.previousElementSibling; const n = j.nextElementSibling;
    if (!c || !vis(c) || !p || !n || !vis(p) || !vis(n)) continue;
    const cb = c.getBoundingClientRect();
    // A timeline of markers has its own padding around its pill: measure from the pill, which is what a person sees.
    const edge = (el, last) => { if (!el.classList.contains('timeline')) return el.getBoundingClientRect(); const rows = [...el.querySelectorAll('.sdk-mk-line')].filter(vis); const x = last ? rows[rows.length - 1] : rows[0]; return (x || el).getBoundingClientRect(); };
    out.joints.push({ prev: p.className.toString().slice(0, 30), next: n.className.toString().slice(0, 30), above: cb.top - edge(p, true).bottom, below: edge(n, false).top - cb.bottom });
  }
  for (const e of root.querySelectorAll('button, summary, a[href], [role="button"]')) {
    if (!vis(e)) continue;
    const b = e.getBoundingClientRect(); let hit = b.height;
    for (const which of ['::before', '::after']) { const ps = getComputedStyle(e, which); if (ps.content !== 'none' && ps.position === 'absolute') hit = Math.max(hit, parseFloat(ps.height) || 0); }
    out.taps.push({ cls: e.className.toString().slice(0, 40) || e.tagName.toLowerCase(), action: e.dataset.action || '', text: (e.getAttribute('aria-label') || e.textContent || '').trim().slice(0, 24), h: b.height, hit });
  }
  const d = root.querySelector('.sdk-day > .sdk-day-head');
  out.dayHead = d ? { h: d.getBoundingClientRect().height, addWord: (() => { const w = d.querySelector('.sdk-day-add-word'); return w ? w.getClientRects().length > 0 : false; })() } : null;
  return out;
})()`;

const round = (n) => Math.round(n * 10) / 10;
const EXTRA = (trip) => {
  const day = (n) => new Date(Date.UTC(2026, 9, 15 + n)).toISOString().slice(0, 10);
  const ref = (id) => ({ module: 'calendar', kind: 'event', id, scope: 'space', space: trip });
  return [
    ['x1', { kind: 'block', type: 'buffer', title: 'Buffer', date: day(8), time: '10:00', minutes: 60, notes: 'Slack before the airport run', order: 1 }],
    ['x2', { kind: 'lane', type: 'travel-day', title: 'Travel day', after: day(9), notes: 'Overnight flight', order: 1 }],
    ['x3', { kind: 'block', type: 'free-day', title: 'Free day', date: day(16), order: 1 }],
    ['x4', { kind: 'link', title: 'Farewell dinner', date: day(18), time: '20:00', ref: ref('e5'), order: 1 }],
    ['x5', { kind: 'link', title: 'Pack the suitcases', date: day(9), ref: ref('e2'), order: 1 }],
    ['x6', { kind: 'note', title: 'Packing', date: day(0), notes: 'Passports, chargers, two jackets.', order: 1 }],
    ['x7', { kind: 'block', type: 'meet-up', title: 'Meet-up', date: day(8), time: '18:30', notes: 'In the hotel lobby', order: 1 }],
  ];
};

async function main() {
  checkCopies();
  const bin = findBrowser();
  if (!bin) {
    say('SKIPPED the browser parts. No Chromium found (set CHROME_PATH). This is not a pass; nothing was measured.');
    return finish(process.env.CI || failures.length ? 1 : 0);
  }
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'parity-data-'));
  let server = null; let browser = null;
  try {
    const boot = await bootSeeded('travel', dataDir, await freePort());
    server = boot.server;
    const S = { base: server.base, ctx: boot.ctx, cookies: boot.cookies };
    const ck = boot.cookies.admin.map((c) => `${c.name}=${c.value}`).join('; ');
    const phases = (await (await fetch(S.base + '/api/branding', { headers: { cookie: ck, accept: 'application/json' } })).json()).phases || [];
    const extra = EXTRA(S.ctx.trip);
    phases.forEach((p, i) => extra.push([`u${i}`, { kind: 'note', title: `Undated under ${p.label || p.id}`, phase: p.id, notes: 'No date yet', order: i + 1 }]));
    extra.push(['u9', { kind: 'stop', type: 'sight', title: 'Undated sight, no phase', order: 9 }]);
    for (const [id, value] of extra) {
      const r = await fetch(`${S.base}/api/modules/travel/data/${encodeURIComponent('plan:' + id)}?scope=space&space=${S.ctx.trip}`, { method: 'PUT', headers: { 'content-type': 'application/json', cookie: ck }, body: JSON.stringify({ value: { by: 'Mia Alvarez', ...value } }) });
      if (r.status >= 300) throw new Error(`the extra object ${id} was refused (${r.status})`);
    }
    browser = await launch(bin);

    const measure = async (which, size, mode, protoW, phoneWindow = 0) => {
      const tab = new Tab(browser.cdp, S.ctx);
      // The Prototype sits in a wide window so its own width setting is what is measured, not the window.
      await tab.open(which === 'real' ? size : phoneWindow ? size : Math.max(size + 200, 1400), mode);
      const settle = tab.settle.bind(tab); tab.settle = () => Promise.race([settle(), sleep(3000)]);
      try {
        if (which === 'real') await driveScreen(tab, { id: 'planner', as: 'mia', url: '/modules/travel?space={trip}', wait: '#module-frame >>> .day-add' }, S.base, S.cookies, S.ctx);
        else await driveScreen(tab, { id: 'proto', as: 'none', url: `/design-system/prototype.html?theme=strong-coffee&mode=${mode}&w=${protoW.id}&look=current`, wait: '.pp-planner >>> .day-add' }, S.base, S.cookies, S.ctx);
        // The Prototype's frame is as wide as the real panel (its own 1 px border included), so both bodies are the same width.
        if (which === 'proto' && protoW.px) {
          await tab.eval(`document.documentElement.style.setProperty('--pp-w', '${protoW.px}px')`);
          await sleep(300);
        }
        await sleep(500);
        const m = await tab.eval(MEASURE);
        if (!m) throw new Error(`${which} Planner has no shadow root with #body`);
        return m;
      } finally { await tab.close(); }
    };

    const real = {}; const protos = {};
    for (const [size, mode] of [[1280, 'light'], [1280, 'dark'], [700, 'light'], [390, 'light']]) {
      const key = `${size} ${mode}`;
      real[key] = await measure('real', size, mode);
      // The border of the Prototype's frame is 2 px of its width: widen it so its #body matches the real one's.
      // At 390 the Prototype is in a window of 390 too (so the window's own rules apply as on the phone); wider ones sit in a wide window.
      const phone = size === 390;
      let p = await measure('proto', size, mode, { id: String(size), px: Math.round(real[key].body) + 2 }, phone ? 1 : 0);
      if (Math.abs(p.body - real[key].body) > 0.5) p = await measure('proto', size, mode, { id: String(size), px: Math.round(real[key].body) + 2 + Math.round(real[key].body - p.body) }, phone ? 1 : 0);
      protos[key] = p;
      if (DEBUG) console.log(key, JSON.stringify({ real: real[key], proto: p }));
      say(`${key}: real body ${round(real[key].body)}px, Prototype body ${round(p.body)}px`);
    }
    const wide390 = await measure('proto', 390, 'light', { id: '390' }); // ?w=390 in a window 1400 wide

    // ---- 1. parity ----
    const REQUIRED = ['strip', 'undated', 'undatedRow', 'ends', 'phaseBar', 'day', 'dayHead', 'dayMore', 'rowcard', 'joint', 'jointadd', 'suggestions', 'empty'];
    for (const key of Object.keys(real)) {
      const a = real[key]; const b = protos[key];
      if (Math.abs(a.body - b.body) > 1) fail(`Parity ${key}: the Prototype's #body is ${round(b.body)}px wide, the real Planner's ${round(a.body)}px, so the parts cannot be compared`);
      for (const part of Object.keys(PARTS)) {
        const x = a.parts[part][0]; const y = b.parts[part][0];
        if (!x || !y) { if (REQUIRED.includes(part) && key.startsWith('1280')) fail(`Parity ${key}: ${PARTS[part]} is ${!x && !y ? 'in neither' : !x ? 'missing in the real Planner (but in the Prototype)' : 'missing in the Prototype (but in the real Planner)'}`); continue; }
        // A box that holds rows (the days, the Unscheduled box, the suggestions) is as tall as its content, which differs between the two.
        const grows = ['undated', 'ends', 'day', 'suggestions'].includes(part);
        for (const [what, f] of [['left edge', 'l'], ['right edge (from the right of #body)', 'r'], ['height', 'h']].filter((x) => !(grows && x[1] === 'h'))) {
          if (Math.abs(x[f] - y[f]) > 1) fail(`Parity ${key}: ${PARTS[part]} ${what} is ${round(x[f])}px in the real Planner and ${round(y[f])}px in the Prototype`);
        }
      }
    }

    // ---- 2. columns and 3. joints and 4. taps ----
    const spread = (list, f) => (list.length ? Math.max(...list.map((e) => e[f])) - Math.min(...list.map((e) => e[f])) : 0);
    for (const [which, set] of [['real Planner', real], ['Prototype', protos]]) {
      for (const key of Object.keys(set)) {
        const m = set[key]; const tag = `${which} ${key}`;
        const col = (name, list, sides = ['l', 'r']) => { for (const f of sides) { const what = f === 'l' ? 'left edge' : 'right edge'; if (spread(list, f) > 1) fail(`Column ${tag}: ${name} do not share one ${what}: they range over ${round(spread(list, f))}px (${[...new Set(list.map((e) => round(e[f])))].join(', ')}px from #body)`); } };
        const full = [...m.parts.day.map((e) => ({ ...e, n: 'day' })), ...m.parts.phaseBar.map((e) => ({ ...e, n: 'phase bar' })), ...m.parts.ends.map((e) => ({ ...e, n: 'timeline.ends' })), ...m.parts.undated.map((e) => ({ ...e, n: '#undated' })), ...m.parts.undatedRow.map((e) => ({ ...e, n: 'unscheduled row' }))];
        col('the full-width parts of .days and #undated (day cards, phase bars, timeline.ends, #undated, its rows)', full);
        // A card sits beside the time and the rail, so its left edge is its own; the boxes that stack under the cards (each suggestion, the empty-day box) share one left edge, and all of them end at one right edge.
        col('the cards, the suggestions and the empty box inside the days', [...m.parts.rowcard, ...m.parts.suggestions, ...m.parts.empty], ['r']);
        col('the suggestions and the empty box inside the days', [...m.parts.suggestions, ...m.parts.empty], ['l']);
        col('the cards inside the days', m.parts.rowcard, ['l']);
        if (spread(m.more, 'cx') > 1) fail(`Column ${tag}: the more buttons do not share one centre: ${round(spread(m.more, 'cx'))}px apart (${[...new Set(m.more.map((e) => round(e.cx)))].join(', ')}px from #body)`);
        const bad = m.joints.filter((j) => Math.abs(j.above - j.below) > 2);
        if (bad.length) fail(`Joint ${tag}: the + circle is not centred between its two days in ${bad.length} of ${m.joints.length} joints: ${[...new Set(bad.map((j) => `${round(j.above)}px above and ${round(j.below)}px below, between .${j.prev.trim().replace(/\\s+/g, '.')} and .${j.next.trim().replace(/\\s+/g, '.')}`))].join('; ')}`);
        if (!m.joints.length) fail(`Joint ${tag}: no joint with a + circle between two days was found`);
      }
    }
    for (const [which, set] of [['real Planner', real]]) { // the Prototype's rules follow the window, so only the real page is a phone here
      const m = set['390 light'];
      const small = m.taps.filter((t) => t.hit < 43.5);
      const seen = new Set();
      for (const t of small) { const k = `${t.cls}|${t.action}`; if (seen.has(k)) continue; seen.add(k); fail(`Tap target ${which} 390 light: button "${t.text}" (.${t.cls.trim().split(/\s+/).join('.')}${t.action ? `, ${t.action}` : ''}) is ${round(t.hit)}px tall counting its hit area (${round(t.h)}px drawn); a phone needs 44px`); }
    }

    // ---- 5. container, not viewport ----
    const phone = real['390 light'].dayHead; const wide = wide390.dayHead;
    if (!phone || !wide) fail('Container: no day head to compare at 390');
    else {
      if (Math.abs(phone.h - wide.h) > 1) fail(`Container: the day head is ${round(wide.h)}px tall in the Prototype at ?w=390 in a wide window and ${round(phone.h)}px in a real 390px window`);
      if (phone.addWord !== wide.addWord) fail(`Container: the day's Add word is ${wide.addWord ? 'shown' : 'hidden'} in the Prototype at ?w=390 in a wide window and ${phone.addWord ? 'shown' : 'hidden'} in a real 390px window`);
    }
    return finish(failures.length ? 1 : 0);
  } finally {
    if (browser) { try { browser.child.kill(); await sleep(300); fs.rmSync(browser.dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* a temp folder left behind */ } }
    if (server) await stopServer(server);
    fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}
function finish(code) {
  for (const f of failures) console.log('  FAIL ' + f);
  say(`${code === 0 ? 'ok' : 'FAIL'}: ${failures.length} problem(s); ${Math.round((Date.now() - started) / 1000)} s`);
  return code;
}
main().then((c) => process.exit(c), (e) => { console.error('check-prototype-parity: ERROR ' + (e.stack || e)); process.exit(1); });
