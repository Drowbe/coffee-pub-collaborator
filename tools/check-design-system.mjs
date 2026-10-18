#!/usr/bin/env node
/*
 * check-design-system.mjs -- the design system page (public/design-system/, documentation/plans/plan-design-system.md, first look).
 *
 * Two pages are checked, each served by the app and as a snapshot folder opened from disk: Today (index.html, the inventory) and Proposed
 * (proposed.html, only what is decided; it must not load sources.js, the components or ds.js, and Today must not load proposed.js).
 *
 * Fails on: a missing file; the snapshot script not producing an index.html in a temp folder for either page, an external script in it, or a size over
 * 12 MB, or a proposed snapshot without proposed.css and proposed.js; a proposed.css with a rule that is not under .ds-proposed, a colour on a border, a radius that is not a
 * token, or a class used by proposed.js that proposed.css does not define; a page that logs a console error, does not finish drawing, or draws nothing at 1280 (light and dark) and 390 in headless
 * Chromium (opened from the app, and the snapshot opened from disk); on the proposed page also a forced hover, focus or pressed that does not
 * show, a disabled button not at half strength, or a button not 38px (44px at 390; small 30px; an icon-only button square). Warns (never fails) on: a class in an example that is in none of
 * the stylesheets of that example's context, and a sources.js older than the module stylesheets.
 * Browser: CHROME_PATH, else a Playwright or system Chromium; with none, the browser part says SKIPPED (not a pass).
 * The Fields and forms family (proposed.js, proposed.css): every field one-line 38px (44px at 390, and in the 44px grid), the focus a 2px ring and the accent edge, the
 * placeholder the --text-dim colour, hover a fill, disabled half strength with a not-allowed cursor, error the danger edge, a tick box 16px and a switch 36 by 20,
 * the text of a filled field within 1px of the middle of its box (4x ink, in Figtree and in its fallback face); the only coloured edges are a focus and an error.
 * Options: SHOTS=<folder> saves the screenshots.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import vm from 'node:vm';
import zlib from 'node:zlib';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSnapshot, buildSources } from './design-system-snapshot.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DS = path.join(root, 'public', 'design-system');
const failures = [];
const warnings = [];
const fail = (m) => failures.push(m);

// ---- files ----
for (const f of ['index.html', 'proposed.html', 'ds.css', 'ds.js', 'components.js', 'components-2.js', 'components-3.js', 'proposed.js', 'proposed.css', 'sources.js']) {
  if (!fs.existsSync(path.join(DS, f))) fail(`public/design-system/${f} is missing`);
}
if (!fs.existsSync(path.join(root, 'tools', 'design-system-snapshot.mjs'))) fail('tools/design-system-snapshot.mjs is missing');
if (failures.length) { for (const f of failures) console.error('check-design-system: ' + f); process.exit(1); }

// ---- the snapshots, into temp folders: Today, and Proposed ----
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-snapshot-check-'));
const outP = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-snapshot-check-p-'));
const snap = buildSnapshot(out);
const snapP = buildSnapshot(outP, 'proposed');
for (const [label, dir, sn] of [['today', out, snap], ['proposed', outP, snapP]]) {
  if (!fs.existsSync(path.join(dir, 'index.html'))) fail(`the ${label} snapshot has no index.html`);
  if (sn.total > 12 * 1024 * 1024) fail(`the ${label} snapshot is ${(sn.total / 1024 / 1024).toFixed(1)} MB, over 12 MB`);
  const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
  for (const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
    if (/^(https?:)?\/\//i.test(m[1]) || m[1].startsWith('/')) fail(`the ${label} snapshot's index.html loads a script from ${m[1]}`);
  }
  for (const m of html.matchAll(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
    if (/^(https?:)?\/\//i.test(m[1]) || m[1].startsWith('/')) fail(`the ${label} snapshot's index.html links ${m[1]}, not a relative path`);
  }
  for (const f of sn.files) if (/\.(js|html)$/.test(f.file) && f.file !== 'sources.js') {
    const t = fs.readFileSync(path.join(dir, f.file), 'utf8');
    if (/<script\b[^>]*\bsrc\s*=\s*["'](https?:)?\/\//i.test(t)) fail(`${label}: ${f.file} loads an external script`);
  }
}
// The pages stay apart: Proposed is small and loads none of Today; Today carries nothing of the proposal.
{
  const names = new Set(snapP.files.map((f) => f.file));
  for (const bad of ['sources.js', 'ds.js', 'components.js', 'components-2.js', 'components-3.js']) if (names.has(bad)) fail(`the proposed snapshot holds ${bad}, which is Today's`);
  for (const need of ['index.html', 'style.css', 'theme.css', 'ds.css', 'proposed.css', 'proposed.js', 'fa/css/all.min.css']) if (!names.has(need)) fail(`the proposed snapshot has no ${need}`);
  const ph = fs.readFileSync(path.join(DS, 'proposed.html'), 'utf8');
  if (/sources\.js|components|ds\.js/.test(ph.replace(/<!--[\s\S]*?-->/g, ''))) fail('proposed.html loads something of Today (sources.js, components, ds.js)');
  if (!/href="index\.html"/.test(ph)) fail('proposed.html has no link to index.html');
  const th = fs.readFileSync(path.join(DS, 'index.html'), 'utf8');
  if (/proposed\.(js|css)/.test(th)) fail('index.html loads the proposal (proposed.js or proposed.css)');
  if (!/href="proposed\.html"/.test(th)) fail('index.html has no link to proposed.html');
  if (/data-view|ds-view/.test(th)) fail('index.html still has the Today and Proposed switch');
  if (fs.existsSync(path.join(out, 'proposed.js'))) fail('the today snapshot holds proposed.js');
}

// ---- the bundled fonts: in the proposed snapshot with their licence, self-hosted, and none in Today's ----
{
  const names = new Set(snapP.files.map((f) => f.file));
  const pcss = fs.readFileSync(path.join(DS, 'proposed.css'), 'utf8');
  const urls = [...pcss.matchAll(/url\(\s*["']?([^)"']+)/g)].map((m) => m[1]);
  if (!urls.length) fail('proposed.css has no @font-face url()');
  for (const u of urls) {
    if (!/^fonts\/[a-z0-9-]+\/[a-z0-9-]+\.woff2$/.test(u)) fail(`proposed.css: a font url that is not a bundled woff2 under fonts/: ${u}`);
    else if (!names.has(u)) fail(`the proposed snapshot has no ${u}`);
  }
  for (const d of new Set(urls.map((u) => u.split('/')[1]))) if (!names.has(`fonts/${d}/OFL.txt`)) fail(`fonts/${d} has no licence file (OFL.txt) in the proposed snapshot`);
  if (/@import|https?:\/\//.test(pcss.replace(/\/\*[\s\S]*?\*\//g, ''))) fail('proposed.css fetches something from outside (@import or an http address)');
  if (snap.files.some((f) => /^fonts\//.test(f.file))) fail("Today's snapshot holds a fonts/ folder");
  for (const f of ['index.html', 'ds.css', 'ds.js', 'components.js', 'components-2.js', 'components-3.js']) if (/fonts\/[a-z0-9-]+\/|@font-face/.test(fs.readFileSync(path.join(DS, f), 'utf8'))) fail(`${f} (Today's page) refers to the bundled fonts`);
}

// ---- the proposed rules: scoped, tokens only, every proposed class defined ----
{
  const css = fs.readFileSync(path.join(DS, 'proposed.css'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
    const split = (t) => { const parts = []; let d = 0; let cur = ''; for (const ch of t) { if (ch === '(' || ch === '[') d += 1; if (ch === ')' || ch === ']') d -= 1; if (ch === ',' && d === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) parts.push(cur.trim()); return parts; };
  for (const m of css.matchAll(/([^{}]+)\{/g)) {
    const sel = m[1].trim();
    if (!sel || sel.startsWith('@')) continue;
    for (const part of split(sel)) if (!/^\.ds-proposed\b/.test(part)) fail(`proposed.css: a rule not under .ds-proposed: ${part.slice(0, 80)}`);
  }
  for (const m of css.matchAll(/(border(?:-[a-z]+)*)\s*:\s*([^;}]+)/g)) {
    const name = m[1]; const v = m[2].trim();
    if (/radius/.test(name)) { if (!/^var\(--radius-(min|small|medium|large|round)\)$/.test(v)) fail(`proposed.css: ${name}: ${v} is not a radius token`); continue; }
    if (/(#[0-9a-f]{3,8}\b|rgb|hsl|color-mix|--accent|--danger|--ok|--tint)/i.test(v)) {
      // A field's focus and error are states that colour the whole edge (Thomas, 2026-10-17); a side of an edge (a strip) is never allowed.
      const before = css.slice(0, m.index); const sel = before.slice(Math.max(before.lastIndexOf('}'), 0), before.lastIndexOf('{'));
      if (name === 'border-color' && /(:focus|aria-invalid)/.test(sel)) continue;
      fail(`proposed.css: a coloured border: ${name}: ${v}`);
    }
  }
  if (/\b(box-shadow|outline)\s*:[^;]*(var\(--(accent|danger)|color-mix)/i.test(css.replace(/outline:\s*2px solid var\(--(accent|danger)\)( !important)?/g, ''))) fail('proposed.css: a ring or shadow in a colour (only the focus ring is allowed)');
  const defined = new Set([...css.matchAll(/\.([A-Za-z][\w-]*)/g)].map((x) => x[1]));
  const js = fs.readFileSync(path.join(DS, 'proposed.js'), 'utf8');
  const own = new Set([...js.matchAll(/\.(pm-[\w-]+)/g)].map((x) => x[1]));
  const used = new Set();
  for (const m of js.matchAll(/class="([^"]*)"/g)) for (const c of m[1].replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).filter(Boolean)) used.add(c);
  for (const m of js.matchAll(/\bcls: '([^']*)'/g)) for (const c of m[1].split(/\s+/).filter(Boolean)) used.add(c);
  // Classes that belong to Today's markup (drawn as it is), to the page frame or to Font Awesome are not the proposal's.
  const NOT_MINE = /^(fa-|pm-|dsf|ds-(?!proposed$)|nav-text)/;
  const missing = [...used].filter((c) => !NOT_MINE.test(c) && !defined.has(c));
  // Classes of today's mapping markup that the proposal does not style (a layout wrapper, a call button): listed in the file by name.
  const TODAY_ONLY = new Set(['fbtn', 'fbtn-wrap', 'fbtn-caret', 'glyph', 'off', 'loading', 'dial', 'danger', 'icon-on', 'icon-off', 'icon-loading', 'sdk-form', 'sdk-field', 'sdk-full', 'sdk-label', 'sdk-group', 'sdk-row', 'sdk-s', 'sdk-m', 'sdk-l', 'sdk-unit', 'sdk-checks', 'sdk-section', 'sdk-section-title',
    // The Headline mock-ups draw the product's own markup from style.css (a Home card, the module page's title, a docked title bar); the proposal styles none of it but the font.
    'space-list-head', 'space-list-title', 'space-list', 'space-choice', 'space-choice-head', 'space-choice-name', 'space-choice-count', 'space-choice-desc', 'space-choice-actions', 'members', 'hint', 'panel', 'module-config', 'module-head', 'module-icon', 'grow', 'pill', 'mod-header', 'mod-title', 'topbar', 'nav-left', 'brand-home', 'brand-logo', 'brand-name', 'space-switcher', 'space-switcher-button', 'crumb-label']);
  for (const c of missing) if (!TODAY_ONLY.has(c) && !own.has(c)) fail(`proposed.js uses .${c} and proposed.css does not define it`);
}

// ---- orphan classes (a warning list) ----
function loadFamilies() {
  const ctx = { window: {} };
  ctx.window.window = ctx.window;
  vm.createContext(ctx);
  for (const f of ['components.js', 'components-2.js', 'components-3.js']) vm.runInContext(fs.readFileSync(path.join(DS, f), 'utf8'), ctx, { filename: f });
  return ctx.window.DS_FAMILIES || [];
}
const fams = loadFamilies();
const src = buildSources({ withFiles: true }).data;
const cssOf = (c) => {
  const s = src.files;
  const m = (id) => (src.modules[id]?.files || []);
  if (c === 'app') return s['style.css'] + s['theme.css'];
  if (c === 'host') return s['host.css'] + s['host.js'];
  if (c.startsWith('widget:')) return s['host.css'] + s['host.js'] + m(c.slice(7)).filter((f) => /-widget\.css$/.test(f.file)).map((f) => f.text).join('');
  return s['host.css'] + s['host.js'] + m(c.slice(4)).filter((f) => f.page !== false).map((f) => f.text).join('');
};
const UTIL = new Set(['fa-solid', 'fa-fw', 'fa-spin', 'dim', 'hint', 'on', 'open', 'off', 'active', 'current', 'selected', 'today', 'sel', 'other', 'inrange', 'danger', 'primary', 'disabled', 'dial', 'ic', 'icon-on', 'icon-off']);
let nClasses = 0; let nVariants = 0; let nExamples = 0;
const orphanSet = new Set();
for (const fam of fams) {
  for (const v of fam.variants || []) {
    nVariants += 1; nExamples += 1 + (v.states || []).length;
    const css = cssOf(v.ctx || 'app');
    for (const m of v.html.matchAll(/\bclass="([^"]*)"/g)) for (const c of m[1].split(/\s+/).filter(Boolean)) {
      nClasses += 1;
      if (UTIL.has(c) || c.startsWith('fa-')) continue;
      const esc = c.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
      if (!new RegExp('\\.' + esc + '(?![A-Za-z0-9_-])').test(css)) orphanSet.add(`${fam.id}: .${c} (${v.ctx || 'app'}, "${v.n}")`);
    }
  }
}
for (const o of orphanSet) warnings.push('class in no stylesheet of its context: ' + o);
const modsOnDisk = JSON.stringify(Object.fromEntries(Object.entries(src.modules).map(([k, v]) => [k, v.files.map((f) => f.text)])));
const modsInPage = (() => { const c = { window: {} }; vm.createContext(c); vm.runInContext(fs.readFileSync(path.join(DS, 'sources.js'), 'utf8'), c); const d = c.window.DS_SOURCES; return JSON.stringify(Object.fromEntries(Object.entries(d.modules).map(([k, v]) => [k, v.files.map((f) => f.text)]))); })();
if (modsOnDisk !== modsInPage) warnings.push('public/design-system/sources.js is older than the module stylesheets: run node tools/design-system-snapshot.mjs --sources');

// ---- the browser ----
function findBrowser() {
  const cands = [process.env.CHROME_PATH];
  const pw = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(pw)) for (const d of fs.readdirSync(pw).sort().reverse()) cands.push(path.join(pw, d, 'chrome-linux', 'chrome'), path.join(pw, d, 'chrome-linux', 'headless_shell'), path.join(pw, d, 'chrome-win', 'chrome.exe'), path.join(pw, d, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'));
  cands.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  return cands.find((c) => c && fs.existsSync(c)) || null;
}
class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = []; ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } else if (m.method) for (const h of this.handlers) h(m); }); }
  send(method, params = {}, sessionId) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params, sessionId })); return new Promise((res, rej) => { this.pending.set(id, { res, rej }); setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('timeout: ' + method)); } }, 60000); }); }
}
async function launch(bin) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-chrome-'));
  const child = spawn(bin, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--allow-file-access-from-files', '--remote-debugging-port=0', `--user-data-dir=${dir}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const url = await new Promise((resolve, reject) => {
    let buf = ''; const t = setTimeout(() => reject(new Error('the browser did not start: ' + buf.slice(-300))), 20000);
    child.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m) { clearTimeout(t); resolve(m[1]); } });
    child.on('exit', (c) => { clearTimeout(t); reject(new Error('the browser exited (' + c + ')')); });
  });
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', () => rej(new Error('cannot reach the browser'))); });
  return { cdp: new Cdp(ws), child };
}
function freePort() { return new Promise((res, rej) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); s.on('error', rej); }); }
async function startServer() {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-data-'));
  const child = spawn(process.execPath, ['server/index.js'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, LIVEKIT_API_KEY: 'devkey', LIVEKIT_API_SECRET: 'devsecretdevsecret', ADMIN_PASSWORD: 'testpass1234', BASE_DOMAIN: '' } });
  let log = ''; child.stdout.on('data', (d) => { log += d; }); child.stderr.on('data', (d) => { log += d; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i += 1) {
    try { const r = await fetch(base + '/healthz'); if (r.ok) return { base, child }; } catch { /* not up yet */ }
    if (child.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill();
  throw new Error('the throwaway server did not start: ' + log.slice(-300));
}

