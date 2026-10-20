#!/usr/bin/env node
// Drift guard: icons are solid and come in a few sizes (documentation/plans/plan-design-system.md, (e)).
// Two rules, both best effort:
//   1. Style. Font Awesome is used in its solid style only. A class of fa-regular, fa-light, fa-thin, fa-duotone,
//      fa-sharp or fa-brands is an offender (counted per file and class), in the CSS, JS and HTML of public/ and
//      modules/*/src. The brand glyphs that are really needed are recorded in the allow-list like everything else.
//   2. Size. A font-size in pixels that is not 12, 14, 16, 20 or 24, on a CSS rule whose selector names an icon (the
//      selector contains "icon", "glyph", "fa-", or a class or id word of "ic"), or on a line of script that sets
//      a font size and names an icon or glyph, is an offender, counted per file as "size Npx". A rule that sizes
//      other things as well (a selector list that mixes an icon with text) is read the same way, so it can be a false
//      alarm; the allow-list holds today's.
// public/design-system and MapLibre are not read.
//
// Today's offenders are recorded in tools/check-icons-allow.json. The check passes while no count is higher, fails on
// a higher count or a new file or key, and says when a count has dropped.
//   node tools/check-icons.mjs                 the check
//   node tools/check-icons.mjs --update        lower the allow-list to today's counts (never raises)
//   node tools/check-icons.mjs --update --force-raise   also allow raising (how it was first made)
import { collectFiles, declarations, clean, lineOf, stripCalls, Tally, runRatchet, summary } from './lib/drift.mjs';

const SIZES = new Set([12, 14, 16, 20, 24]);
const ICON_SELECTOR = /icon|glyph|fa-|(?:^|[^a-z0-9])ic(?:[^a-z0-9]|$)/i;
const NOT_SOLID = /\bfa-(regular|light|thin|duotone|sharp|brands)\b/g;

const tally = new Tally();
for (const file of collectFiles(/\.(css|js|html)$/)) {
  const text = clean(file.text, file.kind === 'html' ? 'css' : file.kind);
  for (const m of text.matchAll(NOT_SOLID)) tally.add(file.rel, `fa-${m[1]}`, lineOf(text, m.index));
  if (file.kind === 'html') continue;
  const lines = text.split('\n');
  for (const d of declarations(file)) {
    if (d.prop !== 'font-size') continue;
    // A CSS rule is judged by its selector; a script by the text of its own line.
    const subject = file.kind === 'css' ? d.selector : lines[d.line - 1];
    if (!ICON_SELECTOR.test(subject)) continue;
    for (const m of stripCalls(d.value).matchAll(/(?<![\w.$#-])(\d*\.?\d+)px\b/g)) {
      if (!SIZES.has(Number(m[1]))) tally.add(file.rel, `size ${Number(m[1])}px`, d.line);
    }
  }
}

runRatchet({
  name: 'check-icons',
  allowFile: 'check-icons-allow.json',
  about: 'check-icons: today\'s non-solid Font Awesome classes (fa-regular, fa-brands ...) and icon font sizes other than 12 14 16 20 24 px, per file. Counts may only fall; lower them with: node tools/check-icons.mjs --update',
  tally,
  unit: 'icon style or size offenders',
  extraReport: summary(tally, 'kind'),
});
