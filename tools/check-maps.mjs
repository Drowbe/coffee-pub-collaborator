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
const names = ['clusterPoints', 'boundsOf', 'rgbOf', 'mixRgb', 'buildStyle', 'buildPictureStyle', 'pictureLimits', 'capZoom', 'WORLD_MAX_ZOOM'];
const lib = new Function('geo', `${read('maps-lib-c-geo.js')}\n${read('maps-lib-d-style.js')}\nreturn { ${names.join(', ')} };`)(geo);

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

test('a picture map zooms two levels past its file and pans only over the picture', () => {
  // Just inside the web map's square: MapLibre's pan limit fails on a longitude of exactly 180 (tried in a browser).
  const L = 85.051128;
  const G = 179.99999;
  const header = { minZoom: 0, maxZoom: 5, minLon: -180, minLat: -42.5, maxLon: 180, maxLat: 42.5 };
  assert.deepEqual(lib.pictureLimits(header, null), { fileMinZoom: 0, fileMaxZoom: 5, minZoom: 0, maxZoom: 7, bounds: [[-G, -42.5], [G, 42.5]] });
  assert.deepEqual(lib.pictureLimits({ minZoom: 0, maxZoom: 5, minLon: -40, minLat: -30, maxLon: 60, maxLat: 20 }).bounds, [[-40, -30], [60, 20]], 'a picture narrower than the square keeps its own box');
  // The header wins over the environment's fact; the fact fills in what the header lacks.
  assert.equal(lib.pictureLimits(header, { minZoom: 1, maxZoom: 9 }).maxZoom, 7);
  assert.deepEqual(lib.pictureLimits({}, { file: 'w.pmtiles', minZoom: 1, maxZoom: 4 }), { fileMinZoom: 1, fileMaxZoom: 4, minZoom: 1, maxZoom: 6, bounds: [[-G, -L], [G, L]] });
  // Bounds past the web map's square are held to it; bounds that are not a box give the whole square.
  assert.deepEqual(lib.pictureLimits({ minZoom: 0, maxZoom: 3, minLon: -200, minLat: -90, maxLon: 200, maxLat: 90 }).bounds, [[-G, -L], [G, L]]);
  assert.deepEqual(lib.pictureLimits({ minZoom: 0, maxZoom: 3, minLon: 10, minLat: 0, maxLon: 10, maxLat: 5 }).bounds, [[-G, -L], [G, L]]);
  assert.deepEqual(lib.pictureLimits({ minZoom: 0, maxZoom: 3, minLon: 'x', minLat: 0, maxLon: 10, maxLat: 5 }).bounds, [[-G, -L], [G, L]]);
  // A maximum below the minimum is raised to it; nothing past zoom 22.
  assert.deepEqual([lib.pictureLimits({ minZoom: 4, maxZoom: 2 }).fileMaxZoom, lib.pictureLimits({ minZoom: 0, maxZoom: 40 }).maxZoom], [4, 24]);
  assert.equal(lib.pictureLimits(null, null).maxZoom, 2);
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
  const page = read('maps.js');
  // select(), draftAt(), "Show where I am": the current zoom or a fixed one, capped.
  assert.equal((page.match(/Math\.max\(state\.map\.getZoom\(\), \d+\)/g) || []).length, (page.match(/cap\(Math\.max\(state\.map\.getZoom\(\), \d+\)\)/g) || []).length);
  assert.ok((page.match(/cap\(Math\.max\(state\.map\.getZoom\(\), \d+\)\)/g) || []).length >= 3);
  // A cluster, a pasted position, a search result, the first view: never a bare number.
  assert.doesNotMatch(page, /maxZoom: \d/, 'a fitBounds maxZoom is capped');
  assert.equal((page.match(/zoom: cap\(15\)/g) || []).length, 3, 'a pasted position (field and page) and a search result are capped');
  assert.deepEqual(page.match(/\bzoom: \d+/g), ['zoom: 2'], 'only the world map\'s opening zoom is a bare number');
  assert.match(page, /zoom: cap\(Math\.max\(0, Number\(v\.zoom\)\)\)/, 'a remembered view is capped too');
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

console.log(`check-maps: OK (${n} checks)`);
