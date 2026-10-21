#!/usr/bin/env node
/*
 * check-maps.mjs -- run the Maps module's own code (places, coordinates, the style) without a browser.
 * The libraries are written to be inlined into a module page, so they are loaded here as a function body.
 */
import fs from 'node:fs';
import assert from 'node:assert/strict';

const read = (name) => fs.readFileSync(new URL(`../modules/maps/src/${name}`, import.meta.url), 'utf8');
// The SDK's geo helpers, which the page hands to the library.
const sdk = fs.readFileSync(new URL('../public/sdk/host.js', import.meta.url), 'utf8');
const win = { addEventListener() {}, location: { search: '' } };
win.parent = win;
new Function('window', 'document', sdk)(win, { createElement: (tag) => ({ tag }) }); // ready() adds the SDK's shared styles: a <style> stand-in
const geo = win.createHost({ call: async () => ({}), root: { appendChild() {} }, rootElement: {} }).host.util.geo;
const names = ['TINTS', 'cleanColors', 'pinColor', 'cssColor', 'pinLook', 'markedFor', 'showHow', 'clusterPoints', 'boundsOf', 'rgbOf', 'mixRgb', 'buildStyle', 'buildPictureStyle', 'pictureLimits', 'capZoom', 'WORLD_MAX_ZOOM'];
const lib = new Function('geo', `${read('maps-lib-c-geo.js')}\n${read('maps-lib-d-style.js')}\n${read('maps-lib-e-pins.js')}\nreturn { ${names.join(', ')} };`)(geo);

let n = 0;
const test = (name, fn) => { fn(); n += 1; };

test('points that would overlap are grouped', () => {
  const project = (lat, lng) => ({ x: lng * 10, y: lat * 10 });
  const g = lib.clusterPoints([{ lat: 0, lng: 0 }, { lat: 0, lng: 1 }, { lat: 0, lng: 20 }], project, 36);
  assert.equal(g.length, 2);
  assert.equal(g[0].points.length, 2);
  assert.equal(g[0].lng, 0.5);
  assert.deepEqual(lib.boundsOf([{ lat: 1, lng: 2 }, { lat: 3, lng: -4 }]), [[-4, 1], [2, 3]]);
  assert.equal(lib.boundsOf([]), null);
});

test('colours from the theme, and the style built from them', () => {
  assert.deepEqual(lib.rgbOf('rgb(10, 20, 30)'), [10, 20, 30]);
  assert.deepEqual(lib.rgbOf('rgba(10, 20, 30, 0.5)'), [10, 20, 30]);
  assert.deepEqual(lib.rgbOf('#ff8000'), [255, 128, 0]);
  assert.deepEqual(lib.rgbOf('#fff'), [255, 255, 255]);
  assert.deepEqual(lib.rgbOf('color(srgb 1 0.5 0)'), [255, 127.5, 0]);
  assert.equal(lib.rgbOf('nonsense'), null);
  assert.equal(lib.mixRgb([100, 100, 100], [0, 0, 0], 10), 'rgb(10,10,10)');
  const dark = lib.buildStyle({}, { tiles: 'pmtiles://https://x/y.pmtiles', glyphs: 'https://x/{fontstack}/{range}.pbf' });
  const light = lib.buildStyle({ section: [250, 248, 244], text: [30, 30, 30] }, { tiles: 't', glyphs: 'g' });
  assert.equal(dark.version, 8);
  assert.equal(dark.sources.map.url, 'pmtiles://https://x/y.pmtiles');
  const bg = (s) => s.layers.find((l) => l.id === 'background').paint['background-color'];
  assert.notEqual(bg(dark), bg(light));
  assert.equal(bg(light), 'rgb(250,248,244)');
  assert.ok(!dark.layers.some((l) => l['source-layer'] === 'pois'), 'no points of interest');
  assert.ok(dark.layers.every((l) => l.type === 'background' || l.source === 'map'));
  assert.ok(!JSON.stringify(dark).includes('NaN'));
  // Every place label prefers a feature's English name (name:en, an OpenStreetMap tag) over its local one, never
  // showing blank for a place that simply has none recorded.
  const labels = dark.layers.filter((l) => l['source-layer'] === 'places');
  assert.ok(labels.length >= 3, 'there are place labels to check');
  assert.ok(labels.every((l) => JSON.stringify(l.layout['text-field']) === JSON.stringify(['coalesce', ['get', 'name:en'], ['get', 'name']])));
});

