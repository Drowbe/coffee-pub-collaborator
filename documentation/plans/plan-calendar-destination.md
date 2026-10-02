# Calendar Destination Plan

**Audience:** Thomas, who decides what the Calendar destination shows, how it behaves and where it sits, and the sessions that build it: server-development (the setting, the manifest field, the destination routes, the redirects, the checks) and experience-design (the destination page, the SDK changes, the bar's entry, Manage's row, and the Calendar and To-do modules).

**Status:** approved by Thomas, 2026-10-02; built 2026-10-02, steps 1 to 6, ahead of primary nav steps 4-9 (Calendar 1.19.0, To-do 1.12.0; `server/destinations.js`, `public/destination.html`, `tools/check-destinations.mjs`). Beyond the plan: a request for an action about an object in a space is checked in that space (`GET /api/bus/actions?ref=`), and modules are told the environment's name (`info.context.environment.name`). Left for a real browser and a real call: the drags between the parts, opening Calendar over a running call, a screen reader, Firefox, Safari and a real phone; and the open points in TODO. Drafted 2026-10-02; Thomas answered every question the same day (decisions 8 to 18), confirmed what Where lists (decision 19) and approved the plan. Phase 6 of [plan-primary-nav](plan-primary-nav.md) (decision 32), Calendar half only; Map is [plan-map-destination](plan-map-destination.md), which shares this plan's frame (the destination page, `surfaces.destination`, `/api/destinations`, `host.destination` and Manage's Top bar section). Thomas's direction, 2026-10-02: Calendar is "a combination of the Calendar and To-do modules, as a direct destination in the top bar (not a dropdown)". It "has its own specific design and never pops out or floats". It is an environment option, "Show Calendar", "since not every environment wants it". It "honours the module settings on Manage's Modules tab: if a module is off or the viewer lacks permission, that part doesn't show". His layout sketch:

```text
[ Primary Nav                                              ]
[ [ month | week | day ] [ trips ]                         ]
[ [ Calendar                       ] [ agenda | todo ]     ]
```

The sketch, as Thomas confirmed it (decision 8): the second row is a bar for this page only, with a Month, Week and Day switch and a filter named with the environment's space word in the plural ("Trips" in Travel, "Spaces" by default) that picks whose events and tasks show; below it, the calendar fills the main area, and a panel on the right switches between an Agenda (the Calendar's events as a list) and To-do (the To-do module's tasks).

## What it is today

- **The Calendar module** (`modules/calendar`, 1.18.2). One source page (`src/calendar.html`, `calendar.js`) for its environment page, a space's canvas and a popped-out window. Views: Month, Week, Month + list and List, through `host.ui.viewSwitch` (the module page's toolbar row, `#module-toolbar`); no Day view. A person setting, `defaultView`, picks which one it opens on. Events are `event:<id>`, `{ title, start, end, allDay, repeat, desc, remind, by, ... }`, kept per scope. On the environment page it holds the environment's own events, and shows every space's events read-only (`host.storage.list('event:', { scope: 'spaces' })`), each with its space's icon, with a row of filter buttons (`#filters`), not remembered. A new event made there always goes into the environment's own list. Planner twins (plan-plan-calendar-sync) are ordinary space events.
- **The To-do module** (`modules/todo`, 1.11.17). The same pattern: `task:<id>`, `{ title, notes, due, remind, done, links, rules, by }`; the environment page holds the environment's list and shows each space's list read-only, with its own filter row (`#spaces`). A new task goes into the environment's list.
- **Reading across spaces.** `GET /api/modules/:id/spaces-data` (`host.spaces()` and the `spaces` scope) answers the spaces the viewer belongs to where the module is on and the viewer holds its `read` permission, with `{ id, name, icon, svg }` each. It does not say whether the viewer may write there.
- **Writing into a space from an environment page is refused by the host, not the server.** `scopeOf()` in `public/module-host.js` refuses `space` unless the frame is mounted in a space, and `spaces` is read only. On the server, `moduleAccess()` already accepts `?scope=space&space=<id>` from anyone who is in that space, with the module on there and the permission (read as code only).
- **Home.** The Calendar's tile ("Coming up") and the To-do's tile ("Due soon") link their headings to `/modules/calendar` and `/modules/todo`; a day in the Calendar's tile opens `/modules/calendar#day=<date>` (`host.page.open`).
- **The top bar.** After step 2b of plan-primary-nav the middle zone is empty; module pages have no entry in the bar. A module page opened while present in a space opens as a view over it (`openOverlay()`), which marks you Away on the call.
- **Environment settings.** `store.settings` holds the environment's options (`clock`, `allowAsides`, ...); a template may give the ones listed in `SETTINGS` in `server/templates.js`. The Travel template turns on Calendar but not To-do.
- **The principle.** architecture-modules, "Objects": "If a change to Collaborator names a module, or a module lists other modules by name in its code, the design has slipped." Decision 32 names two modules; the contract below keeps the principle by having the modules declare their part.

