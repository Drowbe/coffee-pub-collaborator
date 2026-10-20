/* The Foundations family (proposed): spacing, elevation (shadows, the scrim and the layers), radius, motion, icons and layout, drawn as sections of one
   block. Loaded by proposed.html through proposed-families.json, after proposed.js (the page engine); it registers one family through
   window.DS_PROPOSED.families.push and draws it with the tokens in proposed-foundations.css. Nothing here is a style of the product: markup, words,
   tables and the example-page rules (pm-fd-*, with the two keyframes the demos need) only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules, from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // The two keyframes live here, not in the stylesheet: the page check wants every rule of a stylesheet under .ds-proposed, and a keyframe step is not a selector.
  // They are the product's shimmer (defined four times today) and reaction-float (twice), as one each.
  const KEYFRAMES = `
@keyframes shimmer { to { background-position: -200% 0; } }
@keyframes reaction-float {
  0% { transform: translate(-50%, 0) scale(0.6); opacity: 0; }
  15% { transform: translate(-50%, -10px) scale(1.15); opacity: 1; }
  100% { transform: translate(-50%, -64px) scale(1); opacity: 0; }
}`;

  // Layout of the example pages only (not a style of the product).
  const FD_CSS = KEYFRAMES + `
.pm-fd-cap { display: block; margin-bottom: 4px; color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-fd-note { margin: 8px 0 0; color: var(--text-dim); font-size: 12px; }
.pm-fd-two { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; align-items: start; }
.pm-fd-three { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 16px; align-items: start; }
.pm-fd-box { box-sizing: border-box; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-large); background: var(--bg-section); }
.pm-fd-code { font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; }
.pm-fd-dim { color: var(--text-dim); }

/* spacing scale */
.pm-fd-srow { display: grid; grid-template-columns: 96px 40px 48px minmax(0, 1fr); gap: 4px 12px; align-items: center; padding: 6px 0; font-size: 13px; }
.pm-fd-srow + .pm-fd-srow { border-top: 1px solid var(--border); }
.pm-fd-num { color: var(--text-dim); font-size: 12px; font-variant-numeric: tabular-nums; }
.pm-fd-track { display: block; width: 48px; height: 12px; background: color-mix(in srgb, var(--text) 8%, transparent); border-radius: var(--radius-min); }
.pm-fd-bar { display: block; height: 12px; background: var(--accent); border-radius: var(--radius-min); }
.pm-fd-use { color: var(--text-dim); font-size: 12px; }
@media (max-width: 520px) { .pm-fd-srow { grid-template-columns: 96px 40px 48px; } .pm-fd-use { grid-column: 1 / -1; } }

/* before and after: the same markup, the strays against the scale */
.pm-fd-before { --p-panel: 14px; --p-row-y: 6px; --p-row-x: 10px; --g-in: 6px; --p-card: 14px; --g-between: 10px; }
.pm-fd-after { --p-panel: var(--space-4); --p-row-y: var(--space-2); --p-row-x: calc(var(--space-2) + var(--space-0)); --g-in: var(--space-2); --p-card: var(--space-3); --g-between: var(--space-2); }
.pm-fd-mpanel { display: grid; gap: var(--g-between); padding: var(--p-panel); border-radius: var(--radius-large); background: var(--bg-section); }
.pm-fd-mrow { display: flex; align-items: center; gap: var(--g-in); padding: var(--p-row-y) var(--p-row-x); border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-card); font-size: 13px; }
.pm-fd-mrow b { margin-left: auto; color: var(--text-dim); font-size: 12px; font-weight: 500; }
.pm-fd-mcard { display: grid; gap: var(--g-in); padding: var(--p-card); border: 1px solid var(--border); border-radius: var(--radius-large); background: var(--bg-card); font-size: 13px; }
.pm-fd-mcard strong { font-size: 14px; }
.pm-fd-mcard span { color: var(--text-dim); font-size: 12px; }

/* shadows */
.pm-fd-lifts { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 20px; padding: 16px; border-radius: var(--radius-large); background: var(--bg); }
.pm-fd-lift { box-sizing: border-box; min-height: 84px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-card); font-size: 13px; }
.pm-fd-lift b { display: block; margin-bottom: 4px; font-size: 13px; }
.pm-fd-lift span { display: block; color: var(--text-dim); font-size: 12px; }
.pm-fd-s1 { box-shadow: var(--shadow-1); }
.pm-fd-s2 { box-shadow: var(--shadow-2); }
.pm-fd-s3 { box-shadow: var(--shadow-3); border-radius: var(--radius-large); }
.pm-fd-today { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
.pm-fd-today .pm-fd-lift { min-height: 64px; }

/* scrim */
.pm-fd-scrim { position: relative; overflow: hidden; height: 120px; border-radius: var(--radius-medium); background: var(--bg-section); border: 1px solid var(--border); }
.pm-fd-scrim p { margin: 12px; font-size: 13px; }
.pm-fd-scrim i { position: absolute; inset: 0; background: var(--scrim); }
.pm-fd-old { position: relative; overflow: hidden; height: 44px; border-radius: var(--radius-small); background: var(--bg-section); border: 1px solid var(--border); font-size: 12px; }
.pm-fd-old i { position: absolute; inset: 0; background: var(--old); }
.pm-fd-old span { position: absolute; left: 8px; top: 12px; z-index: 1; }

/* layers: the eight, offset so each one hides a corner of the one below. The markup is highest first, so only z-index decides. */
.pm-fd-stack { position: relative; height: 286px; border-radius: var(--radius-medium); background: var(--bg); border: 1px solid var(--border); overflow: hidden; }
.pm-fd-layer { position: absolute; box-sizing: border-box; width: 160px; height: 58px; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-card); font-size: 12px; }
.pm-fd-layer b { display: block; font-size: 13px; }
.pm-fd-layer span { color: var(--text-dim); }
.pm-fd-layer.on { background: var(--selected-bg); }
.pm-fd-scene { position: relative; height: 330px; overflow: hidden; border-radius: var(--radius-medium); background: var(--bg-section); border: 1px solid var(--border); }
.pm-fd-scene > * { position: absolute; box-sizing: border-box; }
.pm-fd-scene .pm-fd-page { inset: 0; z-index: var(--z-content); padding: 52px 16px 16px; font-size: 13px; }
.pm-fd-scene .pm-fd-page p { margin: 0 0 8px; color: var(--text-dim); }
.pm-fd-scene .pm-fd-bar-top { left: 0; right: 0; top: 0; height: var(--topbar-h); z-index: var(--z-bar); display: flex; align-items: center; padding: 0 16px; background: var(--bg-card); border-bottom: 1px solid var(--border); font-size: 13px; }
.pm-fd-scene .pm-fd-veil { inset: 0; z-index: var(--z-dialog); background: var(--scrim); }
.pm-fd-scene .pm-fd-dialog { left: 12%; top: 64px; width: min(300px, 76%); height: 190px; z-index: var(--z-dialog); padding: 14px; border: 1px solid var(--border); border-radius: var(--radius-large); background: var(--bg-card); box-shadow: var(--shadow-3); font-size: 13px; }
.pm-fd-scene .pm-fd-dialog h4 { margin: 0 0 8px; font-size: 14px; }
.pm-fd-scene .pm-fd-pop { left: 38%; top: 140px; width: min(190px, 56%); height: 120px; z-index: var(--z-popover); padding: 10px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-card); box-shadow: var(--shadow-2); font-size: 12px; }
.pm-fd-scene .pm-fd-toast { left: 22%; right: 6%; bottom: 56px; height: 40px; z-index: var(--z-toast); display: flex; align-items: center; gap: 8px; padding: 0 12px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-card); box-shadow: var(--shadow-2); font-size: 13px; }
.pm-fd-tag { margin-left: auto; padding: 0 6px; border: 1px solid var(--border); border-radius: var(--radius-small); color: var(--text-dim); font-size: 11px; line-height: 16px; white-space: nowrap; }

/* radius */
.pm-fd-rgrid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; }
.pm-fd-rbox { box-sizing: border-box; display: flex; flex-direction: column; justify-content: center; gap: 4px; min-height: 72px; padding: 10px; border: 1px solid var(--border); background: var(--bg-card); font-size: 12px; }
.pm-fd-rbox:is([data-radius="min"], [data-role="min"]) { border-radius: var(--radius-min); }
.pm-fd-rbox:is([data-radius="small"], [data-role="small"]) { border-radius: var(--radius-small); }
.pm-fd-rbox:is([data-radius="medium"], [data-role="medium"]) { border-radius: var(--radius-medium); }
.pm-fd-rbox:is([data-radius="large"], [data-role="large"]) { border-radius: var(--radius-large); }
.pm-fd-rbox:is([data-radius="round"], [data-role="round"]) { border-radius: var(--radius-round); }
.pm-fd-rbox b { font-size: 13px; }
.pm-fd-rbox span { color: var(--text-dim); }
.pm-fd-rbox.pm-fd-dot { align-items: center; width: 72px; justify-self: start; }

