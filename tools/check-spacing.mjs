#!/usr/bin/env node
// Drift guard: spacing stays on the scale (documentation/plans/plan-design-system.md, (e)).
// The scale, in pixels, is 0, 1, 2, 4, 8, 12, 16, 20, 24, 32, 40 and 48. A padding, margin, gap, row-gap, column-gap or
// inset written in pixels (also padding-top and the other sides, inset-block and so on) that is not on the scale is an
// offender, and so is a negative one whose size is off the scale (-6px; -8px is fine). auto, %, em, rem and anything
// inside calc(), var(), min(), max() or clamp() are not read. Top, left, right and bottom on their own are not read.
// It reads public/*.css, public/sdk/*.css, modules/*/src/*.css and the CSS inside the .js files of public and
// modules/*/src (style strings, el.style.padding, { padding: '6px' }); not public/design-system or MapLibre.
//
// Today's strays are recorded per file and value in tools/check-spacing-allow.json. The check passes while no count is
// higher, fails on a higher count or a new file or value, and says when a count has dropped.
//   node tools/check-spacing.mjs                 the check
//   node tools/check-spacing.mjs --update        lower the allow-list to today's counts (never raises)
//   node tools/check-spacing.mjs --update --force-raise   also allow raising (how it was first made)
import { collectFiles, declarations, stripCalls, Tally, runRatchet, summary } from './lib/drift.mjs';

const SCALE = new Set([0, 1, 2, 4, 8, 12, 16, 20, 24, 32, 40, 48]);
const PROP = /^(?:(?:padding|margin)(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?|gap|row-gap|column-gap|grid-gap|inset(?:-(?:block|inline)(?:-(?:start|end))?)?)$/;

const tally = new Tally();
for (const file of collectFiles()) {
  for (const d of declarations(file)) {
    if (!PROP.test(d.prop)) continue;
    for (const m of stripCalls(d.value).matchAll(/(?<![\w.$#-])(-?\d*\.?\d+)px\b/g)) {
      if (SCALE.has(Math.abs(Number(m[1])))) continue;
      tally.add(file.rel, `${Number(m[1])}px`, d.line);
    }
  }
}

runRatchet({
  name: 'check-spacing',
  allowFile: 'check-spacing-allow.json',
  about: 'check-spacing: today\'s spacing values off the scale (0 1 2 4 8 12 16 20 24 32 40 48 px), per file and value. Counts may only fall; lower them with: node tools/check-spacing.mjs --update',
  tally,
  unit: 'off-scale spacing values',
  extraReport: summary(tally, 'value'),
});
