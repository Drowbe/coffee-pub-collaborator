// The one rule for the three file formats (documentation/plans/plan-kind-names.md, "One marker reader"): a theme,
// a template and an objects file each say what they are with the same pair of keys, named by kind and never by the
// product: { "format": "theme" | "template" | "objects", "formatVersion": 1 }. The theme, template and objects
// readers ask readMarker; nothing else reads a marker.
'use strict';

// The newest version of each kind this server reads. Each kind keeps its own number.
const FORMAT_VERSIONS = Object.freeze({ theme: 1, template: 1, objects: 1 });

// The marker for a file of `kind` this server writes.
function stamp(kind) {
  return { format: kind, formatVersion: FORMAT_VERSIONS[kind] };
}

// What `file` (JSON already parsed) says about itself, for `kind`:
//   'ok'     format is the kind and formatVersion is a whole number this server reads
//   'newer'  format is the kind and formatVersion is a whole number above what this server reads
//   'old'    no format at all, and a marker from before this change (see oldMarkers)
//   'not'    anything else: another kind's format, a missing or non-whole formatVersion, no marker
function readMarker(file, kind) {
  if (!file || typeof file !== 'object' || Array.isArray(file)) return 'not';
  const newest = FORMAT_VERSIONS[kind];
  if (Object.prototype.hasOwnProperty.call(file, 'format')) {
    if (file.format !== kind) return 'not';
    const v = file.formatVersion;
    if (!Number.isInteger(v) || v < 1) return 'not';
    return v > newest ? 'newer' : 'ok';
  }
  if (oldMarkers(kind).some((key) => Object.prototype.hasOwnProperty.call(file, key) && Number.isInteger(file[key]))) return 'old';
  return 'not';
}

// The sentences for a file (or an AI's answer) in a format from before this change: why it is refused and what to do.
// The theme and template readers export them as OLD_THEME_FILE and OLD_TEMPLATE_FILE; the objects reader uses the rest.
const OLD_SENTENCES = Object.freeze({
  theme: 'That theme file is in an older format. Export the theme again and import the new file.',
  template: 'That template file is in an older format. Export the template again and import the new file.',
  objects: 'that file is in an older format: copy the instructions again and ask the AI for a new file',
  answer: 'that answer is in an older format: copy the instructions again and ask the AI for a new answer',
});

// The labels an AI's answer was ever fenced with while the objects block was named by the product, known only so
// such an answer is refused (decision 11). Must never grow: no block label is named by the product again. A fence
// label is a bare word, so these can't be recognised by shape like the markers above, and deriving them from the
// configured name would stop recognising them when the default changes (plan-kind-names.md, "Objects files and blocks").
const PAST_BLOCK_LABELS = Object.freeze(['magpie', 'collaborator']);

// The markers from before the formats were named by kind, for `kind`: a past label followed by the kind with a capital
// ("<label>Theme": 1), built from PAST_BLOCK_LABELS so no old name is written twice. Only these exact keys count, so a
// single object with a field of its own that happens to end in the kind ("relatedObjects") is not taken for an old file.
function oldMarkers(kind) {
  const cap = kind ? kind[0].toUpperCase() + kind.slice(1) : '';
  return FORMAT_VERSIONS[kind] ? PAST_BLOCK_LABELS.map((label) => `${label}${cap}`) : [];
}

module.exports = { FORMAT_VERSIONS, stamp, readMarker, OLD_SENTENCES, PAST_BLOCK_LABELS };
