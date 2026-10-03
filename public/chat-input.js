// Chat's one input: ordinary messages, /ai, module commands, and paste import.
// Chat never names a module; commands and Keep actions come from the space APIs.

const OBJECT_MIME = 'application/x-host-object';
const KIND_PLURAL = {
  flight: 'flights', train: 'trains', bus: 'buses', ferry: 'ferries', car: 'cars',
  hotel: 'hotels', restaurant: 'restaurants', cafe: 'cafes', bar: 'bars',
  sight: 'sights', museum: 'museums', tour: 'tours', show: 'shows', note: 'notes',
};

function oneLine(s, n) {
  return String(s || '').replace(/\s+/g, ' ').trim().slice(0, n);
}

function keptText(summary, { question, sourceNames } = {}) {
  const imported = summary && summary.basis === 'imported';
  const extras = [];
  if (!imported) {
    const q = String(question || '').trim();
    const names = (sourceNames || []).filter(Boolean);
    if (q) extras.push(`Asked: ${q}`);
    if (names.length) extras.push(`From: ${names.join(', ')}`);
  }
  const links = (summary && summary.links) || [];
  if (links.length) {
    extras.push('Links:');
    for (const l of links) extras.push(`- ${l.title}: ${l.url}`);
  }
  if (imported) extras.push('External source');
  const suffix = extras.length ? `\n\n${extras.join('\n')}` : '';
  let content = String((summary && summary.content) || '').trim();
  if (content.length + suffix.length > 8000) content = content.slice(0, Math.max(0, 8000 - suffix.length - 1)) + '…';
  return content + suffix;
}

function keepInput(summary, question) {
  return {
    title: oneLine((summary && summary.title) || '', 120) || 'Untitled',
    body: keptText(summary, { question }),
    tags: ((summary && summary.tags) || []).join(', '),
    icon: (summary && summary.icon) || '',
    kind: (summary && summary.kind) || '',
  };
}

function suggestionInput(summary) {
  return {
    title: oneLine((summary && summary.title) || '', 120) || 'Untitled',
    kind: (summary && summary.kind) || '',
    content: keptText(summary, {}),
    place: (summary && summary.place && summary.place.name) || '',
    date: (summary && summary.date) || '',
  };
}

function findKeepers(actions) {
  const note = actions.find((a) => a.name === 'saveNote' && a.input && a.input.title && a.input.body);
  const suggestion = actions.find((a) => a.name === 'acceptSuggestion' && a.input && a.input.title && a.input.kind);
  return { note, suggestion };
}

// An AI answer as the pieces to draw, in order: { text } and { summary: index }.
// Same split the Assistant uses, so a {{summary:N}} marker becomes a preview.
function answerParts(text, summaryCount) {
  const parts = [];
  const drawn = new Set();
  let last = 0;
  const re = /\{\{summary:(\d+)\}\}/g;
  let m;
  const push = (s) => { const t = s.trim(); if (t) parts.push({ text: t }); };
  const src = String(text || '');
  while ((m = re.exec(src))) {
    const n = Number(m[1]);
    if (!(n < summaryCount) || drawn.has(n)) continue;
    push(src.slice(last, m.index));
    parts.push({ summary: n });
    drawn.add(n);
    last = m.index + m[0].length;
  }
  push(src.slice(last));
  for (let i = 0; i < summaryCount; i += 1) if (!drawn.has(i)) parts.push({ summary: i });
  return parts;
}

