/*
 * check-design-system-colour.mjs -- the Colour foundation of the proposed design system page (public/design-system/proposed-colour.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (files) and browserChecks (colourProbe, run in the browser, at each width and mode).
 *
 * Fails on: a rule in proposed-colour.css not under .ds-colour; a literal colour, a coloured border or an unknown variable in the rules of the
 * mock screen (.cm-*), which may use only the proposed roles and the radius tokens; a mock part (data-roles) naming a role that does not exist,
 * or a role the mock's rules use that no part names (the highlight would miss it); a stylesheet or script missing from the snapshot, or
 * loaded by Today's page; in the browser: the board not listing every role once with its hex, a contrast number that does not match a
 * recomputation from the hexes shown, a derived role that is not computed from its bases (changing the base Panel must move the panel, the menu,
 * the card, the toast and the popover as their formulas say, and nothing that does not depend on it), a derived role that cannot be set on its
 * own, a flash on a role that did not change, a highlight that does not follow hover or focus, a click on the board or on the mock, or Escape,
 * a border on one side only, a coloured border (accent or status), an outline or stroke in the highlight, and each theme's bases not matching
 * server/store.js.
 */
import fs from 'node:fs';
import path from 'node:path';

export const id = 'colour';
export const ownRules = true; // the Colour rules are under .ds-colour, not .ds-proposed: this file checks them, the runner does not
export const todayOnly = [];

export function staticChecks({ DS, snapNames, todayHtml, manifestText, fail }) { colourStatic({ DS, snapNames, todayHtml, manifestText, fail }); }

export async function browserChecks({ ev, where, problems }) {
  const cp = JSON.parse(await ev(`(${colourProbe.toString()})().then((r) => JSON.stringify(r))`));
  for (const x of cp.problems) problems.push(`${where}: Colour: ${x}`);
}