## Decisions

Thomas, 2026-10-01 and 2026-10-02 (plan-primary-nav decisions 2, 7, 21 and 32, and his direction above).

1. **Calendar is a destination in the top bar**, shown directly, not in a menu. It combines the Calendar and To-do modules: dates and tasks across your spaces.
2. **It has its own design** and never pops out or becomes a floating module.
3. **It is an environment option, "Show Calendar"**, since not every environment wants it.
4. **It honours the Modules tab.** With a module off, or no permission for the viewer, its part does not show; with the Calendar off or unreadable, the destination does not show.
5. **The layout** is Thomas's sketch above.
6. **Views, from plan-primary-nav (option a).** Opened while present in a space, it slides over the space as a view, and you are Away while on the call; closing it brings you back. Present nowhere, it is a real page.
7. **On a phone** the top bar is the logo, the anchor or pill, the bell and the menu button (plan-primary-nav decision 7), so the destination's entry goes in the menu.

Thomas, 2026-10-02, answering the draft's questions.

8. **The sketch is read right**, and the environment's own calendar shows too, listed first in the filter.
9. **The modules supply parts** (`surfaces.destination`), on a host page that hosts them. It keeps the rule that Collaborator names no module, and lets a later module offer a part.
10. **The entry sits in the middle of the top bar**, with Map beside it. The middle zone has been empty since step 2b, so the entry stays put whatever the breadcrumb holds.
11. **The entry uses the Calendar module's display name and icon**, so a template's or an owner's name for the Calendar carries.
12. **Show Calendar is off by default and on for Travel**, set in a new **Top bar** section on Manage's environment tab.
13. **A new event or task always asks where it goes.** The editor makes you pick a space every time; there is no default. Moving an existing event or task to another space: not now.
14. **Phone:** three tabs, **Calendar | Agenda | To-do**, with the Day view first.
15. **Tasks are not drawn on the calendar grid** in this plan.
16. **While Calendar is shown, the old pages lead to it:** `/modules/calendar`, `/modules/todo` and the two tiles' headings go to `/calendar`.
17. **To-do on but Calendar off: no destination.** The Calendar is its main part.
18. **The view, the filter and the panel's tab are remembered per browser.**

Thomas, 2026-10-02, approving the plan.

19. **Where lists what the filter lists:** the environment's own calendar or list, for people allowed to edit there, then the spaces where the viewer may add. It matches the filter (decision 8), less what the viewer may not add to.

Thomas, 2026-10-02, after the build, on what the tiles on home open.

20. **The Calendar and To-do tiles open the Calendar destination.**
21. **The Polls tile goes into the space, for now.** Polls is not a part of Calendar and has no destination of its own.
22. **The Trips tile (the Planner's tile on home, `surfaces.widget` in `modules/travel/module.json`) is removed.** It was confusing, being really a rollup of the Planner. What replaces it is a rollup on each space's tile on home, chosen per space: a direction in [plan-dashboard](plan-dashboard.md), phase 5, not yet a contract.

## How it is put together

Decision 9. Two other ways were set aside: the Calendar's page showing tasks itself through pointers (a module cannot write another's data, so adding or ticking a task would wait on actions until the To-do is open somewhere), and a host page that names `calendar` and `todo` and frames their environment pages side by side (it breaks the rule that Collaborator names no module, and each page would bring its own header and filter row).

