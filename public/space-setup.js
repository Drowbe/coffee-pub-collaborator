// Set up (documentation/plans/plan-setup-panel.md; plan-one-bar.md, decision 5, step 4): every setting of a space in
// one side panel on the space's own screen, with tabs and Save and Cancel in an action bar locked to its bottom
// (public/action-bar.js). The bar's Set up tool puts `body.setting-up` on (and shows pressed), the space's name becomes
// an input in the bar, and this panel opens (a full-screen sheet on a phone).
//
// The tabs, each a code id that is also its address fragment (#space, #members, #phases, #opens-with):
//   space       the picture, name, description, faces in the call, launch link, link icon, the published calendar
//               switch, and a danger section with Delete (its own confirmation here; it does not wait for Save)
//   members     the members and Allow guests (drafts), then Generate invite link and the guest link (actions, at once)
//   phases      today's button that opens the phase sheet (the dates have their own Save there)
//   opens-with  the first visit: the Workspace with its Opens with switches, Calendar, Map or a shared layout
// An owner and the admin see every tab; a moderator sees phases and opens-with (the server lets a moderator PATCH
// exactly `phases`, `opensWith` and `defaultLayout`); a member has no Set up. A tab with nothing to show (no phases in
// the template) is left out. The Lobby shows no Delete, no member switches and no calendar switch.
//
// Every field is a draft until Save. Save sends, in order, and stops at the first refusal: PATCH /api/spaces/:id with
// what changed (one body; a moderator's holds only their fields), then the picture (PUT or DELETE
// /api/spaces/:id/image). A refusal keeps the panel open on that field's tab with the server's sentence and the
// keyboard on the field, and says what did save. After a full save the panel closes. A tab with unsaved changes shows a
// dot. Cancel drops every draft; Escape cancels at once when nothing changed and asks "Discard your changes?" when
// something did; a click outside does nothing.
//
// The pure parts (setupTabs, pickTab, setupPatch, dirtyTabs, problemField, setupSaidWords) touch no document, so
// tools/check-nav.mjs runs them in node; the page hands the panel what it needs (createSpaceSetup's `deps`).
import { actionBar } from './action-bar.js';

// The tabs, in the order shown, by rights.
export const SETUP_TABS = Object.freeze(['space', 'members', 'phases', 'opens-with']);
export const OWNER_TABS = SETUP_TABS;
export const MODERATOR_TABS = Object.freeze(['phases', 'opens-with']);
// The fields a moderator's PATCH may hold (server/index.js, MODERATOR_SPACE_FIELDS).
export const MODERATOR_FIELDS = Object.freeze(['phases', 'opensWith', 'defaultLayout']);
export function setupTabs({ owner = false, moderator = false, phases = true } = {}) {
  const tabs = owner ? OWNER_TABS : moderator ? MODERATOR_TABS : [];
  return tabs.filter((t) => t !== 'phases' || phases);
}
// The tab an address fragment asks for, else the first the person may see (an unknown fragment is never an error).
export function pickTab(tabs, hash = '') {
  const id = String(hash || '').replace(/^#/, '');
  return tabs.includes(id) ? id : tabs[0] || null;
}

// Which tab each saved field lives on (the dirty dots, and the tab a refusal opens).
export const FIELD_TAB = Object.freeze({
  name: 'space', description: 'space', profile: 'space', link: 'space', linkIcon: 'space', publishCalendar: 'space', image: 'space', imageRemoved: 'space',
  members: 'members', allowGuests: 'members',
  phases: 'phases',
  opensWith: 'opens-with', defaultLayout: 'opens-with',
});

const sameList = (a, b) => {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((id, i) => id === b[i]);
};
const sameSet = (a = [], b = []) => a.length === b.length && a.every((k) => b.includes(k));
const listOrNull = (v) => (Array.isArray(v) && v.length ? v.filter((id) => typeof id === 'string') : null);
const text = (v) => (typeof v === 'string' ? v.trim() : '');

// The PATCH body for what changed between `before` (the space as it was) and `after` (the panel's draft), each
// { name, description, profile, link, linkIcon, publishCalendar, members, allowGuests, opensWith, defaultLayout }; a
// field left out of `after` is unchanged. A name is trimmed, and an empty one is no change. The first visit's layout and
// Opens with are independent (plan-layout-views.md, step 5): each goes only when it changed, never one for the other.
// `defaultLayout` is 'calendar', 'map' or a shared layout's id; the Workspace (null, or 'workspace') goes as null. The
// members are a set (their order is no change). {} when nothing changed.
const layoutOrNull = (v) => (typeof v === 'string' && v && v !== 'workspace' ? v : null);
export function setupPatch(before = {}, after = {}) {
  const patch = {};
  const name = typeof after.name === 'string' ? after.name.trim() : '';
  if (name && name !== (before.name || '')) patch.name = name;
  if (typeof after.description === 'string' && text(after.description) !== text(before.description)) patch.description = text(after.description);
  if (after.profile !== undefined && after.profile !== (before.profile || 'participants')) patch.profile = after.profile;
  if (typeof after.link === 'string' && text(after.link) !== text(before.link)) patch.link = text(after.link);
  if (typeof after.linkIcon === 'string' && after.linkIcon && after.linkIcon !== before.linkIcon) patch.linkIcon = after.linkIcon;
  if (typeof after.publishCalendar === 'boolean' && after.publishCalendar !== (before.publishCalendar !== false)) patch.publishCalendar = after.publishCalendar;
  if (Array.isArray(after.members) && !sameSet(after.members, Array.isArray(before.members) ? before.members : [])) patch.members = [...after.members];
  if (typeof after.allowGuests === 'boolean' && after.allowGuests !== (before.allowGuests !== false)) patch.allowGuests = after.allowGuests;
  const wasLayout = layoutOrNull(before.defaultLayout);
  const nowLayout = after.defaultLayout === undefined ? wasLayout : layoutOrNull(after.defaultLayout);
  if (nowLayout !== wasLayout) patch.defaultLayout = nowLayout;
  const wasList = listOrNull(before.opensWith);
  const nowList = after.opensWith === undefined ? wasList : listOrNull(after.opensWith);
  if (!sameList(wasList, nowList)) patch.opensWith = nowList;
  return patch;
}

// The tabs with unsaved changes: the PATCH's fields, and the picture when one was chosen or removed.
export function dirtyTabs(patch = {}, { image = false } = {}) {
  const tabs = new Set(Object.keys(patch).map((f) => FIELD_TAB[f]).filter(Boolean));
  if (image) tabs.add('space');
  return tabs;
}

// Which field of a refused PATCH the server's sentence is about (store.updateSpace's sentences), else its first.
const PROBLEM_FIELDS = [
  [/icon/i, 'linkIcon'], [/publish/i, 'publishCalendar'], [/link/i, 'link'], [/member/i, 'members'], [/guest/i, 'allowGuests'],
  [/opens with/i, 'opensWith'], [/layout|first visit/i, 'defaultLayout'], [/profile/i, 'profile'], [/phase|date/i, 'phases'],
];
export function problemField(patch = {}, problem = '') {
  const keys = Object.keys(patch);
  for (const [re, field] of PROBLEM_FIELDS) if (keys.includes(field) && re.test(problem)) return field;
  return keys[0] || null;
}

// The line a person reads after Save: what was saved, in words, and what to do next. `saved` is the fields that went
// through (the PATCH's keys, and 'image' or 'imageRemoved'); `failed` a field that did not with the server's sentence.
// `words` names a field in this environment's words: the panel always gives the members ("the players") and Allow
// guests, which are role words.
const FIELD_WORDS = {
  name: 'the name', description: 'the description', profile: 'the faces in the call', link: 'the launch link', linkIcon: 'the link icon',
  publishCalendar: 'the published calendar', opensWith: 'Opens with',
  defaultLayout: 'the first visit', image: 'the picture', imageRemoved: 'the picture',
};
export function setupSaidWords({ saved = [], failed = null, problem = '' } = {}, { setUp = 'Set up', words = {} } = {}) {
  const wordOf = (f) => words[f] || FIELD_WORDS[f] || f;
  const names = [...new Set(saved.map(wordOf))];
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] || '';
  if (failed) {
    const what = wordOf(failed);
    const why = problem ? ` ${problem[0].toUpperCase()}${problem.slice(1).replace(/\.?$/, '.')}` : '';
    return `${what[0].toUpperCase()}${what.slice(1)} was not saved.${why}${names.length ? ` ${list[0].toUpperCase()}${list.slice(1)} ${names.length > 1 ? 'were' : 'was'} saved.` : ''} Change it and press Save again, or Cancel.`;
  }
  if (!names.length) return `Nothing changed. Press ${setUp} to change something.`;
  return `Saved ${list}. Everyone sees it now; press ${setUp} to change more.`;
}

