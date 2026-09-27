# Linked Objects Plan

**Audience:** Thomas, who decides how links between modules stay true, and whoever builds it: server-development (the link table, the store hooks, the checks) and experience-design (the Planner, the SDK).

**Status:** approved by Thomas, September 26, 2026, with every recommendation below accepted (the open questions and the suggested rules). Built. Before this plan (Planner 0.6.4, cc35dfb): a resolve answer carries `state` (`gone`, `hidden`), and the Planner draws a deleted or hidden linked object as such. Step 1, change events and `tz`: pull request #98. Step 2, held pointers: #99. Step 3, the Planner (0.8.0; the plan's 0.9.0 assumed #95 landed first, and it had not): #100. Step 4, "Used by N." (Calendar 1.17.18, Planner 0.8.1): #101. The full `npm run check` passed on the stacked head; the drag rule, the live refresh and the confirmation text were read as code only, and nothing was verified live in a browser. The two-way pairs of GitHub #96 build on this plan: [plan-plan-calendar-sync](plan-plan-calendar-sync.md).

## Why

Add a poll to a plan, delete the poll, and the plan still shows it. The same holds for anything one module points at in another. A pointer (`{ module, kind, id, scope, space? }`) is stored by the holder; `server/module-links.js` keeps what points at what (`set`, `to`, `from`); `resolveRef` and `POST /api/objects/resolve` (`server/index.js`) answer a summary or `{ state }`. Nothing tells a holder that its object changed or went, and nothing cleans up when no page is open.

## Rules (Thomas's)

- **Delete deletes everywhere.** Every link to a deleted object goes, or is left as a "No longer available" placeholder whose one action is Remove.
- **Update updates everywhere.** A holder shows what the object says now; a stored copy is only the fallback.
- **Dates move.** A link placed by its object's date moves when that date changes, unless a person pinned it to a day.
- **Access is per viewer**, at the time of reading: `hidden`, never `gone`, for an object the viewer may not see.

## The contract

### Store hook (server)

- The `PUT` and `DELETE /api/modules/:id/data/:key` routes read the old value before writing and, after a successful write, call `objectSync.afterWrite({ module, scopeKey, key, before, after, by, tz })` (new `server/object-sync.js`). Writes made by the server itself (hooks, migrations, this file) never call it, so nothing it writes is propagated again.
- `tz`: the host side of `storage.set` and `storage.remove` (`public/module-host.js`) sends the browser's IANA zone (`Intl.DateTimeFormat().resolvedOptions().timeZone`) as `tz` in the `PUT` body and as `?tz=` on `DELETE`. The server accepts it only if `Intl.DateTimeFormat(undefined, { timeZone })` accepts it, else uses `process.env.TZ` or `UTC`. It is used only to turn an instant into a day and a time.
- `afterWrite` maps `key` to a produced kind by its `refs.produces[].key` pattern; a key that matches no kind does nothing.

### Change events (server and SDK)

- For a written or deleted object that anything points at (`moduleLinks.to(ref)` is not empty), the server emits `refchange` `{ ref, change: 'updated' | 'deleted' }`. `updated` is sent only when its summary (`objectSummary`) differs before and after.
- It goes out on the host's module stream (the handler beside `onLinks`, `server/index.js`) as `event: refchange`, only to frames of the modules that hold a link to it, and only where `place()` allows the viewer.
- SDK: `host.objects.onChange(fn)`, `fn({ ref, change })`, returns an off function (`public/sdk/host.js`). The plan's older text said `host.refs.onChange`; the SDK's namespace is `host.objects`.

### Held pointers (`module.json`)

- A kind may declare what its objects hold, in `refs.produces[]`:
  `"holds": { "field": "ref", "onDelete": "remove" | "mark", "markField"?: "gone", "follow"?: { "title"?: "<field>", "day"?: "<field>", "pin"?: "<field>" } }`.
  `server/modules.js` refuses anything else (field names match `^[A-Za-z][A-Za-z0-9_]{0,31}$`, `markField` only with `mark`, at most one `holds` per kind).
