#!/usr/bin/env node
// The Prototype page's screens (documentation/plans/plan-design-system.md, step 39): whole screens of the product, as the product
// draws them, so a component is judged where it is used. `node tools/prototype-build.mjs` refreshes them.
//
// What it does. It starts the throwaway server of the screenshot tool with its travel seed (tools/shots.mjs bootSeeded,
// tools/shots-seed.mjs: an admin and three members, three trips, chat, Planner objects and markers, Calendar, Research...), opens
// each screen in SCREENS below in headless Chromium at each of its widths, drives it into the state the screen names (a layout, a
// tab, an open dialog) and then keeps the page's real rendered markup: the DOM as it stands, with every shadow root (the bundled
// modules run in the page, in a shadow root each) written as a declarative shadow root and every same-origin frame (the Calendar on
// the Workspace is a page in a frame) written as a file of its own. Nothing is drawn again by hand: the prototype IS the product's
// markup.
//
// What is changed on the way out, and why:
//   - Every script is removed, and every on* attribute: a screen is a picture of a moment, it runs nothing of the product's. A large
//     part that is hidden and not drawn (the other tabs of Manage) is left out.
//   - The link to /theme.css becomes a link to prototype/themes/<theme>.css, one per shipped theme (written here from the themes the
//     seeded server lists, by server/theme-css.js, the same code that writes /theme.css), so the page can switch the theme.
//   - A module's stylesheet in its shadow root (public/sdk/host.css, public/sdk/system.css and the module's own CSS, scoped as
//     public/module-host.js scopes them) is not copied: the shadow root's <style> names its parts, and prototype-frame.js reads
//     the SDK's two stylesheets from the product at load time and the module's own part from prototype/styles/<hash>.txt. So an edit to
//     style.css, system.css or host.css shows on the prototype at the next reload, with no rebuild; the module's own CSS needs one.
//   - Pictures the server makes (avatars, the environment's icon, link previews) are written to prototype/assets/; the product's own
//     files (fonts, icons, stylesheets) stay links to the product, so the screens follow the product's files.
//   - What a script did that markup does not keep is written as data-proto-* attributes for prototype-frame.js to put back: where a
//     list was scrolled to, which dialog was open as a modal (showModal) and which popover was open; the value of each field is
//     written as its value attribute.
//
// Files (all under public/design-system/prototype/, rewritten whole each run; nothing else is touched):
//   screens/<screen>-<width>.htm (and <screen>-<width>-f<n>.htm for a frame inside it), styles/<hash>.txt, themes/<theme>.css,
//   assets/<hash>.<ext>, screens.js (the list the page reads: window.PROTO_SCREENS). The screens are .htm, the module CSS .txt: they are captured output,
//   not source, so the code checks (check-names, check-syntax) do not read them as code; their source is checked where it lives.
//
// Options: --only=<screen id, several with commas> (rebuild those, keep the rest), --list, --keep-server (print the server's
// address and wait, for poking at it). Browser: CHROME_PATH, else a Playwright or system Chromium; with none it says so and exits 1.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { findBrowser, launch, freePort, bootSeeded, stopServer, Tab, sleep, fill } from './shots.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const OUT = path.join(root, 'public', 'design-system', 'prototype');
const args = process.argv.slice(2);
const opt = (name) => { const a = args.find((x) => x.startsWith(`--${name}=`)); return a ? a.slice(name.length + 3) : null; };
const ONLY = opt('only');
const say = (...a) => console.log('prototype:', ...a);
const HEIGHT = 900; // the window's height, as the screenshot tool's
const SETTLE_MS = 2500; // the space page keeps drawing for a while after it is connected

// The Workspace with four modules: the Calendar (a composite, its page in a frame), Maps, Research and the Planner, each docked. At
// 1280 the window holds three columns beside the chat, so the fourth waits as a floating window, as the product does
// (public/snap-grid.js fitDock); at 1600 all four are docked.
const FOUR = { __open: ['dest:calendar', 'maps', 'research', 'travel'], 'dest:calendar': { mode: 'dock' }, maps: { mode: 'dock' }, research: { mode: 'dock' }, travel: { mode: 'dock' } };
const SPACE = { as: 'mia', url: '/#join={trip}', call: true, wait: 'button.sdk-strip-fact', layout: FOUR };

