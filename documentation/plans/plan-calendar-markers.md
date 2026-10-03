# Calendar Markers Plan

**Audience:** Thomas, who decides which objects show on the Calendar as markers and when they leave it, and the sessions that build it: server-development (the manifest field, the route, the checks) and experience-design (the To-do, Polls and Calendar modules).

**Status:** approved by Thomas, 2026-10-03, with every open question of the draft answered as recommended (decisions 1 to 4); built 2026-10-03, steps 1 to 4 (Calendar 1.22.1, To-do 1.13.0, Polls 1.13.0; the route and stream event in `server/index.js`, `marker` in `cleanRefs` in `server/modules.js`, numbers in `readDated()` in `server/ics.js`, `host.objects.markers` in `public/sdk/host.js` and `public/module-host.js`, the filter in `public/destination.js`, `tools/check-markers.mjs`). Where the build differs from the contract below: `marker` is refused with `"feed"` as well as `"mirror"`; Polls maps its summary's `done` to `closed`, because closing a poll by hand keeps `closesAt` and sets `closed` (reopening clears `closesAt`), so a poll closed by hand has no marker by its `done` field; a poll's marker reads "Closes 6:00 PM: <question>", with the time; the stream event names the modules to tell (`{ modules }`) and no object data; each marker also carries `due`, `module.color` and `module.svg`, and the switch's words come from `due` ("Tasks due", "Polls closing"); in a space the switches are under a **Show** button in the Calendar's toolbar, remembered per space in this browser, while the environment page's filter row is not remembered; and the Calendar works out past itself, in the viewer's time. Checked by `check-markers`, new cases in `check-modules` and `check-module-host`, and walked by quality-assurance in headless Chromium (month, week, day and agenda; a space popout, `/calendar` and the environment page; phone width; a guest), with QA's fixes (Calendar 1.22.1) checked again in a browser. For GitHub #167, "Calendar: show poll closing times and to-dos with a due time as markers". Thomas put it in Now beside #179 ([plan-space-calendars](plan-space-calendars.md)); the two share no code and can be built in either order. From the issue: show time-bound objects from other modules on the Calendar grid, starting with a poll's closing time and a to-do's due date, "as markers that link back to the poll or to-do, not as editable Calendar events, so the Calendar doesn't fill up with copies."

## What it is today

