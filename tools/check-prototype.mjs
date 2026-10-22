#!/usr/bin/env node
// Checks the Prototype page (public/design-system/prototype.html, plan-design-system.md step 39).
//
//   node tools/check-prototype.mjs              builds the screens (tools/prototype-build.mjs), then checks them
//   node tools/check-prototype.mjs --no-build   checks the screens as they are in public/design-system/prototype/
//   node tools/check-prototype.mjs --look=<dir> also writes a picture of each screen (1x and 2x, light and dark) to <dir>
//
// The build goes to a folder of its own (--no-build checks public/design-system/prototype/ instead).
// Static: the screens' list names files that exist; no screen runs a script but prototype-frame.js; no address of the throwaway server
// is left; the scoping of a module's stylesheet in prototype-frame.js and tools/prototype-build.mjs is public/module-host.js's.
// In a browser (headless Chromium over the DevTools protocol, the page served from public/ by a small static server here): every screen
// at every width loads in the page with no error in the console and no file missing; switching to Light, and to each theme, changes the
// screen's colours; Measure draws its overlay, with numbers, and the page shows the counts.
// Browser: CHROME_PATH, else a Playwright or system Chromium. With none, the browser part is skipped and said so (not a pass).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { findBrowser, launch, sleep } from './shots.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (name) => { const a = args.find((x) => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : null; };
const LOOK = opt('look');
const DS = path.join(root, 'public', 'design-system');
const BUILD = !args.includes('--no-build');
// Built into a folder of its own (the screens in public/ are left as they are) and served there as /design-system/prototype/.
const OUT = BUILD ? fs.mkdtempSync(path.join(os.tmpdir(), 'check-prototype-')) : path.join(DS, 'prototype');
const problems = [];
const bad = (m) => problems.push(m);
const say = (...a) => console.log('check-prototype:', ...a);

if (BUILD) {
  say(`building the screens (tools/prototype-build.mjs) into ${OUT}`);
  const r = spawnSync(process.execPath, [path.join(root, 'tools', 'prototype-build.mjs'), `--out=${OUT}`], { cwd: root, stdio: 'inherit' });
  if (r.status !== 0) { say('FAIL: the build failed'); process.exit(1); }
}

