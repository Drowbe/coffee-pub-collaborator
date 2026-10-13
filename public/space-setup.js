// Set up (documentation/plans/plan-one-bar.md, decision 5, step 4): a mode on the space's own screen in place of the
// Edit page. The bar's Set up tool puts `body.setting-up` on, the space's name becomes an input in the bar, and this
// side panel opens, with Save and Cancel in an action bar locked to its bottom (public/action-bar.js; the sections
// scroll above it, a click outside does nothing, Escape asks "Discard changes?" when something was edited): the name, the picture, the faces in the call, the people (a
// link to the full settings' Members tab for now), Phases (the timeline sheet of step 3), and First visit: one choice of
// what a first visit opens (plan-layout-views.md, step 5), the Workspace with its Opens with switches under it (always
// editable: they are the Workspace's own content), Calendar or Map while they are on here, or a shared layout. An owner
// and the admin see all of it; a moderator sees Phases and First visit (the server lets a moderator PATCH exactly
// `phases`, `opensWith` and `defaultLayout`); a member has no Set up. No module
// switches here (decision 4: they stay in the Workspace's toolbar). Save sends what changed in one go with the requests
// space-settings.js uses (PATCH /api/spaces/:id, PUT and DELETE /api/spaces/:id/image) and leaves the mode; Cancel and
// Escape leave it and drop the edits. The dates are the phase sheet's own, with its own Save.
//
// The pure parts (setupSections, setupPatch, setupSaidWords) touch no document, so tools/check-nav.mjs runs them in
// node; the page hands it what it needs (createSpaceSetup's `deps`).
import { actionBar } from './action-bar.js';

// What the panel shows, by rights: everything for an owner (or the admin), the moderator's two, nothing for anyone else.
export const OWNER_SECTIONS = Object.freeze(['name', 'picture', 'faces', 'people', 'phases', 'first-visit']);
export const MODERATOR_SECTIONS = Object.freeze(['phases', 'first-visit']);
export function setupSections({ owner = false, moderator = false } = {}) {
  if (owner) return [...OWNER_SECTIONS];
  if (moderator) return [...MODERATOR_SECTIONS];
  return [];
}

const sameList = (a, b) => {
  if (a === null || b === null) return a === b;
  return a.length === b.length && a.every((id, i) => id === b[i]);
};
const listOrNull = (v) => (Array.isArray(v) && v.length ? v.filter((id) => typeof id === 'string') : null);

// The PATCH body for what changed between `before` (the space as it was) and `after` (the panel's draft), each
// { name, profile, opensWith, defaultLayout }. A name is trimmed, and an empty one is no change. The first visit's
// layout and Opens with are independent (plan-layout-views.md, step 5): each goes only when it changed, never one for
// the other. `defaultLayout` is 'calendar', 'map' or a shared layout's id; the Workspace (null, or 'workspace') goes
// as null. {} when nothing changed.
const layoutOrNull = (v) => (typeof v === 'string' && v && v !== 'workspace' ? v : null);
export function setupPatch(before = {}, after = {}) {
  const patch = {};
  const name = typeof after.name === 'string' ? after.name.trim() : '';
  if (name && name !== (before.name || '')) patch.name = name;
  if (after.profile !== undefined && after.profile !== (before.profile || 'participants')) patch.profile = after.profile;
  const wasLayout = layoutOrNull(before.defaultLayout);
  const nowLayout = after.defaultLayout === undefined ? wasLayout : layoutOrNull(after.defaultLayout);
  if (nowLayout !== wasLayout) patch.defaultLayout = nowLayout;
  const wasList = listOrNull(before.opensWith);
  const nowList = after.opensWith === undefined ? wasList : listOrNull(after.opensWith);
  if (!sameList(wasList, nowList)) patch.opensWith = nowList;
  return patch;
}

