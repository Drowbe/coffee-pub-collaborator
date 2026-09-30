#!/usr/bin/env node
/*
 * check-module-host.mjs -- the pointer shape modules and the host agree on, run on its own.
 *
 * Since plan-names step 5c a module speaks the server's names directly: a pointer is
 * { module, kind, id, scope: 'space' | 'environment' | 'person', space? }, and nothing translates between an old and a
 * new shape. Two places check a pointer's shape before it goes anywhere: the page side (public/module-host.js,
 * REF_SHAPE and cleanPointer) and the SDK in the module (public/sdk/host.js, cleanRef). This slices those few lines out
 * of each and checks that they accept the one shape, keep only its own fields, and refuse the old one (scope 'room'
 * with `room`, scope 'server'): the hard break of decision 2.
 *
 *   node tools/check-module-host.mjs
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';

function slice(file, startMark, endMark) {
  const src = fs.readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
  const start = src.indexOf(startMark);
  const end = src.indexOf(endMark, start);
  if (start === -1 || end === -1) {
    console.error(`check-module-host: could not find "${startMark}" ... "${endMark}" in ${file}`);
    process.exit(1);
  }
  return src.slice(start, end + endMark.length);
}

const hostSrc = slice('public/module-host.js', 'const REF_SHAPE', 'const cleanPointer = (r) => ({ module: r.module, kind: r.kind, id: r.id, scope: r.scope, ...(r.scope === \'space\' ? { space: r.space } : {}) });');
const { REF_SHAPE, cleanPointer } = new Function(`${hostSrc}\nreturn { REF_SHAPE, cleanPointer };`)();
const sdkSrc = slice('public/sdk/host.js', 'function cleanRef(ref) {', '\n  }\n');
const cleanRef = new Function(`${sdkSrc}\nreturn cleanRef;`)();

let failed = 0;
let n = 0;
const test = (name, fn) => {
  try { fn(); n += 1; } catch (err) { failed += 1; console.error(`check-module-host: ${name}: ${err.message}`); }
};
const base = { module: 'todo', kind: 'task', id: 'abc' };
const inSpace = { ...base, scope: 'space', space: 'gq2zb7pq' };

test('a pointer in a space, the environment or a person is accepted by both sides', () => {
  for (const p of [inSpace, { ...base, scope: 'environment' }, { ...base, scope: 'person' }]) {
    assert.ok(REF_SHAPE(p), `module-host refused ${JSON.stringify(p)}`);
    assert.deepEqual(cleanRef(p), p);
    assert.deepEqual(cleanPointer(p), p);
  }
});
test('each side keeps only the pointer\'s own fields, and a place only for a space', () => {
  const extra = { ...inSpace, title: 'not part of a pointer', room: 'old' };
  assert.deepEqual(cleanRef(extra), inSpace);
  assert.deepEqual(cleanPointer(extra), inSpace);
  assert.deepEqual(cleanRef({ ...base, scope: 'environment', space: 'x' }), { ...base, scope: 'environment' });
  assert.deepEqual(cleanPointer({ ...base, scope: 'environment', space: 'x' }), { ...base, scope: 'environment' });
});
test('the old shape is refused, not translated', () => {
  for (const p of [{ ...base, scope: 'room', room: 'gq2zb7pq' }, { ...base, scope: 'server' }, { ...base, scope: 'rooms' }, { ...base, scope: 'room', space: 'gq2zb7pq' }]) {
    assert.equal(Boolean(REF_SHAPE(p)), false, `module-host accepted ${JSON.stringify(p)}`);
    assert.equal(cleanRef(p), null, `the SDK accepted ${JSON.stringify(p)}`);
  }
});
test('a space pointer needs its space, of a sane length', () => {
  for (const p of [{ ...base, scope: 'space' }, { ...base, scope: 'space', space: 7 }, { ...base, scope: 'space', space: 'x'.repeat(65) }]) {
    assert.equal(Boolean(REF_SHAPE(p)), false);
    assert.equal(cleanRef(p), null);
  }
});
test('nothing is left of the old translation (WIRE_SCOPE, toSdk, toWire)', () => {
  const src = fs.readFileSync(new URL('../public/module-host.js', import.meta.url), 'utf8');
  for (const name of ['WIRE_SCOPE', 'SDK_SCOPE', 'toSdk', 'toWire', 'pointersIn']) assert.equal(src.includes(name), false, `${name} is still in module-host.js`);
});

// A module's own window (public/module.js): Clear in the title bar's "..." runs clearModuleData, a top-level function.
// It once used start()'s local `scope` and failed with "scope is not defined". Run it with only the page's top-level
// names (id, spaceId, guestToken, api) and check what it asks the server to clear.
{
  const clearSrc = slice('public/module.js', 'async function clearModuleData() {', '\n}\n');
  const clearFor = (spaceId, guestToken) => {
    const calls = [];
    const api = async (method, url) => { calls.push([method, url]); };
    const fn = new Function('id', 'spaceId', 'guestToken', 'api', `${clearSrc}\nreturn clearModuleData;`)('todo', spaceId, guestToken, api);
    return fn().then(() => calls.map(([method, url]) => [method, url.replace(/&tz=[^&]*/, '')]));
  };
  const cases = [
    ['a module\'s window in a space clears that space', ['gq2zb7pq', null], [['DELETE', '/api/modules/todo/data?scope=space&space=gq2zb7pq']]],
    ['a guest\'s window in a space carries the guest token', ['gq2zb7pq', 'tok'], [['DELETE', '/api/modules/todo/data?scope=space&space=gq2zb7pq&guest=tok']]],
    ['a module\'s window with no space clears the environment\'s data', [null, null], [['DELETE', '/api/modules/todo/data?scope=environment']]],
  ];
  for (const [name, args, want] of cases) {
    try { assert.deepEqual(await clearFor(...args), want); n += 1; } catch (err) { failed += 1; console.error(`check-module-host: Clear in ${name}: ${err.message}`); }
  }
}

