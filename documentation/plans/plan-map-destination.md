# Map Destination Plan

**Audience:** Thomas, who decides what the Map destination shows, how it behaves and where it sits, and the sessions that build it: server-development (the setting, the destination routes, the search across spaces, the redirects, the checks) and experience-design (the destination page's Map parts, the SDK changes, the bar's entry, Manage's row, and the Maps and Places modules).

**Status:** approved by Thomas, 2026-10-02; built 2026-10-02, steps 1 to 6, after the Calendar's (Maps 0.8.0, Places 0.9.0). Differs from the plan as built: a map file at a web address does not count as a map file, so Map stays hidden with only one; Manage's reason for a missing file reads "Choose a file for "Map files" in Maps' settings first." (see TODO). Not verified: the map drawn with WebGL (headless Chromium had none), a real call, a screen reader, Firefox, Safari, a real phone. Drafted 2026-10-02; Thomas answered every question the same day (decisions 9 to 22), confirmed what Where lists and the redirects (decisions 23 and 24) and approved the plan. Phase 6 of [plan-primary-nav](plan-primary-nav.md) (decision 32), Map half only; the Calendar half is [plan-calendar-destination](plan-calendar-destination.md), and this plan uses the same frame (a host page that hosts declared parts) so the two are built once. Thomas's direction, 2026-10-02: Map is "a combination of the Places and Maps modules, as a direct destination in the top bar (not a dropdown)". It "has its own specific design and never pops out or floats". It is an environment option, "Show Map", "since not every environment wants it". It "honours the module settings on Manage's Modules tab: if a module is off or the viewer lacks permission, that part doesn't show". Later the same day, of both destinations: "for both I think you can add things." His layout sketch:

```text
[ Primary Nav                                   ]
[ [ trips ]                        [ search ]   ]
[ [ Map                       ] [ places ]      ]
```

Thomas confirmed this reading (decision 9): the second row is a bar for this page only, with a filter on the left named with the environment's space word in the plural ("Trips" in Travel, "Spaces" by default) that picks whose places show, and a search on the right; below it, the map fills the main area, and Places' list of places sits in a panel on the right.

## What it is today

- **The Maps module** (`modules/maps`, 0.7.18). Scope `space` only: on any other mount `maps.js` says "A map belongs to a space" and stops, so there is no environment page, and `GET /api/modules/maps/files/:name` (the map file, read by range) answers 400 at environment scope because `moduleAccess()` refuses a scope the manifest does not list. It keeps **no data of its own**. It draws every summary that carries a `place` (`{ lat, lng, name? }`), found with `host.objects.search('')` in three scopes: this space, the person's own and the environment's. That route (`GET /api/objects/search`) answers one scope at a time and at most 50 summaries. It refreshes every 90 seconds and when the page is shown again. Adding a place is the bottom bar's **+** (click the map) or a pasted coordinate or map link; both ask whichever module provides `newPlace` (Places), which opens its own dialog. Search goes through whichever module provides `searchPlaces` (Places), and results are drawn as candidate pins. It runs in the page, never in a frame: a frame cannot read the map file or start the map's worker, so its page needs `worker-src blob:` (`public/module.html` and `public/space.html` allow it). It `requires` Places. Without WebGL it shows a list of places only (`.app.listonly`).
- **Map files.** The `map` setting (type `files`, environment scope, `"shared": "host"`): the PMTiles files the map is drawn from, all together. On a single install they are in `DATA_DIR/modules/maps/map-tiles/`; with environments they are the host's, added or cut on the host console. "Add a region" ([plan-map-region-download](plan-map-region-download.md), built) cuts a region from a world file into that folder. A map file at a web address is the other choice ([plan-maps](plan-maps.md), addendum). Nothing here reaches a service the admin did not choose.
- **The Places module** (`modules/places`, 0.8.19). Scopes `environment`, `space` and `person`. A place is `place:<id>`, `{ title, category, address, point?, notes, owners, by, ref? }`, in one of three stores, shown by a view switch (`host.ui.viewSwitch`): **Mine** (the person's own, private even from administrators), **This space** (only on a space's canvas) and **Everyone** (the environment's own store). Its environment page, `/modules/places`, offers Mine and Everyone; it does not read the spaces' places, and nothing links to it (`surfaces.page.nav: false`, and it has no tile on home). Its bottom bar adds a place by name or a pasted coordinate or map link; with a place search set up, the same field searches (`host.geocode.search`), shows the results in `#found`, and **Save** keeps one. It provides `addPlace`, `setPlacePoint`, `searchPlaces` and `newPlace` (the last two `local`: carried out by the asking person's own open page).
- **Place search and the cache.** Places' settings choose the search (None, Photon, or the admin's own address) and whether results are kept in this environment (`saveResults`, off by default; [plan-place-cache](plan-place-cache.md)). `server/geocode.js` answers saved places first, then the service, and marks a result used when it is saved.
- **Reading across spaces.** `GET /api/modules/:id/spaces-data` (`host.spaces()` and the `spaces` scope) answers a module's own data in every space the viewer belongs to where the module is on and the viewer may read it. There is no such reading for other modules' summaries: `GET /api/objects/search` takes one scope.
- **Writing into a space from an environment page** is refused by the host (`scopeOf()` in `public/module-host.js`), not the server; plan-calendar-destination adds `{ space }` to the SDK's calls for this.
- **The top bar.** After step 2b of plan-primary-nav the middle zone is empty; neither module has an entry.
- **Decision 30** of plan-primary-nav: "Places means nothing without a map."

## Decisions

Thomas, 2026-10-01 and 2026-10-02 (plan-primary-nav decisions 2, 7, 21 and 32, and his direction above).

1. **Map is a destination in the top bar**, shown directly, not in a menu. It combines the Places and Maps modules.
2. **It has its own design** and never pops out or becomes a floating module.
3. **It is an environment option, "Show Map"**, since not every environment wants it.
4. **It honours the Modules tab.** With a module off, or no permission for the viewer, its part does not show.
5. **You can add things there** ("for both I think you can add things"): saving a new place from the map, a search or a pasted position, and changing a place, each by that space's own permissions for the viewer, as in the visit view (plan-primary-nav decision 21).
6. **The layout** is Thomas's sketch above.
7. **Views, from plan-primary-nav (option a).** Opened while present in a space, it slides over the space as a view, and you are Away while on the call; closing it brings you back. Present nowhere, it is a real page.
8. **On a phone** the top bar is the logo, the anchor or pill, the bell and the menu button (plan-primary-nav decision 7), so the destination's entry goes in the menu.

Thomas, 2026-10-02, answering the draft's questions.

9. **The sketch is read right:** a filter named with the space word in the plural ("Trips") on the left, with Mine and the environment's own places listed first, then the spaces; the search on the right; the map in the main area; Places' list on the right.
10. **The modules supply parts** (`surfaces.destination`), on a host page that hosts them, as the Calendar does (its decision 9).
11. **The entry sits in the middle of the top bar, after Calendar.**
12. **The entry uses the Maps module's display name and icon**, so a template's or an owner's name for Maps carries.
13. **Search finds both:** typing filters the saved places, and Enter looks up new ones through the place search.
14. **A new place always asks where it goes, as the Calendar does.** The dialog makes you pick every time (a space, or Mine); there is no default. Moving an existing place to another scope: not now.
15. **Other modules' objects are pins only** on the map, not rows in the list.
16. **Phone:** two tabs at the bottom, **Map | Places**.
17. **Show Map is off by default and on for Travel.**
18. **Show Map is set on Manage's environment tab**, in the Top bar section, below Show Calendar. With no map file the destination is hidden, and Manage's switch says why.
19. **Using the map without a connection is for later**, in its own plan.
20. **`/modules/maps` with the option off draws the map** across the person's spaces (the map with no panel).
21. **No "only what's on the map" list** for now.
22. **Choices are remembered per browser:** the filter, the map's last view and the phone's tab.

Thomas, 2026-10-02, approving the plan.

23. **Where lists what the filter lists:** Mine, the environment's own places for people allowed to edit there, then the spaces where the viewer may add. It matches the filter (decision 9), less what the viewer may not add to.
24. **While Map is shown, `/modules/places` and `/modules/maps` redirect to `/map`**, as the Calendar's pages lead to `/calendar`.

Thomas, 2026-10-02, on what the build left open.

25. **The filter lists the spaces you are a member of.** Owners and the admin who are not members of a space do not see it in the filter, nor its places here, though they can manage it elsewhere: "being able to manage a thing and being a member of a thing are different." The same holds for Calendar ([plan-calendar-destination](plan-calendar-destination.md), decision 23).

## How it is put together

Decision 10, the same frame as the Calendar's: **declared parts on a host page**. Maps declares the `main` part of the `map` destination (the map) and Places the `panel` part (the list). The host page draws the page bar, the filter and the search field, and mounts each part as it mounts a module page today. The host names the destination, not the modules. Whichever destination is built first builds the frame (`surfaces.destination`, `GET /api/destinations`, `public/destination.html`, `host.destination`); the second adds only what is its own.

Two other ways were set aside: Maps' page drawing the list itself would put Places' editing inside Maps, which the Places, Maps and Views plan moved out of it on purpose; and a host page naming `maps` and `places` breaks "Collaborator names no module" (architecture-modules, "Objects").

What Map needs that the Calendar does not, and why:

- **The `main` part runs in the page.** Maps cannot run in a frame (above), so the destination page mounts it in the page, as `runModeOf` already does for a bundled module, and its policy allows `worker-src blob:` and, for a map file at a web address, `connect-src https:`, as `module.html` does.
- **Both parts set the shared state.** In the Calendar only `main` may call `host.destination.set`. Here the panel selects a place and the map shows it, and the map selects a pin and the panel shows it, so both may set `selected`.
- **A search field in the page bar**, whose text the host hands to both parts.
- **Reading other modules' places across spaces**, which `spaces-data` does not do (above).

## The contract

### What a person sees

**The entry in the top bar.** An icon and a name, as the middle zone's core links look (`.core-link`): the Maps module's display name and icon in this environment (`store.moduleDisplay`), "Maps" with the map icon unless a template or owner renames it (decision 12). In the middle zone, after Calendar when both are on (decision 11). Shown only when the option is on, Maps and Places are on, a map file is set, and the viewer may read Maps at environment level (see "Who sees it"). Marked current while the destination is open. On a phone it is an entry in the menu, after Calendar's.

**The page bar** (the second row, drawn by the host, registered in `nav-bar.js` as the secondary bar's tools, as in the Calendar):

- **Left, the filter**: a button with the space word in the plural and a caret ("Trips ▾"), opening a menu of switches built with `switchListHtml()` (`public/switch-list.js`): first **Mine** (the user icon; signed-in people only), then the environment's own places by the environment's name (the globe icon; Places calls this view Everyone), then each space the viewer may read Places in, in the space list's order, each with its icon. A count shows when some are off ("Trips (3 of 5)"). Remembered in this browser; spaces added later show by default. A space where the viewer reads Maps' other sources but not Places (rare) is listed too; its places simply do not show.
- **Right, the search**: one field, placeholder "Find a place, or paste coordinates or a map link" ("Filter places, or paste coordinates or a map link" when no place search is set up). It finds both saved and new places (decision 13):
  - **As you type**, it filters the saved places shown, in the list and on the map, by title, address and notes (Places' filter as today, moved up here).
  - **Enter, or "Search for new places"** at the foot of the list, asks the place search (`host.geocode.search`, near the map's centre). Results show at the top of the panel as Places' `#found` rows, each with its source ("Saved on this server", "From Photon") and **Save**, and on the map as candidate pins (`.pin.candidate`). Escape clears them.
  - **A coordinate pair or a map link** puts a draft pin there and starts a new place.

**The map** (the main area, Maps' `main` part). As Maps draws it today, with the pins of every summary that carries a `place` in the chosen scopes: Places' places and other modules' objects (a trip stop, an event with a location), each with its module's icon, a pin from Mine wearing the person mark. The credit "© OpenStreetMap contributors" is always shown. First view: fitted to the pins, or the last view in this browser. Clicking a pin selects it: the callout shows on the map, and for a place the panel scrolls to it and marks it. Its bar on the map (Maps' toolbar today): **+** "Add a place: click the map", for anyone who may add a place somewhere. Zoom and "locate me" as today.

**The panel** (right, about a third of the width; Places' `panel` part). Places' list as today (grouped by category, the category chips, the place menu, the dialog), across the chosen scopes, each place marked with its scope's icon (the space's, the globe or the person). Clicking a place selects it on the map (the map flies to it); a place with no position says "No position yet" and opens its dialog, where a position can be set by clicking the map. Places' own header, view switch and bottom bar are not drawn as a part: the host's filter and search do those jobs. Other modules' objects are pins only, not rows (decision 15).

**Adding and changing a place** (decision 5). Every way to start a place ends at Places' dialog, with the position filled in when there is one: the map's **+** and a click, a pasted position, **Save** on a search result, or **Add a place** at the top of the panel (by name). The dialog gains a **Where** choice at the top, as the Calendar's editors do (decision 23): Mine, the environment's own places (for those who may edit Places at environment level), then each space where the viewer may edit Places (`write` in `spaces-data`, from plan-calendar-destination). It always starts empty, reading "Pick a <space>, or Mine", whatever the filter shows or was used last; **Save** says "Pick where it goes first." until one is picked (decision 14). An existing place cannot be moved; for one, **Where** shows its place and cannot be changed. Places' existing copies stay in the place menu, now naming the target: "Save to mine" for a shared place, and "Share to <space>" (a short list of the writable spaces) for one of Mine; the original stays where it was, as today. A place in a scope the viewer may only read opens read only, saying "Only people who can add places in <space> can change this." Changing another module's object (giving a trip stop a position) stays with that module, as today: its pin opens it there.

**Opening an object from the map.** A pin from another module opens that object as plan-primary-nav's phase 4 says: present in a space, a visit to its space (once step 8 is built; until then it enters, as today); present nowhere, its space is entered, or its module's page for one outside any space. A place opens in the panel, never elsewhere.

**States.** Loading; no places in the chosen scopes ("No places here yet." and, for someone who may add, **Add a place**); the map file will not load (Maps' error state, with **Retry**, and the panel still works); no WebGL (Maps' list-only state: the panel takes the whole width and the map part shows its notice); nothing ticked in the filter ("Pick at least one in <Trips>.").

**Who sees it.** Signed-in people only; a guest has no entry and `/map` sends a guest home. The map part needs Maps' `read` permission at environment level; the panel needs Places' `read` at environment level (as `GET /api/modules/nav` requires; a read in some space only is not enough, since the parts mount at environment scope). Without the panel the map still shows every pin the viewer may read, and adding is not offered. Maps cannot be on without Places (`requires`), so "Maps on, Places off" does not happen. Without Maps, there is no destination (Places means nothing without a map, decision 30). Inside, each space's places and objects show only where the module is on in that space and the viewer may read it there.

**Views (decision 7).** Present in a space, the entry opens `/map` as a view over the space (`data-overlay-link`), Away while on the call, and once step 7 of plan-primary-nav lands, with the return pill and the history entry `/#view=/map`. Present nowhere, it goes to `/map`. The map loads MapLibre only when opened, as now.

**Phones** (640 px or less; decision 16). Following "a phone on the web is not a mirror" (plan-places-views): the page bar stays one row, the filter as its icon and caret, the search field taking the rest. Below it, two tabs at the bottom, **Map | Places**, as the space's tab bar is on a phone; Map first, then the tab is remembered in this browser (decision 22). Selecting a place in the list switches to the Map tab with it selected; the callout on the map has "Show in list". The dialog fills the screen, as Places' does today.

### Tiles, offline regions and the place cache

- **Map files.** Nothing new. The map part reads the same ticked files through `host.files.url`, now at environment scope (Maps gains the `environment` scope, below). On a hosted install the files are still the host's shared folder; on a single install, the module's folder.
- **Offline regions.** Nothing new. "Add a region" stays where it is (Module Configuration on a single install, the host console with environments), and the destination draws whatever is ticked. "Offline" here means what it means today: the map is drawn from this server's own files, with no outside service. Keeping a region on a person's device for use without a connection is for later, in its own plan (decision 19).
- **The place cache.** Nothing new. The search goes through Places' geocoder at environment scope, so it reads and fills the same environment-wide cache, by Places' own settings, and saving a result marks it used.

### The environment option (decision 3)

- **Stored:** `settings.showMap`, `true` or `false`, default `false` (decision 17), so nothing changes until an owner turns it on. `PATCH /api/settings` takes it from owners and the admin.
- **Where owners set it** (decision 18): Manage's environment tab, in the **Top bar** section plan-calendar-destination adds, a switch **Show Map** below **Show Calendar**. Help line: "Adds Map to the top bar: places from every <space> on one map." The switch is shown off and disabled, with the reason, when Maps is off on the Modules tab ("Turn on Maps on the Modules tab first.") or no map file is set ("Choose a map file in Maps' settings first."; with environments, "Ask the host's admin for a map file.").
- **Templates:** `showMap` joins `SETTINGS` in `server/templates.js` (a boolean), checked by `tools/check-templates.mjs`. `templates/travel.json` sets `"showMap": true` (decision 17); applied once when an environment is made from it, as template settings are.

### Server (server-development)

What the Calendar's step 1 builds is assumed (`surfaces.destination` in `cleanManifest`, `GET /api/destinations`, `GET /api/destinations/:id`, `write` in `spaces-data`, the module page redirect). If Map is built first, this step builds those as plan-calendar-destination describes them. Map's own:

- **`map` is a known destination id**, beside `calendar`.
- **`settings.showMap`**, its `PATCH /api/settings` field and template field, as above.
- **Shown only with a map file.** `GET /api/destinations` lists `map` when `showMap` is on, Maps' `main` is readable by the viewer at environment level, and Maps' `map` setting names at least one file that exists (or a web address). `GET /api/destinations/map` answers 404 otherwise.
- **`GET /map`** serves `public/destination.html` to a signed-in person when Map is shown for them; otherwise it redirects to `/`.
- **Summaries across spaces.** `GET /api/objects/search` takes `scope=spaces`: every space the viewer belongs to where each provider is on and the viewer holds its `read` there (the `spaces-data` rule, through `refScope` per space), each summary's pointer carrying its `space`. It also takes `has=place`, keeping only summaries with a `place`; with `has=place` the cap is 1,000 rather than 50 (the map needs every pin, not the newest 50). One scope at a time stays as it is for every other caller.
- **Module pages lead to the destination** (decision 24). While Map is shown for the viewer, `/modules/places` and `/modules/maps` with no `space` redirect to `/map`, keeping the hash (`#ref=`). Pop-outs (`?space=`) are unchanged. With the option off, `/modules/places` is as today, and `/modules/maps` with no space draws the map across the person's spaces, with no panel (decision 20; Maps' part, below).
- **Check** (`tools/check-destinations.mjs`, shared with the Calendar): the cases under "Verify", step 1.

### SDK and the host (experience-design)

What the Calendar's step 2 builds is assumed (`{ space }` on an environment mount's storage, schedule, notify and links calls; `host.destination` and `info.context.destination`). Map's own:

- **`host.objects.search(q, { scope: 'spaces', has: 'place' })`**, passed through by `public/module-host.js` on an environment mount, refused on a space mount, as `scopeOf()` refuses `spaces` writes today.
- **The `map` destination's state**, through `host.destination.onState(fn)`: `{ mine: true | false, environment: true | false, spaces: [<id>...], q: "<search text>", find: <a number, raised on each Enter>, selected: <pointer or null> }`. `mine`, `environment` and `spaces` are the filter; `q` is the field as typed; `find` tells the parts that Enter asked the place search.
- **`host.destination.set({ selected })`** may be called by either part of the `map` destination (the Calendar keeps `set` to `main`). The host passes it to both.
- **The page** (`public/destination.html` and `destination.js`, built once for both destinations): for `map`, the filter and the search field in the page bar, Maps mounted in the page, Places mounted as the panel, the phone tabs, and the page's policy allowing `worker-src blob:` and `connect-src https:`.
- **The bar's entry** (`public/brand.js`): `dest-map`, after `dest-calendar`, in the middle zone; folded into the phone menu by `phoneZones()`. `tools/check-nav.mjs` learns the slot.
- **Manage**: the **Show Map** switch and its two disabled reasons.

### The modules (experience-design)

- **Maps 0.8.0.** `scope` gains `environment`. `surfaces.destination`: `main` for `map`, from the existing page, drawn by `info.context.destination`. On that mount it reads pins with `host.objects.search('', { scope: 'spaces', has: 'place' })` plus Mine and the environment's, keeps those in the filter's scopes, dims pins that do not match `q`, draws the search's candidate pins, and follows and sets `selected`. Its **+** and pasted positions ask `newPlace` as now; its own search field is not drawn as a part (the host's is used). On its environment page with no destination (`/modules/maps`, decision 20) it draws the same map across Mine, the environment's own and every space, with no filter or panel. On a space's canvas and a pop-out, it works as today.
- **Places 0.9.0.** `surfaces.destination`: `panel` for `map`, labelled with its display name. On that mount it loads Mine, the environment's own and each chosen space's places (`host.storage.list('place:', { scope: 'spaces' })` and the two it has), draws them in one list with each place's scope icon, filters by `q`, runs the place search on `find`, follows and sets `selected`, and opens its dialog with **Where** for `newPlace` and its own **Add a place**. Saves into a space with `{ space }`. The copies in the place menu name their target. On a space's canvas and its own page, as today.
- Both versions in `tools/module-versions.json` (`tools/check-module-versions.mjs` holds the fingerprint). Adding a scope and a surface: whether the admin is asked to approve again on update is to be checked by server-development in step 1; if it is, the update waits on the Modules tab as any approval does.

## Left to build, in order

Each step can be built and checked alone. If the Calendar destination is built first, steps 1 and 2 are only Map's own parts.

1. **Server** (server-development): `map` as a destination id; `settings.showMap` with `PATCH /api/settings` and the template field, and `showMap: true` in `templates/travel.json`; the map file condition in `GET /api/destinations`; `GET /map`; `scope=spaces` and `has=place` on `GET /api/objects/search`; the redirects of `/modules/places` and `/modules/maps`. Cases in `tools/check-destinations.mjs`.
2. **SDK** (experience-design): `host.objects.search` with `spaces` and `has`; the `map` state; `set` from either part.
3. **The modules** (experience-design): Maps 0.8.0 and Places 0.9.0. Their own pages and the space's canvas still work alone, so this step is checked before the destination page exists (Maps on its new environment page, decision 20).
4. **The destination page for Map** (experience-design): the filter and search in the page bar, both parts mounted, the selection between them, the phone tabs.
5. **The bar's entry and Manage's switch** (experience-design).
6. **Documentation** (content-manager): architecture-navigation and architecture-modules (the `map` destination, Maps' environment scope, `scope=spaces` for summaries), the SDK reference (`host.objects.search` across spaces, the `map` state), api-modules, the Maps and Places user guides and the admin guide, the CHANGELOG with a note for module authors, and plan-primary-nav's phase 6 status.

## Verify

- **Step 1.** Checked by `tools/check-destinations.mjs`: `GET /api/destinations` without `map` when the option is off, Maps is off, no map file is set, for a member with no environment-level read of Maps, and for a guest, and with it otherwise; `GET /api/destinations/map` without the panel when Places is unreadable at environment level; `GET /api/objects/search?scope=spaces&has=place` answering a member only the spaces they belong to where the provider is on and readable, each pointer with its `space`, only summaries with a place, and more than 50 of them; a place saved with `scope=space` into a space accepted for a member with Places' `edit` there and refused for a non-member and for a member without it; the redirects from `/modules/places` and `/modules/maps` while shown, none with `?space=`, and none with the option off; Travel's template giving `showMap: true`; a single install with nothing set behaving as before. Live with curl on a throwaway `DATA_DIR`, a map file cut with "Add a region" or a small file copied in.
- **Step 2.** Checked by a tool: `host.objects.search` passing `spaces` for an environment mount and refusing it for a space mount; the `map` state sent to both parts and `selected` taken from either.
- **Step 3.** Live in headless Chromium on the modules' own pages: Places listing three scopes with their icons; **Where** listing Mine and only writable spaces, starting empty every time (also after a save, and with one space in the filter), and Save refused until one is picked; a place saved into a space from the environment mount and seen on that space's canvas; a read-only place saying why; Maps at environment scope drawing the map file and pins from two spaces. `check-module-versions` for both bumps. Headless Chromium may have no WebGL; if so, the map's list-only state is what is checked there and the drawn map needs a real browser.
- **Step 4.** Live in headless Chromium at 1280, 1024 and 390 px, as a member of two spaces, an owner, and a member who may read Places only in a space: the layout; the filter driving the pins and the list, and remembered on reload; typing filtering both; Enter asking the place search (with Photon or a stand-in address) and a result saved through **Where**; a pasted coordinate making a draft pin; the selection following both ways; the panel missing for a viewer without Places at environment level; the phone tabs, and the tab remembered.
- **Step 5.** `tools/check-nav.mjs`: the entry's slot after Calendar's, its absence when not shown, its place in the phone menu. Live in headless Chromium: Manage's switch on and off, disabled with Maps off and with no map file; the entry opening over a space as a view with the faked LiveKit, setting `away` on the call and not off it.
- **Needs a real call:** opening Map over a running call, hearing muted and the microphone and camera held off, and everything restored on closing. Not checked here: the map drawn with WebGL in a real browser if headless has none, a screen reader, Firefox, Safari, a real phone (the "locate me" button included).

## What is not decided

Nothing Thomas was asked: decisions 9 to 24 answer every question of the draft, and decision 25 one the build raised. Later, by decision: moving a place to another scope (14), using the map without a connection (19), and a list that follows the map's bounds (21).