test('several map files are drawn together, layer by layer', () => {
  const one = lib.buildStyle({}, { tiles: 'pmtiles://a', glyphs: 'g' });
  const two = lib.buildStyle({}, { tiles: ['pmtiles://a', 'pmtiles://b'], glyphs: 'g' });
  assert.deepEqual(Object.keys(two.sources), ['map', 'map1']);
  assert.equal(two.sources.map1.url, 'pmtiles://b');
  assert.equal(two.layers.length, 1 + (one.layers.length - 1) * 2);
  const ids = two.layers.map((l) => l.id);
  assert.equal(new Set(ids).size, ids.length, 'layer ids stay unique');
  const at = (id) => ids.indexOf(id);
  assert.ok(at('roads-major-1') > at('earth-1') && at('earth-1') === at('earth') + 1, 'a file\'s ground never covers the next one\'s roads');
  assert.equal(two.layers.find((l) => l.id === 'earth-1').source, 'map1');
  assert.equal(one.layers.filter((l) => l.source === 'map').length, one.layers.length - 1);
});

test('a picture map: the theme\'s ground and one layer of picture tiles, nothing else', () => {
  const bounds = [[-180, -42.5], [180, 42.5]];
  const dark = lib.buildPictureStyle({}, { tiles: 'pmtiles://https://x/api/modules/maps/files/w.pmtiles?folder=image-map', minZoom: 0, maxZoom: 5, bounds });
  const light = lib.buildPictureStyle({ section: [250, 248, 244] }, { tiles: 't', minZoom: 0, maxZoom: 5 });
  assert.equal(dark.version, 8);
  assert.deepEqual(dark.layers.map((l) => [l.id, l.type]), [['background', 'background'], ['picture', 'raster']]);
  assert.equal(dark.layers[1].source, 'picture');
  assert.deepEqual(Object.keys(dark.sources), ['picture']);
  assert.deepEqual(dark.sources.picture, { type: 'raster', url: 'pmtiles://https://x/api/modules/maps/files/w.pmtiles?folder=image-map', tileSize: 256, minzoom: 0, maxzoom: 5, bounds: [-180, -42.5, 180, 42.5] });
  assert.ok(!('bounds' in light.sources.picture), 'no bounds given, none set');
  // The ground is --bg-section, as the world map's is.
  assert.equal(light.layers[0].paint['background-color'], 'rgb(250,248,244)');
  assert.equal(dark.layers[0].paint['background-color'], lib.buildStyle({}, { tiles: 't', glyphs: 'g' }).layers.find((l) => l.id === 'background').paint['background-color']);
  assert.ok(!JSON.stringify(dark).includes('NaN'));
  assert.ok(!dark.layers.some((l) => l.type === 'symbol' || l['source-layer']), 'no labels or map data layers on a picture');
});

