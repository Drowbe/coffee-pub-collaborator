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
 * The Fields and forms family (proposed.js, proposed.css): every field one-line 38px (44px at 390, and in the 44px grid), the focus a 2px accent edge and a 2px ring (all four sides the same at 1.25x and 1.5x with a fractional scroll), the calendar button inside the date field (equal inset, 30px, a 44px target on a phone, ink centred with the text), the
 * placeholder the --text-dim colour, hover a fill, disabled half strength with a not-allowed cursor, error the danger edge, a tick box 16px and a switch 36 by 20,
 * the text of a filled field within 1px of the middle of its box (4x ink, in Figtree and in its fallback face); the only coloured edges are a focus and an error.
 * The Tabs and view switches family (proposed.js, proposed.css): tabs 38px (44px at 390), small 30px, an icon-only tab square, every edge 1px transparent in every state (no coloured border, no underline, no bar), the selected fill equal to the --selected-bg token with the accent-mix text, the focus a 2px outline at offset -2px (all four sides the same at 1.25x and 1.5x), a strip that overflows scrolls with its scrollbar hidden and keeps the selected tab in view by a press and by the arrow keys, the joined switch 2px apart and icons only (word kept as the title and name) at 390, a small tab on a phone keeps 30px with a 44px hit area, the ink of a label, an icon and label and an icon within 1px of the middle (4x, Figtree and its fallback), the top bar fold, every kept name an alias, the family marked Proposed with its date.
 * The Colour foundation (proposed-colour.js and .css) is checked by tools/check-design-system-colour.mjs, called from here.
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
import { colourStatic, colourProbe } from './check-design-system-colour.mjs';

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

