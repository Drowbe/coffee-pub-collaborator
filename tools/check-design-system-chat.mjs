/*
 * check-design-system-chat.mjs -- the Chat family (the message and the composer) of the proposed design system page (public/design-system/proposed-chat.js and .css).
 * Not run on its own: tools/check-design-system.mjs calls staticChecks (the rules) and browserChecks (in the browser, at each width and mode).
 *
 * Fails on: a message fill that is not 5% text (others) or 10% accent (own), a message with any edge or a tint anywhere but the portrait (the 3px left bar is gone), a name
 * that is not 12px weight 600, a time that is not 11px, a body that is not 14px, a portrait that is not 22px, a quote with a rule instead of a nested fill, a reaction that
 * is not a 24px Chips tag (selected = --selected-bg), an object card or link box that is not the approved card (a 1px --border hairline on all four sides, no shadow,
 * padding 12; the link photo 72px, 52px on a phone), a hover slot that is shown at rest, a "..." that is not the 30px Quiet small icon button, a composer field that is not the
 * Fields text area (field step, hairline, small corner, 38px or 44px on a phone, 16px words on a phone), a field that grows past five lines or does not scroll, a Send button, a
 * format button that is not 30px (on = --selected-bg), a command menu that is not the Menus popover above the field, a composer that does not do what the live example says (Enter
 * sends, Shift+Enter does not, five lines at most, "/" opens the commands, the arrows, Enter and Escape work), a status line without its polite live regions, a count or dot that
 * is not the Chips size (18px count, 14px micro count with 9px numbers and a 3px inset, 7px dot), a weight other than 400, 500 and 600 or text under 11px (the micro count
 * excepted) in the family, a coloured one-sided edge or thin coloured block, a contrast pair under its minimum, an alias that does not look like the new name, a frame
 * that scrolls sideways, the family not marked Proposed, the undecided name still listed; in the stylesheet: a hex colour, a gradient, a colour written out, a shadow other
 * than none and --shadow-2, a side border other than the divider, a weight over 600, a font size under 11px, a name not defined.
 */
export const id = 'chat';
export const todayOnly = [];