// The screens. id (the file name), name and group (the page's list), note (a line under the screen's name), as (who is signed in:
// admin, mia, sam, lee), url, wait (a selector that must appear), call (the space page with the call's stand-in, tools/shots.mjs),
// layout (what the space remembers, app.canvas.<space>, set before the page loads), widths, steps (as tools/shots-screens.json:
// click, wait, scroll, eval, sleep, key; a selector may cross into a shadow root with " >>> ").
export const SCREENS = [
  { id: 'workspace', name: 'Workspace', group: 'Space', ...SPACE, widths: [1280, 1600, 390],
    note: 'Chat column, Calendar (month), Maps, Research and the Planner. At 1280 the Planner waits as a window (three columns fit); at 1600 all four are docked; at 390 one module and the tab bar.' },
  { id: 'workspace-chat', name: 'Chat on a phone', group: 'Space', ...SPACE, widths: [390], steps: [{ click: '#modules-menu .sdk-tabbar-tab[data-builtin=chat]' }],
    note: 'The Workspace at 390 with the Chat tab chosen.' },
  { id: 'call', name: 'Call beside the chat', group: 'Space', ...SPACE, widths: [1280, 390], steps: [{ click: '#join-call' }, { sleep: 1500 }],
    note: 'A stand-in call (no LiveKit server here): the call docked in the column above the chat, nobody else in it.' },
  { id: 'dialog', name: 'A dialog over the Workspace', group: 'Dialogs', ...SPACE, widths: [1280],
    steps: [{ click: '#modules-toggle' }, { click: 'button.host-menu-item', text: 'Save this layout' }, { wait: 'dialog.layout-sheet[open]' }],
    note: 'Layout menu, Save this layout: the sheet open over the Workspace. (The Layout menu is not on a phone.)' },
  { id: 'confirm', name: 'A confirm', group: 'Dialogs', as: 'admin', url: '/admin#theme', wait: '#theme-select', widths: [1280, 390],
    steps: [{ eval: `(() => { const s = document.getElementById('theme-select'); const o = [...s.options].find((x) => /teal/i.test(x.textContent)); s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); return 1; })()` },
      { click: '#theme-delete' }, { wait: 'dialog[open]' }],
    note: 'Manage, Theme, a theme chosen, Delete this theme: the confirm over the page.' },
  { id: 'planner', name: 'Planner days', group: 'Modules', as: 'mia', url: '/modules/travel?space={trip}', wait: '#module-frame >>> .day-add', widths: [1280, 390],
    steps: [{ scroll: '#module-frame >>> li.row.lane' }],
    note: 'The Planner on its own page: day cards, scrolled to a marker lane.' },
  { id: 'home', name: 'Home', group: 'Pages', as: 'mia', url: '/', wait: '.space-choice', widths: [1280, 390], note: 'The space cards.' },
  { id: 'manage-environment', name: 'Manage, Environment', group: 'Manage', as: 'admin', url: '/admin#general', wait: '#tab-environment:not([hidden])', widths: [1280, 390],
    note: 'Manage tabs and the Environment form.' },
  { id: 'manage-users', name: 'Manage, Users', group: 'Manage', as: 'admin', url: '/admin#users', wait: '#tab-users:not([hidden])', widths: [1280, 390], note: 'A Manage list.' },
];

