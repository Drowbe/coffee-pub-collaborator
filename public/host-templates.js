// The host console's Templates tab (plan-environment-templates.md, addendum 3, GitHub #91): every template (bundled,
// the host's own), with its source, version, whether it is hidden and which environments use it. A bundled template
// can be edited in place (an Edited badge, Reset to shipped, and a notice when a newer image changed the file).
// Duplicate makes a host template. Export for any; Import… from a file (a clashing id asks for another).
import { api, escapeHtml, word } from '/brand.js';
import { CHANGEABLE, DEFAULTS, VERBS, DEFAULT_VERBS } from '/words.js';
import { fileText } from '/file-text.js';

const $ = (id) => document.getElementById(id);
const say = (el, text, error = false) => { el.textContent = text; el.classList.toggle('error', error); el.hidden = !text; };
let product = ''; // the product's name (PRODUCT_NAME), from the host console's settings; see initTemplates
// "That isn't a <product> theme file.", or "a theme file" before the name is known.
const fileOfKind = (kind) => (product ? `${product} ${kind} file` : `${kind} file`);
const BUILT_IN = ['conference', 'chat'];
const SOURCE = { bundled: 'Bundled', host: 'Yours', imported: 'Imported' };
const DEFAULT_HOME_ICON = 'couch';
const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

let list = []; // GET /api/host/templates: [{ id, name, description, source, version, hidden, edited, update, usedBy }]
let onChange = () => {};
let editing = null; // the template being edited in full, or null for a new one
let comparing = null; // the bundled id whose update is open in the compare panel
let theme = null; // the editor's embedded theme ({ name, author?, light, dark }) or null
let moduleIds = [...BUILT_IN]; // the modules a template can list: the ones the image ships, then any other a template names
let shipped = null; // GET /api/host/settings `modules`: [{ id, name, icon }], loaded once
const moduleName = (id) => (shipped || []).find((m) => m.id === id)?.name || id;
const moduleIcon = (id) => (shipped || []).find((m) => m.id === id)?.icon || 'puzzle-piece';

// host.js hands over the list it loaded, and is told when it changes (the create form uses it too).
export function initTemplates(templates, changed, name) {
  if (typeof name === 'string' && name.trim()) product = name.trim();
  const by = $('template-shipped-by');
  if (by && product) by.textContent = `${product} ships`; // "the one shipped" until the name is known
  onChange = changed || onChange;
  list = templates || [];
  renderList();
}
async function reload() {
  list = (await api('GET', '/api/host/templates')).templates || [];
  renderList();
  onChange(list);
}

function renderList() {
  const box = $('template-list');
  const notices = $('template-notices');
  const updates = list.filter((t) => t.update);
  notices.innerHTML = updates.map((t) => `<li class="list-row" data-id="${escapeHtml(t.id)}"><span class="template-list-name">${escapeHtml(t.name || t.id)} was updated in this image: review</span><button class="btn btn-small" type="button" data-action="review">Review</button></li>`).join('');
  if (!list.length) { box.innerHTML = '<li class="hint">No templates yet.</li>'; return; }
  box.innerHTML = list.map((t) => {
    const own = t.source === 'host';
    const bundled = t.source === 'bundled';
    const used = (t.usedBy || []).length;
    const id = escapeHtml(t.id);
    const badge = t.edited ? ' <span class="template-edited">Edited</span>' : '';
    return `<li class="list-row" data-id="${id}">
      <span class="template-list-name"><strong>${escapeHtml(t.name || t.id)}</strong>${badge} <code>${id}</code>
        <span class="hint">${escapeHtml(SOURCE[t.source] || t.source)}, version ${escapeHtml(String(t.version || 1))}, <span title="${escapeHtml((t.usedBy || []).join(', '))}">used by ${used}</span>${t.hidden ? ', hidden' : ''}</span></span>
      ${own || bundled ? `<label class="check"><input type="checkbox" data-action="hide"${t.hidden ? ' checked' : ''}> Hidden</label>` : ''}
      <a class="btn btn-small" href="/api/host/templates/${encodeURIComponent(t.id)}/export" download>Export</a>
      ${own || bundled ? `<button class="btn btn-small" type="button" data-action="edit">Edit</button>` : ''}
      ${own || bundled ? `<button class="btn btn-small" type="button" data-action="duplicate">Duplicate</button>` : ''}
      ${bundled && t.edited ? `<button class="btn btn-small" type="button" data-action="reset">Reset to shipped</button>` : ''}
      ${own ? `<button class="btn btn-small danger" type="button" data-action="delete">Delete</button>` : ''}
    </li>`;
  }).join('');
}