export function staticChecks({ fail, css, js, defined }) {
  if (/#[0-9a-f]{3,8}\b/i.test(css)) fail('proposed-chat.css: a hex colour (tokens only)');
  if (/gradient\(/.test(css)) fail('proposed-chat.css: a gradient');
  if (/rgba?\(/.test(css)) fail('proposed-chat.css: a colour written out (tokens only)');
  for (const m of css.matchAll(/box-shadow\s*:\s*([^;]+);/g)) if (!/^(none|var\(--shadow-2\))$/.test(m[1].trim())) fail(`proposed-chat.css: box-shadow ${m[1].trim()} (only none, and --shadow-2 on the popovers)`);
  for (const m of css.matchAll(/border-(left|right|top|bottom)\s*:\s*([^;]+);/g)) {
    if (/left|right/.test(m[1])) fail(`proposed-chat.css: border-${m[1]} (a side edge is a bar)`);
    else if (!/^(1px solid var\(--border\)|0)$/.test(m[2].trim())) fail(`proposed-chat.css: border-${m[1]}: ${m[2].trim()} (only the 1px --border divider)`);
  }
  for (const m of css.matchAll(/font-weight\s*:\s*(\d+)/g)) if (Number(m[1]) > 600) fail(`proposed-chat.css: font-weight ${m[1]} (the weights are 400, 500 and 600)`);
  for (const m of css.matchAll(/font-size\s*:\s*(\d+)px/g)) if (Number(m[1]) < 11) fail(`proposed-chat.css: font-size ${m[1]}px (nothing under 11px)`);
  if (!/--msg-fill:\s*color-mix\(in srgb, var\(--text\) 5%, transparent\)/.test(css) || !/--msg-fill-own:\s*color-mix\(in srgb, var\(--accent\) 10%, transparent\)/.test(css)) fail('proposed-chat.css: the message fills are not 5% text and 10% accent');
  if (/\[data-tint\][^{]*\{[^}]*\b(border|background)\b/.test(css.replace(/:is\(\.sdk-message, \.message\)\[data-tint\] :is\(\.sdk-message-portrait[^{]*\{[^}]*\}/, ''))) fail('proposed-chat.css: a [data-tint] rule draws a border or a fill other than on the portrait');
  for (const c of ['sdk-messages', 'sdk-message', 'sdk-message-head', 'sdk-message-who', 'sdk-message-portrait', 'sdk-message-name', 'sdk-message-command', 'sdk-message-time', 'sdk-message-tools', 'sdk-message-actions', 'sdk-message-body',
    'sdk-message-text', 'sdk-message-quote', 'sdk-message-reactions', 'sdk-react-emoji', 'sdk-linkbox', 'sdk-linkbox-photo', 'sdk-linkbox-text', 'sdk-linkbox-title', 'sdk-linkbox-desc', 'sdk-linkbox-site', 'sdk-linkbox-keep',
    'sdk-composer', 'sdk-composer-field', 'sdk-composer-menu', 'sdk-format-bar', 'sdk-format-side', 'message', 'message-head', 'message-head-side', 'message-portrait', 'message-name', 'message-command', 'message-when', 'message-body',
    'message-quote', 'actions', 'text', 'chat-link', 'chat-link-img', 'chat-link-text', 'chat-link-title', 'chat-link-desc', 'chat-link-site', 'chat-bar', 'chat-format-bar', 'chat-format-side', 'chat-help-popup', 'chat-emoji-popup', 'chat-emoji-btn', 'chat-status']) {
    if (!defined.has(c)) fail(`the proposed stylesheets do not define the chat name .${c} (a new name or a kept alias)`);
  }
  if (!/ds-st-proposed/.test(js) || /ds-st-approved/.test(js)) fail('proposed-chat.js: the family is not marked Proposed');
  if (/class="[^"]*\bsend\b/i.test(js) || /aria-label="Send"/.test(js)) fail('proposed-chat.js: a Send button is drawn (Enter sends)');
}

export async function browserChecks(b) {
  const { ev, problems, where } = b;
  const cp = JSON.parse(await ev(`(${probe.toString()})()`));
  for (const x of cp.problems) problems.push(`${where}: ${x}`);
}

// Measured in the page (runs in the browser).
const probe = async () => {
  const F = window.__ds.frames; const get = (t) => { const f = F.find((x) => x.iframe.title === t); return f && f.iframe.contentDocument; };
  const out = { problems: [] }; const bad = (m) => out.problems.push(m);
  const wait = (ms) => new Promise((r) => setTimeout(r, ms));
  const TITLES = F.map((x) => x.iframe.title).filter((t) => /^Chat/.test(t));
  if (TITLES.length < 12) bad(`the Chat family has only ${TITLES.length} frames`);
  await wait(100);
  const tok = (d, expr, prop) => { const host = d.querySelector('.ds-proposed'); const p = d.createElement('span'); p.style[prop || 'color'] = expr; host.appendChild(p); const c = getComputedStyle(p)[prop || 'color']; p.remove(); return c; };
  const bgTok = (d, n) => tok(d, `var(${n})`, 'backgroundColor');
  const cs = (e, p) => getComputedStyle(e, p);
  const phone = (d) => d.defaultView.innerWidth <= 640;
  const near = (a, b, t) => Math.abs(a - b) <= (t == null ? 0.6 : t);
  const NO_EDGE = ['Top', 'Right', 'Bottom', 'Left'];
  // ---- the message ----
  { const d = get('Chat, message parts'); const ph = phone(d); const msgs = [...d.querySelectorAll('.sdk-message')];
    if (msgs.length < 20) bad(`the message frame shows only ${msgs.length} messages`);
    const others = tok(d, 'color-mix(in srgb, var(--text) 5%, transparent)', 'backgroundColor'); const own = tok(d, 'color-mix(in srgb, var(--accent) 10%, transparent)', 'backgroundColor');
    for (const m of msgs) {
      const c = cs(m); const isOwn = m.classList.contains('own');
      if (c.backgroundColor !== (isOwn ? own : others)) bad(`a message is ${c.backgroundColor}, expected ${isOwn ? 'accent 10%' : 'text 5%'}`);
      for (const s of NO_EDGE) if (c['border' + s + 'Width'] !== '0px') bad(`a message has a ${s.toLowerCase()} edge (the tint is on the portrait only)`);
      if (c.boxShadow !== 'none') bad('a message has a shadow');
      if (c.borderTopLeftRadius !== tok(d, 'var(--radius-medium)', 'borderTopLeftRadius')) bad('a message is not --radius-medium');
      const head = m.querySelector('.sdk-message-head'); if (cs(head).backgroundColor !== 'rgba(0, 0, 0, 0)') bad('a message head has a band');
      if (head.getBoundingClientRect().height < 29.4) bad('a message head is under 30px');
      const pt = m.querySelector('.sdk-message-portrait'); const pr = pt.getBoundingClientRect(); if (!near(pr.width, 22) || !near(pr.height, 22)) bad(`a portrait is ${pr.width} by ${pr.height}, expected 22`);
      if (cs(pt).borderTopLeftRadius !== tok(d, 'var(--radius-round)', 'borderTopLeftRadius')) bad('a portrait is not round');
      const nm = cs(m.querySelector('.sdk-message-name')); if (nm.fontSize !== '12px' || nm.fontWeight !== '600') bad(`a name is ${nm.fontSize} weight ${nm.fontWeight}, expected 12px 600`);
      const tm = cs(m.querySelector('.sdk-message-time')); if (tm.fontSize !== '11px' || tm.fontWeight !== '400') bad(`a time is ${tm.fontSize} weight ${tm.fontWeight}, expected 11px 400`);
      const cmd = m.querySelector('.sdk-message-command'); if (cmd && (cs(cmd).fontSize !== '11px' || cs(cmd).fontWeight !== '600')) bad('a command word is not 11px 600');
      const tx = cs(m.querySelector('.sdk-message-text')); if (tx.fontSize !== '14px') bad(`a message body is ${tx.fontSize}, expected 14px`);
      const more = m.querySelector('.sdk-message-tools .sdk-icon-btn'); const mr = more.getBoundingClientRect(); if (!near(mr.width, 30) || !near(mr.height, 30) || !more.classList.contains('btn-quiet') || !more.classList.contains('btn-small')) bad('the "..." is not the 30px Quiet small icon button');
      if (ph) { const a = cs(more, '::after'); if (a.content === 'none') bad('the phone "..." has no 44px hit area'); }
      // The tint: only the portrait.
      if (m.hasAttribute('data-tint')) {
        const tn = m.getAttribute('data-tint'); const want = tok(d, `color-mix(in srgb, var(--tint-${tn}) 22%, var(--bg-section))`, 'backgroundColor');
        if (cs(pt).backgroundColor !== want) bad(`the ${tn} portrait is ${cs(pt).backgroundColor}, not its 22% tint`);
        if (cs(pt).color !== tok(d, `color-mix(in srgb, var(--tint-${tn}) 62%, var(--text))`)) bad(`the ${tn} portrait icon is not the readable tint mix`);
      } else if (cs(pt).backgroundColor !== tok(d, 'color-mix(in srgb, var(--text) 14%, var(--bg-section))', 'backgroundColor')) bad('a person\'s portrait is not the neutral fill');
    }
    const quote = d.querySelector('.sdk-message-quote'); const qc = cs(quote); const qf = tok(d, 'color-mix(in srgb, var(--text) 7%, transparent)', 'backgroundColor');
    if (qc.backgroundColor !== qf || qc.borderLeftWidth !== '0px' || qc.fontSize !== '12px' || qc.borderTopLeftRadius !== tok(d, 'var(--radius-small)', 'borderTopLeftRadius')) bad(`the quote is ${qc.backgroundColor} with a ${qc.borderLeftWidth} left edge at ${qc.fontSize}, expected a nested fill, no edge, 12px, small corner`);
    const bq = d.querySelector('.sdk-message-text blockquote'); if (!bq || cs(bq).backgroundColor !== qf || cs(bq).borderLeftWidth !== '0px') bad('a block quote in the text is not the nested fill');
    // Reactions: Chips tags.
    const rx = [...d.querySelectorAll('.sdk-message-reactions .sdk-chip-tag')]; if (rx.length < 4) bad('the reactions are missing');
    for (const r of rx) { if (!near(r.getBoundingClientRect().height, 24)) bad(`a reaction is ${r.getBoundingClientRect().height}px, expected the 24px tag`); if (r.getAttribute('aria-pressed') === 'true' && cs(r).backgroundColor !== bgTok(d, '--selected-bg')) bad('a pressed reaction is not --selected-bg'); }
    const cnt = d.querySelector('.sdk-message-reactions .sdk-badge'); if (!cnt || !near(cnt.getBoundingClientRect().height, 18)) bad('the reaction count is not the 18px Chips count');
    // The object card and the link box are the approved cards.
    const border = tok(d, 'var(--border)');
    for (const el of [d.querySelector('.sdk-message-body > .sdk-card:not(.sdk-linkbox)'), ...d.querySelectorAll('.sdk-linkbox')]) {
      const c = cs(el); const nm = el.classList.contains('sdk-linkbox') ? 'the link box' : 'the object card';
      for (const s of NO_EDGE) if (c['border' + s + 'Width'] !== '1px' || c['border' + s + 'Color'] !== border) bad(`${nm} ${s.toLowerCase()} edge is ${c['border' + s + 'Width']} ${c['border' + s + 'Color']}, expected 1px --border`);
      if (c.boxShadow !== 'none' || c.paddingLeft !== '12px' || c.paddingTop !== '12px') bad(`${nm} is not the card (shadow ${c.boxShadow}, padding ${c.paddingLeft})`);
      if (c.backgroundColor !== bgTok(d, '--bg-card')) bad(`${nm} is not --bg-card`);
    }
    const lb = d.querySelectorAll('.sdk-linkbox'); if (lb.length < 2) bad('the link boxes are missing'); const photo = d.querySelector('.sdk-linkbox-photo').getBoundingClientRect();
    if (!near(photo.width, ph ? 52 : 72) || !near(photo.height, ph ? 52 : 72)) bad(`the link photo is ${photo.width} by ${photo.height}, expected ${ph ? 52 : 72}`);
    if (!lb[1].querySelector('.sdk-card-icon')) bad('the plain link box has no icon');
    // The hover slot.
    const slots = [...d.querySelectorAll('.sdk-message-actions')]; if (slots.length !== 2) bad('the hover slot examples are missing');
    else { const [shown, hidden] = slots; if (cs(shown).visibility !== 'visible' || cs(shown).opacity !== '1') bad('the hover slot is not shown on hover'); if (!ph && (cs(hidden).visibility !== 'hidden' || cs(hidden).opacity !== '0')) bad('the hover slot is shown at rest');
      if (!ph) { const m = shown.closest('.sdk-message').getBoundingClientRect(); const s = shown.getBoundingClientRect(); if (s.top - m.top > 4 || m.right - s.right < 30 || m.right - s.right > 44) bad(`the hover slot is not at the top right (top ${s.top - m.top}, right ${m.right - s.right})`); if (cs(shown).position !== 'absolute') bad('the hover slot takes room'); } }
  }
  // ---- the composer ----
  { const d = get('Chat, composer states'); const ph = phone(d); const comps = [...d.querySelectorAll('.sdk-composer')]; if (comps.length < 6) bad(`the composer frame shows only ${comps.length} composers`);
    const lh = ph ? 22 : 20; const padY = ph ? 10 : 8; const max = 5 * lh + 2 * padY + 2; const one = ph ? 44 : 38;
    const tas = comps.map((c) => c.querySelector('textarea'));
    const [rest, focus, three, eight, dis] = tas;
    for (const [ta, nm] of [[rest, 'rest']]) { const c = cs(ta); if (!near(ta.getBoundingClientRect().height, one)) bad(`the composer field at ${nm} is ${ta.getBoundingClientRect().height}px, expected ${one}`);
      if (c.backgroundColor !== bgTok(d, '--bg-input') || c.borderTopWidth !== '1px' || c.borderTopColor !== tok(d, 'var(--border)') || c.borderTopLeftRadius !== tok(d, 'var(--radius-small)', 'borderTopLeftRadius')) bad('the composer field is not the Fields text area (field step, 1px hairline, small corner)');
      if (c.fontSize !== (ph ? '16px' : '14px')) bad(`the composer field text is ${c.fontSize}, expected ${ph ? '16px' : '14px'}`); if (c.resize !== 'none') bad('the composer field can be dragged larger'); }
    if (rest.getAttribute('placeholder') !== 'Send a message or type / for commands') bad('the composer hint is not "Send a message or type / for commands"');
    if (cs(rest, '::placeholder').color !== tok(d, 'var(--text-dim)')) bad('the placeholder is not --text-dim');
    if (cs(focus).borderTopColor !== tok(d, 'var(--accent)')) bad('the focused field has no accent edge');
    if (!near(three.getBoundingClientRect().height, 3 * lh + 2 * padY + 2, 1)) bad(`the three-line field is ${three.getBoundingClientRect().height}px, expected ${3 * lh + 2 * padY + 2}`);
    if (!near(eight.getBoundingClientRect().height, max, 1) || eight.scrollHeight <= eight.clientHeight + 1) bad(`the eight-line field is ${eight.getBoundingClientRect().height}px (expected ${max}, scrolling)`);
    if (!dis.disabled || cs(dis).opacity !== '0.5' || dis.getAttribute('placeholder') !== 'Chat is closed') bad('the disabled composer is not half strength with "Chat is closed"');
    for (const c of comps) { for (const bt of c.querySelectorAll('button')) { if (/^send$/i.test((bt.textContent || '').trim()) || /^send( message)?$/i.test(bt.getAttribute('aria-label') || '') || bt.type === 'submit') bad('a Send button is drawn'); } }
    const fbs = [...comps[0].querySelectorAll('.sdk-format-bar .sdk-icon-btn')]; if (fbs.length < 8) bad('the format bar has fewer than eight buttons');
    for (const f of fbs) { const r = f.getBoundingClientRect(); if (!near(r.width, 30) || !near(r.height, 30)) bad('a format button is not 30px'); }
    const bold = comps[2].querySelector('[aria-pressed="true"]'); if (!bold || cs(bold).backgroundColor !== bgTok(d, '--selected-bg')) bad('a format button that is on is not --selected-bg');
    const bar = comps[0].querySelector('.sdk-format-bar'); if (cs(bar).backgroundColor !== 'rgba(0, 0, 0, 0)') bad('the format bar has a fill');
    const c0 = cs(comps[0]); if (c0.backgroundColor !== bgTok(d, '--bg-section') || c0.borderTopWidth !== '1px' || c0.borderLeftWidth !== '0px') bad('the composer is not the window\'s step with one hairline on top');
    // The command menu: the Menus popover, above the field.
    const mc = comps[5]; const menu = mc.querySelector('.sdk-menu'); const items = [...menu.querySelectorAll('.sdk-menu-item')]; const field = mc.querySelector('textarea').getBoundingClientRect(); const mr = menu.getBoundingClientRect();
    if (items.length < 3 || mr.bottom > field.top + 0.5) bad('the command menu is not above the field'); if (cs(menu).backgroundColor !== bgTok(d, '--bg-card') || cs(menu).boxShadow !== tok(d, 'var(--shadow-2)', 'boxShadow') || cs(menu).borderTopLeftRadius !== tok(d, 'var(--radius-medium)', 'borderTopLeftRadius')) bad('the command menu is not the Menus popover');
    for (const it of items) if (!near(it.getBoundingClientRect().height, ph ? 44 : 32)) bad(`a command menu item is ${it.getBoundingClientRect().height}px, expected ${ph ? 44 : 32}`);
    if (cs(items[0]).backgroundColor === cs(items[1]).backgroundColor) bad('the current command is not marked');
    for (const pop of d.querySelectorAll('.chat-help-popup, .chat-emoji-popup')) { const c = cs(pop); if (c.backgroundColor !== bgTok(d, '--bg-card') || c.boxShadow !== tok(d, 'var(--shadow-2)', 'boxShadow') || c.borderTopLeftRadius !== tok(d, 'var(--radius-medium)', 'borderTopLeftRadius')) bad('a help or emoji popover is not the Menus popover surface'); }
  }
  // ---- the live composer: what it says it does ----
  { const f = F.find((x) => x.iframe.title === 'Chat, live composer'); const d = f.iframe.contentDocument; const w = d.defaultView; const ph = phone(d); const ta = d.querySelector('[data-live] textarea'); const list = d.querySelector('.sdk-messages');
    const key = (k, o) => { const e = new w.KeyboardEvent('keydown', Object.assign({ key: k, bubbles: true, cancelable: true }, o || {})); ta.dispatchEvent(e); return e; };
    const type = (v) => { ta.value = v; ta.dispatchEvent(new w.Event('input', { bubbles: true })); };
    const n0 = list.querySelectorAll('.sdk-message').length; const one = ph ? 44 : 38; const max = 5 * (ph ? 22 : 20) + 2 * (ph ? 10 : 8) + 2;
    type('Hello there'); let e = key('Enter', { shiftKey: true }); if (e.defaultPrevented) bad('live composer: Shift+Enter is stopped (it must be a new line)'); if (list.querySelectorAll('.sdk-message').length !== n0) bad('live composer: Shift+Enter sent the message');
    type('a\nb'); const two = ta.getBoundingClientRect().height; if (two <= one + 1) bad('live composer: two lines do not grow the field');
    type('1\n2\n3\n4\n5\n6\n7\n8'); const g = ta.getBoundingClientRect().height; if (!near(g, max, 1) || ta.scrollHeight <= ta.clientHeight + 1) bad(`live composer: eight lines make the field ${g}px, expected ${max} with a scroll`);
    type('Hello there'); e = key('Enter'); if (!e.defaultPrevented) bad('live composer: Enter does not send');
    const n1 = list.querySelectorAll('.sdk-message').length; if (n1 !== n0 + 1) bad('live composer: Enter does not add the message'); if (ta.value !== '') bad('live composer: the field is not cleared after sending');
    if (!near(ta.getBoundingClientRect().height, one, 1)) bad('live composer: the field does not shrink back after sending'); if (!list.lastElementChild.classList.contains('own')) bad('live composer: the sent message is not your own');
    type('   '); key('Enter'); if (list.querySelectorAll('.sdk-message').length !== n1) bad('live composer: an empty message was sent');
    type('/'); let menu = d.querySelector('[data-live] .sdk-menu'); if (!menu || menu.querySelectorAll('.sdk-menu-item').length < 3) bad('live composer: "/" does not open the commands');
    else { key('ArrowDown'); if (!menu.querySelectorAll('.sdk-menu-item')[1].classList.contains('active')) bad('live composer: the arrow key does not move the current command');
      key('Escape'); if (d.querySelector('[data-live] .sdk-menu')) bad('live composer: Escape does not close the commands'); }
    type('/r'); menu = d.querySelector('[data-live] .sdk-menu'); if (!menu || menu.querySelectorAll('.sdk-menu-item').length !== 2) bad('live composer: "/r" does not narrow the commands to two');
    key('Enter'); if (!/^\/roll $/.test(ta.value) || d.querySelector('[data-live] .sdk-menu')) bad('live composer: Enter does not pick the current command'); if (list.querySelectorAll('.sdk-message').length !== n1) bad('live composer: picking a command sent the message');
    type('hello /'); if (d.querySelector('[data-live] .sdk-menu')) bad('live composer: a "/" in the middle opens the commands');
  }
  // ---- the status line, unread ----
  { const d = get('Chat, status line'); const lines = [...d.querySelectorAll('#chat-status')]; if (lines.length !== 3) bad('the chat status line examples are missing');
    for (const s of lines) { if (!near(s.getBoundingClientRect().height, 24)) bad('the chat status line is not 24px'); if (!s.querySelector('[aria-live="polite"]') || !s.querySelector('[role="status"][aria-live="polite"]')) bad('the chat status line has no polite live regions'); }
    const pr = d.querySelector('.is-problem'); if (!pr || cs(pr).color !== tok(d, 'color-mix(in srgb, var(--danger) 70%, var(--text))')) bad('a chat problem is not the readable red'); if (!/^In a call · /.test(lines[0].querySelector('.sdk-status-text').textContent)) bad('the status line does not say "In a call · time"'); }
  { const d = get('Chat, unread'); const badge = d.querySelector('.sdk-tab-badge:not(.sdk-badge-micro)'); if (!badge || !near(badge.getBoundingClientRect().height, 18)) bad('the unread count after a label is not the 18px Chips count');
    const dot = d.querySelector('.sdk-tab-dot'); if (!dot || !near(dot.getBoundingClientRect().width, 7)) bad('the unread dot is not 7px');
    const micros = [...d.querySelectorAll('.sdk-badge-micro')]; if (micros.length < 3) bad('the micro counts are missing');
    for (const m of micros) { const r = m.getBoundingClientRect(); const p = m.parentElement; const pr = p.getBoundingClientRect(); const c = cs(p); const top = r.top - pr.top - parseFloat(c.borderTopWidth); const right = pr.right - parseFloat(c.borderRightWidth) - r.right;
      if (!near(r.height, 14)) bad(`a micro count is ${r.height}px high, expected 14`); if (cs(m).fontSize !== '9px') bad('a micro count is not 9px'); if (!near(top, 3, 0.8) || !near(right, 3, 0.8)) bad(`a micro count is ${top} from the top and ${right} from the right, expected 3 and 3`); }
    if (!/99\+/.test(d.body.textContent)) bad('the 99+ cap is not drawn'); }
  // ---- a phone ----
  { const d = get('Chat, phone'); if (d.defaultView.innerWidth > 640) bad('the phone frame is wider than a phone'); const ta = d.querySelector('.sdk-composer textarea');
    if (!near(ta.getBoundingClientRect().height, 2 * 22 + 20 + 2, 1)) bad(`the phone field with two lines is ${ta.getBoundingClientRect().height}px, expected 66`); if (cs(ta).fontSize !== '16px') bad('the phone field words are not 16px'); }
  // ---- aliases ----
  { const d = get('Chat, aliases'); const m = [...d.querySelectorAll('.message')]; const others = tok(d, 'color-mix(in srgb, var(--text) 5%, transparent)', 'backgroundColor'); const own = tok(d, 'color-mix(in srgb, var(--accent) 10%, transparent)', 'backgroundColor');
    if (cs(m[0]).backgroundColor !== others || cs(m[1]).backgroundColor !== own) bad('.message and .message.own do not take the fills');
    for (const el of m) for (const s of NO_EDGE) if (cs(el)['border' + s + 'Width'] !== '0px') bad('.message[data-tint] keeps a coloured edge');
    if (cs(m[0].querySelector('.message-head')).backgroundColor !== 'rgba(0, 0, 0, 0)' || cs(m[1].querySelector('.message-head')).backgroundColor !== 'rgba(0, 0, 0, 0)') bad('.message-head keeps its band');
    if (cs(m[0].querySelector('.message-name')).fontWeight !== '600') bad('.message-name is not weight 600'); if (!near(m[0].querySelector('.sdk-more').getBoundingClientRect().height, 30)) bad('the .sdk-more in a message head is not 30px');
    const q = m[2].querySelector('.message-quote'); if (cs(q).borderLeftWidth !== '0px' || cs(q).backgroundColor === 'rgba(0, 0, 0, 0)') bad('.message-quote keeps its 2px rule');
    const lk = m[2].querySelector('.chat-link'); if (cs(lk).borderLeftWidth !== '1px' || cs(lk).borderLeftColor !== tok(d, 'var(--border)')) bad('.chat-link keeps its coloured left edge'); if (!near(lk.querySelector('.chat-link-img').getBoundingClientRect().width, phone(d) ? 52 : 72)) bad('.chat-link-img is not the photo tile');
    const portrait = m[2].querySelector('.message-portrait'); if (cs(portrait).backgroundColor !== tok(d, 'color-mix(in srgb, var(--tint-blue) 22%, var(--bg-section))', 'backgroundColor')) bad('.message[data-tint] does not tint the portrait');
    const bar = d.querySelector('.chat-bar'); if (cs(bar).backgroundColor !== bgTok(d, '--bg-section') || cs(bar).borderLeftWidth !== '0px' || cs(bar).borderTopWidth !== '1px') bad('.chat-bar is not the composer');
    const mb = d.querySelectorAll('.chat-format-bar .msg-btn'); for (const x of mb) if (!near(x.getBoundingClientRect().width, 30)) bad('.chat-format-bar .msg-btn is not 30px'); if (cs(mb[1]).backgroundColor !== bgTok(d, '--selected-bg')) bad('.msg-btn.on is not --selected-bg');
    const ta = bar.querySelector('textarea'); if (cs(ta).backgroundColor !== bgTok(d, '--bg-input') || !near(ta.getBoundingClientRect().height, phone(d) ? 44 : 38)) bad('the .chat-bar textarea is not the field'); }
  // ---- the whole family: weights, sizes, edges, thin blocks, widths ----
  for (const t of TITLES) { const d = get(t); const border = tok(d, 'var(--border)'); const own = /contrast/.test(t);
    if (d.documentElement.scrollWidth > d.documentElement.clientWidth + 1) bad(`${t}: scrolls sideways`);
    if (own) continue;
    for (const el of d.querySelectorAll('body *')) { if (el.closest('svg') || el.closest('.pm-ch-note')) continue; const c = cs(el);
      const sides = NO_EDGE.filter((s) => c['border' + s + 'Width'] !== '0px' && c['border' + s + 'Style'] !== 'none');
      for (const s of sides) { const col = c['border' + s + 'Color']; if (col !== border && col !== 'rgba(0, 0, 0, 0)' && !el.matches('textarea:focus, .ds-force-focus')) bad(`${t}: a ${s.toLowerCase()} edge of ${el.className || el.tagName} is ${col}, not --border or transparent`); }
      if (sides.length && sides.length < 4 && sides.some((s) => s === 'Left' || s === 'Right')) bad(`${t}: a left or right edge on ${el.className || el.tagName}`);
      for (const p of ['::before', '::after']) { const pc = cs(el, p); if (pc.content !== 'none' && pc.content !== 'normal' && pc.backgroundColor !== 'rgba(0, 0, 0, 0)' && pc.position === 'absolute' && (parseFloat(pc.width) <= 4 || parseFloat(pc.height) <= 4)) bad(`${t}: a thin coloured block on ${el.className || el.tagName}`); }
      if (el.closest('.sdk-message, .sdk-composer, .sdk-window') && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) {
        if (!['400', '500', '600'].includes(c.fontWeight)) bad(`${t}: weight ${c.fontWeight} on ${el.className || el.tagName} (400, 500 and 600 only)`);
        if (parseFloat(c.fontSize) < 11 && !el.matches('.sdk-badge-micro')) bad(`${t}: ${c.fontSize} text on ${el.className || el.tagName} (nothing under 11px)`); } } }
  // ---- contrast ----
  { const d = get('Chat, contrast'); await wait(600); const rows = [...d.querySelectorAll('.pm-ch-ct tbody tr')]; if (rows.length < 25) bad(`the contrast table has only ${rows.length} rows`);
    for (const tr of rows) { const p = tr.querySelector('[data-out="p"]').textContent; if (p === 'Fails') bad(`contrast: ${tr.children[0].textContent} is ${tr.querySelector('[data-out="r"]').textContent}`); if (!p) bad('the contrast table is not measured'); } }
  // ---- the page ----
  const blk = document.getElementById('chat');
  if (!blk || !blk.querySelector('.ds-st-proposed') || blk.querySelector('.ds-st-approved')) bad('the Chat family is not marked Proposed');
  if (document.getElementById('u-messages-chat-and-ai-cards')) bad('Messages, chat and AI cards is still listed as Not yet decided');
  if (!blk || !/Chosen while drawing/.test(blk.textContent) || !/Today to proposed/.test(blk.textContent)) bad('the Chat family lacks its Today to proposed or Chosen while drawing section');
  return JSON.stringify(out);
};
