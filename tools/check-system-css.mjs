#!/usr/bin/env node
/*
 * check-system-css.mjs -- the design system's shared stylesheet, public/sdk/system.css (plan-design-system.md, migration plan, steps 2 and 10).
 *
 * Step 2 adds the file with tokens, colour roles and font faces ONLY: nothing in the product reads them, so loading it changes no
 * pixel. This check holds that:
 *   1. The file parses (balanced braces, every declaration ends) and holds no raw colour: no hex, and the only rgb()/rgba() are the
 *      approved shadow and scrim defaults. Mixes use the keywords black, white and transparent.
 *   2. The approved tokens equal the approved values: spacing, type scale, weights, leading, tracking, shadows, scrim, layers,
 *      motion, icon sizes, breakpoints (and the three widths written out in the file's comment) and the layout tokens.
 *   3. Every approved colour role exists, and none of the tokens it defines collides with a token defined anywhere else.
 *   4. Browser (Chromium over its DevTools protocol, as tools/check-design-system.mjs does; skipped, said so, when there is none):
 *      with the real style.css, the real /theme.css rules of the three shipped themes in light and dark, and system.css, every colour
 *      role resolves to a computed colour, and each role that has an equivalent today resolves to the very value that token has.
 *   5. Fonts: the faces exist, are not applied (no font-family in the product reads --font-ui or --font-display yet), and a normal page
 *      load requests no font file. The font files and their licences are served.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import net from 'node:net';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const problems = [];
const fail = (m) => problems.push(m);

const raw = read('public/sdk/system.css');
const css = raw.replace(/\/\*[\s\S]*?\*\//g, '');

// ---- 1. parses, no raw colour ----
{
  let depth = 0;
  for (const ch of css) { if (ch === '{') depth += 1; if (ch === '}') depth -= 1; if (depth < 0) break; }
  if (depth !== 0) fail('system.css: unbalanced braces');
  if (/#[0-9a-fA-F]{3,8}\b/.test(css.replace(/url\([^)]*\)/g, ''))) fail(`system.css: a hex colour (${css.match(/#[0-9a-fA-F]{3,8}\b/)[0]}); colours come from the tokens`);
  if (/\b(hsla?|hwb|lab|lch|oklab|oklch)\(/i.test(css)) fail('system.css: a colour function other than color-mix and the approved rgba defaults');
  const rgbas = [...css.matchAll(/rgba?\([^)]*\)/g)].map((m) => m[0].replace(/\s+/g, ''));
  const approved = new Set(['rgba(0,0,0,0.35)', 'rgba(0,0,0,0.55)']); // the three shadows (dark, 2026-10-21) and the scrim
  for (const r of rgbas) if (!approved.has(r)) fail(`system.css: ${r} is not an approved palette default`);
  const named = css.replace(/@font-face[^}]*\}/g, '').match(/:\s*(red|green|blue|gray|grey|orange|yellow|purple|pink|brown|cyan|magenta|navy|teal|gold)\b/gi);
  if (named) fail(`system.css: a named colour (${named[0]})`);
  // No rule other than :root, the light-mode block, the phone block and the font faces: no element or component rules.
  const heads = [...css.matchAll(/(^|\})(\s*)([^{}\s@][^{}]*)\{/g)].map((m) => m[3].trim());
  for (const h of heads) {
    if (!/^:root(\[data-theme-mode="light"\],\s*:root\[data-mode-shown="light"\]:not\(\[data-theme-mode="dark"\]\))?$/.test(h) && h !== ':root') fail(`system.css: a rule outside :root: "${h}"`);
  }
}

// ---- the declarations of :root ----
const defs = new Map(); // name -> [values]
for (const m of css.replace(/@font-face\s*\{[^}]*\}/g, '').matchAll(/(--[a-z0-9-]+)\s*:\s*([^;{}]+);/g)) {
  if (!defs.has(m[1])) defs.set(m[1], []);
  defs.get(m[1]).push(m[2].trim().replace(/\s+/g, ' '));
}
const first = (n) => (defs.get(n) || [])[0];

// ---- 2. the approved values ----
const APPROVED = {
  '--space-0': '2px', '--space-1': '4px', '--space-2': '8px', '--space-3': '12px', '--space-4': '16px', '--space-5': '20px', '--space-6': '24px', '--space-7': '32px', '--space-8': '40px', '--space-9': '48px',
  '--text-9': '9px', '--text-11': '11px', '--text-12': '12px', '--text-13': '13px', '--text-14': '14px', '--text-16': '16px', '--text-18': '18px', '--text-22': '22px', '--text-28': '28px', '--text-40': '40px',
  '--weight-regular': '400', '--weight-medium': '500', '--weight-strong': '600',
  '--leading-body': '1.45', '--leading-ui': '1', '--leading-display': '1.15', '--leading-title': '1.2', '--leading-section': '1.25',
  '--tracking-tight': '-0.01em', '--tracking-normal': '0', '--tracking-caps': '0.06em',
  '--shadow-1': '0 1px 4px rgba(0, 0, 0, 0.35)', '--shadow-2': '0 2px 8px rgba(0, 0, 0, 0.35)', '--shadow-3': '0 4px 16px rgba(0, 0, 0, 0.35)', '--scrim': 'rgba(0, 0, 0, 0.55)',
  '--z-content': '0', '--z-bar': '20', '--z-window': '25', '--z-float': 'var(--z-window)', '--z-page': '30', '--z-dialog': '40', '--z-popover': '50', '--z-toast': '60', '--z-debug': '100',
  '--motion-fast': '120ms', '--motion-base': '200ms', '--ease-out': 'cubic-bezier(0.2, 0, 0, 1)',
  '--icon-12': 'var(--text-12)', '--icon-14': 'var(--text-14)', '--icon-16': 'var(--text-16)', '--icon-20': '20px', '--icon-24': '24px',
  '--bp-narrow': '640px', '--bp-medium': '900px', '--bp-wide': '1200px',
  '--topbar-h': '44px', '--page-pad': '16px', '--measure-reading': '720px', '--page-max': '1200px', '--module-head-h': '34px', '--status-h': '24px', '--bottom-bar-h': '54px',
  '--bottom-bar-total': 'calc(var(--bottom-bar-h) + var(--safe-bottom))',
  '--font-system': '-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif',
  '--font-ui': '"Figtree", "Figtree Fallback", var(--font-system)',
  '--font-display': '"Fraunces", "Fraunces Fallback", "Figtree", "Figtree Fallback", var(--font-system)',
};
for (const [n, v] of Object.entries(APPROVED)) if (first(n) !== v) fail(`${n}: expected "${v}", found "${first(n) ?? 'nothing'}"`);
// z-menu (26), toolbar-h (34px) and the radii are kept where they are.
for (const n of ['--z-menu', '--toolbar-h', '--radius-min', '--radius-small', '--radius-medium', '--radius-large', '--radius-round']) if (defs.has(n)) fail(`${n} is defined elsewhere (style.css) and must not be redefined in system.css`);
// Breakpoints: the three widths are written out in the header comment, and every max-width query in the file is one of them.
if (!/BREAKPOINTS: 640 900 1200/.test(raw)) fail('system.css: the header comment must list "BREAKPOINTS: 640 900 1200"');
for (const m of css.matchAll(/@media[^{]*\((?:max|min)-width:\s*(\d+)px\)/g)) if (![640, 900, 1200].includes(Number(m[1]))) fail(`system.css: a media query at ${m[1]}px is not one of 640, 900, 1200`);
// The light-mode shadows are the text colour at 8, 10 and 10 percent.
const lightShadow = (n) => (defs.get(n) || [])[1];
if (lightShadow('--shadow-1') !== '0 1px 4px color-mix(in srgb, var(--text) 8%, transparent)') fail('--shadow-1 light value changed');
if (lightShadow('--shadow-2') !== '0 2px 8px color-mix(in srgb, var(--text) 10%, transparent)') fail('--shadow-2 light value changed');
if (lightShadow('--shadow-3') !== '0 4px 16px color-mix(in srgb, var(--text) 10%, transparent)') fail('--shadow-3 light value changed');

// ---- 3. the colour roles ----
const ROLES = [
  'surface-page', 'surface-panel', 'surface-card', 'surface-field', 'surface-menu', 'surface-popover', 'surface-toast', 'surface-tooltip', 'surface-chat-message', 'surface-chat-own',
  'surface-titlebar', 'surface-toolbar', 'surface-bar-top', 'surface-bar-nav', 'surface-bar-brand', 'surface-bar-right', 'surface-canvas', 'surface-track',
  'text-primary', 'text-muted', 'text-disabled', 'text-bar', 'text-on-accent', 'text-accent', 'text-link', 'text-selected', 'text-tooltip', 'icon-default', 'icon-bar',
  'edge-hairline', 'edge-field', 'edge-bar', 'edge-menu', 'scrollbar-thumb',
  'accent-fill', 'accent-fill-hover', 'fill-hover', 'fill-selected', 'fill-today', 'fill-secondary', 'fill-secondary-hover', 'focus-ring', 'overlay-scrim', 'shadow-color',
  ...['danger', 'ok', 'warn', 'info'].flatMap((k) => ['fill', 'text', 'tint', 'on-fill'].map((p) => `status-${k}-${p}`)),
];
for (const r of ROLES) if (!defs.has(`--${r}`)) fail(`colour role --${r} is missing`);
// What each role equals today: the token (or expression) the product draws for that job. Roles not listed are new-only (they take the
// proposed formula) or are compared against a mix written the same way.
const TODAY = {
  'surface-page': 'var(--bg)', 'surface-panel': 'var(--bg-section)', 'surface-card': 'var(--bg-card)', 'surface-field': 'var(--bg-input)', 'surface-menu': 'var(--bg-card)',
  'surface-popover': 'var(--bg-card)', 'surface-toast': 'var(--bg-section)', 'surface-chat-message': 'color-mix(in srgb, var(--text) 5%, transparent)',
  'surface-chat-own': 'color-mix(in srgb, var(--accent) 10%, transparent)', 'surface-titlebar': 'var(--bg-section)', 'surface-toolbar': 'var(--shade)',
  'surface-bar-top': 'var(--nav-primary-bg)', 'surface-bar-nav': 'var(--nav-secondary-bg)', 'surface-bar-brand': 'var(--nav-brand-bg)', 'surface-bar-right': 'var(--nav-right-bg)',
  'surface-canvas': 'var(--bg)', 'surface-track': 'var(--bg-section)',
  'text-primary': 'var(--text)', 'text-muted': 'var(--text-dim)', 'text-bar': 'var(--header-text)', 'text-on-accent': 'var(--on-accent)', 'text-accent': 'var(--accent)',
  'text-link': 'var(--accent)', 'text-selected': 'var(--text)', 'icon-default': 'var(--icon, var(--text-dim))', 'icon-bar': 'var(--icon, var(--header-text))',
  'edge-hairline': 'var(--border)', 'edge-field': 'var(--border)', 'edge-bar': 'var(--border)', 'edge-menu': 'var(--border)', 'scrollbar-thumb': 'var(--border)',
  'accent-fill': 'var(--accent)', 'accent-fill-hover': 'var(--accent-hover)', 'fill-hover': 'color-mix(in srgb, var(--accent) 14%, transparent)', 'fill-selected': 'var(--selected-bg)',
  'fill-secondary': 'var(--secondary)', 'fill-secondary-hover': 'var(--secondary-hover)', 'focus-ring': 'var(--accent)',
  'status-danger-fill': 'var(--danger)', 'status-danger-text': 'var(--danger-text)', 'status-danger-on-fill': 'var(--on-danger)',
  'status-ok-fill': 'var(--ok)', 'status-ok-text': 'var(--ok)', 'status-ok-on-fill': 'var(--on-danger)',
  'status-warn-fill': 'var(--tint-gold)', 'status-info-fill': 'var(--tint-blue)',
};
// Collisions: a token system.css defines must not be defined in any other stylesheet or by the theme writer.
{
  const others = new Map();
  const note = (n, where) => { if (!others.has(n)) others.set(n, where); };
  const files = ['public/style.css', 'public/sdk/host.css', 'public/landing.css', 'public/destination.css', 'public/diag.css'];
  for (const dir of ['modules']) {
    const walk = (d) => { for (const e of fs.readdirSync(path.join(root, d), { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) { if (e.name !== 'node_modules') walk(p); } else if (/\.(css|html)$/.test(e.name) && !p.includes(`${path.sep}design${path.sep}`)) files.push(p); } };
    walk(dir);
  }
  for (const f of files) for (const m of read(f).replace(/\/\*[\s\S]*?\*\//g, '').matchAll(/(--[a-z0-9-]+)\s*:/g)) note(m[1], f);
  for (const m of read('server/theme-css.js').matchAll(/'(--[a-z0-9-]+)'/g)) note(m[1], 'server/theme-css.js');
  for (const n of defs.keys()) if (others.has(n)) fail(`${n} is defined in system.css and in ${others.get(n)}`);
  // Every var(--x) system.css reads is defined: in itself or in today's stylesheets/theme (the old tokens it is written in terms of).
  const known = new Set([...defs.keys(), ...others.keys()]);
  const optionalToday = new Set(['--icon']); // read with a fallback
  for (const m of css.matchAll(/var\((--[a-z0-9-]+)/g)) if (!known.has(m[1]) && !optionalToday.has(m[1])) fail(`system.css reads ${m[1]}, which is defined nowhere`);
}

// ---- fonts: files and faces ----
for (const f of ['figtree/latin.woff2', 'figtree/latin-ext.woff2', 'figtree/OFL.txt', 'fraunces/latin.woff2', 'fraunces/OFL.txt']) {
  if (!fs.existsSync(path.join(root, 'public/fonts', f))) fail(`public/fonts/${f} is missing`);
}
for (const m of raw.matchAll(/url\((\/fonts\/[^)]+)\)/g)) if (!fs.existsSync(path.join(root, 'public', m[1]))) fail(`system.css points at ${m[1]}, which is not in public/`);
const faces = [...css.matchAll(/@font-face\s*\{([^}]*)\}/g)].map((m) => m[1]);
if (faces.length !== 6) fail(`expected 6 @font-face rules (Figtree 2, its fallback 2, Fraunces 1, its fallback 1), found ${faces.length}`);
for (const f of faces) {
  if (/url\(/.test(f) && !/font-display:\s*swap/.test(f)) fail('a bundled @font-face without font-display: swap');
  if (!/ascent-override/.test(f) || !/descent-override/.test(f)) fail('an @font-face without its metric overrides');
}
if (!/size-adjust:\s*100\.59%/.test(css) || !/size-adjust:\s*95\.67%/.test(css) || !/size-adjust:\s*111\.60%/.test(css)) fail('a fallback face lost its size-adjust (100.59%, 95.67%, 111.60%)');
// Not applied: nothing in the product's stylesheets or scripts reads --font-ui or --font-display, or names the faces.
{
  const scan = ['public/style.css', 'public/sdk/host.css', 'public/landing.css', 'public/destination.css', 'public/sdk/host.js'];
  for (const f of scan) if (/var\(--font-(ui|display)|"?Figtree|"?Fraunces/.test(read(f))) fail(`${f} applies the new fonts; this step only defines them`);
}

// ---- 4 and 5. the browser ----
function findBrowser() {
  const cands = [process.env.CHROME_PATH];
  const pw = path.join(os.homedir(), '.cache', 'ms-playwright');
  if (fs.existsSync(pw)) for (const d of fs.readdirSync(pw).sort().reverse()) cands.push(path.join(pw, d, 'chrome-linux', 'chrome'), path.join(pw, d, 'chrome-linux', 'headless_shell'), path.join(pw, d, 'chrome-win', 'chrome.exe'), path.join(pw, d, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'));
  cands.push('/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome');
  return cands.find((c) => c && fs.existsSync(c)) || null;
}
class Cdp {
  constructor(ws) { this.ws = ws; this.id = 0; this.pending = new Map(); this.handlers = []; ws.addEventListener('message', (e) => { const m = JSON.parse(e.data); if (m.id && this.pending.has(m.id)) { const { res, rej } = this.pending.get(m.id); this.pending.delete(m.id); m.error ? rej(new Error(m.error.message)) : res(m.result); } else if (m.method) for (const h of this.handlers) h(m); }); }
  send(method, params = {}, sessionId) { const id = ++this.id; this.ws.send(JSON.stringify({ id, method, params, sessionId })); return new Promise((res, rej) => { this.pending.set(id, { res, rej }); setTimeout(() => { if (this.pending.has(id)) { this.pending.delete(id); rej(new Error('timeout: ' + method)); } }, 30000); }); }
}
async function launch(bin) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'sysc-chrome-'));
  const child = spawn(bin, ['--headless=new', '--no-sandbox', '--disable-gpu', '--hide-scrollbars', '--no-first-run', '--remote-debugging-port=0', `--user-data-dir=${dir}`, 'about:blank'], { stdio: ['ignore', 'ignore', 'pipe'] });
  const url = await new Promise((resolve, reject) => {
    let buf = ''; const t = setTimeout(() => reject(new Error('the browser did not start: ' + buf.slice(-300))), 20000);
    child.stderr.on('data', (d) => { buf += d; const m = /DevTools listening on (ws:\/\/\S+)/.exec(buf); if (m) { clearTimeout(t); resolve(m[1]); } });
    child.on('exit', (c) => { clearTimeout(t); reject(new Error('the browser exited (' + c + ')')); });
  });
  const ws = new WebSocket(url);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', () => rej(new Error('cannot reach the browser'))); });
  return { cdp: new Cdp(ws), child, dir };
}
function freePort() { return new Promise((res, rej) => { const s = net.createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => res(p)); }); s.on('error', rej); }); }
async function startServer() {
  const port = await freePort();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'sysc-data-'));
  const child = spawn(process.execPath, ['server/index.js'], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, PORT: String(port), DATA_DIR: dataDir, LIVEKIT_API_KEY: 'devkey', LIVEKIT_API_SECRET: 'devsecretdevsecret', ADMIN_PASSWORD: 'testpass1234', BASE_DOMAIN: '' } });
  let log = ''; child.stdout.on('data', (d) => { log += d; }); child.stderr.on('data', (d) => { log += d; });
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i += 1) {
    try { const r = await fetch(base + '/healthz'); if (r.ok) return { base, child, dataDir }; } catch { /* not up yet */ }
    if (child.exitCode !== null) break;
    await new Promise((r) => setTimeout(r, 200));
  }
  child.kill();
  throw new Error('the throwaway server did not start: ' + log.slice(-300));
}