async function browse(cdp, label, url, scenarios, shots) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const problems = [];
  cdp.handlers.push((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') problems.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problems.push('console.error: ' + m.params.args.map((a) => a.value || a.description).join(' '));
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') problems.push('log: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
  });
  await cdp.send('Runtime.enable', {}, sessionId); await cdp.send('Log.enable', {}, sessionId); await cdp.send('Page.enable', {}, sessionId);
  const ev = async (expression) => (await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)).result.value;
  let last = null;
  for (const sc of scenarios) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: 1, mobile: sc.width < 500 }, sessionId);
    await cdp.send('Page.navigate', { url: `${url}${url.includes('?') ? '&' : '?'}mode=${sc.mode}` }, sessionId);
    let ok = false;
    for (let i = 0; i < 400; i += 1) { await new Promise((r) => setTimeout(r, 150)); if (await ev('!!(window.__dsStats && window.__dsStats.ready)')) { ok = true; break; } }
    const where = `${label} ${sc.width} ${sc.mode}`;
    if (!ok) { problems.push(`${where}: the page did not finish drawing`); continue; }
    await new Promise((r) => setTimeout(r, 500));
    last = await ev('JSON.stringify({ ...window.__dsStats, errors: window.__dsStats.errors.slice(0, 5) })');
    const s = JSON.parse(last);
    if (s.errors.length) problems.push(`${where}: page errors: ${s.errors.join('; ')}`);
    if (s.loaded !== s.frames) problems.push(`${where}: ${s.loaded} of ${s.frames} example frames loaded`);
    if (sc.proposed) {
      // Only the proposal is on the page, its rules reach its frames, and a forced state really renders.
      if (s.families < 1 || s.undecided < 15) problems.push(`${where}: too little drawn (${s.families} decided, ${s.undecided} still to decide)`);
      const probe = JSON.parse(await ev(`(async () => { const F = window.__ds.frames; const get = (t) => F.find((f) => f.iframe.title === t); const out = {};
        out.today = typeof window.DS_FAMILIES !== 'undefined' || typeof window.DS_SOURCES !== 'undefined';
        out.undecidedLinks = document.querySelectorAll('.ds-undecided a').length;
        const m = get('Buttons, all states'); if (m) { const d = m.iframe.contentDocument; for (const t of d.querySelectorAll('.pm-row button')) for (const c of t.childNodes) if (c.nodeType === 3) c.textContent = c.textContent.replace(/g/g, 'o'); const rows = [...d.querySelectorAll('.pm-row')]; const cs = (x) => getComputedStyle(x);
          const b = [...rows[0].querySelectorAll('button')];
          out.rest = cs(b[0]).backgroundColor; out.hover = cs(b[1]).backgroundColor; out.focus = cs(b[2]).outlineWidth + ' ' + cs(b[2]).outlineStyle; out.pressed = cs(b[3]).backgroundColor; out.disabled = cs(b[4]).opacity; out.h = b[0].getBoundingClientRect().height; out.edge = cs(b[0]).borderTopColor;
          out.small = rows[6].querySelector('button').getBoundingClientRect().height;
          const ic = rows[12].querySelector('button').getBoundingClientRect(); out.iconW = ic.width; out.iconH = ic.height;
          const st = rows[0].querySelector('button[aria-busy]'); out.busy = !!st; out.frameMode = d.documentElement.dataset.themeMode; out.frameBg = cs(d.body).backgroundColor; out.pageMode = document.documentElement.dataset.themeMode; out.count = F.filter((f) => /^Buttons, all states/.test(f.iframe.title)).length; window.__ds.setMode(out.pageMode === 'dark' ? 'light' : 'dark'); await new Promise((r) => setTimeout(r, 500)); out.flipBg = cs(d.body).backgroundColor; out.flipBtn = cs(b[0]).backgroundColor; window.__ds.setMode(out.pageMode); }
        out.align = []; out.targets = []; if (m) { const d = m.iframe.contentDocument; for (const row of d.querySelectorAll('.pm-row')) { const role = row.querySelector('.pm-role').getBoundingClientRect(); const bs = [...row.querySelectorAll('button')]; const f = bs[0].getBoundingClientRect(); const nm = row.querySelector('.pm-role').textContent;
            if (role.right <= f.left) { const dl = Math.abs((role.top + role.height / 2) - (f.top + f.height / 2)); if (dl > 1) out.align.push('label ' + nm + ' is ' + dl.toFixed(1) + 'px off its buttons'); }
            for (const b of [bs[0]]) { out.targets.push({ n: nm + ' ' + (b.textContent.trim() || b.getAttribute('aria-label')) + ' ' + Math.round(b.getBoundingClientRect().height) }); } } }
        return JSON.stringify(out); })()`));
      // The ink: the visible letters or icon (not the boxes) must sit within 1px of the middle of the button, the first button of each role and size.
      // Each candidate font too (the Font group): its files load from fonts/ (no 404, nothing from outside), and the labels stay centred within 1px.
      for (const fk of ['', 'figtree', 'nunito-sans', 'source-sans-3']) {
      await ev(`window.__ds.setFont(${JSON.stringify(fk)})`);
      if (fk) {
        await new Promise((r) => setTimeout(r, 900));
        const loaded = await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Buttons, all states'); const d = m.iframe.contentDocument; const fam = getComputedStyle(d.querySelector('.pm-row button')).fontFamily; const first = fam.split(',')[0].trim(); await d.fonts.ready; return JSON.stringify({ fam: first, ok: d.fonts.check('500 14px ' + first, 'Save') && [...d.fonts].some((f) => f.status === 'loaded' && ('"' + f.family + '"' === first || f.family === first.replace(/"/g, ''))) }); })()`);
        const lj = JSON.parse(loaded);
        if (!lj.ok) problems.push(`${where}: the font ${fk} (${lj.fam}) did not load in the Buttons frame`);
      }
      for (let k = 0; k < (probe.targets || []).length; k += 1) {
        const t = probe.targets[k];
        const at = JSON.parse(await ev(`(() => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Buttons, all states'); const b = m.iframe.contentDocument.querySelectorAll('.pm-row')[${k}].querySelector('button'); b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + r.left + window.scrollX, y: fr.top + r.top + window.scrollY, w: r.width, h: r.height }); })()`));
        const shotB = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x, y: at.y, width: at.w, height: at.h, scale: 4 } }, sessionId);
        const c = inkCentre(Buffer.from(shotB.data, 'base64'), 4);
        if (c === null) problems.push(`${where}: no ink found in ${t.n}`);
        else if (Math.abs(c) > 1.01) problems.push(`${where}: the ink of ${t.n} is ${Math.abs(c).toFixed(2)}px ${c > 0 ? 'low' : 'high'} in its button${fk ? ` set in ${fk}` : ''}`);
      }
      }
      // The headline fonts (the Headline group): each file loads from fonts/ (local woff2), and a big title in a 1px-bordered bar sits within 1px of the middle of the bar.
      for (const hk of ['archivo', 'fraunces', 'bricolage-grotesque']) {
        await ev(`window.__ds.setHeadline(${JSON.stringify(hk)})`);
        await new Promise((r) => setTimeout(r, 900));
        const hl = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Headline, title bars'); const d = m.iframe.contentDocument; const first = getComputedStyle(d.querySelector('.pm-tb')).fontFamily.split(',')[0].trim(); await d.fonts.ready; const fam = first.replace(/"/g, ''); return JSON.stringify({ fam: first, ok: d.fonts.check('700 28px "' + fam + '"', 'Welcome') && [...d.fonts].some((f) => f.status === 'loaded' && f.family.replace(/"/g, '') === fam) }); })()`));
        if (!hl.ok) problems.push(`${where}: the headline font ${hk} (${hl.fam}) did not load in the title bars frame`);
        for (let k = 0; k < 3; k += 1) {
          const at = JSON.parse(await ev(`(() => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Headline, title bars'); const b = m.iframe.contentDocument.querySelectorAll('.pm-tb')[${k}]; b.scrollIntoView({ block: 'center' }); const r = b.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + r.left + window.scrollX, y: fr.top + r.top + window.scrollY, w: r.width, h: r.height }); })()`));
          const shotH = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x, y: at.y, width: at.w, height: at.h, scale: 4 } }, sessionId);
          const c = inkCentre(Buffer.from(shotH.data, 'base64'), 4);
          if (c === null) problems.push(`${where}: no ink found in the ${hk} title bar ${k + 1}`);
          else if (Math.abs(c) > 1.01) problems.push(`${where}: the ink of the ${hk} title bar ${k + 1} is ${Math.abs(c).toFixed(2)}px ${c > 0 ? 'low' : 'high'} in its bar`);
        }
      }
      await ev('window.__ds.setHeadline("archivo")');
      await ev('window.__ds.setFont("figtree")');
      // The Fields and forms family.
      { const fp = JSON.parse(await ev(`(${fieldProbe.toString()})()`)); for (const x of fp.problems) problems.push(`${where}: ${x}`);
        if (!/^(3px|5px|7px|11px|999px)/.test(fp.radius0 || '')) problems.push(`${where}: the field radius is not a token value (${fp.radius0})`);
        // The ink of a filled field, in Figtree and in its fallback face: within 1px of the middle of the box, one-line fields only.
        for (const face of ['figtree', 'fallback']) {
          await ev(`(() => { for (const t of ['Fields, all states', 'Fields, all states, 44px']) { const d = window.__ds.frames.find((f) => f.iframe.title === t).iframe.contentDocument; let st = d.getElementById('ds-face'); if (!st) { st = d.createElement('style'); st.id = 'ds-face'; d.head.appendChild(st); } st.textContent = ${JSON.stringify(face === 'fallback' ? '.ds-proposed input, .ds-proposed select { font-family: "Figtree Fallback", Arial, sans-serif !important; }' : '')}; } })()`);
          await new Promise((r) => setTimeout(r, 400));
          for (const [title, rowsToDo] of [['Fields, all states', [[0, 'text'], [2, 'list'], [3, 'number'], [5, 'time'], [6, 'search']]], ['Fields, all states, 44px', [[0, 'text'], [3, 'number']]]]) {
            for (const [r, nm] of rowsToDo) {
              const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === ${JSON.stringify(title)}); const el = m.iframe.contentDocument.querySelectorAll('.pm-row')[${r}].querySelectorAll('.dsf-state')[3].querySelector('input,select'); el.scrollIntoView({ block: 'center', behavior: 'instant' }); await new Promise((r) => setTimeout(r, 120)); const b = el.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height }); })()`));
              const shotF = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x, y: at.y, width: at.w, height: at.h, scale: 4 } }, sessionId);
              const c = inkCentre(Buffer.from(shotF.data, 'base64'), 4, 10); // a field has a 1px edge and rounded corners: look 2.5px in
              if (c === null) problems.push(`${where}: no ink found in the filled ${nm} field (${title}, ${face})`);
              else if (Math.abs(c) > 1.01) problems.push(`${where}: the text of the filled ${nm} field is ${Math.abs(c).toFixed(2)}px ${c > 0 ? 'low' : 'high'} in its box (${title}, ${face})`);
            }
          }
        }
        await ev(`(() => { for (const f of window.__ds.frames) { const s = f.iframe.contentDocument && f.iframe.contentDocument.getElementById('ds-face'); if (s) s.remove(); } })()`);
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
      await ev('document.querySelectorAll("*").forEach((e) => { if (e.scrollTop) e.scrollTop = 0; })');
      for (const x of probe.align || []) problems.push(`${where}: ${x}`);
      if (probe.today) problems.push(`${where}: the proposed page loaded Today's inventory (DS_FAMILIES or DS_SOURCES is set)`);
      if (probe.undecidedLinks) problems.push(`${where}: a not-yet-decided family has a link`);
      if (!probe.rest || probe.rest === probe.hover) problems.push(`${where}: the forced hover of the proposed Primary does not change its fill (${probe.rest} / ${probe.hover})`);
      if (probe.pressed === probe.rest) problems.push(`${where}: the forced pressed state does not change the fill (${probe.pressed})`);
      if (!/^2px solid/.test(probe.focus || '')) problems.push(`${where}: the forced focus state shows no 2px ring (${probe.focus})`);
      if (probe.disabled !== '0.5') problems.push(`${where}: the proposed disabled state is not half strength (${probe.disabled})`);
      if (probe.count !== 1 || probe.frameMode !== probe.pageMode) problems.push(`${where}: the example frame must be one, in the page's mode (${probe.count} frames, ${probe.frameMode} / ${probe.pageMode})`);
      if (probe.flipBg === probe.frameBg || probe.flipBtn === probe.rest) problems.push(`${where}: the Dark and Light switch does not change the examples`);
      const want = sc.width < 500 ? 44 : 38;
      if (Math.abs(probe.h - want) > 0.6) problems.push(`${where}: the proposed default button is ${probe.h}px, expected ${want}`);
      if (Math.abs(probe.iconW - want) > 0.6 || Math.abs(probe.iconH - want) > 0.6) problems.push(`${where}: the proposed icon-only button is ${probe.iconW} by ${probe.iconH}px, expected ${want} square`);
      if (Math.abs(probe.small - 30) > 0.6) problems.push(`${where}: the proposed small button is ${probe.small}px, expected 30`);
    } else if (s.families < 20 || s.tokens < 40 || s.icons < 20) problems.push(`${where}: too little drawn (${s.families} families, ${s.tokens} tokens, ${s.icons} icons)`);
    const sideways = await ev('document.documentElement.scrollWidth - document.documentElement.clientWidth');
    if (sideways > 1) problems.push(`${where}: the page scrolls sideways by ${sideways}px`);
    const h = await ev('document.documentElement.scrollHeight');
    const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: 0, y: 0, width: sc.width, height: Math.min(h, 2400), scale: 1 } }, sessionId);
    const png = Buffer.from(shot.data, 'base64');
    if (png.length < 8000) problems.push(`${where}: the screenshot is nearly empty (${png.length} bytes)`);
    if (shots) { fs.mkdirSync(shots, { recursive: true }); fs.writeFileSync(path.join(shots, `${label}-${sc.width}-${sc.mode}.png`), png); }
  }
  await cdp.send('Target.closeTarget', { targetId });
  return { problems, last: last && JSON.parse(last) };
}

