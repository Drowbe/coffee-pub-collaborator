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
 *   Links (plan-chat-links.md, #158, step 4): the preview and Keep as the page holds them, the two notices' sender rule,
 *           the picture only ever from the image route, Keep only with `may`, the box's tint on its edge and icon.
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
const { stripSummaryMarkers, readFilter, emptyLine, filterKey, CHAT_FILTERS, clearTypeOf, ofClearType, inClearScope, clearChoices, clearTakesPicture, clearNoticeTakes, linkUrl, cleanPreview, cleanKept, siteName, linkKeeper, previewNoticeTakes, keptNoticeTakes, findLink, noticePreview, TRAVEL_KINDS, keeperFor, detailLines, keepInput, suggestionInput } = await import(pathToFileURL(path.join(tmp, 'chat-input.mjs')).href);
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

test('links (plan-chat-links.md): a preview is cleaned whoever hands it in; the picture is only a yes or no', () => {
  assert.equal(linkUrl('https://example.com/a'), 'https://example.com/a');
  for (const bad of ['ftp://x.com', 'javascript:alert(1)', 'https://u:p@x.com', `https://x.com/${'a'.repeat(500)}`, '', null, 7]) assert.equal(linkUrl(bad), '', String(bad).slice(0, 30));
  assert.equal(cleanPreview({ url: 'javascript:alert(1)', at: 1, title: 'x' }), null, 'no link, no preview');
  assert.deepEqual(cleanPreview({ url: 'https://x.com/h' }), { url: 'https://x.com/h' }, 'not read: the address alone');
  const read = cleanPreview({ url: 'https://x.com/h', module: 'research', at: 5, title: ` ${'T'.repeat(200)} `, description: 'D'.repeat(900), image: 'https://evil.example/track.gif' });
  assert.equal(read.title.length, 120);
  assert.equal(read.description.length, 500);
  assert.equal(read.image, true, 'the picture\'s address is dropped: the page loads it from the image route by id');
  assert.equal(cleanPreview({ url: 'https://x.com', module: '<b>', at: 1 }).module, undefined, 'a module id or nothing');
  assert.deepEqual(cleanPreview({ url: 'https://x.com', title: 'only when read' }), { url: 'https://x.com' }, 'words only come with a read');
  assert.deepEqual(cleanKept({ by: 'k1', who: 'Mia', at: 9 }), { by: 'k1', who: 'Mia', at: 9 });
  assert.equal(cleanKept({ who: 'Mia' }), null);
  assert.equal(siteName('https://www.Example.com/x'), 'example.com');
});

test('links: Keep only for the keeper\'s saveLink with may: true (decision 10), found by its shape, not its name', () => {
  const save = { name: 'saveLink', module: 'research', moduleName: 'Research', input: { url: 'text', title: 'string?' }, may: true };
  assert.deepEqual(linkKeeper([{ name: 'saveNote', input: { title: 'x', body: 'y' } }, save]), { module: 'research', name: 'Research', may: true });
  assert.equal(linkKeeper([{ ...save, may: false }]).may, false, 'a guest or a reader: no Keep');
  assert.equal(linkKeeper([{ ...save, may: undefined }]).may, false, 'an older server that does not say: no Keep');
  assert.equal(linkKeeper([{ ...save, input: { title: 'string' } }]), null, 'no url input, not a keeper');
  assert.equal(linkKeeper([]), null, 'no keeper (decision 9)');
});

test('links: chat-preview and chat-kept take the first copy, and a page\'s notice speaks only for its own messages', () => {
  const entry = { id: 'aaaaaaaaaaaa', by: 'author', kind: '', preview: { url: 'https://x.com/h' } };
  const notice = { id: entry.id, preview: { url: 'https://x.com/h', at: 3, title: 'T' } };
  assert.equal(previewNoticeTakes(entry, notice, ''), true, 'the server\'s');
  assert.equal(previewNoticeTakes(entry, notice, 'author'), true, 'its author\'s page');
  assert.equal(previewNoticeTakes(entry, notice, 'someone-else'), false, 'a forged one from another page');
  assert.equal(previewNoticeTakes({ ...entry, preview: { ...entry.preview, at: 1 } }, notice, ''), false, 'a second copy');
  assert.equal(previewNoticeTakes(entry, { ...notice, preview: { ...notice.preview, url: 'https://evil.example' } }, ''), false, 'another address');
  assert.equal(previewNoticeTakes(entry, { ...notice, preview: { url: 'https://x.com/h' } }, ''), false, 'nothing read');
  assert.equal(previewNoticeTakes({ ...entry, kind: 'ai' }, notice, ''), false, 'only an ordinary message');
  const kept = { id: entry.id, kept: { by: 'mia', who: 'Mia', at: 4 } };
  assert.equal(keptNoticeTakes(entry, kept, ''), true, 'the server\'s');
  assert.equal(keptNoticeTakes(entry, kept, 'mia'), false, 'another person\'s page, for someone else\'s message');
  assert.equal(keptNoticeTakes(entry, { ...kept, kept: { by: 'author', who: 'Anyone at all' } }, 'author'), false, 'never a page\'s: it could name anyone');
  assert.equal(keptNoticeTakes({ ...entry, kept: { by: 'x' } }, kept, ''), false, 'kept once (decision 11)');
  assert.equal(keptNoticeTakes({ ...entry, preview: undefined }, kept, ''), false, 'no link');
});

test('links: storedEntry keeps preview and kept; the page asks for the preview, passes it on, draws from the image route; Keep calls the keep route', () => {
  const space = read('public/space.js');
  const stored = space.slice(space.indexOf('function storedEntry('), space.indexOf('async function postChatMessage('));
  assert.match(stored, /if \(!kind\) \{\s*const preview = cleanPreview\(m\.preview\);/);
  assert.match(stored, /const kept = preview \? cleanKept\(m\.kept\) : null;/);
  const send = space.slice(space.indexOf('async function sendChatText('), space.indexOf('function dropChatMessage('));
  assert.match(send, /\.\.\.\(entry\.preview \? \{ preview: \{ url: entry\.preview\.url \} \} : \{\}\)/, 'the chat notice carries the address');
  assert.match(send, /me\?\.key && me\.role !== 'guest' && !guestToken/, 'never asked for a guest');
  const ask = space.slice(space.indexOf('async function askLinkPreview('), space.indexOf('function applyLinkNotice('));
  assert.match(ask, /\/chat\/\$\{entry\.id\}\/preview`/);
  assert.match(ask, /publishChat\(\{ type: 'chat-preview', id: entry\.id, preview: message\.preview \}\)/);
  assert.match(ask, /entry\.visibility !== 'private'/, 'a private message is never told');
  const box = space.slice(space.indexOf('function linkBox('), space.indexOf('function paintLinkBox('));
  assert.match(box, /img\.src = `\/api\/spaces\/\$\{encodeURIComponent\(currentSpace\.id\)\}\/chat\/\$\{entry\.id\}\/image\$\{q\}`/);
  assert.ok(!/innerHTML/.test(box), 'a preview\'s words are drawn as text');
  assert.match(box, /if \(!chatLinkKeeper\?\.may \|\| !entry\.stored/, 'Keep only with may');
  assert.match(box, /`Kept by \$\{entry\.kept\.who\}`/);
  assert.ok(!/Waiting/.test(box), 'no lasting waiting line: the server marks it kept at once');
  const keep = space.slice(space.indexOf('async function keepLink('), space.indexOf('async function askLinkPreview('));
  assert.match(keep, /\/chat\/\$\{entry\.id\}\/keep\$\{q\}`/);
  assert.match(keep, /const kept = cleanKept\(out\?\.message\?\.kept\);\n\s*if \(kept\) entry\.kept = kept;/, '"Kept by" from the answer');
  assert.ok(!/publishChat/.test(keep), 'chat-kept is the server\'s only');
  assert.match(space, /preview: noticePreview\(data\) \}\), false\);/, 'a live chat notice keeps only its own text\'s address');
  assert.match(space, /else if \(topic === 'chat' && \(data\.type === 'chat-preview' \|\| data\.type === 'chat-kept'\) && chatIdOk\(data\.id\)\) applyLinkNotice\(data, participant\);/);
  const notice = space.slice(space.indexOf('function applyLinkNotice('), space.indexOf('// --- end links in Chat ---'));
  assert.match(notice, /previewNoticeTakes\(entry, data, from\)/);
  assert.match(notice, /keptNoticeTakes\(entry, data, from\)/);
  assert.match(space, /loadLinkKeeper\(currentSpace\.id\);/);
});

