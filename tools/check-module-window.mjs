#!/usr/bin/env node
/*
 * check-module-window.mjs -- the module window's rules that can be checked mechanically (see
 * documentation/architecture/architecture-module-window.md, "Rules"). Today: every "..." in the host is the one
 * icon, Font Awesome's `ellipsis-vertical` -- the host's overflow buttons, a card's own menu, a day's, the call's
 * More. Not the horizontal `ellipsis`, and not a text glyph standing in for it. Drift here was found by hand once
 * (a vertical glyph on a poll, a horizontal icon everywhere else); this keeps it from coming back.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [];
const walk = (dir, keep) => {
  for (const name of fs.readdirSync(dir)) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) { if (name !== 'node_modules' && name !== 'dist' && name !== 'lib') walk(p, keep); } else if (keep(p)) files.push(p);
  }
};
walk(path.join(root, 'public'), (p) => /\.(js|html)$/.test(p) && !/[/\\](livekit|maplibre|pmtiles)/.test(p));
walk(path.join(root, 'modules'), (p) => /[/\\]src[/\\][^/\\]+\.(js|html)$/.test(p) && !/-lib-a-|maplibre/.test(p));

// A "..." drawn any way but the one icon: the horizontal Font Awesome icon (in a class, a data-icon, an icon name
// handed to the SDK), or a glyph standing in for the icon (the vertical or horizontal ellipsis character or entity).
const WRONG = [
  { re: /fa-ellipsis(?![-\w])/, why: 'the horizontal fa-ellipsis; use fa-ellipsis-vertical' },
  { re: /data-icon="ellipsis"/, why: 'data-icon="ellipsis" (horizontal); use ellipsis-vertical' },
  { re: /(icon|ui\.icon\(|wantIcon\(|menuIcon\()\s*[:(]?\s*['"]ellipsis['"]/, why: "the icon name 'ellipsis' (horizontal); use 'ellipsis-vertical'" },
  { re: /&#894[23];|&#x22e[ef];|[⋮⋯]/, why: 'an ellipsis character standing in for the icon; use the ellipsis-vertical icon' },
];

const problems = [];
for (const file of files) {
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  lines.forEach((line, i) => {
    for (const { re, why } of WRONG) if (re.test(line)) problems.push(`${path.relative(root, file)}:${i + 1}: ${why}`);
    // A "..." trigger in markup must be the shared button (.sdk-more). The call's More is its own .fbtn.
    if (/\.html$/.test(file) && /<button\b/.test(line) && /ellipsis-vertical/.test(line) && !/sdk-more/.test(line) && !/\bfbtn\b/.test(line) && !/floatbar-more/.test(line)) {
      problems.push(`${path.relative(root, file)}:${i + 1}: a "..." button must use the shared sdk-more class`);
    }
  });
}
// The editor window (documentation/plans/plan-editor-window.md): a module's Add or Edit form opens as a modal <dialog>
// through host.ui.editor, sized to the form and never clipped by the module's box. Once a bundled module is migrated
// (steps 3 to 8 of the plan add it here), its #editor is a <dialog class="sdk-editor"> and its stylesheet keeps no
// overlay rule (`.editor { position: absolute; inset: 0 }`) that would draw the form inside the module's window.
const EDITOR_MIGRATED = ['todo', 'calendar', 'travel', 'polls', 'research', 'places'];
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
// An icon scan that waits for each pending icon separately attaches a scan to every other pending icon too: a form opened
// while its icons load scanned itself 2^n times and froze the Planner (#192). Pending icons are waited for together, once.
for (const file of files) {
  if (!/[/\\]modules[/\\]/.test(file) || !file.endsWith('.js')) continue;
  read(path.relative(root, file)).split('\n').forEach((line, i) => {
    if (/wantIcon\([^)]*\)\s*\.then\(\s*\(\)\s*=>\s*hydrate\(/.test(line)) problems.push(`${path.relative(root, file)}:${i + 1}: a scan per pending icon; collect the pending names and wait for them together (Promise.all), then scan once`);
  });
}
for (const id of EDITOR_MIGRATED) {
  const src = path.join(root, 'modules', id, 'src');
  const html = fs.readdirSync(src).filter((n) => n.endsWith('.html')).map((n) => `modules/${id}/src/${n}`);
  // The module's script: Cancel goes through the handle's cancel() (the same question as Escape and Close), never by
  // clicking the SDK's own button, and the dialog is shown and hidden by the handle, never by `hidden`.
  for (const name of fs.readdirSync(src).filter((n) => n.endsWith('.js') && !/-lib-a-/.test(n))) {
    const rel = `modules/${id}/src/${name}`;
    const lines = read(rel).split('\n');
    lines.forEach((line, i) => {
      if (/querySelector\(\s*['"]\.sdk-editor-close['"]\s*\)/.test(line)) problems.push(`${rel}:${i + 1}: clicks the SDK's Close button; call editor.cancel() instead`);
      if (/\$\(\s*['"]editor['"]\s*\)\.hidden\b/.test(line)) problems.push(`${rel}:${i + 1}: "$('editor').hidden"; the handle's open() and close() show and hide the dialog`);
    });
    if (name === `${id}.js` && !/\beditor\.cancel\(\)/.test(lines.join('\n'))) problems.push(`${rel}: the form's Cancel must call editor.cancel() (the "Discard your changes?" question when something was typed)`);
    // A read-only form (To-do, Calendar: a task or event the viewer may not change) has nothing to lose, takes no input and
    // opens with focus on the window itself, not on a picker or a button.
    if (name === `${id}.js` && (id === 'todo' || id === 'calendar')) {
      const text = lines.join('\n');
      const dirty = /isDirty:\s*\(\)\s*=>[^\n]*/.exec(text);
      if (!dirty || !/readOnly/.test(dirty[0])) problems.push(`${rel}: isDirty must answer false for a read-only form (editing.readOnly)`);
      if (!/focus:\s*readOnly\s*\?\s*\$\('editor'\)/.test(text)) problems.push(`${rel}: a read-only form opens with focus on the window itself (focus: readOnly ? $('editor') : ...)`);
    }
    if (name === 'research.js' && !/setFormEditable[^\n]*#f-icons button/.test(lines.join('\n'))) problems.push(`${rel}: setFormEditable must disable the type buttons (#f-icons button) too`);
    // The Planner: a new object's row gets focus again after each redraw that follows the save (the change echo redraws too).
    if (name === 'travel.js') {
      const text = lines.join('\n');
      if (!/state\.focusAfterRedraw\s*=\s*\{\s*id:/.test(text) || !/function refocusNewRow/.test(text) || !/refocusNewRow\(\);/.test(text)) problems.push(`${rel}: after saving a new object, render() must focus its row again (state.focusAfterRedraw, refocusNewRow)`);
    }
  }
  const editor = html.map((rel) => [rel, /<dialog\b[^>]*\bid="editor"[^>]*>/.exec(read(rel))]).find(([, m]) => m);
  if (!editor) problems.push(`modules/${id}: #editor must be a <dialog> (host.ui.editor), not a div overlay`);
  else if (!/\bclass="[^"]*(?<![\w-])sdk-editor(?![\w-])[^"]*"/.test(editor[1][0])) problems.push(`${editor[0]}: <dialog id="editor"> must carry class="sdk-editor"`);
  const css = [...fs.readdirSync(src).filter((n) => n.endsWith('.css')).map((n) => [`modules/${id}/src/${n}`, read(`modules/${id}/src/${n}`)]),
    ...html.map((rel) => [rel, [...read(rel).matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g)].map((m) => m[1]).join('\n')])];
  for (const [rel, text] of css) {
    for (const m of text.matchAll(/(^|[\s,}])\.editor\s*\{([^}]*)\}/g)) {
      if (/position\s*:\s*absolute/.test(m[2]) && /inset\s*:\s*0/.test(m[2])) problems.push(`${rel}: ".editor { position: absolute; inset: 0 }" draws the form inside the module's window; the <dialog> is the window now`);
    }
  }
}