$('template-list').addEventListener('change', async (e) => {
  if (e.target.dataset.action !== 'hide') return;
  const id = e.target.closest('[data-id]').dataset.id;
  try {
    await api('PATCH', `/api/host/templates/${encodeURIComponent(id)}`, { hidden: e.target.checked });
    await reload();
    say($('templates-status'), e.target.checked ? `${id} is hidden from new ${word('environment', { many: true })}.` : `${id} is offered again.`);
  } catch (err) {
    e.target.checked = !e.target.checked;
    say($('templates-status'), err.message, true);
  }
});
$('template-list').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-action]');
  if (!b) return;
  const id = b.closest('[data-id]').dataset.id;
  const t = list.find((x) => x.id === id);
  if (b.dataset.action === 'edit') {
    try {
      openEditor((await api('GET', `/api/host/templates/${encodeURIComponent(id)}`)).template);
    } catch (err) { say($('templates-status'), err.message, true); }
  } else if (b.dataset.action === 'duplicate') {
    await duplicateTemplate(t);
  } else if (b.dataset.action === 'reset') {
    if (!window.confirm(`Reset ${t.name || id} to the shipped version? Your edits are removed.`)) return;
    try {
      await api('DELETE', `/api/host/templates/${encodeURIComponent(id)}/edits`);
      closeCompare();
      await reload();
      say($('templates-status'), `${t.name || id} is back to the shipped version.`);
    } catch (err) { say($('templates-status'), err.message, true); }
  } else if (b.dataset.action === 'delete') {
    if ((t.usedBy || []).length) return say($('templates-status'), `In use by ${t.usedBy.join(', ')}. Hide it instead.`, true);
    if (!window.confirm(`Delete the ${t.name || id} template?`)) return;
    try {
      await api('DELETE', `/api/host/templates/${encodeURIComponent(id)}`);
      await reload();
      say($('templates-status'), `Deleted ${t.name || id}.`);
      $('template-new').focus();
    } catch (err) { say($('templates-status'), err.message, true); }
  }
});

$('template-notices').addEventListener('click', async (e) => {
  const b = e.target.closest('button[data-action="review"]');
  if (!b) return;
  const id = b.closest('[data-id]').dataset.id;
  try {
    const { template } = await api('GET', `/api/host/templates/${encodeURIComponent(id)}`);
    openCompare(template);
  } catch (err) { say($('templates-status'), err.message, true); }
});

async function duplicateTemplate(t) {
  const id = window.prompt('Id for the new template (lowercase letters, digits and dashes):', '');
  if (!id || !id.trim()) return;
  const name = window.prompt('Name for the new template:', t.name || '');
  if (!name || !name.trim()) return;
  try {
    const made = await api('POST', `/api/host/templates/${encodeURIComponent(t.id)}/duplicate`, { id: id.trim().toLowerCase(), name: name.trim() });
    await reload();
    openEditor((await api('GET', `/api/host/templates/${encodeURIComponent(made.template.id)}`)).template);
    say($('templates-status'), `Duplicated ${t.name || t.id} as ${made.template.name}.`);
  } catch (err) { say($('templates-status'), err.message, true); }
}

