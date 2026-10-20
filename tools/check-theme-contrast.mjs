#!/usr/bin/env node
// Drift guard: the shipped themes stay readable (documentation/plans/plan-design-system.md, (e)).
// For each shipped theme (Strong Coffee, the built-in default in server/store.js DEFAULT_THEME, and the built-ins
// Calming Teal and Burnt Orange from BUILTIN_THEMES) and each mode (light, dark) it works out the WCAG 2 contrast
// ratio of the pairs people read, from the theme's own colours, and prints them all:
//   text, text-dim                 on bg, bg-section and bg-card (bg-card is the stylesheet's own Auto: 85% bg, 15% border)
//   accent                         as text on bg and bg-section
//   on-accent                      on accent
//   danger text                    70% of the danger red (#b8503f) mixed into text, on bg and bg-section
//   danger-text (style.css today)  the stylesheet's own --danger-text, 55% of the danger red mixed with white, same two
//   selected text                  accent 55% mixed into text, on the selected fill (accent at 28% over bg)
//   border on bg                   non-text, reported against 3 but never failing
// Every pair above except the border must reach 4.5. The ones that do not today are recorded in
// tools/check-theme-contrast-allow.json as the ratio they have now (a floor). The check fails when a pair below 4.5 is
// not recorded, or is worse than its recorded ratio, and says when a pair has got better and the record can be tightened.
// It reads the themes; it changes none.
//
//   node tools/check-theme-contrast.mjs                  the check (prints the table)
//   node tools/check-theme-contrast.mjs --update         raise the recorded floors and drop pairs that now pass (never lowers)
//   node tools/check-theme-contrast.mjs --update --force-raise   also record a new or worse pair (how it was first made)
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { parseHex, mix, over, contrast } from './lib/contrast.mjs';

process.env.PRODUCT_NAME ||= 'Testname';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ALLOW = path.join(ROOT, 'tools', 'check-theme-contrast-allow.json');
const NEED = 4.5;
const NON_TEXT = 3;
const DANGER = parseHex('#b8503f'); // --danger in style.css :root; a status colour, not set by a theme
const WHITE = [255, 255, 255];

// BUILTIN_THEMES is not exported by the store, so its source is read and the list evaluated as it stands.
const require = createRequire(import.meta.url);
const { DEFAULT_THEME } = require('../server/store.js');
const src = fs.readFileSync(path.join(ROOT, 'server', 'store.js'), 'utf8');
const block = /const BUILTIN_THEMES = (\[[\s\S]*?\n\]);/.exec(src);
if (!block) throw new Error('check-theme-contrast: BUILTIN_THEMES not found in server/store.js');
const BUILTIN = vm.runInNewContext(block[1]);
const THEMES = [DEFAULT_THEME, ...BUILTIN];

const rows = []; // { id, theme, mode, pair, ratio, need }
for (const theme of THEMES) {
  for (const mode of ['light', 'dark']) {
    const set = theme[mode];
    if (!set) continue;
    const c = Object.fromEntries(Object.entries(set).map(([k, v]) => [k, parseHex(v)]));
    const card = mix(c.bg, 85, c.border);
    const add = (pair, fg, bg, need = NEED) => rows.push({ id: `${theme.name} / ${mode} / ${pair}`, theme: theme.name, mode, pair, ratio: contrast(fg, bg), need });
    for (const [name, bg] of [['bg', c.bg], ['bg-section', c.bgSection], ['bg-card', card]]) {
      add(`text on ${name}`, c.text, bg);
      add(`text-dim on ${name}`, c.textDim, bg);
    }
    add('accent on bg', c.accent, c.bg);
    add('accent on bg-section', c.accent, c.bgSection);
    add('on-accent on accent', c.onAccent, c.accent);
    for (const [name, bg] of [['bg', c.bg], ['bg-section', c.bgSection]]) {
      add(`danger text (70% danger in text) on ${name}`, mix(DANGER, 70, c.text), bg);
      add(`danger-text (style.css, 55% danger + white) on ${name}`, mix(DANGER, 55, WHITE), bg);
    }
    add('selected text on selected fill', mix(c.accent, 55, c.text), over(c.accent, 0.28, c.bg));
    add('border on bg (non-text)', c.border, c.bg, NON_TEXT);
  }
}

const floor = (r) => Math.floor(r * 100) / 100;
const nonText = (r) => r.pair.includes('non-text');
const allowed = fs.existsSync(ALLOW) ? JSON.parse(fs.readFileSync(ALLOW, 'utf8')).floors || {} : {};
const update = process.argv.includes('--update');
const forceRaise = process.argv.includes('--force-raise');

const failing = rows.filter((r) => !nonText(r) && r.ratio < NEED);
const fresh = failing.filter((r) => !(r.id in allowed));
const worse = failing.filter((r) => r.id in allowed && r.ratio < allowed[r.id] - 0.005);
const better = Object.keys(allowed).filter((id) => {
  const r = rows.find((x) => x.id === id);
  return !r || r.ratio >= NEED || r.ratio > allowed[id] + 0.01;
});

if (update) {
  if ((fresh.length || worse.length) && !forceRaise) {
    console.error('check-theme-contrast: refusing to update, a pair is new or worse than recorded (a ratchet only improves). Fix the theme, or pass --force-raise to record it on purpose:');
    for (const r of [...fresh, ...worse]) console.error(`  ${r.id}: ${r.ratio.toFixed(2)}`);
    process.exitCode = 1;
  } else {
    const next = Object.fromEntries(failing.sort((a, b) => a.id.localeCompare(b.id)).map((r) => [r.id, floor(r.ratio)]));
    fs.writeFileSync(ALLOW, `${JSON.stringify({ about: 'check-theme-contrast: the pairs of the shipped themes that read below 4.5 today, each with the ratio it has (a floor). A pair may get better, never worse, and no new pair may fall below 4.5. Tighten with: node tools/check-theme-contrast.mjs --update', floors: next }, null, 2)}\n`);
    console.log(`check-theme-contrast: allow-list written, ${Object.keys(next).length} pair(s) recorded`);
  }
} else {
  const w = Math.max(...rows.map((r) => r.id.length));
  console.log(`${'pair'.padEnd(w)}  ratio  need  state`);
  for (const r of rows) {
    const state = nonText(r) ? (r.ratio >= NON_TEXT ? 'ok (report only)' : 'low (report only)')
      : r.ratio >= NEED ? 'ok'
        : fresh.includes(r) ? 'FAIL new' : worse.includes(r) ? `FAIL worse than ${allowed[r.id].toFixed(2)}` : `known (${allowed[r.id].toFixed(2)})`;
    console.log(`${r.id.padEnd(w)}  ${r.ratio.toFixed(2).padStart(5)}  ${String(r.need).padStart(4)}  ${state}`);
  }
  if (fresh.length || worse.length) {
    console.error(`check-theme-contrast: FAIL, ${fresh.length} pair(s) fall below ${NEED} that tools/check-theme-contrast-allow.json does not record, ${worse.length} are worse than recorded. Change the colours (or the formula) so they read better.`);
    process.exitCode = 1;
  } else {
    console.log(`check-theme-contrast: ${rows.length} pairs in ${THEMES.length} themes, ${failing.length} below ${NEED} and all recorded, none worse`);
    for (const id of better) console.log(`  can tighten: ${id} is now ${rows.find((x) => x.id === id)?.ratio.toFixed(2) ?? 'gone'}, recorded ${allowed[id].toFixed(2)}`);
    if (better.length) console.log('  run: node tools/check-theme-contrast.mjs --update');
  }
}