// The SDK's own editor: its two sizes and the sentence it throws for anything but a <dialog>, sliced out of
// public/sdk/host.js and run (as check-module-host does for pointers), and /sdk/host.css's widths held to the same numbers.
{
  const sdk = read('public/sdk/host.js');
  const start = sdk.indexOf('const EDITOR_SIZES');
  const endMark = '\n    return api;\n  }\n';
  const end = sdk.indexOf(endMark, start);
  if (start === -1 || end === -1) problems.push('public/sdk/host.js: could not find EDITOR_SIZES ... createEditor to run');
  else {
    const { EDITOR_SIZES, createEditor } = new Function(`${sdk.slice(start, end + endMark.length)}\nreturn { EDITOR_SIZES, createEditor };`)();
    if (EDITOR_SIZES.medium !== 560 || EDITOR_SIZES.large !== 880) problems.push(`public/sdk/host.js: EDITOR_SIZES must be { medium: 560, large: 880 }, not ${JSON.stringify(EDITOR_SIZES)}`);
    for (const wrong of [null, undefined, {}, { nodeType: 1, tagName: 'DIV' }, { nodeType: 3, tagName: 'DIALOG' }]) {
      let thrown = '';
      try { createEditor(wrong, {}, {}); } catch (err) { thrown = err.message; }
      if (thrown !== 'host.ui.editor needs a <dialog> element') problems.push(`public/sdk/host.js: host.ui.editor on ${JSON.stringify(wrong)} must throw "host.ui.editor needs a <dialog> element", not ${JSON.stringify(thrown)}`);
    }
    // The handle a <dialog> gets: open, close, cancel (the module's Cancel button), isOpen, element.
    const fakeDialog = { nodeType: 1, tagName: 'DIALOG', ownerDocument: {}, classList: { add() {}, remove() {} }, hasAttribute: () => true, addEventListener() {} };
    let handle = null;
    try { handle = createEditor(fakeDialog, {}, {}); } catch (err) { problems.push(`public/sdk/host.js: host.ui.editor on a <dialog> threw ${JSON.stringify(err.message)}`); }
    for (const need of ['open', 'close', 'cancel']) {
      if (handle && typeof handle[need] !== 'function') problems.push(`public/sdk/host.js: the editor handle must have ${need}()`);
    }
    const css = read('public/sdk/host.css');
    const block = /\/\* editor:start[\s\S]*?\/\* editor:end \*\//.exec(css);
    if (!block) problems.push('public/sdk/host.css: the editor window\'s rules must sit between "editor:start" and "editor:end"');
    else {
      const medium = /\.sdk-editor\s*\{[^}]*?width:\s*min\((\d+)px,\s*100vw - 32px\)/.exec(block[0]);
      const large = /\.sdk-editor-large\s*\{[^}]*?width:\s*min\((\d+)px,\s*100vw - 32px\)/.exec(block[0]);
      if (!medium || Number(medium[1]) !== EDITOR_SIZES.medium) problems.push(`public/sdk/host.css: .sdk-editor must be width: min(${EDITOR_SIZES.medium}px, 100vw - 32px)`);
      if (!large || Number(large[1]) !== EDITOR_SIZES.large) problems.push(`public/sdk/host.css: .sdk-editor-large must be width: min(${EDITOR_SIZES.large}px, 100vw - 32px)`);
      for (const need of ['.sdk-editor::backdrop', '.sdk-editor-close', '.sdk-editor-actions', '.sdk-editor-discard', '@media (max-width: 640px)', 'height: 100dvh', 'prefers-reduced-motion']) {
        if (!block[0].includes(need)) problems.push(`public/sdk/host.css: the editor window's rules must include "${need}"`);
      }
      if (/inset\s*:\s*0/.test(block[0])) problems.push('public/sdk/host.css: the editor window must not use inset: 0 (top: 0 with height: 100dvh on a phone; see architecture-canvas.md)');
      for (const m of block[0].matchAll(/#[0-9a-f]{3,8}\b|\brgba?\((?!0,\s*0,\s*0)/gi)) problems.push(`public/sdk/host.css: the editor window's rules use a fixed colour "${m[0]}"; use the theme tokens`);
    }
    // The date picker (host.ui.datePicker) follows its field: disabled with it, so a read-only form has no Pick a date.
    const dp = sdk.indexOf('datePicker: (input, o)');
    const dpText = dp === -1 ? '' : sdk.slice(dp, sdk.indexOf('return { close, refresh', dp));
    if (!/if \(input\.disabled\) return;/.test(dpText) || !/btn\.disabled = Boolean\(input\.disabled\)/.test(dpText)) problems.push('public/sdk/host.js: the date picker must follow a disabled field (its button disabled, open() a no-op)');
    // The words a person reads, as the plan fixes them.
    const words = sdk.slice(start, end);
    for (const need of ["'Discard your changes?'", "'Keep editing'", "'Discard'", "'Close'"]) {
      if (!words.includes(need)) problems.push(`public/sdk/host.js: the editor window must say ${need}`);
    }
  }
}

if (problems.length) {
  console.error(`check-module-window: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`check-module-window: OK (${files.length} files, the "..." icon; the editor window: ${EDITOR_MIGRATED.length} module(s) migrated, Cancel through editor.cancel(), icons waited for together, the SDK's sizes, handle and thrown sentence)`);
