#!/usr/bin/env node
/*
 * check-chat-page.mjs -- Chat's page side of the one chat model (documentation/plans/plan-chat-model.md, steps 2, 5
 * and 6), run without a browser. The server's side is tools/check-chat-model.mjs; the filter's markup is in
 * tools/check-switches.mjs.
 *
 *   step 2: Chat is drawn from the one store: no local echo, no separate AI thread, no second public post; the badge
 *           sends the PATCH; the chat-visibility notice; {{summary:N}} dropped from an ordinary message; a message
 *           made public placed by its time and counted unread; "Delete your private messages" gone for Clear….
 *   Clear… (plan-chat-clear.md, #166, step 2): the types and counts from what the page holds, the scopes, pictures, the
 *           menu for a member, a moderator and a guest, the two-choice confirm, the chat-clear-some notice.
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
const { stripSummaryMarkers, readFilter, emptyLine, filterKey, CHAT_FILTERS, clearTypeOf, ofClearType, inClearScope, clearChoices, clearTakesPicture, clearNoticeTakes } = await import(pathToFileURL(path.join(tmp, 'chat-input.mjs')).href);
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
  assert.match(space, /data\.type === 'chat-delete' && chatIdOk\(data\.id\)\) applyDeleteNotice\(data, participant\);\n\s*else if \(topic === 'chat' && data\.type === 'chat-visibility'\) applyVisibilityNotice\(data, participant\);/);
  // A page's chat-delete speaks only for its own messages; a moderator's delete comes from the server (no sender).
  assert.match(fnBody(space, 'function applyDeleteNotice(data, participant) {'), /if \(from && have && have\.by !== from\) return;\n\s*dropChatMessage\(data\.id\);/, "a page cannot delete another's message");
  // Delete the chat: only the server's chat-clear (no sender) empties the page; the clearer's own page empties itself
  // once the server has taken it, not through its own notice.
  assert.match(space, /else if \(topic === 'chat' && data\.type === 'chat-clear' && !participant\) dropSharedChat\(\);/, "a page's chat-clear is ignored");
  assert.match(space, /await api\('DELETE', `\/api\/spaces\/\$\{encodeURIComponent\(currentSpace\.id\)\}\/chat`\);\n[\s\S]{0,200}?\n\s*dropSharedChat\(\);/, 'the clearer empties its own page after the server answers');
  assert.match(read('server/index.js'), /chatHistory\.clear\(found\.space\.id\);\n\s*tellChat\(found\.space\.id, \{ type: 'chat-clear' \}\);/, 'the server always tells the call');
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

test('"Delete your private messages" is gone for Clear… (plan-chat-clear.md, decision 1)', () => {
  assert.ok(!/Clear your AI thread/.test(space));
  assert.ok(!/Delete your private messages/.test(space), 'the old entry is gone');
  assert.ok(!/\/chat\/private/.test(space), 'the page no longer calls /chat/private');
  // A private message is deleted by its author only, and never announced to the call.
  assert.match(fnBody(space, 'function canDeleteChatEntry(entry) {'), /if \(entry\.visibility === 'private'\) return Boolean\(me\?\.key && entry\.by === me\.key && me\.role !== 'guest'\);/);
  assert.match(fnBody(space, 'async function deleteMessage(el, entry) {'), /if \(entry\.visibility !== 'private'\) publishChat\(\{ type: 'chat-delete', id: entry\.id \}\);/);
});

// --- Clear… (plan-chat-clear.md, step 2) -----------------------------------------------------------------------------

const held = (o) => ({ stored: true, id: 'aaaaaaaaaaaa', visibility: 'public', kind: '', ...o });
const HELD = [
  held({ by: 'pat' }), // Pat's chat, public
  held({ by: 'pat', visibility: 'private' }), // Pat's chat made private
  held({ by: 'sam' }), // Sam's chat
  held({ by: 'pat', kind: 'command', command: 'ai', visibility: 'private' }), // Pat's /ai question
  held({ by: 'pat', kind: 'ai', visibility: 'private' }), // its answer
  held({ by: 'sam', kind: 'ai' }), // Sam's public answer
  held({ by: 'sam', kind: 'command', command: 't', module: 'todo' }),
  held({ by: 'pat', kind: 'command', command: 't', module: 'other-todo' }), // the same command, another module
  held({ by: 'pat', kind: 'command', command: 'x' }), // a stored command with no module: only All takes it
  { id: 'bbbbbbbbbbbb', by: 'pat', blob: {}, visibility: 'public' }, // a picture, never stored
  held({ by: 'pat', stored: false }), // an old local copy
];

test('Clear…: each message has one type; pictures, local echoes and old copies have none', () => {
  assert.deepEqual(HELD.map(clearTypeOf), ['chat', 'chat', 'chat', 'ai', 'ai', 'ai', 'module:todo', 'module:other-todo', 'other', '', '']);
  assert.equal(ofClearType(HELD[6], 'module', 'todo'), true);
  assert.equal(ofClearType(HELD[7], 'module', 'todo'), false, 'keyed by module id, not command (decision 10)');
  assert.equal(ofClearType(HELD[6], 'module', ''), false, 'a module type needs its id');
  assert.equal(ofClearType(HELD[8], 'all'), true);
  assert.equal(ofClearType(HELD[9], 'all'), false, 'a picture is not a stored message');
  assert.equal(ofClearType(HELD[3], 'chat'), false, 'an /ai question is AI, not chat');
});

test('Clear…: mine is the person\'s own, public and private; everyone is every public one and only their own private', () => {
  assert.equal(inClearScope(HELD[1], 'mine', 'pat'), true);
  assert.equal(inClearScope(HELD[2], 'mine', 'pat'), false);
  assert.equal(inClearScope(HELD[2], 'everyone', 'pat'), true);
  assert.equal(inClearScope({ ...HELD[1], by: 'sam' }, 'everyone', 'pat'), false, 'never someone else\'s private message (decision 4)');
  assert.equal(inClearScope(HELD[0], 'mine', ''), false, 'nobody without a key');
  assert.equal(inClearScope(HELD[0], 'nobody', 'pat'), false);
});

test('Clear…: the list and its counts, whatever the filter shows (decision 7)', () => {
  const pick = (list) => list.map((c) => [c.type + (c.module ? `:${c.module}` : ''), c.mine, c.everyone]);
  // A member: their own only. Sam's To-do line is not theirs, so it is not listed.
  assert.deepEqual(pick(clearChoices(HELD, { by: 'pat' })), [['chat', 2, 3], ['ai', 2, 3], ['module:other-todo', 1, 1], ['all', 6, 9]]);
  // A moderator: everyone's (every public one and their own private), Sam's To-do too.
  assert.deepEqual(pick(clearChoices(HELD, { by: 'pat', moderator: true })), [['chat', 2, 3], ['ai', 2, 3], ['module:todo', 0, 1], ['module:other-todo', 1, 1], ['all', 6, 9]]);
  assert.equal(clearChoices(HELD, { by: 'pat' })[2].command, 't', 'a module that is gone reads as its command');
  // Nothing of theirs: nothing listed, and Clear… is not offered.
  assert.deepEqual(clearChoices(HELD.filter((e) => e.by === 'sam'), { by: 'pat' }), []);
  assert.deepEqual(clearChoices([HELD[9], HELD[10]], { by: 'pat', moderator: true }), [], 'pictures and old copies alone are nothing to clear');
  assert.deepEqual(clearChoices([], { by: 'pat' }), []);
});

test('Clear…: chat and all take pictures too, the person\'s own for mine, every one for everyone', () => {
  const pic = HELD[9];
  assert.equal(clearTakesPicture(pic, { type: 'chat', scope: 'mine', by: 'pat' }), true);
  assert.equal(clearTakesPicture(pic, { type: 'all', scope: 'mine', by: 'sam' }), false);
  assert.equal(clearTakesPicture(pic, { type: 'all', scope: 'everyone', by: 'sam' }), true);
  assert.equal(clearTakesPicture(pic, { type: 'ai', scope: 'everyone', by: 'pat' }), false);
  assert.equal(clearTakesPicture(HELD[0], { type: 'chat', scope: 'everyone', by: 'pat' }), false, 'only a picture');
});

test("Clear…'s notice: a page's takes only its sender's own, whatever its scope; the server's takes what it lists", () => {
  const held = HELD.map((e, i) => ({ ...e, id: e.blob ? e.id : `${i}`.padStart(12, 'c') })); // each its own id
  const every = new Set(held.map((e) => e.id));
  const takes = (opts) => held.filter((e) => clearNoticeTakes(e, { ids: every, ...opts }));
  // A spoofed page notice from Sam: scope everyone, every id, chat or all. Only Sam's own go; Pat's picture stays.
  for (const type of ['chat', 'all']) {
    const gone = takes({ type, scope: 'everyone', by: 'sam', fromPage: true });
    assert.deepEqual(gone.map((e) => e.by), gone.map(() => 'sam'), `${type}: a page's notice took someone else's`);
    assert.ok(gone.length > 0, `${type}: Sam's own still go`);
  }
  // Ids not Sam's, listed under scope mine: none go.
  const pats = new Set(held.filter((e) => e.by === 'pat').map((e) => e.id));
  assert.deepEqual(held.filter((e) => clearNoticeTakes(e, { ids: pats, type: 'all', scope: 'mine', by: 'sam', fromPage: true })), []);
  // The server's notice (no sender): everyone's listed ids, and for chat or all every picture.
  const server = takes({ type: 'all', scope: 'everyone', by: 'sam' });
  assert.ok(server.some((e) => e.by === 'pat' && !e.blob), "the server's notice takes Pat's listed messages");
  assert.ok(server.includes(held[9]), "the server's clear of everyone's takes Pat's picture");
  assert.equal(clearNoticeTakes(HELD[0], { ids: every, type: 'all', scope: 'everyone', by: '' }), false, 'no sender named, nothing taken');
});

test('Clear… in the ⋮ menu: after Save the chat, before Delete the chat; never for a guest; the route; the notice', () => {
  const more = space.slice(space.indexOf("$('chat-more').addEventListener('click'"), space.indexOf("$('chat-pic').addEventListener"));
  const at = (label) => more.indexOf(label);
  assert.ok(at("label: 'Save the chat'") > -1 && at("label: 'Save the chat'") < at("label: 'Clear…'") && at("label: 'Clear…'") < at("label: 'Delete the chat'"), 'Save, Clear…, Delete');
  assert.match(more, /if \(canClearChat\(\) && clearChoices\(chatLog, \{ by: me\.key, moderator: canModerateChat\(\) \}\)\.length\)/, 'offered only with something to clear');
  assert.match(more, /hint: 'Every message goes, for everyone, private ones too\.'/, 'Delete the chat names private messages (decision 6)');
  assert.match(fnBody(space, 'function canClearChat() {'), /me\?\.key && me\.role !== 'guest' && !guestToken && currentSpace && !currentSpace\.isAside/, 'never a guest, never in an aside');
  const clear = fnBody(space, 'async function clearChatMessages(');
  assert.match(clear, /api\('DELETE', `\/api\/spaces\/\$\{encodeURIComponent\(currentSpace\.id\)\}\/chat\/messages\?\$\{q\}`\)/, 'the route of decision 11');
  assert.ok(clear.indexOf('await api(') < clear.indexOf('dropChatEntries(gone)'), 'dropped here only once the server took it');
  assert.ok(!/catch/.test(clear), 'a refusal is thrown, for the confirm to show');
  assert.match(clear, /e\.stored && e\.visibility !== 'private'/, 'only public ids are told to the call');
  const confirm = fnBody(space, 'function confirmClearChat(');
  assert.match(confirm, /confirm: `Clear your \$\{choice\.mine\} \$\{what\}\$\{messagesWord\(choice\.mine\)\}\?`/, 'a member: one choice with the count');
  assert.match(confirm, /label: `Clear yours \(\$\{choice\.mine\}\)`/);
  assert.match(confirm, /label: `Clear everyone's \(\$\{choice\.everyone\}\)`, hint: 'Private messages of others stay\.'/);
  // The two-choice confirm in module-host.js: each choice acts, a failure shows in the menu, Keep it last.
  const host = read('public/module-host.js');
  const cm = fnBody(host, 'export function openConfirmMenu(');
  assert.match(cm, /choices\.map\(\(c\) => \(\{ icon, label: c\.label, hint: c\.hint, disabled: Boolean\(c\.disabled\), danger: !c\.disabled, onPick: act\(c\.onConfirm\) \}\)\)/);
  assert.match(cm, /catch \(err\) \{ openHostMenu\(trigger, \[\{ label: err\.message \|\| fail, disabled: true \}\]\); \}/);
  assert.match(cm, /\[\.\.\.doing, \{ icon: 'xmark', label: 'Keep it'/);
  // The notice beside chat-delete; only someone else's clear of everyone's leaves a line.
  assert.match(space, /data\.type === 'chat-visibility'\) applyVisibilityNotice\(data, participant\);\n\s*else if \(topic === 'chat' && data\.type === 'chat-clear-some'\) applyClearNotice\(data, participant\);/);
  const notice = fnBody(space, 'function applyClearNotice(data, participant) {');
  assert.match(notice, /if \(!by \|\| \(from && from !== by\)\) return;/, 'a page speaks only for itself');
  assert.match(notice, /clearNoticeTakes\(e, \{ ids, type, scope, by, fromPage: Boolean\(from\) \}\)/, 'what a notice takes, by who sent it');
  assert.match(notice, /if \(from \|\| scope !== 'everyone' \|\| by === me\?\.key\) return;/, "only the server's notice adds the line");
  assert.ok(!/addEntry|chatLog\.push|unread \+=/.test(notice), 'the line is not stored and not counted');
  // Tints in the host menu come from the tokens.
  assert.match(read('public/host-menu.js'), /if \(\/\^\(gold\|blue\|green\|teal\|purple\|red\|orange\|pink\)\$\/\.test\(item\.tint \|\| ''\)\) i\.dataset\.tint = item\.tint;/);
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
