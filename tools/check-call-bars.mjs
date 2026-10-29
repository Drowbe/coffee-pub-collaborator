// check-call-bars.mjs: the call's title bar and toolbar lie over the tiles, so showing and hiding them never
// changes a tile's size (measured in the running product: headless Chromium, the screenshot seed, the call's client library
// replaced by tools/shots-livekit-stub.mjs). For 2 and 4 people in the call it pops the call out into a window of its own and records
// every tile's box while the bars are brought up and sent away: a pointer move, the idle wait, the window's blur and focus,
// the keyboard on a toolbar button (focus-within). Every box must be the same in every state, the bars must be out of the
// flow (position absolute or fixed), they must really be shown and hidden, and a mousemove that does not move the pointer
// (what Chromium sends after a layout change under a resting pointer) must not bring them back.
// Usage: node tools/check-call-bars.mjs. With no Chromium it says SKIPPED and exits 0 (a skip, never a pass).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { findBrowser, launch, freePort, stopServer, bootSeeded, Tab, sleep, driveScreen } from './shots.mjs';

const say = (...a) => console.log('check-call-bars:', ...a);
const failures = [];
const IDLE_WAIT_MS = 4000; // longer than the call's idle delay (space.js, CHROME_IDLE_MS)

// In the opener (the space page): the call's own window, found by its name (canvas.js, openBuiltinWindow).
const POPOUT = `window.open('', 'app-conference')`;
const MEASURE = `(() => { const w = ${POPOUT}; const d = w.document;
  const box = (e) => { if (!e) return null; const r = e.getBoundingClientRect(); return [r.x, r.y, r.width, r.height].map((n) => Math.round(n * 10) / 10).join(','); };
  const head = d.querySelector('.conference-head'); const bar = d.querySelector('.video-bar'); const top = d.querySelector('.topbar');
  const shown = (e) => { if (!e) return false; const r = e.getBoundingClientRect(); return r.bottom > 1 && r.top < w.innerHeight - 1 && w.getComputedStyle(e).visibility !== 'hidden' && Number(w.getComputedStyle(e).opacity) > 0.05; };
  return { popped: d.body.classList.contains('conference-window'), idle: Boolean(d.querySelector('.canvas.idle')),
    tiles: [...d.querySelectorAll('#grid .tile')].map(box), grid: box(d.getElementById('grid')),
    pos: { head: head && w.getComputedStyle(head).position, bar: bar && w.getComputedStyle(bar).position, top: top && w.getComputedStyle(top).position },
    shown: { head: shown(head), bar: shown(bar) } }; })()`;
// Events dispatched in the popped-out window, as a person's would arrive there.
const ev = (js) => `(() => { const w = ${POPOUT}; const d = w.document; ${js}; return true; })()`;
const MOVE = (x, y) => ev(`d.dispatchEvent(new w.MouseEvent('mousemove', { bubbles: true, clientX: ${x}, clientY: ${y}, screenX: ${x}, screenY: ${y} }))`);