// Puts a chat popup just above its button, shifted so the whole of it stays on screen. Fixed, so the
// chat column cannot clip it.
export function placeAbove(popup, anchor) {
  if (!popup || !anchor) return;
  const view = popup.ownerDocument.defaultView;
  popup.style.right = 'auto';
  popup.style.bottom = 'auto';
  popup.style.margin = '0';
  const box = anchor.getBoundingClientRect();
  const w = popup.offsetWidth;
  const h = popup.offsetHeight;
  let left = box.right - w;
  let top = box.top - h - 6;
  if (top < 8) top = box.bottom + 6;
  left = Math.max(8, Math.min(left, view.innerWidth - w - 8));
  top = Math.max(8, Math.min(top, view.innerHeight - h - 8));
  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

// The marker an AI answer uses for an object preview, {{summary:N}}. Only an AI answer turns it into a preview; an
// ordinary message drops it (the "AI answer shared by" copies from before plan-chat-model.md, decision 16).
export function stripSummaryMarkers(text) {
  return String(text || '').replace(/[ \t]*\{\{summary:\d+\}\}/g, '');
}

// The filter at the top of Chat (plan-chat-model.md, decision 2): what you see, never what is posted. Pure, for the checks.
export const CHAT_FILTERS = ['all', 'private', 'public'];
export const filterKey = (spaceId) => `chat-filter:${spaceId}`;
export function readFilter(value) {
  return CHAT_FILTERS.includes(value) ? value : 'all';
}
// The line Chat shows when the filter leaves nothing to show, or ''.
export function emptyLine(filter, visibilities) {
  if (filter === 'all') return '';
  return visibilities.some((v) => v === filter) ? '' : `No ${filter} messages here yet.`;
}

// Clear… (plan-chat-clear.md, #166): the types, the scopes and the counts, from the messages the page holds. Pure, for
// the checks. The filter plays no part (decision 7): a type takes public and private messages alike.
//
// The type a held message belongs to: 'chat', 'ai', 'module:<id>', 'other' (a stored command with no module, which only
// All takes, as on the server), or '' when there is nothing to clear: a picture (never stored), a guest's echo drawn
// here only, an old copy kept in this browser.
export function clearTypeOf(entry) {
  if (!entry || !entry.stored || entry.blob) return '';
  if (!entry.kind) return 'chat';
  if (entry.kind === 'ai' || entry.command === 'ai') return 'ai';
  if (entry.kind === 'command' && entry.module) return `module:${entry.module}`;
  return 'other';
}
// Whether a held message is of a clear's type ({ type, module } as the route takes them).
export function ofClearType(entry, type, module) {
  const t = clearTypeOf(entry);
  if (!t) return false;
  if (type === 'all') return true;
  if (type === 'module') return Boolean(module) && t === `module:${module}`;
  return t === type;
}
// 'mine': the person's own, public and private. 'everyone': every public message and the person's own private ones,
// never someone else's private one (decision 4; the page never holds one anyway).
export function inClearScope(entry, scope, by) {
  if (!by || !entry) return false;
  if (scope === 'mine') return entry.by === by;
  if (scope === 'everyone') return entry.visibility !== 'private' || entry.by === by;
  return false;
}
// What Clear… lists, in order: Chat messages, AI, each module (as first held), then All. Each is
// { type, module?, command?, mine, everyone }; only the types with something the person could clear are listed (a
// moderator: everyone's; anyone else: their own). Empty when there is nothing, and then Clear… is not offered.
export function clearChoices(entries, { by, moderator = false } = {}) {
  const found = new Map();
  const all = { type: 'all', mine: 0, everyone: 0 };
  for (const entry of entries || []) {
    const t = clearTypeOf(entry);
    if (!t) continue;
    const mine = inClearScope(entry, 'mine', by) ? 1 : 0;
    const everyone = inClearScope(entry, 'everyone', by) ? 1 : 0;
    all.mine += mine;
    all.everyone += everyone;
    if (t === 'other') continue;
    if (!found.has(t)) {
      found.set(t, t.startsWith('module:')
        ? { type: 'module', module: t.slice(7), command: entry.command || '', mine: 0, everyone: 0 }
        : { type: t, mine: 0, everyone: 0 });
    }
    const choice = found.get(t);
    choice.mine += mine;
    choice.everyone += everyone;
  }
  const order = [found.get('chat'), found.get('ai'), ...[...found].filter(([t]) => t.startsWith('module:')).map(([, c]) => c)];
  const listed = order.filter((c) => c && (moderator ? c.everyone : c.mine) > 0);
  if (!listed.length) return [];
  return [...listed, all];
}
// A clear of type chat or all also takes pictures: the person's own for 'mine', every one for 'everyone'. Pictures are
// never stored, so this is each page's own work.
export function clearTakesPicture(entry, { type, scope, by }) {
  if (!entry || !entry.blob || (type !== 'chat' && type !== 'all')) return false;
  return scope === 'everyone' || Boolean(by && entry.by === by);
}
// What a chat-clear-some notice takes from a page: the listed ids (never a picture by id), and pictures as
// clearTakesPicture says. A notice from another person's page (`fromPage`) speaks only for that person: it takes only
// `by`'s own, whatever its scope says. A clear of everyone's comes from the server's notice, which has no sender.
export function clearNoticeTakes(entry, { ids, type, scope, by, fromPage = false }) {
  if (!entry || !by) return false;
  if (fromPage && entry.by !== by) return false;
  const listed = Boolean(entry.id && ids && ids.has(entry.id) && !entry.blob);
  return listed || clearTakesPicture(entry, { type, scope: fromPage ? 'mine' : scope, by });
}

export function attachChatInput({ $, api, word, getSpace, getMe, canvas, resizeChatInput, renderMarkup, frameMessage, addStored }) {
  const input = () => $('chat-input');
  // The field's hint when nothing is typed, on one line: the full one when it fits the field, else a shorter one
  // (the wider Send button leaves a narrow chat a narrow field). A command's own hint is left alone.
  const HINTS = ['Chat or type / for commands...', 'Chat, or / for commands', 'Chat'];
  let hintCtx = null;
  function defaultHint() {
    const el = input();
    const cs = el && getComputedStyle(el);
    const free = el ? el.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) : 0;
    if (!(free > 0)) return HINTS[0];
    hintCtx ||= document.createElement('canvas').getContext('2d');
    if (!hintCtx) return HINTS[0];
    hintCtx.font = `${cs.fontStyle} ${cs.fontWeight} ${cs.fontSize} ${cs.fontFamily}`;
    return HINTS.find((h) => hintCtx.measureText(h).width <= free) || HINTS[HINTS.length - 1];
  }
  function fitHint() {
    const el = input();
    if (el && (!el.placeholder || HINTS.includes(el.placeholder))) el.placeholder = defaultHint();
  }
  if (input() && typeof ResizeObserver === 'function') new ResizeObserver(fitHint).observe(input());
  const note = () => $('chat-note');
  const importBtn = () => $('chat-import');
  let pendingImport = null;
  let aiContext = [];
  let lastActions = [];
  let filter = 'all';

  function spaceId() {
    const s = getSpace();
    return s && !s.isAside ? s.id : null;
  }

  function setNote(text) {
    const el = note();
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
  }

  function commandList() {
    const list = [];
    list.push({ name: 'ai', label: 'Ask the AI', module: null, moduleName: 'AI', icon: 'robot', hint: 'a question for the AI', action: null });
    for (const m of canvas.list()) {
      for (const c of m.commands || []) {
        list.push({
          name: c.name,
          label: c.label,
          module: m.id,
          moduleName: m.displayName || m.name,
          icon: /^[a-z0-9-]{1,40}$/.test(m.icon || '') ? m.icon : '',
          hint: c.hint || '',
          action: c.action,
        });
      }
    }
    return list;
  }

  function parseCommand(raw) {
    const text = String(raw || '');
    const m = /^\/([a-z0-9]{1,12})(?:\s+([\s\S]*))?$/.exec(text.trim());
    if (!m) return null;
    return { name: m[1], rest: (m[2] || '').trim(), raw: text };
  }

  function matchesFor(name) {
    return commandList().filter((c) => c.name === name);
  }

  function hidePicker() {
    $('chat-command-wrap')?.querySelector('#chat-command-menu')?.remove();
  }

  function showPicker() {
    const items = commandList();
    const byName = new Map();
    for (const c of items) {
      const key = c.name;
      if (!byName.has(key)) byName.set(key, []);
      byName.get(key).push(c);
    }
    const menu = document.createElement('div');
    menu.className = 'chat-command-menu';
    menu.id = 'chat-command-menu';
    for (const [name, group] of byName) {
      for (const c of group) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'chat-command-item';
        const label = group.length > 1 && c.moduleName ? `/${name} (${c.moduleName})` : `/${name}`;
        b.textContent = `${label} — ${c.label}`;
        b.addEventListener('click', () => {
          input().value = `/${name} `;
          input().focus();
          if (c.hint) input().placeholder = c.hint;
          hidePicker();
          resizeChatInput();
        });
        menu.appendChild(b);
      }
    }
    hidePicker();
    $('chat-command-wrap').appendChild(menu);
    const command = $('chat-command');
    const wrap = $('chat-command-wrap');
    const more = $('chat-format-more');
    placeAbove(menu, (wrap?.dataset.collapsed && more && !more.hidden) ? more : command);
    const close = (ev) => {
      if (ev.target.closest('#chat-command-wrap')) return;
      hidePicker();
      document.removeEventListener('pointerdown', close, true);
    };
    document.addEventListener('pointerdown', close, true);
  }

  // --- the filter: All | Private | Public (plan-chat-model.md, "The filter") ---
  // #messages carries data-filter and each message data-vis; style.css hides the rest, so changing it fetches nothing
  // and a message that arrives or changes visibility follows it at once. Remembered per space for the browser session.
  function setFilter(next) {
    filter = readFilter(next);
    const id = spaceId();
    if (id) {
      try { sessionStorage.setItem(filterKey(id), filter); } catch { /* not remembered */ }
    }
    for (const f of CHAT_FILTERS) {
      const el = $(`chat-filter-${f}`);
      if (!el) continue;
      el.classList.toggle('on', f === filter);
      el.setAttribute('aria-pressed', f === filter ? 'true' : 'false');
    }
    const list = $('messages');
    if (list) list.dataset.filter = filter;
    syncEmpty();
  }

  function loadFilter() {
    const id = spaceId();
    let next = 'all';
    if (id) {
      try { next = readFilter(sessionStorage.getItem(filterKey(id))); } catch { /* the default */ }
    }
    setFilter(next);
  }

  // Shown to everyone who can read Chat in a space, guests too; not in an aside, which keeps nothing.
  function setFilterVisible(on) {
    const g = $('chat-filter');
    if (!g) return;
    g.hidden = !on;
    if (!on) { const list = $('messages'); if (list) list.dataset.filter = 'all'; syncEmpty(); return; }
    loadFilter();
    // The shared view switch's fit (public/sdk/host.js): icons only while the chat is too narrow for the words.
    if (window.hostSwitch) window.hostSwitch.watch(g);
  }

  // "No private messages here yet." while the filter leaves nothing to show.
  function syncEmpty() {
    const list = $('messages');
    if (!list) return;
    let line = list.querySelector(':scope > .chat-filter-empty');
    const text = emptyLine(list.dataset.filter || 'all', [...list.querySelectorAll(':scope > .message')].map((m) => m.dataset.vis));
    if (!text) { line?.remove(); return; }
    if (!line) {
      line = document.createElement('p');
      line.className = 'chat-filter-empty';
    }
    line.textContent = text;
    if (line.parentNode !== list || line !== list.lastElementChild) list.appendChild(line);
  }
  const messagesEl = $('messages');
  if (messagesEl && typeof MutationObserver === 'function') {
    new MutationObserver((records) => {
      if (records.every((r) => [...r.addedNodes, ...r.removedNodes].every((n) => n.classList?.contains('chat-filter-empty')) && r.type === 'childList')) return;
      syncEmpty();
    }).observe(messagesEl, { childList: true, attributes: true, subtree: true, attributeFilter: ['data-vis'] });
  }

  // On entering a space: the filter, and whether this space can keep a pasted import. Private and public messages
  // alike come from GET .../chat (space.js, renderChatHistory); there is no separate AI thread to load any more.
  async function loadThread() {
    setFilterVisible(Boolean(spaceId()));
    if (!spaceId() || !getMe()) return;
    await refreshImport();
  }

  function objectPreview(summary, question, onKept) {
    const el = document.createElement('article');
    el.className = 'chat-object';
    if (summary.kind) el.dataset.kind = summary.kind;
    const title = document.createElement('h3');
    title.textContent = oneLine(summary.title, 120) || 'Untitled';
    el.appendChild(title);
    const content = String((summary && summary.content) || '').trim();
    if (content) {
      const body = document.createElement('div');
      body.className = 'chat-object-body';
      body.innerHTML = renderMarkup(content);
      el.appendChild(body);
    }
    const meta = [];
    const place = summary.place && (summary.place.name || summary.place);
    if (place) meta.push(String(place));
    if (summary.date) meta.push(String(summary.date));
    if (summary.kind) meta.push(String(summary.kind));
    if (meta.length) {
      const line = document.createElement('p');
      line.className = 'chat-object-meta';
      line.textContent = meta.join(' · ');
      el.appendChild(line);
    }
    const links = (summary && summary.links) || [];
    if (links.length) {
      const list = document.createElement('p');
      list.className = 'chat-object-meta';
      list.textContent = links.map((l) => l.title || l.url).filter(Boolean).join(' · ');
      el.appendChild(list);
    }
    if (summary && summary.basis === 'imported') {
      const basis = document.createElement('p');
      basis.className = 'chat-object-meta';
      basis.textContent = 'From another AI: check it before you rely on it';
      el.appendChild(basis);
    }
    const keep = document.createElement('button');
    keep.type = 'button';
    keep.className = 'msg-btn chat-object-keep';
    keep.textContent = 'Keep';
    keep.addEventListener('click', async () => {
      await keepOne(summary, question, keep);
      if (onKept) onKept(keep);
    });
    el.appendChild(keep);
    return el;
  }

  // How a command's message looks: its module's icon and colour, looked up when drawn (never stored), so a module's
  // new colour reaches its old messages. /ai and an AI answer are the host's: the robot, in gold (decision 4).
  function commandLook({ kind, command, module } = {}) {
    if (kind === 'ai' || command === 'ai') return { icon: 'robot', tint: 'gold', label: '/ai' };
    const m = module ? canvas.list().find((x) => x.id === module) : null;
    const icon = m && /^[a-z0-9-]{1,40}$/.test(m.icon || '') ? m.icon : 'terminal';
    return { icon, tint: canvas.colorOf ? canvas.colorOf(module) : null, label: command ? `/${command}` : '' };
  }

  // An AI answer's body: its text with each {{summary:N}} drawn as a preview with Keep, for anyone who can keep (the
  // space's actions), the author or not. `question` is what Keep records as asked: the asker's question when it is
  // known (the author's page, or the public answer's quote).
  function answerBody(text, summaries, question) {
    const body = document.createElement('div');
    body.className = 'message-body text';
    const objects = Array.isArray(summaries) ? summaries : [];
    if (!objects.length) {
      body.innerHTML = renderMarkup(String(text || ''));
      return body;
    }
    for (const p of answerParts(text, objects.length)) {
      if (p.summary !== undefined) body.appendChild(objectPreview(objects[p.summary], question || ''));
      else {
        const t = document.createElement('div');
        t.innerHTML = renderMarkup(p.text);
        body.appendChild(t);
      }
    }
    return body;
  }

  async function refreshActions() {
    const id = spaceId();
    if (!id) { lastActions = []; return; }
    try {
      lastActions = (await api('GET', `/api/spaces/${encodeURIComponent(id)}/actions`)).actions || [];
    } catch {
      lastActions = [];
    }
  }

  async function keepOne(summary, question, btn) {
    await refreshActions();
    const { note, suggestion } = findKeepers(lastActions);
    const placer = (summary.kind && suggestion) ? suggestion : note;
    if (!placer) { setNote('Nothing here can keep that yet.'); return; }
    const input = placer.name === 'acceptSuggestion' ? suggestionInput(summary) : keepInput(summary, question);
    try {
      const out = await api('POST', `/api/spaces/${encodeURIComponent(spaceId())}/action`, { action: placer.action, input });
      if (btn) {
        btn.classList.add(out.status === 'queued' ? 'queued' : 'kept');
        if (out.status === 'queued') btn.title = `Waiting: it is kept when that ${word('module')} is next open`;
      }
    } catch (err) {
      setNote(err.message || 'Could not keep that.');
    }
  }

  async function askAbout({ question, refs } = {}) {
    const q = String(question || '').trim();
    if (!q) { setNote('Type a question after /ai.'); return { ok: false }; }
    const prev = aiContext;
    aiContext = (refs || []).filter((r) => r && r.module && r.id).map((ref) => ({ ref }));
    try {
      input().focus();
      const ok = await runAi(q);
      return { ok };
    } finally {
      aiContext = prev;
    }
  }

  // The question and the answer come back stored, both private (plan-chat-model.md, decision 1): drawn from what the
  // server returns, never a copy made here. Nothing is posted to the chat; the author makes the answer public with its
  // badge.
  async function runAi(question) {
    const id = spaceId();
    if (!id) { setNote(`AI is only in ${word('space', { a: true })}.`); return false; }
    setNote('Asking the AI...');
    try {
      const reply = await api('POST', `/api/spaces/${encodeURIComponent(id)}/ai`, {
        question,
        refs: aiContext.map((c) => c.ref).filter(Boolean),
      });
      setNote('');
      if (reply.question) addStored(reply.question);
      if (reply.message) addStored(reply.message);
      return true;
    } catch (err) {
      setNote(err.message || 'The AI could not answer.');
      return false;
    }
  }

  function postCommand(parsed, chosen) {
    return api('POST', `/api/spaces/${encodeURIComponent(spaceId())}/command`, {
      name: parsed.name,
      text: parsed.rest,
      module: chosen.module,
    });
  }

  function askClosed(chosen, parsed) {
    const name = chosen.moduleName;
    const box = document.createElement('div');
    box.className = 'chat-closed-ask';
    const q = document.createElement('p');
    q.textContent = `The ${name} is not open. What would you like to do?`;
    const actions = document.createElement('div');
    actions.className = 'chat-closed-actions';
    const finish = () => box.remove();
    const go = (open) => async () => {
      finish();
      try {
        echo(parsed, chosen, await postCommand(parsed, chosen));
        if (input().value.trim() === parsed.raw.trim()) { input().value = ''; resizeChatInput(); }
        if (open) canvas.open(chosen.module);
      } catch (err) {
        setNote(err.message || `The ${name} could not take that.`);
      }
    };
    for (const [label, primary, onClick] of [
      [`Add it and open ${name}.`, true, go(true)],
      [`Add it and keep ${name} closed.`, false, go(false)],
      ['Cancel', false, finish],
    ]) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = primary ? 'btn btn-primary btn-small' : 'btn btn-small';
      b.textContent = label;
      b.addEventListener('click', onClick);
      actions.appendChild(b);
    }
    box.append(q, actions);
    $('messages').appendChild(box);
    $('messages').scrollTop = $('messages').scrollHeight;
  }

  async function runCommand(parsed) {
    const hits = matchesFor(parsed.name);
    if (!hits.length) {
      setNote(`No command /${parsed.name}`);
      return false;
    }
    const openHits = hits.filter((h) => !h.module || canvas.isOpen(h.module));
    if (hits[0].name === 'ai') {
      if (!parsed.rest) { setNote('Type a question after /ai.'); return false; }
      return runAi(parsed.rest);
    }
    if (hits.length > 1 && openHits.length !== 1) {
      const names = hits.map((h) => h.moduleName).join(' or ');
      setNote(`Which one: ${names}? Use the picker.`);
      return false;
    }
    const chosen = openHits[0] || hits[0];
    if (chosen.module && !canvas.isOpen(chosen.module)) {
      askClosed(chosen, parsed);
      return false;
    }
    try {
      echo(parsed, chosen, await postCommand(parsed, chosen));
      return true;
    } catch (err) {
      setNote(err.message || `The ${chosen.moduleName} could not take that.`);
      return false;
    }
  }

  function droppedLine(dropped, over) {
    const parts = [];
    const list = Array.isArray(dropped) ? dropped : [];
    if (list.length) {
      const counts = new Map();
      for (const d of list) counts.set(d.why, (counts.get(d.why) || 0) + 1);
      const phrase = (why, n) => {
        if (why === 'it has no title') return n === 1 ? '1 had no title' : `${n} had no title`;
        if (why === 'it has no content') return n === 1 ? '1 had no content' : `${n} had no content`;
        if (why === 'not valid JSON') return n === 1 ? '1 was not valid JSON' : `${n} were not valid JSON`;
        if (why === `not ${word('object', { a: true })}`) return n === 1 ? `1 was not ${word('object', { a: true })}` : `${n} were not ${word('object', { many: true })}`;
        return `${n} ${why}`;
      };
      parts.push(`${list.length} could not be read: ${[...counts].map(([w, n]) => phrase(w, n)).join(', ')}.`);
    }
    if (over) parts.push(`${over} more were left out: at most 50 at a time.`);
    return parts.join(' ');
  }

  function setImportWhy(text) {
    const el = $('chat-import-why');
    if (!el) return;
    el.textContent = text || '';
    el.hidden = !text;
  }

  function setImportOpen(yes) {
    const panel = $('chat-import-panel');
    if (!panel) return;
    panel.hidden = !yes;
    if (yes) {
      hidePicker();
      $('chat-help-popup').hidden = true;
      $('chat-emoji-popup').hidden = true;
      setImportWhy('');
    }
  }

  function isKept(btn) {
    return Boolean(btn && (btn.classList.contains('kept') || btn.classList.contains('queued')));
  }

  function showImport(result) {
    const objects = (result && result.objects) || [];
    const dropped = droppedLine(result && result.dropped, result && result.over);
    if (!objects.length) {
      setImportWhy(dropped || 'Nothing in that could be read.');
      return;
    }
    setImportOpen(false);
    setImportWhy('');
    const body = document.createElement('div');
    body.className = 'message-body text';
    const rows = [];
    for (const obj of objects) {
      const row = document.createElement('label');
      row.className = 'chat-import-row';
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.checked = true;
      box.setAttribute('aria-label', 'Keep this one');
      const preview = objectPreview({ ...obj, basis: 'imported' }, '', (btn) => {
        if (isKept(btn)) box.disabled = true;
        refresh();
      });
      const keepBtn = preview.querySelector('.chat-object-keep');
      row.append(box, preview);
      rows.push({ box, keepBtn, obj });
      body.appendChild(row);
    }
    const foot = document.createElement('div');
    foot.className = 'chat-import-foot';
    const keepTicked = document.createElement('button');
    keepTicked.type = 'button';
    keepTicked.className = 'btn btn-primary btn-small';
    const droppedEl = document.createElement('p');
    droppedEl.className = 'chat-import-dropped';
    droppedEl.textContent = dropped;
    const ticked = () => rows.filter((r) => r.box.checked && !isKept(r.keepBtn));
    const refresh = () => {
      keepTicked.textContent = `Keep ticked (${ticked().length})`;
    };
    refresh();
    body.addEventListener('change', refresh);
    keepTicked.addEventListener('click', async () => {
      const left = ticked();
      if (!left.length) return;
      const counts = new Map();
      for (const r of left) {
        const k = r.obj.kind && findKeepers(lastActions).suggestion ? r.obj.kind : 'note';
        counts.set(k, (counts.get(k) || 0) + 1);
      }
      const what = [...counts].map(([k, n]) => `${n} ${n === 1 ? k : (KIND_PLURAL[k] || `${k}s`)}`).join(' and ');
      if (!window.confirm(`Keep ${what}?`)) return;
      keepTicked.disabled = true;
      await refreshActions();
      for (const r of left) {
        await keepOne({ ...r.obj, basis: 'imported' }, '', r.keepBtn);
        if (isKept(r.keepBtn)) r.box.disabled = true;
      }
      keepTicked.disabled = false;
      refresh();
    });
    foot.append(keepTicked, droppedEl);
    body.appendChild(foot);
    const entry = {
      who: 'Imported',
      text: objects.map((o) => [o.title, o.content].filter(Boolean).join('\n')).join('\n\n'),
      at: new Date(),
      chat: false,
    };
    const el = frameMessage({
      name: 'Imported',
      at: entry.at,
      visibility: 'private',
      kind: 'ai',
      icon: 'file-import',
      body,
      entry,
    });
    el.classList.add('chat-import-msg');
    $('messages').appendChild(el);
    $('messages').scrollTop = $('messages').scrollHeight;
  }

  async function postCheck(body, type) {
    const id = spaceId();
    if (!id) throw new Error(`Bring research in from ${word('space', { a: true })}.`);
    const result = await fetch(`/api/spaces/${encodeURIComponent(id)}/objects/check`, {
      method: 'POST',
      headers: { 'content-type': type, accept: 'application/json' },
      body,
    });
    const json = await result.json();
    if (!result.ok) throw new Error(json.error || 'That could not be read.');
    return json;
  }

  async function checkObjects(input) {
    setImportWhy('');
    try {
      const result = typeof input === 'string'
        ? await postCheck(input, 'text/plain')
        : await postCheck(input, 'application/octet-stream');
      pendingImport = null;
      importBtn().hidden = true;
      showImport(result);
    } catch (err) {
      setImportWhy(err.message || 'That could not be read.');
      setImportOpen(true);
    }
  }

  async function refreshImport() {
    await refreshActions();
    const { note, suggestion } = findKeepers(lastActions);
    let ok = false;
    try {
      const id = spaceId();
      if (id && getMe() && (note || suggestion)) {
        const avail = await api('GET', `/api/spaces/${encodeURIComponent(id)}/objects/check`);
        ok = Boolean(avail.available);
      }
    } catch {
      ok = false;
    }
    const btn = $('chat-bring');
    if (btn) btn.hidden = !ok;
    if (!ok) setImportOpen(false);
  }

  async function offerImport(text) {
    const id = spaceId();
    if (!id || !getMe()) return;
    try {
      const avail = await api('GET', `/api/spaces/${encodeURIComponent(id)}/objects/check`);
      if (!avail.available) return;
      const json = await postCheck(text, 'text/plain');
      if (!json.objects || !json.objects.length) return;
      pendingImport = json;
      const btn = importBtn();
      btn.hidden = false;
      btn.textContent = `Bring in ${json.objects.length} ${word('object', { many: json.objects.length !== 1 })}`;
      const panelText = $('chat-import-text');
      if (panelText && !panelText.value.trim()) panelText.value = text;
    } catch {
      // not an import
    }
  }

  for (const f of CHAT_FILTERS) {
    $(`chat-filter-${f}`)?.addEventListener('click', (e) => {
      e.preventDefault();
      setFilter(f);
    });
  }
  $('chat-command').addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    $('chat-help-popup').hidden = true;
    $('chat-emoji-popup').hidden = true;
    if ($('chat-command-menu')) hidePicker();
    else showPicker();
  });
  $('chat-bring')?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    const panel = $('chat-import-panel');
    const opening = panel.hidden;
    setImportOpen(opening);
  });
  $('chat-import-close')?.addEventListener('click', (e) => {
    e.preventDefault();
    setImportOpen(false);
  });
  $('chat-import-copy')?.addEventListener('click', async (e) => {
    e.preventDefault();
    setImportWhy('');
    const show = $('chat-import-show');
    if (show) show.hidden = true;
    try {
      const fmt = await api('GET', '/api/objects/format');
      const text = (fmt && fmt.instructions) || '';
      try {
        await navigator.clipboard.writeText(text);
        setNote('Copied. Paste it into the other AI first.');
      } catch {
        if (show) {
          show.value = text;
          show.hidden = false;
          show.focus();
          show.select();
        }
        setNote('Select all and copy it.');
      }
    } catch (err) {
      setImportWhy(err.message || 'The instructions could not be copied.');
    }
  });
  $('chat-import-check')?.addEventListener('click', (e) => {
    e.preventDefault();
    checkObjects($('chat-import-text').value);
  });
  $('chat-import-choose')?.addEventListener('click', (e) => {
    e.preventDefault();
    $('chat-import-file').click();
  });
  $('chat-import-file')?.addEventListener('change', () => {
    const file = $('chat-import-file').files && $('chat-import-file').files[0];
    if (file) checkObjects(file);
  });
  $('chat-import-panel')?.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      setImportOpen(false);
      input().focus();
    }
  });
  importBtn().addEventListener('click', (e) => {
    e.preventDefault();
    if (pendingImport) showImport(pendingImport);
    pendingImport = null;
    importBtn().hidden = true;
  });
  input().addEventListener('input', () => {
    const parsed = parseCommand(input().value);
    if (input().value.trim() === '/') showPicker();
    if (!parsed) input().placeholder = defaultHint();
    else if (parsed.name === 'ai') input().placeholder = 'a question for the AI';
    if (!input().value.trim()) { pendingImport = null; importBtn().hidden = true; setNote(''); }
  });
  input().addEventListener('paste', (e) => {
    const text = e.clipboardData?.getData('text') || '';
    if (text.length > 40) offerImport(text);
  });

  $('chat').addEventListener('drop', (event) => {
    const raw = event.dataTransfer?.getData(OBJECT_MIME);
    if (!raw || parseCommand(input().value || '')?.name !== 'ai') return;
    try {
      const ref = JSON.parse(raw);
      if (ref && ref.module && ref.id) {
        aiContext.push({ ref });
        setNote(`Asking with ${aiContext.length} ${word('object', { many: aiContext.length !== 1 })}`);
      }
    } catch {
      // not an object
    }
  });

  // An accepted command's echo: the private message the server stored and returned (plan-chat-model.md, decision 8). A
  // guest's is not stored (guests share one sender), so it is drawn on this page only, private and not a button.
  function echo(parsed, chosen, reply) {
    if (reply && reply.message) { addStored(reply.message); return; }
    if (!parsed.rest) return;
    const me = getMe();
    addStored({ who: me?.displayName || 'You', by: me?.key || '', text: parsed.rest, at: Date.now(), visibility: 'private', kind: 'command', command: parsed.name, module: chosen?.module || '' }, { local: true });
  }

  return {
    // true when the command was taken (the box empties); false leaves the text in the box to fix or send again.
    async handleSubmit(text) {
      setNote('');
      const parsed = parseCommand(text);
      if (!parsed) return false;
      return runCommand(parsed);
    },
    loadThread,
    answerBody,
    commandLook,
    syncEmpty,
    refreshActions,
    hidePicker,
    hideImport: () => setImportOpen(false),
    askAbout,
  };
}