test('links: the box wears the keeper\'s tint on its left edge and icon only, theme tokens throughout', () => {
  const css = read('public/style.css');
  const rules = [...css.matchAll(/([^{}]*\.chat-link[^{}]*)\{([^{}]*)\}/g)];
  assert.ok(rules.length >= 8, 'the link box\'s rules');
  for (const [, sel, body] of rules) {
    assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(body), `${sel.trim()}: theme tokens only`);
    const tinted = body.split(';').filter((d) => /var\(--tint/.test(d)).map((d) => d.split(':')[0].trim());
    for (const prop of tinted) assert.ok(['border-left', 'color'].includes(prop), `${sel.trim()}: the tint only on the edge or the icon (${prop})`);
    if (tinted.includes('color')) assert.match(sel, /chat-link-icon/, 'the coloured text is the icon');
  }
});

test('an AI answer\'s Keep reads kept: the bus always answers pending, even when the module takes it at once', () => {
  const src = read('public/chat-input.js');
  const keep = src.slice(src.indexOf('async function keepOne('), src.indexOf('async function askAbout('));
  assert.match(keep, /btn\.classList\.add\(out\.status === 'queued' \? 'queued' : 'kept'\);/);
  assert.ok(!/'pending'/.test(keep), 'pending is not a waiting state here');
});

