#!/usr/bin/env node
/*
 * check-design-system-nesting.mjs -- the nesting and corners rules of the proposed design system page (Foundations, "Nesting and corners").
 * Called by the Foundations and Chat checks (checkNesting) and by the other families that want it; it is not a family of its own.
 * Run on its own it opens the proposed page in a real browser and measures every frame of the families you name:
 *     node tools/check-design-system-nesting.mjs                 the four families that obey the rules (Chat, Cards, Module window, Foundations)
 *     node tools/check-design-system-nesting.mjs --all           every family frame; lists the violations by frame, never fails (a report)
 *     node tools/check-design-system-nesting.mjs --only=Chat,Rows --width=390 --mode=dark
 *
 * The rules (public/design-system/proposed-foundations.js, "Nesting and corners"):
 *   (a) At most TWO filled or bordered surfaces nested inside a window or a panel: surface > item > nothing more. A third level loses its own fill
 *       and edge and is plain content. The window or panel itself is level 0.
 *   (b) A child's corner is never larger than its parent's (concentric: the token one step smaller: large > medium > small > min). A parent with square
 *       corners, other than a band of a window (title bar, toolbar, status line, format bar, composer) or the window at the edge of a page, has square children only.
 *   (c) The space between a parent's edge and a child's edge is at least the child's own padding.
 *   (d) Buttons, chips, inputs, avatars and icon chips are controls: they are not a level, but they obey (b) (a full pill or circle is exempt).
 *
 * What counts as a surface: an element with a fill that differs from the surface it sits on, or an edge on at least three sides (a one-sided line is a
 * divider, and a region that paints the same step as its parent, such as the window content, is not a box). Page-only scaffolding (classes pm-*) and the
 * frame root are not surfaces. A control, and anything inside one, is never a surface.
 *
 * Fails on: a surface with more than two surface ancestors, a child corner larger than its parent's, a rounded child in a square parent, a child whose
 * space to its parent's edge is under its own padding.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// The families that obey the rules today, by the start of their frame titles.
export const OBEYING = ['Chat', 'Cards', 'Rows', 'Module chrome', 'Foundations'];

// Measured in the page (runs in the browser). `only` is a regular expression source for the frame titles; '' means every frame.
export const nestingProbe = (only, dump) => {
  const re = only ? new RegExp(only) : null;
  const F = window.__ds.frames.filter((f) => !re || re.test(f.iframe.title));
  const out = [];
  const CONTROL = 'button, input, textarea, select, option, kbd, code, svg, i.fa-solid, .btn, .sdk-icon-btn, .sdk-chip, .sdk-chip-tag, .sdk-badge, .sdk-badge-micro, .sdk-status, .sdk-status-word, .sdk-tabs, .sdk-tab, .sdk-tab-badge, .sdk-tab-dot, .sdk-search, .sdk-progress, .sdk-progress-fill, .tb-progress, .tb-progress-fill, .chip, .sdk-sep, .sdk-card-icon, .sdk-message-portrait, .message-portrait, .sdk-portrait, .sdk-avatar, [class*="sdk-avatar"], .sdk-linkbox-photo, .chat-link-img, .sdk-card-image, .sdk-switch, .sdk-check, .sdk-radio, .sdk-row-tick, .sdk-exception-flag, .sdk-key, [class*="sdk-chip"], [class*="sdk-count"], [class*="sdk-dot"], [class*="sdk-field"], .sdk-select, .sdk-slider, .sdk-toggle';
  const BAND = '.topbar, .sdk-titlebar, .sdk-toolbar, .sdk-status-line, .sdk-format-bar, .sdk-composer, .mod-header, .mod-toolbar, .mod-status, .module-floating-head, .chat-head, .chat-bar, .chat-format-bar, .sdk-card-banded > .sdk-card-head, .sdk-message-head, .message-head'; // the banded card's head band is part of its box, not a level
  const alpha = (c) => { if (!c || c === 'transparent') return 0; let m = /\/\s*([\d.]+)(%?)\s*\)/.exec(c); if (m) return Number(m[1]) / (m[2] ? 100 : 1); m = /^rgba\(([^)]+)\)/.exec(c); if (m) { const p = m[1].split(','); return p.length > 3 ? Number(p[3]) : 1; } return /^(rgb|color|lab|lch|oklab|oklch|hsl)/.test(c) ? 1 : 0; };
  const edges = (c) => ['Top', 'Right', 'Bottom', 'Left'].filter((s) => c['border' + s + 'Style'] !== 'none' && parseFloat(c['border' + s + 'Width']) > 0 && alpha(c['border' + s + 'Color']) > 0.01).length;
  const radius = (c) => Math.max(...['TopLeft', 'TopRight', 'BottomRight', 'BottomLeft'].map((k) => parseFloat(c['border' + k + 'Radius']) || 0));
  const label = (e) => (e.classList && e.classList.length ? '.' + [...e.classList].filter((x) => !/^ds-force/.test(x)).slice(0, 2).join('.') : e.tagName.toLowerCase());
  for (const f of F) {
    const d = f.iframe.contentDocument; const w = d && d.defaultView; if (!d) continue;
    const root = d.querySelector('.ds-proposed'); if (!root) continue;
    const title = f.iframe.title; const seen = new Set();
    const bad = (key, msg) => { if (seen.has(key)) return; seen.add(key); out.push(`${title}: ${msg}`); };
    const cache = new Map();
    const style = (e) => { if (!cache.has(e)) cache.set(e, w.getComputedStyle(e)); return cache.get(e); };
    const isScaffold = (e) => [...e.classList].some((c) => /^pm-/.test(c)) || !!e.closest('[data-nesting-skip]');
    const isControl = (e) => !!e.closest(CONTROL);
    // The nearest ancestor that is a surface (null at the top).
    const surfaceOf = (e) => {
      const c = style(e); if (c.display === 'none' || c.visibility === 'hidden') return null;
      if (e === root || isScaffold(e) || e.closest('svg')) return null;
      if (e.matches('body, html, .ds-proposed')) return null;
      const r = e.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return null;
      const bg = c.backgroundColor; const hasFill = alpha(bg) > 0.01 || (c.backgroundImage && c.backgroundImage !== 'none');
      const boxed = edges(c) >= 3;
      if (!hasFill && !boxed) return null;
      if (!boxed) { // a fill the same as what it sits on is a region, not a box
        const p = surfaceAbove(e); const pbg = p ? style(p).backgroundColor : null; if (p && pbg === bg && c.backgroundImage === 'none') return null;
      }
      return e;
    };
    const surfaceCache = new Map();
    const isSurface = (e) => { if (!surfaceCache.has(e)) surfaceCache.set(e, !!surfaceOf(e)); return surfaceCache.get(e); };
    const surfaceAbove = (e) => { for (let p = e.parentElement; p && p !== root.parentElement; p = p.parentElement) { if (p === root) return null; if (isScaffold(p) || p.matches('body, html')) continue; if (isSurface(p)) return p; } return null; };
    const chain = (e) => { const c = []; for (let p = surfaceAbove(e); p; p = surfaceAbove(p)) c.push(p); return c; };
    const squareUp = (e) => { // the nearest ancestor surface that has rounded corners; null when the way up is square (a band, the edge of a page)
      for (let p = surfaceAbove(e); p; p = surfaceAbove(p)) if (radius(style(p)) > 0) return p; return null;
    };
    const pill = (e, r) => { const b = e.getBoundingClientRect(); return r >= Math.min(b.width, b.height) / 2 - 0.5 || r >= 100; };
    for (const el of root.querySelectorAll('*')) {
      if (isScaffold(el) || el.closest('svg')) continue;
      const ctl = isControl(el);
      const ctlRoot = ctl ? el.closest(CONTROL) : null;
      if (ctl && ctlRoot !== el) continue; // the inside of a control
      const c = style(el);
      if (ctl) { // (d): a control has no level, but its corner obeys (b)
        const r = radius(c); if (!r || pill(el, r)) continue;
        if (c.backgroundColor === 'rgba(0, 0, 0, 0)' && edges(c) < 3) continue; // a bare icon button draws no box
        const up = squareUp(el); if (!up) continue; const R = radius(style(up));
        if (r > R + 0.01) bad(`c|${label(el)}|${label(up)}`, `control ${label(el)} has a ${r}px corner inside ${label(up)} at ${R}px (a child's corner is never larger)`);
        continue;
      }
      if (!isSurface(el)) continue;
      if (dump) out.push(`${title}: [surface] depth ${chain(el).length} ${chain(el).map(label).reverse().join('>')}>${label(el)} r=${radius(c)}`);
      const above = chain(el); const depth = above.length;
      if (depth > 2) bad(`a|${label(el)}|${above.map(label).join('>')}`, `${[...above].reverse().map(label).join(' > ')} > ${label(el)} is ${depth + 1} surfaces deep (a window or panel holds a surface and an item in it, no more; the third loses its own fill and edge)`);
      const p = above[0]; if (!p) continue;
      const r = radius(c); const pc = style(p); const R = radius(pc);
      if (r > 0 && !pill(el, r)) {
        if (R > 0) { if (r > R + 0.01) bad(`b|${label(el)}|${label(p)}`, `${label(el)} has a ${r}px corner inside ${label(p)} at ${R}px (a child's corner is never larger)`); }
        else if (p.matches(BAND) || above.length === 1) { // a band of a window, or the window at the edge of a page: look to the rounded surface above it
          const up = squareUp(el); if (up) { const RU = radius(style(up)); if (r > RU + 0.01) bad(`b|${label(el)}|${label(up)}`, `${label(el)} has a ${r}px corner under ${label(up)} at ${RU}px (a child's corner is never larger)`); }
        } else bad(`s|${label(el)}|${label(p)}`, `${label(el)} is rounded (${r}px) inside the square ${label(p)} (a square parent has square children only)`);
      }
      // (c) the space between the parent's edge and the child's edge is at least the child's own padding (not for something that floats over its parent)
      if (c.position === 'absolute' || c.position === 'fixed') continue;
      if (p.matches(BAND) || el.matches(BAND)) continue;
      const pr = p.getBoundingClientRect(); const cr = el.getBoundingClientRect();
      const inner = { top: pr.top + parseFloat(pc.borderTopWidth), left: pr.left + parseFloat(pc.borderLeftWidth), right: pr.right - parseFloat(pc.borderRightWidth), bottom: pr.bottom - parseFloat(pc.borderBottomWidth) };
      const own = Math.max(parseFloat(c.paddingTop), parseFloat(c.paddingRight), parseFloat(c.paddingBottom), parseFloat(c.paddingLeft)) || 0;
      if (own <= 0) continue;
      { let sc = el.parentElement; while (sc && sc !== root) { const o = style(sc).overflowY; if (o === 'auto' || o === 'scroll') break; sc = sc.parentElement; } // cut by a scrolling list: not a layout gap
        if (sc && sc !== root && sc.scrollHeight > sc.clientHeight + 1 && cr.bottom >= sc.getBoundingClientRect().bottom - 1) continue; }
      const gaps = { top: cr.top - inner.top, left: cr.left - inner.left, right: inner.right - cr.right, bottom: inner.bottom - cr.bottom };
      for (const [side, g] of Object.entries(gaps)) if (g < own - 0.6 && g >= -0.6) bad(`p|${label(el)}|${label(p)}|${side}`, `${label(el)} is ${Math.round(g * 10) / 10}px from the ${side} of ${label(p)} but has ${own}px of its own padding (the space to the parent's edge is at least the child's padding)`);
    }
    // (e) things in a list are 8px apart (rows, messages); rows inside a card, 4px
    const ITEM = '.sdk-row, .place-row, .cat-line, .result, .switch-row, .module-display-row, .opt, .sdk-message, .message';
    for (const el of root.querySelectorAll(ITEM)) {
      if (isScaffold(el)) continue; const nx = el.nextElementSibling; if (!nx || !nx.matches(ITEM)) continue;
      const a = el.getBoundingClientRect(); const b2 = nx.getBoundingClientRect(); if (a.width < 2 || b2.width < 2) continue;
      const gap = b2.top - a.bottom; if (b2.top < a.bottom - 1) continue; // side by side
      const inCard = !!el.parentElement.closest('.sdk-card, .card, .tile, .rcard, .editor-card, .space-choice');
      const want = inCard ? 4 : 8;
      if (gap < want - 0.6) bad(`e|${label(el)}|${label(el.parentElement)}`, `${label(el)} rows touch or are ${Math.round(gap * 10) / 10}px apart in ${label(el.parentElement)} (things in a list are ${want}px apart)`);
    }
  }
  return out;
};

// Called by a family's browserChecks(b): measures the frames whose title matches `only` (a RegExp) and pushes what it finds to b.problems.
export async function checkNesting(b, only) {
  const found = await b.ev(`(${nestingProbe.toString()})(${JSON.stringify(only ? only.source : '')})`);
  for (const x of found) b.problems.push(`${b.where}: nesting: ${x}`);
  return found;
}

// ---- run on its own ----
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const arg = (n) => (process.argv.find((a) => a.startsWith(`--${n}=`)) || '').split('=')[1];
  const all = process.argv.includes('--all');
  const only = arg('only') ? arg('only').split(',') : OBEYING;
  const widths = (arg('width') || '1280,390').split(',').map(Number); const modes = (arg('mode') || 'light,dark').split(',');
  const findBrowser = () => {
    const cands = [process.env.CHROME_PATH]; const pw = path.join(os.homedir(), '.cache', 'ms-playwright');
    if (fs.existsSync(pw)) for (const d of fs.readdirSync(pw).sort().reverse()) cands.push(path.join(pw, d, 'chrome-linux', 'chrome'), path.join(pw, d, 'chrome-linux', 'headless_shell'));
    cands.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable');
    return cands.find((c) => c && fs.existsSync(c)) || null;
  };
  const free = () => new Promise((res, rej) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); s.on('error', rej); });
  const bin = findBrowser();
  if (!bin) { console.log('check-design-system-nesting: SKIPPED (no Chromium found: set CHROME_PATH). This is not a pass.'); process.exit(0); }
  const port = await free();
  const server = spawn(process.execPath, ['server/index.js'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(port), DATA_DIR: fs.mkdtempSync(path.join(os.tmpdir(), 'ds-nest-')), LIVEKIT_API_KEY: 'devkey', LIVEKIT_API_SECRET: 'devsecretdevsecret', ADMIN_PASSWORD: 'testpass1234', BASE_DOMAIN: '' } });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i += 1) { try { if ((await fetch(base + '/healthz')).ok) break; } catch { /* not up */ } await new Promise((r) => setTimeout(r, 200)); }
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-nest-chrome-'));
  const chrome = spawn(bin, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${dir}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const wsUrl = await new Promise((resolve, reject) => { let buf = ''; chrome.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m) resolve(m[1]); }); chrome.on('exit', () => reject(new Error('browser exited'))); });
  const ws = new WebSocket(wsUrl); await new Promise((r) => ws.addEventListener('open', r));
  let id = 0; const pending = new Map(); ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } });
  const send = (method, params = {}, sessionId) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params, sessionId })); });
  const { result: { targetId } } = await send('Target.createTarget', { url: 'about:blank' });
  const { result: { sessionId } } = await send('Target.attachToTarget', { targetId, flatten: true });
  const ev = async (expression) => { const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception?.description || 'evaluate failed'); return r.result.result.value; };
  const lines = [];
  for (const wd of widths) for (const mode of modes) {
    await send('Emulation.setDeviceMetricsOverride', { width: wd, height: 900, deviceScaleFactor: 1, mobile: wd < 500 }, sessionId);
    await send('Page.navigate', { url: `${base}/design-system/proposed.html?mode=${mode}` }, sessionId);
    for (let i = 0; i < 400; i += 1) { await new Promise((r) => setTimeout(r, 150)); if (await ev('!!(window.__dsStats && window.__dsStats.ready)')) break; }
    await ev('window.DS_PROPOSED.renderAll().then(() => true)'); await new Promise((r) => setTimeout(r, 700));
    const src = all ? '' : `^(${only.map((o) => o.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`;
    const found = JSON.parse(await ev(`JSON.stringify((${nestingProbe.toString()})(${JSON.stringify(src)}, ${JSON.stringify(arg('dump') || '')}))`));
    for (const x of found) lines.push(`${wd} ${mode}: ${x}`);
  }
  chrome.kill(); server.kill();
  const uniq = [...new Set(lines)];
  if (!uniq.length) console.log(`check-design-system-nesting: ok (${all ? 'every frame' : only.join(', ')})`);
  else { for (const l of uniq) console.log('check-design-system-nesting: ' + l); console.log(`check-design-system-nesting: ${uniq.length} violation(s)`); }
  process.exit(all || !uniq.length ? 0 : 1);
}