// ---- the capture, run in the page ----
// Marks what markup does not keep, removes the scripts, writes each same-origin frame as a document of its own and answers
// { docs: [{ url, html }], css: [text] }: docs[0] is the page; a frame's src is __PROTO_FRAME_<n>__ (docs[n]); a shadow root's
// big <style> is emptied and marked data-proto-css="<n>" (css[n]).
const CAPTURE = `(() => {
  const docs = []; const css = [];
  const prep = (doc) => {
    const n = docs.length; docs.push(null);
    const roots = [];
    const all = [];
    const walk = (r) => { for (const e of r.querySelectorAll('*')) { all.push(e); if (e.shadowRoot) { roots.push(e.shadowRoot); walk(e.shadowRoot); } } };
    walk(doc);
    const drop = [];
    const se = doc.scrollingElement;
    for (const e of all) {
      const tag = e.localName;
      if (tag === 'script' || tag === 'noscript' || e.id === 'shots-style') { drop.push(e); continue; }
      if (tag === 'link' && !/(^|\\s)stylesheet(\\s|$)/i.test(e.rel || '')) { drop.push(e); continue; }
      for (const a of [...e.attributes]) if (/^on/i.test(a.name)) e.removeAttribute(a.name);
      if (e !== se && (e.scrollTop || e.scrollLeft)) e.setAttribute('data-proto-scroll', Math.round(e.scrollTop) + ',' + Math.round(e.scrollLeft));
      if (tag === 'input') {
        const t = (e.type || '').toLowerCase();
        if (t === 'checkbox' || t === 'radio') { if (e.checked) e.setAttribute('checked', ''); else e.removeAttribute('checked'); }
        else if (t !== 'file' && t !== 'password') e.setAttribute('value', e.value);
      } else if (tag === 'textarea') e.textContent = e.value;
      else if (tag === 'select') for (const o of e.options) { if (o.selected) o.setAttribute('selected', ''); else o.removeAttribute('selected'); }
      else if (tag === 'dialog' && e.open) { try { if (e.matches(':modal')) e.setAttribute('data-proto-modal', ''); } catch (err) {} }
      else if (tag === 'canvas') { try { const img = doc.createElement('img'); for (const a of e.attributes) img.setAttribute(a.name, a.value); img.src = e.toDataURL(); img.setAttribute('data-proto-canvas', ''); e.replaceWith(img); } catch (err) {} }
      else if (tag === 'iframe') {
        let cd = null; try { cd = e.contentDocument; } catch (err) {}
        if (cd && cd.documentElement && cd.URL && !/^about:/.test(cd.URL)) { const k = prep(cd); e.setAttribute('src', '__PROTO_FRAME_' + k + '__'); }
        else e.removeAttribute('src');
        e.removeAttribute('srcdoc');
      }
      try { if (e.hasAttribute('popover') && e.matches(':popover-open')) e.setAttribute('data-proto-popover', ''); } catch (err) {}
      // The product's own files stay links, written absolute here so the build can tell them apart from the server's pictures.
      for (const a of ['src', 'poster']) if (e.hasAttribute(a) && tag !== 'iframe') { const v = e.getAttribute(a); if (v && !/^(data|blob):/.test(v)) e.setAttribute(a, new URL(v, doc.baseURI).href); }
      if (tag === 'link' || tag === 'image' || tag === 'use') for (const a of ['href', 'xlink:href']) if (e.hasAttribute(a)) { const v = e.getAttribute(a); if (v && !v.startsWith('#') && !/^(data|blob):/.test(v)) e.setAttribute(a, new URL(v, doc.baseURI).href); }
      if (e.hasAttribute('srcset')) e.removeAttribute('srcset');
      const st = e.getAttribute('style');
      if (st && st.includes('url(')) e.setAttribute('style', st.replace(/url\\((['"]?)([^'")]+)\\1\\)/g, (m, q, u) => /^(data|blob):/.test(u) ? m : 'url("' + new URL(u, doc.baseURI).href + '")'));
    }
    for (const r of roots) for (const s of r.querySelectorAll('style')) {
      if (s.textContent.includes('data-shots-hide')) { s.remove(); continue; }
      if (s.textContent.length > 4000) { s.setAttribute('data-proto-css', String(css.push(s.textContent) - 1)); s.textContent = ''; }
    }
    for (const r of roots) if (r.adoptedStyleSheets && r.adoptedStyleSheets.length) {
      const s = doc.createElement('style'); s.textContent = r.adoptedStyleSheets.map((sh) => [...sh.cssRules].map((x) => x.cssText).join('\\n')).join('\\n'); r.prepend(s);
    }
    // What is not drawn and is large (Manage's other tabs) is left out: a screen keeps what can be seen.
    for (const e of all) if (e.isConnected && e.hasAttribute('hidden') && e.localName !== 'template' && getComputedStyle(e).display === 'none' && e.outerHTML.length > 2000) drop.push(e);
    for (const e of drop) e.remove();
    const html = doc.documentElement;
    if (se && (se.scrollTop || se.scrollLeft)) html.setAttribute('data-proto-scroll', Math.round(se.scrollTop) + ',' + Math.round(se.scrollLeft));
    const attrs = [...html.attributes].map((a) => ' ' + a.name + '="' + a.value.replace(/&/g, '&amp;').replace(/"/g, '&quot;') + '"').join('');
    docs[n] = { url: doc.URL, html: '<!DOCTYPE html>\\n<html' + attrs + '>' + html.getHTML({ serializableShadowRoots: true, shadowRoots: roots }) + '</html>\\n' };
    return n;
  };
  prep(document);
  return { docs, css };
})()`;

