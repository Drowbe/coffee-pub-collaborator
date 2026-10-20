#!/usr/bin/env node
/*
 * check-design-system.mjs -- the design system page (public/design-system/, documentation/plans/plan-design-system.md, first look).
 * The shared runner. Each family of the Proposed page is checked by its own file, tools/check-design-system-<id>.mjs, named in
 * tools/check-design-system-families.json (in the order they run in the browser); a family in public/design-system/proposed-families.json with
 * no check file, or the reverse, fails. A family file exports id, todayOnly (classes of Today's markup it draws as they are), and any of
 * staticChecks(ctx) (files and rules) and browserChecks(b) (in the page, at each width and mode; b has ev, cdp, sessionId, sc, where, problems,
 * inkCentre and edgeColours, the measuring helpers kept here) and ownRules (its stylesheet is not under .ds-proposed and checks itself).
 * Adding a family: README.md in public/design-system/.
 *
 * Two pages are checked, each served by the app and as a snapshot folder opened from disk: Today (index.html, the inventory) and Proposed
 * (proposed.html, only what is decided; it must not load sources.js, the components or ds.js, and Today must not load any proposed-* file).
 *
 * Fails on: a missing file; the snapshot script not producing an index.html in a temp folder for either page, an external script in it, or a size over
 * 12 MB, or a proposed snapshot without proposed.css, proposed.js, proposed-families.json or a file that manifest names; a stylesheet of the proposal
 * (proposed.css and each family's) with a rule that is not under .ds-proposed, a colour on a border, a radius that is not a token, a font url that is
 * not a bundled woff2, or a class used by the proposal's scripts that its stylesheets do not define; a page that logs a console error, does not finish
 * drawing, or draws nothing at 1280 (light and dark) and 390 in headless Chromium (opened from the app, and the snapshot opened from disk); on the
 * proposed page also what each family file lists: see the header of that file (Buttons, Fields and forms, Typography, Tabs and view switches, Colour).
 * Warns (never fails) on: a class in an example that is in none of the stylesheets of that example's context, and a sources.js older than the module stylesheets.
 * Browser: CHROME_PATH, else a Playwright or system Chromium; with none, the browser part says SKIPPED (not a pass).
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
import { buildSnapshot, buildSources, proposedManifest } from './design-system-snapshot.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DS = path.join(root, 'public', 'design-system');
const failures = [];
const warnings = [];
const fail = (m) => failures.push(m);

// ---- the families: the page's manifest, and the check file of each (tools/check-design-system-families.json) ----
const manifestText = fs.readFileSync(path.join(DS, 'proposed-families.json'), 'utf8');
const manifest = proposedManifest();
const checkIds = JSON.parse(fs.readFileSync(path.join(root, 'tools', 'check-design-system-families.json'), 'utf8')).families;
for (const f of manifest.families) if (!checkIds.includes(f.id)) fail(`the family ${f.id} (proposed-families.json) has no check: add it to tools/check-design-system-families.json and write tools/check-design-system-${f.id}.mjs`);
for (const id of checkIds) if (!manifest.families.some((f) => f.id === id)) fail(`tools/check-design-system-families.json names ${id}, which proposed-families.json does not`);
const checks = [];
for (const id of checkIds) {
  const file = path.join(root, 'tools', `check-design-system-${id}.mjs`);
  if (!fs.existsSync(file)) { fail(`tools/check-design-system-${id}.mjs is missing`); continue; }
  const mod = await import(pathToFileURL(file).href);
  if (mod.id !== id) fail(`tools/check-design-system-${id}.mjs exports id ${JSON.stringify(mod.id)}, not ${id}`);
  checks.push(mod);
}

// ---- files ----
for (const f of ['index.html', 'proposed.html', 'ds.css', 'ds.js', 'components.js', 'components-2.js', 'components-3.js', 'proposed.js', 'proposed.css', 'proposed-families.json', 'sources.js', ...manifest.families.flatMap((f) => [f.js, f.css].filter(Boolean))]) {
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
  for (const need of ['index.html', 'style.css', 'theme.css', 'ds.css', 'proposed.css', 'proposed.js', 'proposed-families.json', 'fa/css/all.min.css', ...manifest.families.flatMap((f) => [f.js, f.css].filter(Boolean))]) if (!names.has(need)) fail(`the proposed snapshot has no ${need}`);
  const sh = fs.readFileSync(path.join(outP, 'index.html'), 'utf8');
  if (!sh.includes('DS_PROPOSED_MANIFEST')) fail('the proposed snapshot does not carry the manifest in index.html (a file on disk cannot read proposed-families.json)');
  const ph = fs.readFileSync(path.join(DS, 'proposed.html'), 'utf8');
  if (/sources\.js|components|ds\.js/.test(ph.replace(/<!--[\s\S]*?-->/g, ''))) fail('proposed.html loads something of Today (sources.js, components, ds.js)');
  if (!/href="index\.html"/.test(ph)) fail('proposed.html has no link to index.html');
  const th = fs.readFileSync(path.join(DS, 'index.html'), 'utf8');
  if (/proposed(-[a-z0-9-]+)?\.(js|css|json)\b/.test(th)) fail('index.html loads the proposal (a proposed.* or proposed-* file)');
  if (!/href="proposed\.html"/.test(th)) fail('index.html has no link to proposed.html');
  if (/data-view|ds-view/.test(th)) fail('index.html still has the Today and Proposed switch');
  if (snap.files.some((f) => /^proposed[.-]/.test(f.file))) fail('the today snapshot holds a proposed.* or proposed-* file');
}

// ---- the proposal's stylesheets: the shared proposed.css and each family's. Scoped, tokens only, every proposed class defined ----
{
  const split = (t) => { const parts = []; let d = 0; let cur = ''; for (const ch of t) { if (ch === '(' || ch === '[') d += 1; if (ch === ')' || ch === ']') d -= 1; if (ch === ',' && d === 0) { parts.push(cur.trim()); cur = ''; } else cur += ch; } if (cur.trim()) parts.push(cur.trim()); return parts; };
  const names = new Set(snapP.files.map((f) => f.file));
  const todayHtml = fs.readFileSync(path.join(DS, 'index.html'), 'utf8');
  const strip = (t) => t.replace(/\/\*[\s\S]*?\*\//g, '');
  const mods = new Map(checks.map((m) => [m.id, m]));
  // Every stylesheet and script of the proposal: the shared pair, then each family's (a family that checks its own rules, as Colour does, is left out of the shared rules).
  const sheets = [{ file: 'proposed.css', text: fs.readFileSync(path.join(DS, 'proposed.css'), 'utf8'), id: null }];
  const scripts = [{ file: 'proposed.js', text: fs.readFileSync(path.join(DS, 'proposed.js'), 'utf8') }];
  for (const f of manifest.families) {
    if (mods.get(f.id)?.ownRules) continue;
    if (f.css) sheets.push({ file: f.css, text: fs.readFileSync(path.join(DS, f.css), 'utf8'), id: f.id });
    if (f.js) scripts.push({ file: f.js, text: fs.readFileSync(path.join(DS, f.js), 'utf8') });
  }
  // Classes defined by any family's stylesheet, including the ones that check their own rules (States, Colour): every frame carries all of them, so a family may use another's (the Tables loading bars use the States skeleton).
  const defined = new Set();
  const allSheets = sheets.concat(manifest.families.filter((f) => f.css && mods.get(f.id)?.ownRules).map((f) => ({ text: fs.readFileSync(path.join(DS, f.css), 'utf8') })));
  for (const s of allSheets) for (const x of strip(s.text).matchAll(/\.([A-Za-z][\w-]*)/g)) defined.add(x[1]);
  for (const s of sheets) {
    const css = strip(s.text);
    // Fonts: a url is a bundled woff2 under fonts/, in the proposed snapshot, with its licence; nothing is fetched from outside.
    const urls = [...css.matchAll(/url\(\s*["']?([^)"']+)/g)].map((m) => m[1]);
    for (const u of urls) {
      if (!/^fonts\/[a-z0-9-]+\/[a-z0-9-]+\.woff2$/.test(u)) fail(`${s.file}: a font url that is not a bundled woff2 under fonts/: ${u}`);
      else if (!names.has(u)) fail(`the proposed snapshot has no ${u}`);
    }
    for (const d of new Set(urls.map((u) => u.split('/')[1]))) if (!names.has(`fonts/${d}/OFL.txt`)) fail(`fonts/${d} has no licence file (OFL.txt) in the proposed snapshot`);
    if (/@import|https?:\/\//.test(css)) fail(`${s.file} fetches something from outside (@import or an http address)`);
    for (const m of css.matchAll(/([^{}]+)\{/g)) {
      const sel = m[1].trim();
      if (!sel || sel.startsWith('@')) continue;
      for (const part of split(sel)) if (!/^\.ds-proposed\b/.test(part)) fail(`${s.file}: a rule not under .ds-proposed: ${part.slice(0, 80)}`);
    }
    for (const m of css.matchAll(/(border(?:-[a-z]+)*)\s*:\s*([^;}]+)/g)) {
      const name = m[1]; const v = m[2].trim();
      if (/radius/.test(name)) { if (!/^var\(--radius-(min|small|medium|large|round)\)$/.test(v)) fail(`${s.file}: ${name}: ${v} is not a radius token`); continue; }
      if (/(#[0-9a-f]{3,8}\b|rgb|hsl|color-mix|--accent|--danger|--ok|--tint)/i.test(v)) {
        // A field's focus and error are states that colour the whole edge (Thomas, 2026-10-17); a side of an edge (a strip) is never allowed.
        const before = css.slice(0, m.index); const sel = before.slice(Math.max(before.lastIndexOf('}'), 0), before.lastIndexOf('{'));
        if (name === 'border-color' && /(:focus|aria-invalid)/.test(sel)) continue;
        fail(`${s.file}: a coloured border: ${name}: ${v}`);
      }
    }
    if (/\b(box-shadow|outline)\s*:[^;]*(var\(--(accent|danger)|color-mix)/i.test(css.replace(/outline:\s*2px solid (var\(--(accent|danger)\)|color-mix\(in srgb, var\(--accent\) 55%, var\(--t-ink\)\))( !important)?/g, ''))) fail(`${s.file}: a ring or shadow in a colour (only the focus ring is allowed)`);
  }
  // Every class a script of the proposal uses is defined by a stylesheet of it (or is Today's own markup, a Font Awesome or page-frame class, or an example-page .pm- class).
  const own = new Set();
  for (const s of scripts) for (const m of s.text.matchAll(/\.(pm-[\w-]+)/g)) own.add(m[1]);
  const NOT_MINE = /^(fa-|pm-|dsf|ds-(?!proposed$)|nav-text)/;
  // Classes of Today's markup that a family draws as it is and does not style: each family file lists its own (todayOnly).
  const TODAY_ONLY = new Set(checks.flatMap((m) => m.todayOnly || []));
  for (const s of scripts) {
    const used = new Set();
    for (const m of s.text.matchAll(/class="([^"]*)"/g)) for (const c of m[1].replace(/\$\{[^}]*\}/g, ' ').split(/\s+/).filter(Boolean)) used.add(c);
    for (const m of s.text.matchAll(/\bcls: '([^']*)'/g)) for (const c of m[1].split(/\s+/).filter(Boolean)) used.add(c);
    for (const c of [...used].filter((c) => !NOT_MINE.test(c) && !defined.has(c))) if (!TODAY_ONLY.has(c) && !own.has(c)) fail(`${s.file} uses .${c} and the proposed stylesheets do not define it`);
  }
  // Each family's own checks of its files.
  for (const f of manifest.families) {
    const m = mods.get(f.id);
    for (const k of ['js', 'css']) {
      if (!f[k]) continue;
      if (!names.has(f[k])) fail(`the proposed snapshot has no ${f[k]}`);
      if (todayHtml.includes(f[k])) fail(`index.html (Today) loads ${f[k]}`);
    }
    if (!m || !m.staticChecks) continue;
    m.staticChecks({ DS, root, fail, snap, snapP, snapNames: names, todayHtml, manifestText, entry: f, css: f.css ? strip(fs.readFileSync(path.join(DS, f.css), 'utf8')) : '', js: f.js ? fs.readFileSync(path.join(DS, f.js), 'utf8') : '', defined });
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

// Development: DS_ONLY=buttons,typography runs only those families' browser checks, on the served Proposed page only, at the scenarios in
// DS_SCENARIO (for example 390:light,1280:dark; default all four). Not for the real check: a run with DS_ONLY says so and fails.
const ONLY = process.env.DS_ONLY ? process.env.DS_ONLY.split(',') : null;
async function browse(cdp, label, url, scenarios, shots) {
  const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
  const problems = [];
  cdp.handlers.push((m) => {
    if (m.sessionId !== sessionId) return;
    if (m.method === 'Runtime.exceptionThrown') problems.push('exception: ' + (m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text));
    if (m.method === 'Runtime.consoleAPICalled' && m.params.type === 'error') problems.push('console.error: ' + m.params.args.map((a) => a.value || a.description).join(' '));
    if (m.method === 'Page.frameNavigated' && !m.params.frame.parentId && m.params.frame.url !== lastNav) problems.push(`the page navigated itself to ${m.params.frame.url.slice(0, 120)}`);
    if (m.method === 'Inspector.targetCrashed') problems.push(`${m.method} ${new Date().toISOString()}`);
    if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') problems.push('log: ' + m.params.entry.text + ' ' + (m.params.entry.url || ''));
  });
  await cdp.send('Inspector.enable', {}, sessionId); await cdp.send('Runtime.enable', {}, sessionId); await cdp.send('Log.enable', {}, sessionId); await cdp.send('Page.enable', {}, sessionId);
  const ev = async (expression) => (await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)).result.value;
  let last = null;
  let lastNav = null;
  for (const sc of scenarios) {
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: sc.width, height: 900, deviceScaleFactor: 1, mobile: sc.width < 500 }, sessionId);
    lastNav = `${url}${url.includes('?') ? '&' : '?'}mode=${sc.mode}`;
    await cdp.send('Page.navigate', { url: lastNav }, sessionId);
    let ok = false;
    for (let i = 0; i < 400; i += 1) { await new Promise((r) => setTimeout(r, 150)); if (await ev('!!(window.__dsStats && window.__dsStats.ready)')) { ok = true; break; } }
    const where = `${label} ${sc.width} ${sc.mode}`;
    if (!ok) { problems.push(`${where}: the page did not finish drawing`); continue; }
    // The Proposed page draws a family when it is opened or scrolled near; the checks measure every family, so draw them all first.
    if (sc.proposed) {
      if (await ev("typeof window.DS_PROPOSED.renderAll") !== 'function') problems.push(`${where}: the page has no window.DS_PROPOSED.renderAll`);
      else { const t0 = Date.now(); await ev('window.DS_PROPOSED.renderAll().then(() => true)'); if (process.env.DS_TIMING) console.log(`check-design-system: ${where} renderAll ${Date.now() - t0}ms`); }
    }
    await new Promise((r) => setTimeout(r, 500));
    last = await ev('JSON.stringify({ ...window.__dsStats, errors: window.__dsStats.errors.slice(0, 5) })');
    const s = JSON.parse(last);
    if (s.errors.length) problems.push(`${where}: page errors: ${s.errors.join('; ')}`);
    if (s.loaded !== s.frames) problems.push(`${where}: ${s.loaded} of ${s.frames} example frames loaded`);
    if (sc.proposed) {
      // Only the proposal is on the page, its rules reach its frames, and a forced state really renders.
      if (s.families < 1 || s.undecided < 1) problems.push(`${where}: too little drawn (${s.families} decided, ${s.undecided} still to decide)`);
      const page = JSON.parse(await ev(`JSON.stringify({ today: typeof window.DS_FAMILIES !== 'undefined' || typeof window.DS_SOURCES !== 'undefined', undecidedLinks: document.querySelectorAll('.ds-undecided a').length, drawnAlsoUndecided: (window.DS_PROPOSED.undecided || []).flatMap((g) => g.names).filter((n) => window.DS_PROPOSED.families.some((f) => f.name.toLowerCase() === n.toLowerCase() || f.id === n.toLowerCase())) })`));
      // Each family's own checks, in the order of tools/check-design-system-families.json. They share the page, so each leaves the switches as it found them.
      const b = { ev, cdp, sessionId, sc, where, problems, inkCentre, edgeColours };
      for (const m of checks) {
        if (!m.browserChecks || (ONLY && !ONLY.includes(m.id))) continue;
        const t0 = Date.now();
        try { await m.browserChecks(b); } catch (e) { problems.push(`${where}: the ${m.id} browser check stopped: ${e.message}`); }
        if (process.env.DS_TIMING) console.log(`check-design-system: ${where} ${m.id} ${Date.now() - t0}ms`);
      }
      await ev('document.querySelectorAll("*").forEach((e) => { if (e.scrollTop) e.scrollTop = 0; })');
      if (page.today) problems.push(`${where}: the proposed page loaded Today's inventory (DS_FAMILIES or DS_SOURCES is set)`);
      if (page.drawnAlsoUndecided.length) problems.push(`${where}: named both as a drawn family and as still to decide: ${page.drawnAlsoUndecided.join(', ')}`);
      // Every family is decided (2026-10-21): what is still listed must say it is Today only.
      const notToday = JSON.parse(await ev(`JSON.stringify((window.DS_PROPOSED.undecided || []).flatMap((g) => g.names).filter((n) => !/Today only/.test(n)))`));
      if (notToday.length) problems.push(`${where}: listed as not decided but not marked Today only: ${notToday.join(', ')}`);
      const proposedChips = JSON.parse(await ev(`JSON.stringify(document.querySelectorAll('.ds-st-proposed').length)`));
      if (proposedChips) problems.push(`${where}: ${proposedChips} family status chip(s) still say Proposed`);
      if (page.undecidedLinks) problems.push(`${where}: a not-yet-decided family has a link`);
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
    const sel = process.env.DS_SCENARIO ? process.env.DS_SCENARIO.split(',').map((s) => { const [w, m] = s.split(':'); return P(Number(w), m); }) : [P(1280, 'light'), P(1280, 'dark'), P(390, 'light'), P(390, 'dark')];
    const none = { problems: [], last: null };
    const a = ONLY ? none : await browse(br.cdp, 'served', `${server.base}/design-system/index.html`, scenarios, shots);
    const b = ONLY ? none : await browse(br.cdp, 'snapshot', pathToFileURL(path.join(out, 'index.html')).href, [{ width: 1280, mode: 'light' }, { width: 390, mode: 'dark' }], shots);
    const c = await browse(br.cdp, 'served-proposed', `${server.base}/design-system/proposed.html`, sel, shots);
    const d = ONLY ? none : await browse(br.cdp, 'snapshot-proposed', pathToFileURL(path.join(outP, 'index.html')).href, [P(1280, 'dark'), P(390, 'light')], shots);
    if (ONLY) fail('DS_ONLY is a development switch: this was a partial run, not the check');
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