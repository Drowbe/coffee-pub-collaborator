# Layout Views Plan: every view is a layout

**Audience:** Thomas, who decided the shape and confirms the assumptions; the try builders, one per step (server-development for steps 1, 5's server half and 6, experience-design for the rest); quality-assurance only when Thomas names a production build.

**Status:** drafted 2026-10-13 by product-planner with Thomas away; nothing here is built. Each step is a try build (one builder, one pass, its own checks, a patch version bump for each module it changes, the app working after it). Thomas, 2026-10-13: "using layouts + favorites, we can already create these exact views, with less code. [...] if maps are enabled as a module type, we create a 'system' layout called 'Map' and pre-favorite it. If calendar is enabled [...] 'Calendar' [...]. These both get their proprietary icon. Instead of adding 'favorites' to the left of the layout menu, let's add them building from the left, right after the current 'Workspace' tab. They should match the style of the workspace one. AND let's make 'Workspace' a layout too... and it is our default one... but the user can rename it but not delete it. For each one, let the user change the icon used for it from our set. This means that ALL views are layouts and we have a complete, simple system. The layout menu stays where it is and as it is (other than the above changes)." This reverses the placement decided an hour earlier (favorites growing out from the Layout button on the right). It changes [plan-favorite-layouts](plan-favorite-layouts.md) (decisions 3, 9, 10 and 13, and "No current state") and [plan-one-bar](plan-one-bar.md) (decisions 1 and 6: the views become layouts).

## What it is today

- **Views** (plan-one-bar step 7, built): `spaceViews()` in `public/primary-nav.js` gives `view-workspace` then `dest-calendar` and `dest-map` (group `views`, `groupOrder` 12, `phone: 'menu'`); `drawViews()`, `markViews()` and `showView()` in `public/space.js` (1509 to 1620) put `/calendar?space=<id>` or `/map?space=<id>` in `#view-frame` (`public/space.html` 117) in the canvas's place, hide floating modules (`canvas.showFloating(false)`), and hide the Workspace's tools (`workspace: 'only'`, `nav.setWorkspace`, the `body.view-*` rules in `style.css`, 9799 on).
- **Composites** (plan-calendar-todo and plan-map-places step 3, built): `dest:calendar` and `dest:map` in `public/composites.js` are canvas modules whose body is the same page in a frame. A stored `calendar` or `todo` reads as `dest:calendar` while the Calendar is on; `maps` or `places` as `dest:map` while the space's Map answers (`ask`, the map-file rule in `server/destinations.js`). So the same content exists twice: once as a view, once as a module.
- **Saved layouts** (`server/layouts.js`, `layouts.json`): `{ id, name, by, at, modules, snap? }`, 10 own and 10 shared per space; `cleanLayout()` takes only `name`, `shared`, `modules`, `snap`, and a module id must match `^[a-z][a-z0-9-]{0,31}$`, so `dest:map` cannot be stored, but `maps` can and already reads as the composite. **Favorites**: per person per space, at most 3 (`LAYOUT_LIMITS.favorites`), drawn as `#layout-favorites` in the top bar's right zone beside the Layout button (`modules-toggle`), names shortened by `labelsThatFit()` then dropped.
- **What opens** (`restore()` in `public/canvas.js` 1460, `whatOpens()` in `public/opens-with.js`): the request, the space's `defaultLayout` (a shared layout id, first visit or guest, only when `opensWith` is set), the browser's remembered `__open` (`app.canvas` in `localStorage`), the space's `opensWith`, the environment's list, then chat and every module. Set up's Opens with tab edits `opensWith` and `defaultLayout` (`public/space-setup.js`).
- **Availability per space:** `ModuleManager.onInSpace()` in `server/modules.js` (1191): on when `allSpaces` or the space is in `spaces`; the Lobby only for a manifest with `surfaces.canvas.lobby`. Set by Manage > Modules' "Available in every <space>" box with "(not in Lobby)" (`public/admin.js` 1162, 1614), the space's Modules tab switches (`public/space-settings.js` 165 to 197), and templates (`server/templates.js` 383). Read in about 23 places through `isOnIn`; ten check cases in five tools set `allSpaces: false, spaces: [..]`.

## Decisions

Thomas, 2026-10-13.

1. **Every view is a layout.** Workspace, Map and Calendar are layouts, not a separate view system.
2. **System layouts:** Workspace always; Map while the Maps module is enabled; Calendar while the Calendar module is enabled. Map and Calendar are favorites from the start and have their own icon.
3. **Workspace is the default layout.** It can be renamed, not deleted.
4. **Every layout's icon can be changed,** from the app's set.
5. **Favorites are tabs on the left,** right after Workspace, in the Workspace tab's style; they leave the right zone. The Layout menu stays where it is and as it is otherwise.
6. **Panel Mode, Window Mode and the per-module Open as a window / Dock as a panel stay** (a map as a panel with other modules floating over it). The Layout menu's Show toggles, Full screen, Pop out and the grid size slider stay.
7. **Opens with stays as the default** ("something has to set the default layout").
8. **Manage > Modules Enabled stays;** a disabled module appears nowhere.
9. **"Available in every <space>" is killed** (`allSpaces`, `spaces`, both places it is set).
10. **The profile menu's environment Calendar and Map stay,** renamed Global Calendar and Global Map (being built separately now).
11. **When the top bar is too narrow, the favorites drop first,** before the phase chip ([plan-space-status-strip](plan-space-status-strip.md), decision 3).

## The contract

### The model (server-development)

- **A layout gains `kind`** (`system` or `user`) **and `icon`.** Stored user layouts have no `kind` and read as `user`; nothing in `layouts.json` is rewritten. `cleanLayout()` accepts `icon` (an id from the environment's icon list or one of the system icons below; 400 "Pick an icon from the list." otherwise).
- **System layouts are not stored; they are made per space** from what is on, and carry stable ids `workspace`, `calendar`, `map` (a user id is `l` and six characters, so they never collide):
  - `workspace`: always, `modules` empty; its content is what the space opens with (below).
  - `calendar`: while `calendar` is on in the space; `modules: [{ id: 'calendar', mode: 'dock' }]`, which the existing aliases read as `dest:calendar`, docked as the flexible column, filling the canvas.
  - `map`: while `maps` is on and `GET /api/destinations/map?space=<id>` answers (the map-file rule the composite already asks); `modules: [{ id: 'maps', mode: 'dock' }]`, read as `dest:map`.
  - **Simplest content is the composite filling the canvas,** not the parts arranged: one docked module, no new shape, and the hybrid (modules floating over the map) works because it is the canvas.
- **A person's own settings for a system layout** live in `layouts.json` beside their favorites: `"system": { "<user key>": { "workspace": { "name": "Desk", "icon": "couch" }, "map": { "tab": false } } }`. `name` (null or absent: the default word), `icon` (absent: the default), `tab` (absent: true; never false for `workspace`). `tidy()`, `forgetPerson()` and `forgetSpace()` clean it like favorites.
- **Routes:**
  - `GET /api/spaces/:id/layouts` adds `system: [{ id, kind: 'system', name, icon, tab, modules }]` in the order Workspace, Calendar, Map, and `kind: 'user'` and `icon` on each of `mine` and `shared`. A guest gets `system: []`.
  - `PATCH /api/spaces/:id/layouts/system/:systemId` `{ name?, icon?, tab? }` returns `200 { layout }`; 404 for an id that is not on in this space; 400 for `tab: false` on `workspace` ("The Workspace is always shown."), a bad name or icon; 403 for a guest.
  - The existing `PUT` and `DELETE .../layouts/:layoutId/favorite` also take `calendar` and `map` (they set `tab`), and refuse `workspace` the same way.
  - `DELETE`, `PUT` (replace) and Make default on a system id: 400 "<name> can't be deleted." or "can't be replaced."
- **The 3-favorite limit counts user layouts only.** System tabs are extra, so at most 6 tabs.

### The tabs (experience-design)

- **One group** in the top bar's left zone, right after the space switcher: group `views`, `groupOrder` 12, the ids `layout-tab-<layout id>` (`layout-tab-workspace` first). Order: Workspace, then Calendar and Map while their `tab` holds, then the person's favorites in the order favorited. Each tab is the look `view-workspace` has today: its icon and its name, `aria-current="page"` on the current one.
- **A press shows the layout:** Workspace restores the remembered canvas (as entering does); any other tab is `canvas.loadLayout()` of that layout. While a tab other than Workspace is current, the canvas remembers nothing (`__open` and the positions in `app.canvas` stay the Workspace's), so going back to Workspace brings it back as it was. A change made on another tab lasts until the next press; to keep it, the person saves it as a layout.
- **The current tab is remembered** for the visit only; entering a space opens on Workspace (or on the space's default, below, on a first visit).
- **The Layout menu** keeps its place, its Show toggles, modes, snap and the grid slider. Its Layouts section lists the system layouts first (with their icons), then shared, then your own. A system row's ⋮ holds Favorite or Unfavorite (not on Workspace), Rename and Change icon. A user row's ⋮ gains Change icon. The heart stays the mark of a favorite, which now means "a tab".
- **Fit, when the bar is tight,** in this order: favorite tabs drop to icon only, from the last; then favorite tabs leave the bar, from the last (still one click away in the Layout menu, with their hearts); then the phase chip's words (while it is still in the top bar); then Calendar and Map drop to icon only; Workspace keeps its name; then the bar folds as today. This replaces plan-favorite-layouts decision 13's shortening to about 6 characters. The `layout-favorites` group, its `fitFavorites`, the `fitRight` special case and the reversed button order leave the right zone. The left-out note (`#layout-favorites-note`, 6 seconds) moves under the tabs.
- **Keys:** Tab reaches the tabs in order; Enter or Space shows one.

### Opens with and the default layout, as one choice

- **Opens with sets what a first visit shows,** and is the Workspace's default content. In Set up's Opens with tab, one choice with two kinds: "Workspace, with" the ticked modules (today's `opensWith`), or a layout: a shared layout, Calendar or Map (today's `defaultLayout`, widened). A shared layout opens into the Workspace, as today; Calendar or Map open on that tab with Workspace behind it.
- **Stored keys stay:** `opensWith` and `defaultLayout`. `defaultLayout` also accepts `calendar` and `map` (`cleanLayoutId` in `server/store.js` already allows the shape; `updateSpace()` must accept the two ids while they are on). Moderators keep the right to set both (`MODERATOR_SPACE_FIELDS`).
- **Migration: none.** A space with `defaultLayout` still opens it on a first visit; a space with only `opensWith` still opens its list; the remembered `__open` still wins after a first visit; a `defaultLayout` naming Map while the map file is gone falls back to `opensWith`. Nothing is deleted.

### Icons

- **The set:** the environment's icon list (Manage > Theme, `getIcons()` in `public/brand.js`, the curated Font Awesome Free set) plus the Calendar and Map modules' own icons as the environment shows them (`displayIcon`, else `calendar-days` and `map-location-dot`). Defaults: Workspace `columns` (today's), Calendar and Map their module's, a user layout `object-group` (the Layout button's).
- **The picker:** "Change icon" in the row's ⋮ opens a small sheet with the icon grid admin's display-icon picker already draws (`.icon-grid`), and Save and Cancel in the shared action bar locked to the bottom (Thomas's rule for edit surfaces). Stored as above: a user layout's `icon` in the layout, a system one in the person's `system` record.

### Phones, guests and the aside

- **Phone (640 px and below):** no layout tabs, as there are no favorites today. The phone shows one module at a time; Calendar and Map reach it as the composites' module tabs, as they do now. The views' menu entries (`phone: 'menu'`) go with the view code.
- **Guest:** no tabs and no ⋮; the canvas opens with the space's default as today.
- **Aside:** no layouts (an aside is conferencing only); no tabs.

### Killing "Available in every <space>" (server-development, then experience-design)

- **The rule becomes:** an enabled module with the space scope is on in every space, and in the Lobby only when its manifest says `surfaces.canvas.lobby`. `onInSpace()` ignores `allSpaces` and `spaces`.
- **Migration:** nothing is deleted. `allSpaces` and `spaces` stay in `modules/registry.json` unread, so a rollback finds them. `PATCH /api/modules/:id` accepts and ignores both (200), so an old page or script does not fail. The view's `allSpaces` and `spaces` fields go. `lobbySync()` and `templates.js`'s `allSpaces: true` go.
- **What a person sees change:** a module enabled for a few spaces only, or for none, appears in every space. Its data per space is untouched.
- **Pages:** Manage > Modules loses the "Available in every <space>" box; "(not in Lobby)" moves beside Enabled. The space's Modules tab loses its on-here switches (module settings stay). Opens with's "off in this <space>" note goes.

## Left to build, in order

1. **First: the model and system layouts on the server** (server-development). `kind`, `icon`, the `system` list and record, the `PATCH` system route, `calendar`/`map` on the favorite routes, the refusals. New cases in `tools/check-layouts.mjs`. The bar and the views are untouched, so the app works as before.
2. **The tabs, and favorites leave the right zone** (experience-design). A pure `layoutTabs()` in `public/primary-nav.js` (the order, the guest and aside rules) beside `spaceViews()`; the tabs drawn from it in place of `drawViews()`'s tools; the press, the remembering rule, the fit order; `layout-favorites` and its fit out of the right zone; system rows and Favorite/Unfavorite in the Layout menu. `showView()` is no longer called from the bar but stays for one step. `check-nav` updated for the new ids.
3. **Retire the view code** (experience-design). Remove `#view-frame`, `showView()`, `drawViews()`, `markViews()`, `currentView`, `spaceViews()` and the views' `phone: 'menu'` entries, the `body.view-*` and `.view-frame` rules, `canvas.showFloating(false)` for views, the `view-frame` case in `brand.js`; `nav.setWorkspace` reads "not in an aside" only. `check-nav` (about 45 lines) and `check-external-calendars` pins rewritten, not loosened.
4. **Rename and Change icon** (experience-design). Rename on system rows, Change icon on every row, the picker sheet on the shared action bar.
5. **Opens with and the default layout as one choice** (server-development for `defaultLayout: 'calendar' | 'map'` in `updateSpace()` and `tools/check-canvas.mjs`/`check-layouts`; then experience-design for Set up's Opens with tab and `restore()`). Two builds.
6. **Kill "Available in every <space>"** (server-development for `server/` and the ten check cases; then experience-design for `admin.js`, `space-settings.js`, the Set up Modules tab). Independent of steps 1 to 5; can be built at any point.

No bundled module changes in any step, so no module version bumps; a builder who touches one bumps its patch version.

## Verify

- **A try builder checks:** `npm run check` (with `check-names`' two root cases known); step 1 and 5's server half with curl on a throwaway `DATA_DIR` (the system list appears and goes with the modules and the map file; rename and icon per person; `tab: false` refused on Workspace; a 4th user favorite still 409 with 2 system tabs on); steps 2 to 5 live in headless Chromium at 1600, 1000, 800 and 390 px as owner, moderator, member and guest: tabs in order, Workspace back as it was after Map, a floating module over a docked Map, the fit order, no tabs on a phone or for a guest; step 6 a module once restricted to one space now in every space, the Lobby still limited.
- **Only Thomas, on a real server with LiveKit:** switching tabs during a call keeps the conference in the column; Pop out and Full screen on the Map tab; a real map file; Firefox, Safari, a real phone and screen reader.

## Risks

- **The Workspace's memory.** `app.canvas` is written on every change; if a load on another tab writes it, Workspace comes back wrong. Step 2 must hold that rule and test it.
- **Stored layouts and favorites:** a favorite list may hold up to 3 user ids already; system tabs add to them, so no one loses a favorite. A user layout named "Map" stays separate from the system Map.
- **The composites:** the view frame handled links inside the page (`viewFrame` load handler) and the `view-frame` check in `brand.js`; the composite's frame must do the same before step 3 removes them.
- **check-nav pins** about 45 lines on views and the favorites' right-zone fit; steps 2 and 3 change them deliberately.
- **The top bar's fit:** up to 6 tabs plus the switcher and the chip at 1000 px; icon-only tabs need distinct icons, which defaults may not give two user layouts.
- **Killing availability** shows modules where an owner deliberately left them off; there is no per-space off any more.

## Assumed, for Thomas to confirm

1. **System layouts are made per space; name, icon and tab are each person's,** per space, like favorites. The alternative, a space-wide name set by the owner, would make "the user can rename it" an owner's right.
2. **System tabs do not count toward the 3 favorites;** Workspace cannot be unfavorited; Calendar and Map can.
3. **Map and Calendar's content is the composite filling the canvas** and is not editable; a person who wants a map with modules over it saves their own layout.
4. **Only Workspace remembers changes;** other tabs reload as saved on each press, and the tab with the current mark is not remembered across visits.
5. **"Proprietary icon" means the module's own icon** as the environment shows it, not a new drawn icon.
6. **The fit order** above, with Calendar and Map going to icons after the chip's words.
7. **Opens with may name Calendar or Map** as what a first visit opens.
8. **Change icon is a small sheet with Save,** not a flyout that saves on click.
9. **Killing availability makes restricted modules appear everywhere;** the stored lists are kept, unread.
10. **No reordering of tabs** in this plan.

## What is not decided

- Whether the plan-setup-panel `modules` tab, which planned per-space module switches, keeps anything but module settings (step 6 removes the switches it was to hold).
- Whether a shared layout can be made a tab for everyone in a space by an owner.
- Whether the left-out note should become something other than a 6-second line, given the strip and toast roles.
