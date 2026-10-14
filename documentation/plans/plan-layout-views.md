# Layout Views Plan: every view is a layout

**Audience:** Thomas, who decided the shape and confirms the assumptions; the try builders, one per step (server-development for steps 1, 5's server half and 6, experience-design for the rest); quality-assurance only when Thomas names a production build.

**Status:** built in steps 1 to 6, 2026-10-13. System layouts, the tabs after the space switcher, the view code retired, Rename and Change icon, one First visit choice, and the per-space availability switches removed (decision 9: the modules are now on in every space when they are on). Global Calendar and Global Map are in the profile menu. Phase 2 is not built.

**Status when drafted:** drafted 2026-10-13 by product-planner with Thomas away; Thomas answered most assumptions the same day (Decisions 12 to 18); nothing here is built. Each step is a try build (one builder, one pass, its own checks, a patch version bump for each module it changes, the app working after it). Thomas, 2026-10-13: "using layouts + favorites, we can already create these exact views, with less code. [...] if maps are enabled as a module type, we create a 'system' layout called 'Map' and pre-favorite it. If calendar is enabled [...] 'Calendar' [...]. These both get their proprietary icon. Instead of adding 'favorites' to the left of the layout menu, let's add them building from the left, right after the current 'Workspace' tab. They should match the style of the workspace one. AND let's make 'Workspace' a layout too... and it is our default one... but the user can rename it but not delete it. For each one, let the user change the icon used for it from our set. This means that ALL views are layouts and we have a complete, simple system. The layout menu stays where it is and as it is (other than the above changes)." This reverses the placement decided an hour earlier (favorites growing out from the Layout button on the right). It changes [plan-favorite-layouts](plan-favorite-layouts.md) (decisions 3, 9, 10 and 13, and "No current state") and [plan-one-bar](plan-one-bar.md) (decisions 1 and 6: the views become layouts).

## What it is today

- **Views** (plan-one-bar step 7, built): `spaceViews()` in `public/primary-nav.js` gives `view-workspace` then `dest-calendar` and `dest-map` (group `views`, `groupOrder` 12, `phone: 'menu'`); `drawViews()`, `markViews()` and `showView()` in `public/space.js` (1509 to 1620) put `/calendar?space=<id>` or `/map?space=<id>` in `#view-frame` (`public/space.html` 117) in the canvas's place, hide floating modules (`canvas.showFloating(false)`), and hide the Workspace's tools (`workspace: 'only'`, `nav.setWorkspace`, the `body.view-*` rules in `style.css`, 9799 on).
- **Composites** (plan-calendar-todo and plan-map-places step 3, built): `dest:calendar` and `dest:map` in `public/composites.js` are canvas modules whose body is the same page in a frame. A stored `calendar` or `todo` reads as `dest:calendar` while the Calendar is on; `maps` or `places` as `dest:map` while the space's Map answers (`ask`, the map-file rule in `server/destinations.js`). So the same content exists twice: once as a view, once as a module.
- **Saved layouts** (`server/layouts.js`, `layouts.json`): `{ id, name, by, at, modules, snap? }`, 10 own and 10 shared per space; `cleanLayout()` takes only `name`, `shared`, `modules`, `snap`, and a module id must match `^[a-z][a-z0-9-]{0,31}$`, so `dest:map` cannot be stored, but `maps` can and already reads as the composite. **Favorites**: per person per space, at most 3 today (`LAYOUT_LIMITS.favorites`; retired by decision 13 below), drawn as `#layout-favorites` in the top bar's right zone beside the Layout button (`modules-toggle`), names shortened by `labelsThatFit()` then dropped.
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
11. **When the top bar is too narrow, layout tabs go into the "..." overflow menu first** (decision 17), before the phase chip's words ([plan-space-status-strip](plan-space-status-strip.md), decision 3). Decided 2026-10-13: "they go into the above mentioned overflow first".
12. **Rename, icon and tab choices are each person's own, per space, like favorites.** Thomas: "agreed for phase 1. Add an issue to let the owner override and set themselves." The owner's override is Phase 2 (below). Reason: it keeps a person's names and icons theirs, and needs no owner setting in phase 1.
13. **There is no limit on favorites.** Thomas: "System tabs don't count toward the 3 favorites... remove this limit overall as it was part of a legacy system." The limit of 3 in [plan-favorite-layouts](plan-favorite-layouts.md) is retired, for user and system layouts alike. The server's limit (`LAYOUT_LIMITS.favorites` in `server/layouts.js`) and the check cases that pin it are removed in step 1. Workspace still cannot be unfavorited; Calendar and Map can.
14. **Tabs that do not fit overflow into a "..." menu.** It is a tab overflow menu on the shared menu (`host.menu.show`), listing the layouts that did not fit, each with its icon.
15. **Only the Workspace remembers changes.** Thomas: "Map and Calendar tabs always reload as saved. A person who wants a map with widgets floating over it saves their own layout." So Map and Calendar are the composite filling the canvas, not editable, and the tab with the current mark is not remembered across visits.
16. **Killing "Available in every <space>" makes restricted modules appear in every space.** Thomas: "I think this is fine in the service of simplification, agreed?" Agreed. A module restricted to some spaces is on in all of them; the stored lists are kept, unread. The Lobby ("not in Lobby" text) is covered by the same migration.
17. **Fit order when the bar is tight:** layout tabs, favorites and system ones alike, go into the "..." overflow menu first, one at a time from the right. After that the phase chip's words go, and then the bar folds as today. Calendar and Map do not shrink to icons.
18. **No reordering of tabs in this plan.** Thomas: "Agreed. Track for a phase 2." See Phase 2.

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
- **No favorite limit** (decision 13). `LAYOUT_LIMITS.favorites` and its 409 are removed; the favorite routes never refuse for count.

### The tabs (experience-design)

- **One group** in the top bar's left zone, right after the space switcher: group `views`, `groupOrder` 12, the ids `layout-tab-<layout id>` (`layout-tab-workspace` first). Order: Workspace, then Calendar and Map while their `tab` holds, then the person's favorites in the order favorited. Each tab is the look `view-workspace` has today: its icon and its name, `aria-current="page"` on the current one.
- **A press shows the layout:** Workspace restores the remembered canvas (as entering does); any other tab is `canvas.loadLayout()` of that layout. While a tab other than Workspace is current, the canvas remembers nothing (`__open` and the positions in `app.canvas` stay the Workspace's), so going back to Workspace brings it back as it was. A change made on another tab lasts until the next press; to keep it, the person saves it as a layout.
- **The current tab is remembered** for the visit only; entering a space opens on Workspace (or on the space's default, below, on a first visit).
- **The Layout menu** keeps its place, its Show toggles, modes, snap and the grid slider. Its Layouts section lists the system layouts first (with their icons), then shared, then your own. A system row's ⋮ holds Favorite or Unfavorite (not on Workspace), Rename and Change icon. A user row's ⋮ gains Change icon. The heart stays the mark of a favorite, which now means "a tab".
- **Fit, when the bar is tight,** in this order: layout tabs (favorites and system ones, in order from the right) go into a "..." button at the end of the tab group, which opens a tab overflow menu on `host.menu.show` listing the layouts that did not fit, each with its icon, and a press shows that layout; then the phase chip's words (while it is still in the top bar); then the bar folds as today. Workspace is the last tab to go. The "..." button shows only while at least one tab is out, and the layouts out are still in the Layout menu, with their hearts. This replaces plan-favorite-layouts decision 13's shortening to about 6 characters; tabs are never shortened and Calendar and Map never shrink to icons. The `layout-favorites` group, its `fitFavorites`, the `fitRight` special case and the reversed button order leave the right zone. The left-out note (`#layout-favorites-note`, 6 seconds) is no longer needed for dropped tabs, since the "..." menu lists them; whether it stays for anything is open.
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

1. **First: the model and system layouts on the server** (server-development). `kind`, `icon`, the `system` list and record, the `PATCH` system route, `calendar`/`map` on the favorite routes, the refusals. Remove the favorite limit: `LAYOUT_LIMITS.favorites` and its 409 in `server/layouts.js`, and the check cases that pin it. New cases in `tools/check-layouts.mjs`. The bar and the views are untouched, so the app works as before.
2. **The tabs, and favorites leave the right zone** (experience-design). A pure `layoutTabs()` in `public/primary-nav.js` (the order, the guest and aside rules) beside `spaceViews()`; the tabs drawn from it in place of `drawViews()`'s tools; the press, the remembering rule, the fit order (tabs into the "..." overflow menu first, then the chip's words), with the "..." button and its menu on `host.menu.show`, each row with its icon; `layout-favorites` and its fit out of the right zone; system rows and Favorite/Unfavorite in the Layout menu. `showView()` is no longer called from the bar but stays for one step. `check-nav` updated for the new ids.
3. **Retire the view code** (experience-design). Remove `#view-frame`, `showView()`, `drawViews()`, `markViews()`, `currentView`, `spaceViews()` and the views' `phone: 'menu'` entries, the `body.view-*` and `.view-frame` rules, `canvas.showFloating(false)` for views, the `view-frame` case in `brand.js`; `nav.setWorkspace` reads "not in an aside" only. `check-nav` (about 45 lines) and `check-external-calendars` pins rewritten, not loosened.
4. **Rename and Change icon** (experience-design). Rename on system rows, Change icon on every row, the picker sheet on the shared action bar.
5. **Opens with and the default layout as one choice** (server-development for `defaultLayout: 'calendar' | 'map'` in `updateSpace()` and `tools/check-canvas.mjs`/`check-layouts`; then experience-design for Set up's Opens with tab and `restore()`). Two builds.
6. **Kill "Available in every <space>"** (server-development for `server/` and the ten check cases; then experience-design for `admin.js`, `space-settings.js`, the Set up Modules tab). Independent of steps 1 to 5; can be built at any point.

No bundled module changes in any step, so no module version bumps; a builder who touches one bumps its patch version.

## Verify

- **A try builder checks:** `npm run check` (with `check-names`' two root cases known); step 1 and 5's server half with curl on a throwaway `DATA_DIR` (the system list appears and goes with the modules and the map file; rename and icon per person; `tab: false` refused on Workspace; a 4th and a 10th user favorite accepted, no 409); steps 2 to 5 live in headless Chromium at 1600, 1000, 800 and 390 px as owner, moderator, member and guest: tabs in order, Workspace back as it was after Map, Map and Calendar reloaded as saved on each press, the "..." menu taking tabs first from the right and listing them with icons, then the chip's words, no tabs on a phone or for a guest; step 6 a module once restricted to one space now in every space, the Lobby still limited.
- **Only Thomas, on a real server with LiveKit:** switching tabs during a call keeps the conference in the column; Pop out and Full screen on the Map tab; a real map file; Firefox, Safari, a real phone and screen reader.

## Risks

- **The Workspace's memory.** `app.canvas` is written on every change; if a load on another tab writes it, Workspace comes back wrong. Step 2 must hold that rule and test it.
- **Stored layouts and favorites:** a favorite list may hold up to 3 user ids already; system tabs add to them, and with the limit gone no one loses a favorite. A user layout named "Map" stays separate from the system Map.
- **The composites:** the view frame handled links inside the page (`viewFrame` load handler) and the `view-frame` check in `brand.js`; the composite's frame must do the same before step 3 removes them.
- **check-nav pins** about 45 lines on views and the favorites' right-zone fit; steps 2 and 3 change them deliberately.
- **The top bar's fit:** with no favorite limit, many tabs plus the switcher and the chip compete at 1000 px; the "..." menu takes the overflow, and its rows need distinct icons or names, which defaults may not give two user layouts.
- **Killing availability** shows modules where an owner deliberately left them off; there is no per-space off any more (decision 16, accepted).

## Phase 2

Both are later items, not part of this plan's steps.

- **Owner override of layout names, icons and tabs:** an owner or admin sets a space's layout names, icons and tabs for everyone, overriding the personal choice. drowbe/coffee-pub-collaborator#266.
- **Reordering the layout tabs in the top bar:** drowbe/coffee-pub-collaborator#267.

## Assumed, for Thomas to confirm

Items 1 to 4, 6, 9 and 10 of the earlier list are decided 2026-10-13 and are in Decisions 12 to 18 (the old items 2, 3 and 4 are decisions 13 and 15; item 6, the fit order, is decision 17). Still assumed:

1. **"Proprietary icon" means the module's own icon** as the environment shows it, not a new drawn icon.
2. **Opens with may name Calendar or Map** as what a first visit opens.
3. **Change icon is a small sheet with Save,** not a flyout that saves on click.

## What is not decided

- Whether the plan-setup-panel `modules` tab, which planned per-space module switches, keeps anything but module settings (step 6 removes the switches it was to hold).
- Whether a shared layout can be made a tab for everyone in a space by an owner (related to Phase 2, #266).
- Whether the left-out note should become something other than a 6-second line, given the strip and toast roles.
