/* The Avatars and portraits family (PROPOSED): the circle in six sizes, initials, photo and icon, presence, the who's-around stack and the photo tile. Loaded by
   proposed.html through proposed-families.json, after proposed.js (the page engine); it registers one family through window.DS_PROPOSED.families.push and draws it
   with the rules in proposed-avatars.css. Nothing here is a style of the product: markup, words and tables only. How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules (.pm-row, .pm-role ...), from the page engine
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  const AV_CSS = `
.pm-sizes { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 16px 24px; }
/* Each example sits in a slot of one height, centred in it, so a row of different sizes shares one centre line and the captions one line below. */
.pm-sizes > div { display: grid; grid-template-rows: var(--slot, 96px) auto; align-items: center; justify-items: center; gap: 4px; }
.pm-sizes > .pm-grp { display: grid; grid-template-rows: none; gap: 12px; }
.pm-grp > div { display: grid; grid-template-rows: var(--slot, 64px) auto; align-items: center; justify-items: center; gap: 4px; }
.pm-row .pm-role { margin-top: 0; min-height: var(--role-h, 96px); }
.pm-sizes small, .pm-grp small { color: var(--text-dim); font-size: 11px; font-weight: 600; }
.pm-card3 { box-sizing: border-box; max-width: 560px; padding: 16px; border-radius: var(--radius-medium); background: var(--bg-section); display: grid; gap: 12px; }
.pm-card3 h5 { margin: 0; font-size: 14px; font-weight: 600; }
.pm-list { display: grid; gap: 12px; }
.pm-msg { display: flex; align-items: flex-start; gap: 12px; }
.pm-msg b { font-size: 14px; }
.pm-msg p { margin: 0; font-size: 14px; }
.pm-msg small { color: var(--text-dim); font-size: 12px; }
.pm-tiles { display: flex; flex-wrap: wrap; align-items: flex-start; gap: 16px 16px; }
.pm-tile2 { display: grid; grid-template-rows: 96px auto auto; align-items: center; justify-items: center; gap: 4px; width: 120px; text-align: center; font-size: 13px; }
.pm-tile2 small { color: var(--text-dim); font-size: 11px; }
.pm-members { display: grid; grid-template-columns: repeat(auto-fill, minmax(96px, 1fr)); gap: 12px; }
.pm-members > div { display: grid; justify-items: center; gap: 4px; padding: 12px 8px; border-radius: var(--radius-medium); background: var(--bg-card); font-size: 13px; text-align: center; }
.pm-link { display: flex; gap: 12px; padding: 12px; border-radius: var(--radius-medium); background: var(--bg-card); }
.pm-link b { display: block; font-size: 14px; }
.pm-link span { color: var(--text-dim); font-size: 12px; }
.pm-call { display: grid; grid-template-columns: repeat(auto-fit, minmax(110px, 1fr)); gap: 8px; }
.pm-call > div { display: grid; place-items: center; gap: 8px; padding: 16px 8px; border-radius: var(--radius-medium); background: var(--bg-card); font-size: 13px; }
.pm-ct { width: 100%; border-collapse: collapse; font-size: 13px; }
.pm-ct th, .pm-ct td { padding: 8px 12px 8px 0; border-bottom: 1px solid var(--border); text-align: left; vertical-align: middle; }
.pm-ct th { color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; text-transform: uppercase; }
.pm-ct td.pm-n { font-variant-numeric: tabular-nums; white-space: nowrap; }
.pm-pass { color: var(--ok); font-weight: 600; }
.pm-fail { color: var(--f-error, var(--danger)); font-weight: 600; }`;

  // A photo is data here: a small picture drawn as an SVG, so the page needs no file.
  const pic = (bg, fg) => `data:image/svg+xml,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" fill="${bg}"/><circle cx="32" cy="25" r="12" fill="${fg}"/><path d="M8 64c2-19 13-26 24-26s22 7 24 26z" fill="${fg}"/></svg>`)}`;
  const PICS = [pic('#6a4a34', '#e8c9a4'), pic('#2f5d7a', '#f0d6b8'), pic('#5a3f6a', '#d9b48f'), pic('#3f5a3a', '#e8c9a4')];
  const SIZES = [20, 24, 32, 40, 64, 96];
  const NAMES = [['Ana Berg', 'A', 'B', 'gold'], ['Ben Cole', 'B', 'C', 'blue'], ['Cleo Diaz', 'C', 'D', 'green'], ['Dev Egan', 'D', 'E', 'purple'], ['Eli Fox', 'E', 'F', 'teal'], ['Fay Gray', 'F', 'G', 'pink']];
  const av = (n, o = {}) => {
    const sz = o.size && o.size !== 32 ? ` sdk-avatar-${o.size}` : '';
    const who = o.person || NAMES[0];
    const label = o.decor ? ' aria-hidden="true"' : ` role="img" aria-label="${who[0]}${o.state ? ', ' + o.state : ''}"`;
    const inner = o.kind === 'photo' ? `<img src="${PICS[o.pic || 0]}" alt="">` : o.kind === 'icon' ? fa('user') : `<span class="sdk-avatar-ini">${who[1]}</span><span class="sdk-avatar-ini2">${who[2]}</span>`;
    const dot = o.state ? `<span class="sdk-presence" data-state="${o.state.toLowerCase()}" role="img" aria-label="${o.state}" title="${o.state}"></span>` : '';
    return `<span class="sdk-avatar${sz}${o.force ? ' ' + o.force : ''}"${o.kind === 'tint' || o.tint ? ` data-tint="${who[3]}"` : ''}${label}>${inner}${dot}</span>`;
  };
  const sized = (mk) => SIZES.map((s, i) => `<div>${mk(s, i)}<small>${s}px</small></div>`).join('');

  const sizesBody = () => `<div class="ds-proposed">
    <div class="pm-row"><div class="pm-role">Initials</div><div class="pm-sizes">${sized((s, i) => av(0, { size: s, person: NAMES[i] }))}</div></div>
    <div class="pm-row"><div class="pm-role">Initials, a tint</div><div class="pm-sizes">${sized((s, i) => av(0, { size: s, person: NAMES[i], tint: true }))}</div></div>
    <div class="pm-row"><div class="pm-role">Photo</div><div class="pm-sizes">${sized((s, i) => av(0, { size: s, kind: 'photo', pic: i % 4, person: NAMES[i] }))}</div></div>
    <div class="pm-row"><div class="pm-role">No photo, no name: the icon</div><div class="pm-sizes">${sized((s) => av(0, { size: s, kind: 'icon', person: ['Guest'] }))}</div></div></div>`;

  const presenceBody = () => `<div class="ds-proposed">
    <div class="pm-row"><div class="pm-role" style="--role-h:64px">Online, away, offline</div><div class="pm-sizes">${[24, 32, 40, 64].map((s) => `<div class="pm-grp">${['Online', 'Away', ''].map((st, i) => `<div>${av(0, { size: s, person: NAMES[i], state: st, kind: i === 1 ? 'photo' : '' })}<small>${st || 'Offline'}</small></div>`).join('')}</div>`).join('')}</div></div>
    <div class="pm-row"><div class="pm-role" style="--role-h:0px;margin-top:16px">In a list: the word is written</div><div class="pm-card3"><div class="pm-list">
      ${[['Ana Berg', 'Online', 0], ['Ben Cole', 'Away', 1], ['Cleo Diaz', '', 2]].map(([n, st, i]) => `<div class="sdk-person">${av(0, { person: NAMES[i], state: st, decor: true, tint: true })}<span class="sdk-person-text"><span class="sdk-person-name">${n}</span>${st ? `<span class="sdk-presence-word">${st}</span>` : '<span class="sdk-presence-word">Offline</span>'}</span></div>`).join('')}</div></div></div></div>`;

  const stackBody = () => `<div class="ds-proposed">
    <div class="pm-row"><div class="pm-role" style="--role-h:40px">Three people</div><div class="pm-sizes" style="--slot:40px"><div><span class="sdk-avatar-stack" role="group" aria-label="Ana, Ben and Cleo are here">${[0, 1, 2].map((i) => av(0, { person: NAMES[i], tint: true })).join('')}</span><small>32px</small></div><div><span class="sdk-avatar-stack" role="group" aria-label="Ana, Ben and Cleo are here">${[0, 1, 2].map((i) => av(0, { size: 24, person: NAMES[i], tint: true })).join('')}</span><small>24px</small></div></div></div>
    <div class="pm-row"><div class="pm-role" style="--role-h:40px">More than fit: a micro count</div><div class="pm-sizes" style="--slot:40px"><div><span class="sdk-avatar-stack" role="group" aria-label="Ana, Ben, Cleo and 3 more are here">${[0, 1, 2].map((i) => av(0, { person: NAMES[i], kind: i === 1 ? 'photo' : 'tint', pic: i })).join('')}<span class="sdk-badge-micro" aria-hidden="true">3</span><span class="visually-hidden">and 3 more</span></span><small>32px</small></div><div><span class="sdk-avatar-stack" role="group" aria-label="Ana, Ben, Cleo, Dev and 12 more are here">${[0, 1, 2, 3].map((i) => av(0, { size: 24, person: NAMES[i], tint: true })).join('')}<span class="sdk-badge-micro" aria-hidden="true">12</span><span class="visually-hidden">and 12 more</span></span><small>24px</small></div></div></div></div>`;

  const tileBody = () => `<div class="ds-proposed"><div class="pm-tiles">
    <div class="pm-tile2"><span class="sdk-photo sdk-photo-72"><img src="${PICS[0]}" alt="Ana Berg"><span class="sdk-presence" data-state="online" role="img" aria-label="Online" title="Online"></span></span>Home member tile<small>72px, online dot</small></div>
    <div class="pm-tile2"><span class="sdk-photo sdk-photo-72">${fa('user')}</span>Home member tile<small>72px, no photo</small></div>
    <div class="pm-tile2"><span class="sdk-photo sdk-photo-72"><img src="${PICS[2]}" alt="" aria-hidden="true"></span>Chat link image<small>72px</small></div>
    <div class="pm-tile2"><span class="sdk-photo sdk-photo-52"><img src="${PICS[1]}" alt="" aria-hidden="true"></span>Chat link image<small>52px, narrow</small></div>
    <div class="pm-tile2"><span class="sdk-photo sdk-photo-96"><img src="${PICS[3]}" alt="Your picture"></span>Profile slot<small>96px</small></div>
    <div class="pm-tile2">${av(0, { size: 96, kind: 'photo', pic: 0, person: NAMES[0] })}Avatar, to compare<small>96px, a circle</small></div></div></div>`;

  const useBody = () => `<div class="ds-proposed"><div class="pm-card3">
    <h5>Who is around</h5>
    <div class="sdk-person"><span class="sdk-avatar-stack" role="group" aria-label="Ana, Ben and Cleo are here">${[0, 1, 2].map((i) => av(0, { person: NAMES[i], tint: true })).join('')}<span class="sdk-badge-micro" aria-hidden="true">3</span><span class="visually-hidden">and 3 more</span></span><span class="sdk-presence-word">6 people are in the space</span></div></div>
    <div class="pm-card3" style="margin-top:12px"><h5>Members</h5><div class="pm-members">
      ${[0, 1, 2, 3].map((i) => `<div><span class="sdk-photo sdk-photo-72">${i % 2 ? fa('user') : `<img src="${PICS[i]}" alt="">`}${i < 2 ? `<span class="sdk-presence" data-state="${i ? 'away' : 'online'}" role="img" aria-label="${i ? 'Away' : 'Online'}" title="${i ? 'Away' : 'Online'}"></span>` : ''}</span><span>${NAMES[i][0].split(' ')[0]}</span></div>`).join('')}</div></div>
    <div class="pm-card3" style="margin-top:12px"><h5>Chat</h5><div class="pm-list">
      <div class="pm-msg">${av(0, { person: NAMES[0], kind: 'photo', pic: 0, state: 'Online' })}<div><b>Ana</b> <small>09:41</small><p>Booked the table for eight.</p></div></div>
      <div class="pm-msg">${av(0, { person: NAMES[1], tint: true })}<div><b>Ben</b> <small>09:43</small><p>Great, I will bring the tickets.</p></div></div>
      <div class="pm-link"><span class="sdk-photo sdk-photo-72"><img src="${PICS[2]}" alt="" aria-hidden="true"></span><div><b>Trattoria da Luca</b><span>A table for eight, Friday at seven.</span></div></div></div></div>
    <div class="pm-card3" style="margin-top:12px"><h5>In the call</h5><div class="pm-call">
      ${[0, 1, 2].map((i) => `<div>${av(0, { size: 64, person: NAMES[i], kind: i === 0 ? 'photo' : '', tint: i > 0, pic: i })}<span>${NAMES[i][0].split(' ')[0]}</span></div>`).join('')}</div></div></div>`;

  const CT_ROWS = [
    ['Initials on the default fill', '--text', '--bg-section', 4.5],
    ['Icon (--text-dim) on the default fill', '--text-dim', '--bg-section', 3],
    ['Away dot (--text-dim) on the panel ring', '--text-dim', '--bg-section', 3],
    ['Online dot (--ok-mark) on the panel ring', '--ok-mark', '--bg-section', 3],
    ['Online dot (--ok-mark) on the page ring', '--ok-mark', '--bg', 3],
    ['Online dot (--ok-mark) on a card ring', '--ok-mark', '--bg-card', 3],
  ];
  const contrastBody = () => `<div class="ds-proposed"><table class="pm-ct"><thead><tr><th>Pair</th><th>Colours</th><th>Ratio</th><th>Looked for</th><th></th></tr></thead><tbody>${CT_ROWS.map((r) => `<tr data-fg="${r[1]}" data-bg="${r[2]}" data-min="${r[3]}"><td>${r[0]}</td><td><code>${r[1]}</code> on <code>${r[2]}</code></td><td class="pm-n" data-out="r"></td><td class="pm-n">${r[3]}:1</td><td data-out="p"></td></tr>`).join('')}</tbody></table>
    <p class="pm-sub" style="margin:12px 0 4px">The letters of a tinted avatar (the tone 40% into the text, on the tone 18% into the panel), measured on the avatars in the sizes frame:</p>
    <table class="pm-ct" id="av-tints"><thead><tr><th>Tint</th><th>Ratio</th><th>Looked for</th><th></th></tr></thead><tbody></tbody></table></div>`;
  const measureContrast = (doc) => {
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1; const g = cv.getContext('2d', { willReadFrequently: true });
    const host = doc.querySelector('.ds-proposed');
    const px = (c) => { g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillStyle = c; g.fillRect(0, 0, 1, 1); const d = g.getImageData(0, 0, 1, 1).data; return [d[0], d[1], d[2]]; };
    const tok = (n) => { const p = doc.createElement('span'); p.style.color = `var(${n})`; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return px(c); };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (c) => 0.2126 * lin(c[0]) + 0.7152 * lin(c[1]) + 0.0722 * lin(c[2]);
    const rr = (a, b) => { const x = lum(a); const y = lum(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-ct:not(#av-tints) tbody tr')) {
        const r = rr(tok(tr.dataset.fg), tok(tr.dataset.bg)); tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const ok = r >= Number(tr.dataset.min); const p = tr.querySelector('[data-out="p"]'); p.textContent = ok ? 'Passes' : 'Below'; p.className = ok ? 'pm-pass' : 'pm-fail';
      }
      const body = doc.querySelector('#av-tints tbody'); body.innerHTML = '';
      for (const t of ['gold', 'blue', 'green', 'teal', 'purple', 'red', 'orange', 'pink']) {
        const probe = doc.createElement('span'); probe.className = 'sdk-avatar sdk-avatar-40'; probe.dataset.tint = t; probe.textContent = 'A'; host.appendChild(probe);
        const cs = getComputedStyle(probe); const r = rr(px(cs.color), px(cs.backgroundColor)); probe.remove();
        const tr = doc.createElement('tr'); tr.innerHTML = `<td>${t}</td><td class="pm-n" data-av-min="${r.toFixed(2)}">${r.toFixed(2)}:1</td><td class="pm-n">4.5:1</td><td class="${r >= 4.5 ? 'pm-pass' : 'pm-fail'}">${r >= 4.5 ? 'Passes' : 'Below'}</td>`; body.appendChild(tr);
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  function renderAvatars(api) {
    const { mk, h } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="avatars-h"><a href="#avatars">Avatars and portraits</a></h3><span class="ds-status-chip ds-st-approved">Approved</span><span class="ds-count">the circle in six sizes, initials, photo, icon, presence, the who's-around stack, the photo tile</span></header>
<p class="ds-desc"><b>Decided 2026-10-21: approved as drawn.</b> <b>An avatar is always a circle</b>, in sizes <b>20, 24, 32, 40, 64</b> (and <b>96</b>, for editing a profile picture only). <b>Presence</b> is a 7px dot with a 2px ring, never colour alone. <b>A photo in a card is a tile, not an avatar</b>: an image with <code>--radius-medium</code> at 72, 52 or 96px. Stylesheet: <code>proposed-avatars.css</code>, every rule under <code>.ds-proposed</code>.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#avatars-anatomy">Anatomy</a><a href="#avatars-sizes">Sizes and fills</a><a href="#avatars-presence">Presence</a><a href="#avatars-stack">Stack</a><a href="#avatars-tiles">Photo tiles</a><a href="#avatars-use">In use</a><a href="#avatars-widths">Widths</a><a href="#avatars-rules">Usage rules</a><a href="#avatars-map">Today to proposed</a><a href="#avatars-contrast">Contrast</a><a href="#avatars-tokens">Tokens</a><a href="#avatars-markup">Markup contract</a><a href="#avatars-decided">Decided 2026-10-21</a></nav>

<h4 class="ds-h4" id="avatars-anatomy">Anatomy</h4>
${dim([
    ['1 Shape', 'Always a circle: <code>--radius-round</code>. Never a rounded square. Six sizes, no others: <b>20, 24, 32</b> (the default), <b>40, 64</b> and <b>96</b>. 96 is for editing a profile picture only (the profile slot shows it as a tile; see 8). Today there are 22, 26, 32, 34 and 72.'],
    ['2 Initials', 'In the UI font (Figtree), weight 600, about 40% of the diameter, snapped to the type scale: 11px at 20 and 24 (never under 11), 13px at 32, 16px at 40, 28px at 64, 40px at 96. At 20 and 24 one initial shows; from 32 up, two (the second is hidden by the size). Today the initials are 11 or 12px at weight 700 or 600.'],
    ['3 Fill', 'The text colour at 14% over the surface the avatar sits on (<code>--av-surface</code>, the panel by default), or the person\'s tint: the tone at 18% into the surface with the letters the tone pulled 40% toward the text.'],
    ['4 Photo', '<code>object-fit: cover</code>, clipped to the circle. If it fails to load, the initials show; with no name, the icon.'],
    ['5 Fallback icon', '<code>fa-user</code> at half the diameter in <code>--text-dim</code>, for a guest or a person without a name. Today the Stream module falls back to the raw <code>#1a1410</code>; here it is the surface and this icon.'],
    ['6 Presence', 'A 7px dot (<code>--av-dot</code>) with a 2px ring in the surface colour (<code>--av-ring</code>), centred on the circle\'s edge at the lower right. Online is the ok colour as a mark (<code>--ok-mark</code>: the ok status fill, mixed 30% toward the text in the light mode so the dot reaches 3 to 1; the numbers are in Progress); away is <code>--text-dim</code>; offline has no dot. It is never colour alone: the dot has <code>title</code> and <code>aria-label</code> ("Online"), and in a list the word is written.'],
    ['7 Who\'s around', 'A stack with an 8px overlap, each circle ringed in the surface colour. When more people are around than fit, the rest are a <b>micro count</b> (the Chips family\'s 14px badge, 9px number) at the end of the stack over the last circle\'s lower right; the number only, and "and 3 more" in words for a screen reader.'],
    ['8 Photo tile', 'A Home member tile (72px), the chat link image (72px, 52px when narrow) and the profile picture slot (96px) are <b>images in a card, not avatars</b>: <code>--radius-medium</code>, <code>object-fit: cover</code>. The Home tile\'s green-mixed "online" border becomes the presence dot, 8px in from the lower right.'],
  ])}

<h4 class="ds-h4" id="avatars-sizes">Sizes and fills</h4>
<p class="ds-desc">The six sizes with initials, the person's tint, a photo, and the fallback icon. At 20 and 24 one initial shows.</p>
<div data-slot="sizes"></div>

<h4 class="ds-h4" id="avatars-presence">Presence</h4>
<p class="ds-desc">Online (ok), away (dim), offline (no dot) at four sizes, and in a list where the word is written.</p>
<div data-slot="presence"></div>

<h4 class="ds-h4" id="avatars-stack">The who's-around stack</h4>
<div data-slot="stack"></div>

<h4 class="ds-h4" id="avatars-tiles">Photo tiles are not avatars</h4>
<p class="ds-desc">Image tiles in cards keep a corner (<code>--radius-medium</code>); an avatar is round. The last one is a 96px avatar, for comparison.</p>
<div data-slot="tiles"></div>

<h4 class="ds-h4" id="avatars-use">In use</h4>
<p class="ds-desc">Who is around, Home member tiles, chat (an avatar by the message, a link image tile in the message) and a call.</p>
<div data-slot="use"></div>

<h4 class="ds-h4" id="avatars-widths">Widths</h4>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="avatars-rules">Usage rules</h4>
<ul class="ds-desc">
  <li>A person is a circle; a thing (a place, a link, a space) is a tile with a corner. Never mix the two shapes for the same person in one place.</li>
  <li>Pick the nearest size: 20 or 24 in a chip or a dense row, 32 beside a message or a list row, 40 in a header or a menu, 64 in a call tile, 96 only where a picture is edited.</li>
  <li>Presence is a dot with words behind it, never colour alone. In a list write "Online" or "Away"; offline needs no dot.</li>
  <li>A decorative avatar next to the person's name is <code>aria-hidden</code>; an avatar alone is <code>role="img"</code> with the name.</li>
  <li>The initials are the first letters of the first and last name. Under 32px, only the first.</li>
</ul>

<h4 class="ds-h4" id="avatars-map">Today to proposed</h4>
${tbl(['Today', 'Where', 'Proposed'], [
    ['22px round avatar (the chip avatar), initials 11px weight 700', 'chips, the people picker', '24px (the Chips avatar is 22px; the Chips family would move to 24). One size scale.'],
    ['26px avatar', 'rows in the space and the call list', '24px (one step down) or 32px.'],
    ['32px avatar', 'chat, lists', '32px. Unchanged.'],
    ['34px avatar (<code>.dashboard-person img</code>)', 'Who\'s around', '32px.'],
    ['72px Home member tile, a round-rect, with a green-mixed "online" border', 'Home', 'The photo tile, 72px, <code>--radius-medium</code>; the border becomes the presence dot.'],
    ['72px and 52px chat link image, a circle in chat but a round-rect on Home', 'chat links', 'The photo tile, 72px and 52px (a tile with a corner, never a circle).'],
    ['Profile picture slot 96px', 'the profile', 'The photo tile, 96px; the 96px avatar is for the picture being edited.'],
    ['Initials 11px and 12px, weight 700 and 600', 'avatars and chips', 'The type scale: 11px at 20 and 24, 13, 16, 28 and 40px above; weight 600.'],
    ['"Online" is a green colour only (<code>.member.online</code>, <code>.dot.online</code>, <code>.member-toggle.online</code>)', 'Home, the member list', 'A 7px dot in <code>--ok-mark</code> with a title and an aria-label; in lists the word.'],
    ['Stream avatar fallback: the raw <code>#1a1410</code> background', 'Stream', 'The surface fill and <code>fa-user</code>.'],
  ])}

<h4 class="ds-h4" id="avatars-contrast">Contrast</h4>
<p class="ds-desc">Worked out by this page, in the mode on show. Letters need 4.5 to 1; the icon and the dots need 3 to 1.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="avatars-tokens">Tokens</h4>
${tbl(['Token', 'Use here', ''], [
    ['<code>--av</code>, <code>--av-font</code>', 'The diameter and the initials size, set by the size class.', 'new'],
    ['<code>--av-surface</code>, <code>--av-ring</code>', 'The surface behind the avatar (the panel by default) and the colour of the ring around a dot or a stack circle. A consumer on a card sets both.', 'new'],
    ['<code>--av-fill</code>', 'The text at 14% over the surface.', 'new'],
    ['<code>--av-dot</code>, <code>--av-ring-w</code>, <code>--av-overlap</code>', 'The presence dot 7px, its ring 2px, the stack overlap -8px.', 'new'],
    ['<code>--tone</code> (data)', 'A person\'s tint, from <code>data-tint</code>.', 'data'],
    ['<code>--ok-mark</code>, <code>--text-dim</code>', 'Online and away.', 'exists'],
    ['<code>--radius-round</code>, <code>--radius-medium</code>', 'The circle; the photo tile.', 'exists'],
  ])}

<h4 class="ds-h4" id="avatars-markup">Markup contract</h4>
${code(`<!-- an avatar by a name: decorative -->
<span class="sdk-avatar" data-tint="gold" aria-hidden="true"><span class="sdk-avatar-ini">A</span><span class="sdk-avatar-ini2">B</span></span>

<!-- alone: named; with presence -->
<span class="sdk-avatar sdk-avatar-40" role="img" aria-label="Ana Berg, Online"><img src="/people/ana.jpg" alt="">
  <span class="sdk-presence" data-state="online" role="img" aria-label="Online" title="Online"></span></span>

<!-- no name, no photo -->
<span class="sdk-avatar" aria-hidden="true"><i class="fa-solid fa-user"></i></span>

<!-- the who's-around stack, and the rest as a micro count -->
<span class="sdk-avatar-stack" role="group" aria-label="Ana, Ben, Cleo and 3 more are here">
  <span class="sdk-avatar" aria-hidden="true">...</span><span class="sdk-avatar" aria-hidden="true">...</span><span class="sdk-avatar" aria-hidden="true">...</span>
  <span class="sdk-badge-micro" aria-hidden="true">3</span><span class="visually-hidden">and 3 more</span></span>

<!-- a photo tile (not an avatar) -->
<span class="sdk-photo sdk-photo-72"><img src="/people/ana.jpg" alt="Ana Berg">
  <span class="sdk-presence" data-state="online" role="img" aria-label="Online" title="Online"></span></span>`)}
<p class="ds-desc"><b>Names kept.</b> New classes only; the present avatar classes are replaced where they are drawn (the people chip's <code>.sdk-chip-avatar</code> stays the Chips family's). Set <code>--av-surface</code> and <code>--av-ring</code> on the card an avatar sits in, so the fill and the rings follow it.</p>

<h4 class="ds-h4" id="avatars-decided">Decided 2026-10-21</h4>
<p class="ds-desc">Thomas approved every choice below, as drawn, on 2026-10-21.</p>
${tbl(["Decided as drawn","What"], [
    ["Initials","Snapped to the type scale; the second initial is hidden at 20 and 24px."],
    ["The stack \"+N\"","A micro count, digits only."],
    ["Presence","The online dot uses <code>--ok-mark</code> (3 to 1 in all three themes, both modes)."],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + AV_CSS }, o || {}));
    slot('sizes').appendChild(F(sizesBody(), 'Avatars, sizes and fills'));
    slot('presence').appendChild(F(presenceBody(), 'Avatars, presence'));
    slot('stack').appendChild(F(stackBody(), 'Avatars, the stack'));
    slot('tiles').appendChild(F(tileBody(), 'Avatars, photo tiles'));
    slot('use').appendChild(F(useBody(), 'Avatars, in use'));
    slot('contrast').appendChild(F(contrastBody(), 'Avatars, contrast', { onload: measureContrast }));
    const ws = mk('div', '');
    for (const w of [390, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(useBody(), `Avatars at ${w}`, { pinWidth: w }));
    }
    slot('widths').appendChild(ws);
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'avatars', covers: ['avatar', 'portrait', 'presence', 'photo-tile', 'whos-around'], group: 'Controls', name: 'Avatars and portraits', status: 'approved',
    words: 'avatars avatar portraits portrait initials photo presence online away dot ring who\'s around stack tile member tile profile picture circle fa-user sdk-avatar sdk-presence sdk-photo', render: renderAvatars,
  });
})();
