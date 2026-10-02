#!/usr/bin/env node
/*
 * check-chat-page.mjs -- Chat's page side of the one chat model (documentation/plans/plan-chat-model.md, steps 2, 5
 * and 6), run without a browser. The server's side is tools/check-chat-model.mjs; the filter's markup is in
 * tools/check-switches.mjs.
 *
 *   step 2: Chat is drawn from the one store: no local echo, no separate AI thread, no second public post; the badge
 *           sends the PATCH; the chat-visibility notice; {{summary:N}} dropped from an ordinary message; a message
 *           made public placed by its time and counted unread; "Delete your private messages".
 *   step 5: the eight tints, fixed light and dark values, on a message and on a module's icon; no fixed colour in a rule.
 *   step 6: every bundled module's colour (decision 20), a known tint.
 *
 *   node tools/check-chat-page.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => fs.readFileSync(path.join(ROOT, rel), 'utf8');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-page-check-'));
fs.copyFileSync(path.join(ROOT, 'public/chat-input.js'), path.join(tmp, 'chat-input.mjs'));
const { stripSummaryMarkers, readFilter, emptyLine, filterKey, CHAT_FILTERS } = await import(pathToFileURL(path.join(tmp, 'chat-input.mjs')).href);
fs.rmSync(tmp, { recursive: true, force: true });

let n = 0;
const test = (name, fn) => {
  try {
    fn();
    n += 1;
  } catch (err) {
    console.error(`check-chat-page: ${name}\n  ${err.message}`);
    process.exit(1);
  }
};
const space = read('public/space.js');
const chat = read('public/chat-input.js');
const css = read('public/style.css');
const fnBody = (src, head) => {
  const at = src.indexOf(head);
  assert.ok(at > -1, `missing ${head}`);
  return src.slice(at, src.indexOf('\n}\n', at) + 2);
};
const TINTS = ['gold', 'blue', 'green', 'teal', 'purple', 'red', 'orange', 'pink'];

// --- step 2 ---------------------------------------------------------------------------------------------------------

test('an ordinary message drops {{summary:N}} (decision 16); only an AI answer turns it into a preview', () => {
  assert.equal(stripSummaryMarkers('AI answer shared by Pat\n\nIt is {{summary:0}}.'), 'AI answer shared by Pat\n\nIt is.');
  assert.equal(stripSummaryMarkers('Two {{summary:0}} and {{summary:12}} here'), 'Two and here');
  assert.equal(stripSummaryMarkers('no markers {{summary:x}}'), 'no markers {{summary:x}}');
  assert.equal(stripSummaryMarkers(null), '');
  const el = fnBody(space, 'function messageEl(entry, own) {');
  assert.match(el, /renderMarkup\(entry\.kind \? entry\.text : stripSummaryMarkers\(entry\.text\)\)/, 'ordinary messages only');
  assert.match(el, /chatInput\.answerBody\(entry\.text, entry\.summaries,/, 'an AI answer draws its previews, Keep and all, for whoever sees it');
});

test('one store: no local echo, no AI thread load, no second public post (no duplicates)', () => {
  for (const [file, src] of [['chat-input.js', chat], ['space.js', space]]) {
    assert.ok(!/onPublic/.test(src), `${file}: onPublic is gone`);
    assert.ok(!/sendChat\(`AI answer shared by/.test(src), `${file}: no "AI answer shared by" post`);
    assert.ok(!/\/ai\/thread/.test(src), `${file}: the page reads nothing from the old AI thread routes`);
    assert.ok(!/reflectCommand|addAiTurn|shareMode|threadId/.test(src), `${file}: the local echo and the share mode are gone`);
  }
  const run = fnBody(chat.replace(/^ {2}/gm, ''), 'async function runAi(question) {');
  assert.ok(!/share/.test(run.replace(/\/\/.*$/gm, '')), 'POST .../ai is not sent share');
  assert.match(run, /if \(reply\.question\) addStored\(reply\.question\);\n\s*if \(reply\.message\) addStored\(reply\.message\);/, 'the stored question and answer are drawn from the reply');
  const echo = fnBody(chat.replace(/^ {2}/gm, ''), 'function echo(parsed, chosen, reply) {');
  assert.match(echo, /if \(reply && reply\.message\) \{ addStored\(reply\.message\); return; \}/, 'a command\'s echo is the stored message the server returned');
  assert.match(echo, /\{ local: true \}/, 'a guest\'s echo (no message) stays on the page only');
  assert.match(space, /addStored: \(m, opts\) => addStoredMessage\(m, opts\),/);
  // History: GET .../chat, every field kept, private and public in one list.
  assert.match(fnBody(space, 'async function fetchChatHistory('), /messages: messages\.map\(\(m\) => storedEntry\(m\)\)/);
  const stored = fnBody(space, 'function storedEntry(m, { local = false } = {}) {');
  for (const field of ['visibility', 'kind', 'command', 'module', 'summaries', 'replyTo', 'question']) assert.ok(stored.includes(field), `storedEntry keeps ${field}`);
  assert.match(stored, /visibility: m\.visibility === 'private' \? 'private' : 'public'/, 'absent means public');
});

test('the badge: the author of a stored message flips it with PATCH, both ways; pictures and local echoes are plain', () => {
  const rule = fnBody(space, 'function canChangeVisibility(entry) {');
  const can = new Function('me', 'guestToken', 'chatIdOk', `${rule}; return canChangeVisibility;`);
  const ok = (id) => /^[a-f0-9]{12}$/.test(id);
  const pat = { key: 'pat', role: 'member' };
  const mine = { stored: true, id: 'aaaaaaaaaaaa', by: 'pat', visibility: 'private' };
  assert.equal(can(pat, '', ok)(mine), true, 'the author, a private message');
  assert.equal(can(pat, '', ok)({ ...mine, visibility: 'public' }), true, 'and a public one');
  assert.equal(can(pat, '', ok)({ ...mine, by: 'sam' }), false, 'never someone else\'s');
  assert.equal(can(pat, '', ok)({ ...mine, blob: {} }), false, 'a picture is never stored');
  assert.equal(can(pat, '', ok)({ ...mine, stored: false }), false, 'a guest\'s local echo, an import preview');
  assert.equal(can({ key: 'guest', role: 'guest' }, '', ok)({ ...mine, by: 'guest' }), false, 'a guest never');
  assert.equal(can(pat, 'tok', ok)(mine), false, 'nor a guest link');
  const set = fnBody(space, 'async function setMessageVisibility(entry, visibility) {');
  assert.match(set, /api\('PATCH', `\/api\/spaces\/\$\{encodeURIComponent\(currentSpace\.id\)\}\/chat\/\$\{entry\.id\}`, \{ visibility \}\)/);
  assert.match(set, /setStatus\(err\.message \|\| 'Could not change who sees that\.', true\);\n\s*return false;/, 'a refusal leaves the badge and says why');
  const frame = fnBody(space, 'function frameMessage(');
  assert.match(frame, /const done = await setMessageVisibility\(entry, next\);\n\s*if \(!done\) return;/, 'the badge repaints only once the server took it');
  assert.match(frame, /label: next === 'public' \? 'Make public' : 'Make private'/);
});

test('chat-visibility beside chat-delete: made public, drawn by its time and counted unread; made private, gone', () => {
  assert.match(space, /data\.type === 'chat-delete' && chatIdOk\(data\.id\)\) dropChatMessage\(data\.id\);\n\s*else if \(topic === 'chat' && data\.type === 'chat-visibility'\) applyVisibilityNotice\(data, participant\);/);
  const notice = fnBody(space, 'function applyVisibilityNotice(data, participant) {');
  assert.match(notice, /if \(from && data\.message\.by !== from\) return;/, 'only the author\'s page may say so');
  assert.match(notice, /dropChatMessage\(data\.id\);/, 'made private: gone for everyone else');
  assert.match(notice, /addEntry\(entry, entry\.by === me\?\.key\);/, 'made public: added, as a new message from its author');
  const add = fnBody(space, 'function addEntry(entry, own = false) {');
  assert.match(add, /placeMessage\(messageEl\(entry, own\)\)/, 'placed by its time');
  assert.match(add, /if \(!canvas\.builtinOpen\('chat'\) && !own && entry\.visibility !== 'private'\) \{\n\s*unread \+= 1;/, 'unread counts public messages from others');
  // placeMessage: before the first message that is later, else last.
  const place = fnBody(space, 'function placeMessage(el) {');
  assert.match(place, /\.find\(\(m\) => Number\(m\.dataset\.at\) > at\)/);
  // The page's own notice after a PATCH, as it does after a delete.
  assert.match(fnBody(space, 'async function setMessageVisibility('), /publishChat\(entry\.visibility === 'public'\n\s*\? \{ type: 'chat-visibility', id: entry\.id, visibility: 'public', message \}\n\s*: \{ type: 'chat-visibility', id: entry\.id, visibility: 'private' \}\);/);
});

test('a public AI answer reads "AI, for <name>" and quotes the question in one line (decision 11)', () => {
  const el = fnBody(space, 'function messageEl(entry, own) {');
  assert.match(el, /const quote = entry\.visibility === 'public' && entry\.question \? entry\.question : null;/, 'never on a private answer');
  assert.match(el, /if \(quote\) name = `AI, for \$\{quote\.who\}`;/);
  assert.match(el, /q\.className = 'message-quote';/);
  assert.match(css, /\.message-quote \{[^}]*white-space: nowrap;[^}]*text-overflow: ellipsis;/, 'one line');
});

test('"Clear your AI thread" is "Delete your private messages" (decision 13)', () => {
  assert.ok(!/Clear your AI thread/.test(space));
  assert.match(space, /label: 'Delete your private messages'/);
  assert.match(space, /api\('DELETE', `\/api\/spaces\/\$\{encodeURIComponent\(currentSpace\.id\)\}\/chat\/private`\)/);
  // A private message is deleted by its author only, and never announced to the call.
  assert.match(fnBody(space, 'function canDeleteChatEntry(entry) {'), /if \(entry\.visibility === 'private'\) return Boolean\(me\?\.key && entry\.by === me\.key && me\.role !== 'guest'\);/);
  assert.match(fnBody(space, 'async function deleteMessage(el, entry) {'), /if \(entry\.visibility !== 'private'\) publishChat\(\{ type: 'chat-delete', id: entry\.id \}\);/);
});

// --- step 3: the filter's pure parts (its markup is in check-switches.mjs) -------------------------------------------

test('the filter: All by default, the three choices, the empty lines, the session key', () => {
  assert.deepEqual(CHAT_FILTERS, ['all', 'private', 'public']);
  assert.equal(readFilter(null), 'all');
  assert.equal(readFilter('shared'), 'all', 'the old switch\'s value is not a filter');
  assert.equal(readFilter('private'), 'private');
  assert.equal(filterKey('abc'), 'chat-filter:abc');
  assert.equal(emptyLine('all', []), '');
  assert.equal(emptyLine('private', ['public']), 'No private messages here yet.');
  assert.equal(emptyLine('public', ['private', 'private']), 'No public messages here yet.');
  assert.equal(emptyLine('public', ['private', 'public']), '');
  // Shown in a space to anyone who reads Chat, guests too; hidden in an aside.
  assert.match(chat, /setFilterVisible\(Boolean\(spaceId\(\)\)\);/);
  assert.match(space, /if \(\$\('chat-filter'\)\) \$\('chat-filter'\)\.hidden = true;/);
});

// --- step 5 ---------------------------------------------------------------------------------------------------------

test('the eight tints: fixed dark values on :root and light ones for the light mode, in style.css and host.css', () => {
  for (const file of ['public/style.css', 'public/sdk/host.css']) {
    const src = read(file);
    const root = src.slice(src.indexOf(':root {'), src.indexOf('\n}\n', src.indexOf(':root {')));
    const lightAt = src.indexOf(':root[data-theme-mode="light"],\n:root[data-mode-shown="light"]:not([data-theme-mode="dark"]) {');
    assert.ok(lightAt > -1, `${file}: the light values follow the mode showing`);
    const light = src.slice(lightAt, src.indexOf('}', lightAt));
    for (const t of TINTS) {
      const dark = new RegExp(`--tint-${t}: (#[0-9a-f]{6});`).exec(root);
      const lit = new RegExp(`--tint-${t}: (#[0-9a-f]{6});`).exec(light);
      assert.ok(dark && lit, `${file}: --tint-${t} has a dark and a light value`);
      assert.notEqual(dark[1], lit[1], `${file}: --tint-${t} differs by mode`);
    }
  }
  // The same values in both files.
  const values = (src) => [...src.matchAll(/--tint-([a-z]+): (#[0-9a-f]{6});/g)].map((m) => `${m[1]}=${m[2]}`).join(' ');
  assert.equal(values(read('public/sdk/host.css')), values(css));
  // The mode showing is written for the light values to key on, and module frames receive the tints.
  assert.match(read('public/theme-mode.js'), /for \(const doc of liveDocs\(\)\) doc\.documentElement\.dataset\.modeShown = mode;/);
  const host = read('public/module-host.js');
  for (const t of TINTS) assert.ok(host.includes(`'--tint-${t}'`), `module frames receive --tint-${t}`);
  // The server's list of tints is the same eight.
  assert.deepEqual(createRequire(import.meta.url)('../server/modules.js').TINTS, TINTS);
});

test('a tint colours a message\'s portrait icon and left edge, and a module\'s icon; no fixed colour in those rules', () => {
  for (const t of TINTS) assert.match(css, new RegExp(`\\[data-tint="${t}"\\] \\{ --tint: var\\(--tint-${t}\\); \\}`));
  const rule = (sel) => {
    const at = css.indexOf(`\n${sel} {`);
    assert.ok(at > -1, `style.css has ${sel}`);
    return css.slice(at, css.indexOf('}', at));
  };
  assert.match(rule('.message[data-tint]'), /--message-tint: var\(--tint\);\s*border-left: 3px solid var\(--message-tint\);/);
  assert.match(rule('.message[data-tint] .message-portrait-icon'), /color: var\(--message-tint\);/);
  assert.match(rule('i[data-tint]'), /color: var\(--tint\);/);
  for (const sel of ['.message[data-tint]', '.message[data-tint] .message-portrait-icon', 'i[data-tint]', '.message-command', '.message-quote', '.chat-filter-empty']) {
    assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(/i.test(rule(sel)), `${sel} uses tokens only`);
  }
  // Where: the module's titlebar on the canvas and in its own window, its line in the Layout menu's Show section.
  const canvasJs = read('public/canvas.js');
  assert.match(canvasJs, /<span class="mod-title"><i class="fa-solid fa-\$\{escapeHtml\(m\.icon\)\} fa-fw" aria-hidden="true"\$\{tintAttr\(m\.id\)\}><\/i>/);
  assert.ok(canvasJs.includes("badge: unread[m.id] || 0, tint: colorOf(m.id) })), 'module')"), 'the Layout menu\'s Show list tints each module\'s icon');
  assert.match(read('public/switch-list.js'), /data-tint="\$\{tint\}"/);
  assert.match(read('public/module.js'), /\$\('module-titlebar-icon'\)\.dataset\.tint = mod\.color;/);
  // On a message: a command's colour from its module, the AI gold.
  const look = fnBody(chat.replace(/^ {2}/gm, ''), 'function commandLook({ kind, command, module } = {}) {');
  assert.match(look, /if \(kind === 'ai' \|\| command === 'ai'\) return \{ icon: 'robot', tint: 'gold', label: '\/ai' \};/);
  assert.match(look, /tint: canvas\.colorOf \? canvas\.colorOf\(module\) : null/);
});

// --- step 6 ---------------------------------------------------------------------------------------------------------

test('every bundled module\'s colour (decision 20), a known tint; Stream and the Assistant have none', () => {
  const want = { research: 'blue', todo: 'green', calendar: 'red', travel: 'teal', polls: 'purple', places: 'orange', maps: 'pink', stream: undefined, assistant: undefined };
  const dirs = fs.readdirSync(path.join(ROOT, 'modules')).filter((d) => fs.existsSync(path.join(ROOT, 'modules', d, 'module.json')));
  for (const id of dirs) {
    const manifest = JSON.parse(read(`modules/${id}/module.json`));
    assert.ok(id in want, `modules/${id}: say its colour here`);
    assert.equal(manifest.color, want[id], `modules/${id}: "color"`);
    if (manifest.color !== undefined) assert.ok(TINTS.includes(manifest.color), `modules/${id}: a known tint`);
  }
});

console.log(`check-chat-page: OK (${n} tests)`);