// Labels read at compare time, so they follow the words once the page has them.
const COMPARE_FIELDS = () => [
  ['name', 'Name'],
  ['description', 'Description'],
  ['words', 'Words'],
  ['verbs', 'Verbs'],
  ['icons', 'Home icon'],
  ['moduleNames', `${word('module', { cap: true })} names`],
  ['moduleIcons', `${word('module', { cap: true })} icons`],
  ['modules', word('module', { many: true, cap: true })],
  ['settings', 'Settings'],
  ['lobby', 'Lobby'],
  ['spaceDefaults', `New ${word('space')}`],
  ['reactions', 'Reactions'],
  ['theme', 'Theme'],
  ['iconSet', 'Icons'],
];
const shown = (value) => JSON.stringify(value ?? null, null, 2);
function openCompare(template) {
  comparing = template.id;
  const shipped = template.shipped || {};
  $('template-compare-title').textContent = `${template.name} was updated in this image: review`;
  const rows = COMPARE_FIELDS().filter(([key]) => shown(template[key]) !== shown(shipped[key]));
  $('template-compare-fields').innerHTML = rows.length
    ? rows.map(([key, label]) => `<div class="template-compare-row"><strong>${escapeHtml(label)}</strong><pre>${escapeHtml(shown(shipped[key]))}</pre><pre>${escapeHtml(shown(template[key]))}</pre></div>`).join('')
    : '<p class="hint">Nothing in the template differs. The shipped file\'s version changed.</p>';
  $('template-compare').hidden = false;
  $('template-compare').scrollIntoView({ block: 'start' });
  $('template-keep-mine').focus();
}
function closeCompare() {
  $('template-compare').hidden = true;
  comparing = null;
}
$('template-compare-close').addEventListener('click', closeCompare);
$('template-keep-mine').addEventListener('click', () => answerUpdate('mine'));
$('template-take-shipped').addEventListener('click', () => answerUpdate('shipped'));
async function answerUpdate(keep) {
  const id = comparing;
  const t = list.find((x) => x.id === id);
  if (!id || !t) return;
  if (keep === 'shipped' && !window.confirm(`This drops your edits to ${t.name || id}.`)) return;
  try {
    await api('POST', `/api/host/templates/${encodeURIComponent(id)}/update`, { keep });
    closeCompare();
    await reload();
    say($('templates-status'), keep === 'mine' ? `Kept your edits to ${t.name || id}.` : `${t.name || id} is back to the shipped version.`);
  } catch (err) { say($('templates-status'), err.message, true); }
}

// Import…: the file's text; a clashing id asks for another and sends it again with ?id=.
$('template-import').addEventListener('click', () => $('template-import-file').click());
$('template-import-file').addEventListener('change', async () => {
  const input = $('template-import-file');
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  const status = $('templates-status');
  if (file.size > 1024 * 1024) return say(status, `That isn't a ${fileOfKind('template')}.`, true);
  const text = await fileText(file);
  let id = '';
  for (;;) {
    try {
      const { template, dropped } = await api('POST', `/api/host/templates/import${id ? `?id=${encodeURIComponent(id)}` : ''}`, new Blob([text], { type: 'text/plain' }));
      await reload();
      const left = Array.isArray(dropped) && dropped.length ? ` Left out: ${dropped.join(', ')}.` : '';
      return say(status, `Imported ${template.name}.${left}`);
    } catch (err) {
      if (/^There is already a template called /.test(err.message)) {
        const next = window.prompt(`${err.message} Give this one another id (lowercase letters, digits and dashes):`, id);
        if (next && next.trim()) { id = next.trim().toLowerCase(); continue; }
        return say(status, 'Not imported.');
      }
      return say(status, err.problems && err.problems.length > 1 ? `${err.message} (${err.problems.length} problems)` : err.message, true);
    }
  }
});

// --- the editor -----------------------------------------------------------------------------------------------------
$('template-new').addEventListener('click', () => openEditor(null));
$('te-cancel').addEventListener('click', closeEditor);
function closeEditor() {
  $('template-editor').hidden = true;
  editing = null;
  $('template-new').focus();
}

// The modules a template can name: the ones this image ships (by name), then any other module a template lists.
async function loadModuleIds() {
  if (!shipped) shipped = (await api('GET', '/api/host/settings').catch(() => ({}))).modules || null;
  const own = (shipped || []).map((m) => m.id);
  const ids = new Set([...BUILT_IN, ...own]);
  const full = await Promise.all(list.map((t) => api('GET', `/api/host/templates/${encodeURIComponent(t.id)}`).then((a) => a.template).catch(() => null)));
  for (const t of full) if (t) for (const id of [...(t.modules || []), ...Object.keys(t.moduleNames || {}), ...Object.keys(t.moduleIcons || {})]) ids.add(id);
  const first = [...new Set([...BUILT_IN, ...own])];
  moduleIds = [...first, ...[...ids].filter((id) => !first.includes(id)).sort()];
}