// ---- static ----
const listFile = path.join(OUT, 'screens.js');
let manifest = null;
try { manifest = JSON.parse(fs.readFileSync(listFile, 'utf8').replace(/^[\s\S]*?window\.PROTO_SCREENS\s*=\s*/, '').replace(/;\s*$/, '')); } catch (e) { bad(`prototype/screens.js cannot be read: ${e.message}`); }
const variants = [];
if (manifest) {
  if (!manifest.screens?.length) bad('prototype/screens.js lists no screens');
  if ((manifest.themes || []).length < 3) bad(`prototype/screens.js lists ${(manifest.themes || []).length} themes; the three shipped themes are expected`);
  for (const t of manifest.themes || []) if (!fs.existsSync(path.join(OUT, 'themes', `${t.id}.css`))) bad(`theme ${t.id}: prototype/themes/${t.id}.css is missing`);
  for (const s of manifest.screens || []) for (const v of s.variants || []) {
    variants.push({ screen: s, v });
    if (!fs.existsSync(path.join(OUT, v.file))) bad(`${s.id} at ${v.width}: ${v.file} is missing`);
  }
}
for (const f of fs.existsSync(path.join(OUT, 'screens')) ? fs.readdirSync(path.join(OUT, 'screens')) : []) {
  const text = fs.readFileSync(path.join(OUT, 'screens', f), 'utf8');
  const scripts = [...text.matchAll(/<script\b[^>]*>/gi)].map((m) => m[0]).filter((t) => t !== '<script src="../../prototype-frame.js">');
  if (scripts.length) bad(`screens/${f}: runs a script that is not prototype-frame.js (${scripts[0]})`);
  if (!text.includes('<script src="../../prototype-frame.js">')) bad(`screens/${f}: does not load prototype-frame.js`);
  if (/https?:\/\/(127\.0\.0\.1|localhost)[:/]/.test(text)) bad(`screens/${f}: an address of the throwaway server is left in it`);
  if (/<[a-z][^<>]*\son[a-z]+="/i.test(text)) bad(`screens/${f}: an on* attribute is left in it`);
  for (const m of text.matchAll(/data-proto-css="(?:sdk )?([0-9a-f]{12})"/g)) if (!fs.existsSync(path.join(OUT, 'styles', `${m[1]}.txt`))) bad(`screens/${f}: styles/${m[1]}.txt is missing`);
}
// The scoping, as each file writes it: from "text.replace(/:root" to the end of that line.
const scopeLine = (file) => { const t = fs.readFileSync(path.join(root, file), 'utf8'); const i = t.indexOf('text.replace(/:root'); return i < 0 ? null : t.slice(i, t.indexOf('\n', i)).trim().replace(/;$/, ''); };
const want = scopeLine('public/module-host.js');
if (!want) bad('public/module-host.js: its scopeCss was not found (this check reads it)');
else for (const f of ['public/design-system/prototype-frame.js', 'tools/prototype-build.mjs']) if (scopeLine(f) !== want) bad(`${f}: its scopeCss is not public/module-host.js's`);

// ---- in a browser ----
const TYPES = { '.html': 'text/html', '.htm': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.txt': 'text/plain', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff', '.ttf': 'font/ttf', '.ico': 'image/x-icon' };
const FA = path.join(root, 'node_modules', '@fortawesome', 'fontawesome-free');
function fileFor(pathname) {
  let p; try { p = decodeURIComponent(pathname); } catch { return null; }
  if (p === '/theme.css') return path.join(OUT, 'themes', 'strong-coffee.css');
  if (p.startsWith('/design-system/prototype/')) { const abs = path.join(OUT, p.slice('/design-system/prototype/'.length)); return abs.startsWith(OUT + path.sep) ? abs : null; }
  if (p.startsWith('/fa/')) return path.join(FA, p.slice(4));
  const abs = path.join(root, 'public', p);
  return abs.startsWith(path.join(root, 'public') + path.sep) ? abs : null;
}
const missing = new Set();
function serve() {
  const srv = http.createServer((req, res) => {
    const u = new URL(req.url, 'http://x');
    const f = fileFor(u.pathname);
    if (!f || !fs.existsSync(f) || !fs.statSync(f).isFile()) { missing.add(u.pathname); res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(f)] || 'application/octet-stream', 'cache-control': 'no-store' });
    fs.createReadStream(f).pipe(res);
  });
  return new Promise((r) => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function browserPart() {
  const bin = findBrowser();
  if (!bin) { say('SKIPPED the browser part: no Chromium (set CHROME_PATH, or: npx playwright install chromium). This is not a pass.'); return; }
  const srv = await serve();
  const base = `http://127.0.0.1:${srv.address().port}`;
  const browser = await launch(bin);
  const { cdp } = browser;
  try {
    const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
    const s = (m, p) => cdp.send(m, p, sessionId);
    const errors = [];
    cdp.listeners.push((m) => {
      if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text);
      else if (m.method === 'Runtime.consoleAPICalled' && (m.params.type === 'error' || m.params.type === 'assert')) errors.push(m.params.args.map((a) => a.value ?? a.description).join(' '));
      else if (m.method === 'Log.entryAdded' && m.params.entry.level === 'error') errors.push(`${m.params.entry.text} ${m.params.entry.url || ''}`);
    });
    await s('Page.enable'); await s('Runtime.enable'); await s('Log.enable');
    const evalIn = async (expr) => { const r = await s('Runtime.evaluate', { expression: `(async () => (${expr}))()`, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
    const until = async (expr, ms = 20000) => { const end = Date.now() + ms; while (Date.now() < end) { if (await evalIn(expr).catch(() => false)) return true; await sleep(100); } return false; };
    const FR = `document.querySelector('#pt-stage iframe')`;
    const ready = `(() => { const f = ${FR}; const d = f && f.contentDocument; if (!d || !d.documentElement.hasAttribute('data-proto-ready')) return false; return [...d.querySelectorAll('iframe[src]')].every((x) => x.contentDocument && x.contentDocument.documentElement.hasAttribute('data-proto-ready')); })()`;
    const colour = `getComputedStyle(${FR}.contentDocument.body).backgroundColor`;
    const looked = [];
    for (const [i, { screen, v }] of variants.entries()) {
      const where = `${screen.id} at ${v.width}`;
      errors.length = 0; missing.clear();
      await s('Emulation.setDeviceMetricsOverride', { width: Math.max(1400, v.width + 320), height: 1100, deviceScaleFactor: 1, mobile: false });
      await s('Page.navigate', { url: `${base}/design-system/prototype.html#${screen.id}?w=${v.width}&mode=dark&theme=strong-coffee` });
      if (!await until(ready)) { bad(`${where}: the screen did not finish loading`); continue; }
      await sleep(300);
      // The screen at its own size, where it is not scaled.
      const size = await evalIn(`(() => { const f = ${FR}; return [f.contentWindow.innerWidth, f.contentWindow.innerHeight]; })()`);
      if (size[0] !== v.width) bad(`${where}: the screen is ${size[0]}px wide in the page, not ${v.width}`);
      const dark = await evalIn(colour);
      await evalIn(`(document.querySelector('#pt-mode button[data-mode=light]').click(), 1)`);
      await sleep(300);
      const light = await evalIn(colour);
      if (light === dark) bad(`${where}: Light did not change the screen's page colour (${dark})`);
      const seen = new Set([light]);
      if (i === 0) for (const t of manifest.themes.slice(1)) {
        await evalIn(`(document.querySelector('#pt-theme button[data-theme="${t.id}"]').click(), 1)`);
        await sleep(300);
        const c = await evalIn(`getComputedStyle(${FR}.contentDocument.documentElement).getPropertyValue('--accent-fill').trim()`);
        if (seen.has(c)) bad(`${where}: the theme ${t.name} did not change the accent (${c})`);
        seen.add(c);
      }
      await evalIn(`(document.querySelector('#pt-measure').click(), 1)`);
      const measured = await until(`(() => { const m = ${FR}.contentWindow.__protoMeasure; return m && m.on && m.labels > 0; })()`, 10000);
      if (!measured) bad(`${where}: Measure drew no labels`);
      else {
        const m = await evalIn(`(() => { const d = ${FR}.contentDocument; const labels = [...d.querySelectorAll('#proto-measure .pm-label')].map((l) => l.textContent); return { n: labels.length, numeric: labels.filter((t) => /^≠?\\d+(\\.\\d)?( · [\\d. ]+)?$/.test(t)).length, status: document.getElementById('pt-status').textContent }; })()`);
        if (!m.n || m.numeric !== m.n) bad(`${where}: ${m.n - m.numeric} of the ${m.n} measure labels are not a height and padding in px`);
        if (!/Measure: \d+ boxes/.test(m.status)) bad(`${where}: the page does not show the measure counts ("${m.status}")`);
      }
      await evalIn(`(document.querySelector('#pt-measure').click(), 1)`);
      for (const e of errors) bad(`${where}: the console says: ${String(e).slice(0, 200)}`);
      for (const p of missing) bad(`${where}: ${p} is missing`);
      if (LOOK) looked.push({ screen, v });
    }
    if (LOOK) {
      // Pictures of the screens themselves (the screen file at its own size), at 1x and 2x, dark and light.
      fs.mkdirSync(LOOK, { recursive: true });
      for (const { screen, v } of looked) for (const scale of [1, 2]) for (const mode of ['dark', 'light']) for (const measure of mode === 'dark' && scale === 1 ? [false, true] : [false]) {
        await s('Emulation.setDeviceMetricsOverride', { width: v.width, height: v.height, deviceScaleFactor: scale, mobile: false });
        await s('Page.navigate', { url: `${base}/design-system/prototype/${v.file}?mode=${mode}&theme=strong-coffee${measure ? '&measure=1' : ''}` });
        await until(`document.documentElement.hasAttribute('data-proto-ready') && [...document.querySelectorAll('iframe[src]')].every((x) => x.contentDocument && x.contentDocument.documentElement.hasAttribute('data-proto-ready'))`);
        await sleep(500);
        const png = Buffer.from((await s('Page.captureScreenshot', { format: 'png' })).data, 'base64');
        fs.writeFileSync(path.join(LOOK, `${screen.id}-${v.width}-${mode}-${scale}x${measure ? '-measure' : ''}.png`), png);
      }
      say(`pictures in ${LOOK}`);
    }
  } finally {
    try { cdp.ws.close(); const done = new Promise((r) => browser.child.once('exit', r)); browser.child.kill(); await Promise.race([done, sleep(5000)]); fs.rmSync(browser.dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* best effort */ }
    srv.close();
  }
}

await browserPart();
if (BUILD) fs.rmSync(OUT, { recursive: true, force: true });
if (problems.length) { for (const p of problems) console.log(`  ${p}`); say(`FAIL (${problems.length})`); process.exit(1); }
say(`ok: ${variants.length} screens and widths load with no console error, follow Light and the ${(manifest?.themes || []).length} themes, and measure`);
process.exit(0);
