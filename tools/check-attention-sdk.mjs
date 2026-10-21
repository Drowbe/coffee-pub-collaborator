#!/usr/bin/env node
/*
 * check-attention-sdk.mjs -- the front end of "what needs action" (documentation/plans/plan-space-status-strip.md,
 * "Attention, the contract", steps 3 and 4), read as code: host.attention.set / clear in the SDK and the module host (a
 * route for the current space and module, none for a guest, a keyed page or a page outside a space, the shape cut to the
 * server's limits), the count in the status strip (only above zero, "1 needs action" / "N need action", its own polite
 * status, written only when the count changes, the shared menu with a section per module, the strip kept for a space
 * without phases once a count arrives, read on load, on a report, on focus and slowly), the phase icons in the journey bar,
 * and Polls reporting its unvoted open polls. The server half is check-attention.mjs; a live run needs a browser.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sdk = read('public/sdk/host.js');
const mh = read('public/module-host.js');
const space = read('public/space.js');
const css = read('public/style.css');
const polls = read('modules/polls/src/polls.js');
let n = 0;
const ok = (cond, label) => { assert.ok(cond, label); n += 1; };
const has = (text, re, label) => { assert.match(text, re, label); n += 1; };

// --- the SDK -------------------------------------------------------------------------------------------------------
has(sdk, /attention: \{\n\s*set: \(report\) => call\('attention\.set', report \|\| \{\}\),\n\s*clear: \(\) => call\('attention\.clear'\),\n\s*\},/, 'host.attention.set and clear call the host');
has(sdk, /Detect it with `if \(host\.attention\)`/, 'the SDK says how to detect it');

// --- the module host -----------------------------------------------------------------------------------------------
has(mh, /const attentionPlace = \(\) => \(scope === 'space' && spaceId && !guestToken && !keyed \? `\/api\/spaces\/\$\{encodeURIComponent\(spaceId\)\}\/attention\/\$\{encodeURIComponent\(module\.id\)\}` : null\);/, 'the route is for this space and this module; none outside a space, for a guest or a keyed page');
has(mh, /async 'attention\.set'\(report\) \{\n\s*const place = attentionPlace\(\);\n\s*if \(!place\) return false;/, 'set resolves false where there is no space');
has(mh, /async 'attention\.clear'\(\) \{\n\s*const place = attentionPlace\(\);\n\s*return place \? sendAttention\('DELETE', place\) : false;/, 'clear resolves false where there is no space');
has(mh, /Math\.min\(99, Math\.max\(0, count\)\)/, 'the count is cut to 0..99');
has(mh, /slice\(0, 40\)/, 'the label is cut to 40');
has(mh, /\.slice\(0, 20\)\.map\(\(i\) => \(\{\n\s*title: String\(i\?\.title \?\? ''\)\.slice\(0, 120\),\n\s*\.\.\.\(REF_SHAPE\(i\?\.object\) \? \{ object: cleanPointer\(i\.object\) \} : \{\}\),/, 'at most 20 items, a title cut to 120, an object only when it is a reference');
has(mh, /await api\(method, place, body\);/, 'the server route is called');
has(mh, /err\.status === 401 \|\| err\.status === 403 \|\| err\.status === 404\) return false;/, 'a role that may not write is answered false, other errors reject');
has(mh, /new CustomEvent\('app:attention', \{ detail: \{ space: spaceId \} \}\)/, 'the page is told so the strip reads again');
// A guest page does not call: the route is never built for a guest token.
ok(!/attention[^\n]*guest=/.test(mh), 'no guest token on the attention route');

// --- the strip ----------------------------------------------------------------------------------------------------
has(space, /statusAttention\.setAttribute\('role', 'status'\);/, 'the count is its own polite status');
has(space, /attentionButton\.type = 'button';/, 'the count is a button');
has(space, /attentionButton\.setAttribute\('aria-haspopup', 'menu'\);/, 'it opens a menu');
has(space, /const words = n === 1 \? '1 needs action' : `\$\{n\} need action`;/, 'the words');
has(space, /statusAttention\.hidden = n < 1;/, 'shown only above zero');
has(space, /if \(n > 0 && attentionButton\.textContent !== words\) \{/, 'written only when the count changes');
has(space, /const phaseChipWanted = \(\) => Boolean\(currentSpace\) && !inAside\(\) && !viewingHome && !guestToken && me\?\.role !== 'guest' && \(phasesWanted\(\) \|\| attentionSeen\);/, 'the strip shows with phases, or once a count has arrived; never in an aside, on Home or for a guest');
has(space, /if \(attention\.total > 0\) attentionSeen = true;/, 'a count above zero keeps the strip for the visit');
has(space, /if \(id === attention\.spaceId\) return;\n\s*attention = \{ spaceId: id, modules: \[\], total: 0 \};\n\s*attentionSeen = false;\n\s*if \(id\) loadAttention\(\);/, 'entering another space starts a new visit and reads the count');
has(space, /api\('GET', `\/api\/spaces\/\$\{encodeURIComponent\(id\)\}\/attention`\)/, 'it reads the server');
has(space, /window\.addEventListener\('app:attention'/, 'it reads again when a module reports');
has(space, /window\.addEventListener\('focus', loadAttentionSoon\);/, 'and on focus');
has(space, /setInterval\(\(\) => \{ if \(!document\.hidden\) loadAttention\(\); \}, 60000\);/, 'and slowly');
has(space, /attentionButton\.addEventListener\('click', \(\) => openHostMenu\(attentionButton, attentionMenuItems\)\);/, 'the shared menu opens on the count');
has(space, /items\.push\(\{ heading: m\.name \|\| m\.module \}\);/, 'a section per module, with its name');
has(space, /onPick: \(\) => openAttentionTarget\(m\.module, item\.object\)/, 'an item opens its object');
has(space, /onPick: \(\) => openAttentionTarget\(m\.module\) \}/, 'the label opens the module');
has(space, /canvas\.open\(moduleId\);\n\s*if \(object && object\.module\) canvas\.openRef\(object\);/, 'the module opens, then the object');
ok(!/attentionButton\.(style|innerHTML)/.test(space), 'no inline colours or markup on the count');

// --- phase icons in the journey bar ------------------------------------------------------------------------------
has(space, /icon\.className = `fa-solid fa-\$\{b\.i\} sdk-band-icon`;/, 'a phase\'s icon in its band');
has(space, /i: phaseIcons\[b\.id\] \|\| ''/, 'the band\'s icon is the template\'s phase icon');
has(space, /typeof p\.icon === 'string' && \/\^\[a-z0-9-\]\+\$\/\.test\(p\.icon\)/, 'only a plain icon name is used');

// --- the look: theme tokens only (the Journey bar family, public/sdk/system.css) ---------------------------------
const sys = read('public/sdk/system.css');
const look = sys.slice(sys.indexOf('/* journey:start */'), sys.indexOf('/* journey:end */'));
const block = css.slice(css.indexOf('/* status-strip:start'), css.indexOf('/* status-strip:end */'));
has(look, /\.sdk-strip-attn \{[^}]*--chip-tone: var\(--status-warn-fill\);[^}]*background: color-mix\(in srgb, var\(--chip-tone\) 18%, var\(--surface-bar-top\)\);/, 'the count is a warn tone chip, not a solid accent pill');
has(look, /\.sdk-strip-attn-slot \{ display: flex; flex: none; align-items: center; margin-left: auto; \}/, 'the count sits at the strip\'s right end');
has(look, /\.sdk-strip-attn-n \{[^}]*min-width: 18px;[^}]*height: 18px;[^}]*border-radius: var\(--radius-round\);/, 'its number is a Chips count');
has(block, /\.sdk-strip\.attention-only > :not\(\.sdk-strip-attn-slot\) \{\n\s*display: none;/, 'a space without phases shows the count alone');
has(space, /count\.className = 'sdk-strip-attn-n';/, 'the count in its own span, made as elements');
const added = look.slice(look.indexOf('.sdk-strip-attn-slot {'), look.indexOf('/* ---- the journey bar'));
ok(added.length > 0 && !/#[0-9a-fA-F]{3,8}\b|rgba?\(/.test(added), 'no colour literals in the count\'s rules');

// --- Polls ---------------------------------------------------------------------------------------------------------
has(polls, /if \(!inSpace \|\| !host\.attention\) return;/, 'Polls reports only in a space');
has(polls, /canVote \? \[\.\.\.polls\.values\(\)\]\.filter\(\(x\) => x\.scope === 'own' && !isClosed\(x\.p\) && !tally\(x\)\.mine\.length\) : \[\]/, 'the open polls here the person has not voted in');
has(polls, /host\.objects\.make\('poll', x\.id\)/, 'each item opens its poll');
has(polls, /\(report\.count \? host\.attention\.set\(report\) : host\.attention\.clear\(\)\)/, 'none left clears');
has(polls, /syncStatus\(\);\n\s*syncAttention\(\);\n\s*\}/, 'every render, so after each vote');

console.log(`check-attention-sdk: ${n} checks passed`);
