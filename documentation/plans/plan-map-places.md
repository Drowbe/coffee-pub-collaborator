# Map and Places Plan: one Map, with its places, at every level

**Audience:** Thomas, who decided that the space-level Maps and Places become one thing and confirms the assumptions below; the try builders (server-development for step 1, experience-design for steps 2 to 4); content-manager when a production build lands it.

**Status:** partly built, 2026-10-13. Steps 1 to 3 built (the destination at space scope, the parts in a space, one Map on the Workspace). Step 4, the entries, came as the Map layout tab ([plan-layout-views](plan-layout-views.md)) and **Global Map** in the profile menu, not as a view in the one bar. Since then: one add-a-place flow and editable Place categories.

**Status when drafted:** drafted 2026-10-13 by product-planner from Thomas's decisions, with Thomas away; nothing approved as built. Thomas's direction: the same shape as [plan-calendar-todo](plan-calendar-todo.md): the global Map (`public/destination.js`, MapLibre and PMTiles, the place search with Photon) merged with Places into one module; the environment aggregate with a toggle per space and a space's own; markers and filters; stored keys and links kept; the module bus actions and the Planner's links to places kept; the environment Map parked in the profile menu for now; existing layouts keep working. This plan fills the Map view of [plan-one-bar](plan-one-bar.md).

## What exists today

