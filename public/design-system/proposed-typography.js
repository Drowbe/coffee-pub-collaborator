/* The Typography family (approved 2026-10-19): Figtree for the interface, Fraunces for headlines, the nine-step size scale, the weights, the
   headline in context, and how the labels sit in a button. Loaded by proposed.html through proposed-families.json, after proposed.js (the page
   engine); it registers one family through window.DS_PROPOSED.families.push and draws it with the rules in proposed-typography.css. Nothing
   here is a style of the product: markup, words and tables only. How to add a family: README.md in this folder. */
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

  // Where the letters sit in a button, measured by ink on 2026-10-16 in headless Chromium 141 on Linux (same method as
  // tools/check-design-system.mjs: a 4x screenshot of a 1px-bordered button, 12 labels with no descenders, weight 500, line-height 1).
  // Each cell is the mean offset in px of the letters' middle from the button's middle (+ low, - high), then the worst label in brackets.
  const CENTRE = [
    ["Today: the system stack (here Liberation Sans, which stands in for Arial)", ["+0.06 (0.25)","+0.44 (0.63)","-1.57 (1.63)","-0.20 (0.25)"], ["-0.38 (0.50)","+0.50 (0.50)","-1.00 (1.00)","-0.50 (0.50)"]],
    ["Other system font on this machine: DejaVu Sans", ["-1.20 (1.25)","-0.82 (0.88)","-0.95 (1.00)","-0.45 (0.50)"], ["-0.38 (0.50)","+0.13 (0.50)","-1.00 (1.00)","-0.88 (1.00)"]],
    ["Other system font on this machine: FreeSans", ["-1.03 (1.13)","-0.66 (0.75)","-1.66 (1.75)","-1.28 (1.38)"], ["-1.42 (1.50)","-1.00 (1.00)","-1.00 (1.00)","-0.67 (1.00)"]],
    ["Figtree, the font's own metrics", ["-0.94 (1.00)","+0.44 (0.50)","-0.59 (0.75)","-0.19 (0.25)"], ["-1.00 (1.00)","+0.00 (0.00)","-0.50 (0.50)","-0.04 (0.50)"]],
    ["Figtree, with the fix", ["+0.06 (0.13)","+0.44 (0.50)","-0.59 (0.75)","-0.19 (0.25)"], ["+0.00 (0.00)","+0.00 (0.00)","-0.50 (0.50)","+0.00 (0.00)"]],
    ["Figtree, fallback face, with the fix", ["+0.18 (0.38)","+0.43 (0.63)","-0.70 (0.75)","-0.32 (0.38)"], ["-0.38 (0.50)","+0.50 (0.50)","-1.00 (1.00)","-0.50 (0.50)"]],
  ];
  const CENTRE_HEAD = ['Text', '14px in 38px (default button)', '13px in 30px (small button)', '16px in 44px (phone field)', '12px in 30px'];
  const FIX_ROWS = [
    ['Figtree', '0.700', '0.950 / 0.250 (0.700)', '0.95 / 0.24 (0.710)', '100.59% / 95.67%', '94.44% / 23.86%'],
    ['Fraunces (headlines)', '0.700 (capitals)', '0.978 / 0.255', '1.009 / 0.224', '111.60% (bold only)', '90.41% / 20.07%'],
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
/* Fraunces: weight axis only (100 to 900). Fallback: Times New Roman Bold scaled to the same width. */
@font-face { font-family: "Fraunces"; font-weight: 100 900; font-display: swap;
  ascent-override: 100.9%; descent-override: 22.4%; line-gap-override: 0%; src: url(fonts/fraunces/latin.woff2) format("woff2"); unicode-range: U+0000-00FF, ...; }
@font-face { font-family: "Fraunces Fallback"; font-weight: 100 900;
  src: local("Times New Roman Bold"), local("TimesNewRomanPS-BoldMT"), local("Liberation Serif Bold");
  size-adjust: 111.60%; ascent-override: 90.41%; descent-override: 20.07%; line-gap-override: 0%; }`;
  const TOKEN_CODE = `:root {
  --font-ui: "Figtree", "Figtree Fallback", -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  --font-display: "Fraunces", "Fraunces Fallback", var(--font-ui);
  --text-9: 9px;   /* micro counts only */
  --text-11: 11px;  --text-12: 12px;  --text-13: 13px;  --text-14: 14px;  --text-16: 16px;   /* interface, Figtree */
  --text-18: 18px;  --text-22: 22px;  --text-28: 28px;  --text-40: 40px;                      /* headlines, Fraunces */
  --weight-regular: 400;  --weight-medium: 500;  --weight-strong: 600;
  --leading-body: 1.45;  --leading-ui: 1;
  --leading-display: 1.15;  --leading-title: 1.2;  --leading-section: 1.25;
  --tracking-tight: -0.01em;  --tracking-normal: 0;  --tracking-caps: 0.06em;
}`;

  // The nine steps. [size, name, family, weight, leading token, tracking token, sample, where it is used]
  const STEPS = [
    [9, 'Micro count', 'ui', 600, 'ui', 'normal', '3', 'Numbers only, inside a 14px badge on the corner of an icon-only tab or icon button. The one size under 11px; the 7px dots carry no text.'],
    [11, 'Caption', 'ui', 600, 'ui', 'caps', 'NOT STARTED', 'Captions and group labels in capitals, counts, tag text on the smallest chips. Nothing is smaller.'],
    [12, 'Small', 'ui', 400, 'body', 'normal', 'Added by Mira, 14:30 yesterday', 'Tags and the small chip, hints and helper text, times, table notes.'],
    [13, 'Dense UI', 'ui', 600, 'ui', 'normal', 'Workspace   Calendar   Places   Budget', 'Small buttons, small tabs, chips, the top-bar nav text, menu notes, table cells.'],
    [14, 'Default UI and body', 'ui', 400, 'body', 'normal', 'Meet at the museum gate at nine thirty. Bring your tickets.', 'Body text, default buttons, fields, tabs, menu items, chat. Buttons are 500; strong text is 600.'],
    [16, 'Large body', 'ui', 400, 'body', 'normal', 'Everyone is in. The call is open.', 'Large body text, and the text in a field on a phone (16px so iOS does not zoom the page).'],
    [18, 'Section heading', 'display', 600, 'section', 'normal', 'Kraków in spring', 'The space name on a Home card, the environment name in the top bar, the headings of sheets and setup.'],
    [22, 'Title', 'display', 600, 'title', 'normal', 'Day 3: Louvre and the river', 'A module title on Manage and on its settings page, a title in away and in a long sheet.'],
    [28, 'Page title', 'display', 600, 'title', 'tight', 'Evening in Kraków', 'The title of a page, such as the Home page.'],
    [40, 'Display', 'display', 600, 'display', 'tight', 'Plan the trip', 'The landing title, the countdown and away words.'],
  ];
  const WHERE_TODAY = [
    ['8, 10, 11', '11', 'Caption. The 10px labels and the micro capitals go up to 11.'],
    ['9 (a count in a corner badge)', '9', 'Micro count: stays 9, numbers only'],
    ['12', '12', 'Small'],
    ['13', '13', 'Dense UI'],
    ['14, 15', '14', 'Default. The 15px text goes to 14.'],
    ['16', '16', 'Large body, and a field on a phone'],
    ['17, 18', '18', 'Section heading (Fraunces)'],
    ['20, 22, 24', '22', 'Title (Fraunces). The 20px module title and the 24px go to 22.'],
    ['28', '28', 'Page title (Fraunces)'],
    ['40', '40', 'Display (Fraunces)'],
  ];
  const USED = [
    ['Buttons, default', '14', '500', '1'],
    ['Buttons, small', '13', '500', '1'],
    ['Fields', '14 (16 on a phone)', '400', '1 (a text area 1.45)'],
    ['Field labels', '12', '500', '1.45'],
    ['Tabs and view switches', '14 (13 small)', '500', '1'],
    ['The nav text in the bars', '13', '600', '1'],
    ['Chips', '13 (12 for a tag)', '500', '1'],
    ['Menu items', '14', '400', '1.45'],
    ['Captions and group labels', '11, in capitals', '600', '1'],
    ['Micro count (corner badge, 14px)', '9, numbers only', '600', '1'],
    ['Body text, chat', '14 (16 large)', '400', '1.45'],
    ['Headings', '18, 22, 28, 40, in Fraunces', '600', '1.15 to 1.25'],
  ];
  const TOKENS = [
    ['--font-ui', 'Figtree, then its metric-matched fallback, then the system stack', 'Everything that is not a headline'],
    ['--font-display', 'Fraunces, its fallback, then --font-ui', 'The headlines, display text only'],
    ['--text-11, -12, -13, -14, -16', '11, 12, 13, 14, 16 px', 'The five interface sizes'],
    ['--text-9', '9 px', 'Micro counts only: numbers in a 14px corner badge'],
    ['--text-18, -22, -28, -40', '18, 22, 28, 40 px', 'The four headline sizes'],
    ['--weight-regular, -medium, -strong', '400, 500, 600', 'Interface weights; headlines use strong'],
    ['--leading-body, --leading-ui', '1.45, 1', 'Reading text, and a single line of interface'],
    ['--leading-display, -title, -section', '1.15, 1.2, 1.25', 'Headlines: 40, then 28 and 22, then 18'],
    ['--tracking-tight, -normal, -caps', '-0.01em, 0, 0.06em', 'The 40 and 28px headlines, everything else, capitals'],
  ];

  // The example-page rules of this family's frames.
  const TY_CSS = `
.pm-ty { display: grid; gap: 18px; }
.pm-ty-h { margin: 0 0 6px; color: var(--text-dim); font-size: var(--text-11); font-weight: var(--weight-strong); letter-spacing: var(--tracking-caps); text-transform: uppercase; }
.pm-ty-row { display: grid; grid-template-columns: 170px minmax(0, 1fr); gap: 2px 14px; align-items: baseline; padding: 8px 0; }
.pm-ty-row + .pm-ty-row { border-top: 1px solid var(--border); }
.pm-ty-meta { color: var(--text-dim); font-family: var(--font-system); font-size: 11px; line-height: 1.3; }
.pm-ty-meta b { display: block; color: var(--text); font-size: 12px; font-weight: 600; }
.pm-job { margin: 3px 0 0; color: var(--text-dim); font-size: var(--text-12); font-weight: var(--weight-regular); line-height: var(--leading-body); letter-spacing: var(--tracking-normal); text-transform: none; }
.pm-hd { font-family: var(--font-display); font-weight: var(--weight-strong); margin: 0; }
.pm-s40 { font-size: var(--text-40); line-height: var(--leading-display); letter-spacing: var(--tracking-tight); }
.pm-s28 { font-size: var(--text-28); line-height: var(--leading-title); letter-spacing: var(--tracking-tight); }
.pm-s22 { font-size: var(--text-22); line-height: var(--leading-title); }
.pm-s18 { font-size: var(--text-18); line-height: var(--leading-section); }
.pm-s16 { font-size: var(--text-16); font-weight: var(--weight-regular); line-height: var(--leading-body); }
.pm-s14 { font-size: var(--text-14); font-weight: var(--weight-regular); line-height: var(--leading-body); }
.pm-s13 { font-size: var(--text-13); font-weight: var(--weight-strong); line-height: var(--leading-ui); }
.pm-s12 { font-size: var(--text-12); font-weight: var(--weight-regular); line-height: var(--leading-body); color: var(--text-dim); }
.pm-s9 { font-size: var(--text-9); font-weight: var(--weight-strong); line-height: var(--leading-ui); }
.pm-s11 { font-size: var(--text-11); font-weight: var(--weight-strong); line-height: var(--leading-ui); letter-spacing: var(--tracking-caps); text-transform: uppercase; color: var(--text-dim); }
.pm-w400 { font-weight: var(--weight-regular); } .pm-w500 { font-weight: var(--weight-medium); } .pm-w600 { font-weight: var(--weight-strong); }
.pm-body { max-width: 62ch; margin: 0 0 8px; font-size: var(--text-14); line-height: var(--leading-body); }
.pm-cover { margin: 0; font-size: var(--text-14); line-height: var(--leading-body); overflow-wrap: anywhere; }
.pm-bar + .pm-bar { margin-top: 10px; }
.pm-bar + .pm-ty-h { margin-top: 14px; }
.pm-cmp { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.pm-cmp-c { min-width: 0; padding: 14px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg); }
.pm-cmp-c .pm-hd + .pm-hd { margin-top: 8px; }
.pm-cmp-card { margin-top: 10px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-cmp-card p { margin: 4px 0 0; color: var(--text-dim); font-size: var(--text-13); }
.pm-tb { box-sizing: border-box; display: flex; align-items: center; width: 320px; max-width: 100%; padding: 0 10px; border: 1px solid var(--border); border-radius: var(--radius-small); background: var(--bg-section); line-height: 1; white-space: nowrap; overflow: hidden; }
.pm-tb + .pm-tb { margin-top: 8px; }
.pm-mock { padding: 14px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg); }
.pm-mock + .pm-mock { margin-top: 14px; }
.pm-mock .topbar { position: relative; top: auto; width: auto; margin: 6px 0 0; border-radius: var(--radius-small); }
.pm-note { margin: 6px 0 0; color: var(--text-dim); font-family: var(--font-system); font-size: 12px; }
.pm-stay { margin-top: 10px; }
.ds-proposed[data-font="proposed"] .pm-mock .space-choice-name { font-size: var(--text-18); line-height: var(--leading-section); }
.ds-proposed[data-font="proposed"] .pm-mock .module-head h1 { font-size: var(--text-22); line-height: var(--leading-title); }
.pm-meas-t { width: 100%; border-collapse: collapse; font-family: var(--font-system); font-size: 12px; }
.pm-meas-t th, .pm-meas-t td { padding: 5px 8px 5px 0; border-bottom: 1px solid var(--border); text-align: left; vertical-align: baseline; }
.pm-meas-t th { color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
.pm-meas-t .pm-s { display: inline-block; white-space: nowrap; font-size: 14px; font-weight: 400; background: color-mix(in srgb, var(--accent) 16%, transparent); }
.pm-meas-t .pm-n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.pm-meas-h { margin: 14px 0 4px; font-family: var(--font-system); font-size: 13px; font-weight: 600; }
.pm-meas-h:first-child { margin-top: 0; }
.pm-f-figtree { font-family: "Figtree", sans-serif; }
.pm-fb-figtree { font-family: "Figtree Fallback", sans-serif; }
.pm-hf-fraunces { font-family: "Fraunces", serif; }
.pm-hb-fraunces { font-family: "Fraunces Fallback", serif; }
.pm-h-times { font-family: "Times New Roman", serif; }
.pm-f-arial { font-family: Arial, sans-serif; }
.pm-f-today { font-family: var(--font-system); }
@media (max-width: 640px) {
  .pm-ty-row { grid-template-columns: minmax(0, 1fr); }
  .pm-cmp { grid-template-columns: minmax(0, 1fr); }
}`;

  const kb = (n) => (n / 1024).toFixed(1) + ' KB';
  // One sample frame: data-font-fixed is not set, so the Today's fonts / Proposed fonts switch flips it.
  const wrap = (inner) => `<div class="ds-proposed">${inner}</div>`;
  const scaleBody = () => wrap(`<div class="pm-ty"><div><p class="pm-ty-h">The nine steps, smallest to largest, in the family each is set in</p>${STEPS.map((st) => {
    const [size, name, fam, wt, lh, tr, sample, used] = st;
    const cls = `pm-s${size}${fam === 'display' ? ' pm-hd' : ''}`;
    const lhv = { ui: '1', body: '1.45', display: '1.15', title: '1.2', section: '1.25' }[lh];
    const trv = { caps: '+0.06em, capitals', tight: '-0.01em', normal: 'none' }[tr];
    return `<div class="pm-ty-row"><div class="pm-ty-meta"><b>${size} ${name}</b>${fam === 'display' ? 'Fraunces' : 'Figtree'} ${wt}<br>line ${lhv}, letters ${trv}<br>--text-${size}</div><div><div class="${cls}">${sample}</div><p class="pm-job">${used}</p></div></div>`;
  }).reverse().join('')}</div></div>`);
  const weightBody = () => wrap(`<div class="pm-ty">
    <div><p class="pm-ty-h">Interface weights: Figtree 400, 500, 600</p>
      <div class="pm-ty-row"><div class="pm-ty-meta"><b>400 Regular</b>--weight-regular</div><div><div class="pm-s14">Meet at the museum gate at nine thirty. Bring your tickets.</div><p class="pm-job">Body text, fields, hints, menu items.</p></div></div>
      <div class="pm-ty-row"><div class="pm-ty-meta"><b>500 Medium</b>--weight-medium</div><div><div class="pm-s14 pm-w500">Save   Edit   Delete   Cancel</div><p class="pm-job">Buttons and chips.</p></div></div>
      <div class="pm-ty-row"><div class="pm-ty-meta"><b>600 Strong</b>--weight-strong</div><div><div class="pm-s14 pm-w600">Dinner is booked for seven</div><p class="pm-job">Tabs, nav text, tags, captions, emphasis. Today's 650, 700 and 800 in the interface fold into this.</p></div></div>
    </div>
    <div><p class="pm-ty-h">Headline weight: Fraunces 600 (decided 2026-10-21; see the comparison below)</p>
      <div class="pm-ty-row"><div class="pm-ty-meta"><b>600 Strong</b>--weight-strong</div><div><div class="pm-hd pm-s28">Evening in Kraków</div><p class="pm-job">Every headline, 18 to 40px.</p></div></div>
    </div>
  </div>`);
  const buttonsBody = () => {
    const bar = (small) => `<div class="pm-bar">${TEXT_ROLES.map((r) => `<button type="button" class="btn${r.cls ? ' ' + r.cls : ''}${small ? ' btn-small' : ''}"${r.attrs || ''}>${r.label}</button>`).join('')}<button type="button" class="sdk-icon-btn${small ? ' btn-small' : ''}" aria-label="Add" title="Add">${fa('plus')}</button></div>`;
    return wrap(`<div class="pm-ty">
      <div><p class="pm-ty-h">Body text, 14 and 16 (large)</p>
        <p class="pm-body">Tomorrow we meet at the Louvre at 9:30. Bring your tickets and a charged phone. The call starts when the first person joins, and everyone in the trip can see the plan and add to it. Il y a 12 places, 3 days, 1 budget: €2,450.50.</p>
        <p class="pm-body pm-s16">Everyone is in. The call is open, and the plan is on the screen.</p>
        <p class="pm-cover">Kraków, Dvořák, Zürich, Reykjavík, Łódź. Москва, Київ. Αθήνα, Θεσσαλονίκη. 0123456789 &nbsp; 14:30 &nbsp; €12.50 &nbsp; 50%</p>
      </div>
      <div><p class="pm-ty-h">Buttons, default size: 14, weight 500</p>${bar(false)}<p class="pm-ty-h">Buttons, small: 13, weight 500</p>${bar(true)}</div>
    </div>`);
  };
  const cmpCol = (w) => `<div class="pm-cmp-c">
      <p class="pm-ty-h">Fraunces ${w}${w === 600 ? ', proposed' : ''}</p>
      <p class="pm-hd pm-s40" style="font-weight:${w}">Plan the trip</p>
      <p class="pm-hd pm-s28" style="font-weight:${w}">Evening in Kraków</p>
      <p class="pm-hd pm-s22" style="font-weight:${w}">Day 3: Louvre and the river</p>
      <p class="pm-hd pm-s18" style="font-weight:${w}">Kraków in spring, Friday night game</p>
      <div class="pm-cmp-card"><b class="pm-hd pm-s18" style="font-weight:${w}">Kraków in spring</b><p>Flights are booked. The hotel is still open.</p></div>
      <div class="pm-cmp-card"><b class="pm-hd" style="font-size:17px;font-weight:${w}">Friday night game (17px, today's size)</b><p>Dragons, dice and snacks.</p></div>
    </div>`;
  const cmpBody = () => `<div class="ds-proposed" data-font="proposed" data-font-fixed="1"><div class="pm-cmp">${cmpCol(600)}${cmpCol(700)}</div>
    <div class="pm-cmp-card" style="margin-top:14px"><p class="pm-ty-h">Figtree 600 at 18px, for comparison: the same card name if a place stays in the interface font</p><b class="pm-s18 pm-w600">Kraków in spring</b><p>Flights are booked. The hotel is still open.</p></div></div>`;
  const ctxBody = () => wrap(`
    <div class="pm-mock"><p class="pm-ty-h">Landing: the title, 40px</p>
      <h1 class="head pm-s40" style="margin:0 0 6px">Plan the trip together</h1><p class="pm-body" style="margin:0">Voice, video and the plan, in one place for the group.</p></div>
    <div class="pm-mock"><p class="pm-ty-h">Page title, 28px, above the Home list</p>
      <h1 class="head pm-s28" style="margin:0 0 4px">Our trips</h1><p class="pm-body" style="margin:0">Pick a trip to enter.</p></div>
    <div class="pm-mock"><p class="pm-ty-h">Top bar: the name of the environment (the wordmark): Figtree 600 at 16px below 640px wide, Fraunces 600 at 18px from 641px up</p>
      <header class="topbar"><div class="nav-left"><a class="brand-home" href="#"><span class="brand-logo"><i class="fa-solid fa-mug-hot" aria-hidden="true"></i></span><span class="brand-name">Coffee Pub</span></a><div class="space-switcher"><button type="button" class="space-switcher-button nav-text"><span class="crumb-label">Kraków in spring</span> <i class="fa-solid fa-caret-down" aria-hidden="true"></i></button></div></div></header>
      <p class="pm-note">The space name beside it is nav text (13px, 600) and stays in Figtree, with the other top-bar words.</p></div>
    <div class="pm-mock"><p class="pm-ty-h">Home: the heading is a small capital label (stays Figtree); each space card names its space, 18px</p>
      <div class="space-list-head"><h2 class="space-list-title"><i class="fa-solid fa-suitcase fa-fw" aria-hidden="true"></i> Trips</h2></div>
      <div class="space-list" style="margin-top:12px">
        <article class="space-choice"><div class="space-choice-head"><strong class="space-choice-name">Kraków in spring</strong><span class="hint space-choice-count">3 here now</span></div><p class="hint space-choice-desc">Flights are booked. The hotel is still open.</p><div class="members"></div><div class="space-choice-actions"><button class="btn btn-primary" type="button"><i class="fa-solid fa-door-open fa-fw" aria-hidden="true"></i> Enter</button></div></article>
        <article class="space-choice"><div class="space-choice-head"><strong class="space-choice-name">Friday night game</strong><span class="hint space-choice-count">Empty</span></div><p class="hint space-choice-desc">Dragons, dice and snacks.</p><div class="members"></div><div class="space-choice-actions"><button class="btn btn-primary" type="button"><i class="fa-solid fa-door-open fa-fw" aria-hidden="true"></i> Enter</button></div></article>
      </div></div>
    <div class="pm-mock"><p class="pm-ty-h">Module title: on Manage and the module's settings page, 22px; docked in a call, 14px Figtree</p>
      <section class="panel module-config" style="margin:0"><div class="module-head"><i class="module-icon fa-solid fa-calendar-days fa-fw" aria-hidden="true"></i><div class="grow"><h1>Calendar</h1><div class="hint">Version 1.4.0</div></div><span class="pill">On</span></div></section>
      <div class="mod-header pm-stay"><span class="mod-title"><i class="fa-solid fa-calendar-days fa-fw" aria-hidden="true"></i> Calendar</span></div><p class="pm-note">The docked title bar stays in Figtree: 14px, 600, in a 34px bar.</p></div>`);
  const BAR_WORDS = [['Welcome home', 40, 72], ['Welcome back', 28, 56], ['Rome at the Louvre', 22, 48], ['Meet at nine', 18, 40]];
  const barsBody = () => wrap(`<p class="pm-ty-h">Title bars, line-height 1, weight 600: 40px in 72, 28px in 56, 22px in 48, 18px in 40</p>${BAR_WORDS.map(([w, z, hh]) => `<div class="pm-tb head" style="font-size:${z}px;height:${hh}px;font-weight:600">${w}</div>`).join('')}`);

  const CENTRE_HTML = (tbl) => `<p class="ds-desc"><b>Yes, within 1px, with a normal button: 1px border, 14px side padding, <code>line-height: 1</code>, as the approved Buttons are.</b> Measured by ink, the way <code>tools/check-design-system.mjs</code> does it: a 4x screenshot of the button, the middle of the letters against the middle of the box. 12 labels with no descenders (Save, Edit, Delete, Cancel, Muted, Add, Filter, Clear, Done, Back, Invite, Rename), weight 500. Each cell is the mean in px (<b>+ is low, - is high</b>) and, in brackets, the worst label. Headless Chromium 141 on Linux; this machine has no Segoe UI, San Francisco or Roboto, so Today's row is Liberation Sans, which stands in for Arial. The check repeats the Figtree measurement on every run.</p>
<p class="pm-meas-h">Ink on a 4x screenshot (the check's method)</p>
${tbl(CENTRE_HEAD, CENTRE.map((r) => [r[0]].concat(r[1])))}
<p class="pm-meas-h">The same on a screen at 1x, where the baseline snaps to a whole pixel</p>
${tbl(CENTRE_HEAD, CENTRE.map((r) => [r[0]].concat(r[2])))}
<p class="ds-desc"><b>What it shows.</b> With the fix, Figtree sits within 0.7px of centre at the default and the small button (worst label 0.9px), bundled or in its fallback face, at 4x and at 1x. With the font's own tables the label is 0.7 to 1.0px <i>high</i> at the default size, so the same button would be on the edge of the 1px limit. Today's stack, as it resolves here, is fine at 14px but 1.6px high at 16px (the phone's field size), and the two other system fonts on this machine are 1.0 to 1.7px off: that spread, a different one on every device, is the buttons that look off. I could not measure Segoe UI, San Francisco or Roboto here.</p>
<h4 class="ds-h4" id="typography-code">The fix: font-metric overrides</h4>
<p class="ds-desc"><b>Why a label looks off.</b> With <code>line-height: 1</code> the browser puts the line in the middle of the button and the baseline at (ascent - descent) / 2 below that middle, using the ascent and descent in the font's own tables, rounded to whole pixels. Letters are centred when ascent - descent equals the cap height. Fonts differ in ascent, descent and in how they round at 14px, so the same CSS gives a different result in each font. <b>The fix:</b> set <code>ascent-override</code>, <code>descent-override</code> and <code>line-gap-override</code> in the <code>@font-face</code> so the numbers are ours, in every browser, and give the fallback face the same ones.</p>
${tbl(['Font', 'Cap height (em)', 'Own ascent / descent', 'Override ascent / descent', 'Fallback size-adjust: regular / bold', 'Fallback ascent / descent (regular)'], FIX_ROWS)}
<p class="ds-desc"><b>How the numbers were found.</b> (1) The difference, ascent minus descent, is set a little above the cap height (the tall letters l, d, t rise above it), and the sum is kept near the font's own so <code>line-height: normal</code> hardly changes. (2) Because the browser rounds, each pair was then swept: ascent in 1% steps within 10% of the font's own, descent within 12%, six labels at 14px in 38px and 13px in 30px, at 1x and 4x, and the pair nearest the font's own sum that keeps every label within 0.5px was taken. Figtree's own numbers already have ascent - descent = cap height, yet it sits 0.9px high at 14px: its descent, 25% of 14px, is 3.5px, a tie. The sweep moved it to 24%. (3) The fallback's size-adjust makes the same sample of UI text as wide as in the bundled font, measured in the browser; its ascent and descent are the bundled ones divided by size-adjust. Fraunces was swept the same way for a headline of 28, 22 and 18px in a title bar.</p>
<p class="ds-desc"><b>Checked.</b> The ascent and descent the browser reports at 100px, bundled and fallback: Figtree 95 / 24 and 95 / 24 (unadjusted Arial: 91 / 21). So the line box is the same in both. Only measured in Chromium; Firefox and Safari honour the same descriptors but were not run here.</p>
<pre class="ds-pre">${h(FIX_CODE)}</pre>`;

  function renderTypography(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    block.innerHTML = `<header><h3 id="typography-h"><a href="#typography">Typography</a></h3><span class="ds-status-chip ds-st-approved">Approved</span><span class="ds-count">Decided 2026-10-19: Figtree and Fraunces, nine sizes and a micro count; decided 2026-10-21: Fraunces 600 for every headline, the wordmark</span></header>
<p class="ds-desc"><b>Decided 2026-10-19.</b> <b>Decided 2026-10-21:</b> the headline weight is Fraunces 600 (below), and the wordmark (the environment's name in the top bar) is Figtree 600 at 16px below 640px wide and Fraunces 600 at 18px from 641px up. The product ships its own fonts, self-hosted woff2 files served by our own server, with no font host and nothing fetched from outside, instead of the system stack. <b>The interface is Figtree. Headlines, and display text only, are Fraunces.</b> There are nine sizes, plus one micro size for counts, and nothing else is smaller than 11px. <b>The "Today's fonts / Proposed fonts" switch at the top of the page flips every example frame between the old system stack and the new fonts.</b> The page's own bars keep the system stack. Nothing in the product loads these fonts yet: this page is the specification.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#typography-fonts">The two fonts</a><a href="#typography-scale">Size scale</a><a href="#typography-weights">Weights</a><a href="#typography-use">Where each is used</a><a href="#typography-headline-weight">Headline weight and size</a><a href="#typography-headline-context">Headline in context</a><a href="#typography-headline-centre">Title bars</a><a href="#typography-fail">If a font fails</a><a href="#typography-centre">Centring</a><a href="#typography-tokens">Tokens</a></nav>

<h4 class="ds-h4" id="typography-fonts">The two fonts</h4>
${tbl(['Font', 'Job', 'Licence', 'Weights', 'Alphabets', 'woff2 files', 'English page loads'], [
    ['Figtree', 'The interface: body, buttons, fields, tabs, chips, menus, nav, tables, chat, and every label.', 'SIL Open Font License 1.1, The Figtree Project Authors (2022)', '300 to 900, one variable file per alphabet (400, 500 and 600 are used)', 'Latin, Latin extended; Cyrillic and Greek fall to the fallback', `latin ${kb(20156)}, latin-ext ${kb(10280)}; total ${kb(30436)}`, `latin only: ${kb(20156)}`],
    ['Fraunces', 'Headlines, display text only: the landing title, page titles, the environment name in the top bar (the wordmark, below 640px wide in Figtree 600 at 16px), the space name on a Home card, module titles on Manage and a module\'s settings page, sheet headings.', 'SIL Open Font License 1.1, The Fraunces Project Authors (2020), no Reserved Font Name', '100 to 900, a weight axis only: the optical-size, soft and wonky axes are not in this file (600 is used)', 'Latin, Latin extended, Vietnamese in the full release; only latin is bundled', `latin ${kb(36620)} (one file, every weight)`, `${kb(36620)}, and only when a headline is drawn`],
  ])}
<p class="ds-desc"><b>Optical sizing.</b> The bundled Fraunces file has a weight axis only, so there is no real optical sizing: the letterforms are the same drawing at 18px and at 40px. I judged it at 18 and 22px in context below (the Home card name, the module title, the top bar): at 600 it is sturdy and readable down to 18px, so no minimum above the scale's own 18px is needed, and no place has to fall back to Figtree 600 for being too small. Adding the optical-size axis would mean a larger file (the full variable Fraunces is several times this size); not proposed.</p>
<p class="ds-desc">Each file is split by alphabet and loads only when a letter from it is drawn (<code>unicode-range</code>), so a page in English fetches Figtree's latin file, and Fraunces's when a headline is drawn. Each folder under <code>fonts/</code> carries its <code>OFL.txt</code>. Only the latin file of Fraunces is bundled: a headline with Polish, Czech or Vietnamese letters has those letters drawn by the next font in the stack, so a letter is never missing, only set in another font. No italic is bundled: the product has three italic rules, and the browser slants the upright. Considered and dropped: Nunito Sans, Source Sans 3, Archivo, Bricolage Grotesque (their files are removed).</p>

<h4 class="ds-h4" id="typography-scale">Size scale: nine steps and a micro count</h4>
<p class="ds-desc">Five interface sizes in Figtree (11, 12, 13, 14, 16) and four headline sizes in Fraunces (18, 22, 28, 40). The product uses 17 different pixel sizes today; the 10px size disappears, and nothing is below 11px, with one exception Thomas allowed as its own step: the 9px micro count (numbers only, in a 14px badge on the corner of an icon-only tab or icon button). <b>Line height:</b> body text 1.45; a single line of interface (button, tab, chip, field, tag) 1, so it centres in its box; headlines 1.15 (40), 1.2 (28 and 22), 1.25 (18). <b>Letter spacing:</b> -0.01em on the 40 and 28px headlines, none elsewhere, +0.06em on capitals (11px captions).</p>
<div data-slot="scale"></div>
<p class="ds-desc"><b>Where today's sizes go.</b> Counted in <code>public/style.css</code>: 12px 80 times, 13px 51, 11px 42, 14px 34, 10px 17, 15px 16, 18px 14, 16px 11, 20px 6, 9px 5, 22px 4; 17px, 40px and 6px twice; 8px, 24px and 28px once. The proposal moves each to the nearest step:</p>
${tbl(['Today (px)', 'Step', 'Which'], WHERE_TODAY)}

<h4 class="ds-h4" id="typography-weights">Weights</h4>
<p class="ds-desc">Three interface weights, 400, 500 and 600. Today's 650, 700 and 800 in the interface fold into 600 (700 appears 35 times, 650 five, 800 twice). Headlines are one weight; the choice is below. Figtree is variable, so 500 and 600 are real weights, not a jump.</p>
<div data-slot="weights"></div>

<h4 class="ds-h4" id="typography-use">Where each step is used</h4>
${tbl(['Component', 'Size', 'Weight', 'Line height'], USED)}
<p class="ds-desc">Body text and the two button sizes, set in the proposed fonts (the Buttons are the approved ones, unchanged). The Cyrillic and Greek lines show coverage: where Figtree has no letters, the browser takes them from the fallback.</p>
<div data-slot="body"></div>

<h4 class="ds-h4" id="typography-headline-weight">Headline weight and size</h4>
<p class="ds-desc"><b>Decided 2026-10-21: Fraunces 600, for every headline.</b> The two weights drawn side by side, at 40, 28, 22 and 18px and as the Home card name, on the page's dark and light (use the switch at the top). At 40 and 28px the two look alike; the weight matters at 22 and 18px. At 700 the strokes get heavy and the letters crowd at 18 and 22px, so the soft serif looks blunt at card size. At 600 the same letters stay open, the headline reads as one step above Figtree 600 rather than a different voice, and it matches the 600 the interface uses for its own strong text, so the product has one "strong". Fraunces 600 at 18px on a card reads well; 17px, today's size, is replaced by 18px.</p>
<div data-slot="cmp"></div>

<h4 class="ds-h4" id="typography-wordmark">The wordmark (decided 2026-10-21)</h4>
<p class="ds-desc"><b>The environment's name in the top bar is Figtree 600 at 16px below 640px wide, and Fraunces 600 at 18px from 641px up.</b> At 390px wide Fraunces at 18px cut "Coffee Pub" to "Coffe..."; Figtree at 16px fits it with room. A name that is still too long is cut with an ellipsis (it never wraps and never pushes the bar). The names below are a short one and a long one. Flip the width switch at the top (390, 700, 1280) to see the change at 640.</p>
<div data-slot="wordmark"></div>

<h4 class="ds-h4" id="typography-headline-context">The headline in context</h4>
<p class="ds-desc">The product's own classes and structure (<code>.topbar</code>, <code>.space-choice</code>, <code>.module-head</code>, <code>.mod-header</code>), with Fraunces applied to the big words only: the landing title, the page title, the environment name in the top bar (the wordmark, below 640px wide in Figtree 600 at 16px), the space name on a Home card and a module title. Small capital labels, buttons, fields, tabs, menus, the nav text including the space name in the bar, chat, tables, and the 14px title bar of a docked module stay in Figtree. The 17px and 20px of today become 18px and 22px here; flip to Today's fonts to see the old.</p>
<div data-slot="ctx"></div>

<h4 class="ds-h4" id="typography-headline-centre">Is a big title centred in its bar?</h4>
<p class="ds-desc">The same method as the buttons: a title bar with a 1px border, weight 600, <code>line-height: 1</code>, twelve headlines with no descenders, photographed at 4x, the middle of the ink against the middle of the bar. The check keeps the mean within 1px at 40, 28, 22 and 18px on every run. Fraunces has ascent 98.3% and descent 25% set (its own tables: 97.8% and 25.5%).</p>
<div data-slot="bars"></div>
<p class="ds-desc"><b>The fallback</b> (Fraunces failing to load): Times New Roman Bold (or Liberation Serif Bold) scaled to the same width, with the same ascent and descent, so the page does not jump. Measured live by this page, in this browser, for one headline at 28px, weight 600.</p>
<div data-slot="head-fail"></div>

<h4 class="ds-h4" id="typography-fail">If Figtree fails to load</h4>
<p class="ds-desc">While the file downloads, or if it never arrives (blocked, offline, a bad file), Figtree has a fallback face: Arial (or Helvetica, or Liberation Sans, whichever the device has) scaled to the same width and given the same ascent and descent as the bundled font. Text looks plain but the page does not jump when the real font arrives, and a button label sits where it would. Where the device has none of those, the stack goes on to Today's system fonts, unadjusted. Measured live by this page, in this browser, for one line of 14px text (the same sentence in every row).</p>
<div data-slot="fail"></div>

<h4 class="ds-h4" id="typography-centre">Is the button label centred?</h4>
<div data-slot="centre"></div>

<h4 class="ds-h4" id="typography-tokens">Tokens</h4>
<p class="ds-desc">Page-local for now, in <code>proposed-typography.css</code>; they go into <code>theme.css</code> or <code>style.css</code> when the system is built. In Today's fonts the two font tokens are the system stack.</p>
${tbl(['Token', 'Value', 'Used for'], TOKENS)}
<pre class="ds-pre">${h(TOKEN_CODE)}</pre>
`;
    block.querySelector('[data-slot="centre"]').innerHTML = CENTRE_HTML(tbl);
    const put = (slot, title, body, o) => block.querySelector(`[data-slot="${slot}"]`).appendChild(api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + TY_CSS }, o || {})));
    put('scale', 'Typography, the nine steps', scaleBody());
    put('weights', 'Typography, weights', weightBody());
    put('body', 'Typography, body text and buttons', buttonsBody());
    put('cmp', 'Headline weight, 600 and 700', cmpBody());
    put('wordmark', 'Wordmark', wrap('<div class="pm-mock"><p class="pm-ty-h">A short name</p><header class="topbar"><div class="nav-left"><a class="brand-home" href="#"><span class="brand-logo"><i class="fa-solid fa-mug-hot" aria-hidden="true"></i></span><span class="brand-name">Coffee Pub</span></a></div></header></div><div class="pm-mock"><p class="pm-ty-h">A long name, cut with an ellipsis</p><header class="topbar"><div class="nav-left"><a class="brand-home" href="#"><span class="brand-logo"><i class="fa-solid fa-mug-hot" aria-hidden="true"></i></span><span class="brand-name">The Carroll family trips and game nights, 2026 and 2027</span></a></div></header></div>'));
    put('ctx', 'Headline, in context', ctxBody());
    put('bars', 'Headline, title bars', barsBody());

    const SENT = 'Tomorrow we meet at the Louvre at nine thirty and bring our tickets.';
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
    const tr = (n, cls, extra, text) => `<tr><td>${n}</td><td><span class="pm-s ${cls}"${extra || ''}>${text}</span></td><td class="pm-n" data-out="w"></td><td class="pm-n" data-out="h"></td></tr>`;
    const head = '<thead><tr><th>Line</th><th>Sample</th><th>Width</th><th>Box height</th></tr></thead>';
    const failBody = `<div class="ds-proposed" data-font-fixed="1"><p class="pm-meas-h">Figtree</p><table class="pm-meas-t">${head}<tbody>${[['Bundled font', 'pm-f-figtree'], ['If it fails: the fallback face', 'pm-fb-figtree'], ['Arial, not adjusted', 'pm-f-arial'], ["Today's system stack", 'pm-f-today']].map(([n, c]) => tr(n, c, '', SENT)).join('')}</tbody></table></div>`;
    put('fail', 'Typography, if the font fails', failBody, { onload: measure });
    const HSENT = 'Plan the trip together in Kraków';
    const headFail = `<div class="ds-proposed" data-font-fixed="1"><p class="pm-meas-h">Fraunces</p><table class="pm-meas-t">${head}<tbody>${[['Bundled font', 'pm-hf-fraunces'], ['If it fails: the fallback face', 'pm-hb-fraunces'], ['Times New Roman, not adjusted', 'pm-h-times']].map(([n, c]) => tr(n, c, ' style="font-size:28px;font-weight:600"', HSENT)).join('')}</tbody></table></div>`;
    put('head-fail', 'Headline, if the font fails', headFail, { onload: measure });
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'typography', covers: ['typography', 'fonts'], group: 'Foundations', name: 'Typography', status: 'approved',
    words: 'typography headline heading title font fonts typeface type scale size sizes weight weights line height letter spacing text tokens fraunces figtree bundled self-hosted woff2 fallback metrics ascent descent centring baseline', render: renderTypography,
  });
})();