// Ink position: the vertical middle of the pixels that differ from the button's own fill, against the middle of the button (px, positive is low).
function inkCentre(buf, scale, inset) {
  let o = 8; let w; let h; let ct; const idat = [];
  while (o < buf.length) { const l = buf.readUInt32BE(o); const t = buf.toString('ascii', o + 4, o + 8); const d = buf.subarray(o + 8, o + 8 + l); if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } if (t === 'IDAT') idat.push(d); o += 12 + l; }
  const bpp = ct === 6 ? 4 : 3; const raw = zlib.inflateSync(Buffer.concat(idat)); const st = w * bpp; const px = Buffer.alloc(h * st);
  for (let y = 0; y < h; y += 1) { const f = raw[y * (st + 1)]; for (let x = 0; x < st; x += 1) { const v = raw[y * (st + 1) + 1 + x]; const a = x >= bpp ? px[y * st + x - bpp] : 0; const b = y ? px[(y - 1) * st + x] : 0; const c = x >= bpp && y ? px[(y - 1) * st + x - bpp] : 0; let r = v; if (f === 1) r += a; else if (f === 2) r += b; else if (f === 3) r += (a + b) >> 1; else if (f === 4) { const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c); r += (pa <= pb && pa <= pc) ? a : pb <= pc ? b : c; } px[y * st + x] = r & 255; } }
  const g = (x, y) => [0, 1, 2].map((i) => px[(y * w + x) * bpp + i]);
  const bg = g(5 * scale > w ? 1 : 5, Math.floor(h / 2)); let top = -1; let bot = -1; const m = inset || 3 * scale / 2;
  for (let y = Math.ceil(m); y < h - m; y += 1) for (let x = Math.ceil(m * 1.5); x < w - m * 1.5; x += 1) { const p = g(x, y); if (Math.abs(p[0] - bg[0]) + Math.abs(p[1] - bg[1]) + Math.abs(p[2] - bg[2]) > 90) { if (top < 0) top = y; bot = y; } }
  return top < 0 ? null : ((top + bot + 1) / 2 - h / 2) / scale;
}