## The contract

### What a person sees

**The entry in the top bar.** An icon and a name, as the middle zone's core links look (`.core-link`): the Calendar module's display name and icon in this environment (`store.moduleDisplay`), so a template that renames the Calendar renames the entry (decision 11). In the middle zone, Map after it once built (decision 10). Shown only when the environment option is on, the Calendar is on, and the viewer may read it (see "Who sees it"). It is marked current while the destination is open. On a phone it is an entry in the menu, after the Spaces slot's entries.

**The page bar** (the second row, drawn by the host, registered in `nav-bar.js` as the secondary bar's tools, so it folds as the space bar does):

- Left: the view switch **Month | Week | Day**, the same look as `host.ui.viewSwitch` (tabs). The last choice is remembered in this browser (`localStorage`, decision 18); the first time it follows the Calendar's "Open on" setting (Week for Week, Month otherwise), and on a phone it is Day (decision 14).
- Then the filter, a button with the space word in the plural ("Trips ▾") and a caret, opening a menu of switches built with `switchListHtml()` from `public/switch-list.js`: first the environment's own calendar and list, by the environment's name (decision 8), then each space the viewer may read either part in, in the space list's order, each with its icon. A count shows when some are off ("Trips (3 of 5)"). Remembered in this browser (decision 18). Spaces added later show by default. With nothing ticked, the parts say "Pick at least one in <Trips>."
- Nothing on the right in this plan.

**The calendar** (the main area, the Calendar's `main` part). Its own header row: previous, **Today**, next, the period's title ("October 2026", "Oct 5 to 11, 2026", "Friday, October 2"), and **Add event** for anyone who may add events somewhere. Month and Week as today, each event with its space's icon (none for the environment's own). **Day** is new: one column of hours with an all-day row above, as one day of the Week view. Clicking a day selects it (the Agenda follows); clicking an event opens the Calendar's editor over the calendar. Tasks are not drawn on the grid (decision 15).

**The panel** (right, about a third of the width). A switch at its top, **Agenda | To-do**, remembered in this browser (decision 18). With the To-do off or unreadable there is no switch, just the Agenda.

- **Agenda** (the Calendar's `panel` part): the events of the shown period from the selected day onward, grouped by day, each with its time, title and space icon; "Nothing else this month." (or week, or day) at the end. Clicking one opens the same editor.
- **To-do** (the To-do's `panel` part): open tasks across the chosen spaces, grouped Overdue, Today, This week, Later and No date, each with its space icon, a tick box and its due date; the existing open or done choice; **Add task** at the top. Ticking and editing work in place.

**Making and changing things.** Full editing, by each space's own permissions, as in the visit view (plan-primary-nav decision 21). The event and task editors gain a **Where** choice at the top (decision 19), listing the environment's own calendar or list (for those who may edit the module at environment level), then the spaces where the viewer may add (the module's `edit` permission there, `write` in `spaces-data`). It always starts empty, reading "Pick a <space>", whatever the filter shows or was used last; **Save** says "Pick a <space> first." until one is picked (decision 13). An existing event or task cannot be moved to another space; for one, Where shows its place and cannot be changed (decision 13). An event or task in a space where the viewer may only read opens read only, saying "Only people who can add events in <space> can change this." Reminders are set in the event's or task's own space, as today.

**Dragging.** A task dragged onto a day sets its due date, and an event dragged onto the To-do makes a linked task, through the drop menu that already works between module frames in one window (`host.objects.dropMenu`, To-do's `setTaskDue` and `createTask`). Nothing new is built for it; it is checked live.

**Who sees it.** Signed-in people only; a guest has no entry and `/calendar` sends a guest home. The Calendar part needs the Calendar's `read` permission at environment level, as `GET /api/modules/nav` requires (a read in some space only is not enough, since the parts mount at environment scope); the To-do part likewise for the To-do. Inside, each space's events and tasks show only where the module is on in that space and the viewer may read it there (the `spaces-data` rule).

**Views (decision 6).** Present in a space, the entry opens `/calendar` as a view over the space (`data-overlay-link`, as module pages open now), Away while on the call, and once step 7 of plan-primary-nav lands, with the return pill and the history entry `/#view=/calendar`. Present nowhere, it goes to `/calendar`. An object opened from the destination that belongs to another module (a Planner object linked to an event) opens as plan-primary-nav's phase 4 says: a visit when present (from step 8), else that module's page. The destination's own events and tasks never leave the page to be edited.

**Phones** (640 px or less; decision 14). The page bar stays one row: the view switch and the filter (the filter shows its icon and caret only). Below it, the main area and the panel become three tabs at the bottom, **Calendar | Agenda | To-do** (no To-do tab when To-do is not shown), as the space's tab bar is on a phone; the view switch shows only on the Calendar tab. Day is the first view on a phone; once a view is picked, this browser remembers it. The tab is remembered too.

### The environment option (decision 3)

- **Stored:** `settings.showCalendar`, `true` or `false`, default `false` (decision 12), so nothing changes in an environment until an owner turns it on. `PATCH /api/settings` takes it from owners and the admin.
- **Where owners set it** (decision 12): Manage's environment tab, a new section **Top bar** with a switch **Show Calendar**, and **Show Map** below it ([plan-map-destination](plan-map-destination.md)). Its help line: "Adds Calendar to the top bar: events and tasks from every <space> in one place." When the Calendar is off on the Modules tab, the switch is shown off and disabled with "Turn on the Calendar on the Modules tab first."
- **Templates:** `showCalendar` joins `SETTINGS` in `server/templates.js` (a boolean), checked by `tools/check-templates.mjs`. `templates/travel.json` sets `"showCalendar": true` (decision 12); applied once when an environment is made from it, as template settings are.

### Server (server-development)

- **The manifest field.** `surfaces.destination`, checked in `cleanManifest` in `server/modules.js`: a list of up to two parts, each `{ "id": "calendar", "part": "main" | "panel", "entry": "<file>", "label"?: "<words>", "order"?: <number> }`. `id` must be a destination the host knows (`calendar` now; `map` later). `entry` must exist in the zip, like other surfaces. `label` is what the panel switch shows (manifest words, translated like other manifest text). A module may declare one `main` and one `panel` for a destination.
- **One main.** A destination has one `main`: the bundled module that declares it, else the first enabled one in id order. A destination with no readable `main` is not shown, whatever its panels (decision 17).
- **`GET /api/destinations`**, signed in: `{ destinations: [{ id: "calendar", name, icon, href: "/calendar" }] }`, each only when its option is on and its `main` is readable by the viewer at environment level. Guests get `[]`. The bar reads this.
- **`GET /api/destinations/:id`**: 404 when not shown for the viewer; else `{ id, name, icon, main: <part>, panels: [<part>, ...], spaces: [{ id, name, icon, svg }] }`. A part is what `mountModule()` needs (`module: { id, version, scope }`, `entry`, the run mode) plus `label`. `panels` keeps only enabled modules the viewer can read at environment level, in `order`. `spaces` is the union of the parts' `spaces-data` spaces, in the space list's order.
- **`GET /calendar`** serves `public/destination.html` to a signed-in person when it is shown for them; otherwise it redirects to `/`.
- **`spaces-data` says where you may write.** Each space in `GET /api/modules/:id/spaces-data` (with or without `info`) gains `write: true | false`, the module's `write` permission for the viewer there. An additive field; nothing that reads it today breaks.
- **Module pages lead to the destination** (decision 16). While Calendar is shown for the viewer, `/modules/<id>` with no `space` (an environment page, not a pop-out) for a module that is a part of it redirects to `/calendar`, keeping the hash (`#day=`, `#ref=`). `/modules/<id>?space=<id>` (a popped-out module) is unchanged. `GET /api/modules/widgets` gives each tile an `href`: the destination's address for such a module, else its page as now. With the option off, everything is as today.
- **Writing into a space from an environment page** needs no server change: `moduleAccess()` already checks scope `space` with an id. To be confirmed by the check below for data, schedules and notifications.

### SDK and the host (experience-design)

- **A space for an environment page's calls.** On a mount with environment scope, `host.storage.get`, `set`, `delete` and `list` take `{ space: <id> }`, as do `host.schedule`, `host.notify` (`to: 'space'` then means that space) and `host.objects.make` (already) and `setLinks`. `scopeOf()` in `public/module-host.js` passes `scope=space&space=<id>`; the server decides. A mount in a space keeps refusing another space. Documented in the SDK reference by content-manager.
- **`host.destination`**, present only on a destination's parts:
  - `info.context.destination`: `{ id, part }` in `host.ready()`'s answer, so a module can draw itself for the part (no own header or filter row).
  - `host.destination.onState(fn)`: the host's state, sent on mount and on each change: `{ view: "month" | "week" | "day", spaces: [<id>...], environment: true | false, day: "YYYY-MM-DD", from, to }`, where `spaces` and `environment` are the filter's choice, and `day`, `from` and `to` are the selected day and the shown period.
  - `host.destination.set({ day, from, to })`: in the `calendar` destination only the `main` part may call it; the host passes it on to every part. (The `map` destination lets both parts set `selected`; plan-map-destination.) Each destination's state is its own shape.
- **The page** (`public/destination.html`, `destination.js`, its styles), built once for both destinations: the top bar (`renderTopbar()`), the page bar, the main area and the panel, each part mounted with `mountModule({ scope: 'environment', ... })`, sharing one module stream. The filter's choice and the view are the host's; the parts only draw. Whichever destination is built first builds the frame; the second adds only its own.
- **The bar's entry** (`public/brand.js`): a middle zone tool per entry of `GET /api/destinations`, `id` `dest-<id>`, an `href`, and `data-overlay-link` while present in a space. Folded into the phone menu by `phoneZones()` as other middle zone tools are. `tools/check-nav.mjs` learns the slot.
- **Manage** (`public/admin.html` and its script): the Top bar section and the Show Calendar switch (Show Map joins it from plan-map-destination).
- **Home**: `public/dashboard.js` uses each tile's `href` from the route, and `onOpenPage` goes to `/calendar#<hash>` for a part.

### The modules (experience-design)

- **Calendar 1.19.0.** `surfaces.destination`: `main` (the calendar) and `panel` labelled "Agenda", both from the existing source page, drawn by `info.context.destination.part`. The Day view, for the destination and as a fourth view on its other surfaces (and in "Open on"). Events across spaces become editable where `write` is true, with the Where choice that always asks. Reminders scheduled in the event's own space. The old filter row is not drawn as a part. Its own environment page, canvas and pop-out work as before.
- **To-do 1.12.0.** `surfaces.destination`: `panel` labelled "To-do". The grouped list, the tick box and Where, which always asks; tasks across spaces editable where `write` is true. Its own pages as before.
- Both versions in `tools/module-versions.json` (`tools/check-module-versions.mjs` holds the fingerprint). Adding a surface asks the admin for nothing new, so a bundled update applies on start.

## Left to build, in order

1. **Server** (server-development): `settings.showCalendar` with `PATCH /api/settings` and the template field, and `showCalendar: true` in `templates/travel.json`; `surfaces.destination` in `cleanManifest`; `GET /api/destinations` and `GET /api/destinations/:id`; `GET /calendar`; `write` in `spaces-data`; the module page redirect and the tiles' `href`. A new check, `tools/check-destinations.mjs`, added to `npm run check`.
2. **SDK** (experience-design): `{ space }` for an environment page's storage, schedule, notify and links calls; `host.destination` and `info.context.destination`. Cases in an existing SDK or host check.
3. **The modules** (experience-design): Calendar 1.19.0 and To-do 1.12.0 as above. Their pages still work alone, so this step can be checked before the destination page exists.
4. **The destination page** (experience-design): `destination.html` and `.js`, the page bar, the filter, the panel switch, mounting the parts, the phone tabs.
5. **The bar's entry, Manage's switch and home's links** (experience-design).
6. **Documentation** (content-manager): a section in architecture-navigation and architecture-modules (destinations, `surfaces.destination`), the SDK reference (`{ space }`, `host.destination`), api-modules (the routes, `write`), the modules and admin user guides, the CHANGELOG with a note for module authors, and plan-primary-nav's phase 6 status.

## Verify

- **Step 1.** Checked by `tools/check-destinations.mjs` (shared with Map): a manifest with a good and a bad `surfaces.destination` (unknown id, two mains, a missing entry); `GET /api/destinations` empty with the option off, with the Calendar off, for a member with no environment-level read, and for a guest, and listing Calendar otherwise; `GET /api/destinations/calendar` without To-do when it is off or unreadable; `spaces-data`'s `write` for a member and a guest-like role; an environment-scope write with `scope=space` accepted for a member of that space with `edit`, refused for a non-member and for a member without `edit`; the redirect from `/modules/calendar` and `/modules/todo`, none from `/modules/calendar?space=`, and none with the option off; the tiles' `href`; Travel's template giving `showCalendar: true`; a single install with nothing set behaving as before. Live with curl on a throwaway `DATA_DIR`.
- **Step 2.** Checked by a tool: `scopeOf()` passing a space for an environment mount and refusing it for a space mount; the state sent to every part and `set` taken only from `main`.
- **Step 3.** Live in headless Chromium on the modules' own pages: the Day view; Where listing only writable spaces, starting empty every time (also after a save, and with one space in the filter) and Save refused until one is picked; an event and a task made in a space from the environment page, seen on that space's canvas; a read-only one saying why; a reminder for a space event reaching a member of that space. `check-module-versions` for both bumps.
- **Step 4.** Live in headless Chromium at 1280, 1024 and 390 px, as a member of two spaces, an owner, and a member who can read the To-do only in a space: the layout; the view switch and the filter driving every part and remembered on reload; the Agenda following the selected day; the To-do tab missing when To-do is off; no entry when only To-do is on; the phone tabs, opening on Day, and the tab remembered. A drag of a task onto a day and of an event onto the To-do.
- **Step 5.** `tools/check-nav.mjs`: the entry's slot, its absence when not shown, its place in the phone menu. Live in headless Chromium: Manage's switch on and off, with the Calendar off; the tiles' headings going to `/calendar`; the entry opening over a space as a view with the faked LiveKit, setting `away` on the call and not off it.
- **Needs a real call:** opening Calendar over a running call, hearing muted and the microphone and camera held off, and everything restored on closing. Not checked here: a screen reader, Firefox, Safari, a real phone.

## What is not decided

Nothing Thomas was asked: decisions 8 to 19 answer every question of the draft. Later, by decision: moving an event or task to another space (13), and tasks on the grid (15). Map is its own plan.

Settled after decisions 20 to 22. The first point follows Thomas's words; the rest are the project manager's calls (2026-10-02), not Thomas's decisions, and he can overrule them:

- **What "open the Calendar destination" covers.** A click on an event or task in the Calendar or To-do tile opens the destination on it (`/calendar#ref=<ref>`), as well as the headings (decision 16). With Show Calendar off, both tiles keep today's behaviour: the headings go to the module pages, and a click on an event or task enters its space (project manager's call).
- **The Polls tile.** A click on a poll goes into its space, as it does now (decision 21). The heading keeps going to `/modules/polls` (project manager's call).
- **Removing the Trips tile.** experience-design removes it now by dropping `surfaces.widget` from `modules/travel/module.json`, with a version bump. The Planner's `widget.html` stays unused until [plan-dashboard](plan-dashboard.md) phase 5 decides whether the space tile's rollup reuses it (project manager's call).
