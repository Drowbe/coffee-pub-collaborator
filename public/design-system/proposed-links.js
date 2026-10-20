/* The Links family (PROPOSED): link text, running text, standalone links, the link button and the external link icon. Loaded by proposed.html through
   proposed-families.json, after proposed.js (the page engine); it registers one family through window.DS_PROPOSED.families.push and draws it with the
   rules in proposed-links.css. Nothing here is a style of the product: markup, words and tables only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules (.pm-row, .pm-role ...), from the page engine
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  const LK_CSS = `
.pm-lw { flex: 0 0 120px; width: 120px; }
.pm-lw .dsf-ex { min-height: 32px; display: flex; align-items: center; }
.pm-na { color: var(--text-dim); }
.pm-prose { margin: 0; max-width: 520px; line-height: 1.5; }
.pm-ctx { display: grid; gap: 12px; max-width: 560px; }
.pm-ctx > div { padding: 12px; border-radius: var(--radius-medium); background: var(--bg-section); }
.pm-ctx small { display: block; margin-bottom: 4px; color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.pm-chat { display: flex; gap: 8px; }
.pm-chat b { flex: none; }
.pm-navrow { display: flex; flex-wrap: wrap; gap: 4px; }
.pm-navrow a { padding: 8px 12px; color: var(--text); text-decoration: none; border-radius: var(--radius-small); }
.pm-navrow a:hover { background: var(--menu-hover); }
.pm-navrow a[aria-current="page"] { background: var(--selected-bg); }
.pm-row-flex { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 16px; }
.pm-card2 { max-width: 560px; padding: 16px; border-radius: var(--radius-medium); background: var(--bg-section); display: grid; gap: 12px; }
.pm-card2 h5 { margin: 0; font-size: 14px; font-weight: 600; }
.pm-card2 p { margin: 0; color: var(--text-dim); font-size: 12px; }
.pm-opt { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 12px; }
.pm-ct { width: 100%; border-collapse: collapse; font-size: 13px; }
.pm-ct th, .pm-ct td { padding: 8px 12px 8px 0; border-bottom: 1px solid var(--border); text-align: left; vertical-align: middle; }
.pm-ct th { color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.pm-ct td.pm-n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.pm-pass { color: var(--ok); font-weight: 600; }
.pm-fail { color: var(--f-error, var(--danger)); font-weight: 600; }
.dsf-states { gap: 16px 24px; }
.dsf-state { gap: 4px; }
.pm-row .pm-role { margin-top: 16px; min-height: 32px; }
@media (max-width: 640px) { .pm-lw { flex-basis: 140px; width: 140px; } }`;

  // ---- the automatic pick: --text-link is the accent, mixed with the least text colour that reaches 4.5:1 on the page and on a panel (the Colour family's
  // rule for "the accent used as text"). Worked out here for the mode on show and set on every .ds-proposed of the frame. ----
  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
  const ratio = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const hexRgb = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const mixRgb = (a, b, t) => a.map((v, i) => Math.round(v * (1 - t) + b[i] * t));
  const pickLink = (accent, text, bgs) => {
    let last = null;
    for (let p = 0; p <= 100; p += 1) {
      const c = mixRgb(accent, text, p / 100); const worst = Math.min(...bgs.map((b) => ratio(c, b)));
      last = { c, p, worst }; if (worst >= 4.5) return last;
    }
    return last;
  };
  const autoLink = (doc) => {
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true });
    const rgb = (c) => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = c; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const go = () => {
      const hosts = [...doc.querySelectorAll('.ds-proposed')]; if (!hosts.length) return;
      for (const h of hosts) h.style.removeProperty('--text-link');
      const tok = (n) => { const p = doc.createElement('span'); p.style.color = `var(${n})`; hosts[0].appendChild(p); const c = getComputedStyle(p).color; p.remove(); return rgb(c); };
      const r = pickLink(tok('--accent'), tok('--text'), [tok('--bg'), tok('--bg-section')]);
      for (const h of hosts) h.style.setProperty('--text-link', `rgb(${r.c.join(',')})`);
      doc.documentElement.dataset.linkMix = String(r.p);
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };
  window.DS_PROPOSED.pickLink = pickLink;

  // ---- the examples ----
  const EXT = (txt) => `${txt}${fa('arrow-up-right-from-square', 'sdk-link-ext')}<span class="visually-hidden"> (opens in a new tab)</span>`;
  const LK_STATES = ['Rest', 'Hover', 'Focus', 'Pressed', 'Disabled'];
  const fcls = (s) => (s === 'Hover' ? ' ds-force-hover' : s === 'Focus' ? ' ds-force-focus' : s === 'Pressed' ? ' ds-force-active' : '');
  const LK_KINDS = [
    { n: 'Link in running text', ctl: (s) => `<span class="sdk-prose">Read the <a href="#terms" class="${fcls(s).trim()}">terms</a>.</span>`, no: ['Disabled'] },
    { n: 'Standalone link', ctl: (s) => `<a href="#map" class="sdk-link${fcls(s)}"${s === 'Disabled' ? ' aria-disabled="true"' : ''}>Open the map</a>` },
    { n: 'Link with an icon', ctl: (s) => `<a href="#settings" class="sdk-link${fcls(s)}"${s === 'Disabled' ? ' aria-disabled="true"' : ''}>${fa('gear')}<span>Open settings</span></a>` },
    { n: 'Link button', ctl: (s) => `<button type="button" class="sdk-link-btn${fcls(s)}"${s === 'Disabled' ? ' disabled' : ''}>Replace it</button>` },
    { n: 'External link', ctl: (s) => `<a href="https://example.com" target="_blank" rel="noopener" class="sdk-link${fcls(s)}"${s === 'Disabled' ? ' aria-disabled="true"' : ''}>${EXT('louvre.fr')}</a>` },
    { n: 'Link chip', ctl: (s) => `<a href="#b" class="sdk-chip-tag${fcls(s)}">Option B</a>`, no: ['Disabled'] },
  ];
  const lkMatrix = () => `<div class="ds-proposed">${LK_KINDS.map((k) => `<div class="pm-row"><div class="pm-role">${k.n}</div><div class="dsf-states">${LK_STATES.map((s) => (k.no && k.no.includes(s)
    ? `<div class="dsf-state pm-lw"><small>${s}</small><div class="dsf-ex"><span class="pm-na" aria-hidden="true">-</span></div></div>`
    : `<div class="dsf-state pm-lw"><small>${s}</small><div class="dsf-ex">${k.ctl(s)}</div></div>`)).join('')}</div></div>`).join('')}</div>`;

  const lkText = () => `<div class="ds-proposed"><div class="pm-ctx">
    <div><small>Body text</small><p class="sdk-prose pm-prose">Check in opens at three. Please read the <a href="#house">house rules</a> and the <a href="#map">map of the area</a> before you arrive; the <a href="#pdf">full guide</a> is long.</p></div>
    <div><small>Chat message</small><div class="pm-chat"><b>Ana</b><span class="sdk-prose pm-prose">Booked the table, see <a href="#menu">their menu</a>. Their site is <a href="https://example.com/trattoria" target="_blank" rel="noopener">example.com/trattoria${fa('arrow-up-right-from-square', 'sdk-link-ext')}<span class="visually-hidden"> (opens in a new tab)</span></a>.</span></div></div>
    <div><small>Description under a field</small><p class="sdk-prose pm-prose" style="color:var(--text-dim);font-size:12px">Anyone in the space can read this. <a href="#who">Who can see it?</a></p></div>
    <div><small>Help</small><p class="sdk-prose pm-prose">To add a day, press <b>New day</b>. If a day will not save, <button type="button" class="sdk-link-btn">try again</button> or <a href="#help">read the full help</a>.</p></div>
  </div></div>`;

  const lkNot = () => `<div class="ds-proposed"><div class="pm-ctx">
    <div><small>A nav row: the current place is a fill, never an underline</small><nav class="pm-navrow" aria-label="Places"><a href="#a" aria-current="page">Calendar</a><a href="#b">Map</a><a href="#c">Spaces</a></nav></div>
    <div><small>Tabs</small><div class="tb-tabs" role="group" aria-label="Views"><a href="#v1" class="tb-tab on"><span class="tb-tab-word">Day</span></a><a href="#v2" class="tb-tab"><span class="tb-tab-word">Week</span></a><a href="#v3" class="tb-tab"><span class="tb-tab-word">Month</span></a></div></div>
    <div><small>Buttons that are links</small><div class="pm-row-flex"><a href="#o" class="btn btn-primary">Open</a><a href="#o2" class="btn">Open in a new window</a></div></div>
    <div><small>A menu row that is a link, and a chip that is a link</small><div class="pm-row-flex"><a href="#m" class="sdk-menu-item" style="width:auto">${fa('map')}<span>Show on the map</span></a><a href="#c1" class="sdk-chip-tag">Louvre</a></div></div>
  </div></div>`;

  const lkContext = () => `<div class="ds-proposed"><div class="pm-ctx">
    <div class="pm-card2"><h5>Where do we eat on Friday?</h5>
      <div class="pm-opt"><span>Trattoria</span><a href="#p1" class="sdk-chip-tag">Menu</a><a href="#p2" class="sdk-chip-tag">Map</a></div>
      <div class="pm-opt"><span>Sushi bar</span><a href="#p3" class="sdk-chip-tag">Menu</a></div>
      <p class="sdk-prose">Votes close Thursday at noon. <button type="button" class="sdk-link-btn">Change my vote</button></p></div>
    <div class="pm-card2"><h5>Louvre museum, 09:30</h5>
      <div class="pm-opt"><a href="#e1" class="sdk-chip-tag">${fa('ticket')}<span class="sdk-chip-label">Tickets</span></a><a href="#e2" class="sdk-chip-tag">${fa('train')}<span class="sdk-chip-label">Metro 1</span></a></div>
      <div class="pm-opt"><a class="sdk-link" href="https://example.com" target="_blank" rel="noopener">${EXT('louvre.fr')}</a><a class="sdk-link" href="#note">Add a note</a></div></div>
    <div class="pm-card2"><h5>Set up</h5><div class="pm-opt"><a class="sdk-link" href="#s">${fa('gear')}<span>Open settings</span></a><button type="button" class="sdk-link-btn">Replace it</button></div></div>
  </div></div>`;

  const CT_ROWS = [
    ['Link text on the page', '--text-link', '--bg', 4.5],
    ['Link text on a panel', '--text-link', '--bg-section', 4.5],
    ['Link text on a card or menu', '--text-link', '--bg-card', 4.5],
    ['Link text on a field fill', '--text-link', '--bg-input', 4.5],
    ['Focus ring (--accent) on the page', '--accent', '--bg', 3],
    ["Today's link (--accent) on the page", '--accent', '--bg', 4.5],
    ["Today's link (--accent) on a panel", '--accent', '--bg-section', 4.5],
  ];
  const contrastBody = () => `<div class="ds-proposed"><table class="pm-ct"><thead><tr><th>Pair</th><th>Colours</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${CT_ROWS.map((r) => `<tr data-fg="${r[1]}" data-bg="${r[2]}" data-min="${r[3]}"><td>${r[0]}</td><td><code>${r[1]}</code> on <code>${r[2]}</code></td><td class="pm-n" data-out="r"></td><td class="pm-n">${r[3]}:1</td><td data-out="p"></td></tr>`).join('')}</tbody></table>
    <p class="pm-sub" style="margin-top:12px">Every theme and mode the Colour family ships, worked out here: Today's accent as text, the picked link colour, and how much text colour was mixed in.</p>
    <table class="pm-ct" id="lk-sweep"><thead><tr><th>Theme and mode</th><th>Accent</th><th>Today on page / panel</th><th>Mixed in</th><th>Link on page / panel</th><th></th></tr></thead><tbody></tbody></table></div>`;
  const measure = (doc) => {
    autoLink(doc);
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true });
    const host = doc.querySelector('.ds-proposed');
    const px = (c) => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = c; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const tok = (n) => { const p = doc.createElement('span'); p.style.color = `var(${n})`; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-ct:not(#lk-sweep) tbody tr')) {
        const r = ratio(px(tok(tr.dataset.fg)), px(tok(tr.dataset.bg)));
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const ok = r >= Number(tr.dataset.min);
        const p = tr.querySelector('[data-out="p"]'); p.textContent = ok ? 'Passes' : 'Fails'; p.className = ok ? 'pm-pass' : 'pm-fail';
      }
      const col = doc.defaultView.parent.__dsColour; const body = doc.querySelector('#lk-sweep tbody'); body.innerHTML = '';
      if (!col || !col.themes) return;
      for (const [id, t] of Object.entries(col.themes)) {
        for (const mode of ['light', 'dark']) {
          const s = t[mode]; if (!s) continue;
          const a = hexRgb(s.accent); const tx = hexRgb(s.text); const bgs = [hexRgb(s.bg), hexRgb(s.bgSection)];
          const today = bgs.map((b) => ratio(a, b)); const pk = pickLink(a, tx, bgs); const after = bgs.map((b) => ratio(pk.c, b));
          const ok = Math.min(...after) >= 4.5;
          const tr = doc.createElement('tr');
          tr.innerHTML = `<td>${t.name} ${mode}</td><td class="pm-n">${s.accent}</td><td class="pm-n">${today[0].toFixed(2)} / ${today[1].toFixed(2)}</td><td class="pm-n">${pk.p}%</td><td class="pm-n" data-link-min="${Math.min(...after).toFixed(2)}">${after[0].toFixed(2)} / ${after[1].toFixed(2)}</td><td class="${ok ? 'pm-pass' : 'pm-fail'}">${ok ? 'Passes' : 'Fails'}</td>`;
          body.appendChild(tr);
        }
      }
    };
    doc.fonts.ready.then(() => requestAnimationFrame(go));
    new MutationObserver(() => requestAnimationFrame(() => requestAnimationFrame(go))).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  function renderLinks(api) {
    const { mk, h } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="links-h"><a href="#links">Links</a></h3><span class="ds-status-chip ds-st-approved">Approved</span><span class="ds-count">link text, links in running text, standalone links, the link button, the external link icon</span></header>
<p class="ds-desc"><b>Decided 2026-10-21: approved as drawn.</b> <b>One colour for link text</b> (the Colour family's <code>--text-link</code>: the accent as text, picked automatically so it reaches 4.5 to 1 on the page and on a panel in every theme and mode). <b>Two looks</b>: a link in running text is always underlined, a standalone link is underlined on hover and focus only. <b>One link button</b>, replacing four look-alikes. Link chips are Chips tags, link buttons that look like buttons are Buttons. Nothing here styles a bare <code>a</code>. Stylesheet: <code>proposed-links.css</code>, every rule under <code>.ds-proposed</code>.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#links-anatomy">Anatomy</a><a href="#links-states">States</a><a href="#links-text">In running text</a><a href="#links-not">Not a link</a><a href="#links-context">In use</a><a href="#links-widths">Widths</a><a href="#links-rules">Usage rules</a><a href="#links-map">Today to proposed</a><a href="#links-contrast">Contrast</a><a href="#links-tokens">Tokens</a><a href="#links-markup">Markup contract</a><a href="#links-decided">Decided 2026-10-21</a></nav>

<h4 class="ds-h4" id="links-anatomy">Anatomy</h4>
${dim([
    ['1 Colour', '<code>--text-link</code> on every link, standalone or in text. Hover does not change the colour (Today turns it to <code>--accent-hover</code>); the underline is the signal. <b>No visited colour</b>: a visited link looks the same, because the pages here are tools, not articles.'],
    ['2 Running text', 'A link inside a sentence (body, chat, descriptions, help: <code>.sdk-prose a</code>) is <b>always underlined</b>: 1px, 2px below the words (<code>text-underline-offset: 2px</code>), and 2px thick on hover and focus. Colour alone is never what marks a link in a sentence.'],
    ['3 Standalone', 'A link that stands alone in a row or beside a control (<code>.sdk-link</code>): accent text, <b>no underline at rest</b>, underlined on hover and on keyboard focus.'],
    ['4 No underline in nav, tabs, buttons', 'A link in a nav, a tab, a menu row, a button or a chip keeps that component\'s look and is never underlined. The current place is a fill (Tabs and Menus), not a line.'],
    ['5 Focus', 'A 2px accent outline, 2px off the words (<code>outline-offset: 2px</code>), the ring links have today, shown for the keyboard only. A link has no edge, so the ring is not drawn over a hairline; it is whole on all four sides at 125% and 150% display scale, as every 2px outline is.'],
    ['6 External link icon', '<code>fa-arrow-up-right-from-square</code>, 12px, <code>aria-hidden</code>, 4px after the words, only on a link that leaves the site (<code>target="_blank" rel="noopener"</code>), with a visually hidden "(opens in a new tab)". A link to a page in the app has no icon and opens in place.'],
    ['7 Link button', 'A <code>&lt;button type="button" class="sdk-link-btn"&gt;</code> that looks like a standalone link. For something that does, not goes: Replace it, Change my vote, Try again. Its target reaches 8px above and below the words (about 32px high; 14px, about 44px, on a phone) except inside running text.'],
    ['8 Link chip', 'A reference to another object (a poll option\'s place, a calendar event\'s ticket) is a Chips tag with a link: <code>a.sdk-chip-tag</code>, 24px, hover is the chip fill (Chips decided it). It does not use link colour.'],
  ])}

<h4 class="ds-h4" id="links-states">States</h4>
<p class="ds-desc">Every kind in every state, forced from the proposed rules. Pressed is the same as hover. Visited is the same as rest, and cannot be forced here; the stylesheet sets <code>:visited</code> to the link colour.</p>
<div data-slot="matrix"></div>

<h4 class="ds-h4" id="links-text">In running text</h4>
<p class="ds-desc">Body text, a chat message, a description under a field, and help. Underlined, 1px, 2px below the words. The external link in the chat message has the icon; the others stay in the app.</p>
<div data-slot="text"></div>

<h4 class="ds-h4" id="links-not">Where a link is not a link</h4>
<p class="ds-desc">A nav row, tabs, button-looking links, a menu row and a chip are all <code>a</code> elements. They take the look of their own component and have no underline, at rest or on hover.</p>
<div data-slot="not"></div>

<h4 class="ds-h4" id="links-context">In use</h4>
<p class="ds-desc">A poll option with its reference chips, a calendar event with its links, and a setup row with a standalone link and a link button.</p>
<div data-slot="context"></div>

<h4 class="ds-h4" id="links-widths">Widths</h4>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="links-rules">Usage rules</h4>
<ul class="ds-desc">
  <li>A link goes somewhere (another page, a place on the canvas, another site); a button does something. A link that does something is a link button.</li>
  <li>In a sentence, a link is underlined. Alone in a row, a link is accent text and the underline comes on hover and focus.</li>
  <li>Only a link that leaves the site has the external icon, and it always has the hidden words and <code>rel="noopener"</code>.</li>
  <li>No visited colour. No colour change on hover. No underline on anything in a nav, a tab, a menu or a button.</li>
  <li>A reference to an object is a chip, not link text. A call to action is a button, not a link.</li>
  <li>The words of a link say where it goes ("the map of the area"), never "click here" or the bare address (except an address shown on purpose).</li>
</ul>

<h4 class="ds-h4" id="links-map">Today to proposed</h4>
<p class="ds-desc">Today: <code>a { color: var(--accent); text-decoration: none }</code>, hover <code>--accent-hover</code>, and the look-alikes below. Aliases are in the stylesheet, so the first four need no markup change.</p>
${tbl(['Today', 'Where', 'Proposed'], [
    ['<code>a</code> (accent, no underline, hover <code>--accent-hover</code>)', '<code>style.css</code>, <code>host.css</code>', 'A standalone link (<code>.sdk-link</code>); in a sentence <code>.sdk-prose a</code>. Colour <code>--text-link</code>; the hover colour goes.'],
    ['<code>.linklike</code> (always underlined, 12px)', 'a few forms in <code>style.css</code>', 'The link button. The 12px and the permanent underline go.'],
    ['<code>.layout-replace-it</code> (always underlined)', 'the layout sheet', 'The link button.'],
    ['<code>.setup-link</code> (underline on hover and focus only)', 'Set up', 'The standalone link (it already is that; <code>.sdk-link</code> with an icon in front).'],
    ['<code>.link .open</code> (dotted underline, hover to <code>--text</code>)', 'To-do', 'The link button. The dotted underline goes.'],
    ['<code>.tag.ref</code> (hover: a <code>--accent</code> edge)', 'Polls', 'The Chips tag as a link (<code>a.sdk-chip-tag</code> or <code>button.sdk-chip-tag</code>); the hover is the chip fill, not an edge.'],
    ['<code>.links .link</code> (a 1px bordered pill, bold accent word)', 'Calendar', 'The Chips tag as a link. The border and the accent word go. This is a markup change in Calendar (the alias is not added to the Chips shape).'],
    ['<code>a.btn</code> (a link drawn as a button)', 'everywhere', 'Unchanged: a Buttons button. No link rules apply.'],
    ['Raw links in chat messages, help and descriptions (no underline)', 'chat, help, descriptions', '<code>.sdk-prose a</code>: underlined.'],
  ])}

<h4 class="ds-h4" id="links-contrast">Contrast</h4>
<p class="ds-desc">Worked out by this page, in the mode on show (flip Dark and Light and it follows). The pick runs in the page the way the Colour family describes it: the accent itself if it reaches 4.5 to 1 on the page and on a panel, otherwise the least text colour mixed into it that does. The second table does it for each theme and mode the Colour family ships.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="links-tokens">Tokens</h4>
${tbl(['Token', 'Use here', ''], [
    ['<code>--text-link</code> (the Colour role "Link text")', 'Every link, standalone or in text. The accent as text, auto-picked to reach 4.5 to 1 on the page and on a panel. Today there is no such token; links use <code>--accent</code>. Here the fallback is the accent at 55% into the text, and the page replaces it with the picked value.', 'new'],
    ['<code>--link-ul</code>, <code>--link-ul-hover</code>, <code>--link-offset</code>', 'Underline thickness 1px, 2px on hover and focus in text, offset 2px.', 'new'],
    ['<code>--link-icon</code>', 'The external icon: 12px.', 'new'],
    ['<code>--link-hit</code>', 'The link button\'s reach above and below: 8px; 14px on a phone.', 'new'],
    ['<code>--accent</code>', 'The focus ring.', 'exists'],
    ['<code>--chip-fill-hover</code>', 'A link chip\'s hover (Chips).', 'exists'],
    ['<code>--radius-min</code>', 'The corner of the focus ring.', 'exists'],
  ])}

<h4 class="ds-h4" id="links-markup">Markup contract</h4>
${code(`<!-- in a sentence -->
<p class="sdk-prose">Read the <a href="/space/paris/map">map of the area</a> first.</p>

<!-- alone in a row -->
<a class="sdk-link" href="/space/paris/settings">Open settings</a>
<a class="sdk-link" href="/space/paris/settings"><i class="fa-solid fa-gear" aria-hidden="true"></i><span>Open settings</span></a>

<!-- off the site: the icon, the hidden words, a new tab -->
<a class="sdk-link" href="https://louvre.fr" target="_blank" rel="noopener">louvre.fr
  <i class="fa-solid fa-arrow-up-right-from-square sdk-link-ext" aria-hidden="true"></i><span class="visually-hidden"> (opens in a new tab)</span></a>

<!-- a button that looks like a link: it does something -->
<button type="button" class="sdk-link-btn">Replace it</button>

<!-- a reference to an object: a Chips tag, 24px -->
<a class="sdk-chip-tag" href="#option-b">Option B</a>`)}
<p class="ds-desc"><b>Names kept.</b> <code>.setup-link</code>, <code>.linklike</code>, <code>.layout-replace-it</code> and <code>.link .open</code> are aliases of the standalone link and the link button, so those four need no markup edit to take the look. <code>.visually-hidden</code> is the product's own class.</p>

<h4 class="ds-h4" id="links-decided">Decided 2026-10-21</h4>
<p class="ds-desc">Thomas approved every choice below, as drawn, on 2026-10-21.</p>
${tbl(["Decided as drawn","What"], [
    ["Tag links","<code>.tag.ref</code> and the Calendar's <code>.links</code> become Chips tag links (a markup change)."],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + LK_CSS, onload: autoLink }, o || {}));
    slot('matrix').appendChild(F(lkMatrix(), 'Links, all states'));
    slot('text').appendChild(F(lkText(), 'Links in running text'));
    slot('not').appendChild(F(lkNot(), 'Links that are not links'));
    slot('context').appendChild(F(lkContext(), 'Links in use'));
    slot('contrast').appendChild(F(contrastBody(), 'Links, contrast', { onload: measure }));
    const ws = mk('div', '');
    for (const w of [390, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(lkContext(), `Links at ${w}`, { pinWidth: w }));
    }
    slot('widths').appendChild(ws);
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'links', covers: ['links', 'link-button', 'external-link'], group: 'Controls', name: 'Links', status: 'approved',
    words: 'links link anchor underline visited external new tab icon link button linklike text-link standalone running text sdk-link sdk-link-btn sdk-prose', render: renderLinks,
  });
})();
