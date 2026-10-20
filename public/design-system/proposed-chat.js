/* The Chat family (proposed): the message and the composer, with the Chat status line. Loaded by proposed.html through proposed-families.json; it registers
   one family through window.DS_PROPOSED.families.push and draws it with the rules in proposed-chat.css. It draws the Module window family's title bar, toolbar and
   status line around the chat (proposed-modulechrome.css). Nothing here is a style of the product: markup, words, tables, and a small script that makes the live
   composer example work (Enter sends, Shift+Enter is a new line, the field grows to five lines, "/" opens the commands). How to add a family: README.md in this folder. */
window.DS_PROPOSED = window.DS_PROPOSED || { families: [] };
(() => {
  const PM_CSS = window.DS_PROPOSED.pmCss; // the shared example-page rules, from the page engine
  const h = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const fa = (n, x) => `<i class="fa-solid fa-${n}${x ? ' ' + x : ''}" aria-hidden="true"></i>`;

  // Layout of the example pages only (not a style of the product).
  const CH_CSS = `
.pm-ch-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(330px, 1fr)); gap: 16px; align-items: start; }
.pm-ch-grid > div > small, .pm-ch-cap { display: block; margin-bottom: 5px; color: var(--text-dim); font-size: 11px; font-weight: 600; letter-spacing: 0.08em; line-height: 12px; text-transform: uppercase; }
.pm-ch-surface { box-sizing: border-box; padding: 12px; border: 1px solid var(--border); border-radius: var(--radius-large); background: var(--bg-section); }
.pm-ch-col { width: 420px; max-width: 100%; }
.pm-ch-note { margin: 6px 0 0; color: var(--text-dim); font-size: 12px; }
.pm-ch-stack { display: flex; flex-direction: column; gap: 8px; }
.pm-ch-pop { position: relative; height: 150px; }
.pm-ch-pop > .chat-help-popup, .pm-ch-pop > .chat-emoji-popup { position: absolute; left: 0; bottom: 0; width: 260px; max-width: 100%; }
.pm-ch-ct { border-collapse: collapse; width: 100%; font-size: 12px; }
.pm-ch-ct th, .pm-ch-ct td { padding: 4px 8px 4px 0; text-align: left; border-bottom: 1px solid var(--border); }
.pm-ch-ct th { color: var(--text-dim); font-size: 11px; letter-spacing: 0.06em; text-transform: uppercase; }
.pm-ch-pass { color: var(--ok); font-weight: 600; }
.pm-ch-fail { color: var(--danger); font-weight: 600; }
`;

  const wrap = (inner) => `<div class="ds-proposed">${inner}</div>`;
  const CAP = (s) => `<small>${s}</small>`;
  const TINTS = ['gold', 'blue', 'green', 'teal', 'purple', 'red', 'orange', 'pink'];
  const ibtn = (icon, label, extra, attrs) => `<button type="button"${attrs || ''} class="sdk-icon-btn btn-small btn-quiet${extra ? ' ' + extra : ''}" aria-label="${label}" title="${label}">${fa(icon)}</button>`;
  const MORE = ibtn('ellipsis-vertical', 'More');
  const ACTIONS = `<span class="sdk-message-actions" role="group" aria-label="Message actions">${ibtn('face-smile', 'React')}${ibtn('reply', 'Reply')}${ibtn('bookmark', 'Keep')}</span>`;

  // ---- the message ----
  const portrait = (o) => `<span class="sdk-message-portrait" aria-hidden="true">${o.icon ? fa(o.icon) : h((o.who || '?')[0])}</span>`;
  const react = (list) => `<div class="sdk-message-reactions" role="group" aria-label="Reactions">${list.map(([e, n, on]) => `<button type="button" class="sdk-chip-tag" aria-pressed="${on ? 'true' : 'false'}" aria-label="${e[1]}, ${n}"><span class="sdk-react-emoji" aria-hidden="true">${e[0]}</span><span class="sdk-badge">${n}</span></button>`).join('')}<button type="button" class="sdk-chip-tag" aria-label="Add a reaction">${fa('face-smile')}${fa('plus')}</button></div>`;
  // o: who, time, own, tint, icon, cmd, text (html), quote, extra (html), react, actions, hover.
  const msg = (o = {}) => `<div class="sdk-message${o.own ? ' own' : ''}${o.hover ? ' ds-force-hover' : ''}"${o.tint ? ` data-tint="${o.tint}"` : ''}>
    <div class="sdk-message-head"><span class="sdk-message-who">${portrait(o)}<span class="sdk-message-name">${o.who}</span>${o.cmd ? `<span class="sdk-message-command">${o.cmd}</span>` : ''}<time class="sdk-message-time">${o.time || '10:41'}</time></span><span class="sdk-message-tools">${MORE}</span></div>
    ${o.actions ? ACTIONS : ''}<div class="sdk-message-body">${o.quote ? `<p class="sdk-message-quote">${o.quote}</p>` : ''}<div class="sdk-message-text">${o.text}</div>${o.extra || ''}${o.react ? react(o.react) : ''}</div></div>`;

  const OBJECT = `<div class="sdk-card" data-tint="orange"><div class="sdk-card-head"><span class="sdk-card-icon">${fa('utensils')}</span><div class="sdk-card-main"><p class="sdk-card-sub sdk-tint-text">Food</p><h4 class="sdk-card-title">Café Marly</h4><p class="sdk-card-sub">Paris, open until 11</p></div></div><p class="sdk-card-body">A terrace over the Louvre courtyard. Book ahead for Friday.</p><div class="sdk-card-foot"><button type="button" class="btn btn-small btn-primary">Keep</button><button type="button" class="btn btn-small">Details</button></div></div>`;
  const LINK = (photo) => `<div class="sdk-card sdk-linkbox">${photo ? `<span class="sdk-linkbox-photo" aria-hidden="true">${fa('image')}</span>` : `<span class="sdk-card-icon">${fa('link')}</span>`}<div class="sdk-linkbox-text"><a class="sdk-linkbox-title" href="#">Café Marly, Paris</a><p class="sdk-linkbox-desc">A terrace restaurant under the arcades of the Louvre, with a view of the pyramid and a short list of classics.</p><div class="sdk-linkbox-site">${fa('link')}<span>cafemarly.example</span></div></div><button type="button" class="btn btn-small btn-quiet sdk-linkbox-keep">Keep</button></div>`;

  const CONVERSATION = [
    msg({ who: 'Sam', time: '10:41', text: '<p>Anyone checked the museum hours for Friday?</p>', react: [[['&#128077;', 'Thumbs up'], 2, true], [['&#128064;', 'Eyes'], 1, false]] }),
    msg({ who: 'You', own: true, time: '10:42', text: '<p>Open until 9 on Fridays. I will book the timed entry.</p>' }),
    msg({ who: 'Maps', icon: 'map', tint: 'blue', cmd: '/map', time: '10:43', text: '<p>I found three cafés near the hotel.</p>', extra: OBJECT }),
    msg({ who: 'Assistant', icon: 'wand-magic-sparkles', tint: 'gold', time: '10:44', quote: 'Where should we eat on Friday night?', text: '<p>Café Marly is open until 11 and has a terrace. Two other places are closer to the hotel:</p><ul><li>Le Grand Colbert, 6 minutes on foot</li><li>Chez Georges, 9 minutes</li></ul>' }),
    msg({ who: 'Sam', time: '10:45', text: '<p>This one looks good.</p>', extra: LINK(true) }),
  ].join('');

  // ---- the composer ----
  const fbtn = (icon, label, on, dis) => ibtn(icon, label, '', `${on ? ' aria-pressed="true"' : ''}${dis ? ' disabled' : ''}`);
  const formatBar = (o = {}) => `<div class="sdk-format-bar" role="toolbar" aria-label="Format"><span class="sdk-format-side">${fbtn('image', 'Send a picture', false, o.dis)}${fbtn('bold', 'Bold', o.bold, o.dis)}${fbtn('italic', 'Italic', false, o.dis)}${fbtn('code', 'Code', false, o.dis)}${fbtn('list-ul', 'Bulleted list', false, o.dis)}${fbtn('face-smile', 'Emoji', false, o.dis)}</span><span class="sdk-format-side">${fbtn('square-poll-horizontal', 'Commands', o.cmd, o.dis)}${fbtn('circle-question', 'Formatting help', false, o.dis)}</span></div>`;
  const CMDS = [['/roll', 'Roll dice'], ['/rules', 'Look up a rule'], ['/map', 'Find a place'], ['/ask', 'Ask the assistant']];
  const menuItem = (c, i) => `<button type="button" class="sdk-menu-item${i === 0 ? ' active' : ''}" role="option" aria-selected="${i === 0}" tabindex="-1"><span class="sdk-menu-label">${c[0]}</span><span class="sdk-menu-hint">${c[1]}</span></button>`;
  const cmdMenu = `<div class="sdk-menu sdk-composer-menu" role="listbox" aria-label="Commands">${CMDS.map(menuItem).join('')}</div>`;
  // o: text, focus, dis, menu (html), bold, live.
  const composer = (o = {}) => `<div class="sdk-composer"${o.dis ? ' aria-disabled="true"' : ''}${o.live ? ' data-live="1"' : ''}>${formatBar(o)}<div class="sdk-composer-field"><textarea name="message" rows="1" maxlength="1000" placeholder="${o.dis ? 'Chat is closed' : 'Send a message or type / for commands'}" enterkeyhint="send" aria-label="Message"${o.dis ? ' disabled' : ''}${o.focus ? ' class="ds-force-focus"' : ''}>${h(o.text || '')}</textarea></div>${o.menu || ''}</div>`;
  const cstatus = (left, right, problem) => `<div class="sdk-status-line chat-status" id="chat-status" role="region" aria-label="Chat status"><span class="sdk-status-items"><span class="sdk-status-item${problem ? ' is-problem' : ''}" aria-live="polite">${fa(problem ? 'triangle-exclamation' : 'phone')}<span class="sdk-status-text">${left}</span></span><span class="sdk-status-item end"><span class="sdk-status-text" role="status" aria-live="polite">${right || ''}</span></span></span></div>`;
  const VIEWS = (o = {}) => `<div class="sdk-toolbar" id="chat-views"><div class="sdk-tabs sdk-tabs-joined sdk-tabs-small" role="tablist" aria-label="Chat views"><button type="button" class="sdk-tab" role="tab" aria-selected="true"><i class="sdk-tab-glyph fa-solid fa-comments" aria-hidden="true"></i><span class="sdk-tab-word">Discussion</span>${o.count ? `<span class="sdk-tab-badge">${o.count}</span>` : ''}</button><button type="button" class="sdk-tab" role="tab" aria-selected="false"><i class="sdk-tab-glyph fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i><span class="sdk-tab-word">Assistant</span>${o.dot ? '<span class="sdk-tab-dot" aria-hidden="true"></span>' : ''}</button></div></div>`;
  // The whole chat module: title bar, the views, the messages, the composer, the status line.
  const chat = (o = {}) => `<div class="sdk-window ${o.popout ? 'sdk-window-popout' : 'sdk-window-docked'}" style="${o.style || 'height:560px'}"><div class="sdk-titlebar" data-tint="gold"><span class="sdk-titlebar-title">${fa('comments')}<span>Chat</span></span><span class="sdk-titlebar-tools">${ibtn('ellipsis-vertical', 'More')}${ibtn('xmark', 'Close chat')}</span></div>${VIEWS({ count: o.count == null ? 3 : o.count, dot: true })}<div class="sdk-messages" tabindex="0" aria-label="Messages">${o.messages || CONVERSATION}</div>${o.composer || composer(o.composerOpts)}${o.status || cstatus('In a call · 12:41', 'Sam joined')}</div>`;

  // ---- frame bodies ----
  const conversationBody = () => wrap(`<div class="pm-ch-col">${chat({ style: 'height:800px' })}</div>`);

  const partsBody = () => wrap(`<div class="pm-ch-grid">
    <div>${CAP('Others: a 5% text fill')}${msg({ who: 'Sam', text: '<p>Anyone checked the museum hours?</p>' })}</div>
    <div>${CAP('Own: a 10% accent fill')}${msg({ who: 'You', own: true, text: '<p>Open until 9 on Fridays.</p>' })}</div>
    <div>${CAP('Command or AI: the tint is on the portrait only')}${msg({ who: 'Maps', icon: 'map', tint: 'blue', cmd: '/map', text: '<p>I found three cafés near the hotel.</p>' })}</div>
    <div>${CAP('The eight tints, on the portrait')}<div class="pm-ch-stack">${TINTS.map((t) => msg({ who: t[0].toUpperCase() + t.slice(1), icon: 'location-dot', tint: t, time: '10:40', text: '<p>The message is neutral.</p>' })).join('')}</div></div>
    <div>${CAP('Long text, a link, code and a list')}${msg({ who: 'Assistant', icon: 'wand-magic-sparkles', tint: 'gold', text: '<p>The Louvre sells timed tickets at <a href="#">louvre.example</a>. A very long unbroken address such as https://www.example.com/a/very/long/path/that/keeps/going/and/going/until/it/must/wrap should wrap, not push the message wider.</p><p>Use <code>/roll 2d6</code> to roll dice.</p><ul><li>Tickets: 22 EUR</li><li>Audio guide: 5 EUR</li></ul><pre><code>1. Entry 9:30\n2. Lunch 12:30</code></pre>' })}</div>
    <div>${CAP('Quote: a nested neutral fill, not a 2px rule')}${msg({ who: 'Assistant', icon: 'wand-magic-sparkles', tint: 'gold', quote: 'Where should we eat on Friday night, somewhere with a long name that fills the line?', text: '<p>Café Marly is open until 11.</p>' })}${msg({ who: 'Sam', text: '<blockquote>Open until 9 on Fridays.</blockquote><p>Good, then we can eat first.</p>' })}</div>
    <div>${CAP('Reactions: Chips tags with a count')}${msg({ who: 'Sam', text: '<p>I booked the table for six.</p>', react: [[['&#128077;', 'Thumbs up'], 3, true], [['&#10084;&#65039;', 'Heart'], 1, false], [['&#127881;', 'Party'], 12, false]] })}</div>
    <div>${CAP('Object card: the approved card')}${msg({ who: 'Maps', icon: 'map', tint: 'blue', cmd: '/map', text: '<p>Here is one.</p>', extra: OBJECT })}</div>
    <div>${CAP('Link box with a photo tile')}${msg({ who: 'Sam', text: '<p>This looks good.</p>', extra: LINK(true) })}</div>
    <div>${CAP('Link box with an icon')}${msg({ who: 'Sam', text: '<p>And the rules.</p>', extra: LINK(false) })}</div>
    <div>${CAP('Hover or focus inside: the actions slot, top right')}${msg({ who: 'Sam', hover: true, actions: true, text: '<p>Hover, or tab into the message.</p>' })}</div>
    <div>${CAP('Not hovered: the slot is hidden, the "..." stays')}${msg({ who: 'Sam', actions: true, text: '<p>At rest.</p>' })}</div>
  </div>`);

  const composerBody = () => wrap(`<div class="pm-ch-grid" style="grid-template-columns:repeat(auto-fill,minmax(360px,1fr))">
    <div>${CAP('Rest')}<div class="pm-ch-surface" style="padding:0">${composer({})}</div></div>
    <div>${CAP('Focus: the Fields focus')}<div class="pm-ch-surface" style="padding:0">${composer({ focus: true })}</div></div>
    <div>${CAP('Three lines')}<div class="pm-ch-surface" style="padding:0">${composer({ text: 'Dinner at 8?\nI can book the terrace.\nTell me by noon.', bold: true })}</div></div>
    <div>${CAP('Eight lines: the field stops at five and scrolls')}<div class="pm-ch-surface" style="padding:0">${composer({ text: '1 Entry\n2 Lunch\n3 Walk\n4 Museum\n5 Tea\n6 Dinner\n7 Show\n8 Bed' })}</div></div>
    <div>${CAP('Disabled: chat is closed')}<div class="pm-ch-surface" style="padding:0">${composer({ dis: true })}</div></div>
    <div>${CAP('With the command menu open (the Menus popover)')}<div class="pm-ch-surface" style="padding:0;padding-top:150px">${composer({ menu: cmdMenu, text: '/', cmd: true })}</div></div>
    <div>${CAP('Emoji popover')}<div class="pm-ch-surface" style="padding:8px 8px 0"><div class="pm-ch-pop"><div class="chat-emoji-popup">${['&#128077;', '&#10084;&#65039;', '&#128514;', '&#127881;', '&#128064;', '&#128525;', '&#128591;', '&#128558;'].map((e) => `<button type="button" class="chat-emoji-btn" aria-label="Emoji ${e}">${e}</button>`).join('')}</div></div></div></div>
    <div>${CAP('Formatting help popover')}<div class="pm-ch-surface" style="padding:8px 8px 0"><div class="pm-ch-pop"><div class="chat-help-popup"><p style="margin:0 0 4px;font-weight:600">Format</p><p style="margin:0"><code>*bold*</code> <code>_italic_</code> <code>\`code\`</code></p><p style="margin:4px 0 0">Enter sends. Shift+Enter is a new line.</p></div></div></div></div>
  </div>
  <p class="pm-ch-note">The field is the approved text area on the field step: one line at rest (38px, 44px on a phone), growing to five lines, then it scrolls. There is no Send button: Enter sends, Shift+Enter is a new line. The format bar is icon-only Quiet small buttons; "on" (Bold, Commands) is the neutral selected fill.</p>`);

  const liveBody = () => wrap(`<div class="pm-ch-col">${chat({ style: 'height:520px', messages: msg({ who: 'Sam', text: '<p>Try it: type, press Enter, press Shift+Enter, type a "/".</p>' }), composer: composer({ live: true }), status: cstatus('In a call · 12:41', '') })}</div>
    <p class="pm-ch-note">Live: Enter sends and clears the field. Shift+Enter adds a line. The field grows to five lines, then scrolls. "/" at the start opens the commands; the arrow keys move, Enter or Tab picks, Escape closes.</p>`);

  const statusBody = () => wrap(`<div class="pm-ch-stack" style="width:420px;max-width:100%">
    <div>${CAP('In a call: the time, and the latest notice')}<div class="sdk-window sdk-window-docked">${cstatus('In a call · 12:41', 'Sam joined')}</div></div>
    <div>${CAP('Connected, no call')}<div class="sdk-window sdk-window-docked">${cstatus('Connected', 'Saved')}</div></div>
    <div>${CAP('A plain problem sentence')}<div class="sdk-window sdk-window-docked">${cstatus('Chat is offline. Trying again.', 'Not sent: 1', true)}</div></div>
    <p class="pm-ch-note">#chat-status is the module status line. The left part and the notice are polite live regions, so a change is read out once.</p></div>`);

  const unreadBody = () => wrap(`<div class="pm-ch-grid" style="grid-template-columns:repeat(auto-fill,minmax(260px,1fr))">
    <div>${CAP('Count after a label (18px) and a dot')}<div class="sdk-window sdk-window-docked">${VIEWS({ count: 3, dot: true })}</div></div>
    <div>${CAP('Narrow switch: the micro count on an icon')}<div class="sdk-window sdk-window-docked"><div class="sdk-toolbar"><div class="sdk-tabs sdk-tabs-joined sdk-tabs-small sdk-tabs-compact" role="tablist" aria-label="Chat views"><button type="button" class="sdk-tab" role="tab" aria-selected="true" aria-label="Discussion, 3 new" title="Discussion"><i class="sdk-tab-glyph fa-solid fa-comments" aria-hidden="true"></i><span class="sdk-tab-word">Discussion</span><span class="sdk-tab-badge sdk-badge-micro">3</span></button><button type="button" class="sdk-tab" role="tab" aria-selected="false" aria-label="Assistant, new answer" title="Assistant"><i class="sdk-tab-glyph fa-solid fa-wand-magic-sparkles" aria-hidden="true"></i><span class="sdk-tab-word">Assistant</span><span class="sdk-tab-dot" aria-hidden="true"></span></button></div></div></div></div>
    <div>${CAP('Chat button with unread (micro count), 99+')}<div class="sdk-window sdk-window-docked"><div class="sdk-toolbar"><button type="button" class="sdk-icon-btn btn-small btn-quiet" aria-label="Chat, 12 new">${fa('comments')}<span class="sdk-badge-micro" aria-hidden="true">12</span></button><button type="button" class="sdk-icon-btn btn-small btn-quiet" aria-label="Chat, more than 99 new">${fa('comments')}<span class="sdk-badge-micro" aria-hidden="true">99+</span></button></div></div></div>
  </div>`);

  const phoneBody = () => wrap(chat({ popout: true, style: 'height:640px;--safe-b:34px', composerOpts: { text: 'Dinner at 8?\nI can book the terrace.' } }));

  const aliasBody = () => wrap(`<div class="pm-ch-grid"><div>${CAP('Today\'s message markup, no edit')}<div class="pm-ch-stack">
      <div class="message"><div class="message-head"><span class="message-head-side"><span class="message-portrait">S</span><span class="message-name">Sam</span><span class="message-when">10:41</span></span><span class="message-head-side"><button type="button" class="sdk-more" aria-label="More">${fa('ellipsis-vertical')}</button></span></div><div class="message-body"><div class="text">Anyone checked the hours?</div></div></div>
      <div class="message own"><div class="message-head"><span class="message-head-side"><span class="message-portrait">Y</span><span class="message-name">You</span><span class="message-when">10:42</span></span></div><div class="message-body"><div class="text">Open until 9.</div></div></div>
      <div class="message" data-tint="blue"><div class="message-head"><span class="message-head-side"><span class="message-portrait message-portrait-icon">${fa('map')}</span><span class="message-name">Maps</span><span class="message-command">/map</span></span></div><div class="message-body"><div class="message-quote">Where do we eat?</div><div class="text">Three cafés.</div><div class="chat-link" data-tint="green"><span class="chat-link-img">${fa('image')}</span><div class="chat-link-text"><span class="chat-link-title">Café Marly</span><span class="chat-link-desc">A terrace.</span></div></div></div></div></div></div>
    <div>${CAP('Today\'s composer markup')}<div class="chat-bar"><div class="chat-format-bar"><span class="chat-format-side"><button type="button" class="msg-btn" aria-label="Bold">${fa('bold')}</button><button type="button" class="msg-btn on" aria-label="Italic">${fa('italic')}</button></span><span class="chat-format-side"><button type="button" class="msg-btn" aria-label="Commands">${fa('square-poll-horizontal')}</button></span></div><textarea rows="1" placeholder="Send a message or type / for commands" aria-label="Message"></textarea></div>
      <div class="pm-ch-note">.chat-bar, .chat-format-bar and .msg-btn take the new look.</div></div></div>`);

  const CT_ROWS = [
    ['Words on a message from others', '--text', ['--bg-section', 'color-mix(in srgb, var(--text) 5%, transparent)'], 4.5],
    ['Words on your own message', '--text', ['--bg-section', 'color-mix(in srgb, var(--accent) 10%, transparent)'], 4.5],
    ['Time (11px) on a message from others', 'color-mix(in srgb, var(--text) 78%, var(--text-dim))', ['--bg-section', 'color-mix(in srgb, var(--text) 5%, transparent)'], 4.5],
    ['Time (11px) on your own message', 'color-mix(in srgb, var(--text) 78%, var(--text-dim))', ['--bg-section', 'color-mix(in srgb, var(--accent) 10%, transparent)'], 4.5],
    ['Quote words on its fill, in a message from others', 'color-mix(in srgb, var(--text) 78%, var(--text-dim))', ['--bg-section', 'color-mix(in srgb, var(--text) 5%, transparent)', 'color-mix(in srgb, var(--text) 7%, transparent)'], 4.5],
    ['Quote words on its fill, in your own message', 'color-mix(in srgb, var(--text) 78%, var(--text-dim))', ['--bg-section', 'color-mix(in srgb, var(--accent) 10%, transparent)', 'color-mix(in srgb, var(--text) 7%, transparent)'], 4.5],
    ['A link in a message (the accent mix), from others', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg-section', 'color-mix(in srgb, var(--text) 5%, transparent)'], 4.5],
    ['A link in your own message', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg-section', 'color-mix(in srgb, var(--accent) 10%, transparent)'], 4.5],
    ['A reaction you made: a deeper accent mix on the selected fill', 'color-mix(in srgb, var(--accent) 38%, var(--text))', ['--bg-section', 'color-mix(in srgb, var(--text) 5%, transparent)', '--selected-bg'], 4.5],
    ['Words in the field', '--text', ['--bg-input'], 4.5],
    ['The placeholder (the hint) in the field', '--text-dim', ['--bg-input'], 4.5],
    ['A pressed format button: accent mix on the selected fill', 'color-mix(in srgb, var(--accent) 55%, var(--text))', ['--bg-section', '--selected-bg'], 4.5],
    ['A format button at rest', '--text-dim', ['--bg-section'], 4.5],
    ['A problem sentence in the status line', 'color-mix(in srgb, var(--danger) 70%, var(--text))', ['--bg-section'], 4.5],
    ['Link box words on the card', '--text', ['--bg-card'], 4.5],
    ['Link box site line (11px muted) on the card', '--text-dim', ['--bg-card'], 4.5],
    ['Hairline of the link box on the message', '--border', ['--bg-section', 'color-mix(in srgb, var(--text) 5%, transparent)'], 1],
  ].concat(TINTS.map((t) => [`Portrait icon, ${t}, on its tint fill`, `color-mix(in srgb, var(--tint-${t}) 62%, var(--text))`, ['--bg-section', `color-mix(in srgb, var(--tint-${t}) 22%, var(--bg-section))`], 3]));
  const contrastBody = () => wrap(`<table class="pm-ch-ct"><thead><tr><th>Pair</th><th>Ratio</th><th>Needs</th><th></th></tr></thead><tbody>${CT_ROWS.map((r) => `<tr data-fg="${h(r[1])}" data-bgs="${h(JSON.stringify(r[2]))}" data-min="${r[3]}"><td>${r[0]}</td><td data-out="r"></td><td>${r[3] === 1 ? 'info' : r[3] + ':1'}</td><td data-out="p"></td></tr>`).join('')}</tbody></table>`);
  const measureContrast = (doc) => {
    const host = doc.querySelector('.ds-proposed');
    const cv = doc.createElement('canvas'); cv.width = 1; cv.height = 1;
    const g = cv.getContext('2d', { willReadFrequently: true });
    const col = (expr) => { const p = doc.createElement('span'); p.style.color = expr.startsWith('--') ? `var(${expr})` : expr; host.appendChild(p); const c = getComputedStyle(p).color; p.remove(); return c; };
    const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    const lum = (d) => 0.2126 * lin(d[0]) + 0.7152 * lin(d[1]) + 0.0722 * lin(d[2]);
    const go = () => {
      for (const tr of doc.querySelectorAll('.pm-ch-ct tbody tr')) {
        g.clearRect(0, 0, 1, 1); g.fillStyle = '#000'; g.fillRect(0, 0, 1, 1); g.clearRect(0, 0, 1, 1);
        for (const l of JSON.parse(tr.dataset.bgs)) { g.fillStyle = col(l); g.fillRect(0, 0, 1, 1); }
        const base = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        g.fillStyle = col(tr.dataset.fg); g.fillRect(0, 0, 1, 1);
        const top = g.getImageData(0, 0, 1, 1).data.slice(0, 3);
        const a = lum(top); const b = lum(base);
        const r = (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
        tr.querySelector('[data-out="r"]').textContent = r.toFixed(2) + ':1';
        const min = Number(tr.dataset.min); const p = tr.querySelector('[data-out="p"]');
        p.textContent = min === 1 ? 'Info' : r >= min ? 'Passes' : 'Fails'; p.className = min === 1 ? '' : r >= min ? 'pm-ch-pass' : 'pm-ch-fail';
      }
    };
    doc.fonts.ready.then(go);
    new MutationObserver(() => requestAnimationFrame(go)).observe(doc.documentElement, { attributes: true, attributeFilter: ['data-theme-mode'] });
  };

  // ---- the behaviour of the composers on the page: the field grows to five lines; the live one also sends and offers the commands ----
  const wire = (doc) => {
    const grow = (ta) => { if (!ta.value) { ta.style.height = ''; return; } ta.style.height = 'auto'; const max = parseFloat(getComputedStyle(ta).maxHeight); ta.style.height = Math.min(ta.scrollHeight + 2, max) + 'px'; };
    for (const ta of doc.querySelectorAll('.sdk-composer textarea')) { grow(ta); ta.addEventListener('input', () => grow(ta)); }
    doc.fonts && doc.fonts.ready.then(() => { for (const ta of doc.querySelectorAll('.sdk-composer textarea')) grow(ta); });
    const box = doc.querySelector('[data-live]'); if (!box) return;
    const ta = box.querySelector('textarea'); const list = doc.querySelector('.sdk-messages'); const field = box.querySelector('.sdk-composer-field');
    const note = doc.querySelector('#chat-status [role="status"]');
    let menu = null; let at = 0;
    const closeMenu = () => { if (menu) { menu.remove(); menu = null; } ta.removeAttribute('aria-expanded'); };
    const items = () => [...menu.querySelectorAll('.sdk-menu-item')];
    const mark = () => items().forEach((b, i) => { b.classList.toggle('active', i === at); b.setAttribute('aria-selected', String(i === at)); });
    const openMenu = () => {
      const q = ta.value.slice(1).toLowerCase();
      const found = CMDS.filter((c) => c[0].slice(1).startsWith(q));
      if (!found.length) { closeMenu(); return; }
      if (!menu) { box.insertAdjacentHTML('beforeend', `<div class="sdk-menu sdk-composer-menu" role="listbox" aria-label="Commands"></div>`); menu = box.lastElementChild; }
      menu.innerHTML = found.map(menuItem).join(''); at = 0; ta.setAttribute('aria-expanded', 'true');
      for (const b of items()) b.addEventListener('mousedown', (e) => { e.preventDefault(); pick(b); });
    };
    const pick = (b) => { ta.value = b.querySelector('.sdk-menu-label').textContent + ' '; closeMenu(); grow(ta); ta.focus(); };
    const send = () => {
      const t = ta.value.trim(); if (!t) return;
      const time = new Date().toTimeString().slice(0, 5);
      list.insertAdjacentHTML('beforeend', msg({ who: 'You', own: true, time, text: t.split('\n').map((l) => `<p>${h(l)}</p>`).join('') }));
      ta.value = ''; grow(ta); closeMenu(); list.scrollTop = list.scrollHeight; if (note) note.textContent = 'Sent';
    };
    ta.addEventListener('input', () => { if (/^\/\S*$/.test(ta.value)) openMenu(); else closeMenu(); });
    ta.addEventListener('keydown', (e) => {
      if (menu && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { e.preventDefault(); const n = items().length; at = (at + (e.key === 'ArrowDown' ? 1 : n - 1)) % n; mark(); return; }
      if (menu && (e.key === 'Enter' || e.key === 'Tab') && !e.shiftKey) { e.preventDefault(); pick(items()[at]); return; }
      if (e.key === 'Escape' && menu) { e.preventDefault(); closeMenu(); return; }
      if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send(); }
    });
  };

  const widthBody = () => wrap(`<div style="max-width:560px">${chat({ style: 'height:520px' })}</div>`);

  function renderChat(api) {
    const { mk } = api;
    const block = mk('section', 'ds-block ds-spec');
    const tbl = (head, rows) => `<table class="ds-table"><thead><tr>${head.map((c) => `<th>${c}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const dim = (rows) => `<table class="ds-table"><tbody>${rows.map((r) => `<tr>${r.map((c, i) => (i === 0 ? `<td><b>${c}</b></td>` : `<td>${c}</td>`)).join('')}</tr>`).join('')}</tbody></table>`;
    const code = (s) => `<pre class="ds-pre">${h(s)}</pre>`;
    block.innerHTML = `<header><h3 id="chat-h"><a href="#chat">Chat: message and composer</a></h3><span class="ds-status-chip ds-st-approved">Approved</span><span class="ds-count">the message, its parts and cards, the composer, the format bar, the status line</span></header>
<p class="ds-desc"><b>Decided 2026-10-21: approved as drawn.</b> Two new components. <b>Message</b>: others a 5% text fill, your own a 10% accent fill; a 22px portrait, the name 12px weight 600, the time 11px, body 14px; a command or AI message has its tint on the portrait icon only (no left bar); a quote is a nested neutral fill; reactions are Chips tags; an object card and a link box are the approved Cards. <b>Composer</b>: the approved text area on the field step, Enter sends, Shift+Enter is a new line, five lines at most; a format bar of icon-only Quiet small buttons; the commands are the Menus popover; the status line is the module's.</p>
<nav class="ds-toc" aria-label="In this family"><a href="#chat-conversation">Conversation</a><a href="#chat-parts">Message parts</a><a href="#chat-composer">Composer</a><a href="#chat-live">Live composer</a><a href="#chat-statusline">Status line</a><a href="#chat-unread">Unread</a><a href="#chat-phone">On a phone</a><a href="#chat-contrast">Contrast</a><a href="#chat-map">Today to proposed</a><a href="#chat-alias">Aliases</a><a href="#chat-tokens">Tokens</a><a href="#chat-contract">Markup</a><a href="#chat-widths">Widths</a><a href="#chat-decided">Decided 2026-10-21</a></nav>

<h4 class="ds-h4" id="chat-conversation">A conversation</h4>
<p class="ds-desc">Own and others, a tinted AI message with its object card, a quote, a link box, reactions. The Chat header is the Module window's title bar.</p>
<div data-slot="conversation"></div>
${dim([
    ['1 Message', 'A 5% <code>--text</code> fill (others), a 10% <code>--accent</code> fill (own); <code>--radius-medium</code>; padding 4px 8px 8px 12px. One fill for the whole message: the shaded head band is gone.'],
    ['2 Head', 'A 22px portrait (a page-local copy of the Avatars size), the name 12px weight 600, an optional command 11px 600, the time 11px muted, and at the end the "..." (the Quiet small icon button, 30px; today 24px). The head is 30px high.'],
    ['3 Body', '14px on 20px (the type scale); paragraphs 8px apart; code 13px; a link in the accent mix, underlined. Long words wrap.'],
    ['4 Tint', 'Only on the portrait: a 22% tint fill behind the icon and the icon in the readable mix. The message stays neutral.'],
    ['5 Quote', 'A nested neutral fill (<code>--text</code> 7% over the message), <code>--radius-small</code>, 12px. Not a 2px rule.'],
    ['6 Hover actions', 'A small slot at the top right, left of the "...": react, reply, keep. It floats (no width taken), shows on hover and when focus is inside, and is not drawn on a phone (640px and below), where the "..." menu holds the same.'],
  ])}

<h4 class="ds-h4" id="chat-parts">Message parts</h4>
<div data-slot="parts"></div>

<h4 class="ds-h4" id="chat-composer">Composer</h4>
<div data-slot="composer"></div>

<h4 class="ds-h4" id="chat-live">Live composer</h4>
<div data-slot="live"></div>

<h4 class="ds-h4" id="chat-statusline">Status line</h4>
<div data-slot="status"></div>

<h4 class="ds-h4" id="chat-unread">Attention and unread</h4>
<p class="ds-desc">An unread number is the Chips count after a label (18px, neutral) and the micro count on an icon (14px, 9px numbers, 3px inset); where a number is not useful, the 7px dot. Capped at 99+.</p>
<div data-slot="unread"></div>

<h4 class="ds-h4" id="chat-phone">On a phone (390 wide)</h4>
<p class="ds-desc">The field is 44px with 16px words (so the page does not zoom); the "..." keeps its 30px look with a 44px hit area; the link photo is 52px; the hover actions are not drawn.</p>
<div data-slot="phone"></div>

<h4 class="ds-h4" id="chat-contrast">Contrast</h4>
<p class="ds-desc">Worked out in the page from the computed colours, in the current mode (WCAG 2). Text needs 4.5 to 1, an icon 3 to 1. The fills are translucent, so each pair is worked out over the window and the fills under it.</p>
<div data-slot="contrast"></div>

<h4 class="ds-h4" id="chat-map">Today to proposed</h4>
${tbl(['Today', 'Proposed'], [
    ['<code>.message</code> fills: 5% text, 10% accent for <code>.own</code>; a shaded head band (<code>.message-head</code>: 8% and 22% over <code>--bg</code>, with a rounded top)', 'The same two fills, kept, for the whole message. The head band is gone.'],
    ['<code>.message[data-tint]</code>: a 3px coloured left edge and the tint on the portrait icon', 'The tint on the portrait only. No edge.'],
    ['<code>.message .chat-link</code>: a 3px left edge in the tint, an 8px 10px padding, a 72px picture', '<code>.sdk-linkbox</code>: a card (a 1px hairline, padding 12, no edge) with an icon or a photo tile, 72px and 52px on a phone.'],
    ['<code>.message-quote</code> and <code>.message .text blockquote</code>: a 2px left rule', 'A nested neutral fill with the small corner.'],
    ['Names and commands at weight 650 (<code>.message-name</code>, <code>.message-command</code>, <code>.message-vis</code>)', 'Weight 600. The name is 12px, the time 11px.'],
    ['<code>.chat-bar</code>: <code>--shade</code> fill, an edge on the left and the top', 'The window\'s step with one hairline on top; the field is the approved text area on the field step.'],
    ['<code>.chat-format-bar .msg-btn</code>: 13px buttons; <code>.message-head .sdk-more</code> 24px', 'Icon-only Quiet small buttons, 30px; "on" is the selected fill.'],
    ['<code>.message .actions</code>: a pale box, shown on hover', 'A slot with a hairline and the card fill at the top right, hover and focus inside; not on a phone.'],
    ['<code>.chat-command-menu</code>, <code>.chat-help-popup</code>, <code>.chat-emoji-popup</code>: three surfaces', 'One: the Menus popover (<code>.sdk-menu</code> for the commands, the popover surface for help and emoji).'],
    ['<code>.chat-view-count</code> and the Assistant dot', 'The Chips count (<code>.sdk-tab-badge</code>) and the dot (<code>.sdk-tab-dot</code>); the micro count on an icon-only tab.'],
    ['The status line, <code>#chat-status</code> (<code>.mod-status</code>)', 'The Module window\'s status line, unchanged in its parts; a problem is a plain sentence in the readable red.'],
  ])}

<h4 class="ds-h4" id="chat-alias">Aliases</h4>
${tbl(['Component', 'New name', 'Older names that take the same rules'], [
    ['Message', '<code>.sdk-message</code> (<code>-head</code>, <code>-who</code>, <code>-portrait</code>, <code>-name</code>, <code>-command</code>, <code>-time</code>, <code>-tools</code>, <code>-actions</code>, <code>-body</code>, <code>-text</code>, <code>-quote</code>)', '<code>.message</code>, <code>.message-head</code>, <code>.message-portrait</code>, <code>.message-name</code>, <code>.message-command</code>, <code>.message-when</code>, <code>.message .actions</code>, <code>.message-body</code>, <code>.message .text</code>, <code>.message-quote</code>'],
    ['Link box', '<code>.sdk-linkbox</code> (<code>-photo</code>, <code>-text</code>, <code>-title</code>, <code>-desc</code>, <code>-site</code>, <code>-keep</code>)', '<code>.message .chat-link</code> and its <code>-img</code>, <code>-text</code>, <code>-title</code>, <code>-desc</code>, <code>-site</code>, <code>-keep</code>'],
    ['Composer', '<code>.sdk-composer</code>, <code>.sdk-format-bar</code>', '<code>.chat-bar</code>, <code>.chat-format-bar</code>; the buttons <code>.msg-btn</code> (Buttons)'],
    ['Popovers', '<code>.sdk-menu</code>, the popover surface', '<code>.chat-command-menu</code>, <code>.chat-help-popup</code>, <code>.chat-emoji-popup</code>'],
  ])}
<div data-slot="alias"></div>

<h4 class="ds-h4" id="chat-tokens">Tokens</h4>
${tbl(['Token', 'Value', 'Used for'], [
    ['<code>--msg-fill</code> <code>--msg-fill-own</code>', '<code>--text</code> 5%, <code>--accent</code> 10%', 'The message fills. Proposed tokens (the values are today\'s).'],
    ['<code>--msg-quote-fill</code>', '<code>--text</code> 7%', 'The nested quote. Proposed token.'],
    ['<code>--msg-meta</code>', '<code>--text</code> 78% into <code>--text-dim</code>', 'The time and the command word: muted, but 4.5 to 1 on both message fills (plain <code>--text-dim</code> is 4.1 on them). Proposed token.'],
    ['<code>--msg-portrait</code>', '22px', 'The portrait in a message (until the Avatars family sets it). Proposed token.'],
    ['<code>--composer-lines</code> <code>--composer-lh</code> <code>--composer-pad-y</code>', '5, 20px (22px on a phone), 8px (10px on a phone)', 'The field\'s growth: one line is 38px (44px on a phone), five lines 118px (132px). Proposed tokens.'],
    ['<code>--bg-section</code> <code>--bg-card</code> <code>--bg-input</code> <code>--border</code> <code>--selected-bg</code> <code>--tint-*</code>', 'the theme\'s', 'The window, the cards, the field, the hairlines, the selected fill, the portrait tint.'],
    ['<code>--shadow-2</code>', '0 4px 12px', 'The help and emoji popovers (the Menus shadow).'],
  ])}

<h4 class="ds-h4" id="chat-contract">Markup</h4>
${code(`<div class="sdk-message own" data-tint="blue">          <!-- own: your message; data-tint: a command or AI message -->
  <div class="sdk-message-head">
    <span class="sdk-message-who">
      <span class="sdk-message-portrait" aria-hidden="true">S</span>
      <span class="sdk-message-name">Sam</span><span class="sdk-message-command">/map</span>
      <time class="sdk-message-time">10:41</time>
    </span>
    <span class="sdk-message-tools"><button class="sdk-icon-btn btn-small btn-quiet" aria-label="More">...</button></span>
  </div>
  <span class="sdk-message-actions" role="group" aria-label="Message actions">...icon buttons...</span>
  <div class="sdk-message-body">
    <p class="sdk-message-quote">The question</p>
    <div class="sdk-message-text"><p>The words.</p></div>
    <div class="sdk-card">...</div>                 <!-- an object card -->
    <div class="sdk-card sdk-linkbox">...</div>     <!-- a link box -->
    <div class="sdk-message-reactions">...Chips tags (button.sdk-chip-tag, aria-pressed)...</div>
  </div>
</div>

<div class="sdk-composer">
  <div class="sdk-format-bar" role="toolbar" aria-label="Format">...icon buttons, aria-pressed when on...</div>
  <div class="sdk-composer-field">
    <textarea rows="1" maxlength="1000" placeholder="Send a message or type / for commands" enterkeyhint="send"></textarea>
    <div class="sdk-menu sdk-composer-menu" role="listbox">...</div>   <!-- while "/" is typed -->
  </div>
</div>
<div class="sdk-status-line chat-status" id="chat-status" role="region" aria-label="Chat status">...</div>`)}
${dim([
    ['Sending', 'Enter sends; Shift+Enter is a new line; no Send button. The field grows to five lines, then scrolls (the page script shows how: <code>height</code> from <code>scrollHeight</code>, capped by <code>max-height</code>).'],
    ['Commands', 'A "/" at the start opens the commands in a <code>.sdk-menu</code> above the field; the arrow keys move, Enter or Tab picks, Escape closes.'],
    ['Disabled', '<code>disabled</code> on the field and the format buttons, <code>aria-disabled="true"</code> on the composer, and the placeholder says why.'],
    ['Live regions', 'The status line\'s connection and notice are <code>aria-live="polite"</code>.'],
  ])}

<h4 class="ds-h4" id="chat-widths">Widths</h4>
<div data-slot="widths"></div>

<h4 class="ds-h4" id="chat-decided">Decided 2026-10-21</h4>
<p class="ds-desc">Thomas approved every choice below, as drawn, on 2026-10-21.</p>
${tbl(["Decided as drawn","Why"], [
    ["Body 14px, meta 11 and 12 (today 13px)","The type scale's default UI and body size; a chat is read, so it takes the body size."],
    ["The portrait is 22px, a page-local copy","The Avatars family is built at the same time and decides the size."],
    ["The \"...\" is always visible; the hover slot adds react, reply and keep","The \"...\" is the one action that works on a phone. The slot takes no room."],
    ["A reaction is a Chips tag (24px) with a count; yours is the selected fill","Tags are 24px and may be pressed; the choice chip (30px) is large for a line of messages."],
    ["The quote is a fill of <code>--text</code> at 7%, with 12px words","One surface step in, quieter than the message."],
    ["The format bar is above the field and the command menu opens above it","It is where they are today."],
    ["Enter sends on a phone too","The field says \"send\" on the keyboard (<code>enterkeyhint</code>); a new line is Shift+Enter or the keyboard's own."],
  ])}
`;
    const slot = (n) => block.querySelector(`[data-slot="${n}"]`);
    const F = (body, title, o) => api.makeFrame('app', body, Object.assign({ proposed: true, title, css: PM_CSS + CH_CSS, onload: wire }, o || {}));
    slot('conversation').appendChild(F(conversationBody(), 'Chat, conversation'));
    slot('parts').appendChild(F(partsBody(), 'Chat, message parts'));
    slot('composer').appendChild(F(composerBody(), 'Chat, composer states'));
    slot('live').appendChild(F(liveBody(), 'Chat, live composer'));
    slot('status').appendChild(F(statusBody(), 'Chat, status line'));
    slot('unread').appendChild(F(unreadBody(), 'Chat, unread'));
    slot('phone').appendChild(F(phoneBody(), 'Chat, phone', { pinWidth: 390 }));
    slot('contrast').appendChild(F(contrastBody(), 'Chat, contrast', { onload: measureContrast }));
    slot('alias').appendChild(F(aliasBody(), 'Chat, aliases'));
    const ws = mk('div', '');
    for (const w of [390, 700, 1280]) {
      ws.appendChild(mk('p', 'ds-ctx', `${w} wide (fixed)`));
      ws.appendChild(F(widthBody(), `Chat at ${w}`, { pinWidth: w }));
    }
    slot('widths').appendChild(ws);
    return block;
  }

  window.DS_PROPOSED.families.push({
    id: 'chat', covers: ['message', 'composer', 'chat-bar', 'chat-link', 'message-quote', 'format-bar'], group: 'Containers', name: 'Chat: message and composer', status: 'approved',
    words: 'chat message messages composer input text area format bar send enter shift reaction reactions quote link box object card tint portrait ai assistant command menu emoji help status unread hover actions phone left bar msg-btn chat-bar chat-link', render: renderChat,
  });
})();
