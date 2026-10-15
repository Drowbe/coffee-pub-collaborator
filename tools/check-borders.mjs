// NO COLOURED BORDERS ANYWHERE (Thomas, 2026-10-15: "I keep finding more of these border colors. Remove them all and add a
// rule to prevent them from showing back up unless I direct you to add them."). Nothing draws a coloured line around or
// beside a box: not border, border-left/right/top/bottom, outline, nor a box-shadow used as a border (an inset bar, a
// 0-offset spread ring, a hard offset), in any state (resting, hover, selected, kind, status, warning, error, accent
// bars, quote and callout bars, left-edge stripes). State and kind are shown with FILLS (a tint of the theme's colour
// as the background) and text or icon colour.
//
// Allowed: a neutral hairline (colour exactly var(--border), or transparent, none, 0), currentColor (the element's text
// colour is neutral where it is used; the live scan in the build checks the computed colour), the keyboard focus ring
// (a rule whose selector has :focus-visible or :focus), a drop shadow with a blur, and an entry in
// tools/check-borders-allow.json, which is empty and gets an entry only when Thomas directs it (the file, the selector,
// and his words). Not read: SVG stroke attributes (charts, map pins' shape, lines) and third-party library files.
//
// This reads every product stylesheet (public, public/sdk, modules/<id>/src), and the inline styles in scripts and pages
// (style strings, CSS in template strings, el.style.borderLeft = ..., setProperty('border-left', ...)). It extends the
// selected-state check in check-nav.mjs.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const RULE = 'Coloured borders are not allowed unless Thomas directs it: use a fill';

const SKIP_DIRS = new Set(['node_modules', 'design', 'fa', 'vendor', '.git', 'dist']);
const SKIP_FILES = [/maplibre/i, /\.min\./, /^public\/sdk\/vendor\//];

const PROP_RE = '(?:border(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?(?:-color)?|border-image(?:-source)?|outline(?:-color)?|box-shadow|column-rule(?:-color)?)';
const CSS_PROP = new RegExp(`^${PROP_RE}$`);
const WIDTH = /^(?:0|[0-9.]+(?:px|em|rem|%)?|thin|medium|thick|calc\(.*\))$/i;
const STYLE = /^(?:none|hidden|solid|dashed|dotted|double|groove|ridge|inset|outset)$/i;
// neutral: the hairline token (with or without a fallback), a wash of it, nothing, and the theme's own SURFACE colours (a
// ring in the surface colour is a gap that cuts a dot or a pin out of what is behind it, not a coloured line)
const NEUTRAL = /^(?:var\(--border(?:,[^()]*)?\)|color-mix\(in srgb, var\(--border\) [0-9.]+%, transparent\)|var\(--(?:bg|bg-section|bg-card|bg-input|header-bg|nav-brand-bg|surface)\)|transparent|none|currentcolor|inherit|initial|unset|revert)$/i;

// a shadow in black or white (a lift, a highlight) is neutral
const NEUTRAL_SHADOW = /^(?:black|white|rgba?\(\s*(?:0\s*,?\s*0\s*,?\s*0|255\s*,?\s*255\s*,?\s*255)[^)]*\)|color-mix\(in srgb, (?:black|white) [0-9.]+%, transparent\))$/i;

function splitTop(v, sep) {
  const out = [];
  let depth = 0;
  let cur = '';
  for (const ch of v) {
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === sep && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
  }
  out.push(cur);
  return out.map((s) => s.trim()).filter(Boolean);
}
const camelToKebab = (s) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

