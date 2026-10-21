// The form standard's fast code check (documentation/plans/plan-form-standard.md, step 1; the measured one is
// tools/check-forms-live.mjs, `npm run check:forms`). It reads the stylesheets and the bundled modules' markup, styles and scripts.
//
// Everywhere:
//   1. The form block (between `form:start` and `form:end`) of public/sdk/host.css and public/style.css is identical, and
//      defines the layout tokens; the look tokens (--field-h, ...) are in the Fields block of public/sdk/system.css (step 13).
//   2. The block draws its corners only from the --radius-* tokens.
//   3. The date picker's rules live in host.css, not in a string in host.js.
// Only in a form that has moved (its markup says class="sdk-form"), so nothing fails until a module migrates:
//   4. Every visible input, select and textarea is in a .sdk-field (or a tick box / choice / people piece); every .sdk-field has a label.
//   5. Two fields side by side sit in a .sdk-form-row (a parent holding more than one .sdk-field must be a form, section, row, when, pair or group).
//   6. No old class is left (.editor-card, .editor-row, .editor-buttons, .row.buttons, .timing, .when-pick, .hm, .pairing,
//      .fieldgroup, .fieldgroup-title, .setup-field, .field-label).
//   7. No <select> lists more than eight fixed choices.
//   8. No datetime-local; a checkbox with role="switch" is the switch (.sdk-switch); a date field is the date picker's (the module
//      calls host.ui.datePicker, or the markup already has .sdk-datefield).
//   9. A field element carries no style="" of its own for height, border, background, radius or font size.
//  10. The module's stylesheet has no rule reaching into the form (.sdk-form, a .sdk-form class, a field element, a field's own
//      id) that declares anything but display, order, visibility or grid-column. Exceptions live in tools/check-forms-allow.json,
//      each with its reason, and Thomas decides each one.
// The self-tests plant each violation in a fixture and require it to fail, and a clean fixture to pass.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const TOKENS = ['--field-gap', '--section-gap'];
const LOOK_TOKENS = ['--field-h', '--field-pad-x', '--field-font', '--label-size', '--label-gap', '--check-h'];
const OLD_CLASSES = ['editor-card', 'editor-row', 'editor-buttons', 'timing', 'when-pick', 'hm', 'pairing', 'fieldgroup', 'fieldgroup-title', 'setup-field', 'field-label'];
const ROW_PARENTS = ['sdk-form', 'sdk-section', 'sdk-form-row', 'sdk-when', 'sdk-pair', 'sdk-group'];
const PIECES = ['sdk-field', 'sdk-choice-row', 'sdk-people', 'sdk-chip'];
const VOID = new Set(['input', 'br', 'hr', 'img', 'meta', 'link', 'source', 'area', 'base', 'col', 'embed', 'wbr']);
const FIELD_TAGS = new Set(['input', 'select', 'textarea']);
const ALLOWED_PROPS = new Set(['display', 'order', 'visibility', 'grid-column']);
const MAX_SELECT = 8;

