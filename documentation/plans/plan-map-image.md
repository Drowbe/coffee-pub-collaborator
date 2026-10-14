# Map Image Plan

**Audience:** Thomas, who decides whether an environment may draw its own map from a picture of an invented world, how the picture gets in, and what Places and Maps do on it; the try builders (server-development for the header, the upload and the environment's fact, experience-design for Maps and Places); content-manager when a production build lands it.

**Status:** built in steps 1 to 4, 2026-10-14 (the tile type; the Picture map setting with its streamed upload, `MAP_IMAGE_MAX_MB` and `environment.pictureMap`; Maps drawing it; search off and Places following it). Changed from the plan: the picture map's zoom stops at the file's own highest zoom (capped at the file's own maximum). Step 5, documentation, is left, and so is a live check with WebGL, which headless Chromium here cannot draw. Places saved before a picture map keep their positions.

**Status when drafted:** approved, 2026-10-14. Drafted the same day by product-planner; Thomas answered the input, replacement, search and setting questions (decisions 3 to 6 below); the places saved before the switch and distances and units were not asked and stand as working assumptions. Nothing built. Thomas asked: "could an environment serve its own map? Like, I have an image I'd like to use as a map... is that possible?", then "I would convert it to a pmtiles". Asked what the picture is and where it belongs, he answered: an invented world (a fantasy or game map, not a real place), and one picture map per environment, not per space.

## What it is today

- **Maps draws only vector map data.** `buildStyle()` in `modules/maps/src/maps-lib-d-style.js` makes every ticked file a source of `type: 'vector'` and draws the Protomaps basemap layers from it by their layer names (`earth`, `water`, `roads`, `places` and the rest). `startMap()` in `maps.js` adds each file to the PMTiles protocol and reads its header for the centre and bounds, then builds that style. A raster PMTiles file (picture tiles, PNG, JPEG or WebP) ticked in `map` is read and listed, but the map gets picture bytes where it expects vector tiles and draws nothing but the background. Read as code only; not tried in a browser.
- **The reader already knows picture tiles.** The bundled reader (`maps-lib-b-pmtiles.js`) reads the header's tile type (byte 99: 1 vector, 2 PNG, 3 JPEG, 4 WebP, 5 AVIF) and can hand raster tiles to MapLibre; MapLibre has a `raster` source type. Nothing new is needed in the browser libraries.
- **The server reads only the zoom range.** `pmtilesZoomRange()` in `server/pmtiles-header.js` reads the 127-byte header for bytes 100 and 101 (minimum and maximum zoom) and nothing else, for the **Zoom** column of a `files` setting's table. It does not read the tile type, so Manage cannot tell a picture file from a map data file.
- **Map files are the host's, with environments.** Maps' `map` setting (type `files`, folder `map-tiles`, `"shared": "host"`) is one folder for every environment when `BASE_DOMAIN` is set (`DATA_DIR/shared/maps/map-tiles/`, managed on the host console); on a single install it is `DATA_DIR/modules/maps/map-tiles/`, ticked in Maps' settings. An owner on a hosted install cannot add a map file at all.
- **No file reaches a module folder through a page.** Files get there by copying them into the folder or by "Add a region" (`server/region-cut.js`, the `pmtiles` CLI vendored in the Docker image). `GET /api/modules/:id/files/:name` serves a file by range; `DELETE` removes one (owner, refused for a shared folder). Page uploads exist only for photos (`server/module-uploads.js`, 10 MB, `express.raw`).
- **A non-shared `file` setting already works per environment.** `filesDirFor()` puts a folder that is not shared in the environment's own data folder, and `moduleHasFile()` (the Map destination's `needsFile`) counts any environment-scope `file` or `files` setting, so a new one would show the Map destination with no other change.
- **Positions are latitude and longitude everywhere.** A place's `point` and a summary's `place` are `{ lat, lng }`, checked with `inRange` (latitude 90, longitude 180) in the SDK (`host.util.geo`), `server/geocode.js` and Maps. Coordinates are shown and copied as text (`coordsText`), opened in the person's maps app (`mapsLink`, a `geo:` link or a web link) and pasted back (`parsePoint`).
- **Search is the real world's.** Places' `searchProvider` (None, Photon, or the owner's own address) answers through `server/geocode.js`, with the place cache in front. With None, typing still filters saved places.
- **There are no distances or routes.** Nothing in the modules, the pages or the server measures a distance or draws a route; directions are a link to the person's own maps app ([plan-maps](plan-maps.md), "Search yes, directions no").
- **The credit is fixed.** CONTRACT.md: "© OpenStreetMap contributors" is on every map and no setting hides it.
- **Backups are made in memory.** The console's backup and an owner's export zip the whole environment folder in memory, and a restore refuses more than 500 MB (`readEnvironmentZip`). Anything kept in the environment's folder travels with them.

## Decisions

Thomas, 2026-10-14.

1. **It is for an invented world**, a fantasy or game map, not a real place. Nothing on it is somewhere on Earth.
2. **One picture map per environment**, not per space. Every space in the environment shares it.
3. **Input is option A.** The owner converts the picture to raster PMTiles (the GDAL recipe stays in this plan) and uploads it. A single-image option (C2) may come later if owners without tools ask. Option B is not built. Reason: it is what Thomas said he would do, and it adds no dependency.
4. **The picture map replaces the world map for the whole environment while it is set.** Clearing the setting goes back to the world map. There is no switch between the two on the map. Reason: it is an invented world, so nothing on it is on Earth.
5. **The server tells every module there is a picture map** (`environment.pictureMap`, from `host.ready()`) **and switches off the outside geocoder search.** Places' search looks only at saved places. Reason: the outside search knows only the real world.
6. **The owner sets it in Maps' settings, beside "Map files", as `imageMap`.** The upload limit is `MAP_IMAGE_MAX_MB`, default 100. The file is stored with the environment, so backups and exports carry it. Reason: the picture is a map file and that is where map files already are; a restore refuses more than 500 MB in all.

Working assumptions, not asked (Thomas can change them):

- **Places saved before the switch keep their positions and are not hidden or moved.** The setting warns the owner (see "What the invented world changes").
- **Distances and units come later,** if ever; nothing about them is built now.

Everything else below that is marked "proposed" or listed under "Assumed" is still a proposal for Thomas to confirm.

## Why it needs fake coordinates

MapLibre draws only Web Mercator (the projection of web maps), and PMTiles holds tiles by zoom, column and row in that projection. A picture has no coordinates, so it has to be placed somewhere in that square. The proposal is one fixed rule for every picture, so the builders, the recipe and any later distance feature agree:

- **The picture's longer side spans the whole Web Mercator square**, centred on 0,0. A picture of `W` by `H` pixels, with `S` the longer of the two, covers from `-E*W/S` to `E*W/S` across and `-E*H/S` to `E*H/S` down, where `E` is 20037508.34 metres (half the square).
- **Zoom 0 is the whole picture in one 256-pixel tile**, and each zoom doubles it, so the most detailed zoom is `ceil(log2(S / 256))`: 6 for a 16384-pixel picture, 5 for 8192, 4 for 4096. The picture is never drawn larger than its own pixels except by MapLibre's overzoom (blurry), two levels at most.
- **A pixel and its fake position convert both ways** with the Web Mercator formulas: `lng = x_m / R * 180 / pi` and `lat = atan(sinh(y_m / R)) * 180 / pi`, with `R` 6378137 and `x_m`, `y_m` the pixel's metres from the centre. The picture is drawn undistorted (pixels are evenly spaced in metres); only the derived latitude bunches up towards the top and bottom, which nobody sees as long as nothing measures with latitude and longitude.
- **Every stored position stays `{ lat, lng }`.** Places, summaries, pointers, `inRange`, the checks and other modules' objects keep working unchanged, which is the main reason to prefer fake coordinates over a new flat `{ x, y }` field (option C1 below).

## The options for getting the picture in

Thomas chose A (decision 3). B and C1 are kept below for the record, as the options that were not taken; C2 may follow later.

**A (decided). The owner makes a raster PMTiles file and uploads it (Thomas's own words: "I would convert it to a pmtiles").** Maps draws a raster file as the only layer, with no world map under it.

- **The recipe** (to be printed in the Maps guide; read from the tools' documentation, not run here, since GDAL is not installed in this container): place the picture with the rule above, tile it, convert it.
  - `gdal_translate -of GTiff -a_srs EPSG:3857 -a_ullr <left> <top> <right> <bottom> world.png world.tif`
  - `gdal_translate -of MBTILES -co TILE_FORMAT=WEBP world.tif world.mbtiles`, then `gdaladdo -r average world.mbtiles 2 4 8 16 32` for the smaller zooms
  - `pmtiles convert world.mbtiles world.pmtiles` (the same `pmtiles` tool the image already carries)
  - Alternatives: `gdal2tiles.py --xyz` into a folder of tiles and `mb-util` into MBTiles, or `rio pmtiles` (Python, from Protomaps) straight to PMTiles. A small helper page or script that prints the four `-a_ullr` numbers from a picture's size would save owners the arithmetic.
- **Costs:** the owner needs GDAL (free, on every platform, but a command-line tool); an upload route for a large file (a hosted owner cannot copy a file onto the host's disk); Maps learns a raster style (small); Manage learns the tile type (small). No new dependency on the server or in the page.
- **Gives:** any size of picture (tiles load only what is on screen), sharp at every zoom up to the picture's own pixels, works on a phone, offline and self-hosted, the same reading by range as today's map files, and the same MapLibre pins, clusters, callouts, drop and selection.
- **Rules out:** owners who will not use a command line, until B or C2 exists.

**B. The owner uploads the picture itself and the server cuts the tiles.**

- **Costs:** an image library on the server. `sharp` (libvips) is a native npm addon with prebuilt binaries per platform; the Docker build installs npm packages once on the build machine and copies them into both images, so the arm64 image would get the wrong binary unless the build is changed; that is the very case the pure-JavaScript rule was written for. `vips-tools` from Alpine (`apk add`, prebuilt per architecture, like the vendored `pmtiles` binary) avoids that, at tens of MB on the image, and its `dzsave` writes a folder of tiles that still has to become one PMTiles file (a PMTiles writer in JavaScript, or MBTiles and `pmtiles convert`, which needs SQLite). A pure-JavaScript cutter (`pngjs` is already in `node_modules` through `qrcode`; JPEG would need another package) holds the whole picture in memory: about 1 GB for a 16384-pixel square, too much for a NAS. Not in `package.json` today: no `sharp`, no libvips, no image decoder of its own.
- **Gives:** no tools for the owner.
- **Rules out:** nothing, but it is the largest build here, adds a compiled thing to the image (Thomas said yes to one before, for `pmtiles`, [plan-map-region-download](plan-map-region-download.md)), and the upload is still a large file.

**C. One picture, no tiles.**

- **C1, a pan and zoom viewer of its own with flat `{ x, y }` positions.** Simplest to picture, but Maps would need a second renderer for pins, clusters, the callout, the draft pin, the drop target and the selection, and every position would need a new field beside `lat` and `lng` in Places, summaries and the checks. Not recommended.
- **C2, MapLibre's `image` source.** MapLibre draws one picture stretched over four corner coordinates, with the same fake-coordinate rule as A, so everything else in Maps stays as it is. The owner uploads a PNG, JPEG or WebP, no tools. The limit is the device: the whole picture is one texture, which phones cap at 4096 or 8192 pixels and which costs width x height x 4 bytes of memory (64 MB at 4096 pixels square). Good for a picture up to about 4096 pixels; anything larger needs A.

**Decided: A now, C2 later if owners without tools ask for it, B not built (decision 3).** The reasoning behind it: A is what Thomas said he would do, it handles any size and zoom quality, it is the smallest build that works on a phone, it adds no dependency, and it fits the self-hosted, offline map files the rest of Maps already uses. C2 shares nearly all of A's code (the fake coordinates, the empty world, the hidden real-world actions), so it is a short step on top when wanted, and it serves exactly the owners B would serve for modest pictures. B costs the most and breaks the build rule for the least gain.

## What the invented world changes

The first, search and existing-places bullets follow Thomas's decisions (and the working assumption for existing places); the rest are proposals for Thomas to confirm.

- **The world map is not drawn (decision 4).** With an environment's picture map set, Maps draws only the picture, on the theme's background colour (`--bg-section`), in every space of the environment and on the Map destination. The host's or the server's `map` files are ignored there. Clearing the picture brings the world map back.
- **Pins, clusters, the callout, the draft pin, the drop, the selection and `showOnMap`** work unchanged, on fake coordinates.
- **Zoom.** The map's `maxZoom` becomes the file's maximum zoom plus two (not 19), and the picture's bounds are the limit of panning (`maxBounds`). The fixed zooms in `maps.js` (13 on select, 14 on fit and draft, 15 on a pasted position, 17 on a cluster) are capped at the map's maximum.
- **What makes no sense on an invented map is hidden:** "Show where I am" (geolocation), "Open in my maps app" (in Maps' callout and Places' place menu) and the OpenStreetMap credit. The credit is replaced by the file's own `attribution` metadata if it has one (the artist), else nothing. This changes CONTRACT.md's "the credit is always on the map" rule, which holds for map data from OpenStreetMap and not for a picture.
- **Coordinates.** Copying and pasting a position keeps working (they are still `lat, lng` text, useful for passing a spot to someone), but the callout and Places' dialog do not show them as if they were real: proposed, they are left off the callout and shown in the dialog's position field only.
- **Search searches only the environment's own places (decision 5).** The outside search (Photon or the owner's own address) knows only the real world, so with a picture map it is not asked: `host.geocode.search` answers as with None, and the place cache is neither read nor filled. Typing in the Map destination's field or in Places filters the saved places (Places' own places, in every scope the viewer reads), as with None today. Enter finds among them and selects the first match on the map rather than asking outside.
- **Existing places (working assumption).** Places already saved with real positions stay where their numbers put them, which on a picture is somewhere meaningless. Nothing is moved or hidden; an owner switching an existing environment to a picture is told so on the setting ("Places saved before keep their positions, which will not mean anything on this picture.").
- **Distances, units and routes (working assumption: later).** None exist today, so nothing changes now. If a distance feature is ever built, on a picture map it measures in the picture's pixels (through the rule above, never with latitude and longitude) times a scale the owner gives: proposed two optional settings for later, **Map width** (a number) and **Unit** (a word: miles, leagues, days' ride). Routes on an invented world would be drawn by hand, not computed. Both are left out of this plan.

## Where an owner sets it

Decision 6 fixes the place (Maps' settings, beside "Map files"), the name `imageMap`, the limit variable and its default, and that the file is stored with the environment. The details below follow from it.

- **A new Maps setting, `imageMap`**: label "Picture map", type `file`, folder `image-map`, scope `environment`, not shared with the host, default empty, with an upload (below). Help: "A picture of an invented world, made into a PMTiles file of picture tiles. When set, the map shows only this picture, in every {space}, and place search looks only at saved places." It sits in Maps' settings on Manage's Modules tab, under **Map files**, and not on Manage's environment tab, because the picture is a map file and that is where map files already are, and the Map destination's missing-file reason already points there.
- **Who may set it:** the owner (decision 6), and the admin (the environment's module settings, as `DELETE /api/modules/:id/files/:name` already requires; assumed). Not a moderator, not a member.
- **Stored:** on a single install, `DATA_DIR/modules/maps/image-map/<name>.pmtiles`; with environments, `<the environment's data folder>/modules/maps/image-map/<name>.pmtiles`. One file: a new upload replaces the old one and the setting names the new file.
- **Upload limit:** `MAP_IMAGE_MAX_MB`, default 100 (decided). The reason for 100: a backup and a restore carry the environment's folder and a restore refuses more than 500 MB in all; a 16384-pixel WebP picture map is expected to be tens of MB (an estimate, not measured).
- **Unset, nothing changes.** With `imageMap` empty, single installs and hosted ones draw the `map` files exactly as today; with no `MAP_IMAGE_MAX_MB` the default applies.

## The contract

### Server (server-development)

- **The header's tile type.** `server/pmtiles-header.js` gains `pmtilesInfo(filePath)` answering `{ minZoom, maxZoom, tileType, bounds }` (`tileType` from byte 99; the bounds from bytes 102 to 117), with `pmtilesZoomRange()` kept as it is for its callers. `inspectDir()` adds `kinds: { <name>: 'vector' | 'picture' }`, and Manage's files table shows it beside **Zoom** ("Map data" or "Picture").
- **A raster file in `map` is flagged.** Ticking a picture file in `map` is refused with "That file is a picture map. Choose it under Picture map instead." (400); a vector file in `imageMap` likewise ("That file is map data, not a picture. Choose it under Map files instead.").
- **The upload.** A `file` setting may declare `"upload": { "accept": "pmtiles-picture" }`. `PUT /api/modules/:id/files/:folder` with an `application/octet-stream` body, owner only, streamed to a temporary file in the folder (never held in memory), then checked and renamed into place:
  - 401 not signed in, 403 not an owner or the admin, 403 "managed by the host" for a shared folder, 404 no such module or no such upload setting;
  - 413 over `MAP_IMAGE_MAX_MB` (the stream is stopped at the limit and the temporary file removed);
  - 415 not a PMTiles file ("That is not a PMTiles file."), 422 not picture tiles ("That PMTiles file holds map data, not a picture.");
  - 200 `{ name, size, minZoom, maxZoom }`, the setting set to the new name and the old file removed. The name comes from a `?name=` query, checked against `FILE_NAME_RE` and ending `.pmtiles`.
  - A failure at any point leaves the previous file and setting as they were.
- **The environment's fact.** Maps declares `"pictureMap": { "setting": "imageMap" }` in its manifest (as it declares `regionSource`), so the server names no module. While that setting names a file that is there, `host.ready()`'s answer carries `environment.pictureMap: true` for every module, and the geocode route answers as with no search set up ("not set up"), reading and filling no cache. Off otherwise, and on a single install with nothing set.
- **The Map destination** shows with only a picture map set (already so through `moduleHasFile()`; a case in `tools/check-destinations.mjs`).

### Maps (experience-design)

- **Settings:** `imageMap` in `module.json` (above), with its upload.
- **Drawing:** with `imageMap` set, `startMap()` reads that one file's header, and `buildStyle()` (or a sibling, `buildPictureStyle()`) gives a `background` layer from `--bg-section` and one `raster` layer from a `raster` source (`url: pmtiles://<address>`, `tileSize: 256`, the file's `minzoom` and `maxzoom`). `maxZoom` is the file's maximum plus two, `maxBounds` the file's bounds. The theme change rebuilds it as today.
- **Hidden on a picture map:** "Show where I am", `open-in-maps` in the callout, the coordinates line in the callout and the OpenStreetMap credit (the file's own `attribution` is shown instead, through `credit()`).
- **Zooms** in `select()`, `draftAt()`, `fitBounds()` and pasted positions capped at the map's maximum.
- **Search:** `runFind()` and the destination's `find` with no outside search filter `state.all` by title and select the first match.
- **What a person sees:** the picture fills the map, pins on it as today, no credit unless the file names one, nothing outside the picture. The `tpl-state-nomap` state still shows when neither a picture nor map files exist.
- **Version:** Maps 0.8.6 to 0.8.7 for each try build that changes it (`tools/module-versions.json`).

### Places (experience-design)

- Reads `environment.pictureMap` from `host.ready()`. When true: no "Open in my maps app" in the place menu; the search field and `searchPlaces` filter saved places only (as with None, without the "not set up" wording); the dialog's position field still takes pasted coordinates.
- **Version:** Places 0.10.6 to 0.10.7.

## Left to build, in order

Approved 2026-10-14, so these steps can start. Each step is a try build (one builder, one pass, its own checks, pushed at once), leaves the app working, and can be checked alone. The order is unchanged by the decisions; steps 2 and 4 are where decisions 5 and 6 land.

1. **The tile type** (server-development; low risk). `pmtilesInfo()`, `kinds` in `inspectDir()`, the Picture or Map data column, and the refusal of a picture file in `map`. Fixes the "listed but not drawn" trap on its own. No module changes.
2. **The picture map setting and its upload** (server-development; medium risk: a large streamed upload, disk, replacing a file). The `upload` declaration, `PUT /api/modules/:id/files/:folder`, `MAP_IMAGE_MAX_MB`, the `pictureMap` declaration and `environment.pictureMap`, and `imageMap` in Maps' `module.json` (Maps 0.8.7). The upload control in Module Configuration's file row (`public/module-config.js`), a file picker and a progress line, is in this step so it can be checked end to end.
3. **Maps draws the picture** (experience-design; higher risk: the map and its style, which headless Chromium cannot draw without WebGL). The raster style, zoom and bounds, the hidden real-world actions, the credit, the capped zooms, search among saved places (Maps 0.8.8).
4. **Search and Places on a picture map** (server-development for the geocode route answering "not set up", experience-design for Places 0.10.7; low risk). Could be built before step 3.
5. **Documentation** (content-manager; only when this lands as a production build): the recipe and the fake-coordinate rule in the Maps guide, the setting in the admin guide, `upload` and `pictureMap` in api-modules, `environment.pictureMap` in the SDK reference, CONTRACT.md's credit rule, the CHANGELOG. A try build has none.

C2 (a plain picture with no tiles), if Thomas wants it later, is one more step after 3: `accept` gains PNG, JPEG and WebP up to a size and pixel limit, and Maps draws an `image` source over the same box.

## Verify

- **Step 1,** checked by a tool: `tools/check-pmtiles-header.mjs` with a vector header and a raster header built by the check itself (the tile type, the bounds, the zoom range unchanged for its callers); `tools/check-maps.mjs` for the refusal of a picture file in `map`. Live with curl on a throwaway `DATA_DIR`: the files table's `kinds`.
- **Step 2,** checked by a tool (a new case in `tools/check-maps.mjs` or `tools/check-uploads.mjs`, with a small raster PMTiles file the check writes): 200 and the setting set; a second upload replacing the first and the first file gone; 413 over a low `MAP_IMAGE_MAX_MB` with no file left behind; 415 for a non-PMTiles body; 422 for a vector file; 403 for a member and for a shared folder; 401 signed out; `environment.pictureMap` true with the file and false without; a single install with nothing set answering exactly as before. `tools/check-module-versions.mjs` for the bump. Live with curl and in headless Chromium on Module Configuration: the upload control, its progress and its error lines.
- **Step 3,** checked by a tool where possible: `buildPictureStyle()` is pure, so `tools/check-maps.mjs` can check its layers, source and zooms without a browser. Live in headless Chromium: the hidden actions and credit, and the list-only state if there is no WebGL. **Only Thomas, in a real browser:** the picture drawn at every zoom, panning stopping at its edges, pins landing where they were placed, the theme's background around the picture, a real phone.
- **Step 4,** checked by a tool: `tools/check-geocode.mjs` (no outside request and no cache write while a picture map is set; as before without one), `tools/check-places.mjs`. Live in headless Chromium: typing and Enter finding saved places only.
- **Not checkable here:** the GDAL recipe (GDAL is not installed in this container; Thomas or a builder with GDAL runs it once on a real picture before the guide prints it), the size of a real picture map, drawing with WebGL. Nothing here touches a call, so no LiveKit check is needed.

## Risks

- **Maps module versions:** a changed module bumps its patch, once per try build that changes it (steps 2 and 3 for Maps, step 4 for Places), held by `tools/check-module-versions.mjs`.
- **Backups.** The picture lives in the environment's folder, so it travels with an export, a backup and a restore, which are made in memory and capped at 500 MB on restore. The default limit keeps one picture well under that, but a large picture plus a large environment could still pass it.
- **A large upload** through Express must be streamed to disk with a running count, never read with `express.raw`; a proxy in front (a hosted install's) may have its own body limit, which the owner sees as a failed upload.
- **The credit rule** in CONTRACT.md changes; a builder must not remove the OpenStreetMap credit from a real map by mistake.
- **The fixed zooms in `maps.js`** are spread through the file; one missed means a jump into blurry overzoom on a picture map.
- **Places' changes and the geocode route** touch the real-world search everyone else uses; `tools/check-geocode.mjs` must show nothing changes without a picture map.
- **The stale checks:** in a cloud container running as root, `check-names` fails two migration cases; a builder must say which checks they ran.

## Assumed, for Thomas to confirm

Already decided and no longer open: the picture replaces the world map in the whole environment (decision 4), and it is kept with the environment and travels with backups and exports (decision 6). Still assumed:

- Every space in the environment uses it; a space cannot turn it off.
- The owner and the admin set it; on a hosted install the host admin does not have to approve it.
- Existing places keep their positions and are not hidden (working assumption).
- Copy and paste of coordinates stay; "Open in my maps app" and "Show where I am" go.
- The fake-coordinate rule above (the longer side spans the whole Web Mercator square, 256-pixel tiles).

## What is not decided

Decided on 2026-10-14 and no longer open: the input option (A), where the setting lives, how Places and search learn about the picture, the upload limit and its default, and that the picture travels with backups.

- **Whether C2 is built:** only if owners without tools ask.
- **Places saved before the switch:** kept with a warning, as a working assumption; Thomas has not been asked.
- **Distances and units:** later, with the two settings sketched above; Thomas has not been asked.
- **The proposals in "What the invented world changes"** other than the ones tied to decisions 4 and 5 (hidden "Show where I am", "Open in my maps app", coordinates in the callout, the credit, the zoom caps).
- **Several pictures** (a world map and a city map, layered or switched): not now, by decision 2.
