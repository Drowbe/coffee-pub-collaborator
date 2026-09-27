# Plan and Calendar Sync Plan

**Audience:** Thomas, who decides which objects keep a dated twin, and whoever builds it: server-development (the pairs, the mirror writes, the checks) and experience-design (the two manifests and anything a person sees).

**Status:** approved by Thomas, September 26, 2026, with every recommendation below accepted (the open questions and the suggested rules). Built. Step 1, pairs and declarations: pull request #102. Step 2, the manifests (Planner 0.9.0, Calendar 1.18.0; the plan's 0.10.0 assumed the linking step was 0.9.0, and it was 0.8.0): #103. Step 3, the backfill: #104. The full `npm run check` passed on the stacked head (`tools/check-links.mjs` covers the pairs and a single-install restart); nothing was verified live in a browser, and the hosted backfill (once per environment) was read as code only. This closes #96. From GitHub #96: "A dated object on a plan should also be on the calendar, linked, and kept in step. Change the date, time or title on either side and the other side changes too. An event that was created on the calendar ... stays on the calendar only." Builds on [plan-linked-objects](plan-linked-objects.md), which must land first. Overlaps #13 (Planner changes shown in the Calendar).

## What it is today

- The Planner (`travel`, kind `plan`, `plan:<id>`: `title`, `date`, `time`, `checkOut`, `ref`, ...) and the Calendar (`calendar`, kind `event`, `event:<id>`: `title`, `start`, `end`, `allDay`, `repeat`, ...) can point at each other, by hand only: a drop on a day runs `createEventOn` and `setLinks`; a plan entry of `kind: link` points at an event.
- Nothing creates the other side on its own, and editing one side does not rewrite the other.

## Decisions (Thomas, #96)

1. Every plan object with a date is on the calendar too, linked. An object with no date is not (per [plan-planner-phases](plan-planner-phases.md), phases do not matter).
2. Giving an object a date puts it on the calendar; clearing the date takes it off the calendar and leaves it on the plan.
3. Only those linked events are kept in step. A calendar-only event (when people are free, a holiday) is not put on the plan.
4. Date, time and title are written through from either side.
5. Deleting one side follows the linking plan: the link goes on both sides. Deleting a calendar-only event does not touch the plan.

## The mechanism: server-kept pairs, declared per kind

Neither module names the other. A kind says what it is willing to do; the server pairs any kind that sends dated twins with any kind that takes them, in the same space. This reuses the linked-objects store hook (`server/object-sync.js`, `afterWrite`, `tz`), so the pair stays right with no page open. The other option, the Planner asking for twins through actions, was set aside: an action waits for the providing page to be open, and it would need the Planner to find "the calendar".

### `module.json`, in `refs.produces[]` (checked in `server/modules.js`)

- `"dated"`: how the server reads and writes a kind's title and dates. Either the wall-clock form `{ "title", "day", "time"?, "endDay"? }` or the instant form `{ "title", "start", "end"?, "allDay" }`, each value naming a stored field.
- `"mirror": "out"`: each object of this kind that has a date, and holds no pointer (its `holds.field` is empty), keeps one twin in every kind in the same space that takes them.
- `"mirror": "in"`, with `"create": { <field>: <value> }`: the server may create objects of this kind as twins. In `create`, `"{id}"` is replaced by the new id and `"{by}"` by the writer's name. A kind that takes twins never sends them, so its own objects never reach the other side (decision 3).
- `travel`, kind `plan`: `"dated": { "title": "title", "day": "date", "time": "time", "endDay": "checkOut" }, "mirror": "out"`.
- `calendar`, kind `event`: `"dated": { "title": "title", "start": "start", "end": "end", "allDay": "allDay" }, "mirror": "in", "create": { "id": "{id}", "desc": "", "remind": null, "repeat": null, "by": "{by}" }`.

### Pairs (`server/module-links.js`)

