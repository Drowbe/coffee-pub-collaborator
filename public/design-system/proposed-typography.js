/* The Typography family (proposed): the three UI font candidates, the headline candidates, and how the labels sit in a button. Loaded by proposed.html through proposed-families.json, after proposed.js (the page engine); it registers one family
   through window.DS_PROPOSED.families.push and draws it with the rules in proposed-typography.css. Nothing here is a style of the product:
   markup, words and tables only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules (.pm-row, .pm-role ...), from the page engine
  // The buttons the sample bars show, so the font is seen on every role (this family's own copy: it needs nothing from the Buttons file).
  const TEXT_ROLES = [
    { cls: 'btn-primary', label: 'Save' },
    { cls: '', label: 'Edit' },
    { cls: 'btn-danger', label: 'Delete' },
    { cls: 'btn-danger solid', label: 'Delete for good' },
    { cls: 'btn-quiet', label: 'Cancel' },
    { cls: 'on', attrs: ' aria-pressed="true"', label: 'Muted' },
  ];
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // Where the letters sit in a button, measured by ink on 2026-10-16 in headless Chromium 141 on Linux (tools in the report, same method as
  // tools/check-design-system.mjs: a 4x screenshot of a 1px-bordered button, 12 labels with no descenders, weight 500, line-height 1).
  // Each cell is the mean offset in px of the letters' middle from the button's middle (+ low, - high), then the worst label in brackets.
  const CENTRE = [
    ["Today: the system stack (here Liberation Sans, which stands in for Arial)", ["+0.06 (0.25)","+0.44 (0.63)","-1.57 (1.63)","-0.20 (0.25)"], ["-0.38 (0.50)","+0.50 (0.50)","-1.00 (1.00)","-0.50 (0.50)"]],
    ["Other system font on this machine: DejaVu Sans", ["-1.20 (1.25)","-0.82 (0.88)","-0.95 (1.00)","-0.45 (0.50)"], ["-0.38 (0.50)","+0.13 (0.50)","-1.00 (1.00)","-0.88 (1.00)"]],
    ["Other system font on this machine: FreeSans", ["-1.03 (1.13)","-0.66 (0.75)","-1.66 (1.75)","-1.28 (1.38)"], ["-1.42 (1.50)","-1.00 (1.00)","-1.00 (1.00)","-0.67 (1.00)"]],
    ["Figtree, the font's own metrics", ["-0.94 (1.00)","+0.44 (0.50)","-0.59 (0.75)","-0.19 (0.25)"], ["-1.00 (1.00)","+0.00 (0.00)","-0.50 (0.50)","-0.04 (0.50)"]],
    ["Figtree, with the fix", ["+0.06 (0.13)","+0.44 (0.50)","-0.59 (0.75)","-0.19 (0.25)"], ["+0.00 (0.00)","+0.00 (0.00)","-0.50 (0.50)","+0.00 (0.00)"]],
    ["Figtree, fallback face, with the fix", ["+0.18 (0.38)","+0.43 (0.63)","-0.70 (0.75)","-0.32 (0.38)"], ["-0.38 (0.50)","+0.50 (0.50)","-1.00 (1.00)","-0.50 (0.50)"]],
    ["Nunito Sans, the font's own metrics", ["-0.89 (1.00)","-0.63 (0.63)","-0.53 (0.63)","-0.25 (0.25)"], ["-1.00 (1.00)","-1.00 (1.00)","-0.50 (0.50)","-0.50 (0.50)"]],
    ["Nunito Sans, with the fix", ["+0.11 (0.13)","+0.38 (0.38)","+0.47 (0.50)","-0.25 (0.25)"], ["+0.00 (0.00)","+0.00 (0.00)","+0.50 (0.50)","-0.50 (0.50)"]],
    ["Nunito Sans, fallback face, with the fix", ["-0.07 (0.13)","+0.43 (0.63)","+0.30 (0.50)","-0.32 (0.38)"], ["-0.38 (0.50)","+0.50 (0.50)","+0.00 (0.00)","-0.50 (0.50)"]],
    ["Source Sans 3, the font's own metrics", ["-0.70 (0.75)","-0.42 (0.50)","-0.42 (0.50)","-1.04 (1.13)"], ["-0.88 (1.00)","-0.88 (1.00)","-0.38 (0.50)","-1.00 (1.00)"]],
    ["Source Sans 3, with the fix", ["+0.30 (0.50)","+0.58 (0.88)","+0.58 (0.88)","-0.04 (0.25)"], ["+0.13 (0.50)","+0.13 (0.50)","+0.63 (1.00)","+0.00 (0.00)"]],
    ["Source Sans 3, fallback face, with the fix", ["+0.43 (0.63)","+0.68 (0.88)","+0.80 (1.00)","+0.03 (0.13)"], ["+0.50 (0.50)","+0.50 (0.50)","+0.63 (1.00)","+0.00 (0.00)"]],

  ];
  const CENTRE_HEAD = ['Text', '14px in 38px (default button)', '13px in 30px (small button)', '16px in 44px (phone field)', '12px in 30px'];
  const FIX_ROWS = [
    ['Figtree', '0.700', '0.950 / 0.250 (0.700)', '0.95 / 0.24 (0.710)', '100.59% / 95.67%', '94.44% / 23.86%'],
    ['Nunito Sans', '0.705', '1.011 / 0.353 (0.658)', '1.04 / 0.32 (0.720)', '100.93% / 96.50%', '103.04% / 31.71%'],
    ['Source Sans 3', '0.660', '1.024 / 0.400 (0.624)', '1.08 / 0.34 (0.740)', '93.32% / 90.20%', '115.73% / 36.43%'],
  ];
  const FIX_CODE = `/* The bundled font: the box and the baseline no longer depend on the font's own tables */