// public/module-host.js's scopeCss, kept equal to it by tools/check-prototype.mjs.
export const scopeCss = (text) => text.replace(/:root\s*\{[^}]*\}/g, '').replace(/(^|[\s,}])(html|body)(?=[\s,{.:[])/g, '$1:host');

const publicFile = (pathname) => {
  if (!pathname || pathname === '/') return false;
  let p; try { p = decodeURIComponent(pathname); } catch { return false; }
  const abs = path.join(root, 'public', p);
  return abs.startsWith(path.join(root, 'public') + path.sep) && fs.existsSync(abs) && fs.statSync(abs).isFile();
};
// Server paths that are static mounts of the product's own files (server/index.js): kept as links.
const STATIC_MOUNTS = /^\/(fa\/|fonts\/|lib\/)/;

async function themesFrom(server, cookies) {
  const jar = cookies.admin.map((c) => `${c.name}=${c.value}`).join('; ');
  const r = await fetch(server.base + '/api/themes', { headers: { cookie: jar, accept: 'application/json' } });
  if (!r.ok) throw new Error(`/api/themes answered ${r.status}`);
  const j = await r.json();
  const { themeCss } = require('../server/theme-css.js');
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const list = [{ ...j.defaultTheme, builtIn: true }, ...j.themes];
  return list.filter((t) => t && t.light && t.dark).map((t) => ({ id: slug(t.name), name: t.name, css: themeCss({ light: t.light, dark: t.dark }, 'dark') }));
}

async function capture(tab, screen, base, cookies, ctx, size) {
  await tab.open(size, 'dark', screen.call === true);
  const errors = [];
  try {
    for (const c of cookies[screen.as || 'admin'] || []) await tab.cdp.send('Network.setCookie', { name: c.name, value: c.value, url: base, httpOnly: true }, tab.sid);
    if (screen.layout) {
      const key = `app.canvas.${ctx.trip}`;
      await tab.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `try { if (!sessionStorage.getItem('proto.layout')) { localStorage.setItem(${JSON.stringify(key)}, ${JSON.stringify(JSON.stringify(screen.layout))}); sessionStorage.setItem('proto.layout', '1'); } } catch (e) {}` }, tab.sid);
    }
    tab.cdp.listeners.push(tab.errHook = (m) => { if (m.sessionId === tab.sid && m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails?.exception?.description || m.params.exceptionDetails?.text); });
    await tab.cdp.send('Page.navigate', { url: base + fill(screen.url, ctx) }, tab.sid);
    if (screen.wait) await tab.waitFor(fill(screen.wait, ctx));
    await tab.settle();
    if (screen.call) await sleep(SETTLE_MS);
    await tab.forceMode();
    await tab.settle();
    await tab.eval(`(() => { const m = document.getElementById('messages'); if (m) m.scrollTop = m.scrollHeight; })()`).catch(() => {});
    for (const st of screen.steps || []) {
      if (st.click) await tab.click(fill(st.click, ctx), st.text);
      else if (st.wait) await tab.waitFor(fill(st.wait, ctx), st.text);
      else if (st.scroll) await tab.rect(fill(st.scroll, ctx), st.text);
      else if (st.key) await tab.key(st.key);
      else if (st.eval) await tab.eval(fill(st.eval, ctx));
      else if (st.sleep) await sleep(st.sleep);
      await tab.settle();
    }
    await tab.mouse('mouseMoved', 0, 0, { button: 'none', clickCount: 0 });
    await sleep(600);
    await tab.settle();
    const got = await tab.eval(CAPTURE);
    return { ...got, errors };
  } catch (e) {
    if (process.env.PROTO_DEBUG) { try { fs.writeFileSync(path.join(os.tmpdir(), `prototype-${screen.id}-${size}.png`), await tab.shoot(false)); say(`  (a picture of the failure: ${path.join(os.tmpdir(), `prototype-${screen.id}-${size}.png`)}; ${errors.slice(0, 3).join(' | ')})`); } catch { /* none */ } }
    throw e;
  } finally { tab.cdp.listeners = tab.cdp.listeners.filter((f) => f !== tab.errHook); await tab.close(); }
}

// The server's pictures (avatars, the environment's icon, link previews), fetched with the screen's own sign-in and written once each
// to prototype/assets/<hash>.<ext>. Answers the file's address, or null.
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif', 'image/svg+xml': 'svg', 'image/avif': 'avif' };
async function assetFor(url, jar, cache) {
  if (cache.has(url)) return cache.get(url);
  let out = null;
  try {
    const r = await fetch(url, { headers: { cookie: jar } });
    const type = (r.headers.get('content-type') || '').split(';')[0].trim();
    if (r.ok && EXT[type]) {
      const buf = Buffer.from(await r.arrayBuffer());
      const name = `${crypto.createHash('sha256').update(buf).digest('hex').slice(0, 12)}.${EXT[type]}`;
      fs.mkdirSync(path.join(OUT, 'assets'), { recursive: true });
      fs.writeFileSync(path.join(OUT, 'assets', name), buf);
      out = `${PREFIX}assets/${name}`;
    }
  } catch { /* left out */ }
  cache.set(url, out);
  return out;
}