- A pair is a link entry with `pair: "active" | "detached"`, `from` the sending object and `to` its twin. `set()` keeps pair entries untouched (a module's `setLinks` never removes them). `to()` and `from()` include them, so backlinks show the plan object on the event.
- A twin is made only when the receiving module is enabled in that space and the admin approved the sender to link to that kind (`consumerMayLink`). Scope and space are the sender's. A `person` object never pairs.

### What is written, in `afterWrite`

| Change | Result |
| --- | --- |
| Sender object gets a date, no pair | Create the twin with `create`, write the pair `active`. |
| Sender title, day, time or end day changes | Write the twin's mapped fields. |
| Sender date cleared | Delete the twin; remove the pair. |
| Sender deleted | Delete the twin; remove the pair. |
| Twin title, start, allDay or end changes | Write the sender's mapped fields. |
| Twin deleted | Pair becomes `detached`; the sender keeps its date. |
| Detached sender's day changes | A new twin, pair `active`. |
| An object with no pair on the receiving side | Nothing (calendar-only). |

- **Converting:** wall-clock to instant: no `time` gives `allDay: true`, `start` = `day`; a `time` gives `allDay: false`, `start` = the instant of `day` + `time` in the writer's `tz`. Instant to wall-clock: `allDay` gives `day` = `start`, `time` null; otherwise `day` and `time` of `start` in the writer's `tz`. `endDay` maps to `end` only for all-day twins; otherwise `end` is left alone. Notes, places and costs are not synced.
- **A repeating event** (`repeat` set on the twin) keeps its pair: the sender follows the series' first occurrence (`start`).
- **Loops and echoes:** twin and sender writes are server writes, which never call `afterWrite`; a write happens only when a mapped value differs; an undated sender makes no twin. Pages see an ordinary `change` and `refchange`; an editor open on the other side gets the normal 409. Last write wins.
- **Permissions:** the pair write is the server's, allowed by the admin's approval above, not by the writer's role in the other module. Everyone in the space who may see the sender may see the twin, as both live in that space. Mirror writes do not count toward the per-person write limit; a full module store (413) skips the twin and it is tried again on the sender's next change.
- **A calendar-only event placed on a plan by hand** (proposed; Thomas may change it) stays a linked-objects link: it follows the event's date and title one way and does not become a pair, since a link holds a pointer and never sends a twin.
- **Personal (Mine) objects:** a Mine event is a calendar-only event and never pairs. Placing one on a plan keeps today's rule: a space copy is made first.

### What a person sees

- Planner: nothing new. A dated object appears on the Calendar within a second; a Calendar edit to it shows on the plan.
- Calendar: a paired event shows its backlink to the plan object through the existing backlinks, and its delete confirmation says "Used by 1." (linked-objects step 4).

## Left to build, in order

1. **Pairs and declarations** (server-development): `dated`, `mirror`, `create` in `server/modules.js`; `pair` in `server/module-links.js`; the table above and converting in `server/object-sync.js`.
2. **Manifests** (experience-design): the two `module.json` entries; `CONTRACT.md` for `travel`; `documentation/api/api-module-sdk.md` is updated by content-manager. `travel` next minor (0.10.0 after linked-objects' 0.9.0), `calendar` 1.18.0 (or the next minor after linked-objects step 4), both also in `tools/module-versions.json`.
3. **Backfill** (server-development), once open question 1 is answered.

## Verify

Cases in `tools/check-links.mjs`, with a sending and a receiving test module declared inside the check.

- Dated sender makes one twin; undated makes none; a holding sender (a link) makes none; a `person` sender makes none; a receiver not enabled in the space gets none.
- Title, day and time each travel both ways; `endDay` travels for all-day only; clearing the day deletes the twin; deleting either side gives the table's result; a detached sender gets a new twin on a new day.
- A write that changes nothing makes no write on the other side; a receiver's own new object makes no sender object.
- Converting: 09:30 in `America/New_York` and in `Asia/Tokyo` give the right instants, and back; an all-day twin keeps `time` null.
- A second call of `setLinks` from the sender leaves its pair in place.
- Live in the dev browser, Planner and Calendar side by side in one space: add a dated object, move it, retitle it on each side, delete each side. No real LiveKit call is needed.

## Acceptance

- A dated object added to a plan is on the calendar, on that day and time, without anyone opening the Calendar.
- Moving the event on the calendar moves the object on the plan, and the other way round.
- A holiday added on the calendar never shows on the plan.
- Clearing an object's date takes it off the calendar and keeps it on the plan.
- Neither module's code names the other.

## Open questions

1. **Existing plans.** Recommended: backfill once, on the first server start after step 2, for every dated object with no pair (idempotent, as the pairs record it), using the server's `TZ` for timed objects. Blocks step 3 only.
2. **Whose time zone a time means.** Recommended for now: the writer's browser zone, which is how the Planner already reads event times; a plan time zone for trips abroad would be its own plan. Blocks step 1's converting.