const iconField = (value, label, placeholder) => `<span class="icon-field"><i class="fa-solid fa-${escapeHtml(value || placeholder)} fa-fw" aria-hidden="true"></i><input type="text" data-icon maxlength="40" value="${escapeHtml(value || '')}" placeholder="${escapeHtml(placeholder)}" aria-label="${escapeHtml(label)}" autocapitalize="off" spellcheck="false"></span>`;

async function openEditor(t) {
  editing = t;
  const form = $('template-editor');
  clearProblems();
  say($('te-status'), '');
  await loadModuleIds();
  $('template-editor-title').textContent = t ? `Edit ${t.name}` : 'New template';
  $('te-bundled-hint').hidden = !(t && t.source === 'bundled');
  $('te-id-label').hidden = Boolean(t);
  $('te-id').value = t ? t.id : '';
  $('te-name').value = t ? t.name : '';
  $('te-description').value = t ? t.description : '';
  const w = (t && t.words) || {};
  $('te-words').innerHTML = CHANGEABLE.map((key) => `<div class="word-row" data-word="${key}"><strong>${escapeHtml(cap(DEFAULTS[key].one))}</strong>`
    + `<input type="text" data-part="one" maxlength="30" value="${escapeHtml(w[key]?.one || '')}" placeholder="${escapeHtml(DEFAULTS[key].one)}" aria-label="${escapeHtml(DEFAULTS[key].one)}, singular">`
    + `<input type="text" data-part="many" maxlength="30" value="${escapeHtml(w[key]?.many || '')}" placeholder="${escapeHtml(DEFAULTS[key].many)}" aria-label="${escapeHtml(DEFAULTS[key].one)}, plural"></div>`).join('');
  // The verbs (addendum 4): one field each, blank for the default. `data-verb-key`, not data-verb, which the page fills.
  const v = (t && t.verbs) || {};
  const verbLabel = { enter: `Button for entering ${word('space', { a: true })}` };
  $('te-verbs').innerHTML = VERBS.map((key) => `<div class="word-row" data-verb-key="${key}"><strong>${escapeHtml(verbLabel[key] || key)}</strong>`
    + `<input type="text" data-verb-input maxlength="20" value="${escapeHtml(v[key] || '')}" placeholder="${escapeHtml(DEFAULT_VERBS[key])}" aria-label="${escapeHtml(verbLabel[key] || key)}"></div>`).join('');
  $('te-home').value = (t && t.icons && t.icons.home) || '';
  previewHome();
  const on = new Set((t && t.modules) || ['chat', 'conference']);
  const ids = [...new Set([...moduleIds, ...on])];
  $('te-modules').innerHTML = ids.map((id) => `<label class="check"><input type="checkbox" data-module="${escapeHtml(id)}"${on.has(id) ? ' checked' : ''}${id === 'chat' ? ' disabled title="Chat can\'t be switched off yet"' : ''}> ${escapeHtml(moduleName(id))}</label>`).join('');
  const names = (t && t.moduleNames) || {};
  const icons = (t && t.moduleIcons) || {};
  $('te-module-display').innerHTML = ids.map((id) => `<div class="module-display-row" data-display="${escapeHtml(id)}"><strong>${escapeHtml(moduleName(id))}</strong>`
    + `<input type="text" data-name maxlength="40" value="${escapeHtml(names[id] || '')}" placeholder="${escapeHtml(moduleName(id))}" aria-label="${escapeHtml(moduleName(id))}: name">`
    + `${iconField(icons[id], `${moduleName(id)}: icon, a Font Awesome name`, moduleIcon(id))}</div>`).join('');
  $('te-lobby-name').value = (t && t.lobby && t.lobby.name) || '';
  $('te-lobby-description').value = (t && t.lobby && t.lobby.description) || '';
  $('te-profile').value = (t && t.spaceDefaults && t.spaceDefaults.profile) || '';
  renderPhases((t && t.phases) || []);
  renderOpens((t && t.spaceDefaults && t.spaceDefaults.opensWith) || []);
  $('te-reactions').replaceChildren(...((t && t.reactions) || []).map(reactionRow));
  $('te-reactions-on').checked = Boolean(t && t.reactions);
  $('te-reactions-box').hidden = !$('te-reactions-on').checked;
  theme = (t && t.theme) || null;
  renderTheme();
  $('te-icon-set').value = ((t && t.iconSet) || []).join(' ');
  previewIconSet();
  form.hidden = false;
  form.scrollIntoView({ block: 'start' });
  (t ? $('te-name') : $('te-id')).focus();
}

