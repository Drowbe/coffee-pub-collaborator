// The layout rules for a module's own CSS and markup (documentation/plans/plan-unified-layout.md): the host draws the
// window's bands (title row, toolbar, tab strip, status line) and the slot's padding, and the shared pieces (cards, rows,
// lists, tables, forms, fields, tabs, chips) look the way the design system draws them. A module lays out its own domain
// content inside the slot and does not draw or restyle any of that.
//
// scanSources([{ name, kind: 'css' | 'html' | 'js', text }]) answers the findings: [{ selector, file, line, why }].
// A finding's `selector` is its key: a CSS selector as written (white space collapsed), or "markup: ..." for markup.
// Used by tools/check-module-layout.mjs and tools/build-module.mjs (which fail on it), and by the server, which warns
// about an uploaded module but still installs it.
'use strict';

// The shared things. Any rule whose selector names one of these classes, with any property at all, is a finding.
const SHARED_CLASS = /\.(?:sdk-(?:card|row|list|table|form|field|tab|chip|toolbar|titlebar|status)[\w-]*|tb-[\w-]+|mod-(?:header|toolbar|status|title|content)[\w-]*)/;
// A class a module might give a bar of its own.
const BAND_NAME = /(?:^|-)(?:titlebar|toolbar|tabs|tabstrip|page-bar|pagebar|statusbar|status-line)$/;
// A class in markup that draws a band: the shared band classes and any class named for one.
const BAND_MARKUP = /^(?:sdk-(?:toolbar|titlebar|status|tabs|tabbar)[\w-]*|tb-tabs[\w-]*|mod-(?:header|toolbar|status)[\w-]*)$/;
const BOX_PROP = /^(?:padding|margin)(?:-[a-z-]+)?$|^(?:min-)?height$/;
const SLOT_SELECTOR = /^(?:html|body|:root|\.app|#app|\.mod-content)$/;
const AT_WITH_RULES = /^@(?:media|supports|container|layer|scope)\b/;

const tidy = (s) => s.replace(/\s+/g, ' ').trim();
const blank = (s) => s.replace(/[^\n]/g, ' ');

function lineOf(text, index) {
  let n = 1;
  for (let i = text.indexOf('\n'); i !== -1 && i < index; i = text.indexOf('\n', i + 1)) n += 1;
  return n;
}

// Every plain rule in a stylesheet (inside @media and the like too): { selectors, props, index }.
function rulesOf(css) {
  const text = css.replace(/\/\*[\s\S]*?\*\//g, blank);
  const out = [];
  const walk = (from, to) => {
    let i = from;
    while (i < to) {
      const open = text.indexOf('{', i);
      if (open === -1 || open >= to) return;
      const prelude = tidy(text.slice(i, open));
      let depth = 1;
      let j = open + 1;
      while (j < to && depth) {
        const c = text[j];
        if (c === '{') depth += 1;
        else if (c === '}') depth -= 1;
        j += 1;
      }
      const inner = [open + 1, j - 1];
      if (prelude.startsWith('@')) {
        if (AT_WITH_RULES.test(prelude)) walk(inner[0], inner[1]);
      } else if (prelude) {
        const body = text.slice(inner[0], inner[1]).replace(/url\([^)]*\)/g, 'url()').replace(/"[^"]*"|'[^']*'/g, '""');
        const props = [...body.matchAll(/(?:^|[;{}])\s*([a-z-]+)\s*:/g)].map((m) => m[1]);
        const selectors = prelude.split(/,(?![^(]*\))/).map(tidy).filter(Boolean);
        out.push({ selectors, props, index: i + (text.slice(i, open).length - text.slice(i, open).trimStart().length) });
      }
      i = j;
    }
  };
  walk(0, text.length);
  return out;
}

const lastCompound = (selector) => selector.split(/[\s>+~]+/).filter(Boolean).pop() || '';

function scanCss(file) {
  const found = [];
  for (const rule of rulesOf(file.text)) {
    if (!rule.props.length) continue;
    const line = lineOf(file.text, rule.index);
    for (const selector of rule.selectors) {
      const add = (why) => found.push({ selector, file: file.name, line, why });
      if (SHARED_CLASS.test(selector)) {
        add('restyles a shared piece (the host draws the shared pieces and the bands)');
        continue;
      }
      if (/(?:^|[\s>+~(])header(?![\w-])/.test(selector) && !/header\.sdk-card-head(?![\w-])/.test(selector)) {
        add('styles a header bar of its own (the host draws the title row)');
        continue;
      }
      const box = rule.props.some((p) => BOX_PROP.test(p));
      if (box && SLOT_SELECTOR.test(lastCompound(selector))) {
        add("sets the slot's padding or height (the host owns the slot; content: flush fills it edge to edge)");
        continue;
      }
      const cls = [...selector.matchAll(/\.([\w-]+)/g)].map((m) => m[1]);
      if (box && cls.some((c) => BAND_NAME.test(c))) add('sets the height or padding of a band of its own (the host draws the bands)');
    }
  }
  return found;
}

function scanMarkup(file) {
  const found = [];
  const text = file.kind === 'js' ? file.text.replace(/\/\*[\s\S]*?\*\//g, blank).replace(/(^|[^:\\'"`])\/\/[^\n]*/g, (m, lead) => lead + blank(m.slice(lead.length))) : file.text.replace(/<!--[\s\S]*?-->/g, blank);
  const add = (selector, index, why) => found.push({ selector, file: file.name, line: lineOf(text, index), why });
  for (const m of text.matchAll(/<header\b(?![^>]*\bclass\s*=\s*["'][^"']*\bsdk-card-head\b)/gi)) add('markup: <header>', m.index, 'draws a header bar of its own (the host draws the title row)');
  const tokens = [];
  for (const m of text.matchAll(/\bclass(?:Name)?\s*[=:]\s*(["'`])([^"'`]*)\1/g)) tokens.push([m[2], m.index]);
  for (const m of text.matchAll(/\bclassList\.(?:add|toggle|replace)\(\s*(["'`])([^"'`]*)\1(?:\s*,\s*(["'`])([^"'`]*)\3)?/g)) {
    tokens.push([m[2], m.index]);
    if (m[4]) tokens.push([m[4], m.index]);
  }
  for (const [value, index] of tokens) {
    for (const token of value.split(/\s+/).filter(Boolean)) {
      if (BAND_MARKUP.test(token) || BAND_NAME.test(token)) add(`markup: class ${token}`, index, 'draws a band of its own (use host.header.set, host.toolbar.set, host.ui.viewSwitch and host.status.set)');
    }
  }
  if (file.kind === 'js') {
    // host.toolbar.set answers false where the host has no window; code that reads the answer is drawing its own bar.
    for (const m of text.matchAll(/(?:!|=\s*|\?\s*|\|\||&&|\breturn\s+|\bawait\s+)\s*(?:await\s+)?[\w.]*\btoolbar\.set\(/g)) {
      add('markup: host.toolbar.set fallback', m.index, 'draws a bar of its own when host.toolbar.set answers false (the host draws the bar everywhere)');
    }
    for (const m of text.matchAll(/\btoolbar\.set\([^;]*\)\s*\.then\b/g)) add('markup: host.toolbar.set fallback', m.index, 'draws a bar of its own when host.toolbar.set answers false (the host draws the bar everywhere)');
  }
  return found;
}

function scanSources(files) {
  const found = [];
  for (const file of files) {
    if (file.kind === 'css') found.push(...scanCss(file));
    else found.push(...scanMarkup(file));
  }
  return found;
}

// A built page (one HTML with the CSS and JS inlined, as a zip carries it): its <style> blocks are CSS, the whole text is markup.
function scanBuiltPage(name, html) {
  const files = [{ name, kind: 'html', text: html }];
  let n = 0;
  for (const m of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) {
    n += 1;
    files.push({ name: `${name} (style ${n})`, kind: 'css', text: m[1] });
  }
  // Inline scripts are scanned as scripts, not as markup of the page, so strip them from the html copy.
  files[0].text = html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, (s) => blank(s)).replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, (s) => blank(s));
  n = 0;
  for (const m of html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)) {
    n += 1;
    files.push({ name: `${name} (script ${n})`, kind: 'js', text: m[1] });
  }
  return scanSources(files);
}

// { selector: count } from findings.
function tally(findings) {
  const out = new Map();
  for (const f of findings) out.set(f.selector, (out.get(f.selector) || 0) + 1);
  return out;
}

// A plain list of what a module breaks, for a person: one line per selector.
function describe(findings) {
  const by = new Map();
  for (const f of findings) {
    const e = by.get(f.selector) || { count: 0, why: f.why, at: `${f.file}:${f.line}` };
    e.count += 1;
    by.set(f.selector, e);
  }
  return [...by].map(([selector, e]) => `${selector}${e.count > 1 ? ` (x${e.count})` : ''}: ${e.why} [${e.at}]`);
}

module.exports = { scanSources, scanBuiltPage, tally, describe, rulesOf };