// The Colour foundation (proposed-colour.js and .css): its files and rules (tools/check-design-system-colour.mjs); the browser part is below.
colourStatic({ DS, snapNames: new Set(snapP.files.map((f) => f.file)), todayHtml: fs.readFileSync(path.join(DS, 'index.html'), 'utf8'), proposedHtml: fs.readFileSync(path.join(DS, 'proposed.html'), 'utf8'), fail });

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
  if (/\b(box-shadow|outline)\s*:[^;]*(var\(--(accent|danger)|color-mix)/i.test(css.replace(/outline:\s*2px solid (var\(--(accent|danger)\)|color-mix\(in srgb, var\(--accent\) 55%, var\(--t-ink\)\))( !important)?/g, ''))) fail('proposed.css: a ring or shadow in a colour (only the focus ring is allowed)');
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
    'space-list-head', 'space-list-title', 'space-list', 'space-choice', 'space-choice-head', 'space-choice-name', 'space-choice-count', 'space-choice-desc', 'space-choice-actions', 'members', 'hint', 'panel', 'module-config', 'module-head', 'module-icon', 'grow', 'pill', 'mod-header', 'mod-title', 'topbar', 'nav-left', 'brand-home', 'brand-logo', 'brand-name', 'space-switcher', 'space-switcher-button', 'crumb-label', 'visually-hidden']);
  for (const c of missing) if (!TODAY_ONLY.has(c) && !own.has(c)) fail(`proposed.js uses .${c} and proposed.css does not define it`);
  // The Tabs and view switches family: no underline, no bar on one side, every kept name defined as an alias, the new names defined.
  const tabsCss = css.slice(css.indexOf('.sdk-tabs'));
  if (/border-(left|right|top|bottom)\s*:/.test(tabsCss.replace(/\.ds-proposed input[^{]*\{[^}]*\}/g, ''))) fail('proposed.css: the tabs rules draw an edge on one side (no underline bar, no left bar)');
  if (/text-decoration\s*:\s*underline/.test(tabsCss)) fail('proposed.css: the tabs rules underline something');
  if (/inset\s*\)|inset 0|box-shadow\s*:\s*inset/.test(tabsCss)) fail('proposed.css: the tabs rules draw an inset shadow (a bar)');
  for (const c of ['sdk-tabs', 'sdk-tab', 'sdk-tab-glyph', 'sdk-tab-word', 'sdk-tab-badge', 'sdk-tab-dot', 'sdk-tab-icon', 'sdk-tabs-small', 'sdk-tabs-joined', 'sdk-tabs-bar', 'sdk-tabs-compact',
    'tb-tabs', 'tb-tab', 'tb-tab-glyph', 'tb-tab-word', 'tb-tab-icon', 'tb-tabs-compact', 'subtabs', 'subtab', 'setup-tabs', 'setup-tab', 'setup-tab-dot', 'layout-tabs', 'core-link', 'badge']) {
    if (!defined.has(c)) fail(`proposed.css does not define the tabs name .${c} (a new name or a kept alias)`);
  }
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
        // The date field: the text and the calendar icon each sit within 1px of the middle of the field's height, by ink (4x).
        for (const [title, part] of [['Fields, all states', 'text'], ['Fields, all states', 'icon'], ['Fields, all states, 44px', 'text'], ['Fields, all states, 44px', 'icon']]) {
          const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === ${JSON.stringify(title)}); const cell = m.iframe.contentDocument.querySelectorAll('.pm-row')[4].querySelectorAll('.dsf-state')[3]; const el = cell.querySelector('input'); const bt = cell.querySelector('.sdk-field-btn'); el.scrollIntoView({ block: 'center', behavior: 'instant' }); await new Promise((r) => setTimeout(r, 120)); const b = el.getBoundingClientRect(); const q = bt.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); const x0 = ${part === 'icon' ? 'q.left' : 'b.left'}; const x1 = ${part === 'icon' ? 'q.right' : 'q.left - 4'}; return JSON.stringify({ x: fr.left + x0 + window.scrollX, y: fr.top + b.top + window.scrollY, w: x1 - x0, h: b.height }); })()`));
          const shotD = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x, y: at.y, width: at.w, height: at.h, scale: 4 } }, sessionId);
          const c = inkCentre(Buffer.from(shotD.data, 'base64'), 4, 10);
          if (c === null) problems.push(`${where}: no ink found in the date ${part} (${title})`);
          else if (Math.abs(c) > 1.01) problems.push(`${where}: the date ${part} is ${Math.abs(c).toFixed(2)}px ${c > 0 ? 'low' : 'high'} in its field (${title})`);
        }
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
      // The Tabs and view switches family.
      { const tp = JSON.parse(await ev(`(${tabsProbe.toString()})()`)); for (const x of tp.problems) problems.push(`${where}: ${x}`);
        // The ink of a label, an icon and label, an icon alone: within 1px of the middle of the tab, by a 4x screenshot, in Figtree and in its fallback face.
        for (const face of ['figtree', 'fallback']) {
          await ev(`(() => { for (const t of ['Tabs, all states', 'Tabs, all states, small']) { const d = window.__ds.frames.find((f) => f.iframe.title === t).iframe.contentDocument; let st = d.getElementById('ds-face'); if (!st) { st = d.createElement('style'); st.id = 'ds-face'; d.head.appendChild(st); } st.textContent = ${JSON.stringify(face === 'fallback' ? '.ds-proposed .sdk-tab { font-family: "Figtree Fallback", Arial, sans-serif !important; }' : '')}; } })()`);
          await new Promise((r) => setTimeout(r, 400));
          for (const title of ['Tabs, all states', 'Tabs, all states, small']) {
            for (const [r, nm] of [[0, 'label'], [1, 'icon and label'], [2, 'icon alone']]) for (const col of [0, 3]) {
              const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === ${JSON.stringify(title)}); const el = m.iframe.contentDocument.querySelectorAll('.pm-row')[${r}].querySelectorAll('.dsf-state')[${col}].querySelector('.sdk-tab'); el.scrollIntoView({ block: 'center', behavior: 'instant' }); await new Promise((r) => setTimeout(r, 120)); m.iframe.style.position = 'relative'; m.iframe.style.top = '0px'; let b = el.getBoundingClientRect(); let fr = m.iframe.getBoundingClientRect(); const fy = fr.top + window.scrollY; /* the frame's own origin: a frame that starts between two device pixels is painted snapped, so its ink moves up to a pixel against the box; it is moved to a whole pixel here (position only) */ const frac = fy - Math.floor(fy); if (frac > 0.01) { m.iframe.style.top = (1 - frac) + 'px'; await new Promise((r) => setTimeout(r, 120)); b = el.getBoundingClientRect(); fr = m.iframe.getBoundingClientRect(); } return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height }); })()`));
              const shotT = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x, y: at.y, width: at.w, height: at.h, scale: 4 } }, sessionId);
              const c = inkCentre(Buffer.from(shotT.data, 'base64'), 4, 10);
              if (c === null) problems.push(`${where}: no ink found in the ${nm} tab (${title}, ${col ? 'selected' : 'rest'}, ${face})`);
              else if (Math.abs(c) > 1.01) problems.push(`${where}: the ${nm} tab is ${Math.abs(c).toFixed(2)}px ${c > 0 ? 'low' : 'high'} of the middle of its box (${title}, ${col ? 'selected' : 'rest'}, ${face})`);
            }
          }
        }
        await ev(`(() => { for (const f of window.__ds.frames) { f.iframe.style.top = ''; f.iframe.style.position = ''; const s = f.iframe.contentDocument && f.iframe.contentDocument.getElementById('ds-face'); if (s) s.remove(); } })()`);
        // The focus outline of a tab, rest and selected: all four sides the same at a fractional device pixel ratio and page offset (the Fields' method).
        if (sc.width >= 500) {
          for (const dsf of [1.25, 1.5]) {
            await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: dsf, mobile: false }, sessionId);
            await new Promise((r) => setTimeout(r, 400));
            for (const [nm, idx] of [['focused', 2], ['selected and focused', 5]]) {
              for (const nudge of [0.3, 0.7]) {
                const at = JSON.parse(await ev(`(async () => { const m = window.__ds.frames.find((f) => f.iframe.title === 'Tabs, all states'); const d = m.iframe.contentDocument; const el = d.querySelectorAll('.pm-row')[0].querySelectorAll('.dsf-state')[${idx}].querySelector('.sdk-tab'); el.scrollIntoView({ block: 'center', behavior: 'instant' });
                  const c = document.getElementById('ds-content'); c.style.marginTop = '${nudge}px'; c.style.marginLeft = '${nudge * 1.7 % 1}px'; window.scrollTo(0, Math.round(window.scrollY) + ${nudge}); await new Promise((r) => setTimeout(r, 150));
                  const cv = document.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true }); g.fillStyle = getComputedStyle(el).outlineColor; g.fillRect(0, 0, 1, 1); const px = g.getImageData(0, 0, 1, 1).data;
                  const b = el.getBoundingClientRect(); const fr = m.iframe.getBoundingClientRect(); return JSON.stringify({ x: fr.left + b.left + window.scrollX, y: fr.top + b.top + window.scrollY, w: b.width, h: b.height, col: 'rgb(' + px[0] + ',' + px[1] + ',' + px[2] + ')' }); })()`));
                const pad = 6;
                const shot = await cdp.send('Page.captureScreenshot', { format: 'png', clip: { x: at.x - pad, y: at.y - pad, width: at.w + pad * 2, height: at.h + pad * 2, scale: 1 } }, sessionId);
                const e = edgeColours(Buffer.from(shot.data, 'base64'), at.col.match(/[\d.]+/g).map(Number), dsf, pad, at.w, at.h);
                const vals = Object.values(e);
                if (Math.max(...vals) - Math.min(...vals) > 40) problems.push(`${where}: the ${nm} tab outline is not the same on all four sides at ${dsf}x with the page ${nudge}px off the pixel grid (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
                if (Math.max(...vals) > 60) problems.push(`${where}: a side of the ${nm} tab outline never reaches its full colour at ${dsf}x (top ${e.top}, bottom ${e.bottom}, left ${e.left}, right ${e.right})`);
              }
            }
            await ev(`(() => { const c = document.getElementById('ds-content'); c.style.marginTop = ''; c.style.marginLeft = ''; })()`);
          }
          await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
          await new Promise((r) => setTimeout(r, 300));
        }
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
      { const cp = JSON.parse(await ev(`(${colourProbe.toString()})().then((r) => JSON.stringify(r))`)); for (const x of cp.problems) problems.push(`${where}: Colour: ${x}`); }
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
    // The date field: the calendar button sits INSIDE the field's box (one field), at the trailing edge, 30px or less, with the same inset above, below and right;
    // the field keeps its height and the text never runs under the button.
    { const dEl = cell(4, 3).querySelector('input'); const dBtn = cell(4, 3).querySelector('.sdk-field-btn');
      if (!dBtn) bad(`${title}: the date field has no .sdk-field-btn`);
      else { const f = dEl.getBoundingClientRect(); const q = dBtn.getBoundingClientRect(); const grp = dEl.parentElement.getBoundingClientRect();
        if (q.left < f.left - 0.5 || q.right > f.right + 0.5 || q.top < f.top - 0.5 || q.bottom > f.bottom + 0.5) bad(`${title}: the calendar button is not inside the date field's box`);
        if (q.width > 30.6 || q.height > 30.6) bad(`${title}: the calendar button is ${q.width} by ${q.height}px, over 30`);
        const t = q.top - f.top; const b2 = f.bottom - q.bottom; const r2 = f.right - q.right;
        if (Math.abs(t - b2) > 0.6 || Math.abs(t - r2) > 0.6) bad(`${title}: the calendar button's inset is not equal (top ${t}, bottom ${b2}, right ${r2})`);
        if (Math.abs(grp.height - want) > 0.6 || Math.abs(f.height - want) > 0.6) bad(`${title}: the date field is ${f.height}px in a ${grp.height}px group, expected ${want}`);
        const padR = parseFloat(cs(dEl).paddingRight); if (f.right - padR > q.left + 0.5) bad(`${title}: the date text can run under the calendar button (padding-right ${padR}px, the button starts ${(f.right - q.left).toFixed(1)}px from the right edge)`);
        const hit = want === 44 && d.defaultView.innerWidth <= 640 ? 44 : 0; if (hit) { const a = cs(dBtn, '::after'); const hw = q.width + 14; const hh = q.height + 14; if (a.content === 'none' || Math.abs(parseFloat(a.width) - hw) > 1 || Math.abs(parseFloat(a.height) - hh) > 1) bad(`${title}: the calendar button has no 44px target on a phone (${a.width} by ${a.height})`); } } }
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

// The Tabs and view switches family, measured in the page (runs in the browser): heights, the selected fill, no coloured edge, the focus, the
// overflow (the selected tab kept in view, with a press and with the keyboard), icons only when narrow, the hit area on a phone, the aliases.
const tabsProbe = async () => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^Tabs/.test(t) && !/contrast/.test(t));
  const RADII = /^(3px|5px|7px|11px|999px)$/;
  const tok = (d, n, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = n; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const selTok = (d) => tok(d, 'var(--selected-bg)', 'backgroundColor');
  const mixTok = (d) => tok(d, 'color-mix(in srgb, var(--accent) 55%, var(--text))');
  const stripOk = (s, t, nm) => { const a = s.getBoundingClientRect(); const b = t.getBoundingClientRect(); if (b.left < a.left - 0.5 || b.right > a.right + 0.5) bad(`${nm}: the selected tab ${t.textContent.trim()} is not fully in view (tab ${b.left.toFixed(0)}..${b.right.toFixed(0)}, strip ${a.left.toFixed(0)}..${a.right.toFixed(0)})`); };
  const inWidthSelector = (d) => d.defaultView.innerWidth;
  if (TITLES.length < 12) bad(`the Tabs family has only ${TITLES.length} frames`);
  // Every tab of every frame: a 1px transparent edge in every state, a token radius, no outline at rest, no underline, weight 500 (4.. except the bar's nav type).
  for (const t of TITLES) {
    const d = get(t); if (!d) { bad(`no frame ${t}`); continue; }
    for (const el of d.querySelectorAll('.sdk-tabs > :is(.sdk-tab, .tb-tab, .subtab, .setup-tab, .core-link), .tb-tabs > .tb-tab, .subtabs > .subtab, .setup-tabs > .setup-tab, .layout-tabs > .core-link')) {
      const cs = getComputedStyle(el); const nm = `${t}: ${el.textContent.trim() || el.getAttribute('aria-label')}`;
      for (const side of ['Top', 'Right', 'Bottom', 'Left']) { if (cs['border' + side + 'Color'] !== 'rgba(0, 0, 0, 0)' || (cs['border' + side + 'Width'] !== '1px' && t !== 'Tabs, anatomy sample')) bad(`${nm}: the ${side.toLowerCase()} edge is ${cs['border' + side + 'Width']} ${cs['border' + side + 'Color']}, not a 1px transparent edge`); }
      for (const c of ['TopLeft', 'TopRight', 'BottomLeft', 'BottomRight']) if (!RADII.test(cs['border' + c + 'Radius'])) bad(`${nm}: a corner is ${cs['border' + c + 'Radius']}, not a radius token`);
      if (!el.classList.contains('ds-force-focus') && cs.outlineStyle !== 'none') bad(`${nm}: an outline at rest (${cs.outlineStyle})`);
      if (cs.textDecorationLine !== 'none') bad(`${nm}: underlined`);
      if (cs.boxShadow !== 'none') bad(`${nm}: a shadow (${cs.boxShadow})`);
    }
  }
  // Heights: default 38 (44 on a phone), small 30, an icon-only tab square.
  { const d = get('Tabs, all states'); const dd = get('Tabs, all states, small'); const phone = d.defaultView.innerWidth <= 640; const want = phone ? 44 : 38;
    for (const el of d.querySelectorAll('.sdk-tab')) { const r = el.getBoundingClientRect(); if (Math.abs(r.height - want) > 0.6) bad(`a default tab is ${r.height}px, expected ${want}`); if (el.classList.contains('sdk-tab-icon') && Math.abs(r.width - want) > 0.6) bad(`an icon-only default tab is ${r.width} wide, expected ${want}`); }
    for (const el of dd.querySelectorAll('.sdk-tab')) { const r = el.getBoundingClientRect(); if (Math.abs(r.height - 30) > 0.6) bad(`a small tab is ${r.height}px, expected 30`); if (el.classList.contains('sdk-tab-icon') && Math.abs(r.width - 30) > 0.6) bad(`an icon-only small tab is ${r.width} wide, expected 30`); }
    // States, in both grids.
    for (const [dx, nm] of [[d, 'default'], [dd, 'small']]) {
      const rows = [...dx.querySelectorAll('.pm-row')]; const cell = (r, s) => rows[r].querySelectorAll('.dsf-state')[s].querySelector('.sdk-tab'); const cs = (x) => getComputedStyle(x);
      const [rest, hov, foc, sel, selHov, selFoc, dis] = [0, 1, 2, 3, 4, 5, 6].map((s) => cell(0, s));
      if (cs(rest).backgroundColor !== 'rgba(0, 0, 0, 0)') bad(`${nm}: a tab at rest has a fill (${cs(rest).backgroundColor})`);
      if (cs(hov).backgroundColor === cs(rest).backgroundColor) bad(`${nm}: the forced hover does not change the fill`);
      if (!/^2px solid/.test(`${cs(foc).outlineWidth} ${cs(foc).outlineStyle}`) || cs(foc).outlineOffset !== '-2px') bad(`${nm}: the focus is not a 2px outline at offset -2px (${cs(foc).outlineWidth} ${cs(foc).outlineStyle} ${cs(foc).outlineOffset})`);
      if (cs(foc).outlineColor !== tok(dx, 'var(--accent)')) bad(`${nm}: the focus outline is not --accent (${cs(foc).outlineColor})`);
      if (cs(sel).backgroundColor !== selTok(dx)) bad(`${nm}: the selected fill is ${cs(sel).backgroundColor}, not --selected-bg (${selTok(dx)})`);
      if (cs(sel).color !== mixTok(dx)) bad(`${nm}: the selected text is ${cs(sel).color}, not the accent mix (${mixTok(dx)})`);
      if (cs(selHov).backgroundColor === cs(sel).backgroundColor) bad(`${nm}: the forced selected hover does not change the fill`);
      if (cs(selFoc).outlineStyle !== 'solid' || cs(selFoc).outlineWidth !== '2px') bad(`${nm}: the selected focus shows no 2px outline`);
      if (cs(dis).opacity !== '0.5') bad(`${nm}: disabled is not half strength (${cs(dis).opacity})`);
      if (cs(sel).fontWeight !== cs(rest).fontWeight) bad(`${nm}: the weight changes when selected (${cs(rest).fontWeight} to ${cs(sel).fontWeight})`);
      // A selected tab is the same box as a rest tab.
      const a = rest.getBoundingClientRect(); const b = sel.getBoundingClientRect(); if (Math.abs(a.height - b.height) > 0.1) bad(`${nm}: a selected tab is not the height of a tab at rest`);
      // Icon-only count and dot: clear of the tab's top and right edges (3px or more, equal), inside the box, icon still centred, tab size unchanged.
      for (const [r, kind] of [[5, '.sdk-tab-badge'], [6, '.sdk-tab-dot']]) for (let s = 0; s < 7; s += 1) {
        const tb = cell(r, s); const mk = tb.querySelector(kind); const g = tb.querySelector('.sdk-tab-glyph'); if (!mk || !g) { bad(`${nm}: icon-only ${kind} row, state ${s}: missing`); continue; }
        const T = tb.getBoundingClientRect(); const M = mk.getBoundingClientRect(); const G = g.getBoundingClientRect();
        const top = M.top - T.top; const right = T.right - M.right;
        if (top < 2.95 || right < 2.95) bad(`${nm}: the icon-only ${kind} is ${top.toFixed(1)}px from the top and ${right.toFixed(1)}px from the right edge, under 3px (state ${s})`);
        if (Math.abs(top - right) > 0.6 && kind === '.sdk-tab-badge') bad(`${nm}: the icon-only count insets differ (top ${top}, right ${right})`);
        if (M.bottom > T.bottom - 2.95 || M.left < T.left) bad(`${nm}: the icon-only ${kind} is not inside the tab (state ${s})`);
        if (Math.abs((G.left + G.right) / 2 - (T.left + T.right) / 2) > 0.6) bad(`${nm}: an icon-only tab's icon is off the middle (state ${s})`);
        if (Math.abs(T.width - T.height) > 0.6) bad(`${nm}: an icon-only tab with a ${kind} is not square (${T.width} by ${T.height})`);
      }
      // Count and dot.
      const badge = rows[3].querySelector('.sdk-tab-badge'); if (!badge || Math.abs(badge.getBoundingClientRect().height - 18) > 0.6) bad(`${nm}: the count is not an 18px pill`);
      const dot = rows[4].querySelector('.sdk-tab-dot'); if (!dot || Math.abs(dot.getBoundingClientRect().width - 7) > 0.6 || Math.abs(dot.getBoundingClientRect().height - 7) > 0.6) bad(`${nm}: the dot is not 7px`);
    }
  }
  // Aliases: today's markup takes the look. Heights: view switch and the bar's tabs small, a page's folder tabs and Set up's tabs default.
  { const d = get('Tabs, aliases'); const want = d.defaultView.innerWidth <= 640 ? 44 : 38; const cs = (x) => getComputedStyle(x);
    const sets = [['.tb-tabs:not(.tb-tabs-compact) .tb-tab', 30], ['.tb-tabs-compact .tb-tab', 30], ['.subtabs .subtab', want], ['.setup-tabs .setup-tab', want], ['.layout-tabs .core-link', 30]];
    for (const [sel, h] of sets) { const els = d.querySelectorAll(sel); if (!els.length) bad(`aliases: nothing for ${sel}`); for (const el of els) if (Math.abs(el.getBoundingClientRect().height - h) > 0.6) bad(`aliases: ${sel} is ${el.getBoundingClientRect().height}px, expected ${h}`); }
    for (const sel of ['.tb-tab.on', '.subtab.active', '.setup-tab[aria-selected="true"]', '.core-link[aria-current="page"]']) { const el = d.querySelector(sel); if (!el) { bad(`aliases: no ${sel}`); continue; } if (cs(el).backgroundColor !== selTok(d)) bad(`aliases: ${sel} is not the --selected-bg fill (${cs(el).backgroundColor})`); if (cs(el).color !== mixTok(d) && !/layout-tabs/.test(sel) && !/core-link/.test(sel)) bad(`aliases: ${sel} text is not the accent mix (${cs(el).color})`); }
    const tabsEl = d.querySelector('.tb-tabs'); const kids = [...tabsEl.children]; const gap = kids[1].getBoundingClientRect().left - kids[0].getBoundingClientRect().right; if (Math.abs(gap - 2) > 0.6) bad(`aliases: the view switch tabs are ${gap}px apart, expected 2`);
    const sb = d.querySelector('.subtabs'); const gk = [...sb.children]; const g2 = gk[1].getBoundingClientRect().left - gk[0].getBoundingClientRect().right; if (Math.abs(g2 - 6) > 0.6) bad(`aliases: the strip tabs are ${g2}px apart, expected 6`);
    if (cs(sb).borderBottomWidth !== '0px') bad('aliases: the old folder-tab rule under .subtabs is still drawn');
  }
  // Overflow: the strip scrolls, hides its scrollbar and keeps the selected tab in view, by a press and by the keyboard.
  for (const [title, idx] of [['Tabs, strip that overflows', 0], ['Tabs, strip that overflows', 1], ['Tabs, strip that overflows', 2], ['Tabs at 390', 0]]) {
    const d = get(title); const strips = [...d.querySelectorAll('.sdk-tabs[data-demo]')]; const s = strips[idx]; if (!s) { bad(`${title}: no strip ${idx}`); continue; }
    const nm = `${title}, strip ${idx + 1}`; await wait(100);
    if (s.scrollWidth <= s.clientWidth + 1) { bad(`${nm}: does not overflow, so it cannot be tested (${s.scrollWidth} in ${s.clientWidth})`); continue; }
    if (getComputedStyle(s).scrollbarWidth !== 'none') bad(`${nm}: the scrollbar is not hidden`);
    if (!/^(auto|scroll)$/.test(getComputedStyle(s).overflowX)) bad(`${nm}: does not scroll sideways`);
    const tabsEls = [...s.querySelectorAll(':scope > .sdk-tab')];
    if (idx < 2 || title === 'Tabs at 390') { /* the selected tab starts deep in the list */ }
    stripOk(s, s.querySelector(':scope > .sdk-tab[aria-selected="true"], :scope > .sdk-tab[aria-current="page"]'), `${nm} at the start`);
    if (!(s.scrollLeft > 0)) bad(`${nm}: the selected tab is deep in the list but the strip did not scroll (scrollLeft ${s.scrollLeft})`);
    tabsEls[0].click(); await wait(120); stripOk(s, tabsEls[0], `${nm} after the first tab is pressed`);
    if (!tabsEls[0].matches('[aria-selected="true"], [aria-current="page"]')) bad(`${nm}: pressing the first tab does not select it`);
    tabsEls[tabsEls.length - 1].click(); await wait(120); stripOk(s, tabsEls[tabsEls.length - 1], `${nm} after the last tab is pressed`);
    if (!(s.scrollLeft > 0)) bad(`${nm}: after the last tab is pressed the strip is still at the start`);
    if (s.getAttribute('role') === 'tablist') {
      tabsEls[0].click(); await wait(80); tabsEls[0].focus();
      for (let i = 0; i < tabsEls.length - 1; i += 1) { d.activeElement.dispatchEvent(new d.defaultView.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true })); await wait(20); }
      await wait(120); if (d.activeElement !== tabsEls[tabsEls.length - 1]) bad(`${nm}: the arrow keys do not reach the last tab (focus is on ${d.activeElement.textContent.trim()})`); stripOk(s, tabsEls[tabsEls.length - 1], `${nm} after the arrow keys`);
      d.activeElement.dispatchEvent(new d.defaultView.KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true })); await wait(120); stripOk(s, tabsEls[0], `${nm} after Home`);
      const stops = tabsEls.filter((x) => x.tabIndex === 0).length; if (stops !== 1) bad(`${nm}: a tab list has ${stops} tab stops, expected 1`);
    }
    // Restore a deep selection for the screenshots.
    tabsEls[tabsEls.length > 10 ? 10 : tabsEls.length - 1].click(); await wait(120);
  }
  // The edge fade: only on the side that has more.
  { const d = get('Tabs, strip that overflows'); const s = d.querySelectorAll('.sdk-tabs[data-demo]')[1]; const f = s.getAttribute('data-fade') || ''; if (!/\bstart\b/.test(f)) bad(`the faded strip has no fade at its start while scrolled (data-fade="${f}")`); s.scrollLeft = s.scrollWidth; await wait(120); const f2 = s.getAttribute('data-fade') || ''; if (/\bend\b/.test(f2)) bad(`the faded strip still fades its end at the end (data-fade="${f2}")`); s.scrollLeft = 0; await wait(120); const f3 = s.getAttribute('data-fade') || ''; if (/\bstart\b/.test(f3) || !/\bend\b/.test(f3)) bad(`the faded strip at its start should fade its end only (data-fade="${f3}")`); const t = s.querySelector('[aria-selected="true"]'); t.click(); await wait(120); }
  // The joined switch: 2px gaps, icons only when narrow with the word as title and name; words when wide.
  for (const w of [390, 700, 1280]) {
    const d = get(`Tabs at ${w}`); if (!d) { bad(`no frame Tabs at ${w}`); continue; } await wait(150);
    const boxes = [...d.querySelectorAll('[data-fit-box]')]; const g0 = boxes[0].querySelector('.sdk-tabs-joined'); const compact = g0.classList.contains('sdk-tabs-compact');
    const words = [...g0.querySelectorAll('.sdk-tab-word')]; const hidden = words.every((x) => getComputedStyle(x).display === 'none'); const shown = words.every((x) => getComputedStyle(x).display !== 'none');
    if (w === 390 && !(compact && hidden)) bad(`Tabs at 390: the switch did not drop to icons only (compact ${compact}, words hidden ${hidden})`);
    if (w === 1280 && !(!compact && shown)) bad(`Tabs at 1280: the switch dropped to icons although it fits (compact ${compact})`);
    if (compact) for (const b of g0.querySelectorAll('.sdk-tab')) { const nm = b.querySelector('.sdk-tab-word').textContent.trim(); if (b.getAttribute('aria-label') !== nm || b.title !== nm) bad(`Tabs at ${w}: an icon-only tab has no word as its title and name (${b.getAttribute('aria-label')}, ${b.title})`); }
    if (box0Overflow(boxes[0])) bad(`Tabs at ${w}: the toolbar overflows even with icons only`);
    // Heights line up: 38 beside default buttons and the search; 30 in the dense toolbar.
    const want = w <= 640 ? 44 : 38; const r = (x) => x.getBoundingClientRect().height;
    for (const x of [boxes[0].querySelector('.btn'), boxes[0].querySelector('.sdk-search input'), ...boxes[0].querySelectorAll('.sdk-tab')]) if (Math.abs(r(x) - want) > 0.6) bad(`Tabs at ${w}: the 38px toolbar has a ${r(x)}px item (${x.className}), expected ${want}`);
    for (const x of [boxes[1].querySelector('.btn'), ...boxes[1].querySelectorAll('.sdk-tab')]) if (Math.abs(r(x) - 30) > 0.6) bad(`Tabs at ${w}: the 30px toolbar has a ${r(x)}px item (${x.className}), expected 30`);
    const kids = [...g0.children]; const gap = kids[1].getBoundingClientRect().left - kids[0].getBoundingClientRect().right; if (Math.abs(gap - 2) > 0.6) bad(`Tabs at ${w}: the joined tabs are ${gap}px apart, expected 2`);
  }
  function box0Overflow(b) { return b.scrollWidth > b.clientWidth + 1; }
  // A phone: default 44; small keeps 30 with a 44px hit area (the strip is 44px high and the tab's ::after is 44px).
  { const d = get('Tabs, on a phone'); const strips = [...d.querySelectorAll('.sdk-tabs')]; const [def, small] = strips; const cs = (x, p) => getComputedStyle(x, p);
    if (d.defaultView.innerWidth > 640) bad('the phone frame is wider than a phone');
    if (Math.abs(def.querySelector('.sdk-tab').getBoundingClientRect().height - 44) > 0.6) bad('a default tab on a phone is not 44px');
    const t = small.querySelector('.sdk-tab'); if (Math.abs(t.getBoundingClientRect().height - 30) > 0.6) bad('a small tab on a phone does not keep its 30px look');
    if (Math.abs(small.getBoundingClientRect().height - 44) > 0.6) bad(`a small strip on a phone is ${small.getBoundingClientRect().height}px high, expected 44`);
    const a = cs(t, '::after'); if (a.content === 'none' || Math.abs(parseFloat(a.height) - 44) > 1) bad(`a small tab on a phone has no 44px hit area (${a.content}, ${a.height})`);
    const hit = d.elementFromPoint(t.getBoundingClientRect().left + 10, t.getBoundingClientRect().top - 5); if (!hit || hit.closest('.sdk-tab') !== t) bad('a press 5px above a small tab on a phone does not reach it');
  }
  // The top bar fold: a "..." button after the shown tabs, the Workspace and the shown tab kept.
  { const d = get('Tabs, top bar fold'); const bars = [...d.querySelectorAll('.pm-hdr')]; if (bars.length !== 3) bad('the fold frame does not show three bars'); else {
      const more = bars.map((b) => !!b.querySelector('.sdk-more')); if (more.join() !== 'false,true,true') bad(`the fold frame shows the "..." in ${more.join()}`);
      const last = bars[2]; if (!last.querySelector('[aria-current="page"]') || !/Workspace/.test(last.querySelector('.sdk-tab').textContent)) bad('the tightest bar lost Workspace or the tab shown');
      const m = last.querySelector('.sdk-more'); if (Math.abs(m.getBoundingClientRect().height - 30) > 0.6) bad('the "..." is not 30px'); } }
  // The page: the family is Proposed, dated, and the two not-yet-decided families are named.
  const doc = document; const blk = doc.getElementById('tabs');
  if (!blk || !blk.querySelector('.ds-st-approved') || blk.querySelector('.ds-st-proposed')) bad('the Tabs family is not marked Approved');
  if (!blk || !/Decided 2026-10-18/.test(blk.textContent)) bad('the Tabs family has no Decided 2026-10-18 note');
  if (doc.getElementById('u-tabs-view-switches-and-segmented-rows')) bad('Tabs and view switches is still listed as Not yet decided');
  for (const id of ['u-chips-that-filter', 'u-phone-bottom-bar-icon-over-label']) if (!doc.getElementById(id)) bad(`${id} is not listed as Not yet decided`);
  if (!/Chips that filter/.test(blk ? blk.textContent : '') || !/bottom bar/.test(blk ? blk.textContent : '')) bad('the Tabs family does not note the two families that are not part of it');
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