const MAX_PHASES = 12;
function phaseRow(phase = {}) {
  const row = document.createElement('div');
  row.className = 'phase-row';
  row.innerHTML = `<input type="text" data-phase-id maxlength="32" value="${escapeHtml(phase.id || '')}" placeholder="planning" aria-label="Phase id" autocapitalize="off" spellcheck="false">`
    + `<input type="text" data-phase-label maxlength="40" value="${escapeHtml(phase.label || '')}" placeholder="Planning" aria-label="Phase label">`
    + `<label class="check"><input type="checkbox" data-phase-main${phase.main ? ' checked' : ''}> Main</label>`
    + `<span class="list-tools"><button type="button" class="btn btn-small" data-phase="up" aria-label="Move up"><i class="fa-solid fa-arrow-up" aria-hidden="true"></i></button>`
    + `<button type="button" class="btn btn-small" data-phase="down" aria-label="Move down"><i class="fa-solid fa-arrow-down" aria-hidden="true"></i></button>`
    + `<button type="button" class="btn btn-small danger" data-phase="remove">Remove</button></span>`;
  return row;
}
function renderPhases(phases) {
  $('te-phases').replaceChildren(...(phases || []).slice(0, MAX_PHASES).map(phaseRow));
  $('te-phase-add').disabled = $('te-phases').childElementCount >= MAX_PHASES;
}
function readPhases() {
  return [...$('te-phases').children].flatMap((row) => {
    const id = row.querySelector('[data-phase-id]').value.trim().toLowerCase();
    const label = row.querySelector('[data-phase-label]').value.trim();
    if (!id && !label) return [];
    const main = row.querySelector('[data-phase-main]').checked;
    return [{ id, label, ...(main ? { main: true } : {}) }];
  });
}
function moveRow(row, dir) {
  const sib = dir === 'up' ? row.previousElementSibling : row.nextElementSibling;
  if (!sib) return;
  if (dir === 'up') row.parentElement.insertBefore(row, sib);
  else row.parentElement.insertBefore(sib, row);
}
$('te-phase-add').addEventListener('click', () => {
  if ($('te-phases').childElementCount >= MAX_PHASES) return;
  const row = phaseRow();
  $('te-phases').append(row);
  $('te-phase-add').disabled = $('te-phases').childElementCount >= MAX_PHASES;
  row.querySelector('[data-phase-id]').focus();
});
$('te-phases').addEventListener('change', (e) => {
  if (!e.target.matches('[data-phase-main]') || !e.target.checked) return;
  for (const box of $('te-phases').querySelectorAll('[data-phase-main]')) if (box !== e.target) box.checked = false;
});
$('te-phases').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-phase]');
  if (!btn) return;
  const row = btn.closest('.phase-row');
  if (btn.dataset.phase === 'remove') {
    row.remove();
    $('te-phase-add').disabled = false;
    $('te-phase-add').focus();
    return;
  }
  moveRow(row, btn.dataset.phase);
  btn.focus();
});

function selectedModules() {
  return [...$('te-modules').querySelectorAll('[data-module]:checked')].map((box) => box.dataset.module);
}
function renderOpens(saved) {
  const fromTemplate = arguments.length > 0;
  const mods = selectedModules();
  const have = new Set(mods);
  const prior = fromTemplate ? (saved || []) : [...$('te-opens').querySelectorAll('.opens-row')].map((row) => row.dataset.open);
  const ticked = new Set(fromTemplate
    ? (saved || [])
    : [...$('te-opens').querySelectorAll('[data-opens]:checked')].map((box) => box.closest('.opens-row').dataset.open));
  const ranked = [...prior.filter((id) => have.has(id)), ...mods.filter((id) => !prior.includes(id))];
  $('te-opens').innerHTML = ranked.map((id) => `<div class="opens-row" data-open="${escapeHtml(id)}"><label class="check"><input type="checkbox" data-opens${ticked.has(id) ? ' checked' : ''}> ${escapeHtml(moduleName(id))}</label>`
    + `<span class="list-tools"><button type="button" class="btn btn-small" data-open-move="up" aria-label="Move ${escapeHtml(moduleName(id))} up"><i class="fa-solid fa-arrow-up" aria-hidden="true"></i></button>`
    + `<button type="button" class="btn btn-small" data-open-move="down" aria-label="Move ${escapeHtml(moduleName(id))} down"><i class="fa-solid fa-arrow-down" aria-hidden="true"></i></button></span></div>`).join('');
}
function readOpens() {
  return [...$('te-opens').querySelectorAll('.opens-row')].filter((row) => row.querySelector('[data-opens]').checked).map((row) => row.dataset.open);
}
$('te-modules').addEventListener('change', () => { if (!$('template-editor').hidden) renderOpens(); });
$('te-opens').addEventListener('click', (e) => {
  const btn = e.target.closest('[data-open-move]');
  if (!btn) return;
  moveRow(btn.closest('.opens-row'), btn.dataset.openMove);
  btn.focus();
});