- **The Map destination** (`/map`, [plan-map-destination](plan-map-destination.md), built): the same frame as the Calendar's, with the filter (Mine, the environment's own, each space) and the search field (`drawSearch()` in `destination.js`, `q` and `find` in the state), Maps' `main` part run in the page (it reads its map file by range and starts a worker, so the page allows `worker-src blob:` and `connect-src https:`; `public/space.html` allows the same) and Places' `panel`. Both parts may set `selected`; a part's `reveal` shows its tab on a phone. Pins come from `host.objects.search('', { scope: 'spaces', has: 'place' })` plus Mine and the environment's own. Hidden with no map file (`needsFile` in `server/destinations.js`). Without WebGL the panel takes the width and Maps shows its notice.
- **The Maps module** (`modules/maps`, 0.8.2): no data of its own; scope `environment` and `space`; `requires: ["places"]`; the `map` files setting (the host's on a hosted install); the action `showOnMap` (local); its canvas surface in a space draws that space's pins (`scope: 'space'` search), Mine and the environment's.
- **The Places module** (`modules/places`, 0.10.1): `place:<id>` in three stores (Mine, this space, everyone), kind `place` (`backlinks`, summary `place: point`); actions `addPlace`, `setPlacePoint`, `searchPlaces` and `newPlace` (the last two local); the geocoder settings and the place cache (`server/geocode.js`); `asPart` from `info.context.destination` (`places.js` 33); the editor window with **Where** as a part. The Planner's place cards hold `ref:places:place` pointers; `check-places.mjs` and `check-maps.mjs` hold the two.
- **Where the two show in a space:** the Show list, `opensWith` lists, saved layouts by id, the pop-outs `/modules/maps?space=` and `/modules/places?space=`. Places has no tile and `nav: false` on its page.

## Decisions

Thomas, 2026-10-13, as the status says.

## How it is put together

As the Calendar's: **the destination frame at space scope,** drawn as a view and as a composite module on the Workspace, with Maps and Places keeping their ids, data and parts. Merging the two would mean moving `place:` keys under `maps` (Maps keeps no data and reads places only as summaries) and breaking every `places:place` pointer the Planner holds; the frame keeps all of it.

- **The module id `maps` is kept** as the destination's `main`, the entry's name and icon and the map files' home.
- **The module id `places` is kept** as the owner of places; its canvas and page surfaces are no longer offered in a space where Maps is on (Maps cannot be on without Places). A saved layout or `opensWith` list naming `maps` or `places` opens the combined Map in its place. A space with Places and no Maps keeps Places' own canvas, as today.

## Steps

Each is one try build and leaves the app working. **Step 1 goes first**, and if [plan-calendar-todo](plan-calendar-todo.md) step 1 is built before it, this step adds only Map's own parts.

1. **The destination at space scope, Map's own** (server-development; first). `GET /api/destinations/map?space=<id>` on the shared rule, with the map file condition as now; `GET /map?space=<id>` serves the page. In a space `destination.js` draws the search field and a filter with **This <space>** (on), **Mine** (on) and the environment's own (off), remembered under `app.destination.map.<space id>`; the policy of `destination.html` is unchanged. Cases in `tools/check-destinations.mjs`.
2. **The parts in a space** (experience-design): Maps 0.9.0 and Places 0.11.0 take a destination context with a space: pins from `host.objects.search('', { has: 'place' })` in this space (the space mount's own scope; `scope: 'spaces'` stays refused there), plus Mine and the environment's by the filter; Places lists the three stores by the filter, **Where** offers this space, Mine and everyone (where the viewer may add), the copies in the place menu name their target; `searchPlaces` and `newPlace` are provided by the parts as the space's (`places.js` 893 already provides on a space mount), so the Planner's "Save it as a place" and Maps' **+** keep working; `selected` and `reveal` as today. `tools/module-versions.json`.
3. **One Map on the Workspace** (experience-design): the composite `dest:map` in `public/canvas.js`, built on the Calendar's composite (step 3 there) or building it if first: the map fills the module, Places' list as the panel the header switches, the search field in the module's toolbar; the Show list offers it in place of `maps` and `places` while Maps is on in the space; the stored-id mapping in `restore()`, `whatOpens()`, `layoutOf()` and `placeLayout()`; the pop-outs redirect to `/map?space=<id>`. Maps runs in the page inside the composite as it does in a docked column today. `check-canvas`, `check-layouts`, `check-maps`, `check-places`.
4. **The entries** (experience-design): the Map view in [plan-one-bar](plan-one-bar.md)'s bar opens `/map?space=<id>`; outside a space `dest-map` goes and **Map** joins `profileEntries()` after Calendar; `/modules/maps` and `/modules/places` keep their redirects to `/map` while it is shown. `tools/check-nav.mjs`.

## Verify

- **Step 1** by `tools/check-destinations.mjs`: a space's answer with and without a map file, 404 for a non-member, the page served with `?space=`, the environment answer unchanged. Live with curl, a small map file copied into `DATA_DIR/modules/maps/map-tiles/`.
- **Step 2** live in headless Chromium on `/map?space=<id>` (the list-only state if headless has no WebGL): this space's places and the Planner's pins, Mine and the environment's following the filter, a search with the stand-in Photon and a result saved into this space, a pasted coordinate making a draft pin, the Planner's "Save it as a place" from a space object landing in the list, `selected` both ways. `check-module-versions`, `check-maps`, `check-places`, `check-geocode`.
- **Step 3** live on the Workspace at 1280 px: the composite docked beside the Planner and floating; a saved layout that named `places`; an `opensWith` list that named `maps`; the Planner's place card opening its place in the composite (`host.objects.open`). `check-canvas`, `check-layouts`.
- **Step 4** by `check-nav` and live.
- **By tools throughout:** `tools/check-links.mjs` (the Planner's pointers to places), `check-drop.mjs` (a place dropped on the Planner, a plan object dropped on the map).
- **Only Thomas:** the map drawn with WebGL from real tiles, a real Photon search, "locate me" on a real phone, Firefox, Safari, a screen reader.

## Assumed, for Thomas to confirm

- **One thing seen, two modules behind it,** as for the Calendar; the reasons are the same, and the Planner's place links are the thing most at risk from a merge.
- **In a space the filter is This space, Mine and the environment's own,** with the environment's own off at first; the aggregate keeps the toggle per space. Thomas's "markers and filters" is read as the destination's filter plus the kinds of pins (other modules' objects as pins, places as rows, decision 15 of the Map destination).
- **Places' own canvas is hidden only where Maps is on.**
- **The composite on the Workspace** is wanted (the sketch shows "Map+Places" beside the Planner); a view-only Map (steps 1, 2 and 4) is the smaller build if not.
- **`showMap`** keeps governing the aggregate; the space's view shows whenever Maps is on in the space and a map file exists.

## Risks

- **Maps in the page inside a composite:** its worker, its map file by range and MapLibre's size are all already carried by the docked column, so this is the same risk as today, moved into a new container; it needs a real browser with WebGL to be seen, which headless Chromium may lack.
- **Step 3 shares `canvas.js` with the Calendar's step 3 and with one-bar's step 6;** build them in sequence.
- **Local actions** (`newPlace`, `searchPlaces`, `showOnMap`) need an open page of their module; the composite's parts must count as one, as the docked modules do today. Step 2 checks this with the Planner's "Save it as a place".
- **The two stale checks** fail before this work starts; a builder must say which they ran.