// Is this declaration a coloured border? Returns a reason string, or '' when it is fine.
export function coloured(prop, rawValue) {
  prop = prop.trim().toLowerCase();
  const value = rawValue.replace(/!important/i, '').replace(/^["'`]|["'`]$/g, '').trim();
  if (!value || NEUTRAL.test(value) || /^0(px)?$/.test(value)) return '';
  if (prop === 'box-shadow') {
    for (const sh of splitTop(value, ',')) {
      if (NEUTRAL.test(sh)) continue;
      const parts = splitTop(sh.replace(/\s+/g, ' '), ' ');
      const isLen = (p) => /^-?[0-9.]+(px|em|rem)?$/.test(p) || /^calc\(/.test(p);
      const lens = parts.filter(isLen);
      const col = parts.filter((p) => !isLen(p) && p !== 'inset').join(' ');
      if (lens.length > 2 && (/^calc\(/.test(lens[2]) || Number.parseFloat(lens[2]) > 0)) continue; // a soft shadow or glow is not a line
      if (lens.every((l) => Number.parseFloat(l) === 0)) continue;
      if (NEUTRAL.test(col) || NEUTRAL_SHADOW.test(col)) continue;
      return `box-shadow line in ${col || 'a colour'}`;
    }
    return '';
  }
  if (/^border-image/.test(prop)) return /gradient|url|var\(|#/.test(value) ? 'border-image' : '';
  // border, border-left, outline, ...: take away the width and the style, the rest is the colour
  const rest = splitTop(value.replace(/\s+/g, ' '), ' ').filter((p) => !WIDTH.test(p) && !STYLE.test(p));
  if (!rest.length) return ''; // no colour named: the text colour
  const col = rest.join(' ');
  return NEUTRAL.test(col) ? '' : `${prop} in ${col}`;
}

// declarations in CSS text, with the selector each is in and its line
export function scanCss(text, rel, { inlineLines = false } = {}) {
  const found = [];
  const noComments = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '));
  for (const m of noComments.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const sel = m[1].trim().replace(/\s+/g, ' ');
    if (/^@(font-face|keyframes)/.test(sel)) continue;
    const bodyStart = m.index + m[0].indexOf('{') + 1;
    let off = 0;
    for (const d of m[2].split(';')) {
      const at = bodyStart + off;
      off += d.length + 1;
      const i = d.indexOf(':');
      if (i < 0) continue;
      const prop = d.slice(0, i).trim();
      if (!CSS_PROP.test(prop.toLowerCase())) continue;
      const why = coloured(prop, d.slice(i + 1));
      if (!why) continue;
      if (splitTop(sel, ',').every((s) => /:focus-visible|:focus-within|:focus(?![\w-])/.test(s))) continue; // the keyboard ring
      // a border in the very colour of the rule's own fill shows nothing (a solid primary button keeps its size)
      const col = why.replace(/^.* in /, '');
      if (m[2].split(';').some((x) => /^\s*background(-color)?\s*:/.test(x) && x.slice(x.indexOf(':') + 1).trim() === col)) continue;
      const line = noComments.slice(0, at + d.length - d.trimStart().length + 1).split('\n').length;
      found.push({ rel, line, selector: sel, text: `${prop}: ${d.slice(i + 1).trim()}`, why });
    }
  }
  return found;
}

// inline styles and CSS strings in JS and HTML
export function scanInline(text, rel) {
  const found = [];
  const lines = text.split('\n');
  const decl = new RegExp(`(?<![\\w-])(${PROP_RE})\\s*:\\s*([^;}\`"'\\n]+(?:\\([^)]*\\)[^;}\`"'\\n]*)*)`, 'g');
  const prop = /\.style\.(border[A-Za-z]*|outline[A-Za-z]*|boxShadow)\s*=\s*(.+?);?\s*$/;
  const setp = /\.(?:setProperty|style\.setProperty)\(\s*['"](border[a-z-]*|outline[a-z-]*|box-shadow)['"]\s*,\s*([^)]+(?:\([^)]*\))?[^)]*)\)/;
  const objk = /(?<![\w.])(border(?:Top|Right|Bottom|Left)?(?:Color)?|outline(?:Color)?|boxShadow)\s*:\s*(['"`])([^'"`]*)\2/g;
  lines.forEach((ln, i) => {
    const code = ln.replace(/^\s*(\/\/|\*).*$/, '');
    if (!code.trim()) return;
    if (/border-radius|borderRadius/.test(code) && !/(?<![\w-])border(?:-[a-z]+)?\s*:/.test(code)) { /* radius only */ }
    // prose in a JS comment on the same line is cut
    const live = code.replace(/\s\/\/\s.*$/, '');
    let m;
    decl.lastIndex = 0;
    while ((m = decl.exec(live))) {
      // a JS object key like  border: '1px solid red'  is read by objk; a CSS-ish colon here is a style string
      if (/^\s*\[/.test(m[2]) || /(?<![\w-])(?!var\(|color-mix\(|rgba?\(|hsla?\(|calc\(|oklch\(|oklab\(|hwb\(|lab\(|lch\(|color\()[A-Za-z_$][\w$.]*\(/.test(m[2])) continue; // JavaScript, not a CSS value
      let why = coloured(m[1], m[2]);
      // 'border-left:3px solid ' + colour + ';': the colour is added in code after the string ends
      if (!why && /^['"`]\s*\+/.test(live.slice(m.index + m[0].length)) && !/\b(?:none|0)\s*$/.test(m[2].trim())) why = `${m[1]} with a colour added in code`;
      if (why) found.push({ rel, line: i + 1, selector: '(inline)', text: `${m[1]}: ${m[2].trim()}`, why });
    }
    if ((m = prop.exec(live))) {
      const p = camelToKebab(m[1]);
      let v = m[2];
      // a value that is built from variables or a ternary: read the quoted pieces and any colour words
      const why = jsValue(p, v);
      if (why) found.push({ rel, line: i + 1, selector: '(inline)', text: `style.${m[1]} = ${v.trim()}`, why });
    }
    if ((m = setp.exec(live))) {
      const why = jsValue(m[1], m[2]);
      if (why) found.push({ rel, line: i + 1, selector: '(inline)', text: `setProperty('${m[1]}', ${m[2].trim()})`, why });
    }
    objk.lastIndex = 0;
    while ((m = objk.exec(live))) {
      const why = coloured(camelToKebab(m[1]), m[3]);
      if (why) found.push({ rel, line: i + 1, selector: '(inline)', text: `${m[1]}: ${m[3]}`, why });
    }
  });
  return found;
}
function jsValue(p, v) {
  v = v.trim().replace(/;$/, '');
  const pieces = [...v.matchAll(/(['"`])((?:(?!\1).)*)\1/g)].map((x) => x[2]);
  if (!pieces.length) return /^(0|none|'')$/.test(v) ? '' : `${p} = ${v}`;
  // a conditional: every quoted piece must be fine, and a bare variable colour is not
  if (/\$\{|\+/.test(v) && !pieces.every((x) => !coloured(p, x))) return `${p} = ${v}`;
  for (const x of pieces) { const w = coloured(p, x); if (w) return w; }
  const bare = v.replace(/(['"`])(?:(?!\1).)*\1/g, '').replace(/[?:+\s]/g, '');
  return bare && !/^(?:\|\||&&)?$/.test(bare) && /\b(color|colour|tint|accent|c)\b/i.test(bare) ? `${p} = ${v}` : '';
}

export function allowed(f, allow) {
  return allow.some((a) => a.file === f.rel && (!a.selector || a.selector === f.selector));
}

export function collectFiles() {
  const files = [];
  const walk = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(e.name)) continue;
      const p = path.join(dir, e.name);
      if (e.isDirectory()) walk(p);
      else if (/\.(css|js|html)$/.test(e.name)) files.push(p);
    }
  };
  walk(path.join(root, 'public'));
  for (const m of fs.readdirSync(path.join(root, 'modules'))) {
    const src = path.join(root, 'modules', m, 'src');
    if (fs.existsSync(src)) walk(src);
  }
  return files.filter((f) => !SKIP_FILES.some((r) => r.test(path.relative(root, f).split(path.sep).join('/'))));
}

export function scanAll(files, allow) {
  const out = [];
  for (const f of files) {
    const rel = path.relative(root, f).split(path.sep).join('/');
    const text = fs.readFileSync(f, 'utf8');
    const hits = rel.endsWith('.css') ? scanCss(text, rel) : [...scanInline(text, rel)];
    for (const h of hits) if (!allowed(h, allow)) out.push(h);
  }
  return out;
}

export const format = (hits) => hits.map((h) => `${h.rel}:${h.line}  ${h.selector}  { ${h.text} }  (${h.why})`).join('\n  ');

// ---- main ----
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  // self-tests: planted violations fail, clean fixtures pass
  const bads = [
    ['css', '.a { border-left: 3px solid var(--accent); }'],
    ['css', '.a { box-shadow: inset 3px 0 0 gold; }'],
    ['css', '.a { box-shadow: 0 0 0 1px var(--accent); }'],
    ['css', '.a { outline: 2px solid red; }'],
    ['css', '.a { border: 1px solid #c00; }'],
    ['css', '.a:hover { border-color: var(--accent); }'],
    ['css', '.a.selected { border-bottom: 2px solid color-mix(in srgb, var(--tint) 50%, transparent); }'],
    ['css', '.a { border-top: 4px solid var(--tint); }'],
    ['css', '.a { border: 1px solid; border-color: var(--danger); }'],
    ['js', "el.style.borderLeft = '3px solid ' + color;"],
    ['js', "el.style.border = '1px solid var(--accent)';"],
    ['js', "el.style.boxShadow = 'inset 0 0 0 2px gold';"],
    ['js', "el.style.setProperty('border-left', '4px solid #c00');"],
    ['js', "const s = '<div style=\"border-left:3px solid var(--accent)\">';"],
    ['js', 'css += `.q { outline: 1px dashed orange; }`;'],
    ['js', "const s = 'border-left:3px solid ' + tint + ';';"],
    ['js', "const s = `<div style=\"border-left:3px solid ${tint}\">`;"],
  ];
  for (const [kind, src] of bads) {
    const hits = kind === 'css' ? scanCss(src, 'fixture.css') : scanInline(src, 'fixture.js');
    assert.ok(hits.length > 0, `a planted violation must fail: ${src}`);
  }
  const goods = [
    ['css', '.a { border: 1px solid var(--border); }'],
    ['css', '.a { border-left: 0; border-top: none; outline: none; }'],
    ['css', '.a { border: 2px dashed var(--border); }'],
    ['css', '.a { border-color: transparent; border-bottom: 1px solid currentColor; }'],
    ['css', '.a:focus-visible { outline: 2px solid var(--accent); }'],
    ['css', '.a:focus-visible, .b:focus { box-shadow: 0 0 0 2px var(--accent); }'],
    ['css', '.a { box-shadow: 0 4px 16px rgba(0,0,0,.3); }'],
    ['css', '.a { border-radius: var(--radius-small); border-collapse: collapse; border-spacing: 0; }'],
    ['css', '.a { border: 1px solid var(--border) !important; /* border-left: 3px solid red */ }'],
    ['js', "el.style.border = '1px solid var(--border)';"],
    ['js', "el.style.borderLeft = '0';"],
    ['js', "el.style.outline = 'none';"],
    ['js', "const s = '<div style=\"border:1px solid var(--border)\">';"],
    ['js', "// border-left: 3px solid red (a comment)"],
    ['js', "ring.setAttribute('stroke', 'var(--accent)');"],
  ];
  for (const [kind, src] of goods) {
    const hits = kind === 'css' ? scanCss(src, 'fixture.css') : scanInline(src, 'fixture.js');
    assert.deepEqual(hits, [], `a clean fixture must pass: ${src}`);
  }
  const bad = scanCss('.a {\n  color: red;\n  border-left: 3px solid var(--accent);\n}\n', 'x.css');
  assert.equal(bad[0].line, 3, 'the line is reported');
  assert.ok(allowed(bad[0], [{ file: 'x.css', selector: '.a' }]), 'an allow-list entry lets one through');

  const allowFile = path.join(root, 'tools/check-borders-allow.json');
  const allow = JSON.parse(fs.readFileSync(allowFile, 'utf8'));
  assert.ok(Array.isArray(allow), 'tools/check-borders-allow.json is a list');
  for (const a of allow) assert.ok(a.file && a.selector && a.instruction, 'an allow entry names the file, the selector and Thomas\'s instruction');

  const files = collectFiles();
  assert.ok(files.length > 60, 'the scanner found the product files');
  const hits = scanAll(files, allow);
  if (hits.length) {
    console.error(`check-borders: ${RULE}\n  ${format(hits)}`);
    process.exit(1);
  }
  console.log(`check-borders: OK (${files.length} files, no coloured borders)`);
}
