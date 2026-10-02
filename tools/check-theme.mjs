#!/usr/bin/env node
/*
 * check-theme.mjs -- light and dark (GitHub #62): /theme.css carries both of the live theme's sets, each under its
 * own <html data-theme-mode>, the default one also covering a page without the attribute (server/theme-css.js); a
 * person's own mode is kept on their account (Store.setThemeMode), absent while they follow the environment's
 * default; and a bad mode, the owner's or a person's, is refused and changes nothing. The top bar's colour areas
 * (plan-two-zone-nav.md decision 8): navBrandBg, navBrandText, navRightBg and navRightText are optional keys like the
 * others -- written to /theme.css only when set, null (Auto) when not a color, a stored theme without them reading
 * them as Auto.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { themeCss, themeVersion } = require('../server/theme-css.js');
const { Store, THEME_OPTIONAL } = require('../server/store.js');
let n = 0;
const test = (name, fn) => {
  try {
    fn();
    n += 1;
  } catch (err) {
    console.error(`check-theme: ${name}`);
    throw err;
  }
};
const withStore = (fn) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'check-theme-'));
  try {
    fn(new Store(dir), dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

const LIGHT = { bg: '#ffffff', bgSection: '#f7f7f7', border: '#e0e0e0', text: '#333333', textDim: '#767676', accent: '#e45628', onAccent: '#ffffff', headerBg: '#eeeeee' };
const DARK = { bg: '#111111', bgSection: '#222222', border: '#333333', text: '#eeeeee', textDim: '#999999', accent: '#e45628', onAccent: '#ffffff' };

test('both sets are sent, each under its own selector, the default one also covering no attribute', () => {
  const css = themeCss({ light: LIGHT, dark: DARK }, 'dark');
  assert.match(css, /:root:not\(\[data-theme-mode="light"\]\) \{[^}]*--bg: #111111;/);
  assert.match(css, /:root\[data-theme-mode="light"\] \{[^}]*--bg: #ffffff;/);
  const flipped = themeCss({ light: LIGHT, dark: DARK }, 'light');
  assert.match(flipped, /:root:not\(\[data-theme-mode="dark"\]\) \{[^}]*--bg: #ffffff;/);
  assert.match(flipped, /:root\[data-theme-mode="dark"\] \{[^}]*--bg: #111111;/);
});

test('an optional color one mode sets stays in that mode', () => {
  const css = themeCss({ light: LIGHT, dark: DARK }, 'light');
  const dark = /:root\[data-theme-mode="dark"\] \{([^}]*)\}/.exec(css)[1];
  assert.doesNotMatch(dark, /--header-bg/);
  assert.match(css, /--header-bg: #eeeeee;/);
});

test('a null set (style.css\'s own palette) writes nothing; an odd default mode reads as dark', () => {
  const css = themeCss({ light: LIGHT, dark: null }, 'nonsense');
  assert.doesNotMatch(css, /:root:not/);
  assert.match(css, /:root\[data-theme-mode="light"\]/);
  assert.notEqual(themeVersion({ light: LIGHT, dark: null }, 'dark'), themeVersion({ light: LIGHT, dark: null }, 'light'));
});

test('an untouched environment: Strong Coffee, its dark set left to style.css and its light set sent', () => withStore((store) => {
  const sets = store.activeThemeSets();
  assert.equal(sets.dark, null);
  assert.equal(sets.light.bg, '#faf6f1');
  assert.equal(store.settings.themeMode, 'dark');
}));

test('a theme with one set shows it in both modes', () => withStore((store) => {
  const theme = store.addTheme({ name: 'One', mode: 'light', ...LIGHT });
  store.updateSettings({ activeThemeId: theme.id });
  const sets = store.activeThemeSets();
  assert.equal(sets.light.bg, '#ffffff');
  assert.equal(sets.dark.bg, '#ffffff');
}));

test("the owner's default mode: light or dark only; anything else is refused and nothing changes", () => withStore((store) => {
  store.updateSettings({ themeMode: 'light' });
  assert.equal(store.settings.themeMode, 'light');
  assert.throws(() => store.updateSettings({ environmentName: 'Changed', themeMode: 'purple' }), /the mode is light or dark/);
  assert.equal(store.settings.themeMode, 'light');
  assert.notEqual(store.settings.environmentName, 'Changed');
}));

test("a person's own mode is kept on the account, survives a reload, and null follows the default again", () => withStore((store, dir) => {
  const user = store.addUser({ login: 'pat', role: 'member' });
  assert.equal(user.themeMode, undefined);
  assert.equal(store.setThemeMode(user.key, 'dark'), 'dark');
  assert.equal(store.setThemeMode(user.key, 'light'), 'light');
  store.save();
  const again = new Store(dir);
  assert.equal(again.userByKey(user.key).themeMode, 'light');
  assert.equal(again.setThemeMode(user.key, null), null);
  assert.equal('themeMode' in again.userByKey(user.key), false);
}));

test("a bad mode for a person is refused and changes nothing; an unknown account is a 404", () => withStore((store) => {
  const user = store.addUser({ login: 'sam', role: 'member' });
  store.setThemeMode(user.key, 'dark');
  for (const bad of ['Light', 'purple', '', 1, true, undefined, {}]) {
    assert.throws(() => store.setThemeMode(user.key, bad), /the mode is light or dark/);
  }
  assert.equal(store.userByKey(user.key).themeMode, 'dark');
  assert.throws(() => store.setThemeMode('nosuchkey', 'dark'), (err) => err.status === 404);
}));

test('a stored mode that is not light or dark is dropped on load', () => withStore((store, dir) => {
  const user = store.addUser({ login: 'lee', role: 'member' });
  store.save();
  const file = path.join(dir, 'app.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  raw.users.find((u) => u.key === user.key).themeMode = 'sepia';
  fs.writeFileSync(file, JSON.stringify(raw));
  assert.equal('themeMode' in new Store(dir).userByKey(user.key), false);
}));

const NAV = { navBrandBg: '#102030', navBrandText: '#f0e0d0', navRightBg: '#203040', navRightText: '#e0d0c0' };
const NAV_VARS = { navBrandBg: '--nav-brand-bg', navBrandText: '--nav-brand-text', navRightBg: '--nav-right-bg', navRightText: '--nav-right-text' };

test("the top bar's four colour keys are optional theme keys, after headerText", () => {
  const at = THEME_OPTIONAL.indexOf('headerText');
  assert.deepEqual(THEME_OPTIONAL.slice(at + 1, at + 5), Object.keys(NAV));
});

test('a set with the four nav keys writes them to /theme.css; one without them writes nothing for them', () => {
  const css = themeCss({ light: { ...LIGHT, ...NAV }, dark: DARK }, 'light');
  const light = /:root:not\(\[data-theme-mode="dark"\]\) \{([^}]*)\}/.exec(css)[1];
  for (const [key, prop] of Object.entries(NAV_VARS)) assert.ok(light.includes(`  ${prop}: ${NAV[key]};`), prop);
  const dark = /:root\[data-theme-mode="dark"\] \{([^}]*)\}/.exec(css)[1];
  assert.doesNotMatch(dark, /--nav-/);
  assert.doesNotMatch(themeCss({ light: LIGHT, dark: DARK }, 'dark'), /--nav-/);
  assert.doesNotMatch(themeCss({ light: { ...LIGHT, navBrandBg: null, navRightText: null }, dark: null }, 'dark'), /--nav-/);
});

test('the nav keys: set by addTheme and updateTheme, a value that is not a color goes back to Auto (null), null puts one back on Auto', () => withStore((store) => {
  const theme = store.addTheme({ name: 'Nav', mode: 'light', ...LIGHT, ...NAV, navRightBg: 'red; background: url(x)' });
  assert.deepEqual(Object.fromEntries(Object.keys(NAV).map((k) => [k, theme.light[k]])), { ...NAV, navRightBg: null });
  store.updateTheme(theme.id, { mode: 'light', navRightBg: '#ABCDEF', navBrandText: null, navBrandBg: 'blue' });
  const after = store.themes.find((t) => t.id === theme.id).light;
  assert.deepEqual([after.navRightBg, after.navBrandText, after.navBrandBg, after.navRightText], ['#abcdef', null, null, NAV.navRightText]);
  store.updateSettings({ activeThemeId: theme.id });
  const css = themeCss(store.activeThemeSets(), 'light');
  assert.match(css, /--nav-right-bg: #abcdef;/);
  assert.doesNotMatch(css, /--nav-brand-bg|--nav-brand-text/);
}));

test('a stored theme from before the nav keys reads them as Auto and writes the same /theme.css as before', () => withStore((store, dir) => {
  const theme = store.addTheme({ name: 'Old', mode: 'light', ...LIGHT });
  store.updateSettings({ activeThemeId: theme.id });
  store.save();
  const file = path.join(dir, 'app.json');
  const raw = JSON.parse(fs.readFileSync(file, 'utf8'));
  const stored = raw.settings.themes.find((t) => t.id === theme.id);
  for (const key of Object.keys(NAV)) delete stored.light[key];
  assert.equal(Object.keys(stored.light).some((k) => k in NAV), false);
  fs.writeFileSync(file, JSON.stringify(raw));
  // Read as stored, as the nine older optional keys are: absent is Auto, the same as null, in /theme.css, in a theme
  // file (null) and in the editor (public/admin.js reads !colors[key] as Auto).
  const again = new Store(dir);
  const light = again.themes.find((t) => t.id === theme.id).light;
  for (const key of Object.keys(NAV)) assert.ok(light[key] == null, key);
  const exported = require('../server/theme-file.js').themeToFile(again.themes.find((t) => t.id === theme.id));
  for (const key of Object.keys(NAV)) assert.equal(exported.light[key], null, `exported ${key}`);
  const css = themeCss(again.activeThemeSets(), 'light');
  assert.doesNotMatch(css, /--nav-/);
  assert.equal(css, themeCss({ light: LIGHT, dark: LIGHT }, 'light'), 'one set shows in both modes, as before');
}));

test("the theme editor's four fields: in THEME_OPTIONAL_FIELDS after Header text with their Auto formulas, each a row with its Auto box", () => {
  const admin = fs.readFileSync(new URL('../public/admin.js', import.meta.url), 'utf8');
  const html = fs.readFileSync(new URL('../public/admin.html', import.meta.url), 'utf8');
  const list = admin.match(/const THEME_OPTIONAL_FIELDS = \[([\s\S]*?)\n\];/);
  assert.ok(list, 'THEME_OPTIONAL_FIELDS');
  const rows = [...list[1].matchAll(/\['([\w-]+)', '([\w-]+)', '(\w+)', '([^']*)'\]/g)].map((m) => m.slice(1));
  const keys = rows.map((r) => r[2]);
  assert.deepEqual(keys, THEME_OPTIONAL, 'the editor has a field for every optional key, in the same order');
  const fields = {
    navBrandBg: ['theme-nav-brand-bg', 'var(--nav-primary-edge-bg)', 'Branding area background'],
    navBrandText: ['theme-nav-brand-text', 'var(--header-text)', 'Branding area text'],
    navRightBg: ['theme-nav-right-bg', 'var(--nav-primary-edge-bg)', 'Right side background'],
    navRightText: ['theme-nav-right-text', 'var(--header-text)', 'Right side text'],
  };
  for (const [key, [id, formula, label]] of Object.entries(fields)) {
    const row = rows.find((r) => r[2] === key);
    assert.deepEqual(row, [id, NAV_VARS[key], key, formula], key);
    assert.ok(html.includes(`<label>${label}<input id="${id}" type="color"></label><label class="check"><input type="checkbox" data-auto-for="${id}"> Auto</label>`), `${id} row with its Auto box`);
  }
});

console.log(`check-theme: ${n} checks passed`);
