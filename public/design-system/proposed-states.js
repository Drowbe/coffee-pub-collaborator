/* The Empty, loading and error states family (proposed): one empty block, one skeleton with one shimmer, one spinner, and the error as the same block with a Retry.
   Loaded by proposed.html through proposed-families.json, after proposed.js (the page engine); it registers one family through window.DS_PROPOSED.families.push and
   draws it with the rules in proposed-states.css. Nothing here is a style of the product: markup, words, tables and one working demo of the rule (skeleton over 300ms, spinner
   otherwise). How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss;
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  const ST_CSS = `
.pm-grid { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 14px 24px; }
.pm-cell { display: flex; flex-direction: column; gap: 5px; min-width: 0; max-width: 100%; }
.pm-cell > small, .pm-cap { color: var(--text-dim); font-size: var(--text-11); font-weight: 700; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-cap { margin: 0 0 6px; }
.pm-panel { box-sizing: border-box; min-width: 0; border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-panel-head { display: flex; align-items: center; gap: 8px; padding: 10px 12px; font-size: 14px; font-weight: 600; }
.pm-panel-body { padding: 4px 12px 12px; }
.pm-line { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 24px; padding: 6px 0; }
.pm-bar2 { display: flex; flex-wrap: wrap; gap: 6px; }
.pm-log { margin: 8px 0 0; color: var(--text-dim); font-size: 12px; min-height: 18px; }
.pm-out { min-height: 150px; }
.pm-ct { width: 100%; border-collapse: collapse; font-size: 12px; }
.pm-ct th { padding: 4px 8px 4px 0; color: var(--text-dim); font-size: var(--text-11); letter-spacing: 0.08em; text-align: left; text-transform: uppercase; }
.pm-ct td { padding: 4px 8px 4px 0; border-top: 1px solid var(--border); vertical-align: top; }
.pm-ct .pm-n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.pm-pass { color: var(--ok); font-weight: 700; } .pm-fail { color: var(--danger-text); font-weight: 700; }
.pm-row3 { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
@media (max-width: 640px) { .pm-row3 { grid-template-columns: minmax(0, 1fr); } }`;

  const CELL = (cap, body, w) => `<div class="pm-cell"${w ? ` style="width:${w}px"` : ''}><small>${cap}</small>${body}</div>`;
  const PANEL = (title, body, o = {}) => `<div class="pm-panel"${o.w ? ` style="width:${o.w}px;max-width:100%"` : ''}><div class="pm-panel-head">${fa(o.icon || 'list-check')}<span>${title}</span></div><div class="pm-panel-body">${body}</div></div>`;

  // ---- the shapes ----
  const skelRow = () => `<div class="sdk-skel-row"><span class="sdk-skel sdk-skel-dot"></span><div class="sdk-skel-stack"><span class="sdk-skel sdk-skel-title"></span><span class="sdk-skel sdk-skel-line" style="--w:70%"></span></div></div>`;
  const skelCard = () => `<div class="sdk-skel-card"><span class="sdk-skel sdk-skel-block"></span><span class="sdk-skel sdk-skel-title"></span><span class="sdk-skel sdk-skel-line" style="--w:80%"></span></div>`;
  const skelLines = (n) => Array.from({ length: n }, (_, i) => `<span class="sdk-skel sdk-skel-line" style="--w:${[100, 92, 60, 85][i % 4]}%"></span>`).join('');
  const SKEL_LIST = `<div class="sdk-skel-list" role="status" aria-busy="true" aria-label="Loading">${skelRow()}${skelRow()}${skelRow()}</div>`;
  const EMPTY = (o = {}) => `<div class="sdk-empty"${o.kind ? ` data-kind="${o.kind}"` : ''}>${fa(o.icon || 'list-check')}<h3 class="sdk-empty-title">${o.title}</h3>${o.text ? `<p class="sdk-empty-text">${o.text}</p>` : ''}${o.btn ? `<div class="sdk-empty-actions">${o.btn}</div>` : ''}</div>`;
  const ERROR = (o = {}) => EMPTY({ kind: 'error', icon: 'triangle-exclamation', title: o.title || 'Could not load the places', text: o.text || 'The server did not answer. Check your connection and try again.', btn: `<button type="button" class="btn" data-retry>${fa('rotate-right')} Retry</button>` });

  // ---- examples ----
  const emptyBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('With a Primary button: the one next step', PANEL('Places', EMPTY({ title: 'No places yet', text: 'Add the first place you want to visit.', btn: '<button type="button" class="btn btn-primary">Add a place</button>' }), { w: 340 }))}
    ${CELL('With a Quiet button: a way out, not a step', PANEL('Places', EMPTY({ icon: 'magnifying-glass', title: 'No places match', text: 'Try fewer words, or clear the filter.', btn: '<button type="button" class="btn btn-quiet">Clear the filter</button>' }), { w: 340 }))}
    ${CELL('No button: nothing to do', PANEL('Activity', EMPTY({ icon: 'bell', title: 'Nothing new', text: 'Changes by other people show up here.' }), { w: 340 }))}
  </div></div>`;
  const lineBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('Compact line: a list with nothing in it', PANEL('Notices', `<p class="sdk-empty-line">${fa('bell')}No notices.</p>`, { w: 340, icon: 'bell' }))}
    ${CELL('Compact line with an action', PANEL('Files', `<p class="sdk-empty-line">${fa('folder-open')}No files yet.<button type="button" class="btn btn-small">Upload</button></p>`, { w: 340, icon: 'folder-open' }))}
    ${CELL('Compact line, error', PANEL('Files', `<p class="sdk-empty-line" data-kind="error">${fa('triangle-exclamation')}Could not load the files.<button type="button" class="btn btn-small">Retry</button></p>`, { w: 340, icon: 'folder-open' }))}
  </div></div>`;

  const skelBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('Line (12px) and title (16px)', PANEL('Notes', `<div class="sdk-skel-list" aria-hidden="true"><span class="sdk-skel sdk-skel-title"></span>${skelLines(4)}</div>`, { w: 300, icon: 'note-sticky' }))}
    ${CELL('Row: a portrait and two lines', PANEL('People', `<div class="sdk-skel-list" aria-hidden="true">${skelRow()}${skelRow()}${skelRow()}</div>`, { w: 300, icon: 'users' }))}
    ${CELL('Card: a picture and two lines', PANEL('Places', `<div class="sdk-skel-grid" style="grid-template-columns:minmax(0,1fr)" aria-hidden="true">${skelCard()}</div>`, { w: 300, icon: 'location-dot' }))}
  </div></div>`;
  const spinBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('12px', `<div class="pm-line"><span class="sdk-spinner sdk-spinner-sm" role="status" aria-label="Loading"></span></div>`, 90)}
    ${CELL('16px, the default', `<div class="pm-line"><span class="sdk-spinner" role="status" aria-label="Loading"></span></div>`, 130)}
    ${CELL('20px', `<div class="pm-line"><span class="sdk-spinner sdk-spinner-lg" role="status" aria-label="Loading"></span></div>`, 90)}
    ${CELL('In a button: the label stays', `<div class="pm-line"><button type="button" class="btn btn-primary" aria-busy="true"><span class="sdk-spinner" aria-hidden="true"></span> Saving</button><button type="button" class="btn" aria-busy="true"><span class="sdk-spinner" aria-hidden="true"></span> Sending</button></div>`, 280)}
    ${CELL('Inline wait', `<p style="margin:6px 0;color:var(--text-dim);font-size:13px"><span class="sdk-spinner sdk-spinner-sm" aria-hidden="true"></span> Looking for the address...</p>`, 240)}
  </div></div>`;
  const errBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('Error: the empty block with a Retry', PANEL('Places', ERROR(), { w: 340 }))}
    ${CELL('Field error line (.sdk-form-error)', `<div style="width:300px"><label class="sdk-field"><span class="sdk-label">Cost</span><input type="number" value="-3" aria-invalid="true" aria-describedby="se-1"><span class="sdk-form-error" id="se-1">Use 0 or more.</span></label></div>`)}
    ${CELL('A refusal that is not one field\'s', `<div style="width:300px"><p class="sdk-form-error" role="alert">The name is already used in this space.</p></div>`)}
  </div></div>`;

  // The rule, live.
  const ruleBody = () => `<div class="ds-proposed"><div class="pm-panel" style="max-width:520px"><div class="pm-panel-head">${fa('location-dot')}<span>Places</span></div><div class="pm-panel-body">
    <div class="pm-bar2" role="group" aria-label="Load the places"><button type="button" class="btn btn-small" data-load="fast">Load: answers in 200ms</button><button type="button" class="btn btn-small" data-load="slow">Load: answers in 1.8s</button><button type="button" class="btn btn-small" data-load="fail">Load: fails</button></div>
    <div class="pm-out" data-out style="margin-top:10px"></div>
    <p class="pm-log" data-log role="status" aria-live="polite">Press a button. A load under 300ms shows nothing in between; a longer one shows the skeleton; a failure shows the error with Retry.</p>
  </div></div></div>`;
  const ruleDemo = (doc) => {
    const win = doc.defaultView;
    const out = doc.querySelector('[data-out]'); const log = doc.querySelector('[data-log]');
    let token = 0; let attempt = 0;
    win.__stateScale = 1;
    const load = (mode) => {
      const t = ++token; attempt += 1;
      out.innerHTML = ''; out.removeAttribute('aria-busy');
      log.textContent = 'Loading... (nothing shown yet)';
      const timer = setTimeout(() => { if (t === token) { out.innerHTML = SKEL_LIST; out.setAttribute('aria-busy', 'true'); log.textContent = 'Over 300ms: the skeleton shows.'; } }, 300 * win.__stateScale);
      const ms = mode === 'fast' ? 200 : mode === 'slow' ? 1800 : 900;
      setTimeout(() => {
        if (t !== token) return;
        clearTimeout(timer); out.removeAttribute('aria-busy');
        if (mode === 'fail' && attempt % 2 === 1) {
          out.innerHTML = ERROR(); log.textContent = 'Failed: the error shows with Retry. Retry loads again.';
        } else {
          out.innerHTML = `<div class="sdk-skel-list">${['Louvre museum', 'Train to Lyon', 'Hotel des Arts'].map((n) => `<div class="sdk-skel-row"><span class="sdk-skel-dot" style="background:var(--selected-bg);border-radius:var(--radius-round);width:32px;height:32px;flex:none"></span><div class="sdk-skel-stack"><b style="font-size:14px">${n}</b><span style="color:var(--text-dim);font-size:12px">Saturday</span></div></div>`).join('')}</div>`;
          log.textContent = 'Loaded.';
        }
      }, ms * win.__stateScale);
    };
    win.__state = { load };
    doc.addEventListener('click', (e) => {
      const b = e.target.closest('[data-load]'); if (b) { load(b.dataset.load); return; }
      if (e.target.closest('[data-retry]')) { log.textContent = 'Retrying...'; load('fast'); }
    });
  };

  // In a panel: four moments of one list.
  const panelBody = (w) => `<div class="ds-proposed"><div class="pm-grid" style="${w <= 640 ? 'display:block' : ''}">
    ${CELL('First load, over 300ms', PANEL('Places', SKEL_LIST, { w: w <= 640 ? 362 : 280 }))}
    ${CELL('Nothing yet', PANEL('Places', EMPTY({ title: 'No places yet', text: 'Add the first place you want to visit.', btn: '<button type="button" class="btn btn-primary">Add a place</button>' }), { w: w <= 640 ? 362 : 280 }))}
    ${CELL('Failed', PANEL('Places', ERROR({ title: 'Could not load', text: 'Check your connection and try again.' }), { w: w <= 640 ? 362 : 280 }))}
  </div></div>`;
  const phonePanel = () => `<div class="ds-proposed"><div class="pm-grid" style="display:flex;flex-direction:column;gap:12px">${panelBody(390).replace(/^<div class="ds-proposed">|<\/div>$/g, '')}</div></div>`;

  const aliasBody = () => `<div class="ds-proposed"><div class="pm-grid">
    ${CELL('.state (Budget, Maps: .ic, h2, p)', `<div class="pm-panel" style="width:300px"><div class="state"><i class="fa-solid fa-triangle-exclamation ic" aria-hidden="true"></i><h2>Could not load</h2><p>Try again in a moment.</p><button type="button" class="btn">Retry</button></div></div>`)}
    ${CELL('.empty (Calendar)', `<div class="pm-panel" style="width:300px"><div class="empty"><i class="fa-solid fa-calendar" aria-hidden="true"></i><p>No events this week.</p></div></div>`)}
    ${CELL('.rs-empty (Research)', `<div class="pm-panel" style="width:300px"><div class="rs-empty"><i class="fa-solid fa-book" aria-hidden="true"></i><p>No sources yet.</p></div></div>`)}
    ${CELL('.skeleton with .skel (Places, Travel, Research, Maps)', `<div class="pm-panel" style="width:300px;padding:12px"><div class="skeleton" aria-hidden="true"><div class="skel" style="height:54px"></div><div class="skel" style="height:54px"></div></div></div>`)}
    ${CELL('.error (nine modules; Stream\'s was #e07a5f)', `<div class="pm-panel" style="width:300px;padding:12px"><p class="error">Could not load the places.</p></div>`)}
    ${CELL('.emptynote, .activity-empty, .bell-empty as the compact line', `<div class="pm-panel" style="width:300px"><p class="emptynote">No notices.</p><p class="activity-empty">Nothing new.</p><p class="bell-empty">No notices.</p></div>`)}
  </div></div>`;

  const TC_ROWS = [
    ['Heading (--text) on the panel', 'var(--text)', ['--bg-section'], 4.5],
    ['Text and icon (--text-dim) on the panel', 'var(--text-dim)', ['--bg-section'], 4.5],
    ['Error text (danger 70% into text) on the panel', 'var(--state-error)', ['--bg-section'], 4.5],
    ['Error text on a card (--bg-card)', 'var(--state-error)', ['--bg-card'], 4.5],
    ['Error text on the page (--bg)', 'var(--state-error)', ['--bg'], 4.5],
    ['Plain --danger on the panel (shown to compare; not used)', 'var(--danger)', ['--bg-section'], 1],
    ['The raw #e07a5f of Stream on the panel (shown to compare; retired)', 'color-mix(in srgb, #e07a5f 100%, transparent)', ['--bg-section'], 1],
    ['Spinner (--text-dim) on the panel', 'var(--text-dim)', ['--bg-section'], 3],
    ['Spinner on the Primary button (--on-accent on --accent)', 'var(--on-accent)', ['--accent'], 3],
    ['The skeleton base (text 8%) against the panel (it is a shape, not text)', 'color-mix(in srgb, var(--text) 8%, transparent)', ['--bg-section'], 1],
  ];
  const tcBody = () => `<div class="ds-proposed"><table class="pm-ct"><thead><tr><th>Pair</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${TC_ROWS.map((r) => `<tr data-fg="${h(r[1])}" data-bgs="${h(JSON.stringify(r[2]))}" data-min="${r[3]}"><td>${r[0]}</td><td class="pm-n" data-out="r"></td><td class="pm-n">${r[3] === 1 ? 'info' : r[3] + ' to 1'}</td><td data-out="p"></td></tr>`).join('')}</tbody></table></div>`;
  const measureContrast = (doc) => {
    const host = doc.querySelector('.ds-proposed');
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const col = (expr) => { const p = doc.createElement('span'); p.style.color = expr.startsWith('--') ? `var(${expr})` : expr; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (d) => 0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]);
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-ct tbody tr')) {
        const layers = JSON.parse(tr.dataset.bgs);
        g.clearRect(0, 0, 1, 1);
        for (const l of layers) { g.fillStyle = col(l); g.fillRect(0, 0, 1, 1); }
        const base = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        g.fillStyle = col(tr.dataset.fg); g.fillRect(0, 0, 1, 1);
        const top = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        const a = lum(top); const b = lum(base);
        const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const ok = r >= Number(tr.dataset.min);
        const p = tr.querySelector('[data-out="p"]'); p.textContent = Number(tr.dataset.min) === 1 ? 'Info' : ok ? 'Passes' : 'Fails'; p.className = Number(tr.dataset.min) === 1 ? '' : ok ? 'pm-pass' : 'pm-fail';
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  function renderStates(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="states-h"><a href="#states">Empty, loading and error states</a></h3><span class="ds-status-chip ds-st-proposed">Proposed</span><span class="ds-count">one empty block, one skeleton, one spinner; the error is the empty block with a Retry</span></header>
<p class="ds-desc"><b>Proposed 2026-10-20, from Thomas's decisions of 2026-10-20.</b> One <code>.sdk-empty</code> block (a 24px icon, a 16px heading, dim text, an optional Primary or Quiet button) with a compact line for lists. One <code>.sdk-skel</code> skeleton in row, card and text-line shapes with <b>one</b> shimmer, off when the person asks for less motion. One 16px spinner (12px and 20px sizes) for buttons and inline waits. <b>The rule: a skeleton for a first load that takes over 300ms; a spinner otherwise.</b> An error is the same empty block with a Retry button, plus the field error line <code>.sdk-form-error</code>. The error colour is the readable danger mix (danger 70% into the text colour); the raw <code>#e07a5f</code> of the Stream module goes. The "Loading..." text in about 30 places becomes the spinner or a skeleton.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#states-empty">Empty</a><a href="#states-line">Compact line</a><a href="#states-skel">Skeleton</a><a href="#states-spin">Spinner</a><a href="#states-error">Error</a><a href="#states-rule">The rule, live</a><a href="#states-panel">In a panel</a><a href="#states-alias">Aliases</a><a href="#states-today">Today to proposed</a><a href="#states-contrast">Contrast</a><a href="#states-tokens">Tokens</a><a href="#states-markup">Markup contract</a><a href="#states-widths">Widths</a></nav>

<h4 class="ds-h4" id="states-empty">Empty</h4>
<p class="ds-desc">Text only, no box (the Cards family draws it so). A 24px icon in <code>--text-dim</code>, a 16px heading in <code>--text</code> (weight 600), one or two lines of dim text, and at most one button: <b>Primary</b> when there is one next step ("Add a place"), <b>Quiet</b> when it is a way out ("Clear the filter"), none when there is nothing to do. The heading says what is missing; the text says what to do. Sentence case.</p>
<div data-slot="empty"></div>

<h4 class="ds-h4" id="states-line">Compact line</h4>
<p class="ds-desc">For a list or a popover too small for the block: one line, an icon, the words, and at most a small button at the end. 13px, <code>--text-dim</code> (the error kind is the readable red).</p>
<div data-slot="line"></div>

<h4 class="ds-h4" id="states-skel">Skeleton</h4>
<p class="ds-desc">A soft block the shape of what is coming, with one shimmer (a lighter band crossing from left to right every 1.4 s). Three shapes: a <b>line</b> (12px; a title is 16px), a <b>row</b> (a portrait and two lines, 56px, like a real row) and a <b>card</b> (a picture and two lines). The shape matches the content so nothing jumps when it arrives. It is a decoration: the list around it says <code>aria-busy="true"</code> and carries the one "Loading" for a screen reader.</p>
<div data-slot="skel"></div>

<h4 class="ds-h4" id="states-spin">Spinner</h4>
<p class="ds-desc">A 2px ring of the current text colour with a gap, turning once every 0.8 s. 16px by default; 12px beside small text; 20px on its own. In a button the label stays and the spinner goes in front of it (the Buttons family's loading state); the button cannot be pressed again.</p>
<div data-slot="spin"></div>

<h4 class="ds-h4" id="states-error">Error</h4>
<p class="ds-desc">A failed load is the same empty block: a warning icon in the readable red, a heading that says what failed, a line that says what to do, and a <b>Retry</b> button (Secondary, with a rotate icon). A refusal of one field is the line under it; a refusal of the whole form is the same line, at the foot of the form. Both are <code>.sdk-form-error</code>.</p>
<div data-slot="error"></div>

<h4 class="ds-h4" id="states-rule">The rule, live</h4>
<p class="ds-desc">Press a button. Under 300ms nothing shows in between, so a fast answer does not flash. Over 300ms the skeleton shows until the answer comes. A failure shows the error; Retry loads again.</p>
<div data-slot="rule"></div>

<h4 class="ds-h4" id="states-panel">In a panel</h4>
<p class="ds-desc">The same list in three moments, in a panel, at 1280 and at 390.</p>
<div data-slot="panel"></div>
<div data-slot="panel-phone"></div>

<h4 class="ds-h4" id="states-alias">Aliases</h4>
<p class="ds-desc">Today's names take the look with no markup edit. The Cards family already draws <code>.empty</code>, <code>.rs-empty</code> and <code>.state</code> as the block; here they take its heading and icon, and <code>.skel</code>, <code>.error</code> and the three compact lines are new.</p>
<div data-slot="alias"></div>

<h4 class="ds-h4" id="states-today">Today to proposed</h4>
${tbl(['Today', 'Proposed', 'Note'], [
    ['<code>.state</code>: four copies (Budget, Maps, Places, Travel), each with its own width, icon size (28 or 30px) and accent icon', '<code>.sdk-empty</code>', 'The icon is dim, 24px. Alias kept.'],
    ['<code>.empty</code>: three copies (Calendar, Polls, Todo), 24px by 8px of padding', '<code>.sdk-empty</code>, or the compact line for a list', 'Alias kept.'],
    ['<code>.skel</code>: four copies (Maps, Places, Research, Travel) with heights 54, 64 and 96px, radii medium and large, and the shimmer written four times', '<code>.sdk-skel</code>: one shimmer (<code>sdk-shimmer</code>), three shapes', 'Alias kept. Off under reduced motion.'],
    ['<code>.error</code>: nine copies (Budget, Calendar, Maps, Places, Polls, Research, Stream, Todo, Travel); eight are plain <code>--danger</code> (3.4 to 1 on a panel in dark mode, 4.1 in light: under 4.5 in both), Stream\'s is a fixed <code>#e07a5f</code> (5.7 in dark, 2.5 in light, and it does not change with the mode)', '<code>.sdk-form-error</code>: the readable danger mix', 'Alias kept. The hex goes.'],
    ['<code>.emptynote</code>: a dashed box (Travel)', 'The compact line (<code>.sdk-empty-line</code>)', 'Alias kept. No dashed edge.'],
    ['<code>.canvas-empty</code>, <code>.no-call-empty</code>, <code>.chat-view-empty</code>', '<code>.sdk-empty</code> (their own markup changes)', 'Each is a centred message with its own spacing.'],
    ['<code>.activity-empty</code>, <code>.bell-empty</code>', 'The compact line', 'Alias kept.'],
    ['<code>.hint</code> used as a one-line "nothing here"', 'The compact line', 'Where it stands for an empty list.'],
    ['"Loading..." as plain text, in about 30 places', 'The spinner (a button, an inline wait) or a skeleton (a first load over 300ms)', 'No text-only wait.'],
    ['Failed loads that say "could not load" and offer nothing', 'The error block with Retry', ''],
  ])}

<h4 class="ds-h4" id="states-contrast">Contrast</h4>
<p class="ds-desc">Worked out by this page, in the mode on show. The error text takes the readable mix; plain <code>--danger</code> and the old hex are shown to compare.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="states-tokens">Tokens</h4>
${tbl(['Token', 'Use here', ''], [
    ['<code>--state-error</code>', 'Danger 70% into <code>--text</code>: the error line, the error icon. The same mix as the Fields\' error and the Toasts\' danger text.', 'new'],
    ['<code>--skel-base</code>, <code>--skel-hi</code>, <code>--skel-ms</code>', 'The skeleton\'s fill (text 8%), the shimmer band (text 14%), 1.4 s.', 'new'],
    ['<code>--spin</code>, <code>--spin-ms</code>', 'The spinner: 16px (12 and 20 with a class), 0.8 s.', 'new'],
    ['<code>--bg-card</code>, <code>--bg-section</code>', 'A skeleton row and card; the panel around.', 'exists'],
    ['<code>--text</code>, <code>--text-dim</code>', 'The heading; the text, the icon, the spinner.', 'exists'],
    ['<code>--radius-small</code>, <code>--radius-medium</code>, <code>--radius-round</code>', 'A line; a row, a card and a block; the portrait and the spinner.', 'exists'],
  ])}

<h4 class="ds-h4" id="states-markup">Markup contract</h4>
${code(`<!-- empty: the icon, the heading, the text, at most one button; the error is the same block with data-kind -->
<div class="sdk-empty">
  <i class="fa-solid fa-list-check" aria-hidden="true"></i>
  <h3 class="sdk-empty-title">No places yet</h3>
  <p class="sdk-empty-text">Add the first place you want to visit.</p>
  <div class="sdk-empty-actions"><button type="button" class="btn btn-primary">Add a place</button></div>
</div>
<div class="sdk-empty" data-kind="error"> ... <button type="button" class="btn">Retry</button> </div>
<p class="sdk-empty-line"><i class="fa-solid fa-bell" aria-hidden="true"></i>No notices.</p>

<!-- loading: the list says aria-busy; the pieces are decoration -->
<div class="sdk-skel-list" role="status" aria-busy="true" aria-label="Loading">
  <div class="sdk-skel-row"><span class="sdk-skel sdk-skel-dot"></span><div class="sdk-skel-stack"><span class="sdk-skel sdk-skel-title"></span><span class="sdk-skel sdk-skel-line" style="--w:70%"></span></div></div>
</div>
<button type="button" class="btn btn-primary" aria-busy="true"><span class="sdk-spinner" aria-hidden="true"></span> Saving</button>

<!-- the field error -->
<span class="sdk-form-error" id="cost-e">Use 0 or more.</span>`)}

<h4 class="ds-h4" id="states-widths">Widths</h4>
<div data-slot="widths"></div>
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + ST_CSS }, o || {}));
    slot('empty').appendChild(F(emptyBody(), 'States, empty'));
    slot('line').appendChild(F(lineBody(), 'States, compact line'));
    slot('skel').appendChild(F(skelBody(), 'States, skeleton'));
    slot('spin').appendChild(F(spinBody(), 'States, spinner'));
    slot('error').appendChild(F(errBody(), 'States, error'));
    slot('rule').appendChild(F(ruleBody(), 'States, the rule', { height: 330, onload: ruleDemo }));
    slot('panel').appendChild(F(panelBody(1280), 'States, in a panel'));
    slot('panel-phone').appendChild(F(phonePanel(), 'States, in a panel at 390', { pinWidth: 390 }));
    slot('alias').appendChild(F(aliasBody(), 'States, aliases'));
    slot('contrast').appendChild(F(tcBody(), 'States, contrast', { onload: measureContrast }));
    const ws = mk('div', '');
    for (const w of [390, 700, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(w <= 640 ? phonePanel() : panelBody(w), `States at ${w}`, { pinWidth: w }));
    }
    slot('widths').appendChild(ws);
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'states', covers: ['empty', 'loading', 'error', 'skeleton', 'spinner', 'state'], group: 'Feedback', name: 'Empty, loading and error states', status: 'proposed',
    words: 'empty loading error state states skeleton shimmer spinner retry nothing yet no results failed could not load first load compact line field error form error reduced motion',
    render: renderStates,
  });
})();