/* motion */
.pm-fd-demos { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 16px; align-items: start; }
.pm-fd-demo { box-sizing: border-box; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-large); background: var(--bg-section); }
.pm-fd-demo h4 { margin: 0 0 2px; font-size: 14px; }
.pm-fd-demo p { margin: 0 0 8px; color: var(--text-dim); font-size: 12px; }
.pm-fd-field { position: relative; overflow: hidden; height: 120px; margin-bottom: 8px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg); }
.pm-fd-fill { position: absolute; left: 12px; top: 12px; width: 120px; height: 38px; display: flex; align-items: center; justify-content: center; border: 1px solid var(--border); border-radius: var(--radius-small); background: var(--bg-card); font-size: 13px; transition: background var(--motion-fast) var(--ease-out), transform var(--motion-fast) var(--ease-out); }
.pm-fd-demo[data-on] .pm-fd-fill { background: var(--selected-bg); transform: scale(0.97); }
.pm-fd-sheet { position: absolute; left: 8px; right: 8px; bottom: 0; height: 56px; padding: 8px 12px; border: 1px solid var(--border); border-radius: var(--radius-large) var(--radius-large) 0 0; background: var(--bg-card); font-size: 12px; transform: translateY(100%); opacity: 0; transition: transform var(--motion-base) var(--ease-out), opacity var(--motion-base) var(--ease-out); }
.pm-fd-fpop { position: absolute; right: 12px; top: 10px; width: 96px; padding: 8px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-card); box-shadow: var(--shadow-2); font-size: 12px; opacity: 0; transform: translateY(-4px); transition: opacity var(--motion-base) var(--ease-out), transform var(--motion-base) var(--ease-out); }
.pm-fd-ftoast { position: absolute; left: 12px; top: 10px; padding: 6px 10px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-card); box-shadow: var(--shadow-2); font-size: 12px; opacity: 0; transform: translateY(8px); transition: opacity var(--motion-base) var(--ease-out), transform var(--motion-base) var(--ease-out); }
.pm-fd-demo[data-on] :is(.pm-fd-sheet, .pm-fd-fpop, .pm-fd-ftoast) { opacity: 1; transform: none; }
.pm-fd-skel { height: 12px; margin: 8px 12px; border-radius: var(--radius-small); background: linear-gradient(90deg, var(--bg-section), color-mix(in srgb, var(--bg-section) 82%, var(--text)), var(--bg-section)); background-size: 200% 100%; animation: shimmer 1.4s linear infinite; }
.pm-fd-react { position: absolute; left: 50%; bottom: 14px; color: var(--accent); font-size: 28px; line-height: 1; animation: reaction-float 2.2s var(--ease-out) forwards; }
.pm-fd-read { margin: 0; padding: 8px 12px; border-radius: var(--radius-medium); background: color-mix(in srgb, var(--text) 8%, transparent); font-size: 12px; }
.pm-fd-read b { font-weight: 600; }

/* icons */
.pm-fd-irow { display: grid; grid-template-columns: 90px 32px minmax(0, 1fr); gap: 4px 12px; align-items: center; padding: 6px 0; }
.pm-fd-irow + .pm-fd-irow { border-top: 1px solid var(--border); }
.pm-fd-irow .pm-fd-ic { color: var(--text-dim); }
.pm-fd-ic { display: inline-flex; align-items: center; justify-content: center; color: var(--text-dim); line-height: 1; }
.pm-fd-ic:hover, .pm-fd-ic.ds-force-hover { color: var(--icon-hover); }
.pm-fd-wrong { color: var(--danger); }
.pm-fd-pair { display: grid; grid-template-columns: minmax(0, 1fr) 28px minmax(0, 1fr); gap: 8px; align-items: center; padding: 8px 0; font-size: 13px; }
.pm-fd-pair + .pm-fd-pair { border-top: 1px solid var(--border); }
.pm-fd-pair > div { display: flex; align-items: center; gap: 8px; }
.pm-fd-roles { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.pm-fd-role { box-sizing: border-box; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-large); background: var(--bg-card); font-size: 12px; }
.pm-fd-role b { display: block; margin-bottom: 8px; font-size: 13px; }
.pm-fd-role .pm-fd-ic { font-size: var(--icon-20); }
.pm-fd-chipicon { width: 32px; height: 32px; border-radius: var(--radius-small); background: color-mix(in srgb, var(--tint-blue) 22%, var(--bg-card)); color: color-mix(in srgb, var(--tint-blue) 62%, var(--text)); font-size: var(--icon-16); }
.pm-fd-bsizes { display: flex; flex-wrap: wrap; align-items: flex-end; gap: 20px; }
.pm-fd-bsizes > div { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }
.pm-fd-bsizes small { color: var(--text-dim); font-size: 11px; }