test('a picture map never zooms past its file, lands one level above the deepest, and pans only over the picture', () => {
  // Just inside the web map's square: MapLibre's pan limit fails on a longitude of exactly 180 (tried in a browser).
  const L = 85.051128;
  const G = 179.99999;
  const header = { minZoom: 0, maxZoom: 5, minLon: -180, minLat: -42.5, maxLon: 180, maxLat: 42.5 };
  assert.deepEqual(lib.pictureLimits(header, null), { fileMinZoom: 0, fileMaxZoom: 5, minZoom: 0, maxZoom: 5, landZoom: 4, bounds: [[-G, -42.5], [G, 42.5]] });
  assert.deepEqual(lib.pictureLimits({ minZoom: 0, maxZoom: 5, minLon: -40, minLat: -30, maxLon: 60, maxLat: 20 }).bounds, [[-40, -30], [60, 20]], 'a picture narrower than the square keeps its own box');
  // The header wins over the environment's fact; the fact fills in what the header lacks.
  assert.equal(lib.pictureLimits(header, { minZoom: 1, maxZoom: 9 }).maxZoom, 5);
  assert.deepEqual(lib.pictureLimits({}, { file: 'w.pmtiles', minZoom: 1, maxZoom: 4 }), { fileMinZoom: 1, fileMaxZoom: 4, minZoom: 1, maxZoom: 4, landZoom: 3, bounds: [[-G, -L], [G, L]] });
  // Bounds past the web map's square are held to it; bounds that are not a box give the whole square.
  assert.deepEqual(lib.pictureLimits({ minZoom: 0, maxZoom: 3, minLon: -200, minLat: -90, maxLon: 200, maxLat: 90 }).bounds, [[-G, -L], [G, L]]);
  assert.deepEqual(lib.pictureLimits({ minZoom: 0, maxZoom: 3, minLon: 10, minLat: 0, maxLon: 10, maxLat: 5 }).bounds, [[-G, -L], [G, L]]);
  assert.deepEqual(lib.pictureLimits({ minZoom: 0, maxZoom: 3, minLon: 'x', minLat: 0, maxLon: 10, maxLat: 5 }).bounds, [[-G, -L], [G, L]]);
  // A maximum below the minimum is raised to it; nothing past zoom 22.
  assert.deepEqual([lib.pictureLimits({ minZoom: 4, maxZoom: 2 }).fileMaxZoom, lib.pictureLimits({ minZoom: 0, maxZoom: 40 }).maxZoom], [4, 22]);
  // The landing zoom is never above the file's deepest and never below its shallowest.
  assert.deepEqual([lib.pictureLimits({ minZoom: 3, maxZoom: 3 }).landZoom, lib.pictureLimits({ minZoom: 0, maxZoom: 0 }).landZoom, lib.pictureLimits({ minZoom: 2, maxZoom: 6 }).landZoom], [3, 0, 5]);
  assert.equal(lib.pictureLimits(null, null).maxZoom, 0);
  for (const h of [header, {}, { minLon: -500, minLat: -95, maxLon: 500, maxLat: 95 }]) {
    const b = lib.pictureLimits(h).bounds.flat();
    assert.ok(Math.abs(b[0]) < 180 && Math.abs(b[2]) < 180 && Math.abs(b[1]) < 85.0511288 && Math.abs(b[3]) < 85.0511288, `inside the square: ${b}`);
  }
});

test('every fixed zoom is capped at the map\'s maximum', () => {
  assert.equal(lib.WORLD_MAX_ZOOM, 19);
  assert.equal(lib.capZoom(13, 7), 7);
  assert.equal(lib.capZoom(17, 7), 7);
  assert.equal(lib.capZoom(5, 7), 5);
  assert.equal(lib.capZoom(13, 19), 13, 'the world map is as before');
  assert.equal(lib.capZoom(17, undefined), 17);
  assert.equal(lib.capZoom(25, null), 19);
  assert.equal(lib.capZoom('x', 7), 7);
  // On a picture map a selected place, a draft pin and a fit are capped at the landing zoom, a remembered view at the map's maximum.
  assert.equal(lib.capZoom(14, lib.pictureLimits({ minZoom: 0, maxZoom: 5 }).landZoom), 4);
  const src = read('maps.js');
  assert.match(src, /const cap = \(z\) => capZoom\(z, state\.landZoom\);/);
  assert.match(src, /const limit = \(z\) => capZoom\(z, state\.maxZoom\);/);
  assert.match(src, /state\.landZoom = limits\.landZoom;/);
  assert.match(src, /zoom: limit\(Math\.max\(0, Number\(v\.zoom\)\)\)/);
  const page = read('maps.js');
  // select(), draftAt(), "Show where I am": the current zoom or a fixed one, capped.
  assert.equal((page.match(/Math\.max\(state\.map\.getZoom\(\), \d+\)/g) || []).length, (page.match(/cap\(Math\.max\(state\.map\.getZoom\(\), \d+\)\)/g) || []).length);
  assert.ok((page.match(/cap\(Math\.max\(state\.map\.getZoom\(\), \d+\)\)/g) || []).length >= 3);
  // A cluster, a pasted position, a search result, the first view: never a bare number.
  assert.doesNotMatch(page, /maxZoom: \d/, 'a fitBounds maxZoom is capped');
  assert.equal((page.match(/zoom: cap\(15\)/g) || []).length, 3, 'a pasted position (field and page) and a search result are capped');
  assert.deepEqual(page.match(/\bzoom: \d+/g), ['zoom: 2'], 'only the world map\'s opening zoom is a bare number');
  assert.match(page, /zoom: limit\(Math\.max\(0, Number\(v\.zoom\)\)\)/, 'a remembered view is capped at the maximum too');
});