- **Twins, not markers.** A kind marked `"dated"` and `"mirror": "out"` (the Planner's `plan`) gets a real `event` in the same space, kept in step by the server ([plan-plan-calendar-sync](plan-plan-calendar-sync.md), `server/object-sync.js`). `"dated"` is read by `cleanDated()` in `server/modules.js` and `readDated()` in `server/ics.js`; its instant form accepts only a date or date-time string.
- **To-do** (`modules/todo`, 1.12.3), kind `task`, `task:<id>`: `due` is a day (`YYYY-MM-DD`) with no time, and `done`. Its summary declares `"when": "due"` and `"done": "done"`. A reminder fires at 9:00 on the due day. There is no due time to show.
- **Polls** (`modules/polls`, 1.12.21), kind `poll`, `poll:<id>`: `closesAt` is a number of milliseconds, or null; `closed` is true once closed. Closing by hand clears `closesAt`. Its summary declares `"when": "closesAt"`.
- **The Calendar** (1.21.0) consumes `"*"`, approved by the admin, so it may already point at and summarise both kinds. It draws only its own events, Planner twins (which are its own events) and, on environment mounts, the person's other calendars.
- **The destination** shows the To-do's tasks in its panel and, by [plan-calendar-destination](plan-calendar-destination.md) decision 15, not on the grid.

## Decisions

Thomas, 2026-10-03, approving the plan (the draft's questions 1 to 4, each as recommended):

1. **A marker kind:** `"marker": true` beside `"dated"`, separate from `mirror` twins, reusing the Calendar's approved `consumes`. Reason: markers link back to their object and make no copies, and no new approval is needed.
2. **Done tasks leave the grid; a poll stays after its closing time, dimmed; a poll closed by hand has no marker.** Reason: a finished task is noise, and a poll's closing is a moment worth keeping.
3. **Tasks show on the destination's grid as well as in its To-do panel,** with a "Tasks due" filter switch to hide them. This changes [plan-calendar-destination](plan-calendar-destination.md) decision 15. Reason: the panel says what, the grid says when.
4. **A task with a due day and no time is a day marker in the all-day row.** To-do stores only a day; a due time would be a To-do change of its own.

## The contract

Written for the decisions above.

### What a person sees

- A **marker** is a small chip with its module's icon and the object's title: "Closes: Where for dinner?" for a poll, the task's title for a to-do. To-do markers sit in the all-day row (Week, Day) or the day (Month, Agenda); a poll's at its closing time. A marker is never dragged, resized or edited in the Calendar. Clicking it opens the object in its own module (`host.objects.open`), as a backlink does.
- A **done** task's marker is gone. A poll's marker stays after its closing time, dimmed, reading "Closed: <question>"; a poll closed by hand has no closing time and so no marker.
- Each marker kind has a switch in the Calendar's filter (the destination's filter, and the Calendar's own filter row on an environment page), named by the kind ("Tasks due", "Polls closing"), on by default, remembered as the filter is. In a space, the same two switches sit in the Calendar's toolbar menu.
- Markers show where their object does: in a space, that space's; on an environment page and the destination, the environment's own and each space's the viewer reads, by the filter. Nobody sees a marker for an object they could not open.
- Markers are not events: not in the Agenda's event count, not in any address out (`/feed/<token>.ics`), and not in reminders (their modules keep their own).

### Server (server-development)

- **The manifest:** `"marker": true` on a kind in `refs.produces[]`, accepted only with `"dated"` (`module.json: refs "<kind>" marker needs "dated"`) and never with `"mirror"`. `"dated"`'s instant form accepts a number of milliseconds for `start`, so Polls needs no data change. A kind's `summary.done` field, when true, keeps the object off the grid.
- **`GET /api/modules/:id/markers?from=&to=`** (and `&scope=space&space=` as other module routes), for a module whose `refs.consumes` the admin approved for that kind, as `consumerMayLink` decides; no new hook. Answers `{ markers: [{ ref, kind, title, start, allDay, past, module: { id, name, icon } }] }`: objects of every enabled kind marked `"marker": true` in the scopes the mount reads (the space; or the environment and its readable spaces, the `spaces-data` rule), with the viewer's `read` permission in each, between `from` and `to` (at most 92 days apart), done ones left out, at most 500. A guest reads only their space's.
- **A `markers` event** on the shared stream when an object of a marker kind is written or deleted in a scope the listener reads, carrying no data; the Calendar asks again.

### The modules (experience-design)

- **To-do, next minor:** on `task`, `"dated": { "title": "title", "day": "due" }` and `"marker": true`.
- **Polls, next minor:** on `poll`, `"dated": { "title": "question", "start": "closesAt" }` and `"marker": true`.
- **Calendar, next minor:** `host.objects.markers({ from, to })` (SDK, experience-design) and `host.on('markers', fn)`; drawing, the filter switches, opening on click. All three in `tools/module-versions.json`.

## Left to build, in order

1. **Server** (server-development): `"marker"` and numbers in `"dated"` in `cleanManifest`; the route; the stream event. Cases in a new `tools/check-markers.mjs` with a test module declared inside the check.
2. **To-do and Polls manifests** (experience-design), with their version bumps.
3. **SDK and Calendar** (experience-design): `host.objects.markers`, drawing, the filter, opening.
4. **Documentation** (content-manager): api-modules (`marker`, the route), api-module-sdk, architecture-modules, userguide-calendar, the CHANGELOG, and a note in plan-calendar-destination that decision 15 is changed by this plan (decision 3).

## Verify

- **Step 1**, by `tools/check-markers.mjs`: a `"marker"` without `"dated"`, and with `"mirror"`, refused; a number `start` read; a done object left out; a member of space A sees A's markers and not B's; a guest only their space's; a consumer without approval refused; `from` and `to` more than 92 days apart refused; no twin made and nothing written to the Calendar's store.
- **Steps 2 and 3**, in headless Chromium: a task due Friday as an all-day marker that leaves when ticked done; a poll closing at 18:00 as a timed marker, dimmed after; a click opening each in its module; the filter switches hiding them and remembered on reload; `check-module-versions` for the three bumps. No real Google account or LiveKit call is needed.

## What is not decided

Nothing Thomas was asked: decisions 1 to 4 answer every question of the draft. Markers in an address out are left out by this plan; adding them would be a later choice.
