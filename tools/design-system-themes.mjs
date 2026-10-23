#!/usr/bin/env node
/*
 * design-system-themes.mjs -- the shipped themes as stylesheets for the design system's Prototype page
 * (public/design-system/prototype.html), which switches between them: public/design-system/themes/<theme>.css, one per
 * shipped theme (Strong Coffee and the two the server seeds), written by server/theme-css.js, the code that writes /theme.css.
 * Reads a throwaway store in a temp folder, never DATA_DIR.
 *
 *   node tools/design-system-themes.mjs           writes the files
 *   node tools/design-system-themes.mjs --check   fails when a file is missing, extra or differs from what the server writes
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
export const THEMES_DIR = path.join(root, 'public', 'design-system', 'themes');

const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// The shipped themes as the server lists them: Strong Coffee (the default), then the seeded ones.
export function shippedThemes() {
  const { Store } = require('../server/store.js');
  const { themeCss } = require('../server/theme-css.js');
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'ds-themes-'));
  try {
    const store = new Store(dir);
    return [store.defaultTheme, ...store.themes].filter((t) => t && t.light && t.dark).map((t) => ({
      id: slug(t.name), name: t.name,
      css: `/* Written by tools/design-system-themes.mjs from the theme "${t.name}" (server/theme-css.js): do not edit. */\n${themeCss({ light: t.light, dark: t.dark }, 'dark')}`,
    }));
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function main() {
  const themes = shippedThemes();
  if (process.argv.includes('--check')) {
    const problems = [];
    const want = new Set(themes.map((t) => `${t.id}.css`));
    const have = fs.existsSync(THEMES_DIR) ? fs.readdirSync(THEMES_DIR).filter((f) => f.endsWith('.css')) : [];
    for (const t of themes) {
      const file = path.join(THEMES_DIR, `${t.id}.css`);
      if (!fs.existsSync(file)) problems.push(`public/design-system/themes/${t.id}.css is missing`);
      else if (fs.readFileSync(file, 'utf8') !== t.css) problems.push(`public/design-system/themes/${t.id}.css differs from what the server writes for "${t.name}"`);
    }
    for (const f of have) if (!want.has(f)) problems.push(`public/design-system/themes/${f} is no shipped theme`);
    if (problems.length) {
      for (const p of problems) console.error(`design-system-themes: FAIL ${p}`);
      console.error('design-system-themes: run node tools/design-system-themes.mjs');
      return 1;
    }
    console.log(`design-system-themes: ok, ${themes.length} themes (${themes.map((t) => t.name).join(', ')})`);
    return 0;
  }
  fs.mkdirSync(THEMES_DIR, { recursive: true });
  for (const f of fs.readdirSync(THEMES_DIR)) if (f.endsWith('.css')) fs.rmSync(path.join(THEMES_DIR, f));
  for (const t of themes) fs.writeFileSync(path.join(THEMES_DIR, `${t.id}.css`), t.css);
  console.log(`design-system-themes: wrote ${themes.length} themes to public/design-system/themes/`);
  return 0;
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exit(main());