// The line a person reads after Save: what was saved, in words, and what to do next. `saved` is the fields that went
// through (the PATCH's keys, and 'image' or 'imageRemoved'); `failed` a field that did not with the server's sentence.
const FIELD_WORDS = { name: 'the name', profile: 'the faces in the call', opensWith: 'Opens with', defaultLayout: 'the first visit', image: 'the picture', imageRemoved: 'the picture' };
export function setupSaidWords({ saved = [], failed = null, problem = '' } = {}, { setUp = 'Set up' } = {}) {
  const names = [...new Set(saved.map((f) => FIELD_WORDS[f] || f))];
  const list = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0] || '';
  if (failed) {
    const what = FIELD_WORDS[failed] || failed;
    const why = problem ? ` ${problem[0].toUpperCase()}${problem.slice(1).replace(/\.?$/, '.')}` : '';
    return `${what[0].toUpperCase()}${what.slice(1)} was not saved.${why}${names.length ? ` ${list[0].toUpperCase()}${list.slice(1)} ${names.length > 1 ? 'were' : 'was'} saved.` : ''} Change it and press Save again, or Cancel.`;
  }
  if (!names.length) return `Nothing changed. Press ${setUp} to change something.`;
  return `Saved ${list}. Everyone sees it now; press ${setUp} to change more.`;
}

// --- the panel ----------------------------------------------------------------------------------------------------

// `deps`: { api, word, switchListHtml, wireSwitchList, opensWithSummary, escapeHtml, doc }.
// Returns { open(opts), close(), done(), cancel(), isOpen(), el }. `open({ space, owner, moderator, phases,
// openPhases, onDone, onLeave, nameInput })`: `space` the space's record (id, name, profile, hasImage,
// opensWith, defaultLayout), `nameInput` the bar's input (kept in step with the panel's Name), `openPhases()` opens the
// sheet, `onDone(space, said)` is told once the save went through (the space the server answered), `onLeave()` when
// the mode ends either way.
// The full settings' tab the people link opens (space-settings.js's tabs).
const PEOPLE_TAB = 'members';

