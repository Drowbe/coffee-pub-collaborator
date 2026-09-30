#!/usr/bin/env node
/*
 * check-object-format.mjs -- the objects format on its own: the Assistant's rule and the
 * published instructions ask for one fenced JSON array, the schema matches the checker, and readObjects keeps what it should.
 * The formats named by kind (plan-kind-names.md, step 1): the marker reader, the ```objects block, and every file and
 * answer from before the change (tools/fixtures/format-old/) refused with its sentence.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
// A made-up product name for the server code this check loads, so a sentence that hard-codes the default
// fails here (plan-kind-names.md, The guard).
const PRODUCT = 'Testname';
process.env.PRODUCT_NAME = PRODUCT;
const {
  ICONS, KINDS, MAX_IMPORT_OBJECTS, MAX_IMPORT_CANDIDATES,
  cleanObject, objectRule, instructions, schema, readObjects, decodeBytes, FormatError,
} = require('../server/object-format.js');
const { MAX_SUMMARIES, parseSummaries, buildPrompt } = require('../server/ai.js');
const fileFormat = require('../server/file-format.js');
const themeFile = require('../server/theme-file.js');
const templateFile = require('../server/template-file.js');
const { Store } = require('../server/store.js');
const { bundledModules } = require('../server/module-build.js');
const bundled = bundledModules(new URL('../modules', import.meta.url).pathname).map((m) => m.id);

const fixtures = (name) => fs.readFileSync(new URL(`./fixtures/object-format/${name}`, import.meta.url), 'utf8');
const oldFixture = (name) => fs.readFileSync(new URL(`./fixtures/format-old/${name}`, import.meta.url), 'utf8');
// An old-format file by its kind ("theme", "template", "objects"), so no product name is written here.
const oldFixtureNames = () => fs.readdirSync(new URL('./fixtures/format-old/', import.meta.url)).sort();
const oldFiles = (kind) => oldFixtureNames().filter((f) => f.endsWith(`-${kind}.json`)).map((f) => [f, oldFixture(f)]);
const oldFile = (kind) => oldFiles(kind)[0][1];
const refusedWith = (sentence) => (e) => e instanceof FormatError && e.status === 400 && e.message === sentence;
const OLD_ANSWER = fileFormat.OLD_SENTENCES.answer;
const OLD_OBJECTS = fileFormat.OLD_SENTENCES.objects;

let n = 0;
const test = (name, fn) => { fn(); n += 1; };

test('the /ai rule asks for one array in one objects fence, each one an object', () => {
  const rule = buildPrompt('ask', [], 'Why?').prompt;
  assert.match(rule, /Always include at least one object: /);
  assert.match(rule, /```objects\n\[/);
  assert.match(rule, /exactly one, never one per object/);
  assert.match(rule, /at most 20/);
  assert.ok(!/\bcards?\b/.test(rule), 'the rule never says card');
  assert.equal(MAX_SUMMARIES, 20);
});

test('published instructions: one objects array, icons, kinds, 50, file paragraph, no provenance', () => {
  const text = instructions('object');
  assert.ok(text.startsWith(`I keep my research in ${PRODUCT}. `), 'the product from PRODUCT_NAME');
  assert.match(text, /```objects\n\[/);
  assert.match(text, /exactly one, never one per object/);
  assert.match(text, /at most 50/);
  assert.ok(text.includes('<something>.objects.json holding {"format":"objects","formatVersion":1,"objects":[...]}'));
  for (const label of fileFormat.PAST_BLOCK_LABELS) assert.ok(!text.toLowerCase().includes(`\`\`\`${label}`), label);
  assert.match(text, /Do not write a separate file or a separate fenced block/);
  assert.ok(!text.includes('one block per'));
  assert.ok(!text.includes('basis'));
  assert.ok(!text.includes('sources'));
  for (const name of ICONS) assert.ok(text.includes(name), name);
  for (const name of KINDS) assert.ok(text.includes(name), name);
});

test('schema() matches the checker', () => {
  const s = schema();
  assert.ok(s.title.startsWith(`${PRODUCT} `), 'the title names the product from PRODUCT_NAME');
  assert.equal('$id' in s, false, 'no $id (plan-kind-names.md, choice 1)');
  assert.deepEqual(s.$defs.file.required, ['format', 'formatVersion', 'objects']);
  assert.deepEqual([s.$defs.file.properties.format, s.$defs.file.properties.formatVersion], [{ const: 'objects' }, { const: 1 }]);
  assert.match(s.description, /\.objects\.json file/);
  assert.deepEqual(s.$defs.object.properties.icon.enum, ICONS);
  assert.deepEqual(s.$defs.object.properties.kind.enum, KINDS);
  JSON.parse(JSON.stringify(s));
  const kept = cleanObject({
    icon: 'hotel', kind: 'hotel', title: 'Casa', content: 'Stay.', tags: ['faro'],
    place: { name: 'Faro', lat: 37.019, lng: -7.93 }, date: '2026-10-03',
    links: [{ title: 'Casa', url: 'https://example.com/casa' }],
  }, { imported: true });
  const obj = s.$defs.object;
  assert.ok(kept.title.length <= obj.properties.title.maxLength);
  assert.ok(kept.content.length <= obj.properties.content.maxLength);
  assert.ok(obj.properties.icon.enum.includes(kept.icon));
  assert.ok(obj.properties.kind.enum.includes(kept.kind));
  assert.match(kept.tags[0], new RegExp(obj.properties.tags.items.pattern));
  assert.match(kept.date, new RegExp(obj.properties.date.pattern));
  assert.match(kept.links[0].url, new RegExp(obj.properties.links.items.properties.url.pattern));
});

test('pasted answer: objects blocks, one or three', () => {
  const three = readObjects(fixtures('three-objects.txt'));
  assert.equal(three.objects.length, 3);
  assert.equal(three.objects[0].title, 'Casa do Largo');
  assert.equal(three.objects[1].title, 'Bar do Peixe');
  assert.equal(three.objects[2].title, 'Visa reminder');
  const one = readObjects(fixtures('one-object.txt'));
  assert.equal(one.objects.length, 1);
  assert.equal(one.objects[0].title, 'One object');
});

test('an objects block holding an array of two', () => {
  const out = readObjects(fixtures('objects-array.txt'));
  assert.equal(out.objects.length, 2);
  assert.equal(out.objects[0].title, 'First');
  assert.equal(out.objects[1].title, 'Second');
});

test('raw JSON: one object or an array', () => {
  const one = readObjects('{"title":"Solo","content":"One object."}');
  assert.equal(one.objects.length, 1);
  assert.equal(one.objects[0].title, 'Solo');
  const many = readObjects('[{"title":"A","content":"a"},{"title":"B","content":"b"},{"title":"C","content":"c"}]');
  assert.equal(many.objects.length, 3);
});

test('a file: format 1, refused when the version or list is wrong', () => {
  const ok = readObjects(fixtures('file-ok.json'));
  assert.equal(ok.objects.length, 2);
  assert.throws(() => readObjects('{"format":"objects","formatVersion":2,"objects":[]}'), refusedWith('that file is format 2; this server reads format 1'));
  const notAFile = refusedWith('that is not a .objects.json file');
  assert.throws(() => readObjects('{"format":"objects","formatVersion":"1","objects":[]}'), notAFile);
  assert.throws(() => readObjects('{"format":"objects","objects":[]}'), notAFile, 'no formatVersion');
  assert.throws(() => readObjects('{"format":"objects","formatVersion":1.5,"objects":[]}'), notAFile);
  assert.throws(() => readObjects('{"format":"theme","formatVersion":1,"objects":[]}'), notAFile, 'another kind with a formatVersion');
  assert.throws(() => readObjects('{"format":"objects","formatVersion":1}'), refusedWith('that file has no list of objects'));
  // A single object with a format field of its own is still an object (choice 7).
  const own = readObjects('{"title":"Slides","content":"The deck.","format":"pdf"}');
  assert.deepEqual(own.objects.map((o) => o.title), ['Slides']);
});

test('UTF-16 with a byte order mark reads the same as UTF-8', () => {
  const text = fs.readFileSync(new URL('./fixtures/object-format/utf8-sample.json', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
  const utf8 = Buffer.from(text, 'utf8');
  const le = Buffer.alloc(2 + text.length * 2);
  le[0] = 0xff; le[1] = 0xfe;
  for (let i = 0; i < text.length; i += 1) le.writeUInt16LE(text.charCodeAt(i), 2 + i * 2);
  assert.equal(decodeBytes(utf8).replace(/\r\n/g, '\n'), decodeBytes(le).replace(/\r\n/g, '\n'));
  assert.deepEqual(readObjects(decodeBytes(le)).objects, readObjects(decodeBytes(utf8)).objects);
});

test('rendered view without fences, and braces with no title', () => {
  const out = readObjects(fixtures('rendered-view.txt'));
  assert.equal(out.objects.length, 2);
  assert.equal(out.objects[0].title, 'Hotel Nova');
  assert.equal(out.objects[1].title, 'Museum hours');
  assert.throws(() => readObjects(fixtures('braces-no-title.txt')), (e) => /nothing in that could be read as objects/.test(e.message));
});

test('imported objects drop sources and set basis imported', () => {
  const out = readObjects('{"title":"T","content":"c","basis":"both","sources":[1]}');
  assert.equal(out.objects[0].basis, 'imported');
  assert.equal(out.objects[0].sources, undefined);
});

test('cleanObject without imported refuses a model basis of imported', () => {
  const a = cleanObject({ title: 'T', content: 'c', basis: 'imported' }, { count: 0 });
  assert.equal(a.basis, 'general');
  const b = cleanObject({ title: 'T', content: 'c', basis: 'imported' }, { count: 2 });
  assert.equal(b.basis, 'items');
});

test('links: http and https kept; the rest dropped', () => {
  const kept = cleanObject({
    title: 'T', content: 'c',
    links: [
      { title: 'ok', url: 'https://a.example/x' },
      { url: 'http://plain.example' },
      { url: 'javascript:1' },
      { url: 'data:text/plain,hi' },
      { url: 'ftp://files.example' },
      { url: 'https://u:p@a.example' },
      { url: 'https://example.com/' + 'x'.repeat(500) },
      { title: 'sixth', url: 'https://sixth.example' },
    ],
  }, { imported: true });
  assert.deepEqual(kept.links, [
    { title: 'ok', url: 'https://a.example/x' },
    { title: 'plain.example', url: 'http://plain.example/' },
  ]);
});

test('title and content cuts, tags stripped, dropped reasons', () => {
  const long = cleanObject({ title: 't'.repeat(200), content: 'x'.repeat(5999) }, { imported: true });
  assert.equal(long.title.length, 80);
  assert.equal(long.content.length, 5999);
  const cut = cleanObject({ title: 'T', content: 'y'.repeat(6001) }, { imported: true });
  assert.equal(cut.content.length, 6000);
  const html = cleanObject({ title: 'T', content: 'a <script>bad</script> claim' }, { imported: true });
  assert.equal(html.content, 'a bad claim');
  const miss = readObjects('[{"content":"no title"},{"title":"No content"},{"title":"Ok","content":"yes"}]');
  assert.equal(miss.objects.length, 1);
  assert.deepEqual(miss.dropped, [
    { at: 1, why: 'it has no title' },
    { at: 2, why: 'it has no content' },
  ]);
});

test('caps: 50 kept, 200 candidates read', () => {
  const sixty = Array.from({ length: 60 }, (_, i) => ({ title: `T${i}`, content: 'c' }));
  const over = readObjects(JSON.stringify(sixty));
  assert.equal(over.objects.length, 50);
  assert.equal(over.over, 10);
  assert.equal(over.found, 60);
  const many = Array.from({ length: 250 }, (_, i) => ({ title: `T${i}`, content: 'c' }));
  const capped = readObjects(JSON.stringify(many));
  assert.equal(capped.found, MAX_IMPORT_CANDIDATES);
  assert.equal(capped.objects.length, MAX_IMPORT_OBJECTS);
  assert.equal(capped.over, MAX_IMPORT_CANDIDATES - MAX_IMPORT_OBJECTS);
});

test('empty and white space is refused', () => {
  assert.throws(() => readObjects(''), (e) => e.status === 400 && e.message === 'paste an answer or choose a file first');
  assert.throws(() => readObjects('   \n\t  '), (e) => e.message === 'paste an answer or choose a file first');
});

test('a block that is not JSON is dropped; others still come through', () => {
  const text = '```objects\nnot json\n```\n```objects\n{"title":"Ok","content":"yes"}\n```';
  const out = readObjects(text);
  assert.equal(out.objects.length, 1);
  assert.equal(out.objects[0].title, 'Ok');
  assert.deepEqual(out.dropped, [{ at: 1, why: 'not valid JSON' }]);
});

test('parseSummaries reads objects, summary, json and bare blocks, and no other label', () => {
  for (const label of ['objects', 'summary', 'json', '']) {
    const out = parseSummaries(`\`\`\`${label}\n{"title":"T","content":"c"}\n\`\`\``, 0);
    assert.deepEqual([out.summaries.length, out.text], [1, '{{summary:0}}'], label || 'bare');
  }
  for (const label of ['card', ...fileFormat.PAST_BLOCK_LABELS]) {
    const text = `\`\`\`${label}\n{"title":"T","content":"c"}\n\`\`\``;
    const out = parseSummaries(text, 0);
    assert.deepEqual([out.summaries.length, out.text], [0, text], label);
  }
});

test('parseSummaries reads one fence holding an array', () => {
  const out = parseSummaries('```objects\n[{"title":"A","content":"one"},{"title":"B","content":"two"}]\n```', 0);
  assert.equal(out.summaries.length, 2);
  assert.equal(out.summaries[0].title, 'A');
  assert.equal(out.summaries[1].title, 'B');
  assert.equal(out.text, '{{summary:0}}\n{{summary:1}}');
});

test('the marker reader: stamp, ok, newer, old by shape, not', () => {
  for (const kind of ['theme', 'template', 'objects']) {
    assert.deepEqual(fileFormat.stamp(kind), { format: kind, formatVersion: 1 });
    const cap = kind[0].toUpperCase() + kind.slice(1);
    assert.equal(fileFormat.readMarker({ format: kind, formatVersion: 1 }, kind), 'ok');
    assert.equal(fileFormat.readMarker({ format: kind, formatVersion: 7 }, kind), 'newer');
    for (const label of fileFormat.PAST_BLOCK_LABELS) assert.equal(fileFormat.readMarker({ [`${label}${cap}`]: 1 }, kind), 'old', `${label}${cap}`);
    // Only a past label's exact marker is old (plan-kind-names.md, F4): another word before the kind, or a past label in
    // another case, is not.
    for (const label of fileFormat.PAST_BLOCK_LABELS) assert.equal(fileFormat.readMarker({ [`${label.toUpperCase()}${cap}`]: 1 }, kind), 'not', `${label.toUpperCase()}${cap}`);
    assert.equal(fileFormat.readMarker({ anyword: 1, [`another${cap}`]: 3 }, kind), 'not', 'another word before the kind');
    assert.equal(fileFormat.readMarker({ [`related${cap}`]: 3 }, kind), 'not', `related${cap}`);
    for (const not of [
      { format: kind }, { format: kind, formatVersion: '1' }, { format: kind, formatVersion: 1.5 }, { format: kind, formatVersion: 0 },
      { format: kind === 'theme' ? 'template' : 'theme', formatVersion: 1 }, {}, { [`some${cap}`]: '1' }, { [`Some${cap}`]: 1 },
      { format: 'other', [`some${cap}`]: 1 }, null, [], 'text',
    ]) assert.equal(fileFormat.readMarker(not, kind), 'not', JSON.stringify(not));
  }
  assert.ok(Object.isFrozen(fileFormat.PAST_BLOCK_LABELS));
  assert.equal(fileFormat.PAST_BLOCK_LABELS.length, 2, 'the list never grows');
});

test('old files are refused, each with its sentence', () => {
  const sanitize = (t) => Store.prototype.sanitizeTheme.call(null, t);
  // An old theme, template and objects file for each past label (tools/fixtures/format-old/).
  for (const kind of ['theme', 'template', 'objects']) assert.equal(oldFiles(kind).length, fileFormat.PAST_BLOCK_LABELS.length, `an old ${kind} file for each past label`);
  for (const [name, text] of oldFiles('theme')) assert.throws(() => themeFile.readThemeFile(text, sanitize), (e) => e.message === themeFile.OLD_THEME_FILE, name);
  for (const [name, text] of oldFiles('template')) assert.throws(() => templateFile.readTemplateFile(text, { bundled }), (e) => e.message === templateFile.OLD_TEMPLATE_FILE, name);
  for (const [name, text] of oldFiles('objects')) assert.throws(() => readObjects(text), refusedWith(OLD_OBJECTS), name);
  assert.equal(themeFile.OLD_THEME_FILE, 'That theme file is in an older format. Export the theme again and import the new file.');
  assert.throws(() => templateFile.readTemplateFile(oldFile('template'), { bundled }), (e) => e.message === templateFile.OLD_TEMPLATE_FILE);
  assert.equal(templateFile.OLD_TEMPLATE_FILE, 'That template file is in an older format. Export the template again and import the new file.');
  assert.throws(() => readObjects(oldFile('objects')), refusedWith(OLD_OBJECTS));
  assert.equal(OLD_OBJECTS, 'that file is in an older format: copy the instructions again and ask the AI for a new file');
  // The first past name's markers too, built from the list rather than written here.
  const [first] = fileFormat.PAST_BLOCK_LABELS;
  const theme = JSON.parse(oldFile('theme'));
  const unmark = (file, cap) => Object.fromEntries(Object.entries(file).filter(([k]) => !new RegExp(`^[a-z]+${cap}$`).test(k)));
  const themeRest = unmark(theme, 'Theme');
  assert.throws(() => themeFile.readThemeFile({ [`${first}Theme`]: 1, ...themeRest }, sanitize), (e) => e.message === themeFile.OLD_THEME_FILE);
  const template = JSON.parse(oldFile('template'));
  const templateRest = unmark(template, 'Template');
  assert.throws(() => templateFile.readTemplateFile({ [`${first}Template`]: 1, ...templateRest }, { bundled }), (e) => e.message === templateFile.OLD_TEMPLATE_FILE);
  assert.throws(() => readObjects(JSON.stringify({ [`${first}Objects`]: 1, objects: [{ title: 'T', content: 'c' }] })), refusedWith(OLD_OBJECTS));
  // The same files with the new marker are read.
  assert.equal(themeFile.readThemeFile({ ...fileFormat.stamp('theme'), ...themeRest }, sanitize).name, 'Harbour');
  assert.equal(templateFile.readTemplateFile({ ...fileFormat.stamp('template'), ...templateRest }, { bundled }).raw.id, 'travel');
  assert.equal(readObjects(JSON.stringify({ ...fileFormat.stamp('objects'), objects: [{ title: 'T', content: 'c' }] })).objects.length, 1);
  // An unknown key ending in the kind is not an old marker: the file gets its "not a ... file" sentence.
  assert.throws(() => themeFile.readThemeFile({ someTheme: 1, ...themeRest }, sanitize), (e) => e.message === themeFile.NOT_A_THEME_FILE);
  assert.throws(() => templateFile.readTemplateFile({ someTemplate: 1, ...templateRest }, { bundled }), (e) => e.message === templateFile.NOT_A_TEMPLATE_FILE);
  assert.throws(() => readObjects(JSON.stringify({ formatVersion: 1, someObjects: 1, objects: [] })), refusedWith('that is not a .objects.json file'));
});

test('a single object with a key that ends in the kind is read as an object, not refused as an old file', () => {
  const related = readObjects(fixtures('related-key.json'));
  assert.deepEqual([related.objects.length, related.objects[0].title], [1, 'Related']);
  const bare = readObjects('{"title":"A","relatedObjects":3}');
  assert.deepEqual([bare.found, bare.dropped.map((d) => d.why)], [1, ['it has no content']], 'found as one object; dropped only by the object rule');
  assert.equal(readObjects('{"title":"A","content":"c","someObjects":1}').objects.length, 1);
});

test('an answer with a past block label is refused whole: valid or not, closed or not, any case, mixed', () => {
  const answers = oldFixtureNames().filter((f) => f.startsWith('answer-'));
  for (const name of ['answer-first-label.txt', 'answer-second-label.txt', 'answer-capitals-unclosed.txt', 'answer-mixed.txt', 'answer-words-after.txt', 'answer-dash-list.txt', 'answer-star-list.txt', 'answer-numbered-list.txt', 'answer-quote.txt', 'answer-nested-quote.txt', 'answer-indented-crlf.txt']) assert.ok(answers.includes(name), name);
  for (const name of answers) assert.throws(() => readObjects(oldFixture(name)), refusedWith(OLD_ANSWER), name);
  assert.ok(oldFixture('answer-indented-crlf.txt').includes('\r\n'), 'the CRLF fixture keeps its CRLF');
  // A label that only starts with a past label is not an old-named block: read (here by the loose reading).
  assert.deepEqual(readObjects(oldFixture('near-miss-longer-label.txt')).objects.map((o) => o.title), ['Near miss']);
  assert.equal(OLD_ANSWER, 'that answer is in an older format: copy the instructions again and ask the AI for a new answer');
  for (const label of fileFormat.PAST_BLOCK_LABELS) {
    const good = '[{"title":"T","content":"c"}]';
    for (const shown of [label, label.toUpperCase(), label[0].toUpperCase() + label.slice(1)]) {
      assert.throws(() => readObjects(`Intro.\n\`\`\`${shown}\n${good}\n\`\`\``), refusedWith(OLD_ANSWER), `${shown}, valid`);
      assert.throws(() => readObjects(`\`\`\`${shown} \t\nnot json\n\`\`\``), refusedWith(OLD_ANSWER), `${shown}, not JSON`);
      assert.throws(() => readObjects(`\`\`\`${shown}\n${good}`), refusedWith(OLD_ANSWER), `${shown}, unclosed`);
      assert.throws(() => readObjects(`Intro.\r\n\`\`\`${shown}\r\n${good}\r\n\`\`\`\r\n`), refusedWith(OLD_ANSWER), `${shown}, CRLF`);
      assert.throws(() => readObjects(`- one\n  \`\`\`${shown}\n  ${good}\n  \`\`\``), refusedWith(OLD_ANSWER), `${shown}, indented in a list`);
      // Widened after QA (F4): words after the label; inside a -, *, + or numbered list, a quote, a nested quote, and
      // their mixes; indented with CRLF; more backticks.
      for (const fence of [
        `\`\`\`${shown} json`, `\`\`\` ${shown}\ttext`, `\`\`\`${shown}.json`, `- \`\`\`${shown}`, `* \`\`\`${shown}`, `+ \`\`\`${shown}`, `1. \`\`\`${shown}`, `12) \`\`\`${shown}`,
        `> \`\`\`${shown}`, `>\`\`\`${shown}`, `> > \`\`\`${shown}`, `>> \`\`\`${shown}`, `  - > \`\`\`${shown} json`, `> 1. \`\`\`${shown}`, `\t\`\`\`${shown}`, `\`\`\`\`${shown}`,
      ]) {
        assert.throws(() => readObjects(`Intro.\n${fence}\n${good}\n\`\`\``), refusedWith(OLD_ANSWER), JSON.stringify(fence));
        assert.throws(() => readObjects(`Intro.\r\n    ${fence}\r\n${good}\r\n\`\`\`\r\n`), refusedWith(OLD_ANSWER), `${JSON.stringify(fence)}, indented, CRLF`);
      }
    }
    // Not a list or quote marker before the fence, so not a fence: text before it on the line.
    assert.equal(readObjects(`Say \`\`\`${label} and\n{"title":"T","content":"c"}`).objects.length, 1, 'text before the backticks');
    for (const near of [`${label}s`, `${label}-notes`, `${label}_x`, `${label}2`]) {
      assert.equal(readObjects(`\`\`\`${near}\n{"title":"T","content":"c"}\n\`\`\``).objects.length, 1, `${near} is not a past label`);
      assert.equal(readObjects(`- \`\`\`${near} json\n  {"title":"T","content":"c"}\n  \`\`\``).objects.length, 1, `${near} in a list is not a past label`);
    }
    // A word that only starts with a past label is not one.
    assert.equal(readObjects(`\`\`\`${label}x\n{"title":"T","content":"c"}\n\`\`\``).objects.length, 1, `${label}x is not a past label`);
  }
});

test('the objects block and a paste without fences are read; a card block only by the loose reading', () => {
  const noFences = readObjects(fixtures('no-fences.txt'));
  assert.deepEqual(noFences.objects.map((o) => o.title), ['Casa do Largo', 'Bar do Peixe']);
  const card = readObjects(fixtures('card-block.txt'));
  assert.deepEqual(card.objects.map((o) => o.title), ['Loose one', 'Loose two']);
  // Not read as a block: a card block that isn't JSON is not a dropped "not valid JSON" candidate, and a card block
  // beside an objects block adds nothing.
  assert.throws(() => readObjects('```card\nnot json\n```'), (e) => /nothing in that could be read as objects: paste the whole answer, with its objects blocks$/.test(e.message));
  const both = readObjects('```objects\n{"title":"Kept","content":"k"}\n```\n```card\n{"title":"Ignored","content":"i"}\n```');
  assert.deepEqual(both.objects.map((o) => o.title), ['Kept']);
});

console.log(`check-object-format: OK (${n} checks)`);