// ---- the form block ----
export function formBlock(css) {
  const a = css.indexOf('/* form:start');
  const b = css.indexOf('/* form:end */');
  if (a < 0 || b < 0 || b < a) return null;
  return css.slice(a, b + '/* form:end */'.length);
}
export function checkBlocks(hostCss, styleCss, systemCss) {
  const out = [];
  if (systemCss !== undefined) {
    const a = systemCss.indexOf('/* fields:start */');
    const b = systemCss.indexOf('/* fields:end */');
    if (a < 0 || b < a) out.push('public/sdk/system.css has no fields:start ... fields:end block');
    else for (const t of LOOK_TOKENS) if (!new RegExp(`${t}\\s*:`).test(systemCss.slice(a, b))) out.push(`public/sdk/system.css: the fields block does not define ${t}`);
  }
  const h = formBlock(hostCss);
  const s = formBlock(styleCss);
  if (h === null) out.push('public/sdk/host.css has no form:start ... form:end block');
  if (s === null) out.push('public/style.css has no form:start ... form:end block');
  if (h === null || s === null) return out;
  if (h !== s) {
    const hl = h.split('\n'), sl = s.split('\n');
    let i = 0;
    while (i < hl.length && i < sl.length && hl[i] === sl[i]) i++;
    out.push(`the form block differs between public/sdk/host.css and public/style.css (first difference at block line ${i + 1}: "${(hl[i] || '').trim()}" vs "${(sl[i] || '').trim()}")`);
  }
  for (const [name, b] of [['public/sdk/host.css', h], ['public/style.css', s]]) {
    for (const t of TOKENS) if (!new RegExp(`${t}\\s*:`).test(b)) out.push(`${name}: the form block does not define ${t}`);
    for (const m of b.matchAll(/border(?:-[a-z]+)*-radius\s*:\s*([^;}]+)/g)) {
      const parts = m[1].trim().split(/\s+/);
      if (!parts.every((p) => /^(var\(--radius-(min|small|medium|large|round)\)|0|inherit|unset)$/.test(p))) out.push(`${name}: the form block has a radius that is not a --radius-* token: ${m[0].trim()}`);
    }
  }
  return out;
}
export function checkPickerCss(hostJs, hostCss) {
  const out = [];
  if (/(^|[\s,}`'"])\.(sdk-dp|tv-dow)[\w-]*[^{;\n()]*\{/m.test(hostJs)) out.push('public/sdk/host.js still carries date picker rules in a string; they belong in public/sdk/host.css');
  if (!/\.sdk-dp\b[^{]*\{/.test(hostCss)) out.push('public/sdk/host.css has no .sdk-dp rules (the date picker\'s rules live there)');
  return out;
}

// ---- a small HTML reader ----
function parseAttrs(s) {
  const a = {};
  for (const m of s.matchAll(/([^\s=/"'<>]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g)) a[m[1].toLowerCase()] = m[2] ?? m[3] ?? m[4] ?? '';
  return a;
}
export function parseHtml(html) {
  const rootNode = { tag: '#root', attrs: {}, children: [], parent: null };
  let cur = rootNode;
  const text = html.replace(/<!--[\s\S]*?-->/g, '').replace(/<(script|style)\b[\s\S]*?<\/\1>/gi, '');
  const re = /<(\/?)([a-zA-Z][\w-]*)((?:"[^"]*"|'[^']*'|[^>"'])*)>/g;
  let m;
  while ((m = re.exec(text))) {
    const [, close, tagRaw, rest] = m;
    const tag = tagRaw.toLowerCase();
    if (close) {
      let n = cur;
      while (n && n.tag !== tag) n = n.parent;
      if (n && n.parent) cur = n.parent;
      continue;
    }
    const node = { tag, attrs: parseAttrs(rest.replace(/\/\s*$/, '')), children: [], parent: cur };
    cur.children.push(node);
    if (!VOID.has(tag) && !/\/\s*$/.test(rest)) cur = node;
  }
  return rootNode;
}
const classes = (n) => (n.attrs.class || '').split(/\s+/).filter(Boolean);
const hasClass = (n, c) => classes(n).includes(c);
function* walk(n) { yield n; for (const c of n.children) yield* walk(c); }
function inside(n, stopAt, pred) { for (let p = n.parent; p && p !== stopAt.parent; p = p.parent) if (pred(p)) return true; return false; }
const label = (n) => `<${n.tag}${n.attrs.id ? ' id="' + n.attrs.id + '"' : ''}${n.attrs.name ? ' name="' + n.attrs.name + '"' : ''}${n.attrs.class ? ' class="' + n.attrs.class + '"' : ''}>`;

// The moved forms in a piece of text: HTML files whole, scripts by their sdk-form template strings.
export function movedForms(text, isScript) {
  const sources = isScript
    ? [...text.matchAll(/<form\b[^>]*\bsdk-form\b[\s\S]*?<\/form>/g)].map((m) => m[0].replace(/\$\{[^}]*\}/g, 'X'))
    : [text];
  const forms = [];
  for (const src of sources) for (const n of walk(parseHtml(src))) if (n.tag === 'form' && hasClass(n, 'sdk-form')) forms.push(n);
  return forms;
}

// ---- the moved-form rules ----
export function checkForm(form, ctx = {}) {
  const out = [];
  const where = ctx.where || 'form';
  const add = (msg) => out.push(`${where}: ${msg}`);
  for (const n of walk(form)) {
    if (n === form) { for (const c of classes(n)) if (OLD_CLASSES.includes(c)) add(`old class .${c} on the form`); continue; }
    for (const c of classes(n)) if (OLD_CLASSES.includes(c)) add(`old class .${c} on ${label(n)}`);
    if (hasClass(n, 'row') && hasClass(n, 'buttons')) add(`old class .row.buttons on ${label(n)}`);
    if (hasClass(n, 'sdk-field') && ![...walk(n)].some((d) => d !== n && hasClass(d, 'sdk-label'))) add(`${label(n)} has no .sdk-label`);
    if (!FIELD_TAGS.has(n.tag)) continue;
    const type = (n.attrs.type || (n.tag === 'input' ? 'text' : n.tag)).toLowerCase();
    if (type === 'hidden') continue;
    if (!inside(n, form, (p) => PIECES.some((c) => hasClass(p, c)))) add(`${label(n)} is not inside a .sdk-field or .sdk-choice-row`);
    if (type === 'datetime-local') add(`${label(n)} is a datetime-local; use a day field and a time field`);
    if (type === 'checkbox' && (n.attrs.role || '') === 'switch' && !hasClass(n, 'sdk-switch')) add(`${label(n)} is a checkbox with role="switch" and no .sdk-switch class`);
    if (type === 'date' && !inside(n, form, (p) => hasClass(p, 'sdk-datefield')) && !ctx.datePicker) add(`${label(n)} is a date field that is not the date picker's (call host.ui.datePicker on it)`);
    if (n.tag === 'select') {
      const opts = [...walk(n)].filter((o) => o.tag === 'option').length;
      if (opts > MAX_SELECT) add(`${label(n)} lists ${opts} choices as a plain select (the most is ${MAX_SELECT}; use the kind picker, the date field or people chips)`);
    }
    const st = n.attrs.style || '';
    const bad = st.split(';').map((d) => d.split(':')[0].trim().toLowerCase()).filter((p) => /^(height|min-height|max-height|border.*|background.*|font-size|font|padding.*|box-shadow|outline.*)$/.test(p));
    if (bad.length) add(`${label(n)} sets its own ${bad.join(', ')} in a style attribute`);
  }
  for (const n of walk(form)) {
    const fields = n.children.filter((c) => hasClass(c, 'sdk-field'));
    if (fields.length > 1 && n !== form && !ROW_PARENTS.some((c) => hasClass(n, c))) add(`fields side by side outside a .sdk-form-row: ${fields.map(label).join(' ')} in ${label(n)}`);
  }
  return out;
}

// ---- the module stylesheet rule ----
function stripCss(css) { return css.replace(/\/\*[\s\S]*?\*\//g, ''); }
export function cssRules(css) {
  // Flat list of { selector, body }, descending into @media/@container/@supports blocks.
  const rules = [];
  const src = stripCss(css);
  const scan = (text) => {
    let k = 0;
    while (k < text.length) {
      const open = text.indexOf('{', k);
      if (open < 0) break;
      const sel = text.slice(k, open).trim();
      let d = 1, j = open + 1;
      while (j < text.length && d) { if (text[j] === '{') d++; else if (text[j] === '}') d--; j++; }
      const body = text.slice(open + 1, j - 1);
      if (sel.startsWith('@')) { if (/^@(media|container|supports|layer)/.test(sel)) scan(body); }
      else rules.push({ selector: sel, body });
      k = j;
    }
  };
  scan(src);
  return rules;
}
export function checkModuleCss(css, names, allow = [], file = 'css') {
  const out = [];
  for (const r of cssRules(css)) {
    for (const sel of r.selector.split(',').map((s) => s.trim()).filter(Boolean)) {
      const reaches = /\.sdk-(form|field|label|hint|error|row|when|s|m|l|full|group|unit|field-btn|datefield|duration|money|pair|section|section-title|choice-row|choice-list|choice|people|form-error)\b/.test(sel)
        || (sel.match(/[#.][\w-]+/g) || []).some((t) => names.has(t))
        || (/(^|[\s>+~(])(input|select|textarea)\b/.test(sel) && (sel.match(/[#.][\w-]+/g) || []).some((t) => names.has('form' + t)));
      if (!reaches) continue;
      const bad = r.body.split(';').map((d) => d.split(':')[0].trim().toLowerCase()).filter((p) => p && !ALLOWED_PROPS.has(p) && !p.startsWith('--'));
      if (!bad.length) continue;
      if (allow.some((a) => a.file === file && a.selector === sel)) continue;
      out.push(`${file}: "${sel}" reaches into a form and sets ${[...new Set(bad)].join(', ')} (a form sets only display, order, visibility and grid-column; the SDK draws the field)`);
    }
  }
  return out;
}

// ---- the self-tests ----
function selfTest() {
  const fails = [];
  const expect = (name, got, want) => { if (!!got.length !== want) fails.push(`self-test "${name}": ${want ? 'expected a failure, got none' : 'expected a pass, got ' + got.join(' | ')}`); };
  const form = (inner, cls = 'sdk-form') => movedForms(`<form class="${cls}">${inner}</form>`, false)[0];
  const field = (c = '<input id="a" type="text">') => `<label class="sdk-field"><span class="sdk-label">A</span>${c}<span class="sdk-hint"></span></label>`;
  const clean = `${field()}<div class="sdk-form-row">${field('<input id="b">')}${field('<select id="c"><option>1</option></select>')}</div>
    <label class="sdk-choice-row"><input type="checkbox"> Yes</label>
    <div class="sdk-field" role="group"><span class="sdk-label">Day</span><div class="sdk-datefield sdk-group"><input type="date"><button class="sdk-icon-btn btn-small btn-quiet"></button></div></div>
    <input type="hidden" name="h">`;
  expect('clean form', checkForm(form(clean)), false);
  expect('unmoved form is ignored', movedForms('<form class="editor-card"><input></form>', false), false);
  expect('field outside .sdk-field', checkForm(form(clean + '<input id="loose">')), true);
  expect('side by side outside a row', checkForm(form(`<div class="x">${field()}${field('<input id="z">')}</div>`)), true);
  expect('old class', checkForm(form(`<div class="editor-row">${field()}</div>`)), true);
  expect('old class row.buttons', checkForm(form(`<div class="row buttons"></div>${field()}`)), true);
  expect('nine-choice select', checkForm(form(field('<select>' + '<option>x</option>'.repeat(9) + '</select>'))), true);
  expect('eight-choice select passes', checkForm(form(field('<select>' + '<option>x</option>'.repeat(8) + '</select>'))), false);
  expect('datetime-local', checkForm(form(field('<input type="datetime-local">'))), true);
  expect('switch checkbox without the switch class', checkForm(form(`<label class="sdk-choice-row"><input type="checkbox" role="switch"></label>`)), true);
  expect('switch checkbox', checkForm(form(`<label class="sdk-choice-row"><input type="checkbox" role="switch" class="sdk-switch"></label>`)), false);
  expect('bare date field', checkForm(form(field('<input type="date">'))), true);
  expect('bare date field with the picker called', checkForm(form(field('<input type="date">')), { datePicker: true }), false);
  expect('own height in a style attribute', checkForm(form(field('<input style="height:30px">'))), true);
  expect('field without a label', checkForm(form('<label class="sdk-field"><input></label>')), true);
  expect('script template form', movedForms('const t = `<form class="sdk-form"><input id="q"></form>`;', true).flatMap((f) => checkForm(f)), true);
  expect('module css sets a height', checkModuleCss('.sdk-form input { height: 30px }', new Set()), true);
  expect('module css sets a border on a field id', checkModuleCss('@media (max-width:600px){ #f-title { border: 1px solid red } }', new Set(['#f-title'])), true);
  expect('module css on a form class', checkModuleCss('.add-row input { padding: 0 }', new Set(['form.add-row'])), true);
  expect('module css elsewhere', checkModuleCss('.add-row input { padding: 0 }', new Set(['.other'])), false);
  expect('module css lays out', checkModuleCss('.sdk-form .x { display: none; grid-column: 1 / -1 } .card { height: 3px }', new Set(), []), false);
  expect('module css allow-list', checkModuleCss('.sdk-form input { height: 30px }', new Set(), [{ file: 'css', selector: '.sdk-form input' }]), false);
  const block = '/* form:start x */\n:root { ' + TOKENS.map((t) => `${t}: 1px;`).join(' ') + ' }\n.sdk-x { border-radius: var(--radius-small); }\n/* form:end */';
  expect('equal blocks', checkBlocks('a\n' + block, 'b\n' + block), false);
  expect('differing blocks', checkBlocks(block, block.replace('1px', '2px')), true);
  expect('missing token', checkBlocks(block.replace('--section-gap', '--x'), block.replace('--section-gap', '--x')), true);
  const sys = '/* fields:start */ :root { ' + LOOK_TOKENS.map((t) => `${t}: 1px;`).join(' ') + ' } /* fields:end */';
  expect('look tokens in system.css', checkBlocks(block, block, sys), false);
  expect('missing look token in system.css', checkBlocks(block, block, sys.replace('--check-h', '--x')), true);
  expect('numeric radius in the block', checkBlocks(block.replace('var(--radius-small)', '4px'), block.replace('var(--radius-small)', '4px')), true);
  expect('picker rules in host.js', checkPickerCss('const C = `\n.sdk-dp-day { color: red }\n`;', '.sdk-dp { a: b }'), true);
  expect('picker rules in host.css', checkPickerCss("pop.className = 'sdk-dp'; q('.sdk-dp-day')", '.sdk-dp { a: b }'), false);
  return fails;
}

export function runAll() {
  const problems = [];
  const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
  const hostCss = read('public/sdk/host.css');
  problems.push(...checkBlocks(hostCss, read('public/style.css'), read('public/sdk/system.css')));
  problems.push(...checkPickerCss(read('public/sdk/host.js'), hostCss));
  let allow = [];
  try { allow = JSON.parse(read('tools/check-forms-allow.json')).allow || []; } catch { /* no allow-list yet */ }
  let moved = 0;
  for (const m of fs.readdirSync(path.join(root, 'modules'))) {
    const src = path.join(root, 'modules', m, 'src');
    if (!fs.existsSync(src)) continue;
    const files = fs.readdirSync(src);
    const jsText = files.filter((f) => f.endsWith('.js')).map((f) => fs.readFileSync(path.join(src, f), 'utf8')).join('\n');
    const datePicker = /\.datePicker\s*\(/.test(jsText);
    const fieldIds = new Set();
    let any = false;
    for (const f of files.filter((f) => /\.(html|js)$/.test(f))) {
      const forms = movedForms(fs.readFileSync(path.join(src, f), 'utf8'), f.endsWith('.js'));
      for (const form of forms) {
        any = true; moved++;
        problems.push(...checkForm(form, { where: `modules/${m}/src/${f} ${label(form)}`, datePicker }));
        // Names a stylesheet can use to reach a field: the field elements' ids; their classes and the form's own, only together with a field tag in the selector.
        const own = (n, pre) => { if (n.attrs.id) fieldIds.add(pre + '#' + n.attrs.id); for (const c of classes(n)) if (!c.startsWith('sdk-')) fieldIds.add(pre + '.' + c); };
        own(form, 'form');
        for (const n of walk(form)) if (FIELD_TAGS.has(n.tag)) { own(n, ''); for (const c of classes(n)) { fieldIds.delete('.' + c); fieldIds.add('form.' + c); } }
      }
    }
    if (!any) continue;
    for (const f of files.filter((f) => f.endsWith('.css'))) problems.push(...checkModuleCss(read(`modules/${m}/src/${f}`), fieldIds, allow, `modules/${m}/src/${f}`));
  }
  return { problems, moved };
}

const self = selfTest();
if (self.length) { console.error('check-forms: self-test failed\n  ' + self.join('\n  ')); process.exit(1); }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { problems, moved } = runAll();
  if (problems.length) { console.error('check-forms: FAIL\n  ' + problems.join('\n  ')); process.exit(1); }
  console.log(`check-forms: ok (the form block is the same in host.css and style.css, ${moved} moved form${moved === 1 ? '' : 's'} checked)`);
}