test('links: the page finds a message\'s link by the server\'s rule, and a live chat notice keeps only that address', () => {
  const { findLink: serverFindLink } = createRequire(import.meta.url)('../server/chat-links.js');
  const texts = [
    'This one? https://example.com/hotel.', 'see [the hotel](https://a.example/x) and https://b.example', '`https://code.example` then http://plain.example/p',
    '> quoted https://quoted.example\nmine https://mine.example', '```\nhttps://fenced.example\n```\nafter https://after.example', 'ftp://x.example and https://u:p@x.example',
    `https://x.example/${'a'.repeat(600)}`, 'no link here', '(https://paren.example/a)', 'two https://first.example https://second.example',
  ];
  for (const t of texts) assert.equal(findLink(t), serverFindLink(t), t.slice(0, 50));
  const data = { id: 'aaaaaaaaaaaa', text: 'look https://good.example/a', preview: { url: 'https://good.example/a', at: 9, title: 'Your bank', description: 'x', image: 'https://evil.example/i.png', module: 'research' } };
  assert.deepEqual(noticePreview(data), { url: 'https://good.example/a' }, 'the address only: nothing read comes with a chat notice');
  assert.equal(noticePreview({ ...data, preview: { url: 'https://evil.example' } }), null, 'an address its text does not have');
  assert.equal(noticePreview({ ...data, text: 'no link' }), null);
  assert.equal(noticePreview({ ...data, preview: undefined }), null);
});

// --- Object handoff (plan-object-handoff.md, step 1) ---------------------------------------------------------------