async function run(browser, S, people) {
  const tab = new Tab(browser.cdp, S.ctx);
  await tab.open(1280, 'light', true);
  const settle = tab.settle.bind(tab); tab.settle = () => Promise.race([settle(), sleep(3000)]);
  const states = [];
  try {
    await tab.cdp.send('Page.addScriptToEvaluateOnNewDocument', { source: `try { localStorage.setItem('shots.call.people', '${people - 1}'); } catch (e) {}` }, tab.sid);
    await driveScreen(tab, { id: 'call', as: 'mia', url: '/#join={trip}', wait: 'button.sdk-strip-fact[data-module=budget]', call: true, steps: [{ click: '#join-call' }] }, S.base, S.cookies, S.ctx);
    const end = Date.now() + 15000;
    while (Date.now() < end && (await tab.eval(`document.querySelectorAll('#grid .tile').length`)) < people) await sleep(200);
    // Pop the call out, as its title bar's button does (a click is a user gesture, so the window is not blocked).
    await tab.cdp.send('Runtime.evaluate', { expression: `document.getElementById('call-head-popout').click()`, userGesture: true }, tab.sid);
    const end2 = Date.now() + 10000;
    while (Date.now() < end2 && !(await tab.eval(`(() => { try { const w = ${POPOUT}; return w.document.body.classList.contains('conference-window') && w.document.querySelectorAll('#grid .tile').length >= ${people}; } catch (e) { return false; } })()`))) await sleep(200);
    await sleep(800);
    // The window's own page, for real input there: the pointer and the keyboard as a person's arrive.
    const { targetInfos } = await tab.cdp.send('Target.getTargets');
    const target = targetInfos.find((t) => t.type === 'page' && t.url.endsWith('/popout.html') && t.browserContextId === tab.contextId);
    if (!target) throw new Error('the call\'s window was not found');
    const { sessionId } = await tab.cdp.send('Target.attachToTarget', { targetId: target.targetId, flatten: true });
    const input = (m, p) => tab.cdp.send(m, p, sessionId);
    const move = (x, y) => input('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y, button: 'none', clickCount: 0 });
    const key = async (k, code) => { await input('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: code }); await input('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: code }); };
    const record = async (name) => { const m = await tab.eval(MEASURE); states.push({ name, ...m }); return m; };
    const barAt = async () => tab.eval(`(() => { const r = ${POPOUT}.document.querySelector('.video-bar').getBoundingClientRect(); return { x: Math.round(r.x + 6), y: Math.round(r.y + r.height / 2) }; })()`);
    await move(200, 150); await sleep(500); await record('pointer moved');
    await sleep(IDLE_WAIT_MS); await record('idle');
    // A mousemove at the same place, as Chromium sends after a layout change under a resting pointer: not a movement.
    await tab.eval(MOVE(200, 150)); await sleep(500); await record('mousemove that does not move');
    await move(240, 160); await sleep(500); await record('pointer moved again');
    await tab.eval(ev(`w.dispatchEvent(new w.FocusEvent('blur'))`)); await sleep(500); await record('window blur');
    await tab.eval(ev(`w.dispatchEvent(new w.FocusEvent('focus'))`)); await sleep(500); await record('window focus');
    await sleep(IDLE_WAIT_MS); await record('idle again');
    const at = await barAt();
    await move(at.x, at.y); await sleep(IDLE_WAIT_MS); await record('pointer resting on the toolbar');
    await move(240, 160); await sleep(IDLE_WAIT_MS); await record('idle, pointer resting on the tiles');
    // The keyboard: Tab until the focus is on a toolbar button (focus-within), and it stays up while the focus is there.
    for (let i = 0; i < 30 && !(await tab.eval(`(() => { const d = ${POPOUT}.document; return Boolean(d.activeElement && d.activeElement.closest('.video-bar, .conference-head')); })()`)); i++) await key('Tab', 9);
    await sleep(500); await record('keyboard on a bar (focus-within)');
    await sleep(IDLE_WAIT_MS); await record('focus-within, after the idle wait');
    await tab.eval(ev(`d.activeElement && d.activeElement.blur()`));
    await sleep(IDLE_WAIT_MS); await record('idle, focus gone');
    await tab.eval(ev(`d.dispatchEvent(new w.TouchEvent('touchstart', { bubbles: true }))`)); await sleep(500); await record('touch');
  } finally { await tab.close(); }
  const name = `${people} tiles`;
  if (!states.length || !states[0].popped) { failures.push(`${name}: the call did not pop out, so nothing was measured`); return; }
  const first = states[0];
  if (first.tiles.length < people) failures.push(`${name}: ${first.tiles.length} tiles in the popped-out window, wanted ${people}`);
  for (const s of states) {
    say(`${name}, ${s.name}: ${s.idle ? 'idle' : 'awake'}; bars ${s.shown.head ? 'shown' : 'hidden'}/${s.shown.bar ? 'shown' : 'hidden'}; position ${s.pos.head}/${s.pos.bar}; tiles ${s.tiles.join(' | ')}`);
    if (s.tiles.join('|') !== first.tiles.join('|')) failures.push(`${name}, ${s.name}: the tiles moved or changed size (${s.tiles.join(' | ')}; first ${first.tiles.join(' | ')})`);
    for (const k of ['head', 'bar']) if (!['absolute', 'fixed'].includes(s.pos[k])) failures.push(`${name}, ${s.name}: the call's ${k === 'head' ? 'title bar' : 'toolbar'} is in the flow (position ${s.pos[k]}), so it takes room from the tiles`);
  }
  const want = { 'pointer moved': true, idle: false, 'mousemove that does not move': false, 'pointer moved again': true, 'window blur': true, 'window focus': true, 'idle again': false, 'pointer resting on the toolbar': true, 'idle, pointer resting on the tiles': false, 'keyboard on a bar (focus-within)': true, 'focus-within, after the idle wait': true, 'idle, focus gone': false, touch: true };
  for (const s of states) if (s.name in want && (s.shown.head !== want[s.name] || s.shown.bar !== want[s.name])) failures.push(`${name}, ${s.name}: the bars are ${s.shown.head ? 'shown' : 'hidden'}/${s.shown.bar ? 'shown' : 'hidden'}, wanted ${want[s.name] ? 'shown' : 'hidden'}`);
}

async function main() {
  const bin = findBrowser();
  if (!bin) { say('SKIPPED. No Chromium found (set CHROME_PATH). This is not a pass; nothing was measured.'); return 0; }
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'call-bars-data-'));
  let server = null; let browser = null;
  try {
    const boot = await bootSeeded('travel', dataDir, await freePort());
    server = boot.server;
    const S = { base: server.base, ctx: boot.ctx, cookies: boot.cookies };
    browser = await launch(bin);
    for (const people of [2, 4]) await run(browser, S, people);
  } finally {
    try { if (browser) { browser.cdp.ws.close(); browser.child.kill(); fs.rmSync(browser.dir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 }); } } catch { /* best effort */ }
    if (server) await stopServer(server);
    fs.rmSync(dataDir, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
  if (failures.length) { for (const f of failures) say('FAIL', f); return 1; }
  say('ok');
  return 0;
}
process.exit(await main());