- **On delete** of an object X, for each link `from -> X` whose `from` kind has `holds` and whose stored `value[field]` points at X: `remove` deletes the holding object and its links; `mark` writes `value[markField] = true` and keeps it. Both are server writes (`by` the deleter's key).
- **On update** of X: `follow.title` writes X's summary title into the holder. `follow.day` writes the day of X's summary `when` (in the writer's `tz`) into the holder when all three hold: the holder's `day` is set, its `pin` field is not true, and its `day` equals the day of X's old `when`. A holder with no day stays unplaced.
- A holder is written only when a followed value differs (no empty writes). The holder's version goes up as usual, so an editor open on it gets the normal 409.

### The Planner (`travel`)

- `module.json`, kind `plan`: `"holds": { "field": "ref", "onDelete": "remove", "follow": { "title": "title", "day": "date", "pin": "pinned" } }` (the `onDelete` value waits on open question 1).
- `plan:<id>` gains `pinned` (boolean, `cleanItem` in `travel-lib.js`). The link editor gains `f-pinned`, "Keep on this day". Dragging a link to a day other than its object's day sets `pinned: true`; dragging it back to that day clears it.
- `travel.js` calls `host.objects.onChange` and re-resolves the changed pointer (`resolveSummaries`) instead of waiting for a reload. The built gone and hidden placeholders stay as they are.

### Deleting something others link to (owner modules)

- When a kind has `backlinks: true`, the owner's delete confirmation reads `host.objects.linksTo(ref)` and, when there are any, says "Used by N." before the usual question (waits on open question 1).

### Not in this build

Access changes as an event (the old step 5): viewers still see a change of access on their next resolve.

## Left to build, in order

1. **Store hook and change events** (server-development): `server/object-sync.js`, the two data routes, `tz` in `public/module-host.js`, `refchange` on the stream, `host.objects.onChange`.
2. **Held pointers** (server-development): `holds` in `server/modules.js`, delete and follow in `object-sync.js`.
3. **The Planner** (experience-design): `holds` in `modules/travel/module.json`, `pinned`, `f-pinned`, the drag rule, `onChange`, `CONTRACT.md`. `travel` takes the next minor version (0.9.0 if #95's 0.8.0 is out first), in `module.json` and `tools/module-versions.json`.
4. **"Used by N."** (experience-design), once open question 1 is answered: the delete confirmation in each bundled module with `backlinks` (Calendar, Planner), each with a patch version bump.

## Verify

A new check, `tools/check-links.mjs`, added to `npm run check`, runs a throwaway server (`DATA_DIR` under `/tmp`) with two small test modules declared inside the check (a holder and an owner), so no bundled module is named.

- **Step 1:** a write to a linked object sends one `refchange` `updated` to the holder's stream, and none to a module that holds no link; a write that leaves the summary the same sends none; a delete sends `deleted`; an unknown `tz` falls back without error.
- **Step 2:** delete with `remove` removes the holder and its links; with `mark` sets `markField` and keeps it; a holder whose stored field points elsewhere is untouched; a rename rewrites the followed title; a date change moves a placed holder, and does not move a pinned one, an unplaced one or one on another day; a timed `when` near midnight lands on the writer's day for two different `tz`; a second identical write makes no holder write; manifests with a bad `holds` are refused.
- **Step 3:** `check-travel` cases for `pinned` in `cleanItem`; the drag rule and live refresh are checked live in the dev browser with the Planner and Calendar open side by side. No real LiveKit call is needed.

## Acceptance

- Delete a poll that is on a plan: with nobody on the plan, the entry is gone when the plan next opens; with the plan open, it goes within a second.
- Rename a linked event: the plan shows the new title live, and after a reload with the Calendar disabled.
- Move a linked event from the 3rd to the 5th: its plan entry moves to the 5th. A pinned entry stays.
- Nobody sees an editor for an object that is gone.

## Open questions

1. **Delete: remove or mark, and a warning.** Recommended: `remove` for the Planner's links (they only ever pointed), with "Used by N." in the owner module's delete confirmation so nobody is surprised. Blocks step 3's `onDelete` value and step 4.