test('Keep: only a travel kind goes to the typed keeper; note, link, event, task and poll stay with the note keeper', () => {
  const { TRAVEL_KINDS: serverKinds, KINDS } = createRequire(import.meta.url)('../server/object-format.js');
  assert.deepEqual(TRAVEL_KINDS, serverKinds, 'the page\'s copy matches server/object-format.js');
  const keepers = { note: { name: 'saveNote' }, suggestion: { name: 'acceptSuggestion' } };
  for (const kind of TRAVEL_KINDS) assert.equal(keeperFor({ title: 'T', kind }, keepers), keepers.suggestion, kind);
  for (const kind of KINDS.filter((k) => !TRAVEL_KINDS.includes(k))) assert.equal(keeperFor({ title: 'T', kind }, keepers), keepers.note, kind);
  for (const kind of [undefined, '', 'image', 'nonsense']) assert.equal(keeperFor({ title: 'T', kind }, keepers), keepers.note, String(kind));
  assert.equal(keeperFor({ title: 'T', kind: 'flight' }, { note: keepers.note }), keepers.note, 'no typed keeper: the note keeper');
  assert.equal(keeperFor({ title: 'T', kind: 'note' }, { suggestion: keepers.suggestion }), undefined, 'no note keeper: nothing');
  assert.equal(keeperFor(null, keepers), keepers.note);
  // Keep and Keep ticked both choose through keeperFor.
  assert.match(chat, /const placer = keeperFor\(summary, findKeepers\(lastActions\)\);/);
  assert.match(chat, /keeperFor\(r\.obj, keepers\) === keepers\.suggestion \? r\.obj\.kind : 'note'/);
  assert.ok(!/summary\.kind && suggestion/.test(chat), 'no keeper chosen by any kind at all');
});

test('Keep: details are kept as "Label: value" lines after the content, for either keeper', () => {
  const { cleanObject } = createRequire(import.meta.url)('../server/object-format.js');
  const sw = cleanObject({ kind: 'flight', title: 'Southwest 1234', details: {
    airline: 'Southwest', number: 1234, from: { code: 'MDW', name: 'Chicago Midway' }, to: 'SJC',
    departs: '2026-11-14T12:50', arrives: '2026-11-14T15:25', minutes: 155, reference: 'ABC123',
  } }, { imported: true });
  const lines = ['Airline: Southwest', 'Number: 1234', 'From: Chicago Midway (MDW)', 'To: SJC', 'Departs: 2026-11-14 12:50', 'Arrives: 2026-11-14 15:25', 'Minutes: 155', 'Reference: ABC123'];
  assert.deepEqual(detailLines(sw.details), lines);
  assert.equal(suggestionInput(sw).content, `${lines.join('\n')}\n\nExternal source`);
  assert.equal(keepInput(sw, '').body, `${lines.join('\n')}\n\nExternal source`);
  const hotel = { title: 'Casa', content: 'Two nights.', kind: 'hotel', details: { checkIn: '2026-11-14', checkOut: '2026-11-16T11:00', guests: 2 } };
  assert.equal(keepInput(hotel, '').body, 'Two nights.\n\nCheck in: 2026-11-14\nCheck out: 2026-11-16 11:00\nGuests: 2');
  assert.deepEqual(detailLines({ options: ['Tasca', 'Marisqueira'], multiple: false, allDay: true, upload: '0123456789abcdef01234567' }), ['Options: Tasca, Marisqueira', 'Multiple: no', 'All day: yes']);
  for (const none of [undefined, null, 'x', [], {}]) assert.deepEqual(detailLines(none), []);
  // No details: exactly as before.
  assert.equal(keepInput({ title: 'T', content: 'Just words.' }, '').body, 'Just words.');
  assert.equal(suggestionInput({ title: 'T', content: 'Just words.', kind: 'tour' }).content, 'Just words.');
  // A dropped picture gets its own words in the import's summary.
  assert.match(chat, /if \(why === 'it is a picture'\) return n === 1 \? "1 was a picture, which can't be imported" : `\$\{n\} were pictures, which can't be imported`;/);
});

console.log(`check-chat-page: OK (${n} tests)`);
