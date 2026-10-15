#!/usr/bin/env node
/*
 * check-design-system.mjs -- the design system page (public/design-system/, documentation/plans/plan-design-system.md, first look).
 *
 * Fails on: a missing file; the snapshot script not producing an index.html in a temp folder, an external script in it, or a size over
 * 12 MB; a page that logs a console error, does not finish drawing, or draws nothing at 1280 (light and dark) and 390 in headless
 * Chromium (opened from the app, and the snapshot opened from disk). Warns (never fails) on: a class in an example that is in none of
 * the stylesheets of that example's context, and a sources.js older than the module stylesheets.
 * Browser: CHROME_PATH, else a Playwright or system Chromium; with none, the browser part says SKIPPED (not a pass).
 * Options: SHOTS=<folder> saves the screenshots.
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import vm from 'node:vm';
import { spawn } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { buildSnapshot, buildSources } from './design-system-snapshot.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DS = path.join(root, 'public', 'design-system');
const failures = [];
const warnings = [];
const fail = (m) => failures.push(m);

// ---- files ----
for (const f of ['index.html', 'ds.css', 'ds.js', 'components.js', 'components-2.js', 'components-3.js', 'sources.js']) {
  if (!fs.existsSync(path.join(DS, f))) fail(`public/design-system/${f} is missing`);
}
if (!fs.existsSync(path.join(root, 'tools', 'design-system-snapshot.mjs'))) fail('tools/design-system-snapshot.mjs is missing');
if (failures.length) { for (const f of failures) console.error('check-design-system: ' + f); process.exit(1); }

// ---- the snapshot, into a temp folder ----
const out = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-snapshot-check-'));
const snap = buildSnapshot(out);
if (!fs.existsSync(path.join(out, 'index.html'))) fail('the snapshot has no index.html');
if (snap.total > 12 * 1024 * 1024) fail(`the snapshot is ${(snap.total / 1024 / 1024).toFixed(1)} MB, over 12 MB`);
const html = fs.readFileSync(path.join(out, 'index.html'), 'utf8');
for (const m of html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
  if (/^(https?:)?\/\//i.test(m[1]) || m[1].startsWith('/')) fail(`the snapshot's index.html loads a script from ${m[1]}`);
}
for (const m of html.matchAll(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)) {
  if (/^(https?:)?\/\//i.test(m[1]) || m[1].startsWith('/')) fail(`the snapshot's index.html links ${m[1]}, not a relative path`);
}
for (const f of snap.files) if (/\.(js|html)$/.test(f.file) && f.file !== 'sources.js') {
  const t = fs.readFileSync(path.join(out, f.file), 'utf8');
  if (/<script\b[^>]*\bsrc\s*=\s*["'](https?:)?\/\//i.test(t)) fail(`${f.file} loads an external script`);
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
  const ev = async (expression) => (await cdp.send('Runtime.evaluate', { expression, returnByValue: true }, sessionId)).result.value;
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
    if (s.families < 20 || s.tokens < 40 || s.icons < 20) problems.push(`${where}: too little drawn (${s.families} families, ${s.tokens} tokens, ${s.icons} icons)`);
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

let browserNote = '';
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
    const a = await browse(br.cdp, 'served', `${server.base}/design-system/index.html`, scenarios, shots);
    const b = await browse(br.cdp, 'snapshot', pathToFileURL(path.join(out, 'index.html')).href, [{ width: 1280, mode: 'light' }, { width: 390, mode: 'dark' }], shots);
    for (const p of [...a.problems, ...b.problems]) fail(p);
    if (a.last) browserNote = `opened from the app and from the snapshot on disk at 1280 (light, dark) and 390: ${a.last.families} families, ${a.last.variants} looks, ${a.last.examples} examples in ${a.last.frames} frames, ${a.last.tokens} tokens, ${a.last.icons} icons, no console error`;
  } catch (e) {
    fail('the browser part could not run: ' + e.message);
  } finally {
    if (br) { try { br.child.kill(); } catch { /* gone */ } }
    if (server) server.child.kill();
  }
}
fs.rmSync(out, { recursive: true, force: true });

for (const w of warnings.slice(0, 40)) console.log('check-design-system: warning: ' + w);
if (warnings.length > 40) console.log(`check-design-system: ... and ${warnings.length - 40} more warnings`);
if (failures.length) { for (const f of failures) console.error('check-design-system: FAIL ' + f); process.exit(1); }
console.log(`check-design-system: ok. ${fams.length} families, ${nVariants} looks, ${nExamples} examples, ${nClasses} classes in markup (${orphanSet.size} warnings); snapshot ${snap.files.length} files, ${(snap.total / 1024 / 1024).toFixed(2)} MB. ${browserNote}`);