/* layout */
.pm-fd-ruler { position: relative; display: grid; grid-template-columns: 640fr 260fr 300fr 200fr; height: 40px; border-radius: var(--radius-medium); overflow: hidden; border: 1px solid var(--border); background: var(--bg-section); }
.pm-fd-ruler > span { display: flex; flex-direction: column; justify-content: center; padding: 0 8px; overflow: hidden; font-size: 11px; line-height: 14px; white-space: nowrap; color: var(--text-dim); }
.pm-fd-ruler > span + span { border-left: 1px solid var(--border); }
.pm-fd-ruler b { font-size: 12px; font-weight: 600; color: var(--text); }
.pm-fd-ruler > span.now { background: var(--selected-bg); color: var(--text); }
.pm-fd-ticks { display: grid; grid-template-columns: 640fr 260fr 300fr 200fr; margin: 2px 0 8px; color: var(--text-dim); font-size: 11px; }
.pm-fd-ticks span:nth-child(n+1) { text-align: right; padding-right: 2px; }
.pm-fd-switch { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin: 12px 0 8px; font-size: 12px; }
.pm-fd-clip { overflow: hidden; border-radius: var(--radius-medium); border: 1px solid var(--border); background: var(--bg-section); }
.pm-fd-dev { container-type: inline-size; margin: 0; background: var(--bg); }
.pm-fd-dev > .pm-fd-app { display: grid; grid-template-rows: var(--topbar-h) 1fr; min-height: 210px; }
.pm-fd-dev .pm-fd-top { display: flex; align-items: center; gap: 8px; padding: 0 var(--space-4); border-bottom: 1px solid var(--border); background: var(--bg-card); font-size: 13px; }
.pm-fd-dev .pm-fd-tier::before { content: "wide"; font-weight: 600; }
.pm-fd-dev .pm-fd-body { display: grid; grid-template-columns: minmax(0, 1fr) 260px; gap: 16px; align-content: start; padding: var(--space-4); max-width: var(--page-max); margin: 0 auto; width: 100%; box-sizing: border-box; }
.pm-fd-dev .pm-fd-tile { box-sizing: border-box; min-height: 120px; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-large); background: var(--bg-section); font-size: 12px; color: var(--text-dim); }
.pm-fd-dev .pm-fd-tile b { display: block; margin-bottom: 4px; color: var(--text); font-size: 13px; }
.pm-fd-dev .pm-fd-bottom { display: none; align-items: center; justify-content: space-around; height: var(--bottom-bar-h); border-top: 1px solid var(--border); background: var(--bg-card); font-size: 12px; color: var(--text-dim); }
@container (max-width: 900px) { .pm-fd-dev .pm-fd-tier::before { content: "tablet"; } .pm-fd-dev .pm-fd-body { grid-template-columns: minmax(0, 1fr); } }
@container (max-width: 640px) { .pm-fd-dev .pm-fd-tier::before { content: "phone"; } .pm-fd-dev .pm-fd-body { padding: var(--space-3); } .pm-fd-dev .pm-fd-bottom { display: flex; } }
@container (min-width: 1200px) { .pm-fd-dev .pm-fd-tier::before { content: "wide"; } }
@container (min-width: 901px) and (max-width: 1199px) { .pm-fd-dev .pm-fd-tier::before { content: "desktop"; } }
.pm-fd-skelwrap { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 24px; align-items: start; }
.pm-fd-skeleton { position: relative; box-sizing: border-box; display: grid; grid-template-columns: 1fr; border: 1px solid var(--border); border-radius: var(--radius-medium); overflow: hidden; background: var(--bg); font-size: 12px; }
.pm-fd-band { box-sizing: border-box; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 0 12px; border-bottom: 1px solid var(--border); background: var(--bg-card); }
.pm-fd-band span:last-child { color: var(--text-dim); font-variant-numeric: tabular-nums; }
.pm-fd-band.pm-fd-b-fill { height: 92px; justify-content: center; background: var(--bg-section); color: var(--text-dim); text-align: center; }
.pm-fd-skeleton { --module-head-h: 34px; }
.pm-fd-skeleton .pm-fd-b-top { height: var(--topbar-h); }
.pm-fd-skeleton .pm-fd-b-head { height: var(--module-head-h); }
.pm-fd-skeleton .pm-fd-b-tool { height: var(--toolbar-h); }
.pm-fd-skeleton .pm-fd-b-status { height: var(--status-h); }
.pm-fd-skeleton .pm-fd-b-bottom { height: var(--bottom-bar-total); align-items: flex-start; padding-top: 0; border-bottom: 0; }
.pm-fd-skeleton .pm-fd-b-bottom .pm-fd-b-main { display: flex; align-items: center; justify-content: space-between; width: 100%; height: var(--bottom-bar-h); }
.pm-fd-skeleton.pm-fd-phone { --safe-bottom: 34px; --module-head-h: 42px; --bottom-bar-total: calc(var(--bottom-bar-h) + var(--safe-bottom)); }
.pm-fd-skeleton .pm-fd-b-safe-note { position: absolute; left: 0; right: 0; bottom: 0; height: var(--safe-bottom); display: flex; align-items: center; justify-content: center; border-top: 1px dashed var(--border); background: color-mix(in srgb, var(--text) 8%, transparent); color: var(--text-dim); font-size: 11px; }
.pm-fd-skeleton.pm-fd-phone { padding-bottom: 0; }
.pm-fd-widths { display: grid; gap: 12px; }
`;

  const SPACE = [
    [0, 2, 'The hairline step. A nudge between an icon and its text, a dot and a count; the 2 in a row\'s 8 + 2. Never a gap between boxes.'],
    [1, 4, 'The gap inside a tight cluster: an icon and its label, chips in a row, a menu\'s padding.'],
    [2, 8, 'The gap between things: rows, cards, buttons in a bar. A row\'s padding above and below.'],
    [3, 12, 'Padding in a card. The gap between a label and its group.'],
    [4, 16, 'The gap between groups. Padding in a panel and on a page (12 on a phone).'],
    [5, 20, 'The Home space card\'s padding.'],
    [6, 24, 'The gap between sections of a page. A dialog\'s padding.'],
    [7, 32, 'Padding of an empty state; air around a feature icon.'],
    [8, 40, 'Space above a page title; a large empty state.'],
    [9, 48, 'The largest step. Space on the Home page between its parts.'],
  ];

  const spaceBody = () => `<div class="ds-proposed"><div>${SPACE.map(([n, px, use]) => `<div class="pm-fd-srow" data-space="${n}" data-px="${px}"><code class="pm-fd-code">--space-${n}</code><span class="pm-fd-num">${px}px</span><span class="pm-fd-track"><span class="pm-fd-bar" style="width:var(--space-${n})"></span></span><span class="pm-fd-use">${use}</span></div>`).join('')}</div></div>`;

  const mini = (cls, label, list) => `<div class="${cls}" data-mini="${cls.replace('pm-fd-', '')}"><span class="pm-fd-cap">${label}</span>
    <div class="pm-fd-mpanel">
      <div class="pm-fd-mrow">${fa('list-check')}<span>Book the flights</span><b>Fri</b></div>
      <div class="pm-fd-mrow">${fa('list-check')}<span>Renew the passports</span><b>Done</b></div>
      <div class="pm-fd-mcard"><strong>Louvre</strong><span>Paris, Day 2, 9:30</span></div>
    </div>
    <p class="pm-fd-note">${list}</p></div>`;
  const beforeAfterBody = () => `<div class="ds-proposed"><div class="pm-fd-two">
    ${mini('pm-fd-before', 'Today', 'Row 6 by 10, gap 6. Card 14, gap 6. Panel 14, gap 10. Three off-scale values that look almost the same.')}
    ${mini('pm-fd-after', 'On the scale', 'Row 8 by 8 + 2, gap 8. Card 12, gap 8. Panel 16, gap 8. Every value is a step, and the gaps agree.')}
  </div></div>`;

  // ---- elevation ----
  const liftsBody = () => `<div class="ds-proposed"><div class="pm-fd-lifts">
    <div class="pm-fd-lift pm-fd-s1" data-shadow="1"><b>--shadow-1</b>0 2px 8px<span>A card or row while it is dragged.</span></div>
    <div class="pm-fd-lift pm-fd-s2" data-shadow="2"><b>--shadow-2</b>0 4px 12px<span>Menus, popovers, the list under a field, toasts.</span></div>
    <div class="pm-fd-lift pm-fd-s3" data-shadow="3"><b>--shadow-3</b>0 8px 30px<span>Dialogs, sheets and floating windows.</span></div>
  </div></div>`;
  const TODAY_SHADOWS = [
    ['0 8px 30px black 50%', '0 8px 30px rgba(0, 0, 0, 0.5)', '7 uses', '--shadow-3, as it is'],
    ['0 16px 48px black 45%', '0 16px 48px rgba(0, 0, 0, 0.45)', '4 uses', '--shadow-3 (smaller)'],
    ['0 8px 24px black 45%', '0 8px 24px rgba(0, 0, 0, 0.45)', '3 uses', '--shadow-3'],
    ['0 12px 32px black 35%', '0 12px 32px color-mix(in srgb, black 35%, transparent)', '2 uses', '--shadow-3'],
    ['0 8px 18px black 22%', '0 8px 18px color-mix(in srgb, black 22%, transparent)', '2 uses', '--shadow-2'],
    ['0 2px 10px black 25%', '0 2px 10px color-mix(in srgb, black 25%, transparent)', '2 uses', '--shadow-1'],
    ['0 1px 6px black 30%', '0 1px 6px rgba(0, 0, 0, 0.3)', '3 uses', '--shadow-1'],
    ['0 2px 6px tint 40%', '0 2px 6px color-mix(in srgb, var(--accent) 40%, transparent)', '3 uses', 'none: the tint stays on the icon'],
  ];
  const todayShadowsBody = () => `<div class="ds-proposed"><div class="pm-fd-lifts pm-fd-today">${TODAY_SHADOWS.map(([n, v, u, to]) => `<div class="pm-fd-lift" style="box-shadow:${v}"><b>${n}</b>${u}<span>${to}</span></div>`).join('')}</div></div>`;
  const scrimBody = () => `<div class="ds-proposed"><div class="pm-fd-three">
    <div><span class="pm-fd-cap">One scrim, --scrim</span><div class="pm-fd-scrim" data-scrim><p>Page behind a dialog or a sheet</p><p class="pm-fd-dim">Black at 55%.</p><i></i></div></div>
    ${[35, 60, 72].map((a) => `<div><span class="pm-fd-cap">Today ${a}%</span><div class="pm-fd-old" style="--old: rgba(0, 0, 0, ${a / 100})"><i></i><span>Goes to 55%</span></div></div>`).join('')}
  </div></div>`;

  // ---- layers ----
  const LAYERS = [
    ['Content', '0 to 9, local', 'var(--z-content)', 'content'],
    ['Bar', '20', 'var(--z-bar)', 'bar'],
    ['Floating module', '25', 'var(--z-window)', 'window'],
    ['Menu', '26', 'var(--z-menu)', 'menu'],
    ['Page over the call', '30', 'var(--z-page)', 'page'],
    ['Dialog or sheet', '40', 'var(--z-dialog)', 'dialog'],
    ['Popover', '50', 'var(--z-popover)', 'popover'],
    ['Toast', '60', 'var(--z-toast)', 'toast'],
    ['Debug', '100', 'var(--z-debug)', 'debug'],
  ];
  const stackBody = () => {
    const n = LAYERS.length;
    const tile = (l, i) => `<div class="pm-fd-layer" data-layer="${l[3]}" style="z-index:${l[2]};left:calc(${i} * (100% - 160px) / ${n - 1});top:calc(${i} * 25px + 6px)"><b>${l[0]}</b><span>${l[1]}</span></div>`;
    // highest first in the markup: the order of the page does not decide, the layer does
    return `<div class="ds-proposed"><div class="pm-fd-stack">${LAYERS.map((l, i) => [l, i]).reverse().map(([l, i]) => tile(l, i)).join('')}</div></div>`;
  };
  const sceneBody = () => `<div class="ds-proposed"><div class="pm-fd-scene">
    <div class="pm-fd-page"><p>The page behind: a list, a card, a form.</p><p>It sits at layer 0 and is dimmed by the scrim.</p></div>
    <div class="pm-fd-bar-top" data-layer="bar">Top bar<span class="pm-fd-tag" style="margin-left:auto">bar 20</span></div>
    <div class="pm-fd-veil" data-layer="scrim" aria-hidden="true"></div>
    <div class="pm-fd-dialog" data-layer="dialog"><h4>Move the booking <span class="pm-fd-tag" style="float:right">dialog 40</span></h4><p class="pm-fd-dim" style="margin:0 0 8px">Pick a new day.</p><button type="button" class="btn btn-small">28 Oct, Tue ${fa('chevron-down')}</button></div>
    <div class="pm-fd-pop" data-layer="popover"><b>October</b> <span class="pm-fd-tag" style="float:right">popover 50</span><p class="pm-fd-dim" style="margin:6px 0 0">A date picker inside the dialog, partly outside it.</p></div>
    <div class="pm-fd-toast" data-layer="toast">${fa('circle-check')}<span>Saved</span><span class="pm-fd-tag">toast 60</span></div>
  </div></div>`;

  // ---- radius ----
  const RADII = [
    ['--radius-min', '3px', 'min', 'Inside a control: a tick box, a key cap, a small swatch.'],
    ['--radius-small', '5px', 'small', 'Buttons, fields, tabs, chips, a row inside a card, an icon chip.'],
    ['--radius-medium', '7px', 'medium', 'Menus and popovers, a row on a panel, a toast.'],
    ['--radius-large', '11px', 'large', 'Cards, panels, dialogs and sheets (top corners).'],
    ['--radius-round', '999px', 'round', 'Counts, dots, avatars and the micro count.'],
  ];
  const radiusBody = () => `<div class="ds-proposed"><div class="pm-fd-rgrid">${RADII.map(([t, px, k, use]) => `<div class="pm-fd-rbox" data-radius="${k}"><b>${t}</b><span>${px}</span><span>${use}</span></div>`).join('')}</div></div>`;
  const rolesBody = () => `<div class="ds-proposed"><div class="pm-fd-rgrid">
    ${[['Menu or popover', 'medium'], ['Card or panel', 'large'], ['Row on a panel', 'medium'], ['Row inside a card', 'small'], ['Button, field, tab, chip', 'small']].map(([n, k]) => `<div class="pm-fd-rbox" data-role="${k}"><b>${n}</b><span>--radius-${k}</span></div>`).join('')}
    ${[['Count', 'round'], ['Dot', 'round'], ['Avatar', 'round'], ['Micro count', 'round']].map(([n, k]) => `<div class="pm-fd-rbox pm-fd-dot" data-role="${k}"><span>${n}</span></div>`).join('')}
  </div></div>`;

  // ---- motion ----
  const motionBody = () => `<div class="ds-proposed" data-motion><div class="pm-fd-demos">
    <div class="pm-fd-demo" data-demo="fast"><h4>Fast, 120ms</h4><p>Hover, press and fill changes.</p>
      <div class="pm-fd-field"><div class="pm-fd-fill">Hover or press me</div></div>
      <button type="button" class="btn btn-small" data-play>${fa('play')} Play</button></div>
    <div class="pm-fd-demo" data-demo="base"><h4>Base, 200ms</h4><p>Enter and exit: a sheet, a popover, a toast.</p>
      <div class="pm-fd-field"><div class="pm-fd-ftoast">${fa('circle-check')} Saved</div><div class="pm-fd-fpop">A popover</div><div class="pm-fd-sheet">A sheet from the bottom</div></div>
      <button type="button" class="btn btn-small" data-play>${fa('play')} Play</button></div>
    <div class="pm-fd-demo" data-demo="loops"><h4>Two shared keyframes</h4><p>The shimmer of a loading line; the reaction that floats up.</p>
      <div class="pm-fd-field"><div class="pm-fd-skel"></div><div class="pm-fd-skel" style="width:60%"></div><div class="pm-fd-skel" style="width:80%"></div><span class="pm-fd-react" data-react>${fa('heart')}</span></div>
      <button type="button" class="btn btn-small" data-replay>${fa('rotate-right')} Replay the reaction</button></div>
  </div>
  <p class="pm-fd-read" data-readout style="margin-top:12px" role="status"></p></div>`;
  // The frame's script: Play toggles a demo; the readout says what the page is doing now (it follows the rule, the switch and the emulated setting).
  function motionLoad(doc) {
    const root = doc.querySelector('[data-motion]');
    for (const d of doc.querySelectorAll('.pm-fd-demo')) d.querySelector('[data-play]')?.addEventListener('click', () => { if (d.hasAttribute('data-on')) d.removeAttribute('data-on'); else d.setAttribute('data-on', ''); });
    doc.querySelector('[data-replay]').addEventListener('click', () => { const r = doc.querySelector('[data-react]'); r.style.animation = 'none'; void r.offsetWidth; r.style.animation = ''; });
    const out = doc.querySelector('[data-readout]');
    const read = () => {
      const win = doc.defaultView; const fill = doc.querySelector('.pm-fd-fill'); const skel = doc.querySelector('.pm-fd-skel');
      const t = win.getComputedStyle(fill).transitionDuration; const a = win.getComputedStyle(skel).animationDuration;
      const ms = (v) => { const n = parseFloat(v); return /ms$/.test(v) ? n : n * 1000; };
      const off = ms(t) < 1;
      out.innerHTML = off ? `<b>Reduced motion is on.</b> The transition is ${ms(t)}ms and the shimmer is ${ms(a)}ms: everything ends at once and nothing repeats.` : `<b>Motion is on.</b> The fill changes in ${ms(t)}ms, a sheet in 200ms and the shimmer repeats every ${ms(a)}ms.`;
      out.dataset.state = off ? 'off' : 'on';
    };
    read();
    new MutationObserver(read).observe(root, { attributes: true, attributeFilter: ['data-reduce'] });
    const mq = doc.defaultView.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.addEventListener) mq.addEventListener('change', read);
    doc.defaultView.__fdRead = read;
  }

  // ---- icons ----
  const ISIZES = [
    ['12', 'text-12', 'Caption, a count beside text', 'Caption, 12'],
    ['14', 'text-14', 'Dense UI: a small button, a row, a tab', 'Dense, 14'],
    ['16', 'text-16', 'Default UI and a phone field', 'Default, 16'],
    ['20', null, 'Action buttons', 'Beside 18 text'],
    ['24', null, 'Empty states and feature icons', 'Beside 22 text'],
  ];
  const iconSizesBody = () => `<div class="ds-proposed"><div>
    <div class="pm-fd-irow" style="border-top:0"><span class="pm-fd-cap" style="margin:0">Token</span><span class="pm-fd-cap" style="margin:0">Icon</span><span class="pm-fd-cap" style="margin:0">Used for, and the text step beside it</span></div>
    ${ISIZES.map(([n, tx, use, txt]) => `<div class="pm-fd-irow" data-isize="${n}"><code class="pm-fd-code">--icon-${n}</code><span class="pm-fd-ic" style="font-size:var(--icon-${n})">${fa('location-dot')}</span><span style="font-size:${tx ? `var(--${tx})` : n === '20' ? 'var(--text-18)' : 'var(--text-22)'};line-height:1.2">${use} <span class="pm-fd-dim" style="font-size:var(--text-12)">(${txt}${tx ? '' : '; there is no icon-18 or icon-22'})</span></span></div>`).join('')}
  </div></div>`;
  const solidBody = () => `<div class="ds-proposed"><div class="pm-fd-two">
    <div><span class="pm-fd-cap">Today: three that are not solid</span>
      <div class="pm-fd-pair"><div><i class="fa-regular fa-face-smile pm-fd-wrong" style="font-size:var(--icon-20)" aria-hidden="true"></i><span>fa-regular fa-face-smile (emoji button)</span></div><span class="pm-fd-dim">${fa('arrow-right')}</span><div>${fa('face-smile', 'pm-fd-ic')}<span>fa-solid fa-face-smile</span></div></div>
      <div class="pm-fd-pair"><div><i class="fa-regular fa-square pm-fd-wrong" style="font-size:var(--icon-20)" aria-hidden="true"></i><span>fa-regular fa-square (Focus view)</span></div><span class="pm-fd-dim">${fa('arrow-right')}</span><div>${fa('square', 'pm-fd-ic')}<span>fa-solid fa-square</span></div></div>
      <div class="pm-fd-pair"><div><i class="fa-brands fa-square-web-awesome pm-fd-wrong" style="font-size:var(--icon-20)" aria-hidden="true"></i><span>fa-brands (Spotlight view)</span></div><span class="pm-fd-dim">${fa('arrow-right')}</span><div>${fa('expand', 'pm-fd-ic')}<span>a solid icon, picked at migration</span></div></div>
    </div>
    <div><span class="pm-fd-cap">Rule</span><p class="pm-fd-note" style="margin-top:0">Every icon is Font Awesome <b>solid</b>. Regular and light weights have different widths and strokes, so a row that mixes them looks uneven. Brands are only for a service's own mark (a map provider's logo), never as a stand-in for a feature. The one custom SVG is the map pin, listed under the exceptions below.</p></div>
  </div></div>`;
  const rolesIconBody = () => `<div class="ds-proposed"><div class="pm-fd-roles">
    <div class="pm-fd-role"><b>Default</b><span class="pm-fd-ic" data-role="default">${fa('gear')}</span><p class="pm-fd-note"><code class="pm-fd-code">--text-dim</code>, the muted text colour.</p></div>
    <div class="pm-fd-role"><b>Hover</b><span class="pm-fd-ic ds-force-hover" data-role="hover">${fa('gear')}</span><p class="pm-fd-note"><code class="pm-fd-code">--icon-hover</code>, the accent.</p></div>
    <div class="pm-fd-role"><b>Inside a button</b><button type="button" class="btn" data-role="button">${fa('pen')} Edit</button><p class="pm-fd-note">The button's own text colour. The icon never has a colour of its own there.</p></div>
    <div class="pm-fd-role"><b>Category</b><span class="pm-fd-ic pm-fd-chipicon" data-role="tint">${fa('landmark')}</span><p class="pm-fd-note">A tint, only on a category icon chip (Cards).</p></div>
  </div></div>`;
  const iconBtnBody = () => `<div class="ds-proposed"><div class="pm-fd-two">
    <div><span class="pm-fd-cap">Icon-only boxes follow the Buttons</span><div class="pm-fd-bsizes" data-bsizes>
      <div><button type="button" class="sdk-icon-btn btn-small btn-quiet" aria-label="More" title="More" data-bsize="30">${fa('ellipsis')}</button><small>30 small</small></div>
      <div><button type="button" class="sdk-icon-btn" aria-label="Add" title="Add" data-bsize="38">${fa('plus')}</button><small>38 default (44 on a phone)</small></div>
      <div><button type="button" class="sdk-icon-btn" style="--btn-h:44px" aria-label="Close" title="Close" data-bsize="44">${fa('xmark')}</button><small>44 tap (a phone)</small></div>
    </div><p class="pm-fd-note">Every icon-only control has an accessible name (<code class="pm-fd-code">aria-label</code>) and a tooltip (<code class="pm-fd-code">title</code>) with the same words.</p></div>
    <div><span class="pm-fd-cap">Icon and label</span><div class="pm-fd-bsizes"><button type="button" class="btn btn-primary">${fa('plus')} Add a task</button><button type="button" class="btn">${fa('pen')} Edit</button></div>
    <p class="pm-fd-note">Icon-only for actions that repeat down a list: more, close, add. Icon and label for a primary action, a rare one, and anything a new person must find. On a phone keep the label only where there is room.</p></div>
  </div></div>`;

  // ---- layout ----
  const rulerBody = () => `<div class="ds-proposed">
    <span class="pm-fd-cap">This frame follows the page's width switch (Fit, 390, 700, 1280)</span>
    <div class="pm-fd-ruler" data-ruler><span data-tier="phone"><b>Phone</b>0 to 640</span><span data-tier="tablet"><b>Tablet</b>641 to 900</span><span data-tier="desktop"><b>Desktop</b>901 to 1199</span><span data-tier="wide"><b>Wide</b>1200 up</span></div>
    <div class="pm-fd-ticks"><span>640</span><span>900</span><span>1200</span><span></span></div>
    <p class="pm-fd-read" data-here style="margin:0 0 4px"></p>
    <div class="pm-fd-switch" role="group" aria-label="Width of the page below"><span>Page below, at</span>
      <button type="button" class="btn btn-small" data-dev="390" aria-pressed="false">390</button><button type="button" class="btn btn-small" data-dev="700" aria-pressed="false">700</button><button type="button" class="btn btn-small" data-dev="900" aria-pressed="false">900</button><button type="button" class="btn btn-small" data-dev="1200" aria-pressed="true">1200</button>
      <span class="pm-fd-dim">The page answers to its own width here (a container); on the real page the same steps are media queries.</span></div>
    <div class="pm-fd-clip" data-clip><div class="pm-fd-dev" data-device style="width:1200px">
      <div class="pm-fd-app"><div class="pm-fd-top">${fa('bars')}<b>Trip</b><span class="pm-fd-dim">layout:</span><span class="pm-fd-tier" data-tier-name></span></div>
      <div class="pm-fd-body"><div class="pm-fd-tile"><b>Canvas</b>Page padding 16, 12 on a phone. Content up to 1200 wide.</div><div class="pm-fd-tile"><b>Side</b>Drops below the canvas on a tablet and a phone.</div></div>
      <div class="pm-fd-bottom" aria-hidden="true"><span>${fa('house')} Home</span><span>${fa('comments')} Chat</span><span>${fa('table-cells')} Modules</span></div></div>
    </div></div></div>`;
  function rulerLoad(doc) {
    const win = doc.defaultView;
    const dev = doc.querySelector('[data-device]'); const clip = doc.querySelector('[data-clip]');
    const here = doc.querySelector('[data-here]');
    const tiers = { phone: '(max-width: 640px)', tablet: '(min-width: 641px) and (max-width: 900px)', desktop: '(min-width: 901px) and (max-width: 1199px)', wide: '(min-width: 1200px)' };
    const mark = () => {
      let now = 'wide';
      for (const [k, q] of Object.entries(tiers)) { const on = win.matchMedia(q).matches; doc.querySelector(`[data-tier="${k}"]`).classList.toggle('now', on); if (on) now = k; }
      here.innerHTML = `<b>This frame is ${win.innerWidth}px wide: ${now}.</b>`;
      here.dataset.tier = now;
    };
    const fit = () => { const w = Number(dev.style.width.replace('px', '')); const z = Math.min(1, (clip.clientWidth || w) / w); dev.style.zoom = String(z); };
    for (const b of doc.querySelectorAll('[data-dev]')) b.addEventListener('click', () => {
      dev.style.width = b.dataset.dev + 'px';
      for (const o of doc.querySelectorAll('[data-dev]')) o.setAttribute('aria-pressed', String(o === b));
      fit();
    });
    mark(); fit();
    win.addEventListener('resize', () => { mark(); fit(); });
    if (win.ResizeObserver) new win.ResizeObserver(() => { mark(); fit(); }).observe(doc.body);
  }
  const skeletonBody = () => `<div class="ds-proposed"><div class="pm-fd-skelwrap">
    <div><span class="pm-fd-cap">Wider than a phone</span><div class="pm-fd-skeleton" data-skeleton="desktop">
      <div class="pm-fd-band pm-fd-b-top"><span>Top bar</span><span>44</span></div>
      <div class="pm-fd-band pm-fd-b-head"><span>Module header</span><span>34</span></div>
      <div class="pm-fd-band pm-fd-b-tool"><span>Toolbar</span><span>34</span></div>
      <div class="pm-fd-band pm-fd-b-fill"><span>Canvas<br>padding 16, content up to 1200<br>reading text up to 720</span></div>
      <div class="pm-fd-band pm-fd-b-status"><span>Status line</span><span>24</span></div>
    </div></div>
    <div><span class="pm-fd-cap">On a phone (640 and below)</span><div class="pm-fd-skeleton pm-fd-phone" data-skeleton="phone">
      <div class="pm-fd-band pm-fd-b-top"><span>Top bar</span><span>44</span></div>
      <div class="pm-fd-band pm-fd-b-head"><span>Module header</span><span>42</span></div>
      <div class="pm-fd-band pm-fd-b-tool"><span>Toolbar</span><span>34</span></div>
      <div class="pm-fd-band pm-fd-b-fill"><span>Canvas<br>padding 12</span></div>
      <div class="pm-fd-band pm-fd-b-status"><span>Status line</span><span>24</span></div>
      <div class="pm-fd-band pm-fd-b-bottom"><div class="pm-fd-b-main"><span>Bottom bar</span><span>54</span></div><div class="pm-fd-b-safe-note">+ safe area, 34 on a phone with a home bar</div></div>
    </div></div>
  </div></div>`;

  // ---- widths: one summary of the family at 390, 700 and 1280 ----
  const summaryBody = () => `<div class="ds-proposed"><div class="pm-fd-widths" data-summary>
    <div class="pm-fd-box"><span class="pm-fd-cap">Spacing and radius</span>
      ${mini('pm-fd-after', 'A row, a card, a panel', 'Gaps 8, card padding 12, panel 16. Corners: panel and card large, row on a panel medium.')}</div>
    <div class="pm-fd-box"><span class="pm-fd-cap">Elevation, icons</span>
      <div class="pm-fd-lifts" style="padding:12px"><div class="pm-fd-lift pm-fd-s2"><b>${fa('gear', 'pm-fd-ic')} Menu</b>--shadow-2<span>--icon-16 in a row.</span></div><div class="pm-fd-lift pm-fd-s3"><b>${fa('window-maximize', 'pm-fd-ic')} Dialog</b>--shadow-3<span>--icon-20 in a button.</span></div></div></div>
    <div class="pm-fd-box" data-box="layout"><span class="pm-fd-cap">Layout</span><div class="pm-fd-read" data-here2 style="margin:0">Phone up to 640, tablet to 900, wide from 1200.</div></div>
  </div></div>`;
  function summaryLoad(doc) {
    const win = doc.defaultView; const el = doc.querySelector('[data-here2]');
    const mark = () => { const w = win.innerWidth; const t = w <= 640 ? 'phone' : w <= 900 ? 'tablet' : w < 1200 ? 'desktop' : 'wide'; el.innerHTML = `<b>${w}px: ${t}.</b> Phone up to 640, tablet to 900, wide from 1200. Page padding ${win.getComputedStyle(doc.querySelector('.ds-proposed')).getPropertyValue('--page-pad')}.`; el.dataset.tier = t; };
    mark(); win.addEventListener('resize', mark);
  }

  const MOTION_TITLES = ['Foundations, motion'];

  function render(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="foundations-h"><a href="#foundations">Foundations: spacing, elevation, motion, icons and layout</a></h3><span class="ds-status-chip ds-st-proposed">Proposed</span><span class="ds-count">the scales every other family measures with; radius stays as it is</span></header>
<p class="ds-desc"><b>Proposed 2026-10-20, from Thomas's decisions of 2026-10-20.</b> Six parts, each a handful of tokens. (1) <b>Spacing</b>: a strict 4px scale, <code>--space-0</code> (2px) and <code>--space-1</code> to <code>--space-9</code> (4 to 48); 6px and 10px are not on it. (2) <b>Elevation</b>: three shadows, one scrim (black at 55%), and named layers from content to debug. (3) <b>Radius</b>: the five tokens as they are, with a role for each. (4) <b>Motion</b>: 120ms and 200ms, one easing, two shared keyframes and one reduced-motion rule. (5) <b>Icons</b>: five sizes tied to the type steps, solid only. (6) <b>Layout</b>: breakpoints 640, 900 and 1200, and the heights and widths of the page. Every value is a token on this page only (all under <code>.ds-proposed</code>); the product is untouched. The names I chose are listed at the end for Thomas to confirm.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#foundations-spacing">Spacing</a><a href="#foundations-elevation">Elevation</a><a href="#foundations-layers">Layers</a><a href="#foundations-radius">Radius</a><a href="#foundations-motion">Motion</a><a href="#foundations-icons">Icons</a><a href="#foundations-layout">Layout</a><a href="#foundations-widths">Widths</a><a href="#foundations-map">Today to proposed</a><a href="#foundations-alias">Aliases and migration</a><a href="#foundations-tokens">Tokens</a><a href="#foundations-choices">Chosen for Thomas to confirm</a></nav>

<h4 class="ds-h4" id="foundations-spacing">Spacing</h4>
<p class="ds-desc">Ten steps, each drawn at its real width (the grey track is 48px). The names count steps, not pixels: <code>--space-3</code> is 12px. <code>--space-0</code> is a hairline step for a nudge; it is never a gap between boxes.</p>
<div data-slot="space"></div>
<p class="ds-desc" style="margin-top:12px"><b>The rule for choosing.</b> Between things in a group, 8 (<code>--space-2</code>); between groups, 16 (<code>--space-4</code>); between sections of a page, 24 (<code>--space-6</code>). Inside a thing, the step that fits its size: 4 in a chip or a tight icon and label, 8 in a row, 12 in a card, 16 in a panel and on a page, 20 on the Home card. If a design wants 6, take 4 (a tight cluster) or 8 (anything else). If it wants 10, take 8 or 12, whichever matches its neighbours; a row's 10 is written 8 + 2 (<code>--space-2</code> and <code>--space-0</code>) so it stays as approved. 14 settles per component (panel 16, a popover's controls 12 or 16). A negative margin is allowed to widen a hit area or to cancel a parent's padding, written as <code>calc(-1 * var(--space-n))</code>.</p>
<h5 style="margin:18px 0 4px;font-size:13px">Before and after</h5>
<div data-slot="beforeafter"></div>
<h5 style="margin:18px 0 4px;font-size:13px">Today's most-used values, and where each goes</h5>
${tbl(['Value', 'Uses today', 'Goes to', 'Note'], [
    ['8', '376', '<code>--space-2</code>', 'Already the gap between things.'],
    ['6', '330', '<code>--space-1</code> or <code>--space-2</code>', 'Per component: 4 in a tight cluster, 8 elsewhere. Not in the scale.'],
    ['10', '259', '<code>--space-2</code> or <code>--space-3</code>', 'Per component. A row\'s 10 is 8 + 2.'],
    ['4', '219', '<code>--space-1</code>', ''],
    ['12', '190', '<code>--space-3</code>', 'Card padding.'],
    ['2', '153', '<code>--space-0</code>', 'The hairline step.'],
    ['16', '78', '<code>--space-4</code>', 'The gap between groups; panel and page padding.'],
    ['14', '77', '<code>--space-3</code> or <code>--space-4</code>', 'Settles per component. The panel is 16 here; a popover\'s controls (14 in Menus) become 12 or 16.'],
    ['3', '47', '<code>--space-0</code> or <code>--space-1</code>', ''],
    ['5', '41', '<code>--space-1</code>', ''],
    ['7', '25', '<code>--space-2</code>', ''],
    ['18', '23', '<code>--space-4</code> or <code>--space-5</code>', ''],
    ['20', '19', '<code>--space-5</code>', 'The Home card.'],
    ['24', '16', '<code>--space-6</code>', ''],
    ['40', '15', '<code>--space-8</code>', ''],
    ['9', '8', '<code>--space-2</code>', ''],
    ['30', '7', '<code>--space-7</code>', ''],
    ['32', '6', '<code>--space-7</code>', ''],
    ['36', '5', '<code>--space-7</code> or <code>--space-8</code>', ''],
    ['Negative margins', 'about 40', 'kept', 'Only to widen a hit area or cancel a parent\'s padding, as <code>calc(-1 * var(--space-n))</code>.'],
  ])}

<h4 class="ds-h4" id="foundations-elevation">Elevation</h4>
<p class="ds-desc">Three shadows. A flat thing has none; a shadow means "this is above what is behind it". In dark mode the shadow is black; in light mode it is the text colour at a low strength, so it never reads as a smudge. The dialog shadow is <code>0 8px 30px</code>, smaller than the old <code>0 16px 48px</code>.</p>
<div data-slot="lifts"></div>
<h5 style="margin:18px 0 4px;font-size:13px">The 66 shadows today fold into these three</h5>
<p class="ds-desc">The most-used shadows today, each beside where it goes. (Shown here as they are, in dark they are hard to see: that is part of why they fold.) Focus rings drawn as a shadow (9 uses) become the focus outline of the Fields. The 3px coloured inset bars go with the coloured edges.</p>
<div data-slot="today"></div>
<h5 style="margin:18px 0 4px;font-size:13px">The scrim</h5>
<p class="ds-desc">One token, <code>--scrim</code>, black at 55% in both modes. It replaces four values today (35, 55, 60 and 72%). A dialog, a sheet and the bottom sheet of a menu all use it. The Menus family drew 35% in light mode; this is the one that was decided, so Menus follows it.</p>
<div data-slot="scrim"></div>

<h4 class="ds-h4" id="foundations-layers">Layers</h4>
<p class="ds-desc">Named z-index tokens replace 28 numbers. Content inside a block uses 0 to 9 and stays inside it (give the block <code>isolation: isolate</code> so it cannot reach out). The layers: bar 20, floating module 25, menu 26 (exists), page over the call 30, dialog and sheet 40, popover 50 (above the dialog so a date picker works inside a modal), toast 60, debug 100. The scrim sits on its dialog's layer, just before it. Below, the eight in a cross-section (the markup lists them highest first, so only the layer decides), then a dialog with a popover inside it and a toast over both.</p>
<div data-slot="stack"></div>
<div data-slot="scene" style="margin-top:12px"></div>
${tbl(['Layer', 'Token', 'Today\'s values that go here'], [
    ['Content', '<code>--z-content</code> 0, and 1 to 9 inside a block', '0 to 9 and -1 (about 80 uses): stay local.'],
    ['Bar', '<code>--z-bar</code> 20', '15, 19 and 20 (the bars and the toolbar).'],
    ['Floating module', '<code>--z-window</code> 25', '25 (exists).'],
    ['Menu', '<code>--z-menu</code> 26', '26 (exists, 14 uses).'],
    ['Page over the call', '<code>--z-page</code> 30', '30 (7 uses).'],
    ['Dialog or sheet', '<code>--z-dialog</code> 40', '40, 41, and 1000 (the background picker).'],
    ['Popover', '<code>--z-popover</code> 50', '9999 (the date picker, the kind picker) and 10000 (host.css:1154).'],
    ['Toast', '<code>--z-toast</code> 60', '60.'],
    ['Debug', '<code>--z-debug</code> 100', 'none yet.'],
    ['Not ours', '', 'The map library\'s own 1, 2 and 99999 stay inside the map.'],
  ])}

<h4 class="ds-h4" id="foundations-radius">Radius</h4>
<p class="ds-desc">Unchanged: five tokens, 3, 5, 7, 11 and 999. What this adds is the role of each, so the next component does not guess. A box inside a box has the smaller corner.</p>
<div data-slot="radius"></div>
<h5 style="margin:18px 0 4px;font-size:13px">By role</h5>
<div data-slot="roles"></div>
<h5 style="margin:18px 0 4px;font-size:13px">Drift to fix</h5>
${tbl(['Where', 'Today', 'Becomes'], [
    ['Places <code>.pick-pop</code> and Planner <code>.menu</code>', 'Large and medium', 'Both menus are medium.'],
    ['<code>border-radius</code> of <code>999px</code>', '7 uses', '<code>--radius-round</code>.'],
    ['<code>border-radius</code> of <code>50%</code>', '10 uses', '<code>--radius-round</code> on a circle; on a shape that is not square, ask what it is.'],
    ['<code>6px</code> and <code>12px</code>', '4 and 3 uses', '<code>--radius-small</code> or <code>--radius-medium</code>; <code>--radius-large</code>.'],
    ['<code>--radius-min</code> (3px)', '31 uses', 'Stays, only for the inside of a control: a tick box, a key cap, a swatch.'],
  ])}

<h4 class="ds-h4" id="foundations-motion">Motion</h4>
<p class="ds-desc">Two durations and one curve. <b>Fast, 120ms</b> is for what answers a pointer: hover, press, a fill change. <b>Base, 200ms</b> is for what enters or leaves: a sheet, a callout, a popover, a toast. The curve is <code>--ease-out</code>, <code>cubic-bezier(0.2, 0, 0, 1)</code>: quick at the start, soft at the end. A loop (the shimmer, a spinner) keeps its own length. Nothing is slower than 200ms except a loop.</p>
<p class="ds-desc"><b>The rule.</b> One blanket <code>prefers-reduced-motion: reduce</code> rule switches every transition and animation off: durations of 0.01ms (so the end events still fire), one iteration, no delay, no smooth scrolling. A component writes no reduce block of its own. Try it: the switch below puts the same rule on the demos, as if the person had asked their device for less motion.</p>
<div class="pm-bar" style="margin:0 0 8px"><button type="button" class="btn btn-small" id="foundations-reduce" aria-pressed="false">${fa('person-walking')} Simulate reduced motion</button><span class="ds-desc" style="margin:0" id="foundations-reduce-state">Off. The demos move.</span></div>
<div data-slot="motion"></div>
${code(`@keyframes shimmer { to { background-position: -200% 0; } }                 /* one, instead of four */
@keyframes reaction-float { 0% {...} 15% {...} 100% {...} }                    /* one, instead of two */

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;  animation-delay: 0s !important;  animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important; transition-delay: 0s !important; scroll-behavior: auto !important;
  }
}`)}
${tbl(['Today', 'Becomes'], [
    ['23 transition values: 0.05s, 0.12s and 0.15s', '<code>var(--motion-fast)</code> (120ms) and <code>var(--ease-out)</code>.'],
    ['0.2s, 0.25s and 0.3s (a progress width)', '<code>var(--motion-base)</code> (200ms).'],
    ['<code>shimmer</code> defined 4 times (Maps, Places, Research, Travel)', 'One <code>shimmer</code>.'],
    ['<code>reaction-float</code> defined twice (the app and the stream overlay)', 'One <code>reaction-float</code>; the distance is the only difference and stays a variable.'],
    ['15 hand-written reduced-motion blocks, almost none in the app', 'The one rule. Each block is deleted as its component moves.'],
    ['A spinner (<code>fa-spin</code>)', 'Stops under the rule too; a loading state always has the word "Loading" beside it.'],
  ])}

<h4 class="ds-h4" id="foundations-icons">Icons</h4>
<p class="ds-desc">Font Awesome <b>solid</b>, in five sizes. The first three equal the type steps of the same number, so an icon beside text lines up with it; 20 is for action buttons and 24 for empty states and feature icons. The product has 259 icons in use, all listed in the icon browser on the Today page.</p>
<div data-slot="isizes"></div>
<h5 style="margin:18px 0 4px;font-size:13px">Solid only</h5>
<div data-slot="solid"></div>
<h5 style="margin:18px 0 4px;font-size:13px">Colour</h5>
<div data-slot="iroles"></div>
<h5 style="margin:18px 0 4px;font-size:13px">Icon-only controls, and icon with a label</h5>
<div data-slot="ibtn"></div>
${tbl(['Exception', 'Why'], [
    ['Map pins (custom SVG)', 'The only custom icons. A pin carries the category colour and a shape no Font Awesome icon has. Listed here so they are not copied.'],
    ['A service\'s own mark (Font Awesome brands)', 'Only where the mark is the point, such as a map provider\'s logo. Not as a stand-in for a feature.'],
  ])}

<h4 class="ds-h4" id="foundations-layout">Layout</h4>
<p class="ds-desc"><b>Breakpoints: 640, 900 and 1200.</b> A phone is 640 and below, a tablet is up to 900, a wide screen is 1200 and up (a media query cannot read a token, so the numbers are written out: <code>(max-width: 640px)</code>, <code>(max-width: 900px)</code>, <code>(min-width: 1200px)</code>). A <b>module</b> does not follow the window: it keeps its container queries, at 440 and 760 wide, so a window answers to its own width.</p>
<div data-slot="ruler"></div>
<h5 style="margin:18px 0 4px;font-size:13px">The page skeleton</h5>
<p class="ds-desc">The named heights. The bottom bar is 54 plus the safe area (the home-bar space on a phone); every bar takes the safe area from one helper, <code>--safe-top</code>, <code>--safe-right</code>, <code>--safe-bottom</code> and <code>--safe-left</code> (<code>env(safe-area-inset-*)</code>), so no bar writes it again.</p>
<div data-slot="skeleton"></div>
${tbl(['Token', 'Value', 'Used for'], [
    ['<code>--topbar-h</code>', '44px', 'The top bar.'],
    ['<code>--module-head-h</code>', '34px, 42px on a phone', 'A module window\'s header (today <code>--module-header-h</code>).'],
    ['<code>--toolbar-h</code>', '34px', 'A module\'s toolbar (exists).'],
    ['<code>--status-h</code>', '24px', 'A module\'s status line.'],
    ['<code>--bottom-bar-h</code>, <code>--bottom-bar-total</code>', '54px, 54px + the safe area', 'The phone bottom bar.'],
    ['<code>--page-pad</code>', '16px, 12px on a phone', 'Padding around a page.'],
    ['<code>--measure-reading</code>, <code>--page-max</code>', '720px, 1200px', 'The widest line of reading text, and the widest page.'],
  ])}
<h5 style="margin:18px 0 4px;font-size:13px">The old widths that retire</h5>
${tbl(['Width', 'Uses today', 'Goes to'], [
    ['480', '3', '640'],
    ['560', '3 (two in the app, one in the stream overlay)', '640'],
    ['600', '4', '640'],
    ['760', '6 in <code>style.css</code> (and one at 761 up)', '900 or 640, case by case. The 760 of a module\'s container query is not this one; it stays.'],
    ['820', '4 (two of them the pair 641 to 820)', '900 or 640, case by case'],
    ['1000', '1 (641 to 1000)', '900'],
    ['1200', '1', 'stays: the wide screen'],
  ])}

<h4 class="ds-h4" id="foundations-widths">Widths</h4>
<p class="ds-desc">The family at 390, 700 and 1280 wide (fixed). Each frame reads its own width and says which layout it is.</p>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="foundations-map">Today to proposed</h4>
${tbl(['Part', 'Today', 'Proposed'], [
    ['Spacing', '191 distinct paddings; 6px (330 uses) and 10px (259) among them; no tokens', 'Ten tokens on a strict 4px scale; 6 and 10 are not in it.'],
    ['Shadows', '66 distinct values; <code>--shadow-1</code> to <code>-3</code> do not exist in the product', 'Three: <code>--shadow-1</code> (dragging), <code>-2</code> (menus, popovers, toasts), <code>-3</code> (dialogs, sheets, windows).'],
    ['Scrim', 'Four values: 35, 55, 60 and 72%', '<code>--scrim</code>, black at 55%.'],
    ['Layers', '28 different z-index numbers, up to 10000', 'Eight named layers; content stays local.'],
    ['Radius', 'Five tokens, but a menu is large in one place and medium in another', 'The same five, with a role each; both menus medium.'],
    ['Motion', '23 transition values; <code>shimmer</code> four times, <code>reaction-float</code> twice; 15 reduced-motion blocks', 'Two durations, one easing, two keyframes, one reduced-motion rule.'],
    ['Icons', 'Sizes by the pixel, 4 regular and 2 brand icons', 'Five size tokens; solid only; brands only for a service\'s mark.'],
    ['Breakpoints', '10 widths: 480, 560, 600, 640, 760, 820, 1000, 1200 and the module\'s own', '640, 900 and 1200; modules keep their container queries.'],
    ['Bars', 'Heights written in each place', 'Named: 44, 34 or 42, 34, 24, and 54 + the safe area.'],
  ])}

<h4 class="ds-h4" id="foundations-alias">Aliases and migration</h4>
<p class="ds-desc">Nothing is renamed, so nothing a person saved breaks; the old values stay until a component moves. Each family moves its spacing when it is built into the product, and a value that has no step is decided then. <code>--z-menu</code> and <code>--icon-hover</code> keep their names and values. <code>--module-header-h</code> and <code>--module-header-phone-h</code> become <code>--module-head-h</code> with a kept alias.</p>
${tbl(['Where it is today', 'Write instead'], [
    ['<code>padding: 12px</code>, <code>gap: 8px</code>', '<code>padding: var(--space-3)</code>, <code>gap: var(--space-2)</code>'],
    ['<code>box-shadow: 0 16px 48px ...</code>', '<code>box-shadow: var(--shadow-3)</code>'],
    ['<code>background: rgba(0, 0, 0, 0.72)</code> (a backdrop)', '<code>background: var(--scrim)</code>'],
    ['<code>z-index: 9999</code> (a date picker)', '<code>z-index: var(--z-popover)</code>'],
    ['<code>transition: background 0.15s</code>', '<code>transition: background var(--motion-fast) var(--ease-out)</code>'],
    ['<code>@media (max-width: 760px)</code>', '<code>@media (max-width: 900px)</code> or <code>(max-width: 640px)</code>'],
    ['A <code>@media (prefers-reduced-motion: reduce)</code> block in a component', 'Delete it; the one rule covers it.'],
  ])}

<h4 class="ds-h4" id="foundations-tokens">Tokens</h4>
${tbl(['Token', 'Value', 'Used for'], [
    ['<code>--space-0</code> to <code>--space-9</code>', '2, 4, 8, 12, 16, 20, 24, 32, 40, 48px', 'Every padding, gap and margin.'],
    ['<code>--shadow-1</code>', '<code>0 2px 8px</code>, black 28% (dark), text 12% (light)', 'A dragged card or row.'],
    ['<code>--shadow-2</code>', '<code>0 4px 12px</code>, black 40% (dark), text 14% (light)', 'Menus, popovers, toasts. Already in Menus.'],
    ['<code>--shadow-3</code>', '<code>0 8px 30px</code>, black 50% (dark), text 18% (light)', 'Dialogs, sheets, windows.'],
    ['<code>--scrim</code>', 'black at 55%', 'Behind a dialog or a sheet.'],
    ['<code>--z-content</code>, <code>-bar</code>, <code>-window</code>, <code>-menu</code>, <code>-page</code>, <code>-dialog</code>, <code>-popover</code>, <code>-toast</code>, <code>-debug</code>', '0, 20, 25, 26, 30, 40, 50, 60, 100', 'The named layers.'],
    ['<code>--radius-min</code> to <code>--radius-round</code>', '3, 5, 7, 11, 999px', 'Unchanged.'],
    ['<code>--motion-fast</code>, <code>--motion-base</code>, <code>--ease-out</code>', '120ms, 200ms, <code>cubic-bezier(0.2, 0, 0, 1)</code>', 'Every transition.'],
    ['<code>--icon-12</code>, <code>-14</code>, <code>-16</code>, <code>-20</code>, <code>-24</code>', '12, 14, 16, 20, 24px (the first three are the type steps)', 'Icon sizes.'],
    ['<code>--topbar-h</code>, <code>--module-head-h</code>, <code>--toolbar-h</code>, <code>--status-h</code>, <code>--bottom-bar-h</code>', '44, 34 (42 on a phone), 34, 24, 54px', 'Bar heights.'],
    ['<code>--safe-top</code>, <code>-right</code>, <code>-bottom</code>, <code>-left</code>', '<code>env(safe-area-inset-*, 0px)</code>', 'The one helper every bar uses.'],
    ['<code>--page-pad</code>, <code>--measure-reading</code>, <code>--page-max</code>', '16 (12 on a phone), 720, 1200px', 'Page padding and widths.'],
  ])}

<h4 class="ds-h4" id="foundations-choices">Chosen for Thomas to confirm</h4>
<p class="ds-desc">These were not in the brief, or the brief left them open. Each is one line to change.</p>
${tbl(['Chosen', 'Why', 'Other way'], [
    ['Names count steps: <code>--space-3</code> is 12px, <code>--space-0</code> is 2px', 'Short, and the same shape as <code>--radius-*</code>. They differ from the older plan table, where <code>--space-3</code> was 6.', 'Name them by pixels: <code>--space-12</code>.'],
    ['A row\'s horizontal 10 is written <code>--space-2</code> + <code>--space-0</code>', 'Keeps the Cards decision (8 by 10) while 10 stays off the scale.', 'Row padding 8 by 8, or 8 by 12.'],
    ['The panel is 16 here; Menus\' 14px popover padding is not touched', '14 settles per component.', 'Panel 12.'],
    ['<code>--shadow-3</code> is <code>0 8px 30px</code>, black 50% dark and the text colour at 18% light; <code>--shadow-1</code> in light is the text colour at 12%', 'Same size as the most common dialog shadow today (7 uses), smaller than the 16/48 one.', 'A smaller shadow, or the light values at 14% like the menu.'],
    ['<code>--scrim</code> is 55% in light mode too', 'Your "one scrim". Menus drew 35% in light; it now follows this.', 'Keep 35% for light.'],
    ['A menu (26) is below a dialog (40); a menu opened from inside a dialog uses the popover layer', 'So the list never hides behind the dialog it was opened from. It is the SDK\'s job to pick the layer.', 'Raise the menu above the dialog.'],
    ['The background picker (1000) goes to the dialog layer; 10000 (host.css:1154) goes to the popover layer', 'The first covers the page; the second is a floating list.', 'Decide each when it moves.'],
    ['<code>--ease-out</code> is <code>cubic-bezier(0.2, 0, 0, 1)</code>', 'A soft landing, close to the browser\'s ease-out but a little quicker to start.', 'The browser\'s own <code>ease-out</code>.'],
    ['The reduced-motion rule uses 0.01ms, not <code>none</code>', 'The end events still fire, so nothing waits for an animation that never ends.', '<code>animation: none; transition: none</code>.'],
    ['<code>--icon-12</code>, <code>-14</code> and <code>-16</code> are the type steps themselves', 'An icon beside text then changes with the text step.', 'Plain pixels.'],
    ['<code>--radius-min</code> is for the inside of a control only', 'The brief named four roles; this was the fifth token.', 'Retire it into small.'],
    ['Three breakpoints make four ranges: phone, tablet (to 900), desktop (901 to 1199), wide (1200 up)', 'The brief names three widths.', 'Fold desktop into wide.'],
    ['The Spotlight view takes a solid icon picked at migration (drawn here as fa-expand)', 'A brand mark is not a feature icon.', 'Name the icon now.'],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + FD_CSS }, o || {}));
    slot('space').appendChild(F(spaceBody(), 'Foundations, spacing scale'));
    slot('beforeafter').appendChild(F(beforeAfterBody(), 'Foundations, before and after'));
    slot('lifts').appendChild(F(liftsBody(), 'Foundations, shadows'));
    slot('today').appendChild(F(todayShadowsBody(), 'Foundations, today\'s shadows'));
    slot('scrim').appendChild(F(scrimBody(), 'Foundations, scrim'));
    slot('stack').appendChild(F(stackBody(), 'Foundations, layers'));
    slot('scene').appendChild(F(sceneBody(), 'Foundations, layers in use'));
    slot('radius').appendChild(F(radiusBody(), 'Foundations, radius tokens'));
    slot('roles').appendChild(F(rolesBody(), 'Foundations, radius by role'));
    slot('motion').appendChild(F(motionBody(), MOTION_TITLES[0], { onload: motionLoad }));
    slot('isizes').appendChild(F(iconSizesBody(), 'Foundations, icon sizes'));
    slot('solid').appendChild(F(solidBody(), 'Foundations, icons solid only'));
    slot('iroles').appendChild(F(rolesIconBody(), 'Foundations, icon colour'));
    slot('ibtn').appendChild(F(iconBtnBody(), 'Foundations, icon buttons'));
    slot('ruler').appendChild(F(rulerBody(), 'Foundations, breakpoints', { onload: rulerLoad }));
    slot('skeleton').appendChild(F(skeletonBody(), 'Foundations, page skeleton'));
    const ws = mk('div', '');
    for (const w of [390, 700, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(summaryBody(), `Foundations at ${w}`, { pinWidth: w, onload: summaryLoad }));
    }
    slot('widths').appendChild(ws);
    // The "Simulate reduced motion" switch: the same rule, put on the motion demos.
    const sw = block.querySelector('#foundations-reduce'); const st = block.querySelector('#foundations-reduce-state');
    sw.addEventListener('click', () => {
      const on = sw.getAttribute('aria-pressed') !== 'true';
      sw.setAttribute('aria-pressed', String(on));
      st.textContent = on ? 'On. The demos end at once and nothing repeats.' : 'Off. The demos move.';
      for (const f of window.__ds.frames) {
        if (!MOTION_TITLES.includes(f.iframe.title)) continue;
        const doc = f.iframe.contentDocument; const root = doc && doc.querySelector('.ds-proposed');
        if (root) { if (on) root.setAttribute('data-reduce', 'on'); else root.removeAttribute('data-reduce'); }
      }
    });
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'foundations', covers: ['spacing', 'space', 'elevation', 'shadow', 'scrim', 'layers', 'z-index', 'radius', 'motion', 'icons', 'layout', 'breakpoints'], group: 'Foundations', navGroup: 'Foundations',
    name: 'Foundations: spacing, elevation, motion, icons and layout', status: 'proposed',
    words: 'foundations spacing space scale gap padding margin elevation shadow scrim layers layer z-index stack radius corner motion duration easing shimmer reaction reduced motion icons icon size solid regular layout breakpoint phone tablet wide safe area height top bar bottom bar module header toolbar status line page padding reading width',
    render,
  });
})();