@font-face { font-family: "Figtree"; font-style: normal; font-weight: 300 900; font-display: swap;
  ascent-override: 95%; descent-override: 24%; line-gap-override: 0%;
  src: url(fonts/figtree/latin.woff2) format("woff2"); unicode-range: U+0000-00FF, ...; }
/* The fallback: Arial, as wide as Figtree, with Figtree's ascent and descent (override / size-adjust) */
@font-face { font-family: "Figtree Fallback"; font-weight: 100 599;
  src: local("Arial"), local("Helvetica"), local("Liberation Sans");
  size-adjust: 100.59%; ascent-override: 94.44%; descent-override: 23.86%; line-gap-override: 0%; }
@font-face { font-family: "Figtree Fallback"; font-weight: 600 900;
  src: local("Arial Bold"), local("Arial-BoldMT"), local("Helvetica Bold"), local("Liberation Sans Bold");
  size-adjust: 95.67%; ascent-override: 99.3%; descent-override: 25.09%; line-gap-override: 0%; }
:root { --font-ui: "Figtree", "Figtree Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; }`;
  const CENTRE_HTML = (tbl, h) => `<p class="ds-desc"><b>Yes, within 1px, in all three, with a normal button: 1px border, 14px side padding, <code>line-height: 1</code>, as the approved Buttons are.</b> Measured by ink, the way <code>tools/check-design-system.mjs</code> does it: a 4x screenshot of the button, the middle of the letters against the middle of the box. 12 labels with no descenders (Save, Edit, Delete, Cancel, Muted, Add, Filter, Clear, Done, Back, Invite, Rename), weight 500. Each cell is the mean in px (<b>+ is low, - is high</b>) and, in brackets, the worst label. Headless Chromium 141 on Linux; this machine has no Segoe UI, San Francisco or Roboto, so Today's row is Liberation Sans, which stands in for Arial.</p>
<p class="pm-meas-h">Ink on a 4x screenshot (the check's method)</p>
${tbl(CENTRE_HEAD, CENTRE.map((r) => [r[0]].concat(r[1])))}
<p class="pm-meas-h">The same on a screen at 1x, where the baseline snaps to a whole pixel</p>
${tbl(CENTRE_HEAD, CENTRE.map((r) => [r[0]].concat(r[2])))}
<p class="ds-desc"><b>What it shows.</b> With the fix, every candidate sits within 0.7px of centre at the default and the small button (worst label 0.9px), bundled or in its fallback face, at 4x and at 1x. With each font's own tables the label is 0.7 to 1.0px <i>high</i> at the default size, so the same button would be on the edge of the 1px limit; and it moves with the font and the size. Today's stack, as it resolves here, is fine at 14px but 1.6px high at 16px (the phone's field size), and the two other system fonts on this machine are 1.0 to 1.7px off: that spread, a different one on every device, is the buttons that look off. I could not measure Segoe UI, San Francisco or Roboto here.</p>
<h4 class="ds-h4" id="typography-code">The fix: font-metric overrides</h4>
<p class="ds-desc"><b>Why a label looks off.</b> With <code>line-height: 1</code> the browser puts the line in the middle of the button and the baseline at (ascent - descent) / 2 below that middle, using the ascent and descent in the font's own tables, rounded to whole pixels. Letters are centred when ascent - descent equals the cap height. Fonts differ in ascent, descent and in how they round at 14px, so the same CSS gives a different result in each font. <b>The fix:</b> set <code>ascent-override</code>, <code>descent-override</code> and <code>line-gap-override</code> in the <code>@font-face</code> so the numbers are ours, in every browser, and give the fallback face the same ones.</p>
${tbl(['Font', 'Cap height (em)', 'Own ascent / descent (difference)', 'Override ascent / descent (difference)', 'Fallback size-adjust: regular / bold', 'Fallback ascent / descent (regular)'], FIX_ROWS)}
<p class="ds-desc"><b>How the numbers were found.</b> (1) The difference, ascent minus descent, is set a little above the cap height (the tall letters l, d, t rise above it), and the sum is kept near the font's own so <code>line-height: normal</code> hardly changes. (2) Because the browser rounds, each pair was then swept: ascent in 1% steps within 10% of the font's own, descent within 12%, six labels at 14px in 38px and 13px in 30px, at 1x and 4x, and the pair nearest the font's own sum that keeps every label within 0.5px (0.75px for Source Sans 3, whose cap height is a fraction of a pixel off at both sizes) was taken. Figtree's own numbers already have ascent - descent = cap height, yet it sits 0.9px high at 14px: its descent, 25% of 14px, is 3.5px, a tie. The sweep moved it to 24%. (3) The fallback's size-adjust makes the same sample of UI text (three sentences and a row of labels, weights 400 to 500; 600 to 700 for the bold face) as wide as in the bundled font, measured in the browser; its ascent and descent are the bundled ones divided by size-adjust.</p>
<p class="ds-desc"><b>Checked.</b> The ascent and descent the browser reports at 100px, bundled and fallback: Figtree 95 / 24 and 95 / 24, Nunito Sans 104 / 32 and 104 / 32, Source Sans 3 108 / 34 and 108 / 34 (unadjusted Arial: 91 / 21). So the line box is the same height in both. The widths are in the table above. Only measured in Chromium; Firefox and Safari honour the same descriptors but were not run here.</p>
<pre class="ds-pre">${h(FIX_CODE)}</pre>`;

  // ---- Typography (PROPOSED): three candidate fonts, bundled and self-hosted. The faces are in proposed.css; the files in fonts/. ----
  const TY_CSS = `
.pm-ty { display: grid; gap: 18px; }
.pm-ty-h { margin: 0 0 6px; color: var(--text-dim); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.pm-ty-row { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 2px 14px; align-items: baseline; padding: 5px 0; }
.pm-ty-row + .pm-ty-row { border-top: 1px solid var(--border); }
.pm-ty-meta { color: var(--text-dim); font-family: var(--font-system); font-size: 11px; line-height: 1.3; }
.pm-ty-meta b { display: block; color: var(--text); font-size: 11px; font-weight: 600; }
.pm-t28 { font-size: 28px; font-weight: 700; line-height: 1.2; }
.pm-t22 { font-size: 22px; font-weight: 700; line-height: 1.2; }
.pm-t18 { font-size: 18px; font-weight: 600; line-height: 1.2; }
.pm-t16 { font-size: 16px; font-weight: 400; line-height: 1.5; }
.pm-t14 { font-size: 14px; font-weight: 400; line-height: 1.4; }
.pm-t14s { font-size: 14px; font-weight: 600; line-height: 1.4; }
.pm-t13 { font-size: 13px; font-weight: 600; line-height: 1.4; }
.pm-t12 { font-size: 12px; font-weight: 400; line-height: 1.4; color: var(--text-dim); }
.pm-t11 { font-size: 11px; font-weight: 700; line-height: 1.3; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-dim); }
.pm-t10 { font-size: 10px; font-weight: 700; line-height: 1.3; letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-dim); }
.pm-body { max-width: 62ch; margin: 0 0 8px; font-size: 14px; line-height: 1.4; }
.pm-cover { margin: 0; font-size: 14px; line-height: 1.5; overflow-wrap: anywhere; }
.pm-bar + .pm-bar { margin-top: 10px; }
.pm-bar + .pm-ty-h { margin-top: 14px; }
.pm-ty-note { margin: 0 0 8px; color: var(--text-dim); font-size: 12px; }
.pm-meas-t { width: 100%; border-collapse: collapse; font-family: var(--font-system); font-size: 12px; }
.pm-meas-t th, .pm-meas-t td { padding: 5px 8px 5px 0; border-bottom: 1px solid var(--border); text-align: left; vertical-align: baseline; }
.pm-meas-t th { color: var(--text-dim); font-size: 10px; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
.pm-meas-t .pm-s { display: inline-block; white-space: nowrap; font-size: 14px; font-weight: 400; background: color-mix(in srgb, var(--accent) 16%, transparent); }
.pm-meas-t .pm-n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.pm-meas-h { margin: 14px 0 4px; font-family: var(--font-system); font-size: 13px; font-weight: 700; }
.pm-meas-h:first-child { margin-top: 0; }
.pm-f-figtree { font-family: "Figtree", sans-serif; }
.pm-f-nunito-sans { font-family: "Nunito Sans", sans-serif; }
.pm-f-source-sans-3 { font-family: "Source Sans 3", sans-serif; }
.pm-fb-figtree { font-family: "Figtree Fallback", sans-serif; }
.pm-fb-nunito-sans { font-family: "Nunito Sans Fallback", sans-serif; }
.pm-fb-source-sans-3 { font-family: "Source Sans 3 Fallback", sans-serif; }
.pm-f-arial { font-family: Arial, sans-serif; }
.pm-f-today { font-family: var(--font-system); }
@media (max-width: 640px) {
  .pm-ty-row { grid-template-columns: minmax(0, 1fr); }
}
.pm-h-row { display: grid; grid-template-columns: 112px minmax(0, 1fr); gap: 2px 14px; align-items: baseline; padding: 5px 0; }
.pm-h-row + .pm-h-row { border-top: 1px solid var(--border); }
.pm-h40 { font-size: 40px; font-weight: 800; line-height: 1.1; }
.pm-h28 { font-size: 28px; font-weight: 700; line-height: 1.2; }
.pm-h22 { font-size: 22px; font-weight: 700; line-height: 1.2; }
.pm-h18 { font-size: 18px; font-weight: 700; line-height: 1.2; }
.pm-h17 { font-size: 17px; font-weight: 700; line-height: 1.2; }
.pm-tb { box-sizing: border-box; display: flex; align-items: center; width: 320px; max-width: 100%; padding: 0 10px; border: 1px solid var(--border); border-radius: var(--radius-small); background: var(--bg-section); line-height: 1; font-weight: 700; white-space: nowrap; overflow: hidden; }
.pm-tb + .pm-tb { margin-top: 8px; }
.pm-mock { padding: 14px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg); }
.pm-mock + .pm-mock { margin-top: 14px; }
.pm-mock .topbar { position: relative; top: auto; width: auto; margin: 6px 0 0; border-radius: var(--radius-small); }
.pm-note { margin: 6px 0 0; color: var(--text-dim); font-family: var(--font-system); font-size: 12px; }
.pm-stay { margin-top: 10px; }
.pm-hf-figtree { font-family: "Figtree", sans-serif; }
.pm-hf-archivo { font-family: "Archivo", sans-serif; }
.pm-hf-fraunces { font-family: "Fraunces", serif; }
.pm-hf-bricolage-grotesque { font-family: "Bricolage Grotesque", sans-serif; }
.pm-hb-archivo { font-family: "Archivo Fallback", sans-serif; }
.pm-hb-fraunces { font-family: "Fraunces Fallback", serif; }
.pm-hb-bricolage-grotesque { font-family: "Bricolage Grotesque Fallback", sans-serif; }
.pm-h-arial { font-family: Arial, sans-serif; }
.pm-h-times { font-family: "Times New Roman", serif; }
@media (max-width: 640px) {
  .pm-h-row { grid-template-columns: minmax(0, 1fr); }
}`;


  // Measured on 2026-10-16 (see the Typography family): sizes in bytes, metrics in em as the font's own tables give them.
  const CANDS = [
    { key: 'figtree', name: 'Figtree', css: 'Figtree',
      files: [['latin', 20156], ['latin-ext', 10280]], weights: '300 to 900', alphabets: 'Latin, Latin extended',
      lic: 'SIL Open Font License 1.1, The Figtree Project Authors (2022)',
      nat: [95, 25], fix: [95, 24], cap: 70, xh: 50, regular: 100.59, bold: 95.67, upm: 1000 },
    { key: 'nunito-sans', name: 'Nunito Sans', css: 'Nunito Sans',
      files: [['latin', 31076], ['latin-ext', 27908], ['cyrillic', 16388]], weights: '200 to 1000', alphabets: 'Latin, Latin extended, Cyrillic',
      lic: 'SIL Open Font License 1.1, The Nunito Sans Project Authors (2016)',
      nat: [101.1, 35.3], fix: [104, 32], cap: 70.5, xh: 48.6, regular: 100.93, bold: 96.5, upm: 1000 },
    { key: 'source-sans-3', name: 'Source Sans 3', css: 'Source Sans 3',
      files: [['latin', 28872], ['latin-ext', 60088], ['cyrillic', 18496], ['greek', 14528]], weights: '200 to 900', alphabets: 'Latin, Latin extended, Cyrillic, Greek',
      lic: 'SIL Open Font License 1.1, Adobe (2010-2020), Reserved Font Name "Source"',
      nat: [102.4, 40], fix: [108, 34], cap: 66, xh: 48.6, regular: 93.32, bold: 90.2, upm: 1000 },
  ];

  // The headline candidates (sizes in bytes of the one latin file each; the bundled files are the fontsource variable woff2, unmodified).
  const HEADS = [
    { key: 'archivo', name: 'Archivo', file: 34928, ext: 32608, weights: '100 to 900 (one weight axis)', alphabets: 'Latin, Latin extended, Vietnamese; no Cyrillic or Greek',
      lic: 'SIL Open Font License 1.1, The Archivo Project Authors (2020), no Reserved Font Name', sa: 98.55, own: '87.8 / 21', set: '90 / 19', fbName: 'Arial Bold', fbCls: 'pm-h-arial',
      why: 'The one Thomas named. A grotesque with a sturdy, slightly condensed body: confident and plain, close to Figtree in spirit but heavier, so a title stands apart without feeling like another brand. The neutral choice.',
      centre: ['+0.11 (0.50)', '+0.25 (0.63)', '-0.28 (0.38)'], own_c: ['-0.89 (1.00)', '-0.75 (0.88)', '-0.28 (0.38)'] },
    { key: 'fraunces', name: 'Fraunces', file: 36620, ext: 33584, weights: '100 to 900 (one weight axis; the optical-size and the soft and wonky axes are not in this file)', alphabets: 'Latin, Latin extended, Vietnamese; no Cyrillic or Greek',
      lic: 'SIL Open Font License 1.1, The Fraunces Project Authors (2020), no Reserved Font Name', sa: 115.04, own: '97.8 / 25.5', set: '98.3 / 25', fbName: 'Times New Roman Bold', fbCls: 'pm-h-times',
      why: 'The warmest and the most different: a soft "old-style" serif with round, inky shapes, like a printed travel guide or a game box. It sits well against Figtree and the brown and amber of the default theme. A bigger change of character than Archivo; best for a few big words, not for long titles.',
      centre: ['-0.09 (0.38)', '+0.06 (0.50)', '-0.40 (0.50)'], own_c: ['-0.09 (0.38)', '+0.06 (0.50)', '-0.40 (0.50)'] },
    { key: 'bricolage-grotesque', name: 'Bricolage Grotesque', file: 41344, ext: 18668, weights: '200 to 800 (one weight axis; the width and optical-size axes are not in this file)', alphabets: 'Latin, Latin extended, Vietnamese; no Cyrillic or Greek',
      lic: 'SIL Open Font License 1.1, The Bricolage Grotesque Project Authors (2022), no Reserved Font Name', sa: 102.15, own: '93 / 27', set: '96 / 24', fbName: 'Arial Bold', fbCls: 'pm-h-arial',
      why: 'A friendly grotesque with a little quirk: ink-trap notches and uneven curves that read as hand-made, so it is playful without turning into a rounded display face. Warmer than Archivo, calmer than Fraunces, and still a sans, so it pairs with Figtree and the buttons without a clash.',
      centre: ['+0.24 (0.88)', '+0.23 (0.75)', '-0.30 (0.63)'], own_c: ['-0.76 (1.25)', '-0.77 (1.13)', '-0.30 (0.63)'] },
  ];
  const headRows = (stack) => `
        <div class="pm-h-row"><div class="pm-ty-meta"><b>40 / 800</b>Hero: landing page, countdown</div><div class="${stack} pm-h40">Plan the trip together</div></div>
        <div class="pm-h-row"><div class="pm-ty-meta"><b>28 / 700</b>Display: page title</div><div class="${stack} pm-h28">Evening in Kraków</div></div>
        <div class="pm-h-row"><div class="pm-ty-meta"><b>22 / 700</b>Title: away, section</div><div class="${stack} pm-h22">Day 3: Louvre and the river</div></div>
        <div class="pm-h-row"><div class="pm-ty-meta"><b>18 / 700</b>Heading: sheets, setup, cards (17)</div><div class="${stack} pm-h18">Dinner is booked for seven</div></div>`;
  const headSample = (c) => `<div class="ds-proposed" data-font-fixed="1"${c ? ` data-headline="${c.key}" data-headline-fixed="1"` : ' data-headline-fixed="1"'}>
      <div class="pm-ty">
        <div><p class="pm-ty-h">Headline sizes the product uses today (the body below is the UI font)</p>${headRows('head')}</div>
        <div><p class="pm-ty-h">Headline with body text</p>
          <h3 class="head pm-h22" style="margin:0 0 6px">Tomorrow at the Louvre</h3>
          <p class="pm-body">Meet at the museum gate at 9:30. Bring your tickets and a charged phone. The call starts when the first person joins, and everyone in the trip can see the plan and add to it.</p>
          <h3 class="head pm-h18" style="margin:10px 0 4px">Where we eat</h3>
          <p class="pm-body">Dinner is booked for seven, near the river. Il y a 12 places, 3 days, 1 budget: €2,450.50.</p>
          <p class="pm-cover">Letters outside the headline file: <span class="head pm-h22">Łódź, Dvořák, Zürich</span> take those letters from Figtree.</p>
        </div>
      </div></div>`;
  const BAR_WORDS = [['Welcome back', 28, 56], ['Rome at the Louvre', 22, 48], ['Meet at nine', 18, 40]];
  const barsBody = () => `<div class="ds-proposed"><p class="pm-ty-h">Title bars, line-height 1, bold: 28px in 56, 22px in 48, 18px in 40</p>${BAR_WORDS.map(([w, z, h]) => `<div class="pm-tb head" style="font-size:${z}px;height:${h}px">${w}</div>`).join('')}</div>`;
  const mockBody = () => `<div class="ds-proposed">
    <div class="pm-mock"><p class="pm-ty-h">Top bar: the name of the environment (the wordmark), 17px, bold</p>
      <header class="topbar"><div class="nav-left"><a class="brand-home" href="#"><span class="brand-logo"><i class="fa-solid fa-mug-hot" aria-hidden="true"></i></span><span class="brand-name">Coffee Pub</span></a><div class="space-switcher"><button type="button" class="space-switcher-button nav-text"><span class="crumb-label">Kraków in spring</span> <i class="fa-solid fa-caret-down" aria-hidden="true"></i></button></div></div></header>
      <p class="pm-note">The space name beside it is nav text (13px, 600) and stays in the UI font, with the other top-bar words.</p></div>
    <div class="pm-mock"><p class="pm-ty-h">Home: the heading is a small capital label (stays UI); the space cards name each space, 17px, bold</p>
      <div class="space-list-head"><h2 class="space-list-title"><i class="fa-solid fa-suitcase fa-fw" aria-hidden="true"></i> Trips</h2></div>
      <div class="space-list" style="margin-top:12px">
        <article class="space-choice"><div class="space-choice-head"><strong class="space-choice-name">Kraków in spring</strong><span class="hint space-choice-count">3 here now</span></div><p class="hint space-choice-desc">Flights are booked. The hotel is still open.</p><div class="members"></div><div class="space-choice-actions"><button class="btn btn-primary" type="button"><i class="fa-solid fa-door-open fa-fw" aria-hidden="true"></i> Enter</button></div></article>
        <article class="space-choice"><div class="space-choice-head"><strong class="space-choice-name">Friday night game</strong><span class="hint space-choice-count">Empty</span></div><p class="hint space-choice-desc">Dragons, dice and snacks.</p><div class="members"></div><div class="space-choice-actions"><button class="btn btn-primary" type="button"><i class="fa-solid fa-door-open fa-fw" aria-hidden="true"></i> Enter</button></div></article>
      </div>
      <p class="pm-note">A sketch, not in the product today: a page title above the label, in the headline font, 28px.</p>
      <h1 class="head pm-h28" style="margin:8px 0 0">Our trips</h1></div>
    <div class="pm-mock"><p class="pm-ty-h">Module title: on Manage and the module's settings page, 20px; docked in a call, 14px</p>
      <section class="panel module-config" style="margin:0"><div class="module-head"><i class="module-icon fa-solid fa-calendar-days fa-fw" aria-hidden="true"></i><div class="grow"><h1>Calendar</h1><div class="hint">Version 1.4.0</div></div><span class="pill">On</span></div></section>
      <div class="mod-header pm-stay"><span class="mod-title"><i class="fa-solid fa-calendar-days fa-fw" aria-hidden="true"></i> Calendar</span></div><p class="pm-note">The docked title bar stays in the UI font: 14px, 600, in a 34px bar.</p></div>
    </div>`;
  const kb = (n) => (n / 1024).toFixed(1) + ' KB';
  const tySample = (c, fixed) => {
    const wrap = (inner) => `<div class="ds-proposed"${c ? ` data-font="${c.key}"` : ''} data-font-fixed="1">${inner}</div>`;
    const row = (cls, meta, sample) => `<div class="pm-ty-row"><div class="pm-ty-meta"><b>${meta[0]}</b>${meta[1]}</div><div class="${cls}">${sample}</div></div>`;
    const bar = (small) => `<div class="pm-bar">${TEXT_ROLES.map((r) => `<button type="button" class="btn${r.cls ? ' ' + r.cls : ''}${small ? ' btn-small' : ''}"${r.attrs || ''}>${r.label}</button>`).join('')}<button type="button" class="sdk-icon-btn${small ? ' btn-small' : ''}" aria-label="Add" title="Add">${fa('plus')}</button></div>`;
    return wrap(`<div class="pm-ty">
      <div><p class="pm-ty-h">Type scale: the sizes and weights the product uses today</p>
        ${row('pm-t28', ['28 / 700', 'Display'], 'Plan the trip together')}
        ${row('pm-t22', ['22 / 700', 'Title'], 'Evening in Kraków')}
        ${row('pm-t18', ['18 / 600', 'Heading'], 'Day 3: Louvre and the river')}
        ${row('pm-t16', ['16 / 400', 'Large, phone fields'], 'Everyone is in. The call is open.')}
        ${row('pm-t14', ['14 / 400', 'Body'], 'Meet at the museum gate at nine thirty. Bring your tickets.')}
        ${row('pm-t14s', ['14 / 600', 'Body, strong'], 'Dinner is booked for seven')}
        ${row('pm-t13', ['13 / 600', 'Nav and small buttons'], 'Workspace &nbsp; Calendar &nbsp; Places &nbsp; Budget')}
        ${row('pm-t12', ['12 / 400', 'Caption'], 'Added by Mira, 14:30 yesterday')}
        ${row('pm-t11', ['11 / 700', 'Label, capitals'], 'Not started')}
        ${row('pm-t10', ['10 / 700', 'Micro, capitals'], 'New')}
      </div>
      <div><p class="pm-ty-h">Body text</p>
        <p class="pm-body">Tomorrow we meet at the Louvre at 9:30. Bring your tickets and a charged phone. The call starts when the first person joins, and everyone in the trip can see the plan and add to it. Il y a 12 places, 3 days, 1 budget: €2,450.50.</p>
        <p class="pm-cover">Kraków, Dvořák, Zürich, Reykjavík, Łódź. Москва, Київ. Αθήνα, Θεσσαλονίκη. 0123456789 &nbsp; 14:30 &nbsp; €12.50 &nbsp; 50%</p>
      </div>
      <div><p class="pm-ty-h">Buttons, default size</p>${bar(false)}<p class="pm-ty-h">Buttons, small</p>${bar(true)}</div>
    </div>`);
  };
  function renderTypography(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const total = (c) => c.files.reduce((a, f) => a + f[1], 0);
    block.innerHTML = `<header><h3 id="typography-h"><a href="#typography">Typography</a></h3><span class="ds-status-chip ds-st-proposed">Proposed</span><span class="ds-count">one bundled font, the same for everyone</span></header>
<p class="ds-desc">Thomas's decision: the product ships its own font, self-hosted woff2 files served by our own server, with no font host and nothing fetched from outside, instead of the system stack. Three candidates, each set in the product's own sizes and weights, with the Buttons in it. <b>Use the Font group at the top of the page to flip every example frame between Today's system stack and each candidate.</b> The page's own bars keep the system stack. This page only proposes: nothing in the product loads these fonts yet.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#typography-pick">Candidates</a><a href="#typography-today">Used today</a><a href="#typography-scale">Type scale</a><a href="#typography-headline">Headline font</a><a href="#typography-fail">If the font fails</a><a href="#typography-centre">Centring</a><a href="#typography-code">The fix</a></nav>

<h4 class="ds-h4" id="typography-pick">The three candidates</h4>
${tbl(['Font', 'Why', 'Licence', 'Weights', 'Alphabets', 'woff2 files', 'English page loads'], CANDS.map((c, i) => [
    c.name,
    ['The smallest of the three and the friendliest: open geometric shapes, a generous x-height, warm at 14px. Latin only, so Cyrillic and Greek fall to the fallback.',
      'The warmest: soft curves and a calm rhythm, close to the brown and amber of the default theme. Adds Cyrillic; no Greek.',
      'The plainest and the most complete: a humanist sans that looks closest to the system fonts people know today, narrow so dense modules fit more, with Latin, Cyrillic and Greek. The largest files.'][i],
    c.lic, `${c.weights}, one variable file per alphabet (400, 500, 600 and 700 all inside)`, c.alphabets,
    `${c.files.map((f) => `${f[0]} ${kb(f[1])}`).join(', ')}; total ${kb(total(c))}`, `latin only: ${kb(c.files[0][1])}`])) }
<p class="ds-desc">Each file is split by alphabet and loads only when a letter from it is drawn (<code>unicode-range</code>), so a page in English fetches the Latin file alone. All three are free to bundle and self-host under the SIL Open Font License; each folder under <code>fonts/</code> carries its <code>OFL.txt</code>. Source Sans 3 keeps Adobe's Reserved Font Name "Source": the files are the unmodified Google Fonts release, converted and split by alphabet by Google; Thomas should confirm that is acceptable before it ships. No italic is bundled: the product has three italic rules, and the browser slants the upright. Considered and left out: Atkinson Hyperlegible Next (Latin only, 34 KB plus 19 KB), Inter (48 KB plus 85 KB for Latin extended), DM Sans (37 KB plus 18 KB), Plus Jakarta Sans.</p>

<h4 class="ds-h4" id="typography-today">What the product uses today</h4>
<p class="ds-desc">Counted in <code>public/style.css</code> (comments removed). One family: <code>-apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif</code>, plus a monospace for code. Italic appears in 3 rules.</p>
${tbl(['', 'What is written', 'Count'], [
    ['Font sizes', '17 different pixel sizes. 12px 80 times, 13px 51, 11px 42, 14px 34, 10px 17, 15px 16, 18px 14, 16px 11, 20px 6, 9px 5, 22px 4; 17px, 40px and 6px twice; 8px, 24px and 28px once. Also size tokens (<code>--nav-font-size</code> 13px, <code>--label-size</code>, <code>--field-font</code> 14px, 16px on a phone).', '12, 13, 11 and 14px are 207 of 289 pixel declarations'],
    ['Weights', '600 42 times, 700 35, 400 12, 500 7, 650 5, 800 2, and <code>--nav-font-weight</code> (600) 5. Buttons are 500.', '6 values'],
    ['Line height', '16px 13 times, 1 12 (buttons), 1.4 9, 1.1 5, 14px 4, 26px 3, 1.5 2, 18px 2, 20px 2, 1.45 1.', ''],
  ])}
<p class="ds-desc">The proposal keeps these sizes. Each candidate is variable, so the in-between 650 is real weight, not a jump to 600 or 700.</p>

<h4 class="ds-h4" id="typography-scale">Type scale, body text and Buttons, per candidate</h4>
<p class="ds-desc">Today's system stack first, then the three candidates. The Buttons are the approved ones, unchanged, set in each font. The Cyrillic and Greek lines show coverage: where a candidate has no letters, the browser takes them from the fallback.</p>
<div data-slot="samples"></div>

<h4 class="ds-h4" id="typography-headline">Headline font (a second font for big words)</h4>
<p class="ds-desc">Thomas keeps Figtree as the UI font. This asks whether big words, and only those, should be set in a second font. <b>Use the Headline group at the top of the page</b> (Same as UI, Archivo, Fraunces, Bricolage) to flip the in-context examples; the scale below shows each candidate side by side, with Figtree for the body text. Nothing in the product loads these fonts yet.</p>
<p class="ds-desc"><b>Where a headline font would apply:</b> the page title (28px), the hero and the away and countdown words (40px, 22px), the space name on its Home card (17px), the environment's name in the top bar (17px), module titles on Manage and a module's settings page (20px), and the headings of the setup and phase sheets (18px). <b>Where it would not:</b> the small capital labels (13px and below: the Home heading, panel and popover headings, status), buttons, fields, tabs, menus, the nav text including the space name in the bar, chat, tables, and the 14px title bar of a docked module. They stay in Figtree.</p>
${tbl(['Font', 'Why', 'Licence', 'Weights', 'Alphabets', 'woff2 (latin, the only file bundled)', 'Latin extended, not bundled'], HEADS.map((c) => [
    c.name, c.why, c.lic, c.weights, c.alphabets, `${kb(c.file)} (one file, every weight from 100 to 900, 600 to 800 inside)`, `${kb(c.ext)} more`])) }
<p class="ds-desc">Each is a variable file with a weight axis: weights 600, 650, 700 and 800 are all real, and one file covers every headline weight. The static 600, 700 and 800 files of Archivo are 13.8 + 14.5 + 14.4 = 42.7 KB, so the variable file (34.9 KB) is smaller and has the in-between weights. Archivo also comes with a width axis (62 to 125%), which adds 55 KB (90.1 KB in all); it is not used here. Only the latin file is bundled: a headline with Polish, Czech or Vietnamese letters takes those letters from Figtree (the stack ends in the UI font), so a letter is never missing, only set in the other font. A page in English loads one headline file, 34.9 to 41.3 KB, and only when a headline is drawn. Added to the Figtree page: 110.2 KB for the three together, or about 35 to 41 KB for the one chosen.</p>
<div data-slot="head-scale"></div>
<h4 class="ds-h4" id="typography-headline-context">In context</h4>
<p class="ds-desc">The product's own classes and structure (<code>.topbar</code>, <code>.space-choice</code>, <code>.module-head</code>, <code>.mod-header</code>), with the headline font applied to the big words only. Follows the Headline group, the Font group and Dark or Light.</p>
<div data-slot="head-mock"></div>
<h4 class="ds-h4" id="typography-headline-centre">Is a big title centred in its bar?</h4>
<p class="ds-desc">The same method as the buttons: a title bar with a 1px border, bold, <code>line-height: 1</code>, twelve headlines with no descenders, photographed at 4x, the middle of the ink against the middle of the bar. Mean offset in px (+ low, - high) and the worst headline in brackets. The bundled fonts have ascent and descent set (below); with each font's own tables the 28px and 22px titles sit up to 1.25px high.</p>
${tbl(['Font', '28px in 56', '22px in 48', '18px in 40', 'Own ascent / descent', 'Set to'], HEADS.map((c) => [c.name, `${c.centre[0]} (own tables: ${c.own_c[0]})`, `${c.centre[1]} (own: ${c.own_c[1]})`, `${c.centre[2]} (own: ${c.own_c[2]})`, c.own + '%', c.set + '%']))}
<div data-slot="head-bars"></div>
<p class="ds-desc"><b>The fallback</b> (the headline font failing to load): a bold system font scaled to the same width, with the same ascent and descent, so the page does not jump. Archivo and Bricolage use Arial Bold (or Helvetica Bold, or Liberation Sans Bold), Fraunces uses Times New Roman Bold (or Liberation Serif Bold). Measured live by this page, in this browser, for one headline at 28px, bold.</p>
<div data-slot="head-fail"></div>

<h4 class="ds-h4" id="typography-fail">If the font fails to load</h4>
<p class="ds-desc">While the file downloads, or if it never arrives (blocked, offline, a bad file), each candidate has a fallback face: Arial (or Helvetica, or Liberation Sans, whichever the device has) scaled to the same width and given the same ascent and descent as the bundled font. Text looks plain but the page does not jump when the real font arrives, and a button label sits where it would. Where the device has none of those, the stack goes on to Today's system fonts, unadjusted. The table below is measured live by this page, in this browser, for one line of 14px text (the same sentence in every row).</p>
<div data-slot="fail"></div>

<h4 class="ds-h4" id="typography-centre">Is the button label centred?</h4>
<div data-slot="centre"></div>
`;
    block.querySelector('[data-slot="centre"]').innerHTML = CENTRE_HTML(tbl, api.h);
    const slot = block.querySelector('[data-slot="samples"]');
    for (const c of [null].concat(CANDS)) {
      slot.appendChild(mk('p', 'ds-ctx', c ? `${c.name}: ${kb(total(c))} in all` : "Today's system stack"));
      slot.appendChild(api.makeFrame('app', tySample(c), { proposed: true, title: c ? `Typography, ${c.name}` : 'Typography, Today', css: PM_CSS + TY_CSS }));
    }
    const SENT = 'Tomorrow we meet at the Louvre at nine thirty and bring our tickets.';
    const failRows = (c) => [
      ['Bundled font', `pm-f-${c.key}`], ['If it fails: the fallback face', `pm-fb-${c.key}`], ['Arial, not adjusted', 'pm-f-arial'], ["Today's system stack", 'pm-f-today'],
    ].map(([n, cls]) => `<tr><td>${n}</td><td><span class="pm-s ${cls}">${SENT}</span></td><td class="pm-n" data-out="w"></td><td class="pm-n" data-out="h"></td></tr>`).join('');
    const failBody = `<div class="ds-proposed" data-font-fixed="1">${CANDS.map((c) => `<p class="pm-meas-h">${c.name}</p><table class="pm-meas-t"><thead><tr><th>Line</th><th>Sample</th><th>Width</th><th>Box height</th></tr></thead><tbody>${failRows(c)}</tbody></table>`).join('')}</div>`;
    const measure = (doc) => {
      const go = () => {
        for (const t of doc.querySelectorAll('.pm-meas-t tbody')) {
          const rows = [...t.rows]; const base = rows[0].querySelector('.pm-s').getBoundingClientRect();
          for (const r of rows) {
            const b = r.querySelector('.pm-s').getBoundingClientRect();
            r.querySelector('[data-out="w"]').textContent = `${b.width.toFixed(1)} px (${b.width >= base.width ? '+' : ''}${((b.width / base.width - 1) * 100).toFixed(1)}%)`;
            r.querySelector('[data-out="h"]').textContent = `${b.height.toFixed(1)} px`;
          }
        }
      };
      doc.fonts.ready.then(go);
      doc.fonts.addEventListener('loadingdone', go);
    };
    const hs = block.querySelector('[data-slot="head-scale"]');
    for (const c of [null].concat(HEADS)) {
      hs.appendChild(mk('p', 'ds-ctx', c ? `${c.name}: ${kb(c.file)}` : 'Same as the UI font (Figtree)'));
      hs.appendChild(api.makeFrame('app', headSample(c), { proposed: true, title: c ? `Headline, ${c.name}` : 'Headline, same as UI', css: PM_CSS + TY_CSS }));
    }
    block.querySelector('[data-slot="head-mock"]').appendChild(api.makeFrame('app', mockBody(), { proposed: true, title: 'Headline, in context', css: PM_CSS + TY_CSS }));
    block.querySelector('[data-slot="head-bars"]').appendChild(api.makeFrame('app', barsBody(), { proposed: true, title: 'Headline, title bars', css: PM_CSS + TY_CSS }));
    const HSENT = 'Plan the trip together in Kraków';
    const headFail = HEADS.map((c) => `<p class="pm-meas-h">${c.name}</p><table class="pm-meas-t"><thead><tr><th>Line</th><th>Sample</th><th>Width</th><th>Box height</th></tr></thead><tbody>${[
      ['Bundled font', `pm-hf-${c.key}`], ['If it fails: the fallback face', `pm-hb-${c.key}`], [`${c.fbName.replace(' Bold', '')}, not adjusted`, c.fbCls],
    ].map(([n, cls]) => `<tr><td>${n}</td><td><span class="pm-s ${cls}" style="font-size:28px;font-weight:700">${HSENT}</span></td><td class="pm-n" data-out="w"></td><td class="pm-n" data-out="h"></td></tr>`).join('')}</tbody></table>`).join('');
    block.querySelector('[data-slot="head-fail"]').appendChild(api.makeFrame('app', `<div class="ds-proposed" data-font-fixed="1" data-headline-fixed="1">${headFail}</div>`, { proposed: true, title: 'Headline, if the font fails', css: PM_CSS + TY_CSS, onload: measure }));
    block.querySelector('[data-slot="fail"]').appendChild(api.makeFrame('app', failBody, { proposed: true, title: 'Typography, if the font fails', css: PM_CSS + TY_CSS, onload: measure }));
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'typography', covers: ['typography', 'fonts'], group: 'Foundations', name: 'Typography', status: 'proposed',
    words: 'typography headline heading title archivo fraunces bricolage font fonts typeface type scale text bundled self-hosted woff2 figtree nunito source sans fallback metrics ascent descent centring baseline', render: renderTypography,
  });
})();