let note = '';
if (!problems.length) {
  const bin = findBrowser();
  if (!bin) note = ' (browser part SKIPPED: no Chromium found; set CHROME_PATH. This is not a pass)';
  else {
    const { themeCss } = require('../server/theme-css.js');
    const { Store } = require('../server/store.js');
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sysc-store-'));
    const store = new Store(tmp);
    const themes = [{ name: 'Strong Coffee', ...store.defaultTheme }, ...store.themes];
    fs.rmSync(tmp, { recursive: true, force: true });
    if (themes.length < 3) fail(`expected the three shipped themes, found ${themes.length}`);
    const server = await startServer();
    const { cdp, child, dir } = await launch(bin);
    try {
      const { targetId } = await cdp.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await cdp.send('Target.attachToTarget', { targetId, flatten: true });
      await cdp.send('Page.enable', {}, sessionId); await cdp.send('Network.enable', {}, sessionId);
      const requests = [];
      const statuses = new Map();
      cdp.handlers.push((m) => {
        if (m.sessionId !== sessionId) return;
        if (m.method === 'Network.requestWillBeSent') requests.push(m.params.request.url);
        if (m.method === 'Network.responseReceived') statuses.set(m.params.response.url, m.params.response.status);
      });
      const ev = async (expression) => { const r = await cdp.send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId); if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text); return r.result.value; };
      // A normal page load: the sign-in page links style.css, theme.css and system.css.
      await cdp.send('Page.navigate', { url: `${server.base}/login` }, sessionId);
      for (let i = 0; i < 100 && !(await ev("document.readyState === 'complete'").catch(() => false)); i += 1) await new Promise((r) => setTimeout(r, 100));
      await new Promise((r) => setTimeout(r, 800));
      if (!requests.some((u) => u.endsWith('/sdk/system.css'))) fail('the sign-in page did not request /sdk/system.css');
      else if (statuses.get(`${server.base}/sdk/system.css`) !== 200) fail('/sdk/system.css was not served (200)');
      const fontReqs = requests.filter((u) => /\/fonts\/|\.woff2?(\?|$)/.test(u) && !/\/fa\/webfonts\//.test(u));
      if (fontReqs.length) fail(`a normal page load requested a bundled font file: ${fontReqs.join(', ')}`);
      const faceInfo = await ev(`JSON.stringify([...document.fonts].map((f) => [f.family.replace(/"/g, ''), f.status]).filter((x) => /Figtree|Fraunces/.test(x[0])))`);
      const loaded = JSON.parse(faceInfo);
      if (loaded.length < 6 && loaded.length !== 0) fail(`the page registered ${loaded.length} of 6 faces`);
      if (loaded.some((x) => x[1] !== 'unloaded')) fail(`a bundled face is loading or loaded on a normal page: ${faceInfo}`);
      // The files are served.
      for (const f of ['figtree/latin.woff2', 'figtree/latin-ext.woff2', 'figtree/OFL.txt', 'fraunces/latin.woff2', 'fraunces/OFL.txt']) {
        const r = await fetch(`${server.base}/fonts/${f}`); if (!r.ok) fail(`/fonts/${f} is not served (${r.status})`);
      }
      // The colour roles, in every shipped theme and both modes.
      const probe = `(${function probe(roles, today, themeRules) {
        const out = [];
        const style = document.createElement('style'); document.head.appendChild(style);
        const outer = document.createElement('div'); outer.style.color = 'rgb(1, 2, 3)'; // a role that does not resolve inherits this
        const inner = document.createElement('div'); outer.appendChild(inner); document.body.appendChild(outer);
        const colour = (expr) => { inner.style.color = ''; inner.style.cssText = `color: ${expr}`; return getComputedStyle(inner).color; };
        for (const [theme, rules] of themeRules) {
          for (const mode of ['light', 'dark']) {
            style.textContent = rules; document.documentElement.setAttribute('data-theme-mode', mode);
            for (const r of roles) {
              const got = colour(`var(--${r})`);
              if (got === 'rgb(1, 2, 3)' || !/^(rgb|color)/.test(got)) out.push(`${theme} ${mode}: --${r} does not resolve (${got})`);
              if (today[r]) { const want = colour(today[r]); if (got !== want) out.push(`${theme} ${mode}: --${r} is ${got}, today's ${today[r]} is ${want}`); }
            }
          }
        }
        style.remove(); outer.remove(); document.documentElement.removeAttribute('data-theme-mode');
        return out;
      }})`;
      const themeRules = themes.map((t) => [t.name, themeCss({ light: t.light, dark: t.dark }, 'dark')]);
      const bad = await ev(`JSON.stringify(${probe}(${JSON.stringify(ROLES.map((r) => r))}, ${JSON.stringify(TODAY)}, ${JSON.stringify(themeRules)}))`);
      for (const b of JSON.parse(bad)) fail(b);
    } finally {
      try { cdp.ws.close(); } catch { /* closing */ }
      const gone = (c) => (c.exitCode !== null ? Promise.resolve() : new Promise((r) => { c.once('exit', r); setTimeout(r, 3000); }));
      child.kill(); server.child.kill();
      await Promise.all([gone(child), gone(server.child)]);
      for (const d of [dir, server.dataDir]) { try { fs.rmSync(d, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } catch { /* a temp folder left behind is harmless */ } }
    }
  }
}

if (problems.length) {
  console.error(`check-system-css: ${problems.length} problem${problems.length === 1 ? '' : 's'}`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`check-system-css: ok (${defs.size} tokens, ${ROLES.length} colour roles, ${faces.length} font faces, no font requested on load)${note}`);
process.exit(0);
