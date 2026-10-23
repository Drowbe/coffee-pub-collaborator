/* The Progress bars and meters family (PROPOSED): one track, its small variant, the budget, AI and poll meters, the indeterminate bar and the call's microphone
   level. Loaded by proposed.html through proposed-families.json, after proposed.js (the page engine); it registers one family through
   window.DS_PROPOSED.families.push and draws it with the rules in proposed-progress.css. Nothing here is a style of the product: markup, words and tables only.
   How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules (.pm-row, .pm-role ...), from the page engine
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // The shimmer keyframe is the Foundations family's one shared `shimmer` (to: background-position -200% 0); the frames are separate documents, so the examples carry a copy here.
  // (A keyframe step is not a selector, so it cannot sit in a proposed stylesheet that the runner checks rule by rule.)
  const PG_CSS = `
@keyframes shimmer { to { background-position: -200% 0; } }
.pm-pgrid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px 24px; max-width: 760px; }
.pm-box { box-sizing: border-box; max-width: 560px; padding: 16px; border: 1px solid var(--border); border-radius: var(--radius-medium); background: var(--bg-section); display: grid; gap: 16px; }
.pm-box h5 { margin: 0; font-size: 14px; font-weight: 600; }
.pm-strip { display: flex; align-items: center; gap: 12px; min-height: 40px; padding: 0 12px; border-radius: var(--radius-medium); background: var(--bg-card); font-size: 13px; }
.pm-strip .sdk-meter-inline { flex: 1 1 auto; }
.pm-tile { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 12px; border-radius: var(--radius-medium); background: var(--bg-card); font-size: 14px; }
.pm-tile small { display: block; color: var(--text-dim); font-size: 12px; }
.pm-up { display: flex; align-items: flex-start; gap: 12px; }
.pm-up > .btn { margin-top: -6px; }
.pm-row .pm-role { margin-top: 16px; min-height: 18px; }
@media (max-width: 640px) { .pm-row .pm-role { margin-top: 0 !important; min-height: 0 !important; } }
.pm-up > .sdk-meter { flex: 1 1 auto; }
.pm-ct { width: 100%; border-collapse: collapse; font-size: 13px; }
.pm-ct th, .pm-ct td { padding: 8px 12px 8px 0; border-bottom: 1px solid var(--border); text-align: left; vertical-align: middle; }
.pm-ct th { color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.pm-ct td.pm-n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.pm-pass { color: var(--ok); font-weight: 600; }
.pm-fail { color: var(--f-error, var(--danger)); font-weight: 600; }`;

  // ---- builders ----
  const bar = (o) => `<div class="sdk-progress${o.cls ? ' ' + o.cls : ''}" role="progressbar" aria-label="${o.name}"${o.ind ? ' aria-busy="true"' : ` aria-valuenow="${o.now}" aria-valuemin="0" aria-valuemax="${o.max || 100}"`}${o.vt ? ` aria-valuetext="${o.vt}"` : ''}>${o.planned != null ? `<span class="sdk-progress-planned" style="--pct: ${o.planned}%"></span>` : ''}<span class="sdk-progress-fill" style="--pct: ${o.ind ? 100 : Math.min(100, (o.now / (o.max || 100)) * 100)}%"></span></div>`;
  const meter = (label, value, b, sub) => `<div class="sdk-meter"><div class="sdk-meter-head"><span class="sdk-meter-label">${label}</span><span class="sdk-meter-value">${value}</span></div>${b}${sub ? `<div class="sdk-meter-sub">${sub}</div>` : ''}</div>`;
  const mic = (n, word) => `<span class="sdk-mic" role="progressbar" aria-label="Microphone level" aria-valuenow="${n}" aria-valuemin="0" aria-valuemax="5" aria-valuetext="${word}" style="--pct: ${n * 20}%"><i class="fa-solid fa-microphone" aria-hidden="true"></i></span>`;
  const optRow = (name, pct, who) => `<div class="sdk-fillrow"><span class="sdk-progress-behind" role="progressbar" aria-label="${name}: ${pct} percent of votes" aria-valuenow="${pct}" aria-valuemin="0" aria-valuemax="100" style="--pct: ${pct}%"></span><span>${name}</span><span class="sdk-meter-value">${pct}%${who ? ` (${who})` : ''}</span></div>`;

  const tracksBody = () => `<div class="ds-proposed"><div class="pm-row"><div class="pm-role">Track, 8px</div><div class="pm-pgrid">
      ${meter('Empty', '0%', bar({ name: 'Empty', now: 0 }))}${meter('Half way', '40%', bar({ name: 'Half way', now: 40 }))}${meter('Done', '100%', bar({ name: 'Done', now: 100 }))}</div></div>
    <div class="pm-row"><div class="pm-role">Small track, 6px</div><div class="pm-pgrid">
      ${meter('Empty', '0%', bar({ name: 'Empty, small', now: 0, cls: 'sdk-progress-sm' }))}${meter('Half way', '40%', bar({ name: 'Half way, small', now: 40, cls: 'sdk-progress-sm' }))}${meter('Done', '100%', bar({ name: 'Done, small', now: 100, cls: 'sdk-progress-sm' }))}</div></div>
    <div class="pm-row"><div class="pm-role">Not known: a shimmer</div><div class="pm-pgrid">
      ${meter('Reading the file', 'Working', bar({ name: 'Reading the file', ind: true, cls: 'indeterminate' }))}${meter('Reading the file, small', 'Working', bar({ name: 'Reading the file, small', ind: true, cls: 'indeterminate sdk-progress-sm' }))}</div></div></div>`;

  const metersBody = () => `<div class="ds-proposed"><div class="pm-row"><div class="pm-role">Budget: spent, and planned</div><div class="pm-pgrid">
      ${meter('Food', '320 of 400', bar({ name: 'Food budget', now: 320, max: 400, planned: 90, vt: '320 of 400 spent, 360 planned' }), 'Planned 360')}
      ${meter('Stay', '388 of 400', bar({ name: 'Stay budget', now: 388, max: 400, planned: 100, vt: '388 of 400 spent' }), 'Planned 400')}
      ${meter('Things to do', '<b>Over</b> by 120 (520 of 400)', bar({ name: 'Things to do budget', now: 400, max: 400, cls: 'over', vt: 'Over budget by 120' }), 'Planned 520')}</div></div>
    <div class="pm-row"><div class="pm-role">AI use</div><div class="pm-pgrid">
      ${meter('AI this month', '60% used', bar({ name: 'AI use this month', now: 60, vt: '60 percent used' }))}
      ${meter('AI this month', '<b>Almost full</b> 94% used', bar({ name: 'AI use this month', now: 94, cls: 'warn', vt: 'Almost full, 94 percent used' }))}</div></div>
    <div class="pm-row"><div class="pm-role">Poll options: the fill is behind the row</div><div class="pm-pgrid" style="grid-template-columns:minmax(0,1fr);max-width:420px">
      ${optRow('Trattoria', 62, '5 votes')}${optRow('Sushi bar', 25, '2 votes')}${optRow('Picnic', 13, '1 vote')}</div></div>
    <div class="pm-row"><div class="pm-role">Microphone level (a call)</div><div class="pm-pgrid">
      <div class="pm-tile"><span>Ana<small>Quiet</small></span>${mic(1, 'Quiet')}</div>
      <div class="pm-tile"><span>Ben<small>Speaking</small></span>${mic(3, 'Medium')}</div>
      <div class="pm-tile"><span>Cleo<small>Loud</small></span>${mic(5, 'Loud')}</div>
      <div class="pm-tile"><span>Dev<small>Silent</small></span>${mic(0, 'Silent')}</div></div></div></div>`;

  const useBody = () => `<div class="ds-proposed"><div class="pm-box">
      <h5>Add a photo</h5>
      <div class="pm-up"><div class="sdk-meter" style="flex:1 1 auto"><div class="sdk-meter-head"><span class="sdk-meter-label">louvre-night.jpg</span><span class="sdk-meter-value">62%</span></div>${bar({ name: 'Uploading louvre-night.jpg', now: 62, cls: 'sdk-progress-sm' })}</div><button type="button" class="sdk-link-btn">Cancel</button></div></div>
    <div class="pm-box" style="margin-top:12px"><h5>Toolbar</h5>
      <div class="pm-strip">${fa('file-import')}<span>Importing places</span><div class="sdk-meter-inline"><div class="sdk-progress sdk-progress-sm" role="progressbar" aria-label="Importing places" aria-valuenow="40" aria-valuemin="0" aria-valuemax="100"><span class="sdk-progress-fill" style="--pct: 40%"></span></div><span class="sdk-meter-value">40%</span></div></div></div>
    <div class="pm-box" style="margin-top:12px"><h5>Budget</h5>
      ${meter('Food', '320 of 400', bar({ name: 'Food budget', now: 320, max: 400, planned: 90 }), 'Planned 360')}
      ${meter('Things to do', '<b>Over</b> by 120 (520 of 400)', bar({ name: 'Things to do budget', now: 400, max: 400, cls: 'over' }), 'Planned 520')}</div>
    <div class="pm-box" style="margin-top:12px"><h5>Where do we eat on Friday?</h5>${optRow('Trattoria', 62)}${optRow('Sushi bar', 25)}${optRow('Picnic', 13)}</div>
    <div class="pm-box" style="margin-top:12px"><h5>Assistant</h5>${meter('AI this month', '<b>Almost full</b> 94% used', bar({ name: 'AI use this month', now: 94, cls: 'warn' }))}</div>
    <div class="pm-box" style="margin-top:12px"><h5>In the call</h5><div class="pm-tile"><span>Ben<small>Speaking</small></span>${mic(3, 'Medium')}</div></div></div>`;

  const CT_ROWS = [
    ['Value text (--text-dim) on a panel', '--text-dim', '--bg-section', 4.5],
    ['The word "Over" and "Almost full" (--f-error) on a panel', '--f-error', '--bg-section', 4.5],
    ['Fill (--accent) on the track (--border)', '--accent', '--border', 3],
    ['Fill (--accent) on the page', '--accent', '--bg', 3],
    ['Danger fill (--danger) on the track', '--danger', '--border', 3],
    ['Danger fill (--danger) on the page', '--danger', '--bg', 3],
    ['Microphone bars (--ok-mark) on the page', '--ok-mark', '--bg', 3],
    ['Microphone bars (--ok-mark) on a panel', '--ok-mark', '--bg-section', 3],
    ['Microphone bars (--ok-mark) on a card', '--ok-mark', '--bg-card', 3],
    ['Unlit microphone bar and track (--border) on the page', '--border', '--bg', 1.2],
  ];
  const contrastBody = () => `<div class="ds-proposed"><table class="pm-ct"><thead><tr><th>Pair</th><th>Colours</th><th>Ratio</th><th>Looked for</th><th></th></tr></thead><tbody>${CT_ROWS.map((r) => `<tr data-fg="${r[1]}" data-bg="${r[2]}" data-min="${r[3]}"><td>${r[0]}</td><td><code>${r[1]}</code> on <code>${r[2]}</code></td><td class="pm-n" data-out="r"></td><td class="pm-n">${r[3]}:1</td><td data-out="p"></td></tr>`).join('')}</tbody></table></div>`;
  const measureContrast = (doc) => {
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true });
    const host = doc.querySelector('.ds-proposed');
    const px = (c) => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = c; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const tok = (n) => { const p = doc.createElement('span'); p.style.color = `var(${n})`; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return px(c); };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-ct tbody tr')) {
        const a = lum(tok(tr.dataset.fg)); const b = lum(tok(tr.dataset.bg)); const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const ok = r >= Number(tr.dataset.min); const p = tr.querySelector('[data-out="p"]'); p.textContent = ok ? 'Passes' : 'Below'; p.className = ok ? 'pm-pass' : 'pm-fail';
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  // ---- ok as a mark (decided 2026-10-21): the numbers, worked out here from the three shipped themes' colours (server/store.js) ----
  const OKM = { ok: '#6fae6b', pct: 70, themes: [
    ['Strong Coffee', { light: ['#faf6f1', '#f1e9df', '#2b2119'], dark: ['#1a1410', '#241c16', '#f1e6d8'] }],
    ['Calming Teal', { light: ['#ffffff', '#f7f9fa', '#333333'], dark: ['#111a1b', '#182325', '#e4eeee'] }],
    ['Burnt Orange', { light: ['#ffffff', '#f7f7f7', '#333333'], dark: ['#1a1512', '#241d19', '#eee8e3'] }],
  ] };
  const okTable = () => {
    const rgb = (x) => [1, 3, 5].map((i) => parseInt(x.slice(i, i + 2), 16));
    const mixc = (a, p, b) => a.map((v, i) => Math.round(v * p / 100 + b[i] * (100 - p) / 100));
    const lum = (c) => { const f = c.map((v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); }); return 0.2126 * f[0] + 0.7152 * f[1] + 0.0722 * f[2]; };
    const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const hex = (c) => '#' + c.map((v) => v.toString(16).padStart(2, '0')).join('');
    const rows = []; let worst = 99;
    for (const [name, modes] of OKM.themes) for (const mode of ['light', 'dark']) {
      const [pg, pn, tx] = modes[mode].map(rgb); const card = mixc(pn, 92, tx); const ok = rgb(OKM.ok);
      const mark = mode === 'light' ? mixc(ok, OKM.pct, tx) : ok;
      const f = (c) => [pg, pn, card].map((s) => ratio(c, s));
      const plain = f(ok); const m = f(mark); worst = Math.min(worst, ...m);
      rows.push([`${name}, ${mode}`, `<code>${hex(mark)}</code>${mode === 'light' ? '' : ' (the plain ok)'}`, plain.map((r) => r.toFixed(2)).join(' / '), m.map((r) => r.toFixed(2) + (r >= 3 ? '' : ' (below 3)')).join(' / ')]);
    }
    return { rows, worst };
  };

  function renderProgress(api) {
    const { mk, h } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    const OK = okTable();
    block.innerHTML = `<header><h3 id="progress-h"><a href="#progress">Progress bars and meters</a></h3><span class="ds-status-chip ds-st-approved">Approved</span><span class="ds-count">one track, a small track, budget, AI and poll meters, a shimmer, the microphone level</span></header>
<p class="ds-desc"><b>Decided 2026-10-21: approved as drawn.</b> <b>One track</b>: 8px, fully round, <code>--border</code>, with an accent fill and a label with the value in text (never colour alone); a <b>6px small track</b> for toolbars and uploads. Every bar is <code>role="progressbar"</code> with <code>aria-valuenow</code>, <code>-min</code>, <code>-max</code> and a name. Budget, the AI meter and poll options are the same bar with their own fills. The call's microphone level is its own pattern. Stylesheet: <code>proposed-progress.css</code>, every rule under <code>.ds-proposed</code>.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#progress-anatomy">Anatomy</a><a href="#progress-tracks">Tracks</a><a href="#progress-meters">Meters</a><a href="#progress-use">In use</a><a href="#progress-widths">Widths</a><a href="#progress-rules">Usage rules</a><a href="#progress-map">Today to proposed</a><a href="#progress-okmark">Ok as a mark</a><a href="#progress-contrast">Contrast</a><a href="#progress-tokens">Tokens</a><a href="#progress-markup">Markup contract</a><a href="#progress-decided">Decided 2026-10-21</a></nav>

<h4 class="ds-h4" id="progress-anatomy">Anatomy</h4>
${dim([
    ['1 Track', '8px high (<code>--pg-h</code>), the full width of its place, <code>--radius-round</code>, fill <code>--border</code>. Fully round is allowed for tracks and bars (as it is for dots and avatars): a bar is a lozenge, not a box with a corner. Clipped, so the fill never shows square ends.'],
    ['2 Fill', '<code>--accent</code>, the same height as the track, as wide as <code>--pct</code> (data, set by the consumer). It grows with the base motion (200ms; none under reduced motion).'],
    ['3 Label and value', 'Above the bar: the name (13px, <code>--text</code>) and the value in words (<code>--text-dim</code>, "62%", "320 of 400"). The value is always text; colour is never the only signal. In a toolbar or an upload row the value sits to the right of the bar.'],
    ['4 Small track', '6px (<code>.sdk-progress-sm</code>), for toolbars and uploads. Same colours. A <code>.sdk-progress</code> inside a module toolbar or status line is small by itself (the Module window family keeps its progress at 6px).'],
    ['5 Name and values', '<code>role="progressbar"</code>, <code>aria-label</code> (or <code>aria-labelledby</code>), <code>aria-valuenow</code>, <code>aria-valuemin</code>, <code>aria-valuemax</code>; <code>aria-valuetext</code> when the number alone is not enough (a budget). Today only the AI meter has any of this.'],
    ['6 Budget', 'Spent is the accent fill; what is planned is the accent at 35% under it, so the gap is what is planned but not yet spent. Over budget: the fill is the <b>danger status fill</b> (a solid fill, not a danger border) across the whole track, and the words say <b>Over</b> ("Over by 120"). Today the bar has a danger tone only by colour.'],
    ['7 AI meter', 'The same bar. From 90% the fill is the danger fill and the words say <b>Almost full</b>. This folds in the AI meter, which is a bar of its own today.'],
    ['8 Poll option', 'The fill stays behind the row: the accent at 24%, the row\'s text on top, and the percent in text. It is a bar for a screen reader too (the fill carries the role and the label "Trattoria: 62 percent of votes"). The row itself is a choice row (Choice rows family).'],
    ['9 Not known', 'A shimmer along the whole track in the accent, 1.4s, linear. No <code>aria-valuenow</code>, <code>aria-busy="true"</code>. Under reduced motion it holds still at half.'],
    ['10 Microphone level', 'Its own pattern, because it is a live level and not a progress: five vertical bars (3px wide, 4 to 16px high, 2px apart), lit ones in the <b>ok status fill</b> (<code>--ok</code>), unlit in <code>--border</code>. The raw <code>rgba(111,174,107,.55)</code> goes. It is a progressbar with the name "Microphone level" and a word in <code>aria-valuetext</code>.'],
    ['11 Status strip', 'The Status strip\'s fill (32% accent) stays in the Status strip family; it is not drawn here.'],
  ])}

<h4 class="ds-h4" id="progress-tracks">Tracks</h4>
<p class="ds-desc">The 8px track and the 6px small track at 0, 40 and 100%, and the shimmer for when nothing is known.</p>
<div data-slot="tracks"></div>

<h4 class="ds-h4" id="progress-meters">Meters</h4>
<p class="ds-desc">Budget (under, near, over), the AI meter (normal, almost full), poll options (the fill behind the row), and the call's microphone level.</p>
<div data-slot="meters"></div>

<h4 class="ds-h4" id="progress-use">In use</h4>
<p class="ds-desc">An upload with its Cancel link button, a toolbar import, a budget, a poll, the AI meter and a call tile.</p>
<div data-slot="use"></div>

<h4 class="ds-h4" id="progress-widths">Widths</h4>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="progress-rules">Usage rules</h4>
<ul class="ds-desc">
  <li>Use a bar when the share of something is known; the shimmer only when it is not. Never a spinner and a bar together.</li>
  <li>The value is written next to the bar. A bar without words is not allowed, nor is a status told only by the fill's colour ("Over" and "Almost full" are words).</li>
  <li>The accent is the fill; danger is the fill only for over budget and an almost full AI allowance. No other fill colours; a category is not coloured on a bar.</li>
  <li>Every bar has a name. <code>aria-valuenow</code> is the raw number, <code>aria-valuemax</code> its limit; a percent bar has a max of 100.</li>
  <li>The small track is for a place with a line of text (a toolbar, an upload). The 8px track is the default.</li>
  <li>The microphone level is not a progress bar to look at; it stays beside the person's name and is lit in the ok fill only.</li>
</ul>

<h4 class="ds-h4" id="progress-map">Today to proposed</h4>
${tbl(['Today', 'Where', 'Proposed'], [
    ['<code>.tb-progress</code> (6px, <code>--bg-card</code>, <code>.tb-progress-fill</code> accent)', 'the module toolbar', 'The small track (aliased). The value as text beside it; role and name added.'],
    ['<code>.upload .bar</code> (6px, <code>--bg-card</code>)', 'Research', 'The small track. The track is <code>--border</code>, not <code>--bg-card</code>.'],
    ['<code>.ai-meter</code> (8px, <code>--bg-card</code> with a 1px <code>--border</code>), <code>.warn</code> danger', 'the AI settings', 'The track (the 1px border goes); <code>.warn</code> keeps its name; adds the words "Almost full". The only bar with aria today; it keeps it.'],
    ['<code>.bar</code> (10px, <code>--text</code> at 12% on transparent; spent and planned fills; a danger fill by colour)', 'Budget', 'The 8px track; planned at 35%; over is the danger fill with "Over" in words. Role and name added.'],
    ['<code>.opt .fill</code> (accent at 24%, behind the row)', 'Polls', 'The poll option fill (aliased as <code>.sdk-progress-behind</code>); the percent stays text; the fill gets the role and a name.'],
    ['<code>.meter</code> in the call buttons (vertical bars, raw <code>rgba(111,174,107,.55)</code>)', 'the call', 'The microphone level (<code>.sdk-mic</code>): the original fill rising from the bottom of the round button, behind the glyph, in <code>--ok-mark</code>.'],
    ['Three track heights (6, 8, 10px) and three track colours (<code>--bg-card</code> with a border, <code>--bg-card</code> without, <code>--text</code> at 12%)', 'above', 'Two heights (8, 6), one colour (<code>--border</code>).'],
    ['The status strip fill (32% accent)', 'the Status strip', 'Unchanged; stays in the Status strip family.'],
  ])}

<h4 class="ds-h4" id="progress-okmark">Ok as a mark (decided 2026-10-21)</h4>
<p class="ds-desc">The ok status colour as a mark (a bar, a presence dot, an icon: not text) is <b>2.2 to 2.6 to 1</b> on the light page, panel and card, under the 3 to 1 a mark aims at. So there is one more token, <code>--ok-mark</code>: <b>the ok colour 70% mixed toward the text colour</b> (<code>color-mix(in srgb, var(--ok) 70%, var(--text))</code>) in the light mode, the least that reaches 3 to 1 on the page, the panel and the card in all three shipped themes (71% is the exact limit, on Strong Coffee's card). In the dark mode the plain ok already passes, so <code>--ok-mark</code> is the plain ok there and the dark mode is unchanged. It is used by the microphone bars here, the Avatars presence dot, the Tables member dot and the Chips dot of an ok tone. A fill with words on it (a toast, a status label) is not a mark and keeps the plain ok. Ratios against the page / the panel / the card, worked out by this page from the three themes' colours:</p>
${tbl(['Theme and mode', 'The mark', 'Plain ok: page / panel / card', 'The mark: page / panel / card'], OK.rows)}
<p class="ds-desc" data-okworst="${OK.worst.toFixed(2)}">The lowest of the eighteen ratios of the mark is <b>${OK.worst.toFixed(2)} to 1</b>.</p>

<h4 class="ds-h4" id="progress-contrast">Contrast</h4>
<p class="ds-desc">Worked out by this page, in the mode on show. The value text needs 4.5 to 1. The fill and the microphone bars are not the only signal (the value is in words), so they are measured against 3 to 1 as the look the system aims at; the last row is the track itself, which only needs to be seen against the page.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="progress-tokens">Tokens</h4>
${tbl(['Token', 'Use here', ''], [
    ['<code>--pg-h</code>', 'The track: 8px; 6px on the small one.', 'new'],
    ['<code>--pg-track</code>, <code>--pg-fill</code>', '<code>--border</code> and <code>--accent</code>.', 'new (aliases)'],
    ['<code>--pg-planned</code>, <code>--pg-behind</code>', 'The accent at 35% (planned) and 24% (a poll option).', 'new'],
    ['<code>--pg-over</code>, <code>--pg-ok</code>', 'The danger status fill (<code>--danger</code>) and the ok mark (<code>--ok-mark</code>).', 'new (aliases)'],
    ['<code>--pg-shine</code>', 'The light stripe of the shimmer.', 'new'],
    ['<code>--pct</code> (data)', 'The width of a fill, passed by the consumer.', 'data'],
    ['<code>--radius-round</code>', 'Tracks, fills and microphone bars. Allowed for these.', 'exists'],
    ['<code>--f-error</code>', 'The words "Over" and "Almost full" (Fields).', 'exists'],
  ])}

<h4 class="ds-h4" id="progress-markup">Markup contract</h4>
${code(`<!-- a bar with its label and value -->
<div class="sdk-meter">
  <div class="sdk-meter-head"><span class="sdk-meter-label">louvre-night.jpg</span><span class="sdk-meter-value">62%</span></div>
  <div class="sdk-progress sdk-progress-sm" role="progressbar" aria-label="Uploading louvre-night.jpg" aria-valuenow="62" aria-valuemin="0" aria-valuemax="100">
    <span class="sdk-progress-fill" style="--pct: 62%"></span></div>
</div>

<!-- budget, spent and planned; add class "over" when spent is over the limit, and say so -->
<div class="sdk-progress" role="progressbar" aria-label="Food budget" aria-valuenow="320" aria-valuemin="0" aria-valuemax="400" aria-valuetext="320 of 400 spent, 360 planned">
  <span class="sdk-progress-planned" style="--pct: 90%"></span><span class="sdk-progress-fill" style="--pct: 80%"></span></div>

<!-- not known -->
<div class="sdk-progress indeterminate" role="progressbar" aria-label="Reading the file" aria-busy="true"><span class="sdk-progress-fill"></span></div>

<!-- a poll option: the fill behind the row -->
<div class="sdk-fillrow"><span class="sdk-progress-behind" role="progressbar" aria-label="Trattoria: 62 percent of votes" aria-valuenow="62" aria-valuemin="0" aria-valuemax="100" style="--pct: 62%"></span>
  <span>Trattoria</span><span class="sdk-meter-value">62%</span></div>

<!-- the microphone level -->
<span class="sdk-mic" role="progressbar" aria-label="Microphone level" aria-valuenow="3" aria-valuemin="0" aria-valuemax="5" aria-valuetext="Medium" style="--pct: 60%"><i class="fa-solid fa-microphone" aria-hidden="true"></i></span>`)}
<p class="ds-desc"><b>Names kept.</b> <code>.tb-progress</code>, <code>.tb-progress-fill</code>, <code>.ai-meter</code> (and <code>.warn</code>), <code>.upload .bar</code> take the look with no markup change; Budget's <code>.bar</code> keeps its name in the module (it is not aliased globally, because other modules use <code>.bar</code> for a toolbar). The shimmer is the Foundations family's one shared <code>shimmer</code> keyframe (and its 1.4s); each example frame carries a copy because frames are separate documents.</p>

<h4 class="ds-h4" id="progress-decided">Decided 2026-10-21</h4>
<p class="ds-desc">Thomas approved every choice below, as drawn, on 2026-10-21.</p>
${tbl(["Decided as drawn","What"], [
    ["<code>role=\"progressbar\"</code>","Every bar has it, including the microphone level."],
    ["Ok as a mark","The microphone bars use <code>--ok-mark</code>, the ok colour mixed toward the text colour so a mark reaches 3 to 1 (see \"Ok as a mark\")."],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + PG_CSS }, o || {}));
    slot('tracks').appendChild(F(tracksBody(), 'Progress, tracks'));
    slot('meters').appendChild(F(metersBody(), 'Progress, meters'));
    slot('use').appendChild(F(useBody(), 'Progress, in use'));
    slot('contrast').appendChild(F(contrastBody(), 'Progress, contrast', { onload: measureContrast }));
    const ws = mk('div', '');
    for (const w of [390, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(useBody(), `Progress at ${w}`, { pinWidth: w }));
    }
    slot('widths').appendChild(ws);
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'progress', covers: ['progress', 'meter', 'bar', 'budget-bar', 'ai-meter', 'mic-meter'], group: 'Controls', name: 'Progress bars and meters', status: 'approved',
    words: 'progress bar meter track fill budget over planned ai almost full poll option microphone mic level indeterminate shimmer progressbar aria-valuenow tb-progress ai-meter upload', render: renderProgress,
  });
})();