// Push to talk in a space (public/space.js, typing to onKey): its key, Space by default, once took Space away from a
// focused button or host-menu entry, and the mic could stay open when the key's release never reached the page. Run the
// sliced handlers against stand-in elements: Space presses a control reached by keyboard and any menu entry, and talks
// on the page, on a link or on a button just clicked; releasing it always stops talking, wherever focus went and
// whatever modifier came down meanwhile; the window losing focus or being hidden stops it too; and every document that
// hears the keys also hears where focus came from and when its window goes away.
{
  const src = slice('public/space.js', '// Whether the key went to a text field.', '\n  event.preventDefault();\n}\n');
  // public/hotkeys.js's rule, without its navigator: the code, and exactly the combo's modifiers.
  const hotkeyMatches = (event, combo) => {
    const parts = combo.split('+');
    const code = parts.pop();
    return event.code === code && event.shiftKey === parts.includes('Shift') && event.ctrlKey === parts.includes('Ctrl') && event.altKey === parts.includes('Alt') && event.metaKey === parts.includes('Meta');
  };
  const el = (tagName, role, parent) => {
    const e = { tagName, role, parent, isContentEditable: false };
    e.matches = (sel) => sel.split(',').map((s) => s.trim()).some((s) => {
      const m = /^\[role=([a-z]+)\]$/.exec(s);
      return m ? e.role === m[1] : s.toUpperCase() === e.tagName;
    });
    e.closest = (sel) => { for (let at = e; at; at = at.parent) if (at.matches(sel)) return at; return null; };
    e.contains = (other) => { for (let at = other; at; at = at.parent) if (at === e) return true; return false; };
    return e;
  };
  const listening = () => {
    const heard = {};
    return { heard, addEventListener(type, fn) { (heard[type] ||= []).push(fn); } };
  };
  const run = (steps, pttKey, inSpace = true) => {
    const mic = [];
    const doc = { ...listening(), visibilityState: 'visible', body: { classList: { contains: (c) => inSpace && c === 'in-space' } } };
    const win = listening();
    const h = new Function('document', 'window', 'prefs', 'call', 'hotkeyMatches', 'reflectMic', `let pttHeld = false;\n${src}\nreturn { onKey, onKeyUp };`)(
      doc, win, { ptt: true, pttKey, muteKey: 'Mod+KeyD', camKey: 'Mod+KeyE' }, { localParticipant: { setMicrophoneEnabled: (on) => { mic.push(on); return Promise.resolve(); } } }, hotkeyMatches, () => {});
    const prevented = [];
    for (const [type, target, code = pttKey, extra = {}] of steps) {
      if (type === 'blur' || type === 'pagehide') { for (const fn of win.heard[type] || []) fn({ type, target: win }); continue; }
      if (type === 'hidden' || type === 'visible') { doc.visibilityState = type; for (const fn of doc.heard.visibilitychange || []) fn({ type: 'visibilitychange', target: doc }); continue; }
      const event = { type, code, key: code === 'Space' ? ' ' : code.replace(/(Left|Right)$/, ''), repeat: false, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false,
        ...extra, target, composedPath: () => [target], preventDefault() { prevented.push(type); } };
      // As in the browser: a key goes to the window's capture listeners first, then the page's; pointer presses and
      // focus to what the document hears.
      if (type === 'keydown') { for (const fn of win.heard.keydown || []) fn(event); h.onKey(event); } else if (type === 'keyup') h.onKeyUp(event);
      else for (const fn of doc.heard[type] || []) fn(event);
    }
    return { mic, prevented };
  };
  const body = el('BODY');
  const button = el('BUTTON', null, body);
  const icon = el('I', null, button);
  const menu = el('DIV', 'menu', body);
  const entry = el('BUTTON', 'menuitem', menu);
  const talks = { mic: [true, false], prevented: ['keydown', 'keyup'] };
  const leaves = { mic: [], prevented: [] };
  const press = (target, code) => [['keydown', target, code], ['keyup', target, code]];
  const tabTo = (target) => [['keydown', body, 'Tab'], ['focusin', target]];
  const click = (target, focused = target) => [['pointerdown', target], ['focusin', focused]];
  const link = el('A', null, body);
  const shift = { shiftKey: true };
  const cases = [
    ['Space on the page talks', press(body), talks],
    ['Space on a button reached by keyboard presses it', [...tabTo(button), ...press(button)], leaves],
    ['Space on a [role=button] reached by keyboard presses it', (() => { const b = el('DIV', 'button', body); return [...tabTo(b), ...press(b)]; })(), leaves],
    ['Space on a <summary> reached by keyboard presses it', (() => { const b = el('SUMMARY', null, body); return [...tabTo(b), ...press(b)]; })(), leaves],
    ['Space on a menu entry picks it, even when the menu was opened by a click', [...click(icon, button), ['focusin', entry], ...press(entry)], leaves],
    ['Space on a menu entry just pressed with the mouse picks it', [...click(icon, button), ['focusin', entry], ...click(entry), ...press(entry)], leaves],
    ['Space on a button reached by keyboard, then clicked, talks (the click moves no focus)', [...tabTo(button), ['pointerdown', icon], ...press(button)], talks],
    ['Space on a button just clicked talks (clicking the mic, then holding Space)', [...click(icon, button), ...press(button)], talks],
    ['Space after a menu entry picked by mouse talks (the menu gives its button focus back by script)', [...click(icon, button), ['focusin', entry], ...click(entry), ['focusin', button], ...press(button)], talks],
    ['Space after a menu closed by Escape presses its button again', [...tabTo(button), ['keydown', button, 'Enter'], ['focusin', entry], ['keydown', entry, 'Escape'], ['focusin', button], ...press(button)], leaves],
    ['Space on a button clicked, then tabbed away from and back to, presses it', [...click(icon, button), ...tabTo(el('BUTTON', null, body)), ...tabTo(button), ...press(button)], leaves],
    ['Space on a link talks (Space does not follow a link)', [...tabTo(link), ...press(link)], talks],
    ['Space in a text field types', press(el('INPUT', null, body)), leaves],
    ['a push-to-talk key a button does not use still talks on a button', [...tabTo(button), ...press(button, 'KeyT')], talks, 'KeyT'],
    ['Enter as the push-to-talk key presses a focused button', [...tabTo(button), ...press(button, 'Enter')], leaves, 'Enter'],
    ['Enter as the push-to-talk key talks on a link', [...tabTo(link), ...press(link, 'Enter')], talks, 'Enter'],
    ['push to talk does nothing outside a space', press(body), leaves, 'Space', false],
    ['releasing after focus moved into a text field stops talking', [['keydown', body], ['keyup', el('INPUT', null, body)]], talks],
    ['releasing after focus moved onto a button stops talking', [['keydown', body], ['keyup', button]], talks],
    ['releasing with Shift pressed meanwhile stops talking', [['keydown', body], ['keydown', body, 'ShiftLeft', shift], ['keyup', body, 'Space', shift], ['keyup', body, 'ShiftLeft']], talks],
    ['releasing Shift+Space (the key set so) without Shift stops talking', [['keydown', body, 'Space', shift], ['keyup', body, 'ShiftLeft'], ['keyup', body, 'Space']], talks, 'Shift+Space'],
    ['a held key keeps talking through repeats, another key and the page coming back into view', [['keydown', body], ['keydown', body, 'Space', { repeat: true }], ['keydown', body, 'ShiftLeft', shift], ['keyup', body, 'ShiftLeft'], ['visible']], { mic: [true], prevented: ['keydown', 'keydown'] }],
    ['the window losing focus while the key is held stops talking', [['keydown', body], ['blur'], ['keyup', body]], { mic: [true, false], prevented: ['keydown'] }],
    ['the page hidden while the key is held stops talking', [['keydown', body], ['hidden']], { mic: [true, false], prevented: ['keydown'] }],
    ['the page going away while the key is held stops talking', [['keydown', body], ['pagehide']], { mic: [true, false], prevented: ['keydown'] }],
    ['the window losing focus with the key up changes nothing, and the next press talks', [['blur'], ['hidden'], ['visible'], ...press(body)], talks],
  ];
  for (const [name, steps, want, pttKey = 'Space', inSpace = true] of cases) {
    try { assert.deepEqual(run(steps, pttKey, inSpace), want); n += 1; } catch (err) { failed += 1; console.error(`check-module-host: push to talk, ${name}: ${err.message.split('\n')[0]}`); }
  }
  test('every document that hears the call\'s keys hears pointer presses and focus, and its window going away, too (the page and both pop-outs)', () => {
    const page = fs.readFileSync(new URL('../public/space.js', import.meta.url), 'utf8');
    const count = (re) => (page.match(re) || []).length;
    const keys = count(/addEventListener\('keydown', onKey\)/g);
    assert.equal(keys, 3, 'keydown listeners');
    assert.equal(count(/addEventListener\('keyup', onKeyUp\)/g), keys, 'keyup listeners');
    assert.equal(count(/addEventListener\('keydown', noteKey, true\)/g), keys, 'keydown capture listeners');
    assert.equal(count(/addEventListener\('pointerdown', notePointer, true\)/g), keys, 'pointerdown listeners');
    assert.equal(count(/addEventListener\('focusin', noteFocus, true\)/g), keys, 'focusin listeners');
    assert.equal(count(/addEventListener\('blur', releaseTalk\)/g), keys, 'window blur listeners');
    assert.equal(count(/addEventListener\('pagehide', releaseTalk\)/g), keys, 'pagehide listeners');
    assert.equal(count(/addEventListener\('visibilitychange', releaseWhenHidden\)/g), keys, 'visibilitychange listeners');
  });
}

if (failed) process.exit(1);
console.log(`check-module-host: OK (${n} groups)`);