// The space as the panel's `before`: each field as the server means it (no link is '', the calendar and guests are
// on unless false).
function beforeOf(space = {}) {
  return {
    name: space.name || '',
    description: typeof space.description === 'string' ? space.description : '',
    // 'roleplaying' is the older name of the participants' pictures (server/store.js), so it reads as that here.
    profile: space.profile === 'characters' ? 'characters' : 'participants',
    link: typeof space.link === 'string' ? space.link : '',
    linkIcon: typeof space.linkIcon === 'string' ? space.linkIcon : '',
    publishCalendar: space.publishCalendar !== false,
    members: Array.isArray(space.members) ? [...space.members] : [],
    allowGuests: space.allowGuests !== false,
    opensWith: listOrNull(space.opensWith),
    defaultLayout: space.defaultLayout || null,
  };
}
const copyOf = (b) => ({ ...b, members: [...b.members], opensWith: b.opensWith ? [...b.opensWith] : null });
const sameValue = (a, b) => JSON.stringify(a) === JSON.stringify(b);

// --- the panel ----------------------------------------------------------------------------------------------------

// `deps`: { api, word, verb, icons, switchListHtml, wireSwitchList, opensWithSummary, escapeHtml, doc, layoutVerb }.
// Returns { open(opts), close(), done(), cancel(), isOpen(), select(tab), el }. `open({ space, owner, moderator,
// phases, tab, openPhases, onDone, onSaved, onDeleted, onLinks, onTab, onLeave, nameInput })`: `space` the space's
// record, `tab` the address fragment asking for a tab, `nameInput` the bar's input (kept in step with the Name),
// `openPhases()` opens the sheet, `onDone(space, said, saved)` is told once the whole save went through,
// `onSaved(space, saved)` after a part of it did and a later request was refused, `onDeleted(space)` after Delete,
// `onLinks(space)` after an invite or guest link action, `onTab(id)` as the tab changes, `onLeave()` when the mode
// ends either way.
export function createSpaceSetup(deps) {
  const { api, word, switchListHtml, wireSwitchList, opensWithSummary, escapeHtml } = deps;
  const doc = deps.doc || document;
  const el = doc.createElement('aside');
  el.id = 'space-setup';
  el.className = 'space-setup action-surface';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-labelledby', 'space-setup-title');
  el.hidden = true;
  let state = null; // while open: { space, tabs, tab, draft, before, options, layouts, opts, image, links, users, saving, bar }

  const esc = (s) => escapeHtml(String(s ?? ''));
  const spaceWord = () => word('space');
  const membersWord = (cap = false) => word('member', { many: true, cap });
  const tabLabel = (id) => ({ space: word('space', { cap: true }), members: membersWord(true), phases: 'Phases', 'opens-with': 'First visit' })[id];
  const sectionHtml = (id, title, inner, { hidden = false, cls = '' } = {}) => `<section class="setup-section${cls ? ` ${cls}` : ''}" data-section="${id}"${hidden ? ' hidden' : ''}><h3 class="setup-heading">${title}</h3>${inner}</section>`;

  function spaceTabHtml() {
    const { space } = state;
    const parts = [];
    parts.push(sectionHtml('picture', 'Picture', `
        <div class="setup-picture">
          <img id="setup-picture-img" alt="" hidden>
          <span class="setup-picture-none" id="setup-picture-none">No picture</span>
          <span class="setup-picture-buttons">
            <label class="btn btn-small setup-picture-pick"><input type="file" id="setup-picture-file" accept="image/png,image/jpeg,image/gif,image/webp" class="visually-hidden"><i class="fa-solid fa-image fa-fw" aria-hidden="true"></i> Choose a picture</label>
            <button type="button" class="btn btn-small" id="setup-picture-remove" hidden><i class="fa-solid fa-xmark fa-fw" aria-hidden="true"></i> Remove</button>
          </span>
        </div>
        <p class="hint">Shown with its name on Home.</p>`));
    parts.push(sectionHtml('name', 'Name', '<label class="setup-field"><span class="visually-hidden">Name</span><input type="text" id="setup-name" maxlength="40" autocomplete="off"></label><p class="hint">Shown in the bar and on Home.</p>'));
    parts.push(sectionHtml('description', 'Description', `<label class="setup-field"><span class="visually-hidden">Description</span><textarea id="setup-description" rows="3" maxlength="300"></textarea></label><p class="hint">A line or two about this ${esc(spaceWord())}.</p>`));
    parts.push(sectionHtml('faces', 'Faces in the call', `
        <label class="setup-field"><span class="visually-hidden">Faces in the call</span><select id="setup-profile">
          <option value="participants">People's own pictures</option>
          <option value="characters">Their character pictures</option>
        </select></label>
        <p class="hint">What each person's tile shows while their camera is off.</p>`));
    const enter = typeof deps.verb === 'function' ? deps.verb('enter') : 'Enter';
    parts.push(sectionHtml('link', 'Launch link', `<label class="setup-field"><span class="visually-hidden">Launch link</span><input type="url" id="setup-link" maxlength="500" placeholder="https://your-game-or-site.example" autocomplete="off" inputmode="url"></label><p class="hint">A button next to ${esc(enter)} and in the call's toolbar opens it.</p>`));
    if ((typeof deps.icons === 'function' ? deps.icons() : []).length) {
      parts.push(sectionHtml('link-icon', '<span id="setup-link-icon-heading">Link icon</span>', '<div class="icon-grid setup-icon-grid" id="setup-link-icon" role="radiogroup" aria-labelledby="setup-link-icon-heading"></div><p class="hint">The icon on the launch link\'s button.</p>'));
    }
    if (!space.isLobby) {
      parts.push(sectionHtml('calendar', '<span id="setup-calendar-heading">Calendar</span>', `<label class="switch-row"><input type="checkbox" class="switch" role="switch" id="setup-publish-calendar"><span class="switch-name">In the published calendar</span></label><p class="hint">${esc(word('owner', { many: true, cap: true }))} can publish one calendar with every ${esc(spaceWord())}'s events. Turn this off to leave this ${esc(spaceWord())} out.</p>`, { hidden: true }));
      parts.push(sectionHtml('danger', `Delete this ${esc(spaceWord())}`, `
        <button type="button" class="btn btn-small btn-danger" id="setup-delete" aria-haspopup="true" aria-expanded="false"><i class="fa-solid fa-trash fa-fw" aria-hidden="true"></i> Delete ${esc(spaceWord())}</button>
        <p class="hint">Happens at once; it does not wait for Save.</p>
        <div class="setup-confirm" id="setup-delete-confirm" role="alertdialog" aria-labelledby="setup-delete-words" hidden>
          <p class="setup-confirm-words" id="setup-delete-words"></p>
          <div class="setup-confirm-buttons">
            <button type="button" class="btn btn-small btn-danger" id="setup-delete-yes">Delete</button>
            <button type="button" class="btn btn-small" id="setup-delete-keep">Keep</button>
          </div>
          <p class="setup-confirm-problem" id="setup-delete-problem" role="status" aria-live="polite"></p>
        </div>`, { cls: 'setup-danger' }));
    }
    return parts.join('');
  }

  function membersTabHtml() {
    const { space } = state;
    const guest = word('guest');
    const guests = word('guest', { many: true, cap: true });
    const parts = [];
    parts.push(sectionHtml('members', `<span id="setup-members-heading">${esc(membersWord(true))}</span>`, space.isLobby
      ? `<p class="hint">Everyone belongs to the ${esc(space.name || 'Lobby')}.</p>`
      : `<div class="setup-members" id="setup-members" role="group" aria-labelledby="setup-members-heading"></div><p class="hint">Who is in this ${esc(spaceWord())}. Saved with Save.</p>`));
    parts.push(sectionHtml('guests', esc(guests), `<label class="switch-row"><input type="checkbox" class="switch" role="switch" id="setup-allow-guests"><span class="switch-name">Allow ${esc(guests)}</span></label><p class="hint">Whether a ${esc(guest)} link can be used here. Saved with Save.</p>`));
    parts.push(sectionHtml('links', 'Links', `
        <p class="hint setup-links-hint">These work at once; they are not part of Save.</p>
        <h4 class="setup-subheading">Invite to sign up</h4>
        <div class="setup-link-row">
          <button type="button" class="btn btn-small" id="setup-make-invite"><i class="fa-solid fa-envelope fa-fw" aria-hidden="true"></i> Generate invite link</button>
        </div>
        <div class="setup-link-row" id="setup-invite-row" hidden>
          <code class="key link" id="setup-invite-link"></code>
          <button type="button" class="btn btn-small" id="setup-invite-copy">Copy</button>
        </div>
        <p class="hint">Signs someone up and puts them in this ${esc(spaceWord())}. One use, for 7 days.</p>
        <h4 class="setup-subheading">${esc(word('guest', { cap: true }))} link</h4>
        <div class="setup-link-row">
          <code class="key link" id="setup-guest-link-value">off</code>
          <button type="button" class="btn btn-small" id="setup-guest-link-on">Turn on</button>
          <button type="button" class="btn btn-small" id="setup-guest-link-copy" hidden>Copy</button>
          <button type="button" class="btn btn-small" id="setup-guest-link-new" hidden>New link</button>
          <button type="button" class="btn btn-small btn-danger" id="setup-guest-link-off" hidden>Turn off</button>
        </div>
        <p class="hint" id="setup-guest-link-note" hidden></p>
        <p class="hint">Anyone with it can come in with just a name.</p>
        <p class="setup-links-status" id="setup-links-status" role="status" aria-live="polite"></p>`));
    return parts.join('');
  }

  function phasesTabHtml() {
    return sectionHtml('phases', 'Phases', '<button type="button" class="btn btn-small" id="setup-phases" aria-haspopup="dialog"><i class="fa-solid fa-timeline fa-fw" aria-hidden="true"></i> Set the dates</button><p class="hint">When each phase starts. The dates have their own Save in the sheet.</p>');
  }

  // First visit (plan-layout-views.md, step 5): one choice, radios of one name. The Workspace first, with its Opens
  // with switches directly under it (always editable, whichever is picked: they are what the Workspace holds), then
  // Calendar and Map while they are on here, then the shared layouts by name (paintLayouts).
  function opensWithTabHtml() {
    return `<section class="setup-section" data-section="first-visit"><h3 class="setup-heading" id="setup-first-visit-heading">First visit</h3>
        <p class="hint setup-first-visit-hint" id="setup-first-visit-hint">What someone sees the first time they enter this ${esc(spaceWord())}. After that, each person's own arrangement is remembered.</p>
        <fieldset class="setup-first-visit" id="setup-first-visit" aria-labelledby="setup-first-visit-heading" aria-describedby="setup-first-visit-hint">
          <label class="setup-choice"><input type="radio" name="setup-first-visit" value="workspace" id="setup-first-workspace"><i class="fa-solid fa-columns fa-fw" aria-hidden="true" id="setup-workspace-icon"></i><span class="setup-choice-name" id="setup-workspace-name">Workspace</span></label>
          <div class="setup-workspace-content">
            <p class="setup-subheading" id="setup-opens-with-label">Opens with</p>
            <div class="opens-with-list setup-opens-with" id="setup-opens-with" role="group" aria-labelledby="setup-opens-with-label" aria-describedby="setup-opens-with-hint"></div>
            <p class="hint" id="setup-opens-with-note" hidden></p>
            <p class="hint" id="setup-opens-with-hint">What the Workspace starts with, whichever is picked.</p>
          </div>
          <div class="setup-first-layouts" id="setup-first-visit-layouts"></div>
        </fieldset>
        <p class="hint" id="setup-layout-note" hidden></p></section>`;
  }

  const TAB_HTML = { space: spaceTabHtml, members: membersTabHtml, phases: phasesTabHtml, 'opens-with': opensWithTabHtml };

  function draw() {
    const { tabs, space } = state;
    const tabButtons = tabs.map((id) => `<button type="button" role="tab" class="setup-tab" id="setup-tab-${id}" data-tab="${id}" aria-controls="setup-content-${id}" aria-selected="false" tabindex="-1"><span class="setup-tab-label">${esc(tabLabel(id))}</span><span class="setup-tab-dot" aria-hidden="true" hidden></span><span class="visually-hidden setup-tab-unsaved"></span></button>`).join('');
    const contents = tabs.map((id) => `<div role="tabpanel" class="setup-tab-content" id="setup-content-${id}" data-tab="${id}" aria-labelledby="setup-tab-${id}" tabindex="-1" hidden>${TAB_HTML[id]()}</div>`).join('');
    // The old full page stays until the panel holds everything (plan-setup-panel.md, step 6 takes this link away).
    const fullSettings = tabs.includes('space') ? `<a class="setup-link setup-full" data-overlay-link href="/spaces/${encodeURIComponent(space.id)}"><i class="fa-solid fa-gear fa-fw" aria-hidden="true"></i> Full settings</a>` : '';
    el.innerHTML = `
      <div class="setup-head">
        <h2 id="space-setup-title">Set up</h2>
        <p class="setup-which" id="space-setup-which"></p>
        <div class="setup-tabs" id="setup-tabs" role="tablist" aria-label="Set up">${tabButtons}</div>
      </div>
      <div class="setup-body">${contents}${fullSettings}</div>
      <p class="setup-status status" id="space-setup-status" role="status" aria-live="polite"></p>`;
    el.querySelector('.setup-body').classList.add('action-content');
    state.bar = actionBar({
      label: 'Save the set up',
      doc,
      ids: { save: 'setup-save', cancel: 'setup-cancel-button' },
      discardWords: 'Discard your changes?',
      dirty: isDirty,
      onSave: () => done(),
      onCancel: () => close(),
    });
    el.appendChild(state.bar.el);
    el.querySelector('#space-setup-which').textContent = space.name;
    fillFields();
    wire();
  }

  const q = (sel) => el.querySelector(sel);
  const say = (words) => { const s = q('#space-setup-status'); if (s) { s.textContent = ''; s.textContent = words; } };
  const sayIn = (sel, words) => { const s = q(sel); if (s) { s.textContent = ''; s.textContent = words; } };

  // --- the tabs ---
  function select(id, { focus = false } = {}) {
    if (!state || !state.tabs.includes(id)) return;
    state.tab = id;
    for (const b of el.querySelectorAll('.setup-tab')) {
      const on = b.dataset.tab === id;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on) {
        if (typeof b.scrollIntoView === 'function') b.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        if (focus) b.focus();
      }
    }
    for (const p of el.querySelectorAll('.setup-tab-content')) p.hidden = p.dataset.tab !== id;
    hideDeleteConfirm();
    if (typeof state.opts.onTab === 'function') state.opts.onTab(id);
  }

  // The dots: a tab with unsaved changes, said to a screen reader too.
  function paintDots() {
    if (!state) return;
    const dirty = dirtyNow();
    for (const b of el.querySelectorAll('.setup-tab')) {
      const on = dirty.has(b.dataset.tab);
      b.querySelector('.setup-tab-dot').hidden = !on;
      b.querySelector('.setup-tab-unsaved').textContent = on ? ', unsaved changes' : '';
      b.classList.toggle('dirty', on);
    }
  }
  function refresh() {
    if (!state) return;
    state.bar.refresh();
    paintDots();
  }

  // --- filling the fields from the draft ---
  function fillFields() {
    const { draft, opts } = state;
    const set = (sel, v) => { const f = q(sel); if (f && f.value !== v) f.value = v; };
    set('#setup-name', draft.name);
    set('#setup-description', draft.description);
    set('#setup-profile', draft.profile);
    set('#setup-link', draft.link);
    const cal = q('#setup-publish-calendar');
    if (cal) cal.checked = draft.publishCalendar;
    const guests = q('#setup-allow-guests');
    if (guests) guests.checked = draft.allowGuests;
    paintPicture();
    paintIcons();
    paintMembers();
    paintGuestLink();
    if (q('#setup-first-visit')) paintLayouts();
    if (q('#setup-opens-with')) paintOpensWith();
    if (opts.nameInput && state.owner) opts.nameInput.value = draft.name;
  }

  function paintPicture() {
    const img = q('#setup-picture-img');
    if (!img) return;
    const { space, image } = state;
    let src = '';
    if (image.file) src = image.url;
    else if (!image.remove && space.hasImage) src = `/img/space/${encodeURIComponent(space.id)}?v=${space.imageVersion || 0}`;
    img.hidden = !src;
    if (src) img.src = src;
    q('#setup-picture-none').hidden = Boolean(src);
    q('#setup-picture-remove').hidden = !src;
  }

  // The link icon: a radio group of icon buttons (the page's .icon-grid), one tab stop, the arrows move the choice.
  function paintIcons() {
    const grid = q('#setup-link-icon');
    if (!grid) return;
    const icons = deps.icons();
    const picked = icons.some((i) => i.id === state.draft.linkIcon) ? state.draft.linkIcon : (icons[0] && icons[0].id);
    grid.innerHTML = icons.map(({ id, classes, label }) => `<button type="button" role="radio" data-icon="${esc(id)}" title="${esc(label || id)}" aria-label="${esc(label || id)}" aria-checked="${id === picked}" tabindex="${id === picked ? 0 : -1}"${id === picked ? ' class="selected"' : ''}><i class="${esc(classes)} fa-fw" aria-hidden="true"></i></button>`).join('');
  }
  function pickIcon(id, { focus = false } = {}) {
    state.draft.linkIcon = id;
    for (const b of el.querySelectorAll('#setup-link-icon [data-icon]')) {
      const on = b.dataset.icon === id;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
      b.classList.toggle('selected', on);
      if (on && focus) b.focus();
    }
    refresh();
  }

  // The members: a switch for each account, its picture and name; on while it is in the draft.
  function paintMembers() {
    const list = q('#setup-members');
    if (!list) return;
    const chosen = new Set(state.draft.members);
    if (!state.users) { list.innerHTML = '<p class="hint">Loading…</p>'; return; }
    list.innerHTML = state.users.map((u) => `<label class="switch-row setup-member"><input type="checkbox" class="switch" role="switch" data-member="${esc(u.key)}"${chosen.has(u.key) ? ' checked' : ''}><img class="setup-member-face" alt="" src="/img/${encodeURIComponent(u.key)}/profile"><span class="switch-name">${esc(u.displayName || u.key)}</span></label>`).join('');
    wireSwitchList(list);
  }

  // The guest link as the server has it (the same record the in-space guest link controls read: guestToken and
  // allowGuests). It follows the saved Allow guests, not the draft: turning guests on is saved with Save.
  function paintGuestLink() {
    const value = q('#setup-guest-link-value');
    if (!value) return;
    const { links, draft } = state;
    const token = links.guestToken || null;
    const allowed = links.allowGuests !== false;
    const origin = doc.defaultView ? doc.defaultView.location.origin : '';
    value.textContent = token ? `${origin}/guest/${token}` : 'off';
    q('#setup-guest-link-on').hidden = !allowed || Boolean(token);
    q('#setup-guest-link-copy').hidden = !token;
    q('#setup-guest-link-new').hidden = !allowed || !token;
    q('#setup-guest-link-off').hidden = !token;
    const note = q('#setup-guest-link-note');
    const guests = word('guest', { many: true, cap: true });
    note.textContent = !allowed
      ? (draft.allowGuests ? `Press Save to allow ${guests}, then turn the link on.` : `Allow ${guests} is off, so the link can't be turned on.`)
      : (!draft.allowGuests && token ? `Saving with Allow ${guests} off turns this link off too.` : '');
    note.hidden = !note.textContent;
  }

  // Opens with, as space-settings draws it: what can open now (the chat, the modules on here), then any saved id that
  // cannot open now, kept and said why. The conference is not a switch here: the call follows joining (GitHub #199), so
  // a `conference` id a list still holds is kept in the stored list and not drawn.
  function choices() {
    const o = state.options;
    const shown = (id, name, icon) => ({ id, name, icon, ...(o.builtin.find((b) => b.id === id) || {}) });
    return [
      shown('chat', 'Chat', 'message'),
      ...o.modules.map((m) => ({ id: m.id, name: m.name, icon: m.icon })),
    ];
  }
  function keptChoice(id) {
    return { id, name: id, icon: 'puzzle-piece', note: `not on in this ${word('space')}` };
  }
  function paintOpensWith() {
    const list = q('#setup-opens-with');
    const all = choices();
    const chosen = new Set(state.draft.opensWith || []);
    const kept = (state.draft.opensWith || []).filter((id) => id !== 'conference' && !all.some((c) => c.id === id)).map(keptChoice);
    list.innerHTML = switchListHtml([...all, ...kept].map((c) => ({ ...c, on: chosen.has(c.id) })), 'opens');
    wireSwitchList(list);
    const note = q('#setup-opens-with-note');
    const summary = opensWithSummary({
      list: state.draft.opensWith,
      environment: state.options.environment,
      modules: state.options.modules.map((m) => m.id),
      canOpen: (id) => all.some((c) => c.id === id),
      nameOf: (id) => all.find((c) => c.id === id)?.name || id,
    });
    note.textContent = summary;
    note.hidden = !summary;
  }
  // The choices after the Workspace: Calendar and Map while the layouts payload's `system` lists them, then the shared
  // layouts by name, each with its icon. The one checked is the draft's; one no longer listed reads as the Workspace.
  const iconOk = (icon) => /^[a-z0-9-]{1,40}$/.test(icon || '');
  function layoutChoices() {
    const { system, shared } = state.layouts;
    return [
      ...system.filter((l) => l.id === 'calendar' || l.id === 'map').map((l) => ({ id: l.id, name: l.name, icon: iconOk(l.icon) ? l.icon : 'object-group' })),
      ...shared.map((l) => ({ id: l.id, name: l.name, icon: iconOk(l.icon) && l.icon !== 'object-group' ? l.icon : 'user-group' })),
    ];
  }
  function paintLayouts() {
    const { layouts, draft } = state;
    const workspace = layouts.system.find((l) => l.id === 'workspace');
    q('#setup-workspace-name').textContent = workspace && workspace.name ? workspace.name : 'Workspace';
    if (workspace && iconOk(workspace.icon)) q('#setup-workspace-icon').className = `fa-solid fa-${workspace.icon} fa-fw`;
    const choices = layoutChoices();
    q('#setup-first-visit-layouts').innerHTML = choices.map((c) => `<label class="setup-choice"><input type="radio" name="setup-first-visit" value="${escapeHtml(c.id)}"><i class="fa-solid fa-${escapeHtml(c.icon)} fa-fw" aria-hidden="true"></i><span class="setup-choice-name">${escapeHtml(c.name)}</span></label>`).join('');
    const picked = choices.some((c) => c.id === draft.defaultLayout) ? draft.defaultLayout : 'workspace';
    for (const r of el.querySelectorAll('input[name="setup-first-visit"]')) {
      r.checked = r.value === picked;
      r.disabled = !layouts.canSetDefault;
    }
    const note = q('#setup-layout-note');
    note.textContent = layouts.shared.length ? '' : `A shared layout can be picked too: save one from the ${typeof deps.layoutVerb === 'function' ? deps.layoutVerb() : 'Layout'} menu, for everyone in this ${word('space')}.`;
    note.hidden = !note.textContent;
  }

  // --- Delete: its own question inside the panel, at once, not part of the draft ---
  function showDeleteConfirm() {
    const box = q('#setup-delete-confirm');
    if (!box) return;
    q('#setup-delete-words').textContent = `Delete ${state.space.name}? Its ${membersWord()} stay in the Lobby.`;
    sayIn('#setup-delete-problem', '');
    box.hidden = false;
    q('#setup-delete').setAttribute('aria-expanded', 'true');
    q('#setup-delete-keep').focus();
    if (typeof box.scrollIntoView === 'function') box.scrollIntoView({ block: 'nearest' });
  }
  function hideDeleteConfirm({ focus = false } = {}) {
    const box = q('#setup-delete-confirm');
    if (!box || box.hidden) return false;
    box.hidden = true;
    q('#setup-delete').setAttribute('aria-expanded', 'false');
    if (focus) q('#setup-delete').focus();
    return true;
  }
  async function deleteSpace() {
    if (!state || state.saving) return;
    const { space, opts } = state;
    state.saving = true;
    el.classList.add('saving');
    try {
      await api('DELETE', `/api/spaces/${encodeURIComponent(space.id)}`);
    } catch (err) {
      sayIn('#setup-delete-problem', err.message || 'It was not deleted.');
      state.saving = false;
      el.classList.remove('saving');
      return;
    }
    const onDeleted = opts.onDeleted;
    close();
    if (typeof onDeleted === 'function') onDeleted(space);
  }

  // --- the invite and the guest link: actions, at once ---
  async function linkAction(run, okWords) {
    try {
      await run();
      if (okWords) sayIn('#setup-links-status', okWords);
      if (typeof state?.opts.onLinks === 'function') state.opts.onLinks(state.space);
    } catch (err) {
      sayIn('#setup-links-status', err.message || 'That did not work.');
    }
  }
  async function copyText(value) {
    try {
      await doc.defaultView.navigator.clipboard.writeText(value);
      sayIn('#setup-links-status', 'Copied.');
    } catch {
      doc.defaultView.prompt('Copy this:', value);
    }
  }
  async function setGuestLink(body) {
    const id = encodeURIComponent(state.space.id);
    await linkAction(async () => {
      const answer = body === null ? await api('DELETE', `/api/spaces/${id}/guest-link`) : await api('POST', `/api/spaces/${id}/guest-link`, body);
      if (state && answer && answer.space) {
        state.links = { guestToken: answer.space.guestToken || null, allowGuests: answer.space.allowGuests !== false };
        paintGuestLink();
      }
    }, body === null ? 'The link is off.' : body.regenerate ? 'A new link; the old one no longer works.' : 'The link is on.');
  }

  function wire() {
    const tablist = q('#setup-tabs');
    tablist.addEventListener('click', (event) => {
      const b = event.target.closest('.setup-tab');
      if (b) select(b.dataset.tab, { focus: true });
    });
    tablist.addEventListener('keydown', (event) => {
      const all = [...el.querySelectorAll('.setup-tab')];
      const at = all.indexOf(event.target.closest('.setup-tab'));
      if (at < 0) return;
      const to = { ArrowRight: at + 1, ArrowLeft: at - 1, Home: 0, End: all.length - 1 }[event.key];
      if (to === undefined) return;
      event.preventDefault();
      const next = all[(to + all.length) % all.length];
      select(next.dataset.tab, { focus: true });
    });

    const field = (sel, key) => { const f = q(sel); if (f) f.addEventListener('input', () => { state.draft[key] = f.value; }); };
    const name = q('#setup-name');
    if (name) name.addEventListener('input', () => { state.draft.name = name.value; if (state.opts.nameInput) state.opts.nameInput.value = name.value; });
    field('#setup-description', 'description');
    field('#setup-link', 'link');
    const profile = q('#setup-profile');
    if (profile) profile.addEventListener('change', () => { state.draft.profile = profile.value; });
    const cal = q('#setup-publish-calendar');
    if (cal) cal.addEventListener('change', () => { state.draft.publishCalendar = cal.checked; });
    const guests = q('#setup-allow-guests');
    if (guests) guests.addEventListener('change', () => { state.draft.allowGuests = guests.checked; paintGuestLink(); });
    const members = q('#setup-members');
    if (members) members.addEventListener('change', (event) => {
      if (event.target.type !== 'checkbox') return;
      state.draft.members = [...members.querySelectorAll('input:checked')].map((i) => i.dataset.member);
    });

    const grid = q('#setup-link-icon');
    if (grid) {
      grid.addEventListener('click', (event) => { const b = event.target.closest('[data-icon]'); if (b) pickIcon(b.dataset.icon); });
      grid.addEventListener('keydown', (event) => {
        const all = [...grid.querySelectorAll('[data-icon]')];
        const at = all.indexOf(event.target.closest('[data-icon]'));
        if (at < 0) return;
        const to = { ArrowRight: at + 1, ArrowDown: at + 1, ArrowLeft: at - 1, ArrowUp: at - 1, Home: 0, End: all.length - 1 }[event.key];
        if (to === undefined) return;
        event.preventDefault();
        pickIcon(all[(to + all.length) % all.length].dataset.icon, { focus: true });
      });
    }

    const file = q('#setup-picture-file');
    if (file) file.addEventListener('change', () => {
      const f = file.files && file.files[0];
      file.value = '';
      if (!f) return;
      if (state.image.url) URL.revokeObjectURL(state.image.url);
      state.image = { file: f, url: URL.createObjectURL(f), remove: false };
      paintPicture();
    });
    const remove = q('#setup-picture-remove');
    if (remove) remove.addEventListener('click', () => {
      if (state.image.url) URL.revokeObjectURL(state.image.url);
      state.image = { file: null, url: '', remove: true };
      paintPicture();
      q('.setup-picture-pick input').focus();
    });

    const del = q('#setup-delete');
    if (del) {
      del.addEventListener('click', () => (q('#setup-delete-confirm').hidden ? showDeleteConfirm() : hideDeleteConfirm({ focus: true })));
      q('#setup-delete-keep').addEventListener('click', () => hideDeleteConfirm({ focus: true }));
      q('#setup-delete-yes').addEventListener('click', () => deleteSpace());
    }

    const invite = q('#setup-make-invite');
    if (invite) {
      invite.addEventListener('click', () => linkAction(async () => {
        const { invite: made } = await api('POST', '/api/invites', { spaces: [state.space.id] });
        q('#setup-invite-link').textContent = made.url;
        q('#setup-invite-row').hidden = false;
      }, 'Invite link made.'));
      q('#setup-invite-copy').addEventListener('click', () => copyText(q('#setup-invite-link').textContent));
      q('#setup-guest-link-on').addEventListener('click', () => setGuestLink({}));
      q('#setup-guest-link-new').addEventListener('click', () => setGuestLink({ regenerate: true }));
      q('#setup-guest-link-off').addEventListener('click', () => setGuestLink(null));
      q('#setup-guest-link-copy').addEventListener('click', () => copyText(q('#setup-guest-link-value').textContent));
    }

    const phases = q('#setup-phases');
    if (phases) phases.addEventListener('click', () => { if (typeof state.opts.openPhases === 'function') state.opts.openPhases(phases); });
    const list = q('#setup-opens-with');
    if (list) list.addEventListener('change', (event) => {
      if (event.target.type !== 'checkbox') return;
      const ticked = [...list.querySelectorAll('input:checked')].map((i) => i.dataset.opens);
      state.draft.opensWith = ticked.length ? ticked : null; // the first visit's choice stays as it is
      paintOpensWith();
    });
    const firstVisit = q('#setup-first-visit');
    if (firstVisit) firstVisit.addEventListener('change', (event) => {
      if (event.target.name !== 'setup-first-visit' || !event.target.checked) return;
      state.draft.defaultLayout = event.target.value === 'workspace' ? null : event.target.value; // Opens with stays as it is
    });
  }
  // Any edit in the panel: Save and the dots follow what changed (once, here; the panel is drawn again on each open).
  el.addEventListener('input', () => refresh());
  el.addEventListener('change', () => refresh());
  el.addEventListener('click', () => refresh()); // Remove picture and the like
  // Escape: the Delete question first (Keep), else Cancel, which asks "Discard your changes?" when something changed.
  el.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !state) return;
    event.preventDefault();
    event.stopPropagation();
    if (hideDeleteConfirm({ focus: true })) return;
    state.bar.requestCancel();
  });

  // What would be sent now: the draft against what was, the name from the bar's input for an owner, and for a moderator
  // only the fields the server lets them send.
  function patchNow() {
    const { draft, before, opts } = state;
    const name = opts.nameInput && state.owner ? opts.nameInput.value : draft.name;
    const patch = setupPatch(before, { ...draft, name });
    if (!state.owner) for (const k of Object.keys(patch)) if (!MODERATOR_FIELDS.includes(k)) delete patch[k];
    return patch;
  }
  const imageChanged = () => Boolean(state.image.file) || Boolean(state.image.remove && state.space.hasImage);
  function dirtyNow() {
    return dirtyTabs(patchNow(), { image: imageChanged() });
  }
  // Whether something would be lost on Cancel: the PATCH has something in it, or a picture was chosen or removed.
  function isDirty() {
    if (!state) return false;
    return Object.keys(patchNow()).length > 0 || imageChanged();
  }

  // What the panel draws comes from the server: the space's whole record and the accounts (an owner's tabs), the
  // published calendar's switch, Opens with's choices and the layouts. A field not touched while it was asked is set
  // from the answer.
  function takeServerSpace(record) {
    const fresh = beforeOf(record);
    for (const k of Object.keys(fresh)) {
      if (k === 'opensWith' || k === 'defaultLayout') continue; // loadOptions has these from the first visit's own answer
      if (sameValue(state.draft[k], state.before[k])) {
        state.draft[k] = Array.isArray(fresh[k]) ? [...fresh[k]] : fresh[k];
        state.before[k] = fresh[k];
      }
    }
    state.space = { ...state.space, ...record };
    state.links = { guestToken: record.guestToken || null, allowGuests: record.allowGuests !== false };
  }
  async function loadOwnerParts(space) {
    const id = encodeURIComponent(space.id);
    const [record, users] = await Promise.all([
      api('GET', `/api/spaces/${id}`).then((r) => r.space).catch(() => null),
      space.isLobby ? Promise.resolve([]) : api('GET', '/api/users').then((r) => r.users || []).catch(() => []),
    ]);
    if (!state || state.space.id !== space.id) return;
    if (record) takeServerSpace(record);
    state.users = users;
    fillFields();
    refresh();
    if (!space.isLobby) loadCalendarSwitch(space);
  }
  // The space's place in the published calendar (plan-space-calendars.md, section 2): shown only while an owner has
  // turned publishing on and the module whose events it carries is on, named after it.
  async function loadCalendarSwitch(space) {
    try {
      const [settings, mods] = await Promise.all([
        api('GET', '/api/settings').then((r) => r.settings || {}),
        api('GET', '/api/modules').then((r) => r.modules || []).catch(() => []),
      ]);
      if (!state || state.space.id !== space.id) return;
      const m = mods.find((x) => x.sharing === true && x.sharingReasons && 'publishedCalendar' in x.sharingReasons);
      const section = q('[data-section="calendar"]');
      if (!section) return;
      q('#setup-calendar-heading').textContent = m ? (m.displayName || m.name) : 'Calendar';
      section.hidden = settings.publishedCalendar !== true || !(m && m.enabled);
    } catch {
      /* the switch stays hidden */
    }
  }

  async function loadOptions() {
    const { space } = state;
    const asks = state.tabs.includes('opens-with');
    const [answer, layouts] = await Promise.all([
      asks ? api('GET', `/api/modules/for-space?space=${encodeURIComponent(space.id)}`).catch(() => ({})) : Promise.resolve({}),
      asks ? api('GET', `/api/spaces/${encodeURIComponent(space.id)}/layouts`).catch(() => ({})) : Promise.resolve({}),
    ]);
    if (!state || state.space.id !== space.id) return;
    state.options = {
      modules: (answer.modules || []).filter((m) => !m.canvas || m.canvas.menu !== false),
      builtin: answer.builtin || [],
      environment: Array.isArray(answer.spaceDefaultsOpensWith) ? answer.spaceDefaultsOpensWith : null,
    };
    // The server's own view is the freshest: the presence record may lag a save by someone else. What was not touched
    // while it was asked is set from it; the first visit as the server resolved it (a layout no longer there reads as
    // the Workspace, and stays stored until another is picked).
    if (answer.opensWith !== undefined && sameList(listOrNull(state.draft.opensWith), listOrNull(state.before.opensWith))) {
      state.draft.opensWith = listOrNull(answer.opensWith);
      state.before.opensWith = state.draft.opensWith ? [...state.draft.opensWith] : null;
    }
    const fv = layouts.firstVisit || answer.firstVisit;
    const served = fv && typeof fv.layout === 'string' ? layoutOrNull(fv.layout) : answer.defaultLayout !== undefined ? (answer.defaultLayout ? answer.defaultLayout.id : null) : undefined;
    if (served !== undefined && layoutOrNull(state.draft.defaultLayout) === layoutOrNull(state.before.defaultLayout)) {
      state.draft.defaultLayout = served;
      state.before.defaultLayout = served;
    }
    state.layouts = { system: Array.isArray(layouts.system) ? layouts.system : [], shared: Array.isArray(layouts.shared) ? layouts.shared : [], canSetDefault: layouts.canSetDefault !== false };
  }

  function open(opts) {
    if (state) close();
    const space = opts.space;
    const tabs = setupTabs({ owner: opts.owner, moderator: opts.moderator, phases: Boolean(opts.phases) });
    if (!tabs.length) return false;
    const before = beforeOf(space);
    state = {
      space, tabs, tab: null, opts, owner: Boolean(opts.owner), before, draft: copyOf(before),
      options: { modules: [], builtin: [], environment: null }, layouts: { system: [], shared: [], canSetDefault: true },
      image: { file: null, url: '', remove: false }, links: { guestToken: space.guestToken || null, allowGuests: space.allowGuests !== false },
      users: null, saving: false,
    };
    el.dataset.who = opts.owner ? 'owner' : 'moderator';
    draw();
    // The bar's input and the panel's Name are one name: typed in either, the other follows.
    if (opts.nameInput && state.owner) {
      state.onBarName = () => { if (!state) return; state.draft.name = opts.nameInput.value; refresh(); const f = q('#setup-name'); if (f && f.value !== opts.nameInput.value) f.value = opts.nameInput.value; };
      opts.nameInput.addEventListener('input', state.onBarName);
    }
    el.hidden = false;
    if (!el.isConnected) doc.body.appendChild(el);
    select(pickTab(tabs, opts.tab));
    focusFirst();
    refresh();
    loadOptions().then(() => { if (state && state.space.id === space.id) { if (q('#setup-opens-with')) paintOpensWith(); if (q('#setup-first-visit')) paintLayouts(); refresh(); } });
    if (state.owner) loadOwnerParts(space);
    return true;
  }
  // The keyboard goes to the tab's first field: the name, the first member's switch, the dates' button, the first visit's choice.
  const FIRST_FIELD = { space: '#setup-name', members: '#setup-members input, #setup-allow-guests', phases: '#setup-phases', 'opens-with': '#setup-first-visit input:checked, #setup-first-visit input' };
  function focusFirst() {
    const content = q(`#setup-content-${state.tab}`);
    const first = q(FIRST_FIELD[state.tab] || '');
    if (first) first.focus();
    else if (content) content.focus();
  }

  function close() {
    if (!state) return;
    if (state.image.url) URL.revokeObjectURL(state.image.url);
    const { opts } = state;
    if (state.onBarName && opts.nameInput) opts.nameInput.removeEventListener('input', state.onBarName);
    state = null;
    el.hidden = true;
    el.innerHTML = '';
    if (typeof opts.onLeave === 'function') opts.onLeave();
  }

  // Cancel, as Escape does: asks "Discard your changes?" first when something was edited.
  function cancel() {
    if (!state || state.saving) return;
    state.bar.requestCancel();
  }

  // A refusal: the panel stays, on the field's tab, with the sentence and the keyboard on the field. What went through
  // before it stays saved and is said.
  const FIELD_INPUT = {
    name: '#setup-name', description: '#setup-description', profile: '#setup-profile', link: '#setup-link', linkIcon: '#setup-link-icon [aria-checked="true"]',
    publishCalendar: '#setup-publish-calendar', members: '#setup-members input', allowGuests: '#setup-allow-guests',
    opensWith: '#setup-opens-with input', defaultLayout: '#setup-first-visit input:checked', image: '.setup-picture-pick input', imageRemoved: '.setup-picture-pick input',
  };
  function refused(saved, failed, problem) {
    say(setupSaidWords({ saved, failed, problem }, { words: { members: `the ${membersWord()}`, allowGuests: `Allow ${word('guest', { many: true, cap: true })}` } }));
    const tab = FIELD_TAB[failed];
    if (tab && state.tabs.includes(tab)) select(tab);
    const input = q(FIELD_INPUT[failed] || '') || (failed === 'name' && state.opts.nameInput);
    if (input) input.focus();
    refresh();
    return false;
  }

  // One save: the PATCH for what changed, then the picture.
  async function done() {
    if (!state || state.saving) return false;
    const { space, image, opts } = state;
    if (opts.nameInput && state.owner) state.draft.name = opts.nameInput.value;
    const patch = patchNow();
    const saved = [];
    let answered = null;
    state.saving = true;
    el.classList.add('saving');
    say('');
    try {
      if (Object.keys(patch).length) {
        try {
          answered = (await api('PATCH', `/api/spaces/${encodeURIComponent(space.id)}`, patch)).space;
          saved.push(...Object.keys(patch));
          // What went through is now what was: a later refusal leaves only the rest to save.
          if (answered) {
            const fresh = beforeOf(answered);
            for (const k of Object.keys(patch)) state.before[k] = fresh[k];
            state.space = { ...state.space, ...answered };
            state.links = { guestToken: answered.guestToken || null, allowGuests: answered.allowGuests !== false };
          }
        } catch (err) {
          return refused(saved, problemField(patch, err.message), err.message);
        }
      }
      if (image.file) {
        try {
          answered = (await api('PUT', `/api/spaces/${encodeURIComponent(space.id)}/image`, image.file, image.file.type)).space;
          saved.push('image');
        } catch (err) {
          if (saved.length && typeof opts.onSaved === 'function') opts.onSaved(answered, saved);
          paintGuestLink();
          return refused(saved, 'image', err.message);
        }
      } else if (image.remove && state.space.hasImage) {
        try {
          answered = (await api('DELETE', `/api/spaces/${encodeURIComponent(space.id)}/image`)).space;
          saved.push('imageRemoved');
        } catch (err) {
          if (saved.length && typeof opts.onSaved === 'function') opts.onSaved(answered, saved);
          return refused(saved, 'imageRemoved', err.message);
        }
      }
    } finally {
      if (state) { state.saving = false; el.classList.remove('saving'); }
    }
    const said = setupSaidWords({ saved }, { words: { members: `the ${membersWord()}`, allowGuests: `Allow ${word('guest', { many: true, cap: true })}` } });
    const onDone = opts.onDone;
    close();
    if (typeof onDone === 'function') onDone(answered, said, saved);
    return true;
  }

  return { el, open, close, done, cancel, select: (id) => select(id, { focus: true }), isOpen: () => Boolean(state) };
}