export function colourStatic({ DS, snapNames, todayHtml, manifestText, fail }) {
  const cssPath = path.join(DS, 'proposed-colour.css'); const jsPath = path.join(DS, 'proposed-colour.js');
  if (!fs.existsSync(cssPath) || !fs.existsSync(jsPath)) { fail('proposed-colour.css or proposed-colour.js is missing'); return; }
  for (const f of ['proposed-colour.css', 'proposed-colour.js']) {
    if (!snapNames.has(f)) fail(`the proposed snapshot has no ${f}`);
    if (!manifestText.includes(f)) fail(`proposed-families.json does not name ${f}`);
    if (todayHtml.includes(f)) fail(`index.html (Today) loads ${f}`);
  }
  const css = fs.readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const js = fs.readFileSync(jsPath, 'utf8');
  const ROLE = /^(surface|text|edge|fill|status|icon|accent|focus|overlay|shadow|scrollbar|tint)-/;
  const used = new Set();
  // Rules: every selector under .ds-colour; the mock's rules (.cm-) use only roles, radius tokens and no literal colour.
  const depthSplit = (t) => { const parts = []; let d = 0; let cur = ''; for (const ch of t) { if (ch === '(' || ch === '[') d += 1; if (ch === ')' || ch === ']') d -= 1; if (ch === ',' && d === 0) { parts.push(cur); cur = ''; } else cur += ch; } parts.push(cur); return parts; };
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)];
  for (const m of rules) {
    const sel = m[1].trim(); const body = m[2];
    if (/^(from|to|\d+%)$/.test(sel) || /^@/.test(sel)) continue;
    for (const part of depthSplit(sel)) if (!/^\.ds-colour\b/.test(part.trim()) && !/^@/.test(part.trim())) fail(`proposed-colour.css: a rule not under .ds-colour: ${part.trim().slice(0, 80)}`);
    const mock = (sel.match(/\.cm[\w-]*/g) || []).some((c) => !['.cm-wrap', '.cm-ov', '.cm-scene'].includes(c)) || /\[data-roles=/.test(sel);
    for (const d of body.split(';')) {
      const i = d.indexOf(':'); if (i < 0) continue;
      const name = d.slice(0, i).trim(); const v = d.slice(i + 1).trim();
      if (/^border(-(top|right|bottom|left))?(-color)?$/.test(name) && /#|rgb|hsl|color-mix/.test(v)) fail(`proposed-colour.css: a literal colour on a border: ${name}: ${v}`);
      if (/^border-(top|right|bottom|left)(-width)?$/.test(name) ) fail(`proposed-colour.css: a one-sided border in ${sel.slice(0, 60)} (no coloured edge strips)`);
      if (/radius/.test(name) && !/^(var\(--radius-(min|small|medium|large|round)\)|0)(\s+(var\(--radius-(min|small|medium|large|round)\)|0))*$/.test(v) && !/^[0 ]+$/.test(v.replace(/var\(--radius-[a-z]+\)/g, ''))) fail(`proposed-colour.css: ${name}: ${v} is not a radius token`);
      if (!mock) continue;
      const noVar = v.replace(/var\(--[a-z-]+\)/g, '');
      if (/#[0-9a-f]{3,8}\b|rgba?\(|hsla?\(|color-mix\(/i.test(noVar) && name !== 'box-shadow') fail(`proposed-colour.css: the mock draws a literal colour: ${sel.slice(0, 50)} { ${name}: ${v} }`);
      for (const x of v.matchAll(/var\(--([a-z-]+)\)/g)) {
        if (/^radius-/.test(x[1])) continue;
        if (!ROLE.test(x[1])) fail(`proposed-colour.css: the mock uses --${x[1]}, which is not a proposed role`);
        used.add(x[1]);
      }
    }
  }
  const named = new Set([...js.matchAll(/data-roles="([^"]*)"/g)].flatMap((m) => m[1].match(/[a-z]+(?:-[a-z]+)+/g) || []));
  // the generated parts (status banners, tints) are named by a template in the script
  for (const k of ['danger', 'ok', 'warn', 'info']) for (const r of [`status-${k}-tint`, `status-${k}-text`, `status-${k}-fill`, `status-${k}-on-fill`]) named.add(r);
  for (const k of ['gold', 'blue', 'green', 'teal', 'purple', 'red', 'orange', 'pink']) named.add(`tint-${k}`);
  for (const r of used) if (!named.has(r)) fail(`proposed-colour.css: the mock uses --${r} but no part names it in data-roles, so the highlight would miss it`);
}

// Runs in the browser (stringified by the caller). Returns { problems }.
export const colourProbe = async () => {
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const C = window.__dsColour; const D = document;
  if (!C) { bad('the Colour family did not draw (no window.__dsColour)'); return out; }
  const scope = D.getElementById('colour-scope'); const board = D.getElementById('cb-board'); const wrap = D.getElementById('cm-wrap');
  const R = C.roles; const st = C.state;
  const hex = (c) => '#' + [c.r, c.g, c.b].map((n) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0')).join('');
  const rgb = (x) => { const n = parseInt(x.slice(1), 16); return { r: n >> 16, g: (n >> 8) & 255, b: n & 255 }; };
  const lin = (v) => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
  const L = (c) => 0.2126 * lin(c.r) + 0.7152 * lin(c.g) + 0.0722 * lin(c.b);
  const ratioOf = (a, b) => { const x = L(a); const y = L(b); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
  const mix = (a, pa, b) => ({ r: a.r * pa + b.r * (1 - pa), g: a.g * pa + b.g * (1 - pa), b: a.b * pa + b.b * (1 - pa) });
  const near = (a, b, tol) => Math.abs(a.r - b.r) <= tol && Math.abs(a.g - b.g) <= tol && Math.abs(a.b - b.b) <= tol;
  const val = (id) => st.vals[id];

  // Calming Teal, light (decided 2026-10-21: keep the teal): the auto-picked text on the teal fill and the teal as text reach 4.5 to 1, worked out from the theme's own
  // colours and checked again here; the accent as a mark is shown as the warning (under 3 to 1), not hidden.
  { const T = C.themes.teal.light; const tb = D.getElementById('cx-teal-table'); if (!D.getElementById('colour-teal') || !tb) bad('the Colour family has no Calming Teal, light section');
    else {
      const num = (k) => parseFloat((tb.querySelector('[data-teal="' + k + '"]') || { textContent: 'NaN' }).textContent);
      const acc = rgb(T.accent); const pg = rgb(T.bg); const pn = rgb(T.bgSection);
      const onFill = Math.max(ratioOf(rgb('#ffffff'), acc), ratioOf(rgb('#0a0a0a'), acc));
      if (Math.abs(num('on') - onFill) > 0.01 || onFill < 4.5) bad('the text on the teal fill is shown as ' + num('on') + ', worked out ' + onFill.toFixed(2) + ' (needs 4.5)');
      if (num('text') < 4.5) bad('the teal as text is shown at ' + num('text') + ', under 4.5');
      if (!(num('mix') > 0 && num('mix') <= 100)) bad('the teal-as-text mix is not shown');
      const mark = ratioOf(acc, pg);
      if (Math.abs(num('page') - mark) > 0.01 || mark >= 3) bad('the accent on the page is shown as ' + num('page') + ', worked out ' + mark.toFixed(2) + ' (expected under 3)');
      if (T.accent !== '#0dc9ca') bad('the Calming Teal accent changed (' + T.accent + '); the decision is to keep it');
      if (!/Accent on page \(bars, rings\)/.test((tb.nextElementSibling || tb).textContent)) bad('the teal accent is not flagged with the theme editor warning');
    } }
  // the board lists every role once, with a computed colour; base and derived are told apart
  const sws = [...board.querySelectorAll('.cb-sw')];
  if (sws.length !== R.length) bad(`the board has ${sws.length} swatches for ${R.length} roles`);
  for (const r of R) {
    const sw = board.querySelector(`.cb-sw[data-role="${r.id}"]`);
    if (!sw) { bad(`the board has no swatch for --${r.id}`); continue; }
    const t = sw.querySelector('.cb-hex').dataset.value || '';
    if (!/^#[0-9a-f]{6}$/.test(t)) bad(`--${r.id} shows no hex value (${t})`);
    const tag = sw.querySelector('.cb-tag').textContent;
    const want = r.base ? 'base' : r.kept ? 'kept' : 'derived';
    if (!tag.startsWith(want)) bad(`--${r.id} is labelled "${tag}", expected ${want}`);
    if (!r.base && !r.kept && !/^= /.test(sw.querySelector('.cb-how').textContent)) bad(`--${r.id} shows no formula in words`);
  }
  if (R.filter((r) => r.base && !r.optional).length !== 7) bad('there are not 7 base roles');
  if (R.filter((r) => !r.base && !r.kept).length < 40) bad('fewer than 40 derived roles');

  // contrast: every number on the board matches a recomputation from the two hexes it shows
  const pairs = [...board.querySelectorAll('.cb-pair')];
  if (pairs.length < 40) bad(`only ${pairs.length} contrast figures on the board`);
  for (const p of pairs) {
    const want = ratioOf(rgb(p.dataset.fg), rgb(p.dataset.bg));
    if (Math.abs(want - Number(p.dataset.ratio)) > 0.08) bad(`a contrast figure reads ${p.dataset.ratio} but ${p.dataset.fg} on ${p.dataset.bg} is ${want.toFixed(2)}`);
    const min = Number(p.dataset.min);
    if (min && String(Number(p.dataset.ratio) >= min) !== p.dataset.pass && Math.abs(want - min) > 0.08) bad(`a contrast figure ${p.dataset.ratio} against ${min} is marked ${p.dataset.pass}`);
  }

  // each theme's bases are the product's (server/store.js): the page shows them
  for (const [k, t] of Object.entries(C.themes)) {
    D.querySelector(`#cx-theme [data-theme="${k}"]`).click();
    for (const m of ['dark', 'light']) {
      if (st.mode !== m) { window.__ds.setMode(m); await wait(60); }
      const exp = t[m];
      const got = { 'surface-page': exp.bg, 'surface-panel': exp.bgSection, 'text-primary': exp.text, 'text-muted': exp.textDim, 'edge-hairline': exp.border, 'accent-fill': exp.accent, 'text-on-accent': exp.onAccent };
      for (const [id, e] of Object.entries(got)) if (hex(val(id)) !== e) bad(`${t.name} ${m}: --${id} is ${hex(val(id))}, the theme says ${e}`);
    }
  }
  D.querySelector('#cx-theme [data-theme="coffee"]').click();
  await wait(30);

  // the derived roles are computed from the bases: change the base Panel, and only what depends on it moves, each by its own formula
  const before = {}; for (const r of R) before[r.id] = hex(val(r.id));
  const keep = hex(val('surface-panel'));
  C.setBase('surface-panel', '#336699');
  const P = rgb('#336699'); const T = val('text-primary');
  if (hex(val('surface-panel')) !== '#336699') bad('the base Panel did not set --surface-panel');
  const chk = (id, want, tol) => { if (!near(val(id), want, tol)) bad(`--${id} is ${hex(val(id))} after the Panel changed, the formula gives ${hex(want)}`); };
  chk('surface-card', mix(P, 0.92, T), 2); chk('surface-menu', mix(P, 0.96, T), 2); chk('surface-popover', mix(P, 0.96, T), 2); chk('surface-toast', mix(P, 0.92, T), 2);
  chk('fill-secondary', mix(P, 0.92, T), 2);
  if (hex(val('surface-menu')) === hex(val('surface-card'))) bad('the menu and the card are the same colour: they must be separate formulas');
  for (const id of ['surface-field', 'surface-page', 'accent-fill', 'fill-selected', 'surface-bar-top', 'surface-titlebar', 'edge-field']) if (hex(val(id)) !== before[id]) bad(`--${id} moved when only the Panel changed`);
  const flashed = [...board.querySelectorAll('.cb-sw.flash')].map((s) => s.dataset.role);
  const moved = R.filter((r) => hex(val(r.id)) !== before[r.id]).map((r) => r.id);
  for (const id of flashed) if (!moved.includes(id)) bad(`--${id} flashed but did not change`);
  for (const id of moved) if (!flashed.includes(id)) bad(`--${id} changed and did not flash`);
  // a derived role can be set on its own, and then the base no longer moves it
  scope.style.setProperty('--surface-menu', '#ff0000'); C.apply(false);
  const card1 = hex(val('surface-card')); C.setBase('surface-panel', '#884422');
  if (hex(val('surface-menu')) !== '#ff0000') bad('a derived role set on its own (--surface-menu) still followed the Panel');
  if (hex(val('surface-card')) === card1) bad('the card did not follow the Panel after the menu was set on its own');
  scope.style.removeProperty('--surface-menu');
  D.getElementById('cp-reset').click();
  if (hex(val('surface-panel')) !== keep) bad(`Reset did not restore the Panel (${hex(val('surface-panel'))} not ${keep})`);
  // the accent: primary, progress, badge and the follow-through roles move; the panel and the card do not
  const b2 = {}; for (const r of R) b2[r.id] = hex(val(r.id));
  C.setBase('accent-fill', '#2266dd');
  for (const id of ['accent-fill', 'accent-fill-hover', 'fill-selected', 'fill-today', 'text-link', 'focus-ring', 'text-selected', 'surface-chat-own']) if (hex(val(id)) === b2[id]) bad(`--${id} did not follow the Accent`);
  for (const id of ['surface-panel', 'surface-card', 'surface-menu', 'surface-toast', 'text-primary', 'fill-hover']) if (hex(val(id)) !== b2[id]) bad(`--${id} moved when only the Accent changed`);
  // the contrast warning and its fix: a text colour with the accent that fails, then the button that picks dark or white
  C.setBase('text-on-accent', '#2266dd');
  const warn = D.getElementById('cp-warn'); const fix = D.getElementById('cp-fix');
  if (!fix || !/Text on accent/.test(warn.textContent)) bad('the Accent with a text of its own colour shows no warning and no auto-fix button');
  else { fix.click(); const r = ratioOf(rgb(hex(val('text-on-accent'))), rgb(hex(val('accent-fill')))); if (r < 4.5) bad(`the auto-fix left the text on accent at ${r.toFixed(2)}`); if (D.getElementById('cp-fix')) bad('the warning stayed after the auto-fix'); }
  D.getElementById('cp-reset').click();
  if (!/^\{[\s\S]*"light"[\s\S]*"dark"[\s\S]*\}$/.test((D.getElementById('cp-copy').click(), D.querySelector('#cp-json textarea').value))) bad('Copy as theme JSON gives no light and dark sets');

  // the automatic picks, in the three shipped themes and both modes: text on a status fill (white or near-black, 4.5:1), accent as text (link) and
  // status text (4.5:1 on the page, on a panel and, for status text, on its own tint), and the scrollbar thumb against its track (3:1)
  const flatOf = (id, ov) => C.state.flatOf(id, ov);
  const SK = ['danger', 'ok', 'warn', 'info'];
  const tested = [];
  for (const k of Object.keys(C.themes)) {
    D.querySelector(`#cx-theme [data-theme="${k}"]`).click();
    for (const m of ['dark', 'light']) {
      if (st.mode !== m) { window.__ds.setMode(m); await wait(60); }
      const tn = `${C.themes[k].name} ${m}`;
      for (const s of SK) {
        const fill = flatOf(`status-${s}-fill`); const on = flatOf(`status-${s}-on-fill`);
        const r = ratioOf(on, fill);
        if (r < 4.5) bad(`${tn}: --status-${s}-on-fill is ${r.toFixed(2)} : 1 on its fill, needs 4.5`);
        const hx = hex(on); if (hx !== '#ffffff' && hx !== '#0a0a0a') bad(`${tn}: --status-${s}-on-fill is ${hx}, not white or near-black`);
        const best = Math.max(ratioOf({ r: 255, g: 255, b: 255 }, fill), ratioOf({ r: 10, g: 10, b: 10 }, fill));
        if (Math.abs(r - best) > 0.01) bad(`${tn}: --status-${s}-on-fill (${r.toFixed(2)}) is not the better of white and near-black (${best.toFixed(2)})`);
        const tx = flatOf(`status-${s}-text`); const tint = flatOf(`status-${s}-tint`);
        for (const [bg, n] of [[flatOf('surface-page'), 'the page'], [flatOf('surface-panel'), 'a panel'], [tint, 'its tint']]) { const q = ratioOf(tx, bg); if (q < 4.5) bad(`${tn}: --status-${s}-text is ${q.toFixed(2)} : 1 on ${n}, needs 4.5`); }
      }
      for (const [role, n] of [['text-accent', 'accent as text'], ['text-link', 'link']]) for (const [bg, bn] of [[flatOf('surface-page'), 'the page'], [flatOf('surface-panel'), 'a panel']]) { const q = ratioOf(flatOf(role), bg); if (q < 4.5) bad(`${tn}: ${n} (--${role}) is ${q.toFixed(2)} : 1 on ${bn}, needs 4.5`); }
      if (hex(val('text-link')) !== hex(val('text-accent'))) bad(`${tn}: --text-link is not the accent-as-text role`);
      const th = ratioOf(flatOf('scrollbar-thumb'), flatOf('surface-track')); if (th < 3) bad(`${tn}: the scrollbar thumb is ${th.toFixed(2)} : 1 on its track, needs 3`);
      tested.push(tn);
    }
  }
  if (tested.length !== 6) bad(`the auto-picks were checked in ${tested.length} theme and mode sets, expected 6`);
  D.querySelector('#cx-theme [data-theme="coffee"]').click(); await wait(30);
  // the playground: a status colour change re-picks its text on fill and flashes it; the board shows the new pick
  D.getElementById('cp-reset').click();
  const dangerOn0 = hex(val('status-danger-on-fill'));
  C.setBase('status-danger-fill', '#f2e08a');
  const dangerOn1 = hex(val('status-danger-on-fill'));
  if (dangerOn0 === dangerOn1) bad(`a light Danger fill did not re-pick its text (still ${dangerOn1})`);
  if (ratioOf(rgb(dangerOn1), rgb('#f2e08a')) < 4.5) bad('the text re-picked for a light Danger fill does not reach 4.5');
  if (!board.querySelector('.cb-sw[data-role="status-danger-on-fill"].flash')) bad('the re-picked text on the Danger fill did not flash');
  if (board.querySelector('.cb-sw[data-role="status-ok-on-fill"].flash')) bad('the text on the OK fill flashed when only the Danger fill changed');
  C.setBase('status-danger-fill', '#8a2b1e');
  if (hex(val('status-danger-on-fill')) !== '#ffffff') bad('a dark Danger fill did not give white text');
  // a fill that neither white nor near-black reaches 4.5 on is flagged, on the board and in the warnings
  C.setBase('status-info-fill', '#787878');
  if (!/flagged/.test(board.querySelector('[data-pairs="status-info-fill"]').textContent) || !/flagged/.test(D.getElementById('cp-warn').textContent)) bad('a fill that neither white nor near-black reaches 4.5 on is not flagged');
  C.setBase('status-info-fill', '#ffffff'); if (/flagged/.test(board.querySelector('[data-pairs="status-info-fill"]').textContent)) bad('a white Info fill is flagged: near-black reaches 4.5 on it');
  // the accent re-picks link text: a pale accent on a white page gets the darker mix, never a failing link
  C.setBase('accent-fill', '#0dc9ca');
  if (ratioOf(rgb(hex(val('text-link'))), rgb(hex(flatOf('surface-page')))) < 4.5) bad('a pale accent gave link text under 4.5');
  D.getElementById('cp-reset').click();
  // the field edge is an accepted exception, shown as one
  if (!/Accepted exception/.test(board.querySelector('[data-pairs="edge-field"]').textContent)) bad('the field edge does not show its accepted exception to the 3:1 target');

  // the highlight: a role picked on the board marks its parts and dims the rest, with no outline or stroke; Escape clears; a click on the mock selects
  const host = D.getElementById('cm-ov');
  C.setPreview('surface-panel');
  const svg = host.querySelector('svg');
  if (!svg || !wrap.classList.contains('hl')) bad('hovering a role does not highlight the mock');
  else {
    if (svg.querySelectorAll('mask').length < 3) bad('the highlight has no dim and hatch layers');
    if (svg.querySelector('[stroke]') || svg.querySelector('[style*="stroke"]') || svg.querySelector('[style*="outline"]')) bad('the highlight draws a stroke or an outline');
    if (!/Side panel/.test(D.getElementById('cd').textContent)) bad('the "what does this role drive" list does not name the side panel for --surface-panel');
  }
  C.setPreview(null);
  if (host.querySelector('svg')) bad('the highlight stayed after the pointer left');
  const sw = board.querySelector('.cb-sw[data-role="accent-fill"]'); sw.focus();
  await wait(50);
  if (st.preview !== 'accent-fill') bad('focusing a role on the board does not highlight it');
  sw.blur(); await wait(30);
  sw.click();
  if (st.sel !== 'accent-fill' || sw.getAttribute('aria-pressed') !== 'true') bad('clicking a role does not select it');
  const dn = D.getElementById('cd').textContent;
  if (!/Primary button/.test(dn) || !/Progress fill/.test(dn) || !/Badge/.test(dn)) bad('--accent-fill does not list the primary button, the progress fill and the badge');
  if (!/Link/.test(dn) || !/Selected tab/.test(dn)) bad('--accent-fill does not list the link and the selected tab as following it');
  D.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  if (st.sel || host.querySelector('svg')) bad('Escape does not clear the highlight');
  D.querySelector('.cm-card').click();
  if (st.sel !== 'surface-card') bad(`clicking the card in the mock selected ${st.sel}, not --surface-card`);
  if (!board.querySelector('.cb-sw[data-role="surface-card"][aria-pressed="true"]')) bad('the clicked mock part is not selected in the board');
  D.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  // every part of the mock names roles that exist
  const ids = new Set(R.map((r) => r.id));
  for (const el of D.querySelectorAll('.cm [data-roles]')) for (const x of el.dataset.roles.split(/\s+/)) if (!ids.has(x)) bad(`a mock part names --${x}, which is not a role`);
  for (const r of R) if (!r.unseen && !r.kept && !D.querySelector(`.cm [data-roles~="${r.id}"]`) && !C.follow(r.id).size) bad(`--${r.id} is in no part of the mock and drives no other role`);

  // no coloured edge: borders are all four sides or none; none is the accent or a status colour; the mock draws no outline
  const hot = ['accent-fill', 'status-danger-fill', 'status-ok-fill', 'status-warn-fill', 'status-info-fill'].map((id) => { const c = val(id); return `rgb(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)})`; });
  for (const el of scope.querySelectorAll('*')) {
    const cs = getComputedStyle(el);
    const w = ['Top', 'Right', 'Bottom', 'Left'].map((s) => parseFloat(cs['border' + s + 'Width']) * (cs['border' + s + 'Style'] === 'none' ? 0 : 1));
    if (w.some((x) => x > 0)) {
      const cols = ['Top', 'Right', 'Bottom', 'Left'].map((s) => cs['border' + s + 'Color']);
      if (w.some((x) => x !== w[0]) || cols.some((c) => c !== cols[0])) bad(`an element has a border on some sides only: ${el.className}`);
      else if (hot.includes(cols[0])) bad(`an element has an accent or status coloured border: ${el.className}`);
    }
    if (wrap.contains(el) && el.tagName !== 'svg' && cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) bad(`an element in the mock has an outline: ${el.className}`);
  }
  return out;
};