function previewHome() { $('te-home-preview').className = `fa-solid fa-${$('te-home').value.trim() || DEFAULT_HOME_ICON} fa-fw`; }
$('te-home').addEventListener('input', previewHome);
$('te-module-display').addEventListener('input', (e) => {
  if (!e.target.matches('[data-icon]')) return;
  e.target.previousElementSibling.className = `fa-solid fa-${e.target.value.trim() || e.target.placeholder} fa-fw`;
});
const iconSetNames = () => $('te-icon-set').value.split(/[\s,]+/).map((s) => s.trim().replace(/^fa-/, '')).filter(Boolean);
function previewIconSet() { $('te-icon-preview').innerHTML = iconSetNames().slice(0, 60).map((n) => `<i class="fa-solid fa-${escapeHtml(n)} fa-fw" title="${escapeHtml(n)}"></i>`).join(''); }
$('te-icon-set').addEventListener('input', previewIconSet);

function reactionRow(r = {}) {
  const row = $('tpl-te-reaction').content.firstElementChild.cloneNode(true);
  row.querySelector('.reaction-glyph').value = r.glyph || '';
  row.querySelector('.reaction-label').value = r.label || '';
  if (r.id) row.dataset.id = r.id;
  return row;
}
$('te-reactions-on').addEventListener('change', () => {
  $('te-reactions-box').hidden = !$('te-reactions-on').checked;
  if ($('te-reactions-on').checked && !$('te-reactions').childElementCount) $('te-reactions').append(reactionRow());
});
$('te-reaction-add').addEventListener('click', () => { const row = reactionRow(); $('te-reactions').append(row); row.querySelector('input').focus(); });
$('te-reactions').addEventListener('click', (e) => { if (e.target.closest('[data-action="te-reaction-remove"]')) { e.target.closest('.reaction-row').remove(); $('te-reaction-add').focus(); } });

// The theme: a theme file (as Manage > Theme exports it). The server reads it (POST /api/host/themes/check, which stores
// nothing) and answers the theme as it will be embedded, so this page knows no file format of its own; Save checks the
// embedded theme again.
function renderTheme(dropped = []) {
  const left = dropped.length ? ` Left out: ${dropped.join(', ')}.` : '';
  $('te-theme-name').textContent = theme ? `${theme.name}${theme.author ? ` by ${theme.author}` : ''}: added to a new ${word('environment')} and used there.${left}` : `None: ${word('environment', { many: true })} keep their own theme.`;
  $('te-theme-clear').hidden = !theme;
}
$('te-theme-pick').addEventListener('click', () => $('te-theme-file').click());
$('te-theme-clear').addEventListener('click', () => { theme = null; renderTheme(); $('te-theme-pick').focus(); });
$('te-theme-file').addEventListener('change', async () => {
  const input = $('te-theme-file');
  const file = input.files[0];
  input.value = '';
  if (!file) return;
  clearProblems('theme');
  if (file.size > 1024 * 1024) { showProblems([`theme: That isn't a ${fileOfKind('theme')}.`]); return; }
  try {
    const answer = await api('POST', '/api/host/themes/check', new Blob([await fileText(file)], { type: 'text/plain' }));
    theme = answer.theme;
    renderTheme(Array.isArray(answer.dropped) ? answer.dropped : []);
  } catch (err) {
    showProblems([`theme: ${err.message}`]);
  }
});