export function createSpaceSetup(deps) {
  const { api, word, switchListHtml, wireSwitchList, opensWithSummary, escapeHtml } = deps;
  const doc = deps.doc || document;
  const el = doc.createElement('aside');
  el.id = 'space-setup';
  el.className = 'space-setup action-surface';
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-labelledby', 'space-setup-title');
  el.hidden = true;
  let state = null; // while open: { space, sections, draft, options, layouts, opts, image: { file?, remove? }, saving }

  const sectionHtml = (id, title, inner) => `<section class="setup-section" data-section="${id}"><h3 class="setup-heading">${title}</h3>${inner}</section>`;
  function draw() {
    const { sections, space } = state;
    const has = (id) => sections.includes(id);
    const parts = [];
    if (has('name')) parts.push(sectionHtml('name', 'Name', '<label class="setup-field"><span class="visually-hidden">Name</span><input type="text" id="setup-name" maxlength="40" autocomplete="off"></label><p class="hint">Shown in the bar and on Home.</p>'));
    if (has('picture')) {
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
    }
    if (has('faces')) {
      parts.push(sectionHtml('faces', 'Faces in the call', `
        <label class="setup-field"><span class="visually-hidden">Faces in the call</span><select id="setup-profile">
          <option value="participants">People's own pictures</option>
          <option value="characters">Their character pictures</option>
        </select></label>
        <p class="hint">What each person's tile shows while their camera is off.</p>`));
    }
    if (has('people')) {
      parts.push(sectionHtml('people', escapeHtml(word('member', { many: true, cap: true })), `
        <a class="setup-link" id="setup-people" data-overlay-link href="/spaces/${encodeURIComponent(space.id)}#${PEOPLE_TAB}"><i class="fa-solid fa-user-group fa-fw" aria-hidden="true"></i> ${escapeHtml(word('member', { many: true, cap: true }))}, invites and the ${escapeHtml(word('guest'))} link</a>
        <p class="hint">Who is in this ${escapeHtml(word('space'))}. Opens the full settings.</p>`));
    }
    if (has('phases')) {
      parts.push(sectionHtml('phases', 'Phases', state.opts.phases
        ? '<button type="button" class="btn btn-small" id="setup-phases" aria-haspopup="dialog"><i class="fa-solid fa-timeline fa-fw" aria-hidden="true"></i> Set the dates</button><p class="hint">When each phase starts. The dates have their own Save in the sheet.</p>'
        : '<p class="hint">This template has no phases.</p>'));
    }
    // First visit (plan-layout-views.md, step 5): one choice, radios of one name. The Workspace first, with its Opens
    // with switches directly under it (always editable, whichever is picked: they are what the Workspace holds), then
    // Calendar and Map while they are on here, then the shared layouts by name (paintLayouts).
    if (has('first-visit')) {
      parts.push(`<section class="setup-section" data-section="first-visit"><h3 class="setup-heading" id="setup-first-visit-heading">First visit</h3>
        <p class="hint setup-first-visit-hint" id="setup-first-visit-hint">What someone sees the first time they enter this ${escapeHtml(word('space'))}. After that, each person's own arrangement is remembered.</p>
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
        <p class="hint" id="setup-layout-note" hidden></p></section>`);
    }
    const fullSettings = has('name') ? `<a class="setup-link setup-full" data-overlay-link href="/spaces/${encodeURIComponent(space.id)}"><i class="fa-solid fa-gear fa-fw" aria-hidden="true"></i> Full settings</a>` : '';
    el.innerHTML = `
      <div class="setup-head">
        <h2 id="space-setup-title">Set up</h2>
        <p class="setup-which" id="space-setup-which"></p>
      </div>
      <div class="setup-body">${parts.join('')}${fullSettings}</div>
      <p class="setup-status status" id="space-setup-status" role="status" aria-live="polite"></p>`;
    el.querySelector('.setup-body').classList.add('action-content');
    state.bar = actionBar({
      label: 'Save the set up',
      doc,
      ids: { save: 'setup-save', cancel: 'setup-cancel-button' },
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
  const say = (text) => { const s = q('#space-setup-status'); if (s) { s.textContent = ''; s.textContent = text; } };

  function fillFields() {
    const { space, draft, opts } = state;
    const name = q('#setup-name');
    if (name) name.value = draft.name;
    const profile = q('#setup-profile');
    if (profile) profile.value = draft.profile;
    paintPicture();
    if (q('#setup-first-visit')) paintLayouts();
    if (q('#setup-opens-with')) paintOpensWith();
    if (opts.nameInput) opts.nameInput.value = draft.name;
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
    const text = opensWithSummary({
      list: state.draft.opensWith,
      environment: state.options.environment,
      modules: state.options.modules.map((m) => m.id),
      canOpen: (id) => all.some((c) => c.id === id),
      nameOf: (id) => all.find((c) => c.id === id)?.name || id,
    });
    note.textContent = text;
    note.hidden = !text;
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

  function wire() {
    const name = q('#setup-name');
    if (name) name.addEventListener('input', () => { state.draft.name = name.value; if (state.opts.nameInput) state.opts.nameInput.value = name.value; });
    const profile = q('#setup-profile');
    if (profile) profile.addEventListener('change', () => { state.draft.profile = profile.value; });
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
  // Any edit in the panel: Save follows what changed (once, here; the panel is drawn again on each open). Escape is Cancel.
  el.addEventListener('input', () => state && state.bar.refresh());
  el.addEventListener('change', () => state && state.bar.refresh());
  el.addEventListener('click', () => state && state.bar.refresh()); // Remove picture and the like
  el.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape' || event.defaultPrevented || !state) return;
    event.preventDefault();
    event.stopPropagation();
    state.bar.requestCancel();
  });

  // Whether something would be lost on Cancel: the PATCH has something in it, or a picture was chosen or removed.
  function isDirty() {
    if (!state) return false;
    const { space, draft, before, image, opts } = state;
    const name = opts.nameInput && state.sections.includes('name') ? opts.nameInput.value : draft.name;
    return Object.keys(setupPatch(before, { ...draft, name })).length > 0 || Boolean(image.file) || Boolean(image.remove && space.hasImage);
  }

  async function loadOptions() {
    const { space } = state;
    const asks = state.sections.includes('first-visit');
    const [answer, layouts] = await Promise.all([
      asks ? api('GET', `/api/modules/for-space?space=${encodeURIComponent(space.id)}`).catch(() => ({})) : Promise.resolve({}),
      asks ? api('GET', `/api/spaces/${encodeURIComponent(space.id)}/layouts`).catch(() => ({})) : Promise.resolve({}),
    ]);
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
    const sections = setupSections({ owner: opts.owner, moderator: opts.moderator });
    if (!sections.length) return false;
    // 'roleplaying' is the older name of the participants' pictures (server/store.js), so it reads as that here.
    const before = { name: space.name || '', profile: space.profile === 'characters' ? 'characters' : 'participants', opensWith: listOrNull(space.opensWith), defaultLayout: space.defaultLayout || null };
    state = { space, sections, opts, before, draft: { ...before, opensWith: before.opensWith ? [...before.opensWith] : null }, options: { modules: [], builtin: [], environment: null }, layouts: { system: [], shared: [], canSetDefault: true }, image: { file: null, url: '', remove: false }, saving: false };
    el.dataset.who = opts.owner ? 'owner' : 'moderator';
    draw();
    // The bar's input and the panel's Name are one name: typed in either, the other follows.
    if (opts.nameInput && sections.includes('name')) {
      state.onBarName = () => { if (!state) return; state.draft.name = opts.nameInput.value; state.bar.refresh(); const f = q('#setup-name'); if (f && f.value !== opts.nameInput.value) f.value = opts.nameInput.value; };
      opts.nameInput.addEventListener('input', state.onBarName);
    }
    el.hidden = false;
    if (!el.isConnected) doc.body.appendChild(el);
    const first = el.querySelector('#setup-name, #setup-phases, #setup-first-visit input:checked, #setup-opens-with input, select, button');
    if (first) first.focus();
    loadOptions().then(() => { if (state && state.space === space) { if (q('#setup-opens-with')) paintOpensWith(); if (q('#setup-first-visit')) paintLayouts(); state.bar.refresh(); } });
    return true;
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

  // Cancel, as Escape does: asks "Discard changes?" first when something was edited.
  function cancel() {
    if (!state || state.saving) return;
    state.bar.requestCancel();
  }

  // One save: the PATCH for what changed, then the picture. A refusal keeps the panel open with the sentence and the
  // keyboard on the field; what went through before it stays saved.
  async function done() {
    if (!state || state.saving) return false;
    const { space, draft, before, image, opts } = state;
    if (opts.nameInput && state.sections.includes('name')) draft.name = opts.nameInput.value;
    const patch = setupPatch(before, draft);
    const saved = [];
    let answered = null;
    state.saving = true;
    el.classList.add('saving');
    try {
      if (Object.keys(patch).length) {
        try {
          answered = (await api('PATCH', `/api/spaces/${encodeURIComponent(space.id)}`, patch)).space;
          saved.push(...Object.keys(patch));
        } catch (err) {
          const failed = Object.keys(patch)[0];
          say(setupSaidWords({ saved, failed, problem: err.message }));
          const field = failed === 'name' ? q('#setup-name') : failed === 'profile' ? q('#setup-profile') : failed === 'defaultLayout' ? q('#setup-first-visit input:checked') : q('#setup-opens-with input');
          if (field) field.focus();
          return false;
        }
      }
      if (image.file) {
        try {
          answered = (await api('PUT', `/api/spaces/${encodeURIComponent(space.id)}/image`, image.file, image.file.type)).space;
          saved.push('image');
        } catch (err) {
          say(setupSaidWords({ saved, failed: 'image', problem: err.message }));
          q('.setup-picture-pick input')?.focus();
          return false;
        }
      } else if (image.remove && space.hasImage) {
        try {
          answered = (await api('DELETE', `/api/spaces/${encodeURIComponent(space.id)}/image`)).space;
          saved.push('imageRemoved');
        } catch (err) {
          say(setupSaidWords({ saved, failed: 'imageRemoved', problem: err.message }));
          q('.setup-picture-pick input')?.focus();
          return false;
        }
      }
    } finally {
      if (state) { state.saving = false; el.classList.remove('saving'); }
    }
    const said = setupSaidWords({ saved });
    const onDone = opts.onDone;
    close();
    if (typeof onDone === 'function') onDone(answered, said, saved);
    return true;
  }

  return { el, open, close, done, cancel, isOpen: () => Boolean(state) };
}
