# Calendar and To-do Plan: one Calendar, with tasks, at every level

**Audience:** Thomas, who decided that the space-level Calendar and To-do become one thing and confirms the assumptions below; the try builders (server-development for step 1, experience-design for steps 2 to 4); content-manager when a production build lands it.

**Status:** partly built, 2026-10-13. Steps 1 to 3 built (the destination at space scope, the parts in a space, one Calendar on the Workspace). Step 4, the entries, came as the Calendar layout tab ([plan-layout-views](plan-layout-views.md)) and **Global Calendar** in the profile menu. Since then: phases show as fills on the Calendar, and the Day view keeps its phase bar in sight.

**Status when drafted:** drafted 2026-10-13 by product-planner from Thomas's decisions, with Thomas away; nothing approved as built. Thomas's direction: the space-level Calendar and To-do modules are replaced by one combined module, based on the top bar's Calendar experience (`public/destination.js`): events and tasks together, tasks dragged onto days, the space and kind filters, markers, the agenda. It works at the environment level (an aggregate of every space's data with a toggle per space, as today) and inside a space (that space's data). Repeating events must keep working. Nothing stored or linked may break: keep stored keys and object kinds, add a migration only if unavoidable; keep the feeds, the published calendar, the plan-to-calendar sync (#96) and the module bus actions. The environment Calendar is parked in the profile menu for now. This plan fills the Calendar view of [plan-one-bar](plan-one-bar.md).

## What exists today

- **The Calendar destination** (`/calendar`, [plan-calendar-destination](plan-calendar-destination.md), built): `public/destination.html`, `destination.js` and `destination.css` draw the page bar (Month | Week | Day, the space filter with the environment's own list, other calendars and marker kinds) and mount the parts `GET /api/destinations/calendar` names (`server/destinations.js`): the Calendar's `main` and `panel` (Agenda) and the To-do's `panel`, each `mountModule({ scope: 'environment', destination: { hub, part } })` sharing one state (`createDestination()` in `public/module-host.js`; `host.destination.onState` and `set`). Environment scope only: `GET /api/destinations/:id` takes no space, and `destination.js` reads `/api/me` and the environment's spaces. Tasks drag onto days through `host.objects.dropMenu` and To-do's `setTaskDue`; markers (tasks due, polls closing) are [plan-calendar-markers](plan-calendar-markers.md), already drawn on the grid everywhere the Calendar runs, a space's canvas included.
- **The Calendar module** (`modules/calendar`, 1.24.2): `event:<id>` with `repeat: { every, until }` expanded by `occurrences()` in `calendar-lib.js`; kind `event` (`feed`, `dated`, `mirror: "in"`); the `schedule`, `notify` and `external` hooks; actions `createEvent` and `addEvent` (`/c`); `part` from `info.context.destination` (`calendar.js` 30). Its canvas surface in a space shows that space's events and markers.
- **The To-do module** (`modules/todo`, 1.15.2): `task:<id>`; kind `task` (`dated`, `marker`); actions `createTask`, `linkTask`, `setTaskDue` and the local `addTask` (`/t`); the destination's `panel` part (`todo.js` 31). Its canvas surface in a space shows that space's list.
- **Feeds and sync** read the manifests, never a module's name: `/feed/<token>.ics` for the three kinds of address (`findFeed()`, `server/ics.js`), twins between `plan` and `event` (`server/object-sync.js`). Neither cares which page draws an event.
- **Where the two show in a space:** the Layout panel's Show list (`update()` in `public/canvas.js`), `opensWith` lists, saved layouts by module id (`public/layouts.js`), the pop-out page `/modules/<id>?space=<id>`, and home's tiles (`href` from `GET /api/modules/widgets`).

## Decisions

Thomas, 2026-10-13, as the status says: one combined Calendar from the destination's experience; at the environment level the aggregate with a toggle per space, in a space that space's data; repeats kept; keys, kinds, feeds, sync and bus actions kept; the environment Calendar in the profile menu.

## How it is put together

The combined Calendar is **the destination frame, allowed at space scope too**, drawn as a view and as a module on the Workspace. The Calendar and To-do modules keep their ids, their data and their declared parts; the person sees one Calendar. This is the only way to make one thing of the two without moving `task:` keys under another module id, which would break every pointer `{ module: 'todo', kind: 'task' }` held by the Planner and the links store, the `ref:todo:task` actions, the marker kind and `/t`. A true single module stays possible later, with a server-side alias for the old pointers; nothing here blocks it.

- **The module id `calendar` is kept.** It is the destination's `main`, the entry's name and icon, the feed's module and the setting's home.
- **The module id `todo` is kept,** as the owner of tasks, with its canvas and page surfaces no longer offered in a space where the Calendar is on. A saved layout or `opensWith` list naming `todo` opens the combined Calendar in its place (no note); a space where the Calendar is off keeps the To-do's own canvas as today, so nobody loses their list. Its per-space on or off, its permissions and its settings keep their keys and still decide whether tasks show.

## Steps

Each is one try build and leaves the app working. **Step 1 goes first.** [plan-map-places](plan-map-places.md) step 1 builds on this step's frame; whichever is built first builds the shared part.

1. **The destination at space scope** (server-development; first). `GET /api/destinations/:id?space=<id>`: the parts whose module is on in that space and readable by the viewer there (a guest with a token included), `spaces` empty, 404 for a space the viewer is not in; `GET /calendar?space=<id>` serves `destination.html` on the same rule. `destination.js` mounts each part with `scope: 'space'` and the space's id (`mountModule` already takes it), draws no space filter, no Mine and no other calendars in a space (the rule of [plan-google-calendar](plan-google-calendar.md) stands), keeps the view switch and the marker kinds, and remembers its choices under `app.destination.calendar.<space id>`. `GET /api/destinations/:id` without a space is unchanged. Cases in `tools/check-destinations.mjs`. New addresses only; nothing links to them yet.
2. **The parts in a space** (experience-design): Calendar 1.25.0 and To-do 1.16.0 take a destination context with a space: **Where** is not asked (it is this space), reminders go to this space, markers are asked for this space, a dropped task sets its day through the existing drop menu, `#ref=` opens the object. Nothing else in either module changes; their own pages and canvas surfaces still work. `tools/module-versions.json`.
3. **One Calendar on the Workspace** (experience-design; the riskiest step): `public/canvas.js` learns a composite, `dest:calendar`: one column or floating box holding the destination hub and the parts at space scope (the main part fills it, the Agenda or To-do as a panel the module's header switches, the view switch in the module's toolbar), opened and closed as a module is (`openBuiltin`-like, id `dest:calendar`, the Calendar's display name and icon). The Show list offers it in place of `calendar` and `todo` while the Calendar is on in the space; `restore()`, `whatOpens()` (`public/opens-with.js`), `layoutOf()` and `placeLayout()` (`public/layouts.js`) read `calendar` and `todo` in a stored list as `dest:calendar` and never write the two ids again, so nothing stored is rewritten. `/modules/calendar?space=<id>` and `/modules/todo?space=<id>` (the pop-outs) redirect to `/calendar?space=<id>`. The `/t` command: `addTask` is `local`, so it needs an open To-do page; if the composite's panel does not count as one, `t` is pointed at `createTask` in `modules/todo/module.json` (`commands[].action`), checked by `tools/check-one-input.mjs`. `check-canvas` and `check-layouts` hold the mapping.
4. **The entries** (experience-design): in a space, [plan-one-bar](plan-one-bar.md)'s Calendar view opens `/calendar?space=<id>` over the Workspace; outside a space the top bar's `dest-calendar` goes and **Calendar** joins `profileEntries()` in `public/primary-nav.js` (opening `/calendar`, the aggregate, as today, with its toggle per space); home's tiles keep their `href`. `tools/check-nav.mjs` holds the entry.

## Verify

- **Step 1** by `tools/check-destinations.mjs` on a throwaway server: a space's answer lists only parts on and readable there, 404 for a non-member and for an aside, the page served with `?space=` and redirecting without one for a guest token, the environment answer unchanged. Live with curl.
- **Step 2** live in headless Chromium on `/calendar?space=<id>`: Month, Week and Day; a repeating event (weekly with an end date) on every occurrence it should have and none after; a task ticked in the panel; a task dragged onto a day; a marker; `#ref=` opening an event; the same space's canvas Calendar showing the same events. `check-module-versions`.
- **Step 3** live on the Workspace at 1280 px: the composite docked and floating, in a saved layout that named `todo`, opened from an `opensWith` list that named `calendar`; `/t` from Chat with and without the composite open. `check-canvas`, `check-layouts`, `check-one-input`.
- **Step 4** by `check-nav` and live: the profile menu's entry, the tiles, the view in a space.
- **By tools throughout:** `tools/check-feed.mjs`, `check-links.mjs` and `check-markers.mjs` must stay green, which is what "nothing stored or linked breaks" means here.
- **Only Thomas:** a real Google subscription still receiving the space's events after the change; a drag with a real mouse on a real phone; Firefox, Safari, a screen reader.

## Assumed, for Thomas to confirm

- **One thing seen, two modules behind it** (above), rather than a merge of `task:` into the Calendar's store. The merge would need a data migration and a pointer alias; this keeps every key and kind as it is.
- **The To-do's own canvas is hidden only where the Calendar is on.** A space with To-do and no Calendar keeps today's list.
- **The composite on the Workspace is a column like any module** (dock and float), since the sketch shows the Workspace holding the combined modules beside the Planner. A view-only Calendar (step 1 and 4 alone, no step 3) would be smaller to build; step 3 can be skipped if Thomas prefers that.
- **No space filter in a space,** and the environment's own events are not shown there either; they stay in the aggregate.
- **`showCalendar`** keeps governing the aggregate (now the profile menu's entry); the space's view shows whenever the Calendar is on in the space.

## Risks

- **Step 3 touches `canvas.js`, `layouts.js` and `opens-with.js`,** the same files [plan-one-bar](plan-one-bar.md) step 6 changes; build the two in sequence, not at once.
- **A composite is new to the canvas:** the docked limit, snap, pop-out (the parts reopen in the new window) and the module's action bar all meet it for the first time.
- **The local `addTask`** behind `/t` may stop working while nothing but the composite is open; step 3 names the fix.
- **The two stale checks** (`check-module-window`, `check-module-host`) fail before this work starts; a builder must say which they ran.