const PREFIX = '/design-system/prototype/';
async function rewrite(html, base, jar, cache, notes) {
  const origin = new URL(base).origin;
  // Every absolute URL of the throwaway server in an attribute or a url(): a product file stays a root-relative link; anything else
  // the server made is written in as data, or dropped.
  const urls = new Set();
  for (const m of html.matchAll(/(?:="|url\(&quot;|url\(")(https?:\/\/[^"&)\s]+)/g)) if (m[1].startsWith(origin)) urls.add(m[1]);
  const map = new Map();
  for (const u of urls) {
    const p = new URL(u);
    if (p.pathname === '/theme.css') continue;
    if (publicFile(p.pathname) || STATIC_MOUNTS.test(p.pathname)) { map.set(u, p.pathname + p.hash); continue; }
    const data = await assetFor(u, jar, cache);
    if (data) map.set(u, data); else { map.set(u, ''); notes.add(`dropped ${p.pathname}`); }
  }
  let out = html;
  for (const [u, to] of [...map.entries()].sort((a, b) => b[0].length - a[0].length)) out = out.split(u).join(to);
  // The live server's content policy is the server's, not the prototype's.
  out = out.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/gi, '');
  // The theme: one of prototype/themes/, chosen by the page.
  out = out.replace(/<link\b[^>]*href="https?:\/\/[^"]*\/theme\.css[^"]*"[^>]*>/g, `<link rel="stylesheet" href="${PREFIX}themes/strong-coffee.css" data-proto-theme="">`);
  return out;
}

async function main() {
  if (args.includes('--list')) { for (const s of SCREENS) console.log(`${s.id.padEnd(22)} ${s.widths.join(', ').padEnd(16)} ${s.name}`); return 0; }
  const bin = findBrowser();
  if (!bin) { say('no Chromium found (set CHROME_PATH, or: npx playwright install chromium). Nothing was built.'); return 1; }
  const screens = SCREENS.filter((s) => !ONLY || ONLY.split(',').includes(s.id));
  if (!screens.length) { say(`--only=${ONLY}: no such screen (--list names them)`); return 1; }
  const started = Date.now();
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'prototype-data-'));
  let server = null; let browser = null;
  const problems = [];
  try {
    const boot = await bootSeeded('travel', dataDir, await freePort());
    server = boot.server;
    const { ctx, cookies } = boot;
    if (args.includes('--keep-server')) { say(`server at ${server.base}, ids ${JSON.stringify(ctx)}; Ctrl-C to stop`); await new Promise(() => {}); }
    browser = await launch(bin);
    // Output: a whole rebuild clears the folder; --only keeps the other screens' files.
    const dirs = { screens: path.join(OUT, 'screens'), styles: path.join(OUT, 'styles'), themes: path.join(OUT, 'themes') };
    if (!ONLY) fs.rmSync(OUT, { recursive: true, force: true });
    for (const d of Object.values(dirs)) fs.mkdirSync(d, { recursive: true });
    const themes = await themesFrom(server, cookies);
    for (const t of themes) fs.writeFileSync(path.join(dirs.themes, `${t.id}.css`), `/* Generated by tools/prototype-build.mjs from the theme "${t.name}" (server/theme-css.js): do not edit. */\n${t.css}`);
    // The SDK's two stylesheets as a module's shadow root carries them, to tell them from the module's own part.
    const sdkPrefix = scopeCss(fs.readFileSync(path.join(root, 'public', 'sdk', 'host.css'), 'utf8')) + '\n' + scopeCss(fs.readFileSync(path.join(root, 'public', 'sdk', 'system.css'), 'utf8')) + '\n';
    const listPath = path.join(OUT, 'screens.js');
    let list = [];
    if (ONLY && fs.existsSync(listPath)) { try { list = JSON.parse(fs.readFileSync(listPath, 'utf8').replace(/^[^=]*=\s*/, '').replace(/;\s*$/, '')).screens || []; } catch { list = []; } }
    const cache = new Map();
    for (const screen of screens) {
      const entry = { id: screen.id, name: screen.name, group: screen.group, note: screen.note || '', url: screen.url, as: screen.as, variants: [] };
      for (const width of screen.widths) {
        const t0 = Date.now();
        let got = null;
        for (let attempt = 1; attempt <= 2 && !got; attempt++) {
          try { got = await capture(new Tab(browser.cdp, ctx), screen, server.base, cookies, ctx, width); } catch (e) { if (attempt === 2) problems.push(`${screen.id} at ${width}: ${e.message}`); }
        }
        if (!got) continue;
        const jar = (cookies[screen.as || 'admin'] || []).map((c) => `${c.name}=${c.value}`).join('; ');
        const notes = new Set();
        const cssFile = (text) => {
          let attr;
          let part = text;
          if (text.startsWith(sdkPrefix)) { part = text.slice(sdkPrefix.length); attr = 'sdk'; }
          const hash = crypto.createHash('sha256').update(part).digest('hex').slice(0, 12);
          fs.writeFileSync(path.join(dirs.styles, `${hash}.txt`), part);
          return attr ? `sdk ${hash}` : hash;
        };
        const base = `${screen.id}-${width}`;
        const names = got.docs.map((d, i) => (i === 0 ? `${base}.htm` : `${base}-f${i}.htm`));
        for (let i = 0; i < got.docs.length; i++) {
          let html = await rewrite(got.docs[i].html, server.base, jar, cache, notes);
          html = html.replace(/__PROTO_FRAME_(\d+)__/g, (_, k) => names[Number(k)]);
          html = html.replace(/data-proto-css="(\d+)"/g, (_, k) => `data-proto-css="${cssFile(got.css[Number(k)])}"`);
          // The prototype's own script, last in the head: it puts back what the markup does not keep and answers the page's switches.
          html = html.replace(/<\/head>/i, `<script src="/design-system/prototype-frame.js"></script></head>`);
          fs.writeFileSync(path.join(dirs.screens, names[i]), html);
        }
        const size = got.docs.reduce((a, d) => a + d.html.length, 0);
        entry.variants.push({ width, height: HEIGHT, file: `screens/${names[0]}`, frames: names.length - 1 });
        say(`${screen.id} at ${width}: ${names.length} file(s), ${Math.round(size / 1024)} KB, ${Math.round((Date.now() - t0) / 1000)} s${got.errors.length ? `; the page logged ${got.errors.length} error(s): ${String(got.errors[0]).split('\n')[0].slice(0, 160)}` : ''}${notes.size ? `; ${[...notes].join(', ')}` : ''}`);
      }
      list = list.filter((s) => s.id !== entry.id);
      list.push(entry);
    }
    list.sort((a, b) => SCREENS.findIndex((s) => s.id === a.id) - SCREENS.findIndex((s) => s.id === b.id));
    const manifest = { generated: 'by tools/prototype-build.mjs', built: new Date().toISOString().slice(0, 10), height: HEIGHT, themes: themes.map((t) => ({ id: t.id, name: t.name })), screens: list };
    fs.writeFileSync(listPath, `/* Generated by tools/prototype-build.mjs: do not edit. The Prototype page's screens. */\nwindow.PROTO_SCREENS = ${JSON.stringify(manifest, null, 1)};\n`);
    // Styles no screen names any more (an --only run leaves the others' alone).
    const used = new Set();
    for (const f of fs.readdirSync(dirs.screens)) for (const m of fs.readFileSync(path.join(dirs.screens, f), 'utf8').matchAll(/data-proto-css="(?:sdk )?([0-9a-f]{12})"/g)) used.add(`${m[1]}.txt`);
    for (const f of fs.readdirSync(dirs.styles)) if (!used.has(f)) fs.rmSync(path.join(dirs.styles, f));
    say(`${list.length} screens in ${path.relative(root, OUT)}, ${Math.round((Date.now() - started) / 1000)} s`);
    for (const p of problems) say(`FAILED ${p}`);
    return problems.length ? 1 : 0;
  } finally {
    try {
      if (browser) { browser.cdp.ws.close(); const done = new Promise((r) => browser.child.once('exit', r)); browser.child.kill(); await Promise.race([done, sleep(5000)]); fs.rmSync(browser.dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); }
    } catch { /* best effort */ }
    await stopServer(server);
    fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().then((c) => process.exit(c), (e) => { console.error('prototype: ERROR ' + (e.stack || e)); process.exit(1); });