test('a picture map leaves out what means nothing on an invented world, and the world map keeps its credit', () => {
  const page = read('maps.js');
  const html = read('maps.html');
  // The OpenStreetMap credit is its own part of the credit, hidden only on a picture map.
  assert.match(html, /<div class="attribution" data-slot="attribution"><span data-slot="osm">&copy; <a href="https:\/\/www\.openstreetmap\.org\/copyright"[^>]*>OpenStreetMap<\/a> contributors<\/span><\/div>/);
  assert.match(page, /hide\(slot\(box, 'osm'\), picture\);/);
  assert.match(page, /credit\(metadata, Boolean\(picture\)\);/);
  assert.match(page, /if \(picture\) inMaps\.remove\(\); else inMaps\.href = mapsLink\(/, 'no "Open in my maps app" on a picture');
  assert.match(page, /coords: picture \? '' : coordsText\(/, 'no coordinates in the callout on a picture');
  assert.match(page, /hide\(locateButton, Boolean\(state\.picture\)\)/, 'no "Show where I am" on a picture');
  // The picture's file is read from its own folder, and the picture style is used only with a picture.
  assert.match(page, /picture: pictureOf\(host\.environment && host\.environment\.pictureMap\)/);
  assert.match(page, /const PICTURE_FOLDER = 'image-map';/);
  assert.match(JSON.stringify(JSON.parse(fs.readFileSync(new URL('../modules/maps/module.json', import.meta.url), 'utf8')).settings.find((d) => d.key === 'imageMap')), /"folder":"image-map"/);
  assert.match(page, /if \(picture\) \{\n\s+\/\/[^\n]*\n\s+limits = pictureLimits\(headers\[0\], picture\);/);
  assert.match(page, /state\.style = \(\) => buildStyle\(tokens\(\), \{ tiles: state\.tileUrls, glyphs \}\);/, 'the world map\'s style as before');
  // Search on a picture: saved places only, never the outside search.
  assert.match(page, /if \(state\.picture\) \{ searchSaved\(text\); return; \}\n\s+if \(state\.searcher\) \{ search\(text\); return; \}/);
});

test('nothing is drawn once the module\'s markup is gone (a space left while the map still moves)', () => {
  const page = read('maps.js');
  for (const fn of ['render', 'drawPins', 'drawDraft']) {
    const at = page.indexOf(`  function ${fn}() {\n`);
    assert.ok(at >= 0, `${fn} is there`);
    assert.match(page.slice(at, at + 120), new RegExp(`function ${fn}\\(\\) \\{\\n    if \\(torn\\(\\)\\) return;`), `${fn} stops after teardown`);
  }
  assert.match(page, /function torn\(\) \{\n    if \(host\.rootElement\.isConnected && \$\('tpl-pin'\)\) return false;/);
});

test('a pin is the map library\'s marker: no rule sets the position of .pin itself, so it stays absolute where the library puts it', () => {
  const css = read('maps.css').replace(/\/\*[\s\S]*?\*\//g, '');
  const html = read('maps.html');
  // The pin templates are the markers' own elements (makePin hands them to new maplibregl.Marker).
  assert.match(html, /<template id="tpl-pin"><button class="pin"/);
  assert.match(read('maps.js'), /new maplibregl\.Marker\(\{ element: makePin\(/);
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selectors = m[1].split(',').map((x) => x.trim());
    // A selector whose last compound is the pin itself (.pin, .pin.selected, .pin[data-cat] ...), not something inside it.
    const onPin = selectors.filter((sel) => /(^|\s|>)\.pin(?![\w-])[^\s>+~]*$/.test(sel) && !sel.includes('::'));
    if (onPin.length) assert.ok(!/(^|;)\s*(position|top|left|right|bottom|inset)\s*:/.test(m[2]), `${onPin.join(', ')} sets the position of a marker: ${m[2].trim().slice(0, 80)}`);
  }
});

test('adding follows Places: its permission decides, the phone is shown the list, one set of words', () => {
  const page = read('maps.js');
  const html = read('maps.html');
  // Maps\' own edit permission no longer gates the adder; Places refuses and the tools go quietly.
  assert.ok(!/if \(canEdit\) state\.adder/.test(page), 'the adder does not depend on Maps\' own edit permission');
  assert.match(page, /a\.name === 'newPlace'[^\n]*a\.may !== false && !state\.refused/);
  assert.match(page, /\/may not add\/\.test\(/);
  assert.match(page, /state\.refused = true; state\.adder = null;/);
  // The Places dialog is revealed on a phone, as show-in-list does.
  assert.match(page, /if \(part && state\.phone && host\.destination\) host\.destination\.set\(\{ reveal: '[a-z]+' \}\)/);
  // One entry, one word: "Add a place" everywhere; the hint while adding is "Click the map to place it". The menu has no second entry.
  assert.match(page, /const ADD_PLACE = 'Add a place';/);
  assert.match(page, /const CLICK_TO_ADD = 'Click the map to place it';/);
  assert.match(page, /return \[\{ id: 'place', label: ADD_PLACE, icon: 'location-dot' \}\];/);
  assert.doesNotMatch(page, /id: 'new'|Add a place on the map/, 'no second add entry, no second phrase');
  // The + menu's one entry opens Places' dialog at once; the click-first mode is the on-map + control's and the dialog's target button's.
  assert.match(page, /if \(e\.id === 'place' && state\.adder\) askNewPlace\(\{\}\);/);
  assert.match(page, /else if \(a === 'add'\) \{ if \(state\.adder\) \{ if \(state\.map\) setAdding\(!state\.adding\); else askNewPlace\(\{\}\); \} \}/);
  // pickPoint: the map's click-the-map mode for the editor's target button; the spot (or none) is told back through positionPicked.
  assert.match(page, /pickPoint: async \(input\) => \{[\s\S]*?state\.pick = true;[\s\S]*?setAdding\(true\);[\s\S]*?say\(CLICK_TO_ADD\);/);
  assert.match(page, /if \(state\.adding && state\.pick\) \{[\s\S]*?tellPicked\(at\);/);
  assert.match(page, /if \(state\.adding && state\.pick\) \{[\s\S]*?tellPicked\(at\);/);
  assert.match(page, /a\.name === 'positionPicked'/);
  assert.match(page, /e\.key === 'Escape' && state\.pick/);
  const manifest = JSON.parse(read('../module.json'));
  assert.ok(manifest.actions.provides.some((a) => a.name === 'pickPoint' && a.local === true), 'the manifest declares pickPoint');
  // Only the asking page's map takes a pick, and not after the asking page gave up (the host's `page` and `pageUntil`).
  const pick = manifest.actions.provides.find((a) => a.name === 'pickPoint');
  assert.ok(pick.input.page === 'string?' && pick.input.pageUntil === 'number?', 'pickPoint takes the host\'s page fields');
  assert.match(page, /pickPoint: async \(input\) => \{\n\s+await startedPromise;\n\s+if \(input && Number\(input\.pageUntil\) < Date\.now\(\)\) throw new Error/, 'a late pick never starts the mode');
  assert.match(page, /host\.actions\.request\(state\.picked\.action, at \? \{ lat: at\.lat, lng: at\.lng \} : \{\}, \{ here: true \}\)/, 'the spot goes back to this page\'s Places');
  // The page's document listeners go with the markup.
  assert.match(page, /const alive = new AbortController\(\);/);
  assert.match(page, /function letGo\(\) \{ if \(!alive\.signal\.aborted\) alive\.abort\(\); \}/);
  for (const m of page.matchAll(/document\.addEventListener\('([a-z]+)'[^\n]*/g)) assert.match(m[0], /\{ signal: alive\.signal \}\);$/, `the document's ${m[1]} listener is taken off with the map`);
  assert.match(page, /function torn\(\) \{\n    if \(host\.rootElement\.isConnected && \$\('tpl-pin'\)\) return false;\n    letGo\(\);/);
  assert.match(html, /title="Add a place" aria-label="Add a place"/);
  assert.match(html, />Click the map to place it</);
  // A short note is a toast, never text drawn in the module.
  assert.match(page, /host\.ui\.toast\(String\(text\)\)/);
  const contract = read('CONTRACT.md');
  assert.ok(!contract.includes('`addPlace`'), 'the contract names newPlace');
});

test('a pin takes the place\'s colour, else its category\'s, else the category\'s automatic theme tint', () => {
  const page = read('maps.js');
  const css = read('maps.css');
  const c = (category, color) => ({ ref: { scope: 'environment' }, category, ...(color ? { color } : {}) });
  assert.deepEqual(lib.pinColor(c('food', 'red'), { food: '#112233' }), { tint: 'red' }, 'the place\'s own colour first');
  assert.deepEqual(lib.pinColor(c('food'), { food: '#112233' }), { hex: '#112233' }, 'then the owner\'s colour for the category');
  assert.deepEqual(lib.pinColor(c('food'), { food: 'pink' }), { tint: 'pink' }, 'Places may tell a tint name');
  assert.deepEqual(lib.pinColor(c('food'), {}), { tint: 'blue' }, 'else the automatic tint, by the category\'s place in the list');
  assert.deepEqual(lib.pinColor(c('stay'), {}), { tint: 'green' });
  assert.deepEqual(lib.pinColor(c('nightlife'), {}), { tint: 'pink' });
  assert.deepEqual(lib.pinColor(c('transport'), {}), { tint: 'red' });
  assert.deepEqual(lib.pinColor(c('other'), {}), { tint: 'teal' }, 'round again after the eighth');
  assert.deepEqual(lib.pinColor(c('eat'), {}), lib.pinColor(c('food'), {}), 'the old ids read as the new');
  assert.deepEqual(lib.pinColor(c('do'), {}), lib.pinColor(c('activities'), {}));
  assert.deepEqual(lib.pinColor(c('travel'), {}), lib.pinColor(c('transport'), {}));
  const mine = lib.pinColor(c('my-own-kind'), {});
  assert.ok(lib.TINTS.includes(mine.tint), 'any other id takes one of the eight');
  assert.deepEqual(lib.pinColor(c('my-own-kind'), {}), mine, 'the same one each time');
  assert.equal(lib.pinColor(c(''), {}), null, 'no category and no colour: the stylesheet\'s look');
  assert.deepEqual(lib.pinColor(c('', 'gold'), {}), { tint: 'gold' });
  assert.deepEqual(lib.pinColor(c('food', 'magenta'), {}), { tint: 'blue' }, 'a colour that is not a tint is not used');
  assert.equal(lib.cssColor({ tint: 'teal' }), 'var(--tint-teal)');
  const long30 = 'a'.repeat(30);
  assert.deepEqual(lib.cleanColors({ [long30]: '#aabbcc', ['a'.repeat(31)]: '#aabbcc', food: 'blue', bad: 'blue2', x: '#ABCDEF', y: 7 }), { [long30]: '#aabbcc', food: 'blue' }, 'ids to 30 characters; a plain colour or a tint name');
  assert.deepEqual(lib.cleanColors(null), {});
  assert.match(page, /a\.name === 'categoryColors' && a\.open === true/, 'asked of the Places in this page');
  assert.match(page, /host\.actions\.request\(action\.action, \{\}, \{ wait: true, here: true \}\)/);
  assert.ok(!/% 360/.test(page) && !page.includes('BUILT_IN_CATS'), 'no hash hue');
  assert.match(css, /\.pin\[data-cat\]:not\(\.selected\) \{ --pin: var\(--tone\); --pin-text: var\(--tone-ink, var\(--surface-page\)\); \}/);
  assert.ok(!/--turn|oklch/.test(css), 'no turned hues in the stylesheet');
  const places = fs.readFileSync(new URL('../modules/places/src/places-lib.js', import.meta.url), 'utf8'); // the colour rule moved into Places' library (0.11.0)
  assert.match(places, /const AUTO_COLOR = '#888888';/);
  assert.match(places, /const TINTS = \['blue', 'green', 'teal', 'purple', 'orange', 'pink', 'gold', 'red'\];/, 'the same eight, in the same order, as Places');
  const order = [...places.matchAll(/\{ id: '([a-z]+)', label: '[^']+', icon: '[a-z-]+', color: AUTO_COLOR \}/g)].map((m) => m[1]);
  assert.deepEqual(order, ['food', 'stay', 'sights', 'nature', 'activities', 'nightlife', 'shopping', 'transport', 'services', 'health', 'other'], 'Places\' default categories');
});

test('a pin has the place\'s icon and its visit badge', () => {
  const page = read('maps.js');
  const css = read('maps.css');
  const html = read('maps.html');
  const look = (s) => lib.pinLook({ module: { icon: 'location-dot' }, ...s }, {});
  assert.equal(look({ icon: 'mug-hot' }).icon, 'mug-hot', 'the place\'s drawn icon');
  assert.equal(look({}).icon, 'location-dot', 'else its module\'s');
  assert.equal(lib.pinLook({}, {}).icon, 'location-dot');
  assert.deepEqual([look({ visit: 'want' }).visitLabel, look({ visit: 'want' }).visitIcon], ['Want to go', 'bookmark']);
  assert.deepEqual([look({ visit: 'booked' }).visitLabel, look({ visit: 'booked' }).visitIcon], ['Booked', 'calendar-check']);
  assert.deepEqual([look({ visit: 'visited' }).visitLabel, look({ visit: 'visited' }).visitIcon], ['Visited', 'circle-check']);
  assert.deepEqual([look({ visit: 'favorite' }).visitLabel, look({ visit: 'favorite' }).visitIcon], ['Favorite', 'star']);
  assert.equal(look({ visit: 'maybe' }).visit, '', 'no other state');
  const places = fs.readFileSync(new URL('../modules/places/src/places-lib.js', import.meta.url), 'utf8');
  for (const [id, label, icon] of [['want', 'Want to go', 'bookmark'], ['booked', 'Booked', 'calendar-check'], ['visited', 'Visited', 'circle-check'], ['favorite', 'Favorite', 'star']]) assert.ok(places.includes(`{ id: '${id}', label: '${label}', icon: '${icon}' }`), `${id}: the same words and icon as Places' rows`);
  assert.match(html, /<span class="pin-badge" data-visit="">/);
  assert.match(css, /\.pin-badge \{[^}]*border-radius: var\(--radius-round\)/);
  assert.match(page, /pin\.setAttribute\('aria-label', `\$\{x\.title\}, \$\{x\.look\.visitLabel\}`\)/, 'the badge has words');
  assert.match(page, /'bookmark', 'calendar-check', 'circle-check', 'star'/, 'the badge icons are fetched');
});

test('a space\'s map shows its places, the environment\'s places marked for it, and the rest softer; each place once', () => {
  const page = read('maps.js');
  const css = read('maps.css');
  const s = (scope, extra = {}) => ({ ref: { scope, id: extra.id || 'p', ...(scope === 'space' ? { space: 'trip' } : {}) }, ...extra });
  const how = (c, filter, space = 'trip') => lib.showHow(c, filter, space);
  const all = { mine: true, environment: true, spaces: new Set(['trip']) };
  const here = { mine: true, environment: false, spaces: new Set(['trip']) };
  const none = { mine: true, environment: true, spaces: new Set() };
  assert.equal(how(s('space'), here), 'full', 'the space\'s own');
  assert.equal(how(s('environment', { spaces: ['trip'] }), here), 'full', 'Everyone\'s places marked for it come with the trip');
  assert.equal(how(s('environment', { spaces: ['other'] }), here), '', 'the rest are not shown until the chip is on');
  assert.equal(how(s('environment'), here), '');
  assert.equal(how(s('environment', { spaces: ['other'] }), all), 'soft', 'the rest, drawn softer');
  assert.equal(how(s('environment'), all), 'soft');
  assert.equal(how(s('environment', { spaces: ['trip'] }), all), 'full', 'a marked one is never soft');
  assert.equal(how(s('environment', { spaces: ['trip'] }), none), '', 'This trip off hides its own and the marked');
  assert.equal(how(s('environment'), none), 'soft');
  assert.equal(how(s('person'), { ...all, mine: false }), '');
  assert.equal(how(s('person'), all), 'full');
  assert.equal(how(s('environment', { spaces: ['trip'] }), null), 'full', 'no filter shows everything');
  assert.equal(how(s('environment'), null), 'soft');
  // on the environment page: the environment's places are as before, never soft; a space's by the spaces on
  assert.equal(how(s('environment', { spaces: ['trip'] }), { mine: true, environment: true, spaces: new Set() }, ''), 'full');
  assert.equal(how(s('environment'), { mine: true, environment: false, spaces: new Set() }, ''), '');
  assert.equal(how(s('space'), { mine: true, environment: false, spaces: new Set(['other']) }, ''), '');
  assert.equal(how(s('space'), { mine: true, environment: false, spaces: new Set(['trip']) }, ''), 'full');
  assert.equal(lib.markedFor({ spaces: ['a', 'trip'] }, 'trip'), true);
  assert.equal(lib.markedFor({ spaces: ['a'] }, 'trip'), false);
  assert.equal(lib.markedFor({}, 'trip'), false);
  // the page asks the environment for the space's marked places with `in`, and draws each pointer once
  assert.match(page, /host\.objects\.search\('', \{ scope: 'environment', has: 'place', in: spaceId \}\)/);
  assert.match(page, /const seen = new Set\(\);[\s\S]*?const id = summaryId\(c\);\s+if \(seen\.has\(id\)\) return false;/, 'one pin per home pointer');
  assert.match(page, /soft: state\.how\.get\(summaryId\(c\)\) === 'soft'/);
  assert.match(css, /\.pin\.soft:not\(\.selected\) \.pin-body \{ background: color-mix\(in srgb, var\(--pin\) 45%, transparent\); box-shadow: none; \}/, 'a softer fill, no added border');
  assert.ok(!/\.pin\.soft[^{]*\{[^}]*border/.test(css), 'no border on a soft pin');
  const dest = fs.readFileSync(new URL('../public/destination.js', import.meta.url), 'utf8');
  assert.ok(dest.includes("name: `All of ${environmentName}'s places`"), 'the map\'s filter in a space has the chip');
});

test('host.objects.search passes in to the server', () => {
  const sdkText = fs.readFileSync(new URL('../public/sdk/host.js', import.meta.url), 'utf8');
  const hostText = fs.readFileSync(new URL('../public/module-host.js', import.meta.url), 'utf8');
  assert.ok(sdkText.includes("...(o && o.in ? { in: String(o.in) } : {})"));
  assert.ok(hostText.includes("async 'objects.search'({ q, scope: s, space, has, in: marked })"));
  const src = hostText.slice(hostText.indexOf('function objectSearchParams('), hostText.indexOf('// --- end of the search'));
  const placeSrc = hostText.slice(hostText.indexOf('const SPACE_ID'), hostText.indexOf("\n  return { scope: 'space', space };\n}\n") + "\n  return { scope: 'space', space };\n}\n".length);
  const build = new Function(`${placeSrc}\n${src}\nreturn objectSearchParams;`)();
  const p = build('maps', { q: '', scope: 'environment', has: 'place', in: 'trip1' }, { scope: 'space', spaceId: 'S1', moduleScopes: ['environment', 'space'], keyed: false });
  assert.deepEqual([p.get('scope'), p.get('has'), p.get('in')], ['environment', 'place', 'trip1']);
  const q = build('maps', { q: '', scope: 'environment' }, { scope: 'space', spaceId: 'S1', moduleScopes: ['environment', 'space'], keyed: false });
  assert.equal(q.has('in'), false, 'no in unless asked');
});

console.log(`check-maps: OK (${n} checks)`);
