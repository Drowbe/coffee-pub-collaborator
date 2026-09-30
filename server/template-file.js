// A template as a file (documentation/plans/plan-environment-templates.md, addendum 2, "Template files"):
// `<name>.template.json`, holding { format: "template", formatVersion: 1, ...the template's fields } (the marker:
// server/file-format.js, plan-kind-names.md), its theme in the theme file's shape without the theme's own marker
// (server/theme-file.js). At most 64 KB. Reading one drops (and lists) the keys it doesn't know, at the top level
// and inside its theme, then checks what is left exactly as a bundled or host template is checked (server/templates.js).
'use strict';

const templates = require('./templates');
const themeFile = require('./theme-file');
const { productName } = require('./product-name');
const fileFormat = require('./file-format');

const TEMPLATE_FILE_VERSION = fileFormat.FORMAT_VERSIONS.template;
const MAX_TEMPLATE_FILE_BYTES = 64 * 1024;
const NOT_A_TEMPLATE_FILE = `That isn't a ${productName()} template file.`;
const NEWER = `This template was made by a newer version of ${productName()}.`;
const OLD_TEMPLATE_FILE = fileFormat.OLD_SENTENCES.template;

class TemplateFileError extends Error {
  constructor(message, status = 400, problems = null) {
    super(message);
    this.status = status;
    if (problems) this.problems = problems;
  }
}

// The file for a template as the server keeps it (templates.cleanTemplate's shape, from any source).
function templateToFile(t) {
  const out = fileFormat.stamp('template');
  for (const key of templates.FIELDS) {
    if (key === 'theme' || key === 'reactions') continue;
    if (t[key] !== undefined && t[key] !== null) out[key] = t[key]; // a part the template doesn't have is left out
  }
  if (t.reactions) out.reactions = t.reactions;
  if (t.theme) {
    const { format, formatVersion, ...theme } = themeFile.themeToFile(t.theme);
    out.theme = theme;
  }
  if (t.edited) out.edited = true; // an edited bundled template; import ignores this and does not list it as dropped
  return out;
}

function templateFileName(name) {
  return `${themeFile.safeFileStem(name, 'template')}.template.json`;
}

// Checks a file (its text, or JSON already parsed) and answers { raw, dropped }: `raw` the template's own fields, valid
// by problemsOf. Refusals, in order: too big, not JSON, not an object, format not "template", formatVersion missing or
// not a whole number -> NOT_A_TEMPLATE_FILE; a marker from before the formats were named by kind -> OLD_TEMPLATE_FILE; a
// newer formatVersion -> NEWER; then what is left must be a valid template (the first problem is the error; `problems`
// lists them all). `bundled`: the bundled modules' ids.
function readTemplateFile(input, { bundled = [], byteLength = null } = {}) {
  let file = input;
  if (typeof input === 'string' || Buffer.isBuffer(input)) {
    const text = Buffer.isBuffer(input) ? input.toString('utf8') : input;
    if (Buffer.byteLength(text) > MAX_TEMPLATE_FILE_BYTES) throw new TemplateFileError(NOT_A_TEMPLATE_FILE);
    try { file = JSON.parse(text); } catch { throw new TemplateFileError(NOT_A_TEMPLATE_FILE); }
  } else if (byteLength !== null && byteLength > MAX_TEMPLATE_FILE_BYTES) {
    throw new TemplateFileError(NOT_A_TEMPLATE_FILE);
  }
  if (!file || typeof file !== 'object' || Array.isArray(file)) throw new TemplateFileError(NOT_A_TEMPLATE_FILE);
  const marker = fileFormat.readMarker(file, 'template');
  if (marker === 'old') throw new TemplateFileError(OLD_TEMPLATE_FILE);
  if (marker === 'newer') throw new TemplateFileError(NEWER);
  if (marker !== 'ok') throw new TemplateFileError(NOT_A_TEMPLATE_FILE);
  const dropped = [];
  const raw = {};
  for (const [key, value] of Object.entries(file)) {
    if (key === 'format' || key === 'formatVersion' || key === 'edited') continue; // the marker, and `edited` (marks an export): not template fields
    if (!templates.FIELDS.includes(key)) { dropped.push(key); continue; }
    raw[key] = value;
  }
  if (raw.theme && typeof raw.theme === 'object' && !Array.isArray(raw.theme)) {
    const known = ['name', 'author', 'light', 'dark'];
    // The theme file's own marker, if the theme was pasted in from one, is not an unknown key: it is left out quietly.
    for (const key of Object.keys(raw.theme)) if (!known.includes(key) && key !== 'format' && key !== 'formatVersion') dropped.push(`theme.${key}`);
    raw.theme = Object.fromEntries(Object.entries(raw.theme).filter(([k]) => known.includes(k)));
    for (const mode of ['light', 'dark']) {
      const set = raw.theme[mode];
      if (!set || typeof set !== 'object') continue;
      for (const key of Object.keys(set)) if (!themeFile.SET_KEYS.includes(key)) dropped.push(`theme.${mode}.${key}`);
      raw.theme[mode] = Object.fromEntries(Object.entries(set).filter(([k]) => themeFile.SET_KEYS.includes(k)));
    }
  }
  const problems = templates.problemsOf(raw, { bundled });
  if (problems.length) throw new TemplateFileError(problems[0], 400, problems);
  return { raw, dropped };
}

module.exports = { TEMPLATE_FILE_VERSION, MAX_TEMPLATE_FILE_BYTES, NOT_A_TEMPLATE_FILE, NEWER, OLD_TEMPLATE_FILE, TemplateFileError, templateToFile, templateFileName, readTemplateFile };
