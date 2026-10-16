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
    if (/(#[0-9a-f]{3,8}\b|rgb|hsl|color-mix|--accent|--danger|--ok|--tint)/i.test(v)) fail(`proposed.css: a coloured border: ${name}: ${v}`);
  }
  if (/\b(box-shadow|outline)\s*:[^;]*(var\(--(accent|danger)|color-mix)/i.test(css.replace(/outline:\s*2px solid var\(--accent\)/g, ''))) fail('proposed.css: a ring or shadow in a colour (only the focus ring is allowed)');
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
  const TODAY_ONLY = new Set(['fbtn', 'fbtn-wrap', 'fbtn-caret', 'glyph', 'off', 'loading', 'dial', 'danger', 'icon-on', 'icon-off', 'icon-loading', 'sdk-form', 'sdk-field', 'sdk-full', 'sdk-label', 'sdk-group']);
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
        const m = get('Buttons, all states'); if (m) { const d = m.iframe.contentDocument; const rows = [...d.querySelectorAll('.pm-row')]; const cs = (x) => getComputedStyle(x);
          const b = [...rows[0].querySelectorAll('button')];
          out.rest = cs(b[0]).backgroundColor; out.hover = cs(b[1]).backgroundColor; out.focus = cs(b[2]).outlineWidth + ' ' + cs(b[2]).outlineStyle; out.pressed = cs(b[3]).backgroundColor; out.disabled = cs(b[4]).opacity; out.h = b[0].getBoundingClientRect().height; out.edge = cs(b[0]).borderTopColor;
          out.small = rows[6].querySelector('button').getBoundingClientRect().height;
          const ic = rows[12].querySelector('button').getBoundingClientRect(); out.iconW = ic.width; out.iconH = ic.height;
          const st = rows[0].querySelector('button[aria-busy]'); out.busy = !!st; out.frameMode = d.documentElement.dataset.themeMode; out.frameBg = cs(d.body).backgroundColor; out.pageMode = document.documentElement.dataset.themeMode; out.count = F.filter((f) => /^Buttons, all states/.test(f.iframe.title)).length; window.__ds.setMode(out.pageMode === 'dark' ? 'light' : 'dark'); await new Promise((r) => setTimeout(r, 500)); out.flipBg = cs(d.body).backgroundColor; out.flipBtn = cs(b[0]).backgroundColor; window.__ds.setMode(out.pageMode); }
        return JSON.stringify(out); })()`));
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