// The edge of a field in a screenshot taken at device pixel ratio dsf: for each side, how far the pixel nearest to the full edge colour is
// from it (sum of the three channel differences), looking 3px either side of the box edge across the middle of that side.
function edgeColours(buf, target, dsf, pad, boxW, boxH) {
  let o = 8; let w; let h; let ct; const idat = [];
  while (o < buf.length) { const l = buf.readUInt32BE(o); const t = buf.toString('ascii', o + 4, o + 8); const d = buf.subarray(o + 8, o + 8 + l); if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; } if (t === 'IDAT') idat.push(d); o += 12 + l; }
  const bpp = ct === 6 ? 4 : 3; const raw = zlib.inflateSync(Buffer.concat(idat)); const st = w * bpp; const px = Buffer.alloc(h * st);
  for (let y = 0; y < h; y += 1) { const f = raw[y * (st + 1)]; for (let x = 0; x < st; x += 1) { const v = raw[y * (st + 1) + 1 + x]; const a = x >= bpp ? px[y * st + x - bpp] : 0; const b = y ? px[(y - 1) * st + x] : 0; const c = x >= bpp && y ? px[(y - 1) * st + x - bpp] : 0; let r = v; if (f === 1) r += a; else if (f === 2) r += b; else if (f === 3) r += (a + b) >> 1; else if (f === 4) { const p = a + b - c; const pa = Math.abs(p - a); const pb = Math.abs(p - b); const pc = Math.abs(p - c); r += (pa <= pb && pa <= pc) ? a : pb <= pc ? b : c; } px[y * st + x] = r & 255; } }
  const scale = w / (boxW + pad * 2); // device pixels per CSS pixel actually in the image
  const dist = (x, y) => { const i = (y * w + x) * bpp; return Math.abs(px[i] - target[0]) + Math.abs(px[i + 1] - target[1]) + Math.abs(px[i + 2] - target[2]); };
  const cx = Math.round(w / 2); const cy = Math.round(h / 2); const span = Math.ceil(3 * scale);
  const nearest = (nom, horizontal) => { let best = 1e9; for (let k = -span; k <= span; k += 1) { const v = horizontal ? dist(cx, Math.min(h - 1, Math.max(0, nom + k))) : dist(Math.min(w - 1, Math.max(0, nom + k)), cy); if (v < best) best = v; } return best; };
  return { top: nearest(Math.round(pad * scale), true), bottom: nearest(Math.round((pad + boxH) * scale), true), left: nearest(Math.round(pad * scale), false), right: nearest(Math.round((pad + boxW) * scale), false) };
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