// What the form holds, as template fields. Editing, an emptied optional part is null (the server removes it).
function fields() {
  const gone = editing ? null : undefined;
  const words = {};
  for (const row of $('te-words').children) {
    const one = row.querySelector('[data-part="one"]').value.trim();
    const many = row.querySelector('[data-part="many"]').value.trim();
    if (one || many) words[row.dataset.word] = { one, many };
  }
  const verbs = {};
  for (const row of $('te-verbs').children) {
    const text = row.querySelector('[data-verb-input]').value.trim();
    if (text) verbs[row.dataset.verbKey] = text;
  }
  const moduleNames = {};
  const moduleIcons = {};
  for (const row of $('te-module-display').children) {
    const name = row.querySelector('[data-name]').value.trim();
    const icon = row.querySelector('[data-icon]').value.trim();
    if (name) moduleNames[row.dataset.display] = name;
    if (icon) moduleIcons[row.dataset.display] = icon;
  }
  const lobby = {};
  if ($('te-lobby-name').value.trim()) lobby.name = $('te-lobby-name').value.trim();
  if ($('te-lobby-description').value.trim()) lobby.description = $('te-lobby-description').value.trim();
  const reactions = $('te-reactions-on').checked
    ? [...$('te-reactions').children].map((row) => ({ ...(row.dataset.id ? { id: row.dataset.id } : {}), glyph: row.querySelector('.reaction-glyph').value.trim(), label: row.querySelector('.reaction-label').value.trim() })).filter((r) => r.glyph || r.label)
    : gone;
  const iconSet = iconSetNames();
  const opensWith = readOpens();
  const spaceDefaults = {};
  if ($('te-profile').value) spaceDefaults.profile = $('te-profile').value;
  if (opensWith.length) spaceDefaults.opensWith = opensWith;
  const out = {
    name: $('te-name').value.trim(),
    description: $('te-description').value.trim(),
    words,
    verbs: Object.keys(verbs).length ? verbs : gone,
    phases: readPhases(),
    icons: $('te-home').value.trim() ? { home: $('te-home').value.trim() } : {},
    modules: [...$('te-modules').querySelectorAll('[data-module]:checked')].map((i) => i.dataset.module),
    moduleNames,
    moduleIcons,
    lobby,
    spaceDefaults: Object.keys(spaceDefaults).length ? spaceDefaults : (editing ? null : {}),
    reactions,
    theme: theme || gone,
    iconSet: iconSet.length ? iconSet : gone,
  };
  if (!editing) out.id = $('te-id').value.trim().toLowerCase();
  for (const k of Object.keys(out)) if (out[k] === undefined) delete out[k];
  return out;
}

// The server's problems beside the part they name ("words: ...", "moduleNames.travel: ...", '"id" must ...'); any
// other at the top.
function clearProblems(only) {
  for (const ul of document.querySelectorAll('#template-editor .problems')) if (!only || (ul.dataset.problems || '').split(' ').includes(only)) ul.replaceChildren();
}
function showProblems(problems) {
  for (const p of problems) {
    const key = (p.match(/^"?([A-Za-z]+)/) || [])[1] || '';
    const ul = [...document.querySelectorAll('#template-editor [data-problems]')].find((x) => x.dataset.problems.split(' ').includes(key)) || $('tp-problems');
    const li = document.createElement('li');
    li.textContent = p;
    ul.append(li);
    ul.closest('details')?.setAttribute('open', '');
  }
}

$('template-editor').addEventListener('submit', async (e) => {
  e.preventDefault();
  clearProblems();
  const body = fields();
  const save = $('te-save');
  save.disabled = true;
  say($('te-status'), 'Saving…');
  try {
    const { template } = editing
      ? await api('PATCH', `/api/host/templates/${encodeURIComponent(editing.id)}`, body)
      : await api('POST', '/api/host/templates', body);
    $('template-editor').hidden = true;
    editing = null;
    await reload();
    say($('templates-status'), `Saved ${template.name}, version ${template.version}.`);
    $('template-list').querySelector(`[data-id="${CSS.escape(template.id)}"] [data-action="edit"]`)?.focus();
  } catch (err) {
    say($('te-status'), err.problems && err.problems.length > 1 ? `${err.problems.length} things to fix, shown above.` : err.message, true);
    showProblems(err.problems || [err.message]);
    $('template-editor').querySelector('.problems li')?.closest('fieldset, form')?.scrollIntoView({ block: 'nearest' });
  } finally {
    save.disabled = false;
  }
});
