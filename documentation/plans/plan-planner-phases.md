# Planner Phases Plan

**Audience:** Thomas, who decided how a plan starts and moves through its phases, and the sessions that build it: server-development (the template fields, the module context, the checks) and experience-design (the Planner, the host template editor, what opens on entering).

**Status:** approved by Thomas, September 26, 2026. Steps 1 to 5 **built** (2026-09-26, pull requests #105 to #109); step 6, what opens on entering, **built** (pull request #111). Every step is built. The Planner is **0.10.0**: this plan's 0.8.0 is stale (0.8.0 and 0.9.0 went to the linked-objects and calendar-sync work), steps 1 to 4 did not bump the module, and step 5 took it to 0.10.0. The Travel template is version 2. Documented in [userguide-planner](../userguides/userguide-planner.md), [userguide-templates](../userguides/userguide-templates.md), [api-module-sdk](../api/api-module-sdk.md), [api-modules](../api/api-modules.md) and [architecture-environments](../architecture/architecture-environments.md). Verified: the full `npm run check` passed on the Mac; step 3's host editor and step 5's page were seen live in a dev browser (per the pull requests). Step 6 is checked by `tools/check-template-switch.mjs` (`tools/check-travel.mjs` also passes, though it does not test what opens), and the answer of `GET /api/modules/for-space` (`opensWith`, `spaceDefaultsOpensWith`) was verified live with curl. The home widget's phase line was seen live on 2026-09-30 ("Booking · 10 days to go", with the trip's dates written through the API rather than the Planner page). Not checked: what the canvas opens on entering and that no call is joined, which needs LiveKit, and a real call. From GitHub issue #95. Thomas's layout: "[Planning start][book][planning ends][buffer][pre-trip][trip start][trip active][trip ends][post-trip]".

## What it is today

- The Planner is the `travel` module (0.7.44). A space's plan is one stored value, `trip:main` (`title`, `destination`, `start`, `end`, `notes`, `currency`, `by`; `cleanTrip`, `modules/travel/src/travel-lib.js`), and each object is `plan:<id>` (`travel-lib-plan.js`). With no `trip:main` the page shows "No trip yet" and a create button (`#state-empty-trip`). The days are `start` to `end` (`tripDays`).
- `coverTrip()` (#75) grows `start` and `end` to cover any dated object, never shrinking.
- The four fixed markers (`planning-start`, `planning-end`, `trip-start`, `trip-end`) are a Planner setting; the trip markers follow the first and last booked object.
- Templates (`server/templates.js`, `templates/travel.json`) have no phases. `spaceDefaults` takes only `profile`. The module context (`GET /api/modules/:id/context`) has no space name, created date or template data.
- A first visit to a space opens the conference (`public/room-modules.js:972`). [plan-entering](plan-entering.md) (#3, not built) adds a space's `opensWith` and makes "chat and every module, without the call" the product default.

## Decisions

1. **Every space has exactly one plan from the start**, named after the space, with no "create a plan" step. People can rename it and set dates.
2. **No dates are required.** Planning starts on the day the space was created. Objects with no date go into a list for objects with no day. Days appear once the trip has a start date, or once any object has a date.
3. **Phases come from the template**: an ordered list, each with an id and a label. Every date is optional. The Planner shows the current phase, and new objects go into it. A space with no template, or a template with no phases, still works.
4. **Existing plans** keep their dates as the trip's start and end. Planning starts on the space's created date. A storage migration and a version bump carry this.
5. **#75's automatic growing** applies only to the trip's own dates, and only once they are set.
6. **The template sets what opens by default** on entering a space: modules and whether the call starts. For Travel the conference is not open.
7. **Pre-trip and post-trip actions** are ordinary objects in those phases. A link to the To-do is out of scope; it would go through the object conduits later.

## The contract

### Template fields

- **`phases`** (new top-level field; live, like `words`): `[{ id, label, main? }]`, 0 to 12 entries. `id` matches `^[a-z][a-z0-9-]{0,31}$` and is unique; `label` is text of 1 to 40 characters; `main: true` marks the phase whose dates are the plan's own start and end (at most one). Stored ids never change; only labels follow the template. `problemsOf` refuses anything else with a sentence naming the entry.
- **`spaceDefaults.opensWith`** (applied once, like `profile`): an array of up to 20 module ids, which may include `conference` and `chat`, in order. `store.updateSettings` accepts `spaceDefaults: { profile?, opensWith? }`; `offerFor`, `applyOffer` and `appliedOnceFingerprint` include it.
- **`templates/travel.json`** gains:
  `"phases": [{"id":"planning","label":"Planning"},{"id":"booking","label":"Booking"},{"id":"buffer","label":"Buffer"},{"id":"pre-trip","label":"Pre-trip"},{"id":"trip","label":"Trip","main":true},{"id":"post-trip","label":"Post-trip"}]`
  and `"spaceDefaults": { "profile": "participants", "opensWith": ["travel", "chat"] }`. Thomas's "planning ends" is the end of `booking`; "trip start, active, ends" is the `trip` phase and its two dates. Its entry in `tools/template-versions.json` goes to version 2.
- **The host editor** (`public/host-templates.js`, `public/host.html`): a Phases list (id, label, a Main choice, add, remove, reorder) and an Opens with list (ticks for the template's modules, the conference and the chat, in order). The owner's offer (`public/template-offer.js`) shows `opensWith` inside the new-space defaults line.

### Module context and SDK

- `GET /api/modules/:id/context` adds `space: { id, name, createdAt } | null` (null outside a space) and `phases: [{ id, label, main }]` (the environment's template's phases, `[]` with none). Generic: any module may read them.
- SDK: `host.space()` answers the `space` object; `host.phases()` answers the list. No new routes.

### The Planner's stored shape (`travel` 0.8.0)

- `trip:main` keeps every field it has. `start` and `end` are the main phase's dates (or the plan's own dates with no phases). `title` empty means "show the space's name". New: `phases: { <phaseId>: { start?, end? } }` (dates as `YYYY-MM-DD`, `end` never before `start`) and `v: 2`.
- `plan:<id>` gains `phase` (a phase id, optional). An object with a date shows on its day; `phase` places an object with no date. An unknown or missing `phase` falls into the current phase in the list.
- **No `trip:main`** reads as `{ title: '', v: 2, phases: {} }`. Nothing is written until someone who can edit changes something.
- **A phase's effective start** is its own `start`; else the day after the previous phase's end; else, for the first phase, the space's `createdAt` day. **The current phase** is the last phase, in order, whose effective start is today or earlier; the first phase when none is.
- **Days** run from the earliest to the latest of the trip's `start` and `end` and every object's date. With neither, there are no days.
- **`coverTrip`** runs only when `start` is set, and only for objects whose `phase` is the main phase or unset. An object in another phase never moves the trip's dates.
- **Migration** (once per space, recorded as `_moved:phases`, the same pattern as `_moved:plan-keys`): for a `trip:main` without `v: 2`, write `v: 2` and, when the first phase is not the main one, `phases[<first>].start` = the space's `createdAt` day, with a version guard (409 means someone else did it; reload). Objects are not rewritten. Someone who cannot edit reads the same result by the defaults above.

### The Planner, in brief

- **Header**: the plan's name (the space's name until renamed) and the phase line: "<label> · 12 days to go" (days to the main phase's start, when set), "<label> · day 3 of 9" during the main phase, the label alone otherwise. No phases: no phase line.
- **The plan form** (`edit-trip`) becomes Name (placeholder: the space's name), then one row per phase with optional Start and End; the main phase's row writes `start` and `end`. The other fields stay.
- **The empty state** `#state-empty-trip` and its create button go. With no days and no objects: "Nothing on the plan yet. Add something below."
- **"Not on a day yet"**: a section above the days with every object that has no date and is not on the line, grouped under each phase's label in phase order (empty groups hidden), ungrouped with no phases.
- **The object editor** gains `f-phase` (a select of the phase labels), shown when the object has no date; a new object starts in the current phase.
- **Phase starts** show as a `div.phase-head[data-phase]` band before the first day of each dated phase. The four fixed markers keep their ids and settings (see Open questions).
- **What opens on entering** (`restore()`): the remembered layout, then the space's `opensWith` (plan-entering), then the environment's `spaceDefaults.opensWith`, then the product default. This is the same order as plan-entering's step 3, with one fallback added.

## Left to build, in order

1. **Template fields** (server-development), **built** (#105): `phases` and `spaceDefaults.opensWith` in `server/templates.js` (`FIELDS`, `problemsOf`, `cleanTemplate`, `useLive`, `applyTemplate`, `offerFor`, `applyOffer`, fingerprint) and `server/store.js`; `templates/travel.json`; `tools/template-versions.json`; `tools/check-templates.mjs`, `tools/check-template-switch.mjs`.
2. **Context and SDK** (server-development), **built** (#106): `space` and `phases` in the context route (`server/index.js`); `host.space()`, `host.phases()` in `public/sdk/host.js`.
3. **Editors** (experience-design), **built** (#107): the host editor and the owner's offer.
4. **The Planner's model and migration** (experience-design), **built** (#108): `travel-lib.js`, `travel-lib-plan.js`; `tools/check-travel.mjs` cases (server-development).
5. **The Planner's pages** (experience-design), **built** (#109; `travel` went to 0.10.0, not 0.8.0): `travel.js`, `travel.html`, `travel.css`, `travel-widget.js` (the phase line), `CONTRACT.md`; `travel` to 0.8.0 in `module.json` and `tools/module-versions.json`.
6. **What opens** (experience-design), **built** (#111): `GET /api/modules/for-space` answers `opensWith` (the space's own list) and `spaceDefaultsOpensWith`, and `restore()` in `public/canvas.js` opens the remembered layout, then the space's own list, then the environment's list, then the conference (or chat when the conference is off). A space's own `opensWith` is not stored yet, so the route answers `null` for it; storing it belongs to [plan-entering](plan-entering.md) (#3), and step 6 reads it once it is stored.

## Verify

- **Step 1**, by check: a template with bad phases is refused (a duplicate id, two mains, 13 entries, a 41-character label, an unknown key); `opensWith` with a non-string is refused; applying twice gives the same result; a switch offers `opensWith` and changes the fingerprint.
- **Step 2**, by check: the context answers `space` in a space and `null` in environment scope; `phases` is `[]` with no template and follows a live template edit.
- **Step 4**, by check in `check-travel`: the current phase for no dates, only the created date, only the trip's dates, a date between phases and after the trip; days with no dates (none), one dated object (one day), trip dates plus a pre-trip object; `coverTrip` grows for a main-phase object and not for a pre-trip one, and not with no `start`; migration on an old plan (dates kept, planning start = created day, run twice, a 409); no `trip:main` reads as a plan named after the space.
- **Steps 3, 5, 6**, live in the dev browser: rename the plan, set and clear phase dates, add with no date, see the phase line and the list. Entering a Travel space opens the Planner and chat and does not open the conference. The last point needs a real LiveKit call to confirm that no call is joined, which can't be checked locally.

## Acceptance

- A new space in a Travel environment has a plan named after it, with no create step, showing "Planning".
- An object added with no date lands under the current phase in "Not on a day yet".
- Setting only the trip's start shows days and "Planning · N days to go".
- A pre-trip object dated before the trip does not move the trip's start.
- An existing plan keeps its dates and objects, and its planning starts on the space's created date.
- A space with no template shows no phases and works as before, minus the create step.
- Entering a Travel space does not start the call.

## Decided (Thomas, 2026-09-26)

All three recommendations below are taken: the four markers as recommended, Travel opens with `["travel", "chat"]`, and no plan in the Lobby.

## Open questions (answered above)

1. **The four fixed markers.** Recommended: keep `trip-start` and `trip-end` as they are (booked objects), and move `planning-start` to the first phase's effective start and `planning-end` to the end of the phase just before the main one. Other phases get only the `phase-head` band. Blocks step 5.
2. **Travel's `opensWith`.** Recommended: `["travel", "chat"]`; Maps can open from the space bar. Blocks step 1 only for the file's contents.
3. **A plan on the Lobby.** The Planner isn't in the Lobby today (the Lobby rule in plan-modules), so no plan appears there. Recommended: keep it that way. It does not block the build.