let browserNote = ''; let browserNote2 = '';
const bin = findBrowser();
if (!bin) {
  browserNote = 'browser part SKIPPED (no Chromium found: set CHROME_PATH, or install one with npx playwright install chromium). This is not a pass; the page was not opened.';
} else {
  let server = null; let br = null;
  try {
    server = await startServer();
    br = await launch(bin);
    const shots = process.env.SHOTS || null;
    const scenarios = [{ width: 1280, mode: 'light' }, { width: 1280, mode: 'dark' }, { width: 390, mode: 'dark' }];
    const P = (w, m) => ({ width: w, mode: m, proposed: true });
    const a = await browse(br.cdp, 'served', `${server.base}/design-system/index.html`, scenarios, shots);
    const b = await browse(br.cdp, 'snapshot', pathToFileURL(path.join(out, 'index.html')).href, [{ width: 1280, mode: 'light' }, { width: 390, mode: 'dark' }], shots);
    const c = await browse(br.cdp, 'served-proposed', `${server.base}/design-system/proposed.html`, [P(1280, 'light'), P(1280, 'dark'), P(390, 'light'), P(390, 'dark')], shots);
    const d = await browse(br.cdp, 'snapshot-proposed', pathToFileURL(path.join(outP, 'index.html')).href, [P(1280, 'dark'), P(390, 'light')], shots);
    for (const p of [...a.problems, ...b.problems, ...c.problems, ...d.problems]) fail(p);
    if (c.last) browserNote2 = `the proposed page opened from the app and from its snapshot on disk at 1280 and 390 (light, dark): ${c.last.families} decided, ${c.last.undecided} still to decide, ${c.last.frames} frames, no console error`;
    if (a.last) browserNote = `opened from the app and from the snapshot on disk at 1280 (light, dark) and 390: ${a.last.families} families, ${a.last.variants} looks, ${a.last.examples} examples in ${a.last.frames} frames, ${a.last.tokens} tokens, ${a.last.icons} icons, no console error`;
  } catch (e) {
    fail('the browser part could not run: ' + e.message);
  } finally {
    if (br) { try { br.child.kill(); } catch { /* gone */ } }
    if (server) server.child.kill();
  }
}
fs.rmSync(out, { recursive: true, force: true });
fs.rmSync(outP, { recursive: true, force: true });

for (const w of warnings.slice(0, 40)) console.log('check-design-system: warning: ' + w);
if (warnings.length > 40) console.log(`check-design-system: ... and ${warnings.length - 40} more warnings`);
if (failures.length) { for (const f of failures) console.error('check-design-system: FAIL ' + f); process.exit(1); }
console.log(`check-design-system: ok. ${fams.length} families, ${nVariants} looks, ${nExamples} examples, ${nClasses} classes in markup (${orphanSet.size} warnings); snapshots ${snap.files.length} files, ${(snap.total / 1024 / 1024).toFixed(2)} MB (today) and ${snapP.files.length} files, ${(snapP.total / 1024 / 1024).toFixed(2)} MB (proposed). ${browserNote} ${browserNote2}`);
